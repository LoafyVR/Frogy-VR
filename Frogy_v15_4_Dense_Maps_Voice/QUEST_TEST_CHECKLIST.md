# Frogy v15.4 — Quest & Persistence Acceptance Checklist

## Deployment first
- [ ] Your existing Render app `/health` shows `"version":"15.4.0"`.
- [ ] `/health` shows `"profileStorage":"postgres"` and `"databaseConnected":true`, **or** an independently verified persistent-disk mount.
- [ ] No `luckylily.js` or Lucky Lily machine in the actual deployed version. The regular lily-pad parkour course should still exist.
- [ ] In Quest Browser, close and reopen the game to refresh scripts. In-headset menu shows v15.4.

## Movement (real Quest 2 / 3 / 3S hardware; automated tests are not enough)
- [ ] Standing upright, push/pull the right and left controllers to travel; **no crouching** or hand-spasming required.
- [ ] Normal running feels close to the previous Swift Legs upgrade. Small arm strokes work; speed is smooth rather than teleporting.
- [ ] Buy and activate Swift Legs during survivor round; speed is noticeably faster **than current normal movement**.
- [ ] Jump on A retains horizontal speed; X toggles menu. No duplicate/offset paws or visual jitter against floor/walls.
- [ ] Multiplayer players correctly see both hands and motion with one another.

## Combat and gore
- [ ] As the monster, press left grip near a survivor to rip off left arm; watch the arm separate at shoulder and **physically fall and bounce**.
- [ ] 3-fingered paw remains on detached arm; survivor shoulder shows wound; fresh blood bursts out and stains remain for the round.
- [ ] A second rip detaches the other arm. Elimination never produces duplicate detached arms.
- [ ] Other headsets see the same fallen parts and can pick them up/drop them. Confirm performance stays comfortable.

## Codes
- [ ] Any player (not just the developer) can redeem previously restricted `EMPSH`, `DJHQW`, and `IHVDL` codes.
- [ ] Confirm `DJHQW` stays repeatable (10,000 Crickets + 10,000 Dabloons **per use**); decide whether to advertise this publicly.
- [ ] Only allowlisted real moderator accounts can kick players, even though role titles are public.

## Account retention (do not skip)
- [ ] With PostgreSQL connected, use a test account to purchase a hat and a tool, change color and name, and earn stats.
- [ ] Generate an account backup code in ACCOUNT menu. Save it somewhere private (not in Discord).
- [ ] Close and reopen Quest Browser **on the same headset**. All balances, purchased items, equipped cosmetics, friends, stats and name remain.
- [ ] Redeploy/restart Render. Reopen the game and verify balances/stats/gear are still there **after the actual service restart**.
- [ ] Test **different browser/device** with the account backup code. It restores the correct profile, generates a new private code, and rejects the old code.
- [ ] If `/health` says `ephemeral`, STOP calling the game data permanent. Configure a supported persistent store before public release.

## NEW in v15.4 — Priority two-headset tests
- [ ] Both players are on `/health` v15.4 in the **same private code room**. Each opens the VR menu and chooses TALK / ENABLE MIC; both approve Quest Browser microphone access.
- [ ] Voice status changes from MIC ON / WAITING FOR FRIEND to CONNECTED on both devices; headset volume and `Mute all voices` are checked.
- [ ] Speak from Quest A and Quest B in turn. Both speakers are audible; each frog's 3D mouth opens while talking and settles at silence. Test both survivor and monster voice.
- [ ] If voice is silent on different Wi-Fi networks, configure a TURN relay on Render, redeploy, and repeat. STUN-only WebRTC cannot guarantee universal connectivity.
- [ ] In each map, verify dense cover interrupts vision: no visible match nameplates; blaster shots do not pass through solid cover; FPS remains playable.
- [ ] Test relaxed standing arm swings in lobby AND playing phase; A jump retains momentum; no controller spasm.
- [ ] Survivor can use B tongue and hold a trigger against a wall to cling in the match. Monster cannot tongue grapple; it has low gravity and faster/stronger movement.
- [ ] With one arm missing, shoulder droplets pour continuously and ground stains spread until elimination, including on the second headset. No duplicated limbs.
- [ ] Buttons X / Y remain UNCHANGED in v15.4; next remap requires the owner's approval.
