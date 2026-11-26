# Frogy v17 movement-beta test report

- New GorillaLocomotion-inspired movement test: **PASS**.
- Ten selected movement + gameplay compatibility tests: **10 / 10 PASS**
  (new locomotion unit checks, old collision/grapple, weapons, medkits,
   private-room sword pickup, accounts, visual body, voice, public rooms).
- Full old regression script: **29 PASS, 22 FAIL (51 test files)**.
  Many old tests require intentionally removed movement APIs such as
  `strokeContact`, `stabilizeArmVelocity`, `relaxedArmStroke` and `groundPress`,
  or assert contradictory prior contact/collision policies. At least one
  older gameplay test also failed; full compatibility is NOT established.
- JS syntax: Node `--check` passed for modified movement/game/server files.
- **Physical Quest verification has NOT happened.** No claim of fixed wobble.

This report deliberately preserves the older regression failures instead of
artificially making tests pass by restoring the deprecated movement systems.
