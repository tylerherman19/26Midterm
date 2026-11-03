// "How big is the night?" Riptide / Tide / Wave / Tsunami centerpiece.
import { esc } from '../util.js';
import { houseTally, houseSwing, SWING_MIN } from '../model.js';
import { HOUSE_FORECAST } from '../scenario.js';
import { FORECAST_SOURCE } from '../data/houseForecast.js';
import { feedHealth } from '../api.js';
import { openAttr } from '../state.js';

const MIN = 196, MAX = 266;
const P = (v) => Math.max(0, Math.min(100, ((v - MIN) / (MAX - MIN)) * 100));
const TIERS = [
  ['riptide', MIN, 218, 'Red Riptide', 'GOP keeps the House', 'under 218'],
  ['tide', 218, 230, 'Blue Tide', 'Narrow Democratic House', '218 to 229'],
  ['wave', 230, 240, 'Blue Wave', 'Comfortable Democratic House', '230 to 239'],
  ['tsunami', 240, MAX, 'Blue Tsunami', 'Landslide', '240 or more'],
];
const fmtShift = (s) => (Math.abs(s) < 0.05 ? 'No shift' : `${s > 0 ? 'D' : 'R'}+${Math.abs(s) % 1 ? Math.abs(s).toFixed(1) : Math.abs(s)}`);

function standings(t, sw) {
  const h = feedHealth();
  const loading = !h.everLoaded;
  const v = (n) => (loading ? '—' : n);
  const anyVotes = t.called + t.leadD + t.leadR + t.leadO + t.tied > 0;
  return `<div class="stands" aria-label="Where the night stands">
    <div class="st-calls">
      <div class="sc d"><span class="lbl">Democrats called</span><b>${v(t.calledD)}</b><small>${loading ? '' : t.control === 'd' ? 'Majority won' : `${t.needD} more for 218`}</small></div>
      <div class="sc r"><span class="lbl">Republicans called</span><b>${v(t.calledR)}</b><small>${loading ? '' : t.control === 'r' ? 'Majority won' : `${t.needR} more for 218`}</small></div>
      <div class="sc u"><span class="lbl">Not yet called</span><b>${v(t.uncalled)}</b><small>${t.calledO ? `${t.calledO} won by others · ` : ''}of 435 seats</small></div>
    </div>
    <div class="st-leads ${anyVotes ? '' : 'quiet'}"><span class="lbl">Leads in uncalled races <em>(not calls)</em></span>
      ${loading ? '<span class="muted">Loading results…</span>' : anyVotes ? `<span><b class="m-d">D ${t.leadD}</b> · <b class="m-r">R ${t.leadR}</b>${t.leadO ? ` · other ${t.leadO}` : ''}${t.tied ? ` · tied ${t.tied}` : ''} · no votes yet ${t.noVotes}</span>` : `<span class="muted">No votes reported yet in any House race.</span>`}
    </div>
    <div class="st-est">
      <div><span class="lbl">Pre-election forecast</span><b>${HOUSE_FORECAST} D</b><small>DDHQ, ${FORECAST_SOURCE.date}, via the guide</small></div>
      <div>${swingSummary(sw)}</div>
    </div>
    ${t.feedCheck && !t.feedCheck.matches && t.called ? `<p class="note warn">civicAPI's national tally (D ${t.feedCheck.d}, R ${t.feedCheck.r}) differs from the sum of district calls shown here. District calls are used so every number on the site agrees.</p>` : ''}
  </div>`;
}

function swingSummary(sw) {
  if (!sw.enough) {
    return `<span class="lbl">Swing so far</span><b class="muted">Waiting</b><small>Appears once ${SWING_MIN.districts}+ forecast districts in ${SWING_MIN.states}+ states are called or ${SWING_MIN.reporting}%+ counted. Now: ${sw.n} district${sw.n === 1 ? '' : 's'}${sw.n ? ` in ${sw.states} state${sw.states === 1 ? '' : 's'}` : ''}${sw.partial ? `, ${sw.partial} more partly counted` : ''}.</small>`;
  }
  return `<span class="lbl">Swing so far <span class="scen-tag">scenario</span></span><b class="m-${sw.median >= 0 ? 'd' : 'r'}">${fmtShift(Math.round(sw.median * 10) / 10)}</b><small>median vs DDHQ in ${sw.n} districts (${sw.states} states). Applied to every seat: ~${sw.seats} D (middle half of districts: ${Math.min(sw.seatsLo, sw.seatsHi)} to ${Math.max(sw.seatsLo, sw.seatsHi)}).</small>`;
}

function scale(t, sw) {
  const floorD = t.calledD;
  const marks = [];
  marks.push({ cls: 'fc', at: HOUSE_FORECAST, row: 0, label: `Forecast ${HOUSE_FORECAST}`, sub: 'DDHQ, pre-election' });
  if (sw.enough) marks.push({ cls: 'swing', at: sw.seats, lo: Math.min(sw.seatsLo, sw.seatsHi), hi: Math.max(sw.seatsLo, sw.seatsHi), row: 2, label: `Swing so far: ~${sw.seats}`, sub: `${sw.n} districts` });
  if (floorD > 0) marks.push({ cls: 'called', at: floorD, row: 3, label: floorD < MIN ? `◄ ${floorD} called` : `${floorD} called`, sub: 'a floor, not a forecast' });
  return `<div class="ns" role="img" aria-label="Seat scale from ${MIN} to ${MAX}. 218 is the majority. ${marks.map((m) => m.label).join('. ')}.">
    <div class="ns-bar">${TIERS.map(([k, a, b, name, , range]) => `<i class="band ${k}" style="left:${P(a)}%;width:${P(b) - P(a)}%"><span><b>${name}</b><small>${range}</small></span></i>`).join('')}
      <b class="maj" style="left:${P(218)}%"><em>218 majority</em></b>
      ${sw.enough ? `<i class="range" style="left:${P(marks.find((m) => m.cls === 'swing').lo)}%;width:${P(marks.find((m) => m.cls === 'swing').hi) - P(marks.find((m) => m.cls === 'swing').lo)}%"></i>` : ''}
    </div>
    <div class="ns-ticks" aria-hidden="true">${[200, 210, 218, 230, 240, 250, 260].map((v) => `<span style="left:${P(v)}%">${v}</span>`).join('')}</div>
    <div class="ns-marks" aria-hidden="true">${marks.map((m) => `<div class="mk ${m.cls} ${P(m.at) > 66 ? 'flip' : ''}" style="left:${P(m.at)}%;--row:${m.row}"><i></i><span><b>${esc(m.label)}</b><small>${esc(m.sub)}</small></span></div>`).join('')}</div>
  </div>
  <div class="ns-key">
    <span><i class="k fc"></i>Pre-election forecast</span>
    <span><i class="k swing"></i>Swing so far (needs enough data)</span>
    <span><i class="k called"></i>Seats already called for Democrats</span>
  </div>`;
}

function howItWorks() {
  return `<details class="how" ${openAttr('how-night')}><summary>How this works</summary>
    <ul>
      <li><b>Categories.</b> The tiers come from the Election Night Guide (pp. 4 and 6): Red Riptide = Republicans keep the House (Democrats under 218); Blue Tide = 218 to 229; Blue Wave = 230 to 239; Blue Tsunami = 240 or more. 218 of 435 is a majority; vacancies don't change who wins seats tonight.</li>
      <li><b>Forecast.</b> Decision Desk HQ's pre-election projection of 230 Democratic seats (${FORECAST_SOURCE.date}), as printed in the guide. It is not updated tonight.</li>
      <li><b>Called seats</b> come from civicAPI's winner flags, summed district by district across all 435 seats. Leads are never counted as calls. If civicAPI withdraws a call, the seat goes back to uncalled.</li>
      <li><b>Swing so far</b> uses only districts with a DDHQ margin that are called or at least ${SWING_MIN.reporting}% counted. It takes the median of (live margin minus DDHQ) and applies it through the scenario engine. It stays hidden until ${SWING_MIN.districts} such districts in ${SWING_MIN.states} states exist. Early-reporting districts (Florida, Virginia, the Carolinas, Ohio) are not a random sample, and civicAPI's "% reporting" is not documented as share of expected vote, so read it as a rough reading, not a projection.</li>
    </ul></details>`;
}

export function nightCenterpiece({ compact = false } = {}) {
  const t = houseTally();
  const sw = houseSwing();
  return `<section class="card wide night" id="night">
    <div class="night-h"><div><h2>How big is the night?</h2><p class="dek">Democratic House seats on the guide's scale. 218 wins the majority.</p></div></div>
    ${standings(t, sw)}
    <div id="ns-wrap">${scale(t, sw)}</div>
    ${compact ? `<a class="more" href="#/house">Methodology →</a>` : howItWorks()}
  </section>`;
}
