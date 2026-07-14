// Core simulation. No DOM access: testable under node --test.
// Time and randomness are injected so tests are deterministic.

import { CONFIG } from './config.js';
import {
  RARITY, SPECIES, UPGRADES, WAVES_PER_ZONE,
  monsterHp, monsterAtk, goldDrop, xpDrop, xpForLevel, stageForLevel,
  familiarAtk, familiarHp, upgradeCost, rollEgg, zoneData, monsterForWave,
} from './data.js';

export const BOSS_TIME_S = 30;
export const TEAM_SIZE = 4;

let nextId = 1;

export function newFamiliar(speciesId, rarity) {
  return { id: nextId++, speciesId, rarity, level: 1, xp: 0 };
}

export function defaultState(now = Date.now()) {
  nextId = 1;
  const starter = newFamiliar('emberfox', 0);
  return {
    version: 1,
    gold: 0,
    gems: 0,
    zone: 0,
    wave: 1,
    highestZone: 0,
    familiars: [starter],
    team: [starter.id],
    nextId,
    upgrades: { atk: 0, hp: 0, gold: 0, offline: 0 },
    boostUntil: 0,
    lastSeen: now,
    lastInterstitial: 0,
    lastFreeEgg: 0,
    stats: { kills: 0, bossKills: 0, eggs: 0, goldEarned: 0 },
    settings: { lang: null },
    seenSpecies: ['emberfox'],
  };
}

export function speciesById(id) { return SPECIES.find(s => s.id === id); }

export function famAtk(fam, upgrades) {
  return familiarAtk(speciesById(fam.speciesId), fam.rarity, fam.level) * (1 + 0.1 * upgrades.atk);
}
export function famHp(fam, upgrades) {
  return familiarHp(speciesById(fam.speciesId), fam.rarity, fam.level) * (1 + 0.1 * upgrades.hp);
}
export function famStage(fam) { return stageForLevel(fam.level); }

export class Game {
  constructor(state, { now = () => Date.now(), rng = Math.random } = {}) {
    this.state = state ?? defaultState();
    nextId = Math.max(nextId, this.state.nextId ?? 1);
    this.now = now;
    this.rng = rng;
    this.listeners = {};
    this.monster = null;       // { key, hp, maxHp, atk, isBoss, timeLeft }
    this.teamHp = this.teamMaxHp();
    this.bossPending = false;  // boss failed; waiting for retry
    this.spawnMonster();
  }

  on(ev, fn) { (this.listeners[ev] ??= []).push(fn); }
  emit(ev, payload) { for (const fn of this.listeners[ev] ?? []) fn(payload); }

  activeFamiliars() {
    return this.state.team
      .map(id => this.state.familiars.find(f => f.id === id))
      .filter(Boolean);
  }
  teamDps() {
    const boost = this.now() < this.state.boostUntil ? CONFIG.boostMultiplier : 1;
    return this.activeFamiliars().reduce((a, f) => a + famAtk(f, this.state.upgrades), 0) * boost;
  }
  teamMaxHp() {
    return this.activeFamiliars().reduce((a, f) => a + famHp(f, this.state.upgrades), 0);
  }

  isBossWave() { return this.state.wave === WAVES_PER_ZONE; }

  spawnMonster() {
    const { zone, wave } = this.state;
    const isBoss = this.isBossWave();
    if (isBoss && this.bossPending) return; // wait for manual retry
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

  // One logic step. dt in seconds.
  tick(dt) {
    const st = this.state;
    if (!this.monster) { this.spawnMonster(); if (!this.monster) return; }
    const m = this.monster;

    // Team attacks
    const dmg = this.teamDps() * dt;
    m.hp -= dmg;
    this.emit('hit', { dmg, monster: m });

    if (m.hp <= 0) { this.onKill(m); return; }

    // Monster attacks back
    this.teamHp -= m.atk * dt;
    if (this.teamHp <= 0) {
      this.emit('wipe');
      st.wave = Math.max(1, st.wave - 1);
      this.teamHp = this.teamMaxHp();
      this.bossPending = false;
      this.spawnMonster();
      return;
    }
    // Slow regen keeps mid-zone farming stable
    this.teamHp = Math.min(this.teamMaxHp(), this.teamHp + this.teamMaxHp() * 0.02 * dt);

    // Boss timer
    if (m.isBoss) {
      m.timeLeft -= dt;
      if (m.timeLeft <= 0) {
        this.emit('boss_fail');
        this.bossPending = true;
        st.wave = WAVES_PER_ZONE; // stay at boss wave; farm previous via retry loop
        this.monster = {
          key: monsterForWave(st.zone, WAVES_PER_ZONE - 1),
          hp: monsterHp(st.zone, WAVES_PER_ZONE - 1),
          maxHp: monsterHp(st.zone, WAVES_PER_ZONE - 1),
          atk: monsterAtk(st.zone, WAVES_PER_ZONE - 1),
          isBoss: false, timeLeft: Infinity,
        };
      }
    }
  }

  onKill(m) {
    const st = this.state;
    const gold = goldDrop(st.zone, st.wave, st.upgrades.gold);
    const xp = xpDrop(st.zone, st.wave);
    st.gold += gold;
    st.stats.goldEarned += gold;
    st.stats.kills++;
    this.grantTeamXp(xp);
    this.emit('kill', { monster: m, gold, xp });

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
    for (const f of this.state.familiars) {
      this.grantXp(f, active.has(f.id) ? xp : Math.ceil(xp * 0.25));
    }
  }

  grantXp(fam, xp) {
    fam.xp += xp;
    let need = xpForLevel(fam.level);
    while (fam.xp >= need) {
      const beforeStage = famStage(fam);
      fam.xp -= need;
      fam.level++;
      this.emit('levelup', fam);
      if (famStage(fam) > beforeStage) this.emit('evolve', fam);
      need = xpForLevel(fam.level);
    }
  }

  // ---- Player actions ----

  hatchEgg({ free = false } = {}) {
    const st = this.state;
    if (!free) {
      if (st.gems < CONFIG.eggCostGems) return null;
      st.gems -= CONFIG.eggCostGems;
    }
    const { speciesId, rarity } = rollEgg(this.rng);
    const fam = newFamiliar(speciesId, rarity);
    st.familiars.push(fam);
    st.nextId = nextId;
    st.stats.eggs++;
    const isNew = !st.seenSpecies.includes(speciesId);
    if (isNew) st.seenSpecies.push(speciesId);
    if (st.team.length < TEAM_SIZE) st.team.push(fam.id);
    this.teamHp = this.teamMaxHp();
    this.emit('hatch', { fam, isNew });
    return fam;
  }

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
    const valid = ids.filter(id => this.state.familiars.some(f => f.id === id)).slice(0, TEAM_SIZE);
    if (valid.length === 0) return false;
    this.state.team = valid;
    this.teamHp = this.teamMaxHp();
    return true;
  }

  startBoost() {
    const now = this.now();
    this.state.boostUntil = Math.max(now, this.state.boostUntil) ;
    this.state.boostUntil = now + CONFIG.boostDurationMs;
    this.emit('boost');
  }

  offlineCapMs() {
    return (CONFIG.offlineBaseCapHours + 2 * this.state.upgrades.offline) * 3600_000;
  }
}

// ---- Offline progression (pure) ----
// Returns { gold, xp, kills, cappedMs } for `elapsedMs` away at state's position.
export function computeOffline(state, elapsedMs) {
  const capMs = (CONFIG.offlineBaseCapHours + 2 * state.upgrades.offline) * 3600_000;
  const ms = Math.min(Math.max(elapsedMs, 0), capMs);
  if (ms < CONFIG.offlineMinMs) return { gold: 0, xp: 0, kills: 0, cappedMs: ms };

  const activeIds = new Set(state.team);
  const dps = state.familiars
    .filter(f => activeIds.has(f.id))
    .reduce((a, f) => a + famAtk(f, state.upgrades), 0);
  // Farm the current non-boss wave while away.
  const wave = Math.min(state.wave, WAVES_PER_ZONE - 1);
  const hp = monsterHp(state.zone, wave);
  const killsPerSec = Math.min(dps / hp, 2) * CONFIG.offlineEfficiency;
  const kills = Math.floor(killsPerSec * ms / 1000);
  return {
    gold: kills * goldDrop(state.zone, wave, state.upgrades.gold),
    xp: kills * xpDrop(state.zone, wave),
    kills,
    cappedMs: ms,
  };
}

// Apply a computed offline result (optionally doubled by ad) to a game.
export function applyOffline(game, result, mult = 1) {
  game.state.gold += result.gold * mult;
  game.state.stats.goldEarned += result.gold * mult;
  game.state.stats.kills += result.kills * mult;
  game.grantTeamXp(result.xp * mult);
  game.teamHp = game.teamMaxHp();
}
