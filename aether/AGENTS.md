# ÆTHER GRAND TOUR — OpenCode agent rules

> Project instructions for OpenCode / GPT-6.1 Sol. Last audited against the Cartographer's Edition archive on 2026-11-04. **Running code is the technical source of truth; `ROADMAP.md` is the priority queue.** Keep this file short: load `OPENCODE-QUALITY.md` *only for the relevant type of gameplay, UI, performance or test work*. Do not overwrite this curated file with `/init`.

## The product to build

Æther Grand Tour is an original, offline-first, celestial game anthology. Make it **feel like a complete game**, not a bundle of shallow demos. Depth before quantity: first-rate mouse/keyboard controls, distinctive mechanics, meaningful build choices, telegraphed threats, memorable bosses, fair restarts, gorgeous readable art/audio, unlocks and a cohesive expedition hub. Aspirational quality comparable to a premium £90 release is a **design ambition, not an established price or current quality claim**. Never inflate release readiness, content, external playtesting or market evidence. Study why *UFO 50* works, but copy none of its content.

**Non-negotiables:** playable improvements over speculative plans; player feel over particle count; one polished gameplay loop over ten half-implemented features; accessible controls; save compatibility; honest verification.

## Architecture and where to edit

This is **static vanilla HTML/CSS/JS**, Canvas 2D + Web Audio + localStorage, no bundled package manager, build step or test harness. Keep GitHub Pages deployment possible without a server, CDN, framework or new dependencies unless a separately authorised architectural change warrants it.

| Area | Source / contract |
| --- | --- |
| Landing and load order | `grand-tour.html` advertises the product; `index.html` owns CSS/`defer` JS order and `?v=` cache keys. Gameplay route: `index.html?standalone=1#voyage`. |
| App and hub | `app.js` provides app state, navigation, journal and base persistence; `observatory.js` integrates the other views. |
| Grand Tour | `voyage.js` (`window.AetherVoyage`) owns the run graph, rewards, shop, saves, mount/unmount; **do not duplicate its progression state**. |
| Combat | `skirmish.js` (`window.AetherSkirmish`) is the hunt engine: ship input, shots, enemies, bosses, 120 Hz fixed-step simulation. `battle-art.js` supplies artwork helpers. |
| Trials | `trials.js` (`window.AetherTrials`) owns the engine + registry; `trials-action.js` registers Constellation Chain/Perihelion Run; `trials-premium.js` registers Aether Bastion/Glass Labyrinth. They load **after** `trials.js` and **before** `voyage.js`. |
| Other games | `arcade.js` (four canvas arcade games/relics), `roomplay.js`, `orchestra-synth.js`, `planet-*.js` / `planets.js`; preserve them when changing the Tour. |
| Styles / media | `voyage.css`, `premium.css`, `styles.css`, `experiences.css`, other component CSS; inspect actual cascade. Local files/fonts in `assets/` with license records. |

**Critical contracts:**

- `AetherSkirmish.create(container, options)` returns `{destroy(), state}`; its `onEnd({won,dust,kills,score,bestStreak})` feeds the voyage. Hunts default to **mouse-following ship movement and mouse aiming**, hold-click fire, M toggles pointer/classic control, WASD overrides mouse steering, Space/right-click dashes, P pauses. Preference: `aether-flight-mode`.
- `AetherTrials.register({id,name,place,brief,create})`; `AetherTrials.create(id,container,{sound,speedScale,verbs:Set,onEnd})` returns a destroyable handle. End callbacks use `{won,score}` and **fire once per completed run, never after destroy**.
- `AetherVoyage.mount()/unmount()` must tear down the previous hunt/trial. Cancel rAF/timers, abort event listeners, release audio, restore focus; no zombie loops or double callbacks.
- Preserve `aether-observatory-v1` and the Tour's separate storage key (inspect the current `voyage.js` constant), saves, relic/daily determinism and achievements. Validate old/malformed saves and migrate when changing schemas; **no destructive localStorage resets**. Separate gameplay RNG from cosmetic randomness.
- Respect `defer` script ordering and CSS precedence. Register new cartridges in existing extension points; don't introduce ES module imports into the non-module page. Update `?v=` where changed files are cache-busted.

## Priority (one vertical slice at a time)

1. **P0 — Fundamentals:** mouse follows actual cursor correctly at scaled canvases; predictable WASD/M/input; pause, blur, retry, focus, sound, teardown, win/loss, old saves. Create checked-in smoke tests and fix repeatable bugs.
2. **P1 — Flagships:** deepen **Starship Hunts** (tactical enemy/weapon/boss/build loop), **Aether Bastion** (tower choices, economy, authored missions), **Glass Labyrinth** (readable stealth, authored alternative routes), **Constellation Chain** (formation/build decisions, survival mastery). Complete and balance *one* major mechanic/level before moving on.
3. **P2 — Product:** fast first-run onboarding, clear menus/recaps, soundscape, cartridge-specific polish, unlockable artifacts, memorable expedition identity.
4. **P3/P4 — After proven depth:** remake weaker trials, expand content, then audit performance, accessibility, licensing, player retention and evidence-based pricing.

See `ROADMAP.md` for detailed milestones. User requests override this default queue. For vague requests, pick the **highest-impact unfinished** P0/P1 slice and implement it, rather than merely discussing improvements.

## Autonomous implementation loop

1. **Find, don't dump:** `rg -n 'keyword' relevant*.js`, then read tight `sed` ranges plus direct callers. Read only relevant `ROADMAP.md` / `OPENCODE-QUALITY.md` sections. No repeated full-repo scans or bulk file reads.
2. **Define** 2–5 verifiable acceptance criteria in player terms; identify likely regressions and scope. Briefly explain any significant plan, then **make actual edits** without unnecessary questions.
3. **Build small and coherent:** reuse engines, registry and state; preserve public contracts. Prefer solving root cause over adding flags, arbitrary delays or broad rewrites. New content needs a distinct player choice, counterplay and replay value.
4. **Verify:** syntax + targeted test + browser interaction for changed paths; compare behaviour before/after where possible; exercise lifecycle and save edge cases.
5. **Critique and improve:** do one honest game-feel/UX review after implementation, then **fix and re-test defects**, not just write a list of aspirations. Stop when acceptance criteria pass; document the next slice.

Minimise context and tool cost. Batch straightforward shell checks; spawn specialist subagents only for independent substantial reviews, not trivial edits. Distinguish observed failures from speculation. Ask for approval only for destructive actions, credentials/paid services or publishing actions. **Never deploy/push, change pricing or announce launch without explicit permission.**

## Minimum checks

```sh
# From the extracted repository root; no npm install needed
for f in ./*.js; do node --check "$f" || exit 1; done
python3 -m http.server 4173 --bind 127.0.0.1
# Open /grand-tour.html and /index.html?standalone=1#voyage in a real browser
```

When available, use a checked-in Playwright/browser test, screenshots and performance measurements; **no test runner is currently shipped**. Never cite ephemeral `/tmp/opencode/...` scripts as a reproducible suite. In a Git worktree also run `git diff --check` (archive itself may have no `.git`).

**Fast smoke:** landing CTA → new/continue voyage → hunt mouse movement, aiming, shooting, M/WASD, dash, pause → changed trial win/fail/salvage → exit/re-enter without stale loops → Observatory/arcade still navigable → old/new save → responsive 390/768/1440 px and reduced motion. See `OPENCODE-QUALITY.md` for exact detailed rubrics, edge cases and test matrix.

## Definition of done and handoff

- The requested feature actually works in-game, is legible/fair, and does not break unrelated cartridges or saves.
- Changed JS passes `node --check`; interactive claims are backed by a real browser test or **clearly marked untested**; no fake benchmark/playtest claims.
- Keep runtime dependency-free and user data safe. Update `README.md` for shipped changes, `ROADMAP.md` only for genuinely completed gates. Do not hide known limitations.
- Respond compactly as **Implemented** (user-visible change/files) · **Verified** (exact tests/results) · **Known gaps** · **Next slice**. No fluff, no repeating the full plan.

**Default next action:** prove P0 cursor/lifecycle reliability end-to-end, add a reproducible browser smoke test, then tackle one substantial flagship cartridge depth improvement.
