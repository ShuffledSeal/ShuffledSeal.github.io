"""Real-browser Gothic presentation, relic readability and gameplay gallery.

Run from the repository/aether directory with developer-only Python Playwright:
    python3 tests/gothic-presentation.py

Screenshots and measurements are written to docs/gothic-proof. The runner uses
real application routes and engines, fixed combat/arcade clocks where useful,
and never clears or overwrites player storage. The 200% fixture renders a
720×450 CSS viewport at DPR 2 and verifies a 1440×900 device screenshot.
"""
import base64
import http.server
import json
import socketserver
import struct
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'gothic-proof'
OUT.mkdir(parents=True, exist_ok=True)
VIEWPORTS = ((390, 844), (768, 1024), (1440, 900))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


# Conservative text/surface audit. Every opaque gradient stop is considered;
# the worst contrast is retained. Pseudo-element button faces are deliberately
# not guessed: their labels are reviewed in screenshots instead.
AUDIT_JS = r'''groups => {
  const number = value => Number.parseFloat(value) || 0;
  const parse = value => {
    if (!value) return null;
    const text = value.trim();
    if (text[0] === '#') {
      const hex = text.slice(1);
      if (![3, 4, 6, 8].includes(hex.length)) return null;
      const parts = hex.length <= 4 ? [...hex].map(char => char + char) : hex.match(/.{2}/g);
      const values = parts.map(part => Number.parseInt(part, 16));
      return {r:values[0], g:values[1], b:values[2], a:values.length === 4 ? values[3] / 255 : 1};
    }
    const match = text.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    return match ? {r:+match[1], g:+match[2], b:+match[3], a:match[4] === undefined ? 1 : +match[4]} : null;
  };
  const colours = value => {
    if (!value || value === 'none') return [];
    return (value.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || []).map(parse).filter(Boolean);
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
      results.push({
        role, selector, text:element.textContent.trim().slice(0, 110),
        font:number(style.fontSize), line:number(style.lineHeight) / number(style.fontSize),
        contrast:ratios.length ? Math.min(...ratios) : null,
        foreground:style.color,
        surfaces:surfaces.map(colour => `rgba(${colour.r},${colour.g},${colour.b},${colour.a})`),
        overflow:element.scrollWidth > Math.ceil(rect.width) + 1,
        disabled:Boolean(element.closest(':disabled')),
      });
    }
  }
  return {
    results,
    pageOverflow:document.documentElement.scrollWidth > innerWidth + 1,
    width:innerWidth, height:innerHeight, dpr:devicePixelRatio,
    animations:document.getAnimations().length,
  };
}'''

RELIC_GROUPS = {
    'primary': ['.relic-choice-effect'],
    'secondary': ['.relic-choice-pair', '#relic-description', '.relic-dialog-footer>span', '.relic-choice-tag'],
    'heading': ['.relic-dialog h2'],
}
CABINET_GROUPS = {
    'primary': ['.cartridge-card .cartridge-brief'],
    'secondary': ['.cartridge-copy>p', '.cartridge-card .cartridge-features b', '.cartridge-card footer', '.cartridge-card footer small', '.cartridge-daily-link'],
}
SHELL_GROUPS = {
    'primary': ['.playground-hero .hero-description', '.view-header p'],
    'secondary': ['.welcome p', '.stat-detail'],
}
VETERAN_COPY = {
    'shooter': 'Ossuary Bell · Consonance combos and Cadenza censers',
    'bastion': 'Three-office sieges · tower actives and the Gilded Warden',
    'labyrinth': 'Meridian heart · doors, relays and coordinated Watchers',
    'starforge': 'Nocturne Machina · inner-ring counterplay and the three-phase Heart',
    'chain': 'Black Office · Link Lattice, Star Cast and route vows',
    'deepfield': 'Nocturne · canticles, rifts and logical seals',
}


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors, failures, measurements, bad_responses = [], [], [], []

    def require(condition, message):
        if not condition:
            failures.append(message)

    def capture(page, name):
        page.evaluate('document.fonts.ready')
        page.screenshot(path=str(OUT / f'{name}.png'), full_page=False, animations='disabled')
        print(f'CAPTURE docs/gothic-proof/{name}.png')

    def audit(page, name, groups):
        data = page.evaluate(AUDIT_JS, groups)
        require(data['results'], f'{name}: no visible typography targets')
        for item in data['results']:
            minimum = 14 if item['role'] == 'secondary' else 16
            require(item['font'] >= minimum - .01,
                    f"{name}: {item['font']}px {item['role']} text, expected {minimum}px: {item['text']}")
            require(not item['overflow'], f"{name}: text overflow: {item['text']}")
            if not item['disabled']:
                require(item['contrast'] is not None and item['contrast'] >= 4.5,
                        f"{name}: contrast {item['contrast']} for {item['foreground']} on {item['surfaces']}: {item['text']}")
        require(not data['pageOverflow'], f'{name}: horizontal document overflow at {data["width"]}px')
        require(data['animations'] == 0, f'{name}: reduced-motion CSS/Web Animations still running: {data["animations"]}')
        measurements.append({'state': name, **data})
        primary = [item['font'] for item in data['results'] if item['role'] == 'primary']
        secondary = [item['font'] for item in data['results'] if item['role'] == 'secondary']
        contrasts = [item['contrast'] for item in data['results'] if not item['disabled'] and item['contrast'] is not None]
        print(f'AUDIT {name}: primary {min(primary or [0]):g}px; secondary {min(secondary or [0]):g}px; '
              f'contrast min {min(contrasts or [0]):.2f}:1; no overflow; reduced motion')
        return data

    def check_primary_button(page, name):
        button = page.locator('.button-primary:visible').first
        style = button.evaluate('''element => ({
          text:getComputedStyle(element).color,
          face:getComputedStyle(element, '::before').backgroundImage,
        })''')
        require(style['text'] == 'rgb(37, 24, 15)', f'{name}: primary ink changed unexpectedly: {style}')
        require('rgb(195, 155, 85)' in style['face'] and 'rgb(227, 194, 127)' in style['face'],
                f'{name}: primary button lost its brass pseudo-element face: {style}')
        print(f'PRIMARY {name}: dark ink on the authored brass face')

    def check_focus(page, name, selector, dark=False):
        page.keyboard.press('Tab')
        target = page.locator(selector).first
        target.focus()
        style = target.evaluate('''element => {
          const style = getComputedStyle(element);
          return {active:document.activeElement === element, visible:element.matches(':focus-visible'),
                  width:parseFloat(style.outlineWidth), style:style.outlineStyle, colour:style.outlineColor};
        }''')
        require(style['active'] and style['visible'], f'{name}: keyboard :focus-visible missing: {style}')
        require(style['width'] >= 3 and style['style'] == 'solid', f'{name}: focus outline below 3px: {style}')
        print(f'FOCUS {name}: {style["width"]:g}px {style["style"]} {style["colour"]}')

    def check_scroll(page, name, container_selector, final_selector):
        container = page.locator(container_selector).first
        container.evaluate('element => { element.scrollTop = 0; }')
        dimensions = container.evaluate('element => ({client:element.clientHeight, scroll:element.scrollHeight})')
        final = page.locator(final_selector).first
        final.scroll_into_view_if_needed()
        reached = container.evaluate('''(element, final) => {
          const outer = element.getBoundingClientRect(), inner = final.getBoundingClientRect();
          return {top:element.scrollTop, inside:inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1};
        }''', final.element_handle())
        if dimensions['scroll'] > dimensions['client'] + 1:
            require(reached['top'] > 0, f'{name}: scroll container did not move')
        require(reached['inside'], f'{name}: final action is not reachable: {dimensions} {reached}')
        container.evaluate('element => { element.scrollTop = 0; }')
        first = container.evaluate('element => ({first:element.firstElementChild.getBoundingClientRect().top, outer:element.getBoundingClientRect().top})')
        require(first['first'] >= first['outer'] - 1, f'{name}: first content clipped at scroll origin: {first}')
        print(f'SCROLL {name}: {dimensions["client"]}px visible / {dimensions["scroll"]}px content; final action reachable')

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            def new_page(route, width=1440, height=900, clock=False, fixture=None):
                page = browser.new_page(
                    viewport={'width': width, 'height': height},
                    device_scale_factor=1,
                    reduced_motion='reduce',
                )
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('response', lambda response: bad_responses.append(f'{response.status} {response.url}') if response.status >= 400 else None)
                if fixture:
                    page.add_init_script('for (const [key,value] of Object.entries(' + json.dumps(fixture) + ')) localStorage.setItem(key,JSON.stringify(value));')
                page.goto(base + route, wait_until='networkidle')
                page.locator('#main').wait_for(state='visible')
                if clock:
                    page.clock.install()
                return page

            # Product shell, cartridge cabinet and atlas at every requested width.
            for width, height in VIEWPORTS:
                page = new_page('/index.html#overview', width, height)
                page.locator('.playground-hero').wait_for(state='visible')
                require(page.locator('.playground-hero img').evaluate_all('(images) => images.every(image => image.complete && image.naturalWidth > 0)'),
                        f'observatory-{width}: historical artwork failed to load')
                audit(page, f'observatory-{width}', SHELL_GROUPS)
                check_primary_button(page, f'observatory-{width}')
                capture(page, f'observatory-{width}')
                page.close()

                page = new_page('/index.html?standalone=1#voyage', width, height)
                require(page.locator('.cartridge-card').count() == 6, f'cabinet-{width}: six cartridges missing')
                require(page.locator('.cartridge-emblem svg').count() == 6, f'cabinet-{width}: bespoke sigils missing')
                require(page.locator('.cartridge-engraving img').evaluate_all('(images) => images.every(image => image.complete && image.naturalWidth > 0)'),
                        f'cabinet-{width}: cartridge etching failed to load')
                audit(page, f'cabinet-{width}', CABINET_GROUPS)
                capture(page, f'cartridge-cabinet-{width}')
                check_focus(page, f'cabinet-{width}', '.cartridge-card')
                page.close()

                page = new_page('/index.html#planet/earth', width, height)
                page.locator('.atlas-hero').wait_for(state='visible')
                audit(page, f'atlas-{width}', {'primary':['.atlas-intro'], 'secondary':['.atlas-facts dt']})
                check_primary_button(page, f'atlas-{width}')
                capture(page, f'planetary-atlas-{width}')
                page.locator('#planet-puzzle').scroll_into_view_if_needed()
                page.wait_for_timeout(60)
                require(page.locator('.puzzle-grid').count() == 1, f'atlas-puzzle-{width}: board did not render')
                require(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'atlas-puzzle-{width}: overflow')
                capture(page, f'atlas-watershed-{width}')
                page.close()

            # Real arcade engine: first fixed-clock relic offer, then all widths,
            # keyboard focus, scrolling, and the 200% device-pixel fixture.
            page = new_page('/index.html#arcade', clock=True)
            page.locator('[data-exp="game-forecast"]').first.click()
            page.clock.run_for(15500)
            page.locator('#relic-dialog[open]').wait_for(state='visible')
            require(page.locator('.relic-choice').count() == 3, 'arcade relic: three choices missing')
            require(page.locator('.relic-choice-art svg').count() == 3, 'arcade relic: bespoke upgrade illustrations missing')
            for width, height in VIEWPORTS:
                page.set_viewport_size({'width': width, 'height': height})
                page.locator('#relic-dialog').evaluate('element => { element.scrollTop = 0; }')
                audit(page, f'arcade-relic-{width}', RELIC_GROUPS)
                capture(page, f'arcade-relic-{width}')
            page.set_viewport_size({'width': 390, 'height': 844})
            check_focus(page, 'arcade-relic-390', '.relic-choice', dark=True)
            check_scroll(page, 'arcade-relic-390', '#relic-dialog', '[data-exp="relic-skip"]')
            page.set_viewport_size({'width': 720, 'height': 450})
            session = page.context.new_cdp_session(page)
            session.send('Emulation.setDeviceMetricsOverride', {'width':720, 'height':450, 'deviceScaleFactor':2, 'mobile':False})
            page.wait_for_timeout(60)
            zoom = audit(page, 'arcade-relic-zoom200', RELIC_GROUPS)
            require(zoom['width'] == 720 and zoom['dpr'] == 2, '200% fixture did not produce 720 CSS px at DPR 2')
            check_scroll(page, 'arcade-relic-zoom200', '#relic-dialog', '[data-exp="relic-skip"]')
            capture(page, 'arcade-relic-zoom200')
            raw = session.send('Page.captureScreenshot', {'format':'png', 'captureBeyondViewport':False, 'fromSurface':True})
            png = base64.b64decode(raw['data'])
            require(struct.unpack('>II', png[16:24]) == (1440, 900), '200% device screenshot is not 1440×900')
            (OUT / 'arcade-relic-zoom200-device.png').write_bytes(png)
            session.detach()
            page.close()

            # Real cartridge states. These are interaction captures, not mocked
            # screenshots: fire, start, reveal and inspect the actual engines.
            scenarios = (
                ('starfall-skirmish', 'shooter', '.cartridge-stage canvas'),
                ('aether-bastion', 'bastion', '.cartridge-stage canvas'),
                ('glass-labyrinth', 'labyrinth', '.cartridge-stage canvas'),
                ('constellation-chain', 'chain', '.cartridge-stage canvas'),
                ('deep-field', 'deepfield', '.deepfield-grid'),
                ('starforge', 'starforge', '.starforge-canvas'),
            )
            for width, height in VIEWPORTS:
                for name, cartridge, target in scenarios:
                    page = new_page(f'/index.html?standalone=1&cartridge={cartridge}&mode=campaign#voyage', width, height)
                    page.locator(target).first.wait_for(state='visible')
                    canvas = page.locator('.cartridge-stage canvas').first
                    if cartridge == 'shooter':
                        page.clock.install()
                        for _ in range(6):
                            if canvas.get_attribute('data-phase') == 'combat':
                                break
                            page.clock.run_for(1000)
                        require(canvas.get_attribute('data-phase') == 'combat', f'{name}-{width}: skirmish stayed in its intro')
                        canvas.focus()
                        page.keyboard.down('j')
                        for _ in range(3):
                            page.clock.run_for(250)
                        page.keyboard.up('j')
                    elif cartridge == 'chain':
                        page.locator('[data-chain-start]').click()
                        page.wait_for_function('document.querySelector(".cartridge-stage canvas").dataset.chainPhase === "combat"')
                    elif cartridge == 'deepfield':
                        page.locator('.deepfield-cell').nth(40).click()
                        require(int(page.locator('.deepfield-grid').get_attribute('data-revealed')) > 0, f'deep-field-{width}: real reveal failed')
                    elif cartridge == 'labyrinth':
                        canvas.focus()
                        page.keyboard.down('d')
                        page.wait_for_timeout(100)
                        page.keyboard.up('d')
                    elif cartridge == 'starforge':
                        brief = 'Align an orbital factory, route living starlight, and contain the heat you create.'
                        require(page.locator('.cartridge-header p', has_text=brief).count() == 1,
                                f'{name}-{width}: Starforge brief is duplicated in the cartridge header')
                    page.wait_for_timeout(80)
                    require(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{name}-{width}: horizontal overflow')
                    capture(page, f'{name}-{width}')
                    page.close()

            # Direct unlocked Veteran routes: actual navy header, current copy,
            # readable type and a phone capture for every core cartridge.
            veteran_fixture = {
                'aether-cartridge-records-v1': {
                    'best': {},
                    'clears': {key: 1 for key in ('shooter', 'bastion', 'labyrinth', 'chain', 'deepfield')},
                },
                'aether-starforge-v1': {'completed': 6, 'best': 18},
            }
            for cartridge, expected_copy in VETERAN_COPY.items():
                mode = '' if cartridge == 'starforge' else '&mode=campaign'
                page = new_page(f'/index.html?standalone=1&cartridge={cartridge}{mode}&variant=veteran#voyage',
                                390, 844, fixture=veteran_fixture)
                rule = page.locator('.cartridge-header .veteran-rule')
                require(rule.count() == 1, f'veteran-{cartridge}-390: direct Veteran rule did not render')
                text = rule.inner_text() if rule.count() else ''
                require(expected_copy in text, f'veteran-{cartridge}-390: stale or missing copy: {text}')
                require('Veteran records are kept separately.' in text,
                        f'veteran-{cartridge}-390: record-separation note changed: {text}')
                require(page.locator('.cartridge-stage[data-veteran="true"]').count() == 1,
                        f'veteran-{cartridge}-390: unlock fixture did not mount Veteran mode')
                data = audit(page, f'veteran-{cartridge}-390', {'primary':['.veteran-rule']})
                for item in data['results']:
                    require(item['line'] >= 1.5 - .001,
                            f"veteran-{cartridge}-390: line-height {item['line']:.2f}, expected 1.50")
                capture(page, f'veteran-{cartridge}-390')
                page.close()

            # The final shared score treatment is static, including motion hooks.
            page = new_page('/index.html#arcade', 390, 844)
            score_motion = page.locator('#game-score, #game-best, .motion-score').evaluate_all('''elements => elements.map(element => ({
              id:element.id, animation:getComputedStyle(element).animationName,
              transitions:getComputedStyle(element).transitionDuration
            }))''')
            for item in score_motion:
                require(item['animation'] == 'none', f'score flashes/animates under reduced motion: {item}')
            capture(page, 'cosmic-arcade-390')
            page.close()

            browser.close()
    finally:
        (OUT / 'measurements.json').write_text(json.dumps({
            'measurements':measurements,
            'failures':failures,
            'errors':errors,
            'badResponses':bad_responses,
        }, indent=2))
        server.shutdown()
        server.server_close()

    require(not errors, f'uncaught browser exceptions: {errors}')
    require(not bad_responses, f'failed local asset responses: {bad_responses}')
    print(f'MEASUREMENTS docs/gothic-proof/measurements.json ({len(measurements)} audited states)')
    print(f'SCREENSHOTS docs/gothic-proof ({len(list(OUT.glob("*.png")))} PNG files)')
    if failures:
        raise AssertionError('\n'.join(failures))
    print('Gothic presentation passed: real routes and gameplay, relic 16/14px type, 4.5:1 contrast, 3px focus, 200%/mobile scrolling, local art, reduced motion and no overflow.')
