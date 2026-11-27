Frogy 19 — movement map consistency, reliable combat, monster HP bar, quieter audio.

**For this update read `FROGY_19_RELEASE_NOTES.md` and `QUEST_FROGY_19_TEST_CHECKLIST.md`.**

# Frogy 18.1 — Ground Push & Session Codes

**Full Meta Quest Browser / Render game**, based on Frogy 18. Keep your older folders as backups.

## Deploy
1. Unzip this archive and place the **Frogy_18_1_Ground_Push_Codes** folder at the top level of your `LoafyVR/Frogy-VR` GitHub repository.
2. Commit and **Push origin** in GitHub Desktop.
3. In Render, change **Root Directory** to `Frogy_18_1_Ground_Push_Codes` and deploy the latest commit.
4. Check your Render `/health` endpoint reports version `18.1.0`.

## Highest-priority test
While standing, lower both hands to normal reachable floor height and **push forward and downward WITHOUT pressing trigger or grip**. The hand should touch the floor and propel the frog normally. Repeat in the lobby, arena, and as Mega Frog. Also jump and wave hands in empty air to confirm there is no extra midair push. This logic is code-tested, not yet Quest-confirmed.

## New codes
- `HROHN` — applies **2× movement push and speed cap** until disconnect/logout; stacks multiplicatively with existing monster and Swift Legs multipliers. Repeat redemption is idempotent. Never persisted to account storage.
- `STOP` — disables the session's HROHN boost immediately. Can re-enable with HROHN.
- `TUFF` — one-time permanent unlock of a chest badge with a sunglasses-wearing frog and brown TUFF lettering. The badge is auto-equipped and also managed under **Dress Up → Badges**. Codes redeem through the existing VR CODES menu.

The existing save system must still use **Render Postgres** or a verified persistent disk to retain account unlocks across Render redeploys. The default Render filesystem is temporary.

The monster's arms are bigger **only in the rendered models**. Survivor push physics, jump force, grapple cooldown, combat, Rocket Hop, camera, voice, maps, weapons, and medkits remain from Frogy 18.

See `FROGY_18_1_RELEASE_NOTES.md`, `FROGY_18_1_TEST_RESULTS.md`, and `QUEST_18_1_TEST_CHECKLIST.md`.

**Session codes (Frogy 18.1):** HROHN = 2× speed; TKDYP = 0-second ordinary tongue-grapple cooldown; STOP turns off both; all session effects reset on disconnect. TUFF is a permanent badge unlock.
