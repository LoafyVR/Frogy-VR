# FROGY v15.4 — Dense Horror Maps, Clearer Voice, Improved Running

This is the **complete existing v15.3 WebXR/Render game**, upgraded in place. It is not a Unity rewrite. The Frogy logo, multiplayer/public-private rooms, NPC practice, maps, parkour, cosmetics, two-currency economy, daily quests, inventory, shops, friends, weapon handling, and the earlier Lucky Lily removal are retained.

## New in v15.4

- **Denser haunted maps are the priority:** Rotwood now has ~234 solid cover props, Gravebell ~260, Hollow Creek ~256. These are server/client-shared obstacles that block lines of sight and blaster shots. Their layouts stay distinct. Distance fog is thicker, and **overhead player nameplates are hidden during actual matches** so the monster and survivors really have to search. Far geometry switches to simplified shapes; measure Quest FPS before inviting larger public rooms.
- **Voice and talking mouths:** Both users must opt into voice and grant microphone access. The microphone is requested **before** loading the optional frog-pitch AudioWorklet; if the effect fails, voices still use **clear WebRTC audio**. A silent meter sink allows speaking amplitude to animate mouths, and the lobby/VR menu gives connection feedback. **Voice still requires real headset permissions and network connectivity; WebRTC may require a TURN relay to work across different networks.** No headset voice test has been completed.
- **Optional TURN setup on Render:** If voice works on the same Wi-Fi but fails across networks, supply `FROGY_TURN_URL` (e.g., `turns:your-turn-host:5349`), `FROGY_TURN_USERNAME` and `FROGY_TURN_CREDENTIAL` under your existing service's Environment variables. Use your own TURN provider; the game does not include TURN hosting. Credentials are delivered to browsers by necessity, so use temporary/time-limited relay credentials and provider limits. Never use your Render database password for TURN.
- **Blood pours after severing:** Detached limbs still fall/bounce. Continuous shoulder droplet streams and repeatedly replicated ground blood marks appear until the survivor dies/bleeds out; the `effects` and `graphics` options cap this for Quest performance. Server-side stains persist for that round.
- **Smoother standing locomotion:** When virtual contact detection misses, genuine lower-arm controller swipes provide a limited fallback in **both lobby and live rounds**. No joystick locomotion and no fake hands; hand tracking spikes are rejected. The v15.3 Swift Legs bonus and A jump remain in place.
- **Mega Frog:** Loses tongue grappling during a match, has lower gravity and increased punch/rip/chomp damage, and retains faster running and auto-hopping. Survivors retain tongue and timed wall cling in the live maps.
- **Controller remapping not included:** The proposed v15.5 X/Y mirror scheme is documented in `NEXT_CONTROLS_PROPOSAL.md` for owner approval. Current X-menu, A-jump, grip-to-grab, trigger-to-attack/cling stay unchanged in v15.4.

## Prior v15.3 changes retained

- **Monster rip:** A severed left or right arm now separates from the shoulder, **falls under gravity**, spins/bounces on the ground, and is shared over the network. Its three-finger paw remains attached to the physical prop; the victim's corresponding visible arm and paw disappear. Shoulder wounds and blood splatter appear, with blood stains persisting through the round. Death no longer creates duplicates of previously ripped arms. No physical Quest headset test yet.
- **Movement:** Regular Gorilla Tag-style arm strokes now use approximately **1.8× the previous movement force and speed cap**, making normal motion feel closer to the old Swift Legs. Buying and activating **Swift Legs** provides an additional **55% speed boost** (on top of the new baseline). Still entirely arm-driven, not joystick walking. User-configurable arm power and reach are retained.
- **Promo codes:** `FROG`, `FREE`, `EMPSH`, `DJHQW`, and `IHVDL` can all be redeemed by anyone. One-time codes remain one-time; **`DJHQW` remains repeatable** and gives 10,000 Crickets and 10,000 Dabloons each use, so **publishing this code openly will let anyone generate unlimited currency**. The `OWNER`/`MOD` code titles are available to all, but **real kick/moderation permissions** remain protected by server-side `FROGY_DEV_PUBLIC_IDS` / `FROGY_MOD_PUBLIC_IDS` allowlists. `NPC` is still restricted to private-room solo practice (not a developer check).
- **Player progress:** Player balances, rounds/kills/wins, purchased cosmetics, equipped appearance, purchased tools, friends, and unlocked titles are saved by the server. Live player stats refresh immediately on event instead of appearing out of date. Existing session tokens in Quest Browser localStorage remain compatible.
- **Account backup:** Open **ACCOUNT** in the Quest menu or **Save or restore my Frogy account** from the Quest Browser launcher. Generate a secret recovery code in the form `FROG-XXXX-XXXX-XXXX-XXXX` and store it privately. If you lose browser storage or switch headsets, restore with that code. **Recovery codes are saved as hashes, and every successful restoration rotates the code**; save the newly displayed code. If the server has already lost the account record, a recovery code cannot bring it back.
- **Data safety and visibility:** `/health` reports the version and profile storage configuration. The launcher/lobby warns if the game is saving only on temporary server storage. The code supports Render PostgreSQL using `DATABASE_URL` and will import profiles from an old `data/profiles.json` file if that file is still available when the database is initialized; existing database records always take precedence.

## CRITICAL: Saving progress permanently on Render

**Downloading or deploying this ZIP alone does not make player profiles permanent.** Render web services normally use an **ephemeral filesystem**. Player data in `data/profiles.json` can disappear after a restart or deployment unless you have configured persistent storage.

**Recommended: Render Postgres in the same region as your existing web service.**

1. In the Render Dashboard, check whether the **existing Frogy-VR Web Service** already has a `DATABASE_URL` environment variable. If it does, **do not replace it**; verify its database is active and retained.
2. If it does not, create a Render Postgres database (Dashboard → **+ New → Postgres**), preferably a **paid instance** for durable long-term storage. Render's **Free Postgres expires after 30 days**; it is **not** permanent storage.
3. Open the database's **Connect** menu and copy the **Internal Database URL**. Your database and web service should be in the same region.
4. In your existing Frogy-VR Web Service → **Environment**, add **Key:** `DATABASE_URL`, **Value:** the database's private **Internal Database URL**. Save and deploy. **Never add the URL/password to GitHub, Discord, or this ZIP.**
5. Open `https://frogy-vr.onrender.com/health` after deployment. The response must include `"version":"15.4.0"`, `"profileStorage":"postgres"` and `"databaseConnected":true`. If it says `"ephemeral"`, **balances and purchases are not reliably saved across Render restarts**. `"configured-disk"` merely means `FROGY_DATA_DIR` was set; you must independently verify a mounted persistent disk exists.

**Protect existing progress:** Merely connecting a new database or redeploying can restart the current Render instance. If old accounts live **only** in its ephemeral `data/profiles.json`, a restart may delete them *before* the game can migrate them. The upgrade can import only an existing file that is still accessible. Make a backup/export of existing account data *before* restarting if at all possible. Do not assume any update can recover already-deleted records. Do not place `data/` or player tokens in the GitHub repo or source ZIP.

Render docs: https://render.com/docs/postgresql-creating-connecting and https://render.com/docs/free

## Install v15.4 into the EXISTING GitHub + Render app

1. Download and unzip `Frogy_Render_v15_4_Dense_Maps_Voice.zip` on your Mac.
2. Open the **existing Frogy GitHub repository**, on the `main` branch. Open the same folder that your current Render service uses as its **Root Directory**. That folder should already contain `server.js`, `economy.js`, `package.json` and `public/`.
3. Replace **those existing files and folders** with the **contents** inside `Frogy_v15_4_Dense_Maps_Voice/`, not a new nested version folder. Keep your existing GitHub project and Render service. Do not upload test profiles, account tokens, `.env`, or other secrets.
4. If GitHub still has an obsolete `public/luckylily.js` in the **live Root Directory**, remove that old file separately. Uploading replacement files does not delete old files automatically.
5. **Commit changes**. In Render → your existing Frogy-VR Web Service → **Deploys**, verify the latest commit is live, or select **Manual Deploy → Deploy latest commit**.
6. **Do not change Render Root Directory** if you replaced the contents of the existing directory. Only change it if you intentionally put the complete source inside a *different* top-level folder; the Root Directory must point to the folder that actually contains `server.js` and `package.json`.
7. On Meta Quest Browser, fully close and reopen `https://frogy-vr.onrender.com/`. Verify the page/header says v15.4 and test real headset movement. Check `https://frogy-vr.onrender.com/health` for the exact version and storage mode.

## Running tests

Requires Node.js **22+**. In the folder containing `package.json`, run:

```bash
npm install
npm test
npm start
```

The source was checked against **36 automated test files** (including new recovery/restart and arm-physics tests). Tests include simulated Quest controllers and mocked browser audio, **not** real Quest microphone/playback, network NAT traversal or performance measurements. The PostgreSQL branch also requires a configured real database and was **not** validated on live Render in this environment.

**Privacy:** Do not share a backup code or browser account token with anyone. Recovery keys give access to an account. There is still no password/account-registration system, and actual moderation/report review should be configured by the game owner before a public launch.
