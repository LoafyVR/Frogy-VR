'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const PORT='30987',root=path.resolve(__dirname,'..');
const srv=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT,COUNTDOWN_MS:'320',ROUND_MS:'1000',INTERMISSION_MS:'800'},stdio:'pipe'});
const peers=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=5000){const start=Date.now();while(Date.now()-start<ms){const v=fn();if(v)return v;await sleep(35);}throw Error('Timed out');}
async function connect(){const ws=new WebSocket(`ws://127.0.0.1:${PORT}/ws`),msgs=[];ws.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});const a={ws,msgs,send:m=>ws.send(JSON.stringify(m)),last:t=>msgs.filter(m=>m.type===t).at(-1)};peers.push(a);a.send({type:'hello'});return a;}
(async()=>{await sleep(300);
 const a=await connect();a.send({type:'create',name:'Mint Frog'});
 const joined=await until(()=>a.last('joined'));
 const b=await connect();b.send({type:'join',code:joined.code,name:'Pink Frog'});await until(()=>b.last('joined'));
 const lobby=await until(()=>a.last('state')?.players?.length===2&&a.last('state'));
 assert.equal(lobby.players.length,2,'all room members are broadcast');
 assert.ok(lobby.players.every(p=>p.alive),'all lobby players visible');
 const playing=await until(()=>a.last('state')?.phase==='playing'&&a.last('state'));
 assert.equal(playing.players.length,2);
 const idA=joined.id;
 let p=playing.players.find(q=>q.id===idA);
 a.send({type:'move',x:p.x,y:0,z:p.z,l:[p.x-.32,.14,p.z],r:[p.x+.32,.14,p.z]});
 await until(()=>a.last('state')?.players?.find(q=>q.id===idA)?.rr?.length===3);
 const other=await until(()=>b.last('state')?.players?.find(q=>q.id===idA)?.rr?.length===3&&b.last('state'));
 assert.ok(other.players.find(q=>q.id===idA).l,'friend receives left hand');
 assert.ok(other.players.find(q=>q.id===idA).rr,'friend receives right hand');
 const inter=await until(()=>a.last('state')?.phase==='intermission'&&a.last('state'));
 assert.ok(inter.players.every(q=>q.alive),'all frogs restore visibility during intermission');
 assert.equal(inter.players.length,2,'players remain in room');
 console.log('PASS: two remote frogs broadcast with hands and reappear during intermission');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const p of peers)p.ws.close();srv.kill();setTimeout(()=>process.exit(process.exitCode||0),150);});
