import { esc, hhmm, fmtMargin } from '../util.js';
import { benchmarks } from '../model.js';
import { STATES, EARLY_COUNTIES } from '../data/guide.js';
import { marginTag } from '../ui.js';
import { nowNight } from '../api.js';
import { ui } from '../state.js';

// Turn the guide's "in by" strings into a sortable time (night minutes); non-clock values sort last.
function inByMinutes(s) {
  const m = String(s).match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12 + (/pm/i.test(m[2]) ? 12 : 0);
  if (/am/i.test(m[2])) h += 24;
  return h * 60;
}
const LATER_ORDER = ['after 1 AM', 'Wed', 'Thu', 'Nov 11', 'later', 'n/a'];

function read(row) {
  if (row.live === null) return '<span class="muted">waiting</span>';
  const vsF = row.live - row.ifForecast;
  const base = vsF >= 1.5 ? '<span class="vd vd-d">Ahead of forecast</span>' : vsF <= -1.5 ? '<span class="vd vd-r">Behind forecast</span>' : '<span class="vd">Near forecast</span>';
  const tie = row.live >= row.toTie ? ' <span class="vd vd-d">above tie line</span>' : '';
  const partial = (row.rep ?? 0) < 60 ? ' <span class="sg-warn" title="A partial count can lean toward whichever ballots were counted first">partial count</span>' : '';
  return base + tie + partial;
}

function rowsFor(list) {
  return list.map(({ st, name }) => {
    const s = STATES[st];
    const office = ui.countyOffice && s.races.some((r) => r.office === ui.countyOffice) ? ui.countyOffice : s.races[0].office;
    const g = s.races.find((r) => r.office === office);
    const row = benchmarks(st, office)?.rows.find((r) => r.name === name);
    if (!row) return '';
    const dl = g.dLabel || 'D';
    return `<tr>
      <td><a href="#/states/${st}"><b>${esc(name)}</b></a>${row.tag ? ` <small class="tag">${esc(row.tag)}</small>` : ''}<small class="cty-st">${esc(s.name)}</small></td>
      <td>${office === 'senate' ? 'Senate' : 'Governor'} <span class="muted">DDHQ</span> ${marginTag(g.forecast, { digits: 0, dLabel: dl })}${office !== s.races[0].office ? ' <small class="muted">(targets set on Senate)</small>' : ''}</td>
      <td class="n">${marginTag(row.m2024, { digits: 0 })}</td>
      <td class="n hl"><b>${marginTag(row.ifForecast, { digits: 0, dLabel: dl })}</b></td>
      <td class="n">${marginTag(row.toTie, { digits: 0, dLabel: dl })}</td>
      <td class="n">${row.live !== null ? `<b>${marginTag(row.live)}</b>` : '<span class="muted">—</span>'}</td>
      <td class="n">${row.rep !== null && row.rep !== undefined ? row.rep + '%' : '—'}</td>
      <td class="n">${row.live !== null ? `<span class="m-${row.live - row.ifForecast >= 0 ? 'd' : 'r'}">${row.live - row.ifForecast >= 0 ? '+' : '−'}${Math.abs(row.live - row.ifForecast).toFixed(1)}</span>` : ''}</td>
      <td class="small">${esc(row.inBy)}</td>
      <td>${read(row)}</td></tr>`;
  }).join('');
}

export function render() {
  const t = nowNight();
  const stf = ui.countyState || '';
  const withCounties = Object.entries(STATES).filter(([, s]) => s.counties.length).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const early = new Set(EARLY_COUNTIES.flatMap((g) => g.rows.map(([st, n]) => `${st}|${n}`)));
  const later = new Map();
  for (const [st, s] of withCounties) for (const c of s.counties) {
    if (early.has(`${st}|${c[0]}`)) continue;
    const m = inByMinutes(c[4]);
    const key = m !== null ? `By ${c[4]} CT` : c[4] === 'n/a' ? 'No timing in the guide' : `Late: ${c[4]}`;
    const sortKey = m !== null ? m : 2000 + LATER_ORDER.indexOf(c[4]);
    if (!later.has(key)) later.set(key, { sortKey, rows: [] });
    later.get(key).rows.push({ st, name: c[0] });
  }
  const filt = (rows) => rows.filter((r) => !stf || r.st === stf);
  const groups = [
    ...EARLY_COUNTIES.map((g) => ({ label: `${g.by} (guide's first counties to report)`, time: g.time, rows: filt(g.rows.map(([st, name]) => ({ st, name }))) })),
    ...[...later.entries()].sort((a, b) => a[1].sortKey - b[1].sortKey).map(([label, v]) => ({ label, time: null, rows: filt(v.rows) })),
  ].filter((g) => g.rows.length);
  const head = `<tr><th>County</th><th>Race targets apply to</th><th class="n">2024</th><th class="n hl">If state matches forecast</th><th class="n">If state is tied</th><th class="n">Live</th><th class="n">% in</th><th class="n" title="Live minus the forecast-consistent result">vs forecast</th><th>Expected by</th><th>Read</th></tr>`;
  return `<div class="grid counties-page">
    <section class="card wide">
      <div class="card-h"><h3>County benchmarks</h3>
        <div class="wl-tools"><label><span class="sr-only">State</span><select data-ui="countyState"><option value="">All states</option>${withCounties.map(([st, s]) => `<option value="${st}" ${st === stf ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <div class="seg-ctl" role="group" aria-label="Race"><span class="seg-lbl">Race</span>${[['', 'Default'], ['senate', 'Senate'], ['governor', 'Governor']].map(([k, l]) => `<button data-set="countyOffice=${k}" class="${(ui.countyOffice || '') === k ? 'on' : ''}" aria-pressed="${(ui.countyOffice || '') === k}">${l}</button>`).join('')}</div></div></div>
      <div class="bench-intro small">
        <p><b>These are scenario benchmarks, not predictions of county results.</b> "If the state is tied" is the county margin consistent with an even statewide race, under a uniform swing from 2024 (the guide's targets). "If the state matches the forecast" adds DDHQ's statewide margin to that. <b>Example:</b> Palm Beach's tie target is D+15 and Florida's Senate forecast is R+6, so a forecast-consistent Palm Beach is D+15 − 6 = D+9. If Palm Beach comes in at D+12, it is running 3 points ahead of the forecast scenario.</p>
        <p>"Vs forecast" = live minus the forecast-consistent result. A county that has counted only part of its vote may not look like its final result, so rows under 60% counted are flagged. "Expected by" is the guide's reading of when each county was mostly counted in 2024, not a promise. Targets are set on the guide's first race for each state (usually Senate); for governor they are approximate.</p>
      </div>
      <div class="tscroll"><table class="early-c"><thead>${head}</thead><tbody>
        ${groups.map((g) => `<tr class="grp ${g.time && t >= hhmm(g.time) ? 'due' : ''}"><td colspan="10">${esc(g.label)}${g.time && t >= hhmm(g.time) ? ' <span class="pill pill-count">due now</span>' : ''}</td></tr>${rowsFor(g.rows)}`).join('') || '<tr><td colspan="10" class="empty">No counties match.</td></tr>'}
      </tbody></table></div>
    </section>
  </div>`;
}
