'use strict';
// Trigger-operated free daily prize machine; different from the map vote board.
const FrogyLily=(()=>{
 // Central, conspicuous placement near the public spawn; front faces +Z.
 const board=Object.freeze({x:6.3,y:1.65,z:0.7,width:2.6,height:2.45});
 function hit(origin,direction){
  if(!origin||!direction||Math.abs(direction[2])<1e-5)return null;
  const distance=(board.z-origin[2])/direction[2];if(distance<.12||distance>12)return null;
  const x=origin[0]+direction[0]*distance-board.x,y=origin[1]+direction[1]*distance-board.y;
  if(Math.abs(x)>board.width*.5||Math.abs(y)>board.height*.5)return null;
  return {distance,point:[origin[0]+direction[0]*distance,origin[1]+direction[1]*distance,board.z]};
 }
 return {board,hit};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyLily;
if(typeof window!=='undefined')window.FrogyLily=FrogyLily;
