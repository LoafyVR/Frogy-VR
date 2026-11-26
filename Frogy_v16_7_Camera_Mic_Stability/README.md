# Frogy v16.7 — Camera, Microphone & Movement Stability

Complete playable Frogy build with the v16.6.1 movement and first-person visual fixes and the previously separate Camera Lab microphone feature. The camera is a BETA feature until Quest playtesting confirms it works well.

## Deploy

1. Place the entire `Frogy_v16_7_Camera_Mic_Stability` folder at the repository root using GitHub Desktop; push the commit.
2. Set the Render service Root Directory to `Frogy_v16_7_Camera_Mic_Stability`.
3. Use `npm install` and `npm start` if Render asks for build/start commands.
4. Open `/health` on the deployed server and check `version: 16.7.0`.

## What changed

Read `V16_7_RELEASE_NOTES.md`. This build keeps the game systems from v16.6, the fixes from v16.6.1, and the POV/follow/selfie/tripod/handheld camera with opt-in microphone recording.

## Quest test

In Quest Browser, stand upright and check arm locomotion, wall slides, and snap turning before opening `X → Settings → Camera Lab (Beta)`. Then select POV, enable MIC ON if desired, record a 5-10 second clip, stop, download, and confirm it has video and voice. Try Follow mode afterward. Avoid long recordings until frame rate and memory use are checked.

Microphone recording and downloads are not yet confirmed on actual Quest devices. No direct saving to Meta Gallery. See `QUEST_CAMERA_TEST_PLAN.md` and `QUEST_STABILITY_SMOKE_TEST.md`.
