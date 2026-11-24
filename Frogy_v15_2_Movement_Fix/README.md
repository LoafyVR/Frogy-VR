# FROGY v15.2 — Quest Arm-Movement Crash Fix

**Based on the full v15.1 No Lucky Lily source.** This is a targeted fix, **not a restart from v8**.

## Fixed

- **First arm push crashing the VR update:** In v15.1, the real Quest-controller input handler calculated a valid push and then referenced `cap` even though it was only declared inside the separate `physics()` function. That caused `ReferenceError: cap is not defined` on a valid movement stroke. v15.2 shares one tested speed-cap helper between both functions and declares the input handler's `cap` in its own scope.
- **Regression test for the actual VR input handler:** The new `test/v15_2_quest_push.test.js` runs `updateVRInputs()` using simulated controller tracking, verifies that a backward paw stroke results in forward movement velocity, and ensures real tracked paw height and contact release remain intact.
- **Versioning:** Launch screen, in-headset menu, script cache query and `/health` all indicate v15.2.

## Preserved from v15.1

- **Lucky Lily prize machine remains removed**, including all machine visuals, interactions, collisions, and daily spin rewards. The lily-pad **parkour course** is deliberately retained; it is not the Lucky Lily machine.
- Existing currency balances, Crickets and Dabloons, rewards, shops, player names and colors, NPC solo practice, cosmetics, multiplayer, rooms, friends, combat, maps, parkour, wall cling and grapple.
- No `data/`, account tokens, private profiles, or credentials are included in this ZIP. Do not replace any persisted account data on your live server.

## Install to your **existing** Frogy project (Mac)

1. Download and double-click `Frogy_Render_v15_2_Movement_Fix.zip` in Finder → Downloads.
2. Open the **existing** GitHub Frogy repository. Open the same folder you deployed before (the directory containing `server.js`, `package.json`, and `public/`).
3. Replace the **contents** of that directory with the **contents inside** `Frogy_v15_2_Movement_Fix/`. Do not put a whole version folder inside the existing game folder.
4. **Delete** the obsolete `public/luckylily.js` in GitHub if it still exists. GitHub uploading/replacing files does not delete old files automatically. Also make sure the old machine's JavaScript is not referenced in your deployed HTML or scripts.
5. Commit the changes. In Render Dashboard → your existing Frogy Web Service → Deploys, verify it deployed the new commit (or use **Manual Deploy → Deploy latest commit**). Keep the existing **Root Directory** setting if you replaced the contents of the same directory.
6. Check `https://frogy-vr.onrender.com/health`; it must return `"version":"15.2.0"`. If it does not, Render is still serving an older version or the wrong repository directory. **Do not judge movement or Lucky Lily removal until the health version is 15.2.0.**
7. On Quest, fully close the old tab and reopen `https://frogy-vr.onrender.com/`. Enter VR and test floor strokes with both hands while standing normally. Verify the cabinet is absent, menu opens with X, A jumps, and other players see your hands.

## Run local automated tests

Install Node.js 22+ and run `npm install`, then `npm test` from the folder containing `package.json`.

**Limitations:** The automated headset-input simulation catches the v15.1 exception and verifies the movement math path; it does **not** prove stable locomotion, frame rate, or hand contact on a physical Meta Quest 2/3/3S. Physical device tests and confirmation of the live deployed version remain necessary.
