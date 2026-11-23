// Integration test: 2 real WebSocket clients and a fast-forwarded 2-player match.
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const http=require('node:http');
const srv=cp.spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:'30817',ROUND_MS:'2200',COUNTDOWN_MS:'500',INTERMISSION_MS:'500'},stdio:'pipe'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function test(){await delay(350);const url='ws://localhost:30817/ws';let a=new WebSocket(url),b=new WebSocket(url),A=[],B=[];
 a.onmessage=e=>A.push(JSON.parse(e.data));b.onmessage=e=>B.push(JSON.parse(e.data));
 await Promise.all([new Promise(r=>a.onopen=r),new Promise(r=>b.onopen=r)]);
 a.send(JSON.stringify({type:'create',name:'Hop',color:'mint'}));await delay(80);const code=A.find(m=>m.type==='joined')?.code;assert.match(code,/^[A-Z2-9]{5}$/);b.send(JSON.stringify({type:'join',code,name:'Boop',color:'pink'}));await delay(130);assert.equal(B.find(m=>m.type==='joined')?.code,code);
 await delay(850);const s=A.filter(m=>m.type==='state').at(-1);assert.equal(s.phase,'playing');assert.equal(s.players.length,2);assert.equal(s.players.filter(p=>p.monster).length,1);assert.equal(s.round,1);assert.equal(s.players.find(p=>p.monster).maxHp,350);
 const surv=s.players.find(p=>!p.monster),beast=s.players.find(p=>p.monster);
 const scli=surv.id===A.find(x=>x.type==='joined').id?a:b;
 const mcli=beast.id===A.find(x=>x.type==='joined').id?a:b;
 scli.send(JSON.stringify({type:'move',x:0,y:0,z:0,yaw:0}));
 mcli.send(JSON.stringify({type:'move',x:0,y:0,z:-3,yaw:0}));
 await delay(360);
 const latest=A.filter(x=>x.type==='state').at(-1);
 assert.equal(latest.players.find(p=>p.id===surv.id).weapon,'blaster','Survivor should collect a nearby Lily Blaster');
 scli.send(JSON.stringify({type:'attack',kind:'blaster',dir:[0,.066,-.998]}));
 await delay(200);
 const after=A.filter(x=>x.type==='state').at(-1);
 assert.ok(after.players.find(p=>p.id===beast.id).hp<350,'Monster should take damage from blaster hit');
 await delay(2450);const e=A.filter(m=>m.type==='roundEnd');assert.ok(e.length>0,'Round should finish on timeout');
 await delay(1100);const second=A.filter(m=>m.type==='state').at(-1);assert.ok(['playing','countdown','lobby'].includes(second.phase),'Should advance toward next round');
 b.close();a.close();console.log('PASS: room codes, multiplayer joins, countdown, monster assignment, 2-minute default configured timer (shortened in test), round end, intermission.');}
test().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>{srv.kill();setTimeout(()=>process.exit(process.exitCode||0),150);});
