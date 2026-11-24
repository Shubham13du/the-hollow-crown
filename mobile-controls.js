
/* THE HOLLOW CROWN — TOUCH CONTROLS + CHECKPOINT RETURN */
(() => {
  "use strict";

  const root = document.getElementById("mobileControls");
  const canvas = document.getElementById("gameCanvas");

  if (!root || !canvas) return;

  const held = new Map();

  const keyGroups = {
    left: ["a", "arrowleft"],
    right: ["d", "arrowright"],
    run: ["shift"],
    descend: ["s", "arrowdown"],
    jump: [" ", "w"],
    interact: ["e"]
  };

  function setGroup(name, down) {
    for (const key of keyGroups[name] || []) {
      keys[key] = down;
    }
  }

  function clearAll() {
    for (const name of Object.keys(keyGroups)) {
      setGroup(name, false);
    }

    keys.j = false;
    held.clear();
  }

  // ==========================================
  // MOBILE CHECKPOINT RETURN BUTTON
  // ==========================================

  document.querySelectorAll(".mobile-return-button").forEach(button => {
    button.remove();
  });

  const returnButton = document.createElement("button");

  returnButton.type = "button";
  returnButton.className = "mobile-return-button";
  returnButton.textContent = "TAP TO RETURN";
  returnButton.hidden = true;

  document.body.appendChild(returnButton);

  returnButton.addEventListener("click", (event) => {
    event.preventDefault();

    if (player.gameOver) {
      window.dispatchEvent(new KeyboardEvent("keydown", {
        key: "r",
        bubbles: true,
        cancelable: true
      }));
    }
  });

  // The return button is reserved for actual Game Over states.
  // The throne-to-Death-Snow transition now happens automatically.
  function updateReturnButton() {
    if (player.gameOver) {
      const rect = canvas.getBoundingClientRect();
      returnButton.hidden = false;
      returnButton.textContent = "TAP TO RETURN";
      returnButton.style.left = `${rect.left + rect.width / 2}px`;
      returnButton.style.top = `${rect.top + rect.height * 0.64}px`;
    } else {
      returnButton.hidden = true;
    }

    root.style.visibility = "";
    root.style.pointerEvents = "";
    requestAnimationFrame(updateReturnButton);
  }

  requestAnimationFrame(updateReturnButton);

  // ==========================================
  // NORMAL TOUCH CONTROLS
  // ==========================================

  function startAction(button, pointerId) {
    const action = button.dataset.action;

    if (!action) return;

    held.set(pointerId, action);

    if (action === "attack") {
      keys.j = true;

      if (typeof attack === "function") {
        attack();
      }

      return;
    }

    if (action === "jump") {
      setGroup("jump", true);

      if (
        !player.gameOver &&
        !player.levelComplete &&
        player.grounded
      ) {
        player.velocityY = player.jumpPower;
        player.grounded = false;
        player.standingPlatform = null;
        if (typeof HC_AUDIO !== "undefined") HC_AUDIO.playSfx("jump");
      }

      return;
    }

    if (action === "restart") {
      if (player.gameOver) {
        window.dispatchEvent(new KeyboardEvent("keydown", {
          key: "r",
          bubbles: true,
          cancelable: true
        }));
      } else if (player.levelComplete) {
        restartGame();
      }

      return;
    }

    setGroup(action, true);
  }

  function endAction(pointerId) {
    const action = held.get(pointerId);

    if (!action) return;

    held.delete(pointerId);

    const stillHeld = [...held.values()].includes(action);

    if (stillHeld) return;

    if (action === "attack") {
      keys.j = false;
    } else {
      setGroup(action, false);
    }
  }

  root.querySelectorAll("[data-action]").forEach(button => {

    button.addEventListener("pointerdown", event => {
      event.preventDefault();

      if (button.setPointerCapture) {
        button.setPointerCapture(event.pointerId);
      }

      startAction(button, event.pointerId);

      button.classList.add("is-pressed");
    });

    const release = event => {
      event.preventDefault();

      endAction(event.pointerId);

      button.classList.remove("is-pressed");
    };

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);

    button.addEventListener("lostpointercapture", event => {
      endAction(event.pointerId);

      button.classList.remove("is-pressed");
    });

    button.addEventListener("contextmenu", event => {
      event.preventDefault();
    });

  });

  // ==========================================
  // CLEANUP
  // ==========================================

  window.addEventListener("blur", clearAll);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearAll();
    }
  });

})();
