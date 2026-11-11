"""Seeded Daily Charts and three-board circuits across all eight puzzle engines."""
import http.server
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


SOLVE_ALL = '''async () => {
  const P=AetherPuzzles,ids=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'],out=[];
  for(const id of ids){
    const def=await P.replay(id,123456,2),same=await P.replay(id,123456,2),other=await P.replay(id,987651,2);
    if(!def||!same||!other)throw Error(id+' generation failed');
    if(JSON.stringify(def)!==JSON.stringify(same))throw Error(id+' was not deterministic');
    if(JSON.stringify(def)===JSON.stringify(other))throw Error(id+' ignored its seed');
    let board=P.initial(id,def,2);
    if(P.won(id,def,board))throw Error(id+' started solved');
    if(id==='mercury'){
      const path=await P.solve(id,def,board);for(const action of path)board=P.transition(id,def,board,action);
    } else if(id==='venus'){
      for(let i=0;i<board.pipes.length;i++)for(let n=0;n<4&&board.pipes[i]!==def.target[i];n++)board=P.transition(id,def,board,{type:'cell',value:i});
    } else if(id==='earth'){
      for(const path of def.paths){board=P.transition(id,def,board,{type:'cell',value:path[0]});for(const p of path.slice(1))board=P.transition(id,def,board,{type:'cell',value:p,continuation:true});}
    } else for(const value of def.solution){const type=id==='jupiter'?'moon':id==='saturn'?'block':'move';board=P.transition(id,def,board,{type,value});}
    if(!P.won(id,def,board))throw Error(id+' constructive solution failed');
    out.push(id);
  }
  return out;
}'''


def solve_mercury(page, seed, difficulty):
    actions = page.evaluate('''async ({seed,difficulty}) => {
      const P=AetherPuzzles,def=await P.replay('mercury',seed,difficulty);
      let board=P.initial('mercury',def,difficulty);
      const saved=JSON.parse(localStorage.getItem('aether-planet-replays-v1'))?.circuits?.mercury;
      for(const action of saved?.actions||[])board=P.transition('mercury',def,board,action)||board;
      return (await P.solve('mercury',def,board)).map(action=>action.value);
    }''', {'seed': seed, 'difficulty': difficulty})
    for cell in actions:
        page.locator(f'[data-puzzle-cell="{cell}"]').click()
    page.locator('#puzzle-result').wait_for(state='visible')


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            assert page.evaluate(SOLVE_ALL) == IDS
            print('PASS: all eight replay generators are deterministic, seed-sensitive, initially unsolved and solution-backed')

            for planet in IDS:
                page.goto(f'{base}/index.html#planet/{planet}', wait_until='networkidle')
                page.locator('[data-replay="daily"]').click()
                page.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Daily chart")', timeout=30000)
                assert page.locator('.puzzle-grid, .orbital-dials').count() == 1, planet
                assert page.locator('.puzzle-generation-error').count() == 0, planet
                assert 'utc date' in page.locator('.puzzle-lesson').inner_text().lower()
            print('PASS: all eight Daily Charts mount through the real replay UI')
            legacy_before = page.evaluate('localStorage.getItem("aether-planet-puzzles-v1")')

            page.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            page.locator('[data-replay="circuit"]').click()
            page.wait_for_selector('#replay-seed', timeout=30000)
            page.locator('#replay-seed').fill('123456')
            page.locator('[data-replay-action="apply-seed"]').click()
            page.wait_for_selector('#replay-seed', timeout=30000)
            solve_mercury(page, 123456, 1)
            assert page.locator('.research-card').count() == 0
            page.locator('[data-puzzle="next-replay"]').click()
            page.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Circuit 2 / 3")', timeout=30000)
            solve_mercury(page, 123456, 3)
            # Resume the final stage from its saved draft, not a reconstructed fake board.
            page.locator('[data-puzzle="next-replay"]').click()
            try:
                page.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Circuit 3 / 3")', timeout=5000)
            except Exception:
                print('final chart debug:', page.locator('#puzzle-level-name').inner_text(), page.locator('#puzzle-board').inner_text(), errors)
                print('circuit save:', page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1"))?.circuits?.mercury'))
                raise
            page.locator('[data-puzzle="restart"]').click()
            page.locator('[data-puzzle="undo"]').click()  # exercise replay-safe restart history
            page.reload(wait_until='networkidle')
            page.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Circuit 3 / 3")', timeout=30000)
            solve_mercury(page, 123456, 5)
            assert 'Circuit sealed' in page.locator('#puzzle-result').inner_text()
            assert '9 stars' in page.locator('#puzzle-result').inner_text() or '/ 9 stars' in page.locator('#puzzle-result').inner_text()
            print('PASS: full three-stage circuit, real wins, restart/undo and reload resume')

            legacy_after = page.evaluate('localStorage.getItem("aether-planet-puzzles-v1")')
            if legacy_after != legacy_before:
                print('legacy before:', legacy_before)
                print('legacy after:', legacy_after)
            assert legacy_after == legacy_before, 'crafted/endless save changed during replay activity'
            saved = page.evaluate('JSON.parse(localStorage.getItem("aether-planet-replays-v1")).circuits.mercury')
            assert saved['seed'] == 123456 and saved['stage'] == 2 and len(saved['boards']) == 3
            print('PASS: replay save is isolated; crafted records and endless data are untouched')

            malformed = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            malformed.on('pageerror', lambda error: errors.append(str(error)))
            malformed.add_init_script("localStorage.setItem('aether-planet-replays-v1',JSON.stringify({version:1,daily:{mercury:{date:'bad',seed:-1,actions:'bad'}},circuits:{mercury:{seed:'bad',stage:99,actions:[]}}}))")
            malformed.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            malformed.locator('[data-replay="daily"]').click()
            malformed.wait_for_selector('.puzzle-grid', timeout=30000)
            assert malformed.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            malformed.close()
            print('PASS: malformed replay saves recover safely; mobile chart has no overflow')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Replay chart regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
