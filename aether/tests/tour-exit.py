"""Grand Tour safe exit, resume, confirmed abandon and unrelated-save safety."""
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
            page = browser.new_page(viewport={'width': 1280, 'height': 900})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.add_init_script("localStorage.setItem('aether-cartridge-records-v1',JSON.stringify({best:{shooter:321},clears:{shooter:2}}))")
            page.goto(f'{base}/index.html?standalone=1&tour=1#voyage', wait_until='networkidle')
            page.locator('[data-tour="begin"]').click()
            assert page.locator('.tour-chart').count() == 1
            assert page.locator('[data-tour="save-exit"]').count() == 1

            page.locator('[data-tour="save-exit"]').click()
            page.wait_for_url('**/grand-tour.html')
            active = page.evaluate('JSON.parse(localStorage.getItem("aether-grand-tour-v2")).active')
            assert active and active['step'] == 0 and active.get('node') is None
            print('PASS: chart Save & Leave reaches the title screen with the run intact')

            page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            assert page.locator('.tour-chart').count() == 1
            page.locator('[data-tour-node="0:0"]').click()
            assert page.locator('.tour-hunt-frame canvas').count() == 1
            assert page.locator('[data-tour="save-exit"]').count() == 1
            page.locator('[data-tour="save-exit"]').click()
            page.wait_for_url('**/grand-tour.html')
            assert page.locator('canvas').count() == 0
            print('PASS: encounter Save & Leave tears down the game and preserves the run')

            page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            page.locator('[data-tour-node="0:0"]').click()
            assert page.locator('.tour-hunt-frame canvas').count() == 1, 'current encounter should restart on return'
            page.locator('[data-tour="abandon-run"]').click()
            assert page.locator('#modal[open]').count() == 1
            page.locator('[data-action="close-modal"]').first.click()
            assert page.locator('#modal[open]').count() == 0
            assert page.locator('.tour-hunt-frame canvas').count() == 1, 'cancelling abandon should keep playing'
            page.locator('[data-tour="abandon-run"]').click()
            page.locator('[data-tour="confirm-abandon"]').click()
            page.wait_for_url('**/grand-tour.html')
            assert page.evaluate('JSON.parse(localStorage.getItem("aether-grand-tour-v2")).active') is None
            records = page.evaluate('JSON.parse(localStorage.getItem("aether-cartridge-records-v1"))')
            assert records['best']['shooter'] == 321 and records['clears']['shooter'] == 2
            print('PASS: cancel and confirmed abandon work; unrelated cartridge records are untouched')

            page.goto(f'{base}/index.html?tour=1#voyage', wait_until='networkidle')
            page.locator('[data-tour="begin"]').click()
            page.locator('[data-tour="save-exit"]').click()
            page.wait_for_function("location.hash === '#overview'")
            page.wait_for_selector('.playground-home')
            print('PASS: non-standalone Save & Leave returns to the Observatory')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Grand Tour exit regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
