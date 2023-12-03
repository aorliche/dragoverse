import {$, $$, drawText, Point} from './util.js';

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

// Create a Web Worker from a function, which fully runs in the scope of a new
// Worker
// https://stackoverflow.com/questions/11354992/why-cant-web-worker-call-a-function-directly
function spawnWorker(func) {
    // Stringify the code. Example:  (function(){/*logic*/}).call(self);
    var code = '(function() {self.onmessage = e => {if (e.data.selected != -1 && e.data.me != e.data.selected) self.postMessage((' + func + ')(e.data));}}).call(self);';
    var worker = new Worker('/js/worker.js', {type: 'module'});
    // Initialise worker
    worker.postMessage(code);
    return worker;
}

class Prop {
    constructor(stage, img, pos) {
        this.stage = stage;
        this.img = img;
        this.pos = pos;
    }

    draw(ctx) {
        const d = this.pos.minus(this.stage.focus);
        const r = Math.sqrt(2)*Math.max(this.stage.canvas.width, this.stage.canvas.height)/2;
        if (d.norm() > r) return;
        const x = d.x+this.stage.canvas.width/2;
        const y = d.y+this.stage.canvas.height/2;
        const w = this.img.width;
        const h = this.img.height;
        ctx.drawImage(this.img, x-w/2, y-h/2);
    }
}

class Actor {
    constructor(stage, sprite, pos, stats) {
        this.stats = stats;
        this.stage = stage;
        this.sprite = sprite;
        this.pos = pos;
        this.moveAnim = null;
        this.ai_ = null;
        this.last = this.sprite.imgs[0];
        this.lastMove = ['LR', 1];
        this.lastAttackTs = 0;
        this.ts = 0;
    }

    set ai(ai) {
        this.ai_ = spawnWorker(ai);
        this.ai_.onmessage = e => {
            const act = e.data;
            if (!act || !act.type) return;
            switch (act.type) {
                case 'Attack': this.attack(this.ts); break;
                case 'LR': this.move('LR', act.val); break;
                case 'UD': this.move('UD', act.val); break;
            }
        };
    }

    attack(ts) {
        if (ts < this.lastAttackTs + this.stats.reload) return;
        this.lastAttackTs = ts;
        // Melee
        // Move dummy object and check collision
        let swordDir = 0;
        if (this.stats.range == 0) {
            const testObj = {pos: this.pos.clone(), last: this.last};
            if (this.lastMove[0] == 'LR') {
                testObj.pos.x += 10*this.lastMove[1];
                swordDir = this.lastMove[1] < 1 ? 1 : 0;
            } else {
                testObj.pos.y += 10*this.lastMove[1];
                swordDir = this.lastMove[1] < 1 ? 2 : 3;
            }
            const act = this.stage.collide(testObj, obj => obj != this && obj.stats && obj.stats.hpmax);
            if (!act) return;
            // Display animation
            const swordProp = new Prop(this.stage, this.stage.sprites['sword'].imgs[swordDir], testObj.pos);
            this.stage.props.push(swordProp);
            const anim = new Animation(this.stage, (animts) => {
                const fin = animts-ts > 500;
                if (fin) {
                    this.stage.props.splice(this.stage.props.indexOf(swordProp), 1);
                }
                return fin;
            });
            this.stage.animations.push(anim);
            // Adjust hp
            act.stats.hp -= this.stats.strength;
            if (act.stats.hp < 0) {
                this.stage.kill(act);
            }
        }
    }

    contains(x, y) {
        return x >= this.pos.x - this.last.width/2 && x <= this.pos.x + this.last.width/2 &&
            y >= this.pos.y - this.last.height/2 && y <= this.pos.y + this.last.height/2;
    }

    click(x, y) {
        if (!this.contains(x, y)) return false;
        if (this.stage.team.includes(this)) {
            this.stage.refocus(this.pos);
            this.stage.selected = this;
        }
        return true;
    }

    draw(ctx) {
        const d = this.pos.minus(this.stage.focus);
        const r = Math.sqrt(2)*Math.max(this.stage.canvas.width, this.stage.canvas.height)/2;
        if (d.norm() > r) return;
        const x = d.x+this.stage.canvas.width/2;
        const y = d.y+this.stage.canvas.height/2;
        const w = this.last.width;
        const h = this.last.height;
        ctx.drawImage(this.last, x-w/2, y-h/2, w, h);
        // Draw damage bar
        if (this.stats.hpmax) {
            const barH = 5;
            const barW = w;
            ctx.fillStyle = '#0f0';
            ctx.fillRect(x-w/2, y-h/2-barH, barW, barH);
            const dmgW = w * (1 - this.stats.hp / this.stats.hpmax);
            ctx.fillStyle = '#f00';
            ctx.fillRect(x-w/2+(w-dmgW), y-h/2-barH, dmgW, barH);
        }
    }
    
    move(how, val) {
        const sav = this.pos.clone();
        if (how == 'LR') {
            this.pos.x += this.stats.speed*val;
            this.lastMove = ['LR', val > 0 ? 1 : -1];
            // Reverse or not
            if (val < 0 && this.sprite.imgs[1]) {
                this.last = this.sprite.imgs[1];
            } else if (val >= 0 && this.sprite.imgs[0]) {
                this.last = this.sprite.imgs[0];
            }
        } else if (how == 'UD') {
            this.pos.y += this.stats.speed*val;
            this.lastMove = ['UD', val > 0 ? 1 : -1];
            if (val <= 0 && this.sprite.imgs[2]) {
                this.last = this.sprite.imgs[2];
            } else if (val > 0 && this.sprite.imgs[3]) {
                this.last = this.sprite.imgs[3];
            }
        }
        const obj = this.stage.collide(this, obj => obj.stats && obj.stats.solid);
        if (obj) {
            this.pos = sav;
        }
        if (this.stage.selected == this) {
            if (this.moveAnim) this.moveAnim.cancel();
            this.stage.focus = this.pos.clone();
        }
    }

    moveTo(pos) {
        if (this.moveAnim) this.moveAnim.cancel();
        this.moveAnim = new Animation(this.stage, () => {
            const sav = this.pos.clone();
            const d = pos.minus(this.pos);
            const fin = d.norm() < this.stats.speed;
            if (fin) {
                this.pos = pos;
                this.moveAnim = null;
            } else {
                this.pos = this.pos.plus(d.unit().times(this.stats.speed));
            }
            const obj = this.stage.collide(this, obj => obj.stats && obj.stats.solid);
            if (obj) {
                this.pos = sav;
                this.moveAnim = null;
                return true;
            }
            if (Math.abs(d.x) > Math.abs(d.y)) {
                if (d.x < 0 && this.sprite.imgs[1]) {
                    this.last = this.sprite.imgs[1];
                } else if (d.x >= 0 && this.sprite.imgs[0]) {
                    this.last = this.sprite.imgs[0];
                } else if (d.y <= 0 && this.sprite.imgs[2]) {
                    this.last = this.sprite.imgs[2];
                } else if (d.y > 0 && this.sprite.imgs[3]) {
                    this.last = this.sprite.imgs[3];
                }
            } else {
                if (d.y <= 0 && this.sprite.imgs[2]) {
                    this.last = this.sprite.imgs[2];
                } else if (d.y > 0 && this.sprite.imgs[3]) {
                    this.last = this.sprite.imgs[3];
                } else if (d.x < 0 && this.sprite.imgs[1]) {
                    this.last = this.sprite.imgs[1];
                } else if (d.x >= 0 && this.sprite.imgs[0]) {
                    this.last = this.sprite.imgs[0];
                }
            }
            if (this == this.stage.selected) {
                this.stage.focus = this.pos.clone();
            }
            return fin;
        });
        this.stage.animations.push(this.moveAnim);
    }

    sanitize() {
        return {
            pos: this.pos,
            last: {width: this.last.width, height: this.last.height},
            lastMove: this.lastMove,
            stats: this.stats
        };
    }

    tick(ts, actors) {
        if (!this.ai_) return;
        this.ts = ts;
        this.ai_.postMessage({
            me: this.stage.actors.indexOf(this), 
            selected: this.stage.actors.indexOf(this.stage.selected), 
            actors
        });
    }
}

class Animation {
    constructor(stage, cb) {
        this.stage = stage;
        this.cb = cb;
    }

    cancel() {
        this.stage.animations.splice(this.stage.animations.indexOf(this), 1);
    }

    tick(ts) {
        const done = this.cb(ts);
        if (done) {
            this.cancel();
        }
    }
}

class Stage {
    constructor(canvas) {
        this.canvas = canvas;
        this.actors = [];
        this.props = [];
        this.focus = new Point(0, 0);
        this.selected = null;
        this.team = [];
        this.animations = [];
        this.focusAnim = null;
        // For animations
        this.sprites = null;
    }

    click(x, y) {
        [x, y] = [
            x-this.canvas.width/2+this.focus.x, 
            y-this.canvas.height/2+this.focus.y];
        let found = false;
        for (let i=0; i<this.actors.length; i++) {
            found = this.actors[i].click(x, y);
            if (found) {
                break;
            }
        }   
        if (!found) {
            if (this.selected) {
                this.selected.moveTo(new Point(x, y));
            }
        }
    }

    collide(obj, fn) {
        for (let i=0; i<this.actors.length; i++) {
            const a = this.actors[i];
            if (a == obj || !fn(a)) continue;
            const xover = Math.abs(obj.pos.x - a.pos.x) < obj.last.width/2 + a.last.width/2;
            const yover = Math.abs(obj.pos.y - a.pos.y) < obj.last.height/2 + a.last.height/2;
            if (xover && yover) {
                return a;
            }
        }
        return null;
    }

    draw() {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let i=0; i<this.actors.length; i++) {
            this.actors[i].draw(ctx);
        }
        for (let i=0; i<this.props.length; i++) {
            this.props[i].draw(ctx);
        }
    }

    kill(actor) {
        this.actors.splice(this.actors.indexOf(actor), 1);
    }

    make(sprite, pos, ai, stats) {
        const actor = new Actor(this, sprite, pos, stats);
        this.actors.push(actor);
        if (ai) {
            actor.ai = ai;
        }
        if (stats.team) {
            this.team.push(actor);
        }
    }

    refocus(pos) {
        if (this.focusAnim) this.focusAnim.cancel();
        pos = pos.clone();
        this.focusAnim = new Animation(this, () => {
            const d = pos.minus(this.focus);
            if (d.norm() < 10) {
                this.focus = pos;
                this.focusAnim = null;
                return true;
            } else {
                this.focus = this.focus.plus(d.unit().times(20));
                return false;
            }
        });
        this.animations.push(this.focusAnim);
    }

    tick(ts) {
        const actors = this.actors.map(a => a.sanitize());
        this.animations.forEach(a => a.tick(ts));
        this.actors.forEach(a => a.tick(ts, actors));
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

window.addEventListener('load', () => {
    const canvas = $('#canvas');
    const stage = new Stage(canvas);
    const pad = new Gamepad(stage);
    let prev = null;
    let nloaded = 0;

    // Right, left, down, up
    const sprites = {
        'pig': new Sprite('pig', ['image/Pig128_48.png', 'image/Pig128_48rev.png', null, null], onLoad),
        'spider-minion': new Sprite('spider-minion', ['image/SpiderMinion128_42right.png', 'image/SpiderMinion128_42left.png', 'image/SpiderMinion128_42rev.png', 'image/SpiderMinion128_42.png'], onLoad),
        'rock': new Sprite('rock', ['image/Rock128_64.png', null, null, null], onLoad),
        'sword': new Sprite('sword', ['image/Sword32_20right.png', 'image/Sword32_20left.png', 'image/Sword32_20up.png', 'image/Sword32_20down.png'], onLoad),
    };

    const stats = {
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
    };

    const ais = {
        'pig': (e) => {
            const me = e.actors[e.me];
            const selected = e.actors[e.selected];
            const dx = selected.pos.x - me.pos.x;
            const dy = selected.pos.y - me.pos.y;
            const d = Math.sqrt(dx*dx+dy*dy);
            const acts = [];
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
            if (d > 50) {
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                    return dx < 0 ? {type: 'LR', val: -1} : {type: 'LR', val: 1};
                } else if (Math.abs(dy) > 10) {
                    return dy < 0 ? {type: 'UD', val: -1} : {type: 'UD', val: 1};
                }
            } 
            return null;
        }
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
