"""Regression: all ten cartridges remain visible and launch their real games."""
import os
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    PORT = sock.getsockname()[1]
BASE = f'http://127.0.0.1:{PORT}/index.html'
SERVER = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
EXPECTED = ['Starfall Skirmish', 'Aether Bastion', 'Glass Labyrinth', 'Starforge', 'Constellation Chain', 'Planet Drop', 'Comet Surf', 'Stardust Dash', 'Orbit Breaker', 'Deep Field']

try:
    for _ in range(50):
        try:
            if urllib.request.urlopen(BASE, timeout=2).status == 200:
                break
        except Exception:
            time.sleep(.1)
    else:
        raise RuntimeError('Local Æther server did not start')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1440, 900), (390, 844)]:
            page = browser.new_page(viewport={'width': width, 'height': height})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.add_init_script("localStorage.setItem('aether-wonder-rooms-v1',JSON.stringify({best:{'merge:v3':123,'dash:v3:exp':456}}))")
            page.goto(f'{BASE}?standalone=1#voyage', wait_until='networkidle')
            assert page.locator('.cartridge-card').count() == len(EXPECTED)
            for name in EXPECTED:
                assert page.locator('.cartridge-card', has_text=name).count() == 1, f'{name} is missing at {width}px'
            assert 'BEST 123' in page.locator('.cartridge-merge').inner_text()
            assert 'BEST 456' in page.locator('.cartridge-dash').inner_text()
            assert page.locator('.cartridge-daily-link').count() == 9
            page.locator('.cartridge-merge').click()
            page.wait_for_load_state('networkidle')
            assert page.url.endswith('#arcade')
            assert page.locator('.arcade-choice.selected .choice-copy strong').inner_text() == 'Planet Drop'
            assert page.locator('a[href="index.html?standalone=1#voyage"]').count() >= 1
            page.goto(f'{BASE}?standalone=1&cartridge=hop#arcade', wait_until='networkidle')
            assert page.locator('.arcade-choice.selected .choice-copy strong').inner_text() == 'Comet Surf'
            page.goto(f'{BASE}?standalone=1&cartridge=dash&challenge=daily#arcade', wait_until='networkidle')
            assert page.locator('.arcade-choice.selected .choice-copy strong').inner_text() == 'Stardust Dash'
            assert 'DAILY' in page.locator('#overlay-kicker').inner_text().upper()
            assert page.locator('[data-exp="game-daily"]').get_attribute('aria-pressed') == 'true'
            page.goto(f'{BASE}?standalone=1&cartridge=breaker#arcade', wait_until='networkidle')
            assert page.locator('.arcade-choice.selected .choice-copy strong').inner_text() == 'Orbit Breaker'
            page.goto(f'{BASE}?standalone=1&cartridge=deepfield&challenge=daily#voyage', wait_until='networkidle')
            assert page.locator('.deepfield-cell').count() == 120
            page.locator('.deepfield-cell').nth(55).click()
            signature = page.locator('.deepfield-grid').get_attribute('data-grid-signature')
            page.reload(wait_until='networkidle')
            page.locator('.deepfield-cell').nth(55).click()
            assert page.locator('.deepfield-grid').get_attribute('data-grid-signature') == signature
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert not errors, errors
            print(f'{width}px: ten cards, scores, direct launches, Deep Field determinism and Daily Vigil passed')
            page.close()
        browser.close()
finally:
    SERVER.terminate()
    SERVER.wait(timeout=5)
