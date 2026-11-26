# Frogy v16.6 automated validation

- `npm test`: **45 passed, 0 failed / 45 test files** (clean full run).
- Specific simulated XR handler: upright survivor and Mega Frog pushes produce motion without requiring an invisible floor contact.
- New movement unit tests: immediate hand-return strokes no longer generate reverse movement impulses; lateral movement and monster speed advantage verified.
- New head-collision unit test: the true headset offset is included in wall sweeps, with the locomotion rig corrected consistently.
- New live two-player WebSocket test: private room starts without Tadpole and explains opt-in spawning; survivor picks up a sword, the original pickup disappears, and dropping it produces one new world pickup.
- Physical six-step tutorial: source-level hook/render checks verify presence of the lobby tutorial board and trigger navigation. **Not Quest-visual-verified.**
- Still **not verified on physical Quest hardware**: visual sword pose, movement comfort, actual wall/structure alignment, and multiplayer latency. The user-reported wobble must be retested using v16.6 after a confirmed deployment.
- Persistent Render profile storage is a separate configuration dependency: check `/health` for `profileStorage: postgres` and `databaseConnected: true`.
- The disregarded incorrect video was **not used** to diagnose the v16.6 release.
