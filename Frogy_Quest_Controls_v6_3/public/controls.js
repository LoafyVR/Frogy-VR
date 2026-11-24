'use strict';
/* Standard WebXR gamepad mappings. Edge detection must inspect previous and current
   snapshots before replacing previous state (formerly release would always be false). */
const FrogyControls=(()=>{
 function pressedEdge(previous,current){return !!current&&!previous;}
 function releasedEdge(previous,current){return !!previous&&!current;}
 function button(gp,i){return !!gp?.buttons?.[i]?.pressed;}
 function menuLatch(prev,down,now){
  const state=prev||{armed:true,releasedAt:null,pressed:false};
  if(down){if(state.armed){return {state:{armed:false,releasedAt:null,pressed:true},toggle:true};}
   return {state:{armed:false,releasedAt:null,pressed:true},toggle:false};}
  const first=state.releasedAt===null||state.releasedAt===undefined?now:state.releasedAt;
  const armed=state.armed||now-first>=105;
  return {state:{armed,releasedAt:first,pressed:false},toggle:false};
 }

 function thumbX(gp){if(!gp?.axes)return 0;const a=gp.axes.length>=4?gp.axes[2]:gp.axes[0];return Number.isFinite(a)?a:0;}
 function rotate(x,z,yaw){const c=Math.cos(yaw),s=Math.sin(yaw);return [x*c+z*s,-x*s+z*c];}
 function turnAngle(value,dt,settings,lastLatch){
  if(!settings.joystickTurning||Math.abs(value)<.18)return {delta:0,latch:false};
  if(settings.turnMode==='smooth')return {delta:-Math.sign(value)*Math.pow(Math.abs(value),1.55)*settings.turnSpeed*Math.PI/180*dt,latch:false};
  if(Math.abs(value)>.78&&!lastLatch)return {delta:-Math.sign(value)*settings.snapAngle*Math.PI/180,latch:true};
  return {delta:0,latch:lastLatch};
 }
 return {pressedEdge,releasedEdge,button,menuLatch,thumbX,rotate,turnAngle};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyControls;
if(typeof window!=='undefined')window.FrogyControls=FrogyControls;
