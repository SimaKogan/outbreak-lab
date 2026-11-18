(function () {
  'use strict';
  const { Sim, ST } = window;
  const $ = (s) => document.querySelector(s);
  const pct = (v) => Math.round(v * 100) + '%';
  const num = (v) => String(v);
  // key, label, min, max, step, default, formatter, restarts the world
  const DEFS = [
    ['n', 'People', 100, 800, 50, 400, num, true],
    ['chance', 'Spread per contact, per day', 0.05, 1, 0.05, 0.4, pct],
    ['radius', 'Contact radius (px)', 6, 30, 1, 14, num],
    ['recovery', 'Days sick', 3, 30, 1, 12, num],
    ['mortality', 'Fatality rate', 0, 0.2, 0.01, 0.03, pct],
    ['distancing', 'Social distancing', 0, 0.95, 0.05, 0, pct],
    ['vaccinated', 'Vaccinated at start', 0, 0.9, 0.05, 0, pct, true],
    ['efficacy', 'Vaccine efficacy', 0, 1, 0.05, 0.9, pct],
    ['ticks', 'Simulation speed', 1, 10, 1, 3, num]
  ];
  const PRESETS = {
    'Open city': {},
    'Distancing': { distancing: 0.7 },
    'Lockdown': { distancing: 0.9 },
    'Vaccinated': { vaccinated: 0.7 }
  };
  const COL = ['#6ea8fe', '#ff5d6c', '#7bd389', '#c9b6ff', '#5b6670'];
  const NAMES = ['Healthy', 'Sick', 'Recovered', 'Vaccinated', 'Deceased'];
  const ORDER = [ST.I, ST.S, ST.V, ST.R, ST.D]; // chart stacking, bottom to top

  const world = $('#world'), wx = world.getContext('2d');
  const chart = $('#chart'), cx = chart.getContext('2d');
  const vals = {};
  DEFS.forEach((d) => (vals[d[0]] = d[5]));
  let sim, run = true;

  function reset() {
    sim = new Sim(Object.assign({}, vals, { w: world.width, h: world.height }), Date.now());
    run = true; syncPlay();
  }
  function syncPlay() { $('#play').textContent = run ? 'Pause' : 'Play'; }
  function setVal(k, v) {
    vals[k] = v;
    if (sim) sim.p[k] = v;
    $('#v-' + k).textContent = DEFS.find((d) => d[0] === k)[6](v);
  }

  DEFS.forEach(([k, label, min, max, step, def, fmt, restart]) => {
    const l = document.createElement('label');
    l.innerHTML = label + '<b id="v-' + k + '">' + fmt(def) + '</b>';
    const input = document.createElement('input');
    input.type = 'range';
    Object.assign(input, { min, max, step, value: def, id: 'in-' + k });
    input.oninput = () => setVal(k, +input.value);
    input.onchange = () => { if (restart) reset(); };
    $('#controls').append(l, input);
  });

  Object.entries(PRESETS).forEach(([name, o]) => {
    const b = document.createElement('button');
    b.textContent = name;
    b.onclick = () => {
      const m = Object.assign({ distancing: 0, vaccinated: 0 }, o);
      for (const k in m) { $('#in-' + k).value = m[k]; setVal(k, m[k]); }
      reset();
    };
    $('#presets').append(b);
  });

  $('#play').onclick = () => { run = !run; syncPlay(); };
  $('#reset').onclick = reset;
  $('#sick').onclick = () => { sim.seedInfection(5); run = true; syncPlay(); };
  world.addEventListener('click', (e) => {
    const r = world.getBoundingClientRect();
    const x = ((e.clientX - r.left) * world.width) / r.width;
    const y = ((e.clientY - r.top) * world.height) / r.height;
    let best = null, bd = 900;
    for (const q of sim.people) {
      const d = (q.x - x) ** 2 + (q.y - y) ** 2;
      if (q.st !== ST.D && d < bd) { bd = d; best = q; }
    }
    if (best && sim.infect(best)) { run = true; syncPlay(); }
  });

  function draw(c) {
    wx.clearRect(0, 0, world.width, world.height);
    wx.fillStyle = 'rgba(255,93,108,.07)';
    for (const q of sim.people) {
      if (q.st !== ST.I) continue;
      wx.beginPath(); wx.arc(q.x, q.y, sim.p.radius, 0, 6.283); wx.fill();
    }
    for (const q of sim.people) {
      wx.fillStyle = COL[q.st];
      wx.beginPath(); wx.arc(q.x, q.y, q.st === ST.D ? 2 : 3.2, 0, 6.283); wx.fill();
    }
    const h = sim.history, W = chart.width, H = chart.height;
    const stride = Math.max(1, Math.ceil(h.length / W)), bw = (stride * W) / h.length + 1;
    cx.clearRect(0, 0, W, H);
    for (let i = 0; i < h.length; i += stride) {
      let y = H;
      for (const idx of ORDER) {
        const hh = (h[i][idx] / sim.p.n) * H;
        y -= hh; cx.fillStyle = COL[idx];
        cx.fillRect((i * W) / h.length, y, bw, hh + 0.5);
      }
    }
    $('#stats').innerHTML =
      '<div>Day ' + Math.floor(sim.day()) + '</div>' +
      NAMES.map((n, i) => '<div><i style="background:' + COL[i] + '"></i>' + n + ' ' + c[i] + '</div>').join('') +
      '<div>Peak sick ' + sim.peak + '</div>';
    $('#note').textContent = c[ST.I] === 0
      ? 'Outbreak over. Press Reset, or add sick people to start another wave.'
      : 'Click anyone on the map to infect them.';
  }

  function frame() {
    if (run) for (let i = 0; i < vals.ticks; i++) sim.step();
    const c = sim.counts();
    if (run && c[ST.I] === 0) { run = false; syncPlay(); }
    draw(c);
    requestAnimationFrame(frame);
  }

  reset();
  frame();
})();
