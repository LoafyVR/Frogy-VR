# FROGY v16.0 — Cuddlefrog Quest Beta

### Changed
- Redesigned cute survivor and Mega Frog 3D meshes, face expressions, blink and improved matching dressing mirror
- Short controller swipes give short precise steps; normal swipes are faster and stopping applies much stronger friction
- Monster moves like survivors, receives a modest speed bonus and gravity advantage; no longer launches automatically when its arms move
- Solid structural colliders, grass/decorations do not block movement, hand visuals stay at actual controller coordinates
- Left Y and right B activate survivor grapple; monster B/Y roar; X menu and A jump unchanged
- Slightly more forgiving server-validated weapon grabbing
- Color Apply refreshes the local avatar/arms and mirror immediately on server acknowledgement
- Optional proximity voice fade while preserving regular VOIP fallbacks and microphone-driven mouths

### Preserved from v15.4
- 3 dense haunted maps, blood pouring from injuries, severed shared body-part physics, public/private matchmaking, the horror lobby
- Cosmetics, 1000 RGB variants, Crickets & Dabloons, quests, tools, code redemptions, account recovery and server-side profile saving
- No Lucky Lily

### Known limitations
- Requires actual Quest playtest before launch; not hardware-validated
- Cannot promise permanent accounts without PostgreSQL or a confirmed persistent disk on Render
- No new survivor-generator mission, door destruction, expanded achievement catalogue or spectating screen in this source yet
- Voice may require TURN provider credentials and permission approval
- Approximate procedural models; not a directly imported 3D mesh from the image reference

### Verification
`npm test` (Node 22+), then physical Quest checklist in `QUEST_TEST_CHECKLIST.md`.
