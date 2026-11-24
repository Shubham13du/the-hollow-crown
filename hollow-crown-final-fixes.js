/*
 * THE HOLLOW CROWN — FINAL INTEGRATION FIXES
 * Load AFTER death-snow-gate-hotfix.js and all existing game scripts.
 * This file does not replace or modify the existing game modules.
 */
(() => {
  "use strict";

  if (window.__HC_FINAL_FIXES_LOADED__) return;
  window.__HC_FINAL_FIXES_LOADED__ = true;

  // -------------------------------------------------------------------------
  // 1. ASHEN SOVEREIGN ARENA CHECKPOINT
  // -------------------------------------------------------------------------
  const updateWorldTwoBeforeArenaCheckpoint = updateWorldTwo;
  let ashenArenaCheckpointActivated = false;

  updateWorldTwo = function () {
    updateWorldTwoBeforeArenaCheckpoint();

    if (worldTwoState.phase !== 2) {
      if (worldTwoState.phase < 2) ashenArenaCheckpointActivated = false;
      return;
    }

    // Save just before the Sovereign's arena lock, rather than leaving the
    // player tied to the old World II entrance checkpoint.
    const checkpointX = WORLD_TWO.bossX - 520;
    if (!ashenArenaCheckpointActivated &&
        player.x >= WORLD_TWO.bossX - 650 &&
        !worldTwoState.bossDefeated) {
      ashenArenaCheckpointActivated = true;
      player.checkpointX = checkpointX;
      player.health = player.maxHealth;
      showNotification("ASHEN SOVEREIGN — ARENA CHECKPOINT ACTIVATED");
    }
  };

  // -------------------------------------------------------------------------
  // 2. CLEAR STALE DEATH / COMPLETION FLAGS AT WORLD TRANSITIONS
  // -------------------------------------------------------------------------
  const updateWorldTwoProgressionBeforeTransitionFix = updateWorldTwoProgression;
  updateWorldTwoProgression = function () {
    const previousPhase = worldTwoState.phase;
    updateWorldTwoProgressionBeforeTransitionFix();

    if (previousPhase === 2 && worldTwoState.phase === 3) {
      player.gameOver = false;
      player.levelComplete = false;
      player.health = player.maxHealth;
      player.velocityX = 0;
      player.velocityY = 0;
      player.isAttacking = false;
      for (const key in keys) keys[key] = false;
    }
  };

  const enterDeathSnowBeforeTransitionFix = dsEnterWorld;
  dsEnterWorld = function () {
    enterDeathSnowBeforeTransitionFix();
    // Clear the World II throne epilogue before World III starts.
    endingSequence.active = false;
    endingSequence.finished = false;
    endingSequence.timer = 0;
    // Do this immediately. Waiting for the next updateWorldTwo tick can
    // deadlock the game loop if a stale gameOver/levelComplete flag remains.
    player.gameOver = false;
    player.levelComplete = false;
    player.health = player.maxHealth;
    player.velocityX = 0;
    player.velocityY = 0;
    player.isAttacking = false;
    player.attackCooldown = 0;
    player.grounded = true;
    for (const key in keys) keys[key] = false;
  };

  // -------------------------------------------------------------------------
  // 3. FLIGHT TIMER: only one decrement per frame
  // -------------------------------------------------------------------------
  const updateDeathSnowBeforeFlightTimerFix = updateDeathSnow;
  updateDeathSnow = function () {
    // updatePlayer already decrements flightTime. The original
    // updateDeathSnow decrements it a second time; compensate for that one
    // decrement so the total per rendered frame remains exactly one.
    if (deathSnowState.flightTime > 0) deathSnowState.flightTime += 1;
    updateDeathSnowBeforeFlightTimerFix();
  };

  // -------------------------------------------------------------------------
  // 4. ANCIENT SNOW GOD: independent melee cooldown
  // -------------------------------------------------------------------------
  const updateSnowBossBeforeMeleeFix = dsUpdateBossAI;
  dsUpdateBossAI = function (boss) {
    if (!boss || boss.deathSnowType !== "snowgod" ||
        boss.state === "death" || boss.state === "dead") {
      updateSnowBossBeforeMeleeFix(boss);
      return;
    }

    if (boss.meleeCooldown > 0) boss.meleeCooldown--;
    updateSnowBossBeforeMeleeFix(boss);

    const distance = Math.abs(
      (player.x + player.width / 2) - (boss.x + boss.width / 2)
    );
    if (distance < 145 && (boss.meleeCooldown || 0) <= 0 &&
        boss.state !== "death" && boss.state !== "dead") {
      damagePlayer(10);
      player.velocityX = (boss.facing || 1) * 5;
      player.velocityY = -4;
      boss.meleeCooldown = 105;
      dsBurst(player.x + player.width / 2, player.y + 25, 14, "ice");
    }
  };

  const spawnSnowBossBeforeMeleeFix = dsSpawnBoss;
  dsSpawnBoss = function (index) {
    spawnSnowBossBeforeMeleeFix(index);
    const boss = enemies.find(e => e.deathSnowBoss && e.deathSnowBossIndex === index);
    if (boss && index === 3) boss.meleeCooldown = 45;
  };

  // -------------------------------------------------------------------------
  // 5. KEEP THE OLD THRONE ENDING OFF THE DEATH SNOW SCREEN
  // -------------------------------------------------------------------------
  const drawThroneEndingBeforeDeathSnowHide = drawFinalEnding;
  drawFinalEnding = function () {
    if (worldTwoState.phase === 4 && deathSnowState.active) return;
    drawThroneEndingBeforeDeathSnowHide();
  };

  // -------------------------------------------------------------------------
  // 6. FINAL ENDING OVERLAY + PLAY AGAIN
  // -------------------------------------------------------------------------
  const endingStyle = document.createElement("style");
  endingStyle.textContent = `
    #hcFinalEnding {
      position: fixed; inset: 0; z-index: 5000; display: none;
      align-items: center; justify-content: center; padding: 24px;
      text-align: center; color: #eee7d9;
      background:
        radial-gradient(ellipse at 50% 42%, rgba(120,99,68,.20), transparent 48%),
        linear-gradient(180deg, rgba(5,6,11,.97), rgba(12,11,17,.985));
      font-family: Georgia, serif;
    }
    #hcFinalEnding.hc-visible { display: flex; }
    #hcFinalEnding .hc-ending-inner { width: min(760px, 94vw); animation: hcEndingRise 1.1s ease both; }
    #hcFinalEnding .hc-ending-rule { width: min(310px, 65vw); height: 1px; margin: 22px auto; background: linear-gradient(90deg, transparent, #c7a66a, transparent); }
    #hcFinalEnding h1 {
      margin: 0; color: #e4c98f; font: 600 clamp(28px, 5vw, 54px)/1.2 Cinzel, Georgia, serif;
      letter-spacing: .12em; text-shadow: 0 0 35px rgba(210,176,111,.18);
    }
    #hcFinalEnding .hc-keeper { margin: 22px 0; color: #eee5d6; font: italic clamp(17px, 2.6vw, 24px) Georgia, serif; }
    #hcFinalEnding .hc-the-end { margin: 25px 0 14px; color: #c7a66a; font: 15px Cinzel, Georgia, serif; letter-spacing: .35em; }
    #hcFinalEnding .hc-thanks { max-width: 560px; margin: 0 auto 32px; color: #aaa39a; font: 14px/1.8 Georgia, serif; }
    #hcPlayAgain {
      min-width: 190px; padding: 14px 28px; border: 1px solid #c7a66a;
      background: linear-gradient(110deg, rgba(130,99,53,.35), rgba(35,30,27,.8));
      color: #f0dfbb; font: 12px Cinzel, Georgia, serif; letter-spacing: .24em;
      cursor: pointer; transition: .2s ease;
    }
    #hcPlayAgain:hover { background: rgba(160,125,74,.3); border-color: #f0d49a; transform: translateY(-2px); }
    @keyframes hcEndingRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 520px) { #hcFinalEnding .hc-thanks { font-size: 13px; } }
  `;
  document.head.appendChild(endingStyle);

  const endingOverlay = document.createElement("section");
  endingOverlay.id = "hcFinalEnding";
  endingOverlay.setAttribute("aria-label", "The Hollow Crown ending");
  endingOverlay.innerHTML = `
    <div class="hc-ending-inner">
      <h1>THE HOLLOW CROWN</h1>
      <div class="hc-ending-rule"></div>
      <p class="hc-keeper">the throne has found its keeper.</p>
      <p class="hc-the-end">THE END</p>
      <p class="hc-thanks">Thanks for playing the pre release version<br>stay tuned for the final one!!</p>
      <button id="hcPlayAgain" type="button">PLAY AGAIN</button>
    </div>
  `;
  document.body.appendChild(endingOverlay);

  const playAgainButton = endingOverlay.querySelector("#hcPlayAgain");
  playAgainButton.addEventListener("click", () => {
    endingOverlay.classList.remove("hc-visible");
    restartGame();
    player.gameOver = false;
    player.levelComplete = false;
    if (typeof HC_AUDIO !== "undefined" && HC_AUDIO && typeof HC_AUDIO.play === "function") {
      HC_AUDIO.play("exploration");
    }
  });

  // Keep the existing loop and draw order intact; poll victory from the
  // animation frame callback without starting a second game loop.
  let endingVisible = false;
  function syncFinalEnding() {
    const won = !!(deathSnowState.victory && player.levelComplete);
    if (won !== endingVisible) {
      endingVisible = won;
      endingOverlay.classList.toggle("hc-visible", won);
    }
    requestAnimationFrame(syncFinalEnding);
  }
  requestAnimationFrame(syncFinalEnding);

  // -------------------------------------------------------------------------
  // 7. FULL RESTART: reset all three worlds and their progression flags
  // -------------------------------------------------------------------------
  const restartBeforeFullWorldReset = restartGame;
  restartGame = function () {
    restartBeforeFullWorldReset();

    worldTwoState.phase = 1;
    worldTwoState.tick = 0;
    worldTwoState.bossDefeated = false;
    worldTwoState.secondGateOpen = false;
    worldTwoState.endingStarted = false;
    worldTwoState.worldOneBossDefeated = false;
    worldTwoState.spearCollected = false;
    worldTwoState.spearDropped = false;
    worldTwoState.spearRelic = null;
    worldTwoState.bossArenaLocked = false;
    worldTwoState.bossSpawned = false;
    worldTwoState.waveIndex = 0;
    worldTwoState.waveLockActive = false;
    worldTwoState.activeWaveZone = null;
    worldTwoState.waitingForNextWave = false;
    worldTwoState.waveActive = false;
    worldTwoState.projectiles = [];
    worldTwoState.potions = [];
    worldTwoState.lavaCooldowns = new Map();
    worldTwoState.entryTransition = { active: false, timer: 0, duration: 115 };

    endingSequence.active = false;
    endingSequence.finished = false;
    endingSequence.timer = 0;
    secondGate.opening = 0;
    secondGate.open = false;
    ancientGate.open = false;
    ancientGate.opening = 0;
    deathSnowGate.opening = 0;
    deathSnowGate.unlocked = false;
    ashenArenaCheckpointActivated = false;
    endingVisible = false;
    endingOverlay.classList.remove("hc-visible");

  };

  console.info("THE HOLLOW CROWN — final integration fixes loaded");
})();
