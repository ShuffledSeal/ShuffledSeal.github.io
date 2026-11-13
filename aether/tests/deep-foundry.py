"""Nocturne Deep Field and Nocturne Machina end-to-end Playwright regression.

Run from the cartridge directory: python3 tests/deep-foundry.py
The Nocturne charts are cleared exclusively through visible clues and public
canticles. Hidden grid values are read only for revealed-number clues and for
one targeted hazard fixture, never to choose the full expedition's moves.
Screenshots are written to /tmp/opencode/deep-foundry-*.
"""
import http.server
import math
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path('/tmp/opencode')
ARTIFACTS.mkdir(parents=True, exist_ok=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def mount_deepfield(page, *, seed=24680, preset='nocturne', veteran=True):
    page.evaluate('''({seed, preset, veteran}) => {
        window.__deep?.destroy();
        document.querySelector('#deep-foundry-df')?.remove();
        localStorage.setItem('aether-deep-field-settings-v1', JSON.stringify({sound:false, preset, zoom:1}));
        for (const child of document.body.children) if (child.tagName !== 'SCRIPT') child.style.setProperty('display', 'none', 'important');
        document.body.style.margin = '0';
        const host = document.createElement('div'); host.id = 'deep-foundry-df';
        host.style.cssText = 'position:relative;min-height:100vh;background:#050711'; document.body.append(host);
        window.__deepEvents = [];
        window.__deep = AetherDeepField.create(host, {veteran, endless:true, seed, sound:false,
            onEnd(event) { window.__deepEvents.push(event); }});
    }''', {'seed': seed, 'preset': preset, 'veteran': veteran})


def clear_nocturne_visibly(page, opening):
    """Solve with revealed numbers, committed flags and displayed line totals only."""
    page.locator('#deep-foundry-df .deepfield-cell').nth(opening).click()
    result = page.evaluate('''() => {
        const game = window.__deep, host = document.querySelector('#deep-foundry-df');
        const board = host.querySelector('.deepfield-grid');
        const mode = name => host.querySelector(`[data-df-action="${name}-mode"]`).click();
        let wards = 0, flags = 0, reveals = 0;
        for (let iteration = 0; iteration < 400; iteration++) {
            if (board.dataset.over === 'true') return {won:board.dataset.won === 'true', wards, flags, reveals,
                seals:game.snapshot().sealsFound.length, steps:game.snapshot().solutionSteps};
            const state = game.snapshot(), clues = {};
            // Hidden values are deliberately never read here. Only an already
            // revealed sector may contribute its visible adjacent-nova number.
            for (const p of state.revealed) if (state.grid[p] > 0) clues[p] = state.grid[p];
            const proof = AetherDeepField.deduce({cols:state.config.cols, rows:state.config.rows,
                revealed:state.revealed, flagged:state.flagged, clues, lines:state.lines});
            let acted = false;
            for (const {index} of proof.mines) {
                const cell = host.querySelector(`.deepfield-cell[data-cell="${index}"]`);
                if (cell.dataset.state === 'hidden') {
                    cell.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true}));
                    flags++; acted = true;
                }
            }
            for (const hazard of state.hazards.filter(item => item.state === 'veiled')) {
                mode('ward'); host.querySelector(`.deepfield-cell[data-cell="${hazard.index}"]`).click();
                mode('reveal'); wards++; acted = true;
            }
            const current = game.snapshot();
            for (const {index} of proof.safe) {
                if (current.revealed.includes(index) || current.flagged.includes(index)) continue;
                const cell = host.querySelector(`.deepfield-cell[data-cell="${index}"]`);
                if (cell.dataset.hazard === 'veiled') {
                    mode('ward'); cell.click(); mode('reveal'); wards++;
                }
                cell.click(); reveals++; acted = true; break;
            }
            if (!acted) return {won:false, reason:'visible deduction stalled', wards, flags, reveals,
                revealed:state.revealed.length, seals:state.sealsFound.length};
        }
        return {won:false, reason:'iteration bound', wards, flags, reveals};
    }''')
    assert result.get('won'), result
    assert result['seals'] == 3 and result['steps'] > 0
    return result


def continue_deepfield(page, relic=None):
    page.locator('#deep-foundry-df .df-intermission').wait_for(state='visible')
    if relic:
        page.locator(f'#deep-foundry-df [data-df-relic="{relic}"]').click()
    page.locator('#deep-foundry-df [data-df-action="continue"]').click()
    page.locator('#deep-foundry-df .df-intermission').wait_for(state='detached')


def solve_visible_finale_plate(page):
    solution = page.evaluate('''() => {
        const layer = document.querySelector('#deep-foundry-df .df-finale');
        const numbers = key => layer.dataset[key] ? layer.dataset[key].split(',').filter(Boolean).map(Number) : [];
        return AetherDeepField.solveFinale({size:Number(layer.dataset.size), rows:numbers('rows'),
            columns:numbers('columns'), diagonals:numbers('diagonals')});
    }''')
    assert solution['solved'], 'visible finale clues must have a deduction-backed solution'
    saw_lock = False
    for index, value in enumerate(solution['values']):
        for _ in range(1 if value else 2):
            cell = page.locator(f'#deep-foundry-df [data-df-finale-cell="{index}"]')
            if cell.is_disabled():
                saw_lock = True
                ward = page.locator('#deep-foundry-df [data-df-action="finale-ward"]')
                assert ward.is_enabled()
                ward.click()
            cell.click()
    if page.locator('#deep-foundry-df .df-finale').get_attribute('data-blocked-row') != '-1':
        saw_lock = True
        page.locator('#deep-foundry-df [data-df-action="finale-ward"]').click()
    return saw_lock


def assert_finale_pause_lock(page, cycle_after_resume=False):
    """Prove forced paused input is inert, then verify both resume paths."""
    page.evaluate('window.__deep.pause()')
    before = page.evaluate('window.__deep.snapshot()')
    assert page.evaluate('window.__deep.paused') is True
    cell = page.locator('#deep-foundry-df [data-df-finale-cell="0"]')
    cell.click(force=True)
    cell.focus()
    for key in ('Enter', ' ', 'w', 'ArrowRight', 'd', 'v', 'h', 't', 'r', '1', '2', 'Delete'):
        page.keyboard.press(key)
    page.evaluate('''() => {
        // Dispatch even on disabled controls: delegated guards, not just HTML
        // disabled/inert presentation, must reject every non-resume action.
        document.querySelectorAll('#deep-foundry-df [data-df-finale-cell], #deep-foundry-df [data-df-action]').forEach(element => {
            if (element.dataset.dfAction !== 'pause') element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
        });
    }''')
    page.wait_for_timeout(100)
    after = page.evaluate('window.__deep.snapshot()')
    assert after['finale'] == before['finale'], (before['finale'], after['finale'])
    for key in ('focus', 'sealsFound', 'score', 'scorePenalty', 'wardsUsed', 'totalWards', 'chartsCleared'):
        assert after[key] == before[key], key
    assert page.evaluate('window.__deepEvents') == []
    assert page.locator('#deep-foundry-df .df-finale').get_attribute('data-paused') == 'true'

    page.locator('#deep-foundry-df [data-df-action="pause"]').focus()
    page.keyboard.press('p')
    assert page.evaluate('window.__deep.paused') is False
    page.evaluate('window.__deep.pause()')
    page.locator('#deep-foundry-df [data-df-action="pause"]').click()
    assert page.evaluate('window.__deep.paused') is False
    if cycle_after_resume:
        original = before['finale']['entries'][0]
        for _ in range(3):
            cell.click()
        resumed = page.evaluate('window.__deep.snapshot()')
        assert resumed['finale']['entries'][0] == original
        assert resumed['finale']['entries'] == before['finale']['entries']


def complete_nocturne_with_retries(page, retry):
    """Deterministic fake-clock score comparison, including all three finale plates."""
    mount_deepfield(page)
    rewards = []
    for stage, opening in enumerate((40, 45, 55)):
        if stage == 0 and retry:
            for _ in range(3):
                page.locator('#deep-foundry-df .deepfield-cell').nth(opening).click()
                rewarded = page.evaluate('''() => {
                    const game = window.__deep;
                    // This targeted reward fixture uses the debug seal locations;
                    // the separate full-clear helper still uses visible logic only.
                    for (const p of game.snapshot().seals) {
                        const cell = document.querySelector(`#deep-foundry-df .deepfield-cell[data-cell="${p}"]`);
                        if (cell.dataset.state !== 'revealed') cell.click();
                    }
                    return {score:game.snapshot().score, entry:game.snapshot().roundStartScore, seals:game.snapshot().sealsFound.length};
                }''')
                assert rewarded['seals'] == 3 and rewarded['score'] >= rewarded['entry'] + 200
                rewards.append(rewarded['score'])
                page.locator('#deep-foundry-df [data-df-action="retry"]').click()
                assert page.evaluate('window.__deep.snapshot().score') == rewarded['entry']
        clear_nocturne_visibly(page, opening)
        page.clock.run_for(150)
        if stage < 2:
            continue_deepfield(page, 'wardcraft' if stage == 0 else 'lens')
    page.locator('#deep-foundry-df .df-finale').wait_for(state='visible')
    for phase in range(3):
        solve_visible_finale_plate(page)
        page.locator('#deep-foundry-df [data-df-action="finale-submit"]').click()
        if phase < 2:
            page.wait_for_function(f'document.querySelector("#deep-foundry-df .df-finale")?.dataset.phase === "{phase + 2}"')
    page.wait_for_function('window.__deepEvents.length === 1')
    return {'ending': page.evaluate('window.__deepEvents[0]'), 'rewards': rewards}


def mount_starforge(page, *, scenario=9, veteran=True):
    page.evaluate('''({scenario, veteran}) => {
        window.__machine?.destroy();
        document.querySelector('#deep-foundry-forge')?.remove();
        for (const child of document.body.children) if (child.tagName !== 'SCRIPT') child.style.setProperty('display', 'none', 'important');
        document.body.style.margin = '0';
        const host = document.createElement('div'); host.id = 'deep-foundry-forge';
        host.style.cssText = 'position:relative;min-height:100vh;background:#050711'; document.body.append(host);
        window.__machineEvents = [];
        window.__machine = AetherStarforge.create(host, {veteran, scenario,
            onEnd(event) { window.__machineEvents.push(event); }});
    }''', {'scenario': scenario, 'veteran': veteran})


def socket_position(page, slot):
    canvas = page.locator('#deep-foundry-forge .starforge-canvas')
    box = canvas.bounding_box()
    inner = slot >= 8
    angle = (slot - 8) * math.pi / 2 - math.pi / 2 if inner else slot * math.pi / 4 - math.pi / 2
    radius = 112 if inner else 182
    return {'x': box['width'] * (450 + radius * math.cos(angle)) / 900,
            'y': box['height'] * (280 + radius * math.sin(angle)) / 560}


def place_socket(page, device, slot, *, touch=False):
    page.locator(f'#deep-foundry-forge [data-star-tool="{device}"]').click()
    canvas = page.locator('#deep-foundry-forge .starforge-canvas')
    if touch:
        canvas.tap(position=socket_position(page, slot))
    else:
        canvas.click(position=socket_position(page, slot))


def place_machine_path(page, *, touch=False):
    slots = {'mirror': 0, 'conductor': 2, 'splitter': 3, 'furnace': 4, 'capacitor': 5, 'regulator': 11}
    for device, slot in slots.items():
        place_socket(page, device, slot, touch=touch)
    assert page.evaluate('window.__machine.state.modules.length') == len(slots)
    topology = page.evaluate('window.__machine.state.topology')
    assert topology['linked'] and topology['innerRegulator']


def place_standard_path(page):
    for device, slot in {'mirror': 0, 'conductor': 2, 'furnace': 4, 'regulator': 6}.items():
        place_socket(page, device, slot)
    assert page.evaluate('window.__machine.state.modules.length') == 4


def complete_machine(page):
    place_machine_path(page)
    page.locator('#deep-foundry-forge [data-starforge="run"]').click()
    vented = False
    for _ in range(700):
        state = page.evaluate('window.__machine.state')
        if state['ended']:
            break
        phase, attack = state['bossPhase'], state['bossAttack']
        if phase == 0:
            if attack == 'lance' and state['route'] != 'cooling':
                page.locator('#deep-foundry-forge [data-starforge="route"]').click()
            elif not attack and state['route'] == 'cooling' and 'caught' in state['bossLast']:
                page.locator('#deep-foundry-forge [data-starforge="route"]').click()
        elif phase == 1:
            if state['route'] == 'cooling':
                page.locator('#deep-foundry-forge [data-starforge="route"]').click()
            if attack == 'seal' and not state['brake']:
                page.locator('#deep-foundry-forge [data-starforge="brake"]').click()
            if not attack and state['brake'] and 'broken' in state['bossLast']:
                page.locator('#deep-foundry-forge [data-starforge="brake"]').click()
            if state['bossParries']['seal'] >= 1 and state['charge'] > 0 and state['heat'] >= 20 and not vented:
                if state['brake']:
                    page.locator('#deep-foundry-forge [data-starforge="brake"]').click()
                page.locator('#deep-foundry-forge [data-starforge="vent"]').click()
                vented = True
        else:
            if state['route'] != 'ward':
                page.locator('#deep-foundry-forge [data-starforge="ward"]').click()
            # Deliberately endure one telegraphed Drain, then arm a replacement
            # Ward. Ignition/target alone is not allowed to seal the machine.
            if state['heartReady'] and state['bossParries']['drain'] >= 1 and state['ward'] >= 1:
                page.locator('#deep-foundry-forge [data-starforge="seal"]').click()
        page.clock.run_for(200)
    state = page.evaluate('window.__machine.state')
    assert state['ended'] and state['completed'], state
    assert state['heartReady'] and state['energy'] >= 20 and state['discharges'] >= 1
    assert all(state['bossParries'][kind] >= 1 for kind in ('lance', 'seal', 'drain')), state['bossParries']
    page.clock.run_for(1000)
    assert page.evaluate('window.__machineEvents.length') == 1
    assert page.evaluate('window.__machineEvents[0].won') is True
    return state


def reach_machine_heart(page):
    """Reach phase III with an armed Ward but leave the Heart unsealed."""
    place_machine_path(page)
    page.locator('#deep-foundry-forge [data-starforge="run"]').click()
    vented = False
    for _ in range(700):
        state = page.evaluate('window.__machine.state')
        phase, attack = state['bossPhase'], state['bossAttack']
        if phase == 0:
            if attack == 'lance' and state['route'] != 'cooling':
                page.locator('#deep-foundry-forge [data-starforge="route"]').click()
            elif not attack and state['route'] == 'cooling' and 'caught' in state['bossLast']:
                page.locator('#deep-foundry-forge [data-starforge="route"]').click()
        elif phase == 1:
            if state['route'] == 'cooling':
                page.locator('#deep-foundry-forge [data-starforge="route"]').click()
            if attack == 'seal' and not state['brake']:
                page.locator('#deep-foundry-forge [data-starforge="brake"]').click()
            if not attack and state['brake'] and 'broken' in state['bossLast']:
                page.locator('#deep-foundry-forge [data-starforge="brake"]').click()
            if state['bossParries']['seal'] >= 1 and state['charge'] > 0 and state['heat'] >= 20 and not vented:
                if state['brake']:
                    page.locator('#deep-foundry-forge [data-starforge="brake"]').click()
                page.locator('#deep-foundry-forge [data-starforge="vent"]').click()
                vented = True
        else:
            if state['route'] != 'ward':
                page.locator('#deep-foundry-forge [data-starforge="ward"]').click()
            if state['heartReady'] and state['ward'] >= 1:
                return state
        page.clock.run_for(200)
    raise AssertionError(f'Machine Heart was not reached: {page.evaluate("window.__machine.state")}')


def font_size(page, selector):
    return page.locator(selector).evaluate('element => parseFloat(getComputedStyle(element).fontSize)')


with Server(('127.0.0.1', 0), QuietHandler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')

            # Pure solution certificates, legacy generator invariants and finale proofs.
            audit = page.evaluate('''() => {
                const failures = []; let certificates = 0, fallbacks = 0;
                if (JSON.stringify(AetherDeepField.CAMPAIGN) !== JSON.stringify(['apprentice','navigator','eclipse'])) failures.push('standard campaign changed');
                for (const [id, preset] of Object.entries(AetherDeepField.PRESETS)) {
                    for (let seed = 1; seed <= 12; seed++) {
                        const safeIndex = Math.floor(preset.cols * preset.rows / 2);
                        const a = AetherDeepField.generate({...preset, seed, safeIndex});
                        const b = AetherDeepField.generate({...preset, seed, safeIndex});
                        if (JSON.stringify(a.grid) !== JSON.stringify(b.grid)) failures.push(`legacy deterministic ${id}/${seed}`);
                        if (a.grid.filter(value => value === -1).length !== preset.mines) failures.push(`legacy mine count ${id}/${seed}`);
                        if (a.grid[safeIndex] !== 0) failures.push(`legacy opening ${id}/${seed}`);
                    }
                }
                for (const config of AetherDeepField.NOCTURNE_CHARTS) for (let seed = 1; seed <= 40; seed++) {
                    const safeIndex = Math.floor(config.cols * config.rows / 2);
                    const a = AetherDeepField.generateNocturne({...config, seed, safeIndex});
                    const b = AetherDeepField.generateNocturne({...config, seed, safeIndex});
                    if (!a.solution.solved) failures.push(`Nocturne unsolved ${config.movement}/${seed}`);
                    if (JSON.stringify(a.grid) !== JSON.stringify(b.grid) || a.layoutSeed !== b.layoutSeed || JSON.stringify(a.seals) !== JSON.stringify(b.seals)) failures.push(`Nocturne deterministic ${config.movement}/${seed}`);
                    if (a.grid.filter(value => value === -1).length !== config.mines || a.grid[safeIndex] !== 0) failures.push(`Nocturne board invariant ${config.movement}/${seed}`);
                    certificates++; if (a.pins.length) fallbacks++;
                }
                for (let seed = 1; seed <= 100; seed++) for (let phase = 0; phase < 3; phase++) {
                    const puzzle = AetherDeepField.finalePuzzle(seed, phase);
                    if (!puzzle.proof.solved || JSON.stringify(puzzle.proof.values) !== JSON.stringify(puzzle.solution)) failures.push(`finale certificate ${seed}/${phase}`);
                }
                const line = AetherDeepField.deduce({cols:3, rows:2, revealed:[0], flagged:[], clues:{},
                    lines:[{label:'Row 1', cells:[0,1,2], value:0}]});
                if (JSON.stringify(line.safe.map(item => item.index)) !== '[1,2]') failures.push('canticle deduction');
                return {failures, certificates, fallbacks};
            }''')
            assert not audit['failures'], audit['failures']
            assert audit['certificates'] == 120
            print(f"PASS: 120 deterministic no-guess chart certificates, 300 finale proofs and preserved standard generators ({audit['fallbacks']} pinned fallbacks)")

            # Standard modes do not expose either additive finale.
            mount_deepfield(page, preset='navigator', veteran=False)
            assert page.locator('#deep-foundry-df [data-df-preset="nocturne"]').count() == 0
            assert page.locator('#deep-foundry-df [data-df-nocturne]').is_hidden()
            assert page.evaluate('JSON.stringify(AetherDeepField.CAMPAIGN)') == '["apprentice","navigator","eclipse"]'
            page.evaluate('window.__deep.destroy()')
            mount_deepfield(page, preset='navigator', veteran=True)
            page.locator('#deep-foundry-df [data-df-preset="nocturne"]').click()
            assert page.evaluate('window.__deep.snapshot().nocturne') is True
            assert page.locator('#deep-foundry-df .deepfield-grid').get_attribute('data-expedition') == 'nocturne'
            page.evaluate('window.__deep.destroy()')
            page.evaluate('localStorage.setItem("aether-starforge-v1", JSON.stringify({completed:6,best:18}))')
            mount_starforge(page, scenario=8)
            assert page.locator('#deep-foundry-forge .starforge-scenarios button').count() == 9
            assert page.locator('#deep-foundry-forge [data-machine-panel]').is_hidden()
            assert page.locator('#deep-foundry-forge .starforge-master-contract button').count() == 1
            page.locator('#deep-foundry-forge .starforge-master-contract button').click()
            assert page.locator('#deep-foundry-forge .starforge-canvas').get_attribute('data-scenario') == '10'
            assert page.locator('#deep-foundry-forge [data-machine-panel]').is_visible()
            assert page.locator('#deep-foundry-forge #starforge-energy').inner_text() == '0 / 20'
            page.evaluate('window.__machine.destroy()')
            mount_starforge(page, scenario=0, veteran=False)
            assert page.locator('#deep-foundry-forge .starforge-scenarios button').count() == 6
            assert page.locator('#deep-foundry-forge .starforge-master-contract').count() == 0
            page.evaluate('window.__machine.destroy()')
            print('PASS: standard campaigns, nine-button Veteran strip and additive finale gating remain intact')

            # A real telegraph expires into a nonlethal veil, refuses ordinary
            # reveal, then yields to keyboard Ward without changing the grid.
            mount_deepfield(page)
            page.locator('#deep-foundry-df .deepfield-cell').nth(40).click()
            initial = page.evaluate('window.__deep.snapshot()')
            assert initial['solutionSteps'] > 0 and len(initial['lines']) == 18
            hazard = initial['hazards'][0]
            signature = initial['signature']
            page.evaluate('''index => {
                const game = window.__deep;
                for (let n = 0; n < 14; n++) {
                    const state = game.snapshot(), current = state.hazards.find(item => item.index === index);
                    if (!current || current.state === 'veiled') break;
                    const next = state.grid.findIndex((value, p) => value > 0 && p !== index && !state.revealed.includes(p) && !state.flagged.includes(p));
                    if (next < 0) break;
                    document.querySelector(`#deep-foundry-df .deepfield-cell[data-cell="${next}"]`).click();
                }
            }''', hazard['index'])
            expired = page.evaluate('window.__deep.snapshot()')
            veil = next(item for item in expired['hazards'] if item['index'] == hazard['index'])
            assert veil['state'] == 'veiled' and expired['integrity'] == 2
            assert expired['signature'] == signature and expired['grid'] == initial['grid']
            veiled_cell = page.locator(f'#deep-foundry-df .deepfield-cell[data-cell="{hazard["index"]}"]')
            veiled_cell.click()
            assert veiled_cell.get_attribute('data-state') == 'hidden'
            veiled_cell.focus()
            page.keyboard.press('w')
            warded = page.evaluate('window.__deep.snapshot()')
            assert all(item['index'] != hazard['index'] for item in warded['hazards'])
            assert warded['wardsUsed'] == 1 and warded['signature'] == signature
            page.evaluate('window.__deep.destroy()')
            print('PASS: deterministic rift expiry, safe veil, integrity cost, keyboard Ward and unchanged hidden board')

            # Complete all three charts solely through visible logical moves.
            mount_deepfield(page)
            totals = {'wards': 0, 'flags': 0, 'reveals': 0}
            for stage, opening in enumerate((40, 45, 55)):
                result = clear_nocturne_visibly(page, opening)
                for key in totals:
                    totals[key] += result[key]
                assert page.locator('#deep-foundry-df .deepfield-grid').get_attribute('data-seals') == '3'
                assert page.locator('#deep-foundry-df .deepfield-grid').get_attribute('data-event-stage') == '3'
                if stage < 2:
                    continue_deepfield(page, 'wardcraft' if stage == 0 else 'lens')
            page.locator('#deep-foundry-df .df-finale').wait_for(state='visible')
            assert_finale_pause_lock(page, cycle_after_resume=True)
            page.locator('#deep-foundry-df [data-df-action="finale-submit"]').click()
            assert 'unknown' in page.locator('#deep-foundry-df [data-df-finale-status]').inner_text()
            assert solve_visible_finale_plate(page) is False
            page.locator('#deep-foundry-df [data-df-action="finale-submit"]').click()
            page.wait_for_function('document.querySelector("#deep-foundry-df .df-finale")?.dataset.phase === "2"')
            assert solve_visible_finale_plate(page) is False
            page.locator('#deep-foundry-df [data-df-action="finale-submit"]').click()
            page.wait_for_function('document.querySelector("#deep-foundry-df .df-finale")?.dataset.phase === "3"')
            assert solve_visible_finale_plate(page) is True, 'final interference must require at least one Ward'
            assert_finale_pause_lock(page)

            # Art-review regression: the essential finale remains real DOM text
            # at phone width, with no dependence on a scaled canvas HUD.
            page.set_viewport_size({'width': 390, 'height': 844})
            assert font_size(page, '#deep-foundry-df .df-finale-intro') >= 16
            assert font_size(page, '#deep-foundry-df .df-finale-clues') >= 14
            assert font_size(page, '#deep-foundry-df .df-finale-status') >= 14
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#deep-foundry-df .df-console').screenshot(path=str(ARTIFACTS / 'deep-foundry-nocturne-finale-390.png'))
            page.locator('#deep-foundry-df [data-df-action="finale-submit"]').click()
            page.wait_for_function('window.__deepEvents.length === 1')
            ending = page.evaluate('window.__deepEvents[0]')
            assert ending['won'] and ending['charts'] == 3 and ending['expedition'] == 'nocturne'
            assert '9 ivory seals' in ending['detail'] and ending['score'] > 0
            page.wait_for_timeout(1000)
            assert page.evaluate('window.__deepEvents.length') == 1
            page.evaluate('window.__deep.destroy()')
            assert page.locator('#deep-foundry-df').inner_html() == ''
            print(f"PASS: full visible-logic Nocturne clear, nine seals, three plates, hard-paused finale inputs, two resume paths, one recap and 390px capture ({totals})")

            # Repeated rewarded attempts must not inflate either the chart ledger
            # or the final expedition score. Fake time makes this an exact check.
            retry_page = browser.new_page(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
            retry_page.on('pageerror', lambda error: errors.append(str(error)))
            retry_page.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            retry_page.clock.install()
            clean_retry_run = complete_nocturne_with_retries(retry_page, False)
            exploited_retry_run = complete_nocturne_with_retries(retry_page, True)
            assert len(set(exploited_retry_run['rewards'])) == 1, exploited_retry_run['rewards']
            assert exploited_retry_run['ending']['score'] == clean_retry_run['ending']['score'], (clean_retry_run, exploited_retry_run)
            retry_page.evaluate('window.__deep.destroy()')
            retry_page.close()
            print(f"PASS: three rewarded abandoned attempts restore chart-entry score; final score is identical ({clean_retry_run['ending']['score']})")

            # The machine has real topology, three counters and a gated final Seal.
            forge = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            forge.on('pageerror', lambda error: errors.append(str(error)))
            forge.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            forge.clock.install()
            forge.evaluate('localStorage.setItem("aether-starforge-v1", JSON.stringify({completed:6,best:18}))')
            mount_starforge(forge)
            # Keyboard socket selection/install is genuine canvas interaction.
            forge.locator('#deep-foundry-forge [data-star-tool="mirror"]').click()
            board = forge.locator('#deep-foundry-forge .starforge-canvas')
            board.focus(); board.press('Enter')
            assert forge.evaluate('window.__machine.state.modules').pop() == {'id': 'mirror', 'slot': 0}
            board.press('Delete')
            assert forge.evaluate('window.__machine.state.modules.length') == 0
            machine_state = complete_machine(forge)
            saved = forge.evaluate('JSON.parse(localStorage.getItem("aether-starforge-v1"))')
            assert saved['completed'] == 6 and saved['best'] >= machine_state['energy']
            forge.clock.run_for(1500)
            assert forge.evaluate('window.__machineEvents.length') == 1
            forge.evaluate('window.__machine.destroy()')
            assert forge.locator('#deep-foundry-forge').inner_html() == ''
            print('PASS: keyboard sockets, conjoined/inner topology, Lance/Brake/Ward counters, three phases and final Heart Seal')

            # Ring-aware topology: inner wrap and radial links are valid, while a
            # numeric outer/inner index chain is not physical adjacency.
            for slots, expected in (({'splitter': 11, 'furnace': 8, 'capacitor': 9}, True),
                                    ({'splitter': 7, 'furnace': 8, 'capacitor': 9}, False),
                                    ({'splitter': 0, 'furnace': 8, 'capacitor': 9}, True)):
                mount_starforge(forge)
                for device, slot in slots.items():
                    place_socket(forge, device, slot)
                assert forge.evaluate('window.__machine.state.topology.linked') is expected, slots
            forge.evaluate('window.__machine.destroy()')
            print('PASS: inner-ring wrap and radial topology link; discontinuous cross-ring chain is rejected')

            # External pause is a hard gameplay lock, including actual pointer
            # installation and programmatic activation of every DOM action.
            mount_starforge(forge)
            place_machine_path(forge)
            forge.locator('#deep-foundry-forge [data-starforge="run"]').click()
            forge.clock.run_for(1000)
            forge.evaluate('window.__machine.pause()')
            frozen = forge.evaluate('window.__machine.state')
            assert 'INSTRUMENTS LOCKED' in forge.locator('#starforge-state').inner_text()
            forge.locator('#deep-foundry-forge .starforge-canvas').click(position=socket_position(forge, 7))
            forge.evaluate('''() => {
                for (const action of ['run','vent','route','ward','brake','seal','remove','reset']) document.querySelector(`[data-starforge="${action}"]`).click();
                document.querySelector('[data-star-scenario="0"]').click();
                document.querySelector('[data-star-tool="mirror"]').click();
            }''')
            board = forge.locator('#deep-foundry-forge .starforge-canvas'); board.focus()
            for key in ('x', 'd', 'a', 'b', 'Delete', 'Enter', ' '):
                board.press(key)
            forge.clock.run_for(500)
            assert forge.evaluate('window.__machine.state') == frozen
            forge.evaluate('window.__machine.resume()')
            forge.locator('#deep-foundry-forge [data-starforge="reset"]').click()
            assert forge.evaluate('window.__machine.state.modules.length') == 0
            forge.evaluate('window.__machine.destroy()')
            print('PASS: external pause freezes pointer, keyboard and every DOM mutation; resume restores intended controls')

            # Wards cannot be stocked in earlier phases, and a stocked Ward still
            # cannot seal from Forge. Only the live phase-III Ward bus can finish.
            mount_starforge(forge)
            place_machine_path(forge)
            assert forge.locator('#deep-foundry-forge [data-starforge="ward"]').is_disabled()
            forge.evaluate('document.querySelector("[data-starforge=ward]").click()')
            forge.locator('#deep-foundry-forge [data-starforge="run"]').click()
            forge.clock.run_for(5000)
            early = forge.evaluate('window.__machine.state')
            assert early['bossPhase'] == 0 and early['route'] == 'forge' and early['ward'] == 0
            forge.evaluate('window.__machine.destroy()')
            mount_starforge(forge)
            armed = reach_machine_heart(forge)
            assert armed['bossPhase'] == 2 and armed['route'] == 'ward' and armed['ward'] >= 1
            forge.locator('#deep-foundry-forge [data-starforge="ward"]').click()
            assert forge.evaluate('window.__machine.state.route') == 'forge'
            assert forge.locator('#deep-foundry-forge [data-starforge="seal"]').is_disabled()
            forge.evaluate('document.querySelector("[data-starforge=seal]").click()')
            assert forge.evaluate('window.__machine.state.ended') is False
            assert forge.evaluate('window.__machineEvents.length') == 0
            forge.locator('#deep-foundry-forge [data-starforge="ward"]').click()
            forge.locator('#deep-foundry-forge [data-starforge="seal"]').click()
            forge.clock.run_for(1000)
            assert forge.evaluate('window.__machineEvents.length') == 1
            forge.evaluate('window.__machine.destroy()')
            print('PASS: early Ward stocking and Forge-seal attempts fail; live phase-III Ward bus seals once')

            # A completed standard contract must settle even if Reset or a
            # scenario is activated during its 900ms recap delay.
            forge.evaluate('localStorage.setItem("aether-starforge-v1", JSON.stringify({completed:0,best:0}))')
            mount_starforge(forge, scenario=0, veteran=False)
            place_standard_path(forge)
            forge.locator('#deep-foundry-forge [data-starforge="run"]').click()
            for _ in range(150):
                if forge.evaluate('window.__machine.state.ended'):
                    break
                forge.clock.run_for(200)
            completed_state = forge.evaluate('window.__machine.state')
            assert completed_state['completed'] and forge.locator('#deep-foundry-forge [data-starforge="reset"]').is_disabled()
            forge.evaluate('''() => {document.querySelector('[data-starforge="reset"]').click();document.querySelector('[data-star-scenario="1"]').click();}''')
            assert forge.evaluate('window.__machine.state') == completed_state
            assert forge.evaluate('window.__machineEvents.length') == 0
            forge.clock.run_for(1000)
            assert forge.evaluate('window.__machineEvents.length') == 1
            forge.locator('#deep-foundry-forge [data-starforge="reset"]').click()
            assert forge.evaluate('window.__machine.state.energy') == 0
            # A second pending completion is still cancellable by teardown.
            place_standard_path(forge)
            forge.locator('#deep-foundry-forge [data-starforge="run"]').click()
            for _ in range(150):
                if forge.evaluate('window.__machine.state.ended'):
                    break
                forge.clock.run_for(200)
            forge.evaluate('window.__machine.destroy()')
            forge.clock.run_for(1000)
            assert forge.evaluate('window.__machineEvents.length') == 1
            print('PASS: completed-run Reset/scenario attempts preserve one settlement; teardown cancels the next pending recap')

            # Unanswered Clock Snare is bounded rather than a permanent softlock.
            mount_starforge(forge)
            place_machine_path(forge)
            forge.locator('#deep-foundry-forge [data-starforge="run"]').click()
            locked = False
            for _ in range(160):
                state = forge.evaluate('window.__machine.state')
                if state['bossPhase'] == 1 and state['route'] != 'cooling':
                    forge.locator('#deep-foundry-forge [data-starforge="route"]').click()
                if state['bossLocks']:
                    locked = True
                    break
                forge.clock.run_for(200)
            assert locked, 'unanswered Clock Snare should seal a live device'
            forge.clock.run_for(2400)
            assert forge.evaluate('window.__machine.state.bossLocks') == {}
            forge.evaluate('window.__machine.destroy()')
            forge.clock.run_for(1000)
            assert forge.evaluate('window.__machineEvents.length') == 0
            print('PASS: unanswered device seal expires; live teardown cancels callbacks')

            # Identical fixed-clock input produces identical machine telemetry.
            def deterministic_machine_state():
                mount_starforge(forge)
                place_machine_path(forge)
                forge.locator('#deep-foundry-forge [data-starforge="run"]').click()
                forge.clock.run_for(5000)
                return forge.evaluate('''() => {const s=window.__machine.state;return {energy:s.energy,heat:s.heat,charge:s.charge,
                    ward:s.ward,bossPhase:s.bossPhase,bossPulse:s.bossPulse,bossAttack:s.bossAttack,
                    remaining:s.remaining,modules:s.modules,topology:s.topology};}''')

            first = deterministic_machine_state()
            second = deterministic_machine_state()
            # Playwright's individual pointer dispatches can cost one 16ms fake-
            # clock frame. Discrete gameplay must match exactly; continuous heat
            # and active-time telemetry are allowed that single-frame tolerance.
            assert math.isclose(first.pop('heat'), second.pop('heat'), abs_tol=.05)
            assert math.isclose(first.pop('remaining'), second.pop('remaining'), abs_tol=.05)
            assert first == second, (first, second)
            forge.evaluate('window.__machine.destroy()')
            print('PASS: deterministic machine mechanics/topology; continuous telemetry within one input frame')

            # Real coarse-pointer phone controls and readable DOM alternatives to
            # every essential fixed-resolution canvas instrument.
            mobile = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion='reduce')
            mobile.on('pageerror', lambda error: errors.append(str(error)))
            mobile.goto(f'{base}/index.html?standalone=1#voyage', wait_until='networkidle')
            mount_deepfield(mobile)
            mobile.locator('#deep-foundry-df .deepfield-cell').nth(40).tap()
            assert font_size(mobile, '#deep-foundry-df [data-df-objective]') >= 16
            assert font_size(mobile, '#deep-foundry-df [data-df-event]') >= 14
            assert font_size(mobile, '#deep-foundry-df [data-df-resources]') >= 16
            assert mobile.locator('#deep-foundry-df [data-df-action="ward-mode"]').bounding_box()['height'] >= 44
            assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
            mobile.locator('#deep-foundry-df .df-console').screenshot(path=str(ARTIFACTS / 'deep-foundry-nocturne-chart-touch-390.png'))
            mobile.evaluate('window.__deep.destroy()')

            mobile.evaluate('localStorage.setItem("aether-starforge-v1", JSON.stringify({completed:6,best:18}))')
            mobile.clock.install()
            mount_starforge(mobile)
            place_machine_path(mobile, touch=True)
            # Remove one real touch-placed device without clearing the machine,
            # then leave Remove mode and successfully place it again.
            remove = mobile.locator('#deep-foundry-forge [data-starforge="remove"]')
            assert remove.bounding_box()['height'] >= 44
            before_remove = mobile.evaluate('window.__machine.state')
            remove.tap()
            assert mobile.evaluate('window.__machine.state.removeMode') is True
            mobile.locator('#deep-foundry-forge .starforge-canvas').tap(position=socket_position(mobile, 0))
            after_remove = mobile.evaluate('window.__machine.state')
            assert len(after_remove['modules']) == len(before_remove['modules']) - 1
            assert all(module['id'] != 'mirror' for module in after_remove['modules'])
            for key in ('energy', 'heat', 'charge', 'route', 'bossPhase', 'remaining', 'running', 'vents'):
                assert after_remove[key] == before_remove[key], key
            remove.tap()
            place_socket(mobile, 'mirror', 0, touch=True)
            assert mobile.evaluate('window.__machine.state.modules.length') == len(before_remove['modules'])
            assert mobile.evaluate('window.__machine.state.removeMode') is False
            mobile.locator('#deep-foundry-forge [data-starforge="run"]').tap()
            for _ in range(100):
                if mobile.evaluate('window.__machine.state.bossAttack') == 'lance':
                    break
                mobile.clock.run_for(200)
            assert mobile.evaluate('window.__machine.state.bossAttack') == 'lance'
            assert 'Cooling bus' in mobile.locator('#deep-foundry-forge [data-machine-attack]').inner_text()
            assert font_size(mobile, '#deep-foundry-forge [data-machine-phase]') >= 16
            assert font_size(mobile, '#deep-foundry-forge [data-machine-objective]') >= 14
            assert font_size(mobile, '#deep-foundry-forge [data-machine-attack]') >= 14
            assert font_size(mobile, '#deep-foundry-forge [data-machine-topology]') >= 14
            assert font_size(mobile, '#deep-foundry-forge #starforge-brief') >= 14
            for action in ('route', 'ward', 'brake'):
                button = mobile.locator(f'#deep-foundry-forge [data-starforge="{action}"]')
                assert button.bounding_box()['height'] >= 44
            mobile.locator('#deep-foundry-forge [data-starforge="route"]').tap()
            assert mobile.evaluate('window.__machine.state.route') == 'cooling'
            mobile.locator('#deep-foundry-forge [data-starforge="brake"]').tap()
            assert mobile.evaluate('window.__machine.state.brake') is True
            mobile.locator('#deep-foundry-forge .starforge-shell').screenshot(path=str(ARTIFACTS / 'deep-foundry-machina-touch-390.png'))
            assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
            mobile.evaluate('window.__machine.destroy()')
            mobile.clock.run_for(1200)
            assert mobile.evaluate('window.__machineEvents.length') == 0
            mobile.close()
            print('PASS: 390px coarse-touch charts/machine, 14–16px essential DOM instrumentation, telegraph, controls, captures and no overflow')

            forge.close()
            page.close()
            browser.close()
            assert not errors, f'uncaught browser exceptions: {errors}'
            print('Deep Foundry browser regression passed with no uncaught browser exceptions.')
            print(f'Screenshots: {ARTIFACTS}/deep-foundry-*.png')
    finally:
        server.shutdown()
        server.server_close()
