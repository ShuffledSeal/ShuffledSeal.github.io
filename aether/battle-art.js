'use strict';
/* Æther Battle Atelier — original, offline, procedural sector paintings and ship art.
 * Canvas-only, seeded, cached backgrounds: no requests, no bitmap licensing.
 * Gameplay always paints atop the atmosphere; collision shapes remain legible. */
window.AetherBattleArt = (() => {
  const TAU = Math.PI * 2;
  const palettes = [
    { deep: '#040a14', middle: '#0b1a2d', gas: '#6b2d43', glint: '#e0bd7f', rim: '#f0dfbd', teal: '#7fb7be', planet: ['#d6a578','#64394c','#11192b'] },
    { deep: '#050c16', middle: '#102236', gas: '#284f67', glint: '#d6bd89', rim: '#eadcbf', teal: '#7dc5c4', planet: ['#cfaa78','#55475e','#141c31'] },
    { deep: '#030711', middle: '#0c1428', gas: '#3c315e', glint: '#b7acd4', rim: '#e6d5b7', teal: '#8fc6c0', planet: ['#8c8fb5','#392c50','#0d1226'] },
  ];
  const cache = new Map();
  const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const artTime = time => motionQuery.matches ? 0 : time;
  function rng(seed) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); }
  const rgba = (hex, a) => {
    const n = Number.parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  function line(c, coords) {
    c.beginPath(); coords.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath();
  }
  function lancet(c, x, y, w, h) {
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w * .58);
    c.bezierCurveTo(x, y + w * .25, x + w * .19, y + w * .12, x + w * .5, y);
    c.bezierCurveTo(x + w * .81, y + w * .12, x + w, y + w * .25, x + w, y + w * .58);
    c.lineTo(x + w, y + h); c.closePath();
  }
  // Cached architectural etching lives at the extreme edges, below gameplay.
  function architecture(c, w, h, p, sector) {
    c.save();
    const panels = [[-42, h * .19, 172, h * .86], [w - 122, h * .24, 156, h * .82]];
    for (const [x, y, pw, ph] of panels) {
      lancet(c, x, y, pw, ph);
      c.fillStyle = rgba(sector === 2 ? '#302744' : '#5c2430', .12); c.fill();
      c.strokeStyle = rgba(p.rim, .13); c.lineWidth = 2; c.stroke();
      lancet(c, x + 12, y + 18, pw - 24, ph - 30);
      c.strokeStyle = rgba(p.rim, .075); c.lineWidth = 1; c.stroke();
      c.beginPath(); c.moveTo(x + pw / 2, y + 18); c.lineTo(x + pw / 2, y + ph);
      for (let row = 1; row < 5; row++) {
        const yy = y + ph * row / 5; c.moveTo(x + 4, yy); c.lineTo(x + pw - 4, yy);
      }
      c.stroke();
    }
    // An occult armillary plate, deliberately too faint to read as a collision.
    const x = w * .48, y = h * .55;
    c.strokeStyle = rgba(p.rim, .07); c.lineWidth = 1;
    for (const [rx, ry, angle] of [[205, 67, -.34], [72, 205, .53], [155, 105, .2]]) {
      c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, TAU); c.stroke();
    }
    line(c, Array.from({ length: 16 }, (_, i) => {
      const a = i * TAU / 16 - Math.PI / 2, r = i % 2 ? 33 : 78;
      return [x + Math.cos(a) * r, y + Math.sin(a) * r];
    }));
    c.stroke();
    c.fillStyle = rgba('#6e2e42', .045); c.fill();
    c.restore();
  }
  function planet(c, x, y, radius, p, sector, rand) {
    c.save();
    c.translate(x, y);
    const glow = c.createRadialGradient(0, 0, radius * .63, 0, 0, radius * 1.85);
    glow.addColorStop(0, rgba(p.glint, .19)); glow.addColorStop(1, rgba(p.glint, 0));
    c.fillStyle = glow; circle(c, 0, 0, radius * 1.85); c.fill();
    if (sector === 1) {
      c.save(); c.rotate(-.2);
      c.strokeStyle = '#d7caa955'; c.lineWidth = radius * .20;
      c.beginPath(); c.ellipse(0, 0, radius * 1.42, radius * .41, -.1, 0, TAU); c.stroke();
      c.strokeStyle = '#e6cba888'; c.lineWidth = radius * .043;
      for (const mul of [1.19, 1.3, 1.52, 1.65]) { c.beginPath(); c.ellipse(0, 0, radius * mul, radius * .4 * mul, -.1, Math.PI, TAU); c.stroke(); }
      c.restore();
    }
    c.save(); circle(c, 0, 0, radius); c.clip();
    const sph = c.createRadialGradient(-radius * .45, -radius * .5, radius * .07, 0, 0, radius * 1.35);
    sph.addColorStop(0, p.planet[0]); sph.addColorStop(.54, p.planet[1]); sph.addColorStop(1, p.planet[2]);
    c.fillStyle = sph; c.fillRect(-radius, -radius, radius * 2, radius * 2);
    if (sector !== 2) {
      for (let i=0;i<25;i++) {
        const y = (rand() * 2 - 1) * radius, thick = (3 + rand() * 13) * radius / 175;
        c.fillStyle = i % 2 ? rgba('#ffdec3', .05 + rand() * .13) : rgba('#200d27', .06 + rand() * .15);
        c.beginPath(); c.ellipse(0, y, radius * 1.3, thick, .1 + rand() * .15, 0, TAU); c.fill();
      }
    } else {
      for (let i=0;i<14;i++) {
        c.strokeStyle = rgba(p.rim, .05 + rand() * .1); c.lineWidth = 2 + rand()*3;
        c.beginPath(); c.arc(rand() * radius * 2 - radius, rand() * radius * 2 - radius, 16 + rand()*75, 0, TAU); c.stroke();
      }
    }
    c.restore();
    c.strokeStyle = rgba(p.rim, .48); c.lineWidth = 1.6; circle(c, 0, 0, radius); c.stroke();
    const terminator = c.createLinearGradient(-radius, 0, radius, 0);
    terminator.addColorStop(0, '#00000000'); terminator.addColorStop(.7, '#080c18bb'); terminator.addColorStop(1, '#020410e5');
    c.save(); circle(c, 0, 0, radius); c.clip(); c.fillStyle = terminator;
    c.fillRect(-radius, -radius, radius * 2, radius * 2); c.restore();
    c.restore();
  }
  function make(sector, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const p = palettes[sector] || palettes[0];
    const rand = rng(21017 + sector * 7391);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, p.deep); bg.addColorStop(.53, p.middle); bg.addColorStop(1, '#090e18');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // Wispy, distant gas clouds. Painted to a cache, not every animation frame.
    for (let i=0;i<42;i++) {
      const x = rand()*w, y=rand()*h, r=85+rand()*310;
      const g = ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0, rgba(i%3===0?p.gas:i%3===1?p.teal:p.glint, .02+rand()*.07));
      g.addColorStop(.3, rgba(p.gas, .018)); g.addColorStop(1, '#00000000');
      ctx.fillStyle = g; ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    // Milky Way / nebular ribbon: extremely fine mineral-dust points.
    ctx.save(); ctx.translate(w*.45,h*.48); ctx.rotate(-.34);
    for (let i=0;i<2300;i++) {
      const x=(rand()-.5)*w*1.55, y=(rand()-.5)*175;
      const v=Math.max(0,1-Math.abs(y)/140);
      ctx.globalAlpha = v*(.06+rand()*.34);
      ctx.fillStyle = rand() < .22 ? p.glint : '#ecedff';
      ctx.fillRect(x,y,rand()<.04?1.8:.65,rand()<.04?1.8:.65);
    }
    ctx.restore(); ctx.globalAlpha=1;
    // Starfield with intentional clusters, bloom halos and four-point diffraction.
    for (let i=0;i<320;i++) {
      const x=rand()*w,y=rand()*h,r=.5+Math.pow(rand(),5)*2;
      ctx.fillStyle=rgba('#e6f2ff',.28+rand()*.65); circle(ctx,x,y,r);ctx.fill();
      if (r>1.4) {
        ctx.strokeStyle=rgba(p.rim,.17+rand()*.27);ctx.lineWidth=.7;
        ctx.beginPath();ctx.moveTo(x-r*4,y);ctx.lineTo(x+r*4,y);ctx.moveTo(x,y-r*4);ctx.lineTo(x,y+r*4);ctx.stroke();
      }
    }
    architecture(ctx, w, h, p, sector);
    const positions = [ [815,-30,185], [840,55,177], [785,55,205] ];
    planet(ctx, ...positions[sector], p, sector, rand);
    // Navigation ornament, a fine astronomical plate etched behind gameplay.
    ctx.strokeStyle = rgba(p.rim,.065);ctx.lineWidth=1;
    for (const r of [95,205,335,475]) {circle(ctx,w*.48,h*.55,r);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(0,h*.55);ctx.lineTo(w,h*.55);ctx.moveTo(w*.48,0);ctx.lineTo(w*.48,h);ctx.stroke();
    for (let x=36;x<w;x+=52)for(let y=34;y<h;y+=52){ctx.fillStyle=rgba(p.rim,.075);ctx.fillRect(x,y,1.2,1.2);}
    // Crystalline terrain silhouettes along far edges (never occlude the player).
    ctx.fillStyle = rgba('#000711',.22);
    ctx.beginPath();ctx.moveTo(0,h);
    for(let x=0;x<=w;x+=30)ctx.lineTo(x,h-(rand()*23+8));
    ctx.lineTo(w,h);ctx.closePath();ctx.fill();
    return c;
  }
  function backdrop(ctx, w, h, sector, time, boss) {
    time = artTime(time);
    const key = `${sector}:${w}:${h}`;
    if(!cache.has(key)) cache.set(key, make(sector,w,h));
    ctx.drawImage(cache.get(key),0,0);
    const p = palettes[sector] || palettes[0];
    ctx.save();
    const x=(time*12)% (w+200)-100;
    ctx.fillStyle=rgba(p.teal,.035);ctx.beginPath();ctx.ellipse(x,h*.37,200,65,-.4,0,TAU);ctx.fill();
    ctx.strokeStyle=rgba(p.rim,.12);ctx.lineWidth=1;
    for(let i=0;i<4;i++) {
      const a=time*(.1+i*.02)+i*TAU/4;
      const r=150+i*34;
      ctx.beginPath();ctx.arc(w*.48,h*.55,r,a,a+.4);ctx.stroke();
    }
    if (boss) {
      const g=ctx.createRadialGradient(w*.5,h*.18,20,w*.5,h*.18,510);
      g.addColorStop(0,rgba('#8f428b',.17+.04*Math.sin(time)));g.addColorStop(1,'#00000000');
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }
    ctx.restore();
  }
  function ship(ctx, hull, heading, time, dashing, sector) {
    time = artTime(time);
    const p=palettes[sector?.name?.includes('Giants')?1:sector?.name?.includes('Dark')?2:0];
    const big = hull==='bell' ? 1.23 : hull==='moth' ? .94 : hull==='comet' ? 1.05:1;
    ctx.save();ctx.rotate(heading);ctx.scale(big,big);
    const flicker = .75 + .25*Math.sin(time*55);
    // Thruster plumes are physically behind the ship, always pointed opposite heading.
    for(let i=0;i<3;i++) {
      const r=6+i*5;
      const g=ctx.createRadialGradient(-12-i*4,0,0,-20-i*6,0,r*2);
      g.addColorStop(0,rgba('#fff8cb',.6*flicker));g.addColorStop(.35,rgba('#64f7ea',.5*flicker));g.addColorStop(1,'#00000000');
      ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(-19-i*6,0,r*2,r,0,0,TAU);ctx.fill();
    }
    if(dashing) { ctx.strokeStyle=rgba('#9bffee',.62);ctx.lineWidth=3;circle(ctx,0,0,27+Math.sin(time*33)*3);ctx.stroke(); }
    ctx.shadowColor='#80e5d8';ctx.shadowBlur=18;
    ctx.strokeStyle='#fbe6b5';ctx.lineWidth=1.4;
    let profile = [[25,0],[6,9],[-3,14],[-22,11],[-13,2],[-13,-2],[-22,-11],[-3,-14],[6,-9]];
    if(hull==='bell')profile=[[23,0],[12,10],[-4,16],[-19,14],[-26,4],[-22,0],[-26,-4],[-19,-14],[-4,-16],[12,-10]];
    if(hull==='moth')profile=[[26,0],[5,5],[-8,22],[-17,19],[-12,3],[-12,-3],[-17,-19],[-8,-22],[5,-5]];
    if(hull==='comet')profile=[[30,0],[8,7],[-16,18],[-10,0],[-16,-18],[8,-7]];
    line(ctx,profile);
    const fuselage=ctx.createLinearGradient(0,-20,0,20);
    fuselage.addColorStop(0,'#dffdf2');fuselage.addColorStop(.45,'#e9cf9f');fuselage.addColorStop(1,'#7ba8ab');
    ctx.fillStyle=fuselage;ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#1d3448';line(ctx,[[17,0],[0,5],[-7,0],[0,-5]]);ctx.fill();
    ctx.strokeStyle='#355b64';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#74fff0';circle(ctx,6,0,3.6);ctx.fill();
    ctx.strokeStyle='#443e55';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-7,-9);ctx.lineTo(-15,-9);ctx.moveTo(-7,9);ctx.lineTo(-15,9);ctx.stroke();
    ctx.strokeStyle='#e5cc91';ctx.lineWidth=1;
    for(const y of [-8,8]) {ctx.beginPath();ctx.moveTo(-7,y);ctx.lineTo(-2,y*.7);ctx.stroke();}
    ctx.restore();
  }
  const ePalette = {
    drifter: ['#ffaf83','#693b59'],weaver:['#e0a7ff','#684b91'],shard:['#fcdd92','#ba6558'],
    maw:['#ff8cbe','#713985'],lancer:['#79ddf4','#285672'],blossom:['#afecca','#286955']
  };
  function enemy(ctx,e,sector,time,heading) {
    time = artTime(time);
    const colors=ePalette[e.kind]||ePalette.drifter;
    const r=e.radius || (e.kind==='maw'?28:15);
    const born=Math.min(1,(e.born??1)/.45);
    if(born<1) {ctx.globalAlpha=born;ctx.scale(.5+.5*born,.5+.5*born);}
    // Enemy silhouettes track the pilot; attack telegraphs supply their own locked aim.
    const facing=Number.isFinite(heading)?heading:Math.atan2(e.vy,e.vx);
    ctx.save();ctx.rotate(facing);
    ctx.shadowColor=colors[0];ctx.shadowBlur=e.gilded?21:10;
    const outer=ctx.createRadialGradient(-r*.3,-r*.4,0,0,0,r*1.7);
    outer.addColorStop(0,e.hurt>0?'#fff':colors[0]);outer.addColorStop(1,colors[1]);
    ctx.fillStyle=outer;ctx.strokeStyle=e.gilded?'#ffe2a1':colors[0];ctx.lineWidth=e.gilded?2.5:1.5;
    let pts;
    switch(e.kind) {
      case 'drifter': pts=[[r+8,0],[r*.22,r*.6],[-r*.65,r*.97],[-r*.3,0],[-r*.65,-r*.97],[r*.22,-r*.6]];break;
      case 'weaver':pts=[[r*1.4,0],[r*.33,r*.3],[0,r*1.3],[-r*.3,r*.3],[-r*1.4,0],[-r*.33,-r*.3],[0,-r*1.3],[r*.33,-r*.3]];break;
      case 'shard':pts=[[r*1.8,0],[-r*.5,r*.8],[-r*.2,0],[-r*.5,-r*.8]];break;
      case 'lancer':pts=[[r*1.65,0],[r*.5,r*.5],[-r*.7,r],[0,0],[-r*.7,-r],[r*.5,-r*.5]];break;
      case 'blossom':pts=Array.from({length:12},(_,i)=>{const a=i*TAU/12;const rr=i%2?r*.7:r*1.45;return [Math.cos(a)*rr,Math.sin(a)*rr]});break;
      default:pts=Array.from({length:16},(_,i)=>{const a=i*TAU/16;const rr=i%2?r*.9:r*1.25;return [Math.cos(a)*rr,Math.sin(a)*rr]});
    }
    line(ctx,pts);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.strokeStyle='#fff4dba0';ctx.lineWidth=1.2;
    for(const a of [0,TAU/3,TAU*2/3]){
      ctx.save();ctx.rotate(a+time*.08);
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*.72,0);ctx.stroke();ctx.restore();
    }
    ctx.fillStyle='#0a1d28';circle(ctx,0,0,r*.4);ctx.fill();
    ctx.strokeStyle=colors[0];circle(ctx,0,0,r*.4);ctx.stroke();
    ctx.fillStyle=e.kind==='maw'?'#ffe2f3':'#f6f5d5';circle(ctx,0,0,r*.19);ctx.fill();
    ctx.restore();
    if (e.gilded) {ctx.strokeStyle='#fce8a0';ctx.lineWidth=2;ctx.setLineDash([5,6]);circle(ctx,0,0,r+11);ctx.stroke();ctx.setLineDash([]);}
    if(e.state==='windup'){
      ctx.strokeStyle='#ffab99';ctx.lineWidth=2.5;ctx.setLineDash([5,5]);circle(ctx,0,0,r+14);ctx.stroke();ctx.setLineDash([]);
    }
    if(e.hp<e.maxHp || e.gilded || e.kind==='maw') {
      ctx.strokeStyle='#00000066';ctx.lineWidth=3.5;circle(ctx,0,0,r+7);ctx.stroke();
      ctx.strokeStyle=e.gilded?'#ffe4a3':colors[0];ctx.lineWidth=3.5;
      ctx.beginPath();ctx.arc(0,0,r+7,-Math.PI/2,-Math.PI/2+TAU*Math.max(0,e.hp/e.maxHp));ctx.stroke();
    }
  }
  return {backdrop,ship,enemy};
})();
