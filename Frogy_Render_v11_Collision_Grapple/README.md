# FROGY v11.0 — Collision & Tongue Grapple (Render / WebXR)

**Frogy is spelled with one G.** This is the existing **VR-only browser game** deployed as a Node.js/WebSocket service on Render. **This is not the paused Unity project, a native Quest APK, or a Meta Store release.**

## Changes in this release

- **Collision and arm movement overhaul (priority):** New `public/collision.js` defines shared solid surfaces for the lobby boundary, solid furnishings, major posts, and the seven lily-pad parkour platforms. The game uses the same geometry for paws, body collision, landing, wall contact and grapple targets. Visible paws are smaller and their contact point moves with the one visible paw—there is no duplicate paw or long artificial reach rod. Body-side and landing checks are used for map obstacles too. We fixed an extra horizontal translation during hand pushes that could destabilize movement. **Not yet verified on an actual Quest**; decorative leaves/reeds are not all collidable.
- **Right B: tongue grapple.** Press the **B button on the right Quest controller** to fire a tongue toward a collidable object up to 16 meters away. It pulls you toward the hit for a short burst; press B again to disengage or release automatically after ~1.6 seconds. There is a brief cooldown. This is separate from right-A momentum jump, left-X menu, and trigger-held wall sticking. The monster's former B roar has moved to the right stick-click action.
- **Lighting:** Brighter, localized moonlit swamp illumination and more readable character rim lighting, while retaining the mysterious horror tone. Lighting is still authored with a custom procedural WebGL shader rather than photorealistic assets.
- **Dressing mirror:** An interactive-feeling **live character preview** is displayed at the lobby dressing mirror, showing your current frog color and equipped hat/face accessories, with animated arms and mouth. It is **an avatar preview**, not a ray-traced reflection of the full room.
- **Starting Crickets:** First-time accounts start with **500 Crickets**. Returning-player daily reward stays **100 Crickets**, available at/after midnight in `America/New_York`. Existing profiles are not reset.
- **Pinned VR menu:** The X-button menu stays in the same world-space location after opening, even when you turn your head. Close with X and reopen to reposition. VR menu interaction remains controller-trigger based.
- **Private room computer:** Adds Create Private Room / Join Code actions and a computer-like **QWERTY** headset keypad. Existing server-side 5-character private codes/public matching are preserved.
- **Codes and moderation:** OWNER code hints are no longer printed on the menu. Per the requested game rule, anybody who knows `IHVDL` can redeem it **once per profile** and receive MOD/kick rights. OWNER code rewards stay restricted server-side; repeatable OWNER currency reward is still restricted. **Security caution:** A public moderator code lets anybody who learns it kick other players. Consider disabling/restricting it before releasing to strangers. Kicks are logged, rate-limited, and cannot target MOD/OWNER accounts.
- **Voice / faces:** Retains opt-in WebRTC voice chat and lip/eye animation driven by the players' reported voice levels. Survivor voices have a higher-pitch filter; monster voices sound lower. WebRTC has only STUN configuration in this prototype—some connections will need a TURN server, permissions and moderation testing. Do not assume voice always works.
- **Everything from v10.1 remains:** Moonlit swamp lobby, original map-voting station, parkour course, wall cling (trigger-hold; 4.5 seconds for one hand, up to 7.6 for two), jumps, cosmetic shop/Crickets, Dabloons tools/quests, public lobby + private room system, shiny MOD/OWNER tags, social features, weapons and monsters.

## MacBook → existing GitHub/Render app (no restart or new service)

1. **Finder → Downloads**: double-click `Frogy_Render_v11_Collision_Grapple.zip` to extract it.
2. In your **existing Frogy GitHub repository**, locate the directory that currently contains `server.js`, `package.json`, `economy.js`, and `public/`. This directory is currently used by Render's **Root Directory** setting.
3. Upload/replace the **contents** of `Frogy_Render_v11_Collision_Grapple` in that existing directory. Preserve its subfolder structure (`public/`, `test/`). Do not upload the outer version folder as an unintended extra level. Do not upload your `.env`, saved `data/`, tokens, secrets, or `node_modules`.
4. Commit changes on GitHub (e.g., `Frogy v11 collisions and tongue grapple`).
5. In the **Render dashboard → Frogy-VR → Deploys**, wait for an automatic deployment. If none begins, choose **Manual Deploy → Deploy latest commit**.
6. If you replaced the files within the existing Root Directory, **leave Root Directory unchanged**. Only if you uploaded the whole extracted folder at repository top-level should you change **Render → Settings → Root Directory** to exactly `Frogy_Render_v11_Collision_Grapple`.
7. Test `https://frogy-vr.onrender.com/` in **Meta Quest Browser**. Close/reopen the tab if an older build is cached; the launcher version should display v11.0.

### Player-profile persistence: important

The server writes to `data/profiles.json` locally, which **does not reliably survive Render service redeploys/restarts**. Use Render Postgres with `DATABASE_URL`, or an attached persistent disk with `FROGY_DATA_DIR`, to retain player names, Crickets, Dabloons, MOD/OWNER titles, codes, inventory, quests and friends. **Do not upload an old or test `profiles.json`** with this update. Profiles are browser-token based, not fully authenticated accounts.

### Local code tests

With Node.js 22+ installed, in the game folder run:

```bash
npm install
npm test
npm start
```

The server also supports Render's `PORT` environment variable. Source is independent of the paused Unity prototype.

## Validation and limitations

- **24 automated Node tests pass** as of 2026-11-24, including historical game/economy/social tests and new collision, grapple, headset-menu, QWERTY, Crickets and moderation tests.
- Server HTTP startup was checked locally. We could not obtain a reliable real WebGL render or physical Quest runtime in this environment. This means **rendered lighting/mirror, VR hand feel, room keyboard click targets, voice/audio, stereo performance and controller ergonomics are NOT headset-verified.** A passing test is not a guarantee that locomotion works on a Quest.
- The collision model is built for major solid geometry, not every decorative object; walls and level elements still require physical-Quest testing, and remote multiplayer synchronization should be checked with two headsets.

See `QUEST_TEST_CHECKLIST.md` for a precise, in-headset playtest protocol.
