import { esc, hhmm } from '../util.js';
import { nowNight } from '../api.js';
import { stateReporting } from '../model.js';
import { PACE, STATES } from '../data/guide.js';

const HOURS = ['7 PM', '8 PM', '9 PM', '10 PM', '11 PM', '12 AM', '1 AM'];

function expectedNow(hours, t) {
  if (!hours) return null;
  const pts = hours.map((p, i) => [(19 + i) * 60, p]);
  if (t < pts[0][0]) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    if (t >= pts[i][0] && t <= pts[i + 1][0]) return pts[i][1] + ((t - pts[i][0]) / 60) * (pts[i + 1][1] - pts[i][1]);
  }
  return pts[pts.length - 1][1];
}

export function render() {
  const t = nowNight();
  const col = Math.floor(t / 60) - 19; // which hour column is "now"
  return `<div class="grid pace-page">
    <section class="card wide">
      <div class="card-h"><h3>How fast each state counts</h3><span class="muted">2024 share of the final count by hour (CT), next to tonight's % reporting from civicAPI</span></div>
      <div class="pace-wrap"><table class="pace-t">
        <thead><tr><th>State</th>${HOURS.map((h, i) => `<th class="n ${i === col ? 'nowcol' : ''}">${h}</th>`).join('')}<th class="n">Wed 8 PM</th><th class="n">Fri 8 AM</th><th class="n">Nov 15</th><th class="n">90% by</th><th class="n live-h">Tonight</th><th class="n">vs 2024 now</th></tr></thead>
        <tbody>${PACE.map(([st, name, hours, later, by]) => {
          const rep = stateReporting(st);
          const exp = expectedNow(hours, t);
          const diff = rep !== null && exp !== null && t >= 19 * 60 ? rep - exp : null;
          const cell = (v, i) => {
            const shade = v === null ? '' : `style="--v:${v / 100}"`;
            return `<td class="n hc ${v >= 90 ? 'b' : ''} ${i === col ? 'nowcol' : ''}" ${shade}>${v === null ? 'n/a' : v < 1 && v > 0 ? '<1%' : `${v}%`}</td>`;
          };
          return `<tr>
            <td>${STATES[st] ? `<a href="#/states/${st}"><b>${esc(name)}</b></a>` : `<b>${esc(name)}</b>`}</td>
            ${hours ? hours.map(cell).join('') : HOURS.map((_, i) => `<td class="n muted ${i === col ? 'nowcol' : ''}">n/a</td>`).join('')}
            ${later ? later.map((v) => `<td class="n hc ${v >= 90 ? 'b' : ''}" style="--v:${v / 100}">${v}%</td>`).join('') : '<td class="n muted">-</td><td class="n muted">-</td><td class="n muted">-</td>'}
            <td class="n"><b>${esc(by)}</b></td>
            <td class="n live-c">${rep === null ? '<span class="muted">—</span>' : `<b>${rep}%</b>`}</td>
            <td class="n">${diff === null ? '' : `<span class="${diff >= 5 ? 'fast' : diff <= -5 ? 'slow' : ''}">${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(0)}</span>`}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <p class="muted small">civicAPI's "% reporting" may be precincts or expected vote depending on the state, so treat the comparison as directional. Bold = 90%+ counted.</p>
    </section>
  </div>`;
}
