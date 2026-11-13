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

  // ─── AETHER BASTION: complementary towers, authored sieges, veteran wards. ───
  function bastion(container, options={}) {
    const W=900,H=560, rowY=i=>151+i*68, colX=i=>180+i*92;
    const verb=options.verbs||new Set();
    const rand=rng(Number.isInteger(options.seed)?options.seed:6024), N=5, C=7, endless=options.endless===true, veteran=options.veteran===true;
    // Authored packets: time, lane (one-based), hull, count, interval. The
    // planning manifest and live gates consume this same immutable itinerary.
    const CAMPAIGN=[
      {name:'First light',hint:'Start with Needles in lanes 2 and 4, near the core. Frostbells cover adjacent lanes.',reward:65,goal:'no leaks',packets:[[1,2,'scout',4,2],[2,4,'scout',4,2]]},
      {name:'The glass column',hint:'Lane 3 arrives in tight packs. Prism beams pierce whole columns; Frostbells spread chill.',reward:75,goal:'no leaks',packets:[[1,3,'scout',8,.65],[4,2,'scout',3,1.6],[5,4,'scout',3,1.6]]},
      {name:'Iron procession',hint:'Iron hulls halve Needle damage until chilled. Frostbell + Needle or Prism bypasses armour.',reward:85,goal:'no leaks',packets:[[1,1,'iron',3,3],[2,3,'iron',4,2.2],[4,5,'iron',3,3]]},
      {name:'Solar outriders',hint:'Runners race down lanes 4 and 5. The amber lane-4 current speeds them up; chill or mine ahead.',reward:90,goal:'no leaks',packets:[[1,4,'runner',7,.8],[2,5,'runner',6,.9],[5,2,'iron',3,2.4]]},
      {name:'The five gates',hint:'Every lane opens. Keep a rear defence; move spare alloy into uncovered lanes or refinements.',reward:100,goal:'no leaks',packets:[[1,1,'runner',4,1],[2,2,'iron',3,2],[1,3,'scout',8,.55],[3,4,'iron',3,2],[2,5,'runner',4,1]]},
      {name:'The crown engine',hint:'Destroy the Titan in lane 3: its breach ends the mission. Heavy priority, chill and refined towers help.',reward:0,goal:'destroy Titan',packets:[[1,3,'titan',1,0],[3,1,'iron',3,2],[3,5,'iron',3,2],[6,2,'runner',5,.8],[6,4,'runner',5,.8],[9,3,'scout',6,.5]]},
    ].map(m=>({...m,entries:m.packets.flatMap(([at,lane,kind,count,gap])=>Array.from({length:count},(_,i)=>({at:at+i*gap,row:lane-1,kind}))).sort((a,b)=>a.at-b.at)}));
    const VETERAN_SIEGES=[
      {name:'The copper eclipse',hint:'Three offices: break the vanguard, silence the Cantors, then hold the closing procession. V invokes the selected tower’s active; B turns its lane at the brass crossing. Chilled hulls shatter under Needles.',reward:120,goal:'three offices · no leaks',stages:[8,10,10],packets:[[1,2,'runner',6,.7],[2,3,'iron',5,1.6],[3,2,'sapper',1,0],[3.5,3,'bulwark',1,0],[4,1,'scout',8,.55],[6,5,'iron',3,1.8],[7,4,'sapper',1,0],[8,3,'cantor',1,0],[11,4,'cantor',1,0],[11.4,5,'bulwark',1,0]]},
      {name:'The eighth hemisphere',hint:'The Gilded Warden enters in the third office. Its procession changes lanes by telegraph; V actives or Space break its core ritual. Cantors quicken escorts and restore Bulwark fields until chilled.',reward:0,goal:'three offices · break the Warden',stages:[8,9,10],packets:[[1,1,'iron',4,1.6],[2,5,'runner',7,.65],[5,3,'bulwark',1,0],[6,4,'sapper',1,0],[8,2,'runner',6,.7],[10,4,'iron',5,1.4],[11,3,'cantor',1,0],[13,1,'cantor',1,0],[20,3,'titan',1,0]]},
    ].map(m=>({...m,entries:m.packets.flatMap(([at,lane,kind,count,gap])=>Array.from({length:count},(_,i)=>({at:at+i*gap,row:lane-1,kind}))).sort((a,b)=>a.at-b.at)}));
    const missions=veteran?[...CAMPAIGN,...VETERAN_SIEGES]:CAMPAIGN;
    const TOWERS=[
      {name:'Needle',icon:'✦',cost:45,cool:.52,damage:20,range:280,color:'#dfdfab',detail:'Fast lane cannon',paths:{left:['Needlepoint','Heavy, decisive bolts'],right:['Clockwork','Faster firing rhythm']}},
      {name:'Frostbell',icon:'❄',cost:65,cool:1.15,damage:9,range:210,color:'#b7e9ed',detail:'Slows every target',paths:{left:['Deepwinter','Longer, wider chill'],right:['Rime charge','Harder impact strikes']}},
      {name:'Prism',icon:'◇',cost:90,cool:1.7,damage:21,range:480,color:'#e5b7f3',detail:'Pierces a full lane',paths:{left:['Focal glass','Brighter lane damage'],right:['Quick refraction','Faster beam cycles']}},
      {name:'Sunmine',icon:'◎',cost:55,cool:0,damage:90,range:65,color:'#f5ba77',detail:'One-use blast trap',paths:{left:['Star charge','Bigger detonation'],right:['Salvage core','Alloy from every blast']}},
      ...(veteran&&!endless?[{name:'Ward Loom',icon:'⬡',cost:70,cool:0,damage:0,range:155,color:'#a6f3dd',detail:'Shelter / snare · R',paths:{left:['Wide lattice','+34 protection radius per tier'],right:['Quick ground','25% shorter recharge per tier']}}]:[]),
    ];
    const SITES=[
      {col:0,row:0,id:'lens',name:'Astral lens',note:'+25% range',color:'#d8d9a0'},
      {col:3,row:2,id:'coil',name:'Vesper coil',note:'18% faster cadence',color:'#a7e7e1'},
      {col:5,row:4,id:'vault',name:'Sun vault',note:'+25% mine blast',color:'#f4bd78'},
    ];
    let towers=[],enemies=[],bolts=[],sparks=[],telegraphs=[],credits=175,core=8,kills=0,over=false,ended=false,selectedTower=null;
    let selected=0,hover=null,t=0,survivalTime=0,spawn=2.5,wave=1,slowTime=0,pulseCd=0,flash=0,shake=0,showHelp=10;
    // Endless waves have a real planning break. The forecast is generated by
    // the gameplay RNG and also drives the lane mix: no misleading hints.
    let focusRow=endless?Math.floor(rand()*N):0,planning=!endless,overdrive=0;
    let waveTime=0,entryIndex=0,leaks=0,cleared=0,reserve=false,lastReward=0,fast=false,titanKilled=false,wardBlocks=0,wardSnares=0,sapperInterrupts=0,bulwarkBreaks=0;
    let stageClock=0,stageBaseAt=1,siegeStage=0,stageClears=0,laneRoutes=Array(N).fill(0),reroutes=0;
    let activeUses=0,shatters=0,markCombos=0,refractions=0,manualDetonations=0,sanctuaries=0,sanctuaryBlocks=0,cantorRepairAmount=0;
    let bossInterrupts=0,bossRituals=0,bossShifts=0,bossPhaseChanges=0;
    let keyboardCell={col:0,row:1};
    // Authored veteran sieges can be mounted directly for review and
    // regression checks, just like Labyrinth's existing startChamber option.
    if(veteran&&!endless&&Number.isInteger(options.startWave))wave=clamp(options.startWave,0,missions.length-1)+1;
    const mission=()=>missions[wave-1];
    let messages=[{t:3,text:`INSTALL A DEFENCE · 1–${TOWERS.length} SELECT · CLICK A HEX · P PAUSES`}];
    const g=frame(container,W,H,{label:`Aether Bastion: tactical tower defence. 1–${TOWERS.length} select a tower; click a cell or use arrows and Enter to build/select. Q/E refine, R targets heavy/front, right click or Delete sells. Space pulses. F toggles double speed; P pauses. Keep the eight-heart core alive${endless?' through an endless siege.':` through ${missions.length} authored sieges; destroy the final Titan.`}${veteran&&!endless?' Veteran Bulwarks block Needles until chilled or shattered; Prism bypasses their fields. Sappers channel shutdowns. Ward Looms (5) shelter towers or R switches them to fuse snares. V invokes a selected tower active; B turns its processional lane. Needles shatter chilled targets, marked targets empower Prism, and a Prism firing through a Ward refracts into adjacent lanes. Cantors quicken and repair their escort. Break the final Warden’s ritual with V or Space.':''} Planning freezes combat. Z repairs, X overdrives, C saves alloy and launches the forecast wave.`,sound:options.sound,step,draw});
    const {canvas,ctx,listen,tone,burst,starfield}=g,stars=starfield(104,90);
    canvas.style.touchAction='none';canvas.focus({preventScroll:true});
    const mobileHud=document.createElement('div');mobileHud.className='bastion-mobile-hud';mobileHud.dataset.mobileHud='bastion';mobileHud.setAttribute('role','group');mobileHud.setAttribute('aria-label','Bastion tactical status');
    mobileHud.style.cssText='display:none;box-sizing:border-box;width:100%;margin:0 0 8px;padding:10px 12px;gap:4px;background:#090b17;border:1px solid #a99568;border-radius:4px;color:#eee3c2;font:600 14px/1.45 "DM Sans",sans-serif;letter-spacing:.01em';
    mobileHud.innerHTML='<span data-bastion-mobile="objective"></span><span data-bastion-mobile="resources"></span><span data-bastion-mobile="tactical"></span>';
    const mobileMedia=matchMedia('(max-width:600px)'),syncMobileHud=()=>{mobileHud.style.display=mobileMedia.matches?'grid':'none';mobileHud.dataset.active=String(mobileMedia.matches);};syncMobileHud();listen(mobileMedia,'change',syncMobileHud);container.insertBefore(mobileHud,canvas);
    const orders=document.createElement('div');
    if(orders){
      orders.className='bastion-orders';orders.hidden=true;orders.setAttribute('role','group');
      orders.setAttribute('aria-label','Next siege order');
      orders.innerHTML='<strong data-bastion-forecast></strong><p data-bastion-manifest></p><p data-bastion-hint></p><button type="button" data-bastion-order="repair"></button><button type="button" data-bastion-order="overdrive"></button><button type="button" data-bastion-order="save"></button>';
      container.append(orders);
    }
    // Own class: the planning panel keeps `.bastion-orders` to itself so
    // selectors and tests resolve to exactly one element.
    const controls=document.createElement('div');controls.className='bastion-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Bastion controls');
    controls.innerHTML='<span data-bastion-selection></span>'+[['left','Q · Refine left'],['right','E · Refine right'],['priority','R · Front / heavy'],['sell','Delete · Sell'],['pulse','Space · Pulse'],['speed','F · Speed 1×'],...(veteran&&!endless?[['active','V · Tower active'],['lane','B · Turn procession']]:[])].map(([id,label])=>`<button type="button" data-bastion-action="${id}">${label}</button>`).join('');
    container.append(controls);
    const loadout=document.createElement('div');loadout.className='bastion-loadout';loadout.setAttribute('role','group');loadout.setAttribute('aria-label','Tower construction');
    if(veteran&&!endless)loadout.style.gridTemplateColumns='repeat(auto-fit,minmax(150px,1fr))';
    loadout.innerHTML=TOWERS.map((def,i)=>`<button type="button" data-bastion-loadout="${i}" aria-pressed="${i===selected}"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade(['needle','frostbell','prism','sunmine','ward'][i])}</span><span class="upgrade-copy"><strong>${def.name}</strong><small>${def.cost} alloy · ${def.detail}</small></span></button>`).join('');
    container.insertBefore(loadout,controls);
    listen(loadout,'click',event=>{const button=event.target.closest('[data-bastion-loadout]');if(!button||button.disabled||over||g.paused)return;selected=Number(button.dataset.bastionLoadout);canvas.focus({preventScroll:true});});
    const destroyFrame=g.destroy;
    g.destroy=()=>{mobileHud.remove();orders.remove();controls.remove();loadout.remove();destroyFrame();};
    function updateOrders(){if(!orders)return;
      if(orders.hidden===planning)orders.hidden=!planning;
      if(!planning)return;
      const forecast=endless?`SIEGE ${wave+1} FORECAST · LANE ${focusRow+1} draws extra threats${(wave+1)%4===0?' · TITAN EXPECTED':''}. Choose an order; towers can be placed now.`:
        `PLAN ${wave} / ${missions.length} · ${mission().name} · ${mission().entries.length} threats · Build freely, then choose an order to launch.`;
      const title=orders.querySelector('[data-bastion-forecast]');if(title.textContent!==forecast)title.textContent=forecast;
      if(!endless){
        const manifest=Array.from({length:N},(_,row)=>{const counts={};mission().entries.filter(e=>e.row===row).forEach(e=>counts[e.kind]=(counts[e.kind]||0)+1);return `Lane ${row+1}: ${Object.entries(counts).map(([kind,n])=>`${n} ${kind}`).join(' + ')||'clear'}`;}).join(' · ');
        const hint=`${mission().hint} Clear reward ${mission().reward} alloy; no leaks earns +35. Blue lane 2 channel slows hulls by 25%; amber lane 4 current speeds them by 25%. Lens: +25% range; coil: 18% faster; vault: +25% mine radius.${veteran?' Bulwark fields block Needles only; chill, Prism, mines or pulse counter them. Ward (5) R switches shelter / fuse snare; Q widens, E recharges. V uses the selected active; B cycles its lane’s brass crossing for 12 alloy. Each office grants 15 alloy and a short regroup.':''}`;
        for(const [selector,text] of [['manifest',manifest],['hint',hint]]){const node=orders.querySelector(`[data-bastion-${selector}]`);if(node.textContent!==text)node.textContent=text;}
      }
      const repairCost=endless?120:60,driveCost=endless?120:80;
      for(const [id,disabled] of [['repair',credits<repairCost||core>=8||g.paused||over],['overdrive',credits<driveCost||g.paused||over],['save',g.paused||over]]){
        const button=orders.querySelector(`[data-bastion-order="${id}"]`);
        if(button.disabled!==disabled)button.disabled=disabled;
        const label=id==='repair'?`Z · Repair +${endless?1:2} hearts · ${repairCost} alloy${core>=8?' · Core full':''} · launch`:
          id==='overdrive'?`X · Towers +30% this wave · ${driveCost} alloy · launch`:`C · Save alloy${endless?'':' · +15 on clear'} · launch`;
        if(button.textContent!==label)button.textContent=label;
      }
    }
    function issueOrder(order){if(!planning||g.paused||over)return;
      if(order==='repair'&&(core>=8||credits<(endless?120:60)))return;
      if(order==='overdrive'&&credits<(endless?120:80))return;
      if(order==='repair'){credits-=endless?120:60;core=Math.min(8,core+(endless?1:2));announce('CORE REPAIRED');}
      else if(order==='overdrive'){credits-=endless?120:80;overdrive=1;announce('OVERDRIVE · ALL TOWERS +30% THIS WAVE');}
      else if(order!=='save')return;
      planning=false;
      if(endless){wave++;t=(wave-1)*24;spawn=1.5;}
      else {waveTime=0;stageClock=0;siegeStage=0;stageBaseAt=mission().entries[0]?.at||1;entryIndex=0;leaks=0;reserve=order==='save';messages=[];announce(`${mission().name.toUpperCase()} · ${veteran?'OFFICE I · ':''}HOLD THE FORECAST LANES`);}
      updateOrders();
      tone(620,.14,'triangle',.045);canvas.focus({preventScroll:true});
    }
    if(orders)listen(orders,'click',e=>{const button=e.target.closest('[data-bastion-order]');if(button&&!button.disabled)issueOrder(button.dataset.bastionOrder);});
    const score=()=>Math.round(kills*65+core*200+credits*2+(wave-1)*240);
    function finish(won){if(ended)return;ended=true;over=won?'won':'lost';
      planning=false;updateOrders();writeDiagnostics();
      tone(won?670:135,.3,'triangle',.05);
      g.after(()=>{g.destroy();options.onEnd?.({won,score:score()});},1300);
    }
    function burstAt(x,y,color,n=12){burst(x,y,color,n,170);}
    function announce(str){messages.unshift({text:str,t:2.8});messages=messages.slice(0,4);}
    const siteAt=(col,row)=>SITES.find(site=>site.col===col&&site.row===row)||null;
    let titanStage=0;
    function campaignEnemy(entry){
      const stats={scout:[42,60,14],runner:[34,108,16],iron:[150,38,26],sapper:[190,34,38],bulwark:[230,31,44],cantor:[170,30,42],titan:[1600,23,150]}[entry.kind];
      const hp=stats[0]*(verb.has('lure')?1.24:1)*(veteran?1.18:1);
      const bulwark=entry.kind==='bulwark',cantor=entry.kind==='cantor',veteranBoss=veteran&&entry.kind==='titan'&&wave===missions.length;
      return {...entry,hp,maxHp:hp,v:stats[1],gold:stats[2],armored:entry.kind==='iron',support:entry.kind==='sapper'||cantor,cantor,bulwark,boss:entry.kind==='titan',veteranBoss,barrier:bulwark?120:0,barrierMax:bulwark?120:0,slow:0,exposed:0,marked:0,haste:1,hit:0,tick:0,stunned:0,sapCharge:0,sapCooldown:.8,sapTarget:null,wardSnare:0,snaredBy:null,phase:1,ritualCharge:0,ritualCooldown:5,shift:0,shiftTarget:null,rerouted:false,wait:entry.kind==='titan'?2.8:entry.kind==='sapper'?2.2:cantor?1.6:1};
    }
    function enemySpec(){
       const row=rand()<.42?focusRow:Math.floor(rand()*N),stage=wave;
      const armored=stage>1&&rand()<Math.min(.48,.14+stage*.05);
      const boss=stage>=4&&stage%4===0&&titanStage!==stage&&!enemies.some(e=>e.boss);
      if(boss)titanStage=stage;
      const hp=(boss?170+stage*18:armored?77+stage*10:23+stage*9)*(verb.has('lure')?1.24:1)*(veteran?1.18:1);
       return {row:boss&&endless?focusRow:row,v:boss?28+stage*2:armored?37+stage*2:54+stage*8,hp,maxHp:hp,armored,boss,slow:0,hit:0,tick:rand()*TAU,gold:boss?70:armored?26:17};
    }
     function telegraphEnemy(){
       const enemy=enemySpec();telegraphs.push({...enemy,wait:enemy.boss?1.25:.68});
       if(enemy.boss){canvas.dataset.titanLane=String(enemy.row+1);announce(`TITAN IN LANE ${enemy.row+1} · FORTIFY THE LINE`);}
    }
    function spawnEnemy(enemy){
      if(enemies.length>=72)return;
      enemies.push({...enemy,x:872,y:rowY(enemy.row)});
    }
    const wardRadius=tower=>(TOWERS[4]?.range||0)*(tower.site==='lens'?1.25:1)+(tower.path==='left'?(tower.tier||0)*34:0);
    const wardRecharge=tower=>8*(tower.path==='right'?Math.pow(.75,tower.tier||0):1)*(tower.site==='coil'?.82:1);
    function sabotage(e,target){
      if(target.shielded>0){
        target.shielded=0;sanctuaryBlocks++;e.sapCharge=0;e.sapTarget=null;e.sapCooldown=4.5;
        burstAt(target.x,target.y,'#eee3c2',16);announce('SANCTUARY HELD · SABOTAGE ABSORBED');tone(880,.14,'sine',.04);return;
      }
      const ward=towers.filter(q=>q.type===4&&q.wardMode!=='snare'&&(q.disabled||0)<=0&&(q.wardCool||0)<=0&&Math.hypot(q.x-target.x,q.y-target.y)<=wardRadius(q)).sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y))[0];
      if(ward){
        ward.wardCool=wardRecharge(ward);wardBlocks++;burstAt(target.x,target.y,TEAL,20);tone(850,.16,'sine',.04);
        announce(`WARD GROUNDED THE SABOTAGE · ${TOWERS[target.type].name.toUpperCase()} STAYS ONLINE`);
      }else{
        target.disabled=5.5;burstAt(target.x,target.y,'#f5ba77',16);tone(155,.2,'square',.035);
        announce(`SAPPER SABOTAGE · ${TOWERS[target.type].name.toUpperCase()} OFFLINE 5.5s`);
      }
      e.sapCharge=0;e.sapTarget=null;e.sapCooldown=4.5;
    }
    function disruptBoss(e){
      if(!e.veteranBoss)return;
      if(e.shift>0){e.shift=0;e.shiftTarget=null;bossInterrupts++;announce('PROCESSION BROKEN · WARDEN HOLDS ITS LANE');}
      if(e.ritualCharge>0){e.ritualCharge=0;e.ritualCooldown=6;e.stunned=Math.max(e.stunned,1.2);bossInterrupts++;announce('RITUAL BROKEN · THE CORE IS SPARED');tone(910,.18,'triangle',.045);}
    }
    function updateVeteranBoss(e,dt){
      if(!e.veteranBoss)return true;
      const phase=e.hp/e.maxHp<=.33?3:e.hp/e.maxHp<=.66?2:1;
      if(phase!==e.phase){
        e.phase=phase;bossPhaseChanges++;e.shift=2.4;e.shiftTarget=(e.row+(phase===2?1:2))%N;e.ritualCharge=0;
        announce(`WARDEN OFFICE ${phase} · PROCESSION TO LANE ${e.shiftTarget+1} · V OR SPACE CAN BREAK IT`);tone(180,.28,'sawtooth',.04);
      }
      if(e.shift>0){
        if(e.stunned<=0)e.shift-=dt;
        if(e.shift<=0){e.row=e.shiftTarget;e.y=rowY(e.row);e.shiftTarget=null;bossShifts++;burstAt(e.x,e.y,GOLD,22);}
        return false;
      }
      e.ritualCooldown=Math.max(0,e.ritualCooldown-dt);
      if(e.ritualCharge>0){
        e.ritualCharge+=dt;
        if(e.ritualCharge>=(e.phase===3?3.8:4.8)){
          e.ritualCharge=0;e.ritualCooldown=6;bossRituals++;core=Math.max(0,core-2);flash=.3;shake=8;
          announce('THE WARDEN’S BELL STRIKES · CORE −2');tone(105,.38,'sawtooth',.055);if(core<=0)finish(false);
        }
        return false;
      }
      if(e.ritualCooldown<=0&&e.x<770){e.ritualCharge=.001;announce('WARDEN RITUAL · 4.8s · SELECT A TOWER + V OR SPACE');tone(145,.25,'square',.035);return false;}
      return true;
    }
    function detonate(tower,manual=false){
      const def=TOWERS[tower.type],tier=tower.tier||0,radius=mineRadius(tower)*(manual?1.65:1);
      const close=enemies.filter(e=>Math.hypot(e.x-tower.x,e.y-tower.y)<radius);
      if(!close.length){if(manual)announce('REMOTE LITANY · NO HULL IN THE BLAST');return false;}
      const blast=def.damage*(1+tier*.5+(tower.path==='left'?tier*.3:0))*(verb.has('cinder')?1.25:1)*(overdrive?1.3:1);
      for(const e of close){damage(e,blast,3);disruptBoss(e);if(tower.path==='right')credits+=tier*3;}
      if(manual)manualDetonations++;
      burstAt(tower.x,tower.y,'#d6a05f',32);tower.dead=true;shake=6;tone(210,.24,'sawtooth',.045);return true;
    }
    function prismWard(from,target){
      return towers.find(q=>q.type===4&&q.wardMode!=='snare'&&(q.disabled||0)<=0&&(q.wardCool||0)<=0&&(q.refractionCool||0)<=0&&q.row===from.row&&q.x>from.x&&q.x<target.x)||null;
    }
    function activateTower(){
      if(!veteran||endless||over||planning||g.paused)return;
      const tower=selectedTower;
      if(!tower||!towers.includes(tower)||tower.disabled>0||tower.activeCd>0)return;
      if(tower.type===3){if(detonate(tower,true))activeUses++;return;}
      const def=TOWERS[tower.type],range=def.range*(tower.site==='lens'?1.25:1);
      const candidates=enemies.filter(e=>(tower.type===1?Math.abs(e.row-tower.row)<=1:e.row===tower.row)&&e.x>tower.x-15&&Math.hypot(e.x-tower.x,e.y-tower.y)<range).sort((a,b)=>Number(b.veteranBoss)-Number(a.veteranBoss)||a.x-b.x);
      if(tower.type!==4&&!candidates.length){announce(`${def.name.toUpperCase()} ACTIVE · NO TARGET IN RANGE`);return;}
      if(tower.type===4){
        const ward=tower,near=towers.filter(q=>q!==ward&&Math.hypot(q.x-ward.x,q.y-ward.y)<=wardRadius(ward));
        for(const q of near){q.disabled=0;q.shielded=9;q.activeCd=Math.max(0,(q.activeCd||0)-4);}
        ward.activeCd=16;sanctuaries++;announce(`SANCTUARY · ${near.length} TOWERS CLEANSED AND SHELTERED`);burstAt(ward.x,ward.y,'#eee3c2',22);
      }else if(tower.type===0){
        const target=candidates[0];tower.activeCd=12;target.marked=6;
        for(let i=0;i<3;i++){damage(target,def.damage*.72,0);bolts.push({x:tower.x,y:tower.y,target,damage:0,speed:900,type:5,color:'#eee3c2'});}
        disruptBoss(target);announce('SILVER VERDICT · TARGET MARKED FOR PRISM');
      }else if(tower.type===1){
        tower.activeCd=14;
        for(const e of candidates){e.slow=Math.max(e.slow,5);e.exposed=6;e.stunned=Math.max(e.stunned,1.2);e.sapCharge=0;e.sapTarget=null;damage(e,12,1);disruptBoss(e);}
        announce('WINTER OFFICE · CHILL, EXPOSE AND INTERRUPT');
      }else if(tower.type===2){
        const target=candidates[0];tower.activeCd=13;
        for(const e of [...enemies])if(e.row===tower.row&&e.x>tower.x-10&&e.x<tower.x+range){damage(e,34,2);disruptBoss(e);}
        const ward=prismWard(tower,target);
        for(const row of [tower.row-1,tower.row+1]){
          const side=enemies.filter(e=>e.row===row&&e.x>tower.x&&e.x<tower.x+range).sort((a,b)=>a.x-b.x)[0];
          if(side){damage(side,ward?24:14,2);disruptBoss(side);if(ward)refractions++;}
        }
        if(ward)ward.refractionCool=2;
        bolts.push({x:tower.x,y:tower.y,toX:850,toY:tower.y,t:.28,beam:true,color:'#eee3c2'});announce(ward?'TRINE REFRACTION · WARD SPLITS THREE LANES':'PRISM OFFICE · PIERCING LITANY');
      }
      activeUses++;tone(780,.16,'triangle',.04);
    }
    function cycleLane(forcedRow=null){
      if(!veteran||endless||over||g.paused)return;
      const row=forcedRow??hover?.row??selectedTower?.row??keyboardCell.row;
      if(credits<12){announce('BRASS CROSSING · NEED 12 ALLOY');return;}
      credits-=12;laneRoutes[row]=laneRoutes[row]===0?-1:laneRoutes[row]===-1?1:0;keyboardCell={col:3,row};
      announce(`LANE ${row+1} CROSSING · ${laneRoutes[row]===0?'STRAIGHT':laneRoutes[row]<0?'DIVERT UP':'DIVERT DOWN'} · 12 ALLOY`);tone(480,.1,'triangle',.03);
    }
    function shoot(from,enemy) {
      const def=TOWERS[from.type],tier=from.tier||0;
      const power=verb.has('tempest')?1.18:1;
        const shotDamage=def.damage*power*(1+tier*.35+(from.path==='left'?tier*.25:0))*(overdrive?1.3:1);
       if(from.type===2) {
         canvas.dataset.prismShots=String(Number(canvas.dataset.prismShots||0)+1);
         const range=def.range*(from.site==='lens'?1.25:1);
         for(const e of [...enemies]) if(e.row===from.row&&e.x>from.x-10&&e.x<from.x+range)damage(e,shotDamage,2);
         const ward=veteran&&!endless?prismWard(from,enemy):null;
         if(ward){
           for(const row of [from.row-1,from.row+1]){
             const side=enemies.filter(e=>e.row===row&&e.x>ward.x&&e.x<from.x+range).sort((a,b)=>a.x-b.x)[0];
             if(side){damage(side,shotDamage*.55,2);refractions++;bolts.push({x:ward.x,y:ward.y,toX:side.x,toY:side.y,t:.18,beam:true,color:TEAL});}
           }
           ward.refractionCool=2;
         }
        bolts.push({x:from.x,y:from.y,toX:850,toY:from.y,t:.18,beam:true,color:def.color});
        tone(770,.1,'sine',.025);
      } else {
         bolts.push({x:from.x,y:from.y,target:enemy,damage:shotDamage,speed:from.type===1?430:580,
          type:from.type,color:def.color,slow:2.6+tier*(from.path==='left'?1.15:.45)});
        tone(from.type===1?410:630,.045,'triangle',.02);
      }
    }
    // Bulwarks project in the direction of travel: Needles coming from the core
    // strike the field before any protected hull behind it. Chill suppresses
    // projection; Prism bypasses it, while mines and pulse shatter the field.
    function barrierSource(target){
      if(!veteran||endless)return null;
      return enemies.filter(e=>e.bulwark&&e.barrier>0&&e.slow<=0&&(e.stunned||0)<=0&&e.x<=target.x+12&&Math.hypot(e.x-target.x,e.y-target.y)<=145).sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y))[0]||null;
    }
    function hitBarrier(source,amount){
      if(!source||source.barrier<=0)return;
      source.barrier=Math.max(0,source.barrier-amount);source.hit=.14;
      if(source.barrier===0){bulwarkBreaks++;burstAt(source.x,source.y,TEAL,18);announce('BULWARK FIELD SHATTERED · NEEDLES CAN STRIKE');tone(690,.12,'triangle',.035);}
    }
    function damage(e,d,type){if(!enemies.includes(e))return;
      if(type===0||type===3){const barrier=barrierSource(e);if(barrier){hitBarrier(barrier,d*(type===3?1.5:1));if(type===0){e.hit=.08;return;}}}
      if(!endless&&e.armored&&e.slow<=0&&type===0)d*=.5;
      if(veteran&&!endless&&type===0&&(e.slow>0||e.exposed>0)){
        d*=e.exposed>0?1.55:1.3;e.exposed=0;shatters++;
        for(const other of [...enemies])if(other!==e&&other.row===e.row&&Math.abs(other.x-e.x)<62)damage(other,d*.18,'shatter');
        burstAt(e.x,e.y,'#eee3c2',5);
      }
      if(veteran&&!endless&&type===2&&e.marked>0){d*=1.35;e.marked=0;markCombos++;}
      e.hp-=d;e.hit=.14;
      if(e.hp<=0){
        if(e.boss&&!endless)titanKilled=true;
        enemies.splice(enemies.indexOf(e),1);kills++;credits+=e.gold;
        burstAt(e.x,e.y,e.boss?'#ead4aa':'#9fe8df',e.boss?40:12);
        if(verb.has('siphon')&&kills%5===0)core=Math.min(8,core+1);
        if(kills%8===0){announce(`FIELD RESUPPLIED · ${credits} ALLOY`);tone(880,.12,'sine',.045);}
      }
    }
    function step(dt) {
       // Double speed runs the same bounded simulation steps, never a larger
       // projectile/collision timestep. Shared frame retains pause ownership.
       simulate(dt);if(fast)simulate(dt);
    }
    function simulate(dt) {
       if(over)return;
       if(planning)return;
       t+=dt;survivalTime+=dt;showHelp=Math.max(0,showHelp-dt);pulseCd=Math.max(0,pulseCd-dt);slowTime=Math.max(0,slowTime-dt);
      messages.forEach(m=>m.t-=dt);messages=messages.filter(m=>m.t>0);
       if(!endless){
         waveTime+=dt;if(veteran)stageClock+=dt;
         const stageEnd=veteran&&mission().stages?mission().stages.slice(0,siegeStage+1).reduce((a,b)=>a+b,0):mission().entries.length;
         while(entryIndex<stageEnd){
           const entry=mission().entries[entryIndex],due=veteran?entry.at-stageBaseAt+1:entry.at;
           if((veteran?stageClock:waveTime)<due)break;
           const enemy=campaignEnemy(mission().entries[entryIndex++]);if(telegraphs.length<64)telegraphs.push(enemy);
           if(enemy.boss){canvas.dataset.titanLane=String(enemy.row+1);announce(veteran?'GILDED WARDEN · FINAL OFFICE · BREAK ITS RITUAL':'CROWN ENGINE · LANE 3 · DO NOT LET IT REACH THE CORE');}
         }
       }
       if(endless&&t<wave*24){
        spawn-=dt;
        if(spawn<=0){telegraphEnemy();spawn=Math.max(.54,1.7-wave*.09)*(verb.has('gyro')?.94:1);}
      }
      for(const incoming of [...telegraphs]){incoming.wait-=dt;if(incoming.wait<=0){telegraphs.splice(telegraphs.indexOf(incoming),1);spawnEnemy(incoming);}}
      for(const tower of towers){
        const def=TOWERS[tower.type];tower.cool=Math.max(0,tower.cool-dt);
        tower.disabled=Math.max(0,(tower.disabled||0)-dt);tower.activeCd=Math.max(0,(tower.activeCd||0)-dt);tower.shielded=Math.max(0,(tower.shielded||0)-dt);tower.refractionCool=Math.max(0,(tower.refractionCool||0)-dt);
        if(tower.type===4)tower.wardCool=Math.max(0,(tower.wardCool||0)-dt);
        if(tower.disabled>0||tower.type===4)continue;
        if(tower.type===3){
          detonate(tower,false);
        }else if(tower.cool<=0){
          const range=def.range*(tower.site==='lens'?1.25:1);
          const nearby=enemies.filter(e=>(tower.type===1?Math.abs(e.row-tower.row)<=1:e.row===tower.row)&&e.x>tower.x-15&&Math.hypot(e.x-tower.x,e.y-tower.y)<range).sort(tower.priority==='heavy'?(a,b)=>Number(b.boss)-Number(a.boss)||Number(b.support)-Number(a.support)||Number(b.bulwark)-Number(a.bulwark)||Number(b.armored)-Number(a.armored)||b.hp-a.hp||a.x-b.x:(a,b)=>a.x-b.x);
          if(nearby.length){tower.cool=def.cool*(tower.path==='right'?Math.pow(.76,tower.tier||0):1)*(tower.site==='coil'?.82:1);shoot(tower,nearby[0]);}
        }
      }
      towers=towers.filter(t=>!t.dead);if(bolts.length>160)bolts.splice(0,bolts.length-160);
      for(const b of [...bolts]){
        if(b.beam){b.t-=dt;if(b.t<=0)bolts.splice(bolts.indexOf(b),1);continue;}
        if(!enemies.includes(b.target)){bolts.splice(bolts.indexOf(b),1);continue;}
        const dx=b.target.x-b.x,dy=b.target.y-b.y,d=Math.hypot(dx,dy)||1;
        if(d<b.speed*dt+12){
          if(b.type===1){
            for(const e of [...enemies])if(Math.hypot(e.x-b.target.x,e.y-b.target.y)<85+(b.slow-2.6)*14){e.slow=b.slow;damage(e,b.damage,b.type);}
            burstAt(b.target.x,b.target.y,'#b9e4f9',10);
          }else damage(b.target,b.damage,b.type);
          bolts.splice(bolts.indexOf(b),1);
        } else {b.x+=dx/d*b.speed*dt;b.y+=dy/d*b.speed*dt;}
      }
       for(const e of enemies)e.haste=1;
       if(veteran)for(const cantor of enemies)if(cantor.cantor&&cantor.slow<=0&&cantor.stunned<=0){
         for(const ally of enemies)if(ally!==cantor&&Math.hypot(ally.x-cantor.x,ally.y-cantor.y)<170){ally.haste=Math.max(ally.haste,1.24);if(ally.bulwark&&ally.barrier<ally.barrierMax){const before=ally.barrier;ally.barrier=Math.min(ally.barrierMax,ally.barrier+dt*9);cantorRepairAmount+=ally.barrier-before;}}
       }
       for(const e of [...enemies]){
        e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.exposed=Math.max(0,(e.exposed||0)-dt);e.marked=Math.max(0,(e.marked||0)-dt);e.tick+=dt;
        e.stunned=Math.max(0,(e.stunned||0)-dt);e.sapCooldown=Math.max(0,(e.sapCooldown||0)-dt);
        const slow=(e.slow>0?.4:1)*(slowTime>0?.28:1);
        const terrain=!endless&&e.x>=430&&e.x<=610?(e.row===1?.75:e.row===3?1.25:1):1;
        let advance=updateVeteranBoss(e,dt);if(over)return;
        if(e.kind==='sapper'){
          if(e.stunned>0){e.sapCharge=0;e.sapTarget=null;advance=false;}
          else if(e.sapCooldown<=0){
            const target=towers.filter(q=>(q.disabled||0)<=0&&q.row===e.row&&q.x<e.x+10&&e.x-q.x<=340).sort((a,b)=>b.x-a.x)[0];
            if(target){
              if(e.sapTarget!==target){e.sapTarget=target;e.sapCharge=0;}
              e.sapCharge+=dt*(e.slow>0?.45:1);advance=false;
              if(e.sapCharge>=3.4){sabotage(e,target);advance=true;}
            }else{e.sapCharge=0;e.sapTarget=null;}
          }
        }
        // A snare Ward gives up sheltering entirely. It must hold a live fuse
        // for 1.4s, then spends its recharge to stun that sapper and reset it.
        const snare=e.kind==='sapper'&&e.sapTarget?towers.filter(q=>q.type===4&&q.wardMode==='snare'&&(q.disabled||0)<=0&&(q.wardCool||0)<=0&&Math.hypot(q.x-e.x,q.y-e.y)<=wardRadius(q)).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0]:null;
        e.snaredBy=snare||null;
        if(snare){
          e.wardSnare=(e.wardSnare||0)+dt;e.sapCharge=Math.max(0,e.sapCharge-dt*1.8);advance=false;
          if(e.wardSnare>=1.4){
            snare.wardCool=wardRecharge(snare);wardSnares++;e.wardSnare=0;e.sapCharge=0;e.sapTarget=null;e.snaredBy=null;e.sapCooldown=4;e.stunned=2;
            burstAt(e.x,e.y,TEAL,16);announce('WARD SNARE · FUSE BROKEN · SHELTER OFFLINE');tone(820,.14,'sine',.04);
          }
        }else e.wardSnare=0;
        const previousX=e.x;if(advance)e.x-=e.v*slow*terrain*(e.haste||1)*(e.veteranBoss?1+(e.phase-1)*.12:1)*dt;
        if(veteran&&!endless&&!e.rerouted&&previousX>520&&e.x<=520&&laneRoutes[e.row]){
          const nextRow=clamp(e.row+laneRoutes[e.row],0,N-1);
          if(nextRow!==e.row){e.row=nextRow;e.y=rowY(nextRow);e.rerouted=true;e.sapCharge=0;e.sapTarget=null;reroutes++;burstAt(e.x,e.y,GOLD,7);}
        }
        if(e.x<85){enemies.splice(enemies.indexOf(e),1);core-=e.boss?3:1;
          leaks++;
          flash=.3;shake=8;announce('THE CORE IS STRUCK');tone(128,.22,'sawtooth',.045);
          if(core<=0||(!endless&&e.boss))return finish(false);
        }
       }
       if(endless&&t>=wave*24&&!enemies.length&&!telegraphs.length){
         overdrive=0;credits+=80;focusRow=Math.floor(rand()*N);planning=true;
         announce(`SIEGE CLEARED · +80 ALLOY · LANE ${focusRow+1} NEXT`);
         updateOrders();tone(510,.18,'triangle',.045);
       }
       const stageEnd=endless?0:veteran&&mission().stages?mission().stages.slice(0,siegeStage+1).reduce((a,b)=>a+b,0):mission().entries.length;
       if(!endless&&entryIndex===stageEnd&&!enemies.length&&!telegraphs.length){
         if(veteran&&mission().stages&&siegeStage<mission().stages.length-1){
           stageClears++;siegeStage++;stageClock=-2.4;stageBaseAt=mission().entries[entryIndex].at;credits+=15;bolts=[];pulseCd=Math.max(0,pulseCd-4);
           announce(`OFFICE ${siegeStage} BROKEN · +15 ALLOY · OFFICE ${siegeStage+1} IN 2.4s`);tone(590,.16,'triangle',.04);
         }else{
           cleared++;if(veteran&&mission().stages)stageClears++;lastReward=mission().reward+(leaks===0?35:0)+(reserve?15:0);credits+=lastReward;
           if(wave===missions.length)return finish(titanKilled);
           wave++;planning=true;siegeStage=0;stageClock=0;stageBaseAt=mission().entries[0]?.at||1;overdrive=0;bolts=[];laneRoutes=Array(N).fill(0);selectedTower=towers.includes(selectedTower)?selectedTower:null;
           // Readiness is explicit at each refit, not gained by waiting in menus.
           pulseCd=0;slowTime=0;announce(`SIEGE CLEARED · +${lastReward} ALLOY${leaks===0?' · PERFECT DEFENCE':''}`);
           updateOrders();tone(510,.18,'triangle',.045);
         }
       }
    }
    function pulse(){if(pulseCd>0||over||planning)return;
      pulseCd=verb.has('gyro')?11:16;slowTime=2.2;
      const breaking=enemies.some(e=>e.kind==='sapper');
      [...enemies].forEach(e=>{if(e.kind==='sapper'){if(e.sapTarget)sapperInterrupts++;e.stunned=Math.max(e.stunned||0,2.2);e.sapCharge=0;e.sapTarget=null;}if(e.cantor)e.stunned=Math.max(e.stunned||0,2.2);if(e.bulwark)hitBarrier(e,e.barrier);damage(e,12);disruptBoss(e);});
      announce(veteran?(breaking?'AETHER PULSE · FUSES AND BULWARK FIELDS BROKEN':'AETHER PULSE · ENEMIES STILLED · FIELDS SHATTERED'):'AETHER PULSE · ENEMIES STILLED');tone(280,.3,'sine',.05);
      for(let x=90;x<900;x+=35)burstAt(x,300,'#a5e9da',2);
    }
    function inputCell(pt){return {col:Math.round((pt.x-180)/92),row:Math.round((pt.y-151)/68)};}
    function previewTower(){
      if(selectedTower&&towers.includes(selectedTower))return selectedTower;
      if(!hover||hover.occupied)return null;
      return {x:colX(hover.col),y:rowY(hover.row),type:selected,site:siteAt(hover.col,hover.row)?.id||null,preview:true};
    }
    const mineRadius=tower=>(68+(tower.tier||0)*(tower.path==='left'?13:5))*(tower.site==='vault'?1.25:1);
    function sell(tower){
      if(over||g.paused||!towers.includes(tower))return;
      const refund=Math.floor(TOWERS[tower.type].cost*(.65+tower.tier*.2));credits+=refund;
      burstAt(tower.x,tower.y,GOLD,8);towers.splice(towers.indexOf(tower),1);
      if(selectedTower===tower)selectedTower=null;announce(`SALVAGED · +${refund} ALLOY`);tone(380,.1,'triangle',.025);
    }
    function priority(){
      if(!selectedTower||!towers.includes(selectedTower))return;
      if(selectedTower.type===4){selectedTower.wardMode=selectedTower.wardMode==='snare'?'shelter':'snare';announce(`WARD ROUTED TO ${selectedTower.wardMode==='snare'?'FUSE SNARE · SHELTER DISABLED':'SHELTER · GROUNDS SABOTAGE'}`);tone(520,.08,'triangle',.03);}
      else if(selectedTower.type<2||(veteran&&selectedTower.type===2)){selectedTower.priority=selectedTower.priority==='heavy'?'front':'heavy';announce(`${TOWERS[selectedTower.type].name.toUpperCase()} TARGETS ${selectedTower.priority==='heavy'?'HEAVY HULLS':'FRONT RUNNERS'}`);tone(520,.08,'triangle',.03);}
    }
    function updateControls(){
      const tower=towers.includes(selectedTower)?selectedTower:null,def=tower?TOWERS[tower.type]:null;
      const cost=def?Math.round(def.cost*(tower.tier?1.65:1.15)):0,activeNames=['Silver verdict','Winter office','Trine refraction','Remote litany','Sanctuary'];
      const label=tower?`${def.name} · ${tower.tier===2?'fully refined':`${cost} alloy/refinement`} · ${tower.type===4?`${tower.wardMode==='snare'?'snare fuses':'shelter towers'} · ${wardRadius(tower)} range · ${wardRecharge(tower).toFixed(1)}s recharge`:`target ${tower.priority}`}${veteran?` · V ${activeNames[tower.type]} ${tower.activeCd>0?`${Math.ceil(tower.activeCd)}s`:'ready'}`:''} · sell ${Math.floor(def.cost*(.65+tower.tier*.2))}`:`1–${TOWERS.length} select · Click / arrows + Enter build · Select an installed tower to refine`;
      const node=controls.querySelector('[data-bastion-selection]');if(node.textContent!==label)node.textContent=label;
      for(const button of controls.querySelectorAll('[data-bastion-action]')){
        const id=button.dataset.bastionAction;
        const disabled=Boolean(over||g.paused||(id==='pulse'&&(planning||pulseCd>0))||(['left','right'].includes(id)&&(!tower||tower.tier>=2||credits<cost||(tower.path&&tower.path!==id)))||(id==='priority'&&(!tower||(tower.type>1&&tower.type!==4)&&!(veteran&&tower.type===2)))||(id==='sell'&&!tower)||(id==='active'&&(!tower||planning||tower.disabled>0||tower.activeCd>0))||(id==='lane'&&credits<12));
        if(button.disabled!==disabled)button.disabled=disabled;
        const text=id==='speed'?`F · Speed ${fast?'2':'1'}×`:id==='priority'&&tower?.type===4?`R · ${tower.wardMode==='snare'?'Snare fuses':'Shelter towers'}`:id==='active'&&def?`V · ${activeNames[tower.type]}${tower.activeCd>0?` · ${Math.ceil(tower.activeCd)}s`:''}`:id==='lane'?`B · Lane ${(hover?.row??tower?.row??keyboardCell.row)+1} · 12 alloy`:['left','right'].includes(id)&&def?`${id==='left'?'Q':'E'} · ${def.paths[id][0]} · ${cost}`:null;
        if(text&&button.textContent!==text)button.textContent=text;
      }
      for(const button of loadout.querySelectorAll('[data-bastion-loadout]')){
        const index=Number(button.dataset.bastionLoadout),def=TOWERS[index];
        button.setAttribute('aria-pressed',String(index===selected));button.disabled=Boolean(over||g.paused||credits<def.cost);
      }
    }
    listen(controls,'click',e=>{
      const button=e.target.closest('[data-bastion-action]');if(!button||button.disabled||g.paused||over)return;
      const id=button.dataset.bastionAction;
      if(id==='left'||id==='right')upgrade(id);
      if(id==='priority')priority();if(id==='sell')sell(selectedTower);if(id==='pulse')pulse();if(id==='speed')fast=!fast;if(id==='active')activateTower();if(id==='lane')cycleLane();
      canvas.focus({preventScroll:true});
    });
    function purchase(pt){
      if(over||g.paused)return;
      if(veteran&&!endless&&Math.abs(pt.x-520)<18)for(let row=0;row<N;row++)if(Math.abs(pt.y-(rowY(row)+26))<14){cycleLane(row);return;}
      if(pt.y>476){const i=TOWERS.length===4?Math.floor((pt.x-70)/192):TOWERS.findIndex((_,index)=>pt.x>=30+index*170&&pt.x<=190+index*170);if(i>=0&&i<TOWERS.length){selected=i;return;}}
      if(pt.x>800&&pt.y<100){pulse();return;}
      const {col,row}=inputCell(pt);
      if(col<0||col>=C||row<0||row>=N)return;
      if(Math.hypot(colX(col)-pt.x,rowY(row)-pt.y)>41)return;
      const cost=TOWERS[selected].cost;
      const existing=towers.find(q=>q.col===col&&q.row===row);
       if(existing){selectedTower=existing;const d=TOWERS[existing.type];announce(`${d.name.toUpperCase()} SELECTED · Q/E REFINE · R ${existing.priority==='heavy'?'FRONT':'HEAVY'} TARGETS`);tone(410,.07,'triangle',.025);return;}
      if(credits<cost){announce('NOT ENOUGH ALLOY');tone(155,.06,'square',.018);return;}
      credits-=cost;
      const site=siteAt(col,row);
       selectedTower={x:colX(col),y:rowY(row),col,row,type:selected,cool:.12,activeCd:0,shielded:0,refractionCool:0,tier:0,path:null,priority:'front',site:site?.id||null,disabled:0,wardCool:0,wardMode:'shelter'};towers.push(selectedTower);
      if(site)announce(`${site.name.toUpperCase()} · ${site.note.toUpperCase()}`);
      burstAt(colX(col),rowY(row),TOWERS[selected].color,10);tone(510,.12,'triangle',.04);
    }
    function upgrade(path){
      if(over||g.paused)return;
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
      if(over||g.paused)return;
      const pt=point(e,canvas,W,H);canvas.focus({preventScroll:true});
      if(e.button===2){
        const {col,row}=inputCell(pt),i=towers.findIndex(q=>q.col===col&&q.row===row);
        if(i>=0)sell(towers[i]);
      } else purchase(pt);
    });
    listen(canvas,'pointermove',e=>{
      const pt=point(e,canvas,W,H),{col,row}=inputCell(pt);
      hover=col<0||col>=C||row<0||row>=N||Math.hypot(colX(col)-pt.x,rowY(row)-pt.y)>41?null:{col,row,occupied:towers.some(q=>q.col===col&&q.row===row)};
    });
    listen(canvas,'pointerleave',()=>hover=null);
    listen(canvas,'contextmenu',e=>e.preventDefault());
    listen(canvas,'keydown',e=>{
       if(over||g.paused)return;
       if(e.key.startsWith('Arrow')){e.preventDefault();const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){keyboardCell={col:clamp(keyboardCell.col+d[0],0,C-1),row:clamp(keyboardCell.row+d[1],0,N-1)};hover={...keyboardCell,occupied:towers.some(q=>q.col===keyboardCell.col&&q.row===keyboardCell.row)};}return;}
       if(e.key==='Enter'){e.preventDefault();purchase({x:colX(keyboardCell.col),y:rowY(keyboardCell.row)});}
       if(e.key==='Delete'){e.preventDefault();sell(selectedTower);}
       if(e.key.toLowerCase()==='f'&&!e.repeat){e.preventDefault();fast=!fast;}
       if(/^[1-5]$/.test(e.key)&&Number(e.key)<=TOWERS.length){selected=Number(e.key)-1;e.preventDefault();}
       if(e.key.toLowerCase()==='q'){upgrade('left');e.preventDefault();}
        if(e.key.toLowerCase()==='e'){upgrade('right');e.preventDefault();}
        if(e.key.toLowerCase()==='r'){priority();e.preventDefault();}
        if(veteran&&!endless&&e.key.toLowerCase()==='v'&&!e.repeat){activateTower();e.preventDefault();}
        if(veteran&&!endless&&e.key.toLowerCase()==='b'&&!e.repeat){cycleLane();e.preventDefault();}
       if(e.key===' '){pulse();e.preventDefault();}
       if(planning&&['z','x','c'].includes(e.key.toLowerCase())){issueOrder({z:'repair',x:'overdrive',c:'save'}[e.key.toLowerCase()]);e.preventDefault();}
    });
    // Diagnostic dataset writes are throttled to ~8Hz and skipped when the
    // value is unchanged; tests read these attributes, names must not change.
    let diagAt=-1;const diagCache={};
    function setDiag(key,value){value=String(value);if(diagCache[key]!==value){diagCache[key]=value;canvas.dataset[key]=value;}}
    function writeDiagnostics(){
      setDiag('reducedMotion',reduced());
      setDiag('towerCount',towers.length);
      setDiag('selectedTier',selectedTower?.tier||0);
      setDiag('selectedType',selectedTower?TOWERS[selectedTower.type].name:'');
      setDiag('selectedDisabled',(selectedTower?.disabled||0).toFixed(2));
       setDiag('selectedPath',selectedTower?.path||'');
       setDiag('targetPriority',selectedTower?.priority||'');
      setDiag('selectedSite',selectedTower?.site||'');
       setDiag('mode',endless?'endless':'mission');setDiag('veteran',veteran);
       setDiag('wave',wave);
       setDiag('core',core);
       setDiag('kills',kills);
       setDiag('alloy',credits);
       setDiag('planning',planning);
       setDiag('focusLane',focusRow+1);
       setDiag('overdrive',overdrive);
       setDiag('survived',Math.floor(survivalTime));
      setDiag('incoming',telegraphs.length);
      setDiag('incomingSappers',telegraphs.filter(e=>e.kind==='sapper').length);
      setDiag('sapperChannels',JSON.stringify(enemies.filter(e=>e.kind==='sapper'&&e.sapTarget).map(e=>({lane:e.row+1,progress:Number(e.sapCharge.toFixed(2)),target:TOWERS[e.sapTarget.type].name,stunned:e.stunned>0}))));
      setDiag('sapperInterrupts',sapperInterrupts);setDiag('wardBlocks',wardBlocks);setDiag('wardSnares',wardSnares);setDiag('bulwarkBreaks',bulwarkBreaks);
      setDiag('activeUses',activeUses);setDiag('selectedActiveCooldown',(selectedTower?.activeCd||0).toFixed(2));setDiag('shatters',shatters);setDiag('markCombos',markCombos);setDiag('refractions',refractions);setDiag('manualDetonations',manualDetonations);setDiag('sanctuaries',sanctuaries);setDiag('sanctuaryBlocks',sanctuaryBlocks);
      setDiag('laneRoutes',JSON.stringify(laneRoutes));setDiag('reroutes',reroutes);setDiag('siegeStage',veteran?siegeStage+1:1);setDiag('siegeStageCount',!endless&&veteran&&mission().stages?mission().stages.length:1);setDiag('stageClears',stageClears);setDiag('stageClock',stageClock.toFixed(2));
      setDiag('bossInterrupts',bossInterrupts);setDiag('bossRituals',bossRituals);setDiag('bossShifts',bossShifts);setDiag('bossPhaseChanges',bossPhaseChanges);
      setDiag('cantors',JSON.stringify(enemies.filter(e=>e.cantor).map(e=>({lane:e.row+1,x:Math.round(e.x),suppressed:e.slow>0||e.stunned>0,hasting:enemies.filter(a=>a!==e&&a.haste>1&&Math.hypot(a.x-e.x,a.y-e.y)<170).length}))));
      setDiag('cantorRepairAmount',cantorRepairAmount.toFixed(2));
      const boss=enemies.find(e=>e.veteranBoss);setDiag('bossState',boss?JSON.stringify({phase:boss.phase,hp:Math.ceil(boss.hp),lane:boss.row+1,ritual:Number(boss.ritualCharge.toFixed(2)),shift:Number(boss.shift.toFixed(2)),targetLane:boss.shiftTarget===null?null:boss.shiftTarget+1}):'');
      if(mobileMedia.matches){
        const objective=endless?`SIEGE ${wave} · ${enemies.length+telegraphs.length} THREATS`:`SIEGE ${wave}/${missions.length} · ${veteran&&mission().stages?`OFFICE ${siegeStage+1}/${mission().stages.length} · `:''}${mission().name}`;
        const resources=`CORE ${core}/8 · ALLOY ${credits} · ${planning?'PLANNING — choose an order below':endless?`${enemies.length+telegraphs.length} threats active`:`${mission().entries.length-entryIndex+enemies.length+telegraphs.length} threats left`}`;
        const tactical=`PULSE ${pulseCd>0?`${Math.ceil(pulseCd)}s`:'READY'}${veteran?` · V ${selectedTower?(selectedTower.activeCd>0?`${Math.ceil(selectedTower.activeCd)}s`:'READY'):'select tower'} · B lane ${(selectedTower?.row??keyboardCell.row)+1}`:''}${boss?` · WARDEN ${boss.ritualCharge>0?`RITUAL ${Math.max(0,(boss.phase===3?3.8:4.8)-boss.ritualCharge).toFixed(1)}s`:boss.shift>0?`SHIFT ${boss.shift.toFixed(1)}s`:`OFFICE ${boss.phase}`}`:''}`;
        for(const [key,value] of Object.entries({objective,resources,tactical})){const node=mobileHud.querySelector(`[data-bastion-mobile="${key}"]`);if(node.textContent!==value)node.textContent=value;}
      }
      setDiag('disabledTowers',JSON.stringify(towers.filter(q=>q.disabled>0).map(q=>({type:TOWERS[q.type].name,lane:q.row+1,remaining:Number(q.disabled.toFixed(2))}))));
      setDiag('shieldedTowers',JSON.stringify(towers.filter(q=>q.shielded>0).map(q=>({type:TOWERS[q.type].name,lane:q.row+1,remaining:Number(q.shielded.toFixed(2))}))));
      setDiag('wards',JSON.stringify(towers.filter(q=>q.type===4).map(q=>({lane:q.row+1,mode:q.wardMode||'shelter',radius:wardRadius(q),cooldown:Number((q.wardCool||0).toFixed(2)),disabled:q.disabled>0}))));
      setDiag('bulwarks',JSON.stringify(enemies.filter(e=>e.bulwark).map(e=>({lane:e.row+1,x:Math.round(e.x),barrier:Math.ceil(e.barrier),suppressed:e.slow>0||e.stunned>0}))));
      setDiag('phase',over|| (planning?'planning':'combat'));
      setDiag('waveCount',endless?'infinite':missions.length);
      setDiag('waveName',endless?'Endless siege':mission().name);
      setDiag('waveTime',waveTime.toFixed(2));
      setDiag('waveCleared',cleared);
      setDiag('scheduled',endless?'infinite':mission().entries.length-entryIndex);
      setDiag('enemies',enemies.length);
      setDiag('leaks',leaks);setDiag('lastReward',lastReward);setDiag('titanKilled',titanKilled);setDiag('speed',fast?2:1);
      setDiag('cleared',cleared);setDiag('fast',fast);
      setDiag('pulseCooldown',pulseCd.toFixed(2));
      setDiag('manifest',endless?'':JSON.stringify(mission().entries));
      setDiag('threats',JSON.stringify(enemies.map(e=>({kind:e.kind|| (e.boss?'titan':e.armored?'iron':'scout'),lane:e.row+1,x:Math.round(e.x),hp:Math.ceil(e.hp),slow:e.slow>0,exposed:(e.exposed||0)>0,marked:(e.marked||0)>0,haste:Number((e.haste||1).toFixed(2)),barrier:e.bulwark?Math.ceil(e.barrier):0}))));
      const p=previewTower();
      setDiag('previewRange',p?String(p.type===3?mineRadius(p):p.type===4?wardRadius(p):TOWERS[p.type].range*(p.site==='lens'?1.25:1)):'');
    }
    function draw(ctx,dt,time){
      if(planning)updateOrders();
      updateControls();
      if(time-diagAt>.12){diagAt=time;writeDiagnostics();}
      ctx.fillStyle='#070914';ctx.fillRect(0,0,W,H);
      const cloud=ctx.createRadialGradient(680,260,20,680,260,500);
      cloud.addColorStop(0,'#632c3b38');cloud.addColorStop(.55,'#20233b22');cloud.addColorStop(1,'#07091400');ctx.fillStyle=cloud;ctx.fillRect(0,0,W,H);if(!reduced())stars();
      // Ivory-etched pointed tracery keeps the board a midnight cathedral,
      // while the playable lane silhouettes remain quieter than telegraphs.
      ctx.save();ctx.strokeStyle='#d8c99b18';ctx.lineWidth=1;for(let x=132;x<850;x+=92){ctx.beginPath();ctx.moveTo(x-38,450);ctx.lineTo(x-38,150);ctx.quadraticCurveTo(x,102,x+38,150);ctx.lineTo(x+38,450);ctx.stroke();}ctx.restore();
      ctx.strokeStyle='#d4bc9450';ctx.lineWidth=1;ctx.strokeRect(79,117,770,337);
      for(let row=0;row<N;row++){
        const y=rowY(row);
        ctx.fillStyle=row%2?'#90b8c408':'#aeb7d007';ctx.fillRect(90,y-32,750,64);
        if(!endless){
          txt(ctx,String(row+1),106,y+5,14,GOLD);
          if(row===1||row===3){ctx.fillStyle=row===1?'#9ce5ef20':'#f5ba7720';ctx.fillRect(430,y-29,180,58);txt(ctx,row===1?'DRIFT −25%':'CURRENT +25%',520,y+28,9,row===1?'#b7e9ed':'#f5ba77','center');}
          if(planning){const count=mission().entries.filter(e=>e.row===row).length;if(count)txt(ctx,`${count} INBOUND`,808,y-17,10,GOLD,'right');}
        }
        ctx.strokeStyle='#afc0c627';ctx.beginPath();ctx.moveTo(90,y+34);ctx.lineTo(850,y+34);ctx.stroke();
        for(let col=0;col<C;col++){
          const x=colX(col);ctx.strokeStyle='#d6bd8855';ctx.lineWidth=.9;
          ctx.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;const xx=x+29*Math.cos(a), yy=y+29*Math.sin(a);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.stroke();
           ctx.fillStyle='#83b7c91c';circ(ctx,x,y,2);ctx.fill();
         }
       }
       if(veteran&&!endless)for(let row=0;row<N;row++){
         const y=rowY(row)+26,route=laneRoutes[row];ctx.save();ctx.translate(520,y);ctx.fillStyle='#160f1c';ctx.strokeStyle=route?GOLD:'#8f7c5988';ctx.lineWidth=route?2:1;circ(ctx,0,0,11);ctx.fill();ctx.stroke();
         ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);if(route){ctx.moveTo(0,0);ctx.lineTo(0,route*13);ctx.lineTo(-4,route*9);ctx.moveTo(0,route*13);ctx.lineTo(4,route*9);}ctx.stroke();ctx.restore();
       }
       if(endless){ctx.save();ctx.strokeStyle=planning?'#f2d39dcc':'#f2d39d66';ctx.lineWidth=planning?2:1;
         ctx.setLineDash([8,6]);ctx.strokeRect(98,rowY(focusRow)-31,740,62);ctx.setLineDash([]);
         txt(ctx,`LANE ${focusRow+1}`,103,rowY(focusRow)-17,10,GOLD);ctx.restore();}
       for(const site of SITES){const x=colX(site.col),y=rowY(site.row);ctx.save();ctx.translate(x,y);ctx.rotate(reduced()?0:time*.18);ctx.strokeStyle=site.color;ctx.shadowColor=site.color;ctx.shadowBlur=10;ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<4;i++){const a=Math.PI/4+i*TAU/4;const xx=Math.cos(a)*23,yy=Math.sin(a)*23;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=site.color;circ(ctx,0,0,3);ctx.fill();ctx.restore();}
      const preview=previewTower();
      if(preview){
        const d=TOWERS[preview.type],radius=preview.type===3?mineRadius(preview):preview.type===4?wardRadius(preview):d.range*(preview.site==='lens'?1.25:1);
        ctx.save();ctx.globalAlpha=preview.preview?.18:.26;ctx.strokeStyle=d.color;ctx.fillStyle=d.color;ctx.lineWidth=1.4;ctx.setLineDash([5,5]);
        if(preview.type===2){ctx.fillRect(preview.x,preview.y-25,Math.min(radius,W-preview.x),50);ctx.strokeRect(preview.x,preview.y-25,Math.min(radius,W-preview.x),50);}
        else {circ(ctx,preview.x,preview.y,radius);ctx.fill();ctx.stroke();if(preview.type===1){circ(ctx,preview.x,preview.y-68,radius);ctx.stroke();circ(ctx,preview.x,preview.y+68,radius);ctx.stroke();}}
        ctx.setLineDash([]);ctx.globalAlpha=1;
        if(preview.preview){ctx.translate(preview.x,preview.y);ctx.strokeStyle=hover.occupied?'#ff9c9e':d.color;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;const x=Math.cos(a)*20,y=Math.sin(a)*20;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();}
        ctx.restore();
      }
      ctx.save();if(shake>0&&!reduced()){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.9;}
      if(hover){ctx.strokeStyle=TEAL;ctx.lineWidth=2;ctx.strokeRect(colX(hover.col)-31,rowY(hover.row)-30,62,60);}
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
         if(q.type===3){ctx.strokeStyle=d.color;ctx.lineWidth=3;circ(ctx,0,0,13+(reduced()?0:Math.sin(t*5)*2));ctx.stroke();ctx.fillStyle=d.color;circ(ctx,0,0,4);ctx.fill();}
         if(q.type===4){ctx.strokeStyle=q.wardCool>0?'#527b78':d.color;ctx.lineWidth=2;circ(ctx,0,0,15);ctx.stroke();ctx.rotate(Math.PI/4);ctx.strokeRect(-9,-9,18,18);ctx.fillStyle=d.color;ctx.fillRect(-3,-3,6,6);}
         ctx.restore();
         if(q.disabled>0){ctx.fillStyle='#091720cc';circ(ctx,q.x,q.y,21);ctx.fill();ctx.strokeStyle=RED;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q.x-9,q.y-9);ctx.lineTo(q.x+9,q.y+9);ctx.moveTo(q.x+9,q.y-9);ctx.lineTo(q.x-9,q.y+9);ctx.stroke();txt(ctx,`OFF ${Math.ceil(q.disabled)}s`,q.x,q.y-39,9,RED,'center');}
         if(q.type===4)txt(ctx,`${q.wardMode==='snare'?'SNARE':'WARD'} ${q.wardCool>0?`${Math.ceil(q.wardCool)}s`:'READY'}`,q.x,q.y+47,9,q.wardCool>0?'#8aa8a2':TEAL,'center');
         if(q===selectedTower){ctx.strokeStyle='#fff1bb';ctx.lineWidth=2;circ(ctx,q.x,q.y,27);ctx.stroke();}
         if(q.shielded>0){ctx.strokeStyle='#eee3c2';ctx.setLineDash([3,3]);circ(ctx,q.x,q.y,31);ctx.stroke();ctx.setLineDash([]);txt(ctx,`SANCTUARY ${Math.ceil(q.shielded)}s`,q.x,q.y-48,8,'#eee3c2','center');}
         if(veteran&&q===selectedTower&&q.activeCd>0)txt(ctx,`V ${Math.ceil(q.activeCd)}s`,q.x,q.y+57,9,GOLD,'center');
           if(q.tier){txt(ctx,`${q.path==='left'?'Q':'E'}${q.tier}`,q.x,q.y+36,10,d.color,'center');}
           if(q.priority==='heavy')txt(ctx,'HEAVY',q.x,q.y+46,9,GOLD,'center');
          if(q.site)txt(ctx,'✦',q.x,q.y-34,10,SITES.find(site=>site.id===q.site).color,'center');
      }
      for(const source of enemies)if(source.cantor&&source.slow<=0&&source.stunned<=0){
        ctx.save();ctx.strokeStyle='#d6a05f66';ctx.setLineDash([2,5]);for(const target of enemies)if(target!==source&&target.haste>1&&Math.hypot(target.x-source.x,target.y-source.y)<170){ctx.beginPath();ctx.moveTo(source.x,source.y);ctx.lineTo(target.x,target.y);ctx.stroke();}ctx.setLineDash([]);ctx.restore();
      }
      // Projected links disclose exactly which hulls a Bulwark is protecting.
      for(const source of enemies)if(source.bulwark&&source.barrier>0&&source.slow<=0&&source.stunned<=0){
        ctx.save();ctx.strokeStyle='#a6f3dd55';ctx.lineWidth=1.5;ctx.setLineDash([4,5]);
        for(const target of enemies)if(target!==source&&barrierSource(target)===source){ctx.beginPath();ctx.moveTo(source.x,source.y);ctx.lineTo(target.x,target.y);ctx.stroke();circ(ctx,target.x,target.y,20);ctx.stroke();}
        ctx.setLineDash([]);ctx.restore();
      }
      // Enemy hulls, shield strength, velocity trail.
      for(const e of enemies){
        const color=e.boss?'#eee3c2':e.cantor?'#d6a05f':e.support?'#f5ba77':e.bulwark?'#a6f3dd':e.armored?'#efb6e9':'#d98282';
        ctx.strokeStyle=color+'66';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x+25,e.y);ctx.lineTo(e.x+40,e.y);ctx.stroke();
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.PI);ctx.fillStyle=e.hit>0?'#fff':color;ctx.strokeStyle='#4a1c3f';ctx.lineWidth=2;
        const r=e.boss?26:e.armored?18:e.support?16:13;
        if(e.support){ctx.rotate(Math.PI/4);ctx.fillRect(-r*.75,-r*.75,r*1.5,r*1.5);ctx.strokeRect(-r*.75,-r*.75,r*1.5,r*1.5);ctx.rotate(-Math.PI/4);ctx.beginPath();ctx.moveTo(-r-7,-9);ctx.lineTo(-r+2,0);ctx.lineTo(-r-7,9);ctx.stroke();}
        else{ctx.beginPath();ctx.moveTo(r+5,0);ctx.lineTo(-r,-r*.86);ctx.lineTo(-r*.4,0);ctx.lineTo(-r,r*.86);ctx.closePath();ctx.fill();ctx.stroke();}
        ctx.fillStyle='#191c2c';circ(ctx,0,0,r*.36);ctx.fill();
        if(e.armored||e.boss){ctx.strokeStyle='#f7d59d';ctx.lineWidth=2;circ(ctx,0,0,r+4);ctx.stroke();}
        if(e.bulwark){ctx.strokeStyle=e.barrier>0?color:'#527b78';ctx.lineWidth=3;ctx.setLineDash(e.slow>0||e.stunned>0?[3,4]:[]);ctx.beginPath();ctx.arc(0,0,25,-2.35,-.8);ctx.stroke();ctx.beginPath();ctx.arc(0,0,25,.8,2.35);ctx.stroke();ctx.setLineDash([]);}
        if(e.support){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r+6,-.8,.8);ctx.stroke();}
        if(e.slow>0){ctx.strokeStyle='#91e5ec';ctx.lineWidth=3;circ(ctx,0,0,r+8);ctx.stroke();}
        if(e.stunned>0){ctx.strokeStyle=TEAL;ctx.setLineDash([3,4]);circ(ctx,0,0,r+11);ctx.stroke();ctx.setLineDash([]);}
        ctx.restore();
        ctx.fillStyle='#060d19';ctx.fillRect(e.x-22,e.y-26,44,4);ctx.fillStyle=color;ctx.fillRect(e.x-22,e.y-26,44*Math.max(0,e.hp/e.maxHp),4);
        if(!endless)txt(ctx,e.boss?(e.veteranBoss?`WARDEN · OFFICE ${e.phase}`:'TITAN'):e.cantor?(e.slow>0||e.stunned>0?'CANTOR SILENCED':'CANTOR · HASTE'):e.support?(e.stunned>0?'FUSE BROKEN':'SAPPER'):e.bulwark?(e.barrier>0?`BULWARK ${Math.ceil(e.barrier)}`:'FIELD BROKEN'):e.armored?(e.slow>0?'EXPOSED':'IRON'):e.kind==='runner'?'FAST':'',e.x,e.y-32,9,color,'center');
        if(e.veteranBoss&&e.shift>0){const targetY=rowY(e.shiftTarget);ctx.save();ctx.strokeStyle='#eee3c2';ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x,targetY);ctx.stroke();ctx.setLineDash([]);txt(ctx,`PROCESSION ${e.shift.toFixed(1)}s · V / SPACE BREAKS`,e.x,(e.y+targetY)/2-9,10,'#eee3c2','center');ctx.restore();}
        if(e.veteranBoss&&e.ritualCharge>0){const duration=e.phase===3?3.8:4.8,left=Math.max(0,duration-e.ritualCharge);ctx.save();ctx.strokeStyle='#c65f6d';ctx.fillStyle='#5a1f2c55';ctx.lineWidth=4;circ(ctx,e.x,e.y,42);ctx.fill();ctx.beginPath();ctx.arc(e.x,e.y,42,-Math.PI/2,-Math.PI/2+TAU*clamp(e.ritualCharge/duration,0,1));ctx.stroke();txt(ctx,`CORE RITUAL ${left.toFixed(1)}s · V / SPACE`,e.x,e.y+52,11,'#ffd9cf','center');ctx.restore();}
        if(e.snaredBy&&towers.includes(e.snaredBy)){const ward=e.snaredBy;ctx.save();ctx.strokeStyle=TEAL;ctx.lineWidth=2;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(ward.x,ward.y);ctx.stroke();ctx.setLineDash([]);txt(ctx,`SNARE ${Math.max(0,1.4-e.wardSnare).toFixed(1)}s`,(e.x+ward.x)/2,e.y+22,10,TEAL,'center');ctx.restore();}
        if(e.sapTarget&&towers.includes(e.sapTarget)){
          const target=e.sapTarget,remaining=Math.max(0,3.4-e.sapCharge);ctx.save();ctx.strokeStyle='#ffd18d';ctx.fillStyle='#ffd18d';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.setLineDash([]);circ(ctx,target.x,target.y,29);ctx.stroke();ctx.beginPath();ctx.arc(target.x,target.y,34,-Math.PI/2,-Math.PI/2+TAU*clamp(e.sapCharge/3.4,0,1));ctx.stroke();txt(ctx,`SABOTAGE ${remaining.toFixed(1)}s`,(e.x+target.x)/2,e.y-17,11,'#ffd18d','center');ctx.restore();
        }
       }
       // Every threat arrives through a lit gate before it enters the board.
       for(const incoming of telegraphs){const y=rowY(incoming.row),color=incoming.boss?'#ffe3a5':incoming.support?'#f5ba77':incoming.bulwark?'#a6f3dd':incoming.armored?'#efb6e9':'#f3a58f',pulse=reduced()?.65:.45+Math.sin((1-incoming.wait)*12)*.25;
         ctx.save();ctx.globalAlpha=Math.max(.18,pulse);ctx.strokeStyle=color;ctx.fillStyle=color+'22';ctx.lineWidth=2;ctx.fillRect(842,y-28,38,56);ctx.strokeRect(842,y-28,38,56);ctx.beginPath();ctx.moveTo(842,y);ctx.lineTo(760,y);ctx.stroke();if(incoming.support)txt(ctx,incoming.cantor?'CANTOR · HASTE / FIELD REPAIR':'SAPPER · 3.4s CHANNEL',752,y-34,10,color,'right');if(incoming.bulwark)txt(ctx,'BULWARK · NEEDLE FIELD',752,y-34,10,color,'right');ctx.restore();
       }
      for(const b of bolts){
        ctx.strokeStyle=b.color;ctx.lineWidth=b.beam?5:3;ctx.shadowColor=b.color;ctx.shadowBlur=9;
        ctx.beginPath();if(b.beam){ctx.moveTo(b.x,b.y);ctx.lineTo(b.toX,b.toY);}else{ctx.moveTo(b.x-8,b.y);ctx.lineTo(b.x+5,b.y);}ctx.stroke();ctx.shadowBlur=0;
      }
      ctx.restore();
      // Manufactured UI: crisp numeric state, large distinct actions.
      ctx.fillStyle='#06111ceb';ctx.fillRect(0,0,W,97);ctx.strokeStyle='#ceb88066';ctx.beginPath();ctx.moveTo(0,97);ctx.lineTo(W,97);ctx.stroke();
      txt(ctx,'AETHER BASTION',27,28,21,GOLD);
        txt(ctx,endless?`SIEGE ${wave} · ENDLESS`:`SIEGE ${wave} / ${missions.length} · ${planning?'PLAN':'DEFEND'}`,28,53,12,'#bce9db');
      txt(ctx,`ALLOY ✦ ${credits}`,240,29,17,'#f6da9e');txt(ctx,`KILLS  ${kills}`,240,52,12,'#b9c4c2');
       txt(ctx,`CORE ${core} / 8`,425,28,17,core<=2?RED:TEAL);
         txt(ctx,endless?`SURVIVED ${Math.floor(survivalTime)}s${overdrive?' · OVERDRIVE':''}`:`${fast?'2× · ':''}${overdrive?'OVERDRIVE · ':''}${planning?'BUILD & CHOOSE ORDER':`${mission().entries.length-entryIndex+enemies.length+telegraphs.length} THREATS LEFT`}`,425,51,12,'#b9c4c2');
       if(endless&&planning)txt(ctx,`NEXT SIEGE ${wave+1} · LANE ${focusRow+1}${(wave+1)%4===0?' · TITAN':''} · ORDER BELOW`,28,81,13,GOLD);
       if(!endless)txt(ctx,`${mission().name.toUpperCase()} · ${veteran&&mission().stages?`OFFICE ${siegeStage+1}/${mission().stages.length} · ${mission().goal.toUpperCase()}`:mission().goal.startsWith('destroy')?'DESTROY THE TITAN':`NO LEAKS: +35 ALLOY${leaks?' · BONUS LOST':''}`} · ${planning?'ORDER BELOW TO LAUNCH':'CLEAR EVERY THREAT'}`,28,81,11,GOLD);
      ctx.fillStyle=pulseCd>0?'#24313a':'#29584e';ctx.strokeStyle='#a8e6d355';ctx.fillRect(722,15,164,62);ctx.strokeRect(722,15,164,62);
      txt(ctx,pulseCd>0?`PULSE ${Math.ceil(pulseCd)}s`:'PULSE READY · SPACE',804,42,12,TEAL,'center');
      txt(ctx,'STUN + SHOCK',804,60,10,'#d4dfda','center');
      ctx.fillStyle='#08141f';ctx.fillRect(0,469,W,91);ctx.strokeStyle='#c7b88e55';ctx.beginPath();ctx.moveTo(0,469);ctx.lineTo(W,469);ctx.stroke();
       for(let i=0;i<TOWERS.length;i++){
        const d=TOWERS[i],wide=TOWERS.length>4,x=wide?30+i*170:69+i*192,width=wide?160:181;
        ctx.fillStyle=selected===i?'#283f46':'#16252d';ctx.strokeStyle=selected===i?'#e6c486':'#80999555';ctx.lineWidth=selected===i?2:1;
        ctx.fillRect(x,486,width,59);ctx.strokeRect(x,486,width,59);
        txt(ctx,`${i+1} ${d.icon} ${d.name}`,x+8,509,wide?12:13,d.color);
        txt(ctx,`${d.cost} ✦ · ${d.detail}`,x+8,532,wide?9:10,credits<d.cost?'#9c7773':'#c2cbbd');
      }
        if(messages.length)txt(ctx,messages[0].text,450,110,11,'#ffe5a2','center');
        if(endless&&!planning)txt(ctx,`FORECAST · LANE ${focusRow+1} FAVOURED`,450,462,11,'#d7cf9f','center');
       if(over){ctx.fillStyle='#07131fdc';ctx.fillRect(0,93,W,378);
        txt(ctx,over==='won'?'THE BASTION ENDURES':'THE CORE GOES DARK',450,248,32,over==='won'?TEAL:RED,'center');
        txt(ctx,`${kills} intercepted · ${score().toLocaleString()} points`,450,289,16,GOLD,'center');}
      if(flash>0){ctx.fillStyle=`rgba(240,102,112,${reduced()?flash*.22:flash})`;ctx.fillRect(0,96,W,370);flash=Math.max(0,flash-(reduced()?.07:.02));}
    }
    return g;
  }

  AT.register({id:'bastion',name:'Aether Bastion',place:'The forgotten citadel',brief:'Plan six authored sieges. Read the lane manifest, invest in complementary towers, repair or overdrive, and destroy the Crown Engine before it reaches the core. Veteran Sky adds three-office sieges, active tower liturgies, processional lane switches, Cantor combined arms and the interruptible Gilded Warden.',create:bastion});
})();

(() => {
  const AT=window.AetherTrials;
  if(!AT)return;
  const {frame,clamp,TAU,reduced}=AT;
  const rng=seed=>()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
  const W=900,H=560,COLS=18,ROWS=11,S=38,X=108,Y=79;
  const GOLD='#e8cb91',MINT='#9cf1de',PINK='#f1a1b1';
  const circ=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,TAU);};
  const drawText=(c,s,x,y,size=12,color=GOLD,align='left')=>{c.fillStyle=color;c.textAlign=align;c.font=`600 ${size}px "DM Sans",sans-serif`;c.fillText(s,x,y);};
  const tile=(x,y)=>({x:X+(x+.5)*S,y:Y+(y+.5)*S});
  const toCell=(x,y)=>({x:Math.floor((x-X)/S),y:Math.floor((y-Y)/S)});
  const layouts=[
    {bars:[[5,1,9,[4,5]],[11,1,9,[7]],[14,2,6,[4]]],keys:[[3,2],[10,7]],bonus:[[8,2],[15,8]],patrol:[[3,4,1,8,'v'],[8,5,2,9,'v'],[15,7,12,16,'h']]},
    {bars:[[4,2,9,[7]],[9,1,8,[3,4]],[13,2,9,[6]]],keys:[[7,3],[15,6]],bonus:[[2,8],[11,3]],patrol:[[2,5,1,9,'v'],[7,6,5,8,'v'],[15,8,14,16,'h']]},
    {bars:[[6,1,9,[2,3]],[12,1,9,[7,8]],[15,2,7,[4,5]]],keys:[[3,7],[14,4]],bonus:[[8,3],[16,8]],patrol:[[4,4,2,8,'v'],[9,6,2,9,'v'],[16,7,14,16,'h'],[14,3,2,8,'v']]},
    {bars:[[5,1,9,[2,8]],[10,1,9,[3,7]],[14,1,9,[4,6]]],keys:[[3,2],[8,7],[12,3]],requiredKeys:2,bonus:[[12,5]],routes:[['SERVICE ROUTE',3,2,'#b6d8c9'],['CRYPT PASSAGE',8,7,'#d8c795'],['WATCHER GALLERY',12,3,'#f1a1b1']],patrol:[[3,5,1,8,'v'],[8,5,2,8,'v'],[12,6,2,8,'v'],[16,7,14,16,'h']]},
  ];
  const VETERAN_LAYOUTS=[
    {name:'THE SALT CRYPT',title:'CHAMBER V · THE SALT CRYPT',bars:[[4,1,9,[3,7]],[9,1,9,[2,5,8]],[14,1,9,[4,6]]],keys:[[2,2],[15,8]],requiredKeys:2,requiredRelays:1,bonus:[[7,6]],patrol:[[3,3,1,8,'v'],[8,6,2,9,'v'],[15,4,15,16,'h'],[11,4,7,9,'v']],scanners:[[6,5,0,0],[12,3,1.57,2.1]],doors:[[4,7,'west'],[9,2,'middle']],switches:[[3,7,'west'],[8,2,'middle']],relays:[[13,8,'salt']],routes:[['OPEN CLOISTER',4,3,'#b6d8c9'],['BRASS SWITCH',3,7,'#d8c795'],['LOWER RELAY',13,8,'#eee3c2']]},
    {name:'THE MERIDIAN VAULT',title:'CHAMBER VI · THE MERIDIAN VAULT',bars:[[3,1,9,[4]],[7,1,9,[2,6]],[11,1,9,[3,7]],[15,1,9,[5]]],keys:[[5,3],[13,7],[8,5]],requiredKeys:3,requiredRelays:2,bonus:[[10,2]],patrol:[[4,7,6,8,'v'],[8,8,6,9,'v'],[13,2,12,14,'h'],[16,6,3,8,'v'],[10,8,7,9,'v']],scanners:[[5,5,0,.7],[9,4,1.57,2.8],[13,4,-1.57,1.4]],doors:[[3,4,'narthex'],[7,6,'choir'],[11,7,'archive']],switches:[[2,4,'narthex'],[6,6,'choir'],[8,6,'choir'],[10,7,'archive']],relays:[[6,8,'lower'],[16,1,'upper']],heart:[16,2],warden:[13,5],routes:[['NARTHEX SWITCH',2,4,'#d8c795'],['HIGH CHOIR',7,2,'#b6d8c9'],['ARCHIVE SWITCH',10,7,'#eee3c2']]},
  ];
  const RELICS=[
    {id:'veil',name:'Mothglass Mantle',detail:'Veil lasts +1.8s and recharges 3s sooner. Decoy recharge takes +4s.'},
    {id:'chime',name:'Chorus Prism',detail:'Decoys last +3s, lure farther, and recharge 3s sooner. Veil loses its stun pulse.'},
    {id:'runner',name:'Barefoot Compass',detail:'Move 18% faster, including while veiled. Visible alarms fill 25% faster.'},
    {id:'gambit',name:'Thief’s Covenant',detail:'Keys pay +150; a clean seal escape repairs one heart. Veil recharges 4s slower.'},
    {id:'mercy',name:'Mercy Lens',detail:'Each key clears alarms and grants 1.5s grace. Key score is reduced by 100.'},
    {id:'siphon',name:'Prism Siphon',detail:'Fragments reset both gadgets and give 1s veil. Decoys last 1.4s less.'},
  ];
  const encounters=[
    {name:'IVORY WATCH',hint:'Balanced sentries · use walls to break sight',reach:175,alarm:1.45,speed:1,lure:260},
    {name:'LANTERN VAULT',hint:'Long cones · slower alarms and patrols',reach:210,alarm:1.15,speed:.88,lure:260},
    {name:'HUSHED GALLERY',hint:'Short cones · quick patrols',reach:145,alarm:1.45,speed:1.12,lure:260},
    {name:'ECHO ARCHIVE',hint:'Decoy chimes carry farther',reach:175,alarm:1.45,speed:1,lure:340},
  ];
  function reachable(walls){
    const seen=new Set(['1,5']),queue=[[1,5]];
    for(let i=0;i<queue.length;i++){
      const [x,y]=queue[i];
      for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
        const key=`${nx},${ny}`;
        if(nx<0||ny<0||nx>=COLS||ny>=ROWS||walls[ny][nx]||seen.has(key))continue;
        seen.add(key);queue.push([nx,ny]);
      }
    }
    return seen;
  }
  // Independent room RNG: drafting/cosmetics never consume the layout stream.
  function course(seed,chamber=0,cycles=0,authored=false,extraLayouts=[]){
    const deck=[...layouts,...extraLayouts];
    chamber=clamp(Math.floor(chamber)||0,0,deck.length-1);cycles=Math.max(0,Math.floor(cycles)||0);
    const pick=rng(((seed>>>0)^Math.imul(chamber+1,2654435761)^Math.imul(cycles+1,1597334677))>>>0);
    const integer=(a,b)=>a+Math.floor(pick()*(b-a+1));
    const source=deck[chamber],walls=Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},(_,x)=>x===0||x===17||y===0||y===10));
    walls[5][17]=false;
    let bars=source.bars;
    if(!authored)bars=[integer(4,5),integer(9,10),integer(13,14)].map(col=>{
      const upper=integer(2,4),lower=integer(6,8);
      return [col,1,9,[upper,lower,...(pick()<.5?[upper+1]:[lower+1])]];
    });
    for(const [col,start,end,gaps] of bars)for(let y=start;y<=end;y++)if(!gaps.includes(y))walls[y][col]=true;
    if(!authored){
      // Small alcoves change horizontal routing too. Reject every placement
      // that disconnects even one floor tile; the 38px lanes fit a 9px body.
      for(let n=0;n<8;n++){
        const x=integer(3,15),y=integer(1,9);
        if(walls[y][x])continue;
        walls[y][x]=true;
        if(reachable(walls).size!==walls.flat().filter(v=>!v).length)walls[y][x]=false;
      }
    }
    const used=new Set(['1,5','16,5','17,5']);
    const choose=(lo,hi)=>{
      const cells=[];
      for(let y=1;y<10;y++)for(let x=lo;x<=hi;x++)if(!walls[y][x]&&!used.has(`${x},${y}`))cells.push([x,y]);
      const cell=cells[integer(0,cells.length-1)];used.add(cell.join(','));return cell;
    };
    const keys=authored?source.keys.map(p=>p.slice()):[choose(2,7),choose(10,15),...(chamber===3?[choose(7,12)]:[])];
    keys.forEach(p=>used.add(p.join(',')));
    const seal=authored?([[8,6],[7,7],[9,6],[12,6]][chamber]||choose(6,15)):choose(6,15);
    used.add(seal.join(','));
    const bonus=authored?source.bonus.map(p=>p.slice()):[choose(2,8),choose(9,16)];
    let patrol=source.patrol.map(p=>p.slice());
    if(!authored){
      const lanes=[];
      for(const axis of ['v','h'])for(let fixed=axis==='v'?3:1;fixed<(axis==='v'?17:10);fixed++){
        let start=1;
        const limit=axis==='v'?10:17;
        for(let at=1;at<=limit;at++)if(at===limit||walls[axis==='v'?at:fixed]?.[axis==='v'?fixed:at]){
          if(at-start>=4){
            const pos=integer(start,at-1),x=axis==='v'?fixed:pos,y=axis==='v'?pos:fixed;
            if(Math.hypot(x-1,y-5)>3.5)lanes.push([x,y,start,at-1,axis]);
          }
          start=at+1;
        }
      }
      // Seeded shuffle, then use distinct corridors and spaced starting posts.
      for(let i=lanes.length-1;i>0;i--){const j=integer(0,i);[lanes[i],lanes[j]]=[lanes[j],lanes[i]];}
      patrol=[];
      for(const lane of lanes){
        if(patrol.every(p=>Math.hypot(p[0]-lane[0],p[1]-lane[1])>=3))patrol.push(lane);
        if(patrol.length>=Math.min(6,3+Math.floor(chamber/2)+Math.floor(cycles/2)))break;
      }
    }
    return {walls,keys,bonus,seal,patrol,scanners:authored?(source.scanners||[]).map(p=>p.slice()):[],doors:authored?(source.doors||[]).map(p=>p.slice()):[],switches:authored?(source.switches||[]).map(p=>p.slice()):[],relays:authored?(source.relays||[]).map(p=>p.slice()):[],heart:authored&&source.heart?source.heart.slice():null,warden:authored&&source.warden?source.warden.slice():null,requiredKeys:source.requiredKeys||2,requiredRelays:authored?(source.requiredRelays||0):0,routes:authored?source.routes||[]:[],encounter:authored?0:integer(0,3),authored};
  }
  // Read-only-by-copy diagnostics; no progression store or gameplay shortcuts.
  AT.labyrinthCourse=course;
  function labyrinth(container,options={}){
    const verbs=options.verbs||new Set();
    const endless=options.endless===true,veteran=options.veteran===true;
    const g=frame(container,W,H,{
       label:`Glass Labyrinth: a ${endless?'looping':veteran?'six-chamber':'four-chamber'} stealth roguelite. Pilot toward the mouse or use WASD, collect the required starkeys in each chamber, then reach the illuminated exit. An optional archive seal pays 300 points, plus 300 for escaping unharmed. It also absorbs one alarm, but using its ward forfeits the clean bonus. The final${veteran?' standard':''} chamber offers three routes but needs only two keys. Space or right click to cloak. Press F to throw a prism decoy in your travel direction and lure sentries away; optional cyan fragments recharge it. Avoid their light cones.${veteran?' Veteran watchers investigate decoys around walls, chase sightings and share alerts. Decoys catch scanner gaze; G jams scanners for 3.6 seconds but nearby watchers investigate the noise. Hold Shift to soft-step; remaining still conceals you beyond 42px until you move. H mothsteps with a loud landing, and E operates nearby brass switches, relays and the vault heart. Doors alter real paths. After the starkeys, silence every relay; in Meridian, steal the heart while its three-phase Warden telegraphs judgment.':''} Between chambers, draft one relic with keys 1 to 3; every relic trades a strength for a cost.${endless?' The first circuit is authored; later circuits are seeded fresh and the Watchers quicken.':' Later chambers are seeded fresh. Escape with the Observatory archive.'} Press P to pause.`,
      sound:options.sound,step,draw});
    const {ctx,canvas,listen,tone,burst,starfield}=g,stars=starfield(981,90);
    canvas.style.touchAction='none';canvas.focus({preventScroll:true});
    const mobileHud=document.createElement('div');mobileHud.className='labyrinth-mobile-hud';mobileHud.dataset.mobileHud='labyrinth';mobileHud.setAttribute('role','group');mobileHud.setAttribute('aria-label','Labyrinth infiltration status');
    mobileHud.style.cssText='display:none;box-sizing:border-box;width:100%;margin:0 0 8px;padding:10px 12px;gap:4px;background:#090b17;border:1px solid #a99568;border-radius:4px;color:#eee3c2;font:600 14px/1.45 "DM Sans",sans-serif;letter-spacing:.01em';
    mobileHud.innerHTML='<span data-labyrinth-mobile="objective"></span><span data-labyrinth-mobile="resources"></span><span data-labyrinth-mobile="alerts"></span><span data-labyrinth-mobile="action"></span>';
    const mobileMedia=matchMedia('(max-width:600px)'),syncMobileHud=()=>{mobileHud.style.display=mobileMedia.matches?'grid':'none';mobileHud.dataset.active=String(mobileMedia.matches);};syncMobileHud();listen(mobileMedia,'change',syncMobileHud);container.insertBefore(mobileHud,canvas);
    const abilityBar=document.createElement('div');abilityBar.className='labyrinth-abilities';
    abilityBar.innerHTML='<button type="button" data-labyrinth-action="veil">Activate veil · Space</button><button type="button" data-labyrinth-action="decoy">Throw prism decoy · F</button>'+(veteran?'<button type="button" data-labyrinth-action="jammer">Jam scanners · G · makes noise</button><button type="button" data-labyrinth-action="crouch" aria-pressed="false">Soft-step · hold Shift</button><button type="button" data-labyrinth-action="dash">Mothstep · H · loud</button><button type="button" data-labyrinth-action="interact">Interact · E</button>':'');
    container.append(abilityBar);
    const draftBar=document.createElement('div');draftBar.className='labyrinth-draft';draftBar.hidden=true;
    draftBar.setAttribute('role','group');draftBar.setAttribute('aria-label','Relic draft between chambers');
    draftBar.dataset.state='closed';
    container.append(draftBar);
    const destroyFrame=g.destroy;
    g.destroy=()=>{mobileHud.remove();abilityBar.remove();draftBar.remove();destroyFrame();};
    const veilButton=abilityBar.querySelector('[data-labyrinth-action="veil"]');
    const decoyButton=abilityBar.querySelector('[data-labyrinth-action="decoy"]');
    const jammerButton=abilityBar.querySelector('[data-labyrinth-action="jammer"]');
    const crouchButton=abilityBar.querySelector('[data-labyrinth-action="crouch"]'),dashButton=abilityBar.querySelector('[data-labyrinth-action="dash"]'),interactButton=abilityBar.querySelector('[data-labyrinth-action="interact"]');
    const keys=new Set();let cursor=null, pointerActive=false;
    let chamber=0,cycles=0,hearts=3,found=0,score=0,flash=0,ended=false,win=false,clock=0;
    let cloak=0,cloakCd=0,decoy=null,decoyCd=0,lastDirection={x:1,y:0},entrance=2,roomTransition=0,message={text:'COLLECT BOTH STARKEYS · AVOID THE WATCHERS',t:8};
    let player={...tile(1,5),vx:0,vy:0};
    let walls=[],guards=[],scanners=[],collectibles=[],bonus=[],seal=null,cleanEscape=true,sealWard=false,scannerJam=0,scannerCd=0;
    let doors=[],switches=[],relays=[],heart=null,warden=null,requiredRelays=0,relaysDone=0,heartTaken=false;
    let crouchLatch=false,dashCd=0,dashes=0,noiseEvents=[],noiseClock=0,noisesMade=0,networkAlert=0,alarmLevel=0,coordinations=0,interaction=null,interactions=0,judgmentsCalled=0,judgmentsEvaded=0,wardenInterrupts=0;
    // Roguelite run state: drafted relics, the live draft offer, and the
    // current room's encounter profile/routes exactly as course() produced.
    let relics=[],draft=null,encounter=encounters[0],roomInfo=null,roomTitle='',requiredKeys=2,routes=[];
    const runSeed=Number.isInteger(options.seed)?options.seed:981;
    const has=id=>relics.includes(id);
    const CHAMBER_NAMES=['THE IVORY ARCHIVE','THE HALL OF ECHOES','THE LAST OBSERVATORY','THE TRIUNE ARCHIVE'];
    const CHAMBER_TITLES=['CHAMBER I · THE IVORY ARCHIVE','CHAMBER II · ECHO HALL','CHAMBER III · THE LAST OBSERVATORY','CHAMBER IV · THE TRIUNE ARCHIVE'];
    const activeLayouts=veteran?[...layouts,...VETERAN_LAYOUTS]:layouts;
    const activeNames=veteran?[...CHAMBER_NAMES,...VETERAN_LAYOUTS.map(room=>room.name)]:CHAMBER_NAMES;
    const activeTitles=veteran?[...CHAMBER_TITLES,...VETERAN_LAYOUTS.map(room=>room.title)]:CHAMBER_TITLES;
    // Every relic tradeoff lands in one of these tunables; diagnostics mirror them.
    const veilDuration=()=>(verbs.has('gyro')?3.6:2.8)+(has('veil')?1.8:0);
    const veilCooldown=()=>(verbs.has('freeze')?8:11)-(has('veil')?3:0)+(has('gambit')?4:0);
    const decoyDuration=()=>3.8+(has('chime')?3:0)-(has('siphon')?1.4:0);
    const decoyCooldown=()=>10+(has('veil')?4:0)-(has('chime')?3:0);
    const speedFactor=()=>has('runner')?1.18:1;
    const lureRadius=()=>encounter.lure*(has('chime')?1.35:1);
    const keyValue=()=>250+(has('gambit')?150:0)-(has('mercy')?100:0);
    if(Number.isInteger(options.startChamber))chamber=clamp(options.startChamber,0,activeLayouts.length-1);
    const inBounds=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;
    const doorAt=(x,y)=>doors.find(d=>d.col===x&&d.row===y)||null;
    const blocked=(x,y)=>{
      const t=toCell(x,y);
      if(!inBounds(t.x,t.y))return true;
      const door=doorAt(t.x,t.y);return walls[t.y][t.x]||Boolean(door&&!door.open);
    };
    // Endless circuits and the Daily Vigil remix patrol starts without changing
    // the authored walls, keys or exit. A given seed/circuit is replayable.
    function roomRand(){return rng(((Number.isInteger(options.seed)?options.seed:981) ^ Math.imul(chamber+1,2654435761) ^ Math.imul(cycles+1,1597334677))>>>0);}
    // Finite campaigns keep chamber I authored for onboarding; endless keeps
    // its entire first circuit on the authored layouts the tour tests read.
    // Later chambers/circuits come from the seeded, connectivity-checked
    // course generator and carry one of four encounter temperaments.
    function buildRoom(){
      const authored=endless?cycles===0:(veteran&&chamber>=layouts.length)||chamber===0;
      const room=course(runSeed,chamber,cycles,authored,veteran?VETERAN_LAYOUTS:[]);
      roomInfo=room;encounter=encounters[room.encounter];requiredKeys=room.requiredKeys;requiredRelays=room.requiredRelays||0;routes=room.routes;
      canvas.dataset.layout=JSON.stringify({walls:room.walls,keys:room.keys,bonus:room.bonus,seal:room.seal,patrol:room.patrol,scanners:room.scanners,doors:room.doors,switches:room.switches,relays:room.relays,heart:room.heart,warden:room.warden,exit:[17,5]});
      // The Daily Vigil still remixes patrol starts on the authored walls,
      // keys and exit; generated rooms arrive pre-patrolled from course().
      const varied=authored&&endless&&options.daily===true,pick=roomRand();
      walls=room.walls.map(row=>row.slice());
      doors=room.doors.map(([col,row,id])=>({...tile(col,row),col,row,id,open:false}));
      switches=room.switches.map(([col,row,doorId])=>({...tile(col,row),col,row,doorId}));
      relays=room.relays.map(([col,row,id])=>({...tile(col,row),col,row,id,done:false}));relaysDone=0;heartTaken=false;
      heart=room.heart?{...tile(room.heart[0],room.heart[1]),col:room.heart[0],row:room.heart[1],taken:false}:null;
      warden=room.warden?{...tile(room.warden[0],room.warden[1]),homeX:tile(room.warden[0],room.warden[1]).x,homeY:tile(room.warden[0],room.warden[1]).y,kind:'warden',facing:Math.PI,reach:230,cone:.72,stunned:0,alert:0,seesPlayer:false,state:'dormant',phase:0,judgment:null,judgmentCd:4,memory:0,lastSeen:null,nav:[],repath:0,speed:58*(options.speedScale||1)}:null;
       collectibles=room.keys.map(([x,y],i)=>({...tile(x,y),taken:false,i}));
       seal={...tile(room.seal[0],room.seal[1]),taken:false};cleanEscape=true;sealWard=false;
      bonus=room.bonus.map(([x,y])=>({...tile(x,y),taken:false}));
       guards=room.patrol.map(([x,y,a,b,axis],i)=>{
         if(varied){
           const free=Array.from({length:b-a+1},(_,j)=>a+j).filter(cell=>{
             const pos=tile(axis==='h'?cell:x,axis==='v'?cell:y);
             return !walls[axis==='v'?cell:y][axis==='h'?cell:x]&&Math.hypot(pos.x-tile(1,5).x,pos.y-tile(1,5).y)>100;
           });
           if(free.length){const position=free[Math.floor(pick()*free.length)];if(axis==='v')y=position;else x=position;}
         }
         const dir=varied?(pick()<.5?-1:1):chamber%2?-1:1,home=tile(x,y);
         return {...home,homeX:home.x,homeY:home.y,a,b,axis,dir,stunned:0,alert:0,seesPlayer:false,state:'patrol',investigation:null,lastSeen:null,search:0,memory:0,broadcast:false,nav:[],repath:0,homeDir:dir,facing:axis==='v'?(dir>0?Math.PI/2:-Math.PI/2):(dir>0?0:Math.PI),
           speed:(38+(cycles*3+chamber)*6+i*3)*(varied?.9+pick()*.2:1)*encounter.speed*(options.speedScale||1),phase:i*2.1};
       });
       scanners=room.scanners.map(([x,y,baseFacing,phase],i)=>({...tile(x,y),kind:'scanner',baseFacing,facing:baseFacing+Math.sin(phase)*1.05,phase,sweep:1.05,turnRate:(.85+i*.07)*(options.speedScale||1),reach:205,cone:.48,stunned:0,alert:0,seesPlayer:false,locked:false}));
        canvas.dataset.course=guards.map(guard=>`${Math.round(guard.x)},${Math.round(guard.y)},${guard.dir}`).join('|');
       player={...tile(1,5),vx:0,vy:0};cursor=null;pointerActive=false;
       found=0;roomTransition=1.3;entrance=2;cloak=0;cloakCd=0;decoy=null;decoyCd=0;scannerJam=0;scannerCd=0;dashCd=0;crouchLatch=false;noiseEvents=[];noiseClock=0;networkAlert=0;alarmLevel=0;interaction=null;lastDirection={x:1,y:0};
       roomTitle=room.authored?activeTitles[chamber]:`${activeTitles[chamber].split(' · ')[0]} · ${encounter.name}`;
       message={text:relays.length?`${activeNames[chamber]} · SHIFT SOFT-STEPS · E OPENS BRASS DOORS`:scanners.length?`${activeNames[chamber]} · TIME THE SWEEPS · F DISTRACTS · G JAMS`:room.authored?activeNames[chamber]:`${activeNames[chamber]} · ${encounter.name} · ${encounter.hint}`,t:6};
    }
    buildRoom();
    // Relic drafts run on their own seed stream so drafting never perturbs
    // room generation; relics already held are excluded before the shuffle.
    function openDraft(){
      const pick=rng((runSeed^Math.imul(chamber+1,2246822519)^Math.imul(cycles+1,3266489917))>>>0);
      const pool=RELICS.filter(relic=>!relics.includes(relic.id));
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(pick()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      draft=pool.slice(0,Math.min(3,pool.length));
      if(!draft.length){buildRoom();return;}
      draftBar.innerHTML=`<strong>RELIC DRAFT · CHAMBER ${chamber+1} AWAITS · CHOOSE ONE · KEYS 1–${draft.length}</strong>`+draft.map((relic,i)=>`<button type="button" data-labyrinth-relic="${relic.id}"><span class="upgrade-icon-wrap">${window.AetherIcons.upgrade(relic.id)}</span><span class="upgrade-copy">${i+1} · ${relic.name} — ${relic.detail}</span></button>`).join('');
      draftBar.hidden=false;updateDraft();
      message={text:'RELIC DRAFT · THE LABYRINTH HOLDS ITS BREATH',t:4};tone(560,.16,'triangle',.04);
    }
    function updateDraft(){
      draftBar.dataset.state=draft?'open':'closed';
      for(const button of draftBar.querySelectorAll('[data-labyrinth-relic]')){
        const disabled=Boolean(!draft||g.paused||ended);
        if(button.disabled!==disabled)button.disabled=disabled;
      }
    }
    function chooseRelic(id){
      if(!draft||g.paused||ended)return;
      const relic=draft.find(entry=>entry.id===id);if(!relic)return;
      relics.push(relic.id);draft=null;draftBar.hidden=true;updateDraft();
      message={text:`${relic.name.toUpperCase()} ATTUNED`,t:4};
      burst(player.x,player.y,GOLD,16,150);tone(840,.18,'sine',.05);
      buildRoom();canvas.focus({preventScroll:true});
    }
    listen(draftBar,'click',e=>{const button=e.target.closest('[data-labyrinth-relic]');if(button&&!button.disabled)chooseRelic(button.dataset.labyrinthRelic);});
    const crouched=()=>veteran&&(crouchLatch||keys.has('Shift'));
    const concealed=()=>cloak>0||(veteran&&crouched()&&Math.hypot(player.vx,player.vy)<1);
    const exitOpen=()=>found>=requiredKeys&&relaysDone>=requiredRelays&&(!heart||heartTaken);
    const objectiveStage=()=>found<requiredKeys?'starkeys':relaysDone<requiredRelays?'relays':heart&&!heartTaken?'heart':'escape';
    function emitNoise(point,radius,kind){
      if(!veteran)return;
      noiseEvents.push({x:point.x,y:point.y,radius,kind,t:.65});if(noiseEvents.length>8)noiseEvents.shift();noisesMade++;
      for(const guard of guards)if(Math.hypot(guard.x-point.x,guard.y-point.y)<=radius)hearNoise(guard,point);
      if(warden&&warden.phase>0&&Math.hypot(warden.x-point.x,warden.y-point.y)<=radius){warden.lastSeen={x:point.x,y:point.y};warden.memory=3;warden.state='hunt';}
      networkAlert=Math.max(networkAlert,kind==='soft-step'?.1:.24);
    }
    function nearestInteraction(){
      const options=[];
      for(const item of switches)options.push({kind:'switch',target:item,label:`Operate ${item.doorId} door`});
      if(found>=requiredKeys)for(const item of relays)if(!item.done)options.push({kind:'relay',target:item,label:`Silence ${item.id} relay`});
      if(heart&&!heartTaken&&relaysDone>=requiredRelays)options.push({kind:'heart',target:heart,label:'Steal the Meridian heart'});
      return options.map(item=>({...item,distance:Math.hypot(player.x-item.target.x,player.y-item.target.y)})).filter(item=>item.distance<56).sort((a,b)=>a.distance-b.distance)[0]||null;
    }
    function interact(){
      if(!veteran||!alive()||draft)return;
      if(interaction){interaction=null;message={text:'CHANNEL BROKEN · NO PROGRESS LOST ELSEWHERE',t:2};return;}
      const use=nearestInteraction();
      if(!use){message={text:'NO BRASS MECHANISM WITHIN REACH',t:1.8};return;}
      if(use.kind==='switch'){
        const door=doors.find(q=>q.id===use.target.doorId);if(!door)return;
        if(door.open&&[player,...guards,...(warden?[warden]:[])].some(q=>Math.hypot(q.x-door.x,q.y-door.y)<31)){message={text:'DOORWAY OCCUPIED · CANNOT CLOSE SAFELY',t:2};return;}
        door.open=!door.open;interactions++;emitNoise(use.target,240,'switch');
        message={text:`${door.id.toUpperCase()} DOOR ${door.open?'OPEN · ROUTE RESTORED':'CLOSED · SIGHTLINE BROKEN'} · WATCHERS HEARD BRASS`,t:3};tone(door.open?620:310,.14,'triangle',.04);return;
      }
      interaction={kind:use.kind,target:use.target,t:0,duration:use.kind=='heart'?1.7:1.25,x:player.x,y:player.y};
      emitNoise(player,use.kind==='heart'?300:190,use.kind);message={text:use.kind==='heart'?'MERIDIAN HEART · HOLD THE CHANNEL · WARDEN INCOMING':'SILENCE RELAY · HOLD POSITION · NOISE DRAWS WATCHERS',t:3};
    }
    function updateInteraction(dt){
      if(!interaction)return;
      if(Math.hypot(player.x-interaction.x,player.y-interaction.y)>12||Math.hypot(player.x-interaction.target.x,player.y-interaction.target.y)>60){interaction=null;message={text:'CHANNEL BROKEN BY MOVEMENT',t:1.8};return;}
      interaction.t+=dt;
      if(interaction.t<interaction.duration)return;
      const finished=interaction;interaction=null;interactions++;
      if(finished.kind==='relay'){
        finished.target.done=true;relaysDone++;score+=200;hearts=Math.min(3,hearts+1);cloakCd=0;decoyCd=0;dashCd=0;scannerCd=0;networkAlert=Math.max(networkAlert,.48);
        if(warden){warden.phase=Math.min(2,relaysDone);warden.state='hunt';warden.lastSeen={x:finished.target.x,y:finished.target.y};warden.memory=4;warden.judgmentCd=2.2;}
        emitNoise(finished.target,250,'relay');message={text:`RELAY SILENCED ${relaysDone}/${requiredRelays} · ${relaysDone===requiredRelays?(heart?'THE MERIDIAN HEART IS EXPOSED':'EASTERN GATE UNSEALED'):'THE WARDEN CHANGES OFFICE'} · MOTH MENDED · VEIL / DECOY / MOTHSTEP PRIMED`,t:3.5};tone(820,.18,'sine',.045);
      }else{
        heartTaken=true;finished.target.taken=true;score+=600;networkAlert=1;cloakCd=0;dashCd=0;decoyCd=0;scannerCd=0;entrance=Math.max(entrance,1.5);
        if(warden){warden.phase=3;warden.state='hunt';warden.lastSeen={x:player.x,y:player.y};warden.memory=5;warden.judgmentCd=.7;warden.judgment=null;}
        emitNoise(player,340,'heart');message={text:'MERIDIAN HEART STOLEN · FINAL OFFICE · GADGETS PRIMED · ESCAPE EAST',t:4};tone(980,.28,'triangle',.05);
      }
    }
    function mothstep(){
      if(!veteran||!alive()||dashCd>0||draft)return;
      interaction=null;const dx=lastDirection.x,dy=lastDirection.y;
      for(let i=0;i<10;i++){
        const nx=dx*9,ny=dy*9;
        if(!blocked(player.x+nx+Math.sign(nx||1)*9,player.y)&&!blocked(player.x+nx,player.y))player.x+=nx;
        if(!blocked(player.x,player.y+ny+Math.sign(ny||1)*9)&&!blocked(player.x,player.y+ny))player.y+=ny;
      }
      dashCd=5;dashes++;burst(player.x,player.y,'#eee3c2',12,150);emitNoise(player,250,'mothstep');tone(420,.12,'triangle',.035);message={text:'MOTHSTEP · LOUD LANDING · BREAK THE LINE',t:2};
    }
    const alive=()=>!ended&&!g.paused&&roomTransition<=0;
    function end(won){if(ended)return;ended=true;win=won;
      if(won){score+=hearts*240;burst(player.x,player.y,MINT,42,300);tone(670,.3,'sine',.05);tone(990,.45,'triangle',.05);}
      else tone(125,.35,'sawtooth',.035);
      g.after(()=>{g.destroy();options.onEnd?.({won,score:Math.round(score)});},1500);
    }
    function loseHeart(){
      if(entrance>0||ended)return;
      interaction=null;if(veteran){cloakCd=0;dashCd=0;}if(warden){warden.judgment=null;warden.alert=0;warden.memory=0;warden.lastSeen=null;}
       if(sealWard){
         sealWard=false;cleanEscape=false;entrance=2;flash=.18;cloak=0;
         player={...tile(1,5),vx:0,vy:0};clearGuardAlarms(true);scanners.forEach(q=>q.alert=0);
         burst(player.x,player.y,GOLD,20,190);tone(470,.18,'triangle',.05);
         message={text:'ARCHIVE WARD ABSORBED THE ALARM · CLEAN BONUS LOST',t:3};return;
       }
       hearts--;entrance=2;flash=.26;cloak=0;cleanEscape=false;
      tone(145,.25,'sawtooth',.055);burst(player.x,player.y,PINK,18,230);
      message={text:'ALARM · RELOCATING TO ENTRANCE',t:3};
      if(hearts<=0){end(false);return;}
      player={...tile(1,5),vx:0,vy:0};
      clearGuardAlarms(true);scanners.forEach(q=>q.alert=0);
    }
    function visibleTo(guard){
      const dx=player.x-guard.x,dy=player.y-guard.y,d=Math.hypot(dx,dy);
      const ang=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(ang-guard.facing),Math.cos(ang-guard.facing));
      const radius=concealed()?42:(guard.reach||encounter.reach)*(veteran&&crouched()?.74:1),half=guard.cone||.64;
      let visible=d<radius&&Math.abs(diff)<half;
      if(visible)for(let r=12;r<d;r+=10)if(blocked(guard.x+dx*r/d,guard.y+dy*r/d)){visible=false;break;}
      return visible;
    }
    // Veteran watchers navigate the same connected tile graph as the player.
    // Paths are recalculated on a short cadence, never every frame, and remain
    // bounded to the 18×11 chamber. Sound creates an investigation, not omniscience.
    function tilePath(from,to){
      const start=toCell(from.x,from.y),goal=toCell(to.x,to.y);
      if(!inBounds(goal.x,goal.y)||walls[goal.y][goal.x]||doorAt(goal.x,goal.y)&&!doorAt(goal.x,goal.y).open)return [];
      const at=(x,y)=>y*COLS+x,previous=Array(COLS*ROWS).fill(-2),queue=[[start.x,start.y]];previous[at(start.x,start.y)]=-1;
      for(let head=0;head<queue.length;head++){
        const [x,y]=queue[head];if(x===goal.x&&y===goal.y)break;
        for(const [nx,ny] of [[x,y-1],[x-1,y],[x+1,y],[x,y+1]]){
          const key=at(nx,ny);if(nx<0||ny<0||nx>=COLS||ny>=ROWS||walls[ny][nx]||doorAt(nx,ny)&&!doorAt(nx,ny).open||previous[key]!==-2)continue;
          previous[key]=at(x,y);queue.push([nx,ny]);
        }
      }
      if(previous[at(goal.x,goal.y)]===-2)return [];
      const path=[];let key=at(goal.x,goal.y);
      while(key!==at(start.x,start.y)&&key>=0){path.push(tile(key%COLS,Math.floor(key/COLS)));key=previous[key];}
      return path.reverse();
    }
    function navigate(guard,target,dt){
      guard.repath-=dt;
      if(guard.repath<=0){guard.nav=tilePath(guard,target);guard.repath=guard.state==='chase'?.3:.55;}
      while(guard.nav.length&&Math.hypot(guard.x-guard.nav[0].x,guard.y-guard.nav[0].y)<7)guard.nav.shift();
      let waypoint=guard.nav[0];
      if(!waypoint){const cell=toCell(guard.x,guard.y),goal=toCell(target.x,target.y);if(cell.x===goal.x&&cell.y===goal.y)waypoint=target;else return false;}
      const dx=waypoint.x-guard.x,dy=waypoint.y-guard.y,d=Math.hypot(dx,dy)||1,step=guard.speed*dt*(guard.state==='chase'?1.1:1)*(veteran&&alarmLevel===2?1.12:1);
      const nx=guard.x+dx/d*Math.min(step,d),ny=guard.y+dy/d*Math.min(step,d);
      if(!blocked(nx,guard.y))guard.x=nx;if(!blocked(guard.x,ny))guard.y=ny;
      guard.facing=Math.atan2(dy,dx);return Math.hypot(guard.x-target.x,guard.y-target.y)<20;
    }
    function patrolGuard(guard,dt){
      const q=toCell(guard.x,guard.y);
      if(guard.axis==='v'){
        if(q.y>=guard.b)guard.dir=-1;if(q.y<=guard.a)guard.dir=1;
        const next=guard.y+guard.dir*guard.speed*(veteran&&alarmLevel===2?1.12:1)*dt;
        if(!blocked(guard.x,next)){guard.y=next;guard.facing=guard.dir>0?Math.PI/2:-Math.PI/2;}else guard.dir*=-1;
      }else{
        if(q.x>=guard.b)guard.dir=-1;if(q.x<=guard.a)guard.dir=1;
        const next=guard.x+guard.dir*guard.speed*(veteran&&alarmLevel===2?1.12:1)*dt;
        if(!blocked(next,guard.y)){guard.x=next;guard.facing=guard.dir>0?0:Math.PI;}else guard.dir*=-1;
      }
    }
    function hearNoise(guard,point){
      if(!veteran)return;networkAlert=Math.max(networkAlert,.18);
      if(guard.stunned>0||guard.state==='chase')return;
      guard.state='investigate';guard.investigation={x:point.x,y:point.y};guard.search=0;guard.nav=[];guard.repath=0;
    }
    function coordinate(source){
      if(source.broadcast)return;source.broadcast=true;coordinations++;networkAlert=Math.max(networkAlert,.66);
      const point=source.lastSeen||{x:player.x,y:player.y};
      for(const guard of guards)if(guard!==source&&guard.stunned<=0&&guard.state!=='chase'&&Math.hypot(guard.x-source.x,guard.y-source.y)<340)hearNoise(guard,point);
      if(warden&&warden.phase>0){warden.lastSeen={x:point.x,y:point.y};warden.memory=4;warden.state='hunt';}
    }
    function clearGuardAlarms(resetPosts=false){guards.forEach(q=>{q.alert=0;q.broadcast=false;if(veteran){q.state=resetPosts?'patrol':'return';q.memory=0;q.investigation=null;q.lastSeen=null;q.nav=[];q.repath=0;if(resetPosts){q.x=q.homeX;q.y=q.homeY;q.dir=q.homeDir;q.facing=q.axis==='v'?(q.dir>0?Math.PI/2:-Math.PI/2):(q.dir>0?0:Math.PI);}}});networkAlert=0;alarmLevel=0;if(warden){warden.alert=0;warden.memory=0;warden.lastSeen=null;warden.nav=[];warden.repath=0;if(resetPosts){warden.x=warden.homeX;warden.y=warden.homeY;warden.facing=Math.PI;warden.state=warden.phase>0?'vigil':'dormant';warden.judgment=null;warden.judgmentCd=4;warden.stunned=0;}}}
    function updateVeteranGuard(guard,dt){
      if(guard.seesPlayer&&guard.alert>=.38){if(guard.state!=='chase'){guard.lastSeen={x:player.x,y:player.y};coordinate(guard);}guard.state='chase';guard.memory=2.4;guard.lastSeen={x:player.x,y:player.y};guard.investigation=null;}
      if(guard.state==='chase'){
        if(guard.seesPlayer){guard.lastSeen={x:player.x,y:player.y};guard.memory=2.4;}else guard.memory=Math.max(0,guard.memory-dt);
        const target=guard.seesPlayer?player:guard.lastSeen;
        if(target)navigate(guard,target,dt);
        if(guard.memory<=0){guard.state='search';guard.search=2.2;guard.investigation=guard.lastSeen;}
      }else if(guard.state==='investigate'){
        if(!guard.investigation||navigate(guard,guard.investigation,dt)){guard.state='search';guard.search=2.2;}
      }else if(guard.state==='search'){
        guard.search-=dt;guard.facing+=dt*1.35;
        if(guard.search<=0){guard.state='return';guard.investigation=null;guard.nav=[];guard.repath=0;}
      }else if(guard.state==='return'){
        if(navigate(guard,{x:guard.homeX,y:guard.homeY},dt)){guard.state='patrol';guard.nav=[];guard.repath=0;}
      }else patrolGuard(guard,dt);
      detect(guard,dt);
    }
    function detect(guard,dt){
      const visible=visibleTo(guard);guard.seesPlayer=visible;
      guard.alert=clamp(guard.alert+(visible?dt*encounter.alarm*(options.speedScale||1)*(has('runner')?1.25:1)*(crouched()?.68:1):-dt*1.75),0,1.75);
      if(!visible&&guard.alert<.02)guard.broadcast=false;
      if(guard.alert>=1.17)loseHeart();
    }
    function updateWarden(dt){
      if(!warden||warden.phase<=0)return;
      warden.stunned=Math.max(0,warden.stunned-dt);
      if(warden.stunned>0){warden.seesPlayer=false;warden.alert=Math.max(0,warden.alert-dt);return;}
      warden.judgmentCd=Math.max(0,warden.judgmentCd-dt);
      if(warden.judgment){
        const judgment=warden.judgment;judgment.t-=dt;
        if(judgment.t<=0){
          const dx=judgment.tx-judgment.ox,dy=judgment.ty-judgment.oy,length=Math.hypot(dx,dy)||1;
          const px=player.x-judgment.ox,py=player.y-judgment.oy,along=clamp((px*dx+py*dy)/(length*length),0,1);
          const distance=Math.hypot(player.x-(judgment.ox+dx*along),player.y-(judgment.oy+dy*along));
          let blockedLine=false;for(let d=12;d<length;d+=10)if(blocked(judgment.ox+dx*d/length,judgment.oy+dy*d/length)){blockedLine=true;break;}
          if(distance<24&&!blockedLine&&cloak<=0&&entrance<=0)loseHeart();else judgmentsEvaded++;
          warden.judgment=null;
        }
        return;
      }
      const visible=visibleTo(warden);warden.seesPlayer=visible;
      if(visible){warden.lastSeen={x:player.x,y:player.y};warden.memory=3.2;warden.state='hunt';networkAlert=Math.max(networkAlert,.72);}
      else warden.memory=Math.max(0,warden.memory-dt);
      if(warden.lastSeen&&warden.memory>0)navigate(warden,warden.lastSeen,dt);
      else{warden.state='vigil';warden.facing+=dt*(warden.phase===3?1.05:.62);}
      detect(warden,dt);
      if(warden.judgmentCd<=0&&Math.hypot(player.x-warden.x,player.y-warden.y)<390){
        warden.judgment={ox:warden.x,oy:warden.y,tx:player.x,ty:player.y,t:warden.phase===3?1.2:1.8,duration:warden.phase===3?1.2:1.8};
        warden.facing=Math.atan2(player.y-warden.y,player.x-warden.x);warden.judgmentCd=warden.phase===3?4.2:warden.phase===2?5.2:6.5;judgmentsCalled++;
        message={text:'WARDEN JUDGMENT · LINE LOCKED · MOTHSTEP, VEIL OR BREAK SIGHT',t:2.2};tone(155,.22,'square',.035);
      }
    }
    function step(dt){
     if(ended)return;
      // An open relic draft is a true intermission: no clock, no patrols.
      if(draft)return;
      clock+=dt;
      entrance=Math.max(0,entrance-dt);
      roomTransition=Math.max(0,roomTransition-dt);
       cloak=Math.max(0,cloak-dt);cloakCd=Math.max(0,cloakCd-dt);decoyCd=Math.max(0,decoyCd-dt);scannerJam=Math.max(0,scannerJam-dt);scannerCd=Math.max(0,scannerCd-dt);dashCd=Math.max(0,dashCd-dt);noiseClock=Math.max(0,noiseClock-dt);
       noiseEvents.forEach(n=>n.t-=dt);noiseEvents=noiseEvents.filter(n=>n.t>0);
       if(decoy){decoy.t-=dt;if(decoy.t<=0)decoy=null;}
      message.t=Math.max(0,message.t-dt);
       if(!endless&&clock>=150)return end(false);
      if(roomTransition>0)return;
      let mx=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);
      let my=(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);
       let dist=Math.hypot(mx,my);
       const keyboardMoving=dist>0;
       if(!dist&&pointerActive&&cursor){
        mx=cursor.x-player.x;my=cursor.y-player.y;dist=Math.hypot(mx,my);
      }
      const speed=(cloak>0?155:195)*speedFactor()*(crouched()?.52:1);
        const startX=player.x,startY=player.y;
        if(keyboardMoving||dist>4){
         lastDirection={x:mx/dist,y:my/dist};
        const vx=mx/dist*speed*dt,vy=my/dist*speed*dt;
        if(!blocked(player.x+vx+Math.sign(vx||1)*9,player.y)&&!blocked(player.x+vx,player.y))player.x+=vx;
        if(!blocked(player.x,player.y+vy+Math.sign(vy||1)*9)&&!blocked(player.x,player.y+vy))player.y+=vy;
        player.vx=vx/dt;player.vy=vy/dt;
      }else{player.vx=0;player.vy=0;}
      const moved=Math.hypot(player.x-startX,player.y-startY)>.01;
      if(veteran&&moved&&noiseClock<=0){noiseClock=.55;emitNoise(player,crouched()?32:92,crouched()?'soft-step':'footstep');}
      updateInteraction(dt);
      for(const k of collectibles)if(!k.taken&&Math.hypot(player.x-k.x,player.y-k.y)<22){
        k.taken=true;found++;score+=keyValue();
        if(veteran&&found===requiredKeys){decoyCd=0;dashCd=0;scannerCd=0;cloakCd=Math.max(0,cloakCd-3);}
        if(has('mercy')){clearGuardAlarms();scanners.forEach(q=>q.alert=0);entrance=Math.max(entrance,1.5);}
        burst(k.x,k.y,GOLD,24,180);tone(620+found*140,.15,'triangle',.05);
         message={text:`STARKEY ${found} / ${requiredKeys} · ${found===requiredKeys?(requiredRelays?'E SILENCES THE MARKED RELAYS':'EXIT UNSEALED'):'FIND THE OTHER'}`,t:3};
      }
       for(const b of bonus)if(!b.taken&&Math.hypot(player.x-b.x,player.y-b.y)<20){
         b.taken=true;score+=100;decoyCd=Math.max(0,decoyCd-5);
         if(has('siphon')){cloakCd=0;decoyCd=0;cloak=Math.max(cloak,1);}
         burst(b.x,b.y,MINT,14,145);tone(890,.06,'sine',.035);
          message={text:has('siphon')?'PRISM SIPHON · BOTH GADGETS RESET · +100':'PRISM FRAGMENT · DECOY RECHARGED · +100',t:2.5};
       }
       if(!seal.taken&&Math.hypot(player.x-seal.x,player.y-seal.y)<20){
          seal.taken=true;sealWard=true;score+=300;burst(seal.x,seal.y,GOLD,20,160);tone(740,.18,'triangle',.05);
          message={text:'ARCHIVE SEAL · +300 · WARD BLOCKS ONE ALARM',t:3.5};
       }
      for(const guard of guards){
        guard.stunned=Math.max(0,guard.stunned-dt);
        if(guard.stunned>0){guard.alert=Math.max(0,guard.alert-dt);continue;}
        if(veteran){updateVeteranGuard(guard,dt);continue;}
        // Standard chambers retain their original corridor-only decoy reaction.
        if(decoy&&Math.hypot(guard.x-decoy.x,guard.y-decoy.y)<lureRadius()){
          const delta=guard.axis==='v'?decoy.y-guard.y:decoy.x-guard.x;
          if(Math.abs(delta)>16)guard.dir=Math.sign(delta);
        }
        patrolGuard(guard,dt);detect(guard,dt);
      }
      // Veteran scanners are stationary, predictable sweepers. A decoy catches
      // their gaze without moving them; the null jammer freezes both sweep and
      // detection while ordinary patrols continue to move.
      for(const scanner of scanners){
        scanner.stunned=Math.max(0,scanner.stunned-dt);
        if(scannerJam>0||scanner.stunned>0){scanner.seesPlayer=false;scanner.locked=false;scanner.alert=Math.max(0,scanner.alert-dt*1.75);continue;}
        let desired,locked=false;
        if(decoy&&Math.hypot(scanner.x-decoy.x,scanner.y-decoy.y)<lureRadius()){
          desired=Math.atan2(decoy.y-scanner.y,decoy.x-scanner.x);locked=true;
        }else{
          scanner.phase+=dt*scanner.turnRate*(alarmLevel===2?1.35:1);desired=scanner.baseFacing+Math.sin(scanner.phase)*scanner.sweep;
        }
        const turn=Math.atan2(Math.sin(desired-scanner.facing),Math.cos(desired-scanner.facing));
        scanner.facing+=clamp(turn,-dt*3.2,dt*3.2);scanner.locked=locked;
        detect(scanner,dt);
      }
      updateWarden(dt);
      const watched=guards.some(q=>q.seesPlayer)||scanners.some(q=>q.seesPlayer)||Boolean(warden?.seesPlayer);
      networkAlert=clamp(networkAlert+dt*(watched?.16:-.055),0,1);alarmLevel=networkAlert>=.95?2:networkAlert>=.18?1:0;
      // Veteran objectives escalate from keys to relays, then the Meridian heart.
       if(player.x>X+16.35*S&&Math.abs(player.y-tile(17,5).y)<35&&exitOpen()){
         const escapeBonus=seal.taken&&cleanEscape?300:0;
         score+=350+escapeBonus;
         if(escapeBonus){tone(1000,.18,'sine',.05);if(has('gambit'))hearts=Math.min(3,hearts+1);}
         chamber++;
         if(chamber>=activeLayouts.length){
          if(!endless)return end(true);
          cycles++;chamber=0;hearts=Math.min(3,hearts+1);
          score+=cycles*200;
          message={text:`CIRCUIT ${cycles} · THE WATCHERS QUICKEN`,t:4};
        }
        openDraft();
      }
    }
    function pulse(){
      if(!alive()||cloakCd>0||draft)return;
      cloak=veilDuration();cloakCd=veilCooldown();
      if(!has('chime'))for(const q of guards)if(Math.hypot(q.x-player.x,q.y-player.y)<145){q.stunned=2;q.alert=0;if(veteran){q.state='return';q.memory=0;q.nav=[];q.repath=0;}}
      if(veteran&&warden&&!has('chime')&&Math.hypot(warden.x-player.x,warden.y-player.y)<145){const interrupted=Boolean(warden.judgment);warden.stunned=1.2;warden.alert=0;warden.judgment=null;wardenInterrupts++;if(interrupted)message={text:'WARDEN JUDGMENT BROKEN BY PRISM VEIL',t:2.4};}
      burst(player.x,player.y,MINT,20,190);tone(760,.19,'sine',.05);
       message={text:'PRISM VEIL · MOVE UNSEEN',t:2.4};
    }
    function throwDecoy(){
      if(ended||g.paused||decoyCd>0||draft)return;
      if(roomTransition>0){message={text:'WAIT FOR THE CHAMBER TO OPEN',t:2};return;}
      let x=player.x,y=player.y;
      for(let distance=12;distance<=150;distance+=8){
        const nextX=player.x+lastDirection.x*distance,nextY=player.y+lastDirection.y*distance;
        if(blocked(nextX,nextY))break;
        x=nextX;y=nextY;
      }
      if(Math.hypot(x-player.x,y-player.y)<35){message={text:'NO CLEAR LINE FOR A DECOY',t:2};return;}
      decoy={x,y,t:decoyDuration()};decoyCd=decoyCooldown();
      if(veteran)emitNoise(decoy,lureRadius(),'decoy');
      burst(x,y,MINT,14,120);tone(530,.16,'triangle',.045);
      message={text:veteran?'PRISM DECOY · WATCHERS INVESTIGATE THE CHIME':'PRISM DECOY · WATCHERS FOLLOW THE CHIME',t:2.8};
    }
    function jamScanners(){
      if(!veteran||!alive()||scannerCd>0||draft)return;
      if(!scanners.length){message={text:'NO SCANNER SIGNAL IN THIS CHAMBER',t:2};return;}
      scannerJam=3.6;scannerCd=14;scanners.forEach(q=>{q.alert=0;q.seesPlayer=false;burst(q.x,q.y,MINT,16,120);});
      const heard=guards.filter(guard=>Math.hypot(guard.x-player.x,guard.y-player.y)<lureRadius()*1.15).length;emitNoise(player,lureRadius()*1.15,'jammer');
      tone(340,.28,'sine',.045);message={text:`NULL JAMMER · SCANNERS BLIND · ${heard} WATCHER${heard===1?'':'S'} HEARD IT`,t:3};
    }
    listen(abilityBar,'click',e=>{
      if(e.target.closest('[data-labyrinth-action="veil"]'))pulse();
      if(e.target.closest('[data-labyrinth-action="decoy"]'))throwDecoy();
      if(e.target.closest('[data-labyrinth-action="jammer"]'))jamScanners();
      if(e.target.closest('[data-labyrinth-action="crouch"]')&&alive()){crouchLatch=!crouchLatch;interaction=null;}
      if(e.target.closest('[data-labyrinth-action="dash"]'))mothstep();
      if(e.target.closest('[data-labyrinth-action="interact"]'))interact();
      canvas.focus({preventScroll:true});
    });
    listen(canvas,'pointermove',e=>{
      const r=canvas.getBoundingClientRect();cursor={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};pointerActive=true;
    });
    listen(canvas,'pointerleave',()=>pointerActive=false);
    listen(canvas,'pointerdown',e=>{
      if(e.button===2){e.preventDefault();pulse();return;}
      const r=canvas.getBoundingClientRect(),pt={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H},use=veteran?nearestInteraction():null;
      if(use&&Math.hypot(pt.x-use.target.x,pt.y-use.target.y)<30){interact();canvas.focus({preventScroll:true});return;}
      cursor=pt;pointerActive=true;
      canvas.focus({preventScroll:true});
    });
    listen(canvas,'contextmenu',e=>e.preventDefault());
    listen(canvas,'keydown',e=>{
      if(draft){
        if(/^[1-3]$/.test(e.key)&&!e.repeat){e.preventDefault();chooseRelic(draft[Number(e.key)-1]?.id);}
        return;
      }
      if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift'].includes(e.key))e.preventDefault();
       keys.add(e.key.length===1?e.key.toLowerCase():e.key);
       if(e.key===' '&&!e.repeat)pulse();
       if(e.key.toLowerCase()==='f'&&!e.repeat){e.preventDefault();throwDecoy();}
       if(veteran&&e.key.toLowerCase()==='g'&&!e.repeat){e.preventDefault();jamScanners();}
       if(veteran&&e.key.toLowerCase()==='h'&&!e.repeat){e.preventDefault();mothstep();}
       if(veteran&&e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();interact();}
    });
    listen(window,'keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
    listen(window,'blur',()=>{keys.clear();pointerActive=false;});
    function draw(ctx,dt,time){
      const veilHeld=Boolean(cloakCd>0||ended||roomTransition>0||draft);
      if(veilButton.disabled!==veilHeld)veilButton.disabled=veilHeld;
      const decoyHeld=Boolean(decoyCd>0||ended||roomTransition>0||draft);
      if(decoyButton.disabled!==decoyHeld)decoyButton.disabled=decoyHeld;
      updateDraft();
      const decoyLabel=decoyCd>0?`Decoy recharging · ${Math.ceil(decoyCd)}s`:'Throw prism decoy · F';
      if(decoyButton.textContent!==decoyLabel)decoyButton.textContent=decoyLabel;
      if(jammerButton){
        const jammerHeld=Boolean(scannerCd>0||ended||g.paused||roomTransition>0||draft||!scanners.length);
        if(jammerButton.disabled!==jammerHeld)jammerButton.disabled=jammerHeld;
        const jammerLabel=!scanners.length?'No scanner signal':scannerJam>0?`Scanners jammed · ${scannerJam.toFixed(1)}s`:scannerCd>0?`Jammer recharging · ${Math.ceil(scannerCd)}s`:'Jam scanners · G · noise';
        if(jammerButton.textContent!==jammerLabel)jammerButton.textContent=jammerLabel;
      }
      if(crouchButton){
        const held=Boolean(ended||g.paused||roomTransition>0||draft);if(crouchButton.disabled!==held)crouchButton.disabled=held;
        crouchButton.setAttribute('aria-pressed',String(crouched()));const label=crouched()?'Soft-stepping · Shift / tap to stand':'Soft-step · hold Shift';if(crouchButton.textContent!==label)crouchButton.textContent=label;
        const dashHeld=Boolean(dashCd>0||ended||g.paused||roomTransition>0||draft);if(dashButton.disabled!==dashHeld)dashButton.disabled=dashHeld;
        const dashLabel=dashCd>0?`Mothstep recharging · ${dashCd.toFixed(1)}s`:'Mothstep · H · loud';if(dashButton.textContent!==dashLabel)dashButton.textContent=dashLabel;
        const use=nearestInteraction(),useHeld=Boolean(ended||g.paused||roomTransition>0||draft||!use&&!interaction);if(interactButton.disabled!==useHeld)interactButton.disabled=useHeld;
        const useLabel=interaction?`Cancel ${interaction.kind} channel · E`:use?`${use.label} · E`:'Interact · E · move near brass';if(interactButton.textContent!==useLabel)interactButton.textContent=useLabel;
      }
      canvas.dataset.mode=endless?'endless':'mission';
      canvas.dataset.veteran=String(veteran);
      canvas.dataset.speedScale=String(options.speedScale||1);canvas.dataset.reducedMotion=String(reduced());canvas.dataset.clock=clock.toFixed(2);
      canvas.dataset.chamber=String(chamber+1);
      canvas.dataset.chamberCount=String(activeLayouts.length);
      canvas.dataset.keysAvailable=String(collectibles.length);
      canvas.dataset.keysRequired=String(requiredKeys);
      canvas.dataset.keysFound=String(found);
      canvas.dataset.score=String(score);
      canvas.dataset.hearts=String(hearts);
      canvas.dataset.decoy=decoy?'active':decoyCd>0?'cooldown':'ready';canvas.dataset.decoyCooldown=decoyCd.toFixed(2);
      canvas.dataset.decoyX=decoy?String(Math.round(decoy.x)):'';
      canvas.dataset.scannerCount=String(scanners.length);
      canvas.dataset.scannerJam=scannerJam.toFixed(2);canvas.dataset.scannerCooldown=scannerCd.toFixed(2);
      canvas.dataset.scannerStates=JSON.stringify(scanners.map(q=>({x:Math.round(q.x),y:Math.round(q.y),facing:Number(q.facing.toFixed(3)),alert:Number(q.alert.toFixed(2)),sees:q.seesPlayer,locked:q.locked,jammed:scannerJam>0})));
      canvas.dataset.guardX=String(Math.round(guards[0]?.x||0));
      canvas.dataset.patrolStates=JSON.stringify(guards.map(q=>[Math.round(q.x),Math.round(q.y)]));
      canvas.dataset.guardStates=JSON.stringify(guards.map(q=>({x:Math.round(q.x),y:Math.round(q.y),state:veteran?q.state:'patrol',facing:Number(q.facing.toFixed(3)),alert:Number(q.alert.toFixed(2)),sees:q.seesPlayer,memory:Number(q.memory.toFixed(2)),broadcast:Boolean(q.broadcast),path:q.nav.length})));
      canvas.dataset.roomTransition=String(roomTransition.toFixed(2));
      canvas.dataset.seal=seal.taken?'collected':cleanEscape?'available':'bonus-lost';
      canvas.dataset.sealWard=sealWard?'charged':'spent';
      canvas.dataset.relics=relics.join(',');
      canvas.dataset.draft=draft?'open':'closed';
      canvas.dataset.draftChoices=draft?draft.map(relic=>relic.id).join(','):'';
      canvas.dataset.courseSeed=`${runSeed}:${chamber}:${cycles}`;
      canvas.dataset.generated=roomInfo&&roomInfo.authored?'authored':'generated';
      canvas.dataset.encounter=encounter.name;
      canvas.dataset.veilDuration=veilDuration().toFixed(2);canvas.dataset.veilActive=cloak.toFixed(2);canvas.dataset.veilCooldown=cloakCd.toFixed(2);
      canvas.dataset.decoyDuration=decoyDuration().toFixed(2);
      canvas.dataset.speedFactor=speedFactor().toFixed(2);
      canvas.dataset.lureRadius=String(Math.round(lureRadius()));
      canvas.dataset.guardReach=String(encounter.reach);
      canvas.dataset.keyValue=String(keyValue());
      canvas.dataset.playerX=String(Math.round(player.x));canvas.dataset.playerY=String(Math.round(player.y));
      canvas.dataset.crouched=String(crouched());canvas.dataset.concealed=String(concealed());canvas.dataset.dashCooldown=dashCd.toFixed(2);canvas.dataset.dashes=String(dashes);canvas.dataset.noisesMade=String(noisesMade);canvas.dataset.noiseEvents=JSON.stringify(noiseEvents.map(n=>({kind:n.kind,radius:n.radius,x:Math.round(n.x),y:Math.round(n.y)})));
      canvas.dataset.networkAlert=networkAlert.toFixed(2);canvas.dataset.alarmLevel=String(alarmLevel);canvas.dataset.coordinations=String(coordinations);
      canvas.dataset.doors=JSON.stringify(doors.map(d=>({id:d.id,col:d.col,row:d.row,open:d.open})));canvas.dataset.relays=JSON.stringify(relays.map(r=>({id:r.id,col:r.col,row:r.row,done:r.done})));canvas.dataset.relaysDone=String(relaysDone);canvas.dataset.relaysRequired=String(requiredRelays);canvas.dataset.objectiveStage=objectiveStage();canvas.dataset.exitOpen=String(exitOpen());canvas.dataset.interactions=String(interactions);canvas.dataset.interaction=interaction?JSON.stringify({kind:interaction.kind,progress:Number(interaction.t.toFixed(2)),duration:interaction.duration}):'';
      canvas.dataset.heart=heart?(heartTaken?'stolen':relaysDone>=requiredRelays?'exposed':'sealed'):'none';
      canvas.dataset.warden=warden?JSON.stringify({phase:warden.phase,state:warden.state,x:Math.round(warden.x),y:Math.round(warden.y),facing:Number(warden.facing.toFixed(3)),alert:Number(warden.alert.toFixed(2)),sees:warden.seesPlayer,stunned:Number(warden.stunned.toFixed(2)),judgment:warden.judgment?Number(warden.judgment.t.toFixed(2)):0,cooldown:Number(warden.judgmentCd.toFixed(2))}):'';
      canvas.dataset.judgmentsCalled=String(judgmentsCalled);canvas.dataset.judgmentsEvaded=String(judgmentsEvaded);canvas.dataset.wardenInterrupts=String(wardenInterrupts);
      if(mobileMedia.matches){
        const stage=objectiveStage(),objective=`CHAMBER ${chamber+1}/${activeLayouts.length} · KEYS ${found}/${requiredKeys} · ${stage==='starkeys'?'Find starkeys':stage==='relays'?`Silence relays ${relaysDone}/${requiredRelays}`:stage==='heart'?'Steal the Meridian heart':'Escape east'}`;
        const resources=`HEARTS ${hearts}/3 · ${Math.max(0,150-Math.floor(clock))}s · SCORE ${score} · ${concealed()&&cloak<=0?'STILL SHADOW':crouched()?'SOFT-STEP':'NORMAL STEP'}`;
        const alerts=`${alarmLevel===2?'LOCKDOWN — guards share sightings':alarmLevel===1?'SUSPICION — watchers investigating':'NETWORK CALM'} · VEIL ${cloakCd>0?`${Math.ceil(cloakCd)}s`:'READY'} · DECOY ${decoyCd>0?`${Math.ceil(decoyCd)}s`:'READY'} · MOTHSTEP ${dashCd>0?`${Math.ceil(dashCd)}s`:'READY'}`;
        const use=nearestInteraction(),action=interaction?`${interaction.kind.toUpperCase()} CHANNEL ${Math.max(0,interaction.duration-interaction.t).toFixed(1)}s · keep still`:warden?.judgment?`JUDGMENT ${warden.judgment.t.toFixed(1)}s · move, veil or break sight`:use?`E · ${use.label}`:exitOpen()?'Eastern gate open':'E · operate nearby brass architecture';
        for(const [key,value] of Object.entries({objective,resources,alerts,action})){const node=mobileHud.querySelector(`[data-labyrinth-mobile="${key}"]`);if(node.textContent!==value)node.textContent=value;}
      }
      ctx.fillStyle=['#080b17','#15101d','#0d101c'][chamber%3];ctx.fillRect(0,0,W,H);if(!reduced())stars();
      const halo=ctx.createRadialGradient(500,250,20,500,250,520);
      halo.addColorStop(0,'#679f9a20');halo.addColorStop(1,'#07131b00');ctx.fillStyle=halo;ctx.fillRect(0,0,W,H);
      ctx.save();
      // Archaeological tiles, walls and inlaid circuit corridors.
      for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
        const x=X+col*S,y=Y+row*S;
        ctx.fillStyle=(row+col)%2===0?'#1b1b29':'#141522';ctx.fillRect(x+.7,y+.7,S-1.4,S-1.4);
        if(walls[row][col]){
          const g=ctx.createLinearGradient(x,y,x+S,y+S);g.addColorStop(0,'#56505a');g.addColorStop(.5,'#2c2835');g.addColorStop(1,'#171622');
          ctx.fillStyle=g;ctx.fillRect(x+2,y+2,S-4,S-4);
          ctx.strokeStyle='#c4b78c55';ctx.lineWidth=1;ctx.strokeRect(x+4,y+4,S-8,S-8);
          ctx.fillStyle='#d6c08f44';ctx.fillRect(x+5,y+5,S-10,2);
        }else{
          ctx.strokeStyle='#c5d1cd15';ctx.strokeRect(x+4,y+4,S-8,S-8);
          if((row*COLS+col)%5===0){ctx.fillStyle='#ceb17d55';circ(ctx,x+S/2,y+S/2,1.4);ctx.fill();}
        }
      }
      // Usable cathedral architecture. Closed leaves are collision geometry;
      // brass switches, relays and the heart share the same E interaction radius.
      for(const door of doors){
        ctx.save();ctx.translate(door.x,door.y);ctx.strokeStyle=door.open?'#a99568':'#eee3c2';ctx.fillStyle=door.open?'#171522':'#4a2430';ctx.lineWidth=2;
        if(door.open){ctx.strokeRect(-S/2+3,-S/2+2,5,S-4);ctx.strokeRect(S/2-8,-S/2+2,5,S-4);}
        else{ctx.fillRect(-S/2+3,-S/2+2,S-6,S-4);ctx.strokeRect(-S/2+3,-S/2+2,S-6,S-4);for(let x=-10;x<=10;x+=10){ctx.beginPath();ctx.moveTo(x,-14);ctx.lineTo(x,14);ctx.stroke();}}
        ctx.restore();
      }
      for(const item of switches){const door=doors.find(d=>d.id===item.doorId),near=Math.hypot(player.x-item.x,player.y-item.y)<56;ctx.save();ctx.translate(item.x,item.y);ctx.fillStyle='#251923';ctx.strokeStyle=near?'#eee3c2':GOLD;ctx.lineWidth=near?2.5:1.5;circ(ctx,0,0,10);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(door?.open?6:-6,-6);ctx.stroke();if(near)drawText(ctx,'E',0,-17,10,'#eee3c2','center');ctx.restore();}
      for(const relay of relays){const active=found>=requiredKeys,near=Math.hypot(player.x-relay.x,player.y-relay.y)<56;ctx.save();ctx.translate(relay.x,relay.y);ctx.fillStyle=relay.done?'#17251f':active?'#4a2430':'#211c28';ctx.strokeStyle=relay.done?MINT:active?'#eee3c2':'#766b62';ctx.lineWidth=2;ctx.rotate(Math.PI/4);ctx.fillRect(-11,-11,22,22);ctx.strokeRect(-11,-11,22,22);ctx.rotate(-Math.PI/4);ctx.fillStyle=relay.done?MINT:GOLD;circ(ctx,0,0,4);ctx.fill();ctx.restore();drawText(ctx,relay.done?'RELAY SILENT':active?`${near?'E · ':''}SILENCE ${relay.id.toUpperCase()}`:'SEALED RELAY',relay.x,relay.y-23,8,relay.done?MINT:GOLD,'center');}
      if(heart&&!heartTaken){const exposed=relaysDone>=requiredRelays;ctx.save();ctx.translate(heart.x,heart.y);ctx.fillStyle=exposed?'#eee3c2':'#554752';ctx.strokeStyle=exposed?'#fff1c9':'#8b7a70';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(11,-3);ctx.lineTo(7,12);ctx.lineTo(-7,12);ctx.lineTo(-11,-3);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();drawText(ctx,exposed?'E · MERIDIAN HEART':'HEART SEALED BY RELAYS',heart.x,heart.y-23,8,exposed?'#eee3c2':GOLD,'center');}
      for(const noise of noiseEvents){ctx.save();ctx.globalAlpha=clamp(noise.t/.65,0,1)*.55;ctx.strokeStyle=noise.kind==='soft-step'?'#a6d5cd':noise.kind==='mothstep'?'#e69aa3':GOLD;ctx.setLineDash([4,7]);circ(ctx,noise.x,noise.y,reduced()?noise.radius:noise.radius*(1-noise.t/.9));ctx.stroke();ctx.setLineDash([]);ctx.restore();}
      // Exit gate and lock condition.
      const exit=tile(17,5);
       ctx.fillStyle=exitOpen()?'#4caa9599':'#7c515d99';ctx.fillRect(X+16.83*S,Y+5*S,10,S);
       ctx.shadowColor=exitOpen()?MINT:PINK;ctx.shadowBlur=22;ctx.strokeStyle=exitOpen()?MINT:PINK;ctx.lineWidth=3;
      ctx.strokeRect(X+17*S+4,Y+5*S+4,S-8,S-8);ctx.shadowBlur=0;
      // Opt-in bonus fragments and required keys.
       for(const b of bonus){if(b.taken)continue;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(reduced()?0:time);
         ctx.strokeStyle='#9be7df';ctx.lineWidth=1.4;ctx.strokeRect(-7,-7,14,14);ctx.fillStyle='#9be7df';ctx.fillRect(-2,-2,4,4);ctx.restore();}
       if(!seal.taken){ctx.save();ctx.translate(seal.x,seal.y);ctx.rotate(reduced()?0:time*.45);ctx.fillStyle='#281b28';ctx.strokeStyle=GOLD;ctx.lineWidth=2;ctx.fillRect(-11,-11,22,22);ctx.strokeRect(-11,-11,22,22);ctx.rotate(reduced()?0:-time*.45);drawText(ctx,'SEAL',0,-18,9,GOLD,'center');ctx.restore();}
       if(decoy){const r=14+(reduced()?0:Math.sin(time*11)*2);ctx.save();ctx.lineWidth=1;ctx.strokeStyle='#9cf1de40';ctx.setLineDash([4,9]);circ(ctx,decoy.x,decoy.y,lureRadius());ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle=MINT;ctx.lineWidth=2;circ(ctx,decoy.x,decoy.y,Math.min(90,Math.max(0,(decoyDuration()-decoy.t)*60))+r);ctx.stroke();ctx.shadowColor=MINT;ctx.shadowBlur=18;ctx.fillStyle=MINT;circ(ctx,decoy.x,decoy.y,6);ctx.fill();ctx.restore();}
       for(const k of collectibles){if(k.taken)continue;ctx.save();ctx.translate(k.x,k.y);
        ctx.rotate(reduced()?0:-time*.7);ctx.shadowColor=GOLD;ctx.shadowBlur=19;ctx.fillStyle='#f3d79f';
        ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(12,0);ctx.lineTo(0,15);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();
         ctx.shadowBlur=0;ctx.fillStyle='#29364a';ctx.fillRect(-4,-4,8,8);ctx.restore();}
       for(const [label,col,row,color] of routes){
         const p=tile(col,row);drawText(ctx,label,p.x,p.y-24,8,color,'center');
       }
      // Sentry cones: raycast against the walls in the same 10px steps the
      // detection uses, so the cone you see is exactly the cone that sees you.
      for(const guard of [...guards,...scanners,...(warden?[warden]:[])]){
        const scanner=guard.kind==='scanner',boss=guard.kind==='warden',jammed=scanner&&scannerJam>0,stunned=guard.stunned>0||jammed||boss&&guard.phase<=0,half=guard.cone||.64;
        if(scanner){ctx.save();ctx.strokeStyle=jammed?MINT+'88':'#e8cb9155';ctx.setLineDash([4,6]);ctx.beginPath();ctx.arc(guard.x,guard.y,27,guard.baseFacing-guard.sweep,guard.baseFacing+guard.sweep);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
        ctx.save();ctx.translate(guard.x,guard.y);ctx.rotate(guard.facing);
        if(!stunned&&!guard.judgment){
          const reach=concealed()?42:(guard.reach||encounter.reach)*(veteran&&crouched()?.74:1),RAYS=15;
          ctx.beginPath();ctx.moveTo(0,0);
          for(let i=0;i<=RAYS;i++){
            const rel=-half+(i/RAYS)*half*2,abs=guard.facing+rel;
            let r=reach;
            for(let d=12;d<reach;d+=10)if(blocked(guard.x+Math.cos(abs)*d,guard.y+Math.sin(abs)*d)){r=d;break;}
            ctx.lineTo(Math.cos(rel)*r,Math.sin(rel)*r);
          }
          ctx.closePath();
          ctx.fillStyle=guard.alert>.35?'#fd85833c':scanner?'#f2d39d25':'#ffcd8d15';ctx.fill();
          ctx.strokeStyle=guard.alert>.35?'#fe9c9588':scanner?'#f2d39d66':'#efcba522';ctx.lineWidth=scanner?1.5:1;ctx.stroke();
          // Veil or stationary soft-step concealment shares this exact 42px radius.
          if(concealed()){ctx.setLineDash([3,5]);ctx.strokeStyle=MINT+'66';ctx.beginPath();ctx.arc(0,0,42,0,TAU);ctx.stroke();ctx.setLineDash([]);}
        }
        ctx.shadowBlur=stunned?10:19;ctx.shadowColor=stunned?MINT:scanner?GOLD:PINK;
        ctx.fillStyle=stunned?'#9ae2d0':guard.alert>.35?'#ff737a':scanner?'#f2cf83':'#dea7be';
        if(scanner){ctx.lineWidth=2;ctx.strokeStyle=stunned?MINT:GOLD;circ(ctx,0,0,13);ctx.stroke();ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(0,-8);ctx.lineTo(0,8);ctx.closePath();ctx.fill();ctx.fillStyle='#253142';circ(ctx,0,0,6);ctx.fill();ctx.fillStyle=stunned?MINT:GOLD;circ(ctx,3,0,2.5);ctx.fill();}
        else if(boss){ctx.fillStyle=stunned?MINT:'#eee3c2';ctx.strokeStyle='#6e3040';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(8,-16);ctx.lineTo(-13,-13);ctx.lineTo(-19,0);ctx.lineTo(-13,13);ctx.lineTo(8,16);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#4a2430';circ(ctx,0,0,7);ctx.fill();ctx.strokeStyle=GOLD;ctx.beginPath();ctx.arc(0,0,27,-1.1,1.1);ctx.stroke();}
        else{ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-9,-11);ctx.lineTo(-5,0);ctx.lineTo(-9,11);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#253142';circ(ctx,0,0,4);ctx.fill();}
        ctx.restore();
        if(boss&&guard.judgment){const j=guard.judgment;ctx.save();ctx.strokeStyle='#f0c7b5';ctx.lineWidth=5;ctx.globalAlpha=.2;ctx.beginPath();ctx.moveTo(j.ox,j.oy);ctx.lineTo(j.tx,j.ty);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle='#c65f6d';ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(j.ox,j.oy);ctx.lineTo(j.tx,j.ty);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(j.tx-12,j.ty);ctx.lineTo(j.tx+12,j.ty);ctx.moveTo(j.tx,j.ty-12);ctx.lineTo(j.tx,j.ty+12);ctx.stroke();drawText(ctx,`JUDGMENT ${Math.max(0,j.t).toFixed(1)}s · MOVE / VEIL / DOOR`,(j.ox+j.tx)/2,(j.oy+j.ty)/2-12,10,'#ffd9cf','center');ctx.restore();}
        if(boss)drawText(ctx,guard.phase<=0?'WARDEN · DORMANT':`WARDEN · OFFICE ${guard.phase}${guard.stunned>0?' · BROKEN':''}`,guard.x,guard.y-39,9,guard.phase===3?PINK:'#eee3c2','center');
        if(scanner)drawText(ctx,jammed?'SCANNER · JAMMED':guard.locked?'SCANNER · DECOY LOCK':'SCANNER · SWEEP',guard.x,guard.y-34,8,jammed?MINT:GOLD,'center');
        if(veteran&&!scanner&&!boss&&guard.state!=='patrol')drawText(ctx,guard.state==='chase'?'! CHASE':guard.state==='investigate'?'? INVESTIGATE':guard.state==='search'?'? SEARCH':'RETURN',guard.x,guard.y-34,8,guard.state==='chase'?PINK:GOLD,'center');
        if(guard.alert>0){ctx.fillStyle='#09121b';ctx.fillRect(guard.x-18,guard.y-23,36,4);
          ctx.fillStyle=PINK;ctx.fillRect(guard.x-18,guard.y-23,36*guard.alert/1.17,4);}
      }
      // Player is a four-fin glass moth. Status is visible in-world.
      ctx.save();ctx.translate(player.x,player.y);ctx.rotate(Math.atan2(player.vy||0,player.vx||1));
      if(cloak>0){ctx.shadowBlur=22;ctx.shadowColor=MINT;ctx.strokeStyle=MINT;ctx.lineWidth=1.8;circ(ctx,0,0,18+(reduced()?0:Math.sin(time*8)*2));ctx.stroke();}
      ctx.fillStyle=cloak>0?'#a7f4df':'#f4ddae';ctx.strokeStyle='#142333';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(-6,-9);ctx.lineTo(-14,-6);ctx.lineTo(-7,0);ctx.lineTo(-14,6);ctx.lineTo(-6,9);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#36566d';circ(ctx,1,0,3);ctx.fill();ctx.restore();
      if(crouched()){ctx.strokeStyle='#a6d5cd';ctx.setLineDash([2,4]);circ(ctx,player.x,player.y,20);ctx.stroke();ctx.setLineDash([]);drawText(ctx,concealed()&&cloak<=0?'STILL SHADOW':'SOFT-STEP',player.x,player.y+30,8,'#a6d5cd','center');}
      if(interaction){ctx.strokeStyle='#eee3c2';ctx.lineWidth=3;ctx.beginPath();ctx.arc(player.x,player.y,25,-Math.PI/2,-Math.PI/2+TAU*clamp(interaction.t/interaction.duration,0,1));ctx.stroke();drawText(ctx,`${interaction.kind.toUpperCase()} ${Math.max(0,interaction.duration-interaction.t).toFixed(1)}s`,player.x,player.y-31,9,'#eee3c2','center');}
      ctx.restore();
      // Inventory/controls overlay: first eight seconds double as instruction.
      ctx.fillStyle='#07121dec';ctx.fillRect(0,0,W,66);ctx.strokeStyle='#d7c29266';ctx.beginPath();ctx.moveTo(0,65);ctx.lineTo(W,65);ctx.stroke();
      drawText(ctx,'GLASS LABYRINTH',22,27,20,GOLD);
        drawText(ctx,endless?`CIRCUIT ${cycles+1} · CHAMBER ${chamber+1}`:`CHAMBER ${chamber+1} / ${activeLayouts.length}`,23,47,11,'#a6d5cd');
       drawText(ctx,`STARKEYS ${found}/${requiredKeys}`,260,28,16,found>=requiredKeys?MINT:GOLD);
      drawText(ctx,`HEARTS ${'♥'.repeat(hearts)}${'♡'.repeat(3-hearts)}`,260,48,13,PINK);
      drawText(ctx,`SCORE ${score}`,472,27,14,MINT);
        drawText(ctx,endless?`CIRCUITS ${cycles}`:`TIME ${Math.max(0,150-Math.floor(clock))}s`,472,47,11,'#b8cbc6');
      if(relics.length)drawText(ctx,relics.map(id=>id.toUpperCase()).join(' · '),618,47,9,'#d8c795','right');
       if(veteran)drawText(ctx,alarmLevel===2?'LOCKDOWN · SHARED SIGHT':alarmLevel===1?'SUSPICION · INVESTIGATING':'WATCH NETWORK · CALM',665,27,9,alarmLevel===2?PINK:GOLD,'right');
      ctx.fillStyle=cloakCd>0?'#2c3c48':'#276155';ctx.strokeStyle='#a7e6ca66';ctx.fillRect(690,11,194,46);ctx.strokeRect(690,11,194,46);
      drawText(ctx,cloakCd>0?`VEIL ${cloakCd.toFixed(1)}s`:'VEIL READY · SPACE',787,40,13,MINT,'center');
      ctx.fillStyle='#07121dec';ctx.fillRect(0,507,W,53);ctx.strokeStyle='#bdaa8e55';ctx.beginPath();ctx.moveTo(0,507);ctx.lineTo(W,507);ctx.stroke();
      drawText(ctx,'MOUSE OR WASD TO MOVE',23,527,11,'#d3e0d3');
       drawText(ctx,veteran?'SPACE VEIL · F DECOY · G JAM · SHIFT SOFT · H MOTHSTEP · E USE · P PAUSE':'SPACE / RIGHT CLICK VEIL · F THROW DECOY · P PAUSE',23,545,11,'#b4d1c8');
       drawText(ctx,decoyCd>0?`DECOY ${Math.ceil(decoyCd)}s`:'DECOY READY · F',865,552,11,MINT,'right');
        drawText(ctx,objectiveStage()==='starkeys'?`FIND ${requiredKeys} GOLDEN STARKEYS`:objectiveStage()==='relays'?`E SILENCE RELAYS ${relaysDone}/${requiredRelays}`:objectiveStage()==='heart'?'E STEAL THE MERIDIAN HEART':'GATE OPEN · REACH THE EASTERN DOOR',866,532,12,GOLD,'right');
       drawText(ctx,sealWard?'ARCHIVE WARD READY · BLOCKS ONE ALARM':seal.taken?cleanEscape?'SEAL HELD · EXIT UNHURT FOR +300':'WARD SPENT · CLEAN BONUS LOST':cleanEscape?'OPTIONAL SEAL · +300 / UNHURT EXIT +300':'SEAL +300 · CLEAN BONUS LOST',865,494,11,GOLD,'right');
      if(scanners.length)drawText(ctx,scannerJam>0?`NULL JAMMER · ${scannerJam.toFixed(1)}s · SWEEPS FROZEN`:scannerCd>0?`SCANNERS SWEEPING · JAMMER ${Math.ceil(scannerCd)}s`:'G JAM BLINDS SCANNERS · NOISE DRAWS WATCHERS',23,493,10,scannerJam>0?MINT:GOLD);
       if(message.t>0)drawText(ctx,message.text,450,77,13,GOLD,'center');
      if(roomTransition>0){ctx.fillStyle=`rgba(5,12,20,${Math.min(.8,roomTransition/1.3*.8)})`;ctx.fillRect(0,65,W,442);
         drawText(ctx,roomTitle,450,283,23,GOLD,'center');}
      if(ended){ctx.fillStyle='#07121deb';ctx.fillRect(0,65,W,442);
        drawText(ctx,win?'THE ARCHIVE IS YOURS':'THE WATCHERS REMEMBER',450,250,29,win?MINT:PINK,'center');
        drawText(ctx,`SCORE ${score.toLocaleString()}`,450,289,17,GOLD,'center');}
      if(flash>0){ctx.fillStyle=`rgba(255,101,123,${reduced()?flash*.22:flash})`;ctx.fillRect(0,65,W,442);flash=Math.max(0,flash-(reduced()?.08:.025));}
    }
    return g;
  }
  AT.register({id:'labyrinth',name:'Glass Labyrinth',place:'The sealed observatory',brief:'A four-chamber stealth roguelite: seeded chambers, encounter temperaments and a relic draft between escapes, each relic a trade. In the Triune Archive, choose any two of three routes. Veteran Sky adds two multi-stage vaults, coordinated watchers, soft-step/mothstep noise play, operable brass architecture and Meridian’s three-phase Warden.',create:labyrinth});
})();
