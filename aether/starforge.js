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
  ];

  function readSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
      return { completed: clamp(Number.isInteger(raw.completed) ? raw.completed : 0, 0, scenarios.length), best: Math.max(0, Number(raw.best) || 0) };
    } catch { return { completed: 0, best: 0 }; }
  }
  function save(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {} }

  function create(container, options = {}) {
    const stored = readSave();
    let scenarioIndex = clamp(Number.isInteger(options.scenario) ? options.scenario : stored.completed, 0, scenarios.length - 1);
    let selected = 'mirror', modules = [], motes = [], phase = 0, pulse = 0, pulseCount = 0, energy = 0, heat = 0, vents = 1;
    let remaining = scenarios[scenarioIndex].seconds, running = false, ended = false, frame = 0, last = performance.now();
    let renderedTools = '', renderedScenarios = '';
    const controller = new AbortController();
    const { signal } = controller;
    container.innerHTML = `<section class="starforge-shell" aria-label="Starforge workshop"><header class="starforge-status"><div><span>CONTRACT</span><strong id="starforge-contract"></strong><small id="starforge-brief"></small></div><div><span>DELIVERED</span><strong id="starforge-energy">0 / 0</strong><small>EMBER UNITS</small></div><div><span>FOUNDRY HEAT</span><strong id="starforge-heat">0 / 0</strong><meter id="starforge-meter" min="0" max="1" value="0"></meter></div><div><span>CYCLE</span><strong id="starforge-time">0:00</strong><small id="starforge-state">BUILD BEFORE IGNITION</small></div></header><canvas class="starforge-canvas" width="900" height="560" tabindex="0" role="application" aria-label="Starforge workshop. Select a device below, then click an orbital socket. Space starts or pauses the cycle. Right click removes a device."></canvas><div class="starforge-tools" role="group" aria-label="Foundry devices"></div><footer class="starforge-actions"><button type="button" class="button button-primary" data-starforge="run">IGNITE CYCLE</button><button type="button" class="button" data-starforge="vent">VENT HEAT · 1</button><button type="button" class="button" data-starforge="reset">CLEAR SCHEMATIC</button><span>Click a device, then a socket. Right click removes. <kbd>Space</kbd> starts or pauses.</span></footer><div class="starforge-scenarios" role="group" aria-label="Starforge contracts"></div></section>`;
    const canvas = container.querySelector('canvas'), ctx = canvas.getContext('2d');
    const tools = container.querySelector('.starforge-tools'), scenarioList = container.querySelector('.starforge-scenarios');
    const contract = container.querySelector('#starforge-contract'), brief = container.querySelector('#starforge-brief');
    const energyLabel = container.querySelector('#starforge-energy'), heatLabel = container.querySelector('#starforge-heat');
    const meter = container.querySelector('#starforge-meter'), timeLabel = container.querySelector('#starforge-time');
    const stateLabel = container.querySelector('#starforge-state'), runButton = container.querySelector('[data-starforge="run"]'), ventButton = container.querySelector('[data-starforge="vent"]');
    canvas.style.touchAction = 'none';

    function scenario() { return scenarios[scenarioIndex]; }
    function position(slot, radius = 182) {
      const angle = phase + slot * TAU / 8 - Math.PI / 2;
      return { x: W * .5 + Math.cos(angle) * radius, y: H * .5 + Math.sin(angle) * radius, angle };
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
      timeLabel.textContent = `${Math.floor(remaining / 60)}:${String(Math.ceil(remaining % 60)).padStart(2, '0')}`;
      const frozen = frozenDevice();
      stateLabel.textContent = ended ? (energy >= level.target ? 'CONTRACT SEALED' : heat >= level.cap ? 'FOUNDRY OVERPRESSURE' : 'STAR EXTINGUISHED') : frozen ? `CLOCK SEALS ${devices[frozen].name.toUpperCase()}` : running ? (level.eclipse ? 'ECLIPSE: EVERY THIRD PULSE LOST' : 'ORBITAL CYCLE LIVE') : 'BUILD BEFORE IGNITION';
      runButton.textContent = running ? 'PAUSE CYCLE' : 'IGNITE CYCLE';
      ventButton.textContent = `VENT HEAT · ${vents}`;
      ventButton.disabled = vents < 1 || ended;
      const nextTools = level.tools.map(id => `<button type="button" data-star-tool="${id}" aria-pressed="${selected === id}"><b style="color:${devices[id].tone}">${devices[id].glyph}</b>${devices[id].name}</button>`).join('');
      const nextScenarios = scenarios.map((item, index) => `<button type="button" data-star-scenario="${index}" ${index > stored.completed ? 'disabled' : ''} aria-pressed="${scenarioIndex === index}"><span>${index < stored.completed ? '✦' : index + 1}</span>${item.name}</button>`).join('');
      if (nextTools !== renderedTools) { tools.innerHTML = nextTools; renderedTools = nextTools; }
      if (nextScenarios !== renderedScenarios) { scenarioList.innerHTML = nextScenarios; renderedScenarios = nextScenarios; }
    }
    function reset() {
      modules = []; motes = []; phase = 0; pulse = 0; pulseCount = 0; energy = 0; heat = 0; vents = 1; remaining = scenario().seconds; running = false; ended = false;
      refreshUi();
    }
    function emit(from, to, tone) { motes.push({ x: from.x, y: from.y, tx: to.x, ty: to.y, tone, life: .75, max: .75 }); if (motes.length > 40) motes.shift(); }
    function frozenDevice() {
      const cycle = scenario().freeze;
      if (!running || !cycle) return null;
      return cycle[Math.floor((scenario().seconds - remaining) / 8) % cycle.length];
    }
    function active(id) {
      if (frozenDevice() === id) return null;
      const device = devices[id];
      return modules.find(module => module.id === id && angleGap(position(module.slot).angle, device.gate) < .24);
    }
    function pulseFlow() {
      const mirror = active('mirror'), conductor = active('conductor'), furnace = active('furnace'), regulator = active('regulator');
      if (!mirror || !conductor || !furnace) return;
      if ((scenario().required || []).some(id => !active(id))) return;
      if (scenario().eclipse && pulseCount % 3 === 0) return;
      const core = { x: W * .5, y: H * .5 };
      const mirrorPos = position(mirror.slot), conductorPos = position(conductor.slot), furnacePos = position(furnace.slot);
      emit(core, mirrorPos, devices.mirror.tone); emit(mirrorPos, conductorPos, devices.conductor.tone); emit(conductorPos, furnacePos, devices.furnace.tone);
      const bonus = active('splitter') ? 1 : 0;
      const storedCharge = active('capacitor') ? 1 : 0;
      energy += 1 + bonus + storedCharge;
      heat += devices.furnace.heat + (bonus ? devices.splitter.heat : 0) + (storedCharge ? devices.capacitor.heat : 0) + (regulator ? devices.regulator.heat : 0) + (active('rail') ? -4 : 0);
    }
    function finish(won) {
      if (ended) return;
      ended = true; running = false;
      if (won) {
        stored.completed = Math.max(stored.completed, Math.min(scenarios.length, scenarioIndex + 1));
        stored.best = Math.max(stored.best, energy);
        save(stored);
      }
      refreshUi();
      window.setTimeout(() => options.onEnd?.({ won, score: energy * 250 + Math.round(remaining * 10) }), 900);
    }
    function step(dt) {
      if (running && !ended) {
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
      const sun = ctx.createRadialGradient(cx, cy, 4, cx, cy, 48); sun.addColorStop(0, '#fff4c9'); sun.addColorStop(.32, '#f3ae68'); sun.addColorStop(1, 'rgba(142,54,31,0)'); ctx.fillStyle = sun; circle(cx, cy, 48); ctx.fill(); ctx.fillStyle = '#f8e8b6'; circle(cx, cy, 10); ctx.fill();
      for (let slot = 0; slot < 8; slot++) { const p = position(slot); ctx.strokeStyle = 'rgba(229,204,151,.65)'; ctx.lineWidth = 2; circle(p.x, p.y, 23); ctx.stroke(); ctx.fillStyle = '#d8caa7'; ctx.font = '11px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(slot + 1), p.x, p.y + 39); }
      modules.forEach(module => { const p = position(module.slot), device = devices[module.id]; ctx.fillStyle = '#101820'; circle(p.x, p.y, 19); ctx.fill(); ctx.strokeStyle = device.tone; ctx.lineWidth = 2; circle(p.x, p.y, 19); ctx.stroke(); ctx.fillStyle = device.tone; ctx.font = 'bold 21px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(device.glyph, p.x, p.y + 7); });
      motes.forEach(mote => { const progress = 1 - mote.life / mote.max, x = mote.x + (mote.tx - mote.x) * progress, y = mote.y + (mote.ty - mote.y) * progress; ctx.fillStyle = mote.tone; circle(x, y, 5); ctx.fill(); });
      ctx.fillStyle = 'rgba(8,14,18,.72)'; ctx.fillRect(24, H - 96, 360, 70); ctx.fillStyle = '#f0d9a1'; ctx.font = '600 13px "DM Sans", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`SELECTED: ${devices[selected].name.toUpperCase()}`, 40, H - 67); ctx.fillStyle = '#b5c9bf'; ctx.font = '12px "DM Sans", sans-serif'; ctx.fillText('Align each device with its named gate as the rail turns.', 40, H - 43); ctx.fillText(frozenDevice() ? `THE DYING CLOCK HAS SEALED ${devices[frozenDevice()].name.toUpperCase()}.` : 'A complete path flashes only when all gates coincide.', 40, H - 25);
      if (ended) { ctx.fillStyle = 'rgba(4,8,12,.72)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = energy >= scenario().target ? '#f7d68f' : '#ef9a82'; ctx.font = '46px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(energy >= scenario().target ? 'CONTRACT SEALED' : 'THE FOUNDRY FALLS SILENT', cx, cy - 12); ctx.fillStyle = '#d9d1bc'; ctx.font = '16px "DM Sans", sans-serif'; ctx.fillText(energy >= scenario().target ? 'A new star blueprint enters the observatory ledger.' : 'Rebuild the schematic and try another rhythm.', cx, cy + 24); }
    }
    function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; step(dt); draw(); refreshUi(); frame = requestAnimationFrame(loop); }
    function pointer(event) {
      event.preventDefault(); if (ended) return;
      const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width * W, y = (event.clientY - rect.top) / rect.height * H;
      let nearest = -1, distance = Infinity;
      for (let slot = 0; slot < 8; slot++) { const p = position(slot), d = Math.hypot(x - p.x, y - p.y); if (d < distance) { distance = d; nearest = slot; } }
      if (distance > 33) return;
      if (event.button === 2) modules = modules.filter(module => module.slot !== nearest);
      else { modules = modules.filter(module => module.slot !== nearest); modules.push({ id: selected, slot: nearest }); }
      refreshUi();
    }
    canvas.addEventListener('pointerdown', pointer, { signal });
    canvas.addEventListener('contextmenu', event => event.preventDefault(), { signal });
    window.addEventListener('keydown', event => { if (event.code !== 'Space' || ended) return; event.preventDefault(); running = !running; refreshUi(); }, { signal });
    container.addEventListener('click', event => {
      const tool = event.target.closest('[data-star-tool]'); if (tool) { selected = tool.dataset.starTool; refreshUi(); return; }
      const level = event.target.closest('[data-star-scenario]'); if (level) { scenarioIndex = Number(level.dataset.starScenario); reset(); return; }
      const action = event.target.closest('[data-starforge]')?.dataset.starforge;
      if (action === 'run' && !ended) { running = !running; refreshUi(); }
      if (action === 'vent' && vents && !ended) { vents--; heat = Math.max(0, heat - 24); refreshUi(); }
      if (action === 'reset') reset();
    }, { signal });
    refreshUi(); frame = requestAnimationFrame(loop); canvas.focus({ preventScroll: true });
    return { destroy() { cancelAnimationFrame(frame); controller.abort(); container.replaceChildren(); }, get state() { return { scenario: scenarioIndex, energy, heat, modules: modules.slice() }; } };
  }
  return { create, scenarios };
})();
