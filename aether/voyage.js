'use strict';

// The Grand Tour: one seeded voyage from the Sun's doorstep to Neptune,
// threading every game in the observatory into a single expedition.
window.AetherVoyage = (() => {
  const KEY = 'aether-grand-tour-v1';
  const $ = (s, r = main) => r.querySelector(s);
  const esc = escapeHTML;
  const TAU = Math.PI * 2;
  let controller, arcadeHandle = null, trialHandle = null, puzzleHandle = null;

  const artifacts = {
    'brass-sextant': { name: 'Brass Sextant', icon: '✧', text: 'Puzzle surveys pay +25 stardust.' },
    'ion-sails': { name: 'Ion Sails', icon: '⛵', text: 'Arcade expeditions pay double stardust.' },
    'moonshield-patent': { name: 'Moonshield Patent', icon: '◈', text: 'The first hull lost in each sector is refunded at its finale.' },
    'lodestone-chart': { name: 'Lodestone Chart', icon: '◎', text: 'Trials run 15% slower.' },
    'star-atlas': { name: 'Star Atlas', icon: '✦', text: 'The chart reveals exactly what waits at each stop.' },
    'aurora-battery': { name: 'Aurora Battery', icon: '⚡', text: 'Trials pay +15 stardust.' },
    'compass-of-halley': { name: 'Compass of Halley', icon: '☄', text: 'Relic caches offer a fourth artifact to choose from.' },
    'pressure-flask': { name: 'Pressure Flask', icon: '⚗', text: 'Refuges restore two hull.' },
    'meteor-charm': { name: 'Meteor Charm', icon: '☄', text: 'All stardust gains +25%.' },
    'observers-handbook': { name: 'Observer’s Handbook', icon: '📖', text: 'Puzzle par windows are half again as generous.' },
  };
  const sectors = ['THE INNER WORLDS', 'THE GIANTS', 'THE LONG DARK'];
  const puzzlePlanets = () => planets.map(p => p.id);

  function rng(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
  function shuffle(arr, rand) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function readStore() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
    return {
      records: {
        tours: Number.isInteger(raw.records?.tours) ? raw.records.tours : 0,
        bestDust: Number.isInteger(raw.records?.bestDust) ? raw.records.bestDust : 0,
        bestStep: Number.isInteger(raw.records?.bestStep) ? raw.records.bestStep : 0,
      },
      active: raw.active && typeof raw.active === 'object' && Number.isInteger(raw.active.seed) && Number.isInteger(raw.active.step) ? raw.active : null,
    };
  }
  const store = readStore();
  let run = null;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} }
  function saveRun() { store.active = run ? { seed: run.seed, step: run.step, hull: run.hull, dust: run.dust, artifacts: run.artifacts, done: run.done, path: run.path, shieldUsed: run.shieldUsed } : null; save(); }

  function buildMap(seed, compass) {
    const rand = rng(seed);
    const planetDeck = shuffle(puzzlePlanets(), rand);
    const trialDeck = shuffle(AetherTrials.list.map(t => t.id), rand);
    const arcadeDeck = shuffle(['merge', 'hop', 'dash', 'breaker'], rand);
    const steps = [];
    let pi = 0, ti = 0, ai = 0;
    for (let s = 0; s < 12; s++) {
      if (s === 11) { steps.push([{ kind: 'puzzle', planet: 'neptune', level: 1 + Math.floor(rand() * 3), finale: true }]); continue; }
      if (s === 3 || s === 7) { steps.push([{ kind: 'arcade', game: arcadeDeck[ai++ % 4], finale: true }]); continue; }
      const count = compass ? 3 : (s === 0 ? 2 : 2 + (rand() < .4 ? 1 : 0));
      const choices = [];
      for (let c = 0; c < count; c++) {
        const roll = rand();
        if (roll < .32) choices.push({ kind: 'puzzle', planet: planetDeck[pi++ % 8], level: Math.floor(rand() * 5) });
        else if (roll < .66) choices.push({ kind: 'trial', trial: trialDeck[ti++ % 8] });
        else if (roll < .76) choices.push({ kind: 'refuge' });
        else if (roll < .88) choices.push({ kind: 'cache' });
        else choices.push({ kind: 'arcade', game: arcadeDeck[ai++ % 4] });
      }
      steps.push(choices);
    }
    return steps;
  }

  const has = id => run?.artifacts.includes(id);
  const dustBonus = base => {
    let value = base;
    if (has('meteor-charm')) value *= 1.25;
    return Math.round(value);
  };

  function nodeLabel(node) {
    const atlas = has('star-atlas');
    if (node.kind === 'puzzle') return { icon: '✦', name: 'Planetary survey', detail: atlas ? `${planets.find(p => p.id === node.planet).name} · ${P0.catalogue[node.planet].levels[node.level]}` : planets.find(p => p.id === node.planet).name };
    if (node.kind === 'trial') { const t = AetherTrials.list.find(t => t.id === node.trial); return { icon: '☄', name: 'Trial', detail: atlas ? t.name : t.place }; }
    if (node.kind === 'arcade') return { icon: '♪', name: node.finale ? 'Sector finale' : 'Expedition', detail: atlas || node.finale ? { merge: 'Planet Drop', hop: 'Comet Surf', dash: 'Stardust Dash', breaker: 'Orbit Breaker' }[node.game] : 'The arcade' };
    if (node.kind === 'refuge') return { icon: '☕', name: 'Refuge', detail: 'Rest. Repair. Warm tea.' };
    return { icon: '✧', name: 'Relic cache', detail: 'Draft one artifact' };
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  function renderVoyage() {
    if (!run && store.active) run = { ...store.active, node: null, nodeKey: null, shieldLost: {}, map: buildMap(store.active.seed, false) };
    if (run?.over) return renderRecap(false);
    if (run?.won) return renderRecap(true);
    if (run?.node) return renderNode();
    if (run) return renderChart();
    return renderLanding();
  }

  function renderLanding() {
    return `<div class="view-enter tour-page"><section class="view-header"><div><p class="eyebrow">THE GRAND TOUR</p><h1>One voyage. Every world.</h1><p>A single expedition from the Sun's doorstep to Neptune. Chart a path across the solar system: survey planets in their puzzle rooms, run the arcade expeditions, and pass the trials between the stars. Your hull is finite. The sky is not.</p></div></section>
    <div class="tour-landing"><div class="tour-rules">
      <article><span class="chapter-number">Ⅰ</span><div><h3>Chart</h3><p>Each leg of the tour offers a choice of stops. Surveys, trials, expeditions, refuges and relic caches — the seed of the sky decides the mix.</p></div></article>
      <article><span class="chapter-number">Ⅱ</span><div><h3>Endure</h3><p>You set out with three hull. Failing a trial costs one. Refuges and the odd artifact patch the ship back together.</p></div></article>
      <article><span class="chapter-number">Ⅲ</span><div><h3>Arrive</h3><p>Reach the Neptune relay with dust in the hold and stories in the logbook. Tours completed and your best haul are kept on this device.</p></div></article>
    </div>
    <aside class="tour-manifest"><p class="eyebrow">THE LEDGER</p><dl><div><dt>Tours completed</dt><dd>${store.records.tours}</dd></div><div><dt>Best haul</dt><dd>${store.records.bestDust} stardust</dd></div><div><dt>Furthest leg</dt><dd>${store.records.bestStep ? `Leg ${store.records.bestStep} of 12` : '—'}</dd></div></dl>
    ${store.active ? '<p class="tour-resume-note">A voyage is already underway.</p><button class="button button-primary" data-tour="resume">Resume the tour →</button><button class="button" data-tour="abandon">Abandon it</button>' : '<button class="button button-primary tour-begin" data-tour="begin">Begin the Grand Tour →</button>'}</aside></div></div>`;
  }

  function renderChart() {
    const map = run.map;
    return `<div class="view-enter tour-page"><section class="view-header tour-header"><div><p class="eyebrow">THE GRAND TOUR · ${sectors[Math.min(2, Math.floor(run.step / 4))]}</p><h1>Leg ${run.step + 1} of 12.</h1></div><div class="tour-vitals"><span class="tour-hull" aria-label="Hull ${run.hull} of 5">${'♥'.repeat(run.hull)}${'♡'.repeat(Math.max(0, 5 - run.hull))}</span><span class="tour-dust">✦ ${run.dust}</span></div></section>
    <div class="tour-artifacts">${run.artifacts.length ? run.artifacts.map(id => `<span class="tour-artifact" title="${esc(artifacts[id].text)}">${artifacts[id].icon} ${artifacts[id].name}</span>`).join('') : '<span class="tour-artifact empty">No artifacts yet — relic caches hold them.</span>'}</div>
    <div class="tour-chart" role="list" aria-label="The route chart">${map.map((choices, s) => `<div class="tour-step ${s === run.step ? 'current' : s < run.step ? 'passed' : ''}" role="listitem"><span class="tour-step-label">${s === 11 ? 'RELAY' : [3, 7].includes(s) ? 'FINALE' : `LEG ${s + 1}`}</span>${choices.map((node, i) => {
      const key = `${s}:${i}`, state = run.done[key], label = nodeLabel(node);
      const reachable = s === run.step && !run.node;
      return `<button class="tour-node ${state ? state : ''} ${reachable ? 'reachable' : ''}" data-tour-node="${key}" ${reachable ? '' : 'disabled'} aria-label="${esc(label.name)}: ${esc(label.detail)}${state === 'won' ? ', completed' : state === 'failed' ? ', failed' : ''}"><span class="tour-node-icon">${label.icon}</span><span class="tour-node-copy"><strong>${state === 'won' ? '✓ ' : state === 'failed' ? '✕ ' : ''}${label.name}</strong><small>${esc(label.detail)}</small></span></button>`;
    }).join('')}</div>`).join('')}</div>
    ${run.path.length ? `<details class="tour-log"><summary>The logbook (${run.path.length})</summary>${run.path.slice(-6).reverse().map(line => `<p>${esc(line)}</p>`).join('')}</details>` : ''}</div>`;
  }

  function renderNode() {
    const node = run.node;
    const label = nodeLabel(node);
    const arcadeNames = { merge: 'Planet Drop', hop: 'Comet Surf', dash: 'Stardust Dash', breaker: 'Orbit Breaker' };
    const headsFor = {
      puzzle: () => ['PLANETARY SURVEY', `The ${planets.find(p => p.id === node.planet).name} contract`],
      trial: () => ['A TRIAL BETWEEN WORLDS', AetherTrials.list.find(t => t.id === node.trial).name],
      arcade: () => [node.finale ? 'SECTOR FINALE' : 'AN EXPEDITION', arcadeNames[node.game]],
      refuge: () => ['A QUIET REFUGE', 'The halfway lantern'],
      cache: () => ['A RELIC CACHE', 'Something the last keeper left behind'],
    };
    const heads = headsFor[node.kind]();
    return `<div class="view-enter tour-page"><section class="view-header tour-header"><div><p class="eyebrow">${heads[0]}</p><h1>${heads[1]}.</h1><p class="tour-node-brief">${nodeBrief(node)}</p></div><div class="tour-vitals"><span class="tour-hull">${'♥'.repeat(run.hull)}</span><span class="tour-dust">✦ ${run.dust}</span></div></section>
    <div id="tour-stage" class="tour-stage"></div>
    <div class="tour-node-actions"><button class="button" data-tour="leave">← Chart another course</button></div></div>`;
  }

  function nodeBrief(node) {
    if (node.kind === 'puzzle') return `${P0.catalogue[node.planet].lead} Win the survey to bank stardust; the board below is live.`;
    if (node.kind === 'trial') return AetherTrials.list.find(t => t.id === node.trial).brief + ' Failure costs one hull.';
    if (node.kind === 'arcade') return 'A full expedition. Stardust pays by the point; relics draft as usual.';
    if (node.kind === 'refuge') return `Restore ${has('pressure-flask') ? 'two' : 'one'} hull and take a moment. No risk, small reward.`;
    return 'Choose one of three artifacts. It travels with you for the rest of the tour.';
  }

  function renderRecap(won) {
    return `<div class="view-enter tour-page"><section class="tour-recap"><p class="eyebrow">${won ? 'THE RELAY REACHED' : 'THE TOUR ENDS EARLY'}</p><h1>${won ? 'Neptune, in person.' : 'The sky keeps the rest.'}</h1>
    <p class="tour-recap-line">${won ? 'Twelve legs. One little ship. The whole neighborhood.' : 'The hull gave out — but the logbook didn’t. Every leg taught the chart something.'}</p>
    <dl class="tour-stats"><div><dt>Stardust banked</dt><dd>✦ ${run.dust}</dd></div><div><dt>Legs completed</dt><dd>${Object.values(run.done).filter(v => v === 'won').length} / 12</dd></div><div><dt>Hull remaining</dt><dd>${'♥'.repeat(run.hull) || '—'}</dd></div><div><dt>Artifacts carried</dt><dd>${run.artifacts.length ? run.artifacts.map(id => artifacts[id].name).join(' · ') : 'None'}</dd></div></dl>
    <div class="tour-recap-actions"><button class="button button-primary" data-tour="begin">Set out again →</button><a class="button" href="#planetarium">Back to the atlas</a></div>
    ${run.path.length ? `<details class="tour-log" open><summary>The logbook</summary>${run.path.map(line => `<p>${esc(line)}</p>`).join('')}</details>` : ''}</section></div>`;
  }

  // ── Run flow ─────────────────────────────────────────────────────────────
  function begin() {
    teardown();
    const seed = Math.floor(Math.random() * 0xffffffff);
    const compassDraft = false;
    run = { seed, step: 0, hull: 3, dust: 0, artifacts: [], done: {}, path: [], node: null, shieldUsed: {}, map: null };
    run.map = buildMap(seed, compassDraft);
    store.active = null; // fresh tour replaces any abandoned one
    saveRun();
    render();
    toast('The tour begins. Choose your first stop.');
  }
  function resume() {
    const saved = store.active; if (!saved) return;
    run = { ...saved, node: null, nodeKey: null, shieldLost: {}, map: buildMap(saved.seed, false) };
    render();
  }

  function finishNode(state, dustGain, note) {
    const key = run.nodeKey;
    run.done[key] = state;
    if (dustGain) run.dust += dustBonus(dustGain);
    if (note) run.path.push(note);
    store.records.bestStep = Math.max(store.records.bestStep, run.step + 1);
    // Sector finale: refund the first hull lost under the Moonshield Patent.
    if (nodeIsFinale(run.step) && has('moonshield-patent')) {
      const sector = Math.floor(run.step / 4);
      if (run.shieldLost?.[sector] && !run.shieldUsed[sector]) { run.hull = Math.min(5, run.hull + 1); run.shieldUsed[sector] = true; run.path.push('The Moonshield Patent pays out: +1 hull.'); }
    }
    run.node = null; run.nodeKey = null;
    run.step++;
    if (run.hull <= 0) { run.over = true; store.records.tours += 0; store.active = null; }
    else if (run.step >= 12) { run.won = true; store.records.tours++; store.records.bestDust = Math.max(store.records.bestDust, run.dust); store.active = null; }
    else saveRun();
    save();
    render();
  }
  function nodeIsFinale(step) { return [3, 7, 11].includes(step); }

  function loseHull(reason) {
    run.hull = Math.max(0, run.hull - 1);
    const sector = Math.floor(run.step / 4);
    (run.shieldUsed ||= {}); (run.shieldLost ||= {}); run.shieldLost[sector] = true;
    run.path.push(reason);
  }

  function teardown() {
    arcadeHandle?.destroy(); arcadeHandle = null;
    trialHandle?.destroy(); trialHandle = null;
    puzzleHandle?.destroy(); puzzleHandle = null;
  }

  // ── Node hosts ───────────────────────────────────────────────────────────
  function mountNode() {
    const node = run.node, stage = $('#tour-stage');
    if (!node || !stage) return;
    if (node.kind === 'puzzle') mountPuzzleNode(node, stage);
    else if (node.kind === 'trial') mountTrialNode(node, stage);
    else if (node.kind === 'arcade') mountArcadeNode(node, stage);
    else if (node.kind === 'refuge') mountRefuge(node, stage);
    else mountCache(node, stage);
  }

  function mountPuzzleNode(node, stage) {
    stage.innerHTML = `<div class="tour-puzzle-host"></div>`;
    const host = $('.tour-puzzle-host', stage);
    let paid = false;
    puzzleHandle = window.AetherPlanets.host(host, node.planet, node.level, {
      parScale: has('observers-handbook') ? 1.5 : 1,
      onSolve() {
        if (paid) return; paid = true;
        const gain = dustBonus(40 + (has('brass-sextant') ? 25 : 0));
        run.dust += gain;
        const counter = $('.tour-dust'); if (counter) counter.textContent = `✦ ${run.dust}`;
        toast(`Survey complete · +${gain} stardust`);
      },
      onDone() {
        finishNode('won', 0, `${planets.find(p => p.id === node.planet).name} surveyed.`);
      },
    });
    // Leave-without-reward path
    stage.insertAdjacentHTML('beforeend', `<p class="tour-note">Surveys never cost hull. Solve it to bank stardust — or chart another course and the contract passes to the wind.</p>`);
  }

  function mountTrialNode(node, stage) {
    const trial = AetherTrials.list.find(t => t.id === node.trial);
    stage.innerHTML = `<div class="trial-cabinet"><div class="trial-frame"></div></div>`;
    const frame = $('.trial-frame', stage);
    trialHandle = AetherTrials.create(node.trial, frame, {
      speedScale: has('lodestone-chart') ? .85 : 1,
      onEnd({ won, score }) {
        const gain = dustBonus(Math.round(score / 8) + (won ? 30 : 0) + (has('aurora-battery') && won ? 15 : 0));
        if (won) toast(`${trial.name} cleared · +${gain} stardust`);
        else { loseHull(`${trial.name}: the trial wins this time. −1 hull.`); toast('The trial wins this time. −1 hull.'); }
        finishNode(won ? 'won' : 'failed', gain, `${trial.name}: ${won ? `${score} points` : 'failed'}.`);
      },
    });
    frame.querySelector('canvas')?.focus({ preventScroll: true });
  }

  function mountArcadeNode(node, stage) {
    const names = { merge: 'Planet Drop', hop: 'Comet Surf', dash: 'Stardust Dash', breaker: 'Orbit Breaker' };
    stage.innerHTML = `<div class="tour-arcade"><div class="tour-arcade-hud"><span id="tour-score">SCORE 0</span><span id="tour-lives">♥♥♥</span></div><div class="tour-arcade-frame"><canvas id="tour-canvas"></canvas><div class="tour-arcade-overlay" id="tour-overlay"><p class="eyebrow">${node.finale ? 'SECTOR FINALE' : 'EXPEDITION'}</p><h2>${names[node.game]}</h2><button class="button button-primary" data-tour="arcade-start">Begin →</button></div><div class="tour-draft" id="tour-draft" hidden></div></div></div>`;
    const canvas = $('#tour-canvas');
    const [w, h] = window.AetherArcade.dimensions(node.game);
    canvas.width = w; canvas.height = h;
    canvas.tabIndex = 0;
    let ended = false;
    arcadeHandle = window.AetherArcade.create(canvas, {
      game: node.game, seed: run.seed + run.step * 97, best: 0,
      onUpdate(data) {
        const score = $('#tour-score'); if (score) score.textContent = `SCORE ${data.score}`;
        const lives = $('#tour-lives'); if (lives) lives.textContent = '♥'.repeat(Math.max(0, data.lives));
      },
      onOffer(offer) {
        const draft = $('#tour-draft');
        draft.hidden = false;
        draft.innerHTML = `<p class="eyebrow">A RELIC OFFERS ITSELF</p><div class="tour-draft-row">${offer.map(r => `<button class="tour-draft-card" data-relic="${r.id}"><strong>${esc(r.name)}</strong><small>${esc(r.description)}</small></button>`).join('')}</div><button class="text-link" data-tour="relic-skip">Keep the current build</button>`;
        draft.querySelectorAll('[data-relic]').forEach(btn => btn.addEventListener('click', () => { if (arcadeHandle.applyRelic(btn.dataset.relic)) { draft.hidden = true; draft.innerHTML = ''; } }));
        $('[data-tour="relic-skip"]', draft)?.addEventListener('click', () => { if (arcadeHandle.skipRelic()) { draft.hidden = true; draft.innerHTML = ''; } });
      },
      onFinish({ score }) {
        if (ended) return; ended = true;
        const gain = dustBonus(Math.max(20, Math.round(score / 6)) * (has('ion-sails') ? 2 : 1));
        toast(`${names[node.game]}: ${score} points · +${gain} stardust`);
        finishNode('won', gain, `${names[node.game]}: ${score} points.`);
      },
    });
  }

  function mountRefuge(node, stage) {
    const heal = has('pressure-flask') ? 2 : 1;
    stage.innerHTML = `<div class="tour-refuge"><div class="refuge-lantern" aria-hidden="true">☕</div><h2>The kettle is already on.</h2><p>No puzzles here. No hazards. Just a warm bench, a long view, and the slow repair of a little ship.</p><button class="button button-primary" data-tour="rest">Rest · +${heal} hull, +10 stardust</button></div>`;
  }

  function mountCache(node, stage) {
    const rand = rng(run.seed + run.step * 131);
    const pool = shuffle(Object.keys(artifacts).filter(id => !run.artifacts.includes(id)), rand).slice(0, has('compass-of-halley') ? 4 : 3);
    stage.innerHTML = `<div class="tour-cache"><p class="eyebrow">CHOOSE ONE</p><div class="tour-cache-row">${pool.map(id => `<button class="tour-cache-card" data-artifact="${id}"><span>${artifacts[id].icon}</span><strong>${artifacts[id].name}</strong><small>${artifacts[id].text}</small></button>`).join('')}</div></div>`;
    stage.querySelectorAll('[data-artifact]').forEach(card => card.addEventListener('click', () => {
      const id = card.dataset.artifact;
      run.artifacts.push(id);
      toast(`${artifacts[id].name} joins the tour.`);
      finishNode('won', 20, `Drafted ${artifacts[id].name}.`);
    }));
  }

  // ── Mount / events ───────────────────────────────────────────────────────
  function mount(view) {
    if (view !== 'voyage') return;
    controller = new AbortController();
    const signal = controller.signal;
    if (run?.node) mountNode();
    // Centre the route chart on the current leg.
    const chart = $('.tour-chart'), currentStep = $('.tour-step.current');
    if (chart && currentStep) chart.scrollLeft = currentStep.offsetLeft - chart.clientWidth / 2 + currentStep.clientWidth / 2;
    main.addEventListener('click', event => {
      const nodeBtn = event.target.closest('[data-tour-node]');
      if (nodeBtn && !run.node) {
        const [s, i] = nodeBtn.dataset.tourNode.split(':').map(Number);
        if (s !== run.step || run.done[`${s}:${i}`]) return;
        run.node = run.map[s][i]; run.nodeKey = `${s}:${i}`;
        render(); mountNode();
        return;
      }
      const action = event.target.closest('[data-tour]')?.dataset.tour;
      if (!action) return;
      if (action === 'begin') begin();
      else if (action === 'resume') resume();
      else if (action === 'abandon') { store.active = null; run = null; save(); render(); }
      else if (action === 'leave') { if (run?.node) { finishNode('left', 0, `${nodeLabel(run.node).name}: passed by.`); } }
      else if (action === 'rest') {
        run.hull = Math.min(5, run.hull + (has('pressure-flask') ? 2 : 1));
        finishNode('won', 10, 'Rested at the halfway lantern.');
      }
      else if (action === 'arcade-start') {
        $('#tour-overlay').hidden = true;
        arcadeHandle?.start(); $('#tour-canvas')?.focus({ preventScroll: true });
      }
    }, { signal });
    main.addEventListener('keydown', event => {
      if (event.key === 'Escape' && run?.node && run.node.kind !== 'arcade' && !modal.open) { event.preventDefault(); finishNode('left', 0, `${nodeLabel(run.node).name}: passed by.`); }
    }, { signal });
  }
  function unmount() { teardown(); controller?.abort(); controller = null; }

  const P0 = window.AetherPuzzles;
  viewNames.voyage = 'The Grand Tour';
  renderers.voyage = renderVoyage;
  searchItems.push({ id: 'voyage', name: 'The Grand Tour', kind: 'page', subtitle: 'One voyage · every world', icon: 'meteor' });
  return { mount, unmount };
})();
