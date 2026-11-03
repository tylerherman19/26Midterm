// Derived results: margins, calls, benchmarks, tiers, tells, and the night-level projections.

import { data, nowNight } from './api.js';
import { RACE_IDS } from './data/raceIds.js';
import {
  STATES, SENATE, SENATE_TIER_BARS, HOUSE, HOUSE_TIER_SEATS, HOUSE_WATCH, EARLY_HOUSE, OPEN_SEAT_HOLDER, HOUSE_SIGNALS,
  RED_RIPTIDE_TESTS, WI_LEG, TEXAS,
} from './data/guide.js';
import { norm, surname, hhmm } from './util.js';
import { districtClose } from './data/closings.js';
import { DDHQ } from './data/houseForecast.js';
import { REDRAWN } from './data/guide.js';
import { houseSeatsAtShift, senateSeatsAtShift, ddhqFor } from './scenario.js';
import { raceStatus } from './status.js';

// ---------- single race ----------
const isDem = (p) => /democrat|dfl/i.test(p || '');
const isRep = (p) => /republican|gop/i.test(p || '');

/**
 * Normalize a civicAPI race into a two-way read.
 * opts.d / opts.r: guide surnames to match; opts.dSideName: treat this candidate as the D side (Osborn).
 */
export function readRace(race, opts = {}) {
  if (!race) return null;
  const c = (race.candidates || []).map((x) => ({ ...x, votes: Number(x.votes) || 0 }));
  const total = c.reduce((s, x) => s + x.votes, 0);
  const byName = (sn) => sn && c.find((x) => norm(surname(x.name)) === norm(sn) || norm(x.name).includes(norm(sn)));
  const best = (pred) => c.filter(pred).sort((a, b) => b.votes - a.votes)[0];
  let dc = (opts.dSideName && byName(opts.dSideName)) || byName(opts.d) || best((x) => isDem(x.party)) || (opts.allowInd && best((x) => /independent/i.test(x.party)));
  let rc = byName(opts.r) || best((x) => isRep(x.party) && x !== dc);
  if (rc === dc) rc = best((x) => isRep(x.party) && x !== dc);
  const pct = (x) => (x ? (total ? (x.votes / total) * 100 : Number(x.percent) || 0) : null);
  const pd = pct(dc), pr = pct(rc);
  const rep = Number(race.percent_reporting) || 0;
  const hasVotes = total > 0;
  const margin = hasVotes && pd !== null && pr !== null ? pd - pr : null;
  const winner = c.find((x) => x.winner);
  let called = null;
  if (winner) called = winner === dc ? 'd' : winner === rc ? 'r' : 'o';
  let leader = null;
  if (hasVotes) {
    const sorted = [...c].sort((a, b) => b.votes - a.votes);
    const top = sorted[0];
    leader = sorted[1] && sorted[1].votes === top.votes ? 'tie' : top === dc ? 'd' : top === rc ? 'r' : 'o';
  }
  const winners = c.filter((x) => x.winner).length;
  return {
    id: race.id, name: race.election_name, rep, total, hasVotes, margin, pd, pr, dc, rc, called, leader, candidates: c,
    updated: race.last_updated, testData: race.test_data,
  };
}

export const raceById = (id) => (id ? data.races.get(Number(id)) : null);

// ---------- statewide guide races ----------
export function statewide(st, office) {
  const s = STATES[st];
  const g = s?.races.find((r) => r.office === office);
  const id = RACE_IDS[office]?.[st];
  const race = raceById(id);
  const res = office === 'senate' ? readSenate(race, g) : readRace(race, { d: g?.d, r: g?.r, dSideName: g?.dSideName });
  return { st, office, guide: g, state: s, id, race, res, bench: benchmarks(st, office) };
}
export function allStatewide() {
  const out = [];
  for (const [st, s] of Object.entries(STATES)) for (const r of s.races) out.push(statewide(st, r.office));
  return out;
}

/** County benchmark table + uniform-swing implied statewide margin. */
export function benchmarks(st, office) {
  const s = STATES[st];
  if (!s || !s.counties.length) return null;
  const g = s.races.find((r) => r.office === office);
  const id = RACE_IDS[office]?.[st];
  const det = data.details.get(Number(id));
  const regions = det?.region_results ? Object.values(det.region_results) : [];
  const counties = regions.filter((x) => !x.type || /county|parish|borough/i.test(x.type));
  let wSum = 0, wImplied = 0, expectedIn = 0;
  const rows = s.counties.map(([name, share, m2024, toTie, inBy, tag]) => {
    const region = counties.find((x) => norm(x.name) === norm(name)) || regions.find((x) => norm(x.name) === norm(name));
    const res = region ? readRace({ ...region, id: `${id}:${name}` }, { d: g?.d, r: g?.r, dSideName: g?.dSideName }) : null;
    const live = res?.hasVotes ? res.margin : null;
    const rep = region ? Number(region.percent_reporting) || 0 : null;
    const ifForecast = toTie + (g?.forecast ?? 0);
    const vsTie = live !== null ? live - toTie : null;
    if (live !== null) {
      const w = share * Math.max(0.05, (rep ?? 50) / 100);
      wSum += w; wImplied += w * vsTie; expectedIn += share * ((rep ?? 0) / 100);
    }
    return { name, share, m2024, toTie, ifForecast, inBy, tag, live, rep, vsTie, vsForecast: live !== null ? live - ifForecast : null, res };
  });
  const implied = wSum > 0 ? wImplied / wSum : null;
  const coverage = s.counties.reduce((a, c) => a + c[1], 0);
  const used = rows.filter((r) => r.live !== null);
  // County-benchmark estimate: weighted average of (live county margin - tie target). Shown once 2+ counties report.
  const estimate = used.length >= 2 ? {
    value: implied, n: used.length, of: rows.length,
    sharePct: used.reduce((a2, r) => a2 + r.share, 0),
    minRep: Math.min(...used.map((r) => r.rep ?? 0)), counties: used.map((r) => `${r.name} ${r.rep ?? '?'}%`),
  } : null;
  return { rows, implied, estimate, expectedIn, coverage, n: used.length, office, appliesTo: s.races[0].office };
}

// ---------- tiers ----------
export const TIER_KEYS = ['riptide', 'tide', 'wave', 'tsunami'];
export function tierFromBreaks(margin, breaks) {
  if (margin === null || margin === undefined || !breaks) return null;
  if (margin < breaks[0]) return 'riptide';
  if (margin < breaks[1]) return 'tide';
  if (margin < breaks[2]) return 'wave';
  return 'tsunami';
}
export const senateStateTier = (st, m) => tierFromBreaks(m, SENATE_TIER_BARS[st]);
export const houseSeatBreaks = (ddhq) => [ddhq - 4, ddhq, ddhq + 4];
export function senateNetTier(net) {
  if (net === null) return null;
  if (net <= 0) return 'riptide';
  if (net <= 3) return 'tide';
  if (net <= 6) return 'wave';
  return 'tsunami';
}
export function houseSeatsTier(seats) {
  if (seats === null) return null;
  if (seats < 218) return 'riptide';
  if (seats < 230) return 'tide';
  if (seats < 240) return 'wave';
  return 'tsunami';
}

// ---------- House seats ----------
const houseMeta = (() => {
  const m = {};
  const put = (d, o) => { m[d] = { ...(m[d] || {}), ...o, d }; };
  HOUSE_WATCH.forEach((g) => g.races.forEach(([d, dn, rn, inc, lean]) => put(d, { dn, rn, inc, lean, watch: true, held: inc || OPEN_SEAT_HOLDER[d] || null })));
  EARLY_HOUSE.forEach(([d, dn, rn, inc, , lateR, m2024]) => put(d, { dn: m[d]?.dn || dn, rn: m[d]?.rn || rn, inc: m[d]?.inc ?? inc, lateR, m2024, early: true, held: m[d]?.held || inc || OPEN_SEAT_HOLDER[d] || null }));
  HOUSE_TIER_SEATS.forEach((g) => g.seats.forEach(([d, holder, , redrawn]) => put(d, { holder, redrawn: !!redrawn, held: m[d]?.held || (/\(D\)/.test(holder) ? 'd' : 'r') })));
  // NE-02 is referenced by the guide's 8 PM notes but is not in its 85-race list; candidates come from civicAPI.
  put('NE-02', { held: 'r', inc: null, note: 'Open seat (Bacon, R, retiring). Not in the guide\'s 85-race list.' });
  put('NV-03', { held: 'd', inc: 'd', note: 'Referenced in the guide\'s 9 PM notes; not in its 85-race list.' });
  for (const d of Object.keys(m)) {
    const c = districtClose(d);
    m[d].close = c.all; m[d].closeMost = c.most; m[d].closeNote = c.note || '';
    m[d].ddhq = ddhqFor(d);
    if (m[d].lean === undefined && m[d].m2024 !== undefined) m[d].lean = m[d].m2024;
  }
  return m;
})();
export const HOUSE_META = houseMeta;

export function house(dist) {
  const meta = houseMeta[dist] || { d: dist, close: districtClose(dist).all, ddhq: ddhqFor(dist) };
  const id = RACE_IDS.house[dist];
  const race = raceById(id);
  const res = readRace(race, { d: meta.dn, r: meta.rn });
  const st = raceStatus(res, { close: meta.close, covered: !!id });
  const party = res?.called || (res?.hasVotes ? res.leader : null);
  const flip = !!(party && meta.held && (party === 'd' || party === 'r') && party !== meta.held && !REDRAWN.has(dist));
  const vsForecast = res?.hasVotes && res.margin !== null && meta.ddhq !== null && meta.ddhq !== undefined ? res.margin - meta.ddhq : null;
  return { dist, meta, id, race, res, status: st.key, st, party, flip, vsForecast };
}

// ---------- national tallies ----------
function aggSeats(id) {
  const r = raceById(id);
  if (!r) return null;
  const c = r.candidates || [];
  const d = c.find((x) => /^democrat/i.test(x.name) || isDem(x.party));
  const rr = c.find((x) => /^republican/i.test(x.name) || isRep(x.party));
  if (!d || !rr) return null;
  return { d: Number(d.seats) || 0, r: Number(rr.seats) || 0, others: c.filter((x) => x !== d && x !== rr).reduce((s, x) => s + (Number(x.seats) || 0), 0) };
}

/**
 * Senate races: independents count on the Democratic side (they caucus with Democrats).
 * If no Democrat is running, the strongest independent is the D-side candidate (e.g. Osborn in NE).
 * If an independent wins or leads a race that also has a Democrat, the seat is still Democratic-aligned.
 * Margins in that case compare the leading D-aligned candidate (D or I) with the Republican.
 */
export function readSenate(raw, g) {
  if (!raw) return null;
  const res = readRace(raw, { d: g?.d, r: g?.r, dSideName: g?.dSideName, allowInd: true });
  const isInd = (c) => c && /independent/i.test(c.party || '');
  res.indAligned = isInd(res.dc);
  const c = res.candidates;
  const top = [...c].sort((a, b) => b.votes - a.votes)[0];
  const winner = c.find((x) => x.winner);
  if (res.called === 'o' && isInd(winner)) { res.called = 'd'; res.indAligned = true; res.dc = winner; }
  if (!res.called && res.hasVotes && res.leader === 'o' && isInd(top)) {
    // an independent leads a race that also has a Democrat: measure the independent against the Republican
    const tot = res.total || 1;
    res.dc = top; res.pd = (top.votes / tot) * 100; res.margin = res.pr !== null ? res.pd - res.pr : null; res.leader = 'd'; res.indAligned = true;
  }
  return res;
}

/** Senate: 34 D and 31 R seats are not on the ballot (holdovers); 35 seats are up in 2026. The guide's 34 includes
 * the two independents who caucus with Democrats (King, Sanders), matching its 47-seat Democratic starting point. */
export function senateTally() {
  let calledD = 0, calledR = 0, calledO = 0, leadD = 0, leadR = 0, tied = 0, noVotes = 0, noVotesFcD = 0, unavailable = 0, indD = 0, indLeadD = 0;
  const seats = SENATE.path.map(([st, ddhq, held]) => {
    const g = STATES[st]?.races.find((r) => r.office === 'senate');
    const raw = raceById(RACE_IDS.senate[st]);
    const res = readSenate(raw, g);
    let side = null, kind;
    if (!raw) { kind = 'unavailable'; unavailable++; }
    else if (res.called) { side = res.called; kind = 'called'; side === 'd' ? calledD++ : side === 'r' ? calledR++ : calledO++; if (side === 'd' && res.indAligned) indD++; }
    else if (res.hasVotes && res.margin !== null) {
      if (Math.abs(res.margin) < 0.05) { kind = 'tied'; tied++; } else { side = res.margin > 0 ? 'd' : 'r'; kind = 'leading'; side === 'd' ? leadD++ : leadR++; if (side === 'd' && res.indAligned) indLeadD++; }
    } else { kind = 'novotes'; noVotes++; if (ddhq > 0) noVotesFcD++; }
    return { st, ddhq, held, side, kind, res, flip: !!side && kind !== 'novotes' && side !== held.toLowerCase() };
  });
  const securedD = SENATE.dNotUp + calledD, securedR = SENATE.rNotUp + calledR;
  // Scenario (not a projection): current leaders win, and forecast favorites win races with no votes yet.
  const scenarioD = securedD + leadD + noVotesFcD;
  const agg = aggSeats(RACE_IDS.aggregate.senate);
  return {
    seats, calledD, calledR, calledO, leadD, leadR, tied, noVotes, noVotesFcD, unavailable, indD, indLeadD,
    holdD: SENATE.dNotUp, holdR: SENATE.rNotUp, securedD, securedR, up: SENATE.path.length,
    uncalled: SENATE.path.length - calledD - calledR - calledO,
    scenarioD, scenarioNet: scenarioD - SENATE.dBefore, scenarioTier: senateNetTier(scenarioD - SENATE.dBefore),
    anyResults: calledD + calledR + calledO + leadD + leadR + tied > 0,
    control: securedD >= 51 ? 'd' : securedR >= 50 ? 'r' : null, // 50 R seats + VP tiebreak = control
    feedCheck: agg ? { d: agg.d, r: agg.r, matches: agg.d === securedD && agg.r === securedR } : null,
  };
}

/** House: computed from all 435 district races so every number reconciles. civicAPI's national tally is a cross-check. */
export function houseTally() {
  let calledD = 0, calledR = 0, calledO = 0, leadD = 0, leadR = 0, leadO = 0, tied = 0, noVotes = 0, unavailable = 0;
  const dists = [...new Set(Object.keys(RACE_IDS.house))];
  for (const dist of dists) {
    const h = house(dist);
    const r = h.res;
    if (!h.race) unavailable++;
    else if (r.called === 'd') calledD++;
    else if (r.called === 'r') calledR++;
    else if (r.called) calledO++;
    else if (r.hasVotes) {
      if (r.margin !== null && Math.abs(r.margin) < 0.05) tied++;
      else if (r.leader === 'd') leadD++; else if (r.leader === 'r') leadR++; else leadO++;
    } else noVotes++;
  }
  const called = calledD + calledR + calledO;
  const agg = aggSeats(RACE_IDS.aggregate.house);
  return {
    total: dists.length, calledD, calledR, calledO, called, uncalled: dists.length - called,
    leadD, leadR, leadO, tied, noVotes, unavailable,
    needD: Math.max(0, 218 - calledD), needR: Math.max(0, 218 - calledR),
    control: calledD >= 218 ? 'd' : calledR >= 218 ? 'r' : null,
    reconciles: calledD + calledR + calledO + leadD + leadR + leadO + tied + noVotes + unavailable === dists.length,
    feedCheck: agg ? { d: agg.d, r: agg.r, matches: agg.d === calledD && agg.r === calledR } : null,
  };
}

export function governorTally() {
  let calledD = 0, calledR = 0, leadD = 0, leadR = 0, up = 0;
  for (const [st, id] of Object.entries(RACE_IDS.governor)) {
    if (st.length !== 2 || ['GU', 'VI', 'MP', 'US'].includes(st)) continue;
    up++;
    const g = STATES[st]?.races.find((r) => r.office === 'governor');
    const res = readRace(raceById(id), { d: g?.d, r: g?.r });
    if (!res) continue;
    if (res.called === 'd') calledD++; else if (res.called === 'r') calledR++;
    else if (res.hasVotes) (res.leader === 'd' ? leadD++ : leadR++);
  }
  return { up, calledD, calledR, leadD, leadR };
}

// ---------- How results compare with DDHQ ----------
// House: only districts with a DDHQ margin that are called or at least 85% reporting count. Partial counts are
// not treated as representative. The estimate is withheld until 10+ districts from 4+ states qualify.
export const SWING_MIN = { districts: 10, states: 4, reporting: 85 };
const quantile = (arr, q) => { const a = [...arr].sort((x, y) => x - y); const i = (a.length - 1) * q; const lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };

export function houseSwing() {
  const items = [];
  let partial = 0;
  for (const dist of Object.keys(DDHQ)) {
    const h = house(dist);
    const r = h.res;
    if (!r?.hasVotes || r.margin === null) continue;
    if (!r.called && r.rep < SWING_MIN.reporting) { partial++; continue; }
    items.push({ key: dist, st: dist.slice(0, 2), miss: r.margin - DDHQ[dist], rep: r.rep, called: !!r.called, margin: r.margin, ddhq: DDHQ[dist] });
  }
  const states = new Set(items.map((x) => x.st)).size;
  const enough = items.length >= SWING_MIN.districts && states >= SWING_MIN.states;
  const misses = items.map((x) => x.miss);
  const median = items.length ? quantile(misses, 0.5) : null;
  const lo = items.length ? quantile(misses, 0.25) : null, hi = items.length ? quantile(misses, 0.75) : null;
  return {
    items, n: items.length, states, partial, enough, median, lo, hi,
    seats: enough ? houseSeatsAtShift(median) : null,
    seatsLo: enough ? houseSeatsAtShift(lo) : null, seatsHi: enough ? houseSeatsAtShift(hi) : null,
  };
}

// Statewide races: compare the county-benchmark estimate (needs 3+ guide counties at 50%+) or, failing that,
// the statewide margin once 85%+ is reported.
export function statewideSwing() {
  const items = [];
  for (const sw of allStatewide()) {
    const f = sw.guide?.forecast;
    if (f === undefined) continue;
    const b = sw.bench;
    const solid = b ? b.rows.filter((r) => r.live !== null && (r.rep ?? 0) >= 50) : [];
    if (b && solid.length >= 3) {
      const w = solid.reduce((s, r) => s + r.share, 0);
      const est = solid.reduce((s, r) => s + r.share * r.vsTie, 0) / w;
      items.push({ key: `${sw.st} ${sw.office === 'senate' ? 'Sen' : 'Gov'}`, miss: est - f, src: `${solid.length} counties ≥50% in`, rep: sw.res?.rep ?? 0 });
    } else if (sw.res?.hasVotes && (sw.res.called || sw.res.rep >= 85)) {
      items.push({ key: `${sw.st} ${sw.office === 'senate' ? 'Sen' : 'Gov'}`, miss: sw.res.margin - f, src: `statewide, ${sw.res.rep}% in`, rep: sw.res.rep });
    }
  }
  const median = items.length ? quantile(items.map((x) => x.miss), 0.5) : null;
  return { items, n: items.length, median, enough: items.length >= 4, senateSeats: items.length >= 4 ? senateSeatsAtShift(median) : null };
}

/** Back-compat summary used by the header ticker. */
export function nightMiss() {
  const h = houseSwing();
  return { miss: h.enough ? h.median : null, n: h.n, houseSeats: h.seats, enough: h.enough };
}

// ---------- House "how big is the night" race examples ----------
export function houseSignals() {
  return HOUSE_SIGNALS.map((s) => {
    const rs = s.races.map((d) => house(d));
    const wonD = rs.filter((h) => h.res?.called === 'd').length;
    const leadD = rs.filter((h) => !h.res?.called && h.res?.hasVotes && h.res.leader === 'd').length;
    const lostD = rs.filter((h) => h.res?.called === 'r').length;
    let state = 'waiting';
    if (s.mode === 'all') {
      if (wonD === rs.length) state = 'hit';
      else if (lostD > 0) state = 'miss';
      else if (wonD + leadD === rs.length) state = 'leaning';
      else if (rs.some((h) => h.res?.hasVotes)) state = 'trailing';
    } else {
      if (wonD > 0) state = 'hit';
      else if (lostD === rs.length) state = 'miss';
      else if (leadD > 0) state = 'leaning';
      else if (rs.some((h) => h.res?.hasVotes)) state = 'trailing';
    }
    return { ...s, rs, state };
  });
}
export function riptideTests() {
  return RED_RIPTIDE_TESTS.map((t) => {
    const rs = t.races.map((d) => house(d));
    const gopWon = rs.filter((h) => h.res?.called === 'r').length;
    const dWon = rs.filter((h) => h.res?.called === 'd').length;
    const gopLead = rs.filter((h) => !h.res?.called && h.res?.hasVotes && h.res.leader === 'r').length;
    const uncalled = rs.length - gopWon - dWon;
    let state = 'waiting';
    if (gopWon >= t.need) state = 'hit';
    else if (t.of - dWon < t.need) state = 'miss';
    else if (gopWon + gopLead >= t.need) state = 'leaning';
    else if (rs.some((h) => h.res?.hasVotes)) state = 'trailing';
    return { ...t, rs, state, gopWon, dWon, gopLead, uncalled };
  });
}

// ---------- tells ----------
const live = (st, office) => statewide(st, office);
function county(st, office, name) { return benchmarks(st, office)?.rows.find((r) => norm(r.name) === norm(name)); }

const EVAL = {
  ncEarlyCall(t) {
    const r = live('NC', 'senate').res;
    if (r?.called === 'd') return { state: 'hit', ev: 'Called for Cooper' };
    if (t > hhmm('19:15')) return { state: 'miss', ev: r?.hasVotes ? `Not called · ${fmt(r.margin)} with ${r.rep}% in` : 'Not called at poll close' };
    return { state: 'waiting', ev: r?.hasVotes ? `${fmt(r.margin)} · ${r.rep}% in` : 'Waiting for the call' };
  },
  grahamBig() {
    const r = live('SC', 'senate');
    const m = r.bench?.implied ?? r.res?.margin;
    if (m === null || m === undefined) return { state: 'waiting', ev: 'No votes yet' };
    const big = m <= -8; // riptide threshold on the SC bar
    const src = r.bench?.implied !== null && r.bench?.implied !== undefined ? 'County benchmarks imply' : 'Statewide';
    return { state: big ? 'hit' : (r.res?.rep ?? 0) > 50 ? 'miss' : 'pending', soft: !r.res?.called, ev: `${src} ${fmt(m)} (riptide line is R+8)` };
  },
  brownAhead() {
    const r = live('OH', 'senate');
    const m = r.bench?.implied ?? r.res?.margin;
    if (m === null || m === undefined) return { state: 'waiting', ev: 'No votes yet' };
    // Brown's own 2024 Senate race: Moreno won 50.1% to 46.5% (R+3.6).
    const ahead = m - -3.6;
    return { state: ahead >= 4 ? 'hit' : 'miss', soft: !r.res?.called, ev: `Brown ${fmt(m)} vs his 2024 result R+3.6 → ${ahead >= 0 ? '+' : ''}${ahead.toFixed(1)} pts` };
  },
  paxtonTrailsAbbott() {
    const s = live('TX', 'senate').res, g = live('TX', 'governor').res;
    if (!s?.hasVotes || !g?.hasVotes) return { state: 'waiting', ev: 'Waiting for Texas votes' };
    const gap = s.margin - g.margin;
    return { state: gap > 0 ? 'hit' : 'miss', soft: true, ev: `Talarico ${fmt(s.margin)} vs Hinojosa ${fmt(g.margin)}: Paxton runs ${Math.abs(gap).toFixed(1)} pts ${gap > 0 ? 'behind' : 'ahead of'} Abbott` };
  },
  elSayedWayne() {
    const c = county('MI', 'senate', 'Wayne');
    if (!c || c.live === null) return { state: 'waiting', ev: 'Wayne County not reporting yet' };
    const lag = c.live - c.m2024;
    return { state: lag < -2 ? 'hit' : 'miss', soft: true, ev: `Wayne ${fmt(c.live)} (${c.rep ?? '?'}% in) vs Harris D+29 → ${lag >= 0 ? '+' : ''}${lag.toFixed(1)}` };
  },
  flSenUncalled(t) {
    const r = live('FL', 'senate').res;
    if (r?.called === 'r') return { state: 'miss', ev: 'Called for Moody' };
    if (t >= hhmm('20:00')) return { state: 'hit', ev: r?.hasVotes ? `Uncalled at 8 PM · ${fmt(r.margin)} with ${r.rep}% in` : 'Uncalled' };
    return { state: 'waiting', ev: r?.hasVotes ? `${fmt(r.margin)} · ${r.rep}% in` : 'Check at 8 PM' };
  },
  talaricoSouthTX() {
    // The feed reports counties, not "South Texas". El Paso is the only South/West Texas county with a 2024
    // baseline in the guide (Harris D+15), so it is the proxy.
    const c = county('TX', 'senate', 'El Paso');
    if (!c || c.live === null) return { state: 'waiting', ev: 'El Paso County not reporting yet (closes 8 PM CT)' };
    const d = c.live - c.m2024;
    return { state: d > 0 ? 'hit' : 'miss', soft: (c.rep ?? 0) < 90, ev: `El Paso ${fmt(c.live)} (${c.rep ?? '?'}% in) vs Harris '24 D+15 → ${d >= 0 ? '+' : ''}${d.toFixed(1)}` };
  },
  flGovUncalled(t) {
    const r = live('FL', 'governor').res;
    if (r?.called === 'r') return { state: 'miss', ev: 'Called for Donalds' };
    if (t >= hhmm('20:00')) return { state: 'hit', ev: r?.hasVotes ? `Uncalled · ${fmt(r.margin)} with ${r.rep}% in` : 'Uncalled' };
    return { state: 'waiting', ev: 'Check 8 to 9 PM' };
  },
  hamiltonJohnson() {
    const c = county('KS', 'senate', 'Johnson');
    if (!c || c.live === null) return { state: 'waiting', ev: 'Johnson County not reporting yet' };
    return { state: c.live >= 20 ? 'hit' : 'miss', soft: (c.rep ?? 0) < 90, ev: `Johnson County ${fmt(c.live)} with ${c.rep ?? '?'}% in (needs D+20)` };
  },
  gaGovEarlyR() {
    const r = live('GA', 'governor').res;
    const fulton = county('GA', 'governor', 'Fulton');
    if (r?.called === 'r') return { state: (fulton?.rep ?? 0) < 60 ? 'hit' : 'miss', ev: `Called for Jackson with Fulton ${fulton?.rep ?? '?'}% in` };
    if (r?.called === 'd') return { state: 'miss', ev: 'Called for Bottoms' };
    return { state: 'waiting', ev: r?.hasVotes ? `Uncalled · ${fmt(r.margin)} · Fulton ${fulton?.rep ?? 0}% in` : 'Waiting' };
  },
  abbottUncalled(t) {
    const r = live('TX', 'governor').res;
    if (r?.called === 'r') return { state: 'miss', ev: 'Called for Abbott' };
    const h = data.history[RACE_IDS.governor.TX] || [];
    const recent = h.filter((x) => x[0] >= t - 90 && x[2] !== null);
    const shrinking = recent.length >= 2 && recent[recent.length - 1][2] > recent[0][2];
    if (t >= hhmm('22:00') && r?.hasVotes) return { state: shrinking ? 'hit' : 'leaning-no', ev: `Uncalled · Abbott ${fmt(r.margin)}${shrinking ? ', lead shrinking' : ''}` };
    return { state: 'waiting', ev: r?.hasVotes ? `Abbott ${fmt(r.margin)} · ${r.rep}% in` : 'Check at 10 PM' };
  },
  senateUnresolved(t) {
    const s = senateTally();
    if (s.control) return { state: 'miss', ev: `Control called: ${s.control === 'd' ? 'Democrats' : 'Republicans'}` };
    if (t >= hhmm('26:00')) return { state: 'hit', ev: `Unresolved · D ${s.officialD} / R ${s.officialR} called` };
    return { state: 'waiting', ev: `D ${s.officialD} / R ${s.officialR} called so far` };
  },
};
const fmt = (m) => (m === null || m === undefined ? '—' : Math.abs(m) < 0.05 ? 'Even' : `${m > 0 ? 'D' : 'R'}+${Math.abs(m).toFixed(1)}`);

// Tell evaluation. kind: 'auto' (checked from live data), 'manual' (needs a human: data the feed does not have).
// state: hit / miss / pending (data in, not decisive) / notyet (window not open or no data) / manual.
export function evalTell(tell) {
  const t = nowNight();
  const start = hhmm(tell.win[0]), end = hhmm(tell.win[1]);
  const phase = t < start ? 'upcoming' : t <= end ? 'active' : 'past';
  if (!tell.auto || !EVAL[tell.auto]) return { phase, kind: 'manual', state: 'manual', ev: tell.manualNote || 'The feed does not carry the data needed; check by hand.' };
  try {
    const r = EVAL[tell.auto](t);
    let state = r.state;
    if (state === 'waiting') state = 'notyet';
    if (phase === 'upcoming' && state !== 'hit') state = 'notyet';
    return { phase, kind: 'auto', ...r, state };
  } catch (e) {
    console.warn(e);
    return { phase, kind: 'auto', state: 'notyet', ev: '' };
  }
}

// ---------- Wisconsin legislature ----------
export function wiDistrict(key) {
  const id = RACE_IDS.wi[key];
  const race = raceById(id);
  const res = readRace(race, {});
  return { key, id, race, res };
}
export function wiChamber(kind) {
  const conf = WI_LEG[kind];
  const prefix = kind === 'senate' ? 'SD' : 'AD';
  const keys = Object.keys(RACE_IDS.wi).filter((k) => k.startsWith(prefix));
  let calledD = 0, calledR = 0, leadD = 0, leadR = 0, noVotes = 0, unavailable = 0;
  const seats = keys.map((k) => {
    const r = wiDistrict(k);
    if (!r.race) unavailable++;
    else if (r.res.called === 'd') calledD++;
    else if (r.res.called === 'r') calledR++;
    else if (r.res.hasVotes) (r.res.leader === 'd' ? leadD++ : leadR++);
    else noVotes++;
    return r;
  });
  const holdD = kind === 'senate' ? conf.dHoldovers : 0;
  const holdR = kind === 'senate' ? conf.rHoldovers : 0;
  const up = kind === 'senate' ? conf.up : conf.seats;
  const securedD = holdD + calledD, securedR = holdR + calledR;
  return { conf, seats, up, tracked: keys.length, holdD, holdR, calledD, calledR, leadD, leadR, noVotes, unavailable,
    uncalled: up - calledD - calledR, securedD, securedR, needD: Math.max(0, conf.majority - securedD), needR: Math.max(0, conf.majority - securedR) };
}

/** Minnesota legislature, computed from civicAPI district races (province MN, State House / State Senate). */
export function mnChamber(kind) {
  const type = kind === 'senate' ? 'State Senate' : 'State House';
  const races = [...data.races.values()].filter((r) => r.province === 'MN' && r.type === type && r.district);
  let calledD = 0, calledR = 0, leadD = 0, leadR = 0, noVotes = 0;
  const rows = races.map((race) => {
    const res = readRace(race, {});
    if (res.called === 'd') calledD++; else if (res.called === 'r') calledR++;
    else if (res.hasVotes) (res.leader === 'd' ? leadD++ : leadR++); else noVotes++;
    return { race, res, name: race.election_name.replace('Minnesota State ', '') };
  });
  const seats = kind === 'senate' ? 67 : 134;
  const majority = kind === 'senate' ? 34 : 68;
  return { rows, seats, majority, found: races.length, calledD, calledR, leadD, leadR, noVotes,
    needD: Math.max(0, majority - calledD), needR: Math.max(0, majority - calledR) };
}

// ---------- chambers (statewide aggregate rows) ----------
export function chamberByName(name) {
  const id = RACE_IDS.chambers[name];
  const race = raceById(id);
  if (!race) return { id, race: null };
  const c = race.candidates || [];
  const d = c.filter((x) => isDem(x.party) || /^democrat/i.test(x.name)).reduce((s, x) => s + (Number(x.seats) || 0), 0);
  const r = c.filter((x) => isRep(x.party) || /^republican/i.test(x.name)).reduce((s, x) => s + (Number(x.seats) || 0), 0);
  const o = c.filter((x) => !(isDem(x.party) || isRep(x.party))).reduce((s, x) => s + (Number(x.seats) || 0), 0);
  return { id, race, d, r, o, seats: race.seats, rep: race.percent_reporting };
}

// ---------- Texas benchmarks ----------
export function texasChecks() {
  const det = data.details.get(Number(RACE_IDS.senate.TX));
  const regions = det?.region_results ? Object.values(det.region_results).filter((x) => !x.type || /county/i.test(x.type)) : [];
  const read = (name) => { const reg = regions.find((x) => norm(x.name) === norm(name)); return reg ? readRace({ ...reg, id: name }, { d: 'Talarico', r: 'Paxton' }) : null; };
  const harris = read('Harris');
  const totals = regions.map((reg) => ({ name: reg.name, total: (reg.candidates || []).reduce((s, x) => s + (Number(x.votes) || 0), 0) }));
  const all = totals.reduce((s, x) => s + x.total, 0);
  const big5 = TEXAS.checks.big5.counties.reduce((s, n) => s + (totals.find((x) => norm(x.name) === norm(n))?.total || 0), 0);
  const top25 = new Set(TEXAS.checks.rural.top25.map(norm));
  const rural = totals.filter((x) => !top25.has(norm(x.name))).reduce((s, x) => s + x.total, 0);
  return {
    harris: harris?.hasVotes ? { margin: harris.margin, rep: harris.rep } : null,
    big5: all ? (big5 / all) * 100 : null,
    rural: all ? (rural / all) * 100 : null,
    allVotes: all,
  };
}

// ---------- reporting pace ----------
export function stateReporting(st) {
  const s = STATES[st];
  if (s) {
    const r = statewide(st, s.races[0].office).res;
    if (r) return r.rep;
  }
  for (const office of ['senate', 'governor']) {
    const r = raceById(RACE_IDS[office]?.[st]);
    if (r) return Number(r.percent_reporting) || 0;
  }
  let max = null;
  for (const [d, id] of Object.entries(RACE_IDS.house)) {
    if (!d.startsWith(st + '-')) continue;
    const r = raceById(id);
    if (r) max = Math.max(max ?? 0, Number(r.percent_reporting) || 0);
  }
  return max;
}
