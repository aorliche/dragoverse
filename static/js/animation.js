export {Animation};

class Animation {
    constructor(stage, cb, cbend) {
        this.stage = stage;
        this.cb = cb;
        this.cbend = cbend;
    }

    cancel() {
        this.stage.animations.splice(this.stage.animations.indexOf(this), 1);
        if (this.cbend) {
            this.cbend();
        }
    }

    tick(ts) {
        const done = this.cb(ts);
        if (done) {
            this.cancel();
        }
    }
}
