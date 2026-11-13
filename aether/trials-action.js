'use strict';

// Two action trials for the Grand Tour's extension shelf.
//   Constellation Chain — a comet guarded by its own train of star-motes.
//   Perihelion Run — a hold-to-dive slalom through the comet's tail.
// Same contract as trials.js: create(container, options) → handle,
// options.onEnd({won, score}) exactly once, shortly after a final flourish.
(() => {
  const AT = window.AetherTrials;
  if (!AT) return;
  const { frame, TAU, clamp, reduced } = AT;
  const HUD = '600 13px "DM Sans"';
  const SERIF = '24px "IM Fell English", Georgia, serif';
  const SMALL = '12px "DM Sans"';

  // ── The wandering stars · Constellation Chain ─────────────────────────
  // Steer the comet head; the chain of motes trails behind and every link
  // fires on the nearest shard. The chain is the ship's health.
  function chainGame(container, options = {}) {
    const W = 900, H = 560, SP = 26, LINK_CAP = 18;
    const verbs = options.verbs || new Set();
    const scale = clamp(Number(options.speedScale) || 1, .25, 3);
    const onEnd = options.onEnd || (() => {});
    let head = { x: 450, y: 300, dx: 1, dy: 0 };
    let links = [], shards = [], bolts = [], motes = [], arcs = [];
    for (let i = 0; i < 5; i++) links.push({ x: 450 - (i + 1) * SP, y: 300, cool: .16 * (i + 1) });
    let broken = 0, over = 0, shake = 0, moteAt = 3;
    // Gameplay has its own random stream; drawing/audio never consume it.
    // A daily vigil without an explicit seed derives one from the date, so
    // every attempt that day deals the same spawns and relic offers.
    let seed = 211;
    for (const c of String(options.seed ?? (options.daily ? new Date().toISOString().slice(0, 10) : 211))) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const FORMATIONS = {
      ribbon: { name: 'Ribbon', hint: 'Long trailing chain · 350 range · steady fire', range: 350, rate: .8 },
      halo: { name: 'Halo', hint: 'Compact orbit · 245 range · faster fire, slower steering', range: 245, rate: .62 },
      spear: { name: 'Spear', hint: 'Forward wedge · 440 range · twin-strength, slower bolts', range: 440, rate: 1.15 },
    };
    const RELICS = {
      fork: ['Twin stars', 'Links also fire at a second nearby target. Higher ranks add targets.'],
      pierce: ['Needle light', 'Bolts pierce one extra enemy per rank. Spear bolts can pierce the screen.'],
      magnet: ['Gathering orbit', 'Head and links gather motes from farther away: 65 / 90 / 115 units.'],
      ward: ['Astral aegis', 'Absorb a hit without losing a link. Recharges in 8 / 6 / 4 seconds.'],
      bloom: ['Life nova', 'Each pickup restores an extra link and bursts nearby shards: 4 / 6 / 8 damage.'],
      haste: ['Solar sails', 'Move 14% faster per rank; moving also increases firing speed.'],
      frost: ['Winter thread', 'Bolts slow enemies for 0.7 / 1.0 / 1.3 seconds.'],
      nova: ['Pulse heart', 'Space or Pulse: clear nearby threats. Radius 150 / 175 / 200; cooldown 6 / 5 / 4s.'],
      // Veteran refits add build-defining formation arts without diluting the
      // standard draft pool (or changing its seeded offer order).
      ...(options.veteran ? {
        relay: ['Counterpoint spindle', 'Switch formation: every link fires a free volley and phases for 0.35 / 0.45 / 0.55s. Recharges in 8 / 7 / 6s.'],
        lodestar: ['Lodestar clasp', 'Hold one formation for 3.5 / 3 / 2.5s to attune: Ribbon links gather motes, Halo shatters drifts, Spear gains 1 / 2 / 3 pierce. Switching resets it.'],
      } : {}),
    };
    const ROUTE_BASE = [
      { name: 'Drift nursery', hint: 'Gather teal motes. Your links are both weapons and health.', events: [[0, 'drift', 2], [3, 'drift', 2], [6, 'drift', 3]] },
      { name: 'Scissor crossing', hint: 'Dashed lanes lock before firing. Move across them, not along them.', events: [[0, 'cross', 3], [4, 'cross', 3], [8, 'cross', 4]] },
      { name: 'The Needle keeper', hint: 'The diamond aims, charges, then rests. Sidestep its locked line.', events: [[0, 'elite', 1], [3, 'drift', 3], [7, 'cross', 2]] },
      { name: 'Broken crown', hint: 'Two keepers cross the field. Orbit around them; recover in their wake.', events: [[0, 'elite', 1], [2, 'cross', 3], [5, 'elite', 1], [8, 'drift', 4]] },
      { name: 'The Unraveller', hint: 'Dodge the marked cross. Attack the open core between sweeps.', events: [[0, 'boss', 1]] },
    ];
    const VETERAN_ROUTE = [
      { name: 'Aurora crossing', hint: 'A siphon harvests free motes unless you collect or cast through it. Warden lines lock before they sever. Save E Link Lattice for a live line.', events: [[0, 'warden', 1], [1.5, 'siphon', 1], [3, 'cross', 2], [6, 'drift', 3]] },
      { name: 'Twin needle', hint: 'Keepers and a mote siphon compete for your attention. Spend a tail link with Q, then recover the kill’s mote.', events: [[0, 'elite', 1], [1.5, 'siphon', 1], [2, 'warden', 1], [5, 'elite', 1], [8, 'drift', 3]] },
      { name: 'Falling choir', hint: 'A Deacon tether wards its ally. Cross the thread with your chain or Star Cast through it while wardens pin recovery and the siphon feeds.', events: [[0, 'drift', 3], [1, 'deacon', 1], [2, 'warden', 1], [3, 'siphon', 1], [4, 'cross', 2], [6, 'drift', 4], [9, 'warden', 1]] },
      { name: 'Splintered orbit', hint: 'Two wardens hold opposite poles while a siphon feeds. Break a harvest with Star Cast or deny its marked mote.', events: [[0, 'warden', 1], [.8, 'deacon', 1], [1, 'elite', 1], [2, 'siphon', 1], [3, 'warden', 1], [5, 'cross', 3], [8, 'drift', 4]] },
      { name: 'The Unraveller ascendant', hint: 'Three spokes lock around your last position. At half health its Black Office calls two warding Deacons: sever them, then strike the open ivory core.', events: [[0, 'boss', 1]] },
    ];
    const ROUTE = options.veteran ? VETERAN_ROUTE : ROUTE_BASE;
    const startEncounter = clamp(Math.floor(Number(options.startEncounter) || 0), 0, ROUTE.length - 1);
    let phase = 'ready', encounter = startEncounter, circuit = 1, elapsed = 0, eventIndex = 0, formation = 'ribbon';
    let invuln = 0, ward = 0, wardTime = 0, pulseTime = 0, moving = false, surge = false, orbitA = 0, tickN = 0;
    let relayTime = 0, relayCount = 0, attune = 0, attuned = false;
    let castTime = 0, castCount = 0, castRefunds = 0, castBursts = 0, siphonSteals = 0, siphonDenials = 0;
    let dedication = options.veteran ? 1 : 0, latticeTime = 0, latticeCount = 0, latticeSevers = 0, latticeKills = 0, tetherSevers = 0, tetherRewards = 0, officeSevers = 0;
    let routeVow = 'unsworn', routeBonus = 0, routeEventSpawned = false, bossTransitions = 0;
    let hazards = [], choices = [], relics = {}, draftCount = 0, shotsFired = 0, collected = 0, destroyed = false;
    const level = id => relics[id] || 0;
    const keys = new Set();
    let pointer = null;
    const g = frame(container, W, H, {
      label: 'Constellation Chain. Five encounters and four relic drafts. Steer with the pointer, WASD or arrows. F changes formation. Space uses an equipped Pulse heart.' + (options.veteran ? ' Q casts away the tail link as a formation-specific weapon. Cross Deacon tethers with your chain to expose their ally. E spends Dedication on Link Lattice: your formation damages contacts and severs hostile beams, but steering slows. After the second encounter choose the safer Ivory Via or the rewarded Oxblood Via.' : '') + ' P pauses. Choose relics with buttons or 1, 2, 3.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(211, 70);
    const controls = document.createElement('section');
    controls.className = 'chain-controls';
    controls.setAttribute('aria-label', 'Constellation Chain controls');
    const status = document.createElement('p'); status.className = 'chain-status';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    let tacticalStatus;
    const formations = document.createElement('div'); formations.className = 'chain-formations';
    formations.setAttribute('role', 'group'); formations.setAttribute('aria-label', 'Formation');
    const draft = document.createElement('div'); draft.className = 'chain-draft';
    draft.setAttribute('role', 'group'); draft.setAttribute('aria-label', 'Safe refit: choose a relic');
    const build = document.createElement('p'); build.className = 'chain-build';
    tacticalStatus = build; tacticalStatus.dataset.chainTactical = '';
    const pulseButton = document.createElement('button'); pulseButton.type = 'button';
    pulseButton.dataset.chainPulse = ''; pulseButton.textContent = 'Pulse · Space'; pulseButton.hidden = true;
    const castButton = document.createElement('button'); castButton.type = 'button';
    castButton.dataset.chainCast = ''; castButton.hidden = !options.veteran;
    castButton.title = 'Star Cast sacrifices your last link. Ribbon seeks, Halo bursts on impact, Spear pierces with heavy damage. Each cast kill leaves a mote so skilled recovery can repay the link.';
    const latticeButton = document.createElement('button'); latticeButton.type = 'button';
    latticeButton.dataset.chainLattice = ''; latticeButton.hidden = !options.veteran;
    latticeButton.title = 'Spend one Dedication on a three-second Link Lattice. Every chain link damages touching enemies and severs live beams or scissor blades. Ribbon covers a long trail, Halo a close ring, Spear a heavy forward wedge. Steering slows while active.';
    controls.append(status, formations, build, pulseButton);
    if (options.veteran) controls.append(castButton, latticeButton);
    controls.append(draft); container.append(controls);
    for (const [id, info] of Object.entries(FORMATIONS)) {
      const button = document.createElement('button'); button.type = 'button';
      button.dataset.chainFormation = id; button.innerHTML = `<span class="upgrade-icon-wrap">${window.AetherIcons.upgrade(id)}</span><span class="upgrade-copy">${info.name} — ${info.hint}</span>`;
      button.setAttribute('aria-pressed', String(id === formation)); formations.append(button);
      listen(button, 'click', () => setFormation(id));
    }
    listen(pulseButton, 'click', () => { pulse(); canvas.focus({ preventScroll: true }); });
    listen(castButton, 'click', () => { starCast(); canvas.focus({ preventScroll: true }); });
    listen(latticeButton, 'click', () => { linkLattice(); canvas.focus({ preventScroll: true }); });
    // Delegate draft events so a long endless run does not accumulate listeners.
    listen(draft, 'click', e => {
      const button = e.target.closest('button');
      if (!button || !draft.contains(button)) return;
      if (button.hasAttribute('data-chain-start')) launch();
      else if (button.dataset.chainChoice) choose(button.dataset.chainChoice);
    });
    const frameDestroy = g.destroy;
    g.destroy = () => { if (destroyed) return; destroyed = true; controls.remove(); frameDestroy(); };
    const framePause = g.pause, frameResume = g.resume;
    g.pause = () => { framePause(); clearInput(); syncControls(); };
    g.resume = () => { frameResume(); syncControls(); };
    // Read-only diagnostics for the cabinet and browser regression runner.
    Object.defineProperty(g, 'state', { get: () => ({
      phase, encounter: encounter + 1, circuit, elapsed, formation, veteran: !!options.veteran, relics: { ...relics },
      range: FORMATIONS[formation].range, draft: !draft.hidden,
      links: links.length, linkPositions: links.map(l => ({ x: l.x, y: l.y })), head: { ...head }, choices: [...choices],
      enemies: shards.map(s => ({ x: s.x, y: s.y, hp: s.hp, kind: s.kind, mode: s.mode, r: s.r, slow: s.slow, timer: s.timer, aim: s.aim, maxHp: s.maxHp, stage: s.stage || 0, officeOpened: !!s.officeOpened, tetherBroken: s.tetherBroken || 0, severRewarded: !!s.severRewarded, officeSevered: !!s.officeSevered, tetherTarget: s.tetherTarget ? { x: s.tetherTarget.x, y: s.tetherTarget.y, kind: s.tetherTarget.kind } : null, warded: !!s.wardedBy, harvests: s.harvests || 0, harvestTarget: s.targetMote && motes.includes(s.targetMote) ? { x: s.targetMote.x, y: s.targetMote.y } : null })),
      boss: shards.find(s => s.kind === 'boss')?.hp ?? 0,
      bossWarded: !!shards.find(s => s.kind === 'boss' && !s.officeOpened)?.wardedBy,
      bossObjectiveOpen: !!shards.find(s => s.kind === 'boss')?.officeOpened,
      bossMode: shards.find(s => s.kind === 'boss')?.mode ?? '', bossStage: shards.find(s => s.kind === 'boss')?.stage ?? 0, bossTransitions, bossPattern: options.veteran ? 'braid' : 'cross',
      hazards: hazards.map(h => ({ x: h.x, y: h.y, dx: h.dx, dy: h.dy, warning: h.warning, width: h.width, kind: h.kind || 'lane', life: h.life ?? 0, length: h.length ?? 0 })),
      motes: motes.map(m => ({ x: m.x, y: m.y, cast: !!m.cast })),
      bolts: bolts.map(b => ({ x: b.x, y: b.y, damage: b.damage, pierce: b.pierce, lodestar: !!b.lodestar, cast: b.cast || '' })),
      shotsFired, collected, draftCount, ward, pulseTime, broken, over, invuln,
      relayTime, relayCount, attune, attuned, castTime, castCount, castRefunds, castBursts, siphonSteals, siphonDenials, routeNames: ROUTE.map(r => r.name),
      dedication, latticeTime, latticeCount, latticeSevers, latticeKills, tetherSevers, tetherRewards, officeSevers, routeVow, routeBonus,
    }) });
    // The same headline diagnostics mirrored onto the canvas as dataset
    // attributes so browser tests can wait on them without polling JS.
    function syncDataset() {
      canvas.dataset.chainPhase = phase;
      canvas.dataset.chainEncounter = String(encounter + 1);
      canvas.dataset.chainCircuit = String(circuit);
      canvas.dataset.chainRouteLength = String(ROUTE.length);
      canvas.dataset.chainRoute = ROUTE[encounter].name;
      canvas.dataset.chainSpeedScale = String(scale);
      canvas.dataset.chainFormation = formation;
      canvas.dataset.chainRange = String(FORMATIONS[formation].range);
      canvas.dataset.chainLinks = String(links.length);
      canvas.dataset.chainRelics = Object.entries(relics).map(([id, rank]) => `${id}:${rank}`).join(',');
      canvas.dataset.chainDraft = draft.hidden ? 'closed' : 'open';
      canvas.dataset.chainBoss = String(Math.round(shards.find(s => s.kind === 'boss')?.hp ?? 0));
      canvas.dataset.chainBossMode = shards.find(s => s.kind === 'boss')?.mode ?? '';
      canvas.dataset.chainBossPattern = options.veteran ? 'braid' : 'cross';
      canvas.dataset.chainBroken = String(broken);
      canvas.dataset.chainWard = String(ward);
      canvas.dataset.chainCollected = String(collected);
      canvas.dataset.chainRelay = relayTime > 0 ? relayTime.toFixed(2) : 'ready';
      canvas.dataset.chainRelayCount = String(relayCount);
      canvas.dataset.chainAttuned = String(attuned);
      canvas.dataset.chainWardens = String(shards.filter(s => s.kind === 'warden').length);
      canvas.dataset.chainCast = castTime > 0 ? castTime.toFixed(2) : 'ready';
      canvas.dataset.chainCastCount = String(castCount); canvas.dataset.chainCastRefunds = String(castRefunds); canvas.dataset.chainCastBursts = String(castBursts);
      canvas.dataset.chainSiphons = String(shards.filter(s => s.kind === 'siphon').length);
      canvas.dataset.chainSiphonSteals = String(siphonSteals); canvas.dataset.chainSiphonDenials = String(siphonDenials);
      canvas.dataset.chainDedication = String(dedication); canvas.dataset.chainLattice = latticeTime > 0 ? 'active' : dedication > 0 ? 'ready' : 'empty';
      canvas.dataset.chainLatticeTime = latticeTime.toFixed(3); canvas.dataset.chainLatticeCount = String(latticeCount);
      canvas.dataset.chainLatticeSevers = String(latticeSevers); canvas.dataset.chainLatticeKills = String(latticeKills);
      canvas.dataset.chainTetherSevers = String(tetherSevers); canvas.dataset.chainTetherRewards = String(tetherRewards); canvas.dataset.chainDeacons = String(shards.filter(s => s.kind === 'deacon').length);
      canvas.dataset.chainRouteVow = routeVow; canvas.dataset.chainRouteBonus = String(routeBonus);
      canvas.dataset.chainBossStage = String(shards.find(s => s.kind === 'boss')?.stage || 0); canvas.dataset.chainBossTransitions = String(bossTransitions);
      canvas.dataset.chainBossWarded = String(!!shards.find(s => s.kind === 'boss' && !s.officeOpened)?.wardedBy); canvas.dataset.chainBossObjective = shards.find(s => s.kind === 'boss')?.stage === 2 && !shards.find(s => s.kind === 'boss')?.officeOpened ? 'sever-both' : 'open';
      canvas.dataset.chainOfficeSevers = String(officeSevers);
    }
    canvas.style.touchAction = 'none';
    try { canvas.focus({ preventScroll: true }); } catch { canvas.focus(); }

    const score = () => broken * 100 + links.length * 20 + draftCount * 250 + routeBonus + (over > 0 ? 1000 : 0);

    function clearInput() { keys.clear(); pointer = null; }
    function syncControls() {
      for (const button of controls.querySelectorAll('button')) button.disabled = g.paused || !!over || destroyed;
      pulseButton.hidden = !level('nova');
      pulseButton.disabled = g.paused || phase !== 'combat' || pulseTime > 0 || !!over;
      pulseButton.textContent = pulseTime > 0 ? `Pulse · ${Math.ceil(pulseTime)}s` : 'Pulse ready · Space';
      castButton.disabled = !options.veteran || g.paused || phase !== 'combat' || castTime > 0 || links.length <= 1 || !!over;
      castButton.textContent = castTime > 0 ? `Star Cast · ${castTime.toFixed(1)}s` : `Q · Star Cast (${formation}) · spend 1 link`;
      latticeButton.disabled = !options.veteran || g.paused || phase !== 'combat' || latticeTime > 0 || dedication < 1 || !!over;
      latticeButton.setAttribute('aria-pressed', String(latticeTime > 0));
      latticeButton.textContent = latticeTime > 0 ? `E · Link Lattice ${latticeTime.toFixed(1)}s` : `E · Link Lattice · ${dedication}/3 Dedication`;
      for (const button of formations.children) button.setAttribute('aria-pressed', String(button.dataset.chainFormation === formation));
      const arts = [];
      if (level('relay')) arts.push(`Counterpoint ${relayTime > 0 ? `${Math.ceil(relayTime)}s` : 'ready'}`);
      if (level('lodestar')) arts.push(attuned ? `${FORMATIONS[formation].name} attuned` : `Attunement ${Math.round(clamp(attune / (4 - .5 * level('lodestar')), 0, 1) * 100)}%`);
      const buildCopy = `Build: ${Object.entries(relics).map(([id, rank]) => `${RELICS[id][0]} ${rank}`).join(' · ') || 'Choose your formation; relics arrive after each encounter.'}${arts.length ? ` · ${arts.join(' · ')}` : ''}${options.veteran ? ` · ${routeVow === 'unsworn' ? 'Via unchosen' : `${routeVow} Via`} · Lattice ${dedication}/3` : ''}`;
      const boss = shards.find(s => s.kind === 'boss');
      tacticalStatus.textContent = [
        `Chain ${links.length}/${LINK_CAP}`,
        `${FORMATIONS[formation].name} formation`,
        level('nova') ? pulseTime > 0 ? `Pulse ${pulseTime.toFixed(1)}s` : 'Pulse ready' : 'Gather motes to reweave',
        ...(options.veteran ? [
          `Dedication ${dedication}/3`,
          latticeTime > 0 ? `Lattice ${latticeTime.toFixed(1)}s` : dedication > 0 ? 'Lattice ready (E)' : 'Lattice needs a sever/kill',
          castTime > 0 ? `Star Cast ${castTime.toFixed(1)}s` : 'Star Cast ready (Q · costs 1 link)',
          `${routeVow} Via · route bonus ${routeBonus}`,
          `Tethers severed ${tetherSevers}`,
        ] : []),
        ...(boss ? [`Unraveller stage ${boss.stage || 1}/2 · ${boss.mode}${boss.wardedBy ? ' · Deacon ward' : ''}`] : []),
      ].join(' · ');
      tacticalStatus.textContent = `${buildCopy} · ${tacticalStatus.textContent}`;
      syncDataset();
    }
    function setFormation(id) {
      if (g.paused || over || destroyed || !FORMATIONS[id]) return;
      const changed = formation !== id;
      formation = id;
      if (changed) {
        attune = 0; attuned = false;
        if (phase === 'combat') triggerRelay();
      }
      tone(540, .06, 'sine', .03); syncControls();
    }
    function addLinks(n) {
      for (let k = 0; k < n && links.length < LINK_CAP; k++) {
        const tail = links[links.length - 1] || head;
        links.push({ x: tail.x, y: tail.y, cool: .2 + links.length * .08 });
      }
    }
    function showDraft(initial = false) {
      phase = initial ? 'ready' : 'draft'; clearInput();
      shards = []; bolts = []; hazards = []; arcs = []; motes = [];
      draft.replaceChildren(); draft.hidden = false;
      const heading = document.createElement('h3');
      heading.textContent = initial ? 'Weave your constellation' : `Safe refit · encounter ${encounter + 1} cleared`;
      const description = document.createElement('p');
      description.textContent = initial
        ? `Five authored encounters. Every link fires and shields you. Choose a formation, then launch. F switches formation in flight.${options.veteran ? ' Veteran: Q sacrifices a tail link for a Star Cast. Cross Deacon tethers with the chain; E spends Dedication on a beam-severing Link Lattice. A route vow follows the second encounter.' : ''}`
        : options.veteran && encounter === 1 && routeVow === 'unsworn' ? 'Choose the next two encounters’ route. Ivory restores links and grants a shield; Oxblood adds a Deacon and two drift shards to each encounter, but every clear earns 250 bonus score.'
        : `Chain restored to ${links.length} links. No threats advance here. Choose one permanent relic, then face ${ROUTE[(encounter + 1) % ROUTE.length].name}.`;
      draft.append(heading, description);
      if (initial) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.chainStart = '';
        button.textContent = 'Launch · Enter'; draft.append(button); choices = [];
      } else if (options.veteran && encounter === 1 && routeVow === 'unsworn') {
        choices = ['via-ivory', 'via-oxblood'];
        const vias = {
          'via-ivory': ['Ivory Via', 'Restore three links and gain a reserve shield. Fewer threats, no route score bonus.'],
          'via-oxblood': ['Oxblood Via', 'Each remaining non-boss encounter adds one Deacon and two drift shards. Every clear earns +250 score.'],
        };
        choices.forEach((id, i) => {
          const button = document.createElement('button'); button.type = 'button'; button.dataset.chainChoice = id;
          button.innerHTML = `<span class="upgrade-icon-wrap">${window.AetherIcons.upgrade(id === 'via-ivory' ? 'aegis' : 'needle')}</span><span class="upgrade-copy">${i + 1}. ${vias[id][0]} — ${vias[id][1]}</span>`;
          draft.append(button);
        });
      } else {
        const pool = Object.keys(RELICS).filter(id => level(id) < 3);
        // Fisher–Yates is deterministic and consumes no cosmetic randomness.
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        choices = pool.slice(0, 3);
        // The first veteran refit always teaches both new formation builds;
        // the third offer and every later draft still come from the seed.
        if (options.veteran && draftCount === 0) {
          const featured = ['relay', 'lodestar'].filter(id => pool.includes(id));
          choices = [...featured, ...choices.filter(id => !featured.includes(id))].slice(0, 3);
        }
        for (const id of ['mend', 'guard', 'surge']) if (choices.length < 3) choices.push(id);
        const supplies = { mend: ['Reweave', 'Restore four additional links.'], guard: ['Reserve shield', 'Absorb the next impact.'], surge: ['Solar charge', 'Fire 30% faster in the next encounter.'] };
        choices.forEach((id, i) => {
          const button = document.createElement('button'); button.type = 'button'; button.dataset.chainChoice = id;
          const info = RELICS[id] || supplies[id];
          const iconId=RELICS[id]?({relay:'echo',lodestar:'compass'}[id]||id):({mend:'bloom',guard:'aegis',surge:'energy'})[id];
          button.innerHTML = `<span class="upgrade-icon-wrap">${window.AetherIcons.upgrade(iconId)}</span><span class="upgrade-copy">${i + 1}. ${info[0]}${RELICS[id] ? ` · rank ${level(id) + 1}/3` : ''} — ${info[1]}</span>`;
          draft.append(button);
        });
      }
      status.textContent = initial ? 'Choose a formation and launch when ready.' : description.textContent;
      syncControls();
      if (!initial && document.hasFocus()) draft.querySelector('button')?.focus({ preventScroll: true });
    }
    function choose(id) {
      if (phase !== 'draft' || g.paused || destroyed || !choices.includes(id)) return;
      if (RELICS[id]) relics[id] = level(id) + 1;
      else if (id === 'mend') addLinks(4);
      else if (id === 'guard') ward = 1;
      else if (id === 'surge') surge = true;
      else if (id === 'via-ivory') { routeVow = 'ivory'; addLinks(3); ward = 1; wardTime = 0; }
      else if (id === 'via-oxblood') routeVow = 'oxblood';
      if (id === 'ward') { ward = 1; wardTime = 0; }
      draftCount++; encounter++;
      if (encounter === ROUTE.length) { encounter = 0; circuit++; }
      launch();
    }
    function launch() {
      if (destroyed || g.paused || over || phase === 'combat') return;
      phase = 'combat'; elapsed = 0; eventIndex = 0; moteAt = 2.2; invuln = 1.5;
      pulseTime = 0; relayTime = 0; castTime = 0; latticeTime = 0; routeEventSpawned = false; attune = 0; attuned = false; clearInput(); draft.hidden = true;
      head.x = 450; head.y = 320; head.dx = 1; head.dy = 0;
      links.forEach((l, i) => { l.x = head.x - (i + 1) * SP; l.y = head.y; l.cool = .1 * i; });
      status.textContent = `${circuit > 1 ? `Circuit ${circuit}. ` : ''}${encounter + 1}/5 · ${ROUTE[encounter].name}. ${ROUTE[encounter].hint}`;
      syncControls(); canvas.focus({ preventScroll: true });
    }
    function finishEncounter() {
      if (encounter === ROUTE.length - 1 && !options.endless) return end(true);
      if (options.veteran && routeVow === 'oxblood') { routeBonus += 250; status.textContent = 'Oxblood Via cleared: +250 route score. The next procession carries another ward.'; }
      addLinks(Math.max(0, 4 - links.length) + 1 + Math.min(2, motes.length));
      surge = false; ward = level('ward') ? 1 : ward; wardTime = 0;
      showDraft();
    }
    function spawn(kind, count) {
      const pressure = (1 + (circuit - 1) * .16) * (options.veteran && routeVow === 'ivory' ? .92 : 1);
      for (let i = 0; i < count; i++) {
        if (kind !== 'cross' && kind !== 'boss' && shards.length >= 28) continue;
        // A scissor lane is a telegraphed hazard, not a shootable shard: a
        // dashed line locks in, then a blade runs its length.
        if (kind === 'cross') {
          const fromLeft = rand() < .5;
          hazards.push({
            kind: 'lane',
            x: fromLeft ? -24 : W + 24, y: clamp(head.y + (i - (count - 1) / 2) * 82, 90, H - 65),
            dx: fromLeft ? 1 : -1, dy: 0, warning: 1.15, width: 15, speed: 195 * scale * pressure,
          });
          tone(196, .12, 'sine', .03);
          continue;
        }
        const side = Math.floor(rand() * 4);
        let x = side === 0 ? -24 : side === 1 ? W + 24 : 80 + rand() * (W - 160);
        let y = side === 2 ? 65 : side === 3 ? H + 24 : 100 + rand() * (H - 190);
        if (kind === 'boss') { x = 680; y = 270; }
        const hp = (kind === 'boss' ? 115 : kind === 'elite' ? 22 : kind === 'warden' ? 30 : kind === 'deacon' ? 25 : kind === 'siphon' ? 14 : 2) * pressure;
        const speed = (kind === 'elite' ? 95 : kind === 'siphon' ? 62 : kind === 'deacon' ? 68 : 76 + encounter * 8) * scale * pressure;
        const a = Math.atan2(head.y - y, head.x - x);
        const s = {
          x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          r: kind === 'boss' ? 35 : kind === 'elite' ? 22 : kind === 'warden' ? 20 : kind === 'deacon' ? 19 : kind === 'siphon' ? 18 : 14,
          hp, maxHp: hp, a: rand() * TAU, spin: rand() - .5, kind,
          mode: 'arrive', timer: kind === 'boss' ? 2.5 : kind === 'warden' ? 1.4 : kind === 'deacon' ? 1.2 : kind === 'siphon' ? 1.1 : 2, slow: 0, age: 0, aim: 0, sx: 0, sy: 0,
          stage: kind === 'boss' ? 1 : 0, officeOpened: false, tetherBroken: 0, tetherTarget: null, wardedBy: null, latticeCd: 0,
          severRewarded: false, officeSevered: false, officeOwner: null,
          harvests: kind === 'siphon' ? 0 : undefined, targetMote: null,
        };
        if (kind === 'elite' || kind === 'warden' || kind === 'deacon' || kind === 'siphon') { s.sx = 150 + rand() * (W - 300); s.sy = 130 + rand() * (H - 260); }
        shards.push(s);
        // Stable Veteran fixture for focused Black Office regressions. Normal
        // campaigns reach this state only through stage-I damage, never here.
        if (kind === 'boss' && options.veteran && Number(options.startBossStage) === 2) {
          s.stage = 2; s.hp = s.maxHp * .55; s.mode = 'procession'; s.timer = 2.2; bossTransitions = 1;
          for (const side of [-1, 1]) {
            spawn('deacon', 1);
            const deacon = shards[shards.length - 1];
            deacon.x = s.x + side * 105; deacon.y = s.y + 65; deacon.sx = deacon.x; deacon.sy = deacon.y;
            deacon.tetherTarget = s; deacon.officeOwner = s;
          }
          status.textContent = 'BLACK OFFICE · two Deacons ward the Unraveller. Cross their threads, Star Cast through them, then strike the ivory core.';
        }
        if (kind === 'siphon') { status.textContent = 'Mote siphon. Its dashed harvest line marks a target: gather that mote or break the siphon before it makes drift shards.'; tone(245, .18, 'sine', .035); }
        if (kind === 'warden') { status.textContent = 'Lattice warden. Violet tracks you; the locked line does not. Cross it after the lock, then punish its rest.'; tone(205, .22, 'triangle', .04); }
        if (kind === 'deacon') { status.textContent = 'Processional Deacon. Its brass thread wards one ally. Cross the thread with any link, use Star Cast, or kill the Deacon to expose it.'; tone(165, .25, 'triangle', .04); }
        if (kind === 'boss') { status.textContent = options.veteran ? 'The Unraveller ascendant. Three spokes lock around your last position; leave them and strike the open core. Its half-health Black Office calls two warding Deacons.' : 'The Unraveller. Dodge the marked cross; strike while the core is open.'; tone(98, .5, 'sawtooth', .06); }
      }
    }
    function hurt(index = -1) {
      if (invuln > 0 || over) return;
      invuln = 1.15;
      if (ward) { ward = 0; wardTime = 0; burst(head.x, head.y, '#9ed7c6', 18, 140); tone(500, .12, 'sine', .04); return; }
      burst(head.x, head.y, '#f58e9b', 18, 180); tone(150, .2, 'sawtooth', .04);
      if (!reduced()) shake = 5;
      if (links.length) links.splice(index >= 0 ? index : links.length - 1, 1);
      else end(false);
    }
    function radial(x, y, radius, amount, onKill = null, source = null) {
      arcs.push({ ring: true, x1: x, y1: y, radius, t: .35 });
      for (const s of [...shards]) if (Math.hypot(s.x - x, s.y - y) < radius + s.r) damage(s, amount, onKill, source);
    }
    function segmentDistance(x, y, a, b) {
      const sx = b.x - a.x, sy = b.y - a.y;
      const along = clamp(((x - a.x) * sx + (y - a.y) * sy) / (sx * sx + sy * sy || 1), 0, 1);
      return Math.hypot(x - a.x - sx * along, y - a.y - sy * along);
    }
    function officeDeacons(boss) { return shards.filter(s => s.kind === 'deacon' && s.officeOwner === boss && s.hp > 0); }
    function officeObjectiveMet(boss) {
      const choir = officeDeacons(boss);
      return choir.length === 0 || choir.every(deacon => deacon.officeSevered);
    }
    function severChainTether(deacon) {
      if (!deacon || deacon.tetherBroken > 0) return false;
      deacon.tetherBroken = 3; deacon.mode = 'rest'; deacon.timer = 1.2; tetherSevers++;
      if (deacon.officeOwner?.kind === 'boss' && !deacon.officeSevered) {
        deacon.officeSevered = true; officeSevers++;
        if (officeObjectiveMet(deacon.officeOwner)) deacon.officeOwner.officeOpened = true;
      }
      const reward = !deacon.severRewarded;
      if (reward) {
        deacon.severRewarded = true; tetherRewards++;
        dedication = Math.min(3, dedication + 1);
      }
      status.textContent = reward ? 'Processional thread severed. Its ally is exposed and one Dedication is restored.' : 'Processional thread severed again. The ward opens, but this Deacon’s Dedication bounty is already spent.';
      arcs.push({ x1: deacon.x, y1: deacon.y, x2: deacon.tetherTarget?.x ?? deacon.x, y2: deacon.tetherTarget?.y ?? deacon.y, t: .28 });
      tone(610, .13, 'triangle', .04); syncControls();
      return true;
    }
    function spawnBeam(x, y, angle, warning = .9, width = 11, life = .75) {
      hazards.push({ kind: 'beam', x, y, dx: Math.cos(angle), dy: Math.sin(angle), warning, width, life, length: Math.hypot(W, H), speed: 0 });
    }
    function pulse() {
      if (g.paused || destroyed || over || phase !== 'combat' || !level('nova') || pulseTime > 0) return;
      pulseTime = 7 - level('nova');
      radial(head.x, head.y, 125 + level('nova') * 25, 5);
      hazards = hazards.filter(h => h.warning > 0 || Math.abs((head.x - h.x) * h.dy - (head.y - h.y) * h.dx) > 150);
      tone(380, .18, 'triangle', .05); syncControls();
    }

    function linkLattice() {
      if (!options.veteran || g.paused || destroyed || over || phase !== 'combat' || dedication < 1 || latticeTime > 0) return;
      dedication--; latticeTime = 3; latticeCount++;
      status.textContent = `${FORMATIONS[formation].name} Link Lattice: three seconds of consecrated links. Contact burns threats and cuts live beams; steering is slowed.`;
      arcs.push({ ring: true, x1: head.x, y1: head.y, radius: formation === 'halo' ? 120 : 90, t: .35 });
      tone(440, .24, 'triangle', .05); syncControls();
    }

    function end(won) {
      if (over || destroyed) return; over = won ? 1 : -1; phase = won ? 'won' : 'lost';
      status.textContent = won ? 'The Unraveller is broken. The chain holds.' : 'The chain breaks. Refit and try a different formation.';
      syncControls();
      if (won) { burst(head.x, head.y, '#f2d38a', 34, 260); tone(660, .3, 'sine', .06); tone(990, .45, 'sine', .05); }
      g.after(() => { g.destroy(); onEnd({ won, score: score() }); }, 900);
    }

    function damage(s, amount, onKill = null, source = null) {
      if (!shards.includes(s)) return;
      // Deacons get a readable arrival before incidental fire or contact can
      // delete them. Their support objective becomes targetable with the channel.
      if (s.kind === 'deacon' && s.mode === 'arrive') return;
      const officeLocked = options.veteran && s.kind === 'boss' && s.stage === 2 && !s.officeOpened;
      let exposure = s.kind === 'boss' && s.mode !== 'open' ? .25 : s.kind === 'warden' && s.mode === 'rest' ? 1.5 : s.kind === 'deacon' && s.tetherBroken > 0 ? 1.5 : s.kind === 'siphon' && (s.mode === 'harvest' || s.mode === 'rest') ? 1.35 : 1;
      if (s.wardedBy && shards.includes(s.wardedBy) && s.wardedBy.tetherBroken <= 0) {
        if (source?.cast || source?.lattice) severChainTether(s.wardedBy);
        else if (!(s.kind === 'boss' && s.officeOpened)) exposure *= .35;
      }
      // Black Office damage is objective-gated, not a smaller number that can
      // eventually leak a clear. Cast/Lattice may sever on this hit; their
      // damage lands only after the choir has actually been opened.
      if (officeLocked) return;
      if (options.veteran && s.kind === 'boss' && s.stage === 1 && s.hp - amount * exposure <= s.maxHp * .55) s.hp = s.maxHp * .55;
      else s.hp -= amount * exposure;
      // The ascendant Unraveller's second objective is a destructible choir,
      // not a larger health bar. Star Cast/Lattice can cut wards; ordinary
      // formation fire must first cross or destroy the two Deacons.
      if (options.veteran && s.kind === 'boss' && s.stage === 1 && s.hp > 0 && s.hp <= s.maxHp * .55) {
        s.stage = 2; s.mode = 'procession'; s.timer = 2.2; bossTransitions++;
        hazards = [];
        for (const side of [-1, 1]) {
          spawn('deacon', 1);
          const deacon = shards[shards.length - 1]; deacon.x = s.x + side * 105; deacon.y = s.y + 65; deacon.sx = deacon.x; deacon.sy = deacon.y; deacon.tetherTarget = s; deacon.officeOwner = s;
        }
        status.textContent = 'BLACK OFFICE · two Deacons ward the Unraveller. Cross their threads, Star Cast through them, then strike the ivory core.';
        burst(s.x, s.y, '#c6a76b', 24, 210); tone(104, .5, 'sawtooth', .055); syncControls();
        return;
      }
      if (s.hp > 0) { tone(320, .05, 'triangle', .03); return; }
      if (!shards.includes(s)) return;
      shards.splice(shards.indexOf(s), 1);
      broken++;
      if (source?.lattice) latticeKills++;
      if (s.kind === 'deacon' || s.kind === 'warden') dedication = Math.min(3, dedication + 1);
      for (const other of shards) if (other.wardedBy === s || other.tetherTarget === s) { other.wardedBy = null; other.tetherTarget = null; }
      burst(s.x, s.y, '#d8c48b', 16, 190); tone(240 + Math.random() * 80, .1, 'triangle', .06);
      if (onKill) onKill(s);
      else if ((broken % 6 === 0 || (verbs.has('parallax') && broken % 5 === 0) || s.kind === 'elite' || s.kind === 'warden' || (s.kind === 'siphon' && s.mode === 'harvest')) && motes.length < (options.veteran ? 8 : 5))
        motes.push({ x: clamp(s.x, 50, W - 50), y: clamp(s.y, 90, H - 50), p: rand() * TAU });
    }

    // One shared bolt path keeps ordinary and Counterpoint volleys identical.
    // A free switch volley shoots forward even when no target is in reach.
    function fireLink(l, free = false) {
      const form = FORMATIONS[formation];
      const targets = [];
      for (const s of shards) {
        const d = Math.hypot(s.x - l.x, s.y - l.y);
        if (d < form.range) targets.push([d, s]);
      }
      targets.sort((a, b) => a[0] - b[0]);
      if (!targets.length && !free) return false;
      const boltSpeed = formation === 'spear' ? 380 : 520;
      const boltDamage = formation === 'spear' ? 2 : 1;
      const lodestar = formation === 'spear' && attuned;
      const shots = targets.length ? targets.slice(0, 1 + level('fork')).map(([, s]) => Math.atan2(s.y - l.y, s.x - l.x)) : [Math.atan2(head.dy, head.dx)];
      for (let i = 0; i < shots.length; i++) {
        const target = targets[i]?.[1] || null, a = shots[i];
        bolts.push({ x: l.x, y: l.y, vx: Math.cos(a) * boltSpeed, vy: Math.sin(a) * boltSpeed, target, life: 1.6, speed: boltSpeed, damage: boltDamage, pierce: level('pierce') + (lodestar ? level('lodestar') : 0), lodestar, struck: [] });
        shotsFired++;
      }
      return true;
    }
    function triggerRelay() {
      if (!level('relay') || relayTime > 0 || phase !== 'combat') return;
      relayTime = 9 - level('relay'); relayCount++;
      invuln = Math.max(invuln, .25 + .1 * level('relay'));
      for (const l of links) fireLink(l, true);
      burst(head.x, head.y, '#b7d8e8', 12, 120); tone(620, .12, 'triangle', .04);
    }
    function starCastRefund(s) {
      if (motes.length >= 8) return;
      motes.push({ x: clamp(s.x, 40, W - 40), y: clamp(s.y, 70, H - 40), p: castCount * .618 % TAU, cast: true });
      castRefunds++;
    }
    function starCast() {
      if (!options.veteran || g.paused || destroyed || over || phase !== 'combat' || castTime > 0 || links.length <= 1 || bolts.length >= 160) return;
      const link = links.pop();
      let target = null, best = 740;
      for (const s of shards) {
        const d = Math.hypot(s.x - link.x, s.y - link.y);
        if (d < best) { best = d; target = s; }
      }
      const angle = target ? Math.atan2(target.y - link.y, target.x - link.x) : Math.atan2(head.dy, head.dx);
      const speed = formation === 'spear' ? 820 : formation === 'halo' ? 580 : 660;
      const damage = formation === 'spear' ? 14 : formation === 'halo' ? 8 : 9;
      bolts.push({
        x: link.x, y: link.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        target, life: 1.6, speed, damage, pierce: formation === 'spear' ? 8 : formation === 'ribbon' ? 2 : 0,
        cast: formation, struck: [],
      });
      castCount++; shotsFired++; castTime = formation === 'spear' ? 1.6 : formation === 'halo' ? 1.1 : 1.35;
      status.textContent = `${FORMATIONS[formation].name} Star Cast: one link spent. ${formation === 'spear' ? 'The cast pierces the staff.' : formation === 'halo' ? 'The cast bursts on impact.' : 'The cast seeks its mark.'} Recover the kill mote to reweave.`;
      burst(link.x, link.y, '#a7ebde', 15, 180); tone(680, .16, 'triangle', .05); syncControls();
    }

    function step(dt) {
      shake = Math.max(0, shake - dt * 16);
      if (over || phase !== 'combat') return;
      if ((++tickN & 7) === 0) syncDataset();
      elapsed += dt;
      invuln = Math.max(0, invuln - dt);
      // The encounter's timed script: each entry fires once, on the second.
      const script = ROUTE[encounter];
      while (eventIndex < script.events.length && elapsed >= script.events[eventIndex][0]) {
        spawn(script.events[eventIndex][1], script.events[eventIndex][2]);
        eventIndex++;
      }
      if (options.veteran && routeVow === 'oxblood' && encounter < ROUTE.length - 1 && !routeEventSpawned && elapsed >= 1.1) {
        routeEventSpawned = true; spawn('deacon', 1); spawn('drift', 2);
        status.textContent = 'Oxblood procession: an additional Deacon and two drift shards. Clear them for the 250-point route tithe.';
      } else if (routeVow !== 'oxblood') routeEventSpawned = true;
      // The aegis recharges after absorbing a hit; the pulse label ticks down.
      if (!ward && level('ward')) {
        wardTime += dt;
        if (wardTime >= 10 - 2 * level('ward')) { ward = 1; wardTime = 0; tone(500, .12, 'sine', .04); }
      }
      if (pulseTime > 0) {
        const before = Math.ceil(pulseTime);
        pulseTime = Math.max(0, pulseTime - dt);
        if (Math.ceil(pulseTime) !== before || !pulseTime) syncControls();
      }
      if (relayTime > 0) {
        const before = Math.ceil(relayTime);
        relayTime = Math.max(0, relayTime - dt);
        if (Math.ceil(relayTime) !== before || !relayTime) syncControls();
      }
      if (castTime > 0) {
        const before = Math.ceil(castTime * 10);
        castTime = Math.max(0, castTime - dt);
        if (Math.ceil(castTime * 10) !== before || !castTime) syncControls();
      }
      if (latticeTime > 0) {
        const before = Math.ceil(latticeTime * 10);
        latticeTime = Math.max(0, latticeTime - dt);
        if (Math.ceil(latticeTime * 10) !== before || !latticeTime) syncControls();
      }
      if (level('lodestar') && !attuned) {
        const before = Math.floor(attune * 4);
        attune += dt;
        if (attune >= 4 - .5 * level('lodestar')) {
          attuned = true; tone(740, .18, 'sine', .04); syncControls();
        } else if (Math.floor(attune * 4) !== before) syncControls();
      }
      // Steer: keys win; otherwise glide toward the pointer. Haste speeds the
      // comet; the halo's tight orbit slows it.
      const speedMul = (1 + .14 * level('haste')) * (formation === 'halo' ? .88 : 1) * (latticeTime > 0 ? .62 : 1);
      const kx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
      const ky = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
      let mx = 0, my = 0;
      if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l * 250 * speedMul; my = ky / l * 250 * speedMul; }
      else if (pointer) {
        const dx = pointer.x - head.x, dy = pointer.y - head.y, d = Math.hypot(dx, dy);
        if (d > 14) { const sp = Math.min(270, d * 7) * speedMul; mx = dx / d * sp; my = dy / d * sp; }
      }
      moving = Boolean(mx || my);
      if (mx || my) { const l = Math.hypot(mx, my); head.dx = mx / l; head.dy = my / l; }
      head.x = clamp(head.x + mx * dt, 24, W - 24);
      head.y = clamp(head.y + my * dt, 24, H - 24);
      // Formation decides where the links ride: a trailing ribbon, a compact
      // orbiting halo, or a wedge speared ahead of the comet.
      if (formation === 'halo') {
        orbitA += dt * 1.3;
        const radius = Math.min(130, 46 + links.length * 5);
        links.forEach((l, i) => {
          const a = orbitA + i / links.length * TAU;
          l.x += (head.x + Math.cos(a) * radius - l.x) * Math.min(1, dt * 7);
          l.y += (head.y + Math.sin(a) * radius - l.y) * Math.min(1, dt * 7);
        });
      } else if (formation === 'spear') {
        links.forEach((l, i) => {
          const fwd = 30 + i * 17, lat = (i % 2 ? 1 : -1) * Math.min(i, 7) * 4.5;
          const tx = head.x + head.dx * fwd - head.dy * lat;
          const ty = head.y + head.dy * fwd + head.dx * lat;
          l.x += (tx - l.x) * Math.min(1, dt * 6); l.y += (ty - l.y) * Math.min(1, dt * 6);
        });
      } else {
        let prev = head;
        for (const l of links) {
          const dx = prev.x - l.x, dy = prev.y - l.y, d = Math.hypot(dx, dy) || 1;
          if (d > SP) { l.x = prev.x - dx / d * SP; l.y = prev.y - dy / d * SP; }
          prev = l;
        }
      }
      // Free star-motes appear to be gathered (seeded; cosmetics never draw
      // from this stream).
      moteAt -= dt;
      if (moteAt <= 0) {
        moteAt = 3.6 + rand() * 1.6;
        if (motes.length < 3) motes.push({ x: 60 + rand() * (W - 120), y: 60 + rand() * (H - 120), p: rand() * TAU });
      }
      // Enemies. Drift shards sail through; keepers aim, charge and rest;
      // Deacons weave destructible protection, and the Unraveller changes
      // objective at half health rather than merely gaining speed.
      for (const s of shards) s.wardedBy = null;
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        const slowMul = s.slow > 0 ? .5 : 1;
        s.slow = Math.max(0, s.slow - dt); s.tetherBroken = Math.max(0, (s.tetherBroken || 0) - dt); s.latticeCd = Math.max(0, (s.latticeCd || 0) - dt);
        s.age += dt; s.a += s.spin * dt * slowMul;
        if (s.kind === 'elite') {
          s.timer -= dt * slowMul;
          if (s.mode === 'arrive') {
            const dx = s.sx - s.x, dy = s.sy - s.y, d = Math.hypot(dx, dy) || 1;
            if (d > 8) { s.x += dx / d * 130 * scale * slowMul * dt; s.y += dy / d * 130 * scale * slowMul * dt; }
            if (s.timer <= 0) { s.mode = 'aim'; s.timer = 1.1; }
          } else if (s.mode === 'aim') {
            s.aim = Math.atan2(head.y - s.y, head.x - s.x);
            if (s.timer <= 0) {
              s.mode = 'charge'; s.timer = .55;
              s.vx = Math.cos(s.aim) * 430 * scale * slowMul; s.vy = Math.sin(s.aim) * 430 * scale * slowMul;
              tone(240, .15, 'sawtooth', .05);
            }
          } else if (s.mode === 'charge') {
            s.x += s.vx * dt; s.y += s.vy * dt;
            if (s.timer <= 0 || s.x < 30 || s.x > W - 30 || s.y < 60 || s.y > H - 30) { s.mode = 'rest'; s.timer = 1.35; s.vx = s.vy = 0; }
          } else if (s.timer <= 0) { s.mode = 'aim'; s.timer = 1.1; }
          s.x = clamp(s.x, 24, W - 24); s.y = clamp(s.y, 56, H - 24);
        } else if (s.kind === 'warden') {
          // Wardens hold their ground and sever formations with a line. The
          // tracking aim is violet and dashed; lock stops following the head,
          // creating a deliberate sidestep window before the beam appears.
          s.timer -= dt * slowMul;
          if (s.mode === 'arrive') {
            const dx = s.sx - s.x, dy = s.sy - s.y, d = Math.hypot(dx, dy) || 1;
            if (d > 8) { s.x += dx / d * 110 * scale * slowMul * dt; s.y += dy / d * 110 * scale * slowMul * dt; }
            if (s.timer <= 0) { s.mode = 'aim'; s.timer = 1.15; }
          } else if (s.mode === 'aim') {
            s.aim = Math.atan2(head.y - s.y, head.x - s.x);
            if (s.timer <= 0) { s.mode = 'lock'; s.timer = .55; tone(285, .12, 'triangle', .04); }
          } else if (s.mode === 'lock') {
            if (s.timer <= 0) {
              spawnBeam(s.x, s.y, s.aim);
              s.mode = 'channel'; s.timer = 1.65;
              tone(125, .25, 'sawtooth', .05);
            }
          } else if (s.mode === 'channel') {
            if (s.timer <= 0) { s.mode = 'rest'; s.timer = 1.4; }
          } else if (s.timer <= 0) { s.mode = 'aim'; s.timer = 1.15; }
          s.x = clamp(s.x, 24, W - 24); s.y = clamp(s.y, 56, H - 24);
        } else if (s.kind === 'siphon') {
          // A harvest is a race over a resource, not a timer-only spawn. The
          // dashed line identifies exactly which mote to deny; two successful
          // thefts make the siphon abandon harvesting and hunt the chain.
          s.timer -= dt * slowMul;
          if (s.mode === 'arrive') {
            const dx = s.sx - s.x, dy = s.sy - s.y, d = Math.hypot(dx, dy) || 1;
            if (d > 8) { s.x += dx / d * 105 * scale * slowMul * dt; s.y += dy / d * 105 * scale * slowMul * dt; }
            if (s.timer <= 0) s.mode = 'seek';
          } else if (s.mode === 'seek') {
            let target = null, best = Infinity;
            if (s.harvests < 2) for (const m of motes) {
              const d = Math.hypot(m.x - s.x, m.y - s.y);
              if (d < best) { best = d; target = m; }
            }
            if (target) {
              s.targetMote = target; s.mode = 'harvest'; s.timer = 1.8;
              status.textContent = 'Siphon harvest locked. Gather its marked mote to expose it, or destroy it before two drift shards break out.';
              tone(310, .16, 'triangle', .035);
            } else {
              const dx = head.x - s.x, dy = head.y - s.y, d = Math.hypot(dx, dy) || 1;
              s.x += dx / d * 46 * scale * slowMul * dt; s.y += dy / d * 46 * scale * slowMul * dt;
            }
          } else if (s.mode === 'harvest') {
            if (!s.targetMote || !motes.includes(s.targetMote)) {
              s.targetMote = null; s.mode = 'rest'; s.timer = 1.7; siphonDenials++;
              status.textContent = 'Harvest denied. The siphon is exposed while it finds another thread.';
              tone(590, .12, 'sine', .035);
            } else if (s.timer <= 0) {
              motes.splice(motes.indexOf(s.targetMote), 1); s.targetMote = null;
              s.harvests++; siphonSteals++; s.mode = s.harvests >= 2 ? 'hunt' : 'rest'; s.timer = 1.1;
              spawn('drift', 2); arcs.push({ ring: true, x1: s.x, y1: s.y, radius: 62, t: .35 });
              status.textContent = 'The siphon consumed a mote and made two drift shards. Break the next harvest or deny its mark.';
              burst(s.x, s.y, '#c4a7e7', 16, 160); tone(135, .24, 'sawtooth', .045);
            }
          } else if (s.mode === 'rest') {
            if (s.timer <= 0) s.mode = s.harvests >= 2 ? 'hunt' : 'seek';
          } else {
            const dx = head.x - s.x, dy = head.y - s.y, d = Math.hypot(dx, dy) || 1;
            s.x += dx / d * 92 * scale * slowMul * dt; s.y += dy / d * 92 * scale * slowMul * dt;
          }
          s.x = clamp(s.x, 24, W - 24); s.y = clamp(s.y, 56, H - 24);
        } else if (s.kind === 'deacon') {
          s.timer -= dt * slowMul;
          if (s.mode === 'arrive') {
            const dx = s.sx - s.x, dy = s.sy - s.y, d = Math.hypot(dx, dy) || 1;
            if (d > 8) { s.x += dx / d * 105 * scale * slowMul * dt; s.y += dy / d * 105 * scale * slowMul * dt; }
            if (s.timer <= 0) s.mode = 'channel';
          } else if (s.mode === 'rest') {
            if (s.timer <= 0) s.mode = 'channel';
          } else {
            const candidates = shards.filter(o => o !== s && o.kind !== 'deacon' && o.hp > 0);
            if (!candidates.includes(s.tetherTarget)) {
              s.tetherTarget = candidates.reduce((best, o) => {
                const d = Math.hypot(o.x - s.x, o.y - s.y);
                return !best || d < best.d ? { o, d } : best;
              }, null)?.o || null;
            }
            if (s.tetherTarget) {
              const dx = s.tetherTarget.x - s.x, dy = s.tetherTarget.y - s.y, d = Math.hypot(dx, dy) || 1;
              if (d > 185) { s.x += dx / d * 48 * scale * slowMul * dt; s.y += dy / d * 48 * scale * slowMul * dt; }
              if (s.tetherBroken <= 0) {
                s.tetherTarget.wardedBy = s;
                if (links.some(link => segmentDistance(link.x, link.y, s, s.tetherTarget) < 10) || segmentDistance(head.x, head.y, s, s.tetherTarget) < 10) severChainTether(s);
              }
            }
          }
          s.x = clamp(s.x, 24, W - 24); s.y = clamp(s.y, 56, H - 24);
        } else if (s.kind === 'boss') {
          const pressure = 1 + (circuit - 1) * .16;
          s.timer -= dt * slowMul;
          if (s.mode === 'arrive') {
            s.x += (680 - s.x) * Math.min(1, dt * 1.6); s.y += (270 - s.y) * Math.min(1, dt * 1.6);
            if (s.timer <= 0) { s.mode = 'aim'; s.timer = options.veteran ? 1.5 : 1.2; }
          } else if (s.mode === 'procession') {
            s.x += (650 - s.x) * Math.min(1, dt * 1.4); s.y += (270 - s.y) * Math.min(1, dt * 1.4);
            const objectiveMet = officeObjectiveMet(s);
            if (objectiveMet) {
              s.officeOpened = true; s.mode = 'open'; s.timer = 3.2; hazards = [];
              status.textContent = 'The Black Office is severed. The ivory core is fully open for 3.2 seconds.';
              tone(590, .25, 'sine', .05);
            } else if (s.timer <= 0) {
              s.aim = Math.atan2(head.y - s.y, head.x - s.x);
              spawnBeam(s.x, s.y, s.aim, 1.15, 12, .8); spawnBeam(s.x, s.y, s.aim + Math.PI / 2, 1.15, 12, .8);
              s.timer = 2.7; tone(126, .28, 'sawtooth', .045);
            }
          } else if (s.mode === 'aim') {
            s.x = 680 + Math.sin(s.age * .7) * 36; s.y = 270 + Math.sin(s.age * 1.1) * 24;
            if (s.timer <= 0 && options.veteran) {
              s.aim = Math.atan2(head.y - s.y, head.x - s.x);
              const spokes = s.stage === 2 ? 4 : 3;
              for (let spoke = 0; spoke < spokes; spoke++) spawnBeam(s.x, s.y, s.aim + spoke * TAU / spokes, 1.1, 12, .85);
              tone(130, .35, 'sawtooth', .05);
              s.mode = 'sweep'; s.timer = 2.15;
            } else if (s.timer <= 0) {
              hazards.push({ kind: 'lane', x: -24, y: clamp(head.y, 80, H - 60), dx: 1, dy: 0, warning: 1.15, width: 15, speed: 235 * scale * pressure });
              hazards.push({ kind: 'lane', x: clamp(head.x, 70, W - 40), y: -24, dx: 0, dy: 1, warning: 1.15, width: 15, speed: 215 * scale * pressure });
              tone(160, .3, 'sawtooth', .05);
              s.mode = 'sweep'; s.timer = 1.8;
            }
          } else if (s.mode === 'sweep') {
            if (s.timer <= 0) { s.mode = 'open'; s.timer = 2.6; tone(520, .2, 'sine', .05); }
          } else {
            const dx = head.x - s.x, dy = head.y - s.y, d = Math.hypot(dx, dy) || 1;
            if (d > 150) { s.x += dx / d * 30 * slowMul * dt; s.y += dy / d * 30 * slowMul * dt; }
            if (s.timer <= 0) {
              s.mode = 'aim'; s.timer = options.veteran ? 1.5 : 1.2;
              if (shards.length < 6) spawn('drift', 2);
            }
          }
        } else {
          s.x += s.vx * slowMul * dt; s.y += s.vy * slowMul * dt;
          if (s.x < -100 || s.x > W + 100 || s.y < -100 || s.y > H + 100) { shards.splice(i, 1); continue; }
        }
      }
      // Link Lattice turns the chosen formation's actual geometry into the
      // weapon. Halo ticks quickly in a close ring; Spear hits hardest ahead;
      // Ribbon sacrifices speed for the longest cutting thread.
      if (latticeTime > 0) {
        for (const s of [...shards]) {
          if (s.latticeCd > 0) continue;
          if (!links.some(link => Math.hypot(link.x - s.x, link.y - s.y) < s.r + 11)) continue;
          s.latticeCd = formation === 'halo' ? .2 : formation === 'spear' ? .38 : .3;
          damage(s, formation === 'spear' ? 8 : formation === 'halo' ? 4 : 5, null, { lattice: true, formation });
        }
      }
      // Scissor lanes move a blade along a dashed lock. Veteran beams instead
      // hold a fixed ray for a short active window after their longer warning.
      for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i];
        if (h.warning > 0) { h.warning -= dt; if (h.warning <= 0) tone(310, .08, 'square', .04); continue; }
        if (latticeTime > 0) {
          const end = h.kind === 'beam' ? { x: h.x + h.dx * h.length, y: h.y + h.dy * h.length } : h;
          const cut = links.some(link => h.kind === 'beam' ? segmentDistance(link.x, link.y, h, end) < h.width + 10 : Math.hypot(link.x - h.x, link.y - h.y) < h.width + 20);
          if (cut) {
            hazards.splice(i, 1); latticeSevers++; arcs.push({ ring: true, x1: h.x, y1: h.y, radius: 42, t: .35 });
            status.textContent = 'Link Lattice severed a live hostile line. Reposition before the next lock.';
            tone(690, .1, 'triangle', .04); continue;
          }
        }
        if (h.kind === 'beam') {
          h.life -= dt;
          if (h.life <= 0) { hazards.splice(i, 1); continue; }
          const touch = (ex, ey, pad) => {
            const rx = ex - h.x, ry = ey - h.y;
            const along = rx * h.dx + ry * h.dy;
            return along > -pad && along < h.length && Math.abs(rx * h.dy - ry * h.dx) < h.width + pad;
          };
          let struck = -1;
          for (let j = 0; j < links.length; j++) if (touch(links[j].x, links[j].y, 7)) { struck = j; break; }
          if (struck >= 0 || touch(head.x, head.y, 9)) hurt(struck);
          if (over) return;
          continue;
        }
        h.x += h.dx * h.speed * dt; h.y += h.dy * h.speed * dt;
        const touch = (ex, ey, pad) => h.dx
          ? Math.abs(ey - h.y) < h.width + pad && Math.abs(ex - h.x) < 12
          : Math.abs(ex - h.x) < h.width + pad && Math.abs(ey - h.y) < 12;
        let struck = -1;
        for (let j = 0; j < links.length; j++) if (touch(links[j].x, links[j].y, 7)) { struck = j; break; }
        if (struck >= 0 || touch(head.x, head.y, 9)) hurt(struck);
        if (over) return;
        if (h.x < -70 || h.x > W + 70 || h.y < -70 || h.y > H + 70) hazards.splice(i, 1);
      }
      // Every link fires on its nearest shard within the formation's reach.
      // Fork adds targets, spear hits twice as hard with slower bolts, haste
      // and a solar charge quicken the rhythm.
      const form = FORMATIONS[formation];
      let cool = form.rate;
      if (surge) cool *= .7;
      if (level('haste') && moving) cool *= 1 - .09 * level('haste');
      for (const l of links) {
        l.cool -= dt;
        if (l.cool > 0) continue;
        if (!fireLink(l)) { l.cool = .12; continue; }
        l.cool = cool;
        if (Math.random() < .35) tone(880 + Math.random() * 120, .04, 'square', .018);
      }
      // Bolts fly, gently homing; pierce carries them through, frost chills,
      // and the chain verb arcs to a second shard.
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]; b.life -= dt;
        if (b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) { bolts.splice(i, 1); continue; }
        if (b.target && shards.includes(b.target) && !b.struck.includes(b.target)) {
          const want = Math.atan2(b.target.y - b.y, b.target.x - b.x), cur = Math.atan2(b.vy, b.vx);
          const diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
          const na = cur + clamp(diff, -7 * dt, 7 * dt);
          b.vx = Math.cos(na) * b.speed; b.vy = Math.sin(na) * b.speed;
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        let consumed = false;
        for (const s of shards) {
          if (b.struck.includes(s)) continue;
          if (Math.hypot(s.x - b.x, s.y - b.y) < s.r + 4) {
            b.struck.push(s);
            burst(b.x, b.y, b.cast ? '#a7ebde' : '#f2d38a', 6, 90);
            const onCastKill = b.cast ? starCastRefund : null;
            damage(s, b.damage, onCastKill, b);
            if (b.cast === 'halo' && !b.detonated) {
              b.detonated = true; castBursts++; radial(s.x, s.y, 74, 4, onCastKill, b); tone(480, .13, 'sine', .035);
            }
            if (level('frost') && shards.includes(s)) s.slow = Math.max(s.slow, .4 + .3 * level('frost'));
            if (verbs.has('chain')) {
              const other = shards.find(o => o !== s && Math.hypot(o.x - s.x, o.y - s.y) < 150);
              if (other) { arcs.push({ x1: s.x, y1: s.y, x2: other.x, y2: other.y, t: .18 }); damage(other, .5); tone(1200, .05, 'sine', .02); }
            }
            if (b.pierce > 0) { b.pierce--; b.target = null; } else consumed = true;
            break;
          }
        }
        if (consumed) bolts.splice(i, 1);
      }
      for (let i = arcs.length - 1; i >= 0; i--) { arcs[i].t -= dt; if (arcs[i].t <= 0) arcs.splice(i, 1); }
      // A shard that touches the chain costs a link; a bare head ends the
      // trial. The boss survives contact and keeps fighting.
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        let struck = -1;
        for (let j = 0; j < links.length; j++) if (Math.hypot(links[j].x - s.x, links[j].y - s.y) < s.r + 9) { struck = j; break; }
        const headHit = Math.hypot(head.x - s.x, head.y - s.y) < s.r + 11;
        if (struck < 0 && !headHit) continue;
        if (s.kind === 'deacon' && s.mode === 'arrive') continue;
        if (struck >= 0 && !headHit && formation === 'halo' && attuned && s.kind === 'drift') {
          damage(s, s.hp + 1); tone(690, .08, 'triangle', .035); continue;
        }
        if (s.kind !== 'boss') {
          shards.splice(i, 1);
          burst(s.x, s.y, '#f58e9b', 20, 210); tone(150, .25, 'sawtooth', .05);
          if (!reduced()) shake = 7;
        }
        hurt(struck);
        if (over) return;
      }
      // Gather motes for new links; magnet draws them in, bloom bursts
      // outward, and the trail verb doubles the growth.
      const magnetR = level('magnet') ? 40 + 25 * level('magnet') : 24;
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        let gatherer = head;
        if (formation === 'ribbon' && attuned) {
          let best = Math.hypot(m.x - head.x, m.y - head.y);
          for (const l of links) {
            const d = Math.hypot(m.x - l.x, m.y - l.y);
            if (d < best) { best = d; gatherer = l; }
          }
        }
        if (level('magnet')) {
          const dx = gatherer.x - m.x, dy = gatherer.y - m.y, d = Math.hypot(dx, dy) || 1;
          if (d < magnetR * 1.9) { m.x += dx / d * 95 * dt; m.y += dy / d * 95 * dt; }
        }
        if (Math.hypot(m.x - gatherer.x, m.y - gatherer.y) < magnetR) {
          motes.splice(i, 1); collected++;
          addLinks((verbs.has('trail') ? 2 : 1) + (level('bloom') ? 1 : 0));
          if (level('bloom')) radial(m.x, m.y, 110, 2 + 2 * level('bloom'));
          burst(m.x, m.y, '#e9dcae', 10, 130); tone(700 + links.length * 12, .09, 'sine', .05);
        }
      }
      // The encounter ends when its script is spent and the field is clear.
      if (elapsed > .6 && eventIndex >= script.events.length && !shards.length && !hazards.length) finishEncounter();
    }

    function draw(ctx, dt, clock) {
      ctx.save();
      if (shake > 0 && !reduced()) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      ctx.fillStyle = '#070c16'; ctx.fillRect(-14, -14, W + 28, H + 28);
      stars();
      // A ruined armillary chapel: midnight enamel, oxblood recesses and
      // hairline brass tracery behind (never across) the playable constellation.
      ctx.save(); ctx.fillStyle = '#4b182415'; ctx.strokeStyle = '#aa8b5222'; ctx.lineWidth = 1.5;
      for (const x of [90, W - 90]) {
        ctx.beginPath(); ctx.moveTo(x - 48, H); ctx.lineTo(x - 48, 185); ctx.quadraticCurveTo(x, 82, x + 48, 185); ctx.lineTo(x + 48, H); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, 126); ctx.lineTo(x, H); ctx.moveTo(x - 46, 280); ctx.lineTo(x + 46, 280); ctx.stroke();
      }
      ctx.translate(W / 2, H / 2); ctx.beginPath(); ctx.arc(0, 0, 205, 0, TAU); ctx.stroke();
      for (let n = 0; n < 12; n++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(190, 0); ctx.lineTo(205, 0); ctx.stroke(); }
      ctx.restore();
      // Scissor lanes: rose dashes while they lock, an ivory blade once live.
      for (const h of hazards) {
        ctx.save();
        if (h.kind === 'beam') {
          const x2 = h.x + h.dx * h.length, y2 = h.y + h.dy * h.length;
          if (h.warning > 0) {
            ctx.globalAlpha = reduced() ? .7 : .55 + Math.sin(clock * 12) * .18;
            ctx.strokeStyle = '#c4a7e7'; ctx.lineWidth = 3; ctx.setLineDash([5, 9]);
            ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
          } else {
            ctx.strokeStyle = '#9d73c845'; ctx.lineWidth = h.width * 2;
            ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.strokeStyle = '#eadcff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
          }
          ctx.restore(); continue;
        }
        if (h.warning > 0) {
          ctx.globalAlpha = .35 + Math.sin(clock * 14) * .2;
          ctx.strokeStyle = '#f58e9b'; ctx.lineWidth = 2; ctx.setLineDash([10, 9]);
          ctx.beginPath();
          if (h.dx) { ctx.moveTo(0, h.y); ctx.lineTo(W, h.y); } else { ctx.moveTo(h.x, 0); ctx.lineTo(h.x, H); }
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#f58e9b2e'; ctx.lineWidth = h.width * 2;
          ctx.beginPath();
          if (h.dx) { ctx.moveTo(0, h.y); ctx.lineTo(W, h.y); } else { ctx.moveTo(h.x, 0); ctx.lineTo(h.x, H); }
          ctx.stroke();
          ctx.strokeStyle = '#f5a08c'; ctx.lineWidth = 4;
          ctx.beginPath();
          if (h.dx) { ctx.moveTo(h.x, h.y - h.width); ctx.lineTo(h.x, h.y + h.width); }
          else { ctx.moveTo(h.x - h.width, h.y); ctx.lineTo(h.x + h.width, h.y); }
          ctx.stroke();
        }
        ctx.restore();
      }
      // Free motes: small four-point teal stars.
      for (const m of motes) {
        const tw = .65 + Math.sin(clock * 3 + m.p) * .35;
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(clock * .6 + m.p);
        const mg = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
        mg.addColorStop(0, '#eafff6'); mg.addColorStop(.4, '#9ed7c6aa'); mg.addColorStop(1, '#9ed7c600');
        ctx.globalAlpha = tw; ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#d8f4e8'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // The constellation thread through the links.
      if (links.length) {
        ctx.strokeStyle = latticeTime > 0 ? '#eee1c2aa' : '#c4ac7938'; ctx.lineWidth = latticeTime > 0 ? 3 : 1.5;
        if (latticeTime > 0) ctx.setLineDash([12, 5]);
        ctx.beginPath(); ctx.moveTo(head.x, head.y);
        for (const l of links) ctx.lineTo(l.x, l.y);
        ctx.stroke(); ctx.setLineDash([]);
      }
      // Links: warm star-motes; Lattice adds a fixed ivory etching rather than
      // a bloom, keeping hit geometry readable with reduced motion.
      for (const l of links) {
        const lg = ctx.createRadialGradient(l.x, l.y, .5, l.x, l.y, 11);
        lg.addColorStop(0, '#fff6dd'); lg.addColorStop(.45, latticeTime > 0 ? '#eee1c2' : '#f2d38a'); lg.addColorStop(1, '#f2d38a00');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(l.x, l.y, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f8e9bd'; ctx.beginPath(); ctx.arc(l.x, l.y, 3.2, 0, TAU); ctx.fill();
        if (latticeTime > 0) {
          ctx.strokeStyle = '#eee1c2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(l.x, l.y, 13, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(l.x - 17, l.y); ctx.lineTo(l.x + 17, l.y); ctx.moveTo(l.x, l.y - 17); ctx.lineTo(l.x, l.y + 17); ctx.stroke();
        }
      }
      // The comet head and its short teal breath (blinking while invulnerable).
      if (invuln <= 0 || Math.floor(clock * 12) % 2 === 0) {
        const hg = ctx.createRadialGradient(head.x, head.y, 1, head.x, head.y, 16);
        hg.addColorStop(0, '#ffffff'); hg.addColorStop(.5, '#cfe8df'); hg.addColorStop(1, '#9ed7c600');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(head.x, head.y, 16, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#9ed7c6aa'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(head.x - head.dx * 12, head.y - head.dy * 12); ctx.lineTo(head.x - head.dx * 30, head.y - head.dy * 30); ctx.stroke();
        if (ward) {
          ctx.strokeStyle = '#9ed7c6'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.arc(head.x, head.y, 24, clock * 1.4, clock * 1.4 + TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      // Shards: dark spinning flint; keepers aim in rose, the Unraveller's
      // core gilds while open, frost pales whatever it chills.
      for (const s of shards) {
        if (s.kind === 'deacon' && s.tetherTarget && shards.includes(s.tetherTarget)) {
          ctx.save(); ctx.strokeStyle = s.tetherBroken > 0 ? '#756d5b44' : '#c0a064aa'; ctx.lineWidth = s.tetherBroken > 0 ? 1 : 2.5;
          ctx.setLineDash(s.tetherBroken > 0 ? [2, 10] : [9, 6]); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.tetherTarget.x, s.tetherTarget.y); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        }
        if (s.kind === 'siphon' && s.mode === 'harvest' && s.targetMote && motes.includes(s.targetMote)) {
          ctx.save(); ctx.strokeStyle = '#c4a7e7'; ctx.lineWidth = 2; ctx.setLineDash([4, 8]);
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.targetMote.x, s.targetMote.y); ctx.stroke(); ctx.setLineDash([]);
          ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(s.timer / 1.8, 0, 1)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s.targetMote.x - 11, s.targetMote.y); ctx.lineTo(s.targetMote.x + 11, s.targetMote.y);
          ctx.moveTo(s.targetMote.x, s.targetMote.y - 11); ctx.lineTo(s.targetMote.x, s.targetMote.y + 11); ctx.stroke(); ctx.restore();
        }
        if (s.kind === 'elite' && s.mode === 'aim') {
          ctx.save();
          ctx.globalAlpha = .45 + Math.sin(clock * 12) * .2;
          ctx.strokeStyle = '#f58e9b'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(s.aim) * 430, s.y + Math.sin(s.aim) * 430); ctx.stroke();
          ctx.restore();
        }
        if (s.kind === 'warden' && (s.mode === 'aim' || s.mode === 'lock')) {
          ctx.save();
          ctx.globalAlpha = reduced() ? .8 : .6 + Math.sin(clock * 10) * .16;
          ctx.strokeStyle = s.mode === 'lock' ? '#eadcff' : '#b99bd8';
          ctx.lineWidth = s.mode === 'lock' ? 3 : 2; ctx.setLineDash(s.mode === 'lock' ? [3, 5] : [10, 9]);
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(s.aim) * Math.hypot(W, H), s.y + Math.sin(s.aim) * Math.hypot(W, H)); ctx.stroke();
          ctx.restore();
        }
        if (s.kind === 'boss' && options.veteran && s.mode === 'aim') {
          const aim = Math.atan2(head.y - s.y, head.x - s.x);
          ctx.save(); ctx.globalAlpha = .38; ctx.strokeStyle = '#c4a7e7'; ctx.lineWidth = 2; ctx.setLineDash([4, 10]);
          for (let spoke = 0; spoke < 3; spoke++) {
            const a = aim + spoke * TAU / 3;
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * Math.hypot(W, H), s.y + Math.sin(a) * Math.hypot(W, H)); ctx.stroke();
          }
          ctx.restore();
        }
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
        ctx.beginPath();
        const points = s.kind === 'boss' ? 12 : s.kind === 'warden' || s.kind === 'deacon' ? 6 : s.kind === 'siphon' ? 4 : 8;
        for (let i = 0; i < points; i++) {
          const a = i / points * TAU, w = s.r * (0.82 + Math.sin(i * 2.7 + s.r) * .2);
          i ? ctx.lineTo(Math.cos(a) * w, Math.sin(a) * w) : ctx.moveTo(Math.cos(a) * w, Math.sin(a) * w);
        }
        ctx.closePath();
        ctx.fillStyle = s.kind === 'boss' ? '#21131c' : s.kind === 'deacon' ? '#431c28' : s.kind === 'warden' || s.kind === 'siphon' ? '#282338' : '#33302a'; ctx.fill();
        ctx.strokeStyle = s.slow > 0 ? '#9ec7d4' : s.kind === 'elite' ? '#c9846a' : s.kind === 'deacon' ? s.tetherBroken > 0 ? '#eee1c2' : '#c0a064' : s.kind === 'warden' || s.kind === 'siphon' ? '#b88b91' : s.kind === 'boss' ? s.stage === 2 ? '#e4d3ac' : '#a88950' : s.hp < 2 ? '#f58e9b' : '#8d7f5c';
        ctx.lineWidth = 2; ctx.stroke();
        if (s.kind === 'warden') {
          ctx.fillStyle = s.mode === 'rest' ? '#f2d38a' : s.mode === 'lock' || s.mode === 'channel' ? '#eadcff' : '#826b9e';
          ctx.beginPath(); ctx.arc(0, 0, s.mode === 'rest' ? 8 : 5, 0, TAU); ctx.fill();
          if (s.mode === 'rest') { ctx.strokeStyle = '#f2d38a88'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke(); }
        }
        if (s.kind === 'siphon') {
          ctx.fillStyle = s.mode === 'rest' ? '#f2d38a' : s.mode === 'harvest' ? '#eadcff' : '#826b9e';
          ctx.beginPath(); ctx.arc(0, 0, s.mode === 'harvest' ? 7 : 5, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#c4a7e7'; ctx.lineWidth = 1.5;
          for (let n = 0; n < 2 - s.harvests; n++) { ctx.beginPath(); ctx.arc(-5 + n * 10, s.r + 7, 2, 0, TAU); ctx.stroke(); }
        }
        if (s.kind === 'deacon') {
          ctx.strokeStyle = '#e4d3ac'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-7, -s.r - 4); ctx.lineTo(0, -s.r - 14); ctx.lineTo(7, -s.r - 4); ctx.stroke();
          ctx.fillStyle = s.tetherBroken > 0 ? '#eee1c2' : '#0b101a'; ctx.fillRect(-8, -3, 16, 6);
        }
        if (s.hp < 2 && s.kind === 'drift') {
          ctx.strokeStyle = '#f58e9b88'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-s.r * .5, -s.r * .3); ctx.lineTo(s.r * .2, s.r * .1); ctx.lineTo(-s.r * .1, s.r * .55); ctx.stroke();
        }
        if (s.kind === 'boss') {
          const open = s.mode === 'open';
          ctx.fillStyle = open ? '#eee1c2' : s.stage === 2 ? '#7b2c3b' : '#6b5a3e';
          ctx.beginPath(); ctx.arc(0, 0, open ? 11 : 7, 0, TAU); ctx.fill();
          if (s.stage === 2) {
            ctx.strokeStyle = '#c0a06488'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(0, 0, s.r + 10, 12, .5, 0, TAU); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(0, 0, s.r + 10, 12, -.5, 0, TAU); ctx.stroke();
          }
          if (open) {
            ctx.strokeStyle = '#f2d38a88'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 16 + (reduced() ? 0 : Math.sin(clock * 6) * 3), 0, TAU); ctx.stroke();
          }
        }
        ctx.restore();
      }
      // Bolts: short gilt streaks; sacrificed links are broader teal diamonds.
      for (const b of bolts) {
        ctx.strokeStyle = b.cast ? '#a7ebde' : '#f2d38a'; ctx.lineWidth = b.cast ? 4 : 2;
        ctx.beginPath(); ctx.moveTo(b.x - b.vx * (b.cast ? .022 : .014), b.y - b.vy * (b.cast ? .022 : .014)); ctx.lineTo(b.x, b.y); ctx.stroke();
        if (b.cast) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.stroke(); }
      }
      // Arcs: chain-verb light between shards, and the rings of relic novas.
      for (const a of arcs) {
        if (a.ring) {
          ctx.globalAlpha = clamp(a.t / .35, 0, 1);
          ctx.strokeStyle = '#9ed7c6'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(a.x1, a.y1, a.radius * (1 - a.t / .35 * .25), 0, TAU); ctx.stroke();
          continue;
        }
        ctx.globalAlpha = clamp(a.t / .18, 0, 1);
        ctx.strokeStyle = '#9ed7c6'; ctx.lineWidth = 1.5; ctx.beginPath();
        const seg = 5, dx = (a.x2 - a.x1) / seg, dy = (a.y2 - a.y1) / seg;
        ctx.moveTo(a.x1, a.y1);
        for (let i = 1; i < seg; i++) ctx.lineTo(a.x1 + dx * i + (Math.random() - .5) * 10, a.y1 + dy * i + (Math.random() - .5) * 10);
        ctx.lineTo(a.x2, a.y2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = HUD; ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${score()} · CHAIN ${links.length}`, 20, 28);
      if (options.veteran || level('relay') || level('lodestar')) {
        ctx.fillStyle = level('relay') && relayTime <= 0 || attuned || options.veteran && castTime <= 0 ? '#9ed7c6' : '#b7bda4'; ctx.font = SMALL;
        const arts = [];
        if (options.veteran) arts.push(`Q STAR CAST ${castTime > 0 ? `${castTime.toFixed(1)}s` : links.length > 1 ? 'READY · COST 1 LINK' : 'NEED 2 LINKS'}`);
        if (options.veteran) arts.push(`E LATTICE ${latticeTime > 0 ? `${latticeTime.toFixed(1)}s` : `${dedication}/3`} · ${routeVow.toUpperCase()} VIA`);
        if (level('relay')) arts.push(`COUNTERPOINT ${relayTime > 0 ? `${Math.ceil(relayTime)}s` : 'READY'}`);
        if (level('lodestar')) arts.push(attuned ? `${FORMATIONS[formation].name.toUpperCase()} ATTUNED` : `ATTUNE ${Math.round(clamp(attune / (4 - .5 * level('lodestar')), 0, 1) * 100)}%`);
        ctx.fillText(arts.join(' · '), 20, 48); ctx.font = HUD;
      }
      ctx.textAlign = 'right';
      ctx.fillText(over ? (over > 0 ? 'THE CHAIN HOLDS' : 'THE CHAIN BREAKS') : `${circuit > 1 ? `CIRCUIT ${circuit} · ` : ''}${encounter + 1}/${ROUTE.length} · ${ROUTE[encounter].name.toUpperCase()}`, W - 20, 28);
      const boss = shards.find(s => s.kind === 'boss');
      if (boss && !over) {
        ctx.fillStyle = '#33302a'; ctx.fillRect(W / 2 - 130, 40, 260, 7);
        ctx.fillStyle = boss.mode === 'open' ? '#f2d38a' : '#c9846a';
        ctx.fillRect(W / 2 - 130, 40, 260 * clamp(boss.hp / boss.maxHp, 0, 1), 7);
        ctx.strokeStyle = '#8d7f5c'; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 130, 40, 260, 7);
      }
      if (phase === 'combat' && elapsed < 2.6 && !over) {
        ctx.globalAlpha = clamp((2.6 - elapsed) / .8, 0, 1);
        ctx.fillStyle = '#e9dcae'; ctx.font = SERIF; ctx.textAlign = 'center';
        ctx.fillText(ROUTE[encounter].name, W / 2, 120);
        ctx.globalAlpha = 1;
      }
      if (phase === 'ready' || phase === 'draft') {
        ctx.fillStyle = '#9ed7c6'; ctx.font = SERIF; ctx.textAlign = 'center';
        ctx.fillText(phase === 'ready' ? 'Weave your constellation' : 'Safe refit — the sky waits', W / 2, 120);
      }
      ctx.fillStyle = '#b7bda4'; ctx.font = SMALL; ctx.textAlign = 'center';
      ctx.fillText(options.veteran ? `Steer / WASD · F formation (${FORMATIONS[formation].name}) · Q cast · E Lattice cuts live lines · cross brass Deacon threads · P pauses` : `Steer with the pointer or WASD · F formation (${FORMATIONS[formation].name})${level('nova') ? ' · Space pulse' : ''} · gather star-motes · P pauses`, W / 2, H - 16);
    }

    const GAMEKEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
    const FORMATION_IDS = Object.keys(FORMATIONS);
    const point = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    const draftKey = e => {
      if (phase !== 'draft') return;
      if (e.key >= '1' && e.key <= '3') {
        const id = choices[Number(e.key) - 1];
        if (id) { e.preventDefault(); choose(id); }
      }
    };
    listen(canvas, 'keydown', e => {
      const k = e.key.toLowerCase();
      if (GAMEKEYS.has(k)) { e.preventDefault(); keys.add(k); return; }
      if (k === 'f') { e.preventDefault(); setFormation(FORMATION_IDS[(FORMATION_IDS.indexOf(formation) + 1) % FORMATION_IDS.length]); return; }
      if (k === 'e') { e.preventDefault(); if (!e.repeat) linkLattice(); return; }
      if (k === 'q') { e.preventDefault(); if (!e.repeat) starCast(); return; }
      if (k === ' ') { e.preventDefault(); pulse(); return; }
      if (k === 'enter') { if (phase === 'ready') { e.preventDefault(); launch(); } return; }
      draftKey(e);
    });
    // The same digit shortcuts work while a draft button holds focus.
    listen(draft, 'keydown', draftKey);
    listen(window, 'keyup', e => keys.delete(e.key.toLowerCase()));
    listen(window, 'blur', () => { clearInput(); });
    listen(canvas, 'pointerdown', e => { if (phase !== 'combat') return; pointer = point(e); try { canvas.setPointerCapture(e.pointerId); } catch {} });
    listen(canvas, 'pointermove', e => { pointer = point(e); });
    showDraft(true);
    return g;
  }

  // ── The comet's tail · Perihelion Run ─────────────────────────────────
  // The skiff flies itself; hold to dive, release to climb, and thread the
  // golden rings as the tail sweeps past faster and faster.
  function perihelionGame(container, options = {}) {
    const W = 900, H = 560, WIN = 60, TOP = 64, BOT = H - 64, R = 132, SK = 9, PAIR_GAP = 330;
    const verbs = options.verbs || new Set();
    const scale = options.speedScale || 1;
    const onEnd = options.onEnd || (() => {});
    const veteran = !!options.veteran;
    const gapHalf = verbs.has('gyro') ? 62 : 54;
    const alpha = Math.asin(gapHalf / R);
    const ENDS = [alpha, Math.PI - alpha, Math.PI + alpha, TAU - alpha];
    const skiff = { x: 200, y: (TOP + BOT) / 2, vy: 0 };
    let gates = [], passed = 0, over = 0, invuln = 0, forgiven = false, shake = 0, gateTimer = 0, pointerHeld = false;
    let gateIndex = 0, patternCounts = {}, tickN = 0;
    let corona = veteran ? 1 : 0, coronaEarned = 0, preciseThreads = 0, brakeTime = 0, brakesUsed = 0;
    let wingTime = 0, wingovers = 0, wingPhases = 0, obstacles = [], forks = [], vow = 'unsworn', routeChoices = 0, routeBonus = 0;
    let bossPhase = 0, bossPhaseSeen = 0, bossAttackTimer = 0, bossClears = 0, forkOne = false, forkTwo = false;
    const timeOffset = veteran ? clamp(Number(options.startAt) || 0, 0, 48) : 0;
    forkOne = timeOffset >= 18; forkTwo = timeOffset >= 38;
    // Classic free play keeps its original Math.random stream. Daily Classic
    // and every Veteran route use the seeded gameplay stream; cosmetics never
    // consume it. The two modes remain isolated from one another.
    let seed = 307;
    for (const c of String(options.seed ?? (options.daily ? new Date().toISOString().slice(0, 10) : 307))) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const random = () => veteran || options.daily ? rand() : Math.random();
    const keys = new Set();
    const g = frame(container, W, H, {
      label: veteran ? 'Perihelion Run Veteran Sky. Hold Space, W, Up Arrow, or press and hold the canvas to dive; release to climb. Centre threads earn Corona. E or right-click spends one charge on an aerobrake. Q or the Wingover button spends one charge to reverse vertical motion and phase through one rim, censer, beam or tail edge. At route forks, the upper Ivory Via grants a charge and gentler patterns; the lower Oxblood Via narrows gates, adds censers and awards score. Survive the three-stage Solar Verger at 48 seconds and reach perihelion at sixty. Press P to pause.' : 'Perihelion Run. Hold Space, W, Up Arrow, or press and hold the canvas to dive; release to climb. Thread the golden rings and survive sixty seconds. Press P to pause.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(311, 60);
    const runTime = () => g.clock + timeOffset;
    const status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'margin:8px auto 0;max-width:calc(100% - 16px);color:#e5ddc8;font:600 14px/1.5 "DM Sans",sans-serif;text-align:center';
    status.textContent = veteran ? 'Hold to dive, release to climb. Q Wingover and E Aerobrake share Corona; choose a Via at each armillary fork.' : 'Hold to dive, release to climb. Thread the golden rings.';
    container.appendChild(status);
    const tacticalStatus = document.createElement('p'); tacticalStatus.dataset.perihelionTactical = '';
    tacticalStatus.style.cssText = 'margin:8px auto 0;max-width:calc(100% - 16px);padding:9px 12px;border:1px solid #a98c5744;background:#090f1a;color:#d8c494;font:600 14px/1.55 "DM Sans",sans-serif;text-align:center';
    container.appendChild(tacticalStatus);
    const brakeButton = document.createElement('button'); brakeButton.type = 'button';
    brakeButton.dataset.perihelionBrake = ''; brakeButton.hidden = !veteran;
    brakeButton.style.cssText = 'display:block;margin:8px auto;max-width:calc(100% - 16px);min-height:44px;padding:9px 16px;border:1px solid #9ed7c6;background:#0f2034;color:#e5efdf;font:600 14px/1.5 "DM Sans",sans-serif;cursor:pointer';
    brakeButton.title = 'Spend one precision-earned Corona charge to slow gates for 1.8 seconds. The 60-second run clock does not slow and braking threads cannot refund a charge.';
    if (veteran) container.appendChild(brakeButton);
    listen(brakeButton, 'click', () => { aerobrake(); canvas.focus({ preventScroll: true }); });
    const wingButton = document.createElement('button'); wingButton.type = 'button';
    wingButton.dataset.perihelionWingover = ''; wingButton.hidden = !veteran;
    wingButton.style.cssText = brakeButton.style.cssText;
    wingButton.title = 'Spend one Corona to reverse vertical motion. For 0.55 seconds, the first rim, censer, beam or tail-edge impact is phased instead of fatal. Shares the same charge bank as Aerobrake.';
    if (veteran) container.appendChild(wingButton);
    listen(wingButton, 'click', () => { wingover(); canvas.focus({ preventScroll: true }); });
    const frameDestroy = g.destroy;
    g.destroy = () => { brakeButton.remove(); wingButton.remove(); status.remove(); tacticalStatus.remove(); frameDestroy(); };
    const framePause = g.pause, frameResume = g.resume;
    g.pause = () => { framePause(); keys.clear(); pointerHeld = false; syncDataset(); };
    g.resume = () => { frameResume(); syncDataset(); };
    canvas.style.touchAction = 'none';
    try { canvas.focus({ preventScroll: true }); } catch { canvas.focus(); }

    const speed = () => (230 + runTime() * 3.2) * scale * (brakeTime > 0 ? .58 : 1);
    const score = () => passed * 120 + (veteran ? preciseThreads * 40 + routeBonus : 0);
    function aerobrake() {
      if (!veteran || g.paused || over || corona < 1 || brakeTime > 0) return;
      corona--; brakesUsed++; brakeTime = 1.8;
      status.textContent = 'Aerobrake: gates and censers slow, but the sixty-second clock and boss liturgy continue.';
      tone(260, .22, 'sine', .045); syncDataset();
    }
    function wingover() {
      if (!veteran || g.paused || over || corona < 1 || wingTime > 0) return;
      corona--; wingovers++; wingTime = .55;
      const holding = pointerHeld || keys.size > 0;
      const direction = Math.abs(skiff.vy) > 1 ? -Math.sign(skiff.vy) : holding ? -1 : 1;
      skiff.vy = direction * 285;
      status.textContent = 'Wingover: vertical motion reversed. The next impact within 0.55 seconds is phased; no Corona is refunded.';
      tone(520, .16, 'triangle', .045); syncDataset();
    }
    const routeName = () => !veteran ? 'classic' : runTime() < 18 ? 'Wayward tail' : runTime() < 40 ? 'Braided tail' : 'Solar crown';
    function syncDataset() {
      canvas.dataset.perihelionVeteran = String(veteran);
      canvas.dataset.perihelionRoute = routeName();
      canvas.dataset.perihelionPassed = String(passed);
      canvas.dataset.perihelionGateCount = String(gateIndex);
      canvas.dataset.perihelionPatterns = Object.keys(patternCounts).join(',');
      canvas.dataset.perihelionPhase = over ? (over > 0 ? 'won' : 'lost') : 'running';
      canvas.dataset.perihelionSpeedScale = String(scale);
      canvas.dataset.perihelionCorona = String(corona); canvas.dataset.perihelionCoronaEarned = String(coronaEarned);
      canvas.dataset.perihelionThreads = String(preciseThreads); canvas.dataset.perihelionBrakes = String(brakesUsed);
      canvas.dataset.perihelionBrakeTime = brakeTime.toFixed(3);
      canvas.dataset.perihelionWingTime = wingTime.toFixed(3); canvas.dataset.perihelionWingovers = String(wingovers);
      canvas.dataset.perihelionWingPhases = String(wingPhases); canvas.dataset.perihelionCensers = String(obstacles.filter(o => o.kind === 'censer').length);
      canvas.dataset.perihelionBeams = String(obstacles.filter(o => o.kind === 'beam').length);
      canvas.dataset.perihelionVow = vow; canvas.dataset.perihelionRouteChoices = String(routeChoices); canvas.dataset.perihelionRouteBonus = String(routeBonus);
      canvas.dataset.perihelionBossPhase = String(bossPhase); canvas.dataset.perihelionBossClears = String(bossClears);
      canvas.dataset.perihelionClock = runTime().toFixed(3);
      brakeButton.disabled = !veteran || g.paused || !!over || corona < 1 || brakeTime > 0;
      brakeButton.textContent = brakeTime > 0 ? `Aerobrake · ${brakeTime.toFixed(1)}s · charge bank paused` : `E · Aerobrake · ${corona}/3 Corona`;
      wingButton.disabled = !veteran || g.paused || !!over || corona < 1 || wingTime > 0;
      wingButton.setAttribute('aria-pressed', String(wingTime > 0));
      wingButton.textContent = wingTime > 0 ? `Q · Wingover ${wingTime.toFixed(2)}s` : `Q · Wingover · ${corona}/3 Corona`;
      tacticalStatus.textContent = [
        `${Math.max(0, Math.ceil(WIN - runTime()))}s remaining`, `Gates ${passed}`, `Score ${score()}`,
        ...(veteran ? [
          `Corona ${corona}/3`,
          brakeTime > 0 ? `Aerobrake ${brakeTime.toFixed(1)}s` : 'Aerobrake ready (E)',
          wingTime > 0 ? `Wingover ${wingTime.toFixed(2)}s · next impact phased` : 'Wingover ready (Q)',
          `${vow} Via · route bonus ${routeBonus}`,
          `Precision threads ${preciseThreads}`,
          bossPhase ? `Solar Verger liturgy ${bossPhase}/3` : `Next Verger at 48s`,
          `Censers ${obstacles.filter(o => o.kind === 'censer').length} · beams ${obstacles.filter(o => o.kind === 'beam').length}`,
        ] : []),
      ].join(' · ');
    }
    Object.defineProperty(g, 'state', { get: () => ({
      veteran, route: routeName(), passed, over, gateTimer, gateIndex, patternCounts: { ...patternCounts },
      clock: runTime(), speed: speed(), skiff: { ...skiff }, score: score(),
      corona, coronaEarned, preciseThreads, brakeTime, brakesUsed,
      wingTime, wingovers, wingPhases, vow, routeChoices, routeBonus, bossPhase, bossClears,
      obstacles: obstacles.map(o => ({ kind: o.kind, x: o.x, y: o.y, baseY: o.baseY, warning: o.warning || 0, life: o.life || 0, r: o.r || 0, width: o.width || 0 })),
      forks: forks.map(f => ({ x: f.x, upper: f.upper, lower: f.lower, resolved: f.resolved })),
      gates: gates.map(gt => ({ x: gt.x, y: gt.y, baseY: gt.baseY, age: gt.age, pattern: gt.pattern, pairOrder: gt.pairOrder, scored: gt.scored, threaded: !!gt.threaded, gap: gt.gap || gapHalf, vy: gt.pattern === 'drift' ? Math.cos(gt.age * 1.25 + gt.driftPhase) * 58 * 1.25 : 0 })),
    }) });

    function addGate(x, y, pattern = 'ring', pairOrder = 0) {
      const gap = veteran && vow === 'oxblood' ? gapHalf * .86 : veteran && vow === 'ivory' ? Math.min(66, gapHalf * 1.08) : gapHalf;
      gates.push({ x, y, baseY: y, age: 0, driftPhase: veteran ? rand() * TAU : 0, pattern, pairOrder, gap, scored: false, prevDx: null });
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    }
    function spawnCenser(x = W + 46, y = TOP + 100 + rand() * (BOT - TOP - 200)) {
      if (!veteran || obstacles.length >= 12) return;
      obstacles.push({ kind: 'censer', x, y, baseY: y, age: 0, phase: rand() * TAU, r: 18, warning: .9 });
      patternCounts.censer = (patternCounts.censer || 0) + 1;
    }
    function spawnSolarBeam(y = clamp(skiff.y + skiff.vy * .25, TOP + 30, BOT - 30)) {
      if (!veteran || obstacles.length >= 12) return;
      obstacles.push({ kind: 'beam', x: 0, y, baseY: y, warning: 1.15, life: .68, width: 15 });
      patternCounts.beam = (patternCounts.beam || 0) + 1; tone(174, .18, 'triangle', .035);
    }
    function spawnFork() {
      if (forks.length >= 2) return;
      // Fold the current gate pattern into a clean route interlude. Without
      // this explicit breather a random drift rim can overlap the lower vow
      // and make an otherwise legible route choice geometrically unfair.
      gates = [];
      gateTimer = Math.max(gateTimer, (W + 70 - skiff.x) / speed() + 1.2);
      forks.push({ x: W + 70, upper: TOP + 100, lower: BOT - 100, prevDx: null, resolved: false });
      status.textContent = 'The armillary folds the old gates into a safe route interlude. Upper IVORY grants a Corona and gentler gates; lower OXBLOOD narrows gates, adds censers and pays score.';
    }
    function spawnGate() {
      if (!veteran) {
        addGate(W + R + 40, TOP + 95 + random() * (BOT - TOP - 190));
        gateIndex++; syncDataset(); return 'ring';
      }
      const sequences = vow === 'oxblood' ? {
        'Wayward tail': ['drift', 'pair', 'ring'],
        'Braided tail': ['pair', 'drift', 'pair'],
        'Solar crown': ['pair', 'drift', 'pair'],
      } : vow === 'ivory' ? {
        'Wayward tail': ['drift', 'pair', 'ring'],
        'Braided tail': ['ring', 'drift', 'pair'],
        'Solar crown': ['ring', 'drift', 'ring'],
      } : {
        'Wayward tail': ['drift', 'pair', 'ring'],
        'Braided tail': ['pair', 'drift', 'pair'],
        'Solar crown': ['drift', 'pair', 'drift'],
      };
      const sequence = sequences[routeName()], pattern = sequence[gateIndex % sequence.length];
      const x = W + R + 40, y = TOP + 95 + rand() * (BOT - TOP - 190);
      addGate(x, y, pattern);
      if (pattern === 'pair') {
        // The echo follows far enough behind for a full climb/dive reversal.
        // Cap its opposite offset at 140 so veteran speed never makes the
        // second gap geometrically impossible after threading the first.
        const echoY = clamp(clamp(TOP + BOT - y, y - 140, y + 140), TOP + 95, BOT - 95);
        addGate(x + PAIR_GAP, echoY, 'pair', 1);
      }
      gateIndex++;
      if (vow === 'oxblood' && gateIndex % 2 === 0) spawnCenser(x + 170);
      syncDataset(); return pattern;
    }
    const firstPattern = spawnGate();
    gateTimer = (520 + random() * 90 + (firstPattern === 'pair' ? PAIR_GAP : 0)) / speed();
    syncDataset();

    function end(won) {
      if (over) return; over = won ? 1 : -1;
      if (won && veteran && bossPhaseSeen === 3) bossClears = 1;
      status.textContent = won ? veteran && bossClears ? 'The Solar Verger is outlasted. Perihelion reached through all three liturgies.' : 'Perihelion reached.' : 'The skiff is lost to the light.';
      syncDataset();
      if (won) { burst(skiff.x, skiff.y, '#f2d38a', 30, 240); tone(660, .3, 'sine', .06); tone(990, .45, 'sine', .05); }
      g.after(() => { g.destroy(); onEnd({ won, score: score() }); }, 850);
    }

    function crash(kind, gy) {
      if (verbs.has('cinder') && !forgiven) {
        forgiven = true; invuln = 1.6;
        skiff.y = clamp(skiff.y, TOP + SK + 4, BOT - SK - 4);
        skiff.vy = kind === 'rim' ? (skiff.y < gy ? -250 : 250) : (skiff.y < (TOP + BOT) / 2 ? 250 : -250);
        burst(skiff.x, skiff.y, '#f2a66c', 22, 200); tone(220, .25, 'triangle', .05);
        if (!reduced()) shake = 6;
        return;
      }
      burst(skiff.x, skiff.y, '#f58e9b', 30, 240); tone(110, .4, 'sawtooth', .06);
      if (!reduced()) shake = 9;
      end(false);
    }

    function phaseImpact(x = skiff.x, y = skiff.y) {
      if (wingTime <= 0) return false;
      wingTime = 0; wingPhases++; invuln = Math.max(invuln, .18);
      burst(x, y, '#eee1c2', 10, 130); tone(740, .1, 'triangle', .04); syncDataset();
      return true;
    }
    function updateBoss(dt) {
      const t = runTime();
      bossPhase = veteran && t >= 48 ? t < 52 ? 1 : t < 56 ? 2 : 3 : 0;
      if (bossPhase && bossPhase !== bossPhaseSeen) {
        bossPhaseSeen = bossPhase; bossAttackTimer = .75;
        // Each liturgy folds away the random slalom before dealing its own
        // authored pressure. Boss survival must never depend on an unlucky rim
        // overlapping a locked beam or route censer.
        gates = []; obstacles = [];
        gateTimer = bossPhase === 1 ? 2.4 : bossPhase === 2 ? 4.5 : 5;
        const names = ['', 'I · Procession of Censers', 'II · The Locked Nave', 'III · Crown of Perihelion'];
        status.textContent = `SOLAR VERGER ${names[bossPhase]}. ${bossPhase === 1 ? 'Read the vertical rails and Wingover through one censer if trapped.' : bossPhase === 2 ? 'Oxblood lanes lock your predicted height; climb or dive before the ivory beam.' : 'Censers and beams alternate. Spend Corona now; survival clears the Verger.'}`;
        if (bossPhase === 1) spawnCenser(W + 45, TOP + 115);
        if (bossPhase === 2) spawnSolarBeam();
        if (bossPhase === 3) { spawnSolarBeam(TOP + 85); spawnCenser(W + 55, BOT - 105); }
        tone(92 + bossPhase * 24, .45, 'sawtooth', .05);
      }
      if (!bossPhase) return;
      bossAttackTimer -= dt;
      if (bossAttackTimer > 0) return;
      if (bossPhase === 1) { spawnCenser(); bossAttackTimer = 3.4; }
      else if (bossPhase === 2) { spawnSolarBeam(); bossAttackTimer = 2.35; }
      else {
        if ((patternCounts.beam || 0) % 2) spawnCenser(); else spawnSolarBeam();
        bossAttackTimer = 1.8;
      }
    }
    function updateForks(dt, sp) {
      if (veteran && runTime() >= 18 && !forkOne) { forkOne = true; spawnFork(); }
      if (veteran && runTime() >= 38 && !forkTwo) { forkTwo = true; spawnFork(); }
      for (let i = forks.length - 1; i >= 0; i--) {
        const fork = forks[i]; fork.x -= sp * dt;
        const dx = fork.x - skiff.x;
        if (!fork.resolved && fork.prevDx !== null && fork.prevDx > 0 && dx <= 0) {
          fork.resolved = true; routeChoices++;
          vow = Math.abs(skiff.y - fork.upper) <= Math.abs(skiff.y - fork.lower) ? 'ivory' : 'oxblood';
          if (vow === 'ivory') {
            corona = Math.min(3, corona + 1);
            status.textContent = 'Ivory Via sworn: one Corona restored; future gates widen and favour steady rings.';
          } else {
            routeBonus += 200; spawnCenser(fork.x + 170);
            status.textContent = 'Oxblood Via sworn: +200 route score; gates narrow and every second gate adds a censer.';
          }
          tone(vow === 'ivory' ? 620 : 184, .22, 'triangle', .045); syncDataset();
        }
        fork.prevDx = dx;
        if (fork.x < -100) forks.splice(i, 1);
      }
    }
    function updateObstacles(dt, sp) {
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        if (o.warning > 0) o.warning -= dt;
        if (o.kind === 'censer') {
          o.age += dt * (brakeTime > 0 ? .58 : 1); o.x -= sp * dt;
          o.y = clamp(o.baseY + Math.sin(o.age * 1.45 + o.phase) * 76, TOP + 32, BOT - 32);
          if (o.x < -60) { obstacles.splice(i, 1); continue; }
          if (o.warning <= 0 && invuln <= 0 && Math.hypot(skiff.x - o.x, skiff.y - o.y) < o.r + SK) {
            if (phaseImpact(o.x, o.y)) { obstacles.splice(i, 1); continue; }
            return crash('censer', o.y);
          }
        } else {
          if (o.warning <= 0) o.life -= dt;
          if (o.life <= 0) { obstacles.splice(i, 1); continue; }
          if (o.warning <= 0 && invuln <= 0 && Math.abs(skiff.y - o.y) < o.width + SK) {
            if (phaseImpact(skiff.x, o.y)) { obstacles.splice(i, 1); continue; }
            return crash('beam', o.y);
          }
        }
      }
    }

    function step(dt) {
      if (over) return;
      if (runTime() >= WIN) return end(true);
      if ((++tickN & 7) === 0) syncDataset();
      shake = Math.max(0, shake - dt * 16);
      invuln = Math.max(0, invuln - dt);
      if (wingTime > 0) {
        const before = Math.ceil(wingTime * 100);
        wingTime = Math.max(0, wingTime - dt);
        if (Math.ceil(wingTime * 100) !== before || !wingTime) syncDataset();
      }
      if (brakeTime > 0) {
        const before = Math.ceil(brakeTime * 10);
        brakeTime = Math.max(0, brakeTime - dt);
        if (Math.ceil(brakeTime * 10) !== before || !brakeTime) syncDataset();
      }
      // Hold dives, release climbs; the tail's pull is patient.
      const holding = pointerHeld || keys.size > 0;
      skiff.vy = clamp(skiff.vy + (holding ? 620 : -560) * dt, -250, 260);
      skiff.y += skiff.vy * dt;
      const sp = speed();
      updateBoss(dt); updateForks(dt, sp);
      gateTimer -= dt;
      if (gateTimer <= 0) {
        const pattern = spawnGate();
        gateTimer = (520 + random() * 90 + (veteran && pattern === 'pair' ? PAIR_GAP : 0)) / sp;
      }
      for (let i = gates.length - 1; i >= 0; i--) {
        const gt = gates[i];
        gt.age += dt;
        if (gt.pattern === 'drift') gt.y = clamp(gt.baseY + Math.sin(gt.age * 1.25 + gt.driftPhase) * 58, TOP + 95, BOT - 95);
        gt.x -= sp * dt;
        if (gt.x < -R - 60) { gates.splice(i, 1); continue; }
        const dx = gt.x - skiff.x, dy = skiff.y - gt.y, d = Math.hypot(dx, dy) || 1;
        // Threading the gate: cross its plane inside the gap.
        if (gt.prevDx !== null && gt.prevDx > 0 && dx <= 0 && !gt.scored && Math.abs(dy) < (gt.gap || gapHalf) - 4) {
          gt.scored = true; passed++;
          if (veteran && Math.abs(dy) <= 22) {
            gt.threaded = true; preciseThreads++;
            if (brakeTime <= 0 && corona < 3) { corona++; coronaEarned++; }
            tone(1040, .12, 'sine', .035);
          }
          burst(skiff.x + 24, skiff.y, '#f2d38a', 12, 150); tone(760 + passed * 8, .09, 'triangle', .05);
          syncDataset();
        }
        gt.prevDx = dx;
        if (invuln > 0) continue;
        // The rim and its finials use this gate's Via width, not a global gap.
        const localGap = gt.gap || gapHalf, localAlpha = Math.asin(localGap / R);
        const localEnds = [localAlpha, Math.PI - localAlpha, Math.PI + localAlpha, TAU - localAlpha];
        const rim = Math.abs(d - R) < SK + 3.5 && Math.abs(dy) / d > localGap / R;
        const finial = localEnds.some(a => Math.hypot(skiff.x - (gt.x + Math.cos(a) * R), skiff.y - (gt.y + Math.sin(a) * R)) < SK + 3);
        if ((rim || finial) && invuln <= 0) {
          if (phaseImpact(skiff.x, skiff.y)) continue;
          return crash('rim', gt.y);
        }
      }
      updateObstacles(dt, sp);
      if (over) return;
      // The tail's edges are the last way to fall; Wingover can phase one edge.
      if (skiff.y < TOP + SK || skiff.y > BOT - SK) {
        if (wingTime > 0) { phaseImpact(); skiff.y = clamp(skiff.y, TOP + SK, BOT - SK); skiff.vy *= -.5; }
        else if (invuln > 0) { skiff.y = clamp(skiff.y, TOP + SK, BOT - SK); skiff.vy *= -.5; }
        else return crash('edge');
      }
    }

    function draw(ctx, dt, clock) {
      ctx.save();
      if (shake > 0 && !reduced()) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      ctx.fillStyle = '#070c16'; ctx.fillRect(-14, -14, W + 28, H + 28);
      stars();
      // Cathedral rails and an oxblood solar rose replace the generic neon
      // dashboard while preserving the exact one-button flight silhouette.
      ctx.save(); ctx.strokeStyle = '#aa8b5224'; ctx.fillStyle = '#4b182418'; ctx.lineWidth = 1.5;
      for (const x of [82, W - 82]) {
        ctx.beginPath(); ctx.moveTo(x - 42, BOT + 40); ctx.lineTo(x - 42, 170); ctx.quadraticCurveTo(x, 72, x + 42, 170); ctx.lineTo(x + 42, BOT + 40); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (bossPhase) {
        ctx.translate(760, 112); ctx.strokeStyle = '#c0a06455'; ctx.fillStyle = '#4b182466';
        ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.fill(); ctx.stroke();
        for (let n = 0; n < 3; n++) { ctx.save(); ctx.rotate(n * TAU / 3 + (reduced() ? 0 : clock * .05)); ctx.beginPath(); ctx.ellipse(0, 0, 76, 21, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
        ctx.fillStyle = '#e5d5ae'; ctx.beginPath(); ctx.arc(0, 0, 7 + bossPhase * 2, 0, TAU); ctx.fill();
      }
      ctx.restore();
      // The comet's tail: dark beyond the rails, a gilt haze within.
      ctx.fillStyle = '#07111e'; ctx.fillRect(0, 0, W, TOP - 40); ctx.fillRect(0, BOT + 40, W, H - BOT - 40);
      const hazeT = ctx.createLinearGradient(0, TOP - 40, 0, TOP);
      hazeT.addColorStop(0, '#c4ac7900'); hazeT.addColorStop(1, '#c4ac7914');
      ctx.fillStyle = hazeT; ctx.fillRect(0, TOP - 40, W, 40);
      const hazeB = ctx.createLinearGradient(0, BOT + 40, 0, BOT);
      hazeB.addColorStop(0, '#c4ac7900'); hazeB.addColorStop(1, '#c4ac7914');
      ctx.fillStyle = hazeB; ctx.fillRect(0, BOT, W, 40);
      ctx.strokeStyle = brakeTime > 0 ? '#9ed7c6' : '#c4ac79'; ctx.lineWidth = brakeTime > 0 ? 3 : 2; ctx.setLineDash([10, 7]);
      ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(W, TOP); ctx.moveTo(0, BOT); ctx.lineTo(W, BOT); ctx.stroke();
      ctx.setLineDash([]);
      // Faint teal streaks streaming past, a sense of speed.
      if (!reduced()) {
        ctx.strokeStyle = '#9ec7d41c'; ctx.lineWidth = 1.5;
        const sp = speed();
        for (let i = 0; i < 10; i++) {
          const sx = ((i * 211 - clock * sp * 1.1) % (W + 240) + W + 240) % (W + 240) - 120;
          const sy = TOP + 24 + (i * 67) % (BOT - TOP - 48);
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 46, sy); ctx.stroke();
        }
      }
      // The golden gates: two arcs with a gap fore and aft. Veteran drift
      // gates carry a teal travel rail; paired gates are numbered I and II.
      for (const gt of gates) {
        if (veteran) {
          // A static centre glyph marks the precision thread even with reduced
          // motion; it never pulses or relies on the drift animation.
          ctx.save(); ctx.strokeStyle = gt.threaded ? '#effff8' : '#9ed7c6'; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(gt.x, gt.y - 7); ctx.lineTo(gt.x + 7, gt.y); ctx.lineTo(gt.x, gt.y + 7); ctx.lineTo(gt.x - 7, gt.y); ctx.closePath(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(gt.x - 13, gt.y - 22); ctx.lineTo(gt.x + 13, gt.y - 22);
          ctx.moveTo(gt.x - 13, gt.y + 22); ctx.lineTo(gt.x + 13, gt.y + 22); ctx.stroke(); ctx.restore();
        }
        if (gt.pattern === 'drift') {
          ctx.save(); ctx.strokeStyle = '#9ed7c65c'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]);
          ctx.beginPath(); ctx.moveTo(gt.x, gt.baseY - 68); ctx.lineTo(gt.x, gt.baseY + 68); ctx.stroke();
          ctx.setLineDash([]); ctx.fillStyle = '#9ed7c6';
          for (const dir of [-1, 1]) {
            const y = gt.baseY + dir * 70;
            ctx.beginPath(); ctx.moveTo(gt.x, y + dir * 5); ctx.lineTo(gt.x - 5, y - dir * 3); ctx.lineTo(gt.x + 5, y - dir * 3); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }
        if (gt.pattern === 'pair') {
          ctx.fillStyle = '#9ed7c6'; ctx.font = SMALL; ctx.textAlign = 'center';
          ctx.fillText(gt.pairOrder ? 'II' : 'I', gt.x - R - 18, gt.y + 4);
        }
        const gateAlpha = Math.asin((gt.gap || gapHalf) / R);
        const gateEnds = [gateAlpha, Math.PI - gateAlpha, Math.PI + gateAlpha, TAU - gateAlpha];
        ctx.strokeStyle = '#c4ac7926'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, gateAlpha, Math.PI - gateAlpha); ctx.stroke();
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, Math.PI + gateAlpha, TAU - gateAlpha); ctx.stroke();
        ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, gateAlpha, Math.PI - gateAlpha); ctx.stroke();
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, Math.PI + gateAlpha, TAU - gateAlpha); ctx.stroke();
        ctx.fillStyle = '#f2d38a';
        for (const a of gateEnds) { ctx.beginPath(); ctx.arc(gt.x + Math.cos(a) * R, gt.y + Math.sin(a) * R, 3.4, 0, TAU); ctx.fill(); }
      }
      // Route forks are nonlethal armillary portals. Their labels are echoed in
      // the 14px DOM tactical readout on narrow screens.
      for (const fork of forks) {
        ctx.save(); ctx.font = SMALL; ctx.textAlign = 'center';
        for (const [label, y, colour] of [['IVORY · SAFE', fork.upper, '#eee1c2'], ['OXBLOOD · +200', fork.lower, '#b86a72']]) {
          ctx.strokeStyle = colour; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.arc(fork.x, y, 55, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.ellipse(fork.x, y, 66, 20, .55, 0, TAU); ctx.stroke();
          ctx.fillStyle = colour; ctx.fillText(label, fork.x, y - 66);
        }
        ctx.restore();
      }
      // Censers telegraph a vertical travel rail. Verger beams lock a full
      // oxblood lane before becoming a thin, readable ivory cutting line.
      for (const o of obstacles) {
        ctx.save();
        if (o.kind === 'censer') {
          ctx.strokeStyle = '#b89b6255'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 8]);
          ctx.beginPath(); ctx.moveTo(o.x, o.baseY - 88); ctx.lineTo(o.x, o.baseY + 88); ctx.stroke(); ctx.setLineDash([]);
          ctx.translate(o.x, o.y); ctx.fillStyle = '#481c28'; ctx.strokeStyle = o.warning > 0 ? '#a96a70' : '#e1c896'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(0, 0, o.r, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(0, 0, o.r + 7, 6, .5, 0, TAU); ctx.stroke();
          ctx.fillStyle = '#eee1c2'; ctx.beginPath(); ctx.moveTo(0, -o.r - 8); ctx.lineTo(5, -o.r + 1); ctx.lineTo(-5, -o.r + 1); ctx.closePath(); ctx.fill();
        } else {
          const live = o.warning <= 0;
          ctx.strokeStyle = live ? '#eee1c2' : '#a6535e'; ctx.lineWidth = live ? o.width * 2 : 3; ctx.globalAlpha = live ? .72 : reduced() ? .85 : .55 + Math.sin(clock * 12) * .2;
          ctx.setLineDash(live ? [] : [12, 9]); ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke(); ctx.setLineDash([]);
          if (!live) { ctx.fillStyle = '#e1c896'; ctx.font = SMALL; ctx.textAlign = 'left'; ctx.fillText('LOCKED NAVE', 22, o.y - 10); }
        }
        ctx.restore();
      }
      // The skiff: a gilt dart with a teal wake.
      if (invuln <= 0 || Math.floor(clock * 10) % 2 === 0) {
        ctx.save(); ctx.translate(skiff.x, skiff.y); ctx.rotate(clamp(skiff.vy * .0016, -.4, .4));
        ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -7); ctx.lineTo(-16, 0); ctx.lineTo(-10, 7); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = '#f2d38a'; ctx.beginPath(); ctx.arc(2, 0, 2.6, 0, TAU); ctx.fill();
        if (wingTime > 0) { ctx.strokeStyle = '#eee1c2'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(0, 0, 25, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        ctx.strokeStyle = '#9ed7c688'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-26 - Math.random() * 6, 0); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = HUD; ctx.textAlign = 'left';
      ctx.fillText(`GATES ${passed} · ${score()}`, 20, 28);
      ctx.textAlign = 'right';
      ctx.fillText(over ? (over > 0 ? 'PERIHELION REACHED' : 'LOST TO THE LIGHT') : `${Math.ceil(WIN - runTime())}s`, W - 20, 28);
      if (veteran) {
        ctx.fillStyle = '#d8c494'; ctx.textAlign = 'center'; ctx.font = SMALL;
        ctx.fillText(`${bossPhase ? `SOLAR VERGER · LITURGY ${bossPhase}/3` : `VETERAN · ${routeName().toUpperCase()}`} · ${vow.toUpperCase()} VIA`, W / 2, 28);
        ctx.fillText(brakeTime > 0 ? `AEROBRAKE ${brakeTime.toFixed(1)}s · CORONA BANK PAUSED` : wingTime > 0 ? `WINGOVER ${wingTime.toFixed(2)}s · NEXT IMPACT PHASED` : `CORONA ${corona}/3 · E BRAKE · Q WINGOVER`, W / 2, 48); ctx.font = HUD;
      }
      if (runTime() - timeOffset < 4.2 && !over) {
        ctx.globalAlpha = clamp((4.2 - g.clock) / 1.2, 0, 1);
        ctx.fillStyle = '#e9dcae'; ctx.font = SERIF; ctx.textAlign = 'center';
        ctx.fillText(veteran ? `Perihelion · ${routeName()}` : 'Perihelion Run', W / 2, 120);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#b7bda4'; ctx.font = SMALL; ctx.textAlign = 'center';
      ctx.fillText(veteran ? 'Hold to dive · E brake / right-click · Q Wingover phases one impact · choose Ivory or Oxblood at forks · P pauses' : 'Hold to dive — release to climb · thread the golden rings · P pauses', W / 2, H - 16);
    }

    const GAMEKEYS = new Set([' ', 'w', 'arrowup']);
    listen(canvas, 'keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'p') { syncDataset(); return; }
      if (veteran && (k === 'e' || k === 'shift')) { e.preventDefault(); if (!e.repeat) aerobrake(); return; }
      if (veteran && k === 'q') { e.preventDefault(); if (!e.repeat) wingover(); return; }
      if (!GAMEKEYS.has(k)) return;
      e.preventDefault(); keys.add(k);
    });
    listen(window, 'keyup', e => keys.delete(e.key.toLowerCase()));
    listen(window, 'blur', () => { keys.clear(); pointerHeld = false; syncDataset(); });
    listen(canvas, 'pointerdown', e => {
      if (veteran && e.button === 2) { e.preventDefault(); pointerHeld = false; aerobrake(); return; }
      pointerHeld = true; try { canvas.setPointerCapture(e.pointerId); } catch {}
    });
    listen(canvas, 'contextmenu', e => { if (veteran) e.preventDefault(); });
    listen(canvas, 'pointerup', () => { pointerHeld = false; });
    listen(canvas, 'pointercancel', () => { pointerHeld = false; });
    return g;
  }

  AT.register({
    id: 'chain', name: 'Constellation Chain', place: 'The wandering stars',
    brief: 'Your chain is your shield. Gather star-motes; every link fires on the debris.',
    create: chainGame,
  });
  AT.register({
    id: 'perihelion', name: 'Perihelion Run', place: "The comet's tail",
    brief: 'Hold to dive, release to climb. Thread the golden gates at rising speed.',
    create: perihelionGame,
  });
})();
