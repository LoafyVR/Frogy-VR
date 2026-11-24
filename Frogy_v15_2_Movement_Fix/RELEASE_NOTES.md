# Frogy v15.2 — Movement rescue based on v15.1

- Fixed a confirmed `ReferenceError: cap is not defined` in the real VR controller stroke handler. Previously, a valid Gorilla Tag-style paw stroke could throw before rendering could finish. `FrogyMotion.speedCap` is now shared by the physics and input handlers.
- Added a regression test that executes the actual `updateVRInputs()` controller handler using simulated Quest-like tracking to verify forward propulsion, speed capping, paw height, and contact release.
- Updated health endpoint, launch UI, in-headset panel and script cache labels to v15.2.
- Retained all v15.1 features, including complete retirement of the Lucky Lily prize machine, and preserved the separate lily-pad parkour course.
- **Not yet physically verified on a Quest headset or confirmed deployed to Render.**

## Previous release: v15.1 — Lucky Lily removal

- Removed the Lucky Lily cabinet, animated GPU texture, menu button, collider, trigger interaction, reward server message and profile spin state.
- Preserved economy balances, daily rewards, cosmetics, names, tools, and NPC practice.
