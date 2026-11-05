// Constellation Chain campaign depth: formation switching, the safe-refit
// draft between encounters, relic effects, seeded daily determinism, teardown
// and the exactly-once end callback.
//
// AUTHORED BUT UNRUN AS NODE SUITE: this environment has no Node.js, so the
// file was verified statically only (syntax-balanced, selectors and dataset
// keys cross-checked against aether/trials-action.js). Run with Playwright
// installed (dev-only): node tests/chain-campaign.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

// A distinct local port lets this suite run beside the other depth checks.
const port = 4600 + process.pid % 20000, base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: new URL('..', import.meta.url), stdio: 'ignore' });
const errors = [];
const open = async browser => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  return page;
};
// Advance virtual time until a canvas dataset predicate holds, clicking a
// draft choice whenever the safe refit opens. Returns false on timeout.
const runUntil = async (page, canvas, predicate, limit = 60) => {
  for (let attempt = 0; attempt < limit; attempt++) {
    if (await predicate()) return true;
    if (await canvas.count() === 0) return false;
    if (await canvas.getAttribute('data-chain-draft') === 'open' && await canvas.getAttribute('data-chain-phase') === 'draft') {
      const choice = page.locator('[data-chain-choice]').first();
      if (await choice.count()) await choice.click();
    }
    await page.clock.runFor(1000);
  }
  return predicate();
};
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(`${base}/index.html`)).ok) break; } catch {}
    if (attempt === 39) throw new Error('Local Æther test server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const browser = await chromium.launch({ headless: true });

  // Formation switch changes the firing range measurably, the launch flow
  // works, and Space does nothing before a Pulse heart is drafted.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'depth-chain'; document.body.append(host);
      window.__chainEnd = [];
      window.__chain = AetherTrials.create('chain', host, { sound: false, seed: 6024, onEnd: result => window.__chainEnd.push(result) });
    });
    const canvas = page.locator('#depth-chain canvas');
    assert.equal(await page.locator('#depth-chain .chain-controls').count(), 1, 'the control shelf mounts beside the canvas');
    assert.equal(await page.locator('[data-chain-formation]').count(), 3, 'three formations are offered');
    assert.equal(await canvas.getAttribute('data-chain-phase'), 'ready');
    assert.equal(await canvas.getAttribute('data-chain-draft'), 'open');
    assert.ok(await page.locator('[data-chain-start]').count(), 'a launch button opens the run');
    assert.equal(await page.locator('[data-chain-formation="ribbon"]').getAttribute('aria-pressed'), 'true');

    // Formation buttons apply range/rate and move aria-pressed.
    await page.locator('[data-chain-formation="spear"]').click();
    assert.equal(await canvas.getAttribute('data-chain-formation'), 'spear');
    assert.equal(await canvas.getAttribute('data-chain-range'), '440', 'spear must widen link range');
    assert.equal(await page.locator('[data-chain-formation="spear"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-chain-formation="ribbon"]').getAttribute('aria-pressed'), 'false');
    // The F key cycles formations from the canvas.
    await canvas.focus();
    await canvas.press('f');
    assert.equal(await canvas.getAttribute('data-chain-formation'), 'ribbon', 'F cycles spear back round to ribbon');
    assert.equal(await canvas.getAttribute('data-chain-range'), '350');

    // Space is inert until a Pulse heart is drafted; the button stays hidden.
    assert.ok(await page.locator('[data-chain-pulse]').isHidden(), 'pulse button hides without the nova relic');
    await canvas.press(' ');
    assert.equal((await page.evaluate(() => window.__chain.state)).pulseTime, 0, 'Space must not fire without the nova relic');

    // Launch, then idle-glide into a corner while the links clear the nursery.
    await page.locator('[data-chain-start]').click();
    assert.equal(await canvas.getAttribute('data-chain-phase'), 'combat');
    assert.equal(await canvas.getAttribute('data-chain-draft'), 'closed');
    assert.match(await page.locator('.chain-status').textContent(), /Drift nursery/);
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * .13, box.y + box.height * .2);
    const reached = await runUntil(page, canvas, async () => await canvas.getAttribute('data-chain-phase') === 'draft', 45);
    assert.ok(reached, 'the first encounter must resolve into a safe refit');
    assert.equal(await canvas.getAttribute('data-chain-draft'), 'open');
    assert.equal(await canvas.getAttribute('data-chain-encounter'), '1', 'the draft opens after encounter one');
    assert.equal(await page.locator('[data-chain-choice]').count(), 3, 'three seeded draft choices are offered');
    const state = await page.evaluate(() => window.__chain.state);
    assert.equal(state.choices.length, 3);
    assert.ok(state.shotsFired > 0, 'links must actually fire during the encounter');

    // Pause freezes the draft: every control disables, nothing advances.
    await page.evaluate(() => window.__chain.pause());
    assert.equal(await canvas.getAttribute('data-paused'), 'true');
    assert.ok(await page.locator('[data-chain-choice]').first().isDisabled(), 'draft choices disable behind pause');
    assert.ok(await page.locator('[data-chain-formation="halo"]').isDisabled(), 'formation buttons disable behind pause');
    await page.evaluate(() => window.__chain.resume());
    assert.ok(await page.locator('[data-chain-choice]').first().isEnabled());

    // Choosing a relic is recorded mechanically in state and dataset.
    const picked = await page.evaluate(() => {
      const { choices } = window.__chain.state;
      const id = choices.includes('ward') ? 'ward' : choices[0];
      document.querySelector(`[data-chain-choice="${id}"]`).click();
      return id;
    });
    const after = await page.evaluate(() => window.__chain.state);
    assert.equal(after.draftCount, 1, 'one draft resolved');
    assert.equal(after.encounter, 2, 'the draft advances to the second encounter');
    assert.equal(after.phase, 'combat');
    if (after.relics[picked]) assert.equal(after.relics[picked], 1, `${picked} must be recorded at rank 1`);
    if (picked === 'ward') {
      assert.equal(after.ward, 1, 'the aegis charges immediately');
      assert.equal(await canvas.getAttribute('data-chain-ward'), '1');
    }
    if (after.relics[picked]) assert.match(await canvas.getAttribute('data-chain-relics'), new RegExp(picked), 'the drafted relic is mirrored to the dataset');

    // Teardown mid-combat removes canvas and controls and stays silent.
    await page.evaluate(() => window.__chain.destroy());
    assert.equal(await page.locator('#depth-chain canvas, #depth-chain .chain-controls').count(), 0, 'destroy removes canvas and the control shelf');
    await page.clock.runFor(4000);
    assert.deepEqual(await page.evaluate(() => window.__chainEnd), [], 'destroy must not send a late end callback');
    await page.close();
  }

  // A daily seed deals identical spawns and identical relic offers.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      window.__daily = ['d1', 'd2'].map(id => {
        const host = document.createElement('div'); host.id = id; document.body.append(host);
        return AetherTrials.create('chain', host, { sound: false, seed: 'chain:2026-11-05', daily: true, onEnd: () => {} });
      });
    });
    for (const id of ['d1', 'd2']) await page.locator(`#${id} [data-chain-start]`).click();
    await page.clock.runFor(1500);
    const spawns = await page.evaluate(() => window.__daily.map(g => g.state.enemies.map(e => [e.kind, Math.round(e.x), Math.round(e.y)])));
    assert.ok(spawns[0].length > 0, 'the seeded encounter must spawn threats');
    assert.deepEqual(spawns[0], spawns[1], 'a daily seed must deal identical spawns');
    const canvases = [page.locator('#d1 canvas'), page.locator('#d2 canvas')];
    for (const c of canvases) {
      const reached = await runUntil(page, c, async () => await c.getAttribute('data-chain-phase') === 'draft', 45);
      assert.ok(reached, 'both daily runs must reach the first refit');
    }
    const offers = await page.evaluate(() => window.__daily.map(g => g.state.choices));
    assert.deepEqual(offers[0], offers[1], 'a daily seed must deal identical relic offers');
    assert.equal(offers[0].length, 3);
    await page.evaluate(() => window.__daily.forEach(g => g.destroy()));
    assert.equal(await page.locator('#d1 canvas, #d2 canvas, #d1 .chain-controls, #d2 .chain-controls').count(), 0);
    await page.close();
  }

  // An unattended endless run is eventually lost; the end callback fires
  // exactly once and the shelf is gone afterwards.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'endless-chain'; document.body.append(host);
      window.__endlessEnd = [];
      window.__endless = AetherTrials.create('chain', host, { sound: false, seed: 99, endless: true, onEnd: result => window.__endlessEnd.push(result) });
    });
    const canvas = page.locator('#endless-chain canvas');
    await page.locator('#endless-chain [data-chain-start]').click();
    const ended = await runUntil(page, canvas, async () => (await page.evaluate(() => window.__endlessEnd)).length > 0, 300);
    assert.ok(ended, 'an unattended endless run must eventually break the chain');
    const results = await page.evaluate(() => window.__endlessEnd);
    assert.equal(results.length, 1);
    assert.equal(results[0].won, false);
    assert.ok(results[0].score >= 0);
    await page.clock.runFor(5000);
    assert.equal((await page.evaluate(() => window.__endlessEnd)).length, 1, 'defeat must not call onEnd twice');
    assert.equal(await page.locator('#endless-chain canvas, #endless-chain .chain-controls').count(), 0);
    await page.close();
  }

  assert.deepEqual(errors, [], `page errors during chain campaign checks: ${errors.join('\n')}`);
  await browser.close();
  console.log('Chain campaign passed: formation range switching (buttons and F), pulse gating, launch, first-encounter draft with three seeded choices, pause-safe draft, recorded relic effects, identical daily spawns and offers, destroy cleanliness, and exactly one defeat callback in endless mode.');
} finally {
  server.kill('SIGTERM');
  await once(server, 'exit').catch(() => {});
}
