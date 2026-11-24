'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frogy15-'));
process.env.FROGY_DATA_DIR=dir;process.env.COUNTDOWN_MS='300';process.env.ROUND_MS='7500';process.env.INTERMISSION_MS='300';
const {server,rooms}=require('../server');
const Motion=require('../public/movement');
const Lily=require('../public/luckylily');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const peers=[];
async function until(fn,label,timeout=10500){const end=Date.now()+timeout;while(Date.now()<end){const v=fn();if(v)return v;await wait(25);}throw Error('Timed out waiting for '+label);}
async function peer(port){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`),msgs=[];ws.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad;});const p={ws,msgs,send(m){ws.send(JSON.stringify(m));},last(t){return msgs.filter(m=>m.type===t).at(-1)}};peers.push(p);p.send({type:'hello'});await until(()=>p.last('profile'),'profile');return p;}
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const port=server.address().port;
 const p=await peer(port);assert.equal(p.last('profile').dabloons,1000);
 const token=p.last('profile').token;
 p.send({type:'rename',name:'Hop Captain'});await until(()=>p.last('nameResult')?.ok,'rename accepted');
 assert.equal(p.last('profile').name,'Hop Captain');
 p.send({type:'rename',name:'<MOD>'});await until(()=>p.msgs.filter(m=>m.type==='nameResult').length===2,'reserved name blocked');assert.equal(p.last('nameResult').ok,false);
 p.send({type:'create'});const code=(await until(()=>p.last('joined'),'create private')).code;
 await until(()=>p.last('state')?.players.some(x=>x.name==='Hop Captain'),'rename broadcasts');
 p.send({type:'spinLily'});await until(()=>p.last('lilyResult'),'daily spin');assert.equal(p.last('lilyResult').ok,true);assert.equal(p.last('profile').lilyAvailable,false);
 p.send({type:'redeemCode',code:'NPC'});await until(()=>p.last('state')?.npcPractice,'npc');
 const first=await until(()=>p.last('state')?.round===1&&p.last('state')?.phase==='playing'&&p.last('state'),'round 1');
 assert(first.players.find(x=>x.id===p.last('joined').id).monster);
 const second=await until(()=>p.last('state')?.round===2&&p.last('state')?.phase==='playing'&&p.last('state'),'round 2',12500);
 const r=rooms.get(code),survivor=[...r.players.values()].find(x=>!x.monster),beast=[...r.players.values()].find(x=>x.monster);
 assert.equal(survivor.maxHp,175);assert.equal(beast.maxHp,520);
 assert.equal(second.players.some(x=>x.hp!==undefined),false,'monster HP is not broadcast');
 // Seed a deterministic short-range accuracy check, independent of pickups and scene obstacles.
 survivor.weapon='blaster';survivor.x=0;survivor.y=0;survivor.z=2.5;
 beast.x=0;beast.y=0;beast.z=0;
 for(let n=0;n<8;n++){
  if(r.phase!=='playing')break;
  survivor.lastAtk=Date.now()-600;
  p.send({type:'attack',kind:'blaster',origin:[0,1.45,2.5],dir:[0,0,-1]});
  await wait(62);
 }
 // If an obstruction at origin prevents damage, aim the two test players away from map cover.
 if(r.phase==='playing'){
  beast.hp=65;survivor.lastAtk=0;
  const covers=require('../public/world').maps[r.map].cover;
  for(let x=-40;x<41&&r.phase==='playing';x+=8){for(let z=-40;z<41&&r.phase==='playing';z+=8){
   if(covers.some(o=>Math.hypot(o.x-x,o.z-z)<4))continue;
   survivor.x=x;survivor.z=z+2;beast.x=x;beast.z=z;
   p.send({type:'attack',kind:'blaster',origin:[x,1.45,z+2],dir:[0,0,-1]});await wait(40);
  }}
 }
 await until(()=>p.last('roundEnd')?.winningTeam==='SURVIVORS','monster can be killed',1500);
 assert(p.msgs.some(m=>m.type==='hitConfirm'&&m.monster),'gun hits have feedback');
 assert.equal(Motion.settings.monsterGravity<Motion.settings.gravity,true);
 assert.equal(Motion.settings.monsterAutoHop>Motion.settings.jumpSpeed,true);
 assert(Lily.hit([6.3,1.65,5],[0,0,-1]),'Lucky Lily front ray');
 assert(Lily.hit([6.3,1.65,-5],[0,0,1]),'Lucky Lily rear ray');
 const reconnect=await peer(port);reconnect.send({type:'hello',token});await until(()=>reconnect.last('profile')?.name==='Hop Captain','saved name on reconnect');
 // Test limb bleed without needing to wait 45 real seconds: set its expiry after successful rip.
 const a=await peer(port),b=await peer(port);a.send({type:'create'});const c=(await until(()=>a.last('joined'),'combat room')).code;
 b.send({type:'join',code:c});await until(()=>b.last('joined'),'second player');
 const rr=rooms.get(c);await until(()=>rr.phase==='playing','combat round');
 const monster=[...rr.players.values()].find(q=>q.monster),frog=[...rr.players.values()].find(q=>!q.monster);
 monster.x=15;monster.z=15;frog.x=15;frog.z=13.8;monster.lastAtk=0;
 const source=monster.id===a.last('joined').id?a:b;
 source.send({type:'attack',kind:'rip',dir:[0,0,-1]});
 await until(()=>frog.lostArms!==0,'lost arm');
 assert.equal(frog.alive,true,'a survivor stays alive after losing one arm');assert(frog.bleedUntil>Date.now()+30000);
 frog.bleedUntil=Date.now()-1;
 await until(()=>a.last('roundEnd')?.winningTeam==='MONSTER'||b.last('roundEnd')?.winningTeam==='MONSTER','bleed-out monster victory',2000);
 console.log('PASS v15: editable saved names, safe validation, 1000 Dabloons, Lucky Lily trigger ray, daily rewards, hidden HP, monster weapon defeat, monster gravity/auto-hop settings, survivor arm-bleed survival/expiry.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{for(const p of peers)try{p.ws.close();}catch{} await new Promise(ok=>server.close(ok));fs.rmSync(dir,{recursive:true,force:true});});
