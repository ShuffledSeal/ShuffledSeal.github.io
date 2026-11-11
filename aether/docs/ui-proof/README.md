# Ætherium UI proof

These PNGs are **real Chromium captures of the playable static site**, not mockups or generated concept art. They show the finished Victorian/Gothic visual direction at 1440×1000 and 390×844.

- `grand-tour-desktop.png` / `grand-tour-mobile.png` — public title screen with the framed 1748 astronomical lecture engraving.
- `observatory-desktop.png` / `observatory-mobile.png` — Observatory frontispiece, antique orrery plate, parchment ledger and mahogany instrument navigation.
- `cartridge-cabinet-desktop.png` / `cartridge-cabinet-mobile.png` — six flagship cartridges with individual engraved sigils; the four relic games remain in Cosmic Arcade.
- `planetary-puzzle-desktop.png` — the Earth atlas and puzzle room.
- `cosmic-arcade-desktop.png` — the four-game arcade and its instrument panels.
- `research-cabinet-desktop.png` — the ordered research shelf, marginalia and guided-study tools.
- `daily-chart-desktop.png` — a live solution-backed Daily Chart.
- `route-book-desktop.png` — a real mid-transition two-page book opening and page turn.
- `bastion-loadout.png` — the illustrated tower construction bar with readable costs and effects.
- `deepfield-relics.png` — the illustrated relic intermission with larger instructional text.

Regenerate from the repository root:

```sh
python3 tests/ui-gallery.py
# or
npm run test:ui
```

The capture script starts an isolated local server and fails if the historical engravings do not load, atlas portraits collapse, the six sigils or four illustrated hulls are missing, desktop profile controls are clipped, a page overflows horizontally, or Chromium reports an uncaught exception. It does not clear or replace player saves.
