'use strict';

// The eight trials of the Grand Tour. Each is a complete little game with the
// same contract: create(container, options) → handle; options.onEnd({won, score}).
window.AetherTrials = (() => {
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared canvas game frame: fixed-timestep sim, capped DPR, cleanup, audio blips.
  function frame(container, width, height, hooks) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    if (hooks.label) canvas.setAttribute('aria-label', hooks.label);
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const abort = new AbortController();
    const listen = (el, type, fn, opts) => el.addEventListener(type, fn, { ...opts, signal: abort.signal });
    let destroyed = false, raf = 0, last = 0, acc = 0, clock = 0, audio, audioGain, sound = hooks.sound !== false;
    const tone = (freq, len = .12, type = 'sine', vol = .07) => {
      if (!sound || destroyed) return;
      try {
        audio ||= new (window.AudioContext || window.webkitAudioContext)();
        if (!audioGain) { audioGain = audio.createGain(); audioGain.gain.value = .6; audioGain.connect(audio.destination); }
        if (audio.state === 'suspended') audio.resume().catch(() => {});
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + len);
        o.connect(g).connect(audioGain); o.start(); o.stop(audio.currentTime + len);
      } catch {}
    };
    const particles = [];
    const burst = (x, y, colour, n = 14, speed = 150) => {
      for (let i = 0; i < (reduced() ? 3 : n); i++) {
        const a = Math.random() * TAU, s = 30 + Math.random() * speed;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .4 + Math.random() * .5, colour, size: 1.5 + Math.random() * 2.5 });
      }
    };
    const drawParticles = dt => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.colour;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const starfield = (seed, n = 46) => {
      let s = seed; const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
      const stars = Array.from({ length: n }, () => ({ x: rand() * width, y: rand() * height, r: .4 + rand() * 1.2, p: rand() * TAU }));
      return () => stars.forEach(star => { ctx.globalAlpha = .3 + Math.sin(clock * 1.4 + star.p) * .2; ctx.fillStyle = '#e9dcae'; ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; });
    };
    function tick(now) {
      if (destroyed) return;
      if (document.hidden) { last = 0; raf = requestAnimationFrame(tick); return; }
      const dt = last ? Math.min(.06, (now - last) / 1000) : 0; last = now;
      acc += dt; clock += dt;
      while (acc >= 1 / 120) { hooks.step?.(1 / 120); acc -= 1 / 120; }
      hooks.draw?.(ctx, dt, clock);
      drawParticles(dt);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return {
      canvas, ctx, listen, tone, burst, particles, drawParticles, starfield,
      get clock() { return clock; },
      destroy() { destroyed = true; cancelAnimationFrame(raf); abort.abort(); audio?.close().catch(() => {}); canvas.remove(); },
    };
  }

  // ── The Sun · Solar Shield ──────────────────────────────────────────────
  // Flares dive at the ship from four sides. Raise the matching shield inside
  // the gold window; the closer to the rim, the brighter the parry.
  function flare(container, options) {
    const W = 900, H = 560;
    const g = frame(container, W, H, { label: 'Solar Shield. Block flares with the matching arrow key or by tapping that side of the sun.', sound: options.sound, step, draw });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(41);
    const scale = options.speedScale || 1;
    let flares = [], spawnAt = 1.2, score = 0, hits = 0, parries = 0, perfect = 0, hull = 3, over = 0;
    const sides = [[450, 60], [840, 280], [450, 500], [60, 280]]; // top right bottom left spawn points
    const keysOf = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
    let shield = -1, shieldAt = -9;
    function end(won) {
      if (over) return; over = 1;
      setTimeout(() => { g.destroy(); options.onEnd({ won, score: Math.round(score) }); }, 600);
    }
    function step(dt) {
      if (over) return;
      if (g.clock > 50) return end(true);
      spawnAt -= dt;
      if (spawnAt <= 0) {
        spawnAt = Math.max(.55, 1.35 - g.clock * .02) / scale;
        const side = Math.floor(Math.random() * 4);
        flares.push({ side, t: 0, speed: (150 + g.clock * 2.4) * scale, x: sides[side][0], y: sides[side][1] });
      }
      for (const f of flares) { if (f.frozen) { f.frozen -= dt; continue; } f.t += dt; }
      const verbs = options.verbs || new Set();
      for (const f of flares) if (!f.frozen && verbs.has('well') && Math.hypot(f.x - 450, f.y - 280) < 150) f.slow = true;
      for (let i = flares.length - 1; i >= 0; i--) {
        const f = flares[i], d = Math.hypot(f.x - 450, f.y - 280), arrive = (d - 92) / f.speed;
        if (arrive <= 0) {
          flares.splice(i, 1);
          const window = verbs.has('gyro') ? .8 : .55;
          if (shield === f.side && g.clock - shieldAt < window) {
            const q = g.clock - shieldAt;
            parries++; if (q > .28) perfect++;
            score += (q > .28 ? 150 : 80) * (verbs.has('parallax') && parries % 5 === 0 ? 2 : 1);
            if (q > .28 && verbs.has('freeze')) flares.forEach(o => o.frozen = 1);
            burst(f.x, f.y, '#f2d38a', 18, 190); tone(q > .28 ? 880 : 660, .1, 'triangle', .06);
          } else {
            hits++; hull--; burst(450, 280, '#f58e9b', 22, 220); tone(140, .25, 'sawtooth', .05);
            if (hull <= 0) end(false);
          }
        }
      }
    }
    function draw(ctx, dt, clock) {
      ctx.fillStyle = '#101812'; ctx.fillRect(0, 0, W, H); stars();
      // The sun
      const sunG = ctx.createRadialGradient(450, 280, 8, 450, 280, 120);
      sunG.addColorStop(0, '#f4dfae'); sunG.addColorStop(.5, '#c9a45c'); sunG.addColorStop(1, '#c9a45c00');
      ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(450, 280, 110, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8cd92'; ctx.beginPath(); ctx.arc(450, 280, 40, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#a8895055'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(450, 280, 40, clock * .4 + i * 2, clock * .4 + i * 2 + 2.4); ctx.stroke(); }
      // Shield window ring
      ctx.setLineDash([3, 9]); ctx.strokeStyle = '#d8c48b44'; ctx.beginPath(); ctx.arc(450, 280, 92, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      // Active shield arc
      if (shield >= 0 && clock - shieldAt < .6) {
        const a = shield * Math.PI / 2 - Math.PI / 2;
        ctx.strokeStyle = clock - shieldAt < .55 ? '#f2d38a' : '#f2d38a44'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(450, 280, 92, a - .55, a + .55); ctx.stroke(); ctx.lineWidth = 1;
      }
      // Flares
      for (const f of flares) {
        const dx = 450 - f.x, dy = 280 - f.y, d = Math.hypot(dx, dy), arrive = (d - 92) / f.speed;
        f.x += dx / d * f.speed * dt; f.y += dy / d * f.speed * dt;
        const warm = arrive < .55;
        ctx.strokeStyle = warm ? '#f5a08c' : '#c9846a'; ctx.lineWidth = warm ? 3.5 : 2;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - dx / d * 26, f.y - dy / d * 26); ctx.stroke();
        ctx.fillStyle = warm ? '#ffd9a8' : '#e09c7e'; ctx.beginPath(); ctx.arc(f.x, f.y, warm ? 5 : 4, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${Math.round(score)}`, 20, 30);
      ctx.textAlign = 'right'; ctx.fillText(`HULL ${'♥'.repeat(hull)}`, W - 20, 30);
      ctx.textAlign = 'center'; ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"';
      ctx.fillText(`${Math.max(0, 50 - clock).toFixed(0)}s of storm left · parries ${parries}${perfect ? ` · ${perfect} perfect` : ''}`, 450, H - 16);
    }
    const raise = side => { shield = side; shieldAt = g.clock; tone(440 + side * 60, .06, 'sine', .04); };
    listen(canvas, 'keydown', e => { const i = keysOf.indexOf(e.key); if (i >= 0) { e.preventDefault(); raise(i); } });
    listen(canvas, 'pointerdown', e => {
      const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W - 450, y = (e.clientY - r.top) / r.height * H - 280;
      raise(Math.abs(x) > Math.abs(y) ? (x > 0 ? 1 : 3) : (y > 0 ? 2 : 0));
    });
    return g;
  }

  // ── The eclipse · Syzygy ────────────────────────────────────────────────
  // Guide the moon over the sun and hold totality while the corona breathes.
  function eclipse(container, options) {
    const W = 900, H = 560;
    let state = { sun: { x: 450, y: 280, r: 58 }, moon: { x: 180, y: 420, r: 40 }, round: 0, hold: 0, best: 0, drift: 0 };
    const scores = [];
    const g = frame(container, W, H, { label: 'Syzygy. Drag the moon over the sun and hold the alignment.', sound: options.sound, step, draw });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(77, 60);
    let pointer = null, over = 0;
    function end(won) {
      if (over) return; over = 1;
      const total = Math.round(scores.reduce((a, b) => a + b, 0));
      setTimeout(() => { g.destroy(); options.onEnd({ won, score: total }); }, 700);
    }
    function step(dt) {
      if (over) return;
      state.drift += dt;
      const verbs = options.verbs || new Set(), driftMul = verbs.has('well') ? .6 : 1;
      state.sun.x = 450 + Math.sin(state.drift * .5 + state.round * 2) * (30 + state.round * 26) * driftMul;
      state.sun.y = 280 + Math.cos(state.drift * .34) * (18 + state.round * 16) * driftMul;
      const cover = 1 - clamp(Math.hypot(state.moon.x - state.sun.x, state.moon.y - state.sun.y) / 130, 0, 1);
      if (cover > .82) {
        state.hold += dt;
        if (state.hold > 2.2) {
          const quality = Math.round(cover * 100 + Math.min(50, state.hold * 8));
          scores.push(quality); burst(state.sun.x, state.sun.y, '#f2d38a', 30, 240);
          tone(660, .3, 'sine', .06); tone(990, .5, 'sine', .04);
          state.round++; state.hold = 0; state.moon = { x: 130 + Math.random() * 120, y: 120 + Math.random() * 320, r: 40 };
          if (state.round >= 3) end(scores.every(s => s > 80));
        }
      } else state.hold = Math.max(0, state.hold - dt * ((options.verbs || new Set()).has('echo') ? 1 : 2));
    }
    function draw(ctx, dt, clock) {
      ctx.fillStyle = '#0e1420'; ctx.fillRect(0, 0, W, H); stars();
      const cover = 1 - clamp(Math.hypot(state.moon.x - state.sun.x, state.moon.y - state.sun.y) / 130, 0, 1);
      // Sun + corona
      ctx.save();
      ctx.globalAlpha = 1 - cover * .8;
      const sg = ctx.createRadialGradient(state.sun.x, state.sun.y, 10, state.sun.x, state.sun.y, 130);
      sg.addColorStop(0, '#f4dfae'); sg.addColorStop(.4, '#c9a45c88'); sg.addColorStop(1, '#c9a45c00');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(state.sun.x, state.sun.y, 130, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ecd397'; ctx.beginPath(); ctx.arc(state.sun.x, state.sun.y, state.sun.r, 0, TAU); ctx.fill();
      ctx.restore();
      // Corona at totality
      if (cover > .82) {
        ctx.strokeStyle = '#f6e6b8'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * TAU + clock * .12, w = 1 + Math.sin(clock * 2.4 + i * 1.7) * .3;
          ctx.globalAlpha = .25 + cover * .6;
          ctx.beginPath(); ctx.moveTo(state.sun.x + Math.cos(a) * 58, state.sun.y + Math.sin(a) * 58);
          ctx.lineTo(state.sun.x + Math.cos(a) * (58 + 44 * w), state.sun.y + Math.sin(a) * (58 + 44 * w)); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // Moon
      const mg = ctx.createRadialGradient(state.moon.x - 12, state.moon.y - 12, 4, state.moon.x, state.moon.y, 44);
      mg.addColorStop(0, '#3c443c'); mg.addColorStop(1, '#141a15');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(state.moon.x, state.moon.y, state.moon.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = cover > .82 ? '#f2d38a' : '#8b917c'; ctx.stroke();
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`TOTALITY ${['Ⅰ', 'Ⅱ', 'Ⅲ'][Math.min(2, state.round)]} · ${scores.join(' · ') || '—'}`, 20, 30);
      ctx.fillStyle = '#d8c48b'; ctx.fillRect(20, H - 30, (W - 40) * clamp(state.hold / 2.2, 0, 1), 4);
      ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center';
      ctx.fillText(cover > .82 ? 'Hold the shadow…' : 'Drag the moon over the sun', 450, H - 16);
    }
    const move = e => {
      const r = canvas.getBoundingClientRect();
      state.moon.x = clamp((e.clientX - r.left) / r.width * W, 30, W - 30);
      state.moon.y = clamp((e.clientY - r.top) / r.height * H, 30, H - 30);
    };
    listen(canvas, 'pointerdown', e => { pointer = e.pointerId; canvas.setPointerCapture(pointer); move(e); });
    listen(canvas, 'pointermove', e => { if (e.pointerId === pointer) move(e); });
    listen(canvas, 'pointerup', e => { if (e.pointerId === pointer) pointer = null; });
    listen(canvas, 'keydown', e => {
      const d = 18;
      if (e.key === 'ArrowLeft') state.moon.x -= d; else if (e.key === 'ArrowRight') state.moon.x += d;
      else if (e.key === 'ArrowUp') state.moon.y -= d; else if (e.key === 'ArrowDown') state.moon.y += d; else return;
      e.preventDefault(); state.moon.x = clamp(state.moon.x, 30, W - 30); state.moon.y = clamp(state.moon.y, 30, H - 30);
    });
    return g;
  }

  // ── The belt · Debris Field ─────────────────────────────────────────────
  function asteroids(container, options) {
    const W = 900, H = 560;
    let ship, rocks, shots, lives, score, wave, invuln, over = 0;
    const scale = options.speedScale || 1;
    function spawnWave() {
      const n = 3 + wave;
      for (let i = 0; i < n; i++) {
        const edge = Math.random() * TAU;
        rocks.push({ x: 450 + Math.cos(edge) * 420, y: 280 + Math.sin(edge) * 260, vx: (Math.random() - .5) * 60 * scale, vy: (Math.random() - .5) * 60 * scale, r: 46, spin: Math.random() * 2 - 1, a: Math.random() * TAU });
      }
    }
    function reset() {
      ship = { x: 450, y: 280, a: -Math.PI / 2, vx: 0, vy: 0 };
      rocks = []; shots = []; lives = 3; score = 0; wave = 0; invuln = 2; spawnWave();
    }
    reset();
    const keys = new Set();
    const g = frame(container, W, H, { label: 'Debris Field. Steer with arrow keys, fire with Space. Break every rock.', sound: options.sound, step, draw });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(99, 70);
    function end(won) { if (over) return; over = 1; setTimeout(() => { g.destroy(); options.onEnd({ won, score: Math.round(score) }); }, 600); }
    function step(dt) {
      if (over) return;
      invuln = Math.max(0, invuln - dt);
      if (keys.has('ArrowLeft')) ship.a -= 3.4 * dt;
      if (keys.has('ArrowRight')) ship.a += 3.4 * dt;
      if (keys.has('ArrowUp')) { ship.vx += Math.cos(ship.a) * 220 * dt; ship.vy += Math.sin(ship.a) * 220 * dt; }
      ship.vx *= Math.exp(-.6 * dt); ship.vy *= Math.exp(-.6 * dt);
      ship.x = (ship.x + ship.vx * dt + W) % W; ship.y = (ship.y + ship.vy * dt + H) % H;
      for (const s of shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
      shots = shots.filter(s => s.life > 0);
      for (const r of rocks) { r.x = (r.x + r.vx * dt + W) % W; r.y = (r.y + r.vy * dt + H) % H; r.a += r.spin * dt; }
      // Shots vs rocks
      for (let i = rocks.length - 1; i >= 0; i--) for (let j = shots.length - 1; j >= 0; j--) {
        const r = rocks[i], s = shots[j];
        if (Math.hypot(r.x - s.x, r.y - s.y) < r.r) {
          shots.splice(j, 1); rocks.splice(i, 1);
          score += r.r > 40 ? 40 : r.r > 24 ? 80 : 140;
          burst(r.x, r.y, '#d8c48b', 14, 170); tone(220 + (50 - r.r) * 4, .1, 'triangle', .06);
          if (r.r > 24) for (let k = 0; k < 2; k++) rocks.push({ x: r.x, y: r.y, vx: r.vx * 1.4 + (Math.random() - .5) * 80, vy: r.vy * 1.4 + (Math.random() - .5) * 80, r: r.r / 1.9, spin: Math.random() * 3 - 1.5, a: 0 });
          break;
        }
      }
      // Rocks vs ship
      if (invuln <= 0) for (const r of rocks) {
        if (Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 10) {
          lives--; invuln = 2.2; burst(ship.x, ship.y, '#f58e9b', 26, 240); tone(120, .3, 'sawtooth', .06);
          ship.x = 450; ship.y = 280; ship.vx = ship.vy = 0;
          if (lives <= 0) end(false);
          break;
        }
      }
      if (!rocks.length) { wave++; if (wave > 2) return end(true); spawnWave(); invuln = Math.max(invuln, 1); }
    }
    function rockPath(ctx, r) {
      ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, w = r.r * (0.8 + Math.sin(i * 2.7 + r.a) * .18); i ? ctx.lineTo(r.x + Math.cos(a) * w, r.y + Math.sin(a) * w) : ctx.moveTo(r.x + Math.cos(a) * w, r.y + Math.sin(a) * w); }
      ctx.closePath();
    }
    function draw(ctx) {
      ctx.fillStyle = '#131a12'; ctx.fillRect(0, 0, W, H); stars();
      for (const r of rocks) { rockPath(ctx, r); ctx.fillStyle = '#3a3126'; ctx.fill(); ctx.strokeStyle = '#8d7f5c'; ctx.stroke(); }
      ctx.fillStyle = '#f2d38a'; for (const s of shots) { ctx.beginPath(); ctx.arc(s.x, s.y, 2.4, 0, TAU); ctx.fill(); }
      // Ship
      if (invuln <= 0 || Math.floor(g.clock * 10) % 2) {
        ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
        ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(-9, -8); ctx.lineTo(-5, 0); ctx.lineTo(-9, 8); ctx.closePath(); ctx.stroke();
        if (keys.has('ArrowUp')) { ctx.strokeStyle = '#f5a08c'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-16 - Math.random() * 6, 0); ctx.stroke(); }
        ctx.restore();
      }
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${Math.round(score)} · WAVE ${wave + 1}/3`, 20, 30);
      ctx.textAlign = 'right'; ctx.fillText('♥'.repeat(lives), W - 20, 30);
    }
    let fireAt = 0;
    listen(canvas, 'keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
      keys.add(e.key);
      if (e.key === ' ' && !e.repeat && g.clock - fireAt > .22) { fireAt = g.clock; shots.push({ x: ship.x + Math.cos(ship.a) * 14, y: ship.y + Math.sin(ship.a) * 14, vx: Math.cos(ship.a) * 420 + ship.vx, vy: Math.sin(ship.a) * 420 + ship.vy, life: 1.1 }); tone(760, .05, 'square', .03); }
    });
    listen(window, 'keyup', e => keys.delete(e.key));
    // Touch: left/right halves steer, tap fires, swipe up thrusts.
    let touchAt = null;
    listen(canvas, 'pointerdown', e => { touchAt = { x: e.clientX, t: g.clock }; canvas.setPointerCapture(e.pointerId); });
    listen(canvas, 'pointermove', e => {
      if (!touchAt) return;
      keys.delete('ArrowLeft'); keys.delete('ArrowRight'); keys.delete('ArrowUp');
      const dx = e.clientX - touchAt.x;
      if (dx < -18) keys.add('ArrowLeft'); else if (dx > 18) keys.add('ArrowRight');
    });
    listen(canvas, 'pointerup', e => {
      keys.delete('ArrowLeft'); keys.delete('ArrowRight');
      if (touchAt && g.clock - touchAt.t < .25) { keys.add('ArrowUp'); setTimeout(() => keys.delete('ArrowUp'), 130); if (g.clock - fireAt > .22) { fireAt = g.clock; shots.push({ x: ship.x + Math.cos(ship.a) * 14, y: ship.y + Math.sin(ship.a) * 14, vx: Math.cos(ship.a) * 420, vy: Math.sin(ship.a) * 420, life: 1.1 }); } }
      touchAt = null;
    });
    return g;
  }

  // ── The comet · Ice Tail ────────────────────────────────────────────────
  function comet(container, options) {
    const W = 900, H = 560;
    const scale = options.speedScale || 1;
    let head = { x: 450, y: 280 }, trail = [], ices = [], score = 0, over = 0, dir = { x: 1, y: 0 }, target = 40, forgiven = false;
    let growClock = 0;
    const g = frame(container, W, H, { label: 'Ice Tail. Steer the comet, gather ice, never cross your own tail.', sound: options.sound, step, draw });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(55, 80);
    const place = () => ices.push({ x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120) });
    place(); place();
    function end(won) { if (over) return; over = 1; setTimeout(() => { g.destroy(); options.onEnd({ won, score: Math.round(score) }); }, 600); }
    function step(dt) {
      if (over) return;
      const speed = (150 + trail.length * 2.2) * scale;
      head.x += dir.x * speed * dt; head.y += dir.y * speed * dt;
      trail.unshift({ x: head.x, y: head.y });
      const max = 26 + Math.floor(score / 60);
      while (trail.length > max) trail.pop();
      growClock += dt;
      const verbs = options.verbs || new Set();
      if (head.x < 20 || head.x > W - 20 || head.y < 20 || head.y > H - 20) {
        if (verbs.has('cinder') && !forgiven) { forgiven = true; head = { x: 450, y: 280 }; trail = []; tone(200, .2, 'sine', .05); return; }
        return end(false);
      }
      for (let i = 14; i < trail.length; i++) if (Math.hypot(trail[i].x - head.x, trail[i].y - head.y) < 12) {
        if (verbs.has('cinder') && !forgiven) { forgiven = true; trail = trail.slice(i); tone(200, .2, 'sine', .05); break; }
        return end(false);
      }
      for (let i = ices.length - 1; i >= 0; i--) {
        if (Math.hypot(ices[i].x - head.x, ices[i].y - head.y) < 20) {
          ices.splice(i, 1); place(); score += (60 + trail.length) * (verbs.has('trail') ? 2 : 1); tone(700 + trail.length * 6, .08, 'sine', .05);
          burst(head.x, head.y, '#bfe3ea', 10, 140);
          if (score >= target * 60) return end(true);
        }
      }
    }
    function draw(ctx, dt, clock) {
      ctx.fillStyle = '#0e1620'; ctx.fillRect(0, 0, W, H); stars();
      // Tail: braided ice
      for (let i = trail.length - 1; i >= 0; i -= 2) {
        const t = i / trail.length;
        ctx.globalAlpha = 1 - t * .9; ctx.fillStyle = i % 4 ? '#9ec7d4' : '#d3ecf2';
        ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, 9 * (1 - t * .55), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const ice of ices) {
        ctx.save(); ctx.translate(ice.x, ice.y); ctx.rotate(clock * .8);
        ctx.strokeStyle = '#bfe3ea'; ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14);
        ctx.fillStyle = '#e6f6fa'; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill(); ctx.restore();
      }
      const cg = ctx.createRadialGradient(head.x - 4, head.y - 4, 1, head.x, head.y, 14);
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, '#8fc3d4');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(head.x, head.y, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`TAIL ${trail.length} · ${Math.round(score)} / ${target * 60}`, 20, 30);
    }
    const keys = new Set();
    function steer() {
      const x = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
      if (x || y) { const l = Math.hypot(x, y); dir = { x: x / l, y: y / l }; }
    }
    listen(canvas, 'keydown', e => { if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(e.key); steer(); } });
    listen(window, 'keyup', e => { keys.delete(e.key); steer(); });
    listen(canvas, 'pointermove', e => {
      const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      const dx = x - head.x, dy = y - head.y; if (Math.hypot(dx, dy) > 24) { const l = Math.hypot(dx, dy); dir = { x: dx / l, y: dy / l }; }
    });
    return g;
  }

  // ── Deep field · a minesweeper sky ──────────────────────────────────────
  function deepfield(container, options) {
    const n = 9, novae = 12;
    container.classList.add('deepfield-board');
    container.style.setProperty('--df', n);
    let grid, revealed, flagged, alive = true, over = 0, safe;
    const rnd = (() => { let s = (Date.now() % 100000) + 7; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();
    do {
      grid = Array.from({ length: n * n }, () => 0); revealed = new Set(); flagged = new Set();
      const spots = new Set(); while (spots.size < novae) spots.add(Math.floor(rnd() * n * n));
      for (const p of spots) grid[p] = -1;
      for (let p = 0; p < n * n; p++) if (grid[p] >= 0) grid[p] = around(p).filter(q => grid[q] === -1).length;
      safe = n * n - novae;
    } while (grid[Math.floor(n * n / 2)] !== 0);
    function around(p) {
      const x = p % n, y = Math.floor(p / n), out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < n && ny >= 0 && ny < n) out.push(ny * n + nx);
      }
      return out;
    }
    const verbs = options.verbs || new Set();
    const status = document.createElement('p'); status.className = 'deepfield-status'; status.setAttribute('role', 'status');
    const board = document.createElement('div'); board.className = 'deepfield-grid'; board.setAttribute('role', 'group'); board.setAttribute('aria-label', 'Deep field survey. Reveal every safe sector; flag the supernovae.');
    container.append(status, board);
    const abort = new AbortController();
    function end(won) {
      if (over) return; over = 1;
      setTimeout(() => { abort.abort(); container.innerHTML = ''; container.classList.remove('deepfield-board'); options.onEnd({ won, score: won ? 400 + novae * 25 : revealed.size * 8 }); }, 800);
    }
    function reveal(p) {
      if (!alive || revealed.has(p) || flagged.has(p)) return;
      revealed.add(p);
      const cell = board.children[p];
      cell.classList.add('revealed'); cell.disabled = true;
      cell.setAttribute('aria-label', `Sector ${p % n + 1}, ${Math.floor(p / n) + 1}: ${grid[p] === -1 ? 'supernova' : grid[p] || 'empty'}`);
      if (grid[p] === -1) { cell.textContent = '✸'; cell.classList.add('nova'); alive = false; status.textContent = 'A supernova. The survey ends here.'; [...board.children].forEach((c, i) => { if (grid[i] === -1) { c.classList.add('revealed', 'nova'); c.textContent = '✸'; } }); end(false); return; }
      if (grid[p] > 0) { cell.textContent = grid[p]; cell.dataset.count = grid[p]; }
      else for (const q of around(p)) reveal(q);
      if (verbs.has('echo') && revealed.size % 1 === 0 && Math.random() < .2) {
        const extra = around(p).find(q => !revealed.has(q) && !flagged.has(q) && grid[q] >= 0);
        if (extra !== undefined) reveal(extra);
      }
      if (verbs.has('parallax') && revealed.size % 5 === 0) {
        const hidden = [...Array(n * n).keys()].filter(q => grid[q] === -1 && !flagged.has(q));
        if (hidden.length) {
          const q = hidden[Math.floor(Math.random() * hidden.length)];
          const c = board.children[q];
          c.classList.add('flagged'); c.textContent = '⚑'; flagged.add(q);
          status.textContent = 'The Parallax Mirror marks a hiding supernova.';
        }
      }
      status.textContent = `${revealed.size} / ${safe} safe sectors charted`;
      if (revealed.size >= safe) { status.textContent = 'The deep field is charted.'; end(true); }
    }
    for (let p = 0; p < n * n; p++) {
      const cell = document.createElement('button');
      cell.className = 'deepfield-cell'; cell.setAttribute('aria-label', `Uncharted sector ${p % n + 1}, ${Math.floor(p / n) + 1}`);
      cell.addEventListener('click', () => reveal(p), { signal: abort.signal });
      cell.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'f') { e.preventDefault(); cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); }
      }, { signal: abort.signal });
      cell.addEventListener('contextmenu', e => { e.preventDefault(); if (revealed.has(p)) return; flagged.has(p) ? flagged.delete(p) : flagged.add(p); cell.classList.toggle('flagged', flagged.has(p)); cell.textContent = flagged.has(p) ? '⚑' : ''; cell.setAttribute('aria-label', `${flagged.has(p) ? 'Flagged' : 'Uncharted'} sector ${p % n + 1}, ${Math.floor(p / n) + 1}`); }, { signal: abort.signal });
      let hold; cell.addEventListener('pointerdown', () => { hold = setTimeout(() => cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })), 450); }, { signal: abort.signal });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) cell.addEventListener(ev, () => clearTimeout(hold), { signal: abort.signal });
      board.appendChild(cell);
    }
    status.textContent = `${novae} supernovae hide in the field. Right-click, long-press, or press F to flag.`;
    return { canvas: board, destroy() { abort.abort(); } };
  }

  // ── The long way round · Free Return ────────────────────────────────────
  // Slingshot: drag from the probe to set its velocity; gravity does the rest.
  function freereturn(container, options) {
    const W = 900, H = 560;
    const planets = [{ x: 560, y: 200, r: 44, m: 52000 }, { x: 330, y: 400, r: 30, m: 24000 }];
    const target = { x: 800, y: 460, r: 34 };
    let probe = { x: 110, y: 110, vx: 0, vy: 0 }, flying = false, trace = [], attempts = 3, aim = null, over = 0, won = false;
    const g = frame(container, W, H, { label: 'Free Return. Drag from the probe to aim a gravity-assist to the target beacon.', sound: options.sound, step, draw });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(31, 60);
    function end(w) { if (over) return; over = 1; won = w; setTimeout(() => { g.destroy(); options.onEnd({ won: w, score: w ? 350 + (3 - attempts) * 150 : 40 }); }, 700); }
    function step(dt) {
      if (over || !flying) return;
      for (let k = 0; k < 3; k++) {
        if ((options.verbs || new Set()).has('well')) {
          const dx = target.x - probe.x, dy = target.y - probe.y, d = Math.hypot(dx, dy) || 1;
          probe.vx += dx / d * 26 * dt; probe.vy += dy / d * 26 * dt;
        }
        for (const p of planets) {
          const dx = p.x - probe.x, dy = p.y - probe.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
          if (d < p.r + 6) { burst(probe.x, probe.y, '#f58e9b', 24, 220); tone(130, .3, 'sawtooth', .06); flying = false; miss('The probe burned up in an atmosphere.'); return; }
          const a = p.m / Math.max(900, d2) * dt / 3;
          probe.vx += dx / d * a * 60; probe.vy += dy / d * a * 60;
        }
        probe.x += probe.vx * dt / 3; probe.y += probe.vy * dt / 3;
      }
      trace.push({ x: probe.x, y: probe.y }); if (trace.length > 900) trace.shift();
      if (Math.hypot(probe.x - target.x, probe.y - target.y) < target.r) { burst(target.x, target.y, '#f2d38a', 30, 250); tone(660, .2); tone(990, .4, 'sine', .05); end(true); }
      if (probe.x < -80 || probe.x > W + 80 || probe.y < -80 || probe.y > H + 80) { flying = false; miss('Lost to the dark. Adjust and try again.'); }
    }
    function miss(msg) {
      attempts--;
      if (attempts <= 0) return end(false);
      setTimeout(() => { probe = { x: 110, y: 110, vx: 0, vy: 0 }; trace = []; }, 900);
      tone(220, .2, 'sine', .04);
    }
    function draw(ctx, dt, clock) {
      ctx.fillStyle = '#101a16'; ctx.fillRect(0, 0, W, H); stars();
      // Target beacon
      ctx.setLineDash([4, 7]); ctx.strokeStyle = '#f2d38a'; ctx.beginPath(); ctx.arc(target.x, target.y, target.r + Math.sin(clock * 2.4) * 4, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#f2d38a'; ctx.beginPath(); ctx.arc(target.x, target.y, 7, 0, TAU); ctx.fill();
      // Planets with gravity wells
      for (const p of planets) {
        const gg = ctx.createRadialGradient(p.x, p.y, p.r, p.x, p.y, p.r * 3.4);
        gg.addColorStop(0, '#c9a45c22'); gg.addColorStop(1, '#c9a45c00');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, TAU); ctx.fill();
        const pg = ctx.createRadialGradient(p.x - p.r * .3, p.y - p.r * .3, 2, p.x, p.y, p.r * 1.2);
        pg.addColorStop(0, '#e8d5a3'); pg.addColorStop(.6, '#a8895c'); pg.addColorStop(1, '#3d3220');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        ctx.setLineDash([2, 6]); ctx.strokeStyle = '#c9a45c55'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.1, clock * .3, clock * .3 + TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      // Trace + probe
      if (trace.length > 1) { ctx.strokeStyle = '#9ec7d4aa'; ctx.beginPath(); trace.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
      if (!flying && !over) {
        ctx.fillStyle = '#d3ecf2'; ctx.beginPath(); ctx.arc(probe.x, probe.y, 7, 0, TAU); ctx.fill();
        if (aim) {
          ctx.strokeStyle = '#f2d38a'; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(probe.x, probe.y);
          ctx.lineTo(probe.x + aim.vx * .8, probe.y + aim.vy * .8); ctx.stroke(); ctx.setLineDash([]);
        }
      } else if (!over) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(probe.x, probe.y, 4.5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`ATTEMPTS ${'◆'.repeat(attempts)}`, 20, 30);
      ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center';
      if (!flying && !over) ctx.fillText('Drag from the probe to set its course. The wells bend everything.', 450, H - 16);
    }
    listen(canvas, 'pointerdown', e => {
      if (flying || over) return;
      const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      if (Math.hypot(x - probe.x, y - probe.y) < 70) aim = { vx: 0, vy: 0, on: true };
    });
    listen(canvas, 'pointermove', e => {
      if (!aim?.on) return;
      const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      aim.vx = clamp((x - probe.x) * 2.2, -360, 360); aim.vy = clamp((y - probe.y) * 2.2, -360, 360);
    });
    listen(canvas, 'pointerup', () => {
      if (!aim?.on) return;
      if (Math.hypot(aim.vx, aim.vy) > 40) { probe.vx = aim.vx; probe.vy = aim.vy; flying = true; tone(500, .12, 'sine', .05); }
      aim = null;
    });
    return g;
  }

  // ── The descent · a careful landing ─────────────────────────────────────
  function lander(container, options) {
    const W = 900, H = 560;
    const pad = { x: 620, w: 110 };
    let craft = { x: 170, y: 90, vx: 30, vy: 0, a: 0 }, fuel = 100, over = 0, dust = [], forgiven = false;
    const g = frame(container, W, H, { label: 'The Descent. Rotate with arrow keys, thrust with Up or Space. Land gently on the pad.', sound: options.sound, step, draw });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(83, 44);
    const keys = new Set();
    function end(won, note) {
      if (over) return; over = 1;
      setTimeout(() => { g.destroy(); options.onEnd({ won, score: won ? Math.round(300 + fuel * 3) : 30 }); }, 900);
    }
    function step(dt) {
      if (over) return;
      if (keys.has('ArrowLeft')) craft.a -= 2.6 * dt;
      if (keys.has('ArrowRight')) craft.a += 2.6 * dt;
      const thrusting = (keys.has('ArrowUp') || keys.has(' ')) && fuel > 0;
      if (thrusting) {
        fuel = Math.max(0, fuel - 16 * dt * ((options.verbs || new Set()).has('gyro') ? .75 : 1));
        craft.vx += Math.sin(craft.a) * 130 * dt; craft.vy -= Math.cos(craft.a) * 130 * dt;
        if (Math.random() < .5) dust.push({ x: craft.x - Math.sin(craft.a) * 12, y: craft.y + Math.cos(craft.a) * 12, life: .5 });
      }
      craft.vy += 42 * dt; // thin air, patient gravity
      craft.vx *= Math.exp(-.04 * dt);
      craft.x += craft.vx * dt; craft.y += craft.vy * dt;
      dust.forEach(d => d.life -= dt); dust = dust.filter(d => d.life > 0);
      const ground = 508;
      const verbs = options.verbs || new Set();
      if (craft.y > ground - 12) {
        const onPad = craft.x > pad.x && craft.x < pad.x + pad.w;
        const gentle = Math.abs(craft.vy) < 26 && Math.abs(craft.vx) < 18 && Math.abs(craft.a) < .3;
        if (onPad && gentle) { burst(craft.x, ground - 14, '#f2d38a', 26, 160); tone(660, .3, 'sine', .06); end(true); }
        else if (verbs.has('cinder') && !forgiven) {
          forgiven = true; craft.y = ground - 14; craft.vy = -Math.abs(craft.vy) * .45; craft.vx *= .5;
          burst(craft.x, ground - 8, '#f2a66c', 24, 200); tone(220, .25, 'triangle', .05);
        }
        else { burst(craft.x, ground - 8, '#f58e9b', 30, 220); tone(110, .4, 'sawtooth', .06); end(false); }
      }
      if (craft.x < -40 || craft.x > W + 40) { craft.x = clamp(craft.x, -40, W + 40); craft.vx = 0; }
    }
    function draw(ctx, dt, clock) {
      ctx.fillStyle = '#181110'; ctx.fillRect(0, 0, W, H); stars();
      // Terrain
      ctx.fillStyle = '#4a2e1e';
      ctx.beginPath(); ctx.moveTo(0, 508);
      for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 508 - (x === pad.x ? 0 : Math.sin(x * .021) * 16 + Math.sin(x * .007) * 22) + (x >= pad.x && x <= pad.x + pad.w ? 0 : 0));
      ctx.lineTo(W, 508); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      // Pad
      ctx.fillStyle = '#3d3220'; ctx.fillRect(pad.x - 6, 500, pad.w + 12, 10);
      ctx.strokeStyle = '#f2d38a'; ctx.setLineDash([6, 5]); ctx.strokeRect(pad.x - 6, 500, pad.w + 12, 10); ctx.setLineDash([]);
      for (const d of dust) { ctx.globalAlpha = d.life; ctx.fillStyle = '#d9a86c'; ctx.fillRect(d.x, d.y, 3, 3); } ctx.globalAlpha = 1;
      // Craft
      ctx.save(); ctx.translate(craft.x, craft.y); ctx.rotate(craft.a);
      ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(0, -13); ctx.lineTo(9, 8); ctx.lineTo(4, 8); ctx.lineTo(6, 13); ctx.lineTo(-6, 13); ctx.lineTo(-4, 8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.stroke();
      if ((keys.has('ArrowUp') || keys.has(' ')) && fuel > 0) { ctx.strokeStyle = '#f5a08c'; ctx.beginPath(); ctx.moveTo(-3, 13); ctx.lineTo(0, 20 + Math.random() * 7); ctx.lineTo(3, 13); ctx.stroke(); }
      ctx.restore();
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`FUEL ${Math.round(fuel)}%`, 20, 30);
      ctx.textAlign = 'right';
      const ok = Math.abs(craft.vy) < 26 && Math.abs(craft.vx) < 18;
      ctx.fillStyle = ok ? '#9ed7c6' : '#f5a08c';
      ctx.fillText(`↓${Math.abs(craft.vy).toFixed(0)} →${Math.abs(craft.vx).toFixed(0)}`, W - 20, 30);
      ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center';
      ctx.fillText('Land on the pad: slow, level, kind.', 450, H - 16);
    }
    listen(canvas, 'keydown', e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) { e.preventDefault(); keys.add(e.key); } });
    listen(window, 'keyup', e => keys.delete(e.key));
    listen(canvas, 'pointerdown', e => { const r = canvas.getBoundingClientRect(); (e.clientX - r.left) / r.width < .5 ? keys.add('ArrowLeft') : keys.add('ArrowRight'); keys.add('ArrowUp'); });
    listen(canvas, 'pointerup', () => { keys.delete('ArrowLeft'); keys.delete('ArrowRight'); keys.delete('ArrowUp'); });
    return g;
  }

  // ── The rings · Shepherd ────────────────────────────────────────────────
  function shepherd(container, options) {
    const W = 900, H = 560;
    const scale = options.speedScale || 1;
    let moonlets = [], paddle = { y: 280 }, escapes = 0, score = 0, saved = 0, over = 0, spawnAt = 0, clockLocal = 0;
    const g = frame(container, W, H, { label: 'Shepherd. Keep the moonlets inside the ring with your paddle.', sound: options.sound, step, draw });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(66, 60);
    function end(won) { if (over) return; over = 1; setTimeout(() => { g.destroy(); options.onEnd({ won, score: Math.round(score) }); }, 600); }
    function step(dt) {
      if (over) return;
      clockLocal += dt;
      if (clockLocal > 60) return end(true);
      spawnAt -= dt;
      if (spawnAt <= 0) {
        spawnAt = Math.max(1.1, 2.6 - clockLocal * .035) / scale;
        const fromLeft = Math.random() < .5;
        moonlets.push({ x: fromLeft ? -20 : W + 20, y: 120 + Math.random() * 320, vx: (fromLeft ? 1 : -1) * (110 + clockLocal * 2.6) * scale, vy: (Math.random() - .5) * 40 });
      }
      for (let i = moonlets.length - 1; i >= 0; i--) {
        const m = moonlets[i];
        m.x += m.vx * dt; m.y += m.vy * dt;
        // Ring band soft gravity
        if (m.y < 130) m.vy += 60 * dt; if (m.y > 430) m.vy -= 60 * dt;
        // Paddles
        for (const side of [0, 1]) {
          const px = side ? W - 60 : 60;
          const reach = (options.verbs || new Set()).has('gyro') ? 68 : 52;
          if (Math.abs(m.x - px) < 16 && Math.abs(m.y - paddle.y) < reach && Math.sign(m.vx) === (side ? 1 : -1)) {
            m.vx = -m.vx * 1.04; m.vy += (m.y - paddle.y) * 2.4;
            saved++; score += 40; tone(520, .07, 'sine', .045); burst(px, m.y, '#e6c58b', 8, 120);
            if ((options.verbs || new Set()).has('chain')) {
              const other = moonlets.find(o => o !== m && Math.abs(o.x - px) < 220);
              if (other) { other.vx = -other.vx * 1.1; burst(other.x, other.y, '#9ed7ec', 6, 90); tone(840, .05, 'square', .02); }
            }
          }
        }
        if (m.x < -50 || m.x > W + 50) {
          moonlets.splice(i, 1); escapes++; score = Math.max(0, score - 60);
          tone(180, .2, 'sawtooth', .04);
          if (escapes >= 3) return end(false);
        }
      }
    }
    function draw(ctx, dt, clock) {
      ctx.fillStyle = '#12180f'; ctx.fillRect(0, 0, W, H); stars();
      // Ring band
      ctx.fillStyle = '#c6b18708'; ctx.fillRect(0, 120, W, 310);
      ctx.strokeStyle = '#c6b18733'; ctx.setLineDash([2, 8]);
      ctx.beginPath(); ctx.moveTo(0, 120); ctx.lineTo(W, 120); ctx.moveTo(0, 430); ctx.lineTo(W, 430); ctx.stroke(); ctx.setLineDash([]);
      // Paddles
      for (const px of [60, W - 60]) {
        const pg = ctx.createLinearGradient(px, paddle.y - 52, px, paddle.y + 52);
        pg.addColorStop(0, '#e6c58b'); pg.addColorStop(1, '#8a784e');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(px - 7, paddle.y - 52, 14, 104, 7); ctx.fill();
      }
      for (const m of moonlets) {
        const mg = ctx.createRadialGradient(m.x - 3, m.y - 3, 1, m.x, m.y, 12);
        mg.addColorStop(0, '#fff'); mg.addColorStop(1, '#c6b187');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m.x, m.y, 9, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`SAVED ${saved} · ${Math.round(score)}`, 20, 30);
      ctx.textAlign = 'right'; ctx.fillStyle = escapes ? '#f5a08c' : '#b7bda4';
      ctx.fillText(`ESCAPES ${'☄'.repeat(escapes) || '—'}`, W - 20, 30);
      ctx.fillStyle = '#b7bda4'; ctx.textAlign = 'center'; ctx.font = '11px "DM Sans"';
      ctx.fillText(`${Math.max(0, 60 - clockLocal).toFixed(0)}s · the ring holds what you return to it`, 450, H - 16);
    }
    listen(canvas, 'pointermove', e => { const r = canvas.getBoundingClientRect(); paddle.y = clamp((e.clientY - r.top) / r.height * H, 130, 430); });
    const keys = new Set();
    listen(canvas, 'keydown', e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); keys.add(e.key); } });
    listen(window, 'keyup', e => keys.delete(e.key));
    const keyStep = () => { if (keys.has('ArrowUp')) paddle.y = clamp(paddle.y - 7, 130, 430); if (keys.has('ArrowDown')) paddle.y = clamp(paddle.y + 7, 130, 430); };
    const keyTimer = setInterval(keyStep, 16);
    const origDestroy = g.destroy;
    g.destroy = () => { clearInterval(keyTimer); origDestroy(); };
    return g;
  }

  const list = [
    { id: 'flare', name: 'Solar Shield', place: 'The Sun', brief: 'Flares dive at the ship. Raise the matching shield inside the gold window.' },
    { id: 'eclipse', name: 'Syzygy', place: 'The alignment', brief: 'Drag the moon over the sun and hold totality three times.' },
    { id: 'asteroids', name: 'Debris Field', place: 'The belt', brief: 'Steer, fire, and break every rock in three waves.' },
    { id: 'comet', name: 'Ice Tail', place: 'A comet', brief: 'Gather ice. Grow glorious. Never cross your own tail.' },
    { id: 'deepfield', name: 'Deep Field', place: 'The deep sky', brief: 'Chart every safe sector; flag the hiding supernovae.' },
    { id: 'freereturn', name: 'Free Return', place: 'The wells', brief: 'Aim one slingshot through bending gravity to reach the beacon.' },
    { id: 'lander', name: 'The Descent', place: 'A thin sky', brief: 'Rotate, feather the thrust, and set down gently on the pad.' },
    { id: 'shepherd', name: 'Shepherd', place: 'The ring band', brief: 'Return every moonlet that drifts toward the edge.' },
  ];
  const creators = { flare, eclipse, asteroids, comet, deepfield, freereturn, lander, shepherd };
  // Extension point: additional trial files self-register their games here.
  function register(def) {
    if (!def?.id || creators[def.id]) return;
    list.push({ id: def.id, name: def.name, place: def.place, brief: def.brief });
    creators[def.id] = def.create;
  }
  return {
    list,
    create(id, container, options = {}) {
      return creators[id](container, { sound: options.sound !== false, speedScale: options.speedScale || 1, verbs: options.verbs || new Set(), onEnd: options.onEnd || (() => {}) });
    },
    register,
    // Shared machinery for registered trials: fixed-timestep canvas frame,
    // particles, tones, starfields — the house machinery.
    frame, TAU, clamp, reduced,
  };
})();
