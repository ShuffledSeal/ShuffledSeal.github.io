'use strict';

// Two further trials of the Grand Tour, self-registered with the house
// machinery in trials.js: an optical-routing instrument and a blink
// comparator. Same contract as ever: create(container, options) → handle;
// options.onEnd({won, score}) fires exactly once.
(() => {
  const T = window.AetherTrials;
  const { TAU, clamp, reduced } = T;
  const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ'];

  // ── The old instrument · The Umbra Terminal ─────────────────────────
  // Route one beam of light across a 7×5 bed of glass. Mirrors turn the
  // beam 90°; prisms split one beam into two, each leaving at a right
  // angle. Every receiver on the rim must sing. Three schematics.
  function terminal(container, options) {
    const W = 900, H = 560, COLS = 7, ROWS = 5, CELL = 64, GX = 236, GY = 100;
    const verbs = options.verbs || new Set();
    const schematics = [
      { name: 'Calibration', source: 2, receivers: ['T:4'], tray: { mirror: 2, prism: 0 } },
      { name: 'Second harmonic', source: 2, receivers: ['R:0', 'R:4'], tray: { mirror: 3, prism: 1 } },
      { name: 'The full chord', source: 2, receivers: ['T:5', 'R:3', 'R:4'], tray: { mirror: 4, prism: 2 } },
    ];
    const engageRect = { x: 360, y: 484, w: 180, h: 42 };
    const slots = { mirror: { x: 40, y: 118, w: 140, h: 66 }, prism: { x: 40, y: 200, w: 140, h: 66 } };
    let level = 0, score = 0, reserve = 300, over = 0;
    let placed = new Map(), tray = { mirror: 0, prism: 0 }, selected = 'mirror';
    let cursor = { x: 3, y: 2 }, hover = null, hoverSpot = null;
    let phase = 'build', run = null, ghost = null, lit = new Set(), afterT = 0;
    let banner = null, note = null;
    const g = T.frame(container, W, H, {
      label: 'The Umbra Terminal. Route the beam to every receiver. Arrow keys move the cursor, 1 and 2 choose mirror or prism, Enter places or turns a piece, E engages the beam.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst } = g;
    const key = (x, y) => `${x},${y}`;
    const center = (x, y) => ({ x: GX + x * CELL + CELL / 2, y: GY + y * CELL + CELL / 2 });
    const say = t => canvas.setAttribute('aria-label', t);

    function receiverPos(id) {
      const [side, n] = id.split(':');
      return side === 'R'
        ? { x: GX + COLS * CELL + 16, y: center(0, +n).y }
        : { x: center(+n, 0).x, y: GY - 16 };
    }
    function loadLevel(i) {
      const sch = schematics[i];
      placed = new Map(); lit = new Set(); run = null; ghost = null; phase = 'build';
      tray = { mirror: sch.tray.mirror, prism: sch.tray.prism + (verbs.has('split') ? 1 : 0) };
      selected = tray.mirror ? 'mirror' : 'prism';
      cursor = { x: 3, y: sch.source };
      banner = { text: `Schematic ${ROMAN[i]} · ${sch.name}`, from: g.clock, until: g.clock + 1.8 };
      say(`Schematic ${i + 1} of 3: ${sch.name}. ${sch.receivers.length} receiver${sch.receivers.length > 1 ? 's' : ''} to light.`);
    }
    // Walk the beam cell by cell. Segments carry start/end times so split
    // beams animate in parallel when ENGAGE runs.
    function trace() {
      const sch = schematics[level];
      const speed = 460 * (options.speedScale || 1);
      const segs = [], visited = new Set();
      let dur = 0;
      const queue = [{ x: -1, y: sch.source, dx: 1, dy: 0, px: GX, py: center(0, sch.source).y, t: 0 }];
      const seg = (x1, y1, x2, y2, t, receiver) => {
        const s = { x1, y1, x2, y2, t0: t, t1: t + (Math.abs(x2 - x1) + Math.abs(y2 - y1)) / speed, receiver };
        segs.push(s); dur = Math.max(dur, s.t1);
      };
      while (queue.length) {
        const b = queue.shift();
        let guard = 0;
        while (guard++ < 300) {
          const nx = b.x + b.dx, ny = b.y + b.dy;
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
            const c = center(b.x, b.y), ex = c.x + b.dx * CELL / 2, ey = c.y + b.dy * CELL / 2;
            const id = b.dx === 1 ? `R:${b.y}` : b.dy === -1 ? `T:${b.x}` : null;
            seg(b.px, b.py, ex, ey, b.t, id && sch.receivers.includes(id) ? id : null);
            break;
          }
          const k = `${nx},${ny},${b.dx},${b.dy}`;
          if (visited.has(k)) { // the beam loops back on itself; it dies here
            const c = center(nx, ny);
            seg(b.px, b.py, c.x, c.y, b.t, null);
            break;
          }
          visited.add(k);
          const piece = placed.get(key(nx, ny));
          if (!piece) { b.x = nx; b.y = ny; continue; }
          const c = center(nx, ny);
          seg(b.px, b.py, c.x, c.y, b.t, null);
          b.px = c.x; b.py = c.y; b.x = nx; b.y = ny; b.t = segs[segs.length - 1].t1;
          if (piece.type === 'mirror') {
            // ori 0 is '/', ori 1 is '\'
            const dx = piece.ori === 0 ? -b.dy : b.dy;
            const dy = piece.ori === 0 ? -b.dx : b.dx;
            b.dx = dx; b.dy = dy;
          } else {
            // prism: two beams out, each turned 90° from the way in
            queue.push({ x: b.x, y: b.y, dx: -b.dy, dy: b.dx, px: b.px, py: b.py, t: b.t });
            queue.push({ x: b.x, y: b.y, dx: b.dy, dy: -b.dx, px: b.px, py: b.py, t: b.t });
            break;
          }
        }
      }
      return { segs, dur };
    }
    function engage() {
      if (phase !== 'build') return;
      run = { ...trace(), start: g.clock, fired: new Set() };
      phase = 'run'; lit = new Set();
      tone(330, .12, 'triangle', .05); tone(494, .16, 'sine', .04);
      say('The beam is engaged.');
    }
    function activateCell(x, y) {
      if (phase !== 'build') return;
      const k = key(x, y), existing = placed.get(k);
      if (existing) {
        existing.ori = (existing.ori + 1) % 2;
        tone(existing.type === 'mirror' ? 620 : 540, .05, 'triangle', .04);
        say(`${existing.type} at column ${x + 1}, row ${y + 1} turned.`);
        return;
      }
      if (tray[selected] <= 0) {
        tone(180, .1, 'sine', .04);
        note = { text: `No ${selected} left in the tray.`, until: g.clock + 1.6 };
        return;
      }
      placed.set(k, { type: selected, ori: 0 }); tray[selected]--;
      tone(520, .06, 'sine', .05);
      say(`${selected} placed at column ${x + 1}, row ${y + 1}.`);
    }
    function removeAt(x, y) {
      if (phase !== 'build') return;
      const k = key(x, y), p = placed.get(k);
      if (!p) return;
      placed.delete(k); tray[p.type]++;
      tone(260, .06, 'sine', .04);
      say(`${p.type} lifted from column ${x + 1}, row ${y + 1}.`);
    }
    function end(won) {
      if (over) return; over = 1;
      setTimeout(() => { g.destroy(); options.onEnd({ won, score: Math.round(score) }); }, 900);
    }
    function step(dt) {
      if (over) return;
      reserve = Math.max(0, reserve - dt);
      if (reserve <= 0) { say('The aether reserve is spent.'); return end(false); }
      if (phase === 'run' && run) {
        const el = g.clock - run.start;
        for (const s of run.segs) {
          if (s.receiver && el >= s.t1 && !run.fired.has(s)) {
            run.fired.add(s); lit.add(s.receiver);
            tone(620 + lit.size * 110, .18, 'sine', .06);
            const p = receiverPos(s.receiver);
            burst(p.x, p.y, '#f2d38a', 16, 150);
          }
        }
        if (el > run.dur + .5) {
          const need = schematics[level].receivers;
          if (need.every(id => lit.has(id))) {
            const gain = 150 + 50 * (tray.mirror + tray.prism);
            score += gain;
            tone(523, .25, 'sine', .06); tone(659, .35, 'sine', .05); tone(784, .5, 'sine', .04);
            for (const id of need) { const p = receiverPos(id); burst(p.x, p.y, '#f2d38a', 20, 170); }
            note = { text: `Every receiver sings. +${gain}`, until: g.clock + 2 };
            phase = 'after'; afterT = 1.7;
            say(`Schematic ${level + 1} of 3 solved.`);
          } else {
            tone(190, .3, 'sawtooth', .05);
            lit = new Set();
            if (verbs.has('echo')) ghost = { segs: run.segs, until: g.clock + 2.8 };
            run = null; phase = 'build';
            note = { text: 'The beam dies in the dark — adjust the glass.', until: g.clock + 2.6 };
            say('The beam faded before every receiver sang. Adjust the pieces and engage again.');
          }
        }
      } else if (phase === 'after') {
        afterT -= dt;
        if (afterT <= 0) {
          if (level >= schematics.length - 1) {
            score += Math.round(reserve) * 2;
            return end(true);
          }
          level++; loadLevel(level);
        }
      }
    }
    function drawPiece(ctx, x, y, piece, alpha) {
      const c = center(x, y);
      ctx.save(); ctx.translate(c.x, c.y); ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#c4ac7944'; ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.stroke();
      if (piece.type === 'mirror') {
        ctx.rotate(piece.ori ? Math.PI / 4 : -Math.PI / 4);
        ctx.strokeStyle = '#8a784e'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke();
        ctx.strokeStyle = '#f2d38a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke();
      } else {
        ctx.rotate(piece.ori * Math.PI / 2);
        ctx.fillStyle = '#9ed7c62a'; ctx.strokeStyle = '#9ed7c6';
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(14, 10); ctx.lineTo(-14, 10); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d3ecf2'; ctx.beginPath(); ctx.arc(0, 1, 2.4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    function drawSlot(ctx, type) {
      const r = slots[type], n = tray[type], active = selected === type;
      ctx.save();
      if (n <= 0) ctx.globalAlpha = .45;
      ctx.fillStyle = active ? '#c4ac791c' : '#c4ac790a';
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 6); ctx.fill();
      ctx.strokeStyle = active ? '#e9dcae' : '#c4ac7955'; ctx.stroke();
      ctx.translate(r.x + 32, r.y + r.h / 2);
      if (type === 'mirror') {
        ctx.rotate(-Math.PI / 4);
        ctx.strokeStyle = '#8a784e'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
        ctx.strokeStyle = '#f2d38a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
      } else {
        ctx.fillStyle = '#9ed7c62a'; ctx.strokeStyle = '#9ed7c6';
        ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      if (n <= 0) ctx.globalAlpha = .45;
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 12px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(type === 'mirror' ? 'MIRROR' : 'PRISM', r.x + 58, r.y + 26);
      ctx.fillStyle = n ? '#c4ac79' : '#f58e9b'; ctx.font = '13px "DM Sans"';
      ctx.fillText(`× ${n}`, r.x + 58, r.y + 46);
      ctx.restore();
    }
    function draw(ctx, dt, clock) {
      const sch = schematics[level];
      ctx.fillStyle = '#0e1410'; ctx.fillRect(0, 0, W, H);
      // Engraved plates
      ctx.fillStyle = '#101812';
      ctx.beginPath(); ctx.roundRect(GX - 28, GY - 36, COLS * CELL + 56, ROWS * CELL + 76, 8); ctx.fill();
      ctx.strokeStyle = '#c4ac7933'; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(24, GY - 36, 172, ROWS * CELL + 76, 8); ctx.fill(); ctx.stroke();
      // The bed of glass
      ctx.strokeStyle = '#c4ac7914'; ctx.beginPath();
      for (let i = 0; i <= COLS; i++) { ctx.moveTo(GX + i * CELL, GY); ctx.lineTo(GX + i * CELL, GY + ROWS * CELL); }
      for (let j = 0; j <= ROWS; j++) { ctx.moveTo(GX, GY + j * CELL); ctx.lineTo(GX + COLS * CELL, GY + j * CELL); }
      ctx.stroke();
      ctx.fillStyle = '#c4ac7930';
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
        const c = center(x, y); ctx.beginPath(); ctx.arc(c.x, c.y, 1.4, 0, TAU); ctx.fill();
      }
      // Hover preview + keyboard cursor
      if (phase === 'build') {
        if (hover) {
          ctx.fillStyle = '#e9dcae0a';
          ctx.fillRect(GX + hover.x * CELL, GY + hover.y * CELL, CELL, CELL);
          if (!placed.has(key(hover.x, hover.y)) && tray[selected] > 0)
            drawPiece(ctx, hover.x, hover.y, { type: selected, ori: 0 }, .35);
        }
        const c = center(cursor.x, cursor.y), s = CELL / 2 - 5, a = 10;
        ctx.strokeStyle = '#e9dcaeaa'; ctx.beginPath();
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
          ctx.moveTo(c.x + sx * (s - a), c.y + sy * s);
          ctx.lineTo(c.x + sx * s, c.y + sy * s);
          ctx.lineTo(c.x + sx * s, c.y + sy * (s - a));
        }
        ctx.stroke();
      }
      // The source
      const sy2 = center(0, sch.source).y, live = phase !== 'build';
      ctx.fillStyle = '#c4ac79'; ctx.beginPath(); ctx.arc(GX - 16, sy2, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = live ? '#fff3cf' : '#f2d38a'; ctx.beginPath(); ctx.arc(GX - 16, sy2, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#f2d38a66'; ctx.beginPath(); ctx.moveTo(GX - 7, sy2); ctx.lineTo(GX, sy2); ctx.stroke();
      // Ghost of the last attempt (the Echo Glass)
      if (ghost && clock < ghost.until) {
        ctx.strokeStyle = `rgba(242,211,138,${clamp((ghost.until - clock) / 2.8, 0, 1) * .45})`;
        ctx.setLineDash([7, 8]); ctx.lineWidth = 2; ctx.beginPath();
        for (const s of ghost.segs) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
        ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      }
      // Placed glass
      for (const [k, p] of placed) {
        const [x, y] = k.split(',').map(Number);
        drawPiece(ctx, x, y, p, 1);
      }
      // The beam itself
      if (run) {
        const el = clock - run.start, flicker = reduced() ? 1 : .85 + Math.sin(clock * 9) * .15;
        ctx.lineCap = 'round';
        for (const s of run.segs) {
          const f = clamp((el - s.t0) / Math.max(1e-6, s.t1 - s.t0), 0, 1);
          if (f <= 0) continue;
          const hx = s.x1 + (s.x2 - s.x1) * f, hy = s.y1 + (s.y2 - s.y1) * f;
          ctx.globalAlpha = flicker;
          ctx.strokeStyle = '#f2d38a2e'; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.strokeStyle = '#f2d38a'; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(hx, hy); ctx.stroke();
          if (f < 1) { ctx.fillStyle = '#fff3cf'; ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, TAU); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
        ctx.lineWidth = 1; ctx.lineCap = 'butt';
      }
      // Receivers on the rim
      sch.receivers.forEach((id, i) => {
        const p = receiverPos(id), on = lit.has(id);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = on ? '#f2d38a' : '#c4ac7966';
        ctx.strokeRect(-6, -6, 12, 12);
        if (on) { ctx.fillStyle = '#f2d38a'; ctx.fillRect(-6, -6, 12, 12); }
        ctx.restore();
        if (on) {
          const pulse = reduced() ? .1 : .1 + Math.sin(clock * 3 + i) * .05;
          ctx.fillStyle = `rgba(242,211,138,${pulse})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, TAU); ctx.fill();
          ctx.fillStyle = '#f2d38a'; ctx.font = '12px serif'; ctx.textAlign = 'center';
          ctx.fillText('♪', p.x, p.y - 16 - (reduced() ? 0 : Math.sin(clock * 2 + i * 2) * 2));
        }
      });
      // Tray
      ctx.fillStyle = '#c4ac79'; ctx.font = '600 12px "DM Sans"'; ctx.textAlign = 'center';
      ctx.fillText('T R A Y', 110, GY - 14);
      drawSlot(ctx, 'mirror'); drawSlot(ctx, 'prism');
      ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'left';
      ['1 · 2 — choose glass', 'click a cell — place', 'click glass — turn', 'right-click — lift', 'E — engage the beam']
        .forEach((h, i) => ctx.fillText(h, 40, 316 + i * 20));
      // ENGAGE
      const ready = phase === 'build';
      ctx.fillStyle = ready && hoverSpot === 'engage' ? '#c4ac7926' : '#c4ac7910';
      ctx.beginPath(); ctx.roundRect(engageRect.x, engageRect.y, engageRect.w, engageRect.h, 6); ctx.fill();
      ctx.strokeStyle = ready ? '#e9dcae' : '#c4ac7944'; ctx.stroke();
      ctx.fillStyle = ready ? '#e9dcae' : '#c4ac7977';
      ctx.font = '18px Cormorant, serif'; ctx.textAlign = 'center';
      ctx.fillText('E N G A G E', engageRect.x + engageRect.w / 2, engageRect.y + 27);
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${Math.round(score)}`, 24, 34);
      ctx.textAlign = 'right';
      ctx.fillStyle = reserve < 60 ? '#f58e9b' : '#e9dcae';
      ctx.fillText(`AETHER ${Math.ceil(reserve)}`, W - 24, 34);
      ctx.fillStyle = reserve < 60 ? '#f58e9b' : '#c4ac79';
      const bw = 150 * clamp(reserve / 300, 0, 1);
      ctx.fillRect(W - 24 - bw, 42, bw, 3);
      ctx.fillStyle = '#e9dcae'; ctx.font = '24px Cormorant, serif'; ctx.textAlign = 'center';
      ctx.fillText('The Umbra Terminal', 450, 34);
      ctx.fillStyle = '#b7bda4'; ctx.font = '12px "DM Sans"';
      ctx.fillText(`schematic ${ROMAN[level]} · ${sch.name} · ${lit.size}/${sch.receivers.length} receivers`, 450, 54);
      // Banner + notes
      if (banner && clock < banner.until) {
        const a = clamp(Math.min(clock - banner.from, banner.until - clock) * 2.4, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#0e1410dd';
        ctx.beginPath(); ctx.roundRect(270, 226, 380, 64, 6); ctx.fill();
        ctx.strokeStyle = '#c4ac7955'; ctx.stroke();
        ctx.fillStyle = '#e9dcae'; ctx.font = '28px Cormorant, serif'; ctx.textAlign = 'center';
        ctx.fillText(banner.text, 460, 266);
        ctx.globalAlpha = 1;
      }
      if (note && clock < note.until) {
        ctx.fillStyle = '#d8c48b'; ctx.font = '12px "DM Sans"'; ctx.textAlign = 'center';
        ctx.fillText(note.text, 450, 548);
      } else if (phase === 'build') {
        ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center';
        ctx.fillText('light every receiver on the rim — spare glass and unspent aether brighten the score', 450, 548);
      }
    }
    const toGame = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    const cellAt = p => {
      const x = Math.floor((p.x - GX) / CELL), y = Math.floor((p.y - GY) / CELL);
      return x >= 0 && x < COLS && y >= 0 && y < ROWS ? { x, y } : null;
    };
    const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    listen(canvas, 'pointermove', e => {
      const p = toGame(e);
      hover = cellAt(p);
      hoverSpot = inRect(p, engageRect) ? 'engage' : inRect(p, slots.mirror) ? 'mirror' : inRect(p, slots.prism) ? 'prism' : null;
    });
    listen(canvas, 'pointerdown', e => {
      const p = toGame(e);
      if (e.button === 2) { const c = cellAt(p); if (c) removeAt(c.x, c.y); return; }
      if (phase !== 'build') return;
      if (inRect(p, engageRect)) return engage();
      if (inRect(p, slots.mirror)) { selected = 'mirror'; tone(500, .05, 'sine', .04); return; }
      if (inRect(p, slots.prism)) { selected = 'prism'; tone(560, .05, 'sine', .04); return; }
      const c = cellAt(p);
      if (c) { cursor = c; activateCell(c.x, c.y); }
    });
    listen(canvas, 'contextmenu', e => e.preventDefault());
    listen(canvas, 'keydown', e => {
      const k = e.key;
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        cursor.x = clamp(cursor.x + (k === 'ArrowRight' ? 1 : 0) - (k === 'ArrowLeft' ? 1 : 0), 0, COLS - 1);
        cursor.y = clamp(cursor.y + (k === 'ArrowDown' ? 1 : 0) - (k === 'ArrowUp' ? 1 : 0), 0, ROWS - 1);
      }
      else if (k === '1') selected = 'mirror';
      else if (k === '2') selected = 'prism';
      else if (k === 'Enter') { e.preventDefault(); activateCell(cursor.x, cursor.y); }
      else if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); removeAt(cursor.x, cursor.y); }
      else if (k === ' ' || k.toLowerCase() === 'e') { e.preventDefault(); engage(); }
    });
    loadLevel(0);
    return g;
  }

  // ── The variable sky · Occultation ──────────────────────────────────
  // A blink comparator: sixty stars twinkle quickly and shallowly; one
  // breathes slowly and deeply at its own period. Mark it before the bell.
  function occultation(container, options) {
    const W = 900, H = 560, BELL = 12;
    const verbs = options.verbs || new Set();
    const scale = options.speedScale || 1;
    const ampScale = reduced() ? .5 : 1;
    const rounds = [
      { name: 'First light', amp: .8, period: 3.6, tw: .16 },
      { name: 'A fainter breath', amp: .55, period: 3.0, tw: .2 },
      { name: 'The quiet one', amp: .38, period: 2.6, tw: .24 },
    ];
    let round = 0, score = 0, found = 0, missed = 0, over = 0;
    let stars = [], target = -1, bell = BELL, timeLeft = BELL, roundTime = 0;
    let phase = 'play', afterT = 0, wasFound = false, freezeUsed = false, lastTick = -1;
    let reticle = { x: 450, y: 300, on: false };
    let wrongMarks = [], note = null, banner = null;
    const g = T.frame(container, W, H, {
      label: 'Occultation. One star breathes at its own slow period. Click it before the bell rings. Arrow keys move the reticle, Enter marks.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst } = g;
    const say = t => canvas.setAttribute('aria-label', t);

    function loadRound(i) {
      const r = rounds[i];
      stars = [];
      let guard = 0;
      while (stars.length < 60 && guard++ < 4000) {
        const x = 50 + Math.random() * (W - 100), y = 80 + Math.random() * (H - 170);
        if (stars.every(s => Math.hypot(s.x - x, s.y - y) > 30)) {
          stars.push({
            x, y, r: .9 + Math.random() * 1.5,
            period: 1 + Math.random() * (i === 2 ? 1.2 : .9),
            phase: Math.random() * TAU,
            tw: r.tw * (.7 + Math.random() * .6),
            tint: Math.random() < .25 ? '158,215,198' : '233,220,174',
          });
        }
      }
      target = Math.floor(Math.random() * stars.length);
      bell = BELL / scale; timeLeft = bell; roundTime = 0; lastTick = -1;
      phase = 'play'; wasFound = false; afterT = 0;
      banner = { text: `${ROMAN[i]} · ${r.name}`, from: g.clock, until: g.clock + 1.8 };
      say(`Round ${i + 1} of 3: ${r.name}. Find the star that breathes at its own period before the bell rings.`);
    }
    function mark(idx) {
      if (phase !== 'play') return;
      const s = stars[idx];
      if (idx === target) {
        found++;
        const gain = 100 + Math.round(Math.max(0, timeLeft) * 15);
        score += gain;
        burst(s.x, s.y, '#f2d38a', 26, 210);
        tone(880, .18, 'sine', .06); tone(1320, .32, 'sine', .045);
        wasFound = true; phase = 'after'; afterT = 1.7;
        note = { text: `Marked — the breathing star. +${gain}`, until: g.clock + 1.7 };
        say(`Correct. The breathing star is marked for ${gain} points.`);
      } else {
        wrongMarks.push({ x: s.x, y: s.y, at: g.clock });
        timeLeft = Math.max(0, timeLeft - 1.5);
        tone(220, .12, 'triangle', .045);
        note = { text: 'A steady star — not the one. The bell grows closer.', until: g.clock + 1.4 };
      }
    }
    function end(won) {
      if (over) return; over = 1;
      setTimeout(() => { g.destroy(); options.onEnd({ won, score: Math.round(score) }); }, 900);
    }
    function step(dt) {
      if (over) return;
      wrongMarks = wrongMarks.filter(m => g.clock - m.at < .9);
      if (phase === 'play') {
        timeLeft -= dt; roundTime += dt;
        const whole = Math.ceil(timeLeft);
        if (whole <= 3 && whole >= 1 && whole !== lastTick) { lastTick = whole; tone(1050, .05, 'sine', .03); }
        if (timeLeft <= 0) {
          if (verbs.has('freeze') && !freezeUsed) {
            freezeUsed = true; timeLeft = 4; lastTick = -1;
            tone(520, .3, 'sine', .05);
            note = { text: 'The bell holds its breath — four more heartbeats.', until: g.clock + 2.4 };
          } else {
            missed++;
            tone(170, .5, 'sawtooth', .06); tone(120, .7, 'sawtooth', .05);
            wasFound = false; phase = 'after'; afterT = 2;
            note = { text: 'The bell rings. The star keeps its secret.', until: g.clock + 2 };
            say('The bell rang with the star unmarked.');
          }
        }
      } else if (phase === 'after') {
        afterT -= dt;
        if (afterT <= 0) {
          if (missed >= 2) return end(false);
          if (round >= rounds.length - 1) return end(found >= 2);
          round++; loadRound(round);
        }
      }
    }
    function draw(ctx, dt, clock) {
      const r = rounds[round];
      ctx.fillStyle = '#0e1420'; ctx.fillRect(0, 0, W, H);
      // Faint nebulae for depth
      const neb1 = ctx.createRadialGradient(180, 140, 10, 180, 140, 220);
      neb1.addColorStop(0, '#9ed7c60d'); neb1.addColorStop(1, '#9ed7c600');
      ctx.fillStyle = neb1; ctx.fillRect(0, 0, W, H);
      const neb2 = ctx.createRadialGradient(720, 420, 10, 720, 420, 260);
      neb2.addColorStop(0, '#f58e9b0a'); neb2.addColorStop(1, '#f58e9b00');
      ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);
      // The field — quick, shallow twinkle
      for (let i = 0; i < stars.length; i++) {
        if (i === target) continue;
        const s = stars[i];
        const tw = Math.sin(clock * TAU / s.period + s.phase);
        const a = clamp(.55 + s.tw * ampScale * tw, .05, 1);
        ctx.fillStyle = `rgba(${s.tint},${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(.4, s.r * (1 + .12 * tw * ampScale)), 0, TAU); ctx.fill();
      }
      // The variable — slow, deep breath
      if (target >= 0) {
        const s = stars[target];
        const p = Math.sin(clock * TAU / r.period);
        const a = clamp(.58 + r.amp * .55 * ampScale * p, .04, 1);
        ctx.fillStyle = `rgba(${s.tint},${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(.4, s.r * (1 + .5 * r.amp * ampScale * p)), 0, TAU); ctx.fill();
        // The Gravitation Well: after six seconds the sky leans toward it
        if (verbs.has('well') && phase === 'play' && roundTime > 6) {
          const v = clamp((roundTime - 6) / 2.5, 0, 1) * .55;
          const vg = ctx.createRadialGradient(s.x, s.y, 110, s.x, s.y, 380);
          vg.addColorStop(0, 'rgba(4,8,12,0)'); vg.addColorStop(1, `rgba(4,8,12,${v})`);
          ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        }
      }
      // Wrong marks fade quickly
      for (const m of wrongMarks) {
        const a = clamp(1 - (clock - m.at) / .9, 0, 1);
        ctx.strokeStyle = `rgba(245,142,155,${a})`; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x - 7, m.y - 7); ctx.lineTo(m.x + 7, m.y + 7);
        ctx.moveTo(m.x + 7, m.y - 7); ctx.lineTo(m.x - 7, m.y + 7);
        ctx.stroke(); ctx.lineWidth = 1;
      }
      // Between rounds, reveal where it was
      if (phase === 'after' && target >= 0) {
        const s = stars[target], col = wasFound ? '242,211,138' : '245,142,155';
        const rr = 20 + (reduced() ? 0 : Math.sin(clock * 4) * 3);
        ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(${col},.9)`; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center';
        ctx.fillText(wasFound ? 'the variable, marked' : 'it was this one', s.x, s.y + rr + 16);
      }
      // Reticle
      if (reticle.on && phase === 'play') {
        ctx.strokeStyle = '#e9dcaebb';
        ctx.beginPath(); ctx.arc(reticle.x, reticle.y, 13, 0, TAU); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(reticle.x - 19, reticle.y); ctx.lineTo(reticle.x - 8, reticle.y);
        ctx.moveTo(reticle.x + 8, reticle.y); ctx.lineTo(reticle.x + 19, reticle.y);
        ctx.moveTo(reticle.x, reticle.y - 19); ctx.lineTo(reticle.x, reticle.y - 8);
        ctx.moveTo(reticle.x, reticle.y + 8); ctx.lineTo(reticle.x, reticle.y + 19);
        ctx.stroke();
      }
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 15px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${Math.round(score)}`, 24, 34);
      ctx.textAlign = 'right';
      const low = timeLeft <= 3 && phase === 'play';
      ctx.fillStyle = low ? '#f58e9b' : '#e9dcae';
      ctx.fillText(`THE BELL ${Math.max(0, Math.ceil(timeLeft))}`, W - 24, 34);
      ctx.fillStyle = low ? '#f58e9b' : '#c4ac79';
      const bw = 150 * clamp(timeLeft / bell, 0, 1);
      ctx.fillRect(W - 24 - bw, 42, bw, 3);
      ctx.fillStyle = '#e9dcae'; ctx.font = '24px Cormorant, serif'; ctx.textAlign = 'center';
      ctx.fillText('Occultation', 450, 32);
      ctx.fillStyle = '#b7bda4'; ctx.font = '12px "DM Sans"';
      ctx.fillText(`${ROMAN[round]} · ${r.name} · found ${found} · missed ${missed}`, 450, 52);
      if (banner && clock < banner.until) {
        const a = clamp(Math.min(clock - banner.from, banner.until - clock) * 2.4, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#0e1420dd';
        ctx.beginPath(); ctx.roundRect(330, 236, 240, 58, 6); ctx.fill();
        ctx.strokeStyle = '#c4ac7955'; ctx.stroke();
        ctx.fillStyle = '#e9dcae'; ctx.font = '26px Cormorant, serif'; ctx.textAlign = 'center';
        ctx.fillText(banner.text, 450, 272);
        ctx.globalAlpha = 1;
      }
      if (note && clock < note.until) {
        ctx.fillStyle = '#d8c48b'; ctx.font = '12px "DM Sans"'; ctx.textAlign = 'center';
        ctx.fillText(note.text, 450, 524);
      }
      ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center';
      ctx.fillText('click the star that breathes at its own slow period · arrows + Enter mark from the reticle', 450, 546);
    }
    const toGame = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    const nearest = (x, y, max) => {
      let best = -1, bd = max;
      for (let i = 0; i < stars.length; i++) {
        const d = Math.hypot(stars[i].x - x, stars[i].y - y);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    };
    listen(canvas, 'pointerdown', e => {
      if (phase !== 'play') return;
      const p = toGame(e);
      const i = nearest(p.x, p.y, 20);
      if (i >= 0) mark(i);
    });
    listen(canvas, 'keydown', e => {
      const k = e.key;
      if (k.startsWith('Arrow')) {
        e.preventDefault(); reticle.on = true;
        reticle.x = clamp(reticle.x + (k === 'ArrowRight' ? 16 : 0) - (k === 'ArrowLeft' ? 16 : 0), 20, W - 20);
        reticle.y = clamp(reticle.y + (k === 'ArrowDown' ? 16 : 0) - (k === 'ArrowUp' ? 16 : 0), 60, H - 40);
      } else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        const i = nearest(reticle.x, reticle.y, 22);
        if (i >= 0) mark(i);
      }
    });
    loadRound(0);
    return g;
  }

  T.register({ id: 'terminal', name: 'The Umbra Terminal', place: 'The old instrument', brief: 'Route the beam through prisms and mirrors until every receiver sings.', create: terminal });
  T.register({ id: 'occultation', name: 'Occultation', place: 'The variable sky', brief: 'One star breathes at its own period. Find it before the bell.', create: occultation });
})();
