// Canvas battle scene: zone-themed backdrop, bobbing team sprites, monster,
// hit flashes, floating damage numbers, kill particles, boss shake.

import { drawSprite, spriteSize } from './sprites.js';
import { ZONE_THEMES, zoneData } from './data.js';
import { speciesById, petStage } from './game.js';

const STAGE_GLOW = [null, 'rgba(255,255,255,0.10)', 'rgba(245,185,66,0.20)'];

export class BattleScene {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.time = 0;
    this.numbers = [];    // floating damage/gold numbers
    this.particles = [];
    this.shake = 0;
    this.hitFlash = 0;    // monster flash timer
    this.attackAnim = new Map(); // famId -> lunge t
    this.dmgAccum = 0;
    this.dmgAccumT = 0;
    this.stars = Array.from({ length: 40 }, (_, i) => ({
      x: (i * 137.5) % 1, y: ((i * 61.8) % 47) / 100, tw: (i * 0.7) % 6.28,
    }));

    game.on('hit', ({ dmg }) => {
      // Aggregate tiny per-tick hits into readable numbers ~3x/sec
      this.dmgAccum += dmg;
    });
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
  }

  pushNumber(text, kind, x, y) {
    const jitter = (Math.random() - 0.5) * 30;
    this.numbers.push({
      text, kind,
      x: x ?? this.monsterX() + jitter,
      y: y ?? this.groundY() - 70 + (Math.random() - 0.5) * 16,
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

  theme() { return ZONE_THEMES[zoneData(this.game.state.zone).theme]; }
  groundY() { return this.h * 0.78; }
  monsterX() { return this.w * 0.72; }

  frame(dt) {
    this.time += dt;
    const { ctx, w, h } = this;
    if (!w) return;
    const theme = this.theme();
    const g = this.game;

    // Aggregate damage numbers
    this.dmgAccumT += dt;
    if (this.dmgAccumT >= 0.33 && this.dmgAccum > 0) {
      this.pushNumber(fmt(this.dmgAccum), 'dmg');
      this.hitFlash = 0.1;
      this.dmgAccum = 0;
      this.dmgAccumT = 0;
    }

    ctx.save();
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 24);
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.sky);
    sky.addColorStop(1, theme.near);
    ctx.fillStyle = sky;
    ctx.fillRect(-12, -12, w + 24, h + 24);

    // Stars / motes
    ctx.fillStyle = theme.accent;
    for (const s of this.stars) {
      const a = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(this.time * 1.4 + s.tw));
      ctx.globalAlpha = a;
      ctx.fillRect(Math.round(s.x * w), Math.round(s.y * h * 1.4 + 8), 2, 2);
    }
    ctx.globalAlpha = 1;

    // Far hills (blocky silhouettes)
    ctx.fillStyle = theme.far;
    const hillY = h * 0.62;
    for (let x = -20; x < w + 20; x += 46) {
      const hh = 24 + 30 * (0.5 + 0.5 * Math.sin(x * 0.05 + this.game.state.zone));
      ctx.fillRect(x, hillY - hh, 46, hh + 60);
    }

    // Ground
    ctx.fillStyle = theme.ground;
    ctx.fillRect(-12, this.groundY(), w + 24, h - this.groundY() + 12);
    ctx.fillStyle = theme.near;
    for (let x = 0; x < w; x += 22) {
      ctx.fillRect(x + ((x * 7) % 11), this.groundY() + 8 + ((x * 13) % 18), 6, 3);
    }

    // Team
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
      const breath = Math.floor(this.time * 2 + i) % 2;
      drawSprite(ctx, sp.sprite, x + lunge, y, scale, { brighten: stage * 0.04, shiny: pet.shiny, breath });
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath();
      ctx.ellipse(x + size.w / 2 + lunge * 0.6, this.groundY() - row * size.h * 0.42 + 6, size.w * 0.38, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Monster
    const m = g.monster;
    if (m) {
      const mScale = m.isBoss ? scale + 1 : scale;
      const size = spriteSize(m.key, mScale);
      const bob = Math.sin(this.time * 1.8) * 4;
      const x = this.monsterX() - size.w / 2;
      const y = this.groundY() - size.h + bob;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(this.monsterX(), this.groundY() + 6, size.w * 0.42, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      const flash = this.hitFlash > 0;
      if (flash) this.hitFlash -= dt;
      const mBreath = Math.floor(this.time * 1.6) % 2;
      drawSprite(ctx, m.key, x, y, mScale, { flip: true, breath: mBreath, brighten: flash ? 0.45 : (m.isBoss ? 0.06 : 0) });

      // Monster HP bar
      const bw = Math.max(70, size.w);
      const bx = this.monsterX() - bw / 2;
      const by = y - 16;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, 10);
      ctx.fillStyle = '#3a3352';
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = m.isBoss ? '#ff5a6a' : theme.accent;
      ctx.fillRect(bx, by, bw * Math.max(0, m.hp / m.maxHp), 6);
      if (m.isBoss && isFinite(m.timeLeft)) {
        ctx.fillStyle = '#ffd23e';
        ctx.fillRect(bx, by + 8, bw * Math.max(0, m.timeLeft / 30), 2);
      }
    }

    // Particles
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

    // Floating numbers
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

    ctx.restore();
  }

  attackPhase(i) {
    // Gentle staggered lunge toward the monster
    const t = (this.time * 2.2 + i * 0.8) % 2;
    return t < 0.25 ? Math.sin((t / 0.25) * Math.PI) * 8 : 0;
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
