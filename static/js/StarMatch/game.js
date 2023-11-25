class Game extends MouseListener {
	constructor(canvas) {
		super();
        this.timers = [];
		this.level = 0;
		this.canvas = canvas;
		this.dim = {w: canvas.width, h: canvas.height};
		this.ctx = canvas.getContext('2d');
		this.menu = new MenuScreen(this);
        this.main = new MainScreen(this); // requires menu non-null
        this.config = new PadConfigScreen(this);
		this.title = new TitleScreen(this);
        this.transition = new TransitionScreen(this);
		this.grid = null;
		this.animator = new Animator(this);
		this.paused = true;
		this.bg = new StarField(this.dim);
		this.sounds = new Sounds(this);
		this.animator.start();
		this.padState = new GamepadState(this);
		this.age = 0;
        this.sounds.playMusic('intro');
		this.visible = this.title;
        this.notifications = [];
		this.gridDim = {w: this.dim.w-440, h: this.dim.h-100};
		this.gridPos = {x: 220, y: 100};
	}

	// All mouse actions
	action(type, p) {
		this.visible[type](p);
	}

	click(p) {this.action('click', p);}
	mousedown(p) {this.action('mousedown', p);}
	mousemove(p) {this.action('mousemove', p);}
	mouseup(p) {this.action('mouseup', p);}
	mouseout(p) {this.action('mouseout', p);}
	rightClick(p) {this.action('rightClick', p);}

	newGame() {
		const moves = this.main.find('Moves');
		moves.count = 0;
		moves.parent.packAll();
		this.startLevel(1);
		this.sounds.playMusic('game');
		this.visible = this.main;
	}
    
    notify(text, params) {
        const notice = (params) ?
            new Notification({text: text, ...params}, this) :
            new Notification({text: text, fontSize: 24, fontWeight: 'Bold', color: '#f66'}, this);
        if ((!notice.announce || 
                (notice.announce && this.notifications.at(-1).announce)) 
            && this.notifications.length > 0 
            && notice.pos.y - this.notifications.at(-1).pos.y < 40) {
            notice.pos.y = this.notifications.at(-1).pos.y + 40;
        }
        this.notifications.push(notice);
    }

	pause() {
		this.paused = true;		
		this.main.find('Tectonic Activity').pause();
		this.main.find('Menu').hovering = false;
		this.visible = this.menu;
	}

	repaint() {
		this.ctx.fillStyle = '#000';
		this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
		this.bg.draw(this.ctx);
		this.visible.draw(this.ctx);
	}

	startLevel(level) {
		this.paused = false;
        this.params = levels.filter(lvl => lvl.level == level)[0];
		this.level = level;
		if (this.level == 1) {
			this.main.resetPowerups();
		}
		this.animator.gridInfos = [];
		this.main.find('Level').count = this.level;
		// Stupid timer stuff
		const t = parseInt(this.menu.find('Tectonic Activity').value);
		const timer = this.main.find('Tectonic Activity');
		if (isNaN(t)) {
			timer.visible = false;
			timer.reset();
			timer.pause();
		} else {
			timer.timeSav = t;
			timer.reset();
			timer.start();
		}
		this.levelOver = false;
		this.grid = new HexGrid(this, this.gridDim);
        this.grid.inputOff = true;
        this.animator.levelStartAnimation();
	}

	showMenu() {
		this.pause();
	}

	// For button events, tectonic activity warnings, notifications, and background ticks
	tick() {
		let evt = null;
		this.age++;
        this.pad = null;
        // Chrome generates new Gamepad objects every action
        for (const pad of navigator.getGamepads()) {
            if (pad) {
                this.pad = pad;
                break;
            }
        }
        // Null click in grid turns off
        if (this.pad && !this.padState.using && this.padState.anyButtonOrAxis()) {
            this.padState.using = true;
        }
		// Button events
		if (this.pad && this.padState.using) {
			evt = this.padState.getEvents(this.age);
		}
        // Game running
		if (this.visible == this.main) {
			if (evt) 
				this.grid.pressButtons(evt);
			// Warning
			const timer = this.main.find('Tectonic Activity');
			if (timer && timer.active && timer.time < 5 && timer.time >= 0) {
 				if (!this.sounds.playing('warning')) 
					this.sounds.play('warning');
			} else {
				this.sounds.stop('warning');
			}
        // Intro, menu, config, or animation
		} else {
			this.sounds.stop('warning');
			if (evt) {
				if (this.visible == this.menu) {
					if (evt.Start)
						this.unpause();
                } else if (this.visible == this.config) {
                    this.config.capture(this.pad);
				} else if (this.visible == this.title) {
					// Already have key map
					// always have axes key
                    if (Object.keys(evt).length > 1) 
                        this.newGame();
                    else if (this.title.enabled && this.padState.anyButton()) {
						this.config.lock();
						this.visible = this.config;
					}
				}
			}
		}
        // Housekeeping
        this.notifications.forEach(n => n.tick());
		this.bg.tick();
		if (this.visible.tick)
			this.visible.tick();
        this.timers.forEach(t => {
           if (t.active) t.tick(); 
        });
	}

	unpause() {
		this.visible = this.main;
		this.paused = false;
		this.main.find('Tectonic Activity').start();
		this.animator.start();
	}

	winLevel() {
        this.levelOver = true;
		this.grid.selected = null;
		this.animator.gridInfos = [];
		this.main.find('Tectonic Activity').pause();
		this.sounds.stopAll();
		this.sounds.play('winlevel');
		if (this.level < 9) {
            /*this.notify(
                "Level cleared!",
                {fontSize: 28, fontWeight: 'Bold', color: '#fff', lifetime: 6*60, announce: true});
            this.notify(
                "You see some polygons in the distance...",
                {fontSize: 28, fontWeight: 'Bold', color: '#fff', lifetime: 6*60, announce: true});
			setTimeout(e => this.startLevel(this.level+1), 4000);*/
            this.transition.reset();
            this.transition.message = ["Level cleared!", "You see some polygons in the distance..."];
            this.visible = this.transition;
            /*setTimeout(e => {
                this.startLevel(this.level+1);
            }, 5000);
            setTimeout(e => {
                this.visible = this.main;
            }, 10000);*/
		} else {
            this.notify(
                "Hooray!",
                {fontSize: 36, fontWeight: 'Bold', color: '#fff', lifetime: 6*60, announce: true});
            this.notify(
                "You have cleared this sector!",
                {fontSize: 36, fontWeight: 'Bold', color: '#fff', lifetime: 6*60, announce: true});
			this.notify(
				"But the astrons might be back...",
				{fontSize: 36, fontWeight: 'Bold', color: '#fff', lifetime: 6*60, announce: true});
            setTimeout(e => {
                this.animator.infos = [];
                this.paused = true;
                this.level = 0;
                this.visible = this.title;
            }, 6000);
		}
	}
}
