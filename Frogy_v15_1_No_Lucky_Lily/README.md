# FROGY v15.1 — Performance Cleanup (Lucky Lily Removed)

This is a targeted update to the existing **Render / WebXR** build, based on v15.0. It **removes Lucky Lily completely**, because testers experienced severe lobby lag.

## Removed
- Lucky Lily 3D cabinet, rotating prize sign, animated canvas and WebGL texture updates.
- Lucky Lily collision box and controller-trigger hit target.
- SPIN LUCKY LILY menu action and on-screen instructions.
- Daily machine reward endpoint, spins, machine status in network profiles, and its unused profile date state.

## Preserved
- Swamp lobby and map-voting board; lily-pad **parkour course** remains (not related to Lucky Lily).
- Existing Crickets, Dabloons, cosmetic shop, daily login rewards, quests, inventory, player names, NPC solo practice and combat.
- Player balances and purchased items are not reset. This source ZIP deliberately contains **no `data/` folder**.

## Updating the current game on a Mac
1. Download the v15.1 ZIP and double-click it in Finder → Downloads.
2. Open your existing Frogy GitHub repository. Find the directory with `server.js`, `package.json` and `public/`.
3. Replace its content with the **inside** of `Frogy_v15_1_No_Lucky_Lily`, then commit. **Also delete the obsolete `public/luckylily.js` from GitHub**: uploading replacements does not automatically delete existing files.
4. In Render → your Frogy-VR service → Deploys, let it auto-deploy or choose Manual Deploy → Deploy latest commit.
5. If files replaced the current game directory, leave Root Directory alone. If you uploaded the complete new version folder to the repository root instead, set Root Directory to `Frogy_v15_1_No_Lucky_Lily`.
6. On Quest Browser reopen the game link to avoid stale cached scripts.

## Validation
Run `npm test` with Node.js 22+. Automated tests include a decommission regression confirming no machine draw/collider/code path, and that a legacy `spinLily` message produces no rewards.

**Limitations:** This removes a likely source of lobby lag, but it does not guarantee steady frame rates or movement on a physical Quest. Game performance must be tested on the headset. The prototype remains WebXR on Render, not a Meta Store APK.
