// Planet puzzle journeys: Jupiter burn-planning flow (preview, launch, win,
// undo) plus an instruction-line smoke check on every other planet page.
// Run with Playwright installed (dev-only): npm run test:planets
// NOTE: this .mjs file itself has not been executed (no node/npm in the
// authoring environment). Every check in it was run and passed through an
// equivalent Python Playwright script against a local http.server, including
// solving all five Jupiter levels via the UI. Mark as authored-but-unrun
// until `npm install && npm run test:planets` confirms it directly.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

// A distinct local port lets this suite run beside the other browser checks.
const port = 4300 + process.pid % 20000, base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: new URL('..', import.meta.url), stdio: 'ignore' });
const errors = [];

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { const response = await fetch(`${base}/index.html`); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('The local Æther server did not start.');
}
const moves = page => page.evaluate(() => Number(document.querySelector('#puzzle-moves').textContent));

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));

  // ── Jupiter level 1: authored start [1,2,3] over 4 divisions, reference
  // plan = one burn on Io (0) and one on Ganymede (2). ──────────────────────
  await page.goto(`${base}/index.html#planet/jupiter`, { waitUntil: 'networkidle' });
  await page.locator('[data-puzzle-moon="0"]').waitFor({ state: 'visible' });

  const instruction = await page.locator('#puzzle-instruction').textContent();
  assert.ok(instruction.trim().length > 20, 'Jupiter must show a contextual instruction line');
  assert.equal(await page.locator('.dial-needle-plan').count(), 0, 'no preview needles before planning');
  assert.equal(await page.locator('.burn-badge').count(), 0, 'no burn badges before planning');
  await assertDisabled(page, '[data-puzzle="launch"]');

  // Queue a burn on Io: preview appears, but no move is committed yet.
  await page.locator('[data-puzzle-moon="0"]').click();
  assert.equal(await moves(page), 0, 'planning a burn must not spend moves');
  await page.locator('.dial-needle-plan').first().waitFor({ state: 'visible' });
  assert.ok((await page.locator('.dial-needle-plan').count()) >= 2, 'a queued Io burn also moves Europa, so several preview needles show');
  assert.equal(await page.locator('[data-puzzle-moon="0"] .burn-badge').textContent(), '×1');
  await page.locator('[data-puzzle="launch"]').waitFor({ state: 'attached' });
  assert.ok(!(await page.locator('[data-puzzle="launch"]').isDisabled()), 'launch enables once a burn is queued');

  // Adjust the plan with the chip controls, then rebuild it.
  await page.locator('[data-puzzle-unburn="0"]').click();
  assert.equal(await page.locator('.burn-badge').count(), 0, 'the − chip removes the queued burn');
  assert.equal(await moves(page), 0, 'plan edits never spend moves');
  await page.locator('[data-puzzle-moon="0"]').click();
  await page.locator('[data-puzzle="clear-plan"]').click();
  assert.equal(await page.locator('.burn-badge').count(), 0, 'clear plan empties the queue');
  assert.equal(await page.locator('.dial-needle-plan').count(), 0, 'clearing the plan hides the preview');

  // Queue the reference plan via keyboard, then launch with the L shortcut.
  await page.locator('[data-puzzle-moon="0"]').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight'); // wraps focus between moons
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter'); // queued: Io ×1, Ganymede ×1
  assert.equal(await page.locator('[data-puzzle-moon="0"] .burn-badge').textContent(), '×1');
  assert.equal(await page.locator('[data-puzzle-moon="2"] .burn-badge').textContent(), '×1');
  await page.keyboard.press('l');
  await page.locator('#puzzle-result:not([hidden])').waitFor({ state: 'visible' });
  assert.equal(await moves(page), 2, 'the two-burn reference plan solves level 1 in par');
  await expectText(page, '#puzzle-status', 'Puzzle solved');
  assert.equal(await page.locator('.burn-badge').count(), 0, 'launching consumes the plan');

  // Undo steps back one burn at a time; redo restores the win.
  await page.locator('[data-puzzle="undo"]').click();
  assert.equal(await moves(page), 1, 'undo restores a single burn, not the whole plan');
  assert.ok(await page.locator('#puzzle-result').isHidden(), 'undo before the final burn hides the result');
  await page.locator('[data-puzzle="redo"]').click();
  await page.locator('#puzzle-result:not([hidden])').waitFor({ state: 'visible' });

  // A won level records progress that survives a reload.
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-puzzle-level="0"]').waitFor({ state: 'visible' });
  const chip = await page.locator('[data-puzzle-level="0"]').getAttribute('aria-label');
  assert.ok(chip.includes('completed'), 'the solved level chip keeps its record after reload');

  // ── Instruction-line smoke on every other planet ─────────────────────────
  for (const [id, keyword] of [['mercury', 'crater'], ['venus', 'pipe'], ['earth', 'station'], ['mars', 'rover'], ['saturn', 'block'], ['uranus', 'Tilt'], ['neptune', 'buoy']]) {
    await page.goto(`${base}/index.html#planet/${id}`, { waitUntil: 'networkidle' });
    // Wait for this planet's own instruction text, not a stale previous board.
    await page.waitForFunction(word => document.querySelector('#puzzle-instruction')?.textContent.includes(word), keyword);
    const cells = await page.locator('#puzzle-board .puzzle-cell, #puzzle-board .orbital-dial, #puzzle-board .ring-square').count();
    assert.ok(cells > 0, `${id} must render its board`);
  }

  assert.deepEqual(errors, [], 'no page errors during the planet journeys');
  console.log('planet-journeys: all checks passed');
} finally {
  server.kill();
}

async function expectText(page, selector, text) {
  await page.waitForFunction(([sel, wanted]) => document.querySelector(sel)?.textContent.includes(wanted), [selector, text]);
}
async function assertDisabled(page, selector) {
  assert.ok(await page.locator(selector).isDisabled(), `${selector} must be disabled`);
}
