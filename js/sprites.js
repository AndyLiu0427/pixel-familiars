// Hand-authored 24x24 pixel sprites using Apollo palette ramps (Lospec).
// Technique per art research: selective outlines (darkest ramp color, not
// black), hue-shifted 3-5 color ramps, top-left light source, readable
// silhouettes. Idle animation is programmatic (breath transform), hit
// feedback is palette flash: no drawn frames needed.
//
// Grid chars: '.' transparent, 'o' selout outline, 'a'..'e' ramp dark->light,
// extra accent letters per sprite (k eye dark, w eye light, etc).

// Apollo ramps
const A = {
  blue:   ['#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb'],
  green:  ['#19332d', '#25562e', '#468232', '#75a743', '#a8ca58', '#d0da91'],
  brown:  ['#4d2b32', '#7a4841', '#ad7757', '#c09473', '#d7b594', '#e7d5b3'],
  gold:   ['#341c27', '#602c2c', '#884b2b', '#be772b', '#de9e41', '#e8c170'],
  red:    ['#241527', '#411d31', '#752438', '#a53030', '#cf573c', '#da863e'],
  purple: ['#1e1d39', '#402751', '#7a367b', '#a23e8c', '#c65197', '#df84a5'],
  gray:   ['#090a14', '#10141f', '#151d28', '#202e37', '#394a50', '#577277',
           '#819796', '#a8b5b2', '#c7cfcc', '#ebede9'],
};

function ramp(r, o = 0) { // pal letters a..e from a ramp, o = darkest as outline
  return { o: r[0 + o], a: r[1 + o], b: r[2 + o], c: r[3 + o], d: r[4 + o], e: r[5 + o] };
}

export const SPRITES = {
  // ============ FAMILIARS (11) ============

  emberfox: {
    pal: { ...ramp(A.gold), k: '#241527', w: '#ebede9', f: '#cf573c', g: '#de9e41' },
    shiny: { ...ramp(A.blue), k: '#241527', w: '#ebede9', f: '#73bed3', g: '#a4dddb' },
    grid: [
      '........................',
      '....oo........oo........',
      '...oddo......oddo.......',
      '...odcao....odcao.......',
      '...odccao..odccao.......',
      '...occccaooccccao.......',
      '...occcccccccccao.......',
      '...occcccccccccao.......',
      '...ocwkccccwkccao.......',
      '...ocwkccccwkccao.......',
      '...occcceecccccao.......',
      '...occceeeeccccao.......',
      '....oceeeeeecao.........',
      '.....occcccccaoo........',
      'f....occcccccccaoo......',
      'gf..occccccccccccao.....',
      'ogf.occcccccccccccao....',
      'oggfccccccccccccccao....',
      '.ogfaccccccccccccao.....',
      '..ogfccccaccccacao......',
      '...oaccaoaccaoacao......',
      '....occo.occo.occo......',
      '.....oo...oo...oo.......',
      '........................',
    ],
  },

  mossling: {
    pal: { ...ramp(A.green), k: '#19332d', w: '#ebede9', f: '#df84a5' },
    shiny: { ...ramp(A.gold), k: '#341c27', w: '#ebede9', f: '#73bed3' },
    grid: [
      '........................',
      '..........oo............',
      '.........oddo...........',
      '......oo.oddo.oo........',
      '.....oddooddooddo.......',
      '......oddddddddo........',
      '....oodddfddfdddoo......',
      '...oddddddddddddddo.....',
      '....ooddddddddddoo......',
      '......oobbbbbboo........',
      '.....obcccccccbo........',
      '....obcccccccccbo.......',
      '...obccwkccccwkcbo......',
      '...obccwkccccwkcbo......',
      '...obcccccccccccbo......',
      '...obccccddddcccbo......',
      '...obccccccccccbo.......',
      '....obccccccccbo........',
      '.....obccccccbo.........',
      '......obbbbbbo..........',
      '.....obbo..obbo.........',
      '.....oao....oao.........',
      '......o......o..........',
      '........................',
    ],
  },

  puddle: {
    pal: { ...ramp(A.blue), k: '#10141f', w: '#ebede9' },
    shiny: { ...ramp(A.purple), k: '#1e1d39', w: '#ebede9' },
    grid: [
      '........................',
      '........................',
      '........................',
      '.........oddo...........',
      '.......ooddddoo.........',
      '......odddddddddo.......',
      '.....odddddddddddo......',
      '....oddddccccdddddo.....',
      '....odccccccccccddo.....',
      '...occcwkccccwkcccdo....',
      '...occcwkccccwkcccco....',
      '...occcccccccccccco.....',
      '..occccccddddcccccco....',
      '..ocbcccdccccdccccco....',
      '..ocbbccccccccccbcco....',
      '.ocbbbcccccccccbbbco....',
      '.ocbbbbcccccccbbbbco....',
      '.ocabbbbbbbbbbbbbaco....',
      '.ocaabbbbbbbbbbbaaco....',
      '..oaaaabbbbbbbaaaao.....',
      '...ooaaaaaaaaaaaoo......',
      '.....oooooooooooo.......',
      '........................',
      '........................',
    ],
  },

  gustowl: {
    pal: { o: '#151d28', a: '#394a50', b: '#577277', c: '#819796', d: '#a8b5b2', e: '#ebede9', k: '#10141f', y: '#de9e41', w: '#ebede9' },
    shiny: { o: '#341c27', a: '#602c2c', b: '#884b2b', c: '#be772b', d: '#de9e41', e: '#e8c170', k: '#10141f', y: '#73bed3', w: '#ebede9' },
    grid: [
      '........................',
      '...o..............o.....',
      '..obo............obo....',
      '..obbo...oooo...obbo....',
      '..obbboodddddoobbbo.....',
      '...obbdddddddddbbo......',
      '...obddddddddddddo......',
      '..obddddddddddddddo.....',
      '..obdkkwddddwkkdddo.....',
      '..obdkkwddddwkkdddo.....',
      '..obddddddyddddddo......',
      '..obdddddyyyddddddo.....',
      '..obcdddddyddddddco.....',
      '..obccdddddddddccbo.....',
      '..obccccddddddcccbo.....',
      '..obcccccddddccccbo.....',
      '..oabccccccccccccao.....',
      '..oabbcccccccccbbao.....',
      '...oabbbccccccbbao......',
      '....oabbbbbbbbbao.......',
      '.....oaaabbbaaao........',
      '.......oyo.oyo..........',
      '......oyyo.oyyo.........',
      '........................',
    ],
  },

  boulderpup: {
    pal: { ...ramp(A.brown), k: '#10141f', w: '#ebede9', s: '#577277' },
    shiny: { ...ramp(A.blue), k: '#10141f', w: '#ebede9', s: '#a8b5b2' },
    grid: [
      '........................',
      '........................',
      '...oo..........oo.......',
      '..osdo........osdo......',
      '..osddo......osddo......',
      '..osdddoooooosdddo......',
      '..oddddddddddddddo......',
      '..odddddddddddddddo.....',
      '..odwkddddddddwkddo.....',
      '..odwkddddddddwkddo.....',
      '..oddddddddddddddo......',
      '..odddccccccccdddo......',
      '...odccccccccccdo.......',
      '....occccccccccoo.......',
      '...occcccccccccccoo.....',
      '..occcccsccccccccco.....',
      '..occcsccccsccccccco....',
      '..occcccccccccsccco.....',
      '..obcccccccccccccbo.....',
      '..obbccbbbccbbccbbo.....',
      '...oabboaabboabbao......',
      '....obbo..obbo.obbo.....',
      '.....oo....oo...oo......',
      '........................',
    ],
  },

  sparkbat: {
    pal: { ...ramp(A.purple), k: '#10141f', w: '#ebede9', y: '#e8c170', z: '#de9e41' },
    shiny: { ...ramp(A.green), k: '#10141f', w: '#ebede9', y: '#df84a5', z: '#c65197' },
    grid: [
      '........................',
      '..o................o....',
      '.obo..............obo...',
      '.obbo....o..o....obbo...',
      '.obbbo..oddddo..obbbo...',
      '.obbbbo.oddddo.obbbbo...',
      '.obbbbboddddddobbbbbo...',
      '..obbbdddddddddbbbbo....',
      '..obbddddddddddddbo.....',
      '...obdkwddddddwkdo......',
      '...obdkwddddddwkdo......',
      '...obddddddddddddo......',
      '....odddwyywdddddo......',
      '....odddddddddddo.......',
      '.....odddddddddo........',
      '......odddddddo.........',
      '.......odddddo..........',
      '....y..oddddo..y........',
      '...oyo..oddo..oyo.......',
      '..ozyzo..oo..ozyzo......',
      '...oyo........oyo.......',
      '....y..........y........',
      '........................',
      '........................',
    ],
  },

  frostkit: {
    pal: { o: '#172038', a: '#3c5e8b', b: '#4f8fba', c: '#73bed3', d: '#a4dddb', e: '#ebede9', k: '#10141f', w: '#ebede9' },
    shiny: { ...ramp(A.red), k: '#10141f', w: '#ebede9' },
    grid: [
      '........................',
      '....oo........oo........',
      '...oedo......oedo.......',
      '...oedco....oedco.......',
      '...oeddco..oeddco.......',
      '...oddddoooddddo........',
      '...odddddddddddo........',
      '..oddddddddddddddo......',
      '..odwkddddddwkdddo......',
      '..odwkddddddwkdddo......',
      '..oddddddeedddddo.......',
      '..odddddeeeeddddo.......',
      '...odddeeeeeeddo........',
      '....oddddddddoo.........',
      '.....odddddddddoo.......',
      '.ooooddddddddddddo......',
      'obccddddddddddddddo.....',
      'obc.odddddddddddddo.....',
      '.o..oddddcddddcddo......',
      '....odddoaddoaddo.......',
      '.....occo.occo.occo.....',
      '.....oo....oo....oo.....',
      '........................',
      '........................',
    ],
  },

  thornwolf: {
    pal: { o: '#19332d', a: '#25562e', b: '#468232', c: '#75a743', d: '#a8ca58', e: '#d0da91', k: '#10141f', w: '#ebede9', t: '#d0da91' },
    shiny: { ...ramp(A.gray, 2), k: '#10141f', w: '#ebede9', t: '#73bed3' },
    grid: [
      '........................',
      '...oo.........oo........',
      '..otco.......otco.......',
      '..otcbo.....otcbo.......',
      '..occbbo...occbbo.......',
      '..occcbboooccbbo........',
      '..occccccccccbbo........',
      '.occccccccccccbbo.......',
      '.ocwkccccccwkccbo.......',
      '.ocwkccccccwkccbo.......',
      '.occccccddccccbo........',
      '.obccccddddcccbo........',
      '..obccddddddcbo.........',
      '...obccccccccboo........',
      '..t.obccccccccbboo......',
      '.oto.obcccccccccbboo....',
      'otttoccccctccccccbbo....',
      '.otobcccctttcccccbbo....',
      '..oobccccctccctcbbo.....',
      '...obbccccccctttcbo.....',
      '...obbcbbbccbbtcbbo.....',
      '....oabbo.oabbo.obbo....',
      '.....ooo...ooo...oo.....',
      '........................',
    ],
  },

  duskwyrm: {
    pal: { ...ramp(A.purple), k: '#10141f', w: '#ebede9', g: '#73bed3' },
    shiny: { ...ramp(A.red), k: '#10141f', w: '#ebede9', g: '#e8c170' },
    grid: [
      '........................',
      '.....o..........o.......',
      '....obo........obo......',
      '....obco......obco......',
      '....obcco....obcco......',
      '.....occdo..odcco.......',
      '.....odddddddddo........',
      '....odddddddddddo.......',
      '....odgkddddgkdddo......',
      '....odgkddddgkdddo......',
      '....oddddddddddo........',
      '.....odddccddddo........',
      '.....odccccccdo.........',
      '....odddddddddddo.......',
      '...oddddddddddddddo.....',
      '..oddcodddddddocddo.....',
      '.odco.odddddddo.ocdo....',
      '.obo..oddddddddo..oo....',
      '.o...odddoodddo.........',
      '.....oddo..oddo.........',
      '.....odo....odo.........',
      '....obbo...obbo.........',
      '.....oo.....oo..........',
      '........................',
    ],
  },

  solphoenix: {
    pal: { ...ramp(A.gold), k: '#241527', w: '#ebede9', r: '#cf573c', s: '#da863e' },
    shiny: { ...ramp(A.blue), k: '#10141f', w: '#ebede9', r: '#a4dddb', s: '#73bed3' },
    grid: [
      '........................',
      '..........or............',
      '.........orso...........',
      '........orsdo...........',
      '.........odddo..........',
      '........oddddddo........',
      '.......odkwddddo........',
      '.......odddddddso.......',
      '.......oddddddso........',
      '..o.....odddddo.........',
      '.oro...oddddddddo.......',
      '.orso.odddddddddo.......',
      '.orsdoodddeeddddso......',
      '..orsddddeeeeddso.......',
      '..oorsdddeeeedddo.......',
      '...oorsddeeeeddso.......',
      '....oosddddddddo........',
      '.....oddddddddso........',
      '......oddddddso.........',
      '.......odddddo..........',
      '......r.oddo.r..........',
      '.....oro.odo.oro........',
      '....orsro.o.orsro.......',
      '........................',
    ],
  },

  voidwyrm: {
    pal: { o: '#090a14', a: '#151d28', b: '#202e37', c: '#394a50', d: '#577277', e: '#819796', k: '#090a14', w: '#a4dddb', g: '#73bed3', v: '#7a367b' },
    shiny: { o: '#090a14', a: '#341c27', b: '#602c2c', c: '#884b2b', d: '#be772b', e: '#de9e41', k: '#090a14', w: '#ebede9', g: '#e8c170', v: '#cf573c' },
    grid: [
      '........................',
      '....o..............o....',
      '...ovo............ovo...',
      '...ovco..........ocvo...',
      '...ovcco........occvo...',
      '....occdo......odcco....',
      '.....ocddddooddddco.....',
      '......oddddddddddo......',
      '.....oddddddddddddo.....',
      '.....odwgddddddgwdo.....',
      '.....odwgddddddgwdo.....',
      '.....oddddddddddddo.....',
      '......odddccccdddo......',
      '......odccccccccdo......',
      '.....odddddddddddo......',
      '....oddddddddddddddo....',
      '...odccoddddddddoccdo...',
      '..odco..odddddo...ocdo..',
      '..obo..oddddddddo..oo...',
      '..o...odddoooddo........',
      '......oddo...oddo.......',
      '.....ovvo....ovvo.......',
      '......oo......oo........',
      '........................',
    ],
  },

  // ============ MONSTERS (6) ============

  gloomshroom: {
    pal: { ...ramp(A.purple), k: '#10141f', w: '#ebede9', s: '#c7cfcc' },
    grid: [
      '........................',
      '.........oooo...........',
      '.......ooddddoo.........',
      '......oddddddddo........',
      '.....odddsddddsdo.......',
      '....odddddddddddddo.....',
      '...oddsddddddddsddo.....',
      '...odddddddddddddddo....',
      '..oddddddsddddddddo.....',
      '..occdddddddddddcco.....',
      '...oocccccccccccoo......',
      '.....occcccccco.........',
      '.....obcccccccbo........',
      '.....obcwkcwkcbo........',
      '.....obcwkcwkcbo........',
      '.....obccccccbo.........',
      '.....obccddccbo.........',
      '.....obcccccbo..........',
      '......obcccbo...........',
      '......obcccbo...........',
      '.....obbo.obbo..........',
      '......oo...oo...........',
      '........................',
      '........................',
    ],
  },

  goblin: {
    pal: { ...ramp(A.green), k: '#10141f', w: '#ebede9', r: '#a53030' },
    grid: [
      '........................',
      '..o..............o......',
      '.oco............oco.....',
      '.occo..........occo.....',
      '.occco.oooooo.occco.....',
      '..occccccccccccco.......',
      '...occcccccccccco.......',
      '..occcccccccccccco......',
      '..ocwkcccccccwkcco......',
      '..ocwkcccccccwkcco......',
      '..occcccccccccccco......',
      '...occrrrrrrrcco........',
      '...occcrrrrrccco........',
      '....occcccccccco........',
      '...occcccccccccoo.......',
      '..occcccccccccccco......',
      '..obccccccccccccbo......',
      '..obccccccccccccbo......',
      '...obccccccccccbo.......',
      '...obbcccccccbbo........',
      '....obbo..obbo..........',
      '...obbo....obbo.........',
      '....oo......oo..........',
      '........................',
    ],
  },

  batling: {
    pal: { o: '#1e1d39', a: '#402751', b: '#7a367b', c: '#a23e8c', d: '#c65197', k: '#090a14', r: '#cf573c', w: '#ebede9' },
    grid: [
      '........................',
      '.o....................o.',
      'obo..................obo',
      'obbo......oo........obbo',
      'obbbo....oddo......obbbo',
      'obbbbo..oddddo....obbbbo',
      'obbbbbo.oddddo..obbbbbo.',
      '.obbbbboddddddoobbbbbo..',
      '.obbbbddddddddddbbbbo...',
      '..obbddddddddddddbbo....',
      '...obdrwddddddrwddo.....',
      '...obdrwddddddrwdo......',
      '...obddddddddddddo......',
      '....oddwwddwwdddo.......',
      '....odddddddddddo.......',
      '.....oddddddddddo.......',
      '.....odddddddddo........',
      '......odddddddo.........',
      '.......odddddo..........',
      '........odddo...........',
      '.........odo............',
      '..........o.............',
      '........................',
      '........................',
    ],
  },

  boneling: {
    pal: { o: '#151d28', a: '#394a50', b: '#819796', c: '#a8b5b2', d: '#c7cfcc', e: '#ebede9', k: '#090a14' },
    grid: [
      '........................',
      '.......oooooo...........',
      '......oddddddo..........',
      '.....odddddddddo........',
      '.....oddddddddddo.......',
      '.....odkkddddkkdo.......',
      '.....odkkddddkkdo.......',
      '.....oddddddddddo.......',
      '......occcccccco........',
      '.......occcccco.........',
      '........occcco..........',
      '....oooccccccooo........',
      '...occocccccoccco.......',
      '...occ.occcco..cco......',
      '...oc..occcco...co......',
      '.......occcco...........',
      '......obccccbo..........',
      '......obcoocbo..........',
      '.....occo.occo..........',
      '.....obo...obo..........',
      '....occo...occo.........',
      '.....oo.....oo..........',
      '........................',
      '........................',
    ],
  },

  eyeling: {
    pal: { ...ramp(A.purple), k: '#090a14', w: '#ebede9', i: '#73bed3', j: '#4f8fba' },
    grid: [
      '........................',
      '........................',
      '.........oooooo.........',
      '.......ooddddddoo.......',
      '......odddddddddo.......',
      '.....odddddddddddo......',
      '....oddddwwwwddddo......',
      '...odddwwwwwwwwdddo.....',
      '...oddwwwiijiwwwddo.....',
      '..odddwwiijjiiwwdddo....',
      '..odddwwijkkjiwwdddo....',
      '..odddwwijkkjiwwdddo....',
      '..odddwwiijjiiwwdddo....',
      '...oddwwwiijiwwwddo.....',
      '...odddwwwwwwwwdddo.....',
      '....oddddwwwwddddo......',
      '.....odddddddddddo......',
      '......odddddddddo.......',
      '.......oodddddoo........',
      '..o......ooooo......o...',
      '.obo...c...c...c...obo..',
      '..o....o...o...o....o...',
      '........................',
      '........................',
    ],
  },

  imp: {
    pal: { ...ramp(A.red), k: '#090a14', w: '#ebede9', y: '#e8c170' },
    grid: [
      '........................',
      '..o...o........o...o....',
      '.oco.oyo......oyo.oco...',
      '.occo.oo......oo.occo...',
      '.occco.o......o.occco...',
      '..occcoooooooooccco.....',
      '...occccccccccccco......',
      '..occcccccccccccco......',
      '..ocwkccccccwkccco......',
      '..ocwkccccccwkccco......',
      '..occcccccccccccco......',
      '...occcwwwwwwcco........',
      '...occccwwwwccco........',
      '....occcccccccco........',
      '...occcccccccccoo.......',
      '..occcccccccccccco..o...',
      '..obcccccccccccbo..oco..',
      '..obcccccccccccbo.occo..',
      '...obcccccccccbo.occo...',
      '...obbcccccccbbo.oco....',
      '....obbo..obbo..oco.....',
      '...obbo....obbo..o......',
      '....oo......oo..........',
      '........................',
    ],
  },

  // ============ OBJECTS ============

  egg: {
    pal: { o: '#202e37', a: '#819796', b: '#c7cfcc', c: '#ebede9', d: '#a23e8c', e: '#7a367b' },
    grid: [
      '........................',
      '........................',
      '.........oooooo.........',
      '........occcccco........',
      '.......occcccccco.......',
      '......occcccccccco......',
      '.....occccdccccccco.....',
      '.....occcdedcccccco.....',
      '....occcccdcccccccco....',
      '....occccccccdccccco....',
      '....ocbcccccdedcccco....',
      '....ocbccccccdccccco....',
      '...ocbbccdccccccccco....',
      '...ocbbcdedccccccco.....',
      '...ocbbccdcccccccco.....',
      '...ocbbbccccccccbco.....',
      '....ocbbbccccccbbco.....',
      '....ocabbbbbbbbbaco.....',
      '.....ocabbbbbbbaco......',
      '......oaabbbbbaao.......',
      '.......ooaaaaaoo........',
      '.........ooooo..........',
      '........................',
      '........................',
    ],
  },
};

const SIZE = 24;

// Normalize any authored-grid irregularities at load (defensive):
for (const s of Object.values(SPRITES)) {
  s.grid = s.grid.map(row => (row + '.'.repeat(SIZE)).slice(0, SIZE));
  while (s.grid.length < SIZE) s.grid.push('.'.repeat(SIZE));
  s.grid = s.grid.slice(0, SIZE);
}

// Draw a sprite. opts: { flip, alpha, brighten, tint, shiny, breath (0|1) }
// breath=1 shifts the top 40% of rows down 1px: 2-frame Pokemon-Crystal idle.
export function drawSprite(ctx, key, x, y, scale, opts = {}) {
  const s = SPRITES[key];
  if (!s) return;
  const pal = (opts.shiny && s.shiny) ? s.shiny : s.pal;
  const grid = s.grid;
  const breathRow = Math.floor(SIZE * 0.4);
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  for (let r = 0; r < SIZE; r++) {
    const row = grid[r];
    const dy = (opts.breath && r < breathRow) ? 1 : 0;
    for (let c = 0; c < SIZE; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      let color = opts.tint || pal[ch];
      if (!color) continue;
      if (opts.brighten) color = brighten(color, opts.brighten);
      ctx.fillStyle = color;
      const cx = opts.flip ? (SIZE - 1 - c) : c;
      ctx.fillRect(Math.round(x + cx * scale), Math.round(y + (r + dy) * scale), Math.ceil(scale), Math.ceil(scale));
    }
  }
  ctx.restore();
}

export function spriteSize(key, scale) {
  return { w: SIZE * scale, h: SIZE * scale };
}

function brighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(255 * amt));
  const g = Math.min(255, ((n >> 8) & 255) + Math.round(255 * amt));
  const b = Math.min(255, (n & 255) + Math.round(255 * amt));
  return `rgb(${r},${g},${b})`;
}

// Standalone canvas for DOM use. opts passthrough (shiny, brighten, tint...).
export function spriteToCanvas(key, scale = 3, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = SIZE * scale; cv.height = SIZE * scale;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawSprite(ctx, key, 0, 0, scale, opts);
  return cv;
}

// Silhouette variant for the collection book's locked entries.
export function spriteToSilhouette(key, scale = 3) {
  return spriteToCanvas(key, scale, { tint: '#202e37' });
}
