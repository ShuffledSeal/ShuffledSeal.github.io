"""Motion lifecycle and cross-game art-direction continuity, using real Chromium."""
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
            page.goto(f'{base}/index.html#overview', wait_until='networkidle')
            page.wait_for_timeout(1250)
            assert page.locator('.aether-route').count() == 0, 'arrival book transition did not clean up'
            assert page.locator('.aether-ambience').count() == 1
            assert page.locator('use[href^="assets/icons.svg"]').count() == 0, 'legacy generic icon references remain'
            assert page.locator('use[href^="assets/victorian-icons.svg"]').count() > 10
            assert page.locator('.observer-path li').count() == 4, 'observer path is missing'

            page.evaluate('document.querySelector("a[data-view=voyage]").click()')
            assert page.locator('.aether-route').count() == 1, 'route book transition did not start'
            assert page.locator('.route-page-turn').count() == 1, 'route book page is missing'
            page.wait_for_timeout(1250)
            assert page.locator('.aether-route').count() == 0, 'route book transition leaked after navigation'
            assert page.locator('.cartridge-card').count() == 6
            card = page.locator('.cartridge-card').first
            box = card.bounding_box()
            page.mouse.move(box['x'] + box['width'] * .8, box['y'] + box['height'] * .3)
            page.wait_for_timeout(100)
            assert card.evaluate('(element) => element.style.getPropertyValue("--tilt-y") !== "0deg" && element.style.getPropertyValue("--tilt-y") !== ""'), 'pointer tilt did not respond'
            page.mouse.move(10, 10)
            page.wait_for_timeout(100)
            assert card.evaluate('(element) => element.style.getPropertyValue("--tilt-y") === "0deg"'), 'pointer tilt did not reset'
            print('PASS: arrival/route book transitions, ambient sky, bespoke icons, pointer tilt and cleanup')

            # Every flagship and every arcade cabinet shares the physical frame,
            # without replacing its distinct game canvas or controls.
            flagship = (
                ('shooter', '.tour-hunt-frame'), ('bastion', '.trial-frame'),
                ('labyrinth', '.trial-frame'), ('chain', '.trial-frame'),
                ('starforge', '.starforge-shell'), ('deepfield', '.df-console'),
            )
            for cartridge, frame in flagship:
                page.goto(f'{base}/index.html?standalone=1&cartridge={cartridge}&mode=campaign#voyage', wait_until='networkidle')
                if cartridge == 'deepfield':
                    assert page.locator('.deepfield-grid').count() == 1, cartridge
                else:
                    assert page.locator('.cartridge-stage canvas').count() == 1, cartridge
                background = page.locator(frame).evaluate('(element) => getComputedStyle(element, "::after").backgroundImage')
                assert 'rococo-frame.svg' in background, f'{cartridge}: missing engraved frame'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{cartridge}: overflow'
                page.wait_for_timeout(1000)
                assert page.locator('.instrument-wake, .instrument-wake-line').count() == 0, f'{cartridge}: wake animation leaked'
            for cartridge in ('merge', 'hop', 'dash', 'breaker'):
                page.goto(f'{base}/index.html?standalone=1&cartridge={cartridge}#arcade', wait_until='networkidle')
                assert page.locator('#arcade-canvas').count() == 1
                background = page.locator('.game-cabinet').evaluate('(element) => getComputedStyle(element, "::after").backgroundImage')
                assert 'rococo-frame.svg' in background, f'{cartridge}: missing engraved cabinet'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{cartridge}: overflow'
            print('PASS: all six flagship and four arcade cabinets share engraved frames, wake cleanup and responsive layout')

            # Secondary pages use the same folio/icon language.
            for route, selector in (
                ('#discover', '.room-grid'), ('#telescope', '.instrument-stage'),
                ('#calendar', '.calendar-layout'), ('#journal', '.journal-grid'),
                ('#collection', '.research-grid'), ('#cabinet', '.cabinet-passport'),
                ('#planet/earth', '.puzzle-layout'),
            ):
                page.goto(f'{base}/index.html{route}', wait_until='networkidle')
                assert page.locator(selector).count() >= 1, route
                assert page.locator('use[href^="assets/icons.svg"]').count() == 0, f'{route}: generic icons'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{route}: overflow'
            print('PASS: Wonder Rooms, calendar, journal, collection, discovery cabinet and planetary puzzles retain the shared style')

            # A record update ticks like a mechanical readout, then settles.
            page.goto(f'{base}/index.html#arcade', wait_until='networkidle')
            page.evaluate('document.querySelector("#game-score").textContent = "12"')
            page.wait_for_selector('#game-score.motion-score', timeout=1000)
            page.locator('[data-action="profile"]').click()
            assert page.locator('#modal[open]').count() == 1
            assert page.locator('#modal').evaluate('(element) => getComputedStyle(element).animationName') == 'modal-arrive'
            page.locator('[data-action="close-modal"]').click()
            print('PASS: animated record updates and folio dialogs')

            quiet = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            quiet.on('pageerror', lambda error: errors.append(str(error)))
            quiet.goto(f'{base}/index.html#overview', wait_until='networkidle')
            quiet.wait_for_timeout(200)
            assert quiet.locator('.aether-route, .aether-ambience, .instrument-wake-line').count() == 0
            quiet.evaluate('document.querySelector("a[data-view=voyage]").click()')
            quiet.wait_for_timeout(150)
            assert quiet.locator('.aether-route').count() == 0, 'reduced motion route shutter appeared'
            assert quiet.locator('.motion-reveal').count() == 0, 'reduced motion left hidden content'
            assert quiet.locator('.motion-tilt').first.evaluate('(element) => getComputedStyle(element).transform') == 'none'
            assert quiet.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            quiet.close()
            print('PASS: reduced motion removes shutters, ambience, hidden reveals and tilt without breaking mobile layout')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Motion and continuity regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
