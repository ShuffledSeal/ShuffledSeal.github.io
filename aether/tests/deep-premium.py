"""Deep Veteran Bastion/Labyrinth mechanics, completion, lifecycle and phone HUD.

Run from the cartridge directory with developer-only Python Playwright:
    python3 tests/deep-premium.py
Optional focused iteration: DEEP_PREMIUM_ONLY=meridian python3 tests/deep-premium.py

Every gameplay action uses shipped keyboard, pointer or touch controls. Mount options
only choose the existing seeded Veteran encounters; no live state is mutated.
Phone captures are written to /tmp/opencode/deep-premium-*.png.
"""
import heapq
import http.server
import json
import math
import os
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CAPTURES = Path('/tmp/opencode')
CAPTURES.mkdir(parents=True, exist_ok=True)
ONLY = os.environ.get('DEEP_PREMIUM_ONLY', '')


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def mount(page, cartridge, options):
    page.evaluate('''({cartridge, options}) => {
        window.__deepTrial?.destroy();
        document.querySelector('#deep-premium')?.remove();
        const host = document.createElement('div');
        host.id = 'deep-premium';
        host.style.cssText = 'position:relative;z-index:1000;width:min(100%,900px)';
        document.body.append(host);
        window.__deepEnds = [];
        window.__deepTrial = AetherTrials.create(cartridge, host, {
            ...options, sound: false, verbs: new Set(options.verbs || []),
            onEnd: result => window.__deepEnds.push(result),
        });
    }''', {'cartridge': cartridge, 'options': options})
    return page.locator('#deep-premium canvas')


def destroy(page):
    page.evaluate('window.__deepTrial.destroy()')
    assert page.locator('#deep-premium canvas, #deep-premium button, #deep-premium [data-mobile-hud]').count() == 0
    page.clock.run_for(2200)
    assert page.evaluate('window.__deepEnds') == [], 'destroy must suppress later onEnd callbacks'


def until(page, canvas, attribute, predicate, budget=30000, step=150):
    elapsed, value = 0, None
    while elapsed <= budget:
        value = canvas.get_attribute(attribute)
        if value is not None and predicate(value):
            return value
        page.clock.run_for(step)
        elapsed += step
    raise AssertionError(f'{attribute} did not satisfy check within {budget}ms; last={value!r}')


def objects(canvas, attribute):
    return json.loads(canvas.get_attribute(attribute) or '[]')


def build(page, canvas, tower, row, col):
    box = canvas.bounding_box()
    canvas.press(str(tower))
    canvas.click(position={'x': box['width'] * (180 + 92 * col) / 900,
                           'y': box['height'] * (151 + 68 * row) / 560})
    page.clock.run_for(100)


def select_tower(page, canvas, row, col):
    box = canvas.bounding_box()
    canvas.click(position={'x': box['width'] * (180 + 92 * col) / 900,
                           'y': box['height'] * (151 + 68 * row) / 560})
    page.clock.run_for(80)


def hold(page, key, milliseconds, settle=25):
    page.keyboard.down(key)
    try:
        page.clock.run_for(milliseconds)
    finally:
        page.keyboard.up(key)
    page.clock.run_for(settle)


def ready(canvas):
    until(page_global, canvas, 'data-room-transition', lambda value: float(value) == 0, budget=4000)


# ready() is only a concise fixture helper; this is set for the active browser page.
page_global = None
ROUTE_TRACE = []


def lab_controls(page):
    return page.evaluate('''() => {
        const ends = window.__deepEnds;
        const canvas = document.querySelector('#deep-premium canvas');
        const enabled = action => {
            const button = document.querySelector(`#deep-premium [data-labyrinth-action="${action}"]`);
            return Boolean(button && !button.disabled);
        };
        return {ends, missing: !canvas, veil: enabled('veil'), decoy: enabled('decoy'),
            jammer: enabled('jammer'), dash: enabled('dash')};
    }''')


def accept_lab_terminal(page, context):
    results = page.evaluate('window.__deepEnds')
    if results and results[-1]['won']:
        return True
    raise AssertionError(f'{context}: terminal={results}; trace={ROUTE_TRACE[-6:]}')


def test_standard_and_actives(page):
    canvas = mount(page, 'bastion', {'seed': 6024})
    page.clock.run_for(300)
    assert canvas.get_attribute('data-wave-count') == '6'
    assert page.locator('#deep-premium [data-bastion-loadout]').count() == 4
    assert page.locator('#deep-premium [data-bastion-action="active"]').count() == 0
    assert page.locator('#deep-premium [data-bastion-action="lane"]').count() == 0
    assert page.locator('#deep-premium [data-mobile-hud="bastion"]').get_attribute('data-active') == 'false'
    destroy(page)

    # Needle verdict plus Frostbell chill produces a real shatter, not a stat-only upgrade.
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    build(page, canvas, 1, 1, 0)
    build(page, canvas, 2, 1, 2)
    select_tower(page, canvas, 1, 0)
    canvas.press('c')
    until(page, canvas, 'data-threats', lambda value: any(e['lane'] == 2 and e['x'] < 450 for e in json.loads(value)))
    for _ in range(30):
        if int(canvas.get_attribute('data-active-uses')) >= 1:
            break
        select_tower(page, canvas, 1, 0)
        canvas.press('v')
        page.clock.run_for(100)
    assert int(canvas.get_attribute('data-active-uses')) >= 1
    assert float(canvas.get_attribute('data-selected-active-cooldown')) > 9
    until(page, canvas, 'data-shatters', lambda value: int(value) > 0, budget=25000)
    destroy(page)
    print('PASS: standard Bastion untouched; Silver Verdict active and chill/Needle shatter')

    # Needle marks are consumed by Prism damage. The early active is used while
    # the armoured target still has hull, so this checks the combo explicitly.
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    build(page, canvas, 3, 2, 0)
    build(page, canvas, 1, 2, 2)
    canvas.press('c')
    until(page, canvas, 'data-threats', lambda value: any(e['lane'] == 3 and e['x'] < 635 for e in json.loads(value)))
    canvas.press('v')
    page.clock.run_for(250)
    assert any(e.get('marked') for e in objects(canvas, 'data-threats')), objects(canvas, 'data-threats')
    until(page, canvas, 'data-mark-combos', lambda value: int(value) > 0, budget=10000)
    destroy(page)
    print('PASS: Needle mark and Prism execute a cross-tower combo')

    # A shelter Ward between Prism and target refracts into adjacent lanes;
    # the active is activated through its actual DOM button.
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    build(page, canvas, 3, 2, 0)
    build(page, canvas, 5, 2, 1)
    select_tower(page, canvas, 2, 0)
    canvas.press('c')
    until(page, canvas, 'data-threats', lambda value: any(e['lane'] == 3 and e['x'] < 635 for e in json.loads(value)))
    page.locator('#deep-premium [data-bastion-action="active"]').click()
    page.clock.run_for(180)
    assert int(canvas.get_attribute('data-active-uses')) == 1
    until(page, canvas, 'data-refractions', lambda value: int(value) > 0, budget=8000)
    destroy(page)
    print('PASS: pointer-active Prism and Ward geometry refract into adjacent lanes')

    # Winter Office exposes and interrupts a whole firing line.
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    build(page, canvas, 2, 1, 2)
    canvas.press('c')
    until(page, canvas, 'data-threats', lambda value: any(e['lane'] == 2 and e['x'] < 565 for e in json.loads(value)))
    canvas.press('v')
    page.clock.run_for(150)
    assert int(canvas.get_attribute('data-active-uses')) == 1
    assert any(e['slow'] and e.get('exposed') for e in objects(canvas, 'data-threats'))
    destroy(page)
    print('PASS: Winter Office chills and exposes live targets')

    # Remote Litany has a wider manual timing window than the automatic mine.
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    build(page, canvas, 4, 1, 5)
    canvas.press('c')
    until(page, canvas, 'data-threats', lambda value: any(e['lane'] == 2 and 710 < e['x'] < 742 for e in json.loads(value)), step=50)
    canvas.press('v')
    page.clock.run_for(150)
    assert canvas.get_attribute('data-manual-detonations') == '1'
    assert canvas.get_attribute('data-tower-count') == '0'
    destroy(page)
    print('PASS: Sunmine remote detonation rewards manual timing')

    # Sanctuary cleanses an actual sapper shutdown and leaves a timed shield.
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    build(page, canvas, 1, 1, 2)
    build(page, canvas, 5, 1, 1)
    canvas.press('r')  # snare cannot shelter the Needle; the sapper is out of snare range
    canvas.press('c')
    until(page, canvas, 'data-disabled-towers', lambda value: len(json.loads(value)) > 0, budget=30000)
    select_tower(page, canvas, 1, 1)
    canvas.press('v')
    page.clock.run_for(150)
    assert objects(canvas, 'data-disabled-towers') == []
    assert canvas.get_attribute('data-sanctuaries') == '1'
    assert any(q['type'] == 'Needle' and q['remaining'] > 8 for q in objects(canvas, 'data-shielded-towers'))
    destroy(page)

    # A second run casts before the fuse completes: the shield, not Ward recharge,
    # absorbs the shutdown.
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    build(page, canvas, 1, 1, 2)
    build(page, canvas, 5, 1, 1)
    canvas.press('c')
    until(page, canvas, 'data-sapper-channels', lambda value: any(c['progress'] > .4 for c in json.loads(value)), budget=30000)
    select_tower(page, canvas, 1, 1)
    canvas.press('v')
    until(page, canvas, 'data-sanctuary-blocks', lambda value: int(value) >= 1, budget=8000)
    assert objects(canvas, 'data-disabled-towers') == []
    destroy(page)
    print('PASS: Sanctuary cleanses shutdowns and absorbs a later sabotage')


def test_lane_and_pause(page):
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    before = int(canvas.get_attribute('data-alloy'))
    canvas.press('b')
    page.clock.run_for(150)
    assert json.loads(canvas.get_attribute('data-lane-routes'))[1] == -1
    assert int(canvas.get_attribute('data-alloy')) == before - 12
    canvas.press('c')
    until(page, canvas, 'data-reroutes', lambda value: int(value) > 0, budget=25000)
    assert any(e['lane'] == 1 for e in objects(canvas, 'data-threats'))
    canvas.press('p')
    frozen = canvas.get_attribute('data-wave-time')
    canvas.press('v')
    canvas.press('b')
    canvas.press(' ')
    page.clock.run_for(500)
    assert canvas.get_attribute('data-wave-time') == frozen
    assert canvas.get_attribute('data-paused') == 'true'
    canvas.press('p')
    page.clock.run_for(200)
    assert float(canvas.get_attribute('data-wave-time')) > float(frozen)
    destroy(page)
    print('PASS: brass crossings divert real hulls; pause blocks actives and teardown is clean')


def turn_lane(page, canvas, row, times=1):
    for _ in range(times):
        snapshot = warden_snapshot(page)
        if snapshot['ends'] or snapshot['missing']:
            return
        box = canvas.bounding_box()
        canvas.click(position={'x': box['width'] * 520 / 900, 'y': box['height'] * (151 + 68 * row + 26) / 560})
        page.clock.run_for(90)


def test_cantor_siege(page):
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 6})
    page.clock.run_for(250)
    build(page, canvas, 1, 1, 1)
    build(page, canvas, 1, 1, 3)
    turn_lane(page, canvas, 0, 2)
    turn_lane(page, canvas, 2, 1)
    turn_lane(page, canvas, 4, 1)
    canvas.press('c')
    page.clock.run_for(300)
    plans = {
        1: [(1, 3, 2), (2, 1, 0)],
        2: [(3, 1, 2), (3, 3, 0), (1, 4, 2)],
        3: [(3, 3, 3), (3, 2, 3), (2, 2, 2)],
    }
    built, repair, haste = set(), 0, False
    verdict_used = False
    last = {}
    for _ in range(480):
        if canvas.count() == 0 or canvas.get_attribute('data-planning') == 'true':
            break
        stage = int(canvas.get_attribute('data-siege-stage') or 1)
        last = {'stage': stage, 'core': canvas.get_attribute('data-core'), 'alloy': canvas.get_attribute('data-alloy'), 'leaks': canvas.get_attribute('data-leaks'), 'towers': canvas.get_attribute('data-tower-count'), 'repair': repair, 'haste': haste}
        for tower, row, col in plans.get(stage, []):
            cost = {1: 45, 2: 65, 3: 90, 4: 55}[tower]
            if (tower, row, col) not in built and int(canvas.get_attribute('data-alloy')) >= cost:
                build(page, canvas, tower, row, col)
                built.add((tower, row, col))
        if stage == 3 and not verdict_used and any(b['lane'] == 5 and 510 < b['x'] < 620 for b in objects(canvas, 'data-bulwarks')) and objects(canvas, 'data-cantors'):
            select_tower(page, canvas, 4, 2)
            canvas.press('r')
            canvas.press('v')
            page.clock.run_for(2200)
            canvas.press('r')
            verdict_used = True
        repair = max(repair, float(canvas.get_attribute('data-cantor-repair-amount') or 0))
        haste = haste or any(e.get('haste', 1) > 1 for e in objects(canvas, 'data-threats'))
        page.clock.run_for(250)
    assert canvas.count() and canvas.get_attribute('data-wave') == '8', {'ends': page.evaluate('window.__deepEnds'), 'last': last, 'built': sorted(built)}
    assert canvas.get_attribute('data-planning') == 'true'
    assert canvas.get_attribute('data-siege-stage') == '1', 'next siege planning must reset to office I'
    assert canvas.get_attribute('data-stage-clears') == '3'
    assert repair > 0 and haste, {'repair': repair, 'haste': haste}
    destroy(page)
    print('PASS: Copper Eclipse three offices, Cantor haste/field repair and next-planning reset')


def warden_snapshot(page):
    """Atomically capture outcome + live data; never wait on a removed canvas."""
    return page.evaluate('''() => {
        const ends = window.__deepEnds;
        const canvas = document.querySelector('#deep-premium canvas');
        if (!canvas) return {ends, missing: true};
        const d = canvas.dataset;
        const enabled = action => {
            const button = document.querySelector(`#deep-premium [data-bastion-action="${action}"]`);
            return Boolean(button && !button.disabled);
        };
        return {ends, missing: false, values: {
            stage: d.siegeStage, core: d.core, alloy: d.alloy, leaks: d.leaks,
            bossState: d.bossState || '', towerCount: d.towerCount,
            threats: d.threats || '[]', disabled: d.disabledTowers || '[]',
            routes: d.laneRoutes || '[]', interrupts: d.bossInterrupts,
            rituals: d.bossRituals, activeUses: d.activeUses,
            activeCooldown: d.selectedActiveCooldown, pulse: d.pulseCooldown,
            cantors: d.cantors || '[]', bossShifts: d.bossShifts,
            sapperChannels: d.sapperChannels || '[]', selectedType: d.selectedType || '',
            activeEnabled: enabled('active'), pulseEnabled: enabled('pulse'),
        }};
    }''')


def test_warden_completion(page):
    canvas = mount(page, 'bastion', {'seed': 6024, 'veteran': True, 'startWave': 7})
    page.clock.run_for(250)
    # Funnel the outside and centre processions into lanes 2 and 4. This is
    # cheaper than thin static coverage and exercises the brass-route economy.
    build(page, canvas, 1, 3, 1)
    build(page, canvas, 1, 3, 3)
    turn_lane(page, canvas, 0, 2)  # lane 1 down into defended lane 2
    turn_lane(page, canvas, 2, 1)  # lane 3 up into defended lane 2
    turn_lane(page, canvas, 4, 1)  # lane 5 up into lane 4
    page.clock.run_for(200)
    assert int(canvas.get_attribute('data-alloy')) == 37
    canvas.press('c')
    stage_builds = {
        1: [(1, 1, 2), (2, 1, 0), (1, 1, 3)],
        2: [(3, 1, 1), (3, 3, 0), (4, 1, 5)],
        3: [(1, 2, 1), (3, 0, 0), (3, 2, 3), (2, 2, 2)],
    }
    built, refined = set(), set()
    restored_central = False
    normalized_for_boss = False
    boss_seen = False
    cantor_seen = cantor_haste = False
    boss_shifts = max_boss_phase = boss_interrupts = active_uses = 0
    trace, last_trace, last_state = [], None, None
    terminal, missing_without_outcome = None, False
    for elapsed in range(0, 180000, 250):
        snapshot = warden_snapshot(page)
        if snapshot['ends']:
            terminal = snapshot['ends']
            break
        if snapshot['missing']:
            missing_without_outcome = True
            break
        values = snapshot['values']
        stage = int(values['stage'] or 1)
        last_state = {'elapsed': elapsed, 'stage': stage, 'core': values['core'], 'alloy': values['alloy'], 'leaks': values['leaks'], 'boss': values['bossState'], 'towers': values['towerCount'], 'threats': values['threats'], 'disabled': values['disabled'], 'routes': values['routes'], 'interrupts': values['interrupts'], 'rituals': values['rituals'], 'activeUses': values['activeUses'], 'activeCooldown': values['activeCooldown'], 'pulse': values['pulse']}
        marker = (stage, last_state['core'])
        if marker != last_trace:
            trace.append(last_state.copy());last_trace = marker
        if stage == 3 and not restored_central and int(canvas.get_attribute('data-alloy')) >= 24:
            turn_lane(page, canvas, 2, 2)  # −1 → +1 → straight for the Warden
            restored_central = True
        for tower, row, col in stage_builds.get(stage, []):
            snapshot = warden_snapshot(page)
            if snapshot['ends']:
                terminal = snapshot['ends']
                break
            if snapshot['missing']:
                missing_without_outcome = True
                break
            key = (tower, row, col)
            cost = {1: 45, 2: 65, 3: 90, 4: 55, 5: 70}[tower]
            if key not in built:
                if int(snapshot['values']['alloy']) < cost:
                    break
                build(page, canvas, tower, row, col)
                built.add(key)
        if stage == 3 and all(key in built for key in stage_builds[3]):
            for key, row, col, path, cost in (
                ('needle-I', 2, 1, 'q', 52), ('needle-II', 2, 1, 'q', 74),
                ('prism-I', 2, 3, 'q', 104),
            ):
                if key in refined:
                    continue
                snapshot = warden_snapshot(page)
                if snapshot['ends']:
                    terminal = snapshot['ends']
                    break
                if snapshot['missing']:
                    missing_without_outcome = True
                    break
                if (1 if key.startswith('needle') else 3, row, col) in built and int(snapshot['values']['alloy']) >= cost:
                    select_tower(page, canvas, row, col)
                    canvas.press(path)
                    refined.add(key)
        if terminal or missing_without_outcome:
            break
        snapshot = warden_snapshot(page)
        if snapshot['ends']:
            terminal = snapshot['ends']
            break
        if snapshot['missing']:
            missing_without_outcome = True
            break
        values = snapshot['values']
        # Alternate a ready forward-Prism active and global pulse; never spend
        # both on the same diagnostic snapshot of an already-broken ritual.
        cantor_seen = cantor_seen or bool(json.loads(values['cantors']))
        cantor_haste = cantor_haste or any(e.get('haste', 1) > 1 for e in json.loads(values['threats']))
        active_uses = max(active_uses, int(values['activeUses'] or 0))
        channels = json.loads(values['sapperChannels'])
        if stage < 3 and values['pulseEnabled'] and any(c['progress'] > 1.2 for c in channels):
            canvas.press(' ')
        if stage == 3 and not normalized_for_boss:
            routes = json.loads(values['routes'])
            required = sum(12 * (1 if direction > 0 else 2) for direction in routes if direction)
            if int(values['alloy']) >= required:
                for route_row, direction in enumerate(routes):
                    if direction:
                        turn_lane(page, canvas, route_row, 1 if direction > 0 else 2)
                normalized_for_boss = all(route == 0 for route in json.loads(warden_snapshot(page)['values']['routes']))
        boss = json.loads(values['bossState'] or '{}')
        threats = json.loads(values['threats'])
        if not boss and threats:
            for tower_type, active_row, active_col, maximum in ((1, 1, 2, 644), (3, 1, 1, 752), (1, 3, 1, 552), (3, 3, 0, 660), (2, 1, 0, 442)):
                if (tower_type, active_row, active_col) not in built:
                    continue
                if not any(e['lane'] == active_row + 1 and 180 + 92 * active_col - 15 < e['x'] < maximum for e in threats):
                    continue
                select_tower(page, canvas, active_row, active_col)
                controls = warden_snapshot(page)
                if controls['ends']:
                    terminal = controls['ends']
                    break
                if controls['missing']:
                    missing_without_outcome = True
                    break
                if controls['values']['activeEnabled']:
                    canvas.press('v')
                    break
        if terminal or missing_without_outcome:
            break
        if boss:
            boss_seen = True
            boss_shifts = max(boss_shifts, int(values['bossShifts'] or 0))
            max_boss_phase = max(max_boss_phase, int(boss.get('phase', 1)))
            boss_interrupts = max(boss_interrupts, int(values['interrupts'] or 0))
            row = boss.get('lane', 3) - 1
            hull = next((e for e in json.loads(values['threats']) if e['kind'] == 'titan'), {'x': 872})
            candidates = []
            # Needle + Frost make the central boss a shatter/mark target rather
            # than a Prism-only damage sponge. Other lanes follow processions.
            if row == 2:
                if (1, 2, 1) in built and 257 < hull['x'] < 552:
                    candidates.append((2, 1))
                if (2, 2, 2) in built and 349 < hull['x'] < 574:
                    candidates.append((2, 2))
            for prism_row, prism_col, maximum in ((2, 3, 936), (3, 3, 936), (0, 0, 780), (3, 0, 660), (1, 1, 752)):
                if row == prism_row and (3, prism_row, prism_col) in built and 180 + 92 * prism_col - 15 < hull['x'] < maximum:
                    candidates.append((prism_row, prism_col))
            if boss.get('shift', 0) > 0:
                candidates = []  # let the telegraphed procession complete; do not DPS-cancel it
            fired = False
            for active_row, active_col in candidates:
                select_tower(page, canvas, active_row, active_col)
                controls = warden_snapshot(page)
                if controls['ends']:
                    terminal = controls['ends']
                    break
                if controls['missing']:
                    missing_without_outcome = True
                    break
                if controls['values']['activeEnabled']:
                    canvas.press('v')
                    fired = True
                    break
            if terminal or missing_without_outcome:
                break
            if boss.get('ritual', 0) > 0 and not fired and values['pulseEnabled']:
                canvas.press(' ')
        if terminal or missing_without_outcome:
            break
        page.clock.run_for(250)
    results = page.evaluate('window.__deepEnds')
    assert not missing_without_outcome, {'error': 'surface disappeared without a terminal outcome', 'results': results, 'trace': trace, 'last': last_state}
    assert terminal is not None and results == terminal, {'error': 'completion was not captured atomically', 'captured': terminal, 'results': results}
    assert len(results) == 1 and results[0]['won'] is True, {'results': results, 'trace': trace, 'last': last_state, 'built': sorted(built)}
    assert boss_seen, {'message': 'the third office must telegraph the Warden', 'trace': trace, 'last': last_state, 'built': sorted(built)}
    assert max_boss_phase == 3 and boss_shifts >= 2 and boss_interrupts >= 1 and active_uses >= 8, {'phase': max_boss_phase, 'shifts': boss_shifts, 'interrupts': boss_interrupts, 'activeUses': active_uses}
    assert cantor_seen and cantor_haste, {'cantorSeen': cantor_seen, 'combinedArmsHaste': cantor_haste}
    page.clock.run_for(1800)
    assert len(page.evaluate('window.__deepEnds')) == 1, 'Warden must report exactly one outcome'
    assert canvas.count() == 0, 'the proven terminal surface must be torn down'
    print('PASS: three-office Warden siege completed through builds, actives and ritual counterplay')


def set_crouch(page, canvas, enabled):
    if (canvas.get_attribute('data-crouched') == 'true') != enabled:
        page.locator('#deep-premium [data-labyrinth-action="crouch"]').click()
        page.clock.run_for(60)


def cell_center(cell):
    return 108 + (cell[0] + .5) * 38, 79 + (cell[1] + .5) * 38


def path_to(canvas, target):
    layout = json.loads(canvas.get_attribute('data-layout'))
    walls = layout['walls']
    closed = {(d['col'], d['row']) for d in objects(canvas, 'data-doors') if not d['open']}
    x = int(canvas.get_attribute('data-player-x'))
    y = int(canvas.get_attribute('data-player-y'))
    start = (int((x - 108) // 38), int((y - 79) // 38))
    veiled = float(canvas.get_attribute('data-veil-active')) > 0
    watchers = []
    for guard in objects(canvas, 'data-guard-states'):
        watchers.append((guard, 175, .64))
    if float(canvas.get_attribute('data-scanner-jam')) == 0:
        for scanner in objects(canvas, 'data-scanner-states'):
            watchers.append((scanner, 205, .48))
    warden = json.loads(canvas.get_attribute('data-warden') or '{}')
    if warden.get('phase', 0) > 0:
        watchers.append((warden, 230, .72))

    def danger(cell):
        px, py = cell_center(cell)
        cost = 0
        for watcher, reach, cone in watchers:
            dx, dy = px - watcher['x'], py - watcher['y']
            distance = math.hypot(dx, dy)
            if distance < 48:
                cost += 45
            radius = 42 if veiled else reach
            difference = abs(math.atan2(math.sin(math.atan2(dy, dx) - watcher['facing']), math.cos(math.atan2(dy, dx) - watcher['facing'])))
            if distance >= radius or difference >= cone:
                continue
            occluded = False
            for step in range(12, int(distance), 10):
                sx, sy = watcher['x'] + dx * step / distance, watcher['y'] + dy * step / distance
                cell_x, cell_y = int((sx - 108) // 38), int((sy - 79) // 38)
                if walls[cell_y][cell_x] or (cell_x, cell_y) in closed:
                    occluded = True
                    break
            if not occluded:
                cost += 35
        return cost

    distances, previous = {start: 0}, {start: None}
    heap = [(0, start)]
    while heap:
        cost, cell = heapq.heappop(heap)
        if cost != distances.get(cell):
            continue
        if cell == target:
            break
        cx, cy = cell
        for nxt in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            nx, ny = nxt
            if not (0 <= nx < 18 and 0 <= ny < 11) or walls[ny][nx] or nxt in closed:
                continue
            new_cost = cost + 1 + danger(nxt)
            if new_cost < distances.get(nxt, float('inf')):
                distances[nxt] = new_cost
                previous[nxt] = cell
                heapq.heappush(heap, (new_cost, nxt))
    assert target in previous, f'no open route from {start} to {target}'
    path, at = [], target
    while at != start:
        path.append(at)
        at = previous[at]
    return list(reversed(path))


def walk_to(page, canvas, target, gadgets=False, decoys=True):
    # Replan after every tile: a real alarm can relocate the moth to the entrance
    # and invalidate any longer scripted itinerary.
    for attempt in range(90):
        if canvas.count() == 0:
            results = page.evaluate('window.__deepEnds')
            if results and results[-1]['won']:
                return
            raise AssertionError(f'trial ended while walking to {target}: {results}; trace={ROUTE_TRACE[-6:]}')
        x, y = int(canvas.get_attribute('data-player-x')), int(canvas.get_attribute('data-player-y'))
        hearts = int(canvas.get_attribute('data-hearts'))
        if not ROUTE_TRACE or ROUTE_TRACE[-1]['hearts'] != hearts:
            ROUTE_TRACE.append({'hearts': hearts, 'clock': canvas.get_attribute('data-clock'), 'target': target, 'player': (x, y), 'guards': objects(canvas, 'data-guard-states')})
        tx, ty = cell_center(target)
        if abs(tx - x) <= 5 and abs(ty - y) <= 5:
            return
        if gadgets and math.hypot(x - 165, y - 270) < 42 and float(canvas.get_attribute('data-veil-active')) <= 0 and float(canvas.get_attribute('data-veil-cooldown')) > 0:
            until(page, canvas, 'data-veil-cooldown', lambda value: float(value) == 0, budget=12000)
            canvas.press(' ')
        path = path_to(canvas, target)
        if not path:
            return
        waypoint = path[0]
        tx, ty = cell_center(waypoint)
        if gadgets:
            controls = lab_controls(page)
            if controls['ends'] or controls['missing']:
                if accept_lab_terminal(page, f'walking to {target}'):
                    return
            if controls['veil']:
                canvas.press(' ')
        for _ in range(100):
            if canvas.count() == 0:
                results = page.evaluate('window.__deepEnds')
                if results and results[-1]['won']:
                    return
                raise AssertionError(f'trial ended while walking to {target}: {results}; trace={ROUTE_TRACE[-6:]}')
            x, y = int(canvas.get_attribute('data-player-x')), int(canvas.get_attribute('data-player-y'))
            dx, dy = tx - x, ty - y
            if abs(dx) <= 3 and abs(dy) <= 3:
                break
            if abs(dx) > 3:
                key, distance, speed = ('d' if dx > 0 else 'a'), abs(dx), 195
            else:
                key, distance = ('s' if dy > 0 else 'w'), abs(dy)
            if canvas.count() == 0:
                results = page.evaluate('window.__deepEnds')
                if results and results[-1]['won']:
                    return
                raise AssertionError(f'trial ended while walking to {target}: {results}; trace={ROUTE_TRACE[-6:]}')
            speed = (155 if float(canvas.get_attribute('data-veil-active')) > 0 else 195) * (.52 if canvas.get_attribute('data-crouched') == 'true' else 1)
            milliseconds = int(max(8, min(45, distance / speed * 1000)))
            hold(page, key, milliseconds, settle=5)
            if gadgets and canvas.count():
                sightings = [g for g in objects(canvas, 'data-guard-states') if g.get('sees')]
                warden_sighting = json.loads(canvas.get_attribute('data-warden') or '{}')
                if warden_sighting.get('sees'):
                    sightings.append(warden_sighting)
                controls = lab_controls(page)
                if controls['ends'] or controls['missing']:
                    if accept_lab_terminal(page, f'walking to {target}'):
                        return
                if sightings and controls['veil']:
                    canvas.press(' ')
                if any(g['alert'] > .12 for g in sightings) and controls['dash']:
                    canvas.press('h')
                    break
        if gadgets and attempt % 4 == 0:
            controls = lab_controls(page)
            if controls['ends'] or controls['missing']:
                if accept_lab_terminal(page, f'walking to {target}'):
                    return
            if decoys and controls['decoy']:
                canvas.press('f')
            if controls['veil']:
                canvas.press(' ')
    raise AssertionError(f'could not reach {target}; last player=({x},{y}), hearts={canvas.get_attribute("data-hearts")}')


def walk_cells(page, canvas, cells):
    """Follow an authored public-input itinerary, not a reactive route search."""
    for cell in cells:
        walk_to(page, canvas, cell, gadgets=False, decoys=False)


def wait_veil_ready(page, canvas):
    """Wait in an authored Still Shadow-safe cell, never in an active chase cone."""
    set_crouch(page, canvas, True)
    until(page, canvas, 'data-veil-cooldown', lambda value: float(value) == 0, budget=14000)


def test_labyrinth_verbs_and_alerts(page):
    # Soft-step changes actual travel distance and emitted noise radius.
    distances = []
    for soft in (False, True):
        canvas = mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 4})
        ready(canvas)
        if soft:
            page.keyboard.down('Shift')
        x0 = int(canvas.get_attribute('data-player-x'))
        hold(page, 'd', 400)
        distances.append(int(canvas.get_attribute('data-player-x')) - x0)
        assert canvas.get_attribute('data-crouched') == str(soft).lower()
        noise = objects(canvas, 'data-noise-events')
        assert noise and noise[-1]['radius'] == (32 if soft else 92)
        if soft:
            page.keyboard.down('d')
            page.clock.run_for(60)
            assert canvas.get_attribute('data-concealed') == 'false', 'movement must break still-shadow concealment'
            page.keyboard.up('d')
            page.clock.run_for(100)
            assert canvas.get_attribute('data-concealed') == 'true'
            page.keyboard.up('Shift')
            page.clock.run_for(50)
            assert canvas.get_attribute('data-concealed') == 'false'
        destroy(page)
    assert 30 < distances[1] < distances[0] - 25, distances

    # Meridian's closed narthex door physically blocks the player; E opens it,
    # then mothstep crosses collision-safe floor and makes a loud investigation.
    canvas = mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 5, 'speedScale': .35})
    ready(canvas)
    hold(page, 'w', 195)
    hold(page, 'd', 195)
    x_before = int(canvas.get_attribute('data-player-x'))
    hold(page, 'd', 500)
    assert int(canvas.get_attribute('data-player-x')) <= x_before + 12, 'closed door must block collision'
    canvas.press('e')
    page.clock.run_for(180)
    door = next(d for d in objects(canvas, 'data-doors') if d['id'] == 'narthex')
    assert door['open'] and int(canvas.get_attribute('data-interactions')) >= 1
    assert any(g['state'] == 'investigate' for g in objects(canvas, 'data-guard-states'))
    hold(page, 'd', 300)
    x_before = int(canvas.get_attribute('data-player-x'))
    canvas.press('h')
    page.clock.run_for(160)
    assert int(canvas.get_attribute('data-player-x')) > x_before + 45
    assert canvas.get_attribute('data-dashes') == '1'
    assert float(canvas.get_attribute('data-dash-cooldown')) > 4
    assert any(n['kind'] == 'mothstep' and n['radius'] == 250 for n in objects(canvas, 'data-noise-events'))
    destroy(page)
    print('PASS: soft-step/noise, physical brass doors, E interaction and loud mothstep')

    # A confirmed sighting coordinates nearby watchers and raises the network state.
    canvas = mount(page, 'labyrinth', {'seed': 981, 'veteran': True, 'startChamber': 0})
    ready(canvas)
    hold(page, 'd', 330)
    page.keyboard.down('s')
    try:
        until(page, canvas, 'data-coordinations', lambda value: int(value) > 0, budget=5000, step=80)
    finally:
        page.keyboard.up('s')
    assert int(canvas.get_attribute('data-alarm-level')) >= 1
    assert float(canvas.get_attribute('data-network-alert')) > 0
    assert any(g.get('broadcast') for g in objects(canvas, 'data-guard-states'))
    canvas.press('p')
    frozen = (canvas.get_attribute('data-clock'), canvas.get_attribute('data-player-x'), canvas.get_attribute('data-dashes'))
    canvas.press('h')
    canvas.press('e')
    canvas.press('f')
    page.clock.run_for(500)
    assert frozen == (canvas.get_attribute('data-clock'), canvas.get_attribute('data-player-x'), canvas.get_attribute('data-dashes'))
    canvas.press('p')
    destroy(page)
    print('PASS: watchers coordinate sightings; pause freezes new verbs and callbacks stay inert')

    # Seeded patrol starts and layouts replay exactly; all paths stay bounded.
    snapshots = []
    for _ in range(2):
        canvas = mount(page, 'labyrinth', {'seed': 12345, 'veteran': True, 'startChamber': 4})
        page.clock.run_for(1600)
        snapshots.append((canvas.get_attribute('data-layout'), canvas.get_attribute('data-course')))
        for guard in objects(canvas, 'data-guard-states'):
            assert guard['path'] <= 198
        destroy(page)
    assert snapshots[0] == snapshots[1]
    print('PASS: authored Veteran layout and patrol starts are seeded and pathfinding is bounded')


def test_meridian_completion(page):
    # Production Veteran pressure, base gadgets, one deterministic lower-route
    # itinerary. No retries, relics, slowed fixture or live-state replacement.
    canvas = mount(page, 'labyrinth', {
        'seed': 981, 'veteran': True, 'startChamber': 5, 'speedScale': 1.18,
    })
    ready(canvas)
    assert canvas.get_attribute('data-speed-scale') == '1.18'
    assert canvas.get_attribute('data-relics') == ''
    set_crouch(page, canvas, True)

    # Narthex and first key: the scanner at (5,5) never faces this approach.
    walk_cells(page, canvas, [(2, 4)])
    canvas.press('e')
    page.clock.run_for(150)
    assert next(d for d in objects(canvas, 'data-doors') if d['id'] == 'narthex')['open']
    walk_cells(page, canvas, [(3, 4), (4, 4)])
    canvas.press(' ')
    walk_cells(page, canvas, [(5, 4), (5, 3)])
    assert canvas.get_attribute('data-keys-found') == '1'

    # Cross the open upper gap, then veil for the southern guard's key corridor.
    walk_cells(page, canvas, [(5, 2), (6, 2), (7, 2), (8, 2), (8, 3), (8, 4)])
    # Draw both lower guards south before entering the second key's corridor.
    hold(page, 's', 25)
    canvas.press('f')
    page.clock.run_for(80)
    walk_cells(page, canvas, [(8, 5)])
    assert canvas.get_attribute('data-keys-found') == '2'
    walk_cells(page, canvas, [(8, 6), (9, 6), (10, 6)])
    wait_veil_ready(page, canvas)
    walk_cells(page, canvas, [(10, 7)])
    canvas.press(' ')
    canvas.press('e')
    page.clock.run_for(150)
    assert next(d for d in objects(canvas, 'data-doors') if d['id'] == 'archive')['open']

    # Third key: throw east, then mothstep west through the open archive.
    walk_cells(page, canvas, [(11, 7), (12, 7), (13, 7)])
    assert canvas.get_attribute('data-keys-found') == '3'
    assert canvas.get_attribute('data-objective-stage') == 'relays'
    assert canvas.get_attribute('data-exit-open') == 'false'
    hold(page, 'd', 25)
    canvas.press('f')
    hold(page, 'a', 25)
    canvas.press('h')
    walk_cells(page, canvas, [(10, 7), (9, 7), (8, 7), (8, 6)])
    canvas.press('e')
    page.clock.run_for(150)
    assert next(d for d in objects(canvas, 'data-doors') if d['id'] == 'choir')['open']

    # Lower relay: the distracted guards are beyond the 42px still-shadow radius.
    walk_cells(page, canvas, [(7, 6), (6, 6), (6, 7)])
    wait_veil_ready(page, canvas)
    walk_cells(page, canvas, [(6, 8)])
    assert lab_controls(page)['veil'], 'the third key must leave a lower-relay veil available'
    canvas.press(' ')
    before_guards = objects(canvas, 'data-guard-states')
    canvas.press('e')
    page.clock.run_for(1500)
    assert page.evaluate('window.__deepEnds') == []
    assert canvas.get_attribute('data-relays-done') == '1', {'interaction': canvas.get_attribute('data-interaction'), 'player': (canvas.get_attribute('data-player-x'), canvas.get_attribute('data-player-y')), 'hearts': canvas.get_attribute('data-hearts'), 'beforeGuards': before_guards}
    assert json.loads(canvas.get_attribute('data-warden'))['phase'] == 1

    # The relay refreshes veil for the return through the archive. Draw the newly
    # awakened Warden north and use the open lower doors, not northern gaps.
    canvas.press(' ')
    hold(page, 'w', 25)
    canvas.press('f')
    walk_cells(page, canvas, [(6, 7), (6, 6)])
    hold(page, 'd', 25)
    canvas.press('h')
    walk_cells(page, canvas, [(10, 6), (10, 7), (11, 7), (12, 7), (13, 7),
                              (13, 6), (14, 6), (14, 5), (15, 5)])
    wait_veil_ready(page, canvas)
    walk_cells(page, canvas, [(16, 5)])
    # Veil stuns the eastern patrol at close range; mothstep breaks its sightline.
    if lab_controls(page)['veil']:
        canvas.press(' ')
    if lab_controls(page)['dash']:
        hold(page, 'w', 25)
        canvas.press('h')
    walk_cells(page, canvas, [(16, 4), (16, 3), (16, 2), (16, 1)])

    # Upper relay and adjacent heart each get a stage-primed decoy down the east
    # corridor, drawing the patrol and Warden away from the stationary channel.
    for objective, expected, duration in ((16, 1), 2, 1500), ((16, 2), 3, 2000):
        walk_cells(page, canvas, [objective])
        controls = lab_controls(page)
        if controls['ends'] or controls['missing']:
            accept_lab_terminal(page, f'preparing objective {objective}')
        if objective == (16, 2):
            assert controls['veil'], 'the upper relay must prime a heart-stun veil'
            canvas.press(' ')
        if controls['jammer']:
            canvas.press('g')
        if controls['decoy']:
            hold(page, 's', 25)
            canvas.press('f')
            page.clock.run_for(80)
        before_guards = objects(canvas, 'data-guard-states')
        before_scanners = objects(canvas, 'data-scanner-states')
        canvas.press('e')
        page.clock.run_for(duration)
        assert page.evaluate('window.__deepEnds') == []
        if objective == (16, 1):
            assert canvas.get_attribute('data-relays-done') == '2'
        else:
            assert canvas.get_attribute('data-heart') == 'stolen', {'interaction': canvas.get_attribute('data-interaction'), 'player': (canvas.get_attribute('data-player-x'), canvas.get_attribute('data-player-y')), 'hearts': canvas.get_attribute('data-hearts'), 'warden': canvas.get_attribute('data-warden'), 'beforeGuards': before_guards, 'beforeScanners': before_scanners, 'concealed': canvas.get_attribute('data-concealed')}
        assert json.loads(canvas.get_attribute('data-warden'))['phase'] == expected

    set_crouch(page, canvas, False)
    assert canvas.get_attribute('data-objective-stage') == 'escape'
    until(page, canvas, 'data-judgments-called', lambda value: int(value) >= 1, budget=8000)
    if int(canvas.get_attribute('data-judgments-evaded')) == 0:
        until(page, canvas, 'data-warden', lambda value: json.loads(value).get('judgment', 0) > 0, budget=6000)
        hold(page, 's', 25)
        canvas.press('h')
    until(page, canvas, 'data-judgments-evaded', lambda value: int(value) >= 1, budget=8000)

    try:
        walk_cells(page, canvas, [(16, 3), (16, 4), (16, 5)])
        if canvas.count():
            page.keyboard.down('d')
            try:
                page.clock.run_for(1800)
            finally:
                page.keyboard.up('d')
    except Exception as error:
        terminal = page.evaluate('window.__deepEnds')
        if not terminal or not terminal[-1]['won']:
            raise error
    page.clock.run_for(1800)
    results = page.evaluate('window.__deepEnds')
    assert len(results) == 1 and results[0]['won'] is True, results
    assert canvas.count() == 0
    print('PASS: production 1.18× base-gadget Meridian keys → relays → Warden phases → judgment evasion → heart → escape; exactly one win')


def phone_assertions(page, cartridge):
    hud = page.locator(f'[data-mobile-hud="{cartridge}"]')
    assert hud.is_visible()
    assert hud.get_attribute('data-active') == 'true'
    assert page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')
    canvas = page.locator('.cartridge-stage canvas')
    assert canvas.get_attribute('data-reduced-motion') == 'true'
    font_size = hud.evaluate('node => parseFloat(getComputedStyle(node).fontSize)')
    assert font_size >= 14
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    box = canvas.bounding_box()
    assert box['x'] >= 0 and box['x'] + box['width'] <= 391
    page.screenshot(path=str(CAPTURES / f'deep-premium-{cartridge}-390.png'), full_page=True)


def test_mobile(page, base):
    page.add_init_script('''localStorage.setItem('aether-cartridge-records-v1', JSON.stringify({best:{},clears:{bastion:1,labyrinth:1}}));''')
    page.goto(f'{base}/index.html?standalone=1&cartridge=bastion&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
    page.clock.install()
    page.clock.run_for(350)
    phone_assertions(page, 'bastion')
    canvas = page.locator('.cartridge-stage canvas')
    page.locator('[data-bastion-loadout="0"]').click()
    box = canvas.bounding_box()
    canvas.click(position={'x': box['width'] * (180 + 92) / 900, 'y': box['height'] * (151 + 68) / 560})
    page.clock.run_for(160)
    assert canvas.get_attribute('data-selected-type') == 'Needle'
    page.locator('[data-bastion-action="lane"]').click()
    page.clock.run_for(160)
    assert json.loads(canvas.get_attribute('data-lane-routes'))[1] == -1
    assert 'ALLOY' in page.locator('[data-mobile-hud="bastion"]').inner_text()

    page.goto(f'{base}/index.html?standalone=1&cartridge=labyrinth&mode=campaign&variant=veteran#voyage', wait_until='networkidle')
    page.clock.run_for(1700)
    phone_assertions(page, 'labyrinth')
    canvas = page.locator('.cartridge-stage canvas')
    crouch = page.locator('[data-labyrinth-action="crouch"]')
    crouch.click()
    page.clock.run_for(120)
    assert canvas.get_attribute('data-crouched') == 'true'
    assert crouch.get_attribute('aria-pressed') == 'true'
    page.keyboard.down('d')
    page.clock.run_for(150)
    page.keyboard.up('d')
    page.locator('[data-labyrinth-action="dash"]').click()
    page.clock.run_for(160)
    assert canvas.get_attribute('data-dashes') == '1'
    assert canvas.evaluate('node => document.activeElement === node')
    assert 'MOTHSTEP' in page.locator('[data-mobile-hud="labyrinth"]').inner_text()
    print(f'PASS: 390x844 touch controls, readable 14px DOM HUDs, reduced motion and captures in {CAPTURES}')


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            sections = [
                ('actives', test_standard_and_actives),
                ('lane', test_lane_and_pause),
                ('cantor', test_cantor_siege),
                ('warden', test_warden_completion),
                ('verbs', test_labyrinth_verbs_and_alerts),
                ('meridian', test_meridian_completion),
            ]
            for name, section in sections:
                if ONLY and ONLY not in name:
                    continue
                # Isolate fake-clock epoch, pointer/focus state and callback history.
                # Game instances were already local; the fixture now is too.
                page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
                page_global = page
                page.on('pageerror', lambda error: errors.append(f'{name}: {error}'))
                page.goto(f'{base}/index.html#overview', wait_until='networkidle')
                page.clock.install()
                try:
                    section(page)
                finally:
                    page.close()
            if not ONLY or 'mobile' in ONLY:
                mobile = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion='reduce')
                mobile.on('pageerror', lambda error: errors.append(str(error)))
                test_mobile(mobile, base)
                mobile.close()
            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Deep premium regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
