// Canvas battle scene v3: layered zone scenery (sky + celestial + clouds,
// far silhouettes, mid props, textured ground, foreground overlay), ambient
// particles per theme, fog band, vignette, slash FX, floating numbers.
// Everything is drawn procedurally: no image assets, crisp pixels only.

import { drawSprite, spriteSize } from './sprites.js';
import { ZONE_THEMES, zoneData } from './data.js';
import { speciesById, petStage } from './game.js';

const STAGE_GLOW = [null, 'rgba(255,255,255,0.10)', 'rgba(245,185,66,0.20)'];

// Per-theme scenery: celestial body, silhouette styles, ambient particle kind.
const SCENERY = {
  forest:  { moon: '#a4dddb', far: 'treeline',   mid: 'trees',    ambient: 'leaves',    fog: 'rgba(37,86,46,0.16)' },
  cave:    { moon: null,      far: 'stalactite', mid: 'crystals', ambient: 'motes',     fog: 'rgba(64,39,81,0.18)' },
  ruins:   { moon: '#c7cfcc', far: 'columns',    mid: 'columns',  ambient: 'motes',     fog: 'rgba(87,114,119,0.14)' },
  swamp:   { moon: '#a8ca58', far: 'deadtrees',  mid: 'reeds',    ambient: 'fireflies', fog: 'rgba(70,130,50,0.20)' },
  volcano: { moon: '#cf573c', far: 'peaks',      mid: 'rocks',    ambient: 'embers',    fog: 'rgba(165,48,48,0.16)' },
  ice:     { moon: '#a4dddb', far: 'peaks',      mid: 'shards',   ambient: 'snow',      fog: 'rgba(115,190,211,0.12)' },
  keep:    { moon: '#c65197', far: 'towers',     mid: 'banners',  ambient: 'wisps',     fog: 'rgba(122,54,123,0.16)' },
  astral:  { moon: '#73bed3', far: 'islands',    mid: 'shards',   ambient: 'sparkles',  fog: 'rgba(79,143,186,0.14)' },
};

// Deterministic pseudo-random from an integer (stable layouts per zone).
function rnd(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

export class BattleScene {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.time = 0;
    this.numbers = [];
    this.particles = [];   // burst particles (kills)
    this.ambient = [];     // looping ambient particles
    this.slashes = [];     // attack FX
    this.shake = 0;
    this.hitFlash = 0;
    this.dmgAccum = 0;
    this.dmgAccumT = 0;
    this.sceneZone = -1;

    game.on('hit', ({ dmg }) => { this.dmgAccum += dmg; });
    game.on('kill', ({ gold }) => {
      this.spawnKillBurst();
      this.pushNumber(`+${fmt(gold)}`, 'gold');
      this.hitFlash = 0;
    });
    game.on('boss_start', () => { this.shake = Math.max(this.shake, 6); });
    game.on('boss_fail', () => { this.shake = Math.max(this.shake, 4); });
    game.on('zone_advance', () => { this.shake = 10; this.spawnKillBurst(60); });
    game.on('wipe', () => { this.shake = 8; });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width;
    this.h = r.height;
    this.ctx.imageSmoothingEnabled = false;
    this.seedAmbient();
  }

  theme() { return ZONE_THEMES[zoneData(this.game.state.zone).theme]; }
  scenery() { return SCENERY[zoneData(this.game.state.zone).theme]; }
  groundY() { return this.h * 0.78; }
  monsterX() { return this.w * 0.72; }

  seedAmbient() {
    const kind = this.scenery().ambient;
    const n = kind === 'snow' ? 46 : kind === 'embers' ? 30 : 22;
    this.ambient = Array.from({ length: n }, (_, i) => ({
      x: rnd(i * 3 + 1) * (this.w || 300),
      y: rnd(i * 7 + 2) * (this.h || 200),
      sp: 0.4 + rnd(i * 13 + 3),
      ph: rnd(i * 17 + 4) * 6.28,
      size: rnd(i * 23 + 5) < 0.3 ? 3 : 2,
    }));
  }

  pushNumber(text, kind, x, y) {
    const jitter = (Math.random() - 0.5) * 30;
    this.numbers.push({
      text, kind,
      x: x ?? this.monsterX() + jitter,
      y: y ?? this.groundY() - 80 + (Math.random() - 0.5) * 16,
      vy: -46, life: 1,
    });
    if (this.numbers.length > 24) this.numbers.shift();
  }

  spawnKillBurst(n = 26) {
    const theme = this.theme();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      this.particles.push({
        x: this.monsterX(), y: this.groundY() - 40,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.6 + Math.random() * 0.5,
        color: Math.random() < 0.5 ? theme.accent : '#f5b942',
        size: 2 + Math.random() * 3,
      });
    }
  }

  spawnSlash() {
    const m = this.game.monster;
    if (!m) return;
    this.slashes.push({
      x: this.monsterX() + (Math.random() - 0.5) * 24,
      y: this.groundY() - 50 + (Math.random() - 0.5) * 28,
      t: 0,
      dir: Math.random() < 0.5 ? 1 : -1,
    });
    if (this.slashes.length > 6) this.slashes.shift();
  }

  frame(dt) {
    this.time += dt;
    const { ctx, w, h } = this;
    if (!w) return;
    const theme = this.theme();
    const sc = this.scenery();
    const g = this.game;
    const zone = g.state.zone;

    if (this.sceneZone !== zone) { this.sceneZone = zone; this.seedAmbient(); }

    this.dmgAccumT += dt;
    if (this.dmgAccumT >= 0.33 && this.dmgAccum > 0) {
      this.pushNumber(fmt(this.dmgAccum), 'dmg');
      this.hitFlash = 0.1;
      this.spawnSlash();
      this.dmgAccum = 0;
      this.dmgAccumT = 0;
    }

    ctx.save();
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 24);
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    // ---- Layer 1: sky ----
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.sky);
    sky.addColorStop(0.7, shade(theme.sky, 1.35));
    sky.addColorStop(1, theme.near);
    ctx.fillStyle = sky;
    ctx.fillRect(-12, -12, w + 24, h + 24);

    // Stars (twinkle)
    ctx.fillStyle = theme.accent;
    for (let i = 0; i < 40; i++) {
      const a = 0.10 + 0.22 * (0.5 + 0.5 * Math.sin(this.time * 1.4 + i * 1.7));
      ctx.globalAlpha = a;
      ctx.fillRect(Math.round(rnd(i + 60) * w), Math.round(rnd(i + 90) * h * 0.5), 2, 2);
    }
    ctx.globalAlpha = 1;

    // Celestial body with pixel-ring glow
    if (sc.moon) {
      const mx = w * 0.82, my = h * 0.16, r = Math.max(10, Math.min(w, h) * 0.045);
      ctx.globalAlpha = 0.08;
      drawPixelDisc(ctx, mx, my, r * 2.1, sc.moon);
      ctx.globalAlpha = 0.14;
      drawPixelDisc(ctx, mx, my, r * 1.5, sc.moon);
      ctx.globalAlpha = 0.85;
      drawPixelDisc(ctx, mx, my, r, sc.moon);
      ctx.globalAlpha = 0.5;
      drawPixelDisc(ctx, mx - r * 0.28, my - r * 0.22, r * 0.72, shade(sc.moon, 1.15));
      ctx.globalAlpha = 1;
    }

    // Clouds: 3 slow drifting pixel bands
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = shade(theme.far, 1.6);
    for (let i = 0; i < 3; i++) {
      const cw = w * (0.22 + rnd(i + 7) * 0.2);
      const cx = ((rnd(i + 3) * w + this.time * (4 + i * 2)) % (w + cw)) - cw;
      const cy = h * (0.10 + rnd(i + 11) * 0.22);
      ctx.fillRect(Math.round(cx), Math.round(cy), Math.round(cw), 6);
      ctx.fillRect(Math.round(cx + cw * 0.15), Math.round(cy - 5), Math.round(cw * 0.6), 5);
      ctx.fillRect(Math.round(cx + cw * 0.3), Math.round(cy + 6), Math.round(cw * 0.5), 4);
    }
    ctx.globalAlpha = 1;

    // ---- Layer 2a: farthest value band (lighter, recedes toward sky) ----
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.translate(w * 0.18, 14);
    this.drawFar(sc.far, theme, zone + 13);
    ctx.restore();

    // ---- Layer 2b: far silhouettes ----
    ctx.globalAlpha = 0.62;
    this.drawFar(sc.far, theme, zone);
    ctx.globalAlpha = 1;

    // Light shafts (forest/ruins/keep/astral moods)
    if (sc.moon && ['treeline', 'columns', 'towers', 'islands'].includes(sc.far)) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) {
        const pulse = 0.03 + 0.025 * (0.5 + 0.5 * Math.sin(this.time * 0.7 + i * 2.1));
        ctx.globalAlpha = pulse;
        const sx = w * (0.15 + i * 0.3);
        ctx.beginPath();
        ctx.moveTo(sx, -12);
        ctx.lineTo(sx + 46, -12);
        ctx.lineTo(sx - 30, this.groundY());
        ctx.lineTo(sx - 76, this.groundY());
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // ---- Layer 3: mid props ----
    this.drawMid(sc.mid, theme, zone);

    // ---- Layer 4: ground ----
    ctx.fillStyle = theme.ground;
    ctx.fillRect(-12, this.groundY(), w + 24, h - this.groundY() + 12);
    // Ground top edge highlight
    ctx.fillStyle = shade(theme.ground, 1.35);
    ctx.fillRect(-12, this.groundY(), w + 24, 3);
    // Texture speckles
    ctx.fillStyle = theme.near;
    for (let i = 0; i < Math.floor(w / 14); i++) {
      const x = rnd(i + zone * 31) * w;
      const y = this.groundY() + 10 + rnd(i + 17) * (h - this.groundY() - 14);
      ctx.fillRect(Math.round(x), Math.round(y), 5, 2);
    }
    ctx.fillStyle = shade(theme.ground, 1.2);
    for (let i = 0; i < Math.floor(w / 30); i++) {
      const x = rnd(i + zone * 57 + 5) * w;
      ctx.fillRect(Math.round(x), Math.round(this.groundY() + 6 + rnd(i + 4) * 10), 3, 2);
    }
    // Micro-accents: tiny flowers/crystals in the theme accent (DV3-style)
    for (let i = 0; i < Math.floor(w / 46); i++) {
      const x = rnd(i + zone * 97 + 23) * w;
      const y = this.groundY() + 8 + rnd(i + 41) * (h - this.groundY() - 16);
      ctx.fillStyle = shade(theme.accent, 0.75);
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      ctx.fillStyle = shade(theme.accent, 1.25);
      ctx.fillRect(Math.round(x), Math.round(y - 2), 2, 2);
    }

    // Fog band above ground
    const fog = ctx.createLinearGradient(0, this.groundY() - 34, 0, this.groundY() + 6);
    fog.addColorStop(0, 'rgba(0,0,0,0)');
    fog.addColorStop(1, sc.fog);
    ctx.fillStyle = fog;
    ctx.fillRect(-12, this.groundY() - 34, w + 24, 40);

    // ---- Actors ----
    this.drawTeam(dt);
    this.drawMonster(dt);

    // ---- FX ----
    this.drawSlashes(dt);
    this.drawParticles(dt);
    this.drawAmbient(dt, sc.ambient, theme);
    this.drawNumbers(dt);

    // ---- Layer 5: foreground tufts ----
    ctx.fillStyle = shade(theme.near, 0.8);
    for (let i = 0; i < Math.floor(w / 26); i++) {
      const x = rnd(i + zone * 71 + 9) * w;
      const hh = 5 + rnd(i + 2) * 8;
      const sway = Math.sin(this.time * 1.8 + i) * 1.5;
      const y = h - 2;
      ctx.fillRect(Math.round(x), Math.round(y - hh), 2, Math.round(hh));
      ctx.fillRect(Math.round(x + 3 + sway), Math.round(y - hh * 0.7), 2, Math.round(hh * 0.7));
      ctx.fillRect(Math.round(x - 3 + sway), Math.round(y - hh * 0.5), 2, Math.round(hh * 0.5));
    }

    // Scene hue tint: multiply toward the zone accent unifies every layer
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(-12, -12, w + 24, h + 24);
    ctx.restore();

    // Vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5,3,12,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(-12, -12, w + 24, h + 24);

    ctx.restore();
  }

  // ---- Far silhouette layer ----
  drawFar(kind, theme, zone) {
    const { ctx, w } = this;
    const base = this.groundY();
    ctx.fillStyle = theme.far;
    if (kind === 'treeline') {
      for (let x = -10; x < w + 10; x += 26) {
        const th = 40 + rnd(x + zone) * 55;
        ctx.fillRect(x + 10, base - th, 6, th);
        for (let l = 0; l < 4; l++) {
          const lw = 26 - l * 5;
          ctx.fillRect(x + 13 - lw / 2, base - th + l * 9 - 26, lw, 8);
        }
      }
    } else if (kind === 'stalactite') {
      for (let x = -10; x < w + 10; x += 34) {
        const th = 30 + rnd(x * 3 + zone) * 70;
        drawTriangle(ctx, x + 17, th, 14, false);
        const gh = 20 + rnd(x * 7 + zone) * 46;
        drawTriangle(ctx, x + rnd(x) * 20, base - gh, 12, true, gh);
      }
    } else if (kind === 'columns') {
      for (let x = 6; x < w; x += 60 + rnd(x) * 30) {
        const th = 46 + rnd(x + zone) * 52;
        const broken = rnd(x * 3) < 0.5;
        ctx.fillRect(x, base - th, 14, th);
        ctx.fillRect(x - 3, base - th, 20, 5);
        if (!broken) ctx.fillRect(x - 3, base - th - 4, 20, 4);
        ctx.fillRect(x - 3, base - 6, 20, 6);
      }
    } else if (kind === 'deadtrees') {
      for (let x = 4; x < w; x += 54 + rnd(x) * 40) {
        const th = 50 + rnd(x + zone) * 55;
        ctx.fillRect(x + 5, base - th, 8, th);
        ctx.fillRect(x + 3, base - th * 0.55, 12, 5);
        ctx.fillRect(x - 8, base - th + 8, 15, 5);
        ctx.fillRect(x - 8, base - th + 2, 4, 10);
        ctx.fillRect(x + 12, base - th + 18, 17, 5);
        ctx.fillRect(x + 25, base - th + 8, 4, 14);
        ctx.fillRect(x + 4, base - th - 6, 4, 8);
        ctx.fillRect(x + 10, base - th - 3, 3, 6);
      }
    } else if (kind === 'peaks') {
      for (let x = -20; x < w + 20; x += 70) {
        const th = 60 + rnd(x + zone) * 70;
        drawTriangle(this.ctx, x + 35, base - th, 44, true, th);
      }
    } else if (kind === 'towers') {
      for (let x = 10; x < w; x += 90 + rnd(x) * 40) {
        const th = 60 + rnd(x + zone) * 60;
        ctx.fillRect(x, base - th, 22, th);
        for (let b = 0; b < 3; b++) ctx.fillRect(x + b * 8, base - th - 6, 5, 6);
        const wl = shade(theme.accent, 0.9);
        ctx.fillStyle = wl;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(this.time * 2 + x);
        ctx.fillRect(x + 8, base - th + 14, 4, 6);
        ctx.globalAlpha = 1;
        ctx.fillStyle = theme.far;
      }
    } else if (kind === 'islands') {
      for (let x = 10; x < w; x += 100 + rnd(x) * 50) {
        const fy = base - 80 - rnd(x + zone) * 60 + Math.sin(this.time * 0.6 + x) * 4;
        ctx.fillRect(x, fy, 46, 8);
        drawTriangle(ctx, x + 23, fy + 8, 34, false, 20);
        ctx.fillRect(x + 12, fy - 8, 6, 8);
        ctx.fillRect(x + 26, fy - 12, 8, 12);
      }
    }
  }

  // ---- Mid prop layer ----
  drawMid(kind, theme, zone) {
    const { ctx, w } = this;
    const base = this.groundY();
    const midCol = shade(theme.far, 1.45);
    const hiCol = shade(theme.accent, 0.85);
    for (let i = 0; i < Math.max(3, Math.floor(w / 200)); i++) {
      const x = 30 + rnd(i * 13 + zone * 7) * (w - 80);
      // keep the battle lane clear
      if (x > w * 0.32 && x < w * 0.62) continue;
      ctx.fillStyle = midCol;
      if (kind === 'trees') {
        const th = 30 + rnd(i + zone) * 22;
        ctx.fillRect(x + 6, base - th, 4, th);
        for (let l = 0; l < 3; l++) {
          const lw = 20 - l * 5;
          ctx.fillRect(x + 8 - lw / 2, base - th - 14 + l * 7, lw, 6);
        }
      } else if (kind === 'crystals') {
        drawTriangle(ctx, x, base - 18, 8, true, 18);
        drawTriangle(ctx, x + 8, base - 26, 10, true, 26);
        ctx.fillStyle = hiCol;
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(this.time * 2.4 + i * 2);
        drawTriangle(ctx, x + 8, base - 22, 4, true, 20);
        ctx.globalAlpha = 1;
      } else if (kind === 'columns') {
        const th = 22 + rnd(i + zone) * 16;
        ctx.fillRect(x, base - th, 9, th);
        ctx.fillRect(x - 2, base - th, 13, 3);
      } else if (kind === 'reeds') {
        for (let rj = 0; rj < 4; rj++) {
          const sway = Math.sin(this.time * 1.6 + i + rj) * 2;
          ctx.fillRect(Math.round(x + rj * 4 + sway), base - 16 - rnd(rj + i) * 10, 2, 16 + rnd(rj + i) * 10);
        }
      } else if (kind === 'rocks') {
        ctx.fillRect(x, base - 10, 16, 10);
        ctx.fillRect(x + 4, base - 16, 9, 6);
      } else if (kind === 'shards') {
        drawTriangle(ctx, x + 5, base - 24, 9, true, 24);
        ctx.fillStyle = hiCol;
        ctx.globalAlpha = 0.5;
        drawTriangle(ctx, x + 5, base - 20, 3, true, 16);
        ctx.globalAlpha = 1;
      } else if (kind === 'banners') {
        ctx.fillRect(x, base - 34, 3, 34);
        ctx.fillStyle = hiCol;
        const wave = Math.sin(this.time * 3 + i) * 2;
        ctx.fillRect(x + 3, base - 32, 10 + wave, 12);
      }
    }
  }

  drawTeam(dt) {
    const { ctx, w } = this;
    const g = this.game;
    const team = g.activeTeam();
    const scale = Math.max(2, Math.round(Math.min(w, 640) / 200));
    team.forEach((id, i) => {
      const pet = g.state.pets[id];
      const sp = speciesById(id);
      const size = spriteSize(sp.sprite, scale);
      const col = i % 2, row = Math.floor(i / 2);
      const x = w * 0.10 + col * (size.w * 0.85) - row * size.w * 0.28;
      const bob = Math.sin(this.time * 2.4 + i * 1.7) * 3;
      const lunge = this.attackPhase(i);
      const y = this.groundY() - size.h + bob - row * size.h * 0.42;
      const stage = petStage(pet);
      if (STAGE_GLOW[stage]) {
        ctx.fillStyle = STAGE_GLOW[stage];
        ctx.beginPath();
        ctx.ellipse(x + size.w / 2, this.groundY() - row * size.h * 0.42 + 4, size.w * 0.55, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath();
      ctx.ellipse(x + size.w / 2 + lunge * 0.6, this.groundY() - row * size.h * 0.42 + 6, size.w * 0.38, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      const breath = Math.floor(this.time * 2 + i) % 2;
      drawSprite(ctx, sp.sprite, x + lunge, y, scale, { brighten: stage * 0.04, shiny: pet.shiny, breath });
    });
  }

  drawMonster(dt) {
    const { ctx, w } = this;
    const g = this.game;
    const m = g.monster;
    if (!m) return;
    const scale = Math.max(2, Math.round(Math.min(w, 640) / 200));
    const mScale = m.isBoss ? scale + 1 : scale;
    const size = spriteSize(m.key, mScale);
    const bob = Math.sin(this.time * 1.8) * 4;
    const x = this.monsterX() - size.w / 2;
    const y = this.groundY() - size.h + bob;
    if (m.isBoss) {
      const pulse = 0.16 + 0.10 * (0.5 + 0.5 * Math.sin(this.time * 3));
      const aura = ctx.createRadialGradient(this.monsterX(), y + size.h * 0.55, 4, this.monsterX(), y + size.h * 0.55, size.w * 0.9);
      aura.addColorStop(0, `rgba(255,90,106,${pulse})`);
      aura.addColorStop(1, 'rgba(255,90,106,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(x - size.w, y - size.h * 0.5, size.w * 3, size.h * 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(this.monsterX(), this.groundY() + 6, size.w * 0.42, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const flash = this.hitFlash > 0;
    if (flash) this.hitFlash -= dt;
    const mBreath = Math.floor(this.time * 1.6) % 2;
    drawSprite(ctx, m.key, x, y, mScale, { flip: true, breath: mBreath, brighten: flash ? 0.45 : (m.isBoss ? 0.06 : 0) });

    const bw = Math.max(70, size.w);
    const bx = this.monsterX() - bw / 2;
    const by = y - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, 10);
    ctx.fillStyle = '#3a3352';
    ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = m.isBoss ? '#ff5a6a' : this.theme().accent;
    ctx.fillRect(bx, by, bw * Math.max(0, m.hp / m.maxHp), 6);
    if (m.isBoss && isFinite(m.timeLeft)) {
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(bx, by + 8, bw * Math.max(0, m.timeLeft / 30), 2);
    }
  }

  // Slash arcs: 3 stepped pixel strokes fading out fast
  drawSlashes(dt) {
    const { ctx } = this;
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.t += dt;
      if (s.t > 0.18) { this.slashes.splice(i, 1); continue; }
      const p = s.t / 0.18;
      ctx.globalAlpha = 1 - p;
      const len = 26;
      for (let j = 0; j < 6; j++) {
        const q = j / 6;
        const px = s.x + s.dir * (q - 0.5) * len;
        const py = s.y + (q - 0.5) * (q - 0.5) * 28 - 8 + p * 8;
        ctx.fillStyle = j % 2 ? '#ffffff' : '#ffe9b8';
        ctx.fillRect(Math.round(px), Math.round(py), 4, 3);
      }
      // impact star
      ctx.fillStyle = '#ffffff';
      const r = 4 + p * 8;
      ctx.fillRect(Math.round(s.x - r), Math.round(s.y), 3, 2);
      ctx.fillRect(Math.round(s.x + r), Math.round(s.y), 3, 2);
      ctx.fillRect(Math.round(s.x), Math.round(s.y - r), 2, 3);
      ctx.fillRect(Math.round(s.x), Math.round(s.y + r), 2, 3);
      ctx.globalAlpha = 1;
    }
  }

  drawParticles(dt) {
    const { ctx } = this;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // Looping ambient particles per theme
  drawAmbient(dt, kind, theme) {
    const { ctx, w, h: H } = this;
    for (const a of this.ambient) {
      if (kind === 'leaves') {
        a.y += a.sp * 18 * dt;
        a.x += Math.sin(this.time * 1.5 + a.ph) * 14 * dt;
        ctx.fillStyle = shade(theme.accent, 0.8);
        ctx.globalAlpha = 0.5;
      } else if (kind === 'embers') {
        a.y -= a.sp * 26 * dt;
        a.x += Math.sin(this.time * 2 + a.ph) * 10 * dt;
        ctx.fillStyle = Math.sin(this.time * 4 + a.ph) > 0 ? '#de9e41' : '#cf573c';
        ctx.globalAlpha = 0.7;
      } else if (kind === 'snow') {
        a.y += a.sp * 24 * dt;
        a.x += Math.sin(this.time + a.ph) * 12 * dt;
        ctx.fillStyle = '#ebede9';
        ctx.globalAlpha = 0.6;
      } else if (kind === 'fireflies') {
        a.x += Math.sin(this.time * 0.8 + a.ph) * 12 * dt;
        a.y += Math.cos(this.time * 0.7 + a.ph * 2) * 10 * dt;
        ctx.fillStyle = '#d0da91';
        ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(this.time * 3 + a.ph * 5));
      } else if (kind === 'wisps') {
        a.x += Math.sin(this.time * 0.6 + a.ph) * 10 * dt;
        a.y -= a.sp * 8 * dt;
        ctx.fillStyle = '#c65197';
        ctx.globalAlpha = 0.4;
      } else if (kind === 'sparkles') {
        ctx.fillStyle = '#a4dddb';
        ctx.globalAlpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(this.time * 5 + a.ph * 3));
      } else { // motes
        a.y -= a.sp * 6 * dt;
        a.x += Math.sin(this.time * 0.9 + a.ph) * 6 * dt;
        ctx.fillStyle = shade(theme.accent, 1.0);
        ctx.globalAlpha = 0.25;
      }
      if (a.y > H) a.y = -4;
      if (a.y < -6) a.y = H;
      if (a.x > w + 4) a.x = -4;
      if (a.x < -6) a.x = w + 4;
      ctx.fillRect(Math.round(a.x), Math.round(a.y), a.size, a.size);
    }
    ctx.globalAlpha = 1;
  }

  drawNumbers(dt) {
    const { ctx } = this;
    ctx.textAlign = 'center';
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life -= dt * 1.1;
      if (n.life <= 0) { this.numbers.splice(i, 1); continue; }
      n.y += n.vy * dt;
      n.vy *= (1 - dt * 1.6);
      const a = Math.min(1, n.life * 2.5);
      ctx.globalAlpha = a;
      ctx.font = `700 ${n.kind === 'gold' ? 15 : 17}px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = '#141022';
      ctx.fillText(n.text, n.x + 1.5, n.y + 1.5);
      ctx.fillStyle = n.kind === 'gold' ? '#f5b942' : '#ffffff';
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  }

  attackPhase(i) {
    const t = (this.time * 2.2 + i * 0.8) % 2;
    return t < 0.25 ? Math.sin((t / 0.25) * Math.PI) * 8 : 0;
  }
}

// Pixel-stepped disc (crisp circle from stacked rects)
function drawPixelDisc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  const step = 2;
  for (let y = -r; y <= r; y += step) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)) / step) * step;
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, step);
  }
}

// Triangle from stacked rects. up=true points up. hOverride for spikes.
function drawTriangle(ctx, cx, topY, halfW, up = true, hgt = null) {
  const height = hgt ?? halfW * 2;
  const step = 2;
  for (let i = 0; i < height; i += step) {
    const p = i / height;
    const wHere = Math.max(2, Math.round(halfW * (up ? p : 1 - p)));
    ctx.fillRect(Math.round(cx - wHere), Math.round(topY + i), wHere * 2, step);
  }
}

export function fmt(n) {
  if (n < 1000) return Math.floor(n).toString();
  const units = ['K', 'M', 'B', 'T', 'aa', 'bb', 'cc'];
  let u = -1;
  let v = n;
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++; }
  return `${v >= 100 ? Math.floor(v) : v.toFixed(1)}${units[u]}`;
}
