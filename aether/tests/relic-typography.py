"""Real-browser relic typography, contrast, focus and scrolling regression.

Run from the repository/aether directory with developer-only Python Playwright:
    python3 tests/relic-typography.py

Screenshots and measurements default to /tmp/opencode/relic-typography. Override
with AETHER_RELIC_SCREENSHOTS. Every draft is produced by the real public game
engine; fixed seeds make the combat-driven drafts reproducible. No player save
is cleared. The 200% check renders 1440x900 physical pixels as 720x450 CSS
pixels at DPR 2 (headless Chromium's equivalent of desktop browser zoom).
"""
import base64
import http.server
import json
import os
import socketserver
import struct
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('AETHER_RELIC_SCREENSHOTS', '/tmp/opencode/relic-typography'))
OUT.mkdir(parents=True, exist_ok=True)
VIEWPORTS = ((390, 844), (768, 1024), (1440, 900))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


# Return computed type plus a conservative contrast ratio. For gradients, every
# opaque colour stop is checked and the worst ratio wins. Disabled controls are
# measured for size but excluded from WCAG contrast, as permitted by WCAG.
AUDIT_JS = r'''({groups, motionSelector}) => {
  const number = value => Number.parseFloat(value) || 0;
  const parse = value => {
    if (!value) return null;
    const text = value.trim();
    if (text[0] === '#') {
      const hex = text.slice(1);
      if (![3, 4, 6, 8].includes(hex.length)) return null;
      const parts = hex.length <= 4
        ? [...hex].map(char => char + char)
        : hex.match(/.{2}/g);
      const values = parts.map(part => Number.parseInt(part, 16));
      return {r: values[0], g: values[1], b: values[2], a: values.length === 4 ? values[3] / 255 : 1};
    }
    const match = text.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    return match ? {r:+match[1], g:+match[2], b:+match[3], a:match[4] === undefined ? 1 : +match[4]} : null;
  };
  const colours = value => {
    if (!value || value === 'none') return [];
    const tokens = value.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || [];
    return tokens.map(parse).filter(Boolean);
  };
  const luminance = colour => {
    const channels = [colour.r, colour.g, colour.b].map(value => {
      value /= 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  };
  const ratio = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + .05) / (values[1] + .05);
  };
  const surface = element => {
    for (let node = element; node instanceof Element; node = node.parentElement) {
      const style = getComputedStyle(node), background = parse(style.backgroundColor);
      const opaque = colours(style.backgroundImage).filter(colour => colour.a >= .95);
      if (background?.a >= .95) opaque.push(background);
      if (opaque.length) return opaque;
    }
    return [];
  };
  const results = [];
  for (const [role, selectors] of Object.entries(groups)) {
    for (const selector of selectors) for (const element of document.querySelectorAll(selector)) {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || style.visibility === 'hidden') continue;
      const foreground = parse(style.color), surfaces = surface(element);
      const ratios = foreground && surfaces.length ? surfaces.map(colour => ratio(foreground, colour)) : [];
      const control = element.closest('button'), width = Math.max(element.clientWidth, Math.ceil(rect.width));
      results.push({
        role, selector, text: element.textContent.trim().slice(0, 110),
        font: number(style.fontSize), line: number(style.lineHeight) / number(style.fontSize),
        contrast: ratios.length ? Math.min(...ratios) : null,
        foreground: style.color,
        surfaces: surfaces.map(colour => `rgba(${colour.r},${colour.g},${colour.b},${colour.a})`),
        overflow: element.scrollWidth > width + 1 || Boolean(control && control.scrollWidth > control.clientWidth + 1),
        clipped: /hidden|clip/.test(style.overflow + style.overflowX + style.overflowY) && element.scrollHeight > element.clientHeight + 1,
        disabled: Boolean(element.closest(':disabled')),
      });
    }
  }
  const motion = [...document.querySelectorAll(motionSelector || '.never')].map(element => {
    const style = getComputedStyle(element);
    return {
      animation: style.animationName,
      durations: style.transitionDuration.split(',').map(number),
      running: element.getAnimations().length,
    };
  });
  return {
    results, motion,
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
  };
}'''


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors, measurements, failures = [], [], []

    def require(condition, message):
        if not condition:
            failures.append(message)

    def audit(page, name, groups, motion_selector, capture=True):
        data = page.evaluate(AUDIT_JS, {'groups': groups, 'motionSelector': motion_selector})
        require(data['results'], f'{name}: no visible typography targets')
        for item in data['results']:
            minimum = 14 if item['role'] == 'secondary' else 16
            minimum_line = 1.15 if item['role'] == 'heading' else 1.5
            require(item['font'] >= minimum - .01, f"{name}: {item['font']}px {item['role']} text ({minimum}px minimum): {item['text']}")
            require(item['line'] >= minimum_line - .001, f"{name}: line-height {item['line']:.2f} ({minimum_line} minimum): {item['text']}")
            require(not item['overflow'], f"{name}: horizontal text/control overflow: {item['text']}")
            require(not item['clipped'], f"{name}: clipped text: {item['text']}")
            if not item['disabled']:
                require(item['contrast'] is not None and item['contrast'] >= 4.5,
                        f"{name}: contrast {item['contrast']} for {item['foreground']} on {item['surfaces']}: {item['text']}")
        require(not data['pageOverflow'], f"{name}: document horizontal overflow at {data['width']}px")
        for item in data['motion']:
            require(item['animation'] == 'none', f"{name}: reduced-motion animation remains: {item['animation']}")
            require(max(item['durations'] or [0]) == 0, f"{name}: reduced-motion transition remains: {item['durations']}")
            require(item['running'] == 0, f"{name}: reduced-motion Web Animation remains")
        measurements.append({'state': name, **data})
        if capture:
            page.screenshot(path=str(OUT / f'{name}.png'), full_page=False, animations='disabled')
        primary = [item['font'] for item in data['results'] if item['role'] == 'primary']
        secondary = [item['font'] for item in data['results'] if item['role'] == 'secondary']
        contrasts = [item['contrast'] for item in data['results'] if not item['disabled'] and item['contrast'] is not None]
        print(f"AUDIT {name}: primary {min(primary or [0]):g}px; secondary {min(secondary or [0]):g}px; "
              f"contrast min {min(contrasts or [0]):.2f}:1; {len(data['results'])} text nodes; no overflow")
        return data

    def check_focus(page, name, selector):
        page.keyboard.press('Tab')
        target = page.locator(selector).first
        target.focus()
        style = target.evaluate('''element => {
          const style = getComputedStyle(element);
          return {active: document.activeElement === element, visible: element.matches(':focus-visible'),
                  width: parseFloat(style.outlineWidth), style: style.outlineStyle};
        }''')
        require(style['active'] and style['visible'], f'{name}: keyboard focus-visible missing: {style}')
        require(style['width'] >= 3 and style['style'] == 'solid', f'{name}: weak focus outline: {style}')
        print(f"FOCUS {name}: {style['width']:g}px {style['style']}, :focus-visible={style['visible']}")

    def check_scroll(page, name, container_selector, final_selector):
        container = page.locator(container_selector).first
        container.evaluate('element => { element.scrollTop = 0; }')
        dimensions = container.evaluate('element => ({client: element.clientHeight, scroll: element.scrollHeight})')
        final = page.locator(final_selector).first
        final.scroll_into_view_if_needed()
        reached = container.evaluate('''(element, final) => {
          const outer = element.getBoundingClientRect(), inner = final.getBoundingClientRect();
          return {top: element.scrollTop, inside: inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1,
                  firstTop: element.firstElementChild?.getBoundingClientRect().top || 0, outerTop: outer.top};
        }''', final.element_handle())
        if dimensions['scroll'] > dimensions['client'] + 1:
            require(reached['top'] > 0, f'{name}: scroll container did not move')
        require(reached['inside'], f"{name}: final action is clipped after scrolling: {dimensions} {reached}")
        container.evaluate('element => { element.scrollTop = 0; }')
        first = container.evaluate('element => ({first: element.firstElementChild.getBoundingClientRect().top, outer: element.getBoundingClientRect().top})')
        require(first['first'] >= first['outer'] - 1, f'{name}: first content is clipped at the scroll origin: {first}')
        print(f"SCROLL {name}: {dimensions['client']}px visible / {dimensions['scroll']}px content; final action reachable")

    def audit_state(page, name, target, groups, focus, motion, scroll=None, zoom=True):
        for width, height in VIEWPORTS:
            page.set_viewport_size({'width': width, 'height': height})
            page.locator(target).first.scroll_into_view_if_needed()
            page.wait_for_timeout(40)
            audit(page, f'{name}-{width}', groups, motion)
            page.locator(target).first.screenshot(path=str(OUT / f'{name}-{width}-target.png'), animations='disabled')
        page.set_viewport_size({'width': 390, 'height': 844})
        if scroll:
            check_scroll(page, f'{name}-390', *scroll)
        check_focus(page, f'{name}-390', focus)
        if zoom:
            page.set_viewport_size({'width': 720, 'height': 450})
            session = page.context.new_cdp_session(page)
            session.send('Emulation.setDeviceMetricsOverride', {
                'width': 720, 'height': 450, 'deviceScaleFactor': 2, 'mobile': False,
            })
            page.wait_for_timeout(60)
            page.locator(target).first.scroll_into_view_if_needed()
            zoom_data = audit(page, f'{name}-zoom200', groups, motion)
            require(zoom_data['width'] == 720 and zoom_data['dpr'] == 2, f'{name}: 200% rendering fixture failed')
            page.screenshot(path=str(OUT / f'{name}-zoom200.png'), full_page=False, animations='disabled')
            page.locator(target).first.screenshot(path=str(OUT / f'{name}-zoom200-target.png'), animations='disabled')
            raw = session.send('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False, 'fromSurface': True})
            png = base64.b64decode(raw['data'])
            require(struct.unpack('>II', png[16:24]) == (1440, 900), f'{name}: 200% device screenshot is not 1440x900')
            (OUT / f'{name}-zoom200-device.png').write_bytes(png)
            if scroll:
                check_scroll(page, f'{name}-zoom200', *scroll)
            session.detach()

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            def new_page(route, *, clock=False, fixture=None):
                page = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
                page.on('pageerror', lambda error: errors.append(str(error)))
                if fixture:
                    page.add_init_script('for (const [key,value] of Object.entries(' + json.dumps(fixture) + ')) localStorage.setItem(key,JSON.stringify(value));')
                page.goto(base + route, wait_until='networkidle')
                if clock:
                    page.clock.install()
                return page

            # Arcade catalogue and draft: same parchment cascade, different text.
            page = new_page('/index.html#arcade')
            page.locator('.relic-field-guide summary').click()
            audit_state(page, 'arcade-catalogue', '.expedition-guide', {
                'primary': ['.relic-entry p'],
                'secondary': ['.relic-entry small', '.relic-field-guide summary'],
            }, '.relic-field-guide summary', '.relic-choice', zoom=False)
            page.clock.install()
            page.locator('[data-exp="game-forecast"]').first.click()
            page.clock.run_for(15500)
            page.locator('#relic-dialog[open]').wait_for(state='visible')
            audit_state(page, 'arcade-draft', '#relic-dialog', {
                'primary': ['.relic-choice-effect'],
                'secondary': ['.relic-choice-pair', '#relic-description', '.relic-dialog-footer>span', '.relic-choice-tag'],
                'heading': ['.relic-dialog h2'],
            }, '.relic-choice', '.relic-dialog,.relic-choice',
                       ('#relic-dialog', '[data-exp="relic-skip"]'))
            page.set_viewport_size({'width': 390, 'height': 844})
            check_focus(page, 'arcade-skip-390', '[data-exp="relic-skip"]')
            page.locator('.relic-choice').first.focus()
            page.keyboard.press('1')
            require(not page.locator('#relic-dialog').evaluate('element => element.open'), 'arcade: key 1 did not choose a relic')
            page.close()

            # Skirmish field refit with a fixed seed and real held-fire input.
            page = new_page('/index.html?standalone=1&cartridge=shooter&mode=campaign#voyage', clock=True)
            page.evaluate('''() => {
              AetherVoyage.unmount();
              window.__typographyGame = AetherSkirmish.create(document.querySelector('.tour-hunt-frame'),
                {sector:1,elite:true,endless:true,hull:'kite',instruments:[],seed:6024,difficulty:'standard',sound:false,onEnd(){}});
            }''')
            canvas = page.locator('.tour-hunt-frame canvas')
            canvas.focus()
            page.keyboard.down('j')
            for _ in range(40):
                page.clock.run_for(1000)
                if canvas.get_attribute('data-phase') == 'draft':
                    break
            page.keyboard.up('j')
            require(canvas.get_attribute('data-phase') == 'draft', 'Skirmish did not reach its refit')
            audit_state(page, 'skirmish-refit', '.skirmish-draft', {
                'primary': ['.skirmish-draft .upgrade-copy'], 'secondary': [],
            }, '.skirmish-draft button', '.skirmish-draft,.skirmish-draft button')
            canvas.focus()
            page.keyboard.press('1')
            page.clock.run_for(100)
            require(canvas.get_attribute('data-refit') == 'guard', 'Skirmish: canvas key 1 did not select refit')
            page.evaluate('window.__typographyGame.destroy()')
            page.close()

            # Constellation Chain formations and the first safe relic draft.
            page = new_page('/index.html?standalone=1&cartridge=chain&mode=campaign#voyage', clock=True)
            page.evaluate('''() => {
              AetherVoyage.unmount();
              window.__typographyGame = AetherTrials.create('chain',document.querySelector('.trial-frame'),
                {sound:false,seed:6024,onEnd(){}});
            }''')
            canvas = page.locator('.trial-frame canvas')
            page.locator('[data-chain-start]').click()
            box = canvas.bounding_box()
            page.mouse.move(box['x'] + box['width'] * .13, box['y'] + box['height'] * .2)
            for _ in range(50):
                page.clock.run_for(1000)
                if canvas.get_attribute('data-chain-phase') == 'draft':
                    break
            require(canvas.get_attribute('data-chain-phase') == 'draft', 'Chain did not reach its relic draft')
            audit_state(page, 'chain-draft', '.chain-controls', {
                'primary': ['.chain-formations .upgrade-copy', '.chain-draft .upgrade-copy'],
                'secondary': ['.chain-draft>p', '.chain-status', '.chain-build'],
                'heading': ['.chain-draft>h3'],
            }, '.chain-draft button', '.chain-draft,.chain-draft button,.chain-formations button')
            page.locator('.chain-draft button').first.focus()
            page.keyboard.press('1')
            require(canvas.get_attribute('data-chain-phase') == 'combat', 'Chain: key 1 did not choose a relic')
            page.evaluate('window.__typographyGame.destroy()')
            page.close()

            # Bastion loadout and a real installed-tower refinement selection.
            page = new_page('/index.html?standalone=1&cartridge=bastion&mode=campaign#voyage')
            canvas = page.locator('.trial-frame canvas')
            box = canvas.bounding_box()
            page.mouse.click(box['x'] + box['width'] * 364 / 900, box['y'] + box['height'] * 219 / 560)
            page.wait_for_function('document.querySelector("[data-bastion-selection]").textContent.includes("Needle")')
            audit_state(page, 'bastion-refinement', '.trial-frame', {
                'primary': ['.bastion-loadout small', '[data-bastion-selection]', '.bastion-controls button'],
                'secondary': ['[data-bastion-manifest]', '[data-bastion-hint]'],
            }, '.bastion-loadout button', '.bastion-loadout button,.bastion-controls button,.bastion-orders button')
            frostbell = page.locator('[data-bastion-loadout="1"]')
            canvas.focus()
            page.keyboard.press('2')
            page.wait_for_function('document.querySelector(\'[data-bastion-loadout="1"]\')?.getAttribute("aria-pressed") === "true"', timeout=3000)
            require(frostbell.get_attribute('aria-pressed') == 'true', 'Bastion: canvas key 2 did not select a tower')
            page.close()

            # Glass Labyrinth: follow the authored chamber-I route with WASD.
            page = new_page('/index.html?standalone=1&cartridge=labyrinth&mode=campaign#voyage')
            page.evaluate('''() => {
              AetherVoyage.unmount();
              window.__typographyGame = AetherTrials.create('labyrinth',document.querySelector('.trial-frame'),
                {sound:false,seed:981,onEnd(){}});
            }''')
            canvas = page.locator('.trial-frame canvas')
            page.wait_for_function('document.querySelector(".trial-frame canvas")?.dataset.roomTransition === "0.00"')
            canvas.focus()

            def move(key, axis, operator, limit):
                page.keyboard.down(key)
                try:
                    page.wait_for_function('''({axis,operator,limit}) => {
                      const value = Number(document.querySelector('.trial-frame canvas')?.dataset[axis]);
                      return operator === '>=' ? value >= limit : value <= limit;
                    }''', arg={'axis': axis, 'operator': operator, 'limit': limit}, timeout=7000)
                finally:
                    page.keyboard.up(key)

            move('w', 'playerY', '<=', 177); move('d', 'playerX', '>=', 237)
            move('s', 'playerY', '>=', 282); move('d', 'playerX', '>=', 427)
            move('s', 'playerY', '>=', 323); move('d', 'playerX', '>=', 503)
            move('s', 'playerY', '>=', 363); move('d', 'playerX', '>=', 555)
            canvas.press(' ')
            move('d', 'playerX', '>=', 580); move('s', 'playerY', '>=', 402)
            move('d', 'playerX', '>=', 740)
            page.keyboard.down('w')
            try:
                page.wait_for_function('document.querySelector(".trial-frame canvas")?.dataset.draft === "open"', timeout=7000)
            finally:
                page.keyboard.up('w')
            audit_state(page, 'labyrinth-draft', '.labyrinth-draft', {
                'primary': ['.labyrinth-draft .upgrade-copy'], 'secondary': [],
            }, '.labyrinth-draft button', '.labyrinth-draft,.labyrinth-draft button')
            canvas.focus()
            page.keyboard.press('1')
            page.wait_for_function('document.querySelector(".trial-frame canvas")?.dataset.draft === "closed"', timeout=3000)
            require(canvas.get_attribute('data-draft') == 'closed', 'Labyrinth: canvas key 1 did not choose a relic')
            page.evaluate('window.__typographyGame.destroy()')
            page.close()

            # Deep Field: clear three real boards. Veteran chart IV offers routes.
            page = new_page('/index.html?standalone=1&cartridge=deepfield&mode=campaign#voyage')
            page.evaluate('''() => {
              AetherVoyage.unmount();
              window.__typographyGame = AetherDeepField.create(document.querySelector('.trial-frame'),
                {campaign:true,veteran:true,seed:987,sound:false,onEnd(){}});
            }''')

            def clear_deepfield(safe_index):
                page.locator('.deepfield-cell').nth(safe_index).click()
                grid = page.evaluate('window.__typographyGame.snapshot().grid')
                require(bool(grid), 'Deep Field did not generate a grid')
                page.evaluate('''grid => document.querySelectorAll('.deepfield-cell').forEach((cell,index) => {
                  if (grid[index] >= 0 && !cell.classList.contains('revealed')) cell.click();
                })''', grid)
                page.locator('.df-intermission').wait_for(state='visible')

            deepfield_groups = {
                'primary': ['.df-relics small'],
                'secondary': ['.df-intermission>p:not(.df-kicker):not(.df-relic-choice)', '.df-relic-choice'],
            }
            clear_deepfield(40)
            audit_state(page, 'deepfield-relic', '.df-intermission', deepfield_groups,
                        '.df-relics button:not(:disabled)', '.df-intermission,.df-relics button,.df-continue',
                        ('.df-intermission', '[data-df-action="continue"]'), zoom=False)
            page.locator('[data-df-relic="lens"]').click()
            page.locator('[data-df-action="continue"]').click()
            clear_deepfield(60)
            page.locator('[data-df-relic="aegis"]').click()
            page.locator('[data-df-action="continue"]').click()
            clear_deepfield(96)
            require(page.locator('[data-df-route]').count() == 2, 'Deep Field Veteran route choices did not open')
            audit_state(page, 'deepfield-route', '.df-intermission', deepfield_groups,
                        '[data-df-route="cathedral"]', '.df-intermission,.df-relics button,.df-continue',
                        ('.df-intermission', '[data-df-action="continue"]'))
            page.set_viewport_size({'width': 390, 'height': 844})
            overlaps = page.evaluate('''() => [...document.querySelectorAll('.df-relics button')].some(button => {
              const icon = button.querySelector('.upgrade-icon-wrap').getBoundingClientRect();
              return [...button.querySelectorAll('strong,small')].some(text => {
                const rect = text.getBoundingClientRect(); return rect.left < icon.right + 4;
              });
            })''')
            require(not overlaps, 'Deep Field: illustrated icons overlap route text on mobile')
            meridian = page.locator('[data-df-route="meridian"]')
            meridian.focus()
            page.keyboard.press('Enter')
            require(meridian.get_attribute('aria-pressed') == 'true', 'Deep Field: Enter did not choose a route')
            page.evaluate('window.__typographyGame.destroy()')
            page.close()

            # Grand Tour: a valid resumed run at leg III, then a real route click.
            fixture = {'aether-grand-tour-v2': {'records': {}, 'active': {
                'seed': 4242, 'step': 2, 'hull': 3, 'maxHull': 3, 'dust': 100,
                'instruments': [], 'hullId': 'kite', 'done': {'0:0': 'won', '1:0': 'won'},
                'path': [], 'kills': 0,
            }}}
            page = new_page('/index.html#voyage', fixture=fixture)
            page.locator('[data-tour-node="2:1"]').click()
            page.locator('.tour-cache-card').first.wait_for(state='visible')
            require(page.locator('.tour-cache-card').first.evaluate('element => document.activeElement === element'),
                    'Grand Tour: opening the draft did not focus its first instrument')
            audit_state(page, 'grand-tour-draft', '.tour-stage', {
                'primary': ['.tour-cache-card small', '.tour-inline-exit'],
                'secondary': ['.tour-cache-card em', '.tour-cache>.tour-node-brief', '.tour-cache>.eyebrow'],
            }, '.tour-cache-card', '.tour-cache-card,.tour-inline-exit')
            page.set_viewport_size({'width': 390, 'height': 844})
            check_focus(page, 'grand-tour-leave-390', '.tour-inline-exit')
            page.locator('.tour-cache-card').first.focus()
            page.keyboard.press('Enter')
            require(page.locator('.tour-cache').count() == 0, 'Grand Tour: Enter did not choose an instrument')
            require(page.locator('.tour-step.current [data-tour-node]:not([disabled])').first.evaluate('element => document.activeElement === element'),
                    'Grand Tour: choosing an instrument did not restore focus to the next route choice')
            page.close()

            page = new_page('/index.html#voyage', fixture=fixture)
            page.locator('[data-tour-node="2:1"]').click()
            page.locator('.tour-cache-card').first.wait_for(state='visible')
            page.set_viewport_size({'width': 390, 'height': 844})
            require(page.locator('.tour-cache-card').first.evaluate('element => document.activeElement === element'),
                    'Grand Tour: phone draft did not receive initial focus')
            page.locator('.tour-inline-exit').focus()
            page.keyboard.press('Enter')
            require(page.locator('.tour-cache').count() == 0, 'Grand Tour: Leave draft behind did not resolve the draft')
            require(page.locator('.tour-step.current [data-tour-node]:not([disabled])').first.evaluate('element => document.activeElement === element'),
                    'Grand Tour: leaving the draft did not restore focus to the next route choice')
            page.close()

            # Planetary Masterwork Instruments: real unlocked boards and controls.
            def puzzle_save(planet):
                seed = 24681357
                return {'aether-planet-replays-v1': {
                    'version': 1, 'daily': {},
                    'circuits': {planet: {
                        'seed': 123456, 'stage': 2,
                        'boards': [{'stars': 3, 'moves': 4, 'hints': 0}, {'stars': 3, 'moves': 6, 'hints': 0}, {'stars': 2, 'moves': 8, 'hints': 0}],
                        'actions': [], 'hints': 0, 'result': {'stars': 2, 'moves': 8, 'hints': 0},
                    }},
                    'eclipse': {planet: {'seed': seed, 'actions': [], 'hints': 0, 'result': {'stars': 3, 'moves': 5, 'hints': 0}}},
                    'masterwork': {planet: {'seed': seed, 'actions': [], 'hints': 0, 'result': None}},
                    'last': {planet: 'masterwork'},
                }}

            for planet, alternate in (('mercury', 'diagonal'), ('jupiter', 'swap'), ('neptune', 'pulse')):
                page = new_page(f'/index.html#planet/{planet}', fixture=puzzle_save(planet))
                page.wait_for_function('document.querySelector("#puzzle-level-name")?.textContent.includes("Masterwork instruments")', timeout=30000)
                require(page.locator('.puzzle-grid, .orbital-dials').count() == 1, f'{planet}: Masterwork board did not render')
                if planet == 'jupiter':
                    page.locator('.orbital-dial').first.click()
                    require(page.locator('.burn-chip:not(.empty)').count() == 1, 'Jupiter: real burn did not enter the preview plan')
                audit_state(page, f'puzzle-instruments-{planet}', '#planet-puzzle', {
                    'primary': [
                        '.puzzle-replay-modes>button', '.eclipse-charter>div>p:not(.eyebrow)', '.eclipse-charter strong',
                        '.puzzle-readout', '.puzzle-instruction', '.instrument-picker .button',
                        '.masterwork-instruments .burn-plan:not(.instrument-picker)>.button',
                        '.masterwork-instruments .burn-chip button', '.masterwork-instruments .puzzle-tools .button', '.puzzle-status',
                    ],
                    'secondary': [
                        '.masterwork-tab small', '.eclipse-tab small', '.eclipse-charter .eyebrow', '.puzzle-course',
                        '.puzzle-lesson', '.burn-plan-title', '.puzzle-direction-pad>span',
                        '.masterwork-instruments .burn-chip:not(.empty)', '.masterwork-instruments .dial-position',
                        '.masterwork-instruments .orbital-dial>small', '.masterwork-instruments .burn-badge',
                        '.puzzle-guide p', '.puzzle-guide summary', '.puzzle-record small',
                        '.puzzle-replay-modes+.puzzle-levels button>span:nth-child(2)',
                        '.puzzle-replay-modes+.puzzle-levels small',
                    ],
                }, '.masterwork-tab', '.masterwork-tab,.instrument-picker .button,.burn-plan .button,.puzzle-tools .button')
                choice = page.locator(f'[data-puzzle-instrument="{alternate}"]')
                choice.focus()
                page.keyboard.press('Enter')
                require(choice.get_attribute('aria-pressed') == 'true', f'{planet}: Enter did not select the alternate instrument')
                page.close()

            browser.close()
    finally:
        (OUT / 'measurements.json').write_text(json.dumps({'measurements': measurements, 'failures': failures, 'errors': errors}, indent=2))
        server.shutdown()
        server.server_close()

    require(not errors, f'uncaught browser exceptions: {errors}')
    print(f'MEASUREMENTS {OUT / "measurements.json"}')
    print(f'SCREENSHOTS {OUT}')
    if failures:
        raise AssertionError('\n'.join(failures))
    print(f'PASS: {len(measurements)} real-browser typography audits; 390/768/1440 plus DPR-2 200% rendering, contrast, overflow, focus, reduced motion, keyboard activation and dialog scrolling.')
