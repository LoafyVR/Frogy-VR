# Frogy — Future Update Backlog (NOT IMPLEMENTED)

These ideas are deferred. Do not implement or assign them to a specific version without a new request from the user. Prioritize stable Quest movement, interactions, and multiplayer performance before adding major visual features.

## 1. Character visual redesign — postponed, version TBD

**User-requested future feature (November 25, 2026):** Rebuild the actual in-game Frogy character to resemble the latest approved concept image, not the current in-game model. This is a **visual reference/concept**, not a screenshot of the current game. The user explicitly said **not to implement it yet**.

Reference image in this package: `FUTURE_CHARACTER_VISUAL_REFERENCE.png`.

Planned design:
- Friendly wide frog face with large raised eyes and a clear open smiling mouth; rounded but fairly compact green torso and prominent pink belly.
- Long slender two-segment arms with visible elbows and natural controller/head tracking; keep very short stubby legs.
- Mirrored left and right frog hands with **exactly three digits total per hand** (including thumb) and rounded orange fingertip pads; subtle frog spots and smooth simplified materials.
- Blinking, mouth/finger/body animations where feasible; preserve existing customization, survivor/monster distinction, and first-person visibility.
- Make actual optimized WebGL/WebXR 3D geometry and animation; **not** a flat image or purely conceptual art. Visual additions must not create extra physics colliders or worsen Quest performance/movement.

Do not replace in-game assets, change gameplay code, or automatically schedule this for v16.7.

## 2. Menu and Room Computer redesign — postponed

User requested November 25, 2026; intentionally defer until after movement/hands are physically Quest-tested:

- Consolidate all shops (cosmetics and Tools) under one **Shop** section, with sub-tabs.
- Move **all redeem codes** and **player-name changes** into the lobby Room Computer, while preserving account recovery and privacy.
- Consolidate other menu pages where sensible, without losing Inventory, Friends, Reports, Settings or Quests.
- Support **right joystick scrolling** through long sections and a **physical, draggable scrollbar/dial** at the side of the panel.
- Don't take away the X-button menu toggle or A-button jump without approval.
- Audit page focus, legibility, pointer hit targets, and Quest comfort; test on two headsets.

## 3. LIV-style camera system — postponed

- Explore third-person, handheld, selfie, and stabilized spectator/capture views, with camera visibility controls.
- Check Quest Browser/WebXR technical limits and optimize for headset performance; no camera features have been added yet.

This is a project planning note, not an automatic scheduled reminder.
