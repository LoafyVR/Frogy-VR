# Frogy v16.5 — Phantom Contact & Blocked Grapple Rescue

- Replaced virtual standing-height *floor* contact with actual physical contact only. Independent standing movement remains active through arm-stroke and downstroke physics.
- Tongue does **not** spawn colliders; added obstruction detection so a blocked grapple automatically detaches instead of repeatedly pushing into walls.
- Improved body sweep to slide along real walls and recover from partial embedding.
- Anatomically mirrored left/right three-finger paws; preserved full-controller rotation and button pressure curls.
- Created a tapered organic tongue graphic with a rounded sticky endpoint, strictly visual (no hitbox).
- Rejected sub-centimeter vertical jitter for hop launches and removed artificial body Y offset on hand push.
- Preserved all v16.4 weapons, medkits, economy, cosmetics, account and voice functionality.
- Still needs physical Quest verification; code tests are not a Quest playtest.

# FROGY v16.4 — Clear View, Crisp Aiming, More Weapons & Medkits

- First-person body shrunk/lowered so it does not fill the headset view.
- Blaster barrel follows tracked controller pitch/yaw; server ray stops at the first target, cover or ground, and renders a short muzzle flash and clear impact beam.
- Blaster graphics have more detailed metallic parts and a tighter silhouette.
- New survivor weapons: Bog Sword (long reach) and Swamp Mallet (heavy damage), using grip to grab/drop and trigger to attack.
- **Exactly two single-use medkits per round** placed in safe, separate areas. Use grip near a kit while injured to heal 55 HP, never above the original survivor maximum (175 HP). Kits also stop a bleeding wound but do not regrow lost arms.
- Full-health players cannot waste a medkit; the Mega Frog cannot use them.
- Existing profile data, economy, lobby, movement v16.3, hands, cosmetics, voice and blood systems preserved.

Still requires actual Quest hardware validation; automated tests can prove server rules but not visually confirm hand alignment or weapon feel.
