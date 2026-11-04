import assert from 'node:assert/strict';
import { data, feedHealth, refreshNow, setHouseFallbackList } from '../js/api.js';
import { RACE_IDS } from '../js/data/raceIds.js';

globalThis.requestAnimationFrame = (callback) => callback();
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const id = RACE_IDS.house['IN-06'];
const race = (id, percent_reporting) => ({ id, percent_reporting, candidates: [] });
let general = { races: [race(id, 5)] };
let district = race(id, 15);
let attempts = [];
globalThis.fetch = async (url) => {
  attempts.push(url);
  const body = url.includes('election_type=General') ? general
    : url.includes('election_type=Statewide') ? { races: [race(RACE_IDS.governor.GA, 5)] }
    : url.endsWith('/' + id) ? district : null;
  return { ok: body !== null, status: body ? 200 : 502, text: async () => JSON.stringify(body || {}) };
};

setHouseFallbackList(() => ({ focus: ['IN-06'], watch: ['IN-05'] }));
assert.equal((await refreshNow()).general, true);
const lastGood = data.status.general;
assert.equal(data.races.get(id).percent_reporting, 5);

general = {};
attempts = [];
const [first, second] = await Promise.all([refreshNow(), refreshNow()]);
assert.deepEqual(first, second);
assert.equal(attempts.filter((url) => url.includes('election_type=General')).length, 1);
assert.equal(attempts.filter((url) => url.includes('election_type=Statewide')).length, 1);
assert.equal(attempts.filter((url) => url.endsWith('/' + id)).length, 1);
assert.equal(first.general, false);
assert.equal(first.statewide, true);
assert.equal(first.recovered, 1);
assert.equal(feedHealth().state, 'stale');
assert.equal(data.status.general, lastGood);
assert.equal(data.races.get(id).percent_reporting, 15);

district = null;
assert.equal((await refreshNow()).recovered, 0);
assert.equal(data.races.get(id).percent_reporting, 15);

general = { races: [race(id, 20)] };
assert.equal((await refreshNow()).general, true);
assert.equal(feedHealth().state, 'live');
assert.equal(data.races.get(id).percent_reporting, 20);
