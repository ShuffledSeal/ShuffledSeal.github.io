# Expanded Arcade & Orchestra (November 2026)

This is an in-place enhancement of Æther Observatory. It preserves the existing static-site architecture and previously saved records. No packages, API keys, or build tool are required.

## Orrery Orchestra

- Eight synthesised and individually playable sounds: glass bells, warm keys, wood marimba, copper pluck, velvet strings, deep bass, aurora choir, and tidal percussion.
- Sixteen-step editor with eight tracks, per-track volume and mute, three harmonic moods, tempo, swing, and space/echo. Three ready-made arrangements.
- The live instrument, planet sound pads and stereo WAV download use the same synthesis engine.
- Click the pads or press **1–8**. Answer four-note calls and try variations on your score.
- Three permanent composition seals for increasingly ambitious arrangements. Old four-track/eight-step saves are automatically upgraded on read; later empty tracks are kept empty.

## Cosmic Arcade

- Three new persistent, gameplay-driven challenges per game, for twelve collectible fieldwork seals overall. Current-run progress is shown below the play area.
- Optional **Stellar Pact**. Progress in a live game to enable it, then press **C** or the Pact button. For twelve seconds, score is doubled, but taking a hit breaks the pact and bypasses shields. Survive the wager for an extra 150 points. Only one pact per run.
- Fieldwork, previous relic mechanics, seeded courses, pause/resume, and scores continue to work together.

## Shared progression

Earn the first fieldwork seal in all four arcade games and the first musical composition seal to unlock the **Observatory Chorus**. Completing all twelve arcade seals grants another cabinet stamp. New stamps appear in the discovery cabinet.

## Run and test

Extract this folder and run `python3 -m http.server 4173` from inside it, then visit `http://localhost:4173`. Use a recent Chrome, Firefox, Safari, or Chromium build. Sound must be initiated by a user interaction due to browser audio policies. The WAV exporter requires the Web Audio OfflineAudioContext API.

All progress is stored locally in your browser. The archive does not contain or transmit personal data.
