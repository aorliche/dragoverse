
/*class PadConfigScreen extends Screen {
    constructor(game) {
        super(game);
        this.map = {};
        this.fieldIdx = 0;

		const vert1 = new VBox({pos: {x: 0, y: 40}, dim: {...this.dim}, align: 'center'});
		vert1.add(new Text({text: 'Configure Your Controller', fontSize: 28, 
			fontWeight: 'Bold', fontFamily: fontFamily2}, this.game.ctx));
		vert1.add(new Text({text: 'Press button when field is highlighted', fontWeight: 'Bold', fontSize: 24, 
			color: '#8f2559', margin: 10}, this.game.ctx));
		vert1.add(new ImageControl({img: images['controller'], dim: {w: 150, h: 150}, margin: 10}));
		vert1.add(new PadConfigButton({text: 'Start', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));

		const twoColumns = new HBox({margin: 10});
		const left = new VBox({margin: 10});
		const right = new VBox({margin: 10});

		left.add(new PadConfigButton({text: 'A', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));
		left.add(new PadConfigButton({text: 'B', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));
		left.add(new PadConfigButton({text: 'X', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));
		left.add(new PadConfigButton({text: 'Y', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));
		left.add(new PadConfigButton({name: 'LB', text: 'Left Bumper', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));

		right.add(new PadConfigButton({name: 'RB', text: 'Right Bumper', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));
		right.add(new PadConfigButton({name: 'LA', text: 'Left Arrow', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));
		right.add(new PadConfigButton({name: 'RA', text: 'Right Arrow', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));
		right.add(new PadConfigButton({name: 'UA', text: 'Up Arrow', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));
		right.add(new PadConfigButton({name: 'DA', text: 'Down Arrow', dim: {w: 160, h: 30}, margin: 10}, this.game.ctx, this));

		this.fields = [vert1.find('Start')].concat(left.children).concat(right.children);

		vert1.add(twoColumns);
		twoColumns.add(left);
		twoColumns.add(right);

		vert1.add(new Button({text: 'Return', dim: {w: 120, h: 40}, 
			cb: e => {
				this.save();
				if (this.game.level == 0) {
					this.game.newGame();
				} else {
					this.game.visible = this.game.menu;
				}
			}, hoverColor: '#2a5e68', margin: 15},
			this.game.ctx));

		vert1.packAll();
		this.add(vert1);
		this.find('Start').selected = true;

        this.ts = null;

		if (this.restore()) {
			this.fieldIdx = this.fields.length;
			this.find('Return').hovering = true;
		}
    }
    
    capture(pad) {
        if (!this.unlock) return;
        if (this.fieldIdx < this.fields.length) {
            const field = this.fields[this.fieldIdx];
			field.button = null;
			field.axis = null;
			field.value = null;
            const success = field.capture(pad);
            if (success) {
                if (field.button || field.button === 0) this.map[field.button] = field.name;
                else this.map[`${field.axis}:${field.value}`] = field.name;
                this.fieldIdx++;
                if (this.fieldIdx == this.fields.length) {
                    this.ts = pad.timestamp;
					field.selected = false;
					this.find('Return').hovering = true;
				} else {
					const f = this.fields[this.fieldIdx];
					f.click();
				}
            }
        } else if (pad.timestamp - 300 > this.ts) {
			if (this.game.padState.anyButton()) this.find('Return').click();
        }
    }

	lock() {
		this.unlock = false;
		setTimeout(e => {this.unlock = true;}, 300);
	}

	restore() {
		let found = false;
		['Start', 'A', 'B', 'X', 'Y', 'LB', 'RB', 'LA', 'RA', 'UA', 'DA'].forEach(name => {
			const buttonOrAxis = localStorage.getItem(name);
			if (buttonOrAxis || buttonOrAxis === 0) {
				found = true;
				const field = this.find(name);
				if (buttonOrAxis.includes(':')) {
					const [axis,value] = buttonOrAxis.split(':');
					field.axis = parseInt(axis);
					field.value = parseInt(value);
					field.button = null;
				} else {
					field.axis = null;
					field.value = null;
					field.button = buttonOrAxis;
				}
				this.map[buttonOrAxis] = name;
			}
		});
		return found;
	}

	save() {
		const map = this.game.config.map;
		['Start', 'A', 'B', 'X', 'Y', 'LB', 'RB', 'LA', 'RA', 'UA', 'DA'].forEach(name => {
			localStorage.removeItem(name);
		});
		for (const button in map) {
			const name = map[button];
			localStorage.setItem(name, button.toString());
		}
	}
}*/

/*class TitleScreen extends Screen {
	constructor(game) {
		super(game);
        this.enabled = false;
		
		const vert1 = new VBox({pos: {x: 0, y: 40}, dim: {...this.dim}, align: 'center'});
		vert1.add(new Text({text: 'DRAGON STAR', fontSize: 72, fontFamily: fontFamily1, margin: 10}, this.game.ctx));
		vert1.add(new ImageControl({img: images['DragonTitle'], dim: {w: 280, h: 280}, margin: 20}));
		vert1.add(new Button({name: 'button', text: 'Click to Enable Sounds', 
			color: '#9954b6', hoverColor: '#c691e5', margin: 30, 
			cb: e => {
				const button = this.find('button');
				if (button.text.text == 'Press Start') {
					this.game.newGame();
					return;
				}
				button.text.text = 'Press Start';
				button.text.fontSize = 40;
				button.pack();
				this.enabled = true;
				this.game.sounds.playMusic('intro');
				this.hex1.translate(button.text.pos.x-80-this.hex1.center.x, 0);
				this.hex2.translate(-(button.text.pos.x+button.dim.w+80-this.hex2.center.x), 0);
			}, fontSize: 32, fontWeight: '', fontFamily: fontFamily2, fill: false, lineWidth: 0}, this.game.ctx));

		vert1.packAll();
		this.add(vert1);

		const button = this.find('button');
		this.hex1 = new HexPoly({x: button.pos.x-80, y: button.pos.y+15}, 40, 'graphic', Math.PI/6, null, {lineWidth: 0});
		this.hex2 = new HexPoly({x: button.pos.x+button.dim.w+80, y: button.pos.y+15}, 40, 'graphic', Math.PI/6, null, {lineWidth: 0});

		this.polys = [];
		this.speed = 2;
		this.creationTime = 40;
	}

	click(p) {
		//if (this.find('button').text.text != 'Press Start')
			this.find('button').click();
		//else
			//super.click();
	}

	draw(ctx) {
		super.draw(ctx);
		ctx.globalAlpha = 0.5;
		this.hex1.draw(ctx);
		this.hex2.draw(ctx);
		//this.polys.forEach(p => p.draw(ctx));
		ctx.globalAlpha = 1;
	}

	tick() {
		const size = 40;
		if (this.game.age % this.creationTime == 0) {
			const x = Math.round(Math.random())*(this.dim.w-220)+Math.random()*(220-2*size)+size;
			const y = Math.random()*100+this.dim.h+size;
			this.polys.push(new HexPoly({x: x, y: y}, 40, 'graphic', Math.PI/6, null, {lineWidth: 0}));
		}
		let c = 0;
		while (c < this.polys.length && this.polys[c].center.y + size < 0) c++;
		if (c) this.polys.splice(0, c);
		this.polys.forEach(p => p.translate(0, -this.speed));
	}
}*/
