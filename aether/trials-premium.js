'use strict';
/* Two complete, original Grand Tour cartridges. Registered after the core trials.
   Neither uses a library, API, remote texture or copyrighted game asset. */
(() => {
  const AT = window.AetherTrials;
  if (!AT) return;
  const {frame,TAU,clamp,reduced} = AT;
  const GOLD = '#f2d39d', TEAL='#a6f3dd', INK='#091720', RED='#ff9c9e';
  function rng(seed) { return () => (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296; }
  const point=(e,canvas,W,H)=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};};
  const circ=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,TAU);};
  const txt=(c,text,x,y,size=13,color=GOLD,align='left')=>{c.fillStyle=color;c.font=`600 ${size}px "DM Sans",sans-serif`;c.textAlign=align;c.fillText(text,x,y);};

  // ─── AETHER BASTION: build-and-defend, with four genuinely distinct tools. ───
  function bastion(container, options={}) {
    const W=900,H=560, rowY=i=>151+i*68, colX=i=>180+i*92;
    const verb=options.verbs||new Set();
    const rand=rng(6024), N=5, C=7, endless=options.endless===true, TOTAL=endless?Infinity:77;
    const TOWERS=[
      {name:'Needle',icon:'✦',cost:45,cool:.52,damage:20,range:280,color:'#dfdfab',detail:'Fast lane cannon',paths:{left:['Needlepoint','Heavy, decisive bolts'],right:['Clockwork','Faster firing rhythm']}},
      {name:'Frostbell',icon:'❄',cost:65,cool:1.15,damage:9,range:210,color:'#b7e9ed',detail:'Slows every target',paths:{left:['Deepwinter','Longer, wider chill'],right:['Rime charge','Harder impact strikes']}},
      {name:'Prism',icon:'◇',cost:90,cool:1.7,damage:21,range:480,color:'#e5b7f3',detail:'Pierces a full lane',paths:{left:['Focal glass','Brighter lane damage'],right:['Quick refraction','Faster beam cycles']}},
      {name:'Sunmine',icon:'◎',cost:55,cool:0,damage:90,range:65,color:'#f5ba77',detail:'One-use blast trap',paths:{left:['Star charge','Bigger detonation'],right:['Salvage core','Alloy from every blast']}},
    ];
    let towers=[],enemies=[],bolts=[],sparks=[],credits=175,core=8,kills=0,over=false,ended=false,selectedTower=null;
    let selected=0,t=0,spawn=2.5,wave=1,slowTime=0,pulseCd=0,flash=0,shake=0,showHelp=10;
    let messages=[{t:3,text:'INSTALL A DEFENCE · 1–4 SELECT · CLICK A HEX'}];
    const g=frame(container,W,H,{label:`Aether Bastion: tactical tower defence. Press 1 to 4 to select a tower, click an empty cell to place it, click an installed tower then press Q or E to choose an upgrade path, right click to sell for a partial refund. Space fires an emergency pulse. Keep the eight-heart observatory core alive${endless?' through an endless siege.':' through three waves.'}`,sound:options.sound,step,draw});
    const {canvas,ctx,listen,tone,burst,starfield}=g,stars=starfield(104,90);
    canvas.style.touchAction='none';canvas.focus({preventScroll:true});
    const score=()=>Math.round(kills*65+core*200+credits*2+(wave-1)*240);
    function finish(won){if(ended)return;ended=true;over=won?'won':'lost';
      tone(won?670:135,.3,'triangle',.05);
      g.after(()=>{g.destroy();options.onEnd?.({won,score:score()});},1300);
    }
    function burstAt(x,y,color,n=12){burst(x,y,color,n,170);}
    function announce(str){messages.unshift({text:str,t:2.8});messages=messages.slice(0,4);}
    function spawnEnemy(){
      const row=Math.floor(rand()*N),stage=endless?1+Math.floor(t/24):Math.min(3,1+Math.floor(t/23));
      const armored=stage>1&&rand()<Math.min(.48,.14+stage*.05);
      const boss=endless?stage>=4&&stage%4===0&&titanStage!==stage&&!enemies.some(e=>e.boss):t>67&&!enemies.some(e=>e.boss)&&!bossSpawned;
      if(boss){bossSpawned=true;titanStage=stage;}
      const hp=(boss?170+stage*18:armored?77+stage*10:23+stage*9)*(verb.has('lure')?1.24:1);
      enemies.push({x:872,y:rowY(row),row,v:boss?28+stage*2:armored?37+stage*2:54+stage*8,hp,maxHp:hp,
        armored,boss,slow:0,hit:0,tick:rand()*TAU,gold:boss?70:armored?26:17});
      if(boss)announce('A TITAN OF CRYSTAL APPROACHES');
    }
    let bossSpawned=false,titanStage=0;
    function shoot(from,enemy) {
      const def=TOWERS[from.type],tier=from.tier||0;
      const power=verb.has('tempest')?1.18:1;
      const damage=def.damage*power*(1+tier*.35+(from.path==='left'?tier*.25:0));
      if(from.type===2) {
        for(const e of enemies) if(e.row===from.row&&e.x>from.x-10&&e.x<from.x+480)damage(e,damage);
        bolts.push({x:from.x,y:from.y,toX:850,toY:from.y,t:.18,beam:true,color:def.color});
        tone(770,.1,'sine',.025);
      } else {
        bolts.push({x:from.x,y:from.y,target:enemy,damage,speed:from.type===1?430:580,
          type:from.type,color:def.color,slow:2.6+tier*(from.path==='left'?1.15:.45)});
        tone(from.type===1?410:630,.045,'triangle',.02);
      }
    }
    function damage(e,d){if(!enemies.includes(e))return;
      e.hp-=d;e.hit=.14;
      if(e.hp<=0){
        enemies.splice(enemies.indexOf(e),1);kills++;credits+=e.gold;
        burstAt(e.x,e.y,e.boss?'#ead4aa':'#9fe8df',e.boss?40:12);
        if(verb.has('siphon')&&kills%5===0)core=Math.min(8,core+1);
        if(kills%8===0){announce(`FIELD RESUPPLIED · ${credits} ALLOY`);tone(880,.12,'sine',.045);}
      }
    }
    function step(dt) {
      if(over)return;
      t+=dt;showHelp=Math.max(0,showHelp-dt);pulseCd=Math.max(0,pulseCd-dt);slowTime=Math.max(0,slowTime-dt);
      messages.forEach(m=>m.t-=dt);messages=messages.filter(m=>m.t>0);
      wave=endless?1+Math.floor(t/24):t<25?1:t<49?2:3;
      if(t>=TOTAL) {if(enemies.length===0)return finish(true);}
      if(t<TOTAL-2){
        spawn-=dt;
        if(spawn<=0){spawnEnemy();spawn=(endless?Math.max(.54,1.7-wave*.09):t<25?1.85:t<49?1.34:1.10)*(verb.has('gyro')?.94:1);}
      }
      for(const tower of towers){
        const def=TOWERS[tower.type];tower.cool=Math.max(0,tower.cool-dt);
        if(tower.type===3){
          const close=enemies.filter(e=>Math.hypot(e.x-tower.x,e.y-tower.y)<110);
          if(close.length){
            const tier=tower.tier||0,blast=def.damage*(1+tier*.5+(tower.path==='left'?tier*.3:0))*(verb.has('cinder')?1.25:1);
            const radius=68+tier*(tower.path==='left'?13:5);
            for(const e of close.filter(e=>Math.hypot(e.x-tower.x,e.y-tower.y)<radius)){damage(e,blast);if(tower.path==='right')credits+=tier*3;}
            burstAt(tower.x,tower.y,'#f7ba71',32);tower.dead=true;shake=6;tone(210,.24,'sawtooth',.045);
          }
        }else if(tower.cool<=0){
          const nearby=enemies.filter(e=>(tower.type===1?Math.abs(e.row-tower.row)<=1:e.row===tower.row)&&e.x>tower.x-15&&Math.hypot(e.x-tower.x,e.y-tower.y)<def.range).sort((a,b)=>a.x-b.x);
          if(nearby.length){tower.cool=def.cool*(tower.path==='right'?Math.pow(.76,tower.tier||0):1);shoot(tower,nearby[0]);}
        }
      }
      towers=towers.filter(t=>!t.dead);
      for(const b of [...bolts]){
        if(b.beam){b.t-=dt;if(b.t<=0)bolts.splice(bolts.indexOf(b),1);continue;}
        if(!enemies.includes(b.target)){bolts.splice(bolts.indexOf(b),1);continue;}
        const dx=b.target.x-b.x,dy=b.target.y-b.y,d=Math.hypot(dx,dy)||1;
        if(d<b.speed*dt+12){
          if(b.type===1){
            for(const e of enemies)if(Math.hypot(e.x-b.target.x,e.y-b.target.y)<85+(b.slow-2.6)*14){e.slow=b.slow;damage(e,b.damage);}
            burstAt(b.target.x,b.target.y,'#b9e4f9',10);
          }else damage(b.target,b.damage);
          bolts.splice(bolts.indexOf(b),1);
        } else {b.x+=dx/d*b.speed*dt;b.y+=dy/d*b.speed*dt;}
      }
      for(const e of [...enemies]){
        e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.tick+=dt;
        const slow=(e.slow>0?.4:1)*(slowTime>0?.28:1);
        e.x-=e.v*slow*dt;
        if(e.x<85){enemies.splice(enemies.indexOf(e),1);core-=e.boss?3:1;
          flash=.3;shake=8;announce('THE CORE IS STRUCK');tone(128,.22,'sawtooth',.045);
          if(core<=0)return finish(false);
        }
      }
      if(!endless&&t>87&&!enemies.length)finish(true);
    }
    function pulse(){if(pulseCd>0||over)return;
      pulseCd=verb.has('gyro')?11:16;slowTime=2.2;
      enemies.forEach(e=>damage(e,12));
      announce('AETHER PULSE · ENEMIES STILLED');tone(280,.3,'sine',.05);
      for(let x=90;x<900;x+=35)burstAt(x,300,'#a5e9da',2);
    }
    function inputCell(pt){return {col:Math.round((pt.x-180)/92),row:Math.round((pt.y-151)/68)};}
    function purchase(pt){
      if(over)return;
      if(pt.y>476){const i=Math.floor((pt.x-70)/192);if(i>=0&&i<4){selected=i;return;}}
      if(pt.x>800&&pt.y<100){pulse();return;}
      const {col,row}=inputCell(pt);
      if(col<0||col>=C||row<0||row>=N)return;
      if(Math.hypot(colX(col)-pt.x,rowY(row)-pt.y)>41)return;
      const cost=TOWERS[selected].cost;
      const existing=towers.find(q=>q.col===col&&q.row===row);
      if(existing){selectedTower=existing;const d=TOWERS[existing.type];announce(`${d.name.toUpperCase()} SELECTED · Q ${d.paths.left[0].toUpperCase()} / E ${d.paths.right[0].toUpperCase()}`);tone(410,.07,'triangle',.025);return;}
      if(credits<cost){announce('NOT ENOUGH ALLOY');tone(155,.06,'square',.018);return;}
      credits-=cost;
      selectedTower={x:colX(col),y:rowY(row),col,row,type:selected,cool:.12,tier:0,path:null};towers.push(selectedTower);
      burstAt(colX(col),rowY(row),TOWERS[selected].color,10);tone(510,.12,'triangle',.04);
    }
    function upgrade(path){
      const tower=selectedTower;
      if(!tower||!towers.includes(tower)){announce('SELECT AN INSTALLED TOWER FIRST');tone(170,.06,'square',.018);return;}
      const def=TOWERS[tower.type];
      if(tower.tier>=2){announce(`${def.name.toUpperCase()} IS FULLY REFINED`);return;}
      if(tower.path&&tower.path!==path){announce(`THIS TOWER FOLLOWS ${def.paths[tower.path][0].toUpperCase()}`);return;}
      const cost=Math.round(def.cost*(tower.tier?1.65:1.15));
      if(credits<cost){announce(`NEED ${cost} ALLOY TO REFINE ${def.name.toUpperCase()}`);tone(155,.06,'square',.018);return;}
      credits-=cost;tower.path=path;tower.tier++;
      announce(`${def.name.toUpperCase()} · ${def.paths[path][0].toUpperCase()} ${'I'.repeat(tower.tier)} · ${cost} ALLOY`);
      burstAt(tower.x,tower.y,def.color,18);tone(720,.14,'sine',.045);
    }
    listen(canvas,'pointerdown',e=>{
      const pt=point(e,canvas,W,H);canvas.focus({preventScroll:true});
      if(e.button===2){
        const {col,row}=inputCell(pt),i=towers.findIndex(q=>q.col===col&&q.row===row);
        if(i>=0){const tower=towers[i];credits+=Math.floor(TOWERS[tower.type].cost*(.65+tower.tier*.2));burstAt(tower.x,tower.y,'#f5d3a5',8);if(selectedTower===tower)selectedTower=null;towers.splice(i,1);tone(380,.1,'triangle',.025);}
      } else purchase(pt);
    });
    listen(canvas,'contextmenu',e=>e.preventDefault());
    listen(canvas,'keydown',e=>{
       if(/^[1-4]$/.test(e.key)){selected=Number(e.key)-1;e.preventDefault();}
       if(e.key.toLowerCase()==='q'){upgrade('left');e.preventDefault();}
       if(e.key.toLowerCase()==='e'){upgrade('right');e.preventDefault();}
      if(e.key===' '){pulse();e.preventDefault();}
    });
    function draw(ctx,dt,time){
      canvas.dataset.towerCount=towers.length;
      canvas.dataset.selectedTier=selectedTower?.tier||0;
      canvas.dataset.selectedPath=selectedTower?.path||'';
      canvas.dataset.mode=endless?'endless':'mission';
      ctx.fillStyle='#06111c';ctx.fillRect(0,0,W,H);
      const cloud=ctx.createRadialGradient(680,260,20,680,260,500);
      cloud.addColorStop(0,'#28536c44');cloud.addColorStop(1,'#06111c00');ctx.fillStyle=cloud;ctx.fillRect(0,0,W,H);stars();
      ctx.strokeStyle='#d4bc9450';ctx.lineWidth=1;ctx.strokeRect(79,117,770,337);
      for(let row=0;row<N;row++){
        const y=rowY(row);
        ctx.fillStyle=row%2?'#90b8c408':'#aeb7d007';ctx.fillRect(90,y-32,750,64);
        ctx.strokeStyle='#afc0c627';ctx.beginPath();ctx.moveTo(90,y+34);ctx.lineTo(850,y+34);ctx.stroke();
        for(let col=0;col<C;col++){
          const x=colX(col);ctx.strokeStyle='#d6bd8855';ctx.lineWidth=.9;
          ctx.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;const xx=x+29*Math.cos(a), yy=y+29*Math.sin(a);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.stroke();
          ctx.fillStyle='#83b7c91c';circ(ctx,x,y,2);ctx.fill();
        }
      }
      ctx.save();if(shake>0&&!reduced()){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.9;}
      // Observatory core, health visibly contained in the central lens.
      ctx.fillStyle='#17323b';ctx.fillRect(62,109,32,354);
      for(let i=0;i<8;i++){ctx.fillStyle=i<core?'#b2ecda':'#5b3549';ctx.fillRect(68,119+i*42,19,25);}
      ctx.strokeStyle=GOLD;ctx.lineWidth=2;ctx.strokeRect(62,109,32,354);
      // Towers and their distinct engineered silhouettes.
       for(const q of towers){
         const d=TOWERS[q.type];ctx.save();ctx.translate(q.x,q.y);
        ctx.shadowColor=d.color;ctx.shadowBlur=12;ctx.fillStyle='#182b37';ctx.strokeStyle=d.color;ctx.lineWidth=2;
        ctx.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;const x=Math.cos(a)*20,y=Math.sin(a)*20;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
        if(q.type===0){ctx.rotate(-Math.PI/2);ctx.fillStyle=d.color;ctx.fillRect(-5,-15,10,30);ctx.fillRect(-3,-24,6,14);}
        if(q.type===1){ctx.strokeStyle=d.color;for(let k=0;k<6;k++){ctx.rotate(TAU/6);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,15);ctx.stroke();}}
        if(q.type===2){ctx.rotate(Math.PI/4);ctx.fillStyle=d.color;ctx.fillRect(-10,-10,20,20);ctx.fillStyle='#2b3850';ctx.fillRect(-6,-6,12,12);}
         if(q.type===3){ctx.strokeStyle=d.color;ctx.lineWidth=3;circ(ctx,0,0,13+Math.sin(t*5)*2);ctx.stroke();ctx.fillStyle=d.color;circ(ctx,0,0,4);ctx.fill();}
         ctx.restore();
         if(q===selectedTower){ctx.strokeStyle='#fff1bb';ctx.lineWidth=2;circ(ctx,q.x,q.y,27);ctx.stroke();}
         if(q.tier){txt(ctx,`${q.path==='left'?'Q':'E'}${q.tier}`,q.x,q.y+36,10,d.color,'center');}
      }
      // Enemy hulls, shield strength, velocity trail.
      for(const e of enemies){
        const color=e.boss?'#ffe3a5':e.armored?'#efb6e9':'#f3a58f';
        ctx.strokeStyle=color+'66';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x+25,e.y);ctx.lineTo(e.x+40,e.y);ctx.stroke();
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.PI);ctx.fillStyle=e.hit>0?'#fff':color;ctx.strokeStyle='#4a1c3f';ctx.lineWidth=2;
        const r=e.boss?26:e.armored?18:13;
        ctx.beginPath();ctx.moveTo(r+5,0);ctx.lineTo(-r,-r*.86);ctx.lineTo(-r*.4,0);ctx.lineTo(-r,r*.86);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle='#191c2c';circ(ctx,0,0,r*.36);ctx.fill();
        if(e.armored||e.boss){ctx.strokeStyle='#f7d59d';ctx.lineWidth=2;circ(ctx,0,0,r+4);ctx.stroke();}
        if(e.slow>0){ctx.strokeStyle='#91e5ec';ctx.lineWidth=3;circ(ctx,0,0,r+8);ctx.stroke();}
        ctx.restore();
        ctx.fillStyle='#060d19';ctx.fillRect(e.x-22,e.y-26,44,4);ctx.fillStyle=color;ctx.fillRect(e.x-22,e.y-26,44*Math.max(0,e.hp/e.maxHp),4);
      }
      for(const b of bolts){
        ctx.strokeStyle=b.color;ctx.lineWidth=b.beam?5:3;ctx.shadowColor=b.color;ctx.shadowBlur=9;
        ctx.beginPath();if(b.beam){ctx.moveTo(b.x,b.y);ctx.lineTo(b.toX,b.toY);}else{ctx.moveTo(b.x-8,b.y);ctx.lineTo(b.x+5,b.y);}ctx.stroke();ctx.shadowBlur=0;
      }
      ctx.restore();
      // Manufactured UI: crisp numeric state, large distinct actions.
      ctx.fillStyle='#06111ceb';ctx.fillRect(0,0,W,97);ctx.strokeStyle='#ceb88066';ctx.beginPath();ctx.moveTo(0,97);ctx.lineTo(W,97);ctx.stroke();
      txt(ctx,'AETHER BASTION',27,28,21,GOLD);
       txt(ctx,endless?`SIEGE ${wave} · ENDLESS`:`WAVE ${wave} / 3`,28,53,12,'#bce9db');
      txt(ctx,`ALLOY ✦ ${credits}`,240,29,17,'#f6da9e');txt(ctx,`KILLS  ${kills}`,240,52,12,'#b9c4c2');
      txt(ctx,`CORE ${core} / 8`,425,28,17,core<=2?RED:TEAL);
       txt(ctx,endless?`SURVIVED ${Math.floor(t)}s`:`TIME ${Math.max(0,Math.ceil(TOTAL-t))}s`,425,51,12,'#b9c4c2');
      ctx.fillStyle=pulseCd>0?'#24313a':'#29584e';ctx.strokeStyle='#a8e6d355';ctx.fillRect(722,15,164,62);ctx.strokeRect(722,15,164,62);
      txt(ctx,pulseCd>0?`PULSE ${Math.ceil(pulseCd)}s`:'PULSE READY · SPACE',804,42,12,TEAL,'center');
      txt(ctx,'STUN + SHOCK',804,60,10,'#d4dfda','center');
      ctx.fillStyle='#08141f';ctx.fillRect(0,469,W,91);ctx.strokeStyle='#c7b88e55';ctx.beginPath();ctx.moveTo(0,469);ctx.lineTo(W,469);ctx.stroke();
      for(let i=0;i<4;i++){
        const d=TOWERS[i],x=69+i*192;
        ctx.fillStyle=selected===i?'#283f46':'#16252d';ctx.strokeStyle=selected===i?'#e6c486':'#80999555';ctx.lineWidth=selected===i?2:1;
        ctx.fillRect(x,486,181,59);ctx.strokeRect(x,486,181,59);
        txt(ctx,`${i+1} ${d.icon} ${d.name}`,x+8,509,13,d.color);
        txt(ctx,`${d.cost} ✦ · ${d.detail}`,x+8,532,10,credits<d.cost?'#9c7773':'#c2cbbd');
      }
       for(let i=0;i<messages.length;i++)txt(ctx,messages[i].text,450,110+i*16,12,'#ffe5a2','center');
       if(selectedTower){const d=TOWERS[selectedTower.type],next=Math.round(d.cost*(selectedTower.tier?1.65:1.15));txt(ctx,selectedTower.tier>=2?`${d.name.toUpperCase()} · REFINEMENT COMPLETE`:`Q ${d.paths.left[0].toUpperCase()} · E ${d.paths.right[0].toUpperCase()} · ${next} ALLOY`,450,126+messages.length*16,10,'#bde8dc','center');}
      if(over){ctx.fillStyle='#07131fdc';ctx.fillRect(0,93,W,378);
        txt(ctx,over==='won'?'THE BASTION ENDURES':'THE CORE GOES DARK',450,248,32,over==='won'?TEAL:RED,'center');
        txt(ctx,`${kills} intercepted · ${score().toLocaleString()} points`,450,289,16,GOLD,'center');}
      if(flash>0){ctx.fillStyle=`rgba(240,102,112,${flash})`;ctx.fillRect(0,96,W,370);flash=Math.max(0,flash-.02);}
    }
    return g;
  }

  AT.register({id:'bastion',name:'Aether Bastion',place:'The forgotten citadel',brief:'Build a defensive constellation from four tower systems. Protect the core through three enemy tides, then survive the crystal titan.',create:bastion});
})();

(() => {
  const AT=window.AetherTrials;
  if(!AT)return;
  const {frame,clamp,TAU,reduced}=AT;
  const W=900,H=560,COLS=18,ROWS=11,S=38,X=108,Y=79;
  const GOLD='#e8cb91',MINT='#9cf1de',PINK='#f1a1b1';
  const circ=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,TAU);};
  const drawText=(c,s,x,y,size=12,color=GOLD,align='left')=>{c.fillStyle=color;c.textAlign=align;c.font=`600 ${size}px "DM Sans",sans-serif`;c.fillText(s,x,y);};
  const tile=(x,y)=>({x:X+(x+.5)*S,y:Y+(y+.5)*S});
  const toCell=(x,y)=>({x:Math.floor((x-X)/S),y:Math.floor((y-Y)/S)});
  function labyrinth(container,options={}){
    const verbs=options.verbs||new Set();
    const endless=options.endless===true;
    const g=frame(container,W,H,{
      label:`Glass Labyrinth: a ${endless?'looping':'three-chamber'} stealth adventure. Pilot toward the mouse or use WASD, collect two starkeys in each chamber, then reach the illuminated exit. Space or right click to cloak and disable nearby sentries. Avoid their light cones.${endless?' Each completed circuit sharpens the Watchers.':' Escape with the Observatory archive.'}`,
      sound:options.sound,step,draw});
    const {ctx,canvas,listen,tone,burst,starfield}=g,stars=starfield(981,90);
    canvas.style.touchAction='none';canvas.focus({preventScroll:true});
    const keys=new Set();let cursor=null, pointerActive=false;
    let chamber=0,cycles=0,hearts=3,found=0,score=0,flash=0,ended=false,win=false,clock=0;
    let cloak=0,cloakCd=0,entrance=2,roomTransition=0,message={text:'COLLECT BOTH STARKEYS · AVOID THE WATCHERS',t:8};
    let player={...tile(1,5),vx:0,vy:0};
    let walls=[],guards=[],collectibles=[],bonus=[];
    const layouts=[
      {bars:[[5,1,9,[4,5]],[11,1,9,[7]],[14,2,6,[4]]],keys:[[3,2],[10,7]],bonus:[[8,2],[15,8]],patrol:[[3,4,1,8,'v'],[8,5,2,9,'v'],[15,7,12,16,'h']]},
      {bars:[[4,2,9,[7]],[9,1,8,[3,4]],[13,2,9,[6]]],keys:[[7,3],[15,6]],bonus:[[2,8],[11,3]],patrol:[[2,5,1,9,'v'],[7,6,5,8,'v'],[15,8,14,16,'h']]},
      {bars:[[6,1,9,[2,3]],[12,1,9,[7,8]],[15,2,7,[4,5]]],keys:[[3,7],[14,4]],bonus:[[8,3],[17,8]],patrol:[[4,4,2,8,'v'],[9,6,2,9,'v'],[16,7,14,16,'h'],[14,3,2,8,'v']]},
    ];
    const inBounds=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;
    const blocked=(x,y)=>{
      const t=toCell(x,y);
      if(!inBounds(t.x,t.y))return true;
      return walls[t.y][t.x];
    };
    function buildRoom(){
      const layout=layouts[chamber];
      walls=Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},(_,x)=> x===0||x===COLS-1||y===0||y===ROWS-1));
      walls[5][17]=false;
      for(const [col,start,end,gaps] of layout.bars)
        for(let y=start;y<=end;y++)if(!gaps.includes(y))walls[y][col]=true;
      collectibles=layout.keys.map(([x,y],i)=>({...tile(x,y),taken:false,i}));
      bonus=layout.bonus.map(([x,y])=>({...tile(x,y),taken:false}));
      guards=layout.patrol.map(([x,y,a,b,axis],i)=>({
        ...tile(x,y),a,b,axis,dir:chamber%2?-1:1,stunned:0,alert:0,facing:Math.PI/2,
        speed:38+(cycles*3+chamber)*6+i*3,phase:i*2.1,
      }));
      player={...tile(1,5),vx:0,vy:0};cursor=null;pointerActive=false;
      found=0;roomTransition=1.3;entrance=2;cloak=0;cloakCd=0;
      message={text:['THE IVORY ARCHIVE','THE HALL OF ECHOES','THE LAST OBSERVATORY'][chamber],t:5};
    }
    buildRoom();
    const alive=()=>!ended&&roomTransition<=0;
    function end(won){if(ended)return;ended=true;win=won;
      if(won){score+=hearts*240;burst(player.x,player.y,MINT,42,300);tone(670,.3,'sine',.05);tone(990,.45,'triangle',.05);}
      else tone(125,.35,'sawtooth',.035);
      g.after(()=>{g.destroy();options.onEnd?.({won,score:Math.round(score)});},1500);
    }
    function loseHeart(){
      if(entrance>0||ended)return;
      hearts--;entrance=2;flash=.26;cloak=0;
      tone(145,.25,'sawtooth',.055);burst(player.x,player.y,PINK,18,230);
      message={text:'ALARM · RELOCATING TO ENTRANCE',t:3};
      if(hearts<=0){end(false);return;}
      player={...tile(1,5),vx:0,vy:0};
      guards.forEach(q=>q.alert=0);
    }
    function step(dt){
      if(ended)return;
      clock+=dt;
      entrance=Math.max(0,entrance-dt);
      roomTransition=Math.max(0,roomTransition-dt);
      cloak=Math.max(0,cloak-dt);cloakCd=Math.max(0,cloakCd-dt);
      message.t=Math.max(0,message.t-dt);
      if(!endless&&clock>=116)return end(false);
      if(roomTransition>0)return;
      let mx=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);
      let my=(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);
      let dist=Math.hypot(mx,my);
      if(!dist&&pointerActive&&cursor){
        mx=cursor.x-player.x;my=cursor.y-player.y;dist=Math.hypot(mx,my);
      }
      const speed=cloak>0?155:195;
      if(dist>4){
        const vx=mx/dist*speed*dt,vy=my/dist*speed*dt;
        if(!blocked(player.x+vx+Math.sign(vx||1)*9,player.y)&&!blocked(player.x+vx,player.y))player.x+=vx;
        if(!blocked(player.x,player.y+vy+Math.sign(vy||1)*9)&&!blocked(player.x,player.y+vy))player.y+=vy;
        player.vx=vx/dt;player.vy=vy/dt;
      }else{player.vx=0;player.vy=0;}
      for(const k of collectibles)if(!k.taken&&Math.hypot(player.x-k.x,player.y-k.y)<22){
        k.taken=true;found++;score+=250;
        burst(k.x,k.y,GOLD,24,180);tone(620+found*140,.15,'triangle',.05);
        message={text:`STARKEY ${found} / 2 · ${found===2?'EXIT UNSEALED':'FIND THE OTHER'}`,t:3};
      }
      for(const b of bonus)if(!b.taken&&Math.hypot(player.x-b.x,player.y-b.y)<20){
        b.taken=true;score+=100;burst(b.x,b.y,MINT,14,145);tone(890,.06,'sine',.035);
      }
      for(const guard of guards){
        guard.stunned=Math.max(0,guard.stunned-dt);
        if(guard.stunned>0){guard.alert=Math.max(0,guard.alert-dt);continue;}
        let q=toCell(guard.x,guard.y);
        if(guard.axis==='v'){
          if(q.y>=guard.b)guard.dir=-1;
          if(q.y<=guard.a)guard.dir=1;
          const next=guard.y+guard.dir*guard.speed*dt;
          if(!blocked(guard.x,next)){guard.y=next;guard.facing=guard.dir>0?Math.PI/2:-Math.PI/2;}
          else guard.dir*=-1;
        }else{
          if(q.x>=guard.b)guard.dir=-1;
          if(q.x<=guard.a)guard.dir=1;
          const next=guard.x+guard.dir*guard.speed*dt;
          if(!blocked(next,guard.y)){guard.x=next;guard.facing=guard.dir>0?0:Math.PI;}
          else guard.dir*=-1;
        }
        const dx=player.x-guard.x,dy=player.y-guard.y,d=Math.hypot(dx,dy);
        const ang=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(ang-guard.facing),Math.cos(ang-guard.facing));
        const radius=cloak>0?42:175;
        let visible=d<radius&&Math.abs(diff)<.64;
        if(visible){
          for(let r=12;r<d;r+=10)if(blocked(guard.x+dx*r/d,guard.y+dy*r/d)){visible=false;break;}
        }
        guard.alert=clamp(guard.alert+(visible?dt*1.45:-dt*1.75),0,1.75);
        if(guard.alert>=1.17)loseHeart();
      }
      // A sealed door only opens when both sigils are held.
      if(player.x>X+16.35*S&&Math.abs(player.y-tile(17,5).y)<35&&found>=2){
        score+=350;chamber++;
        if(chamber>=3){
          if(!endless)return end(true);
          cycles++;chamber=0;hearts=Math.min(3,hearts+1);
          score+=cycles*200;
          message={text:`CIRCUIT ${cycles} · THE WATCHERS QUICKEN`,t:4};
        }
        buildRoom();
      }
    }
    function pulse(){
      if(!alive()||cloakCd>0)return;
      cloak=verbs.has('gyro')?3.6:2.8;cloakCd=verbs.has('freeze')?8:11;
      for(const q of guards)if(Math.hypot(q.x-player.x,q.y-player.y)<145){q.stunned=2;q.alert=0;}
      burst(player.x,player.y,MINT,20,190);tone(760,.19,'sine',.05);
      message={text:'PRISM VEIL · MOVE UNSEEN',t:2.4};
    }
    listen(canvas,'pointermove',e=>{
      const r=canvas.getBoundingClientRect();cursor={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};pointerActive=true;
    });
    listen(canvas,'pointerleave',()=>pointerActive=false);
    listen(canvas,'pointerdown',e=>{
      if(e.button===2){e.preventDefault();pulse();return;}
      const r=canvas.getBoundingClientRect();cursor={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};pointerActive=true;
      canvas.focus({preventScroll:true});
    });
    listen(canvas,'contextmenu',e=>e.preventDefault());
    listen(canvas,'keydown',e=>{
      if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
      keys.add(e.key.length===1?e.key.toLowerCase():e.key);
      if(e.key===' '&&!e.repeat)pulse();
    });
    listen(window,'keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
    listen(window,'blur',()=>{keys.clear();pointerActive=false;});
    function draw(ctx,dt,time){
      canvas.dataset.mode=endless?'endless':'mission';
      ctx.fillStyle=['#081821','#111728','#0e1524'][chamber%3];ctx.fillRect(0,0,W,H);stars();
      const halo=ctx.createRadialGradient(500,250,20,500,250,520);
      halo.addColorStop(0,'#679f9a20');halo.addColorStop(1,'#07131b00');ctx.fillStyle=halo;ctx.fillRect(0,0,W,H);
      ctx.save();
      // Archaeological tiles, walls and inlaid circuit corridors.
      for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
        const x=X+col*S,y=Y+row*S;
        ctx.fillStyle=(row+col)%2===0?'#213541':'#1c2b38';ctx.fillRect(x+.7,y+.7,S-1.4,S-1.4);
        if(walls[row][col]){
          const g=ctx.createLinearGradient(x,y,x+S,y+S);g.addColorStop(0,'#5e5f6c');g.addColorStop(.5,'#283749');g.addColorStop(1,'#162331');
          ctx.fillStyle=g;ctx.fillRect(x+2,y+2,S-4,S-4);
          ctx.strokeStyle='#c4b78c55';ctx.lineWidth=1;ctx.strokeRect(x+4,y+4,S-8,S-8);
          ctx.fillStyle='#d6c08f44';ctx.fillRect(x+5,y+5,S-10,2);
        }else{
          ctx.strokeStyle='#c5d1cd15';ctx.strokeRect(x+4,y+4,S-8,S-8);
          if((row*COLS+col)%5===0){ctx.fillStyle='#ceb17d55';circ(ctx,x+S/2,y+S/2,1.4);ctx.fill();}
        }
      }
      // Exit gate and lock condition.
      const exit=tile(17,5);
      ctx.fillStyle=found===2?'#4caa9599':'#7c515d99';ctx.fillRect(X+16.83*S,Y+5*S,10,S);
      ctx.shadowColor=found===2?MINT:PINK;ctx.shadowBlur=22;ctx.strokeStyle=found===2?MINT:PINK;ctx.lineWidth=3;
      ctx.strokeRect(X+17*S+4,Y+5*S+4,S-8,S-8);ctx.shadowBlur=0;
      // Opt-in bonus fragments and required keys.
      for(const b of bonus){if(b.taken)continue;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(time);
        ctx.strokeStyle='#9be7df';ctx.lineWidth=1.4;ctx.strokeRect(-7,-7,14,14);ctx.fillStyle='#9be7df';ctx.fillRect(-2,-2,4,4);ctx.restore();}
      for(const k of collectibles){if(k.taken)continue;ctx.save();ctx.translate(k.x,k.y);
        ctx.rotate(-time*.7);ctx.shadowColor=GOLD;ctx.shadowBlur=19;ctx.fillStyle='#f3d79f';
        ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(12,0);ctx.lineTo(0,15);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();
        ctx.shadowBlur=0;ctx.fillStyle='#29364a';ctx.fillRect(-4,-4,8,8);ctx.restore();}
      // Sentry cones: the limits of visibility are deliberately disclosed.
      for(const guard of guards){
        ctx.save();ctx.translate(guard.x,guard.y);ctx.rotate(guard.facing);
        const stunned=guard.stunned>0;
        if(!stunned){
          ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,174,-.64,.64);ctx.closePath();
          ctx.fillStyle=guard.alert>.35?'#fd85833c':'#ffcd8d15';ctx.fill();
          ctx.strokeStyle=guard.alert>.35?'#fe9c9588':'#efcba522';ctx.lineWidth=1;ctx.stroke();
        }
        ctx.shadowBlur=stunned?10:19;ctx.shadowColor=stunned?MINT:PINK;
        ctx.fillStyle=stunned?'#9ae2d0':guard.alert>.35?'#ff737a':'#dea7be';
        ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-9,-11);ctx.lineTo(-5,0);ctx.lineTo(-9,11);ctx.closePath();ctx.fill();
        ctx.shadowBlur=0;ctx.fillStyle='#253142';circ(ctx,0,0,4);ctx.fill();ctx.restore();
        if(guard.alert>0){ctx.fillStyle='#09121b';ctx.fillRect(guard.x-18,guard.y-23,36,4);
          ctx.fillStyle=PINK;ctx.fillRect(guard.x-18,guard.y-23,36*guard.alert/1.17,4);}
      }
      // Player is a four-fin glass moth. Status is visible in-world.
      ctx.save();ctx.translate(player.x,player.y);ctx.rotate(Math.atan2(player.vy||0,player.vx||1));
      if(cloak>0){ctx.shadowBlur=22;ctx.shadowColor=MINT;ctx.strokeStyle=MINT;ctx.lineWidth=1.8;circ(ctx,0,0,18+Math.sin(time*8)*2);ctx.stroke();}
      ctx.fillStyle=cloak>0?'#a7f4df':'#f4ddae';ctx.strokeStyle='#142333';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(-6,-9);ctx.lineTo(-14,-6);ctx.lineTo(-7,0);ctx.lineTo(-14,6);ctx.lineTo(-6,9);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#36566d';circ(ctx,1,0,3);ctx.fill();ctx.restore();
      ctx.restore();
      // Inventory/controls overlay: first eight seconds double as instruction.
      ctx.fillStyle='#07121dec';ctx.fillRect(0,0,W,66);ctx.strokeStyle='#d7c29266';ctx.beginPath();ctx.moveTo(0,65);ctx.lineTo(W,65);ctx.stroke();
      drawText(ctx,'GLASS LABYRINTH',22,27,20,GOLD);
       drawText(ctx,endless?`CIRCUIT ${cycles+1} · CHAMBER ${chamber+1}`:`CHAMBER ${chamber+1} / 3`,23,47,11,'#a6d5cd');
      drawText(ctx,`STARKEYS ${found}/2`,260,28,16,found===2?MINT:GOLD);
      drawText(ctx,`HEARTS ${'♥'.repeat(hearts)}${'♡'.repeat(3-hearts)}`,260,48,13,PINK);
      drawText(ctx,`SCORE ${score}`,472,27,14,MINT);
       drawText(ctx,endless?`CIRCUITS ${cycles}`:`TIME ${Math.max(0,116-Math.floor(clock))}s`,472,47,11,'#b8cbc6');
      ctx.fillStyle=cloakCd>0?'#2c3c48':'#276155';ctx.strokeStyle='#a7e6ca66';ctx.fillRect(690,11,194,46);ctx.strokeRect(690,11,194,46);
      drawText(ctx,cloakCd>0?`VEIL ${cloakCd.toFixed(1)}s`:'VEIL READY · SPACE',787,40,13,MINT,'center');
      ctx.fillStyle='#07121dec';ctx.fillRect(0,507,W,53);ctx.strokeStyle='#bdaa8e55';ctx.beginPath();ctx.moveTo(0,507);ctx.lineTo(W,507);ctx.stroke();
      drawText(ctx,'MOUSE OR WASD TO MOVE',23,527,11,'#d3e0d3');
      drawText(ctx,'SPACE / RIGHT CLICK TO CLOAK',23,545,11,'#b4d1c8');
      drawText(ctx,found===2?'GATE OPEN · REACH THE EASTERN DOOR':'FIND THE TWO GOLDEN STARKEYS',866,532,12,GOLD,'right');
      if(message.t>0)drawText(ctx,message.text,450,77,13,GOLD,'center');
      if(roomTransition>0){ctx.fillStyle=`rgba(5,12,20,${Math.min(.8,roomTransition/1.3*.8)})`;ctx.fillRect(0,65,W,442);
        drawText(ctx,layouts[chamber]&&['CHAMBER I · THE IVORY ARCHIVE','CHAMBER II · ECHO HALL','CHAMBER III · THE LAST OBSERVATORY'][chamber],450,283,23,GOLD,'center');}
      if(ended){ctx.fillStyle='#07121deb';ctx.fillRect(0,65,W,442);
        drawText(ctx,win?'THE ARCHIVE IS YOURS':'THE WATCHERS REMEMBER',450,250,29,win?MINT:PINK,'center');
        drawText(ctx,`SCORE ${score.toLocaleString()}`,450,289,17,GOLD,'center');}
      if(flash>0){ctx.fillStyle=`rgba(255,101,123,${flash})`;ctx.fillRect(0,65,W,442);flash=Math.max(0,flash-.025);}
    }
    return g;
  }
  AT.register({id:'labyrinth',name:'Glass Labyrinth',place:'The sealed observatory',brief:'A three-chamber stealth adventure. Avoid patrolling sentries, cloak through their fields of view, and steal two starkeys to open each gate.',create:labyrinth});
})();
