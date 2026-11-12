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
  ];

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
    let remaining = available[scenarioIndex].seconds, running = false, ended = false, paused = false, destroyed = false, frame = 0, last = 0, endTimer = 0;
    let renderedTools = '', renderedScenarios = '';
    const controller = new AbortController();
    const { signal } = controller;
    container.innerHTML = `<section class="starforge-shell" aria-label="Starforge workshop"><header class="starforge-status"><div><span>CONTRACT</span><strong id="starforge-contract"></strong><small id="starforge-brief"></small></div><div><span>DELIVERED</span><strong id="starforge-energy">0 / 0</strong><small>EMBER UNITS</small></div><div><span>FOUNDRY HEAT</span><strong id="starforge-heat">0 / 0</strong><meter id="starforge-meter" min="0" max="1" value="0"></meter></div><div><span>CYCLE</span><strong id="starforge-time">0:00</strong><small id="starforge-state">BUILD BEFORE IGNITION</small></div></header><div class="starforge-guide" aria-live="polite"><strong id="starforge-guide-title">BUILD A LIGHT PATH</strong><span id="starforge-guide-detail">The Mirror catches the core ray at the TOP gate; the Conductor carries it to the RIGHT gate; the Furnace forges it at the BOTTOM gate. Fit each device in its matching socket before ignition.</span></div><canvas class="starforge-canvas" width="900" height="560" tabindex="0" role="application" aria-label="Starforge workshop. Place the mirror at the top socket to catch light from the core, conductor at right, and furnace at bottom. The colored named gates stay still; installed sockets orbit on ignition. Space starts or pauses the cycle. Right click removes a device."></canvas><div class="starforge-tools" role="group" aria-label="Foundry devices"></div><footer class="starforge-actions"><button type="button" class="button button-primary" data-starforge="run">IGNITE CYCLE</button><button type="button" class="button" data-starforge="vent">VENT HEAT · 1</button>${options.veteran ? '<button type="button" class="button" data-starforge="route" aria-pressed="false">DIVERT TO COOLING · D</button>' : ''}<button type="button" class="button" data-starforge="reset">CLEAR SCHEMATIC</button><span>Click a device, then a socket. Right click removes. <kbd>Space</kbd> starts or pauses.</span></footer><div class="starforge-scenarios" role="group" aria-label="Starforge contracts"></div></section>`;
    const canvas = container.querySelector('canvas'), ctx = canvas.getContext('2d');
    const tools = container.querySelector('.starforge-tools'), scenarioList = container.querySelector('.starforge-scenarios');
    const contract = container.querySelector('#starforge-contract'), brief = container.querySelector('#starforge-brief');
    const energyLabel = container.querySelector('#starforge-energy'), heatLabel = container.querySelector('#starforge-heat');
    const meter = container.querySelector('#starforge-meter'), timeLabel = container.querySelector('#starforge-time');
    const stateLabel = container.querySelector('#starforge-state'), runButton = container.querySelector('[data-starforge="run"]'), ventButton = container.querySelector('[data-starforge="vent"]'), routeButton = container.querySelector('[data-starforge="route"]');
    const guideTitle = container.querySelector('#starforge-guide-title'), guideDetail = container.querySelector('#starforge-guide-detail');
    canvas.style.touchAction = 'none';

    function scenario() { const base = available[scenarioIndex]; return options.veteran ? { ...base, target: Math.ceil(base.target * 1.25), cap: Math.round(base.cap * .9) } : base; }
    function position(slot, radius = 182) {
      const angle = phase + slot * TAU / 8 - Math.PI / 2;
      return { x: W * .5 + Math.cos(angle) * radius, y: H * .5 + Math.sin(angle) * radius, angle };
    }
    const path = () => ['mirror', 'conductor', 'furnace', ...(scenario().required || []), 'regulator'].filter((id, index, all) => all.indexOf(id) === index);
    function explainPath() {
      const missing = path().filter(id => id !== 'regulator' && !modules.some(module => module.id === id));
      const mirror = modules.find(module => module.id === 'mirror');
      const wrong = modules.find(module => angleGap(module.slot * TAU / 8 - Math.PI / 2, devices[module.id].gate) >= .24);
      let title, detail;
      if (wrong) {
        title = running ? 'MISALIGNED · PAUSE AND MOVE A DEVICE' : 'CHECK THE GATES BEFORE IGNITION';
        detail = `${devices[wrong.id].name} starts away from its ${devices[wrong.id].name} gate. Move it to the matching colored marker; the orbit rotates every socket together.`;
      } else if (missing.length) {
        const next = missing[0];
        title = `NEXT: ${devices[next].name.toUpperCase()} → ${next === 'mirror' ? 'TOP' : next === 'conductor' ? 'RIGHT' : next === 'furnace' ? 'BOTTOM' : 'ITS NAMED GATE'}`;
        detail = next === 'mirror' ? 'The Mirror catches the ray from the CENTER only when it passes the TOP gate. Put it in socket 1 to start.' : `Place the ${devices[next].name} on its colored, named gate. A ray flows only when all required devices pass their gates together.`;
      } else if (options.veteran && route === 'cooling') {
        title = running ? 'COOLING BUS · OUTPUT HELD' : 'COOLING BUS ROUTED · IGNITE TO COOL';
        detail = `No units forged while diverted; cycle time continues. Every fifth live cooling pulse shunts 1 banked unit for −6 heat. ${charge} banked · ${shuntedCharge} shunted.`;
      } else if (scenario().pressure) {
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
      const level = scenario();
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
      canvas.dataset.mechanic = level.pressure ? 'capacitor-discharge' : level.freeze ? 'clock-seals' : level.eclipse ? 'eclipse' : 'direct-flow';
      canvas.dataset.pressure = String(level.pressure || 0); canvas.dataset.ended = String(ended);
      timeLabel.textContent = `${Math.floor(remaining / 60)}:${String(Math.ceil(remaining % 60)).padStart(2, '0')}`;
      const frozen = frozenDevice();
      const pressureState = level.pressure && running ? `BANK ${charge} · ${heat >= level.pressure ? 'VENT FOR FULL DELIVERY' : `PRIME TO ${level.pressure} HEAT`}` : '';
      const routeState = options.veteran && route === 'cooling' && running ? 'COOLING BUS · OUTPUT HELD' : '';
      stateLabel.textContent = ended ? (energy >= level.target ? 'CONTRACT SEALED' : heat >= level.cap ? 'FOUNDRY OVERPRESSURE' : 'STAR EXTINGUISHED') : frozen ? `CLOCK SEALS ${devices[frozen].name.toUpperCase()}` : routeState || pressureState || (running ? (level.eclipse ? 'ECLIPSE: EVERY THIRD PULSE LOST' : 'ORBITAL CYCLE LIVE') : 'BUILD BEFORE IGNITION');
      runButton.textContent = running ? 'PAUSE CYCLE' : 'IGNITE CYCLE';
      ventButton.textContent = level.pressure ? `VENT / DELIVER ${charge} · ${vents}` : `VENT HEAT · ${vents}`;
      ventButton.disabled = vents < 1 || ended || (Boolean(level.pressure) && charge < 1);
      if (routeButton) { routeButton.textContent = route === 'cooling' ? 'RETURN TO FORGE · D' : 'DIVERT TO COOLING · D'; routeButton.setAttribute('aria-pressed', String(route === 'cooling')); routeButton.disabled = ended; }
      const nextTools = level.tools.map(id => `<button type="button" data-star-tool="${id}" aria-pressed="${selected === id}"><b style="color:${devices[id].tone}">${devices[id].glyph}</b>${devices[id].name}</button>`).join('');
      const nextScenarios = available.map((item, index) => `<button type="button" data-star-scenario="${index}" ${(index < 6 && index > stored.completed) || (index >= 6 && stored.completed < 6) ? 'disabled' : ''} aria-pressed="${scenarioIndex === index}"><span>${index < stored.completed ? '✦' : index + 1}</span>${item.name}</button>`).join('');
      if (nextTools !== renderedTools) { tools.innerHTML = nextTools; renderedTools = nextTools; }
      if (nextScenarios !== renderedScenarios) { scenarioList.innerHTML = nextScenarios; renderedScenarios = nextScenarios; }
      explainPath();
    }
    function reset() {
      modules = []; motes = []; phase = 0; pulse = 0; pulseCount = 0; energy = 0; heat = 0; charge = 0; discharges = 0; route = 'forge'; divertedPulses = 0; shuntedCharge = 0; vents = scenario().vents || 1; remaining = scenario().seconds; running = false; ended = false;
      if (endTimer) { clearTimeout(endTimer); endTimer = 0; }
      renderNow();
    }
    function emit(from, to, tone) { motes.push({ x: from.x, y: from.y, tx: to.x, ty: to.y, tone, life: .75, max: .75 }); if (motes.length > 40) motes.shift(); }
    function frozenDevice() {
      const cycle = scenario().freeze;
      if (!running || !cycle) return null;
      return cycle[Math.floor((scenario().seconds - remaining) / 8) % cycle.length];
    }
    function gateTolerance() { return scenario().pressure ? .95 : .24; }
    function active(id) {
      if (frozenDevice() === id) return null;
      const device = devices[id];
      return modules.find(module => module.id === id && angleGap(position(module.slot).angle, device.gate) < gateTolerance());
    }
    function pulseFlow() {
      const mirror = active('mirror'), conductor = active('conductor'), furnace = active('furnace'), regulator = active('regulator');
      if (!mirror || !conductor || !furnace) return;
      if ((scenario().required || []).some(id => !active(id))) return;
      if (scenario().eclipse && pulseCount % 3 === 0) return;
      const core = { x: W * .5, y: H * .5 };
      const mirrorPos = position(mirror.slot), conductorPos = position(conductor.slot), furnacePos = position(furnace.slot);
      if (options.veteran && route === 'cooling') {
        const sink = regulator ? position(regulator.slot) : furnacePos;
        emit(core, mirrorPos, devices.mirror.tone); emit(mirrorPos, conductorPos, devices.conductor.tone); emit(conductorPos, sink, devices.regulator.tone);
        heat = Math.max(0, heat - 5 - (regulator ? 5 : 0) - (active('rail') ? 2 : 0)); divertedPulses++;
        // Banked light is a finite coolant in Ember Covenant: diverting buys
        // time and heat headroom by sacrificing units that could be delivered.
        if (charge > 0 && divertedPulses % 5 === 0) { charge--; shuntedCharge++; heat = Math.max(0, heat - 6); }
        return;
      }
      emit(core, mirrorPos, devices.mirror.tone); emit(mirrorPos, conductorPos, devices.conductor.tone); emit(conductorPos, furnacePos, devices.furnace.tone);
      const bonus = active('splitter') ? 1 : 0;
      const storedCharge = active('capacitor') ? 1 : 0;
      const output = 1 + bonus + storedCharge;
      if (scenario().pressure) charge += output; else energy += output;
      heat += devices.furnace.heat + (bonus ? devices.splitter.heat : 0) + (storedCharge ? devices.capacitor.heat : 0) + (regulator ? devices.regulator.heat : 0) + (active('rail') ? -4 : 0);
    }
    function toggleRoute() {
      if (!options.veteran || ended) return;
      route = route === 'cooling' ? 'forge' : 'cooling'; renderNow();
    }
    function vent() {
      const level = scenario();
      if (vents < 1 || ended || (level.pressure && charge < 1)) return;
      const fullDelivery = level.pressure && heat >= level.pressure;
      const released = level.pressure ? (fullDelivery ? charge : Math.max(1, Math.floor(charge / 2))) : 0;
      vents--; heat = Math.max(0, heat - 24);
      if (level.pressure) { charge = 0; discharges++; energy += released; }
      if (energy >= level.target) finish(true); else renderNow();
    }
    function finish(won) {
      if (ended) return;
      ended = true; running = false;
      if (won) {
        if (!options.veteran) stored.completed = Math.max(stored.completed, Math.min(available.length, scenarioIndex + 1));
        stored.best = Math.max(stored.best, energy);
        save(stored);
      }
      renderNow();
      // The recap delay is tracked so destroy() can cancel it: onEnd fires at
      // most once, and never into a torn-down stage.
      endTimer = window.setTimeout(() => {
        endTimer = 0;
        if (destroyed) return;
        options.onEnd?.({ won, score: energy * 250 + Math.round(remaining * 10) });
      }, 900);
    }
    function step(dt) {
      if (running && !ended && !paused) {
        phase = (phase + dt * .82) % TAU;
        remaining = Math.max(0, remaining - dt);
        heat = Math.max(0, heat - dt * 1.5);
        pulse += dt;
        if (pulse >= .2) { pulse %= .2; pulseCount++; pulseFlow(); }
        if (energy >= scenario().target) finish(true);
        else if (heat >= scenario().cap || remaining <= 0) finish(false);
      }
      motes = motes.filter(mote => (mote.life -= dt) > 0);
    }
    function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const grad = ctx.createRadialGradient(W * .5, H * .5, 20, W * .5, H * .5, 480); grad.addColorStop(0, '#44231c'); grad.addColorStop(.35, '#1d2325'); grad.addColorStop(1, '#070e13'); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const x = (i * 149) % W, y = (i * 83) % H; ctx.fillStyle = `rgba(231,216,173,${.09 + (i % 4) * .025})`; ctx.fillRect(x, y, 1, 1); }
      const cx = W * .5, cy = H * .5;
      [112, 182, 252].forEach((radius, index) => { ctx.strokeStyle = index === 1 ? 'rgba(228,189,122,.42)' : 'rgba(185,198,184,.18)'; ctx.lineWidth = index === 1 ? 2 : 1; circle(cx, cy, radius); ctx.stroke(); });
       Object.values(devices).forEach(device => { const x = cx + Math.cos(device.gate) * 225, y = cy + Math.sin(device.gate) * 225; ctx.fillStyle = device.tone; ctx.globalAlpha = .72; circle(x, y, 4); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#ddd4b9'; ctx.font = '11px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(device.name.toUpperCase(), x, y - 10); });
       modules.forEach(module => { const p = position(module.slot), device = devices[module.id], aligned = angleGap(p.angle, device.gate) < gateTolerance(); const gate = { x: cx + Math.cos(device.gate) * 225, y: cy + Math.sin(device.gate) * 225 }; ctx.save(); ctx.strokeStyle = aligned ? device.tone : '#a99b8055'; ctx.setLineDash(aligned ? [] : [3, 5]); ctx.lineWidth = aligned ? 3 : 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(gate.x, gate.y); ctx.stroke(); ctx.restore(); });
       const sun = ctx.createRadialGradient(cx, cy, 4, cx, cy, 48); sun.addColorStop(0, '#fff4c9'); sun.addColorStop(.32, '#f3ae68'); sun.addColorStop(1, 'rgba(142,54,31,0)'); ctx.fillStyle = sun; circle(cx, cy, 48); ctx.fill(); ctx.fillStyle = '#f8e8b6'; circle(cx, cy, 10); ctx.fill();
       if (scenario().pressure && charge) { ctx.strokeStyle = devices.capacitor.tone; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 58, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, charge / scenario().target)); ctx.stroke(); }
       const caught = active('mirror');
       if (caught) { const p = position(caught.slot); ctx.save(); ctx.strokeStyle = '#f6d695'; ctx.lineWidth = 3; ctx.shadowColor = '#f6d695'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore(); }
      for (let slot = 0; slot < 8; slot++) { const p = position(slot); ctx.strokeStyle = 'rgba(229,204,151,.65)'; ctx.lineWidth = 2; circle(p.x, p.y, 23); ctx.stroke(); ctx.fillStyle = '#d8caa7'; ctx.font = '11px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(slot + 1), p.x, p.y + 39); }
       modules.forEach(module => { const p = position(module.slot), device = devices[module.id], aligned = angleGap(p.angle, device.gate) < gateTolerance(); ctx.fillStyle = '#101820'; circle(p.x, p.y, 19); ctx.fill(); ctx.strokeStyle = device.tone; ctx.lineWidth = aligned ? 3 : 2; circle(p.x, p.y, 19); ctx.stroke(); ctx.fillStyle = device.tone; ctx.font = 'bold 21px "IM Fell English", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(device.glyph, p.x, p.y + 7); if (aligned) { ctx.font = 'bold 13px "DM Sans", sans-serif'; ctx.fillText('✓', p.x + 23, p.y - 16); } });
      motes.forEach(mote => { const progress = 1 - mote.life / mote.max, x = mote.x + (mote.tx - mote.x) * progress, y = mote.y + (mote.ty - mote.y) * progress; ctx.fillStyle = mote.tone; circle(x, y, 5); ctx.fill(); });
      ctx.fillStyle = 'rgba(8,14,18,.72)'; ctx.fillRect(24, H - 96, 360, 70); ctx.fillStyle = '#f0d9a1'; ctx.font = '600 13px "DM Sans", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`SELECTED: ${devices[selected].name.toUpperCase()}`, 40, H - 67); ctx.fillStyle = '#b5c9bf'; ctx.font = '12px "DM Sans", sans-serif'; ctx.fillText('Align each device with its named gate as the rail turns.', 40, H - 43); ctx.fillText(options.veteran && route === 'cooling' ? `COOLING BUS · NO OUTPUT · ${shuntedCharge} BANKED UNITS SHUNTED` : scenario().pressure ? `BANK ${charge} · ${heat >= scenario().pressure ? 'VENT NOW FOR FULL DELIVERY' : `PRIME TO ${scenario().pressure} HEAT BEFORE VENTING`}` : frozenDevice() ? `THE DYING CLOCK HAS SEALED ${devices[frozenDevice()].name.toUpperCase()}.` : 'A complete path flashes only when all gates coincide.', 40, H - 25);
      if (ended) { ctx.fillStyle = 'rgba(4,8,12,.72)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = energy >= scenario().target ? '#f7d68f' : '#ef9a82'; ctx.font = '46px "IM Fell English", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(energy >= scenario().target ? 'CONTRACT SEALED' : 'THE FOUNDRY FALLS SILENT', cx, cy - 12); ctx.fillStyle = '#d9d1bc'; ctx.font = '16px "DM Sans", sans-serif'; ctx.fillText(energy >= scenario().target ? 'A new star blueprint enters the observatory ledger.' : 'Rebuild the schematic and try another rhythm.', cx, cy + 24); }
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
    function pointer(event) {
      event.preventDefault(); if (ended) return;
      const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width * W, y = (event.clientY - rect.top) / rect.height * H;
      let nearest = -1, distance = Infinity;
      for (let slot = 0; slot < 8; slot++) { const p = position(slot), d = Math.hypot(x - p.x, y - p.y); if (d < distance) { distance = d; nearest = slot; } }
      if (distance > 33) return;
      if (event.button === 2) modules = modules.filter(module => module.slot !== nearest);
       else { modules = modules.filter(module => module.slot !== nearest && module.id !== selected); modules.push({ id: selected, slot: nearest }); }
      renderNow();
    }
    canvas.addEventListener('pointerdown', pointer, { signal });
    canvas.addEventListener('contextmenu', event => event.preventDefault(), { signal });
    canvas.addEventListener('keydown', event => {
      if (!options.veteran || event.code !== 'KeyD' || event.repeat || ended || paused) return;
      event.preventDefault(); toggleRoute();
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
      const tool = event.target.closest('[data-star-tool]'); if (tool) { selected = tool.dataset.starTool; renderNow(); return; }
      const level = event.target.closest('[data-star-scenario]'); if (level) { scenarioIndex = Number(level.dataset.starScenario); reset(); return; }
      const action = event.target.closest('[data-starforge]')?.dataset.starforge;
      if (action === 'run' && !ended) { running = !running; last = 0; renderNow(); schedule(); }
      if (action === 'vent') vent();
      if (action === 'route') toggleRoute();
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
    return { destroy, pause, resume, get state() { return { scenario: scenarioIndex, energy, heat, charge, vents, discharges, route, divertedPulses, shuntedCharge, remaining, running, ended, paused, modules: modules.slice() }; } };
  }
  return { create, scenarios };
})();
