'use strict';

// Small, optional experiments. The host owns the instruments and their saved models.
window.AetherRoomPlay = (() => {
  const $ = (root, selector) => root.querySelector(selector);
  const $$ = (root, selector) => [...root.querySelectorAll(selector)];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const button = (action, label, extra = '') => `<button type="button" class="rp-button" data-rp="${action}" ${extra}>${label}</button>`;
  const has = (api, id) => api.voyage.discoveries.includes(id);
  const title = (eyebrow, heading, copy) => `<header class="rp-heading"><p class="rp-eyebrow">${eyebrow}</p><h2>${heading}</h2><p>${copy}</p></header>`;

  function mount(view, api) {
    const rooms = { telescope, darkroom, worlds, orchestra, history };
    if (!rooms[view] || api.signal.aborted) return;
    const timers = new Set(), frames = new Set(), disposers = [];
    let disposed = false;
    const life = {
      on(el, event, callback, options = {}) {
        el?.addEventListener(event, (...args) => { if (!disposed) callback(...args); }, { ...options, signal: api.signal });
      },
      later(callback, delay) {
        const id = setTimeout(() => { timers.delete(id); if (!disposed) callback(); }, delay);
        timers.add(id); return id;
      },
      cancel(id) { clearTimeout(id); timers.delete(id); },
      frame(callback) {
        const id = requestAnimationFrame(time => { frames.delete(id); if (!disposed) callback(time); });
        frames.add(id); return id;
      },
      dispose(callback) { disposers.push(callback); },
      active: () => !disposed && !api.signal.aborted,
    };
    function cleanup() {
      if (disposed) return;
      disposed = true;
      timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame);
      timers.clear(); frames.clear(); disposers.reverse().forEach(fn => fn());
    }
    api.signal.addEventListener('abort', cleanup, { once: true });
    rooms[view](api, life);
    return cleanup;
  }

  function panelAfter(api, life, anchor, kind, html) {
    if (!anchor) return null;
    const panel = document.createElement('section');
    panel.className = `room-play rp-${kind}`;
    panel.setAttribute('aria-label', `${kind[0].toUpperCase() + kind.slice(1)} experiment`);
    panel.innerHTML = html;
    anchor.after(panel);
    life.dispose(() => panel.remove());
    return panel;
  }

  // Keep a stage and its experiment together in the first instrument column.
  function belowStage(api, life, selector, kind, html) {
    const stage = $(api.root, selector);
    if (!stage) return null;
    const column = document.createElement('div'); column.className = 'rp-stage-column';
    stage.before(column); column.append(stage);
    life.dispose(() => { if (column.isConnected) { column.before(stage); column.remove(); } });
    return panelAfter(api, life, stage, kind, html);
  }

  function pulse(life, el, name = 'rp-pop', duration = 400) {
    if (!el) return;
    el.classList.remove(name); void el.offsetWidth; el.classList.add(name);
    life.later(() => el.classList.remove(name), duration);
  }

  const constellations = [
    { id: 'cassiopeia', name: 'Cassiopeia', caption: 'A queen’s chair, folded into a bright W.', points: [[12, 29], [30, 70], [49, 38], [68, 73], [87, 25]], path: [0, 1, 2, 3, 4] },
    { id: 'lyra', name: 'Lyra', caption: 'Vega and a tiny harp. A song without a sound.', points: [[24, 18], [37, 42], [69, 37], [77, 76], [44, 80]], path: [0, 1, 2, 3, 4, 1] },
    { id: 'corona', name: 'Corona Borealis', caption: 'The northern crown: a half-circle of borrowed light.', points: [[11, 31], [23, 60], [40, 78], [60, 78], [78, 59], [88, 28]], path: [0, 1, 2, 3, 4, 5] },
  ];

  function telescope(api, life) {
    const panel = belowStage(api, life, '.telescope-stage', 'tracing', `${title('THE POCKET STAR ATLAS', 'Join the little lights.', 'Trace the numbered stars in order. One small shape, hiding in a very big sky.')}<div class="rp-split"><div class="rp-star-board" aria-label="Constellation tracing board"></div><div class="rp-atlas-notes"><span class="rp-counter" data-rp-counter></span><h3 data-rp-name></h3><p data-rp-caption></p><p class="rp-feedback" role="status" data-rp-status></p><div class="rp-actions">${button('reveal', 'Reveal the shape', 'aria-pressed="false"')}${button('retry', 'Trace again')}${button('next', 'Next constellation ↗')}</div><label class="rp-check"><input type="checkbox" data-rp-memory> Memory mode · hide the numbers</label><p class="rp-note">Tab + Enter, or keys 1–6 while the atlas is focused. Illustrated star patterns.</p></div></div>`);
    if (!panel) return;
    const board = $(panel, '.rp-star-board'), status = $(panel, '[data-rp-status]');
    let index = 0, progress = 0, revealed = false, memory = false;
    function draw() {
      const pattern = constellations[index], path = pattern.path;
      const points = ids => ids.map(i => pattern.points[i].map((n, axis) => n * (axis ? 2.6 : 3.6)).join(',')).join(' ');
      const complete = progress === path.length;
      $(board, '.rp-trace-guide').setAttribute('points', revealed || complete ? points(path) : '');
      $(board, '.rp-trace-line').setAttribute('points', points(path.slice(0, progress)));
      $$(board, '[data-star]').forEach((el, i) => {
        const visited = path.slice(0, progress).includes(i), next = !complete && path[progress] === i;
        el.classList.toggle('is-visited', visited); el.classList.toggle('is-next', !memory && next);
        el.setAttribute('aria-label', `Star ${i + 1}${visited ? ', traced' : ''}${next && !memory ? ', next' : ''}`);
        el.setAttribute('aria-pressed', String(visited));
        el.querySelector('small').hidden = memory;
      });
      panel.classList.toggle('rp-complete', complete);
      $(panel, '[data-rp-counter]').textContent = `${index + 1} / ${constellations.length} · ${complete ? 'TRACED' : `${progress} / ${path.length} POINTS`}`;
      $(panel, '[data-rp-name]').textContent = complete || revealed ? pattern.name : 'A shape to discover';
      $(panel, '[data-rp-caption]').textContent = complete || revealed ? pattern.caption : memory ? 'Remember the path. The stars are in the same place.' : 'Start at 1. Let the thread show you the way.';
      $(panel, '[data-rp="reveal"]').setAttribute('aria-pressed', String(revealed));
      $(panel, '[data-rp="reveal"]').textContent = revealed ? 'Hide the guide' : 'Reveal the shape';
    }
    function reset() {
      progress = 0; revealed = false;
      const pattern = constellations[index];
      board.innerHTML = `<svg viewBox="0 0 360 260" preserveAspectRatio="none" aria-hidden="true"><polyline class="rp-trace-guide"/><polyline class="rp-trace-line"/></svg>${pattern.points.map(([x, y], i) => `<button type="button" class="rp-star" data-star="${i}" style="left:${x}%;top:${y}%" aria-label="Star ${i + 1}"><span aria-hidden="true">✦</span><small aria-hidden="true">${i + 1}</small></button>`).join('')}`;
      status.textContent = has(api, 'trace:' + pattern.id) ? 'Already in your atlas. Trace it a different way: try memory mode.' : 'A little discovery is waiting at the end of the thread.';
      draw();
    }
    function trace(i) {
      const pattern = constellations[index];
      if (progress === pattern.path.length) return;
      if (i !== pattern.path[progress]) {
        status.textContent = `Almost. Find star ${pattern.path[progress] + 1}${progress > 0 && pattern.path[progress] < pattern.path[progress - 1] ? ' again to close the shape' : ' next'}.`;
        pulse(life, $(board, `[data-star="${i}"]`), 'rp-nudge'); return;
      }
      progress++;
      pulse(life, $(board, `[data-star="${i}"]`));
      if (progress === pattern.path.length) {
        api.unlock('trace:' + pattern.id, pattern.name + ' · written in starlight');
        status.textContent = `${pattern.name}, found. ${memory ? 'Beautifully remembered.' : 'Try memory mode, or turn the atlas page.'}`;
        pulse(life, board, 'rp-celebrate', 700);
      } else status.textContent = `Star ${i + 1} connected. Next: star ${pattern.path[progress] + 1}.`;
      draw();
    }
    life.on(panel, 'click', e => {
      const star = e.target.closest('[data-star]');
      if (star) return trace(Number(star.dataset.star));
      const action = e.target.closest('[data-rp]')?.dataset.rp;
      if (action === 'reveal') { revealed = !revealed; draw(); }
      if (action === 'retry' || action === 'next') { if (action === 'next') index = (index + 1) % constellations.length; reset(); }
    });
    life.on(panel, 'keydown', e => {
      if (/^[1-6]$/.test(e.key) && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT') {
        e.preventDefault(); trace(Number(e.key) - 1);
      }
    });
    life.on($(panel, '[data-rp-memory]'), 'change', e => { memory = e.target.checked; reset(); });
    reset();
  }

  const recipes = [
    { id: 'moonmilk', name: 'Moonmilk', symbol: '◒', copy: 'Soft silver. Cool shadows. The light before morning.', values: [72, 42, 22] },
    { id: 'antique', name: 'Antique gold', symbol: '✧', copy: 'Warm brass and crisp detail, straight from the keeper’s drawer.', values: [58, 78, 80] },
    { id: 'midnight', name: 'Midnight ink', symbol: '◐', copy: 'Deep blue darkness. Small stars with something to say.', values: [34, 88, 30] },
  ];
  const finishKeys = ['exposure', 'clarity', 'warmth'];

  function darkroom(api, life) {
    if (!api.getPhoto?.() || !$(api.root, '#plate-exposure')) return;
    const panel = belowStage(api, life, '.darkroom-stage', 'recipes', `${title('THREE RECIPES FOR LIGHT', 'A finish worth finding.', 'Choose a recipe, then turn the real darkroom dials. Within 8 of each target earns its seal.')}<div class="rp-recipe-tabs" role="group" aria-label="Development recipe">${recipes.map((r, i) => button('recipe', `<span aria-hidden="true">${r.symbol}</span>${r.name}<small data-rp-recipe-stamp="${i}"></small>`, `data-index="${i}" aria-pressed="${i === 0}"`)).join('')}</div><p class="rp-recipe-copy" data-rp-copy></p><div class="rp-recipe-targets"></div><div class="rp-meter-row"><span>Recipe match</span><strong data-rp-match></strong></div><meter class="rp-meter" min="0" max="100" low="60" high="85" optimum="100" value="0" aria-label="Closeness to the selected recipe"></meter><div class="rp-actions">${button('evaluate', 'Evaluate print ✧')}${button('try-recipe', 'Try these settings')}${button('restore-finish', 'Restore my finish', 'disabled')}</div><p class="rp-feedback" role="status" data-rp-status>Develop your plate, then put your finish to the light.</p><p class="rp-note">Selecting a recipe leaves your dials alone. “Try these settings” is reversible. Save your favourite with “Save this finish”.</p>`);
    if (!panel) return;
    let index = 0, previous = null, evaluation = null;
    const values = () => finishKeys.map(k => Number($(api.root, '#plate-' + k).value));
    function update() {
      const recipe = recipes[index], current = values(), differences = current.map((v, i) => Math.abs(v - recipe.values[i]));
      const closeness = Math.round(clamp(100 - differences.reduce((a, b) => a + b, 0) / 3 * 1.5, 0, 100));
      $(panel, '[data-rp-match]').textContent = `${closeness}%`;
      $(panel, '.rp-meter').value = closeness;
      $$(panel, '[data-rp-target]').forEach((el, i) => {
        const close = differences[i] <= 8;
        el.classList.toggle('is-met', close);
        el.querySelector('b').textContent = `${current[i]} / ${recipe.values[i]}`;
        el.querySelector('small').textContent = close ? '✓ In the sweet spot' : `${current[i] < recipe.values[i] ? '↑ Raise' : '↓ Lower'} by ${differences[i] - 8}+`;
      });
      if (evaluation && evaluation !== current.join(':')) {
        evaluation = null; panel.classList.remove('rp-complete');
        $(panel, '[data-rp-status]').textContent = 'A new finish. Evaluate it when it feels right.';
      }
      $(panel, '[data-rp="restore-finish"]').disabled = !previous;
    }
    function choose() {
      const recipe = recipes[index]; evaluation = null; panel.classList.remove('rp-complete');
      $$(panel, '[data-rp="recipe"]').forEach((el, i) => {
        el.setAttribute('aria-pressed', String(i === index));
        el.querySelector('small').textContent = has(api, 'recipe:' + recipes[i].id) ? '✓ SEALED' : 'TRY IT';
      });
      $(panel, '[data-rp-copy]').textContent = recipe.copy;
      $(panel, '.rp-recipe-targets').innerHTML = ['Exposure', 'Contrast & detail', 'Warmth'].map((label, i) => `<div data-rp-target="${i}"><span>${label}</span><b></b><small></small></div>`).join('');
      $(panel, '[data-rp-status]').textContent = has(api, 'recipe:' + recipe.id) ? 'Recipe seal collected. Every plate catches this light a little differently.' : 'Set your finish, develop the plate, then evaluate.';
      update();
    }
    function setFinish(next) {
      finishKeys.forEach((key, i) => {
        const input = $(api.root, '#plate-' + key); input.value = next[i];
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      api.updatePlate?.(); update();
    }
    life.on(api.root, 'input', e => { if (finishKeys.some(k => e.target.id === 'plate-' + k)) update(); });
    life.on(panel, 'click', e => {
      const target = e.target.closest('[data-rp]'); if (!target) return;
      const action = target.dataset.rp;
      if (action === 'recipe') { index = Number(target.dataset.index); choose(); }
      if (action === 'try-recipe') {
        previous ||= values(); setFinish(recipes[index].values);
        $(panel, '[data-rp-status]').textContent = `${recipes[index].name} is on the dials. Your previous finish is one button away.`;
      }
      if (action === 'restore-finish' && previous) {
        const old = previous; previous = null; setFinish(old);
        $(panel, '[data-rp-status]').textContent = 'Your own finish, restored.';
      }
      if (action === 'evaluate') {
        const photo = api.getPhoto();
        if (!photo?.developed) {
          $(panel, '[data-rp-status]').textContent = 'First lower your plate into the bath above. Then we can judge the light.';
          pulse(life, $(api.root, '#plate-handle')); return;
        }
        const current = values(), differences = current.map((v, i) => Math.abs(v - recipes[index].values[i]));
        const quality = differences.every(d => d <= 8), exact = differences.every(d => d <= 2);
        evaluation = current.join(':'); panel.classList.toggle('rp-complete', quality);
        $(panel, '[data-rp-status]').textContent = quality ? `✧ ${exact ? 'Exhibition print' : 'Keeper’s print'} · ${recipes[index].name}. A lovely piece of alchemy.` : '✦ A promising study. Follow the dial hints for this recipe’s seal, or keep this finish as your own.';
        if (quality) {
          api.unlock('recipe:' + recipes[index].id, recipes[index].name + ' · recipe mastered');
          $(panel, `[data-rp-recipe-stamp="${index}"]`).textContent = '✓ SEALED';
          pulse(life, panel, 'rp-celebrate', 700);
        }
      }
    });
    choose();
  }

  function orchestra(api, life) {
    if (!api.getMusic?.()) return;
    const studio = window.AetherOrchestra;
    const names = studio.TRACKS.map(track => track.planet);
    const panel = panelAfter(api, life, $(api.root, '.orchestra-stage'), 'improviser', `${title('THE POCKET IMPROVISER', 'Play a little answer.', 'Eight instruments. Echo the four-note calls, then weave what you played into your sixteen-beat score.')}<div class="rp-improv-top"><div class="rp-phrase" aria-label="The four-note call"></div>${button('pad-sound', 'Pad sound on', 'aria-pressed="true"')}</div><div class="rp-pads" role="group" aria-label="Play the eight planets">${names.map((name, i) => `<button type="button" class="rp-pad rp-pad-${i}" data-pad="${i}"><span class="rp-pad-orb" aria-hidden="true"></span><strong>${name}</strong><small>${studio.TRACKS[i].voice} <kbd>${i + 1}</kbd></small></button>`).join('')}</div><div class="rp-actions">${button('call', 'Hear the call ♫')}${button('new-call', 'New call ↗')}${button('weave', 'Weave my last four into the score', 'disabled')}</div><p class="rp-feedback" role="status" data-rp-status>Tap any planet to begin. Keys 1–8 also work while this panel is focused.</p><div class="rp-remix"><div><h3>A change of orbit.</h3><p>Gently vary the score below. Every change has a way back.</p></div><div class="rp-actions">${button('variation', 'A small variation ✧')}${button('rotate-score', 'Rotate one beat →')}${button('undo-music', 'Undo score change', 'disabled')}</div></div><p class="rp-note">Keys 1–8 play the pads. Play three different calls perfectly to earn a second improviser seal. Compose, remix and save downstairs.</p>`);
    if (!panel) return;
    let audio = null, bus = null, sound = true, demonstrating = false, demoTimers = [], response = 0, recent = [], won = false;
    const completedCalls = new Set();
    let callIndex = 0;
    const calls = [[0, 2, 4, 7], [5, 3, 1, 6], [7, 0, 6, 2], [1, 4, 3, 5], [6, 2, 7, 0], [4, 5, 1, 3]];
    const undo = [];
    const snapshot = () => api.getMusic().notes.map(row => [...row]);
    function updateUndo() { $(panel, '[data-rp="undo-music"]').disabled = !undo.length; }
    function checkpoint() { undo.push(snapshot()); if (undo.length > 20) undo.shift(); updateUndo(); }
    function setNotes(notes) {
      // Mutate the host model in place: the running scheduler reads it on every beat.
      api.getMusic().notes = notes.map(row => [...row]);
      $$(api.root, '[data-exp="music-note"]').forEach(el => {
        const active = notes[Number(el.dataset.track)][Number(el.dataset.step)];
        el.classList.toggle('on', active); el.setAttribute('aria-pressed', String(active));
      });
      api.updateMusicStories?.();
    }
    function stopVoices() {
      // Closing a context also stops any calls scheduled ahead of time.
      if (audio) { audio.close().catch(() => {}); audio = null; bus = null; }
    }
    function closeAudio() { stopVoices(); }
    function openAudio() {
      if (!sound) return null;
      try {
        if (!audio) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) throw new Error('Audio unavailable');
          audio = new Audio(); bus = studio.createBus(audio, api.getMusic());
        }
        studio.setSpace(bus, api.getMusic().space, audio.currentTime);
        if (audio.state === 'suspended') audio.resume().catch(() => {
          if (life.active()) $(panel, '[data-rp-status]').textContent = 'Audio is resting. The glowing pads still work.';
        });
        return audio;
      } catch {
        sound = false; $(panel, '[data-rp="pad-sound"]').textContent = 'Pad sound off';
        $(panel, '[data-rp="pad-sound"]').setAttribute('aria-pressed', 'false');
        $(panel, '[data-rp-status]').textContent = 'Sound is unavailable here. Follow the glowing planets instead.';
        return null;
      }
    }
    function note(track, when) {
      if (!audio || !sound) return;
      // Audition works even for a muted channel in the running sequencer.
      const model = api.getMusic();
      studio.voice(audio, bus, track, when ?? audio.currentTime + .01,
        { ...model, mutes: Array(studio.TRACKS.length).fill(false) }, 0);
    }
    function light(track) {
      pulse(life, $(panel, `[data-pad="${track}"]`), 'rp-struck', 330);
      const planet = $(api.root, `.orbit-${track} > span`);
      if (planet) pulse(life, planet, 'rp-note-lit', 330);
    }
    function drawPhrase() {
      $(panel, '.rp-phrase').innerHTML = calls[callIndex].map((track, i) => `<span class="${i < response ? 'is-met' : ''}" aria-label="Call note ${i + 1}: ${names[track]}${i < response ? ', echoed' : ''}"><small>${['I', 'II', 'III', 'IV'][i]}</small><b>${names[track]}</b><i aria-hidden="true">${i < response ? '✓' : '·'}</i></span>`).join('');
    }
    function stopDemo() {
      demoTimers.forEach(life.cancel); demoTimers = []; demonstrating = false;
      $(panel, '[data-rp="call"]').disabled = false;
      $$(panel, '[data-pad]').forEach(el => { el.disabled = false; el.classList.remove('rp-struck'); });
    }
    function hearCall() {
      stopDemo(); stopVoices(); response = 0; won = false; panel.classList.remove('rp-complete'); drawPhrase();
      const ctx = openAudio(); demonstrating = true;
      $(panel, '[data-rp="call"]').disabled = true;
      $$(panel, '[data-pad]').forEach(el => { el.disabled = true; });
      $(panel, '[data-rp-status]').textContent = 'Listen, watch the planets, then play the answer.';
      const start = ctx ? ctx.currentTime + .08 : 0;
      calls[callIndex].forEach((track, i) => {
        if (ctx) note(track, start + i * .52);
        demoTimers.push(life.later(() => light(track), 80 + i * 520));
      });
      demoTimers.push(life.later(() => {
        stopDemo(); $(panel, '[data-rp-status]').textContent = 'Your turn. Echo the four planets from left to right.';
      }, 2200));
    }
    function play(track) {
      if (demonstrating) return;
      openAudio(); note(track); light(track);
      recent.push(track); recent = recent.slice(-4);
      $(panel, '[data-rp="weave"]').disabled = recent.length < 4;
      if (won) {
        $(panel, '[data-rp-status]').textContent = `${names[track]}, played. Keep improvising, or ask for a new call.`;
        return;
      }
      if (track === calls[callIndex][response]) {
        response++;
        if (response === 4) {
          won = true; panel.classList.add('rp-complete');
          api.unlock('music:echo', 'A little call, beautifully answered');
          completedCalls.add(callIndex);
          if (completedCalls.size >= 3) api.unlock('music:three-calls', 'Three constellations, answered by ear');
          $(panel, '[data-rp-status]').textContent = '✧ A perfect answer. Weave these four notes into the score, or try another call.';
        } else $(panel, '[data-rp-status]').textContent = `${response} / 4 notes echoed. Follow the next planet.`;
      } else {
        response = track === calls[callIndex][0] ? 1 : 0;
        $(panel, '[data-rp-status]').textContent = `A lovely detour. Start with ${names[calls[callIndex][0]]} to echo the call.`;
      }
      drawPhrase();
    }
    // Capture the host note edit before its delegated click handler changes the model.
    life.on(api.root, 'click', e => { if (e.target.closest('[data-exp="music-note"]')) checkpoint(); }, { capture: true });
    life.on(panel, 'pointerdown', e => {
      const pad = e.target.closest('[data-pad]');
      if (pad && !pad.disabled && e.button === 0) { pad.focus({ preventScroll: true }); play(Number(pad.dataset.pad)); }
    });
    life.on(panel, 'click', e => {
      const pad = e.target.closest('[data-pad]');
      if (pad) { if (e.detail === 0) play(Number(pad.dataset.pad)); return; }
      const action = e.target.closest('[data-rp]')?.dataset.rp;
      if (action === 'pad-sound') {
        sound = !sound;
        if (!sound) { stopDemo(); closeAudio(); }
        $(panel, '[data-rp="pad-sound"]').textContent = sound ? 'Pad sound on' : 'Pad sound off';
        $(panel, '[data-rp="pad-sound"]').setAttribute('aria-pressed', String(sound));
      }
      if (action === 'call') hearCall();
      if (action === 'new-call') {
        stopDemo(); stopVoices(); callIndex = (callIndex + 1 + Math.floor(Math.random() * (calls.length - 1))) % calls.length;
        response = 0; won = false; panel.classList.remove('rp-complete'); drawPhrase();
        $(panel, '[data-rp-status]').textContent = 'A fresh little phrase. Hear the call, or read the four planets and play.';
      }
      if (action === 'weave' && recent.length === 4) {
        checkpoint(); const notes = snapshot();
        recent.forEach((track, i) => { notes[track][i * 4] = true; });
        setNotes(notes);
        $(panel, '[data-rp-status]').textContent = 'Your last four notes are woven into beats 1, 5, 9 and 13. Undo can lift them out.';
      }
      if (action === 'rotate-score') {
        checkpoint(); setNotes(snapshot().map(row => [row.at(-1), ...row.slice(0, -1)]));
        $(panel, '[data-rp-status]').textContent = 'Every note moved one beat around the orbit. Same melody, new point of view.';
      }
      if (action === 'variation') {
        checkpoint(); const notes = snapshot();
        // Move one note in each voice, preserving the pulse density and the rest of the score.
        notes.forEach(row => {
          const occupied = row.map((on, i) => on ? i : -1).filter(i => i >= 0);
          const empty = row.map((on, i) => !on ? i : -1).filter(i => i >= 0);
          if (!occupied.length) { row[Math.floor(Math.random() * studio.STEPS)] = true; return; }
          if (!empty.length) { row[1 + Math.floor(Math.random() * (studio.STEPS - 2))] = false; return; }
          const from = occupied[Math.floor(Math.random() * occupied.length)];
          const to = empty.reduce((best, n) => Math.abs(n - from) < Math.abs(best - from) ? n : best, empty[0]);
          row[from] = false; row[to] = true;
        });
        setNotes(notes); pulse(life, $(api.root, '.sequence-grid'), 'rp-celebrate', 700);
        $(panel, '[data-rp-status]').textContent = 'Four small detours: one note per voice. Listen while the orchestra plays; Undo brings the old orbit back.';
      }
      if (action === 'undo-music' && undo.length) {
        setNotes(undo.pop()); updateUndo();
        $(panel, '[data-rp-status]').textContent = 'The previous score, restored. Your orchestra keeps its place.';
      }
    });
    life.on(panel, 'keydown', e => {
      if (/^[1-8]$/.test(e.key) && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); play(Number(e.key) - 1); }
    });
    life.on(document, 'visibilitychange', () => { if (document.hidden) { stopDemo(); closeAudio(); } });
    life.dispose(() => { stopDemo(); closeAudio(); });
    drawPhrase();
  }

  const countMarks = (world, type) => (world.marks || []).filter(m => m.type === type).length;
  const commissions = [
    { id: 'moon-garden', name: 'A garden for moon-watchers', from: 'THE SOCIETY OF VERY LATE PICNICS', copy: 'Room for a blanket. Air for the flowers. More than one moon to argue about.', checks: [
      ['Atmosphere at least 65', w => w.atmosphere >= 65, w => `${w.atmosphere} / 65`],
      ['Two or more moons', w => w.moons >= 2, w => `${w.moons} / 2`],
      ['Paint three continent marks', w => countMarks(w, 'land') >= 3, w => `${countMarks(w, 'land')} / 3`],
    ] },
    { id: 'storm-opera', name: 'Somewhere gloriously stormy', from: 'THE INTERPLANETARY WEATHER CHOIR', copy: 'A tilted little world with a short day and a dramatic forecast.', checks: [
      ['Tilt of 40° or more', w => w.tilt >= 40, w => `${w.tilt}° / 40°`],
      ['A day no longer than 16 hours', w => w.speed <= 16, w => `${w.speed}h / 16h`],
      ['Paint two storm marks', w => countMarks(w, 'storm') >= 2, w => `${countMarks(w, 'storm')} / 2`],
    ] },
    { id: 'crater-library', name: 'A library of little impacts', from: 'THE ARCHIVIST OF FALLING THINGS', copy: 'Every crater tells a story. Give this quiet world three good ones.', checks: [
      ['Thin atmosphere: 25 or less', w => w.atmosphere <= 25, w => `${w.atmosphere} / 25`],
      ['At most one moon', w => w.moons <= 1, w => `${w.moons} / 1`],
      ['Three crater marks', w => countMarks(w, 'crater') >= 3, w => `${countMarks(w, 'crater')} / 3`],
    ] },
    { id: 'golden-hour', name: 'A world dressed for sunset', from: 'THE DEPARTMENT OF IMPOSSIBLE EVENINGS', copy: 'Something in honey and apricot. With rings, naturally.', checks: [
      ['Planet colour between 15 and 65', w => w.hue >= 15 && w.hue <= 65, w => `${w.hue} / 15–65`],
      ['Give it rings', w => w.rings, w => w.rings ? 'On' : 'Off'],
      ['Paint two continent marks', w => countMarks(w, 'land') >= 2, w => `${countMarks(w, 'land')} / 2`],
    ] },
  ];

  function worlds(api, life) {
    if (!api.getWorld?.()) return;
    const panel = belowStage(api, life, '.world-stage', 'commissions', `${title('POST FROM OTHER WORLDS', 'Wanted: a small impossibility.', 'Pick a commission. Shape your own world until all three wishes come true.')}<div class="rp-commission-top"><span class="rp-counter" data-rp-counter></span>${button('commission-next', 'Another request ↗')}</div><article class="rp-commission"><p class="rp-eyebrow" data-rp-from></p><h3 data-rp-name></h3><p data-rp-copy></p><ul class="rp-objectives"></ul></article><div class="rp-actions">${button('deliver', 'Stamp this commission ✧', 'disabled')}<span class="rp-seal" data-rp-seal></span></div><p class="rp-feedback" role="status" data-rp-status>All worlds welcome. Your brush marks count immediately.</p><div class="rp-comet-workshop"><div><p class="rp-eyebrow">A VISITOR WITH A LANDING PROBLEM</p><h3>Order a little impact.</h3><p>Choose the brass crosshair’s landing site. Every comet leaves one undoable crater.</p></div><div class="rp-aims" role="group" aria-label="Comet landing site">${['Northwest', 'East', 'South'].map((name, i) => button('aim', name, `data-index="${i}" aria-pressed="${i === 0}"`)).join('')}</div><div class="rp-actions">${button('comet', 'Summon a comet ☄')}<span data-rp-mark-count></span></div><p class="rp-feedback" role="status" data-rp-comet-status>Use the world’s Undo to lift a crater back into the sky.</p></div><p class="rp-note">Keep your finished world with “Keep this world”. Commissions never replace your creation.</p>`);
    if (!panel) return;
    const preview = $(api.root, '#world-preview');
    const quickComet = document.createElement('button');
    quickComet.type = 'button'; quickComet.className = 'rp-button rp-world-comet';
    quickComet.textContent = '☄ Summon a comet';
    quickComet.setAttribute('aria-label', 'Summon a comet at the chosen landing site. Adds one undoable crater.');
    $(api.root, '.brush-toolbar').append(quickComet);
    life.dispose(() => quickComet.remove());
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.classList.add('rp-comet-overlay'); overlay.setAttribute('viewBox', '0 0 760 500'); overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<g class="rp-impact-target"><circle r="12"/><path d="M-18 0h9m18 0h9M0-18v9m0 18v9"/></g><g class="rp-flying-comet" visibility="hidden"><path class="rp-comet-tail"/><circle class="rp-comet-head" r="5"/></g><g class="rp-impact-burst" visibility="hidden"><circle class="rp-impact-ring" r="10"/><path d="M-22 0h-9m53 0h9M0-22v-9m0 53v9M-16-16l-6-6m38 38 6 6m-38-6-6 6m38-38 6-6"/></g>';
    preview.append(overlay); life.dispose(() => overlay.remove());
    const aims = [[-.38, -.39], [.43, -.08], [-.12, .48]];
    let index = 0, aim = 0, busy = false, pending = false;
    const landing = () => {
      const world = api.getWorld(), r = 90 + world.size * 30;
      return { x: 380 + aims[aim][0] * r, y: 245 + aims[aim][1] * r };
    };
    function refresh() {
      const world = api.getWorld(), request = commissions[index];
      const checks = request.checks.map(([, test]) => test(world));
      $$(panel, '[data-rp-objective]').forEach((el, i) => {
        el.classList.toggle('is-met', checks[i]);
        el.querySelector('.rp-checkmark').textContent = checks[i] ? '✓' : '○';
        el.querySelector('b').textContent = request.checks[i][2](world);
        el.querySelector('.sr-only').textContent = checks[i] ? 'Complete: ' : 'Needed: ';
      });
      const earned = has(api, 'commission:' + request.id);
      $(panel, '[data-rp="deliver"]').disabled = !checks.every(Boolean);
      $(panel, '[data-rp="deliver"]').textContent = earned ? 'Stamp it again ✧' : 'Stamp this commission ✧';
      $(panel, '[data-rp-seal]').textContent = earned ? '✧ COMMISSION COLLECTED' : `${checks.filter(Boolean).length} / 3 WISHES`;
      const count = world.marks?.length || 0;
      $(panel, '[data-rp-mark-count]').textContent = `${count} / 250 surface marks`;
      $(panel, '[data-rp="comet"]').disabled = busy || count >= 250 || typeof api.checkpointWorld !== 'function';
      $(panel, '[data-rp="comet"]').textContent = busy ? 'Incoming…' : count >= 250 ? 'Surface full · Undo frees a spot' : 'Summon a comet ☄';
      quickComet.disabled = busy || count >= 250 || typeof api.checkpointWorld !== 'function';
      quickComet.textContent = busy ? '☄ Incoming…' : count >= 250 ? 'Surface full · try Undo' : '☄ Summon a comet';
      const p = landing(); $(overlay, '.rp-impact-target').setAttribute('transform', `translate(${p.x} ${p.y})`);
    }
    function choose() {
      const request = commissions[index];
      panel.classList.remove('rp-complete');
      $(panel, '[data-rp-counter]').textContent = `REQUEST ${index + 1} / ${commissions.length}`;
      $(panel, '[data-rp-from]').textContent = request.from;
      $(panel, '[data-rp-name]').textContent = request.name;
      $(panel, '[data-rp-copy]').textContent = request.copy;
      $(panel, '.rp-objectives').innerHTML = request.checks.map(([label], i) => `<li data-rp-objective="${i}"><span class="rp-checkmark" aria-hidden="true"></span><span><span class="sr-only"></span>${label}</span><b></b></li>`).join('');
      $(panel, '[data-rp-status]').textContent = 'Three wishes. The controls and brushes above are your tools.';
      refresh();
    }
    function queueRefresh() {
      if (pending) return; pending = true;
      life.frame(() => { pending = false; refresh(); });
    }
    function summon() {
      const world = api.getWorld();
      if (busy || (world.marks?.length || 0) >= 250 || !api.checkpointWorld) return;
      busy = true; refresh();
      // Bring the actual planet into view when launching from the commission below it.
      const rect = preview.getBoundingClientRect();
      if (rect.bottom < 100 || rect.top > window.innerHeight - 100) preview.scrollIntoView({ behavior: api.motion.matches ? 'instant' : 'smooth', block: 'center' });
      $$(panel, '[data-rp="aim"]').forEach(el => { el.disabled = true; });
      $(panel, '[data-rp-comet-status]').textContent = 'One small comet, on its way.';
      const flight = $(overlay, '.rp-flying-comet'), burst = $(overlay, '.rp-impact-burst');
      const finish = () => {
        flight.setAttribute('visibility', 'hidden'); burst.setAttribute('visibility', 'hidden');
        busy = false; $$(panel, '[data-rp="aim"]').forEach(el => { el.disabled = false; }); refresh();
      };
      function impact() {
        if (world !== api.getWorld() || (world.marks?.length || 0) >= 250) {
          $(panel, '[data-rp-comet-status]').textContent = 'The comet sailed past. Make room on the surface and call another.';
          finish(); return;
        }
        // Screen-space landing coordinates are rotated back into the planet's local frame.
        const [dx, dy] = aims[aim], tilt = world.tilt * Math.PI / 180;
        api.checkpointWorld();
        world.marks ||= [];
        world.marks.push({ x: dx * Math.cos(tilt) + dy * Math.sin(tilt), y: -dx * Math.sin(tilt) + dy * Math.cos(tilt), r: .15, type: 'crater' });
        api.updateWorld?.(); refresh();
        $(panel, '[data-rp-comet-status]').textContent = 'A soft cosmic thump. One new crater; one story to keep. Undo brings it back.';
        const brushStatus = $(api.root, '#world-brush-status');
        if (brushStatus) brushStatus.textContent = 'Comet landed. A new crater for your world; Undo lifts it back into the sky.';
        const p = landing();
        flight.setAttribute('visibility', 'hidden');
        burst.setAttribute('transform', `translate(${p.x} ${p.y})`); burst.setAttribute('visibility', 'visible'); burst.setAttribute('opacity', '1');
        if (api.motion.matches) { life.later(finish, 280); return; }
        let start;
        function ripple(now) {
          start ??= now; const t = clamp((now - start) / 600, 0, 1);
          burst.setAttribute('opacity', String(1 - t));
          $(burst, 'circle').setAttribute('r', String(8 + t * 46));
          if (t < 1) life.frame(ripple); else finish();
        }
        life.frame(ripple);
      }
      if (api.motion.matches) { impact(); return; }
      flight.setAttribute('visibility', 'visible'); let start;
      function fly(now) {
        start ??= now; const t = clamp((now - start) / 850, 0, 1), ease = t * t;
        const p = landing(), x = 75 + (p.x - 75) * ease, y = -35 + (p.y + 35) * ease;
        const dx = p.x - 75, dy = p.y + 35, length = Math.hypot(dx, dy);
        $(flight, 'path').setAttribute('d', `M${x - dx / length * 85} ${y - dy / length * 85}L${x} ${y}`);
        $(flight, 'circle').setAttribute('cx', String(x)); $(flight, 'circle').setAttribute('cy', String(y));
        if (t < 1) life.frame(fly); else impact();
      }
      life.frame(fly);
    }
    ['input', 'click', 'pointermove', 'pointerup', 'keydown'].forEach(event => life.on(api.root, event, e => {
      if (e.target.closest('.world-stage, .world-controls')) queueRefresh();
    }));
    life.on(quickComet, 'click', summon);
    life.on(panel, 'click', e => {
      const target = e.target.closest('[data-rp]'); if (!target) return;
      if (target.dataset.rp === 'commission-next') { index = (index + 1) % commissions.length; choose(); }
      if (target.dataset.rp === 'aim' && !busy) {
        aim = Number(target.dataset.index);
        $$(panel, '[data-rp="aim"]').forEach((el, i) => el.setAttribute('aria-pressed', String(i === aim)));
        refresh();
      }
      if (target.dataset.rp === 'comet') summon();
      if (target.dataset.rp === 'deliver' && commissions[index].checks.every(([, test]) => test(api.getWorld()))) {
        api.unlock('commission:' + commissions[index].id, commissions[index].name + ' · delivered');
        panel.classList.add('rp-complete'); pulse(life, $(panel, '.rp-seal'), 'rp-pop');
        $(panel, '[data-rp-status]').textContent = '✧ Accepted with delight. Turn the card for another small impossibility.';
        refresh();
      }
    });
    choose();
  }

  function history(api, life) {
    const panel = belowStage(api, life, '.history-stage', 'blink', `${title('THE BLINK DESK · A THREE-SKY CHALLENGE', 'One light has other plans.', 'Compare two plates. Find the wandering light. Three fresh skies every time you play.')}<div class="rp-blink-top"><span class="rp-counter" data-rp-round></span><span class="rp-plate-label" data-rp-plate>PLATE A</span></div><div class="rp-blink-board" aria-label="Find the moving light among twelve stars"></div><div class="rp-actions">${button('flip', 'Show plate B')}${button('auto-blink', 'Blink slowly', 'aria-pressed="false"')}${button('next-sky', 'Next sky ↗', 'disabled')}</div><p class="rp-feedback" role="status" data-rp-status></p><p class="rp-note">Tab to a numbered light and press Enter to inspect it. The plates hold still while a star has keyboard focus.</p>`);
    if (!panel) return;
    const board = $(panel, '.rp-blink-board');
    let round = 1, found = 0, attempts = 0, plate = 0, moving = 0, stars = [], solved = false, seen = new Set([0]);
    let blinking = false, timer;
    function stop() {
      blinking = false; life.cancel(timer);
      $(panel, '[data-rp="auto-blink"]').textContent = 'Blink slowly';
      $(panel, '[data-rp="auto-blink"]').setAttribute('aria-pressed', 'false');
    }
    function draw() {
      $$(board, '[data-light]').forEach((el, i) => {
        const star = stars[i];
        el.style.left = `${star.x + (i === moving ? plate * star.dx : 0)}%`;
        el.style.top = `${star.y + (i === moving ? plate * star.dy : 0)}%`;
        el.setAttribute('aria-label', `Inspect light ${i + 1}, ${Math.round(star.x + (i === moving ? plate * star.dx : 0))} percent across, ${Math.round(star.y + (i === moving ? plate * star.dy : 0))} percent down${solved && i === moving ? ', identified' : ''}`);
        el.classList.toggle('is-found', solved && i === moving);
      });
      $(panel, '[data-rp-plate]').textContent = `PLATE ${plate ? 'B' : 'A'}`;
      $(panel, '[data-rp="flip"]').textContent = `Show plate ${plate ? 'A' : 'B'}`;
      $(panel, '[data-rp-round]').textContent = `SKY ${round} / 3 · ${found} FOUND · ${attempts} INSPECTIONS`;
      $(panel, '[data-rp="next-sky"]').disabled = !solved;
      $(panel, '[data-rp="next-sky"]').textContent = round === 3 ? 'Play a fresh set ↗' : 'Next sky ↗';
    }
    function newSky() {
      stop(); plate = 0; solved = false; seen = new Set([0]);
      moving = Math.floor(Math.random() * 12);
      stars = Array.from({ length: 12 }, (_, i) => ({ x: 12.5 + i % 4 * 25 + (Math.random() - .5) * 3, y: 20 + Math.floor(i / 4) * 28 + (Math.random() - .5) * 3, dx: Math.random() < .5 ? -3 : 3, dy: i < 8 ? 8 : -8 }));
      board.innerHTML = stars.map((_, i) => `<button type="button" class="rp-blink-star" data-light="${i}"><span aria-hidden="true">✦</span><small aria-hidden="true">${i + 1}</small></button>`).join('');
      panel.classList.remove('rp-complete');
      $(panel, '[data-rp-status]').textContent = 'Look at plate A, then switch to B. Eleven lights keep their place. One wanders.';
      draw();
    }
    function flip() { plate = 1 - plate; seen.add(plate); draw(); }
    function blink() {
      if (!blinking) return;
      if (!document.hidden && !board.contains(document.activeElement)) flip();
      timer = life.later(blink, api.motion.matches ? 1400 : 1000);
    }
    life.on(panel, 'click', e => {
      const light = e.target.closest('[data-light]');
      if (light) {
        if (solved) return;
        stop();
        if (seen.size < 2) { $(panel, '[data-rp-status]').textContent = 'One plate is half a clue. Show plate B before choosing your wandering light.'; return; }
        attempts++;
        if (Number(light.dataset.light) !== moving) {
          light.classList.add('is-checked'); pulse(life, light, 'rp-nudge');
          $(panel, '[data-rp-status]').textContent = `Light ${Number(light.dataset.light) + 1} stays put. Blink again. The tiny shift is the clue.`;
        } else {
          solved = true; found++; panel.classList.add('rp-complete');
          $(panel, '[data-rp-status]').textContent = round === 3 ? `✧ Three skies, three discoveries. Found in ${attempts} inspections. Shuffle the desk and go again?` : `Caught it: light ${moving + 1}. A fresh sky is waiting.`;
          if (round === 3) api.unlock('history:blink', 'The blink desk · three wandering lights');
          pulse(life, light, 'rp-pop');
        }
        draw(); return;
      }
      const action = e.target.closest('[data-rp]')?.dataset.rp;
      if (action === 'flip') { stop(); flip(); }
      if (action === 'auto-blink') {
        if (blinking) stop();
        else {
          blinking = true; $(panel, '[data-rp="auto-blink"]').textContent = 'Hold the plate';
          $(panel, '[data-rp="auto-blink"]').setAttribute('aria-pressed', 'true'); blink();
        }
      }
      if (action === 'next-sky' && solved) {
        if (round === 3) { round = 1; found = 0; attempts = 0; } else round++;
        newSky();
      }
    });
    life.on(board, 'focusin', () => { if (blinking) stop(); });
    life.on(document, 'visibilitychange', () => { if (document.hidden) stop(); });
    life.dispose(stop); newSky();
  }

  return { mount };
})();
