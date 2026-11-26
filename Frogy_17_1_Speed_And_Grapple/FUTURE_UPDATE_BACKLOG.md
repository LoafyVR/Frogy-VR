# Frogy — Future Update Backlog (NOT IMPLEMENTED)

Frogy v16.9 includes the live player counter and experimental Camera Lab. The next priority is headset verification of grounded survivor movement; do not redesign monster locomotion until the user says survivor movement feels good.

## Completed in v16.8 — Live player counter on landing page

**Implemented in v16.8 (requires deployment).** On the Frogy home/landing page—the screen with the **Enter VR** button—display a small, legible counter at the **bottom of the page** such as **“Players Online: 12”**.

- Count **current human players with active in-game multiplayer connections**, across public and private rooms on the live service. Do not count lifetime accounts, ordinary website visitors, duplicate browser tabs, or Tadpole NPCs as players.
- Use a server-supplied count rather than an invented or static number; update while the landing page is open and when players connect or disconnect.
- Keep the counter compact, mobile/Quest Browser legible, and unobtrusive; no names, room codes, or private-room details.
- Handle disconnects and network errors gracefully without showing a misleading number.
- Implement in the **next game update** the user requests, after checking that the counter cannot slow down the VR game or disrupt multiplayer.

## 1. Character visual redesign — postponed, version TBD

**User-requested future feature (November 25, 2026):** Rebuild the actual in-game Frogy character to resemble the latest approved concept image, not the current in-game model. This is a **visual reference/concept**, not a screenshot of the current game. The user explicitly said **not to implement it yet**.

Reference image in this package: `FUTURE_CHARACTER_VISUAL_REFERENCE.png`.

Planned design:
- Friendly wide frog face with large raised eyes and a clear open smiling mouth; rounded but fairly compact green torso and prominent pink belly.
- Long slender two-segment arms with visible elbows and natural controller/head tracking; keep very short stubby legs.
- Mirrored left and right frog hands with **exactly three digits total per hand** (including thumb) and rounded orange fingertip pads; subtle frog spots and smooth simplified materials.
- Blinking, mouth/finger/body animations where feasible; preserve existing customization, survivor/monster distinction, and first-person visibility.
- Make actual optimized WebGL/WebXR 3D geometry and animation; **not** a flat image or purely conceptual art. Visual additions must not create extra physics colliders or worsen Quest performance/movement.

Do not implement the remaining deferred design requests without user approval.

## 2. Menu and Room Computer redesign — postponed

User requested November 25, 2026; intentionally defer until after movement/hands are physically Quest-tested:

- Consolidate all shops (cosmetics and Tools) under one **Shop** section, with sub-tabs.
- Move **all redeem codes** and **player-name changes** into the lobby Room Computer, while preserving account recovery and privacy.
- Consolidate other menu pages where sensible, without losing Inventory, Friends, Reports, Settings or Quests.
- Support **right joystick scrolling** through long sections and a **physical, draggable scrollbar/dial** at the side of the panel.
- Don't take away the X-button menu toggle or A-button jump without approval.
- Audit page focus, legibility, pointer hit targets, and Quest comfort; test on two headsets.

## 3. Camera Lab — beta already integrated, remaining work deferred

- v16.7-v16.9 include POV/follow/selfie/tripod/handheld camera modes and optional microphone capture, accessible from X → Settings → Camera Lab.
- Confirm recording performance and audio/download behavior on actual Quest hardware before considering the beta complete.
- Direct saving into Meta Quest Gallery and full official LIV SDK integration are not implemented.

## 4. Monster-specific movement — wait for approval

- User explicitly wants **survivor movement to feel good first**. After that, improve Mega Frog mobility and make it genuinely playable/fun, using survivor contact physics as a reliable base.
- Do not add monster speed or special abilities during the current survivor-movement repair unless specifically requested.

This is a project planning note, not an automatic scheduled reminder.
