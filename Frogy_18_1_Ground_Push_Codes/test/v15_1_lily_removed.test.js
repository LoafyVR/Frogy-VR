'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const cp=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'..'),pub=path.join(root,'public');
assert.equal(fs.existsSync(path.join(pub,'luckylily.js')),false,'machine module removed');
for(const file of ['index.html','bootstrap.js','features.js','game.js','collision.js']){
 const text=fs.readFileSync(path.join(pub,file),'utf8');
 assert(!/Lucky Lily|FrogyLily|lilyAvailable|spinLily|drawLuckyLily|clickLuckyLily|lilyResult|lilyPaintAt|lilyTexture/.test(text),file+' contains machine code');
}
const src=fs.readFileSync(path.join(root,'server.js'),'utf8');
assert(!/spinLily|lilyResult|lilyAvailable|lastLilyDay/.test(src),'server machine disabled');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frogy-nolily-'));const port=33071;
const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),FROGY_DATA_DIR:dir},stdio:'pipe'});
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
async function main(){
 let response;
 for(let n=0;n<65;n++){
  try{response=await fetch('http://127.0.0.1:'+port+'/health');if(response.ok)break;}catch{} await delay(45);
 }
 assert(response?.ok,'server starts');
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),msgs=[];
 ws.addEventListener('message',e=>msgs.push(JSON.parse(e.data)));
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 ws.send(JSON.stringify({type:'hello'}));
 for(let n=0;n<75&&!msgs.some(m=>m.type==='profile');n++)await delay(30);
 const original=msgs.filter(m=>m.type==='profile').at(-1);assert(original,'profile exists');
 assert.equal(Object.hasOwn(original,'lilyAvailable'),false);
 ws.send(JSON.stringify({type:'create',name:'Test Frog'}));
 for(let n=0;n<75&&!msgs.some(m=>m.type==='joined');n++)await delay(30);
 assert(msgs.some(m=>m.type==='joined'),'existing rooms still work');
 ws.send(JSON.stringify({type:'spinLily'}));
 await delay(200);
 assert(!msgs.some(m=>m.type==='lilyResult'),'removed command never pays rewards');
 const updated=msgs.filter(m=>m.type==='profile').at(-1);
 assert.equal(updated.crickets,original.crickets,'Crickets unchanged');
 assert.equal(updated.dabloons,original.dabloons,'Dabloons unchanged');
 ws.close();console.log('PASS v15.1: no machine graphics, no collider, no reward endpoint, currencies preserved, private room operational');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{child.kill();fs.rmSync(dir,{recursive:true,force:true});setTimeout(()=>process.exit(process.exitCode||0),100)});
