# FROGY v6.0 — Quest Browser / Render / WebXR

**This is the WebXR/Render project, NOT Unity.** This is source code for a multiplayer Quest Browser VR prototype, NOT a compiled Quest APK or Meta Store submission. Desktop and mobile browsers display a VR-only screen, not playable gameplay.

## Major v6 improvements

* **Separate starts:** Survivors appear close together on each map; the randomly selected Mega Frog begins on the opposite side. Every proposed start is checked against collision objects, with separate points for the survivor group.
* **Interactive detached parts:** Monster rip attacks and eliminations create server-synchronized, throwable head/arm props. Grip a dropped part near your tracked hand and release grip to throw it. Damped gravity, bouncing and swaying animations approximate soft-body jiggle physics. This is not a full rigid-body physics engine.
* **Weapons:** Rifle silhouette, longer barrel, stocks, magazine and sight; larger knife model with blade and handle. **Lily Blaster now hitscan to 55 m**, with rays starting near the tracked weapon/controller when a valid hand position is supplied. Cover can block hits. Gun/knife damage is tracked on the server. Weapon pickups require a nearby grip, and release drops the weapon.
* **Blood visuals:** Large bursts of stylized red droplets, stains that stay on the floor **until the next round**, and server-synchronized patches visible to other players. Local additional droplets can produce small blood marks. Nearby patches and particles are prioritized for headset performance; very distant decals are not drawn until you approach them.
* **Health:** HP is tracked on the game server (350 for the monster, 100 for regular frogs), never sent to players and no longer shown on screen. Weapon hits and arm separation reduce HP; elimination occurs when HP reaches zero.
* **Round flow:** 2-minute match; 32-second post-round intermission plus a 20-second vote/start countdown (defaults; configurable using environment variables). Open the in-game menu while playing to choose **Return to waiting lobby**. That player is locked out of the current match until the next round; while the round runs, **only lobby/wait and Settings tabs** are available—no dressing/shop menus.
* **Movement:** Preserves Gorilla Tag-style controller hand-push locomotion and A-button jumping with retained horizontal speed. Gravity/drag and input smoothing tuned, and the virtual hand contact plane adjusts to headset height. No joystick walking; optional joystick **turning** remains a settings option.
* **Visuals and sounds:** Extra map-specific props in swamp, cemetery, and factory, swooping blood particle effects, bundled original horror music, lobby music and interaction sound effects. In Settings, toggle music, sound effects, comfort and graphics, mute voice chat, and configure optional joystick turning.
* **Left controller menu:** Left X toggles in-game menu reliably when WebXR exposes that button; the three-lines/menu button is also supported **if Quest Browser exposes it**, but some headset systems reserve it. This cannot be guaranteed from JavaScript alone.

## Update your EXISTING Render installation on MacBook — safest method

1. Download `Frogy_Render_v6_Grim_Arsenal.zip` and unzip it by double-clicking in Finder Downloads.
2. Open your **existing** Frogy repository at github.com. Navigate to the **existing folder whose files** are currently referenced by Render Settings → **Root Directory** (the folder with `server.js` and `package.json`).
3. Replace the old `server.js`, `package.json`, `public` and `test` with the contents of the **new** `Frogy_Gore_Physics_v6` folder; commit changes to the same GitHub repository and branch. **Avoid nesting another folder by mistake.**
4. Do **not change Render Root Directory** if you replaced files in the existing root directory. In Render → your Frogy-VR service → Deploys, wait for automatic redeployment or use **Manual Deploy → Deploy latest commit**.
5. After **Live**, visit `https://frogy-vr.onrender.com` with **Meta Quest Browser** and enter immersive VR. A desktop/mobile browser intentionally cannot play it.

**Alternative:** If you intentionally upload the whole extracted `Frogy_Gore_Physics_v6` folder at your GitHub repository's top level, set Render → Settings → Root Directory to precisely `Frogy_Gore_Physics_v6`, then deploy the latest commit. Otherwise **leave your existing Root Directory unchanged**.

Render commands: **Build:** `npm install` • **Start:** `node server.js` • **Node:** 22 or later. The server must remain running for public/private online rooms.

## Quest controls

| Control | Effect |
|---|---|
| Arms push against the calibrated virtual contact plane or walls | Move / build momentum |
| Right A | Jump, keeping horizontal momentum |
| Left X | Toggle menu; three-lines button also if exposed by browser |
| Controller grip near ground weapon or fallen prop | Pick up item with that hand |
| Release same grip | Drop weapon or throw fallen body part |
| Right trigger while holding weapon | Fire blaster / swing knife |
| Monster grip away from a prop | Left rip / right chomp |
| Monster trigger | Punch |
| Monster B | Roar |
| Menu → Waiting Lobby | Sit out the *rest* of this round |
| Menu → Settings | Music, sound effects, mute, optional joystick turn |

## Data retention and known limits

* **Durable account saves need a database.** The optional `DATABASE_URL` PostgreSQL connection in `server.js` supports persistence between Render redeploys. On Render's default ephemeral filesystem, profiles, rewards and stats may be erased when instances restart; a browser token alone cannot restore a lost account. Voice chat is opt-in and may need TURN infrastructure on some networks.
* **No true soft-body physics or professional 3D assets:** detachments and splatter effects are stylized procedural WebGL approximation. The maps are unique and contain more props than before, but they are still **not photorealistic**.
* **Headset validation is outstanding.** Static tests, real WebSocket multiplayer tests, and syntax checks passed in the development environment. No physical Quest was available to measure FPS, haptic behavior, menu handling, or movement comfort. The game also still needs appropriate safety/privacy work, polishing and APK packaging to publish to the Meta Store.
* Keep a backup of your current GitHub commit to roll back if a Quest test reveals a bug.

## Test locally (for development only)

```bash
npm install
npm test
node server.js
```

Open `http://localhost:3000` on a computer to see the VR-only landing screen. Real gameplay requires Quest Browser with HTTPS hosting.
