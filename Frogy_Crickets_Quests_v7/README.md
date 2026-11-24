# FROGY — Crickets & Quests v7.0 (Render/WebXR)

**This is the existing Render-based multiplayer browser VR game, not the separate Unity project or an installable Meta Quest APK.** It remains VR-only via the Quest Browser; desktop/mobile clients do not enter the game.

## What's in this update

- **Crickets** replace the old cosmetic coins. Existing balances are migrated **1:1** if the saved profile is available. Existing purchased cosmetics stay owned. Every cosmetic is priced **exactly 10× its v6.4 price** (Mushroom Cap 60 → 600, Crown 120 → 1,200, etc.). These prices are checked by the game server, not just shown in the menu.
- **Daily Crickets**: a new profile starts with 100 Crickets. Returning frogs receive **100 Crickets once per calendar day** after **12:00 a.m. America/New_York time**. The reset follows EST/EDT and **does not** depend on the time the frog last logged in. Leaving and rejoining during the same Eastern day does not pay again.
- **Dabloons and quests**: every player gets three automatically selected challenges per Eastern calendar day. Their earned Dabloons are credited by the server on completing tracked gameplay events; quests pay about 100–120 Dabloons. All quests refresh at Eastern midnight. Dabloons are not purchasable for cash.
- **Tools shop**: Dabloons buy role-specific, single-round tools. Survivor: 2× arm-running speed (50), rocket launch (200), double jump (100). Monster: frog disguise (100), jumpscare (120). Purchases stay in Inventory until used. An activated tool is consumed, cannot be used twice during that round, and ends when the round finishes. A tool must match the player's current role.
- **Menu**: 10 VR tabs between matches—Pond, Cosmetics, Tools, Dress Up, Room PC, Inventory, Quests, Players, Friends, Settings. During an active match: Waiting, Inventory, Quests, Players, Friends and Settings only. Tap **left X** to open/close. Select buttons with controller trigger.
- **Players and friends**: view the current room's frogs, mute an individual voice, request friendship, report behavior, see mutual friends' online/offline state, and join online friends' rooms if there is space. Friendships require **two reciprocal requests**. Reports are recorded for a human moderator; sending a report does not automatically ban a player.
- **Waiting-lobby parkour**: raised lily-stone jumping route along the back of the pump-house lobby. Jump with right A; raised pads are landing platforms. The regular 2-minute rounds, monster selection, room codes, map voting, voice, and arm-based movement remain.

## What the new cosmetic prices are

| Cosmetic | Crickets |
| --- | ---: |
| Tiny Mustache | 450 |
| Mushroom Cap | 600 |
| Big Pink Bow | 650 |
| Dorky Glasses | 700 |
| Party Hat | 750 |
| Snack Pack | 850 |
| Star Shades | 1,100 |
| Hero Cape | 1,150 |
| Pond Royalty | 1,200 |
| Bog Wizard | 1,450 |
| Fairy Wings | 1,600 |

## Update your existing game on GitHub and Render (MacBook)

1. Download and unzip `Frogy_Render_v7_Crickets_Quests.zip`.
2. In your existing Frogy GitHub repository, find the **same directory** that currently contains `server.js` and `package.json` (the directory set as Root Directory in Render).
3. Replace its source files with the **contents** of the downloaded `Frogy_Crickets_Quests_v7` folder. Include the complete `public` and `test` folders, plus `server.js`, `economy.js`, and `package.json`. **Do not upload or overwrite your `data/` profiles folder.**
4. Commit the files in GitHub. In Render → your existing Frogy service → Deploys, deploy the latest commit if it does not deploy automatically. **Do not create another Render service.**
5. Leave Root Directory **unchanged** if you replaced files in the existing directory. If you uploaded the entire new folder as a top-level folder, set Root Directory to `Frogy_Crickets_Quests_v7` instead.
6. On Quest, reopen `https://frogy-vr.onrender.com/`, enter VR, and check the new menu and shops. The client requests versioned scripts to avoid stale code.

## Important: save persistent profiles BEFORE public release

**Render's ordinary ephemeral local filesystem can be reset on redeploy.** If you already lost the `data/profiles.json` file on your Render service, the previous accounts cannot be reconstructed from this ZIP. To make Crickets, Dabloons, owned tools/cosmetics, quests, friends, names, and colors durable across redeploys, provision a Render Postgres database and add its internal connection string as the service's **`DATABASE_URL` environment variable** (Render Dashboard → Your Web Service → Environment → Add Environment Variable). The server automatically creates its profile and report tables and loads its records at startup. Do not paste your database password into code or GitHub. As an alternative, paid Render persistent disk with `FROGY_DATA_DIR` can store the profile file.

**Test on a real Meta Quest:** The new VR menus, parkour collisions, jumping comfort, headset frame rate, voice privacy and multiplayer moderation are not physically headset-verified here. Friend profiles are tied to a high-entropy browser token and are not a full login/account system; clear browser data and you can lose access to that profile. The report queue needs an actual human moderation process, and public voice chat requires privacy/safety controls before a Meta Store release.

## Tests

Run `npm install` then `npm test`. The repository tests cover cosmetics and matchmaking plus additional v7 tests for EST/EDT reset, exact 10× prices, quest rewards, server-authoritative tool purchases, friend reciprocity and role checks. No headset testing is implied by passing these tests.
