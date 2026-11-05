// Aether Bastion authored campaign: planning freeze, lane manifest, scripted
// six-siege victory through the Crown Engine titan, no-build defeat and
// teardown. Run with Playwright installed (dev-only):
//   node tests/bastion-campaign.mjs
// AUTHORED BUT UNRUN: written in an environment without node/npm. The
// campaign is deterministic (no gameplay RNG outside endless mode), but the
// scripted build order and virtual-time budgets still need one real run.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

// A distinct local port lets campaign, depth and roguelite checks run side by side.
const port = 9000 + process.pid % 20000, base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: new URL('..', import.meta.url), stdio: 'ignore' });
const errors = [];
const open = async browser => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  return page;
};
const COST = { 1: 45, 2: 65, 3: 90, 4: 55 };
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(`${base}/index.html`)).ok) break; } catch {}
    if (attempt === 39) throw new Error('Local Æther test server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const browser = await chromium.launch({ headless: true });

  // Planning freezes combat: no wave clock, no survival time, no threat
  // movement until an order launches the siege. A blocked order (repair at
  // full core) must not launch. Destroy leaves no DOM, listeners or callbacks.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'freeze-bastion'; document.body.append(host);
      window.__freezeEnd = [];
      window.__freeze = AetherTrials.create('bastion', host, { sound: false, seed: 6024, onEnd: result => window.__freezeEnd.push(result) });
    });
    const canvas = page.locator('#freeze-bastion canvas');
    await page.clock.runFor(500);
    assert.equal(await canvas.getAttribute('data-mode'), 'mission');
    assert.equal(await canvas.getAttribute('data-planning'), 'true', 'campaign must open in planning');
    assert.equal(await canvas.getAttribute('data-phase'), 'planning');
    assert.equal(await canvas.getAttribute('data-wave'), '1');
    assert.equal(await canvas.getAttribute('data-wave-time'), '0.00');
    assert.equal(await canvas.getAttribute('data-survived'), '0');
    assert.equal(await page.locator('#freeze-bastion .bastion-orders').isHidden(), false, 'order panel must show during planning');
    assert.match(await page.locator('[data-bastion-forecast]').textContent(), /PLAN 1 \/ 6 · First light · 8 threats/);
    assert.match(await page.locator('[data-bastion-manifest]').textContent(), /Lane 2: 4 scout · Lane 3: clear · Lane 4: 4 scout/);
    assert.ok((await page.locator('[data-bastion-hint]').textContent()).includes('Needles in lanes 2 and 4'));
    const repair = page.locator('[data-bastion-order="repair"]');
    assert.ok(await repair.isDisabled(), 'repair is disabled while the core is full');
    assert.match(await repair.textContent(), /Core full/);
    assert.ok(await page.locator('[data-bastion-order="overdrive"]').isEnabled());
    assert.ok(await page.locator('[data-bastion-order="save"]').isEnabled());
    await page.clock.runFor(4000);
    assert.equal(await canvas.getAttribute('data-wave-time'), '0.00', 'planning freezes the wave clock');
    assert.equal(await canvas.getAttribute('data-survived'), '0', 'planning freezes survival time');
    assert.equal(await canvas.getAttribute('data-enemies'), '0');
    assert.equal(await canvas.getAttribute('data-incoming'), '0', 'no gates telegraph during planning');
    await canvas.press('z');
    await page.clock.runFor(300);
    assert.equal(await canvas.getAttribute('data-planning'), 'true', 'a blocked order must not launch the wave');
    await canvas.press('c');
    await page.clock.runFor(300);
    assert.equal(await canvas.getAttribute('data-planning'), 'false', 'save order launches the siege');
    assert.equal(await canvas.getAttribute('data-phase'), 'combat');
    assert.equal(await page.locator('#freeze-bastion .bastion-orders').isHidden(), true, 'order panel hides in combat');
    await page.clock.runFor(2500);
    assert.ok(Number(await canvas.getAttribute('data-wave-time')) > 0, 'combat advances the wave clock');
    assert.ok(Number(await canvas.getAttribute('data-incoming')) + Number(await canvas.getAttribute('data-enemies')) > 0, 'manifest entries must telegraph and spawn');
    await page.evaluate(() => window.__freeze.destroy());
    assert.equal(await page.locator('#freeze-bastion canvas, #freeze-bastion .bastion-orders, #freeze-bastion .bastion-controls').count(), 0, 'destroy removes canvas, orders and controls');
    await page.clock.runFor(3000);
    assert.deepEqual(await page.evaluate(() => window.__freezeEnd), [], 'destroy mid-run never fires onEnd');
    await page.close();
  }

  // No-build defeat: launching First light empty leaks all eight scouts into
  // the eight-heart core. Exactly one loss callback, then full teardown.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'loss-bastion'; document.body.append(host);
      window.__lossEnd = [];
      window.__loss = AetherTrials.create('bastion', host, { sound: false, seed: 6024, onEnd: result => window.__lossEnd.push(result) });
    });
    const canvas = page.locator('#loss-bastion canvas');
    await page.clock.runFor(300);
    await canvas.press('c');
    await page.clock.runFor(45000);
    assert.equal(await canvas.count(), 0, 'defeat destroys the trial surface');
    const results = await page.evaluate(() => window.__lossEnd);
    assert.equal(results.length, 1, 'defeat reports exactly once');
    assert.equal(results[0].won, false);
    await page.clock.runFor(4000);
    assert.equal((await page.evaluate(() => window.__lossEnd)).length, 1, 'no second callback after teardown');
    await page.close();
  }

  // Scripted campaign victory: build to each authored hint, save alloy on
  // early sieges, refine the lane-3 Prism, overdrive the finale, kill the
  // Crown Engine titan. The campaign is deterministic given this script.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'win-bastion'; host.style.cssText = 'position:relative;z-index:1000'; document.body.append(host);
      window.__winEnd = [];
      window.__win = AetherTrials.create('bastion', host, { sound: false, seed: 6024, onEnd: result => window.__winEnd.push(result) });
    });
    const canvas = page.locator('#win-bastion canvas'), box = await canvas.boundingBox();
    const build = async (type, row, col) => {
      if (Number(await canvas.getAttribute('data-alloy')) < COST[type]) return;
      await canvas.press(String(type));
      await canvas.click({ position: { x: box.width * (180 + 92 * col) / 900, y: box.height * (151 + 68 * row) / 560 } });
    };
    const refine = async (row, col, key, cost) => {
      if (Number(await canvas.getAttribute('data-alloy')) < cost) return;
      await canvas.click({ position: { x: box.width * (180 + 92 * col) / 900, y: box.height * (151 + 68 * row) / 560 } });
      await canvas.press(key);
    };
    // Wave → towers (type, row, col). Redundant clicks on occupied cells only
    // select, never double-spend, so the script tolerates earlier skips.
    const plans = {
      1: [[1, 1, 2], [1, 3, 2]],                                        // needles watch lanes 2 + 4
      2: [[3, 2, 3], [2, 1, 1]],                                        // prism on the coil, frost over lanes 1-3
      3: [[2, 0, 1], [1, 0, 2], [2, 4, 1], [1, 4, 2]],                  // chill + needles vs iron in lanes 1/5
      4: [[1, 3, 3], [4, 3, 5], [4, 4, 5], [1, 4, 3]],                  // runners meet needles and sunmines
      5: [[1, 0, 3], [1, 2, 2], [1, 2, 4], [2, 2, 1]],                  // every lane covered, lane 3 reinforced
      6: [[4, 2, 5], [1, 2, 0], [4, 3, 4]],                             // everything into the titan lane
    };
    await page.clock.runFor(300);
    assert.equal(await canvas.getAttribute('data-planning'), 'true');
    // Exercise the speed toggle and heavy-priority user control once.
    await canvas.press('f');
    await page.clock.runFor(200);
    assert.equal(await canvas.getAttribute('data-fast'), 'true');
    assert.equal(await canvas.getAttribute('data-speed'), '2');
    assert.match(await page.locator('[data-bastion-action="speed"]').textContent(), /Speed 2×/);
    let titanLaneSeen = '', titanDown = false;
    for (let wave = 1; wave <= 6 && await canvas.count(); wave++) {
      assert.equal(await canvas.getAttribute('data-wave'), String(wave), `planning opens for siege ${wave}`);
      assert.equal(await canvas.getAttribute('data-wave-cleared'), String(wave - 1));
      for (const [type, row, col] of plans[wave]) await build(type, row, col);
      if (wave === 1) {
        await canvas.press('r');
        await page.clock.runFor(200);
        assert.equal(await canvas.getAttribute('data-target-priority'), 'heavy', 'R flips the selected tower to heavy priority');
        await canvas.press('r');
        await page.clock.runFor(200);
        assert.equal(await canvas.getAttribute('data-target-priority'), 'front');
      }
      if (wave >= 5) { await refine(2, 3, 'q', 104); await refine(2, 3, 'q', 149); }
      assert.equal(await canvas.getAttribute('data-planning'), 'true', 'construction never launches a siege');
      const overdrive = page.locator('[data-bastion-order="overdrive"]');
      let overdriven = false;
      if (wave === 6 && await overdrive.isEnabled()) { await overdrive.click(); overdriven = true; }
      else await canvas.press('c');
      await page.clock.runFor(300);
      assert.equal(await canvas.getAttribute('data-planning'), 'false', `order launches siege ${wave}`);
      if (overdriven) assert.equal(await canvas.getAttribute('data-overdrive'), '1', 'overdrive applies to the final siege');
      // Combat: poll the diagnostics until the next planning phase or the end.
      for (let tick = 0; tick < 150 && await canvas.count(); tick++) {
        if (wave === 6) {
          titanLaneSeen ||= await canvas.getAttribute('data-titan-lane') || '';
          if (await canvas.getAttribute('data-titan-killed') === 'true') titanDown = true;
        }
        if (await canvas.getAttribute('data-planning') === 'true') break;
        await page.clock.runFor(1000);
      }
      if (!await canvas.count()) break;
    }
    for (let tick = 0; tick < 20 && await canvas.count(); tick++) await page.clock.runFor(1000);
    assert.equal(await canvas.count(), 0, 'the campaign ends and tears down');
    assert.equal(titanLaneSeen, '3', 'the Crown Engine telegraphs in its manifest lane');
    assert.ok(titanDown, 'the titan is destroyed before the mission closes');
    const results = await page.evaluate(() => window.__winEnd);
    assert.equal(results.length, 1, 'victory reports exactly once');
    assert.equal(results[0].won, true, 'a hinted, refined board wins the campaign');
    assert.ok(results[0].score > 0);
    await page.clock.runFor(3000);
    assert.equal((await page.evaluate(() => window.__winEnd)).length, 1);
    await page.close();
  }

  assert.deepEqual(errors, [], `page errors during campaign checks: ${errors.join('\n')}`);
  await browser.close();
  console.log('Bastion campaign passed: planning freeze, manifest, blocked orders and teardown; no-build defeat fires one loss; scripted six-siege victory telegraphs and kills the lane-3 titan with a single onEnd.');
} finally {
  server.kill('SIGTERM');
  await once(server, 'exit').catch(() => {});
}
