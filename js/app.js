import { data, onUpdate, startLive, startDemo, setMode, refreshNow, nowNight, setHouseFallbackList } from './api.js';
import { fmtClock, fmtDayLabel, fmtCountdown, ago, esc, store, fmtNightTime } from './util.js';
import { senateTally, houseTally, nightMiss, HOUSE_META } from './model.js';
import { tierChip } from './ui.js';
import { diffFeed, resetFeed, onToast } from './feed.js';
import { ui } from './state.js';
import * as overview from './views/overview.js';
import * as states from './views/states.js';
import * as houseView from './views/house.js';
import * as signals from './views/signals.js';
import * as tonight from './views/tonight.js';
import * as counties from './views/counties.js';
import * as legis from './views/legis.js';
import * as pace from './views/pace.js';

const ROUTES = {
  '': { title: 'Overview', view: overview },
  states: { title: 'Senate & Governor', view: states },
  signals: { title: 'First House races', view: signals },
  house: { title: 'House', view: houseView },
  tonight: { title: 'Hour by hour', view: tonight },
  counties: { title: 'Counties', view: counties },
  legislatures: { title: 'Legislatures', view: legis },
  pace: { title: 'Count pace', view: pace },
};

const $ = (s) => document.querySelector(s);

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const [route, arg] = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  if (route === 'states' && arg) params.st = arg;
  return { route: ROUTES[route] ? route : '', params };
}

function renderNav(route) {
  $('#tabs').innerHTML = Object.entries(ROUTES).map(([k, r]) => `<a href="#/${k}" class="${k === route ? 'on' : ''}">${r.title}</a>`).join('');
}

function renderTicker() {
  const s = senateTally();
  const h = houseTally();
  const m = nightMiss();
  const hTier = m.houseSeats === null ? null : m.houseSeats < 218 ? 'riptide' : m.houseSeats < 230 ? 'tide' : m.houseSeats < 240 ? 'wave' : 'tsunami';
  const any = s.leadD + s.leadR + s.calledD + s.calledR > 0;
  $('#ticker').innerHTML = `
    <a href="#/" class="tk"><span class="lbl">Senate</span><b class="d">${s.officialD}</b><span class="sep">–</span><b class="r">${s.officialR}</b><small>called · 51 to win</small>${any ? tierChip(s.tier, { small: true }) : ''}</a>
    <a href="#/house" class="tk"><span class="lbl">House</span><b class="d">${h.calledD}</b><span class="sep">–</span><b class="r">${h.calledR}</b><small>called · 218 to win</small>${hTier ? tierChip(hTier, { small: true }) : ''}</a>
    ${m.miss !== null ? `<span class="tk"><span class="lbl">vs DDHQ</span><b class="${m.miss >= 0 ? 'd' : 'r'}">${m.miss >= 0 ? 'D' : 'R'}+${Math.abs(m.miss).toFixed(1)}</b><small>${m.n} races</small></span>` : ''}`;
}

let lastRoute = null;
function render() {
  const { route, params } = parseHash();
  const r = ROUTES[route];
  renderNav(route);
  renderTicker();
  const view = $('#view');
  const y = window.scrollY;
  try {
    view.innerHTML = r.view.render(params);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card"><h3>Something went wrong rendering this view</h3><pre>${esc(e.stack || e)}</pre></div>`;
  }
  document.title = `${r.title} · Election Night 2026`;
  if (lastRoute !== location.hash) {
    lastRoute = location.hash;
    if (params.d) document.getElementById(`h-${params.d}`)?.scrollIntoView({ block: 'center' }) || document.getElementById(`hw-${params.d}`)?.scrollIntoView({ block: 'center' });
    else if (route === 'tonight') document.getElementById('tl-now')?.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, y);
  }
  renderStatus();
}

function renderStatus() {
  const live = data.mode === 'live';
  const errs = Object.entries(data.errors);
  const stale = live && data.lastUpdate && Date.now() - data.lastUpdate > 150_000;
  const dotCls = !live ? 'demo' : errs.length && !data.lastUpdate ? 'err' : stale ? 'warn' : data.inflight ? 'busy' : 'ok';
  $('#status').innerHTML = `
    <span class="dot ${dotCls}"></span>
    <span class="st-txt">${live ? '<b>LIVE</b>' : '<b>REHEARSAL</b>'} <span class="muted" id="ago">${data.lastUpdate ? 'updated ' + ago(data.lastUpdate) : 'connecting…'}</span>
    ${errs.length && live ? `<span class="err-txt" title="${esc(errs.map(([k, v]) => `${k}: ${v}`).join('\n'))}">civicAPI busy, retrying</span>` : ''}</span>`;
  $('#mode-btn').textContent = live ? 'Rehearse the night' : 'Back to live';
  $('#mode-btn').classList.toggle('on', !live);
  $('#demo-bar').hidden = live;
  if (!live && data.sim) {
    const sl = $('#sim-t');
    if (document.activeElement !== sl) sl.value = Math.round(data.sim.t);
    $('#sim-label').textContent = `${fmtNightTime(Math.round(data.sim.t))} CT`;
    $('#sim-play').textContent = data.sim.playing ? 'Pause' : 'Play';
    $('#sim-err').textContent = `simulated miss vs DDHQ: ${data.sim.nationalErr >= 0 ? 'D' : 'R'}+${Math.abs(data.sim.nationalErr).toFixed(1)}`;
  }
}

function tickClock() {
  const t = nowNight();
  $('#clock').textContent = fmtClock(t, { seconds: data.mode === 'live' });
  $('#clock-day').textContent = `CT · ${fmtDayLabel(t)}`;
  document.querySelectorAll('[data-countdown]').forEach((el) => { el.textContent = fmtCountdown(Number(el.dataset.countdown) - t); });
  const a = $('#ago');
  if (a && data.lastUpdate) a.textContent = 'updated ' + ago(data.lastUpdate);
}

function toast(e) {
  const el = document.createElement('div');
  el.className = `toast side-${e.side}`;
  el.innerHTML = `<b>${esc(e.text)}</b>${e.sub ? `<small>${esc(e.sub)}</small>` : ''}`;
  if (e.href) el.onclick = () => { location.hash = e.href; };
  const box = $('#toasts');
  box.appendChild(el);
  const max = matchMedia('(max-width: 720px)').matches ? 1 : 3;
  while (box.children.length > max) box.firstElementChild.remove();
  el.addEventListener('click', () => el.remove());
  setTimeout(() => el.classList.add('out'), max === 1 ? 4500 : 7000);
  setTimeout(() => el.remove(), 7600);
  if (ui.notify && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification(e.text, { body: e.sub || '' }); } catch { /* ignore */ }
  }
}

// ---------- theme ----------
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  $('#theme-btn').textContent = t === 'dark' ? 'Light' : t === 'light' ? 'Dark' : 'Dark';
}

function init() {
  applyTheme(store('en26-theme'));
  $('#theme-btn').onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    store('en26-theme', next);
    applyTheme(next);
  };
  $('#refresh-btn').onclick = () => refreshNow();
  $('#mode-btn').onclick = () => {
    const next = data.mode === 'live' ? 'demo' : 'live';
    setMode(next);
    resetFeed();
  };
  $('#notify-btn').onclick = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    ui.notify = p === 'granted';
    $('#notify-btn').classList.toggle('on', ui.notify);
    $('#notify-btn').textContent = ui.notify ? 'Alerts on' : 'Alerts';
  };
  // rehearsal controls
  $('#sim-play').onclick = () => { if (data.sim) { data.sim.playing = !data.sim.playing; renderStatus(); } };
  $('#sim-speed').onchange = (e) => { if (data.sim) data.sim.speed = Number(e.target.value); };
  $('#sim-t').oninput = (e) => { if (data.sim) { data.sim.setTime(Number(e.target.value)); } };
  $('#sim-shuffle').onclick = () => { data.sim?.reshuffle(); resetFeed(); };

  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-house-filter]');
    if (f) { ui.houseFilter = f.dataset.houseFilter; render(); }
    const mo = e.target.closest('[data-map-office]');
    if (mo) { ui.mapOffice = mo.dataset.mapOffice; render(); }
    const ms = e.target.closest('[data-map-st]');
    if (ms) { ui.mapSel = ui.mapSel === ms.dataset.mapSt ? null : ms.dataset.mapSt; render(); }
    const sg = e.target.closest('[data-sg-sort]');
    if (sg) { ui.sgSort = sg.dataset.sgSort; render(); }
  });

  window.addEventListener('hashchange', render);
  onToast(toast);
  onUpdate(() => { diffFeed(); render(); });
  setHouseFallbackList(Object.keys(HOUSE_META));

  const params = new URLSearchParams(location.search);
  const mode = params.has('demo') ? 'demo' : params.has('live') ? 'live' : store('en26-mode') || 'live';
  resetFeed();
  if (mode === 'demo') { startDemo(); } else startLive();
  if (mode === 'demo') $('#sim-speed').value = String(data.sim?.speed || 120);

  setInterval(tickClock, 1000);
  setInterval(() => { if (data.mode === 'live') render(); }, 30_000); // time-based states (tells, "now")
  tickClock();
  render();
}

init();
