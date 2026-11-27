'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path'),os=require('node:os'),fs=require('node:fs');
const root=path.resolve(__dirname,'..'),port=44000+process.pid%15000,storage=fs.mkdtempSync(path.join(os.tmpdir(),'frogy19-test-'));
const proc=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),COUNTDOWN_MS:'900',ROUND_MS:'19000',FROGY_DATA_DIR:storage},stdio:'pipe'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),sockets=[];
async function until(fn,wait=5500){const start=Date.now();while(Date.now()-start<wait){const v=fn();if(v)return v;await sleep(25)}throw Error('Timed out on '+fn);}
async function join(){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),messages=[];ws.onmessage=e=>messages.push(JSON.parse(e.data));await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no});sockets.push(ws);const p={ws,messages,send:o=>ws.send(JSON.stringify(o)),last:k=>messages.filter(m=>m.type===k).at(-1)};p.send({type:'hello'});await until(()=>p.last('profile'));return p;}
async function newRoom(n,name){const members=[];for(let i=0;i<n;i++)members.push(await join());members[0].send({type:'create',name:name+'0'});const code=(await until(()=>members[0].last('joined'))).code;for(let i=1;i<n;i++)members[i].send({type:'join',code,name:name+i});await until(()=>members.every(q=>q.last('joined')));const state=await until(()=>members[0].messages.find(m=>m.type==='state'&&m.phase==='playing'));
 return {members,state,monster:state.players.find(q=>q.monster),survivors:state.players.filter(q=>!q.monster)};
}
async function run(){await sleep(450);
 const small=await newRoom(2,'Small');assert.equal(small.monster.monsterMaxHp,300);assert.equal(small.monster.monsterHp,300);
 const group=await newRoom(4,'Big');assert.equal(group.monster.monsterMaxHp,470);assert.equal(group.monster.monsterHp,470);
 assert(group.monster.monsterMaxHp>small.monster.monsterMaxHp,'more survivors require more damage');
 assert(group.survivors.every(p=>p.monsterHp===null&&p.monsterMaxHp===null),'survivor HP remains private');
 const survivor=small.survivors[0],med=small.state.pickups.find(q=>q.type==='medkit');assert(med);
 const player=small.members.find(m=>m.last('joined').id===survivor.id);
 player.send({type:'move',x:med.x,y:0,z:med.z,r:[med.x,.58,med.z]});await sleep(180);
 player.send({type:'grab',hand:'right',handPosition:[med.x,.58,med.z]});
 const response=await until(()=>player.messages.find(q=>q.type==='grabResult'&&q.fullHealth===true));
 assert.equal(response.kind,'medkit');
 assert.equal(player.last('state').pickups.filter(q=>q.type==='medkit').length,2,'full health cannot waste a medkit');
 // The server should not move the player to a different side of a map prop
 // merely because the client reports a tracked headset position near it.
 const world=require('../public/world'),cover=world.maps[small.state.map].cover;
 const block=cover.find(q=>q.type==='tree')||cover[0];
 player.send({type:'move',x:block.x,y:0,z:block.z});
 await until(()=>Math.abs(player.last('state')?.players?.find(q=>q.id===survivor.id)?.x-block.x)<.001);
 console.log('PASS Frogy 19 network: monster HP scales, survivor HP private, full-health feedback, no map position correction');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{sockets.forEach(ws=>ws.close());proc.kill();setTimeout(()=>{fs.rmSync(storage,{recursive:true,force:true});process.exit(process.exitCode||0)},150)});
