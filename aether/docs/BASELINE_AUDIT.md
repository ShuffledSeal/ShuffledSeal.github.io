# Æther Baseline Audit

**Date:** 2026-11-04
**Repository:** the `aether/` subdirectory of the `ShuffledSeal.github.io` GitHub Pages repository
**Branch / commit:** `main` / `8cfd823`, plus uncommitted working-tree changes (versioned save fixtures under `tests/fixtures/`, save-recovery coverage in `tests/browser-smoke.mjs` and `voyage.js`, and documentation edits)

## Runtime And Entry Points

- Static vanilla HTML, CSS, and JavaScript; Canvas 2D and Web Audio.
- `/aether/` defaults to the Observatory overview. The Game Cartridges cabinet is at `#voyage`.
- `index.html` loads shared app code, arcade games, Tour/cartridge systems, trials, and wonder rooms with deferred scripts.
- `grand-tour.html` remains a separate public expedition entry point.

## Playable Systems

| Area | Current entry | Input / loop |
| --- | --- | --- |
| Game Cartridges | `/aether/#voyage` | Starfall Skirmish, Aether Bastion, Glass Labyrinth, and Starforge; standalone score records. |
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
- `npm run test:browser` verifies root cartridge landing, direct cartridge mounting, mount/teardown of every registered trial, arcade game selection, calendar/journal/puzzle routes, Wonder Room routes with telescope/world pointer recovery, Tour pointer flight and retreat persistence across reload, scaled Comet Surf pointer-cancel handling, narrow-screen Starforge layout, Bastion site/upgrade flow, and uncaught browser errors.
- Save safety coverage (working tree; fixtures not yet committed): `tests/fixtures/legacy-saves-v0.json` loads cleanly, `tests/fixtures/malformed-saves.json` recovers with hull values clamped and unknown instruments rejected, corrupt JSON falls back safely, and unrelated localStorage keys are preserved.

## Confirmed Gaps

1. Browser smoke does not yet exercise all four arcade games, every trial lifecycle, or wonder-room save/reload flows.
2. The Grand Tour now has a versioned, fixture-covered migration boundary; other save schemas still need an explicit version before their next structural change.
3. Mobile touch, reduced-motion, browser zoom, and performance evidence are not yet recorded.
4. No performance baseline is currently measured; do not claim performance optimisation without one.
5. The deployed GitHub Pages cache may lag a pushed commit; verify the public route after each publish.
