import { esc, fmtMargin, hhmm, fmtNightTime } from '../util.js';
import { wiChamber, wiDistrict, chamberByName, mnChamber } from '../model.js';
import { WI_LEG, LEGISLATURES } from '../data/guide.js';
import { marginTag } from '../ui.js';
import { ui, openAttr } from '../state.js';
import { feedHealth } from '../api.js';
import { simTag } from '../status.js';

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

function seatDetail() {
  const k = ui.wiSel;
  if (!k) return '<p class="map-hint">Tap a numbered or rated seat for its details.</p>';
  const w = [...WI_LEG.senate.watch, ...WI_LEG.assembly.watch].find((x) => x.d === k);
  const r = wiDistrict(k).res;
  const ord = WI_LEG.senate.order.find(([n]) => `SD-${String(n).padStart(2, '0')}` === k);
  return `<div class="map-detail"><div><b>${k}${w ? ` · ${esc(w.area)}` : ''}</b><span class="muted">${w ? `${esc(w.dem)} (D) vs. ${esc(w.rep)} (R) · ${w.rating}, ${w.held}-held` : ord ? `2024 margin ${ord[1]} · ${ord[2].replace('safe', 'Safe ').replace('lean', 'Lean ')}` : ''}</span></div><div>${esc(resText(r))}${simTag()}</div></div>`;
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
  const cs = wiChamber('senate'), ca = wiChamber('assembly');
  const region = ui.legRegion || 'WI';
  return `<div class="grid legis">
    <label class="wide"><span class="lbl">Legislature</span> <select data-ui="legRegion" aria-label="Choose a legislature">
      ${[['WI', 'Wisconsin'], ['MN', 'Minnesota'], ['all', 'All states']].map(([key, name]) => `<option value="${key}" ${key === region ? 'selected' : ''}>${name}</option>`).join('')}
    </select></label>
    ${region === 'MN' ? minnesota() : region === 'all' ? legislatures() : `
    <section class="card wide">
      <div class="card-h"><h3>Wisconsin Legislature: majority math</h3><span class="muted">polls close 8 PM CT · Milwaukee and Brown counties often finish Wednesday (guide)</span></div>
      <div class="wi-two">
        <div class="wi-ch"><div class="wi-h"><h4>State Senate</h4><span class="muted">${S.seats} seats · ${S.up} up · majority ${S.majority} · chamber rating <b>${S.rating}</b></span></div>
          ${seatStrip('senate')}${balanceTable(cs, 'senate')}
          <p class="small"><b>Path (pre-election ratings):</b> Democrats start with 10 holdovers. Winning the 4 Safe D and 3 Lean D seats (SD-5, 21, 31) would give exactly 17, without SD-17. Each Lean D loss means Democrats would need SD-17 or SD-25 instead.</p></div>
        <div class="wi-ch"><div class="wi-h"><h4>State Assembly</h4><span class="muted">${A.seats} seats · all up · majority ${A.majority} · chamber rating <b>${A.rating}</b></span></div>
          ${seatStrip('assembly')}${balanceTable(ca, 'assembly')}
          <p class="small"><b>Path (pre-election ratings):</b> 47 seats are Safe or Lean D. <em>If every Safe and Lean seat goes as rated</em>, Democrats need all 3 toss-ups (AD-88, 61, 51) for 50. Each Lean R pickup (AD-85, 30, 92) would reduce that by one, and each Lean D loss (AD-21, 53, 94) would raise it.</p></div>
      </div>
      ${seatDetail()}
      <div class="legend"><span><i class="lg-hold-d"></i>Holdover D</span><span><i class="lg-safeD"></i>Safe D</span><span><i class="lg-leanD"></i>Lean D</span><span><i class="lg-toss"></i>Tossup</span><span><i class="lg-leanR"></i>Lean R</span><span><i class="lg-safeR"></i>Safe R</span><span><i class="lg-hold-r"></i>Holdover R</span><span class="muted">Gold ring = called · white dot = leading · colors are pre-election ratings</span></div>
      <p class="small muted">${RATING_SRC} Safe-seat blocks are counts from the ratings, not individual districts.</p>
    </section>
    <section class="card wide"><div class="card-h"><h3>Wisconsin Senate: seats to watch</h3></div>${seatsTable(S.watch)}<p class="small muted">${RATING_SRC} Fundraising as printed in the guide; reporting periods are given only where noted, and no filing source is cited.</p></section>
    <section class="card wide"><div class="card-h"><h3>Wisconsin Assembly: seats to watch</h3></div>${seatsTable(A.watch, { asm: true })}</section>
    <details class="card wide" ${openAttr('leg-money')}><summary>Wisconsin outside spending</summary>${money()}</details>`}
  </div>`;
}
