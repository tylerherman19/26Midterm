import { esc, fmtMargin, fmtLean, marginClass, hhmm, fmtNightTime } from '../util.js';
import { house, riptideTests, houseSeatBreaks, tierFromBreaks, HOUSE_META } from '../model.js';
import { EARLY_HOUSE, HOUSE_TIER_SEATS, HOUSE_WATCH, CLOSEST_17, REDRAWN, STATE_NAMES } from '../data/guide.js';
import { FORECAST_SOURCE } from '../data/houseForecast.js';
import { marginTag, tierChip, tierBar, statusPill } from '../ui.js';
import { ui } from '../state.js';
import { nightCenterpiece } from './night.js';

const byClose = (list) => {
  const groups = new Map();
  for (const it of list) {
    const t = HOUSE_META[it.d]?.close || '19:00';
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(it);
  }
  return [...groups.entries()].sort((a, b) => hhmm(a[0]) - hhmm(b[0]));
};

function firstRacesSummary() {
  const rows = EARLY_HOUSE.map(([d, , , , , , , ddhq]) => ({ d, h: house(d), ddhq }));
  const rep = rows.filter((x) => x.h.vsForecast !== null);
  const n = { worse: 0, within: 0, better: 0 };
  rep.forEach((x) => { n[x.h.vsForecast < -3 ? 'worse' : x.h.vsForecast > 3 ? 'better' : 'within']++; });
  return `<section class="card wide">
    <div class="card-h"><h3>First House races</h3><a class="more" href="#/signals">Open the early-signals chart →</a></div>
    <p class="small">Are the first-reporting districts running better or worse for Democrats than DDHQ's forecast?</p>
    ${rep.length ? `<p class="fr-sum"><b>${rep.length}</b> of ${rows.length} reporting: <span class="m-r">${n.worse} worse by 3+</span> · <span>${n.within} within 3</span> · <span class="m-d">${n.better} better by 3+</span> <span class="muted">(including partial counts)</span></p>` : `<p class="muted small">No votes reported yet in the ${rows.length} early-signal districts.</p>`}
  </section>`;
}

function riptide() {
  return `<section class="card">
    <div class="card-h"><h3>Red Riptide tests</h3><span class="muted">guide p. 6</span></div>
    <p class="small">Results the guide treats as signs Republicans are holding the House:</p>
    <div class="rt-list">${riptideTests().map((t) => {
      const status = t.state === 'hit' ? 'Met: Republicans won enough' : t.state === 'miss' ? 'Ruled out: Democrats won too many' : `${t.gopWon + t.dWon} called · ${t.uncalled} uncalled`;
      return `<div class="rt sgn-${t.state}"><b>${t.label}</b><span>${esc(t.text)}</span>
        <em>${status}${t.gopWon || t.dWon ? ` <span class="muted">(R ${t.gopWon}, D ${t.dWon}${t.gopLead ? `, R leads ${t.gopLead} more` : ''})</span>` : ''}</em></div>`;
    }).join('')}</div>
  </section>`;
}

function tierSeats() {
  const all = HOUSE_TIER_SEATS.flatMap((g) => g.seats.map(([d, holder, ddhq, redrawn]) => ({ d, holder, ddhq, redrawn })));
  return `<section class="card wide">
    <div class="card-h"><h3>What the House results mean, seat by seat</h3><span class="muted">guide p. 6 · each seat's tier bar: Tide from DDHQ−4, Wave from DDHQ, Tsunami from DDHQ+4 · ★ redrawn since 2024</span></div>
    <p class="small">A seat's result shows what kind of night it is consistent with <em>if the rest of the country moved the same way</em>. Grouped by when the district's polls close.</p>
    <div class="ts-groups">${byClose(all).map(([time, seats]) => `
      <div class="ts-group"><div class="tsg-h"><b>${fmtNightTime(hhmm(time))} CT</b><span class="muted">${[...new Set(seats.map((s) => s.d.slice(0, 2)))].join(', ')}</span></div>
      ${seats.map(({ d, holder, ddhq, redrawn }) => {
        const h = house(d);
        const r = h.res;
        const br = houseSeatBreaks(ddhq);
        const tier = r?.hasVotes ? tierFromBreaks(r.margin, br) : null;
        return `<div class="ts-row"><span class="ts-seat"><b>${d}</b>${redrawn ? '★' : ''}<small>${esc(holder)}</small></span>
          <span class="n" title="DDHQ forecast">${marginTag(ddhq, { digits: 0 })}</span>
          <span class="ts-bar">${tierBar(br, { min: -22, max: 20, forecast: ddhq, live: r?.hasVotes ? r.margin : null, labels: false })}</span>
          <span class="ts-live">${statusPill(r, { closeAt: hhmm(h.meta.close), compact: true })}${r?.hasVotes && !r.called ? ` ${marginTag(r.margin)}` : ''}</span>
          <span>${tier ? `${tierChip(tier, { small: true })}${r.called ? '' : '<small class="muted"> so far</small>'}` : ''}</span></div>`;
      }).join('')}</div>`).join('')}</div>
  </section>`;
}

function watchList() {
  const f = ui.houseFilter || 'all';
  const q = (ui.houseQuery || '').trim().toLowerCase();
  const stf = ui.houseState || '';
  const all = HOUSE_WATCH.flatMap((g) => g.races.map(([d, dn, rn, inc, lean]) => ({ d, dn, rn, inc, lean, h: house(d) })));
  const states = [...new Set(all.map((x) => x.d.slice(0, 2)))].sort();
  const rows = all.filter(({ d, dn, rn, h, lean }) => {
    if (stf && !d.startsWith(stf + '-')) return false;
    if (q && !`${d} ${dn} ${rn} ${STATE_NAMES[d.slice(0, 2)]}`.toLowerCase().includes(q)) return false;
    if (f === 'flips') return h.flip;
    if (f === 'called') return !!h.res?.called;
    if (f === 'close') return CLOSEST_17.includes(d) || (h.res?.hasVotes && !h.res.called && Math.abs(h.res.margin) < 5);
    if (f === 'counting') return h.res?.hasVotes && !h.res?.called;
    return true;
  });
  const filters = [['all', 'All'], ['counting', 'Counting'], ['close', 'Close'], ['flips', 'Potential flips'], ['called', 'Called']];
  return `<section class="card wide" id="watchlist">
    <div class="card-h"><h3>House watchlist: 85 selected races</h3><span class="muted">the guide's list (p. 20), not every competitive seat</span></div>
    <div class="wl-tools">
      <label class="srch"><span class="sr-only">Search districts or candidates</span><input type="search" placeholder="Search district or candidate" value="${esc(ui.houseQuery)}" data-house-query /></label>
      <label><span class="sr-only">State</span><select data-house-state><option value="">All states</option>${states.map((s) => `<option value="${s}" ${s === stf ? 'selected' : ''}>${esc(STATE_NAMES[s])}</option>`).join('')}</select></label>
      <div class="seg-ctl" role="group" aria-label="Filter">${filters.map(([k, l]) => `<button data-house-filter="${k}" class="${f === k ? 'on' : ''}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>
    </div>
    <p class="muted small">"Close" means one of the guide's 17 closest seats on 2024 presidential lean, or an uncalled race currently within 5 points. "Potential flips" are races where the party now leading or declared winner differs from the party holding the seat; redrawn seats (★) aren't counted as flips. ${rows.length} of ${all.length} shown.</p>
    <div class="watch-cols">${byClose(rows).map(([time, list]) => `
      <div class="wl-group"><div class="wl-h"><b>${fmtNightTime(hhmm(time))} CT</b><span class="muted">${list.length}</span></div>
      ${list.map(({ d, dn, rn, inc, lean, h }) => {
        const r = h.res;
        const live = r?.called ? `<span class="m m-${r.called === 'r' ? 'r' : 'd'}">${r.called === 'd' ? 'D' : r.called === 'r' ? 'R' : 'Oth'} called</span>` : r?.hasVotes ? `${marginTag(r.margin)}<small>${r.rep}%</small>` : `<small class="muted">${h.status === 'open' ? 'polls open' : h.status === 'novotes' ? 'no votes' : h.status === 'loading' ? '…' : 'n/a'}</small>`;
        return `<details class="wl-row ${CLOSEST_17.includes(d) ? 'closest' : ''}" ${''}>
          <summary><b>${d}</b><span class="nm">${esc(dn)}${inc === 'd' ? ' <i class="inc-dot" title="incumbent">i</i>' : ''} vs. ${esc(rn)}${inc === 'r' ? ' <i class="inc-dot" title="incumbent">i</i>' : ''}${inc === null ? ' <span class="open">open</span>' : ''}${REDRAWN.has(d) ? ' <span class="muted" title="redrawn since 2024">★</span>' : ''}</span>
          <span class="lean m-${lean > 0 ? 'd' : lean < 0 ? 'r' : 'even'}" title="2024 presidential lean">${fmtLean(lean)}</span>
          <span class="lv">${live}</span>${h.flip ? `<span class="flip ${r?.called ? '' : 'soft'}">${r?.called ? 'FLIP' : 'flip?'}</span>` : '<span></span>'}</summary>
          <div class="wl-detail">
            <span>${esc(r?.dc?.name || dn)} (D) vs. ${esc(r?.rc?.name || rn)} (R) · ${inc ? `${inc === 'd' ? 'Democratic' : 'Republican'} incumbent` : 'open seat'}</span>
            <span>Polls close ${fmtNightTime(hhmm(h.meta.close))} CT${h.meta.closeNote ? ` (${esc(h.meta.closeNote)})` : ''}</span>
            <span>2024 lean ${fmtLean(lean)}${h.meta.ddhq !== null && h.meta.ddhq !== undefined ? ` · DDHQ ${fmtMargin(h.meta.ddhq)} (${FORECAST_SOURCE.date})` : ''}${h.vsForecast !== null ? ` · running ${h.vsForecast >= 0 ? '+' : '−'}${Math.abs(h.vsForecast).toFixed(1)} vs DDHQ` : ''}</span>
            ${r?.hasVotes ? `<span>${fmtMargin(r.margin, { digits: 1 })} with ${r.rep}% reporting${r.called ? ' · called' : ' · not called'}</span>` : ''}
          </div>
        </details>`;
      }).join('')}</div>`).join('') || '<p class="empty">No races match these filters.</p>'}</div>
    <p class="muted small">Lean = 2024 presidential margin in the district as given in the guide (T = Trump, H = Harris). For ★ redrawn seats the guide does not say whether 2024 results were recalculated to the new lines. <i class="inc-dot">i</i> = incumbent. Times are when the district's last polls close (single source: Methodology).</p>
  </section>`;
}

export function render(params) {
  ui.focus = params.d || null;
  return `<div class="grid house-page">${nightCenterpiece()}${firstRacesSummary()}${riptide()}${tierSeats()}${watchList()}</div>`;
}
