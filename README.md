# Election Night 2026

A live companion to the 32-page *Election Night Guide 2026*. It pulls returns from
[civicAPI](https://civicapi.org) and puts them next to the guide's forecasts, county
targets, timing and tells, so you can watch the night unfold race by race.

**No build step.** It's a static site (vanilla ES modules) that calls civicAPI directly from the browser.

## Sections

| Tab | What it shows |
| --- | --- |
| **Overview** | What's closing now and next, Senate/House control bars with tier gauges (Riptide → Tsunami), Senate & governor tile maps, "running vs. the forecast" swing estimate, every statewide race card, auto-checked tells, first House reads, live feed of calls and lead changes |
| **Senate & Governor** | Per-state deep dive: live two-way result, DDHQ forecast, county benchmark table (2024 → tie target → live, implied statewide margin), the Senate tier bar, count-by-hour vs. 2024, "how the count could look". Texas adds Harris County / Big 5 / rural-share benchmarks |
| **House** | How big is the night (seat scale + flip signals), early-signal races vs. DDHQ ±3 bands, every seat on its Tide/Wave/Tsunami bar, Red Riptide tests, all 85 watch races with flip flags and filters |
| **Hour by hour** | The guide's timeline with live chips for every referenced race, auto-scrolls to *now* |
| **Counties** | The first counties to report vs. "state matches forecast" and "state is tied" targets |
| **Legislatures** | Wisconsin Senate/Assembly majority math with live seat strips, seats to watch, money; the 18 chambers on page 24 |
| **Count pace** | 2024 share counted by hour for 31 states next to tonight's % reporting |

## How the numbers work

- **Margins** are D minus R in points (Osborn counts as the D side in Nebraska).
- **County benchmarks imply**: each county's live margin minus its "to tie" target, averaged by vote share and reporting. That's the guide's uniform-swing logic, and it holds up better than the raw statewide margin when early and Election Day votes lean different ways.
- **Running vs. the forecast**: the weighted average of (result − DDHQ) across statewide races (via benchmarks) and House seats once 60%+ is in. It gets mapped through the guide's "every race misses by the same amount" curves (pages 28–29) to estimate Senate and House seats.
- **Tells** get re-checked on every refresh. Some can be checked automatically (NC call timing, Brown vs. 2024, Paxton vs. Abbott, Johnson County, etc.). Others are marked "check by hand".
- **Calls** are civicAPI's `winner` flags.

## Data files (single sources of truth)

- `js/data/closings.js`: poll-closing times for every state and split-zone district (The Green Papers, checked Nov 3, 2026). Every tab reads these.
- `js/data/houseForecast.js`: DDHQ district margins from the guide (84 seats within 8 points, p. 29) that drive the House scenario engine (`js/scenario.js`).
- `js/data/guide.js`: everything else transcribed from the guide.
- `js/status.js`: the shared status vocabulary (polls open, no votes reported, counting, tied, called, no race, results unavailable, loading, SIM).

The **Methodology** tab documents every source, date and assumption.

## Tests

```sh
node tests/model.test.mjs                      # calculations: 435-seat reconciliation, ties, third parties, retractions, holdovers, scenario curves, closing times, feed health
python3 -m http.server 8765 & node tests/ui.test.cjs   # browser: live feed, blocked feed, stale feed, rehearsal scenarios, filters, keyboard, cross-tab consistency
```

## Rehearsal mode

Click **Rehearse the night** (or open `?demo`) to run a simulated election night shaped like civicAPI data. Pick a scenario (random miss, near the forecast, Democratic or Republican overperformance, slow reporting, or a simulated feed outage from 8:20 to 9:10 PM), then scrub time and change speed. Everything simulated is labeled SIM. Open `?live` to switch back.

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

`.github/workflows/pages.yml` publishes the repo root to GitHub Pages on every push to `main`/`master`.
In the repo settings, set **Pages → Source** to **GitHub Actions** (one time).

## Data

- Race IDs live in `js/data/raceIds.js`, generated from civicAPI's race search for 2026-11-03.
- All guide content is in `js/data/guide.js`.
- Results: civicAPI (free, no auth). Attribution appears in the footer, as civicAPI's terms require.
