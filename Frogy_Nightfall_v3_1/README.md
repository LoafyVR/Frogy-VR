# FROGY — NIGHTFALL UPDATE v3.1 🐸

**Cute little survivor frogs. A horrifying Mega Frog. Giant dark maps.**

This is a **multiplayer WebXR prototype** for Meta Quest Browser, with desktop controls for testing. It is **NOT yet a native Quest APK or an approved Meta Horizon Store app**. Headset frame rate, hand collisions, microphone permissions and comfort must still be tested on real Quest 2 / 3 / 3S hardware. There is no guarantee of store approval.

## Brand update — Frogy (one G)

The game is now titled **Frogy**, spelled F-R-O-G-Y. Your uploaded logo is included unchanged in `public/branding/frogy-original.png`, and cropped to its transparent artwork bounds for the website header, lobby, in-headset terminal and app icons. The actual gameplay is based on Nightfall v3.

**Updating Render:** Use the *existing* GitHub repo and *existing* Render service. Upload these files **inside your currently configured Root Directory** (the directory containing `server.js` and `package.json`), replacing the previous files. Preserve any existing `.git` folder and production data. Then deploy the latest commit and refresh `https://frogy-vr.onrender.com`. You do **not** need a new Render service. Existing WebXR link remains the same unless you intentionally change it.

**Changing the Meta app name:** `manifest.webmanifest` will now display Frogy on an installed web app. If you created a separate Meta developer app called Frog Fright VR, you must change its *app display name* in Meta's developer dashboard separately; changing the source package does not rename an existing developer listing. This download is **source code, not an APK**.

## Nightfall features (from v3)

1. **Large, redesigned scary maps (~88 meters across)**: Rotwood Swamp (dark water, hanging trees and overgrown bog), Gravebell Cemetery (crypts, crooked trees, gravestones and ruined fences), and Hollow Creek Facility (abandoned lab, tanks, scaffolds and warning lights). Hundreds of procedural grass blades per map; drifting weather, gloom and distance fog. Map cover works as physical collision for the player and blocks the simplified blaster line-of-sight checks. Unlike the old candy map, these maps are intentionally dark and unsettling.
2. **Real PUBLIC matchmaking rooms**: select PLAY PUBLIC and the server joins an available public room. Two simultaneous players end up together. Rooms fill to 8 players; then a new public room opens. Private five-character code lobbies still work, including in-VR keypad and map voting. **This is room matchmaking on one server process, not geographically distributed servers or cross-server matchmaking.** A late joiner to an ongoing match spectates until the next round.
3. **More reliable cosmetic shop**: explicit pending state, buy receipts, failure reasons, balance and inventory refresh. Items bought with daily login coins are automatically equipped. The shop can be used through desktop clicks or the in-VR terminal. Server validates purchase amounts and ownership.
4. **1000 frog colors**: each red, green, blue channel has 10 positions, 0–9, yielding combinations `rgb-000` to `rgb-999`. Color selection is saved server-side and visible to other players, alongside the original preset palette. In VR use the +/− digital controls and APPLY button on the dressing tab.
5. **More expressive survivors / a terrifying monster**: round eyes that bulge when speaking, a wide moving mouth, cute feet, modeled freckles, hats and gloves; monster has a larger, scarred body, deformed mouth with teeth, red eyes, claws and spikes. Frog mouth movement is driven by local microphone volume when optional voice chat is enabled and transmitted with player movement. Voice chat itself is opt-in and remains experimental.
6. **Monster attacks**: trigger=punch, right grip=chomp, left grip=rip, B=roar. Survivor pickup weapons include blasters and knives. Elimination causes exaggerated *stylized* crimson splatter, bouncing detachments and round-long puddles — these are cartoon effects, not realistic anatomy/physics.
7. **Gorilla Tag–style VR movement** is still arm-driven: push controller hands into ground, stone cover, trees and walls to propel yourself. There is **no joystick walking in VR**; A (right controller button 4) jumps. Desktop WASD controls are only for testing without a headset. The prototype uses an approximate physics model and isn't Gorilla Tag's full collision system.
8. **2-minute rounds**, 16-second vote countdown, 18-second intermission. One survivor becomes the Mega Frog each round. Both private and public rooms can vote on the next map.

## Quick test on your Mac

Install Node.js 22 or newer. Unzip the folder, open Terminal in the folder containing `server.js`, and run:

```sh
node server.js
```

Open `http://localhost:3000` in a browser and select **PLAY PUBLIC**. Open another *private/incognito browser window* to join the same public room. If you want a private game, choose CREATE PRIVATE LOBBY and share the room code.

Desktop controls: WASD movement, mouse look (click 3D screen), Space jump, click/F attack, E chomp, Q rip and R roar as monster. VR controls: press A to jump, arms for travel, triggers for attack, left/right grip for rip/chomp, B for roar.

## Update your existing Render deployment from GitHub

You previously deployed the game on Render and got a live URL. **You do not need to make another Render service.**

1. Unzip this Frogy v3.1 project.
2. Open the **existing GitHub repository connected to your Render service**.
3. Find the folder where `server.js` and `package.json` currently live. If you set Render's **Root Directory** to a folder such as `frog_fright_quest_packaging 2`, use **that exact same folder**.
4. Replace the existing files with the **contents** of this Frogy folder, preserving directory layout: `server.js`, `package.json`, `public/index.html`, `public/game.js`, `public/features.js`, `public/voice.js`, `public/world.js`, `public/style.css`, etc. Do **not** put the v3.1 folder itself inside the old folder. Preserve your `.git` and any other repository setup.
5. Commit the changes. In Render, wait for its automatic deploy or choose **Manual Deploy → Deploy latest commit**.
6. Look for **Deploy succeeded / Live**. Visit your original Render URL and do a **hard reload** (Mac: Command-Shift-R) to clear older assets.
7. Use the **PUBLIC** matchmaking button on **two different browsers** to test room joining and the cosmetic shop. Check the big world, map voting and RGB slider. When able, test the Quest Browser VR session and movement on headset.

Render uses the start command `node server.js`, build command `npm install` and Node.js >= 22. No additional npm dependencies are required.

## Store readiness and limits

- This ZIP is **source code**, not an APK. Meta's dashboard will reject the ZIP. To publish, you need stable HTTPS hosting, VR verification, a signed compatible APK and Meta platform review.
- Public matchmaking is for **one server instance**, and rooms are held in memory. If you run multiple Render instances, players could end up on different instances without shared matchmaking; sticky routing/shared state would be required.
- Accounts use a browser-local profile token. Coins, outfits and color are saved in `data/profiles.json` on the running server, **not in a production database**. Render instances with ephemeral storage can lose this data on deploy/restart. Move to durable storage before public release.
- Voice chat uses WebRTC peer-to-peer with STUN and optional local pitch shifting; no TURN relay means some pairs will fail to connect. Server does not store recordings. Public voice needs mute, block, reporting, moderation, privacy policy and abuse handling before general release.
- **Not headset-tested**: WebXR controls, view, input mapping, visual quality and frame-rate are unverified on actual hardware. Dark fog, dense geometry and large maps might need optimization for mobile GPU performance.
- Combat and movements are not hardened against cheating. Damage, collisions and cover checks are simplified. The ragdoll splatter effect is intentionally stylized, not a realistic body-physics simulator. Moderate violence for store ratings and content requirements.
- This is not a live commercial game, and the code has not passed Meta's submission requirements yet.

## Tests

```sh
npm test
```

Tests exercise public/private room assignment and 8-player overflow, RGB validation, coins and shop receipts, map voting, voice signaling, pickups, attacks and automatic rounds. They do **not** replace testing in a real browser/Quest headset.
