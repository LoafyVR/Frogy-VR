# Frogy v16.3 — Upright movement headset test

- [ ] `/health` reports `16.3.0`, not a cached older version.
- [ ] **Without crouching**, both controllers at comfortable waist height can push off ground with a downward hand motion.
- [ ] Short forward/back/left/right hand swipes create similarly short motion; no requirement to touch the physical floor.
- [ ] Raising a controller near face height ends its virtual floor contact. No phantom jumps from idle hands.
- [ ] Hand meshes stay on controllers, not at fake floor proxies, and first-person arms do not block view.
- [ ] Menu open: gesturing/pointing at UI cannot move the avatar.
- [ ] Repeat in lobby and three arenas, for survivor and Mega Frog; A jump stays fun and predictable.
- [ ] Two headsets: network hands, speech, roles, weapons, currency and cosmetics still work.

---
## v16.2 hands, movement & tongue — test on actual Quest

- [ ] In BOTH lobby and match, lowered hand + downward push moves the frog noticeably upward without A; monster too.
- [ ] Take very small forward/backward **and** left/right steps; they stop quickly, no unintended sliding.
- [ ] Both tracked paws tilt/point down when each controller points down; no extra/ghost hands.
- [ ] Match the real Quest guardian floor height: tracked paws should be at real controller positions, not teleported to a fake floor.
- [ ] Y and B each start tongue grapple **from the mouth**, not either hand; using one while the other is active never makes two tongues.
- [ ] Tongue starts fast, slows near endpoint and disconnects automatically without slamming into the wall.
- [ ] New short legs and belly look correct from a remote friend’s perspective; colors change promptly.
- [ ] Check FPS and no weapon/spawn obstruction on all three slightly smaller maps.
- [ ] Test multiplayer voice and account persistence separately; neither can be fully validated by code tests.

---

# Frogy v16 Quest hardware acceptance checklist

Use two physical Meta Quest headsets (2/3/3S) and actual controllers. Never report passes before testing them.

- [ ] `/health` returns 16.0.0 after Render deploy; Quest page also displays v16.2 (reopen browser to clear stale scripts)
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
