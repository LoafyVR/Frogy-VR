'use strict';
// Four real network clients exercise separated starts, invisible HP, limb props,
// grip/throw synchronization, persistent stains, sit-out, and next-round restoration.
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const srv=cp.spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:'30827',ROUND_MS:'5500',COUNTDOWN_MS:'500',INTERMISSION_MS:'450'},stdio:'pipe'});
const sockets=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=2800){const start=Date.now();while(Date.now()-start<timeout){const result=fn();if(result)return result;await sleep(25);}throw Error('Timed out: '+fn.toString());}
async function join(){const ws=new WebSocket('ws://127.0.0.1:30827/ws'),msgs=[];ws.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});sockets.push(ws);return {ws,msgs,send:m=>ws.send(JSON.stringify(m)),last:t=>msgs.filter(m=>m.type===t).at(-1)};}
async function test(){
 await sleep(350);const a=await join(),b=await join(),c=await join(),d=await join(),people=[a,b,c,d];
 a.send({type:'create',name:'A'});const code=(await until(()=>a.last('joined'))).code;
 for(let i=1;i<4;i++)people[i].send({type:'join',code,name:'Frog'+i});
 await until(()=>people.every(c=>c.last('joined')));
 const start=await until(()=>a.msgs.find(m=>m.type==='state'&&m.phase==='playing'),2000),p=start.players,monster=p.find(x=>x.monster),survivors=p.filter(x=>!x.monster);
 assert.equal(survivors.length,3);
 for(const x of survivors){assert.ok(Math.hypot(x.x-monster.x,x.z-monster.z)>45,'Monster must spawn away from all survivors');assert.equal(x.hp,undefined,'HP is not sent to clients');}
 assert.ok(Math.hypot(survivors[0].x-survivors[1].x,survivors[0].z-survivors[1].z)<11,'Survivors are grouped together');
 const getClient=id=>people.find(c=>c.last('joined').id===id);
 const killer=getClient(monster.id),victim=getClient(survivors[0].id),picker=getClient(survivors[1].id),last=getClient(survivors[2].id);
 killer.send({type:'move',x:0,y:0,z:0,r:[.4,1,0],l:[-.4,1,0]});victim.send({type:'move',x:0,y:0,z:-1.45,r:[.5,1,-1.45],l:[-.4,1,-1.45]});
 await sleep(120);killer.send({type:'attack',kind:'rip',dir:[0,0,-1]});
 const gore=await until(()=>killer.msgs.find(x=>x.type==='gore'),1100);
 assert.equal(gore.side,'left');
 const after=await until(()=>a.last('state')?.parts?.length>=1&&a.last('state')?.blood?.length>=4&&a.last('state'),1600);
 assert.ok(after.parts.some(q=>q.kind==='arm'&&q.side==='left'),'Severed arm must be an interactable shared prop');
 assert.ok(after.blood.length>=4,'Visible blood stains must be synchronized in room state');
 assert.equal(after.players.find(x=>x.id===victim.last('joined').id).alive,true,'survivor stays alive after first arm loss');
 assert.equal(after.players.find(x=>x.id===victim.last('joined').id).bleeding,true,'arm injury starts delayed bleed-out');
 const target=after.parts.find(q=>q.kind==='arm'&&q.side==='left');
 picker.send({type:'move',x:target.x,y:0,z:target.z+.3,r:[target.x,target.y,target.z],l:[target.x-.4,target.y,target.z]});
 await sleep(130);picker.send({type:'grab',hand:'right'});
 const grabbed=await until(()=>picker.msgs.find(x=>x.type==='grabResult'&&x.ok&&x.kind==='part'),1300);
 const held=await until(()=>a.last('state')?.parts?.some(q=>q.id===grabbed.id&&q.heldBy===picker.last('joined').id)&&a.last('state'),1400);
 assert.ok(held.parts.some(q=>q.id===grabbed.id&&q.heldBy===picker.last('joined').id));
 picker.send({type:'dropPart',hand:'right',velocity:[7,5,1]});
 await until(()=>a.last('state')?.parts?.some(q=>q.id===grabbed.id&&!q.heldBy)&&a.last('state'),1300);
 const stainsBefore=a.last('state').blood.length;
 picker.send({type:'sitOut'});await until(()=>picker.last('sitOutConfirmed'));
 const out=await until(()=>a.last('state')?.players?.find(q=>q.id===picker.last('joined').id)?.spectating&&a.last('state'));
 assert.equal(out.players.find(q=>q.id===picker.last('joined').id).alive,false);
 assert.ok(out.blood.length>=stainsBefore,'Blood stays in the world until next match');
 picker.send({type:'move',x:22,y:0,z:22,r:[22,.5,22]});await sleep(300);
 assert.ok(Math.hypot(a.last('state').players.find(q=>q.id===picker.last('joined').id).x-22,a.last('state').players.find(q=>q.id===picker.last('joined').id).z-22)>3,'Sitting-out players cannot move back into match');
 const next=await until(()=>a.last('state')?.round===2&&a.last('state')?.phase==='playing'&&a.last('state'),10000);
 assert.ok(next.players.every(q=>q.alive&&!q.spectating),'All players are reinstated at the next round');
 assert.equal(next.blood.length,0,'Persistent stains clear at the next round');
 console.log('PASS: separate monster start, survivor cluster, hidden HP, rip body physics, shared grab and throw, round-long blood, sit-out lock, new round restoration.');
}
test().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{sockets.forEach(ws=>ws.close());srv.kill();setTimeout(()=>process.exit(process.exitCode||0),180);});
