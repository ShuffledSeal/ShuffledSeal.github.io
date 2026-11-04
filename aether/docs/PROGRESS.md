# Æther Progress

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
- Preserved finite authored Grand Tour loops.
- Added direct-route browser checks for endless mode activation.

## Current Risk

- Save compatibility has not been fixture-tested. Do not alter storage keys or active-run data without migration coverage.
