
"use strict";

// ============================================================
// THE HOLLOW CROWN
// LEVEL 1 — THE FORGOTTEN RUINS
// EXPANDED EDITION — 6500 WORLD UNITS
// ============================================================

// 1. CANVAS & WORLD
const canvas = document.getElementById("gameCanvas");
if (!canvas) throw new Error("Canvas with id 'gameCanvas' not found.");

const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const WORLD_WIDTH = 6500;
const gravity = 0.6;

const LEVEL = {
    start: 0,
    end: WORLD_WIDTH,
    groundY: 460
};

const camera = {
    x: 0,
    targetX: 0,
    smoothness: 0.12
};

let gameTime = 0;
let notification = "";
let notificationTimer = 0;
let relicCount = 0;
let checkpointIndex = 0;

// 2. SPRITES
function loadSprite(path, name) {
    const img = new Image();
    img.onload = () => console.log(name + " loaded.");
    img.onerror = () => console.error(name + " failed: " + path);
    img.src = path;
    return img;
}

const knightSprite = loadSprite(
    "assets/knight_spritesheet1.png",
    "Knight"
);

const sentinelSprite = loadSprite(
    "assets/sentinel_spritesheet.png",
    "Hollow Sentinel"
);

const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
const SPRITE_SCALE = 1.25;

const PLAYER_ANIMATIONS = {
    idle:   { row: 0, frames: 6, fps: 8, loop: true },
    walk:   { row: 1, frames: 8, fps: 10, loop: true },
    run:    { row: 2, frames: 8, fps: 12, loop: true },
    jump:   { row: 3, frames: 4, fps: 10, loop: false },
    fall:   { row: 4, frames: 3, fps: 8, loop: true },
    attack: { row: 5, frames: 6, fps: 10, loop: false },
    damage: { row: 6, frames: 3, fps: 8, loop: false }
};

const ENEMY_ANIMATIONS = {
    idle:   { row: 0, frames: 4, fps: 6, loop: true },
    walk:   { row: 1, frames: 6, fps: 8, loop: true },
    attack: { row: 2, frames: 6, fps: 10, loop: false },
    damage: { row: 3, frames: 2, fps: 8, loop: false },
    death:  { row: 4, frames: 6, fps: 8, loop: false }
};

// 3. ANIMATION ENGINE
function createAnimation(state = "idle") {
    return {
        current: state,
        frame: 0,
        timer: 0,
        finished: false
    };
}

function setAnimation(anim, state) {
    if (anim.current === state) return;

    anim.current = state;
    anim.frame = 0;
    anim.timer = 0;
    anim.finished = false;
}

function advanceAnimation(anim, definitions) {
    const config = definitions[anim.current];
    if (!config || anim.finished) return;

    anim.timer++;

    if (anim.timer < Math.max(1, Math.round(60 / config.fps))) {
        return;
    }

    anim.timer = 0;
    anim.frame++;

    if (anim.frame >= config.frames) {
        if (config.loop) {
            anim.frame = 0;
        } else {
            anim.frame = config.frames - 1;
            anim.finished = true;
        }
    }
}

// 4. GROUND & PLATFORMS
const ground = {
    x: 0,
    y: LEVEL.groundY,
    width: WORLD_WIDTH,
    height: HEIGHT - LEVEL.groundY
};

const platforms = [
    // Forgotten Ruins
    { x: 170, y: 330, width: 170, height: 14 },
    { x: 520, y: 400, width: 220, height: 14 },
    { x: 880, y: 350, width: 180, height: 14 },
    { x: 1200, y: 290, width: 200, height: 14 },
    { x: 1580, y: 380, width: 220, height: 14 },
    { x: 1950, y: 320, width: 180, height: 14 },
    { x: 2300, y: 370, width: 240, height: 14 },
    { x: 2700, y: 300, width: 180, height: 14 },

    // Broken Bridge
    { x: 3150, y: 380, width: 170, height: 14 },
    { x: 3420, y: 320, width: 200, height: 14 },
    { x: 3720, y: 270, width: 180, height: 14 },
    { x: 4020, y: 350, width: 220, height: 14 },
    { x: 4340, y: 300, width: 190, height: 14 },

    // Sunken Temple
    { x: 4650, y: 380, width: 210, height: 14 },
    { x: 4930, y: 320, width: 180, height: 14 },
    { x: 5210, y: 270, width: 220, height: 14 },
    { x: 5500, y: 350, width: 190, height: 14 },
    { x: 5780, y: 300, width: 200, height: 14 },
    { x: 6060, y: 360, width: 180, height: 14 }
];

// 5. MOVING PLATFORMS
const movingPlatforms = [
    { x: 740, y: 390, width: 115, height: 14, startX: 740, endX: 840, speed: 1.1, direction: 1 },
    { x: 1430, y: 335, width: 125, height: 14, startX: 1410, endX: 1530, speed: 1.25, direction: 1 },
    { x: 2110, y: 350, width: 125, height: 14, startX: 2100, endX: 2220, speed: 1, direction: -1 },
    { x: 3280, y: 350, width: 130, height: 14, startX: 3250, endX: 3370, speed: 1.25, direction: 1 },
    { x: 3900, y: 310, width: 130, height: 14, startX: 3860, endX: 3990, speed: 1.1, direction: -1 },
    { x: 4780, y: 340, width: 130, height: 14, startX: 4740, endX: 4870, speed: 1.3, direction: 1 },
    { x: 5350, y: 320, width: 130, height: 14, startX: 5310, endX: 5450, speed: 1.15, direction: -1 },
    { x: 5900, y: 340, width: 130, height: 14, startX: 5860, endX: 5980, speed: 1.2, direction: 1 }
];

for (const p of movingPlatforms) {
    p.oldX = p.x;
    p.oldY = p.y;
}

function updateMovingPlatforms() {
    for (const p of movingPlatforms) {
        p.oldX = p.x;
        p.oldY = p.y;

        p.x += p.speed * p.direction;

        if (p.x >= p.endX) {
            p.x = p.endX;
            p.direction = -1;
        }

        if (p.x <= p.startX) {
            p.x = p.startX;
            p.direction = 1;
        }
    }
}

// 6. PLAYER
const player = {
    x: 100,
    y: LEVEL.groundY - 60,
    width: 32,
    height: 60,

    speed: 4,
    runSpeed: 5.5,

    velocityX: 0,
    velocityY: 0,
    jumpPower: -15,
    grounded: true,
    facing: 1,

    health: 100,
    maxHealth: 100,

    isAttacking: false,
    attackCooldown: 0,
    hitEnemies: [],

    damageCooldown: 0,
    damageAnimationTimer: 0,

    gameOver: false,
    levelComplete: false,

    standingPlatform: null,
    checkpointX: 100
};

const playerAnimation = createAnimation("idle");

// 7. ENEMIES & MINI-BOSSES
function createEnemy(x, options = {}) {
    const boss = options.boss || false;

    const width = boss ? 54 : 36;
    const height = boss ? 78 : 58;

    return {
        x,
        y: (Number.isFinite(options.platformY) ? options.platformY : ground.y) - height,
        width,
        height,
        platformY: Number.isFinite(options.platformY) ? options.platformY : null,

        boss,
        enemyType: options.enemyType || "sentinel",
        name: options.name || "Hollow Sentinel",

        spriteScale: boss ? 1.65 : SPRITE_SCALE,

        speed: options.speed || 1.35,
        health: options.health || 3,
        maxHealth: options.health || 3,

        facing: -1,
        detectionRange: options.detectionRange || 300,
        attackRange: options.attackRange || 52,
        attackCooldown: 50 + Math.floor(Math.random() * 50),
        attackImpactApplied: false,
        damage: options.damage || 15,

        patrolStart: Math.max(0, x - (options.patrol || 190)),
        patrolEnd: Math.min(WORLD_WIDTH - 40, x + (options.patrol || 190)),

        state: "idle",
        stunTimer: 0,
        animation: createAnimation("idle")
    };
}

const enemyPositions = [
    650, 1050, 1450, 1900,
    2800, 3200, 3540, 3890,
    4210, 4590, 4890, 5480,
    5740, 6040, 6150
];

const enemies = enemyPositions.map((x, i) => createEnemy(x, {
    health: i >= 10 ? 4 : 3,
    speed: i >= 10 ? 1.55 : 1.35,
    damage: i >= 10 ? 18 : 15,
    patrol: i >= 10 ? 230 : 190
}));

// Mini-boss 1
enemies.push(createEnemy(2450, {
    boss: true,
    name: "THE RUIN WARDEN",
    health: 12,
    speed: 1.05,
    damage: 24,
    detectionRange: 520,
    attackRange: 75,
    patrol: 140
}));

// Mini-boss 2
enemies.push(createEnemy(5100, {
    boss: true,
    name: "THE SUNKEN SENTINEL",
    health: 16,
    speed: 1.15,
    damage: 27,
    detectionRange: 560,
    attackRange: 82,
    patrol: 150
}));

// Elevated guards make World I's platforms part of combat, not decoration.
[
    { x: 905, y: 350, name: "RUIN LOOKOUT" },
    { x: 1240, y: 290, name: "TEMPLE LOOKOUT" },
    { x: 1980, y: 320, name: "BRIDGE LOOKOUT" },
    { x: 3450, y: 320, name: "BROKEN SENTINEL" },
    { x: 4960, y: 320, name: "SUNken LOOKOUT" },
    { x: 5815, y: 300, name: "GATE LOOKOUT" }
].forEach((spot) => {
    const guard = createEnemy(spot.x, {
        name: spot.name, health: 4, speed: 1.05, damage: 14,
        patrol: 55, detectionRange: 280, attackRange: 48, platformY: spot.y
    });
    guard.patrolStart = spot.x - 55;
    guard.patrolEnd = spot.x + 55;
    guard.platformY = spot.y;
    enemies.push(guard);
});

// 8. CHECKPOINT SHRINES
const checkpoints = [
    {
        x: 2200,
        y: ground.y - 72,
        active: false,
        reached: false,
        name: "THE BROKEN SHRINE"
    },
    {
        x: 4400,
        y: ground.y - 72,
        active: false,
        reached: false,
        name: "THE SUNKEN SHRINE"
    }
];

function updateCheckpoints() {
    for (let i = 0; i < checkpoints.length; i++) {
        const cp = checkpoints[i];

        const close =
            Math.abs(player.x + player.width / 2 - cp.x) < 55 &&
            Math.abs(player.y + player.height - ground.y) < 100;

        if (close && !cp.reached) {
            cp.reached = true;
            cp.active = true;
            checkpointIndex = i + 1;

            player.checkpointX = cp.x + 55;
            player.health = player.maxHealth;

            showNotification(cp.name + " ACTIVATED");
        }
    }
}

function drawCheckpoints() {
    for (const cp of checkpoints) {
        const glow = cp.active ? 0.35 : 0.12;
        const pulse = Math.sin(gameTime * 0.004) * 5;

        ctx.fillStyle = "#373039";
        ctx.fillRect(cp.x - 20, cp.y + 40, 40, 32);

        ctx.fillStyle = "#665448";
        ctx.fillRect(cp.x - 25, cp.y + 35, 50, 8);

        const light = ctx.createRadialGradient(
            cp.x,
            cp.y + 15,
            2,
            cp.x,
            cp.y + 15,
            65 + pulse
        );

        light.addColorStop(0, `rgba(191,153,76,${glow})`);
        light.addColorStop(1, "rgba(191,153,76,0)");

        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y + 15, 65 + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cp.active ? "#e7c56f" : "#87704a";
        ctx.beginPath();
        ctx.moveTo(cp.x, cp.y);
        ctx.lineTo(cp.x - 10, cp.y + 20);
        ctx.lineTo(cp.x, cp.y + 32);
        ctx.lineTo(cp.x + 10, cp.y + 20);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#e8d5a2";
        ctx.font = "11px Georgia";
        ctx.textAlign = "center";
        ctx.fillText(cp.active ? "SAVED" : "SHRINE", cp.x, cp.y - 12);
    }

    ctx.textAlign = "left";
}

// 9. HIDDEN RELIC CACHES
const relics = [
    { x: 1020, y: 315, collected: false },
    { x: 1810, y: 345, collected: false },
    { x: 3370, y: 285, collected: false },
    { x: 4260, y: 265, collected: false },
    { x: 5570, y: 315, collected: false },
    { x: 6000, y: 265, collected: false }
];

function updateRelics() {
    for (const relic of relics) {
        if (relic.collected) continue;

        const distance = Math.hypot(
            player.x + player.width / 2 - relic.x,
            player.y + player.height / 2 - relic.y
        );

        if (distance < 48) {
            relic.collected = true;
            relicCount++;
            showNotification("ANCIENT RELIC FOUND");
        }
    }
}

function drawRelics() {
    for (const relic of relics) {
        if (relic.collected) continue;

        const pulse = Math.sin(gameTime * 0.005 + relic.x) * 4;

        const glow = ctx.createRadialGradient(
            relic.x, relic.y, 2,
            relic.x, relic.y, 35 + pulse
        );

        glow.addColorStop(0, "rgba(218,177,83,0.32)");
        glow.addColorStop(1, "rgba(218,177,83,0)");

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(relic.x, relic.y, 35 + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(relic.x, relic.y);
        ctx.rotate(Math.sin(gameTime * 0.002 + relic.x) * 0.15);

        ctx.fillStyle = "#d5b15e";
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(9, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#f3d88f";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

// 10. SPIKE TRAPS
const spikeTraps = [
    { x: 430, y: 460, width: 65, height: 23 },
    { x: 970, y: 460, width: 75, height: 23 },
    { x: 1740, y: 460, width: 85, height: 23 },
    { x: 2180, y: 460, width: 75, height: 23 },
    { x: 2580, y: 460, width: 80, height: 23 },

    { x: 3060, y: 460, width: 85, height: 23 },
    { x: 3630, y: 460, width: 90, height: 23 },
    { x: 4150, y: 460, width: 75, height: 23 },
    { x: 4490, y: 460, width: 90, height: 23 },
    { x: 5050, y: 460, width: 80, height: 23 },
    { x: 5590, y: 460, width: 85, height: 23 },
    { x: 5900, y: 460, width: 75, height: 23 }
];

function checkSpikeCollision() {
    if (!player.grounded) return;

    for (const spike of spikeTraps) {
        const overlap =
            player.x + player.width > spike.x + 4 &&
            player.x < spike.x + spike.width - 4 &&
            player.y + player.height > spike.y - spike.height + 8;

        if (overlap) {
            damagePlayer(20);
            break;
        }
    }
}

function drawSpikeTraps() {
    for (const spike of spikeTraps) {
        const count = Math.floor(spike.width / 16);

        for (let i = 0; i < count; i++) {
            const x = spike.x + i * 16;

            ctx.fillStyle = "#39343b";
            ctx.strokeStyle = "#8a7771";
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(x, spike.y);
            ctx.lineTo(x + 8, spike.y - spike.height);
            ctx.lineTo(x + 16, spike.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#b2a29a";
            ctx.fillRect(x + 7, spike.y - spike.height + 5, 2, 5);
        }
    }
}

// 11. FALLING ROCKS
const fallingRocks = [
    { x: 760, radius: 17, trigger: 650 },
    { x: 1370, radius: 19, trigger: 1250 },
    { x: 2020, radius: 18, trigger: 1900 },
    { x: 2500, radius: 20, trigger: 2380 },
    { x: 3330, radius: 18, trigger: 3210 },
    { x: 3970, radius: 20, trigger: 3850 },
    { x: 4700, radius: 19, trigger: 4580 },
    { x: 5360, radius: 21, trigger: 5240 },
    { x: 5650, radius: 18, trigger: 5530 },
    { x: 6100, radius: 20, trigger: 5980 }
];

function resetRock(rock) {
    rock.y = -100;
    rock.state = "waiting";
    rock.timer = 0;
}

for (const rock of fallingRocks) resetRock(rock);

function updateFallingRocks() {
    for (const rock of fallingRocks) {
        if (rock.state === "waiting") {
            if (Math.abs(player.x - rock.trigger) < 95) {
                rock.state = "warning";
                rock.timer = 0;
            }
        } else if (rock.state === "warning") {
            rock.timer++;

            if (rock.timer > 55) {
                rock.state = "falling";
                rock.y = -30;
            }
        } else if (rock.state === "falling") {
            rock.y += 5.5;

            const hitPlayer =
                player.x + player.width > rock.x - rock.radius &&
                player.x < rock.x + rock.radius &&
                player.y + player.height > rock.y - rock.radius &&
                player.y < rock.y + rock.radius;

            if (hitPlayer) {
                damagePlayer(20);
                rock.state = "impact";
                rock.timer = 0;
            } else if (rock.y >= ground.y - rock.radius) {
                rock.state = "impact";
                rock.timer = 0;
            }
        } else if (rock.state === "impact") {
            rock.timer++;

            if (rock.timer > 45) {
                resetRock(rock);
            }
        }
    }
}

function drawFallingRocks() {
    for (const rock of fallingRocks) {
        if (rock.state === "warning") {
            const alpha = 0.35 + Math.sin(rock.timer * 0.3) * 0.2;

            ctx.fillStyle = `rgba(220,65,50,${alpha})`;
            ctx.fillRect(rock.x - 18, ground.y - 32, 36, 3);
        }

        if (rock.state === "falling") {
            ctx.fillStyle = "#39343b";
            ctx.beginPath();
            ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#777078";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = "#5a5257";
            ctx.fillRect(rock.x - 5, rock.y - 5, 8, 6);
        }

        if (rock.state === "impact" && rock.timer < 12) {
            ctx.fillStyle = "rgba(180,160,140,0.35)";
            ctx.beginPath();
            ctx.arc(
                rock.x,
                ground.y - 8,
                12 + rock.timer * 3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }
}

// 12. ANCIENT GATE
const ancientGate = {
    x: 6380,
    y: 280,
    width: 75,
    height: 180,
    open: false,
    opening: 0
};

function updateAncientGate() {
    if (enemies.length === 0) {
        ancientGate.open = true;
    }

    if (ancientGate.open && ancientGate.opening < 1) {
        ancientGate.opening = Math.min(
            1,
            ancientGate.opening + 0.008
        );
    }

    const nearGate =
        player.x + player.width > ancientGate.x - 45 &&
        player.x < ancientGate.x + ancientGate.width + 45 &&
        Math.abs(player.y + player.height - LEVEL.groundY) < 90;

    if (ancientGate.open && nearGate && keys["e"]) {
        player.levelComplete = true;
    }
}

function drawAncientGate() {
    const gate = ancientGate;
    const open = gate.opening;

    ctx.fillStyle = "#373039";
    ctx.fillRect(
        gate.x - 12,
        gate.y - 12,
        gate.width + 24,
        gate.height + 12
    );

    ctx.fillStyle = "#665448";
    ctx.fillRect(gate.x - 7, gate.y - 8, 9, gate.height + 8);
    ctx.fillRect(
        gate.x + gate.width - 2,
        gate.y - 8,
        9,
        gate.height + 8
    );
    ctx.fillRect(gate.x - 12, gate.y - 12, gate.width + 24, 13);

    const glow = ctx.createRadialGradient(
        gate.x + gate.width / 2,
        gate.y + gate.height / 2,
        4,
        gate.x + gate.width / 2,
        gate.y + gate.height / 2,
        85
    );

    glow.addColorStop(0, `rgba(184,146,63,${0.12 + open * 0.3})`);
    glow.addColorStop(1, "rgba(184,146,63,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(
        gate.x - 40,
        gate.y - 30,
        gate.width + 80,
        gate.height + 60
    );

    if (open < 1) {
        const doorWidth = gate.width / 2;
        const remaining = 1 - open;

        ctx.fillStyle = "#211d27";
        ctx.fillRect(
            gate.x,
            gate.y,
            doorWidth * remaining,
            gate.height
        );

        ctx.fillRect(
            gate.x + gate.width - doorWidth * remaining,
            gate.y,
            doorWidth * remaining,
            gate.height
        );

        ctx.strokeStyle = "#b8923f";
        ctx.lineWidth = 2;
        ctx.strokeRect(
            gate.x,
            gate.y,
            doorWidth * remaining,
            gate.height
        );

        ctx.strokeRect(
            gate.x + gate.width - doorWidth * remaining,
            gate.y,
            doorWidth * remaining,
            gate.height
        );
    } else {
        ctx.fillStyle = "rgba(184,146,63,0.16)";
        ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
    }

    ctx.fillStyle = "#d2ad62";
    ctx.font = "bold 22px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(
        gate.open ? "✦" : "✧",
        gate.x + gate.width / 2,
        gate.y - 24
    );

    ctx.font = "12px Georgia";
    ctx.fillStyle = "#d8c8a9";

    if (!gate.open) {
        ctx.fillText(
            `SENTINELS REMAIN: ${enemies.length}`,
            gate.x + gate.width / 2,
            gate.y + gate.height + 22
        );
    } else {
        ctx.fillStyle = "#e3c77d";
        ctx.fillText(
            "PRESS E TO ENTER",
            gate.x + gate.width / 2,
            gate.y + gate.height + 22
        );
    }

    ctx.textAlign = "left";
}

// 13. INPUT
const keys = {};

window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    keys[key] = true;

    if (
        [" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
    ) {
        event.preventDefault();
    }

    if (
        !event.repeat &&
        !player.gameOver &&
        !player.levelComplete &&
        [" ", "arrowup", "w"].includes(key) &&
        player.grounded
    ) {
        player.velocityY = player.jumpPower;
        player.grounded = false;
        player.standingPlatform = null;
        setAnimation(playerAnimation, "jump");
    }

    if (!event.repeat && key === "j") {
        attack();
    }

    if (
        !event.repeat &&
        key === "r" &&
        (
            player.gameOver ||
            player.levelComplete ||
            (endingSequence.finished && worldTwoState.phase === 3)
        )
    ) {
        if (player.gameOver) {
            respawnAtCheckpoint();
        } else {
            restartGame();
            endingSequence.active = false;
            endingSequence.finished = false;
            endingSequence.timer = 0;
        }
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
    for (const key in keys) keys[key] = false;
});

// 14. PLAYER ATTACK
function attack() {
    if (
        player.attackCooldown > 0 ||
        player.isAttacking ||
        player.damageAnimationTimer > 0 ||
        player.gameOver ||
        player.levelComplete
    ) return;

    player.isAttacking = true;
    player.attackCooldown = 36;
    player.hitEnemies = [];

    setAnimation(playerAnimation, "attack");
}

// 15. PLATFORM COLLISION
function checkPlatformCollision(entity, previousY) {
    entity.grounded = false;
    entity.standingPlatform = null;

    if (
        entity.velocityY >= 0 &&
        previousY + entity.height <= ground.y &&
        entity.y + entity.height >= ground.y
    ) {
        entity.y = ground.y - entity.height;
        entity.velocityY = 0;
        entity.grounded = true;
    }

    for (const platform of [...platforms, ...movingPlatforms]) {
        const horizontalOverlap =
            entity.x + entity.width > platform.x &&
            entity.x < platform.x + platform.width;

        const crossedTop =
            previousY + entity.height <= platform.y + 3 &&
            entity.y + entity.height >= platform.y;

        if (
            horizontalOverlap &&
            crossedTop &&
            entity.velocityY >= 0
        ) {
            entity.y = platform.y - entity.height;
            entity.velocityY = 0;
            entity.grounded = true;

            if (movingPlatforms.includes(platform)) {
                entity.standingPlatform = platform;
            }
        }
    }
}

// 16. PLAYER ANIMATION
function updatePlayerAnimation() {
    let nextState = "idle";

    if (player.damageAnimationTimer > 0) {
        nextState = "damage";
    } else if (player.isAttacking) {
        nextState = "attack";
    } else if (!player.grounded) {
        nextState = player.velocityY < 0 ? "jump" : "fall";
    } else if (Math.abs(player.velocityX) > 0 && keys["shift"]) {
        nextState = "run";
    } else if (Math.abs(player.velocityX) > 0) {
        nextState = "walk";
    }

    setAnimation(playerAnimation, nextState);
    advanceAnimation(playerAnimation, PLAYER_ANIMATIONS);

    if (
        playerAnimation.finished &&
        playerAnimation.current === "attack"
    ) {
        player.isAttacking = false;
    }
}

// 17. PLAYER UPDATE
function updatePlayer() {
    if (player.gameOver || player.levelComplete) return;

    if (player.grounded && player.standingPlatform) {
        const p = player.standingPlatform;
        player.x += p.x - p.oldX;
        player.y += p.y - p.oldY;
    }

    const previousY = player.y;
    player.velocityX = 0;

    const left = keys["a"] || keys["arrowleft"];
    const right = keys["d"] || keys["arrowright"];
    const speed = keys["shift"] ? player.runSpeed : player.speed;

    if (left && !right) {
        player.velocityX = -speed;
        player.facing = -1;
    }

    if (right && !left) {
        player.velocityX = speed;
        player.facing = 1;
    }

    player.x += player.velocityX;

    player.x = Math.max(
        LEVEL.start,
        Math.min(LEVEL.end - player.width, player.x)
    );

    player.velocityY += gravity;
    player.y += player.velocityY;

    checkPlatformCollision(player, previousY);

    if (player.y > HEIGHT + 200) {
        damagePlayer(100);
    }

    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.damageCooldown > 0) player.damageCooldown--;
    if (player.damageAnimationTimer > 0) player.damageAnimationTimer--;

    updatePlayerAnimation();
}

// 18. ENEMY AI
function setEnemyState(enemy, state) {
    if (enemy.state === state) return;

    enemy.state = state;
    setAnimation(enemy.animation, state);

    if (state === "attack") {
        enemy.attackImpactApplied = false;
    }

    if (state === "damage") {
        enemy.stunTimer = 16;
    }
}

function enemyAttackImpact(enemy) {
    const dx = Math.abs(
        player.x + player.width / 2 -
        (enemy.x + enemy.width / 2)
    );

    const dy = Math.abs(player.y - enemy.y);

    if (dx <= enemy.attackRange + 14 && dy < 90) {
        damagePlayer(enemy.damage);
    }
}

function updateEnemy(enemy) {
    if (enemy.state === "dead") return;

    if (enemy.state === "death") {
        advanceAnimation(enemy.animation, ENEMY_ANIMATIONS);

        if (enemy.animation.finished) {
            enemy.state = "dead";
        }

        return;
    }

    if (enemy.state === "damage") {
        advanceAnimation(enemy.animation, ENEMY_ANIMATIONS);
        enemy.stunTimer--;

        if (enemy.stunTimer <= 0 && enemy.animation.finished) {
            setEnemyState(enemy, "idle");
        }

        return;
    }

    if (player.gameOver || player.levelComplete) return;

    if (enemy.attackCooldown > 0) {
        enemy.attackCooldown--;
    }

    const enemyCenter = enemy.x + enemy.width / 2;
    const playerCenter = player.x + player.width / 2;

    const distanceX = Math.abs(playerCenter - enemyCenter);
    const distanceY = Math.abs(player.y - enemy.y);

    enemy.facing = playerCenter < enemyCenter ? -1 : 1;

    if (enemy.state === "attack") {
        advanceAnimation(enemy.animation, ENEMY_ANIMATIONS);

        if (
            enemy.animation.frame === 3 &&
            !enemy.attackImpactApplied
        ) {
            enemy.attackImpactApplied = true;
            enemyAttackImpact(enemy);
        }

        if (enemy.animation.finished) {
            enemy.attackCooldown = enemy.boss ? 115 : 100;
            setEnemyState(enemy, "idle");
        }

        return;
    }

    const detected =
        distanceX < enemy.detectionRange &&
        distanceY < 110;

    if (
        detected &&
        distanceX <= enemy.attackRange &&
        enemy.attackCooldown <= 0
    ) {
        setEnemyState(enemy, "attack");
        advanceAnimation(enemy.animation, ENEMY_ANIMATIONS);
        return;
    }

    if (detected && distanceX > enemy.attackRange) {
        enemy.x += enemy.facing * enemy.speed;
        setEnemyState(enemy, "walk");
    } else {
        setEnemyState(enemy, "idle");
    }

    // Enemy cannot leave its assigned patrol zone.
    enemy.x = Math.max(
        enemy.patrolStart,
        Math.min(enemy.patrolEnd, enemy.x)
    );

    advanceAnimation(enemy.animation, ENEMY_ANIMATIONS);
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        updateEnemy(enemies[i]);

        if (enemies[i].state === "dead") {
            enemies.splice(i, 1);
        }
    }
}

// 19. SWORD HIT DETECTION
function checkSwordHit() {
    if (
        !player.isAttacking ||
        playerAnimation.current !== "attack"
    ) return;

    const frame = playerAnimation.frame;
    if (frame < 2 || frame > 4) return;

    const attackBox = {
        x: player.facing === 1
            ? player.x + player.width - 2
            : player.x - 48 + 2,
        y: player.y + 8,
        width: 48,
        height: 48
    };

    for (const enemy of enemies) {
        if (
            enemy.state === "death" ||
            enemy.state === "dead" ||
            player.hitEnemies.includes(enemy)
        ) continue;

        const hit =
            attackBox.x < enemy.x + enemy.width &&
            attackBox.x + attackBox.width > enemy.x &&
            attackBox.y < enemy.y + enemy.height &&
            attackBox.y + attackBox.height > enemy.y;

        if (hit) {
            damageEnemy(enemy);
            player.hitEnemies.push(enemy);
        }
    }
}

// 20. DAMAGE SYSTEM
function damageEnemy(enemy) {
    if (
        enemy.state === "death" ||
        enemy.state === "dead"
    ) return;

    enemy.health--;

    if (enemy.health <= 0) {
        enemy.health = 0;
        enemy.state = "death";
        setAnimation(enemy.animation, "death");

        if (enemy.boss) {
            showNotification(enemy.name + " DEFEATED");
        }
    } else {
        setEnemyState(enemy, "damage");
    }
}

function damagePlayer(amount) {
    if (
        player.damageCooldown > 0 ||
        player.gameOver ||
        player.levelComplete
    ) return;

    player.health = Math.max(0, player.health - amount);
    player.damageCooldown = 60;
    player.damageAnimationTimer = 22;
    player.isAttacking = false;

    if (player.health <= 0) {
        player.health = 0;
        player.gameOver = true;
    }
}

// 21. CHECKPOINT RESPAWN
function respawnAtCheckpoint() {
    player.x = player.checkpointX;
    player.y = ground.y - player.height;

    player.velocityX = 0;
    player.velocityY = 0;

    player.health = player.maxHealth;
    player.grounded = true;
    player.facing = 1;

    player.gameOver = false;
    player.levelComplete = false;
    player.isAttacking = false;
    player.attackCooldown = 0;
    player.hitEnemies = [];
    player.damageCooldown = 100;
    player.damageAnimationTimer = 0;
    player.standingPlatform = null;

    setAnimation(playerAnimation, "idle");

    camera.x = Math.max(
        0,
        Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * 0.42)
    );

    camera.targetX = camera.x;

    for (const rock of fallingRocks) {
        resetRock(rock);
    }

    for (const key in keys) keys[key] = false;

    showNotification("RETURNED TO CHECKPOINT");
}

// 22. CAMERA
function updateCamera() {
    camera.targetX =
        player.x + player.width / 2 - WIDTH * 0.42;

    camera.targetX = Math.max(
        LEVEL.start,
        Math.min(LEVEL.end - WIDTH, camera.targetX)
    );

    camera.x +=
        (camera.targetX - camera.x) * camera.smoothness;

    if (Math.abs(camera.targetX - camera.x) < 0.1) {
        camera.x = camera.targetX;
    }
}

// 23. BACKGROUND
function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#101018");
    sky.addColorStop(1, "#1c171d");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const moonX = 790 - camera.x * 0.08;

    ctx.fillStyle = "#aaa49a";
    ctx.beginPath();
    ctx.arc(moonX, 100, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(-camera.x * 0.25, 0);
    ctx.fillStyle = "#1c1b25";

    for (let i = -1; i < 15; i++) {
        const x = i * 700;

        ctx.fillRect(x, 300, 120, 160);
        ctx.fillRect(x + 140, 260, 80, 200);
        ctx.fillRect(x + 300, 330, 120, 130);
        ctx.fillRect(x + 500, 280, 150, 180);
    }

    ctx.restore();

    ctx.fillStyle = "#c6bba5";

    for (let i = 0; i < 65; i++) {
        const x =
            ((i * 137 - camera.x * 0.05) % WIDTH + WIDTH) % WIDTH;

        const y = (i * 71) % 250;
        ctx.fillRect(x, y, 2, 2);
    }
}


// ============================================================
// THE HOLLOW CROWN — FIVE DISTINCT ENVIRONMENTS
// Replace old sections 20–25 with this complete section
// ============================================================

const AREA_ZONES = [
    {
        start: 0, end: 1300,
        name: "THE FORGOTTEN RUINS",
        skyTop: "#101820",
        skyBottom: "#29332f",
        ground: "#40372e",
        groundTop: "#79634b",
        far: "#202b2b",
        near: "#172020",
        accent: "#b18b54",
        fog: "rgba(150,175,160,0.07)",
        type: "forest"
    },
    {
        start: 1300, end: 2600,
        name: "THE BROKEN BRIDGE",
        skyTop: "#11101d",
        skyBottom: "#352a35",
        ground: "#342d35",
        groundTop: "#78636a",
        far: "#282334",
        near: "#191722",
        accent: "#9c858c",
        fog: "rgba(180,150,180,0.08)",
        type: "bridge"
    },
    {
        start: 2600, end: 3900,
        name: "THE SUNKEN TEMPLE",
        skyTop: "#0b1b25",
        skyBottom: "#1c3940",
        ground: "#263b3b",
        groundTop: "#64827a",
        far: "#183036",
        near: "#10252a",
        accent: "#73b9ad",
        fog: "rgba(100,190,180,0.11)",
        type: "temple"
    },
    {
        start: 3900, end: 5200,
        name: "THE HOLLOW COURTYARD",
        skyTop: "#21131a",
        skyBottom: "#49302f",
        ground: "#382c2b",
        groundTop: "#87634a",
        far: "#342027",
        near: "#21171e",
        accent: "#c47755",
        fog: "rgba(190,110,90,0.08)",
        type: "courtyard"
    },
    {
        start: 5200, end: 6500,
        name: "THE ANCIENT GATE",
        skyTop: "#171329",
        skyBottom: "#393047",
        ground: "#302b39",
        groundTop: "#9a8053",
        far: "#272136",
        near: "#181522",
        accent: "#d5b45f",
        fog: "rgba(190,165,110,0.09)",
        type: "gate"
    }
];

function getCurrentArea() {
    return AREA_ZONES.find(
        area => player.x >= area.start && player.x < area.end
    ) || AREA_ZONES[AREA_ZONES.length - 1];
}

function getAreaName() {
    return getCurrentArea().name;
}

// Deterministic decoration positions
const environmentObjects = [];

function addEnvironmentObject(type, x, y, scale = 1) {
    environmentObjects.push({ type, x, y, scale });
}

// FOREST: dead trees, roots and broken stones
for (let x = 80; x < 1300; x += 145) {
    addEnvironmentObject("deadTree", x, 460, 0.8 + (x % 3) * 0.1);
    if (x % 2 === 0) {
        addEnvironmentObject("mossStone", x + 65, 450, 0.8);
    }
}

// BROKEN BRIDGE: hanging chains and ruined bridge towers
for (let x = 1350; x < 2600; x += 280) {
    addEnvironmentObject("bridgeTower", x, 460, 1);
    addEnvironmentObject("chain", x + 110, 250, 1);
}

// SUNKEN TEMPLE: columns and glowing water pools
for (let x = 2650; x < 3900; x += 250) {
    addEnvironmentObject("templeColumn", x, 460, 1);
    addEnvironmentObject("waterPool", x + 90, 458, 1);
}

// COURTYARD: banners, statues and fire bowls
for (let x = 3950; x < 5200; x += 260) {
    addEnvironmentObject("banner", x, 190, 1);
    addEnvironmentObject("statue", x + 110, 460, 1);
    addEnvironmentObject("fireBowl", x + 180, 440, 1);
}

// ANCIENT GATE: rune stones and golden pillars
for (let x = 5250; x < 6300; x += 210) {
    addEnvironmentObject("runeStone", x, 460, 1);
    addEnvironmentObject("goldPillar", x + 100, 460, 1);
}

// ============================================================
// BACKGROUND
// ============================================================

function drawBackground() {
    const area = getCurrentArea();

    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, area.skyTop);
    sky.addColorStop(1, area.skyBottom);

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Moon changes appearance in each region
    const moonX = 790 - camera.x * 0.07;
    const moonY = area.type === "temple" ? 115 : 95;
    const moonRadius = area.type === "gate" ? 42 : 32;

    ctx.fillStyle = area.type === "temple" ? "#8bb9b2" : "#b9b0a0";
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Distant silhouette layers
    ctx.save();
    ctx.translate(-camera.x * 0.18, 0);

    ctx.fillStyle = area.far;

    for (let x = -700; x < WORLD_WIDTH + 700; x += 350) {
        const h = 100 + ((x * 7) % 90);

        if (area.type === "forest") {
            // Forest skyline
            ctx.beginPath();
            ctx.moveTo(x, 460);
            ctx.lineTo(x + 55, 460 - h);
            ctx.lineTo(x + 110, 460);
            ctx.fill();

            ctx.fillRect(x + 47, 460 - h + 40, 16, h);
        } else if (area.type === "bridge") {
            // Broken bridge skyline
            ctx.fillRect(x, 460 - h, 90, h);
            ctx.fillRect(x + 110, 460 - h * 0.65, 130, h * 0.65);

            ctx.fillStyle = area.accent;
            ctx.fillRect(x + 80, 460 - h + 35, 60, 4);
            ctx.fillStyle = area.far;
        } else if (area.type === "temple") {
            // Temple skyline
            ctx.fillRect(x + 20, 300, 55, 160);
            ctx.fillRect(x + 5, 292, 85, 12);
            ctx.fillRect(x + 120, 250, 90, 210);
            ctx.fillRect(x + 110, 240, 110, 13);
        } else if (area.type === "courtyard") {
            // Fortress skyline
            ctx.fillRect(x, 320, 110, 140);
            ctx.fillRect(x + 15, 275, 25, 45);
            ctx.fillRect(x + 70, 275, 25, 45);
            ctx.fillRect(x + 130, 350, 90, 110);
        } else {
            // Gate skyline
            ctx.fillRect(x + 25, 250, 65, 210);
            ctx.fillRect(x + 10, 238, 95, 15);
            ctx.fillRect(x + 120, 300, 90, 160);
        }
    }

    ctx.restore();

    // Stars
    ctx.fillStyle = "rgba(225,220,205,0.65)";

    for (let i = 0; i < 65; i++) {
        const x = ((i * 137 - camera.x * 0.035) % WIDTH + WIDTH) % WIDTH;
        const y = (i * 71) % 235;
        ctx.fillRect(x, y, 2, 2);
    }

    // Region-specific atmospheric tint
    ctx.fillStyle = area.fog;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// ============================================================
// ENVIRONMENT OBJECTS
// ============================================================

function drawEnvironmentObject(obj, time) {
    const { type, x, y, scale } = obj;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (type === "deadTree") {
        ctx.fillStyle = "#292522";
        ctx.fillRect(-7, -110, 14, 110);

        ctx.strokeStyle = "#292522";
        ctx.lineWidth = 8;

        ctx.beginPath();
        ctx.moveTo(0, -65);
        ctx.lineTo(-38, -105);
        ctx.lineTo(-58, -115);
        ctx.moveTo(0, -80);
        ctx.lineTo(35, -125);
        ctx.lineTo(52, -140);
        ctx.moveTo(0, -48);
        ctx.lineTo(-30, -75);
        ctx.stroke();
    }

    else if (type === "mossStone") {
        ctx.fillStyle = "#465348";
        ctx.beginPath();
        ctx.ellipse(0, -8, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#687a5b";
        ctx.fillRect(-12, -17, 15, 4);
    }

    else if (type === "bridgeTower") {
        ctx.fillStyle = "#29252e";
        ctx.fillRect(-28, -180, 56, 180);

        ctx.fillStyle = "#554b51";
        ctx.fillRect(-38, -190, 76, 13);

        ctx.fillStyle = "#211e27";
        ctx.fillRect(-12, -145, 24, 50);
    }

    else if (type === "chain") {
        ctx.strokeStyle = "#777078";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, -250);
        ctx.lineTo(0, 0);
        ctx.stroke();

        for (let i = -220; i < 0; i += 20) {
            ctx.strokeStyle = "#aaa0a0";
            ctx.lineWidth = 2;
            ctx.strokeRect(-5, i, 10, 12);
        }
    }

    else if (type === "templeColumn") {
        ctx.fillStyle = "#526963";
        ctx.fillRect(-22, -175, 44, 175);

        ctx.fillStyle = "#77928a";
        ctx.fillRect(-30, -183, 60, 12);
        ctx.fillRect(-28, -7, 56, 10);

        ctx.fillStyle = "#263c3b";
        ctx.fillRect(-8, -150, 5, 130);
        ctx.fillRect(10, -150, 4, 130);
    }

    else if (type === "waterPool") {
        ctx.fillStyle = "rgba(45,140,145,0.35)";
        ctx.beginPath();
        ctx.ellipse(0, -3, 52, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(125,210,195,0.55)";
        ctx.beginPath();
        ctx.ellipse(0, -3, 35 + Math.sin(time * 0.003 + x) * 4, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    else if (type === "banner") {
        ctx.fillStyle = "#44302e";
        ctx.fillRect(-3, -190, 6, 190);

        ctx.fillStyle = "#8c3e38";
        ctx.beginPath();
        ctx.moveTo(3, -180);
        ctx.lineTo(55, -165);
        ctx.lineTo(45, -95);
        ctx.lineTo(3, -110);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#c18d52";
        ctx.fillRect(15, -155, 5, 28);
    }

    else if (type === "statue") {
        ctx.fillStyle = "#514447";
        ctx.fillRect(-22, -105, 44, 105);

        ctx.fillStyle = "#78645d";
        ctx.fillRect(-18, -125, 36, 25);

        ctx.fillStyle = "#25232a";
        ctx.fillRect(-11, -116, 5, 4);
        ctx.fillRect(6, -116, 5, 4);
    }

    else if (type === "fireBowl") {
        const flame = Math.sin(time * 0.02 + x) * 4;

        ctx.fillStyle = "#554039";
        ctx.fillRect(-16, -28, 32, 28);

        ctx.fillStyle = "#c65a2d";
        ctx.beginPath();
        ctx.moveTo(-10, -28);
        ctx.quadraticCurveTo(-20, -50 - flame, 0, -65);
        ctx.quadraticCurveTo(20, -45, 10, -28);
        ctx.fill();

        ctx.fillStyle = "#f1b45a";
        ctx.beginPath();
        ctx.arc(0, -35, 7 + flame * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    else if (type === "runeStone") {
        ctx.fillStyle = "#554b54";
        ctx.fillRect(-17, -70, 34, 70);

        ctx.strokeStyle = "#d4b45f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -55);
        ctx.lineTo(-7, -40);
        ctx.lineTo(8, -28);
        ctx.lineTo(-4, -12);
        ctx.stroke();
    }

    else if (type === "goldPillar") {
        ctx.fillStyle = "#62513c";
        ctx.fillRect(-20, -160, 40, 160);

        ctx.fillStyle = "#a78a51";
        ctx.fillRect(-28, -170, 56, 12);
        ctx.fillRect(-25, -5, 50, 8);

        ctx.fillStyle = "rgba(222,184,91,0.25)";
        ctx.fillRect(-5, -150, 10, 140);
    }

    ctx.restore();
}

function drawEnvironment(time) {
    for (const obj of environmentObjects) {
        if (
            obj.x > camera.x - 180 &&
            obj.x < camera.x + WIDTH + 180
        ) {
            drawEnvironmentObject(obj, time);
        }
    }

    // Old torches are retained, but now only as supplementary details
    for (const torch of torches) {
        if (
            torch.x > camera.x - 100 &&
            torch.x < camera.x + WIDTH + 100
        ) {
            drawTorch(torch, time);
        }
    }
}

// ============================================================
// AREA-SPECIFIC GROUND
// ============================================================

function drawGround() {
    const startX = Math.floor(camera.x / 1300) * 1300;

    for (const area of AREA_ZONES) {
        if (
            area.end < camera.x ||
            area.start > camera.x + WIDTH
        ) continue;

        const gradient = ctx.createLinearGradient(
            0, ground.y, 0, HEIGHT
        );

        gradient.addColorStop(0, area.groundTop);
        gradient.addColorStop(0.13, area.ground);
        gradient.addColorStop(1, "#17171e");

        ctx.fillStyle = gradient;
        ctx.fillRect(
            area.start,
            ground.y,
            area.end - area.start,
            ground.height
        );

        ctx.fillStyle = area.groundTop;
        ctx.fillRect(area.start, ground.y, area.end - area.start, 5);

        // Different ground markings for each area
        for (let x = area.start + 15; x < area.end; x += 65) {
            if (area.type === "forest") {
                ctx.fillStyle = "#354337";
                ctx.fillRect(x, ground.y + 16, 24, 4);
                ctx.fillRect(x + 15, ground.y + 35, 16, 3);
            }

            else if (area.type === "bridge") {
                ctx.fillStyle = "#211e29";
                ctx.fillRect(x, ground.y + 20, 38, 5);
                ctx.fillRect(x + 20, ground.y + 42, 20, 4);
            }

            else if (area.type === "temple") {
                ctx.fillStyle = "#385653";
                ctx.fillRect(x, ground.y + 18, 35, 3);
                ctx.fillRect(x + 12, ground.y + 38, 20, 3);
            }

            else if (area.type === "courtyard") {
                ctx.strokeStyle = "#60443e";
                ctx.lineWidth = 2;
                ctx.strokeRect(x, ground.y + 15, 32, 24);
            }

            else {
                ctx.fillStyle = "#5c4d3d";
                ctx.fillRect(x, ground.y + 18, 20, 4);
                ctx.fillStyle = "#a78a51";
                ctx.fillRect(x + 8, ground.y + 34, 4, 8);
            }
        }
    }
}

// ============================================================
// FOG
// ============================================================

function updateAndDrawFog() {
    const area = getCurrentArea();

    for (const particle of fogParticles) {
        particle.x -= particle.speed;

        if (particle.x < -particle.size * 2) {
            particle.x = WIDTH + particle.size;
        }

        ctx.fillStyle = area.fog;
        ctx.beginPath();
        ctx.ellipse(
            particle.x,
            particle.y,
            particle.size,
            particle.size * 0.35,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

// ============================================================
// LIGHTING
// ============================================================

function drawEnvironmentalLighting(time) {
    const area = getCurrentArea();

    const light = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    light.addColorStop(0, "rgba(112,119,153,0.025)");
    light.addColorStop(1, "rgba(0,0,0,0.23)");

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Region-specific light colour
    const pulse = 0.018 + Math.sin(time * 0.001) * 0.006;

    ctx.fillStyle = area.type === "temple"
        ? `rgba(65,180,165,${pulse})`
        : area.type === "courtyard"
            ? `rgba(190,75,50,${pulse})`
            : area.type === "gate"
                ? `rgba(210,165,65,${pulse})`
                : `rgba(120,120,150,${pulse})`;

    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}


function drawEnvironmentalLighting(time) {
    const light = ctx.createLinearGradient(0, 0, 0, HEIGHT);

    light.addColorStop(0, "rgba(112,119,153,0.045)");
    light.addColorStop(0.55, "rgba(80,77,105,0.015)");
    light.addColorStop(1, "rgba(0,0,0,0.18)");

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const pulse = 0.018 + Math.sin(time * 0.001) * 0.006;

    ctx.fillStyle = `rgba(170,135,100,${pulse})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// 30. NOTIFICATIONS
function showNotification(message) {
    notification = message;
    notificationTimer = 180;
}

function drawNotification() {
    if (notificationTimer <= 0) return;

    notificationTimer--;

    const alpha = Math.min(
        1,
        notificationTimer / 30,
        (180 - notificationTimer) / 20
    );

    ctx.save();

    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = "center";

    ctx.fillStyle = "rgba(15,12,17,0.78)";
    ctx.fillRect(WIDTH / 2 - 190, 112, 380, 38);

    ctx.fillStyle = "#e4c77e";
    ctx.font = "bold 14px Georgia";
    ctx.fillText(notification, WIDTH / 2, 136);

    ctx.restore();
}

// 31. HUD
function drawPlayerHealth() {
    const x = 24;
    const y = 24;
    const width = 205;
    const height = 22;

    const ratio = Math.max(
        0,
        Math.min(1, player.health / player.maxHealth)
    );

    ctx.fillStyle = "#211c20";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle =
        ratio <= 0.25 ? "#c45a3c" : "#a83b3b";

    ctx.fillRect(
        x + 3,
        y + 3,
        (width - 6) * ratio,
        height - 6
    );

    ctx.save();

    ctx.font = "bold 13px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0e0d10";

    const healthText =
        `${player.health} / ${player.maxHealth}`;

    ctx.strokeText(
        healthText,
        x + width / 2,
        y + height / 2 + 1
    );

    ctx.fillStyle = "#f0e8dc";

    ctx.fillText(
        healthText,
        x + width / 2,
        y + height / 2 + 1
    );

    ctx.restore();

    ctx.fillStyle = "#ded8ce";
    ctx.font = "14px Georgia";
    ctx.textAlign = "left";
    ctx.fillText("HEALTH", x + 3, y + 37);
}

function getAreaName() {
    if (player.x < 1300) return "THE FORGOTTEN RUINS";
    if (player.x < 2600) return "THE BROKEN BRIDGE";
    if (player.x < 3900) return "THE SUNKEN TEMPLE";
    if (player.x < 5200) return "THE HOLLOW COURTYARD";
    return "THE ANCIENT GATE";
}

function drawLevelProgress() {
    const progress = Math.max(
        0,
        Math.min(1, player.x / LEVEL.end)
    );

    const barX = WIDTH - 184;
    const barY = 25;
    const barWidth = 160;

    ctx.fillStyle = "#29252a";
    ctx.fillRect(barX, barY, barWidth, 6);

    ctx.fillStyle = "#b8923f";
    ctx.fillRect(
        barX,
        barY,
        barWidth * progress,
        6
    );

    ctx.fillStyle = "#ded8ce";
    ctx.font = "11px Georgia";
    ctx.textAlign = "right";
    ctx.fillText(
        "THE FORGOTTEN PATH",
        WIDTH - 24,
        18
    );

    ctx.fillStyle = "#d6c9b5";
    ctx.font = "12px Georgia";
    ctx.fillText(
        `SENTINELS: ${enemies.length}`,
        WIDTH - 24,
        49
    );

    ctx.fillStyle = "#d6c9b5";
    ctx.fillText(
        `RELICS: ${relicCount}/${relics.length}`,
        WIDTH - 24,
        65
    );

    ctx.fillStyle = "#b8923f";
    ctx.fillText(
        `${Math.floor(progress * 100)}%`,
        WIDTH - 24,
        81
    );

    ctx.textAlign = "left";

    ctx.save();

    ctx.textAlign = "center";
    ctx.font = "13px Georgia";
    ctx.fillStyle = "rgba(230,216,190,0.8)";

    ctx.fillText(
        getAreaName(),
        WIDTH / 2,
        HEIGHT - 18
    );

    ctx.restore();
}

function drawControlsHint() {
    ctx.save();

    ctx.fillStyle = "rgba(15,13,17,0.55)";
    ctx.fillRect(24, HEIGHT - 55, 340, 30);

    ctx.fillStyle = "#cfc3b0";
    ctx.font = "11px Georgia";

    ctx.fillText(
        "A/D Move | SPACE Jump | SHIFT Run | J Attack | E Enter",
        34,
        HEIGHT - 36
    );

    ctx.restore();
}

// 32. GAME OVER & VICTORY
function drawGameOver() {
    if (!player.gameOver) return;

    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#b8923f";
    ctx.font = "42px Georgia";

    ctx.fillText(
        "THE KNIGHT HAS FALLEN",
        WIDTH / 2,
        HEIGHT / 2 - 25
    );

    ctx.fillStyle = "#ded8ce";
    ctx.font = "18px Georgia";

    ctx.fillText(
        checkpointIndex > 0
            ? "Press R to return to checkpoint"
            : "Press R to try again",
        WIDTH / 2,
        HEIGHT / 2 + 25
    );

    ctx.textAlign = "left";
}

function drawLevelComplete() {
    if (!player.levelComplete) return;

    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#d4ae62";
    ctx.font = "38px Georgia";

    ctx.fillText(
        "THE GATE HAS OPENED",
        WIDTH / 2,
        HEIGHT / 2 - 65
    );

    ctx.fillStyle = "#eee4d1";
    ctx.font = "25px Georgia";

    ctx.fillText(
        "LEVEL 1 COMPLETE",
        WIDTH / 2,
        HEIGHT / 2 - 10
    );

    ctx.fillStyle = "#bdb1a0";
    ctx.font = "16px Georgia";

    ctx.fillText(
        `Ancient Relics Collected: ${relicCount}/${relics.length}`,
        WIDTH / 2,
        HEIGHT / 2 + 30
    );

    ctx.fillText(
        "The Forgotten Ruins have fallen silent.",
        WIDTH / 2,
        HEIGHT / 2 + 58
    );

    ctx.fillText(
        "Press R to replay Level 1",
        WIDTH / 2,
        HEIGHT / 2 + 95
    );

    ctx.textAlign = "left";
}

// 33. FULL LEVEL RESTART
function restartGame() {
    player.x = 100;
    player.y = ground.y - player.height;

    player.velocityX = 0;
    player.velocityY = 0;

    player.health = player.maxHealth;
    player.grounded = true;
    player.facing = 1;

    player.gameOver = false;
    player.levelComplete = false;
    player.isAttacking = false;
    player.attackCooldown = 0;
    player.hitEnemies = [];
    player.damageCooldown = 0;
    player.damageAnimationTimer = 0;
    player.standingPlatform = null;
    player.checkpointX = 100;

    setAnimation(playerAnimation, "idle");

    camera.x = 0;
    camera.targetX = 0;

    relicCount = 0;
    checkpointIndex = 0;

    notification = "";
    notificationTimer = 0;

    for (const relic of relics) {
        relic.collected = false;
    }

    for (const cp of checkpoints) {
        cp.active = false;
        cp.reached = false;
    }

    enemies.length = 0;

    for (let i = 0; i < enemyPositions.length; i++) {
        const x = enemyPositions[i];
        const late = i >= 10;

        enemies.push(createEnemy(x, {
            health: late ? 4 : 3,
            speed: late ? 1.55 : 1.35,
            damage: late ? 18 : 15,
            patrol: late ? 230 : 190
        }));
    }

    enemies.push(createEnemy(2450, {
        boss: true,
        name: "THE RUIN WARDEN",
        health: 12,
        speed: 1.05,
        damage: 24,
        detectionRange: 520,
        attackRange: 75,
        patrol: 140
    }));

    enemies.push(createEnemy(5100, {
        boss: true,
        name: "THE SUNKEN SENTINEL",
        health: 16,
        speed: 1.15,
        damage: 27,
        detectionRange: 560,
        attackRange: 82,
        patrol: 150
    }));

    for (const p of movingPlatforms) {
        p.x = p.startX;
        p.direction = 1;
        p.oldX = p.x;
        p.oldY = p.y;
    }

    for (const rock of fallingRocks) {
        resetRock(rock);
    }

    ancientGate.open = false;
    ancientGate.opening = 0;

    for (const key in keys) {
        keys[key] = false;
    }
}

// ============================================================
// MISSING DRAWING SYSTEMS — ADD BEFORE MAIN GAME LOOP
// ============================================================

// 1. TORCHES
const torches = [];

for (let x = 250; x < WORLD_WIDTH; x += 420) {
    torches.push({
        x,
        y: ground.y - 12,
        flicker: Math.random() * Math.PI * 2
    });
}

function drawTorch(torch, time) {
    const flicker = Math.sin(time * 0.015 + torch.flicker) * 3;

    // Torch holder
    ctx.fillStyle = "#40332d";
    ctx.fillRect(torch.x - 4, torch.y - 35, 8, 35);

    ctx.fillStyle = "#806044";
    ctx.fillRect(torch.x - 8, torch.y - 37, 16, 5);

    // Flame
    ctx.fillStyle = "#c45c2e";
    ctx.beginPath();
    ctx.moveTo(torch.x - 7, torch.y - 38);
    ctx.quadraticCurveTo(
        torch.x - 15, torch.y - 53 - flicker,
        torch.x, torch.y - 65 - flicker
    );
    ctx.quadraticCurveTo(
        torch.x + 15, torch.y - 51 + flicker,
        torch.x + 7, torch.y - 38
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f4bd65";
    ctx.beginPath();
    ctx.ellipse(
        torch.x,
        torch.y - 43 - flicker * 0.4,
        4,
        9 + flicker * 0.2,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Local glow
    const glow = ctx.createRadialGradient(
        torch.x, torch.y - 48, 2,
        torch.x, torch.y - 48, 65
    );

    glow.addColorStop(0, "rgba(240,150,65,0.18)");
    glow.addColorStop(1, "rgba(240,150,65,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(torch.x - 65, torch.y - 113, 130, 130);
}

// 2. FOG PARTICLES
const fogParticles = Array.from({ length: 18 }, () => ({
    x: Math.random() * WIDTH,
    y: 260 + Math.random() * 220,
    size: 25 + Math.random() * 45,
    speed: 0.15 + Math.random() * 0.35
}));

// 3. PLATFORMS
function drawPlatforms() {
    for (const platform of [...platforms, ...movingPlatforms]) {
        const moving = movingPlatforms.includes(platform);

        ctx.fillStyle = moving ? "#55505a" : "#403b42";
        ctx.fillRect(
            platform.x,
            platform.y,
            platform.width,
            platform.height
        );

        // Top stone surface
        ctx.fillStyle = moving ? "#aaa0a0" : "#827779";
        ctx.fillRect(
            platform.x,
            platform.y,
            platform.width,
            4
        );

        // Cracks / stone details
        ctx.fillStyle = "rgba(15,13,18,0.45)";
        ctx.fillRect(
            platform.x + platform.width * 0.35,
            platform.y + 6,
            2,
            5
        );

        ctx.fillRect(
            platform.x + platform.width * 0.72,
            platform.y + 5,
            2,
            6
        );

        if (moving) {
            ctx.strokeStyle = "rgba(205,185,145,0.35)";
            ctx.lineWidth = 1;
            ctx.strokeRect(
                platform.x,
                platform.y,
                platform.width,
                platform.height
            );
        }
    }
}

// 4. PLAYER DRAWING
function drawPlayer() {
    const config =
        PLAYER_ANIMATIONS[playerAnimation.current] ||
        PLAYER_ANIMATIONS.idle;

    const frame = Math.min(
        playerAnimation.frame,
        config.frames - 1
    );

    ctx.save();

    ctx.translate(
        player.x + player.width / 2,
        player.y + player.height
    );

    ctx.scale(player.facing, 1);

    if (
        knightSprite.complete &&
        knightSprite.naturalWidth >= FRAME_WIDTH &&
        knightSprite.naturalHeight >= FRAME_HEIGHT
    ) {
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
            knightSprite,
            frame * FRAME_WIDTH,
            config.row * FRAME_HEIGHT,
            FRAME_WIDTH,
            FRAME_HEIGHT,
            -FRAME_WIDTH * SPRITE_SCALE / 2,
            -FRAME_HEIGHT * SPRITE_SCALE,
            FRAME_WIDTH * SPRITE_SCALE,
            FRAME_HEIGHT * SPRITE_SCALE
        );
    } else {
        // Temporary fallback if the spritesheet has not loaded
        ctx.fillStyle = "#77717b";
        ctx.fillRect(-14, -58, 28, 52);

        ctx.fillStyle = "#aaa0a0";
        ctx.fillRect(-11, -70, 22, 18);

        ctx.fillStyle = "#29232b";
        ctx.fillRect(-9, -66, 18, 7);
    }

    ctx.restore();
}

// 5. ENEMY DRAWING
function drawEnemy(enemy) {
    const state =
        enemy.state === "death" ? "death" :
        enemy.state === "damage" ? "damage" :
        enemy.state === "attack" ? "attack" :
        enemy.state === "walk" ? "walk" : "idle";

    const config = ENEMY_ANIMATIONS[state];

    const frame = Math.min(
        enemy.animation.frame,
        config.frames - 1
    );

    const scale = enemy.spriteScale || SPRITE_SCALE;

    ctx.save();

    ctx.translate(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height
    );

    ctx.scale(enemy.facing, 1);

    if (
        sentinelSprite.complete &&
        sentinelSprite.naturalWidth >= FRAME_WIDTH &&
        sentinelSprite.naturalHeight >= FRAME_HEIGHT
    ) {
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
            sentinelSprite,
            frame * FRAME_WIDTH,
            config.row * FRAME_HEIGHT,
            FRAME_WIDTH,
            FRAME_HEIGHT,
            -FRAME_WIDTH * scale / 2,
            -FRAME_HEIGHT * scale,
            FRAME_WIDTH * scale,
            FRAME_HEIGHT * scale
        );
    } else {
        // Temporary fallback
        ctx.fillStyle = enemy.boss ? "#70434b" : "#514b59";
        ctx.fillRect(
            -enemy.width / 2,
            -enemy.height,
            enemy.width,
            enemy.height
        );

        ctx.fillStyle = "#c18a55";
        ctx.fillRect(-8, -enemy.height + 15, 5, 4);
        ctx.fillRect(3, -enemy.height + 15, 5, 4);
    }

    ctx.restore();

    // Boss health bar
    if (enemy.boss && enemy.state !== "death") {
        const barWidth = 75;
        const ratio = Math.max(0, enemy.health / enemy.maxHealth);

        ctx.fillStyle = "#21191e";
        ctx.fillRect(
            enemy.x + enemy.width / 2 - barWidth / 2,
            enemy.y - 15,
            barWidth,
            6
        );

        ctx.fillStyle = "#b64b45";
        ctx.fillRect(
            enemy.x + enemy.width / 2 - barWidth / 2,
            enemy.y - 15,
            barWidth * ratio,
            6
        );
    }
}

// 6. BOSS HUD
function drawBossHUD() {
    const boss = enemies.find(
        enemy => enemy.boss &&
        enemy.state !== "death" &&
        enemy.state !== "dead" &&
        Math.abs(enemy.x - player.x) < 650
    );

    if (!boss) return;

    const barWidth = 280;
    const x = (WIDTH - barWidth) / 2;
    const y = 75;

    const ratio = Math.max(
        0,
        boss.health / boss.maxHealth
    );

    ctx.save();

    ctx.textAlign = "center";
    ctx.font = "bold 13px Georgia";
    ctx.fillStyle = "#e2c99b";
    ctx.fillText(boss.name, WIDTH / 2, y - 9);

    ctx.fillStyle = "#241b22";
    ctx.fillRect(x, y, barWidth, 10);

    ctx.fillStyle = "#a63e43";
    ctx.fillRect(x + 2, y + 2, (barWidth - 4) * ratio, 6);

    ctx.strokeStyle = "#92745c";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, 10);

    ctx.restore();
}

// ============================================================
// PHASE 3 — GOTHIC COLLECTIBLES, POWER-UPS & SECRET BLOCKS
// ============================================================

// 1. PLAYER POWER-UP STATE
const powerUps = {
    shield: 0,
    big: 0,
    sword: 0,
    magnet: 0
};

let gothicCoinCount = 0;

const POWERUP_DURATION = 60 * 10;

// 2. GOTHIC COINS
const gothicCoins = [];

function addCoin(x, y, type = "gold") {
    const values = {
        tarnished: 1,
        silver: 5,
        gold: 10,
        cursed: 25
    };

    gothicCoins.push({
        x,
        y,
        type,
        value: values[type] || 1,
        collected: false,
        phase: Math.random() * Math.PI * 2,
        magnetized: false
    });
}

// Coin placements across all five areas
for (let x = 290; x < WORLD_WIDTH - 100; x += 145) {
    const y = 340 + Math.sin(x * 0.013) * 55;
    addCoin(x, y, "tarnished");
}

[
    [580, 300, "silver"],
    [1120, 255, "gold"],
    [1650, 315, "silver"],
    [2050, 260, "cursed"],
    [2370, 270, "gold"],
    [2850, 250, "silver"],
    [3450, 275, "gold"],
    [3800, 230, "cursed"],
    [4140, 285, "silver"],
    [4700, 280, "gold"],
    [5000, 230, "cursed"],
    [5350, 260, "silver"],
    [5800, 240, "gold"],
    [6150, 270, "cursed"]
].forEach(([x, y, type]) => addCoin(x, y, type));

function drawGothicCoins() {
    for (const coin of gothicCoins) {
        if (coin.collected) continue;

        const bob = Math.sin(gameTime * 0.004 + coin.phase) * 4;

        const colors = {
            tarnished: "#88775b",
            silver: "#b8c3c6",
            gold: "#e2b94e",
            cursed: "#a66bd1"
        };

        const color = colors[coin.type];

        const glow = ctx.createRadialGradient(
            coin.x, coin.y + bob, 1,
            coin.x, coin.y + bob, 24
        );

        glow.addColorStop(0, coin.type === "cursed"
            ? "rgba(160,90,220,0.35)"
            : "rgba(218,180,85,0.28)");
        glow.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y + bob, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(coin.x, coin.y + bob);
        ctx.rotate(Math.sin(gameTime * 0.002 + coin.phase) * 0.12);

        ctx.fillStyle = color;
        ctx.strokeStyle = "#342b2b";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#f0d99a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#352a2b";
        ctx.font = "bold 10px Georgia";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(coin.type === "cursed" ? "✦" : "✧", 0, 1);

        ctx.restore();
    }
}

// 3. POTIONS AND POWER-UP PICKUPS
const pickups = [];

function createPickup(x, y, type) {
    pickups.push({
        x,
        y,
        type,
        collected: false,
        phase: Math.random() * Math.PI * 2
    });
}

// Fixed level placements
createPickup(750, 350, "health");
createPickup(1550, 300, "shield");
createPickup(2250, 270, "magnet");
createPickup(2900, 260, "big");
createPickup(3650, 220, "sword");
createPickup(4450, 300, "greater");
createPickup(5200, 230, "heart");
createPickup(6000, 245, "shield");

const pickupInfo = {
    health: {
        name: "CRIMSON POTION",
        color: "#c94c4c",
        symbol: "+"
    },
    greater: {
        name: "GREATER ELIXIR",
        color: "#e3b95c",
        symbol: "✦"
    },
    shield: {
        name: "SHADOW SHIELD",
        color: "#65a9d1",
        symbol: "◇"
    },
    big: {
        name: "TITAN'S BLESSING",
        color: "#b77bd5",
        symbol: "⬆"
    },
    sword: {
        name: "GREAT SWORD",
        color: "#e0d4a4",
        symbol: "⚔"
    },
    heart: {
        name: "HEART OF THE FALLEN",
        color: "#d75a6a",
        symbol: "♥"
    },
    magnet: {
        name: "SOUL MAGNET",
        color: "#a67ce0",
        symbol: "U"
    }
};

function collectPickup(pickup) {
    if (pickup.collected) return;

    pickup.collected = true;

    switch (pickup.type) {
        case "health":
            player.health = Math.min(
                player.maxHealth,
                player.health + 30
            );
            showNotification("CRIMSON POTION: +30 HEALTH");
            break;

        case "greater":
            player.health = player.maxHealth;
            showNotification("GREATER ELIXIR: HEALTH RESTORED");
            break;

        case "heart":
            player.health = Math.min(
                player.maxHealth,
                player.health + 50
            );
            showNotification("HEART OF THE FALLEN: +50 HEALTH");
            break;

        case "shield":
            powerUps.shield = POWERUP_DURATION;
            showNotification("SHADOW SHIELD ACTIVATED");
            break;

        case "big":
            powerUps.big = POWERUP_DURATION;
            showNotification("TITAN'S BLESSING ACTIVATED");
            break;

        case "sword":
            powerUps.sword = POWERUP_DURATION;
            showNotification("GREAT SWORD ACTIVATED");
            break;

        case "magnet":
            powerUps.magnet = POWERUP_DURATION;
            showNotification("SOUL MAGNET ACTIVATED");
            break;
    }
}

function updatePickups() {
    for (const pickup of pickups) {
        if (pickup.collected) continue;

        const dx = player.x + player.width / 2 - pickup.x;
        const dy = player.y + player.height / 2 - pickup.y;

        if (Math.hypot(dx, dy) < 39) {
            collectPickup(pickup);
        }
    }
}

function drawPickups() {
    for (const pickup of pickups) {
        if (pickup.collected) continue;

        const info = pickupInfo[pickup.type];
        const bob = Math.sin(gameTime * 0.004 + pickup.phase) * 5;

        const glow = ctx.createRadialGradient(
            pickup.x, pickup.y + bob, 2,
            pickup.x, pickup.y + bob, 35
        );

        glow.addColorStop(0, info.color + "66");
        glow.addColorStop(1, info.color + "00");

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y + bob, 35, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(pickup.x, pickup.y + bob);

        ctx.fillStyle = "#27212d";
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(12, -7);
        ctx.lineTo(10, 10);
        ctx.lineTo(0, 17);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-12, -7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = info.color;
        ctx.font = "bold 15px Georgia";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(info.symbol, 0, 1);

        ctx.restore();
    }
}

// 4. HIDDEN RUNE BLOCKS
const secretBlocks = [
    { x: 390, y: 275, type: "hidden", reward: "coin", used: false, revealed: false },
    { x: 930, y: 235, type: "rune", reward: "health", used: false, revealed: true },
    { x: 1510, y: 235, type: "hidden", reward: "shield", used: false, revealed: false },
    { x: 2040, y: 205, type: "cursed", reward: "curse", used: false, revealed: true },
    { x: 2800, y: 215, type: "rune", reward: "coin", used: false, revealed: true },
    { x: 3380, y: 220, type: "hidden", reward: "big", used: false, revealed: false },
    { x: 4020, y: 245, type: "cursed", reward: "curse", used: false, revealed: true },
    { x: 4630, y: 230, type: "rune", reward: "sword", used: false, revealed: true },
    { x: 5300, y: 190, type: "hidden", reward: "magnet", used: false, revealed: false },
    { x: 5900, y: 210, type: "rune", reward: "greater", used: false, revealed: true }
];

function activateSecretBlock(block) {
    if (block.used) return;

    block.used = true;
    block.revealed = true;

    // Block reward
    if (block.reward === "coin") {
        addCoin(block.x, block.y - 42, "gold");
        showNotification("SECRET BLOCK: ANCIENT COIN");
    } else if (block.reward === "curse") {
        showNotification("CURSED BLOCK: A DARK OMEN");
        damagePlayer(15);
    } else {
        createPickup(block.x, block.y - 45, block.reward);
        showNotification("RUNE BLOCK ACTIVATED");
    }
}

function updateSecretBlocks() {
    for (const block of secretBlocks) {
        if (block.used) continue;

        const horizontal =
            player.x + player.width > block.x &&
            player.x < block.x + 42;

        // Hidden blocks reveal when the knight approaches beneath them.
        if (
            block.type === "hidden" &&
            !block.revealed &&
            horizontal &&
            Math.abs(player.y + player.height - (block.y + 42)) < 55
        ) {
            block.revealed = true;
        }

        // Hit from below while jumping.
        const headHit =
            horizontal &&
            player.velocityY < 0 &&
            player.y <= block.y + 42 &&
            player.y + player.height > block.y + 32;

        // Hit using the sword.
        const swordHit =
            player.isAttacking &&
            playerAnimation.current === "attack" &&
            playerAnimation.frame >= 2 &&
            playerAnimation.frame <= 4 &&
            player.x + player.width > block.x - 45 &&
            player.x < block.x + 87 &&
            player.y < block.y + 48 &&
            player.y + player.height > block.y;

        if (headHit || swordHit) {
            activateSecretBlock(block);
        }
    }
}

function drawSecretBlocks() {
    for (const block of secretBlocks) {
        if (!block.revealed) continue;

        const x = block.x;
        const y = block.y;

        ctx.fillStyle = block.used ? "#302c32" : "#51434c";
        ctx.fillRect(x, y, 42, 42);

        ctx.strokeStyle = block.type === "cursed"
            ? "#9a5ab7"
            : "#c7a65c";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 42, 42);

        ctx.fillStyle = block.used ? "#766c69" : "#e0c37d";
        ctx.font = "bold 21px Georgia";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            block.used ? "·" :
            block.type === "cursed" ? "!" : "✦",
            x + 21,
            y + 21
        );
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

// 5. POWER-UP TIMERS
function updatePowerUps() {
    for (const key of Object.keys(powerUps)) {
        if (powerUps[key] > 0) {
            powerUps[key]--;
        }
    }
}

function resetPowerUps() {
    for (const key of Object.keys(powerUps)) {
        powerUps[key] = 0;
    }
}

// 6. MAGNET AND COIN COLLECTION
function updateGothicCoins() {
    for (const coin of gothicCoins) {
        if (coin.collected) continue;

        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        const dx = playerCenterX - coin.x;
        const dy = playerCenterY - coin.y;
        const distance = Math.hypot(dx, dy);

        if (powerUps.magnet > 0 && distance < 230) {
            const pull = Math.max(2, 8 - distance * 0.02);
            coin.x += (dx / Math.max(distance, 1)) * pull;
            coin.y += (dy / Math.max(distance, 1)) * pull;
            coin.magnetized = true;
        }

        if (distance < 29) {
            coin.collected = true;
            gothicCoinCount += coin.value;

            showNotification(
                `+${coin.value} ${coin.type.toUpperCase()} SOUL COIN`
            );
        }
    }
}

// 7. POWER-UP VISUAL EFFECTS
const originalDrawPlayer = drawPlayer;

drawPlayer = function () {
    if (powerUps.big > 0) {
        const anchorX = player.x + player.width / 2;
        const anchorY = player.y + player.height;

        ctx.save();
        ctx.translate(anchorX, anchorY);
        ctx.scale(1.35, 1.35);
        ctx.translate(-anchorX, -anchorY);

        originalDrawPlayer();

        ctx.restore();
    } else {
        originalDrawPlayer();
    }

    if (powerUps.shield > 0) {
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;

        ctx.save();
        ctx.strokeStyle = `rgba(100,180,230,${0.45 + Math.sin(gameTime * 0.012) * 0.2})`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.ellipse(cx, cy, 29, 38, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
};

// 8. ENHANCED SWORD HIT DETECTION
function checkSwordHit() {
    if (
        !player.isAttacking ||
        playerAnimation.current !== "attack"
    ) return;

    const frame = playerAnimation.frame;
    if (frame < 2 || frame > 4) return;

    const reach = powerUps.sword > 0 ? 85 :
        powerUps.big > 0 ? 65 : 48;

    const attackBox = {
        x: player.facing === 1
            ? player.x + player.width - 2
            : player.x - reach + 2,
        y: player.y + 5,
        width: reach,
        height: player.height - 10
    };

    for (const enemy of enemies) {
        if (
            enemy.state === "death" ||
            enemy.state === "dead" ||
            player.hitEnemies.includes(enemy)
        ) continue;

        const hit =
            attackBox.x < enemy.x + enemy.width &&
            attackBox.x + attackBox.width > enemy.x &&
            attackBox.y < enemy.y + enemy.height &&
            attackBox.y + attackBox.height > enemy.y;

        if (hit) {
            damageEnemy(enemy);
            player.hitEnemies.push(enemy);
        }
    }
}

// 9. ENHANCED ENEMY DAMAGE
function damageEnemy(enemy) {
    if (
        enemy.state === "death" ||
        enemy.state === "dead"
    ) return;

    const damage = powerUps.sword > 0 ? 3 : 1;
    enemy.health -= damage;

    if (enemy.health <= 0) {
        enemy.health = 0;
        enemy.state = "death";
        setAnimation(enemy.animation, "death");

        if (enemy.boss) {
            showNotification(enemy.name + " DEFEATED");
        }
    } else {
        setEnemyState(enemy, "damage");
    }
}

// 10. SHIELD PROTECTION
const originalDamagePlayer = damagePlayer;

damagePlayer = function (amount) {
    if (powerUps.shield > 0) {
        showNotification("SHADOW SHIELD BLOCKED THE ATTACK");
        return;
    }

    originalDamagePlayer(amount);
};

// 11. POWER-UP STATUS HUD
function drawPowerUpHUD() {
    const active = Object.keys(powerUps).filter(
        key => powerUps[key] > 0
    );

    if (active.length === 0) return;

    const labels = {
        shield: "SHIELD",
        big: "TITAN",
        sword: "GREAT SWORD",
        magnet: "MAGNET"
    };

    ctx.save();
    ctx.textAlign = "left";
    ctx.font = "11px Georgia";

    active.forEach((key, index) => {
        const seconds = Math.ceil(powerUps[key] / 60);
        const y = 91 + index * 21;

        ctx.fillStyle = "rgba(20,16,25,0.8)";
        ctx.fillRect(24, y, 145, 17);

        ctx.fillStyle = "#e1c47a";
        ctx.fillText(
            `${labels[key]}  ${seconds}s`,
            31,
            y + 12
        );
    });

    ctx.restore();
}

// 12. COIN HUD
function drawCoinHUD() {
    ctx.save();

    ctx.fillStyle = "rgba(20,16,25,0.75)";
    ctx.fillRect(24, 66, 150, 25);

    ctx.fillStyle = "#e2bd62";
    ctx.font = "bold 14px Georgia";
    ctx.textAlign = "left";
    ctx.fillText(`✦ SOUL COINS: ${gothicCoinCount}`, 32, 83);

    ctx.restore();
}

// 13. PRESERVE COINS ON DEATH, RESET ON FULL RESTART
const originalRespawnAtCheckpoint = respawnAtCheckpoint;

respawnAtCheckpoint = function () {
    originalRespawnAtCheckpoint();
    resetPowerUps();
};

const originalRestartGame = restartGame;

restartGame = function () {
    originalRestartGame();

    gothicCoinCount = 0;
    resetPowerUps();

    for (const coin of gothicCoins) {
        coin.collected = false;
        coin.magnetized = false;
    }

    for (const block of secretBlocks) {
        block.used = false;
        block.revealed = block.type !== "hidden";
    }

    pickups.length = 0;

    createPickup(750, 350, "health");
    createPickup(1550, 300, "shield");
    createPickup(2250, 270, "magnet");
    createPickup(2900, 260, "big");
    createPickup(3650, 220, "sword");
    createPickup(4450, 300, "greater");
    createPickup(5200, 230, "heart");
    createPickup(6000, 245, "shield");
};

// ============================================================
// END PHASE 3 SYSTEMS
// ============================================================

// ============================================================
// THE HOLLOW CROWN — WORLD II + FINAL ENDING EXPANSION
// Insert this block BEFORE: // 34. MAIN GAME LOOP
// ============================================================

// WORLD EXPANSION
const WORLD_TWO = {
    start: 6600,
    end: 12600,
    bossX: 11550,
    gateX: 12350,
    finalStart: 12700,
    throneX: 13500
};

LEVEL.end = 13900;
ground.width = LEVEL.end;

// Add World II and the final throne room to the existing biome system.
AREA_ZONES.push(
    {
        start: 6500, end: 7900,
        name: "THE ASHEN DESCENT",
        skyTop: "#170d12", skyBottom: "#54251c",
        ground: "#292020", groundTop: "#9b4930",
        far: "#291719", near: "#1a1115",
        accent: "#ed7840", fog: "rgba(220,75,35,0.12)",
        type: "volcanic"
    },
    {
        start: 7900, end: 9500,
        name: "THE EMBER WASTES",
        skyTop: "#160b10", skyBottom: "#482018",
        ground: "#302020", groundTop: "#b4512e",
        far: "#291517", near: "#1d1013",
        accent: "#f08a45", fog: "rgba(220,75,35,0.13)",
        type: "volcanic"
    },
    {
        start: 9500, end: 11100,
        name: "THE SUNDERED CALDERA",
        skyTop: "#100b12", skyBottom: "#38202a",
        ground: "#292027", groundTop: "#8e493c",
        far: "#21151e", near: "#160f17",
        accent: "#d86a45", fog: "rgba(180,65,45,0.12)",
        type: "volcanic"
    },
    {
        start: 11100, end: 12650,
        name: "THE SOVEREIGN'S DOMAIN",
        skyTop: "#100d16", skyBottom: "#30202c",
        ground: "#29232d", groundTop: "#a16b50",
        far: "#211a29", near: "#17121e",
        accent: "#d6a45c", fog: "rgba(160,100,80,0.10)",
        type: "volcanic"
    },
    {
        start: 12650, end: 13900,
        name: "THE HOLLOW THRONE",
        skyTop: "#090912", skyBottom: "#211b2b",
        ground: "#211d29", groundTop: "#9a8053",
        far: "#171522", near: "#100e19",
        accent: "#d7bd83", fog: "rgba(150,130,180,0.08)",
        type: "throne"
    }
);

const worldTwoState = {
    phase: 1,
    tick: 0,
    bossDefeated: false,
    secondGateOpen: false,
    endingStarted: false
};

// World II platforms
const worldTwoPlatforms = [
    { x: 6800, y: 365, width: 180, height: 14 },
    { x: 7130, y: 300, width: 170, height: 14 },
    { x: 7550, y: 350, width: 190, height: 14 },
    { x: 7970, y: 285, width: 180, height: 14 },
    { x: 8320, y: 355, width: 190, height: 14 },
    { x: 8710, y: 295, width: 190, height: 14 },
    { x: 9140, y: 345, width: 190, height: 14 },
    { x: 9530, y: 280, width: 200, height: 14 },
    { x: 9930, y: 350, width: 190, height: 14 },
    { x: 10350, y: 290, width: 190, height: 14 },
    { x: 10750, y: 350, width: 190, height: 14 },
    { x: 11200, y: 330, width: 200, height: 14 },
    { x: 11900, y: 350, width: 180, height: 14 }
];

platforms.push(...worldTwoPlatforms);

// World II moving platforms
const worldTwoMovingPlatforms = [
    { x: 7400, y: 390, width: 125, height: 14, startX: 7380, endX: 7500, speed: 1.2, direction: 1 },
    { x: 8650, y: 375, width: 125, height: 14, startX: 8620, endX: 8750, speed: 1.3, direction: -1 },
    { x: 10150, y: 380, width: 130, height: 14, startX: 10100, endX: 10250, speed: 1.4, direction: 1 },
    { x: 11000, y: 385, width: 130, height: 14, startX: 10950, endX: 11100, speed: 1.25, direction: -1 }
];

for (const p of worldTwoMovingPlatforms) {
    p.oldX = p.x;
    p.oldY = p.y;
}

movingPlatforms.push(...worldTwoMovingPlatforms);

// Lava pools — jump over these areas.
const worldTwoLava = [
    { x: 7000, width: 100 },
    { x: 7700, width: 125 },
    { x: 8440, width: 110 },
    { x: 9250, width: 135 },
    { x: 9780, width: 115 },
    { x: 10550, width: 130 },
    { x: 11200, width: 100 },
    { x: 12000, width: 125 }
];

function updateWorldTwoLava() {
    if (worldTwoState.phase !== 2) return;

    for (const lava of worldTwoLava) {
        const overlap =
            player.x + player.width > lava.x + 8 &&
            player.x < lava.x + lava.width - 8;

        if (overlap && player.y + player.height >= ground.y - 5) {
            if (worldTwoState.tick % 55 === 0) {
                damagePlayer(18);
            }
        }
    }
}

function drawWorldTwoLava() {
    for (const lava of worldTwoLava) {
        const x = lava.x;
        const y = ground.y - 5;
        const w = lava.width;

        ctx.fillStyle = "#451b18";
        ctx.fillRect(x, y, w, 18);

        const gradient = ctx.createLinearGradient(x, y, x, y + 28);
        gradient.addColorStop(0, "#ff9a42");
        gradient.addColorStop(0.45, "#d84b24");
        gradient.addColorStop(1, "#651c1b");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y + 3, w, 23);

        ctx.fillStyle = "rgba(255,190,90,0.75)";
        for (let i = 0; i < 5; i++) {
            const bubbleX = x + ((i * 29 + worldTwoState.tick * 0.7) % w);
            const bubbleY = y + 8 + Math.sin(worldTwoState.tick * 0.08 + i) * 5;
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, 2 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Hanging chains and swinging iron weights.
const swingingChains = [
    { x: 7300, length: 115, radius: 18, speed: 0.035, phase: 0 },
    { x: 8200, length: 145, radius: 21, speed: 0.028, phase: 2 },
    { x: 9000, length: 125, radius: 19, speed: 0.032, phase: 4 },
    { x: 9850, length: 155, radius: 22, speed: 0.025, phase: 1 },
    { x: 10800, length: 135, radius: 20, speed: 0.03, phase: 3 }
];

function getSwingPosition(chain) {
    const angle = Math.sin(worldTwoState.tick * chain.speed + chain.phase) * 0.65;
    return {
        x: chain.x + Math.sin(angle) * chain.length,
        y: 100 + Math.cos(angle) * chain.length
    };
}

function updateSwingingChains() {
    if (worldTwoState.phase !== 2) return;

    for (const chain of swingingChains) {
        const end = getSwingPosition(chain);

        const hit =
            player.x + player.width > end.x - chain.radius &&
            player.x < end.x + chain.radius &&
            player.y + player.height > end.y - chain.radius &&
            player.y < end.y + chain.radius;

        if (hit && worldTwoState.tick % 55 === 0) {
            damagePlayer(14);
        }
    }
}

function drawSwingingChains() {
    for (const chain of swingingChains) {
        const end = getSwingPosition(chain);

        ctx.save();
        ctx.strokeStyle = "#55434a";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(chain.x, 0);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.strokeStyle = "#a28a75";
        ctx.lineWidth = 2;
        for (let i = 1; i <= 5; i++) {
            const t = i / 6;
            const px = chain.x + (end.x - chain.x) * t;
            const py = end.y * t;
            ctx.beginPath();
            ctx.moveTo(px - 5, py);
            ctx.lineTo(px + 5, py);
            ctx.stroke();
        }

        ctx.fillStyle = "#30262d";
        ctx.beginPath();
        ctx.arc(end.x, end.y, chain.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b47a4c";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}

// Additional World II enemies.
function spawnWorldTwoEnemies() {
    enemies.length = 0;

    const enemyData = [
        { x: 7000, name: "ASHEN STALKER", health: 5, speed: 1.8, damage: 18, patrol: 150 },
        { x: 7600, name: "EMBER WRAITH", health: 5, speed: 1.5, damage: 17, patrol: 180 },
        { x: 8200, name: "ABYSSAL BRUTE", health: 9, speed: 0.9, damage: 25, patrol: 130 },
        { x: 8900, name: "ASHEN STALKER", health: 6, speed: 2, damage: 20, patrol: 170 },
        { x: 9500, name: "EMBER WRAITH", health: 6, speed: 1.7, damage: 19, patrol: 180 },
        { x: 10100, name: "ABYSSAL BRUTE", health: 10, speed: 1, damage: 27, patrol: 150 },
        { x: 10800, name: "ASHEN STALKER", health: 7, speed: 2.1, damage: 21, patrol: 180 }
    ];

    for (const data of enemyData) {
        const enemy = createEnemy(data.x, {
            name: data.name,
            health: data.health,
            speed: data.speed,
            damage: data.damage,
            detectionRange: 480,
            attackRange: 65,
            patrol: data.patrol
        });

        enemy.patrolStart = data.x - data.patrol;
        enemy.patrolEnd = data.x + data.patrol;
        enemy.worldTwoEnemy = true;
        enemies.push(enemy);
    }

    // The Ashen Sovereign — final boss of World II.
    const boss = createEnemy(WORLD_TWO.bossX, {
        boss: true,
        name: "THE ASHEN SOVEREIGN",
        health: 70,
        speed: 0.85,
        damage: 30,
        detectionRange: 900,
        attackRange: 155,
        patrol: 260
    });

    boss.width = 138;
    boss.height = 178;
    boss.y = ground.y - boss.height;
    boss.patrolStart = WORLD_TWO.bossX - 260;
    boss.patrolEnd = WORLD_TWO.bossX + 260;
    boss.speed = 0.85;
    boss.ashenBoss = true;
    boss.phase = 1;
    boss.attackCooldown = 80;

    enemies.push(boss);
    showNotification("THE ASHEN SOVEREIGN AWAKENS");
}

// Preserve the existing enemy damage system and add boss phases.
const worldTwoBaseDamageEnemy = damageEnemy;

damageEnemy = function (enemy) {
    worldTwoBaseDamageEnemy(enemy);

    if (!enemy.ashenBoss) return;

    if (enemy.health <= 0) {
        worldTwoState.bossDefeated = true;
        showNotification("THE ASHEN SOVEREIGN HAS FALLEN");
        return;
    }

    const ratio = enemy.health / enemy.maxHealth;

    if (ratio <= 0.35 && enemy.phase !== 3) {
        enemy.phase = 3;
        enemy.speed = 1.45;
        enemy.damage = 38;
        enemy.attackCooldown = 55;
        showNotification("THE SOVEREIGN ENTERS ITS FINAL PHASE");
    } else if (ratio <= 0.7 && enemy.phase === 1) {
        enemy.phase = 2;
        enemy.speed = 1.1;
        enemy.damage = 34;
        enemy.attackCooldown = 70;
        showNotification("THE SOVEREIGN'S ARMOUR BREAKS");
    }
};

// Draw the colossal boss without requiring a new sprite file.
// A dedicated boss spritesheet can replace this renderer later.
const worldTwoBaseDrawEnemy = drawEnemy;

drawEnemy = function (enemy) {
    if (!enemy.ashenBoss) {
        worldTwoBaseDrawEnemy(enemy);
        return;
    }

    const cx = enemy.x + enemy.width / 2;
    const top = enemy.y;
    const defeated = enemy.state === "death" || enemy.state === "dead";

    ctx.save();
    ctx.globalAlpha = defeated ? 0.45 : 1;

    // Aura
    const aura = ctx.createRadialGradient(cx, top + 85, 10, cx, top + 85, 145);
    aura.addColorStop(0, "rgba(255,90,35,0.24)");
    aura.addColorStop(1, "rgba(255,60,20,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, top + 85, 145, 0, Math.PI * 2);
    ctx.fill();

    // Legs and torso
    ctx.fillStyle = "#17151d";
    ctx.fillRect(cx - 48, top + 110, 38, 66);
    ctx.fillRect(cx + 10, top + 110, 38, 66);
    ctx.fillRect(cx - 62, top + 38, 124, 92);

    // Armour plates
    ctx.fillStyle = "#39303a";
    ctx.fillRect(cx - 55, top + 45, 110, 65);
    ctx.fillRect(cx - 75, top + 55, 30, 56);
    ctx.fillRect(cx + 45, top + 55, 30, 56);

    // Molten cracks
    ctx.strokeStyle = enemy.phase === 3 ? "#ffcf5c" : "#ed6337";
    ctx.lineWidth = enemy.phase === 3 ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(cx - 25, top + 52);
    ctx.lineTo(cx - 10, top + 78);
    ctx.lineTo(cx - 22, top + 104);
    ctx.moveTo(cx + 20, top + 50);
    ctx.lineTo(cx + 8, top + 80);
    ctx.lineTo(cx + 27, top + 108);
    ctx.stroke();

    // Head and crown
    ctx.fillStyle = "#211c27";
    ctx.fillRect(cx - 34, top + 4, 68, 50);

    ctx.fillStyle = "#d45c35";
    ctx.fillRect(cx - 17, top + 26, 10, 5);
    ctx.fillRect(cx + 7, top + 26, 10, 5);

    ctx.fillStyle = "#4a3437";
    ctx.beginPath();
    ctx.moveTo(cx - 35, top + 12);
    ctx.lineTo(cx - 55, top - 32);
    ctx.lineTo(cx - 13, top - 5);
    ctx.lineTo(cx, top - 42);
    ctx.lineTo(cx + 13, top - 5);
    ctx.lineTo(cx + 55, top - 32);
    ctx.lineTo(cx + 35, top + 12);
    ctx.closePath();
    ctx.fill();

    // Weapon silhouette
    ctx.strokeStyle = "#62505a";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(cx + 72, top + 45);
    ctx.lineTo(cx + 112, top + 155);
    ctx.stroke();

    ctx.fillStyle = "#a44c35";
    ctx.beginPath();
    ctx.moveTo(cx + 112, top + 155);
    ctx.lineTo(cx + 90, top + 145);
    ctx.lineTo(cx + 130, top + 95);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
};

// World II gates
const secondGate = {
    x: WORLD_TWO.gateX,
    y: 270,
    width: 90,
    height: 190,
    opening: 0
};

function drawSecondGate() {
    const open = worldTwoState.secondGateOpen;
    const progress = secondGate.opening;

    ctx.fillStyle = "#28202c";
    ctx.fillRect(secondGate.x - 12, secondGate.y - 12, 114, 205);

    ctx.strokeStyle = "#d07842";
    ctx.lineWidth = 5;
    ctx.strokeRect(secondGate.x, secondGate.y, secondGate.width, secondGate.height);

    ctx.fillStyle = "rgba(235,95,45,0.18)";
    ctx.fillRect(secondGate.x + 5, secondGate.y + 5, secondGate.width - 10, secondGate.height - 10);

    if (open) {
        ctx.fillStyle = `rgba(255,125,60,${0.15 + progress * 0.3})`;
        ctx.fillRect(secondGate.x + 5, secondGate.y + 5, secondGate.width - 10, secondGate.height - 10);
        ctx.fillStyle = "#f2c17c";
        ctx.font = "12px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("PRESS E TO ENTER", secondGate.x + 45, secondGate.y + 215);
        ctx.textAlign = "left";
    } else {
        ctx.fillStyle = "#e07b45";
        ctx.font = "12px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("THE SOVEREIGN STILL LIVES", secondGate.x + 45, secondGate.y + 215);
        ctx.textAlign = "left";
    }
}

// Final throne room
const throne = {
    x: WORLD_TWO.throneX,
    y: 250
};

const endingSequence = {
    active: false,
    finished: false,
    timer: 0
};

function drawThroneRoom() {
    // Distant pillars
    for (let x = 12800; x < 13900; x += 230) {
        ctx.fillStyle = "#211b2b";
        ctx.fillRect(x, 125, 48, 335);
        ctx.fillStyle = "#55445b";
        ctx.fillRect(x - 8, 125, 64, 13);
        ctx.fillRect(x - 8, 447, 64, 13);
    }

    // Throne glow
    const glow = ctx.createRadialGradient(throne.x, throne.y + 95, 5, throne.x, throne.y + 95, 230);
    glow.addColorStop(0, "rgba(218,185,120,0.25)");
    glow.addColorStop(1, "rgba(218,185,120,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(throne.x - 230, 80, 460, 380);

    // Throne
    ctx.fillStyle = "#302638";
    ctx.fillRect(throne.x - 72, throne.y + 65, 144, 115);
    ctx.fillRect(throne.x - 55, throne.y + 15, 110, 75);

    ctx.fillStyle = "#80664a";
    ctx.fillRect(throne.x - 82, throne.y + 60, 164, 13);
    ctx.fillRect(throne.x - 62, throne.y + 175, 124, 12);

    ctx.fillStyle = "#c6a45e";
    ctx.beginPath();
    ctx.moveTo(throne.x - 58, throne.y + 18);
    ctx.lineTo(throne.x - 72, throne.y - 30);
    ctx.lineTo(throne.x - 25, throne.y + 2);
    ctx.lineTo(throne.x, throne.y - 48);
    ctx.lineTo(throne.x + 25, throne.y + 2);
    ctx.lineTo(throne.x + 72, throne.y - 30);
    ctx.lineTo(throne.x + 58, throne.y + 18);
    ctx.closePath();
    ctx.fill();
}

// Final cinematic movement
const worldTwoBaseUpdatePlayer = updatePlayer;

updatePlayer = function () {
    if (!endingSequence.active || endingSequence.finished) {
        worldTwoBaseUpdatePlayer();
        return;
    }

    player.velocityX = 1.35;
    player.velocityY = 0;
    player.grounded = true;
    player.facing = 1;

    if (player.x < throne.x - 75) {
        player.x += player.velocityX;
        setAnimation(playerAnimation, "walk");
        advanceAnimation(playerAnimation, PLAYER_ANIMATIONS);
    } else {
        player.x = throne.x - 75;
        player.velocityX = 0;
        setAnimation(playerAnimation, "idle");
        advanceAnimation(playerAnimation, PLAYER_ANIMATIONS);

        endingSequence.timer++;
        if (endingSequence.timer > 150) {
            endingSequence.finished = true;
            // Keep the throne-room epilogue playable: the player must be able
            // to walk to the newly unlocked Death Snow portal afterwards.
            player.levelComplete = false;
        }
    }
};

function drawFinalEnding() {
    if (!endingSequence.finished) return;

    ctx.fillStyle = "rgba(5,5,12,0.84)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#d9bd7c";
    ctx.font = "38px Georgia";
    ctx.fillText("THE HOLLOW CROWN", WIDTH / 2, HEIGHT / 2 - 75);

    ctx.fillStyle = "#eee5d6";
    ctx.font = "22px Georgia";
    ctx.fillText("The throne has found its keeper.", WIDTH / 2, HEIGHT / 2 - 20);

    ctx.fillStyle = "#b8a994";
    ctx.font = "15px Georgia";
    ctx.fillText("THE END", WIDTH / 2, HEIGHT / 2 + 35);
    ctx.fillText("Press R to begin the journey again", WIDTH / 2, HEIGHT / 2 + 80);
    ctx.textAlign = "left";
}

// World II and gate progression.
const worldTwoBaseUpdateAncientGate = updateAncientGate;

updateAncientGate = function () {
    if (worldTwoState.phase !== 1) return;

    if (enemies.length === 0) {
        ancientGate.open = true;
    }

    if (ancientGate.open && ancientGate.opening < 1) {
        ancientGate.opening = Math.min(1, ancientGate.opening + 0.008);
    }

    const nearGate =
        player.x + player.width > ancientGate.x - 45 &&
        player.x < ancientGate.x + ancientGate.width + 45 &&
        Math.abs(player.y + player.height - LEVEL.groundY) < 90;

    if (ancientGate.open && nearGate && keys["e"]) {
        worldTwoState.phase = 2;
        player.x = WORLD_TWO.start + 80;
        player.y = ground.y - player.height;
        player.checkpointX = WORLD_TWO.start + 80;
        player.health = player.maxHealth;
        player.velocityX = 0;
        player.velocityY = 0;
        player.grounded = true;
        player.levelComplete = false;
        camera.x = WORLD_TWO.start;
        camera.targetX = WORLD_TWO.start;
        spawnWorldTwoEnemies();
        showNotification("WORLD II — THE ASHEN ABYSS");
        keys["e"] = false;
    }
};

function updateWorldTwoProgression() {
    if (worldTwoState.phase !== 2) return;

    if (worldTwoState.bossDefeated) {
        worldTwoState.secondGateOpen = true;
        secondGate.opening = Math.min(1, secondGate.opening + 0.012);

        const nearSecondGate =
            player.x + player.width > secondGate.x - 45 &&
            player.x < secondGate.x + secondGate.width + 45 &&
            Math.abs(player.y + player.height - ground.y) < 90;

        if (nearSecondGate && keys["e"]) {
            worldTwoState.phase = 3;
            player.x = WORLD_TWO.finalStart;
            player.y = ground.y - player.height;
            player.checkpointX = WORLD_TWO.finalStart;
            player.health = player.maxHealth;
            player.velocityX = 0;
            player.velocityY = 0;
            player.grounded = true;
            player.levelComplete = false;
            camera.x = WORLD_TWO.finalStart;
            camera.targetX = WORLD_TWO.finalStart;
            endingSequence.active = true;
            endingSequence.finished = false;
            endingSequence.timer = 0;
            showNotification("THE HOLLOW THRONE");
            keys["e"] = false;
        }
    }
}

function updateWorldTwo() {
    if (worldTwoState.phase !== 2) return;

    worldTwoState.tick++;
    updateWorldTwoLava();
    updateSwingingChains();
    updateWorldTwoProgression();
}

function drawWorldTwo() {
    if (player.x < WORLD_TWO.start - 200) return;

    drawWorldTwoLava();
    drawSwingingChains();
    drawSecondGate();

    if (player.x >= 12650) {
        drawThroneRoom();
    }

    
function drawWorldTwoBossHUD() {
    const boss = enemies.find(enemy => enemy.ashenBoss);
    if (!boss || worldTwoState.phase !== 2) return;

    const barX = WIDTH / 2 - 190;
    const barY = 28;
    const ratio = Math.max(0, boss.health / boss.maxHealth);

    ctx.fillStyle = "rgba(10,8,12,0.85)";
    ctx.fillRect(barX - 8, barY - 18, 396, 48);

    ctx.fillStyle = "#e2d2bd";
    ctx.font = "bold 13px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("THE ASHEN SOVEREIGN", WIDTH / 2, barY - 5);

    ctx.fillStyle = "#291b20";
    ctx.fillRect(barX, barY + 4, 380, 13);

    ctx.fillStyle = boss.phase === 3 ? "#f0a13c" : "#bd4932";
    ctx.fillRect(barX, barY + 4, 380 * ratio, 13);

    ctx.strokeStyle = "#c5a36a";
    ctx.strokeRect(barX, barY + 4, 380, 13);
    ctx.textAlign = "left";
}
}

// Keep the original gate art, but draw the new World II objects too.
const worldTwoBaseDrawLevelProgress = drawLevelProgress;

drawLevelProgress = function () {
    if (worldTwoState.phase === 1) {
        worldTwoBaseDrawLevelProgress();
        return;
    }

    const progress = Math.max(0, Math.min(1, (player.x - WORLD_TWO.start) / (LEVEL.end - WORLD_TWO.start)));

    ctx.fillStyle = "#29252a";
    ctx.fillRect(WIDTH - 184, 25, 160, 6);
    ctx.fillStyle = "#d36b3c";
    ctx.fillRect(WIDTH - 184, 25, 160 * progress, 6);

    ctx.fillStyle = "#ded8ce";
    ctx.font = "11px Georgia";
    ctx.textAlign = "right";
    ctx.fillText(
        worldTwoState.phase === 3 ? "THE HOLLOW THRONE" : "THE ASHEN ABYSS",
        WIDTH - 24,
        18
    );

    ctx.fillStyle = "#d6c9b5";
    ctx.font = "12px Georgia";
    ctx.fillText(`ENEMIES: ${enemies.length}`, WIDTH - 24, 49);
    ctx.fillText(`${Math.floor(progress * 100)}%`, WIDTH - 24, 65);

    ctx.textAlign = "center";
    ctx.font = "13px Georgia";
    ctx.fillStyle = "rgba(230,216,190,0.8)";
    ctx.fillText(getAreaName(), WIDTH / 2, HEIGHT - 18);
    ctx.textAlign = "left";
};

// Restart from the beginning resets both worlds.
const worldTwoBaseRestartGame = restartGame;

restartGame = function () {
    worldTwoBaseRestartGame();

    worldTwoState.phase = 1;
    worldTwoState.tick = 0;
    worldTwoState.bossDefeated = false;
    worldTwoState.secondGateOpen = false;
    secondGate.opening = 0;

    endingSequence.active = false;
    endingSequence.finished = false;
    endingSequence.timer = 0;

    ancientGate.open = false;
    ancientGate.opening = 0;

    for (const p of worldTwoMovingPlatforms) {
        p.x = p.startX;
        p.direction = 1;
        p.oldX = p.x;
        p.oldY = p.y;
    }
};

// Checkpoint respawn must keep the player in the current world.
const worldTwoBaseRespawn = respawnAtCheckpoint;

respawnAtCheckpoint = function () {
    worldTwoBaseRespawn();

    if (worldTwoState.phase >= 2) {
        player.x = player.checkpointX;
        player.y = ground.y - player.height;
        player.health = player.maxHealth;
        player.gameOver = false;
        player.levelComplete = false;
        camera.x = Math.max(0, Math.min(LEVEL.end - WIDTH, player.x - WIDTH * 0.42));
        camera.targetX = camera.x;
    }
};

// ============================================================
// END WORLD II EXPANSION
// ============================================================



// ============================================================
// HOLLOW CROWN — INTEGRATED WORLD II SYSTEM PATCH
// This block intentionally keeps art replaceable by Claude assets.
// ============================================================

const hcArt = {};
[
    "ashen_sovereign_phase1",
    "ashen_sovereign_phase2",
    "ashen_spear_relic",
    "second_gate",
    "hollow_throne",
    "throne_room_background"
].forEach((key) => {
    const img = new Image();
    img.src = `assets/${key}.png`;
    hcArt[key] = img;
});

worldTwoState.worldOneBossDefeated = false;
worldTwoState.waveActive = false;
worldTwoState.bossSpawned = false;
worldTwoState.bossArenaLocked = false;
worldTwoState.spearDropped = false;
worldTwoState.spearCollected = false;
worldTwoState.spearRelic = null;
worldTwoState.lavaCooldowns = new Map();

function spawnWorldTwoEnemies() {
    enemies.length = 0;

    const enemyData = [
        { x: 7000, name: "ASHEN STALKER", health: 5, speed: 1.8, damage: 18, patrol: 150 },
        { x: 7600, name: "EMBER WRAITH", health: 5, speed: 1.5, damage: 17, patrol: 180 },
        { x: 8200, name: "ABYSSAL BRUTE", health: 9, speed: 0.9, damage: 25, patrol: 130 },
        { x: 8900, name: "ASHEN STALKER", health: 6, speed: 2, damage: 20, patrol: 170 },
        { x: 9500, name: "EMBER WRAITH", health: 6, speed: 1.7, damage: 19, patrol: 180 },
        { x: 10100, name: "ABYSSAL BRUTE", health: 10, speed: 1, damage: 27, patrol: 150 },
        { x: 10800, name: "ASHEN STALKER", health: 7, speed: 2.1, damage: 21, patrol: 180 }
    ];

    for (const data of enemyData) {
        const enemy = createEnemy(data.x, {
            name: data.name,
            health: data.health,
            speed: data.speed,
            damage: data.damage,
            detectionRange: 480,
            attackRange: 65,
            patrol: data.patrol
        });
        enemy.patrolStart = data.x - data.patrol;
        enemy.patrolEnd = data.x + data.patrol;
        enemy.worldTwoEnemy = true;
        enemies.push(enemy);
    }

    worldTwoState.waveActive = true;
    worldTwoState.bossSpawned = false;
    worldTwoState.bossDefeated = false;
    worldTwoState.spearDropped = false;
    worldTwoState.spearCollected = false;
    worldTwoState.spearRelic = null;
    worldTwoState.bossArenaLocked = false;
    worldTwoState.lavaCooldowns.clear();
    showNotification("THE ASHEN ABYSS — DEFEAT THE GUARDIANS");
}

function spawnAshenSovereign() {
    if (worldTwoState.bossSpawned) return;

    const boss = createEnemy(WORLD_TWO.bossX, {
        boss: true,
        name: "THE ASHEN SOVEREIGN",
        health: 100,
        speed: 0.85,
        damage: 30,
        detectionRange: 1000,
        attackRange: 165,
        patrol: 340
    });

    boss.width = 150;
    boss.height = 190;
    boss.y = ground.y - boss.height;
    boss.patrolStart = WORLD_TWO.bossX - 340;
    boss.patrolEnd = WORLD_TWO.bossX + 340;
    boss.spriteScale = 2.2;
    boss.ashenBoss = true;
    boss.worldTwoEnemy = true;
    boss.phase = 1;
    boss.attackCooldown = 75;
    boss.maxHealth = 100;
    enemies.push(boss);

    worldTwoState.bossSpawned = true;
    worldTwoState.waveActive = false;
    showNotification("THE ASHEN SOVEREIGN AWAKENS");
}

function damageEnemy(enemy) {
    if (!enemy || enemy.state === "death" || enemy.state === "dead") return;

    const damage = powerUps.sword > 0 ? 3 : 1;
    enemy.health = Math.max(0, enemy.health - damage);

    if (enemy.health <= 0) {
        enemy.state = "death";
        setAnimation(enemy.animation, "death");

        if (enemy.name === "THE SUNKEN SENTINEL" && worldTwoState.phase === 1) {
            worldTwoState.worldOneBossDefeated = true;
            showNotification("THE ANCIENT GATE HAS AWAKENED");
        }

        if (enemy.ashenBoss && !worldTwoState.spearDropped) {
            worldTwoState.bossDefeated = true;
            worldTwoState.spearDropped = true;
            worldTwoState.spearRelic = {
                x: enemy.x + enemy.width / 2,
                y: ground.y - 54,
                width: 42,
                height: 54,
                pulse: 0
            };
            showNotification("THE SOVEREIGN HAS FALLEN — A RELIC REMAINS");
        } else if (enemy.boss) {
            showNotification(enemy.name + " DEFEATED");
        }
        return;
    }

    setEnemyState(enemy, "damage");

    if (enemy.ashenBoss && enemy.phase === 1 &&
        enemy.health / enemy.maxHealth <= 0.30) {
        enemy.phase = 2;
        enemy.width = 184;
        enemy.height = 228;
        enemy.y = ground.y - enemy.height;
        enemy.spriteScale = 2.8;
        enemy.speed = 1.5;
        enemy.damage = 39;
        enemy.attackCooldown = 48;
        enemy.attackRange = 205;
        enemy.detectionRange = 1150;
        enemy.patrolStart = WORLD_TWO.bossX - 430;
        enemy.patrolEnd = WORLD_TWO.bossX + 430;
        showNotification("THE SOVEREIGN SHATTERS — TRUE FORM REVEALED");
    }
}

const hcBaseDrawEnemy = worldTwoBaseDrawEnemy;
drawEnemy = function (enemy) {
    if (!enemy.ashenBoss) {
        hcBaseDrawEnemy(enemy);
        return;
    }

    const art = enemy.phase === 2 ? hcArt.ashen_sovereign_phase2 : hcArt.ashen_sovereign_phase1;
    if (art && art.complete && art.naturalWidth > 0) {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height);
        ctx.scale(enemy.facing || 1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(art, -enemy.width * 0.62, -enemy.height, enemy.width * 1.24, enemy.height);
        ctx.restore();
    } else {
        hcBaseDrawEnemy(enemy);
    }
};

function updateAncientGate() {
    if (worldTwoState.phase !== 1) return;

    ancientGate.open = worldTwoState.worldOneBossDefeated;
    if (ancientGate.open && ancientGate.opening < 1) {
        ancientGate.opening = Math.min(1, ancientGate.opening + 0.008);
    }

    const nearGate =
        player.x + player.width > ancientGate.x - 45 &&
        player.x < ancientGate.x + ancientGate.width + 45 &&
        Math.abs(player.y + player.height - LEVEL.groundY) < 90;

    if (ancientGate.open && nearGate && keys["e"]) {
        worldTwoState.phase = 2;
        player.x = WORLD_TWO.start + 80;
        player.y = ground.y - player.height;
        player.checkpointX = WORLD_TWO.start + 80;
        player.health = player.maxHealth;
        player.velocityX = 0;
        player.velocityY = 0;
        player.grounded = true;
        player.levelComplete = false;
        camera.x = WORLD_TWO.start;
        camera.targetX = WORLD_TWO.start;
        spawnWorldTwoEnemies();
        showNotification("WORLD II — THE ASHEN ABYSS");
        keys["e"] = false;
    }
}

function hcPointSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
}

function updateSwingingChains() {
    if (worldTwoState.phase !== 2) return;

    for (let i = 0; i < swingingChains.length; i++) {
        const chain = swingingChains[i];
        const end = getSwingPosition(chain);
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const segmentHit = hcPointSegmentDistance(px, py, chain.x, 0, end.x, end.y) <
            chain.radius + Math.min(player.width, player.height) * 0.28;
        const weightHit = Math.hypot(px - end.x, py - end.y) < chain.radius + 25;
        const cooldown = chain.hitCooldown || 0;

        if (segmentHit || weightHit) {
            if (cooldown <= 0) {
                damagePlayer(14);
                chain.hitCooldown = 42;
            }
        }
        if (chain.hitCooldown > 0) chain.hitCooldown--;
    }
}

function updateWorldTwoLava() {
    if (worldTwoState.phase !== 2) return;

    for (let i = 0; i < worldTwoLava.length; i++) {
        const lava = worldTwoLava[i];
        const overlap =
            player.x + player.width > lava.x + 5 &&
            player.x < lava.x + lava.width - 5 &&
            player.y + player.height >= ground.y - 8;

        const cooldown = worldTwoState.lavaCooldowns.get(i) || 0;
        if (overlap && cooldown <= 0) {
            damagePlayer(16);
            worldTwoState.lavaCooldowns.set(i, 48);
        } else if (cooldown > 0) {
            worldTwoState.lavaCooldowns.set(i, cooldown - 1);
        }
    }
}

function updateWorldTwoProgression() {
    if (worldTwoState.phase !== 2) return;

    if (worldTwoState.bossDefeated && worldTwoState.spearCollected) {
        worldTwoState.secondGateOpen = true;
        secondGate.opening = Math.min(1, secondGate.opening + 0.012);

        const nearSecondGate =
            player.x + player.width > secondGate.x - 45 &&
            player.x < secondGate.x + secondGate.width + 45 &&
            Math.abs(player.y + player.height - ground.y) < 90;

        if (nearSecondGate && keys["e"]) {
            worldTwoState.phase = 3;
            player.x = WORLD_TWO.finalStart;
            player.y = ground.y - player.height;
            player.checkpointX = WORLD_TWO.finalStart;
            player.health = player.maxHealth;
            player.velocityX = 0;
            player.velocityY = 0;
            player.grounded = true;
            player.levelComplete = false;
            camera.x = WORLD_TWO.finalStart;
            camera.targetX = WORLD_TWO.finalStart;
            worldTwoState.bossArenaLocked = false;
            endingSequence.active = true;
            endingSequence.finished = false;
            endingSequence.timer = 0;
            showNotification("THE HOLLOW THRONE");
            keys["e"] = false;
        }
    }
}

function updateWorldTwo() {
    if (worldTwoState.phase !== 2) return;

    worldTwoState.tick++;

    if (worldTwoState.waveActive && enemies.length === 0) {
        spawnAshenSovereign();
    }

    const boss = enemies.find(enemy => enemy.ashenBoss);
    if (boss && !worldTwoState.bossDefeated &&
        player.x >= WORLD_TWO.bossX - 470) {
        worldTwoState.bossArenaLocked = true;
    }

    if (worldTwoState.spearRelic && !worldTwoState.spearCollected) {
        const relic = worldTwoState.spearRelic;
        relic.pulse += 0.08;
        const nearRelic =
            player.x + player.width > relic.x - 58 &&
            player.x < relic.x + relic.width + 58 &&
            Math.abs((player.y + player.height) - ground.y) < 90;

        if (nearRelic && keys["e"]) {
            worldTwoState.spearCollected = true;
            worldTwoState.spearRelic = null;
            showNotification("ANCIENT SPEAR RELIC COLLECTED");
            keys["e"] = false;
        }
    }

    updateWorldTwoLava();
    updateSwingingChains();
    updateWorldTwoProgression();
}

const hcBaseUpdateCamera = updateCamera;
updateCamera = function () {
    if (worldTwoState.phase === 2 && worldTwoState.bossArenaLocked &&
        !worldTwoState.bossDefeated) {
        const lockX = Math.max(0, Math.min(LEVEL.end - WIDTH, WORLD_TWO.bossX - WIDTH * 0.52));
        camera.x = lockX;
        camera.targetX = lockX;
        return;
    }
    hcBaseUpdateCamera();
};

const hcBaseUpdatePlayer = updatePlayer;
updatePlayer = function () {
    hcBaseUpdatePlayer();

    if (worldTwoState.phase === 2 && worldTwoState.bossArenaLocked &&
        !worldTwoState.bossDefeated) {
        const rightLimit = WORLD_TWO.bossX + 560;
        if (player.x > rightLimit) {
            player.x = rightLimit;
            player.velocityX = 0;
        }
    }
};

function drawWorldTwoBossHUD() {
    const boss = enemies.find(enemy => enemy.ashenBoss);
    if (!boss || worldTwoState.phase !== 2) return;

    const barX = WIDTH / 2 - 190;
    const barY = 28;
    const ratio = Math.max(0, boss.health / boss.maxHealth);

    ctx.save();
    ctx.fillStyle = "rgba(10,8,12,0.88)";
    ctx.fillRect(barX - 8, barY - 18, 396, 48);
    ctx.fillStyle = "#e2d2bd";
    ctx.font = "bold 13px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("THE ASHEN SOVEREIGN", WIDTH / 2, barY - 5);
    ctx.fillStyle = "#291b20";
    ctx.fillRect(barX, barY + 4, 380, 13);
    ctx.fillStyle = boss.phase === 2 ? "#e7a34c" : "#bd4932";
    ctx.fillRect(barX, barY + 4, 380 * ratio, 13);
    ctx.strokeStyle = "#c5a36a";
    ctx.strokeRect(barX, barY + 4, 380, 13);
    ctx.restore();
}

const hcBaseDrawSecondGate = drawSecondGate;
drawSecondGate = function () {
    const art = hcArt.second_gate;
    if (art && art.complete && art.naturalWidth > 0) {
        ctx.drawImage(art, secondGate.x - 12, secondGate.y - 12, 114, 205);
        ctx.save();
        ctx.fillStyle = "#f2c17c";
        ctx.font = "12px Georgia";
        ctx.textAlign = "center";
        ctx.fillText(
            worldTwoState.secondGateOpen ? "PRESS E TO ENTER" : "CLAIM THE RELIC FIRST",
            secondGate.x + 45,
            secondGate.y + 215
        );
        ctx.restore();
    } else {
        hcBaseDrawSecondGate();
    }
};

const hcBaseDrawThroneRoom = drawThroneRoom;
drawThroneRoom = function () {
    const background = hcArt.throne_room_background;
    const throneArt = hcArt.hollow_throne;

    if (background && background.complete && background.naturalWidth > 0) {
        ctx.drawImage(background, 12650, 0, 1250, HEIGHT);
    } else {
        hcBaseDrawThroneRoom();
        return;
    }

    if (throneArt && throneArt.complete && throneArt.naturalWidth > 0) {
        ctx.drawImage(throneArt, throne.x - 170, throne.y - 85, 340, 285);
    }
};

const hcBaseDrawWorldTwo = drawWorldTwo;
drawWorldTwo = function () {
    if (worldTwoState.phase < 2) return;

    drawWorldTwoLava();
    drawSwingingChains();
    drawSecondGate();

    if (player.x >= 12650 || worldTwoState.phase === 3) {
        drawThroneRoom();
    }

    if (worldTwoState.spearRelic && !worldTwoState.spearCollected) {
        const relic = worldTwoState.spearRelic;
        const art = hcArt.ashen_spear_relic;
        if (art && art.complete && art.naturalWidth > 0) {
            ctx.drawImage(art, relic.x - 18, relic.y - 34, 36, 68);
        } else {
            ctx.save();
            ctx.translate(relic.x, relic.y);
            ctx.rotate(-0.35);
            ctx.strokeStyle = "#d6bd83";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(0, 24);
            ctx.stroke();
            ctx.fillStyle = "#b7a0a0";
            ctx.beginPath();
            ctx.moveTo(0, -34);
            ctx.lineTo(-8, -19);
            ctx.lineTo(8, -19);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = "#e7d5aa";
            ctx.font = "12px Georgia";
            ctx.textAlign = "center";
            ctx.fillText("PRESS E — CLAIM THE RELIC", relic.x, relic.y - 48);
            ctx.textAlign = "left";
        }
    }

    if (worldTwoState.waveActive) {
        ctx.save();
        ctx.fillStyle = "rgba(12,8,12,0.75)";
        ctx.fillRect(WIDTH / 2 - 145, 20, 290, 28);
        ctx.fillStyle = "#e3c9a2";
        ctx.font = "13px Georgia";
        ctx.textAlign = "center";
        ctx.fillText(`GUARDIANS REMAINING: ${enemies.length}`, WIDTH / 2, 39);
        ctx.restore();
    }
};

// Restore reset behavior for every World II state.
const hcBaseRestartGame = restartGame;
restartGame = function () {
    hcBaseRestartGame();
    worldTwoState.phase = 1;
    worldTwoState.tick = 0;
    worldTwoState.bossDefeated = false;
    worldTwoState.secondGateOpen = false;
    worldTwoState.worldOneBossDefeated = false;
    worldTwoState.waveActive = false;
    worldTwoState.bossSpawned = false;
    worldTwoState.bossArenaLocked = false;
    worldTwoState.spearDropped = false;
    worldTwoState.spearCollected = false;
    worldTwoState.spearRelic = null;
    worldTwoState.lavaCooldowns.clear();
    secondGate.opening = 0;
    endingSequence.active = false;
    endingSequence.finished = false;
    endingSequence.timer = 0;
    ancientGate.open = false;
    ancientGate.opening = 0;
    for (const chain of swingingChains) chain.hitCooldown = 0;
    for (const platform of worldTwoMovingPlatforms) {
        platform.x = platform.startX;
        platform.direction = 1;
        platform.oldX = platform.x;
        platform.oldY = platform.y;
    }
};

 // ============================================================
// HOLLOW CROWN — AUTHORITATIVE GAMEPLAY UPGRADE
// Wave camera locks, ranged archers, potions, entry cinematic.
// ============================================================

worldTwoState.waveIndex = 0;
worldTwoState.waveLockActive = false;
worldTwoState.activeWaveZone = null;
worldTwoState.waitingForNextWave = false;
worldTwoState.entryTransition = { active: false, timer: 0, duration: 115 };
worldTwoState.projectiles = [];
worldTwoState.potions = [];
worldTwoState.waveZones = [
    {
        start: 6600, end: 7550, cameraX: 6600,
        enemies: [
            { x: 7000, type: "stalker", name: "ASHEN STALKER", health: 6, speed: 1.65, damage: 17 },
            { x: 7200, type: "archer", name: "CINDER ARCHER", health: 5, speed: 0.8, damage: 13, platformY: 300 },
            { x: 7460, type: "wraith", name: "EMBER WRAITH", health: 5, speed: 1.9, damage: 16 }
        ]
    },
    {
        start: 7900, end: 8850, cameraX: 7900,
        enemies: [
            { x: 8170, type: "brute", name: "ABYSSAL BRUTE", health: 10, speed: 0.8, damage: 23 },
            { x: 8400, type: "archer", name: "ASHEN MARKSMAN", health: 6, speed: 0.85, damage: 15, platformY: 355 },
            { x: 8750, type: "stalker", name: "ASHEN STALKER", health: 7, speed: 1.8, damage: 19 }
        ]
    },
    {
        start: 9400, end: 10350, cameraX: 9400,
        enemies: [
            { x: 9680, type: "archer", name: "CALDERA ARCHER", health: 7, speed: 0.9, damage: 16, platformY: 280 },
            { x: 9970, type: "wraith", name: "EMBER WRAITH", health: 7, speed: 2.0, damage: 19 },
            { x: 10250, type: "brute", name: "ASHEN COLOSSUS", health: 12, speed: 0.75, damage: 25, platformY: 350 }
        ]
    }
];

function hcSpawnWave(index) {
    const zone = worldTwoState.waveZones[index];
    if (!zone) return false;
    enemies.length = 0;
    worldTwoState.projectiles.length = 0;
    worldTwoState.activeWaveZone = zone;
    worldTwoState.waveLockActive = true;
    worldTwoState.waveActive = true;
    worldTwoState.waitingForNextWave = false;
    for (const data of zone.enemies) {
        const enemy = createEnemy(data.x, {
            name: data.name,
            health: data.health,
            speed: data.speed,
            damage: data.damage,
            detectionRange: data.type === "archer" ? 620 : 470,
            attackRange: data.type === "archer" ? 300 : 62,
            patrol: data.type === "archer" ? 45 : 125,
            platformY: data.platformY
        });
        enemy.enemyType = data.type;
        enemy.worldTwoEnemy = true;
        enemy.ranged = data.type === "archer";
        enemy.arrowCooldown = 70 + Math.floor(Math.random() * 35);
        enemy.patrolStart = Math.max(zone.start + 25, data.x - (data.type === "archer" ? 35 : 125));
        enemy.patrolEnd = Math.min(zone.end - 35, data.x + (data.type === "archer" ? 35 : 125));
        if (data.type === "archer" && data.platformY) {
            const support = platforms.find(p =>
                Math.abs(p.y - data.platformY) < 1 &&
                data.x + enemy.width > p.x && data.x < p.x + p.width
            );
            if (support) {
                enemy.patrolStart = Math.max(support.x + 8, data.x - 28);
                enemy.patrolEnd = Math.min(support.x + support.width - enemy.width - 8, data.x + 28);
            }
        }
        if (data.platformY) {
            enemy.platformY = data.platformY;
            enemy.y = data.platformY - enemy.height;
        }
        enemies.push(enemy);
    }
    camera.x = zone.cameraX;
    camera.targetX = zone.cameraX;
    showNotification(`ASHEN ABYSS — WAVE ${index + 1}`);
    return true;
}

spawnWorldTwoEnemies = function () {
    enemies.length = 0;
    worldTwoState.waveIndex = 0;
    worldTwoState.bossSpawned = false;
    worldTwoState.bossDefeated = false;
    worldTwoState.waveActive = false;
    worldTwoState.waveLockActive = false;
    worldTwoState.activeWaveZone = null;
    worldTwoState.waitingForNextWave = false;
    worldTwoState.projectiles = [];
    worldTwoState.entryTransition = { active: true, timer: 0, duration: 115 };
    worldTwoState.spearDropped = false;
    worldTwoState.spearCollected = false;
    worldTwoState.spearRelic = null;
    worldTwoState.lavaCooldowns.clear();
    worldTwoState.potions = [
        { x: 7440, y: 305, type: "health", amount: 22, collected: false },
        { x: 8660, y: 245, type: "health", amount: 25, collected: false },
        { x: 10080, y: 235, type: "greater", amount: 38, collected: false },
        { x: 10950, y: 300, type: "health", amount: 22, collected: false }
    ];
    hcSpawnWave(0);
    showNotification("THE ASHEN ABYSS — THE GATE HAS SEALED BEHIND YOU");
};

// Keep the World I boss gate tied only to the Sunken Sentinel.
const hcDamageBeforeWaveUpgrade = damageEnemy;
damageEnemy = function (enemy) {
    if (!enemy || enemy.state === "death" || enemy.state === "dead") return;
    const before = enemy.health;
    hcDamageBeforeWaveUpgrade(enemy);
    if (enemy.name === "THE SUNKEN SENTINEL" && enemy.health <= 0 && worldTwoState.phase === 1) {
        worldTwoState.worldOneBossDefeated = true;
        ancientGate.open = true;
    }
    if (enemy.ashenBoss && before > 0 && enemy.health > 0 &&
        enemy.phase !== 2 && enemy.health / enemy.maxHealth <= 0.30) {
        enemy.phase = 2;
        enemy.width = 184;
        enemy.height = 230;
        enemy.y = ground.y - enemy.height;
        enemy.spriteScale = 3.0;
        enemy.speed = 1.35;
        enemy.damage = 39;
        enemy.attackCooldown = 48;
        enemy.attackRange = 205;
        enemy.detectionRange = 1150;
        enemy.patrolStart = WORLD_TWO.bossX - 420;
        enemy.patrolEnd = WORLD_TWO.bossX + 420;
        showNotification("THE SOVEREIGN TRANSFORMS — THE ASHEN ARMOUR AWAKENS");
    }
};

// Boss is deliberately withheld until all three platform/ground waves are cleared.
spawnAshenSovereign = function () {
    if (worldTwoState.bossSpawned) return;
    enemies.length = 0;
    const boss = createEnemy(WORLD_TWO.bossX, {
        boss: true, name: "THE ASHEN SOVEREIGN", health: 100,
        speed: 0.9, damage: 30, detectionRange: 1050,
        attackRange: 165, patrol: 340
    });
    boss.width = 150;
    boss.height = 190;
    boss.y = ground.y - boss.height;
    boss.patrolStart = WORLD_TWO.bossX - 340;
    boss.patrolEnd = WORLD_TWO.bossX + 340;
    boss.ashenBoss = true;
    boss.enemyType = "sovereign";
    boss.phase = 1;
    boss.maxHealth = 100;
    boss.health = 100;
    boss.attackCooldown = 70;
    enemies.push(boss);
    worldTwoState.bossSpawned = true;
    worldTwoState.waveActive = false;
    worldTwoState.waveLockActive = false;
    worldTwoState.activeWaveZone = null;
    showNotification("THE ASHEN SOVEREIGN AWAKENS");
};

// World I platform enemies are positioned on actual ledges; keep their feet on the ledge.
const hcOriginalUpdateEnemy = updateEnemy;
updateEnemy = function (enemy) {
    hcOriginalUpdateEnemy(enemy);
    if (enemy.platformY !== null && enemy.platformY !== undefined &&
        enemy.state !== "death" && enemy.state !== "dead") {
        enemy.y = enemy.platformY - enemy.height;
    }
};

// Arrows are simple readable projectiles: they travel horizontally and can be dodged.
function hcUpdateArrows() {
    const projectiles = worldTwoState.projectiles;
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const arrow = projectiles[i];
        arrow.x += arrow.vx;
        arrow.life--;
        const hit = arrow.x < player.x + player.width &&
            arrow.x + 24 > player.x &&
            arrow.y > player.y + 8 && arrow.y < player.y + player.height - 5;
        if (hit) {
            damagePlayer(arrow.damage);
            projectiles.splice(i, 1);
        } else if (arrow.life <= 0 || arrow.x < camera.x - 100 || arrow.x > camera.x + WIDTH + 120) {
            projectiles.splice(i, 1);
        }
    }
    for (const enemy of enemies) {
        if (!enemy.ranged || enemy.state === "death" || enemy.state === "dead") continue;
        if (enemy.arrowCooldown > 0) enemy.arrowCooldown--;
        const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
        const dy = Math.abs(player.y + player.height / 2 - (enemy.y + enemy.height / 2));
        if (Math.abs(dx) < 570 && dy < 185 && enemy.arrowCooldown <= 0) {
            enemy.facing = dx < 0 ? -1 : 1;
            projectiles.push({
                x: enemy.facing > 0 ? enemy.x + enemy.width : enemy.x - 24,
                y: enemy.y + 25,
                vx: enemy.facing * 5.2,
                damage: enemy.damage,
                life: 125
            });
            enemy.arrowCooldown = 105;
        }
    }
}

function hcDrawArrows() {
    for (const arrow of worldTwoState.projectiles) {
        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(arrow.vx >= 0 ? 0 : Math.PI);
        ctx.strokeStyle = "#b7a18a";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(21, 0); ctx.stroke();
        ctx.fillStyle = "#d9c7a7";
        ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(16, -4); ctx.lineTo(16, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
}

// Three visibly distinct enemy silhouettes layered over the shared placeholder sheet.
const hcDrawEnemyBeforeRoles = drawEnemy;
function hcDrawAshenSovereign(enemy) {
    const cx = enemy.x + enemy.width / 2;
    const top = enemy.y;
    const transformed = enemy.phase === 2;
    const armor = transformed ? "#51402f" : "#302b35";
    const glow = transformed ? "#ffc45b" : "#d95b36";
    ctx.save();
    const aura = ctx.createRadialGradient(cx, top + enemy.height * 0.48, 8, cx, top + enemy.height * 0.48, transformed ? 175 : 135);
    aura.addColorStop(0, transformed ? "rgba(255,170,65,0.32)" : "rgba(225,75,42,0.22)");
    aura.addColorStop(1, "rgba(230,70,30,0)");
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, top + enemy.height * 0.48, transformed ? 175 : 135, 0, Math.PI * 2); ctx.fill();
    // Heavy legs and broad torso. Phase two visibly enlarges the silhouette.
    ctx.fillStyle = "#17151d";
    ctx.fillRect(cx - (transformed ? 58 : 43), top + enemy.height * 0.61, transformed ? 42 : 34, enemy.height * 0.34);
    ctx.fillRect(cx + (transformed ? 16 : 9), top + enemy.height * 0.61, transformed ? 42 : 34, enemy.height * 0.34);
    ctx.fillStyle = armor;
    ctx.fillRect(cx - (transformed ? 76 : 62), top + enemy.height * 0.25, transformed ? 152 : 124, transformed ? 112 : 94);
    ctx.fillRect(cx - (transformed ? 94 : 78), top + enemy.height * 0.29, 28, transformed ? 72 : 58);
    ctx.fillRect(cx + (transformed ? 66 : 50), top + enemy.height * 0.29, 28, transformed ? 72 : 58);
    // Armour ridges and molten seams.
    ctx.strokeStyle = glow; ctx.lineWidth = transformed ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(cx - 30, top + 55); ctx.lineTo(cx - 12, top + 91); ctx.lineTo(cx - 27, top + 130);
    ctx.moveTo(cx + 25, top + 52); ctx.lineTo(cx + 8, top + 94); ctx.lineTo(cx + 29, top + 132);
    ctx.stroke();
    ctx.fillStyle = "#211c27"; ctx.fillRect(cx - 34, top + 5, 68, 54);
    ctx.fillStyle = glow; ctx.fillRect(cx - 18, top + 29, 11, 6); ctx.fillRect(cx + 7, top + 29, 11, 6);
    // Crown grows into a jagged volcanic crest after transformation.
    ctx.fillStyle = transformed ? "#8a4c2e" : "#51404a";
    ctx.beginPath(); ctx.moveTo(cx - 38, top + 15); ctx.lineTo(cx - 58, top - 28);
    ctx.lineTo(cx - 15, top - 4); ctx.lineTo(cx, top - (transformed ? 58 : 43));
    ctx.lineTo(cx + 15, top - 4); ctx.lineTo(cx + 58, top - 28); ctx.lineTo(cx + 38, top + 15); ctx.closePath(); ctx.fill();
    // Ancient spear: long shaft and leaf-shaped head, held as boss art only.
    const spearX = cx + (enemy.facing >= 0 ? 1 : -1) * (transformed ? 104 : 87);
    ctx.strokeStyle = "#8d7865"; ctx.lineWidth = transformed ? 10 : 8;
    ctx.beginPath(); ctx.moveTo(spearX, top + 28); ctx.lineTo(spearX + (enemy.facing >= 0 ? 26 : -26), top + enemy.height - 2); ctx.stroke();
    ctx.fillStyle = "#d8c6a3"; ctx.beginPath();
    const tipX = spearX - (enemy.facing >= 0 ? 5 : -5);
    ctx.moveTo(tipX, top + 12); ctx.lineTo(tipX - 13, top + 38); ctx.lineTo(tipX, top + 33); ctx.lineTo(tipX + 13, top + 38); ctx.closePath(); ctx.fill();
    if (transformed) {
        ctx.strokeStyle = "rgba(255,170,65,0.8)"; ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) { const yy = top + 40 + i * 38; ctx.beginPath(); ctx.moveTo(cx - 88, yy); ctx.lineTo(cx - 103, yy - 12); ctx.moveTo(cx + 88, yy); ctx.lineTo(cx + 103, yy - 12); ctx.stroke(); }
    }
    ctx.restore();
}
drawEnemy = function (enemy) {
    if (enemy.ashenBoss) { hcDrawAshenSovereign(enemy); return; }
    hcDrawEnemyBeforeRoles(enemy);
    if (!enemy.worldTwoEnemy) return;
    const cx = enemy.x + enemy.width / 2;
    const cy = enemy.y + enemy.height;
    ctx.save();
    if (enemy.enemyType === "archer") {
        ctx.strokeStyle = "#d7a06a"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx + enemy.facing * 12, cy - 34, 15, -1.1, 1.1); ctx.stroke();
        ctx.fillStyle = "#e5a34d"; ctx.fillRect(cx - 4, cy - enemy.height + 7, 8, 5);
    } else if (enemy.enemyType === "brute") {
        ctx.fillStyle = "rgba(100,45,38,0.65)";
        ctx.fillRect(cx - 25, cy - enemy.height + 12, 50, 20);
        ctx.fillStyle = "#e46a3e"; ctx.fillRect(cx - 12, cy - enemy.height + 23, 7, 4); ctx.fillRect(cx + 5, cy - enemy.height + 23, 7, 4);
    } else if (enemy.enemyType === "wraith") {
        ctx.fillStyle = "rgba(221,105,54,0.28)";
        ctx.beginPath(); ctx.ellipse(cx, cy - 25, 28, 42, 0, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.enemyType === "stalker") {
        ctx.fillStyle = "#a94c35"; ctx.fillRect(cx - 16, cy - enemy.height + 9, 32, 5);
    }
    ctx.restore();
};

// Update wave state after enemy death animations have completed.
const hcOldUpdateWorldTwo = updateWorldTwo;
updateWorldTwo = function () {
    if (worldTwoState.phase !== 2) return;
    worldTwoState.tick++;
    if (worldTwoState.entryTransition.active) {
        worldTwoState.entryTransition.timer++;
        if (worldTwoState.entryTransition.timer >= worldTwoState.entryTransition.duration) {
            worldTwoState.entryTransition.active = false;
        }
    }
    hcUpdateArrows();
    for (const potion of worldTwoState.potions) {
        if (potion.collected) continue;
        const close = Math.hypot(player.x + player.width / 2 - potion.x, player.y + player.height / 2 - potion.y) < 43;
        if (close) {
            potion.collected = true;
            player.health = Math.min(player.maxHealth, player.health + potion.amount);
            showNotification(potion.type === "greater" ? "GREATER HEALTH POTION — HEALTH RESTORED" : "HEALTH POTION — HEALTH RESTORED");
        }
    }
    if (worldTwoState.waveActive && enemies.length === 0) {
        worldTwoState.waveActive = false;
        worldTwoState.waveLockActive = false;
        worldTwoState.activeWaveZone = null;
        worldTwoState.waveIndex++;
        worldTwoState.waitingForNextWave = worldTwoState.waveIndex < worldTwoState.waveZones.length;
        showNotification(worldTwoState.waitingForNextWave ? "AREA CLEARED — MOVE FORWARD" : "THE ABYSS FALLS SILENT");
        if (!worldTwoState.waitingForNextWave) spawnAshenSovereign();
    }
    if (worldTwoState.waitingForNextWave) {
        const nextZone = worldTwoState.waveZones[worldTwoState.waveIndex];
        if (nextZone && player.x >= nextZone.start - 90) hcSpawnWave(worldTwoState.waveIndex);
    }
    if (worldTwoState.waveLockActive && worldTwoState.activeWaveZone) {
        const zone = worldTwoState.activeWaveZone;
        player.x = Math.max(zone.start + 8, Math.min(zone.end - player.width - 8, player.x));
        player.velocityX = 0;
    }
    if (worldTwoState.spearRelic && !worldTwoState.spearCollected) {
        const relic = worldTwoState.spearRelic;
        relic.pulse = (relic.pulse || 0) + 0.08;
        const near = Math.abs(player.x + player.width / 2 - relic.x) < 65 &&
            Math.abs(player.y + player.height - ground.y) < 95;
        if (near && keys["e"]) {
            worldTwoState.spearCollected = true;
            worldTwoState.spearRelic = null;
            showNotification("ANCIENT SPEAR RELIC COLLECTED");
            keys["e"] = false;
        }
    }
    updateWorldTwoLava();
    updateSwingingChains();
    updateWorldTwoProgression();
};

// Camera locks to each wave's frame, not to the boss arena.
const hcCameraBeforeWaves = updateCamera;
updateCamera = function () {
    if (worldTwoState.phase === 2 && worldTwoState.waveLockActive && worldTwoState.activeWaveZone) {
        const fixedX = Math.max(0, Math.min(LEVEL.end - WIDTH, worldTwoState.activeWaveZone.cameraX));
        camera.x = fixedX;
        camera.targetX = fixedX;
        return;
    }
    hcCameraBeforeWaves();
};

// Draw the entry cinematic and potion pickups in world space.
const hcDrawWorldTwoBeforePotions = drawWorldTwo;
drawWorldTwo = function () {
    hcDrawWorldTwoBeforePotions();
    if (worldTwoState.phase !== 2) return;
    for (const potion of worldTwoState.potions) {
        if (potion.collected) continue;
        const bob = Math.sin(worldTwoState.tick * 0.07 + potion.x) * 4;
        const color = potion.type === "greater" ? "#79d7a0" : "#d65b66";
        const glow = ctx.createRadialGradient(potion.x, potion.y + bob, 2, potion.x, potion.y + bob, 30);
        glow.addColorStop(0, potion.type === "greater" ? "rgba(90,230,150,0.35)" : "rgba(230,80,105,0.35)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(potion.x, potion.y + bob, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color; ctx.fillRect(potion.x - 8, potion.y - 12 + bob, 16, 23);
        ctx.fillStyle = "#ead9c2"; ctx.fillRect(potion.x - 5, potion.y - 17 + bob, 10, 6);
        ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(potion.x - 4, potion.y - 7 + bob, 3, 10);
    }
    hcDrawArrows();
};

function drawWorldTwoEntryTransition() {
    const tr = worldTwoState.entryTransition;
    if (!tr || !tr.active) return;
    const progress = tr.timer / tr.duration;
    const alpha = Math.max(0, progress < 0.48 ? 1 - progress / 0.48 : (progress - 0.48) / 0.52);
    ctx.save();
    ctx.fillStyle = `rgba(5,4,9,${Math.min(0.94, alpha * 0.94)})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (progress > 0.18 && progress < 0.82) {
        ctx.globalAlpha = Math.min(1, (progress - 0.18) * 5, (0.82 - progress) * 5);
        ctx.textAlign = "center";
        ctx.fillStyle = "#e7a56a";
        ctx.font = "bold 30px Georgia";
        ctx.fillText("WORLD II", WIDTH / 2, HEIGHT / 2 - 14);
        ctx.fillStyle = "#f0dfc8";
        ctx.font = "17px Georgia";
        ctx.fillText("THE ASHEN ABYSS", WIDTH / 2, HEIGHT / 2 + 24);
    }
    ctx.restore();
}

// A clean World II reset when the player restarts from the ending screen.
const hcRestartBeforeWaveSystem = restartGame;
restartGame = function () {
    hcRestartBeforeWaveSystem();
    worldTwoState.waveIndex = 0;
    worldTwoState.waveLockActive = false;
    worldTwoState.activeWaveZone = null;
    worldTwoState.waitingForNextWave = false;
    worldTwoState.projectiles = [];
    worldTwoState.potions = [];
    worldTwoState.entryTransition = { active: false, timer: 0, duration: 115 };
};

// ============================================================
 // MAIN GAME LOOP — WORLD I + WORLD II + FINAL ENDING
 // ============================================================

function gameLoop(time = 0) {
    gameTime = time;

    if (!player.gameOver && !player.levelComplete) {
        updateMovingPlatforms();

        updatePlayer();

        updateEnemies();
        checkSwordHit();

        checkSpikeCollision();
        updateFallingRocks();

        updateCheckpoints();
        updateRelics();
        updateAncientGate();
        updateWorldTwo();

        // Existing Phase 3 systems
        updatePowerUps();
        updateGothicCoins();
        updatePickups();
        updateSecretBlocks();

    }

    updateCamera();

    // BACKGROUND
    drawBackground();

    // WORLD SPACE
    ctx.save();
    ctx.translate(-camera.x, 0);

    drawEnvironment(time);
    drawGround();
    drawPlatforms();

    drawCheckpoints();
    drawRelics();

    drawGothicCoins();
    drawPickups();
    drawSecretBlocks();

    drawSpikeTraps();
    drawFallingRocks();
    drawAncientGate();
    drawWorldTwo();

    for (const enemy of enemies) {
        drawEnemy(enemy);
    }

    drawPlayer();

    ctx.restore();

    // SCREEN SPACE EFFECTS
    updateAndDrawFog();
    drawEnvironmentalLighting(time);

    // HUD
    drawPlayerHealth();
    drawCoinHUD();
    drawPowerUpHUD();

    drawLevelProgress();
    drawControlsHint();

    if (worldTwoState.phase === 1) {
        drawBossHUD();
    } else {
        drawWorldTwoBossHUD();
    }

    drawNotification();
    drawWorldTwoEntryTransition();

    drawGameOver();
    drawLevelComplete();
    drawFinalEnding();

    requestAnimationFrame(gameLoop);
}

// START
player.grounded = true;

console.log("THE HOLLOW CROWN — WORLD I + WORLD II READY");
console.log("World II:", WORLD_TWO);
console.log("World II enemies:", "3 sequential waves + Ashen Sovereign");
console.log("Final boss: THE ASHEN SOVEREIGN");

gameLoop();

