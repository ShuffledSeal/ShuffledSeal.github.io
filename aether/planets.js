'use strict';

window.AetherPlanets = (() => {
  const P=window.AetherPuzzles, notes=window.AetherPlanetNotes;
  // Scoped here because this module owns the puzzle presentation. The layered
  // midnight/oxblood enamel, brass rules and ivory ink stay legible in motion-
  // reduced play and do not alter the atlas or other cartridge styles.
  const puzzleStyle=document.createElement('style');puzzleStyle.dataset.puzzleIllumination='true';puzzleStyle.textContent=`
    .puzzle-workbench{background:radial-gradient(ellipse at 50% 18%,#4b1c292b,transparent 58%),repeating-linear-gradient(135deg,transparent 0 17px,#c7a76605 17px 18px),#080f1c}
    .puzzle-grid{border-color:#a8894f;box-shadow:0 0 0 3px #080d17,0 0 0 4px #6f5732,0 14px 38px #0008}
    .puzzle-cell{border-color:#b99a5830;color:#e9dfc7}.orbital-dial{border-color:#a8894f66;color:#eadfc6}
    .puzzle-replay-modes>.expedition-tab{display:inline-flex;align-items:center;gap:8px;border-color:#b88a7566}.expedition-tab small{color:#d2aaa4;font:14px/1.5 var(--sans);letter-spacing:.04em}.puzzle-replay-modes>.expedition-tab[aria-pressed=true] small{color:#49351f}.puzzle-replay-modes>.expedition-tab:disabled{border-style:dashed;opacity:.72;cursor:not-allowed}
    .grand-expedition .puzzle-readout{flex-wrap:wrap}.grand-expedition .puzzle-readout>span:first-child{max-width:100%}.grand-expedition .puzzle-readout>span:last-child{white-space:normal}
    .expedition-charter{border-color:#b5905577;border-left-color:#c6a35e;background:linear-gradient(120deg,#090f1e,#2a101c 76%,#170d18);color:#eadfc6}.expedition-charter .eyebrow{color:#d4b979}.expedition-charter strong{color:#f0d89c}
    .expedition-stage-track{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;list-style:none;padding:0;margin:13px 0 10px;counter-reset:folio}.expedition-stage-track li{min-width:0;padding:7px 6px;border:1px solid #b99a5838;background:#070d18aa;color:#b9b6aa;font-size:12px;line-height:1.35}.expedition-stage-track li b{display:grid;place-items:center;width:22px;height:22px;margin-bottom:4px;border:1px solid #b99a5866;border-radius:50%;color:#e4c985;font:15px var(--serif)}.expedition-stage-track li span{display:block;overflow-wrap:anywhere}.expedition-stage-track li.current{border-color:#d0ae67;background:#4a1b27;color:#f1e4c8}.expedition-stage-track li.sealed{border-color:#9c8953;background:#172019;color:#e1d5b8}.expedition-stage-track li.sealed b::after{content:'✦'}.expedition-stage-track li.sealed b{font-size:0}.expedition-stage-track li.sealed b::after{font-size:13px}
    .expedition-mechanism-readout{margin-top:8px!important;padding-top:8px;border-top:1px solid #b99a5838;color:#e2cda4!important;font:15px/1.5 var(--serif)!important}
    .expedition-controls{display:flex;align-items:stretch;justify-content:center;flex-wrap:wrap;gap:8px;margin:18px auto 4px;max-width:580px}.expedition-controls .button{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:2px 8px;min-width:145px;min-height:52px;padding:8px 12px;border:1px solid #b5905577;background:linear-gradient(120deg,#111c2d,#32131f);color:#f0dfbd;font:16px/1.35 var(--serif);text-align:left}.expedition-controls .button>span{grid-row:1/3;font-size:22px;color:#d9b96f}.expedition-controls .button small{display:block;color:#c5bca9;font:12px/1.4 var(--sans)}.expedition-controls .button:hover:not(:disabled){border-color:#e2c17a;background:linear-gradient(120deg,#1a2b3e,#4a1b27)}.expedition-controls .button:disabled{cursor:not-allowed;opacity:.58}.expedition-controls .button[aria-pressed=true]{border-color:#c8b477;background:#17251f;color:#eee2c5}.expedition-controls .button:focus-visible{outline:3px solid #f6d58f;outline-offset:3px}
    .expedition-warded{outline:2px solid #b65767!important;outline-offset:-4px!important;background-image:repeating-linear-gradient(45deg,transparent 0 8px,#5c18243b 8px 10px)!important}.ring-block.expedition-warded{outline-offset:-5px!important}.ring-exit.exit-west{left:-21px;right:auto;transform:rotate(180deg)}
    @media(max-width:650px){.puzzle-replay-modes>.expedition-tab{gap:4px}.expedition-stage-track{grid-template-columns:repeat(2,minmax(0,1fr))}.expedition-controls{display:grid;grid-template-columns:1fr;width:100%}.expedition-controls .button{min-width:0;width:100%;min-height:52px}.ring-exit.exit-west{left:-14px}}
    @media(prefers-reduced-motion:reduce){.expedition-controls .button,.puzzle-replay-modes>.expedition-tab{transition:none}.expedition-controls .button:hover{transform:none}}
  `;document.head.append(puzzleStyle);
  const KEY='aether-planet-puzzles-v1', ids=planets.map(p=>p.id), sessions=new Map();
  let controller, hintController, genController, current, reverse=false, painting=false, lastPaint=-1, gesture=null, ignoreClickUntil=0, observer;
  let hostHooks = {};
  const progress={records:{},drafts:{},levels:{},endless:{}};
  const REPLAY_KEY='aether-planet-replays-v1', REPLAY_VERSION=1;
  const replayProgress={daily:{},circuits:{},eclipse:{},masterwork:{},expeditions:{},last:{}};
  try {
    const raw=JSON.parse(localStorage.getItem(REPLAY_KEY));
    if(raw?.version===REPLAY_VERSION) {
      const validActions=d=>d&&Array.isArray(d.actions)&&d.actions.length<=1500;
      const result=r=>r&&Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3&&Number.isInteger(r.moves)&&r.moves>=0&&r.moves<=10000?{stars:r.stars,moves:r.moves,hints:Number.isInteger(r.hints)?Math.max(0,Math.min(999,r.hints)):0}:null;
      for(const id of ids) {
        const daily=raw.daily?.[id];
        if(daily&&/^\d{4}-\d{2}-\d{2}$/.test(daily.date)&&Number.isInteger(daily.seed)&&validActions(daily))replayProgress.daily[id]={date:daily.date,seed:daily.seed>>>0,actions:daily.actions,hints:Number.isInteger(daily.hints)?Math.max(0,Math.min(999,daily.hints)):0,result:result(daily.result)};
        const circuit=raw.circuits?.[id];
        if(circuit&&Number.isInteger(circuit.seed)&&Number.isInteger(circuit.stage)&&circuit.stage>=0&&circuit.stage<3&&validActions(circuit))replayProgress.circuits[id]={seed:circuit.seed>>>0,stage:circuit.stage,boards:Array.isArray(circuit.boards)?circuit.boards.slice(0,3).map(result).filter(Boolean):[],actions:circuit.actions,hints:Number.isInteger(circuit.hints)?Math.max(0,Math.min(999,circuit.hints)):0,result:result(circuit.result)};
        const eclipse=raw.eclipse?.[id];
        if(eclipse&&Number.isInteger(eclipse.seed)&&validActions(eclipse))replayProgress.eclipse[id]={seed:eclipse.seed>>>0,actions:eclipse.actions,hints:Number.isInteger(eclipse.hints)?Math.max(0,Math.min(999,eclipse.hints)):0,result:result(eclipse.result)};
        const masterwork=raw.masterwork?.[id];
        if(masterwork&&Number.isInteger(masterwork.seed)&&validActions(masterwork))replayProgress.masterwork[id]={seed:masterwork.seed>>>0,actions:masterwork.actions,hints:Number.isInteger(masterwork.hints)?Math.max(0,Math.min(999,masterwork.hints)):0,result:result(masterwork.result)};
        const expedition=raw.expeditions?.[id];
        if(expedition&&Number.isInteger(expedition.seed)&&Number.isInteger(expedition.stage)&&expedition.stage>=0&&expedition.stage<4) {
          const drafts=Array.from({length:4},(_,stage)=>{const draft=expedition.drafts?.[stage];return {actions:validActions(draft)?draft.actions:[],hints:Number.isInteger(draft?.hints)?Math.max(0,Math.min(999,draft.hints)):0,result:result(draft?.result)};});
          replayProgress.expeditions[id]={seed:expedition.seed>>>0,stage:expedition.stage,drafts,result:replayProgress.masterwork[id]?.result?result(expedition.result):null,unverifiedResult:result(expedition.unverifiedResult)||(!replayProgress.masterwork[id]?.result?result(expedition.result):null)};
        }
        if(['daily','circuit','eclipse','masterwork','expedition','crafted','endless'].includes(raw.last?.[id]))replayProgress.last[id]=raw.last[id];
      }
    }
  } catch { /* Replay data is isolated from all crafted/endless progress. */ }
  function saveReplay() {
    try { localStorage.setItem(REPLAY_KEY,JSON.stringify({version:REPLAY_VERSION,...replayProgress}));storageOK=true; }
    catch { storageOK=false; }
    const note=document.querySelector('#puzzle-save-note');if(note)note.textContent=storageOK?'Progress saved on this device.':'Browser storage is unavailable. Progress is kept for this visit.';
  }
  function circuitComplete(id) {return replayProgress.circuits[id]?.boards.filter(Boolean).length===3;}
  function eclipseUnlocked(id) {return Boolean(replayProgress.eclipse[id])||circuitComplete(id);}
  function unlockEclipse(id) {
    if(replayProgress.eclipse[id])return true;
    const circuit=replayProgress.circuits[id];if(!circuitComplete(id))return false;
    replayProgress.eclipse[id]={seed:replaySeed(`${id}:eclipse:${circuit.seed}`),actions:[],hints:0,result:null};
    return true;
  }
  function masterworkUnlocked(id) { return Boolean(replayProgress.masterwork[id])||Boolean(replayProgress.eclipse[id]?.result); }
  function unlockMasterwork(id) {
    if(replayProgress.masterwork[id])return true;
    const eclipse=replayProgress.eclipse[id];if(!eclipse?.result)return false;
    replayProgress.masterwork[id]={seed:replaySeed(`${id}:instruments:${eclipse.seed}`),actions:[],hints:0,result:null};
    return true;
  }
  function expeditionUnlocked(id) { return Boolean(replayProgress.masterwork[id]?.result); }
  function unlockExpedition(id) {
    const masterwork=replayProgress.masterwork[id];if(!masterwork?.result)return false;
    if(replayProgress.expeditions[id])return true;
    replayProgress.expeditions[id]={seed:replaySeed(`${id}:grand-expedition:${masterwork.seed}`),stage:0,drafts:Array.from({length:4},()=>({actions:[],hints:0,result:null})),result:null};
    return true;
  }
  const instrumented=s=>['masterwork','expedition'].includes(s.mode);
  function replayChamberResult(id,def,draft) {
    if(!draft?.result||!draft.actions.length)return false;
    let board=P.initial(id,def,6),moves=0;
    for(const action of draft.actions) {
      if(P.won(id,def,board))return false;
      const next=P.transition(id,def,board,action);if(!next)return false;
      moves+=P.actionCost(id,board,next);board=next;
    }
    const expectedStars=draft.hints?1:moves<=def.expedition.par?3:moves<=def.expedition.par*2?2:1;
    return P.won(id,def,board)&&draft.result.moves===moves&&draft.result.hints===draft.hints&&draft.result.stars===expectedStars;
  }
  function replayActiveChamber(id,def,draft) {
    if(draft.result)return false;
    let board=P.initial(id,def,6);
    for(const action of draft.actions) {
      if(P.won(id,def,board))return false;
      const next=P.transition(id,def,board,action);if(!next)return false;
      board=next;
    }
    return !P.won(id,def,board);
  }
  function validateExpedition(id,run) {
    const expedition=replayProgress.expeditions[id];if(!expedition)return false;
    const before=JSON.stringify(expedition),empty=()=>({actions:[],hints:0,result:null});
    let contiguous=0;
    while(contiguous<4&&replayChamberResult(id,run.stages[contiguous],expedition.drafts[contiguous]))contiguous++;
    let stage=expedition.stage;
    const unadvanced=contiguous>0&&stage===contiguous-1;
    if(stage!==contiguous&&!unadvanced)stage=Math.min(contiguous,3);
    // A result at the first incomplete index failed replay validation. Clear it
    // and every later draft rather than allowing a forged contiguous prefix.
    if(contiguous<4&&expedition.drafts[contiguous].result)expedition.drafts[contiguous]=empty();
    const keepThrough=unadvanced?stage:contiguous;
    for(let i=keepThrough+1;i<4;i++)expedition.drafts[i]=empty();
    expedition.stage=stage;
    if(stage<4&&contiguous<4&&!unadvanced&&!replayActiveChamber(id,run.stages[stage],expedition.drafts[stage]))expedition.drafts[stage]=empty();
    if(contiguous<4) {
      if(expedition.result&&!expedition.unverifiedResult)expedition.unverifiedResult=expedition.result;
      expedition.result=null;
    } else {
      const moves=expedition.drafts.reduce((sum,draft)=>sum+draft.result.moves,0),hints=expedition.drafts.reduce((sum,draft)=>sum+draft.result.hints,0),stars=hints?1:moves<=run.par?3:moves<=run.par*2?2:1,previous=expedition.result,derived={stars,moves,hints};
      // Only the four replayed chambers prove an overall record. A conflicting
      // legacy value is retained for data compatibility, but is never presented
      // as a verified best and never participates in progression or energy.
      if(previous&&JSON.stringify(previous)!==JSON.stringify(derived)&&!expedition.unverifiedResult)expedition.unverifiedResult=previous;
      expedition.result=derived;
    }
    const changed=before!==JSON.stringify(expedition);
    if(changed) {
      const prefix=`${id}:expedition:${expedition.seed}:`;for(const key of sessions.keys())if(key.startsWith(prefix))sessions.delete(key);
      saveReplay();
    }
    return changed;
  }
  function expeditionRecordComplete(id) {
    const expedition=replayProgress.expeditions[id];
    return Boolean(expedition?.result&&expedition.drafts.every(draft=>draft.result));
  }
  let storageOK=true;
  try {
    const raw=JSON.parse(localStorage.getItem(KEY));
    if(raw && typeof raw==='object') {
      for(const id of ids) {
        if(Number.isInteger(raw.levels?.[id]) && raw.levels[id]>=0 && raw.levels[id]<5)progress.levels[id]=raw.levels[id];
        if(Number.isInteger(raw.endless?.[id]?.best) && raw.endless[id].best>=0 && raw.endless[id].best<=10000)progress.endless[id]={best:raw.endless[id].best};
        for(let i=0;i<5;i++) {
          const key=`${id}:${i}`,r=raw.records?.[key],d=raw.drafts?.[key];
          if(r && Number.isInteger(r.stars) && r.stars>=1 && r.stars<=3 && Number.isInteger(r.moves) && r.moves>=0 && r.moves<=10000)progress.records[key]={stars:r.stars,moves:r.moves};
          if(d && Array.isArray(d.actions) && d.actions.length<=1500)progress.drafts[key]={actions:d.actions,hints:Number.isInteger(d.hints)?Math.max(0,Math.min(999,d.hints)):0};
        }
      }
    }
  } catch { /* A damaged or unavailable save never prevents a fresh puzzle. */ }
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(progress)); storageOK=true; }
    catch { storageOK=false; }
    const note=document.querySelector('#puzzle-save-note');
    if(note)note.textContent=storageOK?'Progress saved on this device.':'Browser storage is unavailable. Progress is kept for this visit.';
  }
  function session(id,index,def) {
    if(index&&typeof index==='object')return replaySession(id,index);
    const endless=index==='endless',round=endless?def.round:0,key=endless?`${id}:endless:${round}`:`${id}:${index}`;
    if(sessions.has(key))return sessions.get(key);
    const levelDef=def?.def ?? P.definition(id,index),board=P.initial(id,levelDef,endless?round:index);
    const s={id,index,key,mode:endless?'endless':'crafted',round,def:levelDef,board,initial:structuredClone(board),par:P.par(id,levelDef,board),moves:0,hints:0,actions:[],history:[],future:[],selected:0,selectedCell:-1,instrument:'primary',hintCell:-1,face:1,justDealt:true,plan:[]};
    if(!endless) {
      const draft=progress.drafts[key];
      if(draft) {
        s.hints=draft.hints;
        for(const action of draft.actions) {
          if(P.won(id,levelDef,s.board))break;
          const next=P.transition(id,levelDef,s.board,action);if(!next)break;
          s.history.push({board:s.board,moves:s.moves,action});s.actions.push(action);
          s.moves+=P.actionCost(id,s.board,next);s.board=next;
        }
      }
    }
    sessions.set(key,s);return s;
  }
  function replaySession(id,spec) {
    const mode=spec.mode,stage=spec.stage||0,seed=spec.seed>>>0,key=`${id}:${mode}:${seed}:${stage}`;
    if(sessions.has(key))return sessions.get(key);
    const levelDef=spec.def,difficulty=spec.difficulty??(mode==='daily'?2:['eclipse','masterwork','expedition'].includes(mode)?6:[1,3,5][stage]),board=P.initial(id,levelDef,difficulty);
    const s={id,index:0,key,mode,round:difficulty,def:levelDef,board,initial:structuredClone(board),par:P.par(id,levelDef,board),moves:0,hints:0,actions:[],history:[],future:[],selected:0,selectedCell:-1,instrument:'primary',hintCell:-1,face:1,justDealt:true,plan:[],replay:{seed,stage,date:spec.date||null,difficulty},expedition:spec.expedition||null};
    const draft=mode==='daily'?replayProgress.daily[id]:mode==='eclipse'?replayProgress.eclipse[id]:mode==='masterwork'?replayProgress.masterwork[id]:mode==='expedition'?replayProgress.expeditions[id]?.drafts[stage]:replayProgress.circuits[id];
    if(draft) {
      s.hints=draft.hints||0;
      for(const action of draft.actions||[]) {
        if(P.won(id,levelDef,s.board))break;
        const next=P.transition(id,levelDef,s.board,action);if(!next)break;
        s.history.push({board:s.board,moves:s.moves,action});s.actions.push(action);
        s.moves+=P.actionCost(id,s.board,next);s.board=next;
      }
    }
    sessions.set(key,s);return s;
  }
  function sessionTitle(s) {
    if(s.mode==='daily')return `Daily chart · ${s.replay.date}`;
    if(s.mode==='circuit')return `Circuit ${s.replay.stage+1} / 3 · difficulty ${s.replay.difficulty}`;
    if(s.mode==='eclipse')return `Eclipse masterwork · ${s.def.eclipse.name}`;
    if(s.mode==='masterwork')return `Masterwork instruments · ${s.def.masterwork.name}`;
    if(s.mode==='expedition')return `Grand Expedition ${s.replay.stage+1} / 4 · ${s.def.expedition.name}`;
    if(s.mode==='endless')return `Endless · board ${s.round+1}`;
    return P.catalogue[s.id].levels[s.index];
  }
  function sessionLesson(s) {
    if(s.mode==='daily')return 'A fixed, solution-backed chart for this UTC date.';
    if(s.mode==='circuit')return `Seed ${s.replay.seed} · solution-backed generated board.`;
    if(s.mode==='eclipse')return `Seed ${s.replay.seed} · verified solution · ${s.def.eclipse.budget} ${s.def.eclipse.unit} available.`;
    if(s.mode==='masterwork')return `Seed ${s.replay.seed} · verified solution · par ${s.def.masterwork.par}${s.def.masterwork.budget?` · ${s.def.masterwork.budget} ${s.def.masterwork.unit} available`:''}.`;
    if(s.mode==='expedition')return `Seed ${s.replay.seed} · chamber par ${s.par} · ${s.def.expedition.transformed?'transformed-core rules':'guided opening chamber'}${s.def.expedition.finale?' · finale':''}.`;
    if(s.mode==='endless')return 'A fresh solver-checked board.';
    return P.lessons[s.id][s.index];
  }
  function stash(s) {
    replayProgress.last[s.id]=s.mode;
    if(s.mode==='endless'){saveReplay();return;}
    if(s.mode==='daily'||s.mode==='circuit'||s.mode==='eclipse'||s.mode==='masterwork'||s.mode==='expedition') {
      const target=s.mode==='daily'?replayProgress.daily[s.id]:s.mode==='eclipse'?replayProgress.eclipse[s.id]:s.mode==='masterwork'?replayProgress.masterwork[s.id]:s.mode==='expedition'?replayProgress.expeditions[s.id]?.drafts[s.replay.stage]:replayProgress.circuits[s.id];
      if(!target)return;
      target.actions=s.actions.slice(0,1500);target.hints=s.hints;
      saveReplay();return;
    }
    progress.drafts[s.key]={actions:s.actions.slice(0,1500),hints:s.hints};
    progress.levels[s.id]=s.index;save();saveReplay();
  }
  function solvedCount(id) {return Object.keys(progress.records).filter(key=>key.startsWith(id+':')).length;}
  function courseLabel(id) {
    const best=progress.endless[id]?.best||0;
    return `${solvedCount(id)} / 5 levels completed${best?` · endless best: ${best} ${best===1?'board':'boards'}`:''}`;
  }
  function portrait(planet) {
    const specks=Array.from({length:7},(_,i)=>`<i class="plate-speck" style="--sx:${(i*37+13)%88+5}%;--sy:${(i*53+29)%88+5}%;--sd:${(i%5)*1.1}s" aria-hidden="true"></i>`).join('');
    const earthMap=`<svg class="globe-map" viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="earth-disc"><circle cx="100" cy="100" r="100"/></clipPath></defs><g clip-path="url(#earth-disc)"><path class="globe-land" d="M0 48L10 31 27 21 38 24 45 18 58 22 63 29 79 34 83 43 75 49 70 48 67 58 57 66 54 76 44 79 40 91 48 100 55 101 63 112 61 119 53 113 44 110 34 99 27 85 19 78 17 65 8 61ZM64 0L79 8 83 21 78 31 69 36 64 24 60 13ZM66 111L79 114 88 122 98 126 100 137 95 146 87 151 85 162 76 172 69 188 63 186 65 170 63 155 57 145 57 129 53 122ZM135 58L143 48 150 46 149 36 160 27 174 23 182 29 175 39 177 48 190 47 204 53 207 83 188 87 179 77 167 78 157 71 147 76 143 67 135 66ZM137 79L149 75 161 81 173 87 178 101 185 108 181 116 169 119 165 133 155 146 146 143 140 128 136 116 127 106 125 93ZM179 138L183 143 181 153 177 156 176 148ZM28 193Q65 181 91 190L119 187 146 190 179 198 136 210 63 208Z"/><g class="globe-cloud"><path d="M8 65Q34 39 60 43T103 60M11 72Q37 49 60 53M66 96Q99 81 125 92T184 98M107 41Q134 18 165 22M34 158Q62 174 101 163T166 163M25 166Q67 184 112 170"/></g><g class="globe-graticule"><ellipse cx="100" cy="100" rx="45" ry="100"/><ellipse cx="100" cy="100" rx="83" ry="100"/><path d="M0 100H200M10 55Q100 78 190 55M10 145Q100 123 190 145"/></g></g></svg><span class="globe-shade"></span>`;
    return `<figure class="planet-plate" aria-label="Illustrated portrait of ${planet.name}"><div class="plate-orbit orbit-outer"></div><div class="plate-orbit orbit-inner"></div><span class="plate-axis" aria-hidden="true"></span><span class="plate-coordinate plate-north" aria-hidden="true">N</span><span class="plate-coordinate plate-west" aria-hidden="true">270°</span><span class="plate-coordinate plate-east" aria-hidden="true">90°</span>${specks}<span class="atlas-sphere planet-sphere ${planet.id}" aria-hidden="true">${planet.id==='earth'?earthMap:''}</span><figcaption>FIG. ${String(ids.indexOf(planet.id)+1).padStart(2,'0')} <span>${planet.name.toUpperCase()} / ILLUSTRATED PLATE</span></figcaption></figure>`;
  }
  function renderPage(id) {
    const planet=planets.find(p=>p.id===id),data=notes[id],game=P.catalogue[id],i=ids.indexOf(id);
    return `<article class="planet-page view-enter" style="--planet-accent:${planet.color}">
      <nav class="planet-trail" aria-label="Planet pages"><a href="#planetarium">${icon('chevron-left')} All planets</a><div>${planets.map((p,j)=>`<a href="#planet/${p.id}" ${p.id===id?'aria-current="page"':''} aria-label="${p.name}"><span>${String(j+1).padStart(2,'0')}</span>${p.name}</a>`).join('')}</div></nav>
      <header class="atlas-hero"><div class="atlas-heading"><p class="eyebrow">THE PLANETARY ATLAS <span>PLATE ${String(i+1).padStart(2,'0')} / VIII</span></p><h1>${planet.name}</h1><p class="atlas-deck">${data.heading}</p><p class="atlas-intro">${data.intro}</p><div class="atlas-actions"><button class="button button-primary" data-atlas="play">Play ${game.title} ${icon('arrow-right')}</button><button class="text-link" data-atlas="read">Read the field notes ↓</button></div><p class="atlas-game-caption">${game.genre} <span>Five levels plus endless · ${game.time} per puzzle</span></p></div>${portrait(planet)}</header>
      <dl class="atlas-facts reveal">${[['From the Sun',planet.distance],['Mean diameter',planet.diameter],['Orbital period',planet.period<700?`${planet.period} Earth days`:`${(planet.period/365.25).toFixed(1)} Earth years`],data.facts[0]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
      <section class="planet-puzzle reveal" id="planet-puzzle" aria-labelledby="puzzle-title"><header class="puzzle-heading"><div><p class="eyebrow">THE PUZZLE ROOM / ${planet.name.toUpperCase()}</p><h2 id="puzzle-title">${game.title}</h2><p>${game.lead}</p></div><span class="puzzle-course" id="puzzle-course">${courseLabel(id)}</span></header><div id="planet-game"></div></section>
      <section class="atlas-notes reveal" id="planet-notes" aria-labelledby="notes-title"><header class="atlas-section-heading"><p class="eyebrow">FIELD NOTES</p><h2 id="notes-title">Getting to know ${planet.name}.</h2></header><div class="atlas-reading"><div class="atlas-chapters">${data.chapters.map(([title,text],j)=>`<section><span class="chapter-number">0${j+1}</span><div><h3>${title}</h3><p>${text}</p></div></section>`).join('')}</div><aside class="atlas-margin"><p class="eyebrow">REFERENCE CARD</p><dl>${data.facts.slice(1).concat([['Sidereal rotation',planet.day],['Classification',planet.type]]).map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p>Values are rounded. For the giant planets, “surface” measurements refer to a chosen atmospheric level.</p><div class="atlas-save">${saveButton(id)}<button class="button" data-action="new-entry" data-subject="${planet.name}">${icon('edit')}Make a field note</button></div></aside></div></section>
      <section class="atlas-features reveal" aria-labelledby="features-title"><header class="atlas-section-heading"><p class="eyebrow">A CLOSER LOOK</p><h2 id="features-title">Three things to notice.</h2></header><div>${data.places.map(([title,text],j)=>`<article><span class="feature-mark" aria-hidden="true">${['Ⅰ','Ⅱ','Ⅲ'][j]}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div></section>
      <div class="atlas-bottom reveal"><section class="atlas-missions" aria-labelledby="missions-title"><p class="eyebrow">FROM THE RECORD</p><h2 id="missions-title">How we know.</h2>${data.missions.map(([year,title,text])=>`<article><span>${year}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</section><aside class="atlas-observation"><p class="eyebrow">AT THE EYEPIECE</p><h2>Observe ${planet.name}.</h2><p>${data.observation}</p><a href="https://science.nasa.gov/${id}/facts/" target="_blank" rel="noopener noreferrer">NASA’s ${planet.name} fact sheet ${icon('arrow-up-right')}<span class="sr-only"> (opens in a new tab)</span></a><small>Reference: NASA Solar System Exploration. The puzzles are abstractions; each explains its connection to the planet.</small></aside></div>
      <nav class="atlas-next" aria-label="Continue through the planets">${i>0?`<a href="#planet/${ids[i-1]}"><small>← PREVIOUS PLANET</small><span>${planets[i-1].name}</span></a>`:'<a href="#planetarium"><small>← THE COMPLETE ATLAS</small><span>All eight planets</span></a>'}${i<7?`<a href="#planet/${ids[i+1]}"><small>NEXT PLANET →</small><span>${planets[i+1].name}</span></a>`:'<a href="#planet/mercury"><small>BACK TO THE INNER PLANETS →</small><span>Mercury</span></a>'}</nav>
    </article>`;
  }
  function renderIndex() {
    return `<section class="planet-atlas-index" aria-labelledby="atlas-index-title"><header class="atlas-section-heading"><p class="eyebrow">EIGHT PLANETS / EIGHT PUZZLE ROOMS</p><h2 id="atlas-index-title">Choose a world.</h2><p>Read its field notes, then try a puzzle built around something that makes it different.</p></header><div class="atlas-card-grid">${planets.map((p,i)=>`<a class="atlas-card" href="#planet/${p.id}" style="--planet-accent:${p.color}"><span class="atlas-card-number">0${i+1} <span>${p.distance}</span></span><span class="atlas-sphere planet-sphere ${p.id}" aria-hidden="true"></span><h3>${p.name}</h3><p>${notes[p.id].heading}</p><span class="atlas-card-game">${P.catalogue[p.id].title} <span>↗</span></span><small>${P.catalogue[p.id].genre} · ${solvedCount(p.id)}/5 solved${progress.endless[p.id]?.best?` · endless ×${progress.endless[p.id].best}`:''}</small></a>`).join('')}</div></section>`;
  }
  function expeditionPriorMoves(s) {
    if(s.mode!=='expedition')return 0;
    const drafts=replayProgress.expeditions[s.id]?.drafts||[];
    return drafts.slice(0,s.replay.stage).reduce((sum,draft)=>sum+(draft.result?.moves||0),0);
  }
  function moveLimit(s) {
    if(s.mode==='expedition')return Math.max(0,(s.expedition?.energy??0)-expeditionPriorMoves(s));
    if(s.mode==='eclipse')return s.def.eclipse?.budget??Infinity;
    if(s.mode==='masterwork')return s.def.masterwork?.budget??Infinity;
    return s.id==='neptune'?s.par+3:Infinity;
  }
  function reserveText(s) {
    const limit=moveLimit(s),remaining=Math.max(0,limit-s.moves),queued=s.id==='jupiter'?(s.plan||[]).reduce((sum,n)=>sum+(n||0),0):0;
    if(s.mode==='expedition')return `Shared energy ${remaining} / ${s.expedition.energy}${expeditionPriorMoves(s)?` · ${expeditionPriorMoves(s)} spent in earlier chambers`:''}${queued?` · ${queued} queued`:''}`;
    if(s.mode==='masterwork'&&!Number.isFinite(limit))return `${s.def.masterwork.name} · verified par ${s.par}`;
    return `Reserve ${remaining} / ${limit} · ${(s.mode==='masterwork'?s.def.masterwork:s.def.eclipse).unit}${queued?` · ${queued} queued`:''}`;
  }
  function reserveSpent(s) {return s.mode==='expedition'?'Shared expedition energy spent. Undo a move or restart this chamber; Reset run recovers energy overspent in earlier chambers.':['eclipse','masterwork'].includes(s.mode)?`${s.mode==='eclipse'?'Eclipse':'Masterwork'} reserve spent. Undo a move or restart to recover it.`:'Out of fuel. Undo a leg or restart to plan a shorter route.';}
  function gameShell(s) {
    const game=P.catalogue[s.id],guideRules=s.mode==='expedition'?s.def.expedition.rule:s.mode==='masterwork'?s.def.masterwork.instruction:game.rules,guideDetail=s.mode==='expedition'?s.def.expedition.tips[0]:s.mode==='masterwork'?s.def.masterwork.tips[0]:game.detail;
    const tabs=game.levels.map((name,i)=>{const record=progress.records[`${s.id}:${i}`];return `<button data-puzzle-level="${i}" aria-pressed="${s.mode==='crafted'&&i===s.index}" aria-label="Level ${i+1}: ${name}${record?`, completed, ${record.stars} stars`:''}"><span>0${i+1}</span><span>${name}</span><small aria-hidden="true">${record?'✦'.repeat(record.stars):'—'}</small></button>`;}).join('')
      +`<button class="endless-tab" data-puzzle-level="endless" aria-pressed="${s.mode==='endless'}" aria-label="Endless mode${progress.endless[s.id]?.best?`, furthest: board ${progress.endless[s.id].best}`:''}"><span>∞</span><span>Endless</span><small aria-hidden="true">${progress.endless[s.id]?.best?'×'+progress.endless[s.id].best:'—'}</small></button>`;
    const unlocked=eclipseUnlocked(s.id),seals=replayProgress.circuits[s.id]?.boards.filter(Boolean).length||0,instruments=masterworkUnlocked(s.id),expedition=expeditionUnlocked(s.id);
    const eclipseLabel=unlocked?'Eclipse masterwork':'Eclipse masterwork, locked; seal all three circuit charts to unlock';
    const instrumentLabel=instruments?'Masterwork instruments':'Masterwork instruments, locked; seal this planet’s Eclipse board to unlock';
    const expeditionLabel=expedition?'Grand Expedition, four linked chambers':'Grand Expedition, locked; seal this planet’s Instruments chart to unlock';
    const replayBar=`<nav class="puzzle-replay-modes" aria-label="Puzzle replay charts"><button data-replay="crafted" aria-pressed="${s.mode==='crafted'||s.mode==='endless'}">Crafted course</button><button data-replay="daily" aria-pressed="${s.mode==='daily'}">Daily chart</button><button data-replay="circuit" aria-pressed="${s.mode==='circuit'}">Three-board circuit</button><button class="eclipse-tab" data-replay="eclipse" aria-pressed="${s.mode==='eclipse'}" aria-label="${eclipseLabel}" ${unlocked?'':'disabled'}><span>Eclipse</span><small>${unlocked?'Masterwork':`${seals} / 3 to unlock`}</small></button><button class="masterwork-tab" data-replay="masterwork" aria-pressed="${s.mode==='masterwork'}" aria-label="${instrumentLabel}" ${instruments?'':'disabled'}><span>Instruments</span><small>${instruments?'New rules':'Seal Eclipse'}</small></button><button class="expedition-tab" data-replay="expedition" aria-pressed="${s.mode==='expedition'}" aria-label="${expeditionLabel}" ${expedition?'':'disabled'}><span>Expedition</span><small>${expedition?'4 chambers':'Seal Instruments'}</small></button>${s.mode==='circuit'?`<label class="replay-seed">Seed <input id="replay-seed" type="text" inputmode="numeric" pattern="[0-9]*" value="${s.replay.seed}" aria-label="Circuit seed" /></label><button data-replay-action="apply-seed">Deal seed</button>`:''}</nav>`;
    const charter=s.mode==='eclipse'?`<section class="eclipse-charter" aria-label="Eclipse modifier"><div><p class="eyebrow">ECLIPSE MODIFIER / ${s.def.eclipse.name.toUpperCase()}</p><p>${s.def.eclipse.rule}</p></div><strong id="eclipse-reserve">${reserveText(s)}</strong></section>`:s.mode==='masterwork'?`<section class="eclipse-charter" aria-label="Masterwork alternate rules"><div><p class="eyebrow">MASTERWORK INSTRUMENT / ${s.def.masterwork.name.toUpperCase()}</p><p>${s.def.masterwork.rule}</p></div><strong id="eclipse-reserve">${reserveText(s)}</strong></section>`:s.mode==='expedition'?`<section class="eclipse-charter expedition-charter" aria-label="Grand Expedition linked rules"><div><p class="eyebrow">GRAND EXPEDITION / ${s.expedition.name.toUpperCase()}</p><p>${s.def.expedition.rule}</p><ol class="expedition-stage-track" aria-label="Four expedition chambers">${s.expedition.stageNames.map((name,i)=>`<li class="${i<s.replay.stage?'sealed':i===s.replay.stage?'current':''}" aria-current="${i===s.replay.stage?'step':'false'}"><b>${i+1}</b><span>${name}</span></li>`).join('')}</ol><p class="expedition-mechanism-readout" id="expedition-mechanism">${s.def.expedition.mechanism}: position ${s.board.dial+1} / ${s.def.expedition.period} · wards ${s.board.seals.filter(Boolean).length} / ${s.board.seals.length}</p></div><strong id="eclipse-reserve">${reserveText(s)}</strong></section>`:'';
    return `${replayBar}<div class="puzzle-levels endless-strip" role="group" aria-label="Choose a puzzle level">${tabs}</div>
      <div class="puzzle-layout${instrumented(s)?' masterwork-instruments':''}${s.mode==='expedition'?' grand-expedition':''}"><div class="puzzle-workbench"><div class="puzzle-readout"><span id="puzzle-level-name">${sessionTitle(s)} <small class="puzzle-lesson">${sessionLesson(s)}</small></span><span><b id="puzzle-moves">${s.moves}</b> moves <span id="puzzle-par"></span></span></div><p id="puzzle-instruction" class="puzzle-instruction"></p>${charter}<div id="puzzle-board" class="board-wrap"></div><div id="puzzle-controls"></div><div class="puzzle-tools"><button class="button" data-puzzle="undo">↶ Undo</button><button class="button" data-puzzle="redo">↷ Redo</button><button class="button" data-puzzle="hint">Hint</button><button class="button" data-puzzle="restart">Restart</button>${s.mode==='expedition'?'<button class="button" data-puzzle="replay-expedition" title="Clear all four current chamber drafts and restart the expedition; older charts and the expedition best are preserved">Reset run</button>':''}</div><p id="puzzle-status" class="puzzle-status" role="status" aria-live="polite"></p><div id="puzzle-result" class="puzzle-result" hidden></div></div>
      <aside class="puzzle-guide"><p class="eyebrow">HOW TO PLAY</p><h3>${game.lead}</h3><p>${guideRules}</p><p class="puzzle-legend">${game.legend}</p><details open><summary>A useful starting point</summary><p>${guideDetail}</p></details><details><summary>Why ${planets.find(p=>p.id===s.id).name}?</summary><p>${game.connection}</p></details><details><summary>Daily charts & circuits</summary><p>Daily charts use one fixed UTC date and one solution-backed board. A circuit deals three boards at difficulties 1, 3 and 5 from a shareable seed. Replays save separately from the five handcrafted levels and endless records.</p></details><details ${['eclipse','masterwork'].includes(s.mode)?'open':''}><summary>Eclipse & masterwork instruments</summary><p>Seal all three circuit charts on this planet to unlock its original fixed Eclipse board. Seal that board to unlock a separate Instruments chart with a genuinely different instrument or topology, a verified action plan, and its own draft and best record. Both layers are optional and never replace standard play.</p></details><details ${s.mode==='expedition'?'open':''}><summary>Grand Expedition · four linked chambers</summary><p>Seal Instruments to unlock this optional expedition. Three chambers and a finale combine the instrument rules with deterministic moving mechanisms and ordered wards. Every chamber has a solution-backed plan. Energy is shared across all four stages; undo and chamber restart restore energy, while earlier sealed chambers keep their actual cost. Expedition drafts and records are additive and never alter other charts.</p></details><details><summary>Endless mode</summary><p>After the five crafted boards, endless mode deals fresh, solver-checked boards that grow a little larger and busier each round. Hints still work there.</p></details><div class="puzzle-record"><span class="eyebrow">YOUR RECORD</span><p id="puzzle-best"></p><small>Three stars: at or below par, without hints. Two: within twice par, without hints. Every solved puzzle earns a star.</small></div><p class="puzzle-save-note" id="puzzle-save-note">${storageOK?'Progress saved on this device.':'Browser storage is unavailable. Progress is kept for this visit.'}</p><p class="puzzle-keyboard">Keyboard: ${s.id==='jupiter'?(instrumented(s)?'arrows move between moons · Enter or Space uses the selected instrument · L launches queued burns':'arrows move between moons · Enter or Space queues a burn · L launches the plan'):['mercury','venus','earth'].includes(s.id)?'arrows to move focus, Enter or Space to play':'arrow keys to move, or swipe'} · Z undo · Y redo${s.mode==='expedition'?' · C turns the mechanism · 1 / 2 opens an aligned ward':''}. No timer.</p></aside></div>`;
  }
  function instrumentControls(s,items) {
    if(!instrumented(s))return '';
    return `<div class="burn-plan instrument-picker" role="group" aria-label="Choose puzzle instrument"><span class="burn-plan-title">Instrument</span>${items.map(([value,label,disabled=false])=>`<button class="button ${s.instrument===value?'button-primary':''}" data-puzzle-instrument="${value}" aria-pressed="${s.instrument===value}" ${disabled?'disabled':''}>${label}</button>`).join('')}</div>`;
  }
  function expeditionControls(s) {
    if(s.mode!=='expedition')return '';
    const exp=s.def.expedition;
    return `<div class="expedition-controls" role="group" aria-label="Expedition mechanism and ordered wards"><button class="button expedition-cycle" data-puzzle-mechanism="cycle" aria-label="${exp.cycleLabel}. Current position ${s.board.dial+1} of ${exp.period}. Keyboard C"><span>✥</span> ${exp.cycleLabel} <small>C · ${s.board.dial+1}/${exp.period}</small></button>${exp.seals.map((seal,i)=>{const open=s.board.seals[i],aligned=s.board.dial===seal.at,available=i===0||s.board.seals[i-1];return `<button class="button expedition-seal" data-puzzle-mechanism="${i}" aria-label="${exp.sealName} ${i+1}, ${open?'open':aligned?'aligned and ready':`requires position ${seal.at+1}`}. Keyboard ${i+1}" ${open||!aligned||!available?'disabled':''} aria-pressed="${open}"><span>${open?'✦':'⚿'}</span> ${exp.sealName} ${i+1}<small>${open?'Opened':`Ward at ${seal.at+1} · key ${i+1}`}</small></button>`;}).join('')}</div>`;
  }
  function controls(s) {
    if(s.id==='mercury')return expeditionControls(s)+instrumentControls(s,[['primary','✚ Cross'],['diagonal','◇ Prism']]);
    if(s.id==='venus')return expeditionControls(s)+(instrumented(s)?instrumentControls(s,[['primary','↷ Turn'],['mirror','↔ Mirror']]):`<button class="button rotation-toggle" data-puzzle="reverse" aria-pressed="${reverse}">${reverse?'↶ Turn anticlockwise':'↷ Turn clockwise'}</button>`);
    if(s.id==='jupiter') {
      const total=(s.plan||[]).reduce((a,c)=>a+(c||0),0);
      const chips=P.moonNames.slice(0,s.def.count).map((moon,i)=>{
        const c=s.plan[i]||0;
        return `<span class="burn-chip ${c?'':'empty'}"><b>${moon}</b> ×${c}<button data-puzzle-unburn="${i}" aria-label="Remove one queued ${moon} burn" ${c?'':'disabled'}>−</button></span>`;
      }).join('');
      return expeditionControls(s)+instrumentControls(s,[['primary','Queue burn'],['swap','⇄ Exchange']])+`<div class="burn-plan" role="group" aria-label="Queued burn plan"><span class="burn-plan-title">Burn plan</span>${chips}<button class="button button-primary" data-puzzle="launch" ${total?'':'disabled'}>Launch plan · ${total} burn${total===1?'':'s'}</button><button class="button" data-puzzle="clear-plan" ${total?'':'disabled'}>Clear plan</button></div>`;
    }
    if(s.id==='earth')return expeditionControls(s);
    if(!['mars','saturn','uranus','neptune'].includes(s.id))return '';
    const picker=s.id==='mars'?instrumentControls(s,[['primary','Push / walk'],['winch',`Winch · ${s.board.winches??0} left`,!s.board.winches]]):s.id==='uranus'?instrumentControls(s,[['primary','Tilt all'],['anchor','Anchor selected',s.selectedCell<0]]):s.id==='neptune'?instrumentControls(s,[['primary','Wind ride'],['pulse','1-square Pulse']]):'';
    const rotate=instrumented(s)&&s.id==='saturn'?`<div class="burn-plan"><button class="button" data-puzzle="rotate-block" ${s.selected>0&&s.def.blocks[s.selected]?.len===3?'':'disabled'}>↻ Rotate selected 90°</button></div>`:'';
    return expeditionControls(s)+picker+rotate+`<div class="puzzle-direction-pad" role="group" aria-label="${s.id==='uranus'?'Tilt direction':'Movement controls'}">${[3,0,2,1].map(d=>`<button class="button" data-puzzle-direction="${d}" aria-label="${s.id==='uranus'?'Tilt':'Move'} ${P.directionNames[d]}">${['↑','→','↓','←'][d]}</button>`).join('')}<span>${s.id==='saturn'?`Selected: ${s.selected===0?'probe P':`block ${s.selected}`}`:s.id==='uranus'?(s.instrument==='anchor'?'Selected capsule stays fixed':'All capsules move together'):s.id==='neptune'?`${Number.isFinite(moveLimit(s))?Math.max(0,moveLimit(s)-s.moves):'∞'} fuel charges`:'Move the rover'}</span></div>`;
  }
  function glidePiece(el,x,y,animate) {
    const oldX=Number(el.dataset.x??x),oldY=Number(el.dataset.y??y),moving=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&(oldX!==x||oldY!==y);
    // Capture the actual visual position, including an in-flight transform,
    // before committing the next logical target. Rapid inputs never snap to
    // the previous destination first.
    const current=moving?el.getBoundingClientRect():null;
    if(moving)el.getAnimations().forEach(animation=>animation.cancel());
    el.dataset.x=x;el.dataset.y=y;el.style.setProperty('--x',x);el.style.setProperty('--y',y);
    if(!moving)return;
    const target=el.getBoundingClientRect(),dx=current.left-target.left,dy=current.top-target.top;
    el.classList.add('is-gliding');
    const animation=el.animate([{transform:`translate(${dx}px,${dy}px)`,offset:0},{transform:'translate(0,0)',offset:1}],{duration:300,easing:'cubic-bezier(.2,.78,.25,1)'});
    animation.onfinish=()=>{el.classList.remove('is-gliding');animation.cancel();};
  }
  function syncPieces(s,won,animate=false) {
    const wrap=document.querySelector('#puzzle-board');if(!wrap)return;
    let layer=wrap.querySelector('.pieces-layer');
    const hasPieces=['mars','uranus','neptune','saturn'].includes(s.id);
    if(!hasPieces){layer?.remove();return;}
    if(!layer || layer.dataset.key!==s.key) {
      layer?.remove();
      wrap.insertAdjacentHTML('beforeend',P.piecesHTML(s.id,s.def,s.board,{face:s.face,selected:s.selected,hintCell:s.hintCell,deal:s.justDealt}));
      wrap.querySelector('.pieces-layer').dataset.key=s.key;
      return;
    }
    const n=s.id==='saturn'?6:s.def.n,pos=p=>({x:p%n,y:Math.floor(p/n)});
    if(s.id==='saturn') {
      layer.querySelectorAll('.ring-block').forEach((el,i)=>{
        const b=s.def.blocks[i],{axis,x,y}=P.blockGeometry(s.def,s.board,i);
        glidePiece(el,x,y,animate);el.style.setProperty('--w',axis==='h'?b.len:1);el.style.setProperty('--h',axis==='v'?b.len:1);
        el.querySelector('small').textContent=axis==='h'?'↔':'↕';
        el.classList.toggle('selected',s.selected===i);el.classList.toggle('hinted',s.hintCell===i);
        const ward=s.def.expedition?s.def.expedition.seals.findIndex(seal=>seal.targets.includes(i)):-1,warded=ward>=0&&!s.board.seals[ward];el.classList.toggle('expedition-warded',warded);
        el.setAttribute('aria-label',`${i===0?'Probe P':`Block ${i}`} · ${axis==='h'?'horizontal':'vertical'}${warded?` · sealed by ward ${ward+1}`:''}`);
        el.setAttribute('aria-pressed',String(s.selected===i));
      });
      return;
    }
    const pieces=layer.querySelectorAll('.piece');
    if(s.id==='mars') {
      s.board.crates.forEach((p,i)=>{const{x,y}=pos(p),el=pieces[i];glidePiece(el,x,y,animate);el.classList.toggle('stored',s.def.goals.includes(p));});
      const rover=pieces[s.board.crates.length],{x,y}=pos(s.board.player);
      glidePiece(rover,x,y,animate);rover.style.setProperty('--face',[270,0,90,180][s.face]+'deg');
    } else if(s.id==='uranus') {
      s.board.balls.forEach((p,i)=>{const{x,y}=pos(p),el=pieces[i];glidePiece(el,x,y,animate);el.classList.toggle('docked',s.def.goals.includes(p));});
    } else {
      const probe=pieces[0],{x,y}=pos(s.board.player);
      glidePiece(probe,x,y,animate);probe.style.setProperty('--face',[270,0,90,180][s.face]+'deg');
    }
  }
  function paint(message,focusSelector) {
    const s=current;if(!s)return;
    const active=document.activeElement;
    let focus=focusSelector;
    if(!focus && active?.closest('#planet-game')) {
      const key=['puzzleCell','puzzleMoon','puzzleBlock','puzzleDirection','puzzleUnburn','puzzleInstrument','puzzleMechanism','puzzle','puzzleLevel'].find(key=>active.dataset[key]!==undefined);
      if(key)focus=`[data-${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}="${active.dataset[key]}"]`;
    }
    const won=P.won(s.id,s.def,s.board);
    const wrap=document.querySelector('#puzzle-board');
    const gridHTML=P.boardHTML(s.id,s.def,s.board,{selected:s.selected,selectedCell:s.selectedCell,instrument:s.instrument,hintCell:s.hintCell,deal:s.justDealt,won,changed:s.changed,face:s.face,plan:s.plan});
    const oldGrid=wrap.querySelector('.puzzle-grid, .orbital-dials'),animatePieces=Boolean(s.motion)&&!s.justDealt;
    if(oldGrid)oldGrid.outerHTML=gridHTML;else wrap.innerHTML=gridHTML;
    wrap.querySelector('.puzzle-grid, .orbital-dials')?.classList.toggle('is-blocked',Boolean(s.blocked));
    syncPieces(s,won,animatePieces);
    if(won&&!wrap.querySelector('.puzzle-celebration'))wrap.insertAdjacentHTML('beforeend',`<div class="puzzle-celebration" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--spark:${i};--angle:${i*20}deg"></i>`).join('')}</div>`);
    if(!won)wrap.querySelector('.puzzle-celebration')?.remove();
    s.justDealt=false;s.changed=null;s.motion=false;s.blocked=false;
    const guide=document.querySelector('#puzzle-instruction');if(guide)guide.textContent=P.instruction(s.id,s.def,s.board);
    document.querySelector('#puzzle-controls').innerHTML=controls(s);
    const reserve=document.querySelector('#eclipse-reserve');if(reserve)reserve.textContent=reserveText(s);
    const mechanism=document.querySelector('#expedition-mechanism');if(mechanism)mechanism.textContent=`${s.def.expedition.mechanism}: position ${s.board.dial+1} / ${s.def.expedition.period} · wards ${s.board.seals.filter(Boolean).length} / ${s.board.seals.length}`;
    const eclipseTab=document.querySelector('.eclipse-tab');if(eclipseTab){const open=eclipseUnlocked(s.id),seals=replayProgress.circuits[s.id]?.boards.filter(Boolean).length||0;eclipseTab.disabled=!open;eclipseTab.setAttribute('aria-label',open?'Eclipse masterwork':'Eclipse masterwork, locked; seal all three circuit charts to unlock');const small=eclipseTab.querySelector('small');if(small)small.textContent=open?'Masterwork':`${seals} / 3 to unlock`;}
    const masterworkTab=document.querySelector('.masterwork-tab');if(masterworkTab){const open=masterworkUnlocked(s.id);masterworkTab.disabled=!open;masterworkTab.setAttribute('aria-label',open?'Masterwork instruments':'Masterwork instruments, locked; seal this planet’s Eclipse board to unlock');const small=masterworkTab.querySelector('small');if(small)small.textContent=open?'New rules':'Seal Eclipse';}
    const expeditionTab=document.querySelector('.expedition-tab');if(expeditionTab){const open=expeditionUnlocked(s.id);expeditionTab.disabled=!open;expeditionTab.setAttribute('aria-label',open?'Grand Expedition, four linked chambers':'Grand Expedition, locked; seal this planet’s Instruments chart to unlock');const small=expeditionTab.querySelector('small');if(small)small.textContent=open?'4 chambers':'Seal Instruments';}
    document.querySelector('#puzzle-moves').textContent=s.moves;
    document.querySelector('#puzzle-par').textContent=s.par===null?'':` / par ${s.par}`;
    document.querySelector('[data-puzzle="undo"]').disabled=!s.history.length;
    document.querySelector('[data-puzzle="redo"]').disabled=!s.future.length;
    document.querySelector('[data-puzzle="hint"]').disabled=won;
    const replayRecord=s.mode==='daily'?replayProgress.daily[s.id]?.result:s.mode==='eclipse'?replayProgress.eclipse[s.id]?.result:s.mode==='masterwork'?replayProgress.masterwork[s.id]?.result:s.mode==='expedition'?replayProgress.expeditions[s.id]?.result:s.mode==='circuit'?replayProgress.circuits[s.id]?.result:null;
    const record=s.mode==='endless'||s.mode==='daily'||s.mode==='circuit'||s.mode==='eclipse'||s.mode==='masterwork'||s.mode==='expedition'?replayRecord:progress.records[s.key];
    document.querySelector('#puzzle-best').textContent=s.mode==='endless'
      ? `Endless: ${progress.endless[s.id]?.best||0} boards cleared`
      : s.mode==='eclipse'?`Eclipse: ${record?`${'✦'.repeat(record.stars)} · best ${record.moves} moves`:'not sealed yet'}`
      : s.mode==='masterwork'?`Instruments: ${record?`${'✦'.repeat(record.stars)} · best ${record.moves} moves`:'not sealed yet'}`
      : s.mode==='expedition'?`Expedition: ${record?`${'✦'.repeat(record.stars)} · best ${record.moves} energy`:`${replayProgress.expeditions[s.id]?.drafts.filter(draft=>draft.result).length||0} / 4 chambers sealed`}`
      : s.mode==='circuit'?`Circuit: ${replayProgress.circuits[s.id]?.boards.length||0} / 3 charts sealed${record?` · this chart ${record.moves} moves`:''}`
      : record?`${'✦'.repeat(record.stars)} · Best: ${record.moves} moves`:'Not solved yet.';
    document.querySelector('#puzzle-status').textContent=message||P.progress(s.id,s.def,s.board);
    const result=document.querySelector('#puzzle-result');
    result.hidden=!won;
    if(won)result.innerHTML=`<p class="eyebrow">SURVEY COMPLETE</p><h3 id="puzzle-result-title" tabindex="-1">${s.hosted?'Survey complete.':s.mode==='daily'||s.mode==='circuit'?'Chart sealed.':s.mode==='eclipse'?'Eclipse sealed.':s.mode==='masterwork'?'Masterwork sealed.':s.mode==='expedition'?(s.replay.stage===3?(expeditionRecordComplete(s.id)?'Grand Expedition sealed.':'Finale board sealed · run incomplete.'):`Chamber ${s.replay.stage+1} sealed.`):s.mode==='endless'?'Board cleared.':s.index===4?'All the way through.':'Route resolved.'}</h3><p>${s.moves} moves · ${s.hints?s.hints+' hints used':'No hints'}${s.par===null?'':` · Par ${s.par}`}</p>${resultHTML(s)}`;
    if(focus){const target=document.querySelector(focus);if(target&&!target.disabled)target.focus({preventScroll:true});else if(s.mode==='expedition')document.querySelector('.expedition-cycle')?.focus({preventScroll:true});}
  }
  function recordWin(s) {
    if(s.mode==='expedition') {
      const expedition=replayProgress.expeditions[s.id],draft=expedition?.drafts[s.replay.stage];if(!draft)return;
      const stars=s.hints?1:s.moves<=s.par?3:s.moves<=s.par*2?2:1;
      draft.result={stars,moves:s.moves,hints:s.hints};
      if(s.replay.stage===3) {
        if(expedition.drafts.every(stage=>stage.result)) {
          const moves=expedition.drafts.reduce((sum,stage)=>sum+stage.result.moves,0),hints=expedition.drafts.reduce((sum,stage)=>sum+stage.result.hints,0),finalStars=hints?1:moves<=s.expedition.par?3:moves<=s.expedition.par*2?2:1,previous=expedition.result;
          expedition.result={stars:Math.max(finalStars,previous?.stars||0),moves:Math.min(moves,previous?.moves??Infinity),hints};
        } else expedition.result=null;
      }
      saveReplay();return;
    }
    if(s.mode==='daily'||s.mode==='circuit'||s.mode==='eclipse'||s.mode==='masterwork') {
      const stars=s.hints?1:s.moves<=(s.par??Infinity)?3:s.moves<=(s.par??Infinity)*2?2:1;
      const target=s.mode==='daily'?replayProgress.daily[s.id]:s.mode==='eclipse'?replayProgress.eclipse[s.id]:s.mode==='masterwork'?replayProgress.masterwork[s.id]:replayProgress.circuits[s.id];if(!target)return;
      const result={stars,moves:s.moves,hints:s.hints},previous=target.result;
      target.result={stars:Math.max(stars,previous?.stars||0),moves:Math.min(s.moves,previous?.moves??Infinity),hints:s.hints};
      if(s.mode==='circuit') {
        const old=target.boards[s.replay.stage];
        if(!old||s.moves<old.moves||stars>old.stars)target.boards[s.replay.stage]=result;
        unlockEclipse(s.id);
      }
      if(s.mode==='eclipse')unlockMasterwork(s.id);
      if(s.mode==='masterwork')unlockExpedition(s.id);
      saveReplay();return;
    }
    if(s.mode==='endless') {
      const best=Math.max(progress.endless[s.id]?.best||0,s.round+1);
      progress.endless[s.id]={best};save();
    } else {
      const stars=s.hints?1:s.moves<=(s.par??Infinity)?3:s.moves<=(s.par??Infinity)*2?2:1, previous=progress.records[s.key];
      progress.records[s.key]={stars:Math.max(stars,previous?.stars||0),moves:Math.min(s.moves,previous?.moves??Infinity)};
      const chip=document.querySelector(`[data-puzzle-level="${s.index}"]`);
      if(chip){chip.querySelector('small').textContent='✦'.repeat(progress.records[s.key].stars);chip.setAttribute('aria-label',`Level ${s.index+1}: ${P.catalogue[s.id].levels[s.index]}, completed, ${progress.records[s.key].stars} stars`);}
    }
    const course=document.querySelector('#puzzle-course');if(course)course.textContent=courseLabel(s.id);
  }
  function resultHTML(s) {
    if(s.hosted)return '<div><button class="button button-primary" data-puzzle="host-done">Continue the tour →</button></div>';
    if(s.mode==='daily')return '<div><button class="button button-primary" data-puzzle="replay-this">Replay this chart</button><button class="button" data-replay="crafted">Return to the course</button></div>';
    if(s.mode==='circuit') {
      const circuit=replayProgress.circuits[s.id],complete=circuit.boards.filter(Boolean).length===3;
      if(complete) {
        const moves=circuit.boards.reduce((sum,board)=>sum+board.moves,0),stars=circuit.boards.reduce((sum,board)=>sum+board.stars,0);
        return `<p class="circuit-complete">Circuit sealed · ${moves} moves · ${stars} / 9 stars</p><p class="eclipse-unlocked">Eclipse masterwork unlocked · a fixed fourth board with a finite reserve.</p><div><button class="button button-primary" data-replay="eclipse">Play Eclipse board →</button><button class="button" data-puzzle="new-circuit">Deal another circuit</button><button class="button" data-replay="crafted">Return to the course</button></div>`;
      }
      return `<div><button class="button button-primary" data-puzzle="next-replay">Next circuit chart →</button><button class="button" data-puzzle="replay-this">Replay this chart</button></div>`;
    }
    if(s.mode==='eclipse')return '<p class="eclipse-complete">Eclipse record saved separately from the circuit. Masterwork instruments unlocked.</p><div><button class="button button-primary" data-replay="masterwork">Play new-rules instruments →</button><button class="button" data-puzzle="replay">Replay Eclipse board</button><button class="button" data-replay="circuit">Return to the circuit</button><button class="button" data-replay="crafted">Return to the course</button></div>';
    if(s.mode==='masterwork')return '<p class="eclipse-complete">Instrument record saved separately. The four-chamber Grand Expedition is now unlocked.</p><div><button class="button button-primary" data-replay="expedition">Begin Grand Expedition →</button><button class="button" data-puzzle="replay">Replay instrument chart</button><button class="button" data-replay="eclipse">Return to Eclipse</button><button class="button" data-replay="crafted">Return to the course</button></div>';
    if(s.mode==='expedition') {
      if(s.replay.stage<3)return `<p class="eclipse-complete">Chamber ${s.replay.stage+1} sealed with ${s.moves} energy. Its cost carries into the shared expedition reserve; the next chamber has a new deterministic layout.</p><div><button class="button button-primary" data-puzzle="next-expedition">Enter chamber ${s.replay.stage+2} / 4 →</button><button class="button" data-puzzle="replay">Replay this chamber</button><button class="button" data-replay="crafted">Leave for the course</button></div>`;
      const expedition=replayProgress.expeditions[s.id],moves=expedition.drafts.reduce((sum,stage)=>sum+(stage.result?.moves||0),0),complete=expeditionRecordComplete(s.id);
      return complete?`<p class="eclipse-complete">All four chambers and the finale are sealed · ${moves} shared energy spent. The expedition best is saved separately from Instruments, Eclipse, Circuit and crafted play.</p><div><button class="button button-primary" data-puzzle="replay-expedition">Replay the expedition</button><button class="button" data-replay="masterwork">Return to Instruments</button><button class="button" data-replay="crafted">Return to the course</button></div>`:`<p class="eclipse-complete">The finale board is sealed, but the expedition is incomplete: an earlier chamber record is missing or failed replay validation. No four-chamber record was awarded.</p><div><button class="button button-primary" data-puzzle="replay-expedition">Restart from chamber 1</button><button class="button" data-replay="crafted">Return to the course</button></div>`;
    }
    if(s.mode==='endless')return '<div><button class="button button-primary" data-puzzle="next-round">Next board →</button><a class="button" href="#planet/'+ids[(ids.indexOf(s.id)+1)%8]+'">Try '+planets[(ids.indexOf(s.id)+1)%8].name+'’s puzzle ↗</a></div>';
    return `<div><button class="button button-primary" data-puzzle="${s.index<4?'next':'replay'}">${s.index<4?'Next level →':'Replay this level'}</button><a class="button" href="#planet/${ids[(ids.indexOf(s.id)+1)%8]}">Try ${planets[(ids.indexOf(s.id)+1)%8].name}’s puzzle ↗</a></div>`;
  }
  function act(action) {
    const s=current;if(!s||P.won(s.id,s.def,s.board))return;
    if(s.actions.length>=1500) {paint('This draft has reached its move limit. Undo or restart to continue.');return;}
    if(s.moves>=moveLimit(s)) {paint(reserveSpent(s));return;}
    const before=s.board, next=P.transition(s.id,s.def,s.board,action);
    if(!next) {s.blocked=true;paint(action.type==='mechanism'?'That ward is not aligned, is already open, or must wait for the previous ward. Turn the mechanism and read its inscription.':action.type==='move'||action.type==='block'?'That action is blocked by terrain or an expedition ward. Try another direction, open its ward, or undo.':'That piece is fixed or warded in this configuration. Try another instrument or align its ward.');return;}
    const cost=P.actionCost(s.id,before,next);if(s.moves+cost>moveLimit(s)){paint(reserveSpent(s));return;}
    hintController?.abort();s.hintCell=-1;
    s.history.push({board:before,moves:s.moves,action});s.actions.push(action);s.future=[];
    s.moves+=cost;s.board=next;s.motion=true;
    if(action.type==='move')s.face=action.value;
    if(s.id==='mercury')s.changed=new Set(s.board.lights.flatMap((v,i)=>v!==before.lights[i]?[i]:[]));
    else if(s.id==='venus')s.changed=new Set([action.value]);
    else if(s.id==='earth') {const flat=s.board.paths.flat(),prev=before.paths.flat();s.changed=new Set(flat.filter(p=>!prev.includes(p)).slice(-1));}
    const won=P.won(s.id,s.def,next);
    if(won) { recordWin(s); if(s.hosted) hostHooks.onSolve?.({moves:s.moves,hints:s.hints,par:s.par}); }
    stash(s);
    let message=won?null:P.explainAction(s.id,s.def,before,action,s.board);
    if(!won && s.moves>=moveLimit(s))message=['eclipse','masterwork','expedition'].includes(s.mode)?reserveSpent(s):'Out of fuel. Undo a leg or restart to try a shorter route.';
    if(s.id==='mars' && s.def.masterwork?.mechanic!=='winch' && s.board.crates.some(p=>!s.def.goals.includes(p) && [0,2].some(d=>s.def.walls.includes(P.neighbour(p,d,s.def.n))) && [1,3].some(d=>s.def.walls.includes(P.neighbour(p,d,s.def.n)))))message='A canister is trapped in a corner. Undo to recover it.';
    paint(won?'Puzzle solved. Your record has been saved.':message);
    if(won){painting=false;document.querySelector('#puzzle-result-title')?.focus({preventScroll:true});}
  }
  function queueBurn(i) {
    const s=current;if(!s||s.id!=='jupiter'||P.won(s.id,s.def,s.board))return;
    if(instrumented(s)&&s.instrument==='swap'){act({type:'moon',value:i,instrument:'swap'});return;}
    const queued=(s.plan||[]).reduce((sum,n)=>sum+(n||0),0),remaining=moveLimit(s)-s.moves;
    if(queued>=remaining){paint(remaining>0?`Only ${remaining} burns remain in this Eclipse reserve.` :reserveSpent(s));return;}
    const candidate=[...s.plan];candidate[i]=(candidate[i]||0)+1;const preview=P.orbitPlan(s.def,s.board,candidate);
    if(!preview.valid){const moon=P.moonNames[preview.invalidAction?.value??i];paint(`That queued burn on ${moon} is blocked by a resonance ward. Open the ward or remove that burn; your existing plan is unchanged.`);return;}
    s.plan=candidate;s.changed=new Set([i]);
    paint();
  }
  function launchPlan() {
    const s=current;if(!s||s.id!=='jupiter')return;
    const counts=s.plan||[],total=counts.reduce((a,c)=>a+(c||0),0);
    if(P.won(s.id,s.def,s.board))return;
    if(!total) {paint('Queue at least one burn first: tap a moon dial to add one.');return;}
    if(total>moveLimit(s)-s.moves){paint(`That plan needs ${total} burns, but only ${Math.max(0,moveLimit(s)-s.moves)} remain. Remove a burn or undo an earlier plan.`);return;}
    if(s.actions.length+total>1500) {paint('This draft has reached its move limit. Undo or restart to continue.');return;}
    // Each queued burn is committed as its own action, so undo steps back one
    // burn at a time and saved drafts keep the same plain action format.
    const preview=P.orbitPlan(s.def,s.board,counts);
    if(!preview.valid){const moon=P.moonNames[preview.invalidAction?.value??0];paint(`Launch blocked: the queued burn on ${moon} is warded. Open its ward or remove that burn. No burns were committed.`);return;}
    const {actions}=preview,phasesBefore=s.board.phases.slice();
    hintController?.abort();s.hintCell=-1;s.future=[];
    for(const action of actions) {
      const next=P.transition(s.id,s.def,s.board,action);if(!next)break;
      s.history.push({board:s.board,moves:s.moves,action});s.actions.push(action);
      s.moves+=P.actionCost(s.id,s.board,next);s.board=next;
    }
    const names=counts.map((c,i)=>c?`${P.moonNames[i]} ×${c}`:null).filter(Boolean).join(', ');
    s.changed=new Set(s.board.phases.flatMap((phase,i)=>phase!==phasesBefore[i]?[i]:[]));s.motion=true;s.plan=[];
    const won=P.won(s.id,s.def,s.board);
    if(won) { recordWin(s); if(s.hosted) hostHooks.onSolve?.({moves:s.moves,hints:s.hints,par:s.par}); }
    stash(s);
    paint(won?'Puzzle solved. Your record has been saved.':`Launched ${total} burn${total===1?'':'s'} (${names}). ${P.progress(s.id,s.def,s.board)}.`);
    if(won){painting=false;document.querySelector('#puzzle-result-title')?.focus({preventScroll:true});}
  }
  function move(d) {
    if(current.id==='saturn') {
      const axis=P.blockAxis(current.def,current.board,current.selected);
      if((axis==='h' && [1,3].includes(d)) || (axis==='v' && [0,2].includes(d)))act({type:'block',value:[current.selected,[0,3].includes(d)?-1:1]});
      else paint(`This block moves ${axis==='h'?'left or right':'up or down'} only. Rotate a three-square block to change its axis.`);
    } else {
      const action={type:'move',value:d};
      if(instrumented(current)&&current.id==='mars'&&current.instrument==='winch')action.instrument='winch';
      if(instrumented(current)&&current.id==='neptune'&&current.instrument==='pulse')action.instrument='pulse';
      if(instrumented(current)&&current.id==='uranus'&&current.instrument==='anchor') {
        if(!current.board.balls.includes(current.selectedCell)){paint('Select a capsule on the board before anchoring a tilt.');return;}action.anchor=current.selectedCell;
      }
      act(action);
    }
  }
  async function chooseLevel(index,focus=true) {
    genController?.abort();hintController?.abort();painting=false;gesture=null;reverse=false;
    const host=document.querySelector('#planet-game');if(host)host.inert=false;
    if(index==='endless') {
      genController?.abort();genController=new AbortController();const signal=genController.signal;
      const id=current.id,round=progress.endless[id]?.best||0;
      document.querySelector('#puzzle-status')?.replaceChildren();
      const board=document.querySelector('#puzzle-board');if(board)board.innerHTML='<p class="puzzle-loading" role="status">Charting a fresh board…</p>';
      const def=await P.endless(id,round);
      if(signal.aborted||!current||current.id!==id)return;
      current=session(id,'endless',{round,def});
    } else {
      current=session(current.id,index);
    }
    stash(current);
    document.querySelector('#planet-game').innerHTML=gameShell(current);paint();
    if(focus)document.querySelector(`[data-puzzle-level="${index}"]`)?.focus({preventScroll:true});
    if(current.id==='jupiter' && current.par===null) {
      const s=current,signal=controller.signal;
      P.solve(s.id,s.def,s.initial,signal).then(path=>{if(!path||signal.aborted)return;s.par=path.length;if(current===s)paint();});
    }
  }
  function replaySeed(text) {let hash=2166136261;for(const char of text)hash=Math.imul(hash^char.charCodeAt(0),16777619);return hash>>>0;}
  async function chooseReplay(mode,seed=null,advance=false) {
    genController?.abort();hintController?.abort();genController=new AbortController();const signal=genController.signal,id=current.id;reverse=false;
    let spec;
    if(mode==='daily') {
      const date=new Date().toISOString().slice(0,10),old=replayProgress.daily[id];
      spec={mode,date,seed:old?.date===date?old.seed:replaySeed(`${id}:${date}`),stage:0,difficulty:2};
      replayProgress.daily[id]=old?.date===date?old:{date,seed:spec.seed,actions:[],hints:0,result:null};
    } else if(mode==='eclipse') {
      if(!unlockEclipse(id)){paint('Seal all three circuit charts to unlock this planet’s Eclipse masterwork.');return;}
      spec={mode,seed:replayProgress.eclipse[id].seed,stage:0,difficulty:6};
    } else if(mode==='masterwork') {
      if(!unlockMasterwork(id)){paint('Seal this planet’s Eclipse board to unlock its new-rules instrument chart.');return;}
      spec={mode,seed:replayProgress.masterwork[id].seed,stage:0,difficulty:6};
    } else if(mode==='expedition') {
      if(!unlockExpedition(id)){paint('Seal this planet’s Instruments chart to unlock its four-chamber Grand Expedition.');return;}
      const expedition=replayProgress.expeditions[id];
      if(advance) {
        if(current.mode!=='expedition'||!P.won(current.id,current.def,current.board)||expedition.stage>=3){paint('Seal the current chamber before entering the next.');return;}
        if(!expedition.drafts.slice(0,expedition.stage).every(draft=>draft.result)){paint('An earlier chamber record is missing. Return to the earliest unfinished chamber before advancing.');return;}
        expedition.stage=Math.min(3,expedition.stage+1);
      }
      spec={mode,seed:expedition.seed,stage:expedition.stage,difficulty:6};
    } else {
      const old=replayProgress.circuits[id];
      if(seed!==null)spec={mode,seed:seed>>>0,stage:0,difficulty:1};
      else spec={mode,seed:old?.seed??crypto.getRandomValues(new Uint32Array(1))[0],stage:old?(advance?old.stage+1:old.stage):0,difficulty:old?[1,3,5][Math.min(2,old.stage+(advance?1:0))]:1};
      if(seed!==null||!old)replayProgress.circuits[id]={seed:spec.seed,stage:0,boards:[],actions:[],hints:0,result:null};
      else if(advance){old.stage=Math.min(2,old.stage+1);old.actions=[];old.hints=0;old.result=null;}
      spec.difficulty=[1,3,5][replayProgress.circuits[id].stage];
    }
    replayProgress.last[id]=mode;saveReplay();
    const host=document.querySelector('#planet-game');if(host)host.inert=true;
    const board=document.querySelector('#puzzle-board');if(board)board.innerHTML=`<p class="puzzle-loading" role="status">Charting ${mode==='daily'?'today’s firmament':mode==='eclipse'?'the Eclipse masterwork':mode==='masterwork'?'new-rules instruments':mode==='expedition'?`Grand Expedition chamber ${spec.stage+1} of 4`:`circuit seed ${spec.seed}`}…</p>`;
    let def,run=null;
    if(mode==='expedition') {run=await P.expedition(id,spec.seed,signal);if(run){validateExpedition(id,run);spec.stage=replayProgress.expeditions[id].stage;def=run.stages[spec.stage];}}
    else def=mode==='eclipse'?await P.eclipse(id,spec.seed,signal):mode==='masterwork'?await P.masterwork(id,spec.seed,signal):await P.replay(id,spec.seed,spec.difficulty,signal);
    if(signal.aborted||!current||current.id!==id)return;
    if(host)host.inert=false;
    if(!def) {
      if(board)board.innerHTML='<div class="puzzle-generation-error"><h3>The chart resisted resolution.</h3><p>No verified board arrived within the work limit. Your crafted progress is untouched.</p><button class="button" data-replay-action="retry">Try the chart again</button></div>';
      return;
    }
    const expedition=run?{name:run.name,energy:run.energy,par:run.par,stageNames:run.stages.map(stage=>stage.expedition.name)}:null;
    current=session(id,{...spec,def,expedition});stash(current);
    if(host)host.innerHTML=gameShell(current);paint();
    document.querySelector(`[data-replay="${mode}"]`)?.focus({preventScroll:true});
  }
  async function hint() {
    const s=current;hintController?.abort();hintController=new AbortController();const signal=hintController.signal;
    const tips=s.mode==='expedition'?s.def.expedition.tips:s.mode==='masterwork'?s.def.masterwork.tips:P.hintTips[s.id];
    if(s.mode!=='expedition'&&s.hints<tips.length) {
      s.hints++;stash(s);paint(`Hint ${s.hints}: ${tips[s.hints-1]}`);return;
    }
    let message,cell=-1;
    if(s.id==='earth'&&s.mode!=='expedition') {
      const i=s.def.paths.findIndex((path,j)=>{
        const drawn=s.board.paths[j];return !(drawn.length===path.length && (samePath(drawn,path)||samePath([...drawn].reverse(),path)));
      });
      if(i<0)return;
      const path=s.def.paths[i];cell=path[0];
      message=`One possible route for ${i+1}: ${path.map(p=>`${String.fromCharCode(65+p%s.def.n)}${Math.floor(p/s.def.n)+1}`).join(' → ')}. Columns A–${String.fromCharCode(64+s.def.n)} run left to right; rows start at 1.${s.def.gates?' A jump between ⇄ gates is intentional; it need not be between adjoining squares.':''}`;
    } else if(s.id==='venus'&&!instrumented(s)) {
      cell=s.board.pipes.findIndex((mask,p)=>mask!==s.def.target[p]);if(cell<0)return;
      const sides=P.directionNames.filter((_,d)=>s.def.target[cell]&(1<<d));
      message=`One possible route: turn the highlighted pipe at row ${Math.floor(cell/s.def.n)+1}, column ${cell%s.def.n+1} so it connects ${sides.join(' and ')}.`;
    } else {
      paint('Checking a route from your current position…');document.querySelector('[data-puzzle="hint"]').disabled=true;
      const path=await P.solve(s.id,s.def,s.board,signal);
      if(signal.aborted||current!==s||!controller)return;
      if(!path?.length){
        if(s.mode==='expedition') {
          let steps=0;
          for(let i=s.history.length-1;i>=0;i--) {
            steps++;const entry=s.history[i],board=entry.restart?.board||entry.board;
            if(board&&P.expeditionPath(s.def,board)?.length){paint(`This variation is off the chamber’s verified route. Undo ${steps} move${steps===1?'':'s'} to rejoin it, or restart the chamber.`);return;}
          }
          paint('This variation is off the chamber’s verified route. Restart the chamber to recover its guaranteed solvable initial board; your other charts are untouched.');return;
        }
        paint('No route found from here. Undo recent moves, or restart to recover the original solvable board.');return;
      }
      const action=path[0];
      if(action.type==='mechanism')message=action.value==='cycle'?`${s.def.expedition.cycleLabel} next. ${path.length} verified actions remain in this chamber.`:`Open ${s.def.expedition.sealName} ${action.value+1} now; the mechanism is aligned. ${path.length} verified actions remain.`;
      if(action.type==='cell'){
        cell=action.value;const at=`row ${Math.floor(cell/s.def.n)+1}, column ${cell%s.def.n+1}`;
        message=s.id==='earth'?`Draw to the highlighted survey square at ${at}. ${path.length} verified actions remain; the moving ⇄ gates are part of this route.`:s.id==='venus'?`${action.instrument==='mirror'?'Mirror':'Turn'} the highlighted pipe at ${at}. ${path.length} instrument actions remain on a verified route.`: `${action.instrument==='diagonal'?'Prism':'Cross'}-switch the highlighted crater: ${at}. ${path.length} switches remain on a verified solution.`;
      }
      if(action.type==='moon'){cell=action.value;message=action.instrument==='swap'?`Exchange ${P.moonNames[cell]} with the next moon next. ${path.length} actions remain on a shortest solution.`:`Queue a burn on ${P.moonNames[cell]} next. ${path.length} burns remain on a shortest solution.`;}
      if(action.type==='block'){
        cell=action.value[0];s.selected=cell;
        if(action.instrument==='rotate')message=`Rotate block ${cell} 90° about its centre. ${path.length} actions remain.`;
        else {const axis=P.blockAxis(s.def,s.board,cell);message=`Move ${cell===0?'probe P':`block ${cell}`} one square ${axis==='h'?(action.value[1]>0?'right':'left'):(action.value[1]>0?'down':'up')}. ${path.length} moves remain.`;}
      }
      if(action.type==='move'){
        const instrument=action.instrument==='winch'?'Winch-pull':action.instrument==='pulse'?'Pulse':Number.isInteger(action.anchor)?'Anchor and tilt':s.id==='uranus'?'Tilt':'Move';
        if(Number.isInteger(action.anchor)){s.selectedCell=action.anchor;s.instrument='anchor';}
        message=`${instrument} ${P.directionNames[action.value]} next. ${path.length} moves remain on a shortest route.${path.length>moveLimit(s)-s.moves?` That exceeds your remaining ${['eclipse','masterwork','expedition'].includes(s.mode)?'reserve':'fuel'}; undo or restart.`:''}`;
      }
    }
    s.hints++;s.hintCell=cell;stash(s);paint(message);
  }
  const samePath=(a,b)=>a.length===b.length&&a.every((p,i)=>p===b[i]);
  function tool(action) {
    const s=current;if(!s)return;
    if(action==='hint'){hint();return;}
    if(action==='next-round'){chooseLevel('endless');return;}
    if(action==='next-replay'){chooseReplay('circuit',null,true);return;}
    if(action==='next-expedition'){chooseReplay('expedition',null,true);return;}
    if(action==='replay-expedition') {const expedition=replayProgress.expeditions[s.id],prefix=`${s.id}:expedition:${expedition.seed}:`;for(const key of sessions.keys())if(key.startsWith(prefix))sessions.delete(key);expedition.stage=0;expedition.drafts=Array.from({length:4},()=>({actions:[],hints:0,result:null}));saveReplay();chooseReplay('expedition');return;}
    if(action==='new-circuit'){chooseReplay('circuit',crypto.getRandomValues(new Uint32Array(1))[0]);return;}
    if(action==='host-done'){hostHooks.onDone?.();return;}
    if(action==='clear-plan'){s.plan=[];paint('Plan cleared. Tap a moon to queue a fresh burn.');return;}
    if(action==='launch'){launchPlan();return;}
    if(action==='rotate-block'){if(instrumented(s)&&s.id==='saturn'&&s.selected>0)act({type:'block',value:[s.selected,0],instrument:'rotate'});return;}
    hintController?.abort();s.hintCell=-1;
    if(action==='reverse'){reverse=!reverse;paint();return;}
    if(action==='next'){chooseLevel(Math.min(4,s.index+1));return;}
    if(action==='restart'||action==='replay') {
      // Restart is itself undoable, so an accidental tap cannot discard work.
      s.future=[];s.history.push({restart:{board:s.board,moves:s.moves,actions:[...s.actions],hints:s.hints}});
      s.board=structuredClone(s.initial);s.moves=0;s.actions=[];s.hints=0;s.justDealt=true;s.plan=[];s.selectedCell=-1;s.instrument='primary';
      document.querySelector('.pieces-layer')?.remove();
      stash(s);paint('Board reset. Undo restores your previous attempt.');return;
    }
    if(action==='undo' && s.history.length) {
      const previous=s.history.pop();
      if(previous.restart){const old=previous.restart;s.board=old.board;s.moves=old.moves;s.actions=old.actions;s.hints=old.hints;s.future=[];}
      else {s.future.push({board:s.board,moves:s.moves,action:previous.action});s.board=previous.board;s.moves=previous.moves;s.actions.pop();}
      s.motion=true;stash(s);paint('Move undone. '+P.progress(s.id,s.def,s.board));return;
    }
    if(action==='redo' && s.future.length) {
      const next=s.future.pop();s.history.push({board:s.board,moves:s.moves,action:next.action});s.board=next.board;s.moves=next.moves;s.actions.push(next.action);
      s.motion=true;if(P.won(s.id,s.def,s.board))recordWin(s);stash(s);paint('Move restored.');
    }
  }
  function onClick(event) {
    const button=event.target.closest('button');if(!button)return;
    if(event.detail>0 && performance.now()<ignoreClickUntil && button.closest('#puzzle-board'))return;
    if(button.dataset.atlas) {
      const target=document.querySelector(button.dataset.atlas==='play'?'#planet-puzzle':'#planet-notes');
      target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      const heading=target.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});return;
    }
    if(button.dataset.replay) {
      const mode=button.dataset.replay;
      if(mode==='crafted')chooseLevel(progress.levels[current.id]??0);
      else chooseReplay(mode);
      return;
    }
    if(button.dataset.replayAction==='apply-seed') {
      const value=document.querySelector('#replay-seed')?.value.trim();
      if(!value||!Number.isSafeInteger(Number(value))||Number(value)<0){toast('Enter a whole-number circuit seed.');return;}
      chooseReplay('circuit',Number(value)>>>0);return;
    }
    if(button.dataset.replayAction==='retry'){chooseReplay(current.mode);return;}
    if(button.dataset.puzzleLevel!==undefined){chooseLevel(button.dataset.puzzleLevel==='endless'?'endless':Number(button.dataset.puzzleLevel));return;}
    if(button.dataset.puzzle){tool(button.dataset.puzzle);return;}
    if(button.dataset.puzzleMechanism!==undefined){const value=button.dataset.puzzleMechanism;act({type:'mechanism',value:value==='cycle'?'cycle':Number(value)});return;}
    if(button.dataset.puzzleDirection!==undefined){move(Number(button.dataset.puzzleDirection));return;}
    if(button.dataset.puzzleInstrument!==undefined){current.instrument=button.dataset.puzzleInstrument;paint(current.id==='uranus'&&current.instrument==='anchor'?'Now select a capsule on the board.':undefined);return;}
    if(button.dataset.puzzleBlock!==undefined){current.selected=Number(button.dataset.puzzleBlock);paint();return;}
    if(button.dataset.puzzleUnburn!==undefined){const i=Number(button.dataset.puzzleUnburn);if(current.plan[i]>0)current.plan[i]--;paint();return;}
    if(button.dataset.puzzleMoon!==undefined){queueBurn(Number(button.dataset.puzzleMoon));return;}
    if(button.dataset.puzzleCell!==undefined) {
      const p=Number(button.dataset.puzzleCell);
      if(current.id==='earth' && event.detail>0)return; // Pointer gestures are handled below; keyboard clicks still work.
      if(current.id==='mars'){const d=P.direction(current.board.player,p,current.def.n);if(d>=0)move(d);else paint('Use the arrow controls, or select a square next to the rover.');}
      else if(current.id==='uranus'){current.selectedCell=p;current.instrument='anchor';paint(`Capsule selected at row ${Math.floor(p/current.def.n)+1}, column ${p%current.def.n+1}. Choose a tilt; it will stay fixed.`);}
      else {const action={type:'cell',value:p,reverse};if(instrumented(current)&&current.id==='mercury'&&current.instrument==='diagonal')action.instrument='diagonal';if(instrumented(current)&&current.id==='venus'&&current.instrument==='mirror')action.instrument='mirror';act(action);}
    }
  }
  function mount(view) {
    if(!view.startsWith('planet/'))return;
    const id=view.split('/')[1];if(!ids.includes(id))return;
    controller=new AbortController();const signal=controller.signal;
    const savedMode=progress.levels[id]===undefined?0:progress.levels[id];
    current=session(id,savedMode);
    const last=replayProgress.last[id];
    if((last==='daily'&&replayProgress.daily[id])||(last==='circuit'&&replayProgress.circuits[id])||(last==='eclipse'&&eclipseUnlocked(id))||(last==='masterwork'&&masterworkUnlocked(id))||(last==='expedition'&&expeditionUnlocked(id)))chooseReplay(last,null,false);
    else chooseLevel(savedMode,false);
    attachInput(signal);
  // Gentle plate parallax on fine pointers only.
    const plate=main.querySelector('.planet-plate');
    if(plate && matchMedia('(prefers-reduced-motion: no-preference)').matches && matchMedia('(pointer: fine)').matches) {
      // One paint per frame, latest pointer wins; the rect is measured on
      // entry/resize/scroll rather than on every pointermove.
      const hero=main.querySelector('.atlas-hero');
      let box=null,parallaxFrame=0;
      const measure=()=>{box=plate.getBoundingClientRect();};
      hero.addEventListener('pointerenter',measure,{signal});
      window.addEventListener('resize',measure,{signal});
      window.addEventListener('scroll',()=>{if(box)measure();},{signal,passive:true});
      hero.addEventListener('pointermove',event=>{
        if(!box)measure();
        const dx=(event.clientX-(box.left+box.width/2))/box.width,dy=(event.clientY-(box.top+box.height/2))/box.height;
        cancelAnimationFrame(parallaxFrame);
        parallaxFrame=requestAnimationFrame(()=>{parallaxFrame=0;plate.style.transform=`perspective(900px) rotateY(${dx*4}deg) rotateX(${-dy*4}deg)`;});
      },{signal});
      hero.addEventListener('pointerleave',()=>{cancelAnimationFrame(parallaxFrame);parallaxFrame=0;box=null;plate.style.transform='';},{signal});
    }
    // Sections fade up as they enter view.
    observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target);}},{threshold:.12});
    main.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
  }
  function attachInput(signal) {
    main.addEventListener('click',onClick,{signal});
    document.addEventListener('click',event=>{if(event.target.closest('.puzzle-host'))onClick(event);},{signal});
    main.addEventListener('keydown',event=>{
      if(!event.target.closest('#planet-game, .puzzle-host') || modal.open || event.ctrlKey||event.metaKey||event.altKey)return;
      if(['z','y'].includes(event.key.toLowerCase())){event.preventDefault();tool(event.key.toLowerCase()==='z'?'undo':'redo');return;}
      if(current.mode==='expedition'&&!event.target.closest('input,textarea')) {
        if(event.key.toLowerCase()==='c'){event.preventDefault();act({type:'mechanism',value:'cycle'});return;}
        if(['1','2'].includes(event.key)){event.preventDefault();act({type:'mechanism',value:Number(event.key)-1});return;}
      }
      if(event.key.toLowerCase()==='l' && current.id==='jupiter' && !event.target.closest('input,textarea')){event.preventDefault();launchPlan();return;}
      const d=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].indexOf(event.key);if(d<0)return;
      if(['mars','saturn','uranus','neptune'].includes(current.id)){event.preventDefault();move(d);return;}
      const cell=event.target.closest('[data-puzzle-cell]'),moon=event.target.closest('[data-puzzle-moon]');
      if(cell){const next=P.neighbour(Number(cell.dataset.puzzleCell),d,current.def.n);if(next>=0){event.preventDefault();document.querySelector(`[data-puzzle-cell="${next}"]`)?.focus({preventScroll:true});}}
      if(moon){event.preventDefault();const next=(Number(moon.dataset.puzzleMoon)+([0,3].includes(d)?-1:1)+current.def.count)%current.def.count;document.querySelector(`[data-puzzle-moon="${next}"]`)?.focus({preventScroll:true});}
    },{signal});
    main.addEventListener('pointerdown',event=>{
      if(event.button!==0||!event.target.closest('#puzzle-board'))return;
      if(current.id==='saturn') {
        const block=event.target.closest('[data-puzzle-block]');if(!block)return;
        event.preventDefault();current.selected=Number(block.dataset.puzzleBlock);block.focus({preventScroll:true});
        gesture={x:event.clientX,y:event.clientY,block:current.selected,steps:0,unit:document.querySelector('.ring-board').getBoundingClientRect().width/6};paint();return;
      }
      if(['mars','uranus','neptune'].includes(current.id)) {gesture={x:event.clientX,y:event.clientY};return;}
      if(current.id!=='earth')return;
      const cell=event.target.closest('[data-puzzle-cell]');if(!cell)return;
      event.preventDefault();painting=true;lastPaint=Number(cell.dataset.puzzleCell);cell.focus({preventScroll:true});act({type:'cell',value:lastPaint});
    },{signal});
    document.addEventListener('pointermove',event=>{
      if(gesture?.block!==undefined && current.id==='saturn') {
        const axis=P.blockAxis(current.def,current.board,gesture.block),delta=axis==='h'?event.clientX-gesture.x:event.clientY-gesture.y,wanted=Math.round(delta/gesture.unit);
        const count=Math.min(6,Math.abs(wanted-gesture.steps)),sign=Math.sign(wanted-gesture.steps);
        for(let i=0;i<count;i++) {
          const before=current.board.positions[gesture.block];
          act({type:'block',value:[gesture.block,sign]});
          if(current.board.positions[gesture.block]===before)break;
          gesture.steps+=sign;ignoreClickUntil=performance.now()+400;
        }
        return;
      }
      if(!painting||current.id!=='earth')return;
      const cell=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-puzzle-cell]');if(!cell)return;
      const p=Number(cell.dataset.puzzleCell);if(p===lastPaint)return;
      // Interpolate a fast straight drag across missed pointer samples.
      const n=current.def.n,a=lastPaint;
      if(Math.floor(a/n)===Math.floor(p/n)||a%n===p%n) {
        const step=Math.floor(a/n)===Math.floor(p/n)?Math.sign(p-a):Math.sign(p-a)*n;
        for(let q=a+step;q!==p+step;q+=step)act({type:'cell',value:q,continuation:true});
      } else act({type:'cell',value:p,continuation:true});
      lastPaint=p;
    },{signal});
    document.addEventListener('pointerup',event=>{
      if(gesture && gesture.block===undefined) {
        const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
        if(Math.max(Math.abs(dx),Math.abs(dy))>=24){ignoreClickUntil=performance.now()+400;move(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0));}
      }
      gesture=null;painting=false;lastPaint=-1;
    },{signal});
    document.addEventListener('pointercancel',()=>{gesture=null;painting=false;lastPaint=-1;},{signal});
  }
  function host(container,id,index,hooks={}) {
    controller?.abort();hintController?.abort();genController?.abort();
    controller=new AbortController();
    hostHooks=hooks;
    container.classList.add('puzzle-host');
    current=session(id,index);current.hosted=true;
    if(hooks.parScale && current.par)current.par=Math.ceil(current.par*hooks.parScale);
    container.innerHTML=gameShell(current);
    attachInput(controller.signal);
    paint();
    if(current.id==='jupiter' && current.par===null) {
      const s=current,signal=controller.signal;
      P.solve(s.id,s.def,s.initial,signal).then(path=>{if(!path||signal.aborted)return;s.par=path.length;if(current===s)paint();});
    }
    return { destroy(){controller?.abort();controller=null;current=null;painting=false;gesture=null;hostHooks={};container.classList.remove('puzzle-host');} };
  }
  function unmount() {controller?.abort();hintController?.abort();genController?.abort();observer?.disconnect();controller=null;current=null;painting=false;gesture=null;hostHooks={};}
  for(const id of ids) {viewNames[`planet/${id}`]=planets.find(p=>p.id===id).name;renderers[`planet/${id}`]=()=>renderPage(id);}
  return {mount,unmount,renderIndex,host};
})();
