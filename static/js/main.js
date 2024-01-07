import {$, $$, drawText, Point} from './util.js';
import {Stage} from './stage.js';
import {sprites, stats, ais, onLoadSprites} from './params.js';
import {makeStepFn} from './loop.js';

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

    function init() {
        stage.make(sprites.rock, new Point(0, 0), null, stats.rock);
        stage.make(sprites.rock, new Point(64, 0), null, stats.rock);
        stage.make(sprites.rock, new Point(128, 0), null, stats.rock);
        stage.make(sprites.pig, new Point(20, 200), ais.pig, {...stats.pig, team: true});
        stage.make(sprites.pig, new Point(300, 200), ais.pig, {...stats.pig, team: true});
        stage.make(sprites['spider-minion'], new Point(100, 200), 
            ais['spider-minion'], stats['spider-minion']);
        stage.make(sprites.rock, new Point(-200, -200), ais.spawner, stats.spawner);
        stage.draw();    
        // For animation
        stage.sprites = sprites;
    }

    onLoadSprites(init);

    canvas.addEventListener('click', (e) => {
        stage.click(e.offsetX, e.offsetY);
    })
   
    window.requestAnimationFrame(makeStepFn(pad, stage));
});
