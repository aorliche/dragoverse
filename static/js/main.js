import {$, $$, drawText, Point} from './util.js';
import {Stage} from './stage.js';

export {sprites, stats, ais};

class Sprite {
    constructor(name, urls, onload) {
        this.name = name;
        this.last = null;
        this.imgs = urls.map(url => {
            if (!url) {
                return null;
            }
            const img = new Image();
            img.src = url;
            img.onload = onload;
            if (!this.last) {
                this.last = img;
            }
            return img;
        });
    }

    get nimgs() {
        let num = 0;
        for (let i=0; i<this.imgs.length; i++) {
            if (this.imgs[i]) num++;
        }
        return num;
    }
}

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
        'pig': new Sprite('pig', ['image/Pig128_48.png', 'image/Pig128_48rev.png', null, null], onLoad),
        'spider-minion': new Sprite('spider-minion', ['image/SpiderMinion128_42right.png', 'image/SpiderMinion128_42left.png', 'image/SpiderMinion128_42rev.png', 'image/SpiderMinion128_42.png'], onLoad),
        'rock': new Sprite('rock', ['image/Rock128_64.png', null, null, null], onLoad),
        'sword': new Sprite('sword', ['image/Sword32_20right.png', 'image/Sword32_20left.png', 'image/Sword32_20up.png', 'image/Sword32_20down.png'], onLoad),
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
            range: 0,
        },
        'spider-minion': {
            type: 'spider-minion',
            speed: 2,
            solid: true,
            hpmax: 10,
            hp: 10,
            strength: 1,
            reload: 1200,
            range: 0,
        },
        'rock': {
            type: 'environment',
            solid: true,
        },
        'spawner': {
            type: 'spawner',
            what: 'spider-minion',
            reload: 5000,
        }
    };

    ais = {
        'pig': (e) => {
            const me = e.actors[e.me];
            const selected = e.actors[e.selected];
            const dx = selected.pos.x - me.pos.x;
            const dy = selected.pos.y - me.pos.y;
            const d = Math.sqrt(dx*dx+dy*dy);
            const acts = [];
            for (let i=0; i<e.actors.length; i++) {
                const tgt = tryHitAll(me, e.actors, obj => obj.stats && obj.stats.type == 'spider-minion');
                if (tgt) {
                    return {type: 'Attack'};
                }
            }
            if (d > 200) {
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                    return dx < 0 ? {type: 'LR', val: -1} : {type: 'LR', val: 1};
                } else if (Math.abs(dy) > 10) {
                    return dy < 0 ? {type: 'UD', val: -1} : {type: 'UD', val: 1};
                }
            }
            return null;
        },
        'spider-minion': (e) => {
            const me = e.actors[e.me];
            e.actors.splice(e.me, 1);
            const tgt = tryHitAll(me, e.actors, obj => obj.stats && obj.stats.type == 'pig');
            if (tgt) {
                return {type: 'Attack'};
            }
            e.actors.sort((a, b) => {
                if (a.stats.type == 'pig' && b.stats.type != 'pig') return -1;
                if (b.stats.type == 'pig' && a.stats.type != 'pig') return 1;
                const dxa = a.pos.x - me.pos.x;
                const dya = a.pos.y - me.pos.y;
                const da = Math.sqrt(dxa*dxa+dya*dya);
                const dxb = b.pos.x - me.pos.x;
                const dyb = b.pos.y - me.pos.y;
                const db = Math.sqrt(dxb*dxb+dyb*dyb);
                return da-db;
            });
            const dx = e.actors[0].pos.x - me.pos.x;
            const dy = e.actors[0].pos.y - me.pos.y;
            const d = Math.sqrt(dx*dx+dy*dy);
            if (d > 30) {
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                    return dx < 0 ? {type: 'LR', val: -1} : {type: 'LR', val: 1};
                } else if (Math.abs(dy) > 10) {
                    return dy < 0 ? {type: 'UD', val: -1} : {type: 'UD', val: 1};
                }
            } 
            return null;
        },
        'spawner': (e) => {
            let nearby = false;
            const me = e.actors[e.me];
            e.actors.forEach(obj => {
                if (obj.stats.type == 'spider-minion' || obj.stats.type == 'pig') {
                    const dx = e.actors[0].pos.x - me.pos.x;
                    const dy = e.actors[0].pos.y - me.pos.y;
                    const d = Math.sqrt(dx*dx+dy*dy);
                    if (d < 50) {
                        nearby = true;
                    }
                }
            });
            if (e.state == null) {
                e.state = {prev: -1e6};
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
