// One status vocabulary for every race, chamber and feed on the site. Every status has a text label;
// color is never the only signal.
import { data, nowNight, feedHealth } from './api.js';
import { hhmm, fmtNightTime } from './util.js';

export const STATUS = {
  loading: { label: 'Loading', cls: 'loading' },
  open: { label: 'Polls open', cls: 'open' },
  novotes: { label: 'No votes reported', cls: 'novotes' },
  leading: { label: 'Leading', cls: 'leading' },
  tied: { label: 'Tied', cls: 'leading' },
  called: { label: 'Called', cls: 'called' },
  norace: { label: 'No race', cls: 'norace' },
  unavailable: { label: 'Results unavailable', cls: 'unavailable' },
};

/**
 * @param res   readRace() output or null
 * @param opts  { close: 'HH:MM' (all polls closed), covered: bool (race id known) }
 */
export function raceStatus(res, { close = null, covered = true } = {}) {
  const t = nowNight();
  const h = feedHealth();
  if (!covered) return { key: 'unavailable', text: 'Not in feed' };
  if (!res) {
    if (h.state === 'connecting') return { key: 'loading', text: 'Loading…' };
    if (h.everLoaded) return { key: 'unavailable', text: 'Results unavailable' };
    return { key: 'loading', text: 'Loading…' };
  }
  if (res.called) return { key: 'called', text: 'Called', side: res.called };
  if (res.hasVotes) {
    if (res.margin !== null && Math.abs(res.margin) < 0.05) return { key: 'tied', text: `Tied · ${res.rep}% in` };
    return { key: 'leading', text: `${res.rep}% in`, side: res.leader };
  }
  const c = close === null ? null : typeof close === 'number' ? close : hhmm(close);
  if (c !== null && t < c) return { key: 'open', text: `Polls close ${fmtNightTime(c)} CT` };
  return { key: 'novotes', text: 'No votes reported' };
}

