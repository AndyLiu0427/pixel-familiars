// All gameplay data: rarities, species, zones, monsters, upgrades, equipment,
// fusion, collection book, and balance curves. Pure data + pure math helpers
// so node --test can cover the whole balance model.

export const RARITY = [
  { key: 'common',    weight: 45, statMult: 1.0, color: '#9aa0b5' },
  { key: 'uncommon',  weight: 30, statMult: 1.35, color: '#5fd475' },
  { key: 'rare',      weight: 16, statMult: 1.9, color: '#4aa8ff' },
  { key: 'epic',      weight: 7,  statMult: 2.8, color: '#b06cf5' },
  { key: 'legendary', weight: 2,  statMult: 4.2, color: '#f5b942' },
];

// Familiar species. baseAtk/baseHp at level 1, stage 0, 0 stars.
// secret species only enter the egg pool after their book milestone unlocks.
export const SPECIES = [
  { id: 'emberfox',  name: { 'zh-TW': '燼狐',   en: 'Emberfox' },  baseAtk: 6,  baseHp: 34, minRarity: 0, sprite: 'emberfox' },
  { id: 'mossling',  name: { 'zh-TW': '苔苗',   en: 'Mossling' },  baseAtk: 4,  baseHp: 46, minRarity: 0, sprite: 'mossling' },
  { id: 'puddle',    name: { 'zh-TW': '水漥靈', en: 'Puddle' },    baseAtk: 5,  baseHp: 38, minRarity: 0, sprite: 'puddle' },
  { id: 'gustowl',   name: { 'zh-TW': '風梟',   en: 'Gust Owl' },  baseAtk: 7,  baseHp: 30, minRarity: 0, sprite: 'gustowl' },
  { id: 'boulderpup',name: { 'zh-TW': '岩崽',   en: 'Boulder Pup'},baseAtk: 5,  baseHp: 52, minRarity: 1, sprite: 'boulderpup' },
  { id: 'sparkbat',  name: { 'zh-TW': '電蝠',   en: 'Spark Bat' }, baseAtk: 8,  baseHp: 28, minRarity: 1, sprite: 'sparkbat' },
  { id: 'frostkit',  name: { 'zh-TW': '霜貓',   en: 'Frost Kit' }, baseAtk: 7,  baseHp: 36, minRarity: 2, sprite: 'frostkit' },
  { id: 'thornwolf', name: { 'zh-TW': '棘狼',   en: 'Thorn Wolf'}, baseAtk: 9,  baseHp: 40, minRarity: 2, sprite: 'thornwolf' },
  { id: 'duskwyrm',  name: { 'zh-TW': '暮龍',   en: 'Dusk Wyrm' }, baseAtk: 11, baseHp: 44, minRarity: 3, sprite: 'duskwyrm' },
  { id: 'solphoenix',name: { 'zh-TW': '日鳳雛', en: 'Sol Phoenix'},baseAtk: 13, baseHp: 38, minRarity: 4, sprite: 'solphoenix' },
  { id: 'voidwyrm',  name: { 'zh-TW': '虛空龍', en: 'Voidwyrm' },  baseAtk: 15, baseHp: 42, minRarity: 3, sprite: 'voidwyrm', secret: true },
];

// Evolution stages by level, on top of stars.
export const STAGE_LEVELS = [10, 25];
export const STAGE_MULT = [1, 1.6, 2.6];

// ---- Fusion (shard star-up) ----
export const STAR_COSTS = [2, 3, 5, 8, 12];          // shards to reach star 1..5
export const MAX_STARS = STAR_COSTS.length;
export const SHARDS_BY_RARITY = [1, 2, 4, 8, 16];    // shards per duplicate hatch
export const STAR_STAT_BONUS = 0.25;                 // +25% base per star
export const LEVEL_CAP_BASE = 30;
export const LEVEL_CAP_PER_STAR = 10;
export const SHARDS_PER_GEM = 5;                     // overflow conversion
export const PITY_LEGENDARY = 40;                    // guaranteed legendary within N eggs
export const SHINY_RATE = 1 / 100;

export function levelCap(stars) { return LEVEL_CAP_BASE + LEVEL_CAP_PER_STAR * stars; }

// ---- Collection book ----
export const BOOK_REVEAL_BONUS = 0.02;   // per revealed entry (normal or shiny)
export const BOOK_MASTER_BONUS = 0.03;   // per 5-star species
export const BOOK_MILESTONES = [
  { at: 5,  reward: 'gems', amount: 100 },
  { at: 10, reward: 'egg' },
  { at: 15, reward: 'secret' },          // unlocks voidwyrm (granted + joins egg pool)
  { at: 20, reward: 'frame' },           // golden UI frame
];

// ---- Equipment ----
export const GEAR_SLOTS = ['weapon', 'armor', 'charm'];
export const GEAR_RARITY = [
  { key: 'common',    mult: 1.0,  dust: 1,  color: '#9aa0b5' },
  { key: 'rare',      mult: 1.5,  dust: 3,  color: '#4aa8ff' },
  { key: 'epic',      mult: 2.25, dust: 9,  color: '#b06cf5' },
  { key: 'legendary', mult: 3.4,  dust: 27, color: '#f5b942' },
];
export const CHARM_SUBS = ['atk', 'hp', 'gold'];
export const GEAR_DROP_RATE = 0.04;      // non-boss kills
export const GEAR_CAP = 50;              // inventory cap, overflow auto-salvages
export const FORGE_MAX = 10;
export const FORGE_BONUS = 0.08;         // +8% per forge level

export function forgeCost(level) { return Math.ceil(10 * Math.pow(1.4, level)); }

// Stat of an item. Weapon: flat ATK. Armor: flat HP. Charm: % of its substat.
export function gearStat(item) {
  const mult = GEAR_RARITY[item.rarity].mult * (1 + FORGE_BONUS * (item.forge ?? 0));
  if (item.slot === 'weapon') return 5 * (item.zone + 1) * mult;
  if (item.slot === 'armor') return 25 * (item.zone + 1) * mult;
  return 0.10 * mult; // charm: 10% base, scaled by rarity and forge
}

// Roll a drop. rng () => [0,1). Returns {slot, rarity, sub} or null.
export function rollGearDrop(zone, isBoss, rng) {
  if (!isBoss && rng() >= GEAR_DROP_RATE) return null;
  let rarity;
  if (!isBoss) rarity = rng() < 0.75 ? 0 : 1;
  else if (zone < 3) rarity = 1;
  else if (zone < 8) rarity = rng() < 0.6 ? 1 : 2;
  else { const r = rng(); rarity = r < 0.4 ? 1 : r < 0.8 ? 2 : 3; }
  const slot = GEAR_SLOTS[Math.floor(rng() * GEAR_SLOTS.length)];
  const sub = slot === 'charm' ? CHARM_SUBS[Math.floor(rng() * CHARM_SUBS.length)] : null;
  return { slot, rarity, sub };
}

// ---- Daily rewards (7-day streak, repeats) ----
export const DAILY_REWARDS = [
  { type: 'gold', mult: 40 },   // mult x goldDrop(zone, 1)
  { type: 'gems', amount: 10 },
  { type: 'gold', mult: 100 },
  { type: 'gems', amount: 20 },
  { type: 'gold', mult: 200 },
  { type: 'gems', amount: 30 },
  { type: 'egg' },
];

// ---- Zones / monsters ----

export const ZONES = [
  { name: { 'zh-TW': '低語森林', en: 'Whisper Woods' },   theme: 'forest',  monsters: ['gloomshroom', 'goblin'] },
  { name: { 'zh-TW': '苔穴洞窟', en: 'Mossy Hollows' },   theme: 'cave',    monsters: ['goblin', 'batling'] },
  { name: { 'zh-TW': '沉沒遺跡', en: 'Sunken Ruins' },    theme: 'ruins',   monsters: ['boneling', 'gloomshroom'] },
  { name: { 'zh-TW': '迷霧沼澤', en: 'Mire of Mist' },    theme: 'swamp',   monsters: ['gloomshroom', 'eyeling'] },
  { name: { 'zh-TW': '餘燼火山', en: 'Cinder Peak' },     theme: 'volcano', monsters: ['imp', 'batling'] },
  { name: { 'zh-TW': '永凍冰原', en: 'Everfrost' },       theme: 'ice',     monsters: ['boneling', 'eyeling'] },
  { name: { 'zh-TW': '暗影堡壘', en: 'Shadow Keep' },     theme: 'keep',    monsters: ['imp', 'boneling'] },
  { name: { 'zh-TW': '星界裂隙', en: 'Astral Rift' },     theme: 'astral',  monsters: ['eyeling', 'imp'] },
];

export const ZONE_THEMES = {
  forest:  { sky: '#12241a', far: '#183426', near: '#0d1a12', ground: '#20402c', accent: '#5fd475' },
  cave:    { sky: '#171426', far: '#241f3a', near: '#100e1c', ground: '#2c2749', accent: '#8f89b0' },
  ruins:   { sky: '#1a2030', far: '#28324a', near: '#121722', ground: '#33405c', accent: '#7fa3d1' },
  swamp:   { sky: '#161f16', far: '#233123', near: '#0e140e', ground: '#2e402a', accent: '#8fbf5a' },
  volcano: { sky: '#251314', far: '#3d1e1c', near: '#170b0b', ground: '#4a2a22', accent: '#ff7a4a' },
  ice:     { sky: '#14202e', far: '#1f3348', near: '#0d1520', ground: '#2a4258', accent: '#8ad8ff' },
  keep:    { sky: '#181227', far: '#261d3d', near: '#100b1a', ground: '#302452', accent: '#b06cf5' },
  astral:  { sky: '#0f0f2b', far: '#1c1c4a', near: '#09091c', ground: '#26265e', accent: '#6ea8ff' },
};

export const MONSTERS = {
  gloomshroom: { name: { 'zh-TW': '幽菇',  en: 'Gloomshroom' }, sprite: 'gloomshroom' },
  goblin:      { name: { 'zh-TW': '哥布林', en: 'Goblin' },      sprite: 'goblin' },
  batling:     { name: { 'zh-TW': '穴蝠',  en: 'Batling' },      sprite: 'batling' },
  boneling:    { name: { 'zh-TW': '骨僕',  en: 'Boneling' },     sprite: 'boneling' },
  eyeling:     { name: { 'zh-TW': '窺眼',  en: 'Eyeling' },      sprite: 'eyeling' },
  imp:         { name: { 'zh-TW': '小惡魔', en: 'Imp' },          sprite: 'imp' },
};

export const UPGRADES = [
  { id: 'atk',     baseCost: 50,   costGrowth: 1.35, maxLevel: 999 },
  { id: 'hp',      baseCost: 50,   costGrowth: 1.35, maxLevel: 999 },
  { id: 'gold',    baseCost: 120,  costGrowth: 1.45, maxLevel: 999 },
  { id: 'offline', baseCost: 2000, costGrowth: 3.0,  maxLevel: 8 },
];

export const WAVES_PER_ZONE = 10;

// ---- Balance curves (pure) ----

export function globalWave(zone, wave) { return zone * WAVES_PER_ZONE + (wave - 1); }

export function monsterHp(zone, wave) {
  const g = globalWave(zone, wave);
  const boss = wave === WAVES_PER_ZONE ? 6 : 1;
  return Math.ceil(18 * Math.pow(1.14, g) * boss);
}

export function monsterAtk(zone, wave) {
  const g = globalWave(zone, wave);
  const boss = wave === WAVES_PER_ZONE ? 2 : 1;
  return Math.ceil(2 * Math.pow(1.10, g) * boss);
}

export function goldDrop(zone, wave, goldUpgradeLvl) {
  const g = globalWave(zone, wave);
  const boss = wave === WAVES_PER_ZONE ? 8 : 1;
  return Math.ceil(6 * Math.pow(1.13, g) * boss * (1 + 0.1 * goldUpgradeLvl));
}

export function xpDrop(zone, wave) {
  const g = globalWave(zone, wave);
  const boss = wave === WAVES_PER_ZONE ? 5 : 1;
  return Math.ceil(4 * Math.pow(1.11, g) * boss);
}

export function xpForLevel(level) {
  return Math.ceil(10 * Math.pow(1.18, level - 1));
}

export function stageForLevel(level) {
  let s = 0;
  for (const th of STAGE_LEVELS) if (level >= th) s++;
  return s;
}

// Naked pet stats (before equipment, book, upgrades).
export function petBaseAtk(species, rarityIdx, level, stars = 0) {
  const stage = stageForLevel(level);
  return species.baseAtk * RARITY[rarityIdx].statMult * STAGE_MULT[stage]
    * Math.pow(1.07, level - 1) * (1 + STAR_STAT_BONUS * stars);
}

export function petBaseHp(species, rarityIdx, level, stars = 0) {
  const stage = stageForLevel(level);
  return species.baseHp * RARITY[rarityIdx].statMult * STAGE_MULT[stage]
    * Math.pow(1.07, level - 1) * (1 + STAR_STAT_BONUS * stars);
}

export function upgradeCost(up, level) {
  return Math.ceil(up.baseCost * Math.pow(up.costGrowth, level));
}

// Egg roll. Owned set biases toward unowned species (2x weight).
// secretUnlocked gates the secret species. Returns { speciesId, rarity }.
export function rollEgg(rng, { owned = new Set(), secretUnlocked = false, forceRarity = null } = {}) {
  let rarity;
  if (forceRarity != null) {
    rarity = forceRarity;
  } else {
    const total = RARITY.reduce((a, r) => a + r.weight, 0);
    let roll = rng() * total;
    rarity = 0;
    for (let i = 0; i < RARITY.length; i++) {
      roll -= RARITY[i].weight;
      if (roll < 0) { rarity = i; break; }
    }
  }
  const pool = SPECIES.filter(s => s.minRarity <= rarity && (!s.secret || secretUnlocked));
  const weights = pool.map(s => owned.has(s.id) ? 1 : 2);
  const wTotal = weights.reduce((a, b) => a + b, 0);
  let r = rng() * wTotal;
  let pick = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) { pick = pool[i]; break; }
  }
  return { speciesId: pick.id, rarity: Math.max(rarity, pick.minRarity) };
}

export function zoneData(zone) {
  if (zone < ZONES.length) return ZONES[zone];
  const base = ZONES[zone % ZONES.length];
  return {
    name: {
      'zh-TW': `${base.name['zh-TW']} ${Math.floor(zone / ZONES.length) + 1}`,
      en: `${base.name.en} ${Math.floor(zone / ZONES.length) + 1}`,
    },
    theme: base.theme,
    monsters: base.monsters,
  };
}

export function monsterForWave(zone, wave) {
  const z = zoneData(zone);
  return z.monsters[wave % z.monsters.length];
}
