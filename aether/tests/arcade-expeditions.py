"""Standard arcade regression and the four opt-in Veteran expeditions.

Run with developer-only Python Playwright:
    python3 tests/arcade-expeditions.py

The pilots below dispatch real pointer/keyboard input and advance the real rAF
loop with Playwright's virtual clock. No game state is replaced by the test.
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


def mount(page, game, *, veteran=False, expedition=False, seed=42):
    """Mount a fresh public engine handle and start it through its public API."""
    page.evaluate('''({game, veteran, expedition, seed}) => {
      window.__game?.destroy();
      document.querySelector('#expedition-probe')?.remove();
      const canvas = document.createElement('canvas');
      canvas.id = 'expedition-probe'; canvas.tabIndex = 0;
      const [width, height] = AetherArcade.dimensions(game);
      canvas.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;z-index:20`;
      document.body.append(canvas);
      window.__finishes = [];
      window.__game = AetherArcade.create(canvas, {
        game, veteran, expedition, seed, sound: false,
        onUpdate: data => window.__data = data,
        onFinish: data => window.__finishes.push(data),
      });
      window.__game.start();
    }''', {'game': game, 'veteran': veteran, 'expedition': expedition, 'seed': seed})
    return page.locator('#expedition-probe')


def data(canvas):
    return canvas.evaluate('(element) => Object.fromEntries(Object.entries(element.dataset))')


def destroy(page):
    page.evaluate('''() => {
      clearInterval(window.__pilotTimer);
      window.__game?.destroy();
      document.querySelector('#expedition-probe')?.remove();
    }''')


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            def new_page():
                page = browser.new_page(viewport={'width': 1100, 'height': 760}, reduced_motion='reduce')
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'{base}/index.html#overview', wait_until='networkidle')
                page.clock.install()
                return page

            # Standard routes retain their original rules, timing, RNG and
            # lifecycle. A truthy non-boolean value must not opt into Veteran.
            page = new_page()
            standard_queues = []
            for game in ('merge', 'hop', 'dash', 'breaker'):
                canvas = mount(page, game, expedition=game == 'dash')
                initial = data(canvas)
                assert initial['veteran'] == 'false'
                assert initial['expeditionName'] == ''
                assert initial['phase'] == 'running'
                if game == 'merge':
                    standard_queues.append(page.evaluate('window.__data.queue.slice()'))
                    assert initial['count'] == '2' and initial['gravityX'] == '0.00'
                    canvas.press('Space')
                    assert page.evaluate('window.__data.drops') == 1
                elif game == 'hop':
                    assert initial['binarySystems'] == '0' and initial['surfGate'] == ''
                    canvas.press('Space')
                elif game == 'dash':
                    assert initial['dashStageCount'] == '5'
                    assert page.evaluate('window.__data.remaining') == 270
                    canvas.press('x')
                else:
                    assert initial['cathedralPattern'] == '' and initial['movingCrystals'] == '0'
                page.clock.run_for(350)
                assert data(canvas)['phase'] == 'running'
                if game == 'dash':
                    assert data(canvas)['dashChapter'] == 'WAKE THE SKY'
                page.evaluate('window.__game.pause()')
                paused_at = page.evaluate('window.__data.stats.simulationTime')
                page.clock.run_for(300)
                assert page.evaluate('window.__data.stats.simulationTime') == paused_at
                page.evaluate('window.__game.resume()')
                page.clock.run_for(100)
                destroy(page)
                page.clock.run_for(100)
                assert page.evaluate('window.__finishes.length') == 0
            canvas = mount(page, 'merge', veteran=1)
            standard_queues.append(page.evaluate('window.__data.queue.slice()'))
            assert standard_queues[0] == standard_queues[1]
            assert data(canvas)['veteran'] == 'false'
            destroy(page)
            canvas = mount(page, 'dash', expedition=False)
            assert page.evaluate('window.__data.remaining') == 75
            assert data(canvas)['dashStageCount'] == '0'
            page.clock.run_for(1400)
            assert data(canvas)['umbraStars'] == '0'
            destroy(page)
            page.close()
            print('PASS: standard rules, quick/campaign timing, seeded queue, input, pause and teardown')

            # Planet Drop: a telegraphed authored front creates an actual
            # horizontal pendulum force on the settled planets, then reverses.
            page = new_page()
            canvas = mount(page, 'merge', veteran=True)
            pulls, velocities, names, telegraphs = [], [], set(), set()
            for _ in range(24):
                page.clock.run_for(500)
                current = data(canvas)
                pulls.append(float(current['gravityX']))
                velocities.append(float(current['pendulumVelocity']))
                if current['forecastEvent']:
                    names.add(current['forecastEvent'])
                telegraphs.add(current['forecastTelegraph'])
            assert 'THE FIRST SWING' in names
            assert 'true' in telegraphs and 'false' in telegraphs
            assert max(pulls) > 50 and min(pulls) < -50
            assert max(abs(value) for value in velocities) > 1
            assert int(data(canvas)['forecastEvents']) >= 1
            destroy(page)
            page.close()
            print('PASS: Planet Drop forecast telegraph, reversing pendulum force and physical response')

            # Comet Surf: the binary really rotates, the first gate can be
            # threaded, and the following iris breathes instead of reskinning a rock.
            page = new_page()
            canvas = mount(page, 'hop', veteran=True)
            first_angle = float(data(canvas)['binaryAngle'])
            labels, iris_gaps = set(), set()
            for _ in range(36):
                page.clock.run_for(500)
                current = data(canvas)
                labels.add(current['surfGate'])
                if current['surfGate'] == 'BREATHING IRIS':
                    iris_gaps.add(current['surfGateGap'])
                if current['phase'] in ('ending', 'over'):
                    break
            current = data(canvas)
            assert float(current['binaryAngle']) != first_angle
            assert int(current['binarySystems']) >= 1
            assert int(current['surfGatesPassed']) + int(current['surfGateHits']) >= 1
            assert 'BREATHING IRIS' in labels
            assert len(iris_gaps) >= 2
            destroy(page)
            page.close()
            print('PASS: Comet Surf orbiting twins, traversable gate and breathing iris pattern')

            # Stardust Dash: follow the moving lantern with real pointer input.
            # Samples prove both unlit phasing and successful lit catches; the
            # separate mission is visible through the ordinary onUpdate contract.
            page = new_page()
            canvas = mount(page, 'dash', veteran=True, expedition=True)
            page.clock.run_for(150)
            assert data(canvas)['dashChapter'] == 'UMBRA VEIL'
            assert data(canvas)['dashStageCount'] == '6'
            assert page.evaluate('window.__data.remaining') == 315
            assert page.evaluate('window.__data.mission.id') == 'umbra'
            page.evaluate('''() => {
              window.__litSamples = new Set(); window.__lightSamples = new Set();
              window.__pilotTimer = setInterval(() => {
                const canvas = document.querySelector('#expedition-probe'), d = canvas.dataset;
                if (d.suspended === 'true') { window.__game.skipRelic(); return; }
                const number = key => Number(d[key]) || 0;
                const catcher = number('catcherX'), meteorX = number('nextMeteorX'), meteorY = number('nextMeteorY');
                let target = number('umbraLightX');
                if (meteorY > 320 && Math.abs(meteorX - catcher) < 95) target = meteorX < 450 ? 820 : 80;
                const rect = canvas.getBoundingClientRect();
                canvas.dispatchEvent(new PointerEvent('pointermove', {
                  pointerType: 'mouse', clientX: rect.left + target / 900 * rect.width,
                  clientY: rect.top + 500 / 560 * rect.height,
                }));
                window.__game.ability();
                if (d.umbraStarLit) window.__litSamples.add(d.umbraStarLit);
                window.__lightSamples.add(d.umbraLightX);
              }, 100);
            }''')
            page.clock.run_for(18000)
            page.evaluate('clearInterval(window.__pilotTimer)')
            current = data(canvas)
            assert len(page.evaluate('Array.from(window.__lightSamples)')) > 4
            assert page.evaluate('window.__litSamples.has("false")')
            assert int(current['umbraCatches']) >= 1
            assert int(current['umbraMisses']) >= 1
            assert page.evaluate('window.__data.mission.id') == 'umbra'
            destroy(page)
            page.close()
            print('PASS: Umbra weather opens Veteran campaign; lantern moves, dark stars phase and mission catches land')

            # Orbit Breaker: follow the comet with the actual circular paddle.
            # The nave moves during its serve, sealed glass rejects impacts and
            # ordinary armoured crystals retain a two-hit damage rule.
            page = new_page()
            canvas = mount(page, 'breaker', veteran=True)
            assert data(canvas)['cathedralPattern'] == 'THE NAVE'
            assert int(data(canvas)['armouredCrystals']) > 0
            assert int(data(canvas)['sealedCrystals']) > 0
            page.evaluate('''() => {
              window.__pilotTimer = setInterval(() => {
                const canvas = document.querySelector('#expedition-probe');
                if (canvas.dataset.suspended === 'true') { window.__game.skipRelic(); return; }
                const x = Number(canvas.dataset.cometX) || 450, y = Number(canvas.dataset.cometY) || 280;
                const rect = canvas.getBoundingClientRect();
                canvas.dispatchEvent(new PointerEvent('pointermove', {
                  pointerType: 'mouse', clientX: rect.left + x / 900 * rect.width,
                  clientY: rect.top + y / 560 * rect.height,
                }));
              }, 50);
            }''')
            page.clock.run_for(12000)
            page.evaluate('clearInterval(window.__pilotTimer)')
            current = data(canvas)
            assert int(current['movingCrystals']) > 0
            assert float(current['cathedralMotion']) > 1
            assert int(current['cathedralSealBlocks']) > 0
            assert int(current['cathedralArmourDents']) > 0
            destroy(page)
            page.clock.run_for(1500)
            assert page.evaluate('window.__finishes.length') == 0
            page.close()
            print('PASS: Cathedral crystals move, seals reject hits, armour dents and destroy stays silent')

            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Arcade Veteran expeditions passed with no uncaught browser exceptions.')
    finally:
        server.shutdown()
        server.server_close()
