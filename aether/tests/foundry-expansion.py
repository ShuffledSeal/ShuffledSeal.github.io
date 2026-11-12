"""Veteran Deep Field routes/relics and Starforge capacitor contract.

Run with: python3 tests/foundry-expansion.py
Uses real Chromium controls and never clears local storage.
"""
import http.server
import math
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


def mount_deepfield(page, *, veteran=False, campaign=True, endless=False, seed=24680):
    page.evaluate('''options => {
        window.__df?.destroy();
        document.querySelector('#foundry-df')?.remove();
        const host = document.createElement('div'); host.id = 'foundry-df'; document.body.append(host);
        window.__dfEvents = [];
        window.__df = AetherDeepField.create(host, {...options, sound:false, onEnd(event) { window.__dfEvents.push(event); }});
    }''', {'veteran': veteran, 'campaign': campaign, 'endless': endless, 'seed': seed})


def open_and_clear_deepfield(page, safe_index):
    page.locator('#foundry-df .deepfield-cell').nth(safe_index).click()
    grid = page.evaluate('window.__df.snapshot().grid')
    assert grid is not None
    clear_open_deepfield(page, grid)


def clear_open_deepfield(page, grid=None):
    grid = grid or page.evaluate('window.__df.snapshot().grid')
    page.evaluate('''grid => {
        document.querySelectorAll('#foundry-df .deepfield-cell').forEach((cell, index) => {
            if (grid[index] >= 0 && !cell.classList.contains('revealed')) cell.click();
        });
    }''', grid)


def continue_deepfield(page):
    page.locator('#foundry-df .df-intermission').wait_for(state='visible')
    page.locator('#foundry-df [data-df-action="continue"]').click()
    page.locator('#foundry-df .df-intermission').wait_for(state='detached')


def mount_starforge(page, *, veteran=False, scenario=0):
    page.evaluate('''({veteran, scenario}) => {
        window.__forge?.destroy();
        document.querySelector('#foundry-forge')?.remove();
        const host = document.createElement('div'); host.id = 'foundry-forge'; document.body.append(host);
        window.__forgeEvents = [];
        window.__forge = AetherStarforge.create(host, {veteran, scenario, onEnd(event) { window.__forgeEvents.push(event); }});
    }''', {'veteran': veteran, 'scenario': scenario})


def place_starforge_path(page, advanced):
    slots = {'mirror': 0, 'conductor': 2, 'furnace': 4, 'regulator': 6}
    if advanced:
        slots = {'mirror': 0, 'conductor': 2, 'splitter': 3, 'furnace': 4, 'capacitor': 5, 'regulator': 6, 'rail': 7}
    canvas = page.locator('#foundry-forge .starforge-canvas')
    box = canvas.bounding_box()
    for device, slot in slots.items():
        page.locator(f'#foundry-forge [data-star-tool="{device}"]').click()
        angle = slot * math.pi / 4 - math.pi / 2
        canvas.click(position={
            'x': box['width'] * (450 + 182 * math.cos(angle)) / 900,
            'y': box['height'] * (280 + 182 * math.sin(angle)) / 560,
        })
    assert page.evaluate('window.__forge.state.modules.length') == len(slots)


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')

            generation = page.evaluate('''() => {
                if (JSON.stringify(AetherDeepField.CAMPAIGN) !== JSON.stringify(['apprentice','navigator','eclipse'])) return 'standard campaign changed';
                for (const [id, preset] of Object.entries(AetherDeepField.PRESETS)) {
                    for (let seed = 1; seed <= 30; seed++) {
                        const safeIndex = Math.floor(preset.cols * preset.rows / 2);
                        const a = AetherDeepField.generate({...preset, seed, safeIndex});
                        const b = AetherDeepField.generate({...preset, seed, safeIndex});
                        if (JSON.stringify(a.grid) !== JSON.stringify(b.grid)) return `non-deterministic ${id}/${seed}`;
                        if (a.grid.filter(value => value === -1).length !== preset.mines) return `mine count ${id}/${seed}`;
                        if (a.grid[safeIndex] !== 0) return `unsafe opening ${id}/${seed}`;
                        if (AetherDeepField.neighbours(safeIndex, a.cols, a.rows).some(p => a.grid[p] < 0)) return `unsafe neighbour ${id}/${seed}`;
                        for (let p = 0; p < a.grid.length; p++) {
                            if (a.grid[p] < 0) continue;
                            const count = AetherDeepField.neighbours(p, a.cols, a.rows).filter(q => a.grid[q] === -1).length;
                            if (count !== a.grid[p]) return `adjacency ${id}/${seed}/${p}`;
                        }
                        if (AetherDeepField.flood(a.grid, a.cols, a.rows, safeIndex).some(entry => a.grid[entry.index] < 0)) return `flood ${id}/${seed}`;
                    }
                }
                return null;
            }''')
            assert generation is None, generation
            print('PASS: all chart classes retain deterministic generation, safe openings, adjacency and flood invariants')

            # The untouched campaign still has three charts, no veteran relic, and one completion callback.
            mount_deepfield(page)
            assert page.locator('#foundry-df .df-route > span').count() == 3
            for stage, safe_index in enumerate((40, 60, 96)):
                open_and_clear_deepfield(page, safe_index)
                if stage < 2:
                    page.locator('#foundry-df .df-intermission').wait_for(state='visible')
                    assert page.locator('#foundry-df [data-df-relic="stillpoint"]').count() == 0
                    continue_deepfield(page)
            page.wait_for_function('window.__dfEvents.length === 1')
            standard_end = page.evaluate('window.__dfEvents[0]')
            assert standard_end['won'] is True and standard_end['charts'] == 3
            page.evaluate('window.__df.destroy()')
            print('PASS: standard three-chart campaign and completion callback remain intact')

            # A saved veteran preset cannot leak into a standard endless expedition.
            page.evaluate('''localStorage.setItem('aether-deep-field-settings-v1', JSON.stringify({sound:false, preset:'meridian', zoom:1}))''')
            mount_deepfield(page, campaign=False, endless=True)
            assert page.evaluate('window.__df.snapshot().config.name') == 'Navigator'
            assert page.locator('#foundry-df [data-df-preset="meridian"]').count() == 0
            mount_deepfield(page, veteran=True, campaign=False, endless=True)
            assert page.evaluate('window.__df.snapshot().config.name') == 'Meridian'
            assert page.locator('#foundry-df .deepfield-grid').get_attribute('data-modifier') == 'limited-flags'
            page.evaluate('window.__df.destroy()')
            print('PASS: Meridian is veteran-only and malformed cross-variant settings fall back safely')

            # Draft Stillpoint, prove a false chord is cancelled, then choose and clear Meridian.
            mount_deepfield(page, veteran=True)
            assert page.locator('#foundry-df .df-route > span').count() == 4
            open_and_clear_deepfield(page, 40)
            page.locator('#foundry-df .df-intermission').wait_for(state='visible')
            page.locator('#foundry-df [data-df-relic="stillpoint"]').click()
            continue_deepfield(page)
            assert page.locator('#foundry-df .deepfield-grid').get_attribute('data-stillpoint') == 'true'
            page.locator('#foundry-df .deepfield-cell').nth(60).click()

            plan = page.evaluate('''() => {
                const game = window.__df, grid = game.snapshot().grid;
                const cells = [...document.querySelectorAll('#foundry-df .deepfield-cell')];
                const findPlan = () => {
                    for (let p = 0; p < grid.length; p++) {
                        if (!cells[p].classList.contains('revealed') || grid[p] <= 0) continue;
                        const around = AetherDeepField.neighbours(p, game.snapshot().config.cols, game.snapshot().config.rows);
                        const hiddenMines = around.filter(q => grid[q] === -1 && cells[q].dataset.state === 'hidden');
                        const hiddenSafe = around.filter(q => grid[q] >= 0 && cells[q].dataset.state === 'hidden');
                        if (hiddenMines.length && hiddenSafe.length) return {index:p, wrongSafe:hiddenSafe[0], mineFlags:hiddenMines.slice(0, grid[p] - 1), liveMine:hiddenMines[grid[p] - 1]};
                    }
                    return null;
                };
                let result = findPlan();
                for (let p = 0; p < grid.length && !result; p++) {
                    if (grid[p] >= 0 && cells[p].dataset.state === 'hidden') { cells[p].click(); result = findPlan(); }
                }
                return result;
            }''')
            assert plan is not None, 'no real false-chord fixture emerged on the seeded chart'
            before_chord = page.evaluate('window.__df.snapshot().revealed.length')
            page.evaluate('''plan => {
                for (const p of [plan.wrongSafe, ...plan.mineFlags]) {
                    document.querySelector(`#foundry-df .deepfield-cell[data-cell="${p}"]`).dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true}));
                }
                document.querySelector(`#foundry-df .deepfield-cell[data-cell="${plan.index}"]`).click();
            }''', plan)
            assert page.evaluate('window.__df.snapshot().revealed.length') == before_chord
            assert page.evaluate('window.__df.snapshot().stillpointReady') is False
            assert page.locator('#foundry-df .deepfield-grid').get_attribute('data-over') == 'false'
            assert 'Stillpoint Seal' in page.locator('#foundry-df [data-df-status]').inner_text()
            page.evaluate('''plan => {
                for (const p of [plan.wrongSafe, ...plan.mineFlags]) {
                    document.querySelector(`#foundry-df .deepfield-cell[data-cell="${p}"]`).dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true}));
                }
            }''', plan)
            clear_open_deepfield(page)
            continue_deepfield(page)
            assert page.locator('#foundry-df .deepfield-grid').get_attribute('data-stillpoint') == 'true'
            print('PASS: Stillpoint cancels a genuinely lethal false chord and recharges on the next chart')

            open_and_clear_deepfield(page, 96)
            page.locator('#foundry-df .df-intermission').wait_for(state='visible')
            assert page.locator('#foundry-df [data-df-route]').count() == 2
            assert page.locator('#foundry-df [data-df-relic]').count() == 0
            page.locator('#foundry-df [data-df-route="meridian"]').click()
            assert page.locator('#foundry-df [data-df-route="meridian"]').get_attribute('aria-pressed') == 'true'
            continue_deepfield(page)
            final = page.evaluate('window.__df.snapshot()')
            assert final['route'] == 'meridian' and final['config']['cols'] == 20 and final['config']['rows'] == 12
            assert final['config']['mines'] == 67 and final['config']['flagLimit'] == 12
            assert final['config']['scoreMultiplier'] == 1.35

            for index in range(13):
                page.locator('#foundry-df .deepfield-cell').nth(index).click(button='right')
            board = page.locator('#foundry-df .deepfield-grid')
            assert board.get_attribute('data-flags') == '12'
            assert page.locator('#foundry-df .deepfield-cell').nth(12).get_attribute('data-state') == 'hidden'
            page.locator('#foundry-df .deepfield-cell').nth(0).click(button='right')
            page.locator('#foundry-df .deepfield-cell').nth(12).click(button='right')
            assert board.get_attribute('data-flags') == '12'
            assert page.locator('#foundry-df .deepfield-cell').nth(12).get_attribute('data-state') == 'flagged'
            page.evaluate('''() => {
                document.querySelectorAll('#foundry-df .deepfield-cell').forEach(cell => {
                    for (let n = 0; n < 2 && cell.dataset.state !== 'hidden'; n++) cell.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true}));
                });
            }''')
            open_and_clear_deepfield(page, 120)
            page.wait_for_function('window.__dfEvents.length === 1')
            veteran_end = page.evaluate('window.__dfEvents[0]')
            assert veteran_end['won'] is True and veteran_end['charts'] == 4 and veteran_end['score'] > 0
            page.evaluate('window.__df.destroy()')
            assert page.locator('#foundry-df').inner_html() == ''
            print('PASS: final route choice, twelve-flag recall rule, Meridian clear and four-chart veteran recap')

            # Standard contract still completes directly and advances the original save.
            page.evaluate('''localStorage.setItem('aether-starforge-v1', JSON.stringify({completed:0,best:0}))''')
            mount_starforge(page)
            assert page.locator('#foundry-forge .starforge-scenarios button').count() == 6
            place_starforge_path(page, advanced=False)
            page.locator('#foundry-forge [data-starforge="run"]').click()
            page.wait_for_function('window.__forgeEvents.length === 1', timeout=20000)
            assert page.evaluate('window.__forgeEvents[0].won') is True
            assert page.evaluate('window.__forge.state.energy') == 3
            assert page.evaluate('JSON.parse(localStorage.getItem("aether-starforge-v1")).completed') == 1
            page.evaluate('window.__forge.destroy()')
            print('PASS: First Spark remains winnable, saves completion, and emits its standard callback')

            # The ninth contract requires banking and manual discharge, not just a new target.
            page.evaluate('''localStorage.setItem('aether-starforge-v1', JSON.stringify({completed:6,best:18}))''')
            mount_starforge(page, veteran=True, scenario=8)
            canvas = page.locator('#foundry-forge .starforge-canvas')
            assert page.locator('#foundry-forge .starforge-scenarios button').count() == 9
            assert canvas.get_attribute('data-mechanic') == 'capacitor-discharge'
            assert page.locator('#foundry-forge #starforge-energy').inner_text() == '0 / 25'
            assert page.locator('#foundry-forge #starforge-heat').inner_text() == '0 / 79'
            place_starforge_path(page, advanced=True)
            page.locator('#foundry-forge [data-starforge="run"]').click()
            page.wait_for_function('window.__forge.state.charge >= 6')
            assert page.evaluate('window.__forge.state.energy') == 0
            bank_before_early_vent = page.evaluate('window.__forge.state.charge')
            page.locator('#foundry-forge [data-starforge="vent"]').click()
            early_delivery = page.evaluate('window.__forge.state.energy')
            assert 0 < early_delivery < bank_before_early_vent
            assert page.evaluate('window.__forge.state.charge') == 0
            assert page.evaluate('window.__forge.state.vents') == 1

            # Reset and use the stronger strategy: two full banks released above 24 heat.
            page.locator('#foundry-forge [data-starforge="reset"]').click()
            place_starforge_path(page, advanced=True)
            page.locator('#foundry-forge [data-starforge="run"]').click()
            page.wait_for_function('window.__forge.state.heat >= 24.5 && window.__forge.state.charge > 0')
            assert 'VENT FOR FULL DELIVERY' in page.locator('#foundry-forge #starforge-guide-title').inner_text()
            page.locator('#foundry-forge [data-starforge="vent"]').click()
            assert page.evaluate('window.__forge.state.discharges') == 1
            assert page.evaluate('window.__forge.state.ended') is False
            page.wait_for_function('window.__forge.state.heat >= 24.5 && window.__forge.state.charge > 0')
            page.locator('#foundry-forge [data-starforge="vent"]').click()
            assert page.evaluate('window.__forge.state.ended') is True
            assert page.evaluate('window.__forge.state.energy >= 25')
            assert page.evaluate('window.__forge.state.discharges') == 2
            page.wait_for_function('window.__forgeEvents.length === 1', timeout=3000)
            assert page.evaluate('window.__forgeEvents[0].won') is True
            saved = page.evaluate('JSON.parse(localStorage.getItem("aether-starforge-v1"))')
            assert saved['completed'] == 6 and saved['best'] >= 25
            page.evaluate('window.__forge.destroy()')
            print('PASS: early vent halves yield; two primed discharges win Ember Covenant without changing standard unlocks')

            # Ignition alone cannot complete the contract, and destroy suppresses its delayed loss callback.
            mount_starforge(page, veteran=True, scenario=8)
            place_starforge_path(page, advanced=True)
            page.clock.install()
            page.locator('#foundry-forge [data-starforge="run"]').click()
            for _ in range(140):
                page.clock.run_for(500)
                if page.evaluate('window.__forge.state.ended'):
                    break
            assert page.evaluate('window.__forge.state.ended') is True
            assert page.evaluate('window.__forge.state.energy') == 0
            assert page.evaluate('window.__forge.state.charge > 0')
            page.evaluate('window.__forge.destroy()')
            page.clock.run_for(1000)
            assert page.evaluate('window.__forgeEvents.length') == 0
            assert page.locator('#foundry-forge').inner_html() == ''
            print('PASS: unvented pressure fails honestly; teardown cancels the pending callback and empties the stage')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Foundry expansion browser regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
