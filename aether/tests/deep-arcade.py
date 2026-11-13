"""Deep Masterwork arcade systems, finales, input and 390px presentation.

Run with developer-only Python Playwright:
    python3 tests/deep-arcade.py

Optional while iterating: DEEP_ARCADE_ONLY=merge|surf|dash|breaker|standard|touch
Captures default to /tmp/opencode/deep-arcade-390 (override with
DEEP_ARCADE_CAPTURE_DIR). Pilots use real rAF simulation and canvas input; no
score, entity, resource, phase, boss or RNG state is replaced by this suite.
"""
import http.server
import os
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CAPTURES = Path(os.environ.get('DEEP_ARCADE_CAPTURE_DIR', '/tmp/opencode/deep-arcade-390'))
ONLY = os.environ.get('DEEP_ARCADE_ONLY', '')
CAPTURES.mkdir(parents=True, exist_ok=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def mount(page, game, *, veteran=True, expedition=None, seed=42, css_width=350, relaxed=False):
    if expedition is None:
        expedition = game == 'dash'
    page.evaluate('''({game, veteran, expedition, seed, cssWidth, relaxed}) => {
      clearInterval(window.__pilotTimer);
      window.__game?.destroy();
      document.querySelector('#deep-arcade-probe')?.remove();
      const canvas = document.createElement('canvas');
      canvas.id = 'deep-arcade-probe'; canvas.tabIndex = 0;
      const [width, height] = AetherArcade.dimensions(game);
      canvas.style.cssText = `position:fixed;left:20px;top:20px;width:${cssWidth}px;height:${cssWidth * height / width}px;z-index:30;touch-action:none;background:#070c18`;
      document.body.append(canvas);
      window.__finishes = [];
      window.__game = AetherArcade.create(canvas, {
        game, veteran, expedition, seed, sound: false, relaxed,
        onUpdate: data => window.__data = data,
        onFinish: data => window.__finishes.push(data),
      });
      window.__game.start();
    }''', {'game': game, 'veteran': veteran, 'expedition': expedition, 'seed': seed, 'cssWidth': css_width, 'relaxed': relaxed})
    return page.locator('#deep-arcade-probe')


def data(canvas):
    return canvas.evaluate('(element) => Object.fromEntries(Object.entries(element.dataset))')


def number(current, key):
    return float(current.get(key) or 0)


def point(page, game, x, y=500):
    page.evaluate('''({game, x, y}) => {
      const canvas = document.querySelector('#deep-arcade-probe'), rect = canvas.getBoundingClientRect();
      const [width, height] = AetherArcade.dimensions(game);
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        pointerType: 'mouse', clientX: rect.left + x / width * rect.width,
        clientY: rect.top + y / height * rect.height,
      }));
    }''', {'game': game, 'x': x, 'y': y})


def world_point(page, game, x, y):
    return page.evaluate('''({game, x, y}) => {
      const canvas = document.querySelector('#deep-arcade-probe'), bounds = canvas.getBoundingClientRect();
      const [width, height] = AetherArcade.dimensions(game);
      return [bounds.left + x / width * bounds.width, bounds.top + y / height * bounds.height];
    }''', {'game': game, 'x': x, 'y': y})


def control_box(page, game, name):
    box = page.evaluate('''({game, name}) => {
      const canvas = document.querySelector('#deep-arcade-probe'), bounds = canvas.getBoundingClientRect();
      const [width, height] = AetherArcade.dimensions(game);
      const control = name === 'censer' ? window.__data.masterwork.censerControl : window.__data.masterwork.controls[name];
      if (!control) throw new Error(`missing control ${game}:${name}`);
      return {x: bounds.left + control.x / width * bounds.width, y: bounds.top + control.y / height * bounds.height,
        width: control.w / width * bounds.width, height: control.h / height * bounds.height};
    }''', {'game': game, 'name': name})
    assert box['width'] >= 44 and box['height'] >= 44, (game, name, box)
    return box


def tap_control(page, game, name):
    box = control_box(page, game, name)
    page.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def choose_relic(page, preferences=()):
    offer = page.evaluate('(window.__data.offer || []).map(relic => typeof relic === "string" ? relic : relic.id)')
    for relic in preferences:
        if relic in offer:
            page.evaluate('(id) => window.__game.applyRelic(id)', relic)
            return
    if offer:
        page.evaluate('(id) => window.__game.applyRelic(id)', offer[0])
    else:
        page.evaluate('window.__game.skipRelic()')


def overlap(a, b):
    width = min(a['x'] + a['w'], b['x'] + b['w']) - max(a['x'], b['x'])
    height = min(a['y'] + a['h'], b['y'] + b['h']) - max(a['y'], b['y'])
    return width > .75 and height > .75


def assert_phone_hud(page, canvas, game):
    current = data(canvas)
    bounds = canvas.bounding_box()
    width, height = page.evaluate('(game) => AetherArcade.dimensions(game)', game)
    assert current['hudCompact'] == 'true', current
    assert bounds['width'] == 350 and bounds['x'] == 20
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    diagnostic = canvas.evaluate('element => element.aetherHUD')
    assert diagnostic, (game, 'missing canvas HUD diagnostic')
    scale = diagnostic['backingToCss']
    effective = diagnostic['backingFontPx'] * scale
    assert diagnostic['cssFontPx'] == 14 and abs(effective - 14) <= .05, (game, effective, diagnostic)
    texts = diagnostic['texts']
    assert texts, (game, 'no measured essential HUD text')
    for entry in texts:
        assert abs(entry['font'] * scale - 14) <= .05, (game, entry['kind'], entry['text'], entry['font'] * scale)
        if entry['kind'] != 'world':
            assert entry['x'] >= -.75 and entry['y'] >= -.75, (game, 'HUD clipped top/left', entry)
            assert entry['x'] + entry['w'] <= width + .75 and entry['y'] + entry['h'] <= height + .75, (game, 'HUD clipped bottom/right', entry)
    controls = diagnostic['controls']
    for control in controls:
        assert control['w'] * scale >= 44 and control['h'] * scale >= 44, (game, 'control below 44 CSS px', control)
        for label in control['labels']:
            assert abs(label['font'] * scale - 14) <= .05, (game, control['name'], label['text'], label['font'] * scale)
            assert label['x'] >= control['x'] - .75 and label['y'] >= control['y'] - .75, (game, 'control label clipped top/left', control['name'], label)
            assert label['x'] + label['w'] <= control['x'] + control['w'] + .75, (game, 'control label clipped horizontally', control['name'], label)
            assert label['y'] + label['h'] <= control['y'] + control['h'] + .75, (game, 'control label clipped vertically', control['name'], label)
    statuses = [entry for entry in texts if entry['kind'] == 'status']
    narratives = [entry for entry in texts if entry['kind'] == 'narrative']
    for index, first in enumerate(statuses):
        for second in statuses[index + 1:]:
            assert not overlap(first, second), (game, 'essential HUD overlap', first['text'], second['text'])
        for control in controls:
            assert not overlap(first, control), (game, 'HUD/control overlap', first['text'], control['name'])
    for narrative in narratives:
        for first in statuses:
            assert not overlap(narrative, first), (game, 'narrative/HUD overlap', narrative['text'], first['text'])
        for control in controls:
            assert not overlap(narrative, control), (game, 'narrative/control overlap', narrative['text'], control['name'])
    for index, first in enumerate(controls):
        for second in controls[index + 1:]:
            assert not overlap(first, second), (game, 'control/control overlap', first['name'], second['name'])
    print(f"HUD {game}: {diagnostic['backingFontPx']:.3f} backing px × {scale:.6f} = {effective:.3f} CSS px; {len(statuses)} statuses, {len(controls)} controls, no overlap/clipping")


def capture(page, canvas, game, label):
    assert_phone_hud(page, canvas, game)
    path = CAPTURES / f'{game}-{label}-390.png'
    canvas.screenshot(path=str(path))
    assert path.stat().st_size > 2500, path
    print(f'CAPTURE 390x844 viewport / 350px canvas: {path}')


def destroy(page):
    page.evaluate('''() => {
      clearInterval(window.__pilotTimer);
      window.__game?.destroy();
      document.querySelector('#deep-arcade-probe')?.remove();
    }''')


def install_surf_pilot(page):
    page.evaluate('''() => {
      clearInterval(window.__pilotTimer);
      let space = false, orbit = 0, freeWait = 0;
      const canvas = () => document.querySelector('#deep-arcade-probe');
      const key = key => canvas().dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}));
      const hold = value => {
        if (value === space || !canvas()) return;
        const target = value ? canvas() : window;
        target.dispatchEvent(new KeyboardEvent(value ? 'keydown' : 'keyup', {key: ' ', bubbles: true}));
        space = value;
      };
      window.__pilotTimer = setInterval(() => {
        const c = canvas(); if (!c) return;
        if (c.dataset.phase !== 'running') { hold(false); return; }
        if (c.dataset.suspended === 'true') {
          hold(false);
          const offer = (window.__data.offer || []).map(relic => typeof relic === 'string' ? relic : relic.id);
          const id = ['comet-aegis', 'ring-compass', 'solar-spool', 'longwave-tether', 'ring-reactor', 'moon-sail'].find(id => offer.includes(id));
          id ? window.__game.applyRelic(id) : window.__game.skipRelic(); return;
        }
        const d = c.dataset, n = key => Number(d[key]) || 0, hunterThreat = d.hunterState === 'aim' || d.hunterState === 'dive';
        const gateDistance = n('surfGateX') - n('shipX');
        const gateThreat = gateDistance > 0 && gateDistance < (d.tethered === 'true' ? 55 : 145) && Math.abs(n('shipY') - n('surfGateY')) > n('surfGateGap') / 2 - 20;
        const planetThreat = n('surfPlanetX') >= n('shipX') - 10 && Math.hypot(n('surfPlanetX') - n('shipX'), n('surfPlanetY') - n('shipY')) < n('surfPlanetR') + 62;
        const boundaryThreat = (n('shipY') < 120 && n('shipVY') < 0) || (n('shipY') > 440 && n('shipVY') > 0);
        const hunterRange = Math.abs(n('hunterX') - n('shipX')) < (d.hunterState === 'dive' ? 520 : 180);
        const hunterVeil = (d.hunterState === 'dive' || d.hunterState === 'aim') && hunterRange;
        const veilThreat = hunterVeil || planetThreat || boundaryThreat || (gateThreat && d.surfBossStage !== '1');
        if (veilThreat && n('surfCharge') >= 25 && n('surfVeil') <= 0) key('e');
        if (d.tethered === 'true') {
          orbit++;
          const gateGuided = gateDistance > 0 && gateDistance < 450;
          const gateOpeningY = d.surfGate === 'CROWNED PILLAR' && n('nextRingY') ? n('nextRingY') : n('surfGateY');
          const desiredY = gateGuided ? gateOpeningY : n('nextRingY') || n('surfGateY') || n('shipY');
          const desiredX = gateGuided ? n('surfGateX') : n('nextRingX') || n('surfGateX') || n('shipX') + 200;
          const flightTime = Math.max(.25, (desiredX - n('shipX')) / Math.max(200, n('shipVX')));
          const requiredVy = Math.max(-270, Math.min(270, (desiredY - n('shipY')) / flightTime));
          const aligned = orbit >= 6 && Math.abs(n('shipVY') - requiredVy) < 62;
          const inward = !((n('shipY') < 105 && n('shipVY') < 0) || (n('shipY') > 455 && n('shipVY') > 0));
          if ((hunterThreat && n('surfVeil') <= 0) || ((aligned || orbit >= 30) && (inward || orbit >= 48))) {
            hold(false); freeWait = 50; orbit = 0;
          } else hold(true);
        } else {
          hold(false);
          if (freeWait > 0) freeWait--;
          else if (gateDistance > 0 && gateDistance < 280) freeWait = 5;
          else if (d.starhookReady === 'true' && n('surfCharge') >= 85 && !hunterThreat) key('x');
          else hold(true);
        }
        const rect = c.getBoundingClientRect();
        c.dispatchEvent(new PointerEvent('pointermove', {pointerType: 'mouse', clientX: rect.left + 450 / 900 * rect.width, clientY: rect.top + 280 / 560 * rect.height}));
      }, 40);
    }''')


def install_breaker_pilot(page, *, simple=False):
    page.evaluate('''(simple) => {
      clearInterval(window.__pilotTimer);
      window.__pilotTimer = setInterval(() => {
        const canvas = document.querySelector('#deep-arcade-probe');
        if (!canvas) return;
        if (canvas.dataset.suspended === 'true') {
          const offer = (window.__data.offer || []).map(relic => typeof relic === 'string' ? relic : relic.id);
          const id = ['twin-comet', 'shatterglass', 'dense-core', 'return-sigil', 'crescent-crown', 'chrono-coil'].find(id => offer.includes(id));
          id ? window.__game.applyRelic(id) : window.__game.skipRelic();
          return;
        }
        const d = canvas.dataset;
        let x = Number(d.cometX) || 450, y = Number(d.cometY) || 280;
        if (d.choirStatus === 'incoming') {
          const bx = Number(d.choirBoltX) || x, by = Number(d.choirBoltY) || y;
          if (window.__data.charge >= 40 && Number(d.censerTime) <= 0) canvas.dispatchEvent(new KeyboardEvent('keydown', {key: 'e', bubbles: true}));
          else if (Math.hypot(bx - 450, by - 280) > 190) { x = bx; y = by; }
        } else if (Number(d.cathedralAlive) > 0 && window.__data.charge >= (Number(d.cathedralAlive) <= 4 ? 40 : 45) && Number(d.censerTime) <= 0) {
          canvas.dispatchEvent(new KeyboardEvent('keydown', {key: 'e', bubbles: true}));
        }
        const cx = Number(d.cometX) || 450, cy = Number(d.cometY) || 280, vx = Number(d.cometVX) || 0, vy = Number(d.cometVY) || 0;
        const tx = Number(d.cathedralAimX) || 0, ty = Number(d.cathedralAimY) || 0, focus = Number(d.cometFocus) || 0;
        const needsCharge = Number(d.cathedralAlive) <= 4 && Number(d.censerTime) <= 0 && window.__data.charge < 40;
        const wantsLine = !simple && tx && !needsCharge && (d.cathedralBossStage !== '2' || focus >= 2);
        if (wantsLine && Math.hypot(cx - 450, cy - 280) > 120 && (cx - 450) * vx + (cy - 280) * vy > 0) {
          const a = Math.atan2(cy - 280, cx - 450), desired = Math.atan2(ty - 280, tx - 450);
          let offset = Math.atan2(Math.sin((a + Math.PI) - desired), Math.cos((a + Math.PI) - desired)) / .8;
          const limit = focus >= 2 ? .11 : .30; offset = Math.max(-limit, Math.min(limit, offset));
          x = 450 + Math.cos(a + offset) * 235; y = 280 + Math.sin(a + offset) * 235;
        }
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new PointerEvent('pointermove', {pointerType: 'mouse', clientX: rect.left + x / 900 * rect.width, clientY: rect.top + y / 560 * rect.height}));
      }, 32);
    }''', simple)


def install_dash_pilot(page, *, lit_only=False, auto_bank=True):
    page.evaluate('''({litOnly, autoBank}) => {
      clearInterval(window.__pilotTimer);
      const key = key => document.querySelector('#deep-arcade-probe').dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}));
      window.__pilotTimer = setInterval(() => {
        const canvas = document.querySelector('#deep-arcade-probe');
        if (!canvas) return;
        if (canvas.dataset.suspended === 'true') {
          const offer = (window.__data.offer || []).map(relic => typeof relic === 'string' ? relic : relic.id);
          const id = ['star-aegis', 'lodestone', 'ion-cell', 'afterimage', 'second-hand'].find(id => offer.includes(id));
          id ? window.__game.applyRelic(id) : window.__game.skipRelic();
          return;
        }
        const d = canvas.dataset, n = key => Number(d[key]) || 0;
        let target = n('nextStarX') || n('umbraLightX') || 450, fire = false;
        const meteorX = n('nextMeteorX'), meteorY = n('nextMeteorY'), catcher = n('catcherX');
        if (litOnly && d.dashChapter === 'UMBRA VEIL') { target = n('umbraLightX') || 450; }
        else if (n('activeShades') > 0 && n('shadeY') > 280) { target = n('shadeX'); fire = n('shadeY') > 435; }
        else if (n('activeMoths') > 0 && n('mothY') > 300) { target = n('mothX'); fire = n('mothY') > 435; }
        else if (n('umbraStarY') > 70) { target = n('umbraStarX'); fire = d.umbraStarLit === 'false' && n('umbraStarY') > 450; }
        else if (meteorY > 300 && Math.abs(meteorX - target) < 85) target = meteorX < 450 ? 820 : 80;
        if (meteorY > 390 && Math.abs(meteorX - catcher) < 80) { target = meteorX < 450 ? 820 : 80; fire = true; }
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new PointerEvent('pointermove', {pointerType: 'mouse', clientX: rect.left + target / 900 * rect.width, clientY: rect.top + 500 / 560 * rect.height}));
        if (fire && window.__data.charge >= 100) key('x');
        if ((autoBank && n('whaleCaught') > 0) || (n('activeMoths') > 0 && window.__data.combo >= 8)) key('e');
        if (Math.abs(n('dashTide')) > 20 && n('umbraLumen') > 25 && meteorY < 280) canvas.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}));
        else window.dispatchEvent(new KeyboardEvent('keyup', {key: 's', bubbles: true}));
      }, 40);
    }''', {'litOnly': lit_only, 'autoBank': auto_bank})


def run_merge_finale(page, canvas):
    boss_captured = telegraph_captured = False
    for _ in range(190):
        current = data(canvas)
        if current['suspended'] == 'true':
            choose_relic(page, ('quake-core', 'pulse-dynamo', 'echo-hourglass'))
            page.clock.run_for(100)
            continue
        if current['phase'] == 'over':
            break
        if current['mergeBossStage'] != '' and not boss_captured:
            capture(page, canvas, 'merge', 'horologist')
            boss_captured = True
        if current['mergeBossStage'] != '' and not telegraph_captured and current['mergeBossTelegraph'] != 'true':
            page.clock.run_for(150)
            continue
        if current['mergeBossTelegraph'] == 'true':
            if not telegraph_captured:
                capture(page, canvas, 'merge', 'toll-telegraph')
                telegraph_captured = True
            page.keyboard.down('s')
        else:
            page.keyboard.up('s')
        if int(current['mergeEnemies']) > 0 and page.evaluate('window.__data.charge') >= 100:
            canvas.press('x')
            page.clock.run_for(80)
            continue
        target = number(current, 'mergeDropTargetX') or number(current, 'tuneTargetX') or 240
        point(page, 'merge', target, 80)
        if not current['mergeDropTargetX'] and int(current['mergeResonance']) >= 30:
            canvas.press('e')
        canvas.press('Space')
        page.clock.run_for(680)
    page.keyboard.up('s')
    current = data(canvas)
    finishes = page.evaluate('window.__finishes')
    assert boss_captured and telegraph_captured, current
    assert len(finishes) == 1 and 'Horologist' in finishes[0]['result'], (current, finishes)
    assert int(current['mergeShelfContacts']) > 0 and int(current['mergeTunedDrops']) > 0, current
    assert int(current['mergeKills']) > 0 and int(current['mergeEnemies']) <= 3, current
    print('PASS: Planet Drop Tune, shelves, gargoyle counterplay and all three Horologist movements at 390px')


def run_surf_finale(page, canvas):
    # Fair restarts are part of the cartridge contract. Try several authored
    # courses rather than weakening a boss or injecting a winning state.
    seeds = [73, 1, 4, 11, 21, 13, 99]
    last = None
    for attempt, seed in enumerate(seeds, 1):
        if attempt > 1:
            canvas = mount(page, 'hop', seed=seed)
        install_surf_pilot(page)
        boss_captured = hunter_captured = False
        for _ in range(600):
            page.clock.run_for(200)
            current = data(canvas)
            if current['surfBossStage'] != '' and not boss_captured:
                capture(page, canvas, 'surf', 'regent')
                boss_captured = True
            if current['hunterState'] == 'aim' and not hunter_captured:
                capture(page, canvas, 'surf', 'hunter-telegraph')
                hunter_captured = True
            if current['phase'] == 'over':
                break
        page.evaluate('clearInterval(window.__pilotTimer)')
        current = data(canvas)
        finishes = page.evaluate('window.__finishes')
        last = (current, finishes)
        if len(finishes) == 1 and 'Regent' in finishes[0]['result']:
            assert boss_captured and hunter_captured, current
            assert number(current, 'surfCurrentTime') > 0 and int(current['surfVeilBreaks']) > 0, current
            assert int(current['surfHunterReflections']) >= 1 and int(current['regentHunterCrown']) == 1, current
            assert int(current['surfHunters']) <= 3 and int(current['surfBossRings']) > 0, current
            print(f'PASS: Comet Surf currents, Mirror Veil, hunters and all three Regent crowns at 390px (attempt {attempt}, seed {seed})')
            return
    raise AssertionError(f'Regent was not completed in {len(seeds)} real attempts: {last}')


def run_dash_finale(page, canvas):
    install_dash_pilot(page, lit_only=True, auto_bank=False)
    boss_captured = moth_captured = tide_captured = False
    keyboard_banks = 0
    for _ in range(340):
        page.clock.run_for(1000)
        current = data(canvas)
        if number(current, 'whaleCaught') > 0 and current['suspended'] == 'false':
            canvas.press('e')
            keyboard_banks += 1
            page.clock.run_for(60)
            current = data(canvas)
        if not tide_captured and abs(number(current, 'dashTide')) > 20:
            capture(page, canvas, 'dash', 'tide')
            tide_captured = True
        if not moth_captured and int(current['activeMoths']) > 0:
            capture(page, canvas, 'dash', 'moth')
            moth_captured = True
        if current['whaleStage'] != '' and not boss_captured:
            capture(page, canvas, 'dash', 'whale-choir')
            boss_captured = True
        if current['phase'] == 'over':
            break
    page.evaluate('clearInterval(window.__pilotTimer)')
    current = data(canvas)
    finishes = page.evaluate('window.__finishes')
    assert tide_captured and moth_captured and boss_captured, current
    assert len(finishes) == 1 and 'three offerings' in finishes[0]['result'], (current, finishes)
    assert keyboard_banks >= 1, current
    assert int(current['dashBanks']) >= 3 and int(current['dashBankedStars']) >= 12, current
    assert int(current['activeMoths']) <= 3 and int(current['dashMothsBroken']) + int(current['dashMothThefts']) > 0, current
    print('PASS: Stardust Dash tides, anchor, banking, moths and all three Whale Choir offerings at 390px')


def run_breaker_finale(page, canvas):
    install_breaker_pilot(page)
    boss_captured = choir_captured = censer_captured = False
    # Three authored cathedrals plus three boss movements, with recovery time
    # for centred-return/Censer cycles rather than a damage-only speed run.
    for _ in range(1200):
        page.clock.run_for(1000)
        current = data(canvas)
        if not censer_captured and number(current, 'censerTime') > 0:
            capture(page, canvas, 'breaker', 'censer')
            censer_captured = True
        if not choir_captured and current['choirStatus'] == 'charging':
            capture(page, canvas, 'breaker', 'choir-telegraph')
            choir_captured = True
        if current['cathedralBossStage'] != '' and not boss_captured:
            capture(page, canvas, 'breaker', 'last-cathedral')
            boss_captured = True
        if current['phase'] == 'over':
            break
    page.evaluate('clearInterval(window.__pilotTimer)')
    current = data(canvas)
    finishes = page.evaluate('window.__finishes')
    assert censer_captured and choir_captured and boss_captured, current
    assert len(finishes) == 1 and 'Last Cathedral' in finishes[0]['result'], (current, finishes)
    assert int(current['cathedralFocusHeartBreaks']) == 2 and current['cathedralHeartHP'] == '0', current
    assert int(current['litanyCompletions']) > 0 and int(current['sentryBreaks']) + int(current['censerBanishes']) > 0, current
    assert int(current['cathedralSentries']) <= 3, current
    completion_time = finishes[0]['stats']['simulationTime']
    assert completion_time <= 360, f"Breaker pacing exceeded 360 simulation seconds: {completion_time:.3f}"
    print(f'PASS: Orbit Breaker Litany, Censer, sentries, two Focus heart breaks at 390px; {completion_time:.3f} simulation seconds')


def touch_controls(page):
    # Planet Drop: actual touch Tune and ordinary playfield drop.
    canvas = mount(page, 'merge')
    tap_control(page, 'merge', 'tune')
    assert int(data(canvas)['mergeResonance']) == 30
    page.touchscreen.tap(*world_point(page, 'merge', 240, 100))
    page.clock.run_for(100)
    assert int(data(canvas)['mergeTunedDrops']) == 1
    capture(page, canvas, 'merge', 'touch-controls')
    destroy(page)

    # Comet Surf: touch Veil spends twinlight and slows the ship, without an orbit.
    canvas = mount(page, 'hop')
    before = number(data(canvas), 'shipVX')
    tap_control(page, 'hop', 'veil')
    current = data(canvas)
    assert number(current, 'surfVeil') > 0 and int(current['surfCharge']) == 25
    assert number(current, 'shipVX') < before
    capture(page, canvas, 'surf', 'touch-controls')
    destroy(page)
    canvas = mount(page, 'hop')
    canvas.press('e')
    assert number(data(canvas), 'surfVeil') > 0 and int(data(canvas)['surfCharge']) == 25
    destroy(page)

    # Orbit Breaker: legacy controls map stays empty; separate 48px Censer pad works.
    canvas = mount(page, 'breaker')
    assert page.evaluate('Object.keys(window.__data.masterwork.controls).length') == 0
    control_box(page, 'breaker', 'censer')
    install_breaker_pilot(page, simple=True)
    for _ in range(300):
        page.clock.run_for(100)
        if page.evaluate('window.__data.charge') >= 40:
            break
    page.evaluate('clearInterval(window.__pilotTimer)')
    assert page.evaluate('window.__data.charge') >= 40, data(canvas)
    tap_control(page, 'breaker', 'censer')
    assert number(data(canvas), 'censerTime') > 0
    capture(page, canvas, 'breaker', 'touch-controls')
    destroy(page)

    # The same Censer action through Playwright's actual keyboard pipeline.
    canvas = mount(page, 'breaker')
    install_breaker_pilot(page, simple=True)
    for _ in range(300):
        page.clock.run_for(100)
        if page.evaluate('window.__data.charge') >= 40:
            break
    page.evaluate('clearInterval(window.__pilotTimer)')
    assert page.evaluate('window.__data.charge') >= 40, data(canvas)
    canvas.press('e')
    assert number(data(canvas), 'censerTime') > 0
    destroy(page)

    # Stardust Dash: catch through pointer input, then bank through the real pad.
    canvas = mount(page, 'dash')
    install_dash_pilot(page, lit_only=True)
    for _ in range(300):
        page.clock.run_for(100)
        if page.evaluate('window.__data.combo') >= 3:
            break
    page.evaluate('clearInterval(window.__pilotTimer)')
    assert page.evaluate('window.__data.combo') >= 3, data(canvas)
    tap_control(page, 'dash', 'bank')
    assert int(data(canvas)['dashBanks']) >= 1 and page.evaluate('window.__data.combo') == 0
    capture(page, canvas, 'dash', 'touch-controls')
    destroy(page)
    print('PASS: real 44–48px touch Tune, Veil, Bank and Censer at 390px; keyboard equivalents covered by finales')


def standard_invariants(page):
    storage = page.evaluate('JSON.stringify(localStorage)')
    queues = []
    for game in ('merge', 'hop', 'dash', 'breaker'):
        canvas = mount(page, game, veteran=False)
        current = data(canvas)
        assert current['veteran'] == 'false' and current['hudCompact'] == 'false'
        assert page.evaluate('window.__data.masterwork') is None
        assert current.get('mergeBossStage', '') == '' and current.get('surfBossStage', '') == '' and current.get('cathedralBossStage', '') == ''
        assert current.get('dashTide', '0.00') == '0.00' and current.get('activeMoths', '0') == '0'
        if game == 'merge':
            queues.append(page.evaluate('window.__data.queue.slice()'))
            canvas.press('e'); canvas.press('s')
            assert int(current['mergeTunedDrops']) == 0 and current['mergeBracing'] == 'false'
        page.clock.run_for(400)
        destroy(page)
    canvas = mount(page, 'merge', veteran=1)
    assert data(canvas)['veteran'] == 'false' and page.evaluate('window.__data.queue.slice()') == queues[0]
    destroy(page)
    assert page.evaluate('JSON.stringify(localStorage)') == storage
    assert page.evaluate('window.__finishes.length') == 0
    print('PASS: standard RNG/records/mechanics and truthy Veteran opt-in remain unchanged')


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            def new_page(touch=True):
                page = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', has_touch=touch)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'{base}/index.html#overview', wait_until='networkidle')
                page.clock.install()
                assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
                return page

            if ONLY in ('', 'standard'):
                page = new_page(touch=False)
                standard_invariants(page)
                page.close()
            if ONLY in ('', 'touch'):
                page = new_page()
                touch_controls(page)
                page.close()
            runners = {
                'merge': ('merge', run_merge_finale),
                'surf': ('hop', run_surf_finale),
                'dash': ('dash', run_dash_finale),
                'breaker': ('breaker', run_breaker_finale),
            }
            for name, (game, runner) in runners.items():
                if ONLY and ONLY != name:
                    continue
                page = new_page()
                fixture_seed = int(os.environ.get('DEEP_ARCADE_SEED', '73' if game == 'hop' else '42'))
                canvas = mount(page, game, seed=fixture_seed)
                runner(page, canvas)
                destroy(page)
                page.clock.run_for(1800)
                assert page.evaluate('window.__finishes.length') == 1
                page.close()
            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print(f'Deep arcade systems/finales passed. 390px captures: {CAPTURES}')
    finally:
        server.shutdown()
        server.server_close()
