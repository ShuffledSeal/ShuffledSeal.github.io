"""Veteran Bastion sapper/Ward and Labyrinth scanner/jammer regression.

Run from the repository root with the developer-only Python Playwright install:
    python3 tests/premium-expansion.py

The suite uses real canvas/keyboard/pointer controls and a local static server.
"""
import http.server
import json
import socketserver
import threading
from collections import deque
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


def mount(page, cartridge, options):
    page.evaluate('''({cartridge, options}) => {
        window.__premiumTrial?.destroy();
        document.querySelector('#premium-expansion')?.remove();
        const host = document.createElement('div');
        host.id = 'premium-expansion';
        host.style.cssText = 'position:relative;z-index:1000';
        document.body.append(host);
        window.__premiumEnds = [];
        window.__premiumTrial = AetherTrials.create(cartridge, host, {
            ...options, sound: false,
            onEnd: result => window.__premiumEnds.push(result),
        });
    }''', {'cartridge': cartridge, 'options': options})
    return page.locator('#premium-expansion canvas')


def destroy(page):
    page.evaluate('window.__premiumTrial.destroy()')
    assert page.locator('#premium-expansion canvas, #premium-expansion button').count() == 0
    page.clock.run_for(2200)
    assert page.evaluate('window.__premiumEnds') == [], 'destroy must suppress later onEnd callbacks'


def build(page, canvas, tower, row, col):
    box = canvas.bounding_box()
    canvas.press(str(tower))
    canvas.click(position={
        'x': box['width'] * (180 + 92 * col) / 900,
        'y': box['height'] * (151 + 68 * row) / 560,
    })
    page.clock.run_for(180)


def until(page, canvas, attribute, predicate, budget=20000, step=200):
    elapsed = 0
    value = None
    while elapsed <= budget:
        value = canvas.get_attribute(attribute)
        if value is not None and predicate(value):
            return value
        page.clock.run_for(step)
        elapsed += step
    raise AssertionError(f'{attribute} did not satisfy check within {budget}ms; last value: {value!r}')


def json_attribute(canvas, attribute):
    return json.loads(canvas.get_attribute(attribute) or '[]')


def hold(page, key, milliseconds):
    page.keyboard.down(key)
    try:
        page.clock.run_for(milliseconds)
    finally:
        page.keyboard.up(key)
    page.clock.run_for(30)


def assert_connected(layout):
    walls = layout['walls']
    rows, cols = len(walls), len(walls[0])
    start = (1, 5)
    seen = {start}
    queue = deque([start])
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < cols and 0 <= ny < rows and not walls[ny][nx] and (nx, ny) not in seen:
                seen.add((nx, ny))
                queue.append((nx, ny))
    floor = {(x, y) for y in range(rows) for x in range(cols) if not walls[y][x]}
    assert seen == floor, 'every floor tile must remain connected to the entrance'
    # Scanner tuples also carry facing/phase; only their cell participates here.
    points = [tuple(p[:2]) for p in (
        *layout['keys'], *layout['bonus'], layout['seal'], layout['exit'], *layout['scanners'],
    )]
    for point in points:
        assert point in seen, f'objective or scanner at {point} must be on reachable floor'


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            # Production navigation still locks the variant; direct create() below
            # is only a fixture for reaching the two authored veteran encounters.
            locked = browser.new_page(viewport={'width': 1200, 'height': 850})
            locked.on('pageerror', lambda error: errors.append(str(error)))
            for cartridge in ('bastion', 'labyrinth'):
                locked.goto(f'{base}/index.html?standalone=1&cartridge={cartridge}&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
                assert locked.locator('.veteran-locked').count() == 1
                assert locked.locator('.cartridge-stage canvas').count() == 0
            locked.close()
            print('PASS: direct Veteran Sky URLs remain locked without standard clears')

            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'{base}/index.html#overview', wait_until='networkidle')
            page.clock.install()

            # Standard Bastion retains its six missions, four tools, economy and
            # original first manifest. The veteran-only fifth key is inert here.
            canvas = mount(page, 'bastion', {'seed': 6024})
            page.clock.run_for(350)
            assert canvas.get_attribute('data-veteran') == 'false'
            assert canvas.get_attribute('data-wave-count') == '6'
            assert canvas.get_attribute('data-incoming-sappers') == '0'
            assert page.locator('#premium-expansion [data-bastion-loadout]').count() == 4
            assert 'PLAN 1 / 6 · First light · 8 threats' in page.locator('[data-bastion-forecast]').inner_text()
            assert 'sapper' not in page.locator('[data-bastion-manifest]').inner_text()
            build(page, canvas, 1, 1, 2)
            assert canvas.get_attribute('data-selected-type') == 'Needle'
            assert canvas.get_attribute('data-alloy') == '130'
            canvas.press('5')
            page.clock.run_for(150)
            assert page.locator('#premium-expansion [data-bastion-loadout="0"]').get_attribute('aria-pressed') == 'true'
            destroy(page)
            print('PASS: standard Bastion keeps six sieges, four towers and its original economy/manifest')

            # The fifth tool is a real placement/refinement choice, not just a
            # counter in the manifest. Wide lattice changes its live radius and
            # locks out the alternate refinement path like other towers.
            canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
            page.clock.run_for(350)
            assert canvas.get_attribute('data-wave') == '7'
            assert canvas.get_attribute('data-wave-count') == '8'
            assert page.locator('#premium-expansion [data-bastion-loadout]').count() == 5
            assert page.locator('[data-bastion-manifest]').inner_text().count('sapper') == 2
            build(page, canvas, 5, 1, 1)
            assert canvas.get_attribute('data-selected-type') == 'Ward Loom'
            assert canvas.get_attribute('data-preview-range') == '155'
            assert canvas.get_attribute('data-alloy') == '105'
            canvas.press('q')
            page.clock.run_for(200)
            assert canvas.get_attribute('data-selected-tier') == '1'
            assert canvas.get_attribute('data-selected-path') == 'left'
            assert canvas.get_attribute('data-preview-range') == '189'
            assert canvas.get_attribute('data-alloy') == '24'
            canvas.press('e')
            page.clock.run_for(200)
            assert canvas.get_attribute('data-selected-tier') == '1'
            assert canvas.get_attribute('data-selected-path') == 'left'
            assert canvas.get_attribute('data-alloy') == '24'
            destroy(page)
            print('PASS: veteran Ward Loom builds with 5 and refines into a mutually exclusive wider lattice')

            # A sapper gates in with a long warning, stops outside Needle range,
            # visibly channels, then disables its target. No debug state is set.
            canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
            page.clock.run_for(300)
            build(page, canvas, 1, 1, 2)
            canvas.press('c')
            until(page, canvas, 'data-incoming-sappers', lambda value: int(value) >= 1, budget=7000)
            channels = json.loads(until(
                page, canvas, 'data-sapper-channels',
                lambda value: any(c['progress'] >= .35 for c in json.loads(value)), budget=18000,
            ))
            assert channels[0]['lane'] == 2 and channels[0]['target'] == 'Needle'
            disabled = json.loads(until(
                page, canvas, 'data-disabled-towers', lambda value: len(json.loads(value)) > 0, budget=7000,
            ))
            assert disabled[0]['type'] == 'Needle' and disabled[0]['lane'] == 2
            assert 0 < disabled[0]['remaining'] <= 5.5
            destroy(page)
            print('PASS: telegraphed sapper channels and disables an unprotected tower')

            # Pulse counterplay interrupts the live fuse before a shutdown.
            canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
            page.clock.run_for(300)
            build(page, canvas, 1, 1, 2)
            canvas.press('c')
            until(
                page, canvas, 'data-sapper-channels',
                lambda value: any(c['progress'] >= .45 for c in json.loads(value)), budget=25000,
            )
            canvas.press(' ')
            page.clock.run_for(180)
            assert canvas.get_attribute('data-sapper-interrupts') == '1'
            assert json_attribute(canvas, 'data-sapper-channels') == []
            assert json_attribute(canvas, 'data-disabled-towers') == []
            destroy(page)
            print('PASS: Aether Pulse breaks a sapper channel before sabotage lands')

            # A nearby Ward spends its recharge to ground that same sabotage;
            # the Needle remains enabled and the ward enters a real cooldown.
            canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
            page.clock.run_for(300)
            build(page, canvas, 1, 1, 2)
            build(page, canvas, 5, 1, 1)
            canvas.press('c')
            until(page, canvas, 'data-ward-blocks', lambda value: int(value) >= 1, budget=30000)
            assert json_attribute(canvas, 'data-disabled-towers') == []
            wards = json_attribute(canvas, 'data-wards')
            assert len(wards) == 1 and wards[0]['cooldown'] > 0 and not wards[0]['disabled']
            destroy(page)
            print('PASS: Ward Loom grounds sabotage, preserves the tower and spends its recharge')

            # Standard Labyrinth has no scanner/jammer additions and its exact
            # authored chamber-I objectives/patrols remain intact.
            canvas = mount(page, 'labyrinth', {'seed': 981})
            page.clock.run_for(1600)
            assert canvas.get_attribute('data-veteran') == 'false'
            assert canvas.get_attribute('data-chamber-count') == '4'
            assert canvas.get_attribute('data-scanner-count') == '0'
            assert page.locator('#premium-expansion [data-labyrinth-action="jammer"]').count() == 0
            standard_layout = json.loads(canvas.get_attribute('data-layout'))
            assert standard_layout['keys'] == [[3, 2], [10, 7]]
            assert standard_layout['bonus'] == [[8, 2], [15, 8]]
            assert standard_layout['seal'] == [8, 6]
            assert standard_layout['patrol'] == [[3, 4, 1, 8, 'v'], [8, 5, 2, 9, 'v'], [15, 7, 12, 16, 'h']]
            assert standard_layout['scanners'] == []
            assert_connected(standard_layout)
            canvas.press('g')
            page.clock.run_for(150)
            assert canvas.get_attribute('data-scanner-cooldown') == '0.00'
            destroy(page)
            print('PASS: standard Labyrinth keeps its exact first layout and has no scanner gadget')

            # Salt Crypt: two stationary sentinels sweep, a real decoy catches
            # their gaze, and G freezes scan/detection while patrols keep moving.
            canvas = mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 4})
            page.clock.run_for(1600)
            assert canvas.get_attribute('data-chamber') == '5'
            assert canvas.get_attribute('data-chamber-count') == '6'
            assert canvas.get_attribute('data-generated') == 'authored'
            assert canvas.get_attribute('data-scanner-count') == '2'
            assert_connected(json.loads(canvas.get_attribute('data-layout')))
            before = json_attribute(canvas, 'data-scanner-states')
            page.clock.run_for(650)
            after = json_attribute(canvas, 'data-scanner-states')
            assert any(a['facing'] != b['facing'] for a, b in zip(before, after)), 'scanner cones must visibly sweep'
            canvas.press('f')
            page.clock.run_for(300)
            assert canvas.get_attribute('data-decoy') == 'active'
            assert any(s['locked'] for s in json_attribute(canvas, 'data-scanner-states')), 'a nearby decoy must catch scanner gaze'
            patrol_before = json_attribute(canvas, 'data-patrol-states')
            canvas.press('g')
            page.clock.run_for(180)
            assert float(canvas.get_attribute('data-scanner-jam')) > 3
            frozen = json_attribute(canvas, 'data-scanner-states')
            assert all(s['jammed'] and not s['sees'] and s['alert'] == 0 for s in frozen)
            cooldown = float(canvas.get_attribute('data-scanner-cooldown'))
            page.clock.run_for(650)
            still_frozen = json_attribute(canvas, 'data-scanner-states')
            assert [s['facing'] for s in still_frozen] == [s['facing'] for s in frozen], 'jammer freezes sweep phase'
            patrol_after = json_attribute(canvas, 'data-patrol-states')
            assert patrol_after != patrol_before, 'scanner jammer must not freeze ordinary patrols'
            assert page.locator('#premium-expansion [data-labyrinth-action="jammer"]').is_disabled()
            canvas.press('g')
            page.clock.run_for(120)
            assert float(canvas.get_attribute('data-scanner-cooldown')) < cooldown, 'G cannot reset its own cooldown'
            page.clock.run_for(3200)
            assert canvas.get_attribute('data-scanner-jam') == '0.00'
            assert all(not s['jammed'] for s in json_attribute(canvas, 'data-scanner-states'))
            destroy(page)
            print('PASS: Salt Crypt scanners sweep, track decoys and jam without freezing patrols')

            # Cross the real Salt Crypt route under veil + jammer, then remain
            # beside the scanner as its cone resumes. Detection must rise from
            # the same sweep the player can see, not from a proximity-only aura.
            canvas = mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 4})
            page.clock.run_for(1600)
            canvas.press(' ')
            canvas.press('g')
            for key, milliseconds in (('w', 500), ('d', 1250), ('s', 500), ('d', 250)):
                hold(page, key, milliseconds)
            assert int(canvas.get_attribute('data-player-x')) >= 390
            assert int(canvas.get_attribute('data-hearts')) == 3
            assert float(canvas.get_attribute('data-scanner-jam')) > 0
            detected = json.loads(until(
                page, canvas, 'data-scanner-states',
                lambda value: any(s['sees'] for s in json.loads(value)), budget=5000, step=100,
            ))
            assert any(s['sees'] and s['alert'] > 0 for s in detected)
            destroy(page)
            print('PASS: a traversable scanner route stays safe under gadgets and detects when its visible sweep returns')

            # The second veteran room has its own three-scanner placement and all
            # original keys, bonus, exit and floor routes remain connected.
            canvas = mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 5})
            page.clock.run_for(1600)
            assert canvas.get_attribute('data-chamber') == '6'
            assert canvas.get_attribute('data-scanner-count') == '3'
            assert canvas.get_attribute('data-keys-required') == '3'
            meridian = json.loads(canvas.get_attribute('data-layout'))
            assert meridian['keys'] == [[5, 3], [13, 7], [8, 5]]
            assert_connected(meridian)
            destroy(page)
            print('PASS: Meridian Vault adds three scanners without changing objectives or floor connectivity')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Premium veteran expansion regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
