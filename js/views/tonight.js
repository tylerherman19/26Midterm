import { esc, hhmm, fmtNightTime } from '../util.js';
import { nowNight } from '../api.js';
import { HOURS, CLOSINGS, WHO_COUNTS } from '../data/guide.js';
import { refChip } from '../ui.js';
import { tellsCard } from './overview.js';

export function render() {
  const t = nowNight();
  const idx = HOURS.findIndex((h, i) => t >= hhmm(h.time) - 5 && (i === HOURS.length - 1 || t < hhmm(HOURS[i + 1].time) - 5));
  return `<div class="grid tonight">
    <section class="card wide">
      <div class="card-h"><h3>Tonight, hour by hour</h3><span class="muted">All times Central · <span class="sig-badge sig-d">D</span> good sign for Democrats · <span class="sig-badge sig-r">R</span> good sign for Republicans · gray: timing and caveats</span></div>
      <ol class="timeline">${HOURS.map((h, i) => {
        const phase = i < idx ? 'past' : i === idx ? 'now' : 'next';
        const close = CLOSINGS.find((c) => c.time === h.time);
        return `<li class="tl ${phase}" ${phase === 'now' ? 'id="tl-now"' : ''}>
          <div class="tl-time"><b>${esc(h.label)}</b><small>${esc(h.sub || '')}</small>${phase === 'now' ? '<span class="now-tag">NOW</span>' : ''}</div>
          <div class="tl-body">
            <div class="tl-meta">
              ${h.closes ? `<span><em>Polls close</em> ${esc(h.closes)}</span>` : ''}
              ${h.counted ? `<span><em>90% counted by now (2024)</em> ${esc(h.counted)}</span>` : ''}
              ${close?.legis?.length ? `<span><em>Legislatures</em> ${esc(close.legis.join(', '))}</span>` : ''}
            </div>
            <p class="tl-check">${esc(h.check)}</p>
            ${close?.states?.length ? `<div class="chips">${close.states.flatMap(([st, what]) => (/Governor/.test(what) ? ['governor'] : []).concat(/Senate/.test(what) ? ['senate'] : []).map((o) => refChip(`S:${st}:${o}`))).join('')}</div>` : ''}
            ${close?.house?.length ? `<div class="chips small">${close.house.map((d) => refChip('H:' + d)).join('')}</div>` : ''}
            ${h.watch?.length ? `<div class="tl-watch">${h.watch.map((w) => `
              <div class="tw-item"><b>${esc(w.title)}</b>
                ${w.items.map(([sig, txt]) => `<div class="sig sig-${sig}"><i>${sig === 'g' ? '' : sig.toUpperCase()}</i>${esc(txt)}</div>`).join('')}
                ${w.refs.length ? `<div class="chips">${w.refs.map(refChip).join('')}</div>` : ''}
              </div>`).join('')}</div>` : ''}
          </div>
        </li>`;
      }).join('')}</ol>
    </section>
    ${tellsCard()}
    <section class="card"><div class="card-h"><h3>Who counts fast, who counts late</h3></div>
      <div class="who">${WHO_COUNTS.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>
    </section>
  </div>`;
}
