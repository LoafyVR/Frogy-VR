# FROGY — proposed v15.5 controller layout (NOT IMPLEMENTED)

The Quest controller cannot gain physical buttons. We can reassign the existing A/B/X/Y, triggers, grips and joystick clicks, but will only do so after the game owner approves.

| Control | Proposed v15.5 purpose |
| --- | --- |
| Right **A** and left **X** | Both jump, including momentum and second jump when equipped |
| Right **B** and left **Y** (survivor) | Context action: pick up nearby weapon/part first, otherwise shoot tongue grapple |
| Right **B** and left **Y** (Mega Frog) | Roar; no tongue grapple |
| Either **grip** | Pick up/hold/drop weapons and loose parts; monster grip attacks remain optional/role-bound |
| Either **trigger** while touching a wall | Hold to cling and climb; release to fall |
| Trigger away from wall (match) | Survivor shoot/swing held weapon; monster punch |
| **Left thumbstick click** | Toggle in-VR menu (moves menu off left X) |
| Right thumbstick direction | Optional snap/smooth turn, never walk |

**Tradeoff:** left X no longer opens the menu, so everyone must learn left-stick click. We should show this in the tutorial and allow menu toggle via a fallback option for people whose sticks are difficult to click. Verify button indices with real Quest 2, 3 and 3S controllers first; never make jump dependent on a missing gamepad pose.

**Questions for approval:** Is left-stick click for the menu okay? Should B/Y prioritize picking up objects only when a hand is physically close, and tongue otherwise? Should monster gripping continue to rip/chomp by side, as today? No changes to this mapping have been deployed in v15.4.
