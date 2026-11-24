# FROGY v12.0 — Paws, Climbing & Dancing Mirror

**Platform:** existing **Render / WebXR** Quest Browser game (`https://frogy-vr.onrender.com/`). This is **not** a Unity project, Quest APK, or Meta Store release.

## What changed from v11

1. **Hand position fix:** Removed a `reachablePaw()` visual-hand offset that could push each rendered paw as far as 0.6 meters below the tracked controller. Hands now draw at the real controller pose; optional floor reach is only used by collision detection, not the hand model.
2. **Movement and climb responsiveness:** Tracking-space floor strokes provide horizontal push and a controlled upward impulse when the hand moves down; wall strokes can give an upward lift. Velocity is bounded; A jumping and its horizontal momentum remain. Actual comfort **requires physical Quest testing**.
3. **Paw art:** One smaller, three-finger speckled green paw per controller, with thin stems and orange-tipped rounded bulbs based on the reference image you provided. The game does **not** have an externally sourced or rigged imported hand asset.
4. **Parkour and trees:** Matched eight visible reachable swamp trees to tree trunk colliders; added tree body/wall collision checks and swept-height landing for all seven parkour lily pads, so fast falling frames should not phase through their tops. Decorative foliage is still not all collidable.
5. **Slim, animated frogs:** Removed the fake frog feet, slimmed the body/arms, and added animation based on player movement as seen by the client.
6. **Dancing dressing mirror:** The lobby mirror is an animated *avatar preview*, not a ray-traced reflection. Your frog dances independently with bouncing, swaying, alternating arm waves, funny face/eyes, and music-note decorations. It reflects your saved frog color and selected hat/face accessories. It does not move the real XR controller hands.

All prior features stay: lobby, original voting board, parkour, Crickets/Dabloons, quests/tools, X-button menu, tongue grapple on B, trigger-hold wall cling, rooms, social menus, and roles.

## MacBook: replace the old game, don't create a new server

1. In **Finder → Downloads**, double-click `Frogy_Render_v12_Paws_Climbing_Dancing_Mirror.zip` to extract it.
2. Open **GitHub → existing Frogy repository**. Find the directory already containing `server.js`, `package.json`, `economy.js`, and `public/` (the existing Render Root Directory).
3. Replace the files **inside that directory** with everything *inside* the new `Frogy_v12_Hand_Physics` folder, keeping `public/`, `test/`, and your current repository structure. Commit the update to GitHub. **Do not upload `data/`, profile tokens, `.env`, or `node_modules/`.**
4. In **Render → Frogy-VR → Deploys**, let automatic deploy complete or select **Manual Deploy → Deploy latest commit**. Confirm **Live** and that the new Git commit is being served.
5. Open your existing address in **Meta Quest Browser**. If it looks stale, close the tab and reopen it; launcher and in-headset menu should say v12.0.

If you upload the **whole extracted `Frogy_v12_Hand_Physics` folder** at the top of GitHub instead of replacing existing source inside your present directory, set **Render → Frogy-VR → Settings → Root Directory** to `Frogy_v12_Hand_Physics` before deploying. Otherwise **leave Root Directory alone**.

## Testing and limits

- `npm test`: 25 automated suites passed, including the new v12 code checks for tracked paw height, reachable floor contact, wall climbing, tree collision, swept parkour landings, slim frogs, and dancing mirror logic.
- `node --check public/game.js` and `node --check public/collision.js` passed. No Quest headset or full real headset frame rendering was available. These tests **cannot prove** movement is enjoyable, that all parkour pads look aligned on a Quest, or that VR performance is stable.
- Player balances/roles may be lost after a Render restart unless durable storage (Render Postgres or persistent disk) is configured. Keep saved profile data out of code ZIPs and GitHub.
- The `IHVDL` MOD code is public in the existing game design; anybody who knows it can claim moderation kick privileges. That is not appropriate for an unrestricted public release without additional controls.

See `QUEST_TEST_CHECKLIST.md` for an exact headset QA sequence.
