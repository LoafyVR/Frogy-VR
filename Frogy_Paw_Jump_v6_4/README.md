# FROGY v6.4 — Paw + Jump Polish (Render/WebXR)

**This is a replacement WebXR/Node.js game update for Render, not Unity and not a Quest APK.**

## What changed

- **No duplicate paws:** The rendering path now draws a maximum of one paw per tracked controller. The extra ground contact circles and fallback "ghost" paws are removed. Contact physics continues invisibly. When Quest Browser reports controller and hand-tracking sources simultaneously, the game chooses exactly one source for each handedness and prefers actual controllers. It does not interpret two left-hand sources as left + right.
- **Momentum-focused jumping:** A jumps, keeping horizontal arm-driven speed and adding a modest upward takeoff lift for running starts. Coyote time (~155 ms) forgives a slightly late press and a jump buffer (~155 ms) forgives a slightly early one. A new landing can consume the buffered jump. Jumping releases previous floor anchors so they cannot drag you back. No joystick walking.
- **Round announcements:** At the start of each round, each headset gets a personal immersive 3D role bubble (Monster or Survivor). At the end, a winning team bubble lists the winner names, captured by the server before it clears roles. Both are rendered inside Quest rather than relying only on hidden HTML overlays.
- Public auto-lobbies, X toggle menu, weapons, shop, 2-minute matches, and three maps remain.

## Install on your current Render service

1. Unzip `Frogy_Render_v6_4_Paws_Jumps_Rounds.zip` on your MacBook.
2. In GitHub open your existing repo's **Root Directory** folder containing `server.js` and `package.json`.
3. Replace old files with **contents** of `Frogy_Paw_Jump_v6_4`, including the `public/` and `test/` folders; commit. Do not replace or commit any player data in `data/`.
4. Render → your existing web service → Deploys → deploy latest commit (or wait for automatic deploy).
5. Your Render Root Directory setting can stay unchanged if you replace the old files in the same place. If instead you upload the whole new project folder at the top of GitHub, set Root Directory to `Frogy_Paw_Jump_v6_4`.
6. Test in Quest Browser. Reload the browser tab if it still shows an older version. This release appends a version number to the dynamically loaded scripts to prevent old files being cached.

## Test sequence

1. In the lobby, place one paw at the floor and push. **Exactly one left paw and one right paw** should be visible. No green round contact object should appear next to each hand.
2. Lift/replant each hand and test several pushes. Try moving with one hand, then alternating hands.
3. While moving forward, tap right A. The frog should continue forward and launch upward. Tap A just before landing to test the small jump buffer. Check that an anchor does not pin you down in the air.
4. Start a multiplayer round (2+ headsets): the Mega Frog should see **YOU ARE THE MONSTER**, other players **YOU ARE A SURVIVOR** in a floating panel.
5. Finish a round (or wait for the 2-minute timer). Everyone should see the winning side and the specific winner names.
6. Confirm left X still toggles the menu, and other players remain visible.

## Verification limits

- Automated Node.js unit/integration tests cover controller-source filtering, one-paw render path, jumping equations, and server winner message fields.
- **Not independently verified on a physical Quest.** The exact hand-contact feel, menu/gamepad mappings, two-eye rendering, and locomotion comfort still need player testing. WebXR remains a browser experience, not a Meta Store installable APK.
- Persistent coins/cosmetics on Render require configuring `DATABASE_URL` or a persistent disk; the ZIP intentionally excludes all player profiles.
