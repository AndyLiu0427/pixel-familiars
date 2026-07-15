import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  monsterHp, goldDrop, xpForLevel, stageForLevel, rollEgg, zoneData,
  upgradeCost, UPGRADES, RARITY, SPECIES, WAVES_PER_ZONE, monsterForWave,
  STAR_COSTS, MAX_STARS, levelCap, gearStat, rollGearDrop, forgeCost,
  GEAR_CAP, BOOK_MILESTONES,
} from '../js/data.js';
import {
  Game, defaultState, computeOffline, applyOffline, newPet, BOSS_TIME_S,
  bookMult, bookEntries, petAtk, petHp,
} from '../js/game.js';
import { migrate, exportString, importString, SAVE_VERSION } from '../js/save.js';
import { CONFIG } from '../js/config.js';
import { SPRITES } from '../js/sprites.js';

function seededRng(seed = 42) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function makeGame(now = 1_000_000, rng = Math.random) {
  const clock = { t: now };
  const g = new Game(defaultState(now), { now: () => clock.t, rng });
  return { g, clock };
}

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
  assert.ok(monsterForWave(9, 1));
});

// ---------- eggs / fusion ----------

test('egg rarity distribution roughly matches weights', () => {
  const rng = seededRng();
  const counts = [0, 0, 0, 0, 0];
  const N = 20000;
  for (let i = 0; i < N; i++) counts[rollEgg(rng).rarity]++;
  assert.ok(counts[0] / N > 0.35 && counts[0] / N < 0.55, `common share ${counts[0] / N}`);
  assert.ok(counts[4] / N > 0.005, `legendary share ${counts[4] / N}`);
});

test('egg roll respects rarity floor and secret gate', () => {
  for (let i = 0; i < 500; i++) {
    const r = rollEgg(Math.random);
    const sp = SPECIES.find(s => s.id === r.speciesId);
    assert.ok(r.rarity >= sp.minRarity);
    assert.ok(!sp.secret, 'secret species must not hatch while locked');
  }
  let sawSecret = false;
  for (let i = 0; i < 3000; i++) {
    const r = rollEgg(Math.random, { secretUnlocked: true });
    if (r.speciesId === 'voidwyrm') sawSecret = true;
  }
  assert.ok(sawSecret, 'secret species hatches once unlocked');
});

test('duplicate hatches convert to shards, star-up consumes them', () => {
  const { g } = makeGame(1_000_000, seededRng(7));
  const st = g.state;
  st.gems = 1e9;
  let dupes = 0;
  while ((st.shards.emberfox ?? 0) < STAR_COSTS[0]) {
    const r = g.hatchEgg();
    if (r.speciesId === 'emberfox' && !r.isNew) dupes++;
    assert.ok(st.stats.eggs < 4000, 'should find dupes quickly');
  }
  assert.ok(dupes > 0);
  const shardsBefore = st.shards.emberfox;
  assert.ok(g.starUp('emberfox'));
  assert.equal(st.pets.emberfox.stars, 1);
  assert.equal(st.shards.emberfox, shardsBefore - STAR_COSTS[0]);
  assert.equal(g.starUp('nonexistent'), false);
});

test('stars raise stats and level cap', () => {
  const st = defaultState(0);
  const atk0 = petAtk(st, 'emberfox');
  st.pets.emberfox.stars = 4;
  const atk4 = petAtk(st, 'emberfox');
  assert.ok(Math.abs(atk4 / atk0 - 2) < 0.01, '+25% per star: 4 stars = 2x');
  assert.equal(levelCap(0), 30);
  assert.equal(levelCap(5), 80);
});

test('level cap blocks levelups until star-up', () => {
  const { g } = makeGame();
  const pet = g.state.pets.emberfox;
  g.grantXp('emberfox', pet, 1e12);
  assert.equal(pet.level, levelCap(0));
  pet.stars = 1;
  g.grantXp('emberfox', pet, 1e12);
  assert.equal(pet.level, levelCap(1));
});

test('pity guarantees a legendary within 40 eggs', () => {
  const rng = () => 0.999999; // never rolls legendary naturally, never shiny
  const { g } = makeGame(1_000_000, rng);
  g.state.gems = 1e9;
  let sawLegendary = false;
  for (let i = 0; i < 40; i++) {
    const r = g.hatchEgg();
    if (r.rarity === RARITY.length - 1) { sawLegendary = true; break; }
  }
  assert.ok(sawLegendary);
  assert.equal(g.state.pity, 0, 'pity resets after legendary');
});

test('5-star overflow shards convert to gems', () => {
  const { g } = makeGame(1_000_000, seededRng(3));
  const st = g.state;
  st.pets.emberfox.stars = MAX_STARS;
  st.shards.emberfox = 4;
  st.team = ['emberfox'];
  // Force a duplicate emberfox hatch by removing every other species from play
  st.gems = 1e9;
  const gems0 = st.gems;
  let r;
  do { r = g.hatchEgg(); } while (r.isNew || r.speciesId !== 'emberfox');
  assert.ok(st.shards.emberfox < 5, 'shards flushed to gems');
  assert.ok(st.gems > gems0 - Math.ceil(st.stats.eggs) * CONFIG.eggCostGems, 'gems granted');
});

// ---------- collection book ----------

test('book bonus scales with revealed and mastered entries', () => {
  const st = defaultState(0);
  const m0 = bookMult(st);
  st.pets.mossling = newPet(0);
  assert.ok(bookMult(st) > m0);
  st.pets.emberfox.stars = MAX_STARS;
  const withMaster = bookMult(st);
  assert.ok(withMaster > bookMult({ ...st, pets: { ...st.pets, emberfox: { ...st.pets.emberfox, stars: 4 } } }));
  const { revealed } = bookEntries(st);
  assert.equal(revealed, 2);
});

test('book milestones auto-claim: gems, egg, secret pet', () => {
  const { g } = makeGame(1_000_000, seededRng(11));
  const st = g.state;
  st.gems = 1e9;
  // hatch until 15 entries revealed
  for (let i = 0; i < 5000 && bookEntries(st).revealed < 15; i++) g.hatchEgg();
  assert.ok(bookEntries(st).revealed >= 15, 'reached 15 entries');
  assert.ok(st.book.claimed.includes(0), 'gems milestone claimed');
  assert.ok(st.book.claimed.includes(2), 'secret milestone claimed');
  assert.ok(st.pets.voidwyrm, 'voidwyrm granted');
});

// ---------- equipment ----------

test('gear drops: bosses always, mobs at ~4%', () => {
  const rng = seededRng(5);
  assert.ok(rollGearDrop(0, true, rng));
  let drops = 0;
  const N = 10000;
  for (let i = 0; i < N; i++) if (rollGearDrop(0, false, rng)) drops++;
  assert.ok(drops / N > 0.02 && drops / N < 0.06, `mob drop rate ${drops / N}`);
});

test('gear stats scale with zone, rarity, and forge', () => {
  const w1 = { slot: 'weapon', rarity: 0, zone: 0, forge: 0 };
  const w2 = { slot: 'weapon', rarity: 0, zone: 5, forge: 0 };
  const w3 = { slot: 'weapon', rarity: 3, zone: 5, forge: 0 };
  const w4 = { slot: 'weapon', rarity: 3, zone: 5, forge: 10 };
  assert.ok(gearStat(w2) > gearStat(w1));
  assert.ok(gearStat(w3) > gearStat(w2));
  assert.ok(gearStat(w4) > gearStat(w3));
  assert.ok(forgeCost(9) > forgeCost(0) * 10);
});

test('equipBest assigns best items and stats rise', () => {
  const { g } = makeGame();
  const st = g.state;
  const naked = petAtk(st, 'emberfox');
  g.addItem({ slot: 'weapon', rarity: 3, sub: null });
  g.addItem({ slot: 'weapon', rarity: 0, sub: null });
  g.addItem({ slot: 'armor', rarity: 2, sub: null });
  g.addItem({ slot: 'charm', rarity: 1, sub: 'atk' });
  g.equipBest();
  const pet = st.pets.emberfox;
  assert.ok(pet.equip.weapon);
  const equippedWeapon = st.items.find(i => i.id === pet.equip.weapon);
  assert.equal(equippedWeapon.rarity, 3, 'best weapon chosen');
  assert.ok(petAtk(st, 'emberfox') > naked);
  assert.ok(petHp(st, 'emberfox') > 0);
});

test('salvage and inventory cap produce dust', () => {
  const { g } = makeGame();
  const st = g.state;
  for (let i = 0; i < 10; i++) g.addItem({ slot: 'weapon', rarity: 0, sub: null });
  const { dust, count } = g.salvageBelowEpic();
  assert.equal(count, 10);
  assert.ok(dust >= 10);
  assert.equal(st.items.length, 0);
  for (let i = 0; i < GEAR_CAP + 10; i++) g.addItem({ slot: 'armor', rarity: 0, sub: null });
  assert.ok(st.items.length <= GEAR_CAP, 'overflow auto-salvaged');
  assert.ok(st.dust > dust);
});

test('forge consumes dust and respects max', () => {
  const { g } = makeGame();
  const st = g.state;
  const item = g.addItem({ slot: 'weapon', rarity: 1, sub: null });
  st.dust = 1e9;
  for (let i = 0; i < 15; i++) g.forgeItem(item.id);
  assert.equal(item.forge, 10);
});

// ---------- daily ----------

test('daily rewards track streak and reset on gaps', () => {
  const { g } = makeGame();
  const r1 = g.claimDaily('2026-07-15');
  assert.equal(r1.streak, 1);
  assert.equal(g.claimDaily('2026-07-15'), null, 'no double claim');
  const r2 = g.claimDaily('2026-07-16');
  assert.equal(r2.streak, 2);
  const r3 = g.claimDaily('2026-07-20');
  assert.equal(r3.streak, 1, 'gap resets streak');
});

// ---------- game simulation ----------

test('team kills wave 1 monsters and earns gold', () => {
  const { g } = makeGame();
  for (let i = 0; i < 600; i++) g.tick(0.1);
  assert.ok(g.state.stats.kills > 0);
  assert.ok(g.state.gold > 0);
});

test('boss timer failure sets bossPending and retry respawns boss', () => {
  const { g } = makeGame();
  g.state.wave = WAVES_PER_ZONE;
  g.monster = null;
  g.spawnMonster();
  assert.ok(g.monster.isBoss);
  g.state.upgrades.hp = 1000;
  g.teamHp = g.teamMaxHp();
  g.monster.hp = 1e15;
  g.monster.maxHp = 1e15;
  for (let i = 0; i < (BOSS_TIME_S + 5) * 10; i++) g.tick(0.1);
  assert.ok(g.bossPending);
  g.retryBoss();
  assert.ok(g.monster.isBoss);
});

test('boost doubles dps while active', () => {
  const { g, clock } = makeGame();
  const dps0 = g.teamDps();
  g.startBoost();
  assert.ok(Math.abs(g.teamDps() / dps0 - CONFIG.boostMultiplier) < 1e-9);
  clock.t += CONFIG.boostDurationMs + 1;
  assert.ok(Math.abs(g.teamDps() - dps0) < 1e-9);
});

// ---------- offline ----------

test('offline progression pays out and respects cap', () => {
  const st = defaultState(0);
  const hour = 3600_000;
  const r1 = computeOffline(st, hour);
  assert.ok(r1.kills > 0 && r1.gold > 0);
  const r8 = computeOffline(st, 8 * hour);
  const r99 = computeOffline(st, 99 * hour);
  assert.equal(r8.kills, r99.kills);
  st.upgrades.offline = 2;
  assert.ok(computeOffline(st, 99 * hour).kills > r99.kills);
});

test('applyOffline doubles with ad multiplier', () => {
  const { g } = makeGame();
  const r = { gold: 100, xp: 50, kills: 10, cappedMs: 0 };
  const gold0 = g.state.gold;
  applyOffline(g, r, 2);
  assert.equal(g.state.gold, gold0 + 200);
});

// ---------- save / migration ----------

test('save export/import roundtrip (v2)', () => {
  const st = defaultState(123);
  st.gold = 999;
  st.pets.duskwyrm = newPet(3);
  const back = importString(exportString(st));
  assert.ok(back);
  assert.equal(back.gold, 999);
  assert.ok(back.pets.duskwyrm);
  assert.equal(importString('garbage'), null);
});

test('v1 saves migrate: best instance kept, extras become shards', () => {
  const v1 = {
    version: 1,
    gold: 500, gems: 20, zone: 3, wave: 4, highestZone: 3,
    familiars: [
      { id: 1, speciesId: 'emberfox', rarity: 0, level: 9, xp: 5 },
      { id: 2, speciesId: 'emberfox', rarity: 2, level: 3, xp: 0 },
      { id: 3, speciesId: 'gustowl', rarity: 1, level: 5, xp: 2 },
    ],
    team: [1, 3],
    upgrades: { atk: 2, hp: 1, gold: 0, offline: 1 },
    lastSeen: 111,
    stats: { kills: 10, bossKills: 1, eggs: 2, goldEarned: 600 },
    settings: { lang: 'zh-TW' },
  };
  const st = migrate(v1);
  assert.equal(st.version, SAVE_VERSION);
  assert.equal(st.pets.emberfox.rarity, 2, 'higher rarity instance kept');
  assert.equal(st.shards.emberfox, 1, 'common dupe becomes 1 shard');
  assert.deepEqual(st.team, ['emberfox', 'gustowl']);
  assert.equal(st.gold, 500);
  assert.equal(st.upgrades.atk, 2);
  assert.ok(st.book && st.daily && Array.isArray(st.items));
});

test('migrate rejects future versions and junk', () => {
  assert.equal(migrate(null), null);
  assert.equal(migrate({ version: SAVE_VERSION + 1 }), null);
  assert.ok(migrate(defaultState(0)));
});

// ---------- sprites ----------

test('all sprites are 24x24 with palette coverage (incl shiny)', () => {
  for (const [key, s] of Object.entries(SPRITES)) {
    assert.equal(s.grid.length, 24, `${key} rows`);
    for (const row of s.grid) {
      assert.equal(row.length, 24, `${key} row width`);
      for (const ch of row) {
        if (ch === '.') continue;
        assert.ok(s.pal[ch], `${key} missing palette '${ch}'`);
        if (s.shiny) assert.ok(s.shiny[ch], `${key} missing shiny palette '${ch}'`);
      }
    }
  }
});

test('every species and monster references an existing sprite; familiars have shiny palettes', async () => {
  const { MONSTERS } = await import('../js/data.js');
  for (const sp of SPECIES) {
    assert.ok(SPRITES[sp.sprite], sp.id);
    assert.ok(SPRITES[sp.sprite].shiny, `${sp.id} needs a shiny palette`);
  }
  for (const m of Object.values(MONSTERS)) assert.ok(SPRITES[m.sprite], m.sprite);
  assert.ok(SPRITES.egg);
});
