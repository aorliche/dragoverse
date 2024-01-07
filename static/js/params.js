
import {Sprite} from './sprite.js';

export {sprites, stats, ais, onLoadSprites};

let sprites, stats, ais;
let nloaded = 0;
let nimgs = 0;

function onLoadSprites(cb) {
    for (const name in sprites) {
        nimgs += sprites[name].nimgs;
    }
    function poll() {
        if (nloaded == nimgs) {
            cb();
        } else {
            setTimeout(poll, 100);
        }
    }
    setTimeout(poll, 100);
}

function onLoad() {
    nloaded++;
}
    
sprites = {
    'animus': new Sprite('animus', {
        right: 'image/actors/Animus48.png', 
        left: 'image/actors/Animus48rev.png', 
        up: null, 
        down: null 
    }, onLoad),
    'pig': new Sprite('pig', {
        right: 'image/actors/Pig128_48.png', 
        left: 'image/actors/Pig128_48rev.png', 
        up: null, 
        down: null
    }, onLoad),
    'spider-minion': new Sprite('spider-minion', {
        right: 'image/enemies/SpiderMinion128_42right.png', 
        left: 'image/enemies/SpiderMinion128_42left.png', 
        up: 'image/enemies/SpiderMinion128_42rev.png', 
        down: 'image/enemies/SpiderMinion128_42.png'
    }, onLoad),
    'rock': new Sprite('rock', {
        img: 'image/terrain/Rock128_64.png'
    }, onLoad),
    'sword': new Sprite('sword', {
        right: 'image/props/Sword32_20right.png', 
        left: 'image/props/Sword32_20left.png', 
        up: 'image/props/Sword32_20up.png', 
        down: 'image/props/Sword32_20down.png'
    }, onLoad),
};

stats = {
    'animus': {
        type: 'animus',
        speed: 6,
    }
    'pig': {
        type: 'pig',
        speed: 4,
        hpmax: 20,
        hp: 15,
        strength: 3,
        reload: 600,
        range: 10,
        projectile: 'sword',
    },
    'spider-minion': {
        type: 'spider-minion',
        speed: 2,
        hpmax: 10,
        hp: 10,
        strength: 1,
        reload: 1200,
        range: 10,
        projectile: 'sword',
    },
    'rock': {
        type: 'environment',
    },
    'spawner': {
        type: 'spawner',
        reload: 5000,
        actions: {
            Spawn: function(me) {
                me.stage.make(
                    sprites['spider-minion'], 
                    me.pos.clone(), 
                    ais['spider-minion'], 
                    stats['spider-minion']
                );
            }
        }
    }
};

ais = {
    'pig': (e) => {
        const me = e.actors[e.me];
        const selected = e.actors[e.selected];
        const acts = [];
        for (let i=0; i<e.actors.length; i++) {
            const tgt = tryHitAll(me, e.actors, obj => obj.stats && obj.stats.type == 'spider-minion');
            if (tgt) {
                return {type: 'Attack', who: tgt.id};
            }
        }
        if (selected) {
            const d = dist(selected.pos, me.pos);
            if (d > 200) {
                return {type: 'Move', where: selected.pos};
            }
        }
        return null;
    },
    'spider-minion': (e) => {
        const me = e.actors[e.me];
        e.actors.splice(e.me, 1);
        const tgt = tryHitAll(me, e.actors, obj => obj.stats && obj.stats.type == 'pig');
        if (tgt) {
            return {type: 'Attack', who: tgt.id};
        }
        const acts = e.actors.filter(obj => obj.stats && obj.stats.type == 'pig');
        if (acts.length == 0) {
            return null;
        }
        acts.sort((a, b) => {
            const da = dist(a.pos, me.pos);
            const db = dist(b.pos, me.pos);
            return da-db;
        });
        const closest = acts[0];
        return {type: 'Move', where: closest.pos};
    },
    'spawner': (e) => {
        let nearby = false;
        const me = e.actors[e.me];
        e.actors.forEach(obj => {
            if (obj.stats.type == 'spider-minion' || obj.stats.type == 'pig') {
                const d = dist(obj.pos, me.pos);
                if (d < 300) {
                    nearby = true;
                }
            }
        });
        if (e.state == null) {
            e.state = {prev: 0};
        }
        if (nearby) {
            return {state: e.state};
        }
        if (e.ts > e.state.prev + me.stats.reload) {
            e.state.prev = e.ts;
            return {type: 'Spawn', state: e.state};
        }
        return {state: e.state};
    },
};
