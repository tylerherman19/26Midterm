import { esc, fmtMargin, hhmm, fmtNightTime } from '../util.js';
import { wiChamber, wiDistrict, chamberByName } from '../model.js';
import { WI_LEG, LEGISLATURES } from '../data/guide.js';
import { marginTag } from '../ui.js';

const RATING_CLS = { 'Safe D': 'safeD', 'Lean D': 'leanD', Tossup: 'toss', 'Lean R': 'leanR', 'Safe R': 'safeR' };

function seatStrip(kind) {
  const c = wiChamber(kind);
  const conf = c.conf;
  const cells = [];
  if (kind === 'senate') {
    for (let i = 0; i < conf.dHoldovers; i++) cells.push({ cls: 'hold-d', title: 'Holdover D' });
    conf.order.forEach(([n, lbl, rating]) => {
      const r = wiDistrict(`SD-${String(n).padStart(2, '0')}`).res;
      cells.push({ cls: rating, n, lbl, res: r, title: `SD-${n} · ${lbl}` });
    });
    for (let i = 0; i < conf.rHoldovers; i++) cells.push({ cls: 'hold-r', title: 'Holdover R' });
  } else {
    const b = conf.breakdown;
    const watch = Object.fromEntries(conf.watch.map((w) => [w.d, w]));
    const seats = Object.keys(watch);
    const ordered = [];
    for (let i = 0; i < b.safeD; i++) ordered.push({ cls: 'safeD' });
    ['Lean D', 'Tossup', 'Lean R'].forEach((rt) => seats.filter((s) => watch[s].rating === rt).forEach((s) => ordered.push({ cls: RATING_CLS[rt], key: s })));
    for (let i = 0; i < b.safeR; i++) ordered.push({ cls: 'safeR' });
    ordered.forEach((o) => {
      const r = o.key ? wiDistrict(o.key).res : null;
      cells.push({ cls: o.cls, res: r, title: o.key || '', n: o.key ? Number(o.key.slice(3)) : null });
    });
  }
  const maj = conf.majority;
  return `<div class="wi-strip ${kind}">
    ${cells.map((x, i) => {
      const st = x.res?.called ? `called-${x.res.called}` : x.res?.hasVotes ? `lead-${x.res.leader}` : '';
      return `<i class="${x.cls} ${st}" title="${esc(x.title)}${x.res?.hasVotes ? ' · ' + fmtMargin(x.res.margin, { digits: 1 }) : ''}">${x.n && kind === 'senate' ? x.n : ''}</i>${i === maj - 1 ? '<b class="maj-line"></b>' : ''}`;
    }).join('')}
  </div>
  <div class="wi-sum"><span>Called/holdover <b class="d">D ${c.calledD}</b> · <b class="r">R ${c.calledR}</b></span><span>Leading <b class="d">D ${c.leadD}</b> · <b class="r">R ${c.leadR}</b></span><span class="muted">${c.up} districts tracked · ${maj} = majority</span></div>`;
}

function seatsTable(list, { asm = false } = {}) {
  return `<div class="tscroll"><table class="wi-t">
    <thead><tr><th>District</th><th>Rating</th><th>Candidates</th><th class="n">Pres. 2024</th><th class="n">Baldwin 2024</th>${asm ? '<th class="n">Assembly 2024</th>' : ''}<th class="n">Raised (D / R)</th><th class="n">Live</th><th>In by (CT), county</th></tr></thead>
    <tbody>${list.map((w) => {
      const r = wiDistrict(w.d).res;
      const flip = r && (r.called || r.hasVotes) && (r.called || r.leader) !== w.held.toLowerCase() && ['d', 'r'].includes(r.called || r.leader);
      return `<tr>
        <td><b>${w.d}</b><small>${esc(w.area)}</small></td>
        <td><span class="rating ${RATING_CLS[w.rating]}">${esc(w.rating)}</span><span class="held held-${w.held.toLowerCase()}">${w.held}-held</span></td>
        <td><div class="cands"><span><i class="pb d">D</i>${esc(w.dem)}</span><span><i class="pb r">R</i>${esc(w.rep)}</span></div></td>
        <td class="n">${marginTag(w.pres)}</td><td class="n">${marginTag(w.baldwin)}</td>${asm ? `<td class="n">${marginTag(w.asm)}</td>` : ''}
        <td class="n"><span class="m-d">${w.money[0]}</span><br><span class="m-r">${w.money[1]}</span>${w.moneyNote ? `<br><small class="muted">${w.moneyNote}</small>` : ''}</td>
        <td class="n">${r?.called ? `<span class="m m-${r.called}">${r.called === 'd' ? 'D' : 'R'} ✓</span>` : r?.hasVotes ? `${marginTag(r.margin)}<br><small class="muted">${r.rep}%</small>` : '<span class="muted">—</span>'}${flip ? '<br><span class="flip">FLIP</span>' : ''}</td>
        <td class="small">${esc(w.inBy)}</td></tr>
        ${w.note ? `<tr class="note"><td></td><td colspan="${asm ? 8 : 7}" class="muted small">${esc(w.note)}</td></tr>` : ''}`;
    }).join('')}</tbody></table></div>`;
}

function legislatures() {
  return `<section class="card wide">
    <div class="card-h"><h3>State legislatures: seats now and the majority line</h3><span class="muted">bars show seats before tonight · live column from civicAPI chamber totals</span></div>
    <div class="leg-rows">${LEGISLATURES.map(([name, close, d, r, maj, note]) => {
      const total = Number((note.match(/all (\d+)/) || [])[1]) || null;
      const tot = Math.max(d + r, total || 0, maj * 2 - 1);
      const live = chamberByName(name);
      const has = live.race && (live.d || live.r);
      return `<div class="leg">
        <span class="nm">${esc(name.replace(' State ', ' '))}</span><span class="muted">${fmtNightTime(hhmm(close))}</span>
        <span class="lb"><i class="d" style="width:${(d / tot) * 100}%">${d}</i><i class="r" style="width:${(r / tot) * 100}%">${r}</i><b style="left:${(maj / tot) * 100}%"></b></span>
        <span class="small">maj. ${maj} · ${esc(note)}</span>
        <span class="lv">${has ? `<b class="m-d">D ${live.d}</b> · <b class="m-r">R ${live.r}</b>${live.o ? ` · ${live.o}` : ''}` : '<span class="muted">—</span>'}</span>
      </div>`;
    }).join('')}</div>
  </section>`;
}

function money() {
  const max = Math.max(...WI_LEG.outsideMoney.map((x) => x[1]));
  return `<section class="card"><div class="card-h"><h3>Outside money: First Amendment LLC</h3></div>
    <div class="money">${WI_LEG.outsideMoney.map(([d, v]) => `<div><b>${d}</b><span class="bar"><i style="width:${(v / max) * 100}%"></i></span><em>$${v}K</em></div>`).join('')}</div></section>`;
}

export function render() {
  const S = WI_LEG.senate, A = WI_LEG.assembly;
  return `<div class="grid legis">
    <section class="card wide">
      <div class="card-h"><h3>Wisconsin Legislature: majority math</h3><span class="muted">polls close 8 PM CT · Milwaukee and Brown report Wednesday</span></div>
      <div class="wi-ch"><div class="wi-h"><h4>State Senate</h4><span class="muted">${S.seats} seats · ${S.up} up · Johnson's chamber rating: <b>${S.rating}</b></span></div>
        ${seatStrip('senate')}
        <p class="small">${esc(S.summary)}</p>
        <div class="legend"><span><i class="lg-hold-d"></i>Holdover D ${S.dHoldovers}</span><span><i class="lg-safeD"></i>Safe D</span><span><i class="lg-leanD"></i>Lean D</span><span><i class="lg-toss"></i>Tossup</span><span><i class="lg-leanR"></i>Lean R</span><span><i class="lg-safeR"></i>Safe R</span><span><i class="lg-hold-r"></i>Holdover R ${S.rHoldovers}</span><span class="muted">Ring = called · dot = leading</span></div></div>
      <div class="wi-ch"><div class="wi-h"><h4>State Assembly</h4><span class="muted">${A.seats} seats · all up · Johnson's chamber rating: <b>${A.rating}</b></span></div>
        ${seatStrip('assembly')}
        <p class="small">${esc(A.summary)}</p></div>
    </section>
    <section class="card wide"><div class="card-h"><h3>Wisconsin Senate: seats to watch</h3></div>${seatsTable(S.watch)}</section>
    <section class="card wide"><div class="card-h"><h3>Wisconsin Assembly: seats to watch</h3></div>${seatsTable(A.watch, { asm: true })}</section>
    ${money()}
    ${legislatures()}
  </div>`;
}
