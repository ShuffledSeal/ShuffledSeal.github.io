'use strict';

// Skirmish: the Grand Tour's combat core. A survey skiff, telegraphed threats,
// and an instrument build whose verbs rewrite the rules mid-run.
// Fixed-timestep sim (120 Hz), seeded drops, sim/presentation separated.
window.AetherSkirmish = (() => {
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reducedMQ.matches;

  // Movement feel: near-immediate steering, then the visuals overshoot.
  const SWIM = { maxSpeed: 270, accel: 1900, damping: 8, burstSpeed: 720, burstTime: .16, burstCd: .8, burstInvuln: .32, hurtInvuln: .7 };
  const SECTORS = [
    { name: 'The Inner Worlds', bg: '#111d2c', accent: '#e2b078', mote: '#f2d38a', fog: '#c9a45c' },
    { name: 'The Giants', bg: '#171a29', accent: '#d98d80', mote: '#f2b9a0', fog: '#c9846a' },
    { name: 'The Long Dark', bg: '#0d1018', accent: '#8fa8d8', mote: '#b9c9ea', fog: '#6f91ab' },
  ];

  const ENEMIES = {
    drifter: { name: 'Drifter', hp: 26, speed: 118, accel: 520, radius: 15, damage: 9, kb: 260, resist: .5, lungeRange: 150, windup: .5, lungeSpeed: 540, lungeTime: .26, cd: 1.7, motes: 2 },
    weaver: { name: 'Weaver', hp: 20, speed: 95, accel: 460, radius: 13, damage: 7, kb: 200, resist: .3, keepAway: 230, orbCd: 2.1, orbSpeed: 165, motes: 3 },
    shard: { name: 'Shard', hp: 9, speed: 250, accel: 1300, radius: 8, damage: 5, kb: 150, resist: 0, motes: 1 },
    maw: { name: 'Maw', hp: 70, speed: 46, accel: 180, radius: 26, damage: 14, kb: 380, resist: .85, beamCd: 4.2, beamWindup: 1.0, beamTime: .55, motes: 6 },
    lancer: { name: 'Lancer', hp: 34, speed: 76, accel: 320, radius: 18, damage: 9, kb: 180, resist: .35, keepAway: 300, orbCd: 3.2, orbSpeed: 320, motes: 4 },
    blossom: { name: 'Glass Bloom', hp: 43, speed: 82, accel: 350, radius: 22, damage: 10, kb: 220, resist: .45, motes: 5 },
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
    'aurora-siphon': { name: 'Aurora Siphon', icon: '♒', verbs: ['siphon'], text: 'Every fifth kill restores 5 plating. Sustain a streak to stay alive.', trialNote: 'A successful trial earns extra salvage.' },
    'starforged-rail': { name: 'Starforged Rail', icon: '⟡', verbs: ['rail'], text: 'Every sixth shot pierces enemies and deals 60% extra damage.', trialNote: 'A clean trajectory carries more momentum.' },
    'tempest-fuse': { name: 'Tempest Fuse', icon: 'ϟ', verbs: ['tempest'], text: 'After a dash, the next three shots spark and strike harder.', trialNote: 'Fast reactions yield brighter stardust.' },
    'void-compass': { name: 'Void Compass', icon: '◇', verbs: ['compass'], text: 'Faster flight while moving toward an enemy. Kill chains build momentum.', trialNote: 'The closest signal becomes easier to find.' },
  };
  const HULLS = {
    kite: { name: 'Swift Kite', desc: 'The survey standard. Sharp steering, honest manners.', hp: 60, speed: 1, boltCd: .22, boltDmg: 10, burst: 1, unlock: null },
    bell: { name: 'Iron Bell', desc: 'Slow, enormous, unbothered. Bolts land like a rung bell.', hp: 85, speed: .86, boltCd: .3, boltDmg: 17, burst: .9, unlock: 'Complete a tour' },
    moth: { name: 'Moth Wing', desc: 'Tissue and starlight. Fragile, but the bolt is a needle.', hp: 44, speed: 1.12, boltCd: .15, boltDmg: 7, burst: 1.15, unlock: 'Defeat the Umbral Maw' },
    comet: { name: 'Comet Wraith', desc: 'Dangerous momentum. A swift hunter built for close encounters.', hp: 52, speed: 1.18, boltCd: .18, boltDmg: 9, burst: 1.25, unlock: 'Reach 100 threats cleared' },
  };

  // Cadence is relative to the hull's Pulse cycle. Ranges are world pixels.
  const WEAPONS = {
    pulse: { name: 'Pulse', key: '1', range: 700, speed: 540, cycle: 1, damage: 1, colour: '#f1f4ac', note: '700 range · steady fire · immediate recovery' },
    scatter: { name: 'Scatter', key: '2', range: 225, speed: 470, cycle: 2.7, damage: .54, colour: '#ffc18c', note: '225 range · five-pellet fan · close in for full damage' },
    lance: { name: 'Lance', key: '3', range: 940, speed: 1100, cycle: 2.8, charge: .45, damage: 3.4, colour: '#9eeef8', note: '940 range · hold to charge · pierces four targets' },
    mortar: { name: 'Mortar', key: '4', range: 460, speed: 420, cycle: 4.1, damage: 3.2, radius: 76, colour: '#cfb1ff', note: '100–460 range · delayed blast · lead clustered threats' },
  };
  const WEAPON_IDS = Object.keys(WEAPONS);
  const ACTS = [
    { name: 'Break the screen', hint: 'Drifters rush; the rear weaver keeps its distance.' },
    { name: 'Crossfire', hint: 'Lancers lock their aim. Flank the volley; sweep the shards.' },
    { name: 'Silence the command', hint: 'The command Maw charges a beam. Clear its escorts, then strike.' },
  ];

  function rng(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }

  function create(container, options) {
    const W = 960, H = 600;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sector = SECTORS[options.sector ?? 0];
    const hull = HULLS[options.hull || 'kite'];
    const verbs = new Set((options.instruments || []).flatMap(id => INSTRUMENTS[id]?.verbs || []));
    const lure = (options.instruments || []).includes('umbra-lure');
    const rand = rng(options.seed ?? 1);
    const boss = options.boss === true;
    const endless = options.endless === true;
    const mode = options.difficulty === 'explorer' ? {hp:.78,velocity:.85,damage:.70,reward:.8} :
      options.difficulty === 'eclipse' ? {hp:1.38,velocity:1.16,damage:1.28,reward:1.32} :
      {hp:1,velocity:1,damage:1,reward:1};

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H; canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', (boss ? 'Boss arena. ' : 'Skirmish arena. ') + 'Move with WASD, arrow keys or the pointer. Hold click, J, Z or Enter to fire. 1–4 select weapons. Space or right-click to dash. P pauses.');
    container.appendChild(canvas);
    const weaponBar = document.createElement('div');
    // NB: deliberately NOT .skirmish-draft — tests assert that selector is a single
    // (hideable) breather bar. Layout is inlined; voyage.css owns the pressed state.
    weaponBar.className = 'skirmish-armory';
    weaponBar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;padding:12px 14px;border:1px solid #d8c49466;background:#0f2034;color:#f3d9a4;font:600 12px "DM Sans",sans-serif';
    weaponBar.setAttribute('role', 'group'); weaponBar.setAttribute('aria-label', 'Hunt weapons');
    const armoryButtonStyle = "min-height:44px;padding:10px 16px;border:1px solid #d8c494;background:#1a2d3d;color:#e5efdf;font:600 12px 'DM Sans',sans-serif;cursor:pointer";
    weaponBar.innerHTML = `<strong style="flex:1 0 100%;text-align:center">ARMORY · 1–4 SELECT · HOLD FIRE · SWITCHING PRESERVES RECOVERY</strong>` + WEAPON_IDS.map(id => `<button type="button" data-skirmish-weapon="${id}" aria-pressed="false" style="${armoryButtonStyle}">${WEAPONS[id].key} · ${WEAPONS[id].name}</button>`).join('');
    const weaponHelp = document.createElement('span');
    weaponHelp.style.cssText = 'flex:1 0 100%;text-align:center;line-height:1.6';
    weaponBar.appendChild(weaponHelp);
    container.appendChild(weaponBar);
    const missionStatus = document.createElement('p');
    missionStatus.dataset.skirmishObjective = '';
    missionStatus.style.cssText = 'margin:0;padding:12px 16px;background:#0e1d30;color:#e5efdf;font:600 13px/1.6 sans-serif';
    container.appendChild(missionStatus);
    const draftBar = document.createElement('div');
    draftBar.className = 'skirmish-draft'; draftBar.hidden = true;
    container.appendChild(draftBar);
    // Screen-reader status: visually hidden, polite, throttled to ~2Hz.
    const srStatus = document.createElement('p');
    srStatus.setAttribute('role', 'status');
    srStatus.setAttribute('aria-live', 'polite');
    srStatus.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';
    container.appendChild(srStatus);
    canvas.dataset.paused = 'false';
    canvas.dataset.boltsFired = '0';
    canvas.dataset.difficulty = options.difficulty || 'standard';
    const ctx = canvas.getContext('2d');
    const abort = new AbortController();
    const listen = (el, type, fn, o) => el.addEventListener(type, fn, { ...o, signal: abort.signal });

    // ── Sim state ──────────────────────────────────────────────────────────
    let destroyed = false, raf = 0, last = 0, acc = 0, clock = 0;
    const timers = new Set();
    const after = (fn, delay) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!destroyed) fn();
      }, delay);
      timers.add(timer);
      return timer;
    };
    let player, enemies, bolts, orbs, motes, wells, trails, freezes, parts, popups;
    let wave, waveIntro, phase, refit = null, shake = 0, hitStop = 0, flash = 0, dust = 0, kills = 0, boltCount = 0, frameCount = 0;
    let aim = { x: W / 2, y: H - 130 }, keys = new Set(), firing = false, burstDir = { x: 1, y: 0 };
    // Pointer flight is the default: your ship physically follows the cursor.
    // M toggles classic twin-stick. Keyboard movement always overrides the pointer.
    let pilot = (() => { try { return localStorage.getItem('aether-flight-mode') !== 'keyboard'; } catch { return true; } })();
    let pointerActive = false, target = null, targetAngle = -Math.PI / 2;
    let streak = 0, streakTime = 0, bestStreak = 0, score = 0, supercharge = 0;
    let hazardTimer = 5.5, hazard = null;
    let echoQueue = [];
    let weapon = (() => { try { const id = options.weapon || localStorage.getItem('aether-hunt-weapon'); return WEAPONS[id] ? id : 'pulse'; } catch { return 'pulse'; } })();
    let charge = 0, pending = [], waveTime = 0, draftChoices = [], objectiveText = '';
    let blasts = [];
    const fieldRelics = [];
    let notice = { text: 'MOUSE PILOT · HOLD CLICK / J / Z / ENTER: FIRE · RIGHT CLICK: DASH · P: PAUSE', ttl: 6 };
    let bossEnt = null, bossPhase = 1;
    let ended = false, paused = false;
    function reset() {
      player = { x: W / 2, y: H - 130, vx: 0, vy: 0, hp: hull.hp, maxHp: hull.hp, burstT: 0, burstCd: 0, invuln: 0, hurtInvuln: 0, boltCd: 0, bank: 0, trail: [] };
      enemies = []; bolts = []; orbs = []; motes = []; wells = []; trails = []; freezes = []; parts = []; popups = [];
      wave = 0; waveIntro = 1.6; phase = 'intro'; refit = null; dust = 0; kills = 0; boltCount = 0; ended = false;
      charge = 0; pending = []; waveTime = 0; blasts = [];
      streak = 0; streakTime = 0; bestStreak = 0; score = 0; supercharge = 0; hazardTimer = 6; hazard = null; echoQueue = [];
      bossEnt = boss ? { id: 'boss', kind: 'maw', name: 'The Umbral Maw', x: W / 2, y: 150, vx: 0, vy: 0, hp: Math.round(620 * mode.hp), maxHp: Math.round(620 * mode.hp), radius: 46, state: 'chase', t: 0, cd: 2, beam: null, hurt: 0, spawnCd: 5 } : null;
    }
    reset();
    const waveBudget = () => {
      if (boss) return [];
      const s = options.sector ?? 0;
      const base = [4 + s * 2, 6 + s * 2, 7 + s * 3][wave - 1] || 9;
      return base + (options.elite ? 2 : 0) + (endless ? Math.min(6, Math.floor((wave - 1) * .85)) : 0);
    };
    const waveKinds = () => {
      const s = options.sector ?? 0;
      const pool = ['drifter', 'drifter'];
      if (s >= 1) pool.push('weaver', 'shard', 'lancer');
      if (s >= 2) pool.push('blossom', 'lancer', 'shard');
      if (s >= 2) pool.push('maw', 'shard', 'weaver');
      if (options.elite) pool.push('weaver', 'maw');
      return pool;
    };
    function spawnWave() {
      wave++;
      const n = waveBudget(), pool = waveKinds();
      waveTime = 0;
      if (endless) {
        for (let i = 0; i < n; i++) spawnEnemy(pool[Math.floor(rand() * pool.length)]);
      } else {
        // Authored roles, two readable packets rather than one random pile.
        const roster = wave === 1 ? ['drifter', 'drifter', 'drifter', 'weaver']
          : wave === 2 ? ['shard', 'shard', 'drifter', 'lancer', 'weaver', 'shard']
          : ['maw', 'drifter', 'drifter', 'lancer', 'shard', 'shard', 'weaver'];
        const firstPacket = Math.ceil(n * .55);
        for (let i = 0; i < n; i++) scheduleEnemy(roster[i % roster.length], i < firstPacket ? 0 : 4.5);
        if (refit === 'pursuit') scheduleEnemy('lancer', 4.5, true);
      }
      if ((options.elite && wave === 3) || (endless && wave % 4 === 0)) spawnEnemy((options.sector ?? 0) > 0 ? 'blossom' : 'weaver', true);
      if (lure && (wave === 3 || (endless && wave % 5 === 0))) spawnEnemy('maw', true);
      notice = { text: !endless ? `ACT ${wave} · ${ACTS[wave - 1].name.toUpperCase()}` : wave % 4 === 0 ? `WAVE ${wave} · GILDED HARBINGER` : `WAVE ${wave} · CONTACTS INBOUND`, ttl: 2.5 };
      waveIntro = 1.4;
    }
    function entryPoint() {
      const side = rand() * TAU;
      return { x: W / 2 + Math.cos(side) * (W / 2 - 60), y: H / 2 + Math.sin(side) * (H / 2 - 60) };
    }
    function scheduleEnemy(kind, at, gilded = false) { pending.push({ kind, at, gilded, ...entryPoint(), warning: .9 }); }
    function spawnEnemy(kind, gilded = false, entry = null) {
      const def = ENEMIES[kind];
      const pos = entry || entryPoint();
      enemies.push({
        kind, gilded, x: pos.x, y: pos.y,
        vx: 0, vy: 0, hp: def.hp * (gilded ? 2.5 : 1) * (1 + (options.sector ?? 0) * .25) * (endless ? 1 + Math.min(1.2, Math.max(0, wave - 1) * .09) : 1) * mode.hp, maxHp: def.hp * (gilded ? 2.5 : 1) * (1 + (options.sector ?? 0) * .25) * (endless ? 1 + Math.min(1.2, Math.max(0, wave - 1) * .09) : 1) * mode.hp,
        state: 'chase', t: 0, cd: def.cd || def.orbCd || def.beamCd || 2, hurt: 0, frozen: 0, slow: 0, born: 0,
      });
      burst(pos.x, pos.y, sector.accent, 8, 120);
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
      if (phase === 'draft') return; // an actual breather, not a lethal menu over live hazards
      clock += dt;
      if (phase === 'intro') {
        waveIntro -= dt;
        if (waveIntro <= 0) { phase = 'combat'; if (!boss) spawnWave(); }
      }
      if (phase === 'combat' && pending.length) {
        waveTime += dt;
        if (!enemies.some(e => e.hp > 0)) waveTime = Math.max(waveTime, Math.min(...pending.map(e => e.at)));
        for (let i = pending.length - 1; i >= 0; i--) {
          const entry = pending[i];
          if (waveTime < entry.at) continue;
          entry.warning -= dt;
          if (entry.warning <= 0) { spawnEnemy(entry.kind, entry.gilded, entry); pending.splice(i, 1); }
        }
      }
      blasts.forEach(b => { b.life -= dt; }); blasts = blasts.filter(b => b.life > 0);
      const p = player;
      // Input → velocity: sharp steering; the view adds the overshoot.
      let mx = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
      let my = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0);
      const keyboardMoving = !!(mx || my);
      const pointerMoving = pilot && pointerActive && !keyboardMoving;
      if (pointerMoving) {
        const dx = aim.x - p.x, dy = aim.y - p.y, d = Math.hypot(dx, dy);
        // Arrival steering gives immediate follow while preventing jitter at the cursor.
        const desiredSpeed = Math.min(SWIM.maxSpeed * hull.speed, d * 7);
        const blend = Math.min(1, 17 * dt);
        p.vx += ((d > 3 ? dx / d * desiredSpeed : 0) - p.vx) * blend;
        p.vy += ((d > 3 ? dy / d * desiredSpeed : 0) - p.vy) * blend;
      }
      if (p.burstT > 0) {
        p.burstT -= dt;
        p.vx = burstDir.x * SWIM.burstSpeed * hull.burst; p.vy = burstDir.y * SWIM.burstSpeed * hull.burst;
        if (verbs.has('trail')) trails.push({ x: p.x, y: p.y, life: 1 });
      } else if (!pointerMoving) {
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

      // The mouse pilots the ship, while the targeting computer leads the closest threat.
      // WASD pilots can still freely aim using the cursor as a traditional twin-stick.
      // A keyboard-only player (pointer never used) gets the same computer aim.
      const live = (bossEnt ? [...enemies, bossEnt] : enemies).filter(e => e.hp > 0);
      target = live.reduce((closest, e) => {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        return !closest || d < closest.d ? { e, d } : closest;
      }, null);
      const autoAim = !pointerActive || (pilot && !keyboardMoving);
      if (target && autoAim) {
        const e = target.e, travel = Math.min(.8, target.d / WEAPONS[weapon].speed);
        const ex = e.x + e.vx * travel * .48, ey = e.y + e.vy * travel * .48;
        targetAngle = Math.atan2(ey - p.y, ex - p.x);
      } else targetAngle = Math.atan2(aim.y - p.y, aim.x - p.x);
      const wantsFire = firing || keys.has('j') || keys.has('z') || keys.has('Enter');
      if (wantsFire && p.boltCd <= 0 && phase === 'combat') {
        const def = WEAPONS[weapon];
        charge += dt;
        if (!def.charge || charge >= def.charge) {
          p.boltCd = hull.boltCd * def.cycle;
          fireBolt(targetAngle, autoAim && target ? target.d : Math.hypot(aim.x - p.x, aim.y - p.y));
          charge = 0;
        }
      } else if (charge > 0) {
        // Releasing a half-charged lance vents it; switching cannot bank a charge.
        charge = 0; p.boltCd = Math.max(p.boltCd, .16);
      }
      // Echo Plate answers in simulation time: pausing mid-volley stays honest.
      for (let i = echoQueue.length - 1; i >= 0; i--) {
        const q = echoQueue[i]; q.t -= dt;
        if (q.t <= 0) {
          echoQueue.splice(i, 1);
          if (phase === 'combat') emitVolley(q.id, q.angle, q.distance, q.damage * .6, q.rail, true);
        }
      }
      notice.ttl = Math.max(0, notice.ttl - dt);
      streakTime = Math.max(0, streakTime - dt);
      if (!streakTime) streak = 0;
      updateHazard(dt);
      // Bolts
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        const travelDt = Math.min(dt, b.life);
        const oldX = b.x, oldY = b.y;
        b.x += b.vx * travelDt; b.y += b.vy * travelDt; b.life -= dt;
        if (b.weapon === 'mortar') {
          if (b.life <= 0) { detonate(b); bolts.splice(i, 1); }
          continue;
        }
        if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { bolts.splice(i, 1); continue; }
        let hitSomething = false;
        const targets = bossEnt && bossEnt.hp > 0 ? [...enemies, bossEnt] : enemies;
        for (const e of targets) {
          if (e.hp <= 0 || b.hits.has(e)) continue;
          const def = ENEMIES[e.kind];
          const r = e.radius ?? def.radius;
          const sx = b.x - oldX, sy = b.y - oldY;
          const along = clamp(((e.x - oldX) * sx + (e.y - oldY) * sy) / (sx * sx + sy * sy || 1), 0, 1);
          if (Math.hypot(e.x - oldX - sx * along, e.y - oldY - sy * along) < r + 5) {
            hitSomething = true;
            b.hits.add(e);
            // Scatter pellets leave the muzzle full-strength and lose force downrange.
            const falloff = b.weapon === 'scatter' && b.maxLife ? .45 + .55 * Math.max(0, b.life / b.maxLife) : 1;
            damageEnemy(e, b.dmg * falloff, b);
            if (b.pierce && b.pierce > 0) {
              b.pierce--; b.dmg *= .8;
            } else bolts.splice(i, 1);
            break;
          }
        }
        if (hitSomething) continue;
        if (b.life <= 0) bolts.splice(i, 1);
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
        } else if (e.kind === 'lancer') {
          const keep = d < 270 ? -1 : d > 345 ? 1 : 0;
          e.vx += (dx / d * keep - dy / d * .45) * def.accel * dt;
          e.vy += (dy / d * keep + dx / d * .45) * def.accel * dt;
          const sp = Math.hypot(e.vx, e.vy) || 1;
          if (sp > def.speed * slowMul * mode.velocity) { e.vx *= def.speed * slowMul * mode.velocity / sp; e.vy *= def.speed * slowMul * mode.velocity / sp; }
          e.cd -= dt;
          if (e.cd < .75 && !e.markAngle) e.markAngle = Math.atan2(dy, dx) + .00001;
          if (e.cd <= 0) {
            const a = e.markAngle || Math.atan2(dy, dx);
            for (const spread of [-.095, 0, .095]) orbs.push({ x: e.x, y: e.y, vx: Math.cos(a + spread) * def.orbSpeed, vy: Math.sin(a + spread) * def.orbSpeed, life: 3, hostile: true });
            e.cd = def.orbCd; e.markAngle = 0;
            tone(190, .12, 'triangle', .035);
          }
        } else if (e.kind === 'blossom') {
          e.vx += dx / d * def.accel * dt; e.vy += dy / d * def.accel * dt;
          const sp = Math.hypot(e.vx, e.vy) || 1;
          if (sp > def.speed * slowMul * mode.velocity) { e.vx *= def.speed * slowMul * mode.velocity / sp; e.vy *= def.speed * slowMul * mode.velocity / sp; }
          e.angle = (e.angle || 0) + dt;
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
            // Windup flip rides the sim clock: pausing mid-telegraph freezes the beam honestly.
            if (!e.beam.firing && e.beam.t <= def.beamTime) e.beam.firing = true;
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
            }
          }
        }
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.x = clamp(e.x, 14, W - 14); e.y = clamp(e.y, 14, H - 14);
        const speed = Math.hypot(e.vx, e.vy);
        if (speed > 8) {
          const desiredFacing = Math.atan2(e.vy, e.vx);
          const facingDelta = Math.atan2(Math.sin(desiredFacing - (e.facing ?? desiredFacing)), Math.cos(desiredFacing - (e.facing ?? desiredFacing)));
          e.facing = (e.facing ?? desiredFacing) + facingDelta * Math.min(1, dt * 11);
        }
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
        if (phase === 'combat' && !pending.length && enemies.every(e => e.hp <= 0) && !bossEnt) {
          if (refit === 'pursuit') { dust += 24; popup(W / 2, H / 2 - 70, '+24 SIGNAL BOUNTY', sector.mote); }
          if (!endless && wave >= 3) return end(true);
          openRefit();
        }
      }
    }
    function openRefit() {
      phase = 'draft'; orbs = []; bolts = []; echoQueue = []; charge = 0;
      hazard = null; hazardTimer = 4; firing = false; keys.clear();
      // Field salvage is recovered before the menu; no need to circle an empty arena.
      for (const mote of motes) {
        if (!mote.kind) dust += 2;
        if (mote.kind === 'repair') player.hp = Math.min(player.maxHp, player.hp + 8);
      }
      motes = [];
      draftChoices = endless ? [
        { id: 'guard', text: 'Reinforce · +14 plating, quicker dash next wave' },
        { id: 'power', text: 'Overclock · +35% weapon damage next wave' },
      ] : wave === 1 ? [
        { id: 'guard', text: 'Patch & evade · +14 plating, quicker dash next act' },
        { id: 'pursuit', text: 'Pursue signal · extra gilded lancer; +24 dust if cleared' },
      ] : [
        { id: 'shelter', text: 'Ground the storm · no sector hazards in the final act' },
        { id: 'power', text: 'Overclock · +35% weapon damage in the final act' },
      ];
      const pool = ['echo-plate', 'lodestone-coil', 'rime-coating', 'static-net', 'longwake-sail', 'parallax-mirror', 'starforged-rail', 'tempest-fuse', 'aurora-siphon']
        .filter(id => !fieldRelics.includes(id) && !(options.instruments || []).includes(id));
      for (let i = 0; i < 2 && pool.length; i++) {
        const id = pool.splice(Math.floor(rand() * pool.length), 1)[0];
        draftChoices.push({ id, text: `${INSTRUMENTS[id].name} · ${INSTRUMENTS[id].text} Lasts this hunt.` });
      }
      draftBar.innerHTML = `<strong>FIELD REFIT · CHOOSE ONE · ${endless ? `WAVE ${wave + 1}` : ACTS[wave].name.toUpperCase()}</strong>` + draftChoices.map((choice, i) => `<button type="button" data-skirmish-refit="${choice.id}">${i + 1} · ${choice.text}</button>`).join('');
      draftBar.hidden = false;
      notice = { text: 'FIELD REFIT · 1–4 CHOOSE · WEAPONS ALSO AVAILABLE BELOW', ttl: 4 };
      updateStatus(true);
    }
    function chooseRefit(choice) {
      if (phase !== 'draft' || paused || destroyed || !draftChoices.some(c => c.id === choice)) return;
      refit = choice;
      if (choice === 'guard') player.hp = Math.min(player.maxHp, player.hp + 14);
      if (INSTRUMENTS[choice]) {
        fieldRelics.push(choice);
        INSTRUMENTS[choice].verbs.forEach(verb => verbs.add(verb));
      }
      draftBar.hidden = true; phase = 'intro'; waveIntro = 1.8;
      notice = { text: INSTRUMENTS[choice] ? `${INSTRUMENTS[choice].name.toUpperCase()} · ONLINE FOR THIS HUNT` : draftChoices.find(c => c.id === choice).text.toUpperCase(), ttl: 3 };
      tone(choice === 'guard' ? 540 : 840, .18, 'triangle', .05);
      canvas.focus({ preventScroll: true });
    }
    function syncArmory() {
      for (const button of weaponBar.querySelectorAll('[data-skirmish-weapon]')) button.setAttribute('aria-pressed', String(button.dataset.skirmishWeapon === weapon));
      weaponHelp.textContent = `${WEAPONS[weapon].name} — ${WEAPONS[weapon].note}`;
      canvas.dataset.weapon = weapon;
    }
    function setWeapon(id, quiet = false) {
      if (!WEAPONS[id] || destroyed) return;
      if (weapon !== id) {
        weapon = id; charge = 0; // a half-charge never survives the swap
        try { localStorage.setItem('aether-hunt-weapon', id); } catch {}
        if (!quiet) {
          notice = { text: `${WEAPONS[id].name.toUpperCase()} · ${WEAPONS[id].note.toUpperCase()}`, ttl: 2.2 };
          tone(560 + WEAPON_IDS.indexOf(id) * 90, .09, 'triangle', .04);
        }
      }
      syncArmory();
    }
    listen(weaponBar, 'click', e => {
      const id = e.target.closest('[data-skirmish-weapon]')?.dataset.skirmishWeapon;
      if (!id) return;
      setWeapon(id);
      canvas.focus({ preventScroll: true });
    });
    syncArmory();
    listen(draftBar, 'click', e => chooseRefit(e.target.closest('[data-skirmish-refit]')?.dataset.skirmishRefit));
    function bossStep(b, dt) {
      const def = ENEMIES.maw, p = player;
      b.hurt = Math.max(0, b.hurt - dt);
      const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.vx += dx / d * 160 * dt; b.vy += dy / d * 160 * dt;
      const sp = Math.hypot(b.vx, b.vy), max = (bossPhase === 2 ? 88 : 42) * mode.velocity;
      if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
      if (sp > 8) {
        const desiredFacing = Math.atan2(b.vy, b.vx);
        const facingDelta = Math.atan2(Math.sin(desiredFacing - (b.facing ?? desiredFacing)), Math.cos(desiredFacing - (b.facing ?? desiredFacing)));
        b.facing = (b.facing ?? desiredFacing) + facingDelta * Math.min(1, dt * 6);
      }
      b.x = clamp(b.x + b.vx * dt, 60, W - 60); b.y = clamp(b.y + b.vy * dt, 60, H - 60);
      // Phase one: a navigable, telegraphed sweeping beam.
      // Telegraph is locked in place before it fires; reading the tell matters.
      if (bossPhase === 1) {
        b.cd -= dt;
        if (!b.beam && b.cd <= 0) {
          b.cd = 4.1;
          const ang = Math.atan2(dy,dx);
          b.beam = {angle:ang,t:1.17,live:false};
          notice = {text:'MAW CHARGING · BREAK THE SIGHTLINE',ttl:1.3};
          tone(240,.12,'sine',.032);
        }
        if(b.beam){
          b.beam.t -= dt;
          if(b.beam.t < .43) b.beam.live = true;
          const angleToPlayer=Math.atan2(p.y-b.y,p.x-b.x);
          const delta=Math.abs(Math.atan2(Math.sin(angleToPlayer-b.beam.angle),Math.cos(angleToPlayer-b.beam.angle)));
          if(b.beam.live&&b.beam.t>0&&delta<.105&&d<750&&p.invuln<=0&&p.hurtInvuln<=0)hurtPlayer(13,b);
          if(b.beam.t<=0)b.beam=null;
        }
      }
      if (bossPhase === 1 && b.hp < b.maxHp * .55) {
        bossPhase = 2; b.beam = null; b.cd = 2.4;
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
          const n = 18, safe = Math.floor(rand()*n);
          for (let i = 0; i < n; i++) {
            if (Math.abs(i-safe)<=1 || (safe===0&&i===n-1) || (safe===n-1&&i===0))continue;
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
    // One trigger pull = one volley. Weapons differ in pattern, reach and recovery;
    // instruments (echo/split/rail) layer on top of whatever is in hand.
    function emitVolley(id, angle, distance, damageMul = 1, rail = false, echo = false) {
      const def = WEAPONS[id], p = player;
      const power = hull.boltDmg * def.damage * damageMul * (rail ? 1.6 : 1) * (refit === 'power' ? 1.35 : 1);
      const mk = a => bolts.push({
        x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16,
        vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
        dmg: power, life: def.range / def.speed, maxLife: def.range / def.speed,
        pierce: id === 'lance' ? 4 : rail ? 2 : 0,
        weapon: id, colour: def.colour, hits: new Set(), echo, glow: rail,
      });
      if (id === 'mortar') {
        // Lobbed shell: flight time is set by the clamped aim distance, so the blast
        // lands where aimed — never closer than 100, never past the 460 reach.
        const d = clamp(distance || def.range, 100, def.range);
        bolts.push({
          x: p.x + Math.cos(angle) * 16, y: p.y + Math.sin(angle) * 16,
          vx: Math.cos(angle) * def.speed, vy: Math.sin(angle) * def.speed,
          dmg: power, life: d / def.speed, maxLife: d / def.speed, pierce: 0,
          weapon: id, colour: def.colour, radius: def.radius, hits: new Set(), echo, glow: rail,
        });
      } else if (id === 'scatter') {
        for (const off of [-.3, -.15, 0, .15, .3]) mk(angle + off);
      } else mk(angle);
      if (verbs.has('echo') && !echo) echoQueue.push({ t: .35, id, angle, distance, damage: damageMul, rail });
      if (verbs.has('split') && !echo && id === 'pulse' && boltCount % 4 === 0) { mk(angle - .22); mk(angle + .22); }
    }
    function detonate(b) {
      const r = b.radius || WEAPONS.mortar.radius;
      blasts.push({ x: b.x, y: b.y, r, life: .34, max: .34, colour: b.colour });
      const pool = bossEnt ? [...enemies, bossEnt] : [...enemies];
      for (const e of pool) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        const reach = r + (e.radius ?? ENEMIES[e.kind].radius);
        if (d < reach) damageEnemy(e, b.dmg * (1 - .45 * Math.min(1, d / reach)), b);
      }
      burst(b.x, b.y, b.colour, 22, 260);
      shake = Math.max(shake, 5); hitStop = Math.max(hitStop, .04);
      tone(120, .32, 'sine', .07);
    }
    function fireBolt(angle, distance) {
      boltCount++;
      canvas.dataset.boltsFired = boltCount;
      const firedRail = verbs.has('rail') && boltCount % 6 === 0;
      const boosted = supercharge > 0;
      if (boosted) supercharge--;
      emitVolley(weapon, angle, distance, boosted ? 1.35 : 1, firedRail);
      if (weapon === 'scatter') tone(300, .07, 'square', .035);
      else if (weapon === 'lance') tone(920, .22, 'sawtooth', .05);
      else if (weapon === 'mortar') tone(210, .16, 'sine', .05);
      else tone(700 + (boltCount % 4) * 60, .05, 'triangle', .028);
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
        streak = streakTime > 0 ? streak + 1 : 1;
        bestStreak = Math.max(bestStreak, streak);
        streakTime = 4.2;
        score += Math.round(50 + Math.min(8, streak - 1) * 14 + (e.gilded ? 240 : 0));
        if (streak === 5 || streak === 10 || streak === 20) {
          popup(player.x, player.y - 30, `${streak} CHAIN · CELESTIAL FLOW`, '#8de6cf');
          tone(520 + streak * 12, .15, 'triangle', .055);
        }
        if (verbs.has('siphon') && kills % 5 === 0) {
          player.hp = Math.min(player.maxHp, player.hp + 5);
          popup(player.x, player.y - 46, '+5 AURORA HEAL', '#9ed7c6');
        }
        if (e.kind === 'blossom') {
          for (let i = 0; i < 3; i++) {
            spawnEnemy('shard');
            const child = enemies[enemies.length - 1];
            child.x = e.x + Math.cos(i * TAU / 3) * 18;
            child.y = e.y + Math.sin(i * TAU / 3) * 18;
            child.born = .5;
          }
        }
        hitStop = Math.max(hitStop, .06); shake = Math.max(shake, 4);
        burst(e.x, e.y, sector.accent, e.gilded ? 34 : 18, e.gilded ? 300 : 200);
        tone(e.kind === 'maw' ? 98 : 180, .18, 'sawtooth', .05);
        const drops = (def?.motes || 2) * (e.gilded ? 4 : 1);
        for (let i = 0; i < drops; i++) motes.push({ x: e.x + (rand() - .5) * 30, y: e.y + (rand() - .5) * 30, vx: (rand() - .5) * 120, vy: (rand() - .5) * 120, life: 9 });
        // Rare supply drops: repair plating, or a charm that pulls every mote home.
        if (rand() < .09) motes.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 12, kind: 'repair' });
        else if (rand() < .08) motes.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 12, kind: 'magnet' });
        if (e === bossEnt) {
          bossEnt = null;
          hazard = null;
          burst(e.x, e.y, '#e8a0a8', 60, 390);
          notice = { text: 'THE UMBRAL MAW FALLS · THE STARS ARE YOURS', ttl: 5 };
          end(true); // Resolve the death here: bossStep is skipped at zero HP.
        }
        enemies = enemies.filter(o => o.hp > 0);
      }
    }
    let hitCount = 0;
    let arcs = [];
    function hurtPlayer(dmg, from) {
      dmg = Math.max(1, Math.round(dmg * mode.damage));
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
      streak = 0; streakTime = 0;
    }
    function tryBurst() {
      if(paused)return;
      const p = player;
      const cdMul = (verbs.has('gyro') ? .65 : 1) * (refit === 'guard' ? .75 : 1);
      if (p.burstCd > 0 || p.burstT > 0 || phase !== 'combat') return;
      const mx = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
      const my = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0);
      const dx = pilot && pointerActive ? aim.x - p.x : Math.cos(targetAngle);
      const dy = pilot && pointerActive ? aim.y - p.y : Math.sin(targetAngle);
      const len = Math.hypot(mx, my) || 1;
      const dashNorm = Math.hypot(dx, dy) || 1;
      burstDir = mx || my ? { x: mx / len, y: my / len } : { x: dx / dashNorm, y: dy / dashNorm };
      p.burstT = SWIM.burstTime; p.burstCd = SWIM.burstCd * cdMul; p.invuln = SWIM.burstInvuln;
      burst(p.x, p.y, sector.mote, 16, 250); tone(520, .1, 'sine', .04);
      if (verbs.has('tempest')) supercharge = 3;
      if (verbs.has('well')) wells.push({ x: p.x, y: p.y, r: 110, life: 2.5 });
      if (verbs.has('freeze')) {
        freezes.push({ x: p.x, y: p.y, r: 90, life: .8 });
        for (const e of enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < 90) e.frozen = .8;
      }
    }
    function end(won) {
      if (ended) return; ended = true;
      firing = false;
      updateStatus(true);
      after(() => {
        const gain = dust + (won ? 30 + (options.sector ?? 0) * 10 : 8);
        destroy();
        options.onEnd?.({ won, dust: Math.round((gain + Math.floor(score / 150)) * mode.reward), kills, score: Math.round(score * mode.reward), bestStreak });
      }, won ? 1100 : 1400);
    }

    // ── Sector hazards: telegraphed, readable, and mechanically distinct ──
    function updateHazard(dt) {
      if (ended || phase !== 'combat' || !player.hp) return;
      if (refit === 'shelter') { hazard = null; return; } // Ground the storm: the final act flies clean.
      if (!hazard) {
        hazardTimer -= dt;
        if (hazardTimer <= 0) {
          const s = options.sector ?? 0;
          hazard = s === 0 ? { kind: 'solar', x: 120 + rand() * (W - 240), radius: 58, t: 2.25, duration: 2.25 }
            : s === 1 ? { kind: 'gravity', x: 140 + rand() * (W - 280), y: 120 + rand() * (H - 240), radius: 135, t: 4.2, duration: 4.2 }
            : { kind: 'lightning', y: 100 + rand() * (H - 200), radius: 35, t: 2.4, duration: 2.4 };
          hazardTimer = (6.5 + rand() * 2) / mode.velocity;
          notice = { text: s === 0 ? 'SOLAR ERUPTION · LEAVE THE MARKED LANE' : s === 1 ? 'GRAVITY RIFT · KEEP MOVING' : 'ION STORM · CROSS THE CONDUIT', ttl: 2.5 };
        }
        return;
      }
      const h = hazard;
      h.t -= dt;
      const firingNow = h.duration - h.t > (h.kind === 'gravity' ? 1.1 : 1.4);
      if (h.kind === 'gravity') {
        const dx = h.x - player.x, dy = h.y - player.y, d = Math.hypot(dx, dy) || 1;
        if (d < h.radius * 1.45) {
          const strength = (1 - Math.min(1, d / (h.radius * 1.45))) * 230;
          player.vx += dx / d * strength * dt;
          player.vy += dy / d * strength * dt;
        }
      }
      if (firingNow && player.hurtInvuln <= 0 && player.invuln <= 0) {
        const hit = h.kind === 'solar' ? Math.abs(player.x - h.x) < h.radius
          : h.kind === 'lightning' ? Math.abs(player.y - h.y) < h.radius
          : Math.hypot(player.x - h.x, player.y - h.y) < 39;
        if (hit) hurtPlayer(h.kind === 'gravity' ? 7 : 10, null);
      }
      if (h.t <= 0) hazard = null;
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
      const heading = Number.isFinite(e.facing) ? e.facing : Math.atan2(e.vy, e.vx);
      ctx.save(); ctx.translate(e.x, e.y);
      if (window.AetherBattleArt) {
        window.AetherBattleArt.enemy(ctx, e, sector, clock, heading);
        ctx.restore();
        return;
      }
      const bornIn = Math.min(1, (e.born ?? 1) / .45);
      if (bornIn < 1) { ctx.globalAlpha = bornIn; const sc = .4 + bornIn * .6; ctx.scale(sc, sc); }
      const flashOn = e.hurt > 0;
      if (e.kind === 'drifter') {
        ctx.rotate(heading);
        ctx.beginPath(); ctx.moveTo(r + 4, 0); ctx.lineTo(-r, -r * .8); ctx.lineTo(-r * .5, 0); ctx.lineTo(-r, r * .8); ctx.closePath();
        ctx.fillStyle = flashOn ? '#fff' : e.state === 'windup' ? '#f5a08c' : sector.accent; ctx.globalAlpha = e.state === 'windup' ? .95 : .8; ctx.fill();
        if (e.state === 'windup') { ctx.strokeStyle = '#f58e9b'; ctx.globalAlpha = 1; ctx.stroke(); }
      } else if (e.kind === 'weaver') {
        ctx.rotate(heading);
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
        ctx.fillStyle = flashOn ? '#fff' : '#b3a0d8'; ctx.fill();
        ctx.fillStyle = sector.bg; ctx.beginPath(); ctx.arc(0, 0, r * .4, 0, TAU); ctx.fill();
      } else if (e.kind === 'shard') {
        ctx.rotate(heading);
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
        ctx.rotate(-heading);
        ctx.strokeStyle = '#f1f4ac'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r + 3, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, e.hp / e.maxHp)); ctx.stroke();
      }
      ctx.restore();
    }
    function draw() {
      if (window.AetherBattleArt) window.AetherBattleArt.backdrop(ctx, W, H, options.sector ?? 0, clock, boss);
      else { ctx.fillStyle = sector.bg; ctx.fillRect(0, 0, W, H); }
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
      // Telegraphs use a wind-up so danger is a choice, not a surprise.
      if (hazard) {
        const h = hazard, warm = h.duration - h.t < (h.kind === 'gravity' ? 1.1 : 1.4);
        ctx.save();
        ctx.globalAlpha = warm ? .28 + .22 * Math.sin(clock * 11) ** 2 : .48;
        ctx.fillStyle = h.kind === 'gravity' ? '#8e89ec' : h.kind === 'lightning' ? '#98e5ec' : '#ff936e';
        if (h.kind === 'solar') ctx.fillRect(h.x - h.radius, 0, h.radius * 2, H);
        else if (h.kind === 'lightning') ctx.fillRect(0, h.y - h.radius, W, h.radius * 2);
        else { ctx.beginPath(); ctx.arc(h.x, h.y, warm ? h.radius : h.radius * .58, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = .85;
        ctx.strokeStyle = warm ? '#ffd29b' : '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash(warm ? [10, 7] : []);
        if (h.kind === 'solar') ctx.strokeRect(h.x - h.radius, 0, h.radius * 2, H);
        else if (h.kind === 'lightning') ctx.strokeRect(0, h.y - h.radius, W, h.radius * 2);
        else { ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, clock, clock + TAU); ctx.stroke(); }
        ctx.restore();
      }
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
      // Blasts bloom and fade where mortar shells land.
      for (const b of blasts) {
        const t = 1 - b.life / b.max;
        ctx.globalAlpha = (1 - t) * .7; ctx.fillStyle = b.colour;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (.35 + .65 * t), 0, TAU); ctx.fill();
        ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#fff3f8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * t, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // Scheduled contacts flash their breach point before they arrive.
      for (const e of pending) {
        if (waveTime < e.at) continue;
        ctx.globalAlpha = .45 + .35 * Math.sin(clock * 14);
        ctx.strokeStyle = e.gilded ? '#f2d38a' : '#ff9eaa'; ctx.lineWidth = 2; ctx.setLineDash([6, 7]);
        ctx.beginPath(); ctx.arc(e.x, e.y, 22 + 4 * Math.sin(clock * 7), 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(e.x - 9, e.y); ctx.lineTo(e.x + 9, e.y); ctx.moveTo(e.x, e.y - 9); ctx.lineTo(e.x, e.y + 9); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      for (const e of enemies) drawEnemy(e);
      if (bossEnt) drawEnemy(bossEnt);
      // The Maw beam has one full second of visual warning before it ignites.
      if (bossEnt?.beam) {
        const b=bossEnt, a=b.beam.angle;
        ctx.save(); ctx.strokeStyle=b.beam.live?'#fff0bc':'#ff9eaa';
        ctx.lineWidth=b.beam.live?18:3.5;ctx.globalAlpha=b.beam.live?.75:(.38+.2*Math.sin(clock*22)**2);
        ctx.setLineDash(b.beam.live?[]:[12,8]);
        ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+Math.cos(a)*1100,b.y+Math.sin(a)*1100);ctx.stroke();
        ctx.setLineDash([]);ctx.restore();
      }
      // Lancers telegraph an exact firing angle; player can dodge deliberately.
      for (const e of enemies) if (e.kind === 'lancer' && e.markAngle) {
        ctx.strokeStyle = '#ffbcb8'; ctx.lineWidth = 1.8; ctx.setLineDash([9, 7]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.markAngle) * 1050, e.y + Math.sin(e.markAngle) * 1050); ctx.stroke(); ctx.setLineDash([]);
      }
      // Arcs
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i]; a.life -= 1 / 60;
        if (a.life <= 0) { arcs.splice(i, 1); continue; }
        ctx.strokeStyle = a.gold ? '#f2d38a' : '#9ed7ec'; ctx.lineWidth = 2.5; ctx.globalAlpha = a.life * 5;
        ctx.beginPath(); ctx.moveTo(a.x1, a.y1);
        const mx = (a.x1 + a.x2) / 2 + 14, my = (a.y1 + a.y2) / 2 - 14;
        ctx.quadraticCurveTo(mx, my, a.x2, a.y2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // Bolts — each weapon reads differently at a glance.
      for (const b of bolts) {
        if (b.weapon === 'mortar') {
          // Lobbed shell: it climbs a fake arc while a dashed ring marks the blast site.
          const prog = b.maxLife ? 1 - b.life / b.maxLife : 0;
          const lift = Math.sin(prog * Math.PI) * 30;
          const ix = b.x + b.vx * b.life, iy = b.y + b.vy * b.life;
          ctx.globalAlpha = .45; ctx.strokeStyle = b.colour; ctx.lineWidth = 1.6; ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.arc(ix, iy, (b.radius || 76) * .55, 0, TAU); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 1;
          ctx.fillStyle = b.colour;
          ctx.beginPath(); ctx.arc(b.x, b.y - lift, 5.5, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#141a15'; ctx.lineWidth = 1.4; ctx.stroke();
          continue;
        }
        ctx.strokeStyle = b.glow ? '#9eeef8' : b.echo ? '#9ed7c6' : b.colour || '#f1f4ac';
        ctx.lineWidth = b.weapon === 'lance' ? 5 : b.glow ? 5 : b.weapon === 'scatter' ? 2.6 : 3;
        ctx.lineCap = 'round';
        const trailLen = b.weapon === 'lance' ? .045 : .022;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * trailLen, b.y - b.vy * trailLen); ctx.stroke();
      }
      // Player kite and thruster trails
      const p = player;
      for (let i = p.trail.length - 1; i >= 0; i--) {
        ctx.globalAlpha = (1 - i / p.trail.length) * .3;
        ctx.fillStyle = sector.mote;
        ctx.beginPath(); ctx.arc(p.trail[i].x, p.trail[i].y, 5 * (1 - i / p.trail.length), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const inv = p.invuln > 0 || p.hurtInvuln > 0;
      ctx.save(); ctx.translate(p.x, p.y);
      if (inv && Math.floor(clock * 14) % 2) ctx.globalAlpha = .35;
      if (window.AetherBattleArt) window.AetherBattleArt.ship(ctx, options.hull || 'kite', targetAngle, clock, p.burstT > 0, sector);
      else {
        ctx.rotate(p.bank * .5);
        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9); ctx.closePath();
        ctx.fillStyle = '#ece3c8'; ctx.fill(); ctx.strokeStyle = '#141a15'; ctx.lineWidth = 1.6; ctx.stroke();
      }
      ctx.restore();
      // Ship-position reticle in mouse flight; actual targeting reticle in WASD mode.
      const rx = aim.x, ry = aim.y;
      ctx.strokeStyle = pilot ? '#a7ebde88' : '#ece3c688'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(rx, ry, pilot ? 15 : 9, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx - 18, ry); ctx.lineTo(rx - 7, ry); ctx.moveTo(rx + 7, ry); ctx.lineTo(rx + 18, ry); ctx.stroke();
      if (pilot && target && target.d < 580) {
        ctx.strokeStyle = '#f5d18b88'; ctx.beginPath(); ctx.arc(target.e.x, target.e.y, (target.e.radius || 15) + 12, clock, clock + TAU * .72); ctx.stroke();
      }
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
        ctx.font = '600 19px "DM Sans"'; ctx.fillText(q.text, q.x, q.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // HUD frame — sized for the canvas as actually displayed (≈348px on phones).
      const hpW = 220;
      ctx.fillStyle = '#0b1726'; ctx.fillRect(16, 14, hpW, 14);
      ctx.fillStyle = player.hp / player.maxHp > .3 ? '#9ed7c6' : '#f58e9b';
      ctx.fillRect(16, 14, hpW * Math.max(0, player.hp / player.maxHp), 14);
      ctx.strokeStyle = '#c4ac7955'; ctx.strokeRect(16, 14, hpW, 14);
      ctx.fillStyle = '#e9dcae'; ctx.font = '600 18px "DM Sans"'; ctx.textAlign = 'left';
      ctx.fillText(`${Math.ceil(Math.max(0, player.hp))} / ${player.maxHp}`, 22, 27);
      // Burst pip
      ctx.fillStyle = player.burstCd <= 0 ? sector.mote : '#5a5f4e';
      ctx.fillText(player.burstCd <= 0 ? 'DASH READY ✦' : `DASH ${player.burstCd.toFixed(1)}`, 16, 52);
      ctx.font = '600 15px "DM Sans"'; ctx.fillStyle = '#b8d9cf';
      ctx.fillText(pilot ? 'MOUSE PILOT · M TO CHANGE' : 'WASD PILOT · M TO CHANGE', 16, 74);
      // Armory readout + lance charge meter, bottom-left, clear of the notice line.
      ctx.fillStyle = WEAPONS[weapon].colour; ctx.font = '600 15px "DM Sans"';
      ctx.fillText(`${WEAPONS[weapon].key} · ${WEAPONS[weapon].name.toUpperCase()}`, 16, H - 14);
      if (WEAPONS[weapon].charge && phase === 'combat') {
        ctx.fillStyle = '#0b1726'; ctx.fillRect(16, H - 32, 150, 7);
        ctx.fillStyle = WEAPONS[weapon].colour; ctx.fillRect(16, H - 32, 150 * Math.min(1, charge / WEAPONS[weapon].charge), 7);
        ctx.strokeStyle = '#c4ac7955'; ctx.strokeRect(16, H - 32, 150, 7);
      }
      if (streak > 1) {
        ctx.fillStyle = '#9decc8'; ctx.font = '700 27px "DM Sans"';
        ctx.fillText(`${streak}× FLOW`, 16, 106);
        ctx.fillStyle = '#478376'; ctx.fillRect(16, 114, 150, 4);
        ctx.fillStyle = '#9decc8'; ctx.fillRect(16, 114, 150 * streakTime / 4.2, 4);
      }
      ctx.textAlign = 'right'; ctx.font = '600 18px "DM Sans"';
      ctx.fillStyle = sector.mote; ctx.fillText(`✦ ${dust}`, W - 18, 30);
      ctx.fillStyle = '#c7d9d1'; ctx.font = '600 15px "DM Sans"';
      ctx.fillText(`SCORE ${score.toLocaleString()}`, W - 18, 76);
      if (!boss) { ctx.fillText(endless ? `WAVE ${Math.max(1, wave)}` : `ACT ${Math.max(1, wave)} / 3`, W - 18, 53); }
      if (refit && phase !== 'draft') {
        const refitLabel = refit === 'guard' ? 'REFIT: PLATING + QUICK DASH' : refit === 'power' ? 'REFIT: DAMAGE +35%' : refit === 'pursuit' ? 'REFIT: PURSUIT SIGNAL' : refit === 'shelter' ? 'REFIT: STORM GROUNDED' : INSTRUMENTS[refit] ? `FIELD: ${INSTRUMENTS[refit].name.toUpperCase()}` : '';
        if (refitLabel) { ctx.fillStyle = '#efd39c'; ctx.textAlign = 'right'; ctx.font = '600 13px "DM Sans"'; ctx.fillText(refitLabel, W - 18, 96); }
      }
      else if (bossEnt) {
        ctx.fillStyle = '#e8a0a8'; ctx.textAlign = 'center';
        ctx.fillRect(W / 2 - 160, 16, 320 * Math.max(0, bossEnt.hp / bossEnt.maxHp), 10);
        ctx.strokeStyle = '#e8a0a855'; ctx.strokeRect(W / 2 - 160, 16, 320, 10);
        ctx.fillStyle = '#e9dcae'; ctx.fillText('THE UMBRAL MAW', W / 2, 44);
      }
      if (phase === 'intro' && !boss) {
        ctx.fillStyle = '#e9dcae'; ctx.textAlign = 'center'; ctx.font = '32px "IM Fell English", Georgia, serif';
        ctx.fillText(wave === 0 ? 'Contacts approaching…' : endless ? `Wave ${wave + 1}` : `Act ${wave + 1} · ${ACTS[Math.min(2, wave)].name}`, W / 2, H / 2 - 40);
      }
      if (phase === 'draft') {
        const boxH = 118 + draftChoices.length * 30;
        ctx.fillStyle = '#08151cdd'; ctx.fillRect(W / 2 - 400, H / 2 - boxH / 2, 800, boxH);
        ctx.strokeStyle = '#eed09a'; ctx.strokeRect(W / 2 - 400, H / 2 - boxH / 2, 800, boxH);
        ctx.fillStyle = '#f2d89c'; ctx.textAlign = 'center'; ctx.font = '32px "IM Fell English", Georgia, serif';
        ctx.fillText('The field is clear. Choose your refit.', W / 2, H / 2 - boxH / 2 + 46);
        ctx.fillStyle = '#d3e8dd'; ctx.font = '15px "DM Sans"';
        draftChoices.forEach((choice, i) => ctx.fillText(`${i + 1}  ${choice.text.toUpperCase()}`, W / 2, H / 2 - boxH / 2 + 88 + i * 30));
      }
      if (notice.ttl > 0) {
        ctx.globalAlpha = Math.min(1, notice.ttl / .5);
        ctx.fillStyle = '#ffe8b3'; ctx.font = '700 22px "DM Sans"'; ctx.textAlign = 'center';
        ctx.fillText(notice.text, W / 2, H - 35);
        ctx.globalAlpha = 1;
      }
      if (paused) {
        ctx.fillStyle='#05111ee1';ctx.fillRect(0,0,W,H);
        ctx.strokeStyle='#dbc38e77';ctx.strokeRect(W/2-280,H/2-168,560,336);
        ctx.fillStyle='#f7e5c0';ctx.font='46px "IM Fell English",Georgia,serif';ctx.textAlign='center';
        ctx.fillText('The stars can wait.',W/2,H/2-88);
        ctx.font='600 18px "DM Sans"';ctx.fillStyle='#b7dbd1';
        ctx.fillText('P / CLICK  ·  RESUME EXPEDITION',W/2,H/2-32);
        ctx.fillText('HOLD CLICK / J / Z / ENTER  ·  FIRE',W/2,H/2+6);
        ctx.fillText('M  ·  SWITCH PILOT MODE',W/2,H/2+44);
        ctx.fillText('SPACE / RIGHT CLICK  ·  DASH',W/2,H/2+82);
        ctx.fillText('F  ·  FULLSCREEN',W/2,H/2+120);
      }
      if (flash > 0 && !reduced()) { ctx.fillStyle = `rgba(245,142,155,${flash})`; ctx.fillRect(0, 0, W, H); flash -= .02; }
      if ((frameCount++ & 15) === 0) {
        canvas.dataset.phase = phase; canvas.dataset.wave = wave; canvas.dataset.kills = kills;
        canvas.dataset.dust = dust; canvas.dataset.hp = Math.ceil(Math.max(0, player.hp));
        canvas.dataset.enemies = enemies.filter(e => e.hp > 0).length + (bossEnt ? 1 : 0);
        canvas.dataset.pilot = pilot ? 'mouse' : 'keyboard';
        canvas.dataset.paused=paused?'true':'false';
        canvas.dataset.playerX = Math.round(player.x); canvas.dataset.playerY = Math.round(player.y);
        canvas.dataset.score = score; canvas.dataset.streak = bestStreak;
        canvas.dataset.boss = bossEnt?.hp ?? 0;
        canvas.dataset.mode = endless ? 'endless' : 'mission';
        canvas.dataset.refit = refit || '';
        canvas.dataset.weapon = weapon;
        canvas.dataset.weaponSpeed = WEAPONS[weapon].speed;
        canvas.dataset.weaponDamage = Math.round(hull.boltDmg * WEAPONS[weapon].damage * (refit === 'power' ? 1.35 : 1) * 100) / 100;
        canvas.dataset.charge = Math.round(charge * 1000) / 1000;
        canvas.dataset.pending = pending.length;
        canvas.dataset.act = endless ? '' : clamp(Math.max(1, wave), 1, 3);
        canvas.dataset.draft = phase === 'draft' ? draftChoices.map(c => c.id).join(',') : '';
        canvas.dataset.boltsLive = bolts.length;
      }
    }
    function tick(now) {
      // Paused games own no frames: pause() draws one still frame, resume() restarts the loop.
      if (destroyed || paused) return;
      if (document.hidden) { last = 0; acc = 0; raf = requestAnimationFrame(tick); return; }
      const elapsed = last ? Math.min(.08, (now - last) / 1000) : 0; last = now;
      if (hitStop > 0 && !reduced()) hitStop -= elapsed;
      else { acc += elapsed; while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; } }
      draw();
      updateStatus();
      raf = requestAnimationFrame(tick);
    }
    function pause() {
      if (paused || ended || destroyed) return;
      paused = true; firing = false; keys.clear();
      draftBar.querySelectorAll('button').forEach(button => { button.disabled = true; });
      acc = 0; last = 0; // no catch-up burst on resume
      canvas.dataset.paused = 'true';
      cancelAnimationFrame(raf); raf = 0;
      tone(360, .1, 'triangle', .035);
      draw();
      updateStatus(true);
    }
    function resume() {
      if (!paused || ended || destroyed) return;
      paused = false;
      draftBar.querySelectorAll('button').forEach(button => { button.disabled = false; });
      acc = 0; last = 0;
      canvas.dataset.paused = 'false';
      tone(660, .1, 'triangle', .035);
      updateStatus(true);
      raf = requestAnimationFrame(tick);
    }
    let statusNext = 0, statusText = '';
    function updateStatus(force = false) {
      const nowMs = performance.now();
      if (!force && nowMs < statusNext) return;
      statusNext = nowMs + 500;
      const actIndex = clamp(Math.max(1, wave), 1, 3) - 1;
      const text = ended
        ? (player.hp <= 0 ? `The skiff is lost. Final score ${score}.` : `Hunt complete. Score ${score}.`)
        : `${paused ? 'Paused. ' : ''}Hull ${Math.ceil(Math.max(0, player.hp))} of ${player.maxHp}. ${boss ? 'Boss: the Umbral Maw.' : endless ? `Wave ${Math.max(1, wave)}.` : `Act ${actIndex + 1} of 3: ${ACTS[actIndex].name}.`} Score ${score}.`;
      if (text !== statusText) { statusText = text; srStatus.textContent = text; }
      // Persistent mission line: finite hunts read as authored acts, endless as a vigil.
      const inbound = pending.length ? ` · ${pending.length} contact${pending.length === 1 ? '' : 's'} inbound` : '';
      objectiveText = ended
        ? (player.hp <= 0 ? 'Skiff lost — the field keeps the score.' : 'Hunt complete — the field is yours.')
        : boss ? 'Objective: silence the Umbral Maw.'
        : endless ? `Endless vigil · wave ${Math.max(1, wave)}${inbound}${phase === 'draft' ? ' · refit available' : ''}`
        : phase === 'draft' ? `Act ${actIndex + 1} cleared · next: ${ACTS[Math.min(2, actIndex + 1)].name} — choose a field refit.`
        : `Act ${actIndex + 1} of 3 · ${ACTS[actIndex].name} — ${ACTS[actIndex].hint}${inbound}`;
      const line = `${objectiveText} · ${WEAPONS[weapon].name} · Hull ${Math.ceil(Math.max(0, player.hp))}/${player.maxHp}`;
      if (missionStatus.textContent !== line) {
        missionStatus.textContent = line;
        missionStatus.dataset.skirmishObjective = objectiveText;
      }
    }
    function point(e) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      aim = { x: clamp((e.clientX - r.left) / r.width * W, 0, W), y: clamp((e.clientY - r.top) / r.height * H, 0, H) };
    }
    listen(canvas, 'pointermove', e => { point(e); pointerActive = true; });
    listen(canvas, 'pointerenter', e => { point(e); pointerActive = true; });
    listen(canvas, 'pointerleave', () => { pointerActive = false; firing = false; });
    listen(canvas, 'pointerdown', e => {
      point(e); pointerActive = true; canvas.focus({ preventScroll: true });
      if (paused) { resume(); return; } // a deliberate click is a deliberate resume
      if (e.button === 2) tryBurst(); else firing = true;
    });
    listen(window, 'pointerup', () => { firing = false; });
    listen(canvas, 'pointercancel', () => { firing = false; pointerActive = false; });
    listen(window, 'blur', () => { firing = false; pointerActive = false; keys.clear(); pause(); });
    listen(canvas, 'contextmenu', e => e.preventDefault());
    // Menus, dialogs and form fields own their keys; the hunt never steers behind them.
    const uiOwnsKeys = e => {
      const t = e.target;
      if (t instanceof HTMLElement && t !== canvas && (t.isContentEditable || t.closest('input, textarea, select, button, a, [contenteditable], [role="dialog"], [popover]'))) return true;
      const modal = document.getElementById('modal');
      if (modal && (modal.open || modal.classList.contains('open'))) return true;
      return !!document.querySelector('dialog[open]');
    };
    listen(window, 'keydown', e => {
      if (uiOwnsKeys(e)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (phase === 'draft' && !e.repeat && document.activeElement === canvas && ['1', '2', '3', '4'].includes(k)) {
        e.preventDefault();
        const pick = draftChoices[Number(k) - 1];
        if (pick) chooseRefit(pick.id);
        return;
      }
      if (!e.repeat && !paused && phase !== 'draft' && ['1', '2', '3', '4'].includes(k) && (document.activeElement === canvas || pointerActive)) {
        e.preventDefault();
        setWeapon(WEAPON_IDS[Number(k) - 1]);
      }
      if (['w', 'a', 's', 'd', 'j', 'z', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k) && document.activeElement === canvas) e.preventDefault();
      keys.add(k);
      if (k === ' ' && !e.repeat && document.activeElement === canvas && !paused) tryBurst();
      if (k === 'p' && !e.repeat) paused ? resume() : pause();
      if (k === 'f' && !e.repeat && document.activeElement === canvas) {
        if (document.fullscreenElement === canvas) document.exitFullscreen?.().catch?.(()=>{});
        else canvas.requestFullscreen?.().catch?.(()=>{});
      }
      if (k === 'm' && !e.repeat && document.activeElement === canvas) {
        pilot = !pilot;
        try { localStorage.setItem('aether-flight-mode', pilot ? 'mouse' : 'keyboard'); } catch {}
        notice = { text: pilot ? 'MOUSE PILOT · SHIP FOLLOWS THE CURSOR' : 'TWIN-STICK · WASD MOVE / MOUSE AIM', ttl: 3.5 };
        tone(650, .12, 'triangle', .04);
      }
    });
    listen(window, 'keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    raf = requestAnimationFrame(tick);
    canvas.style.touchAction = 'none';
    canvas.focus({ preventScroll: true });
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      timers.clear();
      abort.abort();
      audio?.close().catch(() => {});
      canvas.remove();
      weaponBar.remove();
      missionStatus.remove();
      draftBar.remove();
      srStatus.remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }
    return { destroy, pause, resume, get state() { return { hp: player.hp, wave, dust, kills, phase, paused, score, boltsFired: boltCount, weapon, charge, pending: pending.length, act: endless ? null : clamp(Math.max(1, wave), 1, 3) }; } };
  }
  return { create, INSTRUMENTS, HULLS, SECTORS, ENEMIES };
})();
