# FROGY — Motion Rescue v6.1 (Render / WebXR)

**This is the existing Render/Quest Browser game, not Unity.** It is a source-code update, not a Quest APK. Desktop and phone gameplay remain disabled.

## Highest-priority repairs

1. **Lobby movement actually works.** v6.0 only simulated motion while a round was playing. v6.1 allows arm-push locomotion in the initial 3D lobby, pre-round countdown, intermission, and waiting hub. It still disables active-match locomotion while the match Settings menu is open. The separate waiting area is accessible to players sitting out a round without letting them re-enter combat.
2. **A jumps in the lobby and matches.** The previous jump function rejected lobby and menu-open states, which made the first VR session seem broken. The right-controller A button now works in the lobby even with the menu open. Horizontal momentum is retained on jump and a small ground-contact grace period helps avoid missed jumps.
3. **Natural standing-height arm pushes.** Enlarged the virtual ground-contact zone relative to headset height. Wall pushing is also available. Neither controller thumbstick moves the character; optional right-stick **turning** remains in Settings. Drag and impulse response were tuned for smoother motion and less position snapping.
4. **Both VR hands track at distant match spawns.** The server mistakenly clamped all world-space hand coordinates to only -14 to +14 meters, making hands disappear for players far from the center of a large map. Hand validation now uses the player's actual world position. WebXR grip pose temporarily unavailable? The client falls back to that controller's target-ray pose and reacquires tracking instead of hiding it immediately. The menu reports missing left/right tracking.
5. **Mitigations for one-eye startup glitches.** Both-eye rendering has separate viewport and scissor clears, error logging per eye, and a reduced XR framebuffer resolution and antialias cost. These are plausible render-performance mitigations, **not a verified cure** for the black-right-eye report. Only real Quest testing can establish that.
6. **A separate haunted pump-house lobby.** No longer superimposes the lobby computer, cosmetic shop, and dressing hut onto map geometry. The lobby has dedicated tiled ground, four walls, broken roof trusses, piping, worn planks, ambient lamps, moss, and distinct stations. Their collision zones, walkable spawns, and boundaries are shared between client and server to prevent props clipping into walls or blocking basic walking routes.

The prior v6 features remain: 2-minute rounds, public/private rooms, separate survivor/monster match spawns, swords/blasters, grabbable fallen parts, long-lived stains, spooky sound effects, coins/cosmetics, voice controls, and in-headset Settings. They remain experimental Quest Browser features.

## Updating the existing Render site on a MacBook

**Safest way — keep the current Root Directory unchanged**

1. Download **`Frogy_Render_v6_1_Motion_Rescue.zip`**, double-click it in Finder → Downloads, and open the extracted `Frogy_Motion_Rescue_v6_1` folder.
2. On GitHub, open your **existing** Frogy repository and navigate into the folder that currently contains `server.js` and `package.json`. That is the folder Render's **Root Directory** points to.
3. Replace that folder's old `server.js`, `package.json`, `public/`, `test/`, and `README.md` with the equivalent files/folders **inside** the new download. Upload/commit the changes to the same branch. Do not nest a new project folder inside the existing root by accident.
4. In Render → your existing **Frogy-VR** service → **Deploys**, wait for the automatic deployment, or click **Manual Deploy → Deploy latest commit**.
5. Once the deployment shows **Live**, visit **https://frogy-vr.onrender.com** using Quest Browser and enter VR.

**Alternative: upload the entire new folder at the TOP LEVEL of your repository.** In this case, navigate to Render → your service → **Settings → Root Directory → Edit**, enter exactly `Frogy_Motion_Rescue_v6_1`, save, and deploy the latest commit. This works only if the GitHub folder is actually at that location. Do not create another Render service.

Render settings: **Build Command** `npm install` • **Start Command** `node server.js` • Node.js >=22.

## Five-minute Quest test checklist

- Open Frogy in Quest Browser and click **ENTER FROGY VR**. Before entering a room, use both arms at natural waist/chest height to move in the haunted lobby, with the menu **still open**. You should not have to crouch to touch an imaginary floor.
- Press **A** on the right controller: you should jump. Press **left X** to close/reopen the menu; the three-lines button works only when Quest Browser exposes it to WebXR.
- Both hands should be visible. If one isn't, move or wake that controller and look for the in-menu tracking status; note whether the missing hand comes back.
- Enter a room and test moving with both hands while playing. Press A while moving to check retained momentum.
- Have another player verify that your **right and left hands** are visible, including when you spawn far across the map.
- Check **both headset eyes**. If one is black, tell us the exact headset model, Quest Browser version (if available), and whether re-entering VR fixes it.

## What was actually tested

- `npm test`: ten sets of Node tests covering room state, coin/cosmetic flows, lobby collisions, arm physics calculations, public matchmaking, combat, and server-side world-coordinate hand synchronization.
- Headless browser with a simulated WebXR input/render loop: validated that the lobby moves with the menu open, A generates a jump, the right controller falls back to its target-ray pose, and both logical eye-render paths complete without JavaScript errors. **WebGL was mocked in that test because no browser GPU context was available**, so this is not a graphics-quality or real Quest test.
- Checked the JavaScript syntax of client and server files.

**Known limitations:** Native Quest controller feel, actual stereo GPU rendering, first-run reliability and comfort remain unverified without hardware. The lobby is more detailed but still procedural, not photorealistic. Profiles need `DATABASE_URL` or a mounted persistent disk on Render to survive server resets. This is a WebXR prototype, not a Meta Store APK.

## Developer setup

```bash
npm install
npm test
npm start
```

The app serves a VR-only launcher at `http://localhost:3000` (or the `PORT` environment variable). For actual Quest VR play, host on HTTPS as you already do on Render.
