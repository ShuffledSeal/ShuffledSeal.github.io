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
      { id: 'moonshield', name: 'Moonshield', glyph: '◇', colour: '#a9d3be', duration: 3, incoming: 'MOONSHIELD INCOMING', expiry: 'THE MOON REMEMBERS', description: 'Two meteors bounce off.' },
      { id: 'prism-net', name: 'Prism Net', glyph: '≋', colour: '#e29eb7', duration: 8, incoming: 'PRISM NET INCOMING', expiry: 'THE NET FOLDS', description: 'Catch above and below the line.' },
      { id: 'star-prism', name: 'Star Prism', glyph: '✦', colour: '#f2d38a', duration: 12, charges: 5, incoming: 'STAR PRISM INCOMING', expiry: 'THE PRISM DIMS', description: 'The next five catches score triple.' },
    ],
  };
  // The Moonboat Expedition: six weathers, then the whale. Quick Forecast
  // (75s) stays as the instant-retry mode; daily skies take the expedition.
  const dashStages = [
    { until: 35, name: 'WAKE THE SKY', sub: 'The forecast is extremely weird', speed: 1, spawn: 1, bad: 0, wind: 0, mission: { id: 'catch', text: 'Catch 12 stars', target: 12 } },
    { until: 80, name: 'CROSSWIND', sub: 'The sky leans sideways', speed: 1.05, spawn: .9, bad: 0, wind: 26, mission: { id: 'calm', text: 'Take no hits for 25 seconds', target: 25 } },
    { until: 125, name: 'JELLY TIDE', sub: 'Helpful strangers drift by', speed: 1.1, spawn: .92, bad: 0, wind: 0, jelly: true, mission: { id: 'centre', text: 'Catch 8 stars in the centre lane', target: 8 } },
    { until: 175, name: 'PINK WEATHER', sub: 'Narrow lanes. Trust your dash', speed: 1.2, spawn: .85, bad: 1, wind: 0, mission: { id: 'gift', text: 'Collect a gift before it passes', target: 1 } },
    { until: 225, name: 'THE LONG NIGHT', sub: 'Two weathers at once', speed: 1.28, spawn: .8, bad: 1, wind: 20, mission: { id: 'surge', text: 'Catch 10 stars during a surge', target: 10 } },
  ];
  const WHALE_AT = 225, EXPEDITION_LENGTH = 270;
  // Veteran expeditions add authored chapters rather than inflating the whole
  // cabinet's numbers. Every pattern below is deterministic and entity-capped.
  const UMBRA_STAGE = { until: 45, name: 'UMBRA VEIL', sub: 'Dark starlight lands only inside the roaming lantern', speed: 1.05, spawn: 1.08, bad: 1, wind: 0, umbra: true, mission: { id: 'umbra', text: 'Catch 8 dark stars in the lantern', target: 8 } };
  const veteranDashStages = [UMBRA_STAGE, ...dashStages.map(stage => Object.freeze({ ...stage, until: stage.until + 45 }))];
  const VETERAN_WHALE_AT = 270, VETERAN_EXPEDITION_LENGTH = 315;
  const MERGE_FORECAST_CYCLE = 58;
  const mergeForecasts = [
    { at: 4, duration: 12, name: 'THE FIRST SWING', hint: 'The counterweight crosses left to right', pull: 155, period: 6.4, gravity: 1 },
    { at: 20, duration: 11, name: 'COUNTERWEIGHT', hint: 'A slower swing begins from the other wall', pull: -205, period: 7.2, gravity: .9 },
    { at: 35, duration: 9, name: 'LOW TIDE', hint: 'Light worlds, short pendulum, early landings', pull: 115, period: 4.8, gravity: .68 },
    { at: 48, duration: 10, name: 'BELL WEATHER', hint: 'Quick alternating pulls — drop between the bells', pull: 230, period: 4.1, gravity: 1.08 },
  ];
  // Each stop pairs a genuinely orbiting binary with a different gate verb:
  // read a still opening, time a breathing iris, chase a drifting gap, make an
  // S-turn through scissors, then choose either side of a crowned pillar.
  const surfExpeditionPatterns = [
    { gate: 'iris', label: 'BREATHING IRIS', gap: 160, y: 250, binaryY: 190, spin: .72 },
    { gate: 'lantern', label: 'LANTERN GATE', gap: 176, y: 280, binaryY: 350, spin: -.82 },
    { gate: 'drift', label: 'DRIFTING LOCK', gap: 142, y: 285, binaryY: 175, spin: .9 },
    { gate: 'scissor', label: 'SCISSOR PAIR', gap: 142, y: 205, binaryY: 345, spin: -.96 },
    { gate: 'crown', label: 'CROWNED PILLAR', gap: 190, y: 285, binaryY: 260, spin: .78 },
  ];
  const cathedralPatterns = ['THE NAVE', 'ROSE WINDOW', 'TWIN SPIRES'];
  for (const entry of [...mergeForecasts, ...surfExpeditionPatterns, UMBRA_STAGE]) Object.freeze(entry);
  Object.freeze(mergeForecasts); Object.freeze(surfExpeditionPatterns); Object.freeze(veteranDashStages); Object.freeze(cathedralPatterns);
  for (const catalog of [relics, synergies, powerUps]) {
    for (const entries of Object.values(catalog)) { entries.forEach(entry => { if (entry.ids) Object.freeze(entry.ids); Object.freeze(entry); }); Object.freeze(entries); }
    Object.freeze(catalog);
  }
  const milestones = { merge: [5, 14, 28, 48], hop: [220, 550, 1000, 1600], dash: [6, 20, 38, 58], breaker: [6, 16, 32, 55] };
  // Drafts are events, not a checklist: at least this long between offers,
  // no matter how hot the run gets.
  const MIN_DRAFT_GAP = 30;
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
    let controlPointer = null, pointerBrace = false, pointerRein = false, controlObserver = null, canvasCssWidth = W, canvasCssHeight = H;
    let charge, combo, comboTimer, lives, invulnerable, level, totalMerges;
    let balls, queue, cooldown, danger, largest, drops;
    let ship, worlds, rings, rocks, camera, nextWorld, tether, distanceScore;
    let catcher, falling, spawn, remaining, wave, dashTime, magnet;
    let dashStageIndex = -2, missionProgress = 0, missionDone = false, lastHitTime = -99, giftCollected = false, whale = null, breathLanes = [];
    let paddle, comets, bricks, launchTimer, slowTime;
    let dropArmed = false, hueCache, hudFrame = null;
    const ESSENTIAL_HUD_CSS_PX = 14;
    let notifyTimer = 0, releases = 0;
    // Feel channels: hit-stop/slow-mo timescale and a camera micro-zoom.
    let timeScale = 1, timeKick = 0, zoom = 1;
    // Ceremony state: draft telegraph, per-game finales and named moments.
    let draftWarn = 0, stirred = -1, draftTimes = [], pileT = 0, peakBand = 0, lastThump = 0;
    let surgeUntil = 0, lastTen = false, dashAct = 1, lastTickSec = -1, lastActTick = -1;
    let oneCrystal = false, lastBeacon = 0, ghosts = [], sprayT = 0, chargeStep = 0;
    let music = null;
    // One optional high-stakes burst per run, available only after mastering the opening loop.
    let pact = 0, pactUsed = false, pactFailed = false;
    let suspended = false, owned = [], offer = null, draftDecks = [], draftIndex = 0, lastDraftTime = 0, draftFallbacks = 0;
    let aimVelocity = 0, aimStamp = 0, guidedBall = null, fields = [], echoes = [];
    let pickupSchedule = [], activePower = null, slow = 0;
    let maxMetres = 0, totalCatches = 0, crystalHits = 0, ringsCaught = 0, shields = 0, shieldCharge = 0;
    let orbitCharge = 0, flightBoost = 0, reactorRings = 0, clockCatches = 0, splitHits = 0, ward = 0, wardReturns = 0, tetherAwaitingPress = false, routeMod = null;
    let forecastPick = null, gravityScale = 1;
    let mergeGravityX = 0, mergeForecast = null, mergeForecastEvents = 0, mergeForecastKey = '';
    let binarySystems = [], surfGates = [], surfRouteIndex = 0, nextSurfRoute = 900, surfGatesPassed = 0, surfGateHits = 0;
    let umbraLightX = W / 2, umbraCatches = 0, umbraMisses = 0;
    let cathedralSealBlocks = 0, cathedralArmourDents = 0, lastSealNote = -99;
    // Masterwork-only player verbs. None of these states touches the standard
    // course stream; every pattern is authored from simulation time and input.
    let mergeGrip = 100, mergeBracing = false, anchorDrops = 0, anchorMerges = 0, anchorShelters = 0;
    let surfCharge = 0, surfSwaps = 0, surfHooks = 0;
    let umbraLumen = 0, umbraRein = false, eclipseCatches = 0, shadesSpawned = 0, shadesBroken = 0;
    let cathedralFocusReturns = 0, cathedralFocusBreaks = 0, paddleHush = 0;
    let choirTimer = 5.5, choirSource = null, choirCharge = 0, choirBolts = [], choirShots = 0, choirParries = 0, choirHushes = 0;
    // Deep Masterwork systems. These are deliberately separate from the daily
    // streams: standard cartridges never allocate or advance any of them.
    let mergeShelves = [], mergeEnemies = [], mergeResonance = 0, mergeEnemyTimer = 0, mergeKills = 0, mergeShelfContacts = 0, mergeTunedDrops = 0, mergeTuneQueued = false, mergeBoss = null;
    let surfCurrents = [], surfHunters = [], surfVeil = 0, surfHunterTimer = 0, surfCurrentTime = 0, surfVeilBreaks = 0, surfHunterReflections = 0, regentHunterCrown = 0, surfBoss = null, surfBossRings = 0;
    let dashTide = 0, dashTideName = '', dashAnchor = false, dashMothTimer = 0, dashBanks = 0, dashBankedStars = 0, dashMothsBroken = 0, dashMothThefts = 0;
    let censerTime = 0, censerBanishes = 0, cathedralSentries = [], sentryBreaks = 0, litanyTarget = 0, litanyProgress = 0, litanyCompletions = 0, cathedralFocusHeartBreaks = 0, cathedralBoss = null;
    const veteran = options.veteran === true;
    const expedition = options.game === 'dash' && options.expedition === true;
    const veteranExpedition = veteran && expedition;
    const stageCatalog = () => veteranExpedition ? veteranDashStages : dashStages;
    const whaleAt = () => veteranExpedition ? VETERAN_WHALE_AT : WHALE_AT;
    const expeditionLength = () => veteranExpedition ? VETERAN_EXPEDITION_LENGTH : EXPEDITION_LENGTH;
    const has = id => owned.some(r => r.id === id);
    const activeSynergies = () => synergies[options.game].filter(s => s.ids.every(has)).map(({ name, description }) => ({ name, description }));
    const dangerLimit = () => has('deep-cradle') ? 5.2 : 3.4;
    const basketWidth = () => has('wide-halo') ? 55 : 39;
    const cometRadius = () => has('dense-core') ? 11 : 8;
    const paddleHalf = () => Math.max(.27, (slowTime > 0 ? .8 : .55) + (has('crescent-crown') ? .22 : 0) - (veteran && paddleHush > 0 ? .16 : 0) - (veteran && censerTime > 0 ? .06 : 0));
    const tetherReach = () => (options.relaxed ? 270 : 235) + (has('longwave-tether') ? 80 : 0);
    const ringReach = () => has('ring-compass') ? (has('solar-spool') && flightBoost > 0 ? 340 : 150) : 0;
    const magnetReach = () => magnet > 0 ? (has('lodestone') ? 300 : 260) : has('lodestone') ? 180 : 0;
    const progressValue = () => options.game === 'merge' ? totalMerges : options.game === 'hop' ? Math.floor(maxMetres) : options.game === 'dash' ? totalCatches : crystalHits;
    const pactThreshold = { merge: 3, hop: 350, dash: 7, breaker: 7 };
    const pactReady = () => phase === 'running' && !suspended && !pactUsed && progressValue() >= pactThreshold[options.game];
    const stats = () => ({ simulationTime: time, totalMerges, totalCatches, crystalHits, ringsCaught, maxMetres: Math.floor(maxMetres), comets: comets.length, shields, shieldCharge, orbitCharge, ward, draftFallbacks, draftTimes: draftTimes.slice(),
      mergeGrip: Math.round(mergeGrip), anchorDrops, anchorMerges, anchorShelters, surfCharge: Math.round(surfCharge), surfSwaps, surfHooks,
      umbraLumen: Math.round(umbraLumen), eclipseCatches, shadesSpawned, shadesBroken, cathedralFocusReturns, cathedralFocusBreaks, choirShots, choirParries, choirHushes,
      mergeResonance: Math.round(mergeResonance), mergeKills, mergeShelfContacts, mergeTunedDrops,
      surfVeil: Number(surfVeil.toFixed(2)), surfCurrentTime: Number(surfCurrentTime.toFixed(2)), surfVeilBreaks, surfHunterReflections, regentHunterCrown, surfBossRings,
      dashBanks, dashBankedStars, dashMothsBroken, dashMothThefts, censerBanishes, sentryBreaks, litanyCompletions, cathedralFocusHeartBreaks,
      finale: (mergeBoss || surfBoss || cathedralBoss)?.stage ?? (whale?.finaleStage ?? -1) });

    function measureControls() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) { canvasCssWidth = rect.width; canvasCssHeight = rect.height; }
    }
    function controlRects() {
      if (!veteran) return {};
      // Canvas coordinates scale with the cartridge, touch targets do not.
      // ResizeObserver + pointerdown measurement keeps every visible pad at
      // least 48 CSS px in both dimensions, including phone/theatre layouts.
      const minW = Math.min(W - 32, 48 * W / Math.max(1, canvasCssWidth));
      const minH = Math.min(H - 32, 48 * H / Math.max(1, canvasCssHeight));
      const size = (w, h) => ({ w: Math.max(w, minW), h: Math.max(h, minH) });
      if (options.game === 'merge') {
        const brace = size(112, 58), tune = size(112, 58);
        return { brace: { x: 14, y: 10, ...brace }, tune: { x: W - 14 - tune.w, y: 10, ...tune } };
      }
      if (options.game === 'hop') {
        const abilitySize = size(138, 56), veilSize = size(138, 56);
        return { ability: { x: 16, y: 16, ...abilitySize }, veil: { x: 16, y: 26 + abilitySize.h, ...veilSize } };
      }
      if (options.game === 'dash' && veteranExpedition) {
        const dashSize = size(104, 54), bankSize = size(112, 54), reinSize = size(112, 54);
        const controls = {
          dash: { x: 16, y: H - 16 - dashSize.h, ...dashSize },
          bank: { x: W - 16 - bankSize.w, y: H - 16 - bankSize.h, ...bankSize },
          rein: { x: W - 16 - reinSize.w, y: H - 24 - bankSize.h - reinSize.h, ...reinSize },
        };
        return controls;
      }
      return {};
    }
    function censerTouchRect() {
      if (!veteran || options.game !== 'breaker') return null;
      const minW = Math.min(W - 32, 48 * W / Math.max(1, canvasCssWidth)), minH = Math.min(H - 32, 48 * H / Math.max(1, canvasCssHeight));
      const w = Math.max(142, minW), h = Math.max(54, minH);
      return { x: 16, y: H - 16 - h, w, h };
    }
    function masterworkGuidance() {
      if (!veteran) return null;
      if (options.game === 'merge') return {
        mechanic: mergeBracing ? 'COUNTERWEIGHT BRACE' : mergeForecast?.telegraph ? 'ANCHOR WINDOW' : 'PENDULUM CRAFT',
        hint: mergeBracing ? 'Brace levels the reliquary shelves and holds the pile, but makes worlds fall faster. Release S or the brace pad to recover grip.' : mergeForecast?.telegraph ? 'Drop during the forecast to cast an anchor. E / Tune spends 30 resonance to match the world nearest your aim; shelves and gargoyles change the landing.' : 'Hold S / ↓ to brace and level the shelves. Aim at a world and press E / Tune to match it for 30 resonance; merge shockwaves break gargoyles.',
      };
      if (options.game === 'hop') return {
        mechanic: tether?.planet?.binary ? 'TWIN SWAP' : 'STARHOOK', charge: Math.floor(surfCharge),
        hint: tether?.planet?.binary ? 'X swaps twins for 25 twinlight. E / Veil spends 25 and slows the orbit while reflecting hunters and gates.' : 'X starhooks for 50 twinlight. E / Veil spends 25 to reflect hunters and terrain, but slows orbit or free flight. Ride currents to rings and clean gates to refill it.',
      };
      if (options.game === 'dash') return {
        mechanic: umbraRein ? 'LANTERN REIN' : 'ECLIPSE DASH', lumen: Math.floor(umbraLumen),
        hint: stageCatalog()[dashStageIndex]?.umbra ? 'Hold S / ↓ to rein the lantern. E / Bank cashes the streak before moths steal it and banks whale breath. X / Eclipse catches unlit stars and breaks shades.' : 'E / Bank converts three or more streak stars into a bonus and lumen, but resets the multiplier. Hold S / ↓ to sea-anchor against the tide; dash through streak-stealing moths.',
      };
      const focused = Math.max(0, ...comets.map(c => c.focus || 0));
      return {
        mechanic: choirSource ? 'CHOIR TELEGRAPH' : choirBolts.length ? 'DISCORD INCOMING' : focused >= 2 ? 'FOCUS BREAK READY' : 'CATHEDRAL FOCUS', focus: focused,
        hint: choirSource ? 'The marked keystone is charging. Break it, parry its radial line, or press E / Censer for 40 charge to bend the shot into the rose.' : choirBolts.length ? 'Drag the paddle into the discord mote, or spend 40 charge with E / Censer. Follow the glowing glass order to complete a Litany.' : focused >= 2 ? 'The centred comet will pierce its next crystal and deal two damage. Sentries break only to Focus or the Censer.' : 'Drag pointer or touch for centred Focus returns. E / Censer spends 40 charge to curve comets and capture discord; strike the glowing glass order for a Litany.',
      };
    }
    function notify() {
      const detail = options.game === 'merge' ? `${names[largest]} · ${drops} drops` : options.game === 'hop' ? `${Math.floor(ship.x / 10)} m · sector ${level}` : options.game === 'dash' ? (expedition ? `${whale ? 'THE WHALE' : stageCatalog()[dashStageIndex]?.name || 'THE FORECAST'} · ×${Math.max(1, Math.min(8, 1 + Math.floor(combo / 5)))}` : `${Math.ceil(remaining)}s · ×${Math.max(1, Math.min(8, 1 + Math.floor(combo / 5)))}`) : `Wave ${level} · ${bricks.filter(b => b.hp > 0).length} crystals`;
      canvas.dataset.phase = phase; canvas.dataset.score = score; canvas.dataset.count = balls?.length || 0;
      canvas.dataset.largest = largest; canvas.dataset.lives = lives; canvas.dataset.level = level;
      canvas.dataset.suspended = String(suspended);
      canvas.dataset.releases = releases; canvas.dataset.tethered = String(!!tether);
      canvas.dataset.veteran = String(veteran);
      canvas.dataset.hudScale = hudScale().toFixed(3); canvas.dataset.hudCompact = String(compactHUD()); canvas.dataset.canvasCssWidth = Math.round(canvasCssWidth);
      canvas.dataset.expeditionName = !veteran ? '' : ({ merge: 'Pendulum Orrery', hop: 'Twin-Star Route', dash: veteranExpedition ? 'Umbra Veil' : '', breaker: 'Crystal Cathedral' })[options.game];
      if (options.game === 'merge') {
        canvas.dataset.gravityX = mergeGravityX.toFixed(2); canvas.dataset.gravityScale = gravityScale.toFixed(2);
        canvas.dataset.pendulumVelocity = (balls.reduce((sum, b) => sum + b.vx, 0) / Math.max(1, balls.length)).toFixed(2);
        canvas.dataset.forecastEvent = mergeForecast?.name || ''; canvas.dataset.forecastTelegraph = String(!!mergeForecast?.telegraph);
        canvas.dataset.forecastEvents = mergeForecastEvents;
        canvas.dataset.mergeGrip = Math.round(mergeGrip); canvas.dataset.mergeBracing = String(mergeBracing);
        canvas.dataset.anchorDrops = anchorDrops; canvas.dataset.anchorMerges = anchorMerges; canvas.dataset.anchorShelters = anchorShelters;
        const activeAnchors = balls.filter(b => b.anchorKey && b.anchorKey === mergeForecastKey);
        canvas.dataset.activeAnchors = activeAnchors.length;
        canvas.dataset.anchorVelocity = activeAnchors.length ? (activeAnchors.reduce((sum, b) => sum + Math.abs(b.vx), 0) / activeAnchors.length).toFixed(2) : '';
        canvas.dataset.anchorX = activeAnchors[0] ? activeAnchors[0].x.toFixed(1) : ''; canvas.dataset.anchorY = activeAnchors[0] ? activeAnchors[0].y.toFixed(1) : '';
        const tuneTarget = balls.filter(b => b.age > .25 && b.tier <= 4).sort((a, b) => Math.abs(a.x - aim) - Math.abs(b.x - aim) || b.y - a.y)[0];
        canvas.dataset.mergeResonance = Math.round(mergeResonance); canvas.dataset.mergeTunedDrops = mergeTunedDrops; canvas.dataset.mergeKills = mergeKills;
        canvas.dataset.mergeShelfContacts = mergeShelfContacts; canvas.dataset.mergeEnemies = mergeEnemies.length;
        const dropTarget = balls.filter(b => b.age > .25 && b.tier === queue[0]).sort((a, b) => b.y - a.y)[0];
        canvas.dataset.mergeDropTargetX = dropTarget ? Math.round(dropTarget.x) : ''; canvas.dataset.mergeDropTargetY = dropTarget ? Math.round(dropTarget.y) : '';
        canvas.dataset.mergeEnemyX = mergeEnemies[0] ? Math.round(mergeEnemies[0].x) : ''; canvas.dataset.mergeEnemyY = mergeEnemies[0] ? Math.round(mergeEnemies[0].y) : '';
        canvas.dataset.mergeEnemyState = mergeEnemies[0]?.state || ''; canvas.dataset.tuneTargetX = tuneTarget ? Math.round(tuneTarget.x) : ''; canvas.dataset.tuneTargetTier = tuneTarget?.tier ?? '';
        canvas.dataset.mergeBossStage = mergeBoss?.stage ?? ''; canvas.dataset.mergeBossProgress = mergeBoss?.progress ?? ''; canvas.dataset.mergeBossTarget = mergeBoss ? [1, 2, 3][mergeBoss.stage] ?? 0 : '';
        canvas.dataset.mergeBossTelegraph = mergeBoss?.telegraph > 0 ? 'true' : 'false';
      } else if (options.game === 'hop') {
        const gate = surfGates.find(g => g.x > ship.x - 30);
        canvas.dataset.binarySystems = binarySystems.length; canvas.dataset.surfGate = gate?.label || '';
        canvas.dataset.binaryAngle = binarySystems[0] ? binarySystems[0].angle.toFixed(3) : ''; canvas.dataset.binaryTethered = String(!!tether?.planet?.binary);
        canvas.dataset.surfGatesPassed = surfGatesPassed; canvas.dataset.surfGateHits = surfGateHits;
        canvas.dataset.surfGateX = gate ? Math.round(gate.x - camera) : ''; canvas.dataset.surfGateY = gate ? Math.round(gate.gapY) : '';
        canvas.dataset.surfGateGap = gate ? Math.round(gate.currentGap || gate.gap) : '';
        canvas.dataset.shipX = (ship.x - camera).toFixed(1); canvas.dataset.shipY = ship.y.toFixed(1); canvas.dataset.shipVX = ship.vx.toFixed(1); canvas.dataset.shipVY = ship.vy.toFixed(1);
        canvas.dataset.surfCharge = Math.round(surfCharge); canvas.dataset.surfSwaps = surfSwaps; canvas.dataset.surfHooks = surfHooks;
        canvas.dataset.twinSwapReady = String(!!tether?.planet?.binary && surfCharge >= 25);
        canvas.dataset.starhookReady = String(!tether && surfCharge >= 50 && worlds.some(w => w.x > ship.x - 50 && Math.hypot(w.x - ship.x, w.y - ship.y) < 430));
        const hunter = surfHunters[0], current = surfCurrents.find(c => ship.x >= c.x && ship.x <= c.x + c.width && Math.abs(ship.y - c.y) < c.height / 2);
        const nearestWorld = worlds.filter(w => w.x > ship.x - 20).sort((a, b) => Math.hypot(a.x - ship.x, a.y - ship.y) - Math.hypot(b.x - ship.x, b.y - ship.y))[0];
        canvas.dataset.surfPlanetX = nearestWorld ? Math.round(nearestWorld.x - camera) : ''; canvas.dataset.surfPlanetY = nearestWorld ? Math.round(nearestWorld.y) : ''; canvas.dataset.surfPlanetR = nearestWorld ? Math.round(nearestWorld.r) : '';
        const nextRing = rings.filter(r => !r.taken && r.x > ship.x - 20).sort((a, b) => a.x - b.x)[0];
        canvas.dataset.surfVeil = surfVeil.toFixed(2); canvas.dataset.surfVeilBreaks = surfVeilBreaks; canvas.dataset.surfHunterReflections = surfHunterReflections; canvas.dataset.regentHunterCrown = regentHunterCrown; canvas.dataset.surfCurrentTime = surfCurrentTime.toFixed(2);
        canvas.dataset.surfCurrentDirection = current?.direction || 0; canvas.dataset.surfCurrentY = current ? Math.round(current.y) : '';
        canvas.dataset.surfHunters = surfHunters.length; canvas.dataset.hunterState = hunter?.state || '';
        canvas.dataset.hunterX = hunter ? Math.round(hunter.x - camera) : ''; canvas.dataset.hunterY = hunter ? Math.round(hunter.y) : '';
        canvas.dataset.nextRingX = nextRing ? Math.round(nextRing.x - camera) : ''; canvas.dataset.nextRingY = nextRing ? Math.round(nextRing.y) : '';
        canvas.dataset.surfBossStage = surfBoss?.stage ?? ''; canvas.dataset.surfBossProgress = surfBoss?.progress ?? ''; canvas.dataset.surfBossTarget = surfBoss ? [2, 2, 3][surfBoss.stage] ?? 0 : '';
        canvas.dataset.surfBossRings = surfBossRings;
      } else if (options.game === 'dash') {
        const darkStar = falling.find(f => f.umbra && !f.taken);
        let nextStar = null, nextMeteor = null;
        for (const f of falling) {
          if (f.taken || f.wait > 0) continue;
          if (f.bad && (!nextMeteor || f.y > nextMeteor.y)) nextMeteor = f;
          else if (!f.bad && (!nextStar || f.y > nextStar.y)) nextStar = f;
        }
        canvas.dataset.nextStarX = nextStar ? Math.round(nextStar.x) : ''; canvas.dataset.nextStarY = nextStar ? Math.round(nextStar.y) : '';
        canvas.dataset.nextMeteorX = nextMeteor ? Math.round(nextMeteor.x) : ''; canvas.dataset.nextMeteorY = nextMeteor ? Math.round(nextMeteor.y) : '';
        canvas.dataset.dashChapter = whale ? 'THE WHALE' : stageCatalog()[dashStageIndex]?.name || '';
        canvas.dataset.dashStageCount = expedition ? stageCatalog().length : 0; canvas.dataset.umbraLightX = Math.round(umbraLightX);
        canvas.dataset.umbraCatches = umbraCatches; canvas.dataset.umbraMisses = umbraMisses;
        canvas.dataset.umbraStars = falling.filter(f => f.umbra && !f.taken).length;
        canvas.dataset.umbraStarX = darkStar ? Math.round(darkStar.x) : ''; canvas.dataset.umbraStarY = darkStar ? Math.round(darkStar.y) : '';
        canvas.dataset.umbraStarLit = darkStar ? String(!!darkStar.umbraLit) : ''; canvas.dataset.catcherX = Math.round(catcher.x);
        const shade = falling.filter(f => f.shade && !f.taken).sort((a, b) => b.y - a.y)[0];
        canvas.dataset.umbraLumen = Math.round(umbraLumen); canvas.dataset.umbraRein = String(umbraRein);
        canvas.dataset.eclipseCatches = eclipseCatches; canvas.dataset.shadesSpawned = shadesSpawned; canvas.dataset.shadesBroken = shadesBroken;
        canvas.dataset.activeShades = falling.filter(f => f.shade && !f.taken).length;
        canvas.dataset.shadeX = shade ? Math.round(shade.x) : ''; canvas.dataset.shadeY = shade ? Math.round(shade.y) : '';
        const moth = falling.filter(f => f.moth && !f.taken).sort((a, b) => b.y - a.y)[0];
        canvas.dataset.dashTide = dashTide.toFixed(2); canvas.dataset.dashTideName = dashTideName; canvas.dataset.dashAnchor = String(dashAnchor);
        canvas.dataset.dashBanks = dashBanks; canvas.dataset.dashBankedStars = dashBankedStars; canvas.dataset.dashMothsBroken = dashMothsBroken; canvas.dataset.dashMothThefts = dashMothThefts;
        canvas.dataset.activeMoths = falling.filter(f => f.moth && !f.taken).length; canvas.dataset.mothX = moth ? Math.round(moth.x) : ''; canvas.dataset.mothY = moth ? Math.round(moth.y) : '';
        canvas.dataset.whaleStage = whale?.finaleStage ?? ''; canvas.dataset.whaleBanked = whale?.banked ?? 0; canvas.dataset.whaleCaught = whale?.caught ?? 0;
        canvas.dataset.whaleTarget = whale && veteranExpedition ? [3, 4, 5][whale.finaleStage] ?? 0 : '';
      } else {
        const moving = bricks.filter(b => b.hp > 0 && b.motion);
        canvas.dataset.cathedralPattern = veteran ? cathedralPatterns[(level - 1) % cathedralPatterns.length] : '';
        canvas.dataset.movingCrystals = moving.length; canvas.dataset.armouredCrystals = bricks.filter(b => b.hp > 1).length;
        canvas.dataset.sealedCrystals = bricks.filter(b => b.hp > 0 && b.sealed && bricks.some(k => k.key && k.hp > 0)).length;
        canvas.dataset.cathedralSealBlocks = cathedralSealBlocks; canvas.dataset.cathedralArmourDents = cathedralArmourDents;
        canvas.dataset.cathedralMotion = moving.reduce((sum, b) => sum + Math.hypot(b.x - b.baseX, b.y - b.baseY), 0).toFixed(2);
        canvas.dataset.cometX = comets[0] ? comets[0].x.toFixed(1) : ''; canvas.dataset.cometY = comets[0] ? comets[0].y.toFixed(1) : '';
        canvas.dataset.cometVX = comets[0] ? comets[0].vx.toFixed(1) : ''; canvas.dataset.cometVY = comets[0] ? comets[0].vy.toFixed(1) : '';
        canvas.dataset.cathedralAlive = bricks.filter(b => b.hp > 0).length;
        const bolt = choirBolts[0];
        canvas.dataset.cometFocus = Math.max(0, ...comets.map(c => c.focus || 0));
        canvas.dataset.cathedralFocusReturns = cathedralFocusReturns; canvas.dataset.cathedralFocusBreaks = cathedralFocusBreaks;
        canvas.dataset.choirStatus = choirSource ? 'charging' : bolt ? 'incoming' : 'quiet';
        canvas.dataset.choirSourceX = choirSource ? Math.round(choirSource.x) : ''; canvas.dataset.choirSourceY = choirSource ? Math.round(choirSource.y) : '';
        canvas.dataset.choirBoltX = bolt ? Math.round(bolt.x) : ''; canvas.dataset.choirBoltY = bolt ? Math.round(bolt.y) : '';
        canvas.dataset.choirShots = choirShots; canvas.dataset.choirParries = choirParries; canvas.dataset.choirHushes = choirHushes;
        canvas.dataset.paddleHush = paddleHush.toFixed(2);
        const sentry = cathedralSentries[0], litanyBrick = bricks.find(b => b.hp > 0 && b.order === litanyTarget && !b.key && !b.bossCore && (!b.sealed || !bricks.some(k => k.key && k.hp > 0)));
        canvas.dataset.censerTime = censerTime.toFixed(2); canvas.dataset.censerBanishes = censerBanishes;
        canvas.dataset.cathedralSentries = cathedralSentries.length; canvas.dataset.sentryX = sentry ? Math.round(sentry.x) : ''; canvas.dataset.sentryY = sentry ? Math.round(sentry.y) : '';
        canvas.dataset.sentryBreaks = sentryBreaks; canvas.dataset.litanyTarget = litanyTarget; canvas.dataset.litanyProgress = litanyProgress; canvas.dataset.litanyCompletions = litanyCompletions;
        canvas.dataset.cathedralFocusHeartBreaks = cathedralFocusHeartBreaks; canvas.dataset.cathedralHeartHP = bricks.find(b => b.bossCore)?.hp ?? '';
        canvas.dataset.litanyBrickX = litanyBrick ? Math.round(litanyBrick.x) : ''; canvas.dataset.litanyBrickY = litanyBrick ? Math.round(litanyBrick.y) : '';
        const naturalBounce = comets[0] ? Math.atan2(comets[0].y - H / 2, comets[0].x - W / 2) + Math.PI : 0;
        const aimScore = b => Math.abs(angleDiff(Math.atan2(b.y - H / 2, b.x - W / 2), naturalBounce)) || 0;
        const aimSort = (a, b) => aimScore(a) - aimScore(b) || Math.hypot(a.x - (comets[0]?.x || W / 2), a.y - (comets[0]?.y || H / 2)) - Math.hypot(b.x - (comets[0]?.x || W / 2), b.y - (comets[0]?.y || H / 2));
        const eligibleAim = bricks.filter(b => b.hp > 0 && !b.bossCore && (!b.sealed || !bricks.some(k => k.key && k.hp > 0)));
        const keyAim = eligibleAim.filter(b => b.key).sort(aimSort)[0];
        const litanyAim = eligibleAim.filter(b => !b.key && b.order === litanyTarget).sort(aimSort)[0];
        const aimBrick = keyAim || (cathedralBoss?.stage === 2 ? bricks.find(b => b.hp > 0 && b.bossCore) : litanyAim || eligibleAim[0]);
        canvas.dataset.cathedralAimX = aimBrick ? Math.round(aimBrick.x) : ''; canvas.dataset.cathedralAimY = aimBrick ? Math.round(aimBrick.y) : '';
        canvas.dataset.cathedralAimOffset = aimBrick && comets[0] ? (angleDiff(naturalBounce, Math.atan2(aimBrick.y - H / 2, aimBrick.x - W / 2)) / .8).toFixed(3) : '';
        canvas.dataset.cathedralBossStage = cathedralBoss?.stage ?? ''; canvas.dataset.cathedralBossProgress = cathedralBoss?.progress ?? ''; canvas.dataset.cathedralBossTarget = cathedralBoss ? [3, 2, 2][cathedralBoss.stage] : '';
      }
      const incomingPickup = options.game === 'dash' ? falling.find(g => g.kind === 'pickup' && !g.taken) : null;
      const incomingDef = incomingPickup && powerUps.dash.find(p => p.id === incomingPickup.pickupId);
      const guidance = masterworkGuidance();
      canvas.dataset.controlPointer = controlPointer?.action || '';
      options.onUpdate?.({ phase, suspended, score, best, veteran, expedition: veteran ? canvas.dataset.expeditionName : '', next: names[queue?.[0] || 0], queue: queue.slice(), largest: names[largest], lives, combo, remaining: Math.ceil(remaining), danger: clamp(danger / dangerLimit(), 0, 1), drops, charge: Math.floor(charge), detail, result,
        relics: owned.slice(), offer: offer ? offer.slice() : null, synergies: activeSynergies(), stats: stats(), level,
        pact: { active: pact > 0, seconds: Math.ceil(pact), ready: pactReady(), used: pactUsed, failed: pactFailed },
        relicProgress: draftIndex < 4 ? { value: progressValue(), target: milestones[options.game][draftIndex], label: progressLabels[options.game] } : { value: owned.length, target: 4, label: 'relics collected' },
        pickup: activePower ? { id: activePower.id, name: activePower.name, glyph: activePower.glyph, remaining: activePower.remaining, total: activePower.duration } : null,
        incoming: incomingDef ? { id: incomingDef.id, name: incomingDef.name, x: Math.round(incomingPickup.x) } : null,
        mission: currentMission() ? { ...currentMission(), progress: Math.floor(missionProgress), done: missionDone } : null,
        masterwork: guidance ? { ...guidance, controls: controlRects(), censerControl: censerTouchRect() } : null,
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
      const fallbackAfter = draftIndex === 0 ? (options.game === 'dash' ? 8 : 14) : 34;
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
      accumulator = 0; last = 0; clearInput(); schedule(); notify();
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
      const earned = Math.round(value * (pact > 0 ? 2 : 1));
      score += earned; best = Math.max(best, score);
      popups.push({ x, y, text: pact > 0 && value ? `✦ ×2 · +${earned}` : (label || `+${earned}`), life: 1.1, colour: '#f1f4ac' });
      if (popups.length > 14) popups.shift();
    }
    function clearInput() {
      const captured = pointerId, controlCaptured = controlPointer?.id ?? null;
      keys.clear(); pointerHeld = false; pointerId = null; pointerAim = null; dropArmed = false; aimVelocity = 0; aimStamp = 0;
      controlPointer = null; pointerBrace = false; pointerRein = false; mergeBracing = false; umbraRein = false; dashAnchor = false;
      if (paddle) paddle.target = paddle.angle;
      if (tether) tetherAwaitingPress = true;
      if (captured !== null && canvas.hasPointerCapture?.(captured)) canvas.releasePointerCapture(captured);
      if (controlCaptured !== null && canvas.hasPointerCapture?.(controlCaptured)) canvas.releasePointerCapture(controlCaptured);
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
      const breachedPact = pact > 0;
      if (breachedPact) { pact = 0; pactFailed = true; banner('PACT BROKEN — SHIELDS CANNOT HELP', '#f58e9b', 16); }
      if (shields > 0 && !breachedPact) {
        shields--; invulnerable = 1; relicField(x, y, 64, '#9ed7c6'); burst(x, y, '#9ed7c6', 20);
        // Moonshield's lesson: a blocked meteor charges the dash.
        if (options.game === 'dash') { charge = Math.min(100, charge + 20); lastHitTime = time; }
        punch(.3, .04); motif([[622, 0, .16, 'triangle', .05], [466.16, .02, .2, 'triangle', .04]]);
        if (options.game === 'dash' && has('lodestone') && has('star-aegis')) { magnet = Math.max(magnet, 3); relicField(x, y, 300); }
        if (options.game === 'hop' && has('ring-reactor') && has('comet-aegis')) { ship.vx = Math.max(ship.vx, 410); ship.vy = clamp(ship.vy, -90, 90); flightBoost = Math.max(flightBoost, 1.2); }
        return;
      }
      lives--; combo = 0; invulnerable = 1.6; shake = 12; flash = .15;
      lastHitTime = time;
      // A lost heart stops the world for a beat; the last heart dreads slower.
      punch(0, .1); if (lives === 1 && !reduced) punch(.5, .25);
      burst(x, y, '#f58e9b', 28); tone(100, .23, 'sawtooth', .055);
      if (lives <= 0) finish(options.game === 'hop' ? 'A spectacular re-entry.' : 'The cosmos wins this round.', 1.3);
      notify();
    }
    function newWorld() {
      const x = nextWorld, y = 160 + random() * 240, r = 27 + random() * 15;
      const route = routeMod && x < routeMod.until ? routeMod.kind : null;
      worlds.push({ x, y, r, tier: Math.floor(random() * 9) });
      rings.push({ x: x + 190, y: clamp(y + (random() - .5) * 190, 80, H - 80), taken: false });
      // Gold routes bloom with extra rings; moon routes hold the rocks back.
      if (route === 'gold' && random() < .55) rings.push({ x: x + 260, y: clamp(y + (random() - .5) * 260, 80, H - 80), taken: false });
      if (x > 900 && route !== 'moon') rocks.push({ x: x + 110, y: y < H / 2 ? H - 95 - random() * 70 : 80 + random() * 70, r: 20 + random() * 10, grazed: false });
      if (route === 'storm' && random() < .5) rocks.push({ x: x + 260, y: 90 + random() * (H - 180), r: 18 + random() * 9, grazed: false });
      nextWorld += 370 + random() * 80;
    }
    function newSurfExpeditionSegment() {
      const index = surfRouteIndex++, def = surfExpeditionPatterns[index % surfExpeditionPatterns.length];
      const cycle = Math.floor(index / surfExpeditionPatterns.length), x = nextSurfRoute;
      const y = clamp(def.binaryY + [0, 32, -28][cycle % 3], 125, H - 125);
      const radius = 48 + (index % 2) * 8, angle = index * 1.17;
      const a = { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius, r: 31, tier: 6, binary: true };
      const b = { x: x - Math.cos(angle) * radius, y: y - Math.sin(angle) * radius, r: 27, tier: 2, binary: true };
      worlds.push(a, b); binarySystems.push({ x, y, radius, angle, speed: def.spin, a, b });
      rings.push({ x, y, taken: false, twin: true });
      // Authored solar currents are route terrain, not decorative weather. Their
      // vertical shear bends free flight and hastens/delays a binary orbit.
      surfCurrents.push({ x: x + 62, width: 260, y: clamp(y + (index % 2 ? -118 : 118), 85, H - 85), height: 104, direction: index % 2 ? -1 : 1, strength: 125 + cycle * 8, phase: index * .7 });
      const addGate = (gx, baseY, suffix = 0) => {
        const gate = { x: gx, baseY, gapY: baseY, gap: def.gap, pattern: def.gate, label: def.label + (suffix ? ' · RETURN' : ''), phase: index * .83 + suffix * Math.PI, passed: false, struck: false, cooldown: 0, suffix };
        surfGates.push(gate);
        if (def.gate === 'crown') {
          rings.push({ x: gx, y: baseY - 61, taken: false, gate, lane: -1 });
          rings.push({ x: gx, y: baseY + 61, taken: false, gate, lane: 1 });
        } else rings.push({ x: gx, y: baseY, taken: false, gate, lane: 0 });
      };
      addGate(x + 285, def.y);
      if (def.gate === 'scissor') addGate(x + 375, H - def.y, 1);
      nextSurfRoute += def.gate === 'scissor' ? 720 : 640;
    }
    function updateSurfExpedition(dt) {
      for (const system of binarySystems) {
        system.angle += system.speed * dt;
        system.a.x = system.x + Math.cos(system.angle) * system.radius; system.a.y = system.y + Math.sin(system.angle) * system.radius;
        system.b.x = system.x - Math.cos(system.angle) * system.radius; system.b.y = system.y - Math.sin(system.angle) * system.radius;
      }
      for (const gate of surfGates) {
        gate.cooldown = Math.max(0, gate.cooldown - dt);
        if (gate.pattern === 'drift') gate.gapY = clamp(gate.baseY + Math.sin(time * 1.05 + gate.phase) * 108, 95, H - 95);
        else if (gate.pattern === 'scissor') gate.gapY = clamp(gate.baseY + Math.sin(time * 1.35 + gate.phase) * 42, 90, H - 90);
        else if (gate.pattern === 'crown') gate.gapY = gate.baseY + Math.sin(time * .7 + gate.phase) * 30;
        else gate.gapY = gate.baseY;
        gate.currentGap = gate.pattern === 'iris' ? 112 + (Math.sin(time * 1.45 + gate.phase) * .5 + .5) * 72 : gate.gap;
      }
      for (const ring of rings) if (ring.gate && !ring.attracted) ring.y = ring.gate.gapY + ring.lane * 61;
      binarySystems = binarySystems.filter(s => s.x > camera - 350 || tether?.planet === s.a || tether?.planet === s.b);
      surfGates = surfGates.filter(g => g.x > camera - 80);
      surfCurrents = surfCurrents.filter(c => c.x + c.width > camera - 100);
    }
    function surfGateSafe(gate, y) {
      const inside = Math.abs(y - gate.gapY) < gate.currentGap / 2 - 7;
      // The crown's centre is solid; its two side lanes are the meaningful choice.
      return inside && (gate.pattern !== 'crown' || Math.abs(y - gate.gapY) > 28);
    }
    function initialiseSentries(count) {
      cathedralSentries = Array.from({ length: Math.min(3, count) }, (_, i) => {
        const angle = i / Math.max(1, count) * TAU + .4;
        return { angle, radius: 188, x: W / 2 + Math.cos(angle) * 188, y: H / 2 + Math.sin(angle) * 188, timer: 4.5 + i * 1.3, cooldown: 0, taken: false };
      });
    }
    function setupCathedralBoss(add, cx, cy) {
      cathedralBoss ||= { stage: 0, progress: 0, rebuild: 0 };
      choirSource = null; choirCharge = 0; choirBolts = []; choirTimer = cathedralBoss.stage === 1 ? .65 : 5.5;
      litanyProgress = 0; litanyTarget = 0; cathedralBoss.progress = 0; cathedralBoss.rebuild = 0;
      if (cathedralBoss.stage === 0) {
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; add(cx + Math.cos(a) * 125, cy + Math.sin(a) * 125, { order: i % 3, motion: 'rose', orbitR: 125, orbitA: a }); }
        initialiseSentries(1);
        banner('FINAL CATHEDRAL · I · THE LITANY', '#edf19b', 19);
        popups.push({ x: cx, y: cy + 170, text: 'STRIKE THE GLOWING ORDER THREE TIMES', colour: '#d9c7f3', life: 2.2, size: 11 });
      } else if (cathedralBoss.stage === 1) {
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; add(cx + Math.cos(a) * 156, cy + Math.sin(a) * 156, { key: true, motion: 'rose', orbitR: 156, orbitA: a }); }
        initialiseSentries(3);
        banner('FINAL CATHEDRAL · II · THE DISCORD', '#e29eb7', 19);
        popups.push({ x: cx, y: cy + 190, text: 'PARRY OR CENSER TWO DISCORD MOTES', colour: '#d9c7f3', life: 2.2, size: 11 });
      } else {
        add(cx, cy, { bossCore: true, order: 0 }); initialiseSentries(2);
        banner('FINAL CATHEDRAL · III · THE ROSE HEART', '#edf19b', 19);
        popups.push({ x: cx, y: cy + 92, text: 'TWO FOCUS BREAKS · ORDINARY GLASS CANNOT MARK IT', colour: '#d9c7f3', life: 2.2, size: 11 });
      }
      oneCrystal = false; launchTimer = 1.5;
    }
    function makeCathedralBricks() {
      choirSource = null; choirCharge = 0; choirBolts = []; choirTimer = 5.5; paddleHush = 0;
      const pattern = (level - 1) % cathedralPatterns.length, cx = W / 2, cy = H / 2;
      let serial = 0;
      const add = (x, y, options = {}) => {
        const key = !!options.key, armour = !key && !options.bossCore && !!options.armour;
        const brick = { x, y, baseX: x, baseY: y, r: options.r || (options.bossCore ? 29 : 15), hp: options.bossCore ? 4 : armour ? 2 : 1, tier: (serial++ + level * 2) % 8,
          hit: 0, angle: Math.atan2(y - cy, x - cx), family: null, key, sealed: !key && !!options.sealed, bossCore: !!options.bossCore, order: options.order ?? serial % 3,
          motion: options.motion || null, phase: options.phase || 0, orbitR: options.orbitR || 0, orbitA: options.orbitA || 0 };
        bricks.push(brick); return brick;
      };
      if (level >= 4 || cathedralBoss) { setupCathedralBoss(add, cx, cy); return; }
      initialiseSentries(level >= 2 ? Math.min(3, level) : 0);
      if (pattern === 0) {
        // Four aisles, a rounded arch and a small rose: a readable silhouette.
        for (const x of [-132, -88, 88, 132]) for (const y of [-65, -15, 35, 85]) {
          add(cx + x, cy + y, { armour: Math.abs(x) > 100 || y === 85, sealed: Math.abs(x) < 100, motion: 'nave', phase: (x > 0 ? Math.PI : 0) + y * .01 });
        }
        for (let i = 1; i < 8; i++) { const a = Math.PI + i / 8 * Math.PI; add(cx + Math.cos(a) * 160, cy + 25 + Math.sin(a) * 135, { armour: i % 2 === 0, motion: 'nave', phase: i * .3 }); }
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; add(cx + Math.cos(a) * 47, cy - 47 + Math.sin(a) * 47, { sealed: true, motion: 'nave', phase: i * .4 }); }
        // The threshold altar introduces armour on the opening serve.
        add(cx, cy + 104, { armour: true, motion: 'nave', phase: 0 });
        [[-176, 90], [176, 90], [-112, -127], [112, -127]].forEach(([x, y], i) => add(cx + x, cy + y, { key: true, motion: 'nave', phase: i * Math.PI / 2 }));
      } else if (pattern === 1) {
        for (const [count, radius, sealed] of [[8, 61, false], [12, 128, true]]) for (let i = 0; i < count; i++) {
          const a = i / count * TAU;
          add(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, { armour: radius > 100 && i % 2 === 0, sealed, motion: 'rose', orbitR: radius, orbitA: a });
        }
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; add(cx + Math.cos(a) * 174, cy + Math.sin(a) * 174, { key: true, motion: 'rose', orbitR: 174, orbitA: a }); }
      } else {
        for (const side of [-1, 1]) for (let i = 0; i < 6; i++) add(cx + side * 108, cy - 122 + i * 43, { armour: i % 2 === 0, sealed: i > 1, motion: 'spire', phase: side < 0 ? 0 : Math.PI });
        for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; add(cx + Math.cos(a) * 73, cy + 34 + Math.sin(a) * 143, { armour: i % 3 === 0, motion: 'spire', phase: i * .35 }); }
        for (let i = 0; i < 5; i++) add(cx - 64 + i * 32, cy + 104, { sealed: true, motion: 'spire', phase: i * .5 });
        [[-176, 20], [176, 20], [0, -153], [0, 54]].forEach(([x, y], i) => add(cx + x, cy + y, { key: true, motion: 'spire', phase: i * Math.PI / 2 }));
      }
      oneCrystal = false; launchTimer = 1.5;
      banner(`CATHEDRAL · ${cathedralPatterns[pattern]}`, '#d9c7f3', 18);
      popups.push({ x: W / 2, y: H * .3 + 34, text: 'BREAK THE FOUR KEYSTONES TO UNSEAL THE GLASS', colour: '#edf19b', life: 2.4, size: 12 });
    }
    function moveCathedralBricks() {
      if (!veteran) return;
      for (const b of bricks) {
        if (b.motion === 'rose') {
          const a = b.orbitA + time * (b.key ? -.1 : .13);
          b.x = W / 2 + Math.cos(a) * b.orbitR; b.y = H / 2 + Math.sin(a) * b.orbitR; b.angle = a;
        } else if (b.motion === 'spire') {
          b.x = b.baseX + Math.sin(time * .55 + b.phase) * 7; b.y = b.baseY + Math.sin(time * .9 + b.phase) * 20;
        } else if (b.motion === 'nave') {
          b.x = b.baseX + Math.sin(time * .85 + b.phase) * 13; b.y = b.baseY + Math.cos(time * .6 + b.phase) * 5;
        }
      }
    }
    function makeBricks() {
      // The old constellation leaves a two-second ghost behind the new one.
      if (bricks?.length && bricks.every(b => !b.hp)) ghosts = bricks.map(b => ({ x: b.x, y: b.y, r: b.r, tier: b.tier, at: visualTime }));
      bricks = [];
      if (veteran && options.game === 'breaker') { makeCathedralBricks(); return; }
      // A daily board should be a daily board: the seed rotates the rings and picks armoured crystals.
      const rotation = random() * TAU;
      [62, 111, 157].forEach((radius, ring) => {
        // Wave one is sparse on purpose: the opening should need the paddle,
        // not cascade into free points while the player watches.
        const count = level === 1 ? 4 + ring * 3 : 6 + ring * 4;
        for (let i = 0; i < count; i++) {
          const a = i / count * TAU + ring * .27 + rotation;
          const armoured = level > 1 && random() < .34;
          // Crystal families arrive from wave two: pulse crystals slow time
          // when broken; one heart crystal per wave gives a life back.
          const family = level > 1 && !armoured && random() < .16 ? 'pulse' : null;
          bricks.push({ x: W / 2 + Math.cos(a) * radius, y: H / 2 + Math.sin(a) * radius, r: 15, hp: armoured ? 2 : 1, tier: (i + ring * 3 + level) % 8, hit: 0, angle: a, family });
        }
      });
      if (level > 1 && bricks.length) {
        const heartIndex = Math.floor(random() * bricks.length);
        if (bricks[heartIndex].hp === 1) bricks[heartIndex].family = 'heart';
      }
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
        const giftsUntil = expedition ? expeditionLength() - 15 : 67; // The last stretch stays gift-free.
        while (at < giftsUntil) {
          let def = powerUps.dash[Math.floor(pickupRandom() * powerUps.dash.length)];
          if (def.id === previous) def = powerUps.dash.find(p => p.id !== previous);
          pickupSchedule.push({ time: at, id: def.id, x: 60 + pickupRandom() * (W - 120), fired: false });
          previous = def.id;
          at += 18 + pickupRandom() * 6;
        }
      }
      activePower = null; slow = 0;
      dashStageIndex = -2; missionProgress = 0; missionDone = false; lastHitTime = -99; giftCollected = false; whale = null; breathLanes = [];
      mergeGravityX = 0; mergeForecast = null; mergeForecastEvents = 0; mergeForecastKey = '';
      binarySystems = []; surfGates = []; surfRouteIndex = 0; nextSurfRoute = 900; surfGatesPassed = 0; surfGateHits = 0;
      umbraLightX = W / 2; umbraCatches = 0; umbraMisses = 0;
      cathedralSealBlocks = 0; cathedralArmourDents = 0; lastSealNote = -99;
      mergeGrip = 100; mergeBracing = false; anchorDrops = 0; anchorMerges = 0; anchorShelters = 0;
      surfCharge = veteran && options.game === 'hop' ? 50 : 0; surfSwaps = 0; surfHooks = 0;
      umbraLumen = veteranExpedition ? 35 : 0; umbraRein = false; eclipseCatches = 0; shadesSpawned = 0; shadesBroken = 0;
      cathedralFocusReturns = 0; cathedralFocusBreaks = 0; paddleHush = 0;
      choirTimer = 5.5; choirSource = null; choirCharge = 0; choirBolts = []; choirShots = 0; choirParries = 0; choirHushes = 0;
      mergeShelves = veteran && options.game === 'merge' ? [{ x: 105, y: 350, half: 58, side: -1, slope: 0 }, { x: 362, y: 292, half: 72, side: 1, slope: 0 }] : [];
      mergeEnemies = []; mergeResonance = veteran && options.game === 'merge' ? 60 : 0; mergeEnemyTimer = 10; mergeKills = 0; mergeShelfContacts = 0; mergeTunedDrops = 0; mergeTuneQueued = false; mergeBoss = null;
      surfCurrents = []; surfHunters = []; surfVeil = 0; surfHunterTimer = 7; surfCurrentTime = 0; surfVeilBreaks = 0; surfHunterReflections = 0; regentHunterCrown = 0; surfBoss = null; surfBossRings = 0;
      dashTide = 0; dashTideName = ''; dashAnchor = false; dashMothTimer = 9; dashBanks = 0; dashBankedStars = 0; dashMothsBroken = 0; dashMothThefts = 0;
      censerTime = 0; censerBanishes = 0; cathedralSentries = []; sentryBreaks = 0; litanyTarget = 0; litanyProgress = 0; litanyCompletions = 0; cathedralFocusHeartBreaks = 0; cathedralBoss = null;
      owned = []; offer = null; suspended = false; draftIndex = 0; lastDraftTime = 0; draftFallbacks = 0;
      maxMetres = 0; totalCatches = 0; crystalHits = 0; ringsCaught = 0; shields = 0; shieldCharge = 0;
      orbitCharge = 0; flightBoost = 0; reactorRings = 0; clockCatches = 0; splitHits = 0; ward = 0; wardReturns = 0; tetherAwaitingPress = false; releases = 0; routeMod = null;
      fields = []; echoes = []; guidedBall = null; lastDirection = 1; finishDelay = 0; finishTotal = 0; finishWon = false; visualTime = 0;
      timeScale = 1; timeKick = 0; zoom = 1; glow = 0; kick = 0; flashTint = '245,142,155';
      draftWarn = 0; stirred = -1; draftTimes = []; pileT = 0; peakBand = 0; lastThump = 0;
      surgeUntil = 0; lastTen = false; dashAct = 1; lastTickSec = -1; lastActTick = -1;
      oneCrystal = false; lastBeacon = 0; ghosts = []; sprayT = 0; chargeStep = 0; music = null;
      pact = 0; pactUsed = false; pactFailed = false;
      phase = 'ready'; score = 0; time = 0; accumulator = 0; last = 0; result = ''; notifyTimer = 0;
      particles = []; ripples = []; popups = []; shake = 0; flash = 0; clearInput();
      charge = options.game === 'dash' ? 100 : 0; combo = 0; comboTimer = 0; lives = 3; invulnerable = 0; level = 1; totalMerges = 0;
      balls = []; queue = [0, Math.floor(random() * 4), Math.floor(random() * 4)]; cooldown = 0; danger = 0; largest = 0; drops = 0;
      // Tonight's forecast shapes the jar before the first drop falls.
      gravityScale = forecastPick === 'lowgrav' ? .75 : 1;
      if (forecastPick === 'lookahead') queue.push(Math.floor(random() * 4));
      camera = 0; nextWorld = 250; worlds = []; rings = []; rocks = []; tether = null; tetherAwaitingPress = false; distanceScore = 0;
      ship = { x: 80, y: 235, vx: 235, vy: -30, trail: [] };
      while (nextWorld < 1600) newWorld();
      if (veteran && options.game === 'hop') while (nextSurfRoute < 1600) newSurfExpeditionSegment();
      // Two settled companions greet the first drop — more on a crowded night.
      // Spaced so nothing starts overlapping or mid-merge.
      if (options.game === 'merge') {
        const seededJar = [[-58, 0, .2], [62, 1, -.3], [0, 2, .1], [-124, 0, -.15], [124, 1, .25]];
        seededJar.slice(0, forecastPick === 'crowded' ? 5 : 2).forEach(([ox, tier, angle]) => {
          balls.push({ x: W / 2 + ox, y: H - 27 - radii[tier], vx: 0, vy: 0, tier, age: 5, angle, squash: 0, born: 0 });
        });
      }
      catcher = { x: W / 2, vx: 0, tilt: 0 }; falling = []; spawn = .8; remaining = expedition ? expeditionLength() : 75; wave = 0; dashTime = 0; magnet = 0;
      paddle = { angle: Math.PI / 2, target: Math.PI / 2 }; comets = [{ x: W / 2, y: H / 2 + 210, vx: 0, vy: -290, trail: [], secondary: false, focus: 0, pierceGrace: 0, lastPierce: null }]; slowTime = 0;
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
      schedule(); notify(); canvas.focus({ preventScroll: true });
    }
    function pause() {
      if (phase !== 'running') return;
      phase = 'paused'; accumulator = 0; clearInput();
      motif([[440, 0, .12], [329.63, .1, .22]], .032);
      audio?.suspend();
      schedule(); notify();
    }
    function resume() {
      if (phase !== 'paused' || document.hidden || destroyed) return;
      phase = 'running'; last = 0; accumulator = 0; clearInput();
      if (sound) { audio?.resume().catch(() => {}); motif([[329.63, 0, .1], [440, .08, .16]], .032); }
      schedule(); notify(); canvas.focus({ preventScroll: true });
    }
    function invokePact() {
      if (!pactReady()) return false;
      pactUsed = true; pactFailed = false; pact = 12;
      banner('STELLAR PACT · DOUBLE POINTS', '#edf19b', 19);
      relicField(W / 2, H / 2, Math.min(W, H) * .36, '#edf19b', 1.2);
      light('237,241,155', .12, .8); kick = .8;
      motif([[392, 0, .2], [523.25, .11, .25], [783.99, .25, .36]], .06);
      notify(); return true;
    }
    function ability() {
      if (phase !== 'running' || suspended) return;
      if (options.game === 'hop') {
        if (!veteran) return;
        if (tether?.planet?.binary && surfCharge >= 25) {
          const system = binarySystems.find(s => s.a === tether.planet || s.b === tether.planet);
          if (!system) return;
          const from = tether.planet, to = from === system.a ? system.b : system.a;
          tether.planet = to; tether.angle += Math.PI; tether.direction *= -1;
          ship.x = to.x + Math.cos(tether.angle) * tether.radius; ship.y = to.y + Math.sin(tether.angle) * tether.radius;
          surfCharge -= 25; surfSwaps++; invulnerable = Math.max(invulnerable, .25);
          fields.push({ x: from.x - camera, y: from.y, toX: to.x - camera, toY: to.y, radius: 40, colour: '#edf19b', life: .45, max: .45 });
          relicField(ship.x - camera, ship.y, 42, '#d9c7f3', .45); banner('TWIN SWAP · RELEASE ON THE OTHER BEAT', '#d9c7f3', 13);
          tone(740, .14, 'sine', .05); notify(); return;
        }
        if (!tether && surfCharge >= 50) {
          const candidates = worlds.map(w => ({ w, distance: Math.hypot(w.x - ship.x, w.y - ship.y) }))
            .filter(p => p.w.x > ship.x - 50 && p.distance < 430 && p.distance > p.w.r + 15).sort((a, b) => a.distance - b.distance);
          if (!candidates.length) return;
          const p = candidates[0].w, dx = ship.x - p.x, dy = ship.y - p.y;
          tether = { planet: p, radius: Math.max(p.r + 40, candidates[0].distance), angle: Math.atan2(dy, dx), direction: dx * ship.vy - dy * ship.vx >= 0 ? 1 : -1 };
          orbitCharge = 0; chargeStep = 0; surfCharge -= 50; surfHooks++;
          tetherAwaitingPress = !(pointerHeld || keys.has(' ') || keys.has('ArrowUp'));
          relicField(p.x - camera, p.y, tether.radius, '#d9c7f3', .55); banner('STARHOOK · HOLD, THEN RELEASE TO FLY', '#edf19b', 14);
          tone(520, .16, 'triangle', .05); notify(); return;
        }
        return;
      }
      if (charge < 100) return;
      charge = 0;
      if (options.game === 'merge') {
        balls.forEach(b => { b.vx += aim < W / 2 ? -110 : 110; b.vy -= has('pulse-dynamo') ? 190 : 130; });
        if (veteran) for (const enemy of mergeEnemies) if (enemy.state !== 'telegraph') killMergeEnemy(enemy);
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
    // Second Masterwork verb: one key and one equally large canvas pad per
    // cartridge. Each spends a resource already earned through the core loop.
    function masterAbility() {
      if (!veteran || phase !== 'running' || suspended) return false;
      if (options.game === 'merge') {
        if (mergeResonance < 30) return false;
        const target = balls.filter(b => b.age > .25 && b.tier <= 4).sort((a, b) => Math.abs(a.x - aim) - Math.abs(b.x - aim) || b.y - a.y)[0];
        if (!target) return false;
        mergeResonance -= 30; queue[0] = target.tier; mergeTuneQueued = true; aim = clamp(target.x, radii[target.tier] + 24, W - radii[target.tier] - 24);
        relicField(target.x, target.y, radii[target.tier] + 24, '#edf19b', .5); banner(`TUNED TO ${names[target.tier].toUpperCase()} · DROP TO CONDUCT`, '#edf19b', 12);
        tone(659.25, .14, 'triangle', .04); notify(); return true;
      }
      if (options.game === 'hop') {
        if (surfVeil > 0 || surfCharge < 25) return false;
        surfCharge -= 25; surfVeil = 1.55;
        if (tether) orbitCharge = Math.max(0, orbitCharge - .35); else ship.vx *= .82;
        invulnerable = Math.max(invulnerable, .12);
        relicField(ship.x - camera, ship.y, 60, '#d9c7f3', .7); banner('MIRROR VEIL · REFLECT, BUT LOSE SPEED', '#d9c7f3', 13);
        tone(880, .2, 'sine', .045); notify(); return true;
      }
      if (options.game === 'dash') {
        if (!veteranExpedition || combo < 3 && !whale?.caught) return false;
        const offered = combo;
        if (offered) {
          dashBanks++; dashBankedStars += offered; umbraLumen = Math.min(100, umbraLumen + offered * 2); charge = Math.min(100, charge + offered * 1.5);
          scoreAt(offered * 12, catcher.x, H - 124, `BANK ${offered} · +${offered * 12}`); combo = 0; comboTimer = 0;
        }
        if (whale && veteranExpedition && whale.caught > 0 && whale.finaleStage < 3) {
          const target = [3, 4, 5][whale.finaleStage], deposit = Math.min(whale.caught, target - whale.banked);
          whale.caught -= deposit; whale.banked += deposit; dashBanks++; dashBankedStars += deposit;
          scoreAt(deposit * 45, W / 2, 150, `BREATH OFFERED · ${whale.banked}/${target}`);
          if (whale.banked >= target) {
            whale.finaleStage++; whale.banked = 0; whale.timer = 1.2; whale.telegraph = 0; breathLanes = [];
            burst(W / 2, 110, '#edf19b', 35); motif([[523.25, 0, .15], [783.99, .12, .25]], .05);
            if (whale.finaleStage >= 3) { finish('The Umbra Whale carries your three offerings beyond dawn.', 1.6, true); return true; }
            banner(`WHALE CHOIR ${whale.finaleStage + 1} · THE BREATH QUICKENS`, '#9ed7c6', 17);
          }
        }
        for (const f of falling) if (f.moth && !f.taken && Math.abs(f.x - catcher.x) < 210) { f.fleeing = true; f.wait = 0; f.speed = -190; }
        relicField(catcher.x, H - 72, 115, '#edf19b', .55); tone(523.25, .18, 'triangle', .05); notify(); return true;
      }
      if (charge < 40 || censerTime > 0) return false;
      charge -= 40; censerTime = 5.2; choirSource && (choirCharge += .8);
      relicField(W / 2, H / 2, 145, '#d9c7f3', .7); banner('ROSE CENSER · GRAVITY BENDS BOTH WAYS', '#d9c7f3', 13);
      tone(293.66, .35, 'sine', .05); notify(); return true;
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
        if (veteran && mergeTuneQueued) { guidedBall.tuned = true; mergeTunedDrops++; mergeTuneQueued = false; }
        if (veteran && mergeForecast?.telegraph) {
          guidedBall.anchorKey = mergeForecastKey; anchorDrops++;
          popups.push({ x: guidedBall.x, y: 92, text: 'ANCHOR CAST · HOLDS THROUGH THIS FRONT', colour: '#d9c7f3', life: 1.8, size: 11 });
          relicField(guidedBall.x, 65, 34, '#d9c7f3', .5);
        }
        balls.push(guidedBall);
        burst(guidedBall.x, 52, colours[tier], 6, 90); light('223,172,127', .02, .08);
        drops++; cooldown = .5; tone(200 + tier * 60, .09, 'triangle'); notify();
      } else if (options.game === 'dash' || options.game === 'breaker') ability();
    }
    function updateMergeForecast() {
      if (!veteran) { mergeGravityX = 0; mergeForecast = null; return; }
      const cycle = Math.floor(time / MERGE_FORECAST_CYCLE), local = time - cycle * MERGE_FORECAST_CYCLE;
      const index = mergeForecasts.findIndex(event => local >= event.at - 2.2 && local < event.at + event.duration);
      if (index < 0) {
        mergeForecast = null; mergeForecastKey = ''; mergeGravityX = 0;
        gravityScale = forecastPick === 'lowgrav' ? .75 : 1;
        return;
      }
      const def = mergeForecasts[index], telegraph = local < def.at, key = `${cycle}:${index}`;
      const wasTelegraph = mergeForecast?.telegraph;
      if (key !== mergeForecastKey && telegraph) {
        banner(`FORECAST · ${def.name}`, '#d9c7f3', 16);
        popups.push({ x: W / 2, y: H * .3 + 32, text: def.hint.toUpperCase(), colour: '#b7abc9', life: 2.1, size: 11 });
      }
      if (!telegraph && (key !== mergeForecastKey || wasTelegraph)) {
        mergeForecastEvents++; banner(def.name, '#edf19b', 18); tone(196, .3, 'triangle', .04);
      }
      mergeForecastKey = key;
      const elapsed = Math.max(0, local - def.at);
      const strength = telegraph ? 0 : clamp(Math.min(elapsed / 1.1, (def.duration - elapsed) / 1.1), 0, 1);
      mergeGravityX = def.pull * Math.sin(elapsed / def.period * TAU) * strength;
      gravityScale = (forecastPick === 'lowgrav' ? .75 : 1) * def.gravity;
      mergeForecast ||= {};
      Object.assign(mergeForecast, { name: def.name, hint: def.hint, telegraph, remaining: telegraph ? def.at - local : def.at + def.duration - local });
    }
    function spawnMergeEnemy(x = W / 2 + Math.sin(time * 1.73) * 150) {
      if (mergeEnemies.length >= 3) return false;
      mergeEnemies.push({ x: clamp(x, 48, W - 48), y: 96, vy: 0, r: 16, state: 'telegraph', timer: 1.35, target: null, phase: mergeEnemies.length * 1.7 });
      return true;
    }
    function killMergeEnemy(enemy) {
      if (!enemy || enemy.taken || enemy.state === 'telegraph') return false;
      enemy.taken = true; mergeKills++; mergeResonance = Math.min(100, mergeResonance + 22);
      scoreAt(120, enemy.x, enemy.y - 24, 'GARGOYLE UNMADE +120'); burst(enemy.x, enemy.y, '#d9c7f3', 18); relicField(enemy.x, enemy.y, 58, '#edf19b', .45);
      tone(740, .13, 'triangle', .05); return true;
    }
    function startMergeBoss() {
      if (mergeBoss) return;
      mergeBoss = { stage: 0, progress: 0, timer: 4.5, telegraph: 0, tolls: 0 };
      mergeEnemies = []; mergeEnemyTimer = 2.5;
      banner('FINALE · THE HOROLOGIST WAKES', '#edf19b', 21);
      popups.push({ x: W / 2, y: H * .3 + 35, text: 'THREE MOVEMENTS · MERGE THROUGH THE TOLLS', colour: '#d9c7f3', life: 2.4, size: 11 });
      motif([[196, 0, .35, 'triangle', .05], [293.66, .18, .4, 'sine', .04]], .05);
    }
    function mergeBossMerge(x, y) {
      if (!mergeBoss || phase !== 'running') return;
      mergeBoss.progress++; scoreAt(100 * (mergeBoss.stage + 1), x, y - 48, `HOROLOGIST SEAL ${mergeBoss.progress}/${[1, 2, 3][mergeBoss.stage]}`);
      if (mergeBoss.progress < [1, 2, 3][mergeBoss.stage]) return;
      mergeBoss.stage++; mergeBoss.progress = 0; mergeBoss.timer = 3.2; mergeBoss.telegraph = 0;
      if (mergeBoss.stage >= 3) {
        for (const enemy of mergeEnemies) if (enemy.state !== 'telegraph') killMergeEnemy(enemy);
        finish('The Horologist strikes a thirteenth, impossible hour: yours.', 1.7, true); return;
      }
      banner(`HOROLOGIST · MOVEMENT ${mergeBoss.stage + 1}`, '#d9c7f3', 18);
      popups.push({ x: W / 2, y: H * .3 + 32, text: mergeBoss.stage === 1 ? 'GARGOYLES WEIGH THE GLASS · SHOCK THEM FREE' : 'THE FINAL TOLL · BRACE, TUNE, AND ANCHOR', colour: '#edf19b', life: 2.1, size: 11 });
      spawnMergeEnemy(W / 2 - 110); spawnMergeEnemy(W / 2 + 110);
    }
    function updateMergeDeep(dt) {
      if (!veteran) return;
      if (!mergeBoss && (totalMerges >= 6 || time >= 70)) startMergeBoss();
      mergeEnemyTimer -= dt;
      if (time > 11 && mergeEnemyTimer <= 0 && mergeEnemies.length < (mergeBoss ? 3 : 2)) {
        spawnMergeEnemy(); mergeEnemyTimer = mergeBoss ? 7.5 : 12;
      }
      for (const shelf of mergeShelves) {
        const target = mergeBracing ? 0 : clamp(mergeGravityX / 520 + Math.sin(time * .65 + shelf.side) * .11, -.32, .32);
        shelf.slope += (target - shelf.slope) * (1 - Math.exp(-4 * dt));
      }
      for (const enemy of mergeEnemies) {
        if (enemy.taken) continue;
        if (enemy.state === 'telegraph') {
          enemy.timer -= dt;
          if (enemy.timer <= 0) { enemy.state = 'descending'; enemy.vy = 20; tone(130.81, .2, 'square', .035); }
          continue;
        }
        if (enemy.state === 'descending') {
          enemy.vy += 250 * dt; enemy.y += enemy.vy * dt;
          let landing = H - 45;
          for (const b of balls) if (Math.abs(b.x - enemy.x) < radii[b.tier] + enemy.r) landing = Math.min(landing, b.y - radii[b.tier] - enemy.r + 5);
          for (const shelf of mergeShelves) if (Math.abs(shelf.x - enemy.x) < shelf.half) landing = Math.min(landing, shelf.y + (enemy.x - shelf.x) * shelf.slope - enemy.r);
          if (enemy.y >= landing) { enemy.y = landing; enemy.state = 'latched'; enemy.target = null; }
        } else {
          if (!balls.includes(enemy.target)) enemy.target = balls.slice().sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y))[0] || null;
          const target = enemy.target;
          if (target) {
            enemy.x += clamp(target.x - enemy.x, -75 * dt, 75 * dt); enemy.y += clamp(target.y - radii[target.tier] - enemy.r - enemy.y, -95 * dt, 95 * dt);
            target.vy += 115 * dt; target.vx += clamp(enemy.x - target.x, -25, 25) * dt;
            if (target.anchorKey) target.vx += mergeGravityX * .45 * dt; // Gargoyles worry at anchors rather than ignoring them.
          } else enemy.y = Math.min(H - 45, enemy.y + 45 * dt);
        }
      }
      mergeEnemies = mergeEnemies.filter(e => !e.taken);
      if (mergeBoss) {
        mergeBoss.timer -= dt;
        if (mergeBoss.timer <= 0 && mergeBoss.telegraph <= 0) { mergeBoss.telegraph = 1.45; mergeBoss.timer = Math.max(4.2, 7 - mergeBoss.stage * .8); tone(146.83, .35, 'triangle', .045); }
        if (mergeBoss.telegraph > 0) {
          mergeBoss.telegraph -= dt;
          if (mergeBoss.telegraph <= 0) {
            mergeBoss.tolls++;
            const direction = mergeBoss.tolls % 2 ? 1 : -1;
            for (const b of balls) {
              const anchored = b.anchorKey && b.anchorKey === mergeForecastKey && mergeForecast;
              b.vx += direction * (mergeBracing ? 42 : anchored ? 55 : 185) * (1 + mergeBoss.stage * .18); b.vy -= mergeBracing ? 15 : 55;
            }
            if (mergeBoss.stage > 0) spawnMergeEnemy(direction > 0 ? 70 : W - 70);
            shake = Math.max(shake, 7); banner('THE HOROLOGIST TOLLS', '#f5a08c', 15); tone(98, .45, 'sine', .07);
          }
        }
      }
    }
    function mergeStep(dt) {
      updateMergeForecast();
      updateMergeDeep(dt);
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
      mergeBracing = veteran && (pointerBrace || keys.has('s') || keys.has('ArrowDown')) && mergeGrip > 0;
      if (veteran) mergeGrip = clamp(mergeGrip + dt * (mergeBracing ? -30 : 18), 0, 100);
      const anchors = veteran ? balls.filter(b => b.anchorKey && b.anchorKey === mergeForecastKey && mergeForecast) : [];
      anchorShelters = 0;
      balls.forEach(b => {
        const previousY = b.y;
        b.age += dt; b.born = Math.max(0, b.born - dt); b.squash *= Math.exp(-12 * dt); b.shelfCooldown = Math.max(0, (b.shelfCooldown || 0) - dt);
        const anchored = anchors.includes(b), sheltered = !anchored && anchors.some(a => Math.hypot(a.x - b.x, a.y - b.y) < 105 + radii[b.tier]);
        if (sheltered) anchorShelters++;
        const forecastForce = mergeBracing ? .12 : anchored ? .08 : sheltered ? .45 : 1;
        if (veteran) b.vx += mergeGravityX * forecastForce * dt;
        b.vy += (400 * gravityScale * (mergeBracing ? 1.25 : 1) + Math.min(140, danger * 50)) * dt;
        b.vx *= Math.exp(-(.38 + (mergeBracing ? 3.5 : 0) + (anchored ? 5 : sheltered ? 1.5 : 0)) * dt);
        b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.vx / radii[b.tier] * dt * .35;
        if (veteran && b.vy >= 0 && !b.shelfCooldown) for (const shelf of mergeShelves) {
          if (Math.abs(b.x - shelf.x) > shelf.half + radii[b.tier] * .25) continue;
          const surface = shelf.y + (b.x - shelf.x) * shelf.slope, radius = radii[b.tier];
          if (previousY + radius <= surface + 3 && b.y + radius >= surface) {
            b.y = surface - radius; b.vy = -Math.abs(b.vy) * .16; b.vx += shelf.slope * 90; b.shelfCooldown = .14; mergeShelfContacts++;
            b.squash = Math.min(.18, Math.abs(b.vy) / 900); tone(164.81 + b.tier * 24, .07, 'triangle', .025); break;
          }
        }
      });
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
              const anchorKey = a.anchorKey || b.anchorKey;
              const anchoredMerge = veteran && anchorKey && anchorKey === mergeForecastKey && mergeForecast;
              const anchorChime = anchoredMerge && !mergeForecast.telegraph;
              balls.splice(j, 1); balls.splice(i, 1);
              if (tier < names.length) balls.push({ x, y, vx: (a.vx + b.vx) * .35, vy: -55, tier, age: 0, angle: 0, squash: -.2, born: .32, anchorKey: anchoredMerge ? anchorKey : null });
              if (anchorChime) {
                anchorMerges++; charge = Math.min(100, charge + 25); scoreAt(100, x, y - 42, 'COUNTERWEIGHT CHIME +100');
                for (const b of balls) if (Math.hypot(b.x - x, b.y - y) < 150) b.vx *= has('quake-core') ? .3 : .6;
                banner('COUNTERWEIGHT CHIME · THE PILE ANSWERS', '#d9c7f3', 13);
              }
              largest = Math.max(largest, Math.min(10, tier)); totalMerges++; combo++;
              if (veteran) {
                mergeResonance = Math.min(100, mergeResonance + 16 + Math.min(12, tier * 2));
                for (const enemy of mergeEnemies) if (!enemy.taken && enemy.state !== 'telegraph' && Math.hypot(enemy.x - x, enemy.y - y) < 112 + tier * 8) killMergeEnemy(enemy);
                mergeBossMerge(x, y);
              }
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
      if (pact > 0 && danger > 0) danger += dt * 1.2; // The wager accelerates overflow risk.
      if (danger > dangerLimit() || balls.length > 110) finish('One very full universe.', 1.4);
    }
    function spawnSurfHunter() {
      if (surfHunters.length >= 3) return false;
      surfHunters.push({ x: camera + W + 65, y: clamp(ship.y + Math.sin(time * 1.9) * 150, 55, H - 55), vx: 0, vy: 0, state: 'stalk', timer: 1.25, targetX: ship.x, targetY: ship.y, r: 15 });
      return true;
    }
    function startSurfBoss() {
      if (surfBoss) return;
      surfBoss = { stage: 0, progress: 0 }; surfHunterTimer = 1.2;
      banner('FINALE · THE BINARY REGENT', '#edf19b', 21);
      popups.push({ x: W / 2, y: H * .3 + 34, text: 'THREE CROWNS · RINGS, GATES AND REFLECTED HUNTERS', colour: '#d9c7f3', life: 2.4, size: 11 });
      motif([[220, 0, .3, 'triangle', .05], [440, .12, .35, 'sine', .04]], .05);
    }
    function advanceSurfBoss(source, x, y) {
      if (!surfBoss || phase !== 'running') return;
      // The first crown is navigation; later crowns also accept a reflected
      // hunter, so defensive mastery is a genuine alternative route.
      if (surfBoss.stage === 0 && source === 'hunter') return;
      if (surfBoss.stage === 1 && source !== 'hunter' && surfBoss.progress >= 1) return;
      surfBoss.progress += surfBoss.stage === 1 && source === 'hunter' ? 2 : 1;
      scoreAt(140 * (surfBoss.stage + 1), x, y, `REGENT CROWN ${surfBoss.progress}/${[2, 2, 3][surfBoss.stage]}`);
      if (surfBoss.progress < [2, 2, 3][surfBoss.stage]) return;
      if (surfBoss.stage === 1 && source === 'hunter') regentHunterCrown = 1;
      surfBoss.stage++; surfBoss.progress = 0;
      if (surfBoss.stage >= 3) { finish('The Binary Regent yields its crown to your wake.', 1.7, true); return; }
      surfHunterTimer = .8; spawnSurfHunter(); surfCharge = Math.min(100, surfCharge + 25); invulnerable = Math.max(invulnerable, 1.2);
      banner(`REGENT · CROWN ${surfBoss.stage + 1} · ${surfBoss.stage === 1 ? 'THE HUNT' : 'THE CROSSED CURRENT'}`, '#d9c7f3', 17);
      popups.push({ x: W / 2, y: H * .3 + 32, text: 'CROWN REFUND · +25 TWINLIGHT', colour: '#edf19b', life: 1.5, size: 11 });
    }
    function breakSurfHunter(hunter) {
      if (!hunter || hunter.taken) return;
      hunter.taken = true; surfVeilBreaks++; surfHunterReflections++; surfCharge = Math.min(100, surfCharge + 14);
      scoreAt(160, hunter.x - camera, hunter.y - 24, 'HUNTER REFLECTED +160'); burst(hunter.x - camera, hunter.y, '#d9c7f3', 20); relicField(hunter.x - camera, hunter.y, 65, '#edf19b', .5);
      tone(987.77, .15, 'triangle', .05); advanceSurfBoss('hunter', hunter.x - camera, hunter.y - 45);
    }
    function updateSurfDeep(dt) {
      if (!veteran) return;
      surfVeil = Math.max(0, surfVeil - dt);
      if (!surfBoss && (ship.x > 2400 || surfGatesPassed >= 2)) startSurfBoss();
      const current = surfCurrents.find(c => ship.x >= c.x && ship.x <= c.x + c.width && Math.abs(ship.y - c.y) < c.height / 2);
      if (current) {
        surfCurrentTime += dt;
        const force = current.strength * (surfBoss ? 1 + surfBoss.stage * .2 : 1);
        if (!tether) { ship.vy += current.direction * force * dt; ship.vx += 12 * dt; }
        else if (tether.planet.binary) tether.angle += tether.direction * current.direction * .42 * dt;
      }
      surfHunterTimer -= dt;
      if (time > 15 && surfHunterTimer <= 0 && surfHunters.length < (surfBoss ? 3 : 2)) {
        spawnSurfHunter(); surfHunterTimer = surfBoss ? Math.max(3.8, 6.8 - surfBoss.stage) : 11;
      }
      for (const hunter of surfHunters) {
        if (hunter.taken) continue;
        if (hunter.state === 'stalk') {
          hunter.x -= 52 * dt; hunter.y += clamp(ship.y - hunter.y, -68 * dt, 68 * dt); hunter.timer -= dt;
          if (hunter.timer <= 0) { hunter.state = 'aim'; hunter.timer = .95; hunter.targetX = ship.x + ship.vx * .28; hunter.targetY = ship.y + ship.vy * .28; tone(233.08, .22, 'square', .03); }
        } else if (hunter.state === 'aim') {
          hunter.timer -= dt; hunter.targetY += clamp(ship.y - hunter.targetY, -45 * dt, 45 * dt);
          if (hunter.timer <= 0) {
            const dx = hunter.targetX - hunter.x, dy = hunter.targetY - hunter.y, distance = Math.max(1, Math.hypot(dx, dy));
            hunter.vx = dx / distance * 465; hunter.vy = dy / distance * 465; hunter.state = 'dive'; tone(155.56, .2, 'sawtooth', .035);
          }
        } else {
          const desired = Math.atan2(ship.y - hunter.y, ship.x - hunter.x), heading = Math.atan2(hunter.vy, hunter.vx);
          const turn = clamp(angleDiff(desired, heading), -1.05 * dt, 1.05 * dt), speed = Math.max(400, Math.hypot(hunter.vx, hunter.vy));
          hunter.vx = Math.cos(heading + turn) * speed; hunter.vy = Math.sin(heading + turn) * speed;
          hunter.x += hunter.vx * dt; hunter.y += hunter.vy * dt;
          if (Math.hypot(hunter.x - ship.x, hunter.y - ship.y) < hunter.r + 13) {
            if (surfVeil > 0) breakSurfHunter(hunter);
            else if (tether) {
              hunter.taken = true; tether = null; tetherAwaitingPress = false; surfCharge = Math.max(0, surfCharge - 15); combo = 0;
              ship.vx = Math.max(230, ship.vx); ship.vy += hunter.vy * .35; banner('ORBIT SEVERED · VEIL THE NEXT DIVE', '#f5a08c', 13); tone(110, .28, 'sawtooth', .05);
            } else { hunter.taken = true; hurt(hunter.x - camera, hunter.y); }
          }
          if (hunter.x < camera - 100 || hunter.x > camera + W + 250 || hunter.y < -100 || hunter.y > H + 100) hunter.taken = true;
        }
      }
      surfHunters = surfHunters.filter(h => !h.taken);
    }
    function surfStep(dt) {
      if (veteran) { updateSurfExpedition(dt); updateSurfDeep(dt); }
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
        tether.angle += tether.direction * (270 + level * 6) / tether.radius * (surfVeil > 0 ? .58 : 1) * dt;
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
      if (veteran) while (nextSurfRoute < camera + W + 650) newSurfExpeditionSegment();
      worlds = worlds.filter(w => w.x > camera - 350 || tether?.planet === w);
      for (const w of worlds) {
        const wDistance = Math.hypot(ship.x - w.x, ship.y - w.y);
        if (!tether && wDistance < w.r + 10) {
          if (veteran && surfVeil > 0) {
            surfVeil = 0; ship.vx = Math.max(225, ship.vx * .9); ship.vy = ship.y < w.y ? -205 : 205; ship.y = w.y + (ship.y < w.y ? -1 : 1) * (w.r + 12);
            banner('VEIL SPENT · PLANET REBOUND', '#d9c7f3', 12); relicField(ship.x - camera, ship.y, 46, '#d9c7f3', .45); tone(440, .12, 'triangle', .04);
          } else {
            const before = lives; hurt(ship.x - camera, ship.y);
            if (lives < before) {
              ship.vx = 260; ship.vy = ship.y < w.y ? -180 : 180;
              if (veteran) {
                const nx = (ship.x - w.x) / Math.max(1, wDistance), ny = (ship.y - w.y) / Math.max(1, wDistance);
                ship.x = w.x + nx * (w.r + 13); ship.y = w.y + ny * (w.r + 13);
              }
            }
          }
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
        if (!r.taken && d > 1 && d < ringReach()) { const pull = Math.min(d, (flightBoost > 0 ? 420 : 240) * dt) / d; r.x += dx * pull; r.y += dy * pull; r.attracted = true; }
        if (!r.taken && Math.hypot(ship.x - r.x, ship.y - r.y) < 35) {
          r.taken = true; combo++; ringsCaught++;
          if (veteran) { surfCharge = Math.min(100, surfCharge + 18); if (surfBoss) { surfBossRings++; advanceSurfBoss('ring', r.x - camera, r.y - 50); } }
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
        if (!tether && d < r.r + 10 && veteran && surfVeil > 0) {
          r.shattered = true; surfVeilBreaks++; surfCharge = Math.min(100, surfCharge + 8); scoreAt(70, r.x - camera, r.y - 25, 'VEIL SHATTER +70'); burst(r.x - camera, r.y, '#d9c7f3', 16);
        } else if (!tether && d < r.r + 10) hurt(ship.x - camera, ship.y);
        else if (d < r.r + 35 && !r.grazed) { r.grazed = true; scoreAt(35, r.x - camera, r.y - 30, 'CLOSE CALL +35'); note(196, 0, .09, 'triangle', .035); }
      }
      rocks = rocks.filter(r => r.x > camera - 70 && !r.shattered);
      if (veteran) for (const gate of surfGates) {
        if (phase !== 'running') break;
        if (surfBoss?.stage !== 1 && Math.abs(ship.x - gate.x) < 15 && !surfGateSafe(gate, ship.y) && gate.cooldown <= 0) {
          gate.cooldown = 1.1; gate.struck = true; surfGateHits++;
          if (surfVeil > 0) {
            ship.y = gate.pattern === 'crown' ? gate.gapY + (ship.y < gate.gapY ? -48 : 48) : gate.gapY; ship.vy = 0;
            banner('VEIL GUIDES THE OPENING · CLEAN BONUS LOST', '#d9c7f3', 12); relicField(ship.x - camera, ship.y, 48, '#d9c7f3', .4);
          } else {
            banner(`${gate.label} · FIND THE OPENING`, '#f5a08c', 13); hurt(clamp(gate.x - camera, 30, W - 30), ship.y);
            if (veteran) { ship.y = gate.pattern === 'crown' ? gate.gapY + (ship.y < gate.gapY ? -48 : 48) : gate.gapY; ship.vy = 0; }
          }
        }
        if (!gate.passed && ship.x > gate.x + 24) {
          gate.passed = true;
          if (!gate.struck) { surfGatesPassed++; surfCharge = Math.min(100, surfCharge + 30); scoreAt(gate.pattern === 'scissor' ? 140 : 100, gate.x - camera, gate.gapY - 30, 'CLEAN GATE · +30 TWINLIGHT'); advanceSurfBoss('gate', gate.x - camera, gate.gapY - 45); }
        }
      }
      // Orbiting ships may swing briefly outside the band; only free flight is punished.
      if (!tether && (ship.y < -20 || ship.y > H + 20 || ship.x < camera - 20)) {
        if (veteran && surfVeil > 0) { surfVeil = 0; banner('VEIL SPENT · RE-ENTRY', '#d9c7f3', 12); }
        else hurt(clamp(ship.x - camera, 30, W - 30), clamp(ship.y, 30, H - 30));
        ship.x = camera + 110; ship.y = H / 2; ship.vx = Math.max(260, ship.vx); ship.vy = -35;
      }
      maxMetres = Math.max(maxMetres, ship.x / 10);
      const distance = Math.floor(Math.max(0, ship.x) / 100);
      // Route risk pays: storm doubles the distance purse, gold pays half again.
      const routeBonus = routeMod && ship.x < routeMod.until ? routeMod.kind === 'storm' ? 2 : routeMod.kind === 'gold' ? 1.5 : 1 : 1;
      if (distance > distanceScore) { score += Math.round((distance - distanceScore) * routeBonus * (pact > 0 ? 2 : 1)); distanceScore = distance; best = Math.max(best, score); }
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
        // Fly your route: the lane you cross in becomes the next sector's weather.
        const lane = ship.y < H / 3 ? 'storm' : ship.y > H * 2 / 3 ? 'moon' : 'gold';
        routeMod = { kind: lane, until: level * 2400 + 2400 };
        const routeNames = { storm: 'STORM ROUTE — FAST AND MEAN', gold: 'GOLD ROUTE — RINGS AHEAD', moon: 'MOON ROUTE — A QUIET DRIFT' };
        popups.push({ x: W / 2, y: H * .3 + 62, text: routeNames[lane], colour: lane === 'storm' ? '#f5a08c' : lane === 'moon' ? '#a9d3be' : '#edf19b', life: 2, size: 13 });
      }
      ship.trail.push({ x: ship.x, y: ship.y }); if (ship.trail.length > (reduced ? 4 : 38)) ship.trail.shift();
    }
    function spawnWave() {
      wave++;
      const stage = expedition && dashStageIndex >= 0 ? stageCatalog()[dashStageIndex] : null;
      const base = 75 + random() * (W - 150), pattern = wave % 4;
      // Every eighth wave is a golden surge: a breather and a streak-builder.
      const surge = wave % 8 === 0;
      if (surge) {
        surgeUntil = time + 1.2;
        banner('STAR SURGE — CATCH EVERYTHING', '#edf19b', 20);
        motif([[880, 0, .2], [1046.5, .1, .2], [1318.51, .2, .24], [1567.98, .3, .4]], .045);
      }
      for (let i = 0; i < 5; i++) {
        const x = pattern === 0 ? 90 + i * 180 : clamp(base + (i - 2) * (pattern === 1 ? 74 : 125), 35, W - 35);
        let bad = surge ? false : pattern === 2 ? i === 0 || i === 4 : i === wave % 5;
        // Pink weather adds a second threat per wave.
        if (!surge && !bad && stage?.bad && random() < .35) bad = i === (wave + 2) % 5;
        const isJelly = !bad && !stage?.umbra && (i === 2 && (wave % 7 === 0 || (stage?.jelly && wave % 3 === 0)));
        const isUmbra = !!stage?.umbra && !bad && i > 0;
        falling.push({ x, y: -30 - (pattern === 1 ? i * 35 : 0), speed: (155 + time * 2.4 + i * 6) * (surge ? .82 : 1) * (stage?.speed || 1), bad, kind: isJelly ? 'jelly' : 'star', umbra: isUmbra, r: bad ? 18 : 12, wait: bad ? .55 : .1, spin: i, taken: false, wind: stage?.wind || 0 });
      }
    }
    function collectPickup(f) {
      const def = powerUps.dash.find(p => p.id === f.pickupId);
      if (!def) return;
      giftCollected = true;
      // One effect at a time: a new gift replaces the old with its own farewell.
      if (activePower && activePower.id !== def.id) popups.push({ x: W / 2, y: H * .4, text: activePower.expiry, colour: activePower.colour, life: 1.2 });
      if (def.id === 'lodestone-bloom') magnet = Math.max(magnet, def.duration);
      else if (def.id === 'moonshield') shields = Math.min(3, shields + 2);
      else if (def.id === 'clock-moth') slow = Math.max(slow, def.duration);
      activePower = { ...def, remaining: def.duration, warned: false, charges: def.charges || 0 };
      popups.push({ x: f.x, y: f.y - 34, text: `POWER UP · ${def.name.toUpperCase()}`, colour: def.colour, life: 1.7 });
      burst(f.x, f.y, def.colour, 26); relicField(catcher.x, H - 72, 90, def.colour);
      light(rgbOf(def.colour), .08, .5); kick = .5;
      motif([[560, 0, .1], [840, .09, .2]], .06);
      notify();
    }
    const stageStartTime = idx => idx <= 0 ? 0 : stageCatalog()[idx - 1].until;
    const WHALE_MISSION = { id: 'whale', text: 'Catch 20 breath-stars', target: 20 };
    const currentMission = () => {
      if (!expedition) return null;
      if (whale) return veteranExpedition ? { id: 'whaleBank', text: `Bank ${[3, 4, 5][whale.finaleStage] || 0} breath-stars with E`, target: [3, 4, 5][whale.finaleStage] || 1 } : WHALE_MISSION;
      return dashStageIndex >= 0 && dashStageIndex < stageCatalog().length ? stageCatalog()[dashStageIndex].mission : null;
    };
    function missionCatch(f) {
      if (f.umbra && f.umbraLit) { umbraCatches++; umbraLumen = Math.min(100, umbraLumen + 12); }
      else if (veteranExpedition && !f.bad) umbraLumen = Math.min(100, umbraLumen + 3);
      if (veteranExpedition && whale && f.breath) { whale.caught++; return; }
      const mission = currentMission();
      if (!mission || missionDone || f.bad) return;
      if (mission.id === 'catch' && f.kind === 'star') missionProgress++;
      else if (mission.id === 'centre' && f.kind === 'star' && Math.abs(f.x - W / 2) < 150) missionProgress++;
      else if (mission.id === 'surge' && surgeUntil > time) missionProgress++;
      else if (mission.id === 'gift' && f.kind === 'pickup') missionProgress = 1;
      else if (mission.id === 'whale' && f.breath) missionProgress++;
      else if (mission.id === 'umbra' && f.umbra && f.umbraLit) missionProgress++;
    }
    function spawnShade(x) {
      if (falling.filter(f => f.shade && !f.taken).length >= 3) return false;
      falling.push({ x: clamp(x, 40, W - 40), y: -30, speed: 80, bad: true, kind: 'shade', shade: true, r: 16, wait: .8, spin: 0, taken: false, wind: 0 });
      shadesSpawned++;
      popups.push({ x: clamp(x, 120, W - 120), y: 126, text: 'A SHADE WAKES · DASH THROUGH IT', colour: '#e29eb7', life: 2, size: 13 });
      tone(155.56, .28, 'triangle', .05);
      return true;
    }
    function spawnMoth() {
      if (falling.filter(f => f.moth && !f.taken).length >= 3) return false;
      const x = 90 + ((wave * 197 + Math.floor(time) * 31) % (W - 180));
      falling.push({ x, y: -30, speed: 112, bad: true, kind: 'moth', moth: true, r: 17, wait: 1.05, spin: 0, taken: false, wind: 0 });
      popups.push({ x, y: 112, text: 'GLOAM MOTH · BANK OR DASH BEFORE IT FEEDS', colour: '#e29eb7', life: 2, size: 12 });
      tone(174.61, .25, 'triangle', .04); return true;
    }
    function dashStep(dt) {
      const wasDashing = dashTime > 0;
      const umbraWeather = veteranExpedition && !!stageCatalog()[dashStageIndex]?.umbra;
      dashAnchor = veteranExpedition && (pointerRein || keys.has('s') || keys.has('ArrowDown')) && umbraLumen > 0;
      umbraRein = umbraWeather && dashAnchor;
      if (dashAnchor) umbraLumen = Math.max(0, umbraLumen - (umbraWeather ? 24 : 14) * dt);
      if (veteranExpedition) {
        const tideTarget = time < 45 ? 0 : [0, 52, -52, 0][Math.floor(time / 12) % 4];
        dashTide += (tideTarget - dashTide) * (1 - Math.exp(-1.8 * dt));
        dashTideName = Math.abs(dashTide) < 8 ? 'STILL WATER' : dashTide > 0 ? 'EASTWARD TIDE →' : '← WESTWARD TIDE';
        dashMothTimer -= dt;
        if (time > 45 && dashMothTimer <= 0) { if (spawnMoth()) dashMothTimer = whale ? 8 : 14; else dashMothTimer = 2; }
      }
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
      catcher.x = clamp(catcher.x + catcher.vx * dt + (veteranExpedition ? dashTide * (dashAnchor ? .08 : 1) * dt : 0), basketWidth(), W - basketWidth()); catcher.tilt += (catcher.vx / 2200 - catcher.tilt) * dt * 12;
      catcher.pop = Math.max(0, (catcher.pop || 0) - dt * 1.4);
      // Expedition staging: standard keeps five weathers; Veteran adds Umbra.
      const stage = expedition && dashStageIndex >= 0 && dashStageIndex < stageCatalog().length ? stageCatalog()[dashStageIndex] : null;
      if (stage?.umbra) {
        const naturalLight = W / 2 + Math.sin((time - stageStartTime(dashStageIndex)) * .62) * 280;
        if (umbraRein) umbraLightX += clamp(catcher.x - umbraLightX, -360 * dt, 360 * dt);
        else umbraLightX += (naturalLight - umbraLightX) * (1 - Math.exp(-3.2 * dt));
      } else umbraLightX = W / 2;
      if (expedition) {
        const idx = stageCatalog().findIndex(s => time < s.until);
        if (idx !== dashStageIndex) {
          dashStageIndex = idx; missionProgress = 0; missionDone = false; giftCollected = false;
          if (idx >= 0) {
            dashAct = idx + 1;
            banner(stageCatalog()[idx].name, '#cbb287', 20);
            popups.push({ x: W / 2, y: H * .3 + 36, text: stageCatalog()[idx].sub, colour: '#b7abc9', life: 1.8, size: 13 });
            popups.push({ x: W / 2, y: H * .3 + 60, text: `MISSION · ${stageCatalog()[idx].mission.text.toUpperCase()}`, colour: '#a9d3be', life: 2.2, size: 12 });
            motif([[587.33, 0, .15], [783.99, .1, .3]], .05);
          } else {
            dashAct = 5;
            banner('THE UMBRA WHALE', '#9ed7c6', 24);
            popups.push({ x: W / 2, y: H * .3 + 40, text: veteranExpedition ? 'Three offerings. Catch the breath, then press E to bank.' : 'Three breaths. Catch the light.', colour: '#b7abc9', life: 2, size: 13 });
            popups.push({ x: W / 2, y: H * .3 + 64, text: `MISSION · ${veteranExpedition ? 'BANK 3 BREATH-STARS WITH E' : WHALE_MISSION.text.toUpperCase()}`, colour: '#a9d3be', life: 2.2, size: 12 });
            motif([[329.63, 0, .4], [261.63, .3, .6]], .06);
            whale = { x: W + 260, breath: 0, timer: 3, telegraph: 0, finaleStage: 0, banked: 0, caught: 0 };
            missionProgress = 0; missionDone = false;
          }
          notify();
        }
      }
      // The whale breathes constellations: telegraph, then catch the light.
      if (whale && phase === 'running') {
        whale.x -= 16 * dt;
        if (whale.x < -280) whale.x = W + 260;
        if (whale.breath < (veteranExpedition ? 99 : 3)) {
          if (whale.telegraph > 0) {
            whale.telegraph -= dt;
            if (whale.telegraph <= 0) {
              const breathPower = Math.min(2, whale.breath);
              breathLanes.forEach((laneX, li) => {
                for (let k = 0; k < 3; k++) falling.push({ x: laneX, y: -30 - k * 46, speed: (165 + breathPower * 40) * (stage?.speed || 1), bad: false, kind: 'star', breath: true, r: 12, wait: 0, spin: k, taken: false, wind: 0 });
                if (breathPower >= 1 && li === whale.breath % 3) falling.push({ x: laneX, y: -200, speed: 175 + breathPower * 40, bad: true, kind: 'star', r: 18, wait: 0, spin: 0, taken: false, wind: 0 });
              });
              whale.breath++; whale.timer = veteranExpedition ? Math.max(4.8, 7.5 - Math.min(3, whale.breath) * .45) : 12 - whale.breath * 2; breathLanes = [];
              motif([[880, 0, .2], [1108.73, .12, .3]], .05);
            }
          } else {
            whale.timer -= dt;
            if (whale.timer <= 0) {
              whale.telegraph = 1.2;
              breathLanes = [-1, 0, 1].map(o => clamp(whale.x + o * 95, 60, W - 60));
              popups.push({ x: clamp(whale.x, 120, W - 120), y: 130, text: 'THE WHALE BREATHES', colour: '#9ed7c6', life: 1.2, size: 13 });
              tone(523.25, .3, 'sine', .05);
            }
          }
        } else if (!veteranExpedition && time > whaleAt() + 42) {
          finish('The Umbra Whale dives home, humming your tune.', 1.6, true);
        }
      }
      // Mission bookkeeping for the current weather.
      const mission = currentMission();
      if (mission && !missionDone) {
        if (mission.id === 'whaleBank') missionProgress = whale?.banked || 0;
        if (mission.id === 'calm') missionProgress = Math.min(mission.target, time - Math.max(lastHitTime, stageStartTime(dashStageIndex)));
        if (mission.id !== 'whaleBank' && missionProgress >= mission.target) {
          missionDone = true;
          scoreAt(300, W / 2, H * .4, 'MISSION COMPLETE +300');
          banner('MISSION COMPLETE', '#a9d3be', 18);
          motif([[659.26, 0, .14], [880, .1, .14], [1046.5, .2, .3]], .05);
          // The observatory thanks you with a gift, dropped safely mid-sky.
          const def = powerUps.dash[(dashStageIndex + 2) % powerUps.dash.length];
          falling.push({ x: W / 2, y: -30, speed: 130, bad: false, kind: 'pickup', pickupId: def.id, r: 16, wait: 0, spin: 0, taken: false, wind: 0 });
          notify();
        }
      }
      if (spawn <= 0 && remaining > 3 && !whale) { spawnWave(); spawn = Math.max(.72, 1.45 - time * .008) * (stage?.spawn || 1); }
      const fallFactor = slow > 0 ? .55 : 1;
      for (const f of falling) {
        if (phase !== 'running') break;
        f.wait -= dt; if (f.wait > 0) continue;
        f.y += f.speed * dt * fallFactor; f.spin += dt;
        if (veteranExpedition && !f.fleeing) f.x = clamp(f.x + dashTide * .62 * dt, 20, W - 20);
        if (f.moth && !f.fleeing) {
          if (combo === 0 && f.y > 180) { f.fleeing = true; f.speed = -185; popups.push({ x: f.x, y: f.y, text: 'NO UNBANKED STREAK · THE MOTH LEAVES', colour: '#b7abc9', life: 1.1, size: 10 }); }
          else f.x = clamp(f.x + clamp(catcher.x - f.x, -118 * dt, 118 * dt), 22, W - 22);
        }
        if (f.shade && f.y < 315) f.x = clamp(f.x + clamp(catcher.x - f.x, -82 * dt, 82 * dt), 22, W - 22);
        if (f.wind) f.x = clamp(f.x + Math.sin(time * .7 + f.spin) * f.wind * dt, 20, W - 20);
        f.umbraLit = !f.umbra || Math.abs(f.x - umbraLightX) <= 112;
        if (!f.bad && f.umbraLit && Math.hypot(f.x - catcher.x, f.y - (H - 72)) < magnetReach()) {
          f.x += (catcher.x - f.x) * dt * (has('lodestone') ? 3.8 : 2.8); f.attracted = true;
        }
        if (f.umbra) f.umbraLit = Math.abs(f.x - umbraLightX) <= 112;
        const atHeight = Math.abs(f.y - (H - 72)) < f.r + (activePower?.id === 'prism-net' ? 34 : 10);
        const inBasket = Math.abs(f.x - catcher.x) < basketWidth() + f.r * .7;
        const eclipseCatch = veteranExpedition && !!stage?.umbra && f.umbra && !f.umbraLit && dashTime > 0 && atHeight && inBasket;
        const directCatch = atHeight && (f.umbraLit || eclipseCatch) && inBasket;
        const echoCatch = !f.bad && atHeight && f.umbraLit && echoes.some(e => Math.abs(f.x - e.x) < basketWidth() + f.r * .7);
        // A meteor that brushes the rim gets its own adrenaline bookkeeping.
        if (f.bad && !f.grazed && atHeight && !directCatch && Math.abs(f.x - catcher.x) < basketWidth() + f.r * .7 + 26) {
          f.grazed = true; popups.push({ x: f.x, y: H - 110, text: 'CLOSE', colour: '#f5a08c', life: .7 });
          shake = Math.max(shake, 2); tone(300, .06, 'sine', .05);
        }
        if (!f.taken && (directCatch || echoCatch)) {
          f.taken = true;
          missionCatch(f);
          if (f.bad) {
            if (f.moth) {
              if (dashTime > 0) {
                dashMothsBroken++; charge = Math.min(100, charge + 22); scoreAt(110, f.x, f.y - 32, 'GLOAM MOTH BROKEN +110');
                relicField(f.x, f.y, 58, '#edf19b', .45); burst(f.x, f.y, '#e29eb7', 16); tone(932.33, .13, 'triangle', .05);
              } else {
                const stolen = Math.min(5, combo); combo = Math.max(0, combo - stolen); dashMothThefts += stolen;
                banner(stolen ? `MOTH FEEDS · ${stolen} UNBANKED STARS LOST` : 'THE MOTH FINDS NO STREAK', '#e29eb7', 13); tone(146.83, .25, 'triangle', .045);
              }
            } else if (f.shade && dashTime > 0) {
              shadesBroken++; charge = Math.min(100, charge + 18); scoreAt(90, f.x, f.y - 32, 'SHADE BROKEN +90');
              relicField(f.x, f.y, 62, '#d9c7f3', .5); banner('SHADE BROKEN · THE LIGHT HOLDS', '#d9c7f3', 13);
              burst(f.x, f.y, '#d9c7f3', 18); tone(880, .14, 'sine', .05);
            } else if (!f.shade || dashTime <= 0) hurt(catcher.x, H - 72);
            catcher.tilt = (f.x < catcher.x ? 1 : -1) * .38;
          }
          else if (f.kind === 'pickup') collectPickup(f);
          else {
            catcher.pop = f.kind === 'jelly' ? .24 : .16;
            burst(f.x, H - 76, '#edf19b', 3, 60);
            combo++; totalCatches++; charge = Math.min(100, charge + (has('ion-cell') ? 11 : 7) + (echoCatch && !directCatch && has('ion-cell') ? 18 : 0));
            if (eclipseCatch) {
              eclipseCatches++; umbraLumen = Math.min(100, umbraLumen + 6); charge = Math.min(100, charge + 40); spawnShade(f.x);
              scoreAt(40, f.x, f.y - 52, 'ECLIPSE CATCH +40'); relicField(f.x, f.y, 46, '#d9c7f3', .45);
            }
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
            // Star Prism: the next five catches score triple.
            let prismMult = 1;
            if (activePower?.id === 'star-prism' && activePower.charges > 0) {
              prismMult = 3; activePower.charges--;
              if (!activePower.charges) activePower.remaining = 0;
            }
            scoreAt(10 * multiplier * prismMult, f.x, f.y - 25, f.kind === 'jelly' ? 'STAR MAGNET!' : `+${10 * multiplier * prismMult}`);
            if (f.kind === 'jelly') { magnet = Math.max(magnet, 6); lives = Math.min(3, lives + 1); light('187,167,237', .08, .5); kick = .5; motif([[659.26, 0, .14], [783.99, .07, .14], [1046.5, .14, .25]], .05); }
            else light('237,241,155', .035, .18);
            burst(f.x, f.y, f.kind === 'jelly' ? '#bba7ed' : '#edf19b', 13);
            tone([523.25, 587.33, 659.26, 783.99, 880, 1046.5, 1174.66, 1318.51][combo % 8], .1, 'sine', .055);
          }
        }
        if (!f.taken && !f.bad && f.y > H + 30) {
          f.taken = true;
          if (f.umbra) umbraMisses++;
          // A missed star never breaks the streak — only a meteor does. The
          // promised ×8 has to be reachable, or the multiplier is decoration.
          if (f.kind === 'pickup') popups.push({ x: f.x, y: H - 60, text: 'THE GIFT DRIFTS BY', colour: '#b7abc9', life: 1.2 });
        }
      }
      falling = falling.filter(f => !f.taken && f.y < H + 50 && (!f.fleeing || f.y > -90));
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
        const completedVeteranWhale = !veteranExpedition || !whale || whale.finaleStage >= 3;
        finish(completedVeteranWhale ? 'Meteor shower: absolutely handled.' : 'The Whale dives with the unoffered breath. Bank earlier next time.', 1.6, completedVeteranWhale);
      }
    }
    function splitComet(source) {
      if (!source || comets.length >= 3) return;
      const a = Math.atan2(source.vy, source.vx) + (comets.length === 1 ? .48 : -.48), speed = Math.max(285, Math.hypot(source.vx, source.vy));
      comets.push({ x: source.x, y: source.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, trail: [], secondary: true, focus: source.focus || 0, pierceGrace: 0, lastPierce: null });
      relicField(source.x, source.y, 40, '#9ed7c6');
    }
    function advanceCathedralBoss(source, x = W / 2, y = H / 2) {
      if (!cathedralBoss || phase !== 'running') return;
      if (cathedralBoss.stage === 0) {
        if (source !== 'litany') return;
        cathedralBoss.progress = 3;
      } else if (cathedralBoss.stage === 1) {
        if (source !== 'parry' && source !== 'censer') return;
        cathedralBoss.progress++;
      } else return;
      scoreAt(240 * (cathedralBoss.stage + 1), x, y - 35, `CATHEDRAL SEAL ${cathedralBoss.progress}/${[3, 2, 2][cathedralBoss.stage]}`);
      if (cathedralBoss.progress < [3, 2, 2][cathedralBoss.stage]) return;
      cathedralBoss.stage++; cathedralBoss.progress = 0; bricks = []; cathedralSentries = [];
      burst(W / 2, H / 2, '#edf19b', 35); punch(.2, .18); makeCathedralBricks(); notify();
    }
    function hitCrystal(b, damage = 1, focused = false, conducted = false) {
      if (b.hp <= 0) return false;
      if (veteran && b.bossCore && (!focused || cathedralBoss?.stage !== 2)) {
        b.hit = .2; relicField(b.x, b.y, 42, '#d9c7f3', .3);
        if (time - lastSealNote > 1.4) { lastSealNote = time; banner('THE ROSE HEART ANSWERS ONLY FOCUS', '#d9c7f3', 12); }
        tone(164.81, .1, 'square', .03); return false;
      }
      if (veteran && b.sealed && bricks.some(k => k.key && k.hp > 0)) {
        b.hit = .2; cathedralSealBlocks++;
        if (time - lastSealNote > 1.4) { lastSealNote = time; banner('SEALED · BREAK THE GOLD KEYSTONES', '#edf19b', 13); }
        relicField(b.x, b.y, 28, '#edf19b', .25); tone(180, .07, 'square', .025);
        return false;
      }
      const wasKey = veteran && b.key;
      b.hp = Math.max(0, b.hp - damage); b.hit = .2; combo++; crystalHits++;
      if (veteran && b.hp > 0) cathedralArmourDents++;
      if (veteran && b.bossCore && focused && cathedralBoss?.stage === 2) {
        cathedralBoss.progress++; cathedralFocusHeartBreaks++;
        if (!b.hp && cathedralBoss.progress >= 2) { scoreAt(1200, b.x, b.y - 45, 'THE ROSE HEART OPENS'); finish('The Last Cathedral becomes a window instead of a wall.', 1.8, true); }
      }
      if (veteran && !wasKey && !b.bossCore && !conducted) {
        if (b.order === litanyTarget) {
          litanyProgress++; litanyTarget = (litanyTarget + 1) % 3;
          scoreAt(35 * litanyProgress, b.x, b.y - 34, `LITANY ${litanyProgress}/3`);
          if (cathedralBoss?.stage === 0) cathedralBoss.progress = litanyProgress;
          if (litanyProgress >= 3) {
            litanyProgress = 0; litanyTarget = 0; litanyCompletions++; charge = Math.min(100, charge + 24);
            const resonance = bricks.filter(n => n !== b && n.hp > 0 && !n.key && !n.bossCore && n.order === litanyTarget && (!n.sealed || !bricks.some(k => k.key && k.hp > 0))).slice(0, 3);
            for (const n of resonance) { if (hitCrystal(n, 1, false, true)) fields.push({ x: b.x, y: b.y, toX: n.x, toY: n.y, radius: 80, colour: '#edf19b', life: .45, max: .45 }); }
            banner('LITANY COMPLETE · CENSER CHARGE RESTORED', '#edf19b', 14); motif([[392, 0, .14], [523.25, .1, .18], [659.25, .2, .25]], .045);
            advanceCathedralBoss('litany', b.x, b.y);
          }
        } else { litanyProgress = 0; litanyTarget = 0; if (cathedralBoss?.stage === 0) cathedralBoss.progress = 0; }
      }
      if (wasKey && !b.hp && !bricks.some(k => k.key && k.hp > 0)) {
        banner('THE CATHEDRAL IS UNSEALED', '#9ed7c6', 18); relicField(W / 2, H / 2, 220, '#9ed7c6', .8);
      }
      if (has('twin-comet')) splitHits++;
      charge = Math.min(100, charge + (has('chrono-coil') ? 20 : 12));
      scoreAt(25 * Math.min(8, combo), b.x, b.y - 20); burst(b.x, b.y, colours[b.tier], b.hp ? 7 : 22); shake = 2;
      // Families: pulse crystals exhale slow time; the heart gives a life back.
      if (!b.hp && b.family === 'pulse') { slowTime = Math.max(slowTime, 1.2); relicField(b.x, b.y, 120, '#a6d9ec', .6); banner('PULSE — TIME THICKENS', '#a6d9ec', 14); }
      if (!b.hp && b.family === 'heart') { lives = Math.min(3, lives + 1); relicField(b.x, b.y, 90, '#f5a08c', .8); banner('THE HEART REMEMBERS · +1', '#f5a08c', 14); }
      // Dents dip; shatters stop the world a moment, longer in a cascade.
      punch(b.hp ? .3 : 0, b.hp ? .025 : .05 + Math.min(combo, 10) * .004);
      light(rgbOf(colours[b.tier]), b.hp ? .03 : .07, b.hp ? .12 : .3);
      if (combo === 4 || combo === 8) punch(0, .05);
      tone(350 + b.tier * 65, .1, 'sine', .05);
      if (b.hp) note(220, 0, .05, 'square', .02);
      else note(1567.98, .02, .1, 'sine', .025);
      return true;
    }
    function updateChoir(dt) {
      if (!veteran) return;
      paddleHush = Math.max(0, paddleHush - dt);
      const keysAlive = bricks.filter(b => b.key && b.hp > 0);
      if (choirSource && choirSource.hp <= 0) {
        choirSource = null; choirCharge = 0; choirTimer = 2.2;
        charge = Math.min(100, charge + 10); banner('KEYSTONE SILENCES THE CHOIR', '#9ed7c6', 13);
      }
      if (!choirSource && choirBolts.length < 2 && keysAlive.length) {
        choirTimer -= dt;
        if (choirTimer <= 0) {
          // Do not silently spawn-camp the comet's current target. The choir
          // charges from a safer key; deliberately redirecting to it still
          // cancels the shot and earns the silence reward.
          const distanceFromComets = b => Math.min(...comets.map(c => Math.hypot(c.x - b.x, c.y - b.y)));
          choirSource = keysAlive.slice().sort((a, b) => distanceFromComets(b) - distanceFromComets(a) || a.x - b.x)[0];
          choirCharge = 1.35; tone(293.66, .3, 'sine', .035);
        }
      }
      if (choirSource) {
        choirCharge -= dt;
        if (choirCharge <= 0) {
          const source = choirSource, a = Math.atan2(source.y - H / 2, source.x - W / 2);
          choirBolts.push({ x: source.x, y: source.y, vx: Math.cos(a) * 128, vy: Math.sin(a) * 128, angle: a });
          choirSource = null; choirCharge = 0; choirTimer = 7; choirShots++;
          banner('DISCORD · INTERCEPT AT THE PADDLE', '#e29eb7', 13); tone(220, .24, 'triangle', .05);
        }
      }
      for (const bolt of choirBolts) {
        bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt;
        let dx = bolt.x - W / 2, dy = bolt.y - H / 2, distance = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        if (censerTime > 0 && distance > 1) {
          bolt.vx -= dx / distance * 310 * dt; bolt.vy -= dy / distance * 310 * dt;
          if (distance < 76) {
            bolt.taken = true; censerBanishes++; scoreAt(75, bolt.x, bolt.y - 20, 'DISCORD CENSED +75');
            burst(bolt.x, bolt.y, '#d9c7f3', 12); tone(587.33, .14, 'sine', .04); advanceCathedralBoss('censer', bolt.x, bolt.y); continue;
          }
        }
        if (distance >= 224 && distance <= 241 && Math.abs(angleDiff(a, paddle.angle)) < paddleHalf() + .035) {
          bolt.taken = true; choirParries++; charge = Math.min(100, charge + 28); paddle.kick = 1;
          scoreAt(90, bolt.x, bolt.y - 20, 'CHOIR PARRY +90'); relicField(bolt.x, bolt.y, 48, '#9ed7c6', .45);
          burst(bolt.x, bolt.y, '#9ed7c6', 12); tone(740, .13, 'sine', .05); advanceCathedralBoss('parry', bolt.x, bolt.y);
        } else if (distance > 255) {
          bolt.taken = true; choirHushes++; paddleHush = Math.max(paddleHush, 2.6); combo = 0;
          banner('DISCORD · PADDLE NARROWED', '#f5a08c', 14); tone(130.81, .3, 'sawtooth', .04);
        }
      }
      choirBolts = choirBolts.filter(b => !b.taken);
    }
    function updateSentries(dt) {
      if (!veteran) return;
      for (const sentry of cathedralSentries) {
        if (sentry.taken) continue;
        sentry.cooldown = Math.max(0, sentry.cooldown - dt);
        if (comets.length) {
          const target = comets.slice().sort((a, b) => Math.hypot(a.x - sentry.x, a.y - sentry.y) - Math.hypot(b.x - sentry.x, b.y - sentry.y))[0];
          const desired = Math.atan2(target.y - H / 2, target.x - W / 2), turn = angleDiff(desired, sentry.angle);
          sentry.angle += clamp(turn, -.48 * dt, .48 * dt) + .07 * dt;
        }
        sentry.x = W / 2 + Math.cos(sentry.angle) * sentry.radius; sentry.y = H / 2 + Math.sin(sentry.angle) * sentry.radius;
        sentry.timer -= dt;
        if (sentry.timer <= 0) {
          if (choirBolts.length < 3) {
            choirBolts.push({ x: sentry.x, y: sentry.y, vx: Math.cos(sentry.angle) * 112, vy: Math.sin(sentry.angle) * 112, angle: sentry.angle, sentry: true }); choirShots++;
            tone(207.65, .18, 'square', .03);
          }
          sentry.timer = 7 + cathedralSentries.indexOf(sentry) * .8;
        }
      }
      cathedralSentries = cathedralSentries.filter(s => !s.taken);
    }
    function breakerStep(dt) {
      slowTime -= dt; censerTime = Math.max(0, censerTime - dt);
      const direction = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
      if (direction) paddle.target = paddle.angle + direction * 3.5 * dt;
      paddle.angle += angleDiff(paddle.target, paddle.angle) * (direction ? 1 : 1 - Math.exp(-20 * dt));
      moveCathedralBricks();
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
      updateChoir(dt); updateSentries(dt);
      const speedFactor = slowTime > 0 ? .65 : 1, radius = cometRadius();
      const contact = 235 - (slowTime > 0 ? 6 : 5) - radius;
      let lastLost = null;
      for (const c of comets) {
        const previousDistance = Math.hypot(c.x - W / 2, c.y - H / 2);
        c.pierceGrace = Math.max(0, (c.pierceGrace || 0) - dt); if (!c.pierceGrace) c.lastPierce = null;
        if (veteran && censerTime > 0) {
          const alive = bricks.filter(b => b.hp > 0), marked = alive.length ? (alive.find(b => b.key || b.order === litanyTarget) || alive[0]) : null;
          const gx = (marked?.x ?? W / 2) - c.x, gy = (marked?.y ?? H / 2) - c.y, gd = Math.max(35, Math.hypot(gx, gy));
          if (marked) {
            const desired = Math.atan2(gy, gx), heading = Math.atan2(c.vy, c.vx), turnRate = alive.length <= 4 ? 3 : 2.2, turn = clamp(angleDiff(desired, heading), -turnRate * dt, turnRate * dt);
            const speed = Math.max(320, Math.hypot(c.vx, c.vy) * Math.exp(-.08 * dt));
            c.vx = Math.cos(heading + turn) * speed; c.vy = Math.sin(heading + turn) * speed;
          } else { c.vx += gx / gd * 118 * dt; c.vy += gy / gd * 118 * dt; }
        }
        c.x += c.vx * dt * speedFactor; c.y += c.vy * dt * speedFactor;
        for (const b of bricks) {
          if (!b.hp || c.lastPierce === b) continue;
          const dx = c.x - b.x, dy = c.y - b.y, distance = Math.hypot(dx, dy);
          if (distance < b.r + radius) {
            const nx = distance > .001 ? dx / distance : 0, ny = distance > .001 ? dy / distance : 1;
            const focusBreak = veteran && (c.focus || 0) >= 2;
            const crystalHit = hitCrystal(b, focusBreak ? 2 : has('dense-core') ? 2 : 1, focusBreak);
            if (focusBreak && crystalHit) {
              c.focus = 0; c.pierceGrace = .14; c.lastPierce = b; cathedralFocusBreaks++;
              scoreAt(80, c.x, c.y - 28, 'FOCUS BREAK +80'); relicField(c.x, c.y, 58, '#edf19b', .45);
              banner('FOCUS BREAK · THE COMET PIERCES', '#edf19b', 13); tone(1174.66, .16, 'sine', .05);
            } else {
              c.x = b.x + nx * (b.r + radius + .1); c.y = b.y + ny * (b.r + radius + .1);
              const dot = c.vx * nx + c.vy * ny;
              if (dot < 0) { c.vx -= 2 * dot * nx; c.vy -= 2 * dot * ny; }
            }
            if (crystalHit && has('shatterglass')) {
              const prism = has('twin-comet') && c.secondary, reach = prism ? 105 : 62;
              const neighbours = bricks.filter(n => n !== b && n.hp > 0 && Math.hypot(n.x - b.x, n.y - b.y) <= reach).sort((a, n) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(n.x - b.x, n.y - b.y)).slice(0, prism ? 2 : 1);              for (const n of neighbours) { hitCrystal(n); fields.push({ x: b.x, y: b.y, toX: n.x, toY: n.y, radius: reach, colour: prism ? '#edf19b' : '#bba7ed', life: .4, max: .4 }); }
              relicField(b.x, b.y, reach, prism ? '#edf19b' : '#bba7ed', .35);
            }
            break;
          }
        }
        if (veteran) for (const sentry of cathedralSentries) {
          if (sentry.taken) continue;
          const sx = c.x - sentry.x, sy = c.y - sentry.y, sd = Math.hypot(sx, sy);
          if (sd >= 15 + radius) continue;
          if ((c.focus || 0) >= 2 || censerTime > 0) {
            sentry.taken = true; sentryBreaks++; scoreAt(130, sentry.x, sentry.y - 25, 'SENTRY SHATTERED +130'); burst(sentry.x, sentry.y, '#edf19b', 18); tone(698.46, .13, 'triangle', .05);
          } else if (sentry.cooldown <= 0) {
            const nx = sd > .001 ? sx / sd : 1, ny = sd > .001 ? sy / sd : 0, dot = c.vx * nx + c.vy * ny;
            c.x = sentry.x + nx * (15 + radius + .2); c.y = sentry.y + ny * (15 + radius + .2);
            if (dot < 0) { c.vx -= 2 * dot * nx; c.vy -= 2 * dot * ny; }
            c.focus = 0; combo = 0; sentry.cooldown = 1; banner('SENTRY DEFLECT · FOCUS OR CENSER TO BREAK', '#e29eb7', 12); tone(185, .12, 'square', .035);
          }
          break;
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
            if (veteran) {
              if (Math.abs(offset) < .14) {
                c.focus = Math.min(2, (c.focus || 0) + 1); cathedralFocusReturns++; charge = Math.min(100, charge + 4);
                if (c.focus >= 2) { banner('FOCUS BREAK READY · NEXT CRYSTAL PIERCES', '#edf19b', 13); relicField(c.x, c.y, 46, '#edf19b', .45); }
              } else c.focus = 0;
            }
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
          comets.push({ x: W / 2, y: H / 2 + 208, vx: 0, vy: -290, trail: [], secondary: false, focus: 0, pierceGrace: 0, lastPierce: null });
          // A beat to breathe: the comet pins to the paddle until launch.
          popups.push({ x: W / 2 + Math.cos(paddle.angle) * 208, y: H / 2 + Math.sin(paddle.angle) * 208 - 30, text: 'COMET INCOMING', colour: '#a6d9ec', life: 1.6 });
        }
      }
      while (splitHits >= 6) { splitHits -= 6; splitComet(comets[0]); }
      if (veteran && cathedralBoss && phase === 'running') {
        const keysRemain = bricks.some(b => b.key && b.hp > 0);
        if (cathedralBoss.stage === 0 && bricks.every(b => !b.hp)) {
          cathedralBoss.rebuild = (cathedralBoss.rebuild || 0) + dt;
          if (cathedralBoss.rebuild > 1.25) { banner('THE GLASS REFORMS · COMPLETE THE MOVEMENT', '#d9c7f3', 13); makeCathedralBricks(); }
        } else if (cathedralBoss.stage === 1 && !keysRemain && cathedralSentries.length === 0) {
          // Broken keys never reset the two required defensive captures. Keep
          // the Discord moving through a bounded, telegraphed reserve sentry.
          cathedralBoss.rebuild = (cathedralBoss.rebuild || 0) + dt;
          if (cathedralBoss.rebuild > 2) { initialiseSentries(1); cathedralSentries[0].timer = 1.2; cathedralBoss.rebuild = 0; banner('A RESERVE SENTRY ANSWERS', '#e29eb7', 13); }
        } else cathedralBoss.rebuild = 0;
      } else if (!cathedralBoss && bricks.every(b => !b.hp) && phase === 'running') {
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
      if (pact > 0) { pact = Math.max(0, pact - dt); if (pact === 0 && !pactFailed) {
        scoreAt(150, W / 2, H * .22, 'PACT FULFILLED +150');
        banner('THE CONSTELLATION HOLDS', '#9ed7c6', 18);
        motif([[523.25, 0, .14], [659.26, .1, .14], [880, .2, .3]], .06);
      } }
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
    const compactHUD = () => veteran && canvasCssWidth < 520;
    const hudScale = () => veteran ? clamp(Math.max(W / Math.max(1, canvasCssWidth), H / Math.max(1, canvasCssHeight)), 1, 2.8) : 1;
    const essentialHudScale = () => Math.max(W / Math.max(1, canvasCssWidth), H / Math.max(1, canvasCssHeight));
    const essentialBackingPx = () => ESSENTIAL_HUD_CSS_PX * essentialHudScale();
    function hudMeasure(value, x, y, size, align) {
      ctx.font = `500 ${size}px "DM Sans", sans-serif`;
      const metrics = ctx.measureText(String(value)), width = metrics.width;
      const left = align === 'right' ? x - width : align === 'left' ? x : x - width / 2;
      return { text: String(value), x: left, y: y - (metrics.actualBoundingBoxAscent || size * .8), w: width,
        h: (metrics.actualBoundingBoxAscent || size * .8) + (metrics.actualBoundingBoxDescent || size * .2), font: size };
    }
    function hudText(value, x, y, size = 10, colour = '#eee4c8', align = 'center', kind = 'status') {
      const font = compactHUD() ? essentialBackingPx() : size;
      text(value, x, y, font, colour, align);
      if (hudFrame) hudFrame.texts.push({ ...hudMeasure(value, x, y, font, align), kind });
    }
    function narrativeRegion() {
      if (options.game === 'merge') return { x: 24, y: 202, w: W - 48 };
      if (options.game === 'hop') return { x: 190, y: 138, w: W - 210 };
      if (options.game === 'dash') return { x: 24, y: 180, w: W - 48 };
      return { x: 24, y: 170, w: W - 48 };
    }
    function hudPopup(value, colour) {
      const region = narrativeRegion(), scaled = essentialBackingPx(), lines = [];
      ctx.font = `500 ${scaled}px "DM Sans", sans-serif`;
      for (const word of String(value).split(/\s+/)) {
        const candidate = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
        if (lines.length && ctx.measureText(candidate).width > region.w) lines.push(word);
        else if (lines.length) lines[lines.length - 1] = candidate;
        else lines.push(word);
      }
      const panelHeight = lines.length * scaled * 1.12 + 12, centreX = region.x + region.w / 2;
      ctx.fillStyle = 'rgba(7,12,24,.88)'; ctx.fillRect(region.x, region.y, region.w, panelHeight);
      ctx.strokeStyle = 'rgba(185,154,98,.45)'; ctx.lineWidth = 1; ctx.strokeRect(region.x + .5, region.y + .5, region.w - 1, panelHeight - 1);
      if (hudFrame) hudFrame.texts.push({ text: String(value), x: region.x, y: region.y, w: region.w, h: panelHeight, font: scaled, kind: 'narrative' });
      lines.forEach((line, i) => {
        const baseline = region.y + 6 + scaled * .82 + i * scaled * 1.12;
        text(line, centreX, baseline, scaled, colour);
        if (hudFrame) hudFrame.texts.push({ ...hudMeasure(line, centreX, baseline, scaled, 'center'), kind: 'narrativeText' });
      });
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
        hueCache.base.addColorStop(0, '#070c18'); hueCache.base.addColorStop(.55, '#140f20'); hueCache.base.addColorStop(1, '#260f1d');
        const glowStops = { merge: '#9b693448', hop: '#6d263852', dash: '#285b5c48', breaker: '#6d26384c' };
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
        // Baked architectural enamel: pointed brass ribs, ivory incisions and a
        // low-contrast stained-glass rose. It is cached once and never competes
        // with moving hazards or collision silhouettes.
        hueCache.tracery = (() => {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const g = c.getContext('2d'), archW = W / 3;
          g.strokeStyle = 'rgba(185,154,98,.16)'; g.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const left = i * archW + 10, right = (i + 1) * archW - 10, mid = (left + right) / 2, shoulder = H * .33, base = H * .9;
            g.beginPath(); g.moveTo(left, base); g.lineTo(left, shoulder); g.quadraticCurveTo(left, H * .15, mid, H * .09); g.quadraticCurveTo(right, H * .15, right, shoulder); g.lineTo(right, base); g.stroke();
            g.strokeStyle = 'rgba(238,228,200,.055)'; g.lineWidth = 1; g.beginPath(); g.moveTo(mid, H * .1); g.lineTo(mid, base); g.stroke(); g.strokeStyle = 'rgba(185,154,98,.16)'; g.lineWidth = 2;
          }
          const rx = W * .78, ry = H * .22, rr = Math.min(74, W * .1);
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU, b = (i + 1) / 12 * TAU;
            g.fillStyle = i % 3 === 0 ? 'rgba(109,38,56,.12)' : i % 3 === 1 ? 'rgba(36,55,91,.12)' : 'rgba(185,154,98,.07)';
            g.beginPath(); g.moveTo(rx, ry); g.arc(rx, ry, rr, a, b); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(238,228,200,.11)'; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr); g.stroke();
          }
          g.strokeStyle = 'rgba(185,154,98,.22)'; g.lineWidth = 3; g.beginPath(); g.arc(rx, ry, rr, 0, TAU); g.stroke();
          g.lineWidth = 1; g.beginPath(); g.arc(rx, ry, rr * .42, 0, TAU); g.stroke();
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
          if (veteranExpedition) {
            hueCache.umbraGlow = glowSprite(260, H, '176,160,223', .3);
            hueCache.umbraPool = glowSprite(280, 100, '176,160,223', .5);
          }
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
      ctx.drawImage(hueCache.tracery, 0, 0);
    }
    function drawMerge() {
      if (veteran) {
        const swing = clamp(mergeGravityX / 230, -1, 1), pendulumX = 154;
        ctx.strokeStyle = '#d9c7f366'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pendulumX, 12); ctx.lineTo(pendulumX + swing * 27, 65); ctx.stroke();
        ctx.fillStyle = '#d9c7f3'; ctx.beginPath(); ctx.arc(pendulumX + swing * 27, 65, 6, 0, TAU); ctx.fill();
        if (compactHUD()) {
          hudText(mergeForecast ? `${mergeForecast.telegraph ? 'ANCHOR WINDOW' : 'PENDULUM'} · ${Math.ceil(mergeForecast.remaining)}s` : 'PENDULUM · BETWEEN FRONTS', W / 2, 108, 10, mergeForecast?.telegraph ? '#edf19b' : '#d9c7f3');
          if (mergeForecast?.telegraph) hudText('DROP NOW → CAST AN ANCHOR', W / 2, 138, 10, '#edf19b');
        } else {
          text(mergeForecast ? `${mergeForecast.telegraph ? 'FORECAST' : 'PENDULUM'} · ${mergeForecast.name}` : 'PENDULUM ORRERY · BETWEEN FRONTS', W - 24, 23, 9, mergeForecast?.telegraph ? '#edf19b' : '#d9c7f3', 'right');
          if (mergeForecast) text(`${Math.ceil(mergeForecast.remaining)}s · ${mergeForecast.hint}`, W - 24, 40, 9, '#b7abc9', 'right');
          if (mergeForecast?.telegraph) text('DROP NOW → CAST AN ANCHOR', W / 2, 76, 9, '#edf19b');
        }
        if (mergeBoss) {
          const bx = W / 2 + Math.sin(time * .55) * 72, by = 132;
          ctx.save(); ctx.translate(bx, by); ctx.rotate(reduced ? 0 : time * .08);
          ctx.fillStyle = '#210f1ddd'; ctx.strokeStyle = mergeBoss.telegraph > 0 ? '#f5a08c' : '#b99a62'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, 33, 0, TAU); ctx.fill(); ctx.stroke();
          for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29); ctx.stroke(); }
          ctx.rotate(reduced ? 0 : -time * .16); ctx.strokeStyle = '#eee4c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.moveTo(0, 0); ctx.lineTo(15, 7); ctx.stroke(); ctx.restore();
          hudText(mergeBoss.stage >= 3 ? 'HOROLOGIST · COMPLETE' : compactHUD() ? `${mergeBoss.telegraph > 0 ? 'TOLL!' : 'HOROLOGIST'} · ${mergeBoss.stage + 1}/3 · ${mergeBoss.progress}/${[1, 2, 3][mergeBoss.stage]}` : `THE HOROLOGIST · ${mergeBoss.stage + 1}/3 · ${mergeBoss.progress}/${[1, 2, 3][mergeBoss.stage]}`, W / 2, 181, 10, mergeBoss.telegraph > 0 ? '#f5a08c' : '#edf19b');
        }
      }
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
        hudText('ROOM IS GETTING COSY', W / 2, compactHUD() ? 160 : 115, 10, '#ffacb4'); ctx.fillStyle = '#f58e9b'; ctx.fillRect(24, 88, (W - 48) * t, 3);
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
      if (veteran) for (const shelf of mergeShelves) {
        const left = shelf.x - shelf.half, right = shelf.x + shelf.half, ly = shelf.y - shelf.half * shelf.slope, ry = shelf.y + shelf.half * shelf.slope;
        ctx.strokeStyle = '#21121a'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(left, ly + 4); ctx.lineTo(right, ry + 4); ctx.stroke();
        ctx.strokeStyle = mergeBracing ? '#edf19b' : '#aa8854'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(left, ly); ctx.lineTo(right, ry); ctx.stroke();
        ctx.strokeStyle = '#eee4c888'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, ly - 2); ctx.lineTo(right, ry - 2); ctx.stroke();
        for (let i = -2; i <= 2; i++) { const x = shelf.x + i * shelf.half / 2.5, y = shelf.y + (x - shelf.x) * shelf.slope; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke(); }
        text('RELIQUARY', shelf.x, shelf.y + 19, 7, '#b99a62');
      }
      if (phase !== 'over' && phase !== 'ending') {
        const r = radii[queue[0]], x = clamp(aim, r + 24, W - r - 24);
        let landing = H - 27 - r;
        for (const b of balls) { const dx = Math.abs(x - b.x), sum = r + radii[b.tier]; if (dx < sum) landing = Math.min(landing, b.y - Math.sqrt(sum * sum - dx * dx)); }
        if (veteran) for (const shelf of mergeShelves) if (Math.abs(x - shelf.x) < shelf.half + r * .25) landing = Math.min(landing, shelf.y + (x - shelf.x) * shelf.slope - r);
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
        if (veteran && b.anchorKey && b.anchorKey === mergeForecastKey && mergeForecast) {
          ctx.strokeStyle = '#edf19b'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.arc(b.x, b.y, radii[b.tier] + 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          text('ANCHOR', b.x, b.y - radii[b.tier] - 12, 7, '#edf19b');
        }
        if (b.born > 0) { ctx.globalAlpha = b.born / .32; star(ctx, b.x + radii[b.tier] * .28, b.y - radii[b.tier] * .3, radii[b.tier] * .16, '#fff7de', 4, reduced ? 0 : visualTime * 4); ctx.globalAlpha = 1; }
        // Planets at the rim look alarmed; the rest keep smiling.
        if (b.y - radii[b.tier] < 100 && b.age > 2.2) {
          const r = radii[b.tier];
          ctx.strokeStyle = '#18212d'; ctx.lineWidth = Math.max(1.2, r * .04);
          ctx.beginPath(); ctx.moveTo(b.x - r * .3, b.y - r * .12); ctx.lineTo(b.x - r * .16, b.y - r * .2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(b.x + r * .3, b.y - r * .12); ctx.lineTo(b.x + r * .16, b.y - r * .2); ctx.stroke();
        }
      }
      if (veteran) for (const enemy of mergeEnemies) {
        if (enemy.state === 'telegraph') {
          ctx.strokeStyle = '#f5a08c'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(enemy.x, 82); ctx.lineTo(enemy.x, 160); ctx.stroke(); ctx.setLineDash([]);
          if (!compactHUD() || !mergeBoss) hudText(`GARGOYLE ${Math.max(1, Math.ceil(enemy.timer))}`, enemy.x, 183, 10, '#f5a08c', 'center', 'world'); continue;
        }
        ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.fillStyle = '#24101d'; ctx.strokeStyle = '#f5a08c'; ctx.lineWidth = 2;
        ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? 12 : 18; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#eee4c8'; ctx.fillRect(-7, -4, 4, 3); ctx.fillRect(3, -4, 4, 3); ctx.restore();
        if (enemy.state === 'latched') text('WEIGHT', enemy.x, enemy.y - 25, 7, '#f5a08c');
      }
      pileT = clamp((H - 92 - topY) / (H - 120), 0, 1);
      if (combo > 1) hudText(compactHUD() ? `${combo}× CHAIN` : `${combo}× CHAIN REACTION`, W / 2, H - 6, 11, '#edf19b');
      // The chain window, made visible: watch it drain and plan the next merge.
      if (combo > 0 && comboTimer > 0) {
        ctx.fillStyle = '#edf19b2e'; ctx.fillRect(W / 2 - 60, 30, 120, 4);
        ctx.fillStyle = comboTimer < .3 ? '#f5a08c' : '#edf19b'; ctx.fillRect(W / 2 - 60, 30, 120 * clamp(comboTimer / (has('echo-hourglass') ? 2.4 + (has('quake-core') && combo > 1 ? .6 : 0) : .85), 0, 1), 4);
        hudText(`${combo}× CHAIN`, W / 2, 24, 9, '#edf19b');
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
        text('STORM', gateX, H * .16, 9, '#f5a08c');
        text('GOLD', gateX, H * .5, 9, '#edf19b');
        text('MOON', gateX, H * .84, 9, '#a9d3be');
      }
      if (veteran) {
        for (const current of surfCurrents) {
          const x = current.x - camera;
          if (x + current.width < -30 || x > W + 30) continue;
          ctx.fillStyle = '#6d263814'; ctx.fillRect(x, current.y - current.height / 2, current.width, current.height);
          ctx.fillStyle = '#6d263817'; ctx.fillRect(x, current.y - current.height * .25, current.width, current.height * .5);
          ctx.strokeStyle = '#c1a26b66'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 12]);
          for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, current.y + side * current.height / 2); ctx.lineTo(x + current.width, current.y + side * current.height / 2); ctx.stroke(); }
          ctx.setLineDash([]);
          for (let i = 0; i < 3; i++) { const ax = x + 50 + i * 78, ay = current.y + current.direction * (i - 1) * 19; ctx.beginPath(); ctx.moveTo(ax - 9, ay - current.direction * 7); ctx.lineTo(ax, ay + current.direction * 7); ctx.lineTo(ax + 9, ay - current.direction * 7); ctx.stroke(); }
          text(`SOLAR CURRENT ${current.direction > 0 ? '↓' : '↑'}`, x + current.width / 2, current.y - current.height / 2 - 9, 7, '#c9ae7b');
        }
        for (const system of binarySystems) {
          const ax = system.a.x - camera, bx = system.b.x - camera;
          if (Math.max(ax, bx) < -80 || Math.min(ax, bx) > W + 80) continue;
          ctx.strokeStyle = '#d9c7f355'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.moveTo(ax, system.a.y); ctx.lineTo(bx, system.b.y); ctx.stroke(); ctx.setLineDash([]);
          text('TWIN STAR', system.x - camera, system.y - system.radius - 45, 9, '#d9c7f3');
        }
        for (const gate of surfGates) {
          const x = gate.x - camera, gap = gate.currentGap || gate.gap, huntOpen = surfBoss?.stage === 1;
          if (x < -40 || x > W + 40) continue;
          const top = gate.gapY - gap / 2, bottom = gate.gapY + gap / 2;
          ctx.fillStyle = huntOpen ? '#17152a38' : '#17152acc'; ctx.fillRect(x - 11, 0, 22, Math.max(0, top)); ctx.fillRect(x - 11, bottom, 22, H - bottom);
          ctx.strokeStyle = huntOpen ? '#9ed7c655' : gate.cooldown > 0 ? '#f58e9b' : '#d9c7f3'; ctx.lineWidth = 2;
          for (const y of [top, bottom]) { ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.stroke(); }
          for (let y = 22; y < H; y += 46) if (y < top - 8 || y > bottom + 8) star(ctx, x, y, 7, '#8f83bd', 4, gate.phase + y);
          ctx.globalAlpha = .25; ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.moveTo(x - 34, gate.gapY); ctx.lineTo(x + 34, gate.gapY); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
          if (gate.pattern === 'crown') { orb(ctx, x, gate.gapY, 25, 3, false, visualTime * .15); text('OR', x, gate.gapY - 38, 8, '#edf19b'); }
          text(huntOpen ? `${gate.label} · OPEN FOR THE HUNT` : gate.label, x, clamp(top - 12, 18, H - 18), 8, huntOpen ? '#9ed7c6' : '#d9c7f3');
        }
        hudText(compactHUD() ? `${surfGatesPassed} CLEAN GATES` : `TWIN-STAR ROUTE · ${surfGatesPassed} CLEAN GATES`, W - 28, compactHUD() ? H - 30 : H - 44, 10, '#d9c7f3', 'right');
        hudText(`TWINLIGHT ${Math.floor(surfCharge)}/100`, W - 28, compactHUD() ? H - 105 : H - 60, 10, '#edf19b', 'right');
        const swapReady = tether?.planet?.binary && surfCharge >= 25;
        const surfInstruction = compactHUD() ? (tether?.planet?.binary ? 'X SWAP · E VEIL SLOWS ORBIT' : 'X HOOK · E VEIL · RINGS REFILL') : tether?.planet?.binary ? `X · SWAP TWIN (25)${swapReady ? '' : ' · NEED TWINLIGHT'}` : surfCharge >= 50 ? 'X · STARHOOK NEAREST MARKED PLANET (50)' : 'RINGS + CLEAN GATES REFILL TWINLIGHT';
        hudText(surfInstruction, W / 2, 74, 10, swapReady || !tether && surfCharge >= 50 ? '#edf19b' : '#b7abc9');
      }
      const hookTarget = veteran && !tether && surfCharge >= 50 ? worlds.map(w => ({ w, d: Math.hypot(w.x - ship.x, w.y - ship.y) })).filter(p => p.w.x > ship.x - 50 && p.d < 430 && p.d > p.w.r + 15).sort((a, b) => a.d - b.d)[0]?.w : null;
      for (const w of worlds) {
        const x = w.x - camera;
        const fieldRadius = tetherReach();
        ctx.strokeStyle = tether?.planet === w ? '#edf19b55' : has('longwave-tether') ? '#bba7ed30' : '#bba7ed18'; ctx.lineWidth = 1; ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.arc(x, w.y, tether?.planet === w ? tether.radius : fieldRadius, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        orb(ctx, x, w.y, w.r, w.tier, true, Math.sin(visualTime) * .08, 1, visualTime);
        if (w === hookTarget) {
          ctx.strokeStyle = '#edf19b'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, w.y, w.r + 12, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          text('X · STARHOOK', x, w.y - w.r - 20, 8, '#edf19b');
        }
      }
      for (const r of rings) {
        if (r.taken) continue;
        ctx.strokeStyle = '#edf19b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(r.x - camera, r.y, 21 + Math.sin(visualTime * 3) * 2, 32, -.3, 0, TAU); ctx.stroke();
        star(ctx, r.x - camera, r.y, 7, '#edf19b');
      }
      for (const r of rocks) { orb(ctx, r.x - camera, r.y, r.r, 3, false, visualTime * .2); ctx.strokeStyle = '#ff919a55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(r.x - camera, r.y, r.r + 7, 0, TAU); ctx.stroke(); }
      if (veteran) {
        for (const hunter of surfHunters) {
          const x = hunter.x - camera;
          if (hunter.state === 'aim') {
            ctx.strokeStyle = '#f5a08c99'; ctx.lineWidth = 1.5; ctx.setLineDash([7, 7]); ctx.beginPath(); ctx.moveTo(x, hunter.y); ctx.lineTo(hunter.targetX - camera, hunter.targetY); ctx.stroke(); ctx.setLineDash([]);
            hudText('DIVE', hunter.targetX - camera, hunter.targetY - 18, 10, '#f5a08c', 'center', 'world');
          }
          ctx.save(); ctx.translate(x, hunter.y); ctx.rotate(hunter.state === 'dive' ? Math.atan2(hunter.vy, hunter.vx) : 0);
          ctx.fillStyle = '#210e1b'; ctx.strokeStyle = '#f5a08c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, -12); ctx.lineTo(-6, 0); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#eee4c8'; ctx.beginPath(); ctx.arc(4, 0, 3, 0, TAU); ctx.fill(); ctx.restore();
        }
        if (surfBoss) {
          const x = W - 92, y = 142 + surfBoss.stage * 105;
          ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#160d20cc'; ctx.strokeStyle = '#c2a36b'; ctx.lineWidth = 2;
          for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * 27, 0, 27, 0, TAU); ctx.fill(); ctx.stroke(); star(ctx, side * 27, 0, 10, '#eee4c8', 6, reduced ? 0 : side * visualTime * .3); }
          ctx.beginPath(); ctx.moveTo(-8, -34); ctx.lineTo(0, -50); ctx.lineTo(8, -34); ctx.stroke(); ctx.restore();
          hudText(surfBoss.stage >= 3 ? 'REGENT · COMPLETE' : compactHUD() ? `REGENT ${surfBoss.stage + 1}/3 · ${surfBoss.progress}/${[2, 2, 3][surfBoss.stage]}` : `BINARY REGENT · ${surfBoss.stage + 1}/3 · ${surfBoss.progress}/${[2, 2, 3][surfBoss.stage]}`, W - 24, compactHUD() ? H - 180 : y + 53, 10, '#edf19b', 'right');
        }
      }
      trail(ship.trail, flightBoost > 0 ? '#edf19b' : '#f5ba9c', camera, flightBoost > 0 ? 19 : 15);
      if (tether) {
        ctx.globalAlpha = .12; ctx.strokeStyle = '#f0f3a0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(tether.planet.x - camera, tether.planet.y); ctx.lineTo(ship.x - camera, ship.y); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#f0f3a099'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tether.planet.x - camera, tether.planet.y); ctx.lineTo(ship.x - camera, ship.y); ctx.stroke();
      }
      // The re-entry burn: the ship fades out of its own story.
      const reentry = phase === 'ending' ? Math.max(.12, finishDelay / 1.3) : 1;
      ctx.globalAlpha = (invulnerable > 0 && Math.sin(visualTime * 30) > 0 ? .35 : 1) * reentry;
      if (shields > 0) { ctx.strokeStyle = '#9ed7c6aa'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(ship.x - camera, ship.y, 22 + Math.sin(visualTime * 5) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (surfVeil > 0) { ctx.fillStyle = '#bba7ed22'; ctx.strokeStyle = '#eee4c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ship.x - camera, ship.y, 28, 0, TAU); ctx.fill(); ctx.stroke(); text('REFLECT', ship.x - camera, ship.y - 36, 7, '#d9c7f3'); }
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
      if (veteranExpedition && Math.abs(dashTide) >= 8 && (!whale || !compactHUD())) {
        ctx.strokeStyle = '#b99a6244'; ctx.lineWidth = 1.5; ctx.setLineDash([12, 15]);
        for (const y of [176, 302, 420]) { ctx.beginPath(); ctx.moveTo(dashTide > 0 ? 45 : W - 45, y); ctx.lineTo(dashTide > 0 ? W - 45 : 45, y); ctx.stroke(); }
        ctx.setLineDash([]); hudText(`${compactHUD() ? (dashTide > 0 ? 'TIDE →' : '← TIDE') : dashTideName}${dashAnchor ? ' · ANCHOR' : ''}`, W / 2, 144, 10, dashAnchor ? '#edf19b' : '#b99a62');
      }
      const umbraWeather = veteranExpedition && stageCatalog()[dashStageIndex]?.umbra;
      if (umbraWeather) {
        ctx.fillStyle = '#08081766'; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = .8; ctx.drawImage(hueCache.umbraGlow, umbraLightX - 130, 0); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#c4b5f266'; ctx.setLineDash([4, 10]); ctx.lineWidth = 1.5;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(umbraLightX + side * 112, 82); ctx.lineTo(umbraLightX + side * 112, H - 88); ctx.stroke(); }
        ctx.setLineDash([]);
        if (compactHUD()) hudText(umbraRein ? 'REINED · RELEASE S' : 'LIT STARS · S REIN · E BANK', W / 2, 140, 10, umbraRein ? '#edf19b' : '#d9c7f3');
        else {
          hudText('ROAMING LANTERN · ONLY LIT DARK STARS CAN LAND', umbraLightX, 96, 10, '#d9c7f3');
          hudText(umbraRein ? 'LANTERN REINED · RELEASE S / ↓ TO LET GO' : 'S / ↓ TOW (LIT CATCHES REFILL) · DASH UNLIT STARS, THEN BREAK THEIR SHADES', W / 2, 118, 10, umbraRein ? '#edf19b' : '#b7abc9');
        }
        if (umbraRein) { ctx.strokeStyle = '#edf19b66'; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(umbraLightX, 154); ctx.lineTo(catcher.x, H - 90); ctx.stroke(); ctx.setLineDash([]); }
      }
      if (slow > 0 && hueCache.motes) {
        ctx.fillStyle = '#d8f4ec';
        for (const m of hueCache.motes) { ctx.globalAlpha = .1; ctx.beginPath(); ctx.arc(m.x * W, (m.y * H + (reduced ? 0 : visualTime * 8 * m.d)) % H, 1.2, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      for (const f of falling) {
        if (f.wait > 0) { if (f.bad) { hudText(f.moth ? 'GLOAM MOTH' : f.shade ? 'SHADE' : '⌄', f.x, 28, f.shade || f.moth ? 10 : 25, f.shade || f.moth ? '#e29eb7' : '#ff9aa4', 'center', 'world'); ctx.fillStyle = f.shade || f.moth ? '#bba7ed18' : '#f58e9b10'; ctx.fillRect(f.x - 22, 30, 44, H - 100); } continue; }
        if (f.moth) {
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(reduced ? 0 : Math.sin(f.spin * 9) * .18);
          ctx.strokeStyle = '#e29eb7'; ctx.fillStyle = '#251020'; ctx.lineWidth = 2;
          for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * 27, -20, side * 23, 10); ctx.quadraticCurveTo(side * 12, 19, 0, 5); ctx.fill(); ctx.stroke(); }
          ctx.fillStyle = '#eee4c8'; ctx.fillRect(-2, -9, 4, 20); ctx.restore();
          hudText(f.fleeing ? 'REPELLED' : combo >= 3 ? `HUNTING ${Math.min(5, combo)}` : 'BANKED = SAFE', f.x, f.y - 28, 7, '#e29eb7', 'center', 'world');
        }
        else if (f.shade) {
          ctx.strokeStyle = '#e29eb755'; ctx.lineWidth = 3; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(f.x, Math.max(30, f.y - 65)); ctx.lineTo(f.x, f.y - 12); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = '#171020'; ctx.strokeStyle = '#e29eb7'; ctx.lineWidth = 2; ctx.beginPath();
          for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f.spin * .25, r = i % 2 ? 8 : 17; ctx.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          if (f.y > 280) hudText('DASH TO BREAK', f.x, f.y - 27, 8, '#e29eb7', 'center', 'world');
        }
        else if (f.bad) { ctx.strokeStyle = '#f58e9b30'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(f.x + 8, f.y - 35); ctx.lineTo(f.x, f.y); ctx.stroke(); orb(ctx, f.x, f.y, f.r, 3, false, f.spin); }
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
            ctx.fillStyle = '#152029'; ctx.font = '19px "IM Fell English", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(def.glyph, 0, 1); ctx.textBaseline = 'alphabetic';
            ctx.restore();
          }
        }
        else if (f.kind === 'jelly') { ctx.fillStyle = '#bba7ed'; ctx.beginPath(); ctx.arc(f.x, f.y, 17, Math.PI, TAU); ctx.lineTo(f.x + 17, f.y + 6); ctx.quadraticCurveTo(f.x, f.y - 4, f.x - 17, f.y + 6); ctx.fill(); for (let i = -1; i <= 1; i++) { ctx.strokeStyle = '#bba7ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x + i * 10, f.y + 3); ctx.quadraticCurveTo(f.x + i * 10 + Math.sin(visualTime * 5) * 7, f.y + 18, f.x + i * 10, f.y + 25); ctx.stroke(); } }
        else if (f.umbra) {
          ctx.globalAlpha = f.umbraLit ? 1 : .28; star(ctx, f.x, f.y, f.r * 1.65, f.umbraLit ? '#edf19b' : '#a895d4', 5, f.spin);
          ctx.globalAlpha = f.umbraLit ? .85 : .38; ctx.strokeStyle = f.umbraLit ? '#edf19b' : '#bba7ed'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
        else { ctx.globalAlpha = .15; star(ctx, f.x, f.y, f.r * 1.8, '#edf19b', 4, f.spin); ctx.globalAlpha = 1; star(ctx, f.x, f.y, f.r, '#edf19b', 4, f.spin); }
      }
      const reach = magnetReach();
      if (reach) { ctx.strokeStyle = has('lodestone') ? '#bba7ed77' : '#bba7ed55'; ctx.setLineDash([5, 8]); ctx.beginPath(); ctx.arc(catcher.x, H - 72, reach + Math.sin(visualTime * 3) * 5, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (activePower?.id === 'prism-net') { ctx.strokeStyle = '#e29eb777'; ctx.setLineDash([4, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(catcher.x, H - 72, basketWidth() + 10, 44, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (slow > 0) { ctx.fillStyle = 'rgba(158,215,198,.055)'; ctx.fillRect(0, 0, W, H); }
      // Active power-up chip: canvas-first so it is visible even when the DOM
      // build panel is scrolled away on a phone.
      if (activePower && compactHUD()) {
        const shortNames = { 'lodestone-bloom': 'BLOOM', 'clock-moth': 'CLOCK', moonshield: 'SHIELD', 'prism-net': 'NET', 'star-prism': 'PRISM' };
        hudText(`${shortNames[activePower.id] || 'POWER'} ${activePower.charges ? `${activePower.charges}×` : `${Math.ceil(activePower.remaining)}s`}`, W / 2, H - 150, 10, activePower.colour);
      } else if (activePower) {
        const px = 22, py = 14, pw = 136;
        ctx.globalAlpha = .92; ctx.fillStyle = '#101c22e6'; ctx.fillRect(px, py, pw, 30); ctx.globalAlpha = 1;
        ctx.strokeStyle = activePower.colour + '88'; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, pw - 1, 29);
        ctx.fillStyle = activePower.colour; ctx.font = '15px "IM Fell English", Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(activePower.glyph, px + 9, py + 16); ctx.textBaseline = 'alphabetic';
        text(activePower.name.toUpperCase(), px + 30, py + 12, 9, '#e8dfc8', 'left');
        text(activePower.charges ? `${activePower.charges}×` : `${Math.ceil(activePower.remaining)}s`, px + pw - 8, py + 12, 10, activePower.colour, 'right');
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
      // The Umbra Whale: a friendly silhouette swimming the upper sky.
      if (whale) {
        const wy = 74 + (reduced ? 0 : Math.sin(visualTime * .8) * 6);
        ctx.save(); ctx.translate(whale.x, wy);
        ctx.globalAlpha = .94; ctx.fillStyle = '#0b1522';
        ctx.beginPath(); ctx.ellipse(0, 0, 150, 46, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(140, 0); ctx.quadraticCurveTo(190, -34, 210, -46); ctx.quadraticCurveTo(188, -8, 186, 0); ctx.quadraticCurveTo(188, 8, 210, 46); ctx.quadraticCurveTo(190, 34, 140, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-30, 30, 60, 18, .3, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#9ed7c644'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -4, 150, 44, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.fillStyle = '#edf19b'; ctx.beginPath(); ctx.arc(-104, -8, 3.5, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        if (veteranExpedition) {
          hudText(compactHUD() ? `CHOIR ${Math.min(3, whale.finaleStage + 1)}/3 · C${whale.caught} · B${whale.banked}/${[3, 4, 5][whale.finaleStage] || 0}` : `WHALE CHOIR ${Math.min(3, whale.finaleStage + 1)}/3 · CAUGHT ${whale.caught} · OFFERED ${whale.banked}/${[3, 4, 5][whale.finaleStage] || 0}`, compactHUD() ? W / 2 : clamp(whale.x, 220, W - 220), 132, 10, '#edf19b');
          for (let i = 0; i < 3; i++) { ctx.fillStyle = i < whale.finaleStage ? '#edf19b' : '#9ed7c644'; ctx.fillRect(W / 2 - 54 + i * 38, 151, 30, 3); }
        }
        // Breath lanes, telegraphed before the stars fall.
        for (const laneX of breathLanes) {
          ctx.strokeStyle = '#9ed7c6'; ctx.globalAlpha = .35 + (reduced ? 0 : Math.sin(visualTime * 6) * .15);
          ctx.setLineDash([6, 10]); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(laneX, 120); ctx.lineTo(laneX, H - 90); ctx.stroke(); ctx.setLineDash([]);
          text('⌄', laneX, 138, 20, '#9ed7c6');
          ctx.globalAlpha = 1;
        }
      }
      if (expedition) {
        const mission = currentMission();
        if (mission) {
          const shortMissions = { umbra: 'LIT DARK STARS', catch: 'CATCH STARS', calm: 'NO HITS', centre: 'CENTRE STARS', gift: 'CATCH A GIFT', surge: 'SURGE STARS', whaleBank: 'BANK BREATH', whale: 'CATCH BREATH' };
          hudText(compactHUD() ? `${missionDone ? '✓ ' : ''}${shortMissions[mission.id] || mission.id.toUpperCase()} ${Math.floor(missionProgress)}/${mission.target}` : `${missionDone ? '✓ ' : ''}${mission.text.toUpperCase()} · ${Math.floor(missionProgress)}/${mission.target}`, 26, compactHUD() ? 82 : 56, 10, missionDone ? '#a9d3be' : '#a9b6c3', 'left');
        }
        const stageName = whale ? 'THE WHALE' : stageCatalog()[dashStageIndex]?.name;
        if (stageName) hudText(compactHUD() ? stageName.replace('THE ', '') : stageName, W - 27, compactHUD() ? 82 : 58, 10, '#cbb287', 'right');
      }
      hudText(`${Math.ceil(remaining)}s`, W - 27, compactHUD() ? 36 : 35, 22, remaining <= 10 && !expedition ? '#edf19b' : '#eee7d4', 'right');
      hudText(combo > 0 ? compactHUD() ? `${combo} STREAK ×${Math.min(8, 1 + Math.floor(combo / 5))}` : `${combo} STREAK · ×${Math.min(8, 1 + Math.floor(combo / 5))}` : compactHUD() ? 'CATCH STARS · BANK ×3+' : 'GOLD IS GOOD. PINK IS TROUBLE.', W / 2, compactHUD() ? 36 : 30, 11, combo > 0 ? '#edf19b' : '#b7abc9');
      ctx.fillStyle = '#9ed7c622'; ctx.fillRect(25, H - 20, W - 50, 3);
      if (remaining <= 10 && !expedition) { ctx.globalAlpha = reduced ? .8 : .5 + .4 * Math.sin(visualTime * 8); ctx.fillStyle = '#edf19b'; }
      else ctx.fillStyle = '#9ed7c6';
      ctx.fillRect(25, H - 20, (W - 50) * remaining / (expedition ? expeditionLength() : 75), 3); ctx.globalAlpha = 1;
      // The boat carries a lantern-pool of light.
      ctx.globalAlpha = .22 + glow * .3;
      ctx.drawImage(hueCache.poolGlow, catcher.x - 70, H - 88); ctx.globalAlpha = 1;
      if (umbraWeather) { ctx.globalAlpha = .7; ctx.drawImage(hueCache.umbraPool, umbraLightX - 140, H - 112); ctx.globalAlpha = 1; }
    }
    function drawBreaker() {
      // The arena is an orrery: visible tracks, a beating heart at the centre.
      const alive = bricks.reduce((n, b) => n + (b.hp > 0 ? 1 : 0), 0);
      const critical = alive > 0 && alive <= bricks.length / 4;
      if (veteran) {
        hudText(cathedralBoss ? `${compactHUD() ? 'FINAL' : 'LAST CATHEDRAL'} · ${['LITANY', 'DISCORD', 'ROSE HEART'][cathedralBoss.stage]} · ${cathedralBoss.progress}/${[3, 2, 2][cathedralBoss.stage]}` : compactHUD() ? `CATHEDRAL · ${cathedralPatterns[(level - 1) % cathedralPatterns.length]}` : `CATHEDRAL · ${cathedralPatterns[(level - 1) % cathedralPatterns.length]}`, W / 2, compactHUD() ? 32 : 28, 11, '#d9c7f3');
        hudText(cathedralBoss ? ['FOLLOW GLASS ORDER', 'PARRY/CENSER 2 MOTES', '2 FOCUS BREAKS'][cathedralBoss.stage] : compactHUD() ? (bricks.some(b => b.key && b.hp > 0) ? 'BREAK GOLD KEYSTONES' : 'GLASS UNSEALED') : bricks.some(b => b.key && b.hp > 0) ? 'GOLD KEYSTONES BREAK THE SEALS' : 'THE GLASS IS UNSEALED', W / 2, compactHUD() ? 80 : 52, 10, '#edf19b');
      }
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
      if (veteran && choirSource) {
        const a = Math.atan2(choirSource.y - H / 2, choirSource.x - W / 2);
        ctx.strokeStyle = '#e29eb7'; ctx.lineWidth = 2; ctx.setLineDash([6, 7]); ctx.beginPath(); ctx.moveTo(choirSource.x, choirSource.y);
        ctx.lineTo(W / 2 + Math.cos(a) * 255, H / 2 + Math.sin(a) * 255); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(choirSource.x, choirSource.y, choirSource.r + 11, 0, TAU); ctx.stroke();
        hudText(compactHUD() ? `CHOIR ${Math.max(1, Math.ceil(choirCharge))} · PARRY/E` : `CHOIR ${Math.max(1, Math.ceil(choirCharge))} · BREAK OR PARRY`, (choirSource.x + W / 2 + Math.cos(a) * 235) / 2, (choirSource.y + H / 2 + Math.sin(a) * 235) / 2 - 12, 10, '#e29eb7', 'center', 'world');
      }
      if (veteran && censerTime > 0) {
        ctx.strokeStyle = '#d9c7f388'; ctx.lineWidth = 2; ctx.setLineDash([4, 8]);
        for (const r of [56, 91, 132]) { ctx.beginPath(); ctx.arc(W / 2, H / 2, r, reduced ? 0 : visualTime * .3, TAU - .4); ctx.stroke(); }
        ctx.setLineDash([]); if (!compactHUD()) text(`ROSE CENSER ${censerTime.toFixed(1)}s`, W / 2, H / 2 + 111, 8, '#d9c7f3');
      }
      if (veteran) for (const sentry of cathedralSentries) {
        if (sentry.timer < 1.25) {
          ctx.strokeStyle = '#e29eb777'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(sentry.x, sentry.y); ctx.lineTo(W / 2 + Math.cos(sentry.angle) * 255, H / 2 + Math.sin(sentry.angle) * 255); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.save(); ctx.translate(sentry.x, sentry.y); ctx.rotate(sentry.angle);
        ctx.fillStyle = '#25101f'; ctx.strokeStyle = sentry.timer < 1.25 ? '#f5a08c' : '#b99a62'; ctx.lineWidth = 2;
        ctx.fillRect(-11, -11, 22, 22); ctx.strokeRect(-11, -11, 22, 22); ctx.strokeStyle = '#eee4c8'; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.stroke(); ctx.restore();
        hudText(sentry.timer < 1.25 ? 'DISCORD' : 'SENTRY', sentry.x, sentry.y - 23, sentry.timer < 1.25 ? 10 : 8, '#e29eb7', 'center', 'world');
      }
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
        if (veteran && b.motion) {
          ctx.globalAlpha = .22; ctx.strokeStyle = '#bba7ed'; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
          ctx.beginPath(); ctx.moveTo(b.baseX, b.baseY); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle + .4);
        const popScale = 1 + (b.hit / .2) * (reduced ? .14 : .28);
        ctx.scale(popScale, popScale);
        ctx.fillStyle = b.hit > 0 ? '#fff4d4' : b.bossCore ? '#5a1f38' : colours[b.tier]; ctx.beginPath();
        for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i / 6 * TAU) * b.r, Math.sin(i / 6 * TAU) * b.r);
        ctx.closePath(); ctx.fill();
        if (b.hp > 1) {
          ctx.globalAlpha = reduced ? .45 : .3 + Math.sin(visualTime * 2.5 + b.angle) * .15;
          ctx.strokeStyle = '#271c46'; ctx.lineWidth = 2; ctx.strokeRect(-5, -5, 10, 10); ctx.globalAlpha = 1;
        }
        // Family marks: pulse crystals breathe blue; the heart beats pink.
        if (b.family === 'pulse') { ctx.fillStyle = '#a6d9ec'; ctx.beginPath(); ctx.arc(0, 0, 4 + (reduced ? 0 : Math.sin(visualTime * 4) * 1.5), 0, TAU); ctx.fill(); }
        else if (b.family === 'heart') { ctx.fillStyle = '#f5a08c'; ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♥', 0, 1); ctx.textBaseline = 'alphabetic'; }
        if (veteran && !b.key && !b.bossCore) {
          const orderColours = ['#eee4c8', '#e29eb7', '#edcf83'];
          ctx.strokeStyle = orderColours[b.order]; ctx.lineWidth = b.order === litanyTarget && (!b.sealed || !bricks.some(k => k.key && k.hp > 0)) ? 3 : 1.4;
          ctx.beginPath(); if (b.order === 0) ctx.arc(0, 0, 5, 0, TAU); else if (b.order === 1) { ctx.moveTo(0, -6); ctx.lineTo(6, 5); ctx.lineTo(-6, 5); ctx.closePath(); } else ctx.rect(-5, -5, 10, 10); ctx.stroke();
        }
        if (veteran && b.bossCore) {
          ctx.strokeStyle = '#eee4c8'; ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 10, Math.sin(a) * 10, 10, 4, a, 0, TAU); ctx.stroke(); }
          star(ctx, 0, 0, 7, '#edf19b', 8, 0);
        }
        if (veteran && b.key) { star(ctx, 0, 0, 8, '#fff3a6', 4, reduced ? 0 : visualTime); }
        else if (veteran && b.sealed && bricks.some(k => k.key && k.hp > 0)) {
          ctx.strokeStyle = '#edf19b'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(0, 0, b.r + 5, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = '#211b35'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('×', 0, 1); ctx.textBaseline = 'alphabetic';
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      for (const bolt of choirBolts) {
        ctx.strokeStyle = '#e29eb766'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bolt.x - bolt.vx * .16, bolt.y - bolt.vy * .16); ctx.lineTo(bolt.x, bolt.y); ctx.stroke();
        ctx.save(); ctx.translate(bolt.x, bolt.y); ctx.rotate(bolt.angle + Math.PI / 4); ctx.fillStyle = '#27142e'; ctx.strokeStyle = '#ffd0e2'; ctx.lineWidth = 2;
        ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16); ctx.restore();
        text('PARRY', bolt.x, bolt.y - 18, 8, '#ffd0e2');
      }
      for (const c of comets) {
        trail(c.trail, c.focus >= 2 ? '#edf19b' : c.secondary ? '#9ed7c6' : slowTime > 0 ? '#edf19b' : '#fac7a5', 0, c.secondary ? 8 : 10);
        // Comets are light sources, not dots.
        const glowSprite = c.focus >= 2 ? hueCache.cometGlowGold : c.secondary ? hueCache.cometGlowMint : slowTime > 0 ? hueCache.cometGlowGold : hueCache.cometGlow;
        const s = cometRadius() * (has('dense-core') ? 5 : 4) * (launchTimer > 0 && phase === 'running' && !reduced ? 1 + Math.sin(visualTime * 10) * .12 : 1);
        ctx.globalAlpha = .5; ctx.drawImage(glowSprite, c.x - s / 2, c.y - s / 2, s, s); ctx.globalAlpha = 1;
        ctx.fillStyle = c.focus >= 2 ? '#fff3a6' : c.secondary ? '#d2fff0' : '#fff0cb'; ctx.beginPath(); ctx.arc(c.x, c.y, cometRadius(), 0, TAU); ctx.fill();
        if (c.secondary) { ctx.strokeStyle = '#9ed7c677'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, cometRadius() + 5, 0, TAU); ctx.stroke(); }
        if (veteran && c.focus > 0) {
          ctx.strokeStyle = c.focus >= 2 ? '#edf19b' : '#d9c7f3'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.arc(c.x, c.y, cometRadius() + 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          text(`${c.focus} / 2`, c.x, c.y - cometRadius() - 14, 8, '#edf19b');
        }
      }
      if (veteran) {
        const focus = Math.max(0, ...comets.map(c => c.focus || 0));
        if (compactHUD()) {
          hudText(`FOCUS ${focus >= 2 ? 'READY' : `${focus}/2`} · LITANY ${litanyProgress}/3 · ${['IVORY ○', 'WINE △', 'GOLD □'][litanyTarget]}`, W / 2, 128, 10, ['#eee4c8', '#e29eb7', '#edcf83'][litanyTarget]);
        } else {
          ctx.fillStyle = '#0d1b2ccc'; ctx.fillRect(W / 2 - 174, 53, 348, 19);
          hudText(focus >= 2 ? 'FOCUS BREAK READY · NEXT CRYSTAL PIERCES' : `CENTRED RETURNS ${focus} / 2 · OFF-CENTRE RETURNS RESET FOCUS`, W / 2, 66, 10, focus >= 2 ? '#edf19b' : '#b7abc9');
          hudText(`LITANY ${litanyProgress}/3 · NEXT ${['IVORY ○', 'WINE △', 'GOLD □'][litanyTarget]} · ${litanyCompletions} COMPLETE`, W / 2, 85, 10, ['#eee4c8', '#e29eb7', '#edcf83'][litanyTarget]);
        }
      }
      if (launchTimer > 0 && phase === 'running') hudText('GET READY', W / 2, H / 2, 14, '#edf19b', 'center', 'world');
      if (!compactHUD()) text(`WAVE ${String(level).padStart(2, '0')}`, 28, 34, 13, '#bba7ed', 'left');
      if (!compactHUD() || paddleHush > 0 || slowTime > 0) hudText(paddleHush > 0 ? compactHUD() ? `DISCORD ${paddleHush.toFixed(1)}s` : `DISCORD · NARROW PADDLE ${paddleHush.toFixed(1)}s` : slowTime > 0 ? 'SLOW ORBIT ACTIVE' : 'KEEP IT IN ORBIT', W - 28, H - 28, 11, paddleHush > 0 ? '#f5a08c' : '#bba7ed', 'right');
      if (combo > 1) hudText(`${Math.min(8, combo)}×`, 45, H / 2, 27, '#edf19b', 'center', 'world');
    }
    function drawTouchControls() {
      if (!veteran || suspended || phase !== 'running') return;
      const rects = controlRects(), uiScale = Math.max(1, W / Math.max(1, canvasCssWidth), H / Math.max(1, canvasCssHeight)), phone = compactHUD();
      const titleSize = phone ? essentialBackingPx() : Math.min(32, 11 * uiScale), subSize = phone ? essentialBackingPx() : Math.min(26, 9.5 * uiScale);
      const pad = (r, title, subtitle, active, enabled = true) => {
        ctx.globalAlpha = active || enabled ? .94 : .68;
        ctx.fillStyle = active ? '#edf19b38' : '#101c22dd'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = active ? '#edf19b' : enabled ? '#d9c7f3aa' : '#8f86a377'; ctx.lineWidth = active ? 2.5 : 1.5; ctx.strokeRect(r.x + .75, r.y + .75, r.w - 1.5, r.h - 1.5);
        const titleY = phone ? r.y + 16 * uiScale : r.y + r.h / 2 - 3 * uiScale, subY = phone ? r.y + 36 * uiScale : r.y + r.h / 2 + 14 * uiScale;
        text(title, r.x + r.w / 2, titleY, titleSize, active ? '#edf19b' : '#eee7d4');
        text(subtitle, r.x + r.w / 2, subY, subSize, enabled ? '#b7abc9' : '#8f86a3');
        if (hudFrame) hudFrame.controls.push({ name: title, x: r.x, y: r.y, w: r.w, h: r.h, labels: [hudMeasure(title, r.x + r.w / 2, titleY, titleSize, 'center'), hudMeasure(subtitle, r.x + r.w / 2, subY, subSize, 'center')] });
        ctx.globalAlpha = 1;
      };
      if (options.game === 'merge' && rects.brace) {
        const r = rects.brace; pad(r, pointerBrace && !phone ? 'BRACING' : 'BRACE', phone ? `S · ${Math.round(mergeGrip)}` : `${pointerBrace ? 'BRACING' : 'HOLD / S'} · ${Math.round(mergeGrip)}`, pointerBrace, mergeGrip > 0);
        ctx.fillStyle = '#d9c7f333'; ctx.fillRect(r.x + 10, r.y + r.h - 9, r.w - 20, 3);
        ctx.fillStyle = '#d9c7f3'; ctx.fillRect(r.x + 10, r.y + r.h - 9, (r.w - 20) * mergeGrip / 100, 3);
        if (rects.tune) pad(rects.tune, 'TUNE', phone ? `E30 · ${Math.round(mergeResonance)}` : `TAP / E · 30 · ${Math.round(mergeResonance)}`, mergeTuneQueued, mergeResonance >= 30);
      } else if (options.game === 'hop' && rects.ability) {
        const swap = !!tether?.planet?.binary, cost = swap ? 25 : 50;
        pad(rects.ability, swap ? 'SWAP' : phone ? 'HOOK' : 'STARHOOK', phone ? `X${cost}` : `TAP / X · ${cost}`, false, surfCharge >= cost);
        if (rects.veil) pad(rects.veil, surfVeil > 0 && !phone ? 'VEILED' : 'VEIL', phone ? surfVeil > 0 ? `${surfVeil.toFixed(1)}s` : 'E25' : `TAP / E · 25`, surfVeil > 0, surfCharge >= 25 && surfVeil <= 0);
      } else if (options.game === 'dash') {
        if (rects.dash) pad(rects.dash, 'DASH', phone ? `X ${Math.floor(charge)}%` : `TAP / X · ${charge >= 100 ? 'READY' : Math.floor(charge) + '%'}`, dashTime > 0, charge >= 100);
        if (rects.bank) pad(rects.bank, 'BANK', phone ? `E ${whale?.caught || combo}` : `TAP / E · ${whale?.caught || combo}`, false, combo >= 3 || !!whale?.caught);
        if (rects.rein) pad(rects.rein, 'REIN', phone ? `S ${Math.floor(umbraLumen)}` : `HOLD / S · ${Math.floor(umbraLumen)}`, pointerRein, umbraLumen > 0);
      } else if (options.game === 'breaker') {
        const censer = censerTouchRect();
        if (censer) pad(censer, 'CENSER', phone ? censerTime > 0 ? `${censerTime.toFixed(1)}s` : 'E40' : `TAP / E · 40`, censerTime > 0, charge >= 40 && censerTime <= 0);
        if (phone && paddleHush <= 0 && slowTime <= 0) hudText('DRAG · CENTRE = FOCUS', W / 2, H - 12, 11, '#b7abc9'); else if (!phone) text('DRAG / TOUCH PADDLE · CENTRE = FOCUS · PARRY MOTES', W / 2, H - 12, titleSize, '#b7abc9');
      }
    }
    function draw() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hudFrame = compactHUD() ? { texts: [], controls: [] } : null;
      background(); ctx.save();
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
      // Popups overshoot to 138% and settle. Compact Masterworks use one
      // measured 14-CSSpx narrative panel; persistent HUD lines carry the
      // longer objectives, while score feedback stays at its world event.
      const phoneNarrative = compactHUD() ? popups.filter(p => p.size >= 16).slice(-1) : [];
      for (const p of popups) {
        const narrativeIndex = phoneNarrative.indexOf(p);
        if (compactHUD() && p.size && p.size !== 15 && narrativeIndex < 0) continue;
        const max = p.max || p.life, t = 1 - p.life / max, s = reduced ? 1 : 1 + .38 * Math.max(0, 1 - t * 4.5);
        const px = narrativeIndex >= 0 ? 0 : p.x, py = narrativeIndex >= 0 ? 0 : p.y;
        ctx.globalAlpha = Math.min(1, p.life / max * 3.2);
        ctx.save(); ctx.translate(px, py); ctx.scale(s, s); if (narrativeIndex >= 0) hudPopup(p.text, p.colour); else text(p.text, 0, 0, p.size || 15, p.colour); ctx.restore();
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
      if (pact > 0) {
        const remaining = Math.ceil(pact);
        ctx.fillStyle = '#edf19b15'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.fillStyle = '#f2e4ad'; ctx.font = 'bold 15px "DM Sans", sans-serif';
        ctx.fillText(`✦ STELLAR PACT ×2 · ${remaining}s`, W / 2, 38);
        ctx.fillStyle = '#edf19b'; ctx.fillRect(W * .25, 47, W * .5 * pact / 12, 3);
      }
      if (options.game !== 'merge') {
        const heartY = options.game === 'breaker' ? 64 : options.game === 'dash' && veteranExpedition ? compactHUD() ? 110 : 82 : H - 30;
        for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < lives ? 1 : .15; star(ctx, 28 + i * 23, heartY, 8, '#f5a08c', 5); } ctx.globalAlpha = 1;
      }
      if (flash > 0 && !reduced) { ctx.fillStyle = `rgba(${flashTint},${flash * .6})`; ctx.fillRect(0, 0, W, H); }
      drawTouchControls();
      // Read-only, per-frame typography diagnostics. Backing rectangles are in
      // logical canvas units; tests multiply by backingToCss for CSS pixels.
      canvas.aetherHUD = hudFrame ? { cssFontPx: ESSENTIAL_HUD_CSS_PX, backingFontPx: essentialBackingPx(), backingToCss: canvasCssWidth / W, width: W, height: H, ...hudFrame } : null;
    }
    let idleTimer = 0;
    // Frame scheduling follows the game's actual state: full rate while a run
    // is live, an 8 fps timer behind a draft's blurred backdrop, and no
    // callbacks at all while paused, ready, finished, or hidden.
    function schedule() {
      if (destroyed) return;
      cancelAnimationFrame(frame); clearTimeout(idleTimer); frame = 0; idleTimer = 0;
      if (document.hidden || phase === 'paused' || phase === 'ready' || phase === 'over') return;
      if (suspended) { idleTimer = setTimeout(() => { if (!destroyed) frame = requestAnimationFrame(tick); }, 125); return; }
      frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (destroyed) return;
      const elapsed = last ? Math.min(.08, (now - last) / 1000) : 0; last = now;
      // Behind the opaque overlay there is nothing new to see; draw once and
      // stop scheduling. A suspended run (relic draft open) repaints gently
      // through schedule()'s timer — full-rate redraws there would only feed
      // the backdrop blur.
      if (document.hidden || phase === 'paused' || phase === 'ready' || phase === 'over') { draw(); frame = 0; return; }
      if (suspended) { draw(); schedule(); return; }
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
      draw(); schedule();
    }
    function pointer(event) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * W, y = (event.clientY - rect.top) / rect.height * H;
      if (Math.abs(x - aim) > 2) lastDirection = x > aim ? 1 : -1;
      aim = clamp(x, 20, W - 20); pointerAim = aim;
      if (options.game === 'breaker') paddle.target = Math.atan2(y - H / 2, x - W / 2);
    }
    function controlHit(event) {
      if (!veteran || phase !== 'running' || suspended) return null;
      measureControls();
      const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width * W, y = (event.clientY - rect.top) / rect.height * H;
      const named = Object.entries(controlRects()).find(([, r]) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)?.[0];
      if (named) return named;
      const censer = censerTouchRect();
      return censer && x >= censer.x && x <= censer.x + censer.w && y >= censer.y && y <= censer.y + censer.h ? 'censer' : null;
    }
    listen(canvas, 'pointerdown', event => {
      const control = controlHit(event);
      if (control) {
        event.preventDefault();
        if (controlPointer) return; // A second control touch never becomes steering.
        controlPointer = { id: event.pointerId, action: control };
        canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
        if (control === 'brace') pointerBrace = true;
        else if (control === 'rein') pointerRein = true;
        else if (['tune', 'veil', 'bank', 'censer'].includes(control)) masterAbility();
        else ability();
        notify(); return;
      }
      if (pointerId !== null) return;
      event.preventDefault(); pointerId = event.pointerId; pointerHeld = true; pointer(event);
      canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
      // A drop is armed by pressing into a live playfield — never by dismissing an overlay.
      dropArmed = phase === 'running';
      if (phase === 'ready' || phase === 'over' || phase === 'paused') action();
    });
    listen(canvas, 'pointermove', event => {
      if (controlPointer?.id === event.pointerId) { event.preventDefault(); return; }
      if (event.pointerId === pointerId || (event.pointerType === 'mouse' && pointerId === null)) pointer(event);
    });
    listen(canvas, 'contextmenu', e => e.preventDefault());
    listen(canvas, 'pointerup', event => {
      if (controlPointer?.id === event.pointerId) {
        event.preventDefault(); controlPointer = null; pointerBrace = false; pointerRein = false; notify(); return;
      }
      if (event.pointerId !== pointerId) return;
      pointer(event); pointerHeld = false; pointerId = null;
      if (options.game === 'merge' && dropArmed) action();
      dropArmed = false;
    });
    // A cancelled gesture is never an intentional launch, drop, or held pad.
    const cancelPointer = e => {
      if (controlPointer?.id === e.pointerId) { controlPointer = null; pointerBrace = false; pointerRein = false; notify(); }
      if (e.pointerId === pointerId) clearInput();
    };
    listen(canvas, 'pointercancel', cancelPointer); listen(canvas, 'lostpointercapture', cancelPointer);
    listen(canvas, 'keydown', event => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const controls = [' ', 'Enter', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'a', 'd', 'p', 'Escape', 'x', 'c'];
      if (veteran) controls.push('e');
      if ((veteran && options.game === 'merge') || (veteranExpedition && options.game === 'dash')) controls.push('s', 'ArrowDown');
      if (!controls.includes(key)) return;
      event.preventDefault();
      if (['p', 'Escape'].includes(key)) { if (event.repeat || key === 'Escape' && document.body.classList.contains('game-theatre')) return; phase === 'paused' ? resume() : pause(); return; }
      keys.add(key);
      if (!event.repeat && key === 'x') ability();
      if (!event.repeat && key === 'e') masterAbility();
      if (!event.repeat && key === 'c') invokePact();
      if (!event.repeat && [' ', 'Enter', 'ArrowUp'].includes(key) && (options.game !== 'hop' || phase !== 'running')) action();
    });
    listen(window, 'keyup', e => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
    listen(window, 'blur', pause);
    listen(canvas, 'blur', () => { if (!document.body.classList.contains('game-theatre')) clearInput(); });
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { pause(); audio?.suspend(); cancelAnimationFrame(frame); clearTimeout(idleTimer); }
      else { last = 0; schedule(); }
    });
    if (veteran) {
      measureControls(); listen(window, 'resize', measureControls);
      if (typeof ResizeObserver !== 'undefined') { controlObserver = new ResizeObserver(measureControls); controlObserver.observe(canvas); }
    }
    reset(); schedule();
    return { start, pause, resume, action, ability, masterAbility, reset, invokePact,
      applyRelic: id => resolveOffer(id),
      skipRelic: () => resolveOffer(null, true),
      startForecast(id) { forecastPick = id; reset(); start(); },
      setSound(value) { sound = value; if (!value) audio?.suspend(); },
      destroy() { clearInput(); destroyed = true; controlObserver?.disconnect(); controlObserver = null; cancelAnimationFrame(frame); clearTimeout(idleTimer); abort.abort(); audio?.close().catch(() => {}); },
    };
  }
  return { create, orb, names, colours, radii, dimensions, relics, synergies, powerUps };
})();
