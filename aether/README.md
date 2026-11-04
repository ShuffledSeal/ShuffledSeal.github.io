# Æther · A private observatory

> **Cartographer’s Edition (4 November 2026):** An expanded playable Grand Tour build, not a finished £90 commercial release. See [PREMIUM-EDITION.md](PREMIUM-EDITION.md) for current changes and [ROADMAP.md](ROADMAP.md) for a prioritised plan, testing gates, and deployment instructions. To preview the new product landing page, open `grand-tour.html`.


A handcrafted, responsive celestial playground inspired by Victorian astronomical plates and Romantic oil paintings — with a slightly mischievous streak. Built with HTML, CSS, and vanilla JavaScript. No dependencies or build step.

## Continue development with OpenCode

The repository-root [`AGENTS.md`](AGENTS.md) is the concise implementation policy for coding agents; [`OPENCODE-QUALITY.md`](OPENCODE-QUALITY.md) supplies on-demand testing and gameplay criteria. [`OPENCODE-START.md`](OPENCODE-START.md) explains how to use the optional GPT-6.1 Sol `aether-director` agent at `.opencode/agents/aether-director.md` and includes a ready-to-paste first task. The agent files are development-only and do not affect the static game.

## Run

```sh
cd /path/to/ShuffledSeal.github.io-unstable/aether
python3 -m http.server 4173 --bind 127.0.0.1
```

Open **http://localhost:4173**. The app can also be deployed to any static web host.

Or run the local browser launcher from the Æther directory:

```sh
./run-aether.sh
```

It serves `grand-tour.html` on `127.0.0.1:4173` and opens the system browser when one is configured. Set `AETHER_PORT=8080` to use another port or `AETHER_NO_OPEN=1` to serve without opening a browser.

## Verification

The browser game has no runtime dependencies. Playwright is used only for development smoke checks:

```sh
npm install
npm run test:trials
npm run test:browser
```

The browser smoke test starts a local server and verifies the Grand Tour landing page, standalone route, hunt mount, scaled-canvas pointer flight, and uncaught browser errors.

## Explore

- A painted-sky frontispiece with an engraved brass dial, floating companions, subtle pointer parallax, a pokable sun, and your creations on display. Motion respects your device preferences.
- Interactive eight-planet orrery with playback, a time slider, and constellation charts.
- Planet details and a locally saved collection.
- Navigable celestial calendar with downloadable event reminders.
- Create, edit, delete, and export locally saved journal entries.
- Search planets, constellations, events, and pages with `/` or `Ctrl/Cmd + K`.
- Optional synthesized ambient audio, observer preferences, and reduced-motion support.

## The planetary atlas

Eight field guides — one per planet — each pairing illustrated plates and rounded reference figures (with a NASA fact-sheet link) with a puzzle game built from that world's own character. Forty levels in total, with undo, redo, solver-derived hints, par scoring, three-star records, and saved progress in local storage.

- **Mercury · Shadow circuit** — a Lights Out grid: switching a crater's light affects its neighbours.
- **Venus · Cloudworks** — rotate pipe tiles until pump and receiver share one continuous circuit.
- **Earth · Watershed** — connect every numbered pair with a continuous path and fill the whole grid.
- **Mars · Sample return** — push-only crate puzzles: plan the route, mind the corners.
- **Jupiter · Orbital lock** — coupled moon dials inspired by the Io–Europa–Ganymede resonance.
- **Saturn · Cassini passage** — sliding-block boards: clear a lane to the exit.
- **Uranus · Axis shift** — tilt the tray; every capsule slides together until something stops it.
- **Neptune · Storm runner** — inertia navigation on limited fuel, visiting buoys in order.

## The Grand Tour

### Cartridge cabinet

The Voyage landing is now a cartridge-first anthology. These direct, replayable routes have their own personal-best records and never alter an in-progress Grand Tour save:

- `index.html?standalone=1&cartridge=shooter#voyage` — Starfall Skirmish score attack.
- `index.html?standalone=1&cartridge=bastion#voyage` — Aether Bastion strategy run.
- `index.html?standalone=1&cartridge=labyrinth#voyage` — Glass Labyrinth stealth run.
- `index.html?standalone=1&cartridge=starforge#voyage` — Starforge orbital factory contracts. Align moving Mirror, Conductor, Furnace, and cooling devices with their gate marks, deliver ember units, use a one-time emergency vent, survive eclipses, and defeat the Dying Clock.

The twelve-leg Grand Tour remains available as the optional long-form expedition below the cabinet. Aborting a hunt or trial costs one hull; non-combat locations provide a clear no-reward exit.

A run-based roguelite expedition from the Sun's doorstep to the Umbral Maw at Neptune. Arena **hunts** are the core game — sharp twin-stick movement, a burst dash with i-frames, telegraphed enemies (chasers, weavers, shards, maws), waves, and a two-phase boss. Around them: rule-rewriting **instruments** (drafts and the chandlery), trials that pay salvage, oddities with consequences, and sanctuaries. Death resets the run; what persists is knowledge, records, and new hulls in the hangar.

- **Hunts** — three waves per sector, elites at finales, stardust motes off every kill.
- **Instruments** — Lodestone Coil, Echo Plate, Prism Lens, Rime Coating, Static Net and more; their verbs also rewrite the trials (wells bend gravity in Free Return, echoes repeat actions, parallax doubles every fifth success…).
- **Trials** — sixteen distinct cartridges: the original cosmic challenges plus Aurora Loom, Alignment Clock, Umbra Terminal, Occultation, Constellation Chain, Perihelion Run, Aether Bastion, and Glass Labyrinth. In Aether Bastion, select an installed tower and press `Q` or `E` to commit it to one of two upgrade paths; refine it twice, or right-click to reclaim alloy.
- **Hull forms** — Swift Kite is yours; the Iron Bell and Moth Wing unlock through play.

Each arcade game also offers **three persistent fieldwork seals** (twelve total), tracking meaningful goals within individual runs. After progressing far enough in a run, you may invoke a **Stellar Pact** with **C** or the in-game button: a twelve-second double-score wager that ends early if you take a hit; shields cannot protect you from that hit. Your seals and personal records carry forward across attempts. Complete the first seal in each arcade game, then claim the Orchestra’s first musical constellation to uncover the **Observatory Chorus** achievement in the discovery cabinet.

## The cosmic arcade

Four hand-rolled canvas games with saved expedition records, a shared daily seed, pause, optional sound, theatre view, charge-up abilities, and a small roguelite layer. During a run you earn up to four picks from twenty-four mechanical relics; picks visibly change play, and paired relics unlock named synergies. Discoveries stay in a permanent field guide while powers begin fresh each run.

- **Planet Drop** — a floatier Suika-style merge game with squash-and-stretch physics, chain-reaction combos, guided throws, shockwaves, merge attraction, and an earned nudge for awkward stacks.
- **Comet Surf** — hold to swing around a planet, release to slingshot through gold rings. Longer tethers, charged launches, moving rings, shields, and flight relics change each route.
- **Stardust Dash** — seventy-five seconds of meteor-shower surfing: catch stars, dodge pink rocks, build shields, catch jellyfish, dash through danger when charged, and grab drifting power-ups like the Lodestone Bloom and Clock Moth before they pass.
- **Orbit Breaker** — cosmic pinball: steer a paddle around a circular arena and shatter every crystal in the constellation. Twin comets, shatter chains, wider paddles, and return wards can turn a run wonderfully chaotic.

## The wonder rooms

Six interactive experiments that share a persistent discovery passport:

- **The telescope** — pan a drifting illustrated sky, focus, compose real photographs, and trace constellations in the pocket star atlas.
- **The celestial darkroom** — lower your capture into the developer bath, then master three measurable development recipes without losing your own finish.
- **The world workshop** — paint continents, craters and storms, fulfil playful world commissions, and summon an undoable comet impact.
- **The orrery orchestra** — a four-voice sequencer with beat-reactive planets, a call-and-answer improviser, and reversible score variations; play it live or download a WAV recording.
- **The cabinet of lost nights** — blink-comparator detective work across four real discoveries, plus a fast three-sky blink desk for practice.
- **Letters made of light** — solve four increasingly elaborate mirror routes, preserve your drafted message, and watch it travel to another world.

Follow **The missing astronomer** mystery through the rooms — four fragments of a word hide along the way — then arrange everything you earned in the **discovery cabinet**, a rearrangeable keepsake shelf with stamps, themes, an expedition archive, and a rank that grows with your stardust.

Everything is dependency-free vanilla HTML/CSS/JS; games run on hand-rolled fixed-timestep canvas physics with seeded daily courses.

This is an imaginative, offline-first observatory. The orbital model is illustrative, not an ephemeris; celestial event dates are a curated 2026 almanac. Moon illumination is an approximation based on the synodic lunar cycle. All personal data is stored in this browser's local storage. Fonts and artwork are served locally.

## Credits

- Background painting: **Thomas Cole, _The Voyage of Life: Old Age_ (1842)**, National Gallery of Art. Public domain. [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Thomas_Cole_-_The_Voyage_of_Life_Old_Age,_1842_(National_Gallery_of_Art).jpg).
- Typography: **Cormorant Garamond** by Christian Thalmann and **DM Sans** by Colophon Foundry, licensed under the SIL Open Font License. Font licenses are in `assets/`.
- Celestial plates, planet textures, and interface illustrations are custom SVG/Canvas artwork.
