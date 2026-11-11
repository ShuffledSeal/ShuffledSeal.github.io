"""Deep Field release regression: real Chromium rules, input, modes and lifecycle."""
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


def open_game(page, base, suffix='&challenge=daily'):
    page.goto(f'{base}/index.html?standalone=1&cartridge=deepfield{suffix}#voyage', wait_until='networkidle')
    board = page.locator('.deepfield-grid')
    board.wait_for(state='visible')
    return board


def generated_grid(page, safe_index):
    board = page.locator('.deepfield-grid')
    args = {
        'cols': int(board.get_attribute('aria-colcount')),
        'rows': int(board.get_attribute('aria-rowcount')),
        'mines': int(board.get_attribute('data-mines')),
        'seed': int(board.get_attribute('data-seed')),
        'safeIndex': safe_index,
    }
    return page.evaluate('args => AetherDeepField.generate(args).grid', args)


def click_all_safe(page, grid, scope=''):
    page.evaluate('''({grid, scope}) => {
        document.querySelectorAll(`${scope} .deepfield-cell`).forEach((cell, index) => {
            if (grid[index] >= 0) cell.click();
        });
    }''', {'grid': grid, 'scope': scope})


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            page.on('pageerror', lambda error: errors.append(str(error)))

            # Pure generation invariants across every board class and many seeds.
            page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            generation = page.evaluate('''() => {
                for (const [id, preset] of Object.entries(AetherDeepField.PRESETS)) {
                    for (let seed = 1; seed <= 80; seed++) {
                        const safeIndex = Math.floor(preset.cols * preset.rows / 2);
                        const args = {...preset, seed, safeIndex};
                        const a = AetherDeepField.generate(args), b = AetherDeepField.generate(args);
                        if (JSON.stringify(a.grid) !== JSON.stringify(b.grid)) return `non-deterministic ${id}/${seed}`;
                        if (a.grid.filter(value => value === -1).length !== preset.mines) return `mine count ${id}/${seed}`;
                        if (a.grid[safeIndex] !== 0) return `unsafe opening ${id}/${seed}`;
                        for (const p of AetherDeepField.neighbours(safeIndex, a.cols, a.rows)) {
                            if (a.grid[p] < 0) return `unsafe neighbour ${id}/${seed}`;
                        }
                        for (let p = 0; p < a.grid.length; p++) {
                            if (a.grid[p] < 0) continue;
                            const count = AetherDeepField.neighbours(p, a.cols, a.rows).filter(q => a.grid[q] === -1).length;
                            if (count !== a.grid[p]) return `adjacency ${id}/${seed}/${p}`;
                        }
                        const opened = AetherDeepField.flood(a.grid, a.cols, a.rows, safeIndex);
                        if (!opened.length || opened.some(entry => a.grid[entry.index] < 0)) return `flood ${id}/${seed}`;
                    }
                }
                return null;
            }''')
            assert generation is None, generation
            print('PASS: 320 seeded boards, exact mine counts, adjacency, protected openings and flood safety')

            # Daily input, safe pre-start flagging, deterministic replay and clock pause.
            board = open_game(page, base)
            assert page.locator('.deepfield-cell').count() == 120
            first = page.locator('.deepfield-cell').nth(0)
            first.focus()
            page.keyboard.press('f')
            assert first.get_attribute('data-state') == 'flagged'
            assert board.get_attribute('data-grid-signature') == 'pending'
            assert board.get_attribute('data-started') == 'false'
            page.keyboard.press('q')
            assert first.get_attribute('data-state') == 'questioned'
            page.keyboard.press('q')
            assert first.get_attribute('data-state') == 'hidden'
            page.locator('.deepfield-cell').nth(55).click()
            signature = board.get_attribute('data-grid-signature')
            assert int(board.get_attribute('data-revealed')) > 0
            page.reload(wait_until='networkidle')
            page.locator('.deepfield-cell').nth(55).click()
            assert board.get_attribute('data-grid-signature') == signature

            hidden = page.evaluate('() => [...document.querySelectorAll(".deepfield-cell")].findIndex(cell => cell.dataset.state === "hidden")')
            cell = page.locator('.deepfield-cell').nth(hidden)
            cell.click(button='right')
            assert cell.get_attribute('data-state') == 'flagged'
            cell.click(button='right')
            assert cell.get_attribute('data-state') == 'questioned'
            cell.click(button='right')
            assert cell.get_attribute('data-state') == 'hidden'

            before_hint = int(board.get_attribute('data-revealed'))
            page.locator('[data-df-action="hint"]').click()
            assert int(board.get_attribute('data-revealed')) > before_hint
            assert int(board.get_attribute('data-hints')) == 1
            page.wait_for_timeout(1100)
            board.focus()
            page.keyboard.press('p')
            assert board.get_attribute('data-paused') == 'true'
            frozen = page.locator('[data-df-time]').inner_text()
            page.wait_for_timeout(450)
            assert page.locator('[data-df-time]').inner_text() == frozen
            assert page.evaluate('document.activeElement?.dataset?.dfAction') == 'pause'
            page.keyboard.press('p')
            assert board.get_attribute('data-paused') == 'false'
            page.locator('[data-df-action="zoom-in"]').click()
            assert board.get_attribute('data-zoom') == '1.25'
            assert page.locator('.df-board-scroll').evaluate('(element) => element.scrollWidth > element.clientWidth')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            print('PASS: daily determinism, pre-start flags, mark cycling, Oracle, pause-safe timer and zoom')

            # Correctly flagged chording must open remaining safe neighbours, then win once.
            page.reload(wait_until='networkidle')
            page.locator('.deepfield-cell').nth(55).click()
            grid = generated_grid(page, 55)
            page.evaluate('''grid => {
                document.querySelectorAll('.deepfield-cell').forEach((cell, index) => {
                    if (grid[index] === -1) cell.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true}));
                });
            }''', grid)
            target = page.evaluate('''grid => {
                const cells = [...document.querySelectorAll('.deepfield-cell')], cols = 12, rows = 10;
                return cells.findIndex((cell, p) => cell.classList.contains('revealed') && grid[p] > 0 && AetherDeepField.neighbours(p, cols, rows).some(q => grid[q] >= 0 && !cells[q].classList.contains('revealed')));
            }''', grid)
            assert target >= 0, 'a partially opened board needs a chord candidate'
            before_chord = int(board.get_attribute('data-revealed'))
            page.locator('.deepfield-cell').nth(target).click()
            assert int(board.get_attribute('data-revealed')) > before_chord
            click_all_safe(page, grid)
            page.locator('.cartridge-recap').wait_for(state='visible')
            assert page.locator('.cartridge-recap').count() == 1
            assert page.locator('.cartridge-recap h2').evaluate('(element) => document.activeElement === element')
            assert 'chart' in page.locator('.cartridge-detail').inner_text()
            record = page.evaluate("JSON.parse(localStorage.getItem('aether-cartridge-records-v1'))")
            daily_keys = [key for key in record['best'] if key.startswith('deepfield:20')]
            assert daily_keys and record['best'][daily_keys[0]] > 0
            best = page.locator('.cartridge-record strong').inner_text()
            page.reload(wait_until='networkidle')
            assert page.locator('.cartridge-record strong').inner_text() == best
            print('PASS: chording, complete win, detailed recap, daily score and record reload')

            # A real nova causes one loss; replay cannot receive a stale callback.
            board = open_game(page, base)
            page.locator('.deepfield-cell').nth(55).click()
            grid = generated_grid(page, 55)
            mine = grid.index(-1)
            page.locator('.deepfield-cell').nth(mine).click()
            page.locator('.cartridge-recap').wait_for(state='visible')
            assert page.locator('.cartridge-recap').count() == 1
            page.locator('[data-tour="cartridge-replay"]').click()
            page.locator('.deepfield-grid').wait_for(state='visible')
            page.wait_for_timeout(400)
            assert page.locator('.cartridge-recap').count() == 0
            print('PASS: nova loss, exactly one recap and clean replay')

            # Full campaign, Lens charge, Aegis protection and campaign clear record.
            board = open_game(page, base, '&mode=campaign')
            for stage, (safe_index, count) in enumerate(((40, 81), (60, 120), (96, 192))):
                assert page.locator('.deepfield-cell').count() == count
                page.locator('.deepfield-cell').nth(safe_index).click()
                grid = generated_grid(page, safe_index)
                if stage == 1:
                    assert '(3)' in page.locator('[data-df-action="hint"]').inner_text(), 'Lens adds a charge to later charts'
                if stage == 2:
                    mine = next(index for index, value in enumerate(grid) if value == -1)
                    page.locator('.deepfield-cell').nth(mine).click()
                    assert board.get_attribute('data-over') == 'false'
                    assert board.get_attribute('data-aegis') == '0'
                    assert page.locator('.deepfield-cell').nth(mine).get_attribute('data-state') == 'flagged'
                click_all_safe(page, grid)
                if stage < 2:
                    page.locator('.df-intermission').wait_for(state='visible')
                    relic = 'lens' if stage == 0 else 'aegis'
                    page.locator(f'[data-df-relic="{relic}"]').click()
                    page.locator('[data-df-action="continue"]').click()
                    page.locator('.df-intermission').wait_for(state='detached')
                else:
                    page.locator('.cartridge-recap').wait_for(state='visible')
            assert '3 charts sealed' in page.locator('.cartridge-detail').inner_text()
            record = page.evaluate("JSON.parse(localStorage.getItem('aether-cartridge-records-v1'))")
            assert record['clears']['deepfield'] == 1
            print('PASS: three-chart campaign, Lens, Aegis, intermissions, final recap and campaign clear')

            # Echo opens the next endless chart without starting its clock.
            page.evaluate('''() => {
                const host = document.createElement('div'); host.id = 'df-echo'; document.body.append(host);
                window.__dfEchoCalls = 0;
                window.__dfEcho = AetherDeepField.create(host, {endless:true, seed:987, sound:false, onEnd(){ window.__dfEchoCalls++; }});
            }''')
            echo_board = page.locator('#df-echo .deepfield-grid')
            page.locator('#df-echo .deepfield-cell').nth(60).click()
            echo_grid = page.evaluate('window.__dfEcho.snapshot().grid')
            click_all_safe(page, echo_grid, '#df-echo')
            page.locator('#df-echo .df-intermission').wait_for(state='visible')
            page.locator('#df-echo [data-df-relic="echo"]').click()
            page.locator('#df-echo [data-df-action="continue"]').click()
            page.wait_for_function('Number(document.querySelector("#df-echo .deepfield-grid").dataset.revealed) > 0')
            assert echo_board.get_attribute('data-started') == 'false'
            page.evaluate('window.__dfEcho.destroy()')
            assert page.locator('#df-echo').inner_html() == ''
            assert page.evaluate('window.__dfEchoCalls') == 0
            print('PASS: endless Echo relic, automatic opening without clock advance and teardown')

            # A player who acts before the delayed Echo still gets a safe clearing.
            page.emulate_media(reduced_motion='no-preference')
            page.evaluate('''() => {
                const host = document.createElement('div'); host.id = 'df-echo-race'; document.body.append(host);
                window.__dfEchoRaceCalls = 0;
                window.__dfEchoRace = AetherDeepField.create(host, {endless:true, seed:6, sound:false, onEnd(){ window.__dfEchoRaceCalls++; }});
            }''')
            page.locator('#df-echo-race .deepfield-cell').nth(60).click()
            race_grid = page.evaluate('window.__dfEchoRace.snapshot().grid')
            click_all_safe(page, race_grid, '#df-echo-race')
            page.locator('#df-echo-race .df-intermission').wait_for(state='visible')
            page.locator('#df-echo-race [data-df-relic="echo"]').click()
            page.evaluate('''() => {
                document.querySelector('#df-echo-race [data-df-action="continue"]').click();
                document.querySelector('#df-echo-race .deepfield-cell').click();
            }''')
            page.wait_for_timeout(500)
            race_board = page.locator('#df-echo-race .deepfield-grid')
            assert race_board.get_attribute('data-over') == 'false', 'Echo must never reveal a nova after a manual first click'
            assert int(race_board.get_attribute('data-revealed')) > 0
            assert page.evaluate('window.__dfEchoRaceCalls') == 0
            page.evaluate('window.__dfEchoRace.destroy()')
            page.emulate_media(reduced_motion='reduce')
            print('PASS: delayed Echo remains safe after an immediate manual reveal')

            # Destroying during the terminal delay suppresses the end callback.
            page.evaluate('''() => {
                const host = document.createElement('div'); host.id = 'df-destroy'; document.body.append(host);
                window.__dfDestroyCalls = 0;
                window.__dfDestroy = AetherDeepField.create(host, {seed:441, sound:false, onEnd(){ window.__dfDestroyCalls++; }});
            }''')
            page.locator('#df-destroy .deepfield-cell').nth(40).click()
            mine = page.evaluate('window.__dfDestroy.snapshot().grid.indexOf(-1)')
            page.locator('#df-destroy .deepfield-cell').nth(mine).click()
            page.evaluate('window.__dfDestroy.destroy()')
            page.wait_for_timeout(450)
            assert page.evaluate('window.__dfDestroyCalls') == 0
            assert page.locator('#df-destroy').inner_html() == ''
            print('PASS: no callback after destroy during terminal animation')
            page.close()

            # Coarse-pointer long press, explicit flag mode and phone layout.
            touch = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion='reduce')
            touch.on('pageerror', lambda error: errors.append(str(error)))
            board = open_game(touch, base)
            held = touch.locator('.deepfield-cell').nth(0)
            held.dispatch_event('pointerdown', {'pointerType': 'touch', 'pointerId': 7, 'clientX': 30, 'clientY': 30})
            touch.wait_for_timeout(550)
            held.dispatch_event('pointerup', {'pointerType': 'touch', 'pointerId': 7, 'clientX': 30, 'clientY': 30})
            assert held.get_attribute('data-state') == 'flagged'
            touch.locator('[data-df-action="flag-mode"]').click()
            touch.locator('.deepfield-cell').nth(1).tap()
            assert touch.locator('.deepfield-cell').nth(1).get_attribute('data-state') == 'flagged'
            touch.locator('[data-df-action="zoom-in"]').tap()
            assert board.get_attribute('data-zoom') == '1.25'
            assert touch.evaluate('document.documentElement.scrollWidth <= innerWidth')
            touch.close()
            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('PASS: 390px touch layout, long-press flag, flag mode, zoom and no page overflow')
            print('Deep Field release regression passed.')
    finally:
        server.shutdown()
        server.server_close()
