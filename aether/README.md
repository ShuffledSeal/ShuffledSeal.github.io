# Æther · A private observatory

> **Cartographer’s Edition (13 November 2026):** A substantial static anthology with linked planetary expeditions, expanded Veteran cartridges, arcade finales, and a shared Gothic observatory. This is not a claim of commercial pricing, external playtesting, or cross-browser certification. See [PREMIUM-EDITION.md](PREMIUM-EDITION.md) for earlier changes and [ROADMAP.md](ROADMAP.md) for future ideas, testing gates, and deployment instructions. Open `grand-tour.html` for the title screen.


A handcrafted, responsive celestial playground inspired by 1500s astronomical manuscripts, armillary diagrams, engraved brass, and Romantic oil paintings — with a slightly mischievous streak. Built with HTML, CSS, and vanilla JavaScript. No runtime dependencies or build step.

## Continue development with OpenCode

The repository-root [`AGENTS.md`](AGENTS.md) is the concise implementation policy for coding agents; [`OPENCODE-QUALITY.md`](OPENCODE-QUALITY.md) supplies on-demand testing and gameplay criteria. [`OPENCODE-START.md`](OPENCODE-START.md) explains how to use the optional GPT-6.1 Sol `aether-director` agent at `.opencode/agents/aether-director.md` and includes a ready-to-paste first task. The agent files are development-only and do not affect the static game.

## Run

```sh
cd /path/to/ShuffledSeal.github.io-unstable/aether
python3 -m http.server 4173 --bind 127.0.0.1
```

Open **http://localhost:4173** to enter the Observatory overview. Game cartridges remain at `#voyage`. The app can also be deployed to any static web host.

Or run the local browser launcher from the Æther directory:

```sh
./run-aether.sh
```

It serves `grand-tour.html` on `127.0.0.1:4173` and opens the system browser when one is configured. Set `AETHER_PORT=8080` to use another port or `AETHER_NO_OPEN=1` to serve without opening a browser.

## Verification

The browser game has no runtime dependencies. Playwright is used only for development checks:

```sh
npm install
npm test                 # Complete Python/Chromium release regression
npm run test:deepfield  # Focused Minesweeper rules, modes, input and lifecycle
npm run test:trials     # Node registry check
npm run test:browser    # Full Node browser smoke
npm run test:cartridges # Node cartridge depth
npm run test:cabinet    # Desktop/mobile cabinet smoke
npm run test:ui         # Capture and validate the real UI gallery
npm run test:motion     # Book motion, tilt, silent scores, continuity and reduced motion
npm run test:collection # Research ordering, notes, guided study and export
npm run test:replays    # All eight generators and a complete circuit
npm run test:eclipse    # Eight Eclipse boards, reserves, unlocks and a real solve
npm run test:veteran    # Veteran unlocks and per-engine rules
npm run test:upgrades   # Illustrated upgrades, readable text and stable scores
npm run test:tour-exit  # Voyage save/exit, resume and confirmed abandon
npm run test:veteran-content # Expanded acts, chambers, charts and contracts
npm run test:foundry    # Meridian, Stillpoint and Ember Covenant mechanics
npm run test:action     # Chain, Perihelion and Grand Tour route integration
npm run test:skirmish-veteran # Cantor telegraphs, refits, victory and teardown
npm run test:premium    # Bastion sappers/Wards and Labyrinth scanners/jammer
npm run test:arcade-expeditions # All four arcade Masterwork rule expansions
npm run test:arcade-mechanics # New arcade verbs, keyboard and 48px touch controls
npm run test:combat-mechanics # Reversal, Star Cast, Siphons and Corona braking
npm run test:strategy   # Bulwarks, guard AI, proofs and cooling routing
npm run test:puzzle-mechanics # Eight solver-verified alternate puzzle instruments
npm run test:relics     # 46 typography, contrast, focus and scrolling audits
npm run test:relic-audit # Independent 24-scenario legibility review
npm run test:masterwork # Arcade seal gating and separate record books
npm run test:deep-combat # Consonance/Cadenza, Black Office, Verger and phone HUDs
npm run test:deep-premium # Three-office Warden and production-speed Meridian
npm run test:deep-foundry # Visible-logic Nocturne and Nocturne Machina
npm run test:deep-arcade # Four arcade finales, touch controls and phone HUDs
npm run test:deep-puzzles # All 32 Grand Expedition stages and save provenance
npm run test:gothic    # Shared presentation, Veteran headers and real game captures
```

If Node is unavailable but Python Playwright and its Chromium browser are installed, the release path is registered to run **thirty suites**: Deep Field rules, the cross-game release audit, browser integration, cartridge cabinet, motion continuity, research collection, replay charts, Eclipse masterworks, Veteran Sky, upgrade readability, Grand Tour exit, expanded Veteran content, Foundry expansions, action trials, combat mechanics, the Skirmish finale, premium trials, arcade expeditions, arcade mechanics, strategy mechanics, puzzle mechanics, relic typography, the independent relic audit, Masterwork routing, deep combat, deep premium trials, deep Foundry, deep arcade, deep planetary expeditions, and Gothic presentation. They cover the six-card flagship cabinet and all ten direct game routes, standard campaigns and input/lifecycle contracts, all sixteen trial mount/pause/destroy cycles, real puzzle solves, 32 solution-backed Grand Expedition stages and their save provenance, responsive layouts, reduced motion, research export, the new combat/Foundry/arcade mechanics, production-speed Meridian, and old/malformed save fixtures. **The complete integrated run finished on 13 November 2026 with all 30 suites passing; see the current verification record below.** These checks are Chromium-only in this environment, and the Node command remains unavailable. Automated clears and reviewed seeds are not external human balance certification; save compatibility statements are scoped to the tested fixtures and migration paths, not every possible browser store. The Python/Chromium path does not replace the unexecuted Node depth suites or human playtesting.

**Integrated release verification (13 November 2026): ALL 30 Python/Chromium suites passed.** Independent cross-review closed the combat boss, determinism and touch issues; Foundry retry, Ward, callback, pause, topology and touch-removal issues; puzzle route, save, preview, drag and provenance issues; premium production Warden/Meridian reliability, including the production **1.18× base-gadget Meridian** clear; and arcade phone-HUD, Regent, Focus, shade and pacing issues. The evidence includes **46 typography audits**, the independent **24/24 relic audit with zero defects**, **19 Gothic presentation states and 42 screenshots**, **32 deterministic puzzle stages**, and essential **14px tactical/HUD text**. Standard fixture and tested save-migration compatibility passed within those checked paths.

Final-run arcade measurements put the **Binary Regent clear on attempt 1** and the **Last Cathedral clear at 251.275 simulated seconds**. Reviewed automated Breaker results spanned **160–260 simulated seconds**; this is a tested range, not a guaranteed human session length. These results are Chromium-only. The Node command was unavailable, so Node-only suites were not executed. Automated clears and reviewed seeds are not external human balance certification. Physical devices, Firefox, Safari, broader accessibility review, commercial readiness, and perfection remain unclaimed.

Release verification (12 November 2026): all twenty-four Python/Chromium release suites passed. Evidence includes 320 deterministic Deep Field boards; all eight Eclipse and eight alternate-instrument puzzle solutions, with every new instrument solved through real UI controls; Cantor, Astral Crucible and Ember Covenant completions; every new combat, strategy and arcade mechanic through keyboard/pointer input; and 48px touch controls for the new arcade verbs. Forty-six typography audits cover 390/768/1440px, reduced motion, scrolling and DPR-2 200% rendering. The unchanged independent audit reaches 24/24 scenarios with zero defects across 309 text samples and 114 enabled controls; its earlier 21-defect snapshot and resolutions are preserved in [`docs/relic-legibility-audit.md`](docs/relic-legibility-audit.md). Chromium parsed all 23 shipped JavaScript files and reported no uncaught exceptions. Node was unavailable, so the checked-in Node depth suites were **not executed** in this environment. Physical-device, cross-browser, accessibility-at-scale and external balance/playtesting remain unclaimed.

Cabinet of Wonders verification (11 November 2026): all eleven release suites were rerun and passed after the motion, research, replay, Veteran Sky, upgrade-readability, Grand Tour exit, and expanded-content work. `python3 tests/ui-gallery.py` also captured thirteen real 1440×1000 and 390×844 screenshots in [`docs/ui-proof/`](docs/ui-proof/), including the research cabinet, a live Daily Chart, and a mid-transition book page turn. The gallery verifies historical engravings, six cartridge sigils, four illustrated hulls, atlas portraits, visible desktop profile controls, book cleanup, and no tested horizontal overflow or uncaught browser exceptions. These are browser captures, not design mockups; visual taste and physical-device review remain human judgements.

Development check (5 November 2026): the Python browser integration passed in headless Chromium; additional browser-driven runs cleared Bastion’s six sieges, Hunt’s three acts (with two drafts), and Chain’s five encounters with four relic drafts and a final boss. A Labyrinth run reached its relic draft and entered a generated chamber; 1,600 generated Labyrinth rooms checked in the browser had no disconnected key, seal, fragment or exit. Bastion’s unbuilt first siege produced one defeat. The five new Node/Playwright depth suites are checked in but were **not executed** on the development machine (Node was unavailable). Balance, controller/touch readability and cross-browser behaviour still need human verification.

The browser smoke test starts a local server and verifies cartridge persistence, all registered trials, arcade selection, calendar/journal/puzzle interactions, Wonder Room routes, scaled-canvas pointer recovery, narrow-screen layout, checked-in legacy/malformed save fixtures, and uncaught browser errors.
The cartridge depth test starts its own local server and plays all six Starforge contracts plus a misaligned failure and a pause/vent run, a clean Labyrinth seal extraction and timed loss, both Skirmish refits and a defeat, Bastion's endless siege and no-build loss, and a Bastion campaign planning/launch check. Bastion's endless siege pauses after each wave to forecast a lane favoured by the next threat mix, not a guaranteed spawn location; its finite campaign now has six authored sieges instead of the former timed three-wave mission. Place or refine towers, then choose Repair, Overdrive (+30% tower damage this wave), or Save. In the campaign Repair restores 2 core for 60 alloy, Overdrive costs 80, and Save grants +15 on a clear; in endless mode Repair restores 1 core and both paid orders cost 120. Use the buttons or Z/X/C; 1–4 still selects towers. The new focused `test:hunt`, `test:bastion`, `test:chain`, `test:labyrinth`, and `test:planets` scripts exercise these expanded paths. Virtual game time speeds up long contracts, but this is not a substitute for human balance testing across seeds or devices.

## Explore

- **The midnight Gothic Observatory:** `gothic.css` unifies midnight-blue/black enamel, oxblood mahogany, tarnished brass, ivory etching, pointed arches, stained glass, and illuminated-manuscript detail. Original local `gothic-window.svg`, `gothic-frame.svg`, and `relic-seal.svg` join the existing bespoke instruments and Wellcome public-domain engravings; their provenance is recorded in `assets/ENGRAVINGS.md`. The title screen, Observatory, atlas, puzzle rooms, arcade, cabinet, and game frames share the same visual language without filtering gameplay canvases. Motion respects device preferences.
- **Cinematic but optional motion:** a two-page book route transition, staggered folio entrances, instrument wake-up calibration, subtle pointer tilt, stable non-flashing score readouts, scroll reveals, ambient celestial drift, and reduced-motion alternatives.
- **A contextual observer’s path:** the overview uses real puzzle, cartridge, journal, and research progress to suggest a useful next chapter without streaks or daily chores.
- **A working research cabinet:** ordered shelves with arrow/drag sorting, searchable marginalia, type/study filters, title/recent sorting, guided book-style study, linked journal observations, study status, and Markdown field-guide export. Existing saved IDs and journal data remain intact; ordering, notes, opened dates, and study state use a separately validated save key.
- **Readable, illustrated upgrades:** bespoke SVG instrument icons, dark Victorian ink on parchment, 16px primary relic effects and 14px secondary explanations, at least 1.5 line-height on descriptive copy, high-contrast 3px focus indicators, contained mobile/zoom scrolling, and stable scores with no high-frequency flashing.
- **Responsive tactical readouts:** essential combat, premium, Foundry, and arcade HUD information has DOM alternatives at 14px or larger on phone layouts, with 44–48px primary touch controls. These supplement rather than replace the fixed-resolution canvas artwork.
- **Safe Grand Tour navigation:** Save & Leave appears on the chart and every encounter, including the relay. The current run persists and only its active encounter restarts on return. Confirmed abandonment preserves unrelated records and uses modal-safe action delegation and complete game teardown.
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
- **Jupiter · Orbital lock** — plan coupled moon burns before spending moves. Dashed needles preview every moon’s landing; adjust the plan, then launch it. Five authored routes now have known solutions and par counts.
- **Saturn · Cassini passage** — sliding-block boards: clear a lane to the exit.
- **Uranus · Axis shift** — tilt the tray; every capsule slides together until something stops it.
- **Neptune · Storm runner** — inertia navigation on limited fuel, visiting buoys in order.

Every planet also offers **Daily Charts** and a **three-board Circuit**. Daily boards use a fixed UTC date; circuits deal difficulties 1, 3 and 5 from a shareable numeric seed. All eight generators are deterministic, seed-sensitive, cancellable and solution-backed, including Jupiter’s independently seeded dial scrambling. Replay actions, hints, wins, stars and last mode resume through the separate `aether-planet-replays-v1` store, leaving crafted records and endless bests untouched.

Sealing all three Circuit boards on a planet unlocks its **Eclipse masterwork**: a fixed fourth board with a verified solution, a genre-specific finite reserve, and a separate best record. Mercury limits switches, Venus rotations, Earth survey moves, Mars rover steps, Jupiter burns under reversed three-moon coupling, Saturn slides, Uranus tilts, and Neptune fuel. Eclipse drafts resume after reload, support undo/restart recovery, and are added to the existing replay store without changing crafted or endless saves; legacy completed Circuits unlock them automatically.

Sealing Eclipse unlocks a separate **Instruments** chart with another solver-verified ruleset: Mercury’s Cross/diagonal Prism switches, Venus’s rotation/Mirror wrench, Earth’s paired long-range gates, Mars’s single-use pull winch, Jupiter’s immediate phase exchanges, Saturn’s centre-pivot block rotation, Uranus’s selected-capsule anchors, and Neptune’s wind rides versus precise one-square Pulse legs. Every board replays its stored solution through the actual transition and win rules before it is offered. Hints, undo/redo, reloadable drafts, records and reduced motion work under the new rules; all earlier modes remain isolated and unchanged.

Sealing Instruments unlocks an optional four-chamber **Grand Expedition** on that planet: **32 deterministic, seed-sensitive stages across all eight engines**, each with a solution-backed action plan, moving native mechanisms, ordered wards, and a finale. Energy is shared across all four stages; undo and chamber restart restore the current chamber’s energy, while sealed chambers retain their actual cost. Expedition drafts and records are additive. Record provenance is rebuilt from contiguous, verified chamber replays, so non-contiguous or forged completions cannot award a finale record, valid prefixes recover with their exact prior energy cost, and unverified totals are not promoted to best. In the tested migration fixtures, crafted, Daily, Circuit, Eclipse, and Instruments saves remain byte-for-byte isolated from expedition data; malformed additive data recovers without damaging those existing records.

Each planet now shows a level-specific lesson, a contextual next-action instruction and feedback explaining the last move. Rovers, crates, capsules, probes and ring blocks glide from their actual visual positions—even during rapid consecutive inputs—while pipes, rivers and orbital dials animate their changed state. Blocked moves give mechanical refusal feedback, and solved plates finish with an engraved-light celebration. Reduced motion keeps the same immediate rules without cosmetic travel or particles. Existing level records, undo/redo and solver hints remain in place; Jupiter’s burn plan is free to edit, but its launched burns each cost one move.

## The Grand Tour

### Cartridge cabinet

The cartridge cabinet at `#voyage` is an optional anthology destination; the bare `/aether/` route opens the Observatory overview. These direct, replayable routes have their own personal-best records and never alter an in-progress Grand Tour save. Six flagship cartridges appear once, with working Action and Strategy filters and concise feature labels. Planet Drop, Comet Surf, Stardust Dash, and Orbit Breaker remain available through the linked Cosmic Arcade and their existing direct URLs, without duplicating cards or disturbing their records. Five flagship cartridges offer three modes — an authored **Campaign**, an **Endless run**, and a seeded **Daily Vigil**. Starforge has six connected contracts; the four original arcade cabinets offer immediate play and Daily Vigil:

- `index.html?standalone=1&cartridge=shooter&mode=campaign#voyage` — Starfall Skirmish. A three-act authored hunt with scheduled enemy packets and telegraphed entries. Four selectable weapon families (1–4 or the armoury bar): Pulse (steady mid-range), Scatter (short five-pellet fan), Lance (hold-to-charge piercing shot), Mortar (delayed area blast). Between acts, draft an instrument for the rest of the hunt. Endless mode keeps the Reinforce/Overclock field refits between waves.
- `index.html?standalone=1&cartridge=bastion&mode=campaign#voyage` — Aether Bastion. Six authored sieges with a planning phase: read the manifest (lanes, hull types, counts), place towers, then launch. Enemy armour, runners, lane currents and a final Titan demand complementary towers; refine with Q/E, set front/heavy targeting with R, sell with right-click, double time with F.
- `index.html?standalone=1&cartridge=labyrinth&mode=campaign#voyage` — Glass Labyrinth. A seeded stealth roguelite: four chambers with generated, connectivity-validated layouts, Watcher encounter profiles, and a relic draft between chambers (six relics with real tradeoffs — longer veil vs faster decoys, faster movement vs quicker alarms, and so on). Endless mode keeps the authored first circuit and generates sharper rooms on later circuits.
- `index.html?standalone=1&cartridge=starforge#voyage` — Starforge orbital factory contracts. The Mirror catches the core ray at the fixed top gate; Conductor at right carries it, Furnace at bottom converts it. The on-screen guide and gate links show alignment and missing devices. Replacing a device moves it (it cannot silently duplicate). Align the cooling devices too, deliver ember units, vent once, survive eclipses, and defeat the Dying Clock.
- `index.html?standalone=1&cartridge=chain&mode=campaign#voyage` — Constellation Chain. Five authored encounters ending in a boss, with three switchable formations (F) that change range and fire rate, and relic drafts between encounters — eight relics with stacking ranks (extra targets, piercing, magnetism, shields, novas, speed, frost, a Space-bar pulse).
- `index.html?standalone=1&cartridge=merge#arcade` — Planet Drop. Aim and merge matching worlds without overflowing the jar.
- `index.html?standalone=1&cartridge=hop#arcade` — Comet Surf. Hold to orbit, release to slingshot through golden rings.
- `index.html?standalone=1&cartridge=dash#arcade` — Stardust Dash. Catch stars and power-ups in the Quick Forecast or full Moonboat Expedition.
- `index.html?standalone=1&cartridge=breaker#arcade` — Orbit Breaker. Steer the orbital paddle and shatter every crystal without losing the final comet.
- `index.html?standalone=1&cartridge=deepfield&mode=campaign#voyage` — Deep Field, a complete Minesweeper cartridge. Three board classes (9×9, 12×10, 16×12), a three-chart campaign, escalating endless boards and deterministic Daily Vigils. Protected first openings, flood reveals, chording, flag/question cycles, Oracle hints, three expedition relics, zoom, optional sound, active-time scoring, long-press/touch flag mode and full keyboard controls. The same engine powers Deep Field in the Grand Tour.

The twelve-leg Grand Tour remains available as the optional long-form expedition below the cabinet. Aborting a hunt or trial costs one hull; non-combat locations provide a clear no-reward exit.

Starfall Skirmish, Aether Bastion, Glass Labyrinth, Constellation Chain, Planet Drop, Comet Surf, Stardust Dash, Orbit Breaker, and Deep Field offer **Daily Vigil** from their cartridge screen or mode switch. Each uses the same local-date encounter seed on repeat attempts and saves a separate best for that day (alongside existing records); it needs no account or network. Glass Labyrinth remixes the opening watcher positions for the daily run. Starforge instead retains its six authored contracts and independent replay/score chase. Campaign clears are counted per flagship cartridge on the mode screen.

Clearing a flagship campaign unlocks **Veteran Sky**, a separately recorded mechanics expansion rather than a cosmetic badge. Standard campaigns remain three Skirmish acts, six Bastion sieges, four Labyrinth chambers, five Chain encounters, three Deep Field charts, and six Starforge contracts. Veteran Sky adds:

- **Starfall Skirmish:** the three-stage Ossuary Bell and its Deacon wards. Alternating real weapon hits builds **Consonance**; `R` spends it on **Cadenza** censers that inherit the equipped weapon and erase hostile bolts. Crossing a live Deacon tether severs its protection, while repeat severs cannot duplicate the objective or resource bounty. Reversal, weapon drafts, and the other standard controls remain intact.
- **Aether Bastion:** three-office sieges with regroup windows, **tower actives**, Needle/Prism/Ward synergies, and brass **lane crossings** that physically divert hulls. The final office telegraphs the **Gilded Warden’s** lane shifts and interruptible core ritual; Cantors hasten and repair escorts until countered.
- **Glass Labyrinth:** coordinated Watchers, working brass doors, linked relays, and the **Meridian heart**. Keys expose the relay objective, relays change the Warden’s phases and open the heart route, and doors alter real traversal. The complete keys → relays → Warden → heart → escape route is also exercised at production **1.18×** speed, not only at an accelerated review timescale.
- **Constellation Chain:** **Star Cast** sacrifices a tail link for a formation-specific attack; **Link Lattice** spends Dedication to damage contacts and sever live beams. The **Black Office** seals ordinary damage until both Deacon objectives are resolved, and Ivory/Oxblood route vows trade recovery against added threats and score.
- **Deep Field:** the three-movement **Nocturne** expedition adds public row/column **canticles**, bounded telegraphed **rifts** that veil rather than create novae, recoverable ivory seals, and a three-plate **logical finale** solved from exact visible totals. Standard campaign generators and first-click protection remain separate and unchanged.
- **Starforge:** the **Nocturne Machina** adds four inner sockets, radial/wrap-aware topology, conjoined-choir links, and Cooling/Forge/Ward buses. Prime the anvil, discharge the choir, then arm a Ward and seal the **three-phase Heart**; early Ward stocking and sealing from the wrong bus do not complete the machine.

Direct links enforce the existing campaign-clear unlocks, and Veteran records remain separate; Veteran wins never advance standard Starforge contracts. These compatibility statements cover the checked old-save and unlock fixtures, not a claim that every arbitrary store has been tested. **Perihelion Run** adds shared-Corona **Wingover** on `Q`, which reverses vertical motion and phases one locked hazard, alongside the existing aerobrake. Ivory/Oxblood route forks use their actual collision openings and different recovery/score rules, culminating in the three-stage **Solar Verger** before the sixty-second clear. Navigator and Wanderer retain their classic routes.

A run-based roguelite expedition from the Sun's doorstep to the Umbral Maw at Neptune. Arena **hunts** are the core game — sharp twin-stick movement, a burst dash with i-frames, telegraphed enemies (chasers, weavers, shards, maws), waves, and a two-phase boss. Around them: rule-rewriting **instruments** (drafts and the chandlery), trials that pay salvage, oddities with consequences, and sanctuaries. Death resets the run; what persists is knowledge, records, and new hulls in the hangar.

- **Hunts** — three waves per sector, elites at finales, stardust motes off every kill.
- **Instruments** — Lodestone Coil, Echo Plate, Prism Lens, Rime Coating, Static Net and more; their verbs also rewrite the trials (wells bend gravity in Free Return, echoes repeat actions, parallax doubles every fifth success…).
- **Trials** — sixteen distinct cartridges: the original cosmic challenges plus Aurora Loom, Alignment Clock, Umbra Terminal, Occultation, Constellation Chain, Perihelion Run, Aether Bastion, and Glass Labyrinth. In Aether Bastion, select an installed tower and press `Q` or `E` to commit it to one of two upgrade paths; refine it twice, or right-click to reclaim alloy.
- **Hull forms** — Swift Kite is yours; the Iron Bell, Moth Wing, and Comet Wraith unlock through play (complete a tour, defeat the Umbral Maw, reach 100 threats cleared).

Each arcade game also offers **three persistent fieldwork seals** (twelve total), tracking meaningful goals within individual runs. The first seal in each game unlocks its **Masterwork expedition**, with a separate best score and rules explained on its opening folio; sealed deep-links return safely to free play. After progressing far enough in a run, you may invoke a **Stellar Pact** with **C** or the in-game button: a twelve-second double-score wager that ends early if you take a hit; shields cannot protect you from that hit. Your seals and personal records carry forward across attempts. Complete the first seal in each arcade game, then claim the Orchestra’s first musical constellation to uncover the **Observatory Chorus** achievement in the discovery cabinet.

## The cosmic arcade

Four hand-rolled canvas games with saved expedition records, a shared daily seed, pause, optional sound, theatre view, charge-up abilities, and a small roguelite layer. During a run you earn up to four picks from twenty-four mechanical relics; picks visibly change play, and paired relics unlock named synergies. Discoveries stay in a permanent field guide while powers begin fresh each run.

- **Planet Drop** — a floatier Suika-style merge game with squash-and-stretch physics, chain-reaction combos, guided throws, shockwaves, merge attraction, and an earned nudge for awkward stacks.
- **Comet Surf** — hold to swing around a planet, release to slingshot through gold rings. Longer tethers, charged launches, moving rings, shields, and flight relics change each route.
- **Stardust Dash** — seventy-five seconds of meteor-shower surfing: catch stars, dodge pink rocks, build shields, catch jellyfish, dash through danger when charged, and grab drifting power-ups like the Lodestone Bloom and Clock Moth before they pass.
- **Orbit Breaker** — cosmic pinball: steer a paddle around a circular arena and shatter every crystal in the constellation. Twin comets, shatter chains, wider paddles, and return wards can turn a run wonderfully chaotic.

Their Masterworks are mechanical expeditions, not reskinned difficulty settings. **Planet Drop** adds Tune-guided drops, physical shelves, gargoyle counterplay, and the three-movement **Horologist** finale. **Comet Surf** combines currents, Mirror Veil, telegraphed hunters, and three **Binary Regent** crowns. **Stardust Dash** adds tides, sea-anchor control, streak banking, clock moths, and three **Whale Choir** offerings. **Orbit Breaker** culminates in the **Last Cathedral**: ordered Litany seals, Censer banishes, sentry counterplay, and two focused breaks of the Rose Heart.

Keyboard and pointer controls are documented in play, with visible 44–48px touch controls or direct paddle/orbit gestures and independent pointer capture/cancellation. Essential phone HUD text is scaled to an effective **14px at 390px**, including boss stages and active resources. Reviewed automated Orbit Breaker clears span **160–260 simulated seconds**, depending on pilot and recovery play; the final integrated run finished in **251.275 seconds**. This measured automation is not a promised human clear time or external balance certification.

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
- Typography: **Cormorant Garamond** by Christian Thalmann, **DM Sans** by Colophon Foundry, and **IM Fell English**, licensed under the SIL Open Font License. Font licenses are in `assets/`.
- Historical astronomical engravings: **Wellcome Collection**, released under the Public Domain Mark. Work titles, reference numbers, source links, and local conversion notes are recorded in [`assets/ENGRAVINGS.md`](assets/ENGRAVINGS.md).
- Celestial plates, planet textures, instrument icons, cartridge sigils, hull illustrations, Gothic lancets/frames, the relic seal, and interface ornaments are custom SVG/Canvas artwork; original-vector notes are preserved in `assets/ENGRAVINGS.md`.
