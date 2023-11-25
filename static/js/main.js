import {$, $$, drawText, Point} from './util.js';

class Sprite {
    constructor(name, url, urlRev, onload) {
        this.img = new Image();
        this.img.src = url;
        this.img.onload = onload;

        if (urlRev) {
            this.imgRev = new Image();
            this.imgRev.src = urlRev;
            this.imgRev.onload = onload;
        }
    }

    draw(ctx, x, y, rev) {
        const w = this.img.width;
        const h = this.img.height;
        if (rev && this.imgRev) {
            ctx.drawImage(this.imgRev, x-w/2, y-h/2);
        } else {
            ctx.drawImage(this.img, x-w/2, y-h/2);
        }
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

class Actor {
    constructor(stage, sprite, pos) {
        this.stage = stage;
        this.sprite = sprite;
        this.pos = pos;
        this.moveAnim = null;
        this.ai_ = null;
    }

    set ai(ai) {
        this.ai_ = spawnWorker(ai);
        this.ai_.onmessage = e => {
            e.data.forEach(act => {
                switch (act.type) {
                    case 'LR': this.move('LR', act.val); break;
                    case 'UD': this.move('UD', act.val); break;
                }
            });
        };
    }

    contains(x, y) {
        return x >= this.pos.x - this.sprite.img.width/2 && x <= this.pos.x + this.sprite.img.width/2 &&
            y >= this.pos.y - this.sprite.img.height/2 && y <= this.pos.y + this.sprite.img.height/2;
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
        this.sprite.draw(ctx, d.x+this.stage.canvas.width/2, d.y+this.stage.canvas.height/2, this.rev);
    }
    
    move(how, val) {
        const sav = this.pos.clone();
        if (how == 'LR') {
            this.pos.x += this.stats.speed*val;
            // Reverse or not
            this.rev = val < 0;
        } else if (how == 'UD') {
            this.pos.y += this.stats.speed*val;
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
            // Reverse or not
            this.rev = d.x < 0;
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
            stats: this.stats
        };
    }

    tick(actors) {
        if (!this.ai_) return;
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

    tick() {
        const done = this.cb();
        if (done) {
            this.cancel();
        }
    }
}

class Stage {
    constructor(canvas) {
        this.canvas = canvas;
        this.actors = [];
        this.focus = new Point(0, 0);
        this.selected = null;
        this.team = [];
        this.animations = [];
        this.focusAnim = null;
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
            const xover1 = obj.pos.x - obj.sprite.img.width/2 >= a.pos.x - a.sprite.img.width/2 && obj.pos.x - obj.sprite.img.width/2 <= a.pos.x + a.sprite.img.width/2;
            const xover2 = obj.pos.x + obj.sprite.img.width/2 >= a.pos.x - a.sprite.img.width/2 && obj.pos.x + obj.sprite.img.width/2 <= a.pos.x + a.sprite.img.width/2;
            const yover1 = obj.pos.y - obj.sprite.img.height/2 >= a.pos.y - a.sprite.img.height/2 && obj.pos.y - obj.sprite.img.height/2 <= a.pos.y + a.sprite.img.height/2;
            const yover2 = obj.pos.y + obj.sprite.img.height/2 >= a.pos.y - a.sprite.img.height/2 && obj.pos.y + obj.sprite.img.height/2 <= a.pos.y + a.sprite.img.height/2;
            if ((xover1 || xover2) && (yover1 || yover2)) {
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
    }

    make(sprite, pos, ai, stats) {
        const actor = new Actor(this, sprite, pos);
        actor.stats = stats;
        this.actors.push(actor);
        if (ai) {
            actor.ai = ai;
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

    tick() {
        const actors = this.actors.map(a => a.sanitize());
        this.animations.forEach(a => a.tick());
        this.actors.forEach(a => a.tick(actors));
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
        });
    }

    tick() {
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
    }
}

window.addEventListener('load', () => {
    const canvas = $('#canvas');
    const stage = new Stage(canvas);
    const pad = new Gamepad(stage);
    let prev = null;
    let nloaded = 0;

    const sprites = {
        'pig': new Sprite('pig', 'image/Pig128_48.png', 'image/Pig128_48rev.png', onLoad),
    };

    const stats = {
        'pig': {
            speed: 4,
            solid: true,
        }
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
                if (Math.abs(dx) > 10) 
                    dx < 0 ? acts.push({type: 'LR', val: -1}) : acts.push({type: 'LR', val: 1});
                if (Math.abs(dy) > 10)
                    dy < 0 ? acts.push({type: 'UD', val: -1}) : acts.push({type: 'UD', val: 1});
            }
            return acts;
        },
    };

    function onLoad() {
        nloaded++;
        if (nloaded == Object.keys(sprites).length*2) {
            init();
        }
    }

    function init() {
        stage.make(sprites.pig, new Point(20, 200), ais.pig, stats.pig);
        stage.make(sprites.pig, new Point(300, 200), ais.pig, stats.pig);
        stage.draw();    
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
        pad.tick();
        stage.tick();
        stage.draw();
        window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
});
