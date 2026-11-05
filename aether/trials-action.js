'use strict';

// Two action trials for the Grand Tour's extension shelf.
//   Constellation Chain — a comet guarded by its own train of star-motes.
//   Perihelion Run — a hold-to-dive slalom through the comet's tail.
// Same contract as trials.js: create(container, options) → handle,
// options.onEnd({won, score}) exactly once, shortly after a final flourish.
(() => {
  const AT = window.AetherTrials;
  if (!AT) return;
  const { frame, TAU, clamp, reduced } = AT;
  const HUD = '600 13px "DM Sans"';
  const SERIF = '24px Cormorant, serif';
  const SMALL = '12px "DM Sans"';

  // ── The wandering stars · Constellation Chain ─────────────────────────
  // Steer the comet head; the chain of motes trails behind and every link
  // fires on the nearest shard. The chain is the ship's health.
  function chainGame(container, options = {}) {
    const W = 900, H = 560, SP = 26, WIN = 75, LINK_CAP = 18;
    const verbs = options.verbs || new Set();
    const scale = options.speedScale || 1;
    const onEnd = options.onEnd || (() => {});
    let head = { x: 450, y: 300, dx: 1, dy: 0 };
    let links = [], shards = [], bolts = [], motes = [], arcs = [];
    for (let i = 0; i < 5; i++) links.push({ x: 450 - (i + 1) * SP, y: 300, cool: .16 * (i + 1) });
    let broken = 0, over = 0, shake = 0, spawnAt = 1.6, moteAt = 3;
    const keys = new Set();
    let pointer = null;
    const g = frame(container, W, H, {
      label: 'Constellation Chain. Steer the comet with the pointer or W A S D and arrow keys. Every link of your chain fires on the drifting shards; a shard that touches the chain destroys that link. Survive seventy-five seconds. Press P to pause.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(211, 70);
    canvas.style.touchAction = 'none';
    try { canvas.focus({ preventScroll: true }); } catch { canvas.focus(); }

    const score = () => broken * 100 + links.length * 20;

    function end(won) {
      if (over) return; over = won ? 1 : -1;
      if (won) { burst(head.x, head.y, '#f2d38a', 34, 260); tone(660, .3, 'sine', .06); tone(990, .45, 'sine', .05); }
      g.after(() => { g.destroy(); onEnd({ won, score: score() }); }, 900);
    }

    function damage(s, amount) {
      s.hp -= amount;
      if (s.hp > 0) { tone(320, .05, 'triangle', .03); return; }
      if (!shards.includes(s)) return;
      shards.splice(shards.indexOf(s), 1);
      broken++;
      burst(s.x, s.y, '#d8c48b', 16, 190); tone(240 + Math.random() * 80, .1, 'triangle', .06);
      if (verbs.has('parallax') && broken % 5 === 0)
        motes.push({ x: clamp(s.x, 50, W - 50), y: clamp(s.y, 50, H - 50), p: Math.random() * TAU });
    }

    function step(dt) {
      if (over) return;
      if (g.clock >= WIN) return end(true);
      shake = Math.max(0, shake - dt * 16);
      // Steer: keys win; otherwise glide toward the pointer.
      const kx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
      const ky = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
      let mx = 0, my = 0;
      if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l * 250; my = ky / l * 250; }
      else if (pointer) {
        const dx = pointer.x - head.x, dy = pointer.y - head.y, d = Math.hypot(dx, dy);
        if (d > 14) { const sp = Math.min(270, d * 7); mx = dx / d * sp; my = dy / d * sp; }
      }
      if (mx || my) { const l = Math.hypot(mx, my); head.dx = mx / l; head.dy = my / l; }
      head.x = clamp(head.x + mx * dt, 24, W - 24);
      head.y = clamp(head.y + my * dt, 24, H - 24);
      // The chain follows, link to link, at fixed spacing.
      let prev = head;
      for (const l of links) {
        const dx = prev.x - l.x, dy = prev.y - l.y, d = Math.hypot(dx, dy) || 1;
        if (d > SP) { l.x = prev.x - dx / d * SP; l.y = prev.y - dy / d * SP; }
        prev = l;
      }
      // Shards drift in from the edges, angled toward the comet's ground.
      spawnAt -= dt;
      if (spawnAt <= 0) {
        spawnAt = Math.max(1.05, 2.5 - g.clock * .021);
        let x = 0, y = 0, tries = 0;
        do {
          const side = Math.floor(Math.random() * 4);
          if (side === 0) { x = -30; y = Math.random() * H; }
          else if (side === 1) { x = W + 30; y = Math.random() * H; }
          else if (side === 2) { y = -30; x = Math.random() * W; }
          else { y = H + 30; x = Math.random() * W; }
        } while (Math.hypot(x - head.x, y - head.y) < 260 && ++tries < 8);
        const tx = 450 * .45 + head.x * .55 + (Math.random() - .5) * 220;
        const ty = 280 * .45 + head.y * .55 + (Math.random() - .5) * 160;
        const ang = Math.atan2(ty - y, tx - x);
        const sp = (58 + g.clock * 1.25 + Math.random() * 30) * scale;
        shards.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 13 + Math.random() * 4, hp: 2, a: Math.random() * TAU, spin: (Math.random() - .5) * 1.6 });
      }
      // Free star-motes appear to be gathered.
      moteAt -= dt;
      if (moteAt <= 0) {
        moteAt = 3.6 + Math.random() * 1.6;
        if (motes.length < 3) motes.push({ x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120), p: Math.random() * TAU });
      }
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.spin * dt;
        if (s.x < -90 || s.x > W + 90 || s.y < -90 || s.y > H + 90) shards.splice(i, 1);
      }
      // Every link fires on its nearest shard, staggered by its own clock.
      for (const l of links) {
        l.cool -= dt;
        if (l.cool > 0) continue;
        let best = null, bd = 320;
        for (const s of shards) { const d = Math.hypot(s.x - l.x, s.y - l.y); if (d < bd) { bd = d; best = s; } }
        if (best) {
          const a = Math.atan2(best.y - l.y, best.x - l.x);
          bolts.push({ x: l.x, y: l.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, target: best, life: 1.4 });
          l.cool = .8;
          if (Math.random() < .35) tone(880 + Math.random() * 120, .04, 'square', .018);
        } else l.cool = .12;
      }
      // Bolts fly, gently homing; the chain verb arcs to a second shard.
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]; b.life -= dt;
        if (b.life <= 0) { bolts.splice(i, 1); continue; }
        if (b.target && shards.includes(b.target)) {
          const want = Math.atan2(b.target.y - b.y, b.target.x - b.x), cur = Math.atan2(b.vy, b.vx);
          const diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
          const na = cur + clamp(diff, -7 * dt, 7 * dt);
          b.vx = Math.cos(na) * 520; b.vy = Math.sin(na) * 520;
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        let hit = false;
        for (let j = shards.length - 1; j >= 0; j--) {
          const s = shards[j];
          if (Math.hypot(s.x - b.x, s.y - b.y) < s.r + 4) {
            hit = true;
            burst(b.x, b.y, '#f2d38a', 6, 90);
            damage(s, 1);
            if (verbs.has('chain')) {
              const other = shards.find(o => o !== s && Math.hypot(o.x - s.x, o.y - s.y) < 150);
              if (other) { arcs.push({ x1: s.x, y1: s.y, x2: other.x, y2: other.y, t: .18 }); damage(other, .5); tone(1200, .05, 'sine', .02); }
            }
            break;
          }
        }
        if (hit) bolts.splice(i, 1);
      }
      for (let i = arcs.length - 1; i >= 0; i--) { arcs[i].t -= dt; if (arcs[i].t <= 0) arcs.splice(i, 1); }
      // A shard that touches the chain destroys that link; a shard that
      // reaches a bare head ends the trial.
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        let struck = -1;
        for (let j = 0; j < links.length; j++) if (Math.hypot(links[j].x - s.x, links[j].y - s.y) < s.r + 9) { struck = j; break; }
        const headHit = Math.hypot(head.x - s.x, head.y - s.y) < s.r + 11;
        if (struck < 0 && !headHit) continue;
        shards.splice(i, 1);
        burst(s.x, s.y, '#f58e9b', 20, 210); tone(150, .25, 'sawtooth', .05);
        if (!reduced()) shake = 7;
        if (struck >= 0) links.splice(struck, 1);
        else if (links.length) links.pop();
        else return end(false);
      }
      // Gather motes for new links (the trail verb doubles the growth).
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        if (Math.hypot(m.x - head.x, m.y - head.y) < 24) {
          motes.splice(i, 1);
          const growth = verbs.has('trail') ? 2 : 1;
          for (let k = 0; k < growth && links.length < LINK_CAP; k++) {
            const tail = links[links.length - 1] || head;
            links.push({ x: tail.x, y: tail.y, cool: .4 + Math.random() * .4 });
          }
          burst(m.x, m.y, '#e9dcae', 10, 130); tone(700 + links.length * 12, .09, 'sine', .05);
        }
      }
    }

    function draw(ctx, dt, clock) {
      ctx.save();
      if (shake > 0 && !reduced()) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      ctx.fillStyle = '#0e1410'; ctx.fillRect(-14, -14, W + 28, H + 28);
      stars();
      // Free motes: small four-point teal stars.
      for (const m of motes) {
        const tw = .65 + Math.sin(clock * 3 + m.p) * .35;
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(clock * .6 + m.p);
        const mg = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
        mg.addColorStop(0, '#eafff6'); mg.addColorStop(.4, '#9ed7c6aa'); mg.addColorStop(1, '#9ed7c600');
        ctx.globalAlpha = tw; ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#d8f4e8'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // The constellation thread through the links.
      if (links.length) {
        ctx.strokeStyle = '#c4ac7938'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(head.x, head.y);
        for (const l of links) ctx.lineTo(l.x, l.y);
        ctx.stroke();
      }
      // Links: warm star-motes.
      for (const l of links) {
        const lg = ctx.createRadialGradient(l.x, l.y, .5, l.x, l.y, 11);
        lg.addColorStop(0, '#fff6dd'); lg.addColorStop(.45, '#f2d38a'); lg.addColorStop(1, '#f2d38a00');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(l.x, l.y, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f8e9bd'; ctx.beginPath(); ctx.arc(l.x, l.y, 3.2, 0, TAU); ctx.fill();
      }
      // The comet head and its short teal breath.
      const hg = ctx.createRadialGradient(head.x, head.y, 1, head.x, head.y, 16);
      hg.addColorStop(0, '#ffffff'); hg.addColorStop(.5, '#cfe8df'); hg.addColorStop(1, '#9ed7c600');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(head.x, head.y, 16, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#9ed7c6aa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(head.x - head.dx * 12, head.y - head.dy * 12); ctx.lineTo(head.x - head.dx * 30, head.y - head.dy * 30); ctx.stroke();
      // Shards: dark spinning flint, rose when cracked.
      for (const s of shards) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, w = s.r * (0.82 + Math.sin(i * 2.7 + s.r) * .2);
          i ? ctx.lineTo(Math.cos(a) * w, Math.sin(a) * w) : ctx.moveTo(Math.cos(a) * w, Math.sin(a) * w);
        }
        ctx.closePath();
        ctx.fillStyle = '#33302a'; ctx.fill();
        ctx.strokeStyle = s.hp < 2 ? '#f58e9b' : '#8d7f5c'; ctx.lineWidth = 2; ctx.stroke();
        if (s.hp < 2) {
          ctx.strokeStyle = '#f58e9b88'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-s.r * .5, -s.r * .3); ctx.lineTo(s.r * .2, s.r * .1); ctx.lineTo(-s.r * .1, s.r * .55); ctx.stroke();
        }
        ctx.restore();
      }
      // Bolts: short gilt streaks.
      ctx.strokeStyle = '#f2d38a'; ctx.lineWidth = 2;
      for (const b of bolts) { ctx.beginPath(); ctx.moveTo(b.x - b.vx * .014, b.y - b.vy * .014); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      // Chain-verb arcs: brief jagged teal light.
      for (const a of arcs) {
        ctx.globalAlpha = clamp(a.t / .18, 0, 1);
        ctx.strokeStyle = '#9ed7c6'; ctx.lineWidth = 1.5; ctx.beginPath();
        const seg = 5, dx = (a.x2 - a.x1) / seg, dy = (a.y2 - a.y1) / seg;
        ctx.moveTo(a.x1, a.y1);
        for (let i = 1; i < seg; i++) ctx.lineTo(a.x1 + dx * i + (Math.random() - .5) * 10, a.y1 + dy * i + (Math.random() - .5) * 10);
        ctx.lineTo(a.x2, a.y2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = HUD; ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${score()} · CHAIN ${links.length}`, 20, 28);
      ctx.textAlign = 'right';
      ctx.fillText(over ? (over > 0 ? 'THE CHAIN HOLDS' : 'THE CHAIN BREAKS') : `${Math.ceil(WIN - g.clock)}s`, W - 20, 28);
      if (g.clock < 4.2 && !over) {
        ctx.globalAlpha = clamp((4.2 - g.clock) / 1.2, 0, 1);
        ctx.fillStyle = '#e9dcae'; ctx.font = SERIF; ctx.textAlign = 'center';
        ctx.fillText('Constellation Chain', W / 2, 120);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#b7bda4'; ctx.font = SMALL; ctx.textAlign = 'center';
      ctx.fillText('Steer with the pointer or WASD · every link fires on its own · gather star-motes · P pauses', W / 2, H - 16);
    }

    const GAMEKEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
    const point = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    listen(canvas, 'keydown', e => {
      const k = e.key.toLowerCase();
      if (!GAMEKEYS.has(k)) return;
      e.preventDefault(); keys.add(k);
    });
    listen(window, 'keyup', e => keys.delete(e.key.toLowerCase()));
    listen(window, 'blur', () => keys.clear());
    listen(canvas, 'pointerdown', e => { pointer = point(e); try { canvas.setPointerCapture(e.pointerId); } catch {} });
    listen(canvas, 'pointermove', e => { pointer = point(e); });
    return g;
  }

  // ── The comet's tail · Perihelion Run ─────────────────────────────────
  // The skiff flies itself; hold to dive, release to climb, and thread the
  // golden rings as the tail sweeps past faster and faster.
  function perihelionGame(container, options = {}) {
    const W = 900, H = 560, WIN = 60, TOP = 64, BOT = H - 64, R = 132, SK = 9;
    const verbs = options.verbs || new Set();
    const scale = options.speedScale || 1;
    const onEnd = options.onEnd || (() => {});
    const gapHalf = verbs.has('gyro') ? 62 : 54;
    const alpha = Math.asin(gapHalf / R);
    const ENDS = [alpha, Math.PI - alpha, Math.PI + alpha, TAU - alpha];
    const skiff = { x: 200, y: (TOP + BOT) / 2, vy: 0 };
    let gates = [], passed = 0, over = 0, invuln = 0, forgiven = false, shake = 0, gateTimer = 0, pointerHeld = false;
    const keys = new Set();
    const g = frame(container, W, H, {
      label: 'Perihelion Run. Hold Space, W, Up Arrow, or press and hold the canvas to dive; release to climb. Thread the golden rings and survive sixty seconds. Press P to pause.',
      sound: options.sound, step, draw,
    });
    const { canvas, listen, tone, burst, starfield } = g;
    const stars = starfield(311, 60);
    canvas.style.touchAction = 'none';
    try { canvas.focus({ preventScroll: true }); } catch { canvas.focus(); }

    const speed = () => (230 + g.clock * 3.2) * scale;

    function spawnGate() {
      gates.push({ x: W + R + 40, y: TOP + 95 + Math.random() * (BOT - TOP - 190), scored: false, prevDx: null });
    }
    spawnGate();
    gateTimer = (520 + Math.random() * 90) / speed();

    function end(won) {
      if (over) return; over = won ? 1 : -1;
      if (won) { burst(skiff.x, skiff.y, '#f2d38a', 30, 240); tone(660, .3, 'sine', .06); tone(990, .45, 'sine', .05); }
      g.after(() => { g.destroy(); onEnd({ won, score: passed * 120 }); }, 850);
    }

    function crash(kind, gy) {
      if (verbs.has('cinder') && !forgiven) {
        forgiven = true; invuln = 1.6;
        skiff.y = clamp(skiff.y, TOP + SK + 4, BOT - SK - 4);
        skiff.vy = kind === 'rim' ? (skiff.y < gy ? -250 : 250) : (skiff.y < (TOP + BOT) / 2 ? 250 : -250);
        burst(skiff.x, skiff.y, '#f2a66c', 22, 200); tone(220, .25, 'triangle', .05);
        if (!reduced()) shake = 6;
        return;
      }
      burst(skiff.x, skiff.y, '#f58e9b', 30, 240); tone(110, .4, 'sawtooth', .06);
      if (!reduced()) shake = 9;
      end(false);
    }

    function step(dt) {
      if (over) return;
      if (g.clock >= WIN) return end(true);
      shake = Math.max(0, shake - dt * 16);
      invuln = Math.max(0, invuln - dt);
      // Hold dives, release climbs; the tail's pull is patient.
      const holding = pointerHeld || keys.size > 0;
      skiff.vy = clamp(skiff.vy + (holding ? 620 : -560) * dt, -250, 260);
      skiff.y += skiff.vy * dt;
      const sp = speed();
      gateTimer -= dt;
      if (gateTimer <= 0) { spawnGate(); gateTimer = (520 + Math.random() * 90) / sp; }
      for (let i = gates.length - 1; i >= 0; i--) {
        const gt = gates[i];
        gt.x -= sp * dt;
        if (gt.x < -R - 60) { gates.splice(i, 1); continue; }
        const dx = gt.x - skiff.x, dy = skiff.y - gt.y, d = Math.hypot(dx, dy) || 1;
        // Threading the gate: cross its plane inside the gap.
        if (gt.prevDx !== null && gt.prevDx > 0 && dx <= 0 && !gt.scored && Math.abs(dy) < gapHalf - 4) {
          gt.scored = true; passed++;
          burst(skiff.x + 24, skiff.y, '#f2d38a', 12, 150); tone(760 + passed * 8, .09, 'triangle', .05);
        }
        gt.prevDx = dx;
        if (invuln > 0) continue;
        // The rim: on the circle, outside the gap's arc.
        if (Math.abs(d - R) < SK + 3.5 && Math.abs(dy) / d > gapHalf / R) return crash('rim', gt.y);
        // The gilt finials at the gap's corners bite too.
        for (const a of ENDS) {
          if (Math.hypot(skiff.x - (gt.x + Math.cos(a) * R), skiff.y - (gt.y + Math.sin(a) * R)) < SK + 3) return crash('rim', gt.y);
        }
      }
      // The tail's edges are the last way to fall.
      if (skiff.y < TOP + SK || skiff.y > BOT - SK) {
        if (invuln > 0) { skiff.y = clamp(skiff.y, TOP + SK, BOT - SK); skiff.vy *= -.5; }
        else return crash('edge');
      }
    }

    function draw(ctx, dt, clock) {
      ctx.save();
      if (shake > 0 && !reduced()) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      ctx.fillStyle = '#101812'; ctx.fillRect(-14, -14, W + 28, H + 28);
      stars();
      // The comet's tail: dark beyond the rails, a gilt haze within.
      ctx.fillStyle = '#070a08'; ctx.fillRect(0, 0, W, TOP - 40); ctx.fillRect(0, BOT + 40, W, H - BOT - 40);
      const hazeT = ctx.createLinearGradient(0, TOP - 40, 0, TOP);
      hazeT.addColorStop(0, '#c4ac7900'); hazeT.addColorStop(1, '#c4ac7914');
      ctx.fillStyle = hazeT; ctx.fillRect(0, TOP - 40, W, 40);
      const hazeB = ctx.createLinearGradient(0, BOT + 40, 0, BOT);
      hazeB.addColorStop(0, '#c4ac7900'); hazeB.addColorStop(1, '#c4ac7914');
      ctx.fillStyle = hazeB; ctx.fillRect(0, BOT, W, 40);
      ctx.strokeStyle = '#c4ac79'; ctx.lineWidth = 2; ctx.setLineDash([10, 7]);
      ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(W, TOP); ctx.moveTo(0, BOT); ctx.lineTo(W, BOT); ctx.stroke();
      ctx.setLineDash([]);
      // Faint teal streaks streaming past, a sense of speed.
      if (!reduced()) {
        ctx.strokeStyle = '#9ec7d41c'; ctx.lineWidth = 1.5;
        const sp = speed();
        for (let i = 0; i < 10; i++) {
          const sx = ((i * 211 - clock * sp * 1.1) % (W + 240) + W + 240) % (W + 240) - 120;
          const sy = TOP + 24 + (i * 67) % (BOT - TOP - 48);
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 46, sy); ctx.stroke();
        }
      }
      // The golden gates: two arcs with a gap fore and aft.
      for (const gt of gates) {
        ctx.strokeStyle = '#c4ac7926'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, alpha, Math.PI - alpha); ctx.stroke();
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, Math.PI + alpha, TAU - alpha); ctx.stroke();
        ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, alpha, Math.PI - alpha); ctx.stroke();
        ctx.beginPath(); ctx.arc(gt.x, gt.y, R, Math.PI + alpha, TAU - alpha); ctx.stroke();
        ctx.fillStyle = '#f2d38a';
        for (const a of ENDS) { ctx.beginPath(); ctx.arc(gt.x + Math.cos(a) * R, gt.y + Math.sin(a) * R, 3.4, 0, TAU); ctx.fill(); }
      }
      // The skiff: a gilt dart with a teal wake.
      if (invuln <= 0 || Math.floor(clock * 10) % 2 === 0) {
        ctx.save(); ctx.translate(skiff.x, skiff.y); ctx.rotate(clamp(skiff.vy * .0016, -.4, .4));
        ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -7); ctx.lineTo(-16, 0); ctx.lineTo(-10, 7); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = '#f2d38a'; ctx.beginPath(); ctx.arc(2, 0, 2.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#9ed7c688'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-26 - Math.random() * 6, 0); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      // HUD
      ctx.fillStyle = '#e9dcae'; ctx.font = HUD; ctx.textAlign = 'left';
      ctx.fillText(`GATES ${passed} · ${passed * 120}`, 20, 28);
      ctx.textAlign = 'right';
      ctx.fillText(over ? (over > 0 ? 'PERIHELION REACHED' : 'LOST TO THE LIGHT') : `${Math.ceil(WIN - g.clock)}s`, W - 20, 28);
      if (g.clock < 4.2 && !over) {
        ctx.globalAlpha = clamp((4.2 - g.clock) / 1.2, 0, 1);
        ctx.fillStyle = '#e9dcae'; ctx.font = SERIF; ctx.textAlign = 'center';
        ctx.fillText('Perihelion Run', W / 2, 120);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#b7bda4'; ctx.font = SMALL; ctx.textAlign = 'center';
      ctx.fillText('Hold to dive — release to climb · thread the golden rings · P pauses', W / 2, H - 16);
    }

    const GAMEKEYS = new Set([' ', 'w', 'arrowup']);
    listen(canvas, 'keydown', e => {
      const k = e.key.toLowerCase();
      if (!GAMEKEYS.has(k)) return;
      e.preventDefault(); keys.add(k);
    });
    listen(window, 'keyup', e => keys.delete(e.key.toLowerCase()));
    listen(window, 'blur', () => { keys.clear(); pointerHeld = false; });
    listen(canvas, 'pointerdown', e => { pointerHeld = true; try { canvas.setPointerCapture(e.pointerId); } catch {} });
    listen(canvas, 'pointerup', () => { pointerHeld = false; });
    listen(canvas, 'pointercancel', () => { pointerHeld = false; });
    return g;
  }

  AT.register({
    id: 'chain', name: 'Constellation Chain', place: 'The wandering stars',
    brief: 'Your chain is your shield. Gather star-motes; every link fires on the debris.',
    create: chainGame,
  });
  AT.register({
    id: 'perihelion', name: 'Perihelion Run', place: "The comet's tail",
    brief: 'Hold to dive, release to climb. Thread the golden gates at rising speed.',
    create: perihelionGame,
  });
})();
