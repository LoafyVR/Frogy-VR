'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PORT='31163';
const server=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT,COUNTDOWN_MS:'12000'},stdio:'pipe'});
const peers=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=4000){const end=Date.now()+ms;while(Date.now()<end){const v=fn();if(v)return v;await sleep(15);}throw Error('Timeout');}
async function peer(){const ws=new WebSocket('ws://localhost:'+PORT+'/ws'),msgs=[];ws.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});const p={ws,msgs,send:v=>ws.send(JSON.stringify(v)),last:t=>msgs.filter(x=>x.type===t).at(-1)};peers.push(p);p.send({type:'hello'});await until(()=>p.last('profile'));return p;}
async function main(){await sleep(320);
 const a=await peer();const b=await peer();
 a.send({type:'public'});await until(()=>a.last('joined'));const initial=a.last('joined').code;
 b.send({type:'public'});await until(()=>b.last('joined'));
 assert.equal(b.last('joined').code,initial,'public matching fills an occupied room first');
 const third=await peer();third.send({type:'public'});await until(()=>third.last('joined'));
 assert.equal(third.last('joined').code,initial,'three players funneled into same room');
 a.send({type:'publicHop'});await until(()=>a.last('joined')?.code!==initial);
 assert.notEqual(a.last('joined').code,initial,'server hop guarantees a different room');
 const joined=a.last('joined').code;
 const fourth=await peer();fourth.send({type:'public'});await until(()=>fourth.last('joined'));
 assert.equal(fourth.last('joined').code,initial,'new player joins fuller lobby before a near-empty one');
 const fifth=await peer();fifth.send({type:'publicHop'});await until(()=>fifth.last('joined'));
 assert.equal(fifth.last('joined').code,initial,'first-ever hop acts like normal public room choice');
 assert.notEqual(joined,initial);
 console.log('PASS: crowded public lobby selection and server hop to a different lobby');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{for(const p of peers)try{p.ws.close();}catch{}server.kill();setTimeout(()=>process.exit(process.exitCode||0),150);});
