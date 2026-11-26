# Frogy v16.5 — Movement & Grapple Collision Rescue (Quest Beta)

This is a **complete project** built from Frogy v16.4, not a patch. It preserves swords, mallets, guns, medkits, profile persistence code, stores, cosmetics, multiplayer, maps, quests and previous controls.

## Why this update was needed

v16.4 incorrectly counted a *standing-height controller* as a floor contact even with no physical surface beneath it. As the player's head bounced, these simulated contacts flickered and drove unexpected movement impulses. The tongue itself did **not** generate a collider, but its pull velocity could keep forcing a frog into an existing wall, which looked like a sudden invisible obstruction.

## Changes

1. **No invisible air hitboxes.** Hands now report actual floor/wall/platform contact only. Upright movement remains possible using tracked horizontal arm swings and deliberate downward presses independent of contact probes; you never have to crouch just to locomote.
2. **Grapple can't pin you against a wall.** If the body stays blocked for roughly 0.18 seconds of a real tug, the rope releases and stops pushing. Hand-stroke movement is not allowed to fight the active grapple.
3. **Walls stop and slide instead of sucking the body in.** Body sweep uses smaller steps, axis sliding and collision recovery when already partially embedded. Decorative grass remains non-collidable.
4. **Left and right paws are mirrored anatomically.** Thumb-side geometry is opposite on each hand, and both still follow the controller's full rotation and analog finger curls.
5. **Tongue looks like a tongue.** Twelve smoothly tapered pink segments with a little organic bend and soft pad at the end replace the thin line and dot. These graphics never enter the physics collision map.
6. **Less accidental bouncing.** A deliberate downstroke is required for upward push-off; small tracking jitter is rejected and repeat launches are throttled.

## Deploy from a separate version folder (recommended)

Upload the *entire folder* `Frogy_v16_5_Movement_Grapple_Rescue` alongside earlier version folders at the top of your existing GitHub repository. In **Render → Frogy-VR → Settings → Root Directory**, enter exactly `Frogy_v16_5_Movement_Grapple_Rescue`. Deploy the latest commit; `/health` should report version `16.5.0`.

If replacing the contents of your current Render root folder, **leave Root Directory unchanged**. Don't put the new version folder *inside* an old one. With GitHub Desktop, copy the folder into your local clone, Commit, then Push origin; GitHub's web uploader has a 100-file limit.

**Never overwrite existing Render environment variables, PostgreSQL accounts, saved profile databases, browser storage or secrets** when updating source. Persistent PostgreSQL storage remains required for account data to survive Render restarts reliably.

## Quest test checklist

- Check `/health` is `16.5.0` and close/reopen Quest Browser to avoid old cached scripts.
- Stand upright and make short arm strokes forward, backward, left and right; there should be no wobble or invisible-floor contact.
- While standing, make a deliberate downstroke. You should push upward without squatting and without automatic repeated hops while hands are still.
- Watch left/right hands with both controllers pointing down and try button/trigger curls; thumbs should be mirrored.
- Try tongue grappling to a wall, tree, floor and across a doorway. The tongue should be visible, feel smooth, and release instead of trapping you against a wall.
- Try to slide around a crate, wall and narrow doorway, including after colliding at an angle.
- Test sword, mallet, gun and both medkits, then leave and return to check saved account data.

This build passed programmatic tests, but movement/visibility/comfort can only be confirmed on **real Meta Quest hardware**. Share a Quest recording after deployment if a problem remains.

---

# Frogy v16.4 — Weapons & Medkits Quest beta

Complete replacement source code built on v16.3. Preserves existing multiplayer, cosmetics, profiles, movements and other prior game systems.

**Install as a separate folder:** upload the folder `Frogy_v16_4_Weapons_Medkits_Aim` to your existing GitHub repo at its top level, then set Render **Root Directory** to exactly `Frogy_v16_4_Weapons_Medkits_Aim`. Do not upload it inside an older version folder. Deploy and verify `https://frogy-vr.onrender.com/health` reports `16.4.0`. If replacing files inside the current Render root folder, don't change Root Directory.

The game is Quest-only (Meta Quest Browser). Test weapon placement, visibility, side-to-side and floor pushing, two-way voice and graphics on physical headsets. Medkits: two single-use crates per match, grip nearby when damaged to heal 55 HP (cap at 175 HP); they stop wound bleeding, not regrow arms. The monster cannot take kits.

**Saved data:** Never delete `data/` or overwrite real profiles. Real persistent account storage still requires Render PostgreSQL or an appropriately mounted persistent disk; `/health` shows the current profile storage mode. ZIP does not include profile or environment secret files.

Run tests with `npm test` using Node 22+. Existing test scripts start short-lived local servers, so tests should run without another Frogy server occupying their ports. Automation is not a substitute for a Quest beta test.
