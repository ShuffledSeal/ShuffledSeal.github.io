# Æther · A private observatory

A handcrafted, responsive celestial playground inspired by Victorian astronomical plates and Romantic oil paintings — with a slightly mischievous streak. Built with HTML, CSS, and vanilla JavaScript. No dependencies or build step.

## Run

```sh
cd /home/abdoodly/Projects/aether-observatory
python3 -m http.server 4173 --bind 127.0.0.1
```

Open **http://localhost:4173**. The app can also be deployed to any static web host.

## Explore

- A painted-sky frontispiece with an engraved brass dial, floating companions, subtle pointer parallax, a pokable sun, and your creations on display. Motion respects your device preferences.
- Interactive eight-planet orrery with playback, a time slider, and constellation charts.
- Planet details and a locally saved collection.
- Navigable celestial calendar with downloadable event reminders.
- Create, edit, delete, and export locally saved journal entries.
- Search planets, constellations, events, and pages with `/` or `Ctrl/Cmd + K`.
- Optional synthesized ambient audio, observer preferences, and reduced-motion support.

## The cosmic arcade

Four hand-rolled canvas games with saved expedition records, a shared daily seed, pause, optional sound, theatre view, charge-up abilities, and a small roguelite layer. During a run you earn up to four picks from twenty-four mechanical relics; picks visibly change play, and paired relics unlock named synergies. Discoveries stay in a permanent field guide while powers begin fresh each run.

- **Planet Drop** — a floatier Suika-style merge game with squash-and-stretch physics, chain-reaction combos, guided throws, shockwaves, merge attraction, and an earned nudge for awkward stacks.
- **Comet Surf** — hold to swing around a planet, release to slingshot through gold rings. Longer tethers, charged launches, moving rings, shields, and flight relics change each route.
- **Stardust Dash** — seventy-five seconds of meteor-shower surfing: catch stars, dodge pink rocks, build shields, catch jellyfish, dash through danger when charged, and grab drifting power-ups like the Lodestone Bloom and Clock Moth before they pass.
- **Orbit Breaker** — cosmic pinball: steer a paddle around a circular arena and shatter every crystal in the constellation. Twin comets, shatter chains, wider paddles, and return wards can turn a run wonderfully chaotic.

## The wonder rooms

Six interactive experiments that share a persistent discovery passport:

- **The telescope** — pan a drifting illustrated sky, focus, compose real photographs, and trace constellations in the pocket star atlas.
- **The celestial darkroom** — lower your capture into the developer bath, then master three measurable development recipes without losing your own finish.
- **The world workshop** — paint continents, craters and storms, fulfil playful world commissions, and summon an undoable comet impact.
- **The orrery orchestra** — a four-voice sequencer with beat-reactive planets, a call-and-answer improviser, and reversible score variations; play it live or download a WAV recording.
- **The cabinet of lost nights** — blink-comparator detective work across four real discoveries, plus a fast three-sky blink desk for practice.
- **Letters made of light** — solve four increasingly elaborate mirror routes, preserve your drafted message, and watch it travel to another world.

Follow **The missing astronomer** mystery through the rooms — four fragments of a word hide along the way — then arrange everything you earned in the **discovery cabinet**, a rearrangeable keepsake shelf with stamps, themes, an expedition archive, and a rank that grows with your stardust.

Everything is dependency-free vanilla HTML/CSS/JS; games run on hand-rolled fixed-timestep canvas physics with seeded daily courses.

This is an imaginative, offline-first observatory. The orbital model is illustrative, not an ephemeris; celestial event dates are a curated 2026 almanac. Moon illumination is an approximation based on the synodic lunar cycle. All personal data is stored in this browser's local storage. Fonts and artwork are served locally.

## Credits

- Background painting: **Thomas Cole, _The Voyage of Life: Old Age_ (1842)**, National Gallery of Art. Public domain. [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Thomas_Cole_-_The_Voyage_of_Life_Old_Age,_1842_(National_Gallery_of_Art).jpg).
- Typography: **Cormorant Garamond** by Christian Thalmann and **DM Sans** by Colophon Foundry, licensed under the SIL Open Font License. Font licenses are in `assets/`.
- Celestial plates, planet textures, and interface illustrations are custom SVG/Canvas artwork.
