"""Upgrade/readability checks and non-flashing score readouts."""
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
            page.goto(f'{base}/index.html?standalone=1&cartridge=bastion&mode=campaign#voyage', wait_until='networkidle')
            assert page.locator('.bastion-loadout button').count() == 4
            assert page.locator('.bastion-loadout .upgrade-icon').count() == 4
            assert page.locator('.bastion-loadout .upgrade-copy').first.evaluate('(element) => parseFloat(getComputedStyle(element).fontSize)') >= 12
            canvas = page.locator('.cartridge-stage canvas')
            box = canvas.bounding_box()
            page.mouse.click(box['x'] + box['width'] * 364 / 900, box['y'] + box['height'] * 219 / 560)
            page.wait_for_function('document.querySelector("[data-bastion-selection]").textContent.includes("Needle")')
            assert 'alloy/refinement' in page.locator('[data-bastion-selection]').inner_text()
            assert page.locator('[data-bastion-selection]').evaluate('(element) => parseFloat(getComputedStyle(element).fontSize)') >= 13
            assert page.locator('[data-bastion-action="left"]').inner_text()
            assert page.locator('[data-bastion-action="right"]').inner_text()
            print('PASS: illustrated tower loadout and readable selected-tower refinements')

            page.goto(f'{base}/index.html?standalone=1&cartridge=chain&mode=campaign#voyage', wait_until='networkidle')
            assert page.locator('.chain-formations .upgrade-icon').count() == 3
            assert page.locator('.chain-formations .upgrade-copy').first.evaluate('(element) => parseFloat(getComputedStyle(element).fontSize)') >= 12
            print('PASS: illustrated constellation formations and readable descriptions')

            page.evaluate('''() => {
                const host=document.createElement('div');host.id='df-upgrade-review';document.body.append(host);
                window.__dfUpgrade=AetherDeepField.create(host,{campaign:true,sound:false,onEnd(){}});
            }''')
            page.locator('.deepfield-cell').nth(40).click()
            safe = page.evaluate('window.__dfUpgrade.snapshot().grid.flatMap((value,index)=>value>=0&&!window.__dfUpgrade.snapshot().revealed.includes(index)?[index]:[])')
            for index in safe:
                page.locator('.deepfield-cell').nth(index).click()
            page.wait_for_selector('.df-intermission')
            assert page.locator('.df-intermission .upgrade-icon').count() == 3
            assert page.locator('.df-relics small').first.evaluate('(element) => parseFloat(getComputedStyle(element).fontSize)') >= 12
            page.evaluate('window.__dfUpgrade.destroy()')
            print('PASS: illustrated Deep Field relic intermission with readable effects')

            page.goto(f'{base}/index.html#arcade', wait_until='networkidle')
            page.evaluate('document.querySelector("#game-score").textContent = "12"')
            page.wait_for_timeout(180)
            assert page.locator('#game-score.motion-score').count() == 0
            assert page.locator('#game-score').evaluate('(element) => getComputedStyle(element).animationName') == 'none'
            assert page.locator('#game-score').inner_text() == '12'
            print('PASS: score changes update silently without flashing')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Upgrade interface regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
