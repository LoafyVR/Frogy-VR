'use strict';
/* Frogy wall cling — grip with a held trigger near a REAL wall collider.
   Stateless geometry detection belongs in game.js; this module owns only
   the attachment timer, trigger release, and motion safety. */
const FrogyCling=(()=>{
 const SINGLE_MS=4500,DOUBLE_MS=7600,REARM_MS=800;
 const initial=()=>({startAt:null,expired:false,lockedUntil:0,active:false,seconds:0,hands:0});
 function tick(previous,now,inputs,disabled=false){
  const prev=previous||initial(),l=!!inputs?.left?.wall&&!!inputs?.left?.trigger,r=!!inputs?.right?.wall&&!!inputs?.right?.trigger,
   anyTrigger=!!inputs?.left?.trigger||!!inputs?.right?.trigger,count=(l?1:0)+(r?1:0);
  if(disabled||!anyTrigger){return {...initial(),lockedUntil:prev.expired?Math.max(prev.lockedUntil,now+REARM_MS):prev.lockedUntil};}
  if(!count)return {...prev,active:false,hands:0,seconds:0};
  if(prev.expired||now<prev.lockedUntil)return {...prev,active:false,hands:count,seconds:0};
  const startAt=prev.startAt??now,limit=count===2?DOUBLE_MS:SINGLE_MS,remain=limit-(now-startAt);
  if(remain<=0)return {startAt,expired:true,lockedUntil:0,active:false,seconds:0,hands:count};
  return {startAt,expired:false,lockedUntil:prev.lockedUntil,active:true,seconds:remain/1000,hands:count};
 }
 function wallEligible(touch,lastContactAt,triggerHeld,now){return !!triggerHeld&&(!!touch||(Number.isFinite(lastContactAt)&&now-lastContactAt>=0&&now-lastContactAt<=100));}
 function climbStroke(before,after,dt){
  if(!before||!after||dt<=0||dt>.09)return 0;
  const moved=before[1]-after[1];
  return Math.abs(moved)>.27?0:Math.max(-.115,Math.min(.115,moved*.87));
 }
 return {SINGLE_MS,DOUBLE_MS,REARM_MS,initial,tick,wallEligible,climbStroke};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyCling;
if(typeof window!=='undefined')window.FrogyCling=FrogyCling;
