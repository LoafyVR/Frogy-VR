# FROGY — HAUNTED v4.0 (Quest Browser prototype)

**Frogy** is a multiplayer frog horror WebXR prototype designed for Quest Browser with desktop test controls. It is **not a signed Quest APK**, **not an approved Meta Horizon Store app**, and **not tested on physical Quest hardware**. Real headset testing is still necessary to validate hand-driven locomotion, grip controls, rendering performance, comfort, audio and voice chat.

## What's new in v4

- **Three genuinely distinct 130-meter-wide environments**: Rotwood Swamp has flooded channels, submerged paths, rotten wooden footbridges, hunting towers and stilt shacks. Gravebell Cemetery has a gothic ruined chapel with a bell frame, grave rows, ceremonial stone paths, an iron gate, boundary walls and crypts. Hollow Creek Facility has concrete floors, connected corridor walls, enormous industrial hangars, warning-striped vehicle lanes, pipework, lighting rigs and a reactor. These are original, procedural **stylized** 3D meshes; they are not photorealistic assets. Some large props are collision cover. Map votes choose the **next round**, not an instant midround switch; tied votes now prefer a different map when possible.
- **Original synthesized horror soundscape** with map-specific ambience and event sounds for menus, pickups, drops, footsteps/hand pushes, hits, combat, eliminations and monster activity. Players can toggle sound. Optional voice chat is experimental.
- **Heavier cartoon-horror effects**: blood-colored particles, ground stains, exaggerated frog pieces on elimination. No realistic human anatomy or real-life gore footage.
- **Explicit VR pickup controls**: squeeze either controller's grip near a glowing pickup to take a weapon; squeeze away from pickups to drop the held weapon; use the trigger to attack. A remains jump; locomotion uses physical arm pushes, not the joystick. Desktop testing: F to grab, G to drop, WASD/mouse to navigate.
- **Profile and lifetime stats**: same-browser name, color, owned cosmetics, coins, wins, kills and rounds are stored under a local profile token and held server-side. Existing local files can be lost on Render restarts—see database setup below. Profiles do **not** automatically follow you to a different browser or headset; account linking is not implemented.
- **Daily coins**: +40 coins can only be awarded after **24 full hours since the previous grant**, rather than at every login or every calendar midnight. Fresh profiles start with 90 coins and the first 40-coin reward becomes eligible after 24 hours. The lobby shows a countdown.

The project still has public/private multiplayer rooms with codes, map voting, 2-minute rounds, a randomly chosen mutant frog, weapons, a cosmetic shop, and 0–9 red/green/blue color codes (1,000 combinations). No real-money purchases are included.

## Update your EXISTING Render game (MacBook)

1. Download and unzip this package. The folder contains `server.js`, `package.json`, `public`, and `test`.
2. Go to the **existing GitHub repository** connected to your live Frogy Render service. Locate the actual folder that currently has `server.js` and `package.json`—it may be named `frog_fright_quest_packaging 2`, depending on your earlier Render Root Directory setting.
3. **Replace the contents of that folder** with the contents from this package. Keep the existing directory name and repository; do not create an additional nested `Frogy_Haunted_v4` folder. Ensure all new files inside `public` including `landmarks.js`, `detail.js`, `audio.js`, `world.js` are uploaded. GitHub's browser uploader is not always suitable for replacing entire folder trees; use GitHub Desktop or replace affected files individually if needed.
4. Commit changes. Render → existing Frogy web service → Deploys → wait for automatic deploy or choose **Manual Deploy → Deploy latest commit**.
5. When it says `Live`, visit `https://frogy-vr.onrender.com` and hard refresh with **Command–Shift–R**. You should see **FROGY v4.0**. Do **not** change Render Root Directory unless you intentionally uploaded the code to a different directory.
6. Open **PLAY PUBLIC** in two browsers to start a match. You can vote for a map while waiting. Changes appear in the *next* match. Use the map name shown in the game HUD to verify which one is active.

**Render build command:** `npm install`  
**Render start command:** `node server.js`  
**Required Node:** 22 or newer

## Keep profiles and coins across Render deploys

By default, coins/cosmetics/stats are stored in `data/profiles.json`. Render instances can use ephemeral storage, so this is **not a durable save** across restarts. Version 4 adds optional PostgreSQL synchronization. To use it, create a PostgreSQL database, add its secure connection string to the Render web service as the `DATABASE_URL` environment variable, and redeploy. The code will create a `frogy_profiles` table and persist user profiles. Do not publish the connection string, and back up any old user profiles before switching hosts. The browser's local profile token must also be preserved: private browsing, clearing local storage, or switching devices can create a new account. A login/account recovery system is a future task.

## Local development

```bash
npm install
npm test
npm start
```

Open `http://localhost:3000`. The automated tests verify lobby assignment, round timers, shop, cosmetics, color controls, a basic weapon-grab combat path, reward logic, and distinct map geometry. They **do not** measure Quest FPS or verify real controller behavior. Public rooms are on a single Node server instance and cannot transparently match across multiple instances. Voice calls may fail without a TURN service, and public voice chat requires mute/report/moderation and privacy safeguards before general release.

## Meta Store limitation

This is a **source-code ZIP** for your existing hosted game. It cannot be uploaded directly to the Meta Developer Dashboard as an app. To distribute a downloadable Quest app, the hosted WebXR game must be tested on real Quest hardware, packaged into a properly signed Quest-compatible APK with the required web-to-app linkage, then reviewed under Meta's content and technical requirements. No successful store approval is promised.
