'use strict';
// Trigger-operated free daily prize machine; different from the map vote board.
const FrogyLily=(()=>{
 const board=Object.freeze({x:7.2,y:1.55,z:-4.8,width:1.9,height:2.1});
 function hit(origin,direction){
  if(!origin||!direction||Math.abs(direction[2])<1e-5||direction[2]>=0)return null;
  const distance=(board.z-origin[2])/direction[2];if(distance<.12||distance>6.5)return null;
  const x=origin[0]+direction[0]*distance-board.x,y=origin[1]+direction[1]*distance-board.y;
  if(Math.abs(x)>board.width*.5||Math.abs(y)>board.height*.5)return null;
  return {distance,point:[origin[0]+direction[0]*distance,origin[1]+direction[1]*distance,board.z]};
 }
 return {board,hit};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyLily;
if(typeof window!=='undefined')window.FrogyLily=FrogyLily;
