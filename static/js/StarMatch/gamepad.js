
class GamepadState {
	constructor(game) {
		this.game = game;
        this.ages = {};
		this.pressed = {};
		// Arrow keys
        this.interval = {};
        this.intervalDefault = 6;
        this.intervalFirst = 12;
		// Simultaneous LB+RB
		this.simulWindow = 10;
	}
    
    anyButton() {
        let pressed = false;
        this.game.pad.buttons.forEach(b => {
            if (b.pressed) pressed = true;
        });
        return pressed;
    }
    
    anyButtonOrAxis() {
        if (this.anyButton())
            return true;
        let pressed = false;
        this.game.pad.axes.forEach(a => {
            if (Math.abs(Math.round(a)) == 1) pressed = true;
        });
        return pressed;
    }
    
    arrowEvent(evt, key, name, age) {
        if (!this.ages[key] || age-this.ages[key] >= this.interval[key]) {
            const diff = this.ages[key] ? age-this.ages[key] : this.intervalFirst+1;
            if (diff > this.intervalFirst)
                this.interval[key] = this.intervalFirst;
            else if (diff == this.intervalFirst)
                this.interval[key] = this.intervalDefault;
            switch (name) {
                case 'LA': evt.axes[0] = -1; break;
                case 'RA': evt.axes[0] = 1; break;
                case 'UA': evt.axes[1] = -1; break;
                case 'DA': evt.axes[1] = 1; break;
            }
            this.ages[key] = age;
        }
    }

	getEvents(age) {
		const evt = {axes: [0,0]};
		const map = this.game.config.map;
        // Buttons
        for (let i=0; i<this.game.pad.buttons.length; i++) {
            if (i in map) {
                const name = map[i];
                // Continuous
                if (['LA', 'RA', 'UA', 'DA'].indexOf(name) != -1 && this.game.pad.buttons[i].pressed) {
                    this.arrowEvent(evt, i, name, age);
                // Edge
                } else if (['Start', 'B', 'A', 'LB', 'RB', 'X', 'Y'].indexOf(name) != -1) {
                    if (this.game.pad.buttons[i].pressed != this.pressed[i]) {
                        this.ages[i] = age;
						this.pressed[i] = this.game.pad.buttons[i].pressed;
                        evt[name] = this.pressed[i];
                    }
                }
            }                
        }
		// Simultaneous buttons
		if (evt.LB || evt.RB) {
			const iLB = this.reverseMap(map, 'LB');
			const iRB = this.reverseMap(map, 'RB');
			if (evt.LB && this.ages[iLB] - this.ages[iRB] < this.simulWindow) evt['LB+RB'] = true;
			if (evt.RB && this.ages[iRB] - this.ages[iLB] < this.simulWindow) evt['LB+RB'] = true;
		}
        // Axes
        for (let i=0; i<this.game.pad.axes.length; i++) {
            const value = Math.round(this.game.pad.axes[i]);
            const key = `${i}:${value}`;
            if (Object.keys(map).indexOf(key) != -1) {
                const name = map[key];
                this.arrowEvent(evt, key, name, age);
            }
        }
		return evt;
	}

	reverseMap(map, name) {
		for (const i in map) {
			if (map[i] == name) return i;
		}
		return 'BadKey';
	}
}
