# Frogy 16.6.1 — Quest Movement Stability Hotfix

Based on two user-recorded Quest Browser clips from Nov 25, 2026. The recordings show very large close-up paws and an unstable first-person view, but do not provide an instrumented physics trace. The code changes target concrete root causes; confirm on an actual headset.

## Changes
1. **Locomotion no longer doubles up real room-scale walking.** It subtracts only headset movement shared by the hands, so head-only leaning and physically moving do not generate phantom arm strokes. Hand tracking is smoothed for motion calculations while the visible palms/weapons/aim use real controller positions.
2. **Intentional arm resets do not yank the frog backward.** Opposite strokes within a reset window are ignored; moving again after resting the hands works. Both frogs and the Mega Frog share this behavior.
3. **Snap turning pivots around the tracked headset**, instead of orbiting the camera around the VR room origin.
4. **Collisions sweep tracked head movement between frames**, which helps stop head/body shifts through a wall. World structures remain solid; decorative objects remain nonblocking.
5. **Local paws are smaller and exactly three-digit silhouettes.** Removed extra rounded fingertip decorations that visually looked like additional fingers.
6. **Standing downward palm presses still jump.** Intentional vertical presses remain responsive, but crouching with hands does not create a false hop.
7. **Removed the green/pink bulb below the head from first-person VR.** Your own torso/belly mesh is hidden to clear the view; shoulder anchors, tracked arms and the full character other players see are retained.

## Not changed
- All v16.6 weapons, medkits, Frog models, private Tadpole controls, physical tutorial and server systems.
- No new colliders on hands, tongue, or camera.
- The separate Camera Lab/microphone version has the same movement fixes without adding the camera to the official game.

## Important test limitations
Tests exercise synthetic controller/headset poses and code paths. They cannot prove natural Quest movement, smooth visuals at headset framerate, microphone functionality on Quest, or wall-hitbox geometry alignment in every real map.

## Deploying
Upload **the entire folder** using GitHub Desktop (GitHub's web upload has a 100-file limit). Set Render Root Directory to the exact folder name inside this ZIP. Do not use both folders for the same service. Confirm /health responds with `version: 16.6.1`. If testing Camera Lab, use a *separate* Render service so the official game remains unchanged.

## Quest smoke test
1. Stand upright for 10 seconds with hands still: no virtual drift or hopping.
2. Walk one small step **physically** without swinging: camera moves only with your real-world step, not twice as far.
3. Swing hands backward to move forward, then return them quickly: no forward/back rocking.
4. Stand still and lean head in four directions: no unintended frog translation.
5. Snap-turn while not at the play-space center: eye viewpoint pivots in place, not sideways.
6. Move along a crate/gravestone and pull away from it: no vibrating/sticking or clipping through.
7. Repeat as Mega Frog. If using Camera Lab, record POV/Follow with mic separately after movement passes.
