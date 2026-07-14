# Pixel Familiars 像素魔寵 - Design Document

Date: 2026-07-14
Status: Approved (autonomous /goal session; decisions derived from goal statement)

## Product

An offline-capable idle pixel-art pet-raising game. Players collect fantasy
"familiars" (魔寵) that auto-battle monsters, level up, and evolve. The game
runs in any browser, installs to the desktop as a PWA, and keeps progressing
while closed (offline earnings computed from elapsed time). Revenue comes from
ads, primarily rewarded ads via Google AdSense H5 Games Ads.

Target user: casual idle-game players, zh-TW and EN (auto language detection).

## Core Loop

1. Team of up to 4 familiars auto-battles monster waves on a canvas battle scene.
2. Kills drop gold and XP. Every 10th wave is a boss; beating it advances the zone.
3. Gold buys team upgrades (attack, HP, gold gain, offline cap).
4. Gems (earned from bosses, achievements, rewarded ads) buy eggs.
5. Eggs hatch familiars of 5 rarities (common/uncommon/rare/epic/legendary).
6. Familiars evolve at level 10 and 25 (stat boost and sprite change).
7. Closing the game keeps progress: on return, elapsed time is converted to
   gold/XP/waves ("Welcome back" modal). Watching a rewarded ad doubles it.

## Offline Progression Model

- Save timestamp on every persist (localStorage, versioned schema).
- On load: `elapsed = clamp(now - lastSeen, 0, offlineCapHours)`.
- Offline gains = elapsed * (current kill rate * avg drop), at a 60% efficiency
  factor so active play stays optimal. Cap starts at 8h, upgradeable to 24h.
- No tab needs to stay open. The PWA also works fully offline via a
  cache-first service worker.

## Monetization (ads)

- `js/ads.js` abstraction with two backends:
  - **AdSense H5 Games Ads** (`adBreak`/`adConfig` Ad Placement API) when a
    publisher ID is configured in `js/config.js`.
  - **Dev stub** otherwise: simulated 3s ad overlay so the whole flow is
    testable before AdSense approval.
- Placements (rewarded-first, interstitials sparing):
  - Reward: double offline earnings (welcome-back modal).
  - Reward: free egg (1/day escalating cooldown).
  - Reward: 10-minute 2x speed boost.
  - Interstitial: on zone advance, at most one per 5 minutes.
- README documents the AdSense approval flow and where the publisher ID goes.

## Tech Choices

- **No build step.** Vanilla JS ES modules, one `index.html`, static hosting
  (GitHub Pages ready). Rationale: fastest 0-to-1, zero toolchain rot.
- **Canvas** battle scene; DOM for menus/panels. Pixel sprites are authored as
  16x16 char-grid matrices with palettes in `js/sprites.js`, rendered scaled
  with `imageSmoothingEnabled = false`.
- **PWA**: `manifest.webmanifest` + `sw.js` (cache-first app shell) so the
  game installs to the desktop/dock and runs with no network.
- **Save**: localStorage JSON, `version` field + migration hook; export/import
  string in settings.
- **i18n**: `js/i18n.js` dictionary, zh-TW + EN, auto-detect with manual toggle.
- **Tests**: `node --test` for pure logic (combat math, offline calc, egg
  rarity distribution, save migration). Rendering/UI verified in browser.

## Module Map

```
index.html            app shell, panels, canvas
css/style.css         pixel UI theme
js/config.js          ad client id, tunables
js/i18n.js            strings zh-TW/en
js/data.js            species, zones, upgrades, rarity tables
js/sprites.js         pixel grids + palette renderer
js/game.js            state, tick loop, combat math, offline calc
js/save.js            persist/load/migrate/export
js/ads.js             adBreak wrapper + dev stub
js/battle.js          canvas rendering, particles, damage numbers
js/ui.js              panels, modals, welcome-back flow
js/main.js            bootstrap
sw.js                 service worker
manifest.webmanifest  PWA manifest
icons/                 192/512 png (generated pixel art)
```

## Visual Direction

Dark fantasy pixel theme: deep indigo background, warm gold accents, chunky
pixel borders, bitmap-feel font. One striking interactive moment: the battle
scene itself: constant motion, hit flashes, floating damage numbers, particle
bursts on kills, screen shake on boss defeat. UI follows
make-interfaces-feel-better guidelines (tabular numbers, hover states,
enter/exit animations, optical alignment). No em dashes in any copy.

## v1 Scope Cuts (YAGNI)

- No accounts/cloud save (export string instead).
- No prestige system (zones scale far enough for weeks of play).
- No sound in v1 (toggle stub reserved).
- No IAP; ads only.

## Success Criteria

- Cold load to playable < 1s on desktop.
- Full loop playable: battle, level, evolve, hatch, upgrade, zone advance.
- Close browser 1h, reopen: welcome-back modal with correct earnings, 2x ad works (stub).
- Installable PWA passing Chrome install criteria; runs offline after first load.
- All `node --test` suites green.
