import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const port = 4174;
const base = `http://127.0.0.1:${port}`;
const fixture = async name => JSON.parse(await readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8'));
const legacySaveFixture = await fixture('legacy-saves-v0.json');
const malformedSaveFixture = await fixture('malformed-saves.json');
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`${base}/index.html`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('The local Æther server did not start.');
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));

  await page.goto(`${base}/grand-tour.html`, { waitUntil: 'networkidle' });
  await expectText(page, 'THE GRAND TOUR');
  await page.getByRole('link', { name: /begin your expedition/i }).waitFor({ state: 'visible' });

  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await assertVisible(page, '.playground-home');
  assert.equal(await page.evaluate(() => window.location.hash), '', 'the bare Æther route must open the Observatory overview');
  await page.goto(`${base}/index.html#voyage`, { waitUntil: 'networkidle' });
  await assertVisible(page, '.cartridge-cabinet');
  assert.equal(await page.locator('.cartridge-daily-link').count(), 4, 'the four roguelite cartridges must expose a Daily Vigil');
  await page.goto(`${base}/index.html?standalone=1&cartridge=labyrinth&challenge=daily#voyage`, { waitUntil: 'networkidle' });
  const dailyLabyrinth = page.locator('.cartridge-stage .trial-frame canvas');
  await dailyLabyrinth.waitFor({ state: 'visible' });
  await assertVisible(page, '[data-labyrinth-action="decoy"]');
  const firstCourse = await dailyLabyrinth.getAttribute('data-course');
  assert.ok(firstCourse && firstCourse.includes('|'), 'the daily patrol has a recorded starting formation');
  await page.reload({ waitUntil: 'networkidle' });
  await dailyLabyrinth.waitFor({ state: 'visible' });
  assert.equal(await dailyLabyrinth.getAttribute('data-course'), firstCourse, 'a daily labyrinth must replay the same opening patrol');
  await page.waitForTimeout(1500);
  await dailyLabyrinth.focus();
  await page.keyboard.press('f');
  await page.waitForFunction(canvas => canvas.dataset.decoy === 'active', await dailyLabyrinth.elementHandle(), { timeout: 4000 });
  await page.waitForFunction(canvas => Number(canvas.dataset.decoyX) > 0, await dailyLabyrinth.elementHandle());
  assert.ok(await page.locator('[data-labyrinth-action="decoy"]').isDisabled(), 'a thrown decoy must enter a visible cooldown');
  await page.goto(`${base}/index.html?standalone=1&cartridge=bastion&challenge=daily#voyage`, { waitUntil: 'networkidle' });
  await assertVisible(page, '.cartridge-stage .trial-frame canvas');
  await assertVisible(page, '.cartridge-modes [aria-current="page"]');
  await page.goto(`${base}/index.html?standalone=1&cartridge=shooter#voyage`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  if (!await page.locator('.cartridge-stage .tour-hunt-frame canvas').count()) throw new Error(`Shooter cartridge did not mount: ${await page.locator('#main').innerText()}\n${browserErrors.join('\n')}`);
  await assertVisible(page, '.cartridge-stage .tour-hunt-frame canvas');
  await page.waitForFunction(canvas => canvas.dataset.mode === 'endless', await page.locator('.cartridge-stage .tour-hunt-frame canvas').elementHandle());
  await page.goto(`${base}/index.html?standalone=1&cartridge=bastion#voyage`, { waitUntil: 'networkidle' });
  await page.waitForFunction(canvas => canvas.dataset.mode === 'endless', await page.locator('.cartridge-stage .trial-frame canvas').elementHandle());
  await page.goto(`${base}/index.html?standalone=1&cartridge=labyrinth#voyage`, { waitUntil: 'networkidle' });
  await assertVisible(page, '.cartridge-stage .trial-frame canvas');
  await page.waitForFunction(canvas => canvas.dataset.mode === 'endless', await page.locator('.cartridge-stage .trial-frame canvas').elementHandle());
  await page.waitForFunction(canvas => canvas.dataset.chamberCount === '4', await page.locator('.cartridge-stage .trial-frame canvas').elementHandle());
  const stealth = page.locator('.cartridge-stage .trial-frame canvas');
  await page.waitForFunction(canvas => canvas.dataset.roomTransition === '0.00', await stealth.elementHandle());
  await stealth.focus();
  await stealth.press(' ');
  await page.keyboard.down('d');
  await page.waitForFunction(canvas => Number(canvas.dataset.playerX) > 418, await stealth.elementHandle(), { timeout: 4000 });
  await page.keyboard.up('d');
  await page.keyboard.down('s');
  await page.waitForFunction(canvas => canvas.dataset.seal === 'collected', await stealth.elementHandle(), { timeout: 3000 });
  await page.keyboard.up('s');
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'triune-smoke'; document.body.append(host);
    window.__triuneSmoke = window.AetherTrials.create('labyrinth', host, { sound: false, startChamber: 3, onEnd() {} });
  });
  const triune = page.locator('#triune-smoke canvas');
  await triune.waitFor({ state: 'attached' });
  await page.waitForFunction(canvas => canvas.dataset.chamber === '4' && canvas.dataset.keysAvailable === '3' && canvas.dataset.keysRequired === '2', await triune.elementHandle());
  await page.evaluate(() => window.__triuneSmoke.destroy());
  await page.goto(`${base}/index.html?standalone=1&cartridge=starforge#voyage`, { waitUntil: 'networkidle' });
  const starforge = page.locator('.starforge-canvas');
  await assertVisible(page, '.starforge-canvas');
  await page.waitForFunction(canvas => canvas.dataset.scenario === '1', await starforge.elementHandle());
  if (await page.locator('[data-star-tool]').count() < 4) throw new Error('Starforge did not expose its first contract tools');
  const starforgeBox = await starforge.boundingBox();
  assert.ok(starforgeBox, 'the Starforge canvas needs a measurable layout box');
  const socket = (x, y) => ({ x: starforgeBox.width * x, y: starforgeBox.height * y });
  await page.locator('[data-star-tool="mirror"]').click();
  await starforge.click({ position: socket(.643, .27) });
  await page.getByText('CHECK THE GATES BEFORE IGNITION', { exact: true }).waitFor({ state: 'visible' });
  await starforge.click({ position: socket(.5, .175) });
  await page.getByText('NEXT: CONDUCTOR → RIGHT', { exact: true }).waitFor({ state: 'visible' });
  await page.locator('[data-star-tool="conductor"]').click();
  await starforge.click({ position: socket(.702, .5) });
  await page.locator('[data-star-tool="furnace"]').click();
  await starforge.click({ position: socket(.5, .825) });
  await page.locator('[data-star-tool="regulator"]').click();
  await starforge.click({ position: socket(.298, .5) });
  await page.locator('[data-starforge="run"]').click();
  await page.waitForFunction(canvas => Number(canvas.dataset.energy) >= 3, await starforge.elementHandle(), { timeout: 12000 });
  await page.waitForSelector('.cartridge-recap', { timeout: 4000 });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('aether-starforge-v1')).completed), 1, 'a sealed Starforge contract must unlock the next contract');

  await page.evaluate(() => localStorage.setItem('aether-starforge-v1', JSON.stringify({ completed: 0, best: 0 })));
  await page.reload({ waitUntil: 'networkidle' });
  const starforgeRace = page.locator('.starforge-canvas');
  await starforgeRace.waitFor({ state: 'visible' });
  await page.locator('[data-star-tool="mirror"]').click();
  await starforgeRace.click({ position: socket(.5, .175) });
  await page.locator('[data-star-tool="conductor"]').click();
  await starforgeRace.click({ position: socket(.702, .5) });
  await page.locator('[data-star-tool="furnace"]').click();
  await starforgeRace.click({ position: socket(.5, .825) });
  await page.locator('[data-star-tool="regulator"]').click();
  await starforgeRace.click({ position: socket(.298, .5) });
  await page.locator('[data-starforge="run"]').click();
  await page.waitForFunction(canvas => Number(canvas.dataset.energy) >= 3, await starforgeRace.elementHandle(), { timeout: 12000 });
  await page.evaluate(() => document.querySelector('[data-starforge="reset"]').click());
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.cartridge-recap').count(), 0, 'a finished-then-reset Starforge must not write a stale recap');
  assert.ok(await starforgeRace.count(), 'the Starforge canvas must survive the cancelled end timer');

  await page.goto(`${base}/index.html?standalone=1#voyage`, { waitUntil: 'networkidle' });
  await assertVisible(page, '.cartridge-cabinet');
  await assertVisible(page, '[data-tour="begin"]');
  await page.locator('[data-tour="begin"]').click();
  await page.locator('[data-tour-node]').first().waitFor({ state: 'visible' });

  await page.locator('[data-tour-node]').first().click();
  const arena = page.locator('.tour-hunt-frame canvas');
  await arena.waitFor({ state: 'visible' });
  await page.waitForFunction(canvas => canvas.dataset.playerX && canvas.dataset.phase === 'combat', await arena.elementHandle());

  const before = await arena.getAttribute('data-player-x');
  const box = await arena.boundingBox();
  assert.ok(box, 'the hunt canvas needs a measurable layout box');
  await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.72);
  await page.waitForTimeout(350);
  const after = await arena.getAttribute('data-player-x');
  assert.notEqual(after, before, 'pointer movement must physically move the ship on a scaled canvas');

  await page.keyboard.press('/');
  await page.locator('#modal[open]').waitFor({ state: 'visible' });
  await page.waitForFunction(canvas => canvas.dataset.paused === 'true', await arena.elementHandle(), { timeout: 4000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(canvas => canvas.dataset.paused === 'false', await arena.elementHandle(), { timeout: 4000 });

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(canvas => canvas.dataset.paused === 'true', await arena.elementHandle(), { timeout: 4000 });
  await arena.focus();
  await page.keyboard.press('p');
  await page.waitForFunction(canvas => canvas.dataset.paused === 'false', await arena.elementHandle(), { timeout: 4000 });

  const boltsBefore = Number(await arena.getAttribute('data-bolts-fired'));
  await page.keyboard.down('j');
  await page.waitForFunction(before => Number(document.querySelector('.tour-hunt-frame canvas').dataset.boltsFired) > before, boltsBefore, { timeout: 4000 });
  await page.keyboard.up('j');

  await page.locator('[data-tour="retreat"]').click();
  await page.locator('.tour-chart').waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const toast = document.querySelector('#toast');
    return toast.classList.contains('visible') && /hull/i.test(toast.textContent);
  }, undefined, { timeout: 4000 });
  const hullAfterRetreat = await page.evaluate(() => JSON.parse(localStorage.getItem('aether-grand-tour-v2')).active.hull);
  assert.equal(hullAfterRetreat, 2, 'aborting a hunt must cost one hull');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.tour-chart').waitFor({ state: 'visible' });
  const hullAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('aether-grand-tour-v2')).active.hull);
  assert.equal(hullAfterReload, 2, 'a saved Tour hull must survive a reload');
  const savedMapBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('aether-grand-tour-v2')).active.map);
  assert.ok(Array.isArray(savedMapBefore) && savedMapBefore.length === 12, 'an active tour must persist its dealt map');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.tour-chart').waitFor({ state: 'visible' });
  const savedMapAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('aether-grand-tour-v2')).active.map);
  assert.deepEqual(savedMapAfter, savedMapBefore, 'the dealt map must be identical across reloads');

  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'bastion-smoke';
    document.body.append(host);
    window.__bastionSmoke = window.AetherTrials.create('bastion', host, { sound: false, onEnd() {} });
  });
  const bastion = page.locator('#bastion-smoke canvas');
  await bastion.waitFor({ state: 'visible' });
  const bastionBox = await bastion.boundingBox();
  assert.ok(bastionBox, 'the Bastion canvas needs a measurable layout box');
  const cell = { x: bastionBox.width * .2, y: bastionBox.height * .27 };
  await bastion.hover({ position: cell });
  await page.waitForFunction(canvas => canvas.dataset.previewRange === '350', await bastion.elementHandle());
  await page.waitForFunction(canvas => Number(canvas.dataset.incoming) > 0, await bastion.elementHandle(), { timeout: 5000 });
  await bastion.click({ position: cell });
  await page.waitForFunction(canvas => canvas.dataset.towerCount === '1', await bastion.elementHandle());
  await page.waitForFunction(canvas => canvas.dataset.selectedSite === 'lens', await bastion.elementHandle());
  await bastion.press('q');
  await page.waitForFunction(canvas => canvas.dataset.selectedTier === '1' && canvas.dataset.selectedPath === 'left', await bastion.elementHandle());
  await page.evaluate(() => window.__bastionSmoke.destroy());
  await page.evaluate(() => {
    window.__prismSmoke = window.AetherTrials.create('bastion', document.querySelector('#bastion-smoke'), { sound: false, seed: 6024, onEnd() {} });
  });
  const prism = page.locator('#bastion-smoke canvas');
  await prism.waitFor({ state: 'visible' });
  await prism.press('3');
  const prismBox = await prism.boundingBox();
  await prism.click({ position: { x: prismBox.width * 456 / 900, y: prismBox.height * 287 / 560 } });
  await page.waitForFunction(canvas => Number(canvas.dataset.prismShots) >= 1, await prism.elementHandle(), { timeout: 9000 });
  await page.evaluate(() => { window.__prismSmoke.destroy(); document.querySelector('#bastion-smoke').remove(); });

  const trialIds = await page.evaluate(() => window.AetherTrials.list.map(trial => trial.id));
  for (const id of trialIds) {
    await page.evaluate(trialId => {
      const host = document.createElement('div');
      host.id = 'trial-smoke'; document.body.append(host);
      window.__trialSmoke = window.AetherTrials.create(trialId, host, { sound: false, onEnd() {} });
    }, id);
    await page.waitForTimeout(80);
    const trialSurface = page.locator('#trial-smoke canvas, #trial-smoke .deepfield-grid');
    if (!await trialSurface.count()) throw new Error(`${id} did not mount an interactive surface under the shared trial host`);
    await page.waitForFunction(surface => surface.getAttribute('role') === 'application' || surface.getAttribute('role') === 'group', await trialSurface.elementHandle());
    await page.evaluate(() => window.__trialSmoke.pause());
    await page.waitForFunction(surface => surface.dataset.paused === 'true', await trialSurface.elementHandle(), { timeout: 4000 });
    await page.evaluate(() => window.__trialSmoke.resume());
    await page.waitForFunction(surface => surface.dataset.paused !== 'true', await trialSurface.elementHandle(), { timeout: 4000 });
    await page.evaluate(() => { window.__trialSmoke.destroy(); document.querySelector('#trial-smoke').remove(); });
  }

  await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 500; canvas.id = 'hop-smoke';
    canvas.style.cssText = 'display:block;width:450px;height:auto';
    document.body.append(canvas);
    window.__hopSmoke = window.AetherArcade.create(canvas, { game: 'hop', relaxed: true, sound: false, seed: 7 });
    window.__hopSmoke.start();
  });
  const hop = page.locator('#hop-smoke');
  await page.waitForFunction(canvas => canvas.dataset.phase === 'running', await hop.elementHandle());
  await hop.scrollIntoViewIfNeeded();
  const hopBox = await hop.boundingBox();
  assert.ok(hopBox, 'the Comet Surf canvas needs a measurable scaled layout box');
  await page.mouse.move(hopBox.x + hopBox.width / 2, hopBox.y + hopBox.height / 2);
  await page.mouse.down();
  await page.waitForFunction(canvas => canvas.dataset.tethered === 'true', await hop.elementHandle());
  await hop.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await page.waitForTimeout(180);
  assert.equal(await hop.getAttribute('data-releases'), '0', 'a cancelled Comet Surf pointer press must not slingshot');
  assert.equal(await hop.getAttribute('data-tethered'), 'true', 'a cancelled Comet Surf pointer press must preserve its orbit');
  await page.evaluate(() => { window.__hopSmoke.destroy(); document.querySelector('#hop-smoke').remove(); });

  await page.goto(`${base}/index.html#calendar`, { waitUntil: 'networkidle' });
  const calendarTitle = await page.locator('.calendar-toolbar h2').textContent();
  await page.locator('[data-action="month-next"]').click();
  await page.waitForFunction(previous => document.querySelector('.calendar-toolbar h2').textContent !== previous, calendarTitle);
  await page.locator('.calendar-day').first().click();

  await page.goto(`${base}/index.html#journal`, { waitUntil: 'networkidle' });
  await page.locator('.view-header [data-action="new-entry"]').click();
  await page.locator('#entry-title').fill('Smoke-tested observation');
  await page.locator('#entry-subject').fill('Test sky');
  await page.locator('#entry-body').fill('A saved observation proves the field journal route persists safely.');
  await page.locator('#journal-form button[type="submit"]').click();
  await expectText(page, 'Smoke-tested observation');
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('aether-observatory-v1')).journal.some(entry => entry.title === 'Smoke-tested observation')), 'a new journal entry must persist');

  await page.goto(`${base}/index.html#planet/mercury`, { waitUntil: 'networkidle' });
  await assertVisible(page, '#puzzle-board');
  await page.locator('[data-puzzle-cell]').first().click();
  await page.waitForFunction(() => Number(document.querySelector('#puzzle-moves').textContent) > 0);

  await page.goto(`${base}/index.html#arcade`, { waitUntil: 'networkidle' });
  for (const id of ['dash', 'breaker', 'hop', 'merge']) {
    await page.locator(`[data-exp="choose-game"][data-id="${id}"]`).click();
    await page.waitForFunction(gameId => document.querySelector(`[data-exp="choose-game"][data-id="${gameId}"]`)?.getAttribute('aria-pressed') === 'true', id);
    await assertVisible(page, '#arcade-canvas');
  }
  await page.locator('[data-exp="choose-game"][data-id="dash"]').click();
  await page.locator('[data-exp="game-start"]').click();
  await page.waitForFunction(() => document.querySelector('#arcade-canvas').dataset.phase === 'running');

  for (const [route, selector] of [
    ['discover', '.room-grid'], ['darkroom', '.empty-experience'], ['orchestra', '[data-exp="music-note"][data-track="0"][data-step="0"]'], ['history', '.history-sky'], ['letters', '.signal-stage'], ['mystery', 'details.mystery-letter[open]'], ['cabinet', '.cabinet-passport'],
  ]) {
    await page.goto(`${base}/index.html#${route}`, { waitUntil: 'networkidle' });
    await assertVisible(page, selector);
  }
  await page.goto(`${base}/index.html#orchestra`, { waitUntil: 'networkidle' });
  const note = page.locator('[data-exp="music-note"]').first();
  const noteState = await note.getAttribute('aria-pressed');
  await note.click();
  assert.notEqual(await note.getAttribute('aria-pressed'), noteState, 'an orchestra note must toggle through the room route');
  await page.goto(`${base}/index.html#history`, { waitUntil: 'networkidle' });
  await page.locator('[data-exp="history-next"]').click();
  await page.waitForFunction(() => document.querySelector('[data-exp="history-next"]')?.textContent.includes('plate A'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/index.html?standalone=1&cartridge=starforge#voyage`, { waitUntil: 'networkidle' });
  await assertVisible(page, '.starforge-canvas');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the Starforge cartridge must not create horizontal overflow at 390px');
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${base}/index.html#telescope`, { waitUntil: 'networkidle' });
  await page.locator('[data-exp="open-dome"]').click();
  const scope = page.locator('#scope-canvas');
  await scope.scrollIntoViewIfNeeded();
  const scopeBox = await scope.boundingBox();
  assert.ok(scopeBox, 'the telescope canvas needs a measurable layout box');
  await page.mouse.move(scopeBox.x + scopeBox.width * .5, scopeBox.y + scopeBox.height * .5);
  await page.mouse.down();
  await page.mouse.move(scopeBox.x + scopeBox.width * .62, scopeBox.y + scopeBox.height * .5);
  await scope.dispatchEvent('lostpointercapture', { pointerId: 1 });
  await page.mouse.up();
  const scopeAfterLoss = await page.locator('#scope-coordinates').textContent();
  await page.mouse.move(scopeBox.x + scopeBox.width * .4, scopeBox.y + scopeBox.height * .5);
  await page.mouse.down();
  await page.mouse.move(scopeBox.x + scopeBox.width * .28, scopeBox.y + scopeBox.height * .5);
  await page.mouse.up();
  assert.notEqual(await page.locator('#scope-coordinates').textContent(), scopeAfterLoss, 'a fresh telescope drag must work after lost pointer capture');

  await page.goto(`${base}/index.html#worlds`, { waitUntil: 'networkidle' });
  const world = page.locator('#world-canvas');
  await world.scrollIntoViewIfNeeded();
  const worldBox = await world.boundingBox();
  assert.ok(worldBox, 'the world canvas needs a measurable layout box');
  await page.mouse.move(worldBox.x + worldBox.width * .5, worldBox.y + worldBox.height * .5);
  await page.mouse.down();
  await world.dispatchEvent('lostpointercapture', { pointerId: 1 });
  await page.mouse.up();
  const marksAfterLoss = await page.locator('#world-brush-status').textContent();
  await page.mouse.move(worldBox.x + worldBox.width * .6, worldBox.y + worldBox.height * .5);
  await page.mouse.down();
  await page.mouse.up();
  assert.notEqual(await page.locator('#world-brush-status').textContent(), marksAfterLoss, 'a fresh world-paint gesture must work after lost pointer capture');

  const safePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const saveErrors = [];
  safePage.on('pageerror', error => saveErrors.push(error.message));
  await safePage.addInitScript(() => {
    for (const key of ['aether-observatory-v1', 'aether-grand-tour-v2', 'aether-cartridge-records-v1', 'aether-wonder-rooms-v1', 'aether-planet-puzzles-v1', 'aether-starforge-v1']) {
      localStorage.setItem(key, '{not valid json');
    }
  });
  await safePage.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
  await assertVisible(safePage, '.playground-home');
  await safePage.waitForTimeout(150);
  assert.deepEqual(saveErrors, [], `corrupt saves must fall back safely: ${saveErrors.join('\n')}`);
  await safePage.close();

  const fixturePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const fixtureErrors = [];
  fixturePage.on('pageerror', error => fixtureErrors.push(error.message));
  await fixturePage.addInitScript(fixture => {
    for (const [key, value] of Object.entries(fixture)) localStorage.setItem(key, JSON.stringify(value));
  }, legacySaveFixture);
  await fixturePage.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
  assert.equal(await fixturePage.locator('#profile-name').textContent(), 'Fixture Keeper', 'a valid Observatory profile must load');
  await fixturePage.goto(`${base}/index.html#voyage`, { waitUntil: 'networkidle' });
  await expectText(fixturePage, 'Leg 1 of 12');
  await fixturePage.goto(`${base}/index.html?standalone=1&cartridge=shooter#voyage`, { waitUntil: 'networkidle' });
  assert.equal((await fixturePage.locator('.cartridge-record strong').textContent())?.trim(), '321', 'a valid cartridge record must load');
  assert.deepEqual(fixtureErrors, [], `legacy saves must load safely: ${fixtureErrors.join('\n')}`);
  await fixturePage.close();

  const touchPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touchErrors = [];
  touchPage.on('pageerror', error => touchErrors.push(error.message));
  await touchPage.addInitScript(() => {
    const now = new Date(), day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('aether-cartridge-records-v1', JSON.stringify({ best: { labyrinth: 250, [`labyrinth:${day}`]: 77 } }));
  });
  await touchPage.goto(`${base}/index.html?standalone=1&cartridge=labyrinth&challenge=daily#voyage`, { waitUntil: 'networkidle' });
  assert.equal((await touchPage.locator('.cartridge-record strong').textContent())?.trim(), '77', 'Daily Vigil must show its separate local best');
  assert.ok(await touchPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the Daily Vigil must fit a phone viewport');
  const decoyTouch = touchPage.locator('[data-labyrinth-action="decoy"]');
  await touchPage.waitForFunction(() => !document.querySelector('[data-labyrinth-action="decoy"]').disabled);
  await decoyTouch.click();
  await touchPage.waitForFunction(() => document.querySelector('.trial-frame canvas').dataset.decoy === 'active');
  assert.ok(await decoyTouch.isDisabled(), 'the touch decoy button must enter cooldown after activation');
  assert.ok(await touchPage.locator('.trial-frame canvas').evaluate(canvas => document.activeElement === canvas), 'gadget buttons must return focus to the game for WASD');
  await touchPage.keyboard.down('d');
  await touchPage.waitForFunction(() => Number(document.querySelector('.trial-frame canvas')?.dataset.playerX) > 180, null, { timeout: 3000 });
  await touchPage.keyboard.up('d');
  assert.deepEqual(touchErrors, [], `touch Daily Vigil errors: ${touchErrors.join('\n')}`);
  await touchPage.close();

  const refitPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const refitErrors = [];
  refitPage.on('pageerror', error => refitErrors.push(error.message));
  await refitPage.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
  await refitPage.evaluate(() => {
    const host = document.createElement('div'); host.id = 'refit-smoke'; document.body.append(host);
    window.__refitSmoke = window.AetherSkirmish.create(host, { sector: 1, elite: true, endless: true, hull: 'kite', instruments: [], seed: 6024, difficulty: 'standard', sound: false, onEnd() {} });
  });
  const refitCanvas = refitPage.locator('#refit-smoke canvas');
  await refitCanvas.focus();
  await refitPage.keyboard.down('j');
  await refitPage.waitForFunction(() => document.querySelector('#refit-smoke canvas')?.dataset.phase === 'draft', null, { timeout: 30000 });
  await refitPage.keyboard.up('j');
  await assertVisible(refitPage, '#refit-smoke [data-skirmish-refit="guard"]');
  const clearedHp = Number(await refitCanvas.getAttribute('data-hp'));
  await refitPage.keyboard.press('1');
  await refitPage.waitForFunction(() => document.querySelector('#refit-smoke canvas')?.dataset.refit === 'guard');
  assert.ok(Number(await refitCanvas.getAttribute('data-hp')) > clearedHp, 'Reinforce must restore plating after a cleared wave');
  assert.ok(await refitPage.locator('#refit-smoke .skirmish-draft').isHidden(), 'selection must close the breather before combat resumes');
  await refitPage.evaluate(() => window.__refitSmoke.destroy());
  assert.deepEqual(refitErrors, [], `endless Skirmish errors: ${refitErrors.join('\n')}`);
  await refitPage.close();

  const malformedPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const malformedErrors = [];
  malformedPage.on('pageerror', error => malformedErrors.push(error.message));
  await malformedPage.addInitScript(fixture => {
    localStorage.setItem('unrelated-player-data', 'keep me');
    for (const [key, value] of Object.entries(fixture)) localStorage.setItem(key, JSON.stringify(value));
  }, malformedSaveFixture);
  await malformedPage.goto(`${base}/index.html#planet/mercury`, { waitUntil: 'networkidle' });
  await assertVisible(malformedPage, '#puzzle-board');
  await malformedPage.goto(`${base}/index.html?standalone=1&cartridge=starforge#voyage`, { waitUntil: 'networkidle' });
  await malformedPage.waitForFunction(canvas => canvas.dataset.scenario === '1', await malformedPage.locator('.starforge-canvas').elementHandle());
  await malformedPage.goto(`${base}/index.html#voyage`, { waitUntil: 'networkidle' });
  await expectText(malformedPage, 'Leg 12 of 12');
  assert.equal((await malformedPage.locator('.tour-hull').textContent())?.trim(), '♥♡♡', 'invalid hull values must clamp into a survivable recovered run');
  await expectText(malformedPage, 'Prism Lens');
  assert.equal(await malformedPage.getByText('not-an-instrument', { exact: false }).count(), 0, 'unknown instruments must not enter a recovered build');
  assert.equal(await malformedPage.evaluate(() => localStorage.getItem('unrelated-player-data')), 'keep me', 'save recovery must not clear unrelated player data');
  assert.deepEqual(malformedErrors, [], `wrong-shaped saves must recover safely: ${malformedErrors.join('\n')}`);
  await malformedPage.close();

  assert.deepEqual(browserErrors, [], `browser errors: ${browserErrors.join('\n')}`);
  await browser.close();
  console.log('Browser smoke passed: overview, daily records, seeded patrols, keyboard-steered Labyrinth seal/decoy, seeded Skirmish refit, Starforge mirror relocation and first contract, Bastion Prism fire and upgrades, all 16 trials, saves, navigation and teardown.');
} finally {
  server.kill('SIGTERM');
  await once(server, 'exit').catch(() => {});
}

async function assertVisible(page, selector) {
  await page.locator(selector).waitFor({ state: 'visible' });
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible' });
}
