# FROGY 18 — RELEASE NOTES (2026-11-26)

**Status:** Quest beta; back up your older build and test before switching your live Render service.

## Movement safety
- The entire `public/movement.js` file is byte-for-byte the same as the approved Frogy 17.2 release (SHA-256: `4d469ebbcb25a448530235cf95e7ce4cc445c552f86f83298d2cac692866fc17`).
- This update does NOT retune survivor locomotion.

## Improvements
- Cosmetic grounded palms: ground-contact paws now align according to their actual rotated three-finger geometry rather than a fixed 13.5 cm height. Neither the tracked controller nor the locomotion collider moves.
- Other players and the third-person camera get floor-contact markers so that their larger paw models also rest on floors. Markers clear on release. Cosmetic feet stay down despite body-tracking lift.
- First-person arms visually connect below the head without adding a belly obstruction; remote/avatar arms connect to the torso.
- Joined/tapered frog fingers, not three disconnected balls; sword grip positioned to extend beyond the paw.
- Monster travel multiplier increased (monster-specific, not shared survivor movement); blue electric grapple attack stuns an unobstructed survivor for 3 seconds, with a 9-second cooldown.
- Monster disguise remains and ends after attack.
- Rocket boost gives a 16-second period where holding A rises, releasing A falls, and pressing A again can rise without touching the ground.
- Camera has its own VR menu section, with POV, follow, selfie, tripod and handheld selfie-phone/park mode; optional microphone recording.
- Voice signaling sends microphone amplitude to remote talking mouths and to the local camera avatar. Requires actual Quest hardware test for end-to-end playback/permissions.
- Existing multiplayer, weapons, medkits, maps, online counter, cosmetics and account systems are retained.

## Verification
- Frogy 17.2 movement code SHA exactly matched.
- 150 combinations of mirrored hands, curl states, paw model sizes, and rotations passed geometry-grounding tests.
- Live two-player networking test verified floor placement metadata and clearing it on release.
- New Frogy 18 multiplayer test passed electric attack, 3-second stun, disguise, and 16-second Rocket activation.
- Frogy 18 voice-signaling test passed; real microphone audio remains Quest-untested.
- JavaScript syntax checks passed.
- The historical full suite was run before the newest network-ground test was added: 35 passed, 23 failed. The failures are mostly legacy movement and test assertions, not evidence of passing full regression; investigate any gameplay regressions seen on headset.

## Deployment
Unzip and upload the whole `Frogy_18` directory at the repository root with GitHub Desktop. Render Root Directory: `Frogy_18`.
Build: `npm install` / Start: `npm start`. Check `/health` for version `18.0.0`.
This ZIP excludes test player profiles and credentials. Persistent account storage on Render still requires configured PostgreSQL (`DATABASE_URL`) or a verified persistent disk.
