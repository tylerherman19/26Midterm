// Shared helpers: formatting, Central Time clock, small DOM utilities.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Margin label in the guide's style: D+4, R+11, Even. */
export function fmtMargin(m, { digits = 0, dLabel = 'D', even = 'Even' } = {}) {
  if (m === null || m === undefined || Number.isNaN(m)) return '—';
  const v = Math.abs(m);
  const r = v.toFixed(digits);
  if (Number(r) === 0) return even;
  return `${m > 0 ? dLabel : 'R'}+${r}`;
}
export const marginClass = (m) => (m === null || m === undefined || Number.isNaN(m) ? 'na' : Math.abs(m) < 0.05 ? 'even' : m > 0 ? 'd' : 'r');
export const fmtLean = (m) => (m === 0 ? 'Even' : m > 0 ? `H+${m}` : `T+${-m}`);
export const fmtPct = (p, d = 0) => (p === null || p === undefined ? '—' : `${Number(p).toFixed(d)}%`);
export const fmtInt = (n) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('en-US'));
export const fmtCompact = (n) => {
  if (!n) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  return String(n);
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const surname = (full) => {
  const parts = String(full || '').replace(/\s+/g, ' ').trim().split(' ').filter((p) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(p));
  return parts[parts.length - 1] || '';
};
export const norm = (s) => String(s || '').toLowerCase().replace(/\bcounty\b|\bparish\b/g, '').replace(/[^a-z]/g, '');

// ---------- Central Time ----------
// "Election-night minutes": minutes since 00:00 CT on Nov 3, 2026 (so 1 AM Wed = 25*60).
const ELECTION_DAY_UTC_MIDNIGHT_CT = Date.UTC(2026, 10, 3, 6, 0, 0); // CST = UTC-6 (DST ended Nov 1)

export function nightMinutesFromDate(d) {
  return (d.getTime() - ELECTION_DAY_UTC_MIDNIGHT_CT) / 60000;
}
export function dateFromNightMinutes(m) {
  return new Date(ELECTION_DAY_UTC_MIDNIGHT_CT + m * 60000);
}
/** "18:30" -> 1110; "24:00" -> 1440 */
export function hhmm(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}
export function fmtClock(nightMin, { seconds = false } = {}) {
  const d = dateFromNightMinutes(nightMin);
  return d.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) });
}
export function fmtNightTime(t) {
  const m = typeof t === 'number' ? t : hhmm(t);
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${ap}`;
}
export function fmtDayLabel(nightMin) {
  const d = dateFromNightMinutes(nightMin);
  return d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' });
}
export function fmtCountdown(mins) {
  if (mins <= 0) return 'now';
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const s = Math.floor((mins * 60) % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
export function ago(ts) {
  if (!ts) return 'never';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(val));
  } catch { return null; }
  return val;
}

/** Linear interpolation over a {x: y} map (keys numeric strings). */
export function interp(points, x) {
  const xs = Object.keys(points).map(Number).sort((a, b) => a - b);
  if (x <= xs[0]) return points[xs[0]];
  if (x >= xs[xs.length - 1]) return points[xs[xs.length - 1]];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return points[xs[i]] + t * (points[xs[i + 1]] - points[xs[i]]);
    }
  }
  return null;
}
