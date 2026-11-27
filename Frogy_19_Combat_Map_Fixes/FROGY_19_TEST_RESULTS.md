# Frogy 19 — Automated results

Verified directly in the build:

- `test/v19_combat_map_unit.test.js`: pass — correct solid cover vs foliage, forgiving gun/sword hit volumes, visible VR UI wiring, and identical movement-file checksum.
- `test/v19_monster_health_network.test.js`: pass — 300 HP solo survivor, 470 HP three survivors, full-health medkit rejection, player positions are no longer projected into a conflicting server-side body collider.
- `test/v19_weapons_hit_network.test.js`: pass — a blaster and then sword both hit a live multiplayer monster; monster HP updates correctly.
- `test/v16_4_medkit_e2e.test.js`: pass — full-health refusal, healing without overheal, kit consumption and monster restrictions.
- `test/v16_4_medkits_weapons.test.js`: pass.
- `test/v18_1_ground_codes_badge.test.js`: pass.
- `test/v18_1_tkdyp_session.test.js`: pass.
- `test/v18_monster_camera_menu_e2e.test.js`: pass.
- `test/v18_voice_signal_and_mouth.test.js`: pass (network signaling only; headset audio still needs manual testing).
- `test/v17_2_release_diagonal_fingers.test.js`: pass.
- `test/v18_grounded_network_e2e.test.js`: pass.
- `test/v16_6_weapon_private_e2e.test.js`: pass.
- `test/v13-network-codes.test.js`: pass.
- `test/v11-collisions-grapple.test.js`: pass.
- `test/v17_1_speed_grapple_menu.test.js`: pass.
- `test/v18_grounded_hands_visuals.test.js`: pass.
- `test/auto-public-hop.test.js`: pass.

**Historical regression limitations:** Several older tests intentionally reference retired movement functions (for example `stabilizeArmVelocity` or `relaxedArmStroke`); these are not compatible with the approved Frogy 17.2 movement implementation. An old v15 test expects a fixed 520 HP monster and hidden monster HP, both intentionally replaced by the new scaling and overhead health bar. These historical tests were not treated as passes.

Actual Quest movement, gun feel, hand/controller tracking, and volume still require a headset playtest.
