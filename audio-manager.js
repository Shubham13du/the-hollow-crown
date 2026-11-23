
/* THE HOLLOW CROWN — AUDIO MANAGER */

const HC_AUDIO = {
    menu: new Audio("sounds/menu-theme.mp3"),
    exploration: new Audio("sounds/exploration-theme.mp3"),
    deathSnow: new Audio("sounds/death-snow-theme.mp3"),

    current: null,
    volume: 0.35,

    init() {
        Object.values({
            menu: this.menu,
            exploration: this.exploration,
            deathSnow: this.deathSnow
        }).forEach(audio => {
            audio.loop = true;
            audio.volume = this.volume;
        });
    },

    play(name) {
        const next = this[name];
        if (!next || this.current === next) return;

        if (this.current) {
            this.current.pause();
            this.current.currentTime = 0;
        }

        this.current = next;
        next.volume = this.volume;

        const promise = next.play();
        if (promise) {
            promise.catch(error => {
                console.warn("Audio playback blocked:", error);
            });
        }
    },

    stop() {
        if (this.current) {
            this.current.pause();
            this.current.currentTime = 0;
            this.current = null;
        }
    },

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        Object.values({
            menu: this.menu,
            exploration: this.exploration,
            deathSnow: this.deathSnow
        }).forEach(audio => {
            audio.volume = this.volume;
        });
    }
};

HC_AUDIO.init();
