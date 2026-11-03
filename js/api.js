// civicAPI data layer: polling, caching, history tracking, and rehearsal-mode switching.
// Docs: https://civicapi.org/api-documentation  (free, no auth, CORS open; please keep attribution in the footer)

import { RACE_IDS } from './data/raceIds.js';
import { STATES } from './data/guide.js';
import { nightMinutesFromDate, hhmm, store as ls } from './util.js';
import { Simulator } from './sim.js';

const BASE = 'https://civicapi.org/api/v2';
const DATE = '2026-11-03';

export const INTERVAL = { general: 30_000, statewide: 60_000, wi: 90_000, mn: 90_000, details: 45_000 };
export const FEEDS = [
  ['general', 'House, Senate and national tallies', 30],
  ['statewide', 'Governors and state chambers', 60],
  ['details', 'County results (guide states)', 45],
  ['wi', 'Wisconsin legislative districts', 90],
  ['mn', 'Minnesota legislative districts', 90],
];

export const data = {
  mode: 'live', // 'live' | 'demo'
  races: new Map(), // id -> race summary {id, election_name, type, province, district, percent_reporting, candidates[]}
  details: new Map(), // id -> full race payload incl. region_results
  history: {}, // id -> [[nightMin, reporting, margin]]
  status: { general: null, statewide: null, wi: null, mn: null, details: null },
  lastTry: {},
  errors: {},
  lastUpdate: 0,
  nextUpdate: 0,
  inflight: 0,
  sim: null,
};

const listeners = new Set();
export const onUpdate = (fn) => listeners.add(fn);
let emitQueued = false;
function emit() {
  if (emitQueued) return;
  emitQueued = true;
  requestAnimationFrame(() => {
    emitQueued = false;
    listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  });
}

// ---------- clock ----------
export function nowNight() {
  if (data.mode === 'demo' && data.sim) return data.sim.t;
  return nightMinutesFromDate(new Date());
}

// ---------- fetching ----------
async function getJSON(url, { timeout = 45_000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  data.inflight++;
  emit();
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`); }
    if (!res.ok || body?.statusCode >= 400) throw new Error(body?.code || body?.message || `HTTP ${res.status}`);
    return body;
  } finally {
    clearTimeout(timer);
    data.inflight--;
  }
}

async function pool(items, n, fn) {
  const queue = [...items];
  const workers = Array.from({ length: n }, async () => {
    while (queue.length) {
      const it = queue.shift();
      try { await fn(it); } catch (e) { /* recorded by fn */ }
    }
  });
  await Promise.all(workers);
}

function ingest(race, { detail = false } = {}) {
  if (!race || race.id === undefined) return;
  const id = Number(race.id);
  const prev = data.races.get(id);
  const summary = { ...(prev || {}), ...race, id };
  delete summary.region_results;
  delete summary.maps;
  data.races.set(id, summary);
  if (detail) data.details.set(id, race);
  recordHistory(id, summary);
}

function recordHistory(id, race) {
  const rep = Number(race.percent_reporting) || 0;
  if (rep <= 0) return;
  const t = Math.round(nowNight());
  const h = (data.history[id] ||= []);
  const last = h[h.length - 1];
  const m = quickMargin(race);
  if (last && last[1] === rep && Math.abs((last[2] ?? 0) - (m ?? 0)) < 0.05) return;
  if (last && t - last[0] < 2 && h.length > 1) h[h.length - 1] = [t, rep, m];
  else h.push([t, rep, m]);
  if (h.length > 400) h.splice(0, h.length - 400);
}

function quickMargin(race) {
  const c = race.candidates || [];
  const tot = c.reduce((s, x) => s + (Number(x.votes) || 0), 0);
  if (!tot) return null;
  const top = (re) => c.filter((x) => re.test(x.party || '')).sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
  const d = top(/democrat/i) || top(/independent/i);
  const r = top(/republican/i);
  if (!d || !r) return null;
  return Math.round(((d.votes - r.votes) / tot) * 1000) / 10;
}

function searchURL(params) {
  const q = new URLSearchParams({ startDate: DATE, endDate: DATE, country: 'US', limit: '1000', ...params });
  return `${BASE}/race/search?${q}`;
}

async function fetchSearch(key, params) {
  data.lastTry[key] = Date.now();
  try {
    const body = await getJSON(searchURL(params), { timeout: 60_000 });
    (body.races || []).forEach((r) => ingest(r));
    data.status[key] = Date.now();
    delete data.errors[key];
    data.lastUpdate = Date.now();
  } catch (e) {
    data.errors[key] = `${e.message || e}`;
  }
  persistHistory();
  emit();
}

// Statewide guide races whose county tables we need
export function detailIds() {
  const ids = [];
  for (const [st, s] of Object.entries(STATES)) {
    for (const r of s.races) {
      const id = RACE_IDS[r.office]?.[st];
      if (id) ids.push({ id, st, close: hhmm(s.firstClose || s.close), hasCounties: s.counties.length > 0 });
    }
  }
  return ids;
}

async function fetchDetails({ force = false } = {}) {
  data.lastTry.details = Date.now();
  const t = nowNight();
  const targets = detailIds().filter((x) => {
    if (force) return true;
    const known = data.races.get(x.id);
    return t >= x.close - 10 || (known && known.percent_reporting > 0);
  });
  if (!targets.length) return;
  let ok = 0;
  await pool(targets, 4, async (x) => {
    try {
      const body = await getJSON(`${BASE}/race/${x.id}`, { timeout: 30_000 });
      ingest({ ...body, id: x.id }, { detail: true });
      ok++;
    } catch (e) {
      data.errors.details = `${e.message || e}`;
    }
  });
  if (ok) { data.status.details = Date.now(); data.lastUpdate = Date.now(); if (ok === targets.length) delete data.errors.details; }
  persistHistory();
  emit();
}

// If the big search endpoint is failing, fall back to fetching the watched House seats one by one.
async function fallbackHouse(districts) {
  const ids = districts.map((d) => RACE_IDS.house[d]).filter(Boolean);
  await pool(ids, 3, async (id) => {
    try { ingest({ ...(await getJSON(`${BASE}/race/${id}`, { timeout: 30_000 })), id }); } catch { /* ignore */ }
  });
  emit();
}

// ---------- polling loops ----------
const timers = [];
function loop(fn, ms, initialDelay = 0) {
  let stopped = false;
  const run = async () => {
    if (stopped) return;
    if (document.hidden && data.mode === 'live') { timers.push(setTimeout(run, 5000)); return; }
    await fn();
    if (!stopped) timers.push(setTimeout(run, ms));
  };
  timers.push(setTimeout(run, initialDelay));
  return () => { stopped = true; };
}
let stops = [];
let houseFallbackList = [];
export function setHouseFallbackList(list) { houseFallbackList = list; }

export function startLive() {
  stopAll();
  data.mode = 'live';
  loadHistory();
  stops.push(loop(async () => {
    await fetchSearch('general', { election_type: 'General' });
    data.nextUpdate = Date.now() + INTERVAL.general;
    if (data.errors.general && !data.status.general && houseFallbackList.length) await fallbackHouse(houseFallbackList);
  }, INTERVAL.general));
  stops.push(loop(() => fetchSearch('statewide', { election_type: 'Statewide' }), INTERVAL.statewide, 1500));
  stops.push(loop(() => fetchSearch('wi', { province: 'WI', query: 'Wisconsin State', country: 'US' }), INTERVAL.wi, 3000));
  stops.push(loop(() => fetchSearch('mn', { province: 'MN', query: 'Minnesota State', country: 'US' }), INTERVAL.mn, 6000));
  stops.push(loop(() => fetchDetails(), INTERVAL.details, 4500));
  emit();
}

export async function refreshNow() {
  if (data.mode === 'demo') { data.sim?.tick(true); return { ok: true, at: Date.now(), sim: true }; }
  const before = { ...data.status };
  await Promise.all([
    fetchSearch('general', { election_type: 'General' }),
    fetchSearch('statewide', { election_type: 'Statewide' }),
    fetchDetails({ force: true }),
  ]);
  data.nextUpdate = Date.now() + INTERVAL.general;
  const ok = data.status.general !== before.general || data.status.statewide !== before.statewide;
  return { ok, at: Date.now(), errors: { ...data.errors } };
}

/**
 * Overall feed health. live: main feed updated within ~3 refresh cycles; stale: older than that or
 * currently failing; offline: nothing good for 6+ minutes; connecting: no successful load yet.
 */
export function feedHealth() {
  if (data.mode === 'demo') {
    return data.errors.general ? { state: 'stale', everLoaded: true, label: 'Simulated feed interruption' } : { state: 'demo', everLoaded: true };
  }
  const last = Math.max(data.status.general || 0, data.status.statewide || 0);
  const everLoaded = last > 0;
  if (!everLoaded) return { state: Object.keys(data.errors).length ? 'offline' : 'connecting', everLoaded, last: null };
  const age = Date.now() - last;
  if (age < 100_000 && !data.errors.general) return { state: 'live', everLoaded, last, age };
  if (age < 360_000) return { state: 'stale', everLoaded, last, age };
  return { state: 'offline', everLoaded, last, age };
}

export function startDemo(opts = {}) {
  data.simScenario = opts.scenario || data.simScenario || 'random';
  stopAll();
  data.mode = 'demo';
  data.races.clear();
  data.details.clear();
  data.history = {};
  data.errors = {};
  data.sim = new Simulator({
    ...opts,
    scenario: data.simScenario,
    onInterrupt(on) {
      if (on) data.errors.general = 'Simulated feed interruption'; else delete data.errors.general;
      emit();
    },
    onData(races, details) {
      races.forEach((r) => ingest(r));
      details.forEach((r) => ingest(r, { detail: true }));
      data.lastUpdate = Date.now();
      emit();
    },
  });
  data.sim.start();
  emit();
}

function stopAll() {
  stops.forEach((s) => s());
  stops = [];
  timers.forEach(clearTimeout);
  timers.length = 0;
  if (data.sim) { data.sim.stop(); data.sim = null; }
}

export function setMode(mode) {
  ls('en26-mode', mode);
  data.races.clear();
  data.details.clear();
  data.history = {};
  if (mode === 'demo') startDemo(); else startLive();
}

// ---------- history persistence (live mode only) ----------
let persistTimer = null;
function persistHistory() {
  if (data.mode !== 'live') return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => ls('en26-history', data.history), 1500);
}
function loadHistory() {
  const h = ls('en26-history');
  data.history = h && typeof h === 'object' ? h : {};
}

export const apiBase = BASE;
