"""Input-driven Playwright coverage for the four Masterwork arcade verbs.

Run with developer-only Python Playwright:
    python3 tests/arcade-mechanics.py

The pilots use the public engine, real canvas keyboard/pointer events and the
actual rAF simulation. They never replace game state or install test-only hooks.
"""
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


def mount(page, game, *, veteran=False, expedition=False, seed=42, css_width=None):
    page.evaluate('''({game, veteran, expedition, seed, cssWidth}) => {
      clearInterval(window.__pilotTimer);
      window.__game?.destroy();
      document.querySelector('#mechanics-probe')?.remove();
      const canvas = document.createElement('canvas');
      canvas.id = 'mechanics-probe'; canvas.tabIndex = 0;
      const [width, height] = AetherArcade.dimensions(game);
      const displayWidth = cssWidth || width;
      canvas.style.cssText = `position:fixed;left:0;top:0;width:${displayWidth}px;height:${displayWidth * height / width}px;z-index:20;touch-action:none`;
      document.body.append(canvas);
      window.__finishes = [];
      window.__game = AetherArcade.create(canvas, {
        game, veteran, expedition, seed, sound: false,
        onUpdate: data => window.__data = data,
        onFinish: data => window.__finishes.push(data),
      });
      window.__game.start();
    }''', {'game': game, 'veteran': veteran, 'expedition': expedition, 'seed': seed, 'cssWidth': css_width})
    return page.locator('#mechanics-probe')


def data(canvas):
    return canvas.evaluate('(element) => Object.fromEntries(Object.entries(element.dataset))')


def destroy(page):
    page.evaluate('''() => {
      clearInterval(window.__pilotTimer);
      window.__game?.destroy();
      document.querySelector('#mechanics-probe')?.remove();
    }''')


def point(page, x, y=500):
    page.evaluate('''({x, y}) => {
      const canvas = document.querySelector('#mechanics-probe');
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        pointerType: 'mouse', clientX: rect.left + x / 900 * rect.width,
        clientY: rect.top + y / 560 * rect.height,
      }));
    }''', {'x': x, 'y': y})


def control_box(page, game, name):
    box = page.evaluate('''({game, name}) => {
      const canvas = document.querySelector('#mechanics-probe'), bounds = canvas.getBoundingClientRect();
      const [width, height] = AetherArcade.dimensions(game), control = window.__data.masterwork.controls[name];
      return {
        x: bounds.left + control.x / width * bounds.width,
        y: bounds.top + control.y / height * bounds.height,
        width: control.w / width * bounds.width,
        height: control.h / height * bounds.height,
      };
    }''', {'game': game, 'name': name})
    assert box['width'] >= 44 and box['height'] >= 44, (game, name, box)
    return box


def control_center(page, game, name):
    box = control_box(page, game, name)
    return box['x'] + box['width'] / 2, box['y'] + box['height'] / 2


def tap_control(page, game, name):
    x, y = control_center(page, game, name)
    page.touchscreen.tap(x, y)


def world_point(page, game, x, y):
    return page.evaluate('''({game, x, y}) => {
      const canvas = document.querySelector('#mechanics-probe'), bounds = canvas.getBoundingClientRect();
      const [width, height] = AetherArcade.dimensions(game);
      return [bounds.left + x / width * bounds.width, bounds.top + y / height * bounds.height];
    }''', {'game': game, 'x': x, 'y': y})


class Touch:
    """Real Chromium touch input, including holds, drags and cancellation."""
    def __init__(self, page):
        self.session = page.context.new_cdp_session(page)

    def start(self, x, y):
        self.session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 1}]})

    def move(self, x, y):
        self.session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y, 'id': 1}]})

    def end(self):
        self.session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

    def cancel(self):
        self.session.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})


def install_breaker_pilot(page, *, parry=False):
    page.evaluate('''({parry}) => {
      clearInterval(window.__pilotTimer);
      window.__pilotTimer = setInterval(() => {
        const canvas = document.querySelector('#mechanics-probe');
        if (!canvas) return;
        if (canvas.dataset.suspended === 'true') { window.__game.skipRelic(); return; }
        const d = canvas.dataset;
        let x = Number(d.cometX) || 450, y = Number(d.cometY) || 280;
        if (parry && d.choirStatus === 'charging') {
          x = Number(d.choirSourceX) || x; y = Number(d.choirSourceY) || y;
        }
        if (parry && d.choirStatus === 'incoming') {
          x = Number(d.choirBoltX) || x; y = Number(d.choirBoltY) || y;
        }
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new PointerEvent('pointermove', {
          pointerType: 'mouse', clientX: rect.left + x / 900 * rect.width,
          clientY: rect.top + y / 560 * rect.height,
        }));
      }, 32);
    }''', {'parry': parry})


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            def new_page(touch=False):
                viewport = {'width': 390, 'height': 844} if touch else {'width': 1100, 'height': 760}
                page = browser.new_page(viewport=viewport, reduced_motion='reduce', has_touch=touch)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'{base}/index.html#overview', wait_until='networkidle')
                page.clock.install()
                assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
                return page

            # Standard inputs, seeded queues, campaign length and local records
            # remain exactly where they were. Veteran-only keys are inert here.
            page = new_page()
            storage_before = page.evaluate('JSON.stringify(localStorage)')
            canvas = mount(page, 'merge', seed=731)
            queue_a = page.evaluate('window.__data.queue.slice()')
            assert page.evaluate('window.__data.masterwork') is None
            canvas.press('Space')
            page.clock.run_for(900)
            canvas.press('Space')
            page.clock.run_for(900)
            standard_signature = (page.evaluate('window.__data.queue.slice()'), data(canvas)['score'], data(canvas)['count'])
            canvas.press('x')
            assert data(canvas)['mergeBracing'] == 'false'
            destroy(page)
            canvas = mount(page, 'merge', veteran=1, seed=731)
            assert data(canvas)['veteran'] == 'false'
            assert page.evaluate('window.__data.queue.slice()') == queue_a
            page.keyboard.down('s')
            page.keyboard.down('ArrowDown')
            canvas.press('Space')
            page.clock.run_for(900)
            canvas.press('Space')
            page.clock.run_for(900)
            page.keyboard.up('s')
            page.keyboard.up('ArrowDown')
            repeat_signature = (page.evaluate('window.__data.queue.slice()'), data(canvas)['score'], data(canvas)['count'])
            assert repeat_signature == standard_signature, (standard_signature, repeat_signature, data(canvas))
            assert data(canvas)['mergeGrip'] == '100' and data(canvas)['anchorDrops'] == '0'
            destroy(page)
            for game in ('hop', 'dash', 'breaker'):
                canvas = mount(page, game, expedition=game == 'dash', seed=731)
                assert page.evaluate('window.__data.masterwork') is None
                if game == 'dash':
                    assert page.evaluate('window.__data.remaining') == 270
                canvas.press('x')
                page.keyboard.down('s')
                page.clock.run_for(1400)
                page.keyboard.up('s')
                current = data(canvas)
                if game == 'hop':
                    assert current['surfHooks'] == '0' and current['surfSwaps'] == '0' and current['surfCharge'] == '0'
                elif game == 'dash':
                    assert page.evaluate('window.__data.remaining') < 270
                    assert current['dashStageCount'] == '5' and current['dashChapter'] == 'WAKE THE SKY'
                    assert current['umbraRein'] == 'false' and current['eclipseCatches'] == '0' and current['shadesSpawned'] == '0'
                else:
                    assert current['choirShots'] == '0' and current['cathedralFocusReturns'] == '0' and current['paddleHush'] == '0.00'
                page.evaluate('window.__game.pause()')
                paused_at = page.evaluate('window.__data.stats.simulationTime')
                page.clock.run_for(250)
                assert page.evaluate('window.__data.stats.simulationTime') == paused_at
                page.evaluate('window.__game.resume()')
                destroy(page)
                page.clock.run_for(1500)
                assert page.evaluate('window.__finishes.length') == 0
            assert page.evaluate('JSON.stringify(localStorage)') == storage_before
            page.close()
            print('PASS: standard RNG/input/timing/storage, pause and destroy contracts are unchanged')

            # Planet Drop: a forecast drop becomes a physical anchor. Bracing the
            # same seeded pile measurably damps its response and spends grip.
            def merge_response(brace):
                page = new_page()
                canvas = mount(page, 'merge', veteran=True, seed=42)
                for _ in range(45):
                    page.clock.run_for(100)
                    if data(canvas)['forecastTelegraph'] == 'true':
                        break
                assert data(canvas)['forecastTelegraph'] == 'true'
                canvas.press('Space')
                assert data(canvas)['anchorDrops'] == '1'
                assert page.evaluate('window.__data.masterwork.mechanic') == 'ANCHOR WINDOW'
                for _ in range(45):
                    page.clock.run_for(100)
                    current = data(canvas)
                    if current['forecastEvent'] == 'THE FIRST SWING' and current['forecastTelegraph'] == 'false':
                        break
                assert data(canvas)['activeAnchors'] == '1'
                assert float(data(canvas)['anchorVelocity']) < 30
                grip_before = int(data(canvas)['mergeGrip'])
                if brace:
                    page.keyboard.down('s')
                samples = []
                for _ in range(6):
                    page.clock.run_for(100)
                    samples.append(abs(float(data(canvas)['pendulumVelocity'])))
                current = data(canvas)
                if brace:
                    assert current['mergeBracing'] == 'true'
                    assert int(current['mergeGrip']) < grip_before
                    assert page.evaluate('window.__data.masterwork.mechanic') == 'COUNTERWEIGHT BRACE'
                    page.keyboard.up('s')
                result = sum(samples) / len(samples)
                destroy(page)
                page.close()
                return result

            unbraced = merge_response(False)
            braced = merge_response(True)
            assert braced < unbraced * .8, (unbraced, braced)
            print(f'PASS: Planet Drop forecast anchors hold; counterweight brace damps pile ({unbraced:.2f} → {braced:.2f})')

            # A late forecast drop onto the seeded matching Moon carries its
            # anchor into a real merge and chimes during the active front.
            page = new_page()
            canvas = mount(page, 'merge', veteran=True, seed=42)
            page.evaluate('''() => {
              const canvas = document.querySelector('#mechanics-probe'), rect = canvas.getBoundingClientRect();
              canvas.dispatchEvent(new PointerEvent('pointermove', {
                pointerType: 'mouse', clientX: rect.left + 182 / 480 * rect.width,
                clientY: rect.top + 40 / 600 * rect.height,
              }));
            }''')
            for _ in range(45):
                page.clock.run_for(100)
                if page.evaluate('window.__data.stats.simulationTime') >= 3.25 and data(canvas)['forecastTelegraph'] == 'true':
                    break
            canvas.press('Space')
            page.clock.run_for(2500)
            current = data(canvas)
            assert int(current['anchorMerges']) >= 1, current
            destroy(page)
            page.close()
            print('PASS: a timed anchored collision carries into the front and triggers Counterweight Chime')

            # Comet Surf: Starhook is a real remote grapple with a subsequent
            # hold/release launch. Twin Swap moves an existing binary orbit.
            page = new_page()
            canvas = mount(page, 'hop', veteran=True, seed=42)
            assert data(canvas)['starhookReady'] == 'true'
            assert data(canvas)['surfCharge'] == '50'
            canvas.press('x')
            assert data(canvas)['surfHooks'] == '1' and data(canvas)['tethered'] == 'true'
            assert data(canvas)['surfCharge'] == '0'
            page.keyboard.down('Space')
            page.clock.run_for(350)
            page.keyboard.up('Space')
            page.clock.run_for(120)
            assert int(data(canvas)['releases']) >= 1
            destroy(page)

            canvas = mount(page, 'hop', veteran=True, seed=42)
            for _ in range(40):
                page.clock.run_for(150)
                if page.evaluate('window.__data.stats.maxMetres') >= 62:
                    break
            page.keyboard.down('Space')
            caught_twin = False
            for _ in range(45):
                page.clock.run_for(120)
                current = data(canvas)
                if current['binaryTethered'] == 'true':
                    caught_twin = True
                    break
                if current['tethered'] == 'true':
                    page.keyboard.up('Space')
                    page.clock.run_for(140)
                    page.keyboard.down('Space')
            assert caught_twin, data(canvas)
            charge_before = int(data(canvas)['surfCharge'])
            page.keyboard.press('x')
            assert data(canvas)['surfSwaps'] == '1'
            assert data(canvas)['binaryTethered'] == 'true'
            assert int(data(canvas)['surfCharge']) == charge_before - 25
            page.keyboard.press('x')
            assert data(canvas)['surfSwaps'] == '2'
            page.keyboard.up('Space')
            page.clock.run_for(120)
            assert int(data(canvas)['releases']) >= 1
            destroy(page)
            page.close()
            print('PASS: Comet Surf Starhook grapples/launches and Twin Swap preserves a binary orbit for 25 twinlight')

            # Umbra: tow the roaming lantern with a finite lumen resource.
            page = new_page()
            canvas = mount(page, 'dash', veteran=True, expedition=True, seed=42)
            point(page, 800)
            page.clock.run_for(180)
            page.keyboard.down('s')
            page.clock.run_for(650)
            current = data(canvas)
            assert current['umbraRein'] == 'true'
            assert int(current['umbraLumen']) < 35
            assert int(current['umbraLightX']) > 560
            assert page.evaluate('window.__data.masterwork.mechanic') == 'LANTERN REIN'
            page.keyboard.up('s')
            page.clock.run_for(120)
            assert data(canvas)['umbraRein'] == 'false'
            destroy(page)

            # Greedily dashing through an unlit star wakes a bounded, tracking
            # shade. The same real dash input is the counterattack.
            canvas = mount(page, 'dash', veteran=True, expedition=True, seed=42)
            page.evaluate('''() => {
              window.__pilotTimer = setInterval(() => {
                const canvas = document.querySelector('#mechanics-probe');
                if (!canvas) return;
                const d = canvas.dataset;
                if (d.suspended === 'true') { window.__game.skipRelic(); return; }
                const number = key => Number(d[key]) || 0;
                const charge = window.__data.charge;
                let target = number('nextStarX') || number('umbraLightX') || 450;
                let fire = false;
                if (number('activeShades') > 0) {
                  target = number('shadeX');
                  fire = number('shadeY') > 450;
                } else if (number('umbraStarY') > 70) {
                  target = number('umbraStarX');
                  fire = d.umbraStarLit === 'false' && number('umbraStarY') > 450;
                }
                const rect = canvas.getBoundingClientRect();
                canvas.dispatchEvent(new PointerEvent('pointermove', {
                  pointerType: 'mouse', clientX: rect.left + target / 900 * rect.width,
                  clientY: rect.top + 500 / 560 * rect.height,
                }));
                if (fire && charge >= 100) window.__game.ability();
              }, 40);
            }''')
            page.clock.run_for(22000)
            page.evaluate('clearInterval(window.__pilotTimer)')
            current = data(canvas)
            assert int(current['eclipseCatches']) >= 1, current
            assert int(current['shadesSpawned']) >= 1, current
            assert int(current['shadesSpawned']) <= 3
            assert int(current['shadesBroken']) >= 1, current
            destroy(page)
            page.close()
            print('PASS: Umbra lantern rein, unlit Eclipse catches, reactive capped shades and dash counterattack')

            # Cathedral: centred returns charge a genuine piercing comet. An
            # unparried choir mote crosses the rim and narrows the paddle.
            page = new_page()
            canvas = mount(page, 'breaker', veteran=True, seed=42)
            install_breaker_pilot(page)
            page.clock.run_for(22000)
            page.evaluate('clearInterval(window.__pilotTimer)')
            current = data(canvas)
            assert int(current['cathedralFocusReturns']) >= 2, current
            assert int(current['cathedralFocusBreaks']) >= 1, current
            assert int(current['choirShots']) >= 1, current
            assert int(current['choirHushes']) >= 1, current
            destroy(page)
            page.close()

            # Pre-positioning on the telegraphed radial line parries the shot;
            # the keystone/paddle priority decision is not just a damage rule.
            page = new_page()
            canvas = mount(page, 'breaker', veteran=True, seed=42)
            install_breaker_pilot(page, parry=True)
            page.clock.run_for(15000)
            page.evaluate('clearInterval(window.__pilotTimer)')
            current = data(canvas)
            assert int(current['choirShots']) >= 1, current
            assert int(current['choirParries']) >= 1, current
            assert len(page.evaluate('window.__data.masterwork.hint')) > 20
            destroy(page)
            page.clock.run_for(1400)
            assert page.evaluate('window.__finishes.length') == 0
            page.close()
            print('PASS: Cathedral centred Focus Break, choir miss/hush, telegraphed radial parry and silent teardown')

            # Phone-sized real touch input. Every visible pad is measured in CSS
            # pixels, then driven through Chromium's touchscreen pipeline.
            page = new_page(touch=True)
            canvas = mount(page, 'merge', veteran=True, css_width=350)
            touch = Touch(page)
            touch.start(*control_center(page, 'merge', 'brace'))
            page.clock.run_for(400)
            assert data(canvas)['mergeBracing'] == 'true', (data(canvas), control_box(page, 'merge', 'brace'))
            assert data(canvas)['controlPointer'] == 'brace'
            assert page.evaluate('window.__data.drops') == 0
            touch.move(*world_point(page, 'merge', 240, 300))
            page.clock.run_for(100)
            assert data(canvas)['mergeBracing'] == 'true'
            assert page.evaluate('window.__data.drops') == 0
            touch.cancel()
            page.clock.run_for(120)
            assert data(canvas)['mergeBracing'] == 'false'
            touch.start(*control_center(page, 'merge', 'brace'))
            page.clock.run_for(100)
            page.evaluate('window.__game.pause()')
            touch.end()
            assert data(canvas)['controlPointer'] == '' and data(canvas)['mergeBracing'] == 'false'
            page.evaluate('window.__game.resume()')
            page.touchscreen.tap(*world_point(page, 'merge', 240, 100))
            page.clock.run_for(120)
            assert page.evaluate('window.__data.drops') == 1
            destroy(page)
            page.close()
            print('PASS: 48px touch Brace hold, capture outside pad, cancel/pause reset and ordinary touch drop')

            page = new_page(touch=True)
            canvas = mount(page, 'hop', veteran=True, css_width=350)
            tap_control(page, 'hop', 'ability')
            assert data(canvas)['surfHooks'] == '1' and data(canvas)['tethered'] == 'true'
            assert int(data(canvas)['releases']) == 0
            touch = Touch(page)
            touch.start(*world_point(page, 'hop', 450, 110))
            page.clock.run_for(350)
            touch.end()
            page.clock.run_for(120)
            assert int(data(canvas)['releases']) >= 1
            destroy(page)

            # Reach a binary through ordinary play, then use the real touch pad
            # rather than X. The pad itself must not release the held orbit.
            canvas = mount(page, 'hop', veteran=True, css_width=350)
            for _ in range(40):
                page.clock.run_for(150)
                if page.evaluate('window.__data.stats.maxMetres') >= 62:
                    break
            page.keyboard.down('Space')
            caught_twin = False
            for _ in range(45):
                page.clock.run_for(120)
                current = data(canvas)
                if current['binaryTethered'] == 'true':
                    caught_twin = True
                    break
                if current['tethered'] == 'true':
                    page.keyboard.up('Space')
                    page.clock.run_for(140)
                    page.keyboard.down('Space')
            assert caught_twin, data(canvas)
            releases_before = int(data(canvas)['releases'])
            tap_control(page, 'hop', 'ability')
            assert data(canvas)['surfSwaps'] == '1' and data(canvas)['binaryTethered'] == 'true'
            assert int(data(canvas)['releases']) == releases_before
            page.keyboard.up('Space')
            destroy(page)
            page.close()
            print('PASS: touch Starhook tap, normal orbit hold/release and Twin Swap without accidental launch')

            page = new_page(touch=True)
            canvas = mount(page, 'dash', veteran=True, expedition=True, css_width=350)
            page.clock.run_for(150)
            point(page, 800)
            page.clock.run_for(180)
            catcher_before = data(canvas)['catcherX']
            touch = Touch(page)
            touch.start(*control_center(page, 'dash', 'rein'))
            page.clock.run_for(650)
            assert data(canvas)['umbraRein'] == 'true'
            assert int(data(canvas)['umbraLumen']) < 35
            catcher_reined = data(canvas)['catcherX']
            touch.move(*world_point(page, 'dash', 100, 200))
            page.clock.run_for(100)
            assert abs(int(data(canvas)['catcherX']) - int(catcher_reined)) <= 1, (catcher_before, catcher_reined, data(canvas))
            assert data(canvas)['umbraRein'] == 'true'
            touch.end()
            page.clock.run_for(100)
            assert data(canvas)['umbraRein'] == 'false'
            touch.start(*control_center(page, 'dash', 'rein'))
            page.clock.run_for(80)
            destroy(page)
            touch.end()  # Destroy is safe even while the control pointer is down.

            # The same real touch tap drives both Eclipse catches and shade
            # breaks. Mouse steering remains independent of the dash pad.
            canvas = mount(page, 'dash', veteran=True, expedition=True, css_width=350)
            for _ in range(850):
                current = data(canvas)
                if current['suspended'] == 'true':
                    page.evaluate('window.__game.skipRelic()')
                    page.clock.run_for(40)
                    continue
                number = lambda key: float(current.get(key) or 0)
                charge = page.evaluate('window.__data.charge')
                target = number('nextStarX') or number('umbraLightX') or 450
                fire = False
                if number('activeShades') > 0:
                    target = number('shadeX')
                    fire = number('shadeY') > 450
                elif number('umbraStarY') > 70:
                    target = number('umbraStarX')
                    fire = current['umbraStarLit'] == 'false' and number('umbraStarY') > 450
                if not fire and number('eclipseCatches') > 0 and number('activeShades') == 0 and number('nextMeteorY') > 320 and abs(number('nextMeteorX') - number('catcherX')) < 95:
                    target = 820 if number('nextMeteorX') < 450 else 80
                point(page, target)
                if fire and charge >= 100:
                    tap_control(page, 'dash', 'dash')
                page.clock.run_for(40)
                current = data(canvas)
                if int(current['eclipseCatches']) >= 1 and int(current['shadesBroken']) >= 1:
                    break
            current = data(canvas)
            assert int(current['eclipseCatches']) >= 1, current
            assert int(current['shadesSpawned']) >= 1, current
            assert int(current['shadesBroken']) >= 1, current
            destroy(page)
            page.close()
            print('PASS: 48px touch Rein hold without steering, active-touch destroy, Eclipse tap and shade counterattack')

            # Cathedral needs no extra button: its existing drag is the action.
            # Independent sustained-touch runs avoid coupling the comet's route
            # to the defensive angle selected by the test pilot.
            page = new_page(touch=True)

            def touch_breaker_run(parry):
                canvas = mount(page, 'breaker', veteran=True, css_width=350)
                assert page.evaluate('Object.keys(window.__data.masterwork.controls).length') == 0
                assert 'Drag pointer or touch' in page.evaluate('window.__data.masterwork.hint')
                touch = Touch(page)
                active = False
                for _ in range(650):
                    current = data(canvas)
                    if current['suspended'] == 'true':
                        if active:
                            touch.end(); active = False
                        page.evaluate('window.__game.skipRelic()')
                        page.clock.run_for(80)
                        continue
                    if parry and current['choirStatus'] == 'incoming':
                        x, y = float(current['choirBoltX']), float(current['choirBoltY'])
                    else:
                        x, y = float(current['cometX'] or 450), float(current['cometY'] or 280)
                    screen_point = world_point(page, 'breaker', x, y)
                    if active:
                        touch.move(*screen_point)
                    else:
                        touch.start(*screen_point); active = True
                    page.clock.run_for(40)
                    current = data(canvas)
                    if parry and int(current['choirParries']) >= 1:
                        break
                    if not parry and int(current['cathedralFocusBreaks']) >= 1:
                        break
                return canvas, touch, active

            canvas, touch, active = touch_breaker_run(False)
            current = data(canvas)
            assert int(current['cathedralFocusReturns']) >= 2, current
            assert int(current['cathedralFocusBreaks']) >= 1, current
            destroy(page)
            if active:
                touch.end()

            canvas, touch, active = touch_breaker_run(True)
            current = data(canvas)
            assert int(current['choirParries']) >= 1, current
            destroy(page)
            if active:
                touch.end()
            page.clock.run_for(1400)
            assert page.evaluate('window.__finishes.length') == 0
            page.close()
            print('PASS: sustained touch drags centre Focus returns, parry choir and tear down without callbacks')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Arcade Masterwork mechanics passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
