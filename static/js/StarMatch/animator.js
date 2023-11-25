
import * as f from './functions.js';
import {Background} from './bg.js';

class AstronTaunt {
    constructor(grid, image, duration) {
        this.grid = grid;
        this.image = image;
        this.duration = duration;
        this.time = 0;
        this.phase = 0; // grow, shrink, done
    }

    get done() {
        return this.phase > 1;
    }

    draw(ctx) {
        if (this.done) return;
        const mult = this.phase == 0 ? this.time/this.duration : (this.duration-this.time)/this.duration;
        const dim = f.dimension(mult*this.image.width, mult*this.image.height);
        const [w,h] = f.scaleImage(this.image.width, this.image.height, dim.w, dim.h);
        const pos = f.point(this.grid.params.dim.w/2-w/2, 80-h/2);
        ctx.drawImage(this.image, pos.x, pos.y, w, h);
    }

    tick() {
        this.time++;
        if (this.time > this.duration) {
            this.phase++;
            this.time = 0;
        }
    }
}

export class Animator {
    constructor(grid, ctx, dim) {
        this.grid = grid;
        this.grid.anim = this;
        this.ctx = ctx;
        this.ctx.font = '10px Sans-serif';
        this.dim = {...dim};
        this.bg = new Background({dim: this.dim});
        this.running = false;
        this.polys = [];
        this.clearing = [];
        this.messages = [];
        this.FALLSPEED = 5;
        this.CLEARSPEED = 8;
        this.INTROCLEARSPEED = 1;
        this.CLEARREMOVE = 200;
        this.MSGSTART = dim.h/7;
        this.MSGSPACE = 15;
        this.startts = null;
        this.astron = null;
    }

    animate(ts) {
        if (this.startts == null) {
            this.startts = ts;
            this.framecount = 0;
        }
        if (this.startts+this.framecount*1000/60 > ts) {
            if (this.running) 
                requestAnimationFrame(nts => this.animate(nts));
            return;
        }
        this.framecount++;
        const clearspeed = this.grid.state == 'intro' ? this.INTROCLEARSPEED : this.CLEARSPEED;
        this.polys = this.polys.filter(p => {
            // params.center can be set to .to and .to can be set to null in clear()
            if (!p.to) return false;
            const r = f.sub(p.to, p.params.center);
            const rmag = f.len(r);
            if (rmag < this.FALLSPEED) {
                p.params.center = {...p.to};
                p.recalcBoundary();
                p.to = null;
                return false;
            } else {
                p.params.center = f.add(p.params.center, f.mul(r, this.FALLSPEED/rmag));
                p.recalcBoundary();
                return true;
            }
        });
        this.clearing = this.clearing.filter(p => {
            p.params.center.y -= clearspeed;
            if (p.params.center.y < -this.grid.params.dim.h/2-this.CLEARREMOVE)
                return false;
            else {
                p.recalcBoundary();
                return true;
            }
        });
        this.messages = this.messages.filter(msg => {
            msg.tick();
            return msg.time >= 0;
        });
        if (this.astron) {
            this.astron.tick();
            if (this.astron.done) this.astron = null;
        }
        this.grid.tick();
        this.bg.tick();
        this.repaint();
        if (this.running) 
            requestAnimationFrame(nts => this.animate(nts));
    }

    calcMessagePositions() {
        let msgy = this.MSGSTART;
        for (let i=0; i<this.messages.length; i++) {
            this.messages[i].pos.y = msgy;
            msgy += this.messages[i].dim.h + this.MSGSPACE;
        }
    }

    // Make a falling copy of poly and flash its color white
    clear(poly) {
        this.clearing.push(new this.grid.kls(poly.params));
        const cpoly = this.clearing.at(-1);
        cpoly.params.center = {...poly.params.center};
        cpoly.empty = false;
        cpoly.flash();
    }

    fall(poly, to) {
        poly.to = {...to};
        this.polys.push(poly);
    }

    // Grid coordinates
    // Position is also calculated in animate
    message(text, time) {
        const msg = new Message({
            text: text, 
            pos: {x: 0, y: 0}, 
            fontSize: '24',
            fontWeight: '',
            time: time ?? null,
            ctx: this.ctx, 
            xform: p => this.grid.xform(p)});
        this.messages.push(msg);
        this.calcMessagePositions();
    }

    start() {
        if (this.running) return;
        this.running = true;
        requestAnimationFrame(e => this.animate());
    }

    stop() {
        this.running = false;
        this.startts = null;
    }
    
    repaint() {
        /*this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0,0,this.dim.w,this.dim.h);*/
        this.bg.draw(this.ctx);
        if (this.grid.state == 'intro') {
            this.grid.drawClearing(this.ctx);
            this.grid.boxes.intro.draw(this.ctx);
        } else {
            this.grid.draw(this.ctx, 'red');
            this.messages.forEach(msg => msg.draw(this.ctx));
            this.grid.drawOverlay(this.ctx);
            if (this.astron) {
                this.astron.draw(this.ctx);
            }
        }
    }

    taunt(types) {
        const idx = f.randint(0,6);
        const img = this.grid.params.assets[`${types[idx]}_big`];
        this.astron = new AstronTaunt(this.grid, img, 80);
    }
}

class Message {
    constructor(params) {
        console.assert(params.ctx);
        console.assert(params.pos);
        this.params = params;
        this.pos = params.pos;
        this.dim = null;
        this.time = params.time ?? 120;
        this.text = params.text ?? 'empty';
        this.color = params.color ?? '#fff';
        this.fontFamily = params.fontFamily ?? 'Sans-serif';
        this.fontSize = params.fontSize ?? 16;
        this.fontWeight = params.fontWeight ?? '';
        this.ctx = params.ctx;
        this.xform = params.xform ?? null;
        this.pack();
    }

    draw(ctx) {
        ctx.save();
        if (this.alpha || this.alpha === 0) ctx.globalAlpha = this.alpha;
        let p = {x: this.pos.x, y: this.pos.y-this.ascent};
        if (this.xform) p = this.xform(p);
        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, p.x, p.y);
        ctx.restore();
    }

    get font() {
        return `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}, sans-serif`;
    }

    pack() {
        this.ctx.save();
        this.ctx.font = this.font;
        const tm = this.ctx.measureText(this.text);
        this.ascent = tm.actualBoundingBoxAscent;
        this.descent = tm.actualBoundingBoxDescent;
        this.pos.x = this.pos.x-tm.width/2;
        this.dim = {w: tm.width, h: this.ascent+this.descent};
        this.ctx.restore();
    }

    tick() {
        this.time--;
    }
}
