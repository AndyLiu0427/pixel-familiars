// Persistence: localStorage JSON with a version field and migration hook,
// plus a portable export/import string (PF1.<base64 of utf-8 json>).

const KEY = 'pixel-familiars-save';
export const SAVE_VERSION = 2;

const SHARDS_BY_RARITY = [1, 2, 4, 8, 16];

export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  let st = { ...raw };
  if (typeof st.version !== 'number' || st.version > SAVE_VERSION) return null;
  if (st.version === 1) st = migrateV1toV2(st);
  return st;
}

// v1 had familiars[] instances (possible duplicates per species) and id-based
// teams. v2 keeps the best instance per species; extras become shards.
function migrateV1toV2(v1) {
  const pets = {};
  const shards = {};
  const byId = new Map();
  for (const f of v1.familiars ?? []) {
    byId.set(f.id, f);
    const cur = pets[f.speciesId];
    if (!cur || f.rarity > cur.rarity || (f.rarity === cur.rarity && f.level > cur.level)) {
      if (cur) shards[f.speciesId] = (shards[f.speciesId] ?? 0) + SHARDS_BY_RARITY[cur.rarity];
      pets[f.speciesId] = { rarity: f.rarity, level: f.level, xp: f.xp ?? 0, stars: 0, shiny: false, equip: {} };
    } else {
      shards[f.speciesId] = (shards[f.speciesId] ?? 0) + SHARDS_BY_RARITY[f.rarity];
    }
  }
  if (Object.keys(pets).length === 0) pets.emberfox = { rarity: 0, level: 1, xp: 0, stars: 0, shiny: false, equip: {} };
  const team = [...new Set((v1.team ?? []).map(id => byId.get(id)?.speciesId).filter(sp => sp && pets[sp]))];
  return {
    version: 2,
    gold: v1.gold ?? 0,
    gems: v1.gems ?? 0,
    zone: v1.zone ?? 0,
    wave: v1.wave ?? 1,
    highestZone: v1.highestZone ?? 0,
    pets,
    shards,
    team: team.length ? team.slice(0, 4) : [Object.keys(pets)[0]],
    items: [],
    nextItemId: 1,
    dust: 0,
    upgrades: v1.upgrades ?? { atk: 0, hp: 0, gold: 0, offline: 0 },
    boostUntil: v1.boostUntil ?? 0,
    lastSeen: v1.lastSeen ?? Date.now(),
    lastInterstitial: v1.lastInterstitial ?? 0,
    lastFreeEgg: v1.lastFreeEgg ?? 0,
    stats: v1.stats ?? { kills: 0, bossKills: 0, eggs: 0, goldEarned: 0 },
    settings: v1.settings ?? { lang: null },
    book: { shinySeen: [], claimed: [] },
    pity: 0,
    daily: { streak: 0, last: null },
  };
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveState(state, now = Date.now(), storage = globalThis.localStorage) {
  state.lastSeen = now;
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage = globalThis.localStorage) {
  storage.removeItem(KEY);
}

// ---- Portable save string ----

export function exportString(state) {
  const json = JSON.stringify(state);
  const b64 = toBase64(json);
  return `PF1.${b64}`;
}

export function importString(str) {
  try {
    const m = /^PF1\.([A-Za-z0-9+/=]+)$/.exec(str.trim());
    if (!m) return null;
    return migrate(JSON.parse(fromBase64(m[1])));
  } catch {
    return null;
  }
}

function toBase64(s) {
  if (typeof Buffer !== 'undefined') return Buffer.from(s, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64) {
  if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
