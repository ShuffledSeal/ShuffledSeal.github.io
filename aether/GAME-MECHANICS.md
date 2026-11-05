# Æther Arcade — Complete Game Mechanics Handoff

**Purpose:** everything you need to understand, port, or build a specialised game on top of the four Æther minigames. Every constant below is taken from the shipped code (`arcade.js`, `observatory.js`) as of this writing.

**Where things live:**

- `arcade.js` — the entire game engine: all four games, physics, relics, synergies, power-ups, rendering, input, audio. ~1745 lines, one closure per game instance.
- `observatory.js` — the cabinet UI: scoreboard, relic dialog, build panel, recap, persistence, announcements.
- `GAMEPLAY-EXPANSION-PLAN.md` — the future roadmap (power-up roster, expeditions, bosses).

---

# 0. The shared engine — read this first

All four games are one engine. Understanding these systems once gives you 80% of every game.

## 0.1 Game instance lifecycle

```js
const handle = window.AetherArcade.create(canvas, {
  game: 'merge' | 'hop' | 'dash' | 'breaker',
  seed: 12345,              // undefined → random 32-bit
  relaxed: false,           // hop only: wider tethers
  best: 0,                  // previous best score (HUD display)
  onUpdate(data) {},        // ~10 Hz + on every state change
  onFinish(result) {},      // once, when a run ends
});
handle.start(); handle.pause(); handle.resume(); handle.reset();
handle.action();            // drop / primary action
handle.ability();           // charged ability (X key)
handle.applyRelic(id);      // choose a draft card (validated)
handle.skipRelic();         // decline a draft
handle.setSound(bool);
handle.destroy();           // cancel RAF, abort listeners, close audio
```

## 0.2 The phase machine

```text
ready → running ⇄ paused → ending (0.8 s) → over → (start) → reset() → ready
```

Plus an orthogonal boolean **`suspended`**: set when a relic draft is open. `step()` early-returns while suspended, so **all simulation timers freeze automatically** (power-ups, danger, physics — everything). Rendering drops to an 8 fps idle loop while `paused`, `ready`, `over`, **or** `suspended` (there is an opaque modal over the canvas; full-rate redraws behind `backdrop-filter` blur once cost 60 → 26 FPS).

`hurt()` and `finish()` are no-ops while suspended, so a draft can never kill a player.

## 0.3 Fixed timestep & the loop

- Simulation: **120 Hz** fixed steps (`step(1/120)`), driven by an accumulator; frame elapsed clamped to 80 ms (a background tab never spiral-of-deaths).
- Render: every RAF while running; 8 fps while idle/suspended.
- `onUpdate`: throttled to **10 Hz** plus immediate calls on state changes. DOM writes must stay diff-keyed (see `buildKey` patterns in `observatory.js`).
- Effects (`particles`, `ripples`, `popups`, `fields`, `shake`, `flash`) tick in `effectsStep` on frame time, not sim time — presentation only.
- Tab hidden → `pause()` + cancel RAF + suspend audio. Visible → fresh RAF. Zero leaked loops (verified over 48 route switches).

## 0.4 The RNG streams — the determinism contract

One bit-exact LCG (`AetherArt.random`, `cosmos.js`) instantiated into **independent named streams** at `reset()`:

| Stream | Salt | Consumed by | Rule |
|---|---|---|---|
| `random` (course) | seed | layouts, queues, waves, physics-affecting rolls | never by presentation or new systems |
| `fxRandom` | `seed ^ 0x71ca43` | particles only | never by simulation |
| `draftRandom` | `seed ^ 0x5ea1c0de` | four draft decks, **pre-shuffled at reset** | never mid-run |
| `pickupRandom` | `seed ^ 0x9c4d` | dash pickup schedule, **precomputed at reset** | never mid-run |
| backdrop | constant `731` | static stars | — |

Invariants that make daily modes replayable:

1. Anything that can fork a daily course is rolled **at reset into a schedule** (the `draftDecks` / `pickupSchedule` pattern). Conditional content is *rolled, then gated* at fire time — conditions consume zero RNG.
2. Reduced motion only changes FX counts and shake, never simulation.
3. `Math.random()` appears exactly once in the engine (free-play seed generation). Never add another.
4. Daily seed: `seed = Σ imul(31) over (dateKey + game)` — local-timezone date string. Coupled to best-record keys (`gameKey()` = `` `${game}:v3[:date|:relaxed]` ``).

## 0.5 The relic system (roguelite layer)

- **24 relics**, 6 per game, frozen catalogue in `arcade.js` (`AetherArcade.relics`). **8 synergies**, 2 per game (`AetherArcade.synergies`).
- Up to **4 drafts per run**. Each draft: sim freezes, a modal offers **3 cards** from that draft's pre-shuffled deck (unowned only), keys 1/2/3 or click, plus an explicit "keep my current build" skip. **Escape is deliberately harmless** (pause instinct ≠ build choice).
- Draft triggers = per-game milestones, with sim-time drought fallbacks (`arcade.js:89`); drafts are also at least 30 s apart (`MIN_DRAFT_GAP`):

| Game | Milestones (progress) | First fallback | Later fallbacks |
|---|---|---|---|
| merge | 5 / 14 / 28 / 48 merges | 14 s | 34 s |
| hop | 220 / 550 / 1000 / 1600 m | 14 s | 34 s |
| dash | 6 / 20 / 38 / 58 catches | **8 s** | 34 s |
| breaker | 6 / 16 / 32 / 55 crystal hits | 14 s | 34 s |

- Synergies are computed from owned pairs; activating one fires an in-canvas `SYNERGY · NAME` popup, a field ring, and a high tone. Discoveries persist permanently in `voyage.relics` (field guide); powers reset every run.
- Effects are implemented inline via `has(id)` checks beside the physics — there is no hook system, by design.

## 0.6 The `onUpdate` payload (UI contract)

```js
{
  phase, suspended, score, best,
  next, queue,              // merge: next tier name + 3-deep queue
  largest, lives, combo, remaining, danger, drops, charge,
  detail,                   // one-line status for the scoreboard slot
  result,                   // game-over message
  relics,                   // owned relic objects
  offer,                    // draft cards or null
  synergies,                // [{ name, description }]
  stats,                    // { simulationTime, totalMerges, totalCatches, crystalHits, ringsCaught, maxMetres, comets, shields, ... }
  relicProgress,            // { value, target, label }
  pact,                     // { active, seconds, ready, used, failed } — see 0.8
  pickup,                   // dash: { id, name, glyph, remaining, total } | null
  incoming,                 // dash: { id, name, x } | null  (x enables bots/tests)
}
```

`onFinish({ score, largest, drops, level, totalMerges, relics, synergies, stats, result })` → the UI saves best (`v3` keys), unshifts a run record (max 12), unlocks stamps, and renders the recap.

## 0.7 Ability charge

`charge` 0–100, ability button at 100 (X key / tap). Merge +16/merge, breaker +12/hit, dash regenerates 8/s + 7/catch. Hop has no ability (its verb *is* the hold/release).

## 0.8 Stellar Pact (all four games)

Once a run progresses past its threshold (`pactThreshold`: merge 3 merges, hop 350 m, dash 7 catches, breaker 7 hits), the player may invoke a **Stellar Pact** (C key / in-game button, once per run): a **12-second ×2 score** wager (`score` gains are doubled while `pact > 0`). Taking a hit breaks the pact early — **shields cannot absorb that hit**.

## 0.9 Feedback primitives (use these, don't invent)

`burst(x, y, colour, count, force)` particles · `relicField(x, y, radius, colour, life)` expanding ring · `popups.push({x, y, text, colour, life})` floating canvas text · `tone(freq, length, type, volume)` WebAudio blip (gesture-gated, 25 ms retrigger guard) · `shake` / `flash` (suppressed under reduced motion).

## 0.10 Input map

| Game | Keyboard | Pointer/touch |
|---|---|---|
| merge | ← → aim · Space drop · X nudge · P pause | move aims, press+release drops |
| hop | hold Space/Up orbit · release launch | hold/release anywhere on canvas |
| dash | ← → steer · Space/X dash | pointer x steers (follows at ×13, clamp ±850) |
| breaker | ← → rotate paddle · X slow orbit | pointer angle steers paddle |

Escape/P pause; Escape in theatre mode is reserved for exiting theatre. Canvas has `role="application"`, full aria-label, and every run event reaches the `#game-status` live region (polite; announcements are transition-triggered, never countdowns).

---

# 1. Planet Drop (`merge`) — the Suika game

**Fantasy:** stack and merge little planets in a jar; don't let the universe overflow.
**Canvas:** 480 × 600 portrait. **One verb:** aim and release.

## Core rules

- **11 tiers:** Moon → Mercury → Venus → Mars → Earth → Neptune → Saturn → Uranus → Jupiter → Sun → Supernova. Radii 18 → 130 (`radii[]`). Two Supernovas annihilate each other.
- **Queue:** 3 deep; next pieces roll uniformly from tiers 0–3 at drop time (course stream).
- **Drop:** aim follows ← → (340 px/s) or pointer. Releasing spawns at y=46 with `vx = clamp(aimVelocity × .28, ±125)` — *deliberate aiming supplies momentum*; a stationary drop is predictable. Cooldown 0.32 s.
- **Physics per substep:** gravity **400 px/s²** (deliberately floaty), horizontal drag `exp(−.38·dt)`, wall restitution .42, floor restitution .30 with `vx ×= .97`, 6 collision passes, positional correction weighted by radius². Slower bodies squash (`squash` ≤ .23) and settle.
- **Settle assist:** an exactly-vertical, slow perch nudges the upper ball toward the player's aim side (26 px/s²) — resolves symmetric dead stacks *without random jitter*.
- **Merge:** identical tiers touching → next tier at the midpoint, inherits 35% combined vx, vy=−55. Score `2^tier × min(combo, 5)`. Combo window **0.85 s** (2.4 s with Echo Hourglass).
- **Overflow:** any ball older than 2.2 s with its top above **y=92** fills the danger meter (+1/s; drains 2/s). Limit **3.4 s** → game over ("One very full universe."). Hard cap 110 balls.
- **Nudge (ability):** all balls get `vy −= 130` and `vx ±= 110` toward the aim side. The emergency rescue valve.

## Relics & synergies

| Relic | Effect |
|---|---|
| Echo Hourglass | chain window 0.85 → 2.4 s |
| Quake Core | merges emit a 145 px shockwave lifting neighbours |
| Binary Heart | matching planets attract across a 65 px gap |
| Guiding Thread | aim steers the newest planet for its first 1.1 s |
| Pulse Dynamo | merges grant 26 charge; nudge lifts harder (−190) and halves danger |
| Deep Cradle | overflow limit 3.4 → 5.2 s, drains 3/s |

- **Aftershock Choir** (Hourglass+Quake): chained shockwaves reach 190+12×combo px, pull same-tier planets inward, +0.6 s chain.
- **Binary Landing** (Heart+Thread): a guided drop locks toward its match with 140 px reach and 220 strength.

## Feel targets

A drop should arc, bounce once or twice, and settle within ~2 s; stacks lean but rarely jitter; a good player reads the ghost landing preview (dashed line + translucent orb) and the queue. The jar should feel *full of potential energy*, never sticky.

---

# 2. Comet Surf (`hop`) — the orbit game

**Fantasy:** swing around planets and slingshot through gold rings forever.
**Canvas:** 900 × 560, side-scrolling. **One verb:** hold to orbit, release to fly.

## Core rules

- **Ship:** constant forward drift; free-flight gravity 24 px/s² (8 with Moon Sail, plus vy dampening).
- **Tether:** holding near a planet within **235 px** (270 relaxed, +80 Longwave Tether) catches an orbit at the current distance (min `r+40`). Orbit angular speed = `(270 + 6×level) / radius` rad/s, direction inherited from approach cross-product.
- **Release:** velocity = tangent × `(285 + min(100, 10×level) + 220×charge)`, with a guaranteed forward floor `vx ≥ 200 (+100×charge)` and vy clamped to ±290 — **a release always stays inside the readable flight band**.
- **Worlds:** procedurally ahead of the camera every 370–450 px; radius 27–42. Collision without a shield costs a life and bounces you clear.
- **Rings:** spawn 190 px past each planet; collect within 35 px → 50 + 10×combo (≤×10). Missing a ring zeroes the combo.
- **Rocks:** appear past x=900, placed opposite the planet's vertical half. Contact = life; **graze** within r+35 = +35 "CLOSE CALL" (once per rock).
- **Out of band** (free flight only): y beyond ±20 or behind the camera → lose a life, respawn at `camera+110` mid-height with forward speed.
- **Sectors:** every 2400 px → +150 points and **+1 life** (cap 3). Progress metric = metres (`ship.x/10`).
- **Easy orbit** mode: +35 tether reach, segregated best key (`hop:v3:relaxed`).

## Relics & synergies

Ring Compass (150 px ring attraction) · Solar Spool (hold to charge a protected golden release) · Longwave Tether (+80 reach) · Moon Sail (⅓ gravity) · Comet Aegis (shield, rebuilds per 3 rings) · Ring Reactor (rings add speed, every 4th = life).

- **Golden Slingshot** (Compass+Spool): charged releases pull rings from 340 px; rings extend golden flight.
- **Aurora Engine** (Aegis+Reactor): 2 rings rebuild the shield; blocking gives a protected boost.

## Feel targets

The skill is *reading the tangent before you commit*. The dotted launch preview and the orbit circle must make the release predictable; death should always feel like a bad release, never a surprise.

---

# 3. Stardust Dash (`dash`) — the catcher ★ home of the new power-ups

**Fantasy:** steer a moonboat through a meteor shower. Gold is good. Pink is trouble.
**Canvas:** 900 × 560. **75-second runs.** Verbs: steer, dash, *catch gifts*.

## Core rules

- **Catcher:** y fixed at H−72; keyboard 560 px/s, pointer-follow `(target−x)×13` clamped ±850, exponential smoothing (18/s). Bowl half-width **39** (55 with Wide Halo).
- **Waves:** 5 objects per wave, interval `max(.72, 1.45 − time×.008)` s; four lane patterns rotate (`wave % 4`); speed `155 + time×2.4 + i×6` px/s. Meteors (pink, r18, **0.55 s top-of-screen telegraph column**) vs stars (gold, r12). Every 7th wave includes a **jellyfish**: catch → star magnet 6 s + a life (cap 3).
- **Catch test:** vertical tolerance `r+10`, horizontal `basketWidth + r×.7`. Missed *star* → combo = 0.
- **Combo → multiplier:** `min(8, 1 + floor(combo/5))` → 10–80 points per star.
- **Dash (ability):** starts charged; 0.2 s burst at ±1250 px/s with 0.5 s invulnerability. Regen 8/s + 7/catch.
- **Win:** survive to 0 s ("Meteor shower: absolutely handled."). 3 lives.
- **Timer is sacred:** nothing slows `remaining`, spawn cadence, or charge gain — only falling speeds may be slowed.

## The Moonboat Expedition (shipped)

Two modes share the catcher: **Quick Forecast** is the 75 s instant-retry run above; daily skies take the **expedition** — six authored weathers with per-stage missions (`dashStages`), then the **Umbra Whale** finale at 225 s (catch 20 breath-stars), wrapping at 270 s (`WHALE_AT` / `EXPEDITION_LENGTH`). The last stretch stays gift-free (`giftsUntil` = 67 quick / 255 expedition).

## Power-ups (shipped: five)

Temporary gifts caught like stars, distinct from relics: **active on catch, one timed slot, replace-not-stack, timers freeze with drafts**.

| Power-up | Glyph | Duration | Effect |
|---|---|---|---|
| **Lodestone Bloom** | ◎ lilac | **8 s** | `magnet = max(magnet, 8)` — stars arc in from 260 px (300 with Lodestone relic, via existing `magnetReach()`) |
| **Clock Moth** | ⌛ mint | **6 s** | all falling speeds **×0.55**, uniformly — stars *and* meteors; restores over the remaining window, never instantly |
| **Moonshield** | ◇ pale green | **3 s** | grants **2 shields** on catch (cap 3) — two meteors bounce off |
| **Prism Net** | ≋ pink | **8 s** | vertical catch tolerance widens from `r+10` to `r+34` — catch above and below the line |
| **Star Prism** | ✦ gold | **12 s / 5 charges** | the next **five catches score ×3**; the slot ends when the charges are spent |

**Spawn system (deterministic):** schedule precomputed at `reset()` from `seeded(seed ^ 0x9c4d)` — first gift at **8–12 s**, then every **18–24 s**, never in the last 8 s, ids never repeat back-to-back, lanes rolled in [60, W−60] then nudged along fixed offsets (±80/160/240) until 90 px clear of any high meteor. The course RNG stream is untouched → **daily weather is bit-identical to the pre-pickup game**.

**Feedback contract:** beacon column + `NAME INCOMING` popup for the whole ~4 s fall (≥1.2 s rule) → `POWER UP · NAME` + burst + field + two-tone chime on catch → HUD chip top-left (glyph, name, seconds, draining bar) → `THE MAGIC FADES` at 2 s → per-power expiry line (`THE BLOOM CLOSES` / `THE MOTH FLIES ON` / `THE MOON REMEMBERS` / `THE NET FOLDS` / `THE PRISM DIMS`). A missed gift drifts by **without breaking the streak**. `onUpdate` carries `pickup` and `incoming`; `#game-status` announces incoming / active / expired for screen readers.

## Relics & synergies

Lodestone (permanent 180 px magnet) · Star Aegis (shield per 5 catches, max 2) · Wide Halo (+40% bowl) · Afterimage (dash leaves a 1.8 s catching echo) · Ion Cell (faster/longer dash) · Second Hand (every 6 catches +1.8 s, cap 90).

- **Magnetic Halo** (Lodestone+Aegis): attracted stars count double toward shields; a block supercharges attraction 3 s.
- **Twin Drive** (Afterimage+Ion): dashes leave a second echo at the destination; echo catches return 18 energy.

## Feel targets

Greedy repositioning (Bloom) and precision under pressure (Moth) are the two decision types the slice exists to prove. Playtest question: *"did the gift change what you did in the next five seconds?"*

---

# 4. Orbit Breaker (`breaker`) — cosmic pinball

**Fantasy:** keep the comet inside your orbit and shatter the constellation.
**Canvas:** 900 × 560, circular arena. Verbs: steer the paddle arc, slow time.

## Core rules

- **Arena:** centre (450, 280); paddle rides radius **235** with drawn width matching the *exact* contact test (`235 − 5 − cometRadius`); outer wall at 254, loss past 265.
- **Paddle:** angle follows pointer angle or ← → (3.5 rad/s); half-arc **0.43 rad** (0.68 while slowed, +0.20 Crescent Crown). Bounce = reflection biased by offset × .8 — **angle your hits to steer**.
- **Comet:** radius 8 (11 Dense Core), speed floor 285, +4 per paddle return (cap 490). Trail for readability.
- **Crystals:** three rings (r 62/111/157, counts 4/7/10 on wave 1, then 6/10/14) rotated by the daily seed; hp 1, armoured hp 2 (34% from level 2). Hit → 25 × min(combo, 8), charge +12.
- **Wave clear:** +500, +1 life (cap 3), new board. Launch grace timer 1.2 s (1.25 after a lost comet) orbits the comet safely before release.
- **THE multiball contract:** *only losing the final comet costs a life* — secondary comets fizz harmlessly. Any future splitter must preserve this.
- **Slow Orbit (ability):** 5 s at ×0.65 speed (7 s and comets turn inward with Chrono Coil).

## Relics & synergies

Twin Comet (multiball now + per 6 hits, cap 3) · Shatterglass (impacts shatter a neighbour within 62 px) · Crescent Crown (+half paddle) · Dense Core (heavy comet, one-hit armour) · Chrono Coil (more charge, longer slow) · Return Sigil (one saved comet; 6 returns restore it).

- **Prism Storm** (Twin+Shatter): secondary comets shatter two neighbours at 105 px.
- **Event Horizon** (Crown+Chrono): Slow Orbit spawns a second functional paddle opposite yours.

## Feel targets

Contact clarity is everything: the drawn paddle *is* the hitbox, and `LAST COMET` panic must read instantly. Waves need escalation variety (families, elites) — the least-developed game today, first in line for Milestone D.

---

# 5. Cross-game design law (carry these into the specialised game)

1. **One verb per game, taught in 10 seconds.** Complexity lives in systems (relics, power-ups, patterns), never in the base control.
2. **Telegraph everything ≥1.2 s**, with shape + text + colour — never colour alone. Meteors: column + glyph. Gifts: beam + name. Danger line: always drawn.
3. **Sim time is the only clock.** Timers tick in `step`; pauses, drafts, and hidden tabs freeze them for free. Zero `setTimeout` gameplay.
4. **Determinism is a feature.** New randomness ⇒ new salted stream consumed at reset. Never touch the course stream from a new system.
5. **Fail loud, fail fair, fail forward.** Every death names its cause; recaps always bank something and offer exactly one next goal; retries are <50 ms.
6. **Power is run-scoped; pride is persistent.** Stamps, field guides, archives, and cosmetics persist. No permanent mechanical upgrades — that's the anti-power-creep freeze.
7. **Canvas-first, DOM-authoritative.** All critical info lives in the canvas (DOM scrolls away on phones), but every state change also reaches the DOM/live region for assistive tech.
8. **Feedback has four states** — announced, active, ending, ended — for anything temporary. Nothing silently appears or vanishes.
9. **Effects caps:** 280 particles, 14 popups, 3 comets, 4 echoes — the flat-heap, zero-leak record is a release gate.
10. **Performance gates:** 60 FPS desktop, ~30 FPS under 4× mobile throttle, idle-render behind modals, no per-frame allocations in hot loops, blur banned on mobile/reduced-motion.

## Validation gates

Checked-in, reproducible gates (ephemeral `/tmp/opencode/...` scripts are not a suite):

```sh
for f in ./*.js; do node --check "$f" || exit 1; done   # syntax; no dependencies
npm install                                              # dev-only: Playwright
npm run test:trials                                      # trial registry check
npm run test:browser                                     # Playwright browser smoke
```

## Roadmap snapshot (see GAMEPLAY-EXPANSION-PLAN.md)

- **Shipped:** relics + synergies + daily mode + theatre · dash power-ups (5) · dash Moonboat Expedition with weathers, missions and the Umbra Whale finale · Stellar Pact · suspended-render fix.
- **Next:** Planet Drop Seasons → Comet Surf Skyway → Orbit Breaker Siege → shared extraction → rewards economy (cosmetic only).
