import {Point} from './util.js';
import {Actor} from './actor.js';   
import {Animation} from './animation.js';   

export {Stage};

class Stage {
    constructor(canvas) {
        this.canvas = canvas;
        this.actors = [];
        this.props = [];
        this.ground = [];
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

    getActorById(id) {
        for (let i=0; i<this.actors.length; i++) {
            if (this.actors[i].id == id) {
                return this.actors[i];
            }
        }
        return null;
    }

    kill(actor) {
        this.actors.splice(this.actors.indexOf(actor), 1);
        if (actor == this.selected) {
            this.selected = null;
        }
    }

    makeGround(sprite, pos) {

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
