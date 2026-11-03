'use strict';

window.AetherArcade = (() => {
  const { orb, star, colours, random: seeded } = window.AetherArt;
  const names = ['Moon', 'Mercury', 'Venus', 'Mars', 'Earth', 'Neptune', 'Saturn', 'Uranus', 'Jupiter', 'Sun', 'Supernova'];
  const radii = [18, 24, 31, 40, 50, 61, 73, 86, 100, 114, 130];
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const dimensions = game => game === 'merge' ? [480, 600] : [900, 560];

  const relics = {
    merge: [
      { id: 'echo-hourglass', name: 'Echo Hourglass', description: 'Keep merge chains alive for 2.4 seconds. Plan the next collision.', glyph: '⌛', tag: 'CHAIN' },
      { id: 'quake-core', name: 'Quake Core', description: 'Every merge sends a lifting shockwave through nearby planets.', glyph: '◎', tag: 'SHOCKWAVE' },
      { id: 'binary-heart', name: 'Binary Heart', description: 'Matching planets gently attract across a 65-pixel gap.', glyph: '∞', tag: 'ATTRACTION' },
      { id: 'guiding-thread', name: 'Guiding Thread', description: 'Aim steers your newest planet during its first 1.1 seconds.', glyph: '↘', tag: 'CONTROL' },
      { id: 'pulse-dynamo', name: 'Pulse Dynamo', description: 'Merges grant 26 pulse energy. Pulses lift harder and clear half the overflow danger.', glyph: 'ϟ', tag: 'ENERGY' },
      { id: 'deep-cradle', name: 'Deep Cradle', description: 'Overflow grace grows to 5.2 seconds and drains faster when the rim clears.', glyph: '∪', tag: 'SURVIVAL' },
    ],
    hop: [
      { id: 'ring-compass', name: 'Ring Compass', description: 'Pull collectible rings toward your ship from 150 pixels away.', glyph: '◎', tag: 'ATTRACTION' },
      { id: 'solar-spool', name: 'Solar Spool', description: 'Hold an orbit to charge a faster, briefly protected slingshot.', glyph: '☀', tag: 'CHARGE' },
      { id: 'longwave-tether', name: 'Longwave Tether', description: 'Catch a planet from 80 pixels farther away.', glyph: '⌁', tag: 'REACH' },
      { id: 'moon-sail', name: 'Moon Sail', description: 'A stabilising sail softens vertical drift and cuts free-flight gravity by two thirds.', glyph: '◈', tag: 'FLIGHT' },
      { id: 'comet-aegis', name: 'Comet Aegis', description: 'Start with a shield. Collect three rings to rebuild a spent shield.', glyph: '◇', tag: 'SHIELD' },
      { id: 'ring-reactor', name: 'Ring Reactor', description: 'Rings boost forward speed; every fourth ring restores a life.', glyph: 'ϟ', tag: 'REACTOR' },
    ],
    dash: [
      { id: 'lodestone', name: 'Lodestone', description: 'A permanent 180-pixel field pulls nearby stars into your basket.', glyph: '◎', tag: 'MAGNET' },
      { id: 'star-aegis', name: 'Star Aegis', description: 'Start with a shield. Every five caught stars forge another, up to two.', glyph: '◇', tag: 'SHIELD' },
      { id: 'wide-halo', name: 'Wide Halo', description: 'Your basket becomes 40 percent wider. Mind the meteors too.', glyph: '∪', tag: 'REACH' },
      { id: 'afterimage', name: 'Afterimage', description: 'Dashing leaves a star-catching echo behind for 1.8 seconds.', glyph: '✧', tag: 'ECHO' },
      { id: 'ion-cell', name: 'Ion Cell', description: 'Recharge dashes faster from time and catches, and dash 40 percent longer.', glyph: 'ϟ', tag: 'ENERGY' },
      { id: 'second-hand', name: 'Second Hand', description: 'Every six catches add 1.8 seconds to the meteor shower.', glyph: '⌛', tag: 'TIME' },
    ],
    breaker: [
      { id: 'twin-comet', name: 'Twin Comet', description: 'Gain a second comet now. Every six crystal hits split another, up to three.', glyph: '✦', tag: 'MULTIBALL' },
      { id: 'shatterglass', name: 'Shatterglass', description: 'Crystal impacts also shatter one nearby crystal within 62 pixels.', glyph: '✧', tag: 'SHATTER' },
      { id: 'crescent-crown', name: 'Crescent Crown', description: 'Widen the paddle arc by almost half.', glyph: '☾', tag: 'REACH' },
      { id: 'dense-core', name: 'Dense Core', description: 'Larger, visibly heavier comets break armoured crystals in one hit.', glyph: '●', tag: 'IMPACT' },
      { id: 'chrono-coil', name: 'Chrono Coil', description: 'Hits grant more energy. Slow Orbit lasts seven seconds and turns comets inward.', glyph: '⌛', tag: 'TIME' },
      { id: 'return-sigil', name: 'Return Sigil', description: 'A visible ward rescues one missed comet. Six paddle returns restore it.', glyph: '↶', tag: 'WARD' },
    ],
  };
  const synergies = {
    merge: [
      { ids: ['echo-hourglass', 'quake-core'], name: 'Aftershock Choir', description: 'Chained shockwaves reach farther, pull matching planets inward, and extend the chain by 0.6 seconds.' },
      { ids: ['binary-heart', 'guiding-thread'], name: 'Binary Landing', description: 'Your guided drop locks toward a nearby matching planet with a stronger, longer-range attraction.' },
    ],
    hop: [
      { ids: ['ring-compass', 'solar-spool'], name: 'Golden Slingshot', description: 'A charged release expands ring attraction to 340 pixels. Rings extend the golden flight.' },
      { ids: ['comet-aegis', 'ring-reactor'], name: 'Aurora Engine', description: 'Two rings rebuild your shield. Blocking a collision gives a protected forward boost.' },
    ],
    dash: [
      { ids: ['lodestone', 'star-aegis'], name: 'Magnetic Halo', description: 'Attracted stars count twice toward shields. A blocked meteor supercharges attraction for three seconds.' },
      { ids: ['afterimage', 'ion-cell'], name: 'Twin Drive', description: 'Dashes leave a second echo at their destination. Echo catches return 18 extra energy.' },
    ],
    breaker: [
      { ids: ['twin-comet', 'shatterglass'], name: 'Prism Storm', description: 'Secondary comets shatter two neighbouring crystals across a 105-pixel radius.' },
      { ids: ['crescent-crown', 'chrono-coil'], name: 'Event Horizon', description: 'Slow Orbit creates a second, fully functional paddle on the opposite side of the arena.' },
    ],
  };
  const powerUps = {
    // Temporary in-run pickups: caught like stars, active on collect, gone on
    // expiry. Distinct from relics, which are drafted and last the whole run.
    dash: [
      { id: 'lodestone-bloom', name: 'Lodestone Bloom', glyph: '◎', colour: '#bba7ed', duration: 8, incoming: 'LODESTONE BLOOM INCOMING', expiry: 'THE BLOOM CLOSES', description: 'Stars lean into your boat for 8 seconds.' },
      { id: 'clock-moth', name: 'Clock Moth', glyph: '⌛', colour: '#9ed7c6', duration: 6, incoming: 'CLOCK MOTH INCOMING', expiry: 'THE MOTH FLIES ON', description: 'Everything falls 45 percent slower for 6 seconds.' },
    ],
  };
  for (const catalog of [relics, synergies, powerUps]) {
    for (const entries of Object.values(catalog)) { entries.forEach(entry => { if (entry.ids) Object.freeze(entry.ids); Object.freeze(entry); }); Object.freeze(entries); }
    Object.freeze(catalog);
  }
  const milestones = { merge: [4, 12, 24, 40], hop: [180, 450, 900, 1500], dash: [5, 15, 28, 45], breaker: [5, 14, 28, 48] };
  // Drafts are events, not a checklist: at least this long between offers,
  // no matter how hot the run gets.
  const MIN_DRAFT_GAP = 18;
  const progressLabels = { merge: 'merges', hop: 'metres travelled', dash: 'stars caught', breaker: 'crystal hits' };

  function create(canvas, options) {
    const ctx = canvas.getContext('2d'), [W, H] = dimensions(options.game);
    const abort = new AbortController(), keys = new Set();
    const listen = (el, type, fn) => el.addEventListener(type, fn, { signal: abort.signal });
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motionQuery.matches;
    listen(motionQuery, 'change', e => { reduced = e.matches; });
    const bgRandom = seeded(731);
    // Three depth layers give every sky parallax. Session-stable, and separate
    // from the daily course stream — presentation never touches `random`.
    const starLayers = [
      Array.from({ length: 55 }, () => ({ x: bgRandom() * W, y: bgRandom() * H, r: .3 + bgRandom() * .8, p: bgRandom() * TAU, sp: .5 + bgRandom() })),
      Array.from({ length: 32 }, () => ({ x: bgRandom() * W, y: bgRandom() * H, r: .8 + bgRandom() * 1.0, p: bgRandom() * TAU, sp: .8 + bgRandom() })),
      Array.from({ length: 13 }, () => ({ x: bgRandom() * W, y: bgRandom() * H, r: 1.6 + bgRandom() * 1.1, p: bgRandom() * TAU, sp: 1.2 + bgRandom() })),
    ];
    let random, fxRandom, phase, score, time, visualTime = 0, last = 0, accumulator = 0, frame, destroyed = false;
    let particles = [], ripples = [], popups = [], shake = 0, flash = 0, finishDelay = 0, finishTotal = 0, finishWon = false, result = '', best = options.best || 0;
    // The event-light bus: scenes answer input. glow warms the backdrop, kick
    // spikes it, flashTint colours the screen flash per event.
    let glow = 0, kick = 0, flashTint = '245,142,155';
    let sound = false, audio, audioGain, lastTone = -1;
    let pointerId = null, pointerHeld = false, aim = W / 2, pointerAim = null, lastDirection = 1;
    let charge, combo, comboTimer, lives, invulnerable, level, totalMerges;
    let balls, queue, cooldown, danger, largest, drops;
    let ship, worlds, rings, rocks, camera, nextWorld, tether, distanceScore;
    let catcher, falling, spawn, remaining, wave, dashTime, magnet;
    let paddle, comets, bricks, launchTimer, slowTime;
    let dropArmed = false, hueCache;
    let notifyTimer = 0, releases = 0;
    // Feel channels: hit-stop/slow-mo timescale and a camera micro-zoom.
    let timeScale = 1, timeKick = 0, zoom = 1;
    // Ceremony state: draft telegraph, per-game finales and named moments.
    let draftWarn = 0, stirred = -1, draftTimes = [], pileT = 0, peakBand = 0, lastThump = 0;
    let surgeUntil = 0, lastTen = false, dashAct = 1, lastTickSec = -1, lastActTick = -1;
    let oneCrystal = false, lastBeacon = 0, ghosts = [], sprayT = 0, chargeStep = 0;
    let music = null;
    let suspended = false, owned = [], offer = null, draftDecks = [], draftIndex = 0, lastDraftTime = 0, draftFallbacks = 0;
    let aimVelocity = 0, aimStamp = 0, guidedBall = null, fields = [], echoes = [];
    let pickupSchedule = [], activePower = null, slow = 0;
    let maxMetres = 0, totalCatches = 0, crystalHits = 0, ringsCaught = 0, shields = 0, shieldCharge = 0;
    let orbitCharge = 0, flightBoost = 0, reactorRings = 0, clockCatches = 0, splitHits = 0, ward = 0, wardReturns = 0, tetherAwaitingPress = false;
    const has = id => owned.some(r => r.id === id);
    const activeSynergies = () => synergies[options.game].filter(s => s.ids.every(has)).map(({ name, description }) => ({ name, description }));
    const dangerLimit = () => has('deep-cradle') ? 5.2 : 3.4;
    const basketWidth = () => has('wide-halo') ? 55 : 39;
    const cometRadius = () => has('dense-core') ? 11 : 8;
    const paddleHalf = () => (slowTime > 0 ? .8 : .55) + (has('crescent-crown') ? .22 : 0);
    const tetherReach = () => (options.relaxed ? 270 : 235) + (has('longwave-tether') ? 80 : 0);
    const ringReach = () => has('ring-compass') ? (has('solar-spool') && flightBoost > 0 ? 340 : 150) : 0;
    const magnetReach = () => magnet > 0 ? (has('lodestone') ? 300 : 260) : has('lodestone') ? 180 : 0;
    const progressValue = () => options.game === 'merge' ? totalMerges : options.game === 'hop' ? Math.floor(maxMetres) : options.game === 'dash' ? totalCatches : crystalHits;
    const stats = () => ({ simulationTime: time, totalMerges, totalCatches, crystalHits, ringsCaught, maxMetres: Math.floor(maxMetres), comets: comets.length, shields, shieldCharge, orbitCharge, ward, draftFallbacks, draftTimes: draftTimes.slice() });

    function notify() {
      const detail = options.game === 'merge' ? `${names[largest]} · ${drops} drops` : options.game === 'hop' ? `${Math.floor(ship.x / 10)} m · sector ${level}` : options.game === 'dash' ? `${Math.ceil(remaining)}s · ×${Math.max(1, Math.min(8, 1 + Math.floor(combo / 5)))}` : `Wave ${level} · ${bricks.filter(b => b.hp > 0).length} crystals`;
      canvas.dataset.phase = phase; canvas.dataset.score = score; canvas.dataset.count = balls?.length || 0;
      canvas.dataset.largest = largest; canvas.dataset.lives = lives; canvas.dataset.level = level;
      canvas.dataset.suspended = String(suspended);
      const incomingPickup = options.game === 'dash' ? falling.find(g => g.kind === 'pickup' && !g.taken) : null;
      const incomingDef = incomingPickup && powerUps.dash.find(p => p.id === incomingPickup.pickupId);
      options.onUpdate?.({ phase, suspended, score, best, next: names[queue?.[0] || 0], queue: queue.slice(), largest: names[largest], lives, combo, remaining: Math.ceil(remaining), danger: clamp(danger / dangerLimit(), 0, 1), drops, charge: Math.floor(charge), detail, result,
        relics: owned.slice(), offer: offer ? offer.slice() : null, synergies: activeSynergies(), stats: stats(),
        relicProgress: draftIndex < 4 ? { value: progressValue(), target: milestones[options.game][draftIndex], label: progressLabels[options.game] } : { value: owned.length, target: 4, label: 'relics collected' },
        pickup: activePower ? { id: activePower.id, name: activePower.name, glyph: activePower.glyph, remaining: activePower.remaining, total: activePower.duration } : null,
        incoming: incomingDef ? { id: incomingDef.id, name: incomingDef.name, x: Math.round(incomingPickup.x) } : null,
      });
    }
    function relicField(x, y, radius, colour = '#bba7ed', life = .6) { fields.push({ x, y, radius, colour, life, max: life }); }
    function openOffer() {
      // The wind-up has played; now the run actually suspends for the choice.
      draftWarn = 0;
      if (phase !== 'running' || suspended || draftIndex >= 4) return;
      const candidates = draftDecks[draftIndex].filter(r => !has(r.id));
      for (const relic of relics[options.game]) if (!has(relic.id) && !candidates.includes(relic)) candidates.push(relic);
      offer = candidates.slice(0, 3);
      if (!offer.length) { draftIndex++; lastDraftTime = time; return; }
      suspended = true; accumulator = 0; clearInput(); notify();
      // onUpdate is authoritative; an optional legacy listener runs afterwards.
      if (suspended) options.onOffer?.(offer.slice());
    }
    function checkOffer() {
      if (phase !== 'running' || suspended || draftIndex >= 4 || draftWarn > 0) return;
      // Only simulation time counts. A quiet first run still gets a relic at 12s;
      // later droughts get one after 24s. Drafts never interrupt collision loops.
      // Comet Surf: the first draft is earned by an actual slingshot release.
      // A ship drifting on its launch velocity never earns a free discovery.
      if (options.game === 'hop' && draftIndex === 0 && !releases) return;
      const reached = progressValue() >= milestones[options.game][draftIndex];
      // Foreshadow at 80% of the milestone: the run hints that a discovery nears.
      if (!reached && stirred !== draftIndex && progressValue() >= milestones[options.game][draftIndex] * .8) {
        stirred = draftIndex;
        popups.push({ x: W / 2, y: H * .3, text: 'THE ÆTHER STIRS…', colour: '#cbb287', life: 1.4, size: 13 });
        relicField(W / 2, H / 2, 150, '#cbb287', .8);
        tone(392, .3, 'sine', .035);
      }
      // A hot streak cannot summon relics back to back — but the first
      // discovery still comes early enough to hook a reckless player.
      if (draftIndex > 0 && time - lastDraftTime < MIN_DRAFT_GAP) return;
      const fallbackAfter = draftIndex === 0 ? (options.game === 'dash' ? 8 : 12) : 24;
      if (!reached && time - lastDraftTime < fallbackAfter) return;
      if (!reached) draftFallbacks++;
      // The telegraph: a golden beat of slow-motion before the draft appears.
      draftWarn = reduced ? .25 : .8;
      punch(.45, .6);
      popups.push({ x: W / 2, y: H * .3, text: 'SOMETHING EXTRAORDINARY APPROACHES', colour: '#edf19b', life: 1.1, size: 16 });
      tone(520, .12); tone(780, .18, 'sine', .07);
    }
    function resolveOffer(id, skip = false) {
      if (destroyed || !suspended || !offer) return false;
      const chosen = offer.find(r => r.id === id);
      if (!skip && (!chosen || has(id))) return false;
      if (chosen && !skip) {
        const before = activeSynergies().map(pair => pair.name);
        owned.push(chosen);
        if (id === 'comet-aegis' || id === 'star-aegis') shields++;
        if (id === 'return-sigil') ward = 1;
        if (id === 'twin-comet') splitComet(comets[0]);
        if (id === 'deep-cradle') relicField(W / 2, H - 28, 180, '#9ed7c6');
        popups.push({ x: W / 2, y: H * .38, text: chosen.name.toUpperCase(), colour: '#edf19b', life: 1.8 });
        const discovered = activeSynergies().filter(pair => !before.includes(pair.name));
        discovered.forEach((pair, i) => {
          popups.push({ x: W / 2, y: H * .38 + 32 + i * 25, text: `SYNERGY · ${pair.name.toUpperCase()}`, colour: '#a8d4c3', life: 2.3 });
          relicField(W / 2, H / 2, 180 + i * 25, '#a8d4c3', .8);
        });
        if (discovered.length) motif([[880, 0, .16], [1174.66, .08, .16], [1760, .16, .35]], .05);
        motif([[261.63, 0, .12, 'triangle', .055], [329.63, .08, .12, 'triangle', .05], [392, .16, .3, 'triangle', .05]]);
      } else if (skip) note(392, 0, .15, 'sine', .04);
      draftIndex++; lastDraftTime = time; offer = null; suspended = false;
      // Re-entry grace: the world holds still a breath after a build choice.
      invulnerable = Math.max(invulnerable, 1.2);
      if (options.game === 'dash') spawn = Math.max(spawn, .8);
      if (options.game === 'breaker') launchTimer = Math.max(launchTimer, .6);
      if (chosen && !skip) draftTimes.push(time);
      accumulator = 0; last = 0; clearInput(); notify();
      // The paused phase deliberately survives a pick made in a blurred window.
      return true;
    }
    function tone(frequency = 440, length = .12, type = 'sine', volume = .09) {
      if (!sound || destroyed) return;
      try {
        ensureAudio();
        if (audio.currentTime - lastTone < .025) return;
        lastTone = audio.currentTime;
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * .7), audio.currentTime + length);
        gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + length);
        oscillator.connect(gain).connect(audioGain); oscillator.start(); oscillator.stop(audio.currentTime + length);
      } catch { /* Sound stays enabled; a muted browser shouldn't unset the preference. */ }
    }
    function ensureAudio() {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      if (!audioGain) { audioGain = audio.createGain(); audioGain.gain.value = .7; audioGain.connect(audio.destination); }
    }
    // Scheduled notes escape the 25ms guard, so chords and motifs survive.
    function note(frequency, delay = 0, length = .15, type = 'sine', volume = .05, attack = .012, glide = 1) {
      if (!sound || destroyed) return;
      try {
        ensureAudio();
        const t = Math.max(audio.currentTime + .01, audio.currentTime + .01 + delay);
        const oscillator = audio.createOscillator(), gainNode = audio.createGain();
        oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t);
        if (glide !== 1) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * glide), t + length);
        gainNode.gain.setValueAtTime(0, t); gainNode.gain.linearRampToValueAtTime(volume, t + attack);
        gainNode.gain.exponentialRampToValueAtTime(.0001, t + length);
        oscillator.connect(gainNode).connect(audioGain); oscillator.start(t); oscillator.stop(t + length + .05);
      } catch { }
    }
    function motif(notes, volume) {
      // [[hz, dt, len, type?, vol?]…]; reduced motion hears a shorter figure.
      for (const [f, dt, len, type = 'sine', vol = volume ?? .05] of (reduced ? notes.slice(0, 2) : notes)) note(f, dt + .03, len, type, vol);
    }
    // Hit-stop / slow-mo: starve the fixed-step accumulator for a beat.
    function punch(scale, seconds) {
      if (reduced) { scale = Math.max(scale, .6); seconds = Math.min(seconds, .05); }
      if (scale <= timeScale || timeKick <= 0) { timeScale = scale; timeKick = Math.max(timeKick, seconds); }
    }
    // Events light the scene: a coloured flash + a warm backdrop bloom.
    function light(rgb, flashAmt = .06, glowAmt = .25) {
      flashTint = rgb; flash = Math.max(flash, reduced ? .04 : flashAmt); glow = Math.min(1, glow + glowAmt);
    }
    function banner(textValue, colour = '#edf19b', size = 22) {
      popups.push({ x: W / 2, y: H * .3, text: textValue, colour, life: 1.7, size });
    }
    // hex '#rrggbb' → 'r,g,b' for the event-light bus. Lookup, never parsing.
    const rgbOf = (() => { const table = {}; for (const hex of colours) table[hex] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(','); return hex => table[hex] || '237,241,155'; })();

    // ── The Orrery: a tiny adaptive sequencer per game ─────────────────────
    // Pad chords walk every 2 bars; bass enters with heat; arps arrive when
    // the run is truly cooking; danger ticks and the last-heart heartbeat sit
    // off-grid. Driven by the rAF tick — no timers, and pause/draft resyncs
    // instead of burst-firing catch-up notes.
    const MUSIC = {
      merge:   { bpm: 63,  pad: [[110, 261.63, 329.63], [130.81, 329.63, 392], [98, 293.66, 440], [146.83, 220, 261.63]], bass: [55, 65.41, 49, 73.42], arp: [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 659.26] },
      hop:     { bpm: 84,  pad: [[87.31, 220, 261.63], [130.81, 329.63, 392], [98, 293.66, 440], [146.83, 220, 349.23]], bass: [87.31, 65.41, 49, 73.42], arp: [261.63, 293.66, 349.23, 392, 440, 523.25, 587.33, 698.46] },
      dash:    { bpm: 122, pad: [[130.81, 329.63, 392], [110, 261.63, 329.63], [87.31, 220, 349.23], [98, 293.66, 440]], bass: [65.41, 55, 87.31, 49], arp: [329.63, 392, 440, 523.25, 587.33, 659.26, 783.99, 880] },
      breaker: { bpm: 96,  pad: [[82.41, 164.81, 246.94], [98, 246.94, 293.66], [110, 220, 277.18], [146.83, 293.66, 369.99]], bass: [82.41, 98, 110, 146.83], arp: [329.63, 369.99, 392, 493.88, 554.37, 587.33, 659.26, 783.99] },
    };
    function heat() {
      if (options.game === 'merge') return clamp(danger / dangerLimit() + Math.min(combo, 5) * .12, 0, 1);
      if (options.game === 'hop') return clamp((level - 1) * .25 + (tether ? .15 : 0) + (flightBoost > 0 ? .3 : 0), 0, 1);
      if (options.game === 'dash') return clamp(time / 75 * .5 + Math.min(8, 1 + Math.floor(combo / 5)) / 16, 0, 1);
      return clamp((level - 1) * .2 + Math.min(combo, 8) * .06 + (3 - lives) * .15, 0, 1);
    }
    function musicStep() {
      if (!sound || destroyed || document.hidden) return;
      if (phase !== 'running' || suspended) { if (music) music.next = 0; return; }
      try {
        ensureAudio();
        if (!music || music.next < audio.currentTime - .25) music = { step: 0, next: audio.currentTime + .08, heart: 0 };
        const m = MUSIC[options.game], eighth = 60 / m.bpm / 2;
        while (music.next < audio.currentTime + .18) {
          const s = music.step % 8, bar = Math.floor(music.step / 8) % 4, h = heat();
          if (music.step % 16 === 0) m.pad[bar].forEach((f, i) => note(f, music.next - audio.currentTime, eighth * 16, 'sine', .016 / (i + .6), eighth * 4));
          if (h > .22 && (s === 0 || s === 4)) note(m.bass[bar], music.next - audio.currentTime, .24, 'triangle', .05);
          if (h > .5 && !reduced) note(m.arp[(music.step * 5 + bar) % 8], music.next - audio.currentTime, .17, 'sine', .026);
          if ((options.game === 'merge' && danger / dangerLimit() > .55 || options.game === 'dash' && remaining < 12) && s % 2 === 1)
            note(1244.5, music.next - audio.currentTime, .035, 'square', .011);
          music.next += eighth; music.step++;
        }
        if (lives === 1 && audio.currentTime + .3 > music.heart) {
          note(55, music.heart - audio.currentTime, .1, 'sine', .075);
          if (!reduced) note(55, music.heart - audio.currentTime + .17, .08, 'sine', .04);
          music.heart += 1.15;
        }
      } catch { }
    }
    function burst(x, y, colour, count = 20, force = 160) {
      // Presentation has its own RNG. Extra particles never change a daily course.
      for (let i = 0; i < (reduced ? 4 : count); i++) {
        const a = fxRandom() * TAU, speed = 25 + fxRandom() * force;
        particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .4 + fxRandom() * .6, max: 1, size: 2 + fxRandom() * 4, colour, angle: fxRandom() * TAU });
      }
      if (particles.length > 280) particles.splice(0, particles.length - 280);
      ripples.push({ x, y, radius: 8, life: .6, colour });
    }
    function scoreAt(value, x, y, label) {
      score += value; best = Math.max(best, score);
      popups.push({ x, y, text: label || `+${value}`, life: 1.1, colour: '#f1f4ac' });
      if (popups.length > 14) popups.shift();
    }
    function clearInput() {
      const captured = pointerId;
      keys.clear(); pointerHeld = false; pointerId = null; pointerAim = null; dropArmed = false; aimVelocity = 0; aimStamp = 0;
      if (paddle) paddle.target = paddle.angle;
      if (tether) tetherAwaitingPress = true;
      if (captured !== null && canvas.hasPointerCapture?.(captured)) canvas.releasePointerCapture(captured);
    }
    function finish(message, seconds = 1.2, won = false) {
      if (phase !== 'running' || suspended) return;
      phase = 'ending'; result = message; finishDelay = seconds; finishTotal = seconds; finishWon = won; clearInput();
      // The run cadences: victory rises, defeat settles — never the same note.
      if (won) { motif([[523.25, 0, .13], [659.26, .11, .13], [783.99, .22, .13], [1046.5, .33, .4]], .06); if (score > (options.best || 0)) note(1567.98, .7, .5, 'sine', .026); }
      else { motif([[196, 0, .25, 'triangle', .06], [155.56, .22, .3, 'triangle', .05], [130.81, .44, .65, 'triangle', .045]]); if (score > (options.best || 0)) note(1567.98, .7, .5, 'sine', .026); }
      notify();
    }
    function hurt(x, y) {
      if (invulnerable > 0 || phase !== 'running' || suspended) return;
      if (shields > 0) {
        shields--; invulnerable = 1; relicField(x, y, 64, '#9ed7c6'); burst(x, y, '#9ed7c6', 20);
        punch(.3, .04); motif([[622, 0, .16, 'triangle', .05], [466.16, .02, .2, 'triangle', .04]]);
        if (options.game === 'dash' && has('lodestone') && has('star-aegis')) { magnet = Math.max(magnet, 3); relicField(x, y, 300); }
        if (options.game === 'hop' && has('ring-reactor') && has('comet-aegis')) { ship.vx = Math.max(ship.vx, 410); ship.vy = clamp(ship.vy, -90, 90); flightBoost = Math.max(flightBoost, 1.2); }
        return;
      }
      lives--; combo = 0; invulnerable = 1.6; shake = 12; flash = .15;
      // A lost heart stops the world for a beat; the last heart dreads slower.
      punch(0, .1); if (lives === 1 && !reduced) punch(.5, .25);
      burst(x, y, '#f58e9b', 28); tone(100, .23, 'sawtooth', .055);
      if (lives <= 0) finish(options.game === 'hop' ? 'A spectacular re-entry.' : 'The cosmos wins this round.', 1.3);
      notify();
    }
    function newWorld() {
      const x = nextWorld, y = 160 + random() * 240, r = 27 + random() * 15;
      worlds.push({ x, y, r, tier: Math.floor(random() * 9) });
      rings.push({ x: x + 190, y: clamp(y + (random() - .5) * 190, 80, H - 80), taken: false });
      if (x > 900) rocks.push({ x: x + 110, y: y < H / 2 ? H - 95 - random() * 70 : 80 + random() * 70, r: 20 + random() * 10, grazed: false });
      nextWorld += 370 + random() * 80;
    }
    function makeBricks() {
      // The old constellation leaves a two-second ghost behind the new one.
      if (bricks?.length && bricks.every(b => !b.hp)) ghosts = bricks.map(b => ({ x: b.x, y: b.y, r: b.r, tier: b.tier, at: visualTime }));
      bricks = [];
      // A daily board should be a daily board: the seed rotates the rings and picks armoured crystals.
      const rotation = random() * TAU;
      [62, 111, 157].forEach((radius, ring) => {
        // Wave one is sparse on purpose: the opening should need the paddle,
        // not cascade into free points while the player watches.
        const count = level === 1 ? 4 + ring * 3 : 6 + ring * 4;
        for (let i = 0; i < count; i++) {
          const a = i / count * TAU + ring * .27 + rotation;
          const armoured = level > 1 && random() < .34;
          bricks.push({ x: W / 2 + Math.cos(a) * radius, y: H / 2 + Math.sin(a) * radius, r: 15, hp: armoured ? 2 : 1, tier: (i + ring * 3 + level) % 8, hit: 0, angle: a });
        }
      });
      oneCrystal = false;
      launchTimer = 1.2;
    }
    function reset() {
      const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
      random = seeded(seed); fxRandom = seeded(seed ^ 0x71ca43);
      const draftRandom = seeded(seed ^ 0x5ea1c0de);
      draftDecks = Array.from({ length: 4 }, () => {
        const deck = relics[options.game].slice();
        for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(draftRandom() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        return deck;
      });
      // Pickup placements come from their own stream, consumed entirely here.
      // The course stream below then produces exactly the same daily weather
      // as a build without pickups.
      pickupSchedule = [];
      if (options.game === 'dash') {
        const pickupRandom = seeded(seed ^ 0x9c4d);
        let at = 8 + pickupRandom() * 4, previous = '';
        while (at < 67) { // The last 8 seconds of the forecast stay gift-free.
          let def = powerUps.dash[Math.floor(pickupRandom() * powerUps.dash.length)];
          if (def.id === previous) def = powerUps.dash.find(p => p.id !== previous);
          pickupSchedule.push({ time: at, id: def.id, x: 60 + pickupRandom() * (W - 120), fired: false });
          previous = def.id;
          at += 18 + pickupRandom() * 6;
        }
      }
      activePower = null; slow = 0;
      owned = []; offer = null; suspended = false; draftIndex = 0; lastDraftTime = 0; draftFallbacks = 0;
      maxMetres = 0; totalCatches = 0; crystalHits = 0; ringsCaught = 0; shields = 0; shieldCharge = 0;
      orbitCharge = 0; flightBoost = 0; reactorRings = 0; clockCatches = 0; splitHits = 0; ward = 0; wardReturns = 0; tetherAwaitingPress = false; releases = 0;
      fields = []; echoes = []; guidedBall = null; lastDirection = 1; finishDelay = 0; finishTotal = 0; finishWon = false; visualTime = 0;
      timeScale = 1; timeKick = 0; zoom = 1; glow = 0; kick = 0; flashTint = '245,142,155';
      draftWarn = 0; stirred = -1; draftTimes = []; pileT = 0; peakBand = 0; lastThump = 0;
      surgeUntil = 0; lastTen = false; dashAct = 1; lastTickSec = -1; lastActTick = -1;
      oneCrystal = false; lastBeacon = 0; ghosts = []; sprayT = 0; chargeStep = 0; music = null;
      phase = 'ready'; score = 0; time = 0; accumulator = 0; last = 0; result = ''; notifyTimer = 0;
      particles = []; ripples = []; popups = []; shake = 0; flash = 0; clearInput();
      charge = options.game === 'dash' ? 100 : 0; combo = 0; comboTimer = 0; lives = 3; invulnerable = 0; level = 1; totalMerges = 0;
      balls = []; queue = [0, Math.floor(random() * 4), Math.floor(random() * 4)]; cooldown = 0; danger = 0; largest = 0; drops = 0;
      camera = 0; nextWorld = 250; worlds = []; rings = []; rocks = []; tether = null; tetherAwaitingPress = false; distanceScore = 0;
      ship = { x: 80, y: 235, vx: 235, vy: -30, trail: [] };
      while (nextWorld < 1600) newWorld();
      // Two settled companions greet the first drop — the jar never starts empty.
      if (options.game === 'merge') {
        balls.push({ x: W / 2 - 58, y: H - 27 - radii[0], vx: 0, vy: 0, tier: 0, age: 5, angle: .2, squash: 0, born: 0 });
        balls.push({ x: W / 2 + 62, y: H - 27 - radii[1], vx: 0, vy: 0, tier: 1, age: 5, angle: -.3, squash: 0, born: 0 });
      }
      catcher = { x: W / 2, vx: 0, tilt: 0 }; falling = []; spawn = .8; remaining = 75; wave = 0; dashTime = 0; magnet = 0;
      paddle = { angle: Math.PI / 2, target: Math.PI / 2 }; comets = [{ x: W / 2, y: H / 2 + 210, vx: 0, vy: -290, trail: [], secondary: false }]; slowTime = 0;
      makeBricks(); aim = W / 2; pointerAim = null; notify(); draw();
    }
    function start() {
      if (destroyed || suspended || document.hidden) return;
      if (phase === 'over') reset();
      if (phase !== 'ready') return;
      phase = 'running'; last = 0; accumulator = 0;
      // The world eases up to speed instead of slamming to full velocity.
      punch(.25, .3); if (!reduced) zoom = 1.045;
      if (sound) motif([[523.25, 0, .08], [523.25, .32, .08], [783.99, .64, .2]], .045);
      notify(); canvas.focus({ preventScroll: true });
    }
    function pause() {
      if (phase !== 'running') return;
      phase = 'paused'; accumulator = 0; clearInput();
      motif([[440, 0, .12], [329.63, .1, .22]], .032);
      audio?.suspend();
      notify();
    }
    function resume() {
      if (phase !== 'paused' || document.hidden || destroyed) return;
      phase = 'running'; last = 0; accumulator = 0; clearInput();
      if (sound) { audio?.resume().catch(() => {}); motif([[329.63, 0, .1], [440, .08, .16]], .032); }
      notify(); canvas.focus({ preventScroll: true });
    }
    function ability() {
      if (phase !== 'running' || suspended || charge < 100 || options.game === 'hop') return;
      charge = 0;
      if (options.game === 'merge') {
        balls.forEach(b => { b.vx += aim < W / 2 ? -110 : 110; b.vy -= has('pulse-dynamo') ? 190 : 130; });
        if (has('pulse-dynamo')) { danger *= .5; relicField(W / 2, H - 40, 215, '#9ed7c6'); }
        burst(W / 2, H - 40, '#bba7ed', 30); shake = 6; light('187,167,237', .08, .4);
        motif([[329.63, 0, .22, 'sine', .06], [164.81, 0, .3, 'triangle', .05]]);
      } else if (options.game === 'dash') {
        if (has('afterimage')) { echoes.push({ x: catcher.x, life: 1.8 }); if (echoes.length > 3) echoes.shift(); }
        dashTime = has('ion-cell') ? .28 : .2; invulnerable = Math.max(invulnerable, .5); catcher.vx = lastDirection * 1250;
        burst(catcher.x, H - 72, '#9ed7c6', 22); light('158,215,198', .07, .35); kick = .6;
        punch(.35, .05); if (!reduced) zoom = Math.max(zoom, 1.04);
        fields.push({ x: catcher.x - lastDirection * 130, y: H - 72, toX: catcher.x, toY: H - 72, radius: 0, colour: '#9ed7c6', life: .3, max: .3 });
        note(660, 0, .18, 'sine', .055, .005, 1.5);
      } else {
        slowTime = has('chrono-coil') ? 7 : 5;
        if (has('chrono-coil')) for (const c of comets) {
          const a = Math.atan2(H / 2 - c.y, W / 2 - c.x), speed = Math.max(285, Math.hypot(c.vx, c.vy));
          c.vx = Math.cos(a) * speed; c.vy = Math.sin(a) * speed;
        }
        burst(W / 2, H / 2, '#a6d9ec', 45); relicField(W / 2, H / 2, 235, '#a6d9ec');
        punch(0, .06); if (!reduced) zoom = 1.05; light('166,217,236', .1, .6);
        note(880, 0, .5, 'sine', .04, .25, .5);
      }
      notify();
    }
    function action() {
      if (destroyed || suspended) return;
      if (phase === 'ready' || phase === 'over') { start(); return; }
      if (phase === 'paused') { resume(); return; }
      if (phase !== 'running') return;
      if (options.game === 'merge' && cooldown <= 0) {
        const tier = queue.shift(); queue.push(Math.floor(random() * 4));
        // Deliberate aiming supplies momentum; a stationary drop is predictable.
        guidedBall = { x: clamp(aim, radii[tier] + 24, W - radii[tier] - 24), y: 46, vx: clamp(aimVelocity * .28, -125, 125), vy: 30, tier, age: 0, angle: 0, squash: -.3, born: .2 };
        balls.push(guidedBall);
        burst(guidedBall.x, 52, colours[tier], 6, 90); light('223,172,127', .02, .08);
        drops++; cooldown = .32; tone(200 + tier * 60, .09, 'triangle'); notify();
      } else if (options.game === 'dash' || options.game === 'breaker') ability();
    }
    function mergeStep(dt) {
      const shocks = [];
      cooldown -= dt; comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
      const move = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
      aim = clamp(aim + move * 340 * dt, 24, W - 24);
      aimVelocity = move ? move * 340 : aimVelocity * Math.exp(-5 * dt);
      if (has('binary-heart')) for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        if (a.tier !== b.tier) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), sum = radii[a.tier] * 2;
        const guided = has('guiding-thread') && ((a === guidedBall && a.age < 1.1) || (b === guidedBall && b.age < 1.1));
        if (d > sum && d < sum + (guided ? 140 : 65)) {
          const force = (guided ? 220 : 80) * dt / d;
          a.vx += dx * force; a.vy += dy * force; b.vx -= dx * force; b.vy -= dy * force;
        }
      }
      if (has('guiding-thread') && guidedBall?.age < 1.1 && balls.includes(guidedBall)) guidedBall.vx += clamp((aim - guidedBall.x) * 3 - guidedBall.vx, -220, 220) * dt * 3;
      balls.forEach(b => { b.age += dt; b.born = Math.max(0, b.born - dt); b.squash *= Math.exp(-12 * dt); b.vy += (400 + Math.min(140, danger * 50)) * dt; b.vx *= Math.exp(-.38 * dt); b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.vx / radii[b.tier] * dt * .35; });
      for (let pass = 0; pass < 6; pass++) {
        balls.forEach(b => {
          const r = radii[b.tier];
          if (b.x < r + 22) { b.x = r + 22; b.vx = Math.abs(b.vx) * .42; }
          if (b.x > W - r - 22) { b.x = W - r - 22; b.vx = -Math.abs(b.vx) * .42; }
          if (b.y > H - 27 - r) { b.y = H - 27 - r; if (b.vy > 80) { b.squash = Math.min(.23, b.vy / 1700); tone(100 + b.tier * 25, .05, 'triangle', .03); if (b.vy > 300) burst(b.x, H - 24, '#8f86a3', 6, 90); } b.vy = -Math.abs(b.vy) * .3; b.vx *= .97; }
        });
        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const a = balls[i], b = balls[j], ra = radii[a.tier], rb = radii[b.tier];
            let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
            if (d >= ra + rb) continue;
            if (a.tier === b.tier) {
              const tier = a.tier + 1, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, wasLargest = largest;
              balls.splice(j, 1); balls.splice(i, 1);
              if (tier < names.length) balls.push({ x, y, vx: (a.vx + b.vx) * .35, vy: -55, tier, age: 0, angle: 0, squash: -.2, born: .32 });
              largest = Math.max(largest, Math.min(10, tier)); totalMerges++; combo++;
              comboTimer = has('echo-hourglass') ? 2.4 + (has('quake-core') && combo > 1 ? .6 : 0) : .85;
              charge = Math.min(100, charge + (has('pulse-dynamo') ? 26 : 16));
              if (has('quake-core')) shocks.push({ x, y, tier, chain: has('echo-hourglass') && combo > 1 });
              scoreAt(2 ** tier * Math.min(combo, 5), x, y - radii[Math.min(tier, 10)], combo > 1 ? `${combo}× CHAIN!` : `+${2 ** tier}`);
              burst(x, y, colours[Math.min(tier, 10)], 16 + tier * 3); shake = Math.max(shake, tier > 4 ? 5 : 2);
              // The merge is the core verb: hit-stop scales with the world made.
              punch(tier >= 5 ? 0 : tier >= 3 ? .12 : .3, Math.min(.04 + tier * .012 + Math.min(combo, 6) * .008, .13));
              if (tier >= 4 && !reduced) zoom = Math.max(zoom, 1 + Math.min(.05, .012 + tier * .004));
              if (combo >= 3) kick = .5;
              light(rgbOf(colours[Math.min(tier, 10)]), .05 + Math.min(.05, tier * .008), .3 + Math.min(.3, combo * .05));
              note(118 - Math.min(tier, 6) * 8, 0, .14, 'sine', .09);
              if (combo >= 2) motif([[261.63, 0, .12], [329.63, .06, .12], [392, .12, .14], [523.25, .18, .14], [659.26, .24, .16], [783.99, .3, .2]].slice(0, 1 + Math.min(combo, 4)));
              if (tier >= 4 && tier > wasLargest) motif([[523.25, 0, .12], [659.26, .09, .12], [783.99, .18, .12], [1046.5, .27, .35]], .05);
              tone(240 + tier * 70 + combo * 20, .18); i--; break;
            }
            if (d < .001) { dx = .01; dy = 1; d = 1; }
            const nx = dx / d, ny = dy / d, overlap = ra + rb - d, wa = rb * rb / (ra * ra + rb * rb), wb = 1 - wa;
            a.x -= nx * overlap * wa; a.y -= ny * overlap * wa; b.x += nx * overlap * wb; b.y += ny * overlap * wb;
             const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (relative < 0) { a.vx += nx * relative * wa * 1.3; a.vy += ny * relative * wa * 1.3; b.vx -= nx * relative * wb * 1.3; b.vy -= ny * relative * wb * 1.3; if (relative < -90) { a.squash = b.squash = Math.min(.2, -relative / 1600); } if (relative < -220) burst((a.x + b.x) / 2, (a.y + b.y) / 2, colours[a.tier], 4, 70); }
            // Exact vertical perches slowly roll toward the player's aim. This
            // resolves symmetric stacks without injecting random drop jitter.
            if (pass === 0 && Math.abs(nx) < .12 && Math.abs(relative) < 45) {
              const upper = a.y < b.y ? a : b, lower = upper === a ? b : a;
              upper.vx += Math.sign(upper.x - lower.x || aim - W / 2 || lastDirection) * 26 * dt;
            }
          }
        }
      }
      for (const s of shocks) {
        const reach = s.chain ? 190 + Math.min(combo, 6) * 12 : 145;
        for (const b of balls) {
          const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy);
          if (d < 1 || d > reach + radii[b.tier]) continue;
          const pull = s.chain && b.tier === s.tier, impulse = (pull ? -115 : 85) * Math.max(.2, 1 - d / (reach + radii[b.tier]));
          b.vx = clamp(b.vx + dx / d * impulse, -340, 340); b.vy = clamp(b.vy + dy / d * impulse - (pull ? 15 : 65), -260, 650);
        }
        relicField(s.x, s.y, reach, s.chain ? '#edf19b' : '#bba7ed');
      }
      const overflow = balls.some(b => b.age > 2.2 && b.y - radii[b.tier] < 92);
      danger = overflow ? danger + dt : Math.max(0, danger - dt * (has('deep-cradle') ? 3 : 2));
      // Pressure bands: dread you can hear climbing, and a named relief when
      // the jar settles back from the brink.
      const band = danger / dangerLimit();
      if (band > .5 && peakBand < .5) motif([[185, 0, .3, 'triangle', .05], [174.61, .02, .35, 'sine', .04]]);
      if (band > .7) {
        peakBand = Math.max(peakBand, band);
        if (time - lastThump > .8) { lastThump = time; note(55, 0, .16, 'sine', .05); }
      }
      if (band < .2 && peakBand > .7) {
        peakBand = 0;
        banner('THE JAR SETTLES', '#9ed7c6', 16); tone(392, .4, 'sine', .04);
      }
      if (danger > dangerLimit() || balls.length > 110) finish('One very full universe.', 1.4);
    }
    function surfStep(dt) {
      const held = pointerHeld || keys.has(' ') || keys.has('ArrowUp');
      flightBoost = Math.max(0, flightBoost - dt);
      if (held) tetherAwaitingPress = false;
      if (held && !tether) {
        const candidates = worlds.map(w => ({ w, distance: Math.hypot(w.x - ship.x, w.y - ship.y) })).filter(p => p.distance < tetherReach() && p.distance > p.w.r + 15).sort((a, b) => a.distance - b.distance);
        if (candidates.length) {
          const p = candidates[0].w, dx = ship.x - p.x, dy = ship.y - p.y;
          tether = { planet: p, radius: Math.max(p.r + 40, Math.hypot(dx, dy)), angle: Math.atan2(dy, dx), direction: dx * ship.vy - dy * ship.vx >= 0 ? 1 : -1 }; orbitCharge = 0; chargeStep = 0;
          // The catch should feel magnetic, not automatic.
          punch(.3, .05); relicField(p.x - camera, p.y, p.r + 30, '#edf19b', .4); burst(ship.x - camera, ship.y, '#edf19b', 8, 120);
          tone(350, .1);
        }
      }
      if (!held && tether && !tetherAwaitingPress) {
        const energy = has('solar-spool') ? orbitCharge : 0;
        const speed = 285 + Math.min(100, level * 10) + energy * 220;
        ship.vx = -Math.sin(tether.angle) * tether.direction * speed; ship.vy = Math.cos(tether.angle) * tether.direction * speed;
        // A release always has some forward momentum and stays inside the flight band.
        ship.vx = Math.max(200 + energy * 100, ship.vx);
        ship.vy = clamp(ship.vy, -290 + energy * 70, 290 - energy * 70);
        ship.y = clamp(ship.y, 8, H - 8);
        if (energy > .15) { flightBoost = 1.8 * energy; invulnerable = Math.max(invulnerable, .3 + energy * .5); relicField(ship.x - camera, ship.y, ringReach() || 65, '#edf19b'); }
        orbitCharge = 0; chargeStep = 0;
        // The slingshot is the core verb: freeze, zoom, ripple.
        const power = Math.hypot(ship.vx, ship.vy) / 560;
        punch(power > .8 ? 0 : .25, power > .8 ? .07 : .04);
        if (!reduced) zoom = Math.max(zoom, 1 + power * .05);
        ripples.push({ x: ship.x - camera, y: ship.y, radius: 10, life: .5, colour: '#f3e69b' });
        light(energy > .15 ? '237,241,155' : '245,186,156', energy > .15 ? .09 : .04, energy > .15 ? .6 : .2); kick = energy > .15 ? .7 : .4;
        if (energy > .15) motif([[1046.5, .05, .25], [1174.66, .12, .3]], .035);
        burst(ship.x - camera, ship.y, '#f3e69b', 16, 220); tether = null; releases++;
        note(330, 0, .3, 'sine', .06, .01, 2.0);
      }
      if (tether) {
        if (has('solar-spool')) {
          orbitCharge = Math.min(1, orbitCharge + dt / 1.25);
          // The winding-up answers in quarter steps.
          const step4 = Math.min(3, Math.floor(orbitCharge * 4));
          if (step4 > chargeStep) { chargeStep = step4; note([440, 523.25, 587.33, 783.99][step4], 0, .06, 'sine', .03); }
        }
        tether.angle += tether.direction * (270 + level * 6) / tether.radius * dt;
        ship.x = tether.planet.x + Math.cos(tether.angle) * tether.radius; ship.y = tether.planet.y + Math.sin(tether.angle) * tether.radius;
        ship.vx = -Math.sin(tether.angle) * tether.direction * 290; ship.vy = Math.cos(tether.angle) * tether.direction * 290;
      } else {
        if (has('moon-sail')) ship.vy *= Math.exp(-.2 * dt);
        ship.vy += (has('moon-sail') ? 8 : 24) * dt; ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      }
      // Speed-lookahead camera: the ship slides off-anchor as pace builds.
      const look = clamp((ship.vx - 240) * .22, 0, 70);
      const cameraTarget = ship.x - 270 - (reduced ? look * .4 : look);
      camera = Math.max(camera, camera + (cameraTarget - camera) * (1 - Math.exp(-4 * dt)));
      while (nextWorld < camera + W + 650) newWorld();
      worlds = worlds.filter(w => w.x > camera - 350 || tether?.planet === w);
      for (const w of worlds) {
        const wDistance = Math.hypot(ship.x - w.x, ship.y - w.y);
        if (!tether && wDistance < w.r + 10) {
          const before = lives; hurt(ship.x - camera, ship.y);
          if (lives < before) { ship.vx = 260; ship.vy = ship.y < w.y ? -180 : 180; }
        } else if (!tether && wDistance < w.r + 34 && !w.grazed) {
          // Skimming a planet you never grabbed still counts for something.
          w.grazed = true; scoreAt(25, ship.x - camera, ship.y - 28, 'GRAZE +25'); tone(470, .07);
          punch(.45, .12); if (!reduced) zoom = Math.max(zoom, 1.02);
          light('245,186,156', .03, .12);
        }
      }
      for (const r of rings) {
        if (phase !== 'running') break;
        const dx = ship.x - r.x, dy = ship.y - r.y, d = Math.hypot(dx, dy);
        if (!r.taken && d > 1 && d < ringReach()) { const pull = Math.min(d, (flightBoost > 0 ? 420 : 240) * dt) / d; r.x += dx * pull; r.y += dy * pull; }
        if (!r.taken && Math.hypot(ship.x - r.x, ship.y - r.y) < 35) {
          r.taken = true; combo++; ringsCaught++;
          if (has('comet-aegis') && shields === 0) {
            shieldCharge++;
            if (shieldCharge >= (has('ring-reactor') ? 2 : 3)) { shields = 1; shieldCharge = 0; relicField(ship.x - camera, ship.y, 38, '#9ed7c6'); motif([[440, 0, .1], [587.33, .07, .1], [880, .14, .22]], .04); }
          }
          if (has('ring-reactor')) { ship.vx = Math.min(560, ship.vx + 40); reactorRings++; if (reactorRings % 4 === 0) { lives = Math.min(3, lives + 1); relicField(ship.x - camera, ship.y, 80, '#9ed7c6'); } }
          if (has('ring-compass') && has('solar-spool') && flightBoost > 0) flightBoost = Math.min(3, flightBoost + .35);
          if (combo === 3 || combo === 5 || combo === 8) { punch(.2, .05); ripples.push({ x: r.x - camera, y: r.y, radius: 8, life: .5, colour: '#edf19b' }); }
          light('237,241,155', .05, .3);
          scoreAt(50 + Math.min(combo, 10) * 10, r.x - camera, r.y - 35, `${combo}× ORBIT`); burst(r.x - camera, r.y, '#edf19b', 28);
          tone([523.25, 587.33, 698.46, 783.99, 880, 1046.5, 1174.66, 1396.91][combo % 8], .13, 'sine', .06);
        }
        if (!r.taken && r.x < camera - 30) combo = 0;
      }
      rings = rings.filter(r => r.x > camera - 50);
      for (const r of rocks) {
        const d = Math.hypot(ship.x - r.x, ship.y - r.y);
        if (!tether && d < r.r + 10) hurt(ship.x - camera, ship.y);
        else if (d < r.r + 35 && !r.grazed) { r.grazed = true; scoreAt(35, r.x - camera, r.y - 30, 'CLOSE CALL +35'); note(196, 0, .09, 'triangle', .035); }
      }
      rocks = rocks.filter(r => r.x > camera - 70);
      // Orbiting ships may swing briefly outside the band; only free flight is punished.
      if (!tether && (ship.y < -20 || ship.y > H + 20 || ship.x < camera - 20)) {
        hurt(clamp(ship.x - camera, 30, W - 30), clamp(ship.y, 30, H - 30));
        ship.x = camera + 110; ship.y = H / 2; ship.vx = Math.max(260, ship.vx); ship.vy = -35;
      }
      maxMetres = Math.max(maxMetres, ship.x / 10);
      const distance = Math.floor(Math.max(0, ship.x) / 100);
      if (distance > distanceScore) { score += distance - distanceScore; distanceScore = distance; best = Math.max(best, score); }
      const sector = 1 + Math.floor(ship.x / 2400);
      if (sector > level) {
        level = sector; lives = Math.min(3, lives + 1);
        // The sky itself celebrates a promotion: flash, gold bloom, a named land.
        const sectorNames = ['', '', 'THE COLD BELT', 'THE LONG DRIFT', 'THE GOLDEN REACH', 'THE FAR SHORE', 'BEYOND THE MAP'];
        banner(`SECTOR ${String(level).padStart(2, '0')}${sectorNames[level] ? ' — ' + sectorNames[level] : ''}`, '#edf19b');
        if (lives < 3) popups.push({ x: W / 2, y: H * .3 + 34, text: '+1 HEART — THE ORBIT PROVIDES', colour: '#9ed7c6', life: 1.6, size: 13 });
        scoreAt(150, W / 2, 130, `SECTOR ${level} · +150`);
        light('237,241,155', .1, .8); kick = .8;
        motif([[523.25, 0, .12], [587.33, .1, .12], [698.46, .2, .12], [1046.5, .3, .35]], .055);
      }
      ship.trail.push({ x: ship.x, y: ship.y }); if (ship.trail.length > (reduced ? 4 : 38)) ship.trail.shift();
    }
    function spawnWave() {
      wave++; const base = 75 + random() * (W - 150), pattern = wave % 4;
      // Every eighth wave is a golden surge: a breather and a streak-builder.
      const surge = wave % 8 === 0;
      if (surge) {
        surgeUntil = time + 1.2;
        banner('STAR SURGE — CATCH EVERYTHING', '#edf19b', 20);
        motif([[880, 0, .2], [1046.5, .1, .2], [1318.51, .2, .24], [1567.98, .3, .4]], .045);
      }
      for (let i = 0; i < 5; i++) {
        const x = pattern === 0 ? 90 + i * 180 : clamp(base + (i - 2) * (pattern === 1 ? 74 : 125), 35, W - 35);
        const bad = surge ? false : pattern === 2 ? i === 0 || i === 4 : i === wave % 5;
        falling.push({ x, y: -30 - (pattern === 1 ? i * 35 : 0), speed: (155 + time * 2.4 + i * 6) * (surge ? .82 : 1), bad, kind: !bad && i === 2 && wave % 7 === 0 ? 'jelly' : 'star', r: bad ? 18 : 12, wait: bad ? .55 : .1, spin: i, taken: false });
      }
    }
    function collectPickup(f) {
      const def = powerUps.dash.find(p => p.id === f.pickupId);
      if (!def) return;
      // One effect at a time: a new gift replaces the old with its own farewell.
      if (activePower && activePower.id !== def.id) popups.push({ x: W / 2, y: H * .4, text: activePower.expiry, colour: activePower.colour, life: 1.2 });
      if (def.id === 'lodestone-bloom') magnet = Math.max(magnet, def.duration);
      else slow = Math.max(slow, def.duration);
      activePower = { ...def, remaining: def.duration, warned: false };
      popups.push({ x: f.x, y: f.y - 34, text: `POWER UP · ${def.name.toUpperCase()}`, colour: def.colour, life: 1.7 });
      burst(f.x, f.y, def.colour, 26); relicField(catcher.x, H - 72, 90, def.colour);
      light(rgbOf(def.colour), .08, .5); kick = .5;
      motif([[560, 0, .1], [840, .09, .2]], .06);
      notify();
    }
    function dashStep(dt) {
      const wasDashing = dashTime > 0;
      remaining = Math.max(0, remaining - dt); dashTime -= dt; magnet -= dt; slow = Math.max(0, slow - dt); spawn -= dt; charge = Math.min(100, charge + dt * (has('ion-cell') ? 13 : 8));
      if (activePower) {
        activePower.remaining -= dt;
        if (activePower.remaining <= 2 && !activePower.warned) { activePower.warned = true; popups.push({ x: W / 2, y: H * .42, text: 'THE MAGIC FADES', colour: activePower.colour, life: 1 }); motif([[659.26, 0, .12], [523.25, .1, .22]], .035); }
        if (activePower.remaining <= 0) {
          popups.push({ x: W / 2, y: H * .42, text: activePower.expiry, colour: activePower.colour, life: 1.4 });
          note(392, 0, .25, 'sine', .035, .02, .7);
          activePower = null; notify();
        }
      }
      for (const slot of pickupSchedule) {
        if (slot.fired || slot.time > time) continue;
        slot.fired = true;
        const def = powerUps.dash.find(p => p.id === slot.id);
        if (!def) break;
        // Never drop a gift onto a meteor: nudge along fixed offsets until clear.
        let x = slot.x;
        for (const off of [0, 80, -80, 160, -160, 240, -240]) {
          const candidate = clamp(x + off, 60, W - 60);
          if (!falling.some(g => g.bad && !g.taken && g.y < 150 && Math.abs(g.x - candidate) < 90)) { x = candidate; break; }
        }
        falling.push({ x, y: -30, speed: 130, bad: false, kind: 'pickup', pickupId: def.id, r: 16, wait: 0, spin: 0, taken: false });
        popups.push({ x, y: 100, text: def.incoming, colour: def.colour, life: 2.2 });
        tone(720, .18, 'sine', .05);
        notify();
        break;
      }
      echoes.forEach(e => { e.life -= dt; }); echoes = echoes.filter(e => e.life > 0);
      if (wasDashing && dashTime <= 0 && has('afterimage') && has('ion-cell')) { echoes.push({ x: catcher.x, life: 1.8 }); if (echoes.length > 3) echoes.shift(); relicField(catcher.x, H - 72, basketWidth(), '#9ed7c6'); }
      const direction = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
      if (direction) { pointerAim = null; lastDirection = direction; }
      if (dashTime <= 0) {
        const velocity = direction ? direction * 560 : pointerAim !== null ? clamp((pointerAim - catcher.x) * 13, -850, 850) : 0;
        catcher.vx += (velocity - catcher.vx) * (1 - Math.exp(-18 * dt));
      }
      catcher.x = clamp(catcher.x + catcher.vx * dt, basketWidth(), W - basketWidth()); catcher.tilt += (catcher.vx / 2200 - catcher.tilt) * dt * 12;
      catcher.pop = Math.max(0, (catcher.pop || 0) - dt * 1.4);
      if (spawn <= 0 && remaining > 3) { spawnWave(); spawn = Math.max(.72, 1.45 - time * .008); }
      const fallFactor = slow > 0 ? .55 : 1;
      for (const f of falling) {
        if (phase !== 'running') break;
        f.wait -= dt; if (f.wait > 0) continue;
        f.y += f.speed * dt * fallFactor; f.spin += dt;
        if (!f.bad && Math.hypot(f.x - catcher.x, f.y - (H - 72)) < magnetReach()) {
          f.x += (catcher.x - f.x) * dt * (has('lodestone') ? 3.8 : 2.8); f.attracted = true;
        }
        const atHeight = Math.abs(f.y - (H - 72)) < f.r + 10;
        const directCatch = atHeight && Math.abs(f.x - catcher.x) < basketWidth() + f.r * .7;
        const echoCatch = !f.bad && atHeight && echoes.some(e => Math.abs(f.x - e.x) < basketWidth() + f.r * .7);
        // A meteor that brushes the rim gets its own adrenaline bookkeeping.
        if (f.bad && !f.grazed && atHeight && !directCatch && Math.abs(f.x - catcher.x) < basketWidth() + f.r * .7 + 26) {
          f.grazed = true; popups.push({ x: f.x, y: H - 110, text: 'CLOSE', colour: '#f5a08c', life: .7 });
          shake = Math.max(shake, 2); tone(300, .06, 'sine', .05);
        }
        if (!f.taken && (directCatch || echoCatch)) {
          f.taken = true;
          if (f.bad) { hurt(catcher.x, H - 72); catcher.tilt = (f.x < catcher.x ? 1 : -1) * .38; }
          else if (f.kind === 'pickup') collectPickup(f);
          else {
            catcher.pop = f.kind === 'jelly' ? .24 : .16;
            burst(f.x, H - 76, '#edf19b', 3, 60);
            combo++; totalCatches++; charge = Math.min(100, charge + (has('ion-cell') ? 11 : 7) + (echoCatch && !directCatch && has('ion-cell') ? 18 : 0));
            if (has('star-aegis') && shields < 2) {
              shieldCharge += has('lodestone') && f.attracted ? 2 : 1;
              if (shieldCharge >= 5) { shields++; shieldCharge -= 5; relicField(catcher.x, H - 72, basketWidth() + 14, '#9ed7c6'); }
            }
            if (has('second-hand')) {
              clockCatches++;
              if (clockCatches % 6 === 0) { remaining = Math.min(90, remaining + 1.8); scoreAt(0, f.x, f.y - 60, '+1.8 SECONDS'); relicField(catcher.x, H - 72, 70, '#edf19b'); }
            }
            const multiplier = Math.min(8, 1 + Math.floor(combo / 5));
            if (multiplier > Math.min(8, 1 + Math.floor((combo - 1) / 5))) {
              banner(`STREAK ×${multiplier}`, '#edf19b', 18);
              motif([[659.26, 0, .1], [783.99, .07, .1], [1046.5, .14, .2]], .055);
              light('237,241,155', .06 + multiplier * .01, .4);
            }
            scoreAt(10 * multiplier, f.x, f.y - 25, f.kind === 'jelly' ? 'STAR MAGNET!' : `+${10 * multiplier}`);
            if (f.kind === 'jelly') { magnet = Math.max(magnet, 6); lives = Math.min(3, lives + 1); light('187,167,237', .08, .5); kick = .5; motif([[659.26, 0, .14], [783.99, .07, .14], [1046.5, .14, .25]], .05); }
            else light('237,241,155', .035, .18);
            burst(f.x, f.y, f.kind === 'jelly' ? '#bba7ed' : '#edf19b', 13);
            tone([523.25, 587.33, 659.26, 783.99, 880, 1046.5, 1174.66, 1318.51][combo % 8], .1, 'sine', .055);
          }
        }
        if (!f.taken && !f.bad && f.y > H + 30) {
          f.taken = true;
          // A missed star never breaks the streak — only a meteor does. The
          // promised ×8 has to be reachable, or the multiplier is decoration.
          if (f.kind === 'pickup') popups.push({ x: f.x, y: H - 60, text: 'THE GIFT DRIFTS BY', colour: '#b7abc9', life: 1.2 });
        }
      }
      falling = falling.filter(f => !f.taken && f.y < H + 50);
      level = 1 + Math.floor(time / 15);
      // The 75 seconds have a spine: five named acts, then a staged finale.
      if (level !== dashAct) {
        dashAct = level;
        const acts = ['', '', 'ACT II — THE SKY THICKENS', 'ACT III — THE FORECAST WORSENS', 'ACT IV — THE HEAVENS OPEN', 'ACT V — THE LAST OF IT'];
        if (acts[level]) { banner(acts[level], '#cbb287', 20); tone(587.33, .3, 'sine', .05); }
      }
      if (remaining <= 10 && !lastTen) {
        lastTen = true;
        banner('THE LAST TEN — MAKE THEM COUNT', '#edf19b', 20);
        // A scripted golden curtain: nine stars, no meteors, full width.
        for (let i = 0; i < 9; i++) falling.push({ x: 70 + i * (W - 140) / 8, y: -30 - (i % 2) * 55, speed: 150, bad: false, kind: 'star', r: 12, wait: 0, spin: i, taken: false });
      }
      if (remaining <= 5) {
        const sec = Math.ceil(remaining);
        if (sec !== lastTickSec) { lastTickSec = sec; tone(880, .05, 'sine', .04); }
      }
      if (remaining <= 0) {
        // The shower surrenders: every falling meteor bursts into gold.
        for (const f of falling) if (!f.taken) { f.taken = true; burst(f.x, f.y, f.bad ? '#edf19b' : '#f1f4ac', 6, 120); }
        burst(catcher.x, H - 72, '#edf19b', 65, 260); punch(.15, .45);
        finish('Meteor shower: absolutely handled.', 1.6, true);
      }
    }
    function splitComet(source) {
      if (!source || comets.length >= 3) return;
      const a = Math.atan2(source.vy, source.vx) + (comets.length === 1 ? .48 : -.48), speed = Math.max(285, Math.hypot(source.vx, source.vy));
      comets.push({ x: source.x, y: source.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, trail: [], secondary: true });
      relicField(source.x, source.y, 40, '#9ed7c6');
    }
    function hitCrystal(b, damage = 1) {
      if (b.hp <= 0) return;
      b.hp = Math.max(0, b.hp - damage); b.hit = .2; combo++; crystalHits++;
      if (has('twin-comet')) splitHits++;
      charge = Math.min(100, charge + (has('chrono-coil') ? 20 : 12));
      scoreAt(25 * Math.min(8, combo), b.x, b.y - 20); burst(b.x, b.y, colours[b.tier], b.hp ? 7 : 22); shake = 2;
      // Dents dip; shatters stop the world a moment, longer in a cascade.
      punch(b.hp ? .3 : 0, b.hp ? .025 : .05 + Math.min(combo, 10) * .004);
      light(rgbOf(colours[b.tier]), b.hp ? .03 : .07, b.hp ? .12 : .3);
      if (combo === 4 || combo === 8) punch(0, .05);
      tone(350 + b.tier * 65, .1, 'sine', .05);
      if (b.hp) note(220, 0, .05, 'square', .02);
      else note(1567.98, .02, .1, 'sine', .025);
    }
    function breakerStep(dt) {
      slowTime -= dt;
      const direction = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
      if (direction) paddle.target = paddle.angle + direction * 3.5 * dt;
      paddle.angle += angleDiff(paddle.target, paddle.angle) * (direction ? 1 : 1 - Math.exp(-20 * dt));
      bricks.forEach(b => { b.hit = Math.max(0, b.hit - dt); });
      if (launchTimer > 0) {
        launchTimer -= dt;
        comets.forEach((c, i) => {
          // A gentle opening serve; speed builds through paddle returns.
          const a = paddle.angle + i * .1, speed = 210 + Math.min(140, (level - 1) * 26);
          c.x = W / 2 + Math.cos(a) * 208; c.y = H / 2 + Math.sin(a) * 208;
          c.vx = -Math.cos(a + .13 + i * .24) * speed; c.vy = -Math.sin(a + .13 + i * .24) * speed; c.trail = [];
        });
        return;
      }
      const speedFactor = slowTime > 0 ? .65 : 1, radius = cometRadius();
      const contact = 235 - (slowTime > 0 ? 6 : 5) - radius;
      let lastLost = null;
      for (const c of comets) {
        const previousDistance = Math.hypot(c.x - W / 2, c.y - H / 2);
        c.x += c.vx * dt * speedFactor; c.y += c.vy * dt * speedFactor;
        for (const b of bricks) {
          if (!b.hp) continue;
          const dx = c.x - b.x, dy = c.y - b.y, distance = Math.hypot(dx, dy);
          if (distance < b.r + radius) {
            const nx = distance > .001 ? dx / distance : 0, ny = distance > .001 ? dy / distance : 1;
            c.x = b.x + nx * (b.r + radius + .1); c.y = b.y + ny * (b.r + radius + .1);
            const dot = c.vx * nx + c.vy * ny;
            if (dot < 0) { c.vx -= 2 * dot * nx; c.vy -= 2 * dot * ny; }
            hitCrystal(b, has('dense-core') ? 2 : 1);
            if (has('shatterglass')) {
              const prism = has('twin-comet') && c.secondary, reach = prism ? 105 : 62;
              const neighbours = bricks.filter(n => n !== b && n.hp > 0 && Math.hypot(n.x - b.x, n.y - b.y) <= reach).sort((a, n) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(n.x - b.x, n.y - b.y)).slice(0, prism ? 2 : 1);              for (const n of neighbours) { hitCrystal(n); fields.push({ x: b.x, y: b.y, toX: n.x, toY: n.y, radius: reach, colour: prism ? '#edf19b' : '#bba7ed', life: .4, max: .4 }); }
              relicField(b.x, b.y, reach, prism ? '#edf19b' : '#bba7ed', .35);
            }
            break;
          }
        }
        const dx = c.x - W / 2, dy = c.y - H / 2, distance = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        if (c.vx * dx + c.vy * dy > 0) {
          let offset = angleDiff(a, paddle.angle);
          const opposite = has('crescent-crown') && has('chrono-coil') && slowTime > 0;
          if (opposite && Math.abs(angleDiff(a, paddle.angle + Math.PI)) < Math.abs(offset)) offset = angleDiff(a, paddle.angle + Math.PI);
          // The contact radius uses the very same drawn paddle width and comet
          // radius. A missed comet cannot be caught by an invisible outer paddle.
          if (distance >= contact && previousDistance <= contact && Math.abs(offset) < paddleHalf()) {
            const speed = Math.min(490, Math.hypot(c.vx, c.vy) + 4), bounce = a + Math.PI + offset * .8;
            c.x = W / 2 + Math.cos(a) * (contact - .2); c.y = H / 2 + Math.sin(a) * (contact - .2);
            c.vx = Math.cos(bounce) * speed; c.vy = Math.sin(bounce) * speed;
            // A brief arrow shows where your angle sent the comet.
            fields.push({ x: c.x, y: c.y, toX: c.x + Math.cos(bounce) * 52, toY: c.y + Math.sin(bounce) * 52, radius: 10, colour: '#a6d9ec', life: .25, max: .25 });
            if (has('return-sigil')) { wardReturns++; if (wardReturns >= 6) { ward = 1; wardReturns = 0; relicField(W / 2, H / 2, 254, '#9ed7c6'); } }
            paddle.kick = 1; punch(.2, .04);
            burst(c.x, c.y, '#a8dcdf', 8, 70);
            motif([[200, 0, .07, 'triangle', .085], [400, .01, .05, 'sine', .03]]);
          } else if (ward && distance >= 254 - radius) {
            ward = 0; const speed = Math.hypot(c.vx, c.vy); c.vx = -Math.cos(a) * speed; c.vy = -Math.sin(a) * speed;
            relicField(c.x, c.y, 55, '#9ed7c6'); tone(640, .12);
            light('158,215,198', .09, .5); kick = .5; note(1318.51, .07, .18, 'sine', .03);
          } else if (distance > 265) { c.lost = true; lastLost = c; burst(c.x, c.y, '#f58e9b', 8); note(392, 0, .28, 'sine', .045, .02, .5); }
        }
        c.trail.push({ x: c.x, y: c.y }); if (c.trail.length > (reduced ? 3 : 24)) c.trail.shift();
      }
      comets = comets.filter(c => !c.lost);
      // Only losing the final comet spends a life, even if several leave in one step.
      if (!comets.length && lastLost) {
        invulnerable = 0; hurt(lastLost.x, lastLost.y); combo = 0; launchTimer = 2.1;
        if (phase === 'running') {
          comets.push({ x: W / 2, y: H / 2 + 208, vx: 0, vy: -290, trail: [], secondary: false });
          // A beat to breathe: the comet pins to the paddle until launch.
          popups.push({ x: W / 2 + Math.cos(paddle.angle) * 208, y: H / 2 + Math.sin(paddle.angle) * 208 - 30, text: 'COMET INCOMING', colour: '#a6d9ec', life: 1.6 });
        }
      }
      while (splitHits >= 6) { splitHits -= 6; splitComet(comets[0]); }
      if (bricks.every(b => !b.hp) && phase === 'running') {
        // The wave gets a ceremony: slow-mo dissolve, gold bloom, a held breath.
        level++; lives = Math.min(3, lives + 1);
        scoreAt(500, W / 2, H / 2, 'CONSTELLATION CLEARED +500');
        banner('CONSTELLATION CLEARED', '#edf19b');
        punch(.18, .55); if (!reduced) zoom = 1.06; relicField(W / 2, H / 2, 260, '#edf19b', .9);
        light('237,241,155', .15, 1); kick = 1;
        motif([[329.63, 0, .13], [392, .11, .13], [493.88, .22, .13], [587.33, .33, .13], [659.26, .44, .4]], .055);
        note(164.81, 0, .5, 'triangle', .05);
        makeBricks(); launchTimer = 2.6;
      }
      // The classic last-brick hunt, made into a moment.
      const alive = bricks.filter(b => b.hp > 0);
      if (alive.length === 1 && !oneCrystal && bricks.length > 3) {
        oneCrystal = true; banner('ONE CRYSTAL REMAINS', '#a6d9ec', 18); tone(660, .3, 'sine', .05);
      }
      if (oneCrystal && alive.length === 1 && time - lastBeacon > .5) {
        lastBeacon = time; relicField(alive[0].x, alive[0].y, 30, '#edf19b', .5);
      }
    }
    function step(dt) {
      if (suspended || phase !== 'running') return;
      time += dt; invulnerable = Math.max(0, invulnerable - dt);
      const wasReady = charge >= 100;
      if (options.game === 'merge') mergeStep(dt);
      else if (options.game === 'hop') surfStep(dt);
      else if (options.game === 'dash') dashStep(dt);
      else breakerStep(dt);
      // The ability meter announces its readiness on-canvas.
      if (!wasReady && charge >= 100 && options.game !== 'hop') {
        popups.push({ x: W / 2, y: H * .2, text: `${options.game === 'merge' ? 'NUDGE' : options.game === 'dash' ? 'DASH' : 'SLOW ORBIT'} READY · X`, colour: '#a6d9ec', life: 1.2, size: 13 });
        tone(980, .14, 'sine', .05);
      }
      // The draft telegraph counts down, then the run truly suspends.
      if (draftWarn > 0) { draftWarn -= dt; if (draftWarn <= 0) openOffer(); }
      else checkOffer();
    }
    function effectsStep(dtFx, dtReal) {
      // Particles crawl through hit-stop; the ending timer runs on real time.
      visualTime += dtFx; shake *= Math.exp(-11 * dtFx); flash = Math.max(0, flash - dtFx);
      glow = Math.max(0, glow - dtFx * 1.2); kick = Math.max(0, kick - dtFx * 2.2);
      zoom += (1 - zoom) * (1 - Math.exp(-6 * dtFx));
      for (const p of particles) { p.x += p.vx * dtFx; p.y += p.vy * dtFx; p.vx *= Math.exp(-2 * dtFx); p.vy += 45 * dtFx; p.life -= dtFx; p.angle += dtFx * 2; }
      particles = particles.filter(p => p.life > 0);
      for (const r of ripples) { r.radius += dtFx * 100; r.life -= dtFx; }
      ripples = ripples.filter(r => r.life > 0);
      for (const p of popups) { if (!p.max) p.max = p.life; p.y -= dtFx * (10 + 26 * (p.life / p.max)); p.life -= dtFx; }
      popups = popups.filter(p => p.life > 0);
      fields.forEach(f => { f.life -= dtFx; }); fields = fields.filter(f => f.life > 0);
      if (phase === 'ending') {
        // The boil-over narrates merge's death; the comet drifts out of breaker's.
        if (options.game === 'merge' && visualTime - (effectsStep.lastRipple || 0) > .3) { effectsStep.lastRipple = visualTime; ripples.push({ x: W / 2, y: 92, radius: 20, life: .7, colour: '#f58e9b' }); }
        if (options.game === 'breaker') for (const c of comets) { c.x += c.vx * dtFx * .35; c.y += c.vy * dtFx * .35; c.trail.push({ x: c.x, y: c.y }); if (c.trail.length > 24) c.trail.shift(); }
        finishDelay -= dtReal;
        if (finishDelay <= 0) {
          phase = 'over';
          if (finishWon) { note(783.99, 0, .2, 'sine', .05); note(1046.5, .12, .4, 'sine', .05); }
          else note(130.81, 0, .5, 'triangle', .05);
          options.onFinish?.({ score, largest, drops, level, totalMerges, relics: owned.slice(), synergies: activeSynergies(), stats: stats(), result }); notify();
        }
      }
    }
    function text(value, x, y, size = 12, colour = '#b8aacb', align = 'center') {
      ctx.font = `500 ${size}px "DM Sans", sans-serif`; ctx.fillStyle = colour; ctx.textAlign = align; ctx.fillText(value, x, y);
    }
    function trail(points, colour, offset = 0, width = 8) {
      if (points.length < 2) return;
      ctx.lineCap = 'round';
      // Every other point: half the stroke calls, same ribbon read.
      for (let i = 1; i < points.length; i += 2) { ctx.globalAlpha = i / points.length * .42; ctx.strokeStyle = colour; ctx.lineWidth = i / points.length * width * 1.4; ctx.beginPath(); ctx.moveTo(points[i - 1].x - offset, points[i - 1].y); ctx.lineTo(points[i].x - offset, points[i].y); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // Soft radial sprite, baked once: centres every cheap glow in the games.
    function glowSprite(w, h, rgb, alpha) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      grad.addColorStop(0, `rgba(${rgb},${alpha})`); grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      return c;
    }
    function nebulaSprite(colA, colB) {
      const c = document.createElement('canvas'); c.width = c.height = 220;
      const g = c.getContext('2d');
      for (let i = 0; i < 5; i++) {
        const x = 40 + bgRandom() * 140, y = 40 + bgRandom() * 140, r = 40 + bgRandom() * 70;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, (i % 2 ? colA : colB) + '2e'); grad.addColorStop(1, (i % 2 ? colA : colB) + '00');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      return c;
    }
    function background() {
      if (!hueCache) {
        hueCache = { base: ctx.createLinearGradient(0, 0, 0, H), glow: ctx.createRadialGradient(W * .65, H * .28, 20, W * .65, H * .28, W * .7) };
        hueCache.base.addColorStop(0, '#101b24'); hueCache.base.addColorStop(.55, '#192335'); hueCache.base.addColorStop(1, '#302938');
        const glowStops = { merge: '#6d4a2f46', hop: '#67426c46', dash: '#3963684a', breaker: '#3d4a7a46' };
        hueCache.glow.addColorStop(0, glowStops[options.game]); hueCache.glow.addColorStop(1, '#211b3500');
        const nebulae = { merge: ['#dfac7f', '#b0a0df'], hop: ['#b0a0df', '#e29eb7'], dash: ['#7ac7b5', '#8eaade'], breaker: ['#8eaade', '#b0a0df'] };
        hueCache.nebulaA = nebulaSprite(...nebulae[options.game]);
        hueCache.nebulaB = nebulaSprite(...nebulae[options.game].reverse());
        hueCache.vignette = (() => {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const g = c.getContext('2d');
          const grad = g.createRadialGradient(W / 2, H * .52, H * .42, W / 2, H * .52, H * .78);
          grad.addColorStop(0, 'rgba(6,8,14,0)'); grad.addColorStop(1, 'rgba(6,8,14,.55)');
          g.fillStyle = grad; g.fillRect(0, 0, W, H);
          return c;
        })();
        hueCache.dread = (() => {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const g = c.getContext('2d');
          const grad = g.createRadialGradient(W / 2, H * .52, H * .35, W / 2, H * .52, H * .8);
          grad.addColorStop(0, 'rgba(245,142,155,0)'); grad.addColorStop(1, 'rgba(245,142,155,.55)');
          g.fillStyle = grad; g.fillRect(0, 0, W, H);
          return c;
        })();
        if (options.game === 'hop') {
          hueCache.sectorGlows = ['#67426c46', '#39636846', '#8c4a5e46', '#8c753d46'].map(col => {
            const grad = ctx.createRadialGradient(W * .72, H * .3, 20, W * .72, H * .3, W * .7);
            grad.addColorStop(0, col); grad.addColorStop(1, '#211b3500');
            return grad;
          });
          hueCache.horizon = ctx.createLinearGradient(0, H * .62, 0, H);
          hueCache.horizon.addColorStop(0, '#2a214000'); hueCache.horizon.addColorStop(1, '#3b2c4d55');
        }
        if (options.game === 'merge') {
          hueCache.jarShade = ctx.createLinearGradient(0, 92, 0, H - 20);
          hueCache.jarShade.addColorStop(0, '#080a1400'); hueCache.jarShade.addColorStop(1, '#080a1461');
          hueCache.floorGlow = glowSprite(180, 54, '223,172,127', .5);
        }
        if (options.game === 'dash') {
          hueCache.seaGlow = glowSprite(320, 90, '158,215,198', .5);
          hueCache.seaGlowWarm = glowSprite(320, 90, '245,142,155', .5);
          hueCache.poolGlow = glowSprite(140, 44, '158,215,198', .55);
          hueCache.motes = Array.from({ length: 12 }, () => ({ x: bgRandom(), y: bgRandom(), d: .5 + bgRandom() }));
        }
        if (options.game === 'breaker') {
          hueCache.cores = ['142,170,222', '176,160,223', '237,181,87', '226,158,183'].map(rgb => glowSprite(150, 150, rgb, .55));
          hueCache.cometGlow = glowSprite(48, 48, '250,199,165', .6);
          hueCache.cometGlowMint = glowSprite(48, 48, '158,215,198', .6);
          hueCache.cometGlowGold = glowSprite(48, 48, '237,241,155', .6);
        }
      }
      ctx.fillStyle = hueCache.base; ctx.fillRect(0, 0, W, H);
      // The backdrop inhales slowly and flushes warm whenever events light it.
      const glowGrad = options.game === 'hop' ? hueCache.sectorGlows[Math.min(level - 1, 3)] : hueCache.glow;
      ctx.globalAlpha = (reduced ? .8 : .72 + Math.sin(visualTime * .55) * .12) * (1 + glow * .9 + kick * .8);
      ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      const driftA = reduced ? 0 : Math.sin(visualTime * .13) * 5, driftB = reduced ? 0 : Math.cos(visualTime * .11) * 5;
      const parA = options.game === 'hop' ? camera * .02 : 0, parB = options.game === 'hop' ? camera * .05 : 0;
      ctx.globalAlpha = options.game === 'dash' && combo >= 35 ? .11 : options.game === 'hop' && flightBoost > 0 ? .12 : .07;
      ctx.drawImage(hueCache.nebulaA, W * .12 + driftA - parA, H * .1 - driftB);
      ctx.drawImage(hueCache.nebulaB, W * .62 + driftB - parB, H * .55 + driftA);
      ctx.globalAlpha = 1;
      // Three depth layers; each game moves its sky in its own grammar.
      for (let L = 0; L < 3; L++) {
        ctx.save();
        if (options.game === 'breaker') { ctx.translate(W / 2, H / 2); if (!reduced) ctx.rotate(visualTime * [.0016, .004, .009][L] * (slowTime > 0 ? .35 : 1)); ctx.translate(-W / 2, -H / 2); }
        for (const s of starLayers[L]) {
          let x = s.x, y = s.y;
          if (options.game === 'hop') x = ((s.x - camera * [.04, .12, .3][L]) % (W + 40) + W + 40) % (W + 40) - 20;
          else if (options.game === 'dash') y = ((s.y + visualTime * [6, 14, 30][L] * (slow > 0 ? .55 : 1) * (surgeUntil > time ? 1.3 : 1)) % (H + 24) + H + 24) % (H + 24) - 12;
          else if (options.game === 'merge' && L === 0 && !reduced) y = (s.y + visualTime * .6) % H;
          const twinkle = reduced ? .5 : Math.sin(visualTime * s.sp + s.p) * .5 + .5;
          if (L === 2) {
            ctx.globalAlpha = .1; ctx.fillStyle = '#f2ecfa'; ctx.beginPath(); ctx.arc(x, y, s.r * 3, 0, TAU); ctx.fill();
            ctx.globalAlpha = .4 + twinkle * .2; star(ctx, x, y, s.r * 2.4, '#f2ecfa', 4, s.p + (reduced ? 0 : visualTime * .15));
          } else {
            ctx.globalAlpha = (L ? .3 : .16) + twinkle * (L ? .15 : .1);
            ctx.fillStyle = L ? '#e5dbee' : '#cfc6de'; ctx.beginPath(); ctx.arc(x, y, s.r, 0, TAU); ctx.fill();
          }
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    function drawMerge() {
      ctx.fillStyle = '#bea7f008'; ctx.fillRect(22, 92, W - 44, H - 119);
      // The jar is a place: glass depth, a shine on the walls, an ember pool.
      ctx.fillStyle = hueCache.jarShade; ctx.fillRect(22, 92, W - 44, H - 119);
      ctx.globalAlpha = .10 + glow * .25 + pileT * .12;
      ctx.drawImage(hueCache.floorGlow, W / 2 - 90, H - 46); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff0d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(26, 104); ctx.lineTo(26, H - 32); ctx.stroke();
      ctx.strokeStyle = '#ffffff08'; ctx.beginPath(); ctx.moveTo(W - 26, 104); ctx.lineTo(W - 26, H - 32); ctx.stroke();
      ctx.strokeStyle = '#b4a0d84d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(21, 100); ctx.lineTo(21, H - 26); ctx.quadraticCurveTo(21, H - 20, 29, H - 20); ctx.lineTo(W - 29, H - 20); ctx.quadraticCurveTo(W - 21, H - 20, W - 21, H - 28); ctx.lineTo(W - 21, 100); ctx.stroke();
      // A hot chain warms the glass itself.
      if (combo >= 2) { ctx.globalAlpha = Math.min(.16, combo * .03); ctx.strokeStyle = '#edf19b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(21, 100); ctx.lineTo(21, H - 26); ctx.quadraticCurveTo(21, H - 20, 29, H - 20); ctx.lineTo(W - 29, H - 20); ctx.quadraticCurveTo(W - 21, H - 20, W - 21, H - 28); ctx.lineTo(W - 21, 100); ctx.stroke(); ctx.globalAlpha = 1; }
      const dread = clamp(danger / dangerLimit(), 0, 1);
      // The pile casts its own shadow of dread, even before the meter ticks.
      ctx.strokeStyle = danger > .2 ? '#ff929a' : '#b7a2d644'; ctx.lineWidth = 1; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(24, 92); ctx.lineTo(W - 24, 92); ctx.stroke(); ctx.setLineDash([]);
      if (danger > .2) {
        const t = Math.min(1, danger / dangerLimit());
        text('ROOM IS GETTING COSY', W / 2, 115, 10, '#ffacb4'); ctx.fillStyle = '#f58e9b'; ctx.fillRect(24, 88, (W - 48) * t, 3);
        ctx.strokeStyle = '#f58e9b'; ctx.globalAlpha = .10 + t * .15; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(24, 92); ctx.lineTo(W - 24, 92); ctx.stroke(); ctx.globalAlpha = 1;
        if (t > .55) { ctx.globalAlpha = (t - .55) * (reduced ? .7 : .5 + .5 * Math.sin(visualTime * (3 + t * 5))); ctx.drawImage(hueCache.dread, 0, 0); ctx.globalAlpha = 1; }
      }
      if (has('binary-heart')) for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        if (a.tier !== b.tier) continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y), reach = radii[a.tier] * 2 + (has('guiding-thread') ? 140 : 65);
        if (d > radii[a.tier] * 2 && d < reach) { ctx.globalAlpha = .12 + (1 - d / reach) * .22; ctx.strokeStyle = '#edf19b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 1; }
      }
      if (has('guiding-thread') && guidedBall && balls.includes(guidedBall) && guidedBall.age < 1.1) { ctx.strokeStyle = '#edf19b88'; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(aim, 52); ctx.lineTo(guidedBall.x, guidedBall.y); ctx.stroke(); ctx.setLineDash([]); }
      if (phase !== 'over' && phase !== 'ending') {
        const r = radii[queue[0]], x = clamp(aim, r + 24, W - r - 24);
        let landing = H - 27 - r;
        for (const b of balls) { const dx = Math.abs(x - b.x), sum = r + radii[b.tier]; if (dx < sum) landing = Math.min(landing, b.y - Math.sqrt(sum * sum - dx * dx)); }
        ctx.strokeStyle = '#e8d0b633'; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(x, 50 + r); ctx.lineTo(x, landing); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#e8d0b622'; ctx.setLineDash([4, 7]); ctx.beginPath(); ctx.arc(x, Math.max(50, landing), r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = .13; orb(ctx, x, Math.max(50, landing), r, queue[0]); ctx.globalAlpha = 1;
        // The preview reloads: squash while the cooldown drains.
        const ready = 1 - clamp(cooldown / .32, 0, 1);
        orb(ctx, x, 45 + Math.sin(visualTime * 3) * 2, r, queue[0], true, 0, reduced ? 1 : .84 + ready * .16, visualTime); ctx.globalAlpha = 1;
      }
      let topY = H;
      for (const b of balls) {
        topY = Math.min(topY, b.y - radii[b.tier]);
        const growth = b.born > 0 ? 1 + Math.sin(b.born / .32 * Math.PI) * .12 : 1;
        orb(ctx, b.x, b.y, radii[b.tier] * growth, b.tier, true, b.angle, 1 + (reduced ? 0 : b.squash), visualTime);
        if (b.born > 0) { ctx.globalAlpha = b.born / .32; star(ctx, b.x + radii[b.tier] * .28, b.y - radii[b.tier] * .3, radii[b.tier] * .16, '#fff7de', 4, reduced ? 0 : visualTime * 4); ctx.globalAlpha = 1; }
        // Planets at the rim look alarmed; the rest keep smiling.
        if (b.y - radii[b.tier] < 100 && b.age > 2.2) {
          const r = radii[b.tier];
          ctx.strokeStyle = '#18212d'; ctx.lineWidth = Math.max(1.2, r * .04);
          ctx.beginPath(); ctx.moveTo(b.x - r * .3, b.y - r * .12); ctx.lineTo(b.x - r * .16, b.y - r * .2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(b.x + r * .3, b.y - r * .12); ctx.lineTo(b.x + r * .16, b.y - r * .2); ctx.stroke();
        }
      }
      pileT = clamp((H - 92 - topY) / (H - 120), 0, 1);
      if (combo > 1) text(`${combo}× CHAIN REACTION`, W / 2, H - 6, 11, '#edf19b');
      // The chain window, made visible: watch it drain and plan the next merge.
      if (combo > 0 && comboTimer > 0) {
        ctx.fillStyle = '#edf19b2e'; ctx.fillRect(W / 2 - 60, 30, 120, 4);
        ctx.fillStyle = comboTimer < .3 ? '#f5a08c' : '#edf19b'; ctx.fillRect(W / 2 - 60, 30, 120 * clamp(comboTimer / (has('echo-hourglass') ? 2.4 + (has('quake-core') && combo > 1 ? .6 : 0) : .85), 0, 1), 4);
        text(`${combo}× CHAIN`, W / 2, 24, 9, '#edf19b');
      }
    }
    function drawSurf() {
      // A low sea of dusk the ship skims; sectors shift the whole sky.
      ctx.fillStyle = hueCache.horizon; ctx.fillRect(0, H * .62, W, H * .38);
      // The sector gate: you see the border coming before you cross it.
      const gateX = level * 2400 - camera;
      if (gateX > -20 && gateX < W + 20) {
        ctx.strokeStyle = '#edf19b'; ctx.globalAlpha = reduced ? .3 : .18 + Math.sin(visualTime * 4) * .1;
        ctx.setLineDash([8, 14]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gateX, 0); ctx.lineTo(gateX, H); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        text('NEXT SECTOR', gateX, 24, 9, '#edf19b');
      }
      for (const w of worlds) {
        const x = w.x - camera;
        const fieldRadius = tetherReach();
        ctx.strokeStyle = tether?.planet === w ? '#edf19b55' : has('longwave-tether') ? '#bba7ed30' : '#bba7ed18'; ctx.lineWidth = 1; ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.arc(x, w.y, tether?.planet === w ? tether.radius : fieldRadius, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        orb(ctx, x, w.y, w.r, w.tier, true, Math.sin(visualTime) * .08, 1, visualTime);
      }
      for (const r of rings) {
        if (r.taken) continue;
        ctx.strokeStyle = '#edf19b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(r.x - camera, r.y, 21 + Math.sin(visualTime * 3) * 2, 32, -.3, 0, TAU); ctx.stroke();
        star(ctx, r.x - camera, r.y, 7, '#edf19b');
      }
      for (const r of rocks) { orb(ctx, r.x - camera, r.y, r.r, 3, false, visualTime * .2); ctx.strokeStyle = '#ff919a55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(r.x - camera, r.y, r.r + 7, 0, TAU); ctx.stroke(); }
      trail(ship.trail, flightBoost > 0 ? '#edf19b' : '#f5ba9c', camera, flightBoost > 0 ? 19 : 15);
      if (tether) {
        ctx.globalAlpha = .12; ctx.strokeStyle = '#f0f3a0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(tether.planet.x - camera, tether.planet.y); ctx.lineTo(ship.x - camera, ship.y); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#f0f3a099'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tether.planet.x - camera, tether.planet.y); ctx.lineTo(ship.x - camera, ship.y); ctx.stroke();
      }
      // The re-entry burn: the ship fades out of its own story.
      const reentry = phase === 'ending' ? Math.max(.12, finishDelay / 1.3) : 1;
      ctx.globalAlpha = (invulnerable > 0 && Math.sin(visualTime * 30) > 0 ? .35 : 1) * reentry;
      if (shields > 0) { ctx.strokeStyle = '#9ed7c6aa'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(ship.x - camera, ship.y, 22 + Math.sin(visualTime * 5) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      ctx.save(); ctx.translate(ship.x - camera, ship.y); ctx.rotate(Math.atan2(ship.vy, ship.vx));
      // Engine ember: a two-frame flicker at the tail while flying free.
      if (!tether) {
        const f = reduced ? 8 : 6 + Math.hypot(ship.vx, ship.vy) / 45;
        ctx.fillStyle = reduced ? '#f5ba9c' : (Math.sin(visualTime * 42) > 0 ? '#f5ba9c' : '#edf19b');
        ctx.globalAlpha *= .85; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-16 - f, 0); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill(); ctx.globalAlpha /= .85;
      }
      ctx.fillStyle = '#f7ecce'; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-11, -10); ctx.lineTo(-6, 0); ctx.lineTo(-11, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#eea88c'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= .8; ctx.beginPath(); ctx.arc(6, -2, 1.5, 0, TAU); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      // Winding up: counter-rotating rings tighten around a charging ship.
      if (tether && has('solar-spool') && orbitCharge > 0) {
        ctx.strokeStyle = '#edf19b'; ctx.globalAlpha = .25 + orbitCharge * .4; ctx.setLineDash([6, 8]);
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ship.x - camera, ship.y, 30 - orbitCharge * 10, reduced ? 0 : visualTime * 3, (reduced ? 0 : visualTime * 3) + 4.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(ship.x - camera, ship.y, 30 - orbitCharge * 10, reduced ? 2 : -visualTime * 2.2, (reduced ? 2 : -visualTime * 2.2) + 4.5); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      // Speed lines when the flight gets properly fast.
      if (!tether && !reduced && Math.hypot(ship.vx, ship.vy) > 420) {
        const sa = Math.atan2(ship.vy, ship.vx);
        ctx.strokeStyle = '#f7ecce55'; ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(ship.x - camera - Math.cos(sa + i * .16) * 26, ship.y - Math.sin(sa + i * .16) * 26); ctx.lineTo(ship.x - camera - Math.cos(sa + i * .16) * 62, ship.y - Math.sin(sa + i * .16) * 62); ctx.stroke(); }
      }
      if (has('solar-spool') && tether) { ctx.fillStyle = '#edf19b33'; ctx.fillRect(W / 2 - 52, 42, 104, 4); ctx.fillStyle = '#edf19b'; ctx.fillRect(W / 2 - 52, 42, 104 * orbitCharge, 4); text(orbitCharge >= 1 ? 'SLINGSHOT CHARGED' : 'HOLD TO CHARGE', W / 2, 58, 9, '#edf19b'); }
      text(tether ? 'RELEASE TO SLINGSHOT' : 'HOLD NEAR A PLANET TO ORBIT', W / 2, 32, 11, tether ? '#edf19b' : '#cabbd8');
      text(`${Math.floor(ship.x / 10)} METRES`, W - 28, H - 25, 11, '#cfc1dc', 'right');
      if (tether) { const dx = ship.vx / 290, dy = ship.vy / 290; ctx.strokeStyle = '#edf19b66'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(ship.x - camera + dx * 20, ship.y + dy * 20); ctx.lineTo(ship.x - camera + dx * 95, ship.y + dy * 95); ctx.stroke(); ctx.setLineDash([]); }
    }
    function drawDash() {
      // A moonlit sea under the shower; surge waves turn the frame gold.
      const seaT = clamp((15 - remaining) / 15, 0, 1) * .5;
      for (const [rx, ry, alpha] of [[.5, 120, .12], [.68, 150, .07], [.86, 185, .04]]) {
        ctx.globalAlpha = alpha; ctx.strokeStyle = '#9ed7c6'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(W / 2, H + 120, W * rx, ry, 0, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = .10 + glow * .2 + kick * .3;
      ctx.drawImage(hueCache.seaGlow, W / 2 - 160, H - 78);
      if (seaT > 0) { ctx.globalAlpha = seaT; ctx.drawImage(hueCache.seaGlowWarm, W / 2 - 160, H - 78); }
      ctx.globalAlpha = 1;
      if (surgeUntil > time) { ctx.fillStyle = '#edf19b'; ctx.globalAlpha = .035; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      // Each act tints the sky; the last fifteen seconds warm toward dawn.
      const actTints = ['#396368', '#3d4a7a', '#67426c', '#8c4a5e', '#8c753d'];
      ctx.globalAlpha = .05 + seaT * .12; ctx.fillStyle = actTints[Math.min(dashAct - 1, 4)]; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      if (slow > 0 && hueCache.motes) {
        ctx.fillStyle = '#d8f4ec';
        for (const m of hueCache.motes) { ctx.globalAlpha = .1; ctx.beginPath(); ctx.arc(m.x * W, (m.y * H + (reduced ? 0 : visualTime * 8 * m.d)) % H, 1.2, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      for (const f of falling) {
        if (f.wait > 0) { if (f.bad) { text('⌄', f.x, 20, 25, '#ff9aa4'); ctx.fillStyle = '#f58e9b10'; ctx.fillRect(f.x - 22, 30, 44, H - 100); } continue; }
        if (f.bad) { ctx.strokeStyle = '#f58e9b30'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(f.x + 8, f.y - 35); ctx.lineTo(f.x, f.y); ctx.stroke(); orb(ctx, f.x, f.y, f.r, 3, false, f.spin); }
        else if (f.kind === 'pickup') {
          const def = powerUps.dash.find(p => p.id === f.pickupId);
          if (def) {
            // A soft beacon column telegraphs the gift for its whole fall.
            ctx.fillStyle = def.colour + '12'; ctx.fillRect(f.x - 14, 0, 28, Math.max(0, f.y - 20));
            ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(reduced ? 0 : f.spin * .8);
            ctx.fillStyle = def.colour; ctx.beginPath();
            for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i / 6 * TAU + .5) * 17, Math.sin(i / 6 * TAU + .5) * 17);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#f4ecd2'; ctx.lineWidth = 2; ctx.stroke();
            ctx.rotate(reduced ? 0 : -f.spin * .8);
            ctx.fillStyle = '#152029'; ctx.font = '19px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(def.glyph, 0, 1); ctx.textBaseline = 'alphabetic';
            ctx.restore();
          }
        }
        else if (f.kind === 'jelly') { ctx.fillStyle = '#bba7ed'; ctx.beginPath(); ctx.arc(f.x, f.y, 17, Math.PI, TAU); ctx.lineTo(f.x + 17, f.y + 6); ctx.quadraticCurveTo(f.x, f.y - 4, f.x - 17, f.y + 6); ctx.fill(); for (let i = -1; i <= 1; i++) { ctx.strokeStyle = '#bba7ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x + i * 10, f.y + 3); ctx.quadraticCurveTo(f.x + i * 10 + Math.sin(visualTime * 5) * 7, f.y + 18, f.x + i * 10, f.y + 25); ctx.stroke(); } }
        else { ctx.globalAlpha = .15; star(ctx, f.x, f.y, f.r * 1.8, '#edf19b', 4, f.spin); ctx.globalAlpha = 1; star(ctx, f.x, f.y, f.r, '#edf19b', 4, f.spin); }
      }
      const reach = magnetReach();
      if (reach) { ctx.strokeStyle = has('lodestone') ? '#bba7ed77' : '#bba7ed55'; ctx.setLineDash([5, 8]); ctx.beginPath(); ctx.arc(catcher.x, H - 72, reach + Math.sin(visualTime * 3) * 5, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (slow > 0) { ctx.fillStyle = 'rgba(158,215,198,.055)'; ctx.fillRect(0, 0, W, H); }
      // Active power-up chip: canvas-first so it is visible even when the DOM
      // build panel is scrolled away on a phone.
      if (activePower) {
        const px = 22, py = 14, pw = 136;
        ctx.globalAlpha = .92; ctx.fillStyle = '#101c22e6'; ctx.fillRect(px, py, pw, 30); ctx.globalAlpha = 1;
        ctx.strokeStyle = activePower.colour + '88'; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, pw - 1, 29);
        ctx.fillStyle = activePower.colour; ctx.font = '15px "Cormorant Garamond", serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(activePower.glyph, px + 9, py + 16); ctx.textBaseline = 'alphabetic';
        text(activePower.name.toUpperCase(), px + 30, py + 12, 9, '#e8dfc8', 'left');
        text(`${Math.ceil(activePower.remaining)}s`, px + pw - 8, py + 12, 10, activePower.colour, 'right');
        ctx.fillStyle = activePower.colour + '33'; ctx.fillRect(px + 30, py + 21, pw - 70, 3);
        ctx.fillStyle = activePower.colour; ctx.fillRect(px + 30, py + 21, (pw - 70) * clamp(activePower.remaining / activePower.duration, 0, 1), 3);
      }
      for (const echo of echoes) {
        ctx.globalAlpha = Math.min(.5, echo.life / 1.8); ctx.strokeStyle = '#9ed7c6'; ctx.lineWidth = 2; ctx.setLineDash([4, 7]); ctx.beginPath(); ctx.ellipse(echo.x, H - 72, basketWidth(), 13, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      // A streak on fire: the boat glows gold once the run gets going.
      if (combo >= 10) {
        ctx.globalAlpha = Math.min(.55, (combo - 8) / 30) * (reduced ? .8 : .7 + Math.sin(visualTime * 9) * .3);
        ctx.fillStyle = '#edf19b'; ctx.beginPath(); ctx.ellipse(catcher.x, H - 56, basketWidth() * .9, 15, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.translate(catcher.x, H - 72 + (reduced || Math.abs(catcher.vx) > 60 ? 0 : Math.sin(visualTime * 2.3) * 1.6)); ctx.rotate(catcher.tilt);
      ctx.globalAlpha = invulnerable > 0 && Math.sin(visualTime * 30) > 0 ? .4 : 1;
      if (dashTime > 0) {
        ctx.fillStyle = '#9ed7c644'; ctx.beginPath(); ctx.ellipse(-lastDirection * 45, 5, 70, 14, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha *= .5; ctx.beginPath(); ctx.ellipse(-lastDirection * 70, 5, 100, 16, 0, 0, TAU); ctx.fill(); ctx.globalAlpha /= .5;
      }
      const bowlScale = basketWidth() / 39;
      const pop = reduced ? (catcher.pop || 0) * .4 : (catcher.pop || 0);
      ctx.save(); ctx.scale(bowlScale * (1 + pop), 1 - pop * .45);
      ctx.fillStyle = '#99dbc4'; ctx.beginPath(); ctx.moveTo(-39, -2); ctx.quadraticCurveTo(0, 62, 39, -2); ctx.quadraticCurveTo(0, 17, -39, -2); ctx.fill();
      ctx.strokeStyle = '#f1e4b3'; ctx.lineWidth = 3 / bowlScale; ctx.beginPath(); ctx.ellipse(0, -2, 39, 9, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#27233a'; ctx.fillRect(-10, 14, 3, 5); ctx.fillRect(8, 14, 3, 5);
      // The boat is pleased with a good streak.
      if (combo >= 5) {
        ctx.strokeStyle = '#27233a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(-9, 2, 3, Math.PI, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(9, 2, 3, Math.PI, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 6, 3.4, .3, Math.PI - .3); ctx.stroke();
        if (combo >= 20) { ctx.fillStyle = '#f1ad9b66'; ctx.beginPath(); ctx.ellipse(-14, 5, 3, 1.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(14, 5, 3, 1.5, 0, 0, TAU); ctx.fill(); }
      }
      for (let i = 0; i < shields; i++) { ctx.strokeStyle = '#9ed7c6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-18 + i * 18, -23, 6 + Math.sin(visualTime * 4) * 1, 0, TAU); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
      // Bow spray when the boat tears across the sea.
      sprayT -= 1 / 60;
      if (!reduced && Math.abs(catcher.vx) > 420 && sprayT <= 0) { sprayT = .12; burst(catcher.x + Math.sign(catcher.vx) * basketWidth() * .8, H - 66, '#9ed7c6', 3, 45); }
      text(`${Math.ceil(remaining)}s`, W - 27, 35, 22, remaining <= 10 ? '#edf19b' : '#eee7d4', 'right');
      text(combo > 0 ? `${combo} STREAK · ×${Math.min(8, 1 + Math.floor(combo / 5))}` : 'GOLD IS GOOD. PINK IS TROUBLE.', W / 2, 30, 11, combo > 0 ? '#edf19b' : '#b7abc9');
      ctx.fillStyle = '#9ed7c622'; ctx.fillRect(25, H - 20, W - 50, 3);
      if (remaining <= 10) { ctx.globalAlpha = reduced ? .8 : .5 + .4 * Math.sin(visualTime * 8); ctx.fillStyle = '#edf19b'; }
      else ctx.fillStyle = '#9ed7c6';
      ctx.fillRect(25, H - 20, (W - 50) * remaining / 75, 3); ctx.globalAlpha = 1;
      // The boat carries a lantern-pool of light.
      ctx.globalAlpha = .22 + glow * .3;
      ctx.drawImage(hueCache.poolGlow, catcher.x - 70, H - 88); ctx.globalAlpha = 1;
    }
    function drawBreaker() {
      // The arena is an orrery: visible tracks, a beating heart at the centre.
      const alive = bricks.reduce((n, b) => n + (b.hp > 0 ? 1 : 0), 0);
      const critical = alive > 0 && alive <= bricks.length / 4;
      ctx.strokeStyle = '#b9a5dc'; ctx.globalAlpha = critical ? .13 : .05; ctx.setLineDash([2, 10]);
      for (const r of [62, 111, 157]) { ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.globalAlpha = .09 + glow * .25 + (reduced ? 0 : Math.sin(visualTime * (critical ? 2.8 : 1.4)) * .03);
      ctx.drawImage(hueCache.cores[Math.min(level - 1, 3)], W / 2 - 75, H / 2 - 75);
      ctx.globalAlpha = .5; star(ctx, W / 2, H / 2, 9, '#dfe8f5', 4, reduced ? 0 : visualTime * .2); ctx.globalAlpha = 1;
      // The old constellation lingers as a ghost for a breath after clearing.
      if (!reduced) for (const g of ghosts) {
        const a = 1 - (visualTime - g.at) / 1.5;
        if (a <= 0) continue;
        ctx.globalAlpha = a * .25; ctx.fillStyle = colours[g.tier];
        ctx.beginPath();
        for (let i = 0; i < 6; i++) ctx.lineTo(g.x + Math.cos(i / 6 * TAU) * g.r, g.y + Math.sin(i / 6 * TAU) * g.r);
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = '#b9a5dc35'; ctx.lineWidth = 1; ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.arc(W / 2, H / 2, 238, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (ward) { ctx.strokeStyle = '#9ed7c688'; ctx.lineWidth = 2; ctx.setLineDash([8, 10]); ctx.beginPath(); ctx.arc(W / 2, H / 2, 256, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (slowTime > 0) { ctx.fillStyle = 'rgba(166,217,236,.05)'; ctx.fillRect(0, 0, W, H); }
      // The paddle braces inward and flashes on every return.
      const pk = paddle.kick || 0;
      ctx.lineCap = 'round'; ctx.strokeStyle = pk > .5 ? '#eaf6f4' : slowTime > 0 ? '#edf19b' : '#9ed7dc';
      const half = paddleHalf();
      ctx.globalAlpha = .07; ctx.lineWidth = 20; ctx.beginPath(); ctx.arc(W / 2, H / 2, 235 - pk * 5, paddle.angle - half, paddle.angle + half); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.lineWidth = 10 + pk * 4 + (slowTime > 0 ? 2 : 0);
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 235 - pk * 5, paddle.angle - half, paddle.angle + half); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      for (const end of [-1, 1]) { ctx.beginPath(); ctx.arc(W / 2 + Math.cos(paddle.angle + end * half) * (235 - pk * 5), H / 2 + Math.sin(paddle.angle + end * half) * (235 - pk * 5), 3.5, 0, TAU); ctx.fill(); }
      if (has('crescent-crown') && has('chrono-coil') && slowTime > 0) { ctx.strokeStyle = '#edf19baa'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 235, paddle.angle + Math.PI - half, paddle.angle + Math.PI + half); ctx.stroke(); }
      ctx.globalAlpha = phase === 'ending' ? .45 : 1;
      for (const b of bricks) {
        if (!b.hp) continue;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle + .4);
        const popScale = 1 + (b.hit / .2) * (reduced ? .14 : .28);
        ctx.scale(popScale, popScale);
        ctx.fillStyle = b.hit > 0 ? '#fff4d4' : colours[b.tier]; ctx.beginPath();
        for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i / 6 * TAU) * b.r, Math.sin(i / 6 * TAU) * b.r);
        ctx.closePath(); ctx.fill();
        if (b.hp > 1) {
          ctx.globalAlpha = reduced ? .45 : .3 + Math.sin(visualTime * 2.5 + b.angle) * .15;
          ctx.strokeStyle = '#271c46'; ctx.lineWidth = 2; ctx.strokeRect(-5, -5, 10, 10); ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      for (const c of comets) {
        trail(c.trail, c.secondary ? '#9ed7c6' : slowTime > 0 ? '#edf19b' : '#fac7a5', 0, c.secondary ? 8 : 10);
        // Comets are light sources, not dots.
        const glowSprite = c.secondary ? hueCache.cometGlowMint : slowTime > 0 ? hueCache.cometGlowGold : hueCache.cometGlow;
        const s = cometRadius() * (has('dense-core') ? 5 : 4) * (launchTimer > 0 && phase === 'running' && !reduced ? 1 + Math.sin(visualTime * 10) * .12 : 1);
        ctx.globalAlpha = .5; ctx.drawImage(glowSprite, c.x - s / 2, c.y - s / 2, s, s); ctx.globalAlpha = 1;
        ctx.fillStyle = c.secondary ? '#d2fff0' : '#fff0cb'; ctx.beginPath(); ctx.arc(c.x, c.y, cometRadius(), 0, TAU); ctx.fill();
        if (c.secondary) { ctx.strokeStyle = '#9ed7c677'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, cometRadius() + 5, 0, TAU); ctx.stroke(); }
      }
      if (launchTimer > 0 && phase === 'running') text('GET READY', W / 2, H / 2, 14, '#edf19b');
      text(`WAVE ${String(level).padStart(2, '0')}`, 28, 34, 13, '#bba7ed', 'left');
      text(slowTime > 0 ? 'SLOW ORBIT ACTIVE' : 'KEEP IT IN ORBIT', W - 28, H - 28, 11, '#bba7ed', 'right');
      if (combo > 1) text(`${Math.min(8, combo)}×`, 45, H / 2, 27, '#edf19b');
    }
    function draw() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); background(); ctx.save();
      // The camera leans into big moments; the ending dims and pushes in.
      if (!reduced && zoom > 1.001) {
        ctx.translate(W / 2, H * .58); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H * .58);
      }
      if (!reduced && shake > .1) ctx.translate(Math.sin(visualTime * 87) * shake, Math.cos(visualTime * 71) * shake * .6);
      if (options.game === 'merge') drawMerge(); else if (options.game === 'hop') drawSurf(); else if (options.game === 'dash') drawDash(); else drawBreaker();
      for (const f of fields) {
        const alpha = Math.max(0, f.life / f.max);
        ctx.globalAlpha = alpha * .7;
        if (f.toX !== undefined) { ctx.strokeStyle = f.colour; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.toX, f.toY); ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.strokeStyle = f.colour; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * (1 + (1 - alpha) * .22), 0, TAU); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      for (const r of ripples) { ctx.globalAlpha = r.life * .6; ctx.strokeStyle = r.colour; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, TAU); ctx.stroke(); }
      for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 2); star(ctx, p.x, p.y, p.size, p.colour, 4, p.angle); }
      // Popups overshoot to 138% and settle — every reward reads richer.
      for (const p of popups) {
        const max = p.max || p.life, t = 1 - p.life / max, s = reduced ? 1 : 1 + .38 * Math.max(0, 1 - t * 4.5);
        ctx.globalAlpha = Math.min(1, p.life / max * 3.2);
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s); text(p.text, 0, 0, p.size || 15, p.colour); ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.restore();
      // The baked vignette: focus at rest, pressure when things go wrong.
      const intensity = options.game === 'merge' ? Math.max(pileT * .5, clamp(danger / dangerLimit(), 0, 1))
        : options.game === 'hop' ? Math.min(.7, Math.max(0, (Math.hypot(ship.vx, ship.vy) - 320) / 500)) + (lives === 1 ? .3 : 0)
        : options.game === 'dash' ? clamp((15 - remaining) / 15, 0, 1) * .6 + (combo >= 10 ? .2 : 0)
        : (3 - lives) * .15;
      ctx.globalAlpha = .55 + Math.min(1, intensity) * .45; ctx.drawImage(hueCache.vignette, 0, 0); ctx.globalAlpha = 1;
      if (lives === 1 && !reduced && phase === 'running') { ctx.fillStyle = `rgba(245,142,155,${.05 + Math.sin(visualTime * 4) * .03})`; ctx.fillRect(0, 0, W, H); }
      if (phase === 'ending' && finishTotal > 0) {
        const t = 1 - finishDelay / finishTotal;
        ctx.fillStyle = `rgba(13,18,26,${.3 * t})`; ctx.fillRect(0, 0, W, H);
      }
      if (options.game !== 'merge') {
        for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < lives ? 1 : .15; star(ctx, 28 + i * 23, options.game === 'breaker' ? 64 : H - 30, 8, '#f5a08c', 5); } ctx.globalAlpha = 1;
      }
      if (flash > 0 && !reduced) { ctx.fillStyle = `rgba(${flashTint},${flash * .6})`; ctx.fillRect(0, 0, W, H); }
    }
    let idleDraw = 0;
    function tick(now) {
      if (destroyed) return;
      const elapsed = last ? Math.min(.08, (now - last) / 1000) : 0; last = now;
      // Behind the opaque overlay there is nothing new to see; idle at a gentle
      // 8 fps. A suspended run (relic draft open) is covered by a modal too, so
      // full-rate redraws there would only feed the backdrop blur.
      if (phase === 'paused' || phase === 'ready' || phase === 'over' || suspended) {
        idleDraw += elapsed;
        if (idleDraw >= .12) { idleDraw = 0; draw(); }
        frame = requestAnimationFrame(tick); return;
      }
      if (phase === 'running') {
        // Hit-stop starves the accumulator; nothing catches up afterwards.
        if (timeKick > 0) timeKick -= elapsed;
        else {
          const easeTarget = reduced ? 1 : options.game === 'merge' && danger / dangerLimit() > .85 ? .85 : 1;
          timeScale += (easeTarget - timeScale) * (1 - Math.exp(-5 * elapsed));
        }
        accumulator += elapsed * timeScale;
        while (accumulator >= 1 / 120 && phase === 'running') { step(1 / 120); accumulator -= 1 / 120; }
        notifyTimer += elapsed;
        if (notifyTimer > .1) { notifyTimer = 0; notify(); }
        musicStep();
      }
      if (phase !== 'paused') effectsStep(elapsed * Math.max(timeScale, .12), elapsed);
      draw(); frame = requestAnimationFrame(tick);
    }
    function pointer(event) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * W, y = (event.clientY - rect.top) / rect.height * H;
      if (Math.abs(x - aim) > 2) lastDirection = x > aim ? 1 : -1;
      aim = clamp(x, 20, W - 20); pointerAim = aim;
      if (options.game === 'breaker') paddle.target = Math.atan2(y - H / 2, x - W / 2);
    }
    listen(canvas, 'pointerdown', event => {
      if (pointerId !== null) return;
      event.preventDefault(); pointerId = event.pointerId; pointerHeld = true; pointer(event);
      canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
      // A drop is armed by pressing into a live playfield — never by dismissing an overlay.
      dropArmed = phase === 'running';
      if (phase === 'ready' || phase === 'over' || phase === 'paused') action();
    });
    listen(canvas, 'pointermove', event => { if (event.pointerId === pointerId || (event.pointerType === 'mouse' && pointerId === null)) pointer(event); });
    listen(canvas, 'contextmenu', e => e.preventDefault());
    listen(canvas, 'pointerup', event => {
      if (event.pointerId !== pointerId) return;
      pointer(event); pointerHeld = false; pointerId = null;
      if (options.game === 'merge' && dropArmed) action();
      dropArmed = false;
    });
    const cancelPointer = e => { if (e.pointerId === pointerId) { pointerHeld = false; pointerId = null; dropArmed = false; } };
    listen(canvas, 'pointercancel', cancelPointer); listen(canvas, 'lostpointercapture', cancelPointer);
    listen(canvas, 'keydown', event => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (![' ', 'Enter', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'a', 'd', 'p', 'Escape', 'x'].includes(key)) return;
      event.preventDefault();
      if (['p', 'Escape'].includes(key)) { if (event.repeat || key === 'Escape' && document.body.classList.contains('game-theatre')) return; phase === 'paused' ? resume() : pause(); return; }
      keys.add(key);
      if (!event.repeat && key === 'x') ability();
      if (!event.repeat && [' ', 'Enter', 'ArrowUp'].includes(key) && (options.game !== 'hop' || phase !== 'running')) action();
    });
    listen(window, 'keyup', e => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
    listen(window, 'blur', pause);
    listen(canvas, 'blur', () => { if (!document.body.classList.contains('game-theatre')) clearInput(); });
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { pause(); audio?.suspend(); cancelAnimationFrame(frame); }
      else { last = 0; cancelAnimationFrame(frame); frame = requestAnimationFrame(tick); }
    });
    reset(); frame = requestAnimationFrame(tick);
    return { start, pause, resume, action, ability, reset,
      applyRelic: id => resolveOffer(id),
      skipRelic: () => resolveOffer(null, true),
      setSound(value) { sound = value; if (!value) audio?.suspend(); },
      destroy() { destroyed = true; cancelAnimationFrame(frame); abort.abort(); audio?.close().catch(() => {}); },
    };
  }
  return { create, orb, names, colours, radii, dimensions, relics, synergies, powerUps };
})();
