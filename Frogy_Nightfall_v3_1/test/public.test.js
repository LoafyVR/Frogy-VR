'use strict';
// End-to-end public matchmaking, RGB color persistence and explicit shop receipts.
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const srv=cp.spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:'30819',COUNTDOWN_MS:'10000'},stdio:'pipe'});
const clients=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function make(){const ws=new WebSocket('ws://127.0.0.1:30819/ws'),msgs=[];ws.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise(r=>ws.onopen=r);clients.push(ws);ws.send(JSON.stringify({type:'hello'}));await until(()=>msgs.some(x=>x.type==='profile'));return {ws,msgs,send:m=>ws.send(JSON.stringify(m)),last:type=>msgs.filter(m=>m.type===type).at(-1)};}
async function until(fn,ms=2000){const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await sleep(20);}throw Error('Test timeout');}
async function run(){await sleep(400);const a=await make(),b=await make();a.send({type:'public',name:'Frog One'});b.send({type:'public',name:'Frog Two'});
 await until(()=>a.last('joined')&&b.last('joined'));const code=a.last('joined').code;assert.equal(b.last('joined').code,code,'Public players should match');
 assert.equal(a.last('joined').visibility,'public');
 a.send({type:'color',color:'rgb-907'});await until(()=>a.last('profile').color==='rgb-907');
 a.send({type:'color',color:'rgb-9999'});await sleep(70);assert.equal(a.last('profile').color,'rgb-907','Invalid RGB should not replace valid color');
 a.send({type:'buy',item:'mushroom'});await until(()=>a.last('shopResult'));assert.equal(a.last('shopResult').ok,true);assert.equal(a.last('profile').coins,70);
 a.send({type:'buy',item:'mushroom'});await until(()=>a.msgs.filter(m=>m.type==='shopResult').length===2);assert.equal(a.last('shopResult').ok,false);
 a.send({type:'create',name:'Private'});await until(()=>a.last('joined').code!==code);assert.equal(a.last('joined').visibility,'private');
 const others=[];for(let i=0;i<7;i++){const c=await make();c.send({type:'public',name:'Public'+i});await until(()=>c.last('joined'));others.push(c);}
 assert.ok(others.slice(0,7).every(c=>c.last('joined').code===code),'Room fills before opening a new one');
 const extra=await make();extra.send({type:'public',name:'Frog Nine'});await until(()=>extra.last('joined'));
 assert.notEqual(extra.last('joined').code,code,'Ninth public frog starts another room');
 console.log('PASS: public matching, full-room overflow, private room isolation, 1,000-color RGB validation, shop purchase receipts and failures.');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{clients.forEach(x=>x.close());srv.kill();setTimeout(()=>process.exit(process.exitCode||0),150);});
