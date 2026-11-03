import { esc, fmtMargin, fmtPct, hhmm, fmtNightTime, marginClass } from '../util.js';
import { statewide, senateStateTier, texasChecks, house } from '../model.js';
import { STATES, SENATE_TIER_BARS, SENATE_TIER_NOTES, TEXAS, HOUSE_TIER_SEATS } from '../data/guide.js';
import { marginTag, tierChip, statusPill, twoWay, tierBar, paceChart, legendPace, pos, refChip, sparkMargin } from '../ui.js';
import { nowNight } from '../api.js';

const ORDER = Object.keys(STATES).sort((a, b) => hhmm(STATES[a].firstClose || STATES[a].close) - hhmm(STATES[b].firstClose || STATES[b].close));

function stateNav(active) {
  return `<nav class="state-nav" aria-label="States">${ORDER.map((st) => {
    const s = STATES[st];
    const reads = s.races.map((r) => statewide(st, r.office).res);
    const anyCall = reads.some((r) => r?.called);
    const anyVotes = reads.some((r) => r?.hasVotes);
    const m = reads[0]?.hasVotes ? reads[0].margin : null;
    return `<a href="#/states/${st}" class="sn ${st === active ? 'on' : ''} ${anyCall ? 'has-call' : anyVotes ? 'has-votes' : ''}"><b>${st}</b><small>${m !== null ? fmtMargin(m, { dLabel: s.races[0].dLabel || 'D' }) : fmtNightTime(hhmm(s.firstClose || s.close)).replace(':00', '')}</small></a>`;
  }).join('')}</nav>`;
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
  return `<div class="race-block">
    <div class="rb-h">
      <div><span class="eyebrow">${office === 'senate' ? 'Senate' : 'Governor'}</span>
      <h3>${esc(g.d)} (${dl}) vs. ${esc(g.r)} (R) ${g.inc ? `<span class="inc">${g.inc === 'd' ? g.d : g.r} inc.</span>` : g.open ? '<span class="open">open</span>' : ''}</h3></div>
      ${statusPill(res, { dLabel: dl, closeAt: hhmm(s.firstClose || s.close), dName: g.d, rName: g.r })}
    </div>
    ${twoWay(res, { dName, rName, dLabel: dl })}
    <div class="kpis">
      <div><span>Live margin</span><b>${res?.hasVotes ? marginTag(res.margin, { dLabel: dl }) : '—'}</b>${sparkMargin(sw.id)}</div>
      <div><span>Reporting</span><b>${res ? fmtPct(res.rep) : '—'}</b></div>
      <div><span>DDHQ forecast</span><b>${marginTag(g.forecast, { digits: 0, dLabel: dl })}</b>${g.winProb ? `<small>≈${g.winProb}% ${dl} win</small>` : ''}</div>
      <div><span>County benchmarks imply</span><b>${bench?.implied !== null && bench?.implied !== undefined ? marginTag(bench.implied, { dLabel: dl }) : '—'}</b>${bench?.n ? `<small>${bench.n} of ${bench.rows.length} counties · uniform swing</small>` : '<small>waiting for counties</small>'}</div>
      <div><span>2024 president</span><b>${marginTag(s.pres2024, { digits: 0 })}</b></div>
    </div>
    ${breaks ? `<div class="tier-row"><span class="lbl">What it means for the Senate ${tier ? tierChip(tier) : ''}${SENATE_TIER_NOTES[st] ? ` <small class="muted">${SENATE_TIER_NOTES[st]}</small>` : ''}</span>
      ${tierBar(breaks, { min: range[0], max: range[1], forecast: g.forecast, live: liveForTier, dLabel: dl })}</div>` : ''}
  </div>`;
}

function countyTable(st) {
  const s = STATES[st];
  if (!s.counties.length) return `<p class="muted">${esc(s.countiesNote || 'No county table.')}</p>`;
  const primary = s.races[0];
  const sw = statewide(st, primary.office);
  const b = sw.bench;
  const others = s.races.slice(1).map((r) => ({ r, b: statewide(st, r.office).bench }));
  const dl = primary.dLabel || 'D';
  const lo = Math.min(...s.counties.flatMap((c) => [c[2], c[3]])) - 8;
  const hi = Math.max(...s.counties.flatMap((c) => [c[2], c[3]])) + 8;
  const P = (v) => pos(v, lo, hi);
  return `<div class="county-wrap">
    <table class="counties">
      <thead><tr><th>County</th><th class="n">Share</th><th class="n">2024</th><th class="n">To tie</th><th class="n hl">If forecast</th><th class="scale-h">2024 → tie → <b>live</b></th><th class="n">Live</th><th class="n">In</th><th class="n">vs tie</th>${others.map((o) => `<th class="n">${o.r.office === 'governor' ? 'Gov' : 'Sen'} live</th>`).join('')}<th>In by (CT)</th></tr></thead>
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
        <td class="n">${sw.res?.hasVotes ? marginTag(sw.res.margin, { dLabel: dl }) : '—'}</td><td class="n">${sw.res ? `${sw.res.rep}%` : '—'}</td><td class="n">${b.implied !== null ? `<b title="Weighted average of county results vs. their tie targets">${marginTag(b.implied, { dLabel: dl })}</b>` : ''}</td>${others.map(() => '<td></td>').join('')}<td></td></tr>
      </tbody>
    </table>
    <div class="legend"><span><i class="lg-c24"></i>2024 result</span><span><i class="lg-ctie"></i>County result if the state is tied</span><span><i class="lg-clive"></i>Live</span><span class="muted">"vs tie" above zero = running ahead of an even statewide race</span></div>
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

export function render(params) {
  const st = (params.st || 'GA').toUpperCase();
  const s = STATES[st] || STATES.GA;
  const key = STATES[st] ? st : 'GA';
  const primaryId = statewide(key, s.races[0].office).id;
  return `${stateNav(key)}
  <div class="grid state-page">
    <section class="card wide state-card">
      <div class="state-h"><h2>${esc(s.name)}</h2><span class="close-note">${esc(s.closeNote)}</span></div>
      <div class="race-blocks">${s.races.map((r) => raceBlock(key, r.office)).join('')}</div>
      ${houseInState(key)}
    </section>
    <section class="card wide"><div class="card-h"><h3>County benchmarks</h3><span class="muted">${s.races.length > 1 ? 'targets set to the ' + s.races[0].office + ' race' : ''}</span></div>${countyTable(key)}</section>
    <section class="card"><div class="card-h"><h3>Count by hour</h3>${legendPace()}</div>
      ${paceChart(key, primaryId, { w: 420, h: 150 })}
      ${s.countOrder ? `<p class="small">${esc(s.countOrder)}</p>` : ''}
      <p class="small"><b>Count:</b> ${esc(s.countNote)}</p>
    </section>
    ${s.howItLooks ? `<section class="card"><div class="card-h"><h3>${esc(s.howItLooks.title)}</h3></div>
      <div class="steps vertical">${s.howItLooks.steps.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div></section>` : ''}
    ${key === 'TX' ? texasPanel() : ''}
  </div>`;
}
