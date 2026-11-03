import { data, onUpdate, startLive, startDemo, setMode, refreshNow, nowNight, setHouseFallbackList, feedHealth, FEEDS } from './api.js';
import { fmtClock, fmtDayLabel, fmtCountdown, ago, esc, store, fmtNightTime } from './util.js';
import { senateTally, houseTally, nightMiss, HOUSE_META } from './model.js';
import * as method from './views/method.js';
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
  method: { title: 'Methodology', view: method },
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
  const loaded = feedHealth().everLoaded;
  const v = (n) => (loaded ? n : '—');
  $('#ticker').innerHTML = `
    <a href="#/" class="tk" title="Senate seats secured: 34 D and 31 R holdovers not up in 2026, plus 2026 races called"><span class="lbl">Senate</span><b class="d">${v(s.securedD)}</b><span class="sep">–</span><b class="r">${v(s.securedR)}</b><small>secured incl. holdovers · ${v(s.calledD + s.calledR)} of ${s.up} races called</small></a>
    <a href="#/house" class="tk" title="House seats called by civicAPI"><span class="lbl">House</span><b class="d">${v(h.calledD)}</b><span class="sep">–</span><b class="r">${v(h.calledR)}</b><small>called · 218 to win</small></a>
    ${m.enough ? `<a href="#/house" class="tk" title="Median result minus DDHQ in mostly-counted forecast districts"><span class="lbl">Swing so far</span><b class="${m.miss >= 0 ? 'd' : 'r'}">${m.miss >= 0 ? 'D' : 'R'}+${Math.abs(m.miss).toFixed(1)}</b><small>${m.n} districts · scenario</small></a>` : ''}`;
}

let lastRoute = null;
function render() {
  pendingRender = false;
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

const HEALTH_TEXT = {
  live: ['ok', 'LIVE'], stale: ['warn', 'STALE'], offline: ['err', 'OFFLINE'], connecting: ['busy', 'CONNECTING'], demo: ['demo', 'REHEARSAL'],
};
function renderStatus() {
  const live = data.mode === 'live';
  const h = feedHealth();
  const [cls, word] = HEALTH_TEXT[h.state] || HEALTH_TEXT.connecting;
  const when = h.last ? `last update ${fmtClock(nightFromTs(h.last), { seconds: true })} (<span id="ago">${ago(h.last)}</span>)` : live ? 'waiting for first data…' : 'simulated returns';
  const detail = h.state === 'stale' ? (live ? ' · retrying' : ' · simulated outage') : h.state === 'offline' ? ' · retrying' : '';
  $('#status').innerHTML = `<button class="status-btn" data-health aria-expanded="${ui.healthOpen ? 'true' : 'false'}" title="Feed details">
    <span class="dot ${cls}" aria-hidden="true"></span><span class="st-txt"><b>${word}</b> <span class="muted">${when}${detail}</span></span></button>
    ${ui.healthOpen ? healthPanel() : ''}`;
  document.body.classList.toggle('is-demo', !live);
  document.body.classList.toggle('is-stale', h.state === 'stale' || h.state === 'offline');
  $('#mode-btn').textContent = live ? 'Rehearse the night' : 'Back to live';
  $('#mode-btn').classList.toggle('on', !live);
  $('#demo-bar').hidden = live;
  if (!live && data.sim) {
    const sl = $('#sim-t');
    if (document.activeElement !== sl) sl.value = Math.round(data.sim.t);
    $('#sim-label').textContent = `${fmtNightTime(Math.round(data.sim.t))} CT`;
    $('#sim-play').textContent = data.sim.playing ? 'Pause' : 'Play';
    $('#sim-err').textContent = `simulated miss vs DDHQ: ${data.sim.nationalErr >= 0 ? 'D' : 'R'}+${Math.abs(data.sim.nationalErr).toFixed(1)}`;
    $('#sim-scenario').value = data.simScenario || 'random';
  }
}
const nightFromTs = (ts) => (ts - Date.UTC(2026, 10, 3, 6)) / 60000;
function healthPanel() {
  if (data.mode === 'demo') return `<div class="health-pop" role="dialog" aria-label="Feed status"><p><b>Rehearsal mode.</b> Every number is simulated. Nothing is fetched from civicAPI until you go back to live.</p>${data.errors.general ? '<p class="warn">A simulated feed outage is under way: data has stopped updating.</p>' : ''}</div>`;
  return `<div class="health-pop" role="dialog" aria-label="Feed status"><p><b>civicAPI feeds</b> <span class="muted">(results provider; calls are civicAPI's)</span></p>
    <table class="mini-t"><tbody>${FEEDS.map(([k, label, every]) => {
      const ok = data.status[k];
      const err = data.errors[k];
      const age = ok ? Date.now() - ok : null;
      const st = err ? (ok ? 'retrying after error' : 'failing') : !ok ? (data.lastTry[k] ? 'loading' : 'not started yet') : age > every * 3000 ? 'stale' : 'ok';
      return `<tr><th>${esc(label)}<small>every ${every}s</small></th><td class="fh-${st.split(' ')[0]}">${st}</td><td>${ok ? ago(ok) : '—'}</td></tr>${err ? `<tr><td colspan="3" class="muted small">${esc(err)}</td></tr>` : ''}`;
    }).join('')}</tbody></table>
    <p class="small muted">County results are fetched only for states whose polls have closed. If a feed is stale, numbers on the page are the last good data, not current.</p></div>`;
}

function tickClock() {
  const t = nowNight();
  $('#clock').textContent = fmtClock(t, { seconds: data.mode === 'live' });
  $('#clock-day').textContent = `CT · ${fmtDayLabel(t)}`;
  document.querySelectorAll('[data-countdown]').forEach((el) => { el.textContent = fmtCountdown(Number(el.dataset.countdown) - t); });
  const a = $('#ago');
  const h = feedHealth();
  if (a && h.last) a.textContent = ago(h.last);
  if (!(tickClock.n = (tickClock.n || 0) + 1) % 10) renderStatus();
}

function toast(e) {
  const el = document.createElement('div');
  el.className = `toast side-${e.side}`;
  el.innerHTML = `${e.sim ? '<span class="simtag">SIMULATED</span>' : ''}<b>${esc(e.text)}</b>${e.sub ? `<small>${esc(e.sub)}</small>` : ''}`;
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

let pendingRender = false;
const isTyping = () => document.activeElement?.matches?.('input[type=search], input[type=text]') && document.activeElement.value !== '';
function setUi(k, v) {
  if (k.startsWith('benchOffice.')) ui.benchOffice[k.split('.')[1]] = v;
  else ui[k] = v;
}
function renderKeepFocus(input) {
  const pos = input.selectionStart;
  const sel = input.matches('[data-house-query]') ? '[data-house-query]' : null;
  render();
  const again = sel && document.querySelector(sel);
  if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch { /* ignore */ } }
}

function init() {
  applyTheme(store('en26-theme'));
  $('#theme-btn').onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    store('en26-theme', next);
    applyTheme(next);
  };
  $('#refresh-btn').onclick = async () => {
    const b = $('#refresh-btn');
    if (b.disabled) return;
    b.disabled = true; b.classList.add('spin'); b.setAttribute('aria-busy', 'true');
    const r = await refreshNow();
    b.disabled = false; b.classList.remove('spin'); b.removeAttribute('aria-busy');
    toast(r.ok ? { side: 'n', text: r.sim ? 'Rehearsal refreshed' : `Refreshed at ${fmtClock(nightFromTs(r.at), { seconds: true })} CT`, sub: '' }
      : { side: 'r', text: 'Refresh failed: civicAPI did not respond', sub: Object.values(r.errors || {})[0] || 'Showing the last good data. Retrying automatically.' });
    renderStatus();
  };
  $('#mode-btn').onclick = () => {
    const next = data.mode === 'live' ? 'demo' : 'live';
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    ui.healthOpen = false;
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
  $('#sim-scenario').onchange = (e) => { const t = data.sim?.t; data.simScenario = e.target.value; startDemo({ scenario: e.target.value, start: t }); resetFeed(); };

  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-house-filter]');
    if (f) { ui.houseFilter = f.dataset.houseFilter; render(); }
    const mo = e.target.closest('[data-map-office]');
    if (mo) { ui.mapOffice = mo.dataset.mapOffice; render(); }
    const ms = e.target.closest('[data-map-st]');
    if (ms) { ui.mapSel = ui.mapSel === ms.dataset.mapSt ? null : ms.dataset.mapSt; render(); }
    const sg = e.target.closest('[data-sg-sort]');
    if (sg) { ui.sgSort = sg.dataset.sgSort; render(); }
    const hb = e.target.closest('[data-health]');
    if (hb) { ui.healthOpen = !ui.healthOpen; renderStatus(); }
    else if (ui.healthOpen && !e.target.closest('.health-pop')) { ui.healthOpen = false; renderStatus(); }
    const so = e.target.closest('[data-set]');
    if (so) { const [k, v] = so.dataset.set.split('='); setUi(k, v); render(); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-house-query]')) { ui.houseQuery = t.value; renderKeepFocus(t); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-house-state]')) { ui.houseState = t.value; render(); }
    if (t.matches('[data-ui]')) { setUi(t.dataset.ui, t.value); render(); }
    if (t.matches('[data-state-jump]') && t.value) location.hash = `#/states/${t.value}`;
  });
  // remember expanded <details data-key> across live re-renders
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.tagName === 'DETAILS' && d.dataset.key) { if (d.open) ui.open.add(d.dataset.key); else ui.open.delete(d.dataset.key); }
  }, true);
  document.addEventListener('focusout', () => { setTimeout(() => { if (pendingRender && !isTyping()) render(); }, 0); });
  document.addEventListener('pointerdown', (e) => { if (e.target.matches('input[type=range]')) ui.dragging = true; });
  document.addEventListener('pointerup', () => { if (ui.dragging) { ui.dragging = false; if (pendingRender) render(); } });
  // keyboard activation for map states and other role=button SVG elements
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-map-st]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });

  window.addEventListener('hashchange', render);
  onToast(toast);
  onUpdate(() => { diffFeed(); if (ui.dragging || isTyping()) { pendingRender = true; renderTicker(); renderStatus(); return; } render(); });
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
