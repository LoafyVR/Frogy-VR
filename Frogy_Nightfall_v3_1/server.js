'use strict';
// Frogy: dependency-free private-room WebSocket game with persistent per-browser cosmetics.
const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const PORT=Number(process.env.PORT||3000),ROOT=path.join(__dirname,'public');
const ROUND_MS=Number(process.env.ROUND_MS||120000),COUNTDOWN_MS=Number(process.env.COUNTDOWN_MS||16000),INTERMISSION_MS=Number(process.env.INTERMISSION_MS||18000);
const WorldData=require('./public/world.js');
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
const DATA_DIR=path.join(__dirname,'data'),ACCOUNTS_FILE=path.join(DATA_DIR,'profiles.json');
let accounts={};try{accounts=JSON.parse(fs.readFileSync(ACCOUNTS_FILE,'utf8'));if(!accounts||Array.isArray(accounts)||typeof accounts!=='object')accounts={};}catch{}
function saveAccounts(){fs.mkdirSync(DATA_DIR,{recursive:true});const tmp=ACCOUNTS_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(accounts));fs.renameSync(tmp,ACCOUNTS_FILE);}
const rooms=new Map(),clients=new Map();let nextId=1;
function safe(v,min,max,d=0){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):d;}
function uid(){return String(nextId++);}
function code(){let s;do{s=Array.from({length:5},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');}while(rooms.has(s));return s;}
const send=(c,obj)=>{const socket=c?.socket||c;if(socket&&!socket.closed)try{socket.send(JSON.stringify(obj));}catch(e){console.error('WebSocket send:',e.message);}};
const players=r=>[...r.players.values()];
function cast(r,obj,except=null){for(const p of players(r))if(p.id!==except)send(p.socket,obj);}
function profileMessage(client,bonus=0){const p=client.profile;if(p)send(client,{type:'profile',token:client.profileToken,coins:p.coins,inventory:p.inventory,equipped:p.equipped,color:p.color,bonus,shop:SHOP});}
function setupProfile(client,m){let token=String(m.token||'');if(!/^[a-f0-9]{48}$/.test(token)||!accounts[token]){token=crypto.randomBytes(24).toString('hex');accounts[token]={coins:90,inventory:[],equipped:{hat:'none',face:'none',back:'none'},color:'mint',lastLoginDay:''};}
 const p=accounts[token];if(!Array.isArray(p.inventory))p.inventory=[];if(!p.equipped)p.equipped={hat:'none',face:'none',back:'none'};const today=new Date().toISOString().slice(0,10);let bonus=0;if(p.lastLoginDay!==today){bonus=40;p.coins=(p.coins||0)+bonus;p.lastLoginDay=today;}
 client.profileToken=token;client.profile=p;saveAccounts();profileMessage(client,bonus);
}
function publicPlayer(p){return {id:p.id,name:p.name,mouth:p.mouth,color:p.color,equipped:p.equipped,x:p.x,y:p.y,z:p.z,yaw:p.yaw,l:p.l,rr:p.rr,hp:p.hp,maxHp:p.maxHp,alive:p.alive,monster:p.monster,weapon:p.weapon,kills:p.kills,wins:p.wins};}
function voteCounts(r){const a=[0,0,0];for(const [id,n] of r.votes)if(r.players.has(id))a[n]++;return a;}
function winningMap(r){const counts=voteCounts(r),max=Math.max(...counts);if(!max)return r.round===0?r.map:(r.map+1)%3;const tops=counts.map((c,i)=>c===max?i:-1).filter(i=>i>=0);return tops.includes(r.map)?r.map:tops[0];}
function state(r){return {type:'state',visibility:r.visibility||'private',online:clients.size,publicRooms:[...rooms.values()].filter(x=>x.visibility==='public').length,code:r.code,phase:r.phase,seconds:r.phaseEnd?Math.max(0,Math.ceil((r.phaseEnd-Date.now())/1000)):0,map:r.map,selectedMap:winningMap(r),votes:voteCounts(r),round:r.round,host:r.host,lastWinner:r.lastWinner,players:players(r).map(publicPlayer),pickups:r.pickups.map(w=>({...w,available:w.availableAt<=Date.now()}))};}
function sync(r){cast(r,state(r));}
function removeClient(client){const r=client.room;if(!r)return;const p=r.players.get(client.id);if(!p)return;r.players.delete(client.id);r.votes.delete(client.id);client.room=null;client.voiceEnabled=false;cast(r,{type:'peer-left',from:client.id});cast(r,{type:'notice',text:p.name+' hopped away'});if(!r.players.size){rooms.delete(r.code);return;}if(r.host===client.id)r.host=players(r)[0].id;if(r.phase==='playing'&&p.monster)finish(r,'The frogs','The monster hopped away!');else if(r.phase==='playing')winCheck(r);if(r.phase==='countdown'&&r.players.size<2){r.phase='lobby';r.phaseEnd=0;}sync(r);}
function join(client,r,name,color){if(r.players.size>=8){send(client,{type:'error',message:'That lily pad is full (8 frogs max).'});return;}if(client.room)removeClient(client);if(!client.profile)setupProfile(client,{});
 const p={id:client.id,socket:client,name:String(name||'Lil Frog').trim().slice(0,18).replace(/[<>]/g,'')||'Lil Frog',color:validColor(color)?color:client.profile.color,equipped:{...client.profile.equipped},x:SPAWNS[r.players.size%8][0],y:0,z:SPAWNS[r.players.size%8][1],yaw:0,l:null,rr:null,mouth:0,hp:r.phase==='playing'?0:100,maxHp:100,alive:r.phase!=='playing',monster:false,weapon:'none',kills:0,wins:0,lastAtk:0,lastRoar:0};
 client.profile.color=p.color;saveAccounts();r.players.set(p.id,p);client.room=r;client.voiceEnabled=false;if(!r.host)r.host=p.id;send(client,{type:'joined',id:p.id,code:r.code,visibility:r.visibility||'private'});cast(r,{type:'notice',text:p.name+' joined the pond!'});sync(r);}
function newRoom(client,msg){const c=code(),r={code:c,players:new Map(),votes:new Map(),host:null,phase:'lobby',phaseEnd:0,map:0,round:0,lastWinner:'',pickups:WEAPONS.map(w=>({...w,availableAt:0})),lastMonster:null,visibility:'private'};rooms.set(c,r);join(client,r,msg.name,msg.color);}
function publicRoom(client,msg){if(client.room)removeClient(client);let r=[...rooms.values()].filter(x=>x.visibility==='public'&&x.players.size<8).sort((a,b)=>{const rank=x=>x.phase==='playing'?2:x.phase==='intermission'?1:0;return rank(a)-rank(b)||b.players.size-a.players.size})[0];
 if(!r){r={code:code(),players:new Map(),votes:new Map(),host:null,phase:'lobby',phaseEnd:0,map:0,round:0,lastWinner:'',pickups:WEAPONS.map(w=>({...w,availableAt:0})),lastMonster:null,visibility:'public'};rooms.set(r.code,r);}
 join(client,r,msg.name,msg.color);}
function prepare(r){if(r.players.size<2||r.phase!=='lobby')return;r.phase='countdown';r.phaseEnd=Date.now()+COUNTDOWN_MS;cast(r,{type:'notice',text:'Vote for your next map! The pond is getting spooky...'});sync(r);}
function begin(r){const ps=players(r);if(ps.length<2){r.phase='lobby';r.phaseEnd=0;sync(r);return;}
 r.round++;r.map=winningMap(r);r.votes.clear();let pool=ps.filter(p=>p.id!==r.lastMonster);if(!pool.length)pool=ps;const monster=pool[crypto.randomInt(pool.length)];r.lastMonster=monster.id;r.phase='playing';r.phaseEnd=Date.now()+ROUND_MS;r.lastWinner='';r.pickups=WEAPONS.map(w=>({...w,availableAt:0}));
 ps.forEach((p,i)=>{const sp=SPAWNS[i%SPAWNS.length];p.x=sp[0];p.y=0;p.z=sp[1];p.yaw=0;p.l=null;p.rr=null;p.monster=p.id===monster.id;p.alive=true;p.maxHp=p.monster?350:100;p.hp=p.maxHp;p.weapon='none';p.lastAtk=0;p.lastRoar=0;});cast(r,{type:'roundStart',monster:monster.id,map:r.map,text:monster.name+' is the MONSTER FROG!'});sync(r);}
function finish(r,winner,reason){if(r.phase!=='playing')return;r.phase='intermission';r.phaseEnd=Date.now()+INTERMISSION_MS;r.lastWinner=reason||winner+' win!';for(const p of players(r))if((winner==='The monster'&&p.monster)||(winner==='The frogs'&&!p.monster&&p.alive))p.wins++;cast(r,{type:'roundEnd',winner,text:r.lastWinner});sync(r);}
function winCheck(r){if(r.phase!=='playing')return;const ps=players(r);if(!ps.find(p=>p.monster&&p.alive)){finish(r,'The frogs','THE FROGS WIN! The monster was defeated!');return;}if(!ps.find(p=>!p.monster&&p.alive))finish(r,'The monster','THE MONSTER WINS! No frogs left!');}
function hit(r,target,damage,source,kind,dir){if(!target||!target.alive)return;target.hp=Math.max(0,target.hp-damage);if(!target.hp){target.alive=false;if(source)source.kills++;cast(r,{type:'pop',id:target.id,x:target.x,y:target.y,z:target.z,color:target.color,kind,monster:target.monster});cast(r,{type:'notice',text:target.name+' went SPLAT!'});}else cast(r,{type:'ouch',id:target.id,damage,x:target.x,y:target.y+1,z:target.z,kind,dir});winCheck(r);}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z,(a.y||0)-(b.y||0));}
function nearest(r,p,range,dir,cone=-1){let best=null,d=Infinity;for(const target of players(r)){if(p.id===target.id||!target.alive)continue;const dd=dist(p,target);if(dd>range||dd>=d)continue;const vx=(target.x-p.x)/Math.max(dd,.001),vz=(target.z-p.z)/Math.max(dd,.001);if(cone>-1&&vx*dir[0]+vz*dir[2]<cone)continue;best=target;d=dd;}return best;}
function attack(r,p,msg){if(r.phase!=='playing'||!p.alive)return;const now=Date.now(),k=String(msg.kind||''),raw=Array.isArray(msg.dir)?msg.dir:[0,0,-1];let dir=[safe(raw[0],-1,1),safe(raw[1],-1,1),safe(raw[2],-1,1,-1)];const len=Math.hypot(...dir)||1;dir=dir.map(v=>v/len);const fxz=Math.hypot(dir[0],dir[2])||1,flat=[dir[0]/fxz,0,dir[2]/fxz];
 if(k==='roar'){if(!p.monster||now-p.lastRoar<8000)return;p.lastRoar=now;cast(r,{type:'attackFx',id:p.id,kind:'roar',x:p.x,y:1.2+p.y,z:p.z,dir});for(const target of players(r))if(p.id!==target.id&&target.alive&&dist(p,target)<4.1)hit(r,target,18,p,'roar',dir);return;}
 const cooldown=k==='blaster'?390:k==='knife'?600:k==='punch'?530:k==='chomp'?1600:k==='rip'?1400:99999;if(now-p.lastAtk<cooldown)return;
 if(p.monster?!(k==='punch'||k==='chomp'||k==='rip'):(k!==p.weapon))return;p.lastAtk=now;cast(r,{type:'attackFx',id:p.id,kind:k,x:p.x,y:1.2+p.y,z:p.z,dir});
 if(k==='blaster'){let best=null,bestT=25;const o=[p.x,p.y+1.25,p.z];for(const target of players(r)){if(p.id===target.id||!target.alive)continue;const center=[target.x,target.y+(target.monster?1.45:1.08),target.z],to=center.map((v,i)=>v-o[i]);const t=to.reduce((s,v,i)=>s+v*dir[i],0);if(t<.15||t>25)continue;const miss=to.reduce((s,v)=>s+v*v,0)-t*t;const radius=target.monster?.86:.62;if(miss<=radius*radius&&t<bestT){bestT=t;best=target;}}if(best){const block=WorldData.maps[r.map].cover.some(o=>{const ox=o.x-p.x,oz=o.z-p.z,along=ox*flat[0]+oz*flat[2];if(along<.1||along>bestT-.4)return false;const closest=Math.hypot(ox-flat[0]*along,oz-flat[2]*along);return closest<o.r+.3&&p.y+1.25<o.h+.5;});if(!block)hit(r,best,best.monster?22:34,p,'blaster',dir);}
 }else if(k==='knife'){const t=nearest(r,p,1.85,flat,-.1);if(t)hit(r,t,52,p,'knife',dir);
 }else if(k==='punch'){const t=nearest(r,p,2.7,flat,-.35);if(t)hit(r,t,78,p,'punch',dir);
 }else if(k==='chomp'){const t=nearest(r,p,1.8,flat,-.4);if(t)hit(r,t,155,p,'chomp',dir);}
 else if(k==='rip'){const t=nearest(r,p,2.1,flat,-.35);if(t){cast(r,{type:'gore',x:t.x,y:t.y+1.1,z:t.z,color:t.color});hit(r,t,115,p,'rip',dir);}}
}
function onMessage(client,msg){if(!msg||typeof msg!=='object')return;
 if(msg.type==='hello'){setupProfile(client,msg);return;}
 if(msg.type==='create'){newRoom(client,msg);return;}
 if(msg.type==='public'){publicRoom(client,msg);return;}
 if(msg.type==='join'){const r=rooms.get(String(msg.code||'').toUpperCase().trim());if(!r){send(client,{type:'error',message:'Room not found. Check the five-character code.'});return;}join(client,r,msg.name,msg.color);return;}
 if(msg.type==='leave'){removeClient(client);send(client,{type:'left'});return;}
 if(!client.profile)setupProfile(client,{});
 if(msg.type==='buy'){const item=SHOP_BY_ID.get(msg.item);const p=client.profile;const fail=(reason)=>{send(client,{type:'shopResult',ok:false,item:msg.item,message:reason});return;};if(!item)return fail('That item is not in the shop.');if(p.inventory.includes(item.id))return fail('You already own that cosmetic.');if(p.coins<item.price)return fail('You need '+(item.price-p.coins)+' more coins for '+item.name+'. Come back for the daily bonus!');p.coins-=item.price;p.inventory.push(item.id);p.equipped[item.slot]=item.id;saveAccounts();profileMessage(client);send(client,{type:'shopResult',ok:true,item:item.id,message:'Purchased '+item.name+'! Equipped automatically.'});if(client.room){const frog=client.room.players.get(client.id);frog.equipped={...p.equipped};sync(client.room);}return;}
 if(msg.type==='equip'){const item=SHOP_BY_ID.get(msg.item);const slot=msg.slot||item?.slot;if(!['hat','face','back'].includes(slot))return;if(msg.item!=='none'&&(!item||item.slot!==slot||!client.profile.inventory.includes(item.id)))return;client.profile.equipped[slot]=msg.item;saveAccounts();profileMessage(client);if(client.room){const frog=client.room.players.get(client.id);frog.equipped={...client.profile.equipped};sync(client.room);}return;}
 if(msg.type==='color'){if(!validColor(msg.color))return;client.profile.color=msg.color;saveAccounts();profileMessage(client);if(client.room){client.room.players.get(client.id).color=msg.color;sync(client.room);}return;}
 const r=client.room;if(!r)return;const p=r.players.get(client.id);if(!p)return;
 if(msg.type==='vote'){if(r.phase==='playing')return;const n=Number(msg.index);if(!Number.isInteger(n)||n<0||n>2)return;r.votes.set(p.id,n);sync(r);return;}
 if(msg.type==='voice-ready'){client.voiceEnabled=msg.enabled===true;cast(r,{type:'voice-ready',from:client.id,enabled:client.voiceEnabled},client.id);send(client,{type:'voice-peers',ids:players(r).filter(v=>v.id!==client.id&&clients.get(v.id)?.voiceEnabled).map(v=>v.id)});return;}
 if(msg.type==='rtc'){const to=String(msg.to||''),dest=clients.get(to),data=msg.data;if(!client.voiceEnabled||!dest?.voiceEnabled||dest.room!==r||!data||typeof data!=='object'||JSON.stringify(data).length>15000)return;if(!['offer','answer','candidate'].includes(data.kind))return;send(dest,{type:'rtc',from:client.id,data});return;}
 if(msg.type==='start'){if(p.id===r.host&&r.phase==='lobby'&&r.players.size>=2)prepare(r);return;}
 if(msg.type==='move'){
  let x=safe(msg.x,-WorldData.SIZE+1,WorldData.SIZE-1,p.x),y=safe(msg.y,0,8,p.y),z=safe(msg.z,-WorldData.SIZE+1,WorldData.SIZE-1,p.z);const dr=Math.hypot(x,z),max=WorldData.SIZE-1;if(dr>max){x=x/dr*max;z=z/dr*max;}
  p.x=x;p.y=y;p.z=z;p.yaw=safe(msg.yaw,-Math.PI*100,Math.PI*100,p.yaw);p.mouth=safe(msg.mouth,0,1,0);
  const hand=v=>Array.isArray(v)&&v.length===3?v.map((q,i)=>safe(q,i===1?0:-14,i===1?9:14)):null;p.l=hand(msg.l);p.rr=hand(msg.r);
  if(r.phase==='playing'&&p.alive&&!p.monster)for(const pickup of r.pickups){if(pickup.availableAt>Date.now())continue;if(Math.hypot(p.x-pickup.x,p.z-pickup.z)<1.7&&p.y<1.5){p.weapon=pickup.type;pickup.availableAt=Date.now()+13000;cast(r,{type:'pickupFx',id:p.id,weapon:pickup.type,x:pickup.x,z:pickup.z});break;}}
  return;
 }
 if(msg.type==='attack')attack(r,p,msg);
}
function advance(){const now=Date.now();for(const r of rooms.values()){
 if(r.phase==='lobby'&&r.players.size>=2)prepare(r);
 if(r.phase==='countdown'&&now>=r.phaseEnd)begin(r);
 if(r.phase==='playing'&&now>=r.phaseEnd)finish(r,'The frogs','TIME UP! Surviving frogs win!');
 if(r.phase==='intermission'&&now>=r.phaseEnd){r.phase='lobby';r.phaseEnd=0;}
 sync(r);
}}
const timer=setInterval(advance,240);timer.unref?.();
const TYPE={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
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
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log(`🐸 Frogy server on http://localhost:${PORT}`));
module.exports={server,SHOP,MAPS,rooms,accounts};
