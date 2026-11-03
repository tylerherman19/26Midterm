import { esc, fmtMargin, fmtNightTime, hhmm, fmtCountdown } from '../util.js';
import { nowNight, data, feedHealth } from '../api.js';
import { allStatewide, senateTally, houseSwing, statewideSwing, evalTell, senateStateTier, house, SWING_MIN } from '../model.js';
import { STATES, TELLS, HOURS, SENATE } from '../data/guide.js';
import { FORECAST_SOURCE } from '../data/houseForecast.js';
import { districtClose, stateClose } from '../data/closings.js';
import { HOUSE_META } from '../model.js';
import { marginTag, tierChip, statusPill, twoWay, seatBar, refChip, TIER_LABEL, sparkMargin } from '../ui.js';
import { feedHTML, latestImportant } from '../feed.js';
import { mapsCard } from '../map.js';
import { nightCenterpiece } from './night.js';
import { senateSeatsAtShift } from '../scenario.js';

/** Upcoming closings computed from the single source of truth (states and tracked House districts). */
export function closingSchedule() {
  const ev = new Map();
  const add = (t, kind, item) => { if (!ev.has(t)) ev.set(t, { time: t, states: [], house: [] }); ev.get(t)[kind].push(item); };
  for (const [st, s] of Object.entries(STATES)) {
    const c = stateClose(st);
    add(c.most, 'states', { st, office: s.races.map((r) => r.office), part: c.most !== c.all ? 'most' : 'all' });
    if (c.most !== c.all) add(c.all, 'states', { st, office: s.races.map((r) => r.office), part: 'rest' });
  }
  for (const [d, m] of Object.entries(HOUSE_META)) if (m.watch || m.early) add(m.close, 'house', d);
  return [...ev.values()].sort((a, b) => hhmm(a.time) - hhmm(b.time));
}

export function nowPanel() {
  const t = nowNight();
  const sched = closingSchedule();
  const next = sched.find((c) => hhmm(c.time) > t);
  const hour = [...HOURS].reverse().find((h) => t >= hhmm(h.time) - 5) || null;
  const pre = t < hhmm('17:00') - 5;
  const latest = latestImportant(4);
  return `<section class="card now">
    <div class="card-h"><h3>${pre ? 'Before the first polls close' : `Now: ${esc(hour?.label || '')} CT`}</h3>
      ${next ? `<span class="countdown">Next close <b>${fmtNightTime(hhmm(next.time))} CT</b> in <b data-countdown="${hhmm(next.time)}">${fmtCountdown(hhmm(next.time) - t)}</b></span>` : '<span class="countdown">All polls have closed</span>'}</div>
    ${pre ? `<p class="lede">The first polls close at <b>5 PM CT</b> in Eastern Time Kentucky and Indiana. KY-06 and IN-05 are the first House reads; Georgia, South Carolina, Virginia, Vermont and most of Florida follow at 6.</p>` : `<p class="lede">${esc(hour?.check || '')}</p>`}
    ${!pre && latest.length ? `<div class="latest"><span class="lbl">Latest developments</span>${latest.map((e) => `<a href="${e.href || '#/'}" class="lt side-${e.side || 'n'}"><time>${esc(e.time)}</time>${esc(e.text)}</a>`).join('')}</div>` : ''}
    ${next ? `<div class="next-close"><span class="lbl">Closing at ${fmtNightTime(hhmm(next.time))} CT</span>
      <div class="chips">${next.states.map((x) => `<a class="chip strong" href="#/states/${x.st}">${esc(STATES[x.st].name)} <span class="muted">${x.part === 'most' ? 'most polls' : x.part === 'rest' ? 'last polls' : ''} ${x.office.map((o) => (o === 'senate' ? 'Sen' : 'Gov')).join(', ')}</span></a>`).join('')}
      ${next.house.slice(0, 12).map((d) => refChip('H:' + d)).join('')}${next.house.length > 12 ? `<a class="chip ghost" href="#/house">+${next.house.length - 12} House</a>` : ''}</div></div>` : ''}
    <a class="more" href="#/tonight">Full hour-by-hour →</a>
  </section>`;
}

function senateCard() {
  const s = senateTally();
  const h = feedHealth();
  const v = (n) => (h.everLoaded ? n : '—');
  return `<section class="card control">
    <div class="card-h"><h3>U.S. Senate</h3>${s.control ? `<span class="pill pill-call-${s.control}">${s.control === 'd' ? 'Democrats' : 'Republicans'} control</span>` : '<span class="muted">51 seats for D control · 50 + VP for R</span>'}</div>
    <div class="big-score"><span class="d">${v(s.securedD)}</span><span class="vs">seats secured<br>incl. holdovers</span><span class="r">${v(s.securedR)}</span></div>
    ${seatBar({ total: 100, calledD: s.securedD, leadD: s.leadD, calledR: s.securedR, leadR: s.leadR, majority: 51 })}
    <table class="mini-t"><tbody>
      <tr><th>Not up in 2026 (holdovers)</th><td class="m-d">D ${s.holdD}</td><td class="m-r">R ${s.holdR}</td></tr>
      <tr><th>2026 races called</th><td class="m-d">D ${v(s.calledD)}${s.indD ? ` <small>(incl. ${s.indD} independent)</small>` : ''}</td><td class="m-r">R ${v(s.calledR)}</td></tr>
      <tr><th>Leading, not called</th><td class="m-d">D ${v(s.leadD)}</td><td class="m-r">R ${v(s.leadR)}</td></tr>
      <tr><th>No votes reported yet</th><td colspan="2">${v(s.noVotes)} of ${s.up} races${s.tied ? ` · ${s.tied} tied` : ''}</td></tr>
    </tbody></table>
    <p class="proj"><span class="scen-tag">scenario</span> If every current leader wins and DDHQ's favorite wins each race with no votes yet: <b>D ${s.scenarioD}</b>, net ${s.scenarioNet >= 0 ? '+' : ''}${s.scenarioNet} ${tierChip(s.scenarioTier, { small: true })}. Pre-election DDHQ forecast: 51 D (${FORECAST_SOURCE.date}); tipping-point race Texas D+1.</p>
    <p class="note"><b>D</b> includes independents, who caucus with Democrats: the 34 holdovers include King and Sanders, and an independent winning a 2026 race (such as Osborn in Nebraska) counts as Democratic-aligned. Senate tiers (guide p. 5): Riptide = GOP +3 to even, Tide = D net +1 to +3, Wave = +4 to +6 (control), Tsunami = +7 or more. Democrats start at 47.</p>
  </section>`;
}

export function missCard() {
  const hs = houseSwing();
  const ss = statewideSwing();
  const lim = 10;
  const P = (v) => Math.max(0, Math.min(100, ((v + lim) / (2 * lim)) * 100));
  const rows = (items) => items.slice(0, 12).map((x) => `<div class="mr"><span class="k">${esc(x.key)}</span><span class="track"><b class="z"></b><i class="${x.miss >= 0 ? 'd' : 'r'}" style="left:${Math.min(P(0), P(x.miss))}%;width:${Math.abs(P(x.miss) - P(0))}%"></i></span><span class="v m-${x.miss >= 0 ? 'd' : 'r'}">${x.miss >= 0 ? '+' : '−'}${Math.abs(x.miss).toFixed(1)}</span><span class="src">${esc(x.src || (x.called ? 'called' : `${x.rep}% in`))}</span></div>`).join('');
  return `<section class="card miss">
    <div class="card-h"><h3>Running vs. the forecast</h3><span class="muted">result minus DDHQ, + = toward Democrats</span></div>
    <h4 class="sub">House districts</h4>
    ${hs.n ? rows(hs.items.map((x) => ({ ...x, src: x.called ? 'called' : `${x.rep}% in` }))) : ''}
    <p class="small">${hs.enough ? `Median <b class="m-${hs.median >= 0 ? 'd' : 'r'}">${hs.median >= 0 ? 'D' : 'R'}+${Math.abs(hs.median).toFixed(1)}</b> across ${hs.n} districts in ${hs.states} states.` : `Waiting for ${SWING_MIN.districts}+ forecast districts in ${SWING_MIN.states}+ states to be called or ${SWING_MIN.reporting}%+ counted (now ${hs.n}).`} Only mostly-counted districts are used, because partial counts often lean toward whichever ballots were counted first.</p>
    <h4 class="sub">Senate and governor races</h4>
    ${ss.n ? rows(ss.items) : ''}
    <p class="small">${ss.n ? `Median <b class="m-${ss.median >= 0 ? 'd' : 'r'}">${ss.median >= 0 ? 'D' : 'R'}+${Math.abs(ss.median).toFixed(1)}</b> across ${ss.n} race${ss.n === 1 ? '' : 's'}.${ss.enough ? ` <span class="scen-tag">scenario</span> The same miss in every Senate race: ${ss.senateSeats} D seats.` : ''}` : 'No statewide race has enough counted to compare yet.'} Uses the guide's county benchmarks when 3+ of a state's guide counties are 50%+ counted, otherwise the statewide margin once 85%+ is in. A county's partial count can still lean toward whichever ballots it counted first.</p>
  </section>`;
}

export function raceCard(sw) {
  const { st, office, guide: g, state: s, res, bench } = sw;
  const dl = g.dLabel || 'D';
  const last = (n) => String(n || '').trim().split(/\s+/).pop();
  const dName = last(res?.dc?.name || g.d), rName = last(res?.rc?.name || g.r);
  const est = bench?.estimate;
  const tierM = res?.called ? res.margin : res?.hasVotes ? res.margin : null;
  const tier = office === 'senate' && tierM !== null ? senateStateTier(st, tierM) : null;
  const diff = res?.hasVotes ? res.margin - g.forecast : null;
  return `<a class="race-card" href="#/states/${st}?office=${office}">
    <div class="rc-h"><span class="rc-st">${esc(s.name)}</span><span class="rc-off">${office === 'senate' ? 'Senate' : 'Governor'}</span>${statusPill(res, { dLabel: dl, closeAt: s.close, dName, rName, compact: true })}</div>
    ${twoWay(res, { dName, rName, dLabel: dl })}
    <div class="rc-f">
      <span>Live ${res?.hasVotes ? marginTag(res.margin, { dLabel: dl }) : '<span class="muted">—</span>'}</span>
      <span class="fc-lbl">Forecast ${marginTag(g.forecast, { digits: 0, dLabel: dl })}</span>
      ${diff !== null ? `<span>vs forecast <b class="m-${diff >= 0 ? 'd' : 'r'}">${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}</b></span>` : ''}
      ${est ? `<span title="County-benchmark estimate (uniform swing)">Counties ${marginTag(est.value, { dLabel: dl })}</span>` : ''}
      ${tier ? `${tierChip(tier, { small: true })}${res.called ? '' : '<small class="muted">so far</small>'}` : ''}
      ${sparkMargin(sw.id)}
    </div>
  </a>`;
}

export function racesGrid() {
  const all = allStatewide().sort((a, b) => hhmm(a.state.firstClose) - hhmm(b.state.firstClose) || Math.abs(a.guide.forecast) - Math.abs(b.guide.forecast));
  return `<section class="card wide">
    <div class="card-h"><h3>Senate and governor races in the guide</h3><span class="muted">by first poll close · "Forecast" = DDHQ pre-election margin, ${FORECAST_SOURCE.date}</span></div>
    <div class="race-grid">${all.map(raceCard).join('')}</div>
  </section>`;
}

export function tellsCard() {
  const rows = TELLS.map((tl) => ({ tl, ev: evalTell(tl) }));
  return `<section class="card tells">
    <div class="card-h"><h3>Tells to watch</h3><span class="muted">guide p. 5 · signals, not proof</span></div>
    <div class="tell-list">${rows.map(({ tl, ev }) => `
      <div class="tell ph-${ev.phase} st-${ev.state}">
        <span class="when">${esc(tl.when)}</span>
        <span class="sig-badge sig-${tl.sig}" title="${tl.sig === 'd' ? 'good sign for Democrats' : tl.sig === 'r' ? 'good sign for Republicans' : 'timing or caveat'}">${tl.sig === 'g' ? '·' : tl.sig.toUpperCase()}</span>
        <div class="tt"><b>${esc(tl.title)}</b><span class="means">${esc(tl.means)}</span>${ev.ev ? `<span class="ev">${esc(ev.ev)}</span>` : ''}</div>
        <span class="tstate">${tellState(ev)}<small class="tkind">${ev.kind === 'auto' ? 'checked automatically' : 'requires manual review'}</small></span>
      </div>`).join('')}</div>
  </section>`;
}
function tellState(ev) {
  const map = { hit: '✓ Showing', miss: '✗ Not showing', notyet: 'Not yet evaluable', pending: 'Too early to say', manual: 'Check by hand' };
  return `<em class="ts ts-${ev.state}">${map[ev.state] || ''}${ev.soft && (ev.state === 'hit' || ev.state === 'miss') ? ' <small>(so far)</small>' : ''}</em>`;
}

export function render() {
  return `<div class="grid overview">
    ${nowPanel()}
    ${senateCard()}
    <section class="card feed-card"><div class="card-h"><h3>Latest developments</h3><span class="muted">calls, lead changes, big counts</span></div>${feedHTML({ limit: 14 })}</section>
    ${nightCenterpiece({ compact: true })}
    ${mapsCard()}
    ${missCard()}
    ${racesGrid()}
    ${tellsCard()}
  </div>`;
}
