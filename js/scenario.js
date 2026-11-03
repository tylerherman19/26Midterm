// Uniform-swing scenarios built from DDHQ's district-level margins (guide pp. 28-29).
// A "shift" of +3 means every race runs 3 points more Democratic than its DDHQ margin.
import { CLOSE_84, SAFE_D, DDHQ } from './data/houseForecast.js';
import { SENATE } from './data/guide.js';

export const SHIFT_LIMIT = 8; // beyond +/-8 the seats outside the guide's 84-seat list could also flip
export const HOUSE_THRESHOLDS = { majority: 218, tide: 218, wave: 230, tsunami: 240 };
export const HOUSE_FORECAST = 230;

/** Democratic House seats if every district misses DDHQ by `shift` points. Even margins count as not won. */
export function houseSeatsAtShift(shift) {
  const s = Math.max(-SHIFT_LIMIT, Math.min(SHIFT_LIMIT, shift));
  return SAFE_D + CLOSE_84.filter(([, m]) => m + s > 0).length;
}
/** Seats that change hands relative to the forecast under a shift. */
export function houseFlipsAtShift(shift) {
  const toD = CLOSE_84.filter(([, m]) => m <= 0 && m + shift > 0).map(([d]) => d);
  const toR = CLOSE_84.filter(([, m]) => m > 0 && m + shift <= 0).map(([d]) => d);
  return { toD, toR };
}
/** Democratic Senate seats (incl. 34 not up) if every race misses DDHQ by `shift`. */
export function senateSeatsAtShift(shift) {
  return SENATE.dNotUp + SENATE.path.filter(([, m]) => m + shift > 0).length;
}
export function houseTier(seats) {
  if (seats === null || seats === undefined) return null;
  if (seats < 218) return 'riptide';
  if (seats < 230) return 'tide';
  if (seats < 240) return 'wave';
  return 'tsunami';
}
export function senateTierFromSeats(dSeats) {
  const net = dSeats - SENATE.dBefore;
  if (net <= 0) return 'riptide';
  if (net <= 3) return 'tide';
  if (net <= 6) return 'wave';
  return 'tsunami';
}
/** Smallest uniform shift at which a seat with DDHQ margin m goes Democratic (m + s > 0). */
export function shiftToFlip(m) { return -m; }
export const ddhqFor = (dist) => (dist in DDHQ ? DDHQ[dist] : null);
