'use strict';

// Skirmish: the Grand Tour's combat core. A survey skiff, telegraphed threats,
// and an instrument build whose verbs rewrite the rules mid-run.
// Fixed-timestep sim (120 Hz), seeded drops, sim/presentation separated.
window.AetherSkirmish = (() => {
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Movement feel: near-immediate steering, then the visuals overshoot.
  const SWIM = { maxSpeed: 270, accel: 1900, damping: 8, burstSpeed: 720, burstTime: .16, burstCd: .8, burstInvuln: .32, hurtInvuln: .7 };
  const SECTORS = [
    { name: 'The Inner Worlds', bg: '#161209', accent: '#e2b078', mote: '#f2d38a', fog: '#c9a45c' },
    { name: 'The Giants', bg: '#171011', accent: '#d98d80', mote: '#f2b9a0', fog: '#c9846a' },
    { name: 'The Long Dark', bg: '#0d1018', accent: '#8fa8d8', mote: '#b9c9ea', fog: '#6f91ab' },
  ];

  const ENEMIES = {
    drifter: { name: 'Drifter', hp: 26, speed: 118, accel: 520, radius: 15, damage: 9, kb: 260, resist: .5, lungeRange: 150, windup: .5, lungeSpeed: 540, lungeTime: .26, cd: 1.7, motes: 2 },
    weaver: { name: 'Weaver', hp: 20, speed: 95, accel: 460, radius: 13, damage: 7, kb: 200, resist: .3, keepAway: 230, orbCd: 2.1, orbSpeed: 165, motes: 3 },
    shard: { name: 'Shard', hp: 9, speed: 250, accel: 1300, radius: 8, damage: 5, kb: 150, resist: 0, motes: 1 },
    maw: { name: 'Maw', hp: 70, speed: 46, accel: 180, radius: 26, damage: 14, kb: 380, resist: .85, beamCd: 4.2, beamWindup: 1.0, beamTime: .55, motes: 6 },
  };

  // Instruments are rule changes, not stat boosts. Verbs travel into trials too.
  const INSTRUMENTS = {
    'lodestone-coil': { name: 'Lodestone Coil', icon: '◎', verbs: ['well'], text: 'Burst leaves a gravity well that drags threats inward for 2.5s.', trialNote: 'Trials: hazards bend near you.' },
    'echo-plate': { name: 'Echo Plate', icon: '❘❘', verbs: ['echo'], text: 'Every bolt answers itself: a second shot follows 0.35s behind.', trialNote: 'Trials: some actions repeat, once removed.' },
    'prism-lens': { name: 'Prism Lens', icon: '✦', verbs: ['split'], text: 'Every fourth bolt splits into a fan of three.', trialNote: 'Trials: the fourth repetition divides.' },
    'rime-coating': { name: 'Rime Coating', icon: '❄', verbs: ['freeze'], text: 'Bursting freezes everything within 90px for 0.8s.', trialNote: 'Trials: one mistake is forgiven, once.' },
    'static-net': { name: 'Static Net', icon: '⌁', verbs: ['chain'], text: 'Bolt hits arc to the nearest other threat within 120px at 40% force.', trialNote: 'Trials: success leaks to a neighbour.' },
    'cinder-valve': { name: 'Cinder Valve', icon: '◉', verbs: ['cinder'], text: 'Taking a hit vents a shockwave that shoves everything back.', trialNote: 'Trials: a hard failure pushes back, once.' },
    'longwake-sail': { name: 'Longwake Sail', icon: '≋', verbs: ['trail'], text: 'Your burst leaves a burning wake for a second.', trialNote: 'Trials: trails and pickups are worth more.' },
    'parallax-mirror': { name: 'Parallax Mirror', icon: '◐', verbs: ['parallax'], text: 'Every fifth hit also strikes the most distant threat.', trialNote: 'Trials: every fifth success doubles.' },
    'golden-sextant': { name: 'Golden Sextant', icon: '✧', verbs: [], text: 'All stardust gains are worth a third more.', trialNote: 'Everything pays a little more.' },
    'ironwood-ribs': { name: 'Ironwood Ribs', icon: '▤', verbs: [], text: '+1 maximum hull, and repair one now.', trialNote: 'The ship holds together.' },
    'phase-gyro': { name: 'Phase Gyro', icon: '◌', verbs: ['gyro'], text: 'Burst recharges a third faster.', trialNote: 'Trials: forgiving windows widen.' },
    'umbra-lure': { name: 'Umbra Lure', icon: '◆', verbs: ['lure'], text: 'Each hunt draws out a gilded elite with a heavy purse.', trialNote: 'More danger, more dust.' },
  };
  const HULLS = {
    kite: { name: 'Swift Kite', desc: 'The survey standard. Sharp steering, honest manners.', hp: 60, speed: 1, boltCd: .22, boltDmg: 10, burst: 1, unlock: null },
    bell: { name: 'Iron Bell', desc: 'Slow, enormous, unbothered. Bolts land like a rung bell.', hp: 85, speed: .86, boltCd: .3, boltDmg: 17, burst: .9, unlock: 'Complete a tour' },
    moth: { name: 'Moth Wing', desc: 'Tissue and starlight. Fragile, but the bolt is a needle.', hp: 44, speed: 1.12, boltCd: .15, boltDmg: 7, burst: 1.15, unlock: 'Defeat the Umbral Maw' },
  };

  function rng(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }

  function create(container, options) {
    const W = 960, H = 600;
    const sector = SECTORS[options.sector ?? 0];
    const hull = HULLS[options.hull || 'kite'];
    const verbs = new Set((options.instruments || []).flatMap(id => INSTRUMENTS[id]?.verbs || []));
    const lure = (options.instruments || []).includes('umbra-lure');
    const rand = rng(options.seed ?? 1);
    const boss = options.boss === true;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H; canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', boss ? 'Boss arena. Move with WASD or pointer, fire toward the pointer, Space or right-click to burst.' : 'Skirmish arena. Move with WASD or pointer, fire toward the pointer, Space or right-click to burst.');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const abort = new AbortController();
    const listen = (el, type, fn, o) => el.addEventListener(type, fn, { ...o, signal: abort.signal });

    // ── Sim state ──────────────────────────────────────────────────────────
    let destroyed = false, raf = 0, last = 0, acc = 0, clock = 0;
    let player, enemies, bolts, orbs, motes, wells, trails, freezes, parts, popups;
    let wave, waveIntro, phase, shake = 0, hitStop = 0, flash = 0, dust = 0, kills = 0, boltCount = 0, frameCount = 0;
    let aim = { x: W / 2, y: 0 }, keys = new Set(), firing = false, burstDir = { x: 1, y: 0 };
    let bossEnt = null, bossPhase = 1;
    let ended = false;
    function reset() {
      player = { x: W / 2, y: H - 130, vx: 0, vy: 0, hp: hull.hp, maxHp: hull.hp, burstT: 0, burstCd: 0, invuln: 0, hurtInvuln: 0, boltCd: 0, bank: 0, trail: [] };
      enemies = []; bolts = []; orbs = []; motes = []; wells = []; trails = []; freezes = []; parts = []; popups = [];
      wave = 0; waveIntro = 1.6; phase = 'intro'; dust = 0; kills = 0; boltCount = 0; ended = false;
      bossEnt = boss ? { id: 'boss', kind: 'maw', name: 'The Umbral Maw', x: W / 2, y: 150, vx: 0, vy: 0, hp: 620, maxHp: 620, radius: 46, state: 'chase', t: 0, cd: 2, beam: null, hurt: 0, spawnCd: 5 } : null;
    }
    reset();
    const waveBudget = () => {
      if (boss) return [];
      const s = options.sector ?? 0;
      const base = [4 + s * 2, 6 + s * 2, 7 + s * 3][wave - 1] || 9;
      return base + (options.elite ? 2 : 0);
    };
    const waveKinds = () => {
      const s = options.sector ?? 0;
      const pool = ['drifter', 'drifter'];
      if (s >= 1) pool.push('weaver', 'shard');
      if (s >= 2) pool.push('maw', 'shard', 'weaver');
      if (options.elite) pool.push('weaver', 'maw');
      return pool;
    };
    function spawnWave() {
      wave++;
      const n = waveBudget(), pool = waveKinds();
      for (let i = 0; i < n; i++) spawnEnemy(pool[Math.floor(rand() * pool.length)]);
      if (lure && wave === 3) spawnEnemy('maw', true);
      waveIntro = 1.4;
    }
    function spawnEnemy(kind, gilded = false) {
      const def = ENEMIES[kind];
      const side = rand() * TAU;
      enemies.push({
        kind, gilded, x: W / 2 + Math.cos(side) * (W / 2 - 60), y: H / 2 + Math.sin(side) * (H / 2 - 60),
        vx: 0, vy: 0, hp: def.hp * (gilded ? 2.5 : 1) * (1 + (options.sector ?? 0) * .25), maxHp: def.hp * (gilded ? 2.5 : 1) * (1 + (options.sector ?? 0) * .25),
        state: 'chase', t: 0, cd: def.cd || def.orbCd || def.beamCd || 2, hurt: 0, frozen: 0, slow: 0, born: 0,
      });
      burst(W / 2 + Math.cos(side) * (W / 2 - 60), H / 2 + Math.sin(side) * (H / 2 - 60), sector.accent, 8, 120);
    }

    function burst(x, y, colour, n = 16, force = 180) {
      for (let i = 0; i < (reduced() ? 4 : n); i++) {
        const a = Math.random() * TAU, s = 40 + Math.random() * force;
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .35 + Math.random() * .45, max: .8, colour, size: 1.5 + Math.random() * 2.5 });
      }
    }
    function popup(x, y, text, colour = '#f1f4ac') { popups.push({ x, y, text, life: .9, colour }); }

    // ── Sim ────────────────────────────────────────────────────────────────
    function step(dt) {
      if (ended) return;
      clock += dt;
      const p = player;
      // Input → velocity: sharp steering; the view adds the overshoot.
      const mx = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
      const my = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0);
      if (p.burstT > 0) {
        p.burstT -= dt;
        p.vx = burstDir.x * SWIM.burstSpeed * hull.burst; p.vy = burstDir.y * SWIM.burstSpeed * hull.burst;
        if (verbs.has('trail')) trails.push({ x: p.x, y: p.y, life: 1 });
      } else {
        const len = Math.hypot(mx, my) || 1;
        p.vx += mx / len * SWIM.accel * dt; p.vy += my / len * SWIM.accel * dt;
        const damp = Math.exp(-SWIM.damping * dt);
        p.vx *= damp; p.vy *= damp;
        const sp = Math.hypot(p.vx, p.vy), max = SWIM.maxSpeed * hull.speed;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
      }
      p.x = clamp(p.x + p.vx * dt, 24, W - 24); p.y = clamp(p.y + p.vy * dt, 24, H - 24);
      p.bank += (clamp((p.vx) / 300, -1, 1) - p.bank) * (1 - Math.exp(-8 * dt));
      p.trail.unshift({ x: p.x, y: p.y }); if (p.trail.length > 14) p.trail.pop();
      p.burstCd = Math.max(0, p.burstCd - dt); p.invuln = Math.max(0, p.invuln - dt); p.hurtInvuln = Math.max(0, p.hurtInvuln - dt);
      p.boltCd = Math.max(0, p.boltCd - dt);

      // Primary: a bolt toward the aim.
      if (firing && p.boltCd <= 0 && phase === 'combat') {
        p.boltCd = hull.boltCd;
        fireBolt(Math.atan2(aim.y - p.y, aim.x - p.x));
      }
      // Bolts
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { bolts.splice(i, 1); continue; }
        let hitSomething = false;
        const targets = bossEnt && bossEnt.hp > 0 ? [...enemies, bossEnt] : enemies;
        for (const e of targets) {
          if (e.hp <= 0 || e.frozen > 0) continue;
          const def = ENEMIES[e.kind];
          const r = e.radius ?? def.radius;
          if (Math.hypot(e.x - b.x, e.y - b.y) < r + 5) {
            hitSomething = true;
            damageEnemy(e, b.dmg, b);
            bolts.splice(i, 1);
            break;
          }
        }
        if (hitSomething) continue;
      }
      // Enemy logic
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const def = ENEMIES[e.kind];
        e.born = (e.born ?? 1) + dt;
        e.hurt = Math.max(0, e.hurt - dt); e.frozen = Math.max(0, e.frozen - dt); e.slow = Math.max(0, e.slow - dt);
        if (e.frozen > 0) { e.vx *= .9; e.vy *= .9; e.x += e.vx * dt; e.y += e.vy * dt; continue; }
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        const slowMul = e.slow > 0 ? .45 : 1;
        // Wells pull threats.
        for (const w of wells) {
          const wdx = w.x - e.x, wdy = w.y - e.y, wd = Math.hypot(wdx, wdy) || 1;
          if (wd < w.r) { e.vx += wdx / wd * 320 * dt; e.vy += wdy / wd * 320 * dt; }
        }
        if (e.kind === 'drifter' || e.kind === 'shard') {
          if (e.state === 'chase') {
            e.vx += dx / d * def.accel * dt; e.vy += dy / d * def.accel * dt;
            const sp = Math.hypot(e.vx, e.vy), max = def.speed * slowMul;
            if (sp > max) { e.vx *= max / sp; e.vy *= max / sp; }
            e.cd -= dt;
            if (e.kind === 'drifter' && d < def.lungeRange && e.cd <= 0) { e.state = 'windup'; e.t = def.windup; e.lungeDir = { x: dx / d, y: dy / d }; }
          } else if (e.state === 'windup') {
            e.t -= dt; e.vx *= .8; e.vy *= .8;
            if (e.t <= 0) { e.state = 'lunge'; e.t = def.lungeTime; e.vx = e.lungeDir.x * def.lungeSpeed * slowMul; e.vy = e.lungeDir.y * def.lungeSpeed * slowMul; }
          } else if (e.state === 'lunge') {
            e.t -= dt;
            if (e.t <= 0) { e.state = 'chase'; e.cd = def.cd; }
          }
        } else if (e.kind === 'weaver') {
          const want = d < def.keepAway - 30 ? -1 : d > def.keepAway + 30 ? 1 : 0;
          const orbit = { x: -dy / d, y: dx / d };
          e.vx += (dx / d * want + orbit.x * .7) * def.accel * dt; e.vy += (dy / d * want + orbit.y * .7) * def.accel * dt;
          const sp = Math.hypot(e.vx, e.vy), max = def.speed * slowMul;
          if (sp > max) { e.vx *= max / sp; e.vy *= max / sp; }
          e.cd -= dt;
          if (e.cd <= 0 && phase === 'combat') {
            e.cd = def.orbCd;
            orbs.push({ x: e.x, y: e.y, vx: dx / d * def.orbSpeed, vy: dy / d * def.orbSpeed, life: 4 });
          }
        } else if (e.kind === 'maw') {
          e.vx += dx / d * def.accel * dt; e.vy += dy / d * def.accel * dt;
          const sp = Math.hypot(e.vx, e.vy), max = def.speed * slowMul;
          if (sp > max) { e.vx *= max / sp; e.vy *= max / sp; }
          if (e.beam) {
            e.beam.t -= dt;
            if (e.beam.t <= 0) e.beam = null;
            else if (e.beam.firing) {
              const bdx = p.x - e.x, bdy = p.y - e.y, bd = Math.hypot(bdx, bdy);
              const beamAng = Math.atan2(e.beam.dy, e.beam.dx);
              const toPlayer = Math.atan2(bdy, bdx);
              const diff = Math.abs(Math.atan2(Math.sin(toPlayer - beamAng), Math.cos(toPlayer - beamAng)));
              if (diff < .12 && bd < 560 && p.hurtInvuln <= 0 && p.invuln <= 0) hurtPlayer(def.damage, e);
            }
          } else {
            e.cd -= dt;
            if (e.cd <= 0 && d < 520) {
              e.cd = def.beamCd;
              const ang = Math.atan2(dy, dx);
              e.beam = { t: def.beamWindup + def.beamTime, windup: def.beamWindup, firing: false, dx: Math.cos(ang), dy: Math.sin(ang) };
              setTimeout(() => { if (e.beam && !destroyed) e.beam.firing = true; }, def.beamWindup * 1000);
            }
          }
        }
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.x = clamp(e.x, 14, W - 14); e.y = clamp(e.y, 14, H - 14);
        // Contact damage
        if (d < (e.radius ?? def.radius) + 12 && p.hurtInvuln <= 0 && p.invuln <= 0) {
          hurtPlayer(def.damage, e);
          const k = def.kb / Math.max(1, d);
          p.vx -= dx / d * def.kb * .4; p.vy -= dy / d * def.kb * .4;
          e.vx += dx / d * 120 * (1 - def.resist); e.vy += dy / d * 120 * (1 - def.resist);
        }
      }
      // Boss logic
      if (bossEnt && bossEnt.hp > 0) bossStep(bossEnt, dt);
      // Orbs
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.x += o.vx * dt; o.y += o.vy * dt; o.life -= dt;
        if (o.life <= 0 || o.x < -10 || o.x > W + 10 || o.y < -10 || o.y > H + 10) { orbs.splice(i, 1); continue; }
        if (Math.hypot(o.x - p.x, o.y - p.y) < 16 && p.hurtInvuln <= 0 && p.invuln <= 0) { orbs.splice(i, 1); hurtPlayer(8, null); }
      }
      // Wells/trails/freezes decay; trails burn enemies.
      wells.forEach(w => w.life -= dt); wells = wells.filter(w => w.life > 0);
      freezes.forEach(f => f.life -= dt); freezes = freezes.filter(f => f.life > 0);
      trails.forEach(t => t.life -= dt); trails = trails.filter(t => t.life > 0);
      if (verbs.has('trail')) for (const t of trails) for (const e of enemies) {
        if (e.hp > 0 && e.burnCd !== clock && Math.hypot(e.x - t.x, e.y - t.y) < 16) { e.burnCd = clock; damageEnemy(e, 4, null, true); }
      }
      // Motes drift to the player.
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
        if (d < 130) { m.vx += dx / d * 700 * dt; m.vy += dy / d * 700 * dt; }
        m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= .96; m.vy *= .96; m.life -= dt;
        if (d < 16) {
          motes.splice(i, 1);
          if (m.kind === 'repair') { player.hp = Math.min(player.maxHp, player.hp + 8); popup(p.x, p.y - 20, '+8 PLATING', '#9ed7c6'); tone(620, .15, 'sine', .05); }
          else if (m.kind === 'magnet') { for (const o of motes) if (!o.kind) { const dx2 = p.x - o.x, dy2 = p.y - o.y, dd = Math.hypot(dx2, dy2) || 1; o.vx = dx2 / dd * 900; o.vy = dy2 / dd * 900; } popup(p.x, p.y - 20, 'THE MOTES COME HOME', '#b3a0d8'); tone(740, .18, 'sine', .05); }
          else { dust += 2; popup(p.x, p.y - 20, '+2', sector.mote); tone(880, .05, 'sine', .03); }
        }
        else if (m.life <= 0) motes.splice(i, 1);
      }
      // Waves
      if (!boss) {
        if (phase === 'intro') { waveIntro -= dt; if (waveIntro <= 0) { phase = 'combat'; if (!enemies.length) spawnWave(); } }
        if (phase === 'combat' && enemies.every(e => e.hp <= 0) && !bossEnt) {
          if (wave >= 3) return end(true);
          phase = 'intro'; waveIntro = 1.8;
          player.hp = Math.min(player.maxHp, player.hp + 6);
          popup(W / 2, H / 2, 'THE FIELD SETTLES · +6 HULL-PLATING', sector.mote);
        }
        if (phase === 'intro' && waveIntro <= 0) { phase = 'combat'; spawnWave(); }
      }
    }
    function bossStep(b, dt) {
      const def = ENEMIES.maw, p = player;
      b.hurt = Math.max(0, b.hurt - dt);
      const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.vx += dx / d * 160 * dt; b.vy += dy / d * 160 * dt;
      const sp = Math.hypot(b.vx, b.vy), max = bossPhase === 2 ? 88 : 42;
      if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
      b.x = clamp(b.x + b.vx * dt, 60, W - 60); b.y = clamp(b.y + b.vy * dt, 60, H - 60);
      if (bossPhase === 1 && b.hp < b.maxHp * .55) {
        bossPhase = 2;
        popup(W / 2, H / 2 - 80, 'THE MAW REMEMBERS ITS STORMS', '#e8a0a8');
        burst(b.x, b.y, '#e8a0a8', 40, 320); shake = 14; hitStop = .12;
        tone(110, .6, 'sawtooth', .07);
      }
      b.spawnCd -= dt;
      if (bossPhase === 1 && b.spawnCd <= 0) { b.spawnCd = 5.5; spawnEnemy('shard'); spawnEnemy('shard'); }
      if (bossPhase === 2) {
        b.cd -= dt;
        if (b.cd <= 0) {
          b.cd = 2.6;
          // A radial flare ring — dodge it with the burst, as the trials taught.
          const n = 16;
          for (let i = 0; i < n; i++) {
            const a = i / n * TAU + clock;
            orbs.push({ x: b.x, y: b.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 3.4, ring: true });
          }
          tone(196, .3, 'sine', .05);
        }
      }
      if (d < 58 + 12 && p.hurtInvuln <= 0 && p.invuln <= 0) hurtPlayer(14, b);
      if (b.hp <= 0) {
        burst(b.x, b.y, '#f2d38a', 60, 380); burst(b.x, b.y, '#e8a0a8', 40, 300);
        shake = 18; hitStop = .25; tone(523, .5, 'sine', .07); tone(784, .8, 'sine', .05);
        bossEnt = null;
        end(true);
      }
    }
    function fireBolt(angle) {
      boltCount++;
      const p = player, speed = 540;
      const mk = a => bolts.push({ x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: hull.boltDmg, life: 1.3 });
      mk(angle);
      if (verbs.has('echo')) setTimeout(() => { if (!destroyed && phase === 'combat') bolts.push({ x: p.x + Math.cos(angle) * 16, y: p.y + Math.sin(angle) * 16, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg: hull.boltDmg * .6, life: 1.3, echo: true }); }, 350);
      if (verbs.has('split') && boltCount % 4 === 0) { mk(angle - .22); mk(angle + .22); }
      tone(700 + (boltCount % 4) * 60, .05, 'triangle', .028);
    }
    function damageEnemy(e, dmg, bolt, quiet = false) {
      e.hp -= dmg; e.hurt = .12;
      if (!quiet) {
        popup(e.x, e.y - (e.radius ?? 14) - 8, Math.round(dmg), '#f1f4ac');
        burst(e.x, e.y, sector.mote, 5, 90); tone(340 + dmg * 8, .05, 'triangle', .03);
      }
      if (bolt) {
        hitCount++;
        if (verbs.has('chain')) {
          let nearest = null, nd = 120;
          const pool = bossEnt ? [...enemies, bossEnt] : enemies;
          for (const o of pool) {
            if (o === e || o.hp <= 0) continue;
            const d = Math.hypot(o.x - e.x, o.y - e.y);
            if (d < nd) { nd = d; nearest = o; }
          }
          if (nearest) {
            arcs.push({ x1: e.x, y1: e.y, x2: nearest.x, y2: nearest.y, life: .18 });
            damageEnemy(nearest, dmg * .4, null, true);
            tone(960, .06, 'square', .02);
          }
        }
        if (verbs.has('parallax') && hitCount % 5 === 0) {
          const pool = (bossEnt ? [...enemies, bossEnt] : enemies).filter(o => o.hp > 0 && o !== e);
          if (pool.length) {
            const far = pool.reduce((a, b) => Math.hypot(b.x - player.x, b.y - player.y) > Math.hypot(a.x - player.x, a.y - player.y) ? b : a);
            arcs.push({ x1: player.x, y1: player.y, x2: far.x, y2: far.y, life: .22, gold: true });
            damageEnemy(far, dmg * .8, null, true);
          }
        }
      }
      const def = ENEMIES[e.kind];
      if (e.hp <= 0) {
        kills++;
        hitStop = Math.max(hitStop, .06); shake = Math.max(shake, 4);
        burst(e.x, e.y, sector.accent, e.gilded ? 34 : 18, e.gilded ? 300 : 200);
        tone(e.kind === 'maw' ? 98 : 180, .18, 'sawtooth', .05);
        const drops = (def?.motes || 2) * (e.gilded ? 4 : 1);
        for (let i = 0; i < drops; i++) motes.push({ x: e.x + (rand() - .5) * 30, y: e.y + (rand() - .5) * 30, vx: (rand() - .5) * 120, vy: (rand() - .5) * 120, life: 9 });
        // Rare supply drops: repair plating, or a charm that pulls every mote home.
        if (rand() < .09) motes.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 12, kind: 'repair' });
        else if (rand() < .08) motes.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 12, kind: 'magnet' });
        if (e === bossEnt) { /* boss handles its own death */ }
        enemies = enemies.filter(o => o.hp > 0);
      }
    }
    let hitCount = 0;
    let arcs = [];
    function hurtPlayer(dmg, from) {
      player.hp -= dmg; player.hurtInvuln = SWIM.hurtInvuln;
      shake = Math.max(shake, 9); flash = .2; hitStop = Math.max(hitStop, .05);
      burst(player.x, player.y, '#f58e9b', 22, 240); tone(120, .25, 'sawtooth', .06);
      if (verbs.has('cinder')) {
        burst(player.x, player.y, '#f2a66c', 30, 320);
        const pool = bossEnt ? [...enemies, bossEnt] : enemies;
        for (const e of pool) {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < 150 && e.hp > 0) {
            const k = 420 / Math.max(30, d);
            e.vx += (e.x - player.x) / d * k * 60; e.vy += (e.y - player.y) / d * k * 60;
            damageEnemy(e, 8, null, true);
          }
        }
      }
      if (player.hp <= 0) end(false);
    }
    function tryBurst() {
      const p = player;
      const cdMul = verbs.has('gyro') ? .65 : 1;
      if (p.burstCd > 0 || p.burstT > 0 || phase !== 'combat') return;
      const mx = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
      const my = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0);
      const len = Math.hypot(mx, my) || 1;
      burstDir = len > 1 || mx || my ? { x: mx / len, y: my / len } : { x: Math.cos(Math.atan2(aim.y - p.y, aim.x - p.x)), y: Math.sin(Math.atan2(aim.y - p.y, aim.x - p.x)) };
      p.burstT = SWIM.burstTime; p.burstCd = SWIM.burstCd * cdMul; p.invuln = SWIM.burstInvuln;
      burst(p.x, p.y, sector.mote, 10, 130); tone(520, .1, 'sine', .04);
      if (verbs.has('well')) wells.push({ x: p.x, y: p.y, r: 110, life: 2.5 });
      if (verbs.has('freeze')) {
        freezes.push({ x: p.x, y: p.y, r: 90, life: .8 });
        for (const e of enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < 90) e.frozen = .8;
      }
    }
    function end(won) {
      if (ended) return; ended = true;
      setTimeout(() => {
        const gain = dust + (won ? 30 + (options.sector ?? 0) * 10 : 8);
        destroy();
        options.onEnd?.({ won, dust: gain, kills });
      }, won ? 1100 : 1400);
    }

    // ── Presentation ───────────────────────────────────────────────────────
    const stars = (() => {
      const r = rng(7 + (options.seed ?? 0));
      return Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, s: .4 + r() * 1.2, p: r() * TAU }));
    })();
    let audio, audioGain;
    function tone(freq, len = .1, type = 'sine', vol = .05) {
      if (options.sound === false || destroyed) return;
      try {
        audio ||= new (window.AudioContext || window.webkitAudioContext)();
        if (!audioGain) { audioGain = audio.createGain(); audioGain.gain.value = .5; audioGain.connect(audio.destination); }
        if (audio.state === 'suspended') audio.resume().catch(() => {});
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + len);
        o.connect(g).connect(audioGain); o.start(); o.stop(audio.currentTime + len);
      } catch {}
    }
    function drawEnemy(e) {
      const def = ENEMIES[e.kind];
      const r = e.radius ?? def.radius;
      ctx.save(); ctx.translate(e.x, e.y);
      const bornIn = Math.min(1, (e.born ?? 1) / .45);
      if (bornIn < 1) { ctx.globalAlpha = bornIn; const sc = .4 + bornIn * .6; ctx.scale(sc, sc); }
      const flashOn = e.hurt > 0;
      if (e.kind === 'drifter') {
        ctx.rotate(Math.atan2(e.vy, e.vx) || 0);
        ctx.beginPath(); ctx.moveTo(r + 4, 0); ctx.lineTo(-r, -r * .8); ctx.lineTo(-r * .5, 0); ctx.lineTo(-r, r * .8); ctx.closePath();
        ctx.fillStyle = flashOn ? '#fff' : e.state === 'windup' ? '#f5a08c' : sector.accent; ctx.globalAlpha = e.state === 'windup' ? .95 : .8; ctx.fill();
        if (e.state === 'windup') { ctx.strokeStyle = '#f58e9b'; ctx.globalAlpha = 1; ctx.stroke(); }
      } else if (e.kind === 'weaver') {
        ctx.rotate(clock * 1.5);
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
        ctx.fillStyle = flashOn ? '#fff' : '#b3a0d8'; ctx.fill();
        ctx.fillStyle = sector.bg; ctx.beginPath(); ctx.arc(0, 0, r * .4, 0, TAU); ctx.fill();
      } else if (e.kind === 'shard') {
        ctx.rotate(Math.atan2(e.vy, e.vx));
        ctx.beginPath(); ctx.moveTo(r + 3, 0); ctx.lineTo(-r, -r * .55); ctx.lineTo(-r, r * .55); ctx.closePath();
        ctx.fillStyle = flashOn ? '#fff' : '#9ec7d4'; ctx.fill();
      } else {
        // Maw: a slow sphere with a telegraphed beam
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
        ctx.fillStyle = flashOn ? '#fff' : '#5a3a44'; ctx.fill();
        ctx.strokeStyle = '#e8a0a8'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * .45, 0, TAU); ctx.fillStyle = '#1c1016'; ctx.fill();
        if (e.beam) {
          const windup = !e.beam.firing;
          ctx.rotate(Math.atan2(e.beam.dy, e.beam.dx));
          ctx.strokeStyle = windup ? '#e8a0a8' : '#ff5f6e'; ctx.lineWidth = windup ? 2 : 9;
          ctx.setLineDash(windup ? [6, 8] : []); ctx.globalAlpha = windup ? .7 : .95;
          ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(560, 0); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
      }
      if (e.frozen > 0) { ctx.strokeStyle = '#bfe3ea'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, TAU); ctx.stroke(); }
      if (e.gilded) { ctx.strokeStyle = '#f2d38a'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      // HP pip ring
      if (e.hp < e.maxHp) {
        ctx.rotate(-Math.atan2(e.vy, e.vx) || 0);
        ctx.strokeStyle = '#f1f4ac'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r + 3, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, e.hp / e.maxHp)); ctx.stroke();
      }
      ctx.restore();
    }
    function draw() {
      ctx.fillStyle = sector.bg; ctx.fillRect(0, 0, W, H);
      // Sector atmosphere: a slow-breathing nebula wash and an engraved frame.
      const neb = ctx.createRadialGradient(W * .72, H * .3, 40, W * .72, H * .3, 420);
      neb.addColorStop(0, sector.fog + '2b'); neb.addColorStop(1, sector.fog + '00');
      ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
      const neb2 = ctx.createRadialGradient(W * .18, H * .78, 20, W * .18, H * .78, 300);
      neb2.addColorStop(0, sector.accent + '1c'); neb2.addColorStop(1, sector.accent + '00');
      ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { ctx.globalAlpha = .25 + Math.sin(clock * 1.3 + s.p) * .18; ctx.fillStyle = '#e9dcae'; ctx.fillRect(s.x, s.y, s.s, s.s); }
      ctx.globalAlpha = 1;
      // Engraved arena marks: compass ring + corner ticks
      ctx.strokeStyle = '#c4ac7914'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 190 + Math.sin(clock * .5) * 4, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 320, 0, TAU); ctx.stroke();
      for (const [cx, cy] of [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]]) {
        ctx.strokeStyle = '#c4ac7933'; ctx.beginPath();
        ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
      }
      ctx.save();
      if (shake > 0 && !reduced()) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .88; if (shake < .4) shake = 0; }
      // Wells, freezes, trails
      for (const w of wells) {
        ctx.strokeStyle = '#b3a0d8'; ctx.globalAlpha = Math.min(1, w.life); ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(w.x, w.y, w.r, clock * 1.5, clock * 1.5 + TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      for (const f of freezes) { ctx.globalAlpha = Math.min(.5, f.life); ctx.fillStyle = '#bfe3ea'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      for (const t of trails) { ctx.globalAlpha = t.life * .7; ctx.fillStyle = '#f2a66c'; ctx.beginPath(); ctx.arc(t.x, t.y, 6 * t.life + 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      // Motes
      for (const m of motes) {
        ctx.globalAlpha = Math.min(1, m.life);
        if (m.kind === 'repair') { ctx.fillStyle = '#9ed7c6'; ctx.fillRect(m.x - 4, m.y - 1.5, 8, 3); ctx.fillRect(m.x - 1.5, m.y - 4, 3, 8); }
        else if (m.kind === 'magnet') { ctx.strokeStyle = '#b3a0d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 5, .6, TAU - .6); ctx.stroke(); }
        else { ctx.fillStyle = sector.mote; ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, TAU); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      // Orbs
      for (const o of orbs) {
        ctx.fillStyle = o.ring ? '#e8a0a8' : '#b3a0d8';
        ctx.beginPath(); ctx.arc(o.x, o.y, o.ring ? 7 : 6, 0, TAU); ctx.fill();
        ctx.strokeStyle = sector.bg; ctx.lineWidth = 2; ctx.stroke();
      }
      for (const e of enemies) drawEnemy(e);
      if (bossEnt) drawEnemy(bossEnt);
      // Arcs
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i]; a.life -= 1 / 60;
        if (a.life <= 0) { arcs.splice(i, 1); continue; }
        ctx.strokeStyle = a.gold ? '#f2d38a' : '#9ed7ec'; ctx.lineWidth = 2.5; ctx.globalAlpha = a.life * 5;
        ctx.beginPath(); ctx.moveTo(a.x1, a.y1);
        const mx = (a.x1 + a.x2) / 2 + 14, my = (a.y1 + a.y2) / 2 - 14;
        ctx.quadraticCurveTo(mx, my, a.x2, a.y2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // Bolts
      for (const b of bolts) {
        ctx.strokeStyle = b.echo ? '#9ed7c6' : '#f1f4ac'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .022, b.y - b.vy * .022); ctx.stroke();
      }
      // Player kite
      const p = player;
      for (let i = p.trail.length - 1; i >= 0; i--) {
        ctx.globalAlpha = (1 - i / p.trail.length) * .3;
        ctx.fillStyle = sector.mote;
        ctx.beginPath(); ctx.arc(p.trail[i].x, p.trail[i].y, 5 * (1 - i / p.trail.length), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const inv = p.invuln > 0 || p.hurtInvuln > 0;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.bank * .5);
      if (inv && Math.floor(clock * 14) % 2) ctx.globalAlpha = .35;
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9); ctx.closePath();
      ctx.fillStyle = '#ece3c8'; ctx.fill(); ctx.strokeStyle = '#141a15'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = sector.accent; ctx.beginPath(); ctx.arc(2, 0, 3, 0, TAU); ctx.fill();
      ctx.restore();
      // Aim reticle
      ctx.strokeStyle = '#ece3c866'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(aim.x, aim.y, 8, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(aim.x - 12, aim.y); ctx.lineTo(aim.x - 4, aim.y); ctx.moveTo(aim.x + 4, aim.y); ctx.lineTo(aim.x + 12, aim.y); ctx.stroke();
      // Particles + popups
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i]; q.life -= 1 / 60;
        if (q.life <= 0) { parts.splice(i, 1); continue; }
        q.x += q.vx / 60; q.y += q.vy / 60;
        ctx.globalAlpha = Math.min(1, q.life / q.max * 2); ctx.fillStyle = q.colour;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (let i = popups.length - 1; i >= 0; i--) {
        const q = popups[i]; q.life -= 1 / 60; q.y -= .5;
        if (q.life <= 0) { popups.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.colour;
        ctx.font = '600 13px "DM Sans"'; ctx.fillText(q.text, q.x, q.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // HUD frame
      const hpW = 200;
      ctx.fillStyle = '#0c130e'; ctx.fillRect(16, 14, hpW, 10);
      ctx.fillStyle = player.hp / player.maxHp > .3 ? '#9ed7c6' : '#f58e9b';
      ctx.fillRect(16, 14, hpW * Math.max(0, player.hp / player.maxHp), 10);
      ctx.strokeStyle = '#c4ac7955'; ctx.strokeRect(16, 14, hpW, 10);
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 12px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`${Math.ceil(Math.max(0, player.hp))} / ${player.maxHp}`, 20, 22);
      // Burst pip
      ctx.fillStyle = player.burstCd <= 0 ? sector.mote : '#5a5f4e';
      ctx.fillText(player.burstCd <= 0 ? 'BURST READY ✦' : `BURST ${player.burstCd.toFixed(1)}`, 16, 42);
      ctx.textAlign = 'right';
      ctx.fillStyle = sector.mote; ctx.fillText(`✦ ${dust}`, W - 18, 26);
      if (!boss) { ctx.fillText(`WAVE ${Math.max(1, wave)} / 3`, W - 18, 44); }
      else if (bossEnt) {
        ctx.fillStyle = '#e8a0a8'; ctx.textAlign = 'center';
        ctx.fillRect(W / 2 - 160, 16, 320 * Math.max(0, bossEnt.hp / bossEnt.maxHp), 8);
        ctx.strokeStyle = '#e8a0a855'; ctx.strokeRect(W / 2 - 160, 16, 320, 8);
        ctx.fillStyle = '#e9dcae'; ctx.fillText('THE UMBRAL MAW', W / 2, 38);
      }
      if (phase === 'intro' && !boss) {
        ctx.fillStyle = '#e9dcae'; ctx.textAlign = 'center'; ctx.font = '24px Cormorant, serif';
        ctx.fillText(wave === 0 ? 'Contacts approaching…' : `Wave ${wave + 1}`, W / 2, H / 2 - 40);
      }
      if (flash > 0 && !reduced()) { ctx.fillStyle = `rgba(245,142,155,${flash})`; ctx.fillRect(0, 0, W, H); flash -= .02; }
      if ((frameCount++ & 15) === 0) {
        canvas.dataset.phase = phase; canvas.dataset.wave = wave; canvas.dataset.kills = kills;
        canvas.dataset.dust = dust; canvas.dataset.hp = Math.ceil(Math.max(0, player.hp));
        canvas.dataset.enemies = enemies.filter(e => e.hp > 0).length + (bossEnt ? 1 : 0);
      }
    }
    function tick(now) {
      if (destroyed) return;
      if (document.hidden) { last = 0; raf = requestAnimationFrame(tick); return; }
      const elapsed = last ? Math.min(.08, (now - last) / 1000) : 0; last = now;
      if (hitStop > 0 && !reduced()) hitStop -= elapsed;
      else { acc += elapsed; while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; } }
      draw();
      raf = requestAnimationFrame(tick);
    }
    function point(e) {
      const r = canvas.getBoundingClientRect();
      aim = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    }
    listen(canvas, 'pointermove', point);
    listen(canvas, 'pointerdown', e => { point(e); canvas.focus({ preventScroll: true }); if (e.button === 2) tryBurst(); else firing = true; });
    listen(canvas, 'pointerup', () => { firing = false; });
    listen(canvas, 'contextmenu', e => e.preventDefault());
    listen(window, 'keydown', e => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k) && document.activeElement === canvas) e.preventDefault();
      keys.add(k);
      if (k === ' ' && !e.repeat && document.activeElement === canvas) tryBurst();
    });
    listen(window, 'keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    raf = requestAnimationFrame(tick);
    canvas.focus({ preventScroll: true });
    function destroy() { destroyed = true; cancelAnimationFrame(raf); abort.abort(); audio?.close().catch(() => {}); canvas.remove(); }
    return { destroy, get state() { return { hp: player.hp, wave, dust, kills, phase }; } };
  }
  return { create, INSTRUMENTS, HULLS, SECTORS, ENEMIES };
})();
