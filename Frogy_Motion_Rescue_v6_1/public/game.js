'use strict';
/* FROGY — dependency-free WebGL/WebXR client. Best played over HTTPS in Quest Browser. */
const $=s=>document.querySelector(s), canvas=$('#gl');
const ui={home:$('#home'),lobby:$('#lobby'),hud:$('#hud'),vrbar:$('#vrbar'),bottom:$('#bottomhelp'),error:$('#error'),toast:$('#toast'),end:$('#endPanel'),cross:$('#crosshair')};
const PALETTE={mint:[.54,.94,.63],pink:[1,.63,.77],lilac:[.74,.63,1],blue:[.51,.82,1],peach:[1,.78,.56],lime:[.79,.94,.46]};
const MAPS=WorldData.maps, WPN=WorldData.weapons;
function frogColor(code){if(typeof code==='string'&&/^rgb-[0-9]{3}$/.test(code))return [...code.slice(4)].map(n=>Number(n)/9);return PALETTE[code]||PALETTE.mint;}
function cssFrogColor(code){return 'rgb('+frogColor(code).map(n=>Math.round(n*255)).join(',')+')';}
const TAU=6.28318530718,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
let clientId='',room='',phase='home',remaining=0,mapIndex=0,round=0,chosenColor='mint',chosenName='Lil Frog',ws=null,me=null;
let all=[],pickups=[],worldParts=[],worldBlood=[],partVisual=new Map(),fx=[],beams=[],rags=[],puddles=[],announcements=[],session=null,refSpace=null,referenceShift=0,rendererFrames=0;
let lastTick=0,lastNet=0,lastUI=0,lastBoard=0,vrPos={x:0,y:0,z:0},vel={x:0,y:0,z:0},grounded=true,prevHands={},vrInput={right:null,left:null},lastButtons={};
let dx=0,dz=0,dy=0,lookYaw=0,lookPitch=0,keys={},inDesktop=false,noticeTimer=null;
let selectedVisibility='private',shopPending=null;
let lastHeartbeat=0,lastHandThump=0,vrMenuOpen=true,localPractice=false,practiceMonster=null,practiceMap=0,headHeight=1.65,lastPushAt=0,lastGroundAt=0,turnYaw=0,stickLatched=false,lastActiveMenu=false,missingControllerSince={left:0,right:0},trackingWarning="",xrRenderFailures=0;
let audio, profile={coins:0,inventory:[],equipped:{hat:'none',face:'none',back:'none'},color:'mint',bonus:0}, catalog=[],myVote=-1,nextMapIndex=0,activeTab='pond';
function isHub(){return FrogyMotion.isLobby(phase,me?.spectating);}
function sound(which=0){FrogyAudio.play(['ui','grab','hit','round','coin'][which]||'ui');}

function toast(t,delay=2500){ui.toast.textContent=t;ui.toast.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.toast.classList.remove('show'),delay);}
function send(obj){
 // The browser page is a VR launcher, never a desktop/mobile game.
 // Server still handles normal multiplayer profiles before headset entry.
 if(!session && obj.type!=='hello')return;
 if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));
}
function connect(){if(ws&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(ws.readyState))return;ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');$('#connection').textContent='● CONNECTING';ws.onopen=()=>{$('#connection').innerHTML='<span class="dot"></span> POND ONLINE';$('#connection').classList.add('online');ui.error.textContent='';let token='';try{token=localStorage.getItem('frog-frog-profile')||'';}catch{}send({type:'hello',token});};ws.onclose=()=>{FrogVoice.disable();syncVoiceButtons();$('#connection').innerHTML='<span class="dot"></span> DISCONNECTED';$('#connection').classList.remove('online');if(room){toast('Connection lost. Reload to rejoin a lobby.',6000);}else setTimeout(connect,1800);};ws.onerror=()=>{ui.error.textContent='Could not reach the multiplayer server. Start server.js first.'};ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return;}receive(m);};}
function receive(m){switch(m.type){
 case 'error':ui.error.textContent=m.message;toast(m.message);break;
 case 'joined':FrogVoice.onJoined();clientId=m.id;room=m.code;vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};prevHands={};selectedVisibility=m.visibility||'private';phase='lobby';myVote=-1;ui.home.classList.add('hidden');ui.lobby.classList.remove('hidden');$('#roomCode').textContent=room;ui.error.textContent='';toast('Welcome to the pond!');if(FrogVoice.enabled)send({type:'voice-ready',enabled:true});break;
 case 'left':FrogVoice.onJoined();room='';phase='home';FrogyAudio.setMode('lobby');ui.home.classList.remove('hidden');ui.lobby.classList.add('hidden');ui.hud.classList.add('hidden');ui.vrbar.classList.add('hidden');ui.bottom.classList.add('hidden');document.body.classList.remove('in-game');break;
 case 'state':updateState(m);break;
 case 'sitOutConfirmed':vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;prevHands={};vrMenuOpen=true;vrPage='pond';vrLast=-1;toast('You are in the waiting lobby until the next round.');break;
 case 'grabResult':if(!m.ok&&m.reason)toast(m.reason,1300);else FrogyAudio.play('grab');break;
 case 'partGrabbed':FrogyAudio.play('grab',{position:worldParts.find(p=>p.id===m.id),listener:vrPos});break;
 case 'partThrown':FrogyAudio.play('drop',{position:worldParts.find(p=>p.id===m.id),listener:vrPos});break;
 case 'shopResult':shopPending=null;renderShop();FrogyAudio.play(m.ok?'coin':'error');toast((m.ok?'🪙 ':'⚠️ ')+m.message,4200);if(document.querySelector('#shopStatus'))$('#shopStatus').textContent=m.message;break;
 case 'profile':profile={...m};catalog=m.shop||catalog;chosenColor=m.color||'mint';shopPending=null;for(const b of document.querySelectorAll('#colors .swatch'))b.classList.toggle('active',b.dataset.color===chosenColor);try{localStorage.setItem('frog-frog-profile',m.token);}catch{}renderShop();renderCloset();$('#coinBalance').textContent=String(m.coins);if(m.name){chosenName=m.name;$('#name').value=m.name;}updateProfileDisplay();if(m.bonus){FrogyAudio.play('coin');$('#bonusNote').textContent='🪙 DAILY LOGIN BONUS: +'+m.bonus+' COINS!';toast('DAILY HOP BONUS! +'+m.bonus+' 🪙',3200);}break;
 case 'rtc':FrogVoice.signal(m.from,m.data);break;
 case 'voice-ready':FrogVoice.peerReady(m.from,m.enabled);break;
 case 'voice-peers':FrogVoice.peersReady(m.ids);break;
 case 'peer-left':FrogVoice.peerLeft(m.from);break;
 case 'notice':toast(m.text,1800);break;
 case 'roundStart':clearFx();toast('⚠ '+m.text,5500);FrogyAudio.play('round');break;
 case 'roundEnd':FrogyAudio.play('round');$('#endTitle').textContent=m.text;$('#endSubtitle').textContent='Next round begins shortly…';ui.end.classList.remove('hidden');setTimeout(()=>ui.end.classList.add('hidden'),3500);toast(m.text,4500);sound(3);break;
 case 'attackFx':attackFx(m);break;
 case 'dropFx':FrogyAudio.play('drop',{position:m,listener:vrPos});if(m.id===clientId)toast('Weapon dropped — grip nearby to grab again');break;
 case 'ouch':emitSplat(m.x,m.y,m.z,27,m.kind==='roar'?[.8,.5,1]:[.68,.023,.044]);FrogyAudio.play('hit',{position:m,listener:vrPos});break;
 case 'gore':severEffect(m);break;
 case 'pop':popFrog(m);FrogyAudio.play('death',{position:m,listener:vrPos});break;
 case 'pickupFx':emitSplat(m.x,.65,m.z,12,[1,.86,.46]);FrogyAudio.play('grab',{position:m,listener:vrPos});if(m.id===clientId){toast('PICKED UP '+(m.weapon==='blaster'?'LILY BLASTER! 🫧':'TOAD SLICER! 🔪'),1700);sound(0);}break;
 }}
function updateState(s){if(localPractice)return;const oldPhase=phase,oldMap=mapIndex,wasSpectating=!!me?.spectating;phase=s.phase;remaining=s.seconds;nextMapIndex=s.selectedMap??s.map;mapIndex=phase==='playing'?s.map:nextMapIndex;round=s.round||0;all=s.players;pickups=s.pickups||[];worldParts=s.parts||[];worldBlood=s.blood||[];me=all.find(p=>p.id===clientId)||null;if(phase==='playing'&&me?.spectating&&!wasSpectating){vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};prevHands={};grounded=true;}FrogVoice.updateRoles(all);
 if(oldPhase!==phase){FrogyAudio.setMode(phase==='playing'?'playing':'lobby');if(phase==='playing'){vrMenuOpen=false;myVote=-1;ui.end.classList.add('hidden');ui.lobby.classList.add('hidden');ui.hud.classList.remove('hidden');ui.bottom.classList.remove('hidden');ui.vrbar.classList.remove('hidden');document.body.classList.add('in-game');$('#menuSettings').classList.remove('hidden');ui.cross.classList.remove('visible');if(me){vrPos.x=me.x;vrPos.y=0;vrPos.z=me.z;vel={x:0,y:0,z:0};prevHands={};lookYaw=0;}toast(me?.monster?'YOU ARE THE MONSTER FROG! 👹':'RUN, LITTLE FROG! 🐸',3400);}
 else if(phase==='countdown'){if(oldPhase==='playing'){vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;prevHands={};}ui.hud.classList.add('hidden');ui.lobby.classList.remove('hidden');ui.vrbar.classList.add('hidden');ui.bottom.classList.add('hidden');document.body.classList.remove('in-game');}
 else if(phase==='intermission'){vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;prevHands={};ui.hud.classList.remove('hidden');ui.lobby.classList.add('hidden');ui.vrbar.classList.remove('hidden');ui.bottom.classList.remove('hidden');}
 else if(phase==='lobby'){vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;prevHands={};worldParts=[];worldBlood=[];partVisual.clear();ui.cross.classList.remove('visible');ui.hud.classList.add('hidden');ui.end.classList.add('hidden');ui.lobby.classList.remove('hidden');ui.bottom.classList.add('hidden');ui.vrbar.classList.add('hidden');document.body.classList.remove('in-game');$('#menuSettings').classList.add('hidden');}}
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
function updateHUD(){if(!me)return;const beast=all.find(p=>p.monster&&p.alive),danger=phase==='playing'&&!me.monster&&me.alive&&beast?Math.max(0,1-Math.hypot(me.x-beast.x,me.z-beast.z)/21):0;document.documentElement.style.setProperty('--fear',danger.toFixed(2));FrogyAudio.setFear(danger);if(danger>.42&&Date.now()-lastHeartbeat>Math.max(450,1300-danger*750)){lastHeartbeat=Date.now();sound(3);}$('#hudRoom').textContent='ROOM • '+room;$('#hudMap').textContent=MAPS[mapIndex].name;$('#hudStatus').textContent=phase==='playing'?'ROUND '+round:phase==='intermission'?'ROUND OVER':'LOBBY';$('#hudTime').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');$('#hudRole').textContent=!me.alive?'👻 OUT UNTIL NEXT ROUND':me.monster?'👹 MONSTER FROG':'🐸 SURVIVOR FROG';$('#hudRole').classList.toggle('monster',me.monster);$('#grabHint').textContent=me.spectating?'WAITING UNTIL NEXT ROUND':me.heldPart?'RELEASE GRIP TO THROW':me.monster?'GRIP NEAR PART TO PICK UP · ELSE RIP/CHOMP':me.weapon==='none'?'GRIP NEAR WEAPONS OR PARTS':'RELEASE GRIP TO DROP / THROW';$('#hudWeapon').textContent=me.spectating?'WAITING FOR NEXT ROUND':me.monster?'👊 PUNCH · RIP · CHOMP · ROAR':me.weapon==='blaster'?'🔫 LILY BLASTER':me.weapon==='knife'?'🔪 TOAD SLICER':'🫧 FIND A WEAPON';}
function clearFx(){beams=[];fx=[];rags=[];puddles=[];worldParts=[];worldBlood=[];partVisual.clear();}
function lobbyName(){chosenName=$('#name').value.trim().slice(0,18)||'Lil Frog';}
$('#publicPlay').onclick=()=>{if(localPractice)stopPractice();lobbyName();send({type:'public',name:chosenName,color:chosenColor});};$('#publicAgain').onclick=()=>send({type:'public',name:chosenName,color:profile.color});$('#create').onclick=()=>{lobbyName();send({type:'create',name:chosenName,color:chosenColor})};$('#join').onclick=()=>{lobbyName();send({type:'join',code:$('#codeInput').value.toUpperCase().trim(),name:chosenName,color:chosenColor})};$('#codeInput').onkeydown=e=>{if(e.key==='Enter')$('#join').click()};$('#colors').onclick=e=>{const b=e.target.closest('[data-color]');if(!b)return;chosenColor=b.dataset.color;document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('active',x===b))};$('#copyCode').onclick=()=>navigator.clipboard?.writeText(room).then(()=>toast('Room code copied!')).catch(()=>toast('Code: '+room));$('#mapSelect').onclick=e=>{const b=e.target.closest('[data-map]');if(b&&!b.disabled){myVote=Number(b.dataset.map);send({type:'vote',index:myVote});}};$('#leave').onclick=()=>{send({type:'leave'});if(session)session.end()};$('#showLobby').onclick=()=>{if(phase==='playing'){toast('Shop and room changes open between rounds!',2500);return;}ui.lobby.classList.toggle('hidden');if(!ui.lobby.classList.contains('hidden'))toast('Lobby: '+room,1500);};$('#enterVR').onclick=()=>enterVR();$('#playVR').onclick=()=>enterVR();
function updateProfileDisplay(){
 const e=$('#profileStats'),r=$('#rewardTimer');if(e)e.textContent='🏆 '+(profile.stats?.wins||0)+' wins  ·  ⚔ '+(profile.stats?.kills||0)+' eliminations  ·  '+(profile.stats?.rounds||0)+' rounds';
 if(r&&profile.nextRewardAt){const sec=Math.max(0,Math.ceil((profile.nextRewardAt-Date.now())/1000));r.textContent=sec?'🪙 Next +40 coins in '+Math.floor(sec/3600)+'h '+Math.floor(sec%3600/60)+'m':'🪙 Daily coins ready on your next login';}
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
const shapeProg=makeProgram('attribute vec3 aPos,aNorm;uniform mat4 uP,uV,uM;varying float vL,vD;void main(){vec3 n=normalize(mat3(uM)*aNorm);vL=.34+.58*max(0.,dot(n,normalize(vec3(.3,.76,.40))));vec4 view=uV*uM*vec4(aPos,1.);vD=-view.z;gl_Position=uP*view;}','precision mediump float;uniform vec3 uC,uFog;uniform float uA,uG;varying float vL,vD;void main(){vec3 lit=uC*(vL+uG);float fog=smoothstep(17.,78.,vD)*.85;gl_FragColor=vec4(mix(lit,uFog,fog),uA);}');
const linesProg=makeProgram('attribute vec3 aPos;uniform mat4 uP,uV;void main(){gl_Position=uP*uV*vec4(aPos,1.);}','precision mediump float;uniform vec4 uC;void main(){gl_FragColor=uC;}');
const texProg=makeProgram('attribute vec3 aPos;attribute vec2 aUV;uniform mat4 uP,uV,uM;varying vec2 vUV;void main(){vUV=aUV;gl_Position=uP*uV*uM*vec4(aPos,1.);}','precision mediump float;varying vec2 vUV;uniform sampler2D uTex;void main(){gl_FragColor=texture2D(uTex,vUV);}');
function info(p,n){return gl.getAttribLocation(p,n)}function loc(p,n){return gl.getUniformLocation(p,n)}
const sp={p:shapeProg,a:info(shapeProg,'aPos'),n:info(shapeProg,'aNorm'),pM:loc(shapeProg,'uP'),v:loc(shapeProg,'uV'),m:loc(shapeProg,'uM'),c:loc(shapeProg,'uC'),aU:loc(shapeProg,'uA'),g:loc(shapeProg,'uG'),fog:loc(shapeProg,'uFog')};
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
function draw(m,mat4,col,glow=0,alpha=1){gl.useProgram(sp.p);gl.uniformMatrix4fv(sp.pM,false,P);gl.uniformMatrix4fv(sp.v,false,V);gl.uniformMatrix4fv(sp.m,false,mat4);gl.uniform3fv(sp.c,col);gl.uniform1f(sp.aU,alpha);gl.uniform1f(sp.g,glow);gl.uniform3fv(sp.fog,MAPS[mapIndex].fog);gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.enableVertexAttribArray(sp.a);gl.vertexAttribPointer(sp.a,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.enableVertexAttribArray(sp.n);gl.vertexAttribPointer(sp.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);gl.drawElements(gl.TRIANGLES,m.c,gl.UNSIGNED_SHORT,0);}
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
 for(let j=0;j<225;j++){let angle=rnd(j*9.31+t*62)*TAU,r=Math.sqrt(rnd(j*11.17+t*84))*59,x=Math.cos(angle)*r,z=Math.sin(angle)*r;if(Math.hypot(x,z)<5)continue;
  const col=t===0?(j%3?[.075,.15,.12]:[.14,.17,.15]):t===1?(j%3?[.15,.16,.16]:[.12,.13,.15]):(j%3?[.11,.16,.17]:[.16,.18,.16]);
  ball(x,.018,z,.4+rnd(j)*1.35,.033,.35+rnd(j*2)*1.25,col);if(j%7===0)ball(x,.11,z,.22,.13,.29,t===0?[.24,.33,.22]:[.18,.22,.24]);}
 if(FrogySettings.state.graphics!=='low')FrogyDetails.draw(t);
 FrogyLandmarks.draw(t);
 for(const o of obstacles(t)){
  const away=Math.hypot(o.x-vrPos.x,o.z-vrPos.z);if(phase==='playing'&&away>90)continue;
  if(t===0){if(o.type==='tree')treeProp(o,t);else if(o.type==='shack')shackProp(o);else{ball(o.x,o.h*.25,o.z,o.r*.9,o.h*.26,o.r*.9,[.18,.23,.22]);ball(o.x,o.h*.53,o.z,o.r*.97,o.h*.2,o.r*.9,[.11,.23,.17]);}}
  else if(t===1)graveProp(o);else facilityProp(o);
 }
 // Dense perimeter treeline, crumbling fence and ruined floodlights.
 for(let j=0;j<84;j++){const a=j/84*TAU,x=Math.cos(a)*64,z=Math.sin(a)*64;
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
function paw(pos,s,color){ball(pos[0],pos[1],pos[2],.16*s,.145*s,.14*s,color);for(let i=-1;i<=1;i++)ball(pos[0]+i*.12*s,pos[1]+(i===0?.035:0)*s,pos[2]-.17*s,.068*s,.085*s,.13*s,color);}
function frog(p,t,showWeapon=true){
 if(phase==='playing'&&Math.hypot(vrPos.x-p.x,vrPos.z-p.z)>62){if(p.alive!==false){const c=p.monster?[.20,.31,.27]:frogColor(p.color);ball(p.x,p.y+1.0,p.z,p.monster?1.32:.57,p.monster?1.65:1.05,p.monster?1.13:.56,c);}return;}
 const monster=!!p.monster,color=monster?[.20,.31,.27]:frogColor(p.color),sc=monster?1.93:1,bob=Math.sin(t*2.5+(+p.id||1))*.026;
 const speech=clamp(Number(p.mouth)||0,0,1),open=monster?Math.max(.30,speech):Math.max(.045,speech);const bulge=open*(monster?.31:.17);
 if(p.alive===false)return; // eliminated frogs return on the next round
 // Three-toed frog feet and round little belly remain cute and identifiable.
 ball(p.x,.017,p.z,.66*sc,.016,.53*sc,[.025,.055,.054]);
 for(const side of [-1,1]){
  dotBall(p,side*.33,.20,-.12,.28,.17,.34,color,sc);
  for(let j=-1;j<=1;j++)dotBall(p,side*.32+j*.13,.095,-.47,.095,.08,.18,color,sc);
 }
 dotBall(p,0,.84,.04,.52,.59,.42,color,sc);
 // Rounded skin folds, tiny reflective bumps and under-skin mottling.
 for(let i=0;i<12;i++){const a=(i*2.399),x=Math.sin(a)*(.31+(i%4)*.047),z=.26+Math.cos(a)*.17;dotBall(p,x,.58+(i%5)*.19,z,.065+(i%3)*.014,.044,.042,color.map(v=>v*(monster?.69:.80)),sc);}
 dotBall(p,0,.49,-.38,.41,.07,.07,monster?[.15,.22,.18]:color.map(v=>v*.76),sc);
 for(const side of [-1,1])dotBall(p,side*.49,1.10,-.01,.16,.18,.20,color.map(v=>v*.91),sc);

 dotBall(p,0,.81,-.35,.39,.40,.105,monster?[.46,.26,.27]:[.78,.81,.62],sc);
 // Raised cheeks, freckles and tiny sculpted skin spots.
 dotBall(p,0,1.40+bob,-.11,.62,.50,.52,color,sc);
 // Fine cheek pores, glossy belly highlights and raised eye sockets.
 for(let i=0;i<10;i++){const side=i%2?1:-1,j=Math.floor(i/2),ex=side*(.22+j*.056),ey=1.34+bob+(j%3)*.082;dotBall(p,ex,ey,-.59,.016+(j%2)*.007,.015,.012,monster?[.09,.21,.17]:color.map(v=>v*.77),sc);}
 dotBall(p,-.12,.70,-.444,.15,.055,.012,[.89,.88,.67],sc);
 dotBall(p,.12,.66,-.445,.13,.045,.012,[.85,.85,.66],sc);

 for(const side of [-1,1]){
  dotBall(p,side*.49,1.20+bob,-.37,.20,.16,.18,color,sc);
  for(let i=0;i<3;i++)dotBall(p,side*(.37+i*.1),1.43+bob-i*.12,-.55,.025,.021,.025,monster?[.53,.09,.10]:[.20,.34,.24],sc);
  dotBall(p,side*.31,1.75+bob,-.35-bulge*.45,.23+bulge*.15,.25+bulge*.17,.24+bulge*.2,color,sc);
  dotBall(p,side*.31,1.76+bob,-.52-bulge,.176+bulge*.19,.19+bulge*.16,.125+bulge*.13,monster?[.94,.76,.67]:[.99,.99,.94],sc);
  dotBall(p,side*.30,1.77+bob,-.635-bulge*.98,.086+bulge*.05,.11+bulge*.06,.047,monster?[.73,.10,.08]:[.075,.14,.18],sc,monster?.7:0);
  dotBall(p,side*.284,1.81+bob,-.68-bulge,.024,.025,.014,[1,1,1],sc);
  dotBall(p,side*.43,1.34+bob,-.57,.13,.075,.036,monster?[.62,.13,.18]:[.89,.51,.56],sc);
 }
 // Mouth is driven by live microphone amplitude broadcast with player position.
 dotBall(p,0,1.23+bob,-.613,.25+(monster?.13:0)+open*.12,.055+open*(monster?.38:.23),.045,monster?[.09,.018,.018]:[.065,.065,.07],sc);
 dotBall(p,0,1.105+bob-open*.07,-.653,.14+open*.065,.012+open*.10,.022,monster?[.74,.075,.12]:[.91,.36,.42],sc);
 // Rounded wet lip rims that stretch with talking; expressive throat inflates on speech.
 dotBall(p,0,1.23+bob,-.59,.29+open*.16,.064+open*.15,.03,color.map(v=>v*.66),sc);
 dotBall(p,0,.93,-.45,.26,.15+speech*.12,.07,monster?[.25,.17,.17]:[.73,.75,.59],sc);
 if(monster){
  // Enlarged mutated jaw with unsettling, staggered teeth and red streaks.
  dotBall(p,0,1.11+bob,-.50,.56,.18,.33,[.13,.24,.19],sc);
  for(let i=-3;i<=3;i++){
   const x=i*.108,off=Math.abs(i)/3;
   dotBall(p,x,1.35+bob-open*.10,-.70,.051,.085+open*.078,.06,[.86,.79,.62],sc);
   dotBall(p,x,1.04+bob-open*.21,-.67,.043,.07,.05,[.86,.78,.65],sc);
  }
  for(const side of [-1,1]){
   dotBall(p,side*.50,1.95+bob,-.12,.20,.32,.18,[.13,.25,.20],sc);
   dotBall(p,side*.48,2.20+bob,-.12,.09,.22,.12,[.62,.13,.18],sc);
   for(let j=0;j<3;j++)dotBall(p,side*(.48+j*.075),.87-j*.16,-.40,.047,.095,.06,[.48,.065,.09],sc);
  }
  for(let i=0;i<7;i++){const x=Math.sin(i*1.19)*.36,z=.32+Math.cos(i)*.18;dotBall(p,x,.79+i*.085,z,.14,.2,.13,[.20,.27,.21],sc);}
 }else{
  // Skin bumps and silly expressive eyebrows.
  for(const side of [-1,1]){dotBall(p,side*.34,1.99+bob,-.39,.22,.045,.09,color.map(x=>x*.73),sc);}
  dotBall(p,-.27,.99,-.43,.045,.034,.02,[.36,.48,.33],sc);
  dotBall(p,.17,.85,-.445,.06,.05,.02,[.41,.52,.35],sc);
 }
 cosmeticModel(p,sc);
 // Gorilla Tag-style hands, with visible 3-finger paws and tracked arm reach.
 for(const side of [-1,1]){
  const shoulder=transform(p,side*.44,1.04,-.05,sc);
  const tracked=side<0?p.l:p.rr,hand=tracked&&tracked.length===3&&Math.hypot(tracked[0]-p.x,tracked[2]-p.z)<2.8*sc?tracked:transform(p,side*.90,.64,-.34,sc);
  if((p.lostArms||0)&(side===-1?1:2))continue;
  rod(shoulder,hand,(monster?.17:.14)*sc,color);paw(hand,sc*(monster?1.08:.85),color);
  if(monster){for(let i=-1;i<=1;i++)ball(hand[0]+i*.14*sc,hand[1]-.08*sc,hand[2]-.24*sc,.036*sc,.08*sc,.11*sc,[.68,.63,.56]);}
  if(showWeapon&&(p.heldHand||'right')===(side===1?'right':'left')&&p.weapon!=='none'&&!monster)weaponModel(hand,p.weapon,sc*.75,p.yaw);
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
 const side=m.side==='left'?-1:1;
 const count=FrogySettings.state.graphics==='low'?55:140;
 emitSplat(m.x+side*.38,m.y+.12,m.z,count,[.77,.012,.043]);
 emitSplat(m.x+side*.4,m.y-.01,m.z,Math.floor(count*.48),[.39,.015,.021]);
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
function updateParticles(dt){
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
  rod([x-.12-wobble,y+.22,z],[x+.15+wobble,y-.17,z],.14,c);
  ball(x+.16+wobble,y-.20,z,.19,.17,.17,c);
  for(let i=-1;i<=1;i++)ball(x+.16+wobble+i*.11,y-.24+Math.abs(wobble)*.25,z-.17,.07,.07,.12,c);
  ball(x-.13,y+.24,z,.13,.07,.13,[.48,.018,.027]);
 }else if(part.kind==='head'){
  ball(x,y+Math.abs(wobble)*.07,z,.43,.35,.36,c);
  for(const side of [-1,1]){ball(x+side*.22+wobble,y+.30,z-.25,.18,.21,.19,c);ball(x+side*.22+wobble,y+.30,z-.42,.12,.13,.07,[.97,.96,.90]);ball(x+side*.22+wobble,y+.30,z-.47,.065,.075,.02,[.042,.060,.08]);}
  ball(x,y-.09,z-.29,.23,.07,.06,[.09,.02,.025]);
 }
}
function drawParticles(){
 const maxDist=FrogySettings.state.graphics==='low'?28:45,near=p=>Math.abs(p.x-vrPos.x)<maxDist&&Math.abs(p.z-vrPos.z)<maxDist;
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
function localPaw(pos,color=PALETTE.mint){paw(pos,.8,color);}
function drawScene(t,head=null){gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);if(isHub()){lobbyEnvironment(t);lobbyProps(t);}else{terrain(mapIndex);weather(t);pickupsDraw(t);}
 if(all.length){for(const p of all){if(session&&p.id===clientId)continue;if(isHub()&&p.spectating&&phase==='playing')continue;if(inDesktop&&p.id===clientId&&phase==='playing')continue;frog(p,t);}}
 else{const demo=[{id:'1',x:-2.4,y:0,z:-2,color:'mint',weapon:'blaster',monster:false,alive:true,yaw:.23},{id:'2',x:1.5,y:0,z:-4,color:'pink',weapon:'knife',monster:false,alive:true,yaw:-.5},{id:'3',x:5,y:0,z:-6,color:'lilac',monster:true,weapon:'none',alive:true,yaw:-.6}];for(const p of demo)frog(p,t);}
 if(session){const col=me?.monster?[.24,.30,.27]:frogColor(me?.color);for(const side of ['left','right']){const q=vrInput[side];if(!q)continue;localPaw(q.hand,col);if(!me?.monster&&me?.weapon!=='none'&&me.heldHand===side)weaponModel(q.hand,me.weapon,.74,lookYaw);const e=q.ray;lines([...e.o,...e.o.map((v,i)=>v+e.d[i]*3)],[.58,.95,.90,.27]);}}
 if(!isHub())drawParticles();if(session&&head){if(vrMenuOpen){drawVRMenu(t,head);drawVRLaser();}else if(phase==='playing'){updateBillboard(t);drawBillboard(head);}} }
// Head-up display for Quest: a small, head-following information panel.
const board=document.createElement('canvas');board.width=1024;board.height=256;const bc=board.getContext('2d');const boardTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const quadV=gl.createBuffer(),quadUV=gl.createBuffer(),quadI=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,1,1,1,1,0,0,0]),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW);
function updateBillboard(t){if(t-lastBoard<.2)return;lastBoard=t;bc.clearRect(0,0,1024,256);bc.fillStyle='#142b39ed';bc.beginPath();bc.roundRect(8,8,1008,240,34);bc.fill();bc.lineWidth=7;bc.strokeStyle='#c8ffa9';bc.stroke();bc.font='bold 40px sans-serif';bc.fillStyle='#d2ffab';bc.fillText('FROGY  ·  '+room,36,60);bc.font='bold 37px sans-serif';bc.fillStyle='white';bc.fillText(me?.monster?'MONSTER!':'SURVIVOR',36,130);bc.font='31px sans-serif';bc.fillText((me?.weapon||'NONE').toUpperCase(),36,192);bc.font='bold 75px sans-serif';bc.textAlign='right';bc.fillStyle=remaining<15?'#ff9ba9':'#faffb7';bc.fillText(String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'),961,157);bc.textAlign='left';gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,board);}
function drawBillboard(head){if(!me)return;const f=head.forward||[0,0,-1],right=[-f[2],0,f[0]],x=head.x+f[0]*1.5-right[0]*.35,y=head.y+.7,z=head.z+f[2]*1.5-right[2]*.35,yaw=Math.atan2(-f[0],f[2]);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);gl.uniformMatrix4fv(tp.m,false,mat(x,y,z,1.32,.34,1,yaw));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.uniform1i(tp.tex,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);}
// ——— CONTROLS & GAME LOOP ———
function myForward(){return [Math.sin(lookYaw)*Math.cos(lookPitch),Math.sin(lookPitch),-Math.cos(lookYaw)*Math.cos(lookPitch)];}
function attack(kind=null,direction=null,origin=null){if(!session||phase!=='playing'||!me?.alive||me.spectating||session&&vrMenuOpen)return;let k=kind||((me.monster)?'punch':me.weapon);if(k==='none')return;if(localPractice){practiceAttack(k,direction||myForward());return;}send({type:'attack',kind:k,dir:direction||myForward(),origin});}
function jump(){
 if(!session||!FrogyMotion.canJump(phase,me?.alive,me?.spectating,vrMenuOpen))return;
 if(grounded||vrPos.y<.16||performance.now()-lastGroundAt<140){
  vel=FrogyMotion.preserveJump(vel);vrPos.y+=.035;grounded=false;
  FrogyAudio.play('jump');toast('JUMP · MOMENTUM KEPT',900);
 }
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
 // VR arm locomotion is the only enabled locomotion mode.
 if(vel.y>0||vrPos.y>0){vel.y-=FrogyMotion.settings.gravity*dt;vrPos.y+=vel.y*dt;grounded=false;}
 else{vel.y=0;grounded=true;lastGroundAt=performance.now();}
 if(vrPos.y<0){vrPos.y=0;vel.y=0;grounded=true;lastGroundAt=performance.now();}
 // Keep combined horizontal speed bounded, including diagonal movement.
 const planarSpeed=Math.hypot(vel.x,vel.z),cap=FrogyMotion.settings.maxHorizontalSpeed;
 if(planarSpeed>cap){vel.x*=cap/planarSpeed;vel.z*=cap/planarSpeed;}
 vrPos.x+=vel.x*dt;vrPos.z+=vel.z*dt;
 const movingDesktop=!session&&(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD);
 if(!movingDesktop){const factor=FrogyMotion.drag(grounded,dt);vel.x*=factor;vel.z*=factor;}
 vel.x=clamp(vel.x,-FrogyMotion.settings.maxHorizontalSpeed,FrogyMotion.settings.maxHorizontalSpeed);
 vel.z=clamp(vel.z,-FrogyMotion.settings.maxHorizontalSpeed,FrogyMotion.settings.maxHorizontalSpeed);
 if(vrPos.y>5.5){vrPos.y=5.5;vel.y=Math.min(vel.y,0);}
 if(isHub()){
  // The lobby is its own building with predictable, unclipped collision walls.
  const safe=FrogyHub.resolve(vrPos.x,vrPos.z);
  if(Math.abs(safe.x-vrPos.x)>.001)vel.x=0;
  if(Math.abs(safe.z-vrPos.z)>.001)vel.z=0;
  vrPos.x=safe.x;vrPos.z=safe.z;
  return;
 }
 const rad=Math.hypot(vrPos.x,vrPos.z),max=WorldData.SIZE-1;
 if(rad>max){vrPos.x*=max/rad;vrPos.z*=max/rad;vel.x=vel.z=0;}
 for(const o of obstacles(mapIndex)){
  if(vrPos.y>o.h+.1)continue;
  const ox=vrPos.x-o.x,oz=vrPos.z-o.z,d=Math.hypot(ox,oz),min=o.r+.34;
  if(d<min){const f=(min-d)/(d||1);vrPos.x+=(d?ox:1)*f;vrPos.z+=oz*f;vel.x*=.45;vel.z*=.45;}
 }
}
function wallHandContact(q){
 if(isHub())return q[1]<3.8&&((Math.abs(q[0])>19||Math.abs(q[2])>19)||FrogyHub.stations.some(s=>Math.hypot(q[0]-s.x,q[2]-s.z)<s.r+.35));
 const r=Math.hypot(q[0],q[2]);if(r>WorldData.SIZE-.7 && q[1]<4)return true;
 for(const o of obstacles(mapIndex))if(q[1]<o.h+.25 && Math.abs(q[0]-o.x)<o.r+.4&&Math.abs(q[2]-o.z)<o.r+.4)return true;
 return false;
}
function updateVRInputs(frame,dt,viewerPose){
 const fresh={left:null,right:null};
 if(viewerPose){const vm=viewerPose.transform.matrix;headHeight=clamp(vm[13]+referenceShift,1.0,2.2);lookYaw=Math.atan2(-vm[8],vm[10])+turnYaw;}
 for(const src of session.inputSources){
  const side=src.handedness;if(side!=='left'&&side!=='right')continue;
  const gp=src.gamepad;
  // A controller's grip may be briefly unavailable during Quest WebXR startup.
  // Recover using the target ray; do not discard both hands just because one pose is null.
  const gripPose=src.gripSpace?frame.getPose(src.gripSpace,refSpace):null;
  const rayPose=src.targetRaySpace?frame.getPose(src.targetRaySpace,refSpace):null;
  const pose=gripPose||rayPose,rp=rayPose||gripPose;
  if(!pose){delete prevHands[side];missingControllerSince[side] ||= performance.now();continue;}
  missingControllerSince[side]=0;
  const m=pose.transform.matrix,rm=rp.transform.matrix,rot=FrogyControls.rotate(m[12],m[14],turnYaw);
  const raw=[rot[0],m[13]+referenceShift,rot[1]],hand=[raw[0]+vrPos.x,raw[1]+vrPos.y,raw[2]+vrPos.z];
  const rayPos=FrogyControls.rotate(rm[12],rm[14],turnYaw),rayDir=FrogyControls.rotate(-rm[8],-rm[10],turnYaw),d=norm([rayDir[0],-rm[9],rayDir[1]]);
  fresh[side]={hand,raw,ray:{o:[rayPos[0]+vrPos.x,rm[13]+referenceShift+vrPos.y,rayPos[1]+vrPos.z],d},src};
  if(FrogyMotion.canMove(phase,me?.alive,me?.spectating,vrMenuOpen)&&prevHands[side]){
   const impulse=FrogyMotion.handPush(prevHands[side],raw,dt,headHeight,grounded||vrPos.y<.28,wallHandContact(hand));
   if(impulse){
    vrPos.x+=clamp(impulse.dx*.42,-.075,.075);vrPos.z+=clamp(impulse.dz*.42,-.075,.075);
    vel.x=clamp(vel.x*.88+impulse.vx*.36,-10,10);vel.z=clamp(vel.z*.88+impulse.vz*.36,-10,10);
    if(impulse.up>.20){vrPos.y+=Math.min(.04,impulse.up*dt);vel.y=Math.max(vel.y,impulse.up);grounded=false;}
    lastPushAt=performance.now();if(lastPushAt-lastHandThump>220){lastHandThump=lastPushAt;FrogyAudio.play(impulse.wall?'step':'push');}
   }
  }
  if(gp){
   // Store button state only AFTER evaluating both edges; old code inadvertently
   // changed the state between press() and release(), making drops impossible.
   const edge=n=>FrogyControls.pressedEdge(lastButtons[side+'_'+n],FrogyControls.button(gp,n));
   const released=n=>FrogyControls.releasedEdge(lastButtons[side+'_'+n],FrogyControls.button(gp,n));
   const toggleMenu=side==='left'&&(edge(4)||(gp.buttons.length>7&&edge(7))); // X or exposed 3-lines/menu
   if(toggleMenu){vrMenuOpen=!vrMenuOpen;if(vrMenuOpen){vrPage='settings';vel.x=0;vel.z=0;}vrLast=-1;prevHands={};FrogyAudio.play('ui');}
   if(side==='right'&&edge(4))jump();
   if(phase==='playing'&&me?.alive&&!me.spectating&&!vrMenuOpen){
    if(edge(1)){
     const heldOnHand=me.heldPart&&me.heldPartHand===side;
     const closePart=worldParts.some(q=>!q.heldBy&&Math.hypot(q.x-hand[0],q.y-hand[1],q.z-hand[2])<1.35);
     if(me.monster&&!closePart&&!heldOnHand)attack(side==='left'?'rip':'chomp',d);
     else send({type:'grab',hand:side});
    }
    if(released(1)){
     const prev=prevHands[side]||raw,throwV=raw.map((v,i)=>clamp((v-prev[i])/Math.max(.008,dt)*.92,-10.5,10.5));
     // Always send release: grabs may arrive before the next server snapshot updates me.
     send({type:'dropPart',hand:side,velocity:throwV});
     if(!me.monster)send({type:'drop',hand:side,velocity:throwV});
    }
    if(side==='right'&&edge(5)&&me.monster)attack('roar',d);
   }
   if(side==='right'&&(!vrMenuOpen||isHub())){
    const v=FrogyControls.thumbX(gp),t=FrogyControls.turnAngle(v,dt,FrogySettings.state,stickLatched);
    stickLatched=t.latch;
    if(t.delta){turnYaw+=t.delta;prevHands={};lookYaw+=t.delta;vrLast=-1;}
   }
   for(let n=0;n<gp.buttons.length;n++)lastButtons[side+'_'+n]=!!gp.buttons[n]?.pressed;
  }
  prevHands[side]=raw;
 }
 vrInput=fresh;
 // Keep a clear headset-visible diagnostics message for intermittent tracking.
 trackingWarning=(!fresh.left||!fresh.right)?'CONTROLLER TRACKING: '+(fresh.left?'LEFT OK':'LEFT MISSING')+' · '+(fresh.right?'RIGHT OK':'RIGHT MISSING'):'';
}
function onXRSelect(event){if(!session)return;const rp=event.frame.getPose(event.inputSource.targetRaySpace,refSpace);if(!rp)return;const m=rp.transform.matrix,rot=FrogyControls.rotate(m[12],m[14],turnYaw),dir=FrogyControls.rotate(-m[8],-m[10],turnYaw),d=norm([dir[0],-m[9],dir[1]]);
 if(phase!=='playing'||vrMenuOpen){clickVRMenu([rot[0]+vrPos.x,m[13]+referenceShift+vrPos.y,rot[1]+vrPos.z],d);return;}
 attack(null,d,[rot[0]+vrPos.x,m[13]+referenceShift+vrPos.y,rot[1]+vrPos.z]);try{event.inputSource.gamepad?.hapticActuators?.[0]?.pulse(.4,70);}catch{}
}
function netUpdate(now,viewPose=null){if(localPractice||!room||!me||(phase==='playing'&&me.spectating)||now-lastNet<.085)return;lastNet=now;
 let x=vrPos.x,z=vrPos.z,y=vrPos.y,l=null,r=null;
 if(session&&viewPose){const p=viewPose.transform.position,rot=FrogyControls.rotate(p.x,p.z,turnYaw);x+=rot[0];z+=rot[1];l=vrInput.left?.hand||null;r=vrInput.right?.hand||null;}
 send({type:'move',x,y,z,yaw:lookYaw,l,r,mouth:FrogVoice.level()});}
function resize(){if(session)return;const dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(window.innerWidth*dpr),h=Math.round(window.innerHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
function drawDesktop(time){
 if(session)return;
 // Do not render a playable desktop view, physics, network movement, or player controls.
 requestAnimationFrame(drawDesktop);
}
function frameVR(time,frame){const s=frame.session;s.requestAnimationFrame(frameVR);let now=time/1000,dt=lastTick?clamp(now-lastTick,0,.06):0;lastTick=now;const pose=frame.getViewerPose(refSpace);if(!pose)return;
 updateVRInputs(frame,dt,pose);physics(dt);netUpdate(now,pose);updateParticles(dt);
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
  vrMenuOpen=true;vrPage='pond';lastButtons={};turnYaw=0;stickLatched=false;prevHands={};vrPos={x:0,y:0,z:4};vel={x:0,y:0,z:0};grounded=true;lastGroundAt=performance.now();s.addEventListener('selectstart',onXRSelect);s.addEventListener('end',()=>{if(room)send({type:'leave'});session=null;vrInput={left:null,right:null};prevHands={};lastTick=0;document.body.classList.remove('in-xr');document.body.classList.add('vr-only-landing');$('#vrOnlyGate').classList.remove('hidden');ui.cross.classList.remove('visible');vrMenuOpen=true;requestAnimationFrame(drawDesktop);});document.body.classList.add('in-xr');ui.cross.classList.remove('visible');lastTick=0;lastBoard=0;s.requestAnimationFrame(frameVR);
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

