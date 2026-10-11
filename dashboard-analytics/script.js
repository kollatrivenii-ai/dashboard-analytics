/* ---------- 1. Sample data (swap this section for your API) ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const SOURCES = [
  { name: 'Organic search', w: .38, color: 'var(--c1)' },
  { name: 'Direct',         w: .24, color: 'var(--c2)' },
  { name: 'Referral',       w: .14, color: 'var(--c3)' },
  { name: 'Social',         w: .12, color: 'var(--c4)' },
  { name: 'Email',          w: .07, color: 'var(--c5)' },
  { name: 'Paid',           w: .05, color: 'var(--c6)' }
];
const DEVICES = [
  { name: 'Mobile',  w: .54, color: 'var(--c1)' },
  { name: 'Desktop', w: .40, color: 'var(--c2)' },
  { name: 'Tablet',  w: .06, color: 'var(--c3)' }
];
const PAGES = [
  { path: '/',                       w: .22, time: 48,  bounce: .41 },
  { path: '/pricing',                w: .16, time: 92,  bounce: .33 },
  { path: '/features',               w: .13, time: 74,  bounce: .38 },
  { path: '/blog/getting-started',   w: .11, time: 182, bounce: .52 },
  { path: '/docs',                   w: .10, time: 214, bounce: .29 },
  { path: '/signup',                 w: .09, time: 66,  bounce: .24 },
  { path: '/blog/analytics-guide',   w: .08, time: 205, bounce: .57 },
  { path: '/contact',                w: .05, time: 41,  bounce: .46 }
];

function generateData(count) {
  const rand = mulberry32(20261011);
  const weekly = [0.80, 1.05, 1.10, 1.08, 1.04, 0.95, 0.78]; // Sun..Sat
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const split = (list, total) => {
    const raw = list.map(x => x.w * (0.85 + rand() * 0.3));
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map(r => Math.round(total * r / sum));
  };
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today); date.setDate(today.getDate() - (count - 1 - i));
    const trend = 1 + (i / count) * 0.18;
    const visitors = Math.round(1400 * weekly[date.getDay()] * trend * (0.92 + rand() * 0.16));
    const sessions = Math.round(visitors * (1.28 + rand() * 0.1));
    const orders = Math.round(sessions * (0.026 + rand() * 0.008));
    const revenue = Math.round(orders * (54 + rand() * 18));
    return {
      date, visitors, sessions, orders, revenue,
      src: split(SOURCES, visitors),
      dev: split(DEVICES, visitors),
      pages: PAGES.map(p => Math.round(visitors * 1.6 * p.w * (0.85 + rand() * 0.3)))
    };
  });
}
const DATA = generateData(180);

/* ---------- 2. Helpers ---------- */
const $ = s => document.querySelector(s);
const nf = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const fmt = {
  int: v => nf.format(Math.round(v)),
  usd: v => '$' + nf.format(Math.round(v)),
  usd2: v => '$' + v.toFixed(2),
  pct: v => (v * 100).toFixed(2) + '%',
  axisNum: v => compact.format(v),
  axisUsd: v => '$' + compact.format(v),
  axisPct: v => (v * 100).toFixed(1) + '%'
};
const fmtDate = (d, long) => d.toLocaleDateString('en-US', long ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' });
const total = slice => slice.reduce((t, d) => {
  t.visitors += d.visitors; t.sessions += d.sessions; t.orders += d.orders; t.revenue += d.revenue; return t;
}, { visitors: 0, sessions: 0, orders: 0, revenue: 0 });
const sumArr = (slice, key, len) => slice.reduce((acc, d) => acc.map((v, i) => v + d[key][i]), Array(len).fill(0));
const change = (c, p) => p ? (c - p) / p : 0;
const niceMax = max => {
  const p = Math.pow(10, Math.floor(Math.log10(max || 1)));
  const f = max / p;
  const steps = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
  return (steps.find(s => f <= s) || 10) * p;
};
function deltaHtml(c) {
  const up = c >= 0;
  return `<span class="delta ${up ? 'up' : 'down'}">${up ? '+' : '\u2212'}${Math.abs(c * 100).toFixed(1)}%</span>`;
}

/* ---------- 3. Metric definitions ---------- */
const METRICS = [
  { key: 'visitors', label: 'Visitors',        fn: o => o.visitors,                 f: fmt.int,  axis: fmt.axisNum },
  { key: 'sessions', label: 'Sessions',        fn: o => o.sessions,                 f: fmt.int,  axis: fmt.axisNum },
  { key: 'conv',     label: 'Conversion rate', fn: o => o.sessions ? o.orders / o.sessions : 0, f: fmt.pct, axis: fmt.axisPct },
  { key: 'revenue',  label: 'Revenue',         fn: o => o.revenue,                  f: fmt.usd,  axis: fmt.axisUsd },
  { key: 'aov',      label: 'Avg. order value',fn: o => o.orders ? o.revenue / o.orders : 0,   f: fmt.usd2, axis: fmt.axisUsd }
];

/* ---------- 4. State ---------- */
const state = { range: 30, metric: 'visitors', sort: { key: 'views', dir: -1 }, q: '' };
let cur, prev;

function slices() {
  const n = state.range;
  cur = DATA.slice(-n);
  prev = DATA.slice(-2 * n, -n);
}

/* ---------- 5. Renderers ---------- */
function renderHeader() {
  const a = cur[0].date, b = cur[cur.length - 1].date;
  $('#rangeText').textContent = `${fmtDate(a)} to ${fmtDate(b)}, compared with the previous ${state.range} days`;
}

function renderKpis() {
  const c = total(cur), p = total(prev);
  $('#kpis').innerHTML = METRICS.map(m => `
    <button class="kpi" data-metric="${m.key}" aria-pressed="${m.key === state.metric}">
      <div class="label">${m.label}</div>
      <div class="value">${m.f(m.fn(c))}</div>
      ${deltaHtml(change(m.fn(c), m.fn(p)))}
    </button>`).join('');
}

function renderChart() {
  const m = METRICS.find(x => x.key === state.metric);
  $('#chartTitle').textContent = m.label;
  const host = $('#chart');
  const w = Math.max(host.clientWidth - 20, 280), h = w < 520 ? 240 : 300;
  const L = w < 520 ? 44 : 56, R = 10, T = 14, B = 28;
  const iw = w - L - R, ih = h - T - B;
  const cv = cur.map(m.fn), pv = prev.map(m.fn);
  const n = cv.length;
  const top = niceMax(Math.max(...cv, ...pv));
  const x = i => L + (n > 1 ? (i / (n - 1)) * iw : iw / 2);
  const y = v => T + ih - (v / top) * ih;
  const line = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  let grid = '';
  for (let k = 0; k <= 4; k++) {
    const v = (top * k) / 4, yy = y(v);
    grid += `<line x1="${L}" x2="${w - R}" y1="${yy}" y2="${yy}" stroke="var(--line)"/>` +
            `<text x="${L - 8}" y="${yy + 4}" text-anchor="end" font-size="12" fill="var(--muted)">${m.axis(v)}</text>`;
  }
  const count = w < 520 ? 4 : 7;
  let xl = '';
  for (let k = 0; k < count; k++) {
    const i = Math.round((k / (count - 1)) * (n - 1));
    const anchor = k === 0 ? 'start' : k === count - 1 ? 'end' : 'middle';
    xl += `<text x="${x(i)}" y="${h - 8}" text-anchor="${anchor}" font-size="12" fill="var(--muted)">${fmtDate(cur[i].date)}</text>`;
  }
  const area = `${line(cv)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;

  host.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${m.label} per day, this period versus the previous period">
      ${grid}${xl}
      <path d="${area}" fill="var(--accent-soft)"/>
      <path d="${line(pv)}" fill="none" stroke="var(--prev)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>
      <path d="${line(cv)}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <g id="hv" style="display:none">
        <line id="hvLine" y1="${T}" y2="${T + ih}" stroke="var(--muted)" stroke-dasharray="3 3"/>
        <circle id="hvPrev" r="4" fill="var(--panel)" stroke="var(--prev)" stroke-width="2"/>
        <circle id="hvCur" r="5" fill="var(--panel)" stroke="var(--accent)" stroke-width="3"/>
      </g>
      <rect id="hit" x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent"/>
    </svg>
    <div class="tip" id="tip"></div>`;

  const svg = host.querySelector('svg'), tip = $('#tip'), hv = $('#hv');
  const move = e => {
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) * (w / r.width);
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - L) / iw) * (n - 1))));
    hv.style.display = '';
    $('#hvLine').setAttribute('x1', x(i)); $('#hvLine').setAttribute('x2', x(i));
    $('#hvCur').setAttribute('cx', x(i)); $('#hvCur').setAttribute('cy', y(cv[i]));
    $('#hvPrev').setAttribute('cx', x(i)); $('#hvPrev').setAttribute('cy', y(pv[i]));
    tip.innerHTML = `<small>${fmtDate(cur[i].date, true)}</small><b>${m.f(cv[i])}</b>` +
      `<small>${fmtDate(prev[i].date)}: ${m.f(pv[i])}</small>`;
    const scale = r.width / w;
    const tx = x(i) * scale + 10;
    tip.style.left = (tx + 170 > host.clientWidth ? tx - tip.offsetWidth - 20 : tx) + 'px';
    tip.style.top = Math.max(0, y(cv[i]) * scale - 20) + 'px';
    tip.style.opacity = 1;
  };
  const leave = () => { hv.style.display = 'none'; tip.style.opacity = 0; };
  const hit = $('#hit');
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', leave);
}

function renderSources() {
  const c = sumArr(cur, 'src', SOURCES.length), p = sumArr(prev, 'src', SOURCES.length);
  const t = c.reduce((a, b) => a + b, 0);
  $('#sources').innerHTML = SOURCES.map((s, i) => `
    <li class="src-row">
      <span class="name">${s.name}</span>
      <span class="num">${fmt.int(c[i])} &nbsp;${deltaHtml(change(c[i], p[i]))}</span>
      <div class="track" role="img" aria-label="${s.name} ${(c[i] / t * 100).toFixed(0)} percent">
        <div class="bar" style="width:${(c[i] / t * 100).toFixed(1)}%;background:${s.color}"></div>
      </div>
    </li>`).join('');
}

function renderDevices() {
  const c = sumArr(cur, 'dev', DEVICES.length);
  const t = c.reduce((a, b) => a + b, 0);
  const r = 56, C = 2 * Math.PI * r;
  let offset = 0, segs = '';
  c.forEach((v, i) => {
    const len = (v / t) * C;
    segs += `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${DEVICES[i].color}" stroke-width="22"
      stroke-dasharray="${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}" stroke-dashoffset="${-offset}"/>`;
    offset += len;
  });
  const big = c.indexOf(Math.max(...c));
  $('#donut').innerHTML = `<svg viewBox="0 0 140 140" role="img" aria-label="Device share of visitors">${segs}</svg>
    <div class="center"><b>${(c[big] / t * 100).toFixed(0)}%</b><span>${DEVICES[big].name}</span></div>`;
  $('#devices').innerHTML = DEVICES.map((d, i) =>
    `<li><span class="dot" style="background:${d.color}"></span>${d.name}<span class="pct">${(c[i] / t * 100).toFixed(1)}%</span></li>`).join('');
}

const COLS = [
  { key: 'path',   label: 'Page' },
  { key: 'views',  label: 'Views' },
  { key: 'time',   label: 'Avg. time' },
  { key: 'bounce', label: 'Bounce rate' },
  { key: 'chg',    label: 'Change' }
];
function renderTable() {
  const c = sumArr(cur, 'pages', PAGES.length), p = sumArr(prev, 'pages', PAGES.length);
  let rows = PAGES.map((pg, i) => ({
    path: pg.path, views: c[i], time: pg.time, bounce: pg.bounce, chg: change(c[i], p[i])
  }));
  const q = state.q.trim().toLowerCase();
  if (q) rows = rows.filter(r => r.path.toLowerCase().includes(q));
  const { key, dir } = state.sort;
  rows.sort((a, b) => (typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : a[key] - b[key]) * dir);

  $('#thead').innerHTML = COLS.map(col => {
    const s = state.sort.key === col.key ? (state.sort.dir === 1 ? 'ascending' : 'descending') : 'none';
    return `<th scope="col" aria-sort="${s}"><button data-sort="${col.key}">${col.label}</button></th>`;
  }).join('');
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('#tbody').innerHTML = rows.map(r => `
    <tr><td class="path">${r.path}</td><td>${fmt.int(r.views)}</td><td>${mmss(r.time)}</td>
    <td>${(r.bounce * 100).toFixed(0)}%</td><td>${deltaHtml(r.chg)}</td></tr>`).join('');
  $('#empty').hidden = rows.length > 0;
  $('#pageCount').textContent = `${rows.length} of ${PAGES.length} pages`;
}

function renderAll() {
  slices(); renderHeader(); renderKpis(); renderChart(); renderSources(); renderDevices(); renderTable();
}

/* ---------- 6. Events ---------- */
$('#rangeSeg').addEventListener('click', e => {
  const b = e.target.closest('button[data-range]'); if (!b) return;
  state.range = +b.dataset.range;
  document.querySelectorAll('#rangeSeg button').forEach(x => x.setAttribute('aria-pressed', x === b));
  renderAll();
});
$('#kpis').addEventListener('click', e => {
  const b = e.target.closest('.kpi'); if (!b) return;
  state.metric = b.dataset.metric; renderKpis(); renderChart();
});
$('#thead').addEventListener('click', e => {
  const b = e.target.closest('button[data-sort]'); if (!b) return;
  const k = b.dataset.sort;
  state.sort = state.sort.key === k ? { key: k, dir: -state.sort.dir } : { key: k, dir: k === 'path' ? 1 : -1 };
  renderTable();
});
$('#search').addEventListener('input', e => { state.q = e.target.value; renderTable(); });
$('#themeBtn').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
});
let rz; new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(renderChart, 80); }).observe($('#chart'));

renderAll();
