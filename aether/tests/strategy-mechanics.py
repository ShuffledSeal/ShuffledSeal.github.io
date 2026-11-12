"""Veteran strategy mechanics and unchanged-standard Playwright regression.

Run from the cartridge directory: python3 tests/strategy-mechanics.py
All gameplay is driven through the shipped controls; no debug state is mutated.
"""
import http.server
import json
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


def mount(page, kind, options):
    page.evaluate('''({kind, options}) => {
        window.__strategy?.destroy();
        document.querySelector('#strategy-game')?.remove();
        const host = document.createElement('div'); host.id = 'strategy-game';
        host.style.cssText = 'position:relative;z-index:1000';
        document.body.append(host); window.__strategyEnds = [];
        const onEnd = event => window.__strategyEnds.push(event);
        if (kind === 'deepfield') window.__strategy = AetherDeepField.create(host, {...options, sound:false, onEnd});
        else if (kind === 'starforge') window.__strategy = AetherStarforge.create(host, {...options, onEnd});
        else window.__strategy = AetherTrials.create(kind, host, {...options, sound:false, onEnd});
    }''', {'kind': kind, 'options': options})


def destroy(page):
    page.evaluate('window.__strategy.destroy()')
    page.clock.run_for(2200)
    assert page.evaluate('window.__strategyEnds') == [], 'destroy must suppress pending end callbacks'
    assert page.locator('#strategy-game').inner_html() == ''


def canvas(page):
    return page.locator('#strategy-game canvas')


def until_attr(page, locator, attribute, predicate, budget=30000, step=150):
    value = None
    for _ in range((budget // step) + 1):
        value = locator.get_attribute(attribute)
        if value is not None and predicate(value):
            return value
        page.clock.run_for(step)
    raise AssertionError(f'{attribute} did not satisfy predicate; last value: {value!r}')


def until_state(page, predicate, budget=20000, step=100):
    value = None
    for _ in range((budget // step) + 1):
        value = page.evaluate('window.__strategy.state')
        if predicate(value):
            return value
        page.clock.run_for(step)
    raise AssertionError(f'Starforge state did not satisfy predicate: {value!r}')


def objects(locator, attribute):
    return json.loads(locator.get_attribute(attribute) or '[]')


def build(page, board, tower, row, col):
    box = board.bounding_box()
    board.press(str(tower))
    board.click(position={
        'x': box['width'] * (180 + 92 * col) / 900,
        'y': box['height'] * (151 + 68 * row) / 560,
    })
    page.clock.run_for(180)


def hold(page, key, milliseconds):
    page.keyboard.down(key)
    try:
        page.clock.run_for(milliseconds)
    finally:
        page.keyboard.up(key)
    page.clock.run_for(40)


def place_forge_path(page, advanced=False):
    slots = {'mirror': 0, 'conductor': 2, 'furnace': 4, 'regulator': 6}
    if advanced:
        slots = {'mirror': 0, 'conductor': 2, 'splitter': 3, 'furnace': 4, 'capacitor': 5, 'regulator': 6, 'rail': 7}
    board = canvas(page)
    box = board.bounding_box()
    for device, slot in slots.items():
        page.locator(f'#strategy-game [data-star-tool="{device}"]').click()
        angle = slot * math.pi / 4 - math.pi / 2
        board.click(position={
            'x': box['width'] * (450 + 182 * math.cos(angle)) / 900,
            'y': box['height'] * (280 + 182 * math.sin(angle)) / 560,
        })
    assert page.evaluate('window.__strategy.state.modules.length') == len(slots)


def clear_df(page):
    grid = page.evaluate('window.__strategy.snapshot().grid')
    page.evaluate('''grid => {
        document.querySelectorAll('#strategy-game .deepfield-cell').forEach((cell, index) => {
            if (grid[index] >= 0 && cell.dataset.state !== 'revealed') cell.click();
        });
    }''', grid)


def continue_df(page):
    page.clock.run_for(140)
    page.locator('#strategy-game .df-intermission').wait_for(state='visible')
    page.locator('#strategy-game [data-df-action="continue"]').click()
    page.locator('#strategy-game .df-intermission').wait_for(state='detached')


def visible_proof(page, kind):
    """Open real safe cells until the visible-clue engine has the requested proof."""
    for _ in range(100):
        result = page.evaluate('''kind => {
            const game = window.__strategy, state = game.snapshot();
            if (!state.grid || document.querySelector('#strategy-game .deepfield-grid').dataset.over === 'true') return {done:true};
            const clues = {};
            for (const p of state.revealed) if (state.grid[p] > 0) clues[p] = state.grid[p];
            const proof = AetherDeepField.deduce({cols:state.config.cols, rows:state.config.rows,
                revealed:state.revealed, flagged:state.flagged, clues})[kind][0];
            if (proof) return {proof, value:state.grid[proof.index], hints:state.hintsLeft};
            const next = state.grid.findIndex((value, p) => value >= 0 && !state.revealed.includes(p) && !state.flagged.includes(p));
            if (next < 0) return {done:true};
            document.querySelector(`#strategy-game .deepfield-cell[data-cell="${next}"]`).click();
            return null;
        }''', kind)
        if result:
            assert not result.get('done'), f'no {kind} proof emerged before chart completion'
            return result
    raise AssertionError(f'no {kind} proof emerged within 100 safe reveals')


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'{base}/index.html#overview', wait_until='networkidle')
            page.clock.install()

            # Standard Bastion is untouched; Bulwark fields really absorb Needle
            # damage and a real pulse shatters the same live field.
            mount(page, 'bastion', {'seed': 6024})
            page.clock.run_for(300)
            board = canvas(page)
            assert board.get_attribute('data-wave-count') == '6'
            assert page.locator('#strategy-game [data-bastion-loadout]').count() == 4
            assert 'bulwark' not in page.locator('[data-bastion-manifest]').inner_text()
            destroy(page)

            mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
            page.clock.run_for(300)
            board = canvas(page)
            assert '1 bulwark' in page.locator('[data-bastion-manifest]').inner_text()
            build(page, board, 1, 2, 0)
            board.press('r')
            board.press('c')
            until_attr(page, board, 'data-bulwarks', lambda value: len(json.loads(value or '[]')) > 0, budget=10000)
            full_hp = next(e['hp'] for e in objects(board, 'data-threats') if e['kind'] == 'bulwark')
            partial = json.loads(until_attr(page, board, 'data-bulwarks',
                lambda value: any(0 < field['barrier'] < 120 for field in json.loads(value or '[]'))))[0]
            assert partial['barrier'] < 120
            blocked_hp = next(e['hp'] for e in objects(board, 'data-threats') if e['kind'] == 'bulwark')
            assert blocked_hp == full_hp, 'Needle damage must hit the field before the hull'
            destroy(page)

            mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
            page.clock.run_for(300)
            board = canvas(page)
            board.press('c')
            until_attr(page, board, 'data-bulwarks', lambda value: len(json.loads(value or '[]')) > 0, budget=10000)
            assert objects(board, 'data-bulwarks')[0]['barrier'] == 120
            board.press(' ')
            page.clock.run_for(180)
            assert board.get_attribute('data-bulwark-breaks') == '1'
            assert objects(board, 'data-bulwarks')[0]['barrier'] == 0
            destroy(page)
            print('PASS: standard Bastion unchanged; Bulwark absorbs Needles and pulse shatters its field')

            # A forward snare Ward targets a live sapper fuse, spends recharge,
            # and cannot also ground the shutdown like a shelter Ward.
            mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
            page.clock.run_for(300)
            board = canvas(page)
            build(page, board, 5, 1, 6)
            board.press('r')
            page.clock.run_for(180)
            assert objects(board, 'data-wards')[0]['mode'] == 'snare'
            board.press('c')
            until_attr(page, board, 'data-ward-snares', lambda value: int(value) >= 1, budget=14000)
            assert objects(board, 'data-disabled-towers') == []
            ward = objects(board, 'data-wards')[0]
            assert ward['mode'] == 'snare' and ward['cooldown'] > 0
            assert board.get_attribute('data-ward-blocks') == '0'
            destroy(page)
            print('PASS: forward Ward snare breaks a real fuse, spends recharge and gives up shelter')

            # Standard patrol logic stays in place. Veteran sound reactions use
            # navigable paths, investigate/search/return, and chase real sightings.
            mount(page, 'labyrinth', {'seed': 981})
            page.clock.run_for(1600)
            board = canvas(page)
            layout = json.loads(board.get_attribute('data-layout'))
            assert layout['keys'] == [[3, 2], [10, 7]] and layout['patrol'][0] == [3, 4, 1, 8, 'v']
            assert all(g['state'] == 'patrol' for g in objects(board, 'data-guard-states'))
            board.press('g')
            assert board.get_attribute('data-scanner-cooldown') == '0.00'
            destroy(page)

            mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 4})
            page.clock.run_for(1600)
            board = canvas(page)
            before = objects(board, 'data-patrol-states')
            board.press('f')
            page.clock.run_for(180)
            assert any(g['state'] == 'investigate' for g in objects(board, 'data-guard-states'))
            until_attr(page, board, 'data-guard-states',
                lambda value: any(g['state'] == 'search' for g in json.loads(value or '[]')), budget=6000)
            after = objects(board, 'data-patrol-states')
            assert after != before
            walls = json.loads(board.get_attribute('data-layout'))['walls']
            for x, y in after:
                cell_x, cell_y = math.floor((x - 108) / 38), math.floor((y - 79) / 38)
                assert not walls[cell_y][cell_x], 'investigation path entered a wall'
            until_attr(page, board, 'data-guard-states',
                lambda value: any(g['state'] in ('return', 'patrol') for g in json.loads(value or '[]')), budget=6000)
            destroy(page)

            mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 4})
            page.clock.run_for(1600)
            board = canvas(page)
            board.press('g')
            page.clock.run_for(180)
            assert float(board.get_attribute('data-scanner-jam')) > 3
            assert any(g['state'] == 'investigate' for g in objects(board, 'data-guard-states'))
            destroy(page)

            mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 0})
            page.clock.run_for(1600)
            board = canvas(page)
            hold(page, 'd', 330)
            page.keyboard.down('s')
            try:
                until_attr(page, board, 'data-guard-states',
                    lambda value: any(g['state'] == 'chase' and g['sees'] for g in json.loads(value or '[]')), budget=1800, step=80)
            finally:
                page.keyboard.up('s')
            destroy(page)
            print('PASS: standard patrols unchanged; veteran decoys/jam noise investigate and sightings chase')

            # Pure deduction fixtures cover basic and subset logic. Browser tools
            # then apply actual proofs and spend exactly one Oracle charge each.
            deduction = page.evaluate('''() => {
                const basic = AetherDeepField.deduce({cols:3, rows:2, revealed:[0], flagged:[1], clues:{0:1}});
                const subset = AetherDeepField.deduce({cols:4, rows:3, revealed:[0,1], flagged:[], clues:{0:1,1:3}});
                return {basic:basic.safe.map(p=>p.index), mines:subset.mines.map(p=>p.index)};
            }''')
            assert deduction == {'basic': [3, 4], 'mines': [2, 6]}

            mount(page, 'deepfield', {'seed': 24680, 'veteran': True})
            assert page.locator('#strategy-game [data-df-action="proof-safe"]').count() == 1
            page.locator('#strategy-game .deepfield-cell').nth(40).click()
            safe = visible_proof(page, 'safe')
            assert safe['value'] >= 0 and safe['hints'] == 2
            page.locator('#strategy-game [data-df-action="proof-safe"]').click()
            assert page.evaluate('window.__strategy.snapshot().hintsLeft') == 1
            assert page.evaluate('window.__strategy.snapshot().proofsUsed') == 1
            assert page.locator('#strategy-game .deepfield-cell').nth(safe['proof']['index']).get_attribute('data-state') == 'revealed'
            mine = visible_proof(page, 'mines')
            assert mine['value'] == -1 and mine['hints'] == 1
            page.locator('#strategy-game .deepfield-cell').nth(0).focus()
            page.keyboard.press('v')
            assert page.evaluate('window.__strategy.snapshot().hintsLeft') == 0
            assert page.evaluate('window.__strategy.snapshot().proofsUsed') == 2
            assert page.locator('#strategy-game .deepfield-cell').nth(mine['proof']['index']).get_attribute('data-state') == 'flagged'
            assert page.locator('#strategy-game [data-df-action="proof-safe"]').is_disabled()
            destroy(page)

            mount(page, 'deepfield', {'seed': 24680})
            assert page.locator('#strategy-game [data-df-action="proof-safe"]').count() == 0
            assert page.evaluate('JSON.stringify(AetherDeepField.CAMPAIGN)') == '["apprentice","navigator","eclipse"]'
            destroy(page)
            print('PASS: no-peek basic/subset proofs, real safe/mine tools and Oracle-charge tradeoff')

            # Carry Mercator's Lens into Meridian: a proof flag is an instrument
            # mark and therefore works after all twelve hand flags are placed.
            mount(page, 'deepfield', {'seed': 24680, 'veteran': True, 'campaign': True})
            for stage, opening in enumerate((40, 60, 96)):
                page.locator('#strategy-game .deepfield-cell').nth(opening).click()
                clear_df(page)
                page.clock.run_for(140)
                page.locator('#strategy-game .df-intermission').wait_for(state='visible')
                if stage == 0:
                    page.locator('#strategy-game [data-df-relic="lens"]').click()
                if stage == 2:
                    page.locator('#strategy-game [data-df-route="meridian"]').click()
                continue_df(page)
            state = page.evaluate('window.__strategy.snapshot()')
            assert state['route'] == 'meridian' and state['hintsLeft'] == 1 and state['config']['flagLimit'] == 12
            for index in range(12):
                page.locator('#strategy-game .deepfield-cell').nth(index).click(button='right')
            assert page.locator('#strategy-game .deepfield-grid').get_attribute('data-flags') == '12'
            page.locator('#strategy-game .deepfield-cell').nth(120).click()
            meridian_proof = visible_proof(page, 'mines')
            page.locator('#strategy-game [data-df-action="proof-mine"]').click()
            final = page.evaluate('window.__strategy.snapshot()')
            assert final['config']['flagLimit'] == 12 and len(final['flagged']) == 13
            assert final['proofMarks'] == [meridian_proof['proof']['index']]
            destroy(page)
            print('PASS: Meridian proof flag bypasses only the hand-flag cap after Lens drafting')

            # Standard Starforge keeps direct flow and its original save. Veteran
            # cooling holds output, then Ember shunts a finite banked unit.
            page.evaluate('localStorage.setItem("aether-starforge-v1", JSON.stringify({completed:0,best:0}))')
            mount(page, 'starforge', {'scenario': 0})
            assert page.locator('#strategy-game [data-starforge="route"]').count() == 0
            assert canvas(page).get_attribute('data-route') == 'standard'
            place_forge_path(page)
            page.locator('#strategy-game [data-starforge="run"]').click()
            until_state(page, lambda state: state['ended'])
            page.clock.run_for(1000)
            assert page.evaluate('window.__strategyEnds.length') == 1
            assert page.evaluate('window.__strategyEnds[0].won') is True
            assert page.evaluate('JSON.parse(localStorage.getItem("aether-starforge-v1")).completed') == 1
            page.evaluate('window.__strategy.destroy()')

            page.evaluate('localStorage.setItem("aether-starforge-v1", JSON.stringify({completed:6,best:18}))')
            mount(page, 'starforge', {'scenario': 0, 'veteran': True})
            place_forge_path(page)
            canvas(page).focus()
            canvas(page).press('d')
            assert page.evaluate('window.__strategy.state.route') == 'cooling'
            page.locator('#strategy-game [data-starforge="run"]').click()
            cooled = until_state(page, lambda state: state['divertedPulses'] >= 1, budget=3000)
            assert cooled['energy'] == 0 and cooled['remaining'] < 38
            assert cooled['heat'] == 0, 'cooling bus must not add furnace heat'
            page.locator('#strategy-game [data-starforge="route"]').click()
            assert page.evaluate('window.__strategy.state.route') == 'forge'
            page.evaluate('window.__strategy.destroy()')

            mount(page, 'starforge', {'scenario': 8, 'veteran': True})
            place_forge_path(page, advanced=True)
            page.locator('#strategy-game [data-starforge="run"]').click()
            banked = until_state(page, lambda state: state['charge'] >= 6)
            page.locator('#strategy-game [data-starforge="route"]').click()
            shunted = until_state(page, lambda state: state['shuntedCharge'] >= 1, budget=12000)
            assert shunted['energy'] == 0 and shunted['charge'] == banked['charge'] - 1
            assert shunted['divertedPulses'] >= 5 and shunted['remaining'] < banked['remaining']
            assert shunted['vents'] == 2
            page.locator('#strategy-game [data-starforge="route"]').click()
            until_state(page, lambda state: state['charge'] > shunted['charge'], budget=3000)
            destroy(page)
            assert page.evaluate('JSON.parse(localStorage.getItem("aether-starforge-v1")).completed') == 6
            print('PASS: standard direct flow/save unchanged; cooling bus holds output and shunts Ember charge')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Strategy mechanics browser regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
