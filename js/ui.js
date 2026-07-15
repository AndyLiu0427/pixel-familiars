// DOM UI v2: tabs (team / eggs / book / gear / upgrades / settings), modals,
// toasts. Dynamic values always go through textContent.

import { CONFIG } from './config.js';
import { t, tn, getLang, setLang } from './i18n.js';
import {
  RARITY, SPECIES, UPGRADES, upgradeCost, xpForLevel, STAGE_LEVELS, zoneData,
  STAR_COSTS, MAX_STARS, levelCap, BOOK_MILESTONES, GEAR_SLOTS, GEAR_RARITY,
  GEAR_CAP, FORGE_MAX, forgeCost, gearStat,
} from './data.js';
import {
  TEAM_SIZE, petAtk, petHp, petStage, speciesById, bookEntries, bookMult,
  computeOffline, applyOffline,
} from './game.js';
import { spriteToCanvas, spriteToSilhouette } from './sprites.js';
import { fmt } from './battle.js';
import { showRewarded } from './ads.js';
import { saveState, clearSave, exportString, importString } from './save.js';

const $ = sel => document.querySelector(sel);
const TABS = ['team', 'eggs', 'book', 'gear', 'upgrades', 'settings'];

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function stars(n) { return '★'.repeat(n) + '☆'.repeat(MAX_STARS - n); }

export class UI {
  constructor(game) {
    this.game = game;
    this.activeTab = 'team';
    this.deferredInstall = null;

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredInstall = e;
      if (this.activeTab === 'settings') this.renderPanel();
    });

    this.drawLogo();
    this.buildTabs();
    this.bindGameEvents();
    this.bindBattleButtons();
    this.renderPanel();
    this.refreshHeader();
  }

  drawLogo() {
    const cv = $('#logoCanvas');
    cv.width = 72; cv.height = 72;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 72, 72);
    import('./sprites.js').then(({ drawSprite }) => drawSprite(ctx, 'emberfox', 0, 0, 3));
  }

  refreshHeader() {
    const st = this.game.state;
    setText('#goldVal', fmt(st.gold));
    setText('#gemVal', fmt(st.gems));
    setText('#zoneLabel', `${t('zone')} ${st.zone + 1} · ${tn(zoneData(st.zone))}`);
    setText('#waveLabel', this.game.isBossWave() ? t('boss_wave') : t('wave', { n: st.wave }));
    setText('#titleText', t('title'));
    document.title = getLang() === 'en' ? 'Pixel Familiars' : `${t('title')} Pixel Familiars`;
    document.body.classList.toggle('golden', st.book.claimed.includes(3));
  }

  bump(sel) {
    const n = $(sel);
    n.classList.remove('bump');
    void n.offsetWidth;
    n.classList.add('bump');
  }

  // ---------- Battle overlays ----------

  bindBattleButtons() {
    const boost = $('#boostBtn');
    boost.textContent = t('boost_btn');
    boost.addEventListener('click', async () => {
      boost.disabled = true;
      const ok = await showRewarded('hunt_boost');
      boost.disabled = false;
      if (ok) this.game.startBoost();
    });
    const retry = $('#bossRetry');
    retry.textContent = t('boss_wave');
    retry.addEventListener('click', () => {
      this.game.retryBoss();
      retry.hidden = true;
    });
  }

  bindBattleButtonsText() {
    $('#boostBtn').textContent = t('boost_btn');
    $('#bossRetry').textContent = t('boss_wave');
  }

  refreshBattleOverlays() {
    const g = this.game;
    const hpFrac = Math.max(0, g.teamHp / g.teamMaxHp());
    $('#teamHpFill').style.width = `${hpFrac * 100}%`;
    setText('#dpsLabel', `${t('dps')} ${fmt(g.teamDps())}`);

    const bossTimer = $('#bossTimer');
    const m = g.monster;
    if (m && m.isBoss && isFinite(m.timeLeft)) {
      bossTimer.hidden = false;
      bossTimer.textContent = t('boss_in', { n: Math.ceil(m.timeLeft) });
    } else {
      bossTimer.hidden = true;
    }
    $('#bossRetry').hidden = !g.bossPending;

    const chip = $('#boostChip');
    const left = g.state.boostUntil - Date.now();
    if (left > 0) {
      chip.hidden = false;
      chip.textContent = t('boost_active', { t: clock(left) });
      $('#boostBtn').hidden = true;
    } else {
      chip.hidden = true;
      $('#boostBtn').hidden = false;
    }
  }

  // ---------- Game events ----------

  bindGameEvents() {
    const g = this.game;
    g.on('kill', ({ monster, drop }) => {
      this.refreshHeader();
      this.bump('#goldVal');
      if (monster.isBoss) this.toast(t('boss_defeated'), 'gold');
      if (drop && drop.rarity >= 2) this.toast(`${t('gear_dropped')} ${t('rarity_gear')[drop.rarity]}`, 'gold');
    });
    g.on('gems', () => this.bump('#gemVal'));
    g.on('zone_advance', z => { this.toast(t('zone_cleared', { name: tn(z) }), 'gold'); this.refreshHeader(); });
    g.on('wipe', () => this.toast(t('team_wiped')));
    g.on('evolve', ({ speciesId, pet }) => {
      this.toast(`${tn(speciesById(speciesId))} → ${t('stage_names')[petStage(pet)]}`, 'gold');
      if (this.activeTab === 'team') this.renderPanel();
    });
    g.on('levelup', () => { if (this.activeTab === 'team') this.softRefreshTeam(); });
    g.on('milestone', ms => {
      const key = { gems: 'ms_gems', egg: 'ms_egg', secret: 'ms_secret', frame: 'ms_frame' }[ms.reward];
      this.toast(`${t('milestone_reached')} ${t(key, { at: ms.at, n: ms.amount ?? '' })}`, 'gold');
      this.refreshHeader();
    });
    g.on('starup', () => { if (this.activeTab === 'team') this.renderPanel(); });
  }

  // ---------- Tabs ----------

  buildTabs() {
    const tabs = $('#tabs');
    tabs.replaceChildren();
    for (const key of TABS) {
      const b = el('button', 'tab', t(`tab_${key}`));
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(key === this.activeTab));
      b.dataset.tab = key;
      b.addEventListener('click', () => {
        this.activeTab = key;
        for (const other of tabs.children) other.setAttribute('aria-selected', String(other === b));
        this.renderPanel();
      });
      tabs.appendChild(b);
    }
  }

  renderPanel() {
    const c = $('#panelContent');
    c.replaceChildren();
    c.classList.remove('entering');
    void c.offsetWidth;
    c.classList.add('entering');
    ({
      team: () => this.renderTeam(c),
      eggs: () => this.renderEggs(c),
      book: () => this.renderBook(c),
      gear: () => this.renderGear(c),
      upgrades: () => this.renderUpgrades(c),
      settings: () => this.renderSettings(c),
    })[this.activeTab]();
  }

  // ---------- Team ----------

  renderTeam(c) {
    const st = this.game.state;
    const { revealed } = bookEntries(st);
    c.appendChild(el('div', 'section-note',
      `${t('collection', { a: revealed, b: SPECIES.length * 2 })} · ${t('about_offline')}`));
    const ids = Object.keys(st.pets).sort((a, b) => {
      const ta = st.team.includes(a) ? 0 : 1;
      const tb = st.team.includes(b) ? 0 : 1;
      return ta - tb || st.pets[b].rarity - st.pets[a].rarity || st.pets[b].level - st.pets[a].level;
    });
    for (const id of ids) c.appendChild(this.petCard(id));
  }

  petCard(id) {
    const st = this.game.state;
    const pet = st.pets[id];
    const sp = speciesById(id);
    const onTeam = st.team.includes(id);
    const card = el('div', `card${onTeam ? ' on-team' : ''}`);
    card.dataset.petId = id;

    const box = el('div', 'sprite-box');
    box.appendChild(spriteToCanvas(sp.sprite, 2, { shiny: pet.shiny }));
    card.appendChild(box);

    const body = el('div', 'card-body');
    const title = el('div', 'card-title');
    title.appendChild(el('span', null, tn(sp)));
    const rar = el('span', 'rarity-tag', t('rarity_names')[pet.rarity]);
    rar.style.color = RARITY[pet.rarity].color;
    title.appendChild(rar);
    if (pet.shiny) title.appendChild(el('span', 'shiny-tag', t('shiny')));
    body.appendChild(title);

    const starRow = el('div', 'star-row', stars(pet.stars));
    body.appendChild(starRow);

    body.appendChild(el('div', 'card-sub',
      `${t('level_short', { n: pet.level })}/${Math.max(levelCap(pet.stars), pet.level)} · ${t('stage_names')[petStage(pet)]} · ${t('atk')} ${fmt(petAtk(st, id))} · ${t('hp')} ${fmt(petHp(st, id))}`));

    const bar = el('div', 'xp-bar');
    const fill = el('div', 'xp-fill');
    fill.style.width = `${Math.min(100, (pet.xp / xpForLevel(pet.level)) * 100)}%`;
    bar.appendChild(fill);
    body.appendChild(bar);
    card.appendChild(body);

    const actions = el('div', 'card-actions');

    if (pet.stars < MAX_STARS) {
      const have = st.shards[id] ?? 0;
      const need = STAR_COSTS[pet.stars];
      const starBtn = el('button', 'btn btn-sm btn-accent', t('star_up_cost', { a: fmt(have), b: need }));
      starBtn.disabled = have < need;
      starBtn.addEventListener('click', () => { this.game.starUp(id); });
      actions.appendChild(starBtn);
    } else {
      actions.appendChild(el('span', 'card-sub', t('max_stars')));
    }

    const btn = el('button', 'btn btn-sm', onTeam ? t('rest') : t('deploy'));
    btn.disabled = onTeam && st.team.length === 1;
    btn.addEventListener('click', () => {
      if (onTeam) this.game.setTeam(st.team.filter(x => x !== id));
      else if (st.team.length >= TEAM_SIZE) { this.toast(t('team_full')); return; }
      else this.game.setTeam([...st.team, id]);
      this.renderPanel();
    });
    actions.appendChild(btn);
    card.appendChild(actions);
    return card;
  }

  softRefreshTeam() {
    const st = this.game.state;
    for (const card of document.querySelectorAll('#panelContent .card[data-pet-id]')) {
      const id = card.dataset.petId;
      const pet = st.pets[id];
      if (!pet) continue;
      const sub = card.querySelector('.card-sub');
      if (sub) sub.textContent =
        `${t('level_short', { n: pet.level })}/${Math.max(levelCap(pet.stars), pet.level)} · ${t('stage_names')[petStage(pet)]} · ${t('atk')} ${fmt(petAtk(st, id))} · ${t('hp')} ${fmt(petHp(st, id))}`;
      const fill = card.querySelector('.xp-fill');
      if (fill) fill.style.width = `${Math.min(100, (pet.xp / xpForLevel(pet.level)) * 100)}%`;
    }
  }

  // ---------- Eggs ----------

  renderEggs(c) {
    const st = this.game.state;
    const hero = el('div', 'egg-hero wob');
    hero.appendChild(spriteToCanvas('egg', 4));
    const actions = el('div', 'egg-actions');

    const hatch = el('button', 'btn btn-gold', `${t('egg_hatch')} · ${t('egg_cost', { n: CONFIG.eggCostGems })}`);
    hatch.addEventListener('click', () => {
      const result = this.game.hatchEgg();
      if (!result) { this.toast(t('egg_not_enough')); return; }
      this.refreshHeader();
      this.renderPanel();
      this.hatchModal(result);
    });
    actions.appendChild(hatch);

    const freeLeft = CONFIG.freeEggCooldownMs - (Date.now() - st.lastFreeEgg);
    const free = el('button', 'btn btn-ad', freeLeft > 0 ? `${t('egg_free_ad')} (${clock(freeLeft)})` : t('egg_free_ad'));
    free.disabled = freeLeft > 0;
    free.addEventListener('click', async () => {
      free.disabled = true;
      const ok = await showRewarded('free_egg');
      if (!ok) { free.disabled = false; return; }
      st.lastFreeEgg = Date.now();
      const result = this.game.hatchEgg({ free: true });
      this.refreshHeader();
      this.renderPanel();
      this.hatchModal(result);
    });
    actions.appendChild(free);

    const gemAd = el('button', 'btn btn-ad', t('gem_ad_btn', { n: CONFIG.adGemReward }));
    gemAd.addEventListener('click', async () => {
      gemAd.disabled = true;
      const ok = await showRewarded('gems');
      gemAd.disabled = false;
      if (ok) {
        st.gems += CONFIG.adGemReward;
        this.refreshHeader();
        this.bump('#gemVal');
      }
    });
    actions.appendChild(gemAd);

    hero.appendChild(actions);
    c.appendChild(hero);

    c.appendChild(el('div', 'section-note', t('pity_hint', { n: Math.max(1, 40 - st.pity) })));
    c.appendChild(el('div', 'section-note',
      RARITY.map((r, i) => `${t('rarity_names')[i]} ${r.weight}%`).join(' · ')));
  }

  hatchModal(result) {
    const sp = speciesById(result.speciesId);
    const { scrim, modal } = this.modal();
    modal.appendChild(el('h2', null, result.isNew ? t('hatched', { name: tn(sp) }) : tn(sp)));
    const reveal = el('div', 'hatch-reveal');
    reveal.appendChild(spriteToCanvas(sp.sprite, 5, { shiny: result.shiny || this.game.state.pets[result.speciesId]?.shiny }));
    const name = el('div', 'hatch-name', tn(sp));
    name.style.color = RARITY[result.rarity].color;
    reveal.appendChild(name);
    reveal.appendChild(el('div', 'card-sub', t('rarity_names')[result.rarity]));
    if (result.shiny) reveal.appendChild(el('div', 'shiny-tag', t('shiny_hatched')));
    if (!result.isNew) {
      if (result.rarityUp) reveal.appendChild(el('div', 'card-sub gold-text', t('rarity_up')));
      if (result.shards > 0) reveal.appendChild(el('div', 'card-sub', t('got_shards', { n: result.shards })));
      if (result.gems > 0) reveal.appendChild(el('div', 'card-sub', `+${result.gems} ${t('gems')}`));
    }
    modal.appendChild(reveal);
    const actions = el('div', 'modal-actions');
    const ok = el('button', 'btn btn-gold', t('claim'));
    ok.addEventListener('click', () => scrim.remove());
    actions.appendChild(ok);
    modal.appendChild(actions);
    ok.focus();
  }

  // ---------- Collection book ----------

  renderBook(c) {
    const st = this.game.state;
    const { revealed } = bookEntries(st);
    const total = SPECIES.length * 2;

    const head = el('div', 'book-head');
    head.appendChild(el('h2', null, t('book_title')));
    head.appendChild(el('div', 'section-note', t('book_progress', { a: revealed, b: total })));
    head.appendChild(el('div', 'book-bonus', t('book_bonus', { n: Math.round((bookMult(st) - 1) * 100) })));
    c.appendChild(head);

    // Milestones
    const msBox = el('div', 'ms-list');
    BOOK_MILESTONES.forEach((ms, i) => {
      const key = { gems: 'ms_gems', egg: 'ms_egg', secret: 'ms_secret', frame: 'ms_frame' }[ms.reward];
      const row = el('div', `ms-row${st.book.claimed.includes(i) ? ' done' : ''}`);
      row.appendChild(el('span', null, t(key, { at: ms.at, n: ms.amount ?? '' })));
      row.appendChild(el('span', 'ms-state', st.book.claimed.includes(i) ? t('claimed') : `${revealed}/${ms.at}`));
      msBox.appendChild(row);
    });
    c.appendChild(msBox);

    // Entries grid: normal + shiny per species
    const grid = el('div', 'book-grid');
    for (const sp of SPECIES) {
      const pet = st.pets[sp.id];
      grid.appendChild(this.bookEntry(sp, pet, false, !!pet));
      grid.appendChild(this.bookEntry(sp, pet, true, st.book.shinySeen.includes(sp.id)));
    }
    c.appendChild(grid);
  }

  bookEntry(sp, pet, shiny, unlocked) {
    const cell = el('div', `book-cell${unlocked ? '' : ' locked'}${shiny ? ' shiny-cell' : ''}`);
    const box = el('div', 'sprite-box');
    box.appendChild(unlocked ? spriteToCanvas(sp.sprite, 2, { shiny }) : spriteToSilhouette(sp.sprite, 2));
    cell.appendChild(box);
    const label = unlocked ? tn(sp) + (shiny ? ' ✨' : '') : t('book_locked');
    cell.appendChild(el('div', 'book-name', label));
    if (!shiny && pet && pet.stars >= MAX_STARS) cell.appendChild(el('div', 'book-mastered', t('book_mastered')));
    return cell;
  }

  // ---------- Gear ----------

  renderGear(c) {
    const st = this.game.state;
    const g = this.game;

    const head = el('div', 'gear-head');
    head.appendChild(el('div', 'section-note',
      `${t('dust')} ${fmt(st.dust)} · ${t('inventory', { a: st.items.length, b: GEAR_CAP })}`));
    const btns = el('div', 'gear-actions');
    const best = el('button', 'btn btn-gold', t('equip_best'));
    best.addEventListener('click', () => { g.equipBest(); this.renderPanel(); });
    btns.appendChild(best);
    const salv = el('button', 'btn', t('salvage'));
    salv.addEventListener('click', () => {
      const { dust, count } = g.salvageBelowEpic();
      this.toast(t('salvaged', { c: count, d: dust }));
      this.renderPanel();
    });
    btns.appendChild(salv);
    head.appendChild(btns);
    c.appendChild(head);

    // Equipped per team pet
    for (const id of g.activeTeam()) {
      const pet = st.pets[id];
      const card = el('div', 'card');
      const box = el('div', 'sprite-box');
      box.appendChild(spriteToCanvas(speciesById(id).sprite, 2, { shiny: pet.shiny }));
      card.appendChild(box);
      const body = el('div', 'card-body');
      body.appendChild(el('div', 'card-title', tn(speciesById(id))));
      for (const slot of GEAR_SLOTS) {
        const itemId = pet.equip?.[slot];
        const item = st.items.find(it => it.id === itemId);
        const row = el('div', 'gear-row');
        row.appendChild(el('span', 'gear-slot', t(`gear_${slot}`)));
        if (item) {
          const label = el('span', 'gear-stat', gearLabel(item));
          label.style.color = GEAR_RARITY[item.rarity].color;
          row.appendChild(label);
          if (item.forge < FORGE_MAX) {
            const fb = el('button', 'btn btn-sm', `${t('forge', { n: item.forge })} · ${fmt(forgeCost(item.forge))}`);
            fb.disabled = st.dust < forgeCost(item.forge);
            fb.addEventListener('click', () => { if (g.forgeItem(item.id)) this.renderPanel(); });
            row.appendChild(fb);
          } else {
            row.appendChild(el('span', 'card-sub', t('forge_max')));
          }
        } else {
          row.appendChild(el('span', 'card-sub', '·'));
        }
        body.appendChild(row);
      }
      card.appendChild(body);
      c.appendChild(card);
    }

    // Loose inventory summary (top 10 by stat)
    const equipped = g.equippedIds();
    const loose = st.items.filter(it => !equipped.has(it.id))
      .sort((a, b) => b.rarity - a.rarity || gearStat(b) - gearStat(a))
      .slice(0, 10);
    if (loose.length) {
      const inv = el('div', 'ms-list');
      for (const item of loose) {
        const row = el('div', 'ms-row');
        const label = el('span', null, `${t(`gear_${item.slot}`)} · ${gearLabel(item)}`);
        label.style.color = GEAR_RARITY[item.rarity].color;
        row.appendChild(label);
        row.appendChild(el('span', 'ms-state', t('gear_from_zone', { n: item.zone + 1 })));
        inv.appendChild(row);
      }
      c.appendChild(inv);
    }
  }

  // ---------- Upgrades ----------

  renderUpgrades(c) {
    const st = this.game.state;
    for (const up of UPGRADES) {
      const card = el('div', 'card');
      const row = el('div', 'up-row');
      row.style.flex = '1';
      const info = el('div', 'up-info');
      const title = el('div', 'card-title');
      title.appendChild(el('span', null, t(`upgrade_${up.id}`)));
      title.appendChild(el('span', 'up-lvl', t('level', { n: st.upgrades[up.id] })));
      info.appendChild(title);
      info.appendChild(el('div', 'card-sub', t(`upgrade_${up.id}_desc`)));
      row.appendChild(info);
      const maxed = st.upgrades[up.id] >= up.maxLevel;
      const cost = maxed ? 0 : upgradeCost(up, st.upgrades[up.id]);
      const btn = el('button', 'btn btn-sm btn-gold', maxed ? 'MAX' : `${t('upgrade_buy')} ${fmt(cost)}`);
      btn.disabled = maxed || st.gold < cost;
      btn.dataset.upId = up.id;
      btn.addEventListener('click', () => {
        if (this.game.buyUpgrade(up.id)) {
          this.refreshHeader();
          this.renderPanel();
        }
      });
      row.appendChild(btn);
      card.appendChild(row);
      c.appendChild(card);
    }
  }

  refreshUpgradeButtons() {
    if (this.activeTab !== 'upgrades') return;
    const st = this.game.state;
    for (const btn of document.querySelectorAll('#panelContent [data-up-id]')) {
      const up = UPGRADES.find(u => u.id === btn.dataset.upId);
      const maxed = st.upgrades[up.id] >= up.maxLevel;
      if (!maxed) btn.disabled = st.gold < upgradeCost(up, st.upgrades[up.id]);
    }
  }

  // ---------- Settings ----------

  renderSettings(c) {
    const st = this.game.state;

    const langGroup = el('div', 'settings-group');
    langGroup.appendChild(el('h3', null, t('settings_lang')));
    const langRow = el('div', 'lang-row');
    for (const [code, label] of [['zh-TW', '繁體中文'], ['en', 'English']]) {
      const b = el('button', `btn${getLang() === code ? ' active' : ''}`, label);
      b.addEventListener('click', () => {
        setLang(code);
        st.settings.lang = code;
        this.buildTabs();
        this.bindBattleButtonsText();
        this.renderPanel();
        this.refreshHeader();
      });
      langRow.appendChild(b);
    }
    langGroup.appendChild(langRow);
    c.appendChild(langGroup);

    if (this.deferredInstall) {
      const inst = el('div', 'settings-group');
      inst.appendChild(el('h3', null, t('settings_install')));
      inst.appendChild(el('p', 'section-note', t('settings_install_hint')));
      const b = el('button', 'btn btn-accent', t('settings_install'));
      b.addEventListener('click', async () => {
        this.deferredInstall.prompt();
        await this.deferredInstall.userChoice;
        this.deferredInstall = null;
        this.renderPanel();
      });
      inst.appendChild(b);
      c.appendChild(inst);
    }

    const saveGroup = el('div', 'settings-group');
    saveGroup.appendChild(el('h3', null, 'SAVE'));
    const exp = el('button', 'btn', t('settings_export'));
    exp.addEventListener('click', async () => {
      const str = exportString(st);
      try { await navigator.clipboard.writeText(str); this.toast(t('export_copied')); }
      catch { window.prompt(t('settings_export'), str); }
    });
    saveGroup.appendChild(exp);

    const imp = el('button', 'btn', t('settings_import'));
    imp.addEventListener('click', () => {
      const str = window.prompt(t('import_prompt'));
      if (!str) return;
      const loaded = importString(str);
      if (!loaded) { this.toast(t('import_bad')); return; }
      saveState(loaded);
      location.reload();
    });
    saveGroup.appendChild(imp);

    const reset = el('button', 'btn btn-danger', t('settings_reset'));
    reset.addEventListener('click', () => {
      if (!window.confirm(t('settings_reset_confirm'))) return;
      clearSave();
      location.reload();
    });
    saveGroup.appendChild(reset);
    c.appendChild(saveGroup);

    const stats = el('div', 'settings-group');
    stats.appendChild(el('h3', null, 'STATS'));
    stats.appendChild(el('p', 'section-note',
      `${t('kills')} ${fmt(st.stats.kills)} · Boss ${fmt(st.stats.bossKills)} · ${t('tab_eggs')} ${fmt(st.stats.eggs)} · ${t('daily_streak', { n: st.daily.streak })}`));
    c.appendChild(stats);
  }

  // ---------- Welcome back / daily ----------

  showWelcomeBack(result) {
    const { scrim, modal } = this.modal();
    modal.appendChild(el('h2', null, t('welcome_back')));
    modal.appendChild(el('p', 'modal-sub', t('away_for', { t: clock(result.cappedMs) })));
    for (const [label, val] of [
      [t('offline_gold'), fmt(result.gold)],
      [t('offline_xp'), fmt(result.xp)],
      [t('offline_kills'), fmt(result.kills)],
    ]) {
      const row = el('div', 'stat-row');
      row.appendChild(el('span', null, label));
      row.appendChild(el('b', null, val));
      modal.appendChild(row);
    }
    const actions = el('div', 'modal-actions');
    const dbl = el('button', 'btn btn-ad', t('claim_double'));
    dbl.addEventListener('click', async () => {
      dbl.disabled = true;
      const ok = await showRewarded('offline_double');
      applyOffline(this.game, result, ok ? 2 : 1);
      this.refreshHeader();
      scrim.remove();
    });
    actions.appendChild(dbl);
    const claim = el('button', 'btn', t('claim'));
    claim.addEventListener('click', () => {
      applyOffline(this.game, result, 1);
      this.refreshHeader();
      scrim.remove();
    });
    actions.appendChild(claim);
    modal.appendChild(actions);
    dbl.focus();
  }

  showDaily(result) {
    const { scrim, modal } = this.modal();
    modal.appendChild(el('h2', null, t('daily_title')));
    modal.appendChild(el('p', 'modal-sub', `${t('daily_day', { n: result.day })} · ${t('daily_streak', { n: result.streak })}`));
    const reveal = el('div', 'hatch-reveal');
    if (result.type === 'gold') reveal.appendChild(el('div', 'hatch-name gold-text', t('daily_gold', { n: fmt(result.amount) })));
    if (result.type === 'gems') reveal.appendChild(el('div', 'hatch-name teal-text', t('daily_gems', { n: result.amount })));
    if (result.type === 'egg') reveal.appendChild(el('div', 'hatch-name', t('daily_egg')));
    modal.appendChild(reveal);
    const actions = el('div', 'modal-actions');
    const ok = el('button', 'btn btn-gold', t('claim'));
    ok.addEventListener('click', () => {
      scrim.remove();
      if (result.hatch) this.hatchModal(result.hatch);
    });
    actions.appendChild(ok);
    modal.appendChild(actions);
    ok.focus();
    this.refreshHeader();
  }

  // ---------- Primitives ----------

  modal() {
    const scrim = el('div', 'modal-scrim');
    const modal = el('div', 'modal');
    scrim.appendChild(modal);
    $('#modalRoot').appendChild(scrim);
    return { scrim, modal };
  }

  toast(msg, kind = '') {
    const box = $('#toasts');
    const n = el('div', `toast ${kind}`, msg);
    box.appendChild(n);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => {
      n.classList.add('leaving');
      setTimeout(() => n.remove(), 220);
    }, 2600);
  }
}

function gearLabel(item) {
  if (item.slot === 'weapon') return t('gear_atk', { n: fmt(gearStat(item)) });
  if (item.slot === 'armor') return t('gear_hp', { n: fmt(gearStat(item)) });
  return t(`gear_sub_${item.sub}`, { n: Math.round(gearStat(item) * 100) });
}

function setText(sel, text) {
  const n = document.querySelector(sel);
  if (n && n.textContent !== text) n.textContent = text;
}

function clock(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
