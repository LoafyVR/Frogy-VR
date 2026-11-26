# v16.4 automated checks

- New pure-rules test: passed (weapon roster, 2 kits per map, capped healing, ray-vs-cover).
- New two-player server test: passed (full-HP rejection, injury/heal, kit consumption, monster cannot use).
- Previous `server.test.js`: passed after preserving original blaster spawn at map center.
- The 16 tests from `v15-name-combat-lily.test.js` onward: passed in a separate serial run.
- The earlier 25 tests passed before the single weapon-spawn regression was corrected.
- `npm test` in one command stalled in the test harness; it is NOT recorded as a clean combined pass.
- Hardware validation on a physical Quest and live Render deployment NOT performed.
