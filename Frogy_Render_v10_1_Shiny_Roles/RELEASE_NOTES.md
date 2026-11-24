# Frogy v10.1 release notes — 2026-11-23

- Metallic head-tracked role plaques: shimmering blue MOD / gold OWNER above the username, using the same per-viewer billboard as ordinary nametags. OWNER takes priority if both roles are held.
- Active branch: Node.js + WebXR on Render; no Unity changes.
- Timed trigger-held wall cling with 4.5s single-paw and 7.6s dual-paw maximum, climb strokes, instant release and contact grace.
- New first-time tutorial step for wall sticking; small in-world cling duration bar.
- Animated code redemption success/error response, plus original locally bundled success chime and cling attach/release sounds.
- `IHVDL` one-time MOD badge; authorization requires `FROGY_MOD_PUBLIC_IDS` allowlist. OWNER code authorization remains `FROGY_DEV_PUBLIC_IDS`.
- Server-authoritative, logged, limited `KICK` action (separate from `REPORT`) for authorized MOD/OWNER profiles, with 15-minute same-room rejoin block and prevention of moderator-on-moderator kicks.
- Outdoor swamp lobby redesign with dark water, boardwalks, trees, rug, benches, marsh lanterns and reeds. Same parkour/shops/dressing/computer, and physical map vote board untouched.
- Profiles and credentials excluded from distribution ZIP.
- Automated checks and real HTTP/WebSocket checks pass. No actual Quest test or full WebGL render validation available in this environment.
