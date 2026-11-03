// DDHQ pre-election House margins, as printed in the Election Night Guide.
// Source: guide p. 29, "The 84 seats within 8 points, in order" (DDHQ forecast dated Nov. 1, 2026 per guide p. 23),
// plus DDHQ margins for seats beyond 8 points shown on guide p. 6. Margins are whole points (+ = Democratic).
// The guide states seat 218 is OH-09 (D+5); that fixes how many seats are safer than D+8 (see SAFE_D below).

export const FORECAST_SOURCE = { name: 'Decision Desk HQ forecast, as printed in the Election Night Guide', date: 'Nov. 1, 2026', pages: 'pp. 2, 6, 23, 29' };

export const CLOSE_84 = [
  ['CA-13', 8], ['NM-02', 7], ['AZ-06', 7], ['CA-22', 7], ['NV-03', 7], ['VA-02', 7], ['IA-01', 7], ['CO-08', 7], ['MI-07', 7], ['NJ-07', 7],
  ['OH-01', 6], ['WI-03', 6], ['TX-34', 5], ['AZ-01', 5], ['OH-09', 5], ['PA-07', 5], ['FL-14', 4], ['IA-03', 4], ['FL-25', 3], ['PA-10', 3],
  ['MI-10', 3], ['NY-17', 2], ['PA-08', 2], ['TX-35', 1], ['NC-01', 1], ['OH-07', 1], ['IA-02', 1], ['NC-11', 0], ['ME-02', 0], ['FL-09', -1],
  ['CO-03', -1], ['MT-01', -1], ['NY-01', -1], ['FL-22', -2], ['PA-01', -2], ['TX-15', -3], ['KY-06', -3], ['MO-02', -3], ['MI-04', -3], ['WI-01', -3],
  ['MN-01', -3], ['FL-13', -4], ['SC-01', -4], ['VA-05', -4], ['NJ-02', -4], ['FL-07', -4], ['FL-04', -4], ['AK-AL', -4], ['TX-23', -5], ['FL-16', -5],
  ['FL-27', -5], ['NC-03', -5], ['NC-07', -5], ['SC-02', -5], ['VA-01', -5], ['NY-02', -5], ['AL-02', -5], ['NV-02', -5], ['MN-08', -5], ['AZ-02', -6],
  ['AR-02', -6], ['NC-09', -6], ['NC-14', -6], ['FL-11', -6], ['OH-08', -6], ['AZ-08', -7], ['FL-21', -7], ['FL-08', -7], ['FL-18', -7], ['NC-13', -7],
  ['GA-01', -7], ['TX-24', -7], ['IN-05', -7], ['CO-05', -7], ['WI-06', -7], ['WI-08', -7], ['NC-10', -8], ['NC-06', -8], ['NC-05', -8], ['FL-02', -8],
  ['TX-32', -8], ['OH-15', -8], ['CO-04', -8], ['NY-21', -8],
];
// Seats with DDHQ margins beyond 8 points that the guide prints elsewhere (p. 6).
export const BEYOND_8 = [['IN-01', 14], ['OH-13', 11], ['OH-10', -11]];

// Seat 218 is OH-09, the 15th most Democratic seat in CLOSE_84, so 218 - 15 = 203 seats are more Democratic than D+8.
export const SAFE_D = 203;
export const SAFE_R = 435 - SAFE_D - CLOSE_84.length; // 148

export const DDHQ = Object.fromEntries([...CLOSE_84, ...BEYOND_8]);
