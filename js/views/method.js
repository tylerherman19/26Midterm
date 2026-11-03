import { esc } from '../util.js';
import { CLOSE_SOURCE, STATE_CLOSE, DISTRICT_CLOSE, CALL_NOTE } from '../data/closings.js';
import { FORECAST_SOURCE, SAFE_D, SAFE_R, CLOSE_84 } from '../data/houseForecast.js';
import { INTERVAL } from '../api.js';
import { SWING_MIN } from '../model.js';
import { fmtNightTime, hhmm } from '../util.js';
import { STATE_NAMES } from '../data/guide.js';

const SOURCES = [
  ['Live results and race calls', 'civicAPI', 'https://civicapi.org', 'Results provider. Race calls are civicAPI\'s winner flags. Retrieved live tonight.', 'Results'],
  ['Pre-election forecasts', 'Decision Desk HQ, as printed in the Election Night Guide', null, 'DDHQ forecast dated Nov. 1, 2026 (guide p. 23). Senate/governor margins pp. 5, 8 to 18, 23; House margins pp. 2, 6, 29.', 'Forecast'],
  ['Win probabilities', 'DDHQ, read from the guide\'s chart (p. 30)', null, 'Approximate: read by eye from a scatter plot, rounded.', 'Estimate'],
  ['Poll-closing times', CLOSE_SOURCE.name, CLOSE_SOURCE.url, `Checked ${CLOSE_SOURCE.checked}. Converted to Central Time. District overrides from time-zone geography.`, 'Official schedule (aggregated)'],
  ['County "to tie" targets, expected-by times, count notes', 'Election Night Guide', null, 'Guide pp. 3 and 8 to 18. Targets assume uniform swing from 2024. "In by" times are the guide\'s estimates from 2024 reporting.', 'Editorial analysis'],
  ['2024 presidential and county results', 'Election Night Guide', null, 'As printed in the guide. For districts redrawn since 2024 (★), the guide does not state whether results were recalculated to the new lines.', 'Historical results'],
  ['Count pace by hour (2024)', 'Election Night Guide', null, 'Guide pp. 21, 22 and 25: share of the final 2024 count by hour. The underlying feed and race measured are not stated in the guide.', 'Historical estimate'],
  ['Wisconsin legislative ratings', 'John Johnson, Marquette Law School Lubar Center, "Rating the Battleground Districts in the Wisconsin Legislature"', 'https://law.marquette.edu/facultyblog/?p=31910', 'Published July 20, 2026; updated Oct. 27, 2026. Ratings match those in the guide.', 'Editorial rating'],
  ['Wisconsin fundraising', 'Election Night Guide', null, 'Figures as printed. Only some carry a reporting cutoff ("thru Jul 27", "thru Sep 23"); the rest have no stated period or filing source.', 'Campaign finance (unverified)'],
  ['Wisconsin outside money (First Amendment LLC)', 'Election Night Guide', null, 'No date or filing source given in the guide.', 'Unverified'],
  ['Legislative starting balances', 'Election Night Guide (p. 24)', null, 'Seat counts before tonight as printed. Minnesota House 67 DFL, 66 R reflects one vacant, safely Republican seat; the chamber was restored to a 67 to 67 tie in Jan. 2026.', 'Historical'],
  ['Brown 2024 baseline (Ohio tell)', 'Ohio 2024 U.S. Senate result: Moreno 50.1%, Brown 46.5%', 'https://ballotpedia.org/U.S._Senate,_Ohio_election,_2024', 'R+3.6.', 'Official result (via Ballotpedia)'],
];

export function render() {
  const split = Object.entries(STATE_CLOSE).filter(([, c]) => c.most !== c.all || c.note);
  return `<div class="grid method">
    <section class="card wide"><h2>Methodology and sources</h2>
      <p class="dek">What every number on this site is, where it comes from, and what it can't tell you.</p>
      <div class="m-grid">
        <div><h4>Results and calls</h4>
          <p>Live results come from <a href="https://civicapi.org" target="_blank" rel="noopener">civicAPI</a>. The site checks House, Senate and national tallies every ${INTERVAL.general / 1000}s, governors and chambers every ${INTERVAL.statewide / 1000}s, county results every ${INTERVAL.details / 1000}s once a guide state's polls close, and Wisconsin and Minnesota legislative districts every ${INTERVAL.wi / 1000}s. civicAPI caches responses for about 15 seconds.</p>
          <p><b>Independents in the Senate</b> count on the Democratic side: they caucus with Democrats. The 34 Democratic holdovers include King and Sanders. In a 2026 race with no Democrat, the leading independent is the Democratic-side candidate (Osborn in Nebraska, Achilles in Idaho, Bengs in South Dakota), and an independent who wins or leads any Senate race counts as Democratic-aligned. Other third parties are counted separately. In House races, independents are counted separately, not as Democrats.</p>
          <p><b>A lead is not a call.</b> "Leading" means a candidate has more votes counted so far. "Called" means civicAPI has flagged a winner. If civicAPI withdraws a call, the race returns to uncalled and the Latest developments feed says so.</p>
          <p><b>% reporting</b> is civicAPI's <code>percent_reporting</code> field. Its definition (precincts, or share of expected vote) is not documented and may differ by state, so it is not directly comparable across jurisdictions, or with the guide's 2024 "share of final count" figures.</p>
          <p><b>Feed status.</b> LIVE means the main feed updated within about 100 seconds. STALE means it hasn't, or the last attempt failed; numbers shown are the last good data. OFFLINE means nothing good for 6+ minutes. Missing results are never filled in with forecasts or simulated values.</p>
        </div>
        <div><h4>Status labels</h4>
          <dl class="defs"><dt>Polls open</dt><dd>Before the race's last scheduled closing.</dd><dt>No votes reported</dt><dd>Polls are closed, but the feed has no votes yet.</dd><dt>Counting · x% in</dt><dd>Votes reported, no call. The candidate ahead is "leading".</dd><dt>Tied</dt><dd>The top two have equal votes.</dd><dt>Called</dt><dd>civicAPI has declared a winner.</dd><dt>No race</dt><dd>Not on the ballot this year.</dd><dt>Results unavailable</dt><dd>The feed has loaded but does not include this race.</dd><dt>SIM</dt><dd>Rehearsal mode: simulated.</dd></dl>
        </div>
      </div>
    </section>

    <section class="card wide"><h3>How big is the night? (House)</h3>
      <ul class="m-list">
        <li><b>Tiers</b> (guide pp. 4, 6): Red Riptide = Democrats under 218; Blue Tide = 218 to 229; Blue Wave = 230 to 239; Blue Tsunami = 240 or more. Senate tiers (p. 5) use the net change: Riptide = GOP +3 to even; Tide = D +1 to +3; Wave = D +4 to +6; Tsunami = D +7 or more.</li>
        <li><b>Called seats</b> are counted district by district from civicAPI's winner flags across all 435 districts. Each district counts once. Other-party winners are counted separately. civicAPI's own national tally is a cross-check, and any mismatch is flagged.</li>
        <li><b>Forecast:</b> DDHQ's pre-election projection of 230 Democratic seats (${FORECAST_SOURCE.date}).</li>
        <li><b>Scenario engine:</b> DDHQ margins for the ${CLOSE_84.length} seats within 8 points (guide p. 29). Seat 218 is OH-09, the 15th seat on that list, which implies ${SAFE_D} seats safer than D+8 and ${SAFE_R} safer than R+8. A shift is added to every margin and seats above zero are counted (even seats count as not won). This reproduces the guide's printed curve exactly: R+6 → 213, R+4 → 219, R+2 → 224, no shift → 230, D+2 → 236, D+4 → 244. It is limited to ±8 points, and margins are whole numbers, so results near thresholds are approximate.</li>
        <li><b>Swing so far</b> uses only districts with a DDHQ margin that are called or ${SWING_MIN.reporting}%+ reported. Partly counted districts often lean toward whichever ballots were counted first. It takes the median of (live margin minus DDHQ) and runs it through the scenario engine, with a range from the middle half of districts. It's withheld until ${SWING_MIN.districts} districts in ${SWING_MIN.states} states qualify, because early districts are geographically clustered. It's a scenario, not a projection.</li>
      </ul>
    </section>

    <section class="card wide"><h3>County benchmarks</h3>
      <p>For each guide county, "to tie" is the county margin consistent with an <b>even</b> statewide race under uniform swing from 2024. "If the state matches the forecast" adds DDHQ's statewide margin to that target. For example, Palm Beach's tie target is D+15; Florida's Senate forecast is R+6, so the forecast-consistent result is D+15 − 6 = D+9.</p>
      <p>"Vs tie" = live county margin minus its tie target. The <b>county-benchmark estimate</b> is the vote-share-weighted average of those differences. It's an estimate under uniform swing, not a projection, and it inherits each county's count order: a county that has counted only mail ballots so far can look very different from its final result. Targets apply to the race named on each table (usually Senate). For governor, the guide says they differ by up to 1 to 4 points depending on state.</p>
    </section>

    <section class="card wide"><h3>Poll-closing times</h3>
      <p>One table drives every tab. Source: <a href="${CLOSE_SOURCE.url}" target="_blank" rel="noopener">${esc(CLOSE_SOURCE.name)}</a>, checked ${CLOSE_SOURCE.checked}, converted to Central Time. ${esc(CALL_NOTE)}</p>
      <div class="tscroll"><table class="mini-t wide-t"><thead><tr><th>State</th><th>Most polls close (CT)</th><th>All polls close (CT)</th><th>Note</th></tr></thead><tbody>
      ${split.map(([st, c]) => `<tr><td>${esc(STATE_NAMES[st] || st)}</td><td>${fmtNightTime(hhmm(c.most))}</td><td>${fmtNightTime(hhmm(c.all))}</td><td class="small">${esc(c.note || '')}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small">District overrides: ${Object.entries(DISTRICT_CLOSE).map(([d, c]) => `${d} ${fmtNightTime(hhmm(c.all))}${c.most !== c.all ? ` (most ${fmtNightTime(hhmm(c.most))})` : ''}`).join(' · ')}. Other districts use their state's main closing time. The guide's p. 20 list grouped districts by their state's last closing; this site uses each district's own closing, which is why KY-06 and IN-05 show at 5 PM, Florida districts at 6 PM, and Michigan and most Texas districts at 7 PM.</p>
    </section>

    <section class="card wide"><h3>Sources</h3>
      <div class="tscroll"><table class="mini-t wide-t"><thead><tr><th>What</th><th>Source</th><th>Type</th><th>Date, notes</th></tr></thead><tbody>
      ${SOURCES.map(([what, src, url, note, type]) => `<tr><td><b>${esc(what)}</b></td><td>${url ? `<a href="${url}" target="_blank" rel="noopener">${esc(src)}</a>` : esc(src)}</td><td><span class="src-type">${esc(type)}</span></td><td class="small">${esc(note)}</td></tr>`).join('')}
      </tbody></table></div>
    </section>

  </div>`;
}
