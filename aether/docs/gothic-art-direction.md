# Æther — Gothic art direction and presentation contract

## The midnight chapter

The product is a Victorian observatory built as a playable cabinet of occult instruments, not a neutral admin dashboard. The shared presentation layer is `gothic.css`, loaded after the historical component and motion styles in `index.html`.

| Material | Use | Core colours |
| --- | --- | --- |
| Midnight blue / black enamel | Workspace, headers, cartridge cards, game chassis | `#060d18`, `#071525`, `#0b1b2c` |
| Oxblood mahogany | Navigation, active routes, seals, relic icon lancets | `#160d13`, `#5c2430`, `#351522` |
| Tarnished brass | Rules, keys, instrument rings, visible keyboard focus | `#c5a365`, `#f0d69a`, `#f6d58f` |
| Ivory etching | Primary type and historical plate ink | `#f1e6cf`, `#f1e2c3` |
| Illuminated parchment | Relic drafts, field guides, atlas facts | `#d8c6a1`, ink `#30271b` / `#40362a` |
| Stained glass | Restrained blue, wine and verdigris accents in local lancets | Never the sole carrier of game state |

IM Fell English supplies the illuminated-manuscript voice; DM Sans remains the readable interface and gameplay-copy face. Large titles may be expressive. Body instructions, choices and state changes may not be sacrificed to ornament.

## Original local illustrations

- `assets/gothic-window.svg`: a pointed lancet with oxblood/blue stained glass, ivory stars, brass tracery and an original armillary.
- `assets/gothic-frame.svg`: illuminated-manuscript rules and four Gothic corner lancets; replaces generic rounded card chrome.
- `assets/relic-seal.svg`: an armillary reliquary used for relic discovery and catalogue ornament.
- Existing `gothic-arch.svg`, `armillary.svg`, `victorian-icons.svg` and `instrument-icons.js` remain the shared instrument family. Do not regress these to stock Unicode pictograms.

All three new files are original vectors with no external art, embedded raster image, stock asset or font dependency. `assets/ENGRAVINGS.md` records this while preserving every Wellcome Collection public-domain source and the existing font licences.

## Shared CSS rules

1. **Ornament belongs to furniture, not reading.** Arches and etching stay at the edges or beneath opaque reading surfaces. Canvas decoration must not look like a projectile, pickup or telegraph.
2. **Paper is intentional.** Relic choices and selected field-guide surfaces stay parchment with dark ink. The product is not uniformly beige; enamel is the dominant shell.
3. **Readable relics are a hard contract.** `.relic-choice-effect` is at least 16px; pairings, tags, descriptions and footer guidance are at least 14px. Normal text contrast is at least 4.5:1. Relic and shared keyboard focus is a visible 3px solid outline with offset.
4. **Motion is optional.** The final reduced-motion rule disables decorative animation and transitions. Scores do not flash or tick-animate. Essential simulation may continue; decorative battle-art time freezes when reduced motion is requested.
5. **Small screens reflow.** The cabinet becomes one column, cartridge etchings stack above copy, the sidebar becomes a modal drawer, and dialogs retain their own vertical scrolling. Do not use fixed heights to make a screenshot fit.
6. **Canvas pixels are not colour-graded by the shell.** The former shared saturation/contrast filter is explicitly reset to `none`; gameplay teams own their palettes and telegraph contrast.

## Concrete canvas direction for gameplay teams

`battle-art.js` demonstrates the shared treatment without changing simulation, collisions, enemy attack timing or public engine contracts.

- Paint the midnight/oxblood gradient, mineral stars, planets, lancets and armillary etching into the existing **seeded cached background**. Do not allocate SVGs, images or canvases per animation frame.
- Edge lancets use approximately 12% oxblood fill and 7–13% ivory/brass stroke. The central armillary is approximately 7% stroke. These are background values, not targets for interactive objects.
- Keep the player, enemies, pickups and attack warnings at full gameplay opacity. Existing enemy palette identities and windup geometry remain intact. A pointed arch must never be mistaken for a hitbox.
- Decorative arc movement and thruster flicker use `artTime()`, which returns zero under `prefers-reduced-motion: reduce`. Do not remove essential danger, damage or objective feedback.
- Do not place ornamental text over a playfield. Labels, goals and controls belong in the readable DOM frame around it.
- New illustration should be bespoke local SVG/WebP or deterministic procedural Canvas 2D. Record external provenance before adding any third-party asset.

## Reproducible visual review

Run from this directory with Python Playwright and its Chromium browser installed:

```sh
python3 tests/gothic-presentation.py
```

No npm script or runtime dependency was added. The runner starts an ephemeral local server and isolated browser contexts, never clears player storage, and writes evidence to `docs/gothic-proof/`. Direct Veteran routes use an explicit unlock fixture inside their isolated test context only:

- `observatory-{390,768,1440}.png`
- `cartridge-cabinet-{390,768,1440}.png`
- `planetary-atlas-{390,768,1440}.png` and `atlas-watershed-{390,768,1440}.png`
- `arcade-relic-{390,768,1440}.png`, plus `arcade-relic-zoom200.png` and the physical-pixel `arcade-relic-zoom200-device.png`
- Live Starfall Skirmish, Aether Bastion, Glass Labyrinth, Constellation Chain, Deep Field and Starforge frames at all three widths
- `veteran-{shooter,bastion,labyrinth,starforge,chain,deepfield}-390.png`, with direct-route font, line-height, contrast, copy and unlock-mount assertions
- `cosmic-arcade-390.png`
- `measurements.json`, containing computed fonts, worst-case opaque-surface contrast, overflow checks, focus/scroll results and any browser or asset errors

The relic offer is earned by the real arcade engine under a fixed Playwright clock. Gameplay captures interact with the real canvases: held fire, chain start, labyrinth movement and a Deep Field reveal. The 200% case uses a 720×450 CSS viewport at DPR 2 and verifies a 1440×900 device screenshot. The relic dialog is scrolled to its final skip action at both phone size and 200%.

### Review procedure

1. Compare the actual screenshots, not just the assertions: material coherence, pointed-arch silhouettes, local illustration quality, canvas readability and text wrapping.
2. Inspect `measurements.json` for the minimum primary/secondary sizes and worst contrast by state. A syntax check is not visual verification.
3. Test any follow-up at 390×844, 768×1024 and 1440×900 with reduced motion. Preserve keyboard focus and scrolling when adjusting type.
4. If parallel gameplay work changes a frame, recapture it before sign-off. Shell approval does not certify combat balance, game feel or external playtesting.

## Review outcome — 2026-11-12

The checked-in runner passed after a real correction cycle. The first review found two legacy 2px focus rules, an undersized overview kicker, atlas labels without an explicit paper surface, and a dark-on-dark primary-button pseudo-element. Those defects were fixed; the capture procedure was also tightened so the phone cabinet starts at its header, the phone relic test actually runs at 390px, and Skirmish must report `data-phase="combat"` before its action capture.

| Evidence | Latest measured result |
| --- | --- |
| Gallery | 42 real-browser PNGs; all six flagship cartridge frames at 390/768/1440 and six direct Veteran headers at 390 |
| Audited states | 19, plus primary-face, focus, scroll, score-motion, asset and console checks |
| Observatory type / worst contrast | 18px primary, 14px secondary / 8.91:1 |
| Cabinet type / worst contrast | 16px primary, 14px secondary / 7.89:1 |
| Atlas intro and facts / worst contrast | 16px primary, 14px secondary / 5.15:1 |
| Relic draft / worst contrast | 16px primary, 14px secondary / 5.23:1 |
| Keyboard focus | 3px solid on cabinet cards and parchment relic choices |
| Direct Veteran headers | Six at 390px; 16px / 1.5 line-height / 10.82:1 worst contrast; exact current copy and Veteran mount asserted |
| Phone relic scrolling | 818px visible / 1070px content; skip action reached |
| 200% relic scrolling | 416px visible / 758px content; skip action reached; 1440×900 device PNG verified |
| Browser and network errors | None in the passing run; `measurements.json` retains the arrays |

Exact scroll heights can change with the dealt relic copy; the runner checks reachability rather than freezing a particular card's text length.

The pre-existing `python3 tests/relic-typography.py` suite also passed after the final cascade: **46 real-browser typography audits** covering arcade, skirmish, chain, bastion, labyrinth, Deep Field, Grand Tour and puzzle instruments, with keyboard activation, contrast, focus, reduced motion, overflow and scrolling intact.

**Starforge follow-up resolved:** `renderCartridge()` now omits only a standard-mode goal that is exactly identical to the brief already shown. Distinct goals and all daily/veteran mode text are unchanged. `tests/gothic-presentation.py` asserts one occurrence of the Starforge brief at 390, 768 and 1440px, and `index.html` loads the integration as `voyage.js?v=38`.

**Veteran header follow-up resolved — 2026-11-13:** `.veteran-rule` now uses readable brass `#e3c28d`, 16px type and 1.5 line-height on the navy header. All six direct unlocked routes measured **10.82:1** at 390px and asserted their exact current copy plus `data-veteran="true"`. `VETERAN_RULES` now names Ossuary Bell/Consonance/Cadenza; three-office sieges/tower actives/Gilded Warden; Meridian heart/doors/relays/coordinated Watchers; Nocturne Machina/inner-ring/three-phase Heart; Black Office/Link Lattice/Star Cast/route vows; and Nocturne/canticles/rifts/logical seals. Standard mode and unlock behavior are unchanged. Cache keys are `gothic.css?v=3` and `voyage.js?v=39`; `trials-premium.js` was not touched.

### Remaining presentation gaps / ownership

- **Gameplay teams:** fixed-resolution canvas HUD lettering in Skirmish and Bastion becomes very small when a roughly 900px canvas is scaled into a 390px viewport. The shell now removes global canvas colour filters and supplies a readable DOM frame, but it cannot enlarge text painted inside an engine. Add a responsive HUD scale or equivalent DOM readout in the engine-owned slice. The gallery proves the canvas fits; it does not certify every internal HUD label as 14px.
- **Cross-browser coverage:** this pass used headless Chromium, not Firefox, WebKit, a physical phone or external players. Those remain separate verification tasks.
- **Audit limits:** the contrast runner checks selected real text against opaque CSS surfaces and explicitly checks the brass primary-button face. It is not a substitute for a full accessibility audit, canvas-pixel analysis or playtesting.
