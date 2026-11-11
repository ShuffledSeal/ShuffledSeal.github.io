"""Capture the real Ætherium UI and fail on broken art, overflow or page errors.

Run with Python Playwright installed: python3 tests/ui-gallery.py
Screenshots are written to docs/ui-proof; no localStorage fixture is modified.
"""
import http.server
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'ui-proof'
OUT.mkdir(parents=True, exist_ok=True)


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
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            errors = []
            captures = (
                ('grand-tour-desktop', '/grand-tour.html', 1440, 1000),
                ('observatory-desktop', '/index.html#overview', 1440, 1000),
                ('cartridge-cabinet-desktop', '/index.html#voyage', 1440, 1000),
                ('planetary-puzzle-desktop', '/index.html#planet/earth', 1440, 1000),
                ('cosmic-arcade-desktop', '/index.html#arcade', 1440, 1000),
                ('research-cabinet-desktop', '/index.html#collection', 1440, 1000),
                ('grand-tour-mobile', '/grand-tour.html', 390, 844),
                ('observatory-mobile', '/index.html#overview', 390, 844),
                ('cartridge-cabinet-mobile', '/index.html#voyage', 390, 844),
            )
            for name, route, width, height in captures:
                page = browser.new_page(
                    viewport={'width': width, 'height': height},
                    device_scale_factor=1,
                    reduced_motion='reduce',
                )
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + route, wait_until='networkidle')
                page.locator('#main, main').first.wait_for(state='visible')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{name}: horizontal overflow'
                art = page.locator('.engraving-mat img, .landing-engraving-mat img')
                assert art.count() == 0 or art.evaluate_all('(images) => images.every((image) => image.complete && image.naturalWidth > 0)'), f'{name}: historical engraving did not load'
                if width >= 1001 and route.startswith('/index'):
                    profile = page.locator('.profile').bounding_box()
                    assert profile and profile['y'] >= 0 and profile['y'] + profile['height'] <= height + 1, 'desktop profile controls are clipped below the sidebar'
                if '#overview' in route:
                    assert page.locator('.atlas-card .planet-sphere').first.evaluate('(planet) => planet.getBoundingClientRect().width >= 70'), 'atlas portrait collapsed'
                if '#voyage' in route:
                    assert page.locator('.cartridge-card').count() == 6
                    assert page.locator('.cartridge-emblem svg').count() == 6
                    assert page.locator('.cartridge-engraving img').evaluate_all('(images) => images.length === 6 && images.every((image) => image.complete && image.naturalWidth > 0)'), 'six cartridge engravings did not load'
                    assert page.locator('.hangar-ship svg').count() == 4, 'four illustrated hulls are missing'
                page.screenshot(path=str(OUT / f'{name}.png'), full_page=False, animations='disabled')
                print(f'captured docs/ui-proof/{name}.png ({width}×{height})')
                page.close()

            replay = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            replay.on('pageerror', lambda error: errors.append(str(error)))
            replay.goto(f'{base}/index.html#planet/mercury', wait_until='networkidle')
            replay.locator('[data-replay="daily"]').click()
            replay.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Daily chart")', timeout=30000)
            replay.screenshot(path=str(OUT / 'daily-chart-desktop.png'), full_page=False, animations='disabled')
            print('captured docs/ui-proof/daily-chart-desktop.png')
            replay.close()

            book = browser.new_page(viewport={'width': 1440, 'height': 1000})
            book.on('pageerror', lambda error: errors.append(str(error)))
            book.goto(f'{base}/index.html#overview', wait_until='networkidle')
            book.wait_for_timeout(1250)
            book.evaluate('document.querySelector("a[data-view=voyage]").click()')
            book.wait_for_timeout(170)
            assert book.locator('.route-page-turn').count() == 1
            book.screenshot(path=str(OUT / 'route-book-desktop.png'), full_page=False)
            book.wait_for_timeout(1250)
            assert book.locator('.aether-route').count() == 0, 'book transition did not clean up'
            print('captured docs/ui-proof/route-book-desktop.png and verified cleanup')
            book.close()
            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('UI gallery passed: historical engravings loaded, six sigils and four hulls rendered, atlas portraits visible, no overflow or browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
