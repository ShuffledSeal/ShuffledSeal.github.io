"""New-rules Masterwork instruments across all eight planetary puzzle engines.

Run from the repository root with: python3 tests/puzzle-mechanics.py
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


VERIFY_ENGINES = '''async () => {
  const P=AetherPuzzles,ids=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
  const crafted=()=>ids.map(id=>Array.from({length:5},(_,index)=>{
    const def=P.definition(id,index);return {def,board:P.initial(id,def,index)};
  }));
  const craftedBefore=crafted();
  const eclipseBefore=await P.eclipse('mercury',1357911);
  const replayBefore=await P.replay('mercury',123456,2);
  const report=[];
  for(const id of ids){
    const started=performance.now();
    const def=await P.masterwork(id,24681357),same=await P.masterwork(id,24681357),other=await P.masterwork(id,97531864);
    if(!def||!same||!other)throw Error(id+' Masterwork generation failed');
    if(JSON.stringify(def)!==JSON.stringify(same))throw Error(id+' was not deterministic');
    if(JSON.stringify(def)===JSON.stringify(other))throw Error(id+' ignored its seed');
    const initial=P.initial(id,def,6),otherInitial=P.initial(id,other,6);
    const deal=id==='earth'?{paths:def.paths,gates:def.gates}:initial;
    const otherDeal=id==='earth'?{paths:other.paths,gates:other.gates}:otherInitial;
    if(JSON.stringify(deal)===JSON.stringify(otherDeal))throw Error(id+' dealt the same puzzle for different seeds');
    if(P.won(id,def,initial))throw Error(id+' started solved');
    if(!def.masterwork.rule||!def.masterwork.instruction||def.masterwork.tips.length<2)throw Error(id+' lacks readable rules and hints');
    let board=initial,moves=0,used=false,ordinary=false;
    for(const action of def.masterwork.solution){
      used ||= Boolean(action.instrument)||Number.isInteger(action.anchor);
      ordinary ||= id==='uranus'?!Number.isInteger(action.anchor):!action.instrument;
      const next=P.transition(id,def,board,action);
      if(!next)throw Error(id+' stored solution contained an invalid action under its actual rules');
      moves+=P.actionCost(id,board,next);board=next;
    }
    if(!P.won(id,def,board))throw Error(id+' stored solution did not solve the board');
    if(moves!==P.par(id,def,initial))throw Error(id+' par does not match its verified action plan');
    if(id==='earth'){
      if(def.gates.length!==2)throw Error('Earth lacks its paired gates');
      let gateSeen=false;board=P.initial(id,def,6);
      for(const action of def.masterwork.solution){
        const before=board,path=before.paths[before.active],from=path?.at(-1);
        if(P.gateLink(def,from,action.value))gateSeen=true;
        board=P.transition(id,def,board,action);
      }
      if(!gateSeen)throw Error('Earth verified route never uses its new topology');
    } else if(!used)throw Error(id+' verified solution never uses its new instrument');
    if(id!=='earth'&&!ordinary)throw Error(id+' does not offer a meaningful choice between new and ordinary instruments');
    report.push({id,par:moves,actions:def.masterwork.solution.length,ms:Math.round(performance.now()-started)});
  }
  if(JSON.stringify(craftedBefore)!==JSON.stringify(crafted()))throw Error('Masterwork mutated a crafted definition or initial board');
  if(JSON.stringify(eclipseBefore)!==JSON.stringify(await P.eclipse('mercury',1357911)))throw Error('Masterwork mutated an existing Eclipse board');
  if(JSON.stringify(replayBefore)!==JSON.stringify(await P.replay('mercury',123456,2)))throw Error('Masterwork mutated seeded replay generation');
  for(const id of ids)for(let index=0;index<5;index++){
    const def=P.definition(id,index);let board=P.initial(id,def,index),actions;
    if(id==='mercury')actions=await P.solve(id,def,board);
    else if(id==='venus'){
      actions=[];for(let p=0;p<board.pipes.length;p++){let mask=board.pipes[p],turns=0;while(mask!==def.target[p]&&turns<4){mask=P.rotate(mask);turns++;}for(let n=0;n<turns;n++)actions.push({type:'cell',value:p});}
    } else if(id==='earth')actions=def.paths.flatMap(path=>path.map((value,i)=>({type:'cell',value,continuation:i>0})));
    else actions=def.solution.map(value=>({type:id==='jupiter'?'moon':id==='saturn'?'block':'move',value}));
    for(const action of actions){const next=P.transition(id,def,board,action);if(!next)throw Error(id+' crafted level '+index+' rejected its original solution');board=next;}
    if(!P.won(id,def,board))throw Error(id+' crafted level '+index+' no longer solves');
  }
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


def install_save(page, replay, crafted=None):
    page.add_init_script(
        'if(!localStorage.getItem("aether-planet-replays-v1"))localStorage.setItem("aether-planet-replays-v1",' + json.dumps(json.dumps(replay)) + ');'
        'if(!localStorage.getItem("aether-planet-puzzles-v1"))localStorage.setItem("aether-planet-puzzles-v1",' + json.dumps(json.dumps(crafted or crafted_save())) + ');'
    )


def unlocked_save(planet, seed=SEED, last='masterwork'):
    return {
        'version': 1,
        'daily': {},
        'circuits': {planet: completed_circuit()},
        'eclipse': {planet: {'seed': seed, 'actions': [], 'hints': 0, 'result': {'stars': 3, 'moves': 5, 'hints': 0}}},
        'masterwork': {planet: {'seed': seed, 'actions': [], 'hints': 0, 'result': None}},
        'last': {planet: last},
    }


def wait_for_mode(page, title):
    page.wait_for_function(
        f'document.querySelector("#puzzle-level-name")?.textContent.includes({json.dumps(title)})',
        timeout=30000,
    )
    assert page.locator('.puzzle-grid, .orbital-dials').count() == 1
    assert page.locator('.puzzle-generation-error').count() == 0


def masterwork_actions(page, planet):
    return page.evaluate('''async ({planet}) => {
      const saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1')).masterwork[planet];
      const def=await AetherPuzzles.masterwork(planet,saved.seed);
      return def.masterwork.solution;
    }''', {'planet': planet})


def play_action(page, planet, action):
    instrument = action.get('instrument')
    if instrument in ('diagonal', 'mirror', 'winch', 'swap', 'pulse'):
        page.locator(f'[data-puzzle-instrument="{instrument}"]').click()
    elif planet in ('mercury', 'venus', 'jupiter', 'mars', 'neptune'):
        page.locator('[data-puzzle-instrument="primary"]').click()

    kind, value = action['type'], action['value']
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


def play_actions(page, planet, actions):
    for action in actions:
        play_action(page, planet, action)


def open_unlocked(browser, base, planet, viewport, errors):
    page = browser.new_page(viewport=viewport, reduced_motion='reduce')
    page.on('pageerror', lambda error: errors.append(str(error)))
    install_save(page, unlocked_save(planet))
    page.goto(f'{base}/index.html#planet/{planet}', wait_until='networkidle')
    wait_for_mode(page, 'Masterwork instruments')
    return page


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
            print('PASS: eight new-rules engines are deterministic, seed-sensitive, initially unsolved and verified under their actual transitions')
            print('Generation report:', json.dumps(report))
            print('PASS: all 40 crafted solutions, Daily/Circuit generation and the original Eclipse deal remain unchanged')
            engine.close()

            # Start with a legitimately completed circuit but no Eclipse win. The
            # second layer must remain locked until the existing board is sealed.
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            page.on('pageerror', lambda error: errors.append(str(error)))
            replay = unlocked_save('mercury', last='crafted')
            replay['eclipse']['mercury']['result'] = None
            replay['masterwork'] = {}
            install_save(page, replay)
            page.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            crafted_before = page.evaluate('localStorage.getItem("aether-planet-puzzles-v1")')
            assert page.locator('.masterwork-tab').is_disabled()
            page.locator('[data-replay="eclipse"]').click()
            wait_for_mode(page, 'Eclipse masterwork')
            eclipse_cells = page.evaluate('''async () => {
              const saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1')).eclipse.mercury;
              const P=AetherPuzzles,def=await P.eclipse('mercury',saved.seed);
              return (await P.solve('mercury',def,P.initial('mercury',def,6))).map(action=>action.value);
            }''')
            for cell in eclipse_cells:
                page.locator(f'[data-puzzle-cell="{cell}"]').click()
            page.locator('#puzzle-result').wait_for(state='visible')
            assert page.locator('.masterwork-tab').is_enabled()
            eclipse_before = page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).eclipse.mercury')
            circuit_before = page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).circuits.mercury')
            page.locator('#puzzle-result [data-replay="masterwork"]').click()
            wait_for_mode(page, 'Masterwork instruments')
            actions = masterwork_actions(page, 'mercury')
            assert len(actions) >= 3
            play_action(page, 'mercury', actions[0])
            assert int(page.locator('#puzzle-moves').inner_text()) == 1
            page.locator('[data-puzzle="undo"]').click()
            assert int(page.locator('#puzzle-moves').inner_text()) == 0
            page.locator('[data-puzzle="redo"]').click()
            assert int(page.locator('#puzzle-moves').inner_text()) == 1
            play_action(page, 'mercury', actions[1])
            assert int(page.locator('#puzzle-moves').inner_text()) == 2
            page.reload(wait_until='networkidle')
            wait_for_mode(page, 'Masterwork instruments')
            assert int(page.locator('#puzzle-moves').inner_text()) == 2
            play_actions(page, 'mercury', actions[2:])
            page.locator('#puzzle-result').wait_for(state='visible')
            assert 'Masterwork sealed' in page.locator('#puzzle-result').inner_text()
            assert page.locator('.puzzle-celebration').evaluate('element => getComputedStyle(element).display') == 'none'
            page.screenshot(path=str(Path(screenshots) / 'mercury-masterwork.png'), animations='disabled')
            saved = page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))')
            assert saved['masterwork']['mercury']['result']['stars'] == 3
            assert saved['masterwork']['mercury']['result']['moves'] == len(actions)
            assert saved['eclipse']['mercury'] == eclipse_before
            assert saved['circuits']['mercury'] == circuit_before
            assert page.evaluate('localStorage.getItem("aether-planet-puzzles-v1")') == crafted_before
            page.close()
            print('PASS: real Eclipse win unlocks the real UI entry; Prism input, undo/redo and reload resume a separate complete three-star solve')
            print('PASS: crafted, circuit and Eclipse saves are isolated from Masterwork drafts and records; reduced motion hides celebration motion')

            # Drive every other stored plan through pointer/keyboard-accessible DOM
            # controls, not by assigning session state or calling transition in UI.
            for planet in IDS[1:]:
                page = open_unlocked(browser, base, planet, {'width': 1280, 'height': 900}, errors)
                actions = masterwork_actions(page, planet)
                guide = page.locator('.puzzle-guide').inner_text().lower()
                if planet == 'mars':
                    assert 'cannot pull it' not in guide
                if planet == 'saturn':
                    assert 'cannot overlap or turn' not in guide
                play_actions(page, planet, actions)
                page.locator('#puzzle-result').wait_for(state='visible', timeout=10000)
                result = page.evaluate(f'JSON.parse(localStorage.getItem("aether-planet-replays-v1")).masterwork.{planet}.result')
                assert result['stars'] == 3, planet
                assert result['moves'] == report[IDS.index(planet)]['par'], planet
                assert page.locator('.eclipse-charter').count() == 1
                page.close()
            print('PASS: Mirror, gates, winch, exchange, rotation, anchor and dual-sail plans all solve through real UI controls')

            mobile = open_unlocked(browser, base, 'mercury', {'width': 390, 'height': 844}, errors)
            assert mobile.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')
            mobile.locator('[data-puzzle="hint"]').click()
            assert 'Prism' in mobile.locator('#puzzle-status').inner_text()
            play_action(mobile, 'mercury', masterwork_actions(mobile, 'mercury')[0])
            assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            mobile.screenshot(path=str(Path(screenshots) / 'masterwork-mobile.png'), full_page=False, animations='disabled')
            mobile.evaluate('''() => {
              const original=AetherPuzzles.masterwork;
              window.masterworkSettled=false;
              AetherPuzzles.masterwork=async(...args)=>{
                await new Promise(resolve=>setTimeout(resolve,150));
                const result=await original(...args);window.masterworkSettled=true;return result;
              };
            }''')
            mobile.locator('.masterwork-tab').click()
            mobile.locator('.planet-trail a[href="#planet/venus"]').click()
            mobile.wait_for_function('window.masterworkSettled === true', timeout=30000)
            wait_for_mode(mobile, 'Pressure test')
            assert not mobile.locator('#planet-game').evaluate('element => element.inert')
            mobile.close()
            print('PASS: mobile rules/hints have no overflow; reduced motion is active; navigation aborts stale instrument deals')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Puzzle mechanics regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
