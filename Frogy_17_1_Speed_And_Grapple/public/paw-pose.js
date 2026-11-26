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
 return {basisFromGrip,point,valid};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyPawPose;
if(typeof window!=='undefined')window.FrogyPawPose=FrogyPawPose;
