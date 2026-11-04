'use strict';

// The Grand Tour: a run-based expedition. Hunts are the core game; trials,
// drafts, chandlery and oddities reshape the build; the Umbral Maw waits at
// Neptune. Death resets the run; what persists is knowledge and new hulls.
window.AetherVoyage = (() => {
  const KEY = 'aether-grand-tour-v2';
  const $ = (s, r = main) => r.querySelector(s);
  const esc = escapeHTML;
  let controller, gameHandle = null, trialHandle = null;

  const I = window.AetherSkirmish.INSTRUMENTS;
  const HULLS = window.AetherSkirmish.HULLS;
  const SECTORS = window.AetherSkirmish.SECTORS;

  function rng(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
  function shuffle(arr, rand) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function readStore() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
    const r = raw.records && typeof raw.records === 'object' ? raw.records : {};
    return {
      records: {
        tours: Number.isInteger(r.tours) ? r.tours : 0,
        wins: Number.isInteger(r.wins) ? r.wins : 0,
        kills: Number.isInteger(r.kills) ? r.kills : 0,
        bestDust: Number.isInteger(r.bestDust) ? r.bestDust : 0,
        bossWins: Number.isInteger(r.bossWins) ? r.bossWins : 0,
      },
      active: raw.active && typeof raw.active === 'object' && Number.isInteger(raw.active.seed) ? raw.active : null,
    };
  }
  const store = readStore();
  let run = null;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} }
  function saveRun() {
    store.active = run ? {
      seed: run.seed, step: run.step, hull: run.hull, maxHull: run.maxHull, dust: run.dust,
      instruments: run.instruments, hullId: run.hullId, done: run.done, path: run.path, kills: run.kills,
    } : null;
    save();
  }
  const unlockedHull = id => !HULLS[id].unlock || (id === 'bell' && store.records.wins > 0) || (id === 'moth' && store.records.bossWins > 0);

  // The route. Fixed skeleton, seeded content — the chart is part of strategy.
  function buildMap(seed) {
    const rand = rng(seed);
    const trialDeck = shuffle(window.AetherTrials.list.filter(t => t.id !== 'asteroids').map(t => t.id), rand);
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
    if (!run && store.active) run = hydrate(store.active);
    if (run?.over) return renderRecap(false);
    if (run?.won) return renderRecap(true);
    if (run?.node) return renderNode();
    if (run) return renderChart();
    return renderLanding();
  }
  function hydrate(saved) {
    return { ...saved, node: null, nodeKey: null, map: buildMap(saved.seed), over: false, won: false };
  }

  function renderLanding() {
    return `<div class="view-enter tour-page"><section class="view-header"><div><p class="eyebrow">THE GRAND TOUR</p><h1>One skiff. Every world.</h1><p>A run from the Sun's doorstep to the Umbral Maw at Neptune. Hunts are the heart of it — but what you draft rewrites what everything else means. The skiff you lose is gone; what you learn is not.</p></div></section>
    <div class="tour-landing"><div>
      <p class="section-label">THE HANGAR · CHOOSE YOUR SKIFF</p>
      <div class="hangar">${Object.entries(HULLS).map(([id, h]) => {
        const open = unlockedHull(id);
        return `<button class="hangar-card ${open ? '' : 'locked'}" data-hull="${id}" ${open ? '' : 'disabled'} aria-pressed="${pendingHull === id}"><span class="hangar-ship hull-${id}" aria-hidden="true"><i></i></span><h3>${h.name}</h3><p>${h.desc}</p><dl><div><dt>PLATING</dt><dd>${h.hp}</dd></div><div><dt>SPEED</dt><dd>${Math.round(h.speed * 100)}%</dd></div><div><dt>BOLT</dt><dd>${h.boltDmg} / ${h.boltCd}s</dd></div></dl><span class="hangar-status">${open ? (pendingHull === id ? 'SELECTED ✦' : 'IN SERVICE') : `SEALED · ${h.unlock}`}</span></button>`;
      }).join('')}</div>
      <div class="tour-rules">
        <article><span class="chapter-number">Ⅰ</span><div><h3>Hunt</h3><p>Arena combat is the core. Move sharp, burst through the gap, read the wind-up. Threats are telegraphed; the blame is yours.</p></div></article>
        <article><span class="chapter-number">Ⅱ</span><div><h3>Draft</h3><p>Instruments change rules, not numbers. A Lodestone Coil drags hunts inward — and bends the trials too.</p></div></article>
        <article><span class="chapter-number">Ⅲ</span><div><h3>Arrive</h3><p>Trials pay hull and dust. The chandlery sells instruments. The Maw waits at Neptune. Death resets the run.</p></div></article>
      </div></div>
    <aside class="tour-manifest"><p class="eyebrow">THE LEDGER</p><dl><div><dt>Tours flown</dt><dd>${store.records.tours}</dd></div><div><dt>Maw victories</dt><dd>${store.records.bossWins}</dd></div><div><dt>Best haul</dt><dd>${store.records.bestDust} stardust</dd></div><div><dt>Threats cleared</dt><dd>${store.records.kills}</dd></div></dl>
    ${store.active ? '<p class="tour-resume-note">A tour is already underway.</p><button class="button button-primary" data-tour="resume">Resume ↗</button><button class="button" data-tour="abandon">Abandon it</button>' : '<button class="button button-primary tour-begin" data-tour="begin">Choose a skiff &amp; set out →</button>'}</aside></div></div>`;
  }

  function renderChart() {
    const sectorIdx = Math.min(2, Math.floor(run.step / 4));
    return `<div class="view-enter tour-page"><section class="view-header tour-header"><div><p class="eyebrow">THE GRAND TOUR · ${SECTORS[sectorIdx].name.toUpperCase()}</p><h1>Leg ${run.step + 1} of 12.</h1></div><div class="tour-vitals"><span class="tour-hull" aria-label="Hull ${run.hull} of ${run.maxHull}">${'♥'.repeat(run.hull)}${'♡'.repeat(Math.max(0, run.maxHull - run.hull))}</span><span class="tour-dust">✦ ${run.dust}</span></div></section>
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
    return `<div class="view-enter tour-page"><section class="view-header tour-header"><div><p class="eyebrow">${label.name.toUpperCase()}</p><h1>${label.detail}.</h1><p class="tour-node-brief">${nodeBrief(node)}</p></div><div class="tour-vitals"><span class="tour-hull">${'♥'.repeat(run.hull)}</span><span class="tour-dust">✦ ${run.dust}</span></div></section>
    <div id="tour-stage" class="tour-stage"></div>
    <div class="tour-node-actions">${node.kind !== 'boss' ? '<button class="button" data-tour="leave">← Chart another course</button>' : ''}</div></div>`;
  }
  function nodeBrief(node) {
    switch (node.kind) {
      case 'hunt': return 'Clear every wave. Stardust motes drift off what falls. Failure costs a hull.';
      case 'trial': return window.AetherTrials.list.find(t => t.id === node.trial).brief + ' Win it for salvage; lose it for a hull.';
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
    <dl class="tour-stats"><div><dt>Stardust banked</dt><dd>✦ ${run.dust}</dd></div><div><dt>Threats cleared</dt><dd>${run.kills}</dd></div><div><dt>Legs resolved</dt><dd>${Object.values(run.done).filter(v => v === 'won').length} / 12</dd></div><div><dt>Instruments carried</dt><dd>${run.instruments.length ? run.instruments.map(id => I[id].name).join(' · ') : 'None'}</dd></div></dl>
    <div class="tour-recap-actions"><button class="button button-primary" data-tour="begin">Set out again →</button><button class="button" data-tour="journal">Save the logbook to the field journal</button><a class="button" href="#planetarium">Back to the atlas</a></div>
    ${run.path.length ? `<details class="tour-log" open><summary>The logbook</summary>${run.path.map(line => `<p>${esc(line)}</p>`).join('')}</details>` : ''}</section></div>`;
  }

  // ── Run flow ─────────────────────────────────────────────────────────────
  let pendingHull = 'kite';
  function begin() {
    teardown();
    // Hull choice happens on the landing page; default kite.
    const hullId = unlockedHull(pendingHull) ? pendingHull : 'kite';
    run = { seed: Math.floor(Math.random() * 0xffffffff), step: 0, hull: HULLS[hullId].hp > 60 ? 4 : 3, maxHull: HULLS[hullId].hp > 60 ? 4 : 3, dust: 0, instruments: [], hullId, kills: 0, done: {}, path: [], node: null, nodeKey: null, map: null, over: false, won: false };
    run.map = buildMap(run.seed);
    store.records.tours++;
    store.active = null;
    saveRun(); save();
    render();
    toast(`The ${HULLS[hullId].name} lifts off. First contact ahead.`);
  }
  function teardown() { gameHandle?.destroy(); gameHandle = null; trialHandle?.destroy(); trialHandle = null; }

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
    render();
  }
  function loseHull(reason) {
    run.hull = Math.max(0, run.hull - 1);
    run.path.push(reason);
    toast(reason);
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

  function mountHunt(node, stage) {
    stage.innerHTML = `<div class="tour-hunt-frame"></div>`;
    const isBoss = node.kind === 'boss';
    gameHandle = window.AetherSkirmish.create($('.tour-hunt-frame', stage), {
      sector: node.sector ?? 2, elite: node.elite, boss: isBoss, hull: run.hullId, instruments: run.instruments,
      seed: run.seed + run.step * 977,
      onEnd({ won, dust, kills }) {
        run.kills += kills;
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
      speedScale: has('lodestone-chart') ? .85 : 1,
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
    $('.trial-frame canvas', stage)?.focus({ preventScroll: true });
  }

  function mountOddity(node, stage) {
    const o = oddities[node.oddity];
    stage.innerHTML = `<div class="tour-oddity"><p class="eyebrow">AN ODDITY</p><h2>${o.title}</h2><p>${o.text}</p><div class="tour-recap-actions">${o.choices.map((c, i) => `<button class="button ${i === 0 ? 'button-primary' : ''}" data-oddity="${i}">${c[0]}<small>${c[1]}</small></button>`).join('')}</div></div>`;
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
    stage.innerHTML = `<div class="tour-cache"><p class="eyebrow">THE CHANDLERY</p><p class="tour-node-brief" style="margin:0 auto 18px;max-width:480px">Stardust for steel and glass. The keeper wraps everything in brown paper.</p><div class="tour-cache-row">${pool.map((id, i) => `<button class="tour-cache-card" data-buy="${id}" data-price="${prices[i]}" ${run.dust < prices[i] ? 'disabled' : ''}><span>${I[id].icon}</span><strong>${I[id].name}</strong><small>${I[id].text} <em>${I[id].trialNote}</em></small><b>✦ ${prices[i]}</b></button>`).join('')}<button class="tour-cache-card repair" data-buy="repair" data-price="40" ${run.dust < 40 || run.hull >= run.maxHull ? 'disabled' : ''}><span>⚒</span><strong>Hull repair</strong><small>Patch one heart of plating back on.</small><b>✦ 40</b></button></div></div>`;
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
    stage.innerHTML = `<div class="tour-cache"><p class="eyebrow">${run.freeInstrument ? 'THE STATIC RESOLVES' : 'AN INSTRUMENT DRAFT'}</p><p class="tour-node-brief" style="margin:0 auto 18px;max-width:480px">Free of charge. Choose the rule you want the sky to obey.</p><div class="tour-cache-row">${pool.map(id => `<button class="tour-cache-card" data-draft="${id}"><span>${I[id].icon}</span><strong>${I[id].name}</strong><small>${I[id].text} <em>${I[id].trialNote}</em></small></button>`).join('')}</div></div>`;
    if (run.freeInstrument) run.freeInstrument = false;
    stage.querySelectorAll('[data-draft]').forEach(card => card.addEventListener('click', () => {
      run.instruments.push(card.dataset.draft);
      applyInstrument(card.dataset.draft);
      toast(`${I[card.dataset.draft].name} joins the build.`);
      finishNode('won', `Drafted ${I[card.dataset.draft].name}.`);
    }));
  }

  function applyInstrument(id) {
    if (id === 'ironwood-ribs') { run.maxHull++; run.hull = Math.min(run.maxHull, run.hull + 1); }
  }

  function mountSanctuary(stage) {
    stage.innerHTML = `<div class="tour-refuge"><div class="refuge-lantern" aria-hidden="true">☕</div><h2>The kettle is already on.</h2><p>+1 hull, +15 stardust. The relay can wait one quiet minute.</p><button class="button button-primary" data-tour="rest">Rest here</button></div>`;
  }

  // ── Mount / events ───────────────────────────────────────────────────────
  function mount(view) {
    if (view !== 'voyage') return;
    controller = new AbortController();
    const signal = controller.signal;
    if (run?.node) mountNode();
    const chart = $('.tour-chart'), currentStep = $('.tour-step.current');
    if (chart && currentStep) chart.scrollLeft = currentStep.offsetLeft - chart.clientWidth / 2 + currentStep.clientWidth / 2;
    main.addEventListener('click', event => {
      const hullCard = event.target.closest('[data-hull]');
      if (hullCard && !run) {
        pendingHull = hullCard.dataset.hull;
        document.querySelectorAll('.hangar-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
        hullCard.classList.add('selected'); hullCard.setAttribute('aria-pressed', 'true');
        toast(`${HULLS[pendingHull].name}, fuelled and waiting.`);
        return;
      }
      const nodeBtn = event.target.closest('[data-tour-node]');
      if (nodeBtn && !run.node) {
        const [s, i] = nodeBtn.dataset.tourNode.split(':').map(Number);
        if (s !== run.step || run.done[`${s}:${i}`]) return;
        run.node = run.map[s][i]; run.nodeKey = `${s}:${i}`;
        render(); return;
      }
      const action = event.target.closest('[data-tour]')?.dataset.tour;
      if (!action) return;
      if (action === 'begin') begin();
      else if (action === 'resume') { if (store.active) { run = hydrate(store.active); render(); } }
      else if (action === 'abandon') { store.active = null; run = null; save(); render(); }
      else if (action === 'leave' && run?.node) finishNode('left', `${nodeLabel(run.node).name}: passed by.`);
      else if (action === 'rest') { run.hull = Math.min(run.maxHull, run.hull + 1); run.dust += Math.round(15 * dustMul()); finishNode('won', 'Rested at the sanctuary. +1 hull, +15 dust.'); }
      else if (action === 'salvage-hull') { run.hull = Math.min(run.maxHull, run.hull + 1); finishNode('won', 'Salvaged plating from the trial. +1 hull.'); }
      else if (action === 'salvage-dust') { run.dust += Math.round(60 * dustMul()); finishNode('won', 'Took the dust and ran. +60.'); }
      else if (action === 'journal') {
        const body = `THE GRAND TOUR — ${run.won ? 'COMPLETED' : 'LOST AT SEA'}\nSkiff: ${HULLS[run.hullId].name}\nStardust: ${run.dust} · Threats cleared: ${run.kills}\n\n${run.path.join('\n')}`;
        state.journal.unshift({ id: crypto.randomUUID(), title: run.won ? 'Neptune, in person' : 'The sky kept the rest', body, subject: 'The Grand Tour', date: dateKey(new Date()) });
        persist(); toast('The logbook is pressed into the field journal.');
      }
    }, { signal });
  }
  function unmount() { teardown(); controller?.abort(); controller = null; }

  viewNames.voyage = 'The Grand Tour';
  renderers.voyage = renderVoyage;
  searchItems.push({ id: 'voyage', name: 'The Grand Tour', kind: 'page', subtitle: 'A run to Neptune', icon: 'meteor' });
  return { mount, unmount };
})();
