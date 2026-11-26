'use strict';
/* FROGY v16.3 — upright standing ground push, articulated frog paws and body follow. */
const $=s=>document.querySelector(s), canvas=$('#gl');
const ui={home:$('#home'),lobby:$('#lobby'),hud:$('#hud'),vrbar:$('#vrbar'),bottom:$('#bottomhelp'),error:$('#error'),toast:$('#toast'),end:$('#endPanel'),cross:$('#crosshair')};
const PALETTE={mint:[.54,.94,.63],pink:[1,.63,.77],lilac:[.74,.63,1],blue:[.51,.82,1],peach:[1,.78,.56],lime:[.79,.94,.46]};
const MAPS=WorldData.maps, WPN=WorldData.weapons;
function frogColor(code){if(typeof code==='string'&&/^rgb-[0-9]{3}$/.test(code))return [...code.slice(4)].map(n=>Number(n)/9);return PALETTE[code]||PALETTE.mint;}
function cssFrogColor(code){return 'rgb('+frogColor(code).map(n=>Math.round(n*255)).join(',')+')';}
const TAU=6.28318530718,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
let clientId='',room='',phase='home',remaining=0,mapIndex=0,round=0,chosenColor='mint',chosenName='Lil Frog',ws=null,me=null;
let remoteAnimation=new Map(),all=[],pickups=[],worldParts=[],worldBlood=[],partVisual=new Map(),fx=[],beams=[],rags=[],puddles=[],announcements=[],session=null,refSpace=null,referenceShift=0,rendererFrames=0;
let accountRecoveryCode='',profileReady=false,autoJoinRequested=false,autoJoinOnce=false,menuLatchState={armed:true,releasedAt:null,pressed:false};
let lastTick=0,lastNet=0,lastUI=0,lastBoard=0,vrPos={x:0,y:0,z:0},vel={x:0,y:0,z:0},grounded=true,prevHands={},vrInput={right:null,left:null},lastButtons={},pawContacts={},lastKnownHands={},lastTriggerBySide={left:0,right:0},lastMenuToggleAt=-1e9,lastJumpAt=-1e9,remoteSmooth=new Map();
let dx=0,dz=0,dy=0,lookYaw=0,lookPitch=0,keys={},inDesktop=false,noticeTimer=null;
let selectedVisibility='private',shopPending=null;
let clingState=FrogyCling.initial(),clingActive=false,clingClimb=0,clingLockUntil=0,clingSoundAt=0;
let lastMonsterAutoHopAt=-1e9;
let promoAnimation=null,lastWallAt={left:-Infinity,right:-Infinity};
let tongues={left:{active:false,readyAt:0},right:{active:false,readyAt:0}},currentMouth=null,pendingJumpAt=-Infinity,roundNotice=null,noticePaintAt=0,extraJumpUsed=false,rocketFlashAt=0,lastPalmPushOffAt=-1e9;
let lastBleedFX=0,lastHeartbeat=0,lastHandThump=0,vrMenuOpen=true,localPractice=false,practiceMonster=null,practiceMap=0,headHeight=1.65,lastPushAt=0,lastGroundAt=0,turnYaw=0,stickLatched=false,lastActiveMenu=false,missingControllerSince={left:0,right:0},trackingWarning="",xrRenderFailures=0;
let bodyTrack={yaw:0,pitch:0,lean:0,height:1.65};
let audio, profile={coins:0,inventory:[],equipped:{hat:'none',face:'none',back:'none'},color:'mint',bonus:0}, catalog=[],myVote=-1,nextMapIndex=0,activeTab='pond';
function isHub(){return FrogyMotion.isLobby(phase,me?.spectating);}
function sound(which=0){FrogyAudio.play(['ui','grab','hit','round','coin'][which]||'ui');}

function toast(t,delay=2500){ui.toast.textContent=t;ui.toast.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.toast.classList.remove('show'),delay);}
function send(obj){
 // The browser page is a VR launcher, never a desktop/mobile game.
 // Server still handles normal multiplayer profiles before headset entry.
 if(!session && !['hello','createRecoveryCode','recoverProfile'].includes(obj.type))return;
 if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));
}
// Account backup works from the Quest Browser launcher before VR starts.
const recoveryCreateButton=$('#createRecoveryGate'),recoveryRestoreButton=$('#restoreRecoveryButton');
if(recoveryCreateButton)recoveryCreateButton.onclick=()=>send({type:'createRecoveryCode'});
if(recoveryRestoreButton)recoveryRestoreButton.onclick=()=>{const code=$('#restoreRecoveryGate')?.value||'';send({type:'recoverProfile',code});};
function autoJoinPond(){if(!session||room||!profileReady||autoJoinRequested||autoJoinOnce||ws?.readyState!==WebSocket.OPEN)return;autoJoinRequested=true;autoJoinOnce=true;send({type:'public',name:profile.name||chosenName,color:profile.color||chosenColor});}
function connect(){if(ws&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(ws.readyState))return;ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');$('#connection').textContent='● CONNECTING';ws.onopen=()=>{$('#connection').innerHTML='<span class="dot"></span> POND ONLINE';$('#connection').classList.add('online');ui.error.textContent='';let token='';try{token=localStorage.getItem('frog-frog-profile')||'';}catch{}send({type:'hello',token});};ws.onclose=()=>{autoJoinRequested=false;profileReady=false;FrogVoice.disable();syncVoiceButtons();$('#connection').innerHTML='<span class="dot"></span> DISCONNECTED';$('#connection').classList.remove('online');if(room){toast('Connection lost. Reload to rejoin a lobby.',6000);}else setTimeout(connect,1800);};ws.onerror=()=>{ui.error.textContent='Could not reach the multiplayer server. Start server.js first.'};ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return;}receive(m);};}
function receive(m){switch(m.type){
 case 'error':autoJoinRequested=false;ui.error.textContent=m.message;toast(m.message);vrLast=-1;break;
 case 'roomResult':
  roomMessage=m.message||'Room request processed';roomMessageUntil=performance.now()+7000;
  toast((m.ok?'✓ ':'⚠ ')+roomMessage,5800);
  FrogyAudio.play(m.ok?'ui_confirm':'ui_error');vrLast=-1;break;
 case 'joined':autoJoinRequested=false;FrogVoice.onJoined();clientId=m.id;room=m.code;vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};prevHands={};pawContacts={};remoteSmooth.clear();selectedVisibility=m.visibility||'private';phase='lobby';myVote=-1;ui.home.classList.add('hidden');ui.lobby.classList.remove('hidden');$('#roomCode').textContent=room;ui.error.textContent='';toast('Welcome to the pond!');if(FrogVoice.enabled)send({type:'voice-ready',enabled:true});break;
 case 'left':autoJoinRequested=false;FrogVoice.onJoined();room='';phase='home';FrogyAudio.setMode('lobby');ui.home.classList.remove('hidden');ui.lobby.classList.add('hidden');ui.hud.classList.add('hidden');ui.vrbar.classList.add('hidden');ui.bottom.classList.add('hidden');document.body.classList.remove('in-game');break;
 case 'state':updateState(m);break;
 case 'sitOutConfirmed':vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;prevHands={};pawContacts={};vrMenuOpen=true;vrPage='pond';vrLast=-1;toast('You are in the waiting lobby until the next round.');break;
 case 'grabResult':if(!m.ok&&m.reason)toast(m.reason,1300);else FrogyAudio.play('grab');break;
 case 'partGrabbed':FrogyAudio.play('grab',{position:worldParts.find(p=>p.id===m.id),listener:vrPos});break;
 case 'partThrown':FrogyAudio.play('drop',{position:worldParts.find(p=>p.id===m.id),listener:vrPos});break;
 case 'colorResult':
  colorMessage=m.message||'Color request processed';colorMessageUntil=performance.now()+7000;
  if(m.ok){chosenColor=m.color;profile.color=m.color;if(me)me.color=m.color;
   for(const p of all)if(p.id===clientId)p.color=m.color;
   mirrorPaintAt=0;vrLast=-1;
   if(/^rgb-[0-9]{3}$/.test(m.color)){vrRgbDraft=m.color.slice(4);vrRgbEditing=false;}
   FrogyAudio.play('ui_confirm');}
  else FrogyAudio.play('error');
  toast((m.ok?'✓ ':'⚠ ')+colorMessage,4300);vrLast=-1;break;
 case 'shopResult':shopPending=null;renderShop();FrogyAudio.play(m.ok?'coin':'error');toast((m.ok?'🦗 ':'⚠️ ')+m.message,4200);if(document.querySelector('#shopStatus'))$('#shopStatus').textContent=m.message;break;
 case 'profile':profileReady=true;profile={...m};catalog=m.shop||catalog;chosenColor=m.color||'mint';if(me)me.color=chosenColor;mirrorPaintAt=0;shopPending=null;for(const b of document.querySelectorAll('#colors .swatch'))b.classList.toggle('active',b.dataset.color===chosenColor);try{localStorage.setItem('frog-frog-profile',m.token);}catch{}renderShop();renderCloset();$('#coinBalance').textContent=String(m.crickets??m.coins);if($('#dabloonBalance'))$('#dabloonBalance').textContent=String(m.dabloons||0);if(typeof renderSocialMenus==='function')renderSocialMenus();  if(m.name){chosenName=m.name;vrNameDraft=m.name;$('#name').value=m.name;}updateProfileDisplay();if($('#saveStatus'))$('#saveStatus').textContent=m.saveMode==='postgres'?'✅ Account saves to the server database':m.saveMode==='configured-disk'?'🟡 Server disk configured — verify it is persistent on Render':'⚠️ SERVER STORAGE IS TEMPORARY — ask the game owner to set up Render PostgreSQL';vrLast=-1;autoJoinPond();if(m.bonus){FrogyAudio.play('coin');$('#bonusNote').textContent='🦗 '+(m.bonus===500?'WELCOME BONUS':'DAILY LOGIN BONUS')+': +'+m.bonus+' CRICKETS!';toast((m.bonus===500?'WELCOME TO FROGY!':'DAILY HOP BONUS!')+' +'+m.bonus+' CRICKETS 🦗',3200);}break;
 case 'social':social={...m};if(typeof renderSocialMenus==='function')renderSocialMenus();vrLast=-1;break;
 case 'socialResult':case 'reportResult':case 'toolResult':toast(m.message||m.type,4000);if(typeof renderSocialMenus==='function')renderSocialMenus();vrLast=-1;break;
 case 'nameResult':
  if(m.ok){chosenName=m.name;vrNameDraft=m.name;vrNameEditing=false;FrogyAudio.play('ui_confirm');}else FrogyAudio.play('error');
  toast((m.ok?'✓ ':'⚠ ')+(m.message||'Name update'),4200);vrLast=-1;break;
 case 'hitConfirm':
  FrogyAudio.play('hit');toast(m.monster?'MONSTER HIT! Keep fighting!':'HIT CONFIRMED!',950);break;
 case 'recoveryCodeResult':
  if(m.ok){accountRecoveryCode=m.code||'';if($('#recoveryCodeDisplay'))$('#recoveryCodeDisplay').textContent='SAVE THIS SECRET: '+accountRecoveryCode; if($('#recoverGateStatus'))$('#recoverGateStatus').textContent='A new backup code was generated. Store it privately and never post it.';}
  toast(m.ok?'SAVE YOUR PRIVATE ACCOUNT BACKUP CODE!':m.message||'Could not generate backup code',5200);vrLast=-1;break;
 case 'recoveryResult':
  if($('#recoverGateStatus'))$('#recoverGateStatus').textContent=m.message||'Recovery attempt finished.';
  if(m.ok){room='';phase='home';autoJoinOnce=false;autoJoinRequested=false;ui.lobby.classList.add('hidden');ui.home.classList.remove('hidden');}
  toast(m.message||'Account recovery result',5000);vrLast=-1;break;
 case 'codeResult':if(m.ok)vrPromo='';toast((m.ok?'✓ ':'⚠️ ')+(m.message||'Code processed.'),4600);FrogyAudio.play(m.ok?'code_success':'error');promoAnimation={ok:!!m.ok,message:m.message||'Code processed',started:performance.now(),until:performance.now()+3800};vrLast=-1;break;
 case 'moderationResult':toast(m.message||'Moderation request complete',4000);FrogyAudio.play(m.ok?'ui_confirm':'error');vrLast=-1;break;
 case 'kicked':room='';phase='home';me=null;all=[];toast(m.message||'Removed from room',5500);vrMenuOpen=true;vrPage='pond';autoJoinRequested=false;autoJoinOnce=false;vrLast=-1;break;
 case 'questReward':toast('QUEST COMPLETE! +'+m.reward+' DABLOONS 🏴‍☠️',5000);FrogyAudio.play('coin');vrLast=-1;break;
 case 'toolActivated':
  if(m.id==='rocket'){vel.y=Math.max(vel.y,10.9);vrPos.y+=.12;grounded=false;pendingJumpAt=-Infinity;pawContacts={};prevHands={};rocketFlashAt=performance.now();}
  if(m.id==='doubleJump')extraJumpUsed=false;
  toast(m.message||'TOOL ACTIVATED',2800);FrogyAudio.play('round');vrLast=-1;break;
 case 'bogScare':
  if(FrogySettings.state.effects)showRoundNotice('monster','BEHIND YOU!','The bog is watching...',1700);
  FrogyAudio.play('roar');break;
 case 'toolFx':if(m.id!==clientId)FrogyAudio.play('round',{position:all.find(x=>x.id===m.id),listener:vrPos});break;
 case 'disguiseEnded':toast('The monster has revealed itself!',1800);break;
 case 'rtc':FrogVoice.signal(m.from,m.data);break;
 case 'voice-config':FrogVoice.configureIce(m.iceServers);break;
 case 'voice-ready':FrogVoice.peerReady(m.from,m.enabled);break;
 case 'voice-peers':FrogVoice.peersReady(m.ids);break;
 case 'peer-left':FrogVoice.peerLeft(m.from);break;
 case 'notice':toast(m.text,1800);break;
 case 'roundStart':clearFx();
  showRoundNotice(m.monster===clientId?'monster':'survivor',m.monster===clientId?'YOU ARE THE MONSTER':'YOU ARE A SURVIVOR',m.monster===clientId?'Hunt the frogs. Your time starts now.':'Hide, survive and defeat the monster.',6500);
  toast(m.monster===clientId?'YOU ARE THE MONSTER!':'YOU ARE A SURVIVOR!',4300);FrogyAudio.play('round');break;
 case 'roundEnd':{
  const names=Array.isArray(m.winners)?m.winners.map(x=>x.name).filter(Boolean):[];
  const title=m.winningTeam==='MONSTER'?'MONSTER WINS!':'SURVIVORS WIN!';
  const sub=names.length?'Winner'+(names.length===1?'':'s')+': '+names.join(', '):'Round complete';
  showRoundNotice('winner',title,sub,10500);FrogyAudio.play('round');$('#endTitle').textContent=title+' '+sub;$('#endSubtitle').textContent='Next round begins shortly…';ui.end.classList.remove('hidden');setTimeout(()=>ui.end.classList.add('hidden'),3500);toast(m.text,4500);sound(3);break;}
 case 'attackFx':attackFx(m);break;
 case 'dropFx':FrogyAudio.play('drop',{position:m,listener:vrPos});if(m.id===clientId)toast('Weapon dropped — grip nearby to grab again');break;
 case 'ouch':emitSplat(m.x,m.y,m.z,27,m.kind==='roar'?[.8,.5,1]:[.68,.023,.044]);FrogyAudio.play('hit',{position:m,listener:vrPos});break;
 case 'gore':severEffect(m);break;
 case 'pop':popFrog(m);FrogyAudio.play('death',{position:m,listener:vrPos});break;
 case 'pickupFx':emitSplat(m.x,.65,m.z,12,[1,.86,.46]);FrogyAudio.play('grab',{position:m,listener:vrPos});if(m.id===clientId){toast('PICKED UP '+(m.weapon==='blaster'?'LILY BLASTER! 🫧':'TOAD SLICER! 🔪'),1700);sound(0);}break;
 }}
function updateState(s){if(localPractice)return;const oldPhase=phase,oldMap=mapIndex,wasSpectating=!!me?.spectating;phase=s.phase;remaining=s.seconds;nextMapIndex=s.selectedMap??s.map;mapIndex=phase==='playing'?s.map:nextMapIndex;round=s.round||0;all=s.players;
 const animationNow=performance.now();
 for(const p of all){
  const old=remoteAnimation.get(p.id),delta=old?Math.max(.016,(animationNow-old.at)/1000):.10;
  const distance=old?Math.hypot(p.x-old.x,p.z-old.z):0;
  const next=distance>4?0:clamp(distance/delta/3.5,0,1);
  p.moveAmount=old?old.motion*.62+next*.38:0;
  remoteAnimation.set(p.id,{x:p.x,z:p.z,at:animationNow,motion:p.moveAmount});
 }
 for(const [id,v] of nameTags){if(!all.some(p=>p.id===id)){gl.deleteTexture(v.texture);nameTags.delete(id);}}pickups=s.pickups||[];worldParts=s.parts||[];worldBlood=s.blood||[];me=all.find(p=>p.id===clientId)||null;if(typeof renderSocialMenus==='function'&&Math.random()<.018)renderSocialMenus();if(phase==='playing'&&me?.spectating&&!wasSpectating){vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};prevHands={};pawContacts={};grounded=true;}FrogVoice.updateRoles(all);
 if(oldPhase!==phase){extraJumpUsed=false;if(typeof renderSocialMenus==='function')renderSocialMenus();FrogyAudio.setMode(phase==='playing'?'playing':'lobby');if(phase==='playing'){if(vrMenuOpen&&!['pond','inventory','quests','people','friends','codes','settings'].includes(vrPage))vrPage='pond';myVote=-1;ui.end.classList.add('hidden');ui.lobby.classList.add('hidden');ui.hud.classList.remove('hidden');ui.bottom.classList.remove('hidden');ui.vrbar.classList.remove('hidden');document.body.classList.add('in-game');$('#menuSettings').classList.remove('hidden');ui.cross.classList.remove('visible');if(me){vrPos.x=me.x;vrPos.y=0;vrPos.z=me.z;vel={x:0,y:0,z:0};prevHands={};pawContacts={};remoteSmooth.clear();lookYaw=0;}toast(me?.monster?'YOU ARE THE MONSTER FROG! 👹':'RUN, LITTLE FROG! 🐸',3400);}
 else if(phase==='countdown'){if(oldPhase==='playing'){vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;prevHands={};pawContacts={};}ui.hud.classList.add('hidden');ui.lobby.classList.remove('hidden');ui.vrbar.classList.add('hidden');ui.bottom.classList.add('hidden');document.body.classList.remove('in-game');}
 else if(phase==='intermission'){vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;prevHands={};pawContacts={};ui.hud.classList.remove('hidden');ui.lobby.classList.add('hidden');ui.vrbar.classList.remove('hidden');ui.bottom.classList.remove('hidden');}
 else if(phase==='lobby'){vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;prevHands={};pawContacts={};worldParts=[];worldBlood=[];partVisual.clear();ui.cross.classList.remove('visible');ui.hud.classList.add('hidden');ui.end.classList.add('hidden');ui.lobby.classList.remove('hidden');ui.bottom.classList.add('hidden');ui.vrbar.classList.add('hidden');document.body.classList.remove('in-game');$('#menuSettings').classList.add('hidden');}}
 if(oldMap!==mapIndex)lastBoard=0;FrogyAudio.setMap(mapIndex);
 if(phase==='lobby'||phase==='countdown'||phase==='intermission'){
 $('#roomVisibility').textContent=(s.visibility==='public'?'🌐 PUBLIC MATCH • '+s.online+' ONLINE':'🔒 PRIVATE ROOM');$('#lobbyTitle').textContent=phase==='countdown'?'ROUND STARTING...':phase==='intermission'?'ROUND OVER · VOTE!':'Waiting for frogs...';$('#lobbyCount').textContent=all.length+' / 8';$('#roomCode').textContent=room;
 $('#roster').innerHTML=all.map(p=>'<span class="frog"><b style="background:'+cssFrogColor(p.color)+'"></b>'+escapeHtml(p.name)+(p.id===s.host?' 👑':'')+'</span>').join('');
 $('#countdown').textContent=phase==='countdown'?'NEXT MATCH IN '+remaining+'s':phase==='intermission'?'VOTE NOW · NEXT ROUND IN ~'+(remaining+16)+'s':(all.length<2?'WAITING FOR 1 MORE FROG...':'GET READY...');
 for(const b of document.querySelectorAll('[data-map]')){b.classList.toggle('active',Number(b.dataset.map)===nextMapIndex);b.classList.toggle('voted',Number(b.dataset.map)===myVote);b.disabled=false;const votes=$('#votes'+b.dataset.map);if(votes)votes.textContent=String(s.votes?.[Number(b.dataset.map)]||0);}
 $('#mapHostNote').textContent='NEXT: '+MAPS[nextMapIndex].name.toUpperCase()+' · CHANGES NEXT ROUND';
 }
 updateHUD();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function updateHUD(){if(!me)return;const beast=all.find(p=>p.monster&&p.alive),danger=phase==='playing'&&!me.monster&&me.alive&&beast?Math.max(0,1-Math.hypot(me.x-beast.x,me.z-beast.z)/21):0;document.documentElement.style.setProperty('--fear',danger.toFixed(2));FrogyAudio.setFear(danger);if(danger>.42&&Date.now()-lastHeartbeat>Math.max(450,1300-danger*750)){lastHeartbeat=Date.now();sound(3);}$('#hudRoom').textContent='ROOM • '+room;$('#hudMap').textContent=MAPS[mapIndex].name;$('#hudStatus').textContent=phase==='playing'?'ROUND '+round:phase==='intermission'?'ROUND OVER':'LOBBY';$('#hudTime').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');$('#hudRole').textContent=!me.alive?'👻 OUT UNTIL NEXT ROUND':me.monster?'👹 MONSTER FROG':me.bleedSeconds>0?'🐸 SURVIVOR · HURT ('+me.bleedSeconds+'s)':'🐸 SURVIVOR FROG';$('#hudRole').classList.toggle('monster',me.monster);$('#grabHint').textContent=me.spectating?'WAITING UNTIL NEXT ROUND':me.heldPart?'RELEASE GRIP TO THROW':me.monster?'GRIP NEAR PART TO PICK UP · ELSE RIP/CHOMP':me.weapon==='none'?'GRIP NEAR WEAPONS OR PARTS':'RELEASE GRIP TO DROP / THROW';$('#hudWeapon').textContent=me.spectating?'WAITING FOR NEXT ROUND':me.monster?'👊 PUNCH · RIP · CHOMP · ROAR':me.weapon==='blaster'?'🔫 LILY BLASTER':me.weapon==='knife'?'🔪 TOAD SLICER':'🫧 FIND A WEAPON';}
function clearFx(){beams=[];fx=[];rags=[];puddles=[];worldParts=[];worldBlood=[];partVisual.clear();}
function lobbyName(){chosenName=$('#name').value.trim().slice(0,18)||'Lil Frog';}
$('#publicPlay').onclick=()=>{if(localPractice)stopPractice();lobbyName();send({type:'public',name:chosenName,color:chosenColor});};$('#publicAgain').onclick=()=>send({type:'publicHop',name:chosenName,color:profile.color});$('#create').onclick=()=>{lobbyName();send({type:'create',name:chosenName,color:chosenColor})};$('#join').onclick=()=>{lobbyName();send({type:'join',code:$('#codeInput').value.toUpperCase().trim(),name:chosenName,color:chosenColor})};$('#codeInput').onkeydown=e=>{if(e.key==='Enter')$('#join').click()};$('#colors').onclick=e=>{const b=e.target.closest('[data-color]');if(!b)return;chosenColor=b.dataset.color;document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('active',x===b))};$('#copyCode').onclick=()=>navigator.clipboard?.writeText(room).then(()=>toast('Room code copied!')).catch(()=>toast('Code: '+room));$('#mapSelect').onclick=e=>{const b=e.target.closest('[data-map]');if(b&&!b.disabled){myVote=Number(b.dataset.map);send({type:'vote',index:myVote});}};$('#leave').onclick=()=>{send({type:'leave'});if(session)session.end()};$('#showLobby').onclick=()=>{if(phase==='playing'){toast('Shop and room changes open between rounds!',2500);return;}ui.lobby.classList.toggle('hidden');if(!ui.lobby.classList.contains('hidden'))toast('Lobby: '+room,1500);};$('#enterVR').onclick=()=>enterVR();$('#playVR').onclick=()=>enterVR();
function updateProfileDisplay(){
 const e=$('#profileStats'),r=$('#rewardTimer');if(e)e.textContent='🏆 '+(profile.stats?.wins||0)+' wins  ·  ⚔ '+(profile.stats?.kills||0)+' eliminations  ·  '+(profile.stats?.rounds||0)+' rounds';
 if(r&&profile.nextRewardAt){const sec=Math.max(0,Math.ceil((profile.nextRewardAt-Date.now())/1000));r.textContent=sec?'🦗 Next +100 Crickets at Eastern midnight in '+Math.floor(sec/3600)+'h '+Math.floor(sec%3600/60)+'m':'🦗 Daily reward available after Eastern midnight';}
}
setInterval(updateProfileDisplay,30000);
$('#soundToggle').onclick=()=>{$('#soundToggle').textContent=FrogyAudio.toggle()?'🔊 SOUND ON':'🔇 SOUND OFF';};
document.addEventListener('pointerdown',e=>{if(e.target.closest('button')){FrogyAudio.unlock();FrogyAudio.play('ui');}},{capture:true});
// Connection begins after all engine modules finish loading.

// ——— WEBGL MICRO-ENGINE ———
const gl=canvas.getContext('webgl',{xrCompatible:true,antialias:true,alpha:false,preserveDrawingBuffer:false});
if(!gl){ui.error.textContent='WebGL is unsupported in this browser.';throw new Error('WebGL unavailable');}
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function makeProgram(vs,fs){let p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
const shapeProg=makeProgram('attribute vec3 aPos,aNorm;uniform mat4 uP,uV,uM;varying float vL,vD;varying vec3 vWorld,vN;void main(){vec4 world=uM*vec4(aPos,1.);vWorld=world.xyz;vN=normalize(mat3(uM)*aNorm);vL=.47+.70*max(0.,dot(vN,normalize(vec3(.24,.86,.44))));vec4 view=uV*world;vD=-view.z;gl_Position=uP*view;}','precision mediump float;uniform vec3 uC,uFog;uniform float uA,uG,uHub;varying float vL,vD;varying vec3 vWorld,vN;void main(){float glow=0.;if(uHub>.5){float a=distance(vWorld,vec3(-6.,3.1,-6.));float b=distance(vWorld,vec3(6.,3.1,-6.));float c=distance(vWorld,vec3(0.,3.1,13.));glow=.48/(1.+.045*a*a)+.48/(1.+.045*b*b)+.48/(1.+.045*c*c);}float rim=.10*pow(1.-abs(vN.y),2.);vec3 lit=uC*(min(2.1,vL+glow+rim+uG));lit+=vec3(.07,.055,.024)*glow;float fog=smoothstep(11.,49.,vD)*.88;gl_FragColor=vec4(mix(lit,uFog,fog),uA);}');
const linesProg=makeProgram('attribute vec3 aPos;uniform mat4 uP,uV;void main(){gl_Position=uP*uV*vec4(aPos,1.);}','precision mediump float;uniform vec4 uC;void main(){gl_FragColor=uC;}');
const texProg=makeProgram('attribute vec3 aPos;attribute vec2 aUV;uniform mat4 uP,uV,uM;varying vec2 vUV;void main(){vUV=aUV;gl_Position=uP*uV*uM*vec4(aPos,1.);}','precision mediump float;varying vec2 vUV;uniform sampler2D uTex;void main(){gl_FragColor=texture2D(uTex,vUV);}');
function info(p,n){return gl.getAttribLocation(p,n)}function loc(p,n){return gl.getUniformLocation(p,n)}
const sp={p:shapeProg,a:info(shapeProg,'aPos'),n:info(shapeProg,'aNorm'),pM:loc(shapeProg,'uP'),v:loc(shapeProg,'uV'),m:loc(shapeProg,'uM'),c:loc(shapeProg,'uC'),aU:loc(shapeProg,'uA'),g:loc(shapeProg,'uG'),fog:loc(shapeProg,'uFog'),hub:loc(shapeProg,'uHub')};
const lp={p:linesProg,a:info(linesProg,'aPos'),pM:loc(linesProg,'uP'),v:loc(linesProg,'uV'),c:loc(linesProg,'uC')};
const tp={p:texProg,a:info(texProg,'aPos'),uv:info(texProg,'aUV'),pM:loc(texProg,'uP'),v:loc(texProg,'uV'),m:loc(texProg,'uM'),tex:loc(texProg,'uTex')};
function mesh(v,n,idx){const vbo=gl.createBuffer(),nbo=gl.createBuffer(),ibo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(n),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);return {v:vbo,n:nbo,i:ibo,c:idx.length};}
function sphereMesh(rows=11,cols=15){let v=[],n=[],idx=[];for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){let u=Math.PI*r/rows,t=TAU*c/cols,x=Math.sin(u)*Math.cos(t),y=Math.cos(u),z=Math.sin(u)*Math.sin(t);v.push(x,y,z);n.push(x,y,z);}for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){let a=r*(cols+1)+c,b=a+cols+1;idx.push(a,b,a+1,b,b+1,a+1);}return mesh(v,n,idx);}
function cubeMesh(){let v=[],n=[],ix=[],faces=[[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],[[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],[[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],[[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],[[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]]];for(let f=0;f<6;f++){for(const p of faces[f][1]){v.push(...p);n.push(...faces[f][0]);}let i=f*4;ix.push(i,i+1,i+2,i,i+2,i+3);}return mesh(v,n,ix);}
const sph=sphereMesh(),box=cubeMesh(),wire=gl.createBuffer();
function mat(x,y,z,sx,sy,sz,yaw=0){let c=Math.cos(yaw),s=Math.sin(yaw);return new Float32Array([sx*c,0,-sx*s,0,0,sy,0,0,sz*s,0,sz*c,0,x,y,z,1]);}
function matTranslation(x,y,z){return mat(x,y,z,1,1,1);}
function mul(A,B){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=A[k*4+r]*B[c*4+k];o[c*4+r]=s;}return o;}
function perspective(fov,asp,near,far){const q=1/Math.tan(fov/2);return new Float32Array([q/asp,0,0,0,0,q,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);}
function lookAt(eye,tar){let f=norm([tar[0]-eye[0],tar[1]-eye[1],tar[2]-eye[2]]),right=norm([f[2]*-1,0,f[0]]),up=[-right[2]*f[1],right[0]*f[1]-right[2]*f[0]*0,right[0]*f[1]]; // reliable basis calculated below
 const z=norm([eye[0]-tar[0],eye[1]-tar[1],eye[2]-tar[2]]),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function norm(a){let l=Math.hypot(...a)||1;return a.map(v=>v/l)}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function oriented(a,b,w,d){let mid=a.map((v,i)=>(v+b[i])/2),axis=norm(b.map((v,i)=>v-a[i]));let other=Math.abs(axis[1])>.92?[1,0,0]:[0,1,0],xx=norm(cross(other,axis)),zz=cross(xx,axis),len=Math.hypot(...a.map((v,i)=>b[i]-v));return new Float32Array([xx[0]*w,xx[1]*w,xx[2]*w,0,axis[0]*len/2,axis[1]*len/2,axis[2]*len/2,0,zz[0]*d,zz[1]*d,zz[2]*d,0,mid[0],mid[1],mid[2],1]);}
let P,V;
function draw(m,mat4,col,glow=0,alpha=1){gl.useProgram(sp.p);gl.uniformMatrix4fv(sp.pM,false,P);gl.uniformMatrix4fv(sp.v,false,V);gl.uniformMatrix4fv(sp.m,false,mat4);gl.uniform3fv(sp.c,col);gl.uniform1f(sp.aU,alpha);gl.uniform1f(sp.g,glow);gl.uniform3fv(sp.fog,isHub()?[.06,.10,.088]:MAPS[mapIndex].fog);gl.uniform1f(sp.hub,isHub()?1:0);gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.enableVertexAttribArray(sp.a);gl.vertexAttribPointer(sp.a,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.enableVertexAttribArray(sp.n);gl.vertexAttribPointer(sp.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);gl.drawElements(gl.TRIANGLES,m.c,gl.UNSIGNED_SHORT,0);}
function ball(x,y,z,sx,sy,sz,c,g=0,a=1,yaw=0){draw(sph,mat(x,y,z,sx,sy,sz,yaw),c,g,a)}
function block(x,y,z,sx,sy,sz,c,yaw=0){draw(box,mat(x,y,z,sx,sy,sz,yaw),c)}
function rod(a,b,r,color){draw(sph,oriented(a,b,r,r),color)}
function lines(arr,col){if(arr.length<6)return;gl.useProgram(lp.p);gl.uniformMatrix4fv(lp.pM,false,P);gl.uniformMatrix4fv(lp.v,false,V);gl.uniform4fv(lp.c,col);gl.bindBuffer(gl.ARRAY_BUFFER,wire);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(lp.a);gl.vertexAttribPointer(lp.a,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.LINES,0,arr.length/3)}
function setAlpha(on,add=false){if(on){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,add?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}else{gl.disable(gl.BLEND);gl.depthMask(true)}}
// Procedural horror worlds, 130 m across. Deterministic terrain and shared solid hiding cover.
function hash(i){return (Math.sin(i*91.233+3.8)*12451.5)%1}
function rnd(i){return Math.abs(hash(i))}
function obstacles(t){return MAPS[t].cover}
const grassByMap=[];
function makeGrassMesh(t){const verts=[],normals=[],idx=[],count=t===2?4200:9400,rd=i=>rnd(i*1.351+t*713.3),W=WorldData.SIZE-1.3;
 for(let i=0;i<count;i++){const x=(rd(i+11)-.5)*W*2,z=(rd(i+251)-.5)*W*2;if(Math.hypot(x,z)>W-.5)continue;
  if(t===2&&Math.abs(x)<51&&Math.abs(z)<51)continue;
  const h=(t===0?.22:t===1?.16:.12)+rd(i+111)*.30,w=.045+rd(i+98)*.056,a=rd(i+65)*TAU,c=Math.cos(a),d=Math.sin(a),base=verts.length/3;
  verts.push(x-c*w,0,z-d*w,x+c*w,0,z+d*w,x+.07*d,h,z-.07*c);
  normals.push(0,1,0,0,1,0,0,1,0);idx.push(base,base+1,base+2);
 }
 return mesh(verts,normals,idx);
}
function treeProp(o,t){const x=o.x,z=o.z,h=o.h,c=t===0?[.15,.13,.14]:[.17,.18,.21];
 rod([x,.05,z],[x,h,z],o.r*.54,c);
 for(let n=0;n<3;n++){const a=o.rot+n*2.15,ey=h*(.69+.065*n),q=[x+Math.sin(a)*o.r*(1.45+n*.18),h*(.9+n*.04),z+Math.cos(a)*o.r*(1.45+n*.18)];rod([x,ey,z],q,o.r*.18,c);
  if(t===0){ball(q[0],q[1],q[2],o.r*.9,.45,o.r*.82,[.06,.19,.15]);rod(q,[q[0],q[1]-.6,q[2]],.027,[.14,.26,.18]);}}
 for(let n=0;n<3;n++){let a=o.rot+n*2.1;rod([x,.42,z],[x+Math.sin(a)*o.r*1.35,.12,z+Math.cos(a)*o.r*1.35],.13,[.16,.12,.12]);}
 if(t===0){ball(x,h+.12,z,o.r*1.05,.55,o.r*1.05,[.065,.19,.16]);ball(x,h+.45,z,o.r*.8,.43,o.r*.82,[.05,.15,.13]);}}
// Half-sunk hunting shacks: broken boards, sagging roof and dark entrances.
function shackProp(o){const x=o.x,z=o.z,r=o.r,h=o.h,wood=[.19,.17,.14],splinter=[.26,.21,.16];
 block(x,.18,z,r*.87,.14,r*.69,[.09,.10,.09]);
 for(const side of [-1,1]){block(x+side*r*.83,h*.36,z,r*.095,h*.38,r*.66,wood);block(x,h*.36,z+side*r*.6,r*.80,h*.36,r*.075,wood);}
 // A pitch-black doorway with thick frame, plus boards missing from the front wall.
 block(x,h*.34,z-r*.675,r*.29,h*.37,.027,[.018,.027,.029]);
 for(const side of [-1,1])rod([x+side*r*.31,.05,z-r*.73],[x+side*r*.31,h*.77,z-r*.73],.11,splinter);
 rod([x-r*.36,h*.76,z-r*.74],[x+r*.36,h*.76,z-r*.74],.11,splinter);
 block(x,h*.85,z,r*.98,.14,r*.78,[.12,.14,.14],o.rot*.035);
 for(let i=0;i<7;i++){let xx=x-r*.75+i*r*.25;block(xx,h*.94,z,.019,.13,r*.81,i%3?[.22,.19,.17]:[.12,.13,.12],o.rot*.03);}
 // The haunted window and derelict porch.
 for(const side of [-1,1]){block(x+side*r*.63,h*.45,z-r*.69,r*.16,h*.13,.018,[.03,.04,.04]);rod([x+side*r*.56,h*.20,z-r*.74],[x+side*r*.56,h*.65,z-r*.74],.04,[.29,.27,.23]);}
 for(let i=0;i<5;i++)block(x-r*.64+i*r*.34,.11,z-r*.92,r*.13,.046,r*.18,splinter,Math.sin(i)*.07);
 ball(x,.02,z-r*1.2,r*.68,.05,.28,[.065,.075,.072]);
}
function chapelProp(o){const {x,z,r}=o;
 // Hollow, ruined gothic chapel shell; thick walls are solid cover for hide-and-seek.
 const stone=[.19,.18,.24],roof=[.085,.074,.102];
 block(x,2.85,z,r*.84,2.82,r*.64,stone);
 block(x,5.85,z,r*.98,.54,r*.80,roof);
 // Pointed spire and broken buttresses make this map unmistakably cemetery-like.
 for(const side of [-1,1]){
  for(const dz of [-.5,.1,.6]){
   const zz=z+dz*r;block(x+side*r*.97,2.35,zz,.36,2.25,.46,[.23,.22,.28]);
   rod([x+side*r*.97,4.65,zz],[x+side*r*1.10,5.35,zz],.18,[.25,.25,.29]);
  }
 }
 block(x,8.7,z,r*.21,2.6,r*.22,[.13,.12,.19]);
 rod([x,11.3,z],[x,12.6,z],.20,[.28,.27,.32]);
 rod([x-.7,12.05,z],[x+.7,12.05,z],.16,[.28,.27,.32]);
 // Door and high stained windows are visual detail, not openings through collision.
 block(x,1.65,z-r*.655,1.32,1.68,.055,[.017,.018,.027]);
 for(const side of [-1,1]){block(x+side*3.35,3.55,z-r*.66,.72,1.18,.059,[.10,.19,.28]);block(x+side*3.35,4.33,z-r*.70,.13,.67,.07,[.35,.22,.30]);}
}
function graveProp(o){const {x,z,r,h,type}=o;if(type==='tree'){treeProp(o,1);return;}if(type==='chapel'){chapelProp(o);return;}
 if(type==='crypt'){block(x,1.4,z,r,1.4,r,[.22,.25,.29]);block(x,3.05,z,r*1.16,.3,r*1.16,[.12,.16,.2]);for(const side of [-1,1]){rod([x+side*r*.75,.15,z-r*.87],[x+side*r*.75,2.6,z-r*.87],.19,[.37,.39,.41]);}ball(x,1.15,z-r-.045,.43,.7,.05,[.02,.04,.05]);ball(x,1.15,z-r-.1,.18,.35,.03,[.19,.55,.48],.3);return;}
 block(x,h*.25,z,r*.7,h*.25,r*.37,[.23,.26,.29],o.rot);ball(x,h*.53,z,r*.72,.25,r*.4,[.32,.35,.39]);
 if(rnd(x*39+z)> .65){rod([x,h*.63,z],[x,h*.91,z],r*.16,[.28,.29,.32]);block(x,h*.82,z,r*.43,r*.10,r*.13,[.36,.37,.38]);}
 ball(x,.05,z,r*1.25,.04,r*1.1,[.10,.13,.12]);}
function facilityProp(o){const {x,z,r,h,type}=o;const metal=[.22,.30,.31];
 if(type==='labwall'){
  block(x,h*.5,z,o.rot>1?r*.34:r*1.08,h*.50,o.rot>1?r*1.08:r*.34,[.23,.25,.26]);
  block(x,h-.28,z,o.rot>1?r*.38:r*1.12,.20,o.rot>1?r*1.12:r*.38,[.10,.12,.14]);
  block(x,2.5,z,o.rot>1?r*.39:r*1.16,.095,o.rot>1?r*1.16:r*.39,[.30,.36,.34]);return;
 }
 if(type==='reactor'){
  block(x,2.7,z,r*.92,2.7,r*.92,[.18,.22,.23]);
  for(let i=0;i<5;i++){let a=i*TAU/5;rod([x+Math.cos(a)*r*.75,.2,z+Math.sin(a)*r*.75],[x+Math.cos(a)*r*.75,7.2,z+Math.sin(a)*r*.75],.29,[.41,.41,.38]);}
  ball(x,5.2,z,1.85,1.5,1.85,[.30,.59,.41],.38);ball(x,7.1,z,2.35,.30,2.35,[.15,.16,.17]);return;
 }
 if(type==='crate'){
  block(x,h*.25,z,r,h*.25,r,[.17,.21,.23],o.rot);block(x,h*.61,z,r*.95,h*.12,r*.95,[.31,.34,.32],o.rot);
  for(const a of [-1,1]){rod([x+a*r*.88,0,z-r*.88],[x+a*r*.88,h*.56,z-r*.88],.06,[.53,.52,.38]);}
  ball(x,h*.65,z,.13,.13,.13,[.85,.39,.21],.15);
 }else if(type==='tank'){block(x,h*.4,z,r*.85,h*.4,r*.85,metal);ball(x,h*.83,z,r*.87,.3,r*.87,[.35,.45,.42]);for(const dy of [.38,.62])ball(x,h*dy,z,r*.92,.04,r*.92,[.64,.51,.27]);rod([x+r,.5,z],[x+r,.5,z+r*1.4],.14,[.35,.4,.38]);}
 else{for(const side of [-1,1])rod([x+side*r*.66,.1,z],[x+side*r*.66,h,z],.19,[.29,.38,.37]);block(x,h,z,r*.85,.13,r*.85,metal);rod([x,h,z],[x,h+1.4,z],.08,[.35,.42,.44]);ball(x,h+1.45,z,.21,.21,.21,[.91,.16,.15],.7);}}
function terrain(t){const m=MAPS[t],W=WorldData.SIZE;
 block(0,-.43,0,W,.43,W,m.ground);block(0,-.95,0,W+.9,.16,W+.9,[.035,.055,.056]);
 if(FrogySettings.state.graphics==='high'){if(!grassByMap[t])grassByMap[t]=makeGrassMesh(t);draw(grassByMap[t],mat(0,.012,0,1,1,1),t===0?[.17,.28,.21]:t===1?[.23,.23,.22]:[.18,.25,.22]);}
 // Batched leaf litter, thick grass, bracken, wet gravel and ruined debris.
 // Rounded terrain, rubble clusters and mud instead of a smooth box floor.
 for(let j=0;j<225;j++){let angle=rnd(j*9.31+t*62)*TAU,r=Math.sqrt(rnd(j*11.17+t*84))*59,x=Math.cos(angle)*r,z=Math.sin(angle)*r;if(Math.hypot(x,z)<5||Math.hypot(x-vrPos.x,z-vrPos.z)>37)continue;
  const col=t===0?(j%3?[.075,.15,.12]:[.14,.17,.15]):t===1?(j%3?[.15,.16,.16]:[.12,.13,.15]):(j%3?[.11,.16,.17]:[.16,.18,.16]);
  ball(x,.018,z,.4+rnd(j)*1.35,.033,.35+rnd(j*2)*1.25,col);if(j%7===0)ball(x,.11,z,.22,.13,.29,t===0?[.24,.33,.22]:[.18,.22,.24]);}
 if(FrogySettings.state.graphics!=='low')FrogyDetails.draw(t);
 FrogyLandmarks.draw(t);
 for(const o of obstacles(t)){
  const away=Math.hypot(o.x-vrPos.x,o.z-vrPos.z);if(away>48)continue;
  if(away>23){if(t===0){rod([o.x,0,o.z],[o.x,Math.min(o.h,4),o.z],.20,[.11,.13,.12]);if(o.type==='tree')ball(o.x,o.h*.9,o.z,o.r*.75,.60,o.r*.75,[.06,.13,.11]);else block(o.x,o.h*.35,o.z,o.r*.84,o.h*.34,o.r*.8,[.16,.17,.15]);}
   else if(t===1)block(o.x,Math.min(o.h,2)*.48,o.z,o.r*.75,Math.min(o.h,2)*.48,o.r*.66,[.20,.21,.25]);
   else block(o.x,Math.min(o.h,3)*.5,o.z,o.r*.85,Math.min(o.h,3)*.5,o.r*.85,[.19,.23,.24]);
   continue;}
  if(t===0){if(o.type==='tree')treeProp(o,t);else if(o.type==='shack')shackProp(o);else{ball(o.x,o.h*.25,o.z,o.r*.9,o.h*.26,o.r*.9,[.18,.23,.22]);ball(o.x,o.h*.53,o.z,o.r*.97,o.h*.2,o.r*.9,[.11,.23,.17]);}}
  else if(t===1)graveProp(o);else facilityProp(o);
 }
 // Dense perimeter treeline, crumbling fence and ruined floodlights.
 for(let j=0;j<84;j++){const a=j/84*TAU,x=Math.cos(a)*64,z=Math.sin(a)*64;
   if(Math.hypot(x-vrPos.x,z-vrPos.z)>52)continue;
   if(t===0){rod([x,.0,z],[x,3.5+rnd(j)*2,z],.26,[.11,.17,.16]);ball(x,4.2+rnd(j),z,1.25,1.35,1.25,[.055,.11,.11]);}
   else if(t===1){rod([x,.03,z],[x,2.4,z],.09,[.2,.25,.27]);ball(x,2.45,z,.13,.13,.13,[.29,.34,.34]);}
   else{rod([x,.05,z],[x,2.7,z],.10,[.21,.30,.31]);if(j%4===0)ball(x,2.65,z,.22,.19,.22,[.68,.22,.16],.35);}}
 if(t===0){
  for(const [x,z,sc] of [[-16,5,1.8],[13,-19,1.4],[29,18,1.3]]){ball(x,.018,z,sc*3,.055,sc*2.4,[.055,.16,.16]);ball(x,.039,z,sc*2.2,.052,sc*1.7,[.08,.22,.21],.08);for(let j=0;j<5;j++){let a=j*TAU/5;rod([x+Math.cos(a)*sc*2,.01,z+Math.sin(a)*sc],[x+Math.cos(a)*sc*2,.55,z+Math.sin(a)*sc],.04,[.27,.30,.19]);}}
  // abandoned bog walkway
  for(let j=0;j<11;j++)block(-26+j*.92,.13,-5+j*.11,.42,.10,1.05,[.18,.16,.13],Math.sin(j)*.1);
 }else if(t===1){
  for(let i=0;i<16;i++){const x=-37+i*4.7;block(x,.025,1.8,1.24,.04,.8,[.16,.16,.17]);}
  for(const [x,z] of [[-26,-15],[28,15],[0,-32]]){rod([x,.1,z],[x,4.7,z],.14,[.27,.29,.31]);ball(x,4.8,z,.36,.32,.36,[.61,.69,.72],.2);}
 }else{
  // Abandoned lab walkway, rusted ventilation units and hazard beams.
  block(0,.035,0,13,.065,13,[.15,.18,.18]);for(let j=-5;j<=5;j++){block(j*2.25,.072,-3,.037,.02,12,[.32,.35,.32]);}
  for(const [x,z] of [[-22,-25],[26,18],[-24,26]]){rod([x,0,z],[x,7,z],.16,[.20,.29,.30]);block(x,7,z,1.15,.22,.75,[.33,.38,.35]);ball(x,6.75,z-.6,.38,.14,.16,[.94,.63,.25],.85);}
  for(let j=0;j<12;j++){const x=-37+(j%6)*14,z=j<6?-34:34;ball(x,.09,z,.55,.17,.72,[.17,.22,.25]);}}
 // Extra per-map scene dressing: always different geometry, optimized for Quest.
 if(FrogySettings.state.graphics!=='low'){
  for(let j=0;j<21;j++){
   const a=(j*2.4+1)*TAU/21,r=18+(j%5)*8,x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(Math.hypot(x-vrPos.x,z-vrPos.z)>42)continue;
   if(t===0){ // Wet swamp lily clusters and fireflies by the water channels.
    ball(x,.047,z,.30+(j%3)*.12,.018,.28+(j%2)*.12,[.09,.23,.13]);
    ball(x+.12,.073,z-.12,.10,.037,.11,[.15,.35,.22]);
    if(j%3===0)ball(x+.4,.85,z-.2,.055,.085,.04,[.48,.77,.38],.22);
   }else if(t===1){ // Cemetery lanterns, cool candlelight and scarred stone.
    block(x,.11,z,.24,.12,.22,[.25,.25,.28]);
    rod([x,.17,z],[x,.77,z],.043,[.28,.31,.32]);
    ball(x,.83,z,.12,.17,.12,j%2?[.90,.70,.34]:[.65,.77,.86],.35);
   }else{ // Industrial warning stripes, red beacons and cable assemblies.
    block(x,.028,z,.56,.025,.095,[.57,.41,.13],j*.4);
    rod([x,.02,z],[x,.84,z+.25],.062,[.22,.27,.30]);
    if(j%3===0)ball(x,.93,z+.26,.13,.11,.12,[.75,.09,.08],.48);
   }
  }
 }
 // Distant, dim moon / distant light
 ball(t===2?-44:30,25,-84,3.4,3.4,.35,t===1?[.56,.62,.71]:[.42,.65,.59],.09);
}
function weather(t){let r=[];for(let i=0;i<240;i++){const x=(rnd(i*17+9)-.5)*124,z=(rnd(i*19+31)-.5)*124,y=((rnd(i*13+3)*8-t*(mapIndex===0?3.1:1.1))%8+8)%8+.4;if(mapIndex===0){r.push(x,y,z,x-.075,y-.43,z+.06);}else if(mapIndex===1&&i%3===0){r.push(x,y*.45,z,x+.15,y*.45+.025,z+.14);}else if(mapIndex===2&&i%5===0){r.push(x,y*.6,z,x+.03,y*.6+.12,z);}}
 lines(r,mapIndex===0?[.26,.44,.45,.19]:mapIndex===1?[.59,.6,.67,.10]:[.58,.73,.66,.12]);}
// Frog models: big eyes, squishy cheeks, smiles, three tiny fingers and silly boots.
function transform(p,ox,oy,oz,scale=1){let yaw=p.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);return [p.x+(ox*c+oz*s)*scale,p.y+oy*scale,p.z+(-ox*s+oz*c)*scale]}
function dotBall(p,x,y,z,rx,ry,rz,color,scale=1,glow=0){const q=transform(p,x,y,z,scale);ball(q[0],q[1],q[2],rx*scale,ry*scale,rz*scale,color,glow,1,p.yaw||0)}

const angNorm=a=>Math.atan2(Math.sin(a),Math.cos(a));
const mix=(a,b,t)=>a+(b-a)*t;
function frogIdle(id,t){
 const seed=(parseInt(String(id).replace(/\D/g,''),10)||1)*.173;
 const blinkPhase=(t*0.16+seed)%1;
 const blink=(blinkPhase>.965||blinkPhase<.018)?0.12:1;
 const doubleBlink=Math.sin(t*3.5+seed*31)>.997?0.28:1;
 const lick=Math.sin(t*.013+seed*7.7)>.99935?1:0;
 return {blink:Math.min(blink,doubleBlink),lick};
}
function elbowFor(shoulder,hand,side=1,bend=.34){
 const dx=hand[0]-shoulder[0],dy=hand[1]-shoulder[1],dz=hand[2]-shoulder[2];
 const dist=Math.max(.001,Math.hypot(dx,dy,dz));
 const mx=(shoulder[0]+hand[0])*.5,my=(shoulder[1]+hand[1])*.5,mz=(shoulder[2]+hand[2])*.5;
 const sideVec=[-dz/dist,0,dx/dist];
 const up=Math.max(.04,.14-Math.abs(dy)*.08)+bend*.05;
 return [mx+sideVec[0]*bend*side,my+up,mz+sideVec[2]*bend*side];
}
function handPoseFromButtons(buttons={}){
 const thumb=clamp(Math.max(buttons.thumbA||0,buttons.thumbB||0),0,1);
 const outer=clamp(buttons.grip||0,0,1);
 const trigger=clamp(buttons.trigger||0,0,1);
 return [thumb,outer,trigger];
}
function trackedBodyPose(viewPose,dt){
 if(!viewPose)return bodyTrack;
 const vm=viewPose.transform.matrix;
 const gaze=FrogyControls.rotate(-vm[8],-vm[10],turnYaw);
 const yaw=Math.atan2(-gaze[0],-gaze[1]);
 const pitch=Math.asin(clamp(-vm[9],-.92,.92));
 const targetLean=clamp(gaze[0]*.09,-.09,.09);
 const targetPitch=clamp(pitch*.36,-.16,.16);
 const yawDiff=angNorm(yaw-bodyTrack.yaw);
 const follow=Math.abs(yawDiff)>.26?0.22:0.08;
 bodyTrack.yaw=angNorm(bodyTrack.yaw+yawDiff*Math.min(1,dt*(follow*18)));
 bodyTrack.pitch=mix(bodyTrack.pitch,targetPitch,Math.min(1,dt*7.5));
 bodyTrack.lean=mix(bodyTrack.lean,targetLean,Math.min(1,dt*7.5));
 bodyTrack.height=mix(bodyTrack.height,clamp(vm[13]+referenceShift,1.05,2.15),Math.min(1,dt*4.5));
 return bodyTrack;
}
// v16.1 smooth three-digit paws: one palm with a real webbed thumb and two
// tapered fingers. Uses full WebXR grip orientation (including pitch and roll),
// not the avatar's yaw. Point the controller down => the fingers point down.
// The geometry is intentionally small/light enough to render on Quest.
function paw(pos,s,color,orientation=0,pose=[0,0,0]){
 const c=color||PALETTE.mint;
 const dark=c.map(n=>Math.max(0,n*.78)),light=c.map(n=>Math.min(1,n*.88+.12));
 const [thumbCurl=0,outerCurl=0,triggerCurl=0]=pose||[0,0,0];
 const basis=FrogyPawPose.valid(orientation)?orientation:(()=>{
  const yaw=Number.isFinite(orientation)?orientation:0,C=Math.cos(yaw),S=Math.sin(yaw);
  return [C,0,-S,0,1,0,S,0,C];
 })();
 const at=(x,y,z)=>FrogyPawPose.point(pos,basis,[x*s,y*s,z*s]);
 const b=(x,y,z,rx,ry,rz,col)=>{
  const p=at(x,y,z),a=basis;
  draw(sph,new Float32Array([a[0]*rx*s,a[1]*rx*s,a[2]*rx*s,0,
   a[3]*ry*s,a[4]*ry*s,a[5]*ry*s,0,a[6]*rz*s,a[7]*rz*s,a[8]*rz*s,0,
   p[0],p[1],p[2],1]),col);
 };
 const finger=(base,mid,tip,w,col,curl=0)=>{
  const m=[mix(base[0],mid[0],1),mix(base[1],mid[1],1-curl*.35),mix(base[2],mid[2],1+curl*.22)];
  const t=[mix(mid[0],tip[0],1),mix(mid[1],tip[1],1-curl*.62),mix(mid[2],tip[2],1+curl*.48)];
  rod(at(...base),at(...m),w*s,col);
  rod(at(...m),at(...t),w*.92*s,col);
  b(...t,w*.95,w*.82,w*.82,light);
 };
 // Frog hand model: proportions inspired by Gorilla Tag reach, but with the
 // cute three-finger frog styling from the reference image.
 // Three digits TOTAL: thumb + outer finger + trigger finger.
 b(0,-.12,.03,.12,.20,.13,dark);
 b(0,.02,0,.23,.20,.15,c);
 b(-.12,.16,-.02,.10,.12,.09,c);
 b(.11,.18,-.03,.11,.12,.09,c);
 finger([-.15,.03,.02],[-.27,.13,.02],[-.36,.17,.05],.082,c,thumbCurl);
 finger([-.07,.19,-.01],[-.11,.35,-.03],[-.15,.49,-.06],.089,c,outerCurl);
 finger([.08,.20,-.01],[.10,.36,-.04],[.12,.50,-.08],.091,c,triggerCurl);
 b(-.16,.49,-.095,.054,.032,.018,light);
 b(.12,.50,-.11,.056,.032,.018,light);
 b(-.36,.17,.03,.05,.03,.02,light);
}


function frog(p,t,showWeapon=true){
 if(phase==='playing'&&Math.hypot(vrPos.x-p.x,vrPos.z-p.z)>80){if(p.alive!==false){const c=p.monster?[.20,.31,.27]:frogColor(p.color);ball(p.x,p.y+1.0,p.z,p.monster?1.32:.57,p.monster?1.65:1.05,p.monster?1.13:.56,c);}return;}
 const monster=!!p.monster,color=monster?[.20,.31,.27]:frogColor(p.color),sc=monster?1.83:.94,move=clamp(p.moveAmount||0,0,1),bob=Math.sin(t*2.5+(+p.id||1))*.026+Math.sin(t*9+(+p.id||1))*.033*move;
 const bodyYaw=Number.isFinite(p.bodyYaw)?p.bodyYaw:p.yaw,bodyPitch=Number.isFinite(p.bodyPitch)?p.bodyPitch:0,bodyLean=Number.isFinite(p.bodyLean)?p.bodyLean:0,bodyLift=Number.isFinite(p.bodyLift)?p.bodyLift:0;
 const bodyP={...p,yaw:bodyYaw,y:p.y+bodyLift};
 const idle=frogIdle(p.id,t);
 const speech=clamp(Number(p.mouth)||0,0,1),pulse=speech?(.86+.14*Math.sin(t*22+(+p.id||1))):0,open=monster?Math.max(.30,speech*pulse):Math.max(.045,speech*pulse);const bulge=open*(monster?.40:.31);
 if(p.alive===false)return; // eliminated frogs return on the next round
 // V16 CUDDLEFROG: rounded modular avatar. A compact pear-shaped legless
 // body, oversized squishy head, soft cheeks, round glossy eyes and webbed paws.
 // Simple clean shapes stay readable under cosmetics and different skin colors.
 const shade=color.map(v=>v*.83),light=color.map(v=>Math.min(1,v*.74+.25));
 const cream=monster?[.32,.28,.23]:[.91,.93,.75];
 const faceDepth=-.56,eyebob=bob*.5;
 // A soft shadow and an elastic, seamless plush-toy silhouette.
 ball(p.x,.013,p.z,.42*sc,.015,.40*sc,[.023,.048,.048]);
 dotBall(bodyP,0,.70+bob*.22,.035+bodyPitch*.16,.48,.65,.415,shade,sc);
 dotBall(bodyP,0,.86+bob*.23,-.10+bodyPitch*.22,.475,.66,.41,color,sc);
 dotBall(bodyP,0,.66+bob*.20,-.54,.34,.405,.075,cream,sc);
 // Tiny decorative legs/feet are cosmetic only. Locomotion stays arm-driven.
 for(const side of [-1,1]){
  dotBall(bodyP,side*.255,.26+bob*.12,.045,.115,.22,.125,color,sc);
  dotBall(bodyP,side*.255,.105+bob*.10,-.145,.17,.095,.215,light,sc);
 }
 // Wide head with two raised frog-eye humps, a rounded muzzle and cheeks.
 dotBall(p,0,1.45+eyebob,-.07,.61,.51,.48,color,sc);
 dotBall(p,0,1.28+eyebob,-.44,.48,.25,.20,light,sc);
 for(const side of [-1,1]){
  const x=side*.34;
  dotBall(p,x,1.82+eyebob,-.32,.285,.31,.27,shade,sc);
  dotBall(p,x,1.83+eyebob,-.40,.264,.285,.245,color,sc);
  // Soft white sclera, calm dark pupils, two reflective highlights.
  const blink=idle.blink;
  dotBall(p,x,1.82+eyebob,-.59,.205,.22*blink,.11,monster?[.82,.78,.65]:[.995,.995,.98],sc);
  dotBall(p,x-side*.035,1.815+eyebob,-.688,.104,.126*blink,.045,monster?[.74,.12,.11]:[.12,.22,.22],sc);
  dotBall(p,x-side*.052,1.88+eyebob,-.725,.038,.045*blink,.015,[1,1,1],sc);
  dotBall(p,side*.47,1.35+eyebob,-.50,.115,.073,.038,monster?[.41,.11,.12]:[.96,.59,.64],sc);
  // Finger-sized nostrils and smiling folds make the face expressive.
  dotBall(p,side*.13,1.49+eyebob,-.665,.028,.019,.014,monster?[.07,.12,.10]:shade,sc);
 }
 const spread=monster?.38:.27,opening=monster?Math.max(.21,open):Math.max(.035,open);
 // Talking mouth expands rather than detaching from the face.
 dotBall(p,0,1.25+eyebob,-.665,.25+opening*.15,.050+opening*.29,.039,[.075,.065,.073],sc);
 dotBall(p,0,1.18+eyebob-opening*.07,-.699,.14,.012+opening*.115,.021,monster?[.81,.12,.11]:[.88,.42,.52],sc);
 if(idle.lick&&!monster){dotBall(p,0,1.17+eyebob,-.78,.06,.018,.14,[.96,.54,.70],sc);}
 if(monster){
  // One silhouette language, but still clearly an imposing Mega Frog.
  for(const side of [-1,1]){
   dotBall(p,side*.53,2.12+eyebob,-.09,.20,.30,.19,[.20,.25,.20],sc);
   dotBall(p,side*.56,2.32+eyebob,-.10,.08,.18,.10,[.57,.12,.17],sc);
  }
  for(let i=-3;i<=3;i++){
   dotBall(p,i*.095,1.30+eyebob,-.73,.040,.075+opening*.05,.042,[.85,.80,.66],sc);
   dotBall(p,i*.095,1.07+eyebob-opening*.2,-.71,.036,.070,.041,[.83,.76,.60],sc);
  }
  dotBall(p,0,.88,-.47,.24,.20,.10,[.27,.22,.19],sc);
 }else{
  // Friendly expressive brow mounds without permanent angry eyebrows.
  for(const side of [-1,1])dotBall(p,side*.33,2.105+eyebob,-.46,.215,.055,.08,light,sc);
 }
 cosmeticModel(p,sc);
 // Gorilla Tag-style arms: two joints, visible paws and tracked reach.
 for(const side of [-1,1]){
  const shoulder=transform(bodyP,side*.395+bodyLean*side*.08,1.02+bob*.22,-.03,sc);
  const tracked=side<0?p.l:p.rr,hand=tracked&&tracked.length===3&&Math.hypot(tracked[0]-p.x,tracked[2]-p.z)<2.8*sc?tracked:transform(bodyP,side*.90,.64,-.34,sc);
  if((p.lostArms||0)&(side===-1?1:2)){
   ball(shoulder[0],shoulder[1],shoulder[2],.17*sc,.16*sc,.17*sc,[.44,.018,.032]);
   ball(shoulder[0],shoulder[1]-.045*sc,shoulder[2]-.05*sc,.095*sc,.09*sc,.09*sc,[.70,.024,.043]);
   continue;
  }
  const elbow=elbowFor(shoulder,hand,side,.34*sc*(monster?1.3:1));
  rod(shoulder,elbow,(monster?.132:.096)*sc,color);rod(elbow,hand,(monster?.123:.087)*sc,color);
  const basis=tracked?(side<0?(p.lBasis||p.lYaw):(p.rBasis||p.rYaw)):p.yaw;
  const pose=tracked?(side<0?(p.lCurl||[0,0,0]):(p.rCurl||[0,0,0])):[0,0,0];
  paw(hand,sc*(monster?.62:.44),color,basis,pose);
  if(monster){for(let i=-1;i<=1;i++)ball(hand[0]+i*.14*sc,hand[1]-.08*sc,hand[2]-.24*sc,.036*sc,.08*sc,.11*sc,[.68,.63,.56]);}
  if(showWeapon&&(p.heldHand||'right')===(side===1?'right':'left')&&p.weapon!=='none'&&!monster)weaponModel(hand,p.weapon,.72*sc,p.yaw);
 }
}
function weaponModel(center,type,scale=1,yaw=0){
 const [x,y,z]=center,a=scale;
 if(type==='blaster'){
  // Readable rifle silhouette: long barrel, shoulder stock, magazine, trigger and optics.
  const gunmetal=[.12,.14,.17],steel=[.37,.43,.46],grip=[.12,.085,.069],accent=[.36,.73,.63];
  block(x,y,z-.23*a,.115*a,.12*a,.37*a,gunmetal,yaw); // receiver
  block(x,y+.093*a,z-.25*a,.12*a,.042*a,.21*a,steel,yaw); // upper rail
  block(x,y-.19*a,z-.02*a,.10*a,.22*a,.09*a,grip,yaw); // grip
  block(x,y-.16*a,z-.30*a,.11*a,.17*a,.10*a,[.28,.36,.34],yaw); // magazine
  block(x,y-.03*a,z+.28*a,.115*a,.065*a,.25*a,grip,yaw); // buttstock
  block(x,y-.10*a,z+.49*a,.14*a,.045*a,.13*a,gunmetal,yaw);
  rod([x,y,z-.41*a],[x,y,z-.95*a],.076*a,steel); // long barrel
  rod([x,y,z-.94*a],[x,y,z-1.00*a],.105*a,gunmetal); // muzzle
  ball(x,y,z-1.012*a,.050*a,.05*a,.014*a,[.02,.025,.03]);
  block(x,y+.17*a,z-.28*a,.05*a,.11*a,.065*a,gunmetal,yaw); // optic base
  block(x,y+.24*a,z-.28*a,.105*a,.052*a,.10*a,gunmetal,yaw);
  ball(x,y+.24*a,z-.34*a,.055*a,.05*a,.015*a,[.44,.86,.93],.38);
  rod([x-.14*a,y+.05*a,z-.50*a],[x-.14*a,y+.05*a,z-.90*a],.022*a,[.68,.48,.20]);
  rod([x+.14*a,y+.05*a,z-.50*a],[x+.14*a,y+.05*a,z-.90*a],.022*a,[.68,.48,.20]);
  ball(x,y-.08*a,z-.27*a,.08*a,.08*a,.07*a,[.40,.80,.68],.13);
 }else if(type==='knife'){
  const steel=[.71,.78,.79],edge=[.94,.97,.94],hilt=[.16,.12,.12],guard=[.47,.40,.31];
  block(x,y-.17*a,z-.04*a,.10*a,.30*a,.10*a,hilt,yaw); // textured handle
  for(let i=0;i<5;i++)block(x,y-(.38-i*.095)*a,z-.04*a,.11*a,.012*a,.111*a,[.43,.32,.22],yaw);
  block(x,y+.15*a,z-.04*a,.22*a,.04*a,.13*a,guard,yaw);
  block(x,y+.50*a,z-.04*a,.09*a,.32*a,.048*a,steel,yaw);
  block(x,y+.58*a,z-.09*a,.016*a,.24*a,.027*a,edge,yaw); // bright sharpened edge
  rod([x,y+.72*a,z-.04*a],[x,y+1.01*a,z-.04*a],.055*a,edge); // tapered point
  ball(x,y-.49*a,z-.04*a,.097*a,.07*a,.1*a,guard);
 }
}
function pickupsDraw(t){if(phase!=='playing')return;for(const w of pickups){if(!w.available)continue;let y=.52+Math.sin(t*2+w.x)*.12;ball(w.x,.03,w.z,.75,.026,.75,[.23,.73,.60],.25);for(let j=0;j<5;j++){let a=j*TAU/5+t*.65;ball(w.x+Math.sin(a)*.5,.18+Math.sin(t*2+a)*.08,w.z+Math.cos(a)*.5,.04,.045,.04,[.54,.99,.77],.25);}weaponModel([w.x,y+.17,w.z],w.type,1.18,Math.sin(t*.9+w.z)*.5);}
}
function attackFx(m){let p=all.find(x=>x.id===m.id),o=[m.x,m.y,m.z],d=m.dir||[0,0,-1];if(m.kind==='blaster'){FrogyAudio.play('shot',{position:m,listener:vrPos});const len=m.range||55,origin=(Array.isArray(m.origin)&&m.origin.length===3)?m.origin:o;beams.push({a:origin,b:origin.map((v,i)=>v+d[i]*len),life:.19,max:.19,color:[.45,1,.94,1]});emitSplat(o[0]+d[0]*1.1,o[1]+d[1]*1.1,o[2]+d[2]*1.1,5,[.68,1,.95]);}else if(m.kind==='roar'){fx.push({type:'ring',x:o[0],y:o[1],z:o[2],r:.5,life:.8,max:.8,color:[.88,.49,1]});FrogyAudio.play('roar',{position:m,listener:vrPos});}else{fx.push({type:'ring',x:o[0]+d[0]*.7,y:o[1],z:o[2]+d[2]*.7,r:.16,life:.3,max:.3,color:(m.kind==='chomp'||m.kind==='rip')?[.81,.09,.17]:[1,.84,.45]});FrogyAudio.play(m.kind==='rip'?'rip':m.kind==='chomp'?'chomp':m.kind==='knife'?'blade':'hit',{position:m,listener:vrPos});}}
function emitSplat(x,y,z,n=10,color=[1,.34,.56]){if(!FrogySettings.state.effects)return;for(let i=0;i<n;i++){const a=rand(0,TAU),u=rand(-1,1),speed=rand(.5,4),vv=Math.sqrt(1-u*u);fx.push({type:'bubble',x,y,z,vx:Math.sin(a)*vv*speed,vy:u*speed+1.4,vz:Math.cos(a)*vv*speed,life:rand(.55,1.2),max:1.2,r:rand(.035,.11),color});}}
function severEffect(m){
 if(!m.side)return; // No new arm to sever if both were previously lost.
 const side=m.side==='left'?-1:1,sc=m.monster?1.93:1,yaw=m.yaw||0;
 const sx=m.x+Math.cos(yaw)*side*.46*sc,sz=m.z+Math.sin(yaw)*side*.46*sc;
 const count=FrogySettings.state.graphics==='low'?30:72;
 emitSplat(sx,m.y+.10,sz,count,[.77,.012,.043]);
 emitSplat(sx,m.y-.02,sz,Math.floor(count*.7),[.39,.015,.021]);
 FrogyAudio.play('rip',{position:m,listener:vrPos});
}
function popFrog(m){
 emitSplat(m.x,m.y+1.25,m.z,FrogySettings.state.graphics==='low'?65:195,[.70,.012,.035]);
 emitSplat(m.x,m.y+.78,m.z,45,[.35,.012,.025]);
 for(let i=0;i<10;i++){
  const a=rand(0,TAU),speed=rand(1.3,4.8);
  rags.push({x:m.x+rand(-.2,.2),y:m.y+1.0,z:m.z+rand(-.2,.2),vx:Math.sin(a)*speed,vy:rand(2.0,4.4),vz:Math.cos(a)*speed,spin:rand(-5,5),ang:0,life:rand(2,4),r:rand(.04,.11),part:'lump',color:i%3?[.38,.028,.036]:frogColor(m.color)});
 }
}
function ongoingBleeding(dt){
 if(!FrogySettings.state.effects||phase!=='playing')return;
 const now=performance.now();if(now-lastBleedFX<155)return;lastBleedFX=now;
 // Client-only continuous liquid stream. The server owns persistent floor stains.
 const maxDistance=FrogySettings.state.graphics==='low'?24:38;
 for(const p of all){if(!p.bleeding||p.alive===false||!p.lostArms||Math.hypot(p.x-vrPos.x,p.z-vrPos.z)>maxDistance)continue;
  const sc=p.monster?1.93:1,yaw=p.yaw||0;
  for(const [side,bit] of [[-1,1],[1,2]]){
   if(!(p.lostArms&bit))continue;
   const x=p.x+Math.cos(yaw)*side*.43*sc,z=p.z+Math.sin(yaw)*side*.43*sc,y=p.y+1.06*sc;
   const quantity=FrogySettings.state.graphics==='low'?2:4;
   for(let i=0;i<quantity;i++)fx.push({type:'bubble',x,y:y-rand(0,.09),z,
    vx:side*Math.cos(yaw)*rand(.2,.8),vy:rand(-2.6,-.5),vz:side*Math.sin(yaw)*rand(.2,.8),
    life:rand(.48,.90),max:.90,r:rand(.035,.085),color:i%3?[.70,.014,.032]:[.38,.008,.019]});
  }
 }
}
function updateParticles(dt){
 ongoingBleeding(dt);
 for(const q of fx){q.life-=dt;if(q.type==='bubble'){q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;q.vy-=9.1*dt;
   if(q.y<q.r){q.y=q.r;if(!q.landed&&q.color?.[0]>.30&&q.color?.[1]<.25){q.landed=true;puddles.push({x:q.x,z:q.z,r:rand(.035,.18),seed:rand(0,10)});}
     q.vy=Math.abs(q.vy)*.21;q.vx*=.69;q.vz*=.69;}
  }else if(q.type==='ring')q.r+=dt*6;
 }
 fx=fx.filter(q=>q.life>0).slice(-(FrogySettings.state.graphics==='low'?220:660));
 // Puddles last for the current round, with a hard Quest-friendly memory cap.
 puddles=puddles.slice(-160);
 for(const q of rags){q.life-=dt;q.ang+=q.spin*dt;q.vy-=9*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;if(q.y<q.r){q.y=q.r;q.vy=Math.abs(q.vy)*.36;q.vx*=.72;q.vz*=.72;}}
 rags=rags.filter(q=>q.life>0);beams=beams.filter(q=>(q.life-=dt)>0);
 const active=new Set(worldParts.map(p=>p.id));for(const id of partVisual.keys())if(!active.has(id))partVisual.delete(id);
 for(const part of worldParts){const q=partVisual.get(part.id);if(!q){partVisual.set(part.id,{x:part.x,y:part.y,z:part.z,angle:part.angle});continue;}const smooth=1-Math.exp(-dt*(part.heldBy?20:11));q.x+=(part.x-q.x)*smooth;q.y+=(part.y-q.y)*smooth;q.z+=(part.z-q.z)*smooth;q.angle+=(part.angle-q.angle)*smooth;}
}
function drawBloodPatch(x,z,r,seed){
 const a=Math.sin(seed*1.19),b=Math.cos(seed*2.5);
 ball(x,.016,z,r,.013,r*.76,[.22,.007,.018]);
 ball(x+r*.23,.020,z-r*.21,r*.43,.011,r*.33,[.39,.013,.030]);
 for(let i=0;i<3;i++){const angle=seed+i*2.12,dist=r*(.75+i*.16);ball(x+Math.cos(angle)*dist,.013,z+Math.sin(angle)*dist,r*.12,.009,r*.14,[.30,.009,.027]);}
}
function drawSharedPart(part){const q=partVisual.get(part.id)||part, c=frogColor(part.color||'mint');let x=q.x,y=q.y,z=q.z;const wobble=Math.sin(q.angle*1.7)*.19;
 if(part.heldBy===clientId&&vrInput[part.heldHand]){const h=vrInput[part.heldHand].hand;x=h[0];y=h[1];z=h[2];}
 if(part.kind==='arm'){
  // A severed *whole arm* rotates, falls and bounces as a replicated prop.
  // The three-finger palm stays attached to the limb as it tumbles.
  const armSign=part.side==='left'?-1:1,twist=part.angle||0;
  const tip=[x+Math.cos(twist)*armSign*.30,y-.24+Math.sin(twist)*.19,z+Math.sin(twist)*.20];
  const root=[x-Math.cos(twist)*armSign*.30,y+.23-Math.sin(twist)*.19,z-Math.sin(twist)*.20];
  rod(root,tip,.13,c);ball(...root,.14,.14,.13,[.46,.032,.043]);
  paw(tip,.38,c,twist);
 }else if(part.kind==='head'){
  ball(x,y+Math.abs(wobble)*.07,z,.43,.35,.36,c);
  for(const side of [-1,1]){ball(x+side*.22+wobble,y+.30,z-.25,.18,.21,.19,c);ball(x+side*.22+wobble,y+.30,z-.42,.12,.13,.07,[.97,.96,.90]);ball(x+side*.22+wobble,y+.30,z-.47,.065,.075,.02,[.042,.060,.08]);}
  ball(x,y-.09,z-.29,.23,.07,.06,[.09,.02,.025]);
 }
}
function drawParticles(){
 const maxDist=FrogySettings.state.graphics==='low'?27:42,near=p=>Math.abs(p.x-vrPos.x)<maxDist&&Math.abs(p.z-vrPos.z)<maxDist;
 // Server keeps all round-long stains; each eye only draws nearby marks to protect frame rate.
 let stains=0;for(const patch of worldBlood){if(!near(patch))continue;drawBloodPatch(patch.x,patch.z,patch.r,patch.seed);if(++stains>=72)break;}
 let extra=0;for(const p of puddles){if(!near(p))continue;drawBloodPatch(p.x,p.z,p.r,p.seed||0);if(++extra>=48)break;}
 for(const p of worldParts)if(near(p)||p.heldBy===clientId)drawSharedPart(p);
 for(const p of rags)if(near(p))ball(p.x,p.y,p.z,p.r,p.r*.7,p.r,p.color);
 setAlpha(true);
 let particles=0;const maxParticles=FrogySettings.state.graphics==='low'?130:260;
 for(const p of fx){if(!near(p)||particles++>maxParticles)continue;
  if(p.type==='bubble')ball(p.x,p.y,p.z,p.r,p.r,p.r,p.color,.15,clamp(p.life/p.max,0,1));
  else{let pts=[];for(let j=0;j<24;j++){let a=j/24*TAU,b=(j+1)/24*TAU;pts.push(p.x+Math.sin(a)*p.r,p.y,p.z+Math.cos(a)*p.r,p.x+Math.sin(b)*p.r,p.y,p.z+Math.cos(b)*p.r);}lines(pts,[...p.color,p.life/p.max]);}
 }
 for(const b of beams)lines([...b.a,...b.b],[...b.color.slice(0,3),b.life/b.max]);setAlpha(false);
}
function localPaw(pos,color=PALETTE.mint,basis=0,pose=[0,0,0]){paw(pos,.44,color,basis,pose);}
// Optional challenge while waiting: curved lily-stone parkour course, distinct from all shops.
// Raised pads are physically collidable in the vertical player movement loop.
// Render directly from the shared physical platform list: heights can never drift.
const FROGY_PARKOUR=FrogyCollision.parkour;
function drawFrogyParkour(t){
 for(let i=0;i<FROGY_PARKOUR.length;i++){
  const q=FROGY_PARKOUR[i],y=q.h;
  ball(q.x,y-.12,q.z,q.r,.15,q.r,[.16,.23,.24]);
  ball(q.x,y-.028,q.z,q.r*.90,.028,q.r*.90,i===FROGY_PARKOUR.length-1?[.48,.63,.30]:[.33,.42,.37]);
  ball(q.x,y+.085,q.z,.30,.02,.30,[.62,.71,.48],.12);
  if(i%2===0){rod([q.x+.70,.02,q.z],[q.x+.70,y+.4,q.z],.055,[.36,.37,.30]);ball(q.x+.70,y+.48,q.z,.13,.13,.13,[.76,.73,.33],.24);}
 }
 block(-11,.05,9.0,1.95,.09,.20,[.55,.42,.22]);
 rod([-11,.05,9.0],[-11,2.9,9.0],.065,[.43,.33,.21]);
 block(-11,2.93,9,.85,.30,.11,[.22,.35,.27]);
}

// Cached per-player nametag textures. Each Quest viewer faces the labels locally;
// clients never broadcast label orientation or draw tags over their own head.
const nameTags=new Map();
// A single nameplate billboard always follows the frog's head and faces EACH
// viewing player. OWNER outranks MOD when a profile has both roles. The role
// plaque is painted ABOVE the player name in the same tracked mesh: no extra
// detached sprites that can float away or double up between XR eyes.
function nameTagTexture(p,t=0){
 const name=String(p.name||'Frog').slice(0,18);
 const role=p.ownerTag?'OWNER':p.modTag?'MOD':'';
 const key=role+'|'+name;
 const old=nameTags.get(p.id);
 // Metallic gradient + modest travelling gleam, updated at most three times a
 // second per visible player (and NEVER twice for the two headset eyes).
 if(old?.title===key&&(!role||t-old.paintTime<.34))return old.texture;
 const c=old?.canvas||document.createElement('canvas');
 if(!old){c.width=512;c.height=160;}
 const ctx=c.getContext('2d');ctx.clearRect(0,0,512,160);
 ctx.textAlign='center';ctx.textBaseline='alphabetic';
 const accent=role==='OWNER'?'#e9b94f':role==='MOD'?'#53b8ff':'#81e2ae';
 // Name stays easily readable against bright scenes and murky swamp fog.
 ctx.fillStyle='rgba(4,20,24,.91)';ctx.beginPath();ctx.roundRect(8,73,496,80,20);ctx.fill();
 ctx.lineWidth=4;ctx.strokeStyle=accent;ctx.stroke();
 ctx.font='bold 43px system-ui, sans-serif';ctx.lineWidth=6;
 ctx.strokeStyle='rgba(2,13,18,.94)';ctx.strokeText(name,256,128,466);
 ctx.fillStyle='#f6fff9';ctx.fillText(name,256,128,466);
 if(role){
  // Distinct metallic BLUE moderator badge and metallic GOLD owner badge.
  const gold=role==='OWNER';
  const dark=gold?'#724004':'#063970',mid=gold?'#e9ab27':'#2889e5';
  const light=gold?'#fff6b9':'#d5f5ff';
  ctx.save();ctx.shadowBlur=12;ctx.shadowColor=gold?'rgba(255,196,55,.72)':'rgba(46,166,255,.70)';
  ctx.fillStyle='rgba(6,13,19,.95)';ctx.beginPath();ctx.roundRect(126,5,260,67,22);ctx.fill();ctx.restore();
  ctx.save();ctx.beginPath();ctx.roundRect(133,10,246,57,18);ctx.clip();
  const metal=ctx.createLinearGradient(0,8,0,69);
  metal.addColorStop(0,light);metal.addColorStop(.19,gold?'#ffcf55':'#8ddaff');
  metal.addColorStop(.48,mid);metal.addColorStop(.55,dark);
  metal.addColorStop(.84,gold?'#d79113':'#1467ae');metal.addColorStop(1,light);
  ctx.fillStyle=metal;ctx.fillRect(132,9,248,60);
  // Slowly moving glossy streak; clipped to the badge, never the player's name.
  const sweep=(((t*.45)%1)+1)%1*410+85;
  ctx.fillStyle='rgba(255,255,255,.31)';ctx.beginPath();
  ctx.moveTo(sweep-58,8);ctx.lineTo(sweep-26,8);
  ctx.lineTo(sweep-68,69);ctx.lineTo(sweep-100,69);ctx.closePath();ctx.fill();
  ctx.restore();
  ctx.beginPath();ctx.roundRect(133,10,246,57,18);
  ctx.lineWidth=4;ctx.strokeStyle=gold?'#fff0a0':'#b0ecff';ctx.stroke();
  ctx.fillStyle=gold?'#542b00':'#052c57';ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=1.2;
  ctx.font='900 34px system-ui, sans-serif';ctx.strokeText(role,256,50);
  ctx.fillText(role,256,50);
  // Small sparkles make the role look shiny without spawning world-space text.
  ctx.strokeStyle=light;ctx.lineWidth=2;
  for(const [sx,sy,r] of [[147,24,5],[365,52,4]]){
   ctx.beginPath();ctx.moveTo(sx-r,sy);ctx.lineTo(sx+r,sy);
   ctx.moveTo(sx,sy-r);ctx.lineTo(sx,sy+r);ctx.stroke();
  }
 }
 const tex=old?.texture||gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 if(!old){for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);}
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 if(old)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,c);
 else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
 nameTags.set(p.id,{texture:tex,title:key,paintTime:t,canvas:c});return tex;
}
function drawNameTag(p,head,t=0){
 if(!head||p.alive===false)return;
 const d=Math.hypot(p.x-head.x,p.z-head.z);if(d>25||d<.5)return;
 const x=p.x,y=p.y+(p.monster?4.9:2.37),z=p.z;
 // Same world-space motion as each frog and SAME per-viewer billboard yaw as
 // regular player nametags. Not tied to an individual eye's camera transform.
 const yaw=Math.atan2(head.x-x,head.z-z);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
 gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);
 gl.uniformMatrix4fv(tp.m,false,mat(x,y,z,p.monster?1.70:1.12,p.monster?.52:.38,1,yaw));
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,nameTagTexture(p,t));gl.uniform1i(tp.tex,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
 gl.depthMask(true);gl.disable(gl.BLEND);
}


function drawLocalBodyFirstPerson(t,head){
 if(!session||!me||!head)return;
 const color=me?.monster?[.24,.30,.27]:frogColor(me?.color);
 const base={x:head.x,y:vrPos.y+(bodyTrack.height-1.65)*.35,z:head.z,yaw:bodyTrack.yaw};
 const sc=me?.monster?1.65:.86;
 // No local head in first person; only a low torso + arms so the player can see their body without obstruction.
 dotBall(base,0,.58+bodyTrack.pitch*.2,.16,.40,.50,.34,color,sc);
 dotBall(base,0,.48,-.26,.27,.28,.06,me?.monster?[.32,.28,.23]:[.91,.93,.75],sc);
 for(const side of [-1,1]){
  const q=vrInput[side]; if(!q||((me?.lostArms||0)&(side==='left'?1:2))) continue;
  const shoulder=transform(base,side*.35+bodyTrack.lean*side*.08,.78,-.02,sc);
  const elbow=elbowFor(shoulder,q.hand,side==='left'?-1:1,.28*sc);
  rod(shoulder,elbow,.082*sc,color); rod(elbow,q.hand,.073*sc,color);
 }
}
function drawScene(t,head=null){gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);if(isHub()){lobbyEnvironment(t);lobbyProps(t);drawFrogyParkour(t);drawMirrorPreview(t);}else{terrain(mapIndex);weather(t);pickupsDraw(t);}
 if(all.length){for(const p of all){
   if(session&&p.id===clientId)continue;
   if(isHub()&&p.spectating&&phase==='playing')continue;
   try{frog(p,t);}catch(e){console.warn('Frogy remote avatar draw failed:',p.id,e);ball(p.x,p.y+1.3,p.z,.55,.7,.5,frogColor(p.color));}
   // Colored overhead locator is only shown in the social lobby, not during hide-and-seek.
   if(head&&phase!=='playing'&&p.alive!==false)drawNameTag(p,head,t);
  }}
 else if(!session){const demo=[{id:'1',x:-2.4,y:0,z:-2,color:'mint',weapon:'blaster',monster:false,alive:true,yaw:.23},{id:'2',x:1.5,y:0,z:-4,color:'pink',weapon:'knife',monster:false,alive:true,yaw:-.5},{id:'3',x:5,y:0,z:-6,color:'lilac',monster:true,weapon:'none',alive:true,yaw:-.6}];for(const p of demo)frog(p,t);}
 if(session){drawLocalBodyFirstPerson(t,head);const col=me?.monster?[.24,.30,.27]:frogColor(me?.color);for(const side of ['left','right']){const q=vrInput[side];if(!q||((me?.lostArms||0)&(side==='left'?1:2)))continue; // No visible paw for a detached arm.
 // One and ONLY one visible paw per tracked controller. Contact proxies are
 // physics-only: never render contact discs that resemble second hands.
 localPaw(q.hand,col,q.basis||q.yaw||0,q.pose||[0,0,0]);
 if(clingActive&&q.wall&&q.triggerHeld){const f=clamp(clingState.seconds/(clingState.hands===2?7.6:4.5),0,1),h=q.hand;lines([h[0]-.20,h[1]+.24,h[2],h[0]-.20+.4*f,h[1]+.24,h[2]],f>.22?[.31,1,.68,.95]:[1,.42,.25,.95]);}
 if(!me?.monster&&me?.weapon!=='none'&&me.heldHand===side)weaponModel(q.hand,me.weapon,.74,lookYaw);const e=q.ray;lines([...e.o,...e.o.map((v,i)=>v+e.d[i]*3)],[.58,.95,.90,.27]);}}
 if(isHub()&&session&&typeof drawWorldVoteBoard==='function')drawWorldVoteBoard(t);
 if(!isHub())drawParticles();
 if(session)for(const side of ['left','right'])if(tongues[side].active){
  const origin=currentMouth?.o||[head?.x||vrPos.x,head?.y-.22||vrPos.y+1.4,head?.z||vrPos.z];
  lines([...origin,...tongues[side].point],[.95,.47,.60,.98]);
  ball(...tongues[side].point,.09,.08,.09,[.95,.38,.40],.18);
 }
 for(const p of all)if(p.id!==clientId&&p.tongue&&p.tongue.length===3&&p.alive!==false){
  const origin=transform(p,0,1.25,-.69,p.monster?1.83:.94);
  lines([...origin,...p.tongue],[.95,.48,.63,.95]);
 }
 if(session&&head){if(vrMenuOpen){drawVRMenu(t,head);drawVRLaser();}else if(phase==='playing'){updateBillboard(t);drawBillboard(head);}drawRoundNotice(head);} }
// Head-up display for Quest: a small, head-following information panel.
const board=document.createElement('canvas');board.width=1024;board.height=256;const bc=board.getContext('2d');const boardTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const quadV=gl.createBuffer(),quadUV=gl.createBuffer(),quadI=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,1,1,1,1,0,0,0]),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW);

// Live dressing mirror: an avatar preview (not a costly full-scene reflection),
// refreshed locally with the player's real outfit/color and hand gestures.
const mirrorCanvas=document.createElement('canvas');mirrorCanvas.width=320;mirrorCanvas.height=480;
const mirrorCtx=mirrorCanvas.getContext('2d');
const mirrorTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,mirrorTexture);
for(const [key,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,v);
let mirrorPaintAt=0;
function drawMirrorPreview(t){
 if(!session)return;
 if(t-mirrorPaintAt>.12){
  mirrorPaintAt=t;const c=mirrorCtx,W=320,H=480,skin=cssFrogColor(profile.color||me?.color||'mint');
  const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#c6e4d2');bg.addColorStop(.48,'#598c80');bg.addColorStop(1,'#1d484c');c.fillStyle=bg;c.fillRect(0,0,W,H);
  c.fillStyle='rgba(243,255,252,.11)';for(let i=0;i<12;i++){c.fillRect((i*67)%W,0,1,H);}
  const ellipse=(x,y,rx,ry,col)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=col;c.fill();};
  // The mirror character performs its own silly dance. This is an avatar
  // preview, not a tracked controller or an additional player: never use the
  // player's grip poses here, because that could appear to shift their hands.
  const beat=t*3.65,bounce=Math.abs(Math.sin(beat))*13;
  const sway=Math.sin(beat*.68)*.13,headTilt=Math.sin(beat*.91)*.105;
  const armLift=(side)=>Math.sin(beat*1.33+(side<0?0:Math.PI))*.5+.5;
  // Soft stage-light sparkles and musical notes make the dance readable in VR.
  c.fillStyle='rgba(234,255,203,.28)';
  for(let i=0;i<7;i++){
   const px=25+i*47+Math.sin(beat*.63+i)*7,py=80+(i*51+beat*18)%313;
   ellipse(px,py,2.6,2.6,'rgba(247,255,221,.65)');
  }
  c.save();c.translate(160,282-bounce);c.rotate(sway);c.translate(-160,-282);
  const wavingHand=(side)=>{
   const lift=armLift(side);
   const x=160+side*(129+12*Math.sin(beat*1.13));
   const y=226+lift*105;
   return [x,y];
  };
  const leftHand=wavingHand(-1),rightHand=wavingHand(1);
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=skin;c.lineWidth=32;
  for(const [side,h] of [[-1,leftHand],[1,rightHand]]){
   c.beginPath();c.moveTo(160+side*62,307);
   c.quadraticCurveTo(160+side*(108+16*Math.cos(beat)),270+14*Math.sin(beat*.75),h[0],h[1]);
   c.stroke();
   ellipse(h[0],h[1],21,21,skin);
   // Three skin-colored rounded fingertips (no orange bulbs on the new paws).
   for(let k=-1;k<=1;k++){
    const fx=h[0]+k*12,fy=h[1]+(side<0?-11:13)+Math.sin(beat+k)*2;
    ellipse(fx,fy,8,14,skin);
    ellipse(fx,fy+(side<0?-9:9),7,7,skin);
   }
  }
  // A little side-to-side belly wiggle and head bob make the dance goofy.
  if(profile.equipped?.back==='cape'){
   c.fillStyle='#ab4765';c.beginPath();c.moveTo(98,280);c.lineTo(76,422);c.quadraticCurveTo(160,453,247,421);c.lineTo(222,280);c.fill();
  }
  // Tiny feet in the dressing mirror, matching the 3D avatar.
  for(const side of [-1,1]){ellipse(160+side*38,421,18,23,skin);ellipse(160+side*38,434,24,10,skin);}
  ellipse(160,340,82,99,skin);ellipse(160,371,55,50,'rgba(225,250,208,.46)');
  c.save();c.translate(160,201);c.rotate(headTilt);c.translate(-160,-201);
  ellipse(160,205,110,103,skin);ellipse(160,239,92,51,'rgba(245,255,235,.22)');
  for(const side of [-1,1])ellipse(160+side*63,144,42,49,skin);
  const speaking=clamp(Number(FrogVoice.level())||0,0,1);
  const laugh=Math.max(0,Math.sin(beat*1.66))*.45;
  ellipse(160,248,47,12+speaking*25+laugh*20,'#182a24');
  ellipse(160,255,31,5+speaking*13+laugh*10,'#d66d7b');
  for(const dx of [-63,63]){
   ellipse(160+dx,150,42,45,'#f9ffef');
   ellipse(160+dx+Math.sin(beat*.48)*3,153,20,25,'#27363e');
   ellipse(160+dx-7,140,10,11,'white');ellipse(160+dx+(dx<0?-43:43),208,17,10,'rgba(246,125,152,.52)');
  }
  const hat=profile.equipped?.hat||'none';c.textAlign='center';c.font='bold 65px sans-serif';
  if(hat==='crown')c.fillText('👑',160,105);
  if(hat==='mushroom')c.fillText('🍄',160,105);
  if(hat==='party')c.fillText('🥳',160,105);
  if(hat==='wizard')c.fillText('🧙',160,105);
  if(hat==='bow')c.fillText('🎀',160,105);
  if(profile.equipped?.face==='glasses'||profile.equipped?.face==='starshades'){
   c.font='68px sans-serif';c.fillText(profile.equipped.face==='glasses'?'👓':'🕶️',160,180);
  }
  c.restore();c.restore();
  c.fillStyle='rgba(254,249,204,.96)';c.textAlign='center';c.font='bold 18px sans-serif';
  c.fillText('♪ DANCE MODE ♪',160,47);
  c.fillStyle='rgba(240,255,249,.9)';c.font='bold 19px sans-serif';c.fillText('YOUR FROG',160,452);
  gl.bindTexture(gl.TEXTURE_2D,mirrorTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mirrorCanvas);
 }
 const x=11,y=1.69,z=-8.28;gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);gl.uniformMatrix4fv(tp.m,false,mat(x,y,z,2.24,2.35,1,0));
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mirrorTexture);gl.uniform1i(tp.tex,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);
}
function updateBillboard(t){if(t-lastBoard<.2)return;lastBoard=t;bc.clearRect(0,0,1024,256);bc.fillStyle='#142b39ed';bc.beginPath();bc.roundRect(8,8,1008,240,34);bc.fill();bc.lineWidth=7;bc.strokeStyle='#c8ffa9';bc.stroke();bc.font='bold 40px sans-serif';bc.fillStyle='#d2ffab';bc.fillText('FROGY  ·  '+room,36,60);bc.font='bold 37px sans-serif';bc.fillStyle='white';bc.fillText(me?.monster?'MONSTER!':'SURVIVOR',36,130);bc.font='31px sans-serif';bc.fillText((me?.weapon||'NONE').toUpperCase(),36,192);bc.font='bold 75px sans-serif';bc.textAlign='right';bc.fillStyle=remaining<15?'#ff9ba9':'#faffb7';bc.fillText(String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'),961,157);bc.textAlign='left';gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,board);}
function drawBillboard(head){if(!me)return;const f=head.forward||[0,0,-1],right=[-f[2],0,f[0]],x=head.x+f[0]*1.5-right[0]*.35,y=head.y+.7,z=head.z+f[2]*1.5-right[2]*.35,yaw=Math.atan2(-f[0],-f[2]);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);gl.uniformMatrix4fv(tp.m,false,mat(x,y,z,1.32,.34,1,yaw));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.uniform1i(tp.tex,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);}
// Headset-visible role / winners bubble. Unlike an HTML toast this is rendered
// inside both Quest eyes and does not require opening the X-button menu.
const noticeCanvas=document.createElement('canvas');noticeCanvas.width=1024;noticeCanvas.height=384;
const noticeContext=noticeCanvas.getContext('2d');
const noticeTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,noticeTexture);
for(const [key,val] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,val);
function showRoundNotice(kind,title,sub,duration=6000){
 roundNotice={kind,title,sub,until:performance.now()+duration};noticePaintAt=0;
}
function paintRoundNotice(){
 const n=roundNotice;if(!n)return;noticePaintAt=performance.now();
 const c=noticeContext;c.clearRect(0,0,1024,384);
 const monster=n.kind==='monster',winner=n.kind==='winner';
 c.fillStyle=monster?'rgba(63,9,22,.94)':winner?'rgba(40,26,10,.94)':'rgba(6,49,48,.94)';
 c.beginPath();c.roundRect(14,24,996,326,85);c.fill();
 c.lineWidth=12;c.strokeStyle=monster?'#ff6079':winner?'#ffe597':'#a4f7c5';c.stroke();
 c.textAlign='center';c.fillStyle='#fffdf3';
 c.font='bold 63px system-ui, sans-serif';c.fillText(n.title,512,155,945);
 c.font='32px system-ui, sans-serif';
 let lines=[];let current='';for(const word of String(n.sub).split(/\s+/)){const next=(current?current+' ':'')+word;if(c.measureText(next).width>905&&current){lines.push(current);current=word;}else current=next;}
 if(current)lines.push(current);for(let i=0;i<Math.min(2,lines.length);i++)c.fillText(lines[i],512,225+i*44,940);
 gl.bindTexture(gl.TEXTURE_2D,noticeTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,noticeCanvas);
}
function drawRoundNotice(head){
 if(!roundNotice)return;
 if(performance.now()>roundNotice.until){roundNotice=null;return;}
 if(!noticePaintAt||performance.now()-noticePaintAt>2000)paintRoundNotice();
 const f=head.forward||[0,0,-1],distance=1.8;
 const yaw=Math.atan2(-f[0],-f[2]);
 // Center bubble is just below straight-ahead gaze; does not obscure hands.
 const x=head.x+f[0]*distance,y=head.y-.16,z=head.z+f[2]*distance;
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);
 gl.uniformMatrix4fv(tp.m,false,mat(x,y,z,1.54,.57,1,yaw));
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,noticeTexture);gl.uniform1i(tp.tex,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);
 gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);
}
// ——— CONTROLS & GAME LOOP ———
function myForward(){return [-Math.sin(lookYaw)*Math.cos(lookPitch),Math.sin(lookPitch),-Math.cos(lookYaw)*Math.cos(lookPitch)];}
function attack(kind=null,direction=null,origin=null){if(!session||phase!=='playing'||!me?.alive||me.spectating||session&&vrMenuOpen)return;let k=kind||((me.monster)?'punch':me.weapon);if(k==='none')return;if(localPractice){practiceAttack(k,direction||myForward());return;}send({type:'attack',kind:k,dir:direction||myForward(),origin});}
function commitJump(now){
 vel=FrogyMotion.preserveJump(vel);
 vrPos.y=Math.max(.045,vrPos.y+.038);grounded=false;
 clingActive=false;clingState=FrogyCling.initial();clingLockUntil=now+440;tongues={left:{active:false,readyAt:now+280},right:{active:false,readyAt:now+280}};
 pawContacts={};prevHands={};pendingJumpAt=-Infinity;lastJumpAt=now;tongues={left:{active:false,readyAt:now+280},right:{active:false,readyAt:now+280}};
 FrogyAudio.play('jump');toast('JUMP · KEEP YOUR SPEED',880);
}
function jump(){
 if(!session||!FrogyMotion.canJump(phase,me?.alive,me?.spectating,vrMenuOpen))return;
 const now=performance.now();if(now-lastJumpAt<230)return;
 if(clingActive||grounded||vrPos.y<.12||FrogyMotion.coyoteJump(lastGroundAt,now)){extraJumpUsed=false;commitJump(now);}
 else if(me?.activeTools?.doubleJump&&!extraJumpUsed&&phase==='playing'){extraJumpUsed=true;vel.y=FrogyMotion.settings.jumpSpeed*.85;grounded=false;lastJumpAt=now;pawContacts={};prevHands={};FrogyAudio.play('jump');toast('DOUBLE HOP!',900);}
 else pendingJumpAt=now;
}

function desktopKeys(dt){
 if(phase!=='playing'||!me||session)return;
 const fw=[Math.sin(lookYaw),-Math.cos(lookYaw)],side=[Math.cos(lookYaw),Math.sin(lookYaw)];
 const ox=(keys.KeyD?1:0)-(keys.KeyA?1:0),oz=(keys.KeyW?1:0)-(keys.KeyS?1:0),l=Math.hypot(ox,oz);
 if(l){const speed=(keys.ShiftLeft||keys.ShiftRight)?6.7:4.6,tx=(side[0]*ox+fw[0]*oz)/l*speed,tz=(side[1]*ox+fw[1]*oz)/l*speed;
  const accel=grounded?20:8;vel.x+=(tx-vel.x)*Math.min(1,accel*dt);vel.z+=(tz-vel.z)*Math.min(1,accel*dt);
 }
}
function physics(dt){if(!session||!FrogyMotion.canMove(phase,me?.alive,me?.spectating,vrMenuOpen))return;
 const previousFootY=vrPos.y;
 if(clingActive){vel.y=0;vrPos.y=clamp(vrPos.y+clingClimb,0,me?.monster?8:5.5);grounded=false;}
 else if(vel.y>0||vrPos.y>0){vel.y-=(phase==='playing'&&me?.monster?FrogyMotion.settings.monsterGravity:FrogyMotion.settings.gravity)*dt;vrPos.y+=vel.y*dt;grounded=false;}
 else{vel.y=0;grounded=true;lastGroundAt=performance.now();}
 if(grounded&&FrogyMotion.jumpBuffered(pendingJumpAt,performance.now())&&performance.now()-lastJumpAt>230)commitJump(performance.now());
 else if(performance.now()-pendingJumpAt>155)pendingJumpAt=-Infinity;
 const isMega=phase==='playing'&&!!me?.monster;
 const cap=FrogyMotion.speedCap(phase,me);
 const planarSpeed=Math.hypot(vel.x,vel.z);
 if(planarSpeed>cap){vel.x*=cap/planarSpeed;vel.z*=cap/planarSpeed;}
 // Sweep the body against actual walls/structures; soft grass is decoration.
 const oldPos={x:vrPos.x,z:vrPos.z};
 const wished={x:vrPos.x+vel.x*dt,z:vrPos.z+vel.z*dt};
 const hitPos=FrogyCollision.sweepBody(oldPos,wished,.31,isHub()?'hub':'arena',isHub()?null:{SIZE:WorldData.SIZE,cover:obstacles(mapIndex)},vrPos.y);
 vrPos.x=hitPos.x;vrPos.z=hitPos.z;
 // A wall stops the blocked direction without killing sliding movement.
 if(Math.abs(hitPos.x-wished.x)>.02)vel.x=0;
 if(Math.abs(hitPos.z-wished.z)>.02)vel.z=0;
 const factor=FrogyMotion.drag(grounded,dt,isMega);vel.x=clamp(vel.x*factor,-cap,cap);vel.z=clamp(vel.z*factor,-cap,cap);
 if(vrPos.y>(isMega?8:5.5)){vrPos.y=isMega?8:5.5;vel.y=Math.min(vel.y,0);}
 if(isHub()){
  // Continuous descending contact makes raised lily pads solid even when a
  // fast movement frame skips across their top between two samples.
  const landing=FrogyCollision.sweptLanding(vrPos.x,vrPos.z,previousFootY,vrPos.y,vel.y<=0);
  if(landing!==null){vrPos.y=landing;vel.y=0;grounded=true;lastGroundAt=performance.now();extraJumpUsed=false;}
  else if(vrPos.y<0){vrPos.y=0;vel.y=0;grounded=true;lastGroundAt=performance.now();extraJumpUsed=false;}
  // Body sweep above already handles lobby walls and important props.
  vrPos.x=clamp(vrPos.x,-FrogyCollision.hubBounds+.31,FrogyCollision.hubBounds-.31);
  vrPos.z=clamp(vrPos.z,-FrogyCollision.hubBounds+.31,FrogyCollision.hubBounds-.31);
  return;
 }
 if(vrPos.y<0){vrPos.y=0;vel.y=0;grounded=true;extraJumpUsed=false;lastGroundAt=performance.now();}
 // Solid structures block the body, while grass/leaves have no colliders.
 const edge=WorldData.SIZE-.31;
 const dist=Math.hypot(vrPos.x,vrPos.z);
 if(dist>edge){vrPos.x*=edge/dist;vrPos.z*=edge/dist;}
}
function wallHandContact(q){return FrogyCollision.surfaceAt(q,isHub()?'hub':'arena',isHub()?null:{SIZE:WorldData.SIZE,cover:obstacles(mapIndex)})?.type==='wall';}
function pawSurface(raw,world,wasFloor=false){
 // Visual paws use the tracked pose. An accessibility floor zone activates on
 // lowered hands but never offsets the mesh or creates contact rods.
 const mode=isHub()?'hub':'arena';
 const surface=FrogyCollision.handSurface(world,headHeight,mode,isHub()?null:{SIZE:WorldData.SIZE,cover:obstacles(mapIndex)},wasFloor,FrogySettings.state.reachScale);
 if(surface?.type==='floor'&&vel.y>.65)return null;
 return surface;
}
function tongueMouth(viewerPose){
 const m=viewerPose?.transform?.matrix;if(!m)return null;
 const h=FrogyControls.rotate(m[12],m[14],turnYaw),r=FrogyControls.rotate(-m[8],-m[10],turnYaw);
 const d=norm([r[0],-m[9],r[1]]);
 const o=[vrPos.x+h[0]+d[0]*.23,vrPos.y+referenceShift+m[13]-.22+d[1]*.23,vrPos.z+h[1]+d[2]*.23];
 return {o,d};
}
function toggleQuestMenu(){
 const now=performance.now();if(now-lastMenuToggleAt<240)return false;
 lastMenuToggleAt=now;vrMenuOpen=!vrMenuOpen;vrPanel=null;if(vrMenuOpen)tongues={left:{active:false,readyAt:now+280},right:{active:false,readyAt:now+280}};
 if(vrMenuOpen){vrPage=phase==='playing'?'settings':'pond';}
 vrLast=-1;FrogyAudio.play('ui');return true;
}
function handleQuestTrigger(side,ray){
 if(!ray)return;const now=performance.now();
 if(now-(lastTriggerBySide[side]||0)<160)return;
 lastTriggerBySide[side]=now;
 if(phase!=='playing'||vrMenuOpen){if(vrMenuOpen)clickVRMenu(ray.o,ray.d);else if(isHub()){if(typeof clickWorldVote==='function')clickWorldVote(ray.o,ray.d);}return;}
 attack(null,ray.d,ray.o);
}

function updateVRInputs(frame,dt,viewerPose){
 const fresh={left:null,right:null},pushes=[],now=performance.now();
 currentMouth=tongueMouth(viewerPose);
 let wallClimbDelta=0;
 if(viewerPose){const vm=viewerPose.transform.matrix;headHeight=clamp(vm[13]+referenceShift,1.0,2.2);const gaze=FrogyControls.rotate(-vm[8],-vm[10],turnYaw);lookYaw=Math.atan2(-gaze[0],-gaze[1]);}
 // Never let a secondary XR source create an extra pawn or steal the
 // opposite side. Physical controller inputs take precedence over hand sources.
 const activeSources=FrogyControls.selectControllerSources(session.inputSources);
 for(const side of ['left','right']){
  const src=activeSources[side];if(!src)continue;
  const gp=src.gamepad;
  // IMPORTANT: X/A are processed BEFORE looking up grip/target poses. Otherwise
  // brief Quest controller tracking loss silently disables the menu and jump.
  let buttons=null;
  if(gp){
   const edge=n=>FrogyControls.pressedEdge(lastButtons[side+'_'+n],FrogyControls.button(gp,n));
   const released=n=>FrogyControls.releasedEdge(lastButtons[side+'_'+n],FrogyControls.button(gp,n));
   if(side==='left'){const down=FrogyControls.button(gp,4)||(gp.buttons.length>7&&FrogyControls.button(gp,7));const result=FrogyControls.menuLatch(menuLatchState,down,now);menuLatchState=result.state;if(result.toggle)toggleQuestMenu();}
   if(side==='right'&&edge(4))jump();
   if(side==='right'&&(!vrMenuOpen||isHub())){
    const v=FrogyControls.thumbX(gp),t=FrogyControls.turnAngle(v,dt,FrogySettings.state,stickLatched);
    stickLatched=t.latch;
    if(t.delta){turnYaw+=t.delta;pawContacts={};prevHands={};lookYaw+=t.delta;vrLast=-1;}
   }
   // Snapshot all buttons once, *after* detecting rising and falling edges.
   const gripDown=edge(1),gripUp=released(1),triggerDown=edge(0),grappleDown=edge(5),roarDown=side==='right'&&edge(3);
   for(let n=0;n<gp.buttons.length;n++)lastButtons[side+'_'+n]=!!gp.buttons[n]?.pressed;
   buttons={gripDown,gripUp,triggerDown,grappleDown,triggerHeld:FrogyControls.button(gp,0),roarDown,grip:gp.buttons?.[1]?.value??(gp.buttons?.[1]?.pressed?1:0),trigger:gp.buttons?.[0]?.value??(gp.buttons?.[0]?.pressed?1:0),thumbA:gp.buttons?.[4]?.value??(gp.buttons?.[4]?.pressed?1:0),thumbB:gp.buttons?.[5]?.value??(gp.buttons?.[5]?.pressed?1:0)};
  }
  const gripPose=src.gripSpace?frame.getPose(src.gripSpace,refSpace):null;
  const rayPose=src.targetRaySpace?frame.getPose(src.targetRaySpace,refSpace):null;
  const pose=gripPose||rayPose,rp=rayPose||gripPose;
  if(!pose){
   missingControllerSince[side] ||= now;
   if(lastKnownHands[side]&&now-lastKnownHands[side].at<150)fresh[side]={...lastKnownHands[side].input,trackingLost:true};
   delete pawContacts[side];delete prevHands[side];continue;
  }
  missingControllerSince[side]=0;
  const m=pose.transform.matrix,rm=rp.transform.matrix,rot=FrogyControls.rotate(m[12],m[14],turnYaw);
  const raw=[rot[0],m[13]+referenceShift,rot[1]];
  // Visible hand follows the controller exactly; only the collision probe extends
  // down toward the virtual floor. Previous builds drew hands a meter too low.
  let hand=FrogyCollision.reachablePaw(raw,vrPos);
  const mapCollision=isHub()?null:{SIZE:WorldData.SIZE,cover:obstacles(mapIndex)};
  // Do not slide the visible hand away from real tracked controller poses.
  // It is allowed to touch real wall colliders through a separate contact probe.
  const surface=pawSurface(raw,hand,pawContacts[side]?.type==='floor');
  const wallTouch=surface?.type==='wall';
  if(wallTouch)lastWallAt[side]=now;
  const clingWall=FrogyCling.wallEligible(wallTouch,lastWallAt[side],buttons?.triggerHeld||false,now);
  const boost=FrogyMotion.locomotionMultiplier(phase,me);
  const step=FrogyMotion.strokeContact(pawContacts[side],raw,surface,dt,FrogySettings.state.armPower*boost,now);
  pawContacts[side]=step.contact;
  // Same hands, same movement rules in hub and live matches. If the assisted
  // floor probe misses a relaxed swing, use only genuine tracked displacement.
  const assist=!step.push&&!vrMenuOpen&&prevHands[side]?
   FrogyMotion.relaxedArmStroke(prevHands[side],raw,dt,headHeight,FrogySettings.state.armPower*boost):null;
  const press=!vrMenuOpen&&prevHands[side]?
   FrogyMotion.groundPress(prevHands[side],raw,dt,headHeight,FrogySettings.state.armPower):null;
  // A lower-hand downward press works on the FIRST contact frame as well as
  // with stable contact; blend its upward impulse into ordinary XY/Z motion.
  const horizontal=step.push||assist;
  const push=horizontal?{...horizontal,up:Math.max(horizontal.up||0,press?.up||0)}:press;
  // VR menu interactions must never secretly move the frog.
  if(push&&!vrMenuOpen&&FrogyMotion.canMove(phase,me?.alive,me?.spectating,vrMenuOpen))pushes.push(push);
  // Render actual tracked hand only. Contact data exists solely for physics.
  const rayPos=FrogyControls.rotate(rm[12],rm[14],turnYaw),rayDir=FrogyControls.rotate(-rm[8],-rm[10],turnYaw),d=norm([rayDir[0],-rm[9],rayDir[1]]);
  const ray={o:[rayPos[0]+vrPos.x,rm[13]+referenceShift+vrPos.y,rayPos[1]+vrPos.z],d};
  fresh[side]={hand,raw,ray,src,basis:FrogyPawPose.basisFromGrip(m,turnYaw),yaw:Math.atan2(-d[0],-d[2]),touch:step.contact?.type||false,wall:clingWall,triggerHeld:buttons?.triggerHeld||false,pose:handPoseFromButtons(buttons)};
  if(clingWall&&buttons?.triggerHeld&&!vrMenuOpen&&now>=clingLockUntil&&prevHands[side])wallClimbDelta+=FrogyCling.climbStroke(prevHands[side],raw,dt);
  if(buttons){
   if(buttons.grappleDown&&!vrMenuOpen){
    if(phase==='playing'&&me?.monster)attack('roar',d);
    else if(currentMouth){
     // Exactly one tongue may exist. Y and B launch the SAME mouth tongue,
     // never separate ropes coming out of each controller hand.
     const other=side==='left'?'right':'left';
     tongues[other]={active:false,readyAt:0};
     tongues[side]=FrogyGrapple.activate(tongues[side],now,currentMouth.o,currentMouth.d,isHub()?'hub':'arena',isHub()?null:{SIZE:WorldData.SIZE,cover:obstacles(mapIndex)});
     if(tongues[side].active)FrogyAudio.play('grab');
    }
   }
   if(buttons.triggerDown&&(vrMenuOpen||!clingWall))handleQuestTrigger(side,ray);
   if(phase==='playing'&&me?.alive&&!me.spectating&&!vrMenuOpen){
    if(buttons.gripDown){
     const heldOnHand=me.heldPart&&me.heldPartHand===side;
     const closePart=worldParts.some(q=>!q.heldBy&&Math.hypot(q.x-hand[0],q.y-hand[1],q.z-hand[2])<1.35);
     if(me.monster&&!closePart&&!heldOnHand)attack(side==='left'?'rip':'chomp',d);
     else send({type:'grab',hand:side,handPosition:hand});
    }
    if(buttons.gripUp){
     const prev=prevHands[side]||raw,throwV=raw.map((v,i)=>clamp((v-prev[i])/Math.max(.008,dt)*.92,-10.5,10.5));
     send({type:'dropPart',hand:side,velocity:throwV});
     if(!me.monster)send({type:'drop',hand:side,velocity:throwV});
    }
    if(buttons.roarDown&&me.monster)attack('roar',d);
   }
  }
  // Vertical hand tracker noise must never kick the player's body upward.
  prevHands[side]=raw;
  lastKnownHands[side]={at:now,input:fresh[side]};
 }
 // Wall clinging is a separate, timed ability: release trigger to fall.
 const wasClinging=clingActive;
 clingState=FrogyCling.tick(clingState,now,{left:{wall:!!fresh.left?.wall,trigger:!!fresh.left?.triggerHeld},right:{wall:!!fresh.right?.wall,trigger:!!fresh.right?.triggerHeld}},vrMenuOpen||now<clingLockUntil);
 clingActive=clingState.active;clingClimb=clingActive?clamp(wallClimbDelta,-.16,.16):0;
 if(clingActive&&!wasClinging){FrogyAudio.play('cling_attach');clingSoundAt=now;}
 if(!clingActive&&wasClinging){FrogyAudio.play('cling_release');clingClimb=0;}
 if(pushes.length){
  // Same cap as physics(): this MUST be in this function scope.
  const cap=FrogyMotion.speedCap(phase,me);
  const launch=Math.max(...pushes.map(p=>p.up||0));
  if(launch>.72&&(grounded||vrPos.y<.18)&&now-lastPalmPushOffAt>250){
   vel.y=Math.max(vel.y,Math.max(2.2,launch));grounded=false;vrPos.y+=.05;lastPalmPushOffAt=now;
   pawContacts={};FrogyAudio.play('push');
  }
  // Average active strokes only (a resting paw never weakens the moving paw).
  // Stable tracking-space differences remove the world-anchor feedback loop.
  const desired=FrogyMotion.strokeVelocity(pushes,dt,phase,me);
  // No minimum stride. A 1cm controller stroke gives a tiny movement;
  // large deliberate strokes accelerate more. Releasing the paws brakes.
  if(desired){
   const response=grounded?.88:.65;
   vel.x=clamp(vel.x*(1-response)+desired.x*response,-cap,cap);
   vel.z=clamp(vel.z*(1-response)+desired.z*response,-cap,cap);
  }
  // Mega Frog uses the exact same push + jump algorithm as survivors. It
  // has a moderate horizontal advantage, not an automatic super-jump.

  // Sweeping a paw DOWN a climbable wall also pushes the body upward, even
  // without holding the timed wall-stick trigger.
  const wallLift=Math.max(0,...pushes.filter(p=>p.wall).map(p=>p.up||0));
  if(wallLift>.4){vel.y=Math.max(vel.y,Math.min(4.5,wallLift));grounded=false;}
  lastPushAt=now;
  if(now-lastHandThump>300){lastHandThump=now;FrogyAudio.play('push');}
  // Hand visuals stay aligned with controllers, no contact-snap or fake paws.
  /* No duplicate position adjustment: physics() advances the rig once per frame. */
 }

 vrInput=fresh;
 trackingWarning=(!fresh.left||!fresh.right)?'TRACKING: '+(fresh.left?'LEFT OK':'LEFT MISSING')+' / '+(fresh.right?'RIGHT OK':'RIGHT MISSING')+' · CHECK QUEST CONTROLLERS':'PAW CONTACT '+[fresh.left?.touch,fresh.right?.touch].filter(Boolean).length+'/2 · TAP X MENU · TAP A JUMP';
}
function onXRSelect(event){if(!session)return;const src=event.inputSource;
 const rp=src.targetRaySpace?event.frame.getPose(src.targetRaySpace,refSpace):null;if(!rp)return;
 const m=rp.transform.matrix,rot=FrogyControls.rotate(m[12],m[14],turnYaw),dir=FrogyControls.rotate(-m[8],-m[10],turnYaw);
 const side=src.handedness||'right';
 // A selectstart event can precede the per-frame trigger handler. Probe the
 // current controller pose too, so grabbing a wall never accidentally fires.
 if(!vrMenuOpen){
  const hp=src.gripSpace?event.frame.getPose(src.gripSpace,refSpace):rp;
  const hm=hp?.transform?.matrix;
  if(hm){const turn=FrogyControls.rotate(hm[12],hm[14],turnYaw),raw=[turn[0],hm[13]+referenceShift,turn[1]],hand=FrogyCollision.reachablePaw(raw,vrPos,headHeight,FrogySettings.state.reachScale);
   if(pawSurface(raw,hand,pawContacts[side]?.type==='floor')?.type==='wall')return;}
  if(vrInput[side]?.wall)return;
 }
 handleQuestTrigger(side,{o:[rot[0]+vrPos.x,m[13]+referenceShift+vrPos.y,rot[1]+vrPos.z],d:norm([dir[0],-m[9],dir[1]])});
}
function netUpdate(now,viewPose=null){if(localPractice||!room||!me||(phase==='playing'&&me.spectating)||now-lastNet<.085)return;lastNet=now;
 let x=vrPos.x,z=vrPos.z,y=vrPos.y,l=null,r=null;
 if(session&&viewPose){const p=viewPose.transform.position,rot=FrogyControls.rotate(p.x,p.z,turnYaw);x+=rot[0];z+=rot[1];l=vrInput.left?.hand||null;r=vrInput.right?.hand||null;}
 send({type:'move',x,y,z,yaw:lookYaw,l,r,lYaw:vrInput.left?.yaw??lookYaw,rYaw:vrInput.right?.yaw??lookYaw,
  lBasis:vrInput.left?.basis||null,rBasis:vrInput.right?.basis||null,
  lCurl:vrInput.left?.pose||[0,0,0],rCurl:vrInput.right?.pose||[0,0,0],
  bodyYaw:bodyTrack.yaw,bodyPitch:bodyTrack.pitch,bodyLean:bodyTrack.lean,bodyLift:(bodyTrack.height-1.65)*.2,
  tongue:tongues.left.active?tongues.left.point:tongues.right.active?tongues.right.point:null,
  mouth:FrogVoice.level()});}
function resize(){if(session)return;const dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(window.innerWidth*dpr),h=Math.round(window.innerHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
function drawDesktop(time){
 if(session)return;
 // Do not render a playable desktop view, physics, network movement, or player controls.
 requestAnimationFrame(drawDesktop);
}
function frameVR(time,frame){const s=frame.session;s.requestAnimationFrame(frameVR);let now=time/1000,dt=lastTick?clamp(now-lastTick,0,.06):0;lastTick=now;const pose=frame.getViewerPose(refSpace);if(!pose)return;
 updateVRInputs(frame,dt,pose);
 if(phase==='playing'&&me?.monster)tongues={left:{active:false,readyAt:0},right:{active:false,readyAt:0}};
 const pulls=[];
 for(const side of ['left','right']){
  const tug=FrogyGrapple.update(tongues[side],performance.now(),vrPos,vel,dt,vrMenuOpen);
  tongues[side]=tug.state;if(tug.state.active)pulls.push(tug.velocity);
 }
 // Simultaneous grapples blend rather than stacking two launch impulses.
 if(pulls.length)vel={x:pulls.reduce((a,b)=>a+b.x,0)/pulls.length,y:pulls.reduce((a,b)=>a+b.y,0)/pulls.length,z:pulls.reduce((a,b)=>a+b.z,0)/pulls.length};
 const beforePhysics={...vrPos};physics(dt);
 // Physics changes the avatar rig after we sample both controllers. Keep the
 // visible paws and aiming rays attached to their *real* tracked controller
 // locations, not one stale physics frame behind the camera.
 const correction=[vrPos.x-beforePhysics.x,vrPos.y-beforePhysics.y,vrPos.z-beforePhysics.z];
 if(currentMouth)for(let j=0;j<3;j++)currentMouth.o[j]+=correction[j];
 if(correction.some(x=>Math.abs(x)>1e-7))for(const h of Object.values(vrInput))if(h){
  for(const pos of [h.hand,h.ray?.o])if(pos)for(let j=0;j<3;j++)pos[j]+=correction[j];
 }
 netUpdate(now,pose);updateParticles(dt);
 const mm=pose.transform.matrix,headPlan=FrogyControls.rotate(mm[12],mm[14],turnYaw),headDir=FrogyControls.rotate(-mm[8],-mm[10],turnYaw),head={x:vrPos.x+headPlan[0],y:vrPos.y+referenceShift+mm[13],z:vrPos.z+headPlan[1],forward:norm([headDir[0],-mm[9],headDir[1]])};
 const layer=s.renderState.baseLayer;gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.enable(gl.SCISSOR_TEST);
 for(const view of pose.views){const vp=layer.getViewport(view);if(!vp)continue;
  try{
   gl.viewport(vp.x,vp.y,vp.width,vp.height);gl.scissor(vp.x,vp.y,vp.width,vp.height);
   gl.clearDepth(1);gl.clearColor(...(isHub()?[.018,.026,.033]:MAPS[mapIndex].sky),1);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   P=view.projectionMatrix;V=mul(view.transform.inverse.matrix,mul(mat(0,0,0,1,1,1,-turnYaw),matTranslation(-vrPos.x,-vrPos.y-referenceShift,-vrPos.z)));
   drawScene(now,head);
  }catch(e){xrRenderFailures++;if(xrRenderFailures<5)console.error('Frogy XR eye render failed',view.eye,e);}
 }
 gl.disable(gl.SCISSOR_TEST);
}
async function enterVR(){FrogyAudio.unlock();FrogyAudio.setMode(phase==='playing'?'playing':'lobby');if(!navigator.xr){setVROnlyStatus('VR requires Quest Browser and HTTPS. Frogy is not playable on desktop or mobile.');return;}
 try{const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});if(gl.makeXRCompatible)await gl.makeXRCompatible();session=s;document.body.classList.remove('vr-only-landing');$('#vrOnlyGate').classList.add('hidden');s.updateRenderState({baseLayer:new XRWebGLLayer(s,gl,{alpha:false,antialias:false,depth:true,framebufferScaleFactor:.85})});try{refSpace=await s.requestReferenceSpace('local-floor');referenceShift=0;}catch{refSpace=await s.requestReferenceSpace('local');referenceShift=1.6;}
  vrMenuOpen=!localStorage.getItem('frogy-help-v8');vrPage=vrMenuOpen?'tutorial':'pond';vrPanel=null;menuLatchState={armed:true,releasedAt:null,pressed:false};lastMenuToggleAt=-1e9;lastButtons={};pawContacts={};lastKnownHands={};lastTriggerBySide={left:0,right:0};turnYaw=0;stickLatched=false;prevHands={};bodyTrack={yaw:0,pitch:0,lean:0,height:1.65};vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;lastGroundAt=performance.now();s.addEventListener('selectstart',onXRSelect);s.addEventListener('end',()=>{if(room)send({type:'leave'});session=null;vrInput={left:null,right:null};prevHands={};clingState=FrogyCling.initial();clingActive=false;tongues={left:{active:false,readyAt:0},right:{active:false,readyAt:0}};lastWallAt={left:-Infinity,right:-Infinity};lastTick=0;document.body.classList.remove('in-xr');document.body.classList.add('vr-only-landing');$('#vrOnlyGate').classList.remove('hidden');ui.cross.classList.remove('visible');vrMenuOpen=true;requestAnimationFrame(drawDesktop);});document.body.classList.add('in-xr');ui.cross.classList.remove('visible');pendingJumpAt=-Infinity;clingState=FrogyCling.initial();clingActive=false;tongues={left:{active:false,readyAt:0},right:{active:false,readyAt:0}};lastWallAt={left:-Infinity,right:-Infinity};lastTick=0;lastBoard=0;autoJoinPond();s.requestAnimationFrame(frameVR);
 }catch(e){setVROnlyStatus('Could not start immersive VR: '+e.message);toast('Could not enter VR: '+e.message,6000);}}
// VR-only: desktop/mobile input cannot move, attack, purchase, or join matches.
canvas.onpointerdown=()=>{};
window.addEventListener('keydown',()=>{});
window.addEventListener('keyup',()=>{});
function startPractice(){setVROnlyStatus('Frogy gameplay is available only inside immersive VR on a supported headset.');}
function stopPractice(){localPractice=false;}
function practiceAttack(kind,dir){
 const origin={x:vrPos.x,y:vrPos.y+1.2,z:vrPos.z},d=dir||myForward();
 attackFx({...origin,kind,dir:d,id:me.id});
 if(!practiceMonster)return;
 const tx=practiceMonster.x-origin.x,tz=practiceMonster.z-origin.z,range=kind==='blaster'?25:2.5;
 if(Math.hypot(tx,tz)<range&&(kind==='blaster'||(tx*d[0]+tz*d[2])>0)){
  emitSplat(practiceMonster.x,1.2,practiceMonster.z,42,[.7,.03,.07]);
  practiceMonster.mouth=1;practiceMonster.hp=Math.max(0,practiceMonster.hp-(kind==='blaster'?25:60));
  if(practiceMonster.hp<=0){popFrog({...practiceMonster,y:0});practiceMonster.x=rand(-25,25);practiceMonster.z=rand(-25,25);practiceMonster.hp=350;}
 }
}
function practiceTick(dt){
 if(!practiceMonster||!me)return;
 // Slow pursuit showcases the monster while keeping desktop exploration usable.
 const dx=vrPos.x-practiceMonster.x,dz=vrPos.z-practiceMonster.z,dist=Math.hypot(dx,dz)||1;
 if(dist>5&&dist<45){practiceMonster.x+=dx/dist*dt*.92;practiceMonster.z+=dz/dist*dt*.92;}
 practiceMonster.yaw=Math.atan2(-dx,dz);practiceMonster.mouth=Math.max(.15,(practiceMonster.mouth||0)-dt*.8);
 me.x=vrPos.x;me.y=vrPos.y;me.z=vrPos.z;me.yaw=lookYaw;
}
// Legacy desktop-practice controls are removed in this VR-only build.
window.addEventListener('resize',resize);window.addEventListener('blur',()=>keys={});
function setVROnlyStatus(message){const box=$('#vrOnlyStatus');if(box)box.textContent=message;}
$('#vrOnlyEnter').addEventListener('click',()=>enterVR());
async function checkVRAvailability(){
 const btn=$('#vrOnlyEnter');
 btn.disabled=true;
 if(!navigator.xr?.isSessionSupported){setVROnlyStatus('A Meta Quest headset and Quest Browser are required. Desktop and mobile gameplay are disabled.');return;}
 try{
  const ok=await navigator.xr.isSessionSupported('immersive-vr');
  if(!ok){setVROnlyStatus('This browser cannot start immersive VR. Open the link in Meta Quest Browser on Quest 2, 3, or 3S.');return;}
  btn.disabled=false;setVROnlyStatus('Ready on Quest. Select ENTER FROGY VR to open the 3D lobby and choose a room.');
 }catch(e){setVROnlyStatus('VR support could not be checked: '+e.message);}
}
checkVRAvailability();
resize();requestAnimationFrame(drawDesktop);
// Meta Quest immersive PWA: launching the installed app icon counts as user activation.
// Keep the on-page ENTER VR button for regular browser use.
// Never auto-enter VR: browser session creation must follow an explicit headset click.

