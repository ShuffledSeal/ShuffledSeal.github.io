# Relic and upgrade legibility audit

## Final integrated-tree result

**Final reviewed snapshot:** 2026-11-12T18:17:57Z
**Result:** **PASS — 0 defects across 24/24 reached scenarios.** The audit and every threshold were unchanged from the earlier independent review. No source file changed during this final run, and no surface or required text coverage was unreachable.

This passing result supersedes the earlier failure, but does not discard it. The **2026-11-12T17:18:38Z snapshot with 21 defect instances** is preserved below with its measurements and all seven original findings.

### Final evidence

- Log: `/tmp/opencode/relic-legibility-audit-final-review-doxZot/run.log`
- Full measurements and before/after source hashes: `/tmp/opencode/relic-legibility-audit-final-review-doxZot/report.json`
- Screenshots: `/tmp/opencode/relic-legibility-audit-final-review-doxZot/*.png`
- Final command: `python3 tests/relic-legibility-audit.py --output /tmp/opencode/relic-legibility-audit-final-review-doxZot` → **exit `0`**
- `python3 -m py_compile tests/relic-legibility-audit.py` → pass
- `git diff --check -- tests/relic-legibility-audit.py docs/relic-legibility-audit.md` → pass

### Exact final measurements

Each cell is `visible text samples / minimum font px / minimum text contrast`. Every cell passed every audit gate, not only the three measurements shown here.

| Surface | Desktop 1440 | Phone 390 + reduced motion | Desktop 200% zoom |
| --- | --- | --- | --- |
| Arcade catalogue | **PASS** · 20 / 14 / 5.25 | **PASS** · 20 / 14 / 5.25 | **PASS** · 20 / 14 / 5.25 |
| Arcade draft | **PASS** · 17 / 12 / 5.23 | **PASS** · 17 / 12 / 5.04 | **PASS** · 17 / 12 / 5.04 |
| Chain | **PASS** · 10 / 14 / 6.09 | **PASS** · 10 / 14 / 6.09 | **PASS** · 10 / 14 / 6.09 |
| Skirmish | **PASS** · 5 / 16 / 9.03 | **PASS** · 5 / 16 / 9.03 | **PASS** · 5 / 16 / 9.03 |
| Bastion | **PASS** · 21 / 12 / 6.96 | **PASS** · 21 / 12 / 6.96 | **PASS** · 21 / 12 / 6.96 |
| Labyrinth | **PASS** · 4 / 16 / 9.41 | **PASS** · 4 / 16 / 9.41 | **PASS** · 4 / 16 / 9.41 |
| Deep Field | **PASS** · 11 / 12 / 5.73 | **PASS** · 11 / 12 / 5.73 | **PASS** · 11 / 12 / 5.73 |
| Grand Tour | **PASS** · 15 / 14 / 5.95 | **PASS** · 15 / 14 / 5.95 | **PASS** · 15 / 14 / 5.95 |

Final totals:

- **24/24 scenarios reached**, 24 screenshots, **0 unreached**, **0 browser exceptions**, **0 defects**.
- **309 text samples**, **114 enabled controls**, **114/114 `:focus-visible` matches** during keyboard review.
- **0 keyboard-order, initial-focus, focus-indicator, or focus-contrast defects**.
- **0 text-clipping, surface-overflow, or page-horizontal-overflow defects**; maximum measured horizontal overflow was **0 px**.
- Reduced-motion preference was active in all eight phone scenarios; **0 reduced-motion animation defects**.
- **0 body-text contrast defects**; minimum measured text contrast was **5.0433:1** (reported as 5.04 in the table).
- Minimum measured focus-outline contrast was **7.0546:1**, above the 3:1 gate.
- Minimum measured font size was **12 px**. Minimum measured line-height ratio was **1.15×**, on a heading above the applicable 1.10× gate; essential and metadata line-height gates also passed.
- Defect categories and severities: **none**. **No remaining issue was observed within this audit's coverage.**

## Reproduce

From `aether/` with the developer-only Python Playwright installation:

```sh
python3 tests/relic-legibility-audit.py
```

Target one surface or viewport while iterating:

```sh
python3 tests/relic-legibility-audit.py --surface arcade-draft
python3 tests/relic-legibility-audit.py --config phone-390-reduced
python3 tests/relic-legibility-audit.py --surface deepfield --config desktop-1440-zoom-200
```

Exit codes: `0` = all requested scenarios reached and clean; `1` = observed defects; `2` = a surface or required text coverage could not be audited. The runner starts its own loopback static server and uses isolated browser contexts without save-state injection.

## Coverage and method

| Surface | How the real state is reached |
| --- | --- |
| Arcade catalogue | Open the actual Planet Drop relic field guide. |
| Arcade draft | Start a real forecast and advance the actual game through its quiet-run first-discovery fallback (17.5 simulated seconds). |
| Chain draft + formations | Launch the campaign, steer with pointer input, and clear the first encounter. |
| Skirmish refit | Use real fire, movement and dash controls until the field refit opens. |
| Bastion tower + refinement | Place/select a Needle through the real canvas and inspect construction, orders and refinement controls. |
| Labyrinth draft | Traverse authored chamber I with keyboard controls, collect both keys and escape. |
| Deep Field intermission | Make a protected opening, use the public deterministic generator only as mine knowledge, and reveal safe sectors through actual cell clicks. |
| Grand Tour instrument draft | Begin a tour, retreat from the first hunt, leave the second-leg oddity untouched, and enter the third-leg mutation. |

No offer markup, cosmetic game state, or saved progression is fabricated. Virtual time advances the real simulation where needed. Every scenario waits 750 ms for entrance animations and `document.fonts.ready`; minimum per-surface text coverage prevents delayed cards from producing a partial pass.

Each surface is checked at:

1. **1440×900**, DPR 1, normal motion.
2. **390×844**, mobile/touch context, `prefers-reduced-motion: reduce`.
3. **1440×900 physical pixels at 200% browser-zoom-equivalent device metrics:** 720×450 CSS px, DPR 2. This uses Chromium CDP device metrics, not cosmetic CSS zoom. Pointer scale remains 1 so hit-testing stays correct. Zoom screenshots use CDP document capture so Playwright cannot silently restore the desktop viewport.

The runner measures direct visible text nodes, computed font/line metrics, DOM text ranges and overflow, foreground/background contrast, native tab transitions, `:focus-visible` indicators, page/surface overflow, reduced-motion animations, and uncaught browser exceptions. Full-page screenshots are retained for visual review.

### Gates — unchanged between snapshots

| Check | Gate |
| --- | --- |
| Normal text contrast | 4.5:1 |
| Large text contrast | 3:1 (24 px regular or 18.66 px / 700 bold) |
| Essential upgrade/control copy | 12 CSS px minimum and 1.4 line-height minimum |
| Supplementary metadata | 10 CSS px minimum and 1.3 line-height minimum |
| Headings | 16 CSS px minimum and 1.1 line-height minimum |
| Focus indicator | Present on every enabled control; outline contrast at least 3:1 against the adjacent surface |
| Clipping/overflow | No clipped text, surface horizontal overflow, or page horizontal overflow beyond 1 px |
| Reduced motion | No nonessential CSS/Web Animations in the static relic surfaces |
| Browser health | No uncaught exceptions; every requested surface and its complete offer must be reached |

The font-size and line-height minima are deliberately strict **project UX gates**, not a claim that WCAG specifies a universal minimum font size or default line-height. Inactive controls are excluded from mandatory text-contrast scoring. `line-height: normal` is measured from actual DOM line boxes rather than assumed to be compliant.

Contrast is a computed-style audit: ancestor backgrounds and gradient colour stops are composited, negative-z-index button fills are included, and the local parchment asset is represented by its real `#d8c6a1` base. The weakest plausible ratio is reported with its colour pair. Tiny foreground corner ornaments are not mistaken for full backgrounds. This is not a bitmap/OCR validator; canvas-rendered HUD text is outside this DOM-surface audit. Chromium was tested, not Firefox or WebKit.

## Earlier independent snapshot — 21 defects, preserved

**Earlier reviewed snapshot:** 2026-11-12T17:18:38Z
**Earlier result:** **FAIL — 21 defect instances (7 unique issues) across 24/24 reached scenarios: 9 P1 and 12 P2.** No source file changed during that run. The failure exit was intentional; thresholds were not relaxed during concurrent CSS work.

Earlier evidence remains at:

- Log: `/tmp/opencode/relic-legibility-audit-final-snapshot.log`
- Measurements/source hashes: `/tmp/opencode/relic-legibility-audit-final-snapshot/report.json`
- Screenshots: `/tmp/opencode/relic-legibility-audit-final-snapshot/*.png`
- Command: `python3 tests/relic-legibility-audit.py --output /tmp/opencode/relic-legibility-audit-final-snapshot` → **exit `1`**

### Earlier exact results

Each cell is `result · visible text samples / minimum font px / minimum text contrast`.

| Surface | Desktop 1440 | Phone 390 + reduced motion | Desktop 200% zoom |
| --- | --- | --- | --- |
| Arcade catalogue | **PASS** · 20 / 14 / 5.25 | **PASS** · 20 / 14 / 5.25 | **PASS** · 20 / 14 / 5.25 |
| Arcade draft | **FAIL (2)** · 17 / 12 / 5.23 | **FAIL (2)** · 17 / 12 / 5.04 | **FAIL (2)** · 17 / 12 / 5.04 |
| Chain | **FAIL (1)** · 10 / 14 / 6.09 | **FAIL (1)** · 10 / 14 / 6.09 | **FAIL (1)** · 10 / 14 / 6.09 |
| Skirmish | **PASS** · 5 / 16 / 9.03 | **PASS** · 5 / 16 / 9.03 | **PASS** · 5 / 16 / 9.03 |
| Bastion | **PASS** · 21 / 12 / 6.96 | **PASS** · 21 / 12 / 6.96 | **PASS** · 21 / 12 / 6.96 |
| Labyrinth | **PASS** · 4 / 16 / 9.41 | **PASS** · 4 / 16 / 9.41 | **PASS** · 4 / 16 / 9.41 |
| Deep Field | **PASS** · 11 / 12 / 5.73 | **PASS** · 11 / 12 / 5.73 | **PASS** · 11 / 12 / 5.73 |
| Grand Tour | **FAIL (4)** · 15 / 9 / 5.95 | **FAIL (4)** · 15 / 9 / 5.95 | **FAIL (4)** · 15 / 9 / 5.95 |

Earlier totals were **309 text samples**, **114 enabled controls**, **114/114 `:focus-visible` matches**, **0 browser exceptions**, and **0 clipping/overflow failures**. Defect categories were **9 line-height**, **6 font-size**, **3 initial-focus**, and **3 focus-contrast**. The earlier minimum body-text ratio was 5.04:1; the separate arcade focus-ring failure was 1.12:1.

### Earlier findings and final resolution

1. **P1 — Grand Tour instrument draft dropped focus onto `<body>` (3 instances).** After entering a mutation through its real route, `document.activeElement` was outside `.tour-cache`, forcing keyboard users to restart navigation. **Final:** all three configurations focus the first `.tour-cache-card` inside `.tour-cache`; no initial-focus or tab-order defect remains.
2. **P1 — Arcade “Keep my current build” focus ring was 1.12:1 on parchment (3 instances).** **Final:** the focused footer button has a 3 px `rgb(73, 51, 28)` outline measuring **7.0546:1**, and every suite focus indicator passes.
3. **P1 — Grand Tour “Leave the draft behind” was 10 px (3 instances).** **Final:** this action is **16 px** in the desktop measurement and all configurations pass the 12 px essential-copy gate.
4. **P2 — Grand Tour “AN INSTRUMENT DRAFT” eyebrow was 9 px (3 instances).** **Final:** it is **14 px / 21 px line box = 1.50×** on desktop, with all configurations passing the metadata gates.
5. **P2 — Grand Tour exit used `line-height: normal`, with an actual 13 px / 10 px = 1.30× line box (3 instances).** **Final:** it is **16 px / 24 px = 1.50×** on desktop, above the 1.40× essential-copy gate in every configuration.
6. **P2 — Arcade `#relic-title` line-height was 1.06× (3 instances).** Earlier line boxes were 49.82 px desktop, 33.92 px phone, and 38.16 px at 200% zoom. **Final:** desktop title metrics are **47 px / 56.4 px = 1.20×**, and all configurations pass the heading gate.
7. **P2 — Chain `.chain-draft h3` line-height was 1.06× (3 instances).** **Final:** desktop metrics are **16.38 px / 20.475 px = 1.25×**, and all configurations pass the heading gate.

## Final assessment and limits

The current integrated tree passes every gate for the eight audited relic/upgrade surfaces at desktop, phone/reduced-motion, and 200% zoom. This is a measured result for the reviewed DOM surfaces, not a blanket accessibility certification of every game, separate puzzle surface, canvas-rendered text, Firefox, or WebKit. The unchanged runner, raw JSON, screenshots, and preserved earlier report provide the before/after evidence.
