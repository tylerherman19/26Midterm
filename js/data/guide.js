// Election Night Guide 2026 — transcribed from the 32-page PDF guide.
// Margin convention everywhere: positive = Democratic (or Osborn in NE), negative = Republican.
// Times are Central Time, "HH:MM" 24h on election night; values >= 24:00 roll past midnight.

export const ELECTION_DATE = '2026-11-03';

// ---------- Statewide races (Senate + Governor) ----------
// counties: [name, share%, m2024, toTie, inBy, tag]
// toTie = county margin consistent with an even statewide race (the guide's uniform-swing target).
export const STATES = {
  KY: {
    name: 'Kentucky', close: '18:00', closeNote: 'Polls close 6:00 PM CT (most 5:00 PM)', firstClose: '17:00',
    pres2024: -31,
    races: [{ office: 'senate', d: 'Booker', r: 'Barr', open: true, forecast: -16, winProb: 6 }],
    countiesNote: '8 counties cast 39% of the vote.',
    counties: [
      ['Jefferson', 17, 17, 48, '8 PM'], ['Fayette', 7, 18, 49, '8 PM'], ['Kenton', 4, -22, 9, '11 PM'],
      ['Boone', 3, -37, -9, '8 PM'], ['Warren', 3, -24, 14, '9 PM'], ['Campbell', 2, -20, 10, '7 PM'],
      ['Madison', 2, -31, 2, '8 PM', 'bellwether'], ['Boyd', 1, -39, -5, '8 PM', 'swing'],
    ],
    pace: { '19': 37, '20': 75, '21': 94, '22': 99, '23': 99, '24': 99 },
    countNote: 'Fast.',
  },
  GA: {
    name: 'Georgia', close: '18:00', closeNote: 'Polls close 6:00 PM CT', pres2024: -2,
    races: [
      { office: 'senate', d: 'Ossoff', r: 'Collins', inc: 'd', forecast: 11, winProb: 89 },
      { office: 'governor', d: 'Bottoms', r: 'Jackson', open: true, forecast: 4, winProb: 60 },
    ],
    countiesNote: '8 counties cast 42% of the vote. County targets are set to the Senate race (the governor race differs by up to 3 pts).',
    counties: [
      ['Fulton', 10, 45, 46, '10 PM'], ['Gwinnett', 8, 17, 21, '12 AM', 'late'], ['Cobb', 8, 15, 17, '10 PM'],
      ['DeKalb', 7, 65, 64, '10 PM'], ['Cherokee', 3, -39, -37, '9 PM'], ['Chatham', 3, 18, 21, '1 AM', 'late'],
      ['Fayette', 1, -3, -3, '9 PM', 'bellwether'], ['Henry', 2, 30, 28, '12 AM', 'swing · late'],
    ],
    pace: { '19': 31, '20': 65, '21': 76, '22': 92, '23': 95, '24': 98 },
    countOrder: 'Count order (2024, CT): Fayette, Clayton and Cherokee were 90% counted by 9 PM; DeKalb by 10 PM; Gwinnett and Henry by 12 AM; Chatham by 1 AM.',
    countNote: 'Fast; early and mail votes come first; later votes leaned Republican in 2022.',
    howItLooks: {
      title: 'How the governor count could look',
      steps: [
        ['Poll close', 'Starts Republican: small Republican counties post first while Atlanta-area counties report slowly.'],
        ['Evening', 'Republican lead narrows as Fulton and Gwinnett report.'],
        ['10 PM CT', 'Close to even as the metro vote catches up.'],
        ['Late', 'Last Election Day returns come from Democratic urban precincts, so a narrow late Republican lead may not hold.'],
      ],
    },
  },
  SC: {
    name: 'South Carolina', close: '18:00', closeNote: 'Polls close 6:00 PM CT', pres2024: -18,
    races: [
      { office: 'senate', d: 'Andrews', r: 'Graham', inc: 'r', forecast: -2, winProb: 38 },
      { office: 'governor', d: 'Johnson', r: 'Wilson', open: true, forecast: -9, winProb: 26 },
    ],
    countiesNote: '8 counties cast 52% of the vote. Targets set to the Senate race.',
    counties: [
      ['Greenville', 10, -22, -5, '11 PM'], ['Charleston', 8, 6, 27, '10 PM'], ['Horry', 8, -39, -21, 'after 1 AM'],
      ['Richland', 7, 35, 49, '1 AM'], ['Spartanburg', 6, -34, -15, '9 PM'], ['York', 6, -19, -4, '11 PM', "Ralph Norman's home"],
      ['Berkeley', 4, -16, 2, '9 PM', 'bellwether'], ['Orangeburg', 1, 25, 46, '9 PM', 'swing'],
    ],
    pace: { '19': 11, '20': 52, '21': 75, '22': 87, '23': 95, '24': 95 },
    countNote: 'Medium pace.',
  },
  VT: {
    name: 'Vermont', close: '18:00', closeNote: 'Polls close 6:00 PM CT', pres2024: 32,
    races: [{ office: 'governor', d: 'Janoo', r: 'Scott', inc: 'r', forecast: -20, winProb: 7 }],
    countiesNote: '5 counties cast 62% of the vote.',
    counties: [
      ['Chittenden', 26, 54, 33, '10 PM'], ['Washington', 10, 43, 14, '10 PM'], ['Windsor', 9, 36, 2, '10 PM'],
      ['Rutland', 9, 5, -34, '9 PM'], ['Franklin', 7, 3, -39, '10 PM', 'swing'],
    ],
    pace: { '19': 21, '20': 59, '21': 79, '22': 91, '23': 95, '24': 97 },
    countNote: 'Fast.',
  },
  NC: {
    name: 'North Carolina', close: '18:30', closeNote: 'Polls close 6:30 PM CT', pres2024: -3,
    races: [{ office: 'senate', d: 'Cooper', r: 'Whatley', open: true, forecast: 9, winProb: 85 }],
    countiesNote: '8 counties cast 40% of the vote.',
    counties: [
      ['Wake', 11, 26, 28, '11 PM', 'late'], ['Mecklenburg', 10, 33, 36, '10 PM'], ['Guilford', 5, 22, 25, '12 AM', 'late'],
      ['Forsyth', 4, 13, 16, '11 PM', 'late'], ['Durham', 3, 62, 59, '10 PM'], ['Buncombe', 3, 25, 23, '9 PM'],
      ['Onslow', 1, -36, -28, '9 PM', 'swing'], ['Union', 2, -25, -21, '8 PM', 'early'],
    ],
    pace: { '19': 4, '20': 38, '21': 55, '22': 87, '23': 91, '24': 96 },
    countOrder: 'Count order (2024, CT): Pitt, Union and Catawba were 90% counted by 8 PM; Mecklenburg by 10 PM; Wake by 11 PM; Guilford by 12 AM.',
    countNote: 'Fast; early and mail votes come first; later votes leaned Republican in 2022.',
  },
  OH: {
    name: 'Ohio', close: '18:30', closeNote: 'Polls close 6:30 PM CT · check your state', pres2024: -11,
    races: [
      { office: 'senate', d: 'Brown', r: 'Husted', inc: 'r', forecast: 0, winProb: 56 },
      { office: 'governor', d: 'Acton', r: 'Ramaswamy', open: true, forecast: 3, winProb: 61 },
    ],
    countiesNote: '8 counties cast 43% of the vote. Targets set to the Senate race.',
    counties: [
      ['Franklin', 10, 28, 40, '10 PM'], ['Cuyahoga', 10, 31, 42, '11 PM', 'late'], ['Hamilton', 7, 15, 25, '11 PM', 'late'],
      ['Summit', 5, 7, 19, 'after 1 AM', 'late'], ['Montgomery', 4, 0, 12, '10 PM'], ['Lucas', 3, 13, 26, '10 PM'],
      ['Wood', 1, -10, 2, '10 PM', 'bellwether'], ['Mahoning', 2, -9, 8, '10 PM', 'swing'],
    ],
    pace: { '19': 23, '20': 49, '21': 63, '22': 90, '23': 96, '24': 98 },
    countOrder: 'Count order (2024, CT): Allen and Warren were 90% counted by 9 PM; Franklin and Lucas by 10 PM; Cuyahoga and Hamilton by 11 PM.',
    countNote: 'Fast; early and mail votes come first; later votes leaned Republican in 2022.',
    howItLooks: {
      title: 'How the Senate count could look',
      steps: [
        ['Poll close', 'Blue start: early and absentee votes report first and lean Democratic, so Brown can open well ahead.'],
        ['Midnight CT', 'Husted about +0.9 as rural Election Day precincts report.'],
        ['Late', 'Columbus and Cleveland Election Day votes come in last and help Brown; provisionals after Election Day.'],
        ['Pattern', 'Early blue mirage, then a smaller late red one.'],
      ],
    },
  },
  FL: {
    name: 'Florida', close: '19:00', firstClose: '18:00', closeNote: 'Polls close 7:00 PM CT (most 6:00 PM)', pres2024: -13,
    races: [
      { office: 'senate', d: 'Nixon', r: 'Moody', inc: 'r', forecast: -6, winProb: 24 },
      { office: 'governor', d: 'Jolly', r: 'Donalds', open: true, forecast: -4, winProb: 38 },
    ],
    countiesNote: '7 counties cast 43% of the vote. Targets set to the Senate race (governor differs by up to 1 pt).',
    counties: [
      ['Miami-Dade', 10, -11, 4, '8 PM'], ['Broward', 8, 17, 32, '8 PM'], ['Palm Beach', 7, 1, 15, '7 PM'],
      ['Hillsborough', 6, -3, 11, '7 PM'], ['Orange', 6, 14, 27, '8 PM'], ['Pinellas', 5, -5, 7, '7 PM'],
      ['Osceola', 2, -1, 14, '7 PM', 'swing'],
    ],
    pace: { '19': 83, '20': 96, '21': 98, '22': 98, '23': 99, '24': 99 },
    countNote: 'Fast; early and mail votes come first; later votes leaned Republican.',
  },
  ME: {
    name: 'Maine', close: '19:00', closeNote: 'Polls close 7:00 PM CT', pres2024: 7,
    races: [{ office: 'senate', d: 'Jackson', r: 'Collins', inc: 'r', forecast: 2, winProb: 62 }],
    countiesNote: '4 counties cast 55% of the vote. Collins 2020: Cumberland D+16.9, York R+4.9, Penobscot R+26, Aroostook R+40.1; statewide R+8.6.',
    counties: [
      ['Cumberland', 24, 36, 30, 'after 1 AM'], ['York', 16, 10, 3, 'after 1 AM'],
      ['Penobscot', 10, -11, -18, 'after 1 AM'], ['Aroostook', 4, -26, -34, 'after 1 AM', 'swing'],
    ],
    pace: { '19': 0, '20': 1, '21': 2, '22': 18, '23': 30, '24': 52, '25': 63 },
    countNote: 'Slow. Ranked-choice rounds can take days.',
  },
  NH: {
    name: 'New Hampshire', close: '19:00', closeNote: 'Polls close 7:00 PM CT · check your state', pres2024: 3,
    races: [{ office: 'senate', d: 'Pappas', r: 'Sununu', open: true, forecast: 10, winProb: 86 }],
    countiesNote: '4 counties cast 66% of the vote.',
    counties: [
      ['Hillsborough', 28, 3, 0, 'after 1 AM'], ['Rockingham', 25, -2, -5, '12 AM'],
      ['Merrimack', 11, 5, 2, '1 AM'], ['Coos', 2, -14, -16, '1 AM', 'swing'],
    ],
    pace: { '19': 12, '20': 31, '21': 47, '22': 61, '23': 73, '24': 86, '25': 88 },
    countNote: 'Medium pace.',
  },
  RI: {
    name: 'Rhode Island', close: '19:00', closeNote: 'Polls close 7:00 PM CT', pres2024: 14,
    races: [{ office: 'governor', d: 'Foulkes', r: 'Guckian', open: true, forecast: 24, winProb: 96 }],
    countiesNote: '4 counties cast 94% of the vote.',
    counties: [
      ['Providence', 53, 14, 3, 'n/a'], ['Kent', 18, 2, -13, 'n/a'],
      ['Washington', 15, 15, -2, 'n/a'], ['Newport', 9, 25, 7, 'n/a', 'swing'],
    ],
    pace: null,
    countNote: 'Medium pace; about 52% in by 11 PM CT in 2020; mail is counted late.',
  },
  TX: {
    name: 'Texas', close: '20:00', firstClose: '19:00', closeNote: 'Polls close 8:00 PM CT (most 7:00 PM)', pres2024: -14,
    races: [
      { office: 'senate', d: 'Talarico', r: 'Paxton', open: true, forecast: 1, winProb: 59 },
      { office: 'governor', d: 'Hinojosa', r: 'Abbott', inc: 'r', forecast: -7, winProb: 30 },
    ],
    countiesNote: '8 counties cast 51% of the vote. Targets set to the Senate race (governor differs by up to 4 pts).',
    counties: [
      ['Harris', 14, 6, 22, 'Wed'], ['Dallas', 7, 22, 39, 'Wed'], ['Tarrant', 7, -5, 9, '12 AM'],
      ['Bexar', 7, 10, 27, '12 AM'], ['Travis', 5, 39, 50, '12 AM'], ['Collin', 5, -11, 4, '11 PM'],
      ['Denton', 4, -13, 0, '12 AM', 'bellwether'], ['El Paso', 2, 15, 38, '12 AM', 'swing'],
    ],
    pace: { '20': 61, '21': 68, '22': 82, '23': 87, '24': 92 },
    countNote: 'Fast.',
    howItLooks: {
      title: 'How the Senate count could look',
      steps: [
        ['Poll close', 'Talarico can lead after a big early Harris County release.'],
        ['Overnight', 'Steady red returns from scores of Republican counties move it to Paxton.'],
        ['1 AM CT', 'Paxton about +1, with Democratic Election Day precincts still out in Dallas and Harris.'],
        ['Wed morning', 'Dallas may still be counting; in March it was unfinished at 4 AM CT.'],
      ],
    },
  },
  MI: {
    name: 'Michigan', close: '20:00', firstClose: '19:00', closeNote: 'Polls close 8:00 PM CT (most 7:00 PM)', pres2024: -1,
    races: [{ office: 'senate', d: 'El-Sayed', r: 'Rogers', open: true, forecast: 6, winProb: 74 }],
    countiesNote: '8 counties cast 55% of the vote.',
    counties: [
      ['Wayne', 15, 29, 32, 'Wed'], ['Oakland', 14, 11, 12, '12 AM'], ['Macomb', 9, -14, -12, 'Wed'],
      ['Kent', 7, 5, 6, '1 AM'], ['Genesee', 4, 4, 6, 'Wed'], ['Washtenaw', 4, 44, 45, 'Wed'],
      ['Grand Traverse', 1, -2, -2, '1 AM', 'bellwether'], ['Monroe', 2, -27, -25, 'Wed', 'swing'],
    ],
    pace: { '20': 9, '21': 13, '22': 28, '23': 43, '24': 62, '25': 71, wed: 99, fri: 99, nov15: 99 },
    countNote: 'Medium pace; mail is counted late, big cities report late; later votes leaned Democratic in 2020.',
    howItLooks: {
      title: 'How the Senate count could look',
      steps: [
        ['Early', 'El-Sayed leads as Ann Arbor and Grand Rapids report fast.'],
        ['Midnight CT', 'Rogers about +3 as Republican areas report.'],
        ['Late', "El-Sayed gains from Lansing, Kalamazoo, Washtenaw, Genesee, Saginaw, suburban Wayne and Detroit's last absentees."],
        ['Watch', 'Which places have not reported matters more than the statewide lead.'],
      ],
    },
  },
  KS: {
    name: 'Kansas', close: '20:00', firstClose: '19:00', closeNote: 'Polls close 8:00 PM CT (most 7:00 PM) · check your state', pres2024: -16,
    races: [
      { office: 'senate', d: 'Hamilton', r: 'Marshall', inc: 'r', forecast: -1, winProb: 47 },
      { office: 'governor', d: 'Holscher', r: 'Masterson', open: true, forecast: -5, winProb: 35 },
    ],
    countiesNote: '5 counties cast 56% of the vote. Targets set to the Senate race (governor differs by up to 2 pts).',
    counties: [
      ['Johnson', 26, 8, 24, '10 PM'], ['Sedgwick', 16, -14, 4, '12 AM'], ['Shawnee', 6, 0, 20, '10 PM'],
      ['Douglas', 4, 38, 52, '10 PM'], ['Wyandotte', 4, 24, 47, '9 PM', 'swing'],
    ],
    pace: { '20': 31, '21': 54, '22': 83, '23': 87, '24': 95 },
    countNote: 'Fast.',
  },
  MS: {
    name: 'Mississippi', close: '19:00', closeNote: 'Polls close 7:00 PM CT', pres2024: -23,
    races: [{ office: 'senate', d: 'Colom', r: 'Hyde-Smith', inc: 'r', forecast: -14 }],
    counties: [], pace: null, countNote: '',
  },
  IA: {
    name: 'Iowa', close: '20:00', closeNote: 'Polls close 8:00 PM CT', pres2024: -13,
    races: [
      { office: 'senate', d: 'Turek', r: 'Hinson', open: true, forecast: -1, winProb: 45 },
      { office: 'governor', d: 'Sand', r: 'Lahn', open: true, forecast: 7, winProb: 69 },
    ],
    countiesNote: '8 counties cast 44% of the vote. Targets set to the Senate race (governor differs by up to 3 pts).',
    counties: [
      ['Polk', 15, 11, 24, '10 PM'], ['Linn', 7, 10, 22, '12 AM'], ['Scott', 5, -4, 12, '10 PM'],
      ['Johnson', 5, 38, 50, '11 PM'], ['Black Hawk', 4, 1, 18, '10 PM'], ['Dallas', 4, -5, 7, '10 PM'],
      ['Cerro Gordo', 1, -12, 3, '10 PM', 'bellwether'], ['Clinton', 1, -19, -2, '10 PM', 'swing'],
    ],
    pace: { wed: 99, fri: 99, nov15: 100 },
    countNote: "Fast. AP's feed had no data for Story County overnight in 2024, so the statewide total was only a lower bound.",
  },
  MN: {
    name: 'Minnesota', close: '20:00', closeNote: 'Polls close 8:00 PM CT', pres2024: 4,
    races: [{ office: 'senate', d: 'Flanagan', r: 'Tafoya', open: true, forecast: 10, winProb: 85 }],
    countiesNote: '6 counties cast 51% of the vote.',
    counties: [
      ['Hennepin', 22, 43, 38, '11 PM'], ['Ramsey', 9, 43, 38, 'Wed'], ['Dakota', 8, 13, 8, '11 PM'],
      ['Anoka', 6, -4, -9, 'n/a'], ['Washington', 5, 9, 5, '1 AM'], ['Blue Earth', 1, -1, -6, '11 PM', 'swing'],
    ],
    pace: { wed: 99, fri: 99, nov15: 100 },
    countNote: "Medium pace. AP's feed had no data for Anoka County overnight in 2024.",
  },
  NE: {
    name: 'Nebraska', close: '20:00', closeNote: 'Polls close 8:00 PM CT', pres2024: -21,
    races: [{ office: 'senate', d: 'Osborn', r: 'Ricketts', inc: 'r', forecast: -7, winProb: 24, dSideName: 'Osborn', dLabel: 'I' }],
    countiesNote: '4 counties cast 58% of the vote. Targets are for Dan Osborn (I).',
    counties: [
      ['Douglas', 29, 10, 31, 'Wed', 'late'], ['Lancaster', 17, 4, 29, '1 AM'],
      ['Sarpy', 11, -12, 9, 'Wed'], ['Scotts Bluff', 2, -48, -24, 'Wed', 'swing'],
    ],
    pace: { '20': 0, '21': 31, '22': 50, '23': 61, '24': 75, '25': 84, wed: 97, fri: 97, nov15: 98 },
    countOrder: 'Count order (2024): Douglas (Omaha) held the largest share of ballots still uncounted in the 2nd District after election night.',
    countNote: 'Medium pace.',
  },
  WI: {
    name: 'Wisconsin', close: '20:00', closeNote: 'Polls close 8:00 PM CT', pres2024: -1,
    races: [{ office: 'governor', d: 'Crowley', r: 'Tiffany', open: true, forecast: 8, winProb: 72 }],
    countiesNote: '8 counties cast 46% of the vote.',
    counties: [
      ['Milwaukee', 14, 39, 39, 'Wed', 'late'], ['Dane', 11, 52, 52, '11 PM'], ['Waukesha', 8, -20, -19, '11 PM'],
      ['Brown', 4, -8, -7, 'Wed'], ['Outagamie', 3, -10, -9, '1 AM'], ['Racine', 3, -6, -5, 'Wed'],
      ['Sauk', 1, -2, 0, '12 AM', 'bellwether'], ['La Crosse', 2, 9, 11, '11 PM', 'swing'],
    ],
    pace: { '20': 0, '21': 33, '22': 58, '23': 71, '24': 84, '25': 88, wed: 100, fri: 100, nov15: 100 },
    countOrder: "Count order (2024, CT): Milwaukee's mail ballots came in one late batch after midnight ET (11 PM CT), behind the Election Day votes.",
    countNote: 'Medium pace; mail is counted late, big cities report late; later votes leaned Democratic in 2020.',
    howItLooks: {
      title: 'How the governor count could look',
      steps: [
        ['Early', 'Depends on how fast Dane and Milwaukee report.'],
        ['Midnight CT', "Republican about +2 before Milwaukee's absentees."],
        ['Late', "Milwaukee's final absentee drop, often the last big update, moves the state about 2 points toward Democrats."],
        ['Watch', 'Check whether Milwaukee city has finished before reading a close race.'],
      ],
    },
  },
  NV: {
    name: 'Nevada', close: '21:00', closeNote: 'Polls close 9:00 PM CT', pres2024: -3,
    races: [{ office: 'governor', d: 'Ford', r: 'Lombardo', inc: 'r', forecast: 2, winProb: 57 }],
    countiesNote: '4 counties cast 92% of the vote.',
    counties: [
      ['Clark', 69, 3, 6, 'Wed'], ['Washoe', 18, 1, 4, 'Nov 11'],
      ['Douglas', 2, -33, -29, 'Nov 11'], ['Lyon', 2, -44, -41, '1 AM', 'swing'],
    ],
    pace: { '21': 0, '22': 0, '23': 0, '24': 17, '25': 71, wed: 88, fri: 93, nov15: 99 },
    countNote: 'Takes days; mail is counted late, big cities report late; later votes leaned Democratic in 2022.',
  },
  OR: {
    name: 'Oregon', close: '22:00', closeNote: 'Polls close 10:00 PM CT', pres2024: 14,
    races: [{ office: 'governor', d: 'Kotek', r: 'Drazan', inc: 'd', forecast: 12, winProb: 81 }],
    countiesNote: '5 counties cast 53% of the vote.',
    counties: [
      ['Multnomah', 19, 62, 54, 'Nov 11'], ['Washington', 13, 34, 19, 'later'], ['Clackamas', 11, 10, -7, 'Nov 11'],
      ['Lane', 9, 23, 6, 'Thu'], ['Umatilla', 1, -38, -56, 'Wed', 'swing'],
    ],
    pace: { '22': 0, '23': 65, '24': 68, '25': 71, wed: 77, fri: 83, nov15: 96 },
    countNote: 'Takes days; early and mail votes come first, mail is counted late.',
  },
  AK: {
    name: 'Alaska', close: '24:00', firstClose: '23:00', closeNote: 'Polls close 12:00 AM CT (most 11:00 PM) · check your state', pres2024: -13,
    races: [{ office: 'senate', d: 'Peltola', r: 'Sullivan', inc: 'r', forecast: 2, winProb: 61 }],
    countiesNote: 'No county table: Alaska reports by state House district, not by borough or county.',
    counties: [],
    pace: { '24': 0, '25': 30, wed: 75, fri: 75, nov15: 89 },
    countNote: 'Takes days; early and mail votes come first, mail is counted late. Ranked-choice tabulation starts Nov 18.',
  },
};

// Senate "what the results mean" tier bars (page 5): margin where tide / wave / tsunami begin.
export const SENATE_TIER_BARS = {
  FL: [-9, -3, 0], GA: [5, 11, 15], SC: [-8, 1, 5], NC: [6, 13, 17], OH: [-1, 7, 11],
  ME: [0, 5, 9], NH: [4, 12, 16], TX: [-4, 5, 9], MI: [0, 8, 12], KS: [-6, 4, 8],
  MS: [-13, -2, 1], IA: [-4, 3, 7], NE: [-4, 1, 5], MN: [1, 13, 17],
};
export const SENATE_TIER_NOTES = { FL: 'panhandle 7 PM', TX: 'El Paso 8 PM', MI: 'UP 8 PM', KS: 'far west 8 PM' };

export const TIERS = [
  { key: 'riptide', label: 'Red Riptide', senate: 'GOP +3 to even', house: 'GOP keeps the House; 5+ pts worse for Dems than DDHQ' },
  { key: 'tide', label: 'Blue Tide', senate: 'Dems net +1 to +3', house: 'Dems win 218 to 229; 1 to 4 pts worse than DDHQ' },
  { key: 'wave', label: 'Blue Wave', senate: 'Dems net +4 to +6: control. DDHQ forecast lands here (+4)', house: 'Dems win 230 to 239; DDHQ to 3 pts better' },
  { key: 'tsunami', label: 'Blue Tsunami', senate: 'Dems net +7 or more', house: 'Dems win 240+; 4+ pts better than DDHQ' },
];

// ---------- U.S. Senate path to 51 (page 28) ----------
export const SENATE = {
  dNotUp: 34, rNotUp: 31, dBefore: 47, majority: 51, forecastSeats: 51,
  // all 35 races, most Democratic to most Republican, with DDHQ margin and party currently holding
  path: [
    ['MA', 28, 'D'], ['DE', 24, 'D'], ['OR', 24, 'D'], ['RI', 24, 'D'], ['CO', 19, 'D'], ['IL', 17, 'D'],
    ['NJ', 17, 'D'], ['NM', 17, 'D'], ['VA', 17, 'D'], ['GA', 11, 'D'], ['MN', 10, 'D'], ['NH', 10, 'D'],
    ['NC', 9, 'R'], ['MI', 6, 'D'], ['AK', 2, 'R'], ['ME', 2, 'R'], ['TX', 1, 'R'], ['OH', 0, 'R'],
    ['IA', -1, 'R'], ['KS', -1, 'R'], ['SC', -2, 'R'], ['FL', -6, 'R'], ['MT', -6, 'R'], ['NE', -7, 'R'],
    ['LA', -11, 'R'], ['MS', -14, 'R'], ['AL', -16, 'R'], ['KY', -16, 'R'], ['SD', -17, 'R'], ['AR', -18, 'R'],
    ['TN', -19, 'R'], ['ID', -23, 'R'], ['OK', -23, 'R'], ['WY', -29, 'R'], ['WV', -34, 'R'],
  ],
  // seats if every race misses DDHQ by the same amount
  uniformMiss: { '-6': 47, '-3': 48, '0': 51, '3': 55, '6': 55 },
  tippingPoint: 'TX',
};

// ---------- House ----------
export const HOUSE = { majority: 218, forecast: 230, dNow: 215 };

// "How big is the night" markers (page 4) — seat level where each flip points
export const HOUSE_SIGNALS = [
  { label: 'VA-2 flips', note: 'Luria beats Kiggans: the small test', seats: 223, seatsLabel: '~223', races: ['VA-02'], mode: 'all' },
  { label: 'KY-6 flips', note: 'Dembo wins Lexington: 230+', seats: 230, seatsLabel: '230+', races: ['KY-06'], mode: 'all' },
  { label: 'VA-1 flips', note: 'Taylor beats Wittman: ~235', seats: 235, seatsLabel: '~235', races: ['VA-01'], mode: 'all' },
  { label: 'Iowa sweep', note: 'All three Iowa House seats', seats: 239, seatsLabel: '~239', races: ['IA-01', 'IA-02', 'IA-03'], mode: 'all' },
  { label: 'VA-5 flips', note: 'Perriello beats McGuire: ~250', seats: 250, seatsLabel: '~250', races: ['VA-05'], mode: 'all' },
  { label: 'IN-5, FL-27, NC-9, OH-15', note: 'Any of these: tsunami', seats: 252, seatsLabel: '250+', races: ['IN-05', 'FL-27', 'NC-09', 'OH-15'], mode: 'any' },
];

// Early signals: the first House races (page 2). [district, D, R, inc('d'|'r'|null), close, lateR, m2024, ddhq]
export const EARLY_HOUSE = [
  ['VA-02', 'Luria', 'Kiggans', 'r', '18:00', false, 0, 7],
  ['OH-01', 'Landsman', 'Conroy', 'd', '18:30', true, -3, 6],
  ['OH-09', 'Kaptur', 'Merrin', 'd', '18:30', true, -11, 5],
  ['FL-14', 'Castor', 'Beltran', 'd', '18:00', true, -10, 4],
  ['FL-25', 'Moskowitz', 'Singer', 'd', '18:00', true, -9, 3],
  ['NC-01', 'Davis', 'Buckhout', 'd', '18:30', true, -12, 1],
  ['OH-07', 'Poindexter', 'Miller', 'r', '18:30', true, -11, 1],
  ['NC-11', 'Ager', 'Balkcom', null, '18:30', true, -9, 0],
  ['FL-09', 'Soto', 'Green', 'd', '18:00', true, -18, -1],
  ['FL-22', 'Dandiya', 'Askar', null, '18:00', true, -10, -2],
  ['KY-06', 'Dembo', 'Alvarado', null, '17:00', false, -15, -3],
  ['FL-04', 'Holloway', 'Bean', 'r', '18:00', true, -12, -4],
  ['FL-07', 'Dalton', 'Elijah', null, '18:00', true, -12, -4],
  ['FL-13', 'Gray', 'Luna', 'r', '18:00', true, -13, -4],
  ['SC-01', 'Lacore', 'Honeycutt', null, '18:00', false, -13, -4],
  ['VA-05', 'Perriello', 'McGuire', 'r', '18:00', false, -12, -4],
  ['FL-16', 'Kirschner', 'Gruters', null, '18:00', true, -14, -5],
  ['FL-27', 'Rodriguez', 'Salazar', 'r', '18:00', true, -15, -5],
  ['NC-03', 'Smith', 'Murphy', 'r', '18:30', true, -14, -5],
  ['NC-07', 'Hardy', 'Rouzer', 'r', '18:30', true, -14, -5],
  ['SC-02', 'Khalifa', 'Wilson', 'r', '18:00', false, -14, -5],
  ['VA-01', 'Taylor', 'Wittman', 'r', '18:00', false, -5, -5],
  ['FL-11', 'Pericola', 'Strada', null, '18:00', true, -16, -6],
  ['NC-09', 'Ojeda', 'Hudson', 'r', '18:30', true, -16, -6],
  ['NC-14', 'Womack', 'Moore', 'r', '18:30', true, -15, -6],
  ['OH-08', 'Enoch', 'Davidson', 'r', '18:30', true, -16, -6],
  ['FL-08', 'Jenkins', 'Haridopolos', 'r', '18:00', true, -16, -7],
  ['FL-18', 'Gibson', 'Franklin', 'r', '18:00', true, -17, -7],
  ['FL-21', 'Martin', 'Mast', 'r', '18:00', true, -16, -7],
  ['GA-01', 'Hollowell', 'Kingston', null, '18:00', true, -16, -7],
  ['IN-05', 'Ford', 'Spartz', 'r', '17:00', false, -17, -7],
  ['NC-13', 'Barringer', 'Knott', 'r', '18:30', true, -16, -7],
  ['FL-02', 'Green', 'Rogers', null, '18:00', true, -18, -8],
  ['NC-05', 'Hubbard', 'Foxx', 'r', '18:30', true, -18, -8],
  ['NC-06', 'Jefferson', 'McDowell', 'r', '18:30', true, -17, -8],
  ['NC-10', 'Bell', 'Harrigan', 'r', '18:30', true, -18, -8],
  ['OH-15', 'Leonard', 'Carey', 'r', '18:30', true, -10, -8],
];

// "What the House results mean" (page 6): [district, holder label, ddhq, redrawn]
// Tide begins at DDHQ-4, Wave at DDHQ, Tsunami at DDHQ+4.
export const HOUSE_TIER_SEATS = [
  { time: '17:00', label: '5:00 PM CT', note: 'Most of KY and IN', seats: [['KY-06', 'Open (R)', -3], ['IN-05', 'Spartz (R)', -7]] },
  { time: '18:00', label: '6:00 PM CT', note: 'FL, GA, SC, VA, IN, KY', seats: [
    ['IN-01', 'Mrvan (D)', 14], ['VA-02', 'Kiggans (R)', 7], ['FL-14', 'Castor (D)', 4, true], ['FL-25', 'Moskowitz (D)', 3, true],
    ['FL-09', 'Soto (D)', -1, true], ['FL-22', 'Open (D)', -2, true], ['SC-01', 'Open (R)', -4], ['FL-07', 'Open (R)', -4],
    ['VA-05', 'McGuire (R)', -4], ['VA-01', 'Wittman (R)', -5], ['FL-27', 'Salazar (R)', -5], ['SC-02', 'Wilson (R)', -5],
    ['GA-01', 'Open (R)', -7]] },
  { time: '18:30', label: '6:30 PM CT', note: 'NC, OH', seats: [
    ['OH-13', 'Sykes (D)', 11, true], ['OH-01', 'Landsman (D)', 6, true], ['OH-09', 'Kaptur (D)', 5, true], ['NC-01', 'Davis (D)', 1, true],
    ['OH-07', 'Miller (R)', 1], ['NC-11', 'Open (R)', 0], ['NC-09', 'Hudson (R)', -6], ['NC-05', 'Foxx (R)', -8], ['OH-10', 'Turner (R)', -11]] },
  { time: '19:00', label: '7:00 PM CT', note: 'PA, MI, NJ, TX, ME', seats: [
    ['MI-07', 'Barrett (R)', 7], ['NJ-07', 'Kean (R)', 7], ['MI-10', 'Open (R)', 3], ['PA-08', 'Bresnahan (R)', 2],
    ['ME-02', 'Open (D)', 0], ['PA-01', 'Fitzpatrick (R)', -2], ['MI-04', 'Huizenga (R)', -3], ['TX-15', 'De La Cruz (R)', -3, true],
    ['NJ-02', 'Van Drew (R)', -4]] },
  { time: '20:00', label: '8:00 PM CT', note: 'NY, AZ, CO, WI, NE, IA', seats: [
    ['AZ-06', 'Ciscomani (R)', 7], ['CO-08', 'Evans (R)', 7], ['IA-01', 'Miller-Meeks (R)', 7], ['WI-03', 'Van Orden (R)', 6],
    ['AZ-01', 'Open (R)', 5], ['IA-03', 'Nunn (R)', 4], ['NY-17', 'Lawler (R)', 2], ['IA-02', 'Open (R)', 1], ['CO-05', 'Crank (R)', -7]] },
  { time: '21:00', label: '9:00 PM CT', note: 'MT', seats: [['MT-01', 'Open (R)', -1]] },
  { time: '22:00', label: '10:00 PM CT', note: 'CA', seats: [['CA-22', 'Valadao (R)', 7, true]] },
];
export const RED_RIPTIDE_TESTS = [
  { label: 'FL', text: 'GOP wins all 4 redrawn FL seats (9, 14, 22, 25)', races: ['FL-09', 'FL-14', 'FL-22', 'FL-25'], need: 4, of: 4 },
  { label: 'TX', text: 'GOP wins 4+ of 5 redrawn TX seats', races: ['TX-09', 'TX-15', 'TX-28', 'TX-34', 'TX-35'], need: 4, of: 5 },
  { label: 'PA', text: 'GOP holds PA-07 and PA-10', races: ['PA-07', 'PA-10'], need: 2, of: 2 },
];

// All 85 House races to watch, by poll close (page 20). [district, D, R, inc ('d'|'r'|null=open), lean2024 (+ = Harris)]
export const HOUSE_WATCH = [
  { time: '18:00', label: '6:00 PM CT', races: [
    ['GA-01', 'Hollowell', 'Kingston', null, -16], ['GA-07', 'Kozycki', 'McCormick', 'r', -22], ['GA-10', 'DeLancy', 'Gaines', null, -21],
    ['GA-11', 'Harden', 'Cowan', null, -23], ['GA-12', 'Smith', 'Allen', 'r', -14], ['IN-01', 'Mrvan', 'Regnitz', 'd', 0],
    ['IN-05', 'Ford', 'Spartz', 'r', -17], ['KY-06', 'Dembo', 'Alvarado', null, -15], ['SC-01', 'Lacore', 'Honeycutt', null, -13],
    ['SC-02', 'Khalifa', 'Wilson', 'r', -14], ['SC-05', 'Dittmer', 'Climer', null, -23], ['VA-01', 'Taylor', 'Wittman', 'r', -5],
    ['VA-02', 'Luria', 'Kiggans', 'r', 0], ['VA-05', 'Perriello', 'McGuire', 'r', -12]] },
  { time: '18:30', label: '6:30 PM CT', races: [
    ['NC-01', 'Davis', 'Buckhout', 'd', -12], ['NC-03', 'Smith', 'Murphy', 'r', -14], ['NC-05', 'Hubbard', 'Foxx', 'r', -18],
    ['NC-06', 'Jefferson', 'McDowell', 'r', -17], ['NC-07', 'Hardy', 'Rouzer', 'r', -14], ['NC-08', 'Watson', 'Harris', 'r', -19],
    ['NC-09', 'Ojeda', 'Hudson', 'r', -16], ['NC-10', 'Bell', 'Harrigan', 'r', -18], ['NC-11', 'Ager', 'Balkcom', null, -9],
    ['NC-13', 'Barringer', 'Knott', 'r', -16], ['NC-14', 'Womack', 'Moore', 'r', -15], ['OH-01', 'Landsman', 'Conroy', 'd', -3],
    ['OH-07', 'Poindexter', 'Miller', 'r', -11], ['OH-08', 'Enoch', 'Davidson', 'r', -16], ['OH-09', 'Kaptur', 'Merrin', 'd', -11],
    ['OH-10', 'Knickerbocker', 'Turner', 'r', -8], ['OH-13', 'Sykes', 'Coleman', 'd', 3], ['OH-15', 'Leonard', 'Carey', 'r', -10]] },
  { time: '19:00', label: '7:00 PM CT', races: [
    ['AL-02', 'Figures', 'Marques', 'd', -14], ['FL-02', 'Green', 'Rogers', null, -18], ['FL-04', 'Holloway', 'Bean', 'r', -12],
    ['FL-07', 'Dalton', 'Elijah', null, -12], ['FL-08', 'Jenkins', 'Haridopolos', 'r', -16], ['FL-09', 'Soto', 'Green', 'd', -18],
    ['FL-11', 'Pericola', 'Strada', null, -16], ['FL-12', 'Overman', 'Bilirakis', 'r', -15], ['FL-13', 'Gray', 'Luna', 'r', -13],
    ['FL-14', 'Castor', 'Beltran', 'd', -10], ['FL-16', 'Kirschner', 'Gruters', null, -14], ['FL-18', 'Gibson', 'Franklin', 'r', -17],
    ['FL-21', 'Martin', 'Mast', 'r', -16], ['FL-22', 'Dandiya', 'Askar', null, -10], ['FL-25', 'Moskowitz', 'Singer', 'd', -9],
    ['FL-26', 'Locklin', 'Diaz-Balart', 'r', -18], ['FL-27', 'Rodriguez', 'Salazar', 'r', -15], ['ME-02', 'Dunlap', 'LePage', null, -9],
    ['MO-02', 'Wellman', 'Wagner', 'r', -8], ['NJ-07', 'Bennett', 'Kean', 'r', -1], ['PA-01', 'Harvie', 'Fitzpatrick', 'r', 0],
    ['PA-07', 'Brooks', 'Mackenzie', 'r', -3], ['PA-08', 'Cognetti', 'Bresnahan', 'r', -8], ['PA-10', 'Stelson', 'Perry', 'r', -5]] },
  { time: '19:30', label: '7:30 PM CT', races: [['AR-02', 'Jones', 'Hill', 'r', -16]] },
  { time: '20:00', label: '8:00 PM CT', races: [
    ['AZ-01', 'Shah', 'Feely', null, -3], ['AZ-02', 'Nez', 'Crane', 'r', -15], ['AZ-06', 'Mendoza', 'Ciscomani', 'r', -1],
    ['CO-03', 'Romero', 'Hurd', 'r', -10], ['CO-04', 'Laubacher', 'Boebert', 'r', -18], ['CO-05', 'Killin', 'Crank', 'r', -9],
    ['CO-08', 'Rutinel', 'Evans', 'r', -2], ['IA-02', 'James', 'Mitchell', null, -10], ['IA-03', 'Garriott', 'Nunn', 'r', -4],
    ['MI-04', 'McCann', 'Huizenga', 'r', -6], ['MI-07', 'Lawrence', 'Barrett', 'r', -1], ['MI-10', 'Hines', 'Bouchard', null, -7],
    ['MN-01', 'Johnson', 'Finstad', 'r', -12], ['NE-01', 'Backemeyer', 'Flood', 'r', -13], ['NY-01', 'Gallant', 'LaLota', 'r', -10],
    ['NY-17', 'Conley', 'Lawler', 'r', 1], ['NY-21', 'Gendebien', 'Constantino', null, -21], ['TX-09', 'Gutierrez', 'Mealer', null, -20],
    ['TX-15', 'Pulido', 'De La Cruz', 'r', -18], ['TX-23', 'Stout', 'Herrera', null, -15], ['TX-34', 'Gonzalez', 'Flores', 'd', -10],
    ['TX-35', 'Garcia', 'De La Cruz', null, -10], ['WI-01', 'Berman', 'Steil', 'r', -5], ['WI-03', 'Cooke', 'Van Orden', 'r', -7]] },
  { time: '21:00', label: '9:00 PM CT', races: [['MT-01', 'Forstag', 'Flint', null, -12], ['NV-02', 'Benitez-Thompson', 'Flippo', null, -14]] },
  { time: '22:00', label: '10:00 PM CT', races: [['WA-03', 'Perez', 'Braun', 'd', -3]] },
  { time: '24:00', label: '12:00 AM CT', races: [['AK-AL', 'Hafner', 'Begich', 'r', -13]] },
];
// party holding open seats (from the guide's Open (R)/(D) labels; TX-09/TX-35 were redrawn)
export const OPEN_SEAT_HOLDER = {
  'GA-01': 'r', 'GA-10': 'r', 'GA-11': 'r', 'KY-06': 'r', 'SC-01': 'r', 'SC-05': 'r', 'NC-11': 'r', 'FL-02': 'r',
  'FL-07': 'r', 'FL-11': 'r', 'FL-16': 'r', 'FL-22': 'd', 'ME-02': 'd', 'AZ-01': 'r', 'IA-02': 'r', 'MI-10': 'r',
  'NY-21': 'r', 'TX-09': 'd', 'TX-23': 'r', 'TX-35': 'd', 'MT-01': 'r', 'NV-02': 'r',
};
export const REDRAWN = new Set(['FL-09', 'FL-14', 'FL-22', 'FL-25', 'OH-01', 'OH-09', 'OH-13', 'NC-01', 'TX-09', 'TX-15', 'TX-28', 'TX-34', 'TX-35', 'CA-22']);

// The 17 closest (page 19) — within 5 points on 2024 lean
export const CLOSEST_17 = ['OH-13', 'NY-17', 'IN-01', 'PA-01', 'VA-02', 'AZ-06', 'MI-07', 'NJ-07', 'CO-08', 'AZ-01', 'OH-01', 'PA-07', 'WA-03', 'IA-03', 'PA-10', 'VA-01', 'WI-01'];

// Texas House seats (page 12)
export const TEXAS = {
  senate: { forecast: 1, polls: 'avg D+2.4', cook: 'Toss-up', note: 'Talarico $146M raised, Paxton $22M; outside GOP groups $214M+' },
  governor: { forecast: -7, polls: 'R+3, R+3', cook: 'Lean R', note: 'Abbott won by 10.9 in 2022' },
  stats: [
    ['7.4M+', 'early votes, up 36% from 2022'], ['35% / 33%', 'early voters with D / R primary history'],
    ['+64%', 'Rio Grande Valley early vote vs. its 2022 pace'], ['~40%', 'of Republicans planned to vote on Election Day'],
  ],
  checks: {
    harris: { label: "Talarico's margin in Harris County", note: 'Near +20 is the Democratic benchmark; a 2024-style +11 is not enough', allred: 11.4, uhPoll: 22, bench: 20 },
    big5: { label: "Big 5 counties' share of the statewide vote", note: 'Harris, Dallas, Tarrant, Bexar, Travis, after Election Day votes are in', bench: 40, counties: ['Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis'] },
    rural: { label: 'Share of the vote from outside the 25 largest counties', note: 'Republicans need 25% or more from rural and small-county Texas', bench: 25,
      top25: ['Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis', 'Collin', 'Denton', 'Fort Bend', 'Williamson', 'Montgomery', 'El Paso', 'Hidalgo', 'Brazoria', 'Galveston', 'Hays', 'Nueces', 'Bell', 'Lubbock', 'Cameron', 'Ellis', 'Comal', 'Guadalupe', 'Smith', 'Jefferson', 'McLennan'] },
    hispanic: { label: 'Hispanic share of the electorate', note: 'Hispanic voters were 18% of early voters, up from 2022 and 2024. Target: 25%.', early: 18, bench: 25 },
  },
  unfolds: [
    ['7 PM', "First batch: early and mail votes, about 88% of Harris County's 2020 vote. Talarico should lead."],
    ['7 to 10 PM', 'Election Day votes lean Republican; the Talarico lead shrinks. The question is whether it survives.'],
    ['8 PM', 'El Paso and far West Texas close. El Paso, the last big Democratic county, can tighten a close race.'],
    ['10 PM', 'Abbott still uncalled is a bad sign for Republicans. Both called before 11 PM is a good one.'],
    ['After midnight', 'Houston, Dallas, San Antonio and Austin can keep counting; counties have 24 hours.'],
    ['Nov 9 to Dec 9', 'Late mail, military and provisional ballots by Nov 9; county canvass Nov 19; statewide Dec 9.'],
  ],
  house: [
    ['TX-15', 'Pulido (D) v De La Cruz (R)', 'Toss-up', 'Pulido flipping it is the clearest Latino-swing signal'],
    ['TX-28', 'Cuellar (D)', 'Likely D', 'Redrawn to flip; a Cuellar hold blunts the new map'],
    ['TX-34', 'Gonzalez (D) v Flores (R)', 'Lean D', 'Losing it means the redraw worked'],
    ['TX-35', 'Garcia (D) v De La Cruz (R)', 'Toss-up', 'New open seat drawn for the GOP'],
    ['TX-23', 'Padilla Stout (D) v Herrera (R)', 'Lean R', 'Reach seat; close late is a strong night'],
    ['TX-09', 'Gutierrez (D) v Mealer (R)', 'Likely R', 'Reach seat'],
  ],
};

// ---------- Early county benchmarks (page 3) ----------
export const EARLY_COUNTIES = [
  { by: 'In by 7 PM CT', time: '19:00', rows: [['FL', 'Palm Beach'], ['FL', 'Hillsborough'], ['FL', 'Pinellas'], ['FL', 'Osceola'], ['KY', 'Campbell']] },
  { by: 'In by 8 PM CT', time: '20:00', rows: [['FL', 'Miami-Dade'], ['FL', 'Broward'], ['FL', 'Orange'], ['KY', 'Jefferson'], ['KY', 'Fayette'], ['KY', 'Boone'], ['KY', 'Madison'], ['KY', 'Boyd'], ['NC', 'Union']] },
  { by: 'In by 9 PM CT', time: '21:00', rows: [['GA', 'Cherokee'], ['GA', 'Fayette'], ['KS', 'Wyandotte'], ['KY', 'Warren'], ['NC', 'Buncombe'], ['NC', 'Onslow'], ['SC', 'Spartanburg'], ['SC', 'Berkeley'], ['SC', 'Orangeburg']] },
];

// ---------- Count pace (page 21): share of the final 2024 count by hour (CT) ----------
// hours: 19..25 = 7 PM..1 AM; wed = Wed 8 PM, fri = Fri 8 AM, nov15
export const PACE = [
  ['FL', 'Florida', [83, 96, 98, 98, 99, 99, 99], null, '8 PM'],
  ['KY', 'Kentucky', [37, 75, 94, 99, 99, 99, 99], null, '9 PM'],
  ['GA', 'Georgia', [31, 65, 76, 92, 95, 98, 98], null, '10 PM'],
  ['VT', 'Vermont', [21, 59, 79, 91, 95, 97, 99], null, '10 PM'],
  ['OH', 'Ohio', [23, 49, 63, 90, 96, 98, 98], null, '11 PM'],
  ['SC', 'South Carolina', [11, 52, 75, 87, 95, 95, 97], null, '11 PM'],
  ['NC', 'North Carolina', [4, 38, 55, 87, 91, 96, 98], null, '11 PM'],
  ['AR', 'Arkansas', [0, 19, 58, 78, 92, 98, 98], null, '11 PM'],
  ['NY', 'New York', [0, 0, 54, 83, 93, 94, 93], null, '11 PM'],
  ['AL', 'Alabama', [0, 1, 30, 64, 92, 97, 98], null, '11 PM'],
  ['TX', 'Texas', [0, 61, 68, 82, 87, 92, 95], [99, 99, 99], '12 AM'],
  ['KS', 'Kansas', [0, 31, 54, 83, 87, 95, 95], [97, 97, 98], '12 AM'],
  ['IN', 'Indiana', [29, 60, 76, 88, 90, 91, 91], null, '12 AM'],
  ['VA', 'Virginia', [24, 52, 66, 81, 88, 94, 98], null, '12 AM'],
  ['PA', 'Pennsylvania', [0, 15, 41, 67, 81, 91, 94], null, '12 AM'],
  ['MO', 'Missouri', [0, 7, 22, 69, 86, 92, 95], null, '12 AM'],
  ['NJ', 'New Jersey', [0, 37, 58, 83, 87, 90, 90], null, '1 AM'],
  ['WI', 'Wisconsin', [0, 0, 33, 58, 71, 84, 88], [100, 100, 100], 'Wed'],
  ['NE', 'Nebraska', [0, 0, 31, 50, 61, 75, 84], [97, 97, 98], 'Wed'],
  ['MI', 'Michigan', [0, 9, 13, 28, 43, 62, 71], [99, 99, 99], 'Wed'],
  ['MN', 'Minnesota', null, [99, 99, 100], 'Wed'],
  ['IA', 'Iowa', null, [99, 99, 100], 'Wed'],
  ['NV', 'Nevada', [0, 0, 0, 0, 0, 17, 71], [88, 93, 99], 'Thu'],
  ['CO', 'Colorado', [0, 0, 36, 71, 73, 74, 76], [82, 88, 99], 'Nov 11'],
  ['OR', 'Oregon', [0, 0, 0, 0, 65, 68, 71], [77, 83, 96], 'Nov 11'],
  ['AZ', 'Arizona', [0, 0, 0, 54, 54, 55, 55], [67, 74, 99], 'Nov 11'],
  ['WA', 'Washington', [0, 0, 0, 0, 66, 67, 67], [67, 78, 98], 'Nov 11'],
  ['NH', 'New Hampshire', [12, 31, 47, 61, 73, 86, 88], null, 'after 1 AM'],
  ['AK', 'Alaska', [0, 0, 0, 0, 0, 0, 30], [75, 75, 89], 'after Nov 15'],
  ['ME', 'Maine', [0, 1, 2, 18, 30, 52, 63], null, 'after 1 AM'],
  ['MT', 'Montana', [0, 0, 0, 6, 14, 21, 33], null, 'after 1 AM'],
];

export const WHO_COUNTS = [
  ['Florida', 'fast and clean; the best early read of the night'],
  ['Georgia', 'metro Atlanta last; early R leads are unreliable'],
  ['Michigan', 'Detroit late; early numbers look redder than the result'],
  ['Texas', 'big Democratic metros report late'],
  ['Maine and Alaska', 'ranked choice can take days to weeks'],
  ['Arizona, Nevada, California', 'heavy mail voting; days of counting'],
];

// ---------- Poll closings (page 1) ----------
export const CLOSINGS = [
  { time: '17:00', label: '5:00 PM CT', states: [['KY', 'Most of Kentucky'], ['IN', 'Most of Indiana']], house: ['KY-06', 'IN-05'], legis: [] },
  { time: '18:00', label: '6:00 PM CT', states: [['GA', 'Senate, Governor'], ['KY', 'Senate'], ['SC', 'Senate, Governor'], ['VT', 'Governor']],
    house: ['GA-01', 'GA-07', 'GA-10', 'GA-11', 'GA-12', 'IN-01', 'IN-05', 'KY-06', 'SC-01', 'SC-02', 'SC-05', 'VA-01', 'VA-02', 'VA-05'], legis: ['Vermont Senate'] },
  { time: '18:30', label: '6:30 PM CT', states: [['NC', 'Senate'], ['OH', 'Senate, Governor (check time)']],
    house: ['NC-01', 'NC-03', 'NC-05', 'NC-06', 'NC-07', 'NC-08', 'NC-09', 'NC-10', 'NC-11', 'NC-13', 'NC-14', 'OH-01', 'OH-07', 'OH-08', 'OH-09', 'OH-10', 'OH-13', 'OH-15'], legis: [] },
  { time: '19:00', label: '7:00 PM CT', states: [['FL', 'Senate, Governor'], ['ME', 'Senate'], ['NH', 'Senate (check time)'], ['RI', 'Governor']],
    house: ['AL-02', 'FL-02', 'FL-04', 'FL-07', 'FL-08', 'FL-09', 'FL-11', 'FL-12', 'FL-13', 'FL-14', 'FL-16', 'FL-18', 'FL-21', 'FL-22', 'FL-25', 'FL-26', 'FL-27', 'ME-02', 'MO-02', 'NJ-07', 'PA-01', 'PA-07', 'PA-08', 'PA-10'],
    legis: ['Maine House and Senate', 'New Hampshire Senate', 'Pennsylvania House and Senate'] },
  { time: '19:30', label: '7:30 PM CT', states: [], house: ['AR-02'], legis: [] },
  { time: '20:00', label: '8:00 PM CT', states: [['IA', 'Senate, Governor'], ['KS', 'Senate, Governor (check time)'], ['MI', 'Senate'], ['MN', 'Senate'], ['NE', 'Senate'], ['TX', 'Senate, Governor'], ['WI', 'Governor']],
    house: ['AZ-01', 'AZ-02', 'AZ-06', 'CO-03', 'CO-04', 'CO-05', 'CO-08', 'IA-02', 'IA-03', 'MI-04', 'MI-07', 'MI-10', 'MN-01', 'NE-01', 'NY-01', 'NY-17', 'NY-21', 'TX-09', 'TX-15', 'TX-23', 'TX-34', 'TX-35', 'WI-01', 'WI-03'],
    legis: ['Arizona House and Senate', 'Michigan House and Senate', 'Minnesota House and Senate', 'Texas Senate', 'Wisconsin Senate'] },
  { time: '21:00', label: '9:00 PM CT', states: [['NV', 'Governor']], house: ['MT-01', 'NV-02'], legis: ['Nevada Senate'] },
  { time: '22:00', label: '10:00 PM CT', states: [['OR', 'Governor']], house: ['WA-03'], legis: ['Oregon Senate'] },
  { time: '24:00', label: '12:00 AM CT', states: [['AK', 'Senate (check time)']], house: ['AK-AL'], legis: ['Alaska House and Senate'] },
];

// ---------- Tonight, hour by hour (page 1) + What to watch (page 7) ----------
// signal: 'd' good for Democrats, 'r' good for Republicans, 'g' timing/caveat
export const HOURS = [
  { time: '17:00', label: '5 PM', sub: 'Kentucky, Indiana', closes: 'Most of Kentucky and Indiana', counted: '',
    check: 'KY-06 and IN-05 are the first House reads: a GOP margin of 10+ in KY-06 or 15+ in IN-05 is a red signal.',
    watch: [
      { title: 'KY-6 · Lexington (open)', refs: ['H:KY-06'], items: [['d', 'Dembo wins: points to 230+ House seats'], ['r', 'Comfortable R hold: a normal year, not a wave']] },
      { title: 'IN-5 · Spartz', refs: ['H:IN-05'], items: [['d', 'Ford near 49 to 50%'], ['r', 'Ford stuck at 45 to 47%']] },
      { title: 'IN-1 · Mrvan', refs: ['H:IN-01'], items: [['d', 'Called fast for Mrvan'], ['r', 'Too close to call early'], ['g', 'Closes 6 PM CT']] },
    ] },
  { time: '18:00', label: '6 PM', sub: 'GA, SC, VA, VT, FL, KY', closes: 'Georgia, Kentucky, South Carolina, Vermont', counted: '',
    check: 'Most of Florida closes and counts fastest: FL-14, FL-25, FL-9 and FL-22 are the first real House reads. VA-01, VA-02, VA-05 close too; Kentucky and Georgia start reporting.',
    watch: [
      { title: 'VA-2 · Kiggans v Luria', refs: ['H:VA-02'], items: [['d', 'Luria wins: the small test'], ['r', 'Kiggans holds: majority in doubt']] },
      { title: 'VA-1 · Wittman v Taylor', refs: ['H:VA-01'], items: [['d', 'Taylor wins: wave territory, ~235 seats'], ['g', 'Trump +5; even close is good for D']] },
      { title: 'VA-5 · McGuire v Perriello', refs: ['H:VA-05'], items: [['d', 'Perriello wins: ~250 seats'], ['g', 'Trump +12']] },
      { title: 'Florida', refs: ['S:FL:governor', 'H:FL-14', 'H:FL-25'], items: [['d', 'Governor uncalled at 8 PM; FL-14 and FL-25 hold'], ['r', 'GOP wins statewide by 5+; Castor and Moskowitz lose'], ['g', '80%+ counted by 7 PM']] },
      { title: 'Georgia', refs: ['S:GA:senate', 'S:GA:governor'], items: [['d', 'Ossoff beats his margin'], ['r', 'Jackson called by 9 PM: rules out a wave'], ['g', 'Metro Atlanta counts last']] },
      { title: 'South Carolina', refs: ['S:SC:senate', 'H:SC-01', 'H:SC-02'], items: [['d', 'Senate uncalled late'], ['r', 'Called early for Graham'], ['g', 'Tells: SC-1, SC-2']] },
    ] },
  { time: '18:30', label: '6:30 PM', sub: 'North Carolina, Ohio', closes: 'North Carolina, Ohio', counted: '',
    check: 'OH-01, OH-13, OH-10, NC-01 and NC-11 close. Early and mail votes come first in GA, NC and OH, and later votes leaned R in 2022, so early D margins there will shrink.',
    watch: [
      { title: 'NC Senate · Cooper v Whatley', refs: ['S:NC:senate'], items: [['d', 'Early, comfortable Cooper call'], ['r', 'Cooper struggling']] },
      { title: 'OH Senate · Brown v Husted', refs: ['S:OH:senate'], items: [['d', 'Brown wins comfortably'], ['r', "Brown trails or it's a coin flip"]] },
      { title: 'NC and OH House', refs: ['H:NC-01', 'H:NC-11', 'H:OH-07', 'H:OH-09', 'H:OH-15'], items: [['d', 'Davis holds NC-1, Ager flips NC-11, Poindexter beats Miller'], ['r', 'Lose both NC seats; Kaptur on redder lines'], ['g', 'Tells: NC-9, OH-15']] },
    ] },
  { time: '19:00', label: '7 PM', sub: 'TX, MI, ME, KS, PA, NJ, MO, NH', closes: 'Florida, Maine, New Hampshire, Rhode Island', counted: '',
    check: 'Florida counts fast: Palm Beach, Hillsborough, Pinellas and Osceola are the first county benchmarks (see Counties). Kentucky\'s Campbell County too.',
    watch: [
      { title: 'Texas', refs: ['S:TX:governor', 'H:TX-15'], items: [['d', 'Abbott uncalled at 10 PM; Pulido flips TX-15'], ['r', 'Abbott and Paxton called before 11 PM'], ['g', 'Big metros report late']] },
      { title: 'Michigan Senate', refs: ['S:MI:senate'], items: [['d', 'Called for El-Sayed before 11 PM'], ['r', 'Rogers running ahead of his polls'], ['g', 'Detroit and Wayne late']] },
      { title: 'Maine', refs: ['H:ME-02', 'S:ME:senate'], items: [['d', 'Dunlap close or ahead in ME-2'], ['g', 'Ranked choice can take days']] },
      { title: 'Kansas Senate', refs: ['S:KS:senate'], items: [['d', 'No quick call for Marshall'], ['r', 'Called early for Marshall'], ['g', 'West Kansas closes 8 PM']] },
      { title: 'Pennsylvania House', refs: ['H:PA-07', 'H:PA-10', 'H:PA-08', 'H:PA-01'], items: [['d', 'PA-7, PA-10 flip; PA-8, PA-1 is a wave'], ['g', 'Also NJ-7, MI-4, MO-2']] },
    ] },
  { time: '19:30', label: '7:30 PM', sub: 'Arkansas', closes: '', counted: '', check: 'AR-02.', watch: [] },
  { time: '20:00', label: '8 PM', sub: 'IA, NE, MN, WI, AZ, CO, NY', closes: 'Iowa, Kansas, Michigan, Minnesota, Nebraska, Texas, Wisconsin', counted: 'Florida',
    check: 'Florida about 96% counted; read the Florida Senate and governor gap to forecast. Jefferson, Fayette and Boone in Kentucky. Wisconsin, Michigan, Minnesota, Iowa, Kansas, Texas and Nebraska close.',
    watch: [
      { title: 'Iowa', refs: ['S:IA:senate', 'S:IA:governor', 'H:IA-01', 'H:IA-02', 'H:IA-03'], items: [['d', 'Sweep Senate, governor, all three House seats'], ['r', 'Lose the Senate race: path narrows']] },
      { title: 'Nebraska, Kansas, Texas', refs: ['S:NE:senate', 'S:KS:senate', 'S:TX:senate'], items: [['d', 'One GOP loss is a very big night; two is historic'], ['g', 'Minnesota close is a warning']] },
      { title: 'House battlegrounds', refs: ['H:NY-17', 'H:AZ-06', 'H:CO-08', 'H:WI-03', 'H:NE-01', 'H:CO-05', 'H:WI-01'], items: [['d', 'NY-17, AZ-6, CO-8, WI-3, NE-2 flip; CO-5, WI-1 in play'], ['g', 'Arizona takes days']] },
    ] },
  { time: '21:00', label: '9 PM', sub: 'NV, MT, OR, WA, CA', closes: 'Nevada', counted: 'Kentucky',
    check: "Kentucky about 94%. Georgia's Cherokee and Fayette, NC's Buncombe and Onslow, SC's Berkeley and Spartanburg. Nevada closes.",
    watch: [
      { title: 'The West', refs: ['H:MT-01', 'H:NV-02', 'H:WA-03'], items: [['d', 'MT-1 competitive; NV-3 and WA-3 hold']] },
      { title: 'California', refs: ['H:CA-22'], items: [['g', 'Ballots arriving within 7 days count; calls take weeks']] },
      { title: 'Checkpoint', refs: ['S:IA:governor', 'S:TX:governor', 'S:FL:governor'], items: [['d', 'Iowa, Texas, Florida governor still uncalled'], ['r', 'Georgia, Abbott, Marshall, Hinson all called']] },
    ] },
  { time: '22:00', label: '10 PM', sub: 'Oregon', closes: 'Oregon', counted: 'Georgia, Vermont',
    check: 'Georgia governor tightens as Fulton and Gwinnett report. Georgia and Vermont pass 90%. Fulton, Cobb and DeKalb in. Wisconsin about 58%, with Dane and Waukesha still counting.', watch: [] },
  { time: '23:00', label: '11 PM', sub: '', closes: '', counted: 'South Carolina, North Carolina, Ohio',
    check: "Ohio, NC and SC pass 90%. Milwaukee's absentee batch typically lands after this hour. Dane, Waukesha, La Crosse in.", watch: [] },
  { time: '24:00', label: '12 AM', sub: 'Alaska and overnight', closes: 'Alaska', counted: 'Kansas, Texas',
    check: 'Expect Husted, Rogers and the Wisconsin Republican to lead here even in a close race, before late Democratic votes. Texas and Kansas pass 90%. Alaska closes. Wisconsin about 84%: watch AD-88, AD-61, AD-51 and SD-17.',
    watch: [{ title: 'Alaska Senate', refs: ['S:AK:senate'], items: [['g', 'Ranked choice starts Nov 18']] }] },
  { time: '25:00', label: '1 AM', sub: '', closes: '', counted: '',
    check: 'Paxton may lead with Dallas and Harris Election Day votes still out. Maine and New Hampshire still under 90%. Michigan about 71%.', watch: [] },
  { time: '26:00', label: '2 AM+', sub: 'Checkpoint', closes: '', counted: 'Maine (after 1 AM), New Hampshire (after 1 AM)',
    check: 'Wisconsin, Michigan, Minnesota, Iowa, Nebraska finish Wednesday; Nevada Thursday; Oregon Nov. 11; Alaska after Nov. 15. Maine Senate may go to ranked-choice rounds.',
    watch: [
      { title: '2 AM checkpoint', refs: [], items: [['d', 'Both chambers called'], ['r', "No Senate call: GOP outperforming, or it's AK and ME"]] },
      { title: 'Wednesday', refs: [], items: [['g', 'Expect 1 to 2 Senate and about 12 House races uncalled']] },
    ] },
];

// ---------- Tells to watch (page 5) ----------
// `auto` names an evaluator in model.js; window is [startHHMM, endHHMM] CT
export const TELLS = [
  { when: '6:30 PM', win: ['18:30', '19:15'], sig: 'd', title: 'NC called for Cooper at poll close', means: 'The baseline wave is real', auto: 'ncEarlyCall' },
  { when: '7 to 8 PM', win: ['19:00', '20:00'], sig: 'r', title: 'Big Graham win in South Carolina', means: 'Republicans came home; polls missed', auto: 'grahamBig' },
  { when: '7 to 8 PM', win: ['19:00', '20:00'], sig: 'd', title: 'Brown runs 4+ ahead of his 2024 race', means: 'Ohio likely flips', auto: 'brownAhead' },
  { when: '7 to 9 PM', win: ['19:00', '21:00'], sig: 'd', title: 'Paxton trails Abbott', means: 'Republicans splitting tickets; Texas at risk', auto: 'paxtonTrailsAbbott' },
  { when: '7 to 9 PM', win: ['19:00', '21:00'], sig: 'r', title: "El-Sayed lags Harris '24 in Detroit", means: 'Democratic trouble in Michigan', auto: 'elSayedWayne' },
  { when: '8 PM', win: ['20:00', '20:30'], sig: 'd', title: 'Florida Senate still uncalled', means: 'A good Democratic night', auto: 'flSenUncalled' },
  { when: '8 PM', win: ['20:00', '21:00'], sig: 'd', title: "Talarico tops Harris '24 in South Texas", means: 'Texas is in play', auto: 'talaricoSouthTX' },
  { when: '8 to 9 PM', win: ['20:00', '21:00'], sig: 'd', title: 'Florida governor still uncalled', means: 'A very good Democratic night', auto: 'flGovUncalled' },
  { when: '8 to 9 PM', win: ['20:00', '21:00'], sig: 'd', title: 'Hamilton wins Johnson County by 20+', means: 'Kansas is in play', auto: 'hamiltonJohnson' },
  { when: '9 PM', win: ['21:00', '22:00'], sig: 'd', title: 'Iowa farm-county turnout below 2022', means: 'Farm voters drifting from the GOP', auto: null },
  { when: 'By 10 PM', win: ['18:00', '22:00'], sig: 'r', title: 'Georgia governor called for Jackson before Atlanta reports', means: 'No wave', auto: 'gaGovEarlyR' },
  { when: '10 PM', win: ['22:00', '23:00'], sig: 'd', title: 'Abbott uncalled and his lead shrinking', means: 'GOP trouble in Texas', auto: 'abbottUncalled' },
  { when: '2 AM', win: ['26:00', '30:00'], sig: 'r', title: 'Senate control still unresolved', means: 'GOP beat the polls, or Alaska and Maine are pending', auto: 'senateUnresolved' },
  { when: 'Days', win: ['26:00', '99:00'], sig: 'g', title: 'Maine ranked-choice rounds; Alaska tabulation starts Nov 18', means: 'Either can hold control open', auto: null },
];

// ---------- Wisconsin Legislature (pages 13, 16, 31) ----------
export const WI_LEG = {
  senate: {
    seats: 33, up: 17, majority: 17, rating: 'Lean D', dHoldovers: 10, rHoldovers: 6,
    breakdown: { safeD: 4, leanD: 3, toss: 1, leanR: 1, safeR: 8 },
    summary: '17 needed · 10 D holdovers · 4 Safe D up · 3 Lean D up (SD-5, 21, 31) = 17 without SD-17',
    // seats up, ordered most D to most R (page 31): [district, margin label, rating]
    order: [[27, 'D+53.4', 'safeD'], [7, 'D+29', 'safeD'], [3, 'D+28.1', 'safeD'], [15, 'D+7.8', 'safeD'], [5, 'D+6', 'leanD'],
      [31, 'D+2.2', 'leanD'], [21, 'D+1.3', 'leanD'], [17, 'R+5', 'toss'], [25, 'R+13.8', 'leanR'], [9, 'R+15.9', 'safeR'],
      [29, 'R+19.6', 'safeR'], [1, 'R+20.6', 'safeR'], [19, 'R+26.2', 'safeR'], [11, 'R+28.3', 'safeR'], [13, 'R+31.3', 'safeR'],
      [33, 'R+34.1', 'safeR'], [23, 'R+36.6', 'safeR']],
    watch: [
      { d: 'SD-05', area: 'West Allis & western Waukesha Co.', rating: 'Lean D', held: 'R', dem: 'Robyn Vining', rep: 'Mike Roberts', pres: 6, baldwin: 5, money: ['$345K', '$284K'], inBy: 'Milwaukee Wed, Waukesha 11 PM', note: 'Open (Rob Hutton, R, retiring). Harris ran slightly ahead of Baldwin here; one of few such seats.' },
      { d: 'SD-21', area: 'Racine & southern Milwaukee Co.', rating: 'Lean D', held: 'R', dem: 'Trevor Jung', rep: 'Jim Croft', pres: 1.3, baldwin: 2.3, money: ['$2.08M', '$1.94M'], inBy: 'Racine Wed, Milwaukee Wed', note: 'Open (Van Wanggaard, R, retiring). Most expensive candidate race on this list.' },
      { d: 'SD-31', area: 'Eau Claire', rating: 'Lean D', held: 'D', dem: 'Jeff Smith (inc.)', rep: 'Michele Magadance Skinner', pres: 2.2, baldwin: 4.8, money: ['$191K', '$132K'], moneyNote: 'thru Jul 27', inBy: 'no county timing in guide', note: 'Jeff Smith, D. Only plausible GOP pickup per Johnson. Smith won 2022 by about 1 pt on old lines.' },
      { d: 'SD-17', area: 'Southwest WI: Platteville, Prairie du Chien', rating: 'Tossup', held: 'R', dem: 'Jenna Jacobson', rep: 'Howard Marklein (inc.)', pres: 1, baldwin: 4.7, money: ['$1.77M', '$1.55M'], inBy: 'Dane (part) 11 PM', note: 'Howard Marklein, R. Marklein has run 4 to 8 pts ahead of GOP statewide tickets.' },
      { d: 'SD-25', area: 'Superior & northwest WI', rating: 'Lean R', held: 'R', dem: 'Charly Ray', rep: 'Erik Severson', pres: -13.8, baldwin: -10.8, money: ['$131K', '$43K'], moneyNote: 'thru Jul 27', inBy: 'no county timing in guide', note: 'Open (Romaine Quinn, R, retiring). Severson beat Angie Sapik 54 to 46 in the Aug. 11 primary.' },
    ],
  },
  assembly: {
    seats: 99, up: 99, majority: 50, rating: 'Tossup',
    breakdown: { safeD: 44, leanD: 3, toss: 3, leanR: 3, safeR: 46 },
    summary: '50 needed · 47 Safe or Lean D · 3 Tossups: AD-88, 61, 51 (all R-held) · Democrats need all 3 for a 1-seat majority',
    watch: [
      { d: 'AD-88', area: 'De Pere', rating: 'Tossup', held: 'R', dem: 'Brandy Tollefson', rep: 'Ben Franklin (inc.)', pres: 0.4, baldwin: 1.3, asm: -0.7, money: ['$177K', '$66K'], inBy: 'Brown Wed' },
      { d: 'AD-61', area: 'Greenfield / Greendale', rating: 'Tossup', held: 'R', dem: 'Ben Brist', rep: 'Bob Donovan (inc.)', pres: 2.3, baldwin: 3.7, asm: -3.2, money: ['$149K', '$85K'], inBy: 'Milwaukee Wed' },
      { d: 'AD-51', area: 'Dodgeville', rating: 'Tossup', held: 'R', dem: 'Ben Gruber', rep: 'Todd Novak (inc.)', pres: 3.5, baldwin: 7.9, asm: -3.4, money: ['$233K', '$99K'], inBy: 'no county timing in guide' },
      { d: 'AD-21', area: 'Oak Creek', rating: 'Lean D', held: 'R', dem: 'Dan Bukiewicz', rep: 'Dylan Pfaffenbach', pres: 4.2, baldwin: 7.2, asm: -2.8, money: ['$309K', '$34K'], inBy: 'Milwaukee Wed' },
      { d: 'AD-53', area: 'Neenah / Menasha', rating: 'Lean D', held: 'R', dem: 'Becky Nichols', rep: 'David Daniels', pres: 4.4, baldwin: 6.3, asm: -1.2, money: ['$148K', '$39K'], inBy: 'no county timing in guide' },
      { d: 'AD-94', area: 'Onalaska / La Crosse', rating: 'Lean D', held: 'D', dem: 'Steve Doyle (inc.)', rep: 'Keith Purnell', pres: -2.2, baldwin: 0, asm: 0.6, money: ['$54K', '$31K'], moneyNote: 'thru Jul 27', inBy: 'La Crosse 11 PM' },
      { d: 'AD-85', area: 'Wausau', rating: 'Lean R', held: 'R', dem: 'John Kroll', rep: 'Patrick Snyder (inc.)', pres: -0.6, baldwin: 1, asm: -6.5, money: ['$208K', '$93K'], inBy: 'no county timing in guide' },
      { d: 'AD-30', area: 'River Falls', rating: 'Lean R', held: 'R', dem: 'Kevin Knoke', rep: 'Shannon Zimmerman (inc.)', pres: -4.5, baldwin: -5, asm: -8.5, money: ['$156K', '$74K'], inBy: 'no county timing in guide' },
      { d: 'AD-92', area: 'Menomonie / Chippewa Falls', rating: 'Lean R', held: 'R', dem: 'Jeremiah Fredrickson', rep: 'Clint Moses (inc.)', pres: -7.1, baldwin: -4, asm: -6.6, money: ['$54K', '$32K'], moneyNote: 'thru Jul 27', inBy: 'no county timing in guide' },
      { d: 'AD-89', area: 'Ashwaubenon / Green Bay', rating: 'Safe D', held: 'D', dem: 'Ryan Spaude (inc.)', rep: 'Bobby Lindsey', pres: 2, baldwin: 4.2, asm: 2.8, money: ['$163K', '$44K'], inBy: 'Brown Wed' },
      { d: 'AD-26', area: 'Sheboygan', rating: 'Safe D', held: 'D', dem: 'Joe Sheehan (inc.)', rep: 'John Belanger', pres: 2.7, baldwin: 4.8, asm: 2.9, money: ['$66K', '$38K'], moneyNote: 'thru Sep 23', inBy: 'no county timing in guide' },
      { d: 'AD-43', area: 'Janesville', rating: 'Safe D', held: 'D', dem: 'Brienne Brown (inc.)', rep: 'Paul McGraw', pres: 5.3, baldwin: 7.6, asm: 2.6, money: ['$63K', '$35K'], inBy: 'no county timing in guide' },
      { d: 'AD-91', area: 'Eau Claire', rating: 'Safe D', held: 'D', dem: 'Jodi Emerson (inc.)', rep: 'Bruce Stabenow', pres: 4.6, baldwin: 7.6, asm: 3.2, money: ['$158K', '$9K'], inBy: 'no county timing in guide' },
      { d: 'AD-96', area: 'La Crosse area', rating: 'Safe D', held: 'D', dem: 'Tara Johnson (inc.)', rep: 'Jim Green', pres: 8.4, baldwin: 11.9, asm: 2, money: ['$80K', '$7K'], inBy: 'no county timing in guide' },
    ],
  },
  outsideMoney: [['SD-21', 572], ['SD-5', 535], ['SD-17', 494], ['SD-31', 380], ['AD-21', 184], ['AD-85', 136]],
};

// ---------- State legislatures: seats now and the majority line (page 24) ----------
// [chamber name as in civicAPI, close, D now, R now, majority, note]
export const LEGISLATURES = [
  ['Vermont State Senate', '18:00', 16, 13, 16, 'all 30 up'],
  ['Maine State House', '19:00', 75, 73, 76, 'all 151 up'],
  ['Maine State Senate', '19:00', 20, 14, 18, 'all 35 up'],
  ['New Hampshire State Senate', '19:00', 8, 16, 13, 'all 24 up'],
  ['Pennsylvania State House', '19:00', 103, 100, 102, 'all 203 up'],
  ['Pennsylvania State Senate', '19:00', 23, 27, 26, '25 of 50 up'],
  ['Arizona State House', '20:00', 27, 33, 31, 'all 60 up'],
  ['Arizona State Senate', '20:00', 13, 17, 16, 'all 30 up'],
  ['Michigan State House', '20:00', 52, 58, 56, 'all 110 up'],
  ['Michigan State Senate', '20:00', 20, 18, 20, 'all 38 up'],
  ['Minnesota State House', '20:00', 67, 66, 68, 'all 134 up · tied'],
  ['Minnesota State Senate', '20:00', 34, 33, 34, 'all 67 up'],
  ['Texas State Senate', '20:00', 12, 18, 16, '16 of 31 up'],
  ['Wisconsin State Senate', '20:00', 15, 18, 17, '17 of 33 up'],
  ['Nevada State Senate', '21:00', 13, 8, 11, '11 of 21 up'],
  ['Oregon State Senate', '22:00', 18, 12, 16, '15 of 30 up'],
  ['Alaska State House', '24:00', 14, 21, 21, 'all 40 up · coalition'],
  ['Alaska State Senate', '24:00', 9, 11, 11, '10 of 20 up · coalition'],
];

// Tile-grid positions for the national map [col, row]
export const TILE = {
  AK: [0, 0], ME: [11, 0], WI: [6, 1], VT: [10, 1], NH: [11, 1],
  WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], IL: [6, 2], MI: [7, 2], NY: [9, 2], MA: [10, 2],
  OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IN: [6, 3], OH: [7, 3], PA: [8, 3], NJ: [9, 3], CT: [10, 3], RI: [11, 3],
  CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4], VA: [8, 4], MD: [9, 4], DE: [10, 4],
  AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5],
  OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
  HI: [0, 7], TX: [4, 7], FL: [9, 7],
};
export const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
