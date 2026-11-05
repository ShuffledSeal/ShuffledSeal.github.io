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
  const SERIF = '24px Cormorant, serif';
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
    };
    const ROUTE = [
      { name: 'Drift nursery', hint: 'Gather teal motes. Your links are both weapons and health.', events: [[0, 'drift', 2], [3, 'drift', 2], [6, 'drift', 3]] },
      { name: 'Scissor crossing', hint: 'Dashed lanes lock before firing. Move across them, not along them.', events: [[0, 'cross', 3], [4, 'cross', 3], [8, 'cross', 4]] },
      { name: 'The Needle keeper', hint: 'The diamond aims, charges, then rests. Sidestep its locked line.', events: [[0, 'elite', 1], [3, 'drift', 3], [7, 'cross', 2]] },
      { name: 'Broken crown', hint: 'Two keepers cross the field. Orbit around them; recover in their wake.', events: [[0, 'elite', 1], [2, 'cross', 3], [5, 'elite', 1], [8, 'drift', 4]] },
      { name: 'The Unraveller', hint: 'Dodge the marked cross. Attack the open core between sweeps.', events: [[0, 'boss', 1]] },
    ];
    let phase = 'ready', encounter = 0, circuit = 1, elapsed = 0, eventIndex = 0, formation = 'ribbon';
    let invuln = 0, ward = 0, wardTime = 0, pulseTime = 0, moving = false, surge = false, orbitA = 0, tickN = 0;
    let hazards = [], choices = [], relics = {}, draftCount = 0, shotsFired = 0, collected = 0, destroyed = false;
    const level = id => relics[id] || 0;
    const keys = new Set();
    let pointer = null;
    const g = frame(container, W, H, {
      label: 'Constellation Chain. Five encounters and four relic drafts. Steer with the pointer, WASD or arrows. F changes formation. Space uses an equipped Pulse heart. P pauses. Choose relics with buttons or 1, 2, 3.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(211, 70);
    const controls = document.createElement('section');
    controls.className = 'chain-controls';
    controls.setAttribute('aria-label', 'Constellation Chain controls');
    const status = document.createElement('p'); status.className = 'chain-status';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const formations = document.createElement('div'); formations.className = 'chain-formations';
    formations.setAttribute('role', 'group'); formations.setAttribute('aria-label', 'Formation');
    const draft = document.createElement('div'); draft.className = 'chain-draft';
    draft.setAttribute('role', 'group'); draft.setAttribute('aria-label', 'Safe refit: choose a relic');
    const build = document.createElement('p'); build.className = 'chain-build';
    const pulseButton = document.createElement('button'); pulseButton.type = 'button';
    pulseButton.dataset.chainPulse = ''; pulseButton.textContent = 'Pulse · Space'; pulseButton.hidden = true;
    controls.append(status, formations, build, pulseButton, draft); container.append(controls);
    for (const [id, info] of Object.entries(FORMATIONS)) {
      const button = document.createElement('button'); button.type = 'button';
      button.dataset.chainFormation = id; button.textContent = `${info.name} — ${info.hint}`;
      button.setAttribute('aria-pressed', String(id === formation)); formations.append(button);
      listen(button, 'click', () => setFormation(id));
    }
    listen(pulseButton, 'click', () => { pulse(); canvas.focus({ preventScroll: true }); });
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
      phase, encounter: encounter + 1, circuit, elapsed, formation, relics: { ...relics },
      range: FORMATIONS[formation].range, draft: !draft.hidden,
      links: links.length, linkPositions: links.map(l => ({ x: l.x, y: l.y })), head: { ...head }, choices: [...choices],
      enemies: shards.map(s => ({ x: s.x, y: s.y, hp: s.hp, kind: s.kind, mode: s.mode, r: s.r, slow: s.slow })),
      boss: shards.find(s => s.kind === 'boss')?.hp ?? 0,
      hazards: hazards.map(h => ({ x: h.x, y: h.y, dx: h.dx, dy: h.dy, warning: h.warning, width: h.width })),
      shotsFired, collected, draftCount, ward, pulseTime, broken, over,
    }) });
    // The same headline diagnostics mirrored onto the canvas as dataset
    // attributes so browser tests can wait on them without polling JS.
    function syncDataset() {
      canvas.dataset.chainPhase = phase;
      canvas.dataset.chainEncounter = String(encounter + 1);
      canvas.dataset.chainCircuit = String(circuit);
      canvas.dataset.chainFormation = formation;
      canvas.dataset.chainRange = String(FORMATIONS[formation].range);
      canvas.dataset.chainLinks = String(links.length);
      canvas.dataset.chainRelics = Object.entries(relics).map(([id, rank]) => `${id}:${rank}`).join(',');
      canvas.dataset.chainDraft = draft.hidden ? 'closed' : 'open';
      canvas.dataset.chainBoss = String(Math.round(shards.find(s => s.kind === 'boss')?.hp ?? 0));
      canvas.dataset.chainBroken = String(broken);
      canvas.dataset.chainWard = String(ward);
      canvas.dataset.chainCollected = String(collected);
    }
    canvas.style.touchAction = 'none';
    try { canvas.focus({ preventScroll: true }); } catch { canvas.focus(); }

    const score = () => broken * 100 + links.length * 20 + draftCount * 250 + (over > 0 ? 1000 : 0);

    function clearInput() { keys.clear(); pointer = null; }
    function syncControls() {
      for (const button of controls.querySelectorAll('button')) button.disabled = g.paused || !!over || destroyed;
      pulseButton.hidden = !level('nova');
      pulseButton.disabled = g.paused || phase !== 'combat' || pulseTime > 0 || !!over;
      pulseButton.textContent = pulseTime > 0 ? `Pulse · ${Math.ceil(pulseTime)}s` : 'Pulse ready · Space';
      for (const button of formations.children) button.setAttribute('aria-pressed', String(button.dataset.chainFormation === formation));
      build.textContent = `Build: ${Object.entries(relics).map(([id, rank]) => `${RELICS[id][0]} ${rank}`).join(' · ') || 'Choose your formation; relics arrive after each encounter.'}`;
      syncDataset();
    }
    function setFormation(id) {
      if (g.paused || over || destroyed) return;
      formation = id; tone(540, .06, 'sine', .03); syncControls();
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
        ? 'Five authored encounters. Every link fires and shields you. Choose a formation, then launch. F switches formation in flight.'
        : `Chain restored to ${links.length} links. No threats advance here. Choose one permanent relic, then face ${ROUTE[(encounter + 1) % ROUTE.length].name}.`;
      draft.append(heading, description);
      if (initial) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.chainStart = '';
        button.textContent = 'Launch · Enter'; draft.append(button); choices = [];
      } else {
        const pool = Object.keys(RELICS).filter(id => level(id) < 3);
        // Fisher–Yates is deterministic and consumes no cosmetic randomness.
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        choices = pool.slice(0, 3);
        for (const id of ['mend', 'guard', 'surge']) if (choices.length < 3) choices.push(id);
        const supplies = { mend: ['Reweave', 'Restore four additional links.'], guard: ['Reserve shield', 'Absorb the next impact.'], surge: ['Solar charge', 'Fire 30% faster in the next encounter.'] };
        choices.forEach((id, i) => {
          const button = document.createElement('button'); button.type = 'button'; button.dataset.chainChoice = id;
          const info = RELICS[id] || supplies[id];
          button.textContent = `${i + 1}. ${info[0]}${RELICS[id] ? ` · rank ${level(id) + 1}/3` : ''} — ${info[1]}`;
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
      if (id === 'ward') { ward = 1; wardTime = 0; }
      draftCount++; encounter++;
      if (encounter === ROUTE.length) { encounter = 0; circuit++; }
      launch();
    }
    function launch() {
      if (destroyed || g.paused || over || phase === 'combat') return;
      phase = 'combat'; elapsed = 0; eventIndex = 0; moteAt = 2.2; invuln = 1.5;
      pulseTime = 0; clearInput(); draft.hidden = true;
      head.x = 450; head.y = 320; head.dx = 1; head.dy = 0;
      links.forEach((l, i) => { l.x = head.x - (i + 1) * SP; l.y = head.y; l.cool = .1 * i; });
      status.textContent = `${circuit > 1 ? `Circuit ${circuit}. ` : ''}${encounter + 1}/5 · ${ROUTE[encounter].name}. ${ROUTE[encounter].hint}`;
      syncControls(); canvas.focus({ preventScroll: true });
    }
    function finishEncounter() {
      if (encounter === ROUTE.length - 1 && !options.endless) return end(true);
      addLinks(Math.max(0, 4 - links.length) + 1 + Math.min(2, motes.length));
      surge = false; ward = level('ward') ? 1 : ward; wardTime = 0;
      showDraft();
    }
    function spawn(kind, count) {
      const pressure = 1 + (circuit - 1) * .16;
      for (let i = 0; i < count; i++) {
        // A scissor lane is a telegraphed hazard, not a shootable shard: a
        // dashed line locks in, then a blade runs its length.
        if (kind === 'cross') {
          const fromLeft = rand() < .5;
          hazards.push({
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
        const hp = (kind === 'boss' ? 115 : kind === 'elite' ? 22 : 2) * pressure;
        const speed = (kind === 'elite' ? 95 : 76 + encounter * 8) * scale * pressure;
        const a = Math.atan2(head.y - y, head.x - x);
        const s = {
          x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          r: kind === 'boss' ? 35 : kind === 'elite' ? 22 : 14,
          hp, maxHp: hp, a: rand() * TAU, spin: rand() - .5, kind,
          mode: 'arrive', timer: kind === 'boss' ? 2.5 : 2, slow: 0, age: 0, aim: 0, sx: 0, sy: 0,
        };
        if (kind === 'elite') { s.sx = 150 + rand() * (W - 300); s.sy = 130 + rand() * (H - 260); }
        shards.push(s);
        if (kind === 'boss') { status.textContent = 'The Unraveller. Dodge the marked cross; strike while the core is open.'; tone(98, .5, 'sawtooth', .06); }
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
    function radial(x, y, radius, amount) {
      arcs.push({ ring: true, x1: x, y1: y, radius, t: .35 });
      for (const s of [...shards]) if (Math.hypot(s.x - x, s.y - y) < radius + s.r) damage(s, amount);
    }
    function pulse() {
      if (g.paused || destroyed || over || phase !== 'combat' || !level('nova') || pulseTime > 0) return;
      pulseTime = 7 - level('nova');
      radial(head.x, head.y, 125 + level('nova') * 25, 5);
      hazards = hazards.filter(h => h.warning > 0 || Math.abs((head.x - h.x) * h.dy - (head.y - h.y) * h.dx) > 150);
      tone(380, .18, 'triangle', .05); syncControls();
    }

    function end(won) {
      if (over || destroyed) return; over = won ? 1 : -1; phase = won ? 'won' : 'lost';
      status.textContent = won ? 'The Unraveller is broken. The chain holds.' : 'The chain breaks. Refit and try a different formation.';
      syncControls();
      if (won) { burst(head.x, head.y, '#f2d38a', 34, 260); tone(660, .3, 'sine', .06); tone(990, .45, 'sine', .05); }
      g.after(() => { g.destroy(); onEnd({ won, score: score() }); }, 900);
    }

    function damage(s, amount) {
      if (!shards.includes(s)) return;
      s.hp -= amount * (s.kind === 'boss' && s.mode !== 'open' ? .25 : 1);
      if (s.hp > 0) { tone(320, .05, 'triangle', .03); return; }
      if (!shards.includes(s)) return;
      shards.splice(shards.indexOf(s), 1);
      broken++;
      burst(s.x, s.y, '#d8c48b', 16, 190); tone(240 + Math.random() * 80, .1, 'triangle', .06);
      if ((broken % 6 === 0 || (verbs.has('parallax') && broken % 5 === 0) || s.kind === 'elite') && motes.length < 5)
        motes.push({ x: clamp(s.x, 50, W - 50), y: clamp(s.y, 90, H - 50), p: rand() * TAU });
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
      // Steer: keys win; otherwise glide toward the pointer. Haste speeds the
      // comet; the halo's tight orbit slows it.
      const speedMul = (1 + .14 * level('haste')) * (formation === 'halo' ? .88 : 1);
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
      // the Unraveller marks a cross, then opens its core.
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        const slowMul = s.slow > 0 ? .5 : 1;
        s.slow = Math.max(0, s.slow - dt);
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
        } else if (s.kind === 'boss') {
          const pressure = 1 + (circuit - 1) * .16;
          s.timer -= dt * slowMul;
          if (s.mode === 'arrive') {
            s.x += (680 - s.x) * Math.min(1, dt * 1.6); s.y += (270 - s.y) * Math.min(1, dt * 1.6);
            if (s.timer <= 0) { s.mode = 'aim'; s.timer = 1.2; }
          } else if (s.mode === 'aim') {
            s.x = 680 + Math.sin(s.age * .7) * 36; s.y = 270 + Math.sin(s.age * 1.1) * 24;
            if (s.timer <= 0) {
              hazards.push({ x: -24, y: clamp(head.y, 80, H - 60), dx: 1, dy: 0, warning: 1.15, width: 15, speed: 235 * scale * pressure });
              hazards.push({ x: clamp(head.x, 70, W - 40), y: -24, dx: 0, dy: 1, warning: 1.15, width: 15, speed: 215 * scale * pressure });
              tone(160, .3, 'sawtooth', .05);
              s.mode = 'sweep'; s.timer = 1.8;
            }
          } else if (s.mode === 'sweep') {
            if (s.timer <= 0) { s.mode = 'open'; s.timer = 2.6; tone(520, .2, 'sine', .05); }
          } else {
            const dx = head.x - s.x, dy = head.y - s.y, d = Math.hypot(dx, dy) || 1;
            if (d > 150) { s.x += dx / d * 30 * slowMul * dt; s.y += dy / d * 30 * slowMul * dt; }
            if (s.timer <= 0) {
              s.mode = 'aim'; s.timer = 1.2;
              if (shards.length < 6) spawn('drift', 2);
            }
          }
        } else {
          s.x += s.vx * slowMul * dt; s.y += s.vy * slowMul * dt;
          if (s.x < -100 || s.x > W + 100 || s.y < -100 || s.y > H + 100) { shards.splice(i, 1); continue; }
        }
      }
      // Scissor lanes: dashed while they lock, then a blade runs the line.
      for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i];
        if (h.warning > 0) { h.warning -= dt; if (h.warning <= 0) tone(310, .08, 'square', .04); continue; }
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
      const boltSpeed = formation === 'spear' ? 380 : 520;
      const boltDamage = formation === 'spear' ? 2 : 1;
      for (const l of links) {
        l.cool -= dt;
        if (l.cool > 0) continue;
        const targets = [];
        for (const s of shards) {
          const d = Math.hypot(s.x - l.x, s.y - l.y);
          if (d < form.range) targets.push([d, s]);
        }
        if (!targets.length) { l.cool = .12; continue; }
        targets.sort((a, b) => a[0] - b[0]);
        for (const [, t] of targets.slice(0, 1 + level('fork'))) {
          const a = Math.atan2(t.y - l.y, t.x - l.x);
          bolts.push({ x: l.x, y: l.y, vx: Math.cos(a) * boltSpeed, vy: Math.sin(a) * boltSpeed, target: t, life: 1.6, speed: boltSpeed, damage: boltDamage, pierce: level('pierce'), struck: [] });
          shotsFired++;
        }
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
            burst(b.x, b.y, '#f2d38a', 6, 90);
            damage(s, b.damage);
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
        if (level('magnet')) {
          const dx = head.x - m.x, dy = head.y - m.y, d = Math.hypot(dx, dy) || 1;
          if (d < magnetR * 1.9) { m.x += dx / d * 95 * dt; m.y += dy / d * 95 * dt; }
        }
        if (Math.hypot(m.x - head.x, m.y - head.y) < magnetR) {
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
      ctx.fillStyle = '#0e1410'; ctx.fillRect(-14, -14, W + 28, H + 28);
      stars();
      // Scissor lanes: rose dashes while they lock, a bright blade once live.
      for (const h of hazards) {
        ctx.save();
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
        ctx.strokeStyle = '#c4ac7938'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(head.x, head.y);
        for (const l of links) ctx.lineTo(l.x, l.y);
        ctx.stroke();
      }
      // Links: warm star-motes.
      for (const l of links) {
        const lg = ctx.createRadialGradient(l.x, l.y, .5, l.x, l.y, 11);
        lg.addColorStop(0, '#fff6dd'); lg.addColorStop(.45, '#f2d38a'); lg.addColorStop(1, '#f2d38a00');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(l.x, l.y, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f8e9bd'; ctx.beginPath(); ctx.arc(l.x, l.y, 3.2, 0, TAU); ctx.fill();
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
        if (s.kind === 'elite' && s.mode === 'aim') {
          ctx.save();
          ctx.globalAlpha = .45 + Math.sin(clock * 12) * .2;
          ctx.strokeStyle = '#f58e9b'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(s.aim) * 430, s.y + Math.sin(s.aim) * 430); ctx.stroke();
          ctx.restore();
        }
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
        ctx.beginPath();
        const points = s.kind === 'boss' ? 12 : 8;
        for (let i = 0; i < points; i++) {
          const a = i / points * TAU, w = s.r * (0.82 + Math.sin(i * 2.7 + s.r) * .2);
          i ? ctx.lineTo(Math.cos(a) * w, Math.sin(a) * w) : ctx.moveTo(Math.cos(a) * w, Math.sin(a) * w);
        }
        ctx.closePath();
        ctx.fillStyle = s.kind === 'boss' ? '#2c2530' : '#33302a'; ctx.fill();
        ctx.strokeStyle = s.slow > 0 ? '#9ec7d4' : s.kind === 'elite' ? '#c9846a' : s.kind === 'boss' ? '#a88950' : s.hp < 2 ? '#f58e9b' : '#8d7f5c';
        ctx.lineWidth = 2; ctx.stroke();
        if (s.hp < 2 && s.kind === 'drift') {
          ctx.strokeStyle = '#f58e9b88'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-s.r * .5, -s.r * .3); ctx.lineTo(s.r * .2, s.r * .1); ctx.lineTo(-s.r * .1, s.r * .55); ctx.stroke();
        }
        if (s.kind === 'boss') {
          const open = s.mode === 'open';
          ctx.fillStyle = open ? '#f2d38a' : '#6b5a3e';
          ctx.beginPath(); ctx.arc(0, 0, open ? 11 : 7, 0, TAU); ctx.fill();
          if (open) {
            ctx.strokeStyle = '#f2d38a88'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 16 + Math.sin(clock * 6) * 3, 0, TAU); ctx.stroke();
          }
        }
        ctx.restore();
      }
      // Bolts: short gilt streaks.
      ctx.strokeStyle = '#f2d38a'; ctx.lineWidth = 2;
      for (const b of bolts) { ctx.beginPath(); ctx.moveTo(b.x - b.vx * .014, b.y - b.vy * .014); ctx.lineTo(b.x, b.y); ctx.stroke(); }
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
      ctx.fillText(`Steer with the pointer or WASD · F formation (${FORMATIONS[formation].name})${level('nova') ? ' · Space pulse' : ''} · gather star-motes · P pauses`, W / 2, H - 16);
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
      if (k === ' ') { e.preventDefault(); pulse(); return; }
      if (k === 'enter') { if (phase === 'ready') { e.preventDefault(); launch(); } return; }
      draftKey(e);
    });
    // The same digit shortcuts work while a draft button holds focus.
    listen(draft, 'keydown', draftKey);
    listen(window, 'keyup', e => keys.delete(e.key.toLowerCase()));
    listen(window, 'blur', () => keys.clear());
    listen(canvas, 'pointerdown', e => { if (phase !== 'combat') return; pointer = point(e); try { canvas.setPointerCapture(e.pointerId); } catch {} });
    listen(canvas, 'pointermove', e => { pointer = point(e); });
    showDraft(true);
    return g;
  }

  // ── The comet's tail · Perihelion Run ─────────────────────────────────
  // The skiff flies itself; hold to dive, release to climb, and thread the
  // golden rings as the tail sweeps past faster and faster.
  function perihelionGame(container, options = {}) {
    const W = 900, H = 560, WIN = 60, TOP = 64, BOT = H - 64, R = 132, SK = 9;
    const verbs = options.verbs || new Set();
    const scale = options.speedScale || 1;
    const onEnd = options.onEnd || (() => {});
    const gapHalf = verbs.has('gyro') ? 62 : 54;
    const alpha = Math.asin(gapHalf / R);
    const ENDS = [alpha, Math.PI - alpha, Math.PI + alpha, TAU - alpha];
    const skiff = { x: 200, y: (TOP + BOT) / 2, vy: 0 };
    let gates = [], passed = 0, over = 0, invuln = 0, forgiven = false, shake = 0, gateTimer = 0, pointerHeld = false;
    const keys = new Set();
    const g = frame(container, W, H, {
      label: 'Perihelion Run. Hold Space, W, Up Arrow, or press and hold the canvas to dive; release to climb. Thread the golden rings and survive sixty seconds. Press P to pause.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(311, 60);
    canvas.style.touchAction = 'none';
    try { canvas.focus({ preventScroll: true }); } catch { canvas.focus(); }

    const speed = () => (230 + g.clock * 3.2) * scale;

    function spawnGate() {
      gates.push({ x: W + R + 40, y: TOP + 95 + Math.random() * (BOT - TOP - 190), scored: false, prevDx: null });
    }
    spawnGate();
    gateTimer = (520 + Math.random() * 90) / speed();

    function end(won) {
      if (over) return; over = won ? 1 : -1;
      if (won) { burst(skiff.x, skiff.y, '#f2d38a', 30, 240); tone(660, .3, 'sine', .06); tone(990, .45, 'sine', .05); }
      g.after(() => { g.destroy(); onEnd({ won, score: passed * 120 }); }, 850);
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

    function step(dt) {
      if (over) return;
      if (g.clock >= WIN) return end(true);
      shake = Math.max(0, shake - dt * 16);
      invuln = Math.max(0, invuln - dt);
      // Hold dives, release climbs; the tail's pull is patient.
      const holding = pointerHeld || keys.size > 0;
      skiff.vy = clamp(skiff.vy + (holding ? 620 : -560) * dt, -250, 260);
      skiff.y += skiff.vy * dt;
      const sp = speed();
      gateTimer -= dt;
      if (gateTimer <= 0) { spawnGate(); gateTimer = (520 + Math.random() * 90) / sp; }
      for (let i = gates.length - 1; i >= 0; i--) {
        const gt = gates[i];
        gt.x -= sp * dt;
        if (gt.x < -R - 60) { gates.splice(i, 1); continue; }
        const dx = gt.x - skiff.x, dy = skiff.y - gt.y, d = Math.hypot(dx, dy) || 1;
        // Threading the gate: cross its plane inside the gap.
        if (gt.prevDx !== null && gt.prevDx > 0 && dx <= 0 && !gt.scored && Math.abs(dy) < gapHalf - 4) {
          gt.scored = true; passed++;
          burst(skiff.x + 24, skiff.y, '#f2d38a', 12, 150); tone(760 + passed * 8, .09, 'triangle', .05);
        }
        gt.prevDx = dx;
        if (invuln > 0) continue;
        // The rim: on the circle, outside the gap's arc.
        if (Math.abs(d - R) < SK + 3.5 && Math.abs(dy) / d > gapHalf / R) return crash('rim', gt.y);
        // The gilt finials at the gap's corners bite too.
        for (const a of ENDS) {
          if (Math.hypot(skiff.x - (gt.x + Math.cos(a) * R), skiff.y - (gt.y + Math.sin(a) * R)) < SK + 3) return crash('rim', gt.y);
        }
      }
      // The tail's edges are the last way to fall.
      if (skiff.y < TOP + SK || skiff.y > BOT - SK) {
        if (invuln > 0) { skiff.y = clamp(skiff.y, TOP + SK, BOT - SK); skiff.vy *= -.5; }
        else return crash('edge');
      }
    }

    function draw(ctx, dt, clock) {
      ctx.save();
      if (shake > 0 && !reduced()) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      ctx.fillStyle = '#101812'; ctx.fillRect(-14, -14, W + 28, H + 28);
      stars();
      // The comet's tail: dark beyond the rails, a gilt haze within.
      ctx.fillStyle = '#070a08'; ctx.fillRect(0, 0, W, TOP - 40); ctx.fillRect(0, BOT + 40, W, H - BOT - 40);
      const hazeT = ctx.createLinearGradient(0, TOP - 40, 0, TOP);
      hazeT.addColorStop(0, '#c4ac7900'); hazeT.addColorStop(1, '#c4ac7914');
      ctx.fillStyle = hazeT; ctx.fillRect(0, TOP - 40, W, 40);
      const hazeB = ctx.createLinearGradient(0, BOT + 40, 0, BOT);
      hazeB.addColorStop(0, '#c4ac7900'); hazeB.addColorStop(1, '#c4ac7914');
      ctx.fillStyle = hazeB; ctx.fillRect(0, BOT, W, 40);
      ctx.strokeStyle = '#c4ac79'; ctx.lineWidth = 2; ctx.setLineDash([10, 7]);
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
      // The golden gates: two arcs with a gap fore and aft.
      for (const gt of gates) {
        ctx.strokeStyle = '#c4ac7926'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, alpha, Math.PI - alpha); ctx.stroke();
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, Math.PI + alpha, TAU - alpha); ctx.stroke();
        ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, alpha, Math.PI - alpha); ctx.stroke();
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, Math.PI + alpha, TAU - alpha); ctx.stroke();
        ctx.fillStyle = '#f2d38a';
        for (const a of ENDS) { ctx.beginPath(); ctx.arc(gt.x + Math.cos(a) * R, gt.y + Math.sin(a) * R, 3.4, 0, TAU); ctx.fill(); }
      }
      // The skiff: a gilt dart with a teal wake.
      if (invuln <= 0 || Math.floor(clock * 10) % 2 === 0) {
        ctx.save(); ctx.translate(skiff.x, skiff.y); ctx.rotate(clamp(skiff.vy * .0016, -.4, .4));
        ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -7); ctx.lineTo(-16, 0); ctx.lineTo(-10, 7); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = '#f2d38a'; ctx.beginPath(); ctx.arc(2, 0, 2.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#9ed7c688'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-26 - Math.random() * 6, 0); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = HUD; ctx.textAlign = 'left';
      ctx.fillText(`GATES ${passed} · ${passed * 120}`, 20, 28);
      ctx.textAlign = 'right';
      ctx.fillText(over ? (over > 0 ? 'PERIHELION REACHED' : 'LOST TO THE LIGHT') : `${Math.ceil(WIN - g.clock)}s`, W - 20, 28);
      if (g.clock < 4.2 && !over) {
        ctx.globalAlpha = clamp((4.2 - g.clock) / 1.2, 0, 1);
        ctx.fillStyle = '#e9dcae'; ctx.font = SERIF; ctx.textAlign = 'center';
        ctx.fillText('Perihelion Run', W / 2, 120);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#b7bda4'; ctx.font = SMALL; ctx.textAlign = 'center';
      ctx.fillText('Hold to dive — release to climb · thread the golden rings · P pauses', W / 2, H - 16);
    }

    const GAMEKEYS = new Set([' ', 'w', 'arrowup']);
    listen(canvas, 'keydown', e => {
      const k = e.key.toLowerCase();
      if (!GAMEKEYS.has(k)) return;
      e.preventDefault(); keys.add(k);
    });
    listen(window, 'keyup', e => keys.delete(e.key.toLowerCase()));
    listen(window, 'blur', () => { keys.clear(); pointerHeld = false; });
    listen(canvas, 'pointerdown', e => { pointerHeld = true; try { canvas.setPointerCapture(e.pointerId); } catch {} });
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
