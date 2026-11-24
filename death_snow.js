
// ============================================================================
// THE HOLLOW CROWN — WORLD III: THE DEATH SNOW
// Complete replacement module
// Load after game.js and world2_fix.js.
// ============================================================================

(() => {
"use strict";

// ---------------------------------------------------------------------------
// 1. WORLD CONFIGURATION
// ---------------------------------------------------------------------------

const DEATH_SNOW = {
    start: 13900,
    end: 26600,
    gateX: 13970,
    sanctumGateX: 23100,
    bossX: [19200, 21100, 22500, 25800],
    finalGateX: 26400
};

LEVEL.end = DEATH_SNOW.end;
ground.width = LEVEL.end;

const DS_ZONES = [
    {start:13900,end:15800,name:"THE FROSTBOUND PASS",
     top:"#101d31",bottom:"#536b83",far:"#263c52",near:"#17283a",ground:"#53616e",accent:"#d9edf7"},
    {start:15800,end:18100,name:"THE WHITEFANG RIDGE",
     top:"#101b2b",bottom:"#71869a",far:"#30485e",near:"#1d3448",ground:"#667582",accent:"#e4f4fc"},
    {start:18100,end:20500,name:"THE PALE HUNTING GROUNDS",
     top:"#0c1829",bottom:"#526c83",far:"#243d54",near:"#142b40",ground:"#4c5d6d",accent:"#c5e8f5"},
    {start:20500,end:22900,name:"THE GLACIAL CATHEDRAL",
     top:"#0b1728",bottom:"#425d78",far:"#203c56",near:"#122a43",ground:"#536477",accent:"#bdeaff"},
    {start:22900,end:23300,name:"THE SEALED FROST GATE",
     top:"#080f20",bottom:"#344d6a",far:"#1b304b",near:"#101f36",ground:"#3d5065",accent:"#d7f5ff"},
    {start:23300,end:26600,name:"THE FROZEN SANCTUM",
     top:"#071426",bottom:"#294967",far:"#152d48",near:"#0c2038",ground:"#344e65",accent:"#dff8ff"}
];

for (const z of DS_ZONES) {
    AREA_ZONES.push({
        start:z.start,end:z.end,name:z.name,
        skyTop:z.top,skyBottom:z.bottom,
        ground:z.ground,groundTop:"#e5f4fb",
        far:z.far,near:z.near,accent:z.accent,
        fog:"rgba(205,229,244,0.18)",type:"snow"
    });
}

function dsZone() {
    const x = deathSnowState.region === "sanctum"
        ? Math.max(23300, player.x)
        : player.x;
    return DS_ZONES.find(z => x >= z.start && x < z.end) || DS_ZONES[0];
}

function dsRand(n) {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
}

// ---------------------------------------------------------------------------
// DEATH SNOW SPRITE SHEETS — Ice Hound + Ice Golem
// The supplied PNGs use a flat #3a404c matte. Convert that matte to alpha once
// after load so the sprites render cleanly over the game world.
// ---------------------------------------------------------------------------

function dsLoadSpriteSheet(src) {
    const image = new Image();
    const sheet = { image, canvas: null, ready: false };

    image.onload = function () {
        const surface = document.createElement("canvas");
        surface.width = image.naturalWidth;
        surface.height = image.naturalHeight;

        const surfaceCtx = surface.getContext("2d", { willReadFrequently: true });
        surfaceCtx.drawImage(image, 0, 0);

        const pixels = surfaceCtx.getImageData(0, 0, surface.width, surface.height);
        const data = pixels.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 58 && data[i + 1] === 64 && data[i + 2] === 76) {
                data[i + 3] = 0;
            }
        }

        surfaceCtx.putImageData(pixels, 0, 0);
        sheet.canvas = surface;
        sheet.ready = true;
    };

    image.onerror = function () {
        console.warn("Death Snow sprite sheet failed to load:", src);
    };

    image.src = src;
    return sheet;
}

const DS_SPRITES = {
    hound: dsLoadSpriteSheet("assets/death-snow/ice-hound.png"),
    golem: dsLoadSpriteSheet("assets/death-snow/ice-golem.png")
};

// Frame rectangles are measured from the supplied, irregularly packed sheets.
const DS_SPRITE_FRAMES = {
    hound: [
        { x: 24,  y: 66,  w: 252, h: 123 },
        { x: 357, y: 27,  w: 249, h: 165 },
        { x: 663, y: 0,   w: 324, h: 123 },
        { x: 111, y: 198, w: 168, h: 189 }
    ],
    golem: [
        { x: 120, y: 53, w: 187, h: 233 },
        { x: 540, y: 53, w: 177, h: 230 },
        { x: 920, y: 97, w: 257, h: 186 }
    ]
};

function dsDrawSpriteSheetEnemy(enemy, kind) {
    const sheet = DS_SPRITES[kind];
    const frames = DS_SPRITE_FRAMES[kind];
    if (!sheet || !sheet.ready || !frames || !frames.length) return false;

    const lastX = enemy._dsSpriteLastX;
    const moving = lastX !== undefined && Math.abs(enemy.x - lastX) > 0.05;
    enemy._dsSpriteLastX = enemy.x;

    if (moving) enemy._dsSpriteAnimTick = (enemy._dsSpriteAnimTick || 0) + 1;
    else enemy._dsSpriteAnimTick = 0;

    let frameIndex = 0;
    if (enemy.state === "death" || enemy.state === "dead") {
        frameIndex = frames.length - 1;
    } else if (moving && frames.length > 1) {
        frameIndex = 1 + (Math.floor(enemy._dsSpriteAnimTick / 8) % (frames.length - 1));
    }

    const frame = frames[frameIndex];
    const scale = Math.min(enemy.width / frame.w, enemy.height / frame.h);
    const drawWidth = frame.w * scale;
    const drawHeight = frame.h * scale;
    const drawX = enemy.x + (enemy.width - drawWidth) / 2;
    const drawY = enemy.y + enemy.height - drawHeight;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const spriteFacing = enemy.facing || 1;
    ctx.translate(enemy.x + enemy.width / 2, 0);
    ctx.scale(spriteFacing, 1);
    ctx.drawImage(
        sheet.canvas,
        frame.x, frame.y, frame.w, frame.h,
        drawX - (enemy.x + enemy.width / 2),
        drawY,
        drawWidth,
        drawHeight
    );
    ctx.restore();
    return true;
}

function dsOverlap(a,b) {
    return a.x < b.x+b.width && a.x+a.width > b.x &&
           a.y < b.y+b.height && a.y+a.height > b.y;
}

// ---------------------------------------------------------------------------
// 2. STATE
// ---------------------------------------------------------------------------

const deathSnowState = {
    active:false,
    tick:0,
    entryTimer:0,
    checkpoint:14080,

    flightTime:0,
    flightMax:720,
    flightCooldown:0,
    potions:[],

    fakeBlocks:[],
    slidingBlocks:[],
    fallingBlocks:[],

    birds:[],
    birdLeader:null,
    birdMinions:[],

    particles:[],
    waveIndex:0,
    waveActive:false,
    activeWave:null,

    bossIndex:-1,
    bossActive:false,
    bossDefeated:[false,false,false,false],
    bossGateOpen:[false,false,false],

    bossRelic:null,
    ancientWeaponCollected:false,
    finalGateOpen:false,

    cameraLock:null,
    wind:0,
    transition:0,
    victory:false,

    region:"mountains",
    sanctumWaveActive:false,
    sanctumEntered:false,

    mountainShake:0
};

// ---------------------------------------------------------------------------
// 3. MOUNTAIN TERRAIN
// ---------------------------------------------------------------------------

const deathSnowPlatforms = [
    {x:14130,y:390,width:170,height:16},
    {x:14400,y:335,width:145,height:16},
    {x:14650,y:285,width:150,height:16},
    {x:14920,y:330,width:150,height:16},
    {x:15180,y:270,width:175,height:16},
    {x:15480,y:345,width:155,height:16},

    {x:15760,y:300,width:170,height:16},
    {x:16040,y:250,width:155,height:16},
    {x:16320,y:205,width:160,height:16},
    {x:16600,y:285,width:170,height:16},
    {x:17180,y:355,width:170,height:16},
    {x:17450,y:300,width:160,height:16},
    {x:17720,y:250,width:175,height:16},
    {x:18020,y:315,width:165,height:16},

    {x:18320,y:270,width:165,height:16},
    {x:18600,y:220,width:175,height:16},
    {x:18900,y:315,width:170,height:16},
    {x:19450,y:350,width:160,height:16},
    {x:19720,y:295,width:170,height:16},
    {x:20000,y:240,width:175,height:16},
    {x:20300,y:305,width:165,height:16},

    {x:20600,y:260,width:170,height:16},
    {x:20900,y:210,width:170,height:16},
    {x:21200,y:315,width:180,height:16},
    {x:21700,y:350,width:170,height:16},
    {x:22000,y:295,width:170,height:16},
    {x:22300,y:245,width:180,height:16},
    {x:22600,y:300,width:170,height:16},
    {x:23000,y:340,width:170,height:16},

    {x:23300,y:285,width:180,height:16},
    {x:23600,y:235,width:180,height:16},
    {x:24000,y:325,width:180,height:16},
    {x:24400,y:270,width:180,height:16},
    {x:24800,y:220,width:180,height:16},
    {x:25200,y:310,width:180,height:16}
].map(p => ({...p,deathSnow:true}));

platforms.push(...deathSnowPlatforms);

// Moving ice platforms. They remain ordinary engine platforms.
const dsSlidingSpecs = [
    {x:16820,y:335,width:145,height:16,min:16760,max:17040,speed:1.15,axis:"x"},
    {x:19050,y:280,width:145,height:16,min:18980,max:19220,speed:1.3,axis:"x"},
    {x:21400,y:270,width:150,height:16,min:21320,max:21600,speed:1.0,axis:"x"},
    {x:24550,y:285,width:150,height:16,min:24480,max:24720,speed:1.1,axis:"x"}
];

for (const spec of dsSlidingSpecs) {
    const p = {
        x:spec.x,y:spec.y,width:spec.width,height:spec.height || 16,
        deathSnow:true,deathSnowSliding:true,
        minX:spec.min,maxX:spec.max,
        slideSpeed:spec.speed,slideDirection:1
    };
    deathSnowState.slidingBlocks.push(p);
    platforms.push(p);
}

// False ledges.
const dsFakeSpecs = [
    [14530,300,112],[15220,230,110],[15920,260,112],
    [16500,185,108],[17620,210,112],[18450,230,108],
    [19830,265,110],[20820,225,112],[22120,255,110],
    [23450,245,112],[24950,230,110]
];

for (const [x,y,width] of dsFakeSpecs) {
    const p = {
        x,y,width,height:16,
        deathSnow:true,deathSnowFake:true,
        collapsed:false,crumble:0,crumbleMax:34,warning:0
    };
    deathSnowState.fakeBlocks.push(p);
    platforms.push(p);
}

// ---------------------------------------------------------------------------
// 4. PARTICLES AND RESET
// ---------------------------------------------------------------------------

function dsParticle(x,y,vx,vy,size,life,kind="snow",damage=0) {
    deathSnowState.particles.push({
        x,y,vx,vy,size,life,maxLife:life,kind,damage
    });
}

function dsBurst(x,y,count=12,kind="ice") {
    for(let i=0;i<count;i++) {
        const a = Math.PI*2*i/count + Math.random()*0.3;
        const s = 1 + Math.random()*3;
        dsParticle(
            x,y,Math.cos(a)*s,Math.sin(a)*s-1,
            2+Math.random()*3,28+Math.random()*25,kind
        );
    }
}

function dsResetWorld() {
    deathSnowState.active = false;
    deathSnowState.tick = 0;
    deathSnowState.flightTime = 0;
    deathSnowState.region = "mountains";
    deathSnowState.checkpoint = 14080;

    deathSnowState.potions = [];
    deathSnowState.birds = [];
    deathSnowState.birdLeader = null;
    deathSnowState.birdMinions = [];
    deathSnowState.particles = [];

    deathSnowState.waveIndex = 0;
    deathSnowState.waveActive = false;
    deathSnowState.activeWave = null;

    deathSnowState.bossIndex = -1;
    deathSnowState.bossActive = false;
    deathSnowState.bossDefeated = [false,false,false,false];
    deathSnowState.bossGateOpen = [false,false,false];

    deathSnowState.bossRelic = null;
    deathSnowState.ancientWeaponCollected = false;
    deathSnowState.finalGateOpen = false;
    deathSnowState.cameraLock = null;
    deathSnowState.victory = false;

    deathSnowState.sanctumWaveActive = false;
    deathSnowState.sanctumEntered = false;

    for (const p of deathSnowState.fakeBlocks) {
        p.collapsed = false;
        p.crumble = 0;
        p.warning = 0;
        if (!platforms.includes(p)) platforms.push(p);
    }

    for (const p of deathSnowState.slidingBlocks) {
        if (!platforms.includes(p)) platforms.push(p);
    }
}
window.dsResetWorld = dsResetWorld;

// ---------------------------------------------------------------------------
// 5. WORLD ENTRY
// ---------------------------------------------------------------------------

const deathSnowGate = {
    x:DEATH_SNOW.gateX,
    y:ground.y-190,
    width:110,
    height:190,
    opening:0,
    unlocked:false
};

function dsEnterWorld() {
    worldTwoState.phase = 4;
    deathSnowState.active = true;
    deathSnowState.region = "mountains";
    deathSnowState.transition = 150;

    player.x = DEATH_SNOW.start+85;
    player.y = ground.y-player.height;
    player.velocityX = 0;
    player.velocityY = 0;
    player.grounded = true;
    player.health = player.maxHealth;
    player.checkpointX = player.x;

    deathSnowState.checkpoint = player.x;

    camera.x = DEATH_SNOW.start;
    camera.targetX = DEATH_SNOW.start;

    enemies.length = 0;
    dsCreatePotions();
    dsSpawnWave(0);

    showNotification("WORLD III — THE DEATH SNOW");
}

function updateDeathSnowEntrance() {
    if(worldTwoState.phase !== 3 || deathSnowState.active) return;

    const throneJourneyComplete = !!(
        worldTwoState.bossDefeated &&
        worldTwoState.spearCollected &&
        endingSequence.finished
    );

    // World III starts automatically after the throne cinematic.
    // No extra portal interaction or CONTINUE/game-over screen is required.
    if(throneJourneyComplete) {
        deathSnowGate.unlocked = true;
        dsEnterWorld();
        endingSequence.active = false;
        endingSequence.finished = false;
        endingSequence.timer = 0;
        keys.e = false;
    }
}

// ---------------------------------------------------------------------------
// 6. POTIONS AND PICKUPS
// ---------------------------------------------------------------------------

function dsCreatePotions() {
    deathSnowState.potions = [
        {x:14310,y:285,kind:"flight",amount:540,label:"FLIGHT ELIXIR"},
        {x:15050,y:220,kind:"health",amount:28,label:"FROSTBLOOM TONIC"},
        {x:15790,y:250,kind:"flight",amount:600,label:"FLIGHT ELIXIR"},
        {x:17400,y:235,kind:"health",amount:35,label:"FROSTBLOOM TONIC"},
        {x:18280,y:205,kind:"flight",amount:660,label:"GREATER FLIGHT ELIXIR"},
        {x:19900,y:215,kind:"health",amount:40,label:"FROSTBLOOM TONIC"},
        {x:20850,y:180,kind:"flight",amount:720,label:"GREATER FLIGHT ELIXIR"},
        {x:22520,y:215,kind:"health",amount:45,label:"FROSTBLOOM TONIC"},
        {x:23900,y:205,kind:"health",amount:45,label:"SANCTUM TONIC"},
        {x:25000,y:185,kind:"flight",amount:720,label:"SANCTUM FLIGHT"}
    ].map(p => ({
        ...p,width:25,height:34,
        bob:Math.random()*6,used:false
    }));
}

function dsUpdatePotions() {
    for(const p of deathSnowState.potions) {
        if(p.used) continue;
        p.bob += 0.055;

        const box = {
            x:p.x-4,
            y:p.y+Math.sin(p.bob)*5,
            width:p.width+8,
            height:p.height+8
        };

        if(dsOverlap(player,box)) {
            p.used = true;

            if(p.kind === "flight") {
                deathSnowState.flightTime = Math.min(
                    deathSnowState.flightMax,
                    deathSnowState.flightTime+p.amount
                );
                showNotification(p.label+" — FLIGHT AWAKENED");
            } else {
                player.health = Math.min(
                    player.maxHealth,
                    player.health+p.amount
                );
                showNotification(p.label+" — HEALTH RESTORED");
            }

            dsBurst(p.x,p.y,20,"ice");
        }
    }
}

// ---------------------------------------------------------------------------
// 7. ENEMY CREATION AND ENCOUNTERS
// ---------------------------------------------------------------------------

const dsWaveZones = [
    {
        start:14100,end:15350,cameraX:14020,
        spawns:[
            {x:14360,name:"FROST PAW",health:3,speed:1.5,damage:5,patrol:130,type:"hound"},
            {x:14750,name:"ICE RAVEN",health:3,speed:1.7,damage:5,patrol:160,type:"raven",flying:true},
            {x:15100,name:"SNOW LEOPARD",health:5,speed:1.8,damage:5,patrol:180,type:"leopard"}
        ]
    },
    {
        start:15600,end:16800,cameraX:15520,
        spawns:[
            {x:15880,name:"GLACIER HOUND",health:3,speed:1.6,damage:5,patrol:160,type:"hound"},
            {x:16200,name:"ICE RAVEN",health:3,speed:1.8,damage:5,patrol:170,type:"raven",flying:true},
            {x:16500,name:"FROST PAW ELITE",health:3,speed:1.8,damage:5,patrol:190,type:"hound"}
        ]
    },
    {
        start:17900,end:19000,cameraX:17820,
        spawns:[
            {x:18180,name:"WHITEFANG STALKER",health:3,speed:1.8,damage:5,patrol:180,type:"hound"},
            {x:18550,name:"ICE RAVEN",health:3,speed:1.9,damage:5,patrol:190,type:"raven",flying:true},
            {x:18800,name:"SNOW LEOPARD ELITE",health:5,speed:1.9,damage:5,patrol:200,type:"leopard"}
        ]
    }
];

function dsConfigureEnemy(e,d) {
    e.deathSnowEnemy = true;
    e.deathSnowType = d.type || "hound";
    e.deathSnowFlying = !!d.flying;
    e.deathSnowClimber = !d.flying;
    e.attackCooldown = 60;
    e.damage = 5;
    e.maxHealth = d.health;
    e.health = d.health;

    e.patrolStart = d.x-(d.patrol || 150);
    e.patrolEnd = d.x+(d.patrol || 150);

    if(e.deathSnowType === "leopard") {
        e.width = 62;
        e.height = 48;
        e.y = ground.y-e.height;
    }

    if(e.deathSnowType === "hound") {
        e.width = 82;
        e.height = 48;
        e.y = ground.y-e.height;
    }

    if(e.deathSnowType === "golem") {
        e.width = 76;
        e.height = 92;
        e.y = ground.y-e.height;
    }

    if(e.deathSnowFlying) {
        e.width = 46;
        e.height = 40;
        e.y = 230;
        e.homeY = 220;
        e.flightPhase = Math.random()*6;
    }

    return e;
}

function dsSpawnWave(index) {
    const z = dsWaveZones[index];
    if(!z) return;

    enemies.length = 0;

    deathSnowState.waveIndex = index;
    deathSnowState.waveActive = true;
    deathSnowState.activeWave = z;
    deathSnowState.cameraLock = {x:z.cameraX,width:WIDTH};

    for(const d of z.spawns) {
        const e = createEnemy(d.x,{
            name:d.name,
            health:d.health,
            speed:d.speed,
            damage:5,
            patrol:d.patrol,
            detectionRange:520,
            attackRange:65
        });

        dsConfigureEnemy(e,d);
        enemies.push(e);
    }

    // The primary Ice Raven joins the final mountain encounter.
    if(index === 2) {
        const leader = createEnemy(18720,{
            name:"THE STORM RAVEN",
            health:8,
            speed:2.0,
            damage:5,
            patrol:240,
            detectionRange:800,
            attackRange:75
        });

        leader.width = 76;
        leader.height = 62;
        leader.y = 180;
        leader.deathSnowEnemy = true;
        leader.deathSnowFlying = true;
        leader.deathSnowType = "raven";
        leader.deathSnowBirdLeader = true;
        leader.homeY = 175;
        leader.flightPhase = 0;
        leader.maxHealth = 8;
        leader.health = 8;

        deathSnowState.birdLeader = leader;
        enemies.push(leader);
    }

    showNotification("FROSTBOUND ENCOUNTER "+(index+1));
}

// ---------------------------------------------------------------------------
// 8. BOSSES
// ---------------------------------------------------------------------------

function dsSpawnBoss(index) {
    if(deathSnowState.bossDefeated[index] || deathSnowState.bossActive) return;

    const data = [
        {
            name:"THE GIANT YETI",x:DEATH_SNOW.bossX[0],
            health:24,width:142,height:150,speed:1.0,type:"yeti"
        },
        {
            name:"THE WHITEFANG MATRIARCH",x:DEATH_SNOW.bossX[1],
            health:25,width:150,height:108,speed:1.8,type:"snowleopard"
        },
        {
            name:"THE GLACIER DEVOURER",x:DEATH_SNOW.bossX[2],
            health:28,width:190,height:128,speed:1.4,type:"wyrm"
        },
        {
            name:"THE ANCIENT SNOW GOD",x:DEATH_SNOW.bossX[3],
            health:36,width:190,height:230,speed:1.1,type:"snowgod"
        }
    ][index];

    enemies.length = 0;

    const b = createEnemy(data.x,{
        boss:true,
        name:data.name,
        health:data.health,
        speed:data.speed,
        damage:10,
        detectionRange:1300,
        attackRange:150,
        patrol:480
    });

    b.x = data.x;
    b.width = data.width;
    b.height = data.height;
    b.y = data.type === "wyrm" ? 205 : ground.y-b.height;

    b.maxHealth = data.health;
    b.health = data.health;
    b.damage = 10;
    b.deathSnowBoss = true;
    b.deathSnowBossIndex = index;
    b.deathSnowType = data.type;
    b.phase = 1;
    b.attackCooldown = 75;
    b.patrolStart = data.x-470;
    b.patrolEnd = data.x+470;

    enemies.push(b);

    deathSnowState.bossIndex = index;
    deathSnowState.bossActive = true;
    deathSnowState.waveActive = false;
    deathSnowState.activeWave = null;
    deathSnowState.cameraLock = {
        x:Math.max(DEATH_SNOW.start,data.x-WIDTH*0.52),
        width:WIDTH
    };

    showNotification(data.name+" AWAKENS");
}

function dsBossDefeated(index,boss) {
    if(deathSnowState.bossDefeated[index]) return;

    deathSnowState.bossDefeated[index] = true;
    deathSnowState.bossActive = false;
    deathSnowState.cameraLock = null;

    dsBurst(
        boss.x+boss.width/2,
        boss.y+boss.height/2,
        38,"ice"
    );

    if(index < 3) {
        deathSnowState.bossGateOpen[index] = true;
        showNotification(
            index === 2
                ? "THE FROZEN SANCTUM GATE HAS OPENED"
                : boss.name+" HAS FALLEN — THE PASS OPENS"
        );
    } else {
        deathSnowState.bossRelic = {
            x:boss.x+boss.width/2-18,
            y:ground.y-68,
            width:36,
            height:58,
            pulse:0
        };
        showNotification("THE ANCIENT SNOW GOD IS SILENT");
    }
}

// ---------------------------------------------------------------------------
// 9. PLAYER FLIGHT
// ---------------------------------------------------------------------------

const dsBaseUpdatePlayer = updatePlayer;

updatePlayer = function() {
    dsBaseUpdatePlayer();

    if(worldTwoState.phase !== 4 || !deathSnowState.active) return;

    if(deathSnowState.flightTime > 0) {
        deathSnowState.flightTime--;

        player.grounded = false;
        player.standingPlatform = null;
        player.velocityY = 0;

        if(keys[" "] || keys.space || keys.arrowup || keys.w) {
            player.y -= 2.65;
        } else if(keys.arrowdown || keys.s) {
            player.y += 2.35;
        } else {
            player.y += Math.sin(deathSnowState.tick*0.08)*0.28;
        }

        player.y = Math.max(
            48,
            Math.min(ground.y-player.height-2,player.y)
        );

        if(player.y+player.height >= ground.y-2) {
            player.y = ground.y-player.height;
            player.grounded = true;
            deathSnowState.flightTime = 0;
        }
    }
};

// ---------------------------------------------------------------------------
// 10. ENEMY AI
// ---------------------------------------------------------------------------

const dsBaseUpdateEnemy = updateEnemy;

updateEnemy = function(enemy) {
    if(worldTwoState.phase !== 4 ||
       !deathSnowState.active ||
       !enemy.deathSnowEnemy) {
        dsBaseUpdateEnemy(enemy);
        return;
    }

    if(enemy.state === "death" || enemy.state === "dead") {
        dsBaseUpdateEnemy(enemy);
        return;
    }

    if(enemy.state === "damage") {
        advanceAnimation(enemy.animation,ENEMY_ANIMATIONS);
        enemy.stunTimer--;
        if(enemy.stunTimer <= 0 && enemy.animation.finished) {
            setEnemyState(enemy,"idle");
        }
        return;
    }

    if(enemy.attackCooldown > 0) enemy.attackCooldown--;

    const dx =
        (player.x+player.width/2)-
        (enemy.x+enemy.width/2);

    enemy.facing = dx < 0 ? -1 : 1;

    if(enemy.deathSnowFlying) {
        enemy.flightPhase = (enemy.flightPhase || 0)+0.055;

        const targetY =
            (enemy.homeY || 220)+Math.sin(enemy.flightPhase)*28;

        enemy.y += (targetY-enemy.y)*0.035;

        if(Math.abs(dx) < enemy.detectionRange) {
            enemy.x += Math.sign(dx)*enemy.speed*0.65;
        }

        if(Math.abs(dx) < 78 &&
           Math.abs(player.y+player.height/2-
           (enemy.y+enemy.height/2)) < 75 &&
           enemy.attackCooldown <= 0) {

            damagePlayer(5);
            enemy.attackCooldown = 90;
        }

        if(enemy.deathSnowBirdLeader && deathSnowState.tick%95===0) {
            dsReleaseMinions(enemy);
        }

        enemy.x = Math.max(
            enemy.patrolStart,
            Math.min(enemy.patrolEnd,enemy.x)
        );

        advanceAnimation(enemy.animation,ENEMY_ANIMATIONS);
        return;
    }

    if(Math.abs(dx) < enemy.detectionRange) {
        enemy.x += Math.sign(dx)*enemy.speed;
    }

    enemy.x = Math.max(
        enemy.patrolStart,
        Math.min(enemy.patrolEnd,enemy.x)
    );

    if(Math.abs(dx) < enemy.attackRange &&
       Math.abs(player.y+player.height-(enemy.y+enemy.height)) < 75 &&
       enemy.attackCooldown <= 0) {

        damagePlayer(5);
        enemy.attackCooldown = 90;
    }

    setEnemyState(
        enemy,
        Math.abs(dx)>enemy.attackRange ? "walk" : "idle"
    );

    advanceAnimation(enemy.animation,ENEMY_ANIMATIONS);
};

// ---------------------------------------------------------------------------
// 11. STORM RAVEN MINIONS
// ---------------------------------------------------------------------------

function dsReleaseMinions(leader) {
    if(!leader || leader.state === "death" || leader.state === "dead") return;
    if(deathSnowState.birdMinions.length >= 5) return;

    for(let i=0;i<2;i++) {
        deathSnowState.birdMinions.push({
            x:leader.x+(Math.random()*50-25),
            y:leader.y+20,
            width:19,
            height:14,
            vx:(player.x>leader.x?1:-1)*(2.3+Math.random()),
            vy:0,
            life:180,
            cooldown:0,
            phase:Math.random()*6
        });
    }
}

function dsUpdateBirdMinions() {
    const leader = deathSnowState.birdLeader;

    if(!leader || leader.state === "death" || leader.state === "dead") {
        deathSnowState.birdMinions.length = 0;
        return;
    }

    for(let i=deathSnowState.birdMinions.length-1;i>=0;i--) {
        const b = deathSnowState.birdMinions[i];

        b.life--;
        b.phase += 0.12;

        b.x += b.vx;
        b.y += Math.sin(b.phase)*1.1;

        if(b.cooldown>0) b.cooldown--;

        if(dsOverlap(b,player) && b.cooldown<=0) {
            damagePlayer(5);
            b.cooldown = 65;
            b.life = 0;
        }

        if(b.life<=0) deathSnowState.birdMinions.splice(i,1);
    }
}

// ---------------------------------------------------------------------------
// 12. BOSS AI — FIXED DAMAGE
// ---------------------------------------------------------------------------

function dsBossProjectile(b,x,y,vx,vy) {
    dsParticle(x,y,vx,vy,10,110,"icebolt",10);
}

function dsUpdateBossAI(b) {
    if(!b || b.state==="death" || b.state==="dead") return;

    const dx =
        (player.x+player.width/2)-
        (b.x+b.width/2);

    const dist = Math.abs(dx);

    b.facing = dx<0 ? -1 : 1;
    b.dsTimer = (b.dsTimer||0)+1;

    if(b.attackCooldown>0) b.attackCooldown--;

    if(b.deathSnowType==="yeti") {
        if(dist>115) b.x += Math.sign(dx)*b.speed;

        if(b.dsTimer%190===0 && dist<430) {
            b.dsLeap = 35;
            b.velocityY = -11;
        }

        if(b.dsLeap>0) {
            b.dsLeap--;
            b.x += Math.sign(dx)*1.8;
        }

        if(dist<125 && b.attackCooldown<=0) {
            damagePlayer(10);
            player.velocityX = b.facing*5;
            player.velocityY = -4;
            b.attackCooldown = 100;
            dsBurst(player.x+16,player.y+25,12,"snow");
        }
    }

    else if(b.deathSnowType==="snowleopard") {
        if(dist>90) b.x += Math.sign(dx)*b.speed;

        if(b.dsPounce===undefined) b.dsPounce=0;

        if(b.dsTimer%145===0 && dist<480) {
            b.dsPounce=30;
            b.velocityY=-8;
        }

        if(b.dsPounce>0) {
            b.dsPounce--;
            b.x += Math.sign(dx)*2.8;
        }

        if(dist<105 && b.attackCooldown<=0) {
            damagePlayer(10);
            player.velocityX=b.facing*5;
            b.attackCooldown=90;
        }
    }

    else if(b.deathSnowType==="wyrm") {
        b.y = 205+Math.sin(b.dsTimer*0.035)*60;

        if(dist>130) b.x += Math.sign(dx)*b.speed;

        if(b.attackCooldown<=0 && dist<650) {
            dsBossProjectile(
                b,b.x+b.width/2,b.y+b.height/2,
                Math.sign(dx)*4.5,0
            );
            b.attackCooldown=115;
        }
    }

    else if(b.deathSnowType==="snowgod") {
        if(dist>170) b.x += Math.sign(dx)*b.speed*0.7;

        if(b.health/b.maxHealth<0.5 && b.phase===1) {
            b.phase=2;
            b.width=205;
            b.height=245;
            b.y=ground.y-b.height;
            showNotification("THE SNOW GOD REVEALS ITS ETERNAL FORM");
            dsBurst(b.x+b.width/2,b.y+70,35,"ice");
        }

        // Projectile and close-range attacks use independent cooldowns.
        // The old shared cooldown was reset by the projectile branch, making
        // the melee branch unreachable.
        b.projectileCooldown = Math.max(0,(b.projectileCooldown ?? 70)-1);
        b.meleeCooldown = Math.max(0,(b.meleeCooldown ?? 35)-1);

        if(b.projectileCooldown<=0 && dist<900) {
            dsBossProjectile(
                b,b.x+b.width/2,b.y+75,
                Math.sign(dx)*(b.phase===2?5.5:4),
                b.phase===2?-0.8:0
            );
            b.projectileCooldown=b.phase===2?78:105;
        }

        if(dist<155 && b.meleeCooldown<=0 &&
           Math.abs((player.y+player.height)-(b.y+b.height))<100) {
            damagePlayer(12);
            player.velocityX=b.facing*6;
            player.velocityY=-4.5;
            b.meleeCooldown=b.phase===2?78:100;
            dsBurst(player.x+player.width/2,player.y+24,18,"ice");
            showNotification("THE SNOW GOD STRIKES");
        }
    }

    b.x=Math.max(
        b.patrolStart,
        Math.min(b.patrolEnd,b.x)
    );
}

// ---------------------------------------------------------------------------
// 13. DAMAGE AND BOSS DEATH
// ---------------------------------------------------------------------------

const dsBaseDamageEnemy = damageEnemy;

damageEnemy = function(enemy) {
    if(worldTwoState.phase!==4 || !enemy) {
        dsBaseDamageEnemy(enemy);
        return;
    }

    if(enemy.deathSnowBirdLeader &&
       (enemy.state==="death" || enemy.state==="dead")) return;

    const wasAlive =
        enemy.state!=="death" &&
        enemy.state!=="dead";

    // The Ancient Winter Weapon is a combat weapon, not only a gate key.
    // Against the Snow God each successful sword hit deals three damage.
    if(enemy.deathSnowType==="snowgod" &&
       deathSnowState.ancientWeaponCollected) {
        for(let strike=0;strike<3;strike++) {
            if(enemy.state==="death" || enemy.state==="dead") break;
            dsBaseDamageEnemy(enemy);
        }
    } else {
        dsBaseDamageEnemy(enemy);
    }

    if(wasAlive && enemy.state==="death") {
        if(enemy.deathSnowBoss) {
            dsBossDefeated(enemy.deathSnowBossIndex,enemy);
        }

        if(enemy.deathSnowBirdLeader) {
            deathSnowState.birdMinions.length=0;
            deathSnowState.birdLeader=null;
            showNotification("THE STORM RAVEN HAS FALLEN");
        }
    }
};

// ---------------------------------------------------------------------------
// 14. SLIDING AND COLLAPSING TERRAIN
// ---------------------------------------------------------------------------

function dsUpdateSlidingBlocks() {
    for(const p of deathSnowState.slidingBlocks) {
        const oldX=p.x;

        p.x += p.slideSpeed*p.slideDirection;

        if(p.x<p.minX || p.x+p.width>p.maxX) {
            p.slideDirection *= -1;
            p.x += p.slideSpeed*p.slideDirection*2;
        }

        // Carry the player when standing on a moving block.
        if(player.grounded &&
           player.y+player.height<=p.y+5 &&
           player.y+player.height>=p.y-5 &&
           player.x+player.width>oldX &&
           player.x<oldX+p.width) {
            player.x += p.x-oldX;
        }
    }
}

function dsUpdateFakeBlocks() {
    for(const p of deathSnowState.fakeBlocks) {
        if(p.collapsed) continue;

        const standing =
            player.grounded &&
            player.x+player.width>p.x &&
            player.x<p.x+p.width &&
            Math.abs(player.y+player.height-p.y)<7;

        if(standing) {
            p.crumble++;
            p.warning=p.crumble/p.crumbleMax;
            deathSnowState.mountainShake=Math.max(
                deathSnowState.mountainShake,2
            );
        } else if(p.crumble>0) {
            p.crumble=Math.max(0,p.crumble-0.45);
        }

        if(p.crumble>=p.crumbleMax) {
            p.collapsed=true;

            const index=platforms.indexOf(p);
            if(index>=0) platforms.splice(index,1);

            player.grounded=false;
            player.standingPlatform=null;
            player.velocityY=Math.max(2,player.velocityY);

            dsBurst(p.x+p.width/2,p.y,18,"snow");
            showNotification("THE SNOW SHELF COLLAPSED!");
        }
    }

    deathSnowState.mountainShake *= 0.88;
}

// ---------------------------------------------------------------------------
// 15. PROJECTILES
// ---------------------------------------------------------------------------

function dsUpdateParticles() {
    for(let i=deathSnowState.particles.length-1;i>=0;i--) {
        const p=deathSnowState.particles[i];

        p.x+=p.vx;
        p.y+=p.vy;
        p.life--;

        if(p.kind==="icebolt") {
            if(dsOverlap({
                x:p.x-p.size/2,
                y:p.y-p.size/2,
                width:p.size,
                height:p.size
            },player)) {
                damagePlayer(10);
                p.life=0;
                dsBurst(p.x,p.y,10,"ice");
            }
        } else {
            p.vy+=0.035;
            p.vx*=0.985;
        }

        if(p.life<=0) {
            deathSnowState.particles.splice(i,1);
        }
    }
}

// ---------------------------------------------------------------------------
// 16. FROZEN SANCTUM
// ---------------------------------------------------------------------------

function dsEnterSanctum() {
    if(deathSnowState.sanctumEntered) return;

    deathSnowState.sanctumEntered=true;
    deathSnowState.region="sanctum";
    deathSnowState.sanctumWaveActive=true;

    enemies.length=0;
    deathSnowState.birdMinions.length=0;
    deathSnowState.birdLeader=null;

    player.x=23380;
    player.y=ground.y-player.height;
    player.velocityX=0;
    player.velocityY=0;
    player.grounded=true;

    deathSnowState.checkpoint=23380;
    player.checkpointX=23380;
    deathSnowState.flightTime=0;

    deathSnowState.cameraLock={x:23280,width:WIDTH};
    camera.x=23280;
    camera.targetX=23280;

    const roster=[
        {x:23520,name:"SANCTUM WARDEN",health:3,speed:1.7,type:"golem"},
        {x:23840,name:"FROST RAVEN ELDER",health:3,speed:1.8,type:"raven",flying:true},
        {x:24120,name:"CRYSTAL STALKER",health:3,speed:1.8,type:"hound"}
    ];

    for(const d of roster) {
        const e=createEnemy(d.x,{
            name:d.name,
            health:d.health,
            speed:d.speed,
            damage:5,
            patrol:160,
            detectionRange:620,
            attackRange:70
        });

        dsConfigureEnemy(e,d);
        enemies.push(e);
    }

    deathSnowState.transition=160;
    showNotification("THE FROZEN SANCTUM — THE INNER WORLD AWAKENS");
}

// ---------------------------------------------------------------------------
// 17. PROGRESSION
// ---------------------------------------------------------------------------

function dsUpdateProgression() {
    const x=player.x;

    if(deathSnowState.region==="mountains") {
        if(deathSnowState.waveActive && enemies.length===0) {
            deathSnowState.waveActive=false;
            deathSnowState.cameraLock=null;
            deathSnowState.birdLeader=null;
            showNotification("THE RIDGE IS CLEAR — CLIMB ONWARD");
        }

        if(!deathSnowState.waveActive && !deathSnowState.bossActive) {
            if(deathSnowState.waveIndex===0 && x>15540) {
                dsSpawnWave(1);
            }
            else if(deathSnowState.waveIndex===1 && x>17840) {
                dsSpawnWave(2);
            }
            else if(deathSnowState.waveIndex===2 &&
                    x>19020 &&
                    !deathSnowState.bossDefeated[0]) {
                dsSpawnBoss(0);
            }
            else if(deathSnowState.bossDefeated[0] &&
                    x>21020 &&
                    !deathSnowState.bossDefeated[1]) {
                dsSpawnBoss(1);
            }
            else if(deathSnowState.bossDefeated[1] &&
                    x>22300 &&
                    !deathSnowState.bossDefeated[2]) {
                dsSpawnBoss(2);
            }
        }

        if(deathSnowState.bossDefeated[0] &&
           deathSnowState.bossDefeated[1] &&
           deathSnowState.bossDefeated[2] &&
           x>DEATH_SNOW.sanctumGateX-80 &&
           x<DEATH_SNOW.sanctumGateX+220 &&
           keys.e) {
            dsEnterSanctum();
            keys.e=false;
        }
    }

    else if(deathSnowState.region==="sanctum") {
        if(deathSnowState.sanctumWaveActive && enemies.length===0) {
            deathSnowState.sanctumWaveActive=false;
            deathSnowState.cameraLock=null;
            showNotification("THE SANCTUM GUARDIANS HAVE FALLEN");
        }

        if(!deathSnowState.sanctumWaveActive &&
           !deathSnowState.bossActive &&
           !deathSnowState.bossDefeated[3] &&
           x>24700) {
            dsSpawnBoss(3);
        }
    }

    for(let i=0;i<3;i++) {
        if(deathSnowState.bossGateOpen[i] &&
           x>DEATH_SNOW.bossX[i]+560) {
            deathSnowState.bossGateOpen[i]=false;
        }
    }

    if(deathSnowState.bossRelic &&
       !deathSnowState.ancientWeaponCollected) {
        const r=deathSnowState.bossRelic;
        r.pulse+=0.07;

        if(dsOverlap(player,{
            x:r.x-30,y:r.y-20,
            width:r.width+60,height:r.height+40
        }) && keys.e) {
            deathSnowState.ancientWeaponCollected=true;
            deathSnowState.bossRelic=null;
            showNotification("ANCIENT WINTER WEAPON COLLECTED");
            dsBurst(r.x,r.y,30,"ice");
            keys.e=false;
        }
    }

    if(deathSnowState.ancientWeaponCollected) {
        deathSnowState.finalGateOpen=true;
    }

    if(deathSnowState.finalGateOpen &&
       x>DEATH_SNOW.finalGateX-65 &&
       keys.e) {
        deathSnowState.victory=true;
        player.levelComplete=true;
        showNotification("THE DEATH SNOW HAS BEEN CONQUERED");
        keys.e=false;
    }
}

// ---------------------------------------------------------------------------
// 18. MAIN UPDATE
// ---------------------------------------------------------------------------

function updateDeathSnow() {
    updateDeathSnowEntrance();

    if(worldTwoState.phase!==4 || !deathSnowState.active) return;
        // DEATH SNOW BACKGROUND MUSIC
    if (
        typeof HC_AUDIO !== "undefined" &&
        HC_AUDIO.current !== HC_AUDIO.deathSnow
    ) {
        HC_AUDIO.play("deathSnow");
    }

    deathSnowState.tick++;
    deathSnowState.wind=Math.sin(deathSnowState.tick*0.006)*1.4;

    if(deathSnowState.transition>0) deathSnowState.transition--;

    if(deathSnowState.cameraLock) {
        player.x=Math.max(
            deathSnowState.cameraLock.x+18,
            Math.min(
                deathSnowState.cameraLock.x+WIDTH-player.width-18,
                player.x
            )
        );
        player.velocityX=0;
    }

    if(deathSnowState.flightTime>0) deathSnowState.flightTime--;

    dsUpdateSlidingBlocks();
    dsUpdateFakeBlocks();
    dsUpdatePotions();
    dsUpdateBirdMinions();
    dsUpdateParticles();

    const boss=enemies.find(e =>
        e.deathSnowBoss &&
        e.state!=="death" &&
        e.state!=="dead"
    );

    if(boss) dsUpdateBossAI(boss);

    dsUpdateProgression();
}

// ---------------------------------------------------------------------------
// 19. CAMERA
// ---------------------------------------------------------------------------

const dsBaseUpdateCamera=updateCamera;

updateCamera=function() {
    if(worldTwoState.phase===4 &&
       deathSnowState.active &&
       deathSnowState.cameraLock) {
        camera.x=Math.max(
            DEATH_SNOW.start,
            Math.min(
                LEVEL.end-WIDTH,
                deathSnowState.cameraLock.x
            )
        );
        camera.targetX=camera.x;
        return;
    }

    dsBaseUpdateCamera();
};

// ---------------------------------------------------------------------------
// 20. REGION-SPECIFIC BACKGROUNDS
// ---------------------------------------------------------------------------

// Original Frostbound Pass artwork. Place the generated image at:
// assets/death-snow/frostbound-pass.png
const dsFrostboundBackground = new Image();
dsFrostboundBackground.src = "assets/death-snow/frostbound-pass.png";
dsFrostboundBackground.onload = function() {
    console.log("FROSTBOUND PASS ARTWORK LOADED");
};
dsFrostboundBackground.onerror = function() {
    console.warn("Frostbound artwork not found; using procedural fallback.");
};

const dsBaseDrawBackground=drawBackground;

drawBackground=function() {
    if(worldTwoState.phase!==4 || !deathSnowState.active) {
        dsBaseDrawBackground();
        return;
    }

    const z=dsZone();

    const g=ctx.createLinearGradient(0,0,0,HEIGHT);
    g.addColorStop(0,z.top);
    g.addColorStop(0.58,z.bottom);
    g.addColorStop(1,"#a8bfce");

    ctx.fillStyle=g;
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    // Continuous Frostbound Pass artwork, drawn BEHIND the procedural
    // mountains, spires and snowfall. Tile by camera parallax so it never
    // scrolls out of view or stops at the old x=15800 cutoff.
    if(dsFrostboundBackground.complete &&
       dsFrostboundBackground.naturalWidth>0) {
        const tileWidth=WIDTH+1050;
        const travel=camera.x*0.22;
        const offset=-((travel%tileWidth+tileWidth)%tileWidth);
        let tileIndex=0;

        for(let tileX=offset-tileWidth;
            tileX<WIDTH;
            tileX+=tileWidth,tileIndex++) {
            ctx.save();
            if(tileIndex%2===1) {
                ctx.translate(tileX+tileWidth,0);
                ctx.scale(-1,1);
                ctx.drawImage(dsFrostboundBackground,0,0,tileWidth,HEIGHT);
            } else {
                ctx.drawImage(dsFrostboundBackground,tileX,0,tileWidth,HEIGHT);
            }
            ctx.restore();
        }

        ctx.fillStyle="rgba(8,20,36,0.10)";
        ctx.fillRect(0,0,WIDTH,HEIGHT);
    }

    // Moon and halo.
    const moonX=760-camera.x*0.035;
    const moonY=92;

    const halo=ctx.createRadialGradient(
        moonX,moonY,15,moonX,moonY,125
    );
    halo.addColorStop(0,"rgba(218,244,255,.36)");
    halo.addColorStop(1,"rgba(218,244,255,0)");

    ctx.fillStyle=halo;
    ctx.fillRect(moonX-130,moonY-130,260,260);

    ctx.fillStyle="#e9f7ff";
    ctx.beginPath();
    ctx.arc(moonX,moonY,27,0,Math.PI*2);
    ctx.fill();

    // Three layers of mountains.
    for(let layer=0;layer<3;layer++) {
        ctx.save();
        ctx.translate(-camera.x*(0.08+layer*0.075),0);

        ctx.fillStyle=[z.far,z.near,"#536e82"][layer];

        const step=390-layer*45;

        for(let x=DEATH_SNOW.start-600;
            x<DEATH_SNOW.end+700;
            x+=step) {

            const h=170+dsRand(x+layer*90)*190;

            ctx.beginPath();
            ctx.moveTo(x,460);
            ctx.lineTo(x+step*.46,460-h);
            ctx.lineTo(x+step,460);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle="rgba(231,246,255,.55)";
            ctx.beginPath();
            ctx.moveTo(x+step*.46,460-h);
            ctx.lineTo(x+step*.30,460-h*.62);
            ctx.lineTo(x+step*.46,460-h*.70);
            ctx.lineTo(x+step*.63,460-h*.58);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle=[z.far,z.near,"#536e82"][layer];
        }

        ctx.restore();
    }

    // Glacial cathedral spires.
    if(player.x>=20500 && player.x<23300) {
        ctx.fillStyle="rgba(183,224,245,.22)";

        for(let i=0;i<7;i++) {
            const x=100+i*165-camera.x*0.16;
            ctx.beginPath();
            ctx.moveTo(x,460);
            ctx.lineTo(x+40,180+(i%3)*30);
            ctx.lineTo(x+80,460);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Sanctum's glowing crystal pillars.
    if(deathSnowState.region==="sanctum") {
        for(let i=0;i<9;i++) {
            const x=((i*180-camera.x*0.22)%WIDTH+WIDTH)%WIDTH;
            ctx.fillStyle="rgba(155,225,255,.17)";
            ctx.beginPath();
            ctx.moveTo(x,440);
            ctx.lineTo(x+28,160+(i%3)*30);
            ctx.lineTo(x+58,440);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Snowfall.
    ctx.fillStyle="rgba(239,249,255,.78)";

    for(let i=0;i<150;i++) {
        const x=((i*83-deathSnowState.tick*(0.55+(i%5)*0.18)
            -camera.x*0.02)%WIDTH+WIDTH)%WIDTH;

        const y=(i*47+deathSnowState.tick*(1+(i%4)*0.45))%HEIGHT;

        ctx.fillRect(x,y,i%9===0?2:1,i%9===0?3:2);
    }

    const fog=ctx.createLinearGradient(0,HEIGHT-160,0,HEIGHT);
    fog.addColorStop(0,"rgba(220,239,249,0)");
    fog.addColorStop(1,"rgba(215,236,247,.16)");

    ctx.fillStyle=fog;
    ctx.fillRect(0,HEIGHT-160,WIDTH,160);

};

// ---------------------------------------------------------------------------
// 21. PLATFORM AND GROUND RENDERING
// ---------------------------------------------------------------------------

const dsBaseDrawPlatforms=drawPlatforms;

drawPlatforms=function() {
    if(worldTwoState.phase!==4 || !deathSnowState.active) {
        dsBaseDrawPlatforms();
        return;
    }

    for(const p of [...platforms,...movingPlatforms]) {
        if(p.x<camera.x-220 ||
           p.x>camera.x+WIDTH+220 ||
           (p.deathSnowFake && p.collapsed)) continue;

        const moving=movingPlatforms.includes(p) || p.deathSnowSliding;

        const shake=p.deathSnowFake && p.crumble>0
            ? Math.sin(deathSnowState.tick*1.8)*p.warning*3
            : 0;

        ctx.fillStyle=moving?"#617f95":"#52697d";
        ctx.fillRect(p.x+shake,p.y,p.width,p.height);

        ctx.fillStyle="#e5f4fb";
        ctx.fillRect(p.x+shake,p.y,p.width,4);

        ctx.fillStyle="rgba(23,42,60,.45)";
        ctx.fillRect(p.x+12+shake,p.y+7,Math.max(4,p.width*.22),2);

        if(p.deathSnowFake) {
            ctx.strokeStyle=`rgba(220,246,255,${0.2+p.warning*.65})`;
            ctx.strokeRect(p.x+shake,p.y,p.width,p.height);

            if(p.warning>0.35) {
                ctx.beginPath();
                ctx.moveTo(p.x+22,p.y+2);
                ctx.lineTo(p.x+31,p.y+10);
                ctx.lineTo(p.x+48,p.y+5);
                ctx.stroke();
            }
        }

        if(p.deathSnowSliding) {
            ctx.fillStyle="rgba(175,231,255,.45)";
            ctx.fillRect(p.x+20,p.y+5,p.width-40,2);
        }
    }
};

const dsBaseDrawGround=drawGround;

drawGround=function() {
    if(worldTwoState.phase!==4 || !deathSnowState.active) {
        dsBaseDrawGround();
        return;
    }

    const z=dsZone();

    const gr=ctx.createLinearGradient(0,ground.y,0,HEIGHT);
    gr.addColorStop(0,"#e6f3f9");
    gr.addColorStop(.12,z.ground);
    gr.addColorStop(1,"#26394b");

    ctx.fillStyle=gr;
    ctx.fillRect(
        DEATH_SNOW.start,ground.y,
        DEATH_SNOW.end-DEATH_SNOW.start,
        ground.height
    );

    ctx.fillStyle="#f1f8fb";
    ctx.fillRect(
        DEATH_SNOW.start,ground.y,
        DEATH_SNOW.end-DEATH_SNOW.start,5
    );

    for(let x=DEATH_SNOW.start+20;x<DEATH_SNOW.end;x+=95) {
        ctx.fillStyle="rgba(238,248,255,.14)";
        ctx.fillRect(x,ground.y+18+(x%3)*5,34,2);
    }
};

// ---------------------------------------------------------------------------
// 22. DETAILED MONSTER DESIGNS
// ---------------------------------------------------------------------------

function dsDrawLeopard(enemy,boss=false) {
    const w=enemy.width;
    const h=enemy.height;
    const t=deathSnowState.tick;

    ctx.save();
    ctx.translate(enemy.x+w/2,enemy.y+h);
    ctx.scale(enemy.facing||1,1);

    const fur=boss?"#dceaf0":"#c8d9e2";
    const shadow=boss?"#8ca9bb":"#829dad";
    const spots="#40576b";

    // Long curved tail.
    ctx.strokeStyle=shadow;
    ctx.lineWidth=boss?12:8;
    ctx.lineCap="round";

    ctx.beginPath();
    ctx.moveTo(-w*.30,-h*.35);
    ctx.bezierCurveTo(
        -w*.70,-h*.65,
        -w*.72,-h*.05,
        -w*.48,-h*.18
    );
    ctx.stroke();

    ctx.fillStyle="#43586b";
    ctx.beginPath();
    ctx.arc(-w*.48,-h*.18,boss?7:5,0,Math.PI*2);
    ctx.fill();

    // Body.
    ctx.fillStyle=fur;
    ctx.beginPath();
    ctx.ellipse(0,-h*.42,w*.40,h*.29,-.06,0,Math.PI*2);
    ctx.fill();

    // Shoulder and chest.
    ctx.fillStyle="#eaf5f8";
    ctx.beginPath();
    ctx.ellipse(w*.22,-h*.36,w*.17,h*.22,0,0,Math.PI*2);
    ctx.fill();

    // Head.
    ctx.fillStyle=fur;
    ctx.beginPath();
    ctx.arc(w*.30,-h*.70,h*.19,0,Math.PI*2);
    ctx.fill();

    // Ears.
    ctx.fillStyle=shadow;
    for(const side of [-1,1]) {
        ctx.beginPath();
        ctx.arc(w*.30+side*h*.13,-h*.82,6,0,Math.PI*2);
        ctx.fill();

        ctx.fillStyle="#e9f5fa";
        ctx.beginPath();
        ctx.arc(w*.30+side*h*.13,-h*.82,3,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle=shadow;
    }

    // Face mask.
    ctx.fillStyle="#f7fbfd";
    ctx.beginPath();
    ctx.ellipse(w*.40,-h*.67,11,7,0,0,Math.PI*2);
    ctx.fill();

    // Eyes.
    ctx.fillStyle="#d5f4ff";
    ctx.fillRect(w*.30,-h*.74,5,4);

    ctx.fillStyle="#172b3d";
    ctx.fillRect(w*.32,-h*.74,2,4);

    // Nose and mouth.
    ctx.fillStyle="#263d50";
    ctx.beginPath();
    ctx.moveTo(w*.49,-h*.68);
    ctx.lineTo(w*.44,-h*.65);
    ctx.lineTo(w*.50,-h*.64);
    ctx.fill();

    ctx.strokeStyle="#526c7d";
    ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(w*.44,-h*.64);
    ctx.lineTo(w*.41,-h*.60);
    ctx.lineTo(w*.47,-h*.60);
    ctx.stroke();

    // Distinctive rosette-like coat spots.
    for(let i=0;i<18;i++) {
        const sx=-w*.28+(i%6)*w*.105;
        const sy=-h*.53+Math.floor(i/6)*h*.105;

        ctx.strokeStyle=spots;
        ctx.lineWidth=1.7;

        ctx.beginPath();
        ctx.ellipse(sx,sy,3.4,2.6,0,0,Math.PI*2);
        ctx.stroke();

        ctx.fillStyle=spots;
        ctx.fillRect(sx-1,sy-1,2,2);
    }

    // Legs and paws.
    const walk=Math.sin(t*.18)*3;

    for(let i=0;i<4;i++) {
        const lx=-w*.27+i*w*.17;
        const legY=i%2===0?walk:-walk;

        ctx.fillStyle=shadow;
        ctx.fillRect(lx,-h*.25+legY,9,h*.23);

        ctx.fillStyle="#e9f5fa";
        ctx.beginPath();
        ctx.ellipse(lx+4,-4+legY,7,4,0,0,Math.PI*2);
        ctx.fill();
    }

    // White shoulder tufts.
    ctx.fillStyle="#f3faff";
    for(let i=0;i<5;i++) {
        ctx.beginPath();
        ctx.arc(-w*.12+i*5,-h*.63,3,0,Math.PI*2);
        ctx.fill();
    }

    if(boss) {
        ctx.strokeStyle="rgba(174,232,255,.75)";
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(w*.1,-h*.48,w*.48,-2.8,-.3);
        ctx.stroke();
    }

    ctx.restore();
}

function dsDrawYeti(enemy) {
    const w=enemy.width;
    const h=enemy.height;
    const t=deathSnowState.tick;

    ctx.save();
    ctx.translate(enemy.x+w/2,enemy.y+h);
    ctx.scale(enemy.facing||1,1);

    // Massive body.
    ctx.fillStyle="#dceaf0";
    ctx.beginPath();
    ctx.ellipse(0,-h*.42,w*.40,h*.42,0,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle="#b5cad6";
    ctx.beginPath();
    ctx.ellipse(0,-h*.32,w*.35,h*.28,0,0,Math.PI*2);
    ctx.fill();

    // Arms.
    ctx.strokeStyle="#dceaf0";
    ctx.lineWidth=23;
    ctx.lineCap="round";

    ctx.beginPath();
    ctx.moveTo(-w*.30,-h*.58);
    ctx.lineTo(-w*.52,-h*.23+Math.sin(t*.08)*3);
    ctx.moveTo(w*.30,-h*.58);
    ctx.lineTo(w*.52,-h*.23-Math.sin(t*.08)*3);
    ctx.stroke();

    // Head.
    ctx.fillStyle="#e9f5fa";
    ctx.beginPath();
    ctx.arc(0,-h*.77,30,0,Math.PI*2);
    ctx.fill();

    // Brow and eyes.
    ctx.fillStyle="#536f82";
    ctx.fillRect(-16,-h*.81,10,7);
    ctx.fillRect(7,-h*.81,10,7);

    ctx.fillStyle="#a9efff";
    ctx.fillRect(-13,-h*.80,4,4);
    ctx.fillRect(10,-h*.80,4,4);

    // Nose.
    ctx.fillStyle="#405a6d";
    ctx.fillRect(-5,-h*.69,11,7);

    // Fur tufts.
    ctx.fillStyle="#f4fbff";
    for(let i=0;i<7;i++) {
        ctx.beginPath();
        ctx.arc(-30+i*10,-h*.92+(i%2)*4,7,0,Math.PI*2);
        ctx.fill();
    }

    // Huge feet.
    ctx.fillStyle="#9db6c5";
    ctx.fillRect(-w*.34,-8,w*.26,8);
    ctx.fillRect(w*.08,-8,w*.26,8);

    ctx.restore();
}

function dsDrawRaven(enemy) {
    const w=enemy.width;
    const h=enemy.height;
    const flap=Math.sin(deathSnowState.tick*.22)*15;

    ctx.save();
    ctx.translate(enemy.x+w/2,enemy.y+h/2);
    ctx.scale(enemy.facing||1,1);

    ctx.fillStyle="#172638";
    ctx.beginPath();
    ctx.ellipse(0,0,w*.25,h*.23,0,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle="#304c65";
    ctx.beginPath();
    ctx.moveTo(-5,0);
    ctx.lineTo(-w*.50,-h*.55-flap);
    ctx.lineTo(-w*.23,h*.1);
    ctx.lineTo(0,h*.2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(5,0);
    ctx.lineTo(w*.50,-h*.55+flap);
    ctx.lineTo(w*.23,h*.1);
    ctx.lineTo(0,h*.2);
    ctx.fill();

    ctx.fillStyle="#dff8ff";
    ctx.fillRect(w*.12,-h*.12,5,4);

    ctx.fillStyle="#9cc8df";
    ctx.beginPath();
    ctx.moveTo(w*.22,0);
    ctx.lineTo(w*.42,4);
    ctx.lineTo(w*.22,8);
    ctx.fill();

    ctx.restore();
}

function dsDrawWyrm(enemy) {
    const w=enemy.width;
    const h=enemy.height;

    ctx.save();
    ctx.translate(enemy.x+w/2,enemy.y+h/2);
    ctx.scale(enemy.facing||1,1);

    ctx.fillStyle="#9db8ca";
    ctx.beginPath();
    ctx.ellipse(0,0,w*.45,h*.25,0,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="#d4e8f2";
    ctx.lineWidth=12;
    ctx.beginPath();
    ctx.moveTo(-w*.28,0);
    ctx.quadraticCurveTo(-w*.65,-h*.65,-w*.42,h*.35);
    ctx.stroke();

    ctx.fillStyle="#d8edf6";
    ctx.beginPath();
    ctx.moveTo(w*.22,-h*.05);
    ctx.lineTo(w*.52,-h*.42);
    ctx.lineTo(w*.42,h*.10);
    ctx.fill();

    ctx.fillStyle="#b9f0ff";
    ctx.fillRect(w*.36,-h*.13,7,4);

    ctx.restore();
}

function dsDrawSnowGod(enemy) {
    const w=enemy.width;
    const h=enemy.height;

    ctx.save();
    ctx.translate(enemy.x+w/2,enemy.y+h);
    ctx.scale(enemy.facing||1,1);

    ctx.fillStyle="#a9c3d5";
    ctx.fillRect(-w*.32,-h*.82,w*.64,h*.82);

    ctx.fillStyle="#dff5ff";
    ctx.beginPath();
    ctx.moveTo(-w*.36,-h*.78);
    ctx.lineTo(0,-h*1.08);
    ctx.lineTo(w*.36,-h*.78);
    ctx.fill();

    ctx.fillStyle="#6e8da6";
    ctx.fillRect(-w*.42,-h*.55,w*.84,h*.18);

    ctx.fillStyle="#e9fbff";
    ctx.fillRect(-22,-h*.78,13,5);
    ctx.fillRect(9,-h*.78,13,5);

    ctx.strokeStyle="#d8f5ff";
    ctx.lineWidth=8;
    ctx.beginPath();
    ctx.moveTo(w*.28,-h*.72);
    ctx.lineTo(w*.53,-h*.05);
    ctx.stroke();

    ctx.fillStyle="#bdf0ff";
    ctx.fillRect(w*.48,-h*.10,8,15);

    if(enemy.phase===2) {
        ctx.strokeStyle="rgba(180,235,255,.8)";
        ctx.lineWidth=3;
        ctx.beginPath();
        ctx.arc(0,-h*.5,w*.68,0,Math.PI*2);
        ctx.stroke();
    }

    ctx.restore();
}

function dsDrawMonster(enemy) {
    if(enemy.deathSnowType==="hound") {
        if(dsDrawSpriteSheetEnemy(enemy,"hound")) return;
    }
    else if(enemy.deathSnowType==="golem") {
        if(dsDrawSpriteSheetEnemy(enemy,"golem")) return;
    }

    if(enemy.deathSnowType==="leopard" ||
       enemy.deathSnowType==="snowleopard") {
        dsDrawLeopard(enemy,!!enemy.deathSnowBoss);
    }
    else if(enemy.deathSnowType==="yeti") dsDrawYeti(enemy);
    else if(enemy.deathSnowType==="raven") dsDrawRaven(enemy);
    else if(enemy.deathSnowType==="wyrm") dsDrawWyrm(enemy);
    else if(enemy.deathSnowType==="snowgod") dsDrawSnowGod(enemy);
    else {
        // Frost hounds and other snow creatures.
        ctx.save();
        ctx.translate(enemy.x+enemy.width/2,enemy.y+enemy.height);
        ctx.scale(enemy.facing||1,1);

        ctx.fillStyle="#8ea9bb";
        ctx.beginPath();
        ctx.ellipse(0,-enemy.height*.42,enemy.width*.40,enemy.height*.31,0,0,Math.PI*2);
        ctx.fill();

        ctx.fillStyle="#dcebf3";
        ctx.fillRect(-enemy.width*.20,-enemy.height*.78,enemy.width*.42,enemy.height*.36);

        ctx.fillStyle="#253c51";
        ctx.fillRect(5,-enemy.height*.70,7,4);
        ctx.fillRect(-9,-enemy.height*.70,7,4);

        ctx.fillStyle="#e4f5fc";
        ctx.fillRect(enemy.width*.20,-enemy.height*.38,12,5);

        ctx.restore();
    }
}

// ---------------------------------------------------------------------------
// 23. ENEMY HEALTH BARS AND RENDERING
// ---------------------------------------------------------------------------

function dsDrawHealthBar(enemy) {
    if(enemy.state==="death" || enemy.state==="dead") return;

    const ratio=Math.max(0,enemy.health/enemy.maxHealth);
    const width=enemy.width+12;
    const x=enemy.x-6;
    const y=enemy.y-13;

    ctx.fillStyle="rgba(5,14,25,.85)";
    ctx.fillRect(x,y,width,7);

    ctx.fillStyle=enemy.deathSnowBoss?"#bdeeff":"#8bc9e3";
    ctx.fillRect(x+1,y+1,(width-2)*ratio,5);

    ctx.strokeStyle="rgba(230,248,255,.8)";
    ctx.lineWidth=1;
    ctx.strokeRect(x,y,width,7);
}

const dsBaseDrawEnemy=drawEnemy;

drawEnemy=function(enemy) {
    if(worldTwoState.phase===4 &&
       (enemy.deathSnowEnemy || enemy.deathSnowBoss)) {

        if(enemy.state==="death" || enemy.state==="dead") {
            ctx.save();
            ctx.globalAlpha=Math.max(
                0.12,
                1-(enemy.animation.frame||0)/6
            );
            dsDrawMonster(enemy);
            ctx.restore();
        } else {
            dsDrawMonster(enemy);
        }

        dsDrawHealthBar(enemy);
        return;
    }

    dsBaseDrawEnemy(enemy);
};

// ---------------------------------------------------------------------------
// 24. POTION, MINION AND PARTICLE DRAWING
// ---------------------------------------------------------------------------

function dsDrawPotions() {
    for(const p of deathSnowState.potions) {
        if(p.used) continue;

        const y=p.y+Math.sin(p.bob)*5;

        ctx.save();
        ctx.shadowBlur=18;
        ctx.shadowColor=p.kind==="flight"?"#9deaff":"#b5f4ff";

        ctx.fillStyle="#263e55";
        ctx.fillRect(p.x+4,y+5,18,25);

        ctx.fillStyle=p.kind==="flight"?"#bceeff":"#72c7e7";
        ctx.fillRect(p.x+7,y+14,12,13);

        ctx.fillStyle="#eafaff";
        ctx.fillRect(p.x+8,y+7,3,7);
        ctx.fillRect(p.x+8,y,10,5);

        ctx.restore();
    }
}

function dsDrawMinions() {
    for(const b of deathSnowState.birdMinions) {
        ctx.save();
        ctx.translate(b.x,b.y);

        ctx.strokeStyle="#172c40";
        ctx.lineWidth=2.5;

        ctx.beginPath();
        ctx.moveTo(-8,0);
        ctx.quadraticCurveTo(-3,-9,0,0);
        ctx.quadraticCurveTo(5,-9,9,0);
        ctx.stroke();

        ctx.restore();
    }
}

function dsDrawParticles() {
    for(const p of deathSnowState.particles) {
        const alpha=Math.max(0,p.life/p.maxLife);

        ctx.save();
        ctx.globalAlpha=alpha;

        if(p.kind==="icebolt") {
            ctx.shadowBlur=15;
            ctx.shadowColor="#a9edff";
            ctx.fillStyle="#91dfff";
            ctx.beginPath();
            ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillStyle=p.kind==="ice"?"#dff8ff":"#b7d5e5";
            ctx.fillRect(p.x,p.y,p.size,p.size);
        }

        ctx.restore();
    }
}

// ---------------------------------------------------------------------------
// 25. GATES AND RELICS
// ---------------------------------------------------------------------------

function dsDrawGate(x,label,open) {
    ctx.save();
    ctx.translate(x,ground.y-190);

    ctx.fillStyle="#253c53";
    ctx.fillRect(0,0,18,190);
    ctx.fillRect(92,0,18,190);

    ctx.fillStyle="#8caec4";
    ctx.fillRect(12,0,86,14);
    ctx.fillRect(12,0,8,190);
    ctx.fillRect(90,0,8,190);

    ctx.strokeStyle=open?"#c9f4ff":"#66849b";
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.arc(55,92,39,Math.PI,0);
    ctx.stroke();

    ctx.fillStyle=open
        ?"rgba(180,235,255,.25)"
        :"rgba(12,25,40,.8)";

    ctx.fillRect(20,35,70,155);

    ctx.fillStyle="#e5f7ff";
    ctx.font="11px Georgia";
    ctx.textAlign="center";
    ctx.fillText(label,55,214);

    ctx.restore();
}

function drawDeathSnowWorld() {
    if(worldTwoState.phase!==4 || !deathSnowState.active) return;

    for(let x=Math.floor(camera.x/170)*170;
        x<camera.x+WIDTH+170;
        x+=170) {

        ctx.fillStyle="rgba(220,242,251,.32)";
        ctx.beginPath();
        ctx.ellipse(x+45,ground.y-4,42,7,0,0,Math.PI*2);
        ctx.fill();

        if(dsRand(x)>.55) {
            ctx.fillStyle="#8eaabd";
            ctx.beginPath();
            ctx.moveTo(x+115,ground.y);
            ctx.lineTo(x+130,ground.y-30-dsRand(x+2)*25);
            ctx.lineTo(x+146,ground.y);
            ctx.fill();
        }
    }

    dsDrawPotions();
    dsDrawMinions();
    dsDrawParticles();

    for(let i=0;i<3;i++) {
        const gx=DEATH_SNOW.bossX[i]+560;

        if(player.x<gx+WIDTH &&
           player.x>DEATH_SNOW.bossX[i]-WIDTH) {
            dsDrawGate(
                gx,
                "FROST SEAL",
                deathSnowState.bossDefeated[i]
            );
        }
    }

    if(deathSnowState.bossRelic) {
        const r=deathSnowState.bossRelic;

        ctx.save();
        ctx.translate(r.x+r.width/2,r.y+r.height/2);
        ctx.rotate(Math.sin(r.pulse)*.12);

        ctx.shadowBlur=22;
        ctx.shadowColor="#c5f2ff";
        ctx.fillStyle="#dff8ff";
        ctx.fillRect(-4,-34,8,62);

        ctx.fillStyle="#7eb6d2";
        ctx.fillRect(-13,-15,26,10);
        ctx.fillRect(-9,-30,18,8);

        ctx.restore();
    }

    if(deathSnowState.region==="mountains" &&
       deathSnowState.bossDefeated[0] &&
       deathSnowState.bossDefeated[1] &&
       deathSnowState.bossDefeated[2]) {
        dsDrawGate(DEATH_SNOW.sanctumGateX,"FROZEN SANCTUM",true);
    }

    if(deathSnowState.finalGateOpen) {
        dsDrawGate(DEATH_SNOW.finalGateX,"EXIT",true);
    }
}

// ---------------------------------------------------------------------------
// 26. WORLD II RENDER HOOK
// ---------------------------------------------------------------------------

const dsBaseDrawWorldTwo=drawWorldTwo;

drawWorldTwo=function() {
    dsBaseDrawWorldTwo();

    if(worldTwoState.phase===3 && deathSnowGate.unlocked) {
        dsDrawGate(deathSnowGate.x,"THE DEATH SNOW",true);
    }
    else if(worldTwoState.phase===3 && player.x>13620) {
        dsDrawGate(deathSnowGate.x,"RELIC REQUIRED",false);
    }

    drawDeathSnowWorld();
};

// ---------------------------------------------------------------------------
// 27. HUD AND LEVEL PROGRESS
// ---------------------------------------------------------------------------

function drawDeathSnowHUD() {
    if(worldTwoState.phase!==4 || !deathSnowState.active) return;

    ctx.save();

    // Player health + flight status share a compact, readable HUD.
    ctx.fillStyle="rgba(5,14,26,.88)";
    ctx.fillRect(18,18,270,94);

    ctx.fillStyle="#e4f5ff";
    ctx.font="bold 12px Georgia";
    ctx.fillText(
        deathSnowState.region==="sanctum"
            ?"THE FROZEN SANCTUM"
            :"THE DEATH SNOW",
        30,35
    );

    const maxHealth=Math.max(1,player.maxHealth||100);
    const healthRatio=Math.max(0,Math.min(1,player.health/maxHealth));
    ctx.font="10px Georgia";
    ctx.fillStyle="#f1dfe0";
    ctx.fillText("HEALTH  "+Math.max(0,Math.ceil(player.health))+" / "+maxHealth,30,51);
    ctx.fillStyle="rgba(75,35,43,.95)";
    ctx.fillRect(30,57,226,9);
    ctx.fillStyle=healthRatio>0.35?"#91d6bd":"#e58b83";
    ctx.fillRect(30,57,226*healthRatio,9);
    ctx.strokeStyle="rgba(235,245,250,.85)";
    ctx.strokeRect(30,57,226,9);

    const flightRatio=Math.max(0,Math.min(1,deathSnowState.flightTime/deathSnowState.flightMax));
    ctx.fillStyle="#c9e8f5";
    ctx.fillText(
        deathSnowState.flightTime>0
            ?"FLIGHT  "+Math.ceil(deathSnowState.flightTime/60)+"s"
            :"FLIGHT POTION REQUIRED",
        30,82
    );
    ctx.fillStyle="#344e62";
    ctx.fillRect(30,88,226,8);
    ctx.fillStyle="#bfeeff";
    ctx.fillRect(30,88,226*flightRatio,8);
    ctx.strokeStyle="#d7f3ff";
    ctx.strokeRect(30,88,226,8);

    ctx.textAlign="right";
    ctx.fillStyle="#e5f4fb";
    ctx.font="12px Georgia";
    ctx.fillText(dsZone().name,WIDTH-22,25);

    const boss=enemies.find(e =>
        e.deathSnowBoss &&
        e.state!=="death" &&
        e.state!=="dead"
    );

    if(boss) {
        ctx.textAlign="center";
        ctx.font="bold 14px Georgia";
        ctx.fillText(boss.name,WIDTH/2,30);
    }

    ctx.restore();
}

const dsBaseDrawLevelProgress=drawLevelProgress;

drawLevelProgress=function() {
    if(worldTwoState.phase!==4) {
        dsBaseDrawLevelProgress();
        return;
    }

    const progress=Math.max(
        0,
        Math.min(
            1,
            (player.x-DEATH_SNOW.start)/
            (DEATH_SNOW.end-DEATH_SNOW.start)
        )
    );

    ctx.fillStyle="#1b2c40";
    ctx.fillRect(WIDTH-184,25,160,6);

    ctx.fillStyle="#c6eafa";
    ctx.fillRect(WIDTH-184,25,160*progress,6);

    ctx.fillStyle="#e7f6ff";
    ctx.font="11px Georgia";
    ctx.textAlign="right";
    ctx.fillText("THE DEATH SNOW",WIDTH-24,18);
    ctx.fillText(Math.floor(progress*100)+"%",WIDTH-24,49);

    ctx.textAlign="center";
    ctx.font="13px Georgia";
    ctx.fillStyle="rgba(225,242,250,.8)";
    ctx.fillText(dsZone().name,WIDTH/2,HEIGHT-18);

    ctx.textAlign="left";
};

// ---------------------------------------------------------------------------
// 28. ENEMY UPDATE HOOK
// ---------------------------------------------------------------------------

const dsBaseUpdateEnemies=updateEnemies;

updateEnemies=function() {
    if(worldTwoState.phase!==4 || !deathSnowState.active) {
        dsBaseUpdateEnemies();
        return;
    }

    for(let i=enemies.length-1;i>=0;i--) {
        const e=enemies[i];

        if(e.deathSnowBoss &&
           e.state!=="death" &&
           e.state!=="dead") {
            continue;
        }

        updateEnemy(e);

        if(e.state==="dead") {
            enemies.splice(i,1);
        }
    }

    // Keep bird minions linked to their leader.
    if(!deathSnowState.birdLeader ||
       deathSnowState.birdLeader.state==="death" ||
       deathSnowState.birdLeader.state==="dead") {
        deathSnowState.birdMinions.length=0;
    }
};

// ---------------------------------------------------------------------------
// 29. CHECKPOINTS AND RESPAWN
// ---------------------------------------------------------------------------

function dsUpdateCheckpoints() {
    const marks=[14600,15800,17800,19900,21900,23200];

    for(const x of marks) {
        if(player.x>x && deathSnowState.checkpoint<x) {
            deathSnowState.checkpoint=x+35;
            player.checkpointX=deathSnowState.checkpoint;
            showNotification("MOUNTAIN CHECKPOINT REACHED");
        }
    }
}

const dsBaseRestartGame=restartGame;

restartGame=function() {
    dsBaseRestartGame();
    dsResetWorld();

    worldTwoState.phase=1;
    deathSnowGate.opening=0;
    deathSnowGate.unlocked=false;
};

const dsBaseRespawn=respawnAtCheckpoint;

respawnAtCheckpoint=function() {
    dsBaseRespawn();

    if(worldTwoState.phase===4 && deathSnowState.active) {
        player.x=deathSnowState.checkpoint;
        player.y=ground.y-player.height;
        player.health=player.maxHealth;
        player.velocityX=0;
        player.velocityY=0;
        player.grounded=true;

        deathSnowState.flightTime=0;
        deathSnowState.birdMinions.length=0;

        camera.x=Math.max(
            DEATH_SNOW.start,
            Math.min(LEVEL.end-WIDTH,player.x-WIDTH*.42)
        );

        camera.targetX=camera.x;
    }
};

// ---------------------------------------------------------------------------
// 30. WORLD III ENGINE HOOKS
// ---------------------------------------------------------------------------

const dsBaseUpdateWorldTwo=updateWorldTwo;

updateWorldTwo=function() {
    dsBaseUpdateWorldTwo();

    updateDeathSnow();

    if(worldTwoState.phase===4 && deathSnowState.active) {
        dsUpdateCheckpoints();
    }
};

const dsBaseUpdateCheckpoints=updateCheckpoints;

updateCheckpoints=function() {
    dsBaseUpdateCheckpoints();

    if(worldTwoState.phase===4 && deathSnowState.active) {
        dsUpdateCheckpoints();
    }
};

const dsBaseDrawTransition=drawWorldTwoEntryTransition;

drawWorldTwoEntryTransition=function() {
    dsBaseDrawTransition();

    if(worldTwoState.phase===4 && deathSnowState.active) {
        if(deathSnowState.transition>0) {
            ctx.save();

            ctx.fillStyle=`rgba(5,13,26,${Math.min(.88,deathSnowState.transition/95)})`;
            ctx.fillRect(0,0,WIDTH,HEIGHT);

            ctx.textAlign="center";
            ctx.fillStyle="#e4f6ff";
            ctx.font="bold 34px Georgia";

            ctx.fillText(
                deathSnowState.region==="sanctum"
                    ?"THE FROZEN SANCTUM"
                    :"THE DEATH SNOW",
                WIDTH/2,HEIGHT/2-8
            );

            ctx.font="14px Georgia";
            ctx.fillStyle="#b9d9ec";

            ctx.fillText(
                deathSnowState.region==="sanctum"
                    ?"BEYOND THE SEALED FROST GATE"
                    :"WHERE THE SUN FORGOT TO RISE",
                WIDTH/2,HEIGHT/2+25
            );

            ctx.restore();
        }

        drawDeathSnowHUD();
    }
};

console.log(
    "THE HOLLOW CROWN — WORLD III: THE DEATH SNOW LOADED"
);

// EXPOSE WORLD III FUNCTIONS TO HTML
window.DEATH_SNOW = DEATH_SNOW;
window.deathSnowState = deathSnowState;

window.dsResetWorld = dsResetWorld;
window.dsCreatePotions = dsCreatePotions;
window.dsSpawnWave = dsSpawnWave;
window.dsSpawnBoss = dsSpawnBoss;
window.dsEnterSanctum = dsEnterSanctum;
window.updateDeathSnow = updateDeathSnow;
})();
