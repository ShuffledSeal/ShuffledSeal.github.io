"""Independent browser integration smoke; run: python3 tests/browser-integration.py.

Uses Python Playwright (developer-only) and its installed Chromium browser.
Does not alter the player's local storage or require Node in the deployment.
"""
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


with Server(('127.0.0.1', 0), QuietHandler) as server:
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'{base}/grand-tour.html', wait_until='networkidle')
            assert page.get_by_role('link', name='Begin your expedition', exact=False).count() > 0
            page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-card').count() == 10
            assert page.locator('.cartridge-daily-link').count() == 9
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

            for cartridge in ('shooter', 'bastion', 'labyrinth', 'chain'):
                page.goto(f'{base}/index.html?standalone=1&cartridge={cartridge}&mode=campaign#voyage', wait_until='networkidle')
                canvas = page.locator('.cartridge-stage canvas')
                assert canvas.count() == 1, f'{cartridge}: missing campaign canvas'
                assert page.locator('.cartridge-modes [aria-current="page"]').inner_text() == 'Campaign'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{cartridge}: phone overflow'
                if cartridge == 'shooter':
                    assert page.locator('[data-skirmish-weapon]').count() == 4
                    page.locator('[data-skirmish-weapon="scatter"]').click()
                    assert canvas.get_attribute('data-weapon') == 'scatter'
                elif cartridge == 'bastion':
                    assert canvas.get_attribute('data-planning') == 'true'
                    assert 'Lane 2: 4 scout' in page.locator('[data-bastion-manifest]').inner_text()
                    page.locator('[data-bastion-order="save"]').click()
                    page.wait_for_function('document.querySelector(".cartridge-stage canvas").dataset.planning === "false"')
                elif cartridge == 'labyrinth':
                    assert canvas.get_attribute('data-generated') == 'authored'
                    assert page.evaluate('''() => {
                        const a=AetherTrials.labyrinthCourse(981,2,0,false);
                        const b=AetherTrials.labyrinthCourse(981,2,0,false);
                        return JSON.stringify(a)===JSON.stringify(b) && a.keys.length>=2 && a.patrol.length>=3;
                    }''')
                else:
                    assert page.locator('[data-chain-start]').count() == 1
                    page.locator('[data-chain-start]').click()
                    page.wait_for_function('document.querySelector(".cartridge-stage canvas").dataset.chainPhase === "combat"')
                    page.locator('[data-chain-formation="halo"]').click()
                    assert canvas.get_attribute('data-chain-formation') == 'halo'

            page.goto(f'{base}/index.html?standalone=1&cartridge=deepfield&mode=campaign#voyage', wait_until='networkidle')
            assert page.locator('.deepfield-cell').count() == 81
            page.locator('.deepfield-cell').nth(40).click()
            assert int(page.locator('.deepfield-grid').get_attribute('data-revealed')) > 0
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Deep Field: phone overflow'

            page.goto(f'{base}/index.html?standalone=1&cartridge=starforge#voyage', wait_until='networkidle')
            assert page.locator('.starforge-canvas').count() == 1

            legacy = browser.new_page()
            fixture = json.loads((ROOT / 'tests/fixtures/legacy-saves-v0.json').read_text())
            legacy.add_init_script('''const saves=''' + json.dumps(fixture) + ''';
                for (const [key,value] of Object.entries(saves)) localStorage.setItem(key,JSON.stringify(value));''')
            legacy.on('pageerror', lambda error: errors.append(str(error)))
            legacy.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            assert legacy.locator('.tour-chart').count() == 1, 'legacy Grand Tour should still resume'
            legacy.goto(f'{base}/index.html?standalone=1&cartridge=shooter#voyage', wait_until='networkidle')
            assert legacy.locator('.cartridge-record strong').inner_text() == '321', 'old cartridge best must survive'
            legacy.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            browser.close()
            print('Browser integration passed: ten-cartridge cabinet, five campaigns, Deep Field input, controls, seeded rooms, Starforge, legacy saves, phone layout and console.')
    finally:
        server.shutdown()
        thread.join(timeout=2)
