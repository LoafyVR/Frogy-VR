# Frogy Camera Lab — Microphone v2 Quest Test Build

This is a **SEPARATE, EXPERIMENTAL** copy of Frogy v16.6, not an official game update. The camera is already integrated into this sandbox only. Leave the main Frogy Render service and its database unchanged.

## Test deployment

1. Upload `Frogy_Camera_Quest_Microphone_Test_v2` alongside existing Frogy folders through GitHub Desktop.
2. Create a **separate Render web service** using Root Directory `Frogy_Camera_Quest_Microphone_Test_v2`.
3. Build command `npm install`; start command `npm start`.
4. Use a separate sandbox account database or temporary local test profiles; **do not copy the production DATABASE_URL**.
5. Open the separate HTTPS test URL in Quest Browser and enter VR.
6. Open **X → SETTINGS → CAMERA LAB (TEST)**.
7. Select **MIC ON · YOUR VOICE**, then select POV, ECO, and START; allow microphone access if prompted.
8. Speak out loud for 5–10 seconds, STOP, then SAVE VIDEO. If blocked in immersive VR, exit VR and click DOWNLOAD LAST VIDEO on the Frogy browser launcher without reloading.
9. Playback the saved WebM using an app capable of WebM+Opus and verify the voice and picture. Then repeat for FOLLOW mode and while proximity voice chat is enabled.

## Important

- MIC OFF is video-only and does not ask for recording permission.
- The camera reuses a running Frogy voice-chat microphone track if enabled but does not activate voice chat or interfere with its lifecycle.
- If the mic disconnects or permission is denied, Camera Lab reports that rather than pretending audio is present.
- Previous clip stays saved if new microphone permission is denied.
- 90-second maximum clip; ECO 320×180 8FPS recommended for Quest 2.
- **Meta Gallery direct save, game sounds and friends' voice-chat audio are not implemented.** Downloads normally go to Files/Downloads.
- A physical Quest headset test is still required; automated tests cannot prove immersive recording or downloading works.

See `QUEST_CAMERA_TEST_PLAN.md` for detailed checklist.
