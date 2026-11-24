/* THE HOLLOW CROWN — MUSIC + PROCEDURAL GAMEPLAY SOUND EFFECTS */

const HC_AUDIO = {
    menu: new Audio("assets/sounds/menu-theme.mp3"),
    exploration: new Audio("assets/sounds/exploration-theme.mp3"),
    deathSnow: new Audio("assets/sounds/death-snow-theme.mp3"),
    current: null,
    volume: 0.35,
    sfxVolume: 0.22,
    audioContext: null,
    stepCooldown: 0,

    init() {
        Object.values({ menu: this.menu, exploration: this.exploration, deathSnow: this.deathSnow })
            .forEach(audio => { audio.loop = true; audio.volume = this.volume; });
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
        if (promise) promise.catch(error => console.warn("Audio playback blocked:", error));
    },

    unlockSfx() {
        // Call from the Start Journey tap/click so mobile browsers allow Web Audio.
        this.getAudioContext();
    },

    getAudioContext() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        if (!this.audioContext) this.audioContext = new AudioContextClass();
        if (this.audioContext.state === "suspended") this.audioContext.resume().catch(() => {});
        return this.audioContext;
    },

    playSfx(name) {
        const audio = this.getAudioContext();
        if (!audio || this.sfxVolume <= 0) return;
        const now = audio.currentTime;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const filter = audio.createBiquadFilter();
        const presets = {
            jump:   { type: "triangle", start: 210, end: 570, duration: 0.18, peak: 0.16 },
            attack: { type: "sawtooth", start: 520, end: 105, duration: 0.13, peak: 0.13 },
            step:   { type: "sine", start: 115, end: 62, duration: 0.055, peak: 0.075 }
        };
        const sound = presets[name];
        if (!sound) return;
        oscillator.type = sound.type;
        oscillator.frequency.setValueAtTime(sound.start, now);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, sound.end), now + sound.duration);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(name === "attack" ? 1800 : 900, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, sound.peak * this.sfxVolume), now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + sound.duration);
        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + sound.duration + 0.015);
    },

    updateFootsteps(player) {
        if (!player || !player.grounded || Math.abs(player.velocityX || 0) < 0.1) {
            this.stepCooldown = 0;
            return;
        }
        if (this.stepCooldown > 0) {
            this.stepCooldown--;
            return;
        }
        this.playSfx("step");
        this.stepCooldown = Math.abs(player.velocityX) > (player.speed || 4) + 0.4 ? 13 : 19;
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
        Object.values({ menu: this.menu, exploration: this.exploration, deathSnow: this.deathSnow })
            .forEach(audio => { audio.volume = this.volume; });
    },

    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
    }
};

HC_AUDIO.init();
