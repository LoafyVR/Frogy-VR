# Frogy 17.1 — Faster Movement and Air-Push Fix (Quest Beta)

This is a **separate movement beta** based on Frogy 17. It is not verified on Meta Quest hardware yet.

## Movement changes only
- Planted-hand horizontal pushes are ~2.6× stronger than Frogy 17, and the horizontal speed cap is raised from 9.3 to 20.5 m/s (Swift Legs still gives its existing bonus).
- Short 1–3 cm pushes register; an obvious reverse hand reset releases the anchor rather than shoving the frog backward.
- A floor contact requires a deliberate *downward planting motion* of the controller while the frog is grounded. A sideways swing at waist height in empty space cannot plant a hand.
- A floor anchor is removed as soon as the frog is airborne; if the A button jumps partway through the same XR frame, any previously queued floor impulse is discarded.
- Swept wall detection remains available for fast trajectories, but merely crossing a wall cannot anchor a hand or trigger climbing while the hand is already past it.
- Floor push strength and the real wall collision remain active for grounded or genuinely touching hands; intentionally touching walls while airborne still permits climbing/pushing.
- Menu no longer freezes gravity or carried momentum, and opening it clears hand contact state.

## Grapple adjustments
- Grapple max range is 21 m (was 38 m), with the same 7-second shared cooldown across both tongue buttons.

No intentional changes to weapons, characters, maps, camera, microphone, cosmetics, accounts, multiplayer or other features.

## Test limits
Automated tests exercise movement rules, not actual Quest headset tracking. Historical test files for removed movement APIs still fail; see `FROGY_17_1_TEST_RESULTS.md`. **Do not claim this fixes real Quest movement until the beta is tested.**
