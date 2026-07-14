// Central tunables. Everything gameplay-numeric lives in data.js;
// this file is for integration and pacing knobs.

export const CONFIG = {
  // Google AdSense H5 Games Ads publisher id, e.g. 'ca-pub-1234567890123456'.
  // Leave empty to use the built-in simulated ads (dev stub).
  adClient: '',
  // Ad frequency guards
  interstitialMinGapMs: 5 * 60 * 1000,
  freeEggCooldownMs: 6 * 60 * 60 * 1000,

  // Simulation
  logicHz: 10,                 // logic ticks per second
  saveIntervalMs: 10_000,

  // Offline progression
  offlineEfficiency: 0.6,      // fraction of active rates earned while away
  offlineBaseCapHours: 8,      // extended by the offline upgrade
  offlineMinMs: 60_000,        // ignore absences shorter than this

  // Boosts
  boostDurationMs: 10 * 60 * 1000,
  boostMultiplier: 2,

  // Rewards
  adGemReward: 25,
  bossFirstKillGems: 10,
  eggCostGems: 50,
};
