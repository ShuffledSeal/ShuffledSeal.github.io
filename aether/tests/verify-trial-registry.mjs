import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = vm.createContext({
  console,
  Math,
  setTimeout,
  clearTimeout,
  matchMedia: () => ({ matches: false }),
  window: {},
});

for (const file of ['trials.js', 'trials-loom.js', 'trials-terminal.js', 'trials-action.js', 'trials-premium.js']) {
  vm.runInContext(readFileSync(resolve(root, file), 'utf8'), context, { filename: file });
}

const expected = [
  'flare', 'eclipse', 'asteroids', 'comet', 'deepfield', 'freereturn', 'lander', 'shepherd',
  'loom', 'alignment', 'terminal', 'occultation', 'chain', 'perihelion', 'bastion', 'labyrinth',
];
const trials = context.window.AetherTrials.list;
const ids = Array.from(trials, trial => trial.id);

assert.equal(trials.length, expected.length, 'every retained and upgraded trial should be available');
assert.deepEqual(ids, expected, 'trial scripts must register in their intended load order');
assert.equal(new Set(ids).size, expected.length, 'trial ids must stay unique');
assert.ok(trials.every(trial => trial.name && trial.place && trial.brief), 'each trial needs player-facing metadata');

console.log(`Verified ${trials.length} registered Grand Tour trials.`);
