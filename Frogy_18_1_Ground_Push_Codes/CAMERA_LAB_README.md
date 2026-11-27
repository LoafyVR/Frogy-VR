# Frogy Camera Lab — Quest Test Sandbox

**TEST ONLY.** This is a separate copy of Frogy v16.6 plus an optional camera prototype; it is **NOT** the next official Frogy release.

Test root directory for a separate Render service:

`Frogy_Camera_Quest_Test_Sandbox`

Build command: `npm install`  |  Start command: `npm start`

Do **not** change the live Frogy Render root directory or use the live `DATABASE_URL`. Create a second Render Web Service for HTTPS Quest Browser testing.

In the VR menu: **X → CAMERA (TEST)**.

Modes: player POV, follow, selfie, tripod, left-controller handheld. Only records if you explicitly press START. For low-performance Quest 2, test ECO first.

After Stop, choose SAVE VIDEO in the VR menu; if blocked, exit VR and click DOWNLOAD LAST VIDEO in the launcher. MIC is OFF by default; optionally choose MIC ON to record your own microphone alongside the video. No game sound, other players' speech, or server uploads. **Saving to Meta Gallery is not implemented**; try the headset's Files/Downloads.

The original v16.6 release ZIP is unchanged. Code-level tests and desktop recording tests do not certify in-headset performance. See `Frogy_Camera_Prototype_Standalone/docs/QUEST_TEST_PLAN.md` in the other ZIP for testing instructions.

**Microphone testing:** Open CAMERA LAB, choose MIC ON, then START RECORDING to request permission. Save and play back the clip to verify that both audio and video are present. Camera recordings do not enter Meta Gallery automatically. When voice chat is already active, the recorder borrows its microphone stream but never stops or mutes voice chat. If microphone access is denied, video recording will not start until MIC is turned OFF. Quest behavior is not yet verified.
