// Browser-profile coins, equipment, map voting, and in-room voice signaling checks.
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const srv=cp.spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:'30818',COUNTDOWN_MS:'1800',INTERMISSION_MS:'300',ROUND_MS:'1500'},stdio:'pipe'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let A=[],B=[],a,b;
async function until(fn,limit=1800){const start=Date.now();while(Date.now()-start<limit){let v=fn();if(v)return v;await sleep(20);}throw Error('Timeout waiting for '+fn.toString());}
async function run(){await sleep(350);a=new WebSocket('ws://127.0.0.1:30818/ws');b=new WebSocket('ws://127.0.0.1:30818/ws');a.onmessage=e=>A.push(JSON.parse(e.data));b.onmessage=e=>B.push(JSON.parse(e.data));await Promise.all([new Promise(r=>a.onopen=r),new Promise(r=>b.onopen=r)]);
 a.send(JSON.stringify({type:'hello'}));b.send(JSON.stringify({type:'hello'}));const first=await until(()=>A.find(x=>x.type==='profile'));const profile=await until(()=>B.find(x=>x.type==='profile'));
 assert.match(first.token,/^[a-f0-9]{48}$/);assert.equal(first.bonus,0);assert.equal(first.coins,90);assert.equal(profile.coins,90);
 a.send(JSON.stringify({type:'buy',item:'bow'}));const bought=await until(()=>A.find(x=>x.type==='profile'&&x.coins===25));assert.equal(bought.equipped.hat,'bow');assert.ok(bought.inventory.includes('bow'));
 a.send(JSON.stringify({type:'color',color:'blue'}));await until(()=>A.find(x=>x.type==='profile'&&x.color==='blue'));
 a.send(JSON.stringify({type:'hello',token:first.token}));const later=await until(()=>A.findLast(x=>x.type==='profile'&&x.token===first.token&&x.bonus===0));assert.equal(later.coins,25,'Daily login bonus should only be credited once');
 a.send(JSON.stringify({type:'create',name:'Hop',color:'blue'}));const code=(await until(()=>A.find(x=>x.type==='joined'))).code;
 b.send(JSON.stringify({type:'join',code,name:'Boop',color:'pink'}));await until(()=>B.find(x=>x.type==='joined'));
 a.send(JSON.stringify({type:'vote',index:2}));b.send(JSON.stringify({type:'vote',index:2}));await until(()=>A.find(x=>x.type==='state'&&x.votes?.[2]===2));
 a.send(JSON.stringify({type:'voice-ready',enabled:true}));b.send(JSON.stringify({type:'voice-ready',enabled:true}));await until(()=>B.find(x=>x.type==='voice-peers'&&x.ids.length===1));
 a.send(JSON.stringify({type:'rtc',to:B.find(x=>x.type==='joined').id,data:{kind:'candidate',candidate:{candidate:'fake-ice'}}}));await until(()=>B.find(x=>x.type==='rtc'&&x.data.kind==='candidate'));
 const playing=await until(()=>A.find(x=>x.type==='state'&&x.phase==='playing'),2600);
 assert.equal(playing.map,2);assert.equal(playing.players.find(p=>p.name==='Hop').equipped.hat,'bow');assert.equal(playing.players.find(p=>p.name==='Hop').color,'blue');
 a.close();b.close();console.log('PASS: daily login coins, save/relogin, shop purchase, outfit equipment, free color change, per-player map votes, voice signaling, monster round.');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{a?.close();b?.close();srv.kill();setTimeout(()=>process.exit(process.exitCode||0),200);});
