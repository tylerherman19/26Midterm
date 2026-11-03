import { esc, fmtMargin, fmtInt, hhmm, fmtNightTime } from '../util.js';
import { wiChamber, wiDistrict, chamberByName, mnChamber } from '../model.js';
import { WI_LEG, LEGISLATURES } from '../data/guide.js';
import { marginTag } from '../ui.js';
import { ui, openAttr } from '../state.js';
import { feedHealth } from '../api.js';
import { WI_VIEWBOX, WI_SENATE_PATHS, WI_ASSEMBLY_PATHS } from '../data/wiPaths.js';

const RATING_CLS = { 'Safe D': 'safeD', 'Lean D': 'leanD', Tossup: 'toss', 'Lean R': 'leanR', 'Safe R': 'safeR' };
const RATING_SRC = 'Ratings: John Johnson, Marquette Law School Lubar Center, published July 20, 2026, updated Oct. 27, 2026.';

function resText(r) {
  if (!r) return 'no data';
  if (r.called) return `called ${r.called === 'd' ? 'D' : r.called === 'r' ? 'R' : 'other'}${r.hasVotes ? `, ${fmtMargin(r.margin, { digits: 1 })}` : ''}`;
  if (r.hasVotes) return `${r.leader === 'd' ? 'D' : r.leader === 'r' ? 'R' : 'tied'} leads ${fmtMargin(r.margin, { digits: 1 })}, ${r.rep}% in`;
  return 'no votes reported';
}

function balanceTable(c, kind) {
  const loaded = feedHealth().everLoaded;
  const v = (n) => (loaded ? n : '—');
  return `<table class="mini-t bal"><thead><tr><th></th><th class="n m-d">Dem</th><th class="n m-r">Rep</th></tr></thead><tbody>
    ${kind === 'senate' ? `<tr><th>Holdovers (not up)</th><td class="n">${c.holdD}</td><td class="n">${c.holdR}</td></tr>` : ''}
    <tr><th>Called tonight</th><td class="n">${v(c.calledD)}</td><td class="n">${v(c.calledR)}</td></tr>
    <tr class="sum"><th>Seats secured</th><td class="n"><b>${v(c.securedD)}</b></td><td class="n"><b>${v(c.securedR)}</b></td></tr>
    <tr><th>Leading, not called</th><td class="n">${v(c.leadD)}</td><td class="n">${v(c.leadR)}</td></tr>
    <tr><th>Still needed for ${c.conf.majority}</th><td class="n">${v(c.needD)}</td><td class="n">${v(c.needR)}</td></tr>
  </tbody></table>
  <p class="small">${v(c.uncalled)} of ${c.up} seats on the ballot not yet called${loaded && c.noVotes ? ` (${c.noVotes} with no votes reported)` : ''}.${loaded && c.unavailable ? ` ${c.unavailable} district race${c.unavailable === 1 ? '' : 's'} not found in the feed.` : ''}</p>`;
}

function seatStrip(kind) {
  const c = wiChamber(kind);
  const conf = c.conf;
  const cells = [];
  if (kind === 'senate') {
    for (let i = 0; i < conf.dHoldovers; i++) cells.push({ cls: 'hold-d', label: 'Democratic holdover, not up' });
    conf.order.forEach(([n, lbl, rating]) => {
      const key = `SD-${String(n).padStart(2, '0')}`;
      cells.push({ cls: rating, key, n, res: wiDistrict(key).res, label: `${key}, rated ${rating.replace('safe', 'Safe ').replace('lean', 'Lean ').replace('toss', 'Tossup')}, 2024 ${lbl}` });
    });
    for (let i = 0; i < conf.rHoldovers; i++) cells.push({ cls: 'hold-r', label: 'Republican holdover, not up' });
  } else {
    const b = conf.breakdown;
    const watch = Object.fromEntries(conf.watch.map((w) => [w.d, w]));
    for (let i = 0; i < b.safeD; i++) cells.push({ cls: 'safeD', label: 'Safe D seat' });
    ['Lean D', 'Tossup', 'Lean R'].forEach((rt) => Object.keys(watch).filter((k) => watch[k].rating === rt).forEach((k) => cells.push({ cls: RATING_CLS[rt], key: k, n: Number(k.slice(3)), res: wiDistrict(k).res, label: `${k}, ${rt}` })));
    for (let i = 0; i < b.safeR; i++) cells.push({ cls: 'safeR', label: 'Safe R seat' });
  }
  const sel = ui.wiSel;
  return `<div class="wi-strip ${kind}" role="list">
    ${cells.map((x, i) => {
      const st = x.res?.called ? `called-${x.res.called}` : x.res?.hasVotes ? `lead-${x.res.leader}` : '';
      const lab = `${x.label}. ${x.key ? resText(x.res) : ''}`;
      const inner = x.n && kind === 'senate' ? x.n : '';
      return (x.key ? `<button type="button" role="listitem" class="${x.cls} ${st} ${sel === x.key ? 'sel' : ''}" data-set="wiSel=${x.key}" aria-label="${esc(lab)}" title="${esc(lab)}">${inner}</button>` : `<i role="listitem" class="${x.cls}" aria-label="${esc(x.label)}" title="${esc(x.label)}"></i>`) + (i === conf.majority - 1 ? '<b class="maj-line" aria-hidden="true"></b>' : '');
    }).join('')}
  </div>`;
}

function seatsTable(list, { asm = false } = {}) {
  return `<div class="tscroll"><table class="wi-t">
    <thead><tr><th>District</th><th>Rating (Johnson)</th><th>Candidates</th><th class="n">Pres. 2024</th><th class="n">Baldwin 2024</th>${asm ? '<th class="n">Assembly 2024</th>' : ''}<th class="n">Raised (D / R)</th><th class="n">Live</th><th>Expected by (guide)</th></tr></thead>
    <tbody>${list.map((w) => {
      const r = wiDistrict(w.d).res;
      const side = r?.called || (r?.hasVotes ? r.leader : null);
      const flip = side && (side === 'd' || side === 'r') && side !== w.held.toLowerCase();
      return `<tr>
        <td><b>${w.d}</b><small>${esc(w.area)}</small></td>
        <td><span class="rating ${RATING_CLS[w.rating]}">${esc(w.rating)}</span><span class="held held-${w.held.toLowerCase()}">${w.held}-held</span></td>
        <td><div class="cands"><span><i class="pb d">D</i>${esc(w.dem)}</span><span><i class="pb r">R</i>${esc(w.rep)}</span></div></td>
        <td class="n">${marginTag(w.pres)}</td><td class="n">${marginTag(w.baldwin)}</td>${asm ? `<td class="n">${marginTag(w.asm)}</td>` : ''}
        <td class="n"><span class="m-d">${w.money[0]}</span><br><span class="m-r">${w.money[1]}</span><br><small class="muted">${w.moneyNote || 'period not stated'}</small></td>
        <td class="n">${r?.called ? `<span class="m m-${r.called}">${r.called === 'd' ? 'D' : 'R'} called</span>` : r?.hasVotes ? `${marginTag(r.margin)}<br><small class="muted">${r.rep}% in</small>` : `<small class="muted">${r ? 'no votes' : 'n/a'}</small>`}${flip ? `<br><span class="flip ${r.called ? '' : 'soft'}">${r.called ? 'FLIP' : 'flip?'}</span>` : ''}</td>
        <td class="small">${esc(w.inBy)}</td></tr>
        ${w.note ? `<tr class="note"><td></td><td colspan="${asm ? 8 : 7}" class="muted small">${esc(w.note)}</td></tr>` : ''}`;
    }).join('')}</tbody></table></div>`;
}


// ---------- Wisconsin results center: map + full results table per chamber ----------
const CH = {
  senate: { name: 'State Senate', prefix: 'SD', paths: WI_SENATE_PATHS },
  assembly: { name: 'State Assembly', prefix: 'AD', paths: WI_ASSEMBLY_PATHS },
};
// Zoomed views for areas whose districts are too small to tap on the statewide map (viewBox in map px).
const INSETS = [['Milwaukee area', [414, 504, 48, 70]], ['Madison', [291, 512, 48, 46]], ['Green Bay / Fox Valley', [372, 336, 84, 78]]];
const keyOf = (kind, n) => `${CH[kind].prefix}-${String(n).padStart(2, '0')}`;
const WATCH = Object.fromEntries([...WI_LEG.senate.watch, ...WI_LEG.assembly.watch].map((w) => [w.d, w]));
const SEN_RATING = Object.fromEntries(WI_LEG.senate.order.map(([n, m, rt]) => [keyOf('senate', n), { rating: { safeD: 'Safe D', leanD: 'Lean D', toss: 'Tossup', leanR: 'Lean R', safeR: 'Safe R' }[rt], m2024: m }]));

// Bounding box of each district path (relative "l" path from our generator), for picking inset members.
const BBOX = {};
for (const kind of Object.keys(CH)) for (const [n, d] of Object.entries(CH[kind].paths)) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ring of d.split('z')) {
    const m = ring.match(/M([-\d.]+) ([-\d.]+)l?(.*)/);
    if (!m) continue;
    let x = Number(m[1]), y = Number(m[2]);
    const nums = m[3].trim() ? m[3].trim().split(/[\s]+/).map(Number) : [];
    const upd = () => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    upd();
    for (let i = 0; i + 1 < nums.length; i += 2) { x += nums[i]; y += nums[i + 1]; upd(); }
  }
  BBOX[keyOf(kind, n)] = [x0, y0, x1, y1];
}

function seat(kind, n) {
  const key = keyOf(kind, n);
  const up = kind === 'assembly' || n % 2 === 1;
  const w = WATCH[key];
  const rating = w?.rating || SEN_RATING[key]?.rating || null;
  if (!up) return { key, n, up, fill: 'f-off', rating, status: 'Not up in 2026 (holdover)', aria: `${key}: not up in 2026, holdover seat` };
  const { race, res } = wiDistrict(key);
  const cands = (res?.candidates || []).filter((c) => c.name);
  const unopp = res && cands.length === 1 ? (/democrat/i.test(cands[0].party) ? 'd' : /republican/i.test(cands[0].party) ? 'r' : 'o') : null;
  let fill = 'f-none', status = 'No votes reported';
  if (!race) { fill = 'f-na'; status = 'Not in the results feed'; }
  else if (res.called) { fill = `f-called-${res.called}`; status = `Called: ${res.called === 'd' ? 'Democrat' : res.called === 'r' ? 'Republican' : 'other'}`; }
  else if (res.hasVotes && res.leader === 'tie') { fill = 'f-tie'; status = 'Tied'; }
  else if (res.hasVotes) { fill = `f-lead-${res.leader}`; status = `${res.leader === 'd' ? 'Democrat' : res.leader === 'r' ? 'Republican' : 'Other'} leads`; }
  else if (unopp) { fill = `f-unopp-${unopp}`; status = `Unopposed (${unopp.toUpperCase()})`; }
  const marg = res?.hasVotes && res.margin !== null ? `, ${fmtMargin(res.margin, { digits: 1 })}, ${res.rep}% in` : '';
  return { key, n, up, fill, rating, w, race, res, unopp, status, aria: `${key}${w ? ` (${w.area})` : ''}: ${status}${marg}` };
}

function districtShapes(kind, seats, filterBox) {
  return Object.keys(CH[kind].paths).map(Number).filter((n) => {
    if (!filterBox) return true;
    const [x0, y0, x1, y1] = BBOX[keyOf(kind, n)]; const [bx, by, bw, bh] = filterBox;
    return x1 >= bx && x0 <= bx + bw && y1 >= by && y0 <= by + bh;
  }).map((n) => {
    const s = seats[n];
    return `<path d="${CH[kind].paths[n]}" class="${s.fill}${s.w ? ' watch' : ''}${ui.wiSel === s.key ? ' sel' : ''}" data-set="wiSel=${s.key}" role="button" tabindex="0" aria-label="${esc(s.aria)}"><title>${esc(s.aria)}</title></path>`;
  }).join('');
}

function wiMap(kind, seats) {
  const sel = ui.wiSel && ui.wiSel.startsWith(CH[kind].prefix) ? ui.wiSel : null;
  const selFirst = (svg) => (sel ? svg.replace(/(<path[^>]* sel"[^>]*>.*?<\/path>)/, '') + (svg.match(/(<path[^>]* sel"[^>]*>.*?<\/path>)/) || [''])[0] : svg);
  const main = `<svg class="wimap" viewBox="${WI_VIEWBOX}" role="group" aria-label="Wisconsin ${CH[kind].name} districts">${selFirst(districtShapes(kind, seats))}${INSETS.map(([lbl, [x, y, w, h]]) => `<rect class="inset-box" x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('')}</svg>`;
  const insets = INSETS.map(([lbl, box]) => `<figure class="wi-inset"><svg class="wimap" viewBox="${box.join(' ')}" role="group" aria-label="${esc(lbl)} close-up">${selFirst(districtShapes(kind, seats, box))}</svg><figcaption>${esc(lbl)}</figcaption></figure>`).join('');
  return `<div class="wi-maps"><div class="wi-main">${main}</div><div class="wi-insets">${insets}</div></div>`;
}

function mapLegend(kind) {
  return `<div class="legend wi-legend"><span><i class="lg-f f-called-d"></i>Called D</span><span><i class="lg-f f-lead-d"></i>D leads</span><span><i class="lg-f f-called-r"></i>Called R</span><span><i class="lg-f f-lead-r"></i>R leads</span><span><i class="lg-f f-none"></i>No votes yet</span><span><i class="lg-f f-unopp-d"></i>Unopposed</span>${kind === 'senate' ? '<span><i class="lg-f f-off"></i>Not up (holdover)</span>' : ''}<span><i class="lg-f watch-k"></i>Seat to watch (guide)</span></div>`;
}

const pctTxt = (c, total) => (c && total ? `${((c.votes / total) * 100).toFixed(1)}%` : '—');
function candCell(c, total, cls) {
  if (!c) return '<td class="cand muted">—</td>';
  return `<td class="cand"><span class="nm"><i class="pb ${cls}">${cls.toUpperCase()}</i>${esc(c.name)}${c.winner ? ' <b class="win" title="Winner">✓</b>' : ''}</span><span class="vt"><b>${total ? pctTxt(c, total) : ''}</b> ${fmtInt(c.votes)} votes</span></td>`;
}

function selectedDetail(kind, seats) {
  const k = ui.wiSel;
  if (!k || !k.startsWith(CH[kind].prefix)) return `<p class="map-hint">Tap a district on the map or in the table for its full result.</p>`;
  const s = seats[Number(k.slice(3))];
  if (!s) return '';
  const total = s.res?.total || 0;
  const cands = [...(s.res?.candidates || [])].sort((a, b) => b.votes - a.votes);
  return `<div class="wi-detail"><div class="wi-detail-h"><b>${k}${s.w ? ` · ${esc(s.w.area)}` : ''}</b><span class="muted">${esc(s.status)}${s.res?.hasVotes ? ` · ${s.res.rep}% in · ${fmtInt(total)} votes` : ''}${s.rating ? ` · rated ${esc(s.rating)}` : ''}${s.w ? ` · ${s.w.held}-held` : ''}</span><button type="button" class="btn ghost sm" data-set="wiSel=">Close</button></div>
    ${s.up ? `<div class="wi-bars">${cands.length ? cands.map((c) => { const p = total ? (c.votes / total) * 100 : 0; const cls = /democrat/i.test(c.party) ? 'd' : /republican/i.test(c.party) ? 'r' : 'o';
      return `<div class="wi-bar"><span class="nm">${esc(c.name)} <small class="muted">${esc(c.party || '')}</small>${c.winner ? ' <b class="win">✓ winner</b>' : ''}</span><span class="track"><i class="${cls}" style="width:${p}%"></i></span><span class="n">${total ? `${p.toFixed(1)}%` : '—'}</span><span class="n muted">${fmtInt(c.votes)}</span></div>`; }).join('') : '<p class="small muted">No candidates listed in the feed.</p>'}</div>` : '<p class="small muted">This seat is not on the ballot in 2026; its senator was elected in 2024.</p>'}
    ${s.w?.note ? `<p class="small muted">${esc(s.w.note)}</p>` : ''}</div>`;
}

function resultsTable(kind, seats) {
  const fk = `wiF_${kind}`, sk = `wiS_${kind}`;
  const f = ui[fk] || 'all', sort = ui[sk] || 'num';
  let rows = Object.values(seats).filter((s) => s.up);
  if (f === 'watch') rows = rows.filter((s) => s.w || (s.rating && s.rating !== 'Safe D' && s.rating !== 'Safe R'));
  if (f === 'counting') rows = rows.filter((s) => s.res?.hasVotes && !s.res.called);
  if (f === 'called') rows = rows.filter((s) => s.res?.called);
  if (sort === 'close') rows.sort((a, b) => (a.res?.hasVotes ? 0 : 1) - (b.res?.hasVotes ? 0 : 1) || Math.abs(a.res?.margin ?? 999) - Math.abs(b.res?.margin ?? 999) || a.n - b.n);
  else rows.sort((a, b) => a.n - b.n);
  const filters = [['all', 'All'], ['watch', 'Competitive'], ['counting', 'Counting'], ['called', 'Called']];
  return `<div class="wl-tools wi-tools"><div class="seg-ctl" role="group" aria-label="Filter districts">${filters.map(([k, l]) => `<button data-set="${fk}=${k}" class="${f === k ? 'on' : ''}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>
    <div class="seg-ctl" role="group" aria-label="Sort districts"><span class="seg-lbl">Sort</span><button data-set="${sk}=num" class="${sort === 'num' ? 'on' : ''}" aria-pressed="${sort === 'num'}">District</button><button data-set="${sk}=close" class="${sort === 'close' ? 'on' : ''}" aria-pressed="${sort === 'close'}">Closest</button></div>
    <span class="muted small">${rows.length} district${rows.length === 1 ? '' : 's'}</span></div>
  <div class="tscroll"><table class="wi-res">
    <thead><tr><th>District</th><th>Democrat</th><th>Republican</th><th class="n">Margin</th><th class="n">In</th><th>Status</th></tr></thead>
    <tbody>${rows.map((s) => {
      const r = s.res, total = r?.total || 0;
      const other = r ? r.candidates.filter((c) => c !== r.dc && c !== r.rc && c.votes > 0) : [];
      return `<tr class="${ui.wiSel === s.key ? 'sel' : ''}">
        <td><button type="button" class="linkish" data-set="wiSel=${s.key}"><b>${s.key}</b></button>${s.w ? `<small>${esc(s.w.area)}</small>` : ''}${s.rating ? `<span class="rating ${RATING_CLS[s.rating]}">${esc(s.rating)}</span>` : ''}</td>
        ${candCell(r?.dc, total, 'd')}${candCell(r?.rc, total, 'r')}
        <td class="n">${r?.hasVotes && r.margin !== null ? marginTag(r.margin) : '<span class="muted">—</span>'}${other.length ? `<small class="muted">other ${pctTxt({ votes: other.reduce((a, c) => a + c.votes, 0) }, total)}</small>` : ''}</td>
        <td class="n">${r ? `${r.rep}%` : '—'}</td>
        <td><span class="wi-st ${s.fill}">${esc(s.status)}</span></td></tr>`;
    }).join('') || `<tr><td colspan="6" class="muted">No districts match this filter yet.</td></tr>`}</tbody></table></div>`;
}

function chamberCard(kind) {
  const conf = WI_LEG[kind];
  const c = wiChamber(kind);
  const seats = Object.fromEntries(Object.keys(CH[kind].paths).map((n) => [Number(n), seat(kind, Number(n))]));
  const path = kind === 'senate'
    ? '<b>Path (pre-election ratings):</b> Democrats start with 10 holdovers. Winning the 4 Safe D and 3 Lean D seats (SD-5, 21, 31) would give exactly 17, without SD-17. Each Lean D loss means Democrats would need SD-17 or SD-25 instead.'
    : '<b>Path (pre-election ratings):</b> 47 seats are Safe or Lean D. <em>If every Safe and Lean seat goes as rated</em>, Democrats need all 3 toss-ups (AD-88, 61, 51) for 50. Each Lean R pickup (AD-85, 30, 92) would reduce that by one.';
  return `<section class="card wide wi-chamber" id="wi-${kind}">
    <div class="card-h"><h3>Wisconsin ${CH[kind].name}</h3><span class="muted">${conf.seats} seats · ${kind === 'senate' ? `${conf.up} up · ` : 'all up · '}majority ${conf.majority} · chamber rating <b>${conf.rating}</b></span></div>
    ${seatStrip(kind)}
    <div class="legend strip-legend">${kind === 'senate' ? '<span><i class="lg-hold-d"></i>Holdover D</span>' : ''}<span><i class="lg-safeD"></i>Safe D</span><span><i class="lg-leanD"></i>Lean D</span><span><i class="lg-toss"></i>Tossup</span><span><i class="lg-leanR"></i>Lean R</span><span><i class="lg-safeR"></i>Safe R</span>${kind === 'senate' ? '<span><i class="lg-hold-r"></i>Holdover R</span>' : ''}<span class="muted">Strip: pre-election ratings · gold ring = called · white dot = leading</span></div>
    <div class="wi-body">
      <div>${wiMap(kind, seats)}${mapLegend(kind)}</div>
      <div class="wi-side">${balanceTable(c, kind)}<p class="small">${path}</p></div>
    </div>
    ${selectedDetail(kind, seats)}
    <h4 class="wi-th">Every ${kind === 'senate' ? 'Senate district on the ballot' : 'Assembly district'}</h4>
    ${resultsTable(kind, seats)}
  </section>`;
}

function minnesota() {
  const h = mnChamber('house'), s = mnChamber('senate');
  const block = (c, name, start, startNote) => {
    const close = c.rows.filter((x) => x.res.hasVotes && !x.res.called && x.res.margin !== null).sort((a, b) => Math.abs(a.res.margin) - Math.abs(b.res.margin)).slice(0, 8);
    return `<div class="mn-ch"><h4>${name}</h4>
      <p class="small"><b>Before tonight:</b> ${start} ${startNote} · ${c.seats} seats, all up · ${c.majority} for a majority.</p>
      ${c.found ? `<table class="mini-t bal"><thead><tr><th></th><th class="n m-d">DFL</th><th class="n m-r">Rep</th></tr></thead><tbody>
        <tr class="sum"><th>Called tonight</th><td class="n"><b>${c.calledD}</b></td><td class="n"><b>${c.calledR}</b></td></tr>
        <tr><th>Leading, not called</th><td class="n">${c.leadD}</td><td class="n">${c.leadR}</td></tr>
        <tr><th>Still needed for ${c.majority}</th><td class="n">${c.needD}</td><td class="n">${c.needR}</td></tr></tbody></table>
        <p class="small muted">${c.found} district races in the feed; ${c.noVotes} with no votes reported.</p>
        ${close.length ? `<p class="small"><b>Closest uncalled races now:</b> ${close.map((x) => `${esc(x.name)} ${fmtMargin(x.res.margin, { digits: 1 })} (${x.res.rep}%)`).join(' · ')}</p>` : ''}`
      : '<p class="small muted">civicAPI has not returned Minnesota district races yet.</p>'}
    </div>`;
  };
  return `<section class="card wide"><div class="card-h"><h3>Minnesota Legislature</h3><span class="muted">polls close 8 PM CT · live from civicAPI district races</span></div>
    <div class="mn-grid">
      ${block(h, 'State House', '67 DFL, 66 R, 1 vacant seat.', 'The vacancy is a safely Republican seat, so the chamber is effectively tied 67 to 67 (restored by special elections in Jan. 2026).')}
      ${block(s, 'State Senate', '34 DFL, 33 R.', '')}
    </div>
    <p class="small muted">The guide has no Minnesota district ratings, so no key-race list or paths are shown beyond the live arithmetic. Starting balance: guide p. 24 (date not given). The vacancy detail was checked against 2026 news reports.</p>
  </section>`;
}

function legislatures() {
  const sort = ui.legSort || 'close';
  const rows = LEGISLATURES.map(([name, close, d, r, maj, note]) => {
    const total = Number((note.match(/all (\d+)/) || [])[1]) || null;
    const tot = Math.max(d + r, total || 0, maj * 2 - 1);
    const lead = d >= maj ? 'd' : r >= maj ? 'r' : null;
    const minority = lead === 'd' ? r : lead === 'r' ? d : Math.max(d, r);
    const toFlip = lead ? maj - minority : maj - Math.max(d, r);
    return { name, close, d, r, maj, note, tot, lead, toFlip, live: chamberByName(name) };
  });
  if (sort === 'flip') rows.sort((a, b) => a.toFlip - b.toFlip); else rows.sort((a, b) => hhmm(a.close) - hhmm(b.close));
  return `<section class="card wide">
    <div class="card-h"><h3>State legislatures: seats before tonight and the majority line</h3>
      <div class="seg-ctl" role="group" aria-label="Sort"><span class="seg-lbl">Sort</span><button data-set="legSort=close" class="${sort === 'close' ? 'on' : ''}">Poll close</button><button data-set="legSort=flip" class="${sort === 'flip' ? 'on' : ''}">Closest to flipping</button></div></div>
    <p class="small muted">Bars show party membership before tonight (guide p. 24, date not given), not live calls. "Live" is civicAPI's chamber seat total, whose definition (whether it includes holdovers) isn't documented. "Seats to flip" is how many seats the minority party would need to gain. Alaska's House and Senate are run by bipartisan coalitions, so party membership does not decide control there.</p>
    <div class="leg-rows">${rows.map((x) => {
      const has = x.live.race && (x.live.d || x.live.r);
      return `<div class="leg">
        <span class="nm">${esc(x.name.replace(' State ', ' '))}</span><span class="muted">${fmtNightTime(hhmm(x.close))}</span>
        <span class="lb" role="img" aria-label="Before tonight: ${x.d} Democrats, ${x.r} Republicans; ${x.maj} needed"><i class="d" style="width:${(x.d / x.tot) * 100}%">${x.d}</i><i class="r" style="width:${(x.r / x.tot) * 100}%">${x.r}</i><b style="left:${(x.maj / x.tot) * 100}%"></b></span>
        <span class="small">maj. ${x.maj} · ${esc(x.note)} · <b>${x.toFlip}</b> to flip</span>
        <span class="lv">${has ? `<b class="m-d">D ${x.live.d}</b> · <b class="m-r">R ${x.live.r}</b>${x.live.o ? ` · ${x.live.o}` : ''}` : '<span class="muted">no live total</span>'}</span>
      </div>`;
    }).join('')}</div>
  </section>`;
}

function money() {
  const max = Math.max(...WI_LEG.outsideMoney.map((x) => x[1]));
  return `<section class="card"><div class="card-h"><h3>Outside money: First Amendment LLC</h3><span class="muted">guide p. 17 · date and filing source not given</span></div>
    <div class="money">${WI_LEG.outsideMoney.map(([d, v]) => `<div><b>${d}</b><span class="bar"><i style="width:${(v / max) * 100}%"></i></span><em>$${v}K</em></div>`).join('')}</div></section>`;
}

export function render() {
  const S = WI_LEG.senate, A = WI_LEG.assembly;
  const region = ui.legRegion || 'WI';
  return `<div class="grid legis">
    <label class="wide"><span class="lbl">Legislature</span> <select data-ui="legRegion" aria-label="Choose a legislature">
      ${[['WI', 'Wisconsin'], ['MN', 'Minnesota'], ['all', 'All states']].map(([key, name]) => `<option value="${key}" ${key === region ? 'selected' : ''}>${name}</option>`).join('')}
    </select></label>
    ${region === 'MN' ? minnesota() : region === 'all' ? legislatures() : `
    <p class="wide small muted wi-intro">Polls close 8 PM CT. Milwaukee and Brown counties often finish Wednesday (guide). Results update automatically from civicAPI every 90 seconds. ${RATING_SRC}</p>
    ${chamberCard('senate')}
    ${chamberCard('assembly')}
    <section class="card wide"><div class="card-h"><h3>Wisconsin Senate: seats to watch</h3><span class="muted">guide notes</span></div>${seatsTable(S.watch)}<p class="small muted">${RATING_SRC} Fundraising as printed in the guide; reporting periods are given only where noted, and no filing source is cited.</p></section>
    <section class="card wide"><div class="card-h"><h3>Wisconsin Assembly: seats to watch</h3><span class="muted">guide notes</span></div>${seatsTable(A.watch, { asm: true })}</section>
    <details class="card wide" ${openAttr('leg-money')}><summary>Wisconsin outside spending</summary>${money()}</details>`}
  </div>`;
}
