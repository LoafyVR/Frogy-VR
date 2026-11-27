'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const root=path.resolve(__dirname,'..');
const motion=require('../public/movement.js'),Promo=require('../codes.js');
const c={surfaceAt:q=>q[1]<=.10&&q[1]>=-.35?{type:'floor',point:[q[0],0,q[2]],normal:[0,1,0]}:null};
// The whole reason for 18.1: no trigger, grip or fast downward stroke required
// when a hand is at a reachable floor while the body itself is grounded.
let contact=motion.contactSurface([.2,.95,0],{x:0,y:0,z:0},true,1.7,1,c,'arena',null,null,[0,1.7,0],null);
assert.equal(contact?.type,'floor','stationary lowered hand automatically plants on ground');
assert.equal(motion.contactSurface([.2,1.4,0],{x:0,y:0,z:0},true,1.7,1,c,'arena',null)?.type,undefined,'raised hand does not plant');
assert.equal(motion.contactSurface([.2,.95,0],{x:0,y:0,z:0},false,1.7,1,c,'arena',null),null,'airborne hand has no floor contact');
let anchor=motion.stepHand(null,[.2,.95,0],[0,1.7,0],contact,1/72,1,1000);
assert.equal(anchor.push,null,'first touch only plants, no teleport');
let moved=motion.stepHand(anchor.contact,[.2,.90,.05],[0,1.7,0],contact,1/72,1,1014);
assert(moved.push?.up>0&&moved.push.vz<0,'downward and forward motion produce a grounded push without buttons');
assert.deepEqual(motion.stepHand(moved.contact,[.2,.84,.1],[0,1.7,0],null,1/72,1,1028),{contact:null,push:null},'release loses push');
const initial={crickets:100,coins:100,dabloons:5,inventory:[],equipped:{hat:'none',face:'none',back:'none',badge:'none'},redeemedCodes:[]};
const unlocked=Promo.redeem(initial,'TUFF');assert(unlocked.ok,'TUFF code succeeds');
assert(initial.inventory.includes('tuff-badge')&&initial.equipped.badge==='tuff-badge','TUFF badge is owned and equipped');
assert(!Promo.redeem(initial,'TUFF').ok,'TUFF is only redeemable once per account');
assert(!initial.redeemedCodes.includes('HROHN'),'session boost is never persisted in redeemed codes');
const clientSrc=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
assert(clientSrc.includes('(me?.sessionSpeed?2:1)'),'HROHN stacks multiplicatively on push gain and speed cap');
assert(clientSrc.includes('monster?.225:.096'),'bulky monster arms render without movement changes');
assert(fs.readFileSync(path.join(root,'public/features.js'),'utf8').includes("'hat','face','back','badge'"),'independent badge slot exists');
const data=fs.mkdtempSync(path.join(os.tmpdir(),'frogy181-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const sockets=[];
const until=async(fn,timeout=5000)=>{const t=Date.now();while(Date.now()-t<timeout){const out=fn();if(out)return out;await sleep(22);}throw new Error('Timed out: '+fn.toString().slice(0,110));};
const port=12000+Math.floor(Math.random()*15000);
const child=cp.spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),FROGY_DATA_DIR:data,COUNTDOWN_MS:'15000',DATABASE_URL:''},stdio:'ignore'});
async function peer(token=''){
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),msgs=[];ws.addEventListener('message',ev=>{try{msgs.push(JSON.parse(ev.data))}catch{}});
 await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});sockets.push(ws);
 const api={ws,msgs,send:o=>ws.send(JSON.stringify(o)),last:type=>msgs.filter(m=>m.type===type).at(-1)};
 api.send({type:'hello',token});await until(()=>api.last('profile'));
 return api;
}
async function run(){
 await sleep(320);const a=await peer(),b=await peer();
 const token=a.last('profile').token;a.send({type:'create',name:'BoostTester'});
 const room=await until(()=>a.last('joined'));b.send({type:'join',code:room.code,name:'Friend'});
 await until(()=>b.last('joined'));
 a.send({type:'redeemCode',code:'HROHN'});
 await until(()=>a.last('codeResult')?.code==='HROHN');
 assert.equal(a.last('codeResult').ok,true,'HROHN accepted');
 await until(()=>a.last('state')?.players?.some(p=>p.id===room.id&&p.sessionSpeed));
 a.send({type:'redeemCode',code:'STOP'});await until(()=>a.last('codeResult')?.code==='STOP');
 await until(()=>a.last('state')?.players?.some(p=>p.id===room.id&&!p.sessionSpeed));
 a.send({type:'redeemCode',code:'HROHN'});await until(()=>a.msgs.filter(m=>m.type==='codeResult'&&m.code==='HROHN').length>=2);
 a.send({type:'redeemCode',code:'TUFF'});await until(()=>a.last('codeResult')?.code==='TUFF');
 await until(()=>a.last('profile').equipped?.badge==='tuff-badge');
 await until(()=>b.last('state')?.players?.some(p=>p.id===room.id&&p.equipped?.badge==='tuff-badge'));
 assert(a.last('profile').inventory.includes('tuff-badge'),'profile has code-only badge');
 const pjson=JSON.stringify(fs.readFileSync(path.join(data,'profiles.json'),'utf8'));
 assert(!pjson.includes('sessionHrohn')&&!pjson.includes('sessionSpeed'),'session HROHN is never saved');
 a.ws.close();await new Promise(res=>a.ws.addEventListener('close',res,{once:true}));
 const reconnect=await peer(token);
 assert.equal(reconnect.last('profile').sessionSpeed,false,'HROHN resets on reconnect');
 assert(reconnect.last('profile').inventory.includes('tuff-badge'),'TUFF survives reconnect');
 assert.equal(reconnect.last('profile').equipped.badge,'tuff-badge');
 reconnect.send({type:'equip',slot:'badge',item:'none'});await until(()=>reconnect.last('profile').equipped?.badge==='none');
 reconnect.send({type:'equip',slot:'badge',item:'tuff-badge'});await until(()=>reconnect.last('profile').equipped?.badge==='tuff-badge');
 b.send({type:'buy',item:'tuff-badge'});await until(()=>b.last('shopResult')?.item==='tuff-badge');
 assert.equal(b.last('shopResult').ok,false,'badge cannot be purchased without code');
 console.log('PASS Frogy 18.1: grounded hand without buttons; no air; diagonal hop; session HROHN/STOP resets; TUFF badge saved, equipped and code-only; monster visual');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const w of sockets)try{w.close()}catch{}child.kill();setTimeout(()=>{fs.rmSync(data,{recursive:true,force:true});process.exit(process.exitCode||0);},180)});
