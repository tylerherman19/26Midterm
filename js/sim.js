// Rehearsal mode: a deterministic simulated election night that emits civicAPI-shaped payloads,
// so every view, tell and benchmark can be exercised before real votes arrive.

import { RACE_IDS } from './data/raceIds.js';
import { STATES, EARLY_HOUSE, HOUSE_TIER_SEATS, HOUSE_WATCH, SENATE, PACE, WI_LEG, OPEN_SEAT_HOLDER } from './data/guide.js';
import { hhmm, clamp } from './util.js';

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function gauss(rng) { const u = 1 - rng(); const v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const TURNOUT = { TX: 9.5e6, FL: 8.2e6, GA: 4.2e6, NC: 4.3e6, MI: 4.6e6, OH: 4.6e6, MN: 2.6e6, WI: 2.8e6, IA: 1.3e6, KS: 1.1e6,
  KY: 1.6e6, SC: 2.0e6, NE: 0.75e6, ME: 0.7e6, NH: 0.65e6, VT: 0.3e6, RI: 0.4e6, NV: 1.1e6, OR: 1.9e6, AK: 0.27e6, MS: 0.9e6 };
// Count-order bias: + means early votes lean D (blue mirage), - means early votes lean R (red mirage)
const MIRAGE = { GA: -3, NC: 4, OH: 5, FL: 2, MI: -6, WI: -5, PA: -5, TX: 3, KS: 0, IA: 0, MN: -2, NE: -2, NV: -3, ME: 0, NH: 0, KY: 2, SC: 1, VT: 0, RI: 0, OR: 2, AK: -3 };

const paceByState = Object.fromEntries(PACE.map(([st, , hours]) => [st, hours]));

function reportingAt(st, closeMin, t, speedJitter = 0) {
  if (t < closeMin) return 0;
  const hours = paceByState[st];
  const pts = [[closeMin, 0]];
  if (hours) {
    hours.forEach((p, i) => { const m = (19 + i) * 60; if (m > closeMin) pts.push([m, p]); });
  } else {
    [[60, 30], [120, 55], [180, 75], [240, 88], [300, 93]].forEach(([dm, p]) => pts.push([closeMin + dm, p]));
  }
  pts.push([pts[pts.length - 1][0] + 600, Math.max(97, pts[pts.length - 1][1])]);
  pts.sort((a, b) => a[0] - b[0]);
  let v = pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (t >= pts[i][0] && t <= pts[i + 1][0]) {
      const f = (t - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
      v = pts[i][1] + f * (pts[i + 1][1] - pts[i][1]);
      break;
    }
  }
  return clamp(Math.round(v + speedJitter), 0, 100);
}

function callable(margin, rep, closed, finalMargin) {
  if (!closed) return false;
  const a = Math.abs(margin);
  if (Math.abs(finalMargin) >= 15 && closed) return true;
  if (rep >= 97) return a >= 0.6;
  if (rep >= 85) return a >= 2.5;
  if (rep >= 65) return a >= 5;
  if (rep >= 40) return a >= 9;
  return false;
}

export class Simulator {
  constructor({ onData, seed, start = 17 * 60 - 10, speed = 120 } = {}) {
    this.onData = onData;
    this.seed = seed ?? Math.floor(Math.random() * 1e9);
    this.t = start;
    this.speed = speed; // time multiplier: 60 = one simulated minute per real second
    this.playing = true;
    this.timer = null;
    this.build();
  }

  build() {
    const rng = mulberry(this.seed);
    this.nationalErr = clamp(gauss(rng) * 3, -6, 6); // + = Democrats beat DDHQ
    this.races = [];
    const add = (o) => this.races.push(o);

    // Statewide guide races
    for (const [st, s] of Object.entries(STATES)) {
      for (const r of s.races) {
        const id = RACE_IDS[r.office]?.[st];
        if (!id) continue;
        const final = r.forecast + this.nationalErr + gauss(rng) * 2.5;
        add({ id, st, office: r.office, close: hhmm(s.close), first: hhmm(s.firstClose || s.close), final,
          d: r.d, r: r.r, dParty: r.dLabel === 'I' ? 'Independent' : 'Democratic', turnout: TURNOUT[st] || 1e6,
          counties: s.counties, jitter: gauss(rng) * 3, name: `${s.name} ${r.office === 'senate' ? 'US Senate' : 'Governor'}` });
      }
    }
    // Other Senate races on the path (for the map + seat counts)
    for (const [st, ddhq] of SENATE.path) {
      const id = RACE_IDS.senate[st];
      if (!id || this.races.some((x) => x.id === id)) continue;
      add({ id, st, office: 'senate', close: 19 * 60, first: 19 * 60, final: ddhq + this.nationalErr + gauss(rng) * 3, d: 'Democrat', r: 'Republican',
        dParty: 'Democratic', turnout: 1.5e6, counties: [], jitter: 0, name: `${st} US Senate` });
    }
    // Other governors (map)
    for (const [st, id] of Object.entries(RACE_IDS.governor)) {
      if (this.races.some((x) => x.id === id) || st.length !== 2 || ['GU', 'VI', 'MP', 'US'].includes(st)) continue;
      const lean = (hashStr(st + 'g') % 50) - 25;
      add({ id, st, office: 'governor', close: 19 * 60, first: 19 * 60, final: lean + this.nationalErr, d: 'Democrat', r: 'Republican',
        dParty: 'Democratic', turnout: 1.5e6, counties: [], jitter: 0, name: `${st} Governor` });
    }

    // House: guide seats with DDHQ margins, everything else safe
    const ddhq = {};
    EARLY_HOUSE.forEach((h) => { ddhq[h[0]] = h[7]; });
    HOUSE_TIER_SEATS.forEach((g) => g.seats.forEach(([d, , m]) => { ddhq[d] = m; }));
    const names = {};
    const closeOf = {};
    HOUSE_WATCH.forEach((g) => g.races.forEach(([d, dn, rn, , lean]) => {
      names[d] = [dn, rn]; closeOf[d] = hhmm(g.time);
      if (ddhq[d] === undefined) ddhq[d] = lean + 6; // the national environment in the guide runs ~6 pts bluer than 2024
    }));
    HOUSE_TIER_SEATS.forEach((g) => g.seats.forEach(([d]) => { closeOf[d] ||= hhmm(g.time); }));
    const districts = Object.keys(RACE_IDS.house);
    let safeD = 0;
    for (const dist of districts.sort()) {
      const st = dist.slice(0, 2);
      const id = RACE_IDS.house[dist];
      let base = ddhq[dist];
      if (base === undefined) {
        const h = hashStr(dist) / 4294967296;
        const isD = h < 0.53;
        if (isD) safeD++;
        base = isD ? 14 + h * 50 : -(14 + (1 - h) * 40);
      }
      const stClose = STATES[st] ? hhmm(STATES[st].close) : ({ AZ: 20, CO: 20, NY: 20, NJ: 19, PA: 19, MO: 19, AL: 19, AR: 19.5, VA: 18, IN: 18, CA: 22, WA: 22, MT: 21, NV: 21 }[st] || 19) * 60;
      const [dn, rn] = names[dist] || ['Democrat', 'Republican'];
      add({ id, st, dist, office: 'house', close: closeOf[dist] || stClose, first: closeOf[dist] || stClose,
        final: base + this.nationalErr + gauss(rng) * 3, d: dn, r: rn, dParty: 'Democratic', turnout: 3.2e5, counties: [], jitter: gauss(rng) * 4,
        name: `${st} US House ${dist.slice(3)}`, district: dist });
    }

    // Wisconsin legislature districts
    const wiBase = { safeD: 25, leanD: 4, toss: 0.5, leanR: -4, safeR: -25 };
    WI_LEG.senate.order.forEach(([n, , rating]) => {
      const key = `SD-${String(n).padStart(2, '0')}`;
      const id = RACE_IDS.wi[key];
      if (id) add({ id, st: 'WI', office: 'wi', close: 20 * 60, first: 20 * 60, final: wiBase[rating] + this.nationalErr + gauss(rng) * 3, d: 'Democrat', r: 'Republican', dParty: 'Democratic', turnout: 9e4, counties: [], jitter: gauss(rng) * 5, name: `Wisconsin State Senate ${n}`, district: `WI-SD-${String(n).padStart(3, '0')}` });
    });
    const asmRated = Object.fromEntries(WI_LEG.assembly.watch.map((w) => [w.d, { 'Safe D': 'safeD', 'Lean D': 'leanD', Tossup: 'toss', 'Lean R': 'leanR' }[w.rating]]));
    Object.keys(RACE_IDS.wi).filter((k) => k.startsWith('AD')).forEach((key) => {
      const id = RACE_IDS.wi[key];
      const rating = asmRated[key] || (hashStr(key) % 99 < 45 ? 'safeD' : 'safeR');
      add({ id, st: 'WI', office: 'wi', close: 20 * 60, first: 20 * 60, final: wiBase[rating] + this.nationalErr + gauss(rng) * 3, d: 'Democrat', r: 'Republican', dParty: 'Democratic', turnout: 3e4, counties: [], jitter: gauss(rng) * 5, name: `Wisconsin State Assembly ${Number(key.slice(3))}`, district: `WI-AD-${key.slice(3).padStart(3, '0')}` });
    });
    this.rng = rng;
  }

  candidates(race, margin, total, called) {
    const other = Math.max(0.01, 0.015 + (hashStr(race.id) % 20) / 1000);
    const two = 1 - other;
    const pd = clamp((two * (1 + margin / 100)) / 2, 0, 1);
    const pr = two - pd;
    const vd = Math.round(total * pd), vr = Math.round(total * pr), vo = Math.max(0, Math.round(total * other));
    const sum = vd + vr + vo || 1;
    const mk = (name, party, votes, color) => ({ name, party, votes, percent: Math.round((votes / sum) * 10000) / 100, color, winner: false });
    const list = [
      mk(race.d, race.dParty, vd, race.dParty === 'Independent' ? '#63c660' : '#4874a3'),
      mk(race.r, 'Republican', vr, '#c6606b'),
      mk('Other', 'Libertarian', vo, '#d4c029'),
    ];
    if (called) (margin > 0 ? list[0] : list[1]).winner = true;
    return list.sort((a, b) => b.votes - a.votes);
  }

  snapshot() {
    const t = this.t;
    const races = [];
    const details = [];
    let dSen = SENATE.dNotUp, rSen = SENATE.rNotUp, dHouse = 0, rHouse = 0, dGov = 0, rGov = 0;
    for (const race of this.races) {
      const closed = t >= race.close;
      const rep = race.office === 'house' || race.office === 'wi'
        ? (t < race.close ? 0 : clamp(Math.round((1 - Math.exp(-(t - race.close) / (90 + Math.abs(race.jitter) * 15))) * 100 + race.jitter), 0, 100))
        : reportingAt(race.st, race.first, t, race.jitter);
      const mirage = (MIRAGE[race.st] || 0) * (1 - rep / 100) * 1.4;
      const margin = rep > 0 ? race.final + mirage : 0;
      const total = Math.round(race.turnout * (rep / 100));
      const called = rep > 0 && callable(margin, rep, closed, race.final);
      const cand = this.candidates(race, margin, total, called);
      if (called) {
        if (race.office === 'senate') margin > 0 ? dSen++ : rSen++;
        if (race.office === 'house') margin > 0 ? dHouse++ : rHouse++;
        if (race.office === 'governor') margin > 0 ? dGov++ : rGov++;
      }
      const base = {
        id: race.id, election_name: race.name, type: { senate: 'US Senate', governor: 'Governor', house: 'House of Representatives', wi: race.name.includes('Senate') ? 'State Senate' : 'State House' }[race.office],
        country: 'US', province: race.st, district: race.district || null, election_type: race.office === 'governor' ? 'Statewide' : race.office === 'wi' ? 'Local' : 'General',
        percent_reporting: rep, candidates: cand, test_data: true, last_updated: new Date().toISOString(),
      };
      races.push(base);
      if (race.counties.length) {
        const region_results = {};
        race.counties.forEach(([name, share, , toTie, inBy]) => {
          const late = /wed|thu|nov|later|after/i.test(inBy) ? 0.55 : /12 AM|1 AM/i.test(inBy) ? 0.8 : 1;
          const crep = clamp(Math.round(rep * late + (hashStr(name) % 15) - 5), 0, 100);
          if (rep === 0) { region_results[name.toLowerCase()] = { name, type: 'County', percent_reporting: 0, candidates: this.candidates(race, 0, 0, false) }; return; }
          const cm = toTie + race.final + (MIRAGE[race.st] || 0) * (1 - crep / 100) + ((hashStr(name + race.id) % 60) / 10 - 3);
          const ctot = Math.round(race.turnout * (share / 100) * (crep / 100));
          region_results[name.toLowerCase().replace(/[^a-z]+/g, '_')] = { name, type: 'County', percent_reporting: crep, candidates: this.candidates(race, cm, ctot, false) };
        });
        details.push({ ...base, region_results });
      }
    }
    const agg = (id, name, dSeats, rSeats) => ({ id, election_name: name, type: 'aggregate', province: 'US', percent_reporting: 0,
      candidates: [{ name: 'Democrats', party: 'Democratic', seats: dSeats, votes: 0 }, { name: 'Republicans', party: 'Republican', seats: rSeats, votes: 0 }] });
    races.push(agg(RACE_IDS.aggregate.senate, 'United States Senate', dSen, rSen));
    races.push(agg(RACE_IDS.aggregate.house, 'United States House of Representatives', dHouse, rHouse));
    races.push(agg(RACE_IDS.aggregate.governor, 'United States Governors', dGov, rGov));
    return { races, details };
  }

  tick(force = false) {
    const { races, details } = this.snapshot();
    this.onData?.(races, details);
  }

  start() {
    this.stop();
    this.tick();
    let last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (this.playing) this.t = Math.min(this.t + (dt * this.speed) / 60, 34 * 60);
      this.acc = (this.acc || 0) + dt;
      if (this.acc >= 1.5) { this.acc = 0; this.tick(); }
    }, 250);
  }
  stop() { clearInterval(this.timer); this.timer = null; }
  setTime(t) { this.t = t; this.tick(); }
  reshuffle() { this.seed = Math.floor(Math.random() * 1e9); this.build(); this.tick(); }
}
