'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..'),port=34000+process.pid%20000;
const app=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
const camera=fs.readFileSync(path.join(root,'public/frogy-camera-adapter-v166.js'),'utf8');
assert(app.includes('mouth:FrogVoice.level()'),'headset microphone audio level shared with remote mouths');
assert(camera.includes('mouth:Math.max(me?.mouth||0,FrogVoice?.level?.()||0)'),'camera render receives local live mouth');
const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),FROGY_DATA_DIR:'/tmp/frogy18-voice-'+process.pid},stdio:'pipe'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),sockets=[];
const until=async(fn,ms=4500)=>{const st=Date.now();while(Date.now()-st<ms){const v=fn();if(v)return v;await sleep(30)}throw Error('timeout');};
async function join(){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),received=[];ws.onmessage=e=>received.push(JSON.parse(e.data));await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});sockets.push(ws);return {send:m=>ws.send(JSON.stringify(m)),received,last:t=>received.filter(q=>q.type===t).at(-1)};}
async function run(){await sleep(330);const a=await join(),b=await join();a.send({type:'hello'});b.send({type:'hello'});await until(()=>a.last('profile')&&b.last('profile'));
 a.send({type:'create',name:'Talker'});const room=(await until(()=>a.last('joined'))).code;b.send({type:'join',code:room,name:'Listener'});await until(()=>b.last('joined'));
 a.send({type:'voice-ready',enabled:true});b.send({type:'voice-ready',enabled:true});await until(()=>a.received.some(q=>q.type==='voice-ready'&&q.from===b.last('joined').id));
 const x={type:'rtc',to:b.last('joined').id,data:{kind:'candidate',candidate:{candidate:'candidate:0 1 udp 1 127.0.0.1 4444 typ host',sdpMid:'0',sdpMLineIndex:0}}};
 a.send(x);const relay=await until(()=>b.received.find(q=>q.type==='rtc'&&q.from===a.last('joined').id));
 assert.equal(relay.data.kind,'candidate','ICE signaling relayed');
 a.send({type:'move',x:0,y:0,z:3,mouth:.64});await sleep(300);const mouth=b.last('state').players.find(q=>q.id===a.last('joined').id).mouth;
 assert(Math.abs(mouth-.64)<.01,'remote frog mouth receives microphone amplitude');
 a.send({type:'voice-ready',enabled:false});await until(()=>b.received.some(q=>q.type==='voice-ready'&&q.from===a.last('joined').id&&q.enabled===false));
 console.log('PASS Frogy 18 voice signaling, remote mouth level, camera local mouth wiring (hardware mic/voice still needs Quest)');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{child.kill();setTimeout(()=>process.exit(process.exitCode||0),180)});
