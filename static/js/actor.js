import {Animation} from './animation.js';
import {sprites, ais, stats} from './main.js';

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
        this.id = actorNum++;
        this.state = null;
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
                case 'Spawn': 
                    if (this.stats.type != 'spawner') break;
                    this.stage.make(
                        sprites['spider-minion'], 
                        this.pos.clone(), 
                        ais['spider-minion'], 
                        stats['spider-minion']);
                    break;
            }
            if (act.state) this.state = act.state;
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
                const fin = animts-ts > 300;
                switch (swordDir) {
                    case 0: swordProp.pos.x += 2; break;
                    case 1: swordProp.pos.x -= 2; break;
                    case 2: swordProp.pos.y -= 2; break;
                    case 3: swordProp.pos.y += 2; break;
                }
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
            id: this.id,
            pos: this.pos,
            last: {width: this.last.width, height: this.last.height},
            lastMove: this.lastMove,
            stats: this.stats,
            state: this.state
        };
    }

    tick(ts, actors) {
        if (!this.ai_) return;
        this.ts = ts;
        this.ai_.postMessage({
            me: this.stage.actors.indexOf(this), 
            selected: this.stage.actors.indexOf(this.stage.selected), 
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
