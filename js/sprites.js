// Hand-authored 16x16 pixel sprites. Each sprite is a palette map plus a
// 16-row char grid; '.' is transparent. Rendered scaled with smoothing off.

export const SPRITES = {
  // ---------------- Familiars ----------------
  emberfox: {
    pal: { o: '#2a1a20', a: '#e8763a', b: '#f5a55c', c: '#fff1dc', k: '#1a1014', f: '#ffd23e', g: '#ff8c2e' },
    grid: [
      '................',
      '...o....o.......',
      '..oao..oao......',
      '..obao.obao.....',
      '..oaaaoaaao.....',
      '..oaaaaaaao.....',
      '..oakaaakao.....',
      '..oaaacaaao.....',
      '...oacccao......',
      'f...oaaaaoo.....',
      'gf.oaaaaaaao....',
      'ogfoaaaaaaao....',
      '.ogfaaaaaao.....',
      '..ooaooaoo......',
      '...oao..oao.....',
      '....o....o......',
    ],
  },
  mossling: {
    pal: { o: '#16241a', a: '#5fd475', b: '#8fe8a0', c: '#2e7a44', k: '#10281a', w: '#eafff0' },
    grid: [
      '................',
      '.......oo.......',
      '......obbo......',
      '....oobbbboo....',
      '...obbccccbbo...',
      '....oobbbboo....',
      '.....oaaaao.....',
      '....oaaaaaao....',
      '...oakwaawkao...',
      '...oaaaaaaaao...',
      '...oaaaccaaao...',
      '...oaaaaaaaao...',
      '....oaaaaaao....',
      '.....oaaaao.....',
      '....oao..oao....',
      '.....o....o.....',
    ],
  },
  puddle: {
    pal: { o: '#101c2e', a: '#4aa8ff', b: '#8ad8ff', c: '#2a6ab8', k: '#0c1a2e', w: '#eaf8ff' },
    grid: [
      '................',
      '................',
      '................',
      '......obbo......',
      '....oobbbboo....',
      '...obbbbbbbbo...',
      '...obaaaaaabo...',
      '..oaakwaawkaao..',
      '..oaaaaaaaaaao..',
      '..oaaaaccaaaao..',
      '.oaaaaaaaaaaaao.',
      '.oaaaaaaaaaaaao.',
      '.oaaaaaaaaaaaao.',
      '..oaaaaaaaaaao..',
      '...oooooooooo...',
      '................',
    ],
  },
  gustowl: {
    pal: { o: '#1c1c28', a: '#c9cfe0', b: '#eef1f8', c: '#8f96ad', k: '#181422', y: '#f5b942' },
    grid: [
      '................',
      '..o..........o..',
      '.oco........oco.',
      '.occo..oo..occo.',
      '..occoobboocco..',
      '...ocbbbbbbco...',
      '...obkbbbbkbo...',
      '...obbboybbbo...',
      '...oabbbbbbao...',
      '..oaabbbbbbaao..',
      '..oaabbbbbbaao..',
      '..oaaabbbbaaao..',
      '...oaaaaaaaao...',
      '....oaaaaaao....',
      '.....oy..yo.....',
      '................',
    ],
  },
  boulderpup: {
    pal: { o: '#1c1814', a: '#9a8a72', b: '#c2b298', c: '#6e614e', k: '#181410', w: '#f2ead8' },
    grid: [
      '................',
      '................',
      '..oo......oo....',
      '.ocao....ocao...',
      '.oaaaooooaaao...',
      '.oaaaaaaaaaao...',
      '.oakwaaaawkao...',
      '.oaaaaaaaaaao...',
      '..oaacccaao.....',
      '..oaaaaaaaaoo...',
      '.oaaaaaaaaaaao..',
      '.oaaaaaaaaaaao..',
      '.oaacaaaacaaao..',
      '..ooaoooaooo....',
      '...oco..oco.....',
      '....o....o......',
    ],
  },
  sparkbat: {
    pal: { o: '#1e1430', a: '#8a5fd4', b: '#b58fe8', k: '#140c22', y: '#ffe24a', w: '#f4eaff' },
    grid: [
      '................',
      '..o..........o..',
      '.oao.o....o.oao.',
      '.oaaoao..oaoaao.',
      '.oaaaao..oaaaao.',
      '..oaaaoooaaaoo..',
      '..oaabbbbbbao...',
      '..obkbbbbkbbo...',
      '..obbbbbbbbbo...',
      '...obbwyybbo....',
      '....obbbbbo.....',
      '.....obbbo......',
      '....y.obo.y.....',
      '...oyo.o.oyo....',
      '....y.....y.....',
      '................',
    ],
  },
  frostkit: {
    pal: { o: '#14202e', a: '#8ad8ff', b: '#c2ecff', c: '#5aa8d8', k: '#102030', w: '#f0faff' },
    grid: [
      '................',
      '...o....o.......',
      '..oao..oao......',
      '..obao.obao.....',
      '..oaaaoaaao.....',
      '..oaaaaaaao.....',
      '..oakaaakao.....',
      '..oaabbaaao.....',
      '...oabbbao......',
      '....oaaaaoo.....',
      '..oaaaaaaaao....',
      '.ocoaaaaaaao....',
      '.oc.aaaaaao.....',
      '..ooaooaoo......',
      '...oao..oao.....',
      '....o....o......',
    ],
  },
  thornwolf: {
    pal: { o: '#101c14', a: '#3e6e4a', b: '#5a9464', c: '#274a30', k: '#0c140e', w: '#e8f4e8', t: '#8fbf5a' },
    grid: [
      '................',
      '..o.....o.......',
      '.oto...oto......',
      '.otao..otao.....',
      '.oaaaooaaao.....',
      '.oaaaaaaaao.....',
      '.oakwaawkao.....',
      '.oaaaaaaaao.....',
      '..oaccccao......',
      '..oaaaaaaaoo....',
      '.oaaaataaaaao...',
      'ocoaaaaataaao...',
      'oc.aaaaaaaao....',
      '..ooaooaooo.....',
      '...oao..oao.....',
      '....o....o......',
    ],
  },
  duskwyrm: {
    pal: { o: '#1a1030', a: '#7a4ac2', b: '#a678e8', c: '#4a2a80', k: '#120a24', w: '#f0e8ff', g: '#4fe3c1' },
    grid: [
      '................',
      '....o.....o.....',
      '...obo...obo....',
      '...obbo.obbo....',
      '....oaaoaao.....',
      '....oaaaaao.....',
      '....oagaagao....',
      '....oaaaaao.....',
      '.....oaccao.....',
      '....oaaaaaao....',
      '...oaaaaaaaao...',
      '..oaaoaaaaoaao..',
      '.oco.oaaaao.oco.',
      '.oc..oaoaao..co.',
      '.....oo..oo.....',
      '................',
    ],
  },
  solphoenix: {
    pal: { o: '#2a1408', a: '#f5b942', b: '#ffd97a', c: '#e8763a', k: '#241004', w: '#fff8e0', r: '#ff5a3a' },
    grid: [
      '................',
      '.......or.......',
      '......orbo......',
      '.....obbbo......',
      '....obkbbbo.....',
      '....obbbcoo.....',
      '..o.obbbbo......',
      '.oco.obbbbo.....',
      '.occooabbbao....',
      '..occaaabaaao...',
      '..ocaaaabaaao...',
      '...oaaaabaao....',
      '....oaaaaao.....',
      '.....oaaao......',
      '....r.oco.r.....',
      '...oro.o.oro....',
    ],
  },

  // ---------------- Monsters ----------------
  gloomshroom: {
    pal: { o: '#141020', a: '#6e5a9a', b: '#9a82c8', c: '#c8b8e8', k: '#100c1c', w: '#efe8ff' },
    grid: [
      '................',
      '......oooo......',
      '....oobbbboo....',
      '...obbcbbcbbo...',
      '..obbbbbbbbbbo..',
      '..obcbbbbbbcbo..',
      '..oobbbbbbbboo..',
      '....oooooooo....',
      '.....oaaaao.....',
      '....oakaakao....',
      '....oaaaaaao....',
      '....oaacaaao....',
      '.....oaaaao.....',
      '.....oaaaao.....',
      '....oao..oao....',
      '................',
    ],
  },
  goblin: {
    pal: { o: '#101c10', a: '#5a9444', b: '#7ab85e', k: '#0e1a0c', w: '#eaf4e0', r: '#c24a3a' },
    grid: [
      '................',
      '.o...........o..',
      'oao.........oao.',
      'oaaoo.....ooaao.',
      '.oaaaoooooaaao..',
      '..oaaaaaaaaao...',
      '..oakaaaakao....',
      '..oaaaaaaaao....',
      '...oarrrrao.....',
      '...oaaaaaao.....',
      '..oaaaaaaaaoo...',
      '..oaaaaaaaaao...',
      '...oaaaaaao.....',
      '...oaooaoo......',
      '..oao..oao......',
      '...o....o.......',
    ],
  },
  batling: {
    pal: { o: '#1a1424', a: '#5a4a7a', b: '#7a68a0', k: '#120e1c', r: '#ff5a6a', w: '#f0eaff' },
    grid: [
      '................',
      '.o............o.',
      'oao..........oao',
      'oaao...oo...oaao',
      'oaaao.obbo.oaaao',
      '.oaaaobbbboaaao.',
      '.oaaabbbbbbaao..',
      '..oabrbbbbrbao..',
      '..obbbbbbbbbbo..',
      '...obbowwobbo...',
      '....obbbbbbo....',
      '.....obbbbo.....',
      '......obbo......',
      '.......oo.......',
      '................',
      '................',
    ],
  },
  boneling: {
    pal: { o: '#1a1a22', a: '#d8d8e0', b: '#f0f0f4', c: '#8f8fa0', k: '#12121a' },
    grid: [
      '................',
      '.....oooo.......',
      '....obbbbo......',
      '...obbbbbbo.....',
      '...obkbbkbo.....',
      '...obbbbbbo.....',
      '....occcco......',
      '.....oaao.......',
      '...ooaaaaoo.....',
      '..oaoaaaaoao....',
      '..oa.oaao.ao....',
      '..oa.oaao.ao....',
      '.....oaao.......',
      '....oaooao......',
      '...oao..oao.....',
      '....o....o......',
    ],
  },
  eyeling: {
    pal: { o: '#141024', a: '#b06cf5', b: '#d0a0ff', k: '#0e0a1c', w: '#f4eaff', i: '#4fe3c1' },
    grid: [
      '................',
      '................',
      '......oooo......',
      '....oobbbboo....',
      '...obbbbbbbbo...',
      '..obbbwwwwbbbo..',
      '..obbwwiiwwbbo..',
      '.obbbwiikiwbbbo.',
      '.obbbwiikiwbbbo.',
      '..obbwwiiwwbbo..',
      '..obbbwwwwbbbo..',
      '...obbbbbbbbo...',
      '....oobbbboo....',
      '..o...oooo...o..',
      '.oao..a..a..oao.',
      '..o..........o..',
    ],
  },
  imp: {
    pal: { o: '#240c0c', a: '#c24a3a', b: '#e87a5a', k: '#1c0808', w: '#ffe8d8', y: '#ffd23e' },
    grid: [
      '................',
      '.o....o..o....o.',
      'oao..oyo.oyo.oao',
      'oaao..o...o.oaao',
      'oaaaoooooooaaao.',
      '.oaaaaaaaaaao...',
      '..oakaaaakao....',
      '..oaaawwaaao....',
      '..oaaaaaaaao....',
      '...oaaaaaao.....',
      '..oaaaaaaaaoo...',
      '..oaaaaaaaaao...',
      '...oaaaaaao..o..',
      '...oaooaoo..oa..',
      '..oao..oao...o..',
      '...o....o.......',
    ],
  },

  // ---------------- Objects ----------------
  egg: {
    pal: { o: '#241a20', a: '#e8e0f0', b: '#fff8ff', c: '#b06cf5', d: '#8f89b0' },
    grid: [
      '................',
      '................',
      '......oooo......',
      '.....obbbbo.....',
      '....obbbbbbo....',
      '....obbabbbo....',
      '...obbacbbbbo...',
      '...obacbbcabo...',
      '...oabbbcbbao...',
      '...oabbbbbbao...',
      '...oaabbbcaao...',
      '....oaabcaao....',
      '....odaaaado....',
      '.....oddddo.....',
      '......oooo......',
      '................',
    ],
  },
};

// Draw a sprite onto ctx at (x, y) with integer pixel scale.
// opts: { flip: bool, alpha: 0-1, brighten: 0-1, tint: '#rrggbb' | null }
export function drawSprite(ctx, key, x, y, scale, opts = {}) {
  const s = SPRITES[key];
  if (!s) return;
  const grid = s.grid;
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      let color = opts.tint || s.pal[ch];
      if (!color) continue;
      if (opts.brighten) color = brighten(color, opts.brighten);
      ctx.fillStyle = color;
      const cx = opts.flip ? (row.length - 1 - c) : c;
      ctx.fillRect(Math.round(x + cx * scale), Math.round(y + r * scale), Math.ceil(scale), Math.ceil(scale));
    }
  }
  ctx.restore();
}

export function spriteSize(key, scale) {
  const s = SPRITES[key];
  return { w: (s?.grid[0].length ?? 16) * scale, h: (s?.grid.length ?? 16) * scale };
}

function brighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(255 * amt));
  const g = Math.min(255, ((n >> 8) & 255) + Math.round(255 * amt));
  const b = Math.min(255, (n & 255) + Math.round(255 * amt));
  return `rgb(${r},${g},${b})`;
}

// Render a sprite into a standalone canvas (for DOM <img>/panel use).
export function spriteToCanvas(key, scale = 4, opts = {}) {
  const { w, h } = spriteSize(key, scale);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawSprite(ctx, key, 0, 0, scale, opts);
  return cv;
}
