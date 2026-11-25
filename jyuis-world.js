// ============================================================================
// THE HOLLOW CROWN — WORLD III: THE JYUIS WORLD
// Loaded after death_snow.js. Isolated hooks; existing worlds remain intact.
// ============================================================================
(() => {
"use strict";

const JYUIS = {
  start: 0, bridgeEnd: 6900, secretStart: 7300, secretEnd: 9180,
  bossStart: 9600, end: 10800, bridgeY: 420, poisonY: 520
};
const state = {
  active:false, area:"bridges", tick:0, checkpoint:120,
  enemies:[], projectiles:[], hazards:[], coins:[], powerups:[],
  platforms:[], moving:[], boss:null, bossProjectiles:[],
  bossCircle:{active:false,timer:0,x:0,radius:178,damageTick:0},
  notification:"", notificationTimer:0, transition:0,
  massiveSword:0, magnet:0, fastRun:0, shield:0,
  coinCount:0, attackWasActive:false, poisonTicks:0,
  poisonTimer:0, lastDamage:0, finalUnlocked:false
};

const sprite = {
  skeleton:loadSheet("assets/jyuis-world/skeleton_warrior_spritesheet.png"),
  poison:loadSheet("assets/jyuis-world/poison_creature_spritesheet.png"),
  necromancer:loadSheet("assets/jyuis-world/necromancer_spritesheet.png")
};
function loadSheet(src) {
  const image=new Image(), s={image,ready:false,fw:0,fh:0};
  image.onload=()=>{s.fw=image.naturalWidth/4;s.fh=image.naturalHeight/4;s.ready=s.fw>0&&s.fh>0;};
  image.onerror=()=>console.warn("Jyuis World sprite failed:",src);
  image.src=src; return s;
}
function notify(message){state.notification=message;state.notificationTimer=130;}
function overlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function makeEnemy(kind,x,y,mini=false){
  const bossScale=mini?1.65:1;
  return {kind,x,y,width:(kind==="skeleton"?46:54)*bossScale,height:(kind==="skeleton"?66:62)*bossScale,
    health:mini?190:kind==="skeleton"?48:42,maxHealth:mini?190:kind==="skeleton"?48:42,
    speed:mini?0.72:kind==="skeleton"?0.72:0.58,damage:mini?18:12,
    miniBoss:mini,state:"idle",facing:-1,anim:0,cooldown:65,attackTimer:0,
    dead:false,deadTimer:0,patrolX:x,range:mini?260:150,poison:kind==="poison"};
}
function initEnemies(){
  state.enemies=[
    makeEnemy("skeleton",650,354),makeEnemy("poison",1390,358),
    makeEnemy("skeleton",2220,311,true),makeEnemy("skeleton",3150,354),
    makeEnemy("poison",3910,358),makeEnemy("poison",5100,318,true),
    makeEnemy("skeleton",5840,354)
  ];
  state.enemies[2].name="THE IRON REMNANT";
  state.enemies[5].name="THE ROTBOUND";
}
function initPlatforms(){
  state.platforms=[
    {x:260,y:335,width:170,height:15},{x:1050,y:330,width:170,height:15},
    {x:1830,y:320,width:180,height:15},{x:2470,y:300,width:190,height:15},
    {x:3320,y:335,width:175,height:15},{x:4230,y:305,width:190,height:15},
    {x:4930,y:330,width:180,height:15},{x:5750,y:310,width:180,height:15},
    {x:7450,y:400,width:180,height:15,secret:true},
    {x:7740,y:345,width:150,height:15,secret:true},
    {x:8000,y:285,width:150,height:15,secret:true},
    {x:8270,y:345,width:155,height:15,secret:true},
    {x:8550,y:270,width:165,height:15,secret:true},
    {x:8840,y:330,width:160,height:15,secret:true},
    {x:9000,y:360,width:230,height:15,secret:true}
  ];
  state.moving=[
    {x:7900,y:390,width:145,height:15,min:7820,max:8050,speed:1.05,dir:1,secret:true},
    {x:8420,y:390,width:145,height:15,min:8340,max:8560,speed:1.2,dir:-1,secret:true}
  ];
  state.hazards=[
    {x:930,y:470,width:85,height:75,kind:"poison"},
    {x:1960,y:470,width:110,height:75,kind:"poison"},
    {x:2860,y:470,width:100,height:75,kind:"poison"},
    {x:3710,y:470,width:110,height:75,kind:"poison"},
    {x:4610,y:470,width:100,height:75,kind:"poison"},
    {x:5510,y:470,width:110,height:75,kind:"poison"},
    {x:7300,y:500,width:2050,height:100,kind:"deepPoison"}
  ];
  // Selected bridge spans crumble after the player stands on them.
  state.platforms.push(
    {x:420,y:420,width:430,height:18,bridge:true,crumble:0,broken:false},
    {x:1015,y:420,width:870,height:18,bridge:true,crumble:0,broken:false},
    {x:2070,y:420,width:790,height:18,bridge:true,crumble:0,broken:false},
    {x:2960,y:420,width:750,height:18,bridge:true,crumble:0,broken:false},
    {x:3820,y:420,width:790,height:18,bridge:true,crumble:0,broken:false},
    {x:4710,y:420,width:800,height:18,bridge:true,crumble:0,broken:false},
    {x:0,y:420,width:900,height:18,bridge:true,crumble:0,broken:false},
    {x:5620,y:420,width:1300,height:18,bridge:true,crumble:0,broken:false}
  );
}
function initPickups(){
  state.coins=[];
  for(let i=0;i<28;i++) state.coins.push({x:330+i*225,y:365-(i%3)*38,got:false});
  state.powerups=[
    {x:1180,y:365,type:"massiveSword",got:false},
    {x:2700,y:350,type:"magnet",got:false},
    {x:4380,y:350,type:"fastRun",got:false},
    {x:6030,y:350,type:"shield",got:false}
  ];
}
function startWorld(){
  state.active=true;state.area="bridges";state.tick=0;state.checkpoint=120;
  state.projectiles=[];state.bossProjectiles=[];state.boss=null;
  state.bossCircle.active=false;state.coinCount=0;
  state.massiveSword=state.magnet=state.fastRun=state.shield=0;
  state.poisonTicks=0;state.poisonTimer=0;state.finalUnlocked=false;
  initEnemies();initPlatforms();initPickups();
  deathSnowState.active=false;deathSnowState.victory=false;
  worldTwoState.phase=5;
  LEVEL.end=JYUIS.end;ground.width=JYUIS.end;ground.y=760;
  player.x=120;player.y=JYUIS.bridgeY-player.height;
  player.velocityX=player.velocityY=0;player.grounded=true;
  player.standingPlatform=null;player.health=player.maxHealth;
  player.gameOver=false;player.levelComplete=false;player.isAttacking=false;
  player.attackCooldown=0;player.damageCooldown=0;player.damageAnimationTimer=0;
  player.checkpointX=120;player.facing=1;
  camera.x=0;camera.targetX=0;
  enemies.length=0;
  setAnimation(playerAnimation,"idle");
  state.transition=130;
  notify("WORLD III — THE JYUIS WORLD");
}
window.startJyuisWorld=startWorld;

function updatePlayerJyuis(){
  if(player.gameOver||player.levelComplete)return;
  const prevY=player.y;
  const left=keys.a||keys.arrowleft,right=keys.d||keys.arrowright;
  const speed=player.speed*(state.fastRun>0?1.65:1);
  player.velocityX=left&&!right?-speed:right&&!left?speed:0;
  if(player.velocityX)player.facing=player.velocityX<0?-1:1;
  player.x=clamp(player.x+player.velocityX,0,JYUIS.end-player.width);
  if(player.attackCooldown>0)player.attackCooldown--;
  if(player.damageCooldown>0)player.damageCooldown--;
  if(player.damageAnimationTimer>0)player.damageAnimationTimer--;
  if(state.fastRun>0)state.fastRun--;
  if(state.massiveSword>0)state.massiveSword--;
  if(state.magnet>0)state.magnet--;
  if(state.shield>0)state.shield--;
  player.velocityY+=gravity;player.y+=player.velocityY;
  player.grounded=false;player.standingPlatform=null;
  const floorY=state.area==="boss"?460:state.area==="bridges"?JYUIS.bridgeY:760;
  if(state.area==="boss"&&player.velocityY>=0&&prevY+player.height<=floorY&&player.y+player.height>=floorY){
    player.y=floorY-player.height;player.velocityY=0;player.grounded=true;
  } else if(state.area!=="boss"){
    for(const p of [...state.platforms,...state.moving]){
      if(state.area==="bridges"&&p.secret)continue;if(state.area==="secret"&&!p.secret)continue;
      if(p.broken)continue;
      if(player.velocityY>=0&&prevY+player.height<=p.y+4&&player.y+player.height>=p.y&&player.x+player.width>p.x&&player.x<p.x+p.width){
        player.y=p.y-player.height;player.velocityY=0;player.grounded=true;
        if(state.moving.includes(p))player.standingPlatform=p;
        if(p.bridge){p.crumble=(p.crumble||0)+1;if(p.crumble>95){p.broken=true;notify("THE BRIDGE IS COLLAPSING");}}
        break;
      }
    }
  }
  if(player.standingPlatform){const p=player.standingPlatform;player.x+=p.dx||0;}
  if(state.area==="bridges"&&player.y>HEIGHT+50){damagePlayer(18);player.y=JYUIS.bridgeY-player.height;player.velocityY=0;player.x=Math.max(state.checkpoint,player.x-90);}
  if(state.area==="secret"&&player.y+player.height>JYUIS.poisonY){
    poisonContact(3,5);player.y=JYUIS.poisonY-player.height-2;player.velocityY=0;player.grounded=true;
  }
  if(state.area==="bridges"){
    for(const h of state.hazards)if(h.kind==="poison"&&overlap(player,h))poisonContact(3,5);
  }
  advancePoison();
  if(player.x>state.checkpoint+620&&player.grounded){state.checkpoint=Math.floor(player.x/650)*650;player.checkpointX=state.checkpoint;}
  if(player.isAttacking&&!state.attackWasActive)state.attackWasActive=false;
  if(player.isAttacking&&!player._jyuisHitApplied){
    player._jyuisHitApplied=true;
    const range=state.massiveSword>0?190:88;
    const hit={x:player.facing>0?player.x+player.width:player.x-range,y:player.y-12,width:range,height:player.height+24};
    for(const e of state.enemies)if(!e.dead&&overlap(hit,e)){e.health-=state.massiveSword>0?220:35;if(e.health<=0){e.dead=true;e.deadTimer=0;}}
    if(state.boss&&state.area==="boss"&&overlap(hit,state.boss)){state.boss.health-=state.massiveSword>0?80:24;}
  }
  if(!player.isAttacking)player._jyuisHitApplied=false;
  if(state.area!=="boss"){
    for(const e of state.enemies){
      if(e.dead)continue;
      if(overlap(player,e)){
        if(player.x+player.width/2<e.x+e.width/2)player.x=e.x-player.width;
        else player.x=e.x+e.width;
      }
    }
  }
  setAnimation(playerAnimation,player.isAttacking?"attack":!player.grounded?(player.velocityY<0?"jump":"fall"):Math.abs(player.velocityX)>0?"walk":"idle");
  advanceAnimation(playerAnimation,PLAYER_ANIMATIONS);
  if(playerAnimation.finished&&playerAnimation.current==="attack")player.isAttacking=false;
}
function poisonContact(amount,ticks){
  if(state.poisonTicks<=0){state.poisonTicks=ticks;state.poisonTimer=0;state.poisonDamage=amount;notify("POISONED — MOVE TO SAFE GROUND");}
}
function applyPeriodicDamage(amount){
  if(player.gameOver||player.levelComplete)return;
  player.health=Math.max(0,player.health-amount);
  player.damageAnimationTimer=22;player.isAttacking=false;
  if(player.health<=0){player.health=0;player.gameOver=true;}
}
function advancePoison(){
  if(state.poisonTicks<=0)return;
  state.poisonTimer++;
  if(state.poisonTimer>=18){state.poisonTimer=0;state.poisonTicks--;if(state.shield<=0)applyPeriodicDamage(state.poisonDamage||3);}
}
function updateEnemiesJyuis(){
  for(const e of state.enemies){
    if(e.dead){e.deadTimer++;continue;}
    e.anim++;e.cooldown--;
    const dx=(player.x+player.width/2)-(e.x+e.width/2);
    e.facing=dx<0?-1:1;
    if(Math.abs(dx)<e.range){
      if(Math.abs(dx)>e.width+26)e.x+=Math.sign(dx)*e.speed;
      else if(e.cooldown<=0){
        e.cooldown=e.miniBoss?105:82;
        if(overlap(player,{x:e.x-20,y:e.y-8,width:e.width+40,height:e.height+16})&&state.shield<=0)damagePlayer(e.damage);
        if(e.poison){state.hazards.push({x:player.x-12,y:430,width:90,height:70,kind:"poison",life:100});}
      }
    }else e.x=e.patrolX+Math.sin(state.tick*.018+e.patrolX)*24;
  }
  state.enemies=state.enemies.filter(e=>!e.dead||e.deadTimer<34);
  state.hazards=state.hazards.filter(h=>h.life===undefined||--h.life>0);
}
function updatePickupsJyuis(){
  for(const c of state.coins){
    if(c.got)continue;
    if(Math.hypot(player.x+player.width/2-c.x,player.y+player.height/2-c.y)<34){c.got=true;state.coinCount++;}
    else if(state.magnet>0&&Math.abs(player.x-c.x)<250){c.x+=(player.x-c.x)*.08;c.y+=(player.y-c.y)*.06;}
  }
  for(const p of state.powerups){
    if(p.got||!overlap(player,{x:p.x-15,y:p.y-15,width:30,height:35}))continue;
    p.got=true;
    if(p.type==="massiveSword")state.massiveSword=600;
    if(p.type==="magnet")state.magnet=720;
    if(p.type==="fastRun")state.fastRun=600;
    if(p.type==="shield")state.shield=600;
    notify(p.type.toUpperCase()+" POWER-UP");
  }
}
function updateBoss(){
  const b=state.boss;if(!b)return;
  b.tick++;b.cooldown--;
  if(!b.transformed&&b.health<=b.maxHealth*.5){b.transformed=true;b.width=190;b.height=225;b.y=235;state.bossCircle.active=true;state.bossCircle.x=b.x+b.width/2;notify("THE NECROMANCER AWAKENS");}
  const dx=player.x-b.x;b.facing=dx<0?-1:1;
  if(b.cooldown<=0){
    const choice=(b.attackIndex++)%4;b.cooldown=b.transformed?95:135;
    if(choice===0||choice===1){
      const kind=choice===0?"fire":"poison";
      state.bossProjectiles.push({x:b.x+(b.facing>0?b.width:0),y:b.y+80,vx:b.facing*(kind==="fire"?5.2:3.8),vy:kind==="fire"?-0.2:0,kind,life:150});
    }else if(choice===2){
      state.bossProjectiles.push({x:player.x-130,y:440,vx:0,vy:0,kind:"ancient",life:58,width:260});
    }else{
      state.bossCircle.active=true;state.bossCircle.timer=210;state.bossCircle.x=b.x+b.width/2;state.bossCircle.damageTick=0;
    }
  }
  for(const p of state.bossProjectiles){
    p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.kind==="ancient"){
      if(overlap(player,{x:p.x,y:420,width:p.width,height:48})&&state.shield<=0&&player.damageCooldown<=0)damagePlayer(22);
    }else if(overlap(player,{x:p.x-18,y:p.y-18,width:36,height:36})&&state.shield<=0&&player.damageCooldown<=0){
      damagePlayer(p.kind==="fire"?20:14);
      if(p.kind==="poison")poisonContact(3,5);
      p.life=0;
    }
  }
  state.bossProjectiles=state.bossProjectiles.filter(p=>p.life>0&&p.x>-100&&p.x<JYUIS.end+100);
  if(state.bossCircle.active){
    if(state.bossCircle.timer>0)state.bossCircle.timer--;
    else if(!b.transformed)state.bossCircle.active=false;
    const c=state.bossCircle;
    const inside=Math.abs((player.x+player.width/2)-c.x)<c.radius&&player.y+player.height>=438;
    if(inside&&state.shield<=0){c.damageTick++;if(c.damageTick>=30){c.damageTick=0;applyPeriodicDamage(10);}}
    else c.damageTick=0;
  }
  if(b.health<=0){state.boss=null;player.levelComplete=true;state.finalUnlocked=true;notify("THE NECROMANCER HAS FALLEN");}
}
function updateJyuis(){
  if(!state.active)return;
  state.tick++;
  if(state.transition>0)state.transition--;
  if(state.notificationTimer>0)state.notificationTimer--;
  updateEnemiesJyuis();updatePickupsJyuis();
  if(state.area==="boss")updateBoss();
  if(state.area==="bridges"&&player.x>JYUIS.bridgeEnd-180){
    const alive=state.enemies.some(e=>!e.dead);
    if(!alive){state.area="secret";state.enemies=[makeEnemy("skeleton",JYUIS.secretStart+480,279),makeEnemy("poison",JYUIS.secretStart+1260,208)];state.enemies[0].secret=true;state.enemies[1].secret=true;player.x=JYUIS.secretStart+160;player.y=400-player.height;player.velocityY=0;notify("SECRET WORLD — THE POISON DEPTHS");}
  }
  if(state.area==="secret"&&player.x>JYUIS.secretEnd-170){
    if(state.enemies.some(e=>!e.dead)){player.x=JYUIS.secretEnd-220;notify("DEFEAT THE DEPTH GUARDIANS FIRST");}
    else {state.area="boss";player.x=JYUIS.bossStart+80;player.y=460-player.height;player.velocityY=0;
      state.boss={x:JYUIS.bossStart+640,y:280,width:118,height:180,health:620,maxHealth:620,
        cooldown:100,tick:0,attackIndex:0,facing:-1,transformed:false};
      state.bossCircle.active=false;notify("FINAL BOSS — THE NECROMANCER");}
  }
  if(player.gameOver){state.active=false;}
}
function drawSprite(e,sheet,row){
  if(!sheet.ready)return false;
  const frame=Math.floor(state.tick/(e.miniBoss?9:11))%4;
  const sx=frame*sheet.fw,sy=row*sheet.fh;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(e.x+e.width/2,0);ctx.scale(e.facing||1,1);
  ctx.drawImage(sheet.image,sx,sy,sheet.fw,sheet.fh,-e.width/2,e.y,e.width,e.height);
  ctx.restore();return true;
}
function drawEnemyJyuis(e){
  if(e.dead)return;
  const sheet=e.kind==="skeleton"?sprite.skeleton:sprite.poison;
  if(!drawSprite(e,sheet,e.cooldown<16?2:1)){
    ctx.fillStyle=e.kind==="skeleton"?"#d4d0c8":"#829b54";
    ctx.fillRect(e.x,e.y,e.width,e.height);
  }
  ctx.fillStyle="#17131d";ctx.fillRect(e.x-4,e.y-13,e.width+8,6);
  ctx.fillStyle=e.miniBoss?"#e5a45b":"#c75b75";ctx.fillRect(e.x-3,e.y-12,(e.width+6)*clamp(e.health/e.maxHealth,0,1),4);
  if(e.miniBoss){ctx.fillStyle="#f3d8a0";ctx.font="12px Georgia";ctx.textAlign="center";ctx.fillText(e.name||"MINI BOSS",e.x+e.width/2,e.y-21);}
}
function drawBackgroundJyuis(){
  const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#777080");g.addColorStop(.58,"#9a8799");g.addColorStop(1,"#433d50");
  ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.save();ctx.globalAlpha=.18;ctx.fillStyle="#e4c4d8";
  for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(90+i*145,110+(i%3)*38,42+i%2*18,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function drawEnvironmentJyuis(){
  for(let i=0;i<Math.ceil(JYUIS.end/340);i++){
    const x=i*340;
    const h=115+(i*47%130);
    ctx.fillStyle=i%2?"#373343":"#292733";
    ctx.fillRect(x,420-h,18,h);
    ctx.strokeStyle="#292733";ctx.lineWidth=12;
    ctx.beginPath();ctx.moveTo(x+8,420-h+30);ctx.quadraticCurveTo(x-55,300-h,x-30,250-h);ctx.stroke();
    ctx.fillStyle="#b43d69";
    for(let j=0;j<4;j++)ctx.fillRect(x-20+j*12,385-j%2*12,5,5);
  }
}
function drawGroundJyuis(){
  if(state.area==="boss"){
    ctx.fillStyle="#24212c";ctx.fillRect(0,460,JYUIS.end,HEIGHT-460);
    ctx.fillStyle="#514452";ctx.fillRect(0,460,JYUIS.end,12);
    return;
  }
  ctx.fillStyle="#153b36";ctx.fillRect(0,JYUIS.poisonY,JYUIS.end,HEIGHT-JYUIS.poisonY);
  ctx.fillStyle="#387b61";
  for(let x=0;x<JYUIS.end;x+=54){ctx.fillRect(x+Math.sin(x)*8,JYUIS.poisonY+8,22,4);}
}
function drawPlatformsJyuis(){
  const visible=(state.area==="bridges"?state.platforms.filter(p=>!p.secret):state.platforms.filter(p=>p.secret));
  for(const p of visible){
    if(p.broken)continue;
    ctx.fillStyle=p.bridge?"#37313d":"#4b4654";ctx.fillRect(p.x,p.y,p.width,p.height);
    ctx.fillStyle="#827487";ctx.fillRect(p.x,p.y,p.width,4);
    ctx.fillStyle="#292632";ctx.fillRect(p.x+8,p.y+8,p.width-16,4);
    if(p.bridge&&p.crumble>45){ctx.fillStyle="#c04b72";ctx.fillRect(p.x+p.width*.5,p.y-3,8,3);}
  }
  for(const p of state.moving)if(state.area==="secret"){
    ctx.fillStyle="#665b70";ctx.fillRect(p.x,p.y,p.width,p.height);
    ctx.fillStyle="#c18cae";ctx.fillRect(p.x,p.y,p.width,4);
  }
}
function drawHazards(){
  for(const h of state.hazards){
    if(h.life!==undefined&&h.life<=0)continue;
    ctx.fillStyle=h.kind==="deepPoison"?"rgba(37,132,91,.9)":"rgba(51,154,105,.85)";
    ctx.fillRect(h.x,h.y,h.width,h.height);
    ctx.fillStyle="rgba(187,255,201,.45)";
    for(let x=h.x+8;x<h.x+h.width;x+=28)ctx.fillRect(x,h.y+Math.sin(state.tick*.1+x)*5,8,3);
  }
}
function drawPickups(){
  for(const c of state.coins)if(!c.got){
    ctx.fillStyle="#a9d65d";ctx.fillRect(c.x-7,c.y-7,14,14);
    ctx.fillStyle="#33452b";ctx.fillRect(c.x-3,c.y-3,6,6);
  }
  for(const p of state.powerups)if(!p.got){
    const colors={massiveSword:"#e7d9ad",magnet:"#e7a94c",fastRun:"#8de2b1",shield:"#8fc8ed"};
    ctx.fillStyle=colors[p.type]||"#fff";ctx.fillRect(p.x-10,p.y-10,20,20);
    ctx.strokeStyle="#241e2b";ctx.strokeRect(p.x-10,p.y-10,20,20);
  }
}
function drawBoss(){
  const b=state.boss;if(!b)return;
  if(state.bossCircle.active){
    ctx.save();ctx.strokeStyle="rgba(160,75,205,.85)";ctx.lineWidth=5;ctx.shadowBlur=22;ctx.shadowColor="#a24cce";
    ctx.beginPath();ctx.ellipse(state.bossCircle.x,460, state.bossCircle.radius,22,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="rgba(110,220,130,.7)";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(state.bossCircle.x,460,state.bossCircle.radius-12,15,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(!drawSprite({x:b.x,y:b.y,width:b.width,height:b.height,facing:b.facing},sprite.necromancer,b.transformed?3:0)){
    ctx.fillStyle="#3b2445";ctx.fillRect(b.x,b.y,b.width,b.height);
  }
  for(const p of state.bossProjectiles){
    ctx.fillStyle=p.kind==="fire"?"#ef713f":p.kind==="poison"?"#80cf6b":"#d8bd78";
    ctx.beginPath();ctx.arc(p.x,p.y,p.kind==="ancient"?12:10,0,Math.PI*2);ctx.fill();
  }
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle="rgba(15,10,20,.85)";ctx.fillRect(WIDTH/2-190,24,380,18);
  ctx.fillStyle="#a74768";ctx.fillRect(WIDTH/2-187,27,374*clamp(b.health/b.maxHealth,0,1),12);
  ctx.strokeStyle="#ead9d0";ctx.strokeRect(WIDTH/2-190,24,380,18);
  ctx.fillStyle="#f1e7df";ctx.font="bold 14px Georgia";ctx.textAlign="center";ctx.fillText("THE NECROMANCER",WIDTH/2,17);ctx.restore();
}
function drawHUD(){
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="rgba(16,13,23,.82)";ctx.fillRect(16,16,220,58);
  ctx.fillStyle="#eee1e5";ctx.font="12px Georgia";ctx.textAlign="left";
  ctx.fillText(state.area==="bridges"?"THE POISON BRIDGES":state.area==="secret"?"THE POISON DEPTHS":"THE FINAL RITUAL",28,34);
  ctx.fillText("ZOMBIE COINS: "+state.coinCount,28,55);
  if(state.poisonTicks>0){ctx.fillStyle="#a8e17e";ctx.fillText("POISONED",28,68);}
  ctx.restore();
}
function drawNotificationJyuis(){
  if(state.notificationTimer<=0)return;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.textAlign="center";ctx.fillStyle="rgba(14,10,20,.82)";ctx.fillRect(WIDTH/2-190,HEIGHT-92,380,34);
  ctx.fillStyle="#f0dce6";ctx.font="14px Georgia";ctx.fillText(state.notification,WIDTH/2,HEIGHT-70);ctx.restore();
}
function drawJyuisWorld(){
  if(!state.active)return;
  drawHazards();drawPickups();
  for(const e of state.enemies)drawEnemyJyuis(e);
  if(state.area==="boss")drawBoss();
  drawHUD();drawNotificationJyuis();
  if(state.transition>0){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="rgba(15,10,20,"+Math.min(.9,state.transition/130)+")";ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.textAlign="center";ctx.fillStyle="#f0e2e8";ctx.font="bold 30px Georgia";ctx.fillText("THE JYUIS WORLD",WIDTH/2,HEIGHT/2);ctx.restore();}
}

// Hook only while this world is active.
const baseUpdatePlayer=updatePlayer;
updatePlayer=function(){if(state.active){updatePlayerJyuis();return;}baseUpdatePlayer();};
const baseUpdateWorldTwo=updateWorldTwo;
updateWorldTwo=function(){baseUpdateWorldTwo();if(state.active)updateJyuis();};
const baseDrawWorldTwo=drawWorldTwo;
drawWorldTwo=function(){baseDrawWorldTwo();if(state.active)drawJyuisWorld();};
const baseDrawBackground=drawBackground;
drawBackground=function(){if(state.active)drawBackgroundJyuis();else baseDrawBackground();};
const baseDrawEnvironment=drawEnvironment;
drawEnvironment=function(t){if(state.active)drawEnvironmentJyuis();else baseDrawEnvironment(t);};
const baseDrawGround=drawGround;
drawGround=function(){if(state.active)drawGroundJyuis();else baseDrawGround();};
const baseDrawPlatforms=drawPlatforms;
drawPlatforms=function(){if(state.active)drawPlatformsJyuis();else baseDrawPlatforms();};
const baseUpdateMovingPlatforms=updateMovingPlatforms;
updateMovingPlatforms=function(){if(!state.active){baseUpdateMovingPlatforms();return;}for(const p of state.moving){p.oldX=p.x;p.x+=p.speed*p.dir;if(p.x<p.min||p.x>p.max)p.dir*=-1;p.dx=p.x-p.oldX;}};
const baseCheckSwordHit=checkSwordHit;
checkSwordHit=function(){if(!state.active)baseCheckSwordHit();};
const baseDrawLevelProgress=drawLevelProgress;
drawLevelProgress=function(){if(!state.active){baseDrawLevelProgress();return;}ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="rgba(20,15,25,.8)";ctx.fillRect(WIDTH-190,18,170,8);ctx.fillStyle="#c66c91";ctx.fillRect(WIDTH-190,18,170*clamp(player.x/JYUIS.end,0,1),8);ctx.fillStyle="#f0e2e8";ctx.font="11px Georgia";ctx.textAlign="right";ctx.fillText(state.area==="boss"?"NECROMANCER":"THE JYUIS WORLD",WIDTH-20,14);ctx.restore();};
const baseDrawLevelComplete=drawLevelComplete;
drawLevelComplete=function(){
  if(state.active&&player.levelComplete&&state.finalUnlocked){
    ctx.fillStyle="rgba(8,7,13,.91)";ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.textAlign="center";ctx.fillStyle="#d8b7d4";ctx.font="38px Georgia";ctx.fillText("THE NECROMANCER HAS FALLEN",WIDTH/2,HEIGHT/2-65);
    ctx.fillStyle="#f0e6e9";ctx.font="21px Georgia";ctx.fillText("THE JYUIS WORLD IS FREE",WIDTH/2,HEIGHT/2-18);
    ctx.fillStyle="#d6c5d0";ctx.font="15px Georgia";ctx.fillText("Zombie Coins Collected: "+state.coinCount,WIDTH/2,HEIGHT/2+20);
    ctx.fillText("THE END",WIDTH/2,HEIGHT/2+55);
    drawCanvasButton("PLAY AGAIN",WIDTH/2-62,HEIGHT/2+88,124,42);
    return;
  }
  if(!state.active&&deathSnowState.victory&&!player.gameOver){
    ctx.fillStyle="rgba(8,7,13,.92)";ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.textAlign="center";ctx.fillStyle="#e4c4d8";ctx.font="40px Georgia";ctx.fillText("THANK YOU",WIDTH/2,HEIGHT/2-90);
    ctx.fillStyle="#f0e8ed";ctx.font="22px Georgia";ctx.fillText("THE DEATH SNOW HAS BEEN CONQUERED",WIDTH/2,HEIGHT/2-42);
    ctx.fillStyle="#cdbdca";ctx.font="15px Georgia";ctx.fillText("A new realm awaits beyond the poison bridges.",WIDTH/2,HEIGHT/2-8);
    drawCanvasButton("CONTINUE",WIDTH/2-145,HEIGHT/2+45,125,44);
    drawCanvasButton("PLAY AGAIN",WIDTH/2+20,HEIGHT/2+45,125,44);
    return;
  }
  baseDrawLevelComplete();
};
function drawCanvasButton(label,x,y,w,h){
  ctx.fillStyle="rgba(92,53,82,.95)";ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="#d7b3ce";ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#fff0f6";ctx.font="bold 13px Georgia";ctx.textAlign="center";ctx.fillText(label,x+w/2,y+h/2+5);
}
canvas.addEventListener("click",event=>{
  if(state.active&&player.levelComplete&&state.finalUnlocked){
    const r=canvas.getBoundingClientRect(),fx=(event.clientX-r.left)*WIDTH/r.width,fy=(event.clientY-r.top)*HEIGHT/r.height;
    if(fx>=WIDTH/2-62&&fx<=WIDTH/2+62&&fy>=HEIGHT/2+88&&fy<=HEIGHT/2+130)restartGame();
    return;
  }
  if(state.active||!deathSnowState.victory)return;
  const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*WIDTH/r.width,y=(event.clientY-r.top)*HEIGHT/r.height;
  const cy=HEIGHT/2+45;
  if(y>=cy&&y<=cy+44){
    if(x>=WIDTH/2-145&&x<=WIDTH/2-20){startWorld();}
    else if(x>=WIDTH/2+20&&x<=WIDTH/2+145)restartGame();
  }
});
const baseRestartGame=restartGame;
restartGame=function(){state.active=false;state.boss=null;state.enemies=[];state.projectiles=[];LEVEL.end=WORLD_WIDTH;ground.width=WORLD_WIDTH;ground.y=LEVEL.groundY;baseRestartGame();};
console.log("THE HOLLOW CROWN — THE JYUIS WORLD LOADED");
window.jyuisWorldState=state;
})();