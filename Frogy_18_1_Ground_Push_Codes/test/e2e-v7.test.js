'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {easternDay}=require('../economy.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frogy-v7-'));
const tokens=['a'.repeat(48),'b'.repeat(48)];
const fixture={};for(const token of tokens)fixture[token]={crickets:2000,coins:2000,dabloons:600,lastCricketDay:easternDay(),inventory:[],equipped:{hat:'none',face:'none',back:'none'},stats:{wins:0,kills:0,rounds:0},name:token[0]==='a'?'Alpha':'Beta'};
fs.writeFileSync(path.join(dir,'profiles.json'),JSON.stringify(fixture));
const srv=cp.spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:'30931',FROGY_DATA_DIR:dir,COUNTDOWN_MS:'500',ROUND_MS:'600',INTERMISSION_MS:'600'},stdio:'pipe'});
const peers=[];const delay=t=>new Promise(r=>setTimeout(r,t));
async function until(fn,max=2500){const stop=Date.now()+max;while(Date.now()<stop){const v=fn();if(v)return v;await delay(20);}throw Error('Timeout '+String(fn));}
async function make(token){const ws=new WebSocket('ws://127.0.0.1:30931/ws'),msgs=[];ws.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise(r=>ws.onopen=r);const v={ws,msgs,send:x=>ws.send(JSON.stringify(x)),last:x=>msgs.filter(m=>m.type===x).at(-1)};peers.push(v);v.send({type:'hello',token});await until(()=>v.last('profile'));return v;}
async function run(){await delay(500);const a=await make(tokens[0]),b=await make(tokens[1]);
assert.equal(a.last('profile').crickets,2000);assert.equal(a.last('profile').dabloons,600);assert.equal(a.last('profile').quests.length,3);
a.send({type:'buy',item:'mushroom'});await until(()=>a.last('shopResult'));assert.equal(a.last('shopResult').ok,true);assert.equal(a.last('profile').crickets,1400);
a.send({type:'buyTool',item:'speed'});await until(()=>a.last('toolResult'));assert.equal(a.last('toolResult').ok,true);assert.equal(a.last('profile').dabloons,550);assert.equal(a.last('profile').tools.speed,1);
b.send({type:'buyTool',item:'speed'});await until(()=>b.last('toolResult'));assert.equal(b.last('profile').tools.speed,1);
const aid=a.last('profile').publicId,bid=b.last('profile').publicId;
a.send({type:'public',name:'Alpha'});b.send({type:'public',name:'Beta'});await until(()=>a.last('joined')&&b.last('joined'));assert.equal(a.last('joined').code,b.last('joined').code);
a.send({type:'friendRequest',publicId:bid});await until(()=>a.last('socialResult'));assert.match(a.last('socialResult').message,/friend request sent/i);
b.send({type:'friendRequest',publicId:aid});await until(()=>b.last('socialResult'));await until(()=>a.last('social')?.friends?.some(f=>f.id===bid));assert.ok(b.last('social').friends.some(f=>f.id===aid));
a.send({type:'reportPlayer',playerId:b.last('joined').id,reason:'Cheating'});await until(()=>a.last('reportResult'));assert.equal(a.last('reportResult').ok,true);
await until(()=>a.msgs.some(m=>m.type==='state'&&m.phase==='playing'),2500);const state=a.msgs.filter(m=>m.type==='state'&&m.phase==='playing').at(-1);
assert.equal(state.players.length,2);const monster=state.players.find(p=>p.monster),surv=state.players.find(p=>!p.monster);assert.ok(monster&&surv);
const map={ [a.last('joined').id]:a, [b.last('joined').id]:b };
map[monster.id].send({type:'activateTool',item:'speed'});await until(()=>map[monster.id].msgs.some(m=>m.type==='toolResult'&&m.ok===false));
map[surv.id].send({type:'activateTool',item:'speed'});await until(()=>map[surv.id].last('toolActivated'));assert.equal(map[surv.id].last('toolActivated').id,'speed');
await until(()=>a.last('roundEnd'),3000);await until(()=>a.last('profile').stats.rounds>=1);
const profiles=JSON.parse(fs.readFileSync(path.join(dir,'profiles.json'),'utf8'));
assert.ok(profiles[tokens[0]].friends.includes(bid));assert.ok(profiles[tokens[1]].friends.includes(aid));assert.ok(profiles[tokens[0]].inventory.includes('mushroom'));assert.equal(profiles[tokens[0]].tools.speed,0+(surv.id===a.last('joined').id?0:1));
console.log('PASS v7: server-priced Crickets cosmetics, Dabloon tools, mutual friends, joining the same lobby, report flow, role-gated tool activation, and persisted inventory.');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const p of peers)p.ws.close();srv.kill();setTimeout(()=>{fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0)},190)});
