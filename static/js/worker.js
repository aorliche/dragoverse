import {collide, dist, sep} from './util.js';
import {tryHitAll} from './worker-util.js';

self.onmessage = function(e) {
    self.onmessage = null; // Clean-up
    eval(e.data);
};
