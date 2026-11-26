'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'public/features.js'),'utf8');
const client=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
assert(ui.includes("vrBtn('APPLY '+vrRgbDraft.padEnd(3,'_')"),'VR closet exposes numeric apply button');
assert(ui.includes("send({type:'color',color:'rgb-'+vrRgbDraft})"),'VR custom color sends valid server message');
assert(ui.includes("const keys='1234567890'"),'Color keypad is directly usable in Quest');
assert(client.includes("case 'colorResult':"),'Color save success/failure is visibly acknowledged');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frogy-color-'));
const PORT=String(31200+Math.floor(Math.random()*300));
const srv=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT,FROGY_DATA_DIR:dir,COUNTDOWN_MS:'15000'},stdio:'pipe'});
const peers=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,limit=4500){let end=Date.now()+limit;while(Date.now()<end){let v=fn();if(v)return v;await delay(20);}throw Error('Timed out');}
async function connect(token=''){
 const w=new WebSocket('ws://localhost:'+PORT+'/ws'),messages=[];
 w.addEventListener('message',e=>messages.push(JSON.parse(e.data)));
 await new Promise((resolve,reject)=>{w.onopen=resolve;w.onerror=reject;});
 const p={w,messages,send:m=>w.send(JSON.stringify(m)),last:k=>messages.filter(m=>m.type===k).at(-1)};
 peers.push(p);p.send({type:'hello',token});await until(()=>p.last('profile'));return p;
}
async function main(){
 await delay(400);
 const a=await connect(),b=await connect();
 a.send({type:'create',name:'Painter'});await until(()=>a.last('joined'));
 b.send({type:'join',code:a.last('joined').code,name:'Watcher'});await until(()=>b.last('joined'));
 const id=a.last('joined').id,token=a.last('profile').token;
 a.send({type:'color',color:'rgb-907'});
 assert((await until(()=>a.last('colorResult'))).ok,'Server confirms color change');
 assert.equal(a.last('colorResult').color,'rgb-907');
 await until(()=>a.last('profile')?.color==='rgb-907');
 const state=await until(()=>b.last('state')?.players.find(p=>p.id===id)?.color==='rgb-907'&&b.last('state'));
 assert.equal(state.players.find(p=>p.id===id).color,'rgb-907','Other players see the new color');
 a.send({type:'color',color:'rgb-99x'});
 assert.equal((await until(()=>a.last('colorResult')?.ok===false&&a.last('colorResult'))).ok,false,'Bad RGB code rejected');
 assert.equal(a.last('profile').color,'rgb-907','Rejected color never overwrites the saved selection');
 a.w.close();
 const c=await connect(token);
 assert.equal(c.last('profile').color,'rgb-907','RGB code survives login/reconnect');
 console.log('PASS v13 RGB: headset keypad + color receipt, visible remote color, invalid-code rejection, saved RGB across reconnect');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const p of peers)try{p.w.close();}catch{}srv.kill();fs.rmSync(dir,{recursive:true,force:true});setTimeout(()=>process.exit(process.exitCode||0),150);});
