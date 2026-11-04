# Æther Baseline Audit

**Date:** 2026-11-04
**Repository:** `/home/abdoodly/projects/ShuffledSeal.github.io-unstable`
**Branch / commit:** `master` / `f3442a7`

## Runtime And Entry Points

- Static vanilla HTML, CSS, and JavaScript; Canvas 2D and Web Audio.
- `/aether/` defaults to the Game Cartridges cabinet. The Observatory overview remains available through the sidebar.
- `index.html` loads shared app code, arcade games, Tour/cartridge systems, trials, and wonder rooms with deferred scripts.
- `grand-tour.html` remains a separate public expedition entry point.

## Playable Systems

| Area | Current entry | Input / loop |
| --- | --- | --- |
| Game Cartridges | `/aether/#voyage` | Starfall Skirmish, Aether Bastion, and Glass Labyrinth; standalone score records. |
| Grand Tour | cabinet's optional long-form mode | Seeded 12-leg route, hunts, trials, instruments, boss, saved active run. |
| Cosmic Arcade | `#arcade` | Planet Drop, Comet Surf, Stardust Dash, and Orbit Breaker. |
| Trials | Grand Tour route | 16 registered Canvas trials. |
| Wonder Rooms | `#discover` | Telescope, darkroom, worlds, orchestra, history, and related interactions. |
| Planetarium | `#planetarium` | Eight planets and puzzle progression. |

## Persistence Contracts

| Key | Owner | Compatibility risk |
| --- | --- | --- |
| `aether-observatory-v1` | `app.js` | Profile name, location, saved items, journal. |
| `aether-grand-tour-v2` | `voyage.js` | Active Tour and records; must retain old active-run shape. |
| `aether-cartridge-records-v1` | `voyage.js` | Standalone cartridge best scores. |
| `aether-wonder-rooms-v1` | `observatory.js` | Wonder-room progress and records. |
| `aether-planet-puzzles-v1` | `planets.js` | Planet puzzle progress. |
| `aether-flight-mode` | `skirmish.js` | Mouse or keyboard flight preference. |

## Automated Evidence

- `for f in ./*.js; do node --check "$f" || exit 1; done` passed before the current documentation increment.
- `npm run test:trials` verifies 16 registered Grand Tour trials.
- `npm run test:browser` verifies root cartridge landing, direct cartridge mounting, valid legacy-save loading, Tour pointer flight, retreat persistence across reload, corrupt-save recovery, scaled Comet Surf cancellation, Wonder Room pointer recovery, and Bastion upgrades.

## Confirmed Gaps

1. Browser smoke does not yet exercise all four arcade games, every trial lifecycle, or wonder-room save/reload flows.
2. Explicit versioned migrations do not yet exist for the six storage contracts; new schema changes need fixture coverage before release.
3. Mobile touch, reduced-motion, browser zoom, and performance evidence are not yet recorded.
4. No performance baseline is currently measured; do not claim performance optimisation without one.
5. The deployed GitHub Pages cache may lag a pushed commit; verify the public route after each publish.
