'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
const Grapple=require('../public/grapple.js');
assert.equal(Grapple.COOLDOWN_MS,7000,'default shared cooldown is still 7 seconds');
assert(game.includes('profile.sessionGrappleSpam?now:FrogyGrapple.sharedCooldown(now,tongueReadyAt)'), 'release skips cooldown only while TKDYP is active');
assert(game.includes('FrogyGrapple.canFireShared(tongues,profile.sessionGrappleSpam?now:tongueReadyAt,now)'), 'both hands share code-aware readiness');
assert(game.includes('readyAt:profile.sessionGrappleSpam?0:tongueReadyAt'), 'new tongue activation ignores old recharge only when TKDYP enabled');
assert(game.includes('profile.sessionGrappleSpam?now:Math.max(tongueReadyAt,shot.readyAt||0)'), 'missed grapple shots cannot restart the cooldown while TKDYP is active');
const available={left:{active:false},right:{active:false}};
assert(Grapple.canFireShared(available,5000,5000),'ordinary grapple can fire when cooldown expires');
assert(!Grapple.canFireShared(available,5000,4999),'ordinary grapple cannot fire early');
assert(Grapple.canFireShared(available,2500,2500),'TKDYP can re-fire when its release timer is now');
assert(!Grapple.canFireShared({left:{active:true},right:{active:false}},2500,2500),'TKDYP still has one active tongue at a time');
const data=fs.mkdtempSync(path.join(os.tmpdir(),'frogy-tkdyp-'));
const port=22000+Math.floor(Math.random()*14000),sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),FROGY_DATA_DIR:data,DATABASE_URL:''},stdio:'ignore'});
const sockets=[];
async function until(fn,ms=6000){const t=Date.now();while(Date.now()-t<ms){const r=fn();if(r)return r;await sleep(20);}throw new Error('timeout waiting for '+fn.toString());}
async function peer(token=''){
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),msgs=[];
 ws.addEventListener('message',e=>{try{msgs.push(JSON.parse(e.data))}catch{}});
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});sockets.push(ws);
 const p={ws,msgs,send:v=>ws.send(JSON.stringify(v)),last:t=>msgs.filter(m=>m.type===t).at(-1),codes:c=>msgs.filter(m=>m.type==='codeResult'&&m.code===c)};
 p.send({type:'hello',token});await until(()=>p.last('profile'));return p;
}
async function redeem(p,code,seen=0){p.send({type:'redeemCode',code});await until(()=>p.codes(code).length>seen);assert.equal(p.codes(code).at(-1).ok,true);await until(()=>p.last('profile')?.sessionGrappleSpam!==undefined);}
async function main(){
 await sleep(300);const a=await peer(),token=a.last('profile').token;
 assert.equal(a.last('profile').sessionGrappleSpam,false);
 await redeem(a,'TKDYP');await until(()=>a.last('profile').sessionGrappleSpam===true);
 assert.equal(a.last('profile').sessionSpeed,false,'TKDYP must not activate speed');
 await redeem(a,'HROHN');await until(()=>a.last('profile').sessionSpeed===true);
 assert.equal(a.last('profile').sessionGrappleSpam,true,'HROHN must not turn off grapple spam');
 await redeem(a,'STOP');await until(()=>a.last('profile').sessionSpeed===false&&a.last('profile').sessionGrappleSpam===false);
 await redeem(a,'TKDYP',1);await until(()=>a.last('profile').sessionGrappleSpam===true);
 assert(!JSON.stringify(fs.readFileSync(path.join(data,'profiles.json'),'utf8')).includes('sessionTkdyp'),'code is not saved to the account');
 assert(!JSON.stringify(a.last('profile').redeemedCodes).includes('TKDYP'),'code is not tracked as permanent redemption');
 a.ws.close();await new Promise(ok=>a.ws.addEventListener('close',ok,{once:true}));
 const b=await peer(token);assert.equal(b.last('profile').sessionGrappleSpam,false,'disconnection resets TKDYP');
 assert.equal(b.last('profile').sessionSpeed,false,'disconnection resets HROHN');
 console.log('PASS Frogy 18.1 TKDYP: immediate shared tongue recharge, HROHN stacking, STOP both, socket-only, reconnect resets');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const w of sockets)try{w.close()}catch{}child.kill();setTimeout(()=>{fs.rmSync(data,{recursive:true,force:true});process.exit(process.exitCode||0);},150)});
