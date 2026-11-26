# Frogy v16.9 — Grounded Movement & Shared Tongue Cooldown

Complete Meta Quest Browser WebXR multiplayer game, built from the full Frogy v16.8 source. This release prioritizes the survivor hand-locomotion regression reported in headset testing. The Camera Lab, microphone, Players Online counter, weapons, medkits, private-room Tadpole and other prior features remain included.

## Deployment

Using GitHub Desktop, place the extracted **`Frogy_v16_9_Grounded_Movement_Grapple`** folder in the root of your `LoafyVR/Frogy-VR` repository, commit and push. In Render, set **Root Directory** to `Frogy_v16_9_Grounded_Movement_Grapple`; retain your existing start/build settings. The `/health` endpoint should return `version: "16.9.0"` after deployment. Keep previous folders for rollback.

## Changes

- **Ground/wall contact required:** Removed the game-loop's airborne arm-swing propulsion and standalone waist-height launch shortcut. Airborne freehand motions cannot accelerate or reverse the frog. A hand touching a genuine solid wall can still push, including in midair.
- **Standing-friendly reach:** The frog's virtual forearm can reach the real floor when the headset body is grounded and the controller is lowered naturally. The visible hand always stays attached to the tracked controller. It is not an all-air invisible contact.
- **Hand-powered hop:** A deliberate downward stroke while the hand is planted on real ground creates a bounded smaller jump (max 5.2). **A** stays the higher jump (base 7.35) and does not eliminate the ground push.
- **No stale contact:** Removed the old 100ms contact persistence, which could give airborne reverse impulses after takeoff; hand reset guard remains.
- **Tongue cooldown:** **B/Y share the same single mouth tongue and a 7-second cooldown after disconnect** (including blockage, natural release, opening menu or jumping). Neither controller can bypass the other's cooldown; pressing B/Y together is debounced.
- **Denser maps:** Increased close-range cover and grapple targets in all three maps, retaining clear spawn, weapon and medkit placement areas.
- **Monster:** Uses shared contact rules, but monster-specific movement overhaul is **deferred until the user approves survivor movement**.

## Testing and constraints

Automated tests use simulated input and servers; they cannot prove Gorilla Tag-like comfort in a physical Quest headset. See `QUEST_V16_9_MOVEMENT_TEST.md` and `V16_9_RELEASE_NOTES.md`. The official character redesign is deferred. Camera Lab microphone/video saving remains beta and direct Meta Quest Gallery saving is **not** implemented. Persistent player profiles require appropriate Render disk/database configuration; don't overwrite production data with test profiles.
