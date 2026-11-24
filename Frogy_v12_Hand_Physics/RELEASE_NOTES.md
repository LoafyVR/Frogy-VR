# Frogy v12.0 — Release notes

**Base:** Frogy v11 (Render/WebXR)  
**Focus:** paw tracking height, arm locomotion, tree and lily-pad physics, new paw appearance, slim frog animation, dancing lobby mirror.

- Visible controller paws no longer inherit a false downward reach offset.
- Ground/wall contact uses collider reach without a second visible paw or hand rod.
- Faster but bounded push response; downward hand presses produce controlled lift, including upward wall strokes.
- Trees in playable lobby area and the seven parkour lily pads share render/collision layouts; continuous downward landing checks reduce missed collisions.
- Three long green fingers with orange round fingertips and speckles, referencing the user-supplied hand picture; slimmer, legless survivor frogs and motion-driven animation.
- Mirror preview frog bobs, sways and waves its arms, with a funny expression and music notes; its animation does not affect actual tracked hands. Player colors and selected hats/face accessories continue to appear.
- Browser launcher, VR menu and asset query versions now identify v12.0 to reduce cache confusion.

**QA:** 25 automated suites passed; JavaScript syntax checks passed. **Not tested in physical Quest VR**. Deployment to Render is a separate user step.
