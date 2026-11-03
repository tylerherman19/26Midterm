// Run: node tests/model.test.mjs   (no dependencies)
import assert from 'node:assert/strict';
globalThis.document = { hidden: false };
globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const api = await import('../js/api.js');
const M = await import('../js/model.js');
const S = await import('../js/scenario.js');
const { RACE_IDS } = await import('../js/data/raceIds.js');
const { STATES, HOUSE_WATCH, EARLY_HOUSE, HOUSE_TIER_SEATS, SENATE, CLOSINGS, HOURS } = await import('../js/data/guide.js');
const { districtClose, stateClose, STATE_CLOSE } = await import('../js/data/closings.js');
const { CLOSE_84, SAFE_D } = await import('../js/data/houseForecast.js');
const { data } = api;

let n = 0; const test = (name, fn) => { try { fn(); n++; console.log('ok  ', name); } catch (e) { console.log('FAIL', name, '\n     ', e.message); process.exitCode = 1; } };
const C = (name, party, votes, winner = false) => ({ name, party, votes, winner });
const put = (id, cands, rep = 50, extra = {}) => data.races.set(Number(id), { id: Number(id), percent_reporting: rep, candidates: cands, ...extra });
const reset = () => { data.races.clear(); data.details.clear(); data.errors = {}; data.status = {}; };

// ---------- data integrity ----------
test('435 unique House districts with race IDs', () => {
  const k = Object.keys(RACE_IDS.house); assert.equal(k.length, 435); assert.equal(new Set(k).size, 435);
  assert.equal(new Set(Object.values(RACE_IDS.house)).size, 435, 'race ids unique');
});
test('35 Senate races on the path; 34 + 35 + 31 = 100', () => {
  assert.equal(SENATE.path.length, 35); assert.equal(SENATE.dNotUp + SENATE.path.length + SENATE.rNotUp, 100);
  for (const [st] of SENATE.path) assert.ok(RACE_IDS.senate[st], `senate id for ${st}`);
});
test('84-seat DDHQ list unique, SAFE_D derived from seat 218 = OH-09', () => {
  assert.equal(new Set(CLOSE_84.map((x) => x[0])).size, 84);
  assert.equal(SAFE_D + CLOSE_84.findIndex((x) => x[0] === 'OH-09') + 1, 218);
});
test('scenario engine reproduces guide p. 29 curve', () => {
  const exp = { '-6': 213, '-4': 219, '-2': 224, 0: 230, 2: 236, 4: 244 };
  for (const [s, v] of Object.entries(exp)) assert.equal(S.houseSeatsAtShift(Number(s)), v, `shift ${s}`);
});
test('Senate scenario reproduces guide p. 28 curve', () => {
  const exp = { '-6': 47, '-3': 48, 0: 51, 3: 55, 6: 55 };
  for (const [s, v] of Object.entries(exp)) assert.equal(S.senateSeatsAtShift(Number(s)), v, `shift ${s}`);
});
test('tier thresholds', () => {
  assert.equal(S.houseTier(217), 'riptide'); assert.equal(S.houseTier(218), 'tide'); assert.equal(S.houseTier(229), 'tide');
  assert.equal(S.houseTier(230), 'wave'); assert.equal(S.houseTier(239), 'wave'); assert.equal(S.houseTier(240), 'tsunami');
  assert.equal(M.senateNetTier(0), 'riptide'); assert.equal(M.senateNetTier(1), 'tide'); assert.equal(M.senateNetTier(4), 'wave'); assert.equal(M.senateNetTier(7), 'tsunami');
});

// ---------- closing times ----------
test('closing-time single source of truth', () => {
  assert.equal(districtClose('KY-06').all, '17:00'); assert.equal(districtClose('IN-05').all, '17:00'); assert.equal(districtClose('IN-01').all, '18:00');
  assert.equal(districtClose('FL-14').all, '18:00'); assert.equal(districtClose('FL-25').all, '18:00'); assert.equal(districtClose('FL-02').all, '19:00');
  assert.equal(districtClose('MI-07').all, '19:00'); assert.equal(districtClose('TX-15').all, '19:00'); assert.equal(districtClose('TX-23').all, '20:00');
  assert.equal(stateClose('TX').all, '20:00'); assert.equal(STATES.TX.close, '20:00'); assert.equal(STATES.TX.firstClose, '19:00');
  assert.equal(M.HOUSE_META['FL-14'].close, '18:00'); assert.equal(M.HOUSE_META['KY-06'].close, '17:00');
});
test('every tracked district has a close time', () => {
  for (const g of HOUSE_WATCH) for (const [d] of g.races) assert.ok(M.HOUSE_META[d].close, d);
});

// ---------- race reading ----------
test('lead vs call; tie; third-party winner; uncontested', () => {
  reset();
  const va2 = RACE_IDS.house['VA-02'], ia3 = RACE_IDS.house['IA-03'], x = RACE_IDS.house['AL-07'], y = RACE_IDS.house['VT-AL'];
  put(va2, [C('Elaine Luria', 'Democratic', 100), C('Jen Kiggans', 'Republican', 90)], 40);
  let h = M.house('VA-02'); assert.equal(h.res.called, null); assert.equal(h.res.leader, 'd'); assert.equal(h.status, 'leading');
  put(va2, [C('Elaine Luria', 'Democratic', 100, true), C('Jen Kiggans', 'Republican', 90)], 90);
  h = M.house('VA-02'); assert.equal(h.res.called, 'd'); assert.equal(h.status, 'called'); assert.equal(h.flip, true, 'R-held seat won by D is a flip');
  put(ia3, [C('Sarah Garriott', 'Democratic', 500), C('Zach Nunn', 'Republican', 500)], 60);
  h = M.house('IA-03'); assert.equal(h.status, 'tied'); assert.equal(h.res.leader, 'tie');
  put(x, [C('Indie', 'Independent', 900, true), C('R', 'Republican', 100)], 100);
  put(y, [C('Uncontested D', 'Democratic', 1000, true)], 100);
  const t = M.houseTally();
  assert.equal(t.calledD, 2); assert.equal(t.calledO, 1); assert.equal(t.tied, 1);
  assert.equal(t.called + t.leadD + t.leadR + t.leadO + t.tied + t.noVotes + t.unavailable, 435);
  assert.ok(t.reconciles);
});
test('retracted call: winner flag removed -> back to uncalled', () => {
  reset();
  const id = RACE_IDS.house['VA-02'];
  put(id, [C('Elaine Luria', 'Democratic', 100, true), C('Jen Kiggans', 'Republican', 90)], 90);
  assert.equal(M.houseTally().calledD, 1);
  put(id, [C('Elaine Luria', 'Democratic', 100), C('Jen Kiggans', 'Republican', 90)], 90);
  assert.equal(M.houseTally().calledD, 0); assert.equal(M.houseTally().leadD, 1);
});
test('each district counted once even if fed twice', () => {
  reset();
  const id = RACE_IDS.house['VA-02'];
  put(id, [C('Elaine Luria', 'Democratic', 100, true), C('Jen Kiggans', 'Republican', 90)], 90);
  put(id, [C('Elaine Luria', 'Democratic', 101, true), C('Jen Kiggans', 'Republican', 90)], 91);
  assert.equal(M.houseTally().calledD, 1);
});
test('missing data: no races -> unavailable, not zero votes', () => {
  reset();
  const t = M.houseTally(); assert.equal(t.unavailable, 435); assert.equal(t.calledD, 0);
  assert.equal(M.house('VA-02').status, 'loading');
});

// ---------- Senate holdovers ----------
test('Senate: holdovers separate from 2026 calls; NE Osborn counts as D side', () => {
  reset();
  put(RACE_IDS.senate.GA, [C('Jon Ossoff', 'Democratic', 100, true), C('Mike Collins', 'Republican', 90)], 90);
  put(RACE_IDS.senate.NE, [C('Dan  Osborn', 'Independent', 100, true), C('Pete Ricketts', 'Republican', 90)], 90);
  put(RACE_IDS.senate.KY, [C('Charles Booker', 'Democratic', 10), C('Andy Barr', 'Republican', 90)], 30);
  const s = M.senateTally();
  assert.equal(s.holdD, 34); assert.equal(s.calledD, 2); assert.equal(s.securedD, 36); assert.equal(s.securedR, 31);
  assert.equal(s.leadR, 1); assert.equal(s.unavailable, 32);
});

test('Senate independents count as Democratic-aligned (calls and leads); other third parties do not', () => {
  reset();
  put(RACE_IDS.senate.ID, [C('Todd Achilles', 'Independent', 100, true), C('Jim Risch', 'Republican', 90)], 95);
  put(RACE_IDS.senate.MT, [C('Seth Bodnar', 'Independent', 120), C('Dem X', 'Democratic', 10), C('Steve Daines', 'Republican', 100)], 60);
  put(RACE_IDS.senate.SD, [C('Brian Bengs', 'Independent', 50), C('Mike Rounds', 'Republican', 100, true)], 90);
  put(RACE_IDS.senate.OK, [C('Lib', 'Libertarian', 100, true), C('R', 'Republican', 90)], 95);
  const s = M.senateTally();
  assert.equal(s.calledD, 1, 'Idaho independent win counts D'); assert.equal(s.indD, 1);
  assert.equal(s.leadD, 1, 'Montana independent lead counts D'); assert.equal(s.indLeadD, 1);
  assert.equal(s.calledR, 1); assert.equal(s.calledO, 1, 'Libertarian stays other');
  assert.equal(s.securedD, 35);
  const mt = s.seats.find((x) => x.st === 'MT'); assert.ok(mt.res.margin > 0, 'margin measured independent vs Republican');
});
test('House independents are not counted as Democrats', () => {
  reset();
  put(RACE_IDS.house['AL-07'], [C('Indie', 'Independent', 900, true), C('R', 'Republican', 100)], 100);
  const t = M.houseTally(); assert.equal(t.calledD, 0); assert.equal(t.calledO, 1);
});

// ---------- swing estimate gating ----------
test('swing estimate withheld until 10 districts in 4 states are >=85% in or called', () => {
  reset();
  const ds = ['VA-02', 'OH-01', 'OH-09', 'FL-14', 'FL-25', 'NC-01', 'OH-07', 'NC-11', 'FL-09'];
  for (const d of ds) put(RACE_IDS.house[d], [C('A', 'Democratic', 600), C('B', 'Republican', 400)], 90);
  let sw = M.houseSwing(); assert.equal(sw.n, 9); assert.equal(sw.enough, false); assert.equal(sw.seats, null);
  put(RACE_IDS.house['KY-06'], [C('A', 'Democratic', 600), C('B', 'Republican', 400)], 50);
  sw = M.houseSwing(); assert.equal(sw.n, 9, 'partial district excluded'); assert.equal(sw.partial, 1);
  put(RACE_IDS.house['KY-06'], [C('A', 'Democratic', 600), C('B', 'Republican', 400)], 95);
  sw = M.houseSwing(); assert.equal(sw.n, 10); assert.equal(sw.states, 5); assert.equal(sw.enough, true);
  assert.equal(sw.seats, S.houseSeatsAtShift(sw.median));
});

// ---------- feed health ----------
test('feed health states', () => {
  reset(); data.mode = 'live';
  assert.equal(api.feedHealth().state, 'connecting');
  data.errors.general = 'HTTP 503'; assert.equal(api.feedHealth().state, 'offline');
  data.errors = {}; data.status.general = Date.now() - 10_000; assert.equal(api.feedHealth().state, 'live');
  data.status.general = Date.now() - 200_000; assert.equal(api.feedHealth().state, 'stale');
  data.status.general = Date.now() - 400_000; assert.equal(api.feedHealth().state, 'offline');
  data.status.general = Date.now() - 5_000; data.errors.general = 'x'; assert.equal(api.feedHealth().state, 'stale');
});

// ---------- poll closings ----------
// Official closing times from The Green Papers (thegreenpapers.com/G26/PollingHours.phtml, checked Nov 3, 2026),
// written as UTC on Nov 4: [first close, last close]. Central Standard Time = UTC-6, so CT = UTC - 6h.
const GREEN_PAPERS_UTC = {
  AL: ['01:00'], AK: ['05:00', '06:00'], AZ: ['02:00'], AR: ['01:30'], CA: ['04:00'], CO: ['02:00'], CT: ['01:00'],
  DE: ['01:00'], FL: ['00:00', '01:00'], GA: ['00:00'], HI: ['05:00'], ID: ['03:00', '04:00'], IL: ['01:00'],
  IN: ['23:00', '00:00'], IA: ['02:00'], KS: ['01:00', '02:00'], KY: ['23:00', '00:00'], LA: ['02:00'], ME: ['01:00'],
  MD: ['01:00'], MA: ['01:00'], MI: ['01:00', '02:00'], MN: ['02:00'], MS: ['01:00'], MO: ['01:00'], MT: ['03:00'],
  NE: ['02:00'], NV: ['03:00'], NH: ['00:00', '01:00'], NJ: ['01:00'], NM: ['02:00'], NY: ['02:00'], NC: ['00:30'],
  ND: ['03:00', '04:00'], OH: ['00:30'], OK: ['01:00'], OR: ['04:00'], PA: ['01:00'], RI: ['01:00'], SC: ['00:00'],
  SD: ['01:00', '02:00'], TN: ['01:00'], TX: ['01:00', '02:00'], UT: ['03:00'], VT: ['00:00'], VA: ['00:00'],
  WA: ['04:00'], WV: ['00:30'], WI: ['02:00'], WY: ['02:00'],
};
const utcToCT = (u) => { const [h, m] = u.split(':').map(Number); const ct = (h < 12 ? h + 24 : h) - 6; return `${String(ct).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
test('every state closing time matches The Green Papers, converted to Central Time', () => {
  assert.equal(Object.keys(STATE_CLOSE).length, 50);
  for (const [st, [first, last = first]] of Object.entries(GREEN_PAPERS_UTC)) {
    assert.deepEqual([stateClose(st).most, stateClose(st).all], [utcToCT(first), utcToCT(last)], st);
  }
});
test('hour-by-hour House lists put each district at the hour its last poll closes', () => {
  for (const g of HOUSE_WATCH) for (const [d] of g.races) assert.equal(g.time, districtClose(d).all, `HOUSE_WATCH ${d}`);
  for (const g of CLOSINGS) for (const d of g.house) assert.equal(g.time, districtClose(d).all, `CLOSINGS ${d}`);
  for (const [d, , , , t] of EARLY_HOUSE) assert.ok([districtClose(d).most, districtClose(d).all].includes(t), `EARLY_HOUSE ${d}`);
  for (const g of HOUSE_TIER_SEATS) for (const [d] of g.seats) assert.ok([districtClose(d).most, districtClose(d).all].includes(g.time), `tier ${d}`);
});
test('hour-by-hour "closing" labels name only states closing that hour', () => {
  for (const h of HOURS) for (const st of (h.sub.match(/\b[A-Z]{2}\b/g) || [])) {
    const c = stateClose(st); assert.ok([c.most, c.all].includes(h.time), `${h.label}: ${st} closes ${c.most}/${c.all}`);
  }
});

console.log(`\n${n} tests passed${process.exitCode ? ', some FAILED' : ''}`);
