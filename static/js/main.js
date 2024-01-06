import {$, $$, drawText, Point} from './util.js';
import {Stage} from './stage.js';
import {Sprite} from './sprite.js';

export {sprites, stats, ais};

class Gamepad {
    constructor(stage) {
        this.stage = stage;
        this.axes = [];
        this.buttons = [];
        fetch('buttons.json').
        then(res => res.json()).
        then(json => {
            for (const name in json.Axes) {
                this.axes[json.Axes[name]] = name;
            }
            this.buttons = json.Buttons;
        });
    }

    tick(ts) {
        let pad = null;
        // Chrome generates new Gamepad objects every action
        for (const p of navigator.getGamepads()) {
            if (p) {
                pad = p;
                break;
            }
        }
        if (!pad) return;
        if (!this.stage.selected) return;
        for (let i=0; i<pad.axes.length; i++) {
            const value = Math.round(pad.axes[i]);
            if (!this.axes[i] || !Math.abs(value)) {
                continue;
            }
            this.stage.selected.move(this.axes[i], value);
        }
        // Can attack and move at the same time
        // Attack can fail if on reload
        const attack = pad.buttons[this.buttons.X].pressed;
        if (attack) {
            this.stage.selected.attack(ts);
        }
    }
}

let sprites, stats, ais;

window.addEventListener('load', () => {
    const canvas = $('#canvas');
    const stage = new Stage(canvas);
    const pad = new Gamepad(stage);
    let prev = null;
    let nloaded = 0;

    // Right, left, down, up
    sprites = {
        'pig': new Sprite('pig', {
            right: 'image/Pig128_48.png', 
            left: 'image/Pig128_48rev.png', 
            up: null, 
            down: null
        }, onLoad),
        'spider-minion': new Sprite('spider-minion', {
            right: 'image/SpiderMinion128_42right.png', 
            left: 'image/SpiderMinion128_42left.png', 
            up: 'image/SpiderMinion128_42rev.png', 
            down: 'image/SpiderMinion128_42.png'
        }, onLoad),
        'rock': new Sprite('rock', {
            img: 'image/Rock128_64.png'
        }, onLoad),
        'sword': new Sprite('sword', {
            right: 'image/Sword32_20right.png', 
            left: 'image/Sword32_20left.png', 
            up: 'image/Sword32_20up.png', 
            down: 'image/Sword32_20down.png'
        }, onLoad),
    };

    stats = {
        'pig': {
            type: 'pig',
            speed: 4,
            solid: true,
            hpmax: 20,
            hp: 15,
            strength: 3,
            reload: 600,
            range: 10,
            projectile: 'sword',
        },
        'spider-minion': {
            type: 'spider-minion',
            speed: 2,
            solid: true,
            hpmax: 10,
            hp: 10,
            strength: 1,
            reload: 1200,
            range: 10,
            projectile: 'sword',
        },
        'rock': {
            type: 'environment',
            solid: true,
        },
        'spawner': {
            type: 'spawner',
            reload: 5000,
            actions: {
                Spawn: function(me) {
                    me.stage.make(
                        sprites['spider-minion'], 
                        me.pos.clone(), 
                        ais['spider-minion'], 
                        stats['spider-minion']
                    );
                }
            }
        }
    };

    ais = {
        'pig': (e) => {
            const me = e.actors[e.me];
            const selected = e.actors[e.selected];
            const acts = [];
            for (let i=0; i<e.actors.length; i++) {
                const tgt = tryHitAll(me, e.actors, obj => obj.stats && obj.stats.type == 'spider-minion');
                if (tgt) {
                    return {type: 'Attack', who: tgt.id};
                }
            }
            if (selected) {
                const d = dist(selected.pos, me.pos);
                if (d > 200) {
                    return {type: 'Move', where: selected.pos};
                }
            }
            return null;
        },
        'spider-minion': (e) => {
            const me = e.actors[e.me];
            e.actors.splice(e.me, 1);
            const tgt = tryHitAll(me, e.actors, obj => obj.stats && obj.stats.type == 'pig');
            if (tgt) {
                return {type: 'Attack', who: tgt.id};
            }
            const acts = e.actors.filter(obj => obj.stats && obj.stats.type == 'pig');
            if (acts.length == 0) {
                return null;
            }
            acts.sort((a, b) => {
                const da = dist(a.pos, me.pos);
                const db = dist(b.pos, me.pos);
                return da-db;
            });
            const closest = acts[0];
            return {type: 'Move', where: closest.pos};
        },
        'spawner': (e) => {
            let nearby = false;
            const me = e.actors[e.me];
            e.actors.forEach(obj => {
                if (obj.stats.type == 'spider-minion' || obj.stats.type == 'pig') {
                    const d = dist(obj.pos, me.pos);
                    if (d < 300) {
                        nearby = true;
                    }
                }
            });
            if (e.state == null) {
                e.state = {prev: 0};
            }
            if (nearby) {
                return {state: e.state};
            }
            if (e.ts > e.state.prev + me.stats.reload) {
                e.state.prev = e.ts;
                return {type: 'Spawn', state: e.state};
            }
            return {state: e.state};
        },
    };

    let nimgs = 0;
    for (const name in sprites) {
        nimgs += sprites[name].nimgs;
    }

    function onLoad() {
        nloaded++;
        if (nloaded == Object.keys(sprites).length*2) {
            init();
        }
    }

    function init() {
        stage.make(sprites.rock, new Point(0, 0), null, stats.rock);
        stage.make(sprites.rock, new Point(64, 0), null, stats.rock);
        stage.make(sprites.rock, new Point(128, 0), null, stats.rock);
        stage.make(sprites.pig, new Point(20, 200), ais.pig, {...stats.pig, team: true});
        stage.make(sprites.pig, new Point(300, 200), ais.pig, {...stats.pig, team: true});
        stage.make(sprites['spider-minion'], new Point(100, 200), 
            ais['spider-minion'], stats['spider-minion']);
        stage.make(sprites.rock, new Point(-200, -200), ais.spawner, stats.spawner);
        stage.draw();    
        // For animation
        stage.sprites = sprites;
    }

    canvas.addEventListener('click', (e) => {
        stage.click(e.offsetX, e.offsetY);
    })
    
    function step(ts) {
        if (prev == null) {
            prev = ts;
        } else {
            const dt = Math.round(1000/30);
            const next = prev + dt;
            if (ts < next) {
                window.requestAnimationFrame(step);
                return;
            }
            // Hack for window losing focus
            if (ts > prev + 5*dt) {
                prev = ts;
            } else {
                prev = next;
            }
        }
        pad.tick(ts);
        stage.tick(ts);
        stage.draw();
        window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
});
