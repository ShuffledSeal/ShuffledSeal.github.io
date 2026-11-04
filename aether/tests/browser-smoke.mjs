import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const port = 4174;
const base = `http://127.0.0.1:${port}`;
const legacySaveFixture = {
  'aether-observatory-v1': { name: 'Fixture Keeper', location: 'kyoto', saved: ['saturn'], journal: [] },
  'aether-grand-tour-v2': {
    records: { tours: 2, wins: 0, kills: 8, bestDust: 40, bossWins: 0, highScore: 900, bestChain: 3 },
    // Older active-run records did not carry these optional score fields.
    active: { seed: 4242, step: 0, hull: 3, maxHull: 3, dust: 10, instruments: [], hullId: 'kite', done: {}, path: [], kills: 0 },
  },
  'aether-cartridge-records-v1': { best: { shooter: 321, bastion: 99, labyrinth: 44 } },
  'aether-wonder-rooms-v1': { discoveries: ['arcade:merge-3'], best: { merge: 120 } },
  'aether-planet-puzzles-v1': { records: {}, drafts: {}, levels: { saturn: 1 }, endless: {} },
};
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
  await assertVisible(page, '.cartridge-cabinet');
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
  await page.locator('[data-tour="retreat"]').click();
  await page.locator('.tour-chart').waitFor({ state: 'visible' });
  const hullAfterRetreat = await page.evaluate(() => JSON.parse(localStorage.getItem('aether-grand-tour-v2')).active.hull);
  assert.equal(hullAfterRetreat, 2, 'aborting a hunt must cost one hull');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.tour-chart').waitFor({ state: 'visible' });
  const hullAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('aether-grand-tour-v2')).active.hull);
  assert.equal(hullAfterReload, 2, 'a saved Tour hull must survive a reload');

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
    for (const key of ['aether-observatory-v1', 'aether-grand-tour-v2', 'aether-cartridge-records-v1', 'aether-wonder-rooms-v1', 'aether-planet-puzzles-v1']) {
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

  assert.deepEqual(browserErrors, [], `browser errors: ${browserErrors.join('\n')}`);
  await browser.close();
  console.log('Browser smoke passed: landing, cabinet routes, valid and corrupt save recovery, standalone tour, hunt mount, pointer flight, Comet Surf cancellation, Wonder Room pointer recovery, retreat cost, and Bastion range upgrades.');
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
