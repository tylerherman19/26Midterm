import { esc, fmtMargin, fmtPct, hhmm, fmtNightTime, marginClass } from '../util.js';
import { ui, openAttr } from '../state.js';
import { statewide, senateStateTier, texasChecks, house } from '../model.js';
import { STATES, SENATE_TIER_BARS, SENATE_TIER_NOTES, TEXAS, HOUSE_TIER_SEATS } from '../data/guide.js';
import { marginTag, tierChip, statusPill, twoWay, tierBar, paceChart, legendPace, pos, refChip, sparkMargin } from '../ui.js';
import { nowNight } from '../api.js';

const ORDER = Object.keys(STATES).sort((a, b) => STATES[a].name.localeCompare(STATES[b].name));

function stateNav(active) {
  const office = ui.stateOffice || '';
  const choices = ORDER.filter((st) => !office || STATES[st].races.some((r) => r.office === office));
  return `<div class="state-pick">
    <label><span class="lbl">Office</span><select data-state-office aria-label="Choose an office">
      ${[['', 'All offices'], ['senate', 'Senate'], ['governor', 'Governor']].map(([key, name]) => `<option value="${key}" ${key === office ? 'selected' : ''}>${name}</option>`).join('')}
    </select></label>
    <label><span class="lbl">State</span><select data-state-jump aria-label="Choose a state">
      ${choices.map((st) => `<option value="${st}" ${st === active ? 'selected' : ''}>${esc(STATES[st].name)}</option>`).join('')}
    </select></label>
  </div>`;
}

function raceBlock(st, office) {
  const sw = statewide(st, office);
  const { guide: g, res, bench, state: s } = sw;
  const dl = g.dLabel || 'D';
  const dName = res?.dc?.name || g.d;
  const rName = res?.rc?.name || g.r;
  const liveForTier = res?.called ? res.margin : bench?.implied ?? res?.margin ?? null;
  const tier = office === 'senate' ? senateStateTier(st, liveForTier) : null;
  const breaks = office === 'senate' ? SENATE_TIER_BARS[st] : null;
  const range = breaks ? [Math.min(-20, breaks[0] - 6), Math.max(20, breaks[2] + 6)] : null;
  const margin = res?.hasVotes ? marginTag(res.margin, { dLabel: dl }) : '—';
  return `<div class="race-block">
    <div class="rb-h">
      <h3>${office === 'senate' ? 'U.S. Senate' : 'Governor'}</h3>
      <div>${statusPill(res, { dLabel: dl, closeAt: s.close, dName, rName, compact: !res?.called })}</div>
    </div>
    <dl class="state-margins">
      <div><dt>Current margin</dt><dd>${margin}</dd></div>
      <div><dt>DDHQ forecast</dt><dd>${marginTag(g.forecast, { digits: 0, dLabel: dl })}</dd></div>
    </dl>
    ${twoWay(res, { dName, rName, dLabel: dl })}
    <details class="state-race-details" ${openAttr(`race-detail-${st}-${office}`)}><summary>Race analysis</summary>
      <dl class="state-margins">
        <div><dt>Reporting</dt><dd>${res ? fmtPct(res.rep) : '—'}</dd></div>
        <div><dt>2024 president</dt><dd>${marginTag(s.pres2024, { digits: 0 })}</dd></div>
        ${bench?.estimate ? `<div><dt>County-based estimate</dt><dd>${marginTag(bench.estimate.value, { dLabel: dl })}</dd></div>` : ''}
      </dl>
      ${bench?.estimate ? `<p class="small">Scenario using ${bench.estimate.n} of ${bench.estimate.of} guide counties, representing ${bench.estimate.sharePct}% of the 2024 vote. Least-counted county: ${bench.estimate.minRep}% reporting.</p>` : ''}
      ${g.winProb ? `<p class="small">DDHQ pre-election win probability: ${g.winProb}% ${dl}.</p>` : ''}
      ${sparkMargin(sw.id)}
      ${breaks ? `<div class="tier-row"><span class="lbl">Senate implications ${tier ? tierChip(tier) : ''}</span>
        <p class="small">${res?.called ? '' : 'Based on the current margin or estimate. '}${esc(SENATE_TIER_NOTES[st] || '')}</p>
        ${tierBar(breaks, { min: range[0], max: range[1], forecast: g.forecast, live: liveForTier, dLabel: dl })}</div>` : ''}
    </details>
  </div>`;
}

function countyTable(st) {
  const s = STATES[st];
  if (!s.counties.length) return `<p class="muted">${esc(s.countiesNote || 'No county table.')}</p>`;
  const pick = ui.benchOffice[st] && s.races.find((r) => r.office === ui.benchOffice[st]);
  const primary = pick || s.races[0];
  const sw = statewide(st, primary.office);
  const b = sw.bench;
  const others = s.races.filter((r) => r !== primary).map((r) => ({ r, b: statewide(st, r.office).bench }));
  const dl = primary.dLabel || 'D';
  const lo = Math.min(...s.counties.flatMap((c) => [c[2], c[3]])) - 8;
  const hi = Math.max(...s.counties.flatMap((c) => [c[2], c[3]])) + 8;
  const P = (v) => pos(v, lo, hi);
  return `<div class="county-wrap">
    <table class="counties">
      <thead><tr><th>County</th><th class="n">Share</th><th class="n">2024</th><th class="n">To tie</th><th class="n hl">If forecast</th><th class="scale-h">2024 → tie → <b>live</b></th><th class="n">Live</th><th class="n">% in</th><th class="n" title="Live margin minus the tie target">vs tie</th>${others.map((o) => `<th class="n">${o.r.office === 'governor' ? 'Gov' : 'Sen'} live</th>`).join('')}<th title="The guide's estimate of when the county was mostly counted in 2024">Expected by (2024, CT)</th></tr></thead>
      <tbody>${b.rows.map((row, i) => {
        const vs = row.vsTie;
        const oth = others.map((o) => o.b?.rows[i]);
        return `<tr>
          <td><b>${esc(row.name)}</b>${row.tag ? ` <small class="tag">${esc(row.tag)}</small>` : ''}</td>
          <td class="n">${row.share}%</td>
          <td class="n">${marginTag(row.m2024, { digits: 0 })}</td>
          <td class="n"><b>${marginTag(row.toTie, { digits: 0, dLabel: dl })}</b></td>
          <td class="n hl">${marginTag(row.ifForecast, { digits: 0, dLabel: dl })}</td>
          <td class="scale"><div class="cs"><b class="zero" style="left:${P(0)}%"></b>
            <i class="c24" style="left:${P(row.m2024)}%"></i><i class="ctie" style="left:${P(row.toTie)}%"></i>
            ${row.live !== null ? `<i class="clive m-${marginClass(row.live)}" style="left:${P(row.live)}%"></i>` : ''}</div></td>
          <td class="n">${row.live !== null ? marginTag(row.live, { dLabel: dl }) : '<span class="muted">—</span>'}</td>
          <td class="n">${row.rep !== null && row.rep !== undefined ? `${row.rep}%` : '<span class="muted">—</span>'}</td>
          <td class="n">${vs !== null ? `<b class="m-${vs >= 0 ? 'd' : 'r'}">${vs >= 0 ? '+' : '−'}${Math.abs(vs).toFixed(1)}</b>` : ''}</td>
          ${oth.map((o) => `<td class="n">${o?.live !== null && o?.live !== undefined ? marginTag(o.live) : '<span class="muted">—</span>'}</td>`).join('')}
          <td class="inby">${esc(row.inBy)}</td>
        </tr>`;
      }).join('')}
      <tr class="sw"><td><b>Statewide</b></td><td class="n">100%</td><td class="n">${marginTag(s.pres2024, { digits: 0 })}</td><td class="n"><b>Even</b></td><td class="n hl">${marginTag(primary.forecast, { digits: 0, dLabel: dl })}</td><td></td>
        <td class="n">${sw.res?.hasVotes ? marginTag(sw.res.margin, { dLabel: dl }) : '—'}</td><td class="n">${sw.res ? `${sw.res.rep}%` : '—'}</td><td class="n">${b.estimate ? `<b title="County-benchmark estimate: share-weighted average of (live minus tie target)">${marginTag(b.estimate.value, { dLabel: dl })}</b><small class="muted"> est.</small>` : ''}</td>${others.map(() => '<td></td>').join('')}<td></td></tr>
      </tbody>
    </table>
    <div class="legend"><span><i class="lg-c24"></i>2024 result</span><span><i class="lg-ctie"></i>County result if the state is tied</span><span><i class="lg-clive"></i>Live (partial counts included)</span><span class="muted">"vs tie" above zero = running ahead of an even statewide race</span></div>
    <p class="muted small">${esc(s.countiesNote || '')}</p>
  </div>`;
}

function texasPanel() {
  const tc = texasChecks();
  const C = TEXAS.checks;
  const bar = (label, note, val, min, max, bench, goodHigh, extra = '') => {
    const P = (v) => pos(v, min, max);
    return `<div class="bench">
      <div class="bh"><b>${esc(label)}</b><span class="muted">${esc(note)}</span></div>
      <div class="bt"><i class="zone ${goodHigh ? 'd' : 'r'}" style="left:${P(bench)}%;width:${100 - P(bench)}%"></i>
        <b class="bm" style="left:${P(bench)}%"><em>${bench}${max <= 60 ? '%' : ''}</em></b>${extra}
        ${val !== null && val !== undefined ? `<b class="bv" style="left:${P(val)}%"><em>${val.toFixed(1)}${max <= 60 ? '%' : ''}</em></b>` : ''}</div>
      <div class="bx"><span>${min}</span><span>${max}</span></div>
    </div>`;
  };
  return `<section class="card wide texas">
    <div class="card-h"><h3>Texas: benchmarks</h3><span class="muted">computed live from county returns in the Senate race</span></div>
    <div class="tx-stats">${TEXAS.stats.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>
    <div class="tx-checks">
      ${bar(C.harris.label, C.harris.note, tc.harris?.margin ?? null, 5, 30, C.harris.bench, true, `<b class="ref" style="left:${pos(C.harris.allred, 5, 30)}%"><em>Allred '24 +11.4</em></b><b class="ref" style="left:${pos(C.harris.uhPoll, 5, 30)}%"><em>UH poll +22</em></b>`)}
      ${bar(C.big5.label, C.big5.note, tc.big5, 30, 50, C.big5.bench, true)}
      ${bar(C.rural.label, C.rural.note + ' (top-25 list approximate)', tc.rural, 15, 35, C.rural.bench, false)}
      ${bar(C.hispanic.label, C.hispanic.note, C.hispanic.early, 10, 30, C.hispanic.bench, true)}
    </div>
    <h4 class="sub">How the night unfolds (CT)</h4>
    <div class="steps">${TEXAS.unfolds.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>
    <h4 class="sub">House seats</h4>
    <div class="tx-house">${TEXAS.house.map(([d, c, cook, note]) => `<div class="txh"><span>${refChip('H:' + d)}</span><span>${esc(c)}</span><span class="cook">${esc(cook)}</span><span class="muted">${esc(note)}</span></div>`).join('')}</div>
    <p class="muted small">Senate: DDHQ ${fmtMargin(TEXAS.senate.forecast)} · polls ${TEXAS.senate.polls} · Cook ${TEXAS.senate.cook}. ${esc(TEXAS.senate.note)}. Governor: DDHQ ${fmtMargin(TEXAS.governor.forecast)} · polls ${TEXAS.governor.polls} · Cook ${TEXAS.governor.cook}. ${esc(TEXAS.governor.note)}.</p>
  </section>`;
}

function houseInState(st) {
  const seats = HOUSE_TIER_SEATS.flatMap((g) => g.seats).filter(([d]) => d.startsWith(st + '-'));
  if (!seats.length) return '';
  return `<div class="state-house"><span class="lbl">House seats in the guide</span><div class="chips">${seats.map(([d]) => refChip('H:' + d)).join('')}</div></div>`;
}

function benchToggle(st) {
  const s = STATES[st];
  if (!s.counties.length || s.races.length < 2) return s.counties.length ? `<span class="muted">targets for the ${s.races[0].office} race</span>` : '';
  const cur = ui.benchOffice[st] || s.races[0].office;
  return `<div class="seg-ctl" role="group" aria-label="Which race the targets apply to"><span class="seg-lbl">Targets for</span>${s.races.map((r) => `<button data-set="benchOffice.${st}=${r.office}" class="${cur === r.office ? 'on' : ''}" aria-pressed="${cur === r.office}">${r.office === 'senate' ? 'Senate' : 'Governor'}</button>`).join('')}</div>`;
}
function benchIntro(st) {
  const s = STATES[st];
  if (!s.counties.length) return '';
  const cur = ui.benchOffice[st] || s.races[0].office;
  const g = s.races.find((r) => r.office === cur);
  const c = s.counties[0];
  const dl = g.dLabel || 'D';
  const iff = c[3] + g.forecast;
  return `<p class="small bench-intro">Each target is a scenario benchmark, not a prediction. <b>"To tie"</b> is the county result consistent with an even statewide race. <b>"If forecast"</b> shifts it by DDHQ's statewide margin. For example, ${esc(c[0])}'s tie target is ${fmtMargin(c[3], { dLabel: dl })}; with the ${cur === 'senate' ? 'Senate' : 'governor'} forecast at ${fmtMargin(g.forecast, { dLabel: dl })}, a forecast-consistent result is ${fmtMargin(iff, { dLabel: dl })}. A partly counted county may not look like its final result.${cur !== s.races[0].office ? ' <b>Note:</b> the guide sets these targets on the ' + s.races[0].office + ' race; for governor they are approximate (the guide says they differ by a few points).' : ''}</p>`;
}

export function render(params) {
  const st = (params.st || 'GA').toUpperCase();
  const s = STATES[st] || STATES.GA;
  const key = STATES[st] ? st : 'GA';
  if (ui.stateOffice && !s.races.some((r) => r.office === ui.stateOffice)) ui.stateOffice = '';
  const visibleRaces = s.races.filter((r) => !ui.stateOffice || r.office === ui.stateOffice);
  const primaryId = statewide(key, visibleRaces[0].office).id;
  return `${stateNav(key)}
  <div class="grid state-page">
    <section class="card wide state-card">
      <div class="state-h"><h2>${esc(s.name)}</h2><span class="close-note">${esc(s.closeNote)}${s.closeDetail ? `<small>${esc(s.closeDetail)} Statewide calls generally wait for the last close.</small>` : ''}</span></div>
      <div class="race-blocks">${visibleRaces.map((r) => raceBlock(key, r.office)).join('')}</div>
    </section>
    <details class="card wide" ${openAttr('state-house-' + key)}><summary>House races in ${esc(s.name)}</summary>${houseInState(key)}</details>
    <details class="card wide" ${openAttr('state-context-' + key)}><summary>County benchmarks and counting patterns</summary>
    <section class="card wide"><div class="card-h"><h3>County benchmarks</h3>${benchToggle(key)}</div>${benchIntro(key)}${countyTable(key)}</section>
    <section class="card"><div class="card-h"><h3>Count by hour</h3>${legendPace()}</div>
      ${paceChart(key, primaryId, { w: 420, h: 150 })}
      ${s.countOrder ? `<p class="small"><b>2024 pattern (guide):</b> ${esc(s.countOrder.replace(/^Count order \(2024(, CT)?\): /, ''))}</p>` : ''}
      <p class="small"><b>Count:</b> ${esc(s.countNote)}</p>
    </section>
    ${s.howItLooks ? `<section class="card"><div class="card-h"><h3>${esc(s.howItLooks.title)}</h3><span class="muted">a possible pattern from past counts, not a guarantee</span></div>
      <div class="steps vertical">${s.howItLooks.steps.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div></section>` : ''}
    ${key === 'TX' ? texasPanel() : ''}
    </details>
  </div>`;
}
