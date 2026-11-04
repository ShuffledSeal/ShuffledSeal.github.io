# Æther Grand Tour — On-demand quality & verification playbook

**For coding agents:** This is a reference, **not** another automatically loaded system prompt. Read only the relevant section while working on the task. `AGENTS.md` owns overall policies; `ROADMAP.md` owns priorities; shipped code owns actual behaviour.

## Input, simulation, lifecycle (P0)

- Canvas coordinates: `x = (event.clientX - rect.left) * canvas.width / rect.width`, same for `y`, before applying a well-defined logical/world transform. Account for CSS canvas scaling and DPR **exactly once**. Verify with an offset and non-native canvas size.
- Test mouse-only pointer steering and aim, click-to-fire and right-click dash; M toggle and saved mode; WASD override and simultaneous firing; pointer enter/leave; resize; focus/blur; trackpad; paused/restarted game. Pointer movement must translate the **ship's position**, not merely its nose/aim reticle.
- Prevent default only for in-game controls, and only while the canvas/game owns focus. Do not break navigation shortcuts, tab order or scrolling elsewhere. Consider touch/controller support, but do not pretend unimplemented input methods work.
- Keep game simulation frame-rate independent; 120 Hz skirmish fixed-step (check current code), bounded catch-up, bounded entities and particles; clear accumulator and frame timestamp on pause/hidden/resume. Use seeded RNG for gameplay and separate cosmetic RNG.
- Terminal states call `onEnd` at most once; navigation/destruction makes stale timers/callbacks inert. Dispose rAF, intervals, timeouts, event listeners and audio. No unrelated screens should receive key/mouse events after navigation.
- Validate and preserve old saves. Test missing/malformed records, unavailable storage and version migration separately from real user data. No global `localStorage.clear()` in tests.

## Make each cartridge worth mastering (P1)

**Gameplay rubric:** (a) 1-sentence core verb; (b) feedback within the first meaningful action; (c) something the player can improve through skill; (d) a distinct consequential choice; (e) at least two counter-strategies; (f) readable difficulty escalation and fair fail state; (g) an immediate retry, end-of-run clarity and persistent discovery; (h) useful session depth rather than padded timer duration. If these do not hold, improve the existing mechanics before adding modes.

- **Starship Hunts:** distinct weapons with different aim/positioning tradeoffs; enemies with readable windup + counterplay; boss phase clarity; hull/instrument synergies, sector hazard choices; 10–15 minute skill-based route is an *aspiration to test*, not a measured current game length.
- **Aether Bastion:** terrain/path choices, telegraphed waves, tower types with complementary strengths, upgrade/refund economy and authored missions. Test more than one viable strategy. Avoid unavoidable chip damage or a single optimal turret.
- **Glass Labyrinth:** deliberately authored chambers, legible guard cones matching detection math, AI states (idle/suspicious/chase), meaningful stealth gadget use, alternative routes, ranking and retry. Measure player comprehension, not merely map complexity.
- **Constellation Chain:** visibly distinct chain formations, player-controlled positioning, meaningful build drafts, pressure/recovery cadence, boss/elite counterplay and risk/reward pickups. Avoid a pure +damage treadmill.
- **Perihelion Run/older arcade:** improve only when flagship depth is solid; authored tracks, shortcuts and ghosts beat aimless extra particle effects.

## Presentation / audio / accessibility (P2)

- Protect gameplay silhouettes and telegraphs from bloom, shake, particles, decorative text or busy backgrounds. Distinct gameplay palettes can coexist with a common Observatory brass/glass/engraved typography identity.
- Convey feedback by complementary visual/audio channels: aim indicator, hit-stop (subtle), impact, damage direction, collect confirmation, danger states, victory and failure. Audio must unlock after input and respect mute/volume. Prefer authored sounds and verifiably licensed media over generic stock overload.
- Every cartridge should have a readable title/goal/control panel, first-run hint, restart/pause/exit, visible current objective, and win/loss recap. Keep menus keyboard-navigable, focus visible and status accessible where appropriate.
- Reduced motion must reduce excessive screenshake, parallax, flashes and looping transitions while retaining essential play information. Avoid relying on sound or colour alone. Test HUD contrast and hitbox readability on small viewports.

## Browser regression matrix

| Scenario | Expected observable evidence |
| --- | --- |
| Landing + navigation | `grand-tour.html` CTA enters gameplay; back links, overview and tour work; browser console has no uncaught errors. |
| Hunt | Pointer physically moves the ship to cursor target; aim/fire/dash/M/WASD behave; wave/boss transitions, score, defeat and win work. Test scaled canvas. |
| Changed trials | Start, tutorial/goal, win, fail, score, salvage, restart, leave and remount; callback once; no leaked event listeners/animations/audio. |
| Run persistence | Reload midway, continue, end/abandon, save schema and existing discoveries intact; malformed old storage fails gracefully. |
| Old content | Planet atlas, four arcade games, rooms/orchestra, journal and discovery cabinet still render/use saves. |
| Focus/input | In-game controls do not trigger behind dialogs, while tabbed away, or after exit; reconnect or resume deterministic. |
| Responsive | 390×844, 768×1024, 1440×900; usable touch target sizes, no clipped text/buttons/canvas and no horizontal scroll. |
| Low-motion/performance | Media preference reduces nonessential motion; frame time measured under gameplay load with browser tooling. |

For automated testing use a checked-in browser runner and stable test fixtures (Playwright if installed; installation is developer-only, not a runtime dependency). Test input via browser interactions and actual screenshots. Run `node --check` on **all** JS, not just new scripts, and `git diff --check` when in a Git checkout. Never present a syntax check as proof of game feel or cross-browser compatibility.

## Performance and implementation standards

- Avoid per-frame DOM layout, new canvases/textures and unbounded allocations. Pool/cap particles, projectiles and spatial queries where measurable; minimise expensive compositing/blur and gradients in hot paths.
- Pause/cancel background animation rather than scheduling idle frames unnecessarily; do not render at full frame rate behind menus. Limit audio voice count and dispose AudioContexts/resources.
- Target stable 60 FPS on mainstream desktop and graceful degraded performance on weaker devices, **measured on named devices**, not asserted. Record FPS/frame-time and capture the worst visible spikes.
- For visual/UI changes take screenshots of real game states before/after, not synthetic marketing images. Check contrast, legibility, animation timing and obvious failure reasons.

## Research and release discipline

When research is relevant, use up-to-date attributable sources for competitor positioning, accessibility standards, indie market economics and potential £90 pricing. Note date, region, audience and actual evidence; do not extrapolate one hit game into guaranteed demand. Design from player verbs, iteration and test data, not lists of trendy features. Observe other games' depth but do not replicate protected artwork, music, maps or expressive design. Conduct blind external playtesting before claiming market-validated quality or price.

Do not push to GitHub Pages, change storefront/pricing, buy services, add analytics or share user data without explicit permission. Never promise the game is commercially ready because a backlog was written or an automated script passed.
