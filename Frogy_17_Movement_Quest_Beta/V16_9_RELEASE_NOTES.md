# Frogy v16.9 — Movement-First Repair

Source: v16.8; release target: `16.9.0`.

## Primary cause

The Quest input loop in v16.8 accepted `relaxedArmStroke` horizontal impulses when no surface existed, and accepted `groundPress` upward impulses when the controller simply swung downward at waist height. This allowed airborne swipes to accelerate the frog, including backward on recovery strokes. The old contact solver also granted brief collision grace after leaving a surface.

## Repair

1. Controller hand movement produces propulsion only through `strokeContact` **while a real world surface is detected**. Freehand air strokes do nothing, including while falling after A-jump.
2. Genuine solid **wall** contact is checked at the real controller position; the **floor** is reached by a consistent virtual frog-forearm extension, active only when the frog body is grounded, with no airborne floor collider.
3. Continuous physical head + hand movement is compensated for in contact impulses to avoid generating virtual motion merely by leaning or walking around the room. Visible hands and aiming remain at real tracked poses.
4. A downward **planted** hand stroke gives up to 5.2 m/s launch; **A** gives a higher jump. Fixed the reversal gate so it does not accidentally discard a vertical-only planted push.
5. Removed the 100ms stale contact window. Opposite-direction hand resets within 540ms are filtered.
6. B/Y now share one tongue, and after any disconnect share a 7-second cooldown, including blocked pulls and jump/menu cancellation; no shortcut by switching controllers.
7. Increased map cover density while preserving weapon and survivor spawn clearance and two medkits per map.
8. No new monster-specific AI/movement modifications until regular frog movement passes real headset testing.

## Preserved

First-person bulb removal, paw orientation/size, headset collision sweep, swords/blaster/mallets, medkits, private-room optional Practice Tadpole, six-step lobby tutorial, Camera Lab with opt-in mic, Players Online counter, economy/cosmetics, multiplayer/voice, account persistence hooks.

## Verification

Run `npm test` (or `node test/run-all.js`) and inspect `RELEASE_TEST_RESULTS.md`. A physical Quest test is **mandatory** before claiming the unwanted wobble/air-juking is fixed; remote performance may vary across headset tracking configurations.
