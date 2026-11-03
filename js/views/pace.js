import { esc, hhmm } from '../util.js';
import { nowNight } from '../api.js';
import { stateReporting } from '../model.js';
import { PACE, STATES } from '../data/guide.js';

const NOTE = { OH: '*', IN: '*', NY: '†' };
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
      <div class="card-h"><h3>How fast each state counted in 2024</h3><span class="muted">guide p. 21 · share of the final 2024 count by hour (CT)</span></div>
      <p class="small">The guide doesn't say which race or feed these figures come from. <b>Tonight</b> is civicAPI's "% reporting" for the state's main race. That is a different measure (it may be precincts or estimated vote), so compare the two only loosely.</p>
      <div class="pace-wrap"><table class="pace-t">
        <thead><tr><th>State</th>${HOURS.map((h, i) => `<th class="n ${i === col ? 'nowcol' : ''}">${h}</th>`).join('')}<th class="n">Wed 8 PM</th><th class="n">Fri 8 AM</th><th class="n">Nov 15</th><th class="n" title="First hour the unrounded 2024 share reached 90% (guide)">90% by</th><th class="n live-h" title="civicAPI percent_reporting, not share of final vote">Tonight (civicAPI)</th><th class="n" title="Tonight's % reporting minus the 2024 share at this time; directional only">vs 2024 now</th></tr></thead>
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
            <td class="n"><b>${esc(by)}</b>${NOTE[st] ? `<sup>${NOTE[st][0]}</sup>` : ''}${!hours && later ? '<small class="muted"> exact time unknown</small>' : ''}</td>
            <td class="n live-c">${rep === null ? '<span class="muted">—</span>' : `<b>${rep}%</b>`}</td>
            <td class="n">${diff === null ? '' : `<span class="${diff >= 5 ? 'fast' : diff <= -5 ? 'slow' : ''}">${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(0)}</span>`}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <div class="small pace-notes">
        <p><b>Bold</b> = 90%+ counted. The highlighted column is the current hour.</p>
        <p><sup>*</sup> <b>Ohio and Indiana:</b> the table shows 90% at 10 PM (Ohio) and 11 PM (Indiana), but "90% by" says 11 PM and 12 AM. The most likely explanation is rounding: an unrounded share such as 89.6% displays as 90% but hasn't crossed 90. The guide's Senate-battleground table (p. 22) shows Ohio at 89% at 10 PM, which fits.</p>
        <p><sup>†</sup> <b>New York</b> falls from 94% at midnight to 93% at 1 AM. A share can drop when the estimate of the final total is revised upward. The guide gives no explanation, so the figures are left as printed.</p>
        <p><b>Wed / Thu / Nov 11:</b> for states with no overnight data, or that were still under 90% at 1 AM, the next observation in the guide is Wednesday 8 PM or later. The state crossed 90% sometime before that, at a time the data doesn't show.</p>
      </div>
    </section>
  </div>`;
}
