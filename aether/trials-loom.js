'use strict';

// Two further trials of the Grand Tour, self-registered with the shared
// machinery in trials.js — The Aurora Loom at the polar dawn, and The
// Alignment Clock in the orrery hall. Same contract as the eight:
// create(container, options) → handle; options.onEnd({won, score}) once.
(() => {
  const T = window.AetherTrials;
  if (!T) return;
  const { frame, clamp, TAU, reduced } = T;
  const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];

  // ── The polar dawn · The Aurora Loom ───────────────────────────────────
  // Join each numbered pair of anchors with a freehand ribbon. Every stroke
  // claims the cells it passes through; a cell already held by another
  // ribbon, a foreign anchor, or a drifting cloud parts the stroke that
  // touches it. Three skies of rising complexity; elegance is brevity.
  function loom(container, options) {
    const W = 900, H = 560;
    const verbs = options.verbs || new Set();
    const scale = options.speedScale || 1;
    const GW = 16, GH = 10, BX = 70, BY = 96, BW = 760, BH = 384;
    const CW = BW / GW, CH = BH / GH;
    const cx2x = cx => BX + (cx + .5) * CW, cy2y = cy => BY + (cy + .5) * CH;
    const cellKey = (cx, cy) => cy * GW + cx;
    const cellAt = (x, y) => {
      const cx = Math.floor((x - BX) / CW), cy = Math.floor((y - BY) / CH);
      return cx >= 0 && cx < GW && cy >= 0 && cy < GH ? { cx, cy } : null;
    };
    // Pairs are matched by numeral, shape and colour together — never colour alone.
    const STYLE = [
      { colour: '#9ed7c6', shape: 'circle' },
      { colour: '#7fb2c9', shape: 'square' },
      { colour: '#b3a0d8', shape: 'triangle' },
      { colour: '#e9dcae', shape: 'diamond' },
      { colour: '#a9d3a4', shape: 'pentagon' },
    ];
    // Three skies, hand-checked solvable: the cloud lanes keep the straight
    // corridors clear and punish only meandering ribbons.
    const SKIES = [
      { name: 'The First Sky', dawn: 150, pairs: [[2, 2, 13, 2], [2, 7, 13, 7], [6, 4, 9, 4]], clouds: [] },
      {
        name: 'The Second Sky', dawn: 200, pairs: [[1, 1, 14, 1], [1, 8, 14, 8], [4, 3, 4, 6], [11, 3, 11, 6]],
        clouds: [{ y: 4.5, x0: 6, x1: 10, r: 30, speed: .45, phase: 0 }, { y: 2.5, x0: 7, x1: 11.5, r: 24, speed: .32, phase: 2.2 }],
      },
      {
        name: 'The Third Sky', dawn: 240, pairs: [[1, 1, 14, 1], [1, 8, 14, 8], [3, 2, 3, 7], [12, 2, 12, 7], [7, 4, 8, 5]],
        clouds: [{ y: 3, x0: 5, x1: 10, r: 26, speed: .5, phase: 1 }, { y: 6, x0: 6, x1: 11, r: 26, speed: .4, phase: 3.6 }, { y: 4.8, x0: 4.5, x1: 7.5, r: 20, speed: .34, phase: 5.2 }],
      },
    ];
    let pairs = [], clouds = [], occupied = new Map(), anchorCells = new Map();
    let sky = 0, draft = null, hover = null, lastRejected = null, dragging = false;
    let skyStart = 0, wovenAt = -1, totalScore = 0, over = 0, endTimer = 0;
    let msg = '', msgUntil = 0;

    const g = frame(container, W, H, {
      label: 'The Aurora Loom. Weave each pair of matching anchors with a ribbon that crosses nothing. Drag between anchors, or click each in turn, or press 1 to 5 and weave with the arrow keys. Escape releases a ribbon.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(2025, 64);
    canvas.focus({ preventScroll: true });

    const cloudAt = (c, t) => ({
      x: BX + ((c.x0 + c.x1) / 2 + Math.sin(t * c.speed * scale + c.phase) * (c.x1 - c.x0) / 2) * CW,
      y: BY + c.y * CH,
    });
    function cloudBlocks(cx, cy) {
      const x = cx2x(cx), y = cy2y(cy);
      for (const c of clouds) { const p = cloudAt(c, g.clock); if (Math.hypot(p.x - x, p.y - y) < c.r) return true; }
      return false;
    }
    function classify(cx, cy, j) {
      const k = cellKey(cx, cy);
      if (occupied.has(k)) return occupied.get(k) === j ? 'own' : 'crossing';
      if (anchorCells.has(k)) return anchorCells.get(k) === j ? 'own' : 'anchor';
      if (cloudBlocks(cx, cy)) return 'cloud';
      return 'open';
    }
    function loadSky(i) {
      const def = SKIES[i];
      pairs = def.pairs.map((p, j) => ({ ...STYLE[j], label: ROMAN[j], a: { cx: p[0], cy: p[1] }, b: { cx: p[2], cy: p[3] }, ribbon: null }));
      clouds = def.clouds.map(c => ({ ...c }));
      occupied = new Map(); anchorCells = new Map();
      pairs.forEach((p, j) => { anchorCells.set(cellKey(p.a.cx, p.a.cy), j); anchorCells.set(cellKey(p.b.cx, p.b.cy), j); });
      draft = null; lastRejected = null; wovenAt = -1; skyStart = g.clock;
      msg = `${def.name} — weave ${pairs.length} ribbons`; msgUntil = g.clock + 2.6;
    }
    function unweave(j) {
      if (!pairs[j].ribbon) return;
      for (const [k, v] of occupied) if (v === j) occupied.delete(k);
      pairs[j].ribbon = null;
      tone(240, .12, 'sine', .04);
    }
    const destOf = d => pairs[d.pair][d.from === 'a' ? 'b' : 'a'];
    function beginDraft(j, from, mode) {
      if (pairs[j].ribbon) unweave(j);
      const a = pairs[j][from];
      draft = { pair: j, from, mode, t0: g.clock, points: [{ x: cx2x(a.cx), y: cy2y(a.cy) }], cells: new Set([cellKey(a.cx, a.cy)]) };
      tone(360 + j * 80, .07, 'sine', .045);
    }
    function rejectDraft(pt, why) {
      lastRejected = { pair: draft.pair, from: draft.from, points: draft.points.slice(), used: false };
      burst(pt.x, pt.y, '#f58e9b', 12, 120);
      tone(170, .18, 'sawtooth', .045);
      msg = why === 'cloud' ? 'A drift of cloud parts the ribbon.'
        : why === 'anchor' ? 'An anchor holds its own sky — the ribbon parts.'
        : why === 'tangled' ? 'The ribbon tangles and parts.'
        : 'Ribbons of light never cross — the ribbon parts.';
      if (verbs.has('echo')) msg += ' The echo holds it — press E to take it up again.';
      msgUntil = g.clock + 2.6;
      draft = null; dragging = false;
    }
    function commitDraft() {
      const d = draft, p = pairs[d.pair];
      let len = 0;
      for (let i = 1; i < d.points.length; i++) len += Math.hypot(d.points[i].x - d.points[i - 1].x, d.points[i].y - d.points[i - 1].y);
      p.ribbon = { points: d.points.slice(), len };
      for (const k of d.cells) occupied.set(k, d.pair);
      const tip = d.points[d.points.length - 1];
      burst(tip.x, tip.y, p.colour, 16, 130);
      tone(540 + d.pair * 90, .12, 'sine', .055); tone(810 + d.pair * 90, .18, 'sine', .035);
      draft = null; dragging = false;
      if (pairs.every(q => q.ribbon)) skyWoven();
    }
    function skyWoven() {
      const elapsed = g.clock - skyStart;
      let par = 0, actual = 0;
      for (const p of pairs) { par += Math.abs(p.a.cx - p.b.cx) * CW + Math.abs(p.a.cy - p.b.cy) * CH; actual += p.ribbon.len; }
      const elegance = clamp(par * 1.12 / Math.max(actual, 1), 0, 1);
      const swift = clamp(1 - elapsed / (SKIES[sky].dawn * .45), 0, 1);
      const gained = Math.round(280 + 320 * elegance + 160 * swift);
      totalScore += gained;
      wovenAt = g.clock;
      msg = `${SKIES[sky].name} woven — elegance ${Math.round(elegance * 100)}% · +${gained}`;
      msgUntil = g.clock + 3;
      tone(660, .22, 'sine', .055); tone(880, .3, 'sine', .045); tone(1100, .4, 'sine', .03);
      for (const p of pairs) burst(cx2x(p.b.cx), cy2y(p.b.cy), p.colour, 8, 90);
    }
    function extendTo(px, py) {
      if (!draft || draft.parked) return;
      const last = draft.points[draft.points.length - 1];
      const dist = Math.hypot(px - last.x, py - last.y);
      if (dist < 3) return;
      const dest = destOf(draft);
      const steps = Math.min(48, Math.ceil(dist / 5));
      for (let s = 1; s <= steps && draft; s++) {
        const x = last.x + (px - last.x) * s / steps, y = last.y + (py - last.y) * s / steps;
        const cell = cellAt(x, y);
        if (!cell) { draft.points.push({ x, y }); continue; }
        const k = cellKey(cell.cx, cell.cy);
        if (draft.cells.has(k)) { draft.points.push({ x, y }); continue; }
        if (cell.cx === dest.cx && cell.cy === dest.cy) {
          draft.points.push({ x: cx2x(dest.cx), y: cy2y(dest.cy) });
          draft.cells.add(k);
          // A drag or key-weave commits on arrival; a click-started ribbon
          // parks on its anchor and waits for the confirming click, and a
          // clouded anchor waits for the veil to lift.
          if (!cloudBlocks(dest.cx, dest.cy) && draft.mode !== 'tap') { commitDraft(); return; }
          draft.parked = true;
          return;
        }
        const c = classify(cell.cx, cell.cy, draft.pair);
        if (c === 'open' || c === 'own') { draft.cells.add(k); draft.points.push({ x, y }); }
        else { rejectDraft({ x, y }, c); return; }
        if (draft && draft.points.length > 1700) { rejectDraft({ x, y }, 'tangled'); return; }
      }
    }
    // A ribbon parked on a cloud-covered anchor commits once the veil lifts.
    function tryFinishDraft() {
      if (!draft || draft.mode === 'tap') return; // click-started ribbons wait for their confirming click
      const dest = destOf(draft), tip = draft.points[draft.points.length - 1];
      const d = Math.hypot(tip.x - cx2x(dest.cx), tip.y - cy2y(dest.cy));
      if (d > 34 || cloudBlocks(dest.cx, dest.cy)) return;
      if (d > 1) draft.points.push({ x: cx2x(dest.cx), y: cy2y(dest.cy) });
      draft.cells.add(cellKey(dest.cx, dest.cy));
      commitDraft();
    }
    function restoreEcho() {
      const r = lastRejected;
      if (!r || r.used || draft) return;
      r.used = true;
      if (pairs[r.pair].ribbon) { msg = 'That thread is already woven — the echo lets it be.'; msgUntil = g.clock + 2; return; }
      // Re-walk the fallen stroke, truncating where the sky has since filled in.
      const pts = [], cells = new Set();
      for (const pt of r.points) {
        const cell = cellAt(pt.x, pt.y);
        if (cell) {
          const k = cellKey(cell.cx, cell.cy);
          if (!cells.has(k)) {
            const c = classify(cell.cx, cell.cy, r.pair);
            if (c !== 'open' && c !== 'own') break;
            cells.add(k);
          }
        }
        pts.push(pt);
      }
      if (!pts.length) { const a = pairs[r.pair][r.from]; pts.push({ x: cx2x(a.cx), y: cy2y(a.cy) }); cells.add(cellKey(a.cx, a.cy)); }
      draft = { pair: r.pair, from: r.from, mode: 'echo', t0: g.clock, points: pts, cells };
      msg = 'The echo returns your ribbon — weave on from its tip.'; msgUntil = g.clock + 2.2;
      tone(500, .14, 'sine', .05);
    }
    function end(won) {
      if (over) return; over = 1;
      const score = Math.round(totalScore * (verbs.has('trail') ? 1.25 : 1));
      endTimer = setTimeout(() => { options.onEnd({ won, score }); g.destroy(); }, 900);
    }
    const origDestroy = g.destroy;
    g.destroy = () => { clearTimeout(endTimer); origDestroy(); };
    function step() {
      if (over) return;
      if (draft && !dragging) tryFinishDraft();
      if (wovenAt >= 0 && g.clock > wovenAt + 2) {
        if (sky >= SKIES.length - 1) return end(true);
        sky++; loadSky(sky);
      }
      if (wovenAt < 0 && g.clock - skyStart > SKIES[sky].dawn) end(false);
    }
    function shapePath(ctx, shape, x, y, r) {
      ctx.beginPath();
      if (shape === 'circle') ctx.arc(x, y, r, 0, TAU);
      else if (shape === 'square') ctx.rect(x - r * .85, y - r * .85, r * 1.7, r * 1.7);
      else {
        const n = shape === 'triangle' ? 3 : shape === 'diamond' ? 4 : 5;
        const rot = shape === 'diamond' ? 0 : -Math.PI / 2;
        for (let i = 0; i < n; i++) {
          const a = rot + i / n * TAU;
          i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.closePath();
      }
    }
    function ribbonPath(ctx, pts) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 2) ctx.lineTo(pts[1].x, pts[1].y);
      else for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
    }
    function drawRibbon(ctx, pts, colour, clock, seed) {
      ribbonPath(ctx, pts);
      ctx.strokeStyle = colour + '44'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      ribbonPath(ctx, pts);
      ctx.strokeStyle = colour; ctx.lineWidth = 3.2; ctx.stroke();
      ctx.lineWidth = 1; ctx.lineCap = 'butt';
      if (verbs.has('trail')) { // the Trail of Lights: a shimmer rides each ribbon
        const n = reduced() ? 2 : 4;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < n; i++) {
          const t = (clock * .12 + i / n + seed * .17) % 1;
          const idx = Math.min(pts.length - 1, Math.floor(t * pts.length));
          ctx.globalAlpha = .5 + Math.sin(clock * 3 + i * 2) * .3;
          ctx.beginPath(); ctx.arc(pts[idx].x, pts[idx].y, 1.8, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    function draw(ctx, dt, clock) {
      ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, W, H); stars();
      // the gently domed sky
      const dome = ctx.createRadialGradient(450, 640, 80, 450, 640, 760);
      dome.addColorStop(0, '#7fb2c914'); dome.addColorStop(.55, '#b3a0d808'); dome.addColorStop(1, '#0d142000');
      ctx.fillStyle = dome; ctx.fillRect(0, 0, W, H);
      // faint aurora curtains far behind the board
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = ['#9ed7c6', '#7fb2c9', '#b3a0d8'][i] + '14';
        ctx.lineWidth = 26 - i * 6; ctx.beginPath();
        for (let x = 40; x <= 860; x += 20) {
          const y = 150 + i * 90 + Math.sin(x * .008 + (reduced() ? 0 : clock * .12) + i * 2) * 26;
          x === 40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      // the engraved arch over the board
      ctx.strokeStyle = '#c4ac7933';
      for (const off of [0, 5]) {
        ctx.beginPath();
        ctx.moveTo(BX - 26 - off, BY + BH + 18);
        ctx.lineTo(BX - 26 - off, BY + 40);
        ctx.quadraticCurveTo(450, BY - 74 - off * 2, BX + BW + 26 + off, BY + 40);
        ctx.lineTo(BX + BW + 26 + off, BY + BH + 18);
        ctx.stroke();
      }
      // the faint engraved lattice
      ctx.fillStyle = '#e9dcae0a';
      for (let cx = 0; cx <= GW; cx += 2) for (let cy = 0; cy <= GH; cy += 2) { ctx.beginPath(); ctx.arc(BX + cx * CW, BY + cy * CH, 1, 0, TAU); ctx.fill(); }
      // drifting clouds
      for (const c of clouds) {
        const p = cloudAt(c, clock);
        const cg = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, c.r * 1.7);
        cg.addColorStop(0, '#c7d4de2e'); cg.addColorStop(.6, '#c7d4de14'); cg.addColorStop(1, '#c7d4de00');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(p.x, p.y, c.r * 1.7, 0, TAU); ctx.fill();
        ctx.setLineDash([3, 6]); ctx.strokeStyle = '#c7d4de30';
        ctx.beginPath(); ctx.arc(p.x, p.y, c.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      // woven ribbons, then the live draft
      pairs.forEach((p, j) => { if (p.ribbon) drawRibbon(ctx, p.ribbon.points, p.colour, clock, j); });
      if (draft && draft.parked) { // a parked ribbon pulses on its anchor, awaiting the click
        const dest = destOf(draft);
        ctx.setLineDash([3, 4]); ctx.strokeStyle = pairs[draft.pair].colour;
        ctx.beginPath(); ctx.arc(cx2x(dest.cx), cy2y(dest.cy), 16 + Math.sin(clock * 3) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      if (draft && draft.points.length) {
        drawRibbon(ctx, draft.points, pairs[draft.pair].colour, clock, .5);
        if (hover) { // rose telegraph where the ribbon would part
          const cell = cellAt(hover.x, hover.y);
          if (cell) {
            const c = classify(cell.cx, cell.cy, draft.pair), dest = destOf(draft);
            if ((c === 'crossing' || c === 'anchor' || c === 'cloud') && !(cell.cx === dest.cx && cell.cy === dest.cy)) {
              ctx.strokeStyle = '#f58e9b'; ctx.setLineDash([2, 4]);
              ctx.beginPath(); ctx.arc(hover.x, hover.y, 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
            }
          }
        }
      }
      // anchors
      pairs.forEach((p, j) => {
        for (const end of ['a', 'b']) {
          const a = p[end], x = cx2x(a.cx), y = cy2y(a.cy);
          if (p.ribbon) {
            const gg = ctx.createRadialGradient(x, y, 2, x, y, 26);
            gg.addColorStop(0, p.colour + '55'); gg.addColorStop(1, p.colour + '00');
            ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill();
          } else {
            ctx.strokeStyle = p.colour + '66';
            ctx.beginPath(); ctx.arc(x, y, 19 * (1 + Math.sin(clock * 2.2 + j * 1.3) * .08), 0, TAU); ctx.stroke();
          }
          shapePath(ctx, p.shape, x, y, 12);
          ctx.fillStyle = p.colour; ctx.fill();
          ctx.strokeStyle = '#0d1420'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1;
          ctx.fillStyle = '#e9dcae'; ctx.font = '600 11px "DM Sans"'; ctx.textAlign = 'center';
          ctx.fillText(p.label, x, y + 27);
        }
      });
      // the echo's offer
      if (verbs.has('echo') && lastRejected && !lastRejected.used && !draft) {
        ctx.fillStyle = '#b3a0d8'; ctx.font = '600 12px "DM Sans"'; ctx.textAlign = 'center';
        ctx.fillText('◈ The echo holds your fallen ribbon — press E to take it up again', 450, H - 38);
      }
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 13px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`THE AURORA LOOM · SKY ${ROMAN[sky]} / Ⅲ · ${pairs.filter(p => p.ribbon).length}/${pairs.length} WOVEN`, 20, 30);
      ctx.textAlign = 'right';
      ctx.fillText(`SCORE ${totalScore}${verbs.has('trail') ? ' ✦' : ''}`, W - 20, 30);
      const left = Math.max(0, SKIES[sky].dawn - (clock - skyStart));
      if (wovenAt < 0 && left < 45) {
        ctx.fillStyle = left < 15 ? '#f58e9b' : '#c4ac79';
        ctx.fillText(`DAWN IN ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, W - 20, 50);
      }
      if (clock < msgUntil) {
        ctx.globalAlpha = clamp((msgUntil - clock) / .5, 0, 1);
        ctx.fillStyle = '#e9dcae'; ctx.font = '24px Cormorant, serif'; ctx.textAlign = 'center';
        ctx.fillText(msg, 450, 74);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center';
      ctx.fillText(!draft ? 'Drag between matching anchors · or press 1–5 and weave with arrow keys · U unweaves a ribbon'
        : draft.parked ? 'Click the anchor to set the ribbon — or Escape to release it'
        : 'Weave to the matching anchor. Cross nothing — not ribbon, not anchor, not cloud.', 450, H - 16);
    }
    const toGame = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    const anchorAt = (x, y) => {
      for (let j = 0; j < pairs.length; j++) for (const end of ['a', 'b'])
        if (Math.hypot(x - cx2x(pairs[j][end].cx), y - cy2y(pairs[j][end].cy)) < 26) return { pair: j, end };
      return null;
    };
    listen(canvas, 'pointerdown', e => {
      canvas.focus({ preventScroll: true });
      const { x, y } = toGame(e);
      hover = { x, y };
      if (draft) {
        if (draft.mode === 'pointer' && dragging) return; // a second finger mid-weave
        const hit = anchorAt(x, y), dest = destOf(draft);
        if (hit && hit.pair === draft.pair && hit.end !== draft.from) {
          extendTo(cx2x(dest.cx), cy2y(dest.cy));
          if (draft && !cloudBlocks(dest.cx, dest.cy)) { // the confirming click sets the ribbon
            const tip = draft.points[draft.points.length - 1];
            if (Math.hypot(tip.x - cx2x(dest.cx), tip.y - cy2y(dest.cy)) < 34) commitDraft();
          }
        } else {
          draft = null; dragging = false;
          if (hit) { beginDraft(hit.pair, hit.end, 'pointer'); dragging = true; }
          else tone(280, .06, 'sine', .03);
        }
        return;
      }
      const hit = anchorAt(x, y);
      if (hit) {
        beginDraft(hit.pair, hit.end, 'pointer');
        dragging = true;
        try { canvas.setPointerCapture(e.pointerId); } catch { }
      }
    });
    listen(canvas, 'pointermove', e => {
      const { x, y } = toGame(e);
      hover = { x, y };
      if (!draft) return;
      if (draft.mode === 'pointer' && !dragging) return;
      if (draft.mode === 'kbd' || draft.mode === 'echo') {
        const tip = draft.points[draft.points.length - 1];
        if (Math.hypot(x - tip.x, y - tip.y) > 46) return; // bring the pointer to the ribbon's tip to take it up
        draft.mode = 'tap';
      }
      extendTo(x, y);
    });
    listen(canvas, 'pointerup', e => {
      dragging = false;
      if (!draft || draft.mode !== 'pointer') return;
      const { x, y } = toGame(e), dest = destOf(draft);
      if (Math.hypot(x - cx2x(dest.cx), y - cy2y(dest.cy)) < 34) { extendTo(cx2x(dest.cx), cy2y(dest.cy)); return; }
      if (draft && draft.points.length <= 3 && g.clock - draft.t0 < .4) { draft.mode = 'tap'; return; } // click-start, click-end
      if (draft) { draft = null; tone(280, .07, 'sine', .03); }
    });
    listen(canvas, 'pointercancel', () => { dragging = false; if (draft && draft.mode === 'pointer') draft = null; });
    listen(canvas, 'keydown', e => {
      if (over) return;
      if (e.key >= '1' && e.key <= '5') {
        const j = +e.key - 1;
        if (j >= pairs.length) return;
        e.preventDefault();
        if (draft) draft = null;
        beginDraft(j, 'a', 'kbd');
      } else if (e.key.startsWith('Arrow')) {
        if (!draft) return;
        e.preventDefault();
        draft.mode = 'kbd';
        const tip = draft.points[draft.points.length - 1];
        const cell = cellAt(tip.x, tip.y) || { cx: pairs[draft.pair][draft.from].cx, cy: pairs[draft.pair][draft.from].cy };
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        extendTo(cx2x(clamp(cell.cx + d[0], 0, GW - 1)), cy2y(clamp(cell.cy + d[1], 0, GH - 1)));
      } else if (e.key === 'Escape') { if (draft) { draft = null; tone(280, .07, 'sine', .035); } }
      else if ((e.key === 'Enter' || e.key === ' ') && draft && draft.parked) {
        e.preventDefault();
        draft.mode = 'kbd';
        tryFinishDraft();
      }
      else if ((e.key === 'e' || e.key === 'E') && verbs.has('echo')) restoreEcho();
      else if (e.key === 'u' || e.key === 'U') { for (let j = pairs.length - 1; j >= 0; j--) if (pairs[j].ribbon) { unweave(j); break; } }
    });
    loadSky(0);
    return g;
  }

  // ── The orrery hall · The Alignment Clock ──────────────────────────────
  // Four hands turn on four rings, the outer swiftest. Still each one inside
  // its brass arc — by click or by key — and be judged by the angle you miss.
  function alignment(container, options) {
    const W = 900, H = 560, CX = 450, CY = 306;
    const verbs = options.verbs || new Set();
    const scale = options.speedScale || 1;
    const R = [84, 122, 160, 198];
    const TINT = ['#e9dcae', '#d8c48b', '#c4ac79', '#f2d38a'];
    const SPEED_MUL = [1, 1.22, 1.45], ARC_MUL = [1, .78, .58];
    let round = 0, state = 'play', hands = [], arcs = [], results = [];
    let summaryAt = 0, over = 0, endTimer = 0;

    const g = frame(container, W, H, {
      label: 'The Alignment Clock. Four hands orbit at rising speeds. Press 1 to 4, or click a hand, to still it inside its brass arc.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(311, 40);
    canvas.focus({ preventScroll: true });

    const angleOf = i => {
      const h = hands[i];
      return h.phase + h.w * ((h.frozen ? h.frozenAt : g.clock) - h.startAt);
    };
    const tipOf = i => ({ x: CX + Math.cos(angleOf(i)) * R[i], y: CY + Math.sin(angleOf(i)) * R[i] });
    const angDiff = (a, b) => {
      let d = (a - b) % TAU;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      return Math.abs(d);
    };
    function setupRound(r) {
      round = r; state = 'play';
      hands = R.map((_, i) => ({ w: (0.78 + 0.34 * i) * SPEED_MUL[r] * scale, phase: Math.random() * TAU, startAt: g.clock, frozen: false, frozenAt: 0, echoUsed: false, acc: null }));
      arcs = R.map(() => ({ mid: Math.random() * TAU, half: .55 * ARC_MUL[r] * (verbs.has('gyro') ? 1.2 : 1) }));
      if (r > 0) tone(520, .12, 'sine', .04);
    }
    function still(i) {
      if (state !== 'play' || over) return;
      const h = hands[i];
      if (h.frozen) {
        if (verbs.has('echo') && !h.echoUsed) { // the echo re-spins a stilled hand, once
          h.echoUsed = true; h.frozen = false; h.phase = angleOf(i); h.startAt = g.clock; h.acc = null;
          tone(300, .12, 'sine', .045);
        } else tone(220, .06, 'sine', .03);
        return;
      }
      h.frozen = true; h.frozenAt = g.clock;
      const d = angDiff(angleOf(i), arcs[i].mid);
      h.acc = d > arcs[i].half ? 0 : Math.sqrt(1 - d / arcs[i].half);
      const tip = tipOf(i);
      burst(tip.x, tip.y, h.acc >= .7 ? '#f2d38a' : h.acc > 0 ? '#e9dcae' : '#f58e9b', 12, 110);
      tone(420 + h.acc * 420, .14, 'triangle', .055);
      if (hands.every(q => q.frozen)) {
        results.push(hands.map(q => q.acc));
        state = 'summary'; summaryAt = g.clock;
        tone(660, .2, 'sine', .05); tone(990, .3, 'sine', .04);
      }
    }
    function finish() {
      const all = results.flat();
      const avg = all.reduce((a, b) => a + b, 0) / all.length;
      const score = all.reduce((a, b) => a + Math.round(b * 100) + (b >= .95 ? 25 : 0), 0);
      end(avg >= .7, score);
    }
    function end(won, score) {
      if (over) return; over = 1;
      endTimer = setTimeout(() => { options.onEnd({ won, score }); g.destroy(); }, 900);
    }
    const origDestroy = g.destroy;
    g.destroy = () => { clearTimeout(endTimer); origDestroy(); };
    function step() {
      if (over) return;
      if (state === 'summary' && g.clock > summaryAt + 2.2) {
        if (round >= 2) finish();
        else setupRound(round + 1);
      }
    }
    function draw(ctx, dt, clock) {
      ctx.fillStyle = '#0e1410'; ctx.fillRect(0, 0, W, H); stars();
      // the hall's glow
      const glow = ctx.createRadialGradient(CX, CY, 20, CX, CY, 320);
      glow.addColorStop(0, '#c4ac7914'); glow.addColorStop(1, '#c4ac7900');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(CX, CY, 320, 0, TAU); ctx.fill();
      // rings with engraved ticks
      for (const r of R) {
        ctx.strokeStyle = '#c4ac7938'; ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#c4ac7922';
        for (let k = 0; k < 12; k++) {
          const a = k / 12 * TAU;
          ctx.beginPath();
          ctx.moveTo(CX + Math.cos(a) * (r - 4), CY + Math.sin(a) * (r - 4));
          ctx.lineTo(CX + Math.cos(a) * (r + 4), CY + Math.sin(a) * (r + 4));
          ctx.stroke();
        }
      }
      // brass target arcs, brightening as their hand sweeps through
      arcs.forEach((arc, i) => {
        const inArc = state === 'play' && !hands[i].frozen && angDiff(angleOf(i), arc.mid) < arc.half;
        ctx.strokeStyle = inArc ? '#f2d38a' : '#e9dcae99';
        ctx.lineWidth = inArc ? 6 : 4.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(CX, CY, R[i], arc.mid - arc.half, arc.mid + arc.half); ctx.stroke();
        ctx.lineWidth = 1; ctx.lineCap = 'butt';
        for (const s of [-1, 1]) {
          const a = arc.mid + s * arc.half;
          ctx.strokeStyle = '#e9dcaecc';
          ctx.beginPath();
          ctx.moveTo(CX + Math.cos(a) * (R[i] - 8), CY + Math.sin(a) * (R[i] - 8));
          ctx.lineTo(CX + Math.cos(a) * (R[i] + 8), CY + Math.sin(a) * (R[i] + 8));
          ctx.stroke();
        }
      });
      // hands
      hands.forEach((h, i) => {
        const a = angleOf(i), tip = tipOf(i);
        ctx.strokeStyle = TINT[i] + (h.frozen ? '' : 'aa');
        ctx.lineWidth = h.frozen ? 2.4 : 1.6;
        ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(tip.x, tip.y); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = h.frozen ? TINT[i] : '#0e1410';
        ctx.strokeStyle = TINT[i];
        ctx.beginPath(); ctx.arc(tip.x, tip.y, h.frozen ? 6.5 : 5, 0, TAU); ctx.fill(); ctx.stroke();
        if (h.frozen) { ctx.beginPath(); ctx.arc(tip.x, tip.y, 10.5, 0, TAU); ctx.stroke(); }
        const lx = CX + Math.cos(a) * (R[i] + 22), ly = CY + Math.sin(a) * (R[i] + 22);
        ctx.fillStyle = TINT[i]; ctx.font = '600 12px "DM Sans"'; ctx.textAlign = 'center';
        ctx.fillText(`${ROMAN[i]}·${i + 1}`, lx, ly + 4);
        if (h.acc !== null) {
          ctx.fillStyle = h.acc >= .7 ? '#f2d38a' : h.acc > 0 ? '#e9dcae' : '#f58e9b';
          ctx.font = '11px "DM Sans"';
          ctx.fillText(`${Math.round(h.acc * 100)}%`, lx, ly + 18);
        }
      });
      // the central sun
      const sg = ctx.createRadialGradient(CX, CY, 2, CX, CY, 30);
      sg.addColorStop(0, '#f4dfae'); sg.addColorStop(.6, '#c9a45c'); sg.addColorStop(1, '#c9a45c00');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(CX, CY, 30, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8cd92'; ctx.beginPath(); ctx.arc(CX, CY, 11, 0, TAU); ctx.fill();
      // round summary
      if (state === 'summary' && results.length) {
        const accs = results[results.length - 1], avgR = accs.reduce((a, b) => a + b, 0) / accs.length;
        ctx.fillStyle = '#e9dcae'; ctx.font = '24px Cormorant, serif'; ctx.textAlign = 'center';
        ctx.fillText(`Round ${ROMAN[round]} — ${Math.round(avgR * 100)}% in tune`, CX, CY - 138);
        ctx.font = '600 12px "DM Sans"'; ctx.fillStyle = '#c4ac79';
        ctx.fillText(accs.map((a, i) => `${ROMAN[i]} ${Math.round(a * 100)}`).join(' · '), CX, CY - 116);
      }
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 13px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`THE ALIGNMENT CLOCK · ROUND ${ROMAN[round]} / Ⅲ`, 20, 30);
      const done = results.flat();
      ctx.textAlign = 'right';
      ctx.fillText(done.length ? `AVERAGE ${Math.round(done.reduce((a, b) => a + b, 0) / done.length * 100)}%` : 'AVERAGE —', W - 20, 30);
      ctx.fillStyle = '#b7bda4'; ctx.font = '11px "DM Sans"'; ctx.textAlign = 'center';
      ctx.fillText(`Still each hand as it crosses its mark — click a hand or press 1–4${verbs.has('echo') ? ' · the echo re-spins a stilled hand once' : ''}`, 450, H - 16);
    }
    listen(canvas, 'keydown', e => {
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i >= 0) { e.preventDefault(); still(i); }
    });
    listen(canvas, 'pointerdown', e => {
      canvas.focus({ preventScroll: true });
      if (state !== 'play') return;
      const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      let best = -1, bestD = 60;
      hands.forEach((h, i) => { const t = tipOf(i), d = Math.hypot(x - t.x, y - t.y); if (d < bestD) { bestD = d; best = i; } });
      if (best < 0) { // clicking the ring where a hand runs also stills it
        const cr = Math.hypot(x - CX, y - CY), ca = Math.atan2(y - CY, x - CX);
        hands.forEach((h, i) => { if (best < 0 && Math.abs(cr - R[i]) < 40 && angDiff(ca, angleOf(i)) < .4) best = i; });
      }
      if (best >= 0) still(best); else tone(200, .06, 'sine', .03);
    });
    setupRound(0);
    return g;
  }

  T.register({ id: 'loom', name: 'The Aurora Loom', place: 'The polar dawn', brief: 'Weave the aurora between its anchors. Ribbons of light never cross.', create: loom });
  T.register({ id: 'alignment', name: 'The Alignment Clock', place: 'The orrery hall', brief: 'Four hands, four arcs. Still each hand as it crosses its mark.', create: alignment });
})();
