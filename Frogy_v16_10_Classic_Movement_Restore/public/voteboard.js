'use strict';
/* Physical, in-world voting board geometry for the Quest lobby.  No menu needed. */
const FrogyVote=(()=>{
 const board=Object.freeze({x:0,y:2.03,z:-5.3,width:3.85,height:2.50});
 function hit(origin,direction){
  if(!origin||!direction||!Number.isFinite(direction[2])||Math.abs(direction[2])<.00001)return null;
  // Board faces the central lobby (+Z). Ignore rays from the back.
  if(direction[2]>=0)return null;
  const distance=(board.z-origin[2])/direction[2];
  if(distance<=.12||distance>8)return null;
  const x=origin[0]+direction[0]*distance-board.x;
  const y=origin[1]+direction[1]*distance-board.y;
  if(Math.abs(x)>board.width/2||Math.abs(y)>board.height/2)return null;
  const u=x/board.width+.5,v=.5-y/board.height;
  return {u,v,distance,point:[origin[0]+direction[0]*distance,origin[1]+direction[1]*distance,board.z]};
 }
 function selection(u,v){
  // Big physical buttons, descending from the panel title.
  if(u<.085||u>.915||v<.27||v>.92)return -1;
  if(v<.472)return 0;
  if(v<.688)return 1;
  return 2;
 }
 return {board,hit,selection};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyVote;
