# Frogy 18.1 — Test Results

- JavaScript syntax: PASS for all `public/*.js`, server.js, codes.js, economy.js.
- `v18_1_ground_codes_badge.test.js`: PASS — no-button planted floor, valid push, reject air, server HROHN/STOP, session reset on reconnect, TUFF save/equip and broadcast, code-only item.
- `v17_2_release_diagonal_fingers.test.js`: PASS — original approved push physics, diagonal push, no delayed flings.
- `v18_grounded_network_e2e.test.js`: PASS — remote paw visual ground flags.
- `v18_grounded_hands_visuals.test.js`: PASS — 150 rotated and curled paw cases.
- `v18_monster_camera_menu_e2e.test.js`: PASS — monster stun, disguise, camera tab, Rocket boost, current movement.
- `v18_voice_signal_and_mouth.test.js`: PASS — signaling and remote mouth values; hardware test still needed.
- `v16_4_medkit_e2e.test.js`: PASS — pickup/healing cap/monster restriction.
- `v16_6_weapon_private_e2e.test.js`: PASS — sword pickup and private Tadpole behavior.
- `v15_3_accounts_and_codes.test.js`: PASS — account persistence in test storage, recovery, legacy promo codes.
- `v13-network-codes.test.js`: PASS — server/rooms/old codes/health.

An unrelated legacy test (`v16_8_movement_online_camera.test.js`) still fails because it expects `stabilizeArmVelocity`, a removed pre–Frogy 17 API. The full historical suite was not claimed as passing.

Not tested on actual Meta Quest hardware: physical grounded-hand feel, 3D badge art in stereo view, microphone playback and camera recording.

### TKDYP session-code addition
- `node test/v18_1_tkdyp_session.test.js` — PASS: live multiplayer server validates TKDYP, concurrent HROHN, STOP clearing both, and reset on disconnect; client-side grapple readiness has no 7s delay with code active.
- `node test/v18_1_ground_codes_badge.test.js` — PASS: approved ground pushing and original HROHN/TUFF functions.
- `node test/v17_2_release_diagonal_fingers.test.js` — PASS: approved 17.2 hand movement remains intact.
- `node test/v18_grounded_hands_visuals.test.js`, `node test/v18_grounded_network_e2e.test.js`, `node test/v18_monster_camera_menu_e2e.test.js`, `node test/v18_voice_signal_and_mouth.test.js`, `node test/v16_4_medkit_e2e.test.js`, `node test/v16_4_medkits_weapons.test.js` — PASS.
- The older v16.1 / v16.9 test files still reference removed locomotion helpers and fail on the *unchanged* movement code; those are pre-existing test incompatibilities, not part of this update.
- Quest controller gameplay still requires real-headset verification.
