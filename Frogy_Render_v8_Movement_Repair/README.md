# FROGY v8.0 — Smooth Paws & Lobby Tutorial

**This is the Render-hosted WebXR/Meta Quest Browser game, NOT the separate Unity prototype and NOT a signed APK.** Desktop and mobile remain gated from playing.

## Summary

### VR movement (top priority)
- Replaced the previous world-space hand anchors with **tracking-space palm strokes**, removing the feedback loop where moving the avatar moved its own contact anchor and caused repeated corrections.
- Added hysteresis across briefly disappearing floor contacts, rejected impossible tracking/teleport spikes, capped single-frame speed, and blended velocity for momentum without multiplying it unexpectedly.
- Added a final post-physics correction so rendered hands and aiming rays remain at the correct headset-relative positions when gravity and collisions move the avatar.
- Keeps **arm-only movement**, natural-height floor contact, left-X toggle menu, right-A jump with momentum, and multiplayer hand synchronization.
- Existing push/reach sliders remain in Settings. Start with the default and adjust only after a headset playtest.

### Hands
- Reworked the in-engine frog paw into a rounded palm with **three curved fingers, toe pads, knuckles and webbing**. This is an original, lightweight procedural 3D model rendered by the project's custom WebGL renderer.
- We researched Quaternius's CC0 frog model at https://poly.pizza/m/37wofOCOzG and other CC0 hand models. They were not drop-in VR frog-hand meshes compatible with this no-engine renderer, so **no external 3D asset is bundled or represented as imported**. A GLB mesh loader + custom retargeting is a potential later update.

### Audio
- New original jump effect (soft frog hop with rising whoosh).
- Lobby music is quieter by default, cycles through three original tracks, and stops for a short silent break between clips; horror ambience also plays intermittently.
- Settings has **Music Level** (separate from SFX volume) and **Rotate Music** on/off, plus existing general Music and Sound Effects switches.
- No third-party copyrighted audio is bundled. Existing original synthesized files are retained.

### Menu
- Six tabs per row instead of five; the VR tab bar is exactly two rows high.
- Added text-width clipping and paginated the cosmetic shop so labels don't overlay other buttons or sections.
- Reorganized Settings to keep its controls inside the screen. Individual player muting remains in the Players tab; Mute All Voices is in Settings.

### Lobby
- Added a large **physical map-voting board** directly in the pump-house lobby, facing players at approximately world coordinates (0,2.0,-5.3). Close the menu with left X, point at a map's sign button and press trigger to vote. The existing menu voting still works.
- New players see a **three-step first-time tutorial** explaining arm pushing, A jumping, grip pickup, X menu, and map voting. Later, open **HELP** in the menu to see it again. Tutorial completion is stored in the current browser.
- Public auto matchmaking, private room codes, parkour, cosmetics, Crickets, Dabloons, daily quests, inventory, tools, friends, reporting, and game rules remain in the project.

## Deploy v8.0 to your CURRENT GitHub / Render service

1. On your MacBook, double-click `Frogy_Render_v8_Smooth_Paws_Tutorial.zip` to unzip it.
2. Open the GitHub repository that already hosts `frogy-vr.onrender.com`.
3. Locate the **directory Render currently uses** (the directory that contains `server.js`, `package.json`, `economy.js`, and `public/`).
4. Replace those source files and the **entire `public/` folder** with the **contents of `Frogy_Render_v8_Movement_Repair`**. Commit the updated files. Do **not** replace existing user data, tokens, the Render database, or `data/profiles.json`.
5. If the service didn't auto-deploy, use **Render → Frogy-VR → Deploys → Manual Deploy → Deploy latest commit**.
6. Wait for **Live**, then close and reopen the Quest Browser page at `https://frogy-vr.onrender.com/`. The scripts request v8.0 URLs to limit stale caches.

**Root Directory**: leave your existing Render root setting unchanged when replacing files inside that folder. If you instead upload the whole outer `Frogy_Render_v8_Movement_Repair` folder at the repository top level, set Render Root Directory to `Frogy_Render_v8_Movement_Repair`.

## Test locally (optional)

Run `node server.js` to start the web server or `npm test` to run the existing multiplayer unit tests and the v8 stable contact / vote-board tests. For a Render Postgres database, `npm install` first so the `pg` dependency is available.

## Real Quest check (required before release)

1. Test with Quest 2/3/3S while standing upright. Ensure the green frog hands stay attached to the controllers when pushing, without jitter or duplication.
2. Press down and pull each hand backward in the lobby, then release and repeat. Try pressing against the wall. Check that movement feels immediate and there are no jumps in position.
3. Press A while moving; it should preserve horizontal momentum. Open X menu while moving.
4. Check that shop, Settings and Help labels don't overlap, and play the three-step tutorial once.
5. With the menu closed, point at the physical three-map voting board and press trigger; verify the vote changes.
6. Check music volume and the periodic silence between clips; try Settings → Music Level and Rotate Music.
7. Test two frogs together for hand/character visibility, room counts and server sync.

**Limits**: Source-code tests pass but a real Quest hardware test and in-headset WebGL profiling haven't been completed here. The previous controller-input issue could still have device-specific causes. If it still glitches, record 10–20 seconds of headset footage and note Quest model, movement direction and whether hands are pressed against floor or wall.

**Data**: Player profiles require Render Postgres `DATABASE_URL` or another persistent Render data store. Do not publish tokens or database secrets in GitHub. This zip intentionally excludes `data/profiles.json`.
