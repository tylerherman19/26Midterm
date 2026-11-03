// Change feed: diffs successive snapshots of tracked races into "calls / lead changes / milestones".
import { data, nowNight } from './api.js';
import { readRace, readSenate, HOUSE_META } from './model.js';
import { RACE_IDS } from './data/raceIds.js';
import { STATES, STATE_NAMES } from './data/guide.js';
import { esc, fmtMargin, fmtClock, store } from './util.js';

const prev = new Map();
let events = [];
let toastFn = null;
export const onToast = (fn) => { toastFn = fn; };

function tracked() {
  const out = [];
  for (const [st, id] of Object.entries(RACE_IDS.senate)) {
    const g = STATES[st]?.races.find((r) => r.office === 'senate');
    out.push({ id, label: `${STATE_NAMES[st] || st} Senate`, opts: { d: g?.d, r: g?.r, dSideName: g?.dSideName }, senate: g || {}, key: true, href: STATES[st] ? `#/states/${st}` : null, dLabel: g?.dLabel || 'D' });
  }
  for (const [st, id] of Object.entries(RACE_IDS.governor)) {
    if (!STATE_NAMES[st]) continue;
    const g = STATES[st]?.races.find((r) => r.office === 'governor');
    out.push({ id, label: `${STATE_NAMES[st]} Governor`, opts: { d: g?.d, r: g?.r }, key: !!g, href: STATES[st] ? `#/states/${st}` : null, dLabel: 'D' });
  }
  for (const [d, meta] of Object.entries(HOUSE_META)) {
    out.push({ id: RACE_IDS.house[d], label: d, opts: { d: meta.dn, r: meta.rn }, key: meta.ddhq !== undefined, href: `#/house?d=${d}`, held: meta.held, dLabel: 'D' });
  }
  return out;
}
let trackedList = null;

export function diffFeed() {
  trackedList ||= tracked();
  const t = nowNight();
  const fresh = [];
  for (const tr of trackedList) {
    const race = data.races.get(Number(tr.id));
    if (!race) continue;
    const r = tr.senate ? readSenate(race, tr.senate) : readRace(race, tr.opts);
    const p = prev.get(tr.id);
    prev.set(tr.id, { called: r.called, leader: r.leader, rep: r.rep, margin: r.margin });
    if (!p) continue; // first sighting: baseline only
    const who = (side) => (side === 'd' ? r.dc?.name : side === 'r' ? r.rc?.name : 'Other');
    const party = (side) => (side === 'd' ? (r.indAligned ? 'I' : tr.dLabel) : side === 'r' ? 'R' : '');
    if (!r.called && p.called) {
      fresh.push({ t, kind: 'retract', side: p.called, important: true, href: tr.href, text: `${tr.label}: call withdrawn by the results provider`, sub: r.hasVotes ? `${fmtMargin(r.margin, { digits: 1, dLabel: tr.dLabel })} with ${r.rep}% in` : '' });
    } else if (r.called && !p.called) {
      const flip = tr.held && r.called !== tr.held && r.called !== 'o';
      fresh.push({ t, kind: 'call', side: r.called, important: tr.key || flip, href: tr.href,
        text: `${tr.label}: ${who(r.called) || ''} (${party(r.called)}) wins${flip ? ', a flip' : ''}`, sub: r.hasVotes ? `${fmtMargin(r.margin, { digits: 1, dLabel: tr.dLabel })} with ${r.rep}% in` : '' });
    } else if (!r.called && r.hasVotes && p.leader && r.leader && r.leader !== p.leader && r.rep >= 3) {
      fresh.push({ t, kind: 'lead', side: r.leader, important: tr.key, href: tr.href,
        text: `${tr.label}: ${who(r.leader)} takes the lead`, sub: `${fmtMargin(r.margin, { digits: 1, dLabel: tr.dLabel })} with ${r.rep}% in` });
    } else if (r.hasVotes && (p.rep || 0) === 0 && tr.key) {
      fresh.push({ t, kind: 'first', side: r.leader, href: tr.href, text: `${tr.label}: first votes in`, sub: `${fmtMargin(r.margin, { digits: 1, dLabel: tr.dLabel })} with ${r.rep}% in` });
    } else if (tr.key && [50, 90].some((th) => (p.rep || 0) < th && r.rep >= th)) {
      const th = r.rep >= 90 ? 90 : 50;
      fresh.push({ t, kind: 'milestone', side: r.leader, href: tr.href, text: `${tr.label}: ${th}% in`, sub: fmtMargin(r.margin, { digits: 1, dLabel: tr.dLabel }) });
    }
  }
  if (fresh.length) {
    events = [...fresh.reverse(), ...events].slice(0, 250);
    store(`en26-feed-${data.mode}`, events);
    fresh.filter((e) => (e.kind === 'call' || e.kind === 'retract') && e.important).slice(0, 4).forEach((e) => toastFn?.(e));
  }
}

export function latestImportant(n = 4) {
  return events.filter((e) => e.kind === 'call' || e.kind === 'lead' || e.kind === 'retract').slice(0, n).map((e) => ({ ...e, time: fmtClock(e.t) }));
}

export function resetFeed() {
  prev.clear();
  events = store('en26-feed-live') || [];
}

export function feedHTML({ limit = 40 } = {}) {
  if (!events.length) return `<div class="empty">Nothing yet. Calls, lead changes and first votes in tracked races will appear here with timestamps once polls close.</div>`;
  return `<ol class="feed">${events.slice(0, limit).map((e) => `
    <li class="fe fe-${e.kind} side-${e.side || 'n'}">
      <time>${fmtClock(e.t)}</time>
      <span class="dot"></span>
      <div>${e.href ? `<a href="${e.href}">${esc(e.text)}</a>` : esc(e.text)}${e.sub ? `<small>${esc(e.sub)}</small>` : ''}</div>
    </li>`).join('')}</ol>`;
}
