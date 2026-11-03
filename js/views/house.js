import { esc, fmtMargin, fmtLean, marginClass, hhmm, fmtNightTime } from '../util.js';
import { house, houseTally, houseSignals, riptideTests, houseSeatBreaks, tierFromBreaks, nightMiss, HOUSE_META } from '../model.js';
import { EARLY_HOUSE, HOUSE_TIER_SEATS, HOUSE_WATCH, HOUSE, CLOSEST_17, REDRAWN } from '../data/guide.js';
import { marginTag, tierChip, seatBar, pos, tierBar } from '../ui.js';
import { ui } from '../state.js';
import { signalsChart } from './signals.js';

function topPanel() {
  const h = houseTally();
  const miss = nightMiss();
  const sig = houseSignals();
  const min = 208, max = 256;
  const P = (v) => pos(v, min, max);
  const proj = miss.houseSeats;
  return `<section class="card wide">
    <div class="card-h"><h3>How big is the night?</h3><span class="muted">Democratic House seats, and the early results that point to each level</span></div>
    <div class="big-scale">
      <i class="seg riptide" style="left:0;width:${P(218)}%"><span>Red Riptide</span></i>
      <i class="seg tide" style="left:${P(218)}%;width:${P(230) - P(218)}%"><span>Blue Tide</span></i>
      <i class="seg wave" style="left:${P(230)}%;width:${P(240) - P(230)}%"><span>Blue Wave</span></i>
      <i class="seg tsunami" style="left:${P(240)}%;width:${100 - P(240)}%"><span>Blue Tsunami</span></i>
      <b class="maj" style="left:${P(218)}%"><em>218</em></b>
      <b class="fc" style="left:${P(HOUSE.forecast)}%"></b>
      ${proj !== null ? `<b class="live" style="left:${P(proj)}%"></b>` : ''}
      ${sig.map((s, i) => `<b class="sigm sgn-${s.state}" style="left:${P(s.seats)}%;--row:${i % 2}" title="${esc(s.label)}: ${esc(s.note)}"><em>${i + 1}</em></b>`).join('')}
    </div>
    <div class="ticks">${[210, 215, 220, 225, 230, 235, 240, 245, 250, 255].map((v) => `<span style="left:${P(v)}%">${v}</span>`).join('')}</div>
    <div class="bs-key"><span><i class="k-fc"></i>DDHQ forecast: 230</span>${proj !== null ? `<span><i class="k-sw"></i>Results so far point to <b>~${proj}</b></span>` : '<span class="muted">Gold marker appears once seats are mostly counted</span>'}<span><i class="k-pin">1</i>Seat level each numbered flip below points to</span></div>
    <div class="house-score">
      <div><span class="lbl">Called</span><b class="d">D ${h.calledD}</b> · <b class="r">R ${h.calledR}</b></div>
      <div><span class="lbl">Leading (uncalled)</span><b class="d">D ${h.leadD}</b> · <b class="r">R ${h.leadR}</b></div>
      <div><span class="lbl">No votes yet</span><b>${h.waiting}</b></div>
      <div><span class="lbl">Called + leading</span><b class="d">D ${h.calledD + h.leadD}</b> · <b class="r">R ${h.calledR + h.leadR}</b></div>
    </div>
    ${seatBar({ total: 435, calledD: h.calledD, leadD: h.leadD, calledR: h.calledR, leadR: h.leadR, majority: 218, markers: [{ at: 230, short: '230', label: 'forecast' }] })}
    <div class="sb-legend"><span><i class="d1"></i>Called D</span><span><i class="d2"></i>Leading D</span><span><i class="u"></i>No votes / uncalled</span><span><i class="r2"></i>Leading R</span><span><i class="r1"></i>Called R</span><span><i class="k-maj"></i>218 majority</span><span><i class="k-fc"></i>230 forecast</span></div>
    <div class="signals">${sig.map((s, i) => `<div class="sgn sgn-${s.state}"><b><i class="k-pin">${i + 1}</i>${esc(s.label)} <small class="muted">${esc(s.seatsLabel)} seats</small></b><span>${esc(s.note)}</span><div class="chips">${s.rs.map((r) => chip(r)).join('')}</div></div>`).join('')}</div>
    <div class="riptide-tests"><span class="lbl">Red Riptide tests</span>${riptideTests().map((t) => `<div class="rt sgn-${t.state}"><b>${t.label}</b><span>${esc(t.text)}</span><em>GOP won ${t.gopWon}${t.gopLead ? ` · leads ${t.gopLead}` : ''} of ${t.of}</em></div>`).join('')}</div>
  </section>`;
}

function chip(h) {
  const r = h.res;
  let body = '<span class="muted">—</span>';
  if (r?.called) body = `<span class="m m-${r.called}">${r.called === 'd' ? 'D' : 'R'} ✓</span>`;
  else if (r?.hasVotes) body = `${marginTag(r.margin)}<span class="muted">${r.rep}%</span>`;
  return `<a class="chip ${h.flip ? 'is-flip' : ''}" href="#/house?d=${h.dist}">${h.dist} ${body}</a>`;
}

function earlySignals() {
  const min = -24, max = 14;
  const P = (v) => pos(v, min, max);
  const ticks = [-24, -20, -16, -12, -8, -4, 0, 4, 8, 12];
  return `<section class="card wide">
    <div class="card-h"><h3>Early signals: the first House races</h3>
      <div class="legend"><span><i class="lg-ddhq"></i>DDHQ projected margin</span><span><i class="lg-c24"></i>2024 presidential</span><span><i class="lg-live"></i>Live</span><span><i class="lg-worse"></i>worse for D than DDHQ by 3+</span><span><i class="lg-within"></i>within 3</span><span><i class="lg-better"></i>better by 3+</span></div></div>
    <div class="es">
      <div class="es-row es-head"><span>Seat</span><span class="es-scale">${ticks.map((t) => `<em style="left:${P(t)}%">${t === 0 ? 'Even' : fmtMargin(t)}</em>`).join('')}</span><span class="n">2024</span><span class="n">DDHQ</span><span class="n">Live</span><span class="n">In</span><span>Read</span></div>
      ${EARLY_HOUSE.map(([d, dn, rn, inc, close, lateR, m24, ddhq]) => {
        const h = house(d);
        const r = h.res;
        const diff = r?.hasVotes ? r.margin - ddhq : null;
        const read = r?.called ? `<span class="m m-${r.called}">${r.called === 'd' ? dn : rn} wins</span>` : diff === null ? '' : diff < -3 ? '<span class="vd vd-r">Worse</span>' : diff > 3 ? '<span class="vd vd-d">Better</span>' : '<span class="vd">Within 3</span>';
        return `<div class="es-row ${ui.focus === d ? 'focus' : ''}" id="h-${d}">
          <span class="es-seat"><b>${d}</b><small>${esc(dn)}${inc === 'd' ? ' (i)' : ''} v. ${esc(rn)}${inc === 'r' ? ' (i)' : ''}${inc === null ? ' · open' : ''}</small><small class="muted">${fmtNightTime(hhmm(close))} CT${lateR ? ' · <em class="late">late votes leaned R in 2022</em>' : ''}</small></span>
          <span class="es-scale">
            <i class="z worse" style="left:0;width:${P(ddhq - 3)}%"></i><i class="z within" style="left:${P(ddhq - 3)}%;width:${P(ddhq + 3) - P(ddhq - 3)}%"></i><i class="z better" style="left:${P(ddhq + 3)}%;width:${100 - P(ddhq + 3)}%"></i>
            <b class="even" style="left:${P(0)}%"></b><b class="ddhq" style="left:${P(ddhq)}%"></b><b class="c24" style="left:${P(m24)}%"></b>
            ${r?.hasVotes ? `<b class="lv m-${marginClass(r.margin)}" style="left:${P(r.margin)}%"></b>` : ''}
          </span>
          <span class="n">${marginTag(m24, { digits: 0 })}</span><span class="n">${marginTag(ddhq, { digits: 0 })}</span>
          <span class="n">${r?.hasVotes ? marginTag(r.margin) : '<span class="muted">—</span>'}</span><span class="n">${r?.hasVotes ? r.rep + '%' : ''}</span>
          <span>${read}${h.flip && !r?.called ? ' <span class="flip soft">flip?</span>' : h.flip ? ' <span class="flip">FLIP</span>' : ''}</span>
        </div>`;
      }).join('')}
    </div>
    <p class="muted small">Worse/better bands are ±3 points around the DDHQ projection. Seats flagged "late votes leaned R in 2022" can look bluer early than they finish.</p>
  </section>`;
}

function tierSeats() {
  return `<section class="card wide">
    <div class="card-h"><h3>What the House results mean</h3><span class="muted">each seat's result placed on its tier bar · Tide begins at DDHQ−4, Wave at DDHQ, Tsunami at DDHQ+4 · ★ redrawn since 2024</span></div>
    <div class="ts-groups">${HOUSE_TIER_SEATS.map((g) => `
      <div class="ts-group"><div class="tsg-h"><b>${esc(g.label)}</b><span class="muted">${esc(g.note)}</span></div>
      ${g.seats.map(([d, holder, ddhq, redrawn]) => {
        const h = house(d);
        const r = h.res;
        const br = houseSeatBreaks(ddhq);
        const tier = r?.hasVotes ? tierFromBreaks(r.margin, br) : null;
        return `<div class="ts-row" id="ht-${d}"><span class="ts-seat"><b>${d}</b>${redrawn ? '★' : ''}<small>${esc(holder)}</small></span>
          <span class="n">${marginTag(ddhq, { digits: 0 })}</span>
          <span class="ts-bar">${tierBar(br, { min: -22, max: 20, forecast: ddhq, live: r?.hasVotes ? r.margin : null, labels: false })}</span>
          <span class="ts-live">${r?.called ? `<span class="m m-${r.called}">${r.called === 'd' ? 'D' : 'R'} ✓</span>` : r?.hasVotes ? `${marginTag(r.margin)} <small class="muted">${r.rep}%</small>` : '<span class="muted">—</span>'}</span>
          <span>${tier ? tierChip(tier, { small: true }) : ''}</span></div>`;
      }).join('')}</div>`).join('')}</div>
  </section>`;
}

function watchList() {
  const f = ui.houseFilter || 'all';
  const groups = HOUSE_WATCH.map((g) => {
    const rows = g.races.map(([d, dn, rn, inc, lean]) => ({ d, dn, rn, inc, lean, h: house(d) })).filter(({ d, h, lean }) => {
      if (f === 'flips') return h.flip;
      if (f === 'called') return !!h.res?.called;
      if (f === 'close') return CLOSEST_17.includes(d) || (h.res?.hasVotes && Math.abs(h.res.margin) < 5);
      if (f === 'counting') return h.res?.hasVotes && !h.res?.called;
      return true;
    });
    return { g, rows };
  }).filter((x) => x.rows.length);
  const filters = [['all', 'All 85'], ['counting', 'Counting'], ['close', 'Close'], ['flips', 'Flips'], ['called', 'Called']];
  return `<section class="card wide">
    <div class="card-h"><h3>All House races to watch, by poll close</h3>
      <div class="seg-ctl" role="tablist">${filters.map(([k, l]) => `<button data-house-filter="${k}" class="${f === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="watch-cols">${groups.map(({ g, rows }) => `
      <div class="wl-group"><div class="wl-h"><b>${esc(g.label)}</b><span class="muted">${g.races.length}</span></div>
      ${rows.map(({ d, dn, rn, inc, lean, h }) => {
        const r = h.res;
        return `<div class="wl-row ${CLOSEST_17.includes(d) ? 'closest' : ''} ${h.flip ? 'is-flip' : ''} ${r?.called ? 'is-called' : ''}" id="hw-${d}">
          <b>${d}</b><span class="nm">${esc(dn)}${inc === 'd' ? ' <i class="inc-dot">i</i>' : ''} vs. ${esc(rn)}${inc === 'r' ? ' <i class="inc-dot">i</i>' : ''}${inc === null ? ' <span class="open">open</span>' : ''}${REDRAWN.has(d) ? ' <span class="muted">★</span>' : ''}</span>
          <span class="lean m-${lean > 0 ? 'd' : lean < 0 ? 'r' : 'even'}">${fmtLean(lean)}</span>
          <span class="lv">${r?.called ? `<span class="m m-${r.called}">${r.called === 'd' ? 'D' : 'R'} ✓</span>` : r?.hasVotes ? `${marginTag(r.margin)}<small>${r.rep}%</small>` : ''}</span>
          ${h.flip ? `<span class="flip ${r?.called ? '' : 'soft'}">${r?.called ? 'FLIP' : 'flip?'}</span>` : '<span></span>'}
        </div>`;
      }).join('')}</div>`).join('')}</div>
    <p class="muted small">Lean is the 2024 presidential margin (T = Trump, H = Harris). Highlighted rows are the 17 closest. <i class="inc-dot">i</i> = incumbent.</p>
  </section>`;
}

export function render(params) {
  ui.focus = params.d || null;
  return `<div class="grid house-page">${topPanel()}${signalsChart({ compact: true })}${tierSeats()}${watchList()}</div>`;
}
