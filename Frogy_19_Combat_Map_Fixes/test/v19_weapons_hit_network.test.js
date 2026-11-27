'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const root=path.resolve(__dirname,'..'),port=48500+process.pid%15000,storage=fs.mkdtempSync(path.join(os.tmpdir(),'frogy19-combat-'));
const proc=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),COUNTDOWN_MS:'400',ROUND_MS:'15000',FROGY_DATA_DIR:storage},stdio:'pipe'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),sockets=[];
async function until(fn,wait=5000){const start=Date.now();while(Date.now()-start<wait){const v=fn();if(v)return v;await sleep(20)}throw Error('Timeout '+fn);}
async function join(){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),events=[];ws.onmessage=e=>events.push(JSON.parse(e.data));await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad});sockets.push(ws);const p={ws,events,send:o=>ws.send(JSON.stringify(o)),last:k=>events.filter(m=>m.type===k).at(-1)};p.send({type:'hello'});await until(()=>p.last('profile'));return p;}
async function run(){
 await sleep(480);const a=await join(),b=await join();a.send({type:'create',name:'AttackTest'});const code=(await until(()=>a.last('joined'))).code;b.send({type:'join',code,name:'Target'});
 const start=await until(()=>a.events.find(m=>m.type==='state'&&m.phase==='playing'));
 const target=start.players.find(p=>p.monster),attacker=start.players.find(p=>!p.monster);
 const M=target.id===a.last('joined').id?a:b,S=attacker.id===a.last('joined').id?a:b;
 const world=require('../public/world'),combat=require('../public/combat'),map=world.maps[start.map];
 const sword=start.pickups.find(q=>q.type==='sword'),blaster=start.pickups.find(q=>q.type==='blaster');assert(sword&&blaster);
 async function pick(weapon){S.send({type:'move',x:weapon.x,y:0,z:weapon.z,r:[weapon.x,.58,weapon.z]});await sleep(160);S.send({type:'grab',hand:'right',handPosition:[weapon.x,.58,weapon.z]});await until(()=>S.last('state')?.players?.find(p=>p.id===attacker.id)?.weapon===weapon.type);}
 await pick(blaster);
 let lane=null;
 for(let x=-25;x<=25&&!lane;x+=3.5)for(let z=-16;z<=25&&!lane;z+=3.5){
  const sample={id:'enemy',x,y:0,z:z-5,alive:true,monster:true};
  const impact=combat.trace([x,1.38,z],[0,0,-1],map.cover,[sample],'test');
  if(impact?.target&&!(map.cover.some(q=>Math.hypot(q.x-x,q.z-z)<q.r+.65||Math.hypot(q.x-x,q.z-(z-5))<q.r+.65)))lane={x,z};
 }
 assert(lane,'must find an unobstructed firing lane');
 S.send({type:'move',x:lane.x,y:0,z:lane.z,r:[lane.x,1.38,lane.z]});
 M.send({type:'move',x:lane.x,y:0,z:lane.z-5,r:[lane.x,.80,lane.z-5]});
 await sleep(225);S.send({type:'attack',kind:'blaster',origin:[lane.x,1.38,lane.z],dir:[0,0,-1]});
 const shot=await until(()=>S.events.find(q=>q.type==='hitConfirm'&&q.target===target.id));
 assert.equal(shot.monster,true);await until(()=>M.last('state')?.players.find(q=>q.id===target.id)?.monsterHp===target.monsterHp-65);
 await pick(sword);
 S.send({type:'move',x:lane.x,y:0,z:lane.z-3.45,r:[lane.x,1.30,lane.z-3.45]});
 M.send({type:'move',x:lane.x,y:0,z:lane.z-5,r:[lane.x,1.30,lane.z-5]});
 await sleep(225);S.send({type:'attack',kind:'sword',origin:[lane.x,1.30,lane.z-3.45],dir:[0,0,-1]});
 const swordHit=await until(()=>S.events.find(q=>q.type==='hitConfirm'&&q.damage===97));
 assert(swordHit);await until(()=>M.last('state')?.players.find(q=>q.id===target.id)?.monsterHp===target.monsterHp-65-97);
 console.log('PASS Frogy 19 live combat: blaster and sword reduce synced monster health, using real world positions and server checks');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{sockets.forEach(ws=>ws.close());proc.kill();setTimeout(()=>{fs.rmSync(storage,{recursive:true,force:true});process.exit(process.exitCode||0)},130)});
