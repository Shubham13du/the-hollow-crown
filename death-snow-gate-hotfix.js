/* THE HOLLOW CROWN — progression and Death Snow entry hotfix
   Load after game.js, world2_fix.js and death_snow.js. */
(() => {
  "use strict";

  // WORLD I -> WORLD II: the Ancient Gate is a solid barrier until the
  // actual E interaction changes phase. It cannot be bypassed by walking.
  const previousPlayerUpdate = updatePlayer;
  updatePlayer = function () {
    previousPlayerUpdate();

    if (worldTwoState.phase === 1 && ancientGate) {
      const gateWall = ancientGate.x - player.width - 8;
      if (player.x > gateWall) {
        player.x = gateWall;
        player.velocityX = Math.min(0, player.velocityX);
      }
    }
  };

  // WORLD III: the entry cinematic can inherit a stale completion/death flag
  // from the preceding ending sequence. That flag stops gameLoop updates, so
  // the dark transition never counts down. Clear it once on entering phase 4.
  const previousWorldTwoUpdate = updateWorldTwo;
  let recoveredThisEntry = false;
  updateWorldTwo = function () {
    previousWorldTwoUpdate();

    const state = window.deathSnowState;
    const inDeathSnow = worldTwoState.phase === 4 && state && state.active;

    if (!inDeathSnow) {
      recoveredThisEntry = false;
      return;
    }

    if (!recoveredThisEntry) {
      player.gameOver = false;
      player.levelComplete = false;
      player.health = player.maxHealth;
      player.velocityX = 0;
      player.velocityY = 0;
      player.grounded = true;
      player.isAttacking = false;
      recoveredThisEntry = true;
    }
  };
})();
