# FROGY v17 — GorillaLocomotion-inspired movement beta

**EXPERIMENTAL QUEST TEST BUILD — DO NOT REPLACE YOUR LIVE v16.10 SERVICE YET.**

This is a movement-only replacement based on the original publicly released,
MIT-licensed GorillaLocomotion movement design by Another Axiom:
https://github.com/Another-Axiom/GorillaLocomotion

## Scope

- Replaced the locomotion engine in `public/movement.js`.
- Rewired only hand/contact/physics sections of `public/game.js`.
- Kept all other game components and gameplay features from v16.10.
- Changed build/version labels for beta testing, and added movement tests/docs.
- Included the MIT attribution: `GORILLA_MOVEMENT_ATTRIBUTION.md`.

**This is an adaptation to JavaScript/WebXR, not Gorilla Tag's Unity code
running directly, and it is NOT confirmed to feel right on Quest yet.**

Read `QUEST_V17_MOVEMENT_BETA.md` for headset testing instructions.

Deploy as a **separate** Render service for comparison (recommended),
root directory `Frogy_v17_Movement_Rewrite_Quest_Beta`, npm install, npm start.

The production v16.10 folder was not modified.

**Version numbering:** Frogy 17 is the same movement beta previously called v16.11; this package changes version labels only, not gameplay. Future major updates use consecutive whole numbers (18, 19, etc.).
