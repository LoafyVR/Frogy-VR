# Frogy 17.2 beta — test results

- New `v17_2_release_diagonal_fingers.test.js`: PASS. Covers delayed fling after holding a contact still, fast 3D diagonal push, ground-vs-midair eligibility, crouch filtering, stable wall contact, grip/trigger finger swap, and real gameplay integration checks.
- Frogy 17 / 17.1 motion tests: PASS (`v17_original_locomotion_port`, `v17_1_no_air_pushing`, `v17_1_reverse_short_strokes`, `v17_1_speed_grapple_menu`).
- Game/feature compatibility spot checks: PASS for Frog hands/body (`v16_2_body_hands`), medkits (`v16_4_medkits_weapons`, `v16_4_medkit_e2e`), private rooms and sword pickup (`v16_6_weapon_private_e2e`), accounts (`v15_3_accounts_and_codes`), voice browser (`v15_4_voice_browser`), haunted map, combat physics, basic end-to-end, economy, no-first-person-bulb, and wall cling (`v10-wall-cling`).
- Two separate historical tests FAILED because they call APIs removed when Frogy 17 replaced the earlier movement engine: `v16_8_movement_online_camera` (`stabilizeArmVelocity`) and `v16_9_grounded_only_shared_grapple` (`strokeContact`). Those test files are unmodified.
- The full historical suite was started but exceeded the test execution time limit before completion. Other historical failures found so far also rely on obsolete pre-17 movement API/behaviors. A clean full-suite pass is **not** claimed.
- `node --check` verified current game/movement/server JavaScript syntax.
- HTTP smoke test: new server starts, `/health` reports `17.2.0`, and `/movement.js` is served.

**Not verified:** Real Quest controller tracking and the subjective feel of the hop/release. Keep it a beta until a headset tester validates it.
