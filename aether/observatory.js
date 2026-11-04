'use strict';

(() => {
  const KEY = 'aether-wonder-rooms-v1';
  const studio = window.AetherOrchestra;
  const $ = (selector, root = main) => root.querySelector(selector);
  const $$ = (selector, root = main) => [...root.querySelectorAll(selector)];
  const esc = escapeHTML;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const uid = () => crypto.randomUUID();
  const targets = window.AetherArt.targets;
  const games = {
    merge: { title: 'Planet Drop', kicker: 'A BEAUTIFUL CHAIN REACTION', description: 'Two small worlds. One bigger problem. Stack, merge, and try to keep the universe in the jar.', instruction: 'Aim, then release to drop. Matching planets merge.', goal: 'Chain merges multiply your score. Every merge charges a nudge; aim left or right before using it. Two supernovas clear each other.', colour: 'peach', badge: 'Drop / merge / repeat', icon: 'orbit', ability: 'Nudge', controls: '← → aim · Space drop · X nudge' },
    hop: { title: 'Comet Surf', kicker: 'LET GRAVITY DO THE DRIVING', description: 'Borrow a planet’s gravity. Sling yourself into the unknown. Try to look like you meant to do that.', instruction: 'Hold near a planet to orbit. Release to slingshot.', goal: 'Follow the dotted launch direction through gold rings. Pink rocks bite. Three lives; reach a new sector to recover one.', colour: 'lilac', badge: 'Hold / orbit / launch', icon: 'meteor', ability: '', controls: 'Hold Space or touch to orbit · Release to launch' },
    dash: { title: 'Stardust Dash', kicker: 'THE FORECAST IS EXTREMELY WEIRD', description: 'Steer a moonboat through a meteor shower. Gold is good. Pink is trouble. Jellyfish are surprisingly helpful.', instruction: 'Slide to steer. Catch stars and dodge pink meteors.', goal: 'Survive 75 seconds. Keep your streak for up to ×8 points. Catch a jellyfish for a star magnet and a life. Dash through danger when charged.', colour: 'mint', badge: 'Catch / dodge / dash', icon: 'sparkles', ability: 'Dash', controls: '← → or pointer to steer · Space / X dash' },
    breaker: { title: 'Orbit Breaker', kicker: 'THE WALLS ARE YOUR RESPONSIBILITY', description: 'A cosmic pinball problem. Keep the comet inside your orbit and shatter every crystal in the constellation.', instruction: 'Move around the arena to steer your orbital paddle.', goal: 'Bounce the comet into crystals. Angle your paddle hits to steer. Clear a constellation for 500 points and a life. Charge slow orbit for a wider paddle.', colour: 'blue', badge: 'NEW · Cosmic pinball', icon: 'moon', ability: 'Slow orbit', controls: 'Pointer / touch around the arena · ← → rotate · X power' },
  };
  // Persistent three-chapter fieldwork: score is not the only way to make progress.
  const arcadeContracts = {
    merge: [
      { id: 'merge-3', title: 'The first collision', copy: 'Cause 3 planetary merges in one run.', target: 3, measure: s => s.totalMerges || 0 },
      { id: 'merge-9', title: 'A growing system', copy: 'Make 9 merges without overflowing.', target: 9, measure: s => s.totalMerges || 0 },
      { id: 'merge-18', title: 'The patient astronomer', copy: 'Make 18 merges in a single jar.', target: 18, measure: s => s.totalMerges || 0 },
    ],
    hop: [
      { id: 'hop-2', title: 'First gravity assist', copy: 'Collect 2 golden rings in one flight.', target: 2, measure: s => s.ringsCaught || 0 },
      { id: 'hop-6', title: 'Thread the skyway', copy: 'Find 6 rings before re-entry.', target: 6, measure: s => s.ringsCaught || 0 },
      { id: 'hop-12', title: 'A perfect long arc', copy: 'Collect 12 rings in one flight.', target: 12, measure: s => s.ringsCaught || 0 },
    ],
    dash: [
      { id: 'dash-10', title: 'Collecting starlight', copy: 'Catch 10 stars during one forecast.', target: 10, measure: s => s.totalCatches || 0 },
      { id: 'dash-25', title: 'The brightest basket', copy: 'Catch 25 stars in one run.', target: 25, measure: s => s.totalCatches || 0 },
      { id: 'dash-50', title: 'The long night', copy: 'Catch 50 stars, perhaps in Expedition.', target: 50, measure: s => s.totalCatches || 0 },
    ],
    breaker: [
      { id: 'breaker-5', title: 'A crack in the heavens', copy: 'Strike 5 crystals in one run.', target: 5, measure: s => s.crystalHits || 0 },
      { id: 'breaker-20', title: 'Constellation mason', copy: 'Land 20 crystal hits in one run.', target: 20, measure: s => s.crystalHits || 0 },
      { id: 'breaker-50', title: 'Sky full of glass', copy: 'Land 50 crystal hits in a single run.', target: 50, measure: s => s.crystalHits || 0 },
    ],
  };
  const firstArcadeSeals = ['arcade:merge-3', 'arcade:hop-2', 'arcade:dash-10', 'arcade:breaker-5'];
  function checkConstellation() {
    const firsts = firstArcadeSeals.filter(id => voyage.discoveries.includes(id)).length;
    if (firsts === 4) unlock('arcade:grand-chart', 'The four-corner constellation · complete');
    if (firsts === 4 && voyage.discoveries.includes('music:constellation'))
      unlock('music:observatory-chorus', 'The observatory chorus · games and music together');
    if (Object.values(arcadeContracts).flat().every(c => voyage.discoveries.includes('arcade:' + c.id)))
      unlock('arcade:full-chart', 'A field guide full of impossible victories');
    return firsts;
  }
  function arcadeFieldwork() {
    const total = Object.values(arcadeContracts).flat().filter(c => voyage.discoveries.includes('arcade:' + c.id)).length;
    return `<div class="instrument-panel arcade-fieldwork"><p class="eyebrow">THE KEEPER’S FIELDWORK</p><h2>Three little challenges.</h2><p>Earn seals by mastering a different part of each game. Records stay, even when the next run starts.</p><div class="arcade-fieldwork-count">${total} / 12 seals in the whole arcade</div><div class="arcade-grand-chart"><strong>THE FOUR-CORNER CONSTELLATION</strong><span id="arcade-grand-progress">${firstArcadeSeals.filter(id => voyage.discoveries.includes(id)).length} / 4 worlds charted</span><p>Earn the first seal in every game, then compose a first constellation in the Orchestra to reveal a hidden chorus.</p></div>${arcadeContracts[activeGame].map((mission, index) => {
      const earned = voyage.discoveries.includes('arcade:' + mission.id);
      return `<div class="arcade-contract ${earned ? 'is-earned' : ''}" data-contract="${mission.id}"><div class="arcade-contract-top"><strong>${['I', 'II', 'III'][index]} · ${mission.title}</strong><span data-contract-score>${earned ? 'SEALED' : `0 / ${mission.target}`}</span></div><p>${mission.copy}</p><progress max="${mission.target}" value="${earned ? mission.target : 0}" aria-label="${mission.title}: progress"></progress></div>`;
    }).join('')}</div>`;
  }
  function updateArcadeFieldwork(data) {
    if (!data?.stats || !['running', 'ending', 'over'].includes(data.phase)) return;
    for (const mission of arcadeContracts[activeGame]) {
      const id = 'arcade:' + mission.id, value = Math.min(mission.target, Math.floor(mission.measure(data.stats)));
      if (value >= mission.target && !voyage.discoveries.includes(id)) unlock(id, mission.title + ' · fieldwork sealed');
      const card = $(`[data-contract="${mission.id}"]`);
      if (!card) continue;
      const earned = voyage.discoveries.includes(id);
      card.classList.toggle('is-earned', earned);
      card.querySelector('progress').value = earned ? mission.target : value;
      const label = earned ? 'SEALED' : `${value} / ${mission.target}`;
      if (card.querySelector('[data-contract-score]').textContent !== label) card.querySelector('[data-contract-score]').textContent = label;
    }
    const total = Object.values(arcadeContracts).flat().filter(c => voyage.discoveries.includes('arcade:' + c.id)).length;
    const count = $('.arcade-fieldwork-count'); if (count) count.textContent = `${total} / 12 seals in the whole arcade`;
    const firsts = firstArcadeSeals.filter(id => voyage.discoveries.includes(id)).length;
    const grand = $('#arcade-grand-progress'); if (grand) grand.textContent = `${firsts} / 4 worlds charted`;
    if (firsts === 4) checkConstellation();
  }
  const destinations = { moon: { name: 'the Moon', seconds: 1.28, distance: '384,400 km', colour: '#ced5d4' }, sun: { name: 'the Sun', seconds: 499, distance: '149.6 million km', colour: '#ecc379' }, mars: { name: 'Mars', seconds: 750, distance: '225 million km · illustrative', colour: '#dc9c84' }, neptune: { name: 'Neptune', seconds: 14977, distance: '4.49 billion km · illustrative', colour: '#91b1d8' } };
  const histories = [
    { id: 'galileo', year: '1610', date: '7 January 1610', title: 'Four lights. A new universe.', subtitle: 'Padua, Italy · Galileo’s telescope', text: 'Galileo watched little points of light change position beside Jupiter over successive nights. They were moons orbiting another world — evidence that not everything circled Earth.', task: 'Study both plates. Which point beside Jupiter changes position? Select your suspect.', clue: 'The moving light is a moon of Jupiter. Under the observation, the keeper has underlined two letters: ME. Part of a word?', type: 'jupiter' },
    { id: 'halley', year: '1758', date: '25 December 1758', title: 'The visitor who kept its promise.', subtitle: 'Saxony · Johann Georg Palitzsch', text: 'Edmond Halley predicted that the comet seen in 1682 would return. Palitzsch found it on Christmas night, 1758. A patient sky had kept an extraordinary appointment.', task: 'Compare the nights. Find the faint visitor with a tail.', clue: 'A pencilled note: “Even a very long journey can lead home.”', type: 'comet' },
    { id: 'eclipse', year: '1919', date: '29 May 1919', title: 'When the stars bent.', subtitle: 'Príncipe & Sobral · eclipse expeditions', text: 'Photographs taken during a total solar eclipse helped test Einstein’s prediction that the Sun’s gravity bends starlight. The expedition results became a landmark in the history of relativity.', task: 'Switch to the eclipse plate. Select a star near the Sun’s edge.', clue: 'A small reminder: “A different point of view changes everything.”', type: 'eclipse' },
    { id: 'pluto', year: '1930', date: '18 February 1930', title: 'The dot that refused to stay still.', subtitle: 'Lowell Observatory · Clyde Tombaugh', text: 'Tombaugh compared photographic plates taken on 23 and 29 January. Among thousands of fixed stars, one small point moved. He identified Pluto on 18 February 1930.', task: 'Blink between plates A and B. Among the fixed stars, identify the point that moves.', clue: 'Pluto, caught in the act. That tiny displacement expanded our picture of the solar system.', type: 'pluto' },
  ];

  function readVoyage() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
    const array = key => Array.isArray(raw[key]) ? raw[key].filter(v => v && typeof v === 'object').slice(0, 60) : [];
    const text = (v, max = 80) => typeof v === 'string' ? v.slice(0, max) : '';
    const object = raw.best && typeof raw.best === 'object' ? raw.best : {};
    return {
      discoveries: Array.isArray(raw.discoveries) ? [...new Set(raw.discoveries.filter(v => typeof v === 'string' && /^[a-z0-9:-]{1,60}$/.test(v)))].slice(0, 200) : [],
      best: Object.fromEntries(Object.entries(object).filter(([k, v]) => /^(hop|merge|dash|breaker)(:v\d+)?(:relaxed|:exp|:\d{4}-\d{2}-\d{2})?$/.test(k) && Number.isFinite(v)).map(([k, v]) => [k, clamp(v, 0, 1e9)])),
      relics: Array.isArray(raw.relics) ? [...new Set(raw.relics.filter(id => typeof id === 'string' && /^[a-z0-9-]{1,60}$/.test(id)))].slice(0, 60) : [],
      runs: array('runs').filter(run => games[run.game] && Number.isFinite(run.score)).slice(0, 12).map(run => ({ game: run.game, score: clamp(run.score, 0, 1e9), date: text(run.date, 40), daily: run.daily === true, relics: Array.isArray(run.relics) ? run.relics.filter(id => typeof id === 'string').slice(0, 4) : [] })),
      photos: array('photos').filter(p => targets.some(t => t.id === p.target) && typeof p.id === 'string').map(p => ({ id: text(p.id), target: p.target, developed: p.developed === true, exposure: clamp(p.exposure ?? 60, 0, 100), clarity: clamp(p.clarity ?? 65, 0, 100), warmth: clamp(p.warmth ?? 50, 0, 100), date: text(p.date), name: text(p.name), frame: p.frame && typeof p.frame === 'object' ? { x: clamp(p.frame.x, 0, 1600), y: clamp(p.frame.y, 0, 900), zoom: clamp(p.frame.zoom, .6, 3), focus: clamp(p.frame.focus, 0, 100), time: clamp(p.frame.time, 0, 1e7), version: 2 } : null })),
      worlds: array('worlds').filter(p => typeof p.id === 'string').map(p => ({ id: text(p.id), name: text(p.name), hue: clamp(p.hue, 0, 360), size: clamp(p.size || 1, .5, 2), mass: clamp(p.mass || 1, .2, 5), atmosphere: clamp(p.atmosphere, 0, 100), tilt: clamp(p.tilt, 0, 90), moons: Math.round(clamp(p.moons, 0, 4)), rings: p.rings === true, speed: clamp(p.speed || 24, 4, 72), marks: Array.isArray(p.marks) ? p.marks.slice(0, 250).filter(m => m && ['land', 'crater', 'storm'].includes(m.type)).map(m => ({ x: clamp(m.x, -1, 1), y: clamp(m.y, -1, 1), r: clamp(m.r, .03, .3), type: m.type })) : [] })),
      letters: array('letters').filter(l => destinations[l.destination] && Number.isFinite(l.sent) && Number.isFinite(l.arrival)).map(l => ({ id: text(l.id), destination: l.destination, text: text(l.text, 280), sent: l.sent, arrival: Math.max(l.sent + 1, l.arrival), claimed: l.claimed === true })),
      music: array('music').filter(m => Array.isArray(m.notes) && [4, 8].includes(m.notes.length)).map(m => studio.normalise({ ...m, id: text(m.id), name: text(m.name, 60) })),
      order: Array.isArray(raw.order) ? raw.order.filter(v => typeof v === 'string').slice(0, 200) : [],
      theme: ['forest', 'midnight', 'rose'].includes(raw.theme) ? raw.theme : 'forest',
      mode: ['guide', 'explorer', 'astronomer'].includes(raw.mode) ? raw.mode : 'guide',
      sound: raw.sound === true,
    };
  }
  const voyage = readVoyage();
  let activeGame = 'merge', challenge = false, relaxed = false, expedition = false, gameHandle = null, challengeDate = dateKey(new Date()), lastLives = 3, forecastOffered = false;
  let cleanups = [], controller, lastGamePhase, lastGameScore = 0, currentPhoto = voyage.photos[0]?.id;
  let telescope = { x: 800, y: 450, focus: 50, zoom: 1, target: 'saturn', open: false };
  let world = { name: 'Somewhere strange', hue: 166, size: 1, mass: 1, atmosphere: 60, tilt: 23, moons: 2, rings: true, speed: 24, marks: [] };
  let music = studio.normalise();
  let musicPlayer = null, musicStep = -1, historyIndex = 0, historyPlate = 0, blinkTimer, cabinetFilter = 'all';
  let worldBrush = 'land', worldRenderer = null, plateDeveloping = false, plateProgress = 0;
  let historyCompared = new Set([0]), historySelection = -1;
  const signalRoutes = [
    { name: 'Moon gate', start: [0, 3], end: [7, 3], mirrors: [[2,3],[2,1],[5,1],[5,3]], solution: [true,true,false,false] },
    { name: 'Polar express', start: [0, 3], end: [7, 2], mirrors: [[2,3],[2,0],[5,0],[5,2]], solution: [true,true,false,false] },
    { name: 'The long way home', start: [0, 3], end: [7, 1], mirrors: [[1,3],[1,1],[3,1],[3,4],[5,4],[5,1]], solution: [true,true,false,false,true,true] },
    { name: 'Solar switchback', start: [0, 2], end: [7, 2], mirrors: [[2,2],[2,4],[4,4],[4,0],[6,0],[6,2]], solution: [false,false,true,true,false,false] },
  ];
  let signalRoute = 0, signalTurns = 0, signalHints = 0;
  let signalMirrors = [false, true, false, true], signalSolved = false;
  const letterDraft = { text: '', destination: 'moon', speed: '3600' };
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(voyage)); return true; }
    catch { toast('Your discoveries are kept for this visit. Browser storage is full or unavailable.'); return false; }
  }
  const points = () => voyage.discoveries.length * 25;
  const rank = () => points() >= 400 ? 'Keeper of the cosmos' : points() >= 200 ? 'Celestial explorer' : points() >= 75 ? 'Star collector' : 'Curious traveller';
  function unlock(id, label) {
    if (voyage.discoveries.includes(id)) return false;
    voyage.discoveries.push(id); save();
    toast(`✦ ${label} · +25 stardust`);
    updatePassport(); return true;
  }
  function updatePassport() {
    $$('[data-stardust]').forEach(el => { el.textContent = points().toLocaleString(); });
    $$('[data-rank]').forEach(el => { el.textContent = rank(); });
  }
  function on(el, name, callback, options = {}) { if (el) el.addEventListener(name, callback, { ...options, signal: controller.signal }); }
  function every(callback, ms) { const timer = setInterval(() => { if (!document.hidden) callback(); }, ms); cleanups.push(() => clearInterval(timer)); return timer; }
  function redraw() {
    const active = document.activeElement;
    let selector = active?.id ? `#${CSS.escape(active.id)}` : null;
    if (!selector && main.contains(active) && active?.dataset?.exp) {
      // Re-find the re-rendered twin of id-less instrument buttons.
      selector = `[data-exp="${active.dataset.exp}"]`
        + (active.dataset.id ? `[data-id="${CSS.escape(active.dataset.id)}"]` : '')
        + (active.dataset.filter ? `[data-filter="${active.dataset.filter}"]` : '')
        + (active.dataset.mode ? `[data-mode="${active.dataset.mode}"]` : '')
        + (active.dataset.preset !== undefined ? `[data-preset="${active.dataset.preset}"]` : '')
        + (active.dataset.index !== undefined ? `[data-index="${active.dataset.index}"]` : '')
        + (active.dataset.track !== undefined ? `[data-track="${active.dataset.track}"][data-step="${active.dataset.step}"]` : '')
        + (active.dataset.direction ? `[data-direction="${active.dataset.direction}"]` : '');
    }
    state.suppressEnter = true; render(); state.suppressEnter = false;
    if (selector) main.querySelector(selector)?.focus({ preventScroll: true });
  }
  const expButton = (action, label, primary = false, attrs = '') => `<button type="button" class="button ${primary ? 'button-primary' : ''}" data-exp="${action}" ${attrs}>${label}</button>`;
  const roomLink = (id, label) => `<a class="button" href="#${id}">${label} ${icon('arrow-right')}</a>`;
  const heading = (eyebrow, title, subtitle, extra = '') => `<header class="exp-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="exp-subtitle">${subtitle}</p></div>${extra}</header>`;
  const passport = () => `<a href="#cabinet" class="passport-pill"><span class="passport-star" aria-hidden="true">✦</span><span><strong data-stardust>${points()}</strong><small>STARDUST</small></span><span class="passport-rank" data-rank>${rank()}</span><span class="sr-only">— open your discovery cabinet</span></a>`;
  const labelRange = (id, label, value, min, max, step = 1, suffix = '') => `<label class="instrument-control" for="${id}"><span>${label}<output id="${id}-value" for="${id}">${value}${suffix}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" /></label>`;

  function skyDots(seed = 1, count = 55) {
    let n = seed * 1723 + 7;
    const rand = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
    return Array.from({ length: count }, () => `<circle cx="${rand() * 600}" cy="${rand() * 380}" r="${.4 + rand() * 1.2}" fill="#eee3c5" opacity="${.2 + rand() * .7}"/>`).join('');
  }

  const art = (kind = 'saturn', hue = 160, extra = {}) => window.AetherArt.planet(kind, hue, extra);

  function gameArt(game) {
    const spheres = game === 'merge' ? [[180, 210, 59, '#f5a08c'], [280, 233, 42, '#bba7ed'], [232, 130, 34, '#edf19b'], [320, 165, 27, '#9ed7c6']] : game === 'hop' ? [[230, 180, 48, '#bba7ed']] : [];
    return `<svg class="celestial-art game-art-${game}" viewBox="0 0 500 330" aria-hidden="true">${skyDots(8, 25)}${game === 'merge' ? '<path d="M100 120v175h265V120" fill="none" stroke="#f5a08c55" stroke-width="3"/>' : game === 'hop' ? '<ellipse cx="230" cy="180" rx="140" ry="87" transform="rotate(-27 230 180)" fill="none" stroke="#bba7ed" stroke-width="2" stroke-dasharray="5 8"/><path class="art-drift" d="m330 80 28-18-8 31-7-12-13-1Z" fill="#edf19b"/><path d="M105 266q-80-95 60-172" fill="none" stroke="#f5a08c" stroke-width="8" stroke-linecap="round"/>' : game === 'dash' ? '<path d="M160 241q90 110 180 0Z" fill="#9ed7c6"/><ellipse cx="250" cy="240" rx="90" ry="14" fill="none" stroke="#f5dfac" stroke-width="4"/><g class="art-float" fill="#edf19b"><path d="m200 80 8 26 26 8-26 8-8 26-8-26-26-8 26-8m105-8 5 17 17 5-17 5-5 17-5-17-17-5 17-5"/></g><circle cx="120" cy="182" r="20" fill="#ed8c9c"/>' : `<circle cx="250" cy="165" r="120" fill="none" stroke="#8fcdea44" stroke-width="2" stroke-dasharray="4 8"/><path d="M164 249a120 120 0 0 0 170 0" fill="none" stroke="#8fcdea" stroke-width="12" stroke-linecap="round"/>${[0,1,2,3,4,5].map((i) => `<path d="m${250 + Math.cos(i / 6 * Math.PI * 2) * 55} ${160 + Math.sin(i / 6 * Math.PI * 2) * 55 - 19} 18 18-18 18-18-18Z" fill="${window.AetherArt.colours[i + 1]}"/>`).join('')}<circle class="art-float" cx="290" cy="226" r="8" fill="#fff1bd"/>`}${spheres.map(([x,y,r,fill]) => `<g class="art-float"><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/><ellipse cx="${x-r*.23}" cy="${y}" rx="4" ry="6" fill="#2c2338"/><ellipse cx="${x+r*.23}" cy="${y}" rx="4" ry="6" fill="#2c2338"/><path d="M${x-7} ${y+13}q7 8 14 0" fill="none" stroke="#2c2338" stroke-width="2"/></g>`).join('')}</svg>`;
  }

  function gameKey() { return `${activeGame}:v3${challenge ? ':' + challengeDate : expedition && activeGame === 'dash' ? ':exp' : relaxed && activeGame === 'hop' ? ':relaxed' : ''}`; }
  const relicPool = (game = activeGame) => window.AetherArcade.relics?.[game] || [];
  const relicById = id => Object.values(window.AetherArcade.relics || {}).flat().find(relic => relic.id === id);
  function relicCatalogue(game = activeGame) {
    return relicPool(game).map(relic => `<div class="relic-entry ${voyage.relics.includes(relic.id) ? 'catalogued' : ''}"><span class="relic-glyph" aria-hidden="true">${esc(relic.glyph)}</span><div><strong>${esc(relic.name)}</strong><p>${esc(relic.description)}</p><small>${voyage.relics.includes(relic.id) ? '✦ DISCOVERED' : 'AWAITING YOUR FIRST EXPERIMENT'}</small></div></div>`).join('');
  }
  function renderArcade() {
    const g = games[activeGame];
    if (challenge) challengeDate = dateKey(new Date());
    const [width, height] = window.AetherArcade.dimensions(activeGame);
    return `<div class="experience arcade-page ${activeGame === 'merge' ? 'portrait-game' : 'wide-game'}">${heading('THE RELIC EXPEDITIONS · FOUR LITTLE UNIVERSES', 'One more run.<br><em>One stranger build.</em>', 'Earn curious relics. Combine their powers. See what your next run becomes.', passport())}
      <div class="arcade-selector" role="group" aria-label="Choose a game">${Object.entries(games).map(([id, game], i) => `<button class="arcade-choice ${game.colour} ${id === activeGame ? 'selected' : ''}" data-exp="choose-game" data-id="${id}" aria-pressed="${id === activeGame}"><span class="choice-art">${gameArt(id)}</span><span class="choice-copy"><small>${game.badge}</small><strong>${game.title}</strong></span><span class="choice-number">0${i + 1}</span></button>`).join('')}</div>
      <div class="arcade-layout"><section class="game-cabinet ${g.colour}" aria-label="${g.title}"><div class="game-topline"><span class="game-label">${icon(g.icon)} ${g.title}</span><div class="game-tools">${expButton('game-sound', voyage.sound ? 'Sound on' : 'Sound off', false, `id="game-sound" aria-pressed="${voyage.sound}"`)}${expButton('game-pause', 'Pause', false, 'id="game-pause" disabled')}${expButton('game-theatre', 'Expand', false, 'id="game-theatre" aria-pressed="false"')}</div></div>
      <div class="game-scoreboard"><div><small>SCORE</small><strong id="game-score">0</strong></div><div><small>PERSONAL BEST</small><strong id="game-best">${voyage.best[gameKey()] || 0}</strong></div><div class="game-next"><small>${activeGame === 'merge' ? 'COMING UP' : 'MISSION STATUS'}</small><strong id="game-next">READY TO GO</strong><div id="next-worlds" class="next-worlds" ${activeGame === 'merge' ? '' : 'hidden'}></div></div></div>
      <div class="relic-progress"><div><span id="relic-progress-label">First discovery ahead</span><span id="relic-count">0 / 4 relics</span></div><progress id="relic-progress" max="1" value="0" aria-label="Progress to the next relic"></progress></div>
      <div class="game-screen" style="--game-ratio:${width}/${height};--game-aspect:${(width / height).toFixed(4)}"><canvas id="arcade-canvas" width="${width}" height="${height}" tabindex="0" role="application" aria-label="${g.title}. ${g.instruction} ${g.controls}. P pauses." aria-describedby="game-instruction"></canvas><div class="game-overlay" id="game-overlay"><span class="overlay-emblem">${activeGame === 'breaker' ? '◈' : '✦'}</span><p class="eyebrow" id="overlay-kicker">${challenge ? 'TODAY’S DAILY EXPEDITION' : 'A NEW BUILD EVERY RUN'}</p><h2 id="overlay-title">${g.title}</h2><p id="overlay-copy">${g.instruction}</p>${activeGame === 'merge' ? `<div class="forecast-row" role="group" aria-label="Choose tonight’s forecast">${expButton('game-forecast', 'Low gravity · floatier worlds', false, 'data-id="lowgrav"')}${expButton('game-forecast', 'Crowded skies · busier jar', false, 'data-id="crowded"')}${expButton('game-forecast', 'Long look-ahead · four ahead', false, 'data-id="lookahead"')}</div>` : expButton('game-start', 'Let’s play ' + icon('play'), true, 'id="game-start"')}<p class="overlay-footnote">${g.controls}</p></div></div>
      <div class="game-bottom"><p id="game-instruction">${g.controls}<span>P to pause · C for the Stellar Pact · 1 / 2 / 3 to choose a relic</span></p>${g.ability ? `<button class="ability-button" data-exp="game-ability" id="game-ability" disabled><span>${g.ability}</span><b id="ability-charge">0%</b><i id="ability-fill"></i></button>` : '<span class="hold-hint">HOLD → ORBIT<br>RELEASE → FLY</span>'}</div>
      <div class="pact-rail"><button type="button" id="game-pact" data-exp="game-pact" disabled aria-label="Invoke Stellar Pact, double points for twelve seconds, and forfeit shield protection if hit. Keyboard C.">✦ STELLAR PACT · ×2 SCORE</button><span id="game-pact-status">Earn this wager by playing. Press C when ready. A hit breaks the pact.</span></div>
      <div class="run-build"><div class="run-build-heading"><span>YOUR BUILD</span><span id="build-state">A blank page. For now.</span></div><div id="run-relics" class="run-relics"></div><div id="run-synergies" class="run-synergies" role="status"></div></div>
      <section id="run-recap" class="run-recap" aria-label="Run summary" hidden></section>
      <dialog id="relic-dialog" class="relic-dialog" aria-labelledby="relic-title" aria-describedby="relic-description"><div class="relic-dialog-heading"><span class="relic-discovery-mark" aria-hidden="true">✧</span><p class="eyebrow">SOMETHING EXTRAORDINARY, FOUND</p><h2 id="relic-title">What will you become?</h2><p id="relic-description">Choose one. It stays with you this run. Your expedition is paused.</p></div><div id="relic-choices" class="relic-choices"></div><div class="relic-dialog-footer"><span>Choose with a tap or keys 1 / 2 / 3</span>${expButton('relic-skip', 'Keep my current build')}</div></dialog>
      <p id="game-status" class="sr-only" role="status"></p></section>
      <aside class="arcade-aside"><div class="instrument-panel game-intro"><p class="eyebrow">${g.kicker}</p><h2>${g.title}.</h2><p>${g.description}</p><div class="game-tip"><span>✳</span><p>${g.goal}</p></div><div class="mode-switch" role="group" aria-label="Game mode">${expButton('game-casual', 'Free play', false, `aria-pressed="${!challenge && !expedition}"`)}${activeGame === 'dash' ? expButton('game-expedition', 'Expedition', false, `aria-pressed="${expedition && !challenge}"`) : ''}${expButton('game-daily', 'Daily orbit', false, `aria-pressed="${challenge}"`)}</div><p class="tiny-note">${challenge ? `A fixed course for ${formatDate(parseDate(challengeDate))}. Local daily best; resets at midnight.` : expedition && activeGame === 'dash' ? 'Six weathers, five missions, and one enormous whale. About four minutes.' : 'Fresh possibilities every run. Your best stays on this device.'}</p>${activeGame === 'hop' && !challenge ? `<label class="check-control"><input id="relaxed-flight" type="checkbox" ${relaxed ? 'checked' : ''}> Easy orbit · wider gravity fields</label>` : ''}</div>
      <div class="instrument-panel expedition-guide"><p class="eyebrow">A SMALL ROGUELITE. A BIG WHAT-IF.</p><h2>Make a little<br><em>trouble.</em></h2><ol><li><span>01</span>Play to earn a discovery.</li><li><span>02</span>Pick one of three relics.</li><li><span>03</span>Combine powers. Find a synergy.</li></ol><p class="tiny-note">Up to four relics per run. Discoveries stay in your field guide; powers begin fresh each time.</p><details class="relic-field-guide"><summary>Browse the six relics <span id="catalogue-count">${relicPool().filter(r => voyage.relics.includes(r.id)).length} / ${relicPool().length}</span></summary><div id="relic-catalogue">${relicCatalogue()}</div></details></div>
      ${arcadeFieldwork()}${activeGame === 'merge' ? `<div class="instrument-panel evolution"><p class="eyebrow">SMALL WORLD. BIG AMBITIONS.</p><div class="evolution-row">${window.AetherArcade.names.map((name, i) => `<span title="${name}"><i style="--orb:${window.AetherArcade.colours[i]};--size:${19 + i * 1.4}px"></i><small>${name}</small></span>`).join('')}</div></div>` : ''}<div class="arcade-share"><span>Good run? Keep the evidence.</span>${expButton('share-score', 'Score postcard ↗', false, 'id="share-score"')}</div></aside></div></div>`;
  }

  const rooms = [
    ['telescope', '01', 'At the eyepiece', 'Five subjects to find, focus, and photograph.', 'saturn', 'Open the dome'],
    ['darkroom', '02', 'The darkroom', 'Develop a capture into a print. Time the bath, tune the finish.', 'orion', 'Develop a plate'],
    ['worlds', '03', 'The drawing table', 'Shape a world: mass, moons, continents, and one optional comet.', 'world', 'Make a world'],
    ['orchestra', '04', 'The sequencer', 'Four planet voices, eight beats, and a score to record.', 'music', 'Arrange a score'],
    ['history', '05', 'Lost nights', 'Four real discoveries, reconstructed. Find what changed.', 'jupiter', 'Investigate'],
    ['letters', '06', 'The light desk', 'Route a beam through mirrors and post a letter by light.', 'letter', 'Route a beam'],
  ];
  function renderDiscover() {
    return `<div class="experience">${heading('SIX WORK ROOMS', 'Observe first.<br><em>Then make something.</em>', 'Telescope, darkroom, workshop, sequencer, archive, and light desk. Everything you make is kept on this device.', passport())}
      <div class="room-grid">${rooms.map(([id, number, title, description, picture, action]) => `<a class="room-card room-${id}" href="#${id}"><div class="room-art">${art(picture, world.hue, world)}<span class="room-number">ROOM / ${number}</span><span class="room-arrow">↗</span></div><div class="room-copy"><h2>${title}</h2><p>${description}</p><span>${action} ${icon('arrow-right')}</span></div></a>`).join('')}</div>
      <section class="mystery-banner"><div class="wax-seal">?</div><div><p class="eyebrow">A SMALL MYSTERY</p><h2>The missing astronomer.</h2><p>A photograph, an old notebook, and a message with no return address. Follow the evidence through the rooms.</p></div>${roomLink('mystery', 'Take the case')}</section>
      <section class="passport-panel"><div><p class="eyebrow">HOW MUCH HELP?</p><h2>Choose your guide level.</h2><p>Guide labels the telescope sky and offers focus hints. Explorer hides labels. Astronomer makes you navigate by coordinates.</p></div><div class="mode-switch" role="group" aria-label="Exploration assistance">${['guide', 'explorer', 'astronomer'].map(mode => expButton('exploration-mode', mode[0].toUpperCase() + mode.slice(1), false, `data-mode="${mode}" aria-pressed="${voyage.mode === mode}"`)).join('')}</div></section></div>`;
  }

  function renderTelescope() {
    return `<div class="experience">${heading('01 / THE OPEN DOME', 'Find it.<br><em>Focus it.</em>', 'Frame each subject your way, then take a photograph to develop.', roomLink('darkroom', 'Your darkroom ↗'))}
      <div class="instrument-layout"><section class="telescope-stage instrument-stage ${telescope.open ? 'dome-open' : ''}" id="telescope-stage"><div class="instrument-top"><span>REFRACTOR / 008</span><span id="scope-coordinates">800 / 450</span></div><div class="scope-viewport"><canvas id="scope-canvas" width="760" height="500" tabindex="0" role="application" aria-label="Telescope sky. Drag or use arrow keys to pan. Plus and minus zoom. Adjust focus with the labelled slider."></canvas><div class="scope-reticle" aria-hidden="true"><span></span></div></div><div class="dome-door dome-left"></div><div class="dome-door dome-right"></div><div class="dome-intro" ${telescope.open ? 'hidden' : ''}><span class="dome-mark">✳</span><h2>Five subjects<br>for tonight.</h2><p>Find each one, focus the ring, and take a photograph.</p>${expButton('open-dome', 'Open the dome ↗', true)}</div><div class="scope-readout"><span id="scope-target">Sweep the sky</span><strong id="scope-sharpness">0% sharpness</strong></div><p id="scope-status" class="sr-only" role="status"></p></section>
      <aside class="instrument-panel scope-controls"><p class="eyebrow">THE OBSERVING LIST</p><h2>Start here.</h2><p>Drag to explore. The focus ring turns green when a centred subject is sharp enough to capture.</p><label class="field-label" for="scope-select">Find a subject</label><select id="scope-select" class="exp-select">${targets.map(t => `<option value="${t.id}" ${t.id === telescope.target ? 'selected' : ''}>${t.name}${voyage.discoveries.includes('capture:' + t.id) ? ' · captured' : ''}</option>`).join('')}</select>${expButton('scope-guide', voyage.mode === 'astronomer' ? 'Show coordinates' : 'Take me there')}${labelRange('scope-focus', 'Focus', telescope.focus, 0, 100)}${labelRange('scope-zoom', 'Zoom', telescope.zoom, .6, 3, .1, '×')}<div class="focus-meter"><i id="focus-fill"></i></div>${expButton('scope-capture', 'Capture this moment ↗', true, 'id="scope-capture" disabled')}<p class="tiny-note" id="scope-hint">${voyage.mode === 'guide' ? 'Pick a subject, take the telescope there, then dial in the focus.' : 'Centre your subject. Reach 80% sharpness to take a photograph.'}</p><p class="instrument-footnote">An illustrated, imaginary sky. Your framing, focus and capture time become the photograph.</p></aside></div>
      <div class="target-strip">${targets.map(t => `<button data-exp="scope-target" data-id="${t.id}" class="target-chip ${voyage.discoveries.includes('capture:' + t.id) ? 'discovered' : ''}"><span style="--orb:${t.colour}"></span>${t.name}<small>${voyage.discoveries.includes('capture:' + t.id) ? '✓ CAPTURED' : 'UNDISCOVERED'}</small></button>`).join('')}</div></div>`;
  }

  function renderDarkroom() {
    const photo = voyage.photos.find(p => p.id === currentPhoto) || voyage.photos[0];
    if (!photo) return `<div class="experience">${heading('02 / THE DARKROOM', 'We work<br><em>in the dark.</em>', 'A photographic playground. First, we need something to develop.')}<div class="empty-experience">${art('orion')}<div><p class="eyebrow">YOUR FIRST EXPERIMENT</p><h2>Catch the light.<br>Then make a mess.</h2><p>Find a subject through the telescope and capture it. Your photograph will be waiting right here.</p>${roomLink('telescope', 'Find something to photograph ↗')}</div></div></div>`;
    currentPhoto = photo.id;
    const target = targets.find(t => t.id === photo.target);
    return `<div class="experience">${heading('02 / THE DARKROOM', 'A little light.<br><em>A little alchemy.</em>', 'Lower the plate into the bath. Something is about to emerge.', roomLink('telescope', 'Capture another ↗'))}
      <div class="instrument-layout"><section class="darkroom-stage instrument-stage"><div class="safelight"><i></i> SAFELIGHT ON / CURIOSITY EXPOSED</div><div class="developer-tank"><button id="plate-handle" class="plate-handle" aria-label="Lower into the bath — develop photograph. Drag down, or press Enter.">↓ LOWER INTO THE BATH</button><div class="glass-plate ${photo.developed ? 'developed' : ''}" id="glass-plate"><div id="plate-image"><canvas id="plate-canvas" width="760" height="500" role="img" aria-label="Your telescope photograph"></canvas></div><div class="develop-wash"></div><span class="glass-corner">PLATE ${String(voyage.photos.indexOf(photo) + 1).padStart(2, '0')}</span></div><div class="developer-liquid" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div><p class="development-status" id="development-status" role="status">${photo.developed ? 'Developed. Try a different finish.' : 'Drag the handle down, or press Develop.'}</p><div class="plate-caption"><h2>${esc(photo.name || target.name)}</h2><p>${target.note}</p></div></section>
      <aside class="instrument-panel"><p class="eyebrow">YOUR FINISHING TOUCH</p><h2>Make it yours.</h2><label class="field-label" for="plate-select">Glass plate</label><select id="plate-select" class="exp-select">${voyage.photos.map(p => `<option value="${esc(p.id)}" ${p.id === photo.id ? 'selected' : ''}>${targets.find(t => t.id === p.target).name}${p.developed ? ' · developed' : ' · fresh'}</option>`).join('')}</select>${labelRange('plate-exposure', 'Exposure', photo.exposure, 0, 100)}${labelRange('plate-clarity', 'Contrast & detail', photo.clarity, 0, 100)}${labelRange('plate-warmth', 'Warmth', photo.warmth, 0, 100)}<label class="field-label" for="plate-name">Title your photograph</label><input id="plate-name" class="exp-input" value="${esc(photo.name || target.name)}" maxlength="60">${expButton('develop-plate', photo.developed ? 'Save this finish' : 'Develop photograph ↗', true, 'id="develop-plate"')}${expButton('download-plate', 'Download your print ' + icon('download'))}<p class="tiny-note">The scene you framed, at the moment you captured it. Your finish is applied to the exported print.</p></aside></div></div>`;
  }

  function worldScene() {
    return '<canvas id="world-canvas" width="760" height="500" tabindex="0" role="application" aria-label="World painting canvas. Drag to paint. Arrow keys move the brush; Space paints. Choose a brush below."></canvas>';
  }
  function renderWorlds() {
    return `<div class="experience">${heading('03 / THE WORLD WORKSHOP', 'A world with<br><em>your weirdness.</em>', 'Paint the surface. Change the atmosphere. Give it a name worth orbiting.', passport())}
      <div class="instrument-layout"><section class="world-stage instrument-stage"><div class="instrument-top"><span>PLANET-MAKER / EXPERIMENTAL</span><span>DRAG TO PAINT</span></div><div id="world-preview">${worldScene()}</div><div class="brush-toolbar" role="group" aria-label="Surface brushes">${[['land','◒ Continents'],['crater','◉ Craters'],['storm','≋ Storms']].map(([id,label]) => expButton('world-brush', label, false, `data-id="${id}" aria-pressed="${worldBrush === id}"`)).join('')}${expButton('world-undo', 'Undo', false, 'aria-label="Undo the last brush stroke"')}${expButton('world-clear', 'Clear surface')}</div><div class="world-readout"><h2 id="world-title">${esc(world.name)}</h2><div><span id="world-gravity"></span><span id="world-day"></span><span id="world-moon-count"></span></div></div><p class="tiny-note world-brush-note" id="world-brush-status" role="status">Drag across the planet, or use arrows + Space to paint.</p></section>
      <aside class="instrument-panel world-controls"><label class="field-label" for="world-name">Name your world</label><input id="world-name" class="exp-input" maxlength="50" value="${esc(world.name)}">${labelRange('world-hue', 'Planet colour', world.hue, 0, 360)}${labelRange('world-size', 'Radius · Earths', world.size, .5, 2, .1)}${labelRange('world-mass', 'Mass · Earths', world.mass, .2, 5, .1)}${labelRange('world-atmosphere', 'Atmosphere', world.atmosphere, 0, 100)}${labelRange('world-tilt', 'Tilt', world.tilt, 0, 90, 1, '°')}${labelRange('world-speed', 'Day length', world.speed, 4, 72, 1, 'h')}${labelRange('world-moons', 'Moons', world.moons, 0, 4)}<label class="check-control"><input type="checkbox" id="world-rings" ${world.rings ? 'checked' : ''}> Yes, it needs rings.</label><div class="button-row">${expButton('random-world', 'New random world')}${expButton('save-world', 'Keep this world ↗', true)}</div><p class="tiny-note">Mass changes the moons’ pace. Atmosphere changes the halo. Your painted surface is saved with the world.</p></aside></div>
      ${voyage.worlds.length ? `<section class="saved-worlds"><p class="section-label">YOUR VERY OWN SOLAR SYSTEM</p><div class="saved-world-grid">${voyage.worlds.map(w => `<button class="mini-world-card" data-exp="load-world" data-id="${esc(w.id)}">${art('world', w.hue, w)}<strong>${esc(w.name)}</strong><small>${w.moons} ${w.moons === 1 ? 'moon' : 'moons'} · ${w.marks?.length || 0} brush marks</small></button>`).join('')}</div></section>` : ''}</div>`;
  }

  const musicStories = [
    { id: 'music:constellation', title: 'The first constellation', detail: 'Place 8 notes across 3 voices.', voices: 3, notes: 8, quarters: 1 },
    { id: 'music:tide', title: 'A changing tide', detail: 'Use 5 voices, 16 notes, and 3 phrases.', voices: 5, notes: 16, quarters: 3 },
    { id: 'music:all-worlds', title: 'The eight-world symphony', detail: 'Play all 8 voices, 24 notes, across 4 phrases.', voices: 8, notes: 24, quarters: 4 },
  ];
  function musicStats() {
    const voices = music.notes.filter(row => row.some(Boolean)).length;
    const notes = music.notes.flat().filter(Boolean).length;
    const quarters = Array.from({ length: 4 }, (_, i) => music.notes.some(row => row.slice(i * 4, i * 4 + 4).some(Boolean))).filter(Boolean).length;
    return { voices, notes, quarters };
  }
  function musicStoryCards() {
    const progress = musicStats();
    return musicStories.map(story => {
      const earned = voyage.discoveries.includes(story.id);
      const ready = progress.voices >= story.voices && progress.notes >= story.notes && progress.quarters >= story.quarters;
      return `<div class="music-story ${earned ? 'earned' : ready ? 'ready' : ''}"><div><strong>${earned ? '✧ ' : ''}${story.title}</strong><p>${story.detail}</p></div>${earned ? '<span class="music-story-seal">SEALED</span>' : `<button type="button" data-exp="music-claim" data-id="${story.id}" ${ready ? '' : 'disabled'}>${ready ? 'Claim seal ✧' : 'Keep composing'}</button>`}</div>`;
    }).join('');
  }
  function refreshMusicStories() {
    const stat = $('#music-mission-progress'); if (stat) {
      const { voices, notes, quarters } = musicStats();
      stat.textContent = `${voices} / 8 voices · ${notes} notes · ${quarters} / 4 phrases`;
    }
    const cards = $('#music-story-cards'); if (cards) cards.innerHTML = musicStoryCards();
  }
  function renderOrchestra() {
    const tracks = studio.TRACKS;
    return `<div class="experience">${heading('ROOM 04 · THE ORRERY ORCHESTRA', 'The universe has<br><em>excellent rhythm.</em>', 'Eight playable instruments, sixteen steps, living harmonies and three little composition quests.', roomLink('cabinet', 'Your saved scores'))}
      <div class="orchestra-stage instrument-stage"><div class="music-orbits">${tracks.map((track, i) => `<div class="music-orbit orbit-${i}"><span style="--note-colour:${track.colour}"></span></div>`).join('')}<span class="music-sun">✦</span></div><div class="orchestra-title"><p class="eyebrow">EIGHT WORLDS · ONE LIVING SCORE</p><h2 id="composition-title">${esc(music.name)}</h2><p id="orchestra-status" role="status">Your orchestra is ready. Compose or play the keyboard pads.</p><div class="music-mood-line">${studio.MOODS[music.mood].name} · ${music.tempo} BPM</div></div></div>
      <section class="instrument-panel sequencer"><div class="sequencer-heading"><div><label class="field-label" for="music-name">Name your celestial score</label><input id="music-name" class="exp-input" value="${esc(music.name)}" maxlength="60"></div><div class="music-transport">${expButton('music-play', 'Play my universe ' + icon('play'), true, 'id="music-play" aria-pressed="false"')}${expButton('music-save', 'Keep this melody')}${expButton('music-export', 'Download stereo WAV ' + icon('download'))}</div></div>
      <div class="music-explainer"><strong>THE SIXTEEN-BEAT SKY</strong><span>Click cells to place notes · every four beats the harmony changes · mute a planet or balance it in the mixer.</span></div>
      <div class="sequence-scroll" role="region" tabindex="0" aria-label="Sixteen-step, eight-instrument sequencer; scroll horizontally for later beats"><div class="sequence-grid"><div class="sequence-count"><span>INSTRUMENT / BEAT</span>${Array.from({ length: studio.STEPS }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>${music.notes.map((row, i) => `<div class="sequence-track ${music.mutes[i] ? 'is-muted' : ''}" style="--track-colour:${tracks[i].colour}"><div class="sequence-voice"><div class="sequence-voice-name"><strong>${tracks[i].planet}</strong><small>${tracks[i].voice}</small></div><div class="sequence-voice-controls"><button type="button" class="music-mute" data-exp="music-mute" data-track="${i}" aria-label="${music.mutes[i] ? 'Unmute' : 'Mute'} ${tracks[i].planet}" aria-pressed="${music.mutes[i]}">${music.mutes[i] ? 'Muted' : 'On'}</button><input type="range" class="music-level" data-track="${i}" id="music-level-${i}" min="0" max="100" value="${Math.round(music.levels[i] * 100)}" aria-label="${tracks[i].planet} volume" /></div></div>${row.map((active, step) => `<button type="button" class="sequence-note ${active ? 'on' : ''}" data-exp="music-note" data-track="${i}" data-step="${step}" aria-label="${tracks[i].planet} ${tracks[i].voice}, beat ${step + 1}" aria-pressed="${active}"><i></i></button>`).join('')}</div>`).join('')}</div></div>
      <div class="music-studio-controls"><div class="music-harmony-control"><label class="field-label" for="music-mood">Harmonic weather</label><select id="music-mood" class="exp-select">${Object.entries(studio.MOODS).map(([id, mood]) => `<option value="${id}" ${music.mood === id ? 'selected' : ''}>${mood.name}</option>`).join('')}</select></div>${labelRange('music-tempo', 'Tempo', music.tempo, 60, 160, 1, ' BPM')}${labelRange('music-swing', 'Swing', music.swing, 0, 50, 1, '%')}${labelRange('music-space', 'Space & echoes', music.space, 0, 80, 1, '%')}</div>
      <div class="music-bottom"><div><p class="eyebrow">START FROM A LITTLE SKETCH</p><div class="button-row">${studio.PRESETS.map((preset, i) => expButton('music-preset', preset.name, false, `data-preset="${i}"`)).join('')}${expButton('music-clear', 'Clear notes')}</div></div><p class="tiny-note">Web Audio instruments, stereo panning and a soft echo chamber. WAV exports render the same arrangement and effects. All scores stay in your browser.</p></div></section>
      <section class="instrument-panel music-quest"><div class="music-quest-heading"><div><p class="eyebrow">AN ATLAS OF SOUND</p><h2>Compose for the stars.</h2></div><span id="music-mission-progress">${musicStats().voices} / 8 voices · ${musicStats().notes} notes · ${musicStats().quarters} / 4 phrases</span></div><div id="music-story-cards">${musicStoryCards()}</div><p class="music-story-link">The music and arcade fieldwork share one discovery passport. Chart the first challenge in all four games and claim your first composition seal to unlock the Observatory Chorus.</p></section>
      ${voyage.music.length ? `<div class="saved-music"><p class="section-label">YOUR COMPOSITIONS</p>${voyage.music.map(m => expButton('music-load', '♫ ' + esc(m.name), false, `data-id="${esc(m.id)}"`)).join('')}</div>` : ''}</div>`;
  }

  function historyCandidates() {
    const rnd = window.AetherArt.random(620 + historyIndex);
    return Array.from({ length: 20 }, (_, i) => {
      const moving = i === 6 + historyIndex * 2;
      let x = 11 + i % 5 * 18 + rnd() * 5, y = 16 + Math.floor(i / 5) * 20 + rnd() * 4;
      if (moving) {
        x = historyIndex === 0 ? 34 : historyIndex === 2 ? 64 : 39;
        y = historyIndex === 0 ? 49 : historyIndex === 2 ? 39 : 46;
        x += historyPlate * (historyIndex === 2 ? 5 : 11); y += historyPlate * (historyIndex === 0 ? -8 : 6);
      }
      return { x, y, moving };
    });
  }
  function historyScene() {
    const scene = histories[historyIndex];
    const solved = voyage.discoveries.includes('history:' + scene.id);
    return `<div class="history-sky ${scene.type} plate-${historyPlate} ${solved ? 'case-solved' : ''}">${scene.id === 'galileo' ? '<div class="history-jupiter"></div>' : scene.id === 'eclipse' ? '<div class="history-sun"></div>' : ''}<svg class="history-stars" viewBox="0 0 600 380" aria-hidden="true">${skyDots(29 + historyIndex, 130)}</svg>${historyCandidates().map(({x, y, moving}, i) => `<button class="history-find ${solved && moving ? 'identified' : ''} ${historySelection === i && !moving ? 'wrong-suspect' : ''}" style="left:${x}%;top:${y}%" data-exp="history-find" data-index="${i}" aria-label="Inspect light ${i + 1}, ${Math.round(x)} percent across, ${Math.round(y)} percent down"><span></span>${solved && moving ? '<b>IDENTIFIED</b>' : ''}</button>`).join('')}<span class="plate-letter">EXPOSURE ${historyPlate ? 'B' : 'A'} <i>${historyPlate ? 'SECOND OBSERVATION' : 'FIRST OBSERVATION'}</i></span></div>`;
  }
  function renderHistory() {
    const scene = histories[historyIndex];
    return `<div class="experience">${heading('ROOM 05 · THE CABINET OF LOST NIGHTS', 'Some nights<br><em>change everything.</em>', 'Step into an illustrated reconstruction of four extraordinary discoveries.', passport())}<div class="history-timeline" role="group" aria-label="Choose a historical night">${histories.map((h, i) => `<button data-exp="history-era" data-index="${i}" aria-pressed="${i === historyIndex}"><strong>${h.year}</strong><span>${h.id === 'galileo' ? 'The moons of Jupiter' : h.id === 'halley' ? 'Halley returns' : h.id === 'eclipse' ? 'Starlight bends' : 'Finding Pluto'}</span>${voyage.discoveries.includes('history:' + h.id) ? '<small>✦ OBSERVED</small>' : ''}</button>`).join('')}</div><div class="instrument-layout"><section class="history-stage instrument-stage"><div class="instrument-top"><span>${scene.date.toUpperCase()}</span><span>A RECONSTRUCTED NIGHT</span></div><div id="history-picture">${historyScene()}</div><div class="history-controls">${expButton('history-blink', 'Blink between plates', false, 'id="history-blink" aria-pressed="false"')}${expButton('history-next', 'Show plate B', true, 'id="history-next"')}</div></section><aside class="instrument-panel history-story"><p class="eyebrow">${scene.subtitle}</p><h2>${scene.title}</h2><p>${scene.text}</p><div class="game-tip"><span>✧</span><p>${scene.task}</p></div><div class="historian-note" id="historian-note" ${voyage.discoveries.includes('history:' + scene.id) ? '' : 'hidden'}><span>FROM THE KEEPER’S NOTEBOOK</span><p>${scene.clue}</p></div><p class="tiny-note">Educational reconstructions. Positions, motion, and scale are exaggerated to make the discovery visible.</p></aside></div></div>`;
  }

  function duration(seconds) { return seconds < 60 ? `${Math.max(0, seconds).toFixed(seconds < 2 ? 2 : 0)}s` : seconds < 3600 ? `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s` : `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`; }
  function renderLetters() {
    const route = signalRoutes[signalRoute], destination = destinations[letterDraft.destination];
    return `<div class="experience">${heading('06 / POSTCARDS AT LIGHTSPEED', 'Good thoughts.<br><em>Strange routes.</em>', 'Angle the mirrors. Connect the beam. Give a thought somewhere to go.', passport())}
      <div class="signal-route-select" role="group" aria-label="Choose a light-routing puzzle">${signalRoutes.map((r,i) => expButton('signal-route', `<span class="route-number">${['I','II','III','IV'][i]}</span> ${r.name}${voyage.discoveries.includes('signal:route-' + i) ? ' ✓' : ''}`, false, `data-index="${i}" aria-pressed="${signalRoute === i}"`)).join('')}</div>
      <div class="instrument-layout"><section class="signal-stage instrument-stage"><div class="instrument-top"><span>${route.name.toUpperCase()}</span><span id="signal-turns">${signalTurns} TURNS · ${route.mirrors.length} MIRRORS</span></div><div class="signal-board"><canvas id="signal-canvas" width="760" height="440" role="img" aria-label="Light path from Earth to your destination. Rotate each numbered mirror to carry the beam through all of them."></canvas>${route.mirrors.map(([x,y],i) => `<button class="signal-mirror" data-exp="signal-mirror" data-index="${i}" style="left:${(65+x*90)/760*100}%;top:${(65+y*75)/440*100}%" aria-label="Mirror ${i+1}, rotate 90 degrees"><span></span><small>${i+1}</small></button>`).join('')}</div><div class="signal-controls"><p id="signal-status" role="status">Find a path through every mirror.</p><div class="button-row">${expButton('signal-hint', 'Align one mirror')}${expButton('signal-next', 'Next route ↗', false, 'id="signal-next" hidden')}</div></div><p class="route-achievement" id="route-achievement"></p><p class="signal-journey" id="signal-journey"></p></section>
      <form id="cosmic-letter-form" class="instrument-panel"><p class="eyebrow">YOUR MESSAGE, IN PHOTONS</p><label class="field-label" for="letter-text">What’s on your mind?</label><textarea id="letter-text" class="exp-input" maxlength="280" required placeholder="Dear Moon, things got weird down here.">${esc(letterDraft.text)}</textarea><label class="field-label" for="letter-destination">Destination</label><select id="letter-destination" class="exp-select">${Object.entries(destinations).map(([id,d]) => `<option value="${id}" ${id === letterDraft.destination ? 'selected' : ''}>${d.name} · ${duration(d.seconds)} by light</option>`).join('')}</select><label class="field-label" for="letter-speed">Journey speed</label><select id="letter-speed" class="exp-select">${[['3600','Cosmic express · 3,600×'],['60','Take the scenic route · 60×'],['1','Actual light-travel time · 1×']].map(([value,label]) => `<option value="${value}" ${value === letterDraft.speed ? 'selected' : ''}>${label}</option>`).join('')}</select><p class="delivery-estimate" id="delivery-estimate" role="status">Arrival in ${duration(Math.max(2.5, destination.seconds / Number(letterDraft.speed)))} · ${destination.distance}</p><button class="button button-primary" id="send-light" type="submit" disabled>Send this thought ↗</button><p class="tiny-note">Connect every mirror to send your message. Four routes to master; each awards a discovery. Your words stay in this browser.</p></form></div>
      <section class="letter-outbox"><p id="letters-status" class="sr-only" role="status"></p><div class="section-heading"><h2>Thoughts in transit.</h2><span>${voyage.letters.length} SENT</span></div><div class="outbox-grid">${voyage.letters.length ? voyage.letters.map(l => `<article class="letter-card" data-letter="${esc(l.id)}"><span class="letter-stamp">✦</span><p class="eyebrow">TO ${destinations[l.destination].name.toUpperCase()}</p><p class="letter-message">“${esc(l.text)}”</p><div class="delivery-track"><i></i></div><span class="delivery-state"></span>${expButton('claim-letter', l.claimed ? 'Download postcard ↗' : 'Open arrival postcard ↗', false, `data-id="${esc(l.id)}" hidden`)}</article>`).join('') : '<p class="empty-inline">Nothing in the post. Yet.</p>'}</div></section></div>`;
  }

  function signalPath() {
    const route = signalRoutes[signalRoute], mirrors = route.mirrors;
    let [x,y] = route.start, dx = 1, dy = 0, hits = new Set(); const points = [[x,y]];
    for (let step = 0; step < 50; step++) {
      x += dx; y += dy; points.push([x,y]);
      if (x === route.end[0] && y === route.end[1]) return { points, solved: hits.size === mirrors.length, hits: hits.size };
      if (x < 0 || x > 7 || y < 0 || y > 4) break;
      const index = mirrors.findIndex(([mx,my]) => mx === x && my === y);
      if (index >= 0) { if (hits.has(index)) break; hits.add(index); [dx,dy] = signalMirrors[index] ? [-dy,-dx] : [dy,dx]; }
    }
    return { points, solved: false, hits: hits.size };
  }
  function selectSignalRoute(index) {
    signalRoute = index % signalRoutes.length; signalTurns = 0; signalHints = 0; signalSolved = false;
    signalMirrors = signalRoutes[signalRoute].solution.map((value, i) => (i + signalRoute) % 3 ? !value : value);
    redraw();
  }
  function updateSignal() {
    const path = signalPath(), route = signalRoutes[signalRoute];
    signalSolved = path.solved;
    $$('.signal-mirror').forEach((button,i) => { button.style.setProperty('--mirror-angle', signalMirrors[i] ? '-45deg' : '45deg'); button.setAttribute('aria-label', `Mirror ${i+1}, ${signalMirrors[i] ? 'slash' : 'backslash'}. Activate to rotate.`); });
    $('#signal-status').textContent = signalSolved ? 'Connection made. Your thought is cleared for takeoff.' : `${path.hits} / ${route.mirrors.length} mirrors reached. Follow the beam; turn the mirror where it goes astray.`;
    $('#signal-turns').textContent = `${signalTurns} TURNS · ${route.mirrors.length} MIRRORS`;
    $('#signal-next').hidden = !signalSolved;
    $('[data-exp="signal-hint"]').disabled = signalSolved;
    $('#route-achievement').textContent = signalSolved ? `${route.name} charted in ${signalTurns} turns${signalHints ? ` · ${signalHints} hints` : ' · without a hint'}. Try the next route.` : 'Every mirror must carry the light. No timer — experiment.';
    $('#send-light').disabled = !signalSolved;
    $('.signal-stage').classList.toggle('connected', signalSolved);
    if (signalSolved) unlock('signal:route-' + signalRoute, route.name + ' · light route charted');
  }
  function mountSignal() {
    const canvas = $('#signal-canvas'), ctx = canvas.getContext('2d'); let raf, last = 0, clock = 0, idleAcc = 0;
    updateSignal();
    function tick(now) {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      idleAcc += dt;
      if (!document.hidden && idleAcc >= 1 / 30) {
        if (!motionQuery.matches) clock += idleAcc;
        idleAcc = 0;
        const dpr = Math.min(devicePixelRatio || 1, 2); if (canvas.width !== 760 * dpr) { canvas.width = 760 * dpr; canvas.height = 440 * dpr; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#1d1a30'; ctx.fillRect(0,0,760,440);
        for (let x = 0; x < 8; x++) for (let y = 0; y < 5; y++) { ctx.fillStyle = '#c9b5ec25'; ctx.beginPath(); ctx.arc(65+x*90,65+y*75,2,0,Math.PI*2); ctx.fill(); }
        const { points, solved } = signalPath(), pixel = ([x,y]) => [65+x*90,65+y*75];
        ctx.strokeStyle = solved ? '#edf19b' : '#f5a08c'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); points.map(pixel).forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
        ctx.setLineDash([5,18]); ctx.lineDashOffset = -clock * 60; ctx.strokeStyle = '#fff7d9'; ctx.lineWidth = 5; ctx.stroke(); ctx.setLineDash([]);
        const route = signalRoutes[signalRoute], start = pixel(route.start), end = pixel(route.end);
        window.AetherArt.orb(ctx,...start,24,4,false);
        const dest = letterDraft.destination, tier = { moon:0,sun:9,mars:3,neptune:5 }[dest];
        window.AetherArt.orb(ctx,...end,29,tier,true,0,1,clock);
        ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center'; ctx.fillStyle = '#bdb0d1'; ctx.fillText('EARTH',start[0],start[1]+51); ctx.fillText(dest.toUpperCase(),end[0],end[1]+51);
        const letter = voyage.letters[0];
        if (letter && solved && letter.destination === dest) {
          const progress = clamp((Date.now()-letter.sent)/(letter.arrival-letter.sent),0,1);
          const lengths = points.slice(1).map((p,i) => Math.hypot((p[0]-points[i][0])*90,(p[1]-points[i][1])*75));
          let distance = lengths.reduce((a,b)=>a+b,0) * progress, at = pixel(points[0]);
          for (let i=0;i<lengths.length;i++) { if (distance <= lengths[i]) { const a = pixel(points[i]), b = pixel(points[i+1]), t = distance/lengths[i]; at = [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]; break; } distance -= lengths[i]; at = pixel(points[i+1]); }
          if (progress < 1) { window.AetherArt.star(ctx,...at,15,'#fff3c9',5,clock); $('#signal-journey').textContent = `Your message is ${Math.round(progress*100)}% of the way to ${destinations[letter.destination].name}.`; }
          else { $('#signal-journey').textContent = `Arrived at ${destinations[letter.destination].name}. There’s a postcard below.`; if (Date.now()-letter.arrival < 2400 && !motionQuery.matches) { ctx.strokeStyle='#edf19b'; ctx.globalAlpha=1-(Date.now()-letter.arrival)/2400; ctx.beginPath(); ctx.arc(...end,35+(Date.now()-letter.arrival)/35,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1; } }
        } else if ($('#signal-journey').textContent) $('#signal-journey').textContent = '';
      }
      raf = document.hidden ? 0 : requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick); cleanups.push(() => cancelAnimationFrame(raf));
    on(document, 'visibilitychange', () => { if (!document.hidden && !raf) { last = 0; raf = requestAnimationFrame(tick); } });
  }

  function mysteryProgress() {
    // Progress rides on permanent discovery stamps, so a full cabinet can never regress.
    return ['capture:saturn', 'develop:first', 'history:galileo', 'letter:first', 'mystery:solved'].map(id => voyage.discoveries.includes(id));
  }
  function renderMystery() {
    const done = mysteryProgress();
    const chapters = [
      ['The ringed signature', 'The keeper’s first letter', '“If you are reading this, the dome is yours. Start with the ringed world. I left a little of myself in its light.”', 'Capture Saturn through the telescope.', 'telescope', 'Open the dome', 'Scratched into the plate holder beside Saturn: the letter L.'],
      ['A photograph remembers', 'A note beneath the red lamp', '“Bring your light to the darkroom. What seems faint at first often holds the most extraordinary detail.”', 'Develop one of your glass plates.', 'darkroom', 'Enter the darkroom', 'On the back of your developed plate: the letter U.'],
      ['The night of four moons', 'An old page, dated 1610', '“Go back to the night Galileo stopped believing the obvious. Compare the little companions. Read what I wrote in the margin.”', 'Visit 1610 and identify the light that moved.', 'history', 'Visit a lost night', 'Under the 1610 observation, two letters are underlined: ME.'],
      ['Home is a direction', 'The envelope with no address', '“I have not disappeared. I am simply looking from somewhere else. Send a little light to any destination. Wait for it to arrive, then collect its postcard.”', 'Send a letter and collect its arrival postcard.', 'letters', 'Write to the universe', 'On the arrival seal, one last mark: the letter N.'],
      ['The light you brought', 'The final brass lock', '“Four moments of light. One word. The plate holder, the darkroom, the notebook, the seal — read them in order.”', 'Read the keeper’s marks in order: plate holder, plate back, notebook margin, arrival seal.', null, null, ''],
    ];
    return `<div class="experience mystery-page">${heading('THE MISSING ASTRONOMER · AN ORIGINAL FICTION', 'The keeper left<br><em>the lights on.</em>', 'Five letters. A trail through the observatory. A rather unexpected homecoming.', `<span class="mystery-count">${done.filter(Boolean).length} / 5<br><small>LETTERS OPENED</small></span>`)}<div class="mystery-letters">${chapters.map(([title, subtitle, copy, task, route, action, mark], i) => `<details class="mystery-letter ${done[i] ? 'solved' : ''}" ${i === Math.min(done.findIndex(v => !v) < 0 ? 4 : done.findIndex(v => !v), 4) ? 'open' : ''}><summary><span class="envelope-number">${done[i] ? '✓' : String(i + 1).padStart(2, '0')}</span><span><small>${subtitle}</small><strong>${title}</strong></span><span class="letter-lock">${i === 0 || done[i - 1] ? '✧' : 'SEALED'}</span></summary><div class="letter-interior">${i > 0 && !done[i - 1] && !done[i] ? '<p class="sealed-copy">The previous letter will show you how to open this one.</p>' : `<blockquote>${copy}</blockquote><p class="letter-task">${done[i] ? '✓ ' : ''}${task}</p>${done[i] && mark ? `<p class="mystery-fragment">${mark}</p>` : ''}${route ? roomLink(route, action) : done[4] ? '<div class="mystery-ending"><span>✦</span><h2>Welcome home, Keeper.</h2><p>The astronomer was never missing. They were leaving room for the next person to look up. The observatory is yours now.</p></div>' : done.slice(0, 4).every(Boolean) ? '<form id="mystery-answer-form"><label class="field-label" for="mystery-answer">The keeper’s word</label><div class="answer-row"><input id="mystery-answer" class="exp-input" maxlength="20" autocomplete="off" required placeholder="Five letters, written in light"><button class="button button-primary">Open the final letter</button></div><p id="mystery-answer-status" role="status"></p></form>' : '<p class="sealed-copy">The brass lock turns only when all four earlier letters have been understood. The observatory will show you the way.</p>'}`}</div></details>`).join('')}</div></div>`;
  }

  function cabinetItems() {
    const cards = [
      ...voyage.photos.filter(p => p.developed).map(p => ({ id: p.id, name: p.name || targets.find(t => t.id === p.target).name, type: 'plates', subtitle: 'A glass-plate observation', art: p.target, route: 'darkroom', data: p })),
      ...voyage.worlds.map(w => ({ id: w.id, name: w.name, type: 'worlds', subtitle: `${w.moons} moon${w.moons === 1 ? '' : 's'} · a world of your own`, art: 'world', route: 'worlds', data: w })),
      ...voyage.music.map(m => ({ id: m.id, name: m.name, type: 'music', subtitle: `${m.tempo} BPM · a celestial score`, art: 'music', route: 'orchestra', data: m })),
      ...voyage.letters.filter(l => l.claimed).map(l => ({ id: l.id, name: `A little light at ${destinations[l.destination].name}`, type: 'letters', subtitle: l.text, art: 'letter', route: 'letters', data: l })),
      ...Object.entries(voyage.best).filter(([, score]) => score > 0).map(([key, score]) => ({ id: 'score-' + key, name: `${!/:v[23]/.test(key) && key.startsWith('hop') ? 'Comet Hop' : games[key.split(':')[0]].title} · ${score}`, type: 'scores', subtitle: !key.includes(':v3') ? 'Earlier arcade · archived best' : key.includes(':relaxed') ? 'Easy orbit expedition best' : /:\d{4}-/.test(key) ? 'Daily expedition best' : 'Relic expedition best', art: 'saturn', route: 'arcade', data: { key, score } })),
    ];
    return cards.sort((a, b) => { const ai = voyage.order.indexOf(a.id), bi = voyage.order.indexOf(b.id); return (ai < 0 ? 1e6 : ai) - (bi < 0 ? 1e6 : bi); });
  }

  function renderCabinet() {
    const items = cabinetItems(), shown = items.filter(item => cabinetFilter === 'all' || item.type === cabinetFilter);
    const stamps = [['game:merge', 'World maker', 'orbit'], ['game:hop', 'Gravity surfer', 'meteor'], ['game:dash', 'Star catcher', 'sparkles'], ['game:breaker', 'Orbit breaker', 'moon'], ['relic:first', 'Relic finder', 'sparkles'], ['relic:synergy', 'Synergy seeker', 'orbit'], ['capture:saturn', 'First light', 'search'], ['develop:first', 'Light keeper', 'moon'], ['world:first', 'Planet dreamer', 'sun'], ['music:first', 'Sky composer', 'sound'], ['music:constellation', 'First constellation', 'sparkles'], ['music:all-worlds', 'Eight-world symphony', 'sound'], ['arcade:grand-chart', 'Four-corner chart', 'orbit'], ['arcade:full-chart', 'Field guide complete', 'bookmark'], ['music:observatory-chorus', 'Observatory chorus', 'sparkles'], ['history:galileo', 'Time traveller', 'calendar'], ['letter:first', 'Cosmic post', 'arrow-right'], ['sun:friend', 'Sun charmer', 'sparkles'], ['mystery:solved', 'The new keeper', 'bookmark']];
    return `<div class="experience">${heading('YOUR DISCOVERY CABINET', 'A universe<br><em>with your fingerprints.</em>', 'The worlds you made. The light you caught. The little victories worth keeping.', passport())}<section class="cabinet-passport"><div class="passport-medallion">Æ</div><div><p class="eyebrow">${esc(state.name).toUpperCase()} · OBSERVATORY PASSPORT</p><h2>${rank()}</h2><p>${voyage.discoveries.length} ${voyage.discoveries.length === 1 ? 'discovery' : 'discoveries'} · ${items.length} ${items.length === 1 ? 'keepsake' : 'keepsakes'} · saved on this device</p><div class="passport-progress"><i style="width:${Math.min(100, points() / 4)}%"></i></div></div><div class="theme-picker"><label for="observatory-theme">Dress your observatory</label><select id="observatory-theme" class="exp-select"><option value="forest" ${voyage.theme === 'forest' ? 'selected' : ''}>Old forest · original</option><option value="midnight" ${voyage.theme === 'midnight' ? 'selected' : ''}>Midnight blue</option><option value="rose" ${voyage.theme === 'rose' ? 'selected' : ''}>Rose & copper</option></select></div></section><div class="stamp-grid">${stamps.map(([id, name, symbol]) => `<div class="discovery-stamp ${voyage.discoveries.includes(id) ? 'earned' : ''}">${icon(symbol)}<span>${name}</span><small>${voyage.discoveries.includes(id) ? 'DISCOVERED' : 'AWAITING A STORY'}</small></div>`).join('')}</div><div class="cabinet-toolbar"><div class="mode-switch" role="group" aria-label="Cabinet drawer">${['all', 'plates', 'worlds', 'scores', 'music', 'letters'].map(filter => expButton('cabinet-filter', filter[0].toUpperCase() + filter.slice(1), false, `data-filter="${filter}" aria-pressed="${cabinetFilter === filter}"`)).join('')}</div><p>Drag to arrange · or use the arrow buttons</p></div><div class="keepsake-grid">${shown.length ? shown.map(item => `<article class="keepsake" draggable="true" data-keepsake="${esc(item.id)}"><div class="keepsake-image">${item.type === 'scores' ? gameArt(item.data.key.split(':')[0]) : art(item.art, item.data.hue, item.data)}<span>${item.type.toUpperCase()}</span></div><div class="keepsake-copy"><h3>${esc(item.name)}</h3><p>${esc(item.subtitle)}</p><div class="keepsake-actions">${expButton('open-keepsake', 'Revisit ' + icon('arrow-up-right'), false, `data-id="${esc(item.id)}"`)}<div>${expButton('move-keepsake', '←', false, `data-id="${esc(item.id)}" data-direction="-1" aria-label="Move ${esc(item.name)} earlier"`)}${expButton('move-keepsake', '→', false, `data-id="${esc(item.id)}" data-direction="1" aria-label="Move ${esc(item.name)} later"`)}</div></div></div></article>`).join('') : `<div class="cabinet-empty"><span>✧</span><h2>A drawer full of possibility.</h2><p>Play a round, develop a photograph, compose a melody, or make a world. Your discoveries will find a home here.</p>${roomLink('discover', 'Find your first wonder')}</div>`}</div></div>`;
  }

  function renderExpeditionArchive() {
    const total = Object.values(window.AetherArcade.relics || {}).flat().length;
    const finds = voyage.relics.filter(id => relicById(id));
    return `<section class="expedition-archive"><header><div><p class="eyebrow">THE EXPEDITION ARCHIVE</p><h2>Every run leaves a story.</h2></div><p>${finds.length} / ${total} relics discovered</p></header>${voyage.runs.length ? `<div class="expedition-archive-grid">${voyage.runs.slice(0, 4).map(run => `<article class="expedition-record"><small>${run.daily ? 'DAILY EXPEDITION' : 'FREE EXPEDITION'}</small><h3>${games[run.game].title}</h3><strong>${run.score.toLocaleString()} points</strong><p>${run.relics.map(id => relicById(id)?.name).filter(Boolean).map(esc).join(' · ') || 'An unassisted little adventure.'}</p></article>`).join('')}</div>` : `<p class="tiny-note">Finish an arcade run to leave an expedition record here. Your relic discoveries survive every retry.</p>${roomLink('arcade', 'Begin an expedition')}`}<details><summary>Open your relic field guide · ${finds.length} discoveries</summary><div class="archive-catalogue">${Object.keys(games).map(game => `<section><p class="section-label">${games[game].title.toUpperCase()}</p>${relicCatalogue(game)}</section>`).join('')}</div></details></section>`;
  }

  // Each room mounts only its own listeners, timers, and render loops.
  function unmount() {
    $('#relic-dialog')?.close();
    controller?.abort(); cleanups.forEach(fn => fn()); cleanups = [];
    gameHandle?.destroy(); gameHandle = null; stopMusic(); clearInterval(blinkTimer); blinkTimer = null;
    window.AetherAmbience?.duck(false);
    document.body.classList.remove('game-theatre');
    document.querySelector('.theatre-scrim')?.remove();
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth > 720) sidebar.inert = false;
    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.inert = false;
    document.querySelector('.page-footer')?.removeAttribute('inert');
    worldRenderer = null; plateDeveloping = false;
  }
  function mount(view) {
    controller = new AbortController();
    document.body.dataset.observatoryTheme = voyage.theme;
    on(main, 'click', handleClick); on(main, 'input', handleInput); on(main, 'change', handleChange); on(main, 'submit', handleSubmit);
    if (view === 'overview') mountOverview();
    if (view === 'arcade') mountArcade();
    if (view === 'telescope') mountTelescope();
    if (view === 'darkroom') mountDarkroom();
    if (view === 'worlds') { mountWorld(); updateWorldReadout(); }
    if (view === 'letters') { mountSignal(); updateLetters(); every(updateLetters, 250); }
    if (view === 'cabinet') { mountCabinetDrag(); mountPhotoThumbnails(); $('.stamp-grid')?.insertAdjacentHTML('afterend', renderExpeditionArchive()); }
    if (view === 'collection') $('.view-header-actions, .view-header')?.insertAdjacentHTML('beforeend', roomLink('cabinet', 'Your discovery cabinet'));
    if (view === 'history') $('.history-controls')?.insertAdjacentHTML('afterend', '<p class="history-feedback" id="history-feedback" role="status">Compare exposures A and B. Then select the light that changed.</p>');
    const roomCleanup = window.AetherRoomPlay?.mount(view, {
      root: main, signal: controller.signal, motion: motionQuery, esc, toast, unlock, save, voyage,
      getWorld: () => world, checkpointWorld: () => worldRenderer?.checkpoint(), updateWorld: updateWorldReadout,
      getPhoto: () => voyage.photos.find(photo => photo.id === currentPhoto), updatePlate,
      getTelescope: () => telescope, getMusic: () => music, updateMusicStories: refreshMusicStories,
    });
    if (typeof roomCleanup === 'function') cleanups.push(roomCleanup);
    on(document, 'visibilitychange', () => { if (document.hidden) { stopMusic(); stopBlink(); } });
    on(document, 'keydown', event => {
      if ($('#relic-dialog')?.open) return;
      if (event.key === 'Escape' && document.body.classList.contains('game-theatre')) $('[data-exp="game-theatre"]')?.click();
      if (event.key === 'Tab' && document.body.classList.contains('game-theatre')) {
        const controls = [...$('.game-cabinet').querySelectorAll('button:not(:disabled), canvas[tabindex]')].filter(el => el.getClientRects().length);
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
      }
    });
  }

  function mountOverview() {
    const hero = $('.playground-hero');
    const pointerQuery = matchMedia('(hover: hover) and (pointer: fine)');
    let parallaxFrame = 0;
    const resetParallax = () => {
      cancelAnimationFrame(parallaxFrame); parallaxFrame = 0;
      hero.style.removeProperty('--scene-x'); hero.style.removeProperty('--scene-y');
    };
    // One paint per pointer frame; no ambient animation loop or work off-screen.
    on(hero, 'pointermove', event => {
      if (motionQuery.matches || !pointerQuery.matches) return;
      const { left, top, width, height } = hero.getBoundingClientRect();
      const x = ((event.clientX - left) / width - .5) * 12;
      const y = ((event.clientY - top) / height - .5) * 10;
      cancelAnimationFrame(parallaxFrame);
      parallaxFrame = requestAnimationFrame(() => {
        hero.style.setProperty('--scene-x', `${x.toFixed(2)}px`);
        hero.style.setProperty('--scene-y', `${y.toFixed(2)}px`);
        parallaxFrame = 0;
      });
    });
    on(hero, 'pointerleave', resetParallax);
    on(motionQuery, 'change', resetParallax);
    on(document, 'visibilitychange', resetParallax);
    cleanups.push(resetParallax);
    const creations = cabinetItems().filter(item => ['worlds', 'music', 'plates'].includes(item.type)).slice(0, 4);
    if (creations.length) $('#home-keepsakes').innerHTML = `<div class="section-heading"><div><p class="eyebrow">YOU LEFT YOUR MARK</p><h2>A universe that’s becoming yours.</h2></div>${roomLink('cabinet', 'See everything ↗')}</div><div class="home-creations">${creations.map(item => `<button class="home-creation" data-exp="open-keepsake" data-id="${esc(item.id)}">${item.type === 'plates' ? photoThumbnail(item.data) : art(item.art, item.data.hue, item.data)}<strong>${esc(item.name)}</strong><small>${item.type.toUpperCase()}</small></button>`).join('')}</div>`;
    else $('#home-keepsakes').hidden = true;
    mountPhotoThumbnails();
    let pokes = 0;
    on($('.scene-sun'), 'click', () => {
      pokes++;
      $('#sun-reaction').textContent = ['Hey! I’m working here.', 'That tickles. In a nuclear way.', 'You have excellent taste in stars.', 'Okay. You’re my favourite human.'][Math.min(3, pokes - 1)];
      $('.scene-sun').classList.remove('poked'); void $('.scene-sun').offsetWidth; $('.scene-sun').classList.add('poked');
      if (pokes === 4) unlock('sun:friend', 'You made friends with a star');
    });
  }

  function mountArcade() {
    lastGamePhase = null;
    let displayedScore = -1, queueKey = '', offerKey = '', buildKey = '', synergyKey = '', pickupKey = '', incomingKey = '';
    let bestBefore = 0, recapCounted = false;
    forecastOffered = false;
    const dialog = $('#relic-dialog');
    function closeDraft() {
      if (!dialog.open) return;
      dialog.close();
      if (!document.hidden) (lastGamePhase === 'paused' ? $('#game-start') : $('#arcade-canvas'))?.focus({ preventScroll: true });
    }
    on(dialog, 'cancel', event => {
      // Escape is a pause instinct, not a build choice. Keep the draft open.
      event.preventDefault();
      $('#game-status').textContent = 'The relic draft is still waiting. Choose a card, or keep your current build.';
    });
    on(dialog, 'keydown', event => {
      // Space is Planet Drop's drop key; it must never activate a card.
      if (event.key === ' ') { event.preventDefault(); return; }
      if (event.repeat || !['1', '2', '3'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault(); event.stopPropagation();
      const choice = $$('.relic-choice')[Number(event.key) - 1];
      if (choice) gameHandle?.applyRelic(choice.dataset.id);
    });
    on(dialog, 'keyup', event => { if (event.key === ' ') event.preventDefault(); });
    function updateBuild(data) {
      const owned = data.relics || [], ids = owned.map(relic => relic.id);
      const currentBuild = ids.join(',');
      if (currentBuild !== buildKey) {
        buildKey = currentBuild;
        $('#run-relics').innerHTML = owned.map(relic => `<button class="relic-chip" data-exp="inspect-relic" data-id="${esc(relic.id)}" title="${esc(relic.description)}"><span aria-hidden="true">${esc(relic.glyph)}</span>${esc(relic.name)}</button>`).join('');
        $('#build-state').textContent = owned.length ? `${owned.length} ${owned.length === 1 ? 'power' : 'powers'} working together` : 'A blank page. For now.';
        let newFind = false;
        owned.forEach(relic => { if (!voyage.relics.includes(relic.id)) { voyage.relics.push(relic.id); newFind = true; } });
        if (newFind) {
          save(); unlock('relic:first', 'The first page of your relic field guide');
          $('#relic-catalogue').innerHTML = relicCatalogue();
          $('#catalogue-count').textContent = `${relicPool().filter(relic => voyage.relics.includes(relic.id)).length} / ${relicPool().length}`;
        }
      }
      const synergies = data.synergies || [], currentSynergies = synergies.map(synergy => synergy.name).join(',');
      if (currentSynergies !== synergyKey) {
        synergyKey = currentSynergies;
        $('#run-synergies').innerHTML = synergies.map(synergy => `<div class="synergy-note"><strong>✦ ${esc(synergy.name)}</strong>${esc(synergy.description)}</div>`).join('');
        if (synergies.length) unlock('relic:synergy', 'Two curiosities. One extraordinary combination');
      }
      const progress = data.relicProgress;
      $('#relic-count').textContent = `${owned.length} / 4 relics`;
      if (progress) {
        const meter = $('#relic-progress');
        meter.max = Math.max(1, progress.target || 1);
        meter.value = clamp(progress.value, 0, meter.max);
        $('#relic-progress-label').textContent = progress.target > 0 ? `${Math.floor(progress.value)} / ${progress.target} ${progress.label} · next discovery` : 'Your expedition build is complete';
      }
      const offer = data.offer || [], nextOffer = offer.map(relic => relic.id).join(',');
      if (!nextOffer) { offerKey = ''; closeDraft(); return; }
      if (nextOffer === offerKey) return;
      offerKey = nextOffer;
      $('#relic-choices').innerHTML = offer.map((relic, i) => {
        const pairs = (window.AetherArcade.synergies?.[activeGame] || []).filter(synergy => synergy.ids.includes(relic.id));
        const pair = pairs.find(synergy => synergy.ids.some(id => id !== relic.id && ids.includes(id))) || pairs[0];
        const partner = pair && relicById(pair.ids.find(id => id !== relic.id));
        const ready = partner && ids.includes(partner.id);
        // Pairings stay mysterious until you have actually met the partner relic
        // in a previous expedition — the draft shouldn't narrate its own secrets.
        const hint = ready ? `Completes ${pair.name}` : partner ? (voyage.relics.includes(partner.id) ? `Pairs with ${partner.name}` : 'Pairs with a relic you have not met yet') : 'A new possibility for this expedition';
        return `<button class="relic-choice" data-exp="relic-pick" data-id="${esc(relic.id)}"><span class="relic-choice-number" aria-hidden="true">${i + 1}</span><span class="relic-choice-art" aria-hidden="true">${esc(relic.glyph)}</span><span class="relic-choice-tag">${esc(relic.tag)}</span><strong>${esc(relic.name)}</strong><span class="relic-choice-effect">${esc(relic.description)}</span><span class="relic-choice-pair ${ready ? 'ready' : ''}">${esc(hint)}</span></button>`;
      }).join('');
      if (!dialog.open) dialog.showModal();
      // Drafts are chaptered: Discovery I of IV, not a recurring popup.
      dialog.querySelector('.relic-dialog-heading .eyebrow').textContent = `DISCOVERY ${['I', 'II', 'III', 'IV'][owned.length] || 'I'} OF IV · SOMETHING EXTRAORDINARY, FOUND`;
      $('.relic-choice')?.focus({ preventScroll: true });
      $('#game-status').textContent = 'Relic discovered. Choose one of three powers. Your run is paused while you decide.';
    }
    // A daily course belongs to the day it was started on, even across midnight.
    let seed = 0;
    for (const char of challengeDate + activeGame) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
    gameHandle = window.AetherArcade.create($('#arcade-canvas'), {
      game: activeGame, seed: challenge ? seed : undefined, relaxed: relaxed && !challenge, expedition: activeGame === 'dash' && (challenge || expedition), best: voyage.best[gameKey()] || 0,
      onUpdate(data) {
        if (displayedScore !== data.score) {
          $('#game-score').textContent = data.score;
          if (displayedScore >= 0 && !motionQuery.matches) $('#game-score').animate([{ transform: 'scale(1.14)', color: '#edf19b' }, { transform: 'scale(1)' }], { duration: 220 });
          displayedScore = data.score;
        }
        $('#game-best').textContent = Math.max(voyage.best[gameKey()] || 0, data.score);
        $('#game-next').textContent = activeGame === 'merge' ? data.next : data.detail;
        if (activeGame === 'merge' && queueKey !== data.queue.join(',')) { queueKey = data.queue.join(','); $('#next-worlds').innerHTML = data.queue.map((tier, i) => `<span role="img" style="--orb:${window.AetherArcade.colours[tier]};--s:${24 - i * 3}px" title="${window.AetherArcade.names[tier]}" aria-label="Next ${i + 1}: ${window.AetherArcade.names[tier]}"></span>`).join(''); }
        if ($('#game-ability')) { $('#game-ability').disabled = data.suspended || data.phase !== 'running' || data.charge < 100; $('#ability-charge').textContent = data.charge >= 100 ? 'READY' : `${data.charge}%`; $('#ability-fill').style.width = `${data.charge}%`; }
        $('#game-pause').disabled = data.suspended || !['running', 'paused'].includes(data.phase);
        $('#game-pause').textContent = data.phase === 'paused' ? 'Resume' : 'Pause';
        const overlay = $('#game-overlay'); overlay.hidden = ['running', 'ending'].includes(data.phase);
        // Heart losses are game events, not decoration — announce them.
        if (activeGame !== 'merge' && data.lives !== undefined && data.lives < lastLives && data.phase === 'running' && data.lives > 0) {
          $('#game-status').textContent = `${data.lives} ${data.lives === 1 ? 'heart' : 'hearts'} left. Your relics stay with you.`;
        }
        if (data.lives !== undefined) lastLives = data.lives;
        if (data.phase !== lastGamePhase) {
          window.AetherAmbience?.duck(data.phase === 'running');
          if (data.phase === 'running' && lastGamePhase === 'ready') { bestBefore = voyage.best[gameKey()] || 0; recapCounted = false; }
          if (data.phase === 'paused') { $('#overlay-title').textContent = 'Space to breathe.'; $('#overlay-copy').textContent = 'Right where you left it. Ready when you are.'; $('#overlay-kicker').textContent = 'PAUSED'; $('#game-status').textContent = 'Game paused. Press P or Keep going to resume.'; const b = $('#game-start'); if (b) b.innerHTML = 'Keep going ' + icon('arrow-right'); }
          if (data.phase === 'over') {
            $('#overlay-title').textContent = 'One more orbit?';
            $('#overlay-copy').textContent = `${data.result} ${data.score.toLocaleString()} points${activeGame === 'merge' ? ' · largest world: ' + data.largest : ''}.`;
            $('#overlay-kicker').textContent = data.score > 0 && data.score >= (voyage.best[gameKey()] || 0) ? 'PERSONAL BEST. NICE.' : 'A VERY RESPECTABLE DISTRACTION'; { const b = $('#game-start'); if (b) b.innerHTML = 'Go again ' + icon('play'); }
            $('#game-status').textContent = `Round complete. ${data.score} points. Your best is ${voyage.best[gameKey()] || 0}.`;
            const recap = $('#run-recap'); recap.hidden = false;
            const relics = data.relics || [], synergies = data.synergies || [];
            const s = data.stats || {};
            const isBest = data.score > 0 && data.score > bestBefore;
            const headline = isBest ? 'A personal best, carefully noted.' : relics.length === 4 ? 'A complete build, beautifully odd.' : synergies.length ? synergies[0].name : relics.length ? 'A most curious combination.' : 'Every explorer starts somewhere.';
            const statTiles = activeGame === 'merge' ? [['MERGES', s.totalMerges || 0], ['LARGEST WORLD', data.largest], ['DROPS', data.drops || 0], ['TIME', `${Math.floor(s.simulationTime || 0)}s`]]
              : activeGame === 'hop' ? [['DISTANCE', `${(s.maxMetres || 0).toLocaleString()} m`], ['RINGS', s.ringsCaught || 0], ['SECTOR', data.level || 1], ['TIME', `${Math.floor(s.simulationTime || 0)}s`]]
              : activeGame === 'dash' ? [['STARS CAUGHT', s.totalCatches || 0], ['SURVIVED', `${Math.floor(s.simulationTime || 0)}s`], ['RELICS', relics.length + ' / 4'], ['TIME', `${Math.floor(s.simulationTime || 0)}s`]]
              : [['CRYSTALS', s.crystalHits || 0], ['WAVE', data.level || 1], ['COMETS', s.comets || 1], ['TIME', `${Math.floor(s.simulationTime || 0)}s`]];
            const total = Object.values(window.AetherArcade.relics || {}).flat().length;
            const found = voyage.relics.filter(id => relicById(id)).length;
            const hook = (window.AetherArcade.synergies?.[activeGame] || []).find(pair => !synergies.some(formed => formed.name === pair.name));
            const timeline = relics.map((relic, i) => s.draftTimes?.[i] !== undefined ? `${esc(relic.glyph)} ${esc(relic.name)} — found at ${Math.floor(s.draftTimes[i] / 60)}:${String(Math.floor(s.draftTimes[i] % 60)).padStart(2, '0')}` : `${esc(relic.glyph)} ${esc(relic.name)}`).join(' · ');
            recap.innerHTML = `<div class="recap-grid"><div class="recap-main"><p class="eyebrow">EXPEDITION NOTES${challenge ? ' · TODAY’S COURSE' : ''}</p><h3>${esc(headline)}</h3><div class="recap-score" id="recap-score" data-score="${data.score}">0</div><p class="recap-delta">${isBest ? `A personal best — +${(data.score - bestBefore).toLocaleString()} over your previous finest.` : `Your finest remains ${(voyage.best[gameKey()] || 0).toLocaleString()}.`}</p><div class="recap-tiles">${statTiles.map(([label, value]) => `<div class="recap-tile"><small>${label}</small><strong>${esc(String(value))}</strong></div>`).join('')}</div></div><div class="recap-side">${synergies.length ? synergies.map(synergy => `<div class="synergy-note"><strong>✦ ${esc(synergy.name)}</strong>${esc(synergy.description)}</div>`).join('') : ''}${relics.length ? `<div class="run-relics">${relics.map(relic => `<span class="relic-chip"><span aria-hidden="true">${esc(relic.glyph)}</span>${esc(relic.name)}</span>`).join('')}</div><p class="recap-timeline">${timeline}</p>` : ''}<p class="recap-standing">${found} of ${total} relics catalogued · ${total - found} still strangers.</p><p class="recap-hook">${hook ? `Rumour has it: <em>${esc(hook.name)}</em> awaits.` : 'Every pairing of this corner of the sky, discovered.'}</p><button class="button button-primary" data-exp="game-start">Go again ${icon('play')}</button></div></div>`;
            // The score counts itself up — theatre for the number you earned.
            const scoreEl = $('#recap-score');
            if (scoreEl) {
              if (motionQuery.matches || recapCounted) scoreEl.textContent = data.score.toLocaleString();
              else {
                recapCounted = true;
                const started = performance.now();
                const countUp = now => {
                  const t = Math.min(1, (now - started) / 700);
                  scoreEl.textContent = Math.round(data.score * (1 - (1 - t) ** 3)).toLocaleString();
                  if (t < 1 && scoreEl.isConnected) requestAnimationFrame(countUp);
                };
                requestAnimationFrame(countUp);
              }
            }
          }
          if (data.phase === 'ready') { $('#run-recap').hidden = true; $('#overlay-title').textContent = games[activeGame].title; $('#overlay-copy').textContent = games[activeGame].instruction; { const b = $('#game-start'); if (b) b.innerHTML = 'Let’s play ' + icon('play'); } pickupKey = ''; incomingKey = ''; }
          if (data.phase === 'running') {
            $('#game-status').textContent = lastGamePhase === 'paused' ? 'Resumed. Back to it.' : 'Game started. Press P to pause.';
            if (lastGamePhase !== 'paused') lastLives = 3;
          }
          lastGamePhase = data.phase;
        }
        // Power-up announcements: acquired, replaced, expired — never stale.
        if (activeGame === 'dash') {
          const activeId = data.pickup?.id || '';
          if (activeId !== pickupKey) {
            if (data.pickup) $('#game-status').textContent = `${data.pickup.name} active — ${data.pickup.id === 'lodestone-bloom' ? 'stars lean into your boat' : 'the sky falls gently'} for ${Math.ceil(data.pickup.remaining)} seconds.`;
            else if (pickupKey === 'lodestone-bloom') $('#game-status').textContent = 'The bloom closes. The stars go their own way.';
            else if (pickupKey) $('#game-status').textContent = 'The moth flies on. Full speed again.';
            pickupKey = activeId;
          }
          const incomingId = data.incoming?.id || '';
          if (incomingId !== incomingKey) { incomingKey = incomingId; if (data.incoming) $('#game-status').textContent = `${data.incoming.name} incoming — catch it before it drifts by.`; }
        }
        // Pact controls never depend on colour alone and remain operable by C.
        if ($('#game-pact')) {
          const pact = data.pact || {};
          $('#game-pact').disabled = !pact.ready;
          $('#game-pact').textContent = pact.active ? `✦ STELLAR PACT · ${pact.seconds}s LEFT` : pact.used ? '✦ STELLAR PACT · SPENT' : pact.ready ? '✦ INVOKE STELLAR PACT · ×2' : '✦ STELLAR PACT · ×2 SCORE';
          $('#game-pact-status').textContent = pact.active ? 'Double points. Dodge carefully: shields cannot save a failed pact.' : pact.failed ? 'Broken by a hit. Try again on the next run.' : pact.used ? 'Wager complete. A new pact awaits next run.' : pact.ready ? 'Ready: press C or activate this button. Double points for 12 seconds.' : 'Earn this wager by playing. Press C when ready. A hit breaks the pact.';
        }
        updateArcadeFieldwork(data);
        updateBuild(data);
      },
      onFinish({ score, largest, relics = [] }) {
        lastGameScore = score;
        if (score > (voyage.best[gameKey()] || 0)) voyage.best[gameKey()] = score;
        voyage.runs.unshift({ game: activeGame, score, date: new Date().toISOString(), daily: challenge, relics: relics.map(relic => relic.id) });
        voyage.runs = voyage.runs.slice(0, 12); save();
        if (score > 0) unlock('game:' + activeGame, games[activeGame].title + ' · arcade stamp earned');
        if (activeGame === 'merge' && largest >= 6) unlock('game:saturn', 'A ringed world, made by you');
        if (activeGame === 'hop' && score >= 300) unlock('game:pilot', 'A natural-born gravity surfer');
        if (activeGame === 'dash' && score >= 500) unlock('game:catcher', 'Five hundred points of starlight');
        if (activeGame === 'breaker' && score >= 750) unlock('game:breaker', 'A constellation, thoroughly shattered');
      },
    });
    gameHandle.setSound(voyage.sound);
  }

  function mountTelescope() {
    const canvas = $('#scope-canvas'), ctx = canvas.getContext('2d');
    let dragging = false, previous, raf, closest, scopePointer = null, clock = 0, last = 0, travel = null;
    let lastAnnounced = '';
    function announceReadiness() {
      const status = $('#scope-status'); if (!status) return;
      const ready = closest && closest.sharpness >= 80;
      const message = ready ? `${closest.name} is in crisp focus. Capture is ready.` : closest ? `${closest.name} centred. Adjust focus to sharpen.` : '';
      if (message !== lastAnnounced) { status.textContent = message; lastAnnounced = message; }
    }
    function draw() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== 760 * dpr) { canvas.width = 760 * dpr; canvas.height = 500 * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      window.AetherArt.sky(ctx, { ...telescope, labels: voyage.mode === 'guide' }, 760, 500, clock);
      const position = t => ({ x: 380 + (t.x - telescope.x) * telescope.zoom, y: 250 + (t.y - telescope.y) * telescope.zoom });
      closest = null;
      targets.forEach(t => {
        const p = position(t), distance = Math.hypot(p.x - 380, p.y - 250);
        const sharpness = Math.max(0, 100 - Math.abs(telescope.focus - t.focus) * 4);
        if (distance < 65 && (!closest || distance < closest.distance)) closest = { ...t, distance, sharpness };
      });
      $('#scope-coordinates').textContent = `${Math.round(telescope.x)} / ${Math.round(telescope.y)}`;
      $('#scope-target').textContent = closest ? closest.name + ' · in your sights' : 'Sweep the sky to find a wonder';
      $('#scope-sharpness').textContent = `${closest?.sharpness || 0}% sharpness`;
      $('#focus-fill').style.width = `${closest?.sharpness || 0}%`;
      $('#scope-capture').disabled = !telescope.open || !closest || closest.sharpness < 80;
      $('.scope-reticle').classList.toggle('in-focus', Boolean(closest && closest.sharpness >= 80));
      if (telescope.open) announceReadiness();
    }
    const queue = () => draw();
    on(canvas, 'pointerdown', e => { if (!telescope.open || scopePointer !== null) return; travel = null; dragging = true; scopePointer = e.pointerId; previous = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true }); });
    on(canvas, 'pointermove', e => { if (!dragging || e.pointerId !== scopePointer) return; const bounds = canvas.getBoundingClientRect(); telescope.x = clamp(telescope.x - (e.clientX - previous.x) * 760 / bounds.width / telescope.zoom, 0, 1600); telescope.y = clamp(telescope.y - (e.clientY - previous.y) * 500 / bounds.height / telescope.zoom, 0, 900); previous = { x: e.clientX, y: e.clientY }; queue(); });
    const releaseScope = e => { if (e.pointerId === scopePointer) { dragging = false; scopePointer = null; } };
    on(canvas, 'pointerup', releaseScope); on(canvas, 'pointercancel', releaseScope);
    on(canvas, 'keydown', e => { if (!telescope.open || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(e.key)) return; e.preventDefault(); travel = null; telescope.x = clamp(telescope.x + (e.key === 'ArrowRight' ? 20 : e.key === 'ArrowLeft' ? -20 : 0), 0, 1600); telescope.y = clamp(telescope.y + (e.key === 'ArrowDown' ? 20 : e.key === 'ArrowUp' ? -20 : 0), 0, 900); if (['+', '-', '='].includes(e.key)) { telescope.zoom = Math.round(clamp(telescope.zoom + (e.key === '-' ? -.1 : .1), .6, 3) * 10) / 10; $('#scope-zoom').value = telescope.zoom; $('#scope-zoom-value').textContent = telescope.zoom + '×'; } queue(); });
    on(main, 'input', e => { if (e.target.id === 'scope-focus') { telescope.focus = Number(e.target.value); queue(); } if (e.target.id === 'scope-zoom') { telescope.zoom = Number(e.target.value); queue(); } });
    on(main, 'click', e => {
      const button = e.target.closest('[data-exp]'); if (!button) return;
      if (button.dataset.exp === 'open-dome') { telescope.open = true; $('#telescope-stage').classList.add('dome-open'); $('.dome-intro').hidden = true; canvas.focus({ preventScroll: true }); draw(); wake(); }
      if (['scope-guide', 'scope-target'].includes(button.dataset.exp)) {
        if (button.dataset.id) { telescope.target = button.dataset.id; $('#scope-select').value = telescope.target; }
        const target = targets.find(t => t.id === telescope.target);
        if (voyage.mode !== 'astronomer') {
          if (motionQuery.matches) { telescope.x = target.x; telescope.y = target.y; }
          else travel = { x: target.x, y: target.y };
        }
        telescope.open = true;
        $('#telescope-stage').classList.add('dome-open'); $('.dome-intro').hidden = true; draw(); wake();
        $('#scope-hint').textContent = voyage.mode === 'guide' ? `${target.name} is centred. Try focus around ${target.focus} to bring it into view.` : `Target coordinates: ${target.x} / ${target.y}. Adjust focus for a crisp portrait.`;
        $('#scope-focus').focus({ preventScroll: true });
      }
      if (button.dataset.exp === 'scope-capture') {
        draw(); // Recompute the centred target now — slider input only queues a frame.
        if (!telescope.open || !closest || closest.sharpness < 80) return;
        if (voyage.photos.length >= 60) return toast('Your plate cabinet is full. Your existing photographs are safe in the darkroom.');
        const photo = { id: uid(), target: closest.id, developed: false, exposure: 60, clarity: 65, warmth: 25, date: dateKey(new Date()), name: closest.name, frame: { x: telescope.x, y: telescope.y, zoom: telescope.zoom, focus: telescope.focus, time: clock, version: 2 } };
        voyage.photos.unshift(photo); currentPhoto = photo.id; save(); unlock('capture:' + closest.id, 'First light · ' + closest.name);
        $('#telescope-stage').classList.remove('shutter-flash'); void canvas.offsetWidth; $('#telescope-stage').classList.add('shutter-flash');
        toast(`${closest.name}, captured. Same framing. Same moment. Yours.`);
        $('#scope-hint').innerHTML = `<a href="#darkroom">Develop your ${esc(closest.name)} photograph →</a>${closest.id === 'saturn' ? '<br>Scratched into the plate holder: <strong>L</strong>.' : ''}`;
                const option = $(`#scope-select option[value="${closest.id}"]`); if (option && !option.textContent.includes('captured')) option.textContent += ' · captured';
        $$('.target-chip').forEach(chip => { if (chip.dataset.id === closest.id) { chip.classList.add('discovered'); $('small', chip).textContent = '✓ CAPTURED'; } });
      }
    });
    // The sky only needs frames while the dome is open and the tab is visible.
    const wake = () => { if (!raf && telescope.open && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } };
    function tick(now) {
      if (document.hidden || !telescope.open) { raf = 0; return; }
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (!motionQuery.matches) clock += dt;
      if (travel) { const k = 1 - Math.exp(-dt * 6); telescope.x += (travel.x - telescope.x) * k; telescope.y += (travel.y - telescope.y) * k; if (Math.hypot(travel.x - telescope.x, travel.y - telescope.y) < .3) { telescope.x = travel.x; telescope.y = travel.y; travel = null; } }
      draw();
      raf = requestAnimationFrame(tick);
    }
    draw(); raf = requestAnimationFrame(tick); cleanups.push(() => cancelAnimationFrame(raf));
    on(document, 'visibilitychange', wake);
  }

  const photoFilter = photo => `brightness(${.3 + photo.exposure / 75}) contrast(${.6 + photo.clarity / 80}) sepia(${photo.warmth / 200}) saturate(${.5 + photo.clarity / 80})`;
  function photoFrame(photo) {
    const target = targets.find(t => t.id === photo.target);
    return photo.frame || { x: target.x, y: target.y, zoom: 2, focus: target.focus, time: 0 };
  }
  function photoThumbnail(photo) {
    // Half-scale canvases keep a full cabinet light; CSS stretches them to fit.
    return `<canvas class="photo-thumbnail" data-photo="${esc(photo.id)}" width="380" height="250" role="img" aria-label="${esc(photo.name)}"></canvas>`;
  }
  function mountPhotoThumbnails() {
    voyage.photos.filter(p => p.developed).forEach(p => {
      const image = $(`[data-keepsake="${CSS.escape(p.id)}"] .keepsake-image`);
      if (image) image.innerHTML = photoThumbnail(p) + '<span>PHOTOGRAPH</span>';
    });
    $$('canvas[data-photo]').forEach(canvas => { const photo = voyage.photos.find(p => p.id === canvas.dataset.photo); if (!photo) return; const frame = photoFrame(photo); const ctx = canvas.getContext('2d'); ctx.setTransform(canvas.width / 760, 0, 0, canvas.height / 500, 0, 0); window.AetherArt.sky(ctx, frame, 760, 500, frame.time); canvas.style.filter = photoFilter(photo); });
  }
  function updatePlate() {
    const photo = voyage.photos.find(p => p.id === currentPhoto); if (!photo || !$('#plate-image')) return;
    $('#plate-image').style.filter = photoFilter(photo);
    $('#plate-image').style.opacity = photo.developed ? 1 : .08 + plateProgress * .92;
    const frame = photoFrame(photo), ctx = $('#plate-canvas').getContext('2d');
    window.AetherArt.sky(ctx, frame, 760, 500, frame.time);
    const name = $('#plate-name'); if (name) $('.plate-caption h2').textContent = name.value;
  }

  function mountDarkroom() {
    if (!$('#plate-canvas')) return;
    plateProgress = 0; updatePlate();
    const handle = $('#plate-handle'); let pointer = null, startY = 0, moved = false;
    on(handle, 'pointerdown', e => { if (plateDeveloping) return; pointer = e.pointerId; startY = e.clientY; moved = false; handle.setPointerCapture(e.pointerId); });
    on(handle, 'pointermove', e => { if (e.pointerId !== pointer) return; const travel = clamp(e.clientY - startY, 0, 120); moved ||= travel > 5; $('#glass-plate').style.transform = `translateY(${travel * .35}px) rotate(${2 - travel / 30}deg)`; if (travel > 70) { pointer = null; developPlate(); } });
    on(handle, 'pointerup', e => { if (e.pointerId !== pointer) return; pointer = null; $('#glass-plate').style.transform = ''; if (moved) developPlate(); });
    on(handle, 'pointercancel', () => { pointer = null; $('#glass-plate').style.transform = ''; });
    on(handle, 'click', () => { if (!moved) developPlate(); });
  }
  function developPlate() {
    const photo = voyage.photos.find(p => p.id === currentPhoto); if (!photo || plateDeveloping) return;
    photo.name = $('#plate-name').value.trim() || targets.find(t => t.id === photo.target).name;
    if (photo.developed) { if (save()) { updatePlate(); $('#development-status').textContent = 'Finish saved. Ready to print.'; toast('Your finish is saved.'); } return; }
    plateDeveloping = true; $('#develop-plate').disabled = true; $('#plate-select').disabled = true;
    $('.darkroom-stage').classList.add('is-developing'); $('#development-status').textContent = 'Developing… the light is coming through.';
    let raf, last = 0;
    function tick(now) {
      const dt = last ? Math.min(.08, (now - last) / 1000) : 0; last = now;
      if (!document.hidden) plateProgress = Math.min(1, plateProgress + dt / (motionQuery.matches ? .3 : 2.6));
      updatePlate(); $('.developer-liquid').style.setProperty('--development', plateProgress);
      if (plateProgress < 1) { raf = document.hidden ? 0 : requestAnimationFrame(tick); return; }
      photo.developed = true; plateDeveloping = false; const kept = save();
      $('.darkroom-stage').classList.remove('is-developing'); $('#glass-plate').classList.add('developed'); $('#glass-plate').style.transform = '';
      $('#develop-plate').disabled = false; $('#plate-select').disabled = false; $('#develop-plate').textContent = 'Save this finish';
      $('#development-status').textContent = kept ? 'Developed. On the back of the plate: U. A clue for the missing astronomer?' : 'Developed for this visit — storage is full, so it cannot be kept.';
      if (kept) { unlock('develop:first', 'Your first developed photograph'); unlock('develop:' + photo.target, 'Light, developed · ' + targets.find(t => t.id === photo.target).name); }
    }
    raf = requestAnimationFrame(tick); cleanups.push(() => cancelAnimationFrame(raf));
    on(document, 'visibilitychange', () => { if (!document.hidden && plateDeveloping && !raf) { last = 0; raf = requestAnimationFrame(tick); } });
  }

  function updateWorldReadout() {
    if (!$('#world-gravity')) return;
    $('#world-gravity').textContent = `${(world.mass / world.size ** 2).toFixed(2)}g at the surface`;
    $('#world-day').textContent = `${world.speed}-hour days`; $('#world-moon-count').textContent = `${world.moons} moon${world.moons === 1 ? '' : 's'}`;
    $('#world-title').textContent = world.name || 'An unnamed little world';
  }

  function mountWorld() {
    const canvas = $('#world-canvas'), ctx = canvas.getContext('2d');
    let raf, last = 0, clock = 0, pointer = null, lastMark = null, brushPoint = { x: 380, y: 245 }, showBrush = false;
    const undo = []; world.marks ||= [];
    const geometry = () => ({ cx: 380, cy: 245, r: 90 + world.size * 30, tilt: world.tilt * Math.PI / 180 });
    function paint(force = false) {
      const { cx, cy, r, tilt } = geometry(), dx = (brushPoint.x - cx) / r, dy = (brushPoint.y - cy) / r;
      if (Math.hypot(dx, dy) > .97 || world.marks.length >= 250) return;
      if (!force && lastMark && Math.hypot(brushPoint.x - lastMark.x, brushPoint.y - lastMark.y) < 11) return;
      world.marks.push({ x: dx * Math.cos(tilt) + dy * Math.sin(tilt), y: -dx * Math.sin(tilt) + dy * Math.cos(tilt), r: worldBrush === 'storm' ? .18 : worldBrush === 'crater' ? .09 : .13, type: worldBrush });
      lastMark = { ...brushPoint }; $('#world-brush-status').textContent = `${world.marks.length} marks on a world that didn’t exist a moment ago.`;
    }
    function point(e) { const box = canvas.getBoundingClientRect(); brushPoint = { x: (e.clientX - box.left) / box.width * 760, y: (e.clientY - box.top) / box.height * 500 }; }
    on(canvas, 'pointerdown', e => { if (pointer !== null) return; e.preventDefault(); pointer = e.pointerId; canvas.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true }); undo.push(structuredClone(world.marks)); lastMark = null; showBrush = true; point(e); paint(true); });
    on(canvas, 'pointermove', e => { if (pointer !== null && pointer !== e.pointerId) return; point(e); showBrush = true; if (pointer !== null) paint(); });
    const release = e => { if (pointer === e.pointerId) { pointer = null; lastMark = null; } };
    on(canvas, 'pointerup', release); on(canvas, 'pointercancel', release);
    on(canvas, 'pointerleave', () => { if (pointer === null) showBrush = false; });
    on(canvas, 'keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) return;
      e.preventDefault(); showBrush = true;
      brushPoint.x = clamp(brushPoint.x + (e.key === 'ArrowRight' ? 12 : e.key === 'ArrowLeft' ? -12 : 0), 200, 560);
      brushPoint.y = clamp(brushPoint.y + (e.key === 'ArrowDown' ? 12 : e.key === 'ArrowUp' ? -12 : 0), 70, 420);
      if ([' ', 'Enter'].includes(e.key) && !e.repeat) { undo.push(structuredClone(world.marks)); paint(true); }
    });
    worldRenderer = { checkpoint() { undo.push(structuredClone(world.marks)); if (undo.length > 50) undo.shift(); }, undo() { if (undo.length) world.marks = undo.pop(); else world.marks.pop(); }, clear() { undo.push(structuredClone(world.marks)); world.marks = []; } };
    let idleAcc = 0;
    function tick(now) {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (!document.hidden) {
        if (!motionQuery.matches) clock += dt;
        idleAcc += dt;
        // Painting stays 60 fps; an untouched world idles at 30.
        if (pointer !== null || idleAcc >= 1 / 30) {
          idleAcc = 0;
          const dpr = Math.min(devicePixelRatio || 1, 2); if (canvas.width !== 760 * dpr) { canvas.width = 760 * dpr; canvas.height = 500 * dpr; }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0); window.AetherArt.world(ctx, world, clock);
          if (showBrush) { ctx.strokeStyle = '#f5edcba8'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(brushPoint.x, brushPoint.y, 15, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        }
      }
      raf = document.hidden ? 0 : requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick); cleanups.push(() => cancelAnimationFrame(raf));
    on(document, 'visibilitychange', () => { if (!document.hidden && !raf) { last = 0; raf = requestAnimationFrame(tick); } });
  }

  function stopMusic() {
    if (musicPlayer) { clearInterval(musicPlayer.timer); musicPlayer.audio.close().catch(() => {}); musicPlayer = null; }
    musicStep = -1; $$('.sequence-note').forEach(el => el.classList.remove('playing'));
    $('.orchestra-stage')?.classList.remove('is-playing');
    if ($('#music-play')) { $('#music-play').innerHTML = 'Play my universe ' + icon('play'); $('#music-play').setAttribute('aria-pressed', 'false'); $('#orchestra-status').textContent = 'Your orchestra is ready.'; }
  }

  async function playMusic() {
    if (musicPlayer) { stopMusic(); return; }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio unavailable');
      const audio = new Audio();
      const player = { audio, bus: studio.createBus(audio, music), timer: null, next: 0, step: 0, visuals: [] };
      musicPlayer = player;
      await audio.resume();
      if (musicPlayer !== player) { audio.close().catch(() => {}); return; }
      player.next = audio.currentTime + .06;
      const schedule = () => {
        if (document.hidden || musicPlayer !== player) return;
        studio.setSpace(player.bus, music.space, audio.currentTime);
        // The current editable sequence is consulted for every scheduled note.
        while (player.next < audio.currentTime + .14) {
          const step = player.step % studio.STEPS;
          const when = player.next + studio.swingOffset(music, step);
          music.notes.forEach((row, track) => { if (row[step]) studio.voice(audio, player.bus, track, when, music, step); });
          player.visuals.push({ step, when, tracks: music.notes.map((row, track) => row[step] && !music.mutes[track]) });
          player.next += studio.stepSeconds(music); player.step++;
        }
        while (player.visuals.length && player.visuals[0].when <= audio.currentTime) {
          const visual = player.visuals.shift(); musicStep = visual.step;
          $$('.sequence-note').forEach(el => el.classList.toggle('playing', Number(el.dataset.step) === musicStep));
          visual.tracks.forEach((active, track) => { const planet = $(`.orbit-${track} > span`); if (active && planet && !motionQuery.matches) planet.animate([{ transform: 'scale(1.5)', boxShadow: '0 0 32px 8px var(--note-colour)' }, { transform: 'scale(1)' }], { duration: 310 }); });
          $('.music-sun')?.classList.toggle('beat-on', musicStep % 4 === 0);
        }
      };
      schedule(); player.timer = setInterval(schedule, 25);
      $('#music-play').textContent = 'Stop the orchestra'; $('#music-play').setAttribute('aria-pressed', 'true');
      $('.orchestra-stage').classList.add('is-playing'); $('#orchestra-status').textContent = 'Eight worlds are turning. Change the notes as they play.';
    } catch { stopMusic(); toast('Sound is unavailable here. You can still compose and save your arrangement.'); }
  }

  async function exportMusic() {
    const button = $('[data-exp="music-export"]');
    if (button?.disabled) return;
    if (button) { button.disabled = true; button.textContent = 'Rendering your score…'; }
    try {
      const buffer = await studio.recording(music);
      downloadFile('aether-celestial-score.wav', buffer, 'audio/wav');
      toast('Your stereo orchestra recording is ready. Four full loops, including the echoes.');
    } catch { toast('This browser could not render an offline recording. Your score is still safe.'); }
    finally { if (button?.isConnected) { button.disabled = false; button.innerHTML = 'Download stereo WAV ' + icon('download'); } }
  }

  function stopBlink() {
    clearInterval(blinkTimer); blinkTimer = null;
    if ($('#history-blink')) { $('#history-blink').textContent = 'Blink between plates'; $('#history-blink').setAttribute('aria-pressed', 'false'); }
  }
  function flipPlate() {
    // Never swap the picture out from under a focused finder button.
    if ($('#history-picture')?.contains(document.activeElement)) return;
    historyPlate = 1 - historyPlate; historyCompared.add(historyPlate); $('#history-picture').innerHTML = historyScene();
    $('#history-next').textContent = `Show plate ${historyPlate ? 'A' : 'B'}`;
  }

  const letterStates = new Map();
  function updateLetters() {
    $$('[data-letter]').forEach(card => {
      const letter = voyage.letters.find(l => l.id === card.dataset.letter); if (!letter) return;
      const progress = clamp((Date.now() - letter.sent) / (letter.arrival - letter.sent), 0, 1), arrived = progress >= 1;
      $('.delivery-track i', card).style.width = `${progress * 100}%`;
      const status = arrived ? letter.claimed ? 'Arrived · postcard collected' : 'Your light has arrived. A postcard is waiting.' : `Travelling · ${duration((letter.arrival - Date.now()) / 1000)} to arrival`;
      if ($('.delivery-state', card).textContent !== status) $('.delivery-state', card).textContent = status;
      $('[data-exp="claim-letter"]', card).hidden = !arrived;
      card.classList.toggle('delivered', arrived);
      // Announce arrivals once — the ticking countdown itself stays out of live regions.
      const previous = letterStates.get(letter.id);
      letterStates.set(letter.id, arrived ? 'arrived' : 'travelling');
      if (previous === 'travelling' && arrived && $('#letters-status')) {
        $('#letters-status').textContent = `Your light has arrived at ${destinations[letter.destination].name}. A postcard is waiting.`;
      }
    });
  }

  function mountCabinetDrag() {
    let dragged;
    on(main, 'dragstart', e => { const card = e.target.closest('[data-keepsake]'); if (!card) return; dragged = card.dataset.keepsake; e.dataTransfer.setData('text/plain', dragged); e.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); });
    on(main, 'dragover', e => { if (dragged && e.target.closest('[data-keepsake]')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
    on(main, 'drop', e => {
      const target = e.target.closest('[data-keepsake]');
      if (!target || !dragged || target.dataset.keepsake === dragged) { dragged = null; return; }
      e.preventDefault();
      const ids = cabinetItems().map(i => i.id).filter(id => id !== dragged);
      ids.splice(ids.indexOf(target.dataset.keepsake), 0, dragged);
      voyage.order = ids; save(); dragged = null; redraw();
    });
    on(main, 'dragend', () => { dragged = null; $$('.dragging').forEach(el => el.classList.remove('dragging')); });
  }

  async function downloadPrint(kind, title, subtitle, extra = {}) {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#14201e'; ctx.fillRect(0, 0, 1200, 1000);
    ctx.strokeStyle = '#bfa674'; ctx.lineWidth = 2; ctx.strokeRect(35, 35, 1130, 930); ctx.strokeRect(45, 45, 1110, 910);
    if (extra.target || kind === 'world' && extra.size) {
      const scene = document.createElement('canvas'); scene.width = 760; scene.height = 500;
      const sceneContext = scene.getContext('2d');
      if (extra.target) { const frame = photoFrame(extra); window.AetherArt.sky(sceneContext, frame, 760, 500, frame.time); ctx.filter = photoFilter(extra); }
      else window.AetherArt.world(sceneContext, extra, 0);
      ctx.drawImage(scene, 80, 60, 1040, 1040 * 500 / 760); ctx.filter = 'none';
    } else {
      const artwork = kind.startsWith('game-') ? gameArt(kind.slice(5)).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ') : art(kind, extra.hue, extra);
      const svg = artwork.replace('aria-hidden="true"', 'width="1100" height="697"');
      const image = new Image(); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      try { await image.decode(); } catch { toast('The print could not be prepared. Please try again.'); return; }
      ctx.drawImage(image, 60, 60, 1080, 684);
    }
    ctx.fillStyle = '#eadfc7'; ctx.textAlign = 'center'; ctx.font = '44px Georgia'; ctx.fillText(title.slice(0, 60), 600, 808, 1030);
    ctx.font = '17px sans-serif'; ctx.fillStyle = '#c0b89f';
    // Hard-split any token wider than the frame so long words can't escape the border.
    const words = [];
    for (const raw of subtitle.split(/\s+/)) {
      let token = raw;
      while (token && ctx.measureText(token).width > 990) {
        let cut = token.length;
        while (cut > 1 && ctx.measureText(token.slice(0, cut) + '…').width > 990) cut--;
        words.push(token.slice(0, cut) + '…'); token = token.slice(cut);
      }
      if (token) words.push(token);
    }
    let line = '', y = 856;
    for (const word of words) { if (ctx.measureText(line + word).width > 990) { ctx.fillText(line.trimEnd(), 600, y, 990); line = ''; y += 25; if (y > 905) break; } line += word + ' '; }
    if (y <= 905) ctx.fillText(line.trimEnd(), 600, y, 990);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#b7a16d'; ctx.fillText('Æ T H E R   O B S E R V A T O R Y   ·   F O R   T H E   E N D L E S S L Y   C U R I O U S', 600, 935);
    canvas.toBlob(blob => { if (blob) downloadFile('aether-' + kind + '-postcard.png', blob, 'image/png'); }, 'image/png');
  }

  function handleClick(event) {
    const button = event.target.closest('[data-exp]'); if (!button) return;
    const action = button.dataset.exp, id = button.dataset.id;
    switch (action) {
      case 'relic-pick': if (gameHandle?.applyRelic(id)) { const relic = relicById(id); $('#game-status').textContent = `${relic?.name || 'The relic'} joins your build. The expedition continues.`; } break;
      case 'relic-skip': if (gameHandle?.skipRelic()) $('#game-status').textContent = 'You keep your current build. The expedition continues.'; break;
      case 'game-forecast': {
        forecastOffered = true;
        const row = $('.forecast-row');
        if (row) row.outerHTML = `<button type="button" class="button button-primary" data-exp="game-start" id="game-start">Let’s play ${icon('play')}</button>`;
        gameHandle?.startForecast(id);
        break;
      }
      case 'inspect-relic': {
        const relic = relicById(id); if (!relic) break;
        gameHandle?.pause();
        showModal(`<p class="eyebrow">EXPEDITION RELIC · ${esc(relic.tag)}</p><h2 id="modal-title">${esc(relic.glyph)} ${esc(relic.name)}</h2><p class="modal-description">${esc(relic.description)}</p><p class="tiny-note">This power lasts for the current run. Your discovery stays in the field guide.</p><div class="modal-actions"><button class="button button-primary" data-action="close-modal">Back to the expedition</button></div>`);
        break;
      }
      case 'choose-game': if (games[id]) { activeGame = id; lastGameScore = 0; redraw(); } break;
      case 'game-pact': gameHandle?.invokePact(); $('#arcade-canvas')?.focus({ preventScroll: true }); break;
      case 'game-ability': gameHandle?.ability(); $('#arcade-canvas')?.focus({ preventScroll: true }); break;
      case 'game-start': if (lastGamePhase === 'paused') gameHandle?.resume(); else { if (lastGamePhase === 'over') gameHandle?.reset(); gameHandle?.start(); } break;
      case 'game-pause': lastGamePhase === 'paused' ? gameHandle?.resume() : gameHandle?.pause(); break;
      case 'game-sound': voyage.sound = !voyage.sound; save(); gameHandle.setSound(voyage.sound); button.textContent = voyage.sound ? 'Sound on' : 'Sound off'; button.setAttribute('aria-pressed', voyage.sound); break;
      case 'game-theatre': {
        const expanded = document.body.classList.toggle('game-theatre');
        button.textContent = expanded ? 'Close expanded view' : 'Expand';
        button.setAttribute('aria-pressed', expanded);
        // Keep the mobile drawer's own inert rule intact when leaving theatre.
        document.querySelector('.sidebar').inert = expanded || window.innerWidth <= 720;
        document.querySelector('.topbar').inert = expanded;
        const footer = document.querySelector('.page-footer'); if (footer) footer.inert = expanded;
        $('.arcade-aside').inert = expanded;
        $('.game-cabinet').setAttribute('role', expanded ? 'dialog' : 'region');
        if (expanded) $('.game-cabinet').setAttribute('aria-modal', 'true'); else $('.game-cabinet').removeAttribute('aria-modal');
        $$('.experience > *').forEach(el => { if (!el.contains($('.game-cabinet'))) el.inert = expanded; });
        let scrim = document.querySelector('.theatre-scrim');
        if (expanded && !scrim) {
          scrim = document.createElement('div');
          scrim.className = 'theatre-scrim';
          // The scrim lives outside main, so it gets its own close listener.
          scrim.addEventListener('click', () => $('#game-theatre')?.click(), { signal: controller.signal });
          document.body.append(scrim);
        }
        if (!expanded) { scrim?.remove(); $('#game-theatre')?.focus({ preventScroll: true }); }
        else $('#arcade-canvas')?.focus({ preventScroll: true });
        break;
      }
      case 'game-casual': challenge = false; expedition = false; redraw(); break;
      case 'game-expedition': expedition = true; challenge = false; redraw(); break;
      case 'game-daily': challenge = true; redraw(); break;
      case 'share-score': gameHandle?.pause(); downloadPrint('game-' + activeGame, games[activeGame].title, `${Math.max(lastGameScore, voyage.best[gameKey()] || 0)} points · ${challenge ? 'Daily expedition · ' + challengeDate : 'Personal best · Æther relic expeditions'}`); break;
      case 'exploration-mode': voyage.mode = button.dataset.mode; save(); redraw(); toast(`Your instruments now use ${voyage.mode} mode.`); break;
      case 'develop-plate': developPlate(); break;
      case 'download-plate': { const p = voyage.photos.find(p => p.id === currentPhoto); if (p) downloadPrint(p.target, $('#plate-name').value || p.name, targets.find(t => t.id === p.target).note, p); break; }
      case 'random-world': world = { name: ['Mildly suspicious', 'Definitely not Earth', 'Velvet breakfast', 'The long way home', 'Apricot emergency'][Math.floor(Math.random() * 5)], hue: Math.floor(Math.random() * 360), moons: Math.floor(Math.random() * 5), rings: Math.random() > .4, size: Math.round((.6 + Math.random() * 1.3) * 10) / 10, tilt: Math.floor(Math.random() * 80), mass: 1, speed: 24, atmosphere: 60, marks: [] }; redraw(); break;
      case 'world-brush': if (['land', 'crater', 'storm'].includes(id)) { worldBrush = id; $$('[data-exp="world-brush"]').forEach(el => el.setAttribute('aria-pressed', el.dataset.id === id)); $('#world-brush-status').textContent = `${id === 'land' ? 'Continent' : id === 'crater' ? 'Crater' : 'Storm'} brush selected. Paint the surface.`; } break;
      case 'world-undo': worldRenderer?.undo(); $('#world-brush-status').textContent = 'Last stroke undone.'; break;
      case 'world-clear': worldRenderer?.clear(); $('#world-brush-status').textContent = 'A fresh surface. Undo brings it back.'; break;
      case 'save-world': {
        world.name = $('#world-name').value.trim() || 'An unnamed little world';
        const existing = voyage.worlds.find(w => w.id === world.id);
        if (existing) Object.assign(existing, structuredClone(world)); else { if (voyage.worlds.length >= 60) return toast('Your world cabinet is full. Revisit a world to keep refining it.'); world.id = uid(); voyage.worlds.unshift(structuredClone(world)); }
        if (save()) { unlock('world:first', 'Your first little world'); if (world.moons >= 3) unlock('world:moons', 'A family of moons'); redraw(); toast(`${world.name} is safe in your discovery cabinet.`); } else redraw();
        break;
      }
      case 'load-world': { const saved = voyage.worlds.find(w => w.id === id); if (saved) { world = structuredClone(saved); redraw(); window.scrollTo({ top: 0, behavior: 'smooth' }); } break; }
      case 'music-note': { const track = Number(button.dataset.track), step = Number(button.dataset.step); music.notes[track][step] = !music.notes[track][step]; button.classList.toggle('on', music.notes[track][step]); button.setAttribute('aria-pressed', String(music.notes[track][step])); refreshMusicStories(); break; }
      case 'music-play': playMusic(); break;
      case 'music-mute': { const track = Number(button.dataset.track); music.mutes[track] = !music.mutes[track]; button.textContent = music.mutes[track] ? 'Muted' : 'On'; button.setAttribute('aria-pressed', String(music.mutes[track])); button.setAttribute('aria-label', `${music.mutes[track] ? 'Unmute' : 'Mute'} ${studio.TRACKS[track].planet}`); button.closest('.sequence-track')?.classList.toggle('is-muted', music.mutes[track]); break; }
      case 'music-claim': { const story = musicStories.find(story => story.id === id), stats = musicStats(); if (story && stats.voices >= story.voices && stats.notes >= story.notes && stats.quarters >= story.quarters) { unlock(story.id, story.title); checkConstellation(); refreshMusicStories(); } break; }
      case 'music-save': {
        music.name = $('#music-name').value.trim() || 'An unnamed little melody';
        const existing = voyage.music.find(m => m.id === music.id);
        if (existing) Object.assign(existing, structuredClone(music)); else { if (voyage.music.length >= 60) return toast('Your music drawer is full. Revisit a saved melody to refine it.'); music.id = uid(); voyage.music.unshift(structuredClone(music)); }
        if (!save()) break;
        unlock('music:first', 'A universe with a melody');
        if (!$('.saved-music')) $('.experience').insertAdjacentHTML('beforeend', '<div class="saved-music"></div>');
        $('.saved-music').innerHTML = `<p class="section-label">YOUR COMPOSITIONS</p>${voyage.music.map(m => expButton('music-load', '♫ ' + esc(m.name), false, `data-id="${esc(m.id)}"`)).join('')}`;
        toast('Melody saved. Keep the universe playing.'); break;
      }
      case 'music-load': { const saved = voyage.music.find(m => m.id === id); if (saved) { music = structuredClone(saved); redraw(); } break; }
      case 'music-clear': music.notes = Array.from({ length: studio.TRACKS.length }, () => Array(studio.STEPS).fill(false)); redraw(); break;
      case 'music-preset': music = studio.preset(Number(button.dataset.preset)); redraw(); break;
      case 'music-export': exportMusic(); break;
      case 'history-era': historyIndex = Number(button.dataset.index); historyPlate = 0; historyCompared = new Set([0]); historySelection = -1; redraw(); break;
      case 'history-next': flipPlate(); break;
      case 'history-blink': if (blinkTimer) stopBlink(); else { blinkTimer = every(flipPlate, 850); button.textContent = 'Stop blinking'; button.setAttribute('aria-pressed', 'true'); } break;
      case 'history-find': {
        stopBlink();
        if (historyCompared.size < 2) { $('#history-feedback').textContent = 'One plate is only half the evidence. Compare both exposures first.'; break; }
        const index = Number(button.dataset.index), candidate = historyCandidates()[index]; historySelection = index;
        if (!candidate?.moving) { $('#history-feedback').textContent = 'That light holds its position. Blink again and watch for movement.'; button.classList.add('wrong-suspect'); break; }
        const scene = histories[historyIndex]; unlock('history:' + scene.id, `${scene.year} · case solved`); $('#historian-note').hidden = false;
        $('#history-picture').innerHTML = historyScene(); $('#history-feedback').textContent = 'Identified. The changed position is the evidence. Read the notebook to uncover the story.';
        $(`[data-exp="history-find"][data-index="${index}"]`)?.focus({ preventScroll: true }); break;
      }
      case 'signal-route': selectSignalRoute(Number(button.dataset.index)); break;
      case 'signal-next': selectSignalRoute(signalRoute + 1); break;
      case 'signal-mirror': signalTurns++; signalMirrors[Number(button.dataset.index)] = !signalMirrors[Number(button.dataset.index)]; updateSignal(); break;
      case 'signal-hint': {
        const solution = signalRoutes[signalRoute].solution, next = solution.findIndex((value, i) => value !== signalMirrors[i]);
        if (next >= 0) { signalTurns++; signalHints++; signalMirrors[next] = solution[next]; updateSignal(); }
        break;
      }
      case 'claim-letter': {
        const letter = voyage.letters.find(l => l.id === id); if (!letter || letter.arrival > Date.now()) break;
        if (letter.claimed) { downloadPrint('letter', `A little light at ${destinations[letter.destination].name}`, letter.text); break; }
        letter.claimed = true; const claimed = save(); if (!claimed) break; unlock('letter:first', 'Your light found its way'); redraw();
        showModal(`<p class="eyebrow">DELIVERED TO ${destinations[letter.destination].name.toUpperCase()}</p><h2 id="modal-title">A thought, received.</h2><div class="arrival-art">${art(letter.destination === 'moon' ? 'moon' : 'letter')}</div><p class="journal-full-body">“${esc(letter.text)}”</p><p class="notice">A mark on the arrival seal: <strong>N</strong>. The final fragment?<small>THE MISSING ASTRONOMER / EVIDENCE</small></p><div class="modal-actions"><button class="button button-primary" data-action="close-modal">Keep exploring ↗</button></div>`); break;
      }
      case 'cabinet-filter': cabinetFilter = button.dataset.filter; redraw(); break;
      case 'move-keepsake': {
        const items = cabinetItems();
        const visible = items.filter(item => cabinetFilter === 'all' || item.type === cabinetFilter);
        const from = visible.findIndex(item => item.id === id);
        const swap = visible[clamp(from + Number(button.dataset.direction), 0, visible.length - 1)];
        if (!swap || swap.id === id) break;
        const ids = items.map(item => item.id);
        const a = ids.indexOf(id), b = ids.indexOf(swap.id);
        [ids[a], ids[b]] = [ids[b], ids[a]];
        voyage.order = ids; save(); redraw();
        $(`[data-keepsake="${CSS.escape(id)}"] [data-exp="move-keepsake"][data-direction="${button.dataset.direction}"]`)?.focus({ preventScroll: true }); break;
      }
      case 'open-keepsake': {
        const item = cabinetItems().find(c => c.id === id); if (!item) break;
        if (item.type === 'worlds') world = structuredClone(item.data);
        if (item.type === 'plates') currentPhoto = item.id;
        if (item.type === 'music') music = structuredClone(item.data);
        if (item.type === 'scores') { activeGame = item.data.key.split(':')[0]; challenge = /:\d{4}-/.test(item.data.key); relaxed = item.data.key.includes('relaxed'); }
        navigate(item.route); break;
      }
    }
  }

  function handleInput(event) {
    const { id, value } = event.target;
    if (id === 'letter-text') letterDraft.text = value;
    if (event.target.type === 'range') { const output = document.getElementById(id + '-value'); if (output) output.textContent = value + (id === 'music-tempo' ? ' BPM' : id === 'world-tilt' ? '°' : id === 'world-speed' ? 'h' : id === 'scope-zoom' ? '×' : ''); }
    if (id.startsWith('plate-')) {
      const photo = voyage.photos.find(p => p.id === currentPhoto); if (!photo) return;
      if (['plate-exposure', 'plate-clarity', 'plate-warmth'].includes(id)) photo[id.slice(6)] = Number(value);
      updatePlate();
    }
    if (id.startsWith('world-')) {
      if (id === 'world-name') world.name = value;
      else if (id === 'world-rings') world.rings = event.target.checked;
      else if (['hue', 'size', 'mass', 'atmosphere', 'tilt', 'speed', 'moons'].includes(id.slice(6))) world[id.slice(6)] = Number(value);
      updateWorldReadout();
    }
    if (id === 'music-tempo') { music.tempo = Number(value); const mood = $('.music-mood-line'); if (mood) mood.textContent = `${studio.MOODS[music.mood].name} · ${music.tempo} BPM`; }
    if (id === 'music-swing') music.swing = Number(value);
    if (id === 'music-space') music.space = Number(value);
    if (event.target.classList.contains('music-level')) music.levels[Number(event.target.dataset.track)] = Number(value) / 100;
    if (id === 'music-name') { music.name = value; $('#composition-title').textContent = value || 'An unnamed little melody'; }
  }

  function handleChange(event) {
    const { id, value } = event.target;
    if (id === 'scope-select') telescope.target = value;
    if (id === 'music-mood' && studio.MOODS[value]) { music.mood = value; const mood = $('.music-mood-line'); if (mood) mood.textContent = `${studio.MOODS[value].name} · ${music.tempo} BPM`; }
    if (id === 'plate-select') { currentPhoto = value; redraw(); }
    if (id === 'relaxed-flight') { relaxed = event.target.checked; redraw(); }
    if (id === 'letter-destination' || id === 'letter-speed') {
      letterDraft.destination = $('#letter-destination').value; letterDraft.speed = $('#letter-speed').value;
      const d = destinations[$('#letter-destination').value], speed = Number($('#letter-speed').value);
      const estimate = Math.max(2.5, d.seconds / speed);
      $('#delivery-estimate').textContent = `Arrival in ${duration(estimate)} · ${d.distance}`;
    }
    if (id === 'observatory-theme') { voyage.theme = value; document.body.dataset.observatoryTheme = value; save(); toast('A new shade of wonder. Your observatory theme is saved.'); }
  }

  function handleSubmit(event) {
    if (event.target.id === 'cosmic-letter-form') {
      event.preventDefault(); const text = $('#letter-text').value.trim(); if (!text) return;
      if (!signalSolved) return toast('Connect the beam through every mirror first.');
      if (voyage.letters.length >= 60) return toast('Your postal drawer holds sixty little journeys. They’re all safe in the cabinet.');
      const destination = $('#letter-destination').value, speed = Number($('#letter-speed').value), now = Date.now();
      // Even the fastest post deserves a moment on its journey.
      const arrival = now + Math.max(2500, destinations[destination].seconds * 1000 / speed);
      voyage.letters.unshift({ id: uid(), destination, text, sent: now, arrival, claimed: false });
      if (save()) { letterDraft.text = ''; unlock('letter:sent', 'A thought, travelling at the speed of light'); redraw(); toast(`Your light is on its way to ${destinations[destination].name}.`); }
    }
    if (event.target.id === 'mystery-answer-form') {
      event.preventDefault();
      if (!mysteryProgress().slice(0, 4).every(Boolean)) {
        $('#mystery-answer-status').textContent = 'The lock isn’t ready yet — four earlier letters are still sealed.';
        return;
      }
      const answer = $('#mystery-answer').value.trim().toUpperCase();
      if (answer === 'LUMEN') { unlock('mystery:solved', 'Welcome home, Keeper of the Observatory'); redraw(); }
      else $('#mystery-answer-status').textContent = 'The lock stays quiet. Read the keeper’s marks in order: the plate holder, the plate’s back, the 1610 margin, and the arrival seal.';
    }
  }

  Object.assign(viewNames, { arcade: 'Cosmic arcade', discover: 'Wonder rooms', telescope: 'The telescope', darkroom: 'Celestial darkroom', worlds: 'World workshop', orchestra: 'Orrery orchestra', history: 'Lost nights', letters: 'Letters made of light', mystery: 'The missing astronomer', cabinet: 'Discovery cabinet' });
  Object.assign(renderers, { arcade: renderArcade, discover: renderDiscover, telescope: renderTelescope, darkroom: renderDarkroom, worlds: renderWorlds, orchestra: renderOrchestra, history: renderHistory, letters: renderLetters, mystery: renderMystery, cabinet: renderCabinet });
  ['arcade', 'discover', 'telescope', 'darkroom', 'worlds', 'orchestra', 'history', 'letters', 'mystery', 'cabinet'].forEach(id => searchItems.push({ id, name: viewNames[id], kind: 'page', subtitle: 'Wonder rooms · play and discover', icon: 'sparkles' }));
  window.AetherExperiences = { mount, unmount, pause() { gameHandle?.pause(); stopMusic(); stopBlink(); } };
})();
