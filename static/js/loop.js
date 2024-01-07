
export {makeStepFn};

function makeStepFn(pad, stage) {
    let prev = null;
    const step = function (ts) {
        if (prev == null) {
            prev = ts;
        } else {
            const dt = Math.round(1000/30);
            const next = prev + dt;
            if (ts < next) {
                window.requestAnimationFrame(step);
                return;
            }
            // Hack for window losing focus
            if (ts > prev + 5*dt) {
                prev = ts;
            } else {
                prev = next;
            }
        }
        pad.tick(ts);
        stage.tick(ts);
        stage.draw();
        window.requestAnimationFrame(step);
    }
    return step;
}

