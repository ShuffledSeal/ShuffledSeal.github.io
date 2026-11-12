"""Arcade Masterwork seal gating and direct-route integration."""
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
            locked = browser.new_page(viewport={'width': 1280, 'height': 900})
            locked.on('pageerror', lambda error: errors.append(str(error)))
            locked.goto(f'{base}/index.html?standalone=1&cartridge=merge&variant=veteran#arcade', wait_until='networkidle')
            assert locked.locator('#overlay-kicker').inner_text() == 'MASTERWORK · SEALED'
            assert locked.locator('#game-start').inner_text() == 'RETURN TO FREE PLAY'
            locked.locator('#game-start').click()
            locked.wait_for_url('**/index.html?standalone=1&cartridge=merge#arcade')
            locked.close()
            print('PASS: unearned Masterwork is sealed and returns to free play')

            page = browser.new_page(viewport={'width': 1280, 'height': 900})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.add_init_script("localStorage.setItem('aether-wonder-rooms-v1',JSON.stringify({discoveries:['arcade:merge-3','arcade:hop-2','arcade:dash-10','arcade:breaker-5'],best:{'merge:v3':901,'merge:v3:masterwork':41,'hop:v3':901,'hop:v3:masterwork':41,'dash:v3:exp':901,'dash:v3:masterwork':41,'breaker:v3':901,'breaker:v3:masterwork':41}}))")
            for game in ('merge', 'hop', 'dash', 'breaker'):
                page.goto(f'{base}/index.html?standalone=1&cartridge={game}&variant=veteran#arcade', wait_until='networkidle')
                assert page.locator('#overlay-kicker').inner_text() == 'MASTERWORK EXPEDITION'
                assert page.locator('#arcade-canvas').count() == 1
                assert page.locator('#arcade-canvas').get_attribute('data-veteran') == 'true'
                assert page.locator('#game-best').inner_text() == '41'
                assert page.locator('.game-scoreboard small').nth(1).inner_text() == 'MASTERWORK BEST'
                assert page.locator('[data-exp="game-veteran"]').get_attribute('aria-pressed') == 'true'
            print('PASS: first-seal unlock opens every Masterwork route with a separate validated best')

            # A mixed deep-link cannot write Masterwork play into the daily ledger.
            page.goto(f'{base}/index.html?standalone=1&cartridge=merge&variant=veteran&challenge=daily#arcade', wait_until='networkidle')
            assert page.locator('#overlay-kicker').inner_text() == 'MASTERWORK EXPEDITION'
            assert page.locator('#game-best').inner_text() == '41'
            assert page.locator('[data-exp="game-casual"]').get_attribute('aria-pressed') == 'false'
            page.locator('[data-exp="game-daily"]').click()
            page.wait_for_url('**/index.html?standalone=1&cartridge=merge&challenge=daily#arcade')
            assert page.locator('#overlay-kicker').inner_text().startswith('TODAY’S DAILY EXPEDITION')
            assert page.locator('#game-best').inner_text() == '0'
            page.goto(f'{base}/index.html?standalone=1&cartridge=merge#arcade', wait_until='networkidle')
            assert page.locator('#game-best').inner_text() == '901'
            print('PASS: standard, Daily and Masterwork records stay isolated through links and mode controls')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Masterwork routing regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
