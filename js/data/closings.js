// Poll-closing times: the single source of truth for every tab.
// Source: The Green Papers, "2026 General Election Polling Hours" (thegreenpapers.com/G26/PollingHours.phtml),
// checked Nov 3, 2026, cross-checked against the Election Night Guide. All times converted to Central
// Standard Time (UTC-6). "most" = when polls serving most voters close; "all" = when the last polls close.
// Times are "HH:MM" on election night; 24:00 = midnight.

export const CLOSE_SOURCE = {
  name: 'The Green Papers, 2026 General Election Polling Hours',
  url: 'https://www.thegreenpapers.com/G26/PollingHours.phtml',
  checked: 'Nov 3, 2026',
};

const one = (t) => ({ most: t, all: t });
export const STATE_CLOSE = {
  AL: one('19:00'), AZ: one('20:00'), AR: one('19:30'), CA: one('22:00'), CO: one('20:00'), CT: one('19:00'),
  DE: one('19:00'), GA: one('18:00'), HI: one('23:00'), IL: one('19:00'), IA: one('20:00'), LA: one('20:00'),
  ME: one('19:00'), MD: one('19:00'), MA: one('19:00'), MN: one('20:00'), MS: one('19:00'), MO: one('19:00'),
  MT: one('21:00'), NE: { ...one('20:00'), note: 'Eastern (Central Time) and western (Mountain Time) Nebraska close at the same moment.' },
  NV: one('21:00'), NJ: one('19:00'), NM: one('20:00'), NY: one('20:00'), NC: one('18:30'), OH: one('18:30'),
  OK: one('19:00'), OR: one('22:00'), PA: one('19:00'), RI: one('19:00'), SC: one('18:00'), UT: one('21:00'),
  VT: one('18:00'), VA: one('18:00'), WA: one('22:00'), WV: one('18:30'), WI: one('20:00'), WY: one('20:00'),
  TN: { ...one('19:00'), note: 'Eastern and Central Tennessee close at the same moment.' },
  KY: { most: '17:00', all: '18:00', note: 'Eastern Time Kentucky, including Louisville and Lexington, closes at 5 PM CT; the Central Time west closes at 6 PM.' },
  IN: { most: '17:00', all: '18:00', note: 'Most of Indiana is on Eastern Time and closes at 5 PM CT; northwest and southwest counties close at 6 PM.' },
  FL: { most: '18:00', all: '19:00', note: 'Most of Florida closes at 6 PM CT; the western Panhandle (Central Time) closes at 7 PM.' },
  NH: { most: '18:00', all: '19:00', note: 'Most New Hampshire polls close at 6 PM CT; some cities stay open until 7 PM.' },
  MI: { most: '19:00', all: '20:00', note: 'Most of Michigan closes at 7 PM CT; four western Upper Peninsula counties (Central Time) close at 8 PM.' },
  TX: { most: '19:00', all: '20:00', note: 'Most of Texas closes at 7 PM CT; El Paso and Hudspeth counties (Mountain Time) close at 8 PM.' },
  KS: { most: '19:00', all: '20:00', note: 'Most of Kansas closes at 7 PM CT; four western counties (Mountain Time) close at 8 PM.' },
  SD: { most: '19:00', all: '20:00', note: 'Eastern South Dakota closes at 7 PM CT; the Mountain Time west at 8 PM.' },
  ND: { most: '21:00', all: '22:00', note: 'North Dakota precincts close between 7 and 9 PM local time; the Mountain Time west is last.' },
  ID: { most: '21:00', all: '22:00', note: 'Most of Idaho closes at 9 PM CT; the Pacific Time north closes at 10 PM.' },
  AK: { most: '23:00', all: '24:00', note: 'Most of Alaska closes at 11 PM CT; the western Aleutians close at midnight.' },
};

// District-level overrides for House seats in split-time-zone states. Every other district inherits its
// state's "most" time (single-zone states have most = all).
export const DISTRICT_CLOSE = {
  'KY-06': { ...one('17:00'), note: 'Lexington area, Eastern Time.' },
  'IN-05': { ...one('17:00'), note: 'Indianapolis suburbs, Eastern Time.' },
  'IN-01': { ...one('18:00'), note: 'Northwest Indiana, Central Time.' },
  'FL-01': { ...one('19:00'), note: 'Western Panhandle, Central Time.' },
  'FL-02': { most: '18:00', all: '19:00', note: 'Tallahassee (Eastern Time) plus Central Time Panhandle counties.' },
  'TX-23': { most: '19:00', all: '20:00', note: 'Includes parts of El Paso County and Hudspeth County (Mountain Time), so the last polls close at 8 PM.' },
  'TX-16': { ...one('20:00'), note: 'El Paso, Mountain Time.' },
  'KY-01': { ...one('18:00'), note: 'Western Kentucky, Central Time.' },
  'KY-02': { most: '18:00', all: '18:00', note: 'Mostly Central Time.' },
  'IN-08': { ...one('18:00'), note: 'Southwest Indiana, Central Time.' },
  'MI-01': { most: '19:00', all: '20:00', note: 'Four western Upper Peninsula counties are on Central Time.' },
  'AK-AL': { most: '23:00', all: '24:00', note: 'Most of Alaska closes at 11 PM CT; the western Aleutians at midnight.' },
};

export function stateClose(st) {
  return STATE_CLOSE[st] || one('19:00');
}
export function districtClose(dist) {
  if (DISTRICT_CLOSE[dist]) return DISTRICT_CLOSE[dist];
  const s = stateClose(dist.slice(0, 2));
  return { most: s.most, all: s.most, inherited: true };
}

export const CALL_NOTE = 'Race calls generally wait until every poll in the race has closed. Statewide races are usually called no earlier than the last close in the state; a House race can be called once its own district has closed. Some counties post results as soon as their own polls close.';
