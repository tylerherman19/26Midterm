// Browser tests. Run with a local server on :8765 (python3 -m http.server 8765) then: node tests/ui.test.cjs
const { chromium } = require('playwright');
const results = [];
const check = (name, cond, info = '') => { results.push(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ' :: ' + info : ''}`); };
const BASE = process.env.BASE || 'http://localhost:8765';

(async () => {
  const b = await chromium.launch();
  const shows = (loc) => loc.first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);

  // 1. Live, real civicAPI, before returns
  {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${BASE}/?live#/house`);
    await p.waitForFunction(() => /LIVE|STALE|OFFLINE/.test(document.querySelector('#status').innerText), null, { timeout: 90000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const st = await p.innerText('#status');
    check('live: status shows LIVE after results load', /LIVE/.test(st), st.replace(/\n/g, ' '));
    check('live: swing estimate waits (no returns)', /Waiting/.test(await p.innerText('.st-est')));
    const calls = await p.innerText('.st-calls');
    check('live: called counts are real numbers once loaded (not dashes)', /Democrats called\s*\d+/i.test(calls) && /Republicans called\s*\d+/i.test(calls), calls.replace(/\n/g, ' ').slice(0, 80));
    const tk = await p.innerText('#ticker');
    check('live: Senate ticker says secured incl. holdovers', /secured incl\. holdovers/i.test(tk), tk.replace(/\n/g, ' ').slice(0, 90));
    await p.click('#refresh-btn');
    await p.waitForSelector('.toast', { timeout: 60000 });
    const tt = await p.innerText('.toast');
    check('live: manual refresh gives feedback', /Refreshed|No feeds refreshed|Refresh failed/.test(tt), tt.replace(/\n/g, ' '));
    await p.click('[data-health]'); await p.waitForTimeout(300);
    const hp = await p.innerText('.health-pop');
    check('live: feed panel lists each feed', /House, Senate and national tallies/.test(hp));
    await ctx.route('**/civicapi.org/**', (r) => r.abort()); await ctx.route('**/static01.nyt.com/**', (r) => r.abort()); // freeze the feed so a background poll can't refresh the aged timestamps
    await p.evaluate(async () => { const m = await import(new URL('js/api.js', document.baseURI).href); const old = Date.now() - 200000; m.data.status.general = old; m.data.status.statewide = old; m.data.status.nyt = old; m.data.status.general = m.data.status.general; });
    await p.click('body', { position: { x: 5, y: 600 } });
    await p.waitForTimeout(1500);
    check('live: old data shows STALE, not LIVE', /STALE/.test(await p.innerText('#status')), (await p.innerText('#status')).replace(/\n/g, ' '));
    await p.evaluate(async () => { const m = await import(new URL('js/api.js', document.baseURI).href); m.data.status.general = Date.now(); });
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
    await ctx.route('**/civicapi.org/**', (r) => r.abort()); await ctx.route('**/static01.nyt.com/**', (r) => r.abort());
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

  // House scale: no illustrative race markers, no rehearsal
  {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
    await ctx.route('**/civicapi.org/**', (r) => r.abort()); await ctx.route('**/static01.nyt.com/**', (r) => r.abort());
    const p = await ctx.newPage();
    await p.goto(`${BASE}/#/house`); await p.waitForSelector('.ns-bar');
    check('House centerpiece keeps the majority scale', /218 majority/.test(await p.innerText('.ns-bar')));
    check('House scale has no illustrative race markers', (await p.locator('.ns .pin').count()) === 0);
    check('no rehearsal controls', (await p.locator('#mode-btn, #demo-bar, .simtag').count()) === 0);
    await ctx.close();
  }
  // Wisconsin legislature results center: maps for both chambers and a full results table
  {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
    await ctx.route('**/civicapi.org/**', (r) => r.abort()); await ctx.route('**/static01.nyt.com/**', (r) => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${BASE}/#/legislatures`); await p.waitForSelector('#wi-assembly');
    check('WI: Senate map has all 33 districts', (await p.locator('#wi-senate .wi-main path').count()) === 33);
    check('WI: Assembly map has all 99 districts', (await p.locator('#wi-assembly .wi-main path').count()) === 99);
    check('WI: Senate table lists the 17 seats on the ballot', (await p.locator('#wi-senate .wi-res tbody tr').count()) === 17);
    check('WI: Assembly table lists all 99 seats', (await p.locator('#wi-assembly .wi-res tbody tr').count()) === 99);
    await p.click('#wi-assembly button.linkish[data-set="wiSel=AD-88"]');
    check('WI: picking a district opens its detail', /AD-88/.test(await p.innerText('#wi-assembly .wi-detail')));
    check('WI: no JS errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  // Responsive navigation and layout with the feed blocked (deterministic, no network).
  for (const width of [375, 1400]) {
    const ctx = await b.newContext({ viewport: { width, height: 850 } });
    await ctx.route('**/civicapi.org/**', (r) => r.abort()); await ctx.route('**/static01.nyt.com/**', (r) => r.abort());
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${BASE}/#/`);
    const mobile = width < 720;
    check(`${width}px: Overview map visible`, await p.locator('.maps').isVisible());
    check(`${width}px: correct navigation visible`, await p.locator(mobile ? '.mobile-tabs' : '.desktop-tabs').isVisible());
    if (mobile) {
      await p.locator('.mobile-tabs').getByRole('link', { name: 'House', exact: true }).click();
      await p.locator('.mobile-subnav').getByRole('link', { name: 'Early House' }).click();
      check('mobile: Early House list visible', await shows(p.locator('.early-race')));
    } else {
      await p.locator('.desktop-tabs').getByRole('link', { name: 'First House races' }).click();
      check('desktop: detailed Early House chart visible', await shows(p.locator('.sg-grid')));
    }
    await p.goto(`${BASE}/#/states/GA`);
    const picker = p.locator('[data-state-jump]');
    await p.locator('#ns-wrap, .state-page').first().waitFor();
    await picker.selectOption('TX');
    await p.waitForURL('**/#/states/TX');
    await p.waitForSelector('.state-h h2:text-is("Texas")');
    check(`${width}px: no JS errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(results.join('\n'));
  if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
})();
