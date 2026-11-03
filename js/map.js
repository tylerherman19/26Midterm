// Choropleth map of Senate / governor races using real state outlines.
import { STATE_SHAPES, VIEWBOX } from './data/statePaths.js';
import { RACE_IDS } from './data/raceIds.js';
import { STATES, SENATE, STATE_NAMES } from './data/guide.js';
import { readRace, readSenate, raceById } from './model.js';
import { esc, fmtMargin, fmtNightTime, hhmm } from './util.js';
import { ui } from './state.js';
import { raceStatus, simTag } from './status.js';

// Small northeastern states get a labeled square in a column off the coast.
const CALLOUTS = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD'];
const CALL_X = 905, CALL_Y0 = 176, CALL_STEP = 33, CALL_SIZE = 24;

function forecastFor(st, office) {
  const g = STATES[st]?.races.find((r) => r.office === office);
  if (g) return g.forecast;
  if (office === 'senate') return SENATE.path.find((p) => p[0] === st)?.[1];
  return undefined;
}

export function stateStatus(st, office) {
  const id = RACE_IDS[office][st];
  const raw = raceById(id);
  if (!raw && !id) return { kind: 'none' };
  const g = STATES[st]?.races.find((r) => r.office === office);
  const res = raw ? (office === 'senate' ? readSenate(raw, g) : readRace(raw, { d: g?.d, r: g?.r, dSideName: g?.dSideName })) : null;
  const f = forecastFor(st, office);
  const dLabel = res?.indAligned ? 'I' : g?.dLabel || 'D';
  if (!raw) return { kind: 'none' };
  if (res?.called) return { kind: `call-${res.called === 'o' ? 'd' : res.called}`, res, f, g, dLabel };
  if (res?.hasVotes) return { kind: `lead-${res.margin >= 0 ? 'd' : 'r'}`, res, f, g, dLabel };
  return { kind: f === undefined ? 'fc-e' : f > 0 ? 'fc-d' : f < 0 ? 'fc-r' : 'fc-e', res, f, g, dLabel };
}

function label(st, s, x, y, big) {
  const dark = s.kind.startsWith('call');
  const m = s.res?.hasVotes ? fmtMargin(s.res.margin, { digits: 0, dLabel: s.dLabel }) : null;
  return `<text x="${x}" y="${y}" class="ml ${dark ? 'on-dark' : ''}" text-anchor="middle">${st}</text>${big && m ? `<text x="${x}" y="${y + 15}" class="ml2 ${dark ? 'on-dark' : ''}" text-anchor="middle">${m}</text>` : ''}`;
}

export function usMap(office) {
  const sel = ui.mapSel;
  const shapes = [];
  const labels = [];
  for (const [st, sh] of Object.entries(STATE_SHAPES)) {
    const s = stateStatus(st, office);
    const on = s.kind !== 'none';
    const lab = `${STATE_NAMES[st] || st}: ${on ? ({ 'call-d': 'called Democratic', 'call-r': 'called Republican', 'lead-d': 'Democrat leading', 'lead-r': 'Republican leading', 'fc-d': 'no votes yet, forecast leans D', 'fc-r': 'no votes yet, forecast leans R', 'fc-e': 'no votes yet' }[s.kind]) : 'no race'}`;
    shapes.push(`<path d="${sh.d}" class="st k-${s.kind} ${sel === st ? 'sel' : ''}" data-map-st="${st}" ${on ? `tabindex="0" role="button" aria-label="${esc(lab)}"` : 'aria-hidden="true"'}><title>${esc(lab)}</title></path>`);
    if (on && !CALLOUTS.includes(st) && st !== 'DC') labels.push(label(st, s, sh.c[0], sh.c[1] + 4, sh.a > 5000));
  }
  const callouts = CALLOUTS.map((st, i) => {
    const s = stateStatus(st, office);
    const y = CALL_Y0 + i * CALL_STEP;
    const c = STATE_SHAPES[st].c;
    const on = s.kind !== 'none';
    return `<line x1="${c[0]}" y1="${c[1]}" x2="${CALL_X - 4}" y2="${y + CALL_SIZE / 2}" class="lead"/>
      <rect x="${CALL_X}" y="${y}" width="${CALL_SIZE}" height="${CALL_SIZE}" rx="3" class="st k-${s.kind} ${sel === st ? 'sel' : ''}" data-map-st="${st}"><title>${esc(STATE_NAMES[st])}</title></rect>
      <text x="${CALL_X + CALL_SIZE + 6}" y="${y + 16}" class="ml ${on ? '' : 'off'}">${st}</text>`;
  }).join('');
  return `<svg class="usmap" viewBox="${VIEWBOX.replace('975', '975')}" role="img" aria-label="${office === 'senate' ? 'Senate' : 'Governor'} races by state">
    <defs>
      <pattern id="hatch-d" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="hb"/><line x1="0" y1="0" x2="0" y2="7" class="hd"/></pattern>
      <pattern id="hatch-r" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="hb"/><line x1="0" y1="0" x2="0" y2="7" class="hr"/></pattern>
      <pattern id="hatch-e" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="hb"/><line x1="0" y1="0" x2="0" y2="7" class="he"/></pattern>
    </defs>
    <g>${shapes.join('')}</g>
    <g class="callouts">${callouts}</g>
    <g class="labels" aria-hidden="true">${labels.join('')}</g>
  </svg>`;
}

function detail(office) {
  const st = ui.mapSel;
  if (!st) return `<p class="map-hint">Tap a state for its result.</p>`;
  const s = stateStatus(st, office);
  const name = STATE_NAMES[st] || st;
  const off = office === 'senate' ? 'Senate' : 'Governor';
  if (s.kind === 'none') return `<p class="map-hint"><b>${esc(name)}</b> has no ${off.toLowerCase()} race this year.</p>`;
  const r = s.res;
  const dn = r?.dc?.name || s.g?.d || 'Democrat';
  const rn = r?.rc?.name || s.g?.r || 'Republican';
  const href = STATES[st] ? `#/states/${st}` : null;
  let status;
  if (r?.called) status = `<b class="m-${r.called === 'r' ? 'r' : 'd'}">${esc(r.called === 'r' ? rn : dn)} wins</b>`;
  else if (r?.hasVotes) status = `<b class="m-${r.margin >= 0 ? 'd' : 'r'}">${fmtMargin(r.margin, { digits: 1, dLabel: s.dLabel })}</b> with ${r.rep}% in`;
  else status = raceStatus(r, { close: STATES[st]?.close || null, covered: true }).text;
  return `<div class="map-detail">
    <div><b>${esc(name)} ${off}</b><span class="muted">${esc(dn)} (${s.dLabel}) vs. ${esc(rn)} (R)</span></div>
    <div>${status}${simTag()}${s.f !== undefined ? `<span class="muted"> · pre-election forecast ${fmtMargin(s.f, { dLabel: s.dLabel })} (DDHQ)</span>` : ''}</div>
    ${href ? `<a class="more" href="${href}">County benchmarks</a>` : ''}
  </div>`;
}

export function mapsCard() {
  const office = ui.mapOffice || 'senate';
  return `<section class="card maps">
    <div class="card-h"><h3>The night on a map</h3>
      <div class="seg-ctl">${[['senate', 'Senate'], ['governor', 'Governor']].map(([k, l]) => `<button data-map-office="${k}" class="${office === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    ${usMap(office)}
    <div class="map-legend">
      <span><i class="sw k-call-d"></i>Called D</span><span><i class="sw k-lead-d"></i>Leading D</span>
      <span><i class="sw k-lead-r"></i>Leading R</span><span><i class="sw k-call-r"></i>Called R</span>
      <span><i class="sw k-fc-d"></i><i class="sw k-fc-r"></i>No votes yet (shaded by pre-election forecast, not a result)</span><span><i class="sw k-none"></i>No race</span>
    </div>
    ${detail(office)}
    <p class="note">Leads are not calls. Hatched states have a race but no votes yet; the stripe color shows only DDHQ's pre-election lean.</p>
  </section>`;
}
