'use strict';
const assert=require('node:assert/strict'),motion=require('../public/movement.js');
assert.ok(motion.virtualReach(1.75,1.12)>motion.virtualReach(1.15,1.12),'Reach adapts to headset height');
assert.ok(motion.floorContact([0,1.1,0],0,1.75,1.12),'Relaxed standing hands virtually reach floor');
assert.equal(motion.floorContact([0,1.75,0],0,1.75,1.12),false,'Hands held high are not touching ground');
assert.ok(motion.handPush([0,1.16,0],[0,1.09,-.10],.025,1.75,true,false));
assert.ok(motion.preserveJump({x:5,y:0,z:-3}).x===5);
assert.ok(motion.drag(false,.02)>motion.drag(true,.02));
console.log('PASS: standing-height virtual arms, floor collision, direction and momentum physics.');
