# Frogy v16.8 Test Results

- 48 test files exist under `test/`.
- Each test file passed when run individually or in selected batch runs. Includes browser/VR-only gating, Quest controller simulation, normal/monster movement, wall collision, grapples, weapons, sword pickup, medkits, multiplayer, NPC, account codes, voice, UI and the new v16.8 live player counter.
- Two older tests initially failed **outdated source-string expectations**: `quest-fixes` expected `autoJoinPond()` to directly precede XR animation (v16.8 inserts presence signaling); v16.6.1 stability expected the OLD headset-physical-wall collision behavior. Assertions were updated to check the intended new behavior; both passed.
- The v15.2 synthetic Quest movement handler initially reported that the new acceleration limit felt too weak on the very first 90Hz stroke; the limit was increased while retaining a cap. The test passed after this revision.
- The long-running `v15-name-combat-lily.test.js` exceeded a 9-second abbreviated timeout; its separate full run completed successfully (exit 0).
- The entire one-command regression suite was attempted but hit an execution-time limit before finishing. This release must NOT be described as a single clean uninterrupted `npm test` pass.
- The new v16.8 end-to-end integration test confirms real VR presence counting, site visitors excluded, NPC excluded, optional NPC tiny sway, and menu camera/mic integration.
- No real Quest 2/3/3S hardware test was available here; headset wobble removal, comfort, camera recording with microphone, and Quest download behavior all remain unconfirmed on device.

To reproduce: `node test/run-all.js` or individual `node test/<name>.test.js` from the version root. Use a local test server/environment, not production player data.
