import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  monsterHp, goldDrop, xpForLevel, stageForLevel, rollEgg, zoneData,
  upgradeCost, UPGRADES, RARITY, SPECIES, WAVES_PER_ZONE, monsterForWave,
} from '../js/data.js';
import { Game, defaultState, computeOffline, applyOffline, newFamiliar, BOSS_TIME_S } from '../js/game.js';
import { migrate, exportString, importString, SAVE_VERSION } from '../js/save.js';
import { CONFIG } from '../js/config.js';
import { SPRITES } from '../js/sprites.js';

// ---------- balance curves ----------

test('monster hp grows monotonically across waves and zones', () => {
  let prev = 0;
  for (let z = 0; z < 20; z++) {
    for (let w = 1; w < WAVES_PER_ZONE; w++) {
      const hp = monsterHp(z, w);
      assert.ok(hp > prev, `hp should grow at z${z} w${w}`);
      prev = hp;
    }
  }
});

test('boss waves are meaningfully harder and better paid', () => {
  assert.ok(monsterHp(0, WAVES_PER_ZONE) > monsterHp(0, WAVES_PER_ZONE - 1) * 3);
  assert.ok(goldDrop(0, WAVES_PER_ZONE, 0) > goldDrop(0, WAVES_PER_ZONE - 1, 0) * 3);
});

test('gold upgrade increases drops by 10 percent per level', () => {
  const base = goldDrop(2, 3, 0);
  assert.ok(Math.abs(goldDrop(2, 3, 10) / base - 2) < 0.05);
});

test('xp curve and evolution stages', () => {
  assert.ok(xpForLevel(2) > xpForLevel(1));
  assert.equal(stageForLevel(1), 0);
  assert.equal(stageForLevel(10), 1);
  assert.equal(stageForLevel(25), 2);
});

test('upgrade costs grow exponentially', () => {
  const up = UPGRADES[0];
  assert.ok(upgradeCost(up, 10) > upgradeCost(up, 0) * 10);
});

test('endless zones cycle themes with numbered names', () => {
  const z = zoneData(9);
  assert.ok(z.name.en.endsWith('2'));
  assert.ok(z.theme);
  assert.ok(monsterForWave(9, 1));
});

// ---------- egg rolls ----------

test('egg rarity distribution roughly matches weights', () => {
  let seed = 42;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const counts = [0, 0, 0, 0, 0];
  const N = 20000;
  for (let i = 0; i < N; i++) counts[rollEgg(rng).rarity]++;
  // Legendary-floor species (minRarity) can only shift counts upward
  assert.ok(counts[0] / N > 0.35 && counts[0] / N < 0.55, `common share ${counts[0] / N}`);
  assert.ok(counts[4] / N > 0.005, `legendary share ${counts[4] / N}`);
  // Every rolled species exists
  const roll = rollEgg(rng);
  assert.ok(SPECIES.some(s => s.id === roll.speciesId));
});

test('egg roll respects species rarity floor', () => {
  for (let i = 0; i < 500; i++) {
    const r = rollEgg(Math.random);
    const sp = SPECIES.find(s => s.id === r.speciesId);
    assert.ok(r.rarity >= sp.minRarity);
  }
});

// ---------- game simulation ----------

function makeGame(now = 1_000_000) {
  const clock = { t: now };
  const g = new Game(defaultState(now), { now: () => clock.t, rng: Math.random });
  return { g, clock };
}

test('team kills wave 1 monsters and earns gold', () => {
  const { g } = makeGame();
  const gold0 = g.state.gold;
  for (let i = 0; i < 600; i++) g.tick(0.1);
  assert.ok(g.state.stats.kills > 0, 'should have kills after 60s');
  assert.ok(g.state.gold > gold0);
});

test('familiars level up and eventually evolve', () => {
  const { g } = makeGame();
  const fam = g.state.familiars[0];
  let evolved = false;
  g.on('evolve', () => { evolved = true; });
  g.grantXp(fam, 100000);
  assert.ok(fam.level >= 10);
  assert.ok(evolved);
});

test('hatching costs gems and adds a familiar', () => {
  const { g } = makeGame();
  g.state.gems = CONFIG.eggCostGems;
  const fam = g.hatchEgg();
  assert.ok(fam);
  assert.equal(g.state.gems, 0);
  assert.equal(g.state.familiars.length, 2);
  assert.equal(g.hatchEgg(), null, 'cannot hatch without gems');
});

test('team management enforces size and validity', () => {
  const { g } = makeGame();
  g.state.gems = CONFIG.eggCostGems * 10;
  for (let i = 0; i < 5; i++) g.hatchEgg();
  assert.equal(g.state.team.length, 4, 'auto-deploys up to 4');
  assert.equal(g.setTeam([]), false);
  assert.ok(g.setTeam([g.state.familiars[0].id]));
  assert.equal(g.state.team.length, 1);
});

test('upgrades purchase and spend gold', () => {
  const { g } = makeGame();
  g.state.gold = 1000;
  assert.ok(g.buyUpgrade('atk'));
  assert.equal(g.state.upgrades.atk, 1);
  assert.ok(g.state.gold < 1000);
  g.state.gold = 0;
  assert.equal(g.buyUpgrade('atk'), false);
});

test('boost doubles dps while active', () => {
  const { g, clock } = makeGame();
  const dps0 = g.teamDps();
  g.startBoost();
  assert.ok(Math.abs(g.teamDps() / dps0 - CONFIG.boostMultiplier) < 1e-9);
  clock.t += CONFIG.boostDurationMs + 1;
  assert.ok(Math.abs(g.teamDps() - dps0) < 1e-9);
});

test('boss timer failure sets bossPending and retry respawns boss', () => {
  const { g } = makeGame();
  g.state.wave = WAVES_PER_ZONE;
  g.monster = null;
  g.spawnMonster();
  assert.ok(g.monster.isBoss);
  // Team survives (huge hp upgrade) but cannot dent the boss; clock runs out
  g.state.upgrades.hp = 1000;
  g.teamHp = g.teamMaxHp();
  g.monster.hp = 1e12;
  g.monster.maxHp = 1e12;
  for (let i = 0; i < (BOSS_TIME_S + 5) * 10; i++) g.tick(0.1);
  assert.ok(g.bossPending);
  assert.ok(!g.monster.isBoss, 'farms non-boss monsters while pending');
  g.retryBoss();
  assert.ok(g.monster.isBoss);
});

// ---------- offline ----------

test('offline progression pays out and respects cap', () => {
  const st = defaultState(0);
  const hour = 3600_000;
  const r1 = computeOffline(st, hour);
  assert.ok(r1.kills > 0);
  assert.ok(r1.gold > 0);
  const r8 = computeOffline(st, 8 * hour);
  const r99 = computeOffline(st, 99 * hour);
  assert.equal(r8.kills, r99.kills, 'capped at 8h without upgrade');
  st.upgrades.offline = 2;
  const r12 = computeOffline(st, 99 * hour);
  assert.ok(r12.kills > r99.kills, 'offline upgrade raises cap');
});

test('offline below minimum pays nothing', () => {
  const st = defaultState(0);
  assert.equal(computeOffline(st, 30_000).kills, 0);
});

test('applyOffline doubles with ad multiplier', () => {
  const { g } = makeGame();
  const r = { gold: 100, xp: 50, kills: 10, cappedMs: 0 };
  const gold0 = g.state.gold;
  applyOffline(g, r, 2);
  assert.equal(g.state.gold, gold0 + 200);
});

// ---------- save ----------

test('save export/import roundtrip', () => {
  const st = defaultState(123);
  st.gold = 999;
  st.familiars.push(newFamiliar('duskwyrm', 3));
  const s = exportString(st);
  const back = importString(s);
  assert.ok(back);
  assert.equal(back.gold, 999);
  assert.equal(back.familiars.length, 2);
  assert.equal(importString('garbage'), null);
  assert.equal(importString('PF1.!!!!'), null);
});

test('migrate rejects future versions and junk', () => {
  assert.equal(migrate(null), null);
  assert.equal(migrate({ version: SAVE_VERSION + 1 }), null);
  assert.ok(migrate(defaultState(0)));
});

// ---------- sprites data integrity ----------

test('all sprites are 16x16 with palette coverage', () => {
  for (const [key, s] of Object.entries(SPRITES)) {
    assert.equal(s.grid.length, 16, `${key} rows`);
    for (const row of s.grid) {
      assert.equal(row.length, 16, `${key} row width`);
      for (const ch of row) {
        if (ch === '.') continue;
        assert.ok(s.pal[ch], `${key} missing palette entry '${ch}'`);
      }
    }
  }
});

test('every species and monster references an existing sprite', async () => {
  const { MONSTERS } = await import('../js/data.js');
  for (const sp of SPECIES) assert.ok(SPRITES[sp.sprite], sp.id);
  for (const m of Object.values(MONSTERS)) assert.ok(SPRITES[m.sprite], m.sprite);
  assert.ok(SPRITES.egg);
});
