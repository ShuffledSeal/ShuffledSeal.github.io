'use strict';

// The Grand Tour: a run-based expedition. Hunts are the core game; trials,
// drafts, chandlery and oddities reshape the build; the Umbral Maw waits at
// Neptune. Death resets the run; what persists is knowledge and new hulls.
window.AetherVoyage = (() => {
  const KEY = 'aether-grand-tour-v2';
  const CARTRIDGE_KEY = 'aether-cartridge-records-v1';
  const STORE_VERSION = 1;
  const $ = (s, r = main) => r.querySelector(s);
  const esc = escapeHTML;
  let controller, gameHandle = null, trialHandle = null;

  const I = window.AetherSkirmish.INSTRUMENTS;
  const HULLS = window.AetherSkirmish.HULLS;
  const SECTORS = window.AetherSkirmish.SECTORS;
  const CARTRIDGES = {
    shooter: { name: 'Starfall Skirmish', eyebrow: '01 · ACTION', icon: '✦', family: 'action', brief: 'Pilot hostile formations, master four weapons, and turn dangerous close calls into FLOW.', goal: 'Clear every wave. Choose a field refit between encounters and use your dash to cross enemy fire.', controls: 'MOUSE PILOT · HOLD CLICK / J / Z / ENTER FIRE · SPACE / RIGHT CLICK DASH', features: ['4 weapons', '3 acts', 'Build drafts'], trial: null },
    bastion: { name: 'Aether Bastion', eyebrow: '02 · STRATEGY', icon: '◇', family: 'strategy', brief: 'Forecast each siege and commit your alloy to a defence that survives the next assault.', goal: 'Protect the eight-heart core through the siege. Build before launching; inspect lanes, armour and tower refinements.', controls: '1–4 BUILD · CLICK PLACE / SELECT · Q / E REFINE · R TARGET · SPACE PULSE', features: ['6 sieges', 'Tower refining', 'Lane forecasts'], trial: 'bastion', playbill: { campaign: 'THE SIX SIEGES · BREAK THE CROWN ENGINE', endless: 'THE CITADEL HAS NO DAWN' } },
    labyrinth: { name: 'Glass Labyrinth', eyebrow: '03 · STEALTH ROGUELITE', icon: '◈', family: 'action', brief: 'Infiltrate a shifting archive, steal its keys, and outwit the Watchers on your own route.', goal: 'Collect each chamber’s required keys and reach its eastern gate. Walls block sight; decoys create openings. Seals protect against one alarm.', controls: 'MOUSE / WASD MOVE · SPACE / RIGHT CLICK VEIL · F DECOY · P PAUSE', features: ['4 chambers', 'Relic builds', 'Seeded routes'], trial: 'labyrinth', playbill: { campaign: 'A SEALED ROUTE THROUGH THE SHIFTING ARCHIVE', endless: 'THE ARCHIVE REWRITES ITSELF · EVERY CIRCUIT SHARPENS THE WATCHERS' } },
    starforge: { name: 'Starforge', eyebrow: '04 · FACTORY', icon: '✦', family: 'strategy', brief: 'Align an orbital factory, route living starlight, and contain the heat you create.', controls: 'SELECT DEVICE · CLICK ORBIT · SPACE IGNITES / PAUSES', features: ['6 contracts', 'Moving gates', 'Heat management'], trial: null },
    chain: { name: 'Constellation Chain', eyebrow: '05 · SURVIVAL', icon: '✧', family: 'action', brief: 'Shape a living constellation, switch formations, and draft stars that fight as one.', goal: 'Clear the encounters and defeat the final guardian. Your formation determines where your links can protect you.', controls: 'MOUSE / WASD MOVE · READ THE FORMATION AND DRAFT CONTROLS BELOW · P PAUSE', features: ['5 encounters', '3 formations', '8 relics'], trial: 'chain', playbill: { campaign: 'FIVE ENCOUNTERS · FOUR RELIC DRAFTS · THE UNRAVELLER WAITS', endless: 'THE CHAIN HOLDS · EVERY CIRCUIT SHARPENS THE SKY' } },
    merge: { name: 'Planet Drop', eyebrow: '06 · MERGE', icon: '●', family: 'arcade', brief: 'Stack little worlds, merge matching pairs, and keep the universe below the rim.', goal: 'Build the largest world you can without overflowing the jar.', controls: '← / → AIM · SPACE DROP · X NUDGE · P PAUSE', features: ['Relic builds', '3 forecasts', 'Chain reactions'], arcade: true },
    hop: { name: 'Comet Surf', eyebrow: '07 · GRAVITY', icon: '➶', family: 'arcade', brief: 'Borrow a planet’s gravity, then release at the perfect tangent through the golden skyway.', goal: 'Hold to orbit, release to fly, and collect rings without losing all three hearts.', controls: 'HOLD SPACE / POINTER TO ORBIT · RELEASE TO LAUNCH · P PAUSE', features: ['Route choices', 'Relic builds', 'Easy orbit'], arcade: true },
    dash: { name: 'Stardust Dash', eyebrow: '08 · CATCHER', icon: '✦', family: 'arcade', brief: 'Steer a moonboat through strange weather and master its curious gifts.', goal: 'Survive the forecast or complete the Moonboat Expedition and meet the Umbra Whale.', controls: '← / → STEER · SPACE / X DASH · P PAUSE', features: ['6 weathers', 'Power gifts', 'Whale finale'], arcade: true },
    breaker: { name: 'Orbit Breaker', eyebrow: '09 · PINBALL', icon: '◈', family: 'arcade', brief: 'Keep the comet inside your orbit and shatter a living constellation.', goal: 'Angle paddle returns, break every crystal, and never lose the final comet.', controls: 'POINTER / ← / → PADDLE · X SLOW ORBIT · P PAUSE', features: ['Crystal waves', 'Multiball', 'Relic builds'], arcade: true },
    deepfield: { name: 'Deep Field', eyebrow: '10 · MINESWEEPER', icon: '✹', family: 'strategy', brief: 'Chart a haunted firmament in a lavish, logical game of Minesweeper.', goal: 'Reveal every safe sector. First-click protection, chording, Oracle hints and expedition relics reward careful reading.', controls: 'CLICK REVEAL · RIGHT CLICK / F FLAG · C CHORD · H ORACLE · P PAUSE', features: ['3 board classes', 'Expedition relics', 'Touch + keyboard'], trial: 'deepfield', playbill: { campaign: 'THE THREE OCCULTATIONS · MERCATOR’S INSTRUMENTS AWAIT', endless: 'EVERY CHART DEEPENS · CHOOSE YOUR BOARD CLASS', daily: 'TODAY’S FIXED FIRMAMENT · ONE CHART, ONE LEDGER' } },
  };

  function rng(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
  function shuffle(arr, rand) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const safeInt = (value, fallback = 0, min = 0, max = 1e9) => Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;

  // A persisted chart is only trusted when every node matches a known kind.
  // The trial registry can change between versions; a malformed or stale chart
  // falls back to buildMap(seed) rather than re-dealing done-keys onto new
  // encounters. (Keep this free of late-bound consts: readStore runs early.)
  function validNode(node) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
    switch (node.kind) {
      case 'hunt': return Number.isInteger(node.sector) && node.sector >= 0 && node.sector < SECTORS.length;
      case 'trial': return window.AetherTrials.list.some(t => t.id === node.trial);
      case 'oddity': return Number.isInteger(node.oddity) && node.oddity >= 0 && node.oddity < 4; // buildMap deals oddities 0–3
      case 'chandlery': case 'mutation': case 'sanctuary': case 'boss': return true;
      default: return false;
    }
  }
  const validateMap = map => Array.isArray(map) && map.length === 12 && map.every(leg => Array.isArray(leg) && leg.length >= 1 && leg.length <= 2 && leg.every(validNode));

  function migrateActive(value) {
    const saved = record(value);
    if (!Number.isInteger(saved.seed)) return null;
    const hullId = typeof saved.hullId === 'string' && owns(HULLS, saved.hullId) ? saved.hullId : 'kite';
    const defaultHull = HULLS[hullId].hp > 60 ? 4 : 3;
    const maxHull = safeInt(saved.maxHull, defaultHull, 1, 12);
    const instruments = Array.isArray(saved.instruments)
      ? [...new Set(saved.instruments.filter(id => typeof id === 'string' && owns(I, id)))].slice(0, Object.keys(I).length)
      : [];
    const done = Object.fromEntries(Object.entries(record(saved.done)).filter(([key, state]) => /^(?:[0-9]|1[01]):[01]$/.test(key) && ['won', 'failed', 'left'].includes(state)));
    return {
      seed: saved.seed >>> 0,
      step: safeInt(saved.step, 0, 0, 11),
      difficulty: ['explorer', 'standard', 'eclipse'].includes(saved.difficulty) ? saved.difficulty : 'standard',
      hull: safeInt(saved.hull, maxHull, 1, maxHull),
      maxHull,
      dust: safeInt(saved.dust),
      instruments,
      hullId,
      done,
      path: Array.isArray(saved.path) ? saved.path.filter(line => typeof line === 'string').slice(-100).map(line => line.slice(0, 240)) : [],
      kills: safeInt(saved.kills),
      highScore: safeInt(saved.highScore),
      bestChain: safeInt(saved.bestChain),
      map: validateMap(saved.map) ? saved.map : null, // null → old save; hydrate rebuilds from the seed
      nextDraftBonus: saved.nextDraftBonus === true,
      freeInstrument: saved.freeInstrument === true,
    };
  }

  function readStore() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
    raw = record(raw);
    const r = record(raw.records);
    return {
      version: STORE_VERSION,
      records: {
        tours: safeInt(r.tours),
        wins: safeInt(r.wins),
        kills: safeInt(r.kills),
        bestDust: safeInt(r.bestDust),
        bossWins: safeInt(r.bossWins),
        highScore: safeInt(r.highScore),
        bestChain: safeInt(r.bestChain),
      },
      active: migrateActive(raw.active),
    };
  }
  const store = readStore();
  let run = null;
  function readCartridgeRecords() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(CARTRIDGE_KEY)) || {}; } catch {}
    const best = record(record(raw).best), clears = record(record(raw).clears);
    const scores = Object.fromEntries(Object.keys(CARTRIDGES).map(id => [id, Number.isFinite(best[id]) ? safeInt(Math.round(best[id])) : 0]));
    // Keep a small local archive of daily scores; old cartridge records remain unchanged.
    const earliest = new Date(); earliest.setDate(earliest.getDate() - 45);
    const dailyIds = Object.keys(CARTRIDGES).filter(id => id !== 'starforge' && !CARTRIDGES[id].arcade);
    const dailyKey = new RegExp(`^(${dailyIds.join('|')}):(\\d{4}-\\d{2}-\\d{2})$`);
    for (const [key, value] of Object.entries(best)) {
      const match = dailyKey.exec(key);
      if (match && match[2] >= dateKey(earliest) && Number.isFinite(value)) scores[key] = safeInt(Math.round(value));
    }
    for (const id of Object.keys(CARTRIDGES)) scores[`${id}:campaign`] = safeInt(best[`${id}:campaign`]);
    return { best: scores, clears: Object.fromEntries(Object.keys(CARTRIDGES).map(id => [id, safeInt(clears[id])])) };
  }
  const cartridgeRecords = readCartridgeRecords();
  function saveCartridgeRecords() { try { localStorage.setItem(CARTRIDGE_KEY, JSON.stringify(cartridgeRecords)); } catch {} }
  function cartridgeId() {
    const id = new URLSearchParams(location.search).get('cartridge');
    return id && CARTRIDGES[id] ? id : null;
  }
  const cartridgeHref = id => `index.html?standalone=1&cartridge=${id}#${CARTRIDGES[id]?.arcade ? 'arcade' : 'voyage'}`;
  const campaignHref = id => id === 'starforge' || CARTRIDGES[id]?.arcade ? cartridgeHref(id) : `index.html?standalone=1&cartridge=${id}&mode=campaign#voyage`;
  const dailyDate = () => dateKey(new Date());
  const dailyMode = id => id !== 'starforge' && new URLSearchParams(location.search).get('challenge') === 'daily';
  const campaignMode = id => id !== 'starforge' && !dailyMode(id) && new URLSearchParams(location.search).get('mode') === 'campaign';
  const dailySeed = (id, day) => { let hash = 2166136261; for (const char of `${id}:${day}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return hash >>> 0; };
  const dailyHref = id => `index.html?standalone=1&cartridge=${id}&challenge=daily#${CARTRIDGES[id]?.arcade ? 'arcade' : 'voyage'}`;
  function arcadeBest(id) {
    try {
      const data = JSON.parse(localStorage.getItem('aether-wonder-rooms-v1')) || {};
      const best = data.best && typeof data.best === 'object' ? data.best : {};
      return Math.max(Number(best[`${id}:v3`]) || 0, id === 'dash' ? Number(best['dash:v3:exp']) || 0 : 0);
    } catch { return 0; }
  }
  function recordCartridge(id, score, day = null, campaign = false, won = false) {
    const key = day ? `${id}:${day}` : campaign ? `${id}:campaign` : id;
    const previous = cartridgeRecords.best[key] || 0;
    const best = Math.max(previous, Math.max(0, Math.round(score || 0)));
    cartridgeRecords.best[key] = best;
    if (day) cartridgeRecords.best[id] = Math.max(cartridgeRecords.best[id] || 0, best);
    if (campaign && won) cartridgeRecords.clears[id]++;
    saveCartridgeRecords();
    return { best, newBest: best > previous };
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} }
  function saveRun() {
    store.active = run ? {
      seed: run.seed, step: run.step, difficulty: run.difficulty || 'standard', hull: run.hull, maxHull: run.maxHull, dust: run.dust,
      instruments: run.instruments, hullId: run.hullId, done: run.done, path: run.path, kills: run.kills, highScore: run.highScore || 0, bestChain: run.bestChain || 0,
      map: run.map, nextDraftBonus: run.nextDraftBonus === true, freeInstrument: run.freeInstrument === true,
    } : null;
    save();
  }
  const unlockedHull = id => !HULLS[id].unlock || (id === 'bell' && store.records.wins > 0) || (id === 'moth' && store.records.bossWins > 0) || (id === 'comet' && store.records.kills >= 100);

  // The route. Fixed skeleton, seeded content — the chart is part of strategy.
  function buildMap(seed) {
    const rand = rng(seed);
    const trialDeck = shuffle(window.AetherTrials.list.map(t => t.id), rand);
    let ti = 0;
    const trial = () => ({ kind: 'trial', trial: trialDeck[ti++ % trialDeck.length] });
    return [
      [{ kind: 'hunt', sector: 0 }],
      [trial(), { kind: 'oddity', oddity: Math.floor(rand() * 4) }],
      [{ kind: 'chandlery' }, { kind: 'mutation' }],
      [{ kind: 'hunt', sector: 0, elite: true }],
      [trial(), { kind: 'sanctuary' }],
      [{ kind: 'mutation' }],
      [{ kind: 'hunt', sector: 1 }],
      [trial(), { kind: 'oddity', oddity: Math.floor(rand() * 4) }],
      [{ kind: 'hunt', sector: 1, elite: true }, { kind: 'chandlery' }],
      [{ kind: 'sanctuary' }, trial()],
      [{ kind: 'hunt', sector: 2, elite: true }],
      [{ kind: 'boss' }],
    ];
  }

  const oddities = [
    { title: 'A drifting wreck', text: 'An old survey skiff, hull open to the stars. Something glints inside.', choices: [
      ['Strip it for parts', '+50 stardust, but the work costs 1 hull.', r => { r.dust += 50; r.hull = Math.max(0, r.hull - 1); return 'Stripped the wreck. +50 dust, −1 hull.'; }],
      ['Chart it for the keepers', 'The next cache or chandlery holds +1 free instrument.', r => { r.nextDraftBonus = true; return 'Charted the wreck for the keepers.'; },
    ]]},
    { title: 'A choir of static', text: 'The radio sings in a frequency your instruments almost recognise.', choices: [
      ['Tune in', 'A 40% chance of an instrument; otherwise static burns 1 hull.', r => rng(r.seed + r.step)() < .4 ? (r.freeInstrument = true, 'The static resolves into music. A free instrument waits at the next draft.') : (r.hull = Math.max(0, r.hull - 1), 'Only static. It stings. −1 hull.')],
      ['Leave the frequency alone', 'Nothing ventured. +10 dust for the careful log entry.', r => (r.dust += 10, 'Logged the frequency. +10 dust.')],
    ]},
    { title: 'The keeper’s marker', text: 'A brass buoy, still warm. The old keeper’s mark is etched beneath the dust.', choices: [
      ['Polish the brass', 'Restore 1 hull.', r => (r.hull = Math.min(r.maxHull, r.hull + 1), 'The brass shines. +1 hull.')],
      ['Take the dusting', '+35 stardust.', r => (r.dust += 35, 'Pocketed the stardust. +35.')],
    ]},
    { title: 'An impossible tide', text: 'For a moment, the chart shows a route that does not exist.', choices: [
      ['Follow it', 'Skip ahead one leg, but arrive with 1 less hull.', r => { r.skipAhead = true; r.hull = Math.max(1, r.hull - 1); return 'The impossible tide carries you. −1 hull.'; }],
      ['Trust the slow sky', 'No shortcut. +20 dust and a clear head.', r => (r.dust += 20, 'Kept to the chart. +20 dust.')],
    ]},
  ];

  function nodeLabel(node) {
    switch (node.kind) {
      case 'hunt': return { icon: '⚔', name: node.elite ? 'Hunt · elite' : 'Hunt', detail: `${SECTORS[node.sector].name}${node.elite ? ' · heavier contact' : ''}` };
      case 'trial': { const t = window.AetherTrials.list.find(t => t.id === node.trial); return { icon: '☄', name: 'Trial', detail: t.name }; }
      case 'oddity': return { icon: '?', name: 'Oddity', detail: oddities[node.oddity].title };
      case 'chandlery': return { icon: '⚖', name: 'Chandlery', detail: 'Stardust for steel and glass' };
      case 'mutation': return { icon: '✧', name: 'Instrument draft', detail: 'Choose one of three' };
      case 'sanctuary': return { icon: '☕', name: 'Sanctuary', detail: 'Repair and breathe' };
      case 'boss': return { icon: '◆', name: 'THE UMBRAL MAW', detail: 'The Neptune relay' };
    }
  }
  const has = id => run?.instruments.includes(id);
  const dustMul = () => has('golden-sextant') ? 1.33 : 1;

  // ── Rendering ────────────────────────────────────────────────────────────
  function renderVoyage() {
    const direct = cartridgeId();
    if (direct) {
      const content = renderCartridge(direct);
      return new URLSearchParams(location.search).has('standalone') ? `<div class="tour-standalone-nav"><a href="grand-tour.html">✧ ÆTHER · THE GRAND TOUR</a><span>THE CARTOGRAPHER'S EDITION</span><a href="index.html?standalone=1#voyage">← CARTRIDGE CABINET</a></div>${content}` : content;
    }
    if (!run && store.active) run = hydrate(store.active);
    const content = run?.over ? renderRecap(false) : run?.won ? renderRecap(true) : run?.node ? renderNode() : run ? renderChart() : renderLanding();
    if (new URLSearchParams(location.search).has('standalone')) {
      return `<div class="tour-standalone-nav"><a href="grand-tour.html">✧ ÆTHER · THE GRAND TOUR</a><span>THE CARTOGRAPHER'S EDITION</span><a href="grand-tour.html">← TITLE SCREEN</a></div>${content}`;
    }
    return content;
  }
  function hydrate(saved) {
    // The dealt chart persists with the run; only pre-map saves rebuild it.
    return { ...saved, difficulty: saved.difficulty || 'standard', node: null, nodeKey: null, map: saved.map ?? buildMap(saved.seed), over: false, won: false };
  }

  function renderCartridge(id) {
    const card = CARTRIDGES[id];
    const daily = dailyMode(id), campaign = campaignMode(id), day = dailyDate();
    const key = daily ? `${id}:${day}` : campaign ? `${id}:campaign` : id;
    const modeLinks = id === 'starforge' ? '' : `<div class="cartridge-modes" aria-label="Challenge mode"><a class="button" href="${campaignHref(id)}" ${campaign ? 'aria-current="page"' : ''}>Campaign</a><a class="button" href="${cartridgeHref(id)}" ${!campaign && !daily ? 'aria-current="page"' : ''}>Endless run</a><a class="button" href="${dailyHref(id)}" ${daily ? 'aria-current="page"' : ''}>Daily Vigil<span class="mode-date"> · ${day}</span></a></div>`;
    const modeNote = daily ? '<p>Same encounter seed for every attempt today. Beat your own daily record.</p>' : `<p>${card.goal || card.brief}</p>`;
    const recordLabel = daily ? 'TODAY’S BEST' : campaign ? 'CAMPAIGN BEST' : 'PERSONAL BEST';
    const clears = campaign && cartridgeRecords.clears[id] ? `<span class="cartridge-clears">${cartridgeRecords.clears[id]} campaign clear${cartridgeRecords.clears[id] === 1 ? '' : 's'}</span>` : '';
    return `<div class="view-enter tour-page cartridge-page"><section class="view-header cartridge-header"><div><p class="eyebrow">ÆTHER CARTRIDGE · ${card.eyebrow}${daily ? ' · DAILY VIGIL' : campaign ? ' · CAMPAIGN' : ''}</p><h1>${card.name}.</h1><p>${card.brief}</p>${modeLinks}${modeNote}</div><div class="cartridge-record"><span>${recordLabel}</span><strong>${(cartridgeRecords.best[key] || 0).toLocaleString()}</strong>${clears}</div></section><div id="cartridge-stage" class="cartridge-stage" aria-live="polite"></div><div class="cartridge-footer"><a class="button" href="index.html?standalone=1#voyage">← CARTRIDGE CABINET</a><span>${card.controls}</span></div></div>`;
  }

  function renderLanding() {
    const filters = [['all', 'Complete cabinet'], ['action', 'Action & infiltration'], ['strategy', 'Strategy & logic'], ['arcade', 'Relic arcade']];
    return `<div class="view-enter tour-page"><section class="view-header cabinet-intro"><div><p class="eyebrow">ÆTHER · THE CARTOGRAPHER’S CABINET</p><h1>Ten heavens.<em> Choose your instrument.</em></h1><p>Immediate play, authored campaigns, endless expeditions and a fixed Daily Vigil. Every cartridge teaches its controls before you begin.</p></div><div class="cabinet-edition" aria-hidden="true"><span>✧</span><b>X</b><small>GAMES<br>IN ORBIT</small></div></section><nav class="cabinet-filters" aria-label="Filter the game cabinet">${filters.map(([id, label]) => `<button type="button" data-cabinet-filter="${id}" aria-pressed="${id === 'all'}" aria-controls="cartridge-cabinet">${label}<span>${id === 'all' ? Object.keys(CARTRIDGES).length : Object.values(CARTRIDGES).filter(card => card.family === id).length}</span></button>`).join('')}</nav><section class="cartridge-cabinet" id="cartridge-cabinet" aria-label="Playable Æther cartridges">${Object.entries(CARTRIDGES).map(([id, card]) => `<div class="cartridge-choice" data-cabinet-family="${card.family}"><a class="cartridge-card cartridge-${id}" href="${campaignHref(id)}" aria-label="Play ${card.name}${id === 'starforge' || card.arcade ? '' : ' campaign'}"><span class="cartridge-emblem" aria-hidden="true"><i>${card.icon}</i></span><div class="cartridge-copy"><p>${card.eyebrow}</p><h2>${card.name}</h2><span class="cartridge-brief">${card.brief}</span><span class="cartridge-features">${card.features.map(feature => `<b>${feature}</b>`).join('')}</span></div><footer><b>${id === 'starforge' || card.arcade ? 'PLAY NOW' : 'PLAY CAMPAIGN'}</b><small>BEST ${(card.arcade ? arcadeBest(id) : cartridgeRecords.best[id === 'starforge' ? id : `${id}:campaign`] || 0).toLocaleString()}</small></footer></a>${id === 'starforge' ? '<span class="cartridge-contract-note">SIX AUTHORED CONTRACTS · ONE CONNECTED CAMPAIGN</span>' : `<a class="cartridge-daily-link" href="${dailyHref(id)}">DAILY VIGIL · TODAY’S FIXED SKY ↗</a>`}</div>`).join('')}</section><div class="tour-expedition-divider"><span>OPTIONAL LONG-FORM MODE</span><strong>THE GRAND TOUR</strong><p>A twelve-leg expedition with route choices, instruments, and permanent Tour records.</p></div>
    <div class="tour-landing"><div>
      <p class="section-label">THE HANGAR · CHOOSE YOUR SKIFF</p><p class="tour-feature-lead">A twelve-leg odyssey across living starfields. Every instrument bends the rules. Every death writes another story.</p>
      <div class="hangar">${Object.entries(HULLS).map(([id, h]) => {
        const open = unlockedHull(id);
        return `<button class="hangar-card ${open ? '' : 'locked'}" data-hull="${id}" ${open ? '' : 'disabled'} aria-pressed="${pendingHull === id}"><span class="hangar-ship hull-${id}" aria-hidden="true"><i></i></span><h3>${h.name}</h3><p>${h.desc}</p><dl><div><dt>PLATING</dt><dd>${h.hp}</dd></div><div><dt>SPEED</dt><dd>${Math.round(h.speed * 100)}%</dd></div><div><dt>BOLT</dt><dd>${h.boltDmg} / ${h.boltCd}s</dd></div></dl><span class="hangar-status">${open ? (pendingHull === id ? 'SELECTED ✦' : 'IN SERVICE') : `SEALED · ${h.unlock}`}</span></button>`;
      }).join('')}</div>
      <div class="tour-rules">
        <article><span class="chapter-number">Ⅰ</span><div><h3>Fight the sky</h3><p>Pilot with the mouse, burn down dangerous formations, chain kills for FLOW, and dash through forecast solar eruptions.</p></div></article>
        <article><span class="chapter-number">Ⅱ</span><div><h3>Rewrite the rules</h3><p>Sixteen instruments turn weapons into chain lightning, piercing rails, gravity traps, and tempo-driven healing.</p></div></article>
        <article><span class="chapter-number">Ⅲ</span><div><h3>Become legend</h3><p>Sixteen different trials, route decisions, score records, unique hulls and the two-phase Umbral Maw. Each run leaves a mark.</p></div></article>
      </div></div>
    <aside class="tour-manifest"><p class="eyebrow">EXPEDITION DIFFICULTY</p>
    <div class="tour-difficulty" role="group" aria-label="Choose difficulty">
      <button data-difficulty="explorer" aria-pressed="${pendingDifficulty === 'explorer'}"><b>Wanderer</b><small>Extra plating, kinder skies</small></button>
      <button data-difficulty="standard" aria-pressed="${pendingDifficulty === 'standard'}"><b>Navigator</b><small>Designed expedition</small></button>
      <button data-difficulty="eclipse" aria-pressed="${pendingDifficulty === 'eclipse'}"><b>Eclipse</b><small>Harder foes, greater rewards</small></button>
    </div><p class="eyebrow">THE LEDGER</p><dl><div><dt>Tours flown</dt><dd>${store.records.tours}</dd></div><div><dt>Maw victories</dt><dd>${store.records.bossWins}</dd></div><div><dt>Best haul</dt><dd>${store.records.bestDust} stardust</dd></div><div><dt>Threats cleared</dt><dd>${store.records.kills}</dd></div><div><dt>Best combat score</dt><dd>${store.records.highScore.toLocaleString()}</dd></div><div><dt>Best flow chain</dt><dd>${store.records.bestChain}×</dd></div></dl>
    ${store.active ? '<p class="tour-resume-note">A tour is already underway.</p><button class="button button-primary" data-tour="resume">Resume ↗</button><button class="button" data-tour="abandon">Abandon it</button>' : '<button class="button button-primary tour-begin" data-tour="begin">Choose a skiff &amp; set out →</button>'}</aside></div></div>`;
  }

  function renderChart() {
    const sectorIdx = Math.min(2, Math.floor(run.step / 4));
    return `<div class="view-enter tour-page"><section class="view-header tour-header"><div><p class="eyebrow">THE GRAND TOUR · ${SECTORS[sectorIdx].name.toUpperCase()}</p><h1>Leg ${run.step + 1} of 12.</h1></div><div class="tour-vitals"><span class="tour-hull" aria-label="Hull ${run.hull} of ${run.maxHull}">${'♥'.repeat(run.hull)}${'♡'.repeat(Math.max(0, run.maxHull - run.hull))}</span><span class="tour-dust">✦ ${run.dust}</span></div></section>
    <p class="tour-difficulty-note">${run.difficulty === 'explorer' ? 'WANDERER' : run.difficulty === 'eclipse' ? 'ECLIPSE' : 'NAVIGATOR'} · The route remembers your choices.</p>
    <div class="tour-artifacts">${run.instruments.length ? run.instruments.map(id => `<span class="tour-artifact" title="${esc(I[id].text)} ${esc(I[id].trialNote)}">${I[id].icon} ${I[id].name}</span>`).join('') : '<span class="tour-artifact empty">No instruments yet — drafts and chandleries hold them.</span>'}</div>
    <div class="tour-chart" role="list" aria-label="The route chart">${run.map.map((choices, s) => `<div class="tour-step ${s === run.step ? 'current' : s < run.step ? 'passed' : ''}" role="listitem"><span class="tour-step-label">${s === 11 ? 'RELAY' : s === 10 ? 'LEG 11' : `LEG ${s + 1}`}</span>${choices.map((node, i) => {
      const key = `${s}:${i}`, state = run.done[key], label = nodeLabel(node);
      const reachable = s === run.step && !run.node;
      return `<button class="tour-node ${state || ''} ${reachable ? 'reachable' : ''}" data-tour-node="${key}" ${reachable ? '' : 'disabled'} aria-label="${esc(label.name)}: ${esc(label.detail)}"><span class="tour-node-icon">${label.icon}</span><span class="tour-node-copy"><strong>${state === 'won' ? '✓ ' : state === 'failed' ? '✕ ' : ''}${label.name}</strong><small>${esc(label.detail)}</small></span></button>`;
    }).join('')}</div>`).join('')}</div>
    ${run.path.length ? `<details class="tour-log"><summary>The logbook (${run.path.length})</summary>${run.path.slice(-6).reverse().map(line => `<p>${esc(line)}</p>`).join('')}</details>` : ''}</div>`;
  }

  function renderNode() {
    const node = run.node, label = nodeLabel(node);
    const risky = node.kind === 'hunt' || node.kind === 'trial';
    const exit = node.kind === 'boss' ? '' : risky
      ? '<button class="button tour-retreat" data-tour="retreat">ABORT ENCOUNTER · LOSE 1 HULL</button>'
      : '<button class="button" data-tour="leave">LEAVE WITHOUT TAKING ANYTHING</button>';
    return `<div class="view-enter tour-page"><section class="view-header tour-header"><div><p class="eyebrow">${label.name.toUpperCase()}</p><h1>${label.detail}.</h1><p class="tour-node-brief">${nodeBrief(node)}</p></div><div class="tour-vitals"><span class="tour-hull">${'♥'.repeat(run.hull)}</span><span class="tour-dust">✦ ${run.dust}</span></div></section>
    <div class="tour-node-actions tour-node-actions-top">${exit}</div><div id="tour-stage" class="tour-stage"></div></div>`;
  }
  function nodeBrief(node) {
    switch (node.kind) {
      case 'hunt': return 'Clear every wave. Stardust motes drift off what falls. Failure or aborting costs a hull.';
      case 'trial': return window.AetherTrials.list.find(t => t.id === node.trial).brief + ' Win it for salvage; failure or aborting costs a hull.';
      case 'oddity': return 'A choice with consequences. Read the sky before you answer.';
      case 'chandlery': return 'Spend stardust on instruments and repairs. Leave when you are done.';
      case 'mutation': return 'One instrument, free of charge. Choose the rule you want to rewrite.';
      case 'sanctuary': return '+1 hull and a little dust. No risk here.';
      case 'boss': return 'Two tempests live in it. Clear the first; survive the second. There is no leaving the relay.';
    }
  }

  function renderRecap(won) {
    const hullNote = won ? (store.records.bossWins > 0 && HULLS.moth ? 'The Moth Wing is yours to fly.' : '') : '';
    return `<div class="view-enter tour-page"><section class="tour-recap"><p class="eyebrow">${won ? 'THE MAW IS QUIET' : 'THE TOUR ENDS EARLY'}</p><h1>${won ? 'Neptune, in person.' : 'The sky keeps the rest.'}</h1>
    <p class="tour-recap-line">${won ? 'Twelve legs, one skiff, and the Maw behind you. ' + hullNote : 'The plating gave out — but the logbook didn’t. The next skiff launches knowing more.'}</p>
    <dl class="tour-stats"><div><dt>Stardust banked</dt><dd>✦ ${run.dust}</dd></div><div><dt>Threats cleared</dt><dd>${run.kills}</dd></div><div><dt>Top arena score</dt><dd>${(run.highScore || 0).toLocaleString()}</dd></div><div><dt>Best flow chain</dt><dd>${run.bestChain || 0}×</dd></div><div><dt>Difficulty</dt><dd>${run.difficulty || 'standard'}</dd></div><div><dt>Legs resolved</dt><dd>${Object.values(run.done).filter(v => v === 'won').length} / 12</dd></div><div><dt>Instruments carried</dt><dd>${run.instruments.length ? run.instruments.map(id => I[id].name).join(' · ') : 'None'}</dd></div></dl>
    <div class="tour-recap-actions"><button class="button button-primary" data-tour="begin">Set out again →</button><button class="button" data-tour="journal" ${run.journalLogged ? 'disabled' : ''}>${run.journalLogged ? 'Saved to the field journal ✓' : 'Save the logbook to the field journal'}</button><a class="button" href="#planetarium">Back to the atlas</a></div>
    ${run.path.length ? `<details class="tour-log" open><summary>The logbook</summary>${run.path.map(line => `<p>${esc(line)}</p>`).join('')}</details>` : ''}</section></div>`;
  }

  // ── Run flow ─────────────────────────────────────────────────────────────
  let pendingHull = 'kite';
  let pendingDifficulty = 'standard';
  function begin() {
    teardown();
    // Hull choice happens on the landing page; default kite.
    const hullId = unlockedHull(pendingHull) ? pendingHull : 'kite';
    run = { seed: Math.floor(Math.random() * 0xffffffff), step: 0, difficulty: pendingDifficulty, hull: (HULLS[hullId].hp > 60 ? 4 : 3) + (pendingDifficulty === 'explorer' ? 1 : pendingDifficulty === 'eclipse' ? -1 : 0), maxHull: (HULLS[hullId].hp > 60 ? 4 : 3) + (pendingDifficulty === 'explorer' ? 1 : pendingDifficulty === 'eclipse' ? -1 : 0), dust: 0, instruments: [], hullId, kills: 0, highScore: 0, bestChain: 0, done: {}, path: [], node: null, nodeKey: null, map: null, over: false, won: false, journalLogged: false };
    run.map = buildMap(run.seed);
    store.records.tours++;
    store.active = null;
    saveRun(); save();
    render();
    toast(`The ${HULLS[hullId].name} lifts off. First contact ahead.`);
  }
  function teardown() { gameHandle?.destroy(); gameHandle = null; trialHandle?.destroy(); trialHandle = null; toastQueue = []; }

  // Toasts are erased by the render() that follows a node finishing, so
  // reason messages queue up and paint after the chart re-renders.
  let toastQueue = [];
  let restoreChartFocus = false;
  const queueToast = message => { if (message) toastQueue.push(message); };
  // Drains the queue, returning the message to show once rendering settles.
  function drainToasts() {
    const queued = toastQueue; toastQueue = [];
    return queued.length ? queued[queued.length - 1] : null;
  }

  function finishNode(state, note) {
    if (!run?.node) return;
    run.done[run.nodeKey] = state;
    if (note) run.path.push(note);
    run.node = null; run.nodeKey = null;
    if (run.skipAhead) { run.skipAhead = false; run.step++; run.path.push('The impossible tide carries you a leg further.'); }
    run.step++;
    if (run.hull <= 0) {
      run.over = true; store.active = null;
      store.records.kills += run.kills; save();
    } else if (run.step >= 12) {
      // The tour is only won through the Maw's defeat.
      if (run.done['11:0'] === 'won') {
        run.won = true; store.records.wins++;
        store.records.bestDust = Math.max(store.records.bestDust, run.dust);
      } else run.over = true;
      store.records.kills += run.kills;
      store.active = null;
      save();
    } else saveRun();
    restoreChartFocus = true;
    const pendingToast = drainToasts(); // drain before render: unmount clears the queue
    render();
    if (pendingToast) toast(pendingToast);
  }
  function loseHull(reason) {
    run.hull = Math.max(0, run.hull - 1);
    run.path.push(reason);
    queueToast(reason);
  }

  // ── Node hosts ───────────────────────────────────────────────────────────
  function mountNode() {
    const node = run.node, stage = $('#tour-stage');
    if (!node || !stage) return;
    if (node.kind === 'hunt' || node.kind === 'boss') mountHunt(node, stage);
    else if (node.kind === 'trial') mountTrial(node, stage);
    else if (node.kind === 'oddity') mountOddity(node, stage);
    else if (node.kind === 'chandlery') mountChandlery(stage);
    else if (node.kind === 'mutation') mountDraft(stage);
    else mountSanctuary(stage);
  }

  function mountCartridge(id) {
    const card = CARTRIDGES[id], stage = $('#cartridge-stage');
    if (!card || !stage) return;
    const day = dailyMode(id) ? dailyDate() : null;
    const campaign = campaignMode(id);
    const seed = day ? dailySeed(id, day) : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const end = ({ won, score = 0, detail = '' }) => {
      const record = recordCartridge(id, score, day, campaign, won);
      const recordValue = $('.cartridge-record strong'); if (recordValue) recordValue.textContent = record.best.toLocaleString();
      if (campaign && won) { const clears = $('.cartridge-clears'); if (clears) clears.textContent = `${cartridgeRecords.clears[id]} campaign clear${cartridgeRecords.clears[id] === 1 ? '' : 's'}`; else $('.cartridge-record')?.insertAdjacentHTML('beforeend', `<span class="cartridge-clears">${cartridgeRecords.clears[id]} campaign clear${cartridgeRecords.clears[id] === 1 ? '' : 's'}</span>`); }
      const heading = won ? (campaign ? 'Campaign cleared.' : 'A new mark in the ledger.') : 'The sky keeps score.';
      stage.innerHTML = `<div class="cartridge-recap"><p class="eyebrow">${won ? 'RUN COMPLETE' : 'RUN ENDED'}${day ? ' · DAILY VIGIL' : campaign ? ' · CAMPAIGN' : ''}</p><h2 tabindex="-1">${heading}</h2><dl><div><dt>RUN SCORE</dt><dd>${Math.round(score).toLocaleString()}</dd></div><div><dt>${day ? 'TODAY’S BEST' : campaign ? 'CAMPAIGN BEST' : 'PERSONAL BEST'}</dt><dd>${record.best.toLocaleString()}</dd></div></dl><p>${record.newBest ? day ? 'NEW DAILY BEST' : campaign ? 'NEW CAMPAIGN BEST' : 'NEW PERSONAL BEST' : 'One more run is waiting.'}</p>${detail ? `<p class="cartridge-detail">${esc(detail)}</p>` : ''}<div class="tour-recap-actions"><button class="button button-primary" data-tour="cartridge-replay">PLAY AGAIN</button><a class="button" href="index.html?standalone=1#voyage">CARTRIDGE CABINET</a></div></div>`;
      $('.cartridge-recap h2', stage)?.focus({ preventScroll: true });
    };
    if (id === 'shooter') {
      // Controls live in the persistent cartridge footer; the brief stays a brief.
      stage.innerHTML = `<div class="flight-brief"><span class="flight-status"><span class="flight-status-dot"></span> ${campaign ? 'THREE-ACT CAMPAIGN' : 'ENDLESS VIGIL'}</span><strong>STARFALL SKIRMISH</strong></div><div class="tour-hunt-frame"></div><div class="flight-legend"><span><b>✦</b> Collect stardust</span><span><b>◎</b> Read telegraphs</span><span><b>ϟ</b> Dash through danger</span><span><b>◈</b> Build FLOW</span></div>`;
      gameHandle = window.AetherSkirmish.create($('.tour-hunt-frame', stage), { sector: 1, elite: true, endless: !campaign, hull: 'kite', instruments: [], seed, difficulty: 'standard', onEnd({ won, score }) { end({ won, score }); } });
    } else if (id === 'starforge') {
      stage.innerHTML = `<div class="cartridge-playbill"><span>ORBITAL FACTORY</span><strong>THE LAST CELESTIAL FOUNDRY</strong></div><div class="starforge-frame"></div>`;
      gameHandle = window.AetherStarforge.create($('.starforge-frame', stage), { onEnd: end });
    } else {
      const playbill = day ? card.playbill?.daily || card.playbill?.endless : card.playbill?.[campaign ? 'campaign' : 'endless'] || `${card.name.toUpperCase()} · THE INSTRUMENTS ARE READY`;
      stage.innerHTML = `<div class="cartridge-playbill"><span>${day ? 'DAILY VIGIL' : campaign ? 'CAMPAIGN CARTRIDGE' : 'ENDLESS CARTRIDGE'}</span><strong>${playbill}</strong></div><div class="trial-cabinet"><div class="trial-frame"></div></div>`;
      trialHandle = window.AetherTrials.create(card.trial, $('.trial-frame', stage), { sound: true, endless: !campaign, campaign, daily: Boolean(day), seed, verbs: new Set(), onEnd: end });
      // Focus the trial's own surface (a div for Deep Field), not canvas-only.
      (trialHandle?.canvas ?? $('.trial-frame canvas', stage))?.focus?.({ preventScroll: true });
    }
  }

  function mountHunt(node, stage) {
    const isBoss = node.kind === 'boss';
    stage.innerHTML = `<div class="flight-brief"><span class="flight-status"><span class="flight-status-dot"></span> LIVE COMBAT</span><strong>${isBoss ? 'THE NEPTUNE RELAY' : 'SECTOR ' + ((node.sector ?? 2) + 1) + ' · ' + SECTORS[node.sector ?? 2].name.toUpperCase()}</strong><span class="flight-controls">MOUSE: PILOT · HOLD CLICK / J / Z / ENTER: FIRE · RIGHT CLICK / SPACE: DASH · M: TWIN-STICK · P: PAUSE</span></div><div class="tour-hunt-frame"></div><div class="flight-legend"><span><b>✦</b> Collect stardust</span><span><b>◎</b> Read orange telegraphs</span><span><b>ϟ</b> Dash through danger</span><span><b>◈</b> Chain kills for FLOW</span></div>`;
    gameHandle = window.AetherSkirmish.create($('.tour-hunt-frame', stage), {
      sector: node.sector ?? 2, elite: node.elite, boss: isBoss, hull: run.hullId, instruments: run.instruments,
      seed: run.seed + run.step * 977, difficulty: run.difficulty || 'standard',
      onEnd({ won, dust, kills, score = 0, bestStreak = 0 }) {
        run.kills += kills;
        run.highScore = Math.max(run.highScore || 0, score);
        run.bestChain = Math.max(run.bestChain || 0, bestStreak);
        store.records.highScore = Math.max(store.records.highScore, score);
        store.records.bestChain = Math.max(store.records.bestChain, bestStreak);
        save();
        const gain = Math.round(dust * dustMul());
        run.dust += gain;
        if (won) {
          if (isBoss) { store.records.bossWins++; save(); finishNode('won', `The Umbral Maw, quiet at last. +${gain} dust.`); }
          else finishNode('won', `Hunt cleared · ${kills} threats · +${gain} dust.`);
        } else {
          loseHull(isBoss ? 'The Maw holds the relay. −1 hull.' : 'The field won this time. −1 hull.');
          if (isBoss) finishNode('failed', 'Beaten back from the relay.');
          else finishNode('failed', 'Beaten from the field.');
        }
      },
    });
  }

  function mountTrial(node, stage) {
    const trial = window.AetherTrials.list.find(t => t.id === node.trial);
    stage.innerHTML = `<div class="trial-cabinet"><div class="trial-frame"></div></div>`;
    trialHandle = window.AetherTrials.create(node.trial, $('.trial-frame', stage), {
      speedScale: run.difficulty === 'eclipse' ? 1.18 : run.difficulty === 'explorer' ? .84 : 1,
      verbs: new Set(run.instruments.flatMap(id => I[id].verbs || [])),
      onEnd({ won, score }) {
        const gain = Math.round((score / 8 + (won ? 30 : 0)) * dustMul());
        run.dust += gain;
        if (won) {
          // Salvage: hull plating or pure dust.
          stage.innerHTML = `<div class="tour-refuge"><h2>${trial.name} — cleared.</h2><p>+${gain} stardust banked. The wreckage is yours to choose from.</p><div class="tour-recap-actions"><button class="button button-primary" data-tour="salvage-hull">Salvage plating · +1 hull</button><button class="button" data-tour="salvage-dust">Take the dust · +60</button></div></div>`;
        } else {
          loseHull(`${trial.name}: the trial wins. −1 hull.`);
          finishNode('failed', `${trial.name}: failed.`);
        }
      },
    });
    // Focus the trial's own surface (a div for Deep Field), not canvas-only.
    (trialHandle?.canvas ?? $('.trial-frame canvas', stage))?.focus?.({ preventScroll: true });
  }

  function mountOddity(node, stage) {
    const o = oddities[node.oddity];
    stage.innerHTML = `<div class="tour-oddity"><p class="eyebrow">AN ODDITY</p><h2>${o.title}</h2><p>${o.text}</p><div class="tour-recap-actions">${o.choices.map((c, i) => `<button class="button ${i === 0 ? 'button-primary' : ''}" data-oddity="${i}">${c[0]}<small>${c[1]}</small></button>`).join('')}</div><button class="tour-inline-exit" data-tour="leave">Leave it untouched</button></div>`;
    stage.querySelectorAll('[data-oddity]').forEach(btn => btn.addEventListener('click', () => {
      const [, , fn] = o.choices[Number(btn.dataset.oddity)];
      const note = fn(run);
      if (run.hull <= 0) { finishNode('failed', note); return; }
      finishNode('won', note);
    }));
  }

  function mountChandlery(stage) {
    const rand = rng(run.seed + run.step * 131);
    const pool = shuffle(Object.keys(I).filter(id => !run.instruments.includes(id)), rand).slice(0, 3 + (run.nextDraftBonus ? 1 : 0));
    run.nextDraftBonus = false;
    const prices = [70, 80, 90, 90];
    stage.innerHTML = `<div class="tour-cache"><p class="eyebrow">THE CHANDLERY</p><p class="tour-node-brief" style="margin:0 auto 18px;max-width:480px">Stardust for steel and glass. The keeper wraps everything in brown paper.</p><div class="tour-cache-row">${pool.map((id, i) => `<button class="tour-cache-card" data-buy="${id}" data-price="${prices[i]}" ${run.dust < prices[i] ? 'disabled' : ''}><span>${I[id].icon}</span><strong>${I[id].name}</strong><small>${I[id].text} <em>${I[id].trialNote}</em></small><b>✦ ${prices[i]}</b></button>`).join('')}<button class="tour-cache-card repair" data-buy="repair" data-price="40" ${run.dust < 40 || run.hull >= run.maxHull ? 'disabled' : ''}><span>⚒</span><strong>Hull repair</strong><small>Patch one heart of plating back on.</small><b>✦ 40</b></button></div><button class="tour-inline-exit" data-tour="leave">Leave the chandlery</button></div>`;
    stage.querySelectorAll('[data-buy]').forEach(card => card.addEventListener('click', () => {
      const price = Number(card.dataset.price);
      if (run.dust < price) return;
      run.dust -= price;
      if (card.dataset.buy === 'repair') { run.hull = Math.min(run.maxHull, run.hull + 1); toast('The plating holds again. +1 hull.'); run.path.push('Bought repairs at the chandlery.'); }
      else { run.instruments.push(card.dataset.buy); applyInstrument(card.dataset.buy); toast(`${I[card.dataset.buy].name} joins the build.`); run.path.push(`Bought ${I[card.dataset.buy].name}.`); }
      mountChandlery(stage);
      $('.tour-dust') && ($('.tour-dust').textContent = `✦ ${run.dust}`);
    }));
  }

  function mountDraft(stage) {
    const rand = rng(run.seed + run.step * 313);
    const pool = shuffle(Object.keys(I).filter(id => !run.instruments.includes(id)), rand).slice(0, 3 + (run.nextDraftBonus ? 1 : 0) + (run.freeInstrument ? 0 : 0));
    run.nextDraftBonus = false;
    stage.innerHTML = `<div class="tour-cache"><p class="eyebrow">${run.freeInstrument ? 'THE STATIC RESOLVES' : 'AN INSTRUMENT DRAFT'}</p><p class="tour-node-brief" style="margin:0 auto 18px;max-width:480px">Free of charge. Choose the rule you want the sky to obey.</p><div class="tour-cache-row">${pool.map(id => `<button class="tour-cache-card" data-draft="${id}"><span>${I[id].icon}</span><strong>${I[id].name}</strong><small>${I[id].text} <em>${I[id].trialNote}</em></small></button>`).join('')}</div><button class="tour-inline-exit" data-tour="leave">Leave the draft behind</button></div>`;
    if (run.freeInstrument) run.freeInstrument = false;
    stage.querySelectorAll('[data-draft]').forEach(card => card.addEventListener('click', () => {
      run.instruments.push(card.dataset.draft);
      applyInstrument(card.dataset.draft);
      queueToast(`${I[card.dataset.draft].name} joins the build.`);
      finishNode('won', `Drafted ${I[card.dataset.draft].name}.`);
    }));
  }

  function applyInstrument(id) {
    if (id === 'ironwood-ribs') { run.maxHull++; run.hull = Math.min(run.maxHull, run.hull + 1); }
  }

  function mountSanctuary(stage) {
    stage.innerHTML = `<div class="tour-refuge"><div class="refuge-lantern" aria-hidden="true">☕</div><h2>The kettle is already on.</h2><p>+1 hull, +15 stardust. The relay can wait one quiet minute.</p><button class="button button-primary" data-tour="rest">Rest here</button><button class="tour-inline-exit" data-tour="leave">Leave without resting</button></div>`;
  }

  // Pause contract: app.js calls these when modals open/close; both are safe
  // no-ops on the cabinet, landing and chart screens where nothing is mounted.
  function pause() { gameHandle?.pause?.(); trialHandle?.pause?.(); }
  function resume() { gameHandle?.resume?.(); trialHandle?.resume?.(); }

  // ── Mount / events ───────────────────────────────────────────────────────
  let tourLandingScrolled = false;
  function mount(view) {
    if (view !== 'voyage') return;
    controller = new AbortController();
    const signal = controller.signal;
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, { signal });
    const direct = cartridgeId();
    if (direct) mountCartridge(direct);
    else if (run?.node) mountNode();
    const chart = $('.tour-chart'), currentStep = $('.tour-step.current');
    if (chart && currentStep) chart.scrollLeft = currentStep.offsetLeft - chart.clientWidth / 2 + currentStep.clientWidth / 2;
    if (restoreChartFocus) {
      // The previously focused node button was removed by the re-render; hand
      // focus to the current leg's first reachable node instead of <body>.
      restoreChartFocus = false;
      ($(`.tour-step.current [data-tour-node]:not([disabled])`) || main).focus({ preventScroll: true });
    }
    if (!direct && !run && !tourLandingScrolled && new URLSearchParams(location.search).get('tour') === '1') {
      // Landing linked from grand-tour.html's CTA: arrive at the expedition
      // setup, not the cartridge cabinet. Deferred past the router's scrollTo.
      tourLandingScrolled = true;
      requestAnimationFrame(() => ($('.tour-expedition-divider') || $('.tour-landing'))?.scrollIntoView({ behavior: 'instant', block: 'start' }));
    }
    main.addEventListener('click', event => {
      const filterButton = event.target.closest('[data-cabinet-filter]');
      if (filterButton) {
        const filter = filterButton.dataset.cabinetFilter;
        document.querySelectorAll('[data-cabinet-filter]').forEach(button => button.setAttribute('aria-pressed', String(button === filterButton)));
        document.querySelectorAll('[data-cabinet-family]').forEach(choice => { choice.hidden = filter !== 'all' && choice.dataset.cabinetFamily !== filter; });
        const visible = [...document.querySelectorAll('[data-cabinet-family]')].filter(choice => !choice.hidden).length;
        $('#cartridge-cabinet')?.setAttribute('aria-label', `${visible} playable Æther cartridge${visible === 1 ? '' : 's'} shown`);
        return;
      }
      const difficultyBtn = event.target.closest('[data-difficulty]');
      if (difficultyBtn && !run) {
        pendingDifficulty = difficultyBtn.dataset.difficulty;
        document.querySelectorAll('[data-difficulty]').forEach(c => c.setAttribute('aria-pressed',String(c===difficultyBtn)));
        return;
      }
      const hullCard = event.target.closest('[data-hull]');
      if (hullCard && !run) {
        pendingHull = hullCard.dataset.hull;
        document.querySelectorAll('.hangar-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
        hullCard.classList.add('selected'); hullCard.setAttribute('aria-pressed', 'true');
        toast(`${HULLS[pendingHull].name}, fuelled and waiting.`);
        return;
      }
      const nodeBtn = event.target.closest('[data-tour-node]');
      if (nodeBtn && !run?.node) {
        const [s, i] = nodeBtn.dataset.tourNode.split(':').map(Number);
        if (s !== run.step || run.done[`${s}:${i}`]) return;
        run.node = run.map[s][i]; run.nodeKey = `${s}:${i}`;
        render(); return;
      }
      const action = event.target.closest('[data-tour]')?.dataset.tour;
      if (!action) return;
      if (action === 'begin') begin();
      else if (action === 'cartridge-replay' && direct) { teardown(); mountCartridge(direct); }
      else if (action === 'resume') { if (store.active) { run = hydrate(store.active); render(); } }
      else if (action === 'abandon') { store.active = null; run = null; save(); render(); }
      else if (action === 'retreat' && run?.node) {
        const label = nodeLabel(run.node).name;
        teardown();
        loseHull(`Aborted ${label}. −1 hull.`);
        finishNode('failed', `Aborted ${label}.`);
      }
      else if (action === 'leave' && run?.node) finishNode('left', `${nodeLabel(run.node).name}: passed by.`);
      else if (action === 'rest') { run.hull = Math.min(run.maxHull, run.hull + 1); run.dust += Math.round(15 * dustMul()); finishNode('won', 'Rested at the sanctuary. +1 hull, +15 dust.'); }
      else if (action === 'salvage-hull') { run.hull = Math.min(run.maxHull, run.hull + 1); finishNode('won', 'Salvaged plating from the trial. +1 hull.'); }
      else if (action === 'salvage-dust') { run.dust += Math.round(60 * dustMul()); finishNode('won', 'Took the dust and ran. +60.'); }
      else if (action === 'journal') {
        if (run.journalLogged) return; // one logbook per run, no duplicates
        run.journalLogged = true;
        const body = `THE GRAND TOUR — ${run.won ? 'COMPLETED' : 'LOST AT SEA'}\nSkiff: ${HULLS[run.hullId].name}\nStardust: ${run.dust} · Threats cleared: ${run.kills}\n\n${run.path.join('\n')}`;
        state.journal.unshift({ id: crypto.randomUUID(), title: run.won ? 'Neptune, in person' : 'The sky kept the rest', body, subject: 'The Grand Tour', date: dateKey(new Date()) });
        persist(); toast('The logbook is pressed into the field journal.');
        const btn = $('[data-tour="journal"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Saved to the field journal ✓'; }
      }
    }, { signal });
  }
  function unmount() { teardown(); controller?.abort(); controller = null; }

  viewNames.voyage = 'Game cartridges';
  renderers.voyage = renderVoyage;
  searchItems.push({ id: 'voyage', name: 'Game cartridges', kind: 'page', subtitle: `${Object.keys(CARTRIDGES).length} playable Æther games`, icon: 'meteor' });
  return { mount, unmount, pause, resume };
})();
