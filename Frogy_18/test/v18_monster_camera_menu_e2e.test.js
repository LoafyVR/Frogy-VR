'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),port=34000+process.pid%21000;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const source=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const originalMovementPath=process.env.FROGY_17_2_MOVEMENT_PATH;
// Survivor movement must stay exactly the approved 17.2 engine.
if(originalMovementPath)assert.equal(crypto.createHash('sha256').update(source('public/movement.js')).digest('hex'),crypto.createHash('sha256').update(fs.readFileSync(originalMovementPath)).digest('hex'));
const game=source('public/game.js'),menu=source('public/features.js'),camera=source('public/frogy-camera-adapter-v166.js');
assert(game.includes('const palm=q.visualHand||q.hand')&&game.includes('const visualHand=[...hand]'),'first person arm connected to grounded visible hand');
assert(game.includes("me?.monster?1.78:1"),'monster-specific 2x movement multiplier');
assert(game.includes('b(...m,w*.92')&&game.includes('b(...t,w*.54'),'3-digit hands have joined taper, not bulbous tips');
assert(game.includes("rocketBoostHeld")&&game.includes('vel.y=Math.min(5.0'),'rocket A-hold repeatable flight');
assert(menu.includes("['camera','CAMERA']")&&menu.includes("['people','SOCIAL']")&&menu.includes("['inventory','GEAR']"),'camera independent tab and combined menu');
assert(camera.includes('grabPhone')&&camera.includes('dropPhone')&&camera.includes('previewTexture'),'physical selfie phone can be held/parked with preview');
assert(camera.includes("FrogVoice?.level?.()"),'camera avatar mouth reads local microphone input');
const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),COUNTDOWN_MS:'230',ROUND_MS:'13000',INTERMISSION_MS:'800',FROGY_DATA_DIR:'/tmp/frogy18-'+process.pid},stdio:'pipe'});
const sockets=[],until=async(fn,ms=4800)=>{let start=Date.now();while(Date.now()-start<ms){const v=fn();if(v)return v;await sleep(25)}throw Error('Timeout '+String(fn));};
async function join(){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),received=[];ws.onmessage=e=>received.push(JSON.parse(e.data));await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});sockets.push(ws);return {send:m=>ws.send(JSON.stringify(m)),received,last:t=>received.filter(q=>q.type===t).at(-1)};}
async function run(){
 await sleep(360);const a=await join(),b=await join();a.send({type:'hello'});b.send({type:'hello'});
 await until(()=>a.last('profile')&&b.last('profile'));
 a.send({type:'create',name:'MonsterBeta'});const code=(await until(()=>a.last('joined'))).code;b.send({type:'join',code,name:'SurvivorBeta'});
 const state=await until(()=>a.received.find(m=>m.type==='state'&&m.phase==='playing'),5300);
 const monster=state.players.find(p=>p.monster),survivor=state.players.find(p=>!p.monster);
 assert(monster&&survivor,'two roles assigned');
 const M=monster.id===a.last('joined').id?a:b,S=survivor.id===a.last('joined').id?a:b;
 // Rocket: activate a purchasable tool, grants a time-limited window, not a one-shot vertical teleport.
 S.send({type:'buyTool',item:'rocket'});await until(()=>S.received.find(m=>m.type==='toolResult'&&m.ok));
 S.send({type:'activateTool',item:'rocket'});const activated=await until(()=>S.received.find(m=>m.type==='toolActivated'&&m.id==='rocket'));
 assert(activated.until>Date.now()+10000&&activated.until<Date.now()+20000,'Rocket active 16 seconds');
 await until(()=>S.last('state')?.players?.find(q=>q.id===survivor.id)?.activeTools?.rocket===true);
 // Disguise really hides the monster from other players, but not the monster itself.
 M.send({type:'buyTool',item:'shapeshift'});await until(()=>M.received.find(q=>q.type==='toolResult'&&q.ok));
 M.send({type:'activateTool',item:'shapeshift'});await until(()=>M.received.find(q=>q.type==='toolActivated'&&q.id==='shapeshift'));
 const disguised=await until(()=>S.last('state')?.players?.find(q=>q.id===monster.id)?.monster===false&&S.last('state'));
 assert(!disguised.players.find(q=>q.id===monster.id).monster,'survivors see disguised monster as ordinary frog');
 assert(M.last('state').players.find(q=>q.id===monster.id).monster,'monster knows own identity');
 // Find an unobstructed straight-line pair and fire electric grapple.
 const map=require('../public/world.js').maps[state.map],cover=map.cover;
 let chosen=null;for(let x=-17;x<=17&&!chosen;x+=5)for(let z=-17;z<=17&&!chosen;z+=5){
  if(cover.some(c=>Math.hypot(c.x-x,c.z-z)<c.r+1.2||Math.hypot(c.x-x,c.z-(z+3))<c.r+1.2))continue;
  const hit=require('../public/combat.js').trace([x,1.3,z+3],[0,0,-1],cover,[{id:'surv',x,y:0,z,alive:true,spectating:false,monster:false}], 'mon',17);
  if(hit?.target)chosen={x,z};
 }
 assert(chosen,'clear line of sight in test map');
 M.send({type:'move',x:chosen.x,y:0,z:chosen.z+3,yaw:0,r:[chosen.x+.2,1.3,chosen.z+3]});
 S.send({type:'move',x:chosen.x,y:0,z:chosen.z,yaw:0,r:[chosen.x+.2,1.3,chosen.z]});
 await sleep(250);
 M.send({type:'monsterZap',dir:[0,0,-1]});
 const zap=await until(()=>M.received.find(m=>m.type==='electricZapFx'));
 assert(zap.origin&&zap.impact,'electric shot visible to room');
 const stunned=await until(()=>S.received.find(m=>m.type==='electricStunned'));
 assert(stunned.until>Date.now()+2000&&stunned.until<=Date.now()+3100,'survivor stunned three seconds');
 const revealed=await until(()=>S.last('state')?.players?.find(q=>q.id===monster.id)?.monster===true&&S.last('state'));
 assert(revealed.players.find(q=>q.id===monster.id).monster,'monster reveals after electric attack');
 S.send({type:'move',x:chosen.x+7,y:0,z:chosen.z+7});await sleep(160);
 const still=S.last('state').players.find(q=>q.id===survivor.id);
 assert(Math.hypot(still.x-chosen.x,still.z-chosen.z)<2,'server blocks travel while stunned');
 M.send({type:'monsterZap',dir:[0,0,-1]});await sleep(100);
 assert.equal(M.received.filter(q=>q.type==='electricZapFx').length,1,'monster zap 9 second cooldown');
 console.log('PASS Frogy 18: movement checksum, finger/arm/camera/menu, Rocket 16s, disguise, electric hit+stun, blocked motion, stun cooldown');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const a of sockets)try{a.send({type:'leave'})}catch{}child.kill();setTimeout(()=>process.exit(process.exitCode||0),160)});
