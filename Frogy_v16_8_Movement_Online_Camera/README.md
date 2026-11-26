# Frogy v16.8 — VR Movement Stability, Players Online, Camera Lab

Complete Meta Quest Browser WebXR multiplayer game built from v16.7. Version 16.8.0.

## Deploy
Copy the folder **`Frogy_v16_8_Movement_Online_Camera`** into the GitHub repo root using GitHub Desktop, push the commit, and set Render **Root Directory** to that folder name. Deploy latest commit. GET `/health` returns `version: 16.8.0`.

## What's new
- Motion stability: the headset's *physical* room-scale movements no longer reposition the whole virtual world as a side effect of collision resolution. Virtual arm-driven movement still stops at solid structures; intentional movement away from embedded geometry is allowed.
- Arm stroke acceleration limit for both survivors and Mega Frog, preventing a tiny tracking sample from causing a sudden multi-meters-per-second jolt. Monster maintains a modest speed advantage.
- Walls cannot kick the frog upward when the hand grazes a collider without actively holding the wall-cling trigger.
- Reduced local paw rendering scale to keep the player's view clearer (three digits remain).
- Optional private-room Practice Tadpole only makes a *tiny idle wiggle*, without hunting, attacks, or costly AI calculations.
- Main Enter VR page has a **Players Online** counter, updated every 6 seconds. It counts active immersive VR sessions in public/private rooms, excludes Tadpole, and expires missing heartbeats.
- Camera Lab remains available in **X → Settings → Camera Lab**, with POV/follow/selfie/tripod/handheld; MIC OFF by default, optional mic audio, downloads (not direct Meta Gallery).

## Notes
Movement tests are synthetic; the Quest 2/3/3S hardware playtest is still needed to verify the wobble is resolved. Camera + microphone recording and saving on Quest are still beta. This release does not include the future character redesign, LIV SDK, or direct Meta Gallery integration. Profile persistence requires correctly configured database/storage on Render.

See `V16_8_RELEASE_NOTES.md` and `QUEST_V16_8_TEST_PLAN.md`.
