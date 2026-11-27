'use strict';
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),cp=require('node:child_process');
const M=require('../public/movement.js'),C=require('../public/collision.js');
const root=path.resolve(__dirname,'..');
const port=39000+(process.pid%9000);
const base='http://127.0.0.1:'+port;
const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),COUNTDOWN_MS:'300',ROUND_MS:'15000',INTERMISSION_MS:'800',FROGY_DATA_DIR:'/tmp/frogy-v168-test-'+process.pid},stdio:'pipe'});
const sockets=[];
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function until(fn,ms=4500){const start=Date.now();while(Date.now()-start<ms){const value=await fn();if(value)return value;await sleep(30);}throw Error('Timed out: '+fn.toString());}
async function online(){const res=await fetch(base+'/api/online',{cache:'no-store'});assert.equal(res.status,200);assert.match(res.headers.get('cache-control'),/no-store/);return res.json();}
async function connection(){const ws=new WebSocket(base.replace('http','ws')+'/ws'),events=[];ws.onmessage=e=>{try{events.push(JSON.parse(e.data));}catch{}};await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});sockets.push(ws);return {ws,events,send:o=>ws.send(JSON.stringify(o)),last:type=>events.filter(e=>e.type===type).at(-1)};}
async function test(){
 // Controlled acceleration, including monster bonus; never leap from zero to top speed in one frame.
 const dt=1/72;
 const a=M.stabilizeArmVelocity({x:0,z:0},{x:9,z:0},dt,'playing',{monster:false},true);
 assert(a.x>0&&a.x<.75&&a.z===0,'small XR frame accelerates gradually');
 const b=M.stabilizeArmVelocity({x:0,z:0},{x:10,z:0},dt,'playing',{monster:true},true);
 assert(b.x>a.x&&b.x<.85,'monster has modest acceleration advantage');
 let v={x:0,z:0};for(let i=0;i<100;i++)v=M.stabilizeArmVelocity(v,{x:50,z:0},dt,'playing',{monster:false},true);
 assert(v.x<=7.80001,'high wrist velocity remains capped');
 let mv={x:0,z:0};for(let i=0;i<100;i++)mv=M.stabilizeArmVelocity(mv,{x:50,z:0},dt,'playing',{monster:true},true);
 assert(mv.x>v.x&&mv.x<=8.80001,'Mega Frog remains a little faster');
 const world={SIZE:58,cover:[{type:'crate',x:.8,z:0,r:.4,h:2}]};
 const rig={x:0,z:0};const lean=C.sweepTrackedBody(rig,{x:.56,z:0},{x:0,z:0},dt,.21,'arena',world,0,{x:0,z:0});
 assert.equal(lean.x,0,'a physical head lean alone cannot shift rig');
 assert(lean.insideTrackingGeometry);
 const deeper=C.sweepTrackedBody(rig,{x:.56,z:0},{x:7,z:0},dt,.21,'arena',world,0);
 assert(deeper.blockedX&&deeper.x===0,'virtual forward movement into obstruction blocked');
 const escaping=C.sweepTrackedBody(rig,{x:.56,z:0},{x:-7,z:0},dt,.21,'arena',world,0);
 assert(escaping.x<0,'virtual movement out of obstruction allowed');
 const adapter=fs.readFileSync(path.join(root,'public/frogy-camera-adapter-v166.js'),'utf8');
 assert(adapter.includes("vrPage==='settings'")&&adapter.includes('CAMERA LAB (TEST)')&&adapter.includes('MIC:'),'camera and microphone are already in X → Settings menu');
 const gate=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 assert(gate.indexOf('id="playersOnlineCounter"')>gate.indexOf('id="vrOnlyEnter"'),'real Enter VR launcher has online counter under button');
 assert(fs.readFileSync(path.join(root,'public/bootstrap.js'),'utf8').includes("'/api/online'"));
 // Backend actually excludes idle website visitors + bots and counts only active VR sessions.
 await until(async()=>{try{return (await fetch(base+'/health')).ok;}catch{return false;}},5000);
 assert.equal((await online()).playersOnline,0);
 const idle=await connection(); idle.send({type:'hello'}); await until(()=>idle.last('profile'));
 assert.equal((await online()).playersOnline,0,'website spectator with WebSocket is not a player');
 const human=await connection();human.send({type:'create',name:'QuestOnlineTester'});
 await until(()=>human.last('joined'));
 assert.equal((await online()).playersOnline,0,'player in room without immersive VR not counted');
 human.send({type:'vrPresence',active:true});await until(async()=>(await online()).playersOnline===1);
 const joined=human.last('joined');const friend=await connection();friend.send({type:'join',code:joined.code,name:'Friend'});await until(()=>friend.last('joined'));
 assert.equal((await online()).playersOnline,1,'roommate viewing page not counted');
 friend.send({type:'vrPresence',active:true});await until(async()=>(await online()).playersOnline===2);
 friend.send({type:'vrPresence',active:false});await until(async()=>(await online()).playersOnline===1);
 friend.send({type:'leave'});await until(()=>friend.last('left'));
 human.send({type:'redeemCode',code:'NPC'});
 const npc=await until(()=>human.events.find(e=>e.type==='codeResult'&&e.code==='NPC'));
 assert(npc.ok,'private room can spawn optional NPC');
 assert.equal((await online()).playersOnline,1,'NPC must never count toward live player total');
 const round=await until(()=>human.events.find(e=>e.type==='state'&&e.phase==='playing'),7000);
 const before=round.players.find(p=>p.isNpc);assert(before,'NPC in active round');
 await sleep(650);const later=human.last('state').players.find(p=>p.isNpc);
 assert(Math.hypot(before.x-later.x,before.z-later.z)<.35,'NPC movement stays a tiny wiggle');
 assert(Math.abs((later.bodyPitch||0))<=.05,'NPC sway is subtle and inexpensive');
 human.send({type:'vrPresence',active:false});await until(async()=>(await online()).playersOnline===0);
 console.log('PASS v16.8: headset lean stability, controlled speed, monster bonus, real VR-only player counter, NPC wiggle, Camera Lab menu');
}
(async()=>{await test();})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{for(const ws of sockets)ws.close();child.kill();setTimeout(()=>process.exit(process.exitCode||0),150);});
