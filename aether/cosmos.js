'use strict';

// Shared scene descriptions keep a photograph, its darkroom preview and its print identical.
window.AetherArt = (() => {
  const TAU = Math.PI * 2;
  const colours = ['#c7c9c2', '#dfac7f', '#a7c9db', '#d97b6e', '#7ac7b5', '#b0a0df', '#e6c58b', '#8eaade', '#e29eb7', '#edb557', '#fff1ae'];
  const targets = [
    { id: 'saturn', name: 'Saturn', x: 1150, y: 390, focus: 68, colour: '#ddbc82', note: 'Ice, dust, and the most beautiful rings in the neighbourhood.' },
    { id: 'orion', name: 'Orion Nebula', x: 460, y: 670, focus: 42, colour: '#c193bb', note: 'A stellar nursery shaped suspiciously like a jellyfish.' },
    { id: 'jupiter', name: 'Jupiter', x: 730, y: 260, focus: 55, colour: '#d4ab87', note: 'Four tiny companions dance around a striped giant.' },
    { id: 'andromeda', name: 'Andromeda', x: 1370, y: 740, focus: 82, colour: '#98c9d0', note: 'A whole galaxy, rendered as a little smudge of light.' },
    { id: 'moon', name: 'The Moon', x: 260, y: 200, focus: 28, colour: '#cbd3d3', note: 'Our nearest neighbour. Familiar, and still wonderfully strange.' },
  ];
  let serial = 0;
  function random(seed = 42) {
    let n = seed >>> 0;
    return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  }
  function star(ctx, x, y, radius, fill = '#efd693', points = 4, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = i * Math.PI / points + rotation - Math.PI / 2;
      const r = i % 2 ? radius * .42 : radius;
      ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function orb(ctx, x, y, r, tier = 4, face = true, angle = 0, stretch = 1, clock = 0) {
    const colour = colours[tier % colours.length];
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(stretch, 1 / stretch);
    if (tier === 6) {
      ctx.strokeStyle = '#e6c58b88'; ctx.lineWidth = r * .18;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.38, r * .35, -.4, 0, TAU); ctx.stroke();
    }
    const gradient = ctx.createRadialGradient(-r * .35, -r * .4, r * .02, r * .2, r * .2, r * 1.3);
    gradient.addColorStop(0, '#fff7de'); gradient.addColorStop(.23, colour); gradient.addColorStop(1, '#242b3b');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    if (tier === 0 || tier === 3) {
      ctx.fillStyle = '#ffffff20';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-r * .2 + i * r * .35, -r * .55 + i * r * .4, r * .55, r * .12, .3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#18213533';
      [[-.45, -.3, .16], [.4, -.55, .12], [.45, .45, .22], [-.15, .62, .1]].forEach(([cx, cy, cr]) => { ctx.beginPath(); ctx.arc(cx * r, cy * r, cr * r, 0, TAU); ctx.fill(); });
    } else {
      ctx.fillStyle = '#ffffff1c';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-r * .2 + i * r * .35, -r * .55 + i * r * .4, r * .55, r * .12, .3, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#251d2e20'; ctx.lineWidth = r * .06;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, i * r * .42, r * 1.05, r * .12, -.2, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
    if (face) {
      const blink = Math.sin(clock * 1.7 + tier * 2) > .994 ? .12 : 1;
      ctx.fillStyle = '#18212d';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * .23, r * .06, Math.max(1.5, r * .065), Math.max(1.2, r * .09 * blink), 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#18212d'; ctx.lineWidth = Math.max(1.3, r * .045);
      ctx.beginPath(); ctx.arc(0, r * .15, r * .12, .2, Math.PI - .2); ctx.stroke();
      ctx.fillStyle = '#f1ad9b66';
      ctx.beginPath(); ctx.ellipse(-r * .4, r * .24, r * .12, r * .06, 0, 0, TAU); ctx.fill();
    }
    if (tier === 6) { ctx.strokeStyle = '#e6c58b'; ctx.lineWidth = r * .13; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.38, r * .35, -.4, 0, Math.PI); ctx.stroke(); }
    ctx.restore();
  }
  function specks(seed, count = 50, w = 600, h = 380) {
    const rnd = random(seed);
    return Array.from({ length: count }, () => `<circle cx="${rnd() * w}" cy="${rnd() * h}" r="${.4 + rnd() * 1.2}" fill="#eee3c5" opacity="${.2 + rnd() * .7}"/>`).join('');
  }
  function planet(kind = 'saturn', hue = 160, extra = {}) {
    const n = `plate-${serial++}`;
    const isWorld = kind === 'world', r = isWorld ? 65 + (extra.size || 1) * 20 : 82;
    let subject = '';
    if (['orion', 'andromeda'].includes(kind)) {
      if (kind === 'orion') {
        subject = `<g class="art-float"><path d="M225 210C205 105 385 82 398 205Q372 228 350 208Q327 233 305 210Q275 234 249 210Z" fill="#c193bb"/><path d="M245 215q-38 75 18 105m28-100q42 50-6 92m50-90q-10 65 35 90m18-95q48 48 12 92" fill="none" stroke="#c193bb" stroke-width="7" stroke-linecap="round"/><g transform="translate(300 190) rotate(-28)"><ellipse rx="150" ry="62" fill="url(#${n}-cloud)"/><ellipse rx="110" ry="28" fill="url(#${n}-cloud)" transform="rotate(20)"/></g><ellipse cx="278" cy="178" rx="4" ry="8" fill="#18212d"/><ellipse cx="325" cy="178" rx="4" ry="8" fill="#18212d"/><path d="M291 194q10 11 20 0" fill="none" stroke="#18212d" stroke-width="2.5"/></g>`;
      } else {
        subject = `<g class="art-spin" transform="translate(300 190)"><g transform="rotate(-28)"><ellipse rx="150" ry="62" fill="url(#${n}-cloud)"/><ellipse rx="110" ry="28" fill="url(#${n}-cloud)" transform="rotate(20)"/><ellipse rx="70" ry="18" fill="#c8c4df22"/><ellipse rx="28" ry="10" fill="#f5ddbf88"/>${[58, 92, 126].map((radius, i) => `<ellipse rx="${radius}" ry="${radius * .4}" transform="rotate(${i * 22})" fill="none" stroke="${['#98c9d0', '#b0a0df', '#e29eb7'][i]}" stroke-width="${5 - i}" opacity=".8"/>`).join('')}</g></g>`;
      }
    } else if (kind === 'letter') {
      subject = '<g class="art-float"><g transform="translate(200 105) rotate(-8 100 80)"><rect width="200" height="145" rx="4" fill="#d8c59c"/><path d="M0 0l100 80L200 0M0 145l70-70m130 70-70-70" fill="none" stroke="#9a805f" stroke-width="2"/><circle cx="100" cy="80" r="21" fill="#9c615b"/><text x="100" y="88" text-anchor="middle" fill="#f0d1a1" font-size="25">✦</text></g></g>';
    } else if (kind === 'music') {
      subject = [100, 155, 215, 280, 350].map((r, i) => `<ellipse cx="300" cy="190" rx="${r / 2}" ry="${r / 5}" fill="none" stroke="#c8b58b55" stroke-width="1"/><g class="art-note note-${i}"><circle cx="${300 + Math.cos(i * 2) * r / 2}" cy="${190 + Math.sin(i * 2) * r / 5}" r="${7 + i * 2}" fill="${['#e5c48b', '#b2a2dd', '#85beb1', '#d7a18c', '#8caec7'][i]}"/></g>`).join('');
    } else if (kind === 'moon') {
      subject = `<g class="art-float" transform="translate(300 185)"><circle r="86" fill="#cbd3d3"/><circle r="86" fill="url(#${n}-shade)"/>${[[-34, -20, 14], [25, -40, 9], [34, 28, 18], [-12, 45, 8], [4, 2, 6]].map(([x, y, cr]) => `<circle cx="${x}" cy="${y}" r="${cr}" fill="#8e97a055" stroke="#e9e9d844" stroke-width="1"/>`).join('')}<ellipse cx="-22" cy="-2" rx="4.5" ry="7.5" fill="#18212d"/><ellipse cx="22" cy="-2" rx="4.5" ry="7.5" fill="#18212d"/><path d="M-8 18q8 10 16 0" fill="none" stroke="#18212d" stroke-width="2.5"/></g>`;
    } else if (kind === 'saturn') {
      // An engraved, warmly lit specimen for the illustrated plates.
      subject = `<defs><radialGradient id="${n}-saturn" cx=".26" cy=".2" r=".85"><stop stop-color="#f8e9bd"/><stop offset=".42" stop-color="#d9b981"/><stop offset=".73" stop-color="#a38558"/><stop offset="1" stop-color="#26332e"/></radialGradient><linearGradient id="${n}-rings" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#aa8756"/><stop offset=".38" stop-color="#f2dbab"/><stop offset=".7" stop-color="#d0ab70"/><stop offset="1" stop-color="#faf0cd"/></linearGradient><clipPath id="${n}-disc"><circle r="82"/></clipPath></defs>
        <g class="art-float"><g transform="translate(300 185) rotate(-22)">
          <ellipse rx="150" ry="44" fill="none" stroke="url(#${n}-rings)" stroke-width="16" opacity=".75"/>
          <ellipse rx="161" ry="49" fill="none" stroke="#e6cf9d" stroke-width=".8" opacity=".7"/>
          <ellipse rx="137" ry="39" fill="none" stroke="#cbb17e" stroke-width="2" opacity=".6"/>
          <circle r="82" fill="url(#${n}-saturn)" stroke="#eddbad" stroke-opacity=".35" stroke-width=".8"/>
          <g clip-path="url(#${n}-disc)" fill="none">${[-56,-40,-24,-8,8,24,40,56].map((y, i) => `<path d="M-90 ${y}Q0 ${y + 17} 90 ${y}" stroke="${i % 2 ? '#fff0c9' : '#70583b'}" stroke-width="${i % 2 ? 3 : 5}" opacity=".12"/>`).join('')}<ellipse cx="-27" cy="-37" rx="47" ry="26" fill="#fff7d0" opacity=".07"/></g>
          <ellipse cx="-21" cy="-2" rx="3.7" ry="6" fill="#30362b"/><ellipse cx="21" cy="-2" rx="3.7" ry="6" fill="#30362b"/><path d="M-7 15q7 9 14 0" fill="none" stroke="#30362b" stroke-width="2" stroke-linecap="round"/>
          <path d="M-150 0a150 44 0 0 0 300 0" fill="none" stroke="url(#${n}-rings)" stroke-width="15"/>
          <path d="M-150 0a150 44 0 0 0 300 0" fill="none" stroke="#fff0c7" stroke-width=".8"/>
          <path d="M-161 0a161 49 0 0 0 322 0M-140 0a140 39 0 0 0 280 0" fill="none" stroke="#d7bd8c" stroke-width="1" opacity=".8"/>
        </g></g>`;
    } else {
      const ring = isWorld && extra.rings;
      const colour = isWorld ? `hsl(${hue} 43% 66%)` : targets.find(t => t.id === kind)?.colour || '#a7baca';
      subject = `<g class="art-float"><g transform="translate(300 185) rotate(${extra.tilt || -15})">${ring ? '<ellipse rx="150" ry="46" fill="none" stroke="#d9bd8b88" stroke-width="17"/>' : ''}<circle r="${r}" fill="${colour}"/><circle r="${r}" fill="url(#${n}-shade)"/>${kind === 'jupiter' ? '<path d="M-75-25q75 25 150 0M-80 2q80 20 160 0M-70 30q70 15 140 0" fill="none" stroke="#74584e66" stroke-width="11"/>' : ''}${ring ? '<path d="M-144 14C-105 70 110 70 144 14" fill="none" stroke="#e8cd9b" stroke-width="12"/>' : ''}${isWorld ? `<circle r="${69 + (extra.size || 1) * 20}" fill="none" stroke="hsl(${hue} 60% 75% / ${(extra.atmosphere || 0) / 200})" stroke-width="${5 + (extra.atmosphere || 0) / 7}"/>` : ''}<ellipse cx="-22" cy="-2" rx="4.5" ry="7.5" fill="#18212d"/><ellipse cx="22" cy="-2" rx="4.5" ry="7.5" fill="#18212d"/><path d="M-8 18q8 10 16 0" fill="none" stroke="#18212d" stroke-width="2.5"/></g>${isWorld ? Array.from({ length: extra.moons || 0 }, (_, i) => `<circle cx="${150 + i * 80}" cy="${70 + i % 2 * 250}" r="${7 + i}" fill="#eee1bd"/>`).join('') : ''}</g>`;
      if (kind === 'jupiter') subject += [140, 180, 425, 460].map((x, i) => `<circle cx="${x}" cy="${190 + i * 3}" r="3" fill="#eee1bd"/>`).join('');
      if (isWorld && extra.marks?.length) {
        const marks = extra.marks.map(m => `<ellipse cx="${300 + m.x * r}" cy="${185 + m.y * r}" rx="${m.r * r}" ry="${m.r * r * (m.type === 'storm' ? .45 : .8)}" fill="${m.type === 'land' ? `hsl(${(hue + 65) % 360} 32% 45%)` : m.type === 'crater' ? '#222a3966' : '#f2e2c477'}" ${m.type === 'crater' ? 'stroke="#f2e2c455" stroke-width="1.5"' : ''}/>`).join('');
        subject = subject.replace('<ellipse cx="-22"', `<g>${marks}</g><ellipse cx="-22"`);
      }
    }
    return `<svg class="celestial-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" aria-hidden="true"><defs><radialGradient id="${n}-shade" cx=".2" cy=".2" r=".9"><stop stop-color="#fff" stop-opacity=".15"/><stop offset=".55" stop-color="#152133" stop-opacity=".12"/><stop offset="1" stop-color="#0d1728" stop-opacity=".95"/></radialGradient><radialGradient id="${n}-cloud"><stop stop-color="${kind === 'orion' ? '#d591b8' : '#9dbccf'}" stop-opacity=".55"/><stop offset="1" stop-color="#b6a8d6" stop-opacity="0"/></radialGradient><radialGradient id="${n}-bg"><stop stop-color="#343445"/><stop offset="1" stop-color="#101c28"/></radialGradient></defs><rect width="600" height="380" fill="url(#${n}-bg)"/>${specks(12)}<ellipse cx="300" cy="190" rx="220" ry="135" fill="none" stroke="#cebd9433" stroke-dasharray="2 8"/>${subject}<path d="M30 40h25m-12-12v25m502 287h25m-12-12v25" stroke="#cfba84" stroke-width="1"/><text x="300" y="350" text-anchor="middle" fill="#bcae8b" font-family="Georgia,serif" font-size="10" letter-spacing="4">ÆTHER · A SMALL WINDOW INTO THE INFINITE</text></svg>`;
  }
  // Focus blur is baked into small cached sprites — filtering the live canvas every frame was far too slow.
  const spriteCache = new Map();
  function targetSprite(target, blurStep, frame) {
    const key = `${target.id}:${blurStep}:${frame}`;
    let sprite = spriteCache.get(key);
    if (sprite) { spriteCache.delete(key); spriteCache.set(key, sprite); return sprite; }
    const isJelly = target.id === 'orion', isGalaxy = target.id === 'andromeda';
    const w = isJelly ? 180 : 220, h = isJelly ? 230 : 220;
    sprite = document.createElement('canvas'); sprite.width = w; sprite.height = h;
    const c = sprite.getContext('2d');
    if (blurStep) c.filter = `blur(${blurStep}px)`;
    const sway = frame * .785; // six-frame loop of the drifting companions
    if (isJelly) {
      c.translate(w / 2, 92); c.translate(0, Math.sin(sway * .8) * 3);
      const cloud = c.createRadialGradient(0, 0, 0, 0, 0, 88); cloud.addColorStop(0, '#c193bb4a'); cloud.addColorStop(1, '#b091c000');
      c.fillStyle = cloud; c.fillRect(-88, -88, 176, 176);
      c.fillStyle = '#c193bb'; c.beginPath(); c.ellipse(0, -12, 44, 34, 0, Math.PI, TAU); c.quadraticCurveTo(32, 12, 13, 3); c.quadraticCurveTo(0, 18, -13, 3); c.quadraticCurveTo(-32, 12, -44, -12); c.fill();
      c.strokeStyle = '#a77dc0'; c.lineWidth = 3; c.lineCap = 'round';
      for (let j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(j * 13, 3); c.bezierCurveTo(j * 15 + Math.sin(sway + j) * 14, 22, j * 15 - 19, 44, j * 15 + Math.cos(sway + j) * 12, 65); c.stroke(); }
      c.fillStyle = '#18212d';
      c.beginPath(); c.ellipse(-13, -16, 3, 6, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(13, -16, 3, 6, 0, 0, TAU); c.fill();
      c.strokeStyle = '#18212d'; c.lineWidth = 2; c.beginPath(); c.arc(0, -8, 6, .3, Math.PI - .3); c.stroke();
    } else if (isGalaxy) {
      c.translate(w / 2, h / 2);
      const cloud = c.createRadialGradient(0, 0, 0, 0, 0, 70); cloud.addColorStop(0, '#f0d9c6'); cloud.addColorStop(.2, target.colour); cloud.addColorStop(1, '#b091c000');
      c.save(); c.rotate(-.35); c.scale(1.7, .65); c.fillStyle = cloud; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.fill(); c.restore();
      c.strokeStyle = '#98c9d088'; c.lineWidth = 1.5;
      [18, 32, 48].forEach((r, i) => { c.beginPath(); c.ellipse(0, 0, r * 1.5, r * .6, -.35 + i * .18, 0, TAU); c.stroke(); });
    } else {
      c.translate(w / 2, h / 2);
      orb(c, 0, 0, 30, target.id === 'saturn' ? 6 : target.id === 'jupiter' ? 8 : 0, false);
      if (target.id === 'jupiter') for (let i = 0; i < 4; i++) { const a = sway * .13 + i * 1.65; c.fillStyle = '#eee1bd'; c.beginPath(); c.arc(Math.cos(a) * (62 + i * 12), Math.sin(a) * 17, 2.4, 0, TAU); c.fill(); }
    }
    if (spriteCache.size > 96) spriteCache.delete(spriteCache.keys().next().value);
    spriteCache.set(key, sprite);
    return sprite;
  }
  function sky(ctx, view, width = 760, height = 500, time = 0) {
    const x = view.x ?? 800, y = view.y ?? 450, zoom = view.zoom || 1;
    const pos = t => ({ x: width / 2 + (t.x - x) * zoom, y: height / 2 + (t.y - y) * zoom });
    ctx.fillStyle = '#0c1722'; ctx.fillRect(0, 0, width, height);
    const light = ctx.createRadialGradient(width / 2 + 20, height / 2, 5, width / 2 + 20, height / 2, 400);
    light.addColorStop(0, '#54425a33'); light.addColorStop(1, '#15232a00'); ctx.fillStyle = light; ctx.fillRect(0, 0, width, height);
    const rnd = random(912);
    for (let i = 0; i < 360; i++) {
      const p = pos({ x: rnd() * 1900 - 150, y: rnd() * 1200 - 150 });
      const r = .4 + rnd() * 1.6;
      ctx.globalAlpha = .25 + .5 * (.5 + .5 * Math.sin(time * .7 + i));
      if (i % 29 === 0) star(ctx, p.x, p.y, 4.5, '#eee0b8');
      else { ctx.fillStyle = '#e8dfc7'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    const frame = Math.floor(time * 6) % 6;
    targets.forEach(t => {
      const p = pos(t), z = zoom;
      const focus = Math.abs((view.focus ?? t.focus) - t.focus);
      const blurStep = focus > 2 ? Math.min(12, Math.ceil(focus / 5)) : 0;
      const sprite = targetSprite(t, blurStep, frame);
      // Sprites are drawn at a 30px body radius; planets render at 25–30px before zoom.
      const base = t.id === 'jupiter' ? 30 : t.id === 'orion' || t.id === 'andromeda' ? 30 : 25;
      const scale = (base * z) / 30;
      ctx.drawImage(sprite, p.x - sprite.width / 2 * scale, p.y - (t.id === 'orion' ? 92 : 110) * scale, sprite.width * scale, sprite.height * scale);
      if (view.labels) { ctx.font = '12px Georgia'; ctx.fillStyle = '#c5c5b6'; ctx.textAlign = 'center'; ctx.fillText(t.name, p.x, p.y + 62 * z); }
    });
  }
  function world(ctx, model, time = 0) {
    const cx = 380, cy = 245, r = 90 + model.size * 30, tilt = model.tilt * Math.PI / 180;
    ctx.fillStyle = '#101d27'; ctx.fillRect(0, 0, 760, 500);
    const rnd = random(891);
    for (let i = 0; i < 70; i++) { ctx.globalAlpha = .2 + rnd() * .4; ctx.fillStyle = '#e8dfc7'; ctx.beginPath(); ctx.arc(rnd() * 760, rnd() * 500, .5 + rnd() * 1.2, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    const moons = Array.from({ length: model.moons }, (_, i) => {
      const radius = r + 55 + i * 28, angle = time * Math.sqrt(model.mass) / (4 + i * 3) + i * 2.2;
      ctx.strokeStyle = '#e3d2a418'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, radius, radius * .48, -.18, 0, TAU); ctx.stroke();
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius * .48, r: 7 + i * 2 };
    });
    moons.filter(m => m.y < cy).forEach(m => orb(ctx, m.x, m.y, m.r, 0, false));
    const glow = ctx.createRadialGradient(cx, cy, r * .9, cx, cy, r + 18 + model.atmosphere * .4);
    glow.addColorStop(0, `hsl(${model.hue} 55% 72% / ${model.atmosphere / 200})`); glow.addColorStop(1, `hsl(${model.hue} 55% 72% / 0)`);
    ctx.fillStyle = glow; ctx.fillRect(cx - 240, cy - 240, 480, 480);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    if (model.rings) { ctx.strokeStyle = '#decca8aa'; ctx.lineWidth = 15; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.48, r * .3, -.2, 0, TAU); ctx.stroke(); }
    const body = ctx.createRadialGradient(-r * .35, -r * .4, r * .05, r * .2, r * .25, r * 1.35);
    body.addColorStop(0, '#fff7de'); body.addColorStop(.3, `hsl(${model.hue} 46% 64%)`); body.addColorStop(1, '#1a2531');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    ctx.strokeStyle = '#ffffff12'; ctx.lineWidth = 12;
    for (let i = -3; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, i * r * .3, r * 1.1, r * .1, -.1, 0, TAU); ctx.stroke(); }
    for (const m of model.marks || []) {
      const x = m.x * r, y = m.y * r, radius = m.r * r;
      if (m.type === 'land') {
        ctx.fillStyle = `hsl(${(model.hue + 65) % 360} 32% 45%)`; ctx.beginPath();
        for (let j = 0; j < 14; j++) { const a = j / 14 * TAU, shape = radius * (1 + Math.sin(j * 2.7 + x) * .22); ctx.lineTo(x + Math.cos(a) * shape, y + Math.sin(a) * shape * .8); } ctx.closePath(); ctx.fill();
      } else if (m.type === 'crater') {
        ctx.fillStyle = '#222a3966'; ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .8, .2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#f2e2c466'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .8, .2, .2, Math.PI); ctx.stroke();
      } else {
        ctx.strokeStyle = '#f2e2c499'; ctx.lineWidth = 3; ctx.beginPath();
        for (let j = 0; j < 50; j++) { const a = j * .23 + time * 24 / model.speed * .2, length = radius * j / 50; ctx.lineTo(x + Math.cos(a) * length, y + Math.sin(a) * length * .5); } ctx.stroke();
      }
    }
    const shade = ctx.createRadialGradient(-r * .4, -r * .4, r * .1, r * .25, r * .3, r * 1.4);
    shade.addColorStop(0, '#fff9d524'); shade.addColorStop(.4, '#fff9d500'); shade.addColorStop(1, '#0d1728aa'); ctx.fillStyle = shade; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    if (model.rings) { ctx.strokeStyle = '#e8cd9b'; ctx.lineWidth = 11; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.48, r * .3, -.2, 0, Math.PI); ctx.stroke(); }
    ctx.restore();
    moons.filter(m => m.y >= cy).forEach(m => orb(ctx, m.x, m.y, m.r, 0, false));
    return { cx, cy, r, tilt };
  }
  return { colours, targets, random, star, orb, planet, specks, sky, world };
})();
