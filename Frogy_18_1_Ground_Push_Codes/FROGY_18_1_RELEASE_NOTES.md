# Frogy 18.1 — Release Notes

**Movement first.** Frogy 18 rejected a ground-floor contact unless the player made a downward controller stroke of >8 mm in one frame. This made slowly placing hands on the ground fail, while trigger-based wall cling continued to work. The **only edit to `public/movement.js`** removes that high-speed planting prerequisite. All subsequent displacement/impulse, gravity, braking, and contact-release rules remain unchanged from approved Frogy 17.2/Frogy 18. Ground still requires a real world-floor check and `grounded=true`; airborne hands cannot plant on empty air.

**Code HROHN:** server-side session boolean activated through the existing redeemCode message, forwarded to the player's network state. The client multiplies existing speed cap and push power by 2. Session speed never enters profiles, and resets on disconnect/login. STOP turns it off; HROHN can turn it on again. This preserves existing Mega Frog and Swift Legs role multipliers.

**Code TUFF:** permanent, once-per-account badge grant in codes.js, auto-equipped into the new 'badge' slot. Rendering includes an optimized canvas badge texture in the multiplayer 3D model with a frog wearing sunglasses and brown TUFF lettering, plus a Dress Up mirror preview. The item cannot be purchased, only unlocked via TUFF; dress-up allows cycling on/off. TUFF is synchronized to other players immediately on redemption. Future badges can reuse the same slot.

**Mega Frog arms:** significantly thicker upper arms, forearms, and elbow/shoulder mesh in first-person and third-person. Cosmetic rendering only; collision, reach, network input, and locomotion untouched.

**Preserved:** Frogy 18's approved movement impulses; tongue grapple, electric monster stun, Rocket Hop, gear, cosmetics, camera/phone recording, microphones, voice chat, private rooms, medkits, and online counter.

**Testing limitation:** automated and WebSocket checks pass; a Meta Quest headset playtest is still required before calling ground pushing fixed in practice.

### TKDYP session grapple code (18.1 addition)
- **TKDYP**: Eliminates the 7-second shared cooldown for the regular B/Y tongue grapple, allowing immediate re-firing after releasing it (normal controller button-edge debounce still applies).
- **STOP**: Cancels BOTH HROHN session speed and TKDYP no-cooldown grapple at once.
- HROHN and TKDYP stack, and neither is written to the saved account. Both reset on disconnect.
- No changes to the monster's separate electric-stun grapple cooldown, to protect existing monster combat balance.
- No changes to approved 17.2 movement mechanics or the other 18.1 features.
