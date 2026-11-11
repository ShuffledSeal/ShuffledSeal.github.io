"""Final cross-game release audit using Python Playwright and installed Chromium."""
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


def no_overflow(page, label):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{label}: horizontal page overflow'


def goto(page, base, route):
    page.goto(f'{base}/index.html{route}', wait_until='networkidle')
    assert page.locator('#main').inner_text().strip(), f'{route}: empty main view'


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.on('pageerror', lambda error: errors.append(str(error)))
            goto(page, base, '?standalone=1#voyage')

            # Chromium parses every shipped classic script, providing a syntax
            # check even on development machines where Node is unavailable.
            scripts = sorted(path.name for path in ROOT.glob('*.js'))
            syntax = page.evaluate('''async scripts => {
                const failures = [];
                for (const script of scripts) {
                    const source = await (await fetch(script)).text();
                    try { new Function(source); } catch (error) { failures.push(`${script}: ${error.message}`); }
                }
                return failures;
            }''', scripts)
            assert not syntax, syntax
            print(f'PASS: Chromium parsed all {len(scripts)} shipped JavaScript files')

            # Cabinet filters are functional, not decorative.
            for family, count in (('strategy', 3), ('action', 3), ('arcade', 4), ('all', 10)):
                page.locator(f'[data-cabinet-filter="{family}"]').click()
                assert page.locator('[data-cabinet-family]:visible').count() == count
            print('PASS: cabinet filters expose 3 strategy, 3 action, 4 arcade and 10 total games')

            # Every Grand Tour trial mounts, paints, pauses, resumes and destroys.
            trial_ids = page.evaluate('AetherTrials.list.map(trial => trial.id)')
            for trial_id in trial_ids:
                page.evaluate('''id => {
                    document.querySelector('#trial-audit')?.remove();
                    const host = document.createElement('div'); host.id = 'trial-audit'; document.body.append(host);
                    window.__trialAuditCalls = 0;
                    window.__trialAudit = AetherTrials.create(id, host, {sound:false, onEnd(){ window.__trialAuditCalls++; }});
                }''', trial_id)
                page.wait_for_timeout(80)
                assert page.evaluate('Boolean(window.__trialAudit?.canvas)'), f'{trial_id}: no game surface'
                page.evaluate('window.__trialAudit.pause?.()')
                page.evaluate('window.__trialAudit.resume?.()')
                page.evaluate('window.__trialAudit.destroy()')
                assert page.evaluate('window.__trialAuditCalls') == 0, f'{trial_id}: callback during mount/destroy'
                assert page.evaluate('window.__trialAudit.canvas.isConnected') is False, f'{trial_id}: leaked game surface'
            print(f'PASS: all {len(trial_ids)} trials mount, paint, pause, resume and destroy without callbacks or leaked surfaces')

            # Direct flagship and arcade routes expose their actual engines.
            for cartridge in ('shooter', 'bastion', 'labyrinth', 'chain'):
                goto(page, base, f'?standalone=1&cartridge={cartridge}&mode=campaign#voyage')
                assert page.locator('.cartridge-stage canvas').count() == 1, cartridge
                no_overflow(page, cartridge)
            goto(page, base, '?standalone=1&cartridge=starforge#voyage')
            assert page.locator('.starforge-canvas').count() == 1
            for cartridge, title in (('merge', 'Planet Drop'), ('hop', 'Comet Surf'), ('dash', 'Stardust Dash'), ('breaker', 'Orbit Breaker')):
                goto(page, base, f'?standalone=1&cartridge={cartridge}#arcade')
                assert page.locator('.arcade-choice.selected .choice-copy strong').inner_text() == title
                assert page.locator('#arcade-canvas').count() == 1
                no_overflow(page, title)
            print('PASS: all nine action/factory/arcade direct cartridges mount their real engines')

            # Real puzzle action: previous-position glide, blocked feedback and pipe motion.
            goto(page, base, '#planet/mars')
            move = page.evaluate('''() => {
                const def = AetherPuzzles.definition('mars', 0), board = AetherPuzzles.initial('mars', def, 0);
                window.__auditMars = {def, board};
                for (let d = 0; d < 4; d++) if (AetherPuzzles.transition('mars', def, board, {type:'move', value:d})) return d;
            }''')
            page.locator(f'[data-puzzle-direction="{move}"]').click()
            assert page.locator('.piece.rover').evaluate('(element) => element.getAnimations().length > 0'), 'Mars rover did not glide'
            page.wait_for_timeout(100)
            second_move = page.evaluate('''() => {
                const def = AetherPuzzles.definition('mars', 0);
                let board = AetherPuzzles.initial('mars', def, 0);
                const actions = JSON.parse(localStorage.getItem('aether-planet-puzzles-v1'))?.drafts?.['mars:0']?.actions || [];
                for (const action of actions) board = AetherPuzzles.transition('mars', def, board, action) || board;
                for (let d = 0; d < 4; d++) if (AetherPuzzles.transition('mars', def, board, {type:'move', value:d})) return d;
            }''')
            jump = page.evaluate('''d => {
                const rover = document.querySelector('.piece.rover'), before = rover.getBoundingClientRect();
                document.querySelector(`[data-puzzle-direction="${d}"]`).click();
                const after = rover.getBoundingClientRect();
                return Math.hypot(after.left - before.left, after.top - before.top);
            }''', second_move)
            assert jump < 1.5, f'rapid second input snapped the rover by {jump}px'
            page.wait_for_function('document.querySelector(".piece.rover").getAnimations().length === 0', timeout=3000)
            assert page.locator('.piece.rover').evaluate('(element) => element.getAnimations().length === 0')
            blocked = page.evaluate('''() => {
                const def = AetherPuzzles.definition('mars', 0);
                let board = AetherPuzzles.initial('mars', def, 0);
                const actions = JSON.parse(localStorage.getItem('aether-planet-puzzles-v1'))?.drafts?.['mars:0']?.actions || [];
                for (const action of actions) board = AetherPuzzles.transition('mars', def, board, action) || board;
                for (let d = 0; d < 4; d++) if (!AetherPuzzles.transition('mars', def, board, {type:'move', value:d})) return d;
                return -1;
            }''')
            assert blocked >= 0
            page.locator(f'[data-puzzle-direction="{blocked}"]').click()
            assert page.locator('.puzzle-grid.is-blocked').count() == 1

            goto(page, base, '#planet/venus')
            page.locator('.pipe-cell:not([aria-disabled="true"])').first.click()
            assert page.locator('.pipe-cell.changed').count() == 1
            assert page.locator('.pipe-cell.changed .pipe-art').evaluate('(element) => getComputedStyle(element).animationName') == 'pipe-turn'
            print('PASS: planetary pieces glide, blocked moves respond and pipes animate their actual changes')

            # Solve a real Mercury board through its public solver and player input.
            goto(page, base, '#planet/mercury')
            solution = page.evaluate('''async () => {
                const def = AetherPuzzles.definition('mercury', 0), board = AetherPuzzles.initial('mercury', def, 0);
                const path = await AetherPuzzles.solve('mercury', def, board);
                return path.map(action => action.value);
            }''')
            assert solution
            for cell in solution:
                page.locator(f'[data-puzzle-cell="{cell}"]').click()
            assert page.locator('#puzzle-result').is_visible()
            assert page.locator('.puzzle-celebration').count() == 1
            print(f'PASS: Mercury solved through {len(solution)} real inputs with saved result and win celebration')

            # Major observatory and all eight planetary routes still render.
            routes = {
                '#overview': '.playground-home', '#arcade': '#arcade-canvas', '#discover': '.room-grid',
                '#telescope': '#scope-canvas', '#planetarium': '.atlas-card-grid', '#calendar': '.calendar-layout',
                '#journal': '.journal-grid', '#collection': '.collection-grid',
            }
            for route, selector in routes.items():
                goto(page, base, route)
                assert page.locator(selector).count() >= 1, route
            for planet in ('mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'):
                goto(page, base, f'#planet/{planet}')
                assert page.locator('.puzzle-grid, .orbital-dials').count() == 1, planet
            print('PASS: Observatory, arcade, work rooms, atlas and all eight planetary puzzle routes')

            # Reduced motion keeps state changes but suppresses cosmetic motion.
            quiet = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            quiet.on('pageerror', lambda error: errors.append(str(error)))
            goto(quiet, base, '#planet/mars')
            move = quiet.evaluate('''() => {
                const def = AetherPuzzles.definition('mars', 0), board = AetherPuzzles.initial('mars', def, 0);
                for (let d = 0; d < 4; d++) if (AetherPuzzles.transition('mars', def, board, {type:'move', value:d})) return d;
            }''')
            quiet.locator(f'[data-puzzle-direction="{move}"]').click()
            assert quiet.locator('.piece.rover').evaluate('(element) => element.getAnimations().length === 0')
            goto(quiet, base, '?standalone=1&cartridge=deepfield&challenge=daily#voyage')
            quiet.locator('.deepfield-cell').nth(55).click()
            assert quiet.locator('.df-particle').count() == 0
            assert int(quiet.locator('.deepfield-grid').get_attribute('data-revealed')) > 0
            no_overflow(quiet, 'reduced-motion Deep Field')
            quiet.close()
            print('PASS: reduced motion preserves puzzle and Minesweeper state without cosmetic particles')

            # Responsive checks on the highest-density release screens.
            for width, height in ((390, 844), (768, 1024), (1440, 900)):
                responsive = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                responsive.on('pageerror', lambda error: errors.append(str(error)))
                for route, selector in (
                    ('?standalone=1#voyage', '.cartridge-cabinet'),
                    ('?standalone=1&cartridge=deepfield&challenge=daily#voyage', '.deepfield-grid'),
                    ('?standalone=1&cartridge=merge#arcade', '#arcade-canvas'),
                    ('#planet/venus', '.puzzle-grid'),
                ):
                    goto(responsive, base, route)
                    assert responsive.locator(selector).count() == 1
                    no_overflow(responsive, f'{route} at {width}px')
                responsive.close()
            print('PASS: 390 / 768 / 1440px cabinet, Deep Field, arcade and planetary layouts')

            # A malformed old archive never prevents a fresh cabinet.
            malformed = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            malformed.on('pageerror', lambda error: errors.append(str(error)))
            fixture = json.loads((ROOT / 'tests/fixtures/malformed-saves.json').read_text())
            malformed.add_init_script('''const saves=''' + json.dumps(fixture) + ''';
                for (const [key, value] of Object.entries(saves)) localStorage.setItem(key, JSON.stringify(value));''')
            goto(malformed, base, '?standalone=1#voyage')
            assert malformed.locator('.tour-chart, .cartridge-cabinet').count() == 1
            goto(malformed, base, '?standalone=1&cartridge=deepfield&challenge=daily#voyage')
            assert malformed.locator('.deepfield-cell').count() == 120
            no_overflow(malformed, 'malformed saves')
            malformed.close()
            print('PASS: malformed save fixtures recover to a safe migrated Tour and direct cartridge play')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Cross-game release audit passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
