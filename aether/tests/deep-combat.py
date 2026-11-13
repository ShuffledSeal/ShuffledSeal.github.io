"""Deep Veteran combat systems, full encounters, phone HUDs and lifecycle.

Run from the repository root (Python Playwright + Chromium required):
    python3 tests/deep-combat.py

The runner uses shipped create() fixtures for stable encounters, but plays every
mechanic through real keyboard, pointer, button or touch input. Diagnostics are
read-only: no health, entity, RNG, cooldown, route or clock state is injected.
"""
import http.server
import json
import math
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('/tmp/opencode/deep-combat')
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def mount(page, cartridge, options=None):
    page.evaluate('''({cartridge, options}) => {
        window.__deepGame?.destroy();
        window.__deepHost?.remove();
        const host = document.createElement('div');
        host.id = 'deep-combat-fixture';
        host.style.cssText = 'position:fixed;left:12px;top:12px;width:min(960px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;background:#070c16;z-index:10000';
        // Preserve the host app's menu DOM: app.js owns global closeMenu events.
        document.body.append(host);
        window.__deepHost = host;
        window.__deepEnds = [];
        const onEnd = result => window.__deepEnds.push(result);
        window.__deepGame = cartridge === 'skirmish'
            ? AetherSkirmish.create(host, {
                sector: 0, elite: false, endless: false, hull: 'bell', instruments: [],
                seed: 84021, difficulty: 'explorer', sound: false, ...options, onEnd,
            })
            : AetherTrials.create(cartridge, host, {sound: false, ...options, verbs: new Set(options.verbs || []), onEnd});
        const canvas = host.querySelector('canvas');
        canvas.style.maxWidth = '100%'; canvas.style.height = 'auto'; canvas.style.display = 'block';
    }''', {'cartridge': cartridge, 'options': options or {}})
    return page.locator('#deep-combat-fixture canvas')


def state(page):
    return page.evaluate('window.__deepGame ? window.__deepGame.state : null')


def advance(page, milliseconds):
    page.clock.run_for(milliseconds)


def wait_state(page, predicate, label, timeout=10000, step=50):
    elapsed = 0
    while elapsed <= timeout:
        current = state(page)
        if current is not None and predicate(current):
            return current
        advance(page, step)
        elapsed += step
    raise AssertionError(f'{label}; last state={json.dumps(current, sort_keys=True)}')


def destroy(page):
    page.evaluate('window.__deepGame?.destroy()')
    advance(page, 1400)
    assert page.evaluate('window.__deepEnds') == []
    assert page.locator('#deep-combat-fixture canvas, #deep-combat-fixture button').count() == 0


def point(canvas, x, y, width, height):
    box = canvas.bounding_box()
    assert box, 'game canvas must be visible'
    return box['x'] + box['width'] * x / width, box['y'] + box['height'] * y / height


def aim_hunt(page, canvas, target):
    page.mouse.move(*point(canvas, target['x'], target['y'], 960, 600))


def steer_chain(page, canvas, x, y):
    page.mouse.move(*point(canvas, x, y, 900, 560))


def drive_chain(page, canvas, x, y, duration=60):
    """Use actual WASD input for a short, deterministic steering correction."""
    current = state(page)
    dx, dy = x - current['head']['x'], y - current['head']['y']
    canvas.focus()
    horizontal = 'd' if dx > 4 else 'a' if dx < -4 else None
    vertical = 's' if dy > 4 else 'w' if dy < -4 else None
    if horizontal:
        page.keyboard.down(horizontal)
    if vertical:
        page.keyboard.down(vertical)
    advance(page, duration)
    if horizontal:
        page.keyboard.up(horizontal)
    if vertical:
        page.keyboard.up(vertical)


def hunt_bot(page, canvas, goal, timeout=60000):
    """Fight with actual armory/fire/dash/Cadenza controls and a slow weave."""
    canvas.focus()
    page.keyboard.down('j')
    elapsed = 0
    index = 0
    max_boss_stage = 0
    try:
        while elapsed <= timeout:
            current = state(page)
            if current is None or goal(current):
                return current, max_boss_stage
            assert current['hp'] > 0, f'hunt bot died: {current}'
            max_boss_stage = max(max_boss_stage, current.get('processionStage', 0))
            if current['phase'] == 'draft':
                # Number keys are draft choices too; never accidentally leave a
                # breather while a test is waiting for a more specific result.
                advance(page, 100); elapsed += 100; index += 1
                continue
            if current.get('boss'):
                max_boss_stage = max(max_boss_stage, current['boss'].get('phase', 0))
                target = current['boss']
            elif current['enemies']:
                target = min(current['enemies'], key=lambda e: math.hypot(e['x'] - current['player']['x'], e['y'] - current['player']['y']))
            else:
                target = {'x': 480, 'y': 180}
            aim_hunt(page, canvas, target)
            # Rotate actual armory buttons (which cannot double as draft number
            # shortcuts) to feed Consonance; Lance punishes the Bell at range.
            desired = 'lance' if current.get('boss') else 'pulse'
            if current['weapon'] != desired:
                page.locator(f'[data-skirmish-weapon="{desired}"]').click()
            if current.get('veteran') and current.get('consonance', 0) > 0 and current.get('cadenzaTime', 0) <= 0 and current['phase'] == 'combat':
                page.keyboard.press('r')
            key = ('w', 'd', 's', 'a')[(index // 5) % 4]
            attack = current.get('boss') or {}
            if attack.get('attackPhase') == 'windup' and attack.get('attack') in ('toll', 'antiphon'):
                # React to the same locked telegraph shown on canvas: move on a
                # perpendicular rather than faceting into the coming wedge.
                dodge = attack.get('attackAngle', 0) + math.pi / 2
                dx, dy = math.cos(dodge), math.sin(dodge)
                key = 'd' if abs(dx) > abs(dy) and dx > 0 else 'a' if abs(dx) > abs(dy) else 's' if dy > 0 else 'w'
            page.keyboard.down(key)
            advance(page, 100)
            page.keyboard.up(key)
            if index % 12 == 0 and current['phase'] == 'combat':
                canvas.press(' ')
            index += 1
            elapsed += 100
    finally:
        page.keyboard.up('j')
        for key in ('w', 'a', 's', 'd'):
            page.keyboard.up(key)
    raise AssertionError(f'hunt bot timed out; state={json.dumps(state(page), sort_keys=True)}')


def chain_bot(page, canvas, goal, timeout=60000, use_arts=True):
    """Use formation fire, Star Cast, Lattice and pointer steering only."""
    points = [(445, 100), (450, 450), (295, 280), (520, 105), (510, 445)]
    elapsed = 0
    index = 0
    max_boss_stage = 0
    while elapsed <= timeout:
        current = state(page)
        if current is None or goal(current):
            return current, max_boss_stage
        assert current['over'] == 0, f'chain bot broke: {current}'
        boss = next((e for e in current['enemies'] if e['kind'] == 'boss'), None)
        if boss:
            max_boss_stage = max(max_boss_stage, boss.get('stage', 0))
        # Read locked rays just as a player would: move perpendicular before
        # they go live. Recovery is second priority, ordinary orbiting third.
        head = current['head']
        threatening = [h for h in current['hazards'] if h['kind'] == 'beam']
        if threatening:
            origin = min(threatening, key=lambda h: max(0, h['warning']))
            candidates = []
            # Multi-spoke patterns cannot be dodged perpendicular to just one
            # ray: that aligns with its sibling. Pick the widest actual safe
            # lane around the shared origin, exactly what the telegraph shows.
            for spoke in range(24):
                angle = spoke / 24 * math.tau
                x = max(45, min(855, origin['x'] + math.cos(angle) * 220))
                y = max(80, min(490, origin['y'] + math.sin(angle) * 220))
                clearance = 9999
                for hazard in threatening:
                    rx, ry = x - hazard['x'], y - hazard['y']
                    along = rx * hazard['dx'] + ry * hazard['dy']
                    if along > 0:
                        clearance = min(clearance, abs(rx * hazard['dy'] - ry * hazard['dx']))
                travel = math.hypot(x - head['x'], y - head['y'])
                candidates.append((clearance - travel * .025, x, y))
            _, x, y = max(candidates)
            steer_chain(page, canvas, x, y)
        else:
            # Any visible mote can reweave a dangerously short chain, not only
            # the cast refund; waiting for a labelled refund was a bot leak.
            if current['links'] <= 3 and current['motes']:
                mote = min(current['motes'], key=lambda m: math.hypot(m['x'] - head['x'], m['y'] - head['y']))
                steer_chain(page, canvas, mote['x'], mote['y'])
            elif boss and boss.get('stage') == 2 and any(e['kind'] == 'deacon' for e in current['enemies']):
                # Auto-fire picks the nearest target. Stand off on the far side
                # of a Deacon so the ward itself, not the protected boss, takes
                # the formation volley and the next Star Cast.
                deacon = min((e for e in current['enemies'] if e['kind'] == 'deacon'), key=lambda e: math.hypot(e['x'] - head['x'], e['y'] - head['y']))
                dx, dy = deacon['x'] - boss['x'], deacon['y'] - boss['y']
                length = math.hypot(dx, dy) or 1
                steer_chain(page, canvas, max(50, min(850, deacon['x'] + dx / length * 82)), max(75, min(485, deacon['y'] + dy / length * 82)))
            else:
                x, y = points[(index // 8) % len(points)]
                steer_chain(page, canvas, x, y)
        canvas.focus()
        arts_enabled = use_arts(current) if callable(use_arts) else use_arts
        if current.get('veteran') and arts_enabled:
            if current['links'] >= 4 and current['castTime'] <= 0 and current['enemies']:
                canvas.press('q')
            links = current['linkPositions']
            live_beam = any(h['kind'] == 'beam' and h['warning'] <= 0 and any(abs((l['x'] - h['x']) * h['dy'] - (l['y'] - h['y']) * h['dx']) < h['width'] + 18 for l in links) for h in current['hazards'])
            contact = any(math.hypot(l['x'] - e['x'], l['y'] - e['y']) < e['r'] + 28 for l in links for e in current['enemies'])
            if current['dedication'] > 0 and current['latticeTime'] <= 0 and (live_beam or contact):
                canvas.press('e')
        advance(page, 75)
        elapsed += 75
        index += 1
    raise AssertionError(f'chain bot timed out; state={json.dumps(state(page), sort_keys=True)}')


def flight_input(page, target_y, duration=40, horizon=.32):
    current = state(page)
    predicted = current['skiff']['y'] + current['skiff']['vy'] * horizon
    if predicted < target_y - 2:
        page.keyboard.down(' ')
    else:
        page.keyboard.up(' ')
    advance(page, duration)


def flight_target(current, fork=False, avoid=True, vow='oxblood'):
    skiff = current['skiff']
    if fork and current['forks']:
        candidate = min((f for f in current['forks'] if not f['resolved']), key=lambda f: f['x'], default=None)
        if candidate and candidate['x'] < 590:
            return candidate['upper'] if vow == 'ivory' else candidate['lower']
    if avoid:
        beams = [o for o in current['obstacles'] if o['kind'] == 'beam']
        if beams:
            # Active and forthcoming lanes matter together; avoiding only the
            # next lock can steer directly through a beam that is already live.
            candidates = []
            for y in range(105, 456, 15):
                clearance = min(abs(y - o['y']) for o in beams)
                candidates.append((clearance - abs(y - skiff['y']) * .015, y))
            return max(candidates)[1]
        imminent = [o for o in current['obstacles'] if o['kind'] == 'censer' and 110 < o['x'] < 390]
        if imminent:
            o = min(imminent, key=lambda o: abs(o['x'] - skiff['x']))
            return 120 if o['y'] > 280 else 440
    approaching = [g for g in current['gates'] if g['x'] > skiff['x'] - 8 and not g['scored']]
    if approaching:
        gate = min(approaching, key=lambda g: g['x'])
        return gate['y'] + gate.get('vy', 0) * .32
    return 280


def choose_flight_via(page, vow):
    canvas = mount(page, 'perihelion', {'veteran': True, 'startAt': 17.5, 'speedScale': 1, 'seed': 'via-gap-outcome', 'verbs': ['cinder']})
    canvas.focus()
    for _ in range(900):
        current = state(page)
        assert not current['over'], current
        if current['routeChoices']:
            break
        flight_input(page, flight_target(current, fork=True, vow=vow), 25)
    else:
        raise AssertionError(f'{vow} fork was not reached: {state(page)}')
    chosen = state(page)
    assert chosen['vow'] == vow, chosen
    return canvas


def cross_via_offset(page, vow):
    """Cross 44.5px off centre: Ivory scores, Oxblood is safe but unscored."""
    before = state(page)['passed']
    key = None
    for _ in range(1400):
        current = state(page)
        assert not current['over'], current
        desired = [g for g in current['gates'] if g['pattern'] != 'drift' and g['x'] > current['skiff']['x'] - 30 and (g['gap'] > 54 if vow == 'ivory' else g['gap'] < 54)]
        if key is None and desired:
            gate = min(desired, key=lambda g: g['x'])
            key = (gate['pattern'], gate['pairOrder'], round(gate['baseY'], 4), gate['gap'])
        if key is None:
            flight_input(page, flight_target(current), 20)
            continue
        gate = next((g for g in current['gates'] if (g['pattern'], g['pairOrder'], round(g['baseY'], 4), g['gap']) == key), None)
        if gate is None:
            raise AssertionError(f'{vow} target left before its outcome resolved: {key}; {current}')
        # 44.5px is inside Oxblood's collision opening (46.44) but outside its
        # scoring opening (42.44). No impact mitigation is needed for this probe.
        offset_y = gate['y'] + 44.5
        flight_input(page, offset_y, 10, .08)
        if gate['x'] < 170:
            resolved = state(page)
            target = next((g for g in resolved['gates'] if (g['pattern'], g['pairOrder'], round(g['baseY'], 4), g['gap']) == key), None)
            if vow == 'ivory':
                assert resolved['passed'] > before, (before, key, resolved)
                assert target and target['scored'], (key, resolved)
            else:
                assert target and not target['scored'], (key, resolved)
                assert resolved['wingovers'] == 0 and resolved['wingPhases'] == 0, 'Oxblood offset must cross safely inside its collision opening without Wingover'
            return resolved
    raise AssertionError(f'{vow} gate did not resolve at 44.5px offset: {state(page)}')


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            def new_page(mobile=False):
                page = browser.new_page(
                    viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 1000},
                    reduced_motion='reduce', has_touch=mobile,
                )
                page.on('pageerror', lambda error: errors.append(str(error.stack or error)))
                page.goto(f'{base}/index.html#overview', wait_until='networkidle')
                page.clock.install()
                return page

            # Standard routes expose none of the transformative controls/roles.
            page = new_page()
            canvas = mount(page, 'skirmish', {'startAct': 4, 'seed': 6024})
            canvas.focus(); canvas.press('r'); advance(page, 2200)
            standard = state(page)
            assert standard['act'] == 1 and not standard['veteran']
            assert standard['cadenzaCount'] == 0 and standard['consonance'] == 0
            assert not any(e['kind'] == 'deacon' for e in standard['enemies'])
            assert page.locator('[data-skirmish-cadenza]').count() == 0
            destroy(page)
            canvas = mount(page, 'chain', {'seed': 6024})
            canvas.focus(); canvas.press('e'); advance(page, 100)
            assert state(page)['latticeCount'] == 0 and state(page)['dedication'] == 0
            assert page.locator('button[data-chain-lattice]').count() == 0
            destroy(page)
            canvas = mount(page, 'perihelion', {'seed': 6024, 'startAt': 48})
            canvas.focus(); canvas.press('q'); advance(page, 100)
            classic = state(page)
            assert classic['clock'] < 1 and classic['wingovers'] == 0 and classic['bossPhase'] == 0
            assert page.locator('[data-perihelion-wingover]').count() == 0
            destroy(page)
            page.close()
            print('PASS: standard campaigns, routes, inputs and teardown remain free of Veteran systems')

            # Classic Daily uses its own seeded gate position and timing stream.
            # Two identical runs must match exactly; a different seed must deal
            # a different chart while non-Daily Classic remains Math.random-based.
            page = new_page()
            page.evaluate('''() => {
                window.__dailyGames = ['classic-daily-repeat', 'classic-daily-repeat', 'classic-daily-other'].map((seed, index) => {
                    const host = document.createElement('div'); host.id = `classic-daily-${index}`;
                    document.body.append(host);
                    return AetherTrials.create('perihelion', host, {daily: true, seed, sound: false, onEnd() {}});
                });
            }''')
            advance(page, 1200)
            signatures = page.evaluate('''() => window.__dailyGames.map(game => {
                const current = game.state;
                return {gates: current.gates, gateTimer: current.gateTimer, skiff: current.skiff, speed: current.speed};
            })''')
            assert signatures[0] == signatures[1], signatures
            assert signatures[0]['gates'] != signatures[2]['gates'], signatures
            page.evaluate('window.__dailyGames.forEach(game => game.destroy())')
            page.close()
            print('PASS: same-seed classic Daily gates/timing are deterministic and seed-sensitive')

            # Consonance requires alternating real weapon hits. Cadenza spends
            # the bank, and switching to Lance changes its actual censer volley.
            page = new_page()
            canvas = mount(page, 'skirmish', {
                'veteran': True, 'startAct': 3, 'startRefit': 'procession', 'seed': 9137,
                'instruments': ['echo-plate', 'starforged-rail', 'tempest-fuse', 'aurora-siphon'],
            })
            canvas.focus(); canvas.press('m')
            boss = wait_state(page, lambda s: s.get('boss') and s['boss']['kind'] == 'procession', 'Ossuary Bell did not mount')
            assert state(page)['consonance'] == 1
            aim_hunt(page, canvas, state(page)['boss'])
            page.keyboard.down('j')
            wait_state(page, lambda s: s['boss'] and s['boss']['hp'] < s['boss']['maxHp'], 'Pulse did not hit the Bell')
            page.keyboard.up('j')
            canvas.press('4'); aim_hunt(page, canvas, state(page)['boss'])
            page.keyboard.down('j')
            combo = wait_state(page, lambda s: s['consonanceCombos'] >= 1, 'alternating Pulse/Mortar did not consonate', timeout=6000)
            page.keyboard.up('j')
            assert combo['consonance'] >= 2
            canvas.press('r')
            active = state(page)
            assert active['cadenzaCount'] == 1 and active['cadenzaTime'] > 3 and active['cadenzaPower'] >= 2
            assert active['consonance'] == 0
            canvas.press('3'); aim_hunt(page, canvas, state(page)['boss'])
            page.keyboard.down('j')
            wait_state(page, lambda s: s['cadenzaHits'] > 0, 'Cadenza Lance volley never dealt damage', timeout=4000)
            page.keyboard.up('j')
            canvas.press('p')
            frozen = state(page)
            advance(page, 500)
            assert state(page)['cadenzaTime'] == frozen['cadenzaTime']
            canvas.press('p')
            page.locator('#deep-combat-fixture').screenshot(path=str(OUT / 'skirmish-cadenza-bell.png'), animations='disabled')
            destroy(page)
            page.close()
            print('PASS: weapon-hit Consonance, spent Cadenza censers, live weapon switching and pause-safe cadence')

            # Ordinary fire must hard-stop at Toll II's seal. Two aimed Lance
            # hits credit both objectives; a third sever of the recharged same
            # Deacon remains mechanical but pays no second resource bounty.
            page = new_page()
            canvas = mount(page, 'skirmish', {'veteran': True, 'startAct': 3, 'startRefit': 'procession', 'seed': 9137})
            canvas.focus(); canvas.press('m')
            wait_state(page, lambda s: s.get('boss') and s['boss']['kind'] == 'procession', 'Bell tether fixture missing')
            aim_hunt(page, canvas, state(page)['boss']); page.keyboard.down('j')
            wait_state(page, lambda s: s.get('boss') and s['boss']['phase'] == 2 and sum(e['kind'] == 'deacon' for e in s['enemies']) == 2, 'Bell Deacons did not mount', timeout=16000)
            sealed = wait_state(page, lambda s: s['boss'] and s['boss']['hp'] <= s['boss']['maxHp'] * .320001, 'ordinary fire did not reach the Toll II seal', timeout=14000)
            page.keyboard.up('j')
            assert sealed['boss']['phase'] == 2 and not sealed['boss']['objectiveOpen'], sealed
            assert sealed['tetherSevers'] == 0 and sealed['processionSevers'] == 0, sealed
            assert sum(e['kind'] == 'deacon' and e['hp'] > 0 for e in sealed['enemies']) == 2, sealed
            advance(page, 500)
            assert state(page)['boss']['phase'] == 2 and state(page)['boss']['hp'] == sealed['boss']['hp'], 'ordinary ward damage must not leak through the seal'
            canvas.press('3'); aim_hunt(page, canvas, state(page)['boss']); page.keyboard.down('j')
            severed = wait_state(page, lambda s: s['processionSevers'] == 2 and s['boss'] and s['boss']['phase'] == 3, 'two Deacons were not credited before Toll III', timeout=7000)
            page.keyboard.up('j')
            assert severed['tetherSevers'] >= 2 and severed['tetherRewards'] == 2, severed
            assert all(e['bellSevered'] for e in severed['enemies'] if e['kind'] == 'deacon'), severed
            # Let the first Deacon recharge. Its next sever must not create a
            # third Consonance bounty or a duplicate Bell objective credit.
            wait_state(page, lambda s: any(e['kind'] == 'deacon' and e['severRewarded'] and e['tetherBroken'] <= 0 for e in s['enemies']), 'severed Deacon did not recharge', timeout=6000)
            aim_hunt(page, canvas, state(page)['boss']); page.keyboard.down('j')
            repeated = wait_state(page, lambda s: s['tetherSevers'] >= 3, 'recharged tether did not sever again', timeout=6000)
            page.keyboard.up('j')
            assert repeated['tetherRewards'] == 2 and repeated['processionSevers'] == 2, repeated
            destroy(page); page.close()
            print('PASS: Toll II hard seal, two-objective Toll III unlock and repeat-sever bounty guard')

            # Choose the actual Black Procession refit after Act II, clear all
            # three Bell stages and its support packet, then reach the safe draft.
            page = new_page()
            canvas = mount(page, 'skirmish', {
                'veteran': True, 'startAct': 2, 'seed': 84021,
                'instruments': ['echo-plate', 'starforged-rail', 'tempest-fuse', 'aurora-siphon', 'rime-coating', 'cinder-valve'],
            })
            canvas.focus(); canvas.press('m')
            hunt_bot(page, canvas, lambda s: s['phase'] == 'draft', timeout=55000)
            route = page.locator('[data-skirmish-refit="procession"]')
            assert route.is_visible()
            route.click()
            assert state(page)['refit'] == 'procession'
            cleared, stages = hunt_bot(page, canvas, lambda s: s['phase'] == 'draft' and s['processionClears'] == 1, timeout=65000)
            assert stages == 3, f'not all Ossuary Bell stages were seen: {stages}'
            assert cleared['dust'] >= 45
            assert page.evaluate('window.__deepEnds') == [], 'optional Act III must not end the whole hunt'
            page.locator('#deep-combat-fixture').screenshot(path=str(OUT / 'skirmish-procession-cleared.png'), animations='disabled')
            destroy(page)
            page.close()
            print('PASS: real Oxblood route refit, Deacon tether counterplay, three-stage Ossuary Bell clear and reward')

            # Cross a normal moving Deacon tether after its arrival grace. Follow
            # the endpoints every tick rather than fighting auto-fire timing.
            page = new_page()
            canvas = mount(page, 'chain', {'veteran': True, 'startEncounter': 2, 'speedScale': .35, 'seed': 6024})
            page.locator('button[data-chain-formation="ribbon"]').click()
            page.locator('[data-chain-start]').click()
            tether = wait_state(page, lambda s: any(e['kind'] == 'deacon' and e['mode'] == 'channel' and e['tetherTarget'] for e in s['enemies']), 'normal Deacon never tethered', timeout=7000)
            for _ in range(120):
                current = state(page)
                if current['tetherSevers'] >= 1:
                    break
                deacon = next(e for e in current['enemies'] if e['kind'] == 'deacon' and e['tetherTarget'])
                target = deacon['tetherTarget']
                dx, dy = deacon['x'] - target['x'], deacon['y'] - target['y']
                length = math.hypot(dx, dy) or 1
                drive_chain(page, canvas, deacon['x'] + dx / length * 50, deacon['y'] + dy / length * 50, 60)
            else:
                raise AssertionError(f'WASD never intersected the normal moving tether: {state(page)}')
            severed = state(page)
            assert severed['tetherRewards'] == 1 and severed['dedication'] >= 2, severed
            corners = [(55, 75), (845, 75), (55, 490), (845, 490)]
            deacon_now = next(e for e in severed['enemies'] if e['kind'] == 'deacon' and e['severRewarded'])
            safe_corner = max(corners, key=lambda p: math.hypot(p[0] - deacon_now['x'], p[1] - deacon_now['y']))
            steer_chain(page, canvas, *safe_corner)
            wait_state(page, lambda s: any(e['kind'] == 'deacon' and e['severRewarded'] and e['tetherBroken'] <= 0 for e in s['enemies']), 'normal Deacon did not recharge', timeout=6500)
            before_repeat = state(page)['tetherRewards']
            for _ in range(140):
                current = state(page)
                if current['tetherSevers'] >= 2:
                    break
                deacon = next((e for e in current['enemies'] if e['kind'] == 'deacon' and e['severRewarded']), None)
                assert deacon is not None, current
                drive_chain(page, canvas, deacon['x'], deacon['y'], 60)
            else:
                raise AssertionError(f'reformed normal tether did not sever again: {state(page)}')
            repeated = state(page)
            assert repeated['tetherRewards'] == before_repeat, repeated
            destroy(page); page.close()
            print('PASS: moving Deacon tether intersections and repeat-sever Dedication guard')

            # Blur uses the shared pause lifecycle but must also clear Chain's
            # pointer target. Resume stays stationary until a genuinely new input.
            page = new_page()
            canvas = mount(page, 'chain', {'seed': 6024})
            page.locator('[data-chain-start]').click()
            steer_chain(page, canvas, 790, 445)
            advance(page, 450)
            page.evaluate('window.dispatchEvent(new Event("blur"))')
            assert page.evaluate('window.__deepGame.paused') is True
            stopped = state(page)['head']
            page.evaluate('window.__deepGame.resume()')
            advance(page, 550)
            assert state(page)['head'] == stopped, (stopped, state(page)['head'])
            steer_chain(page, canvas, 110, 115)
            advance(page, 350)
            assert state(page)['head'] != stopped, 'fresh pointer input must still steer after resume'
            destroy(page); page.close()
            print('PASS: Chain blur clears stale pointer/held input and resume waits for fresh steering')

            # A warned Unraveller ray is cut by the actual E Link Lattice, not
            # merely recoloured. Halo's real links provide the cutting geometry.
            page = new_page()
            canvas = mount(page, 'chain', {'veteran': True, 'startEncounter': 4, 'speedScale': .35, 'seed': 99})
            page.locator('button[data-chain-formation="halo"]').click()
            page.locator('[data-chain-start]').click()
            boss = wait_state(page, lambda s: any(e['kind'] == 'boss' for e in s['enemies']), 'Unraveller missing')
            boss_ent = next(e for e in boss['enemies'] if e['kind'] == 'boss')
            steer_chain(page, canvas, boss_ent['x'], boss_ent['y'])
            wait_state(page, lambda s: len(s['hazards']) >= 3, 'ascendant braid did not telegraph', timeout=8000)
            canvas.focus(); canvas.press('e')
            assert state(page)['latticeCount'] == 1 and state(page)['dedication'] == 0
            wait_state(page, lambda s: s['latticeSevers'] >= 1, 'Link Lattice did not cut a live braid', timeout=3000, step=40)
            destroy(page)
            page.close()
            print('PASS: keyboard Link Lattice spends Dedication and severs a real warned boss beam')

            # Start at the second authored encounter, choose Oxblood at the real
            # route draft, fight its added packet and collect the clear tithe.
            page = new_page()
            canvas = mount(page, 'chain', {'veteran': True, 'startEncounter': 1, 'speedScale': .35, 'seed': 6024})
            page.locator('button[data-chain-formation="spear"]').click()
            page.locator('[data-chain-start]').click()
            chain_bot(page, canvas, lambda s: s['phase'] == 'draft', timeout=55000)
            assert page.locator('[data-chain-choice="via-ivory"]').is_visible()
            page.locator('[data-chain-choice="via-oxblood"]').click()
            assert state(page)['routeVow'] == 'oxblood'
            reinforced = wait_state(page, lambda s: s['elapsed'] > 1.3 and sum(e['kind'] == 'deacon' for e in s['enemies']) >= 2, 'Oxblood packet did not arrive')
            assert sum(e['kind'] == 'drift' for e in reinforced['enemies']) >= 2
            route_clear, _ = chain_bot(page, canvas, lambda s: s['phase'] == 'draft' and s['routeBonus'] >= 250, timeout=60000)
            assert route_clear['routeBonus'] == 250
            destroy(page)
            page.close()
            print('PASS: real Via draft, Oxblood support/drift reinforcement and exactly one 250-point clear tithe')

            # Ordinary formation fire cannot leak a Black Office clear. Only
            # after both Deacon objectives open does boss HP move again.
            page = new_page()
            canvas = mount(page, 'chain', {'veteran': True, 'startEncounter': 4, 'startBossStage': 2, 'speedScale': .35, 'seed': 99})
            page.locator('button[data-chain-formation="halo"]').click()
            page.locator('[data-chain-start]').click()
            steer_chain(page, canvas, 250, 270)
            locked = wait_state(page, lambda s: s['bossWarded'] and not s['bolts'] and s['latticeTime'] <= 0 and sum(e['kind'] == 'deacon' and e['mode'] == 'channel' for e in s['enemies']) == 2, 'Black Office tethers did not become active with a quiet projectile field', timeout=3500, step=40)
            boss_ent = next(e for e in locked['enemies'] if e['kind'] == 'boss')
            page.locator('button[data-chain-formation="halo"]').click()
            steer_chain(page, canvas, boss_ent['x'], 80)
            advance(page, 1800)
            steer_chain(page, canvas, boss_ent['x'], boss_ent['y'] - 150)
            advance(page, 250)
            locked = state(page)
            assert locked['links'] > 0, locked
            assert locked['bossWarded'] and not locked['bossObjectiveOpen'], locked
            assert sum(e['kind'] == 'deacon' and e['hp'] > 0 for e in locked['enemies']) == 2, locked
            shots = locked['shotsFired']
            sealed = wait_state(page, lambda s: s['shotsFired'] > shots, 'fixture must actually fire ordinary formation bolts', timeout=3500, step=50)
            assert sealed['boss'] == locked['boss'], (locked['boss'], sealed)
            assert sealed['bossWarded'] and not sealed['bossObjectiveOpen'], sealed
            assert sum(e['kind'] == 'deacon' and e['hp'] > 0 for e in sealed['enemies']) == 2, sealed
            # Drive the remaining live objective to its sever/kill conclusion;
            # either advertised path must open damage, never the pre-open leak.
            for _ in range(140):
                current = state(page)
                if current['bossObjectiveOpen']:
                    break
                deacon = next((e for e in current['enemies'] if e['kind'] == 'deacon'), None)
                if deacon is None:
                    # Incidental fire may legitimately destroy the last Deacon
                    # between samples. Its objective opens on the next bossStep;
                    # require that transition rather than assuming a missing setup.
                    wait_state(page, lambda s: s['bossObjectiveOpen'], 'last Deacon vanished without a destroy-credit opening', timeout=500, step=40)
                    break
                steer_chain(page, canvas, deacon['x'], deacon['y'])
                advance(page, 40)
            else:
                raise AssertionError(f'Black Office objective never opened: {state(page)}')
            opened = wait_state(page, lambda s: s['bossObjectiveOpen'], 'Black Office did not open after its sever/kill objective', timeout=2500, step=40)
            destroy(page); page.close()
            print('PASS: Black Office zero-damage seal and sever/kill objective opening')

            # Complete the new Black Office objective and the whole ascendant
            # boss through actual formation/cast/lattice controls.
            page = new_page()
            canvas = mount(page, 'chain', {'veteran': True, 'startEncounter': 4, 'speedScale': .35, 'seed': 6024})
            page.locator('button[data-chain-formation="spear"]').click()
            page.locator('[data-chain-start]').click()
            won, stages = chain_bot(page, canvas, lambda s: s['over'] != 0, timeout=75000)
            advance(page, 1100)
            results = page.evaluate('window.__deepEnds')
            assert stages == 2, f'Black Office was not reached: {stages}'
            assert len(results) == 1 and results[0]['won'] is True, f'ascendant boss clear failed: {results}; {won}'
            assert won['bossTransitions'] == 1
            advance(page, 1600)
            assert len(page.evaluate('window.__deepEnds')) == 1
            page.close()
            print('PASS: complete two-stage Unraveller/Black Office clear with exactly-once callback and teardown')

            # Wingover shares Corona with Aerobrake, reverses vertical motion,
            # and phases an actual locked Solar Verger beam through Q input.
            page = new_page()
            canvas = mount(page, 'perihelion', {'veteran': True, 'startAt': 48, 'speedScale': .25, 'seed': 'wing-beam'})
            canvas.focus(); canvas.press('q')
            launched = state(page)
            assert launched['wingovers'] == 1 and launched['corona'] == 0 and launched['wingTime'] > 0
            assert launched['skiff']['vy'] > 0, launched
            destroy(page)
            canvas = mount(page, 'perihelion', {'veteran': True, 'startAt': 48, 'speedScale': .25, 'seed': 'wing-beam'})
            canvas.focus()
            # Hold a steady centre line until Liturgy II locks that height.
            for _ in range(1200):
                current = state(page)
                assert not current['over'], current
                beam = next((o for o in current['obstacles'] if o['kind'] == 'beam'), None)
                if beam and beam['warning'] > 0 and abs(current['skiff']['y'] - beam['y']) < 11 and 0 < beam['warning'] < .035:
                    canvas.press('q')
                    winged = state(page)
                    assert winged['wingovers'] == 1 and winged['corona'] == 0 and winged['wingTime'] > 0
                    break
                flight_input(page, beam['y'] if beam else 280, 5 if beam and beam['warning'] < .2 else 25)
            else:
                raise AssertionError(f'Verger never produced a Wingover fixture: {state(page)}')
            phased = wait_state(page, lambda s: s['wingPhases'] == 1, 'Wingover did not phase the real beam', timeout=1000, step=20)
            assert phased['over'] == 0
            destroy(page)
            page.close()
            print('PASS: Q Wingover spends shared Corona, reverses flight and phases a real locked Verger beam')

            # Fly through the lower armillary fork using the normal climb/dive
            # key. The resulting gates really narrow and carry bonus route score.
            page = new_page()
            canvas = mount(page, 'perihelion', {'veteran': True, 'startAt': 17.5, 'speedScale': .25, 'seed': 'via-fork'})
            canvas.focus()
            for _ in range(800):
                current = state(page)
                assert not current['over'], current
                if current['routeChoices']:
                    break
                flight_input(page, flight_target(current, fork=True), 30)
            chosen = state(page)
            assert chosen['vow'] == 'oxblood' and chosen['routeBonus'] == 200, chosen
            for _ in range(400):
                narrowed = state(page)
                if any(g['gap'] < 54 for g in narrowed['gates']):
                    break
                assert not narrowed['over'], narrowed
                flight_input(page, flight_target(narrowed), 30)
            else:
                raise AssertionError(f'Oxblood did not narrow subsequent gates: {state(page)}')
            assert narrowed['routeBonus'] == 200
            page.locator('#deep-combat-fixture').screenshot(path=str(OUT / 'perihelion-oxblood-fork.png'), animations='disabled')
            destroy(page)
            page.close()
            print('PASS: keyboard climb/dive control selects Oxblood fork, narrows real gates and pays route score')

            # The same 44.5px offset scores on Ivory and is a safe but unscored
            # crossing on Oxblood. Actual gate geometry and score agree.
            page = new_page()
            choose_flight_via(page, 'ivory')
            ivory = cross_via_offset(page, 'ivory')
            assert ivory['routeBonus'] == 0 and ivory['corona'] >= 2, ivory
            destroy(page)
            choose_flight_via(page, 'oxblood')
            oxblood = cross_via_offset(page, 'oxblood')
            assert oxblood['routeBonus'] == 200, oxblood
            destroy(page)
            page.close()
            print('PASS: Ivory/Oxblood collision and scoring use each gate’s real gap at an identical off-centre crossing')

            # Outlast all three authored Solar Verger liturgies and reach the
            # sixty-second clear. Fixed time continues through any braking.
            page = new_page()
            canvas = mount(page, 'perihelion', {'veteran': True, 'startAt': 48, 'speedScale': .25, 'seed': 'verger-clear'})
            canvas.focus()
            seen = 0
            for _ in range(900):
                current = state(page)
                if current is None or current['over']:
                    break
                seen = max(seen, current['bossPhase'])
                # Spend the starting charge on a real emergency, never via a
                # state shortcut; otherwise use ordinary climb/dive positioning.
                danger = next((o for o in current['obstacles'] if o['kind'] == 'beam' and 0 < o['warning'] < .1 and abs(o['y'] - current['skiff']['y']) < 28), None)
                if danger and current['corona'] > 0 and current['wingTime'] <= 0:
                    canvas.press('q')
                flight_input(page, flight_target(current), 30)
            advance(page, 1000)
            results = page.evaluate('window.__deepEnds')
            assert seen == 3, f'not all Verger stages seen: {seen}; results={results}; state={state(page)}'
            assert len(results) == 1 and results[0]['won'] is True, f'Verger clear failed: {results}; {state(page)}'
            advance(page, 1200)
            assert len(page.evaluate('window.__deepEnds')) == 1
            page.close()
            print('PASS: complete three-stage Solar Verger survival clear and exactly-once ending')

            # 390px touch: every new action is tappable, essential HUD resources
            # stay at a real 14px in DOM, canvases do not overflow, and screenshots
            # capture the actual games rather than synthetic mockups.
            page = new_page(mobile=True)
            canvas = mount(page, 'skirmish', {'veteran': True, 'startAct': 3, 'startRefit': 'procession', 'seed': 99, 'instruments': ['lodestone-coil']})
            wait_state(page, lambda s: s['phase'] == 'combat', 'phone hunt did not start')
            dash = page.locator('[data-skirmish-dash]')
            assert dash.is_visible() and dash.bounding_box()['height'] >= 44
            before_dash = state(page)
            dash.tap()
            advance(page, 70)
            dashed = state(page)
            assert dashed['dashCount'] == 1 and dashed['wells'] == 1, dashed
            assert math.hypot(dashed['player']['x'] - before_dash['player']['x'], dashed['player']['y'] - before_dash['player']['y']) > 20, (before_dash['player'], dashed['player'])
            assert dashed['player']['invuln'] > 0 and dashed['player']['burstT'] > 0, dashed['player']
            assert dashed['weapon'] == before_dash['weapon'], 'Dash must not disturb armory/pilot state'
            cadenza = page.locator('[data-skirmish-cadenza]')
            assert cadenza.is_visible() and cadenza.bounding_box()['height'] >= 44
            cadenza.tap()
            assert state(page)['cadenzaCount'] == 1
            hud = page.locator('[data-skirmish-tactical]')
            assert hud.is_visible() and float(hud.evaluate('(e) => getComputedStyle(e).fontSize.slice(0, -2)')) >= 14
            assert 'Consonance' in hud.inner_text() and 'Cadenza' in hud.inner_text() and 'Dash' in hud.inner_text()
            assert canvas.bounding_box()['width'] <= 366 and page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#deep-combat-fixture').screenshot(path=str(OUT / 'skirmish-390.png'), animations='disabled')
            destroy(page)

            canvas = mount(page, 'chain', {'veteran': True, 'startEncounter': 4, 'speedScale': .35, 'seed': 99})
            page.locator('[data-chain-start]').tap()
            lattice = page.locator('button[data-chain-lattice]')
            assert lattice.is_visible() and lattice.bounding_box()['height'] >= 44
            lattice.tap()
            assert state(page)['latticeCount'] == 1
            hud = page.locator('[data-chain-tactical]')
            assert hud.is_visible() and float(hud.evaluate('(e) => getComputedStyle(e).fontSize.slice(0, -2)')) >= 14
            assert 'Dedication' in hud.inner_text() and 'Lattice' in hud.inner_text() and 'Star Cast' in hud.inner_text()
            assert canvas.bounding_box()['width'] <= 366 and page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#deep-combat-fixture').screenshot(path=str(OUT / 'chain-390.png'), animations='disabled')
            destroy(page)

            canvas = mount(page, 'perihelion', {'veteran': True, 'startAt': 48, 'speedScale': .25, 'seed': 99})
            wing = page.locator('[data-perihelion-wingover]')
            assert wing.is_visible() and wing.bounding_box()['height'] >= 44
            wing.tap()
            assert state(page)['wingovers'] == 1
            hud = page.locator('[data-perihelion-tactical]')
            assert hud.is_visible() and float(hud.evaluate('(e) => getComputedStyle(e).fontSize.slice(0, -2)')) >= 14
            assert 'Corona' in hud.inner_text() and 'Wingover' in hud.inner_text() and 'Solar Verger' in hud.inner_text()
            assert canvas.bounding_box()['width'] <= 366 and page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#deep-combat-fixture').screenshot(path=str(OUT / 'perihelion-390.png'), animations='disabled')
            destroy(page)
            page.close()
            print('PASS: 390px touch actions, 14px essential DOM HUDs, no overflow and real phone captures')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print(f'Deep combat regression passed with no uncaught browser exceptions. Captures: {OUT}')
    finally:
        server.shutdown()
        server.server_close()
