# Frogy 19 — Map movement and combat polish

Built from the **Frogy 18.1 package with TKDYP**, preserving HROHN, STOP, TUFF, the shared tongue cooldown, the monster's electric grapple, rocket boost, camera/microphone beta, badges, and the other existing game systems.

## Changes

1. **Crowded-map movement consistency:** Removed conflicting server-side structure projection of the XR headset position. The client still sweeps virtual movement against real solid structure footprints. The approved Frogy 17.2 `public/movement.js` hand-push engine is **byte-for-byte unchanged**.
2. **Forest/Quest rendering:** Reduced excessive detail on distant props and ground dressing at default graphics quality without removing trees, maps, cover, grapple targets, or changing collision geometry.
3. **Medkits:** A full-health grab is refused without consuming the kit, with a prominent immersive-VR message, “MEDKIT NOT NEEDED — FULL HEALTH.” Trigger can also collect a medkit when unarmed and near it.
4. **Volume:** General sound effects are around 36% quieter at the same master-volume setting. The repeated nearby-monster round beep is replaced with a softer, slower heartbeat, which starts only at closer distances.
5. **Monster health bar:** A visible overhead health bar for the monster, updated from the server after every hit; it is hidden during active disguise. Starting monster HP scales with the number of survivors: **300 HP for 1**, then **+85 per additional survivor**, up to **810 HP for 7**. The starting max is fixed during that round.
6. **No extra movement-start step:** The VR menu no longer opens automatically to block movement when a Quest session begins or a round starts. The required **Enter VR** launcher click is still necessary because browsers require a user gesture for immersive VR. The X menu and physical tutorial remain available.
7. **Weapons:** Blaster uses physically shaped cover and enlarged, reasonable monster hit volumes, supports holding the trigger for repeated shots, and has a faster fire rate. Sword/mallet/knife use the tracked weapon hand and a more forgiving swing arc; switching weapon types no longer inherits the previous weapon's cooldown.

## Caution

These fixes are validated by unit tests and live WebSocket tests; **actual Meta Quest testing is still necessary** to confirm the crowded-map movement feel, comfort, sound volume, and headset visuals. In particular, cross-device microphone playback and Camera Lab download behavior cannot be guaranteed by these tests.

Permanent player data still requires persistent Render storage (`DATABASE_URL` or a properly mounted persistent disk).
