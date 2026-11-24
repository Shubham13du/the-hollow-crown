/* THE HOLLOW CROWN — touch controls
   Load after game.js, world2_fix.js and death_snow.js. */
(() => {
  "use strict";

  const root = document.getElementById("mobileControls");
  if (!root) return;

  // `keys` and `attack` are declared by game.js as classic-script globals.
  const held = new Map();
  const keyGroups = {
    left: ["a", "arrowleft"],
    right: ["d", "arrowright"],
    run: ["shift"],
    descend: ["s", "arrowdown"],
    jump: [" ", "w"] ,
    interact: ["e"]
  };

  function setGroup(name, down) {
    const group = keyGroups[name] || [];
    for (const key of group) keys[key] = down;
  }

  function clearAll() {
    for (const name of Object.keys(keyGroups)) setGroup(name, false);
    held.clear();
  }

  function startAction(button, pointerId) {
    const action = button.dataset.action;
    if (!action) return;
    held.set(pointerId, action);

    if (action === "attack") {
      keys.j = true;
      if (typeof attack === "function") attack();
      return;
    }
    if (action === "jump") {
      setGroup("jump", true);
      if (!player.gameOver && !player.levelComplete && player.grounded) {
        player.velocityY = player.jumpPower;
        player.grounded = false;
        player.standingPlatform = null;
      }
      return;
    }
    if (action === "restart") {
      if (player.gameOver) respawnAtCheckpoint();
      else if (player.levelComplete) restartGame();
      return;
    }
    setGroup(action, true);
  }

  function endAction(pointerId) {
    const action = held.get(pointerId);
    if (!action) return;
    held.delete(pointerId);

    // Keep a key down if another finger is still holding the same action.
    const stillHeld = [...held.values()].includes(action);
    if (stillHeld) return;

    if (action === "attack") keys.j = false;
    else if (action === "jump") setGroup("jump", false);
    else setGroup(action, false);
  }

  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
      startAction(button, event.pointerId);
      button.classList.add("is-pressed");
    });
    const release = (event) => {
      event.preventDefault();
      endAction(event.pointerId);
      button.classList.remove("is-pressed");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", (event) => {
      endAction(event.pointerId);
      button.classList.remove("is-pressed");
    });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });

  window.addEventListener("blur", clearAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearAll();
  });
})();
