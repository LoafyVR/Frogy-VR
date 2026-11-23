# 🐸 FROG FRIGHT VR — Multiplayer frog horror party game (v0.2)

Cute frogs, terrifying friends. **A playable WebXR + desktop multiplayer prototype**, written in plain JavaScript using a dependency-free Node.js WebSocket server. It is **not** a native Quest APK. Your friends must all connect to the same hosted server URL and enter the same five-character code.

## What's included

- **2–8 players in private rooms**, hosted by a Node.js WebSocket server. Make a new room or join by code in the home screen or the in-lobby **Ribbitron 3000 computer**.
- **Random Mega Frog each round**, survivor weapon pickups (Lily Blaster / Toad Slicer), monster punch / chomp / roar, goofy cartoon splats and bouncing frog pieces.
- **Gorilla Tag–style experimental arm-push locomotion** in VR: pushing tracked hands against floors, outer walls and level obstacles propels the player. This is an approximation, not full hand/capsule collision physics.
- **A-button jumps** on the Quest right controller. Movement also works via WASD on desktop for testing.
- **Two-minute rounds**, 16-second pre-round voting countdown and 18-second intermission. The countdown appears on the lobby panel, on the in-VR floating computer, and in-game in the VR HUD.
- **Map voting** by all players before every round. Three procedural themed arenas: Mossy Marsh, Moonlit Graveyard, Candy Caverns.
- **Cosmetics shop with 11 items**: mushroom cap, crown, party hat, wizard hat, bow, glasses, star shades, mustache, wings, cape and backpack. Wear purchased items on your 3D frog avatar.
- **Free frog recoloring and a dressing hut** with a changing mirror in the lobby arena. Choose color and equip or unequip purchases from the **DRESS UP** menu.
- **Daily login coin bonus**: 90 starter coins + 40 coins per UTC calendar day you visit, including the first day (130 total initially). Cosmetic prices are paid in imaginary in-game coins, **not real money**. Shop transactions, balances and inventory are validated server-side.
- **Optional peer-to-peer voice chat** with a locally processed higher-pitched silly voice for small frogs and deeper, filtered voice for the Mega Frog. Voice chat is OFF until microphone permission is accepted. Mute/unmute from lobby or game HUD. Audio is not saved or recorded by the game.
- **In-headset lobby menu:** point at the floating computer with a controller and press the trigger. Vote for maps, buy cosmetics, change color, cycle outfits, switch voice on/off, and type room codes using its VR keyboard.

## Start a local server (desktop)

1. Install **Node.js 22+** from https://nodejs.org/.
2. Unzip the game and open a Terminal or Command Prompt **inside the folder containing `server.js`**.
3. Run `node server.js` (or `npm start`).
4. Open **http://localhost:3000** on the same computer.
5. Open another browser or a private window. Create a lobby in the first window, and enter its room code in the second window. Two players trigger a match countdown automatically.

**Important:** You can't launch this multiplayer game by double-clicking `index.html`—it needs its Node.js server. Static-only hosts (including GitHub Pages) will not run private room multiplayer.

## Play in a Meta Quest 2/3/3S

1. Deploy the **whole Node.js application** to a host that supports long-running Node.js processes, **WebSocket connections, and HTTPS** (e.g. a Render Web Service).
2. The host must run `node server.js` and expose the host-provided port through the `PORT` environment variable. (The app reads `PORT` automatically.)
3. Open that HTTPS URL in **Meta Quest Browser**. Join a room, then select **ENTER VR**.
4. Your friends need to visit the **same HTTPS server URL**, use the same private room code, and join the match.

WebXR and microphone capture usually require an HTTPS secure context (except for `localhost` testing). An arbitrary LAN `http://192.168.x.x:3000` URL isn't generally secure enough for Quest WebXR. This game has not yet been tested on a physical Quest headset; controller mappings and comfort need testing/tuning there.

### Quest controls

| Controller action | Effect |
|---|---|
| Swing arms / push into floor, walls, or pillars | Experimental Gorilla Tag–style locomotion |
| **Right A (button 4 in standard Quest WebXR mapping)** | Jump |
| Either trigger during match | Use weapon / Mega Frog punch |
| Either grip as Mega Frog | Chomp nearby frog |
| Right B as Mega Frog | Roar / shockwave (8-sec cooldown) |
| Trigger on floating lobby menu | Select menu button, pick map, buy item, or type room code |

### Desktop controls

| Key | Action |
|---|---|
| WASD, mouse after clicking arena | Walk and look |
| Shift, Space | Sprint, jump |
| Left click or F | Attack |
| E, R as Mega Frog | Chomp and roar |
| Escape | Release mouse pointer / return to menu tab |

## Coins and player saves

No username, email, password, or account-registration system is required. Instead, the server generates a long secret player token, stored only in that **browser's localStorage**. It is linked to server-side account data saved at `data/profiles.json`. This file is created on first run and updated for purchases, logins, equipment, and color selection.

**If you clear browser storage or move to another device, you may not be able to access the same wallet without transferring the token.** Back up `data/profiles.json`; if your cloud host uses an **ephemeral filesystem**, coin balances/outfits can reset when the host restarts. Use persistent server storage for a long-running public game. This is a lightweight economy, not a hardened production account system.

## Voice chat & privacy

Voice uses WebRTC peer-to-peer audio plus a simple Web Audio pitch-shifter running on receiving devices. All frogs remain audible in the private room if they opt in, and the monster's voice changes as roles change. No sound is stored by this code. **Microphone use is opt-in** and can be muted at any time. For cleaner audio, use headphones and avoid testing with two live microphones on the same speakers.

Peer-to-peer calling uses a free public STUN server. **No TURN relay is included**, so connections across some networks or firewalls will fail. The browser may also block microphone use in VR, or lack AudioWorklet/WebRTC support. Robust commercial voice chat requires TURN infrastructure, moderation and additional testing.

## Technical scope / limitations

- Procedural WebGL graphics (no 3D assets or npm dependencies); optional fonts are fetched from Google Fonts when online.
- The frog disassembly effect is **exaggerated cartoon ragdoll particles**, not realistic anatomical gore or a rigid-body physics engine.
- Networked player movement and combat are prototype-grade; movement can be exploited and shots do not accurately collide with all covers. Do not use unmodified for a public competitive game.
- A room code is a convenience, not an authentication boundary. There is no user reporting, moderation, block list, anti-cheat, or matchmaking directory.
- Each Node process holds its own rooms in memory, so use a single running server instance unless you add a shared room service.
- For Quest comfort, expect to tune arm velocity, gravity, world scale and collision response on hardware.

## Test the multiplayer backend

Run `npm test` with Node 22+. Automated integration tests cover private codes, two-player rounds, monster assignment, weapon pickup, combat, round timers, coin grants, saved purchases, wardrobe items, color changes, map voting and WebRTC **signaling**. The tests don't guarantee WebRTC audio quality, headset VR rendering or headset comfort.

## Source files

- `server.js` — Node HTTP/WebSocket server, rooms, attacks, timer, map votes, coins, wardrobe persistence and WebRTC message relay
- `public/game.js` — WebGL/WebXR arena, frog models, cartoon effects, movement and combat controls
- `public/features.js` — lobby shop, dressing hut, cosmetic 3D props, touch/trigger-operated in-headset computer
- `public/voice.js` & `public/voice-worklet.js` — optional microphone chat and pitch effects
- `public/index.html` & `public/style.css` — desktop menus and lobby
- `test/` — multiplayer integration tests


## Meta Quest APK packaging preparation

This source package now includes `public/manifest.webmanifest`, launcher icons, immersive PWA auto-entry and pre-room VR create/join buttons. It is not an APK. Follow `START_HERE_FOR_APK.txt` to host it and generate a signed Quest APK with Meta Bubblewrap.
