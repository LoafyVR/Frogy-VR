'use strict';
const assert=require('node:assert/strict');
const cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const port=38000+(process.pid%13000),root=path.resolve(__dirname,'..'),data=fs.mkdtempSync(path.join(os.tmpdir(),'frogy18-grounding-'));
const server=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),FROGY_DATA_DIR:data,COUNTDOWN_MS:'15000'},stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const links=[];
async function connect(){
 const events=[],ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>events.push(JSON.parse(e.data));
 links.push(ws);
 return {events,send:v=>ws.send(JSON.stringify(v)),last:type=>events.filter(x=>x.type===type).at(-1)};
}
async function until(fn,timeout=3000){const start=Date.now();while(Date.now()-start<timeout){const found=fn();if(found)return found;await sleep(25);}throw Error('Timed out waiting for network event');}
async function main(){
 await sleep(220);
 const a=await connect(),b=await connect();a.send({type:'hello'});b.send({type:'hello'});
 await until(()=>a.last('profile')&&b.last('profile'));
 a.send({type:'create',name:'FloorTester'});
 const joined=await until(()=>a.last('joined'));
 b.send({type:'join',code:joined.code,name:'FloorObserver'});
 await until(()=>b.last('joined'));
 const basis=[1,0,0,0,1,0,0,0,1];
 a.send({type:'move',x:0,y:0,z:0,l:[-.4,.12,0],rr:[.4,.2,0],lFloorY:0,rFloorY:1.4,lBasis:basis,rBasis:basis});
 const latest=await until(()=>{
  const snapshots=b.events.filter(m=>m.type==='state');
  const p=snapshots.at(-1)?.players?.find(p=>p.id===joined.id);
  return p?.lFloorY===0&&p?.rFloorY===1.4?p:null;
 },4000);
 assert.deepEqual(latest.lBasis,basis);
 assert.equal(latest.lFloorY,0);assert.equal(latest.rFloorY,1.4);
 // Null on release prevents a hand from sticking to an invisible old floor.
 a.send({type:'move',x:0,y:0,z:0,l:[-.4,.6,0],rr:[.4,.7,0],lFloorY:null,rFloorY:null});
 await until(()=>{const p=b.last('state')?.players?.find(q=>q.id===joined.id);return p&&p.lFloorY===null&&p.rFloorY===null;});
 console.log('PASS Frogy 18: ground visual flags are relayed to other players and cleared on release');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{links.forEach(x=>{try{x.close()}catch{}});server.kill();setTimeout(()=>{fs.rmSync(data,{force:true,recursive:true});process.exit(process.exitCode||0)},160)});
