// Browser tests. Run with a local server on :8765 (python3 -m http.server 8765) then: node tests/ui.test.cjs
const { chromium } = require('playwright');
const results = [];
const check = (name, cond, info = '') => { results.push(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ' :: ' + info : ''}`); };
const BASE = process.env.BASE || 'http://localhost:8765';

(async () => {
  const b = await chromium.launch();

  // 1. Live, real civicAPI, before returns
  {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${BASE}/?live#/house`);
    await p.waitForFunction(() => /LIVE|STALE|OFFLINE/.test(document.querySelector('#status').innerText), null, { timeout: 90000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const st = await p.innerText('#status');
    check('live: status shows LIVE after civicAPI load', /LIVE/.test(st), st.replace(/\n/g, ' '));
    check('live: swing estimate waits (no returns)', /Waiting/.test(await p.innerText('.st-est')));
    const calls = await p.innerText('.st-calls');
    check('live: called counts are real zeros once loaded', /Democrats called\s*0/i.test(calls), calls.replace(/\n/g, ' ').slice(0, 80));
    const tk = await p.innerText('#ticker');
    check('live: Senate ticker says secured incl. holdovers', /secured incl\. holdovers/i.test(tk), tk.replace(/\n/g, ' ').slice(0, 90));
    await p.click('#refresh-btn');
    await p.waitForSelector('.toast', { timeout: 60000 });
    const tt = await p.innerText('.toast');
    check('live: manual refresh gives feedback', /Refreshed at|Refresh failed/.test(tt), tt.replace(/\n/g, ' '));
    await p.click('[data-health]'); await p.waitForTimeout(300);
    const hp = await p.innerText('.health-pop');
    check('live: feed panel lists each feed', /House, Senate and national tallies/.test(hp));
    await p.evaluate(async () => { const m = await import('/js/api.js'); m.data.status.general -= 200000; m.data.status.statewide -= 200000; m.data.status.general = m.data.status.general; });
    await p.click('body', { position: { x: 5, y: 600 } });
    await p.waitForTimeout(1500);
    check('live: old data shows STALE, not LIVE', /STALE/.test(await p.innerText('#status')), (await p.innerText('#status')).replace(/\n/g, ' '));
    await p.evaluate(async () => { const m = await import('/js/api.js'); m.data.status.general = Date.now(); });
    await p.fill('[data-house-query]', 'Luria'); await p.waitForTimeout(400);
    const rows = await p.$$eval('#watchlist details.wl-row', (x) => x.length);
    check('house: search filters watchlist', rows === 1, `${rows} rows`);
    check('house: search keeps focus while typing', await p.evaluate(() => document.activeElement?.matches('[data-house-query]')));
    check('live: no JS errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // 2. Feed blocked
  {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
    await ctx.route('**/civicapi.org/**', (r) => r.abort());
    const p = await ctx.newPage();
    await p.goto(`${BASE}/?live#/house`); await p.waitForTimeout(6000);
    const st = await p.innerText('#status');
    check('blocked feed: header is not LIVE', !/LIVE/.test(st), st.replace(/\n/g, ' '));
    const calls = await p.innerText('.st-calls');
    check('blocked feed: counts show a dash, not fake zeros', /Democrats called\s*—/i.test(calls), calls.replace(/\n/g, ' ').slice(0, 60));
    await p.evaluate(() => { location.hash = '#/states/GA'; }); await p.waitForTimeout(500);
    const pill = await p.innerText('.race-block .pill');
    check('blocked feed: race pill says Loading, not No votes', /Loading|unavailable/i.test(pill), pill);
    await ctx.close();
  }

  // 3. Rehearsal
  {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${BASE}/?demo#/house`); await p.waitForTimeout(1200);
    const setT = (t) => p.evaluate((t) => { const s = document.querySelector('#sim-t'); s.value = t; s.dispatchEvent(new Event('input')); }, t);
    const pause = () => p.evaluate(() => { const pl = document.querySelector('#sim-play'); if (pl.textContent === 'Pause') pl.click(); });
    await pause();
    check('demo: REHEARSAL in header', /REHEARSAL/.test(await p.innerText('#status')));
    await setT(1125); await p.waitForTimeout(600);
    check('demo: SIM tags on simulated races', (await p.$$('.simtag')).length > 5);
    for (const [val, sign] of [['dem', 1], ['gop', -1]]) {
      await p.selectOption('#sim-scenario', val); await p.waitForTimeout(500); await pause();
      await setT(1500); await p.waitForTimeout(900);
      const txt = await p.innerText('.st-est');
      const m = txt.match(/([DR])\+([\d.]+)\s*\n?\s*median/);
      const v = m ? (m[1] === 'D' ? 1 : -1) * Number(m[2]) : null;
      check(`demo ${val}: swing estimate has expected sign`, v !== null && Math.sign(v) === sign, txt.replace(/\n/g, ' ').slice(0, 140));
    }
    await p.selectOption('#sim-scenario', 'slow'); await p.waitForTimeout(500); await pause();
    await setT(1290); await p.waitForTimeout(800);
    const slowTxt = await p.innerText('.st-leads');
    check('demo slow: more races still without votes', /no votes yet \d+/.test(slowTxt), slowTxt.replace(/\n/g, ' '));
    await p.selectOption('#sim-scenario', 'interrupt'); await p.waitForTimeout(500); await pause();
    await setT(1240); await p.waitForTimeout(900);
    check('demo interrupt: STALE during outage', /STALE/.test(await p.innerText('#status')), (await p.innerText('#status')).replace(/\n/g, ' '));
    await setT(1300); await p.waitForTimeout(900);
    check('demo interrupt: recovers after outage', /REHEARSAL/.test(await p.innerText('#status')));
    await p.click('[data-night-shift="3"]'); await p.waitForTimeout(200);
    check('explorer: D+3 preset gives 238 seats (engine)', /D\+3\s*238/.test(await p.innerText('#ex-out')), (await p.innerText('#ex-out')).slice(0, 40).replace(/\n/g, ' '));
    await p.focus('[data-night-slider]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
    check('explorer: slider works by keyboard', /D\+3\.5/.test(await p.innerText('#ex-out')));
    const tk = await p.innerText('#ticker'); const cp = await p.innerText('.st-calls');
    const tD = Number((tk.match(/House\s*(\d+)/i) || [])[1]); const cD = Number((cp.match(/Democrats called\s*(\d+)/i) || [])[1]);
    check('consistency: House D called same in ticker and centerpiece', tD === cD, `${tD} vs ${cD}`);
    await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(500);
    const ov = await p.innerText('.night .st-calls');
    check('consistency: overview centerpiece matches House tab', Number((ov.match(/Democrats called\s*(\d+)/i) || [])[1]) === cD);
    await p.focus('[data-map-st="GA"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    check('map: Enter on focused state shows its detail', /Georgia Senate/.test(await p.innerText('.maps')));
    await p.evaluate(() => { location.hash = '#/house'; }); await p.waitForTimeout(400);
    await p.click('.ex-race summary');
    await p.evaluate(async () => { (await import('/js/api.js')).data.sim.tick(); }); await p.waitForTimeout(600);
    check('race marker detail stays open across re-render', await p.$eval('.ex-race', (d) => d.open));
    await p.evaluate(() => { location.hash = '#/signals'; }); await p.waitForTimeout(400);
    await p.click('[data-sg-sort="miss"]'); await p.waitForTimeout(300);
    check('signals: active sort is marked', await p.$eval('[data-sg-sort="miss"]', (x) => x.getAttribute('aria-pressed') === 'true'));
    await p.click('#mode-btn'); await p.waitForTimeout(2500);
    const st = await p.innerText('#status');
    check('back to live: leaves rehearsal and drops SIM tags', !/REHEARSAL/.test(st) && !(await p.$('.simtag')), st.replace(/\n/g, ' '));
    check('demo: no JS errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(results.join('\n'));
  if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
})();
