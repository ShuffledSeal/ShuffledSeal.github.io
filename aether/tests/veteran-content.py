"""Expanded Veteran Sky acts, sieges, chambers, route, charts and contracts."""
import http.server
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


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.on('pageerror', lambda error: errors.append(str(error)))
            clears = {key: 1 for key in ('shooter', 'bastion', 'labyrinth', 'chain', 'deepfield')}
            page.add_init_script('''const clears=''' + str(clears).replace("'", '"') + ''';
                localStorage.setItem('aether-cartridge-records-v1',JSON.stringify({best:{},clears}));
                localStorage.setItem('aether-starforge-v1',JSON.stringify({completed:6,best:18}));''')

            for cartridge, selector, standard, veteran in (
                ('shooter', 'data-act-count', '3', '4'),
                ('bastion', 'data-wave-count', '6', '8'),
                ('labyrinth', 'data-chamber-count', '4', '6'),
            ):
                page.goto(f'{base}/index.html?standalone=1&cartridge={cartridge}&mode=campaign#voyage', wait_until='networkidle')
                assert page.locator('.cartridge-stage canvas').get_attribute(selector) == standard
                page.goto(f'{base}/index.html?standalone=1&cartridge={cartridge}&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
                assert page.locator('.cartridge-stage canvas').get_attribute(selector) == veteran
            print('PASS: standard 3 acts / 6 sieges / 4 chambers expand to 4 / 8 / 6 in Veteran Sky')

            page.goto(f'{base}/index.html?standalone=1&cartridge=chain&mode=campaign#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-stage canvas').get_attribute('data-chain-route') == 'Drift nursery'
            page.goto(f'{base}/index.html?standalone=1&cartridge=chain&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-stage canvas').get_attribute('data-chain-route') == 'Aurora crossing'
            assert page.locator('.cartridge-stage canvas').get_attribute('data-chain-route-length') == '5'
            print('PASS: Constellation Chain opens its alternate five-encounter route')

            for chamber in (4, 5):
                page.evaluate('''chamber => {
                    document.querySelector('#veteran-room-test')?.remove();
                    const host=document.createElement('div');host.id='veteran-room-test';document.body.append(host);
                    window.__veteranRoom=AetherTrials.create('labyrinth',host,{veteran:true,startChamber:chamber,sound:false,onEnd(){}});
                }''', chamber)
                page.wait_for_function('expected => document.querySelector("#veteran-room-test canvas")?.dataset.chamber === String(expected + 1)', arg=chamber, timeout=3000)
                assert page.locator('#veteran-room-test canvas').get_attribute('data-chamber') == str(chamber + 1)
                assert page.locator('#veteran-room-test canvas').get_attribute('data-chamber-count') == '6'
                assert page.locator('#veteran-room-test canvas').get_attribute('data-generated') == 'authored'
                page.evaluate('window.__veteranRoom.destroy()')
            print('PASS: Salt Crypt and Meridian Vault mount as authored, connected chambers')

            page.goto(f'{base}/index.html?standalone=1&cartridge=deepfield&mode=campaign#voyage', wait_until='networkidle')
            assert 'THREE OCCULTATIONS' in page.locator('.df-route-label').inner_text()
            page.goto(f'{base}/index.html?standalone=1&cartridge=deepfield&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
            assert 'FOUR OCCULTATIONS' in page.locator('.df-route-label').inner_text()
            generated = page.evaluate('''() => {
                const p=AetherDeepField.PRESETS.cathedral;
                const a=AetherDeepField.generate({...p,seed:77,safeIndex:108}),b=AetherDeepField.generate({...p,seed:77,safeIndex:108});
                return {cells:a.grid.length,mines:a.grid.filter(v=>v===-1).length,deterministic:JSON.stringify(a.grid)===JSON.stringify(b.grid),safe:a.grid[108]===0};
            }''')
            assert generated == {'cells': 216, 'mines': 52, 'deterministic': True, 'safe': True}
            print('PASS: Deep Field adds a deterministic 18×12 Cathedral chart with 52 novae')

            page.goto(f'{base}/index.html?standalone=1&cartridge=starforge#voyage', wait_until='networkidle')
            assert page.locator('.starforge-scenarios button').count() == 6
            page.goto(f'{base}/index.html?standalone=1&cartridge=starforge&variant=veteran#voyage', wait_until='networkidle')
            assert page.locator('.starforge-scenarios button').count() == 9
            assert page.locator('.starforge-canvas').get_attribute('data-scenario') == '7'
            assert page.locator('#starforge-energy').inner_text() == '0 / 27'
            assert page.locator('#starforge-heat').inner_text() == '0 / 70'
            page.locator('[data-star-scenario="7"]').click()
            assert page.locator('.starforge-canvas').get_attribute('data-scenario') == '8'
            assert page.locator('#starforge-energy').inner_text() == '0 / 33'
            assert page.locator('#starforge-heat').inner_text() == '0 / 68'
            assert page.evaluate('JSON.parse(localStorage.getItem("aether-starforge-v1")).completed') == 6
            print('PASS: three advanced contracts unlock without changing standard progression')

            # Complete the first advanced contract through its real device and cycle controls.
            page.goto(f'{base}/index.html?standalone=1&cartridge=starforge&variant=veteran#voyage', wait_until='networkidle')
            page.clock.install()
            page.locator('[data-star-scenario="6"]').click()
            canvas = page.locator('.starforge-canvas')
            box = canvas.bounding_box()
            slots = {'mirror': 0, 'conductor': 2, 'splitter': 3, 'furnace': 4, 'capacitor': 5, 'regulator': 6, 'rail': 7}
            import math
            for device, slot in slots.items():
                page.locator(f'[data-star-tool="{device}"]').click()
                angle = slot * math.pi / 4 - math.pi / 2
                canvas.click(position={'x': box['width'] * (450 + 182 * math.cos(angle)) / 900, 'y': box['height'] * (280 + 182 * math.sin(angle)) / 560})
            assert 'CIRCUIT ALIGNED' in page.locator('#starforge-guide-title').inner_text()
            page.locator('[data-starforge="run"]').click()
            page.clock.run_for(64000)
            assert 'RUN COMPLETE' in page.locator('.cartridge-recap .eyebrow').inner_text()
            assert page.evaluate('JSON.parse(localStorage.getItem("aether-starforge-v1")).completed') == 6
            print('PASS: Astral Crucible is winnable through real controls without advancing standard contracts')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Expanded Veteran content regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
