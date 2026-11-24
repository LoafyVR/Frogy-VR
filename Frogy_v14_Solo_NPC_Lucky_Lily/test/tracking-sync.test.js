'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const srv=cp.spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:'30957',COUNTDOWN_MS:'850',ROUND_MS:'4300',INTERMISSION_MS:'1100'},stdio:'pipe'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=3500){const start=Date.now();while(Date.now()-start<timeout){const r=fn();if(r)return r;await sleep(35);}throw Error('Timed out waiting for: '+fn.toString());}
const peers=[];
async function connect(){const ws=new WebSocket('ws://127.0.0.1:30957/ws');const msgs=[];ws.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});let peer={ws,msgs,send:m=>ws.send(JSON.stringify(m)),last:k=>msgs.filter(m=>m.type===k).at(-1)};peers.push(peer);peer.send({type:'hello'});return peer;}
async function main(){await sleep(300);const a=await connect();a.send({type:'create',name:'Lobby Frog'});const code=(await until(()=>a.last('joined'))).code;
 let state=await until(()=>a.msgs.find(m=>m.type==='state'));
 assert.ok(Math.hypot(state.players[0].x,state.players[0].z)<12,'lobby initial position is in building, not old match spawn');
 a.send({type:'move',x:-5,y:0,z:3,l:[-5.4,1.1,2.9],r:[-4.6,1.1,2.8],yaw:0});
 state=await until(()=>a.last('state')?.players?.find(p=>p.id===a.last('joined').id)?.x<-4.9&&a.last('state'));
 assert.ok(Math.abs(state.players[0].rr[0]+4.6)<.1,'remote right hand should follow lobby frog');
 const b=await connect();b.send({type:'join',code,name:'Another Frog'});await until(()=>b.last('joined'));
 const match=await until(()=>a.last('state')?.phase==='playing'&&a.last('state'),3500);
 let p=match.players.find(q=>q.id===a.last('joined').id);
 assert.ok(Math.abs(p.x)>14||Math.abs(p.z)>14,'match starts far enough to expose world-coordinate hand bug');
 const x=p.x,z=p.z;
 a.send({type:'move',x,y:0,z,l:[x-.4,1.0,z+.1],r:[x+.4,1.0,z+.2]});
 const moved=await until(()=>a.last('state')?.players?.find(q=>q.id===p.id)?.rr?.[0]>x+.25&&a.last('state'));
 p=moved.players.find(q=>q.id===p.id);
 assert.ok(Math.abs(p.rr[0]-(x+.4))<.05,'right hand must not clamp to world origin');
 assert.ok(Math.abs(p.l[0]-(x-.4))<.05,'left hand must not clamp to world origin');
 console.log('PASS: lobby movement broadcasts, match movements and BOTH hand positions stay valid at far-world spawns.');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const p of peers)p.ws.close();srv.kill();setTimeout(()=>process.exit(process.exitCode||0),175);});
