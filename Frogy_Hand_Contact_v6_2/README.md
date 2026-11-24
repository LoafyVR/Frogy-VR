# FROGY — Hand Contact & Multiplayer Fix v6.2

**Render / Meta Quest Browser WebXR project. Not Unity and not a native APK.** Desktop/phone gameplay stays disabled.

## Why this update is different

The previous locomotion was only a height-based push calculation; hands were drawn at the controller position even when the code said they were on the floor. There was no stable physical surface contact. This version introduces a visible, planted virtual paw with short-lived floor and wall anchors. Moving the physical controller backward while its virtual paw is planted pushes your avatar forward. This is **experimental WebXR locomotion**, not the Gorilla Tag engine and not yet validated on a physical headset.

### Changes

- **Hands actually plant on virtual floors and solid surfaces** rather than visibly floating or penetrating every contact. Virtual arm length adapts to headset height, so relaxed arms can reach the floor without physical crouching. A soft green indicator shows paw contact.
- **Arm motion moves you in the lobby and match**, even when the Settings panel is open. No thumbstick walking was added. The optional right stick is only for turning.
- **A jumps**, preserves horizontal velocity, and briefly releases planted hands so the frog doesn't immediately stick to the floor on takeoff.
- **Left X toggles the in-headset menu.** The button is checked even if an XR hand pose temporarily disappears. Holding X does not flicker the menu, and trigger-clicks work using both WebXR event and gamepad-input fallback. The left three-lines hardware button is also used if Quest Browser exposes it, but Meta sometimes reserves it for browser/system behavior.
- **Settings** has adjustable **PUSH** strength and **REACH** height, along with music, SFX, muting, turning and comfort controls. Settings are saved on the headset.
- **Friends are rendered together in the same public/private room.** A remote player now receives both hand coordinates; short tracking dropouts don't instantly erase a hand. In the social lobby there is a small colored overhead locator for other frogs. Players who were eliminated reappear when intermission begins.
- Previous weapons, maps, cosmetics, audio, blood effects and room logic remain.

## Deploy v6.2 on your existing Render service

1. Download `Frogy_Render_v6_2_Movement_Menu_Visibility.zip` and double-click it on your MacBook to unzip.
2. Open your **existing** GitHub Frogy repository and go into the existing Render **Root Directory** folder—the folder containing `server.js` and `package.json`.
3. Replace the old `server.js`, `package.json`, `public` files, and `test` files with the equivalent contents **inside** `Frogy_Hand_Contact_v6_2`. Commit changes. **Do not upload the old data/profiles.json file**; it is intentionally excluded from this release.
4. In Render → your Frogy service → **Deploys**, confirm automatic deploy or click **Manual Deploy → Deploy latest commit**.
5. Once Live, open https://frogy-vr.onrender.com in **Meta Quest Browser** and enter VR. If you kept files in the same directory, **do not change Root Directory**.

**Alternative:** If you upload the whole new `Frogy_Hand_Contact_v6_2` folder to the top level of the repository, change Render → Settings → Root Directory to `Frogy_Hand_Contact_v6_2` and redeploy. This is unnecessary if you replace the existing files in place.

Render: Build Command `npm install`, Start Command `node server.js`, Node.js 22+.

## What to test on the headset

1. Load the page in Quest Browser. Both hands should be visible. Move hands naturally at waist height: the virtual paws should reach the floor and show a green contact marker. Pull one hand backward to move forward. Test with both hands, first **without joining a room**, then inside a room.
2. Tap **left X** once: menu closes. Tap again: menu opens. Point at **Settings** and click with the trigger. Adjust **REACH** higher if your hands cannot reach the floor and **PUSH** if movement is too weak/too strong.
3. Tap **right A** while moving: verify that you jump and keep gliding forward, without immediately getting pinned to the ground.
4. Have two people join the same public match or five-character private room. Confirm both frogs and their left/right hands appear in the lobby and game. Confirm eliminated frogs reappear when the round ends.
5. If any of those fail, report headset model (Quest 2, 3 or 3S), Quest Browser version if known, whether the left/right controllers are tracked, and whether the contact marker appears. This will isolate hardware mapping from physics bugs.

## Testing and limitations

`npm test` passes all twelve existing/new test suites for multiplayer rooms, persistence/shop, Quest-only gate, physics math, anchor behavior, X/A controller mappings, menu fallback, and two-player avatar state. A simulated WebXR input test also confirmed arm movement, jumping, both eye-render code paths, X toggling, a clickable Settings tab, and a right-hand target-ray fallback **without browser JavaScript errors**. Graphics rendering was mocked because GPU-backed WebGL was unavailable here. **A real Quest headset has not been tested.** Hand collisions approximate cylinders/walls and a flat ground plane; this is not mesh-accurate or guaranteed comfortable. Always test movement while standing in a safe clear play area.

Profiles/coins must use persistent Postgres (`DATABASE_URL`) or persistent disk on Render to survive restarts; this package deliberately does not ship any account files.
