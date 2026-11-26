'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=32981;
const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),COUNTDOWN_MS:'320',ROUND_MS:'8500',INTERMISSION_MS:'600',FROGY_DATA_DIR:'/tmp/frogy-test-medkit-'+process.pid},stdio:'pipe'});
const sockets=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,ms=3000)=>{let start=Date.now();while(Date.now()-start<ms){const v=fn();if(v)return v;await sleep(30);}throw Error('Timeout: '+fn.toString());};
async function join(){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),received=[];ws.onmessage=e=>received.push(JSON.parse(e.data));await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});sockets.push(ws);return {ws,received,send:m=>ws.send(JSON.stringify(m)),last:t=>received.filter(m=>m.type===t).at(-1)};}
async function run(){
 await sleep(450);const a=await join(),b=await join();
 a.send({type:'create',name:'Medic'});const code=(await until(()=>a.last('joined'))).code;b.send({type:'join',code,name:'Monster'});
 const playing=await until(()=>a.received.find(m=>m.type==='state'&&m.phase==='playing'),3500);
 const myId=a.last('joined').id,otherId=b.last('joined').id;
 const survivor=playing.players.find(p=>!p.monster),monster=playing.players.find(p=>p.monster),med=playing.pickups.filter(w=>w.type==='medkit');
 assert.equal(med.length,2,'only 2 medkits spawn');
 const S=survivor.id===myId?a:b,M=monster.id===myId?a:b;
 // At full health, the grab must not waste a rare kit.
 S.send({type:'move',x:med[0].x,y:0,z:med[0].z,r:[med[0].x,.60,med[0].z],l:[med[0].x-.25,.60,med[0].z]});
 await sleep(130);S.send({type:'grab',hand:'right',handPosition:[med[0].x,.60,med[0].z]});
 await until(()=>S.received.some(q=>q.type==='grabResult'&&!q.ok&&q.reason?.includes('already full')));
 assert.equal(S.last('state').pickups.filter(q=>q.type==='medkit').length,2);
 // A monster hit injures the survivor, then the medkit heals them.
 M.send({type:'move',x:med[0].x,y:0,z:med[0].z+1.7,r:[med[0].x,.8,med[0].z+1.7],l:[med[0].x-.3,.8,med[0].z+1.7]});
 await sleep(200);M.send({type:'attack',kind:'punch',dir:[0,0,-1]});
 await until(()=>S.received.some(q=>q.type==='ouch'));
 S.send({type:'grab',hand:'right',handPosition:[med[0].x,.60,med[0].z]});
 const used=await until(()=>S.last('medkitUsed'));
 assert(used.before<used.after&&used.after<=used.maxHp,'heal is capped at max HP');
 assert.equal(used.healed,Math.min(55,used.maxHp-used.before));
 const after=await until(()=>S.last('state')?.pickups?.filter(q=>q.type==='medkit').length===1&&S.last('state'));
 assert.equal(after.pickups.filter(q=>q.type==='medkit').length,1,'medkit consumed only once');
 M.send({type:'move',x:med[1].x,y:0,z:med[1].z,r:[med[1].x,.60,med[1].z]});
 await sleep(130);M.send({type:'grab',hand:'right',handPosition:[med[1].x,.60,med[1].z]});
 await sleep(130);assert.equal(M.last('state').pickups.filter(q=>q.type==='medkit').length,1,'monster cannot consume kit');
 console.log('PASS v16.4 network: full HP cannot waste kit, injured survivor heals within max, kit consumed, monster blocked');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const ws of sockets)ws.close();child.kill();setTimeout(()=>process.exit(process.exitCode||0),180)});
