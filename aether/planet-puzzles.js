'use strict';

window.AetherPuzzles = (() => {
  const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
  const directionNames = ['up', 'right', 'down', 'left'];
  const colours = ['#d8b57d','#82bcb0','#cba1be','#91afdc','#db967d','#c0c68a'];
  const names = ['First survey', 'Crossings', 'The long route', 'Close quarters', 'Final survey'];
  const catalogue = {
    mercury: { title:'Shadow circuit', genre:'Logic · coupled switches', time:'3–8 min', lead:'Leave every crater in shadow.', rules:'Tap a crater to switch its light and the four neighbouring lights. Turn every tile dark. A move that fixes one crater may relight another.', detail:'Think in combinations: pressing the same tile twice cancels its effect. Work from the edges, or try solving one row at a time.', connection:'Mercury’s polar ice survives in permanent shadow. This is a coupled-switch puzzle inspired by those cold traps; sunlight does not really switch between craters.', legend:'Amber craters are sunlit · dark craters are in shadow', levels:['First shadows','Caloris grid','Polar rim','Long night','Cold traps'] },
    venus: { title:'Cloudworks', genre:'Routing · rotating pipes', time:'4–10 min', lead:'Restore the balloon’s cooling circuit.', rules:'Turn the pipe tiles to connect the pump P to the receiver R. Every tile must belong to the same continuous route. Brass-pinned tiles cannot turn.', detail:'Start at the pinned ends. A pipe must connect on both sides of every shared edge. Corners at the edge of the board are useful clues.', connection:'Vega’s balloons explored Venus’s cloud layers in 1985. The sealed cooling circuit is an imagined engineering puzzle, not a reconstruction of their hardware.', legend:'P pump · R receiver · riveted tiles cannot turn', levels:['Pressure test','Cloud base','Acid clouds','Upper deck','Closed circuit'] },
    earth: { title:'Watershed', genre:'Path puzzle · fill the grid', time:'4–12 min', lead:'Connect the stations. Use every square.', rules:'Join each pair of matching numbered stations with one continuous path. Paths cannot cross or share a square. Fill the entire grid to finish.', detail:'Drag from a station, or select a station and tap adjoining squares. Keyboard: arrows move focus, Space extends the path. Select an endpoint to redraw its route; select an earlier segment to shorten it.', connection:'A map-inspired puzzle about competing routes through a shared landscape. Real rivers branch and follow elevation; these survey links deliberately do neither.', legend:'Matching numbers connect · all squares required', levels:['Headwaters','Estuary','Tributaries','Floodplain','Continental divide'] },
    mars: { title:'Sample return', genre:'Sokoban · crate planning', time:'5–15 min', lead:'Push every sample into a collection bay.', rules:'Move the rover one square at a time. It can push one sample canister, but cannot pull it or push two together. Fill every outlined bay.', detail:'Leave room to get behind each canister. A canister pushed into a corner without a bay is stuck: undo the move and approach from another side.', connection:'Mars rovers collect and cache carefully selected samples. These push-only canisters turn route planning into a puzzle; real rovers use robotic arms.', legend:'The rover pushes brass canisters · dashed rings are collection bays', levels:['First cache','Rock corridor','Delta approach','Jezero depot','Return manifest'] },
    jupiter: { title:'Orbital lock', genre:'Logic · coupled burn planning', time:'4–10 min', lead:'Plan burns that align every moon at zero.', rules:'Select a moon to queue a burn: it advances by 1 and its next neighbour by 2. Dashed needles preview the combined result. Adjust the burn counts, then launch your plan. Each burn costs one move; planning is free.', detail:'The links form a loop, so fixing moons one at a time can undo your work. Balance all the projected positions together. Burn order does not change the final alignment; a full cycle of burns on one moon cancels itself.', connection:'Io, Europa, and Ganymede have a real 4:2:1 orbital resonance. These mechanical dials borrow the idea of coupled motion; their discrete links are puzzle rules, not orbital predictions.', legend:'Solid needle = now · dashed needle = planned · zero = aligned', levels:['Three moons','Longer periods','Callisto joins','Eight divisions','Double coupling'] },
    saturn: { title:'Cassini passage', genre:'Sliding blocks · clear the exit', time:'5–15 min', lead:'Open a passage for the survey probe.', rules:'Drag a block along its marked axis, or select it and use the arrows. Blocks cannot overlap or turn. Bring the brass probe P to the exit on the right.', detail:'The shortest solution often moves something away from the exit first. Count each one-square slide as one move; the reference par uses the same rule.', connection:'Saturn’s ring gaps and narrow lanes inspire this sliding-block board. The blocks are an abstract map of obstacles, not solid slabs in the real rings.', legend:'P is the probe · each block slides only along its marked axis', levels:['Inner edge','Ring traffic','Shepherd lanes','Encke crossing','Cassini passage'] },
    uranus: { title:'Axis shift', genre:'Tilt maze · simultaneous motion', time:'4–12 min', lead:'Settle every capsule into a socket.', rules:'Tilt in one direction. All capsules slide until a wall or another capsule stops them. Place a capsule on every brass socket at the same time.', detail:'Sockets do not hold capsules in place. Use one capsule as a temporary stopper for another, and plan the final tilt before making the first.', connection:'Uranus’s 98° axial tilt inspired a board where orientation changes everything. This is a laboratory tilt maze, not a model of the planet’s gravity.', legend:'Ice capsules slide together · brass rings are sockets', levels:['Quarter turn','Counterweight','Miranda maze','Three bodies','On its side'] },
    neptune: { title:'Storm runner', genre:'Inertia maze · limited moves', time:'5–12 min', lead:'Reach the weather buoys in order.', rules:'Choose a direction to ride the wind until a storm barrier stops you. You must stop on buoys 1, 2, 3, and then the relay R, in that order. Each leg uses one fuel charge.', detail:'Passing over a buoy does not collect it. Find the wall that lets you stop on it. You have three charges more than the shortest route; undo restores a charge.', connection:'Neptune’s fast winds make drifting cloud features useful tracers. Here the winds and storm edges form a deliberately simplified, turn-based navigation puzzle.', legend:'The probe rides the wind · red buoys in order: 1 → 2 → 3 → relay R', levels:['First front','Crosswind','Dark spot','High latitudes','Last transmission'] }
  };
  const clone = value => structuredClone(value);
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const mod = (a,n) => (a % n + n) % n;
  const moonNames = ['Io','Europa','Ganymede','Callisto'];
  const lessons = {
    mercury:['Learn the cross-shaped switch.','Use edges to limit side effects.','Combine switches rather than chase individual lights.','Clear upper rows using the row below.','Find a short combination for the whole grid.'],
    venus:['Follow the fixed pump connection.','Work inward from both pinned ends.','Use board edges to rule out turns.','Reconnect isolated sections without breaking the main route.','Supply every pipe with economical turns.'],
    earth:['Start at a numbered station and draw to its partner.','Reserve space for the longer routes.','Use corners before they become isolated.','Balance five routes competing for space.','Fill every square without unnecessary redraws.'],
    mars:['Get behind each canister before pushing.','Leave yourself a way around the samples.','Plan the approach to each collection bay.','Choose the delivery order for three samples.','Deliver all three while keeping access lanes open.'],
    jupiter:['Balance a three-moon loop using the preview.','Plan around a longer six-position cycle.','Include Callisto in the coupling loop.','Budget burns across eight-position cycles.','Each burn now affects three moons: balance both neighbours.'],
    saturn:['Select a blocker and clear the probe’s row.','Make room for the vertical blockers.','Move a blocker away before opening the lane.','Untangle the lanes in a useful order.','Clear the exit with a short sequence of one-square slides.'],
    uranus:['Watch both capsules move on every tilt.','Use one capsule as a temporary stopper.','Approach sockets from a different direction.','Plan a final tilt for three capsules.','Keep seated capsules in place while positioning the last.'],
    neptune:['Find the barrier that stops you on buoy 1.','Approach the next buoy from a useful stopping point.','Budget detours before leaving a safe stop.','Chain the buoy approaches into one fuel-efficient route.','Reach the relay with a carefully planned sequence of stops.'],
  };
  // A scratch plan uses the exact same transitions as committed moves. It does
  // not mutate the board, consume hints, or add a new saved-action format.
  function orbitPlan(def,board,counts) {
    let projected=clone(board);const actions=[];
    for(let i=0;i<def.count;i++)for(let j=0;j<(counts[i]||0);j++) {
      const action={type:'moon',value:i};projected=transition('jupiter',def,projected,action);actions.push(action);
    }
    return {board:projected,actions};
  }
  function coupling(def,i) {
    return `${moonNames[i]} +1, ${moonNames[(i+1)%def.count]} +2${def.double?`, ${moonNames[mod(i-1,def.count)]} +1`:''}`;
  }
  function instruction(id,def,board) {
    if(won(id,def,board))return 'Survey complete. Replay for a shorter route, or continue your survey.';
    if(id==='mercury')return 'Tap a crater: it and its orthogonal neighbours toggle. Darken the entire board; fewer lights is not always a better move.';
    if(id==='venus')return 'Turn an unpinned pipe to join its open sides to its neighbours. Supplied pipes glow; every pipe must connect to P.';
    if(id==='earth')return board.active<0?'Select a numbered station, then drag or tap adjoining squares toward its matching number.':`Drawing route ${board.active+1}. Extend from its last square; select an earlier segment to shorten it.`;
    if(id==='mars')return 'Use arrows or tap beside the rover. Push from the opposite side of a bay; samples cannot be pulled.';
    if(id==='jupiter')return 'Tap a moon to add a planned burn. Read every “Now → Plan” position, adjust counts, then launch. All must end at 0.';
    if(id==='saturn')return 'Select a numbered block, then drag along its arrow or use the direction buttons. Move probe P to the right edge.';
    if(id==='uranus')return 'Tilt with arrows or swipe. Both walls and other capsules stop a slide; sockets do not.';
    const goal=def.goals[board.collected];
    return `Next: ${board.collected===def.goals.length-1?'relay R':'buoy '+(board.collected+1)} at row ${Math.floor(goal/def.n)+1}, column ${goal%def.n+1}. Stop on it; passing over does not collect it.`;
  }
  function explainAction(id,def,before,action,after) {
    if(id==='jupiter')return `${coupling(def,action.value)}. Positions wrap at ${def.divisions}; linked moons may leave zero so the whole loop can align later.`;
    if(id==='mercury') {
      const cells=toggles(action.value,def.n),dark=cells.filter(p=>before.lights[p]).length;
      return `${dark} crater${dark===1?'':'s'} darkened; ${cells.length-dark} relit. The entire cross toggles, including already-dark craters.`;
    }
    if(id==='venus')return `${wetPipes(def,after).size} of ${def.n**2} pipes now supplied. Open sides must meet on both tiles.`;
    if(id==='earth')return `${completedPaths(def,after)} routes connected; ${def.n**2-after.paths.flat().length} squares still empty. Every square is required.`;
    if(id==='mars')return same(before.crates,after.crates)?'Rover repositioned. Get behind a sample to push it toward a bay.':'Sample pushed. Keep a route to its other sides; it cannot be pulled back.';
    if(id==='saturn')return action.value[0]===0?'Probe advanced along its lane. Reach the right edge to finish.':'Block repositioned. Check which crossing lane this opens for the probe.';
    if(id==='uranus')return 'All capsules slid to their first obstacle. A capsule on a socket can still move on the next tilt.';
    return after.collected>before.collected?'Stopped on the next beacon: signal recorded.':'Stopped at a storm barrier. Only stopping on the next numbered beacon records it.';
  }
  function neighbour(p,d,n) {
    const x=p%n+DIRS[d][0], y=Math.floor(p/n)+DIRS[d][1];
    return x>=0 && x<n && y>=0 && y<n ? y*n+x : -1;
  }
  function direction(a,b,n) { return DIRS.findIndex((_,d)=>neighbour(a,d,n)===b); }
  function rotate(mask, amount=1) { return amount===1 ? ((mask<<1)&15)|(mask>>3) : (mask>>1)|((mask&1)<<3); }
  function toggles(p,n) { return [p,...DIRS.map((_,d)=>neighbour(p,d,n)).filter(v=>v>=0)]; }
  function pipeTargets(def) {
    const masks=Array(def.n*def.n).fill(0);
    def.path.forEach((p,i)=>{ for (const q of [def.path[i-1],def.path[i+1]]) if(q!==undefined) masks[p]|=1<<direction(p,q,def.n); });
    return masks;
  }
  function definition(id,index) {
    if(id==='mercury') return { n:[3,4,4,5,5][index], seed:[8,8,79,8,1][index] };
    // Authored starts ship with a known burn plan, so the reference par is honest
    // and every crafted board is solvable by construction (checked in tests).
    if(id==='jupiter') return {
      count:index<2?3:4, divisions:[4,6,6,8,8][index], double:index===4,
      startPhases:[[1,2,3],[2,1,3],[2,1,4,5],[4,3,5,5],[3,3,2,4]][index],
      solution:[[0,2],[0,0,1,2],[0,0,1,3],[0,0,1,2,3],[0,1,1,2,3]][index],
    };
    const def=clone(window.AetherPlanetLevels[id][index]);
    if(id==='saturn') {
      def.n=6;
      def.blocks=def.blocks.map(([x,y,len,axis])=>({x,y,len,axis}));
    }
    if(id==='venus') { def.target=pipeTargets(def); def.fixed=[def.path[0],def.path.at(-1)]; }
    return def;
  }
  function initial(id,def,index) {
    if(id==='mercury') {
      const lights=Array(def.n*def.n).fill(0);
      let seed=def.seed;
      for(let i=0;i<def.n*def.n;i++) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; if(seed%5<2) toggles(i,def.n).forEach(p=>lights[p]^=1); }
      if(!lights.some(Boolean)) toggles(0,def.n).forEach(p=>lights[p]^=1);
      return {lights};
    }
    if(id==='venus') return {pipes:def.target.map((mask,p)=>{
      if(def.fixed.includes(p))return mask;
      for(let i=0;i<1+(p*7+index)%3;i++)mask=rotate(mask);
      return mask;
    })};
    if(id==='earth') return {paths:def.paths.map(()=>[]),active:-1};
    if(id==='mars')return {player:def.player,crates:def.crates};
    if(id==='saturn')return {positions:def.blocks.map(b=>b.axis==='h'?b.x:b.y)};
    if(id==='uranus')return {balls:def.balls};
    if(id==='neptune')return {player:def.player,collected:0};
    if(def.startPhases)return {phases:[...def.startPhases]};
    const board={phases:Array(def.count).fill(0)};
    for(let i=0;i<def.count;i++)for(let j=0;j<1+(index+i*3)%def.divisions;j++)advance(board,def,i);
    if(board.phases.every(v=>v===0))advance(board,def,0);
    return board;
  }
  function advance(board,def,i) {
    board.phases[i]=mod(board.phases[i]+1,def.divisions);
    const next=(i+1)%def.count;
    board.phases[next]=mod(board.phases[next]+2,def.divisions);
    if(def.double) { const prev=mod(i-1,def.count); board.phases[prev]=mod(board.phases[prev]+1,def.divisions); }
  }
  function slide(balls,d,def) {
    const occupied=new Set(balls), [dx,dy]=DIRS[d];
    const order=[...balls].sort((a,b)=>(b%def.n)*dx+Math.floor(b/def.n)*dy-(a%def.n)*dx-Math.floor(a/def.n)*dy);
    for(let p of order) {
      occupied.delete(p);
      while(true) { const to=neighbour(p,d,def.n); if(to<0||def.walls.includes(to)||occupied.has(to))break; p=to; }
      occupied.add(p);
    }
    return [...occupied].sort((a,b)=>a-b);
  }
  function blockCells(def,positions,i) {
    const b=def.blocks[i],p=positions[i];
    return Array.from({length:b.len},(_,j)=>(b.axis==='h'?b.y:p+j)*6+(b.axis==='h'?p+j:b.x));
  }
  // The same pure transition function powers play, saved-game replay, and hints.
  function transition(id,def,current,action) {
    if(!action || !['cell','move','moon','block'].includes(action.type))return null;
    const board=clone(current), v=action.value;
    if(id==='mercury' && action.type==='cell' && Number.isInteger(v) && v>=0 && v<def.n**2) toggles(v,def.n).forEach(p=>board.lights[p]^=1);
    else if(id==='venus' && action.type==='cell' && Number.isInteger(v) && v>=0 && v<def.n**2 && !def.fixed.includes(v)) board.pipes[v]=rotate(board.pipes[v],action.reverse?-1:1);
    else if(id==='jupiter' && action.type==='moon' && Number.isInteger(v) && v>=0 && v<def.count) advance(board,def,v);
    else if(id==='earth' && action.type==='cell' && Number.isInteger(v) && v>=0 && v<def.n**2) {
      const owner=def.paths.findIndex(p=>p[0]===v || p.at(-1)===v), active=board.active, path=board.paths[active];
      const occupied=board.paths.findIndex(p=>p.includes(v));
      if(action.continuation && (active<0 || (owner>=0 && owner!==active) || (occupied>=0 && occupied!==active)))return null;
      if(active>=0 && path?.length && direction(path.at(-1),v,def.n)>=0 && (owner===-1 || (owner===active && v!==path[0])) && (occupied===-1 || occupied===active)) {
        const earlier=path.indexOf(v);
        if(earlier>=0)board.paths[active]=path.slice(0,earlier+1);
        else path.push(v);
        if(owner===active && v!==path[0])board.active=-1;
      } else if(owner>=0) { board.paths[owner]=[v]; board.active=owner; }
      else if(occupied>=0) { board.paths[occupied]=board.paths[occupied].slice(0,board.paths[occupied].indexOf(v)+1); board.active=occupied; }
      else return null;
    } else if(id==='saturn' && action.type==='block' && Array.isArray(v) && Number.isInteger(v[0]) && def.blocks[v[0]] && [-1,1].includes(v[1])) {
      const [i,sign]=v, b=def.blocks[i], pos=board.positions[i], end=sign<0?pos-1:pos+b.len;
      if(end<0||end>=6)return null;
      const cell=b.axis==='h'?b.y*6+end:end*6+b.x;
      if(def.blocks.some((_,j)=>j!==i && blockCells(def,board.positions,j).includes(cell)))return null;
      board.positions[i]+=sign;
    } else if(['mars','uranus','neptune'].includes(id) && action.type==='move' && Number.isInteger(v) && v>=0 && v<4) {
      if(id==='uranus')board.balls=slide(board.balls,v,def);
      else if(id==='neptune') {
        board.player=slide([board.player],v,def)[0];
        if(board.player===current.player)return null;
        if(board.player===def.goals[board.collected])board.collected++;
      } else {
        const to=neighbour(board.player,v,def.n);
        if(to<0||def.walls.includes(to))return null;
        if(board.crates.includes(to)) {
          const beyond=neighbour(to,v,def.n);
          if(beyond<0||def.walls.includes(beyond)||board.crates.includes(beyond))return null;
          board.crates=board.crates.map(p=>p===to?beyond:p).sort((a,b)=>a-b);
        }
        board.player=to;
      }
    } else return null;
    return same(board,current)?null:board;
  }
  function wetPipes(def,board) {
    const seen=new Set([def.path[0]]), queue=[def.path[0]];
    for(let i=0;i<queue.length;i++)for(let d=0;d<4;d++) {
      const p=queue[i],q=neighbour(p,d,def.n);
      if(q>=0 && !seen.has(q) && (board.pipes[p]&(1<<d)) && (board.pipes[q]&(1<<((d+2)%4)))) { seen.add(q); queue.push(q); }
    }
    return seen;
  }
  function completedPaths(def,board) { return board.paths.filter((p,i)=>p.length>1 && [p[0],p.at(-1)].every(v=>[def.paths[i][0],def.paths[i].at(-1)].includes(v))).length; }
  function won(id,def,board) {
    if(id==='mercury')return board.lights.every(v=>v===0);
    if(id==='venus')return wetPipes(def,board).size===def.n**2;
    if(id==='earth')return completedPaths(def,board)===def.paths.length && board.paths.flat().length===def.n**2;
    if(id==='mars')return board.crates.every(p=>def.goals.includes(p));
    if(id==='jupiter')return board.phases.every(p=>p===0);
    if(id==='saturn')return board.positions[0]===4;
    if(id==='uranus')return board.balls.every(p=>def.goals.includes(p));
    return board.collected===def.goals.length;
  }
  function lightSolution(def,board) {
    const n=def.n**2, rows=Array.from({length:n},(_,i)=>[...Array.from({length:n},(_,j)=>Number(toggles(j,def.n).includes(i))),board.lights[i]]), pivots=[];
    let row=0;
    for(let col=0;col<n;col++) {
      const found=rows.findIndex((r,i)=>i>=row && r[col]); if(found<0)continue;
      [rows[row],rows[found]]=[rows[found],rows[row]];
      for(let i=0;i<n;i++)if(i!==row&&rows[i][col])for(let j=col;j<=n;j++)rows[i][j]^=rows[row][j];
      pivots.push(col); row++;
    }
    const free=Array.from({length:n},(_,i)=>i).filter(i=>!pivots.includes(i)); let best=null;
    for(let mask=0;mask<2**free.length;mask++) {
      const values=Array(n).fill(0); free.forEach((p,i)=>values[p]=(mask>>i)&1);
      pivots.forEach((p,i)=>{ values[p]=rows[i][n]; free.forEach(f=>values[p]^=rows[i][f]&values[f]); });
      const result=values.flatMap((v,i)=>v?[i]:[]); if(!best||result.length<best.length)best=result;
    }
    return best;
  }
  function actionsFor(id,def) {
    if(id==='jupiter')return Array.from({length:def.count},(_,value)=>({type:'moon',value}));
    if(id==='saturn')return def.blocks.flatMap((_,i)=>[-1,1].map(sign=>({type:'block',value:[i,sign]})));
    return DIRS.map((_,value)=>({type:'move',value}));
  }
  async function solve(id,def,board,signal) {
    if(id==='mercury')return lightSolution(def,board).map(value=>({type:'cell',value}));
    const actions=actionsFor(id,def), nodes=[{board,parent:-1,action:null}], seen=new Set([JSON.stringify(board)]);
    for(let head=0;head<nodes.length && nodes.length<150000;head++) {
      if(head%1200===0) { await new Promise(resolve=>setTimeout(resolve,0)); if(signal?.aborted)return null; }
      const node=nodes[head];
      if(won(id,def,node.board)) { const path=[]; let i=head; while(nodes[i].parent>=0){ path.push(nodes[i].action); i=nodes[i].parent; } return path.reverse(); }
      for(const action of actions) {
        const next=transition(id,def,node.board,action); if(!next)continue;
        // A sample in a non-goal corner can never be recovered in a push-only puzzle.
        if(id==='mars' && next.crates.some(p=>!def.goals.includes(p) && [0,2].some(d=>def.walls.includes(neighbour(p,d,def.n))) && [1,3].some(d=>def.walls.includes(neighbour(p,d,def.n)))))continue;
        const key=JSON.stringify(next); if(seen.has(key))continue;
        seen.add(key); nodes.push({board:next,parent:head,action});
      }
    }
    return null;
  }
  function par(id,def,board) {
    if(id==='mercury')return lightSolution(def,board).length;
    if(id==='earth')return def.n**2-def.paths.length;
    if(id==='venus')return board.pipes.reduce((sum,m,p)=>{
      let best=4;
      for(let turns=0;turns<4;turns++){if(m===def.target[p])best=Math.min(best,turns,4-turns);m=rotate(m);}
      return sum+best;
    },0);
    if(id==='jupiter')return def.solution?.length??null;
    return def.solution.length;
  }
  function actionCost(id,before,after) {
    if(id!=='earth')return 1;
    return after.paths.flat().length>before.paths.flat().length && after.paths.some(p=>p.length>1 && !same(p,before.paths[after.paths.indexOf(p)])) ? 1 : 0;
  }
  function progress(id,def,board) {
    if(id==='mercury')return `${board.lights.filter(v=>!v).length} / ${def.n**2} in shadow`;
    if(id==='venus')return `${wetPipes(def,board).size} / ${def.n**2} pipes supplied`;
    if(id==='earth')return `${completedPaths(def,board)} / ${def.paths.length} linked · ${board.paths.flat().length} / ${def.n**2} squares`;
    if(id==='mars')return `${board.crates.filter(p=>def.goals.includes(p)).length} / ${def.goals.length} samples stored`;
    if(id==='jupiter')return `${board.phases.filter(v=>v===0).length} / ${def.count} aligned`;
    if(id==='saturn')return `Probe: ${4-board.positions[0]} squares from exit`;
    if(id==='uranus')return `${board.balls.filter(p=>def.goals.includes(p)).length} / ${def.goals.length} capsules docked`;
    return `${board.collected} / ${def.goals.length} beacons reached`;
  }
  function pipeArt(mask,extra='') {
    return `<svg viewBox="0 0 100 100" aria-hidden="true" class="pipe-art ${extra}">${DIRS.map(([x,y],d)=>mask&(1<<d)?`<path class="pipe-channel" d="M50 50L${50+x*50} ${50+y*50}"/>`:'').join('')}${DIRS.map(([x,y],d)=>mask&(1<<d)?`<path class="pipe-core" d="M50 50L${50+x*50} ${50+y*50}"/>`:'').join('')}${DIRS.map(([x,y],d)=>mask&(1<<d)?`<path class="pipe-flow" d="M50 50L${50+x*50} ${50+y*50}"/>`:'').join('')}<circle class="pipe-joint" cx="50" cy="50" r="7"/></svg>`;
  }
  // --- Board themes ---
  function boardHTML(id,def,board,ui={}) {
    const deal=ui.deal?p=>`--deal:${Math.min(p,40)};`:()=> '';
    if(id==='jupiter') {
      const plan=ui.plan||[], hasPlan=plan.some(c=>c>0);
      const projected=hasPlan?orbitPlan(def,board,plan).board.phases:null;
      return `<div class="orbital-dials ${ui.won?'is-won':''}">${board.phases.map((phase,i)=>{
        const moon=moonNames[i], burns=plan[i]||0, aim=projected?projected[i]:phase;
        const label=projected
          ? `${moon}: now at ${phase} of ${def.divisions}; the plan moves it to ${aim}${aim===0?', aligned':''}. Queue another burn (${coupling(def,i)}). ${burns} queued.`
          : `Queue a burn on ${moon}: ${coupling(def,i)}. Position ${phase} of ${def.divisions}; target 0.`;
        return `<button class="orbital-dial ${phase===0?'aligned':''} ${projected&&aim===0?'plan-aligned':''} ${burns?'has-burns':''} ${ui.hintCell===i?'hinted':''} ${ui.changed?.has(i)?'changed':''}" style="${ui.deal?`--deal:${i};`:''}" data-puzzle-moon="${i}" aria-label="${label}"><span class="dial-title">${moon}</span><svg viewBox="0 0 150 150" aria-hidden="true"><circle class="dial-track" cx="75" cy="75" r="53"/><circle class="dial-track-inner" cx="75" cy="75" r="30"/>${Array.from({length:def.divisions},(_,j)=>{const a=j/def.divisions*Math.PI*2;return `<circle cx="${75+Math.sin(a)*53}" cy="${75-Math.cos(a)*53}" r="${j===0?5:2}" class="${j===0?'dial-target':''}"/>`;}).join('')}<path class="dial-needle" d="M75 75L75 22" transform="rotate(${phase/def.divisions*360} 75 75)"/>${projected&&aim!==phase?`<path class="dial-needle dial-needle-plan" d="M75 75L75 32" transform="rotate(${aim/def.divisions*360} 75 75)"/>`:''}${projected?`<circle class="dial-moon-plan" cx="${75+Math.sin(aim/def.divisions*Math.PI*2)*53}" cy="${75-Math.cos(aim/def.divisions*Math.PI*2)*53}" r="5"/>`:''}<circle class="dial-moon" cx="${75+Math.sin(phase/def.divisions*Math.PI*2)*53}" cy="${75-Math.cos(phase/def.divisions*Math.PI*2)*53}" r="8"/></svg><span class="dial-position">${phase} / ${def.divisions} <span>${phase===0?'Aligned':'Queue +1 burn'}</span></span>${projected?`<span class="dial-position dial-plan-row">Now ${phase} → Plan ${aim} <span>${aim===0?'Will align ✓':'Off target'}</span></span>`:''}<small>${coupling(def,i)}</small>${burns?`<span class="burn-badge" aria-hidden="true">×${burns}</span>`:''}</button>`;
      }).join('')}</div>`;
    }
    if(id==='saturn')return `<div class="puzzle-grid ring-board board-saturn ${ui.won?'is-won':''}" style="--grid:6" role="group" aria-label="Sliding ring passage"><span class="ring-exit" aria-hidden="true">EXIT →</span>${Array.from({length:36},(_,p)=>`<span class="ring-square" style="${deal(p)}" aria-hidden="true"></span>`).join('')}</div>`;
    const wet=id==='venus'?wetPipes(def,board):null;
    return `<div class="puzzle-grid board-${id} ${id==='earth'?'flow-board':''} ${['mars','uranus','neptune'].includes(id)?'swipe-board':''} ${ui.won?'is-won':''}" style="--grid:${def.n}" role="group" aria-label="${catalogue[id].title} puzzle board">${Array.from({length:def.n**2},(_,p)=>{
      let text='',art='',kind='',label=`Row ${Math.floor(p/def.n)+1}, column ${p%def.n+1}`,style='';
      if(id==='mercury') {const lit=board.lights[p];kind=lit?'sunlit':'shadow';art='<span class="crater" aria-hidden="true"><i></i><i></i><i></i></span>';text=lit?'☀':'';label+=lit?', sunlit crater':', shadowed crater';}
      if(id==='venus') {
        const end=p===def.path[0]?'pump':p===def.path.at(-1)?'receiver':'';
        kind=`pipe-cell ${wet.has(p)?'supplied':''} ${def.fixed.includes(p)?'pinned':''}`;
        art=pipeArt(board.pipes[p]);text=end?`<span class="fitting ${end}">${end==='pump'?'P':'R'}</span>`:def.fixed.includes(p)?'<span class="rivet-mark">•</span>':'';
        label+=`, pipe ${DIRS.map((_,d)=>board.pipes[p]&(1<<d)?directionNames[d]:'').filter(Boolean).join(' and ')}${end?`, ${end}`:''}${def.fixed.includes(p)?', fixed':''}`;
      }
      if(id==='earth') {
        const endpoint=def.paths.findIndex(path=>path[0]===p||path.at(-1)===p), owner=board.paths.findIndex(path=>path.includes(p)), colour=endpoint>=0?endpoint:owner;
        if(colour>=0)style=`--path-colour:${colours[colour]};`;
        kind=`flow-cell ${endpoint>=0?'flow-station':''} ${owner>=0?'routed':''} ${board.active===colour && colour>=0?'active-route':''}`;
        if(endpoint>=0)text=`<span class="station-ring" aria-hidden="true"></span><b>${endpoint+1}</b>`;
        if(owner>=0) {const path=board.paths[owner],at=path.indexOf(p);let mask=0;for(const q of [path[at-1],path[at+1]])if(q!==undefined)mask|=1<<direction(p,q,def.n);art=pipeArt(mask,'river');}
        label+=endpoint>=0?`, station ${endpoint+1}`:owner>=0?`, path ${owner+1}`:', empty';
      }
      if(def.walls?.includes(p)) {kind='terrain-wall';label+=', wall';}
      else if(id==='mars') {
        if(def.goals.includes(p)){kind+=' goal-cell';label+=', collection bay';}
        if(board.crates.includes(p)){label+=', sample canister';}
        if(board.player===p){label+=', rover';}
      } else if(id==='uranus') {
        if(def.goals.includes(p)){kind+=' goal-cell';label+=', socket';}
        if(board.balls.includes(p)){label+=', capsule';}
      } else if(id==='neptune') {
        const at=def.goals.indexOf(p);
        if(at>=0){kind+=` buoy-cell ${at<board.collected?'visited':''} ${at===board.collected?'next-buoy':''}`;art=`<span class="buoy-marker" aria-hidden="true"><i></i><b>${at===3?'R':at+1}</b></span>`;label+=`, ${at===3?'relay':'buoy '+(at+1)}${at<board.collected?', collected':''}`;}
        if(board.player===p){label+=', probe';}
      }
      const interactive=['mercury','venus','earth','mars'].includes(id) && !def.walls?.includes(p);
      return `<${interactive?'button':'span'} class="puzzle-cell ${kind} ${ui.hintCell===p?'hinted':''} ${ui.changed?.has(p)?'changed':''}" style="${style}${deal(p)}" ${interactive?`data-puzzle-cell="${p}" aria-label="${label}"${id==='venus'&&def.fixed.includes(p)?' aria-disabled="true"':''}`:`role="img" aria-label="${label}"`}>${art}<span class="cell-mark" aria-hidden="true">${text}</span></${interactive?'button':'span'}>`;
    }).join('')}</div>`;
  }
  // Persistent overlay pieces (rover, canisters, capsules, probe, ring blocks) glide via CSS transitions.
  function piecesHTML(id,def,board,ui={}) {
    const deal=ui.deal?(i)=>`--deal:${i};`:()=>'';
    if(id==='saturn')return `<div class="pieces-layer ring-pieces" style="--grid:6">${def.blocks.map((b,i)=>{
      const p=board.positions[i],x=b.axis==='h'?p:b.x,y=b.axis==='v'?p:b.y;
      return `<button class="ring-block ${i===0?'probe-block':''} ${ui.selected===i?'selected':''} ${ui.hintCell===i?'hinted':''}" style="--x:${x};--y:${y};--w:${b.axis==='h'?b.len:1};--h:${b.axis==='v'?b.len:1};${deal(i)}" data-x="${x}" data-y="${y}" data-puzzle-block="${i}" aria-pressed="${ui.selected===i}" aria-label="${i===0?'Probe P':`Block ${i}`} · ${b.axis==='h'?'horizontal':'vertical'}"><span class="block-label">${i===0?'P':i}</span><small>${b.axis==='h'?'↔':'↕'}</small>${i===0?'<i class="probe-porthole" aria-hidden="true"></i>':''}</button>`;
    }).join('')}</div>`;
    if(!['mars','uranus','neptune'].includes(id))return '';
    const piece=(cls,x,y,extra='',i=0)=>`<span class="piece ${cls}" data-x="${x}" data-y="${y}" style="--x:${x};--y:${y};${deal(i)}${extra}" aria-hidden="true"></span>`;
    const pos=p=>({x:p%def.n,y:Math.floor(p/def.n)});
    if(id==='mars')return `<div class="pieces-layer" style="--grid:${def.n}" aria-hidden="true">${board.crates.map((p,i)=>{const {x,y}=pos(p);return piece(`crate ${def.goals.includes(p)?'stored':''}`,x,y,'',i);}).join('')}${(()=>{const {x,y}=pos(board.player);return piece('rover',x,y,`--face:${[270,0,90,180][ui.face??1]}deg;`,9);})()}</div>`;
    if(id==='uranus')return `<div class="pieces-layer" style="--grid:${def.n}" aria-hidden="true">${board.balls.map((p,i)=>{const {x,y}=pos(p);return piece(`capsule ${def.goals.includes(p)?'docked':''}`,x,y,'',i);}).join('')}</div>`;
    const {x,y}=pos(board.player);
    return `<div class="pieces-layer" style="--grid:${def.n}" aria-hidden="true">${piece('probe',x,y,`--face:${[270,0,90,180][ui.face??1]}deg;`)}</div>`;
  }
  // --- Strategy hints shown before solver hints ---
  const hintTips = {
    mercury:['Strategy: work row by row. Use the row below to fix the row above, and never touch a finished row again.','Corner switches affect only three craters. When in doubt, start from a corner.'],
    venus:['Start at the pump P and receiver R: their open sides tell you which neighbours must connect.','Every pipe needs a connection on every open side. An end pointing at the board edge is always wrong.'],
    earth:['Outline the board first: routes along the walls have fewer ways to go wrong.','The shortest-looking route often steals squares another pair needs. Fill awkward corners early.'],
    mars:['Never push a canister into a corner without a bay. Plan backwards from each bay.','The canister nearest the walls usually has to be placed first.'],
    jupiter:['The links form a loop: solve the projected positions together, rather than fixing one moon at a time.','A full cycle of burns on one moon cancels itself. Try fewer burns and compare every projected position.'],
    saturn:['Work backwards from the exit: which block must move last to open the lane?','Moving a block away from the exit often unlocks two moves later.'],
    uranus:['Use one capsule as a wall for the other. Decide which capsule stops last.','The final tilt usually seats only one capsule directly — the others must already be in place.'],
    neptune:['Passing over a buoy does nothing — you must stop exactly on it. Find the barrier beyond it.','The barriers never move. Approach each buoy along a row or column with a barrier that stops you on it.'],
  };
  // --- Endless mode: seeded, solver-verified board generation ---
  function rng(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  function idSeed(id){return [...id].reduce((s,c)=>s+c.charCodeAt(0),0);}
  function hamilton(n,seed){
    const random=rng(seed),path=[0],used=new Set([0]);let budget=400000;
    const deg=v=>DIRS.reduce((c,_,d)=>{const q=neighbour(v,d,n);return c+(q>=0&&!used.has(q)?1:0);},0);
    const go=()=>{ if(--budget<0)return false; if(path.length===n*n)return true;
      let opts=DIRS.map((_,d)=>neighbour(path.at(-1),d,n)).filter(v=>v>=0&&!used.has(v));
      opts.sort(()=>random()-.5); opts.sort((a,b)=>deg(a)-deg(b));
      for(const v of opts){used.add(v);path.push(v);if(go())return true;used.delete(v);path.pop();}
      return false;};
    return go()?path:null;
  }
  function sample(random,arr,count){const pool=[...arr],out=[];while(out.length<count&&pool.length)out.push(pool.splice(Math.floor(random()*pool.length),1)[0]);return out;}
  const endlessCache=new Map();
  async function endless(id,round,options={}) {
    const replay=Number.isInteger(options.seed),signal=options.signal;
    if(replay)round=Math.max(0,Math.min(6,Number.isInteger(options.difficulty)?options.difficulty:round));
    const seed=replay?options.seed>>>0:null;
    const key=replay?`${id}:replay:${seed}:${round}`:`${id}:${round}`;if(endlessCache.has(key))return clone(endlessCache.get(key));
    const base=replay?seed:idSeed(id)*100003+round*7919;let def=null;
    if(id==='mercury') {
      const n=round<2?4:round<6?5:6,target=Math.min(3+round,n===6?14:n===5?9:6);
      for(let salt=0;!def&&salt<80;salt++){if(signal?.aborted)return null;const cand={n,seed:base+salt};const p=lightSolution(cand,initial('mercury',cand,0)).length;if(p>=target&&p<=target+3)def=cand;}
    } else if(id==='venus'||id==='earth') {
      const n=Math.min(7,4+Math.floor(round/3));
      for(let salt=0;!def&&salt<80;salt++) {if(signal?.aborted)return null;
        const path=hamilton(n,base+salt);if(!path)continue;
        if(id==='venus'){def={n,path};def.target=pipeTargets(def);def.fixed=[path[0],path.at(-1)];}
        else {
          const random=rng(base+salt+1),count=Math.min(6,3+Math.floor(round/2)),lengths=Array(count).fill(3);
          for(let i=0;i<n*n-3*count;i++)lengths[Math.floor(random()*count)]++;
          const paths=[];let cursor=0;for(const length of lengths){paths.push(path.slice(cursor,cursor+length));cursor+=length;}
          def={n,paths};
        }
      }
    } else if(id==='jupiter') {
      const count=round<3?3:4,divisions=[4,5,6,6,7,8,9][Math.min(round,6)],double=round>=5;
      for(let salt=0;!def&&salt<80;salt++) {if(signal?.aborted)return null;
        const cand={count,divisions,double},board=initial('jupiter',cand,round*13+salt);
        if(replay){const random=rng(base+salt);for(let j=0;j<11+round;j++)advance(board,cand,Math.floor(random()*count));if(board.phases.every(v=>v===0))advance(board,cand,0);}
        const sol=await solve('jupiter',cand,board,signal);
        if(sol&&sol.length>=Math.min(3+round,8))def={...cand,startPhases:board.phases,solution:sol.map(a=>a.value)};
      }
    } else if(id==='mars') {
      const n=round<2?6:7,count=round<3?2:3,minLen=Math.min(8+round*3,26);
      for(let salt=0;!def&&salt<80;salt++) {if(signal?.aborted)return null;
        const random=rng(base+salt);
        for(let attempt=0;attempt<60&&!def;attempt++) {
          const walls=new Set();for(let p=0;p<n*n;p++)if(p%n===0||p%n===n-1||Math.floor(p/n)===0||Math.floor(p/n)===n-1)walls.add(p);
          let free=[...Array(n*n).keys()].filter(p=>!walls.has(p));
          sample(random,free,round<2?1:3).forEach(p=>walls.add(p));free=free.filter(p=>!walls.has(p));
          const goals=sample(random,free,count).sort((a,b)=>a-b),crates=new Set(goals);let p=sample(random,free.filter(v=>!crates.has(v)),1)[0];
          for(let i=0;i<160;i++){const d=Math.floor(random()*4),to=neighbour(p,d,n),behind=neighbour(p,(d+2)%4,n);if(to<0||walls.has(to)||crates.has(to))continue;if(crates.has(behind)&&random()<.8){crates.delete(behind);crates.add(p);}p=to;}
          const cand={n,walls:[...walls].sort((a,b)=>a-b),goals,player:p,crates:[...crates].sort((a,b)=>a-b)};
          const sol=await solve('mars',cand,initial('mars',cand,0),signal);
          if(sol&&sol.length>=minLen)def={...cand,solution:sol.map(a=>a.value)};
        }
      }
    } else if(id==='saturn') {
      const minLen=Math.min(5+round*2,18);
      for(let salt=0;!def&&salt<80;salt++) {if(signal?.aborted)return null;
        const random=rng(base+salt);
        for(let attempt=0;attempt<80&&!def;attempt++) {
          const blocks=[{x:4,y:2,len:2,axis:'h'}],used=new Set([16,17]);
          for(let i=0;i<45;i++){const axis=random()<.5?'h':'v',len=random()<.34?3:2,x=Math.floor(random()*6),y=Math.floor(random()*6);
            const cells=Array.from({length:len},(_,j)=>(y+(axis==='v'?j:0))*6+x+(axis==='h'?j:0));
            if((axis==='h'?x+len:y+len)>6||cells.some(c=>used.has(c)))continue;
            blocks.push({x,y,len,axis});cells.forEach(c=>used.add(c));}
          const steps=cand=>{const occupied=new Set();cand.blocks.forEach((b,i)=>{const pos=cand.positions[i];for(let j=0;j<b.len;j++)occupied.add((b.axis==='h'?b.y:pos+j)*6+(b.axis==='h'?pos+j:b.x));});
            return cand.blocks.flatMap((b,i)=>[-1,1].map(sign=>({i,sign}))).filter(({i,sign})=>{const b=cand.blocks[i],pos=cand.positions[i],end=sign<0?pos-1:pos+b.len;if(end<0||end>=6)return false;return !occupied.has(b.axis==='h'?b.y*6+end:end*6+b.x);});};
          const positions=blocks.map(b=>b.axis==='h'?b.x:b.y),state={blocks,positions};
          for(let i=0;i<600;i++){const opts=steps(state);if(!opts.length)break;const {i:bi,sign}=opts[Math.floor(random()*opts.length)];positions[bi]+=sign;}
          const cand={n:6,blocks:blocks.map((b,i)=>({...b,[b.axis==='h'?'x':'y']:positions[i]}))};
          const sol=await solve('saturn',cand,{positions:[...positions]},signal);
          if(sol&&sol.length>=minLen)def={...cand,solution:sol.map(a=>a.value)};
        }
      }
    } else if(id==='uranus') {
      const n=round<3?6:7,ballCount=round<3?2:3,minLen=Math.min(3+round,8);
      for(let salt=0;!def&&salt<80;salt++) {if(signal?.aborted)return null;
        const random=rng(base+salt);
        for(let attempt=0;attempt<80&&!def;attempt++) {
          const walls=new Set();for(let p=0;p<n*n;p++)if(p%n===0||p%n===n-1||Math.floor(p/n)===0||Math.floor(p/n)===n-1)walls.add(p);
          let free=[...Array(n*n).keys()].filter(p=>!walls.has(p));sample(random,free,3+Math.min(round,5)).forEach(p=>walls.add(p));free=free.filter(p=>!walls.has(p));
          let balls=sample(random,free,ballCount).sort((a,b)=>a-b);const start=[...balls];const wallArr=[...walls].sort((a,b)=>a-b);const cand={n,walls:wallArr};
          for(let i=0;i<25;i++)balls=slide(balls,Math.floor(random()*4),cand);
          const goals=[...balls].sort((a,b)=>a-b);
          const sol=await solve('uranus',{...cand,goals},{balls:start},signal);
          if(sol&&sol.length>=minLen)def={...cand,goals,balls:start,solution:sol.map(a=>a.value)};
        }
      }
    } else { // neptune
      const n=[6,7,7,8][Math.min(round,3)],minLen=Math.min(7+round*2,16);
      for(let salt=0;!def&&salt<80;salt++) {if(signal?.aborted)return null;
        const random=rng(base+salt);
        for(let attempt=0;attempt<80&&!def;attempt++) {
          const walls=new Set();for(let p=0;p<n*n;p++)if(p%n===0||p%n===n-1||Math.floor(p/n)===0||Math.floor(p/n)===n-1)walls.add(p);
          let free=[...Array(n*n).keys()].filter(p=>!walls.has(p));sample(random,free,3+Math.min(round,6)).forEach(p=>walls.add(p));free=free.filter(p=>!walls.has(p));
          const start=sample(random,free,1)[0],wallArr=[...walls].sort((a,b)=>a-b),cand={n,walls:wallArr};
          let p=start;const stops=[];
          for(let i=0;i<40;i++){p=slide([p],Math.floor(random()*4),cand)[0];if(p!==start&&!stops.includes(p))stops.push(p);}
          if(stops.length<4)continue;
          const goals=sample(random,stops,4);
          const sol=await solve('neptune',{...cand,goals},{player:start,collected:0},signal);
          if(sol&&sol.length>=minLen)def={...cand,goals,player:start,solution:sol.map(a=>a.value)};
        }
      }
    }
    if(def){if(endlessCache.size>=120)endlessCache.delete(endlessCache.keys().next().value);endlessCache.set(key,structuredClone(def));}return def;
  }
  async function replay(id,seed,difficulty=2,signal){return endless(id,difficulty,{seed:seed>>>0,difficulty,signal});}
  return {catalogue,names,definition,initial,transition,won,solve,par,actionCost,progress,boardHTML,piecesHTML,hintTips,endless,replay,neighbour,direction,directionNames,pipeTargets,rotate,completedPaths,lessons,instruction,explainAction,orbitPlan,coupling,moonNames};
})();
