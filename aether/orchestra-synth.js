'use strict';

// A single synthesis engine for the live instrument, pocket pads and WAV export.
// No audio files, external services or dependencies; contexts open only on interaction.
window.AetherOrchestra = (() => {
  const STEPS = 16;
  const TRACKS = [
    { planet: 'Mercury', voice: 'Glass bells', colour: '#e2c28a' },
    { planet: 'Venus', voice: 'Warm keys', colour: '#b3a0d8' },
    { planet: 'Earth', voice: 'Wood marimba', colour: '#87c8b3' },
    { planet: 'Mars', voice: 'Copper pluck', colour: '#dc9582' },
    { planet: 'Jupiter', voice: 'Velvet strings', colour: '#d9b879' },
    { planet: 'Saturn', voice: 'Deep bass', colour: '#c89184' },
    { planet: 'Uranus', voice: 'Aurora choir', colour: '#91c6e1' },
    { planet: 'Neptune', voice: 'Tidal percussion', colour: '#a9addd' },
  ];
  const MOODS = {
    serene: { name: 'Quiet orbit', shift: 0, degrees: [0, 5, 9, 7] },
    dawn: { name: 'Golden dawn', shift: 2, degrees: [0, 7, 5, 9] },
    eclipse: { name: 'Blue eclipse', shift: -3, degrees: [0, 3, 8, 5] },
  };
  const BASE_MIDI = [84, 76, 72, 67, 64, 48, 79, 42];
  const defaultRows = [
    '1000100010001000', '0010001000100010', '1000000010000010', '0000000000000000',
    '0000000000000000', '1000100010001000', '0000000000000000', '0000000000000000',
  ];
  const asRows = strings => strings.map(s => [...s].map(ch => ch === '1'));
  const presetRows = [
    ['1000100010001000','0010001000100010','1001001010010010','0000100000101000','1000000010000000','1000100010001000','0000001000000010','1000101010001010'],
    ['1010101010101010','0100010001000100','1001001010010010','0001000100010001','1000100010001000','1000100010001000','0000010000000100','1010101010101010'],
    ['1000000010000010','0001000000010000','1000100010001000','0000100000100000','1000001000001000','1000000010000000','0010000000100000','1000000010001000'],
  ];
  const PRESETS = [
    { name: 'Midnight waltz', tempo: 84, mood: 'eclipse', space: 55, swing: 16 },
    { name: 'Little solar dance', tempo: 126, mood: 'dawn', space: 25, swing: 9 },
    { name: 'Tidal echoes', tempo: 96, mood: 'serene', space: 75, swing: 22 },
  ];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));
  function normalise(source = {}) {
    const old = Array.isArray(source.notes) ? source.notes : [];
    return {
      ...source,
      name: typeof source.name === 'string' ? source.name.slice(0, 60) : 'Music for a quiet universe',
      tempo: clamp(source.tempo ?? 92, 60, 160),
      mood: Object.hasOwn(MOODS, source.mood) ? source.mood : 'serene',
      swing: clamp(source.swing ?? 12, 0, 50),
      space: clamp(source.space ?? 35, 0, 80),
      notes: TRACKS.map((_, i) => {
        const sourceRow = Array.isArray(old[i]) ? old[i] : null;
        if (!sourceRow) return old.length ? Array(STEPS).fill(false) : asRows(defaultRows)[i];
        return Array.from({ length: STEPS }, (_, step) => Boolean(sourceRow[step] ?? (sourceRow.length === 8 ? sourceRow[step % 8] : false)));
      }),
      levels: TRACKS.map((_, i) => clamp(source.levels?.[i] ?? (i === 7 ? .65 : .82), 0, 1)),
      mutes: TRACKS.map((_, i) => source.mutes?.[i] === true),
    };
  }
  function preset(index) {
    const i = clamp(index, 0, PRESETS.length - 1);
    return normalise({ ...PRESETS[i], notes: asRows(presetRows[i]) });
  }
  function midi(track, step, mood) {
    const mod = MOODS[mood] || MOODS.serene;
    // A four-chord cycle; the register changes without the player losing the rhythm.
    const degree = mod.degrees[Math.floor((step % STEPS) / 4)];
    const interval = track === 5 || track === 4 ? degree : degree > 7 ? degree - 12 : degree;
    return BASE_MIDI[track] + mod.shift + interval;
  }
  function frequency(track, step, mood) { return 440 * Math.pow(2, (midi(track, step, mood) - 69) / 12); }
  function stepSeconds(music) { return 60 / clamp(music.tempo, 60, 160) / 4; }
  function swingOffset(music, step) { return step % 2 ? stepSeconds(music) * clamp(music.swing, 0, 50) / 100 : 0; }
  function createBus(ctx, music) {
    const master = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
    const echo = ctx.createDelay(1), feedback = ctx.createGain(), filter = ctx.createBiquadFilter();
    const limit = ctx.createDynamicsCompressor();
    master.gain.value = .76; dry.gain.value = 1; wet.gain.value = clamp(music.space, 0, 80) / 100 * .54;
    echo.delayTime.value = .28; feedback.gain.value = .22;
    filter.type = 'lowpass'; filter.frequency.value = 2900;
    master.connect(dry); dry.connect(limit);
    master.connect(echo); echo.connect(filter); filter.connect(wet); wet.connect(limit);
    filter.connect(feedback); feedback.connect(echo);
    limit.threshold.value = -14; limit.knee.value = 10; limit.ratio.value = 3;
    limit.connect(ctx.destination);
    return { input: master, wet, feedback, echo, nodes: [master, dry, wet, echo, feedback, filter, limit] };
  }
  function setSpace(bus, value, at = 0) {
    bus?.wet.gain.setTargetAtTime(clamp(value, 0, 80) / 100 * .54, at, .03);
  }
  const noises = new WeakMap();
  function noise(ctx) {
    if (noises.has(ctx)) return noises.get(ctx);
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .26), ctx.sampleRate);
    const data = buffer.getChannelData(0); let state = 14305923;
    for (let i = 0; i < data.length; i++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; data[i] = state / 2147483648 - 1; }
    noises.set(ctx, buffer); return buffer;
  }
  function voice(ctx, bus, track, when, music, step, velocity = 1) {
    if (music.mutes?.[track] || (music.levels?.[track] ?? 1) <= 0) return;
    const amp = clamp(music.levels?.[track] ?? .82, 0, 1) * clamp(velocity, 0, 1.2);
    const freq = frequency(track, step, music.mood);
    const output = ctx.createGain(); output.gain.value = 1;
    const pan = ctx.createStereoPanner?.();
    if (pan) { pan.pan.value = [-.65, .4, -.2, .62, -.4, 0, .7, .13][track]; output.connect(pan).connect(bus.input); }
    else output.connect(bus.input);
    let active = 0;
    const disconnect = () => { if (--active > 0) return; try { output.disconnect(); pan?.disconnect(); } catch {} };
    function osc(type, ratio, volume, length, attack, decay, detune = 0, glide = 1) {
      const source = ctx.createOscillator(), g = ctx.createGain(); active++;
      source.type = type; source.frequency.setValueAtTime(Math.max(30, freq * ratio), when);
      if (glide !== 1) source.frequency.exponentialRampToValueAtTime(Math.max(30, freq * ratio * glide), when + length);
      source.detune.value = detune;
      g.gain.setValueAtTime(.00001, when); g.gain.linearRampToValueAtTime(Math.max(.00002, volume * amp), when + attack);
      g.gain.exponentialRampToValueAtTime(.00001, when + length);
      source.connect(g).connect(output); source.start(when); source.stop(when + length + .02);
      source.onended = () => { source.disconnect(); g.disconnect(); disconnect(); };
    }
    if (track === 0) { osc('sine', 1, .145, 1.15, .004); osc('sine', 2.01, .07, .5, .004); }
    else if (track === 1) { osc('triangle', 1, .16, .65, .015); osc('sine', 2, .027, .38, .012); }
    else if (track === 2) { osc('sine', 1, .2, .38, .004); osc('sine', 3, .034, .16, .003); }
    else if (track === 3) { osc('triangle', 1, .18, .32, .003, 0, 0, .89); }
    else if (track === 4) { osc('sawtooth', 1, .066, 1.2, .16); osc('sine', 1, .06, 1.4, .2, 0, -5); }
    else if (track === 5) { osc('triangle', 1, .18, .72, .008); osc('sine', .5, .055, .7, .009); }
    else if (track === 6) { osc('sine', 1, .074, 2.3, .35); osc('triangle', 1.005, .037, 2.0, .45, 0, 7); }
    else {
      const drum = ctx.createOscillator(), g = ctx.createGain(); active++;
      drum.type = 'sine'; drum.frequency.setValueAtTime(step % 4 === 0 ? 155 : 245, when);
      drum.frequency.exponentialRampToValueAtTime(step % 4 === 0 ? 45 : 95, when + .15);
      g.gain.setValueAtTime(.19 * amp, when); g.gain.exponentialRampToValueAtTime(.0001, when + .2);
      drum.connect(g).connect(output); drum.start(when); drum.stop(when + .21);
      drum.onended = () => { drum.disconnect(); g.disconnect(); disconnect(); };
      if (step % 4 !== 0) {
        const src = ctx.createBufferSource(), hiss = ctx.createGain(); active++; src.buffer = noise(ctx);
        hiss.gain.setValueAtTime(.055 * amp, when); hiss.gain.exponentialRampToValueAtTime(.0001, when + .11);
        src.connect(hiss).connect(output); src.start(when); src.stop(when + .12);
        src.onended = () => { src.disconnect(); hiss.disconnect(); disconnect(); };
      }
    }
  }
  function wav(buffer) {
    const channels = buffer.numberOfChannels, frames = buffer.length;
    const data = new ArrayBuffer(44 + frames * channels * 2), view = new DataView(data);
    const write = (at, value) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
    write(0, 'RIFF'); view.setUint32(4, data.byteLength - 8, true); write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
    view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, frames * channels * 2, true);
    const samples = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
    let offset = 44;
    for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) {
      const x = Math.max(-1, Math.min(1, samples[c][i])); view.setInt16(offset, Math.round(x * 32767), true); offset += 2;
    }
    return data;
  }
  async function recording(model) {
    const music = normalise(model), rate = 32000, loops = 4;
    const length = stepSeconds(music) * STEPS * loops + 2.5;
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) throw new Error('Offline audio rendering is unsupported');
    const offline = new Offline(2, Math.ceil(length * rate), rate);
    const bus = createBus(offline, music);
    for (let i = 0; i < STEPS * loops; i++) {
      const step = i % STEPS, when = .05 + i * stepSeconds(music) + swingOffset(music, step);
      music.notes.forEach((row, track) => { if (row[step]) voice(offline, bus, track, when, music, step); });
    }
    return wav(await offline.startRendering());
  }
  return { TRACKS, STEPS, MOODS, PRESETS, normalise, preset, stepSeconds, swingOffset, createBus, setSpace, voice, recording };
})();
