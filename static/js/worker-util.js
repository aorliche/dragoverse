import {sep} from './util.js';

export {tryHit, tryHitAll};

function tryHit(a, obj) {
    return sep(a, obj, a.last, obj.last) < a.stats.range;
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
