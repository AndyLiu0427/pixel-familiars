// Bootstrap: load save, compute offline earnings, start loops, register PWA.

import { CONFIG } from './config.js';
import { detectLang, setLang } from './i18n.js';
import { Game, defaultState, computeOffline } from './game.js';
import { loadState, saveState } from './save.js';
import { BattleScene } from './battle.js';
import { UI } from './ui.js';
import { initAds, maybeInterstitial } from './ads.js';

const saved = loadState();
const state = saved ?? defaultState();
setLang(state.settings?.lang || detectLang());

const game = new Game(state);
const ui = new UI(game);
const scene = new BattleScene(document.getElementById('battle'), game);

initAds();

// Offline earnings on load
if (saved) {
  const elapsed = Date.now() - (saved.lastSeen ?? Date.now());
  const result = computeOffline(state, elapsed);
  if (result.kills > 0) ui.showWelcomeBack(result);
}

// Interstitial on zone advance (frequency-guarded, never blocks gameplay)
game.on('zone_advance', () => { maybeInterstitial('zone_advance', state); });

// ---- Loops ----

const LOGIC_DT = 1 / CONFIG.logicHz;
let acc = 0;
let last = performance.now();
let uiTimer = 0;

function frame(nowMs) {
  const dt = Math.min((nowMs - last) / 1000, 0.25);
  last = nowMs;
  acc += dt;
  while (acc >= LOGIC_DT) {
    game.tick(LOGIC_DT);
    acc -= LOGIC_DT;
  }
  scene.frame(dt);
  uiTimer += dt;
  if (uiTimer >= 0.25) {
    uiTimer = 0;
    ui.refreshBattleOverlays();
    ui.refreshUpgradeButtons();
  }
  requestAnimationFrame(frame);
}

function resize() { scene.resize(); }
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);

// ---- Persistence ----

setInterval(() => saveState(state), CONFIG.saveIntervalMs);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveState(state);
});
window.addEventListener('pagehide', () => saveState(state));

// Debug handle (also handy for power users; not a cheat-proof game)
window.__pf = { game, ui, scene };

// ---- PWA ----

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
