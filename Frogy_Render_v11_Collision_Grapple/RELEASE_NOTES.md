# Frogy v11.0 — Collision & Grapple

**Platform:** Existing Render/WebXR Quest-browser game (not Unity/APK). **Date:** November 24, 2026.

### Movement and geometry
- Shared, test-covered collider model for main lobby furniture, solid boundaries and seven parkour pads; uses the same surfaces for hands, body, landing and grapple.
- Smaller, less intrusive single visible frog paws with integrated near-ground reach/contact rather than detached contact poles.
- Repaired duplicate horizontal movement offset in the VR locomotion update; collision correction and landing updated.
- Grapple rope on **right B**, with collision raycast, 16-meter max distance, short automatic release and cooldown.

### Lobby and interface
- Pinned world-space VR menu on X press; repositions when closed and reopened.
- Mirror updated with live frog outfit/color avatar preview (not a full spatial reflection).
- Moonlit lighting readability adjusted; horror atmosphere preserved.
- Room computer/private code creation and code entry use QWERTY keys.
- First-time balance: **500 Crickets**; Eastern-midnight daily **100** remains.
- OWNER-code hint hidden. `IHVDL` unlocks MOD once for any player; owner codes still protected. Allowing public MOD grants kick rights to anyone who knows the code.

### Player expression and communication
- Retains opt-in peer voice chat and amplified frog talking facial animation; subject to WebRTC/STUN networking limitations and microphone permission.

### Compatibility and QA
- All existing gameplay/economy/social features retained, including wall cling and shiny role nameplates.
- 24 Node test suites passed. Local HTTP server startup was checked.
- Not physically tested on Quest; WebGL stereo lighting, collisions, tongue ergonomics, voice chat and VR keyboard still require headset validation.
