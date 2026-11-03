import { esc, hhmm } from '../util.js';
import { benchmarks } from '../model.js';
import { STATES, EARLY_COUNTIES } from '../data/guide.js';
import { marginTag } from '../ui.js';
import { nowNight } from '../api.js';

export function render() {
  const t = nowNight();
  return `<div class="grid counties-page">
    <section class="card wide">
      <div class="card-h"><h3>Early signals: the first counties to report</h3><span class="muted">Live county margin vs. what the guide expects if the state matches the forecast, or is tied</span></div>
      <div class="tscroll"><table class="early-c">
        <thead><tr><th>County</th><th>Race (DDHQ forecast)</th><th class="n">2024</th><th class="n hl">If state matches forecast</th><th class="n">If state is tied</th><th class="n">Live</th><th class="n">In</th><th>Read</th></tr></thead>
        <tbody>${EARLY_COUNTIES.map((grp) => `
          <tr class="grp ${t >= hhmm(grp.time) ? 'due' : ''}"><td colspan="8">${esc(grp.by)}${t >= hhmm(grp.time) ? ' <span class="pill pill-count">due</span>' : ''}</td></tr>
          ${grp.rows.map(([st, name]) => {
            const s = STATES[st];
            const office = s.races[0].office;
            const g = s.races[0];
            const row = benchmarks(st, office)?.rows.find((r) => r.name === name);
            if (!row) return '';
            let read = '<span class="muted">waiting</span>';
            if (row.live !== null) {
              if (row.live >= row.ifForecast + 1.5 && row.live >= row.toTie) read = '<span class="vd vd-d">Beating forecast and tie line</span>';
              else if (row.live >= row.toTie) read = '<span class="vd vd-d">Ahead of tie line</span>';
              else if (row.live >= row.ifForecast - 1.5) read = '<span class="vd">On forecast</span>';
              else read = '<span class="vd vd-r">Below forecast</span>';
              if (Math.abs(row.live - row.ifForecast) <= 1.5 && row.live < row.toTie) read = '<span class="vd">On forecast</span>';
            }
            return `<tr>
              <td><a href="#/states/${st}"><b>${esc(name)}</b></a>${row.tag ? ` <small class="tag">${esc(row.tag)}</small>` : ''}</td>
              <td>${esc(s.name)} ${office === 'senate' ? 'Senate' : 'Governor'} ${marginTag(g.forecast, { digits: 0, dLabel: g.dLabel || 'D' })}</td>
              <td class="n">${marginTag(row.m2024, { digits: 0 })}</td>
              <td class="n hl"><b>${marginTag(row.ifForecast, { digits: 0, dLabel: g.dLabel || 'D' })}</b></td>
              <td class="n">${marginTag(row.toTie, { digits: 0, dLabel: g.dLabel || 'D' })}</td>
              <td class="n">${row.live !== null ? `<b>${marginTag(row.live)}</b>` : '<span class="muted">—</span>'}</td>
              <td class="n">${row.rep !== null && row.rep !== undefined ? row.rep + '%' : '—'}</td>
              <td>${read}</td></tr>`;
          }).join('')}`).join('')}
        </tbody>
      </table></div>
      <p class="muted small">"If state matches forecast" = the county's tie target shifted by the DDHQ statewide margin (uniform swing). Early partial counts can lean toward whichever ballots a county counts first.</p>
    </section>
  </div>`;
}
