# FROGY v6.3 — Controller & Lobby Rescue

**This is a Render/Node.js/WebXR source-code update, NOT a Unity project and NOT a Quest APK.**

## High-priority fixes

1. **Both VR hands:** The real tracked left and right controller poses drive visible frog hands directly. The previous version projected the visible paw down toward the floor, making it appear far below the controller and head. Floor contact now uses a separate, invisible extended probe. If the headset temporarily loses a right-controller grip pose, the client uses the right target-ray pose. If no pose is available at all, a muted placeholder is drawn near the right side of the body and a tracking warning appears; actual tracking still requires the Quest/controller to be functioning.
2. **Locomotion:** Planted floor/wall contacts move the frog's body in the opposite direction to the hand's movement. The contact range accommodates relaxed standing arms; raising the hands releases contact. Ground/air damping, jump momentum, and push defaults are adjusted. There is still NO joystick walking. The right thumbstick, if enabled in Settings, only turns.
3. **One-press menu:** Tap **X on the left controller** once to show the menu; it remains open until you tap X again (or explicitly press its Close button). Holding X does not retrigger it. A one-frame controller-tracking dropout does not count as releasing X. **A on the right controller** jumps. This is standard WebXR gamepad mapping and must still be verified in Quest Browser.
4. **Auto public lobbies:** After pressing **ENTER FROGY VR**, the player is automatically placed in the fullest available public lobby (8 players per room). Friends on the same Render server should be grouped into the same room until it is full. **SERVER HOP** on the in-headset POND menu moves to a *different* public room, creating one if needed. Private rooms and codes remain available. Server hopping is disabled during an active round unless already spectating/waiting.
5. **Scene optimization and extra lobby dressing:** More ambient lobby decorations, while distant map props use cheap silhouette LOD/culling to prioritize Quest frame rate. Existing swamp, cemetery, and facility maps and weapons remain. This is a procedural WebGL scene, NOT the photorealistic 3D art from the concept references.

## How to install in your existing Render game (MacBook)

**Method A: keep the same Root Directory** (recommended)

1. Download `Frogy_Render_v6_3_Quest_Controls.zip` and double-click it in Finder → Downloads.
2. Open your existing Frogy repository on GitHub.
3. Navigate **inside the folder Render already uses** (it contains `server.js`, `package.json`, `public`, and `test`).
4. Upload the **contents** of `Frogy_Quest_Controls_v6_3` into this folder, replacing matching files. Preserve the existing `data/` folder and any account files. Do **not** create an extra nested project folder.
5. Commit changes on GitHub.
6. Render → existing Frogy service → Deploys → watch the automatic deployment, or choose **Manual Deploy → Deploy latest commit**.
7. Once status is Live, open your existing URL in Quest Browser and reload if a previous version appears.

**Method B: upload the whole new folder to the top of the GitHub repo:** Render → Settings → **Root Directory** = `Frogy_Quest_Controls_v6_3`, Save, then Deploys → Deploy latest commit.

Keep **Build Command** = `npm install` and **Start Command** = `node server.js`. Use Node 22+. The service still needs persistent PostgreSQL `DATABASE_URL` (or a persistent disk) to save profiles, colors, purchases, coins, etc. across Render redeployments. This package intentionally contains NO player account data.

## What your friends should test on Quest (before making graphics upgrades)

1. Start the game in **Quest Browser**. Tap `ENTER FROGY VR`. Confirm you automatically appear in a public social lobby without selecting Public Match.
2. Hold BOTH controllers at your normal waist height. The frog's visible paws should be near the controllers, NOT at floor level. Look at the green floor contact indicators. Test both arms separately: push a planted paw backward ~30 cm, lift that hand slightly, reach forward, and repeat. The body should move forward.
3. Tap **left X** once, release it, then leave the menu open for several seconds. It should stay open. Tap X again to close. Open Settings to adjust **PUSH** and **REACH** if needed.
4. Tap **right A** while moving. Jumping should preserve forward momentum. Compare in lobby and a match.
5. Two headsets on the same server: confirm both frog characters and left/right hands are visible to each other. Use Server Hop to move into a separate public lobby, then have a third headset join to verify the fuller room fills first.
6. If the right hand remains a faded ghost and the menu reports RIGHT MISSING, check Quest controller pairing/tracking. The game cannot manufacture live pose data from an absent controller.

## Verification

- `npm test`: 14 test suites, including room/server hop matching, persistent profiles, health/combat, movement equations, hand positions, and X-menu debounce.
- Mock WebXR browser test: input loop, right grip-to-ray fallback, standing-height push, A jump, X menu toggle, and clickable Settings, with no client JavaScript errors.
- **Not tested:** actual Quest 2/3/3S hand tracking, comfort, visual FPS, and real 2-eye stereoscopic WebGL rendering. A physical headset test is still essential.
