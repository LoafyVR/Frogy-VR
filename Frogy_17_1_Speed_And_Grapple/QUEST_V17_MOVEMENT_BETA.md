# Frogy v17 - GorillaLocomotion-inspired movement beta

**Test version only. Your live v16.10 deployment is untouched.**

## What changed

Only locomotion code: `public/movement.js` and movement-specific sections of
`public/game.js`. Display text, version strings, and movement tests were updated.
Weapons, visuals, multiplayer, menu, rooms, maps, camera/microphone, economy,
shared grapple cooldown, and the Mega Frog redesign backlog are unchanged.

Porting reference: official MIT-licensed Another Axiom GorillaLocomotion.
The Unity C# script cannot simply run in Frogy's WebXR browser engine.
The prototype adapts its planted-hand, swept-contact and momentum mechanics.

## Quest headset checklist

1. Stand upright, hold both hands still and lean: **no spontaneous movement**.
2. Lower a hand toward ground, plant, and press back: movement should follow
   the push, with no immediate reversal when you raise the hand.
3. Small deliberate contact strokes should register.
4. Push downward to hop, then swing both hands IN MID AIR: no extra force.
5. Test wall touches and climb. No phantom contacts when hands miss the wall.
6. With two hands on the ground, moving them together should not double force.
7. Repeat for Mega Frog, **without** further monster movement redesign.
8. Test tongue B/Y, sword grabbing, and X menu to verify no regression.

Automated tests cannot confirm movement feel on a physical Quest. If it still
feels wrong, capture a Quest clip *with the real controller positions* and
we can tune this isolated engine without touching the rest of the game.

## Deploy as separate Render test service

Root Directory: `Frogy_v17_Movement_Rewrite_Quest_Beta`
Build command: `npm install`
Start command: `npm start`
Do not point the production domain at this beta until accepted.
