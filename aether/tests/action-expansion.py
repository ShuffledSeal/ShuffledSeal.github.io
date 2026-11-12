"""Veteran action-trial expansion and classic-route browser regressions.

Run from the repository root with Python Playwright installed:
    python3 tests/action-expansion.py

The startEncounter Chain option is a stable encounter fixture, equivalent to
Labyrinth's startChamber. All drafts, formation changes and launches below use
the real controls; simulation time advances through the shared 120 Hz frame.
"""
import http.server
import json
import math
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
STANDARD_CHAIN_ROUTE = [
    'Drift nursery',
    'Scissor crossing',
    'The Needle keeper',
    'Broken crown',
    'The Unraveller',
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def mount(page, cartridge, options):
    page.evaluate('''({cartridge, options}) => {
        window.__actionGame?.destroy();
        window.__actionHost?.remove();
        const host = document.createElement('div');
        host.id = 'action-expansion-fixture';
        host.style.cssText = 'position:fixed;left:12px;top:12px;z-index:10000';
        document.body.append(host);
        window.__actionHost = host;
        window.__actionEnds = [];
        window.__actionGame = AetherTrials.create(cartridge, host, {
            ...options, sound: false,
            onEnd: result => window.__actionEnds.push(result),
        });
    }''', {'cartridge': cartridge, 'options': options})
    return page.locator('#action-expansion-fixture canvas')


def state(page):
    return page.evaluate('window.__actionGame.state')


def point_on_canvas(canvas, x, y):
    box = canvas.bounding_box()
    return box['x'] + box['width'] * x / 900, box['y'] + box['height'] * y / 560


def steer_chain(page, canvas, index):
    points = [(95, 105), (805, 115), (800, 455), (105, 450), (450, 95), (450, 465)]
    x, y = points[(index // 2) % len(points)]
    page.mouse.move(*point_on_canvas(canvas, x, y))


def reach_chain_draft(page, canvas):
    for index in range(200):
        current = state(page)
        assert current['over'] == 0, f"Chain ended before its first veteran refit: {current}"
        if current['phase'] == 'draft':
            return current
        steer_chain(page, canvas, index)
        page.clock.run_for(250)
    raise AssertionError(f"Chain did not reach a refit in fifty seconds: {state(page)}")


def advance_attunement(page, canvas):
    for index in range(60):
        if state(page)['attuned']:
            return
        assert state(page)['over'] == 0
        steer_chain(page, canvas, index)
        page.clock.run_for(250)
    raise AssertionError(f"Lodestar did not attune: {state(page)}")


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            def new_page():
                page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'{base}/index.html#overview', wait_until='networkidle')
                page.clock.install()
                return page

            # The classic route and spawn grammar remain untouched.
            page = new_page()
            canvas = mount(page, 'chain', {'seed': 6024})
            assert state(page)['routeNames'] == STANDARD_CHAIN_ROUTE
            assert canvas.get_attribute('data-chain-route') == 'Drift nursery'
            assert canvas.get_attribute('data-chain-boss-pattern') == 'cross'
            page.locator('[data-chain-start]').click()
            page.clock.run_for(1200)
            current = state(page)
            assert current['enemies'] and {enemy['kind'] for enemy in current['enemies']} == {'drift'}
            assert not {'relay', 'lodestar'} & set(current['relics'])
            page.evaluate('window.__actionGame.destroy()')
            page.close()
            print('PASS: classic Chain keeps its five encounters and drift-only opening')

            # A Warden tracks during aim, stops tracking on lock, then creates
            # a warned fixed ray. Moving after the lock does not bend the ray.
            page = new_page()
            canvas = mount(page, 'chain', {'veteran': True, 'seed': 813})
            assert state(page)['routeNames'][0] == 'Aurora crossing'
            page.locator('button[data-chain-formation="halo"]').click()
            page.mouse.move(*point_on_canvas(canvas, 120, 125))
            page.locator('[data-chain-start]').click()
            locked = None
            for _ in range(80):
                current = state(page)
                assert current['over'] == 0
                warden = next((enemy for enemy in current['enemies'] if enemy['kind'] == 'warden'), None)
                if warden and warden['mode'] == 'lock':
                    locked = warden
                    break
                page.clock.run_for(100)
            assert locked is not None, f"Warden never reached its readable lock: {state(page)}"
            page.mouse.move(*point_on_canvas(canvas, 790, 445))
            page.clock.run_for(100)
            warden = next(enemy for enemy in state(page)['enemies'] if enemy['kind'] == 'warden')
            assert warden['mode'] == 'lock'
            assert math.isclose(warden['aim'], locked['aim'], abs_tol=1e-12)
            for _ in range(8):
                beams = [hazard for hazard in state(page)['hazards'] if hazard['kind'] == 'beam']
                if beams:
                    break
                page.clock.run_for(100)
            assert len(beams) == 1
            assert beams[0]['warning'] > 0
            assert math.isclose(beams[0]['dx'], math.cos(locked['aim']), abs_tol=1e-12)
            assert math.isclose(beams[0]['dy'], math.sin(locked['aim']), abs_tol=1e-12)
            assert canvas.get_attribute('data-chain-wardens') == '1'
            page.evaluate('window.__actionGame.destroy()')
            page.clock.run_for(1200)
            assert page.evaluate('window.__actionEnds') == []
            page.close()
            print('PASS: veteran Warden has a tracking windup, fixed lock, warned beam and clean destroy')

            # The first veteran refit features both new builds. Counterpoint's
            # real formation button produces an immediate link-by-link volley.
            for relic in ('relay', 'lodestar'):
                page = new_page()
                canvas = mount(page, 'chain', {'veteran': True, 'seed': 6024})
                page.locator('button[data-chain-formation="spear"]').click()
                page.locator('[data-chain-start]').click()
                draft_state = reach_chain_draft(page, canvas)
                assert 'relay' in draft_state['choices'] and 'lodestar' in draft_state['choices']
                choice = page.locator(f'[data-chain-choice="{relic}"]')
                choice.focus()
                page.keyboard.press('Enter')
                assert state(page)['relics'][relic] == 1
                if relic == 'relay':
                    before = state(page)
                    page.locator('button[data-chain-formation="halo"]').click()
                    after = state(page)
                    assert after['relayCount'] == 1
                    assert after['shotsFired'] == before['shotsFired'] + before['links']
                    assert 7.9 < after['relayTime'] <= 8
                    assert after['invuln'] >= .35
                    page.locator('button[data-chain-formation="spear"]').click()
                    assert state(page)['relayCount'] == 1, 'cooldown must prevent formation-button volley spam'
                    page.evaluate('window.__actionGame.pause()')
                    frozen = state(page)['relayTime']
                    page.clock.run_for(500)
                    assert state(page)['relayTime'] == frozen
                    page.evaluate('window.__actionGame.resume()')
                else:
                    page.locator('button[data-chain-formation="spear"]').click()
                    advance_attunement(page, canvas)
                    assert canvas.get_attribute('data-chain-attuned') == 'true'
                    for index in range(24):
                        bolts = state(page)['bolts']
                        if any(bolt['lodestar'] and bolt['pierce'] >= 1 for bolt in bolts):
                            break
                        steer_chain(page, canvas, index)
                        page.clock.run_for(250)
                    assert any(bolt['lodestar'] and bolt['pierce'] >= 1 for bolt in state(page)['bolts'])
                    page.locator('button[data-chain-formation="halo"]').click()
                    assert not state(page)['attuned'] and state(page)['attune'] == 0, state(page)
                page.evaluate('window.__actionGame.destroy()')
                page.clock.run_for(1000)
                assert page.evaluate('window.__actionEnds') == []
                page.close()
            print('PASS: Counterpoint volleys/cooldown and Lodestar attunement/pierce work through real drafts')

            # Stable boss fixtures compare the preserved cross with the new
            # three-spoke braid before either warning can hurt the chain.
            for veteran in (False, True):
                page = new_page()
                canvas = mount(page, 'chain', {'veteran': veteran, 'startEncounter': 4, 'seed': 99})
                assert state(page)['encounter'] == 5
                page.locator('[data-chain-start]').click()
                for _ in range(70):
                    hazards = state(page)['hazards']
                    if hazards:
                        break
                    page.clock.run_for(100)
                assert hazards
                if veteran:
                    assert state(page)['bossPattern'] == 'braid'
                    assert len(hazards) == 3 and {hazard['kind'] for hazard in hazards} == {'beam'}
                    assert all(hazard['warning'] > 0 for hazard in hazards)
                    angles = sorted(math.atan2(hazard['dy'], hazard['dx']) for hazard in hazards)
                    assert len({round(angle, 6) for angle in angles}) == 3
                    assert canvas.get_attribute('data-chain-boss-pattern') == 'braid'
                else:
                    assert state(page)['bossPattern'] == 'cross'
                    assert len(hazards) == 2 and {hazard['kind'] for hazard in hazards} == {'lane'}
                    assert all(hazard['warning'] > 0 for hazard in hazards)
                page.evaluate('window.__actionGame.destroy()')
                page.close()
            print('PASS: standard Unraveller cross is unchanged; veteran braid deals three warned spokes')

            # Classic and two same-seed veteran skiffs run side by side. Gentle
            # key events keep them centred long enough to observe the second
            # gate spawn, before the first ring can reach the skiff.
            page = new_page()
            page.evaluate('''() => {
                window.__perihelionEnds = [[], [], []];
                window.__perihelionRuns = [false, true, true].map((veteran, index) => {
                    const host = document.createElement('div');
                    host.id = `perihelion-fixture-${index}`;
                    document.body.append(host);
                    const game = AetherTrials.create('perihelion', host, {
                        veteran, seed: 'action-expansion', sound: false,
                        onEnd: result => window.__perihelionEnds[index].push(result),
                    });
                    return {game, host};
                });
            }''')
            for _ in range(29):
                page.evaluate('''() => {
                    for (const {game} of window.__perihelionRuns) {
                        if (game.state.over) continue;
                        const y = game.state.skiff.y;
                        if (y < 276 || y > 284) {
                            game.canvas.dispatchEvent(new KeyboardEvent(y < 276 ? 'keydown' : 'keyup', {
                                key: ' ', bubbles: true, cancelable: true,
                            }));
                        }
                    }
                }''')
                page.clock.run_for(100)
            runs = page.evaluate('window.__perihelionRuns.map(run => run.game.state)')
            assert all(run['over'] == 0 for run in runs), runs
            classic, veteran_a, veteran_b = runs
            assert classic['route'] == 'classic'
            assert set(classic['patternCounts']) == {'ring'}
            assert all(gate['pattern'] == 'ring' and gate['y'] == gate['baseY'] for gate in classic['gates'])
            assert veteran_a['route'] == 'Wayward tail'
            assert veteran_a['patternCounts'].get('drift', 0) >= 1
            assert veteran_a['patternCounts'].get('pair', 0) == 2
            signature = lambda run: [(gate['pattern'], gate['x'], gate['y'], gate['baseY'], gate['pairOrder']) for gate in run['gates']]
            assert signature(veteran_a) == signature(veteran_b)
            drift = next(gate for gate in veteran_a['gates'] if gate['pattern'] == 'drift')
            assert not math.isclose(drift['y'], drift['baseY'], abs_tol=1e-9)
            pair = [gate for gate in veteran_a['gates'] if gate['pattern'] == 'pair']
            assert len(pair) == 2 and math.isclose(abs(pair[1]['x'] - pair[0]['x']), 330, abs_tol=1e-9)
            assert 0 < abs(pair[1]['y'] - pair[0]['y']) <= 140
            assert page.locator('#perihelion-fixture-0 canvas').get_attribute('data-perihelion-route') == 'classic'
            assert page.locator('#perihelion-fixture-1 canvas').get_attribute('data-perihelion-route') == 'Wayward tail'
            page.evaluate('window.__perihelionRuns[1].game.destroy()')
            page.clock.run_for(1200)
            assert page.evaluate('window.__perihelionEnds[1]') == []
            page.evaluate('window.__perihelionRuns.forEach(run => run.game.destroy())')
            page.close()
            print('PASS: classic gates stay static; seeded veteran drift/pair gates are deterministic and destroy-safe')

            # An unattended classic skiff still fails and calls back once.
            page = new_page()
            mount(page, 'perihelion', {})
            page.clock.run_for(4000)
            results = page.evaluate('window.__actionEnds')
            assert len(results) == 1 and results[0]['won'] is False
            assert results[0]['score'] >= 0
            page.clock.run_for(1500)
            assert len(page.evaluate('window.__actionEnds')) == 1
            assert page.locator('#action-expansion-fixture canvas').count() == 0
            page.close()
            print('PASS: classic Perihelion defeat, score, teardown and exactly-once callback remain intact')

            # The new route is reachable through the real Grand Tour, not only
            # through create(): Eclipse receives it, Navigator stays classic.
            for difficulty, expected_route, veteran in (
                ('standard', 'classic', 'false'),
                ('eclipse', 'Wayward tail', 'true'),
            ):
                page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
                page.on('pageerror', lambda error: errors.append(str(error)))
                saved = {
                    'version': 1,
                    'records': {},
                    'active': {
                        'seed': 6024, 'step': 0, 'difficulty': difficulty,
                        'hull': 3, 'maxHull': 3, 'dust': 0, 'instruments': [],
                        'hullId': 'kite', 'done': {}, 'path': [], 'kills': 0,
                        'map': [[{'kind': 'trial', 'trial': 'perihelion'}] for _ in range(12)],
                    },
                }
                page.add_init_script(f"localStorage.setItem('aether-grand-tour-v2', {json.dumps(json.dumps(saved))})")
                page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
                page.clock.install()
                brief = page.locator('[data-tour-node="0:0"]').get_attribute('aria-label')
                assert 'Perihelion Run' in brief
                page.locator('[data-tour-node="0:0"]').click()
                canvas = page.locator('.trial-frame canvas')
                canvas.wait_for()
                assert canvas.get_attribute('data-perihelion-veteran') == veteran
                assert canvas.get_attribute('data-perihelion-route') == expected_route
                if difficulty == 'eclipse':
                    assert 'numbered offset pairs' in page.locator('.tour-node-brief').inner_text()
                page.close()
            print('PASS: real Grand Tour mounts drifting Perihelion gates only on its Eclipse route')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Action expansion regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
