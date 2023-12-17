export {tryHitAll};

function collide(a, obj) {
    const xover = Math.abs(obj.pos.x - a.pos.x) < obj.last.width/2 + a.last.width/2;
    const yover = Math.abs(obj.pos.y - a.pos.y) < obj.last.height/2 + a.last.height/2;
    return xover && yover;
}

function tryHit(a, obj) {
    const testObj = {pos: {...a.pos}, last: a.last};
    if (a.lastMove[0] == 'LR') {
        testObj.pos.x += 10*a.lastMove[1];
    } else {
        testObj.pos.y += 10*a.lastMove[1];
    }
    return collide(testObj, obj);
}

function tryHitAll(a, actors, cb) {
    for (let i=0; i<actors.length; i++) {
        if (a.id == actors[i].id || !cb(actors[i]) || !tryHit(a, actors[i])) {
            continue;
        }
        return actors[i];
    }
    return null;
}
