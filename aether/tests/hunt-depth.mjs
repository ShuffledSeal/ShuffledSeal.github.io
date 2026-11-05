// Starship Hunts depth: the four-weapon armory (measurable behaviour per weapon),
// lance charge gating, blur/pause safety mid-charge, scheduled breach packets,
// authored three-act campaign with between-act drafts, and full teardown.
//
// AUTHORED BUT UNRUN — this environment has no node/npm, so nothing here has
// executed. Written in the style of tests/cartridge-depth.mjs; run with
// Playwright installed (dev-only): node tests/hunt-depth.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

// A distinct local port lets hunt-depth run beside the other suites.
const port = 4600 + process.pid % 20000, base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: new URL('..', import.meta.url), stdio: 'ignore' });
const errors = [];
const open = async browser => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  return page;
};
const mountSkirmish = (page, id, options) => page.evaluate(([hostId, opts]) => {
  const host = document.createElement('div'); host.id = hostId; document.body.append(host);
  window.__end = window.__end || {};
  window.__end[hostId] = [];
  window.__hunts = window.__hunts || {};
  window.__hunts[hostId] = window.AetherSkirmish.create(host, { ...opts, sound: false, onEnd: result => window.__end[hostId].push(result) });
}, [id, options]);
const endResults = (page, id) => page.evaluate(hostId => window.__end[hostId], id);
const destroyHunt = (page, id) => page.evaluate(hostId => window.__hunts[hostId].destroy(), id);

try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(`${base}/index.html`)).ok) break; } catch {}
    if (attempt === 39) throw new Error('Local Æther test server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const browser = await chromium.launch({ headless: true });

  // ── Armory: switching weapons measurably changes the volley ──────────────
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    await mountSkirmish(page, 'hunt-armory', { sector: 1, elite: true, endless: true, hull: 'kite', instruments: [], seed: 6024, difficulty: 'standard' });
    const canvas = page.locator('#hunt-armory canvas');
    await canvas.focus();
    await page.clock.runFor(500);
    assert.equal(await canvas.getAttribute('data-weapon'), 'pulse', 'a fresh hunt opens on the Pulse');
    assert.equal(await page.locator('#hunt-armory [data-skirmish-weapon="pulse"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#hunt-armory .skirmish-armory span').textContent(), /Pulse — 700 range/);

    // Keyboard switch: scatter's fan, speed and damage must all be visible.
    await page.keyboard.press('2');
    await page.clock.runFor(400);
    assert.equal(await canvas.getAttribute('data-weapon'), 'scatter');
    assert.equal(await canvas.getAttribute('data-weapon-speed'), '470');
    assert.equal(await canvas.getAttribute('data-weapon-damage'), '5.4', 'scatter pellets carry 54% of the hull bolt');
    assert.equal(await page.locator('#hunt-armory [data-skirmish-weapon="scatter"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#hunt-armory [data-skirmish-weapon="pulse"]').getAttribute('aria-pressed'), 'false');
    assert.match(await page.locator('#hunt-armory .skirmish-armory span').textContent(), /five-pellet/);
    assert.equal(await page.evaluate(() => localStorage.getItem('aether-hunt-weapon')), 'scatter', 'the sidearm choice persists');

    // A scatter volley puts five pellets in flight at once.
    await page.keyboard.down('j');
    let sawFan = false;
    for (let i = 0; i < 40 && !sawFan; i++) {
      await page.clock.runFor(200);
      if (Number(await canvas.getAttribute('data-bolts-live')) >= 5) sawFan = true;
    }
    await page.keyboard.up('j');
    assert.ok(sawFan, 'scatter must loose a five-pellet fan per trigger pull');

    // Button switch back to pulse: same sync path as the keyboard.
    await page.locator('#hunt-armory [data-skirmish-weapon="pulse"]').click();
    await page.clock.runFor(400);
    assert.equal(await canvas.getAttribute('data-weapon'), 'pulse');
    assert.equal(await canvas.getAttribute('data-weapon-speed'), '540');
    assert.equal(await canvas.getAttribute('data-weapon-damage'), '10');
    assert.match(await page.locator('#hunt-armory .skirmish-armory span').textContent(), /Pulse — 700 range/);

    // ── Lance: the charge gates the shot, and blur mid-charge cannot stick ──
    await page.keyboard.press('3');
    await page.clock.runFor(900); // let any inherited recovery lapse
    assert.equal(await canvas.getAttribute('data-weapon'), 'lance');
    assert.equal(await canvas.getAttribute('data-weapon-damage'), '34');
    const firedBeforeCharge = Number(await canvas.getAttribute('data-bolts-fired'));
    await page.keyboard.down('j');
    await page.clock.runFor(280);
    const midCharge = Number(await canvas.getAttribute('data-charge'));
    assert.ok(midCharge > 0 && midCharge < .45, `the lance holds a visible partial charge (got ${midCharge})`);
    assert.equal(Number(await canvas.getAttribute('data-bolts-fired')), firedBeforeCharge, 'no bolt leaves before the charge completes');
    await page.clock.runFor(700);
    assert.ok(Number(await canvas.getAttribute('data-bolts-fired')) > firedBeforeCharge, 'a full charge releases the lance');
    await page.keyboard.up('j');

    // Blur while charging pauses the hunt; nothing fires after resume without input.
    await page.keyboard.down('j');
    await page.clock.runFor(200);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.clock.runFor(300);
    assert.equal(await canvas.getAttribute('data-paused'), 'true', 'blur must park the hunt');
    await page.keyboard.up('j');
    await page.evaluate(() => window.__hunts['hunt-armory'].resume());
    await page.clock.runFor(300);
    const firedAtResume = Number(await canvas.getAttribute('data-bolts-fired'));
    await page.clock.runFor(1500);
    assert.equal(Number(await canvas.getAttribute('data-bolts-fired')), firedAtResume, 'a blurred lance charge must not stick firing after resume');

    // ── Mortar identity, then the endless breather keeps guard/power first ──
    await page.keyboard.press('4');
    await page.clock.runFor(400);
    assert.equal(await canvas.getAttribute('data-weapon'), 'mortar');
    assert.equal(await canvas.getAttribute('data-weapon-speed'), '420');
    assert.equal(await canvas.getAttribute('data-weapon-damage'), '32');
    await page.keyboard.press('1');
    await canvas.focus();
    await page.keyboard.down('j');
    for (let i = 0; i < 40 && (await canvas.getAttribute('data-phase')) !== 'draft'; i++) await page.clock.runFor(1000);
    await page.keyboard.up('j');
    assert.equal(await canvas.getAttribute('data-phase'), 'draft', 'the seeded endless wave must reach a breather');
    const endlessChoices = (await canvas.getAttribute('data-draft')).split(',');
    assert.deepEqual(endlessChoices.slice(0, 2), ['guard', 'power'], 'endless refits still open with Reinforce / Overclock');
    assert.ok(endlessChoices.length >= 4, 'field instruments join the endless draft');
    // A drafted field instrument becomes the active refit (its verbs join the build).
    const instrumentPick = endlessChoices[2];
    await page.locator(`#hunt-armory [data-skirmish-refit="${instrumentPick}"]`).click();
    await page.clock.runFor(400);
    assert.equal(await canvas.getAttribute('data-refit'), instrumentPick, 'a drafted field instrument applies as the refit');
    await destroyHunt(page, 'hunt-armory');
    assert.equal(await page.locator('#hunt-armory canvas, #hunt-armory .skirmish-armory, #hunt-armory [data-skirmish-objective], #hunt-armory .skirmish-draft').count(), 0, 'destroy removes canvas, armory, mission line and breather');
    await page.clock.runFor(4000);
    assert.deepEqual(await endResults(page, 'hunt-armory'), [], 'destroy must not send a late callback');
    await page.close();
  }

  // ── Authored campaign: packets respect pause; drafts gate the acts ────────
  {
    const page = await open(browser);
    await page.goto(`${base}/index.html#overview`, { waitUntil: 'networkidle' });
    await page.clock.install();
    // The exact voyage campaign mount shape, but on the durable Bell hull so the
    // scripted pilot can plausibly survive three acts.
    await mountSkirmish(page, 'hunt-campaign', { sector: 1, elite: true, endless: false, hull: 'bell', instruments: [], seed: 6024, difficulty: 'standard' });
    const canvas = page.locator('#hunt-campaign canvas');
    await canvas.focus();
    await page.clock.runFor(700);
    assert.equal(await canvas.getAttribute('data-mode'), 'mission');
    assert.equal(await canvas.getAttribute('data-act'), '1');
    assert.match(await page.locator('#hunt-campaign [data-skirmish-objective]').textContent(), /Act 1 of 3 · Break the screen/);

    // Act one schedules a second packet: breach warnings tick down, then pause freezes them.
    await page.clock.runFor(2000); // intro (1.6s) + first packet in flight
    assert.ok(Number(await canvas.getAttribute('data-pending')) > 0, 'act one must schedule its second packet');
    await page.evaluate(() => window.__hunts['hunt-campaign'].pause());
    const frozenPending = await canvas.getAttribute('data-pending');
    await page.clock.runFor(6000);
    assert.equal(await canvas.getAttribute('data-pending'), frozenPending, 'pause must freeze scheduled breach packets');
    await page.evaluate(() => window.__hunts['hunt-campaign'].resume());

    // Scripted pilot: weave a slow square, hold fire, dash occasionally, take
    // guard/power at the drafts. (Bot balance is unverified without a browser;
    // tune the weave here first if this fails when finally run.)
    const weave = ['w', 'd', 's', 'a'];
    let drafts = 0, instrumentSeen = '';
    for (let t = 0; t < 120 && (await canvas.count()); t++) {
      const phase = await canvas.getAttribute('data-phase');
      if (phase === 'draft') {
        drafts++;
        const choices = (await canvas.getAttribute('data-draft')).split(',').filter(Boolean);
        assert.ok(choices.length >= 4, 'each campaign draft offers two refits and two field instruments');
        if (drafts === 1) {
          assert.ok(choices.includes('pursuit'), 'the act-one draft offers the pursuit signal');
          assert.match(await page.locator('#hunt-campaign [data-skirmish-objective]').textContent(), /Act 1 cleared · next: Crossfire/);
          instrumentSeen = choices.find(id => !['guard', 'pursuit', 'power', 'shelter'].includes(id));
        }
        if (drafts === 2) {
          assert.ok(choices.includes('shelter') || choices.includes('power'), 'the act-two draft offers shelter or overclock');
          assert.ok(!choices.includes(instrumentSeen), 'drafted instruments leave the pool for the rest of the hunt');
        }
        // Draft the field instrument first (proves instruments apply mid-campaign),
        // then take Overclock into the finale.
        const pick = drafts === 1 && instrumentSeen ? instrumentSeen : choices.includes('power') ? 'power' : choices[0];
        await page.locator(`#hunt-campaign [data-skirmish-refit="${pick}"]`).click();
        await page.clock.runFor(400);
        assert.equal(await canvas.getAttribute('data-refit'), pick, 'the chosen refit applies');
        continue;
      }
      await page.keyboard.down('j');
      const key = weave[t % 4];
      await page.keyboard.down(key);
      await page.clock.runFor(3000);
      await page.keyboard.up(key);
      if (t % 4 === 3 && (await canvas.count())) await canvas.press(' ');
    }
    await page.keyboard.up('j');
    const results = await endResults(page, 'hunt-campaign');
    assert.equal(results.length, 1, 'a finite hunt must report exactly one ending');
    assert.equal(results[0].won, true, 'the scripted Bell pilot must clear all three acts');
    assert.ok(results[0].kills > 0 && results[0].score > 0);
    assert.equal(drafts, 2, 'a breather follows acts one and two, never the finale');
    assert.equal(await canvas.count(), 0, 'a finished hunt removes its canvas');
    assert.equal(await page.locator('#hunt-campaign .skirmish-armory, #hunt-campaign [data-skirmish-objective], #hunt-campaign .skirmish-draft').count(), 0, 'a finished hunt removes its armory, mission line and breather');
    await page.close();
  }

  assert.deepEqual(errors, [], `page errors during hunt depth checks: ${errors.join('\n')}`);
  await browser.close();
  console.log('Hunt depth passed: armory switching (keys + buttons, aria-pressed, help, persistence), scatter fan, lance charge gating, blur/pause charge safety, mortar identity, endless guard/power draft plus field instruments, scheduled packets frozen by pause, and a scripted three-act campaign win with clean teardown.');
} finally {
  server.kill('SIGTERM');
  await once(server, 'exit').catch(() => {});
}
