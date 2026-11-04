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
    // cache: 'no-cache' makes the browser revalidate every time. civicAPI allows a 15s cache plus 30s of
    // stale-while-revalidate, so without this a poll could get a copy up to ~45s old.
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-cache', headers: { Accept: 'application/json' } });
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

// NYT's numbers stay authoritative while its feed is fresh; civicAPI fills in only if NYT goes quiet.
const NYT_FRESH_MS = 5 * 60_000;
export const nytFresh = () => !!data.status.nyt && Date.now() - data.status.nyt < NYT_FRESH_MS;
const RESULT_FIELDS = ['candidates', 'percent_reporting', 'last_updated', 'src', 'eevp'];

export const ingestForTest = (race) => ingest(race);
function ingest(race, { detail = false } = {}) {
  if (!race || race.id === undefined) return;
  const id = Number(race.id);
  const prev = data.races.get(id);
  if (race.src !== 'nyt' && prev?.src === 'nyt' && nytFresh()) {
    // Keep NYT's votes, % and calls; take only civicAPI's descriptive fields (name, province, district...).
    const meta = { ...race };
    RESULT_FIELDS.forEach((k) => delete meta[k]);
    delete meta.region_results; delete meta.maps;
    data.races.set(id, { ...meta, ...prev, id });
    if (detail) data.details.set(id, race);
    return;
  }
  const summary = { ...(prev || {}), ...race, id, src: race.src || 'civic' };
  if (summary.src !== 'nyt') delete summary.eevp;
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

async function fetchNyt() {
  data.lastTry.nyt = Date.now();
  const res = await Promise.allSettled(NYT_PAGES.map((p) => getJSON(`${NYT_BASE}/results-${p}.json`, { timeout: 45_000 })));
  let ok = 0;
  res.forEach((x) => {
    if (x.status !== 'fulfilled') return;
    ok++;
    for (const r of x.value.races || []) { const shaped = fromNyt(r); if (shaped) ingest(shaped); }
  });
  if (ok) { data.status.nyt = Date.now(); data.lastUpdate = Date.now(); }
  if (ok === NYT_PAGES.length) delete data.errors.nyt;
  else data.errors.nyt = `${NYT_PAGES.length - ok} of ${NYT_PAGES.length} NYT files failed: ${res.find((x) => x.status === 'rejected')?.reason?.message || 'error'}`;
  persistHistory();
  emit();
  return ok > 0;
}

// Requests to the same feed can overlap (a manual refresh during a scheduled poll, or a slow response).
// Only the newest request's response is applied, so an older, slower response can't overwrite fresher numbers.
const feedSeq = {}, feedApplied = {};
async function fetchSearch(key, params) {
  data.lastTry[key] = Date.now();
  const seq = (feedSeq[key] = (feedSeq[key] || 0) + 1);
  let ok = false;
  try {
    const body = await getJSON(searchURL(params), { timeout: 60_000 });
    if (seq < (feedApplied[key] || 0)) return true; // a newer response for this feed already landed
    feedApplied[key] = seq;
    (body.races || []).forEach((r) => ingest(r));
    data.status[key] = Date.now();
    delete data.errors[key];
    data.lastUpdate = Date.now();
    ok = true;
  } catch (e) {
    if (seq >= (feedApplied[key] || 0)) data.errors[key] = `${e.message || e}`;
  }
  persistHistory();
  emit();
  return ok;
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
// After a failed poll, try again sooner than the normal interval so a slow or dropped request
// doesn't leave results a full extra cycle behind.
const RETRY_MS = 10_000;
function loop(fn, ms, initialDelay = 0) {
  let stopped = false;
  const run = async () => {
    if (stopped) return;
    if (document.hidden && data.mode === 'live') { timers.push(setTimeout(run, 5000)); return; }
    const ok = await fn();
    if (!stopped) timers.push(setTimeout(run, ok === false ? Math.min(ms, RETRY_MS) : ms));
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
  stops.push(loop(fetchNyt, INTERVAL.nyt));
  stops.push(loop(async () => {
    // While NYT is healthy, civicAPI's large House/Senate search is only a backup: refresh it every 2 minutes.
    if (nytFresh() && data.status.general && Date.now() - data.status.general < 120_000) return true;
    const ok = await fetchSearch('general', { election_type: 'General' });
    data.nextUpdate = Date.now() + (ok ? INTERVAL.general : RETRY_MS);
    if (data.errors.general && !data.status.general && houseFallbackList.length) await fallbackHouse(houseFallbackList);
    return ok;
  }, INTERVAL.general));
  stops.push(loop(() => fetchSearch('statewide', { election_type: 'Statewide' }), INTERVAL.statewide, 1500));
  stops.push(loop(() => fetchSearch('wi', { province: 'WI', query: 'Wisconsin State', country: 'US' }), INTERVAL.wi, 3000));
  stops.push(loop(() => fetchSearch('mn', { province: 'MN', query: 'Minnesota State', country: 'US' }), INTERVAL.mn, 6000));
  stops.push(loop(() => fetchDetails(), INTERVAL.details, 4500));
  emit();
}

export async function refreshNow() {
  const before = { ...data.status };
  await Promise.all([
    fetchNyt(),
    fetchSearch('general', { election_type: 'General' }),
    fetchSearch('statewide', { election_type: 'Statewide' }),
    fetchDetails({ force: true }),
  ]);
  data.nextUpdate = Date.now() + INTERVAL.general;
  const ok = data.status.nyt !== before.nyt || data.status.general !== before.general || data.status.statewide !== before.statewide;
  return { ok, at: Date.now(), errors: { ...data.errors } };
}

/**
 * Overall feed health. live: main feed updated within ~3 refresh cycles; stale: older than that or
 * currently failing; offline: nothing good for 6+ minutes; connecting: no successful load yet.
 */
export function feedHealth() {
  const last = Math.max(data.status.nyt || 0, data.status.general || 0, data.status.statewide || 0);
  const everLoaded = last > 0;
  if (!everLoaded) return { state: Object.keys(data.errors).length ? 'offline' : 'connecting', everLoaded, last: null };
  const age = Date.now() - last;
  // Stale only if no results source is healthy: civicAPI failing and NYT failing or not fresh (or vice versa).
  const mainFailing = (data.errors.general && (data.errors.nyt || !nytFresh())) || (data.errors.nyt && !data.status.general);
  if (age < 100_000 && !mainFailing) return { state: 'live', everLoaded, last, age };
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
