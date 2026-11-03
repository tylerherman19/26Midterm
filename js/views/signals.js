// "Early signals: the first House races" (guide page 2), live.
import { esc, fmtMargin, marginClass, hhmm, fmtNightTime, interp } from '../util.js';
import { house } from '../model.js';
import { EARLY_HOUSE } from '../data/guide.js';
import { data } from '../api.js';
import { ui } from '../state.js';

const MIN = -26, MAX = 14; // cells are 4 pts wide, centered on R+24 … D+12
const P = (v) => Math.max(0, Math.min(100, ((v - MIN) / (MAX - MIN)) * 100));
const TICKS = [-24, -20, -16, -12, -8, -4, 0, 4, 8, 12];
const HOUSE_MISS_CURVE = { '-10': 195, '-8': 204, '-6': 213, '-4': 219, '-2': 224, 0: 230, 2: 236, 4: 244, 6: 262, 8: 278, 10: 285 };
const lbl = (m) => fmtMargin(m, { digits: 0 });

function zoneOf(margin, ddhq) {
  if (margin === null || margin === undefined) return null;
  const d = margin - ddhq;
  return d < -3 ? 'worse' : d > 3 ? 'better' : 'within';
}

function rows() {
  return EARLY_HOUSE.map(([d, dn, rn, inc, close, lateR, m24, ddhq], i) => {
    const h = house(d);
    const r = h.res;
    const live = r?.hasVotes ? r.margin : null;
    const hist = (data.history[h.id] || []).filter((p) => p[2] !== null && p[2] !== undefined);
    return { i, d, dn, rn, inc, close, lateR, m24, ddhq, h, r, live, zone: zoneOf(live, ddhq), miss: live === null ? null : live - ddhq, hist };
  });
}

function summary(list) {
  const rep = list.filter((x) => x.live !== null);
  const n = { worse: 0, within: 0, better: 0 };
  rep.forEach((x) => n[x.zone]++);
  const wsum = rep.reduce((s, x) => s + Math.max(0.1, x.r.rep / 100), 0);
  const avg = rep.length ? rep.reduce((s, x) => s + x.miss * Math.max(0.1, x.r.rep / 100), 0) / wsum : null;
  const called = list.filter((x) => x.r?.called);
  const flips = list.filter((x) => x.h.flip);
  const seats = avg === null ? null : Math.round(interp(HOUSE_MISS_CURVE, avg));
  const W = (k) => (rep.length ? (n[k] / rep.length) * 100 : 0);
  return `<div class="sg-sum">
    <div class="sg-stat"><span class="lbl">Reporting</span><b>${rep.length}<small>/${list.length}</small></b></div>
    <div class="sg-stat grow"><span class="lbl">Where the reporting seats sit</span>
      <div class="sg-mix">${rep.length ? `<i class="worse" style="width:${W('worse')}%">${n.worse || ''}</i><i class="within" style="width:${W('within')}%">${n.within || ''}</i><i class="better" style="width:${W('better')}%">${n.better || ''}</i>` : '<span class="muted small">No votes yet. First seats (KY-06, IN-05) close at 5 PM CT.</span>'}</div>
      <div class="sg-mix-l"><span>${n.worse} worse</span><span>${n.within} within 3</span><span>${n.better} better</span></div></div>
    <div class="sg-stat"><span class="lbl">Avg vs DDHQ</span><b class="${avg === null ? '' : avg >= 0 ? 'm-d' : 'm-r'}">${avg === null ? '—' : `${avg >= 0 ? 'D' : 'R'}+${Math.abs(avg).toFixed(1)}`}</b><small class="muted">weighted by % in</small></div>
    <div class="sg-stat"><span class="lbl">Points to</span><b>${seats === null ? '—' : `~${seats}`}</b><small class="muted">D House seats (forecast 230)</small></div>
    <div class="sg-stat"><span class="lbl">Called · flips</span><b>${called.length} <small>·</small> <span class="${flips.length ? 'm-d' : ''}">${flips.length}</span></b><small class="muted">${flips.map((x) => x.d).slice(0, 4).join(', ')}</small></div>
  </div>`;
}

function track(x) {
  const { ddhq, m24, live, zone, r, hist } = x;
  const right = live !== null && P(live) > 78;
  // trail: up to 12 evenly spaced past positions
  const step = Math.max(1, Math.ceil(hist.length / 12));
  const trail = hist.slice(0, -1).filter((_, k) => k % step === 0);
  const first = hist[0]?.[2];
  return `<div class="sg-track">
    <i class="zz worse" style="left:0;width:${P(ddhq - 3)}%"></i>
    <i class="zz within" style="left:${P(ddhq - 3)}%;width:${P(ddhq + 3) - P(ddhq - 3)}%"></i>
    <i class="zz better" style="left:${P(ddhq + 3)}%;width:${100 - P(ddhq + 3)}%"></i>
    <i class="cells"></i>
    <b class="even" style="left:${P(0)}%"></b>
    ${first !== undefined && live !== null && Math.abs(first - live) > 0.4 ? `<i class="path" style="left:${Math.min(P(first), P(live))}%;width:${Math.abs(P(live) - P(first))}%"></i>` : ''}
    ${trail.map((p) => `<i class="tr" style="left:${P(p[2])}%"></i>`).join('')}
    <b class="ddhq" style="left:${P(ddhq)}%" title="DDHQ ${lbl(ddhq)}"></b>
    <b class="c24" style="left:${P(m24)}%" title="2024 presidential ${lbl(m24)}"></b>
    ${live !== null ? `<b class="lv z-${zone} ${r.called ? 'called' : ''}" style="left:${P(live)}%" title="Live ${fmtMargin(live, { digits: 1 })} · ${r.rep}% in"><em class="${right ? 'l' : ''}">${fmtMargin(live, { digits: 1 })}<small>${r.called ? ' ✓' : ` · ${r.rep}%`}</small></em></b>` : ''}
  </div>`;
}

function status(x) {
  const { r, zone, h, lateR, dn, rn } = x;
  if (!r?.hasVotes && !r?.called) return '<span class="muted small">—</span>';
  let s = '';
  if (r.called) s = `<span class="sg-call c-${r.called}">${r.called === 'd' ? esc(dn) : r.called === 'r' ? esc(rn) : 'Other'} wins</span>`;
  else s = `<span class="sg-zone z-${zone}">${{ worse: 'Worse', within: 'Within 3', better: 'Better' }[zone]}</span>`;
  if (h.flip) s += ` <span class="flip ${r.called ? '' : 'soft'}">${r.called ? 'FLIP' : 'flip?'}</span>`;
  if (!r.called && lateR && r.rep < 80 && x.miss > -3) s += ' <span class="sg-warn" title="Later votes leaned Republican here in 2022: an early lead can shrink">late R votes still out</span>';
  return s;
}

export function signalsChart({ compact = false } = {}) {
  let list = rows();
  const sort = ui.sgSort || 'guide';
  if (sort === 'close') list = [...list].sort((a, b) => hhmm(a.close) - hhmm(b.close) || a.i - b.i);
  if (sort === 'miss') list = [...list].sort((a, b) => (b.miss ?? -99) - (a.miss ?? -99));
  if (sort === 'reporting') list = [...list].sort((a, b) => (b.r?.rep ?? -1) - (a.r?.rep ?? -1));
  const sorts = [['guide', 'Guide order'], ['close', 'Poll close'], ['miss', 'Vs DDHQ'], ['reporting', '% in']];
  return `<section class="card wide sg">
    <div class="sg-title"><h2>Early signals: the first House races</h2>
      <div class="seg-ctl">${sorts.map(([k, l]) => `<button data-sg-sort="${k}" class="${sort === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="sg-legend">
      <span><i class="k-ddhq"></i>DDHQ projected margin</span><span><i class="k-c24"></i>2024 presidential result</span>
      <span><i class="k-worse"></i>worse for Democrats than DDHQ by 3+</span><span><i class="k-within"></i>within 3 of DDHQ</span><span><i class="k-better"></i>better for Democrats than DDHQ by 3+</span>
      <span><i class="k-live"></i>live result · % in</span><span><i class="k-trail"></i>where it's been tonight</span>
    </div>
    ${summary(list)}
    <div class="sg-scroll"><div class="sg-grid">
      <div class="sg-row sg-head">
        <span></span><span></span>
        <span class="sg-axis"><em class="cap l">RESULT IN THE DISTRICT</em><em class="cap" style="left:${P(0)}%">EVEN: Democrat wins to the right</em>${TICKS.map((t) => `<em style="left:${P(t)}%">${t === 0 ? 'Even' : lbl(t)}</em>`).join('')}</span>
        <span class="n">2024</span><span class="n">DDHQ</span><span class="n"><small>BELOW</small>WORSE</span><span class="n"><small>ABOVE</small>BETTER</span><span class="n">LIVE</span><span>READ</span>
      </div>
      ${list.map((x) => `<div class="sg-row ${x.r?.called ? 'is-called' : ''} ${ui.focus === x.d ? 'focus' : ''}" id="h-${x.d}">
        <span class="sg-seat"><b>${x.d}</b><small>${fmtNightTime(hhmm(x.close))} CT</small></span>
        <span class="sg-m">${esc(x.dn)}${x.inc === 'd' ? ' (i)' : ''} v. ${esc(x.rn)}${x.inc === 'r' ? ' (i)' : ''}${x.inc === null ? ' · open' : ''}${x.lateR ? '<small class="late">late votes leaned R in 2022</small>' : ''}</span>
        ${track(x)}
        <span class="n m-${marginClass(x.m24)}">${lbl(x.m24)}</span>
        <span class="n b m-${marginClass(x.ddhq)}">${lbl(x.ddhq)}</span>
        <span class="n m-${marginClass(x.ddhq - 3)}">${lbl(x.ddhq - 3)}</span>
        <span class="n m-${marginClass(x.ddhq + 3)}">${lbl(x.ddhq + 3)}</span>
        <span class="n sg-live">${x.live !== null ? `<b class="m-${marginClass(x.live)}">${fmtMargin(x.live, { digits: 1 })}</b><small>${x.r.rep}% in</small>` : '<span class="muted">—</span>'}</span>
        <span class="sg-read">${status(x)}</span>
      </div>`).join('')}
      <div class="sg-row sg-foot"><span></span><span></span><span class="sg-axis">${TICKS.map((t) => `<em style="left:${P(t)}%">${t === 0 ? 'Even' : lbl(t)}</em>`).join('')}</span></div>
    </div></div>
    ${compact ? '' : `<p class="muted small">Bands are ±3 points around each seat's DDHQ projection. The live dot is colored by the band it's in. The faint dots and line show its path as the count came in. Seats marked "late votes leaned R in 2022" can look bluer early than they finish, and "Points to" uses the guide's House uniform-miss curve.</p>`}
  </section>`;
}

export function render(params) {
  ui.focus = params.d || null;
  return `<div class="grid">${signalsChart()}</div>`;
}
