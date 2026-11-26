# Frogy 17.1 — Verified test results
Focused compatibility run: **11/11 passed**.

Tests:
- v17_1_no_air_pushing: PASS
- v17_1_reverse_short_strokes: PASS
- v17_1_speed_grapple_menu: PASS
- v17_original_locomotion_port: PASS
- v16_4_medkits_weapons: PASS
- v16_4_medkit_e2e: PASS
- v16_6_weapon_private_e2e: PASS
- v15_3_accounts_and_codes: PASS
- v10-network: PASS
- tracking-sync: PASS
- v10-wall-cling: PASS

Previous broader regression run did not finish cleanly; several historical tests still import retired movement APIs such as `relaxedArmStroke`, `strokeContact`, and `stabilizeArmVelocity`, and test the old `handSurface` API rather than the new `contactSurface`. Those failures have not been silently deleted or counted as passes.

A real Meta Quest playtest is still required.
