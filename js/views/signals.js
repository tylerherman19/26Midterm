// "Early signals: the first House races" (guide page 2), live.
import { esc, fmtMargin, marginClass, hhmm, fmtNightTime, interp } from '../util.js';
import { house } from '../model.js';
import { EARLY_HOUSE } from '../data/guide.js';
import { data } from '../api.js';
import { houseSwing, SWING_MIN } from '../model.js';
import { FORECAST_SOURCE } from '../data/houseForecast.js';
import { HOUSE_META } from '../model.js';
import { ui, openAttr } from '../state.js';

const MIN = -26, MAX = 14; // cells are 4 pts wide, centered on R+24 … D+12
const P = (v) => Math.max(0, Math.min(100, ((v - MIN) / (MAX - MIN)) * 100));
const TICKS = [-24, -20, -16, -12, -8, -4, 0, 4, 8, 12];
const lbl = (m) => fmtMargin(m, { digits: 0 });

function zoneOf(margin, ddhq) {
  if (margin === null || margin === undefined) return null;
  const d = margin - ddhq;
  return d < -3 ? 'worse' : d > 3 ? 'better' : 'within';
}

function rows() {
  return EARLY_HOUSE.map(([d, dn, rn, inc, close0, lateR, m24, ddhq], i) => {
    const close = HOUSE_META[d]?.close || close0;
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
  const solid = rep.filter((x) => x.r.called || x.r.rep >= SWING_MIN.reporting);
  const med = solid.length ? [...solid.map((x) => x.miss)].sort((p, q) => p - q)[Math.floor(solid.length / 2)] : null;
  const sw = houseSwing();
  const called = list.filter((x) => x.r?.called);
  const flips = list.filter((x) => x.h.flip);
  const W = (k) => (rep.length ? (n[k] / rep.length) * 100 : 0);
  return `<div class="sg-sum">
    <div class="sg-stat"><span class="lbl">Reporting</span><b>${rep.length}<small>/${list.length}</small></b><small class="muted">${solid.length} mostly counted (${SWING_MIN.reporting}%+ or called)</small></div>
    <div class="sg-stat grow"><span class="lbl">Where the reporting seats sit (any % counted)</span>
      <div class="sg-mix">${rep.length ? `<i class="worse" style="width:${W('worse')}%">${n.worse || ''}</i><i class="within" style="width:${W('within')}%">${n.within || ''}</i><i class="better" style="width:${W('better')}%">${n.better || ''}</i>` : '<span class="muted small">No votes yet. The first two seats (KY-06, IN-05) close at 5 PM CT.</span>'}</div>
      <div class="sg-mix-l"><span>${n.worse} worse by 3+</span><span>${n.within} within 3</span><span>${n.better} better by 3+</span></div></div>
    <div class="sg-stat"><span class="lbl">Median vs DDHQ</span><b class="${med === null ? '' : med >= 0 ? 'm-d' : 'm-r'}">${med === null ? '—' : `${med >= 0 ? 'D' : 'R'}+${Math.abs(med).toFixed(1)}`}</b><small class="muted">${solid.length ? `mostly-counted seats on this chart (${solid.length})` : 'needs mostly-counted seats'}</small></div>
    <div class="sg-stat"><span class="lbl">Uniform-swing scenario <span class="scen-tag">scenario</span></span><b>${sw.enough ? `~${sw.seats}` : '—'}</b><small class="muted">${sw.enough ? `D seats if every district shifted like the ${sw.n} mostly-counted forecast districts nationwide (median)` : `withheld until ${SWING_MIN.districts}+ districts in ${SWING_MIN.states}+ states are mostly counted (now ${sw.n})`}</small></div>
    <div class="sg-stat"><span class="lbl">Called · potential flips</span><b>${called.length} <small>·</small> <span class="${flips.length ? 'm-d' : ''}">${flips.length}</span></b><small class="muted">${flips.map((x) => x.d).slice(0, 4).join(', ')}</small></div>
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
    ${live !== null ? `<b class="lv z-${zone} ${r.called ? 'called' : ''}" style="left:${P(live)}%" title="Live ${fmtMargin(live, { digits: 1 })} · ${r.rep}% in"><em class="${right ? 'l' : ''}">${fmtMargin(live, { digits: 1 })}<small>${r.called ? ' ✓ called' : ` · ${r.rep}%`} · ${x.miss >= 0 ? '+' : '−'}${Math.abs(x.miss).toFixed(1)} vs DDHQ</small></em></b>` : ''}
  </div>`;
}

function status(x) {
  const { r, zone, h, lateR, dn, rn } = x;
  if (!r?.hasVotes && !r?.called) return '<span class="muted small">—</span>';
  let s = '';
  if (r.called) s = `<span class="sg-call c-${r.called}">${r.called === 'd' ? esc(dn) : r.called === 'r' ? esc(rn) : 'Other'} wins</span>`;
  else s = `<span class="sg-zone z-${zone}">${{ worse: 'Worse', within: 'Within 3', better: 'Better' }[zone]}</span>`;
  if (h.flip) s += ` <span class="flip ${r.called ? '' : 'soft'}">${r.called ? 'FLIP' : 'flip?'}</span>`;
  if (!r.called && lateR && r.rep < 80 && x.miss > -3) s += ' <span class="sg-warn" title="In 2022, later-counted votes here leaned Republican. A historical pattern, not a guarantee.">2022: late votes leaned R</span>';
  return s;
}

function mobileRace(x, max) {
  const party = (margin) => margin > 0 ? 'Democrats' : 'Republicans';
  const delta = x.miss === null ? '' : Math.abs(x.miss) < 0.05 ? 'In line with the forecast'
    : `${Math.abs(x.miss).toFixed(1)} points better for ${party(x.miss)} than forecast`;
  const current = x.live === null ? 'Awaiting returns' : fmtMargin(x.live, { digits: 1 });
  const at = (margin) => 50 + margin / max * 43;
  return `<details class="early-race" id="mobile-h-${x.d}" ${openAttr('early-' + x.d)}>
    <summary><span class="early-title"><b>${x.d}</b><b>${current}</b></span>
      <span class="early-race-status">${x.r?.called ? status(x) : x.live !== null ? `Uncalled · ${x.r.rep}% reporting` : `Polls close ${fmtNightTime(hhmm(x.close))} CT`}</span>
      <span class="early-track" aria-hidden="true">
        <i class="early-even"></i>
        <i class="early-marker forecast" style="left:${at(x.ddhq)}%"></i>
        ${x.live === null ? '' : `<i class="early-marker current m-${marginClass(x.live)}" style="left:${at(x.live)}%"></i>`}
      </span>
      <span class="early-labels"><span>Forecast <b>${lbl(x.ddhq)}</b></span>
        ${delta ? `<span>${delta}</span>` : ''}</span>
    </summary>
    <p>${esc(x.dn)} (D) vs. ${esc(x.rn)} (R) · 2024 president ${lbl(x.m24)}</p>
    ${x.hist.length > 1 && x.live !== null ? `<p>First reported ${fmtMargin(x.hist[0][2], { digits: 1 })} → now ${fmtMargin(x.live, { digits: 1 })}</p>` : ''}
    ${x.lateR ? '<p>Late votes leaned Republican here in 2022.</p>' : ''}
  </details>`;
}

export function signalsChart({ compact = false } = {}) {
  let list = rows();
  const sort = ui.sgSort || 'close';
  if (sort === 'close') list = [...list].sort((a, b) => hhmm(a.close) - hhmm(b.close) || a.i - b.i);
  // Races with no results always sort after races with results, in guide order.
  const noRes = (x) => (x.live === null ? 1 : 0);
  if (sort === 'miss') list = [...list].sort((a, b) => noRes(a) - noRes(b) || (b.miss ?? 0) - (a.miss ?? 0) || a.i - b.i);
  if (sort === 'reporting') list = [...list].sort((a, b) => noRes(a) - noRes(b) || (b.r?.rep ?? 0) - (a.r?.rep ?? 0) || a.i - b.i);
  const mobileMax = Math.max(20, ...list.map((x) => Math.max(Math.abs(x.ddhq), Math.abs(x.live ?? 0))));
  const sorts = [['close', 'Poll close'], ['guide', 'Guide order'], ['miss', 'Best for D vs DDHQ'], ['reporting', 'Most counted']];
  return `<section class="card wide sg">
    <div class="early-mobile">
      <div class="early-title"><h2>Early House</h2><select data-ui="sgSort" aria-label="Sort early House races">${sorts.map(([k, label]) =>
        `<option value="${k}" ${sort === k ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
      <p>${list.filter((x) => x.live !== null).length} of ${list.length} races reporting</p>
      <div class="early-guide early-key"><span><i class="early-key-forecast"></i>DDHQ forecast</span><span><i class="early-key-count"></i>Current count</span></div>
      <div class="early-guide early-axis"><span>Republican lead</span><span>Even</span><span>Democratic lead</span></div>
      ${list.map((x) => mobileRace(x, mobileMax)).join('')}
      <details ${openAttr('early-guide')}><summary>How to read this</summary><p>The hollow circle marks the pre-election DDHQ forecast. The solid dot marks the current count. The center tick marks an even race. Every row uses the same margin scale. Early districts are geographically clustered. Partial returns can change substantially, and civicAPI reporting percentages may measure different things across states.</p></details>
    </div>
    <div class="early-desktop"><div class="sg-title"><h2>Early signals: the first House races</h2>
      <div class="seg-ctl" role="group" aria-label="Sort rows"><span class="seg-lbl">Sort</span>${sorts.map(([k, l]) => `<button data-sg-sort="${k}" class="${sort === k ? 'on' : ''}" aria-pressed="${sort === k}">${l}</button>`).join('')}</div></div>
    <p class="dek">Are the first-reporting House races coming in better or worse for Democrats than the pre-election forecast?</p>
    <p class="small muted">These ${list.length} districts close early (5 to 6:30 PM CT) and sit mostly in Florida, Virginia, the Carolinas, Ohio, Kentucky and Indiana, so they are not a national sample. The ±3-point bands are the guide's editorial threshold, not a statistical margin of error. Forecast: DDHQ, ${FORECAST_SOURCE.date}.</p>
    <div class="sg-legend">
      <span><i class="k-ddhq"></i>DDHQ projected margin</span><span><i class="k-c24"></i>2024 presidential result</span>
      <span><i class="k-worse"></i>worse for Democrats than DDHQ by 3+</span><span><i class="k-within"></i>within 3 of DDHQ</span><span><i class="k-better"></i>better for Democrats than DDHQ by 3+</span>
      <span><i class="k-live"></i>live result: margin, % in, and difference from DDHQ</span><span><i class="k-trail"></i>where it's been tonight</span>
    </div>
    ${summary(list)}
    <div class="sg-scroll"><div class="sg-grid">
      <div class="sg-row sg-head">
        <span></span><span></span>
        <span class="sg-axis"><em class="cap l">RESULT IN THE DISTRICT</em><em class="cap" style="left:${P(0)}%">EVEN: Democrat wins to the right</em>${TICKS.map((t) => `<em style="left:${P(t)}%">${t === 0 ? 'Even' : lbl(t)}</em>`).join('')}</span>
        <span class="n">2024</span><span class="n">DDHQ</span><span class="n"><small>BELOW</small>WORSE</span><span class="n"><small>ABOVE</small>BETTER</span><span class="n">LIVE</span><span>READ</span>
      </div>
      ${list.map((x) => `<div class="sg-row ${x.r?.called ? 'is-called' : ''} ${ui.focus === x.d ? 'focus' : ''}" id="h-${x.d}">
        <span class="sg-seat"><b>${x.d}</b><small>${fmtNightTime(hhmm(x.close))}<span class="ct"> CT</span></small></span>
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
    ${compact ? '' : `<p class="muted small">The live dot is colored by the band it's in (red = worse by 3+, gray = within 3, blue = better by 3+). Faint dots trace its path as the count came in. A partly counted district can move a lot: "late votes leaned R in 2022" is a historical observation from that year, not a prediction. civicAPI's "% in" is not documented as share of expected vote and may not be comparable across states.</p>`}
    </div>
  </section>`;
}

export function render(params) {
  ui.focus = params.d || null;
  return `<div class="grid">${signalsChart()}</div>`;
}
