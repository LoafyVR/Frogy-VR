# FROGY v14.0 — Solo Test NPC + Lucky Lily

**Render/WebXR source for Quest Browser.** This is the continuation of Frogy v13, not Unity or a finished Meta Store APK. **It is not deployed yet.** Existing website: https://frogy-vr.onrender.com/.

## What is new

### 1. `NPC` — single-player test rounds

- Open **Frogy on Quest → press left X → ROOM PC → CREATE** to make a **private** room.
- Stay alone in that room. Open **CODES**, enter **NPC** on the QWERTY keypad, and select **REDEEM**. For easier testing, the **POND** tab also has a **SOLO TEST · SPAWN IDLE NPC** shortcut when you are alone in a private room.
- **Practice Tadpole** joins as a stationary, server-controlled frog, counted as the room's second participant. The normal countdown begins, followed by a **two-minute** round (unless your Render `ROUND_MS` setting overrides it).
- First round: **you are the Mega Frog**, NPC is an idle survivor. Second round: **NPC is the idle monster**, and you are a survivor. The roles alternate so you can test both sets of tools, attacks, and menus. The NPC doesn't move, chase, fire, or interact.
- You can enter **NPC** again at any time while you are the only human in that private room. It confirms the bot is already present rather than spawning duplicates. The code is not consumed and has no daily limit.
- This is for **testing**, not currency farming: solo NPC rounds do not award quest progress or permanent stats. Existing Crickets and Dabloons are untouched.
- When a second real player joins the private code, the NPC disappears and the room resumes normal two-human matches.
- `NPC` cannot be used in public rooms or in a private room with two or more real players. Your friends still use the regular five-character private invitation code to join.

### 2. Lucky Lily — free daily prize machine

- In the **swamp lobby**, walk toward the dressing-hut side to see **LUCKY LILY** near `(x≈7.2, z≈-4.8)`.
- Point your controller at its front panel, then **tap the trigger**. No wager, purchase, or real money is involved.
- One free spin per **Eastern calendar day**, resetting after **midnight America/New_York** (EST/EDT adjusted).
- Server randomly awards **15, 30, or 60 Crickets, or 10 Dabloons**. Awards are saved to the same profile as other currencies, and cannot be requested twice during a single Eastern day.
- The machine can be used in the waiting/countdown/intermission lobby, not during an active match.
- The original **map voting board has not been changed**.

## Installation on MacBook — update your EXISTING Render service

1. Download the v14 ZIP and double-click it in **Finder → Downloads**.
2. Open your existing Frogy GitHub repository. Go to the folder containing `server.js`, `economy.js`, `package.json`, and `public/`.
3. Replace the *contents* of that directory with the files **inside** `Frogy_v14_Solo_NPC_Lucky_Lily`, including the new `public/luckylily.js`. Do **not** upload any old `data/`, `profiles.json`, `.env`, account tokens, `node_modules/`, or log files.
4. Commit. On **Render → Frogy-VR → Deploys**, confirm it auto-deployed or select **Manual Deploy → Deploy latest commit**. The service address remains unchanged.
5. Check `/health` for `"version":"14.0.0"`. In Quest Browser close/reopen the tab to refresh scripts. The VR menu should show `v14.0`.

**Root Directory:** If you replaced contents inside the existing folder, **leave the setting unchanged**. If you instead uploaded a single new version folder at the GitHub repository root, change **Render → Frogy-VR → Settings → Root Directory** to exactly `Frogy_v14_Solo_NPC_Lucky_Lily` and redeploy.

## Testing and limitations

- `npm test` exercises prior multiplayer, codes, economy, and movement logic and a new two-client simulated networking test for NPC practice and daily prize restrictions.
- This build retains v13 movement without a new physics rewrite. Your friends reported movement was still choppy; it remains a known issue, not fixed here.
- No physical Quest/WebXR gameplay test or complete browser-rendering verification was possible here. Test that the 3D machine appears and its trigger works; verify the idle NPC, role choice, timer, weapon effects, and normal matchmaking in your headset.
- Persistent prizes, profiles, balances, friends, and role badges require **Render Postgres `DATABASE_URL` or a persistent disk**. Render's default filesystem can be wiped at restarts/deployments.
- Current open MOD code design allows anyone with `IHVDL` to obtain kick privileges. This is not safe for an unmoderated public release; restrict moderator rights before public launch.

## Test locally (for developers)

In the extracted folder (Node.js 22+):

```bash
npm install
npm test
node server.js
```

Then `http://localhost:3000/health` should show the current version. Desktop play remains disabled as intended; use Meta Quest Browser for VR interactions.
