# Frogy v16.9 Automated Verification

- Clean `node test/run-all.js`: **49 passed, 0 failed / 49 test files**.
- Includes an actual XR-controller-input simulation covering planted forward strokes, smaller ground-press hop, airborne hand-reset rejection, role parity, and synced hand placement (`test/v15_2_quest_push.test.js`).
- New regression `test/v16_9_grounded_only_shared_grapple.test.js`: passes standing accessible-floor contact, no airborne floor contact, actual wall push in air, no contact grace, A jump higher than hand launch, 7s shared B/Y tongue cooldown and safe, denser map spawns.
- Older tests revised only where their assertions explicitly depended on removed v16.8 airborne assist, phantom contact hysteresis, or independently resetting tongue; genuine movement, networking, weapons, cosmetics and camera regression tests remain active.
- `node -c` checks for the core game, movement, collision, world, grapple and server source: passed.
- The **Quest headset locomotion feel and real hardware contact tracking remain unverified**. This suite does not emulate the full Quest Browser/WebXR runtime. Use `QUEST_V16_9_MOVEMENT_TEST.md`.
