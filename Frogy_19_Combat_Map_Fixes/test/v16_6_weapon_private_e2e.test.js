'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=34000+process.pid%10000;
const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),COUNTDOWN_MS:'320',ROUND_MS:'9000',INTERMISSION_MS:'800',FROGY_DATA_DIR:'/tmp/frogy-test-v166-'+process.pid},stdio:'pipe'});
const sockets=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,ms=4500)=>{let start=Date.now();while(Date.now()-start<ms){const v=fn();if(v)return v;await sleep(25);}throw Error('Timeout: '+fn.toString());};
async function join(){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),received=[];ws.onmessage=e=>received.push(JSON.parse(e.data));await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});sockets.push(ws);return {ws,received,send:m=>ws.send(JSON.stringify(m)),last:t=>received.filter(m=>m.type===t).at(-1)};}
async function run(){
 await sleep(450);const a=await join();a.send({type:'create',name:'SwordTester'});
 const joined=await until(()=>a.last('joined'));const lobby=await until(()=>a.last('state'));
 assert(lobby.players.length===1&&!lobby.players.some(p=>p.isNpc),'Tadpole never auto-spawns in private lobby');
 assert(a.received.some(q=>q.type==='notice'&&q.text?.includes('CODES')),'private lobby explains how to summon Tadpole');
 const b=await join();b.send({type:'join',code:joined.code,name:'SecondFrog'});
 const round=await until(()=>a.received.find(q=>q.type==='state'&&q.phase==='playing'),5000);
 const person=round.players.find(p=>!p.monster),S=person.id===joined.id?a:b;
 const sword=round.pickups.find(w=>w.type==='sword');assert(sword,'sword exists in match');
 S.send({type:'move',x:sword.x,y:0,z:sword.z,r:[sword.x,.57,sword.z],l:[sword.x-.25,.57,sword.z]});
 await sleep(170);
 S.send({type:'grab',hand:'right',handPosition:[sword.x,.58,sword.z]});
 const good=await until(()=>S.received.find(q=>q.type==='grabResult'&&q.ok&&q.id===sword.id));
 assert(good,'survivor can pick up sword');
 const after=await until(()=>S.last('state')?.players?.find(p=>p.id===person.id)?.weapon==='sword'&&S.last('state'));
 assert(!after.pickups.some(w=>w.id===sword.id),'picked-up sword disappears from world instead of duplicating');
 // Previously the pickup would silently return after 15 seconds. Verify the
 // *actual* server source no longer contains that delayed respawn transition.
 assert(!require('node:fs').readFileSync(path.join(root,'server.js'),'utf8').includes('closest.thing.availableAt=Date.now()+15000'));
 S.send({type:'drop',hand:'right'});
 const dropped=await until(()=>S.last('state')?.players?.find(p=>p.id===person.id)?.weapon==='none'&&S.last('state'));
 assert(dropped.pickups.some(w=>w.id.startsWith('drop-')&&w.type==='sword'),'sword appears once when deliberately dropped');
 console.log('PASS v16.6 e2e: no auto NPC, private code notice, sword pickup consumed, one intentional sword drop');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const ws of sockets)ws.close();child.kill();setTimeout(()=>process.exit(process.exitCode||0),150)});
