'use strict';
/* Converts a WebXR controller grip's orientation to a frog-paw orientation.
   Paw +Y points along the controller's forward (-Z) direction: tilting the
   controller down really tilts the fingers down. Basis columns are x/y/z. */
const FrogyPawPose=(()=>{
 function basisFromGrip(m,turnYaw=0){
  if(!m||m.length<16)return null;
  const c=Math.cos(turnYaw),s=Math.sin(turnYaw);
  const v=(x,y,z)=>[x*c+z*s,y,-x*s+z*c];
  const right=v(m[0],m[1],m[2]),fwd=v(-m[8],-m[9],-m[10]),up=v(m[4],m[5],m[6]);
  const basis=[...right,...fwd,...up];
  return basis.every(Number.isFinite)?basis:null;
 }
 function point(origin,basis,offset){
  return [0,1,2].map(i=>origin[i]+basis[i]*offset[0]+basis[3+i]*offset[1]+basis[6+i]*offset[2]);
 }
 function valid(b){return Array.isArray(b)&&b.length===9&&b.every(v=>Number.isFinite(v)&&Math.abs(v)<=1.01);}
 // The paw pivots around the XR grip, NOT its lowest fingertip. A fixed palm
 // offset leaves a visible gap above floors when the controller is rotated.
 // Calculate the actual lowest point of the 3D paw geometry at this pose so
 // the rendered model just touches the contact surface. Visuals only: never
 // feed the adjusted position back to hand/ground collision physics.
 function lowestRelativeY(size,basis,pose=[0,0,0],side='right'){
  if(!Number.isFinite(size)||size<=0)return 0;
  const b=valid(basis)?basis:[1,0,0,0,1,0,0,0,1];
  const mirror=side==='left'?-1:1;
  const [thumbCurl=0,outerCurl=0,triggerCurl=0]=pose||[];
  const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
  const vert=([x,y,z])=>size*(b[1]*x*mirror+b[4]*y+b[7]*z);
  const spread=(rx,ry,rz)=>size*Math.hypot(b[1]*rx,b[4]*ry,b[7]*rz);
  let lowest=Infinity;
  const bulb=(p,rx,ry,rz)=>{lowest=Math.min(lowest,vert(p)-spread(rx,ry,rz));};
  // Exact ellipsoid centers and radii used by game.js paw().
  bulb([0,-.12,.03],.12,.20,.13);
  bulb([0,.02,0],.23,.20,.15);
  const finger=(base,mid,tip,width,curl)=>{
   curl=clamp(curl);
   const m=[mid[0],base[1]+(mid[1]-base[1])*(1-curl*.35),base[2]+(mid[2]-base[2])*(1+curl*.22)];
   const t=[tip[0],mid[1]+(tip[1]-mid[1])*(1-curl*.62),mid[2]+(tip[2]-mid[2])*(1+curl*.48)];
   // Rods have a round cross-section and the joints/tips are ellipsoids.
   lowest=Math.min(lowest,vert(base)-size*width,vert(m)-size*width,vert(t)-size*width*.92);
   bulb(m,width*.92,width*.92,width*.92);
   bulb(t,width*.54,width*.62,width*.54);
  };
  finger([-.14,.02,.02],[-.235,.12,.02],[-.315,.19,.05],.095,thumbCurl);
  finger([-.075,.16,-.01],[-.11,.29,-.03],[-.145,.42,-.06],.100,outerCurl);
  finger([.09,.16,-.01],[.11,.29,-.04],[.13,.42,-.08],.104,triggerCurl);
  return Number.isFinite(lowest)?lowest:0;
 }
 function floorAlignedY(floorY,size,basis,pose,side){
  return floorY-lowestRelativeY(size,basis,pose,side)+.003;
 }
 return {basisFromGrip,point,valid,lowestRelativeY,floorAlignedY};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyPawPose;
if(typeof window!=='undefined')window.FrogyPawPose=FrogyPawPose;
