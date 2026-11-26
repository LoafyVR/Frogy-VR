'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frogy-v13-'));
const PORT='31327',root=path.resolve(__dirname,'..');
const srv=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT,FROGY_DATA_DIR:dir,COUNTDOWN_MS:'15000'},stdio:'pipe'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));const peers=[];
async function until(fn,limit=3200){const end=Date.now()+limit;while(Date.now()<end){const v=fn();if(v)return v;await delay(20);}throw Error('Timeout waiting for '+String(fn));}
async function make(){const w=new WebSocket('ws://localhost:'+PORT+'/ws'),msgs=[];w.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise((resolve,reject)=>{w.onopen=resolve;w.onerror=reject;});const p={w,msgs,send:m=>w.send(JSON.stringify(m)),last:k=>msgs.filter(m=>m.type===k).at(-1)};peers.push(p);p.send({type:'hello'});await until(()=>p.last('profile'));return p;}
async function main(){await delay(430);const a=await make(),b=await make();
 assert.equal(a.last('profile').dabloons,1000,'New frog gets 1000 Dabloons');
 a.send({type:'create',name:'Creator'});
 const created=await until(()=>a.last('roomResult')?.ok&&a.last('roomResult'));const code=created.code;
 assert.match(code,/^[A-Z2-9]{5}$/);assert.equal(a.last('joined').code,code);
 b.send({type:'join',code:code.toLowerCase(),name:'Friend'});
 const joined=await until(()=>b.last('roomResult')?.ok&&b.last('roomResult'));
 assert.equal(joined.code,code);assert.equal(b.last('joined').visibility,'private');
 b.send({type:'join',code:'XXXXX'});
 const fail=await until(()=>b.last('roomResult')?.ok===false&&b.last('roomResult'));
 assert.equal(fail.ok,false);assert.equal(b.last('joined').code,code,'Invalid invite does not remove frog from active room');
 const before=b.last('profile');b.send({type:'redeemCode',code:'FREE'});
 await until(()=>b.last('codeResult')?.code==='FREE'&&b.last('codeResult')?.ok);
 const after=await until(()=>b.last('profile')?.dabloons===before.dabloons+100&&b.last('profile'));
 assert.equal(after.crickets,before.crickets+100);
 b.send({type:'redeemCode',code:'FREE'});
 await until(()=>b.msgs.filter(q=>q.type==='codeResult'&&q.code==='FREE').length>=1&&b.last('codeResult')?.ok===false);
 assert.equal(b.last('profile').dabloons,after.dabloons,'One-time code cannot grant rewards twice');
 const h=await fetch('http://127.0.0.1:'+PORT+'/health');assert.equal((await h.json()).version,require('../package.json').version);
 console.log('PASS v13 network: new 1000-Dabloon profile, private CREATE/JOIN in lowercase, missing room receipt, FREE redemption, one-time reward, version health check');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const p of peers)try{p.w.close();}catch{}srv.kill();fs.rmSync(dir,{recursive:true,force:true});setTimeout(()=>process.exit(process.exitCode||0),180);});
