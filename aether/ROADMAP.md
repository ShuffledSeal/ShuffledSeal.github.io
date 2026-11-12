# Æther Grand Tour — Development Roadmap

**Build:** Cartographer's Edition, 12 November 2026
**Status:** Playable browser prototype / substantial vertical-slice upgrade. **Not** a finished commercial £90 game.

This roadmap distinguishes what is playable **today** from proposed work. It deliberately avoids treating content quantity or a high price tag as proof of quality.

## What is playable in this archive

- A designed **Grand Tour** landing page (`grand-tour.html`) with gameplay captures, integrated with the Observatory at `index.html`.
- Mouse-following ship controls in the Grand Tour hunt, plus keyboard movement and improved combat feedback; new arena visual treatment, enemies, progression, difficulty choices, bosses and ship/instrument variation.
- Expanded trial roster, including **Aether Bastion** (lane-based defence with construction decisions), **Glass Labyrinth** (guard stealth and key collection), **Constellation Chain** (survival with orbiting/following weapons), and **Perihelion Run** (momentum/racing challenge). Older Grand Tour trials remain.
- Custom gameplay artwork, dedicated trial art and polished UI/CSS overlays.
- Cabinet of Wonders art direction with local historical engravings, bespoke icons, matching game frames, reduced-motion-aware book transitions and mechanical UI feedback.
- A working research cabinet with ordered/searchable saved works, marginalia, guided study, linked journal observations and Markdown export.
- Solution-backed Daily Charts and three-board seeded Circuits in all eight planetary puzzle rooms, with isolated resumable saves. Circuit clears unlock deterministic Eclipse masterworks; Eclipse clears unlock eight alternate-instrument charts with verified solutions under their actual new transition rules, separate drafts/records, and legacy-save migration.
- Veteran Sky unlocks for all six flagship cartridges, with separate records and engine-specific challenge rules.
- Expanded Veteran mechanics: the Meridian Cantor and two fourth-act refits; Bastion sappers and the Ward Loom; Labyrinth scanners and null jammer; Chain Wardens, two formation relics and a new boss braid; a Cathedral/Meridian Deep Field finale and Stillpoint Seal; and three advanced Starforge contracts including the two-vent Ember Covenant. Astral Crucible, the Cantor, and Ember Covenant are cleared through real controls in browser regressions.
- A second Veteran mechanics layer: Reversal and Aegis Lancers; directional Bulwarks and shelter/snare Wards; investigative wall-aware Watchers; Star Cast and Mote Siphons; clue-only Safe/Nova proofs; and Starforge cooling-bus/Ember shunting.
- Eclipse-difficulty Grand Tour Perihelion encounters with seeded drifting gates, offset pairs and precision-earned Corona aerobraking; classic routes remain unchanged.
- Four seal-gated arcade Masterworks with separate record books, expanded by forecast anchors/Brace, Starhook/Twin Swap, Lantern Rein/Eclipse shades, and Focus Break/choir parries. New active verbs have keyboard and 48px touch/pointer paths.
- Illustrated upgrade controls with 16px primary and 14px secondary relic copy, strong parchment/dark-surface contrast, accessible focus and contained scrolling, plus silent non-flashing score updates. Forty-six typography audits and an independent 24-scenario audit pass; earlier findings remain documented.
- Save & Leave on every Grand Tour screen, resumable encounters, and confirmed abandonment with complete game teardown.
- Existing Observatory, puzzles, arcade games, orchestra with sequencer, journal, progress and local-save model remain in place.

The features above indicate *implementation*, not that every game has yet met a professional content or balancing standard. In particular, the new trials are initial playable versions, not fully featured multi-hour standalone releases.

## Prioritised next milestones

### P0 — Make the controls and foundations reliable

- Playtest keyboard-only, mouse-only, trackpad, touch and high-DPI across desktop and mobile. Provide explicit aiming/steering mode selection; avoid pointer-offset mistakes under CSS canvas scaling.
- Make pause/resume, focus loss, input capture, sound unlock, game-over and retry deterministic. Prevent duplicated event listeners between cartridge switches.
- Add a smoke-test suite that visits every cartridge and trial, starts it, runs it, pauses it, ends it and returns to the hub. Include tests for localStorage migration.
- Profile slow devices and cap particles/rendering independently of simulation. Set a target of stable 60 FPS on mainstream desktop browsers, graceful 30 FPS fallback and no major frame-time spikes.
- Audit visual contrast, reduced-motion, subtitles for nonverbal cues, remappable controls and touch-target size.

**Done when:** Every core experience can be entered, controlled, paused, exited and replayed without errors across a documented browser/device test matrix.

### P1 — Turn four promising games into genuinely deep cartridges

**1. Starship Hunts (flagship).** Add 4 distinct weapon families, 3 dash techniques, enemy coordination, projectile pattern language, boss phase transitions, elite modifiers, sector hazards and ship-specific build paths. Create a 10–15 minute skill-based route with meaningful mid-run decisions and a final boss; track win rates and damage sources.

**2. Aether Bastion (strategy).** Add varied terrain, enemy armour traits, tower upgrade trees, economy tradeoffs, sell/refund decisions, 8–12 handcrafted missions, and an endless mode. Telegraphed rounds and a wave preview should make defeat understandable rather than arbitrary.

**3. Glass Labyrinth (stealth).** Add 8–12 designed levels, patrol planning, sound distraction, disguises or gadgets, graded detection states, alternate routes, stealth ranks, and replayable optional objectives. Ensure vision cones and collision rules always match what is visible.

**4. Constellation Chain (survival).** Add new chain formations, specialised link weapons, boss waves, an upgrade draft, risk/reward resource collection, and survival mode. Distinct upgrades should alter the shape of play rather than simply increase numbers.

**Done when:** Each of these games has a distinct 10+ minute mastery loop, an onboarding path, meaningful failure and replay value, and three rounds of external playtesting.

### P2 — Make the anthology a cohesive product

- Create a first-run onboarding sequence that introduces the Observatory and Grand Tour in under 90 seconds, without blocking expert players.
- Build a persistent hub with cartridge-specific discovery, completion records, difficulty medals, achievement progress and physical-feeling collectibles.
- Give each cartridge a strong title screen, menu music, loadout screen, restart flow, help overlay, and end-of-run recap.
- Introduce progression that *reveals* variety rather than grinding raw power. No compulsory daily login or time-gated unlocks.
- Establish consistent visual hierarchy and cohesive UI language while keeping each cartridge's own animation and palette.
- Add an authored soundtrack, clearer audio mix, accessible volume controls, distinct SFX for successful actions and advanced controller/rumble support where available.

**Done when:** Players can explain the larger Grand Tour objective and have an obvious reason to return after their first game.

### P3 — Expand breadth only after depth is proven

- Upgrade Perihelion Run into a proper route-based time trial with ghosts, precision gates and shortcuts.
- Deepen 2–3 of the best existing puzzle/arcade experiences; retire or redesign anything that fails playtesting rather than keeping it for a higher game count.
- Expand bosses, handcrafted story events, world variation and difficulty modes.
- Add optional procedural challenge boards *after* a reliable handcrafted campaign exists.

**Done when:** The additional content consistently performs as well as the flagship cartridges in retention and player satisfaction tests.

### P4 — Release readiness and premium price validation

- Conduct blind testing with players who have not seen the project before; record onboarding confusion, time-to-fun, restart rate and each game's completion rate.
- Run a formal bug bash, performance review, save migration/backup review and accessibility pass.
- Prepare store-ready screenshots/trailer, licensing inventory, privacy notice, support channel, patch notes and versioned releases.
- Evaluate pricing based on *actual demonstrated scope and independent demand*. **£90 is a target to test, not a validated price.** Start with player interviews and blind willingness-to-pay tests, compare nearby indie anthologies and only commit to a price after the game earns it.

**Release gate:** No commercial launch until the P0/P1 quality gates are met and independent players consistently report value commensurate with the asking price.

## Design pillars and anti-goals

1. **Every button should feel good.** Give input immediate, legible feedback and tolerate the imperfections of human motion.
2. **Depth before count.** Prefer four replayable games to twenty shallow demos.
3. **A connected world, distinct cartridges.** Common identity without mechanically identical games.
4. **Earned mastery.** Failing should tell the player what to do differently next time.
5. **Respect player time.** Short restarts, skip-friendly intros, no grind to access the fun.

Avoid expanding marketing claims faster than implementation, piling on particle effects at the expense of visibility, and using raw duration as a proxy for quality.

## Validation checklist for this handoff

- [x] JavaScript source syntax checks performed for the premium scripts.
- [x] Archive structure validated.
- [x] Playable browser implementation and visual previews packaged.
- [ ] Comprehensive regression testing of every minigame.
- [ ] External playtesting and balancing.
- [ ] Documented cross-browser/mobile compatibility pass.
- [ ] Accessibility audit and controller remapping.
- [ ] Independent validation that £90 is a viable market price.

## Running and deployment

1. Extract the ZIP; keep all files in the same directory structure.
2. Run `python3 -m http.server 4173` from the folder that contains `index.html`.
3. Open `http://localhost:4173/grand-tour.html` or `http://localhost:4173/`.
4. Æther deploys as the **`/aether/` subdirectory** of the `ShuffledSeal.github.io` repository, which GitHub Pages publishes from the root of the `main` branch. Keep these files inside `aether/` — **never copy the contents of this folder over the repository root**, or you will overwrite the root portfolio site (root `index.html`, `portfolio.html`).
5. Commit and push to `main` to deploy. Hard-refresh your browser afterwards: GitHub Pages/CDN caching can lag a pushed commit, so verify the live `/aether/` route after each publish. Existing local saves stay in the browser; consider backing them up before replacing the live site.

**Deployment note:** This package is ready for *manual* deployment. No changes have been pushed to your GitHub repository from this session.
