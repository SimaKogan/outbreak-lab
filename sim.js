// OutbreakLab simulation core. Runs in the browser and in Node (for tests).
(function (root) {
  'use strict';
  const ST = { S: 0, I: 1, R: 2, V: 3, D: 4 }; // healthy, sick, recovered, vaccinated, deceased
  const DT = 0.1; // one step = 0.1 day

  function mulberry(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function Sim(params, seed) {
    this.p = Object.assign({
      n: 400, w: 640, h: 420, chance: 0.4, radius: 14, recovery: 12,
      mortality: 0.03, distancing: 0, vaccinated: 0, efficacy: 0.9, speed: 20, initial: 3
    }, params);
    this.seed = seed === undefined ? 1 : seed;
    this.reset();
  }

  Sim.prototype.reset = function () {
    const p = this.p, r = (this.rand = mulberry(this.seed));
    this.k = 0; this.peak = 0; this.history = []; this.people = [];
    for (let i = 0; i < p.n; i++) {
      this.people.push({ x: r() * p.w, y: r() * p.h, a: r() * 6.283, st: r() < p.vaccinated ? ST.V : ST.S, age: 0 });
    }
    this.seedInfection(p.initial);
    this.record();
  };

  Sim.prototype.infect = function (q) {
    if (q.st === ST.S || q.st === ST.V) { q.st = ST.I; q.age = 0; return true; }
    return false;
  };

  Sim.prototype.seedInfection = function (count) {
    let guard = 0;
    while (count > 0 && guard++ < 5000) {
      if (this.infect(this.people[(this.rand() * this.people.length) | 0])) count--;
    }
  };

  Sim.prototype.step = function () {
    const p = this.p, r = this.rand, P = this.people;
    const move = p.speed * (1 - p.distancing) * DT;
    const pt = 1 - Math.pow(1 - p.chance, DT); // per-step transmission chance
    const R2 = p.radius * p.radius, hit = [];
    for (const q of P) {
      if (q.st === ST.D) continue;
      q.a += (r() - 0.5) * 0.8;
      q.x += Math.cos(q.a) * move; q.y += Math.sin(q.a) * move;
      if (q.x < 0 || q.x > p.w) { q.a = Math.PI - q.a; q.x = Math.min(p.w, Math.max(0, q.x)); }
      if (q.y < 0 || q.y > p.h) { q.a = -q.a; q.y = Math.min(p.h, Math.max(0, q.y)); }
    }
    for (const a of P) {
      if (a.st !== ST.I) continue;
      for (const b of P) {
        if (b.st !== ST.S && b.st !== ST.V) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy > R2) continue;
        if (r() < (b.st === ST.V ? pt * (1 - p.efficacy) : pt)) hit.push(b);
      }
    }
    for (const b of hit) this.infect(b);
    for (const a of P) {
      if (a.st !== ST.I) continue;
      a.age += DT;
      if (a.age >= p.recovery) a.st = r() < p.mortality ? ST.D : ST.R;
    }
    if (++this.k % 5 === 0) this.record();
  };

  Sim.prototype.counts = function () {
    const c = [0, 0, 0, 0, 0];
    for (const q of this.people) c[q.st]++;
    return c;
  };

  Sim.prototype.record = function () {
    const c = this.counts();
    if (c[ST.I] > this.peak) this.peak = c[ST.I];
    this.history.push(c);
  };

  Sim.prototype.day = function () { return this.k * DT; };

  root.Sim = Sim; root.ST = ST;
  if (typeof module !== 'undefined') module.exports = { Sim, ST };
})(typeof window !== 'undefined' ? window : globalThis);
