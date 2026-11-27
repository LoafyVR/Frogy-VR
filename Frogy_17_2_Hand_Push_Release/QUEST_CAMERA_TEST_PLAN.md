# Quest 2 / Quest 3 test plan (not yet physically executed)

## Setup

1. Keep your existing production Frogy service and `DATABASE_URL` unchanged.
2. Upload the separately packaged `Frogy_Camera_Quest_Test_Sandbox/` folder with GitHub Desktop, create a **second** Render Web Service, and set its Root Directory to `Frogy_Camera_Quest_Test_Sandbox`.
3. Install dependencies (`npm install`) and use `npm start`. Do NOT share the production database; the sandbox only needs temporary test profiles.
4. Open your **new sandbox HTTPS URL** in Quest Browser; do not use the production Frogy URL for this test.
5. Enter Frogy, open the X menu, choose **SETTINGS → CAMERA LAB (TEST)**.

## Smoke tests

- [ ] In ECO, camera menu previews a view without causing obvious wobble or stutter.
- [ ] POV video tracks the headset: look left, right, up and down, then watch the file.
- [ ] FOLLOW shows your *own frog*, not just other players; walk and turn naturally.
- [ ] SELFIE shows the frog's face and arms without double-rendered hands.
- [ ] TRIPOD stays in one place while you walk away.
- [ ] HANDHELD follows the aim of the **left controller** as you rotate it in 3D.
- [ ] With **MIC OFF** (default), press START, record briefly, STOP; video should contain no sound and require no microphone permission.
- [ ] With **MIC ON · YOUR VOICE**, press START; accept the Quest Browser microphone prompt if it appears; count out loud, STOP, save, and listen to the clip to verify your voice is present.
- [ ] Deny microphone permission once; confirm the camera gives a clear failure message (not a silent recording labelled MIC ON).
- [ ] Enable Frogy proximity voice chat and record with MIC ON; confirm voice chat continues before, during, and after recording, and no other player's voice is in the file.
- [ ] Press START, close the menu, move, reopen, STOP. Clip becomes available.
- [ ] Press SAVE VIDEO. If it fails, exit VR and use the DOWNLOAD LAST VIDEO link (without reloading).
- [ ] Play the file and verify its video has frames, is not black, and lasts as expected.
- [ ] Press TAKE PHOTO and SAVE PHOTO; try the launcher link if the headset blocks the download.
- [ ] Confirm regular A jump, grips, climbing, tongue, gun, and menu toggle still work while NOT recording.
- [ ] Try ECO with another player in the room, checking that movement and voice still work.
- [ ] Compare headset comfort/FPS with camera idle, preview open, and recording active. Stop if nausea, freezes, or tracking stutter appear.
- [ ] If ECO is stable, optionally test NORMAL; revert to ECO if there is any stutter.
- [ ] Verify a generated video appears in Files/Downloads; **do not assume it appears in Meta Gallery**.

## Failure details to capture

Record Quest model, Browser version, test service URL, mode, resolution, any CAMERA LAB error message, whether the file appears in Downloads, and a short screenshot/video of the result. The prototype cannot certify Quest compatibility without that feedback.

**Audio note:** The microphone records your own speech only, not game music or other players. Recording is limited to 90 seconds; check that both audio and video playback work on the actual Quest.

## Microphone v2 additional checks

- [ ] Start MIC ON with voice chat off; consent to the microphone permission request.
- [ ] Speak and count to 10 in **POV**, stop and check that your voice and video are both audible/visible in the downloaded file.
- [ ] Repeat in **FOLLOW** camera mode.
- [ ] Start MIC ON and cancel when the permission prompt is pending; confirm it doesn't record in the background.
- [ ] Deny access to a new microphone request; check that the previous saved clip is still available.
- [ ] With Frogy voice chat enabled, record and stop; confirm voice chat still works.
- [ ] With MIC OFF, record without prompting for a microphone; confirm the file has no voice track.
