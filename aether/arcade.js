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
  const milestones = { merge: [3, 9, 18, 30], hop: [180, 500, 1000, 1600], dash: [5, 20, 36, 55], breaker: [6, 18, 35, 60] };
  const progressLabels = { merge: 'merges', hop: 'metres travelled', dash: 'stars caught', breaker: 'crystal hits' };

  function create(canvas, options) {
    const ctx = canvas.getContext('2d'), [W, H] = dimensions(options.game);
    const abort = new AbortController(), keys = new Set();
    const listen = (el, type, fn) => el.addEventListener(type, fn, { signal: abort.signal });
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motionQuery.matches;
    listen(motionQuery, 'change', e => { reduced = e.matches; });
    const bgRandom = seeded(731);
    const stars = Array.from({ length: 100 }, () => ({ x: bgRandom() * W, y: bgRandom() * H, r: .4 + bgRandom() * 1.4, depth: .3 + bgRandom() }));
    let random, fxRandom, phase, score, time, visualTime = 0, last = 0, accumulator = 0, frame, destroyed = false;
    let particles = [], ripples = [], popups = [], shake = 0, flash = 0, finishDelay = 0, result = '', best = options.best || 0;
    let sound = false, audio, audioGain, lastTone = -1;
    let pointerId = null, pointerHeld = false, aim = W / 2, pointerAim = null, lastDirection = 1;
    let charge, combo, comboTimer, lives, invulnerable, level, totalMerges;
    let balls, queue, cooldown, danger, largest, drops;
    let ship, worlds, rings, rocks, camera, nextWorld, tether, distanceScore;
    let catcher, falling, spawn, remaining, wave, dashTime, magnet;
    let paddle, comets, bricks, launchTimer, slowTime;
    let dropArmed = false, hueCache;
    let notifyTimer = 0;
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
    const paddleHalf = () => (slowTime > 0 ? .68 : .43) + (has('crescent-crown') ? .2 : 0);
    const tetherReach = () => (options.relaxed ? 270 : 235) + (has('longwave-tether') ? 80 : 0);
    const ringReach = () => has('ring-compass') ? (has('solar-spool') && flightBoost > 0 ? 340 : 150) : 0;
    const magnetReach = () => magnet > 0 ? (has('lodestone') ? 300 : 260) : has('lodestone') ? 180 : 0;
    const progressValue = () => options.game === 'merge' ? totalMerges : options.game === 'hop' ? Math.floor(maxMetres) : options.game === 'dash' ? totalCatches : crystalHits;
    const stats = () => ({ simulationTime: time, totalMerges, totalCatches, crystalHits, ringsCaught, maxMetres: Math.floor(maxMetres), comets: comets.length, shields, shieldCharge, orbitCharge, ward, draftFallbacks });

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
    function checkOffer() {
      if (phase !== 'running' || suspended || draftIndex >= 4) return;
      // Only simulation time counts. A quiet first run still gets a relic at 12s;
      // later droughts get one after 24s. Drafts never interrupt collision loops.
      const reached = progressValue() >= milestones[options.game][draftIndex];
      const fallbackAfter = draftIndex === 0 ? (options.game === 'dash' ? 8 : 12) : 24;
      if (!reached && time - lastDraftTime < fallbackAfter) return;
      if (!reached) draftFallbacks++;
      const candidates = draftDecks[draftIndex].filter(r => !has(r.id));
      for (const relic of relics[options.game]) if (!has(relic.id) && !candidates.includes(relic)) candidates.push(relic);
      offer = candidates.slice(0, 3);
      if (!offer.length) { draftIndex++; lastDraftTime = time; return; }
      suspended = true; accumulator = 0; clearInput(); notify();
      // onUpdate is authoritative; an optional legacy listener runs afterwards.
      if (suspended) options.onOffer?.(offer.slice());
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
        if (discovered.length) tone(1180, .34, 'sine', .08);
        tone(880, .22);
      }
      draftIndex++; lastDraftTime = time; offer = null; suspended = false;
      accumulator = 0; last = 0; clearInput(); notify();
      // The paused phase deliberately survives a pick made in a blurred window.
      return true;
    }
    function tone(frequency = 440, length = .12, type = 'sine', volume = .09) {
      if (!sound || destroyed) return;
      try {
        audio ||= new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === 'suspended') audio.resume().catch(() => {});
        if (!audioGain) { audioGain = audio.createGain(); audioGain.gain.value = .7; audioGain.connect(audio.destination); }
        if (audio.currentTime - lastTone < .025) return;
        lastTone = audio.currentTime;
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * .7), audio.currentTime + length);
        gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + length);
        oscillator.connect(gain).connect(audioGain); oscillator.start(); oscillator.stop(audio.currentTime + length);
      } catch { /* Sound stays enabled; a muted browser shouldn't unset the preference. */ }
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
    function finish(message) {
      if (phase !== 'running' || suspended) return;
      phase = 'ending'; result = message; finishDelay = .8; clearInput();
      tone(130, .4, 'triangle'); notify();
    }
    function hurt(x, y) {
      if (invulnerable > 0 || phase !== 'running' || suspended) return;
      if (shields > 0) {
        shields--; invulnerable = 1; relicField(x, y, 64, '#9ed7c6'); burst(x, y, '#9ed7c6', 20); tone(620, .2);
        if (options.game === 'dash' && has('lodestone') && has('star-aegis')) { magnet = Math.max(magnet, 3); relicField(x, y, 300); }
        if (options.game === 'hop' && has('ring-reactor') && has('comet-aegis')) { ship.vx = Math.max(ship.vx, 410); ship.vy = clamp(ship.vy, -90, 90); flightBoost = Math.max(flightBoost, 1.2); }
        return;
      }
      lives--; combo = 0; invulnerable = 1.6; shake = 12; flash = .15;
      burst(x, y, '#f58e9b', 28); tone(100, .23, 'sawtooth', .04);
      if (lives <= 0) finish(options.game === 'hop' ? 'A spectacular re-entry.' : 'The cosmos wins this round.');
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
      bricks = [];
      // A daily board should be a daily board: the seed rotates the rings and picks armoured crystals.
      const rotation = random() * TAU;
      [62, 111, 157].forEach((radius, ring) => {
        const count = 6 + ring * 4;
        for (let i = 0; i < count; i++) {
          const a = i / count * TAU + ring * .27 + rotation;
          const armoured = level > 1 && random() < .34;
          bricks.push({ x: W / 2 + Math.cos(a) * radius, y: H / 2 + Math.sin(a) * radius, r: 15, hp: armoured ? 2 : 1, tier: (i + ring * 3 + level) % 8, hit: 0, angle: a });
        }
      });
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
      orbitCharge = 0; flightBoost = 0; reactorRings = 0; clockCatches = 0; splitHits = 0; ward = 0; wardReturns = 0; tetherAwaitingPress = false;
      fields = []; echoes = []; guidedBall = null; lastDirection = 1; finishDelay = 0; visualTime = 0;
      phase = 'ready'; score = 0; time = 0; accumulator = 0; last = 0; result = ''; notifyTimer = 0;
      particles = []; ripples = []; popups = []; shake = 0; flash = 0; clearInput();
      charge = options.game === 'dash' ? 100 : 0; combo = 0; comboTimer = 0; lives = 3; invulnerable = 0; level = 1; totalMerges = 0;
      balls = []; queue = [0, Math.floor(random() * 4), Math.floor(random() * 4)]; cooldown = 0; danger = 0; largest = 0; drops = 0;
      camera = 0; nextWorld = 250; worlds = []; rings = []; rocks = []; tether = null; tetherAwaitingPress = false; distanceScore = 0;
      ship = { x: 80, y: 235, vx: 235, vy: -30, trail: [] };
      while (nextWorld < 1600) newWorld();
      catcher = { x: W / 2, vx: 0, tilt: 0 }; falling = []; spawn = .8; remaining = 75; wave = 0; dashTime = 0; magnet = 0;
      paddle = { angle: Math.PI / 2, target: Math.PI / 2 }; comets = [{ x: W / 2, y: H / 2 + 210, vx: 0, vy: -290, trail: [], secondary: false }]; slowTime = 0;
      makeBricks(); aim = W / 2; pointerAim = null; notify(); draw();
    }
    function start() {
      if (destroyed || suspended || document.hidden) return;
      if (phase === 'over') reset();
      if (phase !== 'ready') return;
      phase = 'running'; last = 0; accumulator = 0;
      if (sound) tone(520, .14);
      notify(); canvas.focus({ preventScroll: true });
    }
    function pause() {
      if (phase !== 'running') return;
      phase = 'paused'; accumulator = 0; clearInput(); notify();
    }
    function resume() {
      if (phase !== 'paused' || document.hidden || destroyed) return;
      phase = 'running'; last = 0; accumulator = 0; clearInput();
      if (sound) audio?.resume().catch(() => {});
      notify(); canvas.focus({ preventScroll: true });
    }
    function ability() {
      if (phase !== 'running' || suspended || charge < 100 || options.game === 'hop') return;
      charge = 0;
      if (options.game === 'merge') {
        balls.forEach(b => { b.vx += aim < W / 2 ? -110 : 110; b.vy -= has('pulse-dynamo') ? 190 : 130; });
        if (has('pulse-dynamo')) { danger *= .5; relicField(W / 2, H - 40, 215, '#9ed7c6'); }
        burst(W / 2, H - 40, '#bba7ed', 30); shake = 6;
      } else if (options.game === 'dash') {
        if (has('afterimage')) { echoes.push({ x: catcher.x, life: 1.8 }); if (echoes.length > 3) echoes.shift(); }
        dashTime = has('ion-cell') ? .28 : .2; invulnerable = Math.max(invulnerable, .5); catcher.vx = lastDirection * 1250;
        burst(catcher.x, H - 72, '#9ed7c6', 22);
      } else {
        slowTime = has('chrono-coil') ? 7 : 5;
        if (has('chrono-coil')) for (const c of comets) {
          const a = Math.atan2(H / 2 - c.y, W / 2 - c.x), speed = Math.max(285, Math.hypot(c.vx, c.vy));
          c.vx = Math.cos(a) * speed; c.vy = Math.sin(a) * speed;
        }
        burst(W / 2, H / 2, '#a6d9ec', 45); relicField(W / 2, H / 2, 235, '#a6d9ec');
      }
      tone(740, .3); notify();
    }
    function action() {
      if (destroyed || suspended) return;
      if (phase === 'ready' || phase === 'over') { start(); return; }
      if (phase === 'paused') { resume(); return; }
      if (phase !== 'running') return;
      if (options.game === 'merge' && cooldown <= 0) {
        const tier = queue.shift(); queue.push(Math.floor(random() * 4));
        // Deliberate aiming supplies momentum; a stationary drop is predictable.
        guidedBall = { x: clamp(aim, radii[tier] + 24, W - radii[tier] - 24), y: 46, vx: clamp(aimVelocity * .28, -125, 125), vy: 30, tier, age: 0, angle: 0, squash: -.12, born: .2 };
        balls.push(guidedBall);
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
      balls.forEach(b => { b.age += dt; b.born = Math.max(0, b.born - dt); b.squash *= Math.exp(-12 * dt); b.vy += 400 * dt; b.vx *= Math.exp(-.38 * dt); b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.vx / radii[b.tier] * dt * .35; });
      for (let pass = 0; pass < 6; pass++) {
        balls.forEach(b => {
          const r = radii[b.tier];
          if (b.x < r + 22) { b.x = r + 22; b.vx = Math.abs(b.vx) * .42; }
          if (b.x > W - r - 22) { b.x = W - r - 22; b.vx = -Math.abs(b.vx) * .42; }
          if (b.y > H - 27 - r) { b.y = H - 27 - r; if (b.vy > 80) { b.squash = Math.min(.23, b.vy / 1700); tone(100 + b.tier * 25, .05, 'triangle', .03); } b.vy = -Math.abs(b.vy) * .3; b.vx *= .97; }
        });
        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const a = balls[i], b = balls[j], ra = radii[a.tier], rb = radii[b.tier];
            let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
            if (d >= ra + rb) continue;
            if (a.tier === b.tier) {
              const tier = a.tier + 1, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
              balls.splice(j, 1); balls.splice(i, 1);
              if (tier < names.length) balls.push({ x, y, vx: (a.vx + b.vx) * .35, vy: -55, tier, age: 0, angle: 0, squash: -.2, born: .32 });
              largest = Math.max(largest, Math.min(10, tier)); totalMerges++; combo++;
              comboTimer = has('echo-hourglass') ? 2.4 + (has('quake-core') && combo > 1 ? .6 : 0) : .85;
              charge = Math.min(100, charge + (has('pulse-dynamo') ? 26 : 16));
              if (has('quake-core')) shocks.push({ x, y, tier, chain: has('echo-hourglass') && combo > 1 });
              scoreAt(2 ** tier * Math.min(combo, 5), x, y - radii[Math.min(tier, 10)], combo > 1 ? `${combo}× CHAIN!` : `+${2 ** tier}`);
              burst(x, y, colours[Math.min(tier, 10)], 16 + tier * 3); shake = Math.max(shake, tier > 4 ? 5 : 2);
              tone(240 + tier * 70 + combo * 20, .18); i--; break;
            }
            if (d < .001) { dx = .01; dy = 1; d = 1; }
            const nx = dx / d, ny = dy / d, overlap = ra + rb - d, wa = rb * rb / (ra * ra + rb * rb), wb = 1 - wa;
            a.x -= nx * overlap * wa; a.y -= ny * overlap * wa; b.x += nx * overlap * wb; b.y += ny * overlap * wb;
             const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (relative < 0) { a.vx += nx * relative * wa * 1.3; a.vy += ny * relative * wa * 1.3; b.vx -= nx * relative * wb * 1.3; b.vy -= ny * relative * wb * 1.3; if (relative < -90) { a.squash = b.squash = Math.min(.2, -relative / 1600); } }
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
      if (danger > dangerLimit() || balls.length > 110) finish('One very full universe.');
    }
    function surfStep(dt) {
      const held = pointerHeld || keys.has(' ') || keys.has('ArrowUp');
      flightBoost = Math.max(0, flightBoost - dt);
      if (held) tetherAwaitingPress = false;
      if (held && !tether) {
        const candidates = worlds.map(w => ({ w, distance: Math.hypot(w.x - ship.x, w.y - ship.y) })).filter(p => p.distance < tetherReach() && p.distance > p.w.r + 15).sort((a, b) => a.distance - b.distance);
        if (candidates.length) {
          const p = candidates[0].w, dx = ship.x - p.x, dy = ship.y - p.y;
          tether = { planet: p, radius: Math.max(p.r + 40, Math.hypot(dx, dy)), angle: Math.atan2(dy, dx), direction: dx * ship.vy - dy * ship.vx >= 0 ? 1 : -1 }; orbitCharge = 0;
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
        orbitCharge = 0;
        burst(ship.x - camera, ship.y, '#f3e69b', 12); tether = null; tone(640, .12);
      }
      if (tether) {
        if (has('solar-spool')) orbitCharge = Math.min(1, orbitCharge + dt / 1.25);
        tether.angle += tether.direction * (270 + level * 6) / tether.radius * dt;
        ship.x = tether.planet.x + Math.cos(tether.angle) * tether.radius; ship.y = tether.planet.y + Math.sin(tether.angle) * tether.radius;
        ship.vx = -Math.sin(tether.angle) * tether.direction * 290; ship.vy = Math.cos(tether.angle) * tether.direction * 290;
      } else {
        if (has('moon-sail')) ship.vy *= Math.exp(-.2 * dt);
        ship.vy += (has('moon-sail') ? 8 : 24) * dt; ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      }
      camera = Math.max(camera, ship.x - 270);
      while (nextWorld < camera + W + 650) newWorld();
      worlds = worlds.filter(w => w.x > camera - 350 || tether?.planet === w);
      for (const w of worlds) if (!tether && Math.hypot(ship.x - w.x, ship.y - w.y) < w.r + 10) {
        const before = lives; hurt(ship.x - camera, ship.y);
        if (lives < before) { ship.vx = 260; ship.vy = ship.y < w.y ? -180 : 180; }
      }
      for (const r of rings) {
        if (phase !== 'running') break;
        const dx = ship.x - r.x, dy = ship.y - r.y, d = Math.hypot(dx, dy);
        if (!r.taken && d > 1 && d < ringReach()) { const pull = Math.min(d, (flightBoost > 0 ? 420 : 240) * dt) / d; r.x += dx * pull; r.y += dy * pull; }
        if (!r.taken && Math.hypot(ship.x - r.x, ship.y - r.y) < 35) {
          r.taken = true; combo++; ringsCaught++;
          if (has('comet-aegis') && shields === 0) {
            shieldCharge++;
            if (shieldCharge >= (has('ring-reactor') ? 2 : 3)) { shields = 1; shieldCharge = 0; relicField(ship.x - camera, ship.y, 38, '#9ed7c6'); }
          }
          if (has('ring-reactor')) { ship.vx = Math.min(560, ship.vx + 40); reactorRings++; if (reactorRings % 4 === 0) { lives = Math.min(3, lives + 1); relicField(ship.x - camera, ship.y, 80, '#9ed7c6'); } }
          if (has('ring-compass') && has('solar-spool') && flightBoost > 0) flightBoost = Math.min(3, flightBoost + .35);
          scoreAt(50 + Math.min(combo, 10) * 10, r.x - camera, r.y - 35, `${combo}× ORBIT`); burst(r.x - camera, r.y, '#edf19b', 28); tone(520 + combo % 8 * 65, .15);
        }
        if (!r.taken && r.x < camera - 30) combo = 0;
      }
      rings = rings.filter(r => r.x > camera - 50);
      for (const r of rocks) {
        const d = Math.hypot(ship.x - r.x, ship.y - r.y);
        if (!tether && d < r.r + 10) hurt(ship.x - camera, ship.y);
        else if (d < r.r + 35 && !r.grazed) { r.grazed = true; scoreAt(35, r.x - camera, r.y - 30, 'CLOSE CALL +35'); }
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
      if (sector > level) { level = sector; scoreAt(150, W / 2, 130, `SECTOR ${level} · +150`); lives = Math.min(3, lives + 1); }
      ship.trail.push({ x: ship.x, y: ship.y }); if (ship.trail.length > (reduced ? 4 : 38)) ship.trail.shift();
    }
    function spawnWave() {
      wave++; const base = 75 + random() * (W - 150), pattern = wave % 4;
      for (let i = 0; i < 5; i++) {
        const x = pattern === 0 ? 90 + i * 180 : clamp(base + (i - 2) * (pattern === 1 ? 74 : 125), 35, W - 35);
        const bad = pattern === 2 ? i === 0 || i === 4 : i === wave % 5;
        falling.push({ x, y: -30 - (pattern === 1 ? i * 35 : 0), speed: 155 + time * 2.4 + i * 6, bad, kind: !bad && i === 2 && wave % 7 === 0 ? 'jelly' : 'star', r: bad ? 18 : 12, wait: bad ? .55 : .1, spin: i, taken: false });
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
      burst(f.x, f.y, def.colour, 26); relicField(catcher.x, H - 72, 90, def.colour); tone(560, .12); tone(840, .22);
      notify();
    }
    function dashStep(dt) {
      const wasDashing = dashTime > 0;
      remaining = Math.max(0, remaining - dt); dashTime -= dt; magnet -= dt; slow = Math.max(0, slow - dt); spawn -= dt; charge = Math.min(100, charge + dt * (has('ion-cell') ? 13 : 8));
      if (activePower) {
        activePower.remaining -= dt;
        if (activePower.remaining <= 2 && !activePower.warned) { activePower.warned = true; popups.push({ x: W / 2, y: H * .42, text: 'THE MAGIC FADES', colour: activePower.colour, life: 1 }); }
        if (activePower.remaining <= 0) {
          popups.push({ x: W / 2, y: H * .42, text: activePower.expiry, colour: activePower.colour, life: 1.4 });
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
        popups.push({ x, y: 68, text: def.incoming, colour: def.colour, life: 2.2 });
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
      if (spawn <= 0) { spawnWave(); spawn = Math.max(.72, 1.45 - time * .008); }
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
        if (!f.taken && (directCatch || echoCatch)) {
          f.taken = true;
          if (f.bad) hurt(catcher.x, H - 72);
          else if (f.kind === 'pickup') collectPickup(f);
          else {
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
            scoreAt(10 * multiplier, f.x, f.y - 25, f.kind === 'jelly' ? 'STAR MAGNET!' : `+${10 * multiplier}`);
            if (f.kind === 'jelly') { magnet = Math.max(magnet, 6); lives = Math.min(3, lives + 1); }
            burst(f.x, f.y, f.kind === 'jelly' ? '#bba7ed' : '#edf19b', 13); tone(380 + combo % 8 * 65, .11);
          }
        }
        if (!f.taken && !f.bad && f.y > H + 30) {
          f.taken = true;
          // A missed gift never breaks the streak; it just drifts by.
          if (f.kind === 'pickup') popups.push({ x: f.x, y: H - 60, text: 'THE GIFT DRIFTS BY', colour: '#b7abc9', life: 1.2 });
          else combo = 0;
        }
      }
      falling = falling.filter(f => !f.taken && f.y < H + 50);
      level = 1 + Math.floor(time / 15);
      if (remaining <= 0) { burst(catcher.x, H - 72, '#edf19b', 65, 260); finish('Meteor shower: absolutely handled.'); }
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
      scoreAt(25 * Math.min(8, combo), b.x, b.y - 20); burst(b.x, b.y, colours[b.tier], b.hp ? 7 : 22); tone(350 + b.tier * 65, .1); shake = 2;
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
          const a = paddle.angle + i * .1, speed = 285 + Math.min(160, (level - 1) * 30);
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
              const neighbours = bricks.filter(n => n !== b && n.hp > 0 && Math.hypot(n.x - b.x, n.y - b.y) <= reach).sort((a, n) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(n.x - b.x, n.y - b.y)).slice(0, prism ? 2 : 1);
              for (const n of neighbours) { hitCrystal(n); fields.push({ x: b.x, y: b.y, toX: n.x, toY: n.y, radius: reach, colour: prism ? '#edf19b' : '#bba7ed', life: .4, max: .4 }); }
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
            if (has('return-sigil')) { wardReturns++; if (wardReturns >= 6) { ward = 1; wardReturns = 0; relicField(W / 2, H / 2, 254, '#9ed7c6'); } }
            burst(c.x, c.y, '#a8dcdf', 8, 70); tone(200, .07, 'triangle');
          } else if (ward && distance >= 254 - radius) {
            ward = 0; const speed = Math.hypot(c.vx, c.vy); c.vx = -Math.cos(a) * speed; c.vy = -Math.sin(a) * speed;
            relicField(c.x, c.y, 55, '#9ed7c6'); tone(640, .12);
          } else if (distance > 265) { c.lost = true; lastLost = c; burst(c.x, c.y, '#f58e9b', 8); }
        }
        c.trail.push({ x: c.x, y: c.y }); if (c.trail.length > (reduced ? 3 : 24)) c.trail.shift();
      }
      comets = comets.filter(c => !c.lost);
      // Only losing the final comet spends a life, even if several leave in one step.
      if (!comets.length && lastLost) {
        invulnerable = 0; hurt(lastLost.x, lastLost.y); combo = 0; launchTimer = 1.25;
        if (phase === 'running') comets.push({ x: W / 2, y: H / 2 + 208, vx: 0, vy: -290, trail: [], secondary: false });
      }
      while (splitHits >= 6) { splitHits -= 6; splitComet(comets[0]); }
      if (bricks.every(b => !b.hp) && phase === 'running') { level++; lives = Math.min(3, lives + 1); scoreAt(500, W / 2, H / 2, 'CONSTELLATION CLEARED +500'); burst(W / 2, H / 2, '#edf19b', 80, 300); makeBricks(); }
    }
    function step(dt) {
      if (suspended || phase !== 'running') return;
      time += dt; invulnerable = Math.max(0, invulnerable - dt);
      if (options.game === 'merge') mergeStep(dt);
      else if (options.game === 'hop') surfStep(dt);
      else if (options.game === 'dash') dashStep(dt);
      else breakerStep(dt);
      checkOffer();
    }
    function effectsStep(dt) {
      visualTime += dt; shake *= Math.exp(-11 * dt); flash = Math.max(0, flash - dt);
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-2 * dt); p.vy += 45 * dt; p.life -= dt; p.angle += dt * 2; }
      particles = particles.filter(p => p.life > 0);
      for (const r of ripples) { r.radius += dt * 100; r.life -= dt; }
      ripples = ripples.filter(r => r.life > 0);
      for (const p of popups) { p.y -= dt * 33; p.life -= dt; }
      popups = popups.filter(p => p.life > 0);
      fields.forEach(f => { f.life -= dt; }); fields = fields.filter(f => f.life > 0);
      if (phase === 'ending') {
        finishDelay -= dt;
        if (finishDelay <= 0) { phase = 'over'; options.onFinish?.({ score, largest, drops, level, totalMerges, relics: owned.slice(), synergies: activeSynergies(), stats: stats(), result }); notify(); }
      }
    }
    function text(value, x, y, size = 12, colour = '#b8aacb', align = 'center') {
      ctx.font = `500 ${size}px "DM Sans", sans-serif`; ctx.fillStyle = colour; ctx.textAlign = align; ctx.fillText(value, x, y);
    }
    function trail(points, colour, offset = 0, width = 8) {
      if (points.length < 2) return;
      ctx.lineCap = 'round';
      for (let i = 1; i < points.length; i++) { ctx.globalAlpha = i / points.length * .55; ctx.strokeStyle = colour; ctx.lineWidth = i / points.length * width; ctx.beginPath(); ctx.moveTo(points[i - 1].x - offset, points[i - 1].y); ctx.lineTo(points[i].x - offset, points[i].y); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    function background() {
      if (!hueCache) {
        hueCache = { base: ctx.createLinearGradient(0, 0, 0, H), glow: ctx.createRadialGradient(W * .65, H * .28, 20, W * .65, H * .28, W * .7) };
        hueCache.base.addColorStop(0, '#101b24'); hueCache.base.addColorStop(.55, '#192335'); hueCache.base.addColorStop(1, '#302938');
        hueCache.glow.addColorStop(0, options.game === 'dash' ? '#39636835' : options.game === 'hop' ? '#67426c40' : '#443d6d42'); hueCache.glow.addColorStop(1, '#211b3500');
      }
      ctx.fillStyle = hueCache.base; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = hueCache.glow; ctx.fillRect(0, 0, W, H);
      for (const s of stars) {
        const x = (s.x - (options.game === 'hop' ? camera * s.depth * .08 : 0) % W + W) % W;
        ctx.globalAlpha = reduced ? .5 : .45 + Math.sin(visualTime * .8 + s.x) * .2;
        ctx.fillStyle = '#e5dbee'; ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function drawMerge() {
      ctx.fillStyle = '#bea7f008'; ctx.fillRect(22, 92, W - 44, H - 119);
      ctx.strokeStyle = '#b4a0d84d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(21, 100); ctx.lineTo(21, H - 26); ctx.quadraticCurveTo(21, H - 20, 29, H - 20); ctx.lineTo(W - 29, H - 20); ctx.quadraticCurveTo(W - 21, H - 20, W - 21, H - 28); ctx.lineTo(W - 21, 100); ctx.stroke();
      ctx.strokeStyle = danger > .2 ? '#ff929a' : '#b7a2d644'; ctx.lineWidth = 1; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(24, 92); ctx.lineTo(W - 24, 92); ctx.stroke(); ctx.setLineDash([]);
      if (danger > .2) { text('ROOM IS GETTING COSY', W / 2, 115, 10, '#ffacb4'); ctx.fillStyle = '#f58e9b'; ctx.fillRect(24, 88, (W - 48) * Math.min(1, danger / dangerLimit()), 3); }
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
        ctx.globalAlpha = .13; orb(ctx, x, Math.max(50, landing), r, queue[0]); ctx.globalAlpha = cooldown > 0 ? .35 : 1;
        orb(ctx, x, 45 + Math.sin(visualTime * 3) * 2, r, queue[0], true, 0, 1, visualTime); ctx.globalAlpha = 1;
      }
      for (const b of balls) { const growth = b.born > 0 ? 1 + Math.sin(b.born / .32 * Math.PI) * .12 : 1; orb(ctx, b.x, b.y, radii[b.tier] * growth, b.tier, true, b.angle, 1 + (reduced ? 0 : b.squash), visualTime); }
      if (combo > 1) text(`${combo}× CHAIN REACTION`, W / 2, H - 6, 11, '#edf19b');
    }
    function drawSurf() {
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
      if (tether) { ctx.strokeStyle = '#f0f3a099'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tether.planet.x - camera, tether.planet.y); ctx.lineTo(ship.x - camera, ship.y); ctx.stroke(); }
      ctx.globalAlpha = invulnerable > 0 && Math.sin(visualTime * 30) > 0 ? .35 : 1;
      if (shields > 0) { ctx.strokeStyle = '#9ed7c6aa'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(ship.x - camera, ship.y, 22 + Math.sin(visualTime * 5) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      ctx.save(); ctx.translate(ship.x - camera, ship.y); ctx.rotate(Math.atan2(ship.vy, ship.vx));
      ctx.fillStyle = '#f7ecce'; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-11, -10); ctx.lineTo(-6, 0); ctx.lineTo(-11, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#eea88c'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
      if (has('solar-spool') && tether) { ctx.fillStyle = '#edf19b33'; ctx.fillRect(W / 2 - 52, 42, 104, 4); ctx.fillStyle = '#edf19b'; ctx.fillRect(W / 2 - 52, 42, 104 * orbitCharge, 4); text(orbitCharge >= 1 ? 'SLINGSHOT CHARGED' : 'HOLD TO CHARGE', W / 2, 58, 9, '#edf19b'); }
      text(tether ? 'RELEASE TO SLINGSHOT' : 'HOLD NEAR A PLANET TO ORBIT', W / 2, 32, 11, tether ? '#edf19b' : '#cabbd8');
      text(`${Math.floor(ship.x / 10)} METRES`, W - 28, H - 25, 11, '#cfc1dc', 'right');
      if (tether) { const dx = ship.vx / 290, dy = ship.vy / 290; ctx.strokeStyle = '#edf19b66'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(ship.x - camera + dx * 20, ship.y + dy * 20); ctx.lineTo(ship.x - camera + dx * 95, ship.y + dy * 95); ctx.stroke(); ctx.setLineDash([]); }
    }
    function drawDash() {
      ctx.strokeStyle = '#bba7ed1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(W / 2, H + 100, W * .65, 150, 0, 0, TAU); ctx.stroke();
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
      ctx.save(); ctx.translate(catcher.x, H - 72); ctx.rotate(catcher.tilt);
      ctx.globalAlpha = invulnerable > 0 && Math.sin(visualTime * 30) > 0 ? .4 : 1;
      if (dashTime > 0) { ctx.fillStyle = '#9ed7c644'; ctx.beginPath(); ctx.ellipse(-lastDirection * 45, 5, 70, 14, 0, 0, TAU); ctx.fill(); }
      const bowlScale = basketWidth() / 39;
      ctx.save(); ctx.scale(bowlScale, 1);
      ctx.fillStyle = '#99dbc4'; ctx.beginPath(); ctx.moveTo(-39, -2); ctx.quadraticCurveTo(0, 62, 39, -2); ctx.quadraticCurveTo(0, 17, -39, -2); ctx.fill();
      ctx.strokeStyle = '#f1e4b3'; ctx.lineWidth = 3 / bowlScale; ctx.beginPath(); ctx.ellipse(0, -2, 39, 9, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#27233a'; ctx.fillRect(-10, 14, 3, 5); ctx.fillRect(8, 14, 3, 5);
      for (let i = 0; i < shields; i++) { ctx.strokeStyle = '#9ed7c6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-18 + i * 18, -23, 6 + Math.sin(visualTime * 4) * 1, 0, TAU); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
      text(`${Math.ceil(remaining)}s`, W - 27, 35, 22, '#eee7d4', 'right');
      text(combo > 0 ? `${combo} STREAK · ×${Math.min(8, 1 + Math.floor(combo / 5))}` : 'GOLD IS GOOD. PINK IS TROUBLE.', W / 2, 30, 11, combo > 0 ? '#edf19b' : '#b7abc9');
      ctx.fillStyle = '#9ed7c622'; ctx.fillRect(25, H - 20, W - 50, 3); ctx.fillStyle = '#9ed7c6'; ctx.fillRect(25, H - 20, (W - 50) * remaining / 75, 3);
    }
    function drawBreaker() {
      ctx.strokeStyle = '#b9a5dc35'; ctx.lineWidth = 1; ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.arc(W / 2, H / 2, 238, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (ward) { ctx.strokeStyle = '#9ed7c688'; ctx.lineWidth = 2; ctx.setLineDash([8, 10]); ctx.beginPath(); ctx.arc(W / 2, H / 2, 256, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      ctx.lineWidth = slowTime > 0 ? 12 : 10; ctx.lineCap = 'round'; ctx.strokeStyle = slowTime > 0 ? '#edf19b' : '#9ed7dc';
      const half = paddleHalf();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 235, paddle.angle - half, paddle.angle + half); ctx.stroke();
      if (has('crescent-crown') && has('chrono-coil') && slowTime > 0) { ctx.strokeStyle = '#edf19baa'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 235, paddle.angle + Math.PI - half, paddle.angle + Math.PI + half); ctx.stroke(); }
      for (const b of bricks) {
        if (!b.hp) continue;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle + .4); ctx.fillStyle = b.hit > 0 ? '#fff4d4' : colours[b.tier]; ctx.beginPath();
        for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i / 6 * TAU) * b.r, Math.sin(i / 6 * TAU) * b.r);
        ctx.closePath(); ctx.fill();
        if (b.hp > 1) { ctx.strokeStyle = '#271c46'; ctx.lineWidth = 2; ctx.strokeRect(-5, -5, 10, 10); }
        ctx.restore();
      }
      for (const c of comets) {
        trail(c.trail, c.secondary ? '#9ed7c6' : slowTime > 0 ? '#edf19b' : '#fac7a5', 0, c.secondary ? 8 : 10);
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
      for (const p of popups) { ctx.globalAlpha = Math.min(1, p.life * 3); text(p.text, p.x, p.y, 15, p.colour); }
      ctx.globalAlpha = 1; ctx.restore();
      if (options.game !== 'merge') {
        for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < lives ? 1 : .15; star(ctx, 28 + i * 23, options.game === 'breaker' ? 64 : H - 30, 8, '#f5a08c', 5); } ctx.globalAlpha = 1;
      }
      if (flash > 0 && !reduced) { ctx.fillStyle = `rgba(245,142,155,${flash * .6})`; ctx.fillRect(0, 0, W, H); }
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
        accumulator += elapsed;
        while (accumulator >= 1 / 120 && phase === 'running') { step(1 / 120); accumulator -= 1 / 120; }
        notifyTimer += elapsed;
        if (notifyTimer > .1) { notifyTimer = 0; notify(); }
      }
      if (phase !== 'paused') effectsStep(elapsed);
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
