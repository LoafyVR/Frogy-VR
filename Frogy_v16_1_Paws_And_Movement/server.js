'use strict';
// Frogy: dependency-free private-room WebSocket game with persistent per-browser cosmetics.
const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const PORT=Number(process.env.PORT||3000),ROOT=path.join(__dirname,'public');
const ROUND_MS=Number(process.env.ROUND_MS||120000),COUNTDOWN_MS=Number(process.env.COUNTDOWN_MS||20000),INTERMISSION_MS=Number(process.env.INTERMISSION_MS||32000);
const WorldData=require('./public/world.js'),FrogyHub=require('./public/hub.js'),FrogyCollision=require('./public/collision.js');
const Economy=require('./economy.js');
const Promo=require('./codes.js');
const {easternDay,nextEasternMidnight,normalizeProfile,refreshDaily,awardQuestEvent,TOOLS,TOOL_IDS,DAILY_CRICKETS}=Economy;
const MAPS=WorldData.maps.map(m=>m.name);
const PALETTE=['mint','pink','lilac','blue','peach','lime'];
const SPAWNS=WorldData.spawns,WEAPONS=WorldData.weapons;
// Server-only combat balance, never sent as a health bar.
const SURVIVOR_HP=175,MONSTER_HP=520,ARM_BLEED_MS=45000;
function cleanFrogName(value){const raw=String(value??'').normalize('NFKC').replace(/[<>\x00-\x1f]/g,'').replace(/[^\p{L}\p{N} _'-]/gu,'').replace(/\s+/g,' ').trim().slice(0,18);return /^(owner|admin|moderator|mod)$/i.test(raw)?'':raw;}
function validColor(v){return PALETTE.includes(v)||/^rgb-[0-9]{3}$/.test(v);}
// Cosmetic Crickets prices are 10x the v6.4 prices. Previous purchases stay owned.
const SHOP=[
 {id:'mushroom',slot:'hat',name:'Mushroom Cap',emoji:'🍄',price:600},
 {id:'crown',slot:'hat',name:'Pond Royalty',emoji:'👑',price:1200},
 {id:'party',slot:'hat',name:'Party Hat',emoji:'🥳',price:750},
 {id:'wizard',slot:'hat',name:'Bog Wizard',emoji:'🧙',price:1450},
 {id:'bow',slot:'hat',name:'Big Pink Bow',emoji:'🎀',price:650},
 {id:'glasses',slot:'face',name:'Dorky Glasses',emoji:'🤓',price:700},
 {id:'starshades',slot:'face',name:'Star Shades',emoji:'😎',price:1100},
 {id:'mustache',slot:'face',name:'Tiny Mustache',emoji:'🥸',price:450},
 {id:'wings',slot:'back',name:'Fairy Wings',emoji:'🦋',price:1600},
 {id:'cape',slot:'back',name:'Hero Cape',emoji:'🦸',price:1150},
 {id:'backpack',slot:'back',name:'Snack Pack',emoji:'🎒',price:850}
];
const SHOP_BY_ID=new Map(SHOP.map(i=>[i.id,i]));
const DATA_DIR=process.env.FROGY_DATA_DIR||path.join(__dirname,'data'),ACCOUNTS_FILE=path.join(DATA_DIR,'profiles.json');
let accounts={};try{accounts=JSON.parse(fs.readFileSync(ACCOUNTS_FILE,'utf8'));if(!accounts||Array.isArray(accounts)||typeof accounts!=='object')accounts={};}catch{}
let db=null,dbQueue=Promise.resolve();
const saveMode=()=>db?'postgres':process.env.FROGY_DATA_DIR?'configured-disk':'ephemeral';
function saveAccounts(token){
 // Postgres is the durable source of truth when DATABASE_URL is configured.
 // Keep a local snapshot too for emergency manual migrations, but never require
 // the ephemeral local filesystem when the database is healthy.
 try{fs.mkdirSync(DATA_DIR,{recursive:true});const tmp=ACCOUNTS_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(accounts));fs.renameSync(tmp,ACCOUNTS_FILE);}
 catch(e){if(!db)throw e;console.error('Local profile snapshot failed; DB still enabled:',e.message);}
 if(db){const entries=token?[[token,accounts[token]]]:Object.entries(accounts);
  for(const [id,account] of entries){if(!account)continue;const payload=JSON.stringify(account);
   dbQueue=dbQueue.then(()=>db.query('INSERT INTO frogy_profiles(token, profile) VALUES($1,$2::jsonb) ON CONFLICT(token) DO UPDATE SET profile=EXCLUDED.profile',[id,payload])).catch(e=>console.error('CRITICAL Frogy database write failed:',e.message));}}
}
async function initDatabase(){
 if(!process.env.DATABASE_URL){console.warn('WARNING: profiles saved to '+DATA_DIR+'. Render default filesystem is EPHEMERAL. Configure DATABASE_URL (recommended) or a truly mounted persistent disk before inviting players.');return;}
 const {Pool}=require('pg');db=new Pool({connectionString:process.env.DATABASE_URL,ssl:/(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL)?false:{rejectUnauthorized:false}});
 await db.query('CREATE TABLE IF NOT EXISTS frogy_profiles (token varchar(48) PRIMARY KEY, profile jsonb NOT NULL)');
 await db.query('CREATE TABLE IF NOT EXISTS frogy_reports (id bigserial PRIMARY KEY, record jsonb NOT NULL)');
 // Preserve players from an existing profiles.json when first enabling Postgres.
 // Database records win on conflicts to avoid overwriting more recent purchases.
 const result=await db.query('SELECT token,profile FROM frogy_profiles');
 const found=new Set(result.rows.map(r=>r.token));let migrated=0;
 for(const [token,profile] of Object.entries(accounts)){
  if(!/^[a-f0-9]{48}$/.test(token)||found.has(token))continue;
  await db.query('INSERT INTO frogy_profiles(token,profile) VALUES($1,$2::jsonb) ON CONFLICT(token) DO NOTHING',[token,JSON.stringify(normalizeProfile(profile,token))]);migrated++;
 }
 for(const row of result.rows)accounts[row.token]=normalizeProfile(row.profile,row.token);
 console.log('Persistent Postgres ready:',result.rows.length,'existing accounts;',migrated,'legacy local profiles migrated');
}

// Recovery keys are separate from browser session tokens, not usernames.
// Only hashes are stored with profiles. 80 bits of cryptographic randomness;
// an attacker cannot feasibly guess another player's account-recovery secret.
const RECOVERY_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeRecoveryCode(){const chars=Array.from({length:16},()=>RECOVERY_ALPHABET[crypto.randomInt(RECOVERY_ALPHABET.length)]).join('');return 'FROG-'+chars.match(/.{4}/g).join('-');}
function normalizeRecoveryCode(value){return String(value||'').trim().toUpperCase().replace(/[\s-]/g,'');}
function hashRecoveryCode(value){return crypto.createHash('sha256').update('FROGY-RECOVERY-V1:'+normalizeRecoveryCode(value)).digest('hex');}
function rotateRecoveryCode(client){
 const code=makeRecoveryCode();client.profile.recoveryHash=hashRecoveryCode(code);saveAccounts(client.profileToken);
 send(client,{type:'recoveryCodeResult',ok:true,code,message:'Save this code somewhere private. Creating another code replaces the old one.'});profileMessage(client);
}
const rooms=new Map(),clients=new Map();let nextId=1;
function safe(v,min,max,d=0){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):d;}
function uid(){return String(nextId++);}
function code(){let s;do{s=Array.from({length:5},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');}while(rooms.has(s));return s;}
const send=(c,obj)=>{const socket=c?.socket||c;if(socket&&!socket.closed)try{socket.send(JSON.stringify(obj));}catch(e){console.error('WebSocket send:',e.message);}};
const players=r=>[...r.players.values()];
function cast(r,obj,except=null){for(const p of players(r))if(p.id!==except)send(p.socket,obj);}
function profileMessage(client,bonus=0){
 const p=client.profile;if(!p)return;
 send(client,{type:'profile',token:client.profileToken,publicId:p.publicId,name:p.name,
  coins:p.crickets,crickets:p.crickets,dabloons:p.dabloons,inventory:p.inventory,
  equipped:p.equipped,color:p.color,stats:p.stats,bonus,nextRewardAt:nextEasternMidnight(),
  dailyDay:p.quests.day,quests:p.quests.entries,tools:p.tools,friends:p.friends,
  friendRequests:p.friendRequests,ownerTag:!!p.ownerTag,modTag:!!p.modTag,canModerate:Promo.canModerate(p),redeemedCodes:p.redeemedCodes||[],saveMode:saveMode(),recoveryReady:!!p.recoveryHash,shop:SHOP,toolCatalog:TOOLS});
}
const idToToken=()=>new Map(Object.entries(accounts).filter(([,p])=>p?.publicId).map(([t,p])=>[p.publicId,t]));
function accountByPublicId(id){const token=idToToken().get(id);return token?{token,profile:accounts[token]}:null;}
function onlineClientByPublicId(id){return [...clients.values()].find(c=>c.profile?.publicId===id);}
function onlineFriendList(client){const p=client.profile;return (p?.friends||[]).map(id=>{const target=onlineClientByPublicId(id);return {id,name:target?.profile?.name||accountByPublicId(id)?.profile?.name||'Frog',online:!!target,roomCode:target?.room?.code||'',playing:target?.room?.phase==='playing'};});}
function socialMessage(client){if(!client?.profile)return;
 const incoming=Object.values(accounts).filter(p=>p?.publicId!==client.profile.publicId&&p?.friendRequests?.includes(client.profile.publicId))
  .map(p=>({id:p.publicId,name:p.name||'Frog'}));
 send(client,{type:'social',friends:onlineFriendList(client),incoming,outgoing:client.profile.friendRequests,publicId:client.profile.publicId});
}
function notifyFriends(){for(const c of clients.values())if(c.profile)socialMessage(c);}
function questEvent(client,event,amount=1){if(!client?.profile)return;
 const bonus=awardQuestEvent(client.profile,event,amount);
 if(bonus.earned){saveAccounts(client.profileToken);profileMessage(client);send(client,{type:'questReward',reward:bonus.earned,completed:bonus.completed});}
 else if(client.profile.quests?.entries.some(q=>q.event===event)){saveAccounts(client.profileToken);profileMessage(client);}
}
function setupProfile(client,m){
 let token=String(m.token||''),isNew=false;
 if(!/^[a-f0-9]{48}$/.test(token)||!accounts[token]){
  token=crypto.randomBytes(24).toString('hex');accounts[token]={crickets:500,coins:500,dabloons:1000,
   inventory:[],equipped:{hat:'none',face:'none',back:'none'},color:'mint',name:'Lil Frog',stats:{wins:0,kills:0,rounds:0},lastCricketDay:easternDay()};isNew=true;
 }
 const p=normalizeProfile(accounts[token],token);if(!Number.isFinite(p.crickets))p.crickets=0;
 const bonus=refreshDaily(p,token);p.coins=p.crickets;
 client.profileToken=token;client.profile=p;saveAccounts(token);profileMessage(client,isNew?500:bonus);
 socialMessage(client);notifyFriends();
}

function publicPlayer(p){return {isNpc:!!p.isNpc,id:p.id,publicId:p.socket?.profile?.publicId||'',name:p.name,mouth:p.mouth,color:p.color,equipped:p.equipped,ownerTag:!!p.socket?.profile?.ownerTag,modTag:!!p.socket?.profile?.modTag,x:p.x,y:p.y,z:p.z,yaw:p.yaw,l:p.l,rr:p.rr,lYaw:p.lYaw??p.yaw,rYaw:p.rYaw??p.yaw,lBasis:p.lBasis||null,rBasis:p.rBasis||null,tongue:p.tongue||null,alive:p.alive,monster:p.monster,spectating:!!p.spectating,weapon:p.weapon,heldHand:p.heldHand||'right',heldPart:p.heldPart||null,heldPartHand:p.heldPartHand||null,lostArms:p.lostArms||0,bleeding:!!(p.bleedUntil&&p.alive),kills:p.kills,wins:p.wins,activeTools:p.activeTools||{},disguised:!!p.disguised};}
function humanCount(r){return players(r).filter(p=>!p.isNpc).length;}
function voteCounts(r){const a=[0,0,0];for(const [id,n] of r.votes)if(r.players.has(id))a[n]++;return a;}
function winningMap(r){const counts=voteCounts(r),max=Math.max(...counts);if(!max)return r.round===0?r.map:(r.map+1)%3;const tops=counts.map((c,i)=>c===max?i:-1).filter(i=>i>=0);return tops.length===1?tops[0]:tops.find(i=>i!==r.map)??tops[0];}
function state(r,viewerId=null){return {type:'state',visibility:r.visibility||'private',npcPractice:!!r.npcPractice,online:clients.size,publicRooms:[...rooms.values()].filter(x=>x.visibility==='public').length,code:r.code,phase:r.phase,seconds:r.phaseEnd?Math.max(0,Math.ceil((r.phaseEnd-Date.now())/1000)):0,map:r.map,selectedMap:winningMap(r),votes:voteCounts(r),round:r.round,host:r.host,lastWinner:r.lastWinner,players:players(r).map(p=>{const v=publicPlayer(p);if(p.disguised&&p.id!==viewerId){v.monster=false;v.disguised=false;v.activeTools={};}if(p.id!==viewerId)v.activeTools={};else v.bleedSeconds=p.bleedUntil?Math.max(0,Math.ceil((p.bleedUntil-Date.now())/1000)):0;return v;}),pickups:r.pickups.map(w=>({...w,available:w.availableAt<=Date.now()})),parts:r.parts||[],blood:r.blood||[]};}
function sync(r){for(const p of players(r))send(p.socket,state(r,p.id));}
function removeClient(client){const r=client.room;if(!r)return;const p=r.players.get(client.id);if(!p)return;r.players.delete(client.id);r.votes.delete(client.id);client.room=null;client.voiceEnabled=false;notifyFriends();cast(r,{type:'peer-left',from:client.id});cast(r,{type:'notice',text:p.name+' hopped away'});if(!humanCount(r)){rooms.delete(r.code);return;}if(r.host===client.id)r.host=players(r)[0].id;if(r.phase==='playing'&&p.monster)finish(r,'The frogs','The monster hopped away!');else if(r.phase==='playing')winCheck(r);if(r.phase==='countdown'&&r.players.size<2){r.phase='lobby';r.phaseEnd=0;}sync(r);}
function join(client,r,name,color){
 const kickedUntil=r.kickedUntil?.get(client.profile?.publicId);
 if(kickedUntil&&kickedUntil>Date.now()){send(client,{type:'error',message:'A moderator removed you from this lobby. Try another room.'});return;}
 if(r.players.size>=8){send(client,{type:'error',message:'That lily pad is full (8 frogs max).'});return;}
 if(!r.players.has(client.id)&&players(r).some(q=>q.isNpc))evictNpcOnFriendJoin(r);
 if(client.room)removeClient(client);if(!client.profile)setupProfile(client,{});
 const p={id:client.id,socket:client,name:cleanFrogName(name||client.profile.name)||'Lil Frog',color:validColor(color)?color:client.profile.color,equipped:{...client.profile.equipped},x:FrogyHub.spawn(r.players.size)[0],y:0,z:FrogyHub.spawn(r.players.size)[1],yaw:0,l:null,rr:null,lYaw:0,rYaw:0,mouth:0,hp:r.phase==='playing'?0:100,maxHp:100,alive:r.phase!=='playing',monster:false,weapon:'none',heldPart:null,heldPartHand:null,spectating:r.phase==='playing',lostArms:0,bleedUntil:0,kills:0,wins:0,lastAtk:0,lastRoar:0,activeTools:{},usedTools:{},disguised:false};
 client.profile.color=p.color;client.profile.name=p.name;saveAccounts(client.profileToken);r.players.set(p.id,p);client.room=r;client.voiceEnabled=false;notifyFriends();if(!r.host)r.host=p.id;send(client,{type:'joined',id:p.id,code:r.code,visibility:r.visibility||'private'});cast(r,{type:'notice',text:p.name+' joined the pond!'});sync(r);}
// Practice frogs only exist on a one-human PRIVATE room. Never treat them as real clients.
function idleNpc(room){
 const id='npc-'+room.code;
 const peer={id,profile:null,room,socket:{closed:false,send(){}}};
 const point=FrogyHub.spawn(1);
 const npc={id,socket:peer,isNpc:true,name:'Practice Tadpole',color:'lime',equipped:{hat:'none',face:'none',back:'none'},
  x:point[0],y:0,z:point[1],yaw:0,l:null,rr:null,lYaw:0,rYaw:0,mouth:0,
  hp:100,maxHp:100,alive:true,monster:false,weapon:'none',heldPart:null,heldPartHand:null,
  spectating:false,lostArms:0,bleedUntil:0,kills:0,wins:0,lastAtk:0,lastRoar:0,activeTools:{},usedTools:{},disguised:false};
 return npc;
}
function spawnPracticeNpc(client){
 const r=client.room;
 if(!r||r.visibility!=='private')return {ok:false,message:'NPC only works in your private room. Create one in ROOM PC.'};
 if(humanCount(r)!==1)return {ok:false,message:'NPC practice requires you to be alone in a private room.'};
 if(players(r).some(p=>p.isNpc))return {ok:true,message:'Practice Tadpole is already here. The solo match is running or starting.'};
 if(r.phase==='playing')return {ok:false,message:'Wait until this round is finished.'};
 const npc=idleNpc(r);r.players.set(npc.id,npc);r.npcPractice=true;
 cast(r,{type:'notice',text:'An idle Practice Tadpole appeared! Play a solo test match.'});
 sync(r);return {ok:true,message:'Practice Tadpole spawned! A private testing round will start soon. No quest farming.'};
}
function evictNpcOnFriendJoin(r){
 const npc=players(r).find(p=>p.isNpc);if(!npc)return;
 if(r.phase==='playing')finish(r,'The frogs','Practice ended: a real frog joined.');
 r.players.delete(npc.id);r.npcPractice=false;
 if(r.phase==='countdown'){r.phase='lobby';r.phaseEnd=0;}
}
function newRoom(client,msg){const c=code(),r={code:c,players:new Map(),votes:new Map(),host:null,phase:'lobby',phaseEnd:0,map:0,round:0,lastWinner:'',pickups:WEAPONS.map(w=>({...w,availableAt:0})),parts:[],blood:[],lastMonster:null,visibility:'private'};rooms.set(c,r);join(client,r,msg.name,msg.color);}
function publicRoom(client,msg,hop=false){
 const previous=client.room;
 // Fullest available lobby wins. Hopping expressly excludes your current room.
 // One-player lobbies receive the next arrival instead of spawning duplicates.
 let r=[...rooms.values()].filter(x=>x.visibility==='public'&&x.players.size<8&&(!x.kickedUntil?.get(client.profile?.publicId)||x.kickedUntil.get(client.profile.publicId)<Date.now())&&(!hop||x!==previous)).sort((a,b)=>{
  const rank=x=>x.phase==='playing'?2:x.phase==='intermission'?1:0;
  return rank(a)-rank(b)||b.players.size-a.players.size;
 })[0];
 if(!hop&&previous&&previous===r)return;
 if(client.room)removeClient(client);
 if(!r){r={code:code(),players:new Map(),votes:new Map(),host:null,phase:'lobby',phaseEnd:0,map:0,round:0,lastWinner:'',pickups:WEAPONS.map(w=>({...w,availableAt:0})),parts:[],blood:[],lastMonster:null,visibility:'public'};rooms.set(r.code,r);}
 join(client,r,msg.name,msg.color);}
function prepare(r){if(r.players.size<2||r.phase!=='lobby')return;r.phase='countdown';r.phaseEnd=Date.now()+COUNTDOWN_MS;cast(r,{type:'notice',text:'Vote for your next map! The pond is getting spooky...'});sync(r);}
function begin(r){const ps=players(r);if(ps.length<2){r.phase='lobby';r.phaseEnd=0;sync(r);return;}
 r.round++;r.map=winningMap(r);r.votes.clear();let pool=ps.filter(p=>p.id!==r.lastMonster);if(!pool.length)pool=ps;const monster=r.npcPractice?ps.find(q=>!!q.isNpc===(r.round%2===0))||ps[0]:pool[crypto.randomInt(pool.length)];r.lastMonster=monster.id;r.phase='playing';r.phaseEnd=Date.now()+ROUND_MS;r.lastWinner='';r.pickups=WEAPONS.map(w=>({...w,availableAt:0}));r.parts=[];r.blood=[];
 let survivorIndex=0;ps.forEach((p,i)=>{const sp=WorldData.spawnFor(r.map,p.id===monster.id,p.id===monster.id?0:survivorIndex++);p.x=sp[0];p.y=0;p.z=sp[1];p.yaw=0;p.l=null;p.rr=null;p.lBasis=null;p.rBasis=null;p.tongue=null;p.monster=p.id===monster.id;p.alive=true;p.maxHp=p.monster?MONSTER_HP:SURVIVOR_HP;p.hp=p.maxHp;p.weapon='none';p.heldHand='right';p.heldPart=null;p.heldPartHand=null;p.spectating=false;p.lostArms=0;p.bleedUntil=0;p.lastAtk=0;p.lastRoar=0;p.activeTools={};p.usedTools={};p.disguised=false;if(p.socket.profile&&!r.npcPractice){p.socket.profile.stats.rounds++;saveAccounts(p.socket.profileToken);profileMessage(p.socket);}});cast(r,{type:'roundStart',monster:monster.id,map:r.map,text:monster.name+' is the MONSTER FROG!'});sync(r);}
function finish(r,winner,reason){if(r.phase!=='playing')return;
 // Capture the actual winners BEFORE resetting monster roles for intermission.
 const winners=players(r).filter(p=>winner==='The monster'?p.monster:p.alive&&!p.monster).map(p=>({id:p.id,name:p.name}));
 const winningTeam=winner==='The monster'?'MONSTER':'SURVIVORS';
 if(!r.npcPractice)for(const p of players(r)){questEvent(p.socket,'roundFinished');questEvent(p.socket,p.monster?'monsterRound':'survivorRound');if((winner==='The monster'&&p.monster)||(winner==='The frogs'&&!p.monster&&p.alive))questEvent(p.socket,'winRound');}
 r.phase='intermission';r.phaseEnd=Date.now()+INTERMISSION_MS;r.lastWinner=reason||winner+' win!';for(const [i,p] of players(r).entries()){const [x,z]=FrogyHub.spawn(i);p.x=x;p.y=0;p.z=z;p.l=null;p.rr=null;p.tongue=null;}for(const p of players(r))if((winner==='The monster'&&p.monster)||(winner==='The frogs'&&!p.monster&&p.alive)){p.wins++;if(p.socket.profile&&!r.npcPractice){p.socket.profile.stats.wins++;saveAccounts(p.socket.profileToken);profileMessage(p.socket);}}
 // All frogs reappear in the social intermission hub, even if eliminated in the match.
 for(const p of players(r)){p.alive=true;p.spectating=false;p.monster=false;p.weapon='none';p.lostArms=0;p.bleedUntil=0;p.l=null;p.rr=null;p.tongue=null;p.activeTools={};p.disguised=false;}
 cast(r,{type:'roundEnd',winner,text:r.lastWinner,winningTeam,winners});sync(r);}
function winCheck(r){if(r.phase!=='playing')return;const ps=players(r);if(!ps.find(p=>p.monster&&p.alive)){finish(r,'The frogs','THE FROGS WIN! The monster was defeated!');return;}if(!ps.find(p=>!p.monster&&p.alive))finish(r,'The monster','THE MONSTER WINS! No frogs left!');}

// Shared detachable props are simulated by the room host and synchronized to every headset.
function bloodPatch(r,x,z,radius=0.5){if(!r.blood)r.blood=[];r.blood.push({id:crypto.randomBytes(4).toString('hex'),x:+x.toFixed(2),z:+z.toFixed(2),r:+radius.toFixed(2),seed:crypto.randomInt(10000)});if(r.blood.length>180)r.blood.splice(0,r.blood.length-180);}
function newPart(r,p,kind,side,dir=[0,0,-1]){
 r.parts??=[];
 const isArm=kind==='arm',sign=side==='left'?-1:side==='right'?1:0,scale=p.monster?1.93:1;
 // Spawn at the actual shoulder rather than the feet or the body centre.
 // Throw out to the side, then gravity takes over immediately. This is a
 // networked 3D prop with bouncing/rolling physics, not just a blood effect.
 const yaw=p.yaw||0,offX=Math.cos(yaw)*sign*.45*scale,offZ=Math.sin(yaw)*sign*.45*scale;
 const force=isArm?1.2:3.5;
 const vx=offX*(isArm?2.8:1)+dir[0]*force+(crypto.randomInt(120)-60)/100;
 const vz=offZ*(isArm?2.8:1)+dir[2]*force+(crypto.randomInt(120)-60)/100;
 const part={id:'part-'+crypto.randomBytes(6).toString('hex'),kind,owner:p.id,color:p.color,side:side||'',
  x:p.x+offX,y:p.y+(isArm?1.08:1.63)*scale,z:p.z+offZ,
  vx,vy:isArm?-.4:.65,vz,spin:(crypto.randomInt(1000)-500)/100,
  angle:0,heldBy:null,heldHand:null,expiresAt:Date.now()+180000};
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

function hit(r,target,damage,source,kind,dir){if(!target||!target.alive||target.spectating)return;target.hp=Math.max(0,target.hp-damage);bloodPatch(r,target.x+Math.random()*.5-.25,target.z+Math.random()*.5-.25,kind==='chomp'||kind==='rip'?1.05:.34);if(!target.hp){target.alive=false;target.bleedUntil=0;dropHeldPart(r,target,[0,2,0]);if(target.weapon!=='none'){r.pickups.push({id:'fallen-'+crypto.randomBytes(5).toString('hex'),x:target.x,z:target.z,type:target.weapon,availableAt:Date.now()+500,expiresAt:Date.now()+65000});target.weapon='none';}newPart(r,target,'head',null,dir);if(!(target.lostArms&1))newPart(r,target,'arm','left',dir);if(!(target.lostArms&2))newPart(r,target,'arm','right',dir);for(let i=0;i<5;i++)bloodPatch(r,target.x+(Math.random()-.5)*2.4,target.z+(Math.random()-.5)*2.4,.3+Math.random()*.75);if(source){if(target.monster&&!source.monster&&!r.npcPractice)questEvent(source.socket,'hitMonster');source.kills++;if(source.socket.profile&&!r.npcPractice){source.socket.profile.stats.kills++;saveAccounts(source.socket.profileToken);profileMessage(source.socket);}}cast(r,{type:'pop',id:target.id,x:target.x,y:target.y,z:target.z,color:target.color,kind,monster:target.monster});cast(r,{type:'notice',text:target.name+' went SPLAT!'});}else{if(target.monster&&source&&!source.monster&&!r.npcPractice)questEvent(source.socket,'hitMonster');cast(r,{type:'ouch',id:target.id,damage,x:target.x,y:target.y+1,z:target.z,kind,dir});}winCheck(r);}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z,(a.y||0)-(b.y||0));}
function nearest(r,p,range,dir,cone=-1){let best=null,d=Infinity;for(const target of players(r)){if(p.id===target.id||!target.alive||target.spectating)continue;const dd=dist(p,target);if(dd>range||dd>=d)continue;const vx=(target.x-p.x)/Math.max(dd,.001),vz=(target.z-p.z)/Math.max(dd,.001);if(cone>-1&&vx*dir[0]+vz*dir[2]<cone)continue;best=target;d=dd;}return best;}
function attack(r,p,msg){if(r.phase!=='playing'||!p.alive||p.spectating)return;const now=Date.now(),k=String(msg.kind||''),raw=Array.isArray(msg.dir)?msg.dir:[0,0,-1];let dir=[safe(raw[0],-1,1),safe(raw[1],-1,1),safe(raw[2],-1,1,-1)];const len=Math.hypot(...dir)||1;dir=dir.map(v=>v/len);const fxz=Math.hypot(dir[0],dir[2])||1,flat=[dir[0]/fxz,0,dir[2]/fxz];
 if(k==='roar'){if(!p.monster||now-p.lastRoar<8000)return;p.lastRoar=now;cast(r,{type:'attackFx',id:p.id,kind:'roar',x:p.x,y:1.2+p.y,z:p.z,dir});for(const target of players(r))if(p.id!==target.id&&target.alive&&dist(p,target)<4.1)hit(r,target,18,p,'roar',dir);return;}
 const cooldown=k==='blaster'?390:k==='knife'?600:k==='punch'?530:k==='chomp'?1600:k==='rip'?1400:99999;if(now-p.lastAtk<cooldown)return;
 if(p.monster&&p.disguised){p.disguised=false;cast(r,{type:'disguiseEnded',id:p.id});}
 if(p.monster?!(k==='punch'||k==='chomp'||k==='rip'):(k!==p.weapon))return;p.lastAtk=now;cast(r,{type:'attackFx',id:p.id,kind:k,x:p.x,y:1.2+p.y,z:p.z,dir,origin:Array.isArray(msg.origin)?msg.origin:null,range:k==='blaster'?55:3});
 if(k==='blaster'){let best=null,bestT=55;const hand=Array.isArray(msg.origin)&&msg.origin.length===3?msg.origin:null;const safeHand=hand&&Math.hypot(hand[0]-p.x,hand[1]-(p.y+1.2),hand[2]-p.z)<2.45;const o=safeHand?hand.map((v,i)=>safe(v,-WorldData.SIZE,WorldData.SIZE)):[p.x,p.y+1.25,p.z];for(const target of players(r)){if(p.id===target.id||!target.alive||target.spectating)continue;const center=[target.x,target.y+(target.monster?1.45:1.08),target.z],to=center.map((v,i)=>v-o[i]);const t=to.reduce((s,v,i)=>s+v*dir[i],0);if(t<.15||t>55)continue;const miss=to.reduce((s,v)=>s+v*v,0)-t*t;const radius=target.monster?1.12:.68;if(miss<=radius*radius&&t<bestT){bestT=t;best=target;}}if(best){const block=WorldData.maps[r.map].cover.some(o=>{const ox=o.x-p.x,oz=o.z-p.z,along=ox*flat[0]+oz*flat[2];if(along<.1||along>bestT-.4)return false;const closest=Math.hypot(ox-flat[0]*along,oz-flat[2]*along);return closest<o.r+.3&&p.y+1.25<o.h+.5;});if(!block){hit(r,best,best.monster?65:45,p,'blaster',dir);send(p.socket,{type:'hitConfirm',target:best.id,monster:!!best.monster,damage:best.monster?65:45});}}
 }else if(k==='knife'){const t=nearest(r,p,1.85,flat,-.1);if(t){hit(r,t,t.monster?85:58,p,'knife',dir);send(p.socket,{type:'hitConfirm',target:t.id,monster:!!t.monster,damage:t.monster?85:58});};
 }else if(k==='punch'){const t=nearest(r,p,2.7,flat,-.35);if(t)hit(r,t,95,p,'punch',dir);
 }else if(k==='chomp'){const t=nearest(r,p,1.8,flat,-.4);if(t)hit(r,t,170,p,'chomp',dir);}
 else if(k==='rip'){const t=nearest(r,p,2.1,flat,-.35);if(t){
   // One tracked visual arm tears free per rip, stays absent until next round.
   const next=!(t.lostArms&1)?'left':!(t.lostArms&2)?'right':null;
   if(next){t.lostArms|=next==='left'?1:2;if(!t.monster&&!t.bleedUntil)t.bleedUntil=now+ARM_BLEED_MS;t.nextBleedPatchAt=now+650;newPart(r,t,'arm',next,dir);for(let i=0;i<6;i++)bloodPatch(r,t.x+(Math.random()-.5)*2,t.z+(Math.random()-.5)*2,.2+Math.random()*.6);
    if(t.weapon!=='none'&&t.heldHand===next){r.pickups.push({id:'torn-'+crypto.randomBytes(5).toString('hex'),x:t.x,z:t.z,type:t.weapon,availableAt:Date.now()+800,expiresAt:Date.now()+55000});t.weapon='none';}
   }
   cast(r,{type:'gore',id:t.id,x:t.x,y:t.y+1.1,z:t.z,color:t.color,side:next,dir,yaw:t.yaw||0,monster:!!t.monster});
   hit(r,t,105,p,'rip',dir);
 }}
}
function voiceIceServers(){
 const out=[{urls:'stun:stun.l.google.com:19302'}];
 // Browser WebRTC peers need TURN on some carrier/NAT networks. Use short-lived
 // TURN credentials supplied by your relay provider, never a database password.
 const url=process.env.FROGY_TURN_URL;
 if(url&&/^turns?:/.test(url)&&process.env.FROGY_TURN_USERNAME&&process.env.FROGY_TURN_CREDENTIAL)
  out.push({urls:url.slice(0,350),username:process.env.FROGY_TURN_USERNAME.slice(0,180),credential:process.env.FROGY_TURN_CREDENTIAL.slice(0,250)});
 return out;
}
function onMessage(client,msg){if(!msg||typeof msg!=='object')return;
 if(msg.type==='hello'){setupProfile(client,msg);send(client,{type:'voice-config',iceServers:voiceIceServers()});return;}
 if(msg.type==='create'){newRoom(client,msg);if(client.room)send(client,{type:'roomResult',ok:true,code:client.room.code,message:'Private room created: '+client.room.code+' — share this code with your friend.'});return;}
 if(msg.type==='public'){publicRoom(client,msg);return;}
 if(msg.type==='publicHop'){if(client.room?.phase==='playing'&&!client.room?.players.get(client.id)?.spectating){send(client,{type:'error',message:'Wait until the match ends to server hop.'});return;}publicRoom(client,msg,true);return;}
 if(msg.type==='join'){
  const invite=String(msg.code||'').trim().toUpperCase().replace(/\s/g,'');
  if(!/^[A-Z2-9]{5}$/.test(invite)){
   send(client,{type:'roomResult',ok:false,code:invite,message:'Room codes have exactly 5 letters/numbers. Check the code on your friend\'s screen.'});return;
  }
  const r=rooms.get(invite);
  if(!r){send(client,{type:'roomResult',ok:false,code:invite,message:'Room '+invite+' is not active on this server. Have your friend stay in their private room.'});return;}
  if(r.players.size>=8){send(client,{type:'roomResult',ok:false,code:invite,message:'Room '+invite+' is full.'});return;}
  join(client,r,msg.name,msg.color);
  if(client.room===r)send(client,{type:'roomResult',ok:true,code:invite,message:'Joined room '+invite+'!'});
  return;
 }
 if(msg.type==='leave'){removeClient(client);send(client,{type:'left'});return;}
 if(msg.type==='sitOut'){const r=client.room,p=r?.players.get(client.id);if(r?.phase!=='playing'||!p)return;p.spectating=true;p.alive=false;dropHeldPart(r,p,[0,2,0]);if(p.weapon!=='none'){r.pickups.push({id:'left-'+crypto.randomBytes(4).toString('hex'),x:p.x,z:p.z,type:p.weapon,availableAt:Date.now()+800});p.weapon='none';}send(client,{type:'sitOutConfirmed',round:r.round});cast(r,{type:'notice',text:p.name+' returned to the waiting lobby'});winCheck(r);sync(r);return;}
 if(!client.profile)setupProfile(client,{});
 if(msg.type==='createRecoveryCode'){rotateRecoveryCode(client);return;}
 if(msg.type==='recoverProfile'){
  const now=Date.now();client.recoveryAttempts=(client.recoveryAttempts||[]).filter(t=>now-t<3600000);
  if(client.recoveryAttempts.length>=5)return send(client,{type:'recoveryResult',ok:false,message:'Too many attempts. Try again in one hour.'});
  client.recoveryAttempts.push(now);
  const code=normalizeRecoveryCode(msg.code);
  if(!/^FROG[A-HJ-NP-Z2-9]{16}$/.test(code))return send(client,{type:'recoveryResult',ok:false,message:'Enter the full FROG-XXXX-XXXX-XXXX-XXXX recovery code.'});
  const hash=hashRecoveryCode(code),match=Object.entries(accounts).find(([,p])=>p?.recoveryHash===hash);
  if(!match)return send(client,{type:'recoveryResult',ok:false,message:'Recovery code not found. Check each letter.'});
  // Do not allow a claim to silently join an active match as another account.
  if(client.room)removeClient(client);
  const [oldToken,p]=match;
  client.profileToken=oldToken;client.profile=normalizeProfile(p,oldToken);
  refreshDaily(client.profile,oldToken);client.profile.coins=client.profile.crickets;
  send(client,{type:'recoveryResult',ok:true,message:'Account recovered. Your old balance, items, cosmetics and stats are restored.'});
  rotateRecoveryCode(client); // Single-use restore; display a NEW backup code.
  socialMessage(client);notifyFriends();return;
 }
 if(msg.type==='rename'){
  const name=cleanFrogName(msg.name);
  if(!name||name.length<2)return send(client,{type:'nameResult',ok:false,message:'Use 2–18 letters, numbers, spaces or _ - apostrophe. Role names are reserved.'});
  const now=Date.now();if(now-(client.lastRenameAt||0)<4000)return send(client,{type:'nameResult',ok:false,message:'Please wait a few seconds before changing your name again.'});
  client.lastRenameAt=now;client.profile.name=name;saveAccounts(client.profileToken);
  if(client.room){const frog=client.room.players.get(client.id);if(frog){frog.name=name;sync(client.room);}}
  profileMessage(client);notifyFriends();send(client,{type:'nameResult',ok:true,name,message:'Your frog name is now '+name+'.'});return;
 }
 if(msg.type==='redeemCode'){
  if(String(msg.code||'').trim().toUpperCase()==='NPC'){send(client,{type:'codeResult',code:'NPC',...spawnPracticeNpc(client)});return;}
  const result=Promo.redeem(client.profile,msg.code);
  if(result.ok){saveAccounts(client.profileToken);profileMessage(client);if(client.room){sync(client.room);}}
  send(client,{type:'codeResult',...result});return;
 }
 // Tools and quests are server-authoritative. Tools remain in inventory until activated in a match.
 if(msg.type==='buyTool'){
  const item=TOOL_IDS.get(String(msg.item||'')),p=client.profile;
  if(!item)return send(client,{type:'toolResult',ok:false,message:'Unknown tool.'});
  if(p.dabloons<item.price)return send(client,{type:'toolResult',ok:false,message:'Not enough Dabloons.'});
  p.dabloons-=item.price;p.tools[item.id]=(p.tools[item.id]||0)+1;saveAccounts(client.profileToken);
  profileMessage(client);send(client,{type:'toolResult',ok:true,message:'Bought '+item.name+'. Saved in Inventory until used.'});return;
 }
 if(msg.type==='activateTool'){
  const item=TOOL_IDS.get(String(msg.item||'')),p=client.room?.players.get(client.id),r=client.room;
  const fail=reason=>send(client,{type:'toolResult',ok:false,message:reason});
  if(!item||!p||!r||r.phase!=='playing'||p.spectating||!p.alive)return fail('Tools only work during your active round.');
  if((p.monster?'monster':'survivor')!==item.role)return fail('That tool cannot be used by your current role.');
  if(p.usedTools?.[item.id])return fail('You already used this tool this round.');
  if(!(client.profile.tools[item.id]>0))return fail('You do not own this tool.');
  client.profile.tools[item.id]--;p.usedTools[item.id]=true;p.activeTools[item.id]=true;
  if(item.id==='shapeshift')p.disguised=true;
  saveAccounts(client.profileToken);profileMessage(client);
  send(client,{type:'toolActivated',id:item.id,round:r.round,message:item.name+' activated!'});
  if(item.id==='jumpscare'){
   for(const target of players(r))if(target.id!==p.id&&!target.monster&&target.alive&&dist(p,target)<12)
    send(target.socket,{type:'bogScare',from:p.id});
   p.activeTools.jumpscare=false;
  }
  if(item.id==='rocket'){p.activeTools.rocket=false;}
  cast(r,{type:'toolFx',id:p.id,tool:item.id});sync(r);return;
 }
 if(msg.type==='friendRequest'){
  const id=String(msg.publicId||''),self=client.profile,target=accountByPublicId(id),fail=x=>send(client,{type:'socialResult',ok:false,message:x});
  if(!target||id===self.publicId)return fail('Frog not found.');
  if(self.friends.includes(id))return fail('Already friends!');
  if(!self.friendRequests.includes(id))self.friendRequests.push(id);
  if(target.profile.friendRequests.includes(self.publicId)){
   self.friends.push(id);target.profile.friends.push(self.publicId);
   self.friendRequests=self.friendRequests.filter(x=>x!==id);
   target.profile.friendRequests=target.profile.friendRequests.filter(x=>x!==self.publicId);
   saveAccounts(client.profileToken);saveAccounts(target.token);
   for(const c of clients.values())if(c.profileToken===target.token||c.profileToken===client.profileToken){profileMessage(c);send(c,{type:'socialResult',ok:true,message:'You and '+(target.profile.name||'frog')+' are now friends!'});}
  }else{
   saveAccounts(client.profileToken);for(const c of clients.values())if(c.profileToken===target.token)send(c,{type:'socialResult',ok:true,message:self.name+' sent a friend request. Send one back to become friends.'});
   send(client,{type:'socialResult',ok:true,message:'Friend request sent. They must send one back.'});
  }
  notifyFriends();return;
 }
 if(msg.type==='friendJoin'){
  const id=String(msg.publicId||''),friend=client.profile.friends.includes(id)?onlineClientByPublicId(id):null;
  if(!friend?.room)return send(client,{type:'socialResult',ok:false,message:'Friend is not online in a room.'});
  if(friend.room.players.size>=8)return send(client,{type:'socialResult',ok:false,message:'Friend’s room is full.'});
  join(client,friend.room,client.profile.name,client.profile.color);send(client,{type:'socialResult',ok:true,message:'Joined your friend’s lobby.'});return;
 }
 if(msg.type==='kickPlayer'){
  const r=client.room,target=r?.players.get(String(msg.playerId||''));
  if(!Promo.canModerate(client.profile))return send(client,{type:'moderationResult',ok:false,message:'Not authorized to kick players.'});
  if(!target||target.isNpc||target.id===client.id)return send(client,{type:'moderationResult',ok:false,message:'Select a real frog in your room.'});
  if(Promo.canModerate(target.socket.profile))return send(client,{type:'moderationResult',ok:false,message:'Cannot kick another moderator or owner.'});
  const now=Date.now();client.kicks=(client.kicks||[]).filter(t=>now-t<3600000);
  if(client.kicks.length>=5)return send(client,{type:'moderationResult',ok:false,message:'Kick limit reached. Contact the owner.'});
  client.kicks.push(now);
  if(!r.kickedUntil)r.kickedUntil=new Map();
  r.kickedUntil.set(target.socket.profile.publicId,now+15*60*1000);
  saveReport({at:new Date(now).toISOString(),kind:'moderator-kick',from:client.profile.publicId,to:target.socket.profile.publicId,room:r.code,reason:'In-game moderation'});
  send(target.socket,{type:'kicked',message:'You were removed from this room by a moderator. You may join another lobby.'});
  removeClient(target.socket);
  send(client,{type:'moderationResult',ok:true,message:'Player removed from this room for 15 minutes.'});
  return;
 }
 if(msg.type==='reportPlayer'){
  const r=client.room,target=r?.players.get(String(msg.playerId||''));
  if(!target||target.isNpc||target.id===client.id)return send(client,{type:'reportResult',ok:false,message:'Choose another player in your lobby.'});
  const reason=['Harassment','Cheating','Offensive name','Other'].includes(msg.reason)?msg.reason:'Other';
  const now=Date.now();client.reports=(client.reports||[]).filter(t=>now-t<3600000);
  if(client.reports.length>=3)return send(client,{type:'reportResult',ok:false,message:'Report limit reached. Try again later.'});
  client.reports.push(now);saveReport({at:new Date(now).toISOString(),from:client.profile.publicId,to:target.socket.profile?.publicId||'',room:r.code,reason});
  send(client,{type:'reportResult',ok:true,message:'Report received. Reports require a human moderator to review.'});return;
 }
 if(msg.type==='buy'){const item=SHOP_BY_ID.get(msg.item);const p=client.profile;refreshDaily(p,client.profileToken);const fail=(reason)=>{send(client,{type:'shopResult',ok:false,item:msg.item,message:reason});return;};if(!item)return fail('That item is not in the shop.');if(p.inventory.includes(item.id))return fail('You already own that cosmetic.');if(p.crickets<item.price)return fail('You need '+(item.price-p.crickets)+' more Crickets for '+item.name+'. Come back after midnight Eastern!');p.crickets-=item.price;p.coins=p.crickets;p.inventory.push(item.id);p.equipped[item.slot]=item.id;saveAccounts(client.profileToken);profileMessage(client);send(client,{type:'shopResult',ok:true,item:item.id,message:'Purchased '+item.name+'! Equipped automatically.'});if(client.room){const frog=client.room.players.get(client.id);frog.equipped={...p.equipped};sync(client.room);}return;}
 if(msg.type==='equip'){const item=SHOP_BY_ID.get(msg.item);const slot=msg.slot||item?.slot;if(!['hat','face','back'].includes(slot))return;if(msg.item!=='none'&&(!item||item.slot!==slot||!client.profile.inventory.includes(item.id)))return;client.profile.equipped[slot]=msg.item;saveAccounts(client.profileToken);profileMessage(client);if(client.room){const frog=client.room.players.get(client.id);frog.equipped={...client.profile.equipped};sync(client.room);}return;}
 if(msg.type==='color'){
  const next=String(msg.color||'').trim().toLowerCase();
  if(!validColor(next)){
   send(client,{type:'colorResult',ok:false,message:'Invalid color. Enter three RGB digits (0 to 9), such as 596.'});return;
  }
  client.profile.color=next;
  if(client.room){const frog=client.room.players.get(client.id);if(frog)frog.color=next;}
  saveAccounts(client.profileToken);
  profileMessage(client);
  if(client.room)sync(client.room);
  send(client,{type:'colorResult',ok:true,color:next,message:'Color saved: '+(next.startsWith('rgb-')?next.slice(4):next)+'. Your frog and mirror have been updated.'});
  return;
 }
 const r=client.room;if(!r)return;const p=r.players.get(client.id);if(!p)return;
 if(msg.type==='vote'){if(r.phase==='playing')return;const n=Number(msg.index);if(!Number.isInteger(n)||n<0||n>2)return;r.votes.set(p.id,n);sync(r);return;}
 if(msg.type==='voice-ready'){client.voiceEnabled=msg.enabled===true;cast(r,{type:'voice-ready',from:client.id,enabled:client.voiceEnabled},client.id);send(client,{type:'voice-peers',ids:players(r).filter(v=>v.id!==client.id&&clients.get(v.id)?.voiceEnabled).map(v=>v.id)});return;}
 if(msg.type==='rtc'){const to=String(msg.to||''),dest=clients.get(to),data=msg.data;if(!client.voiceEnabled||!dest?.voiceEnabled||dest.room!==r||!data||typeof data!=='object'||JSON.stringify(data).length>15000)return;if(!['offer','answer','candidate'].includes(data.kind))return;send(dest,{type:'rtc',from:client.id,data});return;}
 if(msg.type==='start'){if(p.id===r.host&&r.phase==='lobby'&&r.players.size>=2)prepare(r);return;}
 if(msg.type==='grab'){
  if(r.phase!=='playing'||!p.alive||p.spectating)return;
  const side=msg.hand==='left'?'left':'right',at=side==='left'?p.l:p.rr;
  if((p.lostArms||0)&(side==='left'?1:2))return send(client,{type:'grabResult',ok:false,reason:'That arm was torn off! Use your other paw.'});
  const q=msg.handPosition;
  // Fresh, controller-provided wrist location is useful at grab time but never
  // accept a wrist outside a reasonable physical body radius.
  const updated=Array.isArray(q)&&q.length===3&&q.every(Number.isFinite)
   &&Math.hypot(q[0]-p.x,q[2]-p.z)<2.55&&q[1]>=p.y-.20&&q[1]<=p.y+3.1?q:null;
  if(!at&&!updated){send(client,{type:'grabResult',ok:false,reason:'Your hand must be tracked to grab.'});return;}
  const origin=updated||[at[0],at[1],at[2]];
  if(Math.hypot(origin[0]-p.x,origin[2]-p.z)>2.9||Math.abs(origin[1]-(p.y+1))>2.2)return;
  const parts=(r.parts||[]).filter(q=>!q.heldBy).map(q=>({kind:'part',thing:q,d:Math.hypot(q.x-origin[0],q.y-origin[1],q.z-origin[2])}));
  const weapons=p.monster?[]:r.pickups.filter(w=>w.availableAt<=Date.now()).map(w=>({kind:'weapon',thing:w,d:Math.hypot(w.x-origin[0],.58-origin[1],w.z-origin[2])}));
  const closest=[...parts,...weapons].filter(q=>q.d<1.85).sort((a,b)=>a.d-b.d)[0];
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
  if(closest.kind==='weapon'&&!r.npcPractice)questEvent(client,'grabWeapon');send(client,{type:'grabResult',ok:true,kind:closest.kind,hand:side,id:closest.thing.id});sync(r);return;
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
  if(r.phase!=='playing'){
   const q=FrogyCollision.resolveBodyCircle(x,z,.31,'hub',null,y);x=q.x;z=q.z;y=safe(y,0,5.5,p.y);
  }else{
   const q=FrogyCollision.resolveBodyCircle(x,z,.31,'arena',WorldData.maps[r.map]&&{SIZE:WorldData.SIZE,cover:WorldData.maps[r.map].cover},y);
   x=q.x;z=q.z;
  }
  p.x=x;p.y=y;p.z=z;p.yaw=safe(msg.yaw,-Math.PI*100,Math.PI*100,p.yaw);p.mouth=safe(msg.mouth,0,1,0);
  p.lYaw=safe(msg.lYaw,-Math.PI*100,Math.PI*100,p.yaw);p.rYaw=safe(msg.rYaw,-Math.PI*100,Math.PI*100,p.yaw);
  const validBasis=b=>Array.isArray(b)&&b.length===9&&b.every(v=>Number.isFinite(v)&&Math.abs(v)<=1.01)?b.map(v=>+v):null;
  p.lBasis=validBasis(msg.lBasis);p.rBasis=validBasis(msg.rBasis);
  const tongue=Array.isArray(msg.tongue)&&msg.tongue.length===3&&msg.tongue.every(Number.isFinite)?msg.tongue:null;
  p.tongue=!p.monster&&tongue&&Math.hypot(tongue[0]-p.x,tongue[1]-(p.y+1.45),tongue[2]-p.z)<=40?tongue:null;
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
let lastAdvance=Date.now();function advance(){const now=Date.now(),dt=Math.min(.30,(now-lastAdvance)/1000);lastAdvance=now;for(const r of rooms.values()){r.pickups=r.pickups.filter(w=>!w.expiresAt||now<w.expiresAt);r.parts=(r.parts||[]).filter(q=>q.expiresAt>now);if(r.phase==='playing'){
  stepParts(r,dt);
  // Continue leaving visible blood trails while a fresh torn-arm wound bleeds.
  for(const injured of players(r))if(injured.alive&&!injured.monster&&injured.bleedUntil&&injured.lostArms&&now>=(injured.nextBleedPatchAt||0)){
   bloodPatch(r,injured.x+(Math.random()-.5)*.65,injured.z+(Math.random()-.5)*.65,.10+Math.random()*.28);
   injured.nextBleedPatchAt=now+740;
  }
  // Survivors can keep playing after an arm is lost, but bleed out after 45 sec.
  for(const injured of players(r))if(injured.alive&&!injured.monster&&injured.bleedUntil&&now>=injured.bleedUntil){
   injured.bleedUntil=0;hit(r,injured,injured.hp,null,'bleed',[0,0,-1]);
   if(r.phase!=='playing')break;
  }
 }
 if(r.phase==='lobby'&&r.players.size>=2)prepare(r);
 if(r.phase==='countdown'&&now>=r.phaseEnd)begin(r);
 if(r.phase==='playing'&&now>=r.phaseEnd)finish(r,'The frogs','TIME UP! Surviving frogs win!');
 if(r.phase==='intermission'&&now>=r.phaseEnd){r.phase='lobby';r.phaseEnd=0;}
 // Refresh daily quests and crickets for online frogs at midnight Eastern, without reconnecting.
 for(const p of players(r)){const c=p.socket;if(!c.profile)continue;if(c.profile.quests.day!==easternDay(now)||c.profile.lastCricketDay!==easternDay(now)){const bonus=refreshDaily(c.profile,c.profileToken,now);saveAccounts(c.profileToken);profileMessage(c,bonus);}}
 sync(r);
}}
const timer=setInterval(advance,240);timer.unref?.();
function saveReport(report){
 // Reports are private moderation records. On Render, configure DATABASE_URL for durable storage.
 try{fs.mkdirSync(DATA_DIR,{recursive:true});fs.appendFileSync(path.join(DATA_DIR,'reports.jsonl'),JSON.stringify(report)+'\n');}catch(e){console.error('Local report persistence failed:',e.message);}
 if(db)dbQueue=dbQueue.then(()=>db.query('INSERT INTO frogy_reports (record) VALUES ($1::jsonb)',[JSON.stringify(report)])).catch(e=>console.error('Database report write failed:',e.message));
}
const TYPE={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,version:'16.1.0',rooms:rooms.size,profileStorage:saveMode(),databaseConnected:!!db,durability:db?'database':saveMode()==='configured-disk'?'disk-mount-not-verified':'ephemeral'}));return;}
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
if(require.main===module){
 initDatabase().then(()=>server.listen(PORT,'0.0.0.0',()=>console.log(`🐸 Frogy server on http://localhost:${PORT} · profile storage ${saveMode()}`))).catch(e=>{console.error('Database initialization failed. Refusing to launch with unsafe partial persistence:',e);process.exit(1);});
 // Render sends SIGTERM on deployment; drain queued database writes before exit.
 process.on('SIGTERM',()=>{server.close();dbQueue.finally(()=>db?.end().finally(()=>process.exit(0))||process.exit(0));});
}
module.exports={server,SHOP,MAPS,rooms,accounts,initDatabase,Economy};
