// "How big is the night?" Riptide / Tide / Wave / Tsunami centerpiece.
import { esc, fmtMargin, fmtNightTime, hhmm, marginClass } from '../util.js';
import { houseTally, houseSwing, houseSignals, SWING_MIN } from '../model.js';
import { houseSeatsAtShift, HOUSE_FORECAST } from '../scenario.js';
import { FORECAST_SOURCE } from '../data/houseForecast.js';
import { feedHealth } from '../api.js';
import { openAttr } from '../state.js';
import { simTag } from '../status.js';

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

function scale(t, sw, sig) {
  const floorD = t.calledD;
  const marks = [];
  marks.push({ cls: 'fc', at: HOUSE_FORECAST, row: 0, label: `Forecast ${HOUSE_FORECAST}`, sub: 'DDHQ, pre-election' });
  if (sw.enough) marks.push({ cls: 'swing', at: sw.seats, lo: Math.min(sw.seatsLo, sw.seatsHi), hi: Math.max(sw.seatsLo, sw.seatsHi), row: 2, label: `Swing so far: ~${sw.seats}`, sub: `${sw.n} districts` });
  if (floorD > 0) marks.push({ cls: 'called', at: floorD, row: 3, label: floorD < MIN ? `◄ ${floorD} called` : `${floorD} called`, sub: 'a floor, not a forecast' });
  return `<div class="ns" role="img" aria-label="Seat scale from ${MIN} to ${MAX}. 218 is the majority. ${marks.map((m) => m.label).join('. ')}.">
    <div class="ns-pins" aria-hidden="true">${sig.map((s, i) => `<b class="pin sgn-${s.state}" style="left:${P(s.guideSeats)}%" title="${esc(s.label)}: guide marker ${s.guideLabel}"><em>${i + 1}</em></b>`).join('')}<span class="pins-lbl">Guide's race markers</span></div>
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
    <span><i class="k pin">1</i>Guide's race markers (illustrative)</span>
  </div>`;
}

function raceRow(h) {
  const m = h.meta, r = h.res;
  const dn = r?.dc?.name || m.dn || 'Democrat', rn = r?.rc?.name || m.rn || 'Republican';
  const inc = m.inc === 'd' ? `${dn.split(' ').pop()} (D) is the incumbent` : m.inc === 'r' ? `${rn.split(' ').pop()} (R) is the incumbent` : 'Open seat';
  const close = m.closeMost !== m.close ? `${fmtNightTime(hhmm(m.closeMost))} CT, all polls by ${fmtNightTime(hhmm(m.close))}` : `${fmtNightTime(hhmm(m.close))} CT`;
  let live;
  if (h.status === 'called') live = `<b class="m-${r.called === 'r' ? 'r' : 'd'}">Called: ${esc(r.called === 'd' ? dn : r.called === 'r' ? rn : 'other')}</b>${r.hasVotes ? ` · ${fmtMargin(r.margin, { digits: 1 })}` : ''}`;
  else if (h.status === 'leading' || h.status === 'tied') live = `${h.status === 'tied' ? 'Tied' : `<b class="m-${r.leader === 'd' ? 'd' : 'r'}">${esc(r.leader === 'd' ? dn : rn)} leads</b>`} ${fmtMargin(r.margin, { digits: 1 })} · ${r.rep}% in`;
  else live = esc(h.st.text);
  const vs = h.vsForecast;
  return `<div class="rx">
    <div class="rx-h"><b>${h.dist}</b> <span>${esc(dn)} (D) vs. ${esc(rn)} (R)</span>${simTag()}</div>
    <dl>
      <dt>Status</dt><dd>${live}</dd>
      <dt>DDHQ forecast</dt><dd>${m.ddhq !== null && m.ddhq !== undefined ? `<b class="m-${marginClass(m.ddhq)}">${fmtMargin(m.ddhq)}</b> (${FORECAST_SOURCE.date})` : 'not in the guide'}</dd>
      ${vs !== null ? `<dt>Vs forecast</dt><dd><b class="m-${vs >= 0 ? 'd' : 'r'}">${vs >= 0 ? '+' : '−'}${Math.abs(vs).toFixed(1)}</b> toward ${vs >= 0 ? 'Democrats' : 'Republicans'}${r.called ? '' : ` (only ${r.rep}% counted)`}</dd>` : ''}
      <dt>Seat</dt><dd>${inc}${m.redrawn ? ' · redrawn since 2024' : ''}</dd>
      <dt>Polls close</dt><dd>${close}</dd>
      ${m.lateR ? `<dt>Caveat</dt><dd>In 2022, later-counted votes here leaned Republican, so an early Democratic lead could shrink.</dd>` : ''}
    </dl>
  </div>`;
}

function examples(sig) {
  return `<div class="examples">
    <p class="small">The guide pins these races to seat levels to illustrate what a Democratic win would be <em>consistent with</em>. No single district decides the national total.</p>
    ${sig.map((s, i) => {
      const flipAt = s.rs.map((h) => h.meta.ddhq).filter((x) => x !== null && x !== undefined);
      const need = flipAt.length ? Math.max(...flipAt.map((m) => -m)) : null; // shift needed for every listed seat
      const need1 = flipAt.length ? Math.min(...flipAt.map((m) => -m)) : null; // for any one seat
      const sh = s.mode === 'all' ? need : need1;
      const usw = sh === null ? '' : sh <= 0
        ? `DDHQ already favors Democrats here. A Republican win would point to a shift of at least ${fmtShift(sh)} toward the GOP (≈${houseSeatsAtShift(sh)} D seats or fewer under uniform swing).`
        : `Under uniform swing, Democrats win ${s.mode === 'all' ? 'all of these' : 'one of these'} once results run about ${fmtShift(sh + 0.5)} or better vs DDHQ, which corresponds to ≈${houseSeatsAtShift(sh + 0.5)}+ seats.`;
      const stateTxt = { hit: 'Democrats won', miss: 'Democrats lost', leaning: 'Democrats lead (uncalled)', trailing: 'Democrats trail (uncalled)', waiting: 'No result yet' }[s.state];
      return `<details class="ex-race sgn-${s.state}" ${openAttr(`sig-${i}`)}>
        <summary><i class="k pin">${i + 1}</i><b>${esc(s.label)}</b><span class="muted">${esc(s.title)}</span><span class="ex-state">${stateTxt}</span><span class="ex-guide">guide marker ${esc(s.guideLabel)} seats</span></summary>
        <p class="small">${esc(s.why)}</p>
        <p class="small"><b>What the guide says:</b> a Democratic win here is consistent with roughly ${esc(s.guideLabel)} Democratic seats (guide p. 4, an editorial illustration). <b>Uniform-swing reading:</b> ${usw}</p>
        <div class="rx-list">${s.rs.map(raceRow).join('')}</div>
      </details>`;
    }).join('')}
  </div>`;
}

function howItWorks() {
  return `<details class="how" ${openAttr('how-night')}><summary>How this works</summary>
    <ul>
      <li><b>Categories.</b> The tiers come from the Election Night Guide (pp. 4 and 6): Red Riptide = Republicans keep the House (Democrats under 218); Blue Tide = 218 to 229; Blue Wave = 230 to 239; Blue Tsunami = 240 or more. 218 of 435 is a majority; vacancies don't change who wins seats tonight.</li>
      <li><b>Forecast.</b> Decision Desk HQ's pre-election projection of 230 Democratic seats (${FORECAST_SOURCE.date}), as printed in the guide. It is not updated tonight.</li>
      <li><b>Called seats</b> come from civicAPI's winner flags, summed district by district across all 435 seats. Leads are never counted as calls. If civicAPI withdraws a call, the seat goes back to uncalled.</li>
      <li><b>Swing so far</b> uses only districts with a DDHQ margin that are called or at least ${SWING_MIN.reporting}% counted. It takes the median of (live margin minus DDHQ) and applies it through the scenario engine. It stays hidden until ${SWING_MIN.districts} such districts in ${SWING_MIN.states} states exist. Early-reporting districts (Florida, Virginia, the Carolinas, Ohio) are not a random sample, and civicAPI's "% reporting" is not documented as share of expected vote, so read it as a rough reading, not a projection.</li>
      <li><b>Race markers.</b> The numbered pins are the guide's illustrations of what a result would be consistent with. One district never determines the national total.</li>
    </ul></details>`;
}

export function nightCenterpiece({ compact = false } = {}) {
  const t = houseTally();
  const sw = houseSwing();
  const sig = houseSignals();
  return `<section class="card wide night" id="night">
    <div class="night-h"><div><h2>How big is the night?</h2><p class="dek">Democratic House seats on the guide's scale. 218 wins the majority.</p></div>${simTag()}</div>
    ${standings(t, sw)}
    <div id="ns-wrap">${scale(t, sw, sig)}</div>
    ${compact ? `<a class="more" href="#/house">Race markers and methodology →</a>` : `<details ${openAttr('night-races')}><summary>Race markers</summary>${examples(sig)}</details>${howItWorks()}`}
  </section>`;
}
