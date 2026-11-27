# v16.10 validation results (classic movement restoration)

- JavaScript syntax checked: `server.js`, `public/game.js`, `public/movement.js`, `public/collision.js`.
- New rollback regression: PASS (`test/rollback-v15_4-short-strokes.test.js`). This checks v15.4 movement constants, the restored original contact/arm-stroke path, standing-height floor assist, and responsive 7–10mm strokes.
- Existing selected integration tests passed for multiplayer, sword pickup/drop, medkits, accounts, map geometry, VR menu, and related game features.
- Full historical regression suite: **36 pass / 14 fail out of 50 files**. Every one of the 14 failures begins with an expectation for a movement or collision implementation added after v15.4 that was intentionally rolled back (strict air-contact prohibition, modern speed stabilization/gates, or solid torso-body sweeps). These tests must be revised for the intentionally restored v15.4 physics; they are not being represented as passed.
- Live local server smoke test: `/health` returned `version: 16.10.0`, and `/api/online` was functional.
- Scope diff verified: changes from v16.9 occur only in movement-related client modules (`public/movement.js`, movement sections of `public/game.js`, `public/collision.js` handSurface) and package/version text + docs/tests. No server features or other gameplay modules changed, aside from version labels.

**Not tested:** Real Meta Quest hardware feel, motion comfort, and whether real short controller strokes produce the desired distance. Those still require headset playtesting. Note that v15.4 intentionally has no solid torso collider; the frog can pass through some structures. This is part of the requested rollback.
