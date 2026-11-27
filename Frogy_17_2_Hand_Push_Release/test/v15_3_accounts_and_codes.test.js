'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frogy-account-v153-'));
const root=path.join(__dirname,'..'),port=String(34500+Math.floor(Math.random()*900));
const peers=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label='event',max=7000){const end=Date.now()+max;while(Date.now()<end){const value=fn();if(value)return value;await sleep(20);}throw new Error('Timed out: '+label);}
async function launch(){const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:port,FROGY_DATA_DIR:dir,DATABASE_URL:'',COUNTDOWN_MS:'650',ROUND_MS:'8500'},stdio:'pipe'});
 let errors='';child.stderr.on('data',b=>errors+=b);
 for(let i=0;i<100;i++){try{const res=await fetch('http://127.0.0.1:'+port+'/health');if(res.ok)return child;}catch{}await sleep(35);}throw Error('Server did not start '+errors);
}
async function peer(token=''){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),msgs=[];
 ws.onmessage=e=>msgs.push(JSON.parse(e.data));await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
 const p={ws,msgs,send:m=>ws.send(JSON.stringify(m)),last:type=>msgs.filter(m=>m.type===type).at(-1)};peers.push(p);p.send({type:'hello',token});await until(()=>p.last('profile'),'profile');return p;}
async function stop(child){for(const p of peers)try{p.ws.close();}catch{}child.kill('SIGTERM');await Promise.race([new Promise(r=>child.on('exit',r)),sleep(1700)]);}
(async()=>{
 let server=await launch();let priorCode='',newCode='',token='',saved;
 try{
  const a=await peer();token=a.last('profile').token;
  assert.equal(a.last('profile').saveMode,'configured-disk');
  const health=await(await fetch('http://127.0.0.1:'+port+'/health')).json();
  assert.equal(health.profileStorage,'configured-disk');
  a.send({type:'redeemCode',code:'DJHQW'});await until(()=>a.last('codeResult')?.code==='DJHQW'&&a.last('codeResult').ok,'public developer currency');
  assert.equal(a.last('profile').crickets,10500);
  a.send({type:'redeemCode',code:'EMPSH'});await until(()=>a.last('codeResult')?.code==='EMPSH'&&a.last('codeResult').ok,'public owner cosmetic');
  assert.equal(a.last('profile').ownerTag,true);assert.equal(a.last('profile').canModerate,false,'public owner title cannot grant kick privileges');
  a.send({type:'redeemCode',code:'IHVDL'});await until(()=>a.last('codeResult')?.code==='IHVDL'&&a.last('codeResult').ok,'public mod cosmetic');
  assert.equal(a.last('profile').canModerate,false);
  a.send({type:'buy',item:'mushroom'});await until(()=>a.last('profile')?.inventory?.includes('mushroom'),'purchased cosmetic');
  a.send({type:'buyTool',item:'speed'});await until(()=>a.last('profile')?.tools?.speed===1,'purchased Swift Legs');
  a.send({type:'color',color:'rgb-836'});await until(()=>a.last('profile')?.color==='rgb-836','color saved');
  a.send({type:'rename',name:'My Frog'});await until(()=>a.last('profile')?.name==='My Frog','name saved');
  a.send({type:'createRecoveryCode'});priorCode=await until(()=>a.last('recoveryCodeResult')?.ok&&a.last('recoveryCodeResult').code,'backup code');
  assert.match(priorCode,/^FROG(-[A-HJ-NP-Z2-9]{4}){4}$/);
  a.send({type:'create',name:'My Frog'});await until(()=>a.last('joined'),'room');
  const b=await peer();b.send({type:'join',code:a.last('joined').code,name:'Second Frog'});await until(()=>b.last('joined'),'join');
  await until(()=>a.last('profile')?.stats?.rounds>=1,'rounds statistic',7500);
  saved=structuredClone(a.last('profile'));
  const persisted=fs.readFileSync(path.join(dir,'profiles.json'),'utf8');
  assert(!persisted.includes(priorCode),'Recovery code is never stored as plaintext');
  assert.equal(JSON.parse(persisted)[token].tools.speed,1);
  await stop(server);
  server=await launch();
  // New headset/browser without old session token can recover from backup code.
  const c=await peer();assert.notEqual(c.last('profile').token,token);
  c.send({type:'recoverProfile',code:priorCode});
  await until(()=>c.last('recoveryResult')?.ok,'backup restored');
  newCode=await until(()=>c.last('recoveryCodeResult')?.ok&&c.last('recoveryCodeResult')?.code!==priorCode&&c.last('recoveryCodeResult').code,'backup rotated');
  const restored=await until(()=>c.last('profile')?.token===token&&c.last('profile'),'original account loaded');
  for(const key of ['crickets','dabloons','color','name'])assert.equal(restored[key],saved[key],key+' survived restart');
  assert.deepEqual(restored.stats,saved.stats,'all stats survived restart');
  assert.deepEqual(restored.inventory,saved.inventory,'cosmetics survived restart');
  assert.deepEqual(restored.equipped,saved.equipped,'equipped cosmetics survived restart');
  assert.deepEqual(restored.tools,saved.tools,'unused items survived restart');
  assert.equal(restored.ownerTag,true);assert.equal(restored.modTag,true);
  const d=await peer();d.send({type:'recoverProfile',code:priorCode});
  await until(()=>d.last('recoveryResult')?.ok===false,'old code denied');
  d.send({type:'recoverProfile',code:newCode});await until(()=>d.last('recoveryResult')?.ok===true,'rotated code works');
  console.log('PASS v15.3 accounts: save through restart, cosmetics/wallet/stats/items, public dev codes, allowlisted moderation, hashed rotating recovery');
 }finally{await stop(server);fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
