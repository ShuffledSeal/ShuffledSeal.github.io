#!/usr/bin/env python3
"""Real-browser legibility/accessibility audit for relic and upgrade surfaces.

Run from the repository root with developer-only Python Playwright installed:

    python3 tests/relic-legibility-audit.py

Useful targeted runs:

    python3 tests/relic-legibility-audit.py --surface arcade-draft
    python3 tests/relic-legibility-audit.py --config phone-390-reduced
    python3 tests/relic-legibility-audit.py --surface deepfield --config desktop-1440-zoom-200

The audit drives production routes and real controls. Virtual time advances the
real simulation; it never replaces offers, text, layout, or cosmetic state. A
local static server and fresh browser contexts keep the run isolated. Results
and full-page screenshots are written outside the repository by default.

Exit status is 0 only when every requested surface is reached and no defect is
observed, 1 when defects are observed, and 2 when a surface cannot be audited.
Contrast is a computed-style audit, not a pixel-validator: gradient colour stops
are composited over ancestor surfaces and the weakest plausible ratio is kept.
See docs/relic-legibility-audit.md for thresholds and limitations.
"""

import argparse
import base64
import datetime as dt
import hashlib
import http.server
import json
import socketserver
import sys
import threading
import traceback
from collections import Counter
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = Path('/tmp/opencode/relic-legibility-audit')
SURFACES = (
    'arcade-catalogue', 'arcade-draft', 'chain', 'skirmish',
    'bastion', 'labyrinth', 'deepfield', 'grand-tour',
)
CONFIGS = (
    {'id': 'desktop-1440', 'width': 1440, 'height': 900, 'zoom': 1, 'motion': 'no-preference'},
    {'id': 'phone-390-reduced', 'width': 390, 'height': 844, 'zoom': 1, 'motion': 'reduce'},
    # 1440x900 physical pixels at 200% browser zoom => 720x450 CSS px, DPR 2.
    {'id': 'desktop-1440-zoom-200', 'width': 1440, 'height': 900, 'zoom': 2, 'motion': 'no-preference'},
)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


class SurfaceUnreachable(RuntimeError):
    pass


class Report:
    def __init__(self):
        self.scenarios = []
        self.defects = []
        self.unreached = []

    def defect(self, scenario, category, severity, selector, text, measured, expected):
        issue = {
            'surface': scenario['surface'], 'config': scenario['config'],
            'category': category, 'severity': severity, 'selector': selector,
            'text': ' '.join(text.split())[:180], 'measured': measured, 'expected': expected,
        }
        # The same element can be encountered by both the range and scroll
        # probes. Keep genuinely distinct measurements, not duplicate reports.
        key = json.dumps(issue, sort_keys=True)
        if all(json.dumps(old, sort_keys=True) != key for old in self.defects):
            self.defects.append(issue)

    def unreached_surface(self, scenario, message):
        self.unreached.append({**scenario, 'reason': message})


# JavaScript measurement helpers. All values come from computed styles and real
# DOM ranges. Gradient analysis deliberately returns the weakest candidate and
# records the colour pair so a reviewer can inspect ambiguous cases.
JS_HELPERS = r"""
const parseColor = value => {
  if (!value || value === 'transparent') return {r:0,g:0,b:0,a:0};
  let m = value.match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (m) return {r:+m[1],g:+m[2],b:+m[3],a:m[4] === undefined ? 1 : +m[4]};
  m = value.match(/^#([\da-f]{3,8})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3 || h.length === 4) h = [...h].map(c => c+c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:h.length === 8 ? parseInt(h.slice(6,8),16)/255 : 1};
};
const composite = (f,b) => {
  const a = f.a + b.a*(1-f.a);
  if (!a) return {r:0,g:0,b:0,a:0};
  return {r:(f.r*f.a+b.r*b.a*(1-f.a))/a,g:(f.g*f.a+b.g*b.a*(1-f.a))/a,b:(f.b*f.a+b.b*b.a*(1-f.a))/a,a};
};
const rgb = c => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${c.a.toFixed(3)})`;
const luminance = c => {
  const channel = v => {v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);};
  return .2126*channel(c.r)+.7152*channel(c.g)+.0722*channel(c.b);
};
const ratio = (a,b) => {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const colourStops = image => {
  if (!image || !image.includes('gradient(')) return [];
  const found = image.match(/rgba?\([^)]*\)|#[\da-fA-F]{3,8}\b/g) || [];
  return found.map(parseColor).filter(Boolean);
};
const backgrounds = element => {
  const chain=[];
  for(let node=element;node instanceof Element;node=node.parentElement) chain.push(node);
  let bases=[{r:255,g:255,b:255,a:1}];
  const applyLayer=(style,input)=>{
    let output=input,colour=parseColor(style.backgroundColor);
    if(colour && colour.a>0) output=output.map(base=>composite(colour,base));
    // The local parchment asset has an opaque #d8c6a1 base with low-opacity
    // noise. Computed CSS reports only url(...), so account for that real surface
    // explicitly instead of accidentally contrasting light text with dark blue.
    if(style.backgroundImage.includes('parchment.svg')) {
      const paper={r:216,g:198,b:161,a:1};
      output=output.map(base=>composite(paper,base));
    }
    const stops=colourStops(style.backgroundImage);
    if(stops.length) {
      const options=[];
      // A partially transparent gradient exposes its underlying surface in at
      // least some areas. Opaque gradients do not need that fallback candidate.
      if(stops.some(c=>c.a<.98)) options.push(...output);
      for(const stop of stops) if(stop.a>.02) for(const base of output) options.push(composite(stop,base));
      if(options.length) output=options;
    }
    const unique=new Map();
    for(const base of output) unique.set(rgb(base),base);
    return [...unique.values()].slice(0,80);
  };
  for(const node of chain.reverse()) {
    bases=applyLayer(getComputedStyle(node),bases);
    // Folio buttons paint their actual enamel/parchment fill on a negative-
    // z-index pseudo-element behind the label. Include that real layer, but not
    // foreground corner ornaments (whose tiny radial dots are not full surfaces).
    for(const pseudo of ['::before','::after']) {
      const style=getComputedStyle(node,pseudo);
      if(style.content!=='none'&&style.position==='absolute'&&parseInt(style.zIndex,10)<0&&style.display!=='none'&&Number(style.opacity)!==0) {
        bases=applyLayer(style,bases);
      }
    }
  }
  return bases;
};
const contrastFor = (element, colourValue) => {
  const foreground=parseColor(colourValue || getComputedStyle(element).color) || {r:0,g:0,b:0,a:1};
  const candidates=backgrounds(element).map(background=>{
    const opaque={...background,a:1};
    const fg=composite(foreground,opaque);
    return {ratio:ratio({...fg,a:1},opaque),foreground:rgb(fg),background:rgb(background)};
  }).sort((a,b)=>a.ratio-b.ratio);
  return {min:candidates[0] || {ratio:0,foreground:rgb(foreground),background:'unknown'},max:candidates.at(-1)?.ratio || 0};
};
const selectorFor = (element,root) => {
  if(element.id) return `#${CSS.escape(element.id)}`;
  const parts=[];
  for(let node=element;node && node!==root.parentElement;node=node.parentElement) {
    if(!node || node.nodeType!==1) break;
    let part=node.localName;
    if(node.classList.length) part+='.'+[...node.classList].slice(0,3).map(CSS.escape).join('.');
    if(node.parentElement) {
      const siblings=[...node.parentElement.children].filter(s=>s.localName===node.localName);
      if(siblings.length>1) part+=`:nth-of-type(${siblings.indexOf(node)+1})`;
    }
    parts.unshift(part);
    if(node===root) break;
  }
  return parts.join(' > ');
};
const essentialCopy = element => element.matches([
  '.upgrade-copy','.upgrade-copy *','.relic-choice-effect','.relic-entry p',
  '.df-relics small','.tour-cache-card small','.tour-cache-card em',
  '.bastion-orders p','[data-bastion-selection]','.chain-status','.chain-build',
  '.chain-draft p','.relic-dialog-footer *','.df-intermission > p','.df-relic-choice',
  '.relic-dialog-heading > p:last-child','.tour-node-brief','.tour-inline-exit',
].join(','));
const metadataCopy = element => !essentialCopy(element) && element.matches([
  '.eyebrow','.df-kicker','.relic-choice-tag','.relic-choice-number',
  '.relic-choice-pair','.relic-entry small','small','.choice-number',
].join(','));
"""


def measure_surface(page, root, scenario, report):
    """Collect text metrics and issue defects without stopping the scenario."""
    data = root.evaluate("""root => {
""" + JS_HELPERS + r"""
      const directlyVisible = element => {
        if(element.closest('[aria-hidden="true"]')) return false;
        for(let node=element;node && node!==root.parentElement;node=node.parentElement) {
          const style=getComputedStyle(node);
          if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||Number(style.opacity)===0) return false;
        }
        const rect=element.getBoundingClientRect();
        return rect.width>0&&rect.height>0;
      };
      const textNodes = element => [...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
      const elements=[root,...root.querySelectorAll('*')].filter(element=>!element.closest('svg,canvas,script,style')&&directlyVisible(element)&&textNodes(element).length);
      const samples=[];
      for(const element of elements) {
        const style=getComputedStyle(element), size=parseFloat(style.fontSize), weight=parseInt(style.fontWeight,10)||400;
        const essential=essentialCopy(element)||(!metadataCopy(element)&&!['H1','H2','H3'].includes(element.tagName));
        const metadata=metadataCopy(element);
        const heading=['H1','H2','H3'].includes(element.tagName)||size>=18;
        const nodes=textNodes(element), ranges=nodes.map(node=>{const range=document.createRange();range.selectNode(node);return range.getBoundingClientRect();});
        let measuredNormal=0;
        if(style.lineHeight==='normal') for(const node of nodes) {
          const range=document.createRange();range.selectNode(node);
          const first=range.getClientRects()[0];if(first) measuredNormal=Math.max(measuredNormal,first.height);
        }
        const line=style.lineHeight==='normal'?(measuredNormal||size*1.2):parseFloat(style.lineHeight);
        const contrast=contrastFor(element);
        let clipX=0,clipY=0,clipSelector='';
        for(let ancestor=element;ancestor&&ancestor!==root.parentElement;ancestor=ancestor.parentElement) {
          const cs=getComputedStyle(ancestor), rect=ancestor.getBoundingClientRect();
          const ox=cs.overflowX,oy=cs.overflowY;
          if(['auto','scroll'].includes(ox)&&['auto','scroll'].includes(oy)) break;
          if(['hidden','clip'].includes(ox)) for(const range of ranges) {
            const amount=Math.max(rect.left-range.left,range.right-rect.right);
            if(amount>clipX){clipX=amount;clipSelector=selectorFor(ancestor,root);}
          }
          if(['hidden','clip'].includes(oy)) for(const range of ranges) {
            const amount=Math.max(rect.top-range.top,range.bottom-rect.bottom);
            if(amount>clipY){clipY=amount;clipSelector=selectorFor(ancestor,root);}
          }
          if(['auto','scroll'].includes(ox)||['auto','scroll'].includes(oy)) break;
        }
        samples.push({
          selector:selectorFor(element,root),text:element.textContent.trim().replace(/\s+/g,' ').slice(0,180),
          tag:element.localName,size,weight,lineHeight:style.lineHeight,linePx:line,
          lineRatio:size?line/size:0,essential,metadata,heading,
          minFont:metadata?10:(heading?16:12),minLine:heading?1.1:(metadata?1.3:1.4),
          large:size>=24||(size>=18.66&&weight>=700),disabled:Boolean(element.closest(':disabled')),
          contrast:contrast.min.ratio,contrastMax:contrast.max,fg:contrast.min.foreground,bg:contrast.min.background,
          scrollX:element.clientWidth>0?Math.max(0,element.scrollWidth-element.clientWidth):0,
          scrollY:element.clientHeight>0?Math.max(0,element.scrollHeight-element.clientHeight):0,
          overflowX:style.overflowX,overflowY:style.overflowY,clipX,clipY,clipSelector,
        });
      }
      const animated=[root,...root.querySelectorAll('*')].filter(directlyVisible).map(element=>{
        const style=getComputedStyle(element);
        return {selector:selectorFor(element,root),name:style.animationName,duration:style.animationDuration,transition:style.transitionDuration};
      }).filter(item=>item.name!=='none'&&!['0s','0ms'].includes(item.duration));
      const activeAnimations=root.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length;
      return {
        samples,animated,activeAnimations,
        rootClientWidth:root.clientWidth,rootScrollWidth:root.scrollWidth,
        rootClientHeight:root.clientHeight,rootScrollHeight:root.scrollHeight,
        pageClientWidth:document.documentElement.clientWidth,pageScrollWidth:document.documentElement.scrollWidth,
        innerWidth,innerHeight,outerWidth,outerHeight,dpr:devicePixelRatio,
        reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
        activeElement:document.activeElement?selectorFor(document.activeElement,document.body):null,
        activeInRoot:root.contains(document.activeElement),
      };
    }""")

    for sample in data['samples']:
        where = sample['selector']
        text = sample['text']
        # Inactive controls are exempt from WCAG contrast, but their dimensions,
        # clipping and keyboard state remain visible in the raw measurements.
        if not sample['disabled']:
            required = 3 if sample['large'] else 4.5
            if sample['contrast'] + .005 < required:
                report.defect(scenario, 'contrast', 'P1', where, text,
                              f"{sample['contrast']:.2f}:1 (range to {sample['contrastMax']:.2f}:1; {sample['fg']} on {sample['bg']})",
                              f'>={required}:1; weakest computed gradient/ancestor candidate')
        if sample['size'] + .01 < sample['minFont']:
            severity = 'P2' if sample['metadata'] else 'P1'
            report.defect(scenario, 'font-size', severity, where, text,
                          f"{sample['size']:.2f}px", f">={sample['minFont']}px ({'metadata' if sample['metadata'] else 'essential/heading'} copy)")
        if sample['lineRatio'] + .01 < sample['minLine']:
            report.defect(scenario, 'line-height', 'P2', where, text,
                          f"{sample['lineHeight']}; measured line box {sample['linePx']:.2f}px = {sample['lineRatio']:.2f}×",
                          f">={sample['minLine']:.2f}×")
        if sample['clipX'] > 1 or sample['scrollX'] > 1 and sample['overflowX'] in ('hidden', 'clip'):
            report.defect(scenario, 'text-clipping-x', 'P1', where, text,
                          f"range clip {sample['clipX']:.1f}px; scroll overflow {sample['scrollX']}px via {sample['clipSelector'] or where}",
                          'no horizontally clipped text')
        if sample['clipY'] > 1 or sample['scrollY'] > 1 and sample['overflowY'] in ('hidden', 'clip'):
            report.defect(scenario, 'text-clipping-y', 'P1', where, text,
                          f"range clip {sample['clipY']:.1f}px; scroll overflow {sample['scrollY']}px via {sample['clipSelector'] or where}",
                          'no vertically clipped text')

    if data['rootScrollWidth'] > data['rootClientWidth'] + 1:
        report.defect(scenario, 'surface-horizontal-overflow', 'P1', scenario['root'], '',
                      f"scrollWidth {data['rootScrollWidth']}px > clientWidth {data['rootClientWidth']}px",
                      'no horizontal scrolling within relic/upgrade surface')
    if data['pageScrollWidth'] > data['pageClientWidth'] + 1:
        report.defect(scenario, 'page-horizontal-overflow', 'P1', 'html', '',
                      f"scrollWidth {data['pageScrollWidth']}px > clientWidth {data['pageClientWidth']}px",
                      'page fits the effective CSS viewport')
    if scenario['motion'] == 'reduce':
        if not data['reduced']:
            report.defect(scenario, 'reduced-motion-media', 'P1', 'matchMedia', '',
                          'preference not active', 'prefers-reduced-motion: reduce is active')
        for item in data['animated']:
            report.defect(scenario, 'reduced-motion-animation', 'P2', item['selector'], '',
                          f"{item['name']} {item['duration']}", 'no nonessential CSS animation under reduced motion')
        if data['activeAnimations']:
            report.defect(scenario, 'reduced-motion-active', 'P2', scenario['root'], '',
                          f"{data['activeAnimations']} running Web Animations", '0 running CSS/Web animations in the static surface')

    # Keyboard reachability and visible focus. Pressing Tab establishes keyboard
    # modality, then each real transition is checked against the next control.
    controls = [control for control in root.locator(
        'button:not([disabled]), a[href], summary, input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ).all() if control.is_visible() and control.evaluate('(element) => element.tabIndex >= 0')]
    focus_results = []
    if controls:
        page.keyboard.press('Tab')
        baselines = [control.evaluate("""element => {
          const s=getComputedStyle(element);return {border:s.borderColor,shadow:s.boxShadow,background:s.backgroundColor};
        }""") for control in controls]
        for index, control in enumerate(controls):
            control.focus()
            style = control.evaluate("""element => {
""" + JS_HELPERS + r"""
              const s=getComputedStyle(element), contrast=contrastFor(element.parentElement||element,s.outlineColor);
              return {focusVisible:element.matches(':focus-visible'),outlineStyle:s.outlineStyle,
                outlineWidth:parseFloat(s.outlineWidth),outlineColor:s.outlineColor,
                outlineContrast:contrast.min.ratio,border:s.borderColor,shadow:s.boxShadow,
                background:s.backgroundColor,selector:selectorFor(element,element.ownerDocument.body)};
            }""")
            base = baselines[index]
            changed = any(style[key] != base[key] for key in ('border', 'shadow', 'background'))
            outline = style['outlineStyle'] != 'none' and style['outlineWidth'] >= 1
            focus_results.append(style)
            if not outline and not changed:
                report.defect(scenario, 'focus-indicator', 'P1', style['selector'], '',
                              'no outline or focus-related border/shadow/background change',
                              'visible indicator for every keyboard-focusable control')
            elif outline and style['outlineContrast'] < 2.95:
                report.defect(scenario, 'focus-contrast', 'P1', style['selector'], '',
                              f"outline {style['outlineColor']} at {style['outlineContrast']:.2f}:1",
                              '>=3:1 against the adjacent computed surface')
            if index + 1 < len(controls):
                page.keyboard.press('Tab')
                following = controls[index + 1]
                if not following.evaluate('(element) => document.activeElement === element'):
                    actual = page.evaluate("""() => document.activeElement ? document.activeElement.outerHTML.slice(0,240) : 'none'""")
                    report.defect(scenario, 'keyboard-order', 'P1', style['selector'], '',
                                  f'Tab moved to {actual}', f"Tab reaches {following.evaluate('(e)=>e.outerHTML.slice(0,180)')}")
                    following.focus()
        # The final focus is left in the surface, matching a keyboard reviewer.
    if scenario['surface'] in ('arcade-draft', 'chain', 'deepfield', 'grand-tour') and not data['activeInRoot']:
        report.defect(scenario, 'initial-focus', 'P1', scenario['root'], '',
                      f"active element was {data['activeElement']}",
                      'focus enters the newly opened relic/instrument choice')

    summary = {
        'textSamples': len(data['samples']),
        'controls': len(controls),
        'focusVisibleSamples': sum(bool(item['focusVisible']) for item in focus_results),
        'minFont': min((sample['size'] for sample in data['samples']), default=None),
        'minContrast': min((sample['contrast'] for sample in data['samples'] if not sample['disabled']), default=None),
        'maxContrast': max((sample['contrast'] for sample in data['samples'] if not sample['disabled']), default=None),
        'metrics': {key: data[key] for key in (
            'rootClientWidth', 'rootScrollWidth', 'rootClientHeight', 'rootScrollHeight',
            'pageClientWidth', 'pageScrollWidth', 'innerWidth', 'innerHeight',
            'outerWidth', 'outerHeight', 'dpr', 'reduced', 'activeElement', 'activeInRoot',
        )},
        'samples': data['samples'], 'focus': focus_results,
    }
    return summary


def install_virtual_clock(page):
    page.clock.install()


def run_clock(page, milliseconds):
    page.clock.run_for(milliseconds)


def canvas_point(canvas, x, y):
    box = canvas.bounding_box()
    if not box:
        raise SurfaceUnreachable('canvas has no layout box')
    return box['x'] + box['width'] * x / 900, box['y'] + box['height'] * y / 560


def reach_arcade_catalogue(page, base):
    page.goto(f'{base}/index.html#arcade', wait_until='networkidle')
    details = page.locator('.relic-field-guide')
    details.wait_for(state='visible')
    if details.get_attribute('open') is None:
        details.locator('summary').click()
    page.locator('.relic-entry').first.wait_for(state='visible')
    return details


def reach_arcade_draft(page, base):
    install_virtual_clock(page)
    page.goto(f'{base}/index.html#arcade', wait_until='networkidle')
    start = page.locator('[data-exp="game-forecast"]').first
    if not start.count():
        start = page.locator('#game-start')
    start.click()
    # Planet Drop's documented quiet-run fallback earns a genuine first offer.
    run_clock(page, 17500)
    dialog = page.locator('#relic-dialog')
    try:
        page.wait_for_function("document.querySelector('#relic-dialog')?.open", timeout=2500)
    except Exception as error:
        raise SurfaceUnreachable(f"real arcade draft did not open after 17.5 simulated seconds: {error}") from error
    if dialog.locator('.relic-choice').count() != 3:
        raise SurfaceUnreachable('arcade draft did not expose three real choices')
    return dialog


def reach_chain(page, base):
    install_virtual_clock(page)
    page.goto(f'{base}/index.html?standalone=1&cartridge=chain&mode=campaign#voyage', wait_until='networkidle')
    page.locator('[data-chain-formation="spear"]').click()
    page.locator('[data-chain-start]').click()
    canvas = page.locator('.cartridge-stage canvas')
    page.mouse.move(*canvas_point(canvas, 117, 112))
    for _ in range(55):
        if canvas.get_attribute('data-chain-phase') == 'draft':
            break
        if not canvas.count() or page.locator('.cartridge-recap').count():
            break
        run_clock(page, 1000)
    if not canvas.count() or canvas.get_attribute('data-chain-phase') != 'draft':
        state = canvas.evaluate('(element) => ({...element.dataset})') if canvas.count() else {}
        raise SurfaceUnreachable(f'Chain first encounter did not reach its draft: {state}')
    if page.locator('[data-chain-choice]').count() != 3:
        raise SurfaceUnreachable('Chain draft did not expose three choices')
    # Include the formation controls and the real relic offer in one surface.
    return page.locator('.chain-controls')


def reach_skirmish(page, base):
    install_virtual_clock(page)
    page.goto(f'{base}/index.html?standalone=1&cartridge=shooter#voyage', wait_until='networkidle')
    canvas = page.locator('.cartridge-stage canvas')
    canvas.focus()
    page.keyboard.down('j')
    weave = ('w', 'd', 's', 'a')
    try:
        for index in range(75):
            if canvas.get_attribute('data-phase') == 'draft' or not canvas.count():
                break
            key = weave[index % len(weave)]
            page.keyboard.down(key)
            run_clock(page, 500)
            page.keyboard.up(key)
            if index % 6 == 5 and canvas.count() and canvas.get_attribute('data-phase') == 'combat':
                canvas.press(' ')
    finally:
        page.keyboard.up('j')
        for key in weave:
            page.keyboard.up(key)
    if not canvas.count() or canvas.get_attribute('data-phase') != 'draft':
        state = canvas.evaluate('(element) => ({...element.dataset})') if canvas.count() else {}
        raise SurfaceUnreachable(f'Skirmish did not reach a field refit through real fire/movement: {state}')
    return page.locator('.skirmish-draft')


def reach_bastion(page, base):
    page.goto(f'{base}/index.html?standalone=1&cartridge=bastion&mode=campaign#voyage', wait_until='networkidle')
    canvas = page.locator('.cartridge-stage canvas')
    canvas.wait_for(state='visible')
    canvas.click(position={'x': canvas.bounding_box()['width'] * 364 / 900,
                           'y': canvas.bounding_box()['height'] * 219 / 560})
    page.wait_for_function("document.querySelector('[data-bastion-selection]')?.textContent.includes('alloy/refinement')")
    # The trial frame includes tower construction, forecast, selected-tower
    # refinement and all their actual computed backgrounds.
    return page.locator('.trial-frame')


def reach_labyrinth(page, base):
    install_virtual_clock(page)
    page.goto(f'{base}/index.html?standalone=1&cartridge=labyrinth&mode=campaign#voyage', wait_until='networkidle')
    canvas = page.locator('.cartridge-stage canvas')
    canvas.wait_for(state='visible')
    run_clock(page, 1500)
    canvas.focus()

    def move(key, axis, target, greater=True):
        page.keyboard.down(key)
        try:
            for _ in range(150):
                value = canvas.get_attribute(f'data-{axis}')
                if value is not None and ((float(value) >= target) if greater else (float(value) <= target)):
                    return
                if not canvas.count() or page.locator('.cartridge-recap').count():
                    break
                run_clock(page, 50)
            raise SurfaceUnreachable(f'Labyrinth route stalled at {axis}={canvas.get_attribute(f"data-{axis}")}, target {target}')
        finally:
            page.keyboard.up(key)

    # Proven authored chamber-I route from the existing roguelite regression.
    move('w', 'player-y', 177, False)
    move('d', 'player-x', 237)
    move('s', 'player-y', 282)
    move('d', 'player-x', 427)
    move('s', 'player-y', 323)
    move('d', 'player-x', 503)
    move('s', 'player-y', 363)
    if canvas.get_attribute('data-keys-found') != '2':
        raise SurfaceUnreachable('Labyrinth real route did not collect both required keys')
    move('d', 'player-x', 555)
    canvas.press(' ')
    move('d', 'player-x', 580)
    move('s', 'player-y', 402)
    move('d', 'player-x', 740)
    page.keyboard.down('w')
    try:
        for _ in range(140):
            if canvas.get_attribute('data-draft') == 'open':
                break
            run_clock(page, 50)
    finally:
        page.keyboard.up('w')
    if canvas.get_attribute('data-draft') != 'open':
        raise SurfaceUnreachable(f"Labyrinth escape did not open its relic draft: {canvas.evaluate('(e)=>({...e.dataset})')}")
    return page.locator('.labyrinth-draft')


def reach_deepfield(page, base):
    page.goto(f'{base}/index.html?standalone=1&cartridge=deepfield&mode=campaign#voyage', wait_until='networkidle')
    board = page.locator('.deepfield-grid')
    board.wait_for(state='visible')
    page.locator('.deepfield-cell').nth(40).click()
    args = board.evaluate("""board => ({
      cols:Number(board.getAttribute('aria-colcount')),rows:Number(board.getAttribute('aria-rowcount')),
      mines:Number(board.dataset.mines),seed:Number(board.dataset.seed),safeIndex:40,
    })""")
    grid = page.evaluate('(args) => AetherDeepField.generate(args).grid', args)
    # Use the public deterministic generator only to avoid mines; every reveal
    # still goes through the actual cell's click control, as in the release test.
    page.evaluate("""grid => {
      document.querySelectorAll('.deepfield-cell').forEach((cell,index)=>{if(grid[index]>=0)cell.click();});
    }""", grid)
    intermission = page.locator('.df-intermission')
    try:
        intermission.wait_for(state='visible', timeout=2500)
    except Exception as error:
        raise SurfaceUnreachable(f'Deep Field campaign did not reach its intermission: {error}') from error
    return intermission


def reach_grand_tour(page, base):
    page.goto(f'{base}/index.html?standalone=1&tour=1#voyage', wait_until='networkidle')
    page.locator('[data-tour="begin"]').click()
    page.locator('[data-tour-node="0:0"]').click()
    # A real abort advances the first encounter at the cost of one hull.
    page.locator('[data-tour="retreat"]').click()
    # The fixed route's second leg has an oddity. Leaving it untouched is a real,
    # non-destructive way to reach the third-leg instrument draft.
    page.locator('[data-tour-node="1:1"]').click()
    page.locator('.tour-inline-exit[data-tour="leave"]').click()
    page.locator('[data-tour-node="2:1"]').click()
    draft = page.locator('.tour-cache')
    try:
        page.locator('[data-draft]').first.wait_for(state='visible', timeout=2500)
    except Exception as error:
        raise SurfaceUnreachable(f'Grand Tour route did not reach the instrument draft: {error}') from error
    if draft.locator('[data-draft]').count() < 3:
        raise SurfaceUnreachable('Grand Tour instrument draft offered fewer than three instruments')
    return draft


REACH = {
    'arcade-catalogue': reach_arcade_catalogue,
    'arcade-draft': reach_arcade_draft,
    'chain': reach_chain,
    'skirmish': reach_skirmish,
    'bastion': reach_bastion,
    'labyrinth': reach_labyrinth,
    'deepfield': reach_deepfield,
    'grand-tour': reach_grand_tour,
}
MIN_TEXT_SAMPLES = {
    'arcade-catalogue': 20, 'arcade-draft': 17, 'chain': 10, 'skirmish': 5,
    'bastion': 21, 'labyrinth': 4, 'deepfield': 11, 'grand-tour': 15,
}
ROOT_SELECTORS = {
    'arcade-catalogue': '.relic-field-guide',
    'arcade-draft': '#relic-dialog',
    'chain': '.chain-controls',
    'skirmish': '.skirmish-draft',
    'bastion': '.trial-frame',
    'labyrinth': '.labyrinth-draft',
    'deepfield': '.df-intermission',
    'grand-tour': '.tour-cache',
}


def apply_browser_zoom(page, config):
    """Emulate Chromium browser zoom using device metrics, never CSS zoom.

    At zoom=2 the screenshot remains the requested physical size while CSS
    layout sees half as many CSS pixels and devicePixelRatio becomes 2. This
    matches the important browser-zoom behaviour and exercises real reflow.
    """
    zoom = config['zoom']
    if zoom == 1:
        return
    session = page.context.new_cdp_session(page)
    session.send('Emulation.setDeviceMetricsOverride', {
        'width': round(config['width'] / zoom),
        'height': round(config['height'] / zoom),
        'deviceScaleFactor': zoom,
        'mobile': False,
        # Keep input scale at 1. `scale: 2` also scales CDP pointer hit-testing
        # and would create artificial intercepted clicks in Playwright.
        'scale': 1,
    })
    metrics = page.evaluate('({innerWidth,innerHeight,dpr:devicePixelRatio,outerWidth})')
    expected_width = round(config['width'] / zoom)
    if metrics['innerWidth'] != expected_width or metrics['dpr'] != zoom or metrics['outerWidth'] != config['width']:
        raise SurfaceUnreachable(f'200% browser-zoom device metrics did not apply: {metrics}')


def capture_scenario(page, config, path):
    """Capture the actual audited layout without resetting zoom device metrics.

    Playwright's full_page screenshot temporarily restores the original viewport,
    which would turn a 200% zoom screenshot back into a desktop screenshot. CDP
    captureBeyondViewport with an explicit document clip preserves the 720px CSS
    layout and scales it to the requested 1440px physical image instead.
    """
    if config['zoom'] == 1:
        page.screenshot(path=str(path), full_page=True, animations='disabled')
        return
    session = page.context.new_cdp_session(page)
    dimensions = page.evaluate('({width:innerWidth,height:document.documentElement.scrollHeight})')
    image = session.send('Page.captureScreenshot', {
        'format': 'png', 'captureBeyondViewport': True,
        'clip': {'x': 0, 'y': 0, 'width': dimensions['width'],
                 'height': dimensions['height'], 'scale': config['zoom']},
    })
    path.write_bytes(base64.b64decode(image['data']))


def source_fingerprint():
    """Tie observations to the concurrently evolving cascade, not a vague build."""
    files = ('relics.css', 'instrument-games.css', 'aetherium.css', 'voyage.css',
             'deepfield.css', 'premium.css', 'atelier.css', 'motion.css',
             'observatory.js', 'trials-action.js', 'trials-premium.js',
             'skirmish.js', 'deepfield.js', 'voyage.js')
    return {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in files}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--surface', action='append', choices=SURFACES, help='audit only this surface (repeatable)')
    parser.add_argument('--config', action='append', choices=[c['id'] for c in CONFIGS], help='audit only this viewport (repeatable)')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT, help='artifact directory (default: /tmp/opencode/relic-legibility-audit)')
    parser.add_argument('--no-screenshots', action='store_true', help='skip full-page screenshots (measurements are unchanged)')
    args = parser.parse_args()
    surfaces = args.surface or list(SURFACES)
    configs = [config for config in CONFIGS if not args.config or config['id'] in args.config]
    args.output.mkdir(parents=True, exist_ok=True)
    report = Report()
    source_before = source_fingerprint()

    with Server(('127.0.0.1', 0), QuietHandler) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_address[1]}'
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                for config in configs:
                    for surface in surfaces:
                        scenario = {'surface': surface, 'config': config['id'], 'motion': config['motion'], 'root': ROOT_SELECTORS[surface]}
                        before = len(report.defects)
                        page_errors = []
                        page = None
                        print(f"RUN {surface} [{config['id']}]", flush=True)
                        try:
                            page = browser.new_page(
                                viewport={'width': config['width'], 'height': config['height']},
                                reduced_motion=config['motion'],
                                is_mobile=config['id'] == 'phone-390-reduced',
                                has_touch=config['id'] == 'phone-390-reduced',
                            )
                            page.on('pageerror', lambda error, bucket=page_errors: bucket.append(str(error)))
                            apply_browser_zoom(page, config)
                            root = REACH[surface](page, base)
                            root.wait_for(state='visible')
                            # Let real entrance animations finish before sampling.
                            # Otherwise delayed arcade cards can still be opacity:0
                            # and a partial offer would look like a clean audit.
                            page.wait_for_timeout(750)
                            page.evaluate('document.fonts.ready')
                            summary = measure_surface(page, root, scenario, report)
                            if summary['textSamples'] < MIN_TEXT_SAMPLES[surface]:
                                del report.defects[before:]
                                raise SurfaceUnreachable(
                                    f"incomplete text coverage: {summary['textSamples']} visible samples; "
                                    f"expected at least {MIN_TEXT_SAMPLES[surface]} after entrance animations settle"
                                )
                            if page_errors:
                                report.defect(scenario, 'browser-exception', 'P1', 'window', '',
                                              '; '.join(page_errors), 'no uncaught browser exceptions')
                            scenario_result = {
                                **scenario, 'reached': True, 'summary': summary,
                                'defectCount': len(report.defects) - before,
                                'pageErrors': page_errors,
                            }
                            if not args.no_screenshots:
                                screenshot = args.output / f"{surface}--{config['id']}.png"
                                capture_scenario(page, config, screenshot)
                                scenario_result['screenshot'] = str(screenshot)
                            report.scenarios.append(scenario_result)
                            outcome = 'PASS' if not scenario_result['defectCount'] else f"FAIL ({scenario_result['defectCount']} defects)"
                            minimum_contrast = f"{summary['minContrast']:.2f}" if summary['minContrast'] is not None else 'n/a'
                            print(f"  {outcome}: {summary['textSamples']} text samples, "
                                  f"min font {summary['minFont']}, min contrast {minimum_contrast}, "
                                  f"{summary['controls']} controls", flush=True)
                        except Exception as error:
                            reason = f'{type(error).__name__}: {error}'
                            report.unreached_surface(scenario, reason)
                            report.scenarios.append({**scenario, 'reached': False, 'error': reason,
                                                     'traceback': traceback.format_exc(), 'pageErrors': page_errors})
                            print(f'  UNREACHED: {reason}', flush=True)
                            if page and not args.no_screenshots:
                                try:
                                    capture_scenario(page, config, args.output / f"UNREACHED--{surface}--{config['id']}.png")
                                except Exception:
                                    pass
                        finally:
                            if page:
                                page.close()
                browser.close()
        finally:
            server.shutdown()
            server.server_close()

    source_after = source_fingerprint()
    changed_sources = [name for name in source_before if source_before[name] != source_after[name]]
    result = {
        'auditedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
        'engine': 'Python Playwright / Chromium',
        'sourceBefore': source_before, 'sourceAfter': source_after,
        'sourceChangedDuringRun': changed_sources,
        'matrix': list(configs),
        'thresholds': {
            'normalTextContrast': 4.5, 'largeTextContrast': 3.0,
            'essentialFontPx': 12, 'metadataFontPx': 10,
            'essentialLineHeight': 1.4, 'metadataLineHeight': 1.3,
            'focusContrast': 3.0, 'overflowTolerancePx': 1,
        },
        'scenarios': report.scenarios, 'defects': report.defects, 'unreached': report.unreached,
    }
    json_path = args.output / 'report.json'
    json_path.write_text(json.dumps(result, indent=2), encoding='utf-8')

    print('\n=== DEFECTS (observed; no thresholds relaxed) ===')
    if not report.defects:
        print('None')
    else:
        for index, issue in enumerate(report.defects, 1):
            print(f"{index:03d} {issue['severity']} {issue['surface']} [{issue['config']}] "
                  f"{issue['category']} {issue['selector']}\n"
                  f"    text: {issue['text'] or '(container)'}\n"
                  f"    measured: {issue['measured']}\n"
                  f"    expected: {issue['expected']}")
    print('\n=== SUMMARY ===')
    print(f"Reached: {sum(bool(s.get('reached')) for s in report.scenarios)}/{len(report.scenarios)}")
    print(f"Defects: {len(report.defects)} {dict(Counter(issue['category'] for issue in report.defects))}")
    print(f"By severity: {dict(Counter(issue['severity'] for issue in report.defects))}")
    print(f"Unreached: {len(report.unreached)}")
    if changed_sources:
        print(f"WARNING: sources changed during this run; rerun for one coherent snapshot: {', '.join(changed_sources)}")
    for item in report.unreached:
        print(f"  {item['surface']} [{item['config']}]: {item['reason']}")
    print(f'JSON: {json_path}')
    if report.unreached:
        return 2
    return 1 if report.defects else 0


if __name__ == '__main__':
    sys.exit(main())
