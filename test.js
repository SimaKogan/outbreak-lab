const assert = require('assert');
const { Sim, ST } = require('./sim.js');
const run = (p, steps, seed) => { const s = new Sim(p, seed || 1); for (let i = 0; i < steps; i++) s.step(); return s; };
const ever = (c) => c[ST.I] + c[ST.R] + c[ST.D];
const tests = {
  'same seed gives the same outbreak': () =>
    assert.deepStrictEqual(run({}, 600, 7).counts(), run({}, 600, 7).counts()),
  'population is conserved': () => {
    const c = run({ n: 250 }, 1500).counts();
    assert.strictEqual(c.reduce((a, b) => a + b, 0), 250);
  },
  'no initial sick means no outbreak': () => {
    const c = run({ initial: 0 }, 800).counts();
    assert.strictEqual(c[ST.S], 400);
  },
  'an open crowd gets infected': () =>
    assert.ok(ever(run({ n: 300, chance: 0.6, radius: 20 }, 3000).counts()) > 150),
  'distancing slows the spread': () => {
    const open = ever(run({ distancing: 0 }, 1500).counts());
    const apart = ever(run({ distancing: 0.95 }, 1500).counts());
    assert.ok(apart < open, `apart=${apart} open=${open}`);
  },
  'a perfect vaccine stops the spread': () => {
    const c = run({ vaccinated: 1, efficacy: 1, initial: 3 }, 2500).counts();
    assert.strictEqual(ever(c), 3);
  },
  'zero fatality means nobody dies': () =>
    assert.strictEqual(run({ mortality: 0, chance: 0.6, radius: 20 }, 3000).counts()[ST.D], 0),
  'full fatality means nobody recovers': () =>
    assert.strictEqual(run({ mortality: 1, chance: 0.6, radius: 20 }, 3000).counts()[ST.R], 0),
  'the outbreak ends on its own': () =>
    assert.strictEqual(run({ n: 200 }, 6000).counts()[ST.I], 0)
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ' - ' + e.message); }
}
process.exit(failed ? 1 : 0);
