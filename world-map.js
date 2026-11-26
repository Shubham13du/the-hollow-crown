(() => {
  "use strict";
  if (window.HC_WORLD_MAP) return;
  const style = document.createElement("style");
  style.textContent = `
    #hcWorldMap,#hcBossChoice{position:fixed;inset:0;z-index:4000;display:none;align-items:center;justify-content:center;padding:22px;background:radial-gradient(ellipse at 50% 35%,rgba(75,62,54,.22),transparent 55%),linear-gradient(145deg,rgba(5,7,13,.98),rgba(16,17,25,.99));color:#eee7d9;font-family:Georgia,serif}
    #hcWorldMap.hc-open,#hcBossChoice.hc-open{display:flex}
    .hc-map-shell{width:min(1050px,96vw);max-height:94vh;overflow:auto;text-align:center}
    .hc-map-kicker{color:#c7a66a;font:11px Cinzel,Georgia,serif;letter-spacing:.35em}
    .hc-map-title{margin:12px 0 6px;color:#ead9b5;font:clamp(28px,5vw,48px) Cinzel,Georgia,serif;letter-spacing:.12em}
    .hc-map-sub{color:#aaa39a;font:italic 14px Georgia,serif;margin:0 0 28px}
    .hc-map-path{position:relative;display:flex;align-items:center;justify-content:space-around;gap:18px;min-height:270px;padding:28px 3%;isolation:isolate}
    .hc-map-path:before{content:"";position:absolute;z-index:-1;left:12%;right:12%;top:50%;height:5px;border-radius:50%;background:linear-gradient(90deg,#8e7651,#d4bb83,#8b7892);box-shadow:0 0 20px #a98d5c;transform:rotate(-7deg)}
    .hc-map-node{width:29%;max-width:250px;min-width:0;border:1px solid rgba(199,166,106,.55);background:linear-gradient(160deg,rgba(37,34,34,.96),rgba(13,16,23,.97));padding:18px 12px 16px;color:#eee7d9;cursor:pointer;box-shadow:0 12px 32px #0008;transition:.2s}
    .hc-map-node:nth-child(2){transform:translateY(-32px)}
    .hc-map-node:nth-child(3){transform:translateY(22px)}
    .hc-map-node:hover{border-color:#f0d49a;box-shadow:0 0 28px #c7a66a44;transform:translateY(-5px)}
    .hc-map-node:nth-child(2):hover{transform:translateY(-37px)}
    .hc-map-node:nth-child(3):hover{transform:translateY(17px)}
    .hc-map-sigil{display:grid;place-items:center;width:66px;height:66px;margin:0 auto 13px;border:1px solid #c7a66a;border-radius:50%;color:#e8d19d;font:24px Cinzel,Georgia,serif;background:radial-gradient(circle,#625039,#17151a 70%)}
    .hc-map-node strong{display:block;color:#e7d2a8;font:13px Cinzel,Georgia,serif;letter-spacing:.13em;line-height:1.6}
    .hc-map-node small{display:block;margin-top:7px;color:#a9a19a;font:11px Georgia,serif}
    .hc-map-back,.hc-choice-button{margin-top:18px;padding:12px 28px;border:1px solid #b99b66;background:rgba(40,34,27,.8);color:#ead9b5;font:12px Cinzel,Georgia,serif;letter-spacing:.2em;cursor:pointer}
    .hc-map-back:hover,.hc-choice-button:hover{background:#55432c}
    #hcBossChoice .hc-choice-card{width:min(650px,94vw);padding:38px 24px;text-align:center;border:1px solid rgba(199,166,106,.6);background:linear-gradient(150deg,#171720,#090a10);box-shadow:0 20px 70px #000b}
    #hcBossChoice h2{color:#e7d2a8;font:clamp(22px,4vw,34px) Cinzel,Georgia,serif;letter-spacing:.08em}
    #hcBossChoice p{color:#b8afa2;line-height:1.7}
    .hc-choice-actions{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
    @media(max-width:620px){.hc-map-path{gap:8px;padding:20px 0;min-height:220px}.hc-map-node{padding:13px 5px}.hc-map-sigil{width:48px;height:48px;font-size:19px}.hc-map-node strong{font-size:10px;letter-spacing:.06em}.hc-map-node small{font-size:9px}.hc-map-path:before{left:8%;right:8%}}
  `;
  document.head.appendChild(style);
  const map=document.createElement("section");map.id="hcWorldMap";map.setAttribute("aria-label","World map");
  map.innerHTML=`<div class="hc-map-shell"><div class="hc-map-kicker">THE WANDERER'S ATLAS</div><h1 class="hc-map-title">CHOOSE YOUR WORLD</h1><p class="hc-map-sub">Three realms. One unfinished journey.</p><div class="hc-map-path">
    <button class="hc-map-node" data-world="1"><span class="hc-map-sigil">I</span><strong>THE FORGOTTEN RUINS</strong><small>Including the Ashen Realm</small></button>
    <button class="hc-map-node" data-world="2"><span class="hc-map-sigil">II</span><strong>THE DEATH SNOW</strong><small>The Frozen Sanctum</small></button>
    <button class="hc-map-node" data-world="3"><span class="hc-map-sigil">III</span><strong>THE JYUIS WORLD</strong><small>The Poison Depths</small></button>
  </div><button class="hc-map-back" id="hcMapBack">MAIN MENU</button></div>`;
  document.body.appendChild(map);
  const choice=document.createElement("section");choice.id="hcBossChoice";choice.setAttribute("aria-label","World completed");
  document.body.appendChild(choice);
  let continueAction=null;
  function show(){choice.classList.remove("hc-open");map.classList.add("hc-open");}
  function hide(){map.classList.remove("hc-open");}
  function begin(id){
    hide();choice.classList.remove("hc-open");
    document.body.classList.add("game-started");
    const menu=document.getElementById("mainMenu");if(menu)menu.classList.add("menu-hidden");
    if(window.keys)for(const k in window.keys)window.keys[k]=false;
    if(id===1){if(typeof window.restartGame==="function")window.restartGame();}
    if(id===2){if(typeof window.dsEnterWorld==="function")window.dsEnterWorld();else console.error("Death Snow entry is unavailable.");}
    if(id===3){if(typeof window.startJyuisWorld==="function")window.startJyuisWorld();else console.error("Jyuis World entry is unavailable.");}
  }
  function showBossChoice(opts={}){
    hide();continueAction=typeof opts.onContinue==="function"?opts.onContinue:null;
    choice.innerHTML=`<div class="hc-choice-card"><div class="hc-map-kicker">A CHAPTER CONQUERED</div><h2>${opts.title||"THE BOSS HAS FALLEN"}</h2><p>${opts.subtitle||"The road ahead is open."}</p><div class="hc-choice-actions"><button class="hc-choice-button" id="hcChoiceContinue">${opts.continueLabel||"CONTINUE"}</button><button class="hc-choice-button" id="hcChoiceMap">${opts.mapLabel||"MAP"}</button></div></div>`;
    choice.classList.add("hc-open");
    choice.querySelector("#hcChoiceContinue").addEventListener("click",()=>{choice.classList.remove("hc-open");if(continueAction)continueAction();});
    choice.querySelector("#hcChoiceMap").addEventListener("click",()=>{choice.classList.remove("hc-open");show();});
  }
  map.querySelectorAll("[data-world]").forEach(btn=>btn.addEventListener("click",()=>begin(Number(btn.dataset.world))));
  map.querySelector("#hcMapBack").addEventListener("click",()=>{hide();const menu=document.getElementById("mainMenu");if(menu){menu.classList.remove("menu-hidden");document.body.classList.remove("game-started");}});
  window.HC_WORLD_MAP={show,hide,showBossChoice,startWorld:begin};
})();