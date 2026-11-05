// Glass Labyrinth roguelite layer: seeded course generation, relic drafts,
// encounter temperaments and teardown. Run with Playwright installed
// (dev-only): node tests/labyrinth-roguelite.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

// A distinct local port lets roguelite and depth checks run side by side.
const port = 6000 + process.pid % 20000, base = `http://127.0.0.1:${port}`;
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

  // The seeded course generator must produce connected, solvable rooms for
  // every seed/chamber/circuit: course() already validates walls while
  // building; here every key, seal, fragment and the eastern exit must sit on
  // a floor cell reachable from the (1,5) entrance.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    const report = await page.evaluate(() => {
      const AT = window.AetherTrials;
      if (!AT || typeof AT.labyrinthCourse !== 'function') return { missing: true };
      const COLS = 18, ROWS = 11, failures = [];
      let checked = 0, minPatrol = 99, encountersSeen = new Set();
      const reach = walls => {
        const seen = new Set(['1,5']), queue = [[1, 5]];
        for (let i = 0; i < queue.length; i++) {
          const [x, y] = queue[i];
          for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
            const key = `${nx},${ny}`;
            if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || walls[ny][nx] || seen.has(key)) continue;
            seen.add(key); queue.push([nx, ny]);
          }
        }
        return seen;
      };
      for (let seed = 1; seed <= 400; seed++) for (let chamber = 0; chamber < 4; chamber++) for (let cycles = 0; cycles < 4; cycles++) {
        const room = AT.labyrinthCourse(seed, chamber, cycles, false);
        const seen = reach(room.walls);
        const floor = room.walls.flat().filter(v => !v).length;
        if (seen.size !== floor) failures.push(`${seed}/${chamber}/${cycles} disconnected`);
        for (const [x, y] of [...room.keys, room.seal, ...room.bonus, [16, 5], [17, 5]])
          if (!seen.has(`${x},${y}`)) failures.push(`${seed}/${chamber}/${cycles} unreachable ${x},${y}`);
        for (const [x, y, a, b, axis] of room.patrol)
          for (let cell = a; cell <= b; cell++)
            if (room.walls[axis === 'v' ? cell : y][axis === 'v' ? x : cell]) failures.push(`${seed}/${chamber}/${cycles} patrol crosses a wall`);
        if (room.walls[5][17]) failures.push(`${seed}/${chamber}/${cycles} exit walled`);
        minPatrol = Math.min(minPatrol, room.patrol.length);
        encountersSeen.add(room.encounter);
        checked++;
      }
      // Determinism and the authored path used for onboarding/first circuit.
      const a = AT.labyrinthCourse(981, 0, 0, true), b = AT.labyrinthCourse(981, 0, 0, true);
      const same = JSON.stringify(a.walls) === JSON.stringify(b.walls) && JSON.stringify(a.patrol) === JSON.stringify(b.patrol);
      return { checked, failures: failures.slice(0, 6), count: failures.length, minPatrol, encounters: encountersSeen.size, same, authoredKeys: a.keys.length, authoredSeal: a.seal };
    });
    assert.ok(!report.missing, 'AetherTrials.labyrinthCourse must be exposed');
    assert.equal(report.count, 0, `generated rooms must stay connected and solvable: ${report.failures.join(' · ')}`);
    assert.ok(report.minPatrol >= 3, `every generated chamber needs at least three patrols (saw ${report.minPatrol})`);
    assert.equal(report.encounters, 4, 'generated rooms should sample all four encounter temperaments');
    assert.ok(report.same, 'course() must be deterministic for a given seed/chamber/circuit');
    assert.equal(report.authoredKeys, 2);
    assert.deepEqual(report.authoredSeal, [8, 6], 'authored chamber I keeps its exact seal position');
    await page.close();
  }

  // Campaign mode: chamber I stays authored for onboarding, a relic draft
  // opens after the escape, pausing disables the draft, and the chosen relic
  // measurably changes its mechanic for the rest of the run.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'rogue-lab'; document.body.append(host);
      window.__rogueEnd = [];
      window.__rogue = AetherTrials.create('labyrinth', host, { sound: false, onEnd: result => window.__rogueEnd.push(result) });
    });
    const canvas = page.locator('#rogue-lab canvas');
    await page.waitForFunction(() => document.querySelector('#rogue-lab canvas')?.dataset.roomTransition === '0.00');
    assert.equal(await canvas.getAttribute('data-generated'), 'authored', 'campaign chamber I stays authored');
    assert.equal(await canvas.getAttribute('data-course-seed'), '981:0:0');
    await canvas.focus();
    const move = async (key, axis, op, limit) => {
      await page.keyboard.down(key);
      try { await page.waitForFunction(({ axis, op, limit }) => {
        const value = Number(document.querySelector('#rogue-lab canvas')?.dataset[axis]);
        return op === '>=' ? value >= limit : value <= limit;
      }, { axis, op, limit }, { timeout: 6500 }); }
      finally { await page.keyboard.up(key); }
    };
    // The proven chamber-I route from the cartridge-depth seal extraction.
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
    try { await page.waitForFunction(() => document.querySelector('#rogue-lab canvas')?.dataset.draft === 'open', null, { timeout: 6500 }); }
    finally { await page.keyboard.up('w'); }

    // Draft state: accessible DOM, 2–3 offers, gameplay held behind it.
    const draftBar = page.locator('#rogue-lab .labyrinth-draft');
    assert.equal(await canvas.getAttribute('data-chamber'), '2');
    assert.equal(await canvas.getAttribute('data-generated'), 'authored', 'the next room is not built until the draft resolves');
    assert.ok(await draftBar.isVisible(), 'the relic draft must be visible between chambers');
    assert.equal(await draftBar.getAttribute('data-state'), 'open');
    const offers = await draftBar.locator('[data-labyrinth-relic]').all();
    assert.ok(offers.length >= 2 && offers.length <= 3, `a draft offers two or three relics (saw ${offers.length})`);
    const offeredIds = (await canvas.getAttribute('data-draft-choices')).split(',');
    assert.equal(offeredIds.length, offers.length);
    assert.equal(await canvas.getAttribute('data-veil-duration'), '2.80');
    assert.equal(await canvas.getAttribute('data-speed-factor'), '1.00');
    assert.equal(await canvas.getAttribute('data-key-value'), '250');
    assert.ok(await page.locator('#rogue-lab [data-labyrinth-action="veil"]').isDisabled(), 'abilities stay disabled during a draft');

    // The draft pauses safely: P disables the buttons, resuming re-enables.
    await page.keyboard.press('p');
    assert.equal(await canvas.getAttribute('data-paused'), 'true');
    for (const button of offers) assert.ok(await button.isDisabled(), 'draft buttons must be disabled while paused');
    await page.keyboard.press('p');
    await page.waitForFunction(() => !document.querySelector('#rogue-lab canvas')?.dataset.paused);
    await page.waitForFunction(() => {
      const buttons = [...document.querySelectorAll('#rogue-lab .labyrinth-draft [data-labyrinth-relic]')];
      return buttons.length > 0 && buttons.every(button => !button.disabled);
    });

    // Choose via the 1–3 keys and verify the relic's tradeoff goes live.
    const preferred = ['runner', 'veil', 'chime', 'gambit', 'mercy', 'siphon'];
    const choice = preferred.find(id => offeredIds.includes(id));
    const expected = { runner: ['speedFactor', '1.18'], veil: ['veilDuration', '4.60'], chime: ['decoyDuration', '6.80'], gambit: ['keyValue', '400'], mercy: ['keyValue', '150'], siphon: ['decoyDuration', '2.40'] }[choice];
    await canvas.focus();
    await page.keyboard.press(String(offeredIds.indexOf(choice) + 1));
    await page.waitForFunction(() => document.querySelector('#rogue-lab canvas')?.dataset.draft === 'closed');
    assert.equal(await canvas.getAttribute('data-relics'), choice, 'the drafted relic is held for the rest of the run');
    assert.equal(await canvas.getAttribute(`data-${expected[0].replace(/[A-Z]/g, c => '-' + c.toLowerCase())}`), expected[1], `the ${choice} relic must change its mechanic`);
    assert.equal(await canvas.getAttribute('data-generated'), 'generated', 'campaign chamber II comes from the seeded course generator');
    assert.equal(await canvas.getAttribute('data-course-seed'), '981:1:0');
    assert.ok(['IVORY WATCH', 'LANTERN VAULT', 'HUSHED GALLERY', 'ECHO ARCHIVE'].includes(await canvas.getAttribute('data-encounter')));
    assert.equal(await draftBar.getAttribute('data-state'), 'closed');
    assert.ok(!(await draftBar.isVisible()), 'the draft hides after a choice');
    await page.waitForFunction(() => document.querySelector('#rogue-lab canvas')?.dataset.roomTransition === '0.00');

    // destroy() mid-run leaves no stale DOM and never fires onEnd afterwards.
    await page.evaluate(() => window.__rogue.destroy());
    assert.equal(await page.locator('#rogue-lab canvas, #rogue-lab .labyrinth-abilities, #rogue-lab .labyrinth-draft').count(), 0, 'destroy must remove the canvas, ability bar and draft');
    await page.waitForTimeout(400);
    assert.deepEqual(await page.evaluate(() => window.__rogueEnd), [], 'onEnd must not fire after destroy');
    await page.close();
  }

  // Endless keeps its authored first circuit, and destroying a fresh run is
  // equally clean: the frame, ability bar and (hidden) draft all disappear.
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'rogue-mid'; document.body.append(host);
      window.__midEnd = [];
      window.__mid = AetherTrials.create('labyrinth', host, { sound: false, endless: true, onEnd: result => window.__midEnd.push(result) });
    });
    await page.waitForFunction(() => document.querySelector('#rogue-mid canvas')?.dataset.roomTransition === '0.00');
    assert.equal(await page.locator('#rogue-mid canvas').getAttribute('data-generated'), 'authored', 'endless keeps its authored first circuit');
    await page.evaluate(() => window.__mid.destroy());
    assert.equal(await page.locator('#rogue-mid canvas, #rogue-mid .labyrinth-abilities, #rogue-mid .labyrinth-draft').count(), 0);
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => window.__midEnd), []);
    await page.close();
  }

  assert.deepEqual(errors, [], `page errors during roguelite checks: ${errors.join('\n')}`);
  await browser.close();
  console.log(`Labyrinth roguelite passed: course generation connected/solvable across seeds, campaign relic draft after chamber I pauses safely and rewires its mechanic, destroy leaves no stale DOM or callbacks.`);
} finally {
  server.kill('SIGTERM');
  await once(server, 'exit').catch(() => {});
}
