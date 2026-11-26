(() => {
  "use strict";

  const menu = document.getElementById("mainMenu");
  const startButton = document.getElementById("startJourneyButton");
  const continueButton = document.getElementById("continueJourneyButton");
  const settingsButton = document.getElementById("settingsButton");
  const creditsButton = document.getElementById("creditsButton");
  const infoPanel = document.getElementById("menuInfoPanel");
  const infoTitle = document.getElementById("infoPanelTitle");
  const infoText = document.getElementById("infoPanelText");
  const closePanel = document.getElementById("closeInfoPanel");

  if (!menu || !startButton) {
    console.error("The Hollow Crown menu could not initialize: required elements are missing.");
    return;
  }

  let journeyStarted = false;

  function showPanel(title, message) {
    infoTitle.textContent = title;
    infoText.textContent = message;
    infoPanel.hidden = false;
  }

  function hidePanel() {
    infoPanel.hidden = true;
  }

  function startJourney() {
    if (journeyStarted) return;
    journeyStarted = true;
    hidePanel();
    HC_AUDIO.play("exploration");
    if (typeof HC_AUDIO.unlockSfx === "function") HC_AUDIO.unlockSfx();
    if (window.HC_WORLD_MAP) window.HC_WORLD_MAP.show();
    else console.error("World map has not loaded.");
  }

  startButton.addEventListener("click", startJourney);
  window.addEventListener("hc-world-map-return", () => { journeyStarted = false; });

  if (continueButton) {
    continueButton.disabled = true;
    continueButton.title = "Continue is temporarily unavailable.";
    const status = continueButton.querySelector("small");
    if (status) status.textContent = "COMING SOON";
  }

  settingsButton.addEventListener("click", () => {
    showPanel(
      "SETTINGS",
      "Background music is enabled. Gameplay controls: A / D, SPACE / W, S, J and E."
    );
});

  creditsButton.addEventListener("click", () => {
    showPanel(
      "CREDITS",
      "THE HOLLOW CROWN — The Story of Achilles, the Wanderer. An original fantasy platformer project. More credits will be added as the world, music and art are completed."
    );
  });

  closePanel.addEventListener("click", hidePanel);

  infoPanel.addEventListener("click", (event) => {
    if (event.target === infoPanel) hidePanel();
  });

  // Stop gameplay input while the menu is open; this does not alter game.js.
  window.addEventListener("keydown", (event) => {
    if (!journeyStarted) {
      event.stopImmediatePropagation();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    }
  }, true);

  window.addEventListener("keyup", (event) => {
    if (!journeyStarted) event.stopImmediatePropagation();
  }, true);

  window.addEventListener("blur", () => {
    if (!journeyStarted) hidePanel();
  });

  document.addEventListener("click", function startMenuMusic() {
    if (!journeyStarted) {
        HC_AUDIO.play("menu");
    }
}, { once: true });
})();
