"""Veteran Sky unlocks, engine-specific rules and isolated record books."""
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
            locked = browser.new_page(viewport={'width': 1200, 'height': 850})
            locked.on('pageerror', lambda error: errors.append(str(error)))
            locked.goto(f'{base}/index.html?standalone=1&cartridge=shooter&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
            assert locked.locator('.veteran-locked').count() == 1
            assert locked.locator('.cartridge-stage canvas').count() == 0
            assert 'Prove the standard instrument first' in locked.locator('.veteran-locked').inner_text()
            locked.close()
            print('PASS: unearned Veteran Sky is genuinely locked, including direct URLs')

            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.on('pageerror', lambda error: errors.append(str(error)))
            clears = {key: 1 for key in ('shooter', 'bastion', 'labyrinth', 'chain', 'deepfield')}
            page.add_init_script('''const clears=''' + str(clears).replace("'", '"') + ''';
                localStorage.setItem('aether-cartridge-records-v1',JSON.stringify({best:{'shooter:veteran':77},clears}));
                localStorage.setItem('aether-starforge-v1',JSON.stringify({completed:1,best:3}));''')
            page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-veteran-link:not(.locked)').count() == 6
            for width in (1440, 390):
                page.set_viewport_size({'width': width, 'height': 1000})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                assert page.locator('.cartridge-veteran-link:not(.locked)').evaluate_all('(links) => links.every(link => link.scrollWidth <= link.clientWidth + 1)')
            page.set_viewport_size({'width': 1440, 'height': 1000})
            print('PASS: six mechanic-rich Veteran links fit desktop and phone cabinets without overflow')

            page.goto(f'{base}/index.html?standalone=1&cartridge=shooter&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-stage canvas').get_attribute('data-difficulty') == 'eclipse'
            assert page.locator('.cartridge-record strong').inner_text() == '77'
            assert 'VETERAN SKY' in page.locator('.cartridge-header').inner_text()
            print('PASS: Skirmish uses Eclipse rules and the separate veteran record')

            page.goto(f'{base}/index.html?standalone=1&cartridge=bastion&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-stage canvas').get_attribute('data-veteran') == 'true'
            assert page.locator('#cartridge-stage').get_attribute('data-veteran') == 'true'
            print('PASS: Bastion receives veteran hull rules')

            page.goto(f'{base}/index.html?standalone=1&cartridge=labyrinth&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-stage canvas').get_attribute('data-speed-scale') == '1.18'
            print('PASS: Labyrinth patrol pressure is 18% faster')

            page.goto(f'{base}/index.html?standalone=1&cartridge=chain&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-stage canvas').get_attribute('data-chain-speed-scale') == '1.18'
            print('PASS: Chain scales hazards and threats by 1.18')

            page.goto(f'{base}/index.html?standalone=1&cartridge=deepfield&mode=campaign#voyage', wait_until='networkidle')
            assert page.locator('.deepfield-grid').get_attribute('data-mines') == '10'
            page.goto(f'{base}/index.html?standalone=1&cartridge=deepfield&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
            assert page.locator('.deepfield-grid').get_attribute('data-mines') == '12'
            print('PASS: Deep Field increases novae from 10 to 12 on its first chart')

            page.goto(f'{base}/index.html?standalone=1&cartridge=starforge#voyage', wait_until='networkidle')
            standard_target = page.locator('#starforge-energy').inner_text()
            standard_heat = page.locator('#starforge-heat').inner_text()
            page.goto(f'{base}/index.html?standalone=1&cartridge=starforge&variant=veteran#voyage', wait_until='networkidle')
            assert page.locator('#starforge-energy').inner_text() != standard_target
            assert page.locator('#starforge-heat').inner_text() != standard_heat
            assert page.locator('#starforge-energy').inner_text() == '0 / 9'
            assert page.locator('#starforge-heat').inner_text() == '0 / 56'
            assert page.evaluate('JSON.parse(localStorage.getItem("aether-starforge-v1")).completed') == 1
            print('PASS: Starforge tightens target and heat cap without altering standard unlocks')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Veteran Sky regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
