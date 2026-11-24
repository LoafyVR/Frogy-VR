# FROGY v13.0 — Movement, Grapple, Room Codes & RGB Colors

**Platform:** Render-hosted browser WebXR app for Meta Quest. **NOT Unity**, **NOT an APK**, and **NOT yet uploaded to Render**. Existing game URL: `https://frogy-vr.onrender.com/`.

## What this build changes

1. **Arm-driven movement / torso collision:** The frog's *body* no longer collides with map props and cancel hand-powered movement. The outer world bounds and floor/platform support remain. Real controller paws still use environmental hand-contact surfaces (floor/walls/trees/parkour), and A jump still carries speed. Ground drag and downward-hand push-off lift are adjusted to make it easier to hop. **Tradeoff:** without torso blocking, the body may visibly pass through walls and obstacles; this follows the requested prototype behavior, but it is not equivalent to a polished physical movement system.
2. **Grappling:** Right B fires a tongue tether up to **38 meters**, connecting to valid solid targets such as floor, walls, trees, furniture, parkour pads, and scenery—not empty air. A second B press detaches; grapple duration and cooldown are bounded.
3. **Raised parkour:** The same seven pads now climb from 0.6 m to 3.28 m. Visual pad locations/heights directly reuse the shared physical collider list, reducing mismatch between how they look and where they can be landed on.
4. **Private room codes:** Room computer can CREATE or JOIN a room using its QWERTY-style VR keypad, case-insensitive five-character codes, and clear confirmation/error messages sent by the multiplayer server. Room codes only work while a friend remains in their room on the **same running Render service**.
5. **Promo code feedback:** Redeeming codes keeps the entry until a successful server response, with success/failure toast and sound. Existing rewards, one-time restrictions and owner/mod roles are retained. Server still owns balances, so a code cannot be redeemed twice when only allowed once.
6. **Color codes — fixed:** In **VR Menu (left X) → DRESS UP**, enter exactly **three digits from 0 to 9**, interpreted as **RED / GREEN / BLUE** (for example `907`). Press **APPLY**. The server responds with a visible success/error message, saves the color on the player profile, updates other players, and refreshes the dancing mirror. The preview swatch changes to show the entered color. Desktop RGB sliders are retained for future tools but gameplay is VR-only.
7. **Starter balance:** Brand-new profiles start with **500 Crickets and 1,000 Dabloons**. Existing saved accounts keep their prior balances; this is not an across-the-board grant. The normal Eastern-midnight rewards and daily quests are unchanged.
8. All existing Frogy v12 features remain: silly dancing dressing mirror, X-toggle menu, tongue/wall cling, map vote board, social/friends, two-currency economy, shop, role badges, horror environments, voice prototype, etc.

## MacBook → GitHub → Render (update the EXISTING service)

1. Double-click the ZIP in **Finder → Downloads**.
2. Open your existing Frogy repository on GitHub. Find the directory containing `server.js`, `economy.js`, `package.json`, and `public/` (the directory from your existing **Render Root Directory** setting).
3. Upload/replace the **contents** of `Frogy_v13_Movement_Codes_Colors` into that directory, preserving its structure (`public/`, `test/`, etc.). Commit changes. **Never add `data/`, tokens, `.env` or `node_modules/`**. This download intentionally excludes player profile files.
4. In **Render Dashboard → Frogy-VR → Deploys**, allow automatic deployment or use **Manual Deploy → Deploy latest commit**. Confirm the expected Git commit and that the service is **Live**.
5. The game stays at `https://frogy-vr.onrender.com/`. In Quest Browser, close and reopen the tab if you get cached code. Look for **v13.0** in the VR menu.

**Root Directory:** If you're replacing files *within the existing Root Directory*, do **not** change this Render setting. If you upload the **entire new top-level folder** to the GitHub repository root, use `Frogy_v13_Movement_Codes_Colors` as the new Root Directory.

## Test results and cautions

`npm test` passes **28 automated test suites**, including network tests for private CREATE/JOIN, one-time promo codes, new 1,000-Dabloon starter balances and RGB color saves/replication/reconnect, plus earlier physics and gameplay tests. `node --check` passes the changed JavaScript. These are **server and simulated input tests**, **not** a physical-Quest verification.

**Important:** On a real Quest, test that the body can push off the floor without getting stuck, paws are tracked at the correct height, B aims at solid objects, private-code keys are clickable, RGB 000–999 saves, and parkour pads can be landed on. No real hardware or full WebGL/XR frame rendering was verified in this environment. Renderer, locomotion and interaction issues may still occur.

**Profiles:** Persist player data in Render Postgres (`DATABASE_URL`) or a configured persistent storage solution before relying on balances, cosmetics, friends, OWNER/MOD titles and color codes across deployments. The uploaded source ZIP does not contain actual user profiles.

**Security:** This prototype currently allows any player with knowledge of the `IHVDL` promo code to gain MOD/kick powers. That is a serious abuse risk for public release; restrict moderator privileges to trusted accounts before opening public access broadly.
