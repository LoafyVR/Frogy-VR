# Frogy v16 Quest hardware acceptance checklist

Use two physical Meta Quest headsets (2/3/3S) and actual controllers. Never report passes before testing them.

- [ ] `/health` returns 16.0.0 after Render deploy; Quest page also displays v16.0 (reopen browser to clear stale scripts)
- [ ] Both players enter lobby and see rounder cute frogs, separate eyes, matching mirror and no extra paws
- [ ] Change frog color in VR, click Apply; visible hands and mirrored frog update without leaving menu
- [ ] Lower hands to actual floor: palms align with controller/floor; waist-height hands do not appear at ground
- [ ] Small 1–3cm backward swipes make short controlled steps; larger swipes travel farther and stop promptly on release
- [ ] Movement works in lobby and all three maps without crouching; grass/brush never snag character
- [ ] Main buildings, industrial walls, tombs/crypts and trunk surfaces reliably stop torso at walking and jump speed
- [ ] Monster uses the same arm movement and A jump as survivor, moves a little faster but does not fly
- [ ] X toggles menu; A jumps; B and Y attach separate survivor grapples; monster cannot grapple, B/Y roar
- [ ] Trigger clings to walls; hand grip grabs, drops and throws dropped weapons/body parts
- [ ] Two Quest users can hear each other nearby and watch mouths animate; voices fade with distance; volume/mute/report work
- [ ] Severed arms detach, fall, blood pours during round
- [ ] Quests, currencies, cosmetics, stats and items survive Render restart **only if** `/health` confirms real persistent storage
- [ ] Quest 2 performance is comfortable in each dense map and falls within headset frame budget

If movement is still unstable, capture headset video showing both real controllers and write down Quest model, browser version, and which map.
