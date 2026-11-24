# Frogy v11 — Quest Playtest Checklist

**Test using two Meta Quest headsets in Quest Browser, if possible.** Start at `https://frogy-vr.onrender.com/` and confirm the launcher reports **v11.0**. If not, verify GitHub's latest commit and Render Root Directory before testing.

## Must pass: hand movement & solid surfaces

- [ ] Both hands render exactly once, small and aligned to both real controllers at standing height (no extra paw, ghost hand, or dangling pole).
- [ ] Rest both real hands naturally: visual paws reach the floor without crouching excessively; no jarring teleport or downward hand snap.
- [ ] With no jump button, use alternating arm strokes on the floor; the body actually moves and does not stick/glide or shake.
- [ ] Push a paw against solid lobby walls, benches, counter and major posts; the paw detects the surface and the frog does not pass through major solid geometry.
- [ ] Jump repeatedly with **right A**, with horizontal momentum retained. Verify no collision/spawn instability when landing.
- [ ] Climb/hold a wall with triggers: one hand ~4.5 seconds, two hands up to ~7.6, release both triggers to fall.
- [ ] Jump onto and stand on all seven lily-pad parkour platforms, then jump between them. Verify edges can be used for climbing.
- [ ] During a match, try hands/walls, weapon grab/release and jumping on each of the 3 maps.

## New right-B tongue

- [ ] In lobby, face a solid object within 16 meters and press **right B**. Tongue appears and pulls the frog toward the surface without shooting through a wall.
- [ ] Press **B** again to detach; after ~1.6 seconds it releases on its own; subsequent activation respects a short cooldown.
- [ ] **Right A** still jumps; **left X** still toggles menu; grabbing and weapon trigger still work without unintentionally grappling.

## Menu, codes, economy, lobby

- [ ] Tap **left X** once; menu opens. Move/turn your head—the menu should remain fixed in space. Tap X again to close; reopen to reposition.
- [ ] Physical map-voting board remains as before. Lobby seating and parkour course still exist.
- [ ] The dressing mirror shows the active player's outfit/color. It is a character preview, not a full-scene mirror.
- [ ] New player (new browser profile only) begins with **500 Crickets**; existing balances aren't reset; next Eastern-midnight daily award is **100**.
- [ ] Room PC offers a QWERTY keypad; create a private room, note its **5-character code**, enter the code using a second headset and confirm both players appear in the same private room.
- [ ] Owner code isn't listed as a hint in the Codes tab. Redeeming **IHVDL** gives MOD only once; a second redemption gets the appropriate error. Test a MOD kicking one non-moderator; verify normal players cannot kick.
- [ ] In public matchmaking, players can see each other's frogs and hands, and MOD/OWNER plates are viewer-facing.

## Sound and network

- [ ] In Settings, enable microphone after a user gesture; allow microphone permission. Verify friend hears voice, and the frog mouth and eye expressions respond to speech. Test individual mute. (Some networks require a TURN relay not yet configured.)
- [ ] Observe stereo rendering: both eyes see the same world without a black eye or missing hand; no obvious frame stutter.

## Reporting bugs

When reporting, share: Quest model (2/3/3S), whether the headset is on the latest system update, exact deployed version, a 20–30 second headset clip of the issue if possible, which controller hand was involved, and the action that triggered the bug. If movement still fails, prioritize actual controller pose/contact logging rather than changing more arbitrary speed constants.

**No physical Quest hardware tests were performed during preparation of this source ZIP.**
