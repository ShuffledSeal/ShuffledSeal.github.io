"""Four-chamber Grand Expeditions across all eight planetary puzzle engines.

Run from the repository root with: python3 tests/deep-puzzles.py
Requires the developer-only Python Playwright package and Chromium.
"""
import http.server
import json
import socketserver
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
SEED = 24681357
OTHER_SEED = 97531864


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


VERIFY_ENGINES = r'''async () => {
  const P=AetherPuzzles,ids=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
  const snapshot=()=>ids.flatMap(id=>Array.from({length:5},(_,index)=>{const def=P.definition(id,index);return {def,board:P.initial(id,def,index)};}));
  const craftedBefore=snapshot(),replayBefore=await P.replay('mercury',123456,2),report=[];
  for(const id of ids){
    const started=performance.now(),run=await P.expedition(id,24681357),same=await P.expedition(id,24681357),other=await P.expedition(id,97531864);
    if(!run||!same||!other)throw Error(id+' expedition generation failed');
    if(JSON.stringify(run)!==JSON.stringify(same))throw Error(id+' expedition was not deterministic');
    if(JSON.stringify(run)===JSON.stringify(other))throw Error(id+' expedition ignored its seed');
    if(run.stages.length!==4||!run.stages[3].expedition.finale||run.stages.slice(0,3).some(def=>def.expedition.finale))throw Error(id+' lacks three chambers and a finale');
    const par=run.stages.reduce((sum,def)=>sum+def.expedition.par,0);
    if(run.par!==par||run.energy!==par+4)throw Error(id+' shared energy is not tied to its verified plans');
    const stageReport=[];
    for(let stage=0;stage<4;stage++){
      const def=run.stages[stage],exp=def.expedition,initial=P.initial(id,def,6);
      if(P.won(id,def,initial))throw Error(id+' stage '+stage+' started solved');
      if(initial.dial!==0||initial.seals.length!==2||initial.seals.some(Boolean))throw Error(id+' stage '+stage+' has an invalid initial mechanism');
      const solution=exp.solution;
      if(!solution.some(a=>a.type==='mechanism'&&a.value==='cycle')||!solution.some(a=>a.type==='mechanism'&&a.value===0)||!solution.some(a=>a.type==='mechanism'&&a.value===1))throw Error(id+' stage '+stage+' skips a new mechanic');
      if(!solution.some(a=>a.type!=='mechanism'))throw Error(id+' stage '+stage+' has no core puzzle');
      if(stage>0&&id!=='saturn'&&(!exp.transformed||exp.coreDial===0))throw Error(id+' later stage escaped transformed-core play');
      if(JSON.stringify(P.expeditionPath(def,initial))!==JSON.stringify(solution))throw Error(id+' stored hint path differs from its verified solution');

      // A real core action is refused by its ward, then accepted after the
      // player turns the mechanism, opens ward one, and restores the frame.
      const firstCore=solution.find(a=>a.type!=='mechanism');
      if(!exp.seals[0].targets.includes(P.expeditionActionTarget(firstCore)))throw Error(id+' first core action is not actually warded');
      if(P.transition(id,def,initial,firstCore)!==null)throw Error(id+' ward did not refuse a locked core action');
      if(P.transition(id,def,initial,{type:'mechanism',value:0})!==null)throw Error(id+' ward opened away from its inscription');
      let cycled=P.transition(id,def,initial,{type:'mechanism',value:'cycle'});
      if(!cycled||cycled.dial!==1)throw Error(id+' cycle did not advance deterministically');
      if(P.transition(id,def,cycled,{type:'mechanism',value:1})!==null)throw Error(id+' ordered ward two opened before ward one');
      let opened=P.transition(id,def,cycled,{type:'mechanism',value:0});
      if(!opened||!opened.seals[0])throw Error(id+' aligned ward did not open');
      while(opened.dial!==exp.coreDial)opened=P.transition(id,def,opened,{type:'mechanism',value:'cycle'});
      if(!P.transition(id,def,opened,firstCore))throw Error(id+' opening the ward did not release its core action at the stage mechanism position');

      // Each genre's moving subsystem must change its own native rules, not
      // merely a label. The stored plans subsequently exercise these states.
      if(id==='mercury'&&JSON.stringify(cycled.lights)===JSON.stringify(initial.lights))throw Error('Mercury zodiac did not rotate craters');
      if(id==='venus'&&JSON.stringify(cycled.pipes)===JSON.stringify(initial.pipes))throw Error('Venus carousel did not rotate pipes');
      if(id==='earth'&&new Set(def.expedition.gateTrack.map(gates=>JSON.stringify(gates))).size<2)throw Error('Earth meridian did not move its gates');
      if(id==='mars'){
        const cell=def.expedition.portcullis[0];
        if(!Number.isInteger(cell)||P.expeditionWall(def,initial,cell)||!P.expeditionWall(def,cycled,cell))throw Error('Mars portcullis did not change topology');
      }
      if(id==='jupiter'){
        const forward=P.transition(id,def,opened,{type:'moon',value:0}),reverseBoard=P.transition(id,def,opened,{type:'mechanism',value:'cycle'}),reversed=P.transition(id,def,reverseBoard,{type:'moon',value:0});
        if(!forward||!reversed||JSON.stringify(forward.phases)===JSON.stringify(reversed.phases))throw Error('Jupiter choir did not reverse coupling');
        const counts=Array(def.count).fill(0);counts[firstCore.value]=1;
        const preview=P.orbitPlan(def,initial,counts);
        if(preview.valid||preview.invalidAction?.value!==firstCore.value||preview.actions.length||JSON.stringify(preview.board)!==JSON.stringify(initial))throw Error('Jupiter invalid preview mutated or dereferenced its board');
        if(!P.boardHTML(id,def,initial,{plan:counts}).includes('blocked by a ward'))throw Error('Jupiter invalid preview was not explained accessibly');
      }
      if(id==='saturn'){
        if(P.coreWon(id,def,initial)||!P.coreWon(id,def,cycled))throw Error('Saturn exit did not move to the western edge');
        if(!P.boardHTML(id,def,cycled).includes('← EXIT'))throw Error('Saturn western exit was not presented');
      }
      if(id==='uranus'||id==='neptune'){
        let changed=false,probe=initial;
        for(let step=0;step<=solution.length&&!changed;step++){
          if(probe.dial===0){
            const reverseBoard=P.transition(id,def,probe,{type:'mechanism',value:'cycle'});
            for(let d=0;d<4;d++){
              const ordinary=P.transition(id,def,probe,{type:'move',value:d}),rotated=P.transition(id,def,reverseBoard,{type:'move',value:d});
              if(ordinary&&rotated&&JSON.stringify(id==='uranus'?ordinary.balls:ordinary.player)!==JSON.stringify(id==='uranus'?rotated.balls:rotated.player))changed=true;
            }
          }
          if(step<solution.length)probe=P.transition(id,def,probe,solution[step]);
        }
        if(!changed)throw Error(id+' rotating frame did not change movement on any reachable verified state');
      }

      let board=initial,moves=0,transformedActions=0;
      for(const action of solution){
        if(board.dial!==0&&action.type!=='mechanism')transformedActions++;
        const next=P.transition(id,def,board,action);
        if(!next)throw Error(id+' stage '+stage+' stored solution contained an invalid action');
        const cost=P.actionCost(id,board,next);if(action.type==='mechanism'&&cost!==1)throw Error(id+' mechanism action did not spend shared energy');moves+=cost;board=next;
      }
      if(!P.won(id,def,board))throw Error(id+' stage '+stage+' stored solution did not win');
      if(id==='saturn'&&stage>0){
        if(board.exitStep!==3)throw Error('Saturn verified route did not record east-west-east completion');
        const secondSeal=solution.findIndex(action=>action.type==='mechanism'&&action.value===1),shortActions=[...solution.slice(0,secondSeal+1),{type:'mechanism',value:'cycle'}];
        if(shortActions.length>=solution.length)throw Error('Saturn shortcut regression fixture was not shorter');
        let short=initial;for(const action of shortActions){short=P.transition(id,def,short,action);if(!short)throw Error('Saturn short alternate route contained an invalid action');}
        if(!P.coreWon(id,def,short)||short.dial!==0||!short.seals.every(Boolean))throw Error('Saturn short alternate route did not reach the formerly accepted eastern/home state');
        if(P.won(id,def,short)||short.exitStep===3)throw Error('Saturn eastern-only shortcut bypassed western/follow-up objectives');
      }
      if(stage>0&&id!=='saturn'&&!transformedActions)throw Error(id+' later stage stored plan never acts under transformed rules');
      if(id==='saturn'&&stage>0&&!solution.some(a=>a.type==='block'&&a.value[0]===0&&a.value[1]===-1))throw Error('Saturn later stage lacks its westward moving-exit route');
      if(moves!==exp.par||moves!==P.par(id,def,initial))throw Error(id+' stage '+stage+' par does not match its verified plan');
      stageReport.push({stage,par:moves,actions:solution.length,cycles:solution.filter(a=>a.value==='cycle').length});
    }
    report.push({id,energy:run.energy,par:run.par,stages:stageReport,ms:Math.round(performance.now()-started)});
  }
  if(JSON.stringify(craftedBefore)!==JSON.stringify(snapshot()))throw Error('Expeditions mutated a crafted definition or board');
  if(JSON.stringify(replayBefore)!==JSON.stringify(await P.replay('mercury',123456,2)))throw Error('Expeditions mutated seeded replay generation');
  return report;
}'''


def completed_circuit():
    return {
        'seed': 123456,
        'stage': 2,
        'boards': [
            {'stars': 3, 'moves': 4, 'hints': 0},
            {'stars': 3, 'moves': 6, 'hints': 0},
            {'stars': 2, 'moves': 8, 'hints': 0},
        ],
        'actions': [],
        'hints': 0,
        'result': {'stars': 2, 'moves': 8, 'hints': 0},
    }


def crafted_save():
    return {
        'records': {'mercury:0': {'stars': 2, 'moves': 9}},
        'drafts': {'mercury:1': {'actions': [{'type': 'cell', 'value': 0}], 'hints': 0}},
        'levels': {'mercury': 0},
        'endless': {'mercury': {'best': 4}},
    }


def replay_save(planet, last='expedition', mastered=True):
    return {
        'version': 1,
        'daily': {},
        'circuits': {planet: completed_circuit()},
        'eclipse': {planet: {'seed': SEED, 'actions': [], 'hints': 0, 'result': {'stars': 3, 'moves': 5, 'hints': 0}}},
        'masterwork': {planet: {'seed': SEED, 'actions': [], 'hints': 0, 'result': {'stars': 3, 'moves': 5, 'hints': 0} if mastered else None}},
        'last': {planet: last},
    }


def install_save(page, replay, crafted=None):
    page.add_init_script(
        'if(!localStorage.getItem("aether-planet-replays-v1"))localStorage.setItem("aether-planet-replays-v1",' + json.dumps(json.dumps(replay)) + ');'
        'if(!localStorage.getItem("aether-planet-puzzles-v1"))localStorage.setItem("aether-planet-puzzles-v1",' + json.dumps(json.dumps(crafted or crafted_save())) + ');'
    )


def wait_for_title(page, title):
    page.wait_for_function(
        f'document.querySelector("#puzzle-level-name")?.textContent.includes({json.dumps(title)})',
        timeout=30000,
    )
    assert page.locator('.puzzle-grid, .orbital-dials').count() == 1
    assert page.locator('.puzzle-generation-error').count() == 0


def open_expedition(browser, base, planet, viewport=None, errors=None, touch=False):
    page = browser.new_page(
        viewport=viewport or {'width': 1280, 'height': 900},
        reduced_motion='reduce',
        has_touch=touch,
    )
    if errors is not None:
        page.on('pageerror', lambda error: errors.append(str(error)))
    install_save(page, replay_save(planet))
    page.goto(f'{base}/index.html#planet/{planet}', wait_until='networkidle')
    wait_for_title(page, 'Grand Expedition 1 / 4')
    assert page.locator('.expedition-controls').count() == 1
    return page


def open_instruments(browser, base, planet, viewport=None, errors=None, touch=False):
    page = browser.new_page(
        viewport=viewport or {'width': 1280, 'height': 900},
        reduced_motion='reduce',
        has_touch=touch,
    )
    if errors is not None:
        page.on('pageerror', lambda error: errors.append(str(error)))
    install_save(page, replay_save(planet, last='masterwork'))
    page.goto(f'{base}/index.html#planet/{planet}', wait_until='networkidle')
    wait_for_title(page, 'Masterwork instruments')
    return page


def expedition_plan(page, planet, stage):
    return page.evaluate('''async ({planet,stage}) => {
      const saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1')).expeditions[planet];
      const run=await AetherPuzzles.expedition(planet,saved.seed);
      const def=run.stages[stage];
      return {actions:def.expedition.solution,par:def.expedition.par,energy:run.energy,parTotal:run.par};
    }''', {'planet': planet, 'stage': stage})


def masterwork_actions(page, planet):
    return page.evaluate('''async ({planet}) => {
      const saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1')).masterwork[planet];
      const def=await AetherPuzzles.masterwork(planet,saved.seed);
      return def.masterwork.solution;
    }''', {'planet': planet})


def play_action(page, planet, action, keyboard=False, touch=False):
    kind, value = action['type'], action['value']
    if kind == 'mechanism':
        if keyboard:
            page.locator('.expedition-cycle').focus()
            page.keyboard.press('c' if value == 'cycle' else str(value + 1))
        elif touch:
            page.locator(f'[data-puzzle-mechanism="{value}"]').tap()
        else:
            page.locator(f'[data-puzzle-mechanism="{value}"]').click()
        return

    instrument = action.get('instrument')
    if instrument in ('diagonal', 'mirror', 'winch', 'swap', 'pulse'):
        page.locator(f'[data-puzzle-instrument="{instrument}"]').click()
    elif planet in ('mercury', 'venus', 'jupiter', 'mars', 'neptune'):
        page.locator('[data-puzzle-instrument="primary"]').click()

    if kind == 'cell':
        page.locator(f'[data-puzzle-cell="{value}"]').click()
    elif kind == 'moon':
        page.locator(f'[data-puzzle-moon="{value}"]').click()
        if instrument != 'swap':
            page.locator('[data-puzzle="launch"]').click()
    elif kind == 'move':
        if 'anchor' in action:
            page.locator(f'[data-puzzle-cell="{action["anchor"]}"]').click()
        elif planet == 'uranus':
            page.locator('[data-puzzle-instrument="primary"]').click()
        page.locator(f'[data-puzzle-direction="{value}"]').click()
    elif kind == 'block':
        index, sign = value
        page.locator(f'[data-puzzle-block="{index}"]').click()
        if instrument == 'rotate':
            page.locator('[data-puzzle="rotate-block"]').click()
        else:
            arrow = page.locator(f'[data-puzzle-block="{index}"] small').inner_text()
            direction = ({True: 1, False: 3} if arrow == '↔' else {True: 2, False: 0})[sign > 0]
            page.locator(f'[data-puzzle-direction="{direction}"]').click()
    else:
        raise AssertionError(f'unknown action: {action}')


def play_actions(page, planet, actions, keyboard=False):
    for action in actions:
        play_action(page, planet, action, keyboard=keyboard)


def pointer_drag(page, locator, dx, dy, touch=False):
    locator.scroll_into_view_if_needed()
    box = locator.bounding_box()
    assert box, 'dragged block must be visible'
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    assert 0 <= x <= page.viewport_size['width'] and 0 <= y <= page.viewport_size['height'], (x, y, box)
    if touch:
        page.evaluate('''() => {window.__touchLog=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend'])document.addEventListener(type,event=>window.__touchLog.push({type,target:event.target.dataset?.puzzleBlock??event.target.tagName,x:event.clientX,y:event.clientY}),{passive:true});}''')
        session = page.context.new_cdp_session(page)
        session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        for step in range(1, 7):
            session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + dx * step / 6, 'y': y + dy * step / 6}]})
        session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        session.detach()
        page.wait_for_timeout(250)
        events = page.evaluate('window.__touchLog')
        assert any(event['type'] == 'pointerup' for event in events), events
        assert not any(event['type'] == 'pointercancel' for event in events), events
    else:
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + dx, y + dy, steps=6)
        page.mouse.up()


def prove_rotate_then_drag(page, planet, actions, touch=False):
    rotation = next((i for i, action in enumerate(actions) if action.get('instrument') == 'rotate'), None)
    assert rotation is not None, 'fixture needs a real centre-pivot rotation'
    block = actions[rotation]['value'][0]
    play_actions(page, planet, actions[:rotation + 1])
    fixture = page.evaluate('''async ({planet,block})=>{
      const P=AetherPuzzles,saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1')),expedition=document.querySelector('#puzzle-level-name').textContent.includes('Grand Expedition');
      let def,actions;
      if(expedition){const data=saved.expeditions[planet];def=(await P.expedition(planet,data.seed)).stages[0];actions=data.drafts[0].actions;}
      else{const data=saved.masterwork[planet];def=await P.masterwork(planet,data.seed);actions=data.actions;}
      let board=P.initial(planet,def,6);for(const action of actions)board=P.transition(planet,def,board,action);
      for(const sign of [-1,1])if(P.transition(planet,def,board,{type:'block',value:[block,sign]}))return {sign,axis:P.blockAxis(def,board,block)};
      return null;
    }''', {'planet': planet, 'block': block})
    assert fixture is not None, 'rotated fixture needs at least one legal slide'
    locator = page.locator(f'[data-puzzle-block="{block}"]')
    arrow = locator.locator('small').inner_text()
    assert (fixture['axis'] == 'h') == (arrow == '↔'), (fixture, arrow)
    sign = fixture['sign']
    before = {'x': int(locator.get_attribute('data-x')), 'y': int(locator.get_attribute('data-y')), 'moves': int(page.locator('#puzzle-moves').inner_text())}
    board_box = page.locator('.ring-board').bounding_box()
    unit = board_box['width'] / 6
    dx, dy = (unit * sign, 0) if arrow == '↔' else (0, unit * sign)
    pointer_drag(page, locator, dx, dy, touch=touch)
    after = {'x': int(locator.get_attribute('data-x')), 'y': int(locator.get_attribute('data-y')), 'moves': int(page.locator('#puzzle-moves').inner_text())}
    if arrow == '↔':
        assert after['x'] == before['x'] + sign and after['y'] == before['y'], (before, after, arrow)
    else:
        assert after['y'] == before['y'] + sign and after['x'] == before['x'], (before, after, arrow)
    assert after['moves'] == before['moves'] + 1, (before, after)
    page.locator('[data-puzzle="undo"]').click()
    assert int(page.locator('#puzzle-moves').inner_text()) == before['moves']
    page.wait_for_timeout(450)  # respect the existing post-drag click debounce
    # Undo the probe, then finish the untouched verified plan.
    play_actions(page, planet, actions[rotation + 1:])


def finish_stage(page, planet, stage, plan):
    page.locator('#puzzle-result').wait_for(state='visible', timeout=15000)
    assert int(page.locator('#puzzle-moves').inner_text()) == plan['par'], (planet, stage)
    expected = plan['energy'] - sum(
        page.evaluate('''planet => JSON.parse(localStorage.getItem('aether-planet-replays-v1')).expeditions[planet].drafts.map(draft=>draft.result?.moves||0)''', planet)
    )
    assert f'Shared energy {expected} / {plan["energy"]}' in page.locator('#eclipse-reserve').inner_text()
    if stage < 3:
        assert f'Chamber {stage + 1} sealed.' in page.locator('#puzzle-result-title').inner_text()
    else:
        assert 'Grand Expedition sealed.' in page.locator('#puzzle-result-title').inner_text()


def solve_expedition(page, planet, first_plan=None, keyboard=False):
    total = 0
    for stage in range(4):
        plan = first_plan if stage == 0 and first_plan is not None else expedition_plan(page, planet, stage)
        play_actions(page, planet, plan['actions'], keyboard=keyboard)
        finish_stage(page, planet, stage, plan)
        total += plan['par']
        if stage < 3:
            page.locator('[data-puzzle="next-expedition"]').click()
            wait_for_title(page, f'Grand Expedition {stage + 2} / 4')
    saved = page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))')
    result = saved['expeditions'][planet]['result']
    assert result['moves'] == total == plan['parTotal'], (planet, result, total, plan['parTotal'])
    assert result['stars'] == 3, (planet, result)
    return saved


def other_saves(page, planet):
    return page.evaluate('''planet => {
      const replay=JSON.parse(localStorage.getItem('aether-planet-replays-v1'));
      return {crafted:localStorage.getItem('aether-planet-puzzles-v1'),daily:replay.daily,circuit:replay.circuits[planet],eclipse:replay.eclipse[planet],masterwork:replay.masterwork[planet]};
    }''', planet)


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright, tempfile.TemporaryDirectory() as screenshots:
            browser = playwright.chromium.launch(headless=True)
            engine = browser.new_page(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
            engine.on('pageerror', lambda error: errors.append(str(error)))
            engine.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            report = engine.evaluate(VERIFY_ENGINES)
            assert [entry['id'] for entry in report] == IDS
            print('PASS: 32 deterministic, seed-sensitive, initially unsolved expedition stages replay through actual transition/won rules')
            print('PASS: every genre proves wards, ordered mechanisms and its native topology/motion/coupling change; all 40 crafted boards and seeded replay stay unchanged')
            print('Generation report:', json.dumps(report))
            engine.close()

            # Begin with a legitimately unlocked Instruments board but no
            # Instruments win. Only its real UI solve may unlock the expedition.
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            page.on('pageerror', lambda error: errors.append(str(error)))
            install_save(page, replay_save('mercury', last='masterwork', mastered=False))
            page.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            wait_for_title(page, 'Masterwork instruments')
            assert page.locator('.expedition-tab').is_disabled()
            play_actions(page, 'mercury', masterwork_actions(page, 'mercury'))
            page.locator('#puzzle-result').wait_for(state='visible')
            assert page.locator('.expedition-tab').is_enabled()
            before = other_saves(page, 'mercury')
            page.locator('#puzzle-result [data-replay="expedition"]').click()
            wait_for_title(page, 'Grand Expedition 1 / 4')

            # Real keyboard mechanisms, undo/redo and a reload in chamber one.
            plan = expedition_plan(page, 'mercury', 0)
            play_actions(page, 'mercury', plan['actions'][:3], keyboard=True)
            assert int(page.locator('#puzzle-moves').inner_text()) == 3
            assert page.locator('.expedition-cycle').evaluate('element => document.activeElement === element')
            page.locator('[data-puzzle="undo"]').click()
            assert int(page.locator('#puzzle-moves').inner_text()) == 2
            page.locator('[data-puzzle="redo"]').click()
            assert int(page.locator('#puzzle-moves').inner_text()) == 3
            mechanism = page.locator('#expedition-mechanism').inner_text()
            page.reload(wait_until='networkidle')
            wait_for_title(page, 'Grand Expedition 1 / 4')
            assert int(page.locator('#puzzle-moves').inner_text()) == 3
            assert page.locator('#expedition-mechanism').inner_text() == mechanism
            play_actions(page, 'mercury', plan['actions'][3:])
            finish_stage(page, 'mercury', 0, plan)
            page.locator('[data-puzzle="next-expedition"]').click()
            wait_for_title(page, 'Grand Expedition 2 / 4')
            for stage in range(1, 4):
                stage_plan = expedition_plan(page, 'mercury', stage)
                play_actions(page, 'mercury', stage_plan['actions'])
                finish_stage(page, 'mercury', stage, stage_plan)
                if stage < 3:
                    page.locator('[data-puzzle="next-expedition"]').click()
                    wait_for_title(page, f'Grand Expedition {stage + 2} / 4')
            saved = page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))')
            assert saved['expeditions']['mercury']['result']['moves'] == plan['parTotal']
            assert saved['expeditions']['mercury']['result']['stars'] == 3
            completed_mercury_save = json.loads(json.dumps(saved))
            after = other_saves(page, 'mercury')
            assert after == before, 'expedition altered crafted, Daily, Circuit, Eclipse or Instruments saves'
            page.reload(wait_until='networkidle')
            wait_for_title(page, 'Grand Expedition 4 / 4')
            assert page.locator('#puzzle-result').is_visible()
            page.close()
            print('PASS: a real Instruments win unlocks the UI; keyboard mechanisms, undo/redo, mid-stage reload and all four Mercury chambers work')
            print('PASS: expedition drafts/records and shared energy are isolated byte-for-byte from every older puzzle save')

            # Spend eight extra mechanism turns in chamber one. Four turns are
            # the allowance; the other four must follow the run into its finale.
            energy_page = open_expedition(browser, base, 'mercury', errors=errors)
            first = expedition_plan(energy_page, 'mercury', 0)
            for _ in range(8):
                energy_page.locator('[data-puzzle-mechanism="cycle"]').click()
            play_actions(energy_page, 'mercury', first['actions'])
            energy_page.locator('#puzzle-result').wait_for(state='visible')
            assert int(energy_page.locator('#puzzle-moves').inner_text()) == first['par'] + 8
            energy_page.locator('[data-puzzle="next-expedition"]').click()
            wait_for_title(energy_page, 'Grand Expedition 2 / 4')
            for stage in (1, 2):
                plan = expedition_plan(energy_page, 'mercury', stage)
                play_actions(energy_page, 'mercury', plan['actions'])
                finish_stage(energy_page, 'mercury', stage, plan)
                energy_page.locator('[data-puzzle="next-expedition"]').click()
                wait_for_title(energy_page, f'Grand Expedition {stage + 2} / 4')
            finale = expedition_plan(energy_page, 'mercury', 3)
            available = finale['par'] - 4
            play_actions(energy_page, 'mercury', finale['actions'][:available])
            assert int(energy_page.locator('#puzzle-moves').inner_text()) == available
            assert energy_page.locator('#puzzle-result').is_hidden()
            play_action(energy_page, 'mercury', finale['actions'][available])
            assert int(energy_page.locator('#puzzle-moves').inner_text()) == available
            assert 'Shared expedition energy spent' in energy_page.locator('#puzzle-status').inner_text()
            energy_page.locator('[data-puzzle="undo"]').click()
            assert int(energy_page.locator('#puzzle-moves').inner_text()) == available - 1
            energy_page.locator('[data-puzzle="restart"]').click()
            assert int(energy_page.locator('#puzzle-moves').inner_text()) == 0
            energy_page.locator('[data-puzzle="replay-expedition"]').click()
            wait_for_title(energy_page, 'Grand Expedition 1 / 4')
            assert int(energy_page.locator('#puzzle-moves').inner_text()) == 0
            assert f'Shared energy {first["energy"]} / {first["energy"]}' in energy_page.locator('#eclipse-reserve').inner_text()
            energy_page.close()
            print('PASS: early overspending carries into the finale; exhaustion blocks input, undo works and Reset run provides fair recovery')

            # Saturn's formerly accepted eastern/home shortcut must remain
            # unfinished through real controls; the full route must then win.
            saturn = open_expedition(browser, base, 'saturn', errors=errors)
            opening = expedition_plan(saturn, 'saturn', 0)
            play_actions(saturn, 'saturn', opening['actions'])
            finish_stage(saturn, 'saturn', 0, opening)
            saturn.locator('[data-puzzle="next-expedition"]').click()
            wait_for_title(saturn, 'Grand Expedition 2 / 4')
            full = expedition_plan(saturn, 'saturn', 1)
            second_seal = next(i for i, action in enumerate(full['actions']) if action['type'] == 'mechanism' and action['value'] == 1)
            short = full['actions'][:second_seal + 1] + [{'type': 'mechanism', 'value': 'cycle'}]
            assert len(short) == 11 and len(full['actions']) == 19
            play_actions(saturn, 'saturn', short)
            assert saturn.locator('#puzzle-result').is_hidden()
            assert 'Exit route 1 / 3' in saturn.locator('#puzzle-instruction').inner_text()
            current = saturn.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).expeditions.saturn.drafts[1]')
            assert current['result'] is None
            saturn.locator('[data-puzzle="restart"]').click()
            play_actions(saturn, 'saturn', full['actions'])
            finish_stage(saturn, 'saturn', 1, full)
            saturn.close()
            print('PASS: real 11-action Saturn shortcut is rejected; the complete 19-action east-west-east route wins')

            # A valid queued burn survives a rejected warded addition, and only
            # that valid burn can subsequently launch. No preview exception is allowed.
            jupiter = open_expedition(browser, base, 'jupiter', errors=errors)
            fixture = jupiter.evaluate('''async()=>{
              const saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1')).expeditions.jupiter,def=(await AetherPuzzles.expedition('jupiter',saved.seed)).stages[0];
              const locked=def.expedition.seals[0].targets[0],valid=Array.from({length:def.count},(_,i)=>i).find(i=>!def.expedition.seals[0].targets.includes(i));
              return {locked,valid};
            }''')
            jupiter.locator('[data-puzzle-instrument="primary"]').click()
            jupiter.locator(f'[data-puzzle-moon="{fixture["valid"]}"]').click()
            assert jupiter.locator(f'[data-puzzle-moon="{fixture["valid"]}"] .burn-badge').inner_text() == '×1'
            jupiter.locator(f'[data-puzzle-moon="{fixture["locked"]}"]').click()
            assert 'blocked by a resonance ward' in jupiter.locator('#puzzle-status').inner_text()
            assert jupiter.locator(f'[data-puzzle-moon="{fixture["valid"]}"] .burn-badge').inner_text() == '×1'
            assert jupiter.locator(f'[data-puzzle-moon="{fixture["locked"]}"] .burn-badge').count() == 0
            assert int(jupiter.locator('#puzzle-moves').inner_text()) == 0
            jupiter.locator('[data-puzzle="launch"]').click()
            assert int(jupiter.locator('#puzzle-moves').inner_text()) == 1
            assert jupiter.locator('.burn-badge').count() == 0
            jupiter.close()
            print('PASS: warded Jupiter queue/preview rejection preserves valid plans and launches only valid burns')

            # Exercise transformed-axis dragging with a desktop pointer in
            # Instruments and real Chromium touch events in an Expedition.
            instruments = open_instruments(browser, base, 'saturn', errors=errors)
            prove_rotate_then_drag(instruments, 'saturn', masterwork_actions(instruments, 'saturn'))
            assert instruments.locator('#puzzle-result').is_visible()
            instruments.close()
            touch_saturn = open_expedition(browser, base, 'saturn', {'width': 390, 'height': 844}, errors, touch=True)
            touch_plan = expedition_plan(touch_saturn, 'saturn', 0)
            prove_rotate_then_drag(touch_saturn, 'saturn', touch_plan['actions'], touch=True)
            finish_stage(touch_saturn, 'saturn', 0, touch_plan)
            touch_saturn.close()
            print('PASS: rotate-then-drag follows transformed geometry via desktop pointer and real touch in Instruments and Expedition')

            # Every stored plan is driven through the real UI. No session state
            # is assigned and no UI solve calls transition directly.
            for planet in IDS[1:]:
                page = open_expedition(browser, base, planet, errors=errors)
                before = other_saves(page, planet)
                saved = solve_expedition(page, planet)
                assert saved['expeditions'][planet]['stage'] == 3
                assert len(saved['expeditions'][planet]['drafts']) == 4
                assert all(draft['result'] for draft in saved['expeditions'][planet]['drafts'])
                assert other_saves(page, planet) == before, planet
                page.close()
                print(f'PASS: {planet} completed all three chambers and its finale through real UI controls')

            mobile = open_expedition(browser, base, 'mercury', {'width': 390, 'height': 844}, errors, touch=True)
            assert mobile.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')
            mobile.locator('[data-puzzle="hint"]').click()
            assert 'Rotate zodiac next' in mobile.locator('#puzzle-status').inner_text()
            first = expedition_plan(mobile, 'mercury', 0)['actions'][0]
            assert first['type'] == 'mechanism' and first['value'] == 'cycle'
            play_action(mobile, 'mercury', first, touch=True)
            assert int(mobile.locator('#puzzle-moves').inner_text()) == 1
            assert 'position 2 / 4' in mobile.locator('#expedition-mechanism').inner_text()
            # Choose a legal variation only to test recovery guidance. The UI
            # itself performs the move and undo; no session state is assigned.
            variation = mobile.evaluate('''async()=>{
              const P=AetherPuzzles,saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1')).expeditions.mercury,def=(await P.expedition('mercury',saved.seed)).stages[0];
              let board=P.initial('mercury',def,6);for(const action of saved.drafts[0].actions)board=P.transition('mercury',def,board,action);
              for(let value=0;value<def.n**2;value++){const next=P.transition('mercury',def,board,{type:'cell',value});if(next&&!P.expeditionPath(def,next))return value;}
              return -1;
            }''')
            assert variation >= 0
            mobile.locator('[data-puzzle-instrument="primary"]').click()
            mobile.locator(f'[data-puzzle-cell="{variation}"]').click()
            mobile.locator('[data-puzzle="hint"]').click()
            assert 'Undo 1 move to rejoin it' in mobile.locator('#puzzle-status').inner_text()
            mobile.locator('[data-puzzle="undo"]').click()
            assert int(mobile.locator('#puzzle-moves').inner_text()) == 1
            assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            heights = mobile.locator('.expedition-controls .button').evaluate_all('elements => elements.map(element => element.getBoundingClientRect().height)')
            assert all(height >= 44 for height in heights)
            assert mobile.locator('.puzzle-celebration').count() == 0
            mobile.screenshot(path=str(Path(screenshots) / 'deep-expedition-mobile.png'), full_page=False, animations='disabled')
            for width, height in ((768, 1024), (1440, 900)):
                mobile.set_viewport_size({'width': width, 'height': height})
                assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), width
                assert mobile.locator('.expedition-controls').is_visible()
                assert mobile.locator('.expedition-stage-track').is_visible()
            mobile.set_viewport_size({'width': 390, 'height': 844})

            # A stale asynchronous deal must not replace the next planet.
            mobile.evaluate('''() => {
              const original=AetherPuzzles.expedition;
              window.expeditionSettled=false;
              AetherPuzzles.expedition=async(...args)=>{
                await new Promise(resolve=>setTimeout(resolve,150));
                const result=await original(...args);window.expeditionSettled=true;return result;
              };
            }''')
            mobile.locator('.expedition-tab').click()
            mobile.locator('.planet-trail a[href="#planet/venus"]').click()
            mobile.wait_for_function('window.expeditionSettled === true', timeout=30000)
            wait_for_title(mobile, 'Pressure test')
            assert not mobile.locator('#planet-game').evaluate('element => element.inert')
            mobile.close()
            print('PASS: 390px touch mechanisms, on-route hints plus exact off-route undo guidance, 44px targets, reduced motion, 768/1440 layouts and lifecycle cancellation')

            # Valid-looking expedition data without its Instruments prerequisite
            # must remain locked even if it claims a final stage and record.
            locked_save = replay_save('mercury', mastered=False)
            locked_save['expeditions'] = {'mercury': {
                'seed': SEED, 'stage': 3,
                'drafts': [{'actions': [], 'hints': 0, 'result': None} for _ in range(4)],
                'result': {'stars': 3, 'moves': 1, 'hints': 0},
            }}
            locked = browser.new_page(viewport={'width': 1000, 'height': 800}, reduced_motion='reduce')
            locked.on('pageerror', lambda error: errors.append(str(error)))
            install_save(locked, locked_save)
            locked.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            wait_for_title(locked, 'First shadows')
            assert locked.locator('.expedition-tab').is_disabled()
            assert locked.locator('#puzzle-result').is_hidden()
            locked.close()

            # The same shape with Instruments sealed must recover to chamber 1,
            # not open a full-energy finale or preserve its forged final record.
            forged_save = replay_save('mercury')
            forged_save['expeditions'] = locked_save['expeditions']
            forged = browser.new_page(viewport={'width': 1000, 'height': 800}, reduced_motion='reduce')
            forged.on('pageerror', lambda error: errors.append(str(error)))
            install_save(forged, forged_save)
            forged.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            wait_for_title(forged, 'Grand Expedition 1 / 4')
            recovered = forged.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).expeditions.mercury')
            assert recovered['stage'] == 0 and recovered['result'] is None
            assert all(draft['result'] is None for draft in recovered['drafts'])
            opening = expedition_plan(forged, 'mercury', 0)
            assert f'Shared energy {opening["energy"]} / {opening["energy"]}' in forged.locator('#eclipse-reserve').inner_text()
            assert forged.locator('#puzzle-result').is_hidden()
            forged.close()

            # Build the reviewer's exact 65-move genuine record through real UI.
            record65_save = replay_save('mercury')
            record65_save['expeditions'] = {'mercury': {
                'seed': SEED, 'stage': 0,
                'drafts': [{'actions': [], 'hints': 0, 'result': None} for _ in range(4)],
                'result': None,
            }}
            record65 = browser.new_page(viewport={'width': 1100, 'height': 850}, reduced_motion='reduce')
            record65.on('pageerror', lambda error: errors.append(str(error)))
            install_save(record65, record65_save)
            record65.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            wait_for_title(record65, 'Grand Expedition 1 / 4')
            completed_mercury_save = solve_expedition(record65, 'mercury')
            assert completed_mercury_save['expeditions']['mercury']['result']['moves'] == 65
            record65.close()

            # Even four valid chamber replays must not legitimise the exact
            # forged 16-move overall record. It is rebuilt from the verified 65.
            best_save = json.loads(json.dumps(completed_mercury_save))
            best_save['expeditions']['mercury']['result']['moves'] = 16
            best = browser.new_page(viewport={'width': 1000, 'height': 800}, reduced_motion='reduce')
            best.on('pageerror', lambda error: errors.append(str(error)))
            install_save(best, best_save)
            best.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            wait_for_title(best, 'Grand Expedition 4 / 4')
            assert best.locator('#puzzle-result').is_visible()
            actual_best = best.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).expeditions.mercury')
            assert actual_best['result']['moves'] == 65, actual_best
            assert actual_best['unverifiedResult']['moves'] == 16, actual_best
            assert 'All four chambers and the finale are sealed' in best.locator('#puzzle-result').inner_text()
            assert 'best 65 energy' in best.locator('#puzzle-best').inner_text()
            assert '16 energy' not in best.locator('#puzzle-best').inner_text()
            best.close()

            # A genuine overall record matching its four chamber replays migrates
            # unchanged and remains stable through a second validation/reload.
            genuine = browser.new_page(viewport={'width': 1000, 'height': 800}, reduced_motion='reduce')
            genuine.on('pageerror', lambda error: errors.append(str(error)))
            install_save(genuine, completed_mercury_save)
            genuine.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            wait_for_title(genuine, 'Grand Expedition 4 / 4')
            assert genuine.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).expeditions.mercury.result') == {'stars': 3, 'moves': 65, 'hints': 0}
            assert genuine.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).expeditions.mercury.unverifiedResult') is None
            genuine.reload(wait_until='networkidle')
            wait_for_title(genuine, 'Grand Expedition 4 / 4')
            assert genuine.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).expeditions.mercury.result') == {'stars': 3, 'moves': 65, 'hints': 0}
            assert genuine.locator('#puzzle-result').is_visible()
            genuine.close()

            # Build two genuine chamber records, then corrupt only the stage to
            # 3. Recovery must preserve that valid prefix and its exact energy
            # cost while rejecting the non-contiguous finale and overall record.
            prefix_page = open_expedition(browser, base, 'mercury', errors=errors)
            spent = 0
            for stage in (0, 1):
                plan = expedition_plan(prefix_page, 'mercury', stage)
                play_actions(prefix_page, 'mercury', plan['actions'])
                finish_stage(prefix_page, 'mercury', stage, plan)
                spent += plan['par']
                prefix_page.locator('[data-puzzle="next-expedition"]').click()
                wait_for_title(prefix_page, f'Grand Expedition {stage + 2} / 4')
            valid_prefix = prefix_page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))')
            total_energy = expedition_plan(prefix_page, 'mercury', 2)['energy']
            prefix_page.close()
            valid_prefix['expeditions']['mercury']['stage'] = 3
            valid_prefix['expeditions']['mercury']['result'] = {'stars': 3, 'moves': 1, 'hints': 0}
            resumed = browser.new_page(viewport={'width': 1000, 'height': 800}, reduced_motion='reduce')
            resumed.on('pageerror', lambda error: errors.append(str(error)))
            install_save(resumed, valid_prefix)
            resumed.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            wait_for_title(resumed, 'Grand Expedition 3 / 4')
            corrected = resumed.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).expeditions.mercury')
            assert corrected['stage'] == 2 and corrected['result'] is None
            assert corrected['drafts'][0]['result'] and corrected['drafts'][1]['result']
            assert corrected['drafts'][2]['result'] is None and corrected['drafts'][3]['result'] is None
            assert f'Shared energy {total_energy - spent} / {total_energy}' in resumed.locator('#eclipse-reserve').inner_text()
            assert resumed.locator('#puzzle-result').is_hidden()
            resumed.close()
            print('PASS: Instruments-less and non-contiguous saves cannot unlock finales/records; valid prefixes recover with exact prior energy')

            malformed = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            malformed.on('pageerror', lambda error: errors.append(str(error)))
            damaged = replay_save('mercury')
            damaged['expeditions'] = {'mercury': {'seed': 'bad', 'stage': 99, 'drafts': 'bad', 'result': {'stars': 99}}}
            install_save(malformed, damaged)
            malformed.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            wait_for_title(malformed, 'Grand Expedition 1 / 4')
            recovered = malformed.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))')
            assert isinstance(recovered['expeditions']['mercury']['seed'], int)
            assert recovered['expeditions']['mercury']['stage'] == 0
            assert recovered['circuits']['mercury'] == completed_circuit()
            assert malformed.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            malformed.close()
            print('PASS: malformed additive expedition data recovers without damaging existing records')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Deep puzzle expedition regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
