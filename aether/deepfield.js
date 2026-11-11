'use strict';

// Deep Field: deterministic, DOM-based Minesweeper. Rules are synchronous;
// animation is cosmetic and never changes the board or consumes gameplay RNG.
window.AetherDeepField = (() => {
  const SETTINGS_KEY = 'aether-deep-field-settings-v1';
  const PRESETS = Object.freeze({
    apprentice: Object.freeze({ name: 'Apprentice', subtitle: 'A gentle firmament', cols: 9, rows: 9, mines: 10, hints: 2 }),
    navigator: Object.freeze({ name: 'Navigator', subtitle: 'The cartographer’s chart', cols: 12, rows: 10, mines: 22, hints: 2 }),
    eclipse: Object.freeze({ name: 'Eclipse', subtitle: 'A crowded occultation', cols: 16, rows: 12, mines: 42, hints: 1 }),
  });
  const CAMPAIGN = ['apprentice', 'navigator', 'eclipse'];
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

  function readSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
      return { sound: value.sound !== false, preset: Object.hasOwn(PRESETS, value.preset) ? value.preset : 'navigator', zoom: clamp(Number(value.zoom) || 1, 1, 1.75) };
    } catch { return { sound: true, preset: 'navigator', zoom: 1 }; }
  }

  function create(container, options = {}) {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const abort = new AbortController(), timers = new Set(), holds = new Set();
    const settings = readSettings(), reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mode = options.campaign ? 'campaign' : options.daily ? 'daily' : options.endless ? 'endless' : 'trial', veteran = options.veteran === true;
    const verbs = options.verbs || new Set(), onEnd = typeof options.onEnd === 'function' ? options.onEnd : () => {};
    let soundOn = options.sound === false ? false : settings.sound;
    let audio = null, audioGain = null, destroyed = false, callbackFired = false;
    let presetId = mode === 'trial' ? 'apprentice' : mode === 'daily' ? 'navigator' : settings.preset;
    let runSeed = Number.isInteger(options.seed) ? options.seed >>> 0 : freshSeed();
    let gameplayRandom = random(runSeed ^ 0x9e3779b9), fxRandom = random(runSeed ^ 0x51f15e);
    let stage = 0, chartsCleared = 0, runScore = 0, totalElapsed = 0, totalHints = 0, hintBonus = 0, aegis = 0, echoOpen = false;
    let config, grid = null, roundSeed, initialSafe = -1, revealed, flagged, questioned, cells = [];
    let started = false, paused = false, roundOver = false, runEnded = false, won = false, elapsedBefore = 0, startedAt = 0;
    let hintsLeft = 0, hintsUsed = 0, shieldsUsed = 0, inputMode = 'reveal', cursor = 0, zoom = settings.zoom, intermissionDrafted = false, roundGeneration = 0;
    let board, status, effectLayer, pauseBadge, intermission = null, longPress = null, suppressClick = { index: -1, until: 0 };

    const after = (callback, delay) => {
      const timer = setTimeout(() => { timers.delete(timer); if (!destroyed) callback(); }, delay);
      timers.add(timer); return timer;
    };
    const listen = (type, callback, eventOptions = {}) => container.addEventListener(type, callback, { ...eventOptions, signal: abort.signal });
    const elapsed = () => elapsedBefore + (started && !paused && !roundOver ? performance.now() - startedAt : 0);
    const seconds = () => Math.floor(elapsed() / 1000);
    const roundConfig = () => {
      const base = PRESETS[mode === 'campaign' ? CAMPAIGN[Math.min(stage, CAMPAIGN.length - 1)] : presetId];
      const tune = config => ({ ...config, mines: veteran ? Math.min(Math.floor(config.cols * config.rows * .28), Math.ceil(config.mines * 1.2)) : config.mines, hints: Math.max(0, config.hints + hintBonus - (veteran ? 1 : 0)) });
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
    container.innerHTML = `<section class="df-console" aria-label="Deep Field Minesweeper">
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
      <div class="df-tools" aria-label="Survey controls">
        <div class="df-input-mode" role="group" aria-label="Touch input mode"><button type="button" data-df-action="reveal-mode" aria-pressed="true">◎ Reveal</button><button type="button" data-df-action="flag-mode" aria-pressed="false">⚑ Flag</button></div>
        <button type="button" data-df-action="hint" title="Reveal one safe sector; reduces the time bonus">✧ Oracle <span data-df-hints></span></button>
        <button type="button" data-df-action="pause" aria-pressed="false">Ⅱ Pause</button>
        <button type="button" data-df-action="sound" aria-pressed="${soundOn}">${soundOn ? 'Sound on' : 'Sound off'}</button>
        <span class="df-tool-spacer"></span>
        <button type="button" data-df-action="zoom-out" aria-label="Zoom board out">−</button><output data-df-zoom aria-label="Board zoom">${Math.round(zoom * 100)}%</output><button type="button" data-df-action="zoom-in" aria-label="Zoom board in">+</button>
      </div>
      <p class="df-status" data-df-status role="status" aria-live="polite"></p>
      <div class="df-board-frame"><div class="df-board-scroll"><div class="deepfield-grid" tabindex="0" role="group"></div></div><div class="df-effects" aria-hidden="true"></div><div class="df-paused" data-df-paused hidden><span>❚❚</span><strong>The instruments are covered.</strong><small>Press P or choose Resume.</small></div></div>
      <div class="df-round-actions"><button type="button" class="df-text-button" data-df-action="retry">↶ Retry this chart <kbd>R</kbd></button><button type="button" class="df-text-button" data-df-action="fresh">✦ New expedition</button></div>
      <details class="df-manual"><summary>Field manual &amp; controls</summary><div><p><b>Reveal</b> every safe sector. A number counts novae in the eight neighbouring sectors. Your first reveal and its neighbours are always safe.</p><p><b>Chord:</b> when a revealed number has that many flags around it, activate the number again to reveal its other neighbours. Incorrect flags can still cost the run.</p><p><b>Mouse:</b> click reveal · right-click flag / question / clear · click a number to chord.<br><b>Touch:</b> tap reveal · hold to flag · or use the Reveal / Flag mode buttons.<br><b>Keyboard:</b> arrows move · Enter / Space reveal · F flag · Q question · C chord · H oracle · T input mode · P pause · R retry.</p><p>The Oracle reveals a safe sector but lowers your score bonus. Campaign relics persist for the current expedition. Zoom never changes the underlying chart.</p></div></details>
      <p class="df-accessible-help" id="df-help">Deep Field Minesweeper. Reveal every safe sector and mark the novae. Use arrow keys to move between sectors; the field manual lists every command.</p>
    </section>`;
    board = container.querySelector('.deepfield-grid'); status = container.querySelector('[data-df-status]');
    effectLayer = container.querySelector('.df-effects'); pauseBadge = container.querySelector('[data-df-paused]');
    board.setAttribute('aria-describedby', 'df-help');

    function renderPresets() {
      const strip = container.querySelector('.df-presets');
      if (mode === 'trial') { strip.hidden = true; return; }
      strip.hidden = false;
      if (mode === 'campaign' || mode === 'daily') {
        strip.innerHTML = `<span class="df-route-label">${mode === 'daily' ? 'DAILY VIGIL · FIXED NAVIGATOR CHART' : 'THE THREE OCCULTATIONS'}</span><div class="df-route">${(mode === 'campaign' ? CAMPAIGN : ['navigator']).map((id, i) => `<span class="${i === stage ? 'current' : i < stage ? 'passed' : ''}">${i < stage ? '✓' : ['Ⅰ', 'Ⅱ', 'Ⅲ'][i]} ${PRESETS[id].name}<small>${PRESETS[id].cols} × ${PRESETS[id].rows} · ${PRESETS[id].mines} novae</small></span>`).join('')}</div>`;
      } else {
        strip.innerHTML = `<span class="df-route-label">CHOOSE A BOARD CLASS · CHANGING IT STARTS A NEW EXPEDITION</span><div class="df-preset-buttons">${Object.entries(PRESETS).map(([id, preset]) => `<button type="button" data-df-preset="${id}" aria-pressed="${id === presetId}"><strong>${preset.name}</strong><small>${preset.cols} × ${preset.rows} · ${preset.mines} novae</small></button>`).join('')}</div>`;
      }
    }
    function describeCell(p) {
      const coordinate = `${String.fromCharCode(65 + p % config.cols)}${Math.floor(p / config.cols) + 1}`;
      if (revealed.has(p)) return `${coordinate}: ${grid[p] < 0 ? 'nova' : grid[p] ? `${grid[p]} adjacent novae; activate to chord` : 'clear'}`;
      if (flagged.has(p)) return `${coordinate}: flagged`;
      if (questioned.has(p)) return `${coordinate}: question marked`;
      return `${coordinate}: uncharted`;
    }
    function syncCell(p) {
      const cell = cells[p]; if (!cell) return;
      const isRevealed = revealed.has(p), isFlagged = flagged.has(p), isQuestioned = questioned.has(p);
      cell.classList.toggle('revealed', isRevealed); cell.classList.toggle('flagged', isFlagged); cell.classList.toggle('questioned', isQuestioned);
      cell.dataset.state = isRevealed ? 'revealed' : isFlagged ? 'flagged' : isQuestioned ? 'questioned' : 'hidden';
      cell.setAttribute('aria-label', describeCell(p));
      if (isRevealed) {
        cell.textContent = grid[p] < 0 ? '✹' : grid[p] || '';
        if (grid[p] > 0) cell.dataset.count = grid[p]; else delete cell.dataset.count;
      } else { cell.textContent = isFlagged ? '⚑' : isQuestioned ? '?' : ''; delete cell.dataset.count; }
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
      board.dataset.mines = String(config.mines); board.dataset.gridSignature = signature(); board.dataset.mode = mode;
      board.setAttribute('aria-label', `${config.name} Deep Field: ${config.cols} columns by ${config.rows} rows, ${config.mines} novae. Arrow keys move; Enter reveals; F flags.`);
      board.setAttribute('aria-rowcount', config.rows); board.setAttribute('aria-colcount', config.cols);
      board.innerHTML = '';
      cells = Array.from({ length: config.cols * config.rows }, (_, p) => {
        const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'deepfield-cell';
        cell.dataset.cell = String(p); cell.style.setProperty('--deal', Math.min(30, p % config.cols + Math.floor(p / config.cols)));
        cell.tabIndex = p === 0 ? 0 : -1; board.appendChild(cell); return cell;
      });
      revealed = new Set(); flagged = new Set(); questioned = new Set(); cursor = 0;
      cells.forEach((_, p) => syncCell(p));
      if (oldActive?.closest?.('.deepfield-grid') || oldActive === board) board.focus({ preventScroll: true });
      updateHUD();
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
      container.querySelector('[data-df-hints]').textContent = `(${hintsLeft})`;
      container.querySelector('[data-df-action="hint"]').disabled = hintsLeft <= 0 || roundOver || paused;
      container.querySelector('[data-df-action="retry"]').disabled = roundOver;
      container.querySelector('[data-df-action="fresh"]').disabled = roundOver;
      container.querySelectorAll('[data-df-preset]').forEach(button => { button.disabled = roundOver; });
      container.querySelector('[data-df-mode]').textContent = mode === 'campaign' ? `CAMPAIGN · CHART ${stage + 1} / ${CAMPAIGN.length}` : mode === 'daily' ? 'DAILY VIGIL · ONE SHARED SKY' : mode === 'endless' ? `ENDLESS EXPEDITION · CHART ${stage + 1}` : 'GRAND TOUR · SINGLE SURVEY';
      container.querySelector('[data-df-seed]').textContent = `SEED ${String(roundSeed).padStart(10, '0')}`;
      board.dataset.revealed = String(charted); board.dataset.flags = String(flagged.size); board.dataset.questions = String(questioned.size);
      board.dataset.hints = String(hintsUsed); board.dataset.aegis = String(aegis); board.dataset.score = String(Math.round(runScore));
      board.dataset.started = String(started); board.dataset.over = String(roundOver); board.dataset.won = String(won);
      board.dataset.gridSignature = signature(); board.dataset.paused = String(paused); board.dataset.zoom = zoom.toFixed(2);
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
      inputMode = value;
      container.querySelector('[data-df-action="reveal-mode"]').setAttribute('aria-pressed', String(value === 'reveal'));
      container.querySelector('[data-df-action="flag-mode"]').setAttribute('aria-pressed', String(value === 'flag'));
      announce(value === 'flag' ? 'Flag mode: taps cycle flag, question, and clear.' : 'Reveal mode: taps chart sectors. Hold a sector to flag it.');
    }
    function pause({ focusResume = false } = {}) {
      if (destroyed || paused || runEnded) return;
      freezeClock(); paused = true; board.inert = true; pauseBadge.hidden = false;
      const button = container.querySelector('[data-df-action="pause"]'); button.textContent = '▶ Resume'; button.setAttribute('aria-pressed', 'true');
      if (focusResume) button.focus({ preventScroll: true });
      clearHold(); updateHUD('Survey paused. The active-time clock is stopped.');
    }
    function resume() {
      if (destroyed || !paused || runEnded) return;
      paused = false; startedAt = performance.now(); board.inert = false; pauseBadge.hidden = true;
      const button = container.querySelector('[data-df-action="pause"]'); button.textContent = 'Ⅱ Pause'; button.setAttribute('aria-pressed', 'false');
      updateHUD('Survey resumed.'); board.focus({ preventScroll: true });
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
    function mark(p, cycle = true) {
      if (roundOver || paused || revealed.has(p)) return;
      if (flagged.has(p)) { flagged.delete(p); if (cycle) questioned.add(p); }
      else if (questioned.has(p)) questioned.delete(p);
      else flagged.add(p);
      syncCell(p); tone(flagged.has(p) ? 510 : 310, .07, 'triangle', .035); burstAt(p, 'flag', 4);
      updateHUD(`${String.fromCharCode(65 + p % config.cols)}${Math.floor(p / config.cols) + 1}: ${flagged.has(p) ? 'nova marked' : questioned.has(p) ? 'uncertain' : 'mark cleared'}. ${config.mines - flagged.size} marks remain.`);
    }
    function ensureGrid(first) {
      if (grid) return;
      initialSafe = first;
      grid = generate({ ...config, seed: roundSeed, safeIndex: first }).grid;
      board.dataset.gridSignature = signature();
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
    function reveal(start, { automatic = false, hinted = false } = {}) {
      if (roundOver || paused || runEnded || start < 0 || start >= gridLength() || flagged.has(start)) return;
      if (revealed.has(start)) { chord(start); return; }
      if (!automatic) startClock();
      ensureGrid(start);
      if (grid[start] === -1) { hitNova(start); return; }
      const opening = flood(grid, config.cols, config.rows, start, flagged);
      const apply = entries => {
        for (const { index, wave } of entries) {
          if (revealed.has(index) || grid[index] < 0) continue;
          revealed.add(index); questioned.delete(index); syncCell(index);
          cells[index].style.setProperty('--wave', Math.min(14, wave));
          if (hinted && index === start) cells[index].classList.add('oracle-revealed');
        }
      };
      apply(opening);
      if (verbs.has('echo') && !automatic && gameplayRandom() < .2) {
        const extra = neighbours(start, config.cols, config.rows).find(p => !revealed.has(p) && !flagged.has(p) && grid[p] >= 0);
        if (extra !== undefined) { apply(flood(grid, config.cols, config.rows, extra, flagged)); announce('The Echo Lens finds a second clearing.'); }
      }
      if (verbs.has('parallax') && Math.floor(revealed.size / 5) > Math.floor((revealed.size - opening.length) / 5)) {
        const hidden = grid.map((value, p) => value === -1 && !flagged.has(p) && !revealed.has(p) ? p : -1).filter(p => p >= 0);
        if (hidden.length) { const p = hidden[Math.floor(gameplayRandom() * hidden.length)]; flagged.add(p); syncCell(p); announce('The Parallax Mirror marks a hiding nova.'); }
      }
      if (opening.length) { tone(270 + Math.min(5, grid[start]) * 55, .08, 'sine', .035); burstAt(start, hinted ? 'oracle' : 'reveal', Math.min(14, 4 + opening.length)); }
      const safe = config.cols * config.rows - config.mines;
      if (revealed.size >= safe) { finishRound(true); return; }
      updateHUD(hinted ? `The Oracle clears ${String.fromCharCode(65 + start % config.cols)}${Math.floor(start / config.cols) + 1}. ${hintsLeft} charge${hintsLeft === 1 ? '' : 's'} remain.` : `${revealed.size} / ${safe} safe sectors charted. ${config.mines - flagged.size} novae unmarked.`);
    }
    function gridLength() { return config.cols * config.rows; }
    function chord(index) {
      if (!grid || !revealed.has(index) || grid[index] <= 0 || roundOver || paused) return;
      const around = neighbours(index, config.cols, config.rows), marks = around.filter(p => flagged.has(p)).length;
      if (marks !== grid[index]) { announce(`This ${grid[index]} needs ${grid[index]} adjacent flag${grid[index] === 1 ? '' : 's'}; ${marks} placed.`); tone(180, .06, 'triangle', .025); return; }
      const targets = around.filter(p => !flagged.has(p) && !revealed.has(p));
      if (!targets.length) return;
      // Resolve the complete chord against the same committed flag state. A
      // wrong flag may detonate; later targets never reveal behind a dead run.
      for (const p of targets) { if (roundOver) break; reveal(p); }
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
    function roundValue(success) {
      const safe = config.cols * config.rows - config.mines;
      if (!success) return [...revealed].filter(p => grid[p] >= 0).length * 5;
      const timeBonus = Math.max(0, 2400 - seconds() * 12);
      return safe * 9 + config.mines * 38 + timeBonus + hintsLeft * 140 + chartsCleared * 250 - hintsUsed * 60 - shieldsUsed * 100;
    }
    function finishRound(success) {
      if (roundOver || runEnded) return;
      freezeClock(); roundOver = true; won = success; totalElapsed += elapsed(); elapsedBefore = 0;
      runScore += Math.max(0, Math.round(roundValue(success)));
      if (success) {
        chartsCleared++;
        grid.forEach((value, p) => { if (value === -1) { flagged.add(p); questioned.delete(p); syncCell(p); cells[p].classList.add('sealed-nova'); } });
        board.classList.add('is-won'); burstAt(Math.floor(gridLength() / 2), 'victory', 30); motif([392, 523.25, 659.25, 783.99]);
      }
      updateHUD(success ? `Chart sealed. ${formatTime(totalElapsed / 1000)} active time across the expedition.` : 'The survey is lost. Your partial chart remains in the ledger.');
      if (success && ((mode === 'campaign' && stage < CAMPAIGN.length - 1) || mode === 'endless')) after(showIntermission, reduced() ? 80 : 650);
      else after(() => emitEnd(success), reduced() ? 120 : 900);
    }
    function showIntermission() {
      if (destroyed || runEnded || intermission) return;
      intermission = document.createElement('div'); intermission.className = 'df-intermission';
      intermission.innerHTML = `<p class="df-kicker">CHART ${stage + 1} SEALED · ${runScore.toLocaleString()} POINTS</p><h3>Choose an instrument.</h3><p>One relic joins this expedition. Or continue with the instruments you already carry.</p><div class="df-relics"><button type="button" data-df-relic="lens"><span>✧</span><strong>Mercator’s Lens</strong><small>+1 Oracle charge on every later chart</small></button><button type="button" data-df-relic="aegis"><span>◈</span><strong>Aegis of Umbra</strong><small>Negate one nova and mark it safely</small></button><button type="button" data-df-relic="echo" ${echoOpen ? 'disabled' : ''}><span>◎</span><strong>Echo Sounder</strong><small>Open a safe clearing on every later chart</small></button></div><p class="df-relic-choice" data-df-relic-choice>No new instrument selected.</p><button type="button" class="df-continue" data-df-action="continue">Chart ${stage + 2} →</button>`;
      container.querySelector('.df-board-frame').appendChild(intermission); intermission.querySelector('[data-df-relic]:not(:disabled)')?.focus({ preventScroll: true });
    }
    function draftRelic(id, button) {
      if (intermissionDrafted || !intermission) return;
      intermissionDrafted = true;
      if (id === 'lens') hintBonus++;
      else if (id === 'aegis') aegis++;
      else if (id === 'echo') echoOpen = true;
      intermission.querySelectorAll('[data-df-relic]').forEach(element => { element.disabled = true; element.classList.toggle('selected', element === button); });
      intermission.querySelector('[data-df-relic-choice]').textContent = `${button.querySelector('strong').textContent} joins the expedition.`;
      tone(660, .18, 'triangle', .04); intermission.querySelector('[data-df-action="continue"]').focus({ preventScroll: true });
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
      clearHold(); container.querySelector('.df-intermission')?.remove();
      if (fresh) {
        stage = 0; chartsCleared = 0; runScore = 0; totalElapsed = 0; totalHints = 0; hintBonus = 0; aegis = 0; echoOpen = false;
        runSeed = mode === 'daily' && Number.isInteger(options.seed) ? options.seed >>> 0 : freshSeed();
      }
      if (!same && !fresh && stage > 0) runSeed = (runSeed + 0x9e3779b9 + stage * 977) >>> 0;
      if (same) { /* The exact round seed and first-click layout are retained. */ }
      else if (fresh || stage === 0) roundSeed = runSeed;
      else roundSeed = (runSeed ^ Math.imul(stage + 1, 0x45d9f3b)) >>> 0;
      gameplayRandom = random(roundSeed ^ 0x9e3779b9); fxRandom = random(roundSeed ^ 0x51f15e);
      config = roundConfig();
      if (mode === 'campaign') presetId = CAMPAIGN[Math.min(stage, CAMPAIGN.length - 1)];
      if (!same) initialSafe = -1;
      grid = same && initialSafe >= 0 ? generate({ ...config, seed: roundSeed, safeIndex: initialSafe }).grid : null;
      hintsLeft = config.hints; hintsUsed = 0; shieldsUsed = 0; started = false; paused = false; roundOver = false; won = false;
      elapsedBefore = 0; startedAt = 0; intermission = null; intermissionDrafted = false; inputMode = 'reveal';
      container.querySelector('.df-board-frame').classList.remove('has-result');
      board.classList.remove('is-won'); pauseBadge.hidden = true; board.inert = false;
      container.querySelector('[data-df-action="pause"]').textContent = 'Ⅱ Pause'; container.querySelector('[data-df-action="pause"]').setAttribute('aria-pressed', 'false');
      renderPresets(); buildBoard(); setInputMode('reveal');
      announce(`${config.name}: ${config.cols} × ${config.rows}, ${config.mines} novae. First reveal is protected. ${hintsLeft} Oracle charge${hintsLeft === 1 ? '' : 's'}.`);
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
      if (mode === 'endless' && Object.hasOwn(PRESETS, id)) { presetId = id; saveSettings(); }
      setupRound(true);
    }
    function emitEnd(success) {
      if (destroyed || callbackFired) return;
      callbackFired = true; runEnded = true; clearHold(); abort.abort();
      timers.forEach(timer => { clearTimeout(timer); clearInterval(timer); }); timers.clear();
      const detail = `${chartsCleared} chart${chartsCleared === 1 ? '' : 's'} sealed · ${formatTime(totalElapsed / 1000)} active time · ${totalHints} Oracle charge${totalHints === 1 ? '' : 's'} used`;
      audio?.close().catch(() => {});
      onEnd({ won: success, score: Math.max(0, Math.round(runScore)), detail, charts: chartsCleared, time: Math.floor(totalElapsed / 1000) });
    }
    function clearHold() {
      if (longPress) { clearTimeout(longPress.timer); holds.delete(longPress.timer); longPress = null; }
    }
    function primary(cell) {
      const p = Number(cell.dataset.cell);
      if (inputMode === 'flag' && !revealed.has(p)) mark(p); else reveal(p);
    }

    listen('click', event => {
      const cell = event.target.closest('.deepfield-cell');
      if (cell && board.contains(cell)) {
        if ((performance.now() < suppressClick.until && Number(cell.dataset.cell) === suppressClick.index) || paused || roundOver) { event.preventDefault(); return; }
        setCursor(Number(cell.dataset.cell)); primary(cell); return;
      }
      const relic = event.target.closest('[data-df-relic]'); if (relic) { draftRelic(relic.dataset.dfRelic, relic); return; }
      const preset = event.target.closest('[data-df-preset]'); if (preset && mode === 'endless' && !roundOver) { startNewExpedition(preset.dataset.dfPreset); return; }
      const action = event.target.closest('[data-df-action]')?.dataset.dfAction; if (!action) return;
      if (roundOver && !['continue', 'sound'].includes(action)) return;
      if (action === 'hint') hint();
      else if (action === 'pause') paused ? resume() : pause();
      else if (action === 'sound') { soundOn = !soundOn; const button = container.querySelector('[data-df-action="sound"]'); button.textContent = soundOn ? 'Sound on' : 'Sound off'; button.setAttribute('aria-pressed', String(soundOn)); saveSettings(); if (soundOn) tone(440); }
      else if (action === 'reveal-mode') setInputMode('reveal');
      else if (action === 'flag-mode') setInputMode('flag');
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
      if (paused || roundOver || (!event.target.closest('.deepfield-grid') && !event.target.closest('.deepfield-cell'))) return;
      const cell = event.target.closest('.deepfield-cell');
      if (key === 'r') { event.preventDefault(); setupRound(false, true); return; }
      if (key === 'h') { event.preventDefault(); hint(); return; }
      if (key === 't') { event.preventDefault(); setInputMode(inputMode === 'reveal' ? 'flag' : 'reveal'); return; }
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
      snapshot() { return { grid: grid?.slice() || null, config: { ...config }, revealed: [...revealed], flagged: [...flagged], questioned: [...questioned], seed: roundSeed, stage, chartsCleared, score: runScore, mode, signature: signature() }; },
      destroy() {
        if (destroyed) return;
        destroyed = true; clearHold(); abort.abort();
        timers.forEach(timer => { clearTimeout(timer); clearInterval(timer); }); timers.clear();
        audio?.close().catch(() => {}); container.classList.remove('deepfield-board'); container.replaceChildren();
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      },
    };
  }

  return { create, generate, flood, neighbours, PRESETS, CAMPAIGN };
})();
