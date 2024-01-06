export {Sprite};

class Sprite {
    constructor(name, imgs, onload) {
        this.name = name;
        this.last = null;
        this.imgs = {};
        for (const desc in imgs) {
            if (!imgs[desc]) {
                continue;
            }
            const img = new Image();
            img.src = imgs[desc];
            img.onload = onload;
            if (!this.last) {
                this.last = img;
            }
            this.imgs[desc] = img;
        }
    }

    get nimgs() {
        let num = 0;
        for (const desc in this.imgs) {
            if (this.imgs[desc]) num++;
        }
        return num;
    }
}
