# Frogy v16.10 — Classic movement rollback

## Source
The movement mechanics were restored from v15.4 (the last version described as relatively playable, with short-movement glitches).

## Scope — movement only
- Replaced `public/movement.js` with v15.4 movement, preserving its gravity, drag, jump, speed caps, palm contact, and relaxed arm-stroke algorithms.
- Restored v15.4 `physics()`, `pawSurface()`, and arm movement handling inside `public/game.js`; removed later ground-only propulsion gates, headset-relative arm filters, reversal blockers, acceleration clamps and solid torso sweeps from active locomotion.
- Restored the v15.4 assisted palm-floor contact detection (only the `handSurface()` function in `collision.js`) and the older paw visual constraints. No other game code was rolled back.

## Focused short-step adjustment
- Lowered only the tiny-stroke deadzones for 5mm+ controller strokes.
- Short pushes under ~4.5cm get proportional speed and a temporary 210ms brake so small steps don't slide as far as full-length swipes. Normal/long strokes keep v15.4 response.

## Unchanged
- v16.9 7-second shared tongue cooldown, maps, combat, online counter, outfits, camera/microphone, menus, NPC behavior, multiplayer, and server logic.
- The monster's full movement redesign is still deferred.

## Important caution
This rollback intentionally restores the more permissive v15.4 body interaction, in which the torso is not a solid obstacle collider. This trades strict wall blocking for the earlier freedom of movement. Real Quest playtesting must assess this. Tests cannot establish the physical feel of headset movement.
