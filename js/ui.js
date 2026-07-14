// DOM UI: header, tabs, panels, modals, toasts. All dynamic values are set
// with textContent; only trusted static i18n strings go through innerHTML-free
// element builders below.

import { CONFIG } from './config.js';
import { t, tn, getLang, setLang } from './i18n.js';
import { RARITY, SPECIES, UPGRADES, upgradeCost, xpForLevel, STAGE_LEVELS, zoneData } from './data.js';
import { TEAM_SIZE, famAtk, famHp, famStage, speciesById, computeOffline, applyOffline } from './game.js';
import { spriteToCanvas, drawSprite } from './sprites.js';
import { fmt } from './battle.js';
import { showRewarded } from './ads.js';
import { saveState, clearSave, exportString, importString } from './save.js';

const $ = sel => document.querySelector(sel);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

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
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 64, 64);
    drawSprite(ctx, 'emberfox', 0, 0, 4);
  }

  // ---------- Header ----------

  refreshHeader() {
    const st = this.game.state;
    setText('#goldVal', fmt(st.gold));
    setText('#gemVal', fmt(st.gems));
    setText('#zoneLabel', `${t('zone')} ${st.zone + 1} · ${tn(zoneData(st.zone))}`);
    setText('#waveLabel', this.game.isBossWave() ? t('boss_wave') : t('wave', { n: st.wave }));
    setText('#titleText', t('title'));
    document.title = getLang() === 'en' ? 'Pixel Familiars' : `${t('title')} Pixel Familiars`;
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
    g.on('kill', () => { this.refreshHeader(); this.bump('#goldVal'); });
    g.on('gems', () => this.bump('#gemVal'));
    g.on('zone_advance', z => { this.toast(t('zone_cleared', { name: tn(z) }), 'gold'); this.refreshHeader(); });
    g.on('kill', ({ monster }) => { if (monster.isBoss) this.toast(t('boss_defeated'), 'gold'); });
    g.on('wipe', () => this.toast(t('team_wiped')));
    g.on('evolve', fam => {
      this.toast(`${tn(speciesById(fam.speciesId))} → ${t('stage_names')[famStage(fam)]}`, 'gold');
      if (this.activeTab === 'team') this.renderPanel();
    });
    g.on('levelup', () => { if (this.activeTab === 'team') this.softRefreshTeam(); });
  }

  // ---------- Tabs ----------

  buildTabs() {
    const tabs = $('#tabs');
    tabs.replaceChildren();
    for (const key of ['team', 'eggs', 'upgrades', 'settings']) {
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
    if (this.activeTab === 'team') this.renderTeam(c);
    else if (this.activeTab === 'eggs') this.renderEggs(c);
    else if (this.activeTab === 'upgrades') this.renderUpgrades(c);
    else this.renderSettings(c);
  }

  // ---------- Team ----------

  renderTeam(c) {
    const st = this.game.state;
    c.appendChild(el('div', 'section-note', `${t('collection', { a: st.seenSpecies.length, b: SPECIES.length })} · ${t('about_offline')}`));
    const sorted = [...st.familiars].sort((a, b) => {
      const ta = st.team.includes(a.id) ? 0 : 1;
      const tb = st.team.includes(b.id) ? 0 : 1;
      return ta - tb || b.rarity - a.rarity || b.level - a.level;
    });
    for (const fam of sorted) c.appendChild(this.famCard(fam));
  }

  famCard(fam) {
    const st = this.game.state;
    const sp = speciesById(fam.speciesId);
    const onTeam = st.team.includes(fam.id);
    const card = el('div', `card${onTeam ? ' on-team' : ''}`);
    card.dataset.famId = fam.id;

    const box = el('div', 'sprite-box');
    box.appendChild(spriteToCanvas(sp.sprite, 3, { brighten: famStage(fam) * 0.05 }));
    card.appendChild(box);

    const body = el('div', 'card-body');
    const title = el('div', 'card-title');
    title.appendChild(el('span', null, tn(sp)));
    const rar = el('span', 'rarity-tag', t('rarity_names')[fam.rarity]);
    rar.style.color = RARITY[fam.rarity].color;
    title.appendChild(rar);
    body.appendChild(title);

    const stage = famStage(fam);
    const nextEvo = stage < STAGE_LEVELS.length ? t('evolve_at', { n: STAGE_LEVELS[stage] }) : t('max_stage');
    body.appendChild(el('div', 'card-sub',
      `${t('level_short', { n: fam.level })} · ${t('stage_names')[stage]} · ${t('atk')} ${fmt(famAtk(fam, st.upgrades))} · ${t('hp')} ${fmt(famHp(fam, st.upgrades))}`));
    body.appendChild(el('div', 'card-sub', nextEvo));

    const bar = el('div', 'xp-bar');
    const fill = el('div', 'xp-fill');
    fill.style.width = `${Math.min(100, (fam.xp / xpForLevel(fam.level)) * 100)}%`;
    bar.appendChild(fill);
    body.appendChild(bar);
    card.appendChild(body);

    const actions = el('div', 'card-actions');
    const btn = el('button', 'btn btn-sm', onTeam ? t('rest') : t('deploy'));
    btn.disabled = onTeam && st.team.length === 1;
    btn.addEventListener('click', () => {
      if (onTeam) {
        this.game.setTeam(st.team.filter(id => id !== fam.id));
      } else if (st.team.length >= TEAM_SIZE) {
        this.toast(t('team_full'));
        return;
      } else {
        this.game.setTeam([...st.team, fam.id]);
      }
      this.renderPanel();
    });
    actions.appendChild(btn);
    card.appendChild(actions);
    return card;
  }

  softRefreshTeam() {
    // Update level/xp text in place without rebuilding (avoids animation spam)
    const st = this.game.state;
    for (const card of document.querySelectorAll('#panelContent .card[data-fam-id]')) {
      const fam = st.familiars.find(f => f.id === Number(card.dataset.famId));
      if (!fam) continue;
      const subs = card.querySelectorAll('.card-sub');
      if (subs[0]) subs[0].textContent =
        `${t('level_short', { n: fam.level })} · ${t('stage_names')[famStage(fam)]} · ${t('atk')} ${fmt(famAtk(fam, st.upgrades))} · ${t('hp')} ${fmt(famHp(fam, st.upgrades))}`;
      const fill = card.querySelector('.xp-fill');
      if (fill) fill.style.width = `${Math.min(100, (fam.xp / xpForLevel(fam.level)) * 100)}%`;
    }
  }

  // ---------- Eggs ----------

  renderEggs(c) {
    const st = this.game.state;
    const hero = el('div', 'egg-hero wob');
    hero.appendChild(spriteToCanvas('egg', 5));
    const actions = el('div', 'egg-actions');

    const hatch = el('button', 'btn btn-gold', `${t('egg_hatch')} · ${t('egg_cost', { n: CONFIG.eggCostGems })}`);
    hatch.addEventListener('click', () => {
      const fam = this.game.hatchEgg();
      if (!fam) { this.toast(t('egg_not_enough')); return; }
      this.refreshHeader();
      this.hatchModal(fam);
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
      const fam = this.game.hatchEgg({ free: true });
      this.refreshHeader();
      this.renderPanel();
      this.hatchModal(fam);
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

    // Odds table
    const note = el('div', 'section-note',
      RARITY.map((r, i) => `${t('rarity_names')[i]} ${r.weight}%`).join(' · '));
    c.appendChild(note);
  }

  hatchModal(fam) {
    const sp = speciesById(fam.speciesId);
    const { scrim, modal } = this.modal();
    modal.appendChild(el('h2', null, t('hatched', { name: tn(sp) })));
    const reveal = el('div', 'hatch-reveal');
    reveal.appendChild(spriteToCanvas(sp.sprite, 6));
    const name = el('div', 'hatch-name', tn(sp));
    name.style.color = RARITY[fam.rarity].color;
    reveal.appendChild(name);
    reveal.appendChild(el('div', 'card-sub', t('rarity_names')[fam.rarity]));
    modal.appendChild(reveal);
    const actions = el('div', 'modal-actions');
    const ok = el('button', 'btn btn-gold', t('claim'));
    ok.addEventListener('click', () => scrim.remove());
    actions.appendChild(ok);
    modal.appendChild(actions);
    ok.focus();
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
      `${t('kills')} ${fmt(st.stats.kills)} · Boss ${fmt(st.stats.bossKills)} · ${t('tab_eggs')} ${fmt(st.stats.eggs)}`));
    c.appendChild(stats);
  }

  bindBattleButtonsText() {
    $('#boostBtn').textContent = t('boost_btn');
    $('#bossRetry').textContent = t('boss_wave');
  }

  // ---------- Welcome back ----------

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

export { computeOffline };
