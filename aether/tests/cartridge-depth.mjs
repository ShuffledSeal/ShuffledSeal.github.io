// Full paths and failure states beyond the short browser-smoke checks.
// Run with Playwright installed (dev-only): node tests/cartridge-depth.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

// A distinct local port lets depth and smoke checks run side by side.
const port = 4200 + process.pid % 20000, base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: new URL('..', import.meta.url), stdio: 'ignore' });
const errors = [];
const open = async browser => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  return page;
};
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(`${base}/index.html`)).ok) break; } catch {}
    if (attempt === 39) throw new Error('Local Æther test server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const browser = await chromium.launch({ headless: true });

  // Six real contracts: use a disposable browser profile with the contract
  // selector unlocked. No fixture is written into a user's save.
  for (let index = 0; index < 6; index++) {
    const page = await open(browser);
    await page.addInitScript(() => localStorage.setItem('aether-starforge-v1', JSON.stringify({ completed: 6, best: 0 })));
    await page.goto(`${base}/index.html?standalone=1&cartridge=starforge#voyage`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.locator(`[data-star-scenario="${index}"]`).click();
    const canvas = page.locator('.starforge-canvas'), box = await canvas.boundingBox();
    const slots = { mirror: 0, conductor: 2, splitter: 3, furnace: 4, capacitor: 5, regulator: 6, rail: 7 };
    const tools = ['mirror', 'conductor', ...(index >= 1 ? ['splitter'] : []), 'furnace', ...(index >= 2 ? ['capacitor'] : []), 'regulator', ...(index >= 3 ? ['rail'] : [])];
    for (const id of tools) {
      await page.locator(`[data-star-tool="${id}"]`).click();
      const angle = slots[id] * Math.PI / 4 - Math.PI / 2;
      await canvas.click({ position: { x: box.width * (450 + 182 * Math.cos(angle)) / 900, y: box.height * (280 + 182 * Math.sin(angle)) / 560 } });
    }
    assert.match(await page.locator('#starforge-guide-title').textContent(), /CIRCUIT ALIGNED/);
    await page.locator('[data-starforge="run"]').click();
    await page.clock.runFor(69000);
    assert.match(await page.locator('.cartridge-recap .eyebrow').textContent(), /RUN COMPLETE/, `contract ${index + 1} should be winnable`);
    await page.close();
  }
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html?standalone=1&cartridge=starforge#voyage`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.locator('[data-star-tool="mirror"]').click();
    const canvas = page.locator('.starforge-canvas'), box = await canvas.boundingBox();
    await canvas.click({ position: { x: box.width * .643, y: box.height * .27 } });
    assert.match(await page.locator('#starforge-guide-title').textContent(), /CHECK THE GATES/);
    await page.locator('[data-starforge="run"]').click();
    await page.clock.runFor(95000);
    assert.match(await page.locator('.cartridge-recap .eyebrow').textContent(), /RUN ENDED/, 'misaligned contract must fail without creating energy');
    await page.close();
  }
  {
    const page = await open(browser);
    await page.addInitScript(() => localStorage.setItem('aether-starforge-v1', JSON.stringify({ completed: 6, best: 0 })));
    await page.goto(`${base}/index.html?standalone=1&cartridge=starforge#voyage`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.locator('[data-star-scenario="1"]').click();
    const canvas = page.locator('.starforge-canvas'), box = await canvas.boundingBox();
    for (const [id, x, y] of [['mirror', .5, .175], ['conductor', .702, .5], ['splitter', .643, .73], ['furnace', .5, .825]]) {
      await page.locator(`[data-star-tool="${id}"]`).click();
      await canvas.click({ position: { x: box.width * x, y: box.height * y } });
    }
    await page.locator('[data-starforge="run"]').click();
    await page.clock.runFor(1200);
    assert.ok(Number(await canvas.getAttribute('data-heat')) > 0, 'the first forge pulse must create heat');
    await page.locator('[data-starforge="run"]').click();
    const time = await page.locator('#starforge-time').textContent();
    const energy = await canvas.getAttribute('data-energy');
    await page.clock.runFor(3000);
    assert.equal(await page.locator('#starforge-time').textContent(), time, 'manual pause freezes the contract clock');
    assert.equal(await canvas.getAttribute('data-energy'), energy);
    const heated = Number(await canvas.getAttribute('data-heat'));
    await page.locator('[data-starforge="vent"]').click();
    assert.ok(Number(await canvas.getAttribute('data-heat')) < heated, 'one-use vent must lower heat');
    assert.ok(await page.locator('[data-starforge="vent"]').isDisabled());
    await page.locator('[data-starforge="run"]').click();
    await page.clock.runFor(60000);
    assert.match(await page.locator('.cartridge-recap .eyebrow').textContent(), /RUN COMPLETE/);
    await page.close();
  }

  // A clean, opt-in Labyrinth seal extraction: two keys, one seal, eastern
  // exit, all three hearts. The optional detour pays 600 above a direct route.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'depth-labyrinth'; document.body.append(host);
      window.__labEnd = [];
      window.__lab = AetherTrials.create('labyrinth', host, { sound: false, endless: true, onEnd: result => window.__labEnd.push(result) });
    });
    const canvas = page.locator('#depth-labyrinth canvas');
    await page.waitForFunction(() => document.querySelector('#depth-labyrinth canvas')?.dataset.roomTransition === '0.00');
    await canvas.focus();
    const move = async (key, axis, op, limit) => {
      await page.keyboard.down(key);
      try { await page.waitForFunction(({ axis, op, limit }) => {
        const value = Number(document.querySelector('#depth-labyrinth canvas')?.dataset[axis]);
        return op === '>=' ? value >= limit : value <= limit;
      }, { axis, op, limit }, { timeout: 6500 }); }
      finally { await page.keyboard.up(key); }
    };
    await move('w', 'playerY', '<=', 177); await move('d', 'playerX', '>=', 237);
    assert.equal(await canvas.getAttribute('data-keys-found'), '1');
    await move('s', 'playerY', '>=', 282); await move('d', 'playerX', '>=', 427);
    await move('s', 'playerY', '>=', 323);
    assert.equal(await canvas.getAttribute('data-seal'), 'collected');
    await move('d', 'playerX', '>=', 503); await move('s', 'playerY', '>=', 363);
    assert.equal(await canvas.getAttribute('data-keys-found'), '2');
    await move('d', 'playerX', '>=', 555); await canvas.press(' ');
    await move('d', 'playerX', '>=', 580); await move('s', 'playerY', '>=', 402);
    await move('d', 'playerX', '>=', 740);
    await page.keyboard.down('w');
    try { await page.waitForFunction(() => document.querySelector('#depth-labyrinth canvas')?.dataset.chamber === '2', null, { timeout: 6500 }); }
    finally { await page.keyboard.up('w'); }
    assert.equal(await canvas.getAttribute('data-score'), '1550', 'a clean seal extraction must award both seal bonuses');
    assert.equal(await canvas.getAttribute('data-hearts'), '3');
    await page.evaluate(() => window.__lab.destroy());
    assert.equal(await page.locator('#depth-labyrinth canvas, #depth-labyrinth .labyrinth-abilities').count(), 0, 'destroy must remove both canvas and ability buttons');
    assert.deepEqual(await page.evaluate(() => window.__labEnd), []);
    await page.close();
  }

  for (const choice of ['guard', 'power']) {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'depth-shooter'; document.body.append(host);
      window.__shooterEnd = [];
      window.__shooter = AetherSkirmish.create(host, { sector: 1, elite: true, endless: true, hull: 'kite', instruments: [], seed: 6024, difficulty: 'standard', sound: false, onEnd: result => window.__shooterEnd.push(result) });
    });
    const canvas = page.locator('#depth-shooter canvas'); await canvas.focus();
    await page.keyboard.down('j');
    for (let attempt = 0; attempt < 30 && await canvas.getAttribute('data-phase') !== 'draft'; attempt++) await page.clock.runFor(1000);
    await page.keyboard.up('j');
    assert.equal(await canvas.getAttribute('data-phase'), 'draft', 'seeded first wave must reach a safe refit');
    const hp = Number(await canvas.getAttribute('data-hp'));
    await page.clock.runFor(3000);
    assert.equal(Number(await canvas.getAttribute('data-hp')), hp, 'a refit must not leave live hazards damaging the ship');
    await page.evaluate(() => window.__shooter.pause());
    assert.ok(await page.locator(`[data-skirmish-refit="${choice}"]`).isDisabled(), 'refit actions must be disabled behind pause');
    await page.clock.runFor(1000);
    await page.evaluate(() => window.__shooter.resume());
    assert.ok(await page.locator(`[data-skirmish-refit="${choice}"]`).isEnabled());
    await page.locator(`[data-skirmish-refit="${choice}"]`).click();
    await page.clock.runFor(1000);
    assert.equal(await canvas.getAttribute('data-refit'), choice);
    if (choice === 'guard') assert.ok(Number(await canvas.getAttribute('data-hp')) > hp, 'Reinforce restores plating');
    await canvas.focus(); await page.keyboard.down('j');
    await page.clock.runFor(5000); await page.keyboard.up('j');
    assert.ok(Number(await canvas.getAttribute('data-wave')) >= 2, 'refit must advance to wave two');
    if (choice === 'guard') {
      await page.clock.runFor(25000);
      const results = await page.evaluate(() => window.__shooterEnd);
      assert.equal(results.length, 1, 'a lost run must report one final score');
      assert.equal(results[0].won, false);
      assert.ok(results[0].score > 0);
      await page.clock.runFor(3000);
      assert.equal((await page.evaluate(() => window.__shooterEnd)).length, 1);
    } else {
      await page.evaluate(() => window.__shooter.destroy());
      assert.deepEqual(await page.evaluate(() => window.__shooterEnd), [], 'destroy must not send a late loss callback');
    }
    assert.equal(await page.locator('#depth-shooter canvas, #depth-shooter .skirmish-draft').count(), 0);
    await page.close();
  }

  // Mixed-tower siege through the first titan and beyond; no-build failure and
  // exactly one terminal callback. Virtual time advances the real game loop.
  for (const defended of [true, false]) {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'depth-bastion'; document.body.append(host);
      window.__bastionEnd = [];
      window.__bastion = AetherTrials.create('bastion', host, { sound: false, seed: 6024, endless: true, onEnd: result => window.__bastionEnd.push(result) });
    });
    const canvas = page.locator('#depth-bastion canvas');
    if (defended) {
      const box = await canvas.boundingBox();
      const build = async (type, row, col) => {
        await canvas.press(String(type));
        await canvas.click({ position: { x: box.width * (180 + 92 * col) / 900, y: box.height * (151 + 68 * row) / 560 } });
      };
      await build(3, 2, 3); await build(1, 0, 2);
      const additions = { 2: [2, 1, 2], 3: [1, 3, 2], 4: [1, 4, 2], 5: [4, 2, 6], 7: [1, 1, 3] };
      let ordersIssued = 0, repairs = 0, expectedTitanLane = 0;
      for (let period = 0; period < 32; period++) {
        await page.clock.runFor(5000);
        if (!await canvas.count()) break;
        if (additions[period] && await canvas.getAttribute('data-planning') !== 'true') await build(...additions[period]);
        if (await canvas.getAttribute('data-planning') === 'true') {
          await page.clock.runFor(200);
          const nextWave = Number(await canvas.getAttribute('data-wave')) + 1;
          const focusLane = Number(await canvas.getAttribute('data-focus-lane'));
          assert.ok(focusLane >= 1 && focusLane <= 5);
          assert.match(await page.locator('[data-bastion-forecast]').textContent(), new RegExp(`LANE ${focusLane}`));
          const alloy = Number(await canvas.getAttribute('data-alloy'));
          const core = Number(await canvas.getAttribute('data-core'));
          const survived = Number(await canvas.getAttribute('data-survived'));
          assert.equal(await page.locator('[data-bastion-order="repair"]').isDisabled(), core === 8 || alloy < 120);
          if (core === 8) assert.match(await page.locator('[data-bastion-order="repair"]').textContent(), /Core full/);
          await page.clock.runFor(4000);
          assert.equal(await canvas.getAttribute('data-wave'), String(nextWave - 1), 'forecast must freeze the wave clock');
          assert.equal(Number(await canvas.getAttribute('data-survived')), survived, 'planning must not reset or advance survival time');
          if (nextWave === 2) {
            await page.evaluate(() => window.__bastion.pause());
            assert.ok(await page.locator('[data-bastion-order="save"]').isDisabled(), 'pausing must block planning actions');
            await canvas.press('p');
            await page.clock.runFor(200);
            assert.ok(await page.locator('[data-bastion-order="save"]').isEnabled());
          }
          if (nextWave === 4) {
            expectedTitanLane = focusLane;
            await build(3, focusLane - 1, 3);
            await canvas.press('q');
            await build(3, focusLane - 1, 4);
            await canvas.press('q');
            assert.equal(await canvas.getAttribute('data-planning'), 'true', 'construction cannot launch the wave');
          }
          const order = ordersIssued === 0 ? 'overdrive' : nextWave === 4 && core < 8 ? 'repair' : 'save';
          if (order === 'save') await canvas.press('c');
          else await page.locator(`[data-bastion-order="${order}"]`).click();
          await page.clock.runFor(200);
          assert.equal(await canvas.getAttribute('data-wave'), String(nextWave), 'one click launches exactly one new wave');
          assert.ok(Number(await canvas.getAttribute('data-survived')) >= survived, 'survival time must never move backwards');
           assert.equal(await page.locator('[data-bastion-forecast]').isHidden(), true);
          if (order === 'overdrive' && nextWave !== 4) {
            assert.equal(await canvas.getAttribute('data-alloy'), String(alloy - 120));
            assert.equal(await canvas.getAttribute('data-overdrive'), '1');
          }
          if (order === 'repair') {
            assert.equal(await canvas.getAttribute('data-core'), String(core + 1));
            repairs++;
          }
          ordersIssued++;
        }
      }
      assert.equal(await canvas.count(), 1, `defended siege ended after ${ordersIssued} orders: ${JSON.stringify(await page.evaluate(() => window.__bastionEnd))}`);
      assert.ok(ordersIssued >= 3, 'surviving defenders must reach several player-launched sieges');
      assert.ok(repairs >= 1, 'a damaged core must be repairable between sieges');
      assert.equal(await canvas.getAttribute('data-titan-lane'), String(expectedTitanLane), 'forecast titan must arrive in its announced lane');
      assert.ok(Number(await canvas.getAttribute('data-wave')) >= 5);
      assert.ok(Number(await canvas.getAttribute('data-prism-shots')) >= 25, 'a sustained siege must actually exercise Prism damage');
      assert.ok(Number(await canvas.getAttribute('data-core')) > 0);
      await page.evaluate(() => window.__bastion.destroy());
      assert.deepEqual(await page.evaluate(() => window.__bastionEnd), []);
    } else {
      await page.clock.runFor(50000);
      assert.equal(await canvas.count(), 0);
      assert.equal((await page.evaluate(() => window.__bastionEnd)).length, 1);
      assert.equal((await page.evaluate(() => window.__bastionEnd))[0].won, false);
      await page.clock.runFor(5000);
      assert.equal((await page.evaluate(() => window.__bastionEnd)).length, 1, 'defeat must not call onEnd twice');
    }
    await page.close();
  }

   // The authored Bastion campaign starts in a safe planning phase. The
   // dedicated bastion-campaign suite drives all six waves to a full win.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'mission-bastion'; document.body.append(host);
      window.__missionEnd = [];
      window.__mission = AetherTrials.create('bastion', host, { sound: false, seed: 6024, onEnd: result => window.__missionEnd.push(result) });
    });
     const canvas = page.locator('#mission-bastion canvas');
     assert.equal(await canvas.getAttribute('data-planning'), 'true');
     assert.match(await page.locator('[data-bastion-manifest]').textContent(), /Lane 2: 4 scout/);
     const before = await canvas.getAttribute('data-survived');
     await page.clock.runFor(8000);
     assert.equal(await canvas.getAttribute('data-survived'), before, 'planning must not advance survival time');
     await page.locator('[data-bastion-order="save"]').click();
     await page.clock.runFor(1500);
     assert.equal(await canvas.getAttribute('data-planning'), 'false', 'order launches the forecast wave');
     assert.ok(Number(await canvas.getAttribute('data-scheduled')) < 8, 'the authored schedule advances');
     await page.evaluate(() => window.__mission.destroy());
     assert.deepEqual(await page.evaluate(() => window.__missionEnd), [], 'destroy during campaign must not resolve a stale win or loss');
    await page.close();
  }

  // If the stealth mission expires, it reports one defeat and cleans up every
  // owned control, not merely the canvas.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'mission-labyrinth'; document.body.append(host);
      window.__missionLabEnd = [];
      window.__missionLab = AetherTrials.create('labyrinth', host, { sound: false, onEnd: result => window.__missionLabEnd.push(result) });
    });
    await page.clock.runFor(320000);
    assert.deepEqual(await page.evaluate(() => window.__missionLabEnd), [{ won: false, score: 0 }]);
    assert.equal(await page.locator('#mission-labyrinth canvas, #mission-labyrinth .labyrinth-abilities').count(), 0);
    await page.close();
  }

  // Reduced-motion play surfaces retain their objective and controls on phone,
  // tablet and desktop widths. This is a layout/browser check, not a device lab.
   for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
     for (const id of ['shooter', 'bastion', 'labyrinth', 'starforge', 'chain']) {
      await page.goto(`${base}/index.html?standalone=1&cartridge=${id}#voyage`, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id} must fit a ${width}px viewport`);
      assert.equal(await page.locator('.cartridge-stage canvas').count(), 1, `${id} must mount under reduced motion`);
    }
    await page.close();
  }

  assert.deepEqual(errors, [], `page errors during depth checks: ${errors.join('\n')}`);
  await browser.close();
   console.log('Cartridge depth passed: all 6 Starforge contracts, misalignment, pause and vent; clean Labyrinth seal extraction, timeout and teardown; both Skirmish refits, defeat and safe intermission; Bastion siege forecasts/orders, campaign planning/launch and defeat; all 5 cartridges at 390/768/1440px under reduced motion.');
} finally {
  server.kill('SIGTERM');
  await once(server, 'exit').catch(() => {});
}
