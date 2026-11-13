'use strict';

// Starforge is deliberately approximate: all orbital motion is deterministic and
// motes are capped, so each layout can be read and rebuilt without simulation drift.
window.AetherStarforge = (() => {
  const SAVE_KEY = 'aether-starforge-v1';
  const W = 900, H = 560, TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const wrap = angle => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const angleGap = (a, b) => Math.abs(wrap(a - b));
  const devices = {
    mirror: { glyph: '◇', name: 'Mirror', tone: '#f6d695', gate: -Math.PI / 2, heat: 0 },
    conductor: { glyph: '─', name: 'Conductor', tone: '#9fdded', gate: 0, heat: 0 },
    splitter: { glyph: 'Y', name: 'Splitter', tone: '#c7a7ef', gate: Math.PI / 4, heat: 3 },
    furnace: { glyph: '✦', name: 'Furnace', tone: '#ff9d6f', gate: Math.PI / 2, heat: 12 },
    capacitor: { glyph: '▣', name: 'Capacitor', tone: '#a9d98d', gate: Math.PI * .75, heat: 2 },
    regulator: { glyph: '◌', name: 'Regulator', tone: '#91d8c3', gate: Math.PI, heat: -7 },
    rail: { glyph: '═', name: 'Rail', tone: '#d2bd8d', gate: -Math.PI * .75, heat: -1 },
  };
  const scenarios = [
    { name: 'First Spark', brief: 'Teach the foundry to catch, carry, forge, and cool one ray.', target: 3, seconds: 38, cap: 52, tools: ['mirror', 'conductor', 'furnace', 'regulator'] },
    { name: 'The Divided Choir', brief: 'A splitter doubles output, but the furnace runs hotter.', target: 7, seconds: 44, cap: 62, required: ['splitter'], tools: ['mirror', 'conductor', 'splitter', 'furnace', 'regulator'] },
    { name: 'Reliquary Rhythm', brief: 'Charge a capacitor to keep the furnace singing through the dim.', target: 10, seconds: 48, cap: 72, required: ['capacitor'], tools: ['mirror', 'conductor', 'splitter', 'furnace', 'capacitor', 'regulator'] },
    { name: 'Ash Vault', brief: 'A cooling rail is the only mercy in this close-packed furnace.', target: 12, seconds: 52, cap: 54, required: ['rail'], tools: ['mirror', 'conductor', 'splitter', 'furnace', 'capacitor', 'regulator', 'rail'] },
    { name: 'Black Glass Relay', brief: 'The eclipse swallows every third pulse. Store enough light to endure it.', target: 15, seconds: 58, cap: 72, required: ['splitter', 'capacitor', 'rail'], eclipse: true, tools: ['mirror', 'conductor', 'splitter', 'furnace', 'capacitor', 'regulator', 'rail'] },
    { name: 'The Dying Clock', brief: 'Every quarter turn seals a machine type. Vent once, then finish the star.', target: 18, seconds: 62, cap: 86, boss: true, freeze: ['splitter', 'capacitor', 'rail'], tools: ['mirror', 'conductor', 'splitter', 'furnace', 'capacitor', 'regulator', 'rail'] },
    { name: 'The Astral Crucible', brief: 'Two eclipses in one cycle. Store charge between the dark pulses and keep the furnace below its brass limit.', target: 21, seconds: 64, cap: 78, required: ['splitter', 'capacitor', 'rail'], eclipse: true, tools: ['mirror', 'conductor', 'splitter', 'furnace', 'capacitor', 'regulator', 'rail'] },
    { name: 'The Last Orrery', brief: 'The mirror and regulator take turns being sealed. Build for the recovery windows, not for a single perfect pulse.', target: 26, seconds: 70, cap: 76, boss: true, required: ['splitter', 'capacitor', 'rail'], eclipse: true, freeze: ['mirror', 'regulator'], tools: ['mirror', 'conductor', 'splitter', 'furnace', 'capacitor', 'regulator', 'rail'] },
    { name: 'The Ember Covenant', brief: 'A wide resonance window banks light instead of delivering it. Vent at 24+ heat for the full capacitor; early vents halve the yield. Two vents only.', target: 20, seconds: 68, cap: 88, pressure: 24, vents: 2, required: ['splitter', 'capacitor', 'rail'], tools: ['mirror', 'conductor', 'splitter', 'furnace', 'capacitor', 'regulator', 'rail'] },
    { name: 'The Nocturne Machina', brief: 'Prime the anvil, discharge the conjoined choir, then arm a Ward and seal the machine heart. Four inner sockets and three buses turn the foundry into a counterplay engine.', target: 20, seconds: 110, cap: 96, pressure: 20, vents: 3, machine: true, required: ['splitter', 'capacitor'], tools: ['mirror', 'conductor', 'splitter', 'furnace', 'capacitor', 'regulator', 'rail'] },
  ];
  const MACHINE_PHASES = Object.freeze([
    { name: 'Ⅰ · PRIME THE ANVIL', objective: 'Deliver 6 embers directly. Heat Lances are telegraphed: hold the Cooling bus on impact, or align an inner Rail.', attack: 'lance' },
    { name: 'Ⅱ · DISCHARGE THE CHOIR', objective: 'Bank light, then Vent at 20+ heat to reach 14 delivered. Brake on Clock Snares or suffer a bounded device seal.', attack: 'seal' },
    { name: 'Ⅲ · ARM THE LAST WARD', objective: 'Reach 20 delivered, route the Ward bus to arm at least one Ward, then Seal the Heart. Drain is stopped only by an armed Ward bus.', attack: 'drain' },
  ]);

  function readSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
      const best = Number.isFinite(raw.best) ? raw.best : 0;
      return { completed: clamp(Number.isInteger(raw.completed) ? raw.completed : 0, 0, scenarios.length), best: clamp(best, 0, 1e9) };
    } catch { return { completed: 0, best: 0 }; }
  }
  function save(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {} }

  function create(container, options = {}) {
    const stored = readSave();
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const available = options.veteran ? scenarios : scenarios.slice(0, 6);
    let scenarioIndex = clamp(Number.isInteger(options.scenario) ? options.scenario : stored.completed, 0, available.length - 1);
    let selected = 'mirror', modules = [], motes = [], phase = 0, pulse = 0, pulseCount = 0, energy = 0, heat = 0, charge = 0, discharges = 0, route = 'forge', divertedPulses = 0, shuntedCharge = 0, vents = available[scenarioIndex].vents || 1;
    let remaining = available[scenarioIndex].seconds, running = false, ended = false, completed = false, paused = false, destroyed = false, frame = 0, last = 0, endTimer = 0;
    let ward = 0, wardPulses = 0, bossPhase = 0, bossPulse = 0, bossAttack = '', bossLocks = {}, bossStrikes = 0, bossParries = { lance: 0, seal: 0, drain: 0 }, bossLast = '', brake = false, heartReady = false, keyboardSlot = 0, removeMode = false;
    let renderedTools = '', renderedScenarios = '';
    const controller = new AbortController();
    const { signal } = controller;
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.innerHTML = `<style>
      .starforge-shell{--sf-brass:#c2a56a;--sf-ivory:#eee2c8;--sf-oxblood:#651e32;color:var(--sf-ivory)}.starforge-shell [hidden]{display:none!important}.starforge-shell .starforge-status{background:#8f774c55;border-color:#9e855966}.starforge-shell .starforge-status>div{background:linear-gradient(145deg,#111521,#0a0d15)}.starforge-shell .starforge-status strong{color:#e7ca8c}.starforge-shell #starforge-brief{font-size:14px;line-height:1.4;letter-spacing:0;color:#c8c2b5}.starforge-shell .starforge-guide{background:linear-gradient(90deg,#151a28,#1d111c);border-color:#9e855977;font-size:14px;line-height:1.55}.starforge-shell .starforge-guide strong{font-size:14px;color:#e5c685}.starforge-shell .starforge-canvas{background:#050711;border-color:#9e855966}.starforge-shell .starforge-tools button,.starforge-shell .starforge-scenarios button{background:#111622;border-color:#8f774c66;min-height:40px}.starforge-shell .starforge-tools button[aria-pressed=true],.starforge-shell .starforge-scenarios button[aria-pressed=true]{background:#421827;color:#ffe5b5;border-color:#c2a56a}.starforge-shell .starforge-actions{flex-wrap:wrap}.starforge-shell .starforge-actions button{min-height:42px}.starforge-shell .starforge-actions span{font-size:14px;line-height:1.5;flex:1 1 220px}.starforge-shell .starforge-machine-panel{display:grid;grid-template-columns:1.2fr 1fr;gap:12px;padding:13px 16px;border:1px solid #9e855966;border-top:0;background:radial-gradient(circle at 80% 0,#651e3238,transparent 55%),#0b0e18;font-size:14px;line-height:1.55}.starforge-shell .starforge-machine-panel[hidden]{display:none}.starforge-shell .starforge-machine-panel strong{display:block;color:#e3c383;font-size:16px;margin-bottom:4px}.starforge-shell .starforge-machine-panel p{margin:0;color:#cdc6b8}.starforge-shell .starforge-machine-panel .sf-warning{color:#f0b8a8}.starforge-shell .starforge-topology{border-left:1px solid #8f774c55;padding-left:12px}.starforge-shell .starforge-master-contract{margin:4px 0 14px;padding:13px;border:1px solid #8f774c66;background:linear-gradient(120deg,#111725,#1d101a);display:flex;align-items:center;gap:14px}.starforge-shell .starforge-master-contract button{min-height:44px;padding:9px 14px;border:1px solid #c2a56a;background:#49192a;color:#f5dfb2;font-weight:600}.starforge-shell .starforge-master-contract button[aria-pressed=true]{background:#c2a56a;color:#12101a}.starforge-shell .starforge-master-contract button:disabled{opacity:.4}.starforge-shell .starforge-master-contract span{font-size:14px;line-height:1.5;color:#c9c2b4}.starforge-shell [data-starforge=ward][aria-pressed=true],.starforge-shell [data-starforge=brake][aria-pressed=true],.starforge-shell [data-starforge=remove][aria-pressed=true]{border-color:#d7b879;background:#49192a;color:#ffe4b0}
      @media(max-width:640px){.starforge-shell .starforge-machine-panel{grid-template-columns:1fr}.starforge-shell .starforge-topology{border-left:0;border-top:1px solid #8f774c55;padding:9px 0 0}.starforge-shell .starforge-master-contract{align-items:flex-start;flex-direction:column}.starforge-shell .starforge-actions button{min-height:44px}}@media(pointer:coarse){.starforge-shell .starforge-tools button,.starforge-shell .starforge-scenarios button{min-height:44px}}@media(prefers-reduced-motion:reduce){.starforge-shell *{scroll-behavior:auto!important}}
    </style><section class="starforge-shell" aria-label="Starforge workshop"><header class="starforge-status"><div><span>CONTRACT</span><strong id="starforge-contract"></strong><small id="starforge-brief"></small></div><div><span>DELIVERED</span><strong id="starforge-energy">0 / 0</strong><small>EMBER UNITS</small></div><div><span>FOUNDRY HEAT</span><strong id="starforge-heat">0 / 0</strong><meter id="starforge-meter" min="0" max="1" value="0"></meter></div><div><span>CYCLE</span><strong id="starforge-time">0:00</strong><small id="starforge-state">BUILD BEFORE IGNITION</small></div></header><div class="starforge-guide" aria-live="polite"><strong id="starforge-guide-title">BUILD A LIGHT PATH</strong><span id="starforge-guide-detail">The Mirror catches the core ray at the TOP gate; the Conductor carries it to the RIGHT gate; the Furnace forges it at the BOTTOM gate. Fit each device in its matching socket before ignition.</span></div><aside class="starforge-machine-panel" data-machine-panel hidden aria-label="Nocturne Machina objectives"><div><strong data-machine-phase></strong><p data-machine-objective></p><p data-machine-attack aria-live="polite"></p></div><div class="starforge-topology"><strong>BLACKENED-BRASS TOPOLOGY</strong><p data-machine-topology></p></div></aside><canvas class="starforge-canvas" width="900" height="560" tabindex="0" role="application" aria-label="Starforge workshop. Place the mirror at the top socket to catch light from the core, conductor at right, and furnace at bottom. The colored named gates stay still; installed sockets orbit on ignition. Space starts or pauses the cycle. Right click removes a device."></canvas><div class="starforge-tools" role="group" aria-label="Foundry devices"></div><footer class="starforge-actions"><button type="button" class="button button-primary" data-starforge="run">IGNITE CYCLE</button><button type="button" class="button" data-starforge="vent">VENT HEAT · 1</button>${options.veteran ? '<button type="button" class="button" data-starforge="route" aria-pressed="false">DIVERT TO COOLING · D</button><button type="button" class="button" data-starforge="ward" aria-pressed="false" hidden>WARD BUS · A</button><button type="button" class="button" data-starforge="brake" aria-pressed="false" hidden>BRAKE ORBIT · B</button><button type="button" class="button button-primary" data-starforge="seal" hidden>SEAL THE HEART</button>' : ''}<button type="button" class="button" data-starforge="remove" aria-pressed="false">REMOVE DEVICE · X</button><button type="button" class="button" data-starforge="reset">CLEAR SCHEMATIC</button><span>Click a device, then a socket. Right click / Delete / X Remove mode removes one device. Arrow keys choose a socket; Enter installs. <kbd>Space</kbd> starts or pauses.</span></footer><div class="starforge-scenarios" role="group" aria-label="Starforge contracts"></div>${options.veteran ? '<div class="starforge-master-contract"><button type="button" data-star-scenario="9" aria-pressed="false">Ⅹ · THE NOCTURNE MACHINA</button><span>Separate final machine contract · three phases · inner-ring topology · Cooling / Brake / Ward counterplay. Standard campaign unlocks and records are not advanced.</span></div>' : ''}</section>`;
    const canvas = container.querySelector('canvas'), ctx = canvas.getContext('2d');
    const tools = container.querySelector('.starforge-tools'), scenarioList = container.querySelector('.starforge-scenarios');
    const contract = container.querySelector('#starforge-contract'), brief = container.querySelector('#starforge-brief');
    const energyLabel = container.querySelector('#starforge-energy'), heatLabel = container.querySelector('#starforge-heat');
    const meter = container.querySelector('#starforge-meter'), timeLabel = container.querySelector('#starforge-time');
    const stateLabel = container.querySelector('#starforge-state'), runButton = container.querySelector('[data-starforge="run"]'), ventButton = container.querySelector('[data-starforge="vent"]'), routeButton = container.querySelector('[data-starforge="route"]');
    const wardButton = container.querySelector('[data-starforge="ward"]'), brakeButton = container.querySelector('[data-starforge="brake"]'), sealButton = container.querySelector('[data-starforge="seal"]');
    const removeButton = container.querySelector('[data-starforge="remove"]'), resetButton = container.querySelector('[data-starforge="reset"]');
    const guideTitle = container.querySelector('#starforge-guide-title'), guideDetail = container.querySelector('#starforge-guide-detail');
    canvas.style.touchAction = 'none';

    function scenario() { const base = available[scenarioIndex]; return options.veteran && !base.machine ? { ...base, target: Math.ceil(base.target * 1.25), cap: Math.round(base.cap * .9) } : base; }
    function pressureActive() { const level = scenario(); return level.machine ? bossPhase > 0 : Boolean(level.pressure); }
    const restingAngle = slot => (slot >= 8 ? (slot - 8) * TAU / 4 : slot * TAU / 8) - Math.PI / 2;
    function position(slot, radius = 182) {
      const inner = scenario().machine && slot >= 8;
      const angle = phase + restingAngle(slot);
      const orbit = inner ? 112 : radius;
      return { x: W * .5 + Math.cos(angle) * orbit, y: H * .5 + Math.sin(angle) * orbit, angle, inner };
    }
    const slotCount = () => scenario().machine ? 12 : 8;
    function machineTopology() {
      if (!scenario().machine) return { linked: false, innerRegulator: false, innerRail: false, label: '' };
      const at = id => modules.find(module => module.id === id), splitter = at('splitter'), furnace = at('furnace'), capacitor = at('capacitor'), regulator = at('regulator'), rail = at('rail');
      // Outer sockets form an eight-node ring; inner sockets form a separate
      // four-node ring. Cross-ring links exist only on the four radial spokes.
      const near = (a, b) => {
        if (!a || !b || a.slot === b.slot) return false;
        const ar = a.slot < 8 ? 8 : 4, br = b.slot < 8 ? 8 : 4;
        if (ar === br) { const distance = Math.abs(a.slot - b.slot); return Math.min(distance, ar - distance) === 1; }
        const outer = a.slot < 8 ? a.slot : b.slot, inner = a.slot < 8 ? b.slot : a.slot;
        return outer % 2 === 0 && inner === 8 + outer / 2;
      };
      const linked = Boolean(near(splitter, furnace) && near(furnace, capacitor));
      const innerRegulator = Boolean(regulator?.slot >= 8), innerRail = Boolean(rail?.slot >= 8);
      const labels = [linked ? 'Conjoined choir: +1 output / +3 heat' : 'Separate the choir, or chain Splitter–Furnace–Capacitor for +1 output / +3 heat', innerRegulator ? 'Inner Regulator: −5 additional heat per pulse' : 'Inner Regulator socket available', innerRail ? 'Inner Rail: −3 heat and Heat Lance catch' : 'Inner Rail socket available'];
      return { linked, innerRegulator, innerRail, label: labels.join(' · ') };
    }
    const path = () => ['mirror', 'conductor', 'furnace', ...(scenario().required || []), 'regulator'].filter((id, index, all) => all.indexOf(id) === index);
    function explainPath() {
      const missing = path().filter(id => id !== 'regulator' && !modules.some(module => module.id === id));
      const mirror = modules.find(module => module.id === 'mirror');
      const wrong = modules.find(module => angleGap(restingAngle(module.slot), devices[module.id].gate) >= .24);
      let title, detail;
      if (paused) {
        title = 'INSTRUMENTS LOCKED';
        detail = 'The simulation and every gameplay control are paused. Resume through the observatory overlay before refitting or routing.';
      } else if (wrong) {
        title = 'MISALIGNED · REFIT LIVE OR PAUSE CYCLE';
        detail = `${devices[wrong.id].name} starts away from its gate. Move it to the matching colored marker. Live refit is immediate; Pause Cycle for a still schematic.`;
      } else if (missing.length) {
        const next = missing[0];
        title = `NEXT: ${devices[next].name.toUpperCase()} → ${next === 'mirror' ? 'TOP' : next === 'conductor' ? 'RIGHT' : next === 'furnace' ? 'BOTTOM' : 'ITS NAMED GATE'}`;
        detail = next === 'mirror' ? 'The Mirror catches the ray from the CENTER only when it passes the TOP gate. Put it in socket 1 to start.' : `Place the ${devices[next].name} on its colored, named gate. A ray flows only when all required devices pass their gates together.`;
      } else if (scenario().machine) {
        const directive = MACHINE_PHASES[bossPhase];
        title = bossAttack ? `${bossAttack.toUpperCase()} TELEGRAPHED · ${bossAttack === 'lance' ? 'COOLING BUS / INNER RAIL' : bossAttack === 'seal' ? 'BRAKE ORBIT' : 'ARMED WARD BUS'}` : heartReady ? 'HEART EXPOSED · ARM A WARD AND SEAL' : brake ? 'ORBIT BRAKED · PRODUCTION HELD' : running ? directive.name : `${directive.name} · BUILD / IGNITE`;
        detail = `${directive.objective} ${route === 'ward' ? `Ward bus live: ${ward} armed; every four live pulses arm one, with no delivery.` : route === 'cooling' ? 'Cooling bus live: output held while heat falls.' : 'Forge bus live.'} ${bossLast}`;
      } else if (options.veteran && route === 'cooling') {
        title = running ? 'COOLING BUS · OUTPUT HELD' : 'COOLING BUS ROUTED · IGNITE TO COOL';
        detail = `No units forged while diverted; cycle time continues. Every fifth live cooling pulse shunts 1 banked unit for −6 heat. ${charge} banked · ${shuntedCharge} shunted.`;
      } else if (pressureActive()) {
        const resonant = active('mirror') && active('conductor') && active('furnace');
        title = !running ? 'PRESSURE CIRCUIT ALIGNED · IGNITE TO BANK' : heat >= scenario().pressure ? 'CAPACITOR PRIMED · VENT FOR FULL DELIVERY' : resonant ? `BANKING LIGHT · PRIME TO ${scenario().pressure} HEAT` : 'RESONANCE WINDOW CLOSED · BANK HELD';
        detail = `${charge} units banked; ${energy} delivered. Vent at ${scenario().pressure}+ heat to deliver the whole bank. An early vent delivers only half and still spends one of ${vents} remaining vent${vents === 1 ? '' : 's'}.`;
      } else if (running && (!active('mirror') || !active('conductor') || !active('furnace'))) {
        title = 'CIRCUIT SET · WAITING FOR GATE WINDOW';
        detail = 'The fixed gates do not move: the Mirror at top catches the core ray while Conductor at right and Furnace at bottom pass their gates at the same instant.';
      } else {
        title = running ? 'CIRCUIT LIVE · LIGHT IS FLOWING' : 'CIRCUIT ALIGNED · IGNITE WHEN READY';
        detail = mirror ? 'Mirror catches at top → Conductor carries at right → Furnace forges at bottom. Regulator at left cools the furnace.' : '';
      }
      if (title !== guideTitle.textContent) guideTitle.textContent = title;
      if (detail !== guideDetail.textContent) guideDetail.textContent = detail;
      canvas.dataset.pathHint = title;
    }
    function refreshUi() {
      const level = scenario(), machine = level.machine;
      contract.textContent = `${String(scenarioIndex + 1).padStart(2, '0')} · ${level.name.toUpperCase()}`;
      brief.textContent = level.brief;
      energyLabel.textContent = `${energy} / ${level.target}`;
      heatLabel.textContent = `${Math.round(heat)} / ${level.cap}`;
      meter.max = level.cap; meter.value = heat;
      canvas.dataset.scenario = String(scenarioIndex + 1);
      canvas.dataset.energy = String(energy);
      canvas.dataset.heat = String(Math.round(heat));
      canvas.dataset.running = String(running);
      canvas.dataset.paused = String(paused);
      canvas.dataset.charge = String(charge); canvas.dataset.vents = String(vents); canvas.dataset.discharges = String(discharges);
      canvas.dataset.route = options.veteran ? route : 'standard'; canvas.dataset.divertedPulses = String(divertedPulses); canvas.dataset.shuntedCharge = String(shuntedCharge); canvas.dataset.veteran = String(Boolean(options.veteran));
      canvas.dataset.mechanic = machine ? 'machine-contract' : level.pressure ? 'capacitor-discharge' : level.freeze ? 'clock-seals' : level.eclipse ? 'eclipse' : 'direct-flow';
      canvas.dataset.pressure = String(level.pressure || 0); canvas.dataset.ended = String(ended); canvas.dataset.completed = String(completed);
      canvas.dataset.bossPhase = String(bossPhase + 1); canvas.dataset.bossPulse = String(bossPulse); canvas.dataset.bossAttack = bossAttack; canvas.dataset.bossLast = bossLast; canvas.dataset.ward = String(ward); canvas.dataset.brake = String(brake); canvas.dataset.heartReady = String(heartReady); canvas.dataset.bossLocks = JSON.stringify(bossLocks); canvas.dataset.bossParries = JSON.stringify(bossParries); canvas.dataset.topology = machine ? machineTopology().label : ''; canvas.dataset.inputMode = removeMode ? 'remove' : 'place';
      canvas.setAttribute('aria-label', `${paused ? 'Instruments locked. Resume before playing. ' : ''}${machine ? `Nocturne Machina schematic. ${MACHINE_PHASES[bossPhase].objective} ${bossAttack ? `${bossAttack} telegraphed.` : ''} ${ward} Wards armed. Essential live instruments follow in DOM text.` : 'Starforge workshop. Place devices on their named gates.'} Arrow keys choose a socket; Enter installs; Delete or X Remove mode removes. Space starts or pauses.`);
      const machinePanel = container.querySelector('[data-machine-panel]'); machinePanel.hidden = !machine;
      if (machine) {
        container.querySelector('[data-machine-phase]').textContent = `${MACHINE_PHASES[bossPhase].name} · ${energy} / ${level.target} DELIVERED`;
        container.querySelector('[data-machine-objective]').textContent = `${MACHINE_PHASES[bossPhase].objective} BANK ${charge} · ${ward} WARDS · ${vents} VENTS`;
        const attack = container.querySelector('[data-machine-attack]'); attack.classList.toggle('sf-warning', Boolean(bossAttack) || heartReady);
        attack.textContent = bossAttack ? `TELEGRAPH · ${bossAttack.toUpperCase()} · ${bossAttack === 'lance' ? 'Cooling bus or aligned inner Rail.' : bossAttack === 'seal' ? 'Brake before impact; production pauses.' : 'Ward bus with an armed Ward.'} ${bossLast}` : heartReady ? `HEART READY · Route Ward bus, arm a Ward, then Seal the Heart. Route: ${route.toUpperCase()}.` : `${brake ? 'BRAKED · production held. ' : ''}Route: ${route.toUpperCase()} · Heat ${Math.round(heat)} / ${level.cap} · ${bossLast || 'Watch this DOM telegraph; canvas text is decorative.'}`;
        container.querySelector('[data-machine-topology]').textContent = `${machineTopology().label}. Outer sockets 1–8; inner heart sockets 9–12.`;
      }
      timeLabel.textContent = `${Math.floor(remaining / 60)}:${String(Math.ceil(remaining % 60)).padStart(2, '0')}`;
      const frozen = frozenDevice();
      const pressureState = pressureActive() && running ? `BANK ${charge} · ${heat >= level.pressure ? 'VENT FOR FULL DELIVERY' : `PRIME TO ${level.pressure} HEAT`}` : '';
      const routeState = options.veteran && route === 'cooling' && running ? 'COOLING BUS · OUTPUT HELD' : options.veteran && route === 'ward' && running ? `WARD BUS · ${ward} ARMED` : '';
      stateLabel.textContent = paused ? 'INSTRUMENTS LOCKED · RESUME TO CONTINUE' : ended ? (completed ? 'CONTRACT SEALED' : heat >= level.cap ? 'FOUNDRY OVERPRESSURE' : 'STAR EXTINGUISHED') : machine && heartReady ? 'HEART READY · WARD + SEAL' : machine && bossAttack ? `${bossAttack.toUpperCase()} TELEGRAPH` : machine && brake ? 'ORBIT BRAKED · OUTPUT HELD' : frozen ? `CLOCK SEALS ${devices[frozen].name.toUpperCase()}` : routeState || pressureState || (running ? (level.eclipse ? 'ECLIPSE: EVERY THIRD PULSE LOST' : 'ORBITAL CYCLE LIVE') : 'BUILD BEFORE IGNITION');
      runButton.textContent = paused ? 'PAUSED' : running ? 'PAUSE CYCLE' : 'IGNITE CYCLE'; runButton.disabled = paused || ended;
      ventButton.textContent = pressureActive() ? `VENT / DELIVER ${charge} · ${vents}` : `VENT HEAT · ${vents}`;
      ventButton.disabled = paused || vents < 1 || ended || (pressureActive() && charge < 1);
      if (routeButton) { routeButton.textContent = route === 'cooling' ? 'RETURN TO FORGE · D' : 'DIVERT TO COOLING · D'; routeButton.setAttribute('aria-pressed', String(route === 'cooling')); routeButton.disabled = paused || ended; }
      if (wardButton) { wardButton.hidden = !machine; wardButton.textContent = route === 'ward' ? 'RETURN TO FORGE · A' : `WARD BUS (${ward}) · A`; wardButton.setAttribute('aria-pressed', String(route === 'ward')); wardButton.disabled = paused || ended || bossPhase !== 2; }
      if (brakeButton) { brakeButton.hidden = !machine; brakeButton.textContent = brake ? 'RELEASE BRAKE · B' : 'BRAKE ORBIT · B'; brakeButton.setAttribute('aria-pressed', String(brake)); brakeButton.disabled = paused || ended; }
      if (sealButton) { sealButton.hidden = !machine; sealButton.disabled = paused || ended || bossPhase !== 2 || !heartReady || route !== 'ward' || ward < 1; }
      if (removeButton) { removeButton.disabled = paused || ended; removeButton.setAttribute('aria-pressed', String(removeMode)); removeButton.textContent = removeMode ? 'REMOVE: TAP SOCKET · X' : 'REMOVE DEVICE · X'; }
      if (resetButton) resetButton.disabled = paused || Boolean(endTimer);
      const nextTools = level.tools.map(id => `<button type="button" data-star-tool="${id}" aria-pressed="${selected === id}"><b style="color:${devices[id].tone}">${devices[id].glyph}</b>${devices[id].name}</button>`).join('');
      const nextScenarios = available.slice(0, 9).map((item, index) => `<button type="button" data-star-scenario="${index}" ${paused || endTimer || (index < 6 && index > stored.completed) || (index >= 6 && stored.completed < 6) ? 'disabled' : ''} aria-pressed="${scenarioIndex === index}"><span>${index < stored.completed ? '✦' : index + 1}</span>${item.name}</button>`).join('');
      if (nextTools !== renderedTools) { tools.innerHTML = nextTools; renderedTools = nextTools; }
      if (nextScenarios !== renderedScenarios) { scenarioList.innerHTML = nextScenarios; renderedScenarios = nextScenarios; }
      const master = container.querySelector('.starforge-master-contract [data-star-scenario]');
      if (master) { master.disabled = paused || Boolean(endTimer) || stored.completed < 6; master.setAttribute('aria-pressed', String(scenarioIndex === 9)); }
      explainPath();
    }
    function reset() {
      if (destroyed || paused || endTimer) return;
      modules = []; motes = []; phase = 0; pulse = 0; pulseCount = 0; energy = 0; heat = 0; charge = 0; discharges = 0; route = 'forge'; divertedPulses = 0; shuntedCharge = 0; vents = scenario().vents || 1; remaining = scenario().seconds; running = false; ended = false; completed = false;
      ward = 0; wardPulses = 0; bossPhase = 0; bossPulse = 0; bossAttack = ''; bossLocks = {}; bossStrikes = 0; bossParries = { lance: 0, seal: 0, drain: 0 }; bossLast = ''; brake = false; heartReady = false; keyboardSlot = 0; removeMode = false;
      if (endTimer) { clearTimeout(endTimer); endTimer = 0; }
      renderNow();
    }
    function emit(from, to, tone) { if (reduced()) return; motes.push({ x: from.x, y: from.y, tx: to.x, ty: to.y, tone, life: .75, max: .75 }); if (motes.length > 40) motes.shift(); }
    function frozenDevice() {
      const cycle = scenario().freeze;
      if (!running || !cycle) return null;
      return cycle[Math.floor((scenario().seconds - remaining) / 8) % cycle.length];
    }
    function gateTolerance() { return pressureActive() ? .95 : .24; }
    function active(id) {
      if (frozenDevice() === id || (scenario().machine && bossLocks[id] > 0)) return null;
      const device = devices[id];
      return modules.find(module => module.id === id && angleGap(position(module.slot).angle, device.gate) < gateTolerance());
    }
    function bossTick() {
      if (!scenario().machine) return;
      for (const [id, ticks] of Object.entries(bossLocks)) {
        if (ticks <= 1) delete bossLocks[id]; else bossLocks[id] = ticks - 1;
      }
      bossPulse++;
      const type = MACHINE_PHASES[bossPhase].attack, beat = bossPulse % 20;
      if (beat === 15) { bossAttack = type; bossLast = ''; }
      if (beat !== 0 || bossPulse < 20) return;
      bossStrikes++; bossAttack = '';
      if (type === 'lance') {
        const caught = route === 'cooling' || (machineTopology().innerRail && active('rail'));
        if (caught) { bossParries.lance++; bossLast = `Heat Lance ${bossStrikes} caught by ${route === 'cooling' ? 'Cooling bus' : 'inner Rail'}.`; }
        else { heat += 12; bossLast = `Heat Lance ${bossStrikes} struck: +12 heat. Cooling or an aligned inner Rail catches the next.`; }
      } else if (type === 'seal') {
        if (brake) { bossParries.seal++; bossLast = `Clock Snare ${bossStrikes} broken by the Brake.`; }
        else {
          const target = bossStrikes % 2 ? 'splitter' : 'capacitor'; bossLocks[target] = 10;
          bossLast = `Clock Snare sealed ${devices[target].name} for 10 pulses. Brake at the next telegraph.`;
        }
      } else {
        if (route === 'ward' && ward > 0) { ward--; bossParries.drain++; bossLast = `Drain ${bossStrikes} consumed one armed Ward; production and charge held.`; }
        else {
          charge = Math.max(0, charge - 2); energy = Math.max(14, energy - 2);
          bossLast = `Drain ${bossStrikes} removed two banked/delivered units. Arm the Ward bus before the next impact.`;
        }
      }
    }
    function updateBossObjective() {
      if (!scenario().machine) return;
      if (bossPhase === 0 && energy >= 6) {
        bossPhase = 1; bossPulse = 0; bossAttack = ''; bossLocks = {}; brake = false; charge = 0; bossLast = 'Anvil primed. The Choir now banks light; Vent at 20+ heat.';
      } else if (bossPhase === 1 && discharges >= 1 && energy >= 14) {
        bossPhase = 2; bossPulse = 0; bossAttack = ''; bossLocks = {}; brake = false; bossLast = 'Choir discharged. Reach 20, arm a Ward, then Seal the Heart.';
      }
      heartReady = bossPhase === 2 && energy >= 20;
    }
    function pulseFlow() {
      const mirror = active('mirror'), conductor = active('conductor'), furnace = active('furnace'), regulator = active('regulator');
      if (!mirror || !conductor || !furnace) return;
      if ((scenario().required || []).some(id => !active(id))) return;
      if (scenario().eclipse && pulseCount % 3 === 0) return;
      const core = { x: W * .5, y: H * .5 };
      const mirrorPos = position(mirror.slot), conductorPos = position(conductor.slot), furnacePos = position(furnace.slot);
      if (scenario().machine && route === 'ward') {
        emit(core, mirrorPos, devices.mirror.tone); emit(mirrorPos, conductorPos, devices.conductor.tone); emit(conductorPos, core, '#e8d8b5');
        heat += 2 + (regulator ? devices.regulator.heat : 0) + (machineTopology().innerRegulator ? -5 : 0);
        if (bossPhase === 2) { wardPulses++; if (wardPulses % 4 === 0) ward = Math.min(3, ward + 1); } else wardPulses = 0;
        return;
      }
      if (options.veteran && route === 'cooling') {
        const sink = regulator ? position(regulator.slot) : furnacePos;
        emit(core, mirrorPos, devices.mirror.tone); emit(mirrorPos, conductorPos, devices.conductor.tone); emit(conductorPos, sink, devices.regulator.tone);
        heat = Math.max(0, heat - 5 - (regulator ? 5 : 0) - (active('rail') ? 2 : 0) - (scenario().machine && machineTopology().innerRegulator ? 5 : 0) - (scenario().machine && machineTopology().innerRail ? 3 : 0)); divertedPulses++;
        // Banked light is a finite coolant in Ember Covenant: diverting buys
        // time and heat headroom by sacrificing units that could be delivered.
        if (charge > 0 && divertedPulses % 5 === 0) { charge--; shuntedCharge++; heat = Math.max(0, heat - 6); }
        return;
      }
      emit(core, mirrorPos, devices.mirror.tone); emit(mirrorPos, conductorPos, devices.conductor.tone); emit(conductorPos, furnacePos, devices.furnace.tone);
      const bonus = active('splitter') ? 1 : 0;
      const storedCharge = active('capacitor') ? 1 : 0, topology = machineTopology();
      const output = 1 + bonus + storedCharge + (topology.linked ? 1 : 0);
      if (pressureActive()) charge += output; else energy += output;
      heat += devices.furnace.heat + (bonus ? devices.splitter.heat : 0) + (storedCharge ? devices.capacitor.heat : 0) + (regulator ? devices.regulator.heat : 0) + (active('rail') ? -4 : 0) + (topology.linked ? 3 : 0) + (topology.innerRegulator ? -5 : 0) + (topology.innerRail ? -3 : 0);
    }
    function toggleRoute() {
      if (!options.veteran || paused || ended) return;
      route = route === 'cooling' ? 'forge' : 'cooling'; removeMode = false; renderNow();
    }
    function toggleWard() {
      if (!scenario().machine || paused || ended || bossPhase !== 2) return;
      route = route === 'ward' ? 'forge' : 'ward'; removeMode = false; renderNow();
    }
    function toggleBrake() {
      if (!scenario().machine || paused || ended) return;
      brake = !brake; renderNow();
    }
    function sealHeart() {
      if (!scenario().machine || paused || ended || bossPhase !== 2 || !heartReady || route !== 'ward' || ward < 1) return;
      ward--; bossLast = 'The armed Ward bus holds the eclipse open. The Nocturne heart is sealed.'; finish(true);
    }
    function toggleRemoveMode() {
      if (paused || ended) return;
      removeMode = !removeMode; renderNow();
    }
    function vent() {
      const level = scenario(), banking = pressureActive();
      if (paused || vents < 1 || ended || (banking && charge < 1)) return;
      const fullDelivery = banking && heat >= level.pressure;
      const released = banking ? (fullDelivery ? charge : Math.max(1, Math.floor(charge / 2))) : 0;
      vents--; heat = Math.max(0, heat - 24);
      if (banking) { charge = 0; discharges++; energy += released; }
      updateBossObjective();
      if (!level.machine && energy >= level.target) finish(true); else renderNow();
    }
    function finish(won) {
      if (ended) return;
      ended = true; completed = won; running = false;
      if (won) {
        if (!options.veteran) stored.completed = Math.max(stored.completed, Math.min(available.length, scenarioIndex + 1));
        stored.best = Math.max(stored.best, energy);
        save(stored);
      }
      // The recap delay is tracked so destroy() can cancel it: onEnd fires at
      // most once, and never into a torn-down stage. Reset/scenario controls
      // stay locked until this settlement instead of cancelling a completed run.
      endTimer = window.setTimeout(() => {
        endTimer = 0;
        if (destroyed) return;
        renderNow();
        options.onEnd?.({ won, score: energy * 250 + Math.round(remaining * 10) });
      }, 900);
      renderNow();
    }
    function step(dt) {
      if (running && !ended && !paused) {
        if (!brake) phase = (phase + dt * .82) % TAU;
        remaining = Math.max(0, remaining - dt);
        heat = Math.max(0, heat - dt * 1.5);
        pulse += dt;
        if (pulse >= .2) {
          pulse %= .2; pulseCount++;
          if (scenario().machine) { bossTick(); if (!brake) pulseFlow(); updateBossObjective(); }
          else pulseFlow();
        }
        if (!scenario().machine && energy >= scenario().target) finish(true);
        else if (heat >= scenario().cap || remaining <= 0) finish(false);
      }
      motes = motes.filter(mote => (mote.life -= dt) > 0);
    }
    function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const grad = ctx.createRadialGradient(W * .5, H * .5, 20, W * .5, H * .5, 480); grad.addColorStop(0, scenario().machine ? '#5a1b2c' : '#44231c'); grad.addColorStop(.35, '#151827'); grad.addColorStop(1, '#050711'); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const x = (i * 149) % W, y = (i * 83) % H; ctx.fillStyle = `rgba(231,216,173,${.09 + (i % 4) * .025})`; ctx.fillRect(x, y, 1, 1); }
      const cx = W * .5, cy = H * .5;
      [112, 182, 252].forEach((radius, index) => { ctx.strokeStyle = index === 1 ? 'rgba(228,189,122,.42)' : 'rgba(185,198,184,.18)'; ctx.lineWidth = index === 1 ? 2 : 1; circle(cx, cy, radius); ctx.stroke(); });
       Object.values(devices).forEach(device => { const x = cx + Math.cos(device.gate) * 225, y = cy + Math.sin(device.gate) * 225; ctx.fillStyle = device.tone; ctx.globalAlpha = .72; circle(x, y, 4); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#ddd4b9'; ctx.font = '11px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(device.name.toUpperCase(), x, y - 10); });
       modules.forEach(module => { const p = position(module.slot), device = devices[module.id], aligned = angleGap(p.angle, device.gate) < gateTolerance(); const gate = { x: cx + Math.cos(device.gate) * 225, y: cy + Math.sin(device.gate) * 225 }; ctx.save(); ctx.strokeStyle = aligned ? device.tone : '#a99b8055'; ctx.setLineDash(aligned ? [] : [3, 5]); ctx.lineWidth = aligned ? 3 : 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(gate.x, gate.y); ctx.stroke(); ctx.restore(); });
       const sun = ctx.createRadialGradient(cx, cy, 4, cx, cy, 48); sun.addColorStop(0, '#fff4c9'); sun.addColorStop(.32, '#f3ae68'); sun.addColorStop(1, 'rgba(142,54,31,0)'); ctx.fillStyle = sun; circle(cx, cy, 48); ctx.fill(); ctx.fillStyle = '#f8e8b6'; circle(cx, cy, 10); ctx.fill();
       if (scenario().pressure && charge) { ctx.strokeStyle = devices.capacitor.tone; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 58, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, charge / scenario().target)); ctx.stroke(); }
       const caught = active('mirror');
       if (caught) { const p = position(caught.slot); ctx.save(); ctx.strokeStyle = '#f6d695'; ctx.lineWidth = 3; ctx.shadowColor = '#f6d695'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore(); }
      for (let slot = 0; slot < slotCount(); slot++) { const p = position(slot); ctx.strokeStyle = slot === keyboardSlot ? '#f2dfae' : p.inner ? 'rgba(194,137,119,.82)' : 'rgba(229,204,151,.65)'; ctx.lineWidth = slot === keyboardSlot ? 4 : 2; if (p.inner) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4); ctx.strokeRect(-17, -17, 34, 34); ctx.restore(); } else { circle(p.x, p.y, 23); ctx.stroke(); } ctx.fillStyle = '#d8caa7'; ctx.font = '12px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(slot + 1), p.x, p.y + 39); }
       modules.forEach(module => { const p = position(module.slot), device = devices[module.id], aligned = angleGap(p.angle, device.gate) < gateTolerance(); ctx.fillStyle = '#101820'; circle(p.x, p.y, 19); ctx.fill(); ctx.strokeStyle = device.tone; ctx.lineWidth = aligned ? 3 : 2; circle(p.x, p.y, 19); ctx.stroke(); ctx.fillStyle = device.tone; ctx.font = 'bold 21px "IM Fell English", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(device.glyph, p.x, p.y + 7); if (aligned) { ctx.font = 'bold 13px "DM Sans", sans-serif'; ctx.fillText('✓', p.x + 23, p.y - 16); } });
      if (scenario().machine) {
        ctx.strokeStyle = heartReady ? '#f0d392' : '#a56172'; ctx.lineWidth = 4; ctx.setLineDash([5, 7]); circle(cx, cy, 72); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#eadcbf'; ctx.font = 'bold 16px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${ward} WARD${ward === 1 ? '' : 'S'} · ${brake ? 'BRAKED' : route.toUpperCase()}`, cx, cy + 91);
        if (bossAttack) { ctx.fillStyle = 'rgba(63,15,31,.9)'; ctx.fillRect(210, 18, 480, 48); ctx.strokeStyle = '#c79276'; ctx.strokeRect(210, 18, 480, 48); ctx.fillStyle = '#ffe0ba'; ctx.font = 'bold 22px "DM Sans", sans-serif'; ctx.fillText(`${bossAttack.toUpperCase()} · IMPACT AT PULSE ${Math.ceil(bossPulse / 20) * 20}`, cx, 49); }
        for (const [id, ticks] of Object.entries(bossLocks)) { const module = modules.find(item => item.id === id); if (!module) continue; const p = position(module.slot); ctx.fillStyle = '#f1a38e'; ctx.font = 'bold 14px "DM Sans", sans-serif'; ctx.fillText(`SEAL ${ticks}`, p.x, p.y - 30); }
      }
      motes.forEach(mote => { const progress = 1 - mote.life / mote.max, x = mote.x + (mote.tx - mote.x) * progress, y = mote.y + (mote.ty - mote.y) * progress; ctx.fillStyle = mote.tone; circle(x, y, 5); ctx.fill(); });
      ctx.fillStyle = 'rgba(8,14,18,.72)'; ctx.fillRect(24, H - 96, 360, 70); ctx.fillStyle = '#f0d9a1'; ctx.font = '600 13px "DM Sans", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`SELECTED: ${devices[selected].name.toUpperCase()}`, 40, H - 67); ctx.fillStyle = '#b5c9bf'; ctx.font = '12px "DM Sans", sans-serif'; ctx.fillText('Align each device with its named gate as the rail turns.', 40, H - 43); ctx.fillText(options.veteran && route === 'cooling' ? `COOLING BUS · NO OUTPUT · ${shuntedCharge} BANKED UNITS SHUNTED` : scenario().pressure ? `BANK ${charge} · ${heat >= scenario().pressure ? 'VENT NOW FOR FULL DELIVERY' : `PRIME TO ${scenario().pressure} HEAT BEFORE VENTING`}` : frozenDevice() ? `THE DYING CLOCK HAS SEALED ${devices[frozenDevice()].name.toUpperCase()}.` : 'A complete path flashes only when all gates coincide.', 40, H - 25);
      if (ended) { ctx.fillStyle = 'rgba(4,8,12,.72)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = completed ? '#f7d68f' : '#ef9a82'; ctx.font = '46px "IM Fell English", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(completed ? 'CONTRACT SEALED' : 'THE FOUNDRY FALLS SILENT', cx, cy - 12); ctx.fillStyle = '#d9d1bc'; ctx.font = '16px "DM Sans", sans-serif'; ctx.fillText(completed ? 'A new star blueprint enters the observatory ledger.' : 'Rebuild the schematic and try another rhythm.', cx, cy + 24); }
    }
    function renderNow() { draw(); refreshUi(); }
    // The rAF loop only runs while the cycle is live or motes are still fading;
    // the build phase renders on demand from the input handlers below instead.
    function schedule() { if (!frame && !destroyed && !document.hidden) frame = requestAnimationFrame(loop); }
    function loop(now) {
      frame = 0;
      if (destroyed || document.hidden) return;
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now;
      step(dt);
      draw();
      refreshUi();
      if (!paused && ((running && !ended) || motes.length)) schedule();
    }
    function install(slot, remove = false) {
      if (slot < 0 || slot >= slotCount() || paused || ended) return;
      keyboardSlot = slot;
      if (remove) modules = modules.filter(module => module.slot !== slot);
      else { modules = modules.filter(module => module.slot !== slot && module.id !== selected); modules.push({ id: selected, slot }); }
      renderNow();
    }
    function pointer(event) {
      event.preventDefault(); if (paused || ended) return;
      const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width * W, y = (event.clientY - rect.top) / rect.height * H;
      let nearest = -1, distance = Infinity;
      for (let slot = 0; slot < slotCount(); slot++) { const p = position(slot), d = Math.hypot(x - p.x, y - p.y); if (d < distance) { distance = d; nearest = slot; } }
      if (distance > 35) return;
      install(nearest, event.button === 2 || removeMode);
    }
    canvas.addEventListener('pointerdown', pointer, { signal });
    canvas.addEventListener('contextmenu', event => event.preventDefault(), { signal });
    canvas.addEventListener('keydown', event => {
      if (event.repeat || ended || paused || event.altKey || event.ctrlKey || event.metaKey) return;
      if (options.veteran && event.code === 'KeyD') { event.preventDefault(); toggleRoute(); return; }
      if (scenario().machine && event.code === 'KeyA') { event.preventDefault(); toggleWard(); return; }
      if (scenario().machine && event.code === 'KeyB') { event.preventDefault(); toggleBrake(); return; }
      if (event.code === 'KeyX') { event.preventDefault(); toggleRemoveMode(); return; }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); install(keyboardSlot, true); return; }
      if (event.key === 'Enter') { event.preventDefault(); install(keyboardSlot, removeMode); return; }
      if (!event.key.startsWith('Arrow')) return;
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      keyboardSlot = (keyboardSlot + delta + slotCount()) % slotCount(); renderNow();
    }, { signal });
    // Space only drives the cycle when the canvas itself is focused — never
    // while a real control or an open dialog owns the interaction.
    window.addEventListener('keydown', event => {
      if (event.code !== 'Space' || event.repeat || ended || paused) return;
      const target = event.target;
      const control = target instanceof HTMLElement && target.closest('button, input, select, textarea, a, [contenteditable]');
      if (control || target !== canvas || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      running = !running;
      last = 0;
      renderNow();
      schedule();
    }, { signal });
    container.addEventListener('click', event => {
      if (paused || destroyed) return;
      const tool = event.target.closest('[data-star-tool]'); if (tool) { selected = tool.dataset.starTool; removeMode = false; renderNow(); return; }
      const level = event.target.closest('[data-star-scenario]'); if (level && !endTimer) { scenarioIndex = Number(level.dataset.starScenario); reset(); return; }
      const action = event.target.closest('[data-starforge]')?.dataset.starforge;
      if (action === 'run' && !ended) { running = !running; last = 0; renderNow(); schedule(); }
      if (action === 'vent') vent();
      if (action === 'route') toggleRoute();
      if (action === 'ward') toggleWard();
      if (action === 'brake') toggleBrake();
      if (action === 'seal') sealHeart();
      if (action === 'remove') toggleRemoveMode();
      if (action === 'reset') reset();
    }, { signal });
    // Never schedule frames in a hidden tab; pick up cleanly on return.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (frame) { cancelAnimationFrame(frame); frame = 0; } }
      else { last = 0; schedule(); }
    }, { signal });
    // Idempotent external pause for modal overlays: the sim freezes and resume
    // restarts the frame clock instead of skipping the hidden elapsed time.
    function pause() {
      if (paused || destroyed) return;
      paused = true;
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      renderNow();
    }
    function resume() {
      if (!paused || destroyed) return;
      paused = false;
      last = 0;
      renderNow();
      schedule();
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (endTimer) clearTimeout(endTimer);
      endTimer = 0;
      const restoreTo = document.activeElement === canvas && previousFocus?.isConnected ? previousFocus : null;
      controller.abort();
      container.replaceChildren();
      restoreTo?.focus({ preventScroll: true });
    }
    renderNow();
    canvas.focus({ preventScroll: true });
    return { destroy, pause, resume, get state() { return { scenario: scenarioIndex, energy, heat, charge, vents, discharges, route, divertedPulses, shuntedCharge, remaining, running, ended, completed, paused, modules: modules.slice(), machine: Boolean(scenario().machine), bossPhase, bossPulse, bossAttack, bossLocks: { ...bossLocks }, bossParries: { ...bossParries }, bossLast, ward, wardPulses, brake, heartReady, keyboardSlot, removeMode, topology: machineTopology() }; } };
  }
  return { create, scenarios };
})();
