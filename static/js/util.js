
export {$, $$, approx, ccw, collide, dist, drawText, getDirection, fillCircle, sep, strokeCircle, Point};

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

function approx(a, b) {
    return Math.abs(a-b) < 0.01;
}

function collide(a, obj) {
    const xover = Math.abs(obj.pos.x - a.pos.x) < obj.last.width/2 + a.last.width/2;
    const yover = Math.abs(obj.pos.y - a.pos.y) < obj.last.height/2 + a.last.height/2;
    return xover && yover;
}

// Points
function dist(a, b) {
    const dx = a.x-b.x;
    const dy = a.y-b.y; 
    return Math.sqrt(dx*dx+dy*dy);
}

function getDirection(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
            return 'left';
        } else {
            return 'right';
        }
    } else {
        if (dy < 0) {
            return 'up';
        } else {
            return 'down';
        }
    }
}

// Actors
function sep(a, b) {
    const dx = Math.abs(a.pos.x-b.pos.x);
    const dy = Math.abs(a.pos.y-b.pos.y);
    const w = a.last.width/2 + b.last.width/2;
    const h = a.last.height/2 + b.last.height/2;
    if (dx < w) {
        const d = dy-h;
        return d < 0 ? 0 : d;
    }
    if (dy < h) {
        const d = dx-w;
        return d < 0 ? 0 : d;
    }
    const dx2 = dx-w;
    const dy2 = dy-h;
    return Math.sqrt(dx2*dx2+dy2*dy2);
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Point(this.x, this.y);
    }

    distTo(p) {
        return this.minus(p).norm();
    }

    equals(p) {
        return approx(this.x, p.x) && approx(this.y, p.y);
    }

    minus(p) {
        return new Point(this.x-p.x, this.y-p.y);
    }

    norm() {
        return Math.sqrt(this.x*this.x+this.y*this.y);
    }
    
    plus(p) {
        return new Point(this.x+p.x, this.y+p.y);
    }

    times(n) {
        return new Point(this.x*n, this.y*n);
    }

    unit() {
        const n = this.norm();
        return new Point(this.x/n, this.y/n);
    }
}

function drawText(ctx, text, p, color, font, stroke) {
    ctx.save();
    if (font) ctx.font = font;
    const tm = ctx.measureText(text);
    ctx.fillStyle = color;
    if (p.ljust)
        ctx.fillText(text, p.x, p.y);
    else if (p.rjust)
        ctx.fillText(text, p.x-tm.width, p.y);
    else
        ctx.fillText(text, p.x-tm.width/2, p.y);
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.strokeText(text, p.x-tm.width/2, p.y);
    }   
    ctx.restore();
    return tm; 
}

// https://math.stackexchange.com/questions/2941053/orientation-of-three-points-in-a-plane 
function ccw(p1, p2, p3) {
    const d = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    return d > 0;
}

function fillCircle(ctx, c, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 2*Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function strokeCircle(ctx, c, r, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 2*Math.PI);
    ctx.closePath();
    ctx.stroke();
}
