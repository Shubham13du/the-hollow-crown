/* THE HOLLOW CROWN — MUSIC + PROCEDURAL GAMEPLAY SOUND EFFECTS */

/* THE HOLLOW CROWN — NATIVE MOBILE-FRIENDLY MUSIC + GAMEPLAY SFX */

function hcMakeWavData(kind) {
    const sampleRate = 22050;
    const duration = kind === "step" ? 0.11 : 0.24;
    const count = Math.floor(sampleRate * duration);
    const bytes = new Uint8Array(44 + count * 2);
    const view = new DataView(bytes.buffer);

    const writeText = (offset, value) => {
        for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
    };

    writeText(0, "RIFF");
    view.setUint32(4, 36 + count * 2, true);
    writeText(8, "WAVE");
    writeText(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, "data");
    view.setUint32(40, count * 2, true);

    for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        const p = t / duration;
        let frequency, envelope, sample;

        if (kind === "jump") {
            frequency = 220 + 520 * p;
            envelope = Math.pow(1 - p, 1.3);
            sample = Math.sin(2 * Math.PI * frequency * t) * envelope;
        } else if (kind === "attack") {
            frequency = 900 - 720 * p;
            envelope = Math.pow(1 - p, 0.8);
            sample = (Math.sin(2 * Math.PI * frequency * t) +
                0.35 * Math.sin(2 * Math.PI * frequency * 2.1 * t)) * envelope;
        } else {
            frequency = 105 - 35 * p;
            envelope = Math.exp(-t * 22);
            sample = Math.sin(2 * Math.PI * frequency * t) * envelope;
        }

        const pcm = Math.max(-1, Math.min(1, sample * 0.82));
        view.setInt16(44 + i * 2, Math.round(pcm * 32767), true);
    }

    let binary = "";
    const chunkSize = 0x4000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return "data:audio/wav;base64," + btoa(binary);
}

const HC_AUDIO = {
    menu: new Audio("assets/sounds/menu-theme.mp3"),
    exploration: new Audio("assets/sounds/exploration-theme.mp3"),
    deathSnow: new Audio("assets/sounds/death-snow-theme.mp3"),
    current: null,
    volume: 0.16,
    sfxVolume: 1,
    sfxSources: null,
    sfxPools: null,
    stepCooldown: 0,
    unlocked: false,

    init() {
        [this.menu, this.exploration, this.deathSnow].forEach(audio => {
            audio.loop = true;
            audio.volume = this.volume;
            audio.preload = "auto";
        });

        // Short WAV clips are played through native HTMLAudioElement. This
        // avoids mobile WebAudio suspension/gesture timing problems.
        this.sfxSources = {
            jump: hcMakeWavData("jump"),
            attack: hcMakeWavData("attack"),
            step: hcMakeWavData("step")
        };
        this.sfxPools = { jump: [], attack: [], step: [] };
    },

    unlockSfx() {
        this.unlocked = true;
        // Prime native audio playback from the user's actual touch/click.
        const audio = new Audio(this.sfxSources.jump);
        audio.volume = 0;
        const promise = audio.play();
        if (promise) promise.then(() => {
            audio.pause();
            audio.currentTime = 0;
        }).catch(() => {});
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
        if (promise) promise.catch(error => console.warn("Music playback blocked:", error));
    },

    playSfx(name) {
        if (!this.sfxSources || !this.sfxSources[name] || this.sfxVolume <= 0) return;

        let audio = this.sfxPools[name].find(item => item.paused || item.ended);
        if (!audio) {
            audio = new Audio(this.sfxSources[name]);
            audio.preload = "auto";
            this.sfxPools[name].push(audio);
        }

        audio.volume = this.sfxVolume;
        audio.currentTime = 0;
        const promise = audio.play();
        if (promise) promise.catch(error => {
            console.warn("Gameplay SFX playback failed:", name, error);
        });
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
        [this.menu, this.exploration, this.deathSnow].forEach(audio => {
            audio.volume = this.volume;
        });
    },

    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
    }
};

HC_AUDIO.init();
