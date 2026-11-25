# Frogy v16.1 — Hands & Movement Quest Beta

**v16.1 is a complete replacement for v16.0 and includes the previous features.**

Critical changes: true WebXR controller-tilted paw rendering; cleaner rounded three-digit hands; lowered-hand ground press to launch the body even on the first contact frame; responsive sideways strokes; one head/mouth-origin tongue grapple at a time (Y or B), fast initial pull with nonlinear slow-down and auto-release; smaller/denser maps (60m radius), tiny cosmetic legs, smaller frogs and raised belly material to avoid torso clipping.

**Deferred:** menu/shops/computer consolidation, right-stick scrolling and draggable scrollbar. See `FUTURE_UPDATE_BACKLOG.md`. This is not included in the gameplay update.

**Important:** Physics and appearance still require a real Meta Quest 2/3/3S playtest. Automated simulations cannot confirm whether the physical-floor height/calibration is correct. Voice chat needs two devices and a functioning TURN relay on restricted networks. Account saving across Render restarts still requires persistent PostgreSQL or a mounted disk. Keep backups of player data and never commit `data/profiles.json`.

For a separate-folder deployment, upload folder `Frogy_v16_1_Paws_And_Movement` to the repo root (same level as older versions), change Render Root Directory to that exact folder, then deploy. If replacing files inside the current Root Directory, do **not** change Root Directory. Verify `/health` reports `16.1.0` before testing the headset.

---

# FROGY v16.0 — Quest Beta: Cuddlefrog Characters & Stable Movement

**Complete game ZIP (not an incremental patch).** Based on v15.4, preserving multiplayer, Lucky Lily removal, cosmetics, Crickets/Dabloons, tools, player profiles, friends, quests, maps, arm ripping, gore and microphone/WebRTC support. The original official Frogy branding stays in place.

## Changes made for v16.0

- **Cute modular frog redesign:** Bigger rounded head, compact legless pear-shaped body, enlarged expressive eyes with blinking/highlights, softer cheeks and smiling/talking mouths, cleaner skin surfaces, and the original 3-finger paws. Outfit anchors, skins and existing cosmetic purchases remain; the dressing mirror uses the matching rounded proportions. Mega Frog has the same basic silhouette but bigger proportions, horns and teeth. Inspired by the user's new style reference; actual headset rendering remains unverified.
- **Accurate small strokes:** Controller movement now maps to velocity proportional to the actual tracked stroke. Short strokes produce tiny steps rather than minimum large bursts. Ground friction slows you down when you stop moving. Long strokes retain a faster run and Swift Legs is still stronger.
- **Mega Frog:** Uses the same stroke, jump and ground-drag code as ordinary frogs, but gets a moderate horizontal speed boost and *slightly* lower gravity. Removed the automatic leap that combined with A jump to send it flying. **A jump is preserved.**
- **Body collisions:** Solid shacks, lab walls, gravestones/crypts, crates, tanks, towers, boulders and trunks block the frog body and give hand contact. Grass and decorative foliage are NON-SOLID. Client uses a swept body collision to prevent high-speed wall tunneling; server also rejects penetration into structural cover. Some complex prop silhouettes remain approximate rather than detailed 3D mesh collision.
- **Real tracked hands:** Paw visuals stay on the actual tracked Quest controller position. A waist-high controller is **not** treated as touching the physical floor, even when standing-height arm swings still produce movement. For a paw to visibly reach the ground, the player must actually lower that controller. This avoids invisible stretched arms and hand-spasms.
- **Right B and left Y tongue:** Each survivor controller can attach an independent, temporary tongue grapple to a collidable surface; simultaneous tethers blend instead of stacking violent impulses. Monster B/Y roar; it cannot grapple. **X still toggles the menu, A still jumps.** Triggers cling/attack; grips grab/drop.
- **Immediate skin colors:** On server confirmation, the locally rendered hands, avatar, and dressing mirror refresh immediately rather than waiting for a later periodic room state tick. Color still persists with the player's existing profile.
- **Easier grabs:** At grip time, the current tracked wrist is sent to the server for a validated, slightly more forgiving weapon/part pickup.
- **Proximity speech:** Optional peer voice now fades with distance in matches; mouth animation still uses microphone amplitude. Both users must allow microphone access; TURN relay may still be necessary across different networks.

**Do not assume this beta is verified on a physical Quest.** Tests exercise helpers, browser simulations, WebSocket gameplay and a simulated controller path, but not actual headset movement feel, two-Quest audio, hardware framerate, or the user's exact visual reference fidelity.

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
5. Open `https://frogy-vr.onrender.com/health` after deployment. The response must include `"version":"16.1.0"`, `"profileStorage":"postgres"` and `"databaseConnected":true`. If it says `"ephemeral"`, **balances and purchases are not reliably saved across Render restarts**. `"configured-disk"` merely means `FROGY_DATA_DIR` was set; you must independently verify a mounted persistent disk exists.

**Protect existing progress:** Merely connecting a new database or redeploying can restart the current Render instance. If old accounts live **only** in its ephemeral `data/profiles.json`, a restart may delete them *before* the game can migrate them. The upgrade can import only an existing file that is still accessible. Make a backup/export of existing account data *before* restarting if at all possible. Do not assume any update can recover already-deleted records. Do not place `data/` or player tokens in the GitHub repo or source ZIP.

Render docs: https://render.com/docs/postgresql-creating-connecting and https://render.com/docs/free

## Install v16.0 into the EXISTING GitHub + Render app

**Two safe upload options:** You can keep your currently working folder and upload the complete `Frogy_v16_0_Mega_Update` folder alongside it at your GitHub repository root. Then set **Render → Frogy-VR → Settings → Root Directory** to exactly `Frogy_v16_0_Mega_Update`, save, and redeploy. OR you can replace the contents of your current live Root Directory without changing the Root Directory setting. **Do not nest the v16 folder inside the old folder.**

The numbered instructions below describe the replacement option.

1. Download and unzip `Frogy_Render_v16_0_Cuddlefrog_Quest_Beta.zip` on your Mac.
2. Open the **existing Frogy GitHub repository**, on the `main` branch. Open the same folder that your current Render service uses as its **Root Directory**. That folder should already contain `server.js`, `economy.js`, `package.json` and `public/`.
3. Replace **those existing files and folders** with the **contents** inside `Frogy_v16_0_Mega_Update/`, not a new nested version folder. Keep your existing GitHub project and Render service. Do not upload test profiles, account tokens, `.env`, or other secrets.
4. If GitHub still has an obsolete `public/luckylily.js` in the **live Root Directory**, remove that old file separately. Uploading replacement files does not delete old files automatically.
5. **Commit changes**. In Render → your existing Frogy-VR Web Service → **Deploys**, verify the latest commit is live, or select **Manual Deploy → Deploy latest commit**.
6. **Do not change Render Root Directory** if you replaced the contents of the existing directory. Only change it if you intentionally put the complete source inside a *different* top-level folder; the Root Directory must point to the folder that actually contains `server.js` and `package.json`.
7. On Meta Quest Browser, fully close and reopen `https://frogy-vr.onrender.com/`. Verify the page/header says v16.0 and test real headset movement. Check `https://frogy-vr.onrender.com/health` for the exact version and storage mode.

## Running tests

Requires Node.js **22+**. In the folder containing `package.json`, run:

```bash
npm install
npm test
npm start
```

The source was checked against **37 automated test files** (including new recovery/restart and arm-physics tests). Tests include simulated Quest controllers and mocked browser audio, **not** real Quest microphone/playback, network NAT traversal or performance measurements. The PostgreSQL branch also requires a configured real database and was **not** validated on live Render in this environment.

**Privacy:** Do not share a backup code or browser account token with anyone. Recovery keys give access to an account. There is still no password/account-registration system, and actual moderation/report review should be configured by the game owner before a public launch.
