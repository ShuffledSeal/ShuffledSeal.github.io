"""Veteran combat/action mechanics and standard-route browser invariants.

Run from the repository root with Python Playwright installed:
    python3 tests/combat-mechanics.py

Every mechanic is reached through the shipped create() options and real canvas,
keyboard, pointer, formation, armory, or button controls. Diagnostics are read
only: this suite never mutates health, entities, timers, RNG, or encounter state.
"""
import http.server
import json
import math
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('/tmp/opencode/combat-mechanics')
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def current(page):
    return page.evaluate('window.__combatGame ? window.__combatGame.state : null')


def advance(page, milliseconds):
    page.clock.run_for(milliseconds)


def wait_state(page, predicate, label, timeout=8000, step=50):
    elapsed = 0
    while elapsed <= timeout:
        state = current(page)
        if state is not None and predicate(state):
            return state
        advance(page, step)
        elapsed += step
    raise AssertionError(f'{label}; last state={json.dumps(current(page), sort_keys=True)}')


def mount(page, cartridge, options=None):
    page.evaluate('''({cartridge, options}) => {
        window.__combatGame?.destroy();
        window.__combatHost?.remove();
        const host = document.createElement('div');
        host.id = 'combat-mechanics-fixture';
        host.style.cssText = 'position:fixed;left:12px;top:12px;z-index:10000;width:min(960px,calc(100vw - 24px));background:#0b1725';
        document.body.append(host);
        window.__combatHost = host;
        window.__combatEnds = [];
        const onEnd = result => window.__combatEnds.push(result);
        window.__combatGame = cartridge === 'skirmish'
            ? AetherSkirmish.create(host, {
                sector: 0, elite: false, endless: false, hull: 'bell', instruments: [],
                seed: 84021, difficulty: 'explorer', sound: false, ...options, onEnd,
            })
            : AetherTrials.create(cartridge, host, {sound: false, ...options, onEnd});
        const surface = host.querySelector('canvas');
        surface.style.maxWidth = '100%'; surface.style.height = 'auto';
    }''', {'cartridge': cartridge, 'options': options or {}})
    return page.locator('#combat-mechanics-fixture canvas')


def destroy(page):
    page.evaluate('window.__combatGame?.destroy()')
    advance(page, 1200)
    assert page.evaluate('window.__combatEnds') == []
    assert page.locator('#combat-mechanics-fixture canvas, #combat-mechanics-fixture button').count() == 0


def canvas_point(canvas, x, y, width, height):
    box = canvas.bounding_box()
    assert box, 'canvas must be visible for pointer input'
    return box['x'] + box['width'] * x / width, box['y'] + box['height'] * y / height


def aim_hunt(page, canvas, enemy):
    page.mouse.move(*canvas_point(canvas, enemy['x'], enemy['y'], 960, 600))


def steer_chain(page, canvas, x, y):
    page.mouse.move(*canvas_point(canvas, x, y, 900, 560))


def nearest_hostile_orb(state):
    player = state['player']
    hostile = [orb for orb in state['orbs'] if not orb['friendly']]
    if not hostile:
        return None
    return min(math.hypot(orb['x'] - player['x'], orb['y'] - player['y']) for orb in hostile)


def centre_perihelion(page, canvas, target_gate=True, duration=100):
    """Use the shipped climb/dive key with a short velocity prediction."""
    state = current(page)
    assert state and not state['over'], state
    target_y = (64 + 496) / 2
    if target_gate:
        approaching = [gate for gate in state['gates'] if gate['x'] > state['skiff']['x'] - 8 and not gate['scored']]
        if approaching:
            gate = min(approaching, key=lambda gate: gate['x'])
            target_y = gate['y'] + gate.get('vy', 0) * .35
    predicted = state['skiff']['y'] + state['skiff']['vy'] * .35
    if predicted < target_y - 2:
        page.keyboard.down(' ')
    else:
        page.keyboard.up(' ')
    advance(page, duration)


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            def new_page():
                page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'{base}/index.html#overview', wait_until='networkidle')
                page.clock.install()
                return page

            # Standard campaigns expose none of the new controls or entities.
            page = new_page()
            canvas = mount(page, 'skirmish', {'startAct': 4, 'seed': 6024})
            advance(page, 2800)
            standard = current(page)
            assert standard['act'] == 1 and not standard['veteran']
            assert not any(enemy['kind'] == 'aegis' for enemy in standard['enemies'])
            assert page.locator('[data-skirmish-guard]').count() == 0
            canvas.focus()
            page.keyboard.down('j')
            advance(page, 300)
            assert current(page)['boltsFired'] > 0
            canvas.press('e')
            assert current(page)['guardCount'] == 0
            canvas.press('p')
            frozen = current(page)
            advance(page, 500)
            paused = current(page)
            assert paused['paused'] and paused['boltsFired'] == frozen['boltsFired']
            assert paused['player']['x'] == frozen['player']['x'] and paused['player']['y'] == frozen['player']['y']
            page.keyboard.up('j')
            canvas.press('p')
            destroy(page)

            # Identical standard seeds and no-input fixed steps reproduce contacts.
            signatures = []
            for _ in range(2):
                mount(page, 'skirmish', {'seed': 'standard-combat-signature'})
                advance(page, 3000)
                state = current(page)
                signatures.append([(enemy['kind'], enemy['spawnX'], enemy['spawnY'], enemy['hp']) for enemy in state['enemies']])
                page.evaluate('window.__combatGame.destroy()')
            assert signatures[0] and signatures[0] == signatures[1], signatures

            canvas = mount(page, 'chain', {'seed': 6024})
            assert page.locator('button[data-chain-cast]').count() == 0
            page.locator('[data-chain-start]').click()
            canvas.focus(); canvas.press('q')
            advance(page, 1200)
            standard_chain = current(page)
            assert standard_chain['castCount'] == 0 and standard_chain['links'] == 5
            assert standard_chain['enemies'] and {enemy['kind'] for enemy in standard_chain['enemies']} == {'drift'}
            destroy(page)

            canvas = mount(page, 'perihelion', {'seed': 6024})
            assert page.locator('[data-perihelion-brake]').count() == 0
            canvas.focus(); canvas.press('e')
            classic = current(page)
            assert not classic['veteran'] and classic['corona'] == 0 and classic['brakesUsed'] == 0
            assert math.isclose(classic['speed'], (230 + classic['clock'] * 3.2), abs_tol=1e-9)
            destroy(page)
            page.close()
            print('PASS: standard hunts/trials keep routes, seeded contacts, controls, pause and teardown; all new verbs opt out')

            # Aegis: frontal fire is reduced, Mortar bypasses facing, the ward
            # locks before a salvo, and its wielder enters a real recovery state.
            page = new_page()
            canvas = mount(page, 'skirmish', {
                'veteran': True, 'startAct': 1, 'hull': 'moth', 'seed': 84021,
            })
            canvas.focus(); canvas.press('m')  # classic WASD + free cursor aim
            aegis_state = wait_state(page, lambda s: any(e['kind'] == 'aegis' for e in s['enemies']), 'Aegis did not enter veteran act one')
            assert page.locator('[data-skirmish-guard]').count() == 1
            page.keyboard.down('j')
            try:
                for _ in range(100):
                    state = current(page)
                    aegis = next((e for e in state['enemies'] if e['kind'] == 'aegis'), None)
                    assert aegis is not None, f'Aegis died before a frontal ward assertion: {state}'
                    if aegis['guardBlocks'] > 0:
                        break
                    aim_hunt(page, canvas, aegis)
                    advance(page, 75)
                else:
                    raise AssertionError(f'Pulse never struck the Aegis ward: {current(page)}')
            finally:
                page.keyboard.up('j')
            assert current(page)['aegisBlocks'] > 0

            canvas.press('4')
            page.keyboard.down('j')
            try:
                for _ in range(100):
                    state = current(page)
                    aegis = next((e for e in state['enemies'] if e['kind'] == 'aegis'), None)
                    assert aegis is not None, f'Aegis died before Mortar breach assertion: {state}'
                    if aegis['mortarBreaches'] > 0:
                        break
                    aim_hunt(page, canvas, aegis)
                    advance(page, 75)
                else:
                    raise AssertionError(f'Mortar never breached the directional ward: {current(page)}')
            finally:
                page.keyboard.up('j')
            assert current(page)['aegisMortars'] == 1

            locked = wait_state(
                page,
                lambda s: any(e['kind'] == 'aegis' and e['state'] == 'guard' and .22 < e['cd'] < .74 for e in s['enemies']),
                'Aegis never reached its pre-salvo lock', timeout=9000, step=40,
            )
            aegis = next(e for e in locked['enemies'] if e['kind'] == 'aegis')
            page.screenshot(path=str(OUT / 'skirmish-aegis-lock.png'), animations='disabled')
            locked_angle = aegis['guardAngle']
            page.keyboard.down('d'); advance(page, 120); page.keyboard.up('d')
            aegis_after = next(e for e in current(page)['enemies'] if e['kind'] == 'aegis')
            assert math.isclose(aegis_after['guardAngle'], locked_angle, abs_tol=1e-12)
            wait_state(page, lambda s: any(e['kind'] == 'aegis' and e['state'] == 'recover' for e in s['enemies']), 'Aegis never dropped its ward after firing', timeout=3000, step=40)
            destroy(page)
            page.close()
            print('PASS: Aegis frontal ward, Mortar bypass, fixed salvo facing and punishable recovery use real weapon input')

            # Reversal: a whiff costs firing tempo and cooldown. A real incoming
            # orb freezes on pause, then returns, damages a target and grants tempo.
            page = new_page()
            canvas = mount(page, 'skirmish', {'veteran': True, 'startAct': 1, 'seed': 9137})
            wait_state(page, lambda s: s['phase'] == 'combat', 'veteran hunt did not enter combat')
            canvas.focus(); canvas.press('e'); page.keyboard.down('j')
            advance(page, 180)
            whiffing = current(page)
            assert whiffing['guardCount'] == 1 and whiffing['guardTime'] > 0
            assert whiffing['boltsFired'] == 0, 'Reversal must interrupt held fire'
            page.keyboard.up('j')
            wait_state(page, lambda s: s['guardWhiffs'] == 1, 'empty Reversal did not whiff', timeout=1500, step=40)
            assert current(page)['reversalCount'] == 0 and current(page)['guardCooldown'] > 2.8

            incoming = wait_state(page, lambda s: nearest_hostile_orb(s) is not None and nearest_hostile_orb(s) < 105, 'no hostile orb reached Reversal range', timeout=14000, step=20)
            canvas.press('e')
            guarded = current(page)
            assert guarded['guardCount'] == 2 and guarded['guardTime'] > 0
            canvas.press('p')
            frozen = current(page)
            advance(page, 350)
            paused = current(page)
            assert paused['guardTime'] == frozen['guardTime'] and paused['orbs'] == frozen['orbs']
            canvas.press('p')
            reversed_state = wait_state(page, lambda s: s['reversalCount'] == 1, 'incoming orb was not reflected', timeout=1200, step=20)
            assert reversed_state['player']['supercharge'] >= 2
            assert reversed_state['player']['burstCd'] == 0
            assert 0 < reversed_state['guardCooldown'] <= 1.4
            wait_state(page, lambda s: s['reversalHits'] > 0, 'reflected orb never damaged a threat', timeout=3500, step=40)
            destroy(page)
            page.close()
            print('PASS: Reversal whiff cost, firing lock, pause safety, reflected hit, dash refresh and empowered shots')

            # Star Cast spends health/ammo in all three formations. Cast kills
            # leave real motes; Ribbon can fly back and recover its spent link.
            for formation in ('ribbon', 'halo', 'spear'):
                page = new_page()
                canvas = mount(page, 'chain', {'veteran': True, 'startEncounter': 2, 'seed': 6024})
                page.locator(f'button[data-chain-formation="{formation}"]').click()
                page.locator('[data-chain-start]').click()
                wait_state(page, lambda s: any(e['kind'] == 'drift' for e in s['enemies']), 'drift target did not spawn', timeout=1000, step=40)
                canvas.focus(); canvas.press('q'); canvas.press('q')
                cast = current(page)
                assert cast['castCount'] == 1 and cast['links'] == 4 and cast['castTime'] > 0
                bolt = next(b for b in cast['bolts'] if b['cast'])
                assert bolt['cast'] == formation
                assert bolt['damage'] == {'ribbon': 9, 'halo': 8, 'spear': 14}[formation]
                if formation == 'spear':
                    assert bolt['pierce'] == 8
                wait_state(page, lambda s: s['castRefunds'] >= 1, f'{formation} Star Cast never produced a recovery mote', timeout=3500, step=40)
                if formation == 'halo':
                    assert current(page)['castBursts'] == 1
                if formation == 'ribbon':
                    mote = next(m for m in current(page)['motes'] if m['cast'])
                    before_collected = current(page)['collected']
                    steer_chain(page, canvas, mote['x'], mote['y'])
                    recovered = wait_state(page, lambda s: s['collected'] > before_collected and s['links'] >= 5, 'Ribbon could not recover its cast link', timeout=5000, step=75)
                    assert recovered['links'] >= 5
                destroy(page)
                page.close()
            print('PASS: Ribbon/Halo/Spear Star Cast cost, cooldown, seeking/burst/pierce payload and collectible kill refunds')

            # A Siphon telegraphs a specific mote, consumes it if ignored, and
            # creates exactly two additional drift shards on its first theft.
            page = new_page()
            canvas = mount(page, 'chain', {'veteran': True, 'seed': 813})
            page.locator('button[data-chain-formation="halo"]').click()
            page.locator('[data-chain-start]').click()
            siphon_spawn = wait_state(page, lambda s: any(e['kind'] == 'siphon' for e in s['enemies']), 'Siphon did not spawn')
            siphon = next(e for e in siphon_spawn['enemies'] if e['kind'] == 'siphon')
            corners = [(55, 90), (845, 90), (55, 505), (845, 505)]
            corner = max(corners, key=lambda p: math.hypot(p[0] - siphon['x'], p[1] - siphon['y']))
            steer_chain(page, canvas, *corner)
            harvest = wait_state(page, lambda s: any(e['kind'] == 'siphon' and e['mode'] == 'harvest' and e['harvestTarget'] for e in s['enemies']), 'Siphon never telegraphed its mote harvest', timeout=6000, step=40)
            target = next(e for e in harvest['enemies'] if e['kind'] == 'siphon')['harvestTarget']
            page.screenshot(path=str(OUT / 'chain-siphon-harvest.png'), animations='disabled')
            stolen = wait_state(page, lambda s: s['siphonSteals'] == 1, 'Siphon did not complete its warned theft', timeout=3500, step=40)
            assert len([e for e in stolen['enemies'] if e['kind'] == 'drift']) == 2
            assert all(math.hypot(m['x'] - target['x'], m['y'] - target['y']) > 1 for m in stolen['motes'])
            destroy(page)
            page.close()
            print('PASS: Siphon marks and spends a real mote, then adds two bounded drift shards; destroy cancels later callbacks')

            # The alternate counterplay is equally real: collect the marked mote
            # before the channel ends, denying the theft and exposing the Siphon.
            page = new_page()
            canvas = mount(page, 'chain', {'veteran': True, 'seed': 99})
            page.locator('button[data-chain-formation="halo"]').click()
            page.locator('[data-chain-start]').click()
            harvest = wait_state(page, lambda s: any(e['kind'] == 'siphon' and e['mode'] == 'harvest' and e['harvestTarget'] for e in s['enemies']), 'denial fixture never marked a mote', timeout=6000, step=40)
            target = next(e for e in harvest['enemies'] if e['kind'] == 'siphon')['harvestTarget']
            before_collected = harvest['collected']
            steer_chain(page, canvas, target['x'], target['y'])
            denied = wait_state(page, lambda s: s['siphonDenials'] == 1, 'collecting the marked mote did not interrupt harvest', timeout=2300, step=40)
            assert denied['siphonSteals'] == 0 and denied['collected'] > before_collected
            siphon = next(e for e in denied['enemies'] if e['kind'] == 'siphon')
            assert siphon['mode'] == 'rest' and siphon['harvestTarget'] is None
            destroy(page)
            page.close()
            print('PASS: collecting a marked mote denies Siphon theft and opens its readable recovery window')

            # Veteran Perihelion starts with one charge. Braking slows gates but
            # not fixed-step time; pause freezes it and precise braking threads
            # still score without refunding the spent charge.
            page = new_page()
            canvas = mount(page, 'perihelion', {'veteran': True, 'seed': 'corona-brake', 'speedScale': .75})
            assert current(page)['corona'] == 1 and page.locator('[data-perihelion-brake]').count() == 1
            canvas.focus()
            while min(gate['x'] for gate in current(page)['gates']) > 380:
                assert not current(page)['over'], current(page)
                centre_perihelion(page, canvas, duration=25)
            before = current(page)
            canvas.press('e')
            braking = current(page)
            assert braking['corona'] == 0 and braking['brakesUsed'] == 1 and braking['brakeTime'] > 1.7
            assert math.isclose(braking['speed'], (230 + braking['clock'] * 3.2) * .75 * .58, rel_tol=1e-9)
            canvas.press('p')
            frozen = current(page)
            advance(page, 400)
            assert current(page)['brakeTime'] == frozen['brakeTime']
            canvas.press('p')
            while current(page)['passed'] == 0 and not current(page)['over']:
                centre_perihelion(page, canvas, duration=25)
            threaded = current(page)
            assert not threaded['over'] and threaded['brakeTime'] > 0, threaded
            assert threaded['preciseThreads'] == 1 and threaded['coronaEarned'] == 0 and threaded['corona'] == 0, threaded
            assert threaded['score'] == 160
            while current(page)['brakeTime'] > 0 and not current(page)['over']:
                centre_perihelion(page, canvas, duration=25)
            expired = current(page)
            assert expired['brakesUsed'] == 1 and expired['corona'] == 0
            assert math.isclose(expired['speed'], (230 + expired['clock'] * 3.2) * .75, rel_tol=1e-9)
            page.keyboard.up(' ')
            destroy(page)
            page.close()
            print('PASS: Corona aerobrake slows gates only, pauses safely, and precision during braking scores without charge refund')

            # A separate unbraked precise thread banks a second Corona and the
            # accessible button spends it through the same shipped control path.
            page = new_page()
            canvas = mount(page, 'perihelion', {'veteran': True, 'seed': 'corona-earn', 'speedScale': .75})
            canvas.focus()
            for _ in range(360):
                if current(page)['passed'] or current(page)['over']:
                    break
                centre_perihelion(page, canvas, duration=25)
            earned = current(page)
            assert not earned['over'] and earned['passed'] == 1, earned
            assert earned['preciseThreads'] == 1 and earned['corona'] == 2 and earned['coronaEarned'] == 1, earned
            assert earned['score'] == 160
            page.keyboard.up(' ')
            brake_button = page.locator('[data-perihelion-brake]')
            assert brake_button.is_enabled()
            canvas.press('p'); assert brake_button.is_disabled()
            canvas.press('p'); assert brake_button.is_enabled()
            brake_button.click()
            assert current(page)['brakesUsed'] == 1 and current(page)['corona'] == 1
            destroy(page)
            page.close()
            print('PASS: precise unbraked thread earns Corona and the real aerobrake button spends it')

            # Veteran-only actions remain reachable at phone width; the Run's
            # alternate right-click input must brake without holding a dive.
            page = new_page()
            page.set_viewport_size({'width': 390, 'height': 844})
            mount(page, 'chain', {'veteran': True, 'seed': 99})
            cast_button = page.locator('button[data-chain-cast]')
            assert cast_button.is_visible() and cast_button.bounding_box()['height'] >= 44
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            destroy(page)
            canvas = mount(page, 'perihelion', {'veteran': True, 'seed': 99})
            brake_button = page.locator('[data-perihelion-brake]')
            rect = brake_button.bounding_box()
            assert canvas.bounding_box()['width'] <= 366
            assert rect['height'] >= 44 and rect['x'] >= 0 and rect['x'] + rect['width'] <= 390
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            canvas.click(button='right')
            right_click = current(page)
            assert right_click['brakesUsed'] == 1 and right_click['corona'] == 0
            assert right_click['skiff']['vy'] <= 0, 'right-click brake must not also hold dive'
            page.screenshot(path=str(OUT / 'perihelion-phone-brake.png'), animations='disabled')
            destroy(page)
            page.close()
            print('PASS: phone-width Veteran actions fit and right-click aerobrake does not stick dive input')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Combat mechanics regression passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
