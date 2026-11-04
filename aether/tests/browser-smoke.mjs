import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const port = 4174;
const base = `http://127.0.0.1:${port}`;
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
  await bastion.click({ position: cell });
  await page.waitForFunction(canvas => canvas.dataset.towerCount === '1', await bastion.elementHandle());
  await bastion.press('q');
  await page.waitForFunction(canvas => canvas.dataset.selectedTier === '1' && canvas.dataset.selectedPath === 'left', await bastion.elementHandle());
  await page.evaluate(() => window.__bastionSmoke.destroy());

  assert.deepEqual(browserErrors, [], `browser errors: ${browserErrors.join('\n')}`);
  await browser.close();
  console.log('Browser smoke passed: landing, cabinet routes, standalone tour, hunt mount, pointer flight, retreat cost, and Bastion upgrades.');
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
