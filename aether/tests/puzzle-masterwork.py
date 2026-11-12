"""Unlockable Eclipse masterworks across all eight deterministic puzzle engines.

Run from the repository root with: python3 tests/puzzle-masterwork.py
Requires the developer-only Python Playwright package and Chromium.
"""
import http.server
import json
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
CIRCUIT_SEED = 123456


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


VERIFY_ECLIPSES = '''async () => {
  const P=AetherPuzzles,ids=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
  const normalMercury=await P.replay('mercury',123456,5);
  const normalJupiter=await P.replay('jupiter',123456,5);
  const report=[];
  for(const id of ids){
    const started=performance.now();
    const def=await P.eclipse(id,24681357),same=await P.eclipse(id,24681357),other=await P.eclipse(id,97531864);
    if(!def||!same||!other)throw Error(id+' Eclipse generation failed');
    if(JSON.stringify(def)!==JSON.stringify(same))throw Error(id+' Eclipse was not deterministic');
    if(JSON.stringify(def)===JSON.stringify(other))throw Error(id+' Eclipse ignored its seed');
    if(!def.eclipse||!Number.isInteger(def.eclipse.budget)||!def.eclipse.rule||!def.eclipse.unit)throw Error(id+' lacks a readable modifier');
    if(!Array.isArray(def.eclipse.solution)||!def.eclipse.solution.length)throw Error(id+' lacks a stored solution');
    let board=P.initial(id,def,6);
    if(P.won(id,def,board))throw Error(id+' Eclipse started solved');
    const reference=P.par(id,def,board);
    if(def.eclipse.budget!==reference+def.eclipse.allowance)throw Error(id+' reserve is not tied to verified par');
    let moves=0;
    for(const action of def.eclipse.solution){
      const next=P.transition(id,def,board,action);
      if(!next)throw Error(id+' stored solution contained an invalid action');
      moves+=P.actionCost(id,board,next);board=next;
      if(moves>def.eclipse.budget)throw Error(id+' solution exhausted its own reserve');
    }
    if(!P.won(id,def,board))throw Error(id+' stored solution did not solve the board');
    if(id==='jupiter'){
      if(!def.retrograde||!def.double)throw Error('Jupiter did not use reversed three-moon coupling');
      let orbital=P.initial(id,def,6);const before=orbital.phases.slice();
      orbital=P.transition(id,def,orbital,{type:'moon',value:0});
      const expected=before.map((phase,i)=>i===0?1:i===3?2:i===1?1:0);
      for(let i=0;i<4;i++)if(orbital.phases[i]!==(before[i]+expected[i])%def.divisions)throw Error('Jupiter coupling did not reverse');
    }
    report.push({id,par:reference,budget:def.eclipse.budget,solutionMoves:moves,ms:Math.round(performance.now()-started)});
  }
  if(JSON.stringify(normalMercury)!==JSON.stringify(await P.replay('mercury',123456,5)))throw Error('Eclipse mutated normal Mercury replay generation');
  if(JSON.stringify(normalJupiter)!==JSON.stringify(await P.replay('jupiter',123456,5)))throw Error('Eclipse mutated normal Jupiter replay generation');
  return report;
}'''


def mercury_circuit_actions(page, difficulty):
    return page.evaluate('''async ({seed,difficulty}) => {
      const P=AetherPuzzles,def=await P.replay('mercury',seed,difficulty);
      let board=P.initial('mercury',def,difficulty);
      const saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1'))?.circuits?.mercury;
      for(const action of saved?.actions||[])board=P.transition('mercury',def,board,action)||board;
      return (await P.solve('mercury',def,board)).map(action=>action.value);
    }''', {'seed': CIRCUIT_SEED, 'difficulty': difficulty})


def click_cells(page, cells):
    for cell in cells:
        page.locator(f'[data-puzzle-cell="{cell}"]').click()


def solve_mercury_circuit(page, difficulty):
    click_cells(page, mercury_circuit_actions(page, difficulty))
    page.locator('#puzzle-result').wait_for(state='visible')


def mercury_eclipse_solution(page):
    return page.evaluate('''async () => {
      const P=AetherPuzzles,saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1')).eclipse.mercury;
      const def=await P.eclipse('mercury',saved.seed);
      let board=P.initial('mercury',def,6);
      for(const action of saved.actions||[])board=P.transition('mercury',def,board,action)||board;
      return {
        actions:(await P.solve('mercury',def,board)).map(action=>action.value),
        budget:def.eclipse.budget,
        par:P.par('mercury',def,P.initial('mercury',def,6)),
      };
    }''')


def wait_for_eclipse(page):
    page.wait_for_function(
        'document.querySelector("#puzzle-level-name")?.textContent.includes("Eclipse masterwork")',
        timeout=120000,
    )
    assert page.locator('.puzzle-grid').count() == 1
    assert page.locator('.eclipse-charter').count() == 1
    assert page.locator('.puzzle-generation-error').count() == 0


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')

            report = page.evaluate(VERIFY_ECLIPSES)
            assert [entry['id'] for entry in report] == IDS
            assert all(entry['solutionMoves'] <= entry['budget'] for entry in report)
            print('PASS: all eight Eclipse boards are deterministic, seed-sensitive and solution-backed within par-based reserves')
            print('Generation report:', json.dumps(report))

            legacy_before = page.evaluate('localStorage.getItem("aether-planet-puzzles-v1")')
            locked = page.locator('.eclipse-tab')
            assert locked.is_disabled()
            assert 'locked' in locked.get_attribute('aria-label')
            assert '0 / 3' in locked.inner_text()

            page.locator('[data-replay="circuit"]').click()
            page.wait_for_selector('#replay-seed', timeout=30000)
            page.locator('#replay-seed').fill(str(CIRCUIT_SEED))
            page.locator('[data-replay-action="apply-seed"]').click()
            page.wait_for_selector('#replay-seed', timeout=30000)
            solve_mercury_circuit(page, 1)
            assert page.locator('.eclipse-tab').is_disabled()
            assert '1 / 3' in page.locator('.eclipse-tab').inner_text()

            page.locator('[data-puzzle="next-replay"]').click()
            page.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Circuit 2 / 3")', timeout=30000)
            solve_mercury_circuit(page, 3)
            assert page.locator('.eclipse-tab').is_disabled()

            page.locator('[data-puzzle="next-replay"]').click()
            page.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Circuit 3 / 3")', timeout=30000)
            solve_mercury_circuit(page, 5)
            assert page.locator('.eclipse-tab').is_enabled()
            assert 'Circuit sealed' in page.locator('#puzzle-result').inner_text()
            assert 'Eclipse masterwork unlocked' in page.locator('#puzzle-result').inner_text()
            unlocked = page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))')
            assert len(unlocked['circuits']['mercury']['boards']) == 3
            assert unlocked['eclipse']['mercury']['result'] is None
            assert unlocked['eclipse']['mercury']['seed'] >= 0
            print('PASS: only a real three-board circuit win unlocks the optional fourth Eclipse board')

            page.locator('#puzzle-result [data-replay="eclipse"]').click()
            wait_for_eclipse(page)
            assert 'verified solution' in page.locator('.puzzle-lesson').inner_text().lower()
            assert 'finite switch reserve' in page.locator('.eclipse-charter').inner_text()
            solution = mercury_eclipse_solution(page)
            assert len(solution['actions']) >= 2
            click_cells(page, solution['actions'][:2])
            assert int(page.locator('#puzzle-moves').inner_text()) == 2
            page.reload(wait_until='networkidle')
            wait_for_eclipse(page)
            assert int(page.locator('#puzzle-moves').inner_text()) == 2

            remaining = mercury_eclipse_solution(page)
            click_cells(page, remaining['actions'])
            page.locator('#puzzle-result').wait_for(state='visible')
            assert 'Eclipse sealed' in page.locator('#puzzle-result').inner_text()
            assert 'separately from the circuit' in page.locator('#puzzle-result').inner_text()
            sealed = page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))')
            assert sealed['eclipse']['mercury']['result']['moves'] == solution['par']
            assert sealed['eclipse']['mercury']['result']['stars'] == 3
            assert len(sealed['circuits']['mercury']['boards']) == 3
            assert sealed['circuits']['mercury']['seed'] == CIRCUIT_SEED
            print('PASS: real UI clicks solve Eclipse after a reload; its three-star record stays separate from the circuit')

            # Waste two moves at a time by toggling the same cross back and forth.
            page.locator('[data-puzzle="replay"]').click()
            budget = remaining['budget']
            while int(page.locator('#puzzle-moves').inner_text()) < budget:
                page.locator('[data-puzzle-cell="0"]').click()
                if int(page.locator('#puzzle-moves').inner_text()) < budget:
                    page.locator('[data-puzzle-cell="0"]').click()
            assert page.locator('#puzzle-result').is_hidden()
            page.locator('[data-puzzle-cell="1"]').click()
            assert int(page.locator('#puzzle-moves').inner_text()) == budget
            assert 'reserve spent' in page.locator('#puzzle-status').inner_text().lower()
            page.locator('[data-puzzle="undo"]').click()
            assert int(page.locator('#puzzle-moves').inner_text()) == budget - 1
            assert f'reserve 1 / {budget}' in page.locator('#eclipse-reserve').inner_text().lower()
            page.locator('[data-puzzle="restart"]').click()
            assert int(page.locator('#puzzle-moves').inner_text()) == 0
            assert f'reserve {budget} / {budget}' in page.locator('#eclipse-reserve').inner_text().lower()
            assert page.evaluate('localStorage.getItem("aether-planet-puzzles-v1")') == legacy_before
            print('PASS: reserve exhaustion blocks extra moves; undo/restart restore it; crafted/endless saves remain byte-identical')

            # A version-one save predating Eclipse derives the unlock from its
            # already-completed circuit without resetting any existing record.
            legacy = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            legacy.on('pageerror', lambda error: errors.append(str(error)))
            circuit = {
                'seed': CIRCUIT_SEED,
                'stage': 2,
                'boards': [
                    {'stars': 3, 'moves': 4, 'hints': 0},
                    {'stars': 2, 'moves': 8, 'hints': 0},
                    {'stars': 1, 'moves': 12, 'hints': 1},
                ],
                'actions': [],
                'hints': 0,
                'result': {'stars': 1, 'moves': 12, 'hints': 1},
            }
            crafted = {
                'records': {'mercury:0': {'stars': 2, 'moves': 9}},
                'drafts': {},
                'levels': {'mercury': 0},
                'endless': {'mercury': {'best': 4}},
            }
            replay_save = {'version': 1, 'daily': {}, 'circuits': {'mercury': circuit}, 'last': {'mercury': 'circuit'}}
            legacy.add_init_script(
                'const replay=' + json.dumps(replay_save) + ';'
                'localStorage.setItem("aether-planet-replays-v1",JSON.stringify(replay));'
                'localStorage.setItem("aether-planet-puzzles-v1",' + json.dumps(json.dumps(crafted)) + ');'
            )
            legacy.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            legacy.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Circuit 3 / 3")', timeout=30000)
            assert legacy.locator('.eclipse-tab').is_enabled()
            legacy.locator('.eclipse-tab').click()
            wait_for_eclipse(legacy)
            migrated = legacy.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))')
            assert migrated['version'] == 1 and migrated['eclipse']['mercury']['seed'] >= 0
            assert len(migrated['circuits']['mercury']['boards']) == 3
            assert json.loads(legacy.evaluate('localStorage.getItem("aether-planet-puzzles-v1")')) == crafted
            assert legacy.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            legacy.close()
            print('PASS: legacy completed circuits unlock Eclipse additively; mobile rules and controls have no horizontal overflow')

            lifecycle = browser.new_page(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
            lifecycle.on('pageerror', lambda error: errors.append(str(error)))
            lifecycle.add_init_script(
                'localStorage.setItem("aether-planet-replays-v1",' + json.dumps(json.dumps(replay_save)) + ')'
            )
            lifecycle.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            lifecycle.wait_for_selector('.eclipse-tab:not([disabled])')
            lifecycle.evaluate('''() => {
              const original=AetherPuzzles.eclipse;
              window.eclipseSettled=false;
              AetherPuzzles.eclipse=async(...args)=>{
                await new Promise(resolve=>setTimeout(resolve,150));
                const result=await original(...args);window.eclipseSettled=true;return result;
              };
            }''')
            lifecycle.locator('.eclipse-tab').click()
            lifecycle.locator('.planet-trail a[href="#planet/venus"]').click()
            lifecycle.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Pressure test")', timeout=30000)
            lifecycle.wait_for_function('window.eclipseSettled === true', timeout=30000)
            assert 'Eclipse' not in lifecycle.locator('#puzzle-level-name').inner_text()
            assert lifecycle.locator('.puzzle-grid').count() == 1
            assert not lifecycle.locator('#planet-game').evaluate('element => element.inert')
            lifecycle.close()
            print('PASS: navigating away aborts an in-flight Eclipse deal without stale boards or inert controls')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Puzzle masterwork regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
