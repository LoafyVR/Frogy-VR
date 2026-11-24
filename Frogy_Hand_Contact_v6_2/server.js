'use strict';
// Frogy: dependency-free private-room WebSocket game with persistent per-browser cosmetics.
const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const PORT=Number(process.env.PORT||3000),ROOT=path.join(__dirname,'public');
const ROUND_MS=Number(process.env.ROUND_MS||120000),COUNTDOWN_MS=Number(process.env.COUNTDOWN_MS||20000),INTERMISSION_MS=Number(process.env.INTERMISSION_MS||32000);
const WorldData=require('./public/world.js'),FrogyHub=require('./public/hub.js');
const MAPS=WorldData.maps.map(m=>m.name);
const PALETTE=['mint','pink','lilac','blue','peach','lime'];
const SPAWNS=WorldData.spawns,WEAPONS=WorldData.weapons;
function validColor(v){return PALETTE.includes(v)||/^rgb-[0-9]{3}$/.test(v);}
const SHOP=[
 {id:'mushroom',slot:'hat',name:'Mushroom Cap',emoji:'🍄',price:60},
 {id:'crown',slot:'hat',name:'Pond Royalty',emoji:'👑',price:120},
 {id:'party',slot:'hat',name:'Party Hat',emoji:'🥳',price:75},
 {id:'wizard',slot:'hat',name:'Bog Wizard',emoji:'🧙',price:145},
 {id:'bow',slot:'hat',name:'Big Pink Bow',emoji:'🎀',price:65},
 {id:'glasses',slot:'face',name:'Dorky Glasses',emoji:'🤓',price:70},
 {id:'starshades',slot:'face',name:'Star Shades',emoji:'😎',price:110},
 {id:'mustache',slot:'face',name:'Tiny Mustache',emoji:'🥸',price:45},
 {id:'wings',slot:'back',name:'Fairy Wings',emoji:'🦋',price:160},
 {id:'cape',slot:'back',name:'Hero Cape',emoji:'🦸',price:115},
 {id:'backpack',slot:'back',name:'Snack Pack',emoji:'🎒',price:85}
];
const SHOP_BY_ID=new Map(SHOP.map(i=>[i.id,i]));
const DATA_DIR=process.env.FROGY_DATA_DIR||path.join(__dirname,'data'),ACCOUNTS_FILE=path.join(DATA_DIR,'profiles.json');
let accounts={};try{accounts=JSON.parse(fs.readFileSync(ACCOUNTS_FILE,'utf8'));if(!accounts||Array.isArray(accounts)||typeof accounts!=='object')accounts={};}catch{}
let db=null,dbQueue=Promise.resolve();
function saveAccounts(token){
 // Local file is reliable on your own machine or on a mounted persistent disk.
 // Render's default ephemeral disk is not durable. DATABASE_URL enables Postgres sync.
 fs.mkdirSync(DATA_DIR,{recursive:true});const tmp=ACCOUNTS_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(accounts));fs.renameSync(tmp,ACCOUNTS_FILE);
 if(db){const entries=token?[[token,accounts[token]]]:Object.entries(accounts);for(const [id,account] of entries){if(!account)continue;const payload=JSON.stringify(account);dbQueue=dbQueue.then(()=>db.query('INSERT INTO frogy_profiles(token, profile) VALUES($1,$2::jsonb) ON CONFLICT(token) DO UPDATE SET profile=EXCLUDED.profile',[id,payload])).catch(e=>console.error('Frogy database write failed:',e.message));}}
}
async function initDatabase(){if(!process.env.DATABASE_URL){console.warn('Profiles are stored locally only. Render free instances can lose these files on restart. Set DATABASE_URL or mount FROGY_DATA_DIR for durable saving.');return;}
 const {Pool}=require('pg');db=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});
 await db.query('CREATE TABLE IF NOT EXISTS frogy_profiles (token varchar(48) PRIMARY KEY, profile jsonb NOT NULL)');
 const result=await db.query('SELECT token,profile FROM frogy_profiles');for(const row of result.rows)accounts[row.token]=row.profile;
 console.log('Persistent Postgres profiles ready:',result.rows.length,'frogs');
}

const rooms=new Map(),clients=new Map();let nextId=1;
function safe(v,min,max,d=0){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):d;}
function uid(){return String(nextId++);}
function code(){let s;do{s=Array.from({length:5},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');}while(rooms.has(s));return s;}
const send=(c,obj)=>{const socket=c?.socket||c;if(socket&&!socket.closed)try{socket.send(JSON.stringify(obj));}catch(e){console.error('WebSocket send:',e.message);}};
const players=r=>[...r.players.values()];
function cast(r,obj,except=null){for(const p of players(r))if(p.id!==except)send(p.socket,obj);}
function profileMessage(client,bonus=0){const p=client.profile;if(p)send(client,{type:'profile',token:client.profileToken,name:p.name,coins:p.coins,inventory:p.inventory,equipped:p.equipped,color:p.color,stats:p.stats,bonus,nextRewardAt:p.lastRewardAt+86400000,shop:SHOP});}
function setupProfile(client,m){
 let token=String(m.token||''),isNew=false;
 if(!/^[a-f0-9]{48}$/.test(token)||!accounts[token]){token=crypto.randomBytes(24).toString('hex');accounts[token]={coins:90,inventory:[],equipped:{hat:'none',face:'none',back:'none'},color:'mint',name:'Lil Frog',stats:{wins:0,kills:0,rounds:0},lastRewardAt:Date.now()};isNew=true;}
 const p=accounts[token],now=Date.now();if(!Array.isArray(p.inventory))p.inventory=[];if(!p.equipped)p.equipped={hat:'none',face:'none',back:'none'};
 if(!p.stats)p.stats={wins:0,kills:0,rounds:0};if(!p.name)p.name='Lil Frog';if(!Number.isFinite(p.coins))p.coins=90;
 // Migration for previous once-per-calendar-day saves. Never grant extra credits simply for reconnecting.
 if(!Number.isFinite(p.lastRewardAt))p.lastRewardAt=p.lastLoginDay?Math.max(0,Date.parse(p.lastLoginDay+'T00:00:00Z')):now;
 let bonus=0;if(!isNew&&now-p.lastRewardAt>=86400000){bonus=40;p.coins+=bonus;p.lastRewardAt=now;}
 client.profileToken=token;client.profile=p;saveAccounts(token);profileMessage(client,bonus);
}

function publicPlayer(p){return {id:p.id,name:p.name,mouth:p.mouth,color:p.color,equipped:p.equipped,x:p.x,y:p.y,z:p.z,yaw:p.yaw,l:p.l,rr:p.rr,alive:p.alive,monster:p.monster,spectating:!!p.spectating,weapon:p.weapon,heldHand:p.heldHand||'right',heldPart:p.heldPart||null,heldPartHand:p.heldPartHand||null,lostArms:p.lostArms||0,kills:p.kills,wins:p.wins};}
function voteCounts(r){const a=[0,0,0];for(const [id,n] of r.votes)if(r.players.has(id))a[n]++;return a;}
function winningMap(r){const counts=voteCounts(r),max=Math.max(...counts);if(!max)return r.round===0?r.map:(r.map+1)%3;const tops=counts.map((c,i)=>c===max?i:-1).filter(i=>i>=0);return tops.length===1?tops[0]:tops.find(i=>i!==r.map)??tops[0];}
function state(r){return {type:'state',visibility:r.visibility||'private',online:clients.size,publicRooms:[...rooms.values()].filter(x=>x.visibility==='public').length,code:r.code,phase:r.phase,seconds:r.phaseEnd?Math.max(0,Math.ceil((r.phaseEnd-Date.now())/1000)):0,map:r.map,selectedMap:winningMap(r),votes:voteCounts(r),round:r.round,host:r.host,lastWinner:r.lastWinner,players:players(r).map(publicPlayer),pickups:r.pickups.map(w=>({...w,available:w.availableAt<=Date.now()})),parts:r.parts||[],blood:r.blood||[]};}
function sync(r){cast(r,state(r));}
function removeClient(client){const r=client.room;if(!r)return;const p=r.players.get(client.id);if(!p)return;r.players.delete(client.id);r.votes.delete(client.id);client.room=null;client.voiceEnabled=false;cast(r,{type:'peer-left',from:client.id});cast(r,{type:'notice',text:p.name+' hopped away'});if(!r.players.size){rooms.delete(r.code);return;}if(r.host===client.id)r.host=players(r)[0].id;if(r.phase==='playing'&&p.monster)finish(r,'The frogs','The monster hopped away!');else if(r.phase==='playing')winCheck(r);if(r.phase==='countdown'&&r.players.size<2){r.phase='lobby';r.phaseEnd=0;}sync(r);}
function join(client,r,name,color){if(r.players.size>=8){send(client,{type:'error',message:'That lily pad is full (8 frogs max).'});return;}if(client.room)removeClient(client);if(!client.profile)setupProfile(client,{});
 const p={id:client.id,socket:client,name:String(name||client.profile.name||'Lil Frog').trim().slice(0,18).replace(/[<>]/g,'')||'Lil Frog',color:validColor(color)?color:client.profile.color,equipped:{...client.profile.equipped},x:FrogyHub.spawn(r.players.size)[0],y:0,z:FrogyHub.spawn(r.players.size)[1],yaw:0,l:null,rr:null,mouth:0,hp:r.phase==='playing'?0:100,maxHp:100,alive:r.phase!=='playing',monster:false,weapon:'none',heldPart:null,heldPartHand:null,spectating:r.phase==='playing',lostArms:0,kills:0,wins:0,lastAtk:0,lastRoar:0};
 client.profile.color=p.color;client.profile.name=p.name;saveAccounts(client.profileToken);r.players.set(p.id,p);client.room=r;client.voiceEnabled=false;if(!r.host)r.host=p.id;send(client,{type:'joined',id:p.id,code:r.code,visibility:r.visibility||'private'});cast(r,{type:'notice',text:p.name+' joined the pond!'});sync(r);}
function newRoom(client,msg){const c=code(),r={code:c,players:new Map(),votes:new Map(),host:null,phase:'lobby',phaseEnd:0,map:0,round:0,lastWinner:'',pickups:WEAPONS.map(w=>({...w,availableAt:0})),parts:[],blood:[],lastMonster:null,visibility:'private'};rooms.set(c,r);join(client,r,msg.name,msg.color);}
function publicRoom(client,msg){if(client.room)removeClient(client);let r=[...rooms.values()].filter(x=>x.visibility==='public'&&x.players.size<8).sort((a,b)=>{const rank=x=>x.phase==='playing'?2:x.phase==='intermission'?1:0;return rank(a)-rank(b)||b.players.size-a.players.size})[0];
 if(!r){r={code:code(),players:new Map(),votes:new Map(),host:null,phase:'lobby',phaseEnd:0,map:0,round:0,lastWinner:'',pickups:WEAPONS.map(w=>({...w,availableAt:0})),parts:[],blood:[],lastMonster:null,visibility:'public'};rooms.set(r.code,r);}
 join(client,r,msg.name,msg.color);}
function prepare(r){if(r.players.size<2||r.phase!=='lobby')return;r.phase='countdown';r.phaseEnd=Date.now()+COUNTDOWN_MS;cast(r,{type:'notice',text:'Vote for your next map! The pond is getting spooky...'});sync(r);}
function begin(r){const ps=players(r);if(ps.length<2){r.phase='lobby';r.phaseEnd=0;sync(r);return;}
 r.round++;r.map=winningMap(r);r.votes.clear();let pool=ps.filter(p=>p.id!==r.lastMonster);if(!pool.length)pool=ps;const monster=pool[crypto.randomInt(pool.length)];r.lastMonster=monster.id;r.phase='playing';r.phaseEnd=Date.now()+ROUND_MS;r.lastWinner='';r.pickups=WEAPONS.map(w=>({...w,availableAt:0}));r.parts=[];r.blood=[];
 let survivorIndex=0;ps.forEach((p,i)=>{const sp=WorldData.spawnFor(r.map,p.id===monster.id,p.id===monster.id?0:survivorIndex++);p.x=sp[0];p.y=0;p.z=sp[1];p.yaw=0;p.l=null;p.rr=null;p.monster=p.id===monster.id;p.alive=true;p.maxHp=p.monster?350:100;p.hp=p.maxHp;p.weapon='none';p.heldHand='right';p.heldPart=null;p.heldPartHand=null;p.spectating=false;p.lostArms=0;p.lastAtk=0;p.lastRoar=0;if(p.socket.profile){p.socket.profile.stats.rounds++;saveAccounts(p.socket.profileToken);}});cast(r,{type:'roundStart',monster:monster.id,map:r.map,text:monster.name+' is the MONSTER FROG!'});sync(r);}
function finish(r,winner,reason){if(r.phase!=='playing')return;r.phase='intermission';r.phaseEnd=Date.now()+INTERMISSION_MS;r.lastWinner=reason||winner+' win!';for(const [i,p] of players(r).entries()){const [x,z]=FrogyHub.spawn(i);p.x=x;p.y=0;p.z=z;p.l=null;p.rr=null;}for(const p of players(r))if((winner==='The monster'&&p.monster)||(winner==='The frogs'&&!p.monster&&p.alive)){p.wins++;if(p.socket.profile){p.socket.profile.stats.wins++;saveAccounts(p.socket.profileToken);}}
 // All frogs reappear in the social intermission hub, even if eliminated in the match.
 for(const p of players(r)){p.alive=true;p.spectating=false;p.monster=false;p.weapon='none';p.lostArms=0;p.l=null;p.rr=null;}
 cast(r,{type:'roundEnd',winner,text:r.lastWinner});sync(r);}
function winCheck(r){if(r.phase!=='playing')return;const ps=players(r);if(!ps.find(p=>p.monster&&p.alive)){finish(r,'The frogs','THE FROGS WIN! The monster was defeated!');return;}if(!ps.find(p=>!p.monster&&p.alive))finish(r,'The monster','THE MONSTER WINS! No frogs left!');}

// Shared detachable props are simulated by the room host and synchronized to every headset.
function bloodPatch(r,x,z,radius=0.5){if(!r.blood)r.blood=[];r.blood.push({id:crypto.randomBytes(4).toString('hex'),x:+x.toFixed(2),z:+z.toFixed(2),r:+radius.toFixed(2),seed:crypto.randomInt(10000)});if(r.blood.length>180)r.blood.splice(0,r.blood.length-180);}
function newPart(r,p,kind,side,dir=[0,0,-1]){r.parts??=[];const speed=3+crypto.randomInt(450)/100,vx=dir[0]*speed+(crypto.randomInt(300)-150)/100,vz=dir[2]*speed+(crypto.randomInt(300)-150)/100;
 const part={id:'part-'+crypto.randomBytes(6).toString('hex'),kind,owner:p.id,color:p.color,side:side||'',x:p.x+(side==='left'?-0.4:side==='right'?0.4:0),y:p.y+(kind==='head'?1.45:1.02),z:p.z,vx,vy:3.0+crypto.randomInt(280)/100,vz,spin:(crypto.randomInt(600)-300)/100,angle:0,heldBy:null,heldHand:null,expiresAt:Date.now()+180000};
 r.parts.push(part);if(r.parts.length>65)r.parts.splice(0,r.parts.length-65);return part;
}
function dropHeldPart(r,p,velocity){if(!p.heldPart)return false;const part=r.parts?.find(q=>q.id===p.heldPart);if(part){const v=Array.isArray(velocity)?velocity:[0,2,0];part.heldBy=null;part.heldHand=null;part.vx=safe(v[0],-11,11,0);part.vy=safe(v[1],-4,11,2);part.vz=safe(v[2],-11,11,0);part.expiresAt=Date.now()+180000;}
 p.heldPart=null;p.heldPartHand=null;return true;}
function stepParts(r,dt){for(const part of r.parts||[]){if(part.heldBy){const holder=r.players.get(part.heldBy),hand=part.heldHand==='left'?holder?.l:holder?.rr;
   if(!holder||!holder.alive||!hand){part.heldBy=null;part.heldHand=null;part.vy=1;continue;}
   part.x=hand[0];part.y=hand[1];part.z=hand[2];part.angle+=dt*1.1;continue;}
  part.vy-=9.2*dt;part.x+=part.vx*dt;part.y+=part.vy*dt;part.z+=part.vz*dt;part.angle+=part.spin*dt;
  if(part.y<.23){part.y=.23;part.vy=Math.abs(part.vy)*.33;part.vx*=Math.exp(-dt*3.2);part.vz*=Math.exp(-dt*3.2);part.spin*=Math.exp(-dt*.8);}
  const r2=Math.hypot(part.x,part.z);if(r2>WorldData.SIZE-2){part.x*=((WorldData.SIZE-2)/r2);part.z*=((WorldData.SIZE-2)/r2);part.vx*=-.3;part.vz*=-.3;}
 }}

function hit(r,target,damage,source,kind,dir){if(!target||!target.alive||target.spectating)return;target.hp=Math.max(0,target.hp-damage);bloodPatch(r,target.x+Math.random()*.5-.25,target.z+Math.random()*.5-.25,kind==='chomp'||kind==='rip'?1.05:.34);if(!target.hp){target.alive=false;dropHeldPart(r,target,[0,2,0]);if(target.weapon!=='none'){r.pickups.push({id:'fallen-'+crypto.randomBytes(5).toString('hex'),x:target.x,z:target.z,type:target.weapon,availableAt:Date.now()+500,expiresAt:Date.now()+65000});target.weapon='none';}newPart(r,target,'head',null,dir);newPart(r,target,'arm','left',dir);newPart(r,target,'arm','right',dir);for(let i=0;i<5;i++)bloodPatch(r,target.x+(Math.random()-.5)*2.4,target.z+(Math.random()-.5)*2.4,.3+Math.random()*.75);if(source){source.kills++;if(source.socket.profile){source.socket.profile.stats.kills++;saveAccounts(source.socket.profileToken);}}cast(r,{type:'pop',id:target.id,x:target.x,y:target.y,z:target.z,color:target.color,kind,monster:target.monster});cast(r,{type:'notice',text:target.name+' went SPLAT!'});}else cast(r,{type:'ouch',id:target.id,damage,x:target.x,y:target.y+1,z:target.z,kind,dir});winCheck(r);}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z,(a.y||0)-(b.y||0));}
function nearest(r,p,range,dir,cone=-1){let best=null,d=Infinity;for(const target of players(r)){if(p.id===target.id||!target.alive||target.spectating)continue;const dd=dist(p,target);if(dd>range||dd>=d)continue;const vx=(target.x-p.x)/Math.max(dd,.001),vz=(target.z-p.z)/Math.max(dd,.001);if(cone>-1&&vx*dir[0]+vz*dir[2]<cone)continue;best=target;d=dd;}return best;}
function attack(r,p,msg){if(r.phase!=='playing'||!p.alive||p.spectating)return;const now=Date.now(),k=String(msg.kind||''),raw=Array.isArray(msg.dir)?msg.dir:[0,0,-1];let dir=[safe(raw[0],-1,1),safe(raw[1],-1,1),safe(raw[2],-1,1,-1)];const len=Math.hypot(...dir)||1;dir=dir.map(v=>v/len);const fxz=Math.hypot(dir[0],dir[2])||1,flat=[dir[0]/fxz,0,dir[2]/fxz];
 if(k==='roar'){if(!p.monster||now-p.lastRoar<8000)return;p.lastRoar=now;cast(r,{type:'attackFx',id:p.id,kind:'roar',x:p.x,y:1.2+p.y,z:p.z,dir});for(const target of players(r))if(p.id!==target.id&&target.alive&&dist(p,target)<4.1)hit(r,target,18,p,'roar',dir);return;}
 const cooldown=k==='blaster'?390:k==='knife'?600:k==='punch'?530:k==='chomp'?1600:k==='rip'?1400:99999;if(now-p.lastAtk<cooldown)return;
 if(p.monster?!(k==='punch'||k==='chomp'||k==='rip'):(k!==p.weapon))return;p.lastAtk=now;cast(r,{type:'attackFx',id:p.id,kind:k,x:p.x,y:1.2+p.y,z:p.z,dir,origin:Array.isArray(msg.origin)?msg.origin:null,range:k==='blaster'?55:3});
 if(k==='blaster'){let best=null,bestT=55;const hand=Array.isArray(msg.origin)&&msg.origin.length===3?msg.origin:null;const safeHand=hand&&Math.hypot(hand[0]-p.x,hand[1]-(p.y+1.2),hand[2]-p.z)<2.45;const o=safeHand?hand.map((v,i)=>safe(v,-WorldData.SIZE,WorldData.SIZE)):[p.x,p.y+1.25,p.z];for(const target of players(r)){if(p.id===target.id||!target.alive||target.spectating)continue;const center=[target.x,target.y+(target.monster?1.45:1.08),target.z],to=center.map((v,i)=>v-o[i]);const t=to.reduce((s,v,i)=>s+v*dir[i],0);if(t<.15||t>55)continue;const miss=to.reduce((s,v)=>s+v*v,0)-t*t;const radius=target.monster?.86:.62;if(miss<=radius*radius&&t<bestT){bestT=t;best=target;}}if(best){const block=WorldData.maps[r.map].cover.some(o=>{const ox=o.x-p.x,oz=o.z-p.z,along=ox*flat[0]+oz*flat[2];if(along<.1||along>bestT-.4)return false;const closest=Math.hypot(ox-flat[0]*along,oz-flat[2]*along);return closest<o.r+.3&&p.y+1.25<o.h+.5;});if(!block)hit(r,best,best.monster?22:34,p,'blaster',dir);}
 }else if(k==='knife'){const t=nearest(r,p,1.85,flat,-.1);if(t)hit(r,t,52,p,'knife',dir);
 }else if(k==='punch'){const t=nearest(r,p,2.7,flat,-.35);if(t)hit(r,t,78,p,'punch',dir);
 }else if(k==='chomp'){const t=nearest(r,p,1.8,flat,-.4);if(t)hit(r,t,155,p,'chomp',dir);}
 else if(k==='rip'){const t=nearest(r,p,2.1,flat,-.35);if(t){
   // One tracked visual arm tears free per rip, stays absent until next round.
   const next=!(t.lostArms&1)?'left':!(t.lostArms&2)?'right':null;
   if(next){t.lostArms|=next==='left'?1:2;newPart(r,t,'arm',next,dir);for(let i=0;i<6;i++)bloodPatch(r,t.x+(Math.random()-.5)*2,t.z+(Math.random()-.5)*2,.2+Math.random()*.6);
    if(t.weapon!=='none'&&t.heldHand===next){r.pickups.push({id:'torn-'+crypto.randomBytes(5).toString('hex'),x:t.x,z:t.z,type:t.weapon,availableAt:Date.now()+800,expiresAt:Date.now()+55000});t.weapon='none';}
   }
   cast(r,{type:'gore',id:t.id,x:t.x,y:t.y+1.1,z:t.z,color:t.color,side:next,dir});
   hit(r,t,115,p,'rip',dir);
 }}
}
function onMessage(client,msg){if(!msg||typeof msg!=='object')return;
 if(msg.type==='hello'){setupProfile(client,msg);return;}
 if(msg.type==='create'){newRoom(client,msg);return;}
 if(msg.type==='public'){publicRoom(client,msg);return;}
 if(msg.type==='join'){const r=rooms.get(String(msg.code||'').toUpperCase().trim());if(!r){send(client,{type:'error',message:'Room not found. Check the five-character code.'});return;}join(client,r,msg.name,msg.color);return;}
 if(msg.type==='leave'){removeClient(client);send(client,{type:'left'});return;}
 if(msg.type==='sitOut'){const r=client.room,p=r?.players.get(client.id);if(r?.phase!=='playing'||!p)return;p.spectating=true;p.alive=false;dropHeldPart(r,p,[0,2,0]);if(p.weapon!=='none'){r.pickups.push({id:'left-'+crypto.randomBytes(4).toString('hex'),x:p.x,z:p.z,type:p.weapon,availableAt:Date.now()+800});p.weapon='none';}send(client,{type:'sitOutConfirmed',round:r.round});cast(r,{type:'notice',text:p.name+' returned to the waiting lobby'});winCheck(r);sync(r);return;}
 if(!client.profile)setupProfile(client,{});
 if(msg.type==='buy'){const item=SHOP_BY_ID.get(msg.item);const p=client.profile;const fail=(reason)=>{send(client,{type:'shopResult',ok:false,item:msg.item,message:reason});return;};if(!item)return fail('That item is not in the shop.');if(p.inventory.includes(item.id))return fail('You already own that cosmetic.');if(p.coins<item.price)return fail('You need '+(item.price-p.coins)+' more coins for '+item.name+'. Come back for the daily bonus!');p.coins-=item.price;p.inventory.push(item.id);p.equipped[item.slot]=item.id;saveAccounts(client.profileToken);profileMessage(client);send(client,{type:'shopResult',ok:true,item:item.id,message:'Purchased '+item.name+'! Equipped automatically.'});if(client.room){const frog=client.room.players.get(client.id);frog.equipped={...p.equipped};sync(client.room);}return;}
 if(msg.type==='equip'){const item=SHOP_BY_ID.get(msg.item);const slot=msg.slot||item?.slot;if(!['hat','face','back'].includes(slot))return;if(msg.item!=='none'&&(!item||item.slot!==slot||!client.profile.inventory.includes(item.id)))return;client.profile.equipped[slot]=msg.item;saveAccounts(client.profileToken);profileMessage(client);if(client.room){const frog=client.room.players.get(client.id);frog.equipped={...client.profile.equipped};sync(client.room);}return;}
 if(msg.type==='color'){if(!validColor(msg.color))return;client.profile.color=msg.color;saveAccounts(client.profileToken);profileMessage(client);if(client.room){client.room.players.get(client.id).color=msg.color;sync(client.room);}return;}
 const r=client.room;if(!r)return;const p=r.players.get(client.id);if(!p)return;
 if(msg.type==='vote'){if(r.phase==='playing')return;const n=Number(msg.index);if(!Number.isInteger(n)||n<0||n>2)return;r.votes.set(p.id,n);sync(r);return;}
 if(msg.type==='voice-ready'){client.voiceEnabled=msg.enabled===true;cast(r,{type:'voice-ready',from:client.id,enabled:client.voiceEnabled},client.id);send(client,{type:'voice-peers',ids:players(r).filter(v=>v.id!==client.id&&clients.get(v.id)?.voiceEnabled).map(v=>v.id)});return;}
 if(msg.type==='rtc'){const to=String(msg.to||''),dest=clients.get(to),data=msg.data;if(!client.voiceEnabled||!dest?.voiceEnabled||dest.room!==r||!data||typeof data!=='object'||JSON.stringify(data).length>15000)return;if(!['offer','answer','candidate'].includes(data.kind))return;send(dest,{type:'rtc',from:client.id,data});return;}
 if(msg.type==='start'){if(p.id===r.host&&r.phase==='lobby'&&r.players.size>=2)prepare(r);return;}
 if(msg.type==='grab'){
  if(r.phase!=='playing'||!p.alive||p.spectating)return;
  const side=msg.hand==='left'?'left':'right',at=side==='left'?p.l:p.rr;
  if(!at){send(client,{type:'grabResult',ok:false,reason:'Your hand must be tracked to grab.'});return;}
  const origin=[at[0],at[1],at[2]];
  if(Math.hypot(origin[0]-p.x,origin[2]-p.z)>2.9||Math.abs(origin[1]-(p.y+1))>2.2)return;
  const parts=(r.parts||[]).filter(q=>!q.heldBy).map(q=>({kind:'part',thing:q,d:Math.hypot(q.x-origin[0],q.y-origin[1],q.z-origin[2])}));
  const weapons=p.monster?[]:r.pickups.filter(w=>w.availableAt<=Date.now()).map(w=>({kind:'weapon',thing:w,d:Math.hypot(w.x-origin[0],.58-origin[1],w.z-origin[2])}));
  const closest=[...parts,...weapons].filter(q=>q.d<1.40).sort((a,b)=>a.d-b.d)[0];
  if(!closest){send(client,{type:'grabResult',ok:false,reason:'Move your hand close to a weapon or fallen frog part.'});return;}
  if(p.heldPart&&p.heldPartHand===side)dropHeldPart(r,p,[0,1.5,0]);
  if(closest.kind==='part'){
   if(p.heldPart)dropHeldPart(r,p,[0,1.5,0]);
   if(p.weapon!=='none'&&p.heldHand===side){r.pickups.push({id:'swap-'+crypto.randomBytes(5).toString('hex'),x:p.x,z:p.z,type:p.weapon,availableAt:Date.now()+700});p.weapon='none';}
   closest.thing.heldBy=p.id;closest.thing.heldHand=side;closest.thing.vx=closest.thing.vy=closest.thing.vz=0;p.heldPart=closest.thing.id;p.heldPartHand=side;
   cast(r,{type:'partGrabbed',id:closest.thing.id,by:p.id,hand:side});
  }else{
   if(p.heldPart&&p.heldPartHand===side)dropHeldPart(r,p,[0,1.5,0]);
   if(p.weapon!=='none')r.pickups.push({id:'swap-'+crypto.randomBytes(5).toString('hex'),x:p.x,z:p.z,type:p.weapon,availableAt:Date.now()+800,expiresAt:Date.now()+55000});
   p.weapon=closest.thing.type;p.heldHand=side;closest.thing.availableAt=Date.now()+15000;
   cast(r,{type:'pickupFx',id:p.id,weapon:p.weapon,x:closest.thing.x,z:closest.thing.z});
  }
  send(client,{type:'grabResult',ok:true,kind:closest.kind,hand:side,id:closest.thing.id});sync(r);return;
 }
 if(msg.type==='dropPart'){
  if(r.phase!=='playing'||!p.heldPart||p.heldPartHand!==(msg.hand==='left'?'left':'right'))return;
  const id=p.heldPart;if(dropHeldPart(r,p,msg.velocity))cast(r,{type:'partThrown',id,by:p.id});sync(r);return;
 }
 if(msg.type==='drop'){
  if(r.phase!=='playing'||p.weapon==='none'||p.heldHand!==(msg.hand==='left'?'left':'right'))return;
  const type=p.weapon;p.weapon='none';const at=p.heldHand==='left'?p.l:p.rr,radius=Math.min(2.0,Math.hypot((at?.[0]||p.x)-p.x,(at?.[2]||p.z)-p.z));
  r.pickups.push({id:'drop-'+crypto.randomBytes(5).toString('hex'),x:at?.[0]??p.x,z:at?.[2]??p.z,type,availableAt:Date.now()+500,expiresAt:Date.now()+55000});
  cast(r,{type:'dropFx',id:p.id,weapon:type,x:p.x,z:p.z});sync(r);return;
 }
 if(msg.type==='move'){if(r.phase==='playing'&&(p.spectating||!p.alive))return;
  let x=safe(msg.x,-WorldData.SIZE+1,WorldData.SIZE-1,p.x),y=safe(msg.y,0,8,p.y),z=safe(msg.z,-WorldData.SIZE+1,WorldData.SIZE-1,p.z);const dr=Math.hypot(x,z),max=WorldData.SIZE-1;if(dr>max){x=x/dr*max;z=z/dr*max;}
  if(r.phase!=='playing'){const q=FrogyHub.resolve(x,z);x=q.x;z=q.z;y=safe(y,0,5.5,p.y);}
  p.x=x;p.y=y;p.z=z;p.yaw=safe(msg.yaw,-Math.PI*100,Math.PI*100,p.yaw);p.mouth=safe(msg.mouth,0,1,0);
  // Controller positions are WORLD coordinates; never clamp X/Z to +/-14.
  // That used to erase hands for frogs spawned near the outer edges of the 130m maps.
  const hand=v=>{if(!Array.isArray(v)||v.length!==3||!v.every(q=>Number.isFinite(Number(q))))return null;
   const hx=safe(v[0],p.x-3.3,p.x+3.3,p.x),hy=safe(v[1],Math.max(0,p.y-.7),p.y+4.1,p.y+1),hz=safe(v[2],p.z-3.3,p.z+3.3,p.z);
   return [hx,hy,hz];};
  // A one-frame controller tracking drop should not make an avatar lose an arm.
  const hl=hand(msg.l),hr=hand(msg.r),clock=Date.now();
  if(hl){p.l=hl;p.lAt=clock;}else if(clock-(p.lAt||0)>1300)p.l=null;
  if(hr){p.rr=hr;p.rrAt=clock;}else if(clock-(p.rrAt||0)>1300)p.rr=null;
  // Weapons are collected with explicit grip/F interaction, not by walking past them.
  return;
 }
 if(msg.type==='attack')attack(r,p,msg);
}
let lastAdvance=Date.now();function advance(){const now=Date.now(),dt=Math.min(.30,(now-lastAdvance)/1000);lastAdvance=now;for(const r of rooms.values()){r.pickups=r.pickups.filter(w=>!w.expiresAt||now<w.expiresAt);r.parts=(r.parts||[]).filter(q=>q.expiresAt>now);if(r.phase==='playing')stepParts(r,dt);
 if(r.phase==='lobby'&&r.players.size>=2)prepare(r);
 if(r.phase==='countdown'&&now>=r.phaseEnd)begin(r);
 if(r.phase==='playing'&&now>=r.phaseEnd)finish(r,'The frogs','TIME UP! Surviving frogs win!');
 if(r.phase==='intermission'&&now>=r.phaseEnd){r.phase='lobby';r.phaseEnd=0;}
 sync(r);
}}
const timer=setInterval(advance,240);timer.unref?.();
const TYPE={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
 const url=new URL(req.url||'/','http://localhost'),p=url.pathname==='/'?'/index.html':url.pathname,fp=path.resolve(ROOT,'.'+p);if(!fp.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(fp,(err,data)=>{if(err){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}res.writeHead(200,{'Content-Type':TYPE[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});
});
server.on('upgrade',(req,socket)=>{if(req.url!=='/ws'||String(req.headers.upgrade||'').toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']){socket.destroy();return;}
 const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 const client={id:uid(),socket:null,room:null,profile:null,profileToken:null,voiceEnabled:false};clients.set(client.id,client);
 let buffer=Buffer.alloc(0);const conn={closed:false,send(str){if(socket.destroyed)return;const body=Buffer.from(str);let hdr;if(body.length<126)hdr=Buffer.from([129,body.length]);else if(body.length<65536){hdr=Buffer.alloc(4);hdr[0]=129;hdr[1]=126;hdr.writeUInt16BE(body.length,2);}else return;socket.write(Buffer.concat([hdr,body]));}};client.socket=conn;
 function gone(){if(conn.closed)return;conn.closed=true;removeClient(client);clients.delete(client.id);}
 socket.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);if(buffer.length>200000){socket.destroy();return;}
 while(buffer.length>=2){const op=buffer[0]&15,masked=!!(buffer[1]&128);let len=buffer[1]&127,head=2;if(len===126){if(buffer.length<4)return;len=buffer.readUInt16BE(2);head=4;}else if(len===127){socket.destroy();return;}if(!masked){socket.destroy();return;}if(buffer.length<head+4+len)return;
  const mask=buffer.subarray(head,head+4),data=buffer.subarray(head+4,head+4+len),dec=Buffer.alloc(len);for(let i=0;i<len;i++)dec[i]=data[i]^mask[i%4];buffer=buffer.subarray(head+4+len);
  if(op===8){socket.end();return;}if(op===9){socket.write(Buffer.from([138,0]));continue;}if(op!==1)continue;try{onMessage(client,JSON.parse(dec.toString('utf8')));}catch(e){send(conn,{type:'error',message:'Invalid message'});}
 }
 });socket.on('error',gone);socket.on('close',gone);socket.on('end',gone);
});
if(require.main===module)initDatabase().then(()=>server.listen(PORT,'0.0.0.0',()=>console.log(`🐸 Frogy server on http://localhost:${PORT}`))).catch(e=>{console.error('Database initialization failed. Refusing to launch with unsafe partial persistence:',e);process.exit(1);});
module.exports={server,SHOP,MAPS,rooms,accounts,initDatabase};
