"""Veteran Skirmish fourth act: Cantor telegraphs, refits, victory and teardown."""
import http.server
import json
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def mount(page, host, **options):
    page.evaluate('''([host, options]) => {
        window.__veteranHunts ||= {};
        window.__veteranEnds ||= {};
        window.__veteranHunts[host]?.destroy();
        document.getElementById(host)?.remove();
        const element = document.createElement('div');
        element.id = host;
        document.body.append(element);
        window.__veteranEnds[host] = [];
        window.__veteranHunts[host] = AetherSkirmish.create(element, {
            sector: 0, elite: false, endless: false, hull: 'bell', instruments: [],
            seed: 84021, difficulty: 'explorer', sound: false, ...options,
            onEnd: result => window.__veteranEnds[host].push(result),
        });
    }''', [host, options])


def snapshot(page, host):
    return page.evaluate('''host => {
        const canvas = document.querySelector(`#${host} canvas`);
        return canvas ? {...canvas.dataset} : {};
    }''', host)


def until(page, host, predicate, timeout=30000, step=250):
    elapsed = 0
    while elapsed <= timeout:
        if page.evaluate('''([host, predicate]) => {
            const c = document.querySelector(`#${host} canvas`);
            return Boolean(c && Function('c', `return (${predicate})`)(c));
        }''', [host, predicate]):
            return snapshot(page, host)
        page.clock.run_for(step)
        elapsed += step
    raise AssertionError(f'{host}: timed out waiting for {predicate}; state={json.dumps(snapshot(page, host), sort_keys=True)}')


def destroy(page, host):
    page.evaluate('host => window.__veteranHunts[host]?.destroy()', host)
    assert page.locator(f'#{host} canvas, #{host} .skirmish-armory, #{host} .skirmish-draft').count() == 0


def reach_cathedral_refit(page, host):
    # Enter only the unchanged third act, then clear it through real controls.
    # This keeps the test focused without replacing any combat or draft internals.
    mount(page, host, veteran=True, startAct=3,
          instruments=['echo-plate', 'starforged-rail', 'tempest-fuse', 'aurora-siphon', 'rime-coating', 'cinder-valve'])
    canvas = page.locator(f'#{host} canvas')
    canvas.focus()
    page.keyboard.down('j')
    weave = ['w', 'd', 's', 'a']
    try:
        for index in range(80):
            state = snapshot(page, host)
            if state.get('phase') == 'draft':
                break
            key = weave[index % len(weave)]
            page.keyboard.down(key)
            page.clock.run_for(500)
            page.keyboard.up(key)
            if index % 4 == 3 and state.get('phase') == 'combat':
                canvas.press(' ')
        else:
            raise AssertionError(f'{host}: third act did not reach a draft; state={snapshot(page, host)}')
    finally:
        page.keyboard.up('j')
    state = snapshot(page, host)
    assert state.get('wave') == '3', state
    assert state.get('phase') == 'draft', state
    choices = state.get('draft', '').split(',')
    assert choices[:2] == ['severance', 'stillwake'], choices
    assert len(choices) == 4, choices
    objective = page.locator(f'#{host} [data-skirmish-objective]').inner_text()
    assert 'Act 3 cleared' in objective and 'The glass cathedral' in objective, objective
    return canvas


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                page = browser.new_page(viewport={'width': 1440, 'height': 1000})
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'{base}/index.html#overview', wait_until='networkidle')
                page.clock.install()

                # Standard campaigns still have exactly three acts, and the fixture
                # option cannot smuggle Veteran content into a standard hunt.
                mount(page, 'standard-acts', startAct=4)
                standard = until(page, 'standard-acts', "c.dataset.wave === '1'", timeout=5000)
                assert standard['actCount'] == '3', standard
                assert standard['act'] == '1', standard
                assert standard['bossKind'] == '', standard
                assert 'Act 1 of 3 · Break the screen' in page.locator('#standard-acts [data-skirmish-objective]').inner_text()
                destroy(page, 'standard-acts')
                print('PASS: standard Skirmish remains a three-act campaign')

                # The boss uses fixed-step states: sequential locked ground marks,
                # a windup/live rotating crown, then destructible mirror votives.
                mount(page, 'cantor-tells', veteran=True, startAct=4)
                boss = until(page, 'cantor-tells', "c.dataset.bossKind === 'cantor' && document.querySelector('#cantor-tells [data-skirmish-objective]').textContent.includes('Act 4 of 4')", timeout=6000)
                assert boss['actCount'] == '4' and boss['act'] == '4', boss
                assert 'Act 4 of 4' in page.locator('#cantor-tells [data-skirmish-objective]').inner_text()
                until(page, 'cantor-tells', "c.dataset.bossAttack === 'sigils' && Number(c.dataset.cantorMarks) > 0", timeout=7000)
                frozen = snapshot(page, 'cantor-tells')
                page.evaluate("window.__veteranHunts['cantor-tells'].pause()")
                page.clock.run_for(1400)
                paused = snapshot(page, 'cantor-tells')
                assert paused['bossAttackTime'] == frozen['bossAttackTime'], (frozen, paused)
                assert paused['cantorMarkMin'] == frozen['cantorMarkMin'], (frozen, paused)
                page.evaluate("window.__veteranHunts['cantor-tells'].resume()")
                until(page, 'cantor-tells', "c.dataset.bossAttack === 'crown' && c.dataset.bossAttackPhase === 'windup'", timeout=9000)
                until(page, 'cantor-tells', "c.dataset.bossAttack === 'crown' && c.dataset.bossAttackPhase === 'live'", timeout=4000)
                warded = until(page, 'cantor-tells', "c.dataset.bossState === 'warded'", timeout=10000)
                assert int(warded['votives']) >= 2, warded
                assert 'mirror votives' in page.locator('#cantor-tells [data-skirmish-objective]').inner_text()
                destroy(page, 'cantor-tells')
                page.clock.run_for(2500)
                assert page.evaluate("window.__veteranEnds['cantor-tells']") == []
                print('PASS: Cantor sigil/crown telegraphs freeze on pause; mirror wards mount; destroy is inert')

                # Stillwake is a real dash rule, not a label: it creates a timed
                # sanctuary and applies its advertised 25% recharge tradeoff.
                reach_cathedral_refit(page, 'stillwake-refit')
                page.locator('#stillwake-refit canvas').focus()
                page.keyboard.press('2')
                until(page, 'stillwake-refit', "c.dataset.bossKind === 'cantor'", timeout=7000)
                page.locator('#stillwake-refit canvas').focus()
                until(page, 'stillwake-refit', "c.dataset.nearestOrb !== '' && Number(c.dataset.nearestOrb) < 85", timeout=26000, step=100)
                page.locator('#stillwake-refit canvas').press(' ')
                veiled = until(page, 'stillwake-refit', "c.dataset.stillwake === 'true' && Number(c.dataset.stillwakeErased) > 0", timeout=1500, step=50)
                assert veiled['refit'] == 'stillwake', veiled
                assert float(veiled['burstCooldownMax']) > .99, veiled
                destroy(page, 'stillwake-refit')
                assert page.evaluate("window.__veteranEnds['stillwake-refit']") == []
                print('PASS: Stillwake erases a real incoming votive bolt with the slower recharge tradeoff')

                # Severing Rounds must damage the warded boss through actual hits
                # on the choir. The same pilot then finishes the complete boss fight.
                reach_cathedral_refit(page, 'severance-refit')
                page.locator('#severance-refit canvas').focus()
                page.keyboard.press('1')
                until(page, 'severance-refit', "c.dataset.bossKind === 'cantor'", timeout=7000)
                canvas = page.locator('#severance-refit canvas')
                canvas.focus()
                page.keyboard.down('j')
                weave = ['a', 'w', 'd', 's']
                try:
                    severed = False
                    for index in range(80):
                        state = snapshot(page, 'severance-refit')
                        if not state:
                            break
                        if state.get('bossState') == 'warded' and int(state.get('severanceHits', '0')) > 0:
                            severed = True
                            break
                        key = weave[index % 4]
                        page.keyboard.down(key)
                        page.clock.run_for(400)
                        page.keyboard.up(key)
                        if index % 5 == 4:
                            canvas.press(' ')
                    assert severed, f'Severing Rounds never struck the warded Cantor: {snapshot(page, "severance-refit")}'

                    for index in range(160):
                        if not page.locator('#severance-refit canvas').count():
                            break
                        key = weave[index % 4]
                        page.keyboard.down(key)
                        page.clock.run_for(350)
                        page.keyboard.up(key)
                        if index % 5 == 4 and page.locator('#severance-refit canvas').count():
                            canvas.press(' ')
                finally:
                    page.keyboard.up('j')
                page.clock.run_for(1600)
                results = page.evaluate("window.__veteranEnds['severance-refit']")
                assert len(results) == 1, f'expected one ending, got {results}; state={snapshot(page, "severance-refit")}'
                assert results[0]['won'] is True, f'Cantor clear failed: {results[0]}'
                assert results[0]['kills'] > 0 and results[0]['score'] > 0, results[0]
                assert page.locator('#severance-refit canvas, #severance-refit .skirmish-draft').count() == 0
                page.clock.run_for(2500)
                assert len(page.evaluate("window.__veteranEnds['severance-refit']")) == 1
                print('PASS: Severing Rounds arcs through mirror wards; Cantor can be cleared once with clean teardown')

                assert not errors, f'uncaught browser exceptions: {errors}'
                print('Veteran fourth-act regression passed with no uncaught browser exceptions.')
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
