# Æther Progress

## 2026-11-05 - Bastion tactical siege orders

- Researched tower defense design and accessibility before selecting one slice: Lars Doucet's [Defender's Quest design notes](https://www.fortressofdoors.com/optimizing-tower-defense-for-focus-and-thinking-defenders-quest/) emphasize readable wave information and time to think; his [upgrade analysis](https://www.fortressofdoors.com/upgrades-equipment-and-skill-trees/) argues for different, limited, clear spending alternatives; [Xbox Accessibility Guideline 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103) calls for text and shape rather than color-only cues; [Ernest Adams on difficulty and pacing](https://www.gamedeveloper.com/design/the-designer-s-notebook-difficulty-modes-and-dynamic-difficulty-adjustment) cautions against flattening the challenge with hidden automatic adjustments. These are design inspirations, not evidence that players find this implementation fun.
- Endless Bastion now gives a real, untimed planning break after each cleared siege. The text/board forecast announces a lane favoured by the next wave's spawns (not a guaranteed majority), including every fourth wave's titan forecast. Players may build/refine, then spend 120 alloy to repair one core heart, spend 120 to overdrive all towers for just the next siege (+30% damage), or save the alloy. Wave-clear supplies give 80 alloy. Large labeled buttons plus Z/X/C keyboard shortcuts supplement the existing 1–4 build controls; paused games block orders. The authored three-wave mission remains unchanged, and orders create no save migration.
- Initial concentrated spawns made the pre-existing six-tower defense collapse by siege three; reduced forecast-lane weight to 42% (+ its normal random share), preserving a likely lane without making every other lane empty. A phone/desktop screenshot check also caught a planning overlay hiding build cells; replaced it with a compact HUD forecast and a dashed lane outline, leaving the board unobstructed. The survival clock no longer jumps backwards between sieges. Browser depth test now plays through several orders, constructs for a forecast titan lane, checks clock freeze, pause, cost, repair, overdrive, keyboard save, progression, and destruction. This is seeded functional testing, not multi-seed or human balance validation.
- Next validation: independently observe new players playing unprompted, then ask how they interpreted the forecast and why they chose an order (not simply whether it was "fun"). This follows [Jozef Kulik's usability-playtest guidance](https://www.gamedeveloper.com/business/asking-the-right-questions---moderating-a-great-usability-playtest); no external players were recruited or observed here.

## 2026-11-05 - Deeper cartridge verification

- Added `npm run test:cartridges` (`tests/cartridge-depth.mjs`). In isolated browser profiles with accelerated game time it verifies all six Starforge contracts win, misalignment times out, pausing freezes the contract, vent reduces heat once; a keyboard-steered Labyrinth first-chamber clean seal extraction scores 1550 and its mission times out cleanly; both Skirmish first-wave refits lead into wave two and a seeded unpiloted run ends once; mixed Bastion boards survive multiple endless waves and complete its authored mission, while a no-build run fails exactly once.
- Found and fixed Labyrinth's leftover ability buttons on destroy; gadget buttons now restore canvas focus so WASD works immediately after a click. The existing browser smoke suite covers that focus handoff.
- Refits now disable their buttons while Skirmish is paused, then restore them on resume; the depth suite checks both states and that the field remains harmless while a choice is pending.
- Depth verification also mounts all four direct cartridges at 390/768/1440 px with reduced motion and checks for horizontal overflow and uncaught page errors in Chromium. Firefox under the installed Playwright binary could not launch, so cross-browser behaviour remains unverified.
- Extended the Bastion endurance probe to roughly wave 8/9 without page exceptions. Its saved alloy grows well beyond what the six-tower build spends, and a static board eventually loses; economy/balance needs genuine player trials. Skirmish's Reinforce choice requires active dash play to compete with Overclock in the seeded stationary-shooting probe. No claim of exhaustive seeds, devices or subjective fun.

## 2026-11-04 - Four-cartridge loop review

- Browser-played the direct cartridges: a seeded Bastion Prism shot and a 15-second mixed-board siege without page errors; Starforge's first contract including a deliberately misaligned Mirror and its correction; a keyboard route to Labyrinth's new optional seal; and Skirmish's first wave through its refit choice. These are functional checks, not evidence of long-run balance or subjective fun.
- Fixed Labyrinth's WASD blocker: the 4px mouse dead-zone had been applied to unit keyboard input, preventing keyboard travel. Added optional chamber seals (300 points, plus 300 for a no-heart-loss extraction) to reward a risky detour instead of only the fastest key route.
- Starforge now describes the Mirror's fixed top gate and required shared alignment, draws gate links and confirmation marks, reports misalignment/missing devices, and moves existing devices when repositioned instead of leaving a duplicate behind.
- Endless Skirmish offers a safe between-wave Reinforce/Overclock decision via keyboard or visible buttons. Limited the infinite enemy count and health ramp; Grand Tour wave rules are unchanged.
- Browser regressions now cover a real keyboard-steered seal pickup, a corrected Mirror leading to a sealed First Spark contract, and a seeded first-wave refit. Mobile/tablet/desktop route widths checked in Chromium; external player validation and sustained late-run tuning remain open.

## 2026-11-04 - Overview front door and repeatable challenge runs

- Bare `/aether/` and the logo now open the Observatory overview. Explicit `#voyage` and standalone game routes still open the cabinet or selected cartridge.
- Starfall Skirmish, Aether Bastion, and Glass Labyrinth now offer same-seed Daily Vigil runs with per-day local records alongside the all-time best; the arcade already had daily expeditions and Starforge has authored replayable contracts.
- Glass Labyrinth gained a throwable prism decoy (F or on-screen button), a timed cooldown reduced by optional cyan fragments, and seeded patrol starts/directions on daily runs and later endless circuits. Grand Tour's first authored route is unchanged.
- Browser smoke covers overview routing, daily mode links, daily patrol replay, decoy activation, and cooldown.
- Fixed Bastion's Prism beam crash (local damage value shadowed the damage function); browser smoke waits for a seeded Prism shot to fire without errors.

## 2026-11-04 - Fleet-wide audit fix pass

- Hunts: keyboard fire (J/Z/Enter), focus-gated keys, auto-pause on window blur, sim-time beam/echo timers, pause renders one static frame, honest endless HUD, larger HUD type, aria-live status region, cached motion query.
- Trials: all 16 gain engine-level pause/resume (P key, blur auto-pause, overlay/badge, no catch-up burst); Loom callback order standardized; Deep Field surface focusable; Labyrinth cones raycast-rendered to match detection math with veil-radius ring; Bastion diagnostics throttled.
- Starforge: end timer cancelled on destroy/reset (no stale recap), Space gated to canvas focus, idle build phase renders on demand instead of full-rate, visibility-aware, focus restore.
- Voyage: pause()/resume() forwarded to mounted games and wired to modals and tab-hidden; the dealt tour map and transient bonuses persist in the save; hull-loss toasts survive re-render; focus restored to the current leg after encounters; logbook save is idempotent; cartridge control strings deduplicated; tour=1 deep-link scrolls to expedition setup.
- App shell: modals pause/resume the voyage; aria-current scoped off <body>; mobile menu button name/icon toggles; false-unread notification dot removed; Ctrl+K guards match '/'; grand-tour.html mobile overflow, seal overlap, CTAs, meta copy, and credit line fixed; 24px+ touch targets; orchestra sliders operable; tablet nav shows a current-page label; theme cascade deduplicated.
- Performance: telescope star field precomputed/culled with DOM writes on change only; cabinet thumbnails lazy-rendered; planet orbs sprite-cached; planet parallax rAF-coalesced; world painting layer-cached. Improvements are structural, not FPS-measured.
- Docs: AGENTS.md test-suite claim corrected; README hull list completed; ROADMAP/PREMIUM-EDITION deploy instructions no longer threaten the root site; GAME-MECHANICS.md drift corrected; audit paths made repo-relative.
- Tests: browser smoke now covers modal pause, blur pause, keyboard fire, hull-loss toast, pause/resume/destroy for every trial, map persistence across reloads, and the Starforge stale-recap regression.

## 2026-11-04 - Versioned save recovery

- Added checked-in legacy and malformed-shape fixtures for the current persistent JSON save contracts.
- Grand Tour saves now migrate through a bounded versioned shape, retaining valid legacy runs while rejecting unknown hulls, instruments, route states, and impossible counters.
- Starforge records now reject non-finite scores, and recovery coverage preserves unrelated local-storage data.

## 2026-11-04 - Bastion lane telegraphs

- Added lit entry gates before enemies enter their lanes, including an extended titan warning.
- Browser smoke verifies that an incoming lane is visible before its enemy spawns.

## 2026-11-04 - Bastion range preview

- Added ghost placement and exact targeting envelopes for the selected Bastion tower.
- Prism previews its lane beam; Sunmine previews its trigger radius.
- Browser smoke confirms the scaled-canvas Needle preview before placement.

## 2026-11-04 - Wonder Room lifecycle fix

- Fixed lost-capture and blur recovery for telescope, darkroom, and world-paint gestures.
- Prevented an in-flight offline orchestra export from downloading or toasting after navigation.
- Fixed `AetherRoomPlay` cleanup when its host signal aborts.

## 2026-11-04 - Comet Surf input fix

- Fixed `pointercancel` and `lostpointercapture` so they preserve a Comet Surf orbit instead of launching it.
- Made arcade teardown release active pointer capture and reset input.
- Added a scaled-canvas browser regression for cancelled Comet Surf gestures.

## 2026-11-04 - Uncommitted foundation audit

- Added a concise repository, route, save-contract, test, and risk baseline.
- Added executable valid legacy-save and corrupt-save boot checks plus a Grand Tour reload-persistence assertion.
- Remaining save work: explicit migrations for any future schema change.

## 2026-11-04 - `f3442a7`

- Made the Game Cartridges cabinet the default `/aether/` view.
- Kept Observatory overview accessible through navigation and Grand Tour as an optional long-form mode.
- Added browser coverage for root-to-cabinet routing.
- Verified: `npm run test:browser`; `npm run test:trials`; syntax checks for changed JavaScript.

## 2026-11-04 - `d7000e1`

- Added direct-cartridge endless modes for Starfall Skirmish, Aether Bastion, and Glass Labyrinth.
- Expanded Glass Labyrinth with the Triune Archive: three visible routes, two required keys, and a bonus-rich Watcher Gallery route. The endless cartridge now loops all four authored chambers.
- Preserved finite authored Grand Tour loops.
- Added direct-route browser checks for endless mode activation.

## Current Risk

- Grand Tour save compatibility is fixture-tested; the other five storage contracts still lack versioned migrations. Do not alter storage keys or active-run data without migration coverage.
