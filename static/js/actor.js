import {Animation} from './animation.js';
import {sprites, ais, stats} from './params.js';
import {getDirection, sep, Point} from './util.js';

export {Actor};

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

let actorNum = 0;

class Actor {
    constructor(stage, sprite, pos, stats) {
        this.stats = {...stats};
        this.stage = stage;
        this.sprite = sprite;
        this.pos = pos;
        this.moveAnim = null;
        this.ai_ = null;
        this.last = this.sprite.last;
        this.lastAttackTs = 0;
        this.ts = 0;
        this.id = actorNum++;
        this.state = null;
    }

    set ai(ai) {
        this.ai_ = spawnWorker(ai);
        this.ai_.onmessage = e => {
            const act = e.data;
            if (act && act.debug) console.log(act.debug);
            if (!act || !act.type) return;
            switch (act.type) {
                case 'Attack': this.attack(act.who); break;
                case 'Move': this.move(act.where); break;
                // Spawn, etc.
                default: 
                    if (this.stats.actions[act.type]) {
                        this.stats.actions[act.type](this); 
                    } else {
                        console.log('Unknown action: ' + act.type);
                    }
                    break;
            }
            if (act.state) {
                this.state = act.state;
            }
        };
    }

    attack(who) {
        if (!this.stats || !this.stats.reload) {
            console.log('No attack');
            return;
        }
        who = this.stage.getActorById(who);
        if (!who) {
            console.log('No target');
            return;
        }
        if (this.ts < this.lastAttackTs + this.stats.reload) return;
        // Validate in range
        const d = sep(this, who);
        if (d > this.stats.range) {
            console.log('Too far');
            return
        }
        // Adjust reload
        this.lastAttackTs = this.ts;
        // Adjust hp
        who.stats.hp -= this.stats.strength;
        if (who.stats.hp < 0) {
            this.stage.kill(who);
        }
        // Display animation
        if (!this.stats || !this.stats.projectile) {
            console.log('No projectile');
            return;
        }
        const dx = who.pos.x - this.pos.x;
        const dy = who.pos.y - this.pos.y;
        const dir = getDirection(dx, dy);
        const sprite = this.stage.sprites[this.stats.projectile];
        const img = sprite.imgs[dir] ? sprite.imgs[dir] : sprite.last;
        const prop = new Prop(this.stage, img, this.pos);
        const ts = this.ts;
        const anim = new Animation(this.stage, (animts) => {
            const fin = animts-ts > 300;
            switch (dir) {
                case 'right': prop.pos.x += 2; break;
                case 'left': prop.pos.x -= 2; break;
                case 'up': prop.pos.y -= 2; break;
                case 'down': prop.pos.y += 2; break;
            }
            return fin;
        }, () => {
            this.stage.props.splice(this.stage.props.indexOf(prop), 1);
        });
        this.stage.props.push(prop);
        this.stage.animations.push(anim);
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

    move(pos) {
        // Convert pos to Point
        pos = new Point(pos.x, pos.y);
        if (!this.stats.speed) {
            console.log('No speed');
            return;
        }
        const sav = this.pos.clone();
        const dx = pos.x - this.pos.x;
        const dy = pos.y - this.pos.y;
        // Update sprite
        const dir = getDirection(dx, dy);
        if (this.sprite.imgs[dir]) {
            this.last = this.sprite.imgs[dir];
        }
        // Move
        const d = pos.distTo(this.pos);
        if (d < this.stats.speed) {
            this.pos = pos.clone();
        } else {
            const md = pos.minus(this.pos).unit().times(this.stats.speed);
            this.pos = this.pos.plus(md);
        }
        // Check collisions
        const obj = this.stage.collide(this, () => true);
        // Push slightly away from colliding object
        if (obj) {
            this.pos = sav;
            this.pos = this.pos.minus(obj.pos).unit().times(2).plus(this.pos);
        }
    }

    // Main guy and other set and forget
    moveTo(pos) {
        if (this.moveAnim) {
            this.moveAnim.cancel();
        }
        this.moveAnim = new Animation(this.stage, () => {
            this.move(pos);
            if (this == this.stage.selected) {
                this.stage.focus = this.pos.clone();
            }
            const fin = this.pos.equals(pos);
            if (fin) {
                this.moveAnim = null;
            }
            return fin;
        });
        this.stage.animations.push(this.moveAnim);
    }

    sanitize() {
        const stats = {};
        for (const prop in this.stats) {
            if (prop != 'actions') {
                stats[prop] = this.stats[prop];
            }
        }
        return {
            id: this.id,
            pos: this.pos,
            last: {width: this.last.width, height: this.last.height},
            lastMove: this.lastMove,
            stats: stats,
            state: this.state
        };
    }

    tick(ts, actors) {
        if (!this.ai_) return;
        this.ts = ts;
        // Only allow interaction with actors within 1000px radius of selected actor
        actors = actors.filter(a => a.pos.distTo(this.pos) < 1000);
        const ids = actors.map(a => a.id);
        this.ai_.postMessage({
            me: ids.indexOf(this.id), 
            selected: this.stage.selected
                ? ids.indexOf(this.stage.selected.id)
                : -1,
            actors,
            state: this.state,
            ts: ts
        });
    }
}

class Prop {
    constructor(stage, img, pos) {
        this.stage = stage;
        this.img = img;
        this.pos = pos.clone();
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
