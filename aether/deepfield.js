'use strict';

// Deep Field: deterministic, DOM-based Minesweeper. Rules are synchronous;
// animation is cosmetic and never changes the board or consumes gameplay RNG.
window.AetherDeepField = (() => {
  const SETTINGS_KEY = 'aether-deep-field-settings-v1';
  const PRESETS = Object.freeze({
    apprentice: Object.freeze({ name: 'Apprentice', subtitle: 'A gentle firmament', cols: 9, rows: 9, mines: 10, hints: 2 }),
    navigator: Object.freeze({ name: 'Navigator', subtitle: 'The cartographer’s chart', cols: 12, rows: 10, mines: 22, hints: 2 }),
    eclipse: Object.freeze({ name: 'Eclipse', subtitle: 'A crowded occultation', cols: 16, rows: 12, mines: 42, hints: 1 }),
    cathedral: Object.freeze({ name: 'Cathedral', subtitle: 'The long night of glass', cols: 18, rows: 12, mines: 52, hints: 1 }),
    meridian: Object.freeze({ name: 'Meridian', subtitle: 'The flag-bearer’s reckoning', cols: 20, rows: 12, mines: 58, hints: 1, veteran: true, flagLimit: 12, scoreMultiplier: 1.35 }),
    nocturne: Object.freeze({ name: 'Nocturne', subtitle: 'A three-movement logical expedition', cols: 10, rows: 10, mines: 16, hints: 3, veteran: true, nocturne: true }),
  });
  const CAMPAIGN = ['apprentice', 'navigator', 'eclipse'];
  const NOCTURNE_CHARTS = Object.freeze([
    Object.freeze({ name: 'Nocturne · Ivory Approach', cols: 9, rows: 9, mines: 11, hints: 3, nocturne: true, movement: 'Ⅰ' }),
    Object.freeze({ name: 'Nocturne · Oxblood Transit', cols: 10, rows: 10, mines: 15, hints: 3, nocturne: true, movement: 'Ⅱ' }),
    Object.freeze({ name: 'Nocturne · The Engine Below', cols: 11, rows: 10, mines: 19, hints: 4, nocturne: true, movement: 'Ⅲ' }),
  ]);
  const NOCTURNE_EVENTS = Object.freeze([
    { at: .2, title: 'The brass shutters open', text: 'A rift marks a safe but unstable sector. Chart it before its countdown, or Ward it.' },
    { at: .48, title: 'The oxblood conjunction', text: 'A second rift answers the first. At most two can be active; expired rifts veil their sector.' },
    { at: .72, title: 'The engine turns below', text: 'The last rift is faster. Recovered seals replenish Focus for Wards and the final machine.' },
  ]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const random = seed => { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; };
  const freshSeed = () => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;

  function neighbours(index, cols, rows) {
    const x = index % cols, y = Math.floor(index / cols), result = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) result.push(ny * cols + nx);
    }
    return result;
  }

  // Logical proofs consume only visible clues and the player's committed flags.
  // Hidden grid values are deliberately absent from this function's inputs.
  // Besides basic all-safe/all-mine rules, subset constraints resolve overlaps.
  function deduce({ cols, rows, revealed = [], flagged = [], clues = {}, lines = [] } = {}) {
    const open = new Set(revealed), marks = new Set(flagged), constraints = [];
    const coordinate = p => `${String.fromCharCode(65 + p % cols)}${Math.floor(p / cols) + 1}`;
    const sourceName = source => source.label || coordinate(source.origin);
    for (const [key, raw] of Object.entries(clues)) {
      const index = Number(key), value = Number(raw);
      if (!Number.isInteger(index) || !open.has(index) || !Number.isInteger(value) || value <= 0) continue;
      const around = neighbours(index, cols, rows), hidden = around.filter(p => !open.has(p) && !marks.has(p));
      const remaining = value - around.filter(p => marks.has(p)).length;
      if (hidden.length && remaining >= 0 && remaining <= hidden.length) constraints.push({ cells: hidden, remaining, origin: index });
    }
    // Nocturne's row/column canticles are visible aggregate clues, not access to
    // hidden values. They enter exactly the same proof engine as local numbers.
    for (const line of lines) {
      if (!line || !Array.isArray(line.cells) || !Number.isInteger(line.value)) continue;
      const cells = [...new Set(line.cells)].filter(p => Number.isInteger(p) && p >= 0 && p < cols * rows);
      const hidden = cells.filter(p => !open.has(p) && !marks.has(p));
      const remaining = line.value - cells.filter(p => marks.has(p)).length;
      if (hidden.length && remaining >= 0 && remaining <= hidden.length) constraints.push({ cells: hidden, remaining, origin: cells[0], label: line.label });
    }
    const safe = new Map(), mines = new Map();
    const prove = (cells, remaining, source, against = null) => {
      if (!cells.length || remaining < 0 || remaining > cells.length) return;
      const basis = against ? `${sourceName(source)} − ${sourceName(against)}` : sourceName(source);
      if (remaining === 0) for (const p of cells) if (!mines.has(p)) safe.set(p, `${basis}: no novae remain`);
      if (remaining === cells.length) for (const p of cells) if (!safe.has(p)) mines.set(p, `${basis}: every sector is a nova`);
    };
    constraints.forEach(rule => prove(rule.cells, rule.remaining, rule));
    for (const inner of constraints) for (const outer of constraints) {
      if (inner === outer || !inner.cells.every(p => outer.cells.includes(p))) continue;
      const difference = outer.cells.filter(p => !inner.cells.includes(p));
      prove(difference, outer.remaining - inner.remaining, outer, inner);
    }
    // Contradictory player flags can invalidate a proof. Never guess between
    // conflicting outcomes; the next board action remains entirely the player's.
    for (const p of [...safe.keys()]) if (mines.has(p)) { safe.delete(p); mines.delete(p); }
    const entries = map => [...map].map(([index, reason]) => ({ index, reason })).sort((a, b) => a.index - b.index);
    return { safe: entries(safe), mines: entries(mines) };
  }

  function generate({ cols = 9, rows = 9, mines = 10, seed = 1, safeIndex = -1 } = {}) {
    cols = clamp(Math.round(cols), 5, 24); rows = clamp(Math.round(rows), 5, 24);
    const total = cols * rows;
    const protectedCells = new Set();
    if (safeIndex >= 0 && safeIndex < total) {
      protectedCells.add(safeIndex);
      for (const p of neighbours(safeIndex, cols, rows)) protectedCells.add(p);
    }
    const available = Array.from({ length: total }, (_, p) => p).filter(p => !protectedCells.has(p));
    mines = clamp(Math.round(mines), 1, available.length);
    const rand = random(seed), spots = new Set();
    while (spots.size < mines) spots.add(available[Math.floor(rand() * available.length)]);
    const grid = Array(total).fill(0);
    for (const p of spots) grid[p] = -1;
    for (let p = 0; p < total; p++) if (grid[p] >= 0) grid[p] = neighbours(p, cols, rows).filter(q => grid[q] === -1).length;
    return { grid, cols, rows, mines, seed: seed >>> 0, safeIndex };
  }

  function canticles(grid, cols, rows) {
    const lines = [];
    for (let y = 0; y < rows; y++) {
      const cells = Array.from({ length: cols }, (_, x) => y * cols + x);
      lines.push({ label: `Row ${y + 1}`, cells, value: cells.reduce((sum, p) => sum + (grid[p] === -1), 0) });
    }
    for (let x = 0; x < cols; x++) {
      const cells = Array.from({ length: rows }, (_, y) => y * cols + x);
      lines.push({ label: `Column ${String.fromCharCode(65 + x)}`, cells, value: cells.reduce((sum, p) => sum + (grid[p] === -1), 0) });
    }
    return lines;
  }

  // Generation may inspect a candidate to certify it. The audit's decisions,
  // however, come only from the opening, visible numbers and public canticles.
  function auditNocturne(grid, cols, rows, safeIndex, pins = []) {
    const open = new Set(), marks = new Set(), lines = canticles(grid, cols, rows);
    const apply = start => { for (const entry of flood(grid, cols, rows, start, marks)) open.add(entry.index); };
    apply(safeIndex); pins.forEach(apply);
    let steps = 0;
    while (steps < cols * rows * 2) {
      const clues = {};
      for (const p of open) if (grid[p] > 0) clues[p] = grid[p];
      const proof = deduce({ cols, rows, revealed: open, flagged: marks, clues, lines });
      let changed = false;
      for (const { index } of proof.mines) if (!open.has(index) && !marks.has(index)) { marks.add(index); changed = true; }
      for (const { index } of proof.safe) if (!open.has(index) && !marks.has(index)) { apply(index); changed = true; }
      steps++;
      if (open.size === cols * rows - grid.filter(value => value === -1).length) return { solved: true, steps, revealed: [...open], flagged: [...marks] };
      if (!changed) break;
    }
    return { solved: false, steps, revealed: [...open], flagged: [...marks] };
  }

  function generateNocturne({ cols = 9, rows = 9, mines = 11, seed = 1, safeIndex = 0 } = {}) {
    let fallback = null;
    for (let attempt = 0; attempt < 96; attempt++) {
      const layoutSeed = (seed + Math.imul(attempt + 1, 0x9e3779b9)) >>> 0;
      const chart = generate({ cols, rows, mines, seed: layoutSeed, safeIndex });
      const audit = auditNocturne(chart.grid, cols, rows, safeIndex);
      fallback = { ...chart, layoutSeed, audit };
      if (audit.solved) {
        const rand = random(layoutSeed ^ 0xa53c9e17), pool = chart.grid.map((value, p) => value >= 0 && p !== safeIndex ? p : -1).filter(p => p >= 0);
        const seals = [];
        while (pool.length && seals.length < 3) seals.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
        return { ...chart, seed: seed >>> 0, layoutSeed, lines: canticles(chart.grid, cols, rows), seals, pins: [], solution: audit };
      }
    }
    // Pathological seeds receive explicit, visible survey pins rather than a
    // guessing gate. This fallback is deterministic and still proof-certified.
    const pins = [], rand = random(fallback.layoutSeed ^ 0x71c3);
    let audit = fallback.audit;
    while (!audit.solved && pins.length < cols * rows - mines) {
      const hidden = new Set(audit.revealed);
      const pool = fallback.grid.map((value, p) => value >= 0 && !hidden.has(p) && !pins.includes(p) ? p : -1).filter(p => p >= 0);
      if (!pool.length) break;
      pins.push(pool[Math.floor(rand() * pool.length)]);
      audit = auditNocturne(fallback.grid, cols, rows, safeIndex, pins);
    }
    const safePool = fallback.grid.map((value, p) => value >= 0 && p !== safeIndex && !pins.includes(p) ? p : -1).filter(p => p >= 0);
    const seals = safePool.slice(0, 3);
    return { ...fallback, seed: seed >>> 0, lines: canticles(fallback.grid, cols, rows), seals, pins, solution: audit };
  }

  function solveFinale({ size = 3, rows = [], columns = [], diagonals = [] } = {}) {
    const count = size * size, values = Array(count).fill(-1), groups = [];
    rows.forEach((value, y) => groups.push({ cells: Array.from({ length: size }, (_, x) => y * size + x), value, label: `Row ${y + 1}` }));
    columns.forEach((value, x) => groups.push({ cells: Array.from({ length: size }, (_, y) => y * size + x), value, label: `Column ${x + 1}` }));
    if (diagonals.length >= 2) {
      groups.push({ cells: Array.from({ length: size }, (_, i) => i * size + i), value: diagonals[0], label: 'Falling diagonal' });
      groups.push({ cells: Array.from({ length: size }, (_, i) => i * size + size - 1 - i), value: diagonals[1], label: 'Rising diagonal' });
    }
    for (let pass = 0; pass < count * 2; pass++) {
      let changed = false;
      const prove = (cells, remaining) => {
        const unknown = cells.filter(p => values[p] < 0), marked = cells.length - unknown.length - cells.filter(p => values[p] === 0).length;
        const left = remaining - marked;
        if (!unknown.length || left < 0 || left > unknown.length) return;
        if (left === 0 || left === unknown.length) for (const p of unknown) { values[p] = left ? 1 : 0; changed = true; }
      };
      groups.forEach(group => prove(group.cells, group.value));
      for (const inner of groups) for (const outer of groups) {
        if (inner === outer || !inner.cells.every(p => outer.cells.includes(p))) continue;
        const difference = outer.cells.filter(p => !inner.cells.includes(p));
        prove(difference, outer.value - inner.value);
      }
      if (!changed) break;
    }
    return { solved: values.every(value => value >= 0), values };
  }

  function finalePuzzle(seed, phase = 0) {
    const size = phase === 2 ? 4 : 3, count = size * size, rand = random((seed + Math.imul(phase + 1, 0x45d9f3b)) >>> 0);
    const make = mask => {
      const solution = Array.from({ length: count }, (_, p) => (mask >> p) & 1);
      const rows = Array.from({ length: size }, (_, y) => solution.slice(y * size, y * size + size).reduce((a, b) => a + b, 0));
      const columns = Array.from({ length: size }, (_, x) => Array.from({ length: size }, (_, y) => solution[y * size + x]).reduce((a, b) => a + b, 0));
      const diagonals = phase ? [
        Array.from({ length: size }, (_, i) => solution[i * size + i]).reduce((a, b) => a + b, 0),
        Array.from({ length: size }, (_, i) => solution[i * size + size - 1 - i]).reduce((a, b) => a + b, 0),
      ] : [];
      return { size, rows, columns, diagonals, solution, proof: solveFinale({ size, rows, columns, diagonals }) };
    };
    for (let attempt = 0; attempt < 512; attempt++) {
      let mask = 0;
      for (let p = 0; p < count; p++) if (rand() < .4 + phase * .04) mask |= (1 << p);
      const puzzle = make(mask);
      if (puzzle.proof.solved && puzzle.solution.some(Boolean) && puzzle.solution.some(value => !value)) return puzzle;
    }
    return make((1 << size) - 1);
  }

  function flood(grid, cols, rows, start, flagged = new Set()) {
    if (start < 0 || start >= grid.length || grid[start] < 0 || flagged.has(start)) return [];
    const queue = [{ index: start, wave: 0 }], visited = new Set([start]), result = [];
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head]; result.push(current);
      if (grid[current.index] !== 0) continue;
      for (const next of neighbours(current.index, cols, rows)) {
        if (visited.has(next) || flagged.has(next) || grid[next] < 0) continue;
        visited.add(next); queue.push({ index: next, wave: current.wave + 1 });
      }
    }
    return result;
  }

  function readSettings(allowVeteran = false) {
    try {
      const value = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
      const preset = Object.hasOwn(PRESETS, value.preset) && (allowVeteran || !PRESETS[value.preset].veteran) ? value.preset : 'navigator';
      return { sound: value.sound !== false, preset, zoom: clamp(Number(value.zoom) || 1, 1, 1.75) };
    } catch { return { sound: true, preset: 'navigator', zoom: 1 }; }
  }

  function create(container, options = {}) {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const abort = new AbortController(), timers = new Set(), holds = new Set();
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mode = options.campaign ? 'campaign' : options.daily ? 'daily' : options.endless ? 'endless' : 'trial', veteran = options.veteran === true;
    const settings = readSettings(veteran);
    const campaign = veteran ? [...CAMPAIGN, 'cathedral'] : [...CAMPAIGN];
    const verbs = options.verbs || new Set(), onEnd = typeof options.onEnd === 'function' ? options.onEnd : () => {};
    let soundOn = options.sound === false ? false : settings.sound;
    let audio = null, audioGain = null, destroyed = false, callbackFired = false;
    let presetId = mode === 'trial' ? 'apprentice' : mode === 'daily' ? 'navigator' : settings.preset;
    let runSeed = Number.isInteger(options.seed) ? options.seed >>> 0 : freshSeed();
    let gameplayRandom = random(runSeed ^ 0x9e3779b9), fxRandom = random(runSeed ^ 0x51f15e);
    let stage = 0, chartsCleared = 0, runScore = 0, roundStartScore = 0, totalElapsed = 0, totalHints = 0, totalProofs = 0, hintBonus = 0, aegis = 0, echoOpen = false, stillpoint = false;
    let config, grid = null, roundSeed, initialSafe = -1, revealed, flagged, questioned, proofMarks, cells = [];
    let started = false, paused = false, roundOver = false, runEnded = false, won = false, elapsedBefore = 0, startedAt = 0;
    let hintsLeft = 0, hintsUsed = 0, proofsUsed = 0, shieldsUsed = 0, stillpointReady = false, inputMode = 'reveal', cursor = 0, zoom = settings.zoom, intermissionDrafted = false, roundGeneration = 0;
    let board, status, effectLayer, pauseBadge, intermission = null, longPress = null, suppressClick = { index: -1, until: 0 };
    let chartLines = [], chartSeals = [], surveyPins = [], sealsFound = new Set(), hazards = [], eventStage = 0, layoutSeed = 0, solutionSteps = 0;
    let focus = 1, integrity = 3, wardBonus = 0, wardsUsed = 0, totalWards = 0, riftsSealed = 0, scorePenalty = 0, expeditionSeals = 0, objectivePaid = false;
    let finale = null, finaleLayer = null;

    const nocturne = () => veteran && mode === 'endless' && presetId === 'nocturne';
    const after = (callback, delay) => {
      const timer = setTimeout(() => { timers.delete(timer); if (!destroyed) callback(); }, delay);
      timers.add(timer); return timer;
    };
    const listen = (type, callback, eventOptions = {}) => container.addEventListener(type, callback, { ...eventOptions, signal: abort.signal });
    const elapsed = () => elapsedBefore + (started && !paused && !roundOver ? performance.now() - startedAt : 0);
    const seconds = () => Math.floor(elapsed() / 1000);
    const roundConfig = () => {
      const base = PRESETS[mode === 'campaign' ? campaign[Math.min(stage, campaign.length - 1)] : presetId];
      const tune = config => ({ ...config, mines: veteran ? Math.min(Math.floor(config.cols * config.rows * .28), Math.ceil(config.mines * 1.2)) : config.mines, hints: Math.max(0, config.hints + hintBonus - (veteran ? 1 : 0)) });
      if (nocturne()) return { ...NOCTURNE_CHARTS[Math.min(stage, NOCTURNE_CHARTS.length - 1)], hints: NOCTURNE_CHARTS[Math.min(stage, NOCTURNE_CHARTS.length - 1)].hints + hintBonus };
      if (mode === 'trial') return { ...PRESETS.apprentice, name: 'Deep Field', mines: 12, hints: 2 };
      if (mode !== 'endless') return tune(base);
      const extra = Math.floor(stage / 2) * 2;
      return tune({ ...base, mines: Math.min(Math.floor(base.cols * base.rows * .24), base.mines + extra) });
    };
    const signature = () => {
      if (!grid) return 'pending';
      let hash = 2166136261;
      for (const value of grid) hash = Math.imul(hash ^ (value + 2), 16777619);
      return (hash >>> 0).toString(16).padStart(8, '0');
    };
    function tone(frequency, length = .09, type = 'sine', volume = .045, delay = 0) {
      if (!soundOn || destroyed) return;
      try {
        audio ||= new (window.AudioContext || window.webkitAudioContext)();
        if (!audioGain) { audioGain = audio.createGain(); audioGain.gain.value = .65; audioGain.connect(audio.destination); }
        if (audio.state === 'suspended') audio.resume().catch(() => {});
        const at = audio.currentTime + delay, oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.001, at + length);
        oscillator.connect(gain).connect(audioGain); oscillator.start(at); oscillator.stop(at + length);
      } catch {}
    }
    function motif(notes) { if (reduced()) notes = notes.slice(0, 2); notes.forEach((note, i) => tone(note, .22, 'sine', .04, i * .075)); }
    function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound: soundOn, preset: presetId, zoom })); } catch {} }

    container.classList.add('deepfield-board');
    container.innerHTML = `<style>
      .deepfield-board{--df-brass:#c8ad72;--df-paper:#f0e6ce;--df-muted:#bdb8aa;--df-line:#a98b554d}.deepfield-board [hidden]{display:none!important}
      .deepfield-board .df-console{background:radial-gradient(ellipse at 82% 0,#671d3026,transparent 42%),repeating-linear-gradient(90deg,transparent 0 47px,#c8ad7205 47px 48px),#070a12;border-color:#8f774c66;box-shadow:inset 0 0 0 5px #b4955608,0 20px 60px #0009}
      .deepfield-board .df-board-frame,.deepfield-board .deepfield-grid{background-color:#050711}.deepfield-board .deepfield-cell{background:linear-gradient(145deg,#25231f,#10131b);border-color:#8f774c55}.deepfield-board .deepfield-cell.revealed{background:#090d16}.deepfield-board .deepfield-cell.flagged{color:#f1d395;background:radial-gradient(circle,#671d3055,transparent 68%),#19121a}
      .deepfield-board .df-manual p,.deepfield-board .df-status{font-size:14px}.deepfield-board .df-status{line-height:1.55}.deepfield-board .df-nocturne-panel{border:1px solid #8f774c66;border-bottom:0;background:linear-gradient(135deg,#111727,#160d17);padding:12px 14px;margin-bottom:10px;color:#e8dec7}.deepfield-board .df-nocturne-objective{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:16px;line-height:1.5}.deepfield-board .df-nocturne-objective strong{color:#e6c887}.deepfield-board .df-nocturne-event{margin:7px 0 0;color:#c6c1b5;font-size:14px;line-height:1.55}.deepfield-board .df-canticles{display:grid;gap:7px;margin-top:10px;font-size:14px;line-height:1.5}.deepfield-board .df-canticle-line{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.deepfield-board .df-canticle-line>b{min-width:58px;color:#bfa56f;font-size:12px;letter-spacing:.08em}.deepfield-board .df-canticle-line span{display:inline-block;min-width:29px;padding:2px 5px;border:1px solid #8f774c44;text-align:center;background:#080c15;color:#eee2c8;font-variant-numeric:tabular-nums}.deepfield-board .deepfield-cell[data-seal=found]::after{content:'✧';position:absolute;right:1px;bottom:0;color:#e8c976;font-size:11px;text-shadow:0 1px 2px #000}.deepfield-board .deepfield-cell[data-hazard=rift]{color:#fff0c8;background:radial-gradient(circle,#7d263d99,#19101c);border-color:#d2a96d;box-shadow:inset 0 0 0 2px #d2a96d33}.deepfield-board .deepfield-cell[data-hazard=veiled]{color:#f2b2aa;background:repeating-linear-gradient(45deg,#2b101c 0 4px,#120d17 4px 8px);border-color:#b85c69}.deepfield-board .df-input-mode [data-df-action=ward-mode][aria-pressed=true]{background:#671d3055;color:#ffe0c1;box-shadow:inset 0 -2px #c78975}
      .deepfield-board .df-finale{position:absolute;inset:0;z-index:9;overflow:auto;overscroll-behavior:contain;padding:clamp(14px,3vw,28px);background:radial-gradient(circle at 50% 20%,#671d3038,transparent 48%),#070a12f5;color:#ede2ca;text-align:center}.deepfield-board .df-finale h3{margin:5px 0 8px;font:34px/1.15 var(--serif);color:#f0dfb9}.deepfield-board .df-finale-intro{max-width:610px;margin:0 auto 12px;font-size:16px;line-height:1.55;color:#cbc5b7}.deepfield-board .df-finale-layout{display:grid;grid-template-columns:minmax(180px,300px) minmax(180px,1fr);gap:18px;align-items:center;max-width:680px;margin:auto}.deepfield-board .df-finale-grid{display:grid;grid-template-columns:repeat(var(--ff-size),1fr);gap:5px}.deepfield-board .df-finale-cell{aspect-ratio:1;min-width:40px;border:1px solid #9e8559;background:#111623;color:#d8c8a8;font:22px var(--serif);cursor:pointer}.deepfield-board .df-finale-cell[data-state=live]{background:#651e32;color:#ffe3ae;border-color:#e1b873}.deepfield-board .df-finale-cell[data-state=quiet]{background:#e2d6ba;color:#17121a}.deepfield-board .df-finale-cell:disabled{opacity:.42;cursor:not-allowed}.deepfield-board .df-finale-clues{text-align:left;font-size:14px;line-height:1.75;color:#d4ccbb}.deepfield-board .df-finale-clues b{color:#e3c383}.deepfield-board .df-finale-status{min-height:44px;margin:12px auto 8px;max-width:620px;font-size:14px;line-height:1.55;color:#e4c7b5}.deepfield-board .df-finale-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:8px}.deepfield-board .df-finale-actions button{min-height:44px;padding:9px 15px;border:1px solid #b69a64;background:#171522;color:#eee0c2;font-size:14px;cursor:pointer}.deepfield-board .df-finale-actions .df-finale-submit{background:#c7aa70;color:#12101a}.deepfield-board .df-finale-ledger{margin:8px 0;font-size:14px;color:#cbbd9f}
      @media(max-width:620px){.deepfield-board .df-nocturne-objective{display:block}.deepfield-board .df-nocturne-objective strong,.deepfield-board .df-nocturne-objective span{display:block}.deepfield-board .df-nocturne-objective span{margin-top:5px}.deepfield-board .df-board-frame.has-finale{min-height:780px}.deepfield-board .df-finale-layout{grid-template-columns:1fr;max-width:330px}.deepfield-board .df-finale-clues{text-align:center}.deepfield-board .df-finale h3{font-size:29px}.deepfield-board .df-finale-intro{font-size:16px}}
      @media(pointer:coarse){.deepfield-board .df-tools button,.deepfield-board .df-input-mode button,.deepfield-board .df-text-button{min-height:44px}.deepfield-board .df-finale-cell{min-width:44px;min-height:44px}.deepfield-board .df-finale-actions button{min-height:44px}}
      @media(prefers-reduced-motion:reduce){.deepfield-board .df-finale *{animation:none!important;transition:none!important}}
    </style><section class="df-console" aria-label="Deep Field Minesweeper">
      <header class="df-header"><div><p class="df-kicker">OCCULTATION SURVEY · PLATE X</p><h2>Deep Field</h2><p class="df-deck">Read the firmament. Mark the hidden suns.</p></div><span class="df-figure" aria-hidden="true">☉<i></i></span></header>
      <div class="df-expedition-line"><span data-df-mode></span><span data-df-seed></span></div>
      <div class="df-presets" role="group" aria-label="Board class"></div>
      <div class="df-hud" aria-label="Survey instruments">
        <div><small>NOVAE</small><strong data-df-mines>—</strong><span>unmarked</span></div>
        <div><small>ELAPSED</small><strong data-df-time>00:00</strong><span>active time</span></div>
        <div><small>CHARTED</small><strong data-df-charted>0%</strong><span data-df-safe>safe sectors</span></div>
        <div><small>SCORE</small><strong data-df-score>0</strong><span>expedition</span></div>
      </div>
      <div class="df-progress" aria-hidden="true"><i data-df-progress></i></div>
      <aside class="df-nocturne-panel" data-df-nocturne hidden aria-label="Nocturne expedition objective"><div class="df-nocturne-objective"><strong data-df-objective>Recover three ivory seals.</strong><span data-df-resources>SEALS 0 / 3 · FOCUS 1 · INTEGRITY 3</span></div><p class="df-nocturne-event" data-df-event>Row and column canticles count every nova on that line. They are public clues and work with Safe / Nova proofs.</p><div class="df-canticles" data-df-canticles aria-label="Visible row and column nova totals"></div></aside>
      <div class="df-tools" aria-label="Survey controls">
        <div class="df-input-mode" role="group" aria-label="Touch input mode"><button type="button" data-df-action="reveal-mode" aria-pressed="true">◎ Reveal</button><button type="button" data-df-action="flag-mode" aria-pressed="false">⚑ Flag</button>${veteran ? '<button type="button" data-df-action="ward-mode" aria-pressed="false" hidden>◇ Ward</button>' : ''}</div>
        <button type="button" data-df-action="hint" title="Reveal one safe sector; reduces the time bonus">✧ Oracle <span data-df-hints></span></button>
        ${veteran ? '<button type="button" data-df-action="proof-safe" title="Reveal a logically proven safe sector; costs one Oracle charge">∴ Safe proof <span data-df-hints></span></button><button type="button" data-df-action="proof-mine" title="Flag a logically proven nova; costs one Oracle charge">⚑ Nova proof <span data-df-hints></span></button>' : ''}
        <button type="button" data-df-action="pause" aria-pressed="false">Ⅱ Pause</button>
        <button type="button" data-df-action="sound" aria-pressed="${soundOn}">${soundOn ? 'Sound on' : 'Sound off'}</button>
        <span class="df-tool-spacer"></span>
        <button type="button" data-df-action="zoom-out" aria-label="Zoom board out">−</button><output data-df-zoom aria-label="Board zoom">${Math.round(zoom * 100)}%</output><button type="button" data-df-action="zoom-in" aria-label="Zoom board in">+</button>
      </div>
      <p class="df-status" data-df-status role="status" aria-live="polite"></p>
      <div class="df-board-frame"><div class="df-board-scroll"><div class="deepfield-grid" tabindex="0" role="group"></div></div><div class="df-effects" aria-hidden="true"></div><div class="df-paused" data-df-paused hidden><span>❚❚</span><strong>The instruments are covered.</strong><small>Press P or choose Resume.</small></div></div>
      <div class="df-round-actions"><button type="button" class="df-text-button" data-df-action="retry">↶ Retry this chart <kbd>R</kbd></button><button type="button" class="df-text-button" data-df-action="fresh">✦ New expedition</button></div>
      <details class="df-manual"><summary>Field manual &amp; controls</summary><div><p><b>Reveal</b> every safe sector. A number counts novae in the eight neighbouring sectors. Your first reveal and its neighbours are always safe.</p><p><b>Chord:</b> when a revealed number has that many flags around it, activate the number again to reveal its other neighbours. Incorrect flags can still cost the run. The veteran Stillpoint Seal cancels one such false chord on each later chart.</p>${veteran ? '<p><b>Veteran proofs:</b> D reveals a logically proven safe sector; V flags a proven nova. Proofs use visible clues, subset logic and your flags—never hidden cells. Each spends one Oracle charge; no proof means no charge. Proof flags do not consume Meridian’s hand-flag slots.</p>' : ''}<p><b>Mouse:</b> click reveal · right-click flag / question / clear · click a number to chord.<br><b>Touch:</b> tap reveal · hold to flag · or use the Reveal / Flag mode buttons.<br><b>Keyboard:</b> arrows move · Enter / Space reveal · F flag · Q question · C chord · H oracle · T input mode · P pause · R retry.</p><p>The Oracle reveals a safe sector but lowers your score bonus. Campaign relics persist for the current expedition. Meridian permits only twelve hand-placed flags at once; recall one before moving it. Zoom never changes the underlying chart.</p>${veteran ? '<p><b>Nocturne expedition:</b> choose the Nocturne board class in Veteran free play. Three finite movements add public row/column totals and three recoverable seals to each chart. Rifts are explicitly safe to chart but act on a visible move countdown; expired rifts veil a sector rather than creating a nova. Use Ward mode or W on a rift to clear it. Wards spend one recovered Focus, or score when Focus is empty. Clear all safe sectors to advance.</p><p><b>The Engine Below:</b> after the third chart, solve three ivory plates. Each plate gives exact row, column and (on later plates) diagonal ember counts. Cycle a socket through unknown, ember and quiet; every plate has a deduction-backed solution. The last plate telegraphs row interference, which can always be Warded. No hidden board value is consulted by a proof.</p>' : ''}</div></details>
      <p class="df-accessible-help" id="df-help">Deep Field Minesweeper. Reveal every safe sector and mark the novae. Use arrow keys to move between sectors; the field manual lists every command.</p>
    </section>`;
    board = container.querySelector('.deepfield-grid'); status = container.querySelector('[data-df-status]');
    effectLayer = container.querySelector('.df-effects'); pauseBadge = container.querySelector('[data-df-paused]');
    board.setAttribute('aria-describedby', 'df-help');

    function renderPresets() {
      const strip = container.querySelector('.df-presets');
      if (mode === 'trial') { strip.hidden = true; return; }
      strip.hidden = false;
      const summary = preset => preset.nocturne ? '3 finite charts · canticle logic · rifts · machine finale' : `${preset.cols} × ${preset.rows} · ${preset.mines} novae${preset.flagLimit ? ` · ${preset.flagLimit} hand flags · ×${preset.scoreMultiplier} score` : ''}`;
      if (mode === 'campaign' || mode === 'daily') {
        strip.innerHTML = `<span class="df-route-label">${mode === 'daily' ? 'DAILY VIGIL · FIXED NAVIGATOR CHART' : veteran ? 'THE FOUR OCCULTATIONS · CHOOSE THE LAST FIRMAMENT' : 'THE THREE OCCULTATIONS'}</span><div class="df-route">${(mode === 'campaign' ? campaign : ['navigator']).map((id, i) => `<span class="${i === stage ? 'current' : i < stage ? 'passed' : ''}">${i < stage ? '✓' : ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][i]} ${PRESETS[id].name}<small>${summary(PRESETS[id])}</small></span>`).join('')}</div>`;
      } else {
        const presets = Object.entries(PRESETS).filter(([, preset]) => veteran || !preset.veteran);
        strip.innerHTML = `<span class="df-route-label">CHOOSE A BOARD CLASS · CHANGING IT STARTS A NEW EXPEDITION</span><div class="df-preset-buttons">${presets.map(([id, preset]) => `<button type="button" data-df-preset="${id}" aria-pressed="${id === presetId}"><strong>${preset.name}</strong><small>${summary(preset)}</small></button>`).join('')}</div>`;
      }
    }
    const hazardAt = p => hazards.find(hazard => hazard.index === p);
    function describeCell(p) {
      const coordinate = `${String.fromCharCode(65 + p % config.cols)}${Math.floor(p / config.cols) + 1}`;
      if (revealed.has(p)) return `${coordinate}: ${grid[p] < 0 ? 'nova' : grid[p] ? `${grid[p]} adjacent novae; activate to chord` : 'clear'}${sealsFound.has(p) ? '; ivory seal recovered' : ''}`;
      const hazard = hazardAt(p);
      if (hazard) return `${coordinate}: ${hazard.state === 'veiled' ? 'veiled safe sector; use Ward to clear it' : `umbral rift; safe to reveal, ${hazard.remaining} charting actions before it veils`}`;
      if (flagged.has(p)) return `${coordinate}: flagged`;
      if (questioned.has(p)) return `${coordinate}: question marked`;
      return `${coordinate}: uncharted`;
    }
    function syncCell(p) {
      const cell = cells[p]; if (!cell) return;
      const isRevealed = revealed.has(p), isFlagged = flagged.has(p), isQuestioned = questioned.has(p), hazard = !isRevealed && hazardAt(p);
      cell.classList.toggle('revealed', isRevealed); cell.classList.toggle('flagged', isFlagged); cell.classList.toggle('questioned', isQuestioned);
      cell.dataset.state = isRevealed ? 'revealed' : isFlagged ? 'flagged' : isQuestioned ? 'questioned' : 'hidden';
      if (sealsFound.has(p)) cell.dataset.seal = 'found'; else delete cell.dataset.seal;
      if (hazard) cell.dataset.hazard = hazard.state; else delete cell.dataset.hazard;
      cell.setAttribute('aria-label', describeCell(p));
      if (isRevealed) {
        cell.textContent = grid[p] < 0 ? '✹' : grid[p] || '';
        if (grid[p] > 0) cell.dataset.count = grid[p]; else delete cell.dataset.count;
      } else {
        cell.textContent = hazard ? (hazard.state === 'veiled' ? '✕' : '◈') : isFlagged ? '⚑' : isQuestioned ? '?' : '';
        if (hazard) cell.title = describeCell(p); else cell.removeAttribute('title');
        delete cell.dataset.count;
      }
    }
    function setCursor(next, focus = false) {
      cursor = clamp(next, 0, config.cols * config.rows - 1);
      cells.forEach((cell, p) => { cell.tabIndex = p === cursor ? 0 : -1; });
      if (focus) cells[cursor]?.focus({ preventScroll: true });
    }
    function buildBoard() {
      const oldActive = document.activeElement;
      board.style.setProperty('--df', config.cols); board.style.setProperty('--df-rows', config.rows); board.style.setProperty('--df-zoom', zoom);
      container.querySelector('.df-board-scroll').style.setProperty('--df-max', config.cols);
      board.dataset.deepField = 'true'; board.dataset.difficulty = presetId; board.dataset.stage = String(stage + 1); board.dataset.seed = String(roundSeed);
      board.dataset.mines = String(config.mines); board.dataset.gridSignature = signature(); board.dataset.mode = mode; delete board.dataset.lastProof;
      board.dataset.modifier = config.flagLimit ? 'limited-flags' : 'standard'; board.dataset.flagLimit = String(config.flagLimit || 0); board.dataset.scoreMultiplier = String(config.scoreMultiplier || 1);
      board.dataset.expedition = nocturne() ? 'nocturne' : 'standard'; board.dataset.eventStage = '0'; board.dataset.layoutSeed = String(layoutSeed || roundSeed); board.dataset.solutionSteps = String(solutionSteps);
      board.setAttribute('aria-label', `${config.name} Deep Field: ${config.cols} columns by ${config.rows} rows, ${config.mines} novae.${config.flagLimit ? ` Only ${config.flagLimit} hand-placed flags.` : ''}${nocturne() ? ' Public row and column totals count novae. Rifts are safe but must be charted or Warded.' : ''} Arrow keys move; Enter reveals; F flags.`);
      board.setAttribute('aria-rowcount', config.rows); board.setAttribute('aria-colcount', config.cols);
      board.innerHTML = '';
      cells = Array.from({ length: config.cols * config.rows }, (_, p) => {
        const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'deepfield-cell';
        cell.dataset.cell = String(p); cell.style.setProperty('--deal', Math.min(30, p % config.cols + Math.floor(p / config.cols)));
        cell.tabIndex = p === 0 ? 0 : -1; board.appendChild(cell); return cell;
      });
      revealed = new Set(); flagged = new Set(); questioned = new Set(); proofMarks = new Set(); cursor = 0;
      cells.forEach((_, p) => syncCell(p));
      if (oldActive?.closest?.('.deepfield-grid') || oldActive === board) board.focus({ preventScroll: true });
      updateHUD();
    }
    function renderCanticles() {
      const panel = container.querySelector('[data-df-canticles]');
      if (!nocturne()) { panel.innerHTML = ''; return; }
      if (!grid || !chartLines.length) {
        panel.innerHTML = '<span>Make the first reveal to imprint this chart’s public canticles.</span>'; panel.dataset.layout = 'pending'; return;
      }
      if (panel.dataset.layout === String(layoutSeed)) return;
      const rows = chartLines.slice(0, config.rows), columns = chartLines.slice(config.rows);
      const chips = line => `<span title="${line.label}: ${line.value} novae" aria-label="${line.label}: ${line.value} novae">${line.value}</span>`;
      panel.innerHTML = `<div class="df-canticle-line"><b>ROWS 1→</b>${rows.map(chips).join('')}</div><div class="df-canticle-line"><b>COLS A→</b>${columns.map(chips).join('')}</div>`;
      panel.dataset.layout = String(layoutSeed);
      board.dataset.canticleRows = rows.map(line => line.value).join(',');
      board.dataset.canticleColumns = columns.map(line => line.value).join(',');
    }
    function updateHUD(message) {
      if (!config) return;
      const safe = config.cols * config.rows - config.mines, charted = [...revealed].reduce((count, p) => count + (grid?.[p] >= 0 ? 1 : 0), 0), progress = charted / safe;
      const remaining = config.mines - flagged.size;
      container.querySelector('[data-df-mines]').textContent = String(remaining).padStart(2, '0');
      container.querySelector('[data-df-time]').textContent = formatTime(seconds());
      container.querySelector('[data-df-charted]').textContent = `${Math.floor(progress * 100)}%`;
      container.querySelector('[data-df-safe]').textContent = `${charted} / ${safe} safe`;
      container.querySelector('[data-df-score]').textContent = Math.round(runScore).toLocaleString();
      container.querySelector('[data-df-progress]').style.width = `${progress * 100}%`;
      container.querySelectorAll('[data-df-hints]').forEach(node => { node.textContent = `(${hintsLeft})`; });
      container.querySelector('[data-df-action="hint"]').disabled = hintsLeft <= 0 || roundOver || paused;
      container.querySelectorAll('[data-df-action="proof-safe"], [data-df-action="proof-mine"]').forEach(button => { button.disabled = hintsLeft <= 0 || roundOver || paused || !grid; });
      container.querySelector('[data-df-action="retry"]').disabled = roundOver;
      container.querySelector('[data-df-action="fresh"]').disabled = roundOver;
      container.querySelectorAll('[data-df-preset]').forEach(button => { button.disabled = roundOver; });
      container.querySelector('[data-df-mode]').textContent = nocturne() ? `NOCTURNE EXPEDITION · MOVEMENT ${stage + 1} / ${NOCTURNE_CHARTS.length}` : mode === 'campaign' ? `CAMPAIGN · CHART ${stage + 1} / ${campaign.length}` : mode === 'daily' ? 'DAILY VIGIL · ONE SHARED SKY' : mode === 'endless' ? `ENDLESS EXPEDITION · CHART ${stage + 1}` : 'GRAND TOUR · SINGLE SURVEY';
      container.querySelector('[data-df-seed]').textContent = `SEED ${String(roundSeed).padStart(10, '0')}`;
      const nocturnePanel = container.querySelector('[data-df-nocturne]'); nocturnePanel.hidden = !nocturne();
      const wardMode = container.querySelector('[data-df-action="ward-mode"]'); if (wardMode) { wardMode.hidden = !nocturne(); wardMode.disabled = roundOver || paused; }
      if (nocturne()) {
        container.querySelector('[data-df-objective]').textContent = `${config.movement} · Recover three ivory seals; chart every safe sector.`;
        container.querySelector('[data-df-resources]').textContent = `SEALS ${sealsFound.size} / 3 · FOCUS ${focus} · INTEGRITY ${integrity}`;
        renderCanticles();
      } else container.querySelector('[data-df-canticles]').innerHTML = '';
      board.dataset.revealed = String(charted); board.dataset.flags = String(flagged.size); board.dataset.questions = String(questioned.size);
      board.dataset.hints = String(hintsUsed); board.dataset.proofs = String(proofsUsed); board.dataset.proofFlags = String(proofMarks?.size || 0); board.dataset.aegis = String(aegis); board.dataset.stillpoint = String(stillpointReady); board.dataset.score = String(Math.round(runScore));
      board.dataset.started = String(started); board.dataset.over = String(roundOver); board.dataset.won = String(won);
      board.dataset.gridSignature = signature(); board.dataset.paused = String(paused); board.dataset.zoom = zoom.toFixed(2);
      board.dataset.seals = String(sealsFound.size); board.dataset.focus = String(focus); board.dataset.integrity = String(integrity); board.dataset.hazards = String(hazards.length); board.dataset.wards = String(wardsUsed); board.dataset.riftsSealed = String(riftsSealed); board.dataset.eventStage = String(eventStage); board.dataset.layoutSeed = String(layoutSeed || roundSeed); board.dataset.solutionSteps = String(solutionSteps);
      if (message) status.textContent = message;
    }
    function announce(message) { status.textContent = message; }
    function startClock() {
      if (started) return;
      started = true; startedAt = performance.now(); elapsedBefore = 0;
    }
    function freezeClock() { if (started && !roundOver) { elapsedBefore += performance.now() - startedAt; startedAt = performance.now(); } }
    function setZoom(value) {
      zoom = clamp(Math.round(value * 20) / 20, 1, 1.75); board.style.setProperty('--df-zoom', zoom);
      container.querySelector('[data-df-zoom]').textContent = `${Math.round(zoom * 100)}%`; updateHUD(); saveSettings();
    }
    function setInputMode(value) {
      if (value === 'ward' && !nocturne()) value = 'reveal';
      inputMode = value;
      container.querySelector('[data-df-action="reveal-mode"]').setAttribute('aria-pressed', String(value === 'reveal'));
      container.querySelector('[data-df-action="flag-mode"]').setAttribute('aria-pressed', String(value === 'flag'));
      container.querySelector('[data-df-action="ward-mode"]')?.setAttribute('aria-pressed', String(value === 'ward'));
      announce(value === 'ward' ? 'Ward mode: tap a visible rift or veiled sector to clear it. Focus is spent first, then score.' : value === 'flag' ? 'Flag mode: taps cycle flag, question, and clear.' : 'Reveal mode: taps chart sectors. Hold a sector to flag it.');
    }
    function pause({ focusResume = false } = {}) {
      if (destroyed || paused || runEnded) return;
      freezeClock(); paused = true; board.inert = true; pauseBadge.hidden = false;
      if (finaleLayer) { finaleLayer.inert = true; pauseBadge.style.zIndex = '10'; }
      const button = container.querySelector('[data-df-action="pause"]'); button.textContent = '▶ Resume'; button.setAttribute('aria-pressed', 'true');
      if (focusResume || finaleLayer) button.focus({ preventScroll: true });
      clearHold(); updateHUD('Survey paused. The active-time clock is stopped.'); refreshFinale();
    }
    function resume() {
      if (destroyed || !paused || runEnded) return;
      paused = false; startedAt = performance.now(); board.inert = false; pauseBadge.hidden = true; pauseBadge.style.zIndex = '';
      if (finaleLayer) finaleLayer.inert = false;
      const button = container.querySelector('[data-df-action="pause"]'); button.textContent = 'Ⅱ Pause'; button.setAttribute('aria-pressed', 'false');
      updateHUD('Survey resumed.'); refreshFinale();
      if (finaleLayer) finaleLayer.querySelector('[data-df-finale-cell]')?.focus({ preventScroll: true }); else board.focus({ preventScroll: true });
    }
    function burstAt(index, kind = 'reveal', amount = 10) {
      if (!effectLayer || reduced()) return;
      const x = (index % config.cols + .5) / config.cols * 100, y = (Math.floor(index / config.cols) + .5) / config.rows * 100;
      const count = Math.min(amount, Math.max(0, 48 - effectLayer.childElementCount));
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('i'), angle = fxRandom() * Math.PI * 2, distance = 18 + fxRandom() * 48;
        particle.className = `df-particle ${kind}`; particle.style.cssText = `--px:${x}%;--py:${y}%;--dx:${Math.cos(angle) * distance}px;--dy:${Math.sin(angle) * distance}px;--life:${420 + fxRandom() * 360}ms`;
        effectLayer.appendChild(particle); after(() => particle.remove(), 850);
      }
    }
    function removeHazard(p) {
      const before = hazards.length; hazards = hazards.filter(hazard => hazard.index !== p);
      if (hazards.length !== before) syncCell(p);
    }
    function wardCell(p) {
      if (!nocturne() || roundOver || paused) return;
      const hazard = hazardAt(p);
      if (!hazard) { announce('No rift or veil occupies this sector. No Focus spent.'); return; }
      startClock();
      const wasRift = hazard.state === 'rift'; removeHazard(p);
      if (focus > 0) focus--; else scorePenalty += 100;
      wardsUsed++; totalWards++; if (wasRift) riftsSealed++;
      burstAt(p, 'aegis', 12); tone(430, .12, 'triangle', .035);
      updateHUD(`${String.fromCharCode(65 + p % config.cols)}${Math.floor(p / config.cols) + 1} is Warded. ${focus} Focus remain${focus === 1 ? 's' : ''}${focus ? '' : '; future Wards deduct 100 score'}.`);
    }
    function advanceHazards() {
      if (!nocturne() || !hazards.length) return;
      for (const hazard of [...hazards]) {
        if (hazard.state !== 'rift') continue;
        hazard.remaining--;
        if (hazard.remaining <= 0) {
          hazard.state = 'veiled'; integrity--; tone(105, .2, 'sawtooth', .04);
          announce(`A rift veils ${String.fromCharCode(65 + hazard.index % config.cols)}${Math.floor(hazard.index / config.cols) + 1}. It is still safe: use Ward to clear it. Integrity ${integrity} / 3.`);
        }
        syncCell(hazard.index);
      }
      if (integrity <= 0 && !roundOver) finishRound(false, 'The third umbral flare ends this Nocturne. Every rift was telegraphed; retry the same deterministic chart.');
    }
    function recoverSeal(p) {
      if (!nocturne() || !chartSeals.includes(p) || sealsFound.has(p)) return;
      sealsFound.add(p); focus++; cells[p].dataset.seal = 'found';
      if (sealsFound.size === 3 && !objectivePaid) { objectivePaid = true; focus++; runScore += 200; }
    }
    function checkChartEvents() {
      if (!nocturne() || !grid || roundOver || eventStage >= NOCTURNE_EVENTS.length) return;
      const safe = config.cols * config.rows - config.mines, progress = [...revealed].filter(p => grid[p] >= 0).length / safe;
      const event = NOCTURNE_EVENTS[eventStage];
      if (progress + 1e-9 < event.at) return;
      const stageNumber = eventStage++; board.dataset.eventStage = String(eventStage);
      container.querySelector('[data-df-event]').textContent = `${event.title}. ${event.text}`;
      if (hazards.length < 2) {
        const occupied = new Set(hazards.map(hazard => hazard.index));
        const candidates = grid.map((value, p) => value >= 0 && !revealed.has(p) && !flagged.has(p) && !occupied.has(p) ? p : -1).filter(p => p >= 0);
        if (candidates.length) {
          const index = candidates[Math.floor(gameplayRandom() * candidates.length)];
          hazards.push({ index, state: 'rift', remaining: Math.max(4, 7 - stage), id: `${stageNumber}:${index}` });
          syncCell(index); tone(155 + stageNumber * 45, .18, 'triangle', .035);
          announce(`${event.title}: a safe rift is telegraphed at ${String.fromCharCode(65 + index % config.cols)}${Math.floor(index / config.cols) + 1} for ${Math.max(4, 7 - stage)} charting actions. Chart it or use Ward.`);
        }
      } else announce(`${event.title}: two rifts already occupy the shutters; no additional hazard is spawned.`);
    }
    function mark(p, cycle = true) {
      if (roundOver || paused || revealed.has(p)) return;
      if (hazardAt(p)) { announce('The rift is explicitly safe. Reveal it now, or use Ward mode to clear its veil; do not flag it as a nova.'); return; }
      proofMarks.delete(p);
      if (config.flagLimit && !flagged.has(p) && flagged.size >= config.flagLimit) {
        announce(`Meridian’s ${config.flagLimit} flags are all in service. Recall a flag before placing another.`); tone(160, .07, 'triangle', .025); return;
      }
      if (flagged.has(p)) { flagged.delete(p); if (cycle) questioned.add(p); }
      else if (questioned.has(p)) questioned.delete(p);
      else flagged.add(p);
      syncCell(p); tone(flagged.has(p) ? 510 : 310, .07, 'triangle', .035); burstAt(p, 'flag', 4);
      updateHUD(`${String.fromCharCode(65 + p % config.cols)}${Math.floor(p / config.cols) + 1}: ${flagged.has(p) ? 'nova marked' : questioned.has(p) ? 'uncertain' : 'mark cleared'}. ${config.mines - flagged.size} marks remain.`);
    }
    function createGrid(first) {
      if (nocturne()) {
        const chart = generateNocturne({ ...config, seed: roundSeed, safeIndex: first });
        chartLines = chart.lines; chartSeals = chart.seals; surveyPins = chart.pins; layoutSeed = chart.layoutSeed; solutionSteps = chart.solution.steps;
        return chart.grid;
      }
      chartLines = []; chartSeals = []; surveyPins = []; layoutSeed = roundSeed; solutionSteps = 0;
      return generate({ ...config, seed: roundSeed, safeIndex: first }).grid;
    }
    function ensureGrid(first) {
      if (grid) return;
      initialSafe = first;
      grid = createGrid(first);
      board.dataset.gridSignature = signature(); board.dataset.layoutSeed = String(layoutSeed); board.dataset.solutionSteps = String(solutionSteps);
    }
    function hitNova(index) {
      if (aegis > 0) {
        aegis--; shieldsUsed++; flagged.add(index); questioned.delete(index); syncCell(index);
        const cell = cells[index]; cell.classList.add('aegis-saved'); after(() => cell.classList.remove('aegis-saved'), 800);
        burstAt(index, 'aegis', 20); motif([180, 240, 360]); updateHUD(`The Aegis turns aside a nova. ${aegis} ward${aegis === 1 ? '' : 's'} remain.`); return;
      }
      revealed.add(index); syncCell(index); cells[index].classList.add('nova', 'detonated');
      grid.forEach((value, p) => {
        if (value === -1) {
          if (!revealed.has(p)) { revealed.add(p); syncCell(p); cells[p].classList.add('nova'); cells[p].style.setProperty('--wave', Math.min(12, Math.abs(p % config.cols - index % config.cols) + Math.abs(Math.floor(p / config.cols) - Math.floor(index / config.cols)))); }
        } else if (flagged.has(p)) cells[p].classList.add('wrong-flag');
      });
      burstAt(index, 'nova', 30); tone(75, .5, 'sawtooth', .07);
      finishRound(false, `A nova breaks the survey at ${String.fromCharCode(65 + index % config.cols)}${Math.floor(index / config.cols) + 1}.`);
    }
    function reveal(start, { automatic = false, hinted = false, proof = false } = {}) {
      if (roundOver || paused || runEnded || start < 0 || start >= gridLength() || flagged.has(start)) return;
      if (revealed.has(start)) { chord(start); return; }
      if (hazardAt(start)?.state === 'veiled') { announce('This sector is veiled, not a nova. Use Ward mode or press W here to clear it safely.'); return; }
      if (!automatic) startClock();
      ensureGrid(start);
      if (hazardAt(start)?.state === 'rift') { removeHazard(start); riftsSealed++; runScore += 40; }
      if (!automatic) { advanceHazards(); if (roundOver) return; }
      if (grid[start] === -1) { hitNova(start); return; }
      const opening = flood(grid, config.cols, config.rows, start, flagged);
      const apply = entries => {
        for (const { index, wave } of entries) {
          if (revealed.has(index) || grid[index] < 0 || hazardAt(index)?.state === 'veiled') continue;
          if (hazardAt(index)?.state === 'rift') { removeHazard(index); riftsSealed++; }
          revealed.add(index); questioned.delete(index); recoverSeal(index); syncCell(index);
          cells[index].style.setProperty('--wave', Math.min(14, wave));
          if (hinted && index === start) cells[index].classList.add(proof ? 'proof-revealed' : 'oracle-revealed');
        }
      };
      apply(opening);
      if (nocturne()) for (const pin of surveyPins) if (!revealed.has(pin)) apply(flood(grid, config.cols, config.rows, pin, flagged));
      if (verbs.has('echo') && !automatic && gameplayRandom() < .2) {
        const extra = neighbours(start, config.cols, config.rows).find(p => !revealed.has(p) && !flagged.has(p) && grid[p] >= 0);
        if (extra !== undefined) { apply(flood(grid, config.cols, config.rows, extra, flagged)); announce('The Echo Lens finds a second clearing.'); }
      }
      if (verbs.has('parallax') && Math.floor(revealed.size / 5) > Math.floor((revealed.size - opening.length) / 5)) {
        const hidden = grid.map((value, p) => value === -1 && !flagged.has(p) && !revealed.has(p) ? p : -1).filter(p => p >= 0);
        if (hidden.length) { const p = hidden[Math.floor(gameplayRandom() * hidden.length)]; flagged.add(p); syncCell(p); announce('The Parallax Mirror marks a hiding nova.'); }
      }
      if (opening.length) { tone(270 + Math.min(5, grid[start]) * 55, .08, 'sine', .035); burstAt(start, hinted ? 'oracle' : 'reveal', Math.min(14, 4 + opening.length)); }
      checkChartEvents();
      const safe = config.cols * config.rows - config.mines;
      if ([...revealed].filter(p => grid[p] >= 0).length >= safe) { finishRound(true); return; }
      updateHUD(hinted ? `${proof ? 'Visible logic proves' : 'The Oracle clears'} ${String.fromCharCode(65 + start % config.cols)}${Math.floor(start / config.cols) + 1}. ${hintsLeft} charge${hintsLeft === 1 ? '' : 's'} remain.` : `${revealed.size} / ${safe} safe sectors charted. ${config.mines - flagged.size} novae unmarked.`);
    }
    function gridLength() { return config.cols * config.rows; }
    function chord(index) {
      if (!grid || !revealed.has(index) || grid[index] <= 0 || roundOver || paused) return;
      const around = neighbours(index, config.cols, config.rows), marks = around.filter(p => flagged.has(p)).length;
      if (marks !== grid[index]) { announce(`This ${grid[index]} needs ${grid[index]} adjacent flag${grid[index] === 1 ? '' : 's'}; ${marks} placed.`); tone(180, .06, 'triangle', .025); return; }
      const targets = around.filter(p => !flagged.has(p) && !revealed.has(p));
      if (!targets.length) return;
      if (stillpointReady && around.some(p => flagged.has(p) && grid[p] >= 0)) {
        stillpointReady = false; burstAt(index, 'aegis', 18); motif([220, 330, 440]);
        updateHUD('The Stillpoint Seal holds time: a falsely flagged chord is cancelled. Its charge returns on the next chart.'); return;
      }
      // Resolve the complete chord against the same committed flag state. A
      // wrong flag may detonate; later targets never reveal behind a dead run.
      // One chord is also one Nocturne action, not one tick per opened sector.
      if (nocturne()) { advanceHazards(); if (roundOver) return; }
      for (const p of targets) { if (roundOver) break; reveal(p, { automatic: nocturne() }); }
    }
    function hint() {
      if (roundOver || paused || hintsLeft <= 0) return;
      if (!started || !grid) {
        const centre = Math.floor(gridLength() / 2), start = flagged.has(centre) ? cells.findIndex((_, p) => !flagged.has(p)) : centre;
        if (start >= 0) reveal(start);
      }
      if (roundOver || !grid) return;
      const candidates = grid.map((value, p) => value >= 0 && !revealed.has(p) && !flagged.has(p) ? p : -1).filter(p => p >= 0);
      if (!candidates.length) return;
      const p = candidates[Math.floor(gameplayRandom() * candidates.length)];
      hintsLeft--; hintsUsed++; totalHints++; reveal(p, { hinted: true });
    }
    function proof(kind) {
      if (!veteran || roundOver || paused || hintsLeft <= 0 || !grid || !['safe', 'mines'].includes(kind)) return;
      const clues = {};
      for (const p of revealed) if (grid[p] > 0) clues[p] = grid[p];
      const inference = deduce({ cols: config.cols, rows: config.rows, revealed, flagged, clues, lines: nocturne() ? chartLines : [] });
      const candidate = inference[kind][0];
      if (!candidate) { announce(`No ${kind === 'safe' ? 'safe sector' : 'nova'} is proven by the visible clues. No charge spent.`); tone(180, .06, 'triangle', .025); return; }
      const p = candidate.index;
      hintsLeft--; hintsUsed++; totalHints++; proofsUsed++; totalProofs++; startClock();
      board.dataset.lastProof = `${kind === 'safe' ? 'safe' : 'nova'}:${p}`;
      if (kind === 'safe') {
        reveal(p, { hinted: true, proof: true });
        if (!roundOver) updateHUD(`${String.fromCharCode(65 + p % config.cols)}${Math.floor(p / config.cols) + 1} is proven safe · ${candidate.reason}. ${hintsLeft} charge${hintsLeft === 1 ? '' : 's'} remain.`);
      } else {
        flagged.add(p); questioned.delete(p); proofMarks.add(p); syncCell(p); cells[p].classList.add('proof-flag');
        burstAt(p, 'flag', 8); tone(570, .1, 'triangle', .035);
        updateHUD(`${String.fromCharCode(65 + p % config.cols)}${Math.floor(p / config.cols) + 1} is a proven nova · ${candidate.reason}. ${hintsLeft} charge${hintsLeft === 1 ? '' : 's'} remain.`);
      }
    }
    function roundValue(success) {
      const safe = config.cols * config.rows - config.mines;
      if (!success) return [...revealed].filter(p => grid[p] >= 0).length * 5;
      const timeBonus = Math.max(0, 2400 - seconds() * 12);
      return Math.round((safe * 9 + config.mines * 38 + timeBonus + hintsLeft * 140 + chartsCleared * 250 - hintsUsed * 60 - shieldsUsed * 100 - scorePenalty) * (config.scoreMultiplier || 1));
    }
    function finishRound(success, failureDetail = '') {
      if (roundOver || runEnded) return;
      freezeClock(); roundOver = true; won = success; totalElapsed += elapsed(); elapsedBefore = 0;
      runScore += Math.max(0, Math.round(roundValue(success)));
      if (success) {
        chartsCleared++; if (nocturne()) expeditionSeals += sealsFound.size;
        hazards = [];
        grid.forEach((value, p) => { if (value === -1) { flagged.add(p); questioned.delete(p); syncCell(p); cells[p].classList.add('sealed-nova'); } else if (hazardAt(p)) syncCell(p); });
        board.classList.add('is-won'); burstAt(Math.floor(gridLength() / 2), 'victory', 30); motif([392, 523.25, 659.25, 783.99]);
      }
      updateHUD(success ? `Chart sealed. ${formatTime(totalElapsed / 1000)} active time across the expedition.` : failureDetail || 'The survey is lost. Your partial chart remains in the ledger.');
      if (success && nocturne()) {
        if (stage < NOCTURNE_CHARTS.length - 1) after(showIntermission, reduced() ? 80 : 650);
        else after(startFinale, reduced() ? 100 : 700);
      } else if (success && ((mode === 'campaign' && stage < campaign.length - 1) || mode === 'endless')) after(showIntermission, reduced() ? 80 : 650);
      else after(() => emitEnd(success), reduced() ? 120 : 900);
    }
    function showIntermission() {
      if (destroyed || runEnded || intermission) return;
      const finalRoute = veteran && mode === 'campaign' && stage === campaign.length - 2;
      intermission = document.createElement('div'); intermission.className = 'df-intermission';
      if (nocturne()) {
        const next = NOCTURNE_CHARTS[Math.min(stage + 1, NOCTURNE_CHARTS.length - 1)];
        intermission.innerHTML = `<p class="df-kicker">MOVEMENT ${stage + 1} SEALED · ${expeditionSeals} IVORY SEALS RECOVERED</p><h3>Prepare the next occultation.</h3><p>${next.name} carries faster, bounded rifts. Choose one instrument; the underlying proof-certified chart and first-click protection remain unchanged.</p><div class="df-relics"><button type="button" data-df-relic="lens"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('lens')}</span><strong>Canticle Lens</strong><small>+1 Oracle charge on every later movement</small></button><button type="button" data-df-relic="wardcraft"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('aegis')}</span><strong>Ivory Wardrobe</strong><small>+1 starting Focus on every later movement and in the finale</small></button><button type="button" data-df-relic="aegis"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('echo')}</span><strong>Aegis of Umbra</strong><small>Negate one genuine nova; rifts always remain explicitly safe</small></button></div><p class="df-relic-choice" data-df-relic-choice>No new instrument selected. You may continue without drafting.</p><button type="button" class="df-continue" data-df-action="continue">Movement ${stage + 2} →</button>`;
      } else if (finalRoute) {
        intermission.innerHTML = `<p class="df-kicker">CHART ${stage + 1} SEALED · ${runScore.toLocaleString()} POINTS</p><h3>Choose the last firmament.</h3><p>Keep the Cathedral’s open instrument panel, or take the Meridian: only twelve hand-placed flags, a denser chart, and a ×1.35 score bonus.</p><div class="df-relics"><button type="button" data-df-route="cathedral" aria-pressed="${campaign.at(-1) === 'cathedral'}"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('aegis')}</span><strong>Cathedral</strong><small>18 × 12 · unrestricted flags · standard score</small></button><button type="button" data-df-route="meridian" aria-pressed="${campaign.at(-1) === 'meridian'}"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('compass')}</span><strong>Meridian</strong><small>20 × 12 · 12 hand flags · ×1.35 score</small></button></div><p class="df-relic-choice" data-df-route-choice>${PRESETS[campaign.at(-1)].name} is charted for the finale. You may change route before continuing.</p><button type="button" class="df-continue" data-df-action="continue">Chart ${stage + 2} →</button>`;
      } else {
        intermission.innerHTML = `<p class="df-kicker">CHART ${stage + 1} SEALED · ${runScore.toLocaleString()} POINTS</p><h3>Choose an instrument.</h3><p>One relic joins this expedition. Or continue with the instruments you already carry.</p><div class="df-relics"><button type="button" data-df-relic="lens"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('lens')}</span><strong>Mercator’s Lens</strong><small>+1 Oracle charge on every later chart</small></button><button type="button" data-df-relic="aegis"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('aegis')}</span><strong>Aegis of Umbra</strong><small>Negate one nova and mark it safely</small></button><button type="button" data-df-relic="echo" ${echoOpen ? 'disabled' : ''}><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('echo')}</span><strong>Echo Sounder</strong><small>Open a safe clearing on every later chart</small></button>${veteran ? `<button type="button" data-df-relic="stillpoint" ${stillpoint ? 'disabled' : ''}><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade('time')}</span><strong>Stillpoint Seal</strong><small>Cancel one falsely flagged chord on every later chart</small></button>` : ''}</div><p class="df-relic-choice" data-df-relic-choice>No new instrument selected.</p><button type="button" class="df-continue" data-df-action="continue">Chart ${stage + 2} →</button>`;
      }
      container.querySelector('.df-board-frame').appendChild(intermission); intermission.querySelector('[data-df-route][aria-pressed="true"], [data-df-relic]:not(:disabled)')?.focus({ preventScroll: true });
    }
    function chooseRoute(id) {
      if (!intermission || !veteran || mode !== 'campaign' || stage !== campaign.length - 2 || !['cathedral', 'meridian'].includes(id)) return;
      campaign[campaign.length - 1] = id;
      intermission.querySelectorAll('[data-df-route]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.dfRoute === id)));
      intermission.querySelector('[data-df-route-choice]').textContent = `${PRESETS[id].name} is charted for the finale. You may change route before continuing.`;
      tone(id === 'meridian' ? 540 : 420, .12, 'triangle', .035); renderPresets();
    }
    function draftRelic(id, button) {
      if (intermissionDrafted || !intermission) return;
      intermissionDrafted = true;
      if (id === 'lens') hintBonus++;
      else if (id === 'aegis') aegis++;
      else if (id === 'echo') echoOpen = true;
      else if (id === 'stillpoint') stillpoint = true;
      else if (id === 'wardcraft') wardBonus++;
      intermission.querySelectorAll('[data-df-relic]').forEach(element => { element.disabled = true; element.classList.toggle('selected', element === button); });
      intermission.querySelector('[data-df-relic-choice]').textContent = `${button.querySelector('strong').textContent} joins the expedition.`;
      tone(660, .18, 'triangle', .04); intermission.querySelector('[data-df-action="continue"]').focus({ preventScroll: true });
    }
    function startFinale() {
      if (destroyed || runEnded || finale || !nocturne()) return;
      finale = { phase: 0, puzzle: null, entries: [], moves: 0, countdown: 6, blockedRow: -1, interference: 0, wards: 0, penalty: 0 };
      finaleLayer = document.createElement('div'); finaleLayer.className = 'df-finale'; finaleLayer.setAttribute('role', 'dialog'); finaleLayer.setAttribute('aria-modal', 'true'); finaleLayer.setAttribute('aria-label', 'The Nocturne Engine finale');
      container.querySelector('.df-board-frame').classList.add('has-finale');
      container.querySelector('.df-board-frame').appendChild(finaleLayer); board.inert = true; finaleLayer.inert = paused;
      buildFinalePhase();
    }
    function buildFinalePhase() {
      if (!finale || !finaleLayer) return;
      finale.puzzle = finalePuzzle(roundSeed, finale.phase); finale.entries = Array(finale.puzzle.size * finale.puzzle.size).fill(-1);
      finale.moves = 0; finale.countdown = 6; finale.blockedRow = -1;
      const names = ['The Ivory Schematic', 'The Oxblood Conjunction', 'The Nocturne Heart'];
      const descriptions = [
        'Mark every ember and quiet socket. Row and column numbers are exact ember totals; subset deductions apply just as they did on the chart.',
        'The second plate adds two exact diagonal totals. Use their intersections with rows and columns; no trial guess is required.',
        'The heart is a four-by-four proof. Socket changes advance its visible interference countdown. Ward at two moves or fewer to prevent a row lock; a locked row can always be Warded.',
      ];
      finaleLayer.innerHTML = `<p class="df-kicker">FINAL MOVEMENT · PLATE ${finale.phase + 1} / 3</p><h3>${names[finale.phase]}</h3><p class="df-finale-intro">${descriptions[finale.phase]}</p><div class="df-finale-layout"><div class="df-finale-grid" style="--ff-size:${finale.puzzle.size}" role="group" aria-label="Logical engine plate">${finale.entries.map((_, p) => `<button type="button" class="df-finale-cell" data-df-finale-cell="${p}" data-state="unknown" aria-pressed="false">·</button>`).join('')}</div><div class="df-finale-clues"><div><b>ROW EMBERS</b> · ${finale.puzzle.rows.map((value, i) => `${i + 1}: ${value}`).join(' · ')}</div><div><b>COLUMN EMBERS</b> · ${finale.puzzle.columns.map((value, i) => `${i + 1}: ${value}`).join(' · ')}</div>${finale.puzzle.diagonals.length ? `<div><b>DIAGONALS</b> · falling ${finale.puzzle.diagonals[0]} · rising ${finale.puzzle.diagonals[1]}</div>` : ''}<p>Click / Enter: unknown → ember → quiet → unknown. Arrow keys move between sockets.</p></div></div><p class="df-finale-ledger" data-df-finale-ledger></p><p class="df-finale-status" data-df-finale-status role="status">Read the exact totals. Every socket must be marked before the plate can seal.</p><div class="df-finale-actions"><button type="button" data-df-action="finale-ward" ${finale.phase < 2 ? 'hidden' : ''}>◇ WARD INTERFERENCE · W</button><button type="button" class="df-finale-submit" data-df-action="finale-submit">SEAL THIS PLATE</button></div>`;
      finaleLayer.dataset.phase = String(finale.phase + 1); finaleLayer.dataset.size = String(finale.puzzle.size);
      finaleLayer.dataset.rows = finale.puzzle.rows.join(','); finaleLayer.dataset.columns = finale.puzzle.columns.join(','); finaleLayer.dataset.diagonals = finale.puzzle.diagonals.join(',');
      refreshFinale(); finaleLayer.querySelector('[data-df-finale-cell]')?.focus({ preventScroll: true });
    }
    function refreshFinale(message) {
      if (!finale || !finaleLayer) return;
      finaleLayer.querySelectorAll('[data-df-finale-cell]').forEach(button => {
        const p = Number(button.dataset.dfFinaleCell), value = finale.entries[p], row = Math.floor(p / finale.puzzle.size);
        button.dataset.state = value === 1 ? 'live' : value === 0 ? 'quiet' : 'unknown'; button.textContent = value === 1 ? '✹' : value === 0 ? '◇' : '·';
        button.setAttribute('aria-pressed', String(value === 1)); button.setAttribute('aria-label', `Row ${row + 1}, column ${p % finale.puzzle.size + 1}: ${value === 1 ? 'ember' : value === 0 ? 'quiet' : 'unknown'}`);
        button.disabled = paused || row === finale.blockedRow;
      });
      const ward = finaleLayer.querySelector('[data-df-action="finale-ward"]');
      if (ward) ward.disabled = paused || finale.phase < 2 || (finale.blockedRow < 0 && finale.countdown > 2);
      const submit = finaleLayer.querySelector('[data-df-action="finale-submit"]'); if (submit) submit.disabled = paused;
      finaleLayer.inert = paused; finaleLayer.dataset.paused = String(paused);
      finaleLayer.querySelector('[data-df-finale-ledger]').textContent = `FOCUS ${focus} · ${finale.phase === 2 ? finale.blockedRow >= 0 ? `ROW ${finale.blockedRow + 1} LOCKED` : `INTERFERENCE IN ${finale.countdown} MOVES` : 'PLATE STABLE'}`;
      finaleLayer.dataset.countdown = String(finale.countdown); finaleLayer.dataset.blockedRow = String(finale.blockedRow); finaleLayer.dataset.moves = String(finale.moves); finaleLayer.dataset.wards = String(finale.wards);
      if (paused) finaleLayer.querySelector('[data-df-finale-status]').textContent = 'Instruments locked. Press P or choose Resume; no finale action can change the plate while paused.';
      else if (message) finaleLayer.querySelector('[data-df-finale-status]').textContent = message;
      else if (finale.blockedRow >= 0) finaleLayer.querySelector('[data-df-finale-status]').textContent = `Row ${finale.blockedRow + 1} is locked by interference. Ward it to continue; no solution information has changed.`;
      else if (finale.phase === 2 && finale.countdown <= 2) finaleLayer.querySelector('[data-df-finale-status]').textContent = `Interference is telegraphed in ${finale.countdown} socket moves. Ward now or clear the resulting row lock afterward.`;
      else finaleLayer.querySelector('[data-df-finale-status]').textContent = 'Read the exact totals. Every socket must be marked before the plate can seal.';
    }
    function turnFinaleCell(p) {
      if (paused || destroyed || runEnded || !finale || !finaleLayer || p < 0 || p >= finale.entries.length) return;
      const row = Math.floor(p / finale.puzzle.size); if (row === finale.blockedRow) return;
      finale.entries[p] = finale.entries[p] < 0 ? 1 : finale.entries[p] === 1 ? 0 : -1; finale.moves++;
      if (finale.phase === 2 && finale.blockedRow < 0) {
        finale.countdown--;
        if (finale.countdown <= 0) { finale.blockedRow = finale.interference++ % finale.puzzle.size; finale.countdown = 6; tone(120, .18, 'triangle', .035); }
      }
      refreshFinale();
    }
    function wardFinale() {
      if (paused || destroyed || runEnded || !finale || finale.phase !== 2 || (finale.blockedRow < 0 && finale.countdown > 2)) return;
      if (focus > 0) focus--; else { scorePenalty += 100; finale.penalty += 100; }
      finale.blockedRow = -1; finale.countdown = 6; finale.wards++; wardsUsed++; totalWards++;
      refreshFinale(`The Ward restores every row. ${focus} Focus remains; the engine’s clues are unchanged.`);
    }
    function submitFinale() {
      if (paused || destroyed || runEnded || !finale || !finaleLayer) return;
      if (finale.blockedRow >= 0) { refreshFinale(`Row ${finale.blockedRow + 1} is still interfered. Ward the lock before sealing this plate.`); return; }
      if (finale.entries.some(value => value < 0)) { refreshFinale('Some sockets are still unknown. Mark each as ember or quiet before sealing.'); return; }
      const size = finale.puzzle.size, groups = [];
      finale.puzzle.rows.forEach((value, y) => groups.push({ label: `Row ${y + 1}`, value, cells: Array.from({ length: size }, (_, x) => y * size + x) }));
      finale.puzzle.columns.forEach((value, x) => groups.push({ label: `Column ${x + 1}`, value, cells: Array.from({ length: size }, (_, y) => y * size + x) }));
      if (finale.puzzle.diagonals.length) {
        groups.push({ label: 'Falling diagonal', value: finale.puzzle.diagonals[0], cells: Array.from({ length: size }, (_, i) => i * size + i) });
        groups.push({ label: 'Rising diagonal', value: finale.puzzle.diagonals[1], cells: Array.from({ length: size }, (_, i) => i * size + size - 1 - i) });
      }
      const mismatch = groups.find(group => group.cells.reduce((sum, p) => sum + (finale.entries[p] === 1), 0) !== group.value);
      if (mismatch) {
        const actual = mismatch.cells.reduce((sum, p) => sum + (finale.entries[p] === 1), 0);
        refreshFinale(`${mismatch.label} currently holds ${actual} embers; its visible clue requires ${mismatch.value}. Recheck its intersections.`); tone(170, .08, 'triangle', .025); return;
      }
      runScore += 500 + finale.phase * 250; motif([330, 440, 660]);
      if (finale.phase < 2) { finale.phase++; buildFinalePhase(); return; }
      const wards = finale.wards, finalePenalty = finale.penalty; finaleLayer.remove(); finaleLayer = null; finale = null; board.inert = false; won = true;
      container.querySelector('.df-board-frame').classList.remove('has-finale');
      runScore += Math.max(0, 800 - finalePenalty); updateHUD(`The Nocturne Engine is sealed by visible logic. ${wards} final Ward${wards === 1 ? '' : 's'} used.`);
      emitEnd(true);
    }
    function advance() {
      if (!intermission) return;
      intermission.remove(); intermission = null;
      stage++; intermissionDrafted = false;
      setupRound(false);
    }
    function setupRound(fresh = false, same = false) {
      if (destroyed) return;
      const generation = ++roundGeneration;
      clearHold(); container.querySelector('.df-intermission')?.remove(); container.querySelector('.df-finale')?.remove(); finale = null; finaleLayer = null;
      if (fresh) {
        stage = 0; chartsCleared = 0; runScore = 0; totalElapsed = 0; totalHints = 0; totalProofs = 0; hintBonus = 0; aegis = 0; echoOpen = false; stillpoint = false; wardBonus = 0; expeditionSeals = 0; totalWards = 0;
        if (veteran && mode === 'campaign') campaign[campaign.length - 1] = 'cathedral';
        runSeed = mode === 'daily' && Number.isInteger(options.seed) ? options.seed >>> 0 : freshSeed();
      }
      // A same-chart retry restores the ledger to chart entry. Provisional seal,
      // rift and score rewards from the abandoned attempt cannot be farmed.
      if (same) runScore = roundStartScore; else roundStartScore = runScore;
      if (!same && !fresh && stage > 0) runSeed = (runSeed + 0x9e3779b9 + stage * 977) >>> 0;
      if (same) { /* The exact round seed and first-click layout are retained. */ }
      else if (fresh || stage === 0) roundSeed = runSeed;
      else roundSeed = (runSeed ^ Math.imul(stage + 1, 0x45d9f3b)) >>> 0;
      gameplayRandom = random(roundSeed ^ 0x9e3779b9); fxRandom = random(roundSeed ^ 0x51f15e);
      config = roundConfig();
      if (mode === 'campaign') presetId = campaign[Math.min(stage, campaign.length - 1)];
      if (!same) { initialSafe = -1; chartLines = []; chartSeals = []; surveyPins = []; layoutSeed = roundSeed; solutionSteps = 0; }
      grid = same && initialSafe >= 0 ? createGrid(initialSafe) : null;
      sealsFound = new Set(); hazards = []; eventStage = 0; focus = 1 + wardBonus; integrity = 3; wardsUsed = 0; riftsSealed = 0; scorePenalty = 0; objectivePaid = false;
      hintsLeft = config.hints; hintsUsed = 0; proofsUsed = 0; shieldsUsed = 0; stillpointReady = stillpoint; started = false; paused = false; roundOver = false; won = false;
      elapsedBefore = 0; startedAt = 0; intermission = null; intermissionDrafted = false; inputMode = 'reveal';
      container.querySelector('.df-board-frame').classList.remove('has-result', 'has-finale');
      board.classList.remove('is-won'); pauseBadge.hidden = true; board.inert = false;
      container.querySelector('[data-df-action="pause"]').textContent = 'Ⅱ Pause'; container.querySelector('[data-df-action="pause"]').setAttribute('aria-pressed', 'false');
      renderPresets(); buildBoard(); setInputMode('reveal');
      if (nocturne()) container.querySelector('[data-df-event]').textContent = 'Public canticles appear after the first reveal. Three deterministic chart events telegraph safe rifts; no hidden cell becomes a nova.';
      announce(nocturne() ? `${config.name}: ${config.cols} × ${config.rows}, ${config.mines} novae. Recover three seals and chart every safe sector. Row/column canticles are exact public clues; this layout carries a no-guess solver certificate. ${focus} Focus and ${integrity} integrity.` : `${config.name}: ${config.cols} × ${config.rows}, ${config.mines} novae. First reveal is protected. ${hintsLeft} Oracle charge${hintsLeft === 1 ? '' : 's'}.${config.flagLimit ? ` Only ${config.flagLimit} hand-placed flags; recall one to move it.` : ''}${stillpointReady ? ' Stillpoint is charged.' : ''}`);
      updateHUD();
      if (echoOpen && chartsCleared > 0) after(() => {
        if (generation !== roundGeneration || roundOver || paused) return;
        let target = Math.floor(gridLength() / 2);
        if (grid) {
          const candidates = grid.map((value, p) => value >= 0 && !revealed.has(p) && !flagged.has(p) ? p : -1).filter(p => p >= 0);
          if (!candidates.length) return;
          if (grid[target] < 0 || revealed.has(target) || flagged.has(target)) target = candidates[0];
        } else if (flagged.has(target) || revealed.has(target)) target = cells.findIndex((_, p) => !flagged.has(p) && !revealed.has(p));
        if (target >= 0) reveal(target, { automatic: true });
      }, reduced() ? 0 : 260);
    }
    function startNewExpedition(id = presetId) {
      if (mode === 'endless' && Object.hasOwn(PRESETS, id) && (veteran || !PRESETS[id].veteran)) { presetId = id; saveSettings(); }
      setupRound(true);
    }
    function emitEnd(success) {
      if (destroyed || callbackFired) return;
      callbackFired = true; runEnded = true; clearHold(); abort.abort();
      timers.forEach(timer => { clearTimeout(timer); clearInterval(timer); }); timers.clear();
      const detail = nocturne() && success ? `Nocturne Engine sealed · ${chartsCleared} proof-certified charts · ${expeditionSeals} ivory seals · ${totalWards} Wards · ${formatTime(totalElapsed / 1000)} charting time` : `${chartsCleared} chart${chartsCleared === 1 ? '' : 's'} sealed · ${formatTime(totalElapsed / 1000)} active time · ${totalHints} Oracle charge${totalHints === 1 ? '' : 's'} used${totalProofs ? ` · ${totalProofs} logical proof${totalProofs === 1 ? '' : 's'}` : ''}`;
      audio?.close().catch(() => {});
      onEnd({ won: success, score: Math.max(0, Math.round(runScore)), detail, charts: chartsCleared, time: Math.floor(totalElapsed / 1000), expedition: nocturne() ? 'nocturne' : 'standard' });
    }
    function clearHold() {
      if (longPress) { clearTimeout(longPress.timer); holds.delete(longPress.timer); longPress = null; }
    }
    function primary(cell) {
      const p = Number(cell.dataset.cell);
      if (inputMode === 'ward') wardCell(p);
      else if (inputMode === 'flag' && !revealed.has(p)) mark(p); else reveal(p);
    }

    listen('click', event => {
      const requestedAction = event.target.closest('[data-df-action]')?.dataset.dfAction;
      if (paused && requestedAction !== 'pause') { event.preventDefault(); return; }
      const cell = event.target.closest('.deepfield-cell');
      if (cell && board.contains(cell)) {
        if ((performance.now() < suppressClick.until && Number(cell.dataset.cell) === suppressClick.index) || paused || roundOver) { event.preventDefault(); return; }
        setCursor(Number(cell.dataset.cell)); primary(cell); return;
      }
      const finaleCell = event.target.closest('[data-df-finale-cell]'); if (finaleCell && finaleLayer?.contains(finaleCell)) { turnFinaleCell(Number(finaleCell.dataset.dfFinaleCell)); return; }
      const route = event.target.closest('[data-df-route]'); if (route) { chooseRoute(route.dataset.dfRoute); return; }
      const relic = event.target.closest('[data-df-relic]'); if (relic) { draftRelic(relic.dataset.dfRelic, relic); return; }
      const preset = event.target.closest('[data-df-preset]'); if (preset && mode === 'endless' && !roundOver) { startNewExpedition(preset.dataset.dfPreset); return; }
      const action = event.target.closest('[data-df-action]')?.dataset.dfAction; if (!action) return;
      if (roundOver && !['continue', 'sound', 'pause', 'finale-submit', 'finale-ward'].includes(action)) return;
      if (action === 'finale-submit') submitFinale();
      else if (action === 'finale-ward') wardFinale();
      else if (action === 'hint') hint();
      else if (action === 'proof-safe') proof('safe');
      else if (action === 'proof-mine') proof('mines');
      else if (action === 'pause') paused ? resume() : pause();
      else if (action === 'sound') { soundOn = !soundOn; const button = container.querySelector('[data-df-action="sound"]'); button.textContent = soundOn ? 'Sound on' : 'Sound off'; button.setAttribute('aria-pressed', String(soundOn)); saveSettings(); if (soundOn) tone(440); }
      else if (action === 'reveal-mode') setInputMode('reveal');
      else if (action === 'flag-mode') setInputMode('flag');
      else if (action === 'ward-mode') setInputMode('ward');
      else if (action === 'zoom-in') setZoom(zoom + .25);
      else if (action === 'zoom-out') setZoom(zoom - .25);
      else if (action === 'retry' && !runEnded) setupRound(false, true);
      else if (action === 'fresh' && !runEnded) startNewExpedition();
      else if (action === 'continue') advance();
    });
    listen('contextmenu', event => {
      const cell = event.target.closest('.deepfield-cell'); if (!cell || !board.contains(cell)) return;
      event.preventDefault(); if (paused || roundOver) return;
      setCursor(Number(cell.dataset.cell)); mark(Number(cell.dataset.cell));
    });
    listen('pointerdown', event => {
      const cell = event.target.closest('.deepfield-cell');
      if (!cell || event.pointerType === 'mouse' || paused || roundOver) return;
      clearHold(); const p = Number(cell.dataset.cell);
      const timer = setTimeout(() => {
        holds.delete(timer); longPress = null; suppressClick = { index: p, until: performance.now() + 650 };
        if (!destroyed && !paused && !roundOver) { mark(p, false); if (navigator.vibrate) navigator.vibrate(20); }
      }, 480);
      holds.add(timer); longPress = { timer, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    });
    listen('pointermove', event => { if (longPress && Math.hypot(event.clientX - longPress.x, event.clientY - longPress.y) > 12) clearHold(); });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) listen(type, clearHold);
    listen('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === 'p' && event.target.closest('.df-console')) { event.preventDefault(); paused ? resume() : pause({ focusResume: true }); return; }
      if (finale && event.target.closest('.df-finale')) {
        if (paused) { event.preventDefault(); return; }
        if (key === 'w') { event.preventDefault(); wardFinale(); return; }
        const current = event.target.closest('[data-df-finale-cell]');
        if (current && event.key.startsWith('Arrow')) {
          event.preventDefault(); const p = Number(current.dataset.dfFinaleCell), size = finale.puzzle.size;
          const next = event.key === 'ArrowLeft' ? Math.max(0, p - 1) : event.key === 'ArrowRight' ? Math.min(finale.entries.length - 1, p + 1) : event.key === 'ArrowUp' ? Math.max(0, p - size) : Math.min(finale.entries.length - 1, p + size);
          finaleLayer.querySelector(`[data-df-finale-cell="${next}"]`)?.focus({ preventScroll: true });
        }
        return;
      }
      if (paused || roundOver || (!event.target.closest('.deepfield-grid') && !event.target.closest('.deepfield-cell'))) return;
      const cell = event.target.closest('.deepfield-cell');
      if (key === 'r') { event.preventDefault(); setupRound(false, true); return; }
      if (key === 'h') { event.preventDefault(); hint(); return; }
      if (veteran && key === 'd') { event.preventDefault(); proof('safe'); return; }
      if (veteran && key === 'v') { event.preventDefault(); proof('mines'); return; }
      if (nocturne() && key === 'w') { event.preventDefault(); wardCell(cursor); return; }
      if (key === 't') { event.preventDefault(); setInputMode(inputMode === 'reveal' ? 'flag' : nocturne() && inputMode === 'flag' ? 'ward' : 'reveal'); return; }
      if (!cell) {
        if (event.key.startsWith('Arrow')) { event.preventDefault(); setCursor(cursor, true); }
        return;
      }
      const p = Number(cell.dataset.cell); let next = p;
      if (event.key === 'ArrowLeft') next = p % config.cols ? p - 1 : p;
      else if (event.key === 'ArrowRight') next = p % config.cols < config.cols - 1 ? p + 1 : p;
      else if (event.key === 'ArrowUp') next = Math.max(0, p - config.cols);
      else if (event.key === 'ArrowDown') next = Math.min(gridLength() - 1, p + config.cols);
      else if (event.key === 'Home') next = event.ctrlKey ? 0 : p - p % config.cols;
      else if (event.key === 'End') next = event.ctrlKey ? gridLength() - 1 : p + config.cols - 1 - p % config.cols;
      else if (key === 'f') { event.preventDefault(); mark(p, false); return; }
      else if (key === 'q') { event.preventDefault(); mark(p); return; }
      else if (key === 'c') { event.preventDefault(); chord(p); return; }
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); primary(cell); return; }
      else return;
      event.preventDefault(); setCursor(next, true);
    });
    window.addEventListener('blur', pause, { signal: abort.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, { signal: abort.signal });
    const ticker = setInterval(() => { if (!destroyed && started && !paused && !roundOver) updateHUD(); }, 250);
    timers.add(ticker); // clearInterval and clearTimeout share IDs in browsers.

    setupRound(false);
    return {
      canvas: board, pause, resume,
      get paused() { return paused; },
      get board() { return board; },
      snapshot() { return { grid: grid?.slice() || null, config: { ...config }, revealed: [...revealed], flagged: [...flagged], questioned: [...questioned], proofMarks: [...proofMarks], hintsLeft, proofsUsed, seed: roundSeed, stage, chartsCleared, score: runScore, roundStartScore, mode, stillpointReady, route: campaign[Math.min(stage, campaign.length - 1)], signature: signature(), nocturne: nocturne(), layoutSeed, solutionSteps, lines: chartLines.map(line => ({ label: line.label, value: line.value, cells: line.cells.slice() })), seals: chartSeals.slice(), sealsFound: [...sealsFound], surveyPins: surveyPins.slice(), hazards: hazards.map(hazard => ({ ...hazard })), focus, integrity, wardsUsed, totalWards, riftsSealed, scorePenalty, finale: finale ? { phase: finale.phase, size: finale.puzzle.size, rows: finale.puzzle.rows.slice(), columns: finale.puzzle.columns.slice(), diagonals: finale.puzzle.diagonals.slice(), entries: finale.entries.slice(), countdown: finale.countdown, blockedRow: finale.blockedRow } : null }; },
      destroy() {
        if (destroyed) return;
        destroyed = true; clearHold(); abort.abort();
        timers.forEach(timer => { clearTimeout(timer); clearInterval(timer); }); timers.clear();
        audio?.close().catch(() => {}); container.classList.remove('deepfield-board'); container.replaceChildren();
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      },
    };
  }

  return { create, generate, generateNocturne, auditNocturne, canticles, solveFinale, finalePuzzle, flood, neighbours, deduce, PRESETS, CAMPAIGN, NOCTURNE_CHARTS };
})();
