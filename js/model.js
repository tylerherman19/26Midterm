// Derived results: margins, calls, benchmarks, tiers, tells, and the night-level projections.

import { data, nowNight } from './api.js';
import { RACE_IDS } from './data/raceIds.js';
import {
  STATES, SENATE, SENATE_TIER_BARS, HOUSE, HOUSE_TIER_SEATS, HOUSE_WATCH, EARLY_HOUSE, OPEN_SEAT_HOLDER, HOUSE_SIGNALS,
  RED_RIPTIDE_TESTS, WI_LEG, TEXAS,
} from './data/guide.js';
import { norm, surname, hhmm, interp } from './util.js';

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
  let dc = (opts.dSideName && byName(opts.dSideName)) || byName(opts.d) || best((x) => isDem(x.party)) || (opts.allowInd !== false && best((x) => /independent/i.test(x.party)));
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
    const top = [...c].sort((a, b) => b.votes - a.votes)[0];
    leader = top === dc ? 'd' : top === rc ? 'r' : 'o';
  }
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
  const res = readRace(race, { d: g?.d, r: g?.r, dSideName: g?.dSideName });
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
  return { rows, implied, expectedIn, coverage, n: rows.filter((r) => r.live !== null).length };
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
  HOUSE_WATCH.forEach((g) => g.races.forEach(([d, dn, rn, inc, lean]) => {
    m[d] = { d, dn, rn, inc, lean, close: g.time, held: inc || OPEN_SEAT_HOLDER[d] || null, watch: true };
  }));
  EARLY_HOUSE.forEach(([d, dn, rn, inc, close, lateR, m2024, ddhq]) => {
    m[d] = { ...(m[d] || {}), d, dn: m[d]?.dn || dn, rn: m[d]?.rn || rn, inc, close: m[d]?.close || close, lateR, m2024, ddhq, held: m[d]?.held || inc || OPEN_SEAT_HOLDER[d] };
  });
  HOUSE_TIER_SEATS.forEach((g) => g.seats.forEach(([d, holder, ddhq, redrawn]) => {
    const held = /\(D\)/.test(holder) ? 'd' : 'r';
    m[d] = { ...(m[d] || {}), d, holder, ddhq, redrawn: !!redrawn, close: m[d]?.close || g.time, held: m[d]?.held || held };
  }));
  return m;
})();
export const HOUSE_META = houseMeta;

export function house(dist) {
  const meta = houseMeta[dist] || { d: dist };
  const id = RACE_IDS.house[dist];
  const race = raceById(id);
  const res = readRace(race, { d: meta.dn, r: meta.rn });
  let status = 'waiting';
  if (res?.called) status = 'called';
  else if (res?.hasVotes) status = 'counting';
  const party = res?.called || (res?.hasVotes ? res.leader : null);
  const flip = party && meta.held && (party === 'd' || party === 'r') && party !== meta.held;
  return { dist, meta, id, race, res, status, party, flip };
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

export function senateTally() {
  let calledD = 0, calledR = 0, leadD = 0, leadR = 0, waitD = 0, waitR = 0;
  const seats = SENATE.path.map(([st, ddhq, held]) => {
    const g = STATES[st]?.races.find((r) => r.office === 'senate');
    const res = readRace(raceById(RACE_IDS.senate[st]), { d: g?.d, r: g?.r, dSideName: g?.dSideName });
    let side, kind;
    if (res?.called === 'd' || res?.called === 'r') { side = res.called; kind = 'called'; }
    else if (res?.called === 'o') { side = st === 'NE' ? 'd' : 'r'; kind = 'called'; }
    else if (res?.hasVotes && res.margin !== null) { side = res.margin >= 0 ? 'd' : 'r'; kind = 'leading'; }
    else { side = ddhq > 0 ? 'd' : 'r'; kind = 'forecast'; }
    if (kind === 'called') side === 'd' ? calledD++ : calledR++;
    else if (kind === 'leading') side === 'd' ? leadD++ : leadR++;
    else side === 'd' ? waitD++ : waitR++;
    return { st, ddhq, held, side, kind, res, flip: side !== held.toLowerCase() };
  });
  const agg = aggSeats(RACE_IDS.aggregate.senate);
  // Prefer civicAPI's official seat count for called races when available (includes holdovers)
  const officialD = agg ? agg.d : SENATE.dNotUp + calledD;
  const officialR = agg ? agg.r : SENATE.rNotUp + calledR;
  const projD = SENATE.dNotUp + calledD + leadD + waitD;
  return {
    seats, calledD, calledR, leadD, leadR, waitD, waitR, officialD, officialR,
    dNotUp: SENATE.dNotUp, rNotUp: SENATE.rNotUp, projD, projR: 100 - projD,
    net: projD - SENATE.dBefore, tier: senateNetTier(projD - SENATE.dBefore),
    control: officialD >= 51 ? 'd' : officialR >= 50 ? 'r' : null,
  };
}

export function houseTally() {
  let calledD = 0, calledR = 0, leadD = 0, leadR = 0, waiting = 0;
  for (const dist of Object.keys(RACE_IDS.house)) {
    const h = house(dist);
    if (h.res?.called === 'd') calledD++;
    else if (h.res?.called === 'r') calledR++;
    else if (h.res?.hasVotes) (h.res.leader === 'd' ? leadD++ : leadR++);
    else waiting++;
  }
  const agg = aggSeats(RACE_IDS.aggregate.house);
  const officialD = agg && agg.d >= calledD ? agg.d : calledD;
  const officialR = agg && agg.r >= calledR ? agg.r : calledR;
  return { calledD: officialD, calledR: officialR, leadD, leadR, waiting, total: 435,
    control: officialD >= 218 ? 'd' : officialR >= 218 ? 'r' : null };
}

export function governorTally() {
  const agg = aggSeats(RACE_IDS.aggregate.governor);
  let calledD = 0, calledR = 0, leadD = 0, leadR = 0, flips = [];
  for (const [st, id] of Object.entries(RACE_IDS.governor)) {
    if (st.length !== 2 || ['GU', 'VI', 'MP'].includes(st)) continue;
    const g = STATES[st]?.races.find((r) => r.office === 'governor');
    const res = readRace(raceById(id), { d: g?.d, r: g?.r });
    if (!res) continue;
    if (res.called === 'd') calledD++; else if (res.called === 'r') calledR++;
    else if (res.hasVotes) (res.leader === 'd' ? leadD++ : leadR++);
  }
  return { calledD: agg?.d ?? calledD, calledR: agg?.r ?? calledR, leadD, leadR };
}

// ---------- "the miss": how far results run from DDHQ ----------
// Uses county-benchmark implied margins for statewide races (robust to count order) and raw margins in
// House races once a seat is mostly counted. Maps the average miss through the guide's uniform-miss curves.
const SENATE_MISS_CURVE = { '-12': 43, '-9': 46, '-6': 47, '-3': 48, 0: 51, 3: 55, 6: 55, 9: 58, 12: 59 };
const HOUSE_MISS_CURVE = { '-10': 195, '-8': 204, '-6': 213, '-4': 219, '-2': 224, 0: 230, 2: 236, 4: 244, 6: 262, 8: 278, 10: 285 };

export function nightMiss() {
  const items = [];
  for (const sw of allStatewide()) {
    const f = sw.guide?.forecast;
    if (f === undefined) continue;
    let est = null, w = 0, src = '';
    if (sw.bench?.implied !== null && sw.bench?.implied !== undefined && sw.bench.expectedIn > 3) {
      est = sw.bench.implied; w = Math.min(1, sw.bench.expectedIn / Math.max(10, sw.bench.coverage * 0.6)); src = 'counties';
    } else if (sw.res?.hasVotes && sw.res.rep >= 60) {
      est = sw.res.margin; w = (sw.res.rep - 50) / 50; src = 'statewide';
    }
    if (est !== null) items.push({ key: `${sw.st} ${sw.office === 'senate' ? 'Sen' : 'Gov'}`, miss: est - f, w, src, kind: 'state' });
  }
  for (const [dist, meta] of Object.entries(houseMeta)) {
    if (meta.ddhq === undefined) continue;
    const h = house(dist);
    if (!h.res?.hasVotes || h.res.rep < 60 || h.res.margin === null) continue;
    items.push({ key: dist, miss: h.res.margin - meta.ddhq, w: ((h.res.rep - 50) / 50) * 0.6, src: 'district', kind: 'house' });
  }
  const tw = items.reduce((s, x) => s + x.w, 0);
  const miss = tw > 0 ? items.reduce((s, x) => s + x.w * x.miss, 0) / tw : null;
  return {
    miss, items, n: items.length,
    senateSeats: miss === null ? null : Math.round(interp(SENATE_MISS_CURVE, miss)),
    houseSeats: miss === null ? null : Math.round(interp(HOUSE_MISS_CURVE, miss)),
  };
}

// ---------- House "how big is the night" signals ----------
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
    const gopLead = rs.filter((h) => !h.res?.called && h.res?.hasVotes && h.res.leader === 'r').length;
    const dWon = rs.filter((h) => h.res?.called === 'd').length;
    let state = 'waiting';
    if (gopWon >= t.need) state = 'hit';
    else if (t.of - dWon < t.need) state = 'miss';
    else if (gopWon + gopLead >= t.need) state = 'leaning';
    else if (rs.some((h) => h.res?.hasVotes)) state = 'trailing';
    return { ...t, rs, state, gopWon, gopLead };
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
    const ahead = m - STATES.OH.pres2024; // 2024 Ohio: Trump +11
    return { state: ahead >= 4 ? 'hit' : 'miss', soft: !r.res?.called, ev: `Brown ${fmt(m)} vs Trump +11 in 2024 → ${ahead >= 0 ? '+' : ''}${ahead.toFixed(1)} pts` };
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
    const det = data.details.get(Number(RACE_IDS.senate.TX));
    const regions = det?.region_results ? Object.values(det.region_results) : [];
    const SOUTH = { hidalgo: 0.4, cameron: -4.5, webb: 1.4, elpaso: 15, starr: -15.4, maverick: -18.6 }; // Harris '24 margins (approx.)
    let w = 0, delta = 0, names = [];
    for (const reg of regions) {
      const k = norm(reg.name);
      if (!(k in SOUTH)) continue;
      const r = readRace({ ...reg, id: k }, { d: 'Talarico', r: 'Paxton' });
      if (!r?.hasVotes) continue;
      w += r.total; delta += r.total * (r.margin - SOUTH[k]); names.push(reg.name);
    }
    if (!w) return { state: 'waiting', ev: 'South Texas counties not in yet' };
    const d = delta / w;
    return { state: d > 0 ? 'hit' : 'miss', soft: true, ev: `${names.slice(0, 4).join(', ')}: Talarico ${d >= 0 ? '+' : ''}${d.toFixed(1)} vs Harris '24 (approx. 2024 baselines)` };
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

export function evalTell(tell) {
  const t = nowNight();
  const start = hhmm(tell.win[0]), end = hhmm(tell.win[1]);
  const phase = t < start ? 'upcoming' : t <= end ? 'active' : 'past';
  if (!tell.auto || !EVAL[tell.auto]) return { phase, state: 'manual', ev: 'Check by hand' };
  try {
    const r = EVAL[tell.auto](t);
    let state = r.state;
    if (state.startsWith('leaning')) state = state.endsWith('yes') ? 'hit' : 'pending';
    if (phase === 'upcoming' && state !== 'hit') state = 'waiting';
    return { phase, ...r, state };
  } catch (e) {
    console.warn(e);
    return { phase, state: 'waiting', ev: '' };
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
  let calledD = 0, calledR = 0, leadD = 0, leadR = 0, waiting = 0;
  const seats = keys.map((k) => {
    const r = wiDistrict(k);
    if (r.res?.called === 'd') calledD++;
    else if (r.res?.called === 'r') calledR++;
    else if (r.res?.hasVotes) (r.res.leader === 'd' ? leadD++ : leadR++);
    else waiting++;
    return r;
  });
  const holdD = kind === 'senate' ? conf.dHoldovers : 0;
  const holdR = kind === 'senate' ? conf.rHoldovers : 0;
  return { conf, seats, calledD: calledD + holdD, calledR: calledR + holdR, leadD, leadR, waiting, holdD, holdR, up: keys.length };
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
