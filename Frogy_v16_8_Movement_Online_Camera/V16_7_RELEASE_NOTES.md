# Frogy v16.7 — Camera + Mic + VR Stability

This is a single deployable game build, based on the Camera Lab microphone Quest stability hotfix. It merges:

- Frogy v16.6.1 locomotion stability: corrected room-scale/head tracking, reduced back-and-forth wobble from quick hand resets, headset-centered snap turning, smoother collision sweeps, and standing-height arm strokes for survivors and Mega Frog.
- Smaller first-person hands with the three-finger silhouette and removal of the bulb-shaped first-person torso/belly; full remote-player frog models remain.
- Camera Lab beta: POV, third-person follow, selfie, stationary/tripod, and handheld camera; screenshot and locally downloaded video recording.
- Opt-in microphone audio from the player's microphone, including compatibility handling for existing voice-chat microphones and denied/disconnected mic permissions.
- Prior v16.6 features, including melee weapons, medkits, physical tutorial, opt-in private-room Tadpole, cosmetics, and multiplayer.

## What remains unverified

Actual Quest 2/3 browser recording performance, Quest mic audio in saved files, Quest download handling, and comfort/stability after headset playtesting. Direct saving to Meta Gallery is NOT supported by this build.

## Deploy

Render Root Directory: `Frogy_v16_7_Camera_Mic_Stability`
Health endpoint: `/health` should report `16.7.0`.

## Camera controls

X menu → Settings → Camera Lab (Beta). Select mode and capture quality. MIC ON is opt-in. Permission will be requested before recording when needed. Test with a short clip first.

Do not include saved user profiles or secrets when replacing Render deployments; persistent profile storage still requires a properly configured database.
