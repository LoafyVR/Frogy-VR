# Frogy 17.2 — Contact-Release and Diagonal Push (Quest Beta)

Changes relative to 17.1:

- **No delayed fling after stopping:** a stationary planted hand no longer retains a rolling average of old impulses. When holding still against floors, walls, or during a wall cling, friction/braking stops residual horizontal velocity; during real launches, airborne momentum is preserved.
- **Combined forward+upward pushes:** horizontal motion and downward press contribute simultaneously from a real planted hand. Increased the upward launch response (below A-button jump) so small downward strokes produce real lift.
- **Grip vs trigger finger mapping switched** for both hands. Thumb curls are unchanged; combat/weapon controls are unchanged.
- **No phantom air pushing:** unplanted hands cannot propel the frog. Original 17.1 grapple range (21m), shared cooldown (7s), camera, mic, maps, game modes, currencies, and account systems remain untouched.

Movement is an adaptation of Another Axiom's MIT-licensed GorillaLocomotion principles; see `GORILLA_MOVEMENT_ATTRIBUTION.md`.

Automated tests are not a substitute for Quest beta feedback; have a tester verify the release/replant, diagonal boost, midair swing and button animations before switching the main live service.
