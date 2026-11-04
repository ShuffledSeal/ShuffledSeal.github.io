# Æther Arcade — Full Gaming Experience Plan

## Vision

Make every arcade cabinet feel like a complete, replayable little game:

1. **Immediate fun** — the player catches, dodges, merges, or launches something within seconds.
2. **Readable choices** — every power-up has a clear icon, sound, colour, duration, and consequence.
3. **Build variety** — temporary pickups change the current moment; relics shape the whole run.
4. **Escalation** — new patterns, hazards, missions, and elite encounters appear as the run continues.
5. **A satisfying ending** — a final wave, boss, constellation, or score target gives the run a climax.
6. **A reason to replay** — alternate routes, daily seeds, challenge modifiers, cosmetics, and different builds.

The target is a polished **3–6 minute expedition** with a meaningful decision every 30–45 seconds, while preserving the existing fast retry flow and local-only architecture.

## Design vocabulary

Keep the current distinction clear:

- **Power-ups** are temporary pickups found in the playfield. They create immediate excitement and expire during the run.
- **Relics** are the existing three-choice draft rewards. They remain active for the whole run and form synergies.
- **Stardust** is the persistent reward used for discovery stamps, cosmetics, cabinet themes, and records—not permanent power creep.
- **Events** are short rule changes such as low gravity, a meteor shower, a blackout, or a golden minute.

Do not replace relics with power-ups. The combination is the fun: *grab a power-up now, then choose the relic that makes that kind of play stronger later*.

---

# 1. Stardust Dash → **Starcatcher: Moonboat Run**

This is the first vertical slice because it already has the clearest catcher fantasy: move a basket/moonboat, catch good objects, dodge dangerous objects, and spend a charged dash.

## Core moment-to-moment loop

```text
steer → catch a short chain → choose a risky lane → grab a power-up
→ spend the power-up to survive an escalating wave → choose a relic
→ reach the next sector → defeat the finale or bank the score
```

### Run structure

| Stage | Time | What changes |
|---|---:|---|
| Wake the sky | 0:00–0:35 | Stars, slow meteors, first guaranteed power-up |
| Crosswind | 0:35–1:20 | Horizontal wind lanes and alternating spawn patterns |
| Jelly tide | 1:20–2:05 | Helpful jellyfish, decoy stars, first relic draft |
| Pink weather | 2:05–2:55 | Faster meteors, narrow safe lanes, elite meteor |
| The long night | 2:55–3:45 | Two simultaneous patterns and power-up scarcity |
| Finale | 3:45–4:30 | The Umbra Whale / comet maw drops star clusters and hazards |

The existing 75-second mode becomes **Quick Forecast**, while the full structure becomes **Moonboat Expedition**. Daily mode uses the full structure with a deterministic seed.

## Temporary power-ups

Power-ups should be large enough to read on mobile, telegraphed by a unique silhouette, and announced with a short status message. Each lasts 4–10 seconds or has a limited number of charges.

| Power-up | Feel | Effect | Risk/reward hook |
|---|---|---|---|
| **Lodestone Bloom** | Stars arc into the catcher | Pulls good objects from a wide radius | Also pulls one marked meteor unless the player dashes |
| **Prism Net** | Basket grows a glowing second rim | Catches stars above and below the normal line | Missed stars do not break the combo, but the net drains quickly |
| **Clock Moth** | Time bends around the boat | Slows falling objects by 45% | The combo timer also slows, encouraging precision rather than panic |
| **Moonshield** | A visible bubble wraps the boat | Blocks the next two hits | A blocked meteor gives a short overdrive burst |
| **Twin Boat** | A ghost boat mirrors the player | Echo catches good stars for half points | Echo catches do not protect against meteors |
| **Comet Vacuum** | The boat leaves a bright wake | Sweeps a horizontal lane clean | The wake can collect a dangerous pink comet for bonus score |
| **Star Prism** | Caught stars split into three sparks | Triple score for the next five catches | Chain breaks immediately if the player misses one |
| **Golden Minute** | Screen turns warm gold | Every catch adds time and score | A rare power-up that appears only after a risky streak |
| **Decoy Moon** | A tiny moon follows behind | Pulls meteors away from the catcher | It can be destroyed; saving it grants a bonus at wave end |
| **Emergency Repair** | A small brass toolkit | Restores one life or converts a hit into a shield | Cannot appear while the player has full lives |

### Power-up presentation rules

- A power-up announces itself **1.2 seconds before entering the catch line** with a beam and a plain-language label.
- The HUD shows **icon + remaining seconds/charges**, not only colour.
- The player can hear a distinct three-note sound but never needs sound to understand it.
- Pickup, activation, expiration, and wasted pickup all get separate feedback.
- Power-ups never spawn directly on a meteor without a visible warning.

## Relic synergies for the catcher

Keep the current six relics, then add a second batch only after the power-up slice is proven:

- **Lodestone + Prism Net — “Aurora Catch”**: attracted stars pass through the net and become bonus stars.
- **Star Aegis + Moonshield — “Fortress of Light”**: blocking a meteor charges a full dash and preserves the combo.
- **Afterimage + Twin Boat — “Two Moons”**: the echo boat repeats the last power-up for half duration.
- **Ion Cell + Clock Moth — “Borrowed Seconds”**: dash energy refills when time is slowed.
- **Second Hand + Golden Minute — “Noon at Midnight”**: caught clock sparks extend the run, but the finale arrives sooner.
- **Wide Halo + Comet Vacuum — “The Big Net”**: a full-width sweep catches a complete horizontal constellation.

The first four synergies are enough for the first release. Avoid adding a large catalogue before players can clearly feel the existing relics.

## Objectives and missions

Each stage rolls one primary mission and one optional dare:

- Catch 12 stars without missing.
- Catch three stars while holding the centre lane.
- Dodge every meteor in a wave.
- Collect the marked constellation in order.
- Use a power-up within two seconds of its warning.
- Finish a wave with a full shield.
- Take one deliberate meteor graze for a bonus, then survive.

Mission cards should show **progress / target / reward**. Completing a primary mission grants a power-up choice; completing a dare grants bonus stardust and a score multiplier.

## Finale: The Umbra Whale

The whale is a friendly cosmic silhouette, not a violent enemy. It swims across the upper screen and opens three star-filled “breaths.”

1. **Read the pattern** — the breath telegraph shows safe and dangerous lanes.
2. **Catch the constellation** — collect the gold stars before they fade.
3. **Use the environment** — power-ups appear in dangerous lanes, making greed a choice.
4. **Three breaths** — each breath is faster and changes the pattern.
5. **Clear or escape** — success grants a finale badge; failure still banks the run score.

The whale should be beatable in under 45 seconds and never require a specific relic.

## Modes

- **Quick Forecast** — current 75-second game; good for instant retries.
- **Moonboat Expedition** — full six-stage run with a finale.
- **Daily Sky** — fixed wave seed, fixed power-up placements, global-feeling local best.
- **Endless Weather** — stages continue until three lives are gone; difficulty has a visible forecast.
- **Zen Catch** — no meteors, relaxed music, power-ups appear often, score is optional.
- **Challenge Cards** — one modifier per run: tiny catcher, no shields, double stars, meteor mirror, or power-ups expire twice as fast.

## Catcher MVP implementation order

1. Add a temporary `pickup` entity type and deterministic pickup spawning.
2. Add three pickups only: Moonshield, Lodestone Bloom, and Clock Moth.
3. Add a compact active-power HUD and announce pickup/expiry through `onUpdate`.
4. Add 15-second wave definitions with one mission card.
5. Add a 3-minute Expedition mode without the boss.
6. Add relic/power-up synergy hooks and visual feedback.
7. Add the Umbra Whale finale.
8. Add Endless, Zen, and Challenge Card modifiers only after playtesting the core mode.

## Catcher acceptance criteria

- A new player understands “catch stars, avoid pink meteors” in under 10 seconds.
- The first power-up appears by 20 seconds in normal play and is never hidden behind a hazard.
- At least three power-ups can be useful in the same run without cluttering the HUD.
- A power-up changes the player’s immediate decision, not only the score number.
- Every power-up has a visible start, active state, and end state.
- A skilled player can reach the finale without owning any particular relic.
- A failed run ends with a recap showing catches, power-ups used, missions, relics, and one next goal.
- Keyboard, pointer, touch, reduced motion, daily determinism, and retry remain functional.

---

# 2. Planet Drop → **Planet Drop: Observatory Seasons**

Turn the merge cabinet into a sequence of short “seasons” instead of one endless jar.

## New run beats

- **Forecast**: choose one of three conditions before the first drop: low gravity, crowded skies, or generous next-piece previews.
- **Contracts**: merge three pairs of a named tier, keep the danger line clear for 20 seconds, or create a chain of four.
- **Cosmic events**: drifting moon, meteor wobble, magnetic hour, or blackout queue.
- **Season boss**: a temporary oversized planet blocks the jar until the player completes a special merge pattern.

## Temporary drops

- **Gravity Pearl** — slows all planets for four seconds.
- **Vacuum Seed** — pulls the next two matching planets together.
- **Rim Lantern** — reveals the danger line and grants overflow grace.
- **Meteor Coin** — clears one small planet but adds a dangerous large one.
- **Second Chance Moon** — bounces the next drop once from the side wall.

The player chooses whether to spend a pickup now or save it for a crowded jar. Relics should modify these pickups rather than make them irrelevant.

## Replay modes

- **Classic Jar** — current free-form mode.
- **Season Run** — five contracts and a final supernova test.
- **Puzzle Jar** — a fixed queue and target arrangement.
- **Daily Stack** — fixed queue, fixed seed, score comparison through local records.

---

# 3. Comet Surf → **Comet Surf: The Branching Skyway**

Make each planet a decision rather than a random obstacle.

## Route map

After each sector, offer two or three visible routes:

- **Gold route** — more rings, more hazards, better score.
- **Moon route** — slow, safe, more shield pickups.
- **Storm route** — dangerous shortcuts and rare relic fragments.

Each route previews distance, hazard type, and reward. The player can deliberately build a run around speed, safety, or greed.

## Power-ups

- **Anchor** — stop at the next planet and re-aim once.
- **Tailwind** — doubles launch speed for one release.
- **Ring Bloom** — turns one ring chain into a line of three.
- **Orbit Lens** — shows the next two launch arcs.
- **Ghost Tether** — a second tether can be grabbed within two seconds.

## Full-game climax

At the end of a route, the player outruns a solar flare. Rings mark the safe path, while the flare closes the screen from behind. The final score is based on distance, rings, and route risk.

---

# 4. Orbit Breaker → **Orbit Breaker: Constellation Siege**

Give the pinball game a wave-based structure with crystal families and minibosses.

## Crystal families

- **Armoured** — needs a strong impact or repeated hits.
- **Mirror** — reflects the comet at a readable angle.
- **Pulse** — sends a warning ring through the arena when destroyed.
- **Seed** — grows two small crystals unless destroyed quickly.
- **Heart** — clearing it completes the wave and restores a life.

## Power-ups

- **Orbit Mine** — place a temporary bumper anywhere with pointer/touch.
- **Solar Laser** — the paddle fires a line after three good contacts.
- **Gravity Well** — bends the next comet toward the nearest crystal.
- **Paddle Bloom** — expands the paddle for one orbit.
- **Comet Splitter** — creates a controllable secondary comet for eight seconds.

## Wave structure

1. Five introductory crystals.
2. A family wave with one new rule.
3. A power-up choice.
4. An elite crystal guarded by two hazards.
5. A constellation boss with three breakable phases.

The “only the final comet costs a life” rule must remain clear when multiball is active.

---

# 5. Shared arcade systems

These systems should be shared across games without forcing every game to feel identical.

## Power-up data shape

Use a small data-driven catalogue in `arcade.js`:

```js
{
  id: 'moonshield',
  name: 'Moonshield',
  glyph: '◇',
  colour: '#9ed7c6',
  duration: 7,
  charges: 2,
  games: ['dash'],
  description: 'Blocks the next two meteor hits.',
  onCollect(state) {},
  onStep(state, dt) {},
  onExpire(state) {}
}
```

The actual game physics remain in each game step function. The shared layer owns spawning, expiration, HUD state, deterministic selection, and feedback.

## Shared feedback

- `POWER UP · MOONSHIELD` toast on collection.
- A small active-power strip near the canvas corner.
- A radial timer or charge pips.
- Distinct pickup sound and reduced-motion-safe flash/ripple.
- `onUpdate({ pickups, missions, wave, event })` for the DOM HUD.
- Canvas fallback labels so the game remains understandable when the DOM is below the fold.

## Persistent rewards

Do not make permanent unlocks stronger than new players’ options. Persistent rewards should be:

- cabinet stamps;
- alternate boat, planet, comet, and catcher artwork;
- colour palettes and victory banners;
- title cards such as “Meteor Whisperer”;
- new challenge cards;
- archive records and best-run postcards.

## Difficulty rules

- Add one new idea at a time; never increase speed and hazard density simultaneously without warning.
- Give the player a recovery tool after a mistake.
- Never hide a required pickup inside a lethal lane.
- Every boss has a readable telegraph and a safe baseline strategy.
- Randomness changes patterns, not whether controls work.
- Daily mode changes the course, not the rules.

---

# 6. Delivery roadmap

## Milestone A — Catcher power-up vertical slice

Implement Moonshield, Lodestone Bloom, Clock Moth, active HUD, deterministic pickup placement, one mission, and a 90-second two-wave mode. Test keyboard, touch, reduced motion, retry, and relic drafting.

## Milestone B — Full Catcher expedition

Add six stages, stage objectives, three additional pickups, power-up/relic synergy feedback, recap improvements, and the Umbra Whale finale.

## Milestone C — Shared arcade polish

Extract common pickup presentation, mission cards, wave announcements, challenge modifiers, and post-run rewards. Keep each game’s physics independent.

## Milestone D — Expand the other three cabinets

Add one full-game mode and three temporary power-ups to Planet Drop, Comet Surf, and Orbit Breaker. Reuse the same HUD and feedback contracts, but keep each cabinet’s fantasy distinct.

## Milestone E — Replayability and archive

Add daily route records, challenge cards, cosmetic unlocks, finale badges, and cabinet archive pages. Run performance and accessibility audits after every game expansion.

## Explicitly out of scope for the first pass

- online leaderboards;
- accounts or servers;
- procedural content that cannot be replayed from a seed;
- permanent stat upgrades that create grind or pay-to-win pressure;
- a separate inventory screen before the in-game HUD is excellent;
- adding dozens of power-ups before the first three are fun.
