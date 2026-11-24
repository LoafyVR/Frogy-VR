# Frogy v15.2 — Meta Quest test checklist

## Before VR testing
- [ ] `https://frogy-vr.onrender.com/health` returns `"version":"15.2.0"` (if not, do not test a stale build).
- [ ] Completely close old Quest Browser tabs before reopening the game.
- [ ] **No Lucky Lily cabinet** in the lobby and no spin button in the menu.
- [ ] Lily-pad parkour platforms and the physical map-voting board still exist.

## Movement — highest priority
- [ ] Both tracked paws appear at real hand height; no ghost or duplicate paws.
- [ ] Standing normally, pull the right paw backwards while low enough for floor contact: frog moves forward without freezing.
- [ ] Repeat with the left paw, then alternate hands for 60 seconds.
- [ ] Push from nearby walls/trees; no spasms when touching/releasing contact.
- [ ] Stop moving your hands; no unexplained sliding/jumping caused by tracker noise.
- [ ] Press A to jump: preserves horizontal momentum; X opens/closes menu.
- [ ] Test while a second real Quest player watches that movement and hands sync.

## Feature regression
- [ ] Shops, dressing, Crickets, Dabloons and daily quests still work.
- [ ] Public/private rooms, NPC solo practice and round combat still work.
- [ ] Test a full round for severe lag or unintended freezes.

**Automated tests are not a substitute for physical Quest hardware validation.** If movement is still bad, capture a 20–30 second Quest video showing the paws, avatar motion and whether it happens in the lobby or a round.
