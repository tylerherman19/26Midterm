// Reusable rendering pieces (return HTML strings).
import { esc, fmtMargin, marginClass, fmtPct, fmtInt, clamp, hhmm, fmtNightTime } from './util.js';
import { statewide, house, TIER_KEYS } from './model.js';
import { STATES, TIERS } from './data/guide.js';
import { data, nowNight } from './api.js';

export const TIER_LABEL = Object.fromEntries(TIERS.map((t) => [t.key, t.label]));

export function marginTag(m, { digits = 1, dLabel = 'D', cls = '' } = {}) {
  return `<span class="m m-${marginClass(m)} ${cls}">${fmtMargin(m, { digits, dLabel })}</span>`;
}
export function tierChip(tier, { small = false } = {}) {
  if (!tier) return '<span class="tier tier-na">—</span>';
  return `<span class="tier tier-${tier}${small ? ' sm' : ''}">${esc(TIER_LABEL[tier].replace('Blue ', '').replace('Red ', ''))}</span>`;
}

/** Status pill for a race read. */
export function statusPill(res, { dLabel = 'D', closeAt = null, dName, rName } = {}) {
  const t = nowNight();
  if (!res) return `<span class="pill pill-wait">No data</span>`;
  if (res.called) {
    const who = res.called === 'd' ? dLabel : res.called === 'r' ? 'R' : 'Other';
    const name = res.called === 'd' ? dName : res.called === 'r' ? rName : '';
    return `<span class="pill pill-call-${res.called}">✓ ${esc(name ? `${name} wins` : `${who} win`)}</span>`;
  }
  if (res.hasVotes) return `<span class="pill pill-count">${fmtPct(res.rep)} in</span>`;
  if (closeAt !== null && t < closeAt) return `<span class="pill pill-wait">Closes ${fmtNightTime(closeAt)}</span>`;
  return `<span class="pill pill-wait">Awaiting votes</span>`;
}

/** Horizontal two-candidate bar. */
export function twoWay(res, { dName = 'D', rName = 'R', dLabel = 'D' } = {}) {
  const pd = res?.pd ?? 0, pr = res?.pr ?? 0;
  const has = res?.hasVotes;
  const dw = has ? pd : 50, rw = has ? pr : 50;
  const other = has ? Math.max(0, 100 - pd - pr) : 0;
  const win = res?.called;
  return `<div class="tw ${has ? '' : 'tw-empty'}">
    <div class="tw-names"><span class="tw-d ${win === 'd' ? 'won' : ''}">${win === 'd' ? '✓ ' : ''}${esc(dName)} <small>${dLabel}</small></span>
      <span class="tw-r ${win === 'r' ? 'won' : ''}">${esc(rName)} <small>R</small>${win === 'r' ? ' ✓' : ''}</span></div>
    <div class="tw-bar"><i class="d" style="width:${dw}%"></i><i class="o" style="width:${other}%"></i><i class="r" style="width:${rw}%"></i><b class="half"></b></div>
    <div class="tw-nums"><span>${has ? `${pd.toFixed(1)}% · ${fmtInt(res.dc?.votes)}` : '—'}</span><span>${has ? `${fmtInt(res.rc?.votes)} · ${pr.toFixed(1)}%` : '—'}</span></div>
  </div>`;
}

/** Margin axis [min,max] → percentage position. Positive (D) to the right. */
export const pos = (m, min, max) => clamp(((m - min) / (max - min)) * 100, 0, 100);

/** Tier bar: four colored segments with breaks, forecast dot and live marker. */
export function tierBar(breaks, { min = -20, max = 20, forecast = null, live = null, labels = true, dLabel = 'D' } = {}) {
  const [a, b, c] = breaks;
  const seg = (from, to, cls) => `<i class="seg ${cls}" style="left:${pos(from, min, max)}%;width:${pos(to, min, max) - pos(from, min, max)}%"></i>`;
  const lab = (v) => `<span class="brk" style="left:${pos(v, min, max)}%">${v === 0 ? (dLabel === 'I' ? 'I win' : 'D win') : fmtMargin(v, { dLabel })}</span>`;
  return `<div class="tierbar">
    <div class="tb-track">${seg(min, a, 'riptide')}${seg(a, b, 'tide')}${seg(b, c, 'wave')}${seg(c, max, 'tsunami')}
      <b class="even" style="left:${pos(0, min, max)}%"></b>
      ${forecast !== null ? `<b class="fc" style="left:${pos(forecast, min, max)}%" title="DDHQ forecast ${fmtMargin(forecast)}"></b>` : ''}
      ${live !== null && live !== undefined ? `<b class="live" style="left:${pos(live, min, max)}%" title="Live ${fmtMargin(live, { digits: 1 })}"><em>${fmtMargin(live, { digits: 1, dLabel })}</em></b>` : ''}
    </div>
    ${labels ? `<div class="tb-labels">${lab(a)}${lab(b)}${lab(c)}</div>` : ''}
  </div>`;
}

/** Live chip for a reference like 'H:VA-02' or 'S:GA:senate'. */
export function refChip(ref) {
  const [kind, a, b] = ref.split(':');
  if (kind === 'H') {
    const h = house(a);
    const r = h.res;
    const label = a;
    let body = '<span class="muted">waiting</span>';
    if (r?.hasVotes) body = `${marginTag(r.margin)} <span class="muted">${r.rep}%</span>`;
    if (r?.called) body = `<span class="m m-${r.called}">${r.called === 'd' ? 'D' : 'R'} win</span>${h.flip ? ' <span class="flip">FLIP</span>' : ''}`;
    else if (h.flip) body += ' <span class="flip soft">flip?</span>';
    return `<a class="chip" href="#/house?d=${a}">${label} ${body}</a>`;
  }
  if (kind === 'S') {
    const sw = statewide(a, b);
    const r = sw.res;
    const dl = sw.guide?.dLabel || 'D';
    let body = '<span class="muted">waiting</span>';
    if (r?.hasVotes) body = `${marginTag(r.margin, { dLabel: dl })} <span class="muted">${r.rep}%</span>`;
    if (r?.called) body = `<span class="m m-${r.called === 'o' ? 'd' : r.called}">${r.called === 'r' ? 'R' : dl} win</span>`;
    return `<a class="chip" href="#/states/${a}">${a} ${b === 'senate' ? 'Sen' : 'Gov'} ${body}</a>`;
  }
  return '';
}

/** Seat bar for a chamber: [called D | leading D | uncalled | leading R | called R] with majority line. */
export function seatBar({ total, calledD, leadD, calledR, leadR, majority, fixedD = 0, fixedR = 0, markers = [] }) {
  const w = (n) => (n / total) * 100;
  const rest = Math.max(0, total - calledD - leadD - calledR - leadR);
  return `<div class="seatbar">
    <div class="sb-track">
      <i class="d1" style="width:${w(calledD)}%"></i><i class="d2" style="width:${w(leadD)}%"></i>
      <i class="u" style="width:${w(rest)}%"></i>
      <i class="r2" style="width:${w(leadR)}%"></i><i class="r1" style="width:${w(calledR)}%"></i>
      <b class="maj" style="left:${w(majority)}%"><em>${majority}</em></b>
      ${markers.map((m) => `<b class="mk" style="left:${w(m.at)}%" title="${esc(m.label)}"><em>${esc(m.short || m.at)}</em></b>`).join('')}
    </div>
  </div>`;
}

/** Count-pace chart: 2024 share counted by hour (line) vs live reporting history (dots). */
export function paceChart(st, raceId, { w = 300, h = 120 } = {}) {
  const s = STATES[st];
  const pace = s?.pace;
  const x0 = 18 * 60, x1 = 26 * 60;
  const X = (m) => 28 + ((clamp(m, x0, x1) - x0) / (x1 - x0)) * (w - 36);
  const Y = (p) => h - 18 - (p / 100) * (h - 28);
  let path = '';
  const pts = [];
  if (pace) {
    pts.push([hhmm(s.firstClose || s.close), 0]);
    Object.entries(pace).forEach(([k, v]) => { if (/^\d+$/.test(k)) pts.push([Number(k) * 60, v]); });
    pts.sort((a, b) => a[0] - b[0]);
    path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  }
  const hist = (data.history[raceId] || []).filter((p) => p[0] >= x0 - 30);
  const livePath = hist.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  const t = nowNight();
  const ticks = [18, 19, 20, 21, 22, 23, 24, 25, 26];
  const last = hist[hist.length - 1];
  return `<svg class="pace" viewBox="0 0 ${w} ${h}" role="img" aria-label="Share counted by hour">
    ${[0, 50, 90, 100].map((p) => `<line x1="28" x2="${w - 8}" y1="${Y(p)}" y2="${Y(p)}" class="${p === 90 ? 'g90' : 'g'}"/><text x="24" y="${Y(p) + 3}" class="ax" text-anchor="end">${p}</text>`).join('')}
    ${ticks.map((hr) => `<text x="${X(hr * 60)}" y="${h - 4}" class="ax" text-anchor="middle">${hr % 12 === 0 ? 12 : hr % 12}${hr === 24 ? 'a' : hr === 18 ? 'p' : ''}</text>`).join('')}
    ${t >= x0 && t <= x1 ? `<line x1="${X(t)}" x2="${X(t)}" y1="6" y2="${h - 16}" class="now"/>` : ''}
    ${path ? `<path d="${path}" class="p24"/>` : `<text x="${w / 2}" y="${h / 2}" class="ax" text-anchor="middle">no 2024 hourly data</text>`}
    ${pts.map((p) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="2" class="p24d"/>`).join('')}
    ${livePath ? `<path d="${livePath}" class="plive"/>` : ''}
    ${last ? `<circle cx="${X(last[0])}" cy="${Y(last[1])}" r="3.5" class="plived"/>` : ''}
  </svg>`;
}

export function legendPace() {
  return `<div class="legend"><span><i class="lg-p24"></i>2024 share of final count</span><span><i class="lg-live"></i>Tonight (% reporting)</span></div>`;
}

export function emptyNote(text) { return `<div class="empty">${esc(text)}</div>`; }

export function sparkMargin(raceId, { w = 90, h = 26, dLabel = 'D' } = {}) {
  const hist = (data.history[raceId] || []).filter((p) => p[2] !== null);
  if (hist.length < 2) return '';
  const ms = hist.map((p) => p[2]);
  const lim = Math.max(5, ...ms.map(Math.abs));
  const X = (i) => (i / (hist.length - 1)) * (w - 2) + 1;
  const Y = (m) => h / 2 - (m / lim) * (h / 2 - 2);
  const d = hist.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p[2]).toFixed(1)}`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" class="z"/><path d="${d}"/></svg>`;
}

export { TIER_KEYS };
