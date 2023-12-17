export {Animation};

class Animation {
    constructor(stage, cb) {
        this.stage = stage;
        this.cb = cb;
    }

    cancel() {
        this.stage.animations.splice(this.stage.animations.indexOf(this), 1);
    }

    tick(ts) {
        const done = this.cb(ts);
        if (done) {
            this.cancel();
        }
    }
}
