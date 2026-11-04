// Results data layer: polling, caching and history tracking.
// Main source: The New York Times' live results files (AP race calls) for House, Senate and governor.
// civicAPI is the fallback for those races and the only source for county tables and state legislatures.
// Docs: https://civicapi.org/api-documentation  (free, no auth, CORS open; please keep attribution in the footer)

import { RACE_IDS } from './data/raceIds.js';
import { STATES } from './data/guide.js';
import { nightMinutesFromDate, hhmm, store as ls } from './util.js';

const BASE = 'https://civicapi.org/api/v2';
const DATE = '2026-11-03';

export const INTERVAL = { nyt: 30_000, general: 30_000, statewide: 60_000, wi: 90_000, mn: 90_000, details: 45_000 };
export const FEEDS = [
  ['nyt', 'NYT results: House, Senate, governor (main)', 30],
  ['general', 'civicAPI House, Senate and national tallies (fallback)', 30],
  ['statewide', 'Governors and state chambers', 60],
  ['details', 'County results (guide states)', 45],
  ['wi', 'Wisconsin legislative districts', 90],
  ['mn', 'Minnesota legislative districts', 90],
];

export const data = {
  mode: 'live',
  races: new Map(), // id -> race summary {id, election_name, type, province, district, percent_reporting, candidates[]}
  details: new Map(), // id -> full race payload incl. region_results
  history: {}, // id -> [[nightMin, reporting, margin]]
  status: { nyt: null, general: null, statewide: null, wi: null, mn: null, details: null },
  lastTry: {},
  lastFallback: null,
  errors: {},
  lastUpdate: 0,
  nextUpdate: 0,
  inflight: 0,
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
  return nightMinutesFromDate(new Date());
}

// ---------- fetching ----------
async function getJSON(url, { timeout = 45_000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  data.inflight++;
  emit();
  try {
    // cache: 'no-cache' makes the browser revalidate every time instead of reusing a copy up to ~45s old.
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-cache', headers: { Accept: 'application/json' } });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`); }
    if (!res.ok || body?.statusCode >= 400) throw new Error(body?.code || body?.message || `HTTP ${res.status}`);
    return body;
  } catch (e) {
    if (ctl.signal.aborted) throw new Error(`Request timed out after ${timeout / 1000}s`);
    throw e;
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

// NYT's numbers stay authoritative while its feed is fresh; civicAPI fills in only if NYT goes quiet.
const NYT_FRESH_MS = 5 * 60_000;
export const nytFresh = () => !!data.status.nyt && Date.now() - data.status.nyt < NYT_FRESH_MS;
const RESULT_FIELDS = ['candidates', 'percent_reporting', 'last_updated', 'src', 'eevp'];

const requestedAt = new Map();
export const ingestForTest = (race) => ingest(race);
function ingest(race, { detail = false, started = Date.now() } = {}) {
  if (!race || race.id === undefined) return;
  const id = Number(race.id);
  const prev = data.races.get(id);
  if (race.src === 'nyt') {
    // NYT is the main source: always apply it (its timestamps aren't comparable with civicAPI's).
    const summary = { ...(prev || {}), ...race, id };
    data.races.set(id, summary);
    recordHistory(id, summary);
    return;
  }
  if (prev?.src === 'nyt' && nytFresh()) {
    // Keep NYT's votes, % and calls; take only civicAPI's descriptive fields (name, province, district...).
    const meta = { ...race };
    RESULT_FIELDS.forEach((k) => delete meta[k]);
    delete meta.region_results; delete meta.maps;
    data.races.set(id, { ...meta, ...prev, id });
    if (detail) data.details.set(id, race);
    return;
  }
  if (prev?.src === 'nyt') delete prev.last_updated; // NYT went quiet: let civicAPI take over without a timestamp clash
  const incomingTime = Date.parse(race.last_updated);
  const previousTime = Date.parse(prev?.last_updated);
  if (detail) {
    const previousDetailTime = Date.parse(data.details.get(id)?.last_updated);
    if (!(incomingTime < previousDetailTime)) data.details.set(id, race);
  }
  if (Number.isFinite(incomingTime) && Number.isFinite(previousTime)
    ? incomingTime < previousTime : started < (requestedAt.get(id) ?? 0)) return;
  const summary = { ...(prev || {}), ...race, id, src: 'civic' };
  delete summary.eevp;
  if (!race.last_updated) delete summary.last_updated;
  requestedAt.set(id, started);
  delete summary.region_results;
  delete summary.maps;
  data.races.set(id, summary);
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

// ---------- The New York Times (main source for House, Senate, governor) ----------
// These are the public data files behind NYT's own results pages. They are readable from any site (CORS *)
// and refresh every few seconds. Race calls in them are AP's.
export const NYT_BASE = 'https://static01.nyt.com/elections-assets/pages/data/2026-11-03';
const NYT_PAGES = ['house', 'senate', 'governor'];
const NYT_PARTY = { DEM: 'Democratic', GOP: 'Republican', IND: 'Independent', LIB: 'Libertarian', GRN: 'Green' };

/** Convert one NYT race into the race shape the rest of the site uses (civicAPI's), keyed by our civicAPI id. */
export function fromNyt(r) {
  const m = /^([A-Z]{2})-(?:G|S_W)-([HSG])(?:-(\d+))?-/.exec(r?.nyt_id || '');
  if (!m) return null;
  const [, st, off, num] = m;
  let id;
  if (off === 'H') id = RACE_IDS.house[`${st}-AL`] || (num ? RACE_IDS.house[`${st}-${num.padStart(2, '0')}`] : null);
  else id = (off === 'S' ? RACE_IDS.senate : RACE_IDS.governor)[st];
  if (!id) return null;
  const units = r.reporting_units || [];
  const ru = units.find((u) => u.level === 'state' || u.level === 'district') || units[0];
  if (!ru) return null;
  const won = new Set(r.outcome?.won || []);
  const meta = r.candidate_metadata || {};
  const candidates = (ru.candidates || []).map((c) => {
    const md = meta[c.nyt_id] || {};
    const pid = md.party?.nyt_id;
    return {
      name: [md.first_name, md.last_name].filter(Boolean).join(' ') || c.nyt_id,
      party: NYT_PARTY[pid] || md.party?.name || '',
      votes: Number(c.votes?.total) || 0,
      winner: won.has(c.nyt_id),
      incumbent: !!md.incumbent,
    };
  });
  const eevp = Number(ru.eevp) || 0;
  return {
    id, src: 'nyt', eevp, candidates,
    // NYT's estimate of the share of the expected vote counted.
    percent_reporting: eevp >= 1 ? Math.round(eevp) : Math.round(eevp * 10) / 10,
    last_updated: r.updated_at || null,
  };
}

let nytRequest;
function fetchNyt() {
  if (nytRequest) return nytRequest;
  nytRequest = (async () => {
    data.lastTry.nyt = Date.now();
    const res = await Promise.allSettled(NYT_PAGES.map((p) => getJSON(`${NYT_BASE}/results-${p}.json`, { timeout: 45_000 })));
    let ok = 0;
    res.forEach((x) => {
      if (x.status !== 'fulfilled' || !Array.isArray(x.value?.races)) return;
      ok++;
      for (const r of x.value.races) { const shaped = fromNyt(r); if (shaped) ingest(shaped); }
    });
    if (ok) { data.status.nyt = Date.now(); data.lastUpdate = Date.now(); }
    if (ok === NYT_PAGES.length) delete data.errors.nyt;
    else data.errors.nyt = `${NYT_PAGES.length - ok} of ${NYT_PAGES.length} NYT files failed: ${res.find((x) => x.status === 'rejected')?.reason?.message || 'unexpected format'}`;
    persistHistory();
    emit();
    return ok > 0;
  })().finally(() => { nytRequest = null; });
  return nytRequest;
}

const searchRequests = new Map();
const validRace = (race) => Number(race?.id) > 0 && Array.isArray(race.candidates);
const validDetail = (race, id) => Array.isArray(race?.candidates) && (race.id == null || Number(race.id) === id);
const generalIds = new Set([...Object.values(RACE_IDS.house), ...Object.values(RACE_IDS.senate)].map(Number));

function fetchSearch(key, params) {
  if (searchRequests.has(key)) return searchRequests.get(key);
  const started = data.lastTry[key] = Date.now();
  const request = (async () => {
    try {
      const body = await getJSON(searchURL(params), { timeout: key === 'general' ? 45_000 : 25_000 });
      const races = Array.isArray(body?.races) ? body.races.filter(validRace) : [];
      if (!races.length || (key === 'general' && !races.some((race) => generalIds.has(Number(race.id))))) {
        throw new Error('civicAPI returned no usable race results');
      }
      races.forEach((race) => ingest(race, { started }));
      data.status[key] = Date.now();
      delete data.errors[key];
      data.lastUpdate = Date.now();
      return true;
    } catch (e) {
      data.errors[key] = e.message || String(e);
      return false;
    } finally {
      persistHistory();
      emit();
    }
  })().finally(() => searchRequests.delete(key));
  searchRequests.set(key, request);
  return request;
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
    const started = Date.now();
    try {
      const body = await getJSON(`${BASE}/race/${x.id}`, { timeout: 15_000 });
      if (!validDetail(body, x.id)) throw new Error('civicAPI returned invalid race detail');
      ingest({ ...body, id: x.id }, { detail: true, started });
      ok++;
    } catch (e) {
      data.errors.details = `${e.message || e}`;
    }
  });
  if (ok) { data.status.details = Date.now(); data.lastUpdate = Date.now(); if (ok === targets.length) delete data.errors.details; }
  persistHistory();
  emit();
}

let fallbackRaces = () => ({ focus: [], watch: [] });
let fallbackRound = 0;
let generalRequest;
let fallbackRequest;
export function setHouseFallbackList(districts) { fallbackRaces = districts; }

function fallbackGeneral() {
  if (!fallbackRequest) fallbackRequest = fetchPriorityRaces().finally(() => { fallbackRequest = null; });
  return fallbackRequest;
}

async function fetchPriorityRaces() {
  const districts = fallbackRaces();
  const focused = districts.focus.map((district) => RACE_IDS.house[district]).filter(Boolean);
  const watch = districts.watch.map((district) => RACE_IDS.house[district]).filter(Boolean);
  const senate = Object.values(RACE_IDS.senate);
  const otherHouse = Object.values(RACE_IDS.house).filter((id) => !watch.includes(id));
  const batch = Array.from({ length: Math.min(2, watch.length) }, (_, i) => watch[(fallbackRound * 2 + i) % watch.length]);
  batch.push(otherHouse[fallbackRound % otherHouse.length],
    senate[(fallbackRound * 2) % senate.length], senate[(fallbackRound * 2 + 1) % senate.length]);
  fallbackRound++;
  let recovered = 0;
  await pool([...new Set([...focused.slice(0, 2), ...batch])], 3, async (id) => {
    const started = Date.now();
    const race = await getJSON(`${BASE}/race/${id}`, { timeout: 15_000 });
    if (!validDetail(race, id)) return;
    ingest({ ...race, id }, { started });
    recovered++;
    data.lastFallback = Date.now();
    emit();
  });
  persistHistory();
  return recovered;
}

function refreshGeneral() {
  if (generalRequest) return generalRequest;
  // While NYT is healthy, civicAPI's big House/Senate search is only a backup: refresh it every 2 minutes.
  if (nytFresh() && data.status.general && Date.now() - data.status.general < 120_000) return Promise.resolve(true);
  generalRequest = (async () => {
    const ok = await fetchSearch('general', { election_type: 'General' });
    if (!ok) void fallbackGeneral();
    data.nextUpdate = Date.now() + INTERVAL.general * (ok ? 1 : 2);
    return ok;
  })().finally(() => { generalRequest = null; });
  return generalRequest;
}

// ---------- polling loops ----------
const timers = [];
function loop(fn, ms, initialDelay = 0) {
  let stopped = false;
  const run = async () => {
    if (stopped) return;
    if (document.hidden && data.mode === 'live') { timers.push(setTimeout(run, 5000)); return; }
    const result = await fn();
    if (!stopped) timers.push(setTimeout(run, result?.ok === false || result === false ? ms * 2 : ms));
  };
  timers.push(setTimeout(run, initialDelay));
  return () => { stopped = true; };
}
let stops = [];
export function startLive() {
  stopAll();
  data.mode = 'live';
  loadHistory();
  stops.push(loop(fetchNyt, INTERVAL.nyt));
  stops.push(loop(refreshGeneral, INTERVAL.general));
  // civicAPI's one-race-at-a-time recovery is only needed when NYT isn't supplying results.
  stops.push(loop(() => data.errors.general && !nytFresh() ? fallbackGeneral() : undefined, 12_000, 12_000));
  stops.push(loop(() => fetchSearch('statewide', { election_type: 'Statewide' }), INTERVAL.statewide, 1500));
  stops.push(loop(() => fetchSearch('wi', { province: 'WI', query: 'Wisconsin State', country: 'US' }), INTERVAL.wi, 3000));
  stops.push(loop(() => fetchSearch('mn', { province: 'MN', query: 'Minnesota State', country: 'US' }), INTERVAL.mn, 6000));
  stops.push(loop(() => fetchDetails(), INTERVAL.details, 4500));
  emit();
}

export async function refreshNow() {
  const [nyt, general, statewide] = await Promise.all([
    fetchNyt(),
    refreshGeneral(),
    fetchSearch('statewide', { election_type: 'Statewide' }),
  ]);
  const recovered = general || nyt ? 0 : await fallbackGeneral();
  return { nyt, general, statewide, recovered, errors: { ...data.errors } };
}

/**
 * Overall feed health. live: main feed updated within ~3 refresh cycles; stale: older than that or
 * currently failing; offline: nothing good for 6+ minutes; connecting: no successful load yet.
 */
export function feedHealth() {
  // House/Senate results are live if either NYT (main) or civicAPI's bulk feed is healthy.
  const nytOk = data.status.nyt && !data.errors.nyt ? data.status.nyt : 0;
  const civicOk = data.status.general && !data.errors.general ? data.status.general : 0;
  const last = Math.max(data.status.nyt || 0, data.status.general || 0) || null;
  const everLoaded = Boolean(last || data.status.statewide || data.lastFallback);
  if (!last) return { state: data.errors.general || data.errors.nyt ? (everLoaded ? 'stale' : 'offline') : 'connecting', everLoaded, last };
  const healthy = Math.max(nytOk, civicOk);
  const age = Date.now() - last;
  if (healthy && Date.now() - healthy < 100_000) return { state: 'live', everLoaded, last, age };
  if (age < 360_000) return { state: 'stale', everLoaded, last, age };
  return { state: 'offline', everLoaded, last, age };
}

function stopAll() {
  stops.forEach((s) => s());
  stops = [];
  timers.forEach(clearTimeout);
  timers.length = 0;
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
