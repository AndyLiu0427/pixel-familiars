// Core simulation v2. No DOM access: testable under node --test.
// One pet instance per species; duplicates become shards (star-up currency).

import { CONFIG } from './config.js';
import {
  RARITY, SPECIES, UPGRADES, WAVES_PER_ZONE,
  monsterHp, monsterAtk, goldDrop, xpDrop, xpForLevel, stageForLevel,
  petBaseAtk, petBaseHp, upgradeCost, rollEgg, zoneData, monsterForWave,
  STAR_COSTS, MAX_STARS, SHARDS_BY_RARITY, SHARDS_PER_GEM, PITY_LEGENDARY,
  SHINY_RATE, levelCap, BOOK_REVEAL_BONUS, BOOK_MASTER_BONUS, BOOK_MILESTONES,
  GEAR_SLOTS, GEAR_RARITY, GEAR_CAP, FORGE_MAX, forgeCost, gearStat,
  rollGearDrop, DAILY_REWARDS,
} from './data.js';

export const BOSS_TIME_S = 30;
export const TEAM_SIZE = 4;

export function newPet(rarity, shiny = false) {
  return { rarity, level: 1, xp: 0, stars: 0, shiny, equip: {} };
}

export function defaultState(now = Date.now()) {
  return {
    version: 2,
    gold: 0,
    gems: 0,
    zone: 0,
    wave: 1,
    highestZone: 0,
    pets: { emberfox: newPet(0) },
    shards: {},
    team: ['emberfox'],
    items: [],
    nextItemId: 1,
    dust: 0,
    upgrades: { atk: 0, hp: 0, gold: 0, offline: 0 },
    boostUntil: 0,
    lastSeen: now,
    lastInterstitial: 0,
    lastFreeEgg: 0,
    stats: { kills: 0, bossKills: 0, eggs: 0, goldEarned: 0 },
    settings: { lang: null },
    book: { shinySeen: [], claimed: [] },
    pity: 0,
    daily: { streak: 0, last: null },
  };
}

export function speciesById(id) { return SPECIES.find(s => s.id === id); }

// ---- Collection book (pure helpers) ----

export function bookEntries(state) {
  const revealed = Object.keys(state.pets).length + state.book.shinySeen.length;
  const mastered = Object.values(state.pets).filter(p => p.stars >= MAX_STARS).length;
  return { revealed, mastered };
}

export function bookMult(state) {
  const { revealed, mastered } = bookEntries(state);
  return 1 + BOOK_REVEAL_BONUS * revealed + BOOK_MASTER_BONUS * mastered;
}

export function secretUnlocked(state) {
  return state.book.claimed.includes(2) || !!state.pets.voidwyrm;
}

// ---- Pet stats with equipment, book, upgrades ----

function equippedItems(state, speciesId) {
  const pet = state.pets[speciesId];
  if (!pet) return [];
  return Object.values(pet.equip ?? {})
    .map(id => state.items.find(it => it.id === id))
    .filter(Boolean);
}

export function petAtk(state, speciesId) {
  const pet = state.pets[speciesId];
  const sp = speciesById(speciesId);
  let atk = petBaseAtk(sp, pet.rarity, pet.level, pet.stars);
  let charm = 0;
  for (const it of equippedItems(state, speciesId)) {
    if (it.slot === 'weapon') atk += gearStat(it);
    if (it.slot === 'charm' && it.sub === 'atk') charm += gearStat(it);
  }
  return atk * (1 + charm) * (1 + 0.1 * state.upgrades.atk) * bookMult(state);
}

export function petHp(state, speciesId) {
  const pet = state.pets[speciesId];
  const sp = speciesById(speciesId);
  let hp = petBaseHp(sp, pet.rarity, pet.level, pet.stars);
  let charm = 0;
  for (const it of equippedItems(state, speciesId)) {
    if (it.slot === 'armor') hp += gearStat(it);
    if (it.slot === 'charm' && it.sub === 'hp') charm += gearStat(it);
  }
  return hp * (1 + charm) * (1 + 0.1 * state.upgrades.hp) * bookMult(state);
}

export function petStage(pet) { return stageForLevel(pet.level); }

export function goldCharmMult(state) {
  let m = 1;
  for (const id of state.team) {
    for (const it of equippedItems(state, id)) {
      if (it.slot === 'charm' && it.sub === 'gold') m += gearStat(it);
    }
  }
  return m;
}

export class Game {
  constructor(state, { now = () => Date.now(), rng = Math.random } = {}) {
    this.state = state ?? defaultState();
    this.now = now;
    this.rng = rng;
    this.listeners = {};
    this.monster = null;
    this.teamHp = this.teamMaxHp();
    this.bossPending = false;
    this.spawnMonster();
  }

  on(ev, fn) { (this.listeners[ev] ??= []).push(fn); }
  emit(ev, payload) { for (const fn of this.listeners[ev] ?? []) fn(payload); }

  activeTeam() { return this.state.team.filter(id => this.state.pets[id]); }

  teamDps() {
    const boost = this.now() < this.state.boostUntil ? CONFIG.boostMultiplier : 1;
    return this.activeTeam().reduce((a, id) => a + petAtk(this.state, id), 0) * boost;
  }

  teamMaxHp() {
    return this.activeTeam().reduce((a, id) => a + petHp(this.state, id), 0);
  }

  isBossWave() { return this.state.wave === WAVES_PER_ZONE; }

  spawnMonster() {
    const { zone, wave } = this.state;
    const isBoss = this.isBossWave();
    if (isBoss && this.bossPending) return;
    const hp = monsterHp(zone, wave);
    this.monster = {
      key: monsterForWave(zone, wave),
      hp, maxHp: hp,
      atk: monsterAtk(zone, wave),
      isBoss,
      timeLeft: isBoss ? BOSS_TIME_S : Infinity,
    };
    if (isBoss) this.emit('boss_start', this.monster);
  }

  retryBoss() {
    if (!this.bossPending) return;
    this.bossPending = false;
    this.spawnMonster();
  }

  tick(dt) {
    const st = this.state;
    if (!this.monster) { this.spawnMonster(); if (!this.monster) return; }
    const m = this.monster;

    const dmg = this.teamDps() * dt;
    m.hp -= dmg;
    this.emit('hit', { dmg, monster: m });

    if (m.hp <= 0) { this.onKill(m); return; }

    this.teamHp -= m.atk * dt;
    if (this.teamHp <= 0) {
      this.emit('wipe');
      st.wave = Math.max(1, st.wave - 1);
      this.teamHp = this.teamMaxHp();
      this.bossPending = false;
      this.spawnMonster();
      return;
    }
    this.teamHp = Math.min(this.teamMaxHp(), this.teamHp + this.teamMaxHp() * 0.02 * dt);

    if (m.isBoss) {
      m.timeLeft -= dt;
      if (m.timeLeft <= 0) {
        this.emit('boss_fail');
        this.bossPending = true;
        const w = WAVES_PER_ZONE - 1;
        const hp = monsterHp(st.zone, w);
        this.monster = {
          key: monsterForWave(st.zone, w),
          hp, maxHp: hp, atk: monsterAtk(st.zone, w),
          isBoss: false, timeLeft: Infinity,
        };
      }
    }
  }

  onKill(m) {
    const st = this.state;
    const gold = Math.ceil(goldDrop(st.zone, st.wave, st.upgrades.gold) * goldCharmMult(st));
    const xp = xpDrop(st.zone, st.wave);
    st.gold += gold;
    st.stats.goldEarned += gold;
    st.stats.kills++;
    this.grantTeamXp(xp);

    // Equipment drop
    const drop = rollGearDrop(st.zone, m.isBoss, this.rng);
    if (drop) this.addItem(drop);

    this.emit('kill', { monster: m, gold, xp, drop });

    if (m.isBoss) {
      st.stats.bossKills++;
      st.zone++;
      st.wave = 1;
      if (st.zone > st.highestZone) {
        st.highestZone = st.zone;
        st.gems += CONFIG.bossFirstKillGems;
        this.emit('gems', CONFIG.bossFirstKillGems);
      }
      this.teamHp = this.teamMaxHp();
      this.emit('zone_advance', zoneData(st.zone));
    } else {
      st.wave++;
      this.teamHp = Math.min(this.teamMaxHp(), this.teamHp + this.teamMaxHp() * 0.25);
    }
    this.monster = null;
    this.spawnMonster();
  }

  grantTeamXp(xp) {
    const active = new Set(this.state.team);
    for (const [id, pet] of Object.entries(this.state.pets)) {
      this.grantXp(id, pet, active.has(id) ? xp : Math.ceil(xp * 0.25));
    }
  }

  grantXp(speciesId, pet, xp) {
    const cap = levelCap(pet.stars);
    if (pet.level >= cap) return;
    pet.xp += xp;
    let need = xpForLevel(pet.level);
    while (pet.xp >= need && pet.level < cap) {
      const beforeStage = petStage(pet);
      pet.xp -= need;
      pet.level++;
      this.emit('levelup', { speciesId, pet });
      if (petStage(pet) > beforeStage) this.emit('evolve', { speciesId, pet });
      need = xpForLevel(pet.level);
    }
    if (pet.level >= cap) pet.xp = 0;
  }

  // ---- Eggs / fusion ----

  hatchEgg({ free = false } = {}) {
    const st = this.state;
    if (!free) {
      if (st.gems < CONFIG.eggCostGems) return null;
      st.gems -= CONFIG.eggCostGems;
    }
    st.stats.eggs++;
    st.pity++;
    const force = st.pity >= PITY_LEGENDARY ? RARITY.length - 1 : null;
    const { speciesId, rarity } = rollEgg(this.rng, {
      owned: new Set(Object.keys(st.pets)),
      secretUnlocked: secretUnlocked(st),
      forceRarity: force,
    });
    if (rarity === RARITY.length - 1) st.pity = 0;

    const shiny = this.rng() < SHINY_RATE;
    const result = { speciesId, rarity, shiny, isNew: false, shards: 0, gems: 0, rarityUp: false };
    const owned = st.pets[speciesId];

    if (!owned) {
      st.pets[speciesId] = newPet(rarity, shiny);
      result.isNew = true;
      if (st.team.length < TEAM_SIZE) st.team.push(speciesId);
    } else {
      let gained = SHARDS_BY_RARITY[rarity];
      if (rarity > owned.rarity) {
        gained = SHARDS_BY_RARITY[owned.rarity];
        owned.rarity = rarity;
        result.rarityUp = true;
      }
      st.shards[speciesId] = (st.shards[speciesId] ?? 0) + gained;
      result.shards = gained;
      // Overflow: shards past what a 5-star pet can spend convert to gems
      if (owned.stars >= MAX_STARS) {
        const gems = Math.floor(st.shards[speciesId] / SHARDS_PER_GEM);
        if (gems > 0) {
          st.shards[speciesId] -= gems * SHARDS_PER_GEM;
          st.gems += gems;
          result.gems = gems;
        }
      }
    }
    if (shiny && !st.book.shinySeen.includes(speciesId)) st.book.shinySeen.push(speciesId);
    if (shiny && owned) owned.shiny = true;

    this.teamHp = this.teamMaxHp();
    this.emit('hatch', result);
    this.checkMilestones();
    return result;
  }

  starUp(speciesId) {
    const st = this.state;
    const pet = st.pets[speciesId];
    if (!pet || pet.stars >= MAX_STARS) return false;
    const cost = STAR_COSTS[pet.stars];
    if ((st.shards[speciesId] ?? 0) < cost) return false;
    st.shards[speciesId] -= cost;
    pet.stars++;
    this.teamHp = this.teamMaxHp();
    this.emit('starup', { speciesId, pet });
    this.checkMilestones();
    return true;
  }

  // ---- Collection milestones ----

  checkMilestones() {
    const st = this.state;
    const { revealed } = bookEntries(st);
    BOOK_MILESTONES.forEach((ms, i) => {
      if (revealed >= ms.at && !st.book.claimed.includes(i)) {
        st.book.claimed.push(i);
        if (ms.reward === 'gems') { st.gems += ms.amount; }
        if (ms.reward === 'egg') { this.hatchEgg({ free: true }); }
        if (ms.reward === 'secret' && !st.pets.voidwyrm) {
          st.pets.voidwyrm = newPet(3);
          if (st.team.length < TEAM_SIZE) st.team.push('voidwyrm');
        }
        this.emit('milestone', { index: i, ...ms });
      }
    });
  }

  // ---- Equipment ----

  addItem({ slot, rarity, sub }) {
    const st = this.state;
    const item = { id: st.nextItemId++, slot, rarity, sub, zone: st.zone, forge: 0 };
    st.items.push(item);
    if (st.items.length > GEAR_CAP) this.autoSalvage();
    this.emit('gear', item);
    return item;
  }

  equippedIds() {
    const ids = new Set();
    for (const pet of Object.values(this.state.pets)) {
      for (const id of Object.values(pet.equip ?? {})) ids.add(id);
    }
    return ids;
  }

  autoSalvage() {
    const st = this.state;
    const equipped = this.equippedIds();
    const loose = st.items
      .filter(it => !equipped.has(it.id))
      .sort((a, b) => a.rarity - b.rarity || a.zone - b.zone);
    while (st.items.length > GEAR_CAP && loose.length) {
      const it = loose.shift();
      st.dust += GEAR_RARITY[it.rarity].dust;
      st.items.splice(st.items.indexOf(it), 1);
    }
  }

  salvageBelowEpic() {
    const st = this.state;
    const equipped = this.equippedIds();
    let dust = 0, count = 0;
    st.items = st.items.filter(it => {
      if (equipped.has(it.id) || it.rarity >= 2) return true;
      dust += GEAR_RARITY[it.rarity].dust;
      count++;
      return false;
    });
    st.dust += dust;
    return { dust, count };
  }

  // Greedy: best weapon/armor/charm (by stat) to each team pet in order.
  equipBest() {
    const st = this.state;
    for (const pet of Object.values(st.pets)) pet.equip = {};
    const bySlot = {};
    for (const slot of GEAR_SLOTS) {
      bySlot[slot] = st.items.filter(it => it.slot === slot)
        .sort((a, b) => gearStat(b) - gearStat(a));
    }
    for (const id of this.activeTeam()) {
      const pet = st.pets[id];
      for (const slot of GEAR_SLOTS) {
        const item = bySlot[slot].shift();
        if (item) pet.equip[slot] = item.id;
      }
    }
    this.teamHp = Math.min(this.teamHp, this.teamMaxHp());
    this.emit('equip');
  }

  forgeItem(itemId) {
    const st = this.state;
    const item = st.items.find(it => it.id === itemId);
    if (!item || item.forge >= FORGE_MAX) return false;
    const cost = forgeCost(item.forge);
    if (st.dust < cost) return false;
    st.dust -= cost;
    item.forge++;
    this.emit('forge', item);
    return true;
  }

  // ---- Upgrades / team / boost ----

  buyUpgrade(id) {
    const up = UPGRADES.find(u => u.id === id);
    const st = this.state;
    const lvl = st.upgrades[id];
    if (lvl >= up.maxLevel) return false;
    const cost = upgradeCost(up, lvl);
    if (st.gold < cost) return false;
    st.gold -= cost;
    st.upgrades[id]++;
    this.teamHp = Math.min(this.teamHp, this.teamMaxHp());
    this.emit('upgrade', { id, level: st.upgrades[id] });
    return true;
  }

  setTeam(ids) {
    const valid = ids.filter(id => this.state.pets[id]).slice(0, TEAM_SIZE);
    if (valid.length === 0) return false;
    this.state.team = valid;
    this.teamHp = this.teamMaxHp();
    return true;
  }

  startBoost() {
    this.state.boostUntil = this.now() + CONFIG.boostDurationMs;
    this.emit('boost');
  }

  // ---- Daily rewards ----
  // dateStr: local YYYY-MM-DD. Returns reward granted or null if already claimed.
  claimDaily(dateStr) {
    const st = this.state;
    if (st.daily.last === dateStr) return null;
    const yesterday = st.daily.last &&
      (new Date(dateStr) - new Date(st.daily.last)) === 86400_000;
    st.daily.streak = yesterday ? st.daily.streak + 1 : 1;
    st.daily.last = dateStr;
    const day = ((st.daily.streak - 1) % DAILY_REWARDS.length);
    const reward = DAILY_REWARDS[day];
    const result = { day: day + 1, streak: st.daily.streak, type: reward.type, amount: 0 };
    if (reward.type === 'gold') {
      result.amount = goldDrop(st.zone, 1, st.upgrades.gold) * reward.mult;
      st.gold += result.amount;
    } else if (reward.type === 'gems') {
      result.amount = reward.amount;
      st.gems += result.amount;
    } else if (reward.type === 'egg') {
      result.hatch = this.hatchEgg({ free: true });
    }
    this.emit('daily', result);
    return result;
  }

  offlineCapMs() {
    return (CONFIG.offlineBaseCapHours + 2 * this.state.upgrades.offline) * 3600_000;
  }
}

// ---- Offline progression (pure) ----

export function computeOffline(state, elapsedMs) {
  const capMs = (CONFIG.offlineBaseCapHours + 2 * state.upgrades.offline) * 3600_000;
  const ms = Math.min(Math.max(elapsedMs, 0), capMs);
  if (ms < CONFIG.offlineMinMs) return { gold: 0, xp: 0, kills: 0, cappedMs: ms };

  const dps = state.team
    .filter(id => state.pets[id])
    .reduce((a, id) => a + petAtk(state, id), 0);
  const wave = Math.min(state.wave, WAVES_PER_ZONE - 1);
  const hp = monsterHp(state.zone, wave);
  const killsPerSec = Math.min(dps / hp, 2) * CONFIG.offlineEfficiency;
  const kills = Math.floor(killsPerSec * ms / 1000);
  return {
    gold: kills * Math.ceil(goldDrop(state.zone, wave, state.upgrades.gold) * goldCharmMult(state)),
    xp: kills * xpDrop(state.zone, wave),
    kills,
    cappedMs: ms,
  };
}

export function applyOffline(game, result, mult = 1) {
  game.state.gold += result.gold * mult;
  game.state.stats.goldEarned += result.gold * mult;
  game.state.stats.kills += result.kills * mult;
  game.grantTeamXp(result.xp * mult);
  game.teamHp = game.teamMaxHp();
}
