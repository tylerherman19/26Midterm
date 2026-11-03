import { esc, fmtMargin, fmtNightTime, hhmm, fmtCountdown, fmtPct } from '../util.js';
import { nowNight, data } from '../api.js';
import { allStatewide, senateTally, houseTally, governorTally, nightMiss, evalTell, senateStateTier, house, houseSignals, readRace, raceById } from '../model.js';
import { STATES, TELLS, HOURS, CLOSINGS, TILE, SENATE, STATE_NAMES, HOUSE, EARLY_HOUSE } from '../data/guide.js';
import { RACE_IDS } from '../data/raceIds.js';
import { marginTag, tierChip, statusPill, twoWay, seatBar, refChip, TIER_LABEL, sparkMargin } from '../ui.js';
import { feedHTML } from '../feed.js';
import { mapsCard } from '../map.js';

export function nowPanel() {
  const t = nowNight();
  const hour = [...HOURS].reverse().find((h) => t >= hhmm(h.time) - 5) || null;
  const next = CLOSINGS.find((c) => hhmm(c.time) > t);
  const pre = t < hhmm('17:00') - 5;
  return `<section class="card now">
    <div class="card-h"><h3>${pre ? 'Before the first close' : `Now · ${esc(hour?.label || '')}`}</h3>
      ${next ? `<span class="countdown">Next close <b>${esc(next.label.replace(' CT', ''))}</b> in <b data-countdown="${hhmm(next.time)}">${fmtCountdown(hhmm(next.time) - t)}</b></span>` : '<span class="countdown">All polls closed</span>'}</div>
    ${pre ? `<p class="lede">First polls close at <b>5:00 PM CT</b> in most of Kentucky and Indiana. KY-06 and IN-05 are the first House reads.</p>` : `<p class="lede">${esc(hour?.check || '')}</p>`}
    ${next ? `<div class="next-close"><span class="lbl">Closing at ${esc(next.label)}</span>
      <div class="chips">${next.states.map(([st, what]) => `<a class="chip strong" href="#/states/${st}">${st} <span class="muted">${esc(what)}</span></a>`).join('')}
      ${next.house.slice(0, 10).map((d) => `<span class="chip ghost">${d}</span>`).join('')}${next.house.length > 10 ? `<span class="chip ghost">+${next.house.length - 10} House</span>` : ''}</div></div>` : ''}
    ${hour && !pre && hour.watch?.length ? `<div class="watch-now">${hour.watch.slice(0, 3).map((w) => `
      <div class="wn"><b>${esc(w.title)}</b>${w.items.map(([sig, txt]) => `<div class="sig sig-${sig}"><i>${sig === 'g' ? '' : sig.toUpperCase()}</i>${esc(txt)}</div>`).join('')}
      <div class="chips">${w.refs.map(refChip).join('')}</div></div>`).join('')}</div>
      <a class="more" href="#/tonight">Full hour-by-hour →</a>` : ''}
  </section>`;
}

function tierScale(kind, value, forecast) {
  // Senate: net D change; House: D seats
  const segs = kind === 'senate'
    ? [['riptide', -3, 0.5], ['tide', 0.5, 3.5], ['wave', 3.5, 6.5], ['tsunami', 6.5, 9]]
    : [['riptide', 208, 218], ['tide', 218, 230], ['wave', 230, 240], ['tsunami', 240, 256]];
  const min = segs[0][1], max = segs[3][2];
  const p = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  return `<div class="tscale">
    ${segs.map(([k, a, b]) => `<i class="seg ${k}" style="left:${p(a)}%;width:${p(b) - p(a)}%"><span>${TIER_LABEL[k].replace('Blue ', '').replace('Red ', '')}</span></i>`).join('')}
    ${forecast !== null ? `<b class="fc" style="left:${p(forecast)}%"><em>Forecast</em></b>` : ''}
    ${value !== null && value !== undefined ? `<b class="live" style="left:${p(value)}%"><em>${kind === 'senate' ? (value > 0 ? '+' : '') + value : value}</em></b>` : ''}
  </div>`;
}

export function controlCards() {
  const s = senateTally();
  const h = houseTally();
  const g = governorTally();
  const miss = nightMiss();
  const sTier = s.tier;
  const hProj = miss.houseSeats;
  const anyVotes = s.seats.some((x) => x.kind !== 'forecast');
  return `<section class="card control">
    <div class="card-h"><h3>U.S. Senate</h3>${s.control ? `<span class="pill pill-call-${s.control}">${s.control === 'd' ? 'Democrats' : 'Republicans'} control</span>` : '<span class="muted">51 for control · Vance breaks ties</span>'}</div>
    <div class="big-score"><span class="d">${s.officialD}</span><span class="vs">called</span><span class="r">${s.officialR}</span></div>
    ${seatBar({ total: 100, calledD: s.officialD, leadD: s.leadD, calledR: s.officialR, leadR: s.leadR, majority: 51 })}
    <div class="sb-legend"><span><i class="d1"></i>Called D (incl. ${s.dNotUp} not up)</span><span><i class="d2"></i>Leading D ${s.leadD}</span><span><i class="r2"></i>Leading R ${s.leadR}</span><span><i class="r1"></i>Called R (incl. ${s.rNotUp} not up)</span></div>
    <div class="proj">${anyVotes ? `Called + leading + forecast for the rest: <b>D ${s.projD} · R ${s.projR}</b> → net <b>${s.net >= 0 ? '+' : ''}${s.net}</b> ${tierChip(sTier)}` : `Forecast: <b>D 51</b> (net +4, ${tierChip('wave')}). Tipping point: <b>Texas D+1</b>.`}</div>
    ${tierScale('senate', anyVotes ? s.net : null, 4)}
  </section>
  <section class="card control">
    <div class="card-h"><h3>U.S. House</h3>${h.control ? `<span class="pill pill-call-${h.control}">${h.control === 'd' ? 'Democrats' : 'Republicans'} control</span>` : '<span class="muted">218 for control</span>'}</div>
    <div class="big-score"><span class="d">${h.calledD}</span><span class="vs">called</span><span class="r">${h.calledR}</span></div>
    ${seatBar({ total: 435, calledD: h.calledD, leadD: h.leadD, calledR: h.calledR, leadR: h.leadR, majority: 218, markers: [{ at: 230, label: 'DDHQ forecast 230', short: '230' }] })}
    <div class="sb-legend"><span><i class="d1"></i>Called D</span><span><i class="d2"></i>Leading D ${h.leadD}</span><span><i class="u"></i>No votes ${h.waiting}</span><span><i class="r2"></i>Leading R ${h.leadR}</span><span><i class="r1"></i>Called R</span></div>
    <div class="proj">${hProj !== null ? `Results so far run <b>${fmtMargin(miss.miss, { digits: 1 })}</b> vs DDHQ across ${miss.n} races → about <b>${hProj} D seats</b> ${tierChip(houseTierFromSeats(hProj))}` : `Forecast: <b>230 D seats</b> ${tierChip('wave')}. The swing-based estimate appears once races are mostly counted.`}</div>
    ${tierScale('house', hProj, HOUSE.forecast)}
    <div class="gov-mini">Governors (incl. 14 not up): <b class="d">D ${g.calledD}</b> · <b class="r">R ${g.calledR}</b>${g.leadD + g.leadR ? ` <span class="muted">(leading D ${g.leadD} · R ${g.leadR})</span>` : ''}</div>
  </section>`;
}
const houseTierFromSeats = (n) => (n < 218 ? 'riptide' : n < 230 ? 'tide' : n < 240 ? 'wave' : 'tsunami');

export function missCard() {
  const m = nightMiss();
  const items = [...m.items].sort((a, b) => b.w - a.w).slice(0, 14);
  const lim = 10;
  const P = (v) => Math.max(0, Math.min(100, ((v + lim) / (2 * lim)) * 100));
  return `<section class="card miss">
    <div class="card-h"><h3>Running vs. the forecast</h3><span class="muted">result − DDHQ, points toward Democrats</span></div>
    ${m.miss === null ? `<p class="muted small">Fills in as counties report. Statewide races use the guide's county benchmarks (uniform swing from the "to tie" targets), so early mail-heavy or Election-Day-heavy counts don't fool it. House seats count once 60%+ is in.</p>` : `
    <div class="miss-head"><span class="m m-${m.miss >= 0 ? 'd' : 'r'} xl">${m.miss >= 0 ? 'D' : 'R'}+${Math.abs(m.miss).toFixed(1)}</span>
      <span>If every race misses by this much: <b>~${m.senateSeats} Senate</b> and <b>~${m.houseSeats} House</b> Democratic seats <span class="muted">(guide's uniform-miss curves)</span></span></div>
    <div class="miss-rows">${items.map((x) => `<div class="mr"><span class="k">${esc(x.key)}</span><span class="track"><b class="z"></b><i class="${x.miss >= 0 ? 'd' : 'r'}" style="left:${Math.min(P(0), P(x.miss))}%;width:${Math.abs(P(x.miss) - P(0))}%"></i></span><span class="v m-${x.miss >= 0 ? 'd' : 'r'}">${x.miss >= 0 ? '+' : '−'}${Math.abs(x.miss).toFixed(1)}</span></div>`).join('')}</div>`}
  </section>`;
}

export function raceCard(sw) {
  const { st, office, guide: g, state: s, res, bench } = sw;
  const dl = g.dLabel || 'D';
  const dName = res?.dc?.name || g.d;
  const rName = res?.rc?.name || g.r;
  const tier = office === 'senate' ? senateStateTier(st, res?.called ? res.margin : bench?.implied ?? res?.margin) : null;
  const diff = res?.hasVotes ? res.margin - g.forecast : null;
  return `<a class="race-card ${res?.called ? 'called called-' + res.called : ''}" href="#/states/${st}">
    <div class="rc-h"><span class="rc-st">${esc(s.name)}</span><span class="rc-off">${office === 'senate' ? 'Senate' : 'Governor'}</span>${statusPill(res, { dLabel: dl, closeAt: hhmm(s.firstClose || s.close), dName: res?.dc ? lastName(dName) : g.d, rName: res?.rc ? lastName(rName) : g.r })}</div>
    ${twoWay(res, { dName: lastName(dName), rName: lastName(rName), dLabel: dl })}
    <div class="rc-f">
      <span>Margin ${res?.hasVotes ? marginTag(res.margin, { dLabel: dl }) : '—'}</span>
      <span>DDHQ ${marginTag(g.forecast, { digits: 0, dLabel: dl })}</span>
      ${bench?.implied !== null && bench?.implied !== undefined ? `<span title="County benchmarks, uniform swing">Benchmarks ${marginTag(bench.implied, { dLabel: dl })}</span>` : diff !== null ? `<span>vs DDHQ <b class="m-${diff >= 0 ? 'd' : 'r'}">${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}</b></span>` : `<span class="muted">${g.winProb ? `≈${g.winProb}% ${dl} win` : ''}</span>`}
      ${tier ? tierChip(tier, { small: true }) : ''}
      ${sparkMargin(sw.id)}
    </div>
  </a>`;
}
const lastName = (n) => String(n || '').trim().split(/\s+/).pop();

export function racesGrid() {
  const all = allStatewide().sort((a, b) => hhmm(a.state.firstClose || a.state.close) - hhmm(b.state.firstClose || b.state.close) || Math.abs(a.guide.forecast) - Math.abs(b.guide.forecast));
  return `<section class="card wide">
    <div class="card-h"><h3>Senate and governor races</h3><span class="muted">sorted by poll close · tap for county benchmarks</span></div>
    <div class="race-grid">${all.map(raceCard).join('')}</div>
  </section>`;
}

export function tellsCard({ limit = 99 } = {}) {
  const rows = TELLS.map((tl) => ({ tl, ev: evalTell(tl) }));
  return `<section class="card tells">
    <div class="card-h"><h3>Tells to watch</h3><span class="muted">auto-checked against live returns</span></div>
    <div class="tell-list">${rows.slice(0, limit).map(({ tl, ev }) => `
      <div class="tell ph-${ev.phase} st-${ev.state}">
        <span class="when">${esc(tl.when)}</span>
        <span class="sig-badge sig-${tl.sig}">${tl.sig === 'g' ? '·' : tl.sig.toUpperCase()}</span>
        <div class="tt"><b>${esc(tl.title)}</b><span class="means">${esc(tl.means)}</span>${ev.ev ? `<span class="ev">${esc(ev.ev)}</span>` : ''}</div>
        <span class="tstate">${tellState(ev)}</span>
      </div>`).join('')}</div>
  </section>`;
}
function tellState(ev) {
  const map = { hit: '✓ Showing', miss: '✗ Not showing', waiting: ev.phase === 'upcoming' ? 'Upcoming' : 'Waiting', pending: 'Too early', manual: 'Check by hand' };
  return `<em class="ts ts-${ev.state}${ev.soft && ev.state !== 'waiting' ? ' soft' : ''}">${map[ev.state] || ''}${ev.soft && (ev.state === 'hit' || ev.state === 'miss') ? ' <small>(so far)</small>' : ''}</em>`;
}

export function firstHouseCard() {
  const rows = EARLY_HOUSE.slice(0, 12).map(([d, dn, rn, inc, close, lateR, m24, ddhq]) => {
    const h = house(d);
    const r = h.res;
    const diff = r?.hasVotes ? r.margin - ddhq : null;
    const verdict = diff === null ? '' : diff < -3 ? '<span class="vd vd-r">worse</span>' : diff > 3 ? '<span class="vd vd-d">better</span>' : '<span class="vd">within 3</span>';
    return `<a class="fh" href="#/signals?d=${d}"><b>${d}</b><span class="nm">${esc(dn)} v. ${esc(rn)}</span><span>${marginTag(ddhq, { digits: 0 })}</span><span>${r?.hasVotes ? marginTag(r.margin) : '<span class="muted">—</span>'}</span><span>${r?.called ? `<span class="m m-${r.called}">✓</span>` : r?.hasVotes ? `<span class="muted">${r.rep}%</span>` : ''}</span><span>${verdict}${h.flip ? ' <span class="flip">FLIP</span>' : ''}</span></a>`;
  }).join('');
  const sig = houseSignals();
  return `<section class="card">
    <div class="card-h"><h3>First House reads</h3><a class="more" href="#/signals">Full early-signals chart →</a></div>
    <div class="fh-head"><span>Seat</span><span></span><span>DDHQ</span><span>Live</span><span></span><span>vs DDHQ</span></div>
    <div class="fh-list">${rows}</div>
    <h4 class="sub">How big is the night</h4>
    <div class="signals">${sig.map((s) => `<div class="sgn sgn-${s.state}"><b>${esc(s.label)}</b><span>${esc(s.note)}</span><em>${{ hit: '✓', miss: '✗', leaning: 'leading', trailing: 'trailing', waiting: '' }[s.state]}</em></div>`).join('')}</div>
  </section>`;
}

export function render() {
  return `<div class="grid overview">
    ${nowPanel()}
    ${controlCards()}
    ${mapsCard()}
    ${missCard()}
    ${racesGrid()}
    ${tellsCard()}
    ${firstHouseCard()}
    <section class="card feed-card"><div class="card-h"><h3>Live updates</h3><span class="muted">calls, lead changes, big counts</span></div>${feedHTML()}</section>
  </div>`;
}
