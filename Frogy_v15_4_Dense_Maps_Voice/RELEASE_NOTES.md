# FROGY v15.4 — Denser Maps / Voice Fallback / Blood Pour

See README.md and QUEST_TEST_CHECKLIST.md for details. No physical Quest verification is claimed.

# Frogy v15.3 — Arm Rip, Faster Running, Public Codes and Profile Recovery

**Base:** Full Frogy v15.2 source. All v15.2 features and the Lucky Lily removal retained.

### Game updates
- Ripped arms now visibly tear away from the shoulder, tumble and fall as shared physics objects, bounce on the ground, and retain a three-finger paw. Corresponding attached limbs disappear, shoulder wounds and blood splatter render, and round-long stains remain.
- Ordinary frog movement gains old-Swift-Legs-style speed; Swift Legs itself provides an additional 55% boost.
- All previously developer-only promotion codes are redeemable by everyone, including the repeatable 10,000/10,000 `DJHQW` code. Real moderator actions still require a server-side allowlisted public ID, preventing public code redemption from granting kick permissions.

### Accounts and progress
- Improved live updates for win/kill/round stats.
- Secure, hashed, rotating recovery-code workflow from the Quest Browser launcher and in-headset ACCOUNT menu.
- Backward-compatible token login; local snapshot-to-PostgreSQL migration when old snapshot remains available; buffered database write flushing on SIGTERM; `/health` now reports `profileStorage`.
- **IMPORTANT:** Database persistence requires the user to configure `DATABASE_URL` or a genuinely persistent disk in Render. Without that, deployment may erase accounts. Render Free PostgreSQL expires after 30 days and is not long-term retention.

### Checks
- 34 test files, including new v15.3 arm/running and login/recovery/restart tests, passed in two test batches.
- No real Meta Quest movement, arm rendering, or live Render/PostgreSQL integration test was possible here. Do not claim hardware/deployment verification.
