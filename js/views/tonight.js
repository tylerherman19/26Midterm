import { esc, hhmm, fmtNightTime } from '../util.js';
import { nowNight } from '../api.js';
import { HOURS, CLOSINGS, WHO_COUNTS, STATES, PACE } from '../data/guide.js';
import { CALL_NOTE } from '../data/closings.js';
import { openAttr } from '../state.js';
import { refChip } from '../ui.js';
import { tellsCard, closingSchedule } from './overview.js';

export function render() {
  const t = nowNight();
  const sched = closingSchedule();
  const idx = HOURS.findIndex((h, i) => t >= hhmm(h.time) - 5 && (i === HOURS.length - 1 || t < hhmm(HOURS[i + 1].time) - 5));
  return `<div class="grid tonight">
    <section class="card wide">
      <div class="card-h"><h3>Tonight, hour by hour</h3><span class="muted">All times Central · <span class="sig-badge sig-d">D</span> good sign for Democrats · <span class="sig-badge sig-r">R</span> good sign for Republicans · <span class="sig-badge sig-g">·</span> timing or caveat</span></div>
      <p class="small muted">${esc(CALL_NOTE)} "Results expected" lines describe how fast states counted in 2024, as reported in the guide. They are historical patterns, not schedules.</p>
      <ol class="timeline">${HOURS.map((h, i) => {
        const phase = i < idx ? 'past' : i === idx ? 'now' : i === idx + 1 ? 'next' : 'later';
        const start = hhmm(h.time), end = i < HOURS.length - 1 ? hhmm(HOURS[i + 1].time) : 99 * 60;
        const closing = sched.filter((c) => hhmm(c.time) >= start && hhmm(c.time) < end);
        const states = closing.flatMap((c) => c.states.map((x) => ({ ...x, time: c.time })));
        const houseDs = closing.flatMap((c) => c.house);
        const legis = CLOSINGS.find((c) => c.time === h.time)?.legis || [];
        const passed90 = start >= 19 * 60 && start <= 25 * 60 ? PACE.filter(([, , hrs]) => hrs && hrs[(start / 60) - 19] >= 90 && (start / 60 - 19 === 0 || hrs[(start / 60) - 20] < 90)).map(([, name]) => name) : [];
        const caveats = h.watch.flatMap((w) => w.items.filter(([sig]) => sig === 'g').map(([, txt]) => `${w.title}: ${txt}`));
        return `<li class="tl ${phase}" ${phase === 'now' ? 'id="tl-now"' : ''}>
          <details ${openAttr('hour-' + h.time)} ${phase === 'now' || phase === 'next' ? 'open' : ''}>
          <summary class="tl-time"><b>${esc(h.label)}</b>${phase === 'now' ? '<span class="now-tag">NOW</span>' : phase === 'next' ? '<span class="next-tag">NEXT</span>' : ''}</summary>
          <div class="tl-body">
            <div class="tl-sec"><span class="lbl">Polls closing</span>
              ${states.length || houseDs.length ? `<div class="chips">${states.map((x) => `<a class="chip strong" href="#/states/${x.st}">${esc(STATES[x.st].name)} <span class="muted">${x.part === 'most' ? 'most polls' : x.part === 'rest' ? 'last polls' : 'all polls'}${x.time !== h.time ? ` ${fmtNightTime(hhmm(x.time))}` : ''}</span></a>`).join('')}</div>
              ${houseDs.length ? `<div class="chips small">${houseDs.map((d) => refChip('H:' + d)).join('')}</div>` : ''}` : '<span class="muted small">No tracked closings.</span>'}
              ${legis.length ? `<p class="small"><b>Legislatures:</b> ${esc(legis.join(', '))}</p>` : ''}
            </div>
            <div class="tl-sec"><span class="lbl">Results expected</span>
              <p class="tl-check">${esc(h.check)}</p>
              ${h.counted || passed90.length ? `<p class="small muted">${h.counted ? `By this hour in 2024, these states had counted about 90% (guide): ${esc(h.counted)}.` : ''}${passed90.length && !h.counted ? `First reached 90% at this hour in 2024 (guide p. 21): ${esc(passed90.join(', '))}.` : ''}</p>` : ''}
            </div>
            ${h.watch?.length ? `<div class="tl-sec"><span class="lbl">What to watch</span><div class="tl-watch">${h.watch.map((w) => `
              <div class="tw-item"><b>${esc(w.title)}</b>
                ${w.items.filter(([sig]) => sig !== 'g').map(([sig, txt]) => `<div class="sig sig-${sig}"><i>${sig.toUpperCase()}</i>${esc(txt)}</div>`).join('')}
                ${w.refs.length ? `<div class="chips">${w.refs.map(refChip).join('')}</div>` : ''}
              </div>`).join('')}</div></div>` : ''}
            ${caveats.length ? `<div class="tl-sec"><span class="lbl">Caveats</span>${caveats.map((c) => `<div class="sig sig-g"><i></i>${esc(c)}</div>`).join('')}</div>` : ''}
          </div>
          </details>
        </li>`;
      }).join('')}</ol>
    </section>
    ${tellsCard()}
    <section class="card"><div class="card-h"><h3>Who counts fast, who counts late</h3><span class="muted">guide p. 4, based on past counts</span></div>
      <div class="who">${WHO_COUNTS.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>
    </section>
  </div>`;
}
