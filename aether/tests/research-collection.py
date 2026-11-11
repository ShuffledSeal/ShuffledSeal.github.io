"""Research collection: ordering, notes, guided study, export and safe persistence."""
import http.server
import json
import socketserver
import tempfile
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
        with sync_playwright() as playwright, tempfile.TemporaryDirectory() as downloads:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'{base}/index.html#collection', wait_until='networkidle')
            page.wait_for_timeout(1200)
            assert page.locator('h1').first.inner_text() == 'The research cabinet.'
            assert page.locator('[data-research-card]').count() == 2, 'legacy default saves must load'

            page.locator('[data-collection="first-night"]').first.click()
            assert page.locator('[data-research-card]').count() == 3
            first = page.locator('[data-research-card]').first.get_attribute('data-research-card')
            assert first == 'saturn'
            page.locator('[data-collection="move"][data-id="saturn"][data-direction="1"]').click()
            assert page.locator('[data-research-card]').first.get_attribute('data-research-card') != 'saturn'

            page.locator('[data-collection="note"][data-id="saturn"]').click()
            page.locator('#marginalia-text').fill('Observe the Cassini Division on a steady night.')
            page.locator('#marginalia-form button[type="submit"]').click()
            assert 'Cassini Division' in page.locator('[data-research-card="saturn"] .research-card-note').inner_text()
            page.locator('#collection-search').fill('Cassini')
            assert page.locator('[data-research-card]:visible').count() == 1
            page.locator('#collection-search').fill('')
            page.locator('[data-collection="filter"][data-value="planet"]').click()
            assert page.locator('[data-research-card]:visible').count() == 1
            page.locator('[data-collection="filter"][data-value="all"]').click()
            assert page.locator('[data-research-card]:visible').count() == 3
            print('PASS: first-night shelf, keyboard ordering, marginalia, search, filters and reset')

            page.locator('[data-collection="tour"]').click()
            assert page.locator('#modal-title').inner_text()
            page.locator('[data-collection="tour-studied"]').click()
            page.locator('[data-collection="tour-next"]').click()
            assert page.locator('#modal-title').inner_text()
            page.locator('[data-action="close-modal"]').click()
            assert page.locator('.research-ledger strong').nth(1).inner_text() == '1 / 3'

            with page.expect_download() as pending:
                page.locator('[data-collection="export"]').click()
            download = pending.value
            path = Path(downloads) / download.suggested_filename
            download.save_as(path)
            text = path.read_text()
            assert '# Æther — Personal research collection' in text
            assert 'Cassini Division' in text
            assert 'An evening with Saturn' in text, 'linked journal observations should export'
            print('PASS: guided study, study ledger and exported Markdown with marginalia and journal pages')

            page.reload(wait_until='networkidle')
            page.wait_for_timeout(1200)
            assert page.locator('.research-ledger strong').nth(1).inner_text() == '1 / 3'
            assert 'Cassini Division' in page.locator('[data-research-card="saturn"] .research-card-note').inner_text()
            assert page.locator('[data-research-card]').first.get_attribute('data-research-card') != 'saturn'
            assert page.locator('.research-card-plate .atlas-sphere').count() >= 1
            assert page.locator('.research-card-plate .atlas-sphere').first.evaluate('(planet) => getComputedStyle(planet).borderRadius') == '50%'
            print('PASS: ordering, study state, notes and illustrated plates survive reload')

            malformed = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            malformed.on('pageerror', lambda error: errors.append(str(error)))
            malformed.add_init_script("localStorage.setItem('aether-research-collection-v1',JSON.stringify({order:[null,'bogus'],notes:[],opened:'bad',studied:{}}))")
            malformed.goto(f'{base}/index.html#collection', wait_until='networkidle')
            assert malformed.locator('[data-research-card]').count() == 2
            assert malformed.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            malformed.locator('[data-collection="tour"]').click()
            assert malformed.locator('#modal-title').inner_text()
            malformed.close()
            print('PASS: malformed research saves recover safely; mobile guided study has no overflow')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Research collection regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
