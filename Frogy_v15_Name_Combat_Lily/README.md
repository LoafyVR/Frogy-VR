# FROGY v15.0 — Names, Monster Combat & Lucky Lily

**Active branch: Render/WebXR / Meta Quest Browser. Not Unity or a native APK.**

## Changes

- **Change Name:** A new **NAME** tab appears in the headset X menu, including between and during rounds. Use the trigger-operated QWERTY/number keyboard to type a 2–18-character frog name, then select **SAVE NAME**. The server validates, saves, and broadcasts the name to other players. The game is a WebXR website and **cannot automatically fetch the headset's Meta username** through the standard WebXR interface. Reconnect using the same browser profile to retain the name.
- **Survivors:** 175 hidden HP, up from 100. The Mega Frog has **520 hidden HP**, up from 350. Survivors can now bring the monster down with multiple accurately aimed weapon hits (65 HP per blaster hit or 85 per knife hit on the monster). Hit feedback is shown, but exact HP remains server-only.
- **Arm loss:** A survivor can remain alive after a single arm is detached. The first rip starts a **45-second** injury/bleed-out timer. A second damaging hit or another rip can eliminate them sooner. A survivor can win or fight during that window; no health bar is shown. A short injury countdown is visible to the injured player.
- **Mega Frog movement:** Lower gravity (4.65 versus 7.65 for survivors), faster horizontal travel and automatic high hops off strong arm strokes when grounded; no need to press A for those hops. A jumping still works. Automatic hops are input-dependent, not a fully autonomous flight mode.
- **Lucky Lily:** Moved to a prominent location near the central lobby spawn, larger cabinet/sign, a more forgiving two-sided trigger hit area, and a **SPIN LUCKY LILY** shortcut in the POND menu. Still one free spin per Eastern calendar day and **no bets**. Random prizes range from 0 coins (a silly dud) and 1 Cricket to bigger Cricket/Dabloon bonuses; no spin deducts a currency.
- **No lost features:** Wall cling, tongue grapple, parkour, color and promo codes, server hopping, private lobbies, NPC practice, Crickets/Dabloons, cosmetics, quests, audio, and map voting are retained.

## MacBook deployment to your existing Render service

1. Download and double-click `Frogy_Render_v15_Name_Combat_Lily.zip` in Finder → Downloads.
2. Open your **existing** GitHub Frogy repository, and locate the folder containing `server.js`, `economy.js`, `package.json`, and `public/`.
3. Replace the **contents** of that folder with everything inside the unzipped `Frogy_v15_Name_Combat_Lily` folder, including the full `public/` and `test/` directories.
4. Commit changes to GitHub. In **Render → Frogy-VR → Deploys**, allow automatic deploy or select **Manual Deploy → Deploy latest commit**.
5. If you replaced files inside the existing service root, **do not change Root Directory**. If you instead uploaded the entire `Frogy_v15_Name_Combat_Lily` folder at the repository root, set **Render → Settings → Root Directory** to `Frogy_v15_Name_Combat_Lily`.
6. Once Render reports Live, check `/health` for version `15.0.0`, then open `https://frogy-vr.onrender.com` from Quest Browser. Reload the page if necessary so the browser loads the updated v15 scripts.

### Data safety

Do **not** upload `data/profiles.json`, browser session tokens, `.env`, or a real `DATABASE_URL`. These are excluded from the release archive. Profile changes and currencies require Render Postgres (`DATABASE_URL`) or a persistent disk (`FROGY_DATA_DIR`) to **survive server restarts reliably**. Existing profiles should retain their previously earned coins and purchases; only **new** profiles get the 500 Crickets + 1,000 Dabloons starting balances already introduced in earlier versions.

## Quest test order

1. Open the X menu → **NAME**; save a nickname, close X, check the nametag from a second headset. Reconnect and verify persistence.
2. In a **private room**, redeem **NPC**, play the first round as monster and the second as survivor, pick up a blaster, and hit the idle monster until survivors win. This is a good combat test independent of matchmaking.
3. As a monster in a real two-player room, move using **arm strokes** without A to check the automatic bounce and longer airborne travel. Avoid excessive movement if it induces discomfort.
4. Perform one arm-rip on a survivor, confirm the survivor remains active and the injury timer runs about 45 seconds; a second damaging hit can end the timer early.
5. In the lobby near your spawn, find the **Lucky Lily** cabinet to the right. Close X and point the trigger at it; also try **X → POND → SPIN LUCKY LILY**. Verify the payout or dud message and that a second spin on the same Eastern day is blocked.

**Validation limits:** Automated server, browser-source and physics-helper tests are not a physical Quest playtest. The monster's airborne motion, VR menu text, and Lucky Lily visibility still need headset testing. The game is not a Meta Store APK.
