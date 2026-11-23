// THE HOLLOW CROWN — WORLD II + ASHEN SOVEREIGN INTEGRATION FIX
// Loaded after game.js and before death_snow.js.
(() => {
  "use strict";

  // World I -> World II: the Ancient Gate is tied only to the Sunken Sentinel.
  updateAncientGate = function () {
    if (worldTwoState.phase !== 1) return;
    ancientGate.open = !!worldTwoState.worldOneBossDefeated;
    if (ancientGate.open) ancientGate.opening = Math.min(1, ancientGate.opening + 0.008);

    const nearGate =
      player.x + player.width > ancientGate.x - 45 &&
      player.x < ancientGate.x + ancientGate.width + 45 &&
      Math.abs(player.y + player.height - LEVEL.groundY) < 90;

    if (ancientGate.open && nearGate && keys.e) {
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
      keys.e = false;
    }
  };

  // Never allow crossing the World II gate until both boss and relic conditions
  // are fulfilled. This is a physical barrier, not just a locked visual.
  const hcPlayerBeforeSovereignLock = updatePlayer;
  updatePlayer = function () {
    hcPlayerBeforeSovereignLock();
    if (worldTwoState.phase === 2) {
      const gateReady = !!(worldTwoState.bossDefeated && worldTwoState.spearCollected);
      if (!gateReady) {
        const wallX = secondGate.x - player.width - 8;
        if (player.x > wallX) {
          player.x = wallX;
          player.velocityX = Math.min(0, player.velocityX);
        }
        worldTwoState.secondGateOpen = false;
        secondGate.opening = 0;
      }
      return;
    }

    // In the throne epilogue, the portal is the only route into World III.
    // Stop the player at its threshold; pressing E at the gate performs the
    // actual phase transition in death_snow.js.
    if (worldTwoState.phase === 3 && typeof deathSnowGate !== "undefined") {
      const portalWall = deathSnowGate.x - player.width - 8;
      if (player.x > portalWall) {
        player.x = portalWall;
        player.velocityX = Math.min(0, player.velocityX);
      }
    }
  };

  // Keep the gate closed unless the Ashen Sovereign is defeated AND its relic
  // has been collected. Transition is performed at the gate, never by walking
  // through the scenery or reaching the snow coordinates.
  updateWorldTwoProgression = function () {
    if (worldTwoState.phase !== 2) return;

    const unlocked = !!(worldTwoState.bossDefeated && worldTwoState.spearCollected);
    worldTwoState.secondGateOpen = unlocked;
    if (!unlocked) {
      secondGate.opening = 0;
      return;
    }

    secondGate.opening = Math.min(1, secondGate.opening + 0.012);
    const near =
      player.x + player.width > secondGate.x - 45 &&
      player.x < secondGate.x + secondGate.width + 45 &&
      Math.abs(player.y + player.height - ground.y) < 90;

    if (near && keys.e) {
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
      keys.e = false;
    }
  };

  // Use the uploaded Ashen Stalker sheet as the Ashen Sovereign's actual art.
  // 640x480 sheet = 8 columns x 6 rows of 80x80 frames.
  const ashenSovereignSprite = new Image();
  ashenSovereignSprite.src = "assets/ashen_stalker_spritesheet_v1.png";
  ashenSovereignSprite.onerror = () => console.error(
    "Ashen Sovereign spritesheet missing: assets/ashen_stalker_spritesheet_v1.png"
  );

  const ASHEN_FRAME = 80;
  const ASHEN_ROWS = {
    idle:   { row: 0, frames: 6, delay: 9 },
    walk:   { row: 1, frames: 8, delay: 7 },
    attack: { row: 2, frames: 8, delay: 5 },
    damage: { row: 3, frames: 6, delay: 6 },
    death:  { row: 5, frames: 6, delay: 9 }
  };

  function ashenAnimation(enemy, state) {
    if (enemy.ashenAnimState !== state) {
      enemy.ashenAnimState = state;
      enemy.ashenAnimFrame = 0;
      enemy.ashenAnimClock = 0;
    }
    const cfg = ASHEN_ROWS[state] || ASHEN_ROWS.idle;
    enemy.ashenAnimClock = (enemy.ashenAnimClock || 0) + 1;
    if (enemy.ashenAnimClock >= cfg.delay) {
      enemy.ashenAnimClock = 0;
      enemy.ashenAnimFrame = ((enemy.ashenAnimFrame || 0) + 1) % cfg.frames;
    }
  }

  const hcEnemyBeforeSovereignAI = updateEnemy;
  updateEnemy = function (enemy) {
    if (!enemy || !enemy.ashenBoss || worldTwoState.phase !== 2) {
      hcEnemyBeforeSovereignAI(enemy);
      return;
    }

    if (enemy.state === "death" || enemy.state === "dead") {
      ashenAnimation(enemy, "death");
      hcEnemyBeforeSovereignAI(enemy);
      return;
    }
    if (enemy.state === "damage") {
      ashenAnimation(enemy, "damage");
      hcEnemyBeforeSovereignAI(enemy);
      return;
    }

    const px = player.x + player.width / 2;
    const ex = enemy.x + enemy.width / 2;
    const dx = px - ex;
    const dist = Math.abs(dx);
    enemy.facing = dx < 0 ? -1 : 1;
    enemy.ashenAttackTimer = enemy.ashenAttackTimer || 0;
    enemy.attackCooldown = Math.max(0, (enemy.attackCooldown || 0) - 1);

    // Phase two begins at half health: larger silhouette and faster attacks.
    if (enemy.health / enemy.maxHealth <= 0.5 && enemy.phase < 2) {
      enemy.phase = 2;
      enemy.width = 176;
      enemy.height = 212;
      enemy.y = ground.y - enemy.height;
      enemy.speed = 1.35;
      enemy.damage = 38;
      enemy.attackRange = 205;
      enemy.patrolStart = WORLD_TWO.bossX - 420;
      enemy.patrolEnd = WORLD_TWO.bossX + 420;
      showNotification("THE SOVEREIGN'S ASHEN ARMOUR AWAKENS");
    }

    if (enemy.ashenAttacking) {
      enemy.ashenAttackTimer++;
      ashenAnimation(enemy, "attack");

      // A deliberate wind-up makes each strike readable and dodgeable.
      if (enemy.ashenAttackTimer === 22 && !enemy.ashenImpactDone) {
        enemy.ashenImpactDone = true;
        const currentDx = Math.abs(
          player.x + player.width / 2 - (enemy.x + enemy.width / 2)
        );
        const vertical = Math.abs(
          (player.y + player.height) - (enemy.y + enemy.height)
        );
        const reach = enemy.phase === 2 ? 230 : 178;
        if (currentDx < reach && vertical < 125) {
          damagePlayer(enemy.damage);
          player.velocityX = enemy.facing * (enemy.phase === 2 ? 8 : 6);
          player.velocityY = -5;
        }
      }

      if (enemy.ashenAttackTimer >= 43) {
        enemy.ashenAttacking = false;
        enemy.ashenAttackTimer = 0;
        enemy.ashenImpactDone = false;
        enemy.attackCooldown = enemy.phase === 2 ? 62 : 88;
        setEnemyState(enemy, "idle");
      }
      return;
    }

    if (dist < enemy.detectionRange) {
      if (dist > (enemy.phase === 2 ? 150 : 125)) {
        enemy.x += Math.sign(dx) * enemy.speed;
        ashenAnimation(enemy, "walk");
        setEnemyState(enemy, "walk");
      } else if (enemy.attackCooldown <= 0) {
        enemy.ashenAttacking = true;
        enemy.ashenAttackTimer = 0;
        enemy.ashenImpactDone = false;
        ashenAnimation(enemy, "attack");
        setEnemyState(enemy, "attack");
        return;
      } else {
        ashenAnimation(enemy, "idle");
        setEnemyState(enemy, "idle");
      }
    } else {
      ashenAnimation(enemy, "idle");
      setEnemyState(enemy, "idle");
    }

    enemy.x = Math.max(
      enemy.patrolStart,
      Math.min(enemy.patrolEnd, enemy.x)
    );
  };

  const hcDrawEnemyBeforeSovereignSheet = drawEnemy;
  drawEnemy = function (enemy) {
    if (!enemy || !enemy.ashenBoss) {
      hcDrawEnemyBeforeSovereignSheet(enemy);
      return;
    }

    const state = enemy.state === "death" || enemy.state === "dead"
      ? "death"
      : enemy.ashenAttacking || enemy.state === "attack"
        ? "attack"
        : enemy.state === "damage"
          ? "damage"
          : enemy.state === "walk"
            ? "walk"
            : "idle";
    const cfg = ASHEN_ROWS[state];
    const frame = Math.min(enemy.ashenAnimFrame || 0, cfg.frames - 1);
    const scale = enemy.phase === 2 ? 2.55 : 2.25;
    const drawW = ASHEN_FRAME * scale;
    const drawH = ASHEN_FRAME * scale;

    ctx.save();
    ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height);
    ctx.scale(enemy.facing || 1, 1);
    ctx.imageSmoothingEnabled = false;

    if (ashenSovereignSprite.complete && ashenSovereignSprite.naturalWidth >= 640) {
      ctx.drawImage(
        ashenSovereignSprite,
        frame * ASHEN_FRAME,
        cfg.row * ASHEN_FRAME,
        ASHEN_FRAME,
        ASHEN_FRAME,
        -drawW / 2,
        -drawH,
        drawW,
        drawH
      );
    } else {
      // Visible fallback if the asset path is accidentally changed.
      ctx.fillStyle = "#302b35";
      ctx.fillRect(-enemy.width / 2, -enemy.height, enemy.width, enemy.height);
      ctx.fillStyle = "#f0783d";
      ctx.fillRect(-12, -enemy.height + 32, 8, 5);
      ctx.fillRect(5, -enemy.height + 32, 8, 5);
    }
    ctx.restore();


  };

  // Ensure boss defeat and relic state are authoritative even if another
  // damage wrapper changes later.
  const hcDamageBeforeSovereignGuard = damageEnemy;
  damageEnemy = function (enemy) {
    if (!enemy || enemy.state === "death" || enemy.state === "dead") return;
    hcDamageBeforeSovereignGuard(enemy);
    if (enemy.ashenBoss && enemy.health <= 0) {
      worldTwoState.bossDefeated = true;
      worldTwoState.bossArenaLocked = false;
    }
  };

  // Keep the completed throne cinematic playable so the player can reach the
  // Death Snow portal; hide the epilogue after they walk away.
  const originalDrawFinalEnding = drawFinalEnding;
  drawFinalEnding = function () {
    if (worldTwoState.phase === 3 && endingSequence.finished &&
        player.x > throne.x + 150) return;
    originalDrawFinalEnding();
  };

  console.log("HOLLOW CROWN — World II gate + Ashen Sovereign sprite/AI integrated");
})();
