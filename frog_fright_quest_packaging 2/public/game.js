'use strict';
/* FROG FRIGHT VR — dependency-free WebGL/WebXR client. Best played over HTTPS in Quest Browser. */
const $=s=>document.querySelector(s), canvas=$('#gl');
const ui={home:$('#home'),lobby:$('#lobby'),hud:$('#hud'),vrbar:$('#vrbar'),bottom:$('#bottomhelp'),error:$('#error'),toast:$('#toast'),end:$('#endPanel'),cross:$('#crosshair')};
const PALETTE={mint:[.54,.94,.63],pink:[1,.63,.77],lilac:[.74,.63,1],blue:[.51,.82,1],peach:[1,.78,.56],lime:[.79,.94,.46]};
const MAPS=[{name:'Mossy Marsh',ground:[.16,.35,.29],sky:[.095,.18,.23],accent:[.79,1,.62]},
{name:'Moonlit Graveyard',ground:[.22,.20,.32],sky:[.08,.10,.22],accent:[.68,.58,1]},
{name:'Candy Caverns',ground:[.45,.25,.43],sky:[.17,.12,.28],accent:[1,.65,.85]}];
const WPN=[{id:'b0',type:'blaster',x:-5,z:-2},{id:'k0',type:'knife',x:5,z:2},{id:'b1',type:'blaster',x:4,z:-6},{id:'k1',type:'knife',x:-4,z:6},{id:'b2',type:'blaster',x:0,z:0},{id:'k2',type:'knife',x:0,z:-8}];
const TAU=6.28318530718,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
let clientId='',room='',phase='home',remaining=0,mapIndex=0,round=0,chosenColor='mint',chosenName='Lil Frog',ws=null,me=null;
let all=[],pickups=[],fx=[],beams=[],rags=[],announcements=[],session=null,refSpace=null,referenceShift=0,rendererFrames=0;
let lastTick=0,lastNet=0,lastUI=0,lastBoard=0,vrPos={x:0,y:0,z:0},vel={x:0,y:0,z:0},grounded=true,prevHands={},vrInput={right:null,left:null},lastButtons={};
let dx=0,dz=0,dy=0,lookYaw=0,lookPitch=0,keys={},inDesktop=false,noticeTimer=null;
let audio, profile={coins:0,inventory:[],equipped:{hat:'none',face:'none',back:'none'},color:'mint',bonus:0}, catalog=[],myVote=-1,nextMapIndex=0,activeTab='pond';
function sound(which=0){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const now=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type=which===3?'sawtooth':'sine';o.frequency.setValueAtTime([450,220,170,110,640][which]||440,now);o.frequency.exponentialRampToValueAtTime([800,110,90,55,230][which]||220,now+.12);g.gain.setValueAtTime(.065,now);g.gain.exponentialRampToValueAtTime(.0001,now+.2);o.connect(g).connect(audio.destination);o.start(now);o.stop(now+.21);}catch{}}
function toast(t,delay=2500){ui.toast.textContent=t;ui.toast.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.toast.classList.remove('show'),delay);}
function send(obj){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function connect(){if(ws&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(ws.readyState))return;ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');$('#connection').textContent='● CONNECTING';ws.onopen=()=>{$('#connection').innerHTML='<span class="dot"></span> POND ONLINE';$('#connection').classList.add('online');ui.error.textContent='';let token='';try{token=localStorage.getItem('frog-frog-profile')||'';}catch{}send({type:'hello',token});};ws.onclose=()=>{FrogVoice.disable();syncVoiceButtons();$('#connection').innerHTML='<span class="dot"></span> DISCONNECTED';$('#connection').classList.remove('online');if(room){toast('Connection lost. Reload to rejoin a lobby.',6000);}else setTimeout(connect,1800);};ws.onerror=()=>{ui.error.textContent='Could not reach the multiplayer server. Start server.js first.'};ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return;}receive(m);};}
function receive(m){switch(m.type){
 case 'error':ui.error.textContent=m.message;toast(m.message);break;
 case 'joined':FrogVoice.onJoined();clientId=m.id;room=m.code;phase='lobby';myVote=-1;ui.home.classList.add('hidden');ui.lobby.classList.remove('hidden');$('#roomCode').textContent=room;ui.error.textContent='';toast('Welcome to the pond!');if(FrogVoice.enabled)send({type:'voice-ready',enabled:true});break;
 case 'left':FrogVoice.onJoined();room='';phase='home';ui.home.classList.remove('hidden');ui.lobby.classList.add('hidden');ui.hud.classList.add('hidden');ui.vrbar.classList.add('hidden');ui.bottom.classList.add('hidden');document.body.classList.remove('in-game');break;
 case 'state':updateState(m);break;
 case 'profile':profile={...m};catalog=m.shop||catalog;chosenColor=m.color||'mint';for(const b of document.querySelectorAll('#colors .swatch'))b.classList.toggle('active',b.dataset.color===chosenColor);try{localStorage.setItem('frog-frog-profile',m.token);}catch{}renderShop();renderCloset();$('#coinBalance').textContent=String(m.coins);if(m.bonus){$('#bonusNote').textContent='🪙 DAILY LOGIN BONUS: +'+m.bonus+' COINS!';toast('DAILY HOP BONUS! +'+m.bonus+' 🪙',3200);}break;
 case 'rtc':FrogVoice.signal(m.from,m.data);break;
 case 'voice-ready':FrogVoice.peerReady(m.from,m.enabled);break;
 case 'voice-peers':FrogVoice.peersReady(m.ids);break;
 case 'peer-left':FrogVoice.peerLeft(m.from);break;
 case 'notice':toast(m.text,1800);break;
 case 'roundStart':clearFx();toast('⚠ '+m.text,5500);sound(3);break;
 case 'roundEnd':$('#endTitle').textContent=m.text;$('#endSubtitle').textContent='Next round begins shortly…';ui.end.classList.remove('hidden');setTimeout(()=>ui.end.classList.add('hidden'),3500);toast(m.text,4500);sound(3);break;
 case 'attackFx':attackFx(m);break;
 case 'ouch':emitSplat(m.x,m.y,m.z,7,m.kind==='roar'?[.8,.5,1]:[1,.32,.48]);sound(2);break;
 case 'pop':popFrog(m);sound(3);break;
 case 'pickupFx':emitSplat(m.x,.65,m.z,12,[1,.86,.46]);if(m.id===clientId){toast('PICKED UP '+(m.weapon==='blaster'?'LILY BLASTER! 🫧':'TOAD SLICER! 🔪'),1700);sound(0);}break;
 }}
function updateState(s){const oldPhase=phase,oldMap=mapIndex;phase=s.phase;remaining=s.seconds;nextMapIndex=s.selectedMap??s.map;mapIndex=phase==='playing'?s.map:nextMapIndex;round=s.round||0;all=s.players;pickups=s.pickups||[];me=all.find(p=>p.id===clientId)||null;FrogVoice.updateRoles(all);
 if(oldPhase!==phase){if(phase==='playing'){myVote=-1;ui.end.classList.add('hidden');ui.lobby.classList.add('hidden');ui.hud.classList.remove('hidden');ui.bottom.classList.remove('hidden');ui.vrbar.classList.remove('hidden');document.body.classList.add('in-game');document.body.classList.add('desktop-active');ui.cross.classList.toggle('visible',!session);if(me){vrPos.x=me.x;vrPos.y=0;vrPos.z=me.z;vel={x:0,y:0,z:0};prevHands={};lookYaw=0;}toast(me?.monster?'YOU ARE THE MONSTER FROG! 👹':'RUN, LITTLE FROG! 🐸',3400);}
 else if(phase==='countdown'){ui.hud.classList.add('hidden');ui.lobby.classList.remove('hidden');ui.vrbar.classList.add('hidden');ui.bottom.classList.add('hidden');document.body.classList.remove('in-game');}
 else if(phase==='intermission'){ui.hud.classList.remove('hidden');ui.lobby.classList.add('hidden');ui.vrbar.classList.remove('hidden');ui.bottom.classList.remove('hidden');}
 else if(phase==='lobby'){ui.cross.classList.remove('visible');ui.hud.classList.add('hidden');ui.end.classList.add('hidden');ui.lobby.classList.remove('hidden');ui.bottom.classList.add('hidden');ui.vrbar.classList.add('hidden');document.body.classList.remove('in-game');}}
 if(!session&&oldMap!==mapIndex)lastBoard=0;
 if(phase==='lobby'||phase==='countdown'||phase==='intermission'){
 $('#lobbyTitle').textContent=phase==='countdown'?'ROUND STARTING...':phase==='intermission'?'ROUND OVER · VOTE!':'Waiting for frogs...';$('#lobbyCount').textContent=all.length+' / 8';$('#roomCode').textContent=room;
 $('#roster').innerHTML=all.map(p=>'<span class="frog"><b style="background:rgb('+PALETTE[p.color].map(x=>Math.round(x*255)).join(',')+')"></b>'+escapeHtml(p.name)+(p.id===s.host?' 👑':'')+'</span>').join('');
 $('#countdown').textContent=phase==='countdown'?'NEXT MATCH IN '+remaining+'s':phase==='intermission'?'VOTE NOW · NEXT ROUND IN ~'+(remaining+16)+'s':(all.length<2?'WAITING FOR 1 MORE FROG...':'GET READY...');
 for(const b of document.querySelectorAll('[data-map]')){b.classList.toggle('active',Number(b.dataset.map)===nextMapIndex);b.classList.toggle('voted',Number(b.dataset.map)===myVote);b.disabled=false;const votes=$('#votes'+b.dataset.map);if(votes)votes.textContent=String(s.votes?.[Number(b.dataset.map)]||0);}
 $('#mapHostNote').textContent='EVERY FROG VOTES!';
 }
 updateHUD();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function updateHUD(){if(!me)return;$('#hudRoom').textContent='ROOM • '+room;$('#hudMap').textContent=MAPS[mapIndex].name;$('#hudStatus').textContent=phase==='playing'?'ROUND '+round:phase==='intermission'?'ROUND OVER':'LOBBY';$('#hudTime').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');$('#hudRole').textContent=!me.alive?'👻 OUT UNTIL NEXT ROUND':me.monster?'👹 MONSTER FROG':'🐸 SURVIVOR FROG';$('#hudRole').classList.toggle('monster',me.monster);$('#healthBar').style.width=Math.floor(me.hp/Math.max(1,me.maxHp)*100)+'%';$('#hudWeapon').textContent=me.monster?'👊 PUNCH · CHOMP · ROAR':me.weapon==='blaster'?'🔫 LILY BLASTER':me.weapon==='knife'?'🔪 TOAD SLICER':'🫧 FIND A WEAPON';}
function clearFx(){beams=[];fx=[];rags=[];}
function lobbyName(){chosenName=$('#name').value.trim().slice(0,18)||'Lil Frog';}
$('#create').onclick=()=>{lobbyName();send({type:'create',name:chosenName,color:chosenColor})};$('#join').onclick=()=>{lobbyName();send({type:'join',code:$('#codeInput').value.toUpperCase().trim(),name:chosenName,color:chosenColor})};$('#codeInput').onkeydown=e=>{if(e.key==='Enter')$('#join').click()};$('#colors').onclick=e=>{const b=e.target.closest('[data-color]');if(!b)return;chosenColor=b.dataset.color;document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('active',x===b))};$('#copyCode').onclick=()=>navigator.clipboard?.writeText(room).then(()=>toast('Room code copied!')).catch(()=>toast('Code: '+room));$('#mapSelect').onclick=e=>{const b=e.target.closest('[data-map]');if(b&&!b.disabled){myVote=Number(b.dataset.map);send({type:'vote',index:myVote});}};$('#leave').onclick=()=>{send({type:'leave'});if(session)session.end()};$('#showLobby').onclick=()=>{if(phase==='playing'){toast('Shop and room changes open between rounds!',2500);return;}ui.lobby.classList.toggle('hidden');if(!ui.lobby.classList.contains('hidden'))toast('Lobby: '+room,1500);};$('#enterVR').onclick=()=>enterVR();$('#playVR').onclick=()=>enterVR();
connect();

// ——— WEBGL MICRO-ENGINE ———
const gl=canvas.getContext('webgl',{xrCompatible:true,antialias:true,alpha:false,preserveDrawingBuffer:false});
if(!gl){ui.error.textContent='WebGL is unsupported in this browser.';throw new Error('WebGL unavailable');}
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function makeProgram(vs,fs){let p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
const shapeProg=makeProgram('attribute vec3 aPos,aNorm;uniform mat4 uP,uV,uM;varying float vL;void main(){vec3 n=normalize(mat3(uM)*aNorm);vL=.56+.44*max(0.,dot(n,normalize(vec3(.38,.93,.34))));gl_Position=uP*uV*uM*vec4(aPos,1.);}','precision mediump float;uniform vec3 uC;uniform float uA,uG;varying float vL;void main(){gl_FragColor=vec4(uC*(vL+uG),uA);}');
const linesProg=makeProgram('attribute vec3 aPos;uniform mat4 uP,uV;void main(){gl_Position=uP*uV*vec4(aPos,1.);}','precision mediump float;uniform vec4 uC;void main(){gl_FragColor=uC;}');
const texProg=makeProgram('attribute vec3 aPos;attribute vec2 aUV;uniform mat4 uP,uV,uM;varying vec2 vUV;void main(){vUV=aUV;gl_Position=uP*uV*uM*vec4(aPos,1.);}','precision mediump float;varying vec2 vUV;uniform sampler2D uTex;void main(){gl_FragColor=texture2D(uTex,vUV);}');
function info(p,n){return gl.getAttribLocation(p,n)}function loc(p,n){return gl.getUniformLocation(p,n)}
const sp={p:shapeProg,a:info(shapeProg,'aPos'),n:info(shapeProg,'aNorm'),pM:loc(shapeProg,'uP'),v:loc(shapeProg,'uV'),m:loc(shapeProg,'uM'),c:loc(shapeProg,'uC'),aU:loc(shapeProg,'uA'),g:loc(shapeProg,'uG')};
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
function draw(m,mat4,col,glow=0,alpha=1){gl.useProgram(sp.p);gl.uniformMatrix4fv(sp.pM,false,P);gl.uniformMatrix4fv(sp.v,false,V);gl.uniformMatrix4fv(sp.m,false,mat4);gl.uniform3fv(sp.c,col);gl.uniform1f(sp.aU,alpha);gl.uniform1f(sp.g,glow);gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.enableVertexAttribArray(sp.a);gl.vertexAttribPointer(sp.a,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.enableVertexAttribArray(sp.n);gl.vertexAttribPointer(sp.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);gl.drawElements(gl.TRIANGLES,m.c,gl.UNSIGNED_SHORT,0);}
function ball(x,y,z,sx,sy,sz,c,g=0,a=1,yaw=0){draw(sph,mat(x,y,z,sx,sy,sz,yaw),c,g,a)}
function block(x,y,z,sx,sy,sz,c,yaw=0){draw(box,mat(x,y,z,sx,sy,sz,yaw),c)}
function rod(a,b,r,color){draw(sph,oriented(a,b,r,r),color)}
function lines(arr,col){if(arr.length<6)return;gl.useProgram(lp.p);gl.uniformMatrix4fv(lp.pM,false,P);gl.uniformMatrix4fv(lp.v,false,V);gl.uniform4fv(lp.c,col);gl.bindBuffer(gl.ARRAY_BUFFER,wire);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(lp.a);gl.vertexAttribPointer(lp.a,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.LINES,0,arr.length/3)}
function setAlpha(on,add=false){if(on){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,add?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}else{gl.disable(gl.BLEND);gl.depthMask(true)}}
// World / environment. All geometry is procedural and contains no downloaded assets.
function hash(i){return (Math.sin(i*91.233+3.8)*12451.5)%1}function rnd(i){return Math.abs(hash(i))}
function terrain(t){let m=MAPS[t];block(0,-.52,0,27,.52,27,m.ground);block(0,-1.05,0,28,.25,28,[.10,.15,.18]);for(let j=0;j<32;j++){let a=j/32*TAU,x=Math.cos(a)*12.75,z=Math.sin(a)*12.75;let c=t===2?[.67,.44,.66]:t===1?[.35,.3,.5]:[.19,.43,.35];ball(x,.15,z,.38,.32,.38,c);}
 // decorative arena rings and pathways
 for(let j=0;j<24;j++){let a=j/24*TAU,x=Math.sin(a)*10,z=Math.cos(a)*10,seed=j*13+t*300;if(t===0){
   // mushrooms, cattails and lily pads
   rod([x,.08,z],[x,.75+rnd(seed)*.45,z],.12,[.87,.84,.67]);ball(x,.8+rnd(seed)*.45,z,.48,.23,.42,[.9,.27,.39]);ball(x-.17,.96+rnd(seed)*.45,z-.19,.09,.06,.1,[1,.98,.84]);ball(x+.18,.96+rnd(seed)*.45,z+.13,.09,.06,.1,[1,.98,.84]);
 }else if(t===1){if(j%2){block(x,.44,z,.44,.52,.20,[.47,.45,.58],Math.sin(j)*.3);ball(x,.99,z,.44,.18,.23,[.47,.45,.58]);}else{rod([x,.1,z],[x,1.85,z],.16,[.28,.23,.42]);for(let a2=0;a2<3;a2++){let ax=x+Math.cos(a2*2.5)*.75,az=z+Math.sin(a2*2.5)*.75;rod([x,1.38,z],[ax,1.8+Math.sin(j+a2)*.3,az],.10,[.33,.26,.45]);}}}
 else{rod([x,.05,z],[x,.9+rnd(seed)*.5,z],.18,[.77,.61,.96]);ball(x,1+rnd(seed)*.5,z,.46,.58,.45,j%2?[1,.54,.69]:[.53,.91,.98],.08);}}
 for(let j=0;j<42;j++){let ang=rnd(91+j+t*30)*TAU,r=(3+rnd(j*29+t)*9),x=Math.cos(ang)*r,z=Math.sin(ang)*r;
 if(Math.abs(x)<1.1&&Math.abs(z)<1.1)continue;
 if(t===0){ball(x,.015,z,.29,.04,.34,[.24+rnd(j)*.1,.52,.37]);if(j%3===0)ball(x,.1,z,.1,.19,.12,[.8,.94,.54]);}
 if(t===1){ball(x,.06,z,.16,.1,.12,[.38,.39,.58]);if(j%4===0)ball(x,.27,z,.12,.26,.12,[.52,.4,.77],.2);}
 if(t===2){ball(x,.03,z,.27,.07,.3,[.87,.45,.72]);if(j%3===0)ball(x,.21,z,.13,.21,.12,[.62,.87,.96]);}}
 // traversable, hand-pushable pillars and blocks (same contacts in VR physics)
 for(const o of obstacles(t)){
  if(t===0){block(o.x,o.h/2,o.z,o.r,o.h/2,o.r,[.37,.29,.23]);ball(o.x,o.h+.25,o.z,o.r+.20,.30,o.r+.20,[.29,.54,.38]);}
  else if(t===1){block(o.x,o.h/2,o.z,o.r,o.h/2,o.r,[.45,.45,.56]);ball(o.x,o.h+.04,o.z,o.r,.14,o.r,[.63,.56,.75]);}
  else{block(o.x,o.h/2,o.z,o.r,o.h/2,o.r,[.64,.38,.72]);ball(o.x,o.h+.15,o.z,o.r+.2,.25,o.r+.2,[.93,.57,.83]);}
 }
 if(t===0){ball(-8,.02,2,2.1,.08,1.8,[.11,.41,.60]);ball(-8,.08,2,1.0,.10,.95,[.38,.75,.47]);ball(8,.02,-3,1.7,.07,1.8,[.11,.41,.60]);ball(8,.08,-3,.8,.10,.95,[.38,.75,.47]);}
 if(t===1){ball(0,10,-20,2.8,2.8,.4,[.97,.93,.71],.12);}
 if(t===2){ball(0,8,-18,3.5,3.5,.4,[.95,.6,.82],.2);}
 // spawn marker to orient newcomers
 for(let i=0;i<8;i++){let a=i/8*TAU;ball(Math.sin(a)*7,.02,Math.cos(a)*7,.14,.045,.14,m.accent,.25);}
}
function obstacles(t){return t===0?[{x:-3.5,z:3.5,r:.62,h:2.1},{x:3.4,z:-3.5,r:.7,h:2.4},{x:6,z:5,r:.6,h:1.7},{x:-6,z:-5,r:.55,h:1.9}]:t===1?[{x:-3.5,z:3,r:.75,h:2.1},{x:4,z:-3,r:.8,h:2.6},{x:7,z:3,r:.5,h:1.5},{x:-6,z:-5,r:.65,h:1.7}]:[{x:-3,z:4,r:.8,h:2.4},{x:4,z:-3,r:.85,h:2.2},{x:6,z:5,r:.5,h:2.0},{x:-6,z:-5,r:.65,h:2.2}]}
// Frog models: big eyes, squishy cheeks, smiles, three tiny fingers and silly boots.
function transform(p,ox,oy,oz,scale=1){let yaw=p.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);return [p.x+(ox*c+oz*s)*scale,p.y+oy*scale,p.z+(-ox*s+oz*c)*scale]}
function dotBall(p,x,y,z,rx,ry,rz,color,scale=1,glow=0){const q=transform(p,x,y,z,scale);ball(q[0],q[1],q[2],rx*scale,ry*scale,rz*scale,color,glow,1,p.yaw||0)}
function paw(pos,s,color){ball(pos[0],pos[1],pos[2],.16*s,.145*s,.14*s,color);for(let i=-1;i<=1;i++)ball(pos[0]+i*.12*s,pos[1]+(i===0?.035:0)*s,pos[2]-.17*s,.068*s,.085*s,.13*s,color);}
function frog(p,t,showWeapon=true){const color=PALETTE[p.color]||PALETTE.mint,sc=p.monster?1.48:1;let z=p.z,y=p.y;let bob=Math.sin(t*2.3+(+p.id||1))*0.017;if(p.alive===false)sc*=.83;
 // Oval shadow, feet, body, belly.
 ball(p.x,.017,p.z,.67*sc,.018,.53*sc,[.055,.16,.14]);
 dotBall(p,-.30,.22,-.21,.23,.14,.29,color,sc);dotBall(p,.30,.22,-.21,.23,.14,.29,color,sc);
 dotBall(p,0,.79,0,.48,.5,.36,color,sc);
 dotBall(p,0,.78,-.31,.33,.38,.115,p.monster?[.67,.48,.65]:[.98,.9,.71],sc);
 // Face is slightly wider than torso; eye mounds stick out adorably.
 dotBall(p,0,1.36+bob,-.12,.56,.45,.49,color,sc);
 for(const side of [-1,1]){
  dotBall(p,side*.31,1.70+bob,-.36,.205,.22,.20,color,sc);
  dotBall(p,side*.30,1.72+bob,-.49,.158,.166,.124,[1,.99,.95],sc);
  dotBall(p,side*.29,1.72+bob,-.592,.075,.09,.055,p.monster?[1,.2,.27]:[.09,.15,.21],sc,p.monster?.5:0);
  dotBall(p,side*.29-.026,1.75+bob,-.638,.024,.028,.017,[1,1,1],sc);
  dotBall(p,side*.41,1.28+bob,-.445,.11,.07,.036,p.monster?[.91,.34,.54]:[1,.55,.67],sc,.04);
  dotBall(p,side*.18,1.43+bob,-.58,.026,.019,.015,[.24,.43,.33],sc);
 }
 // Smile: curved line, scaled and yawed with the head.
 const smile=[];for(let j=0;j<13;j++){let u=j/12,x=(u-.5)*.42,y2=1.22+bob-.075*Math.sin(u*Math.PI),q=transform(p,x,y2,-.585,sc);if(j){smile.push(...prev,...q);}var prev=q;}lines(smile,p.monster?[.65,.13,.24,1]:[.13,.3,.24,1]);
 // Monster retains the cute frog silhouette but has glowing eyes and tiny fangs/horns.
 if(p.monster){for(const s of [-1,1]){dotBall(p,s*.22,1.94,-.18,.10,.20,.12,[.41,.19,.48],sc);dotBall(p,s*.14,1.18,-.60,.055,.115,.052,[1,.98,.87],sc);}}
 cosmeticModel(p,sc);
 // Simple connected arms; in VR they use actual tracked hand positions sent by players.
 for(const side of [-1,1]){
  const shoulder=transform(p,side*.41,1.03,-.06,sc);
  const tracked=(side<0?p.l:p.rr);const hand=tracked&&tracked.length===3&&Math.hypot(tracked[0]-p.x,tracked[2]-p.z)<2.8*sc?tracked:transform(p,side*.75,.65,-.35,sc);
  rod(shoulder,hand,.14*sc,color);paw(hand,sc*.83,color);
  if(showWeapon&&side===1&&p.alive&&p.weapon!=='none'&&!p.monster)weaponModel(hand,p.weapon,sc*.75,p.yaw);
 }
 if(!p.alive){dotBall(p,0,1.85,0,.55,.045,.50,[.70,.82,1],sc,.3);}
}
function weaponModel(center,type,scale=1,yaw=0){const x=center[0],y=center[1],z=center[2];if(type==='blaster'){block(x,y,z-.1,.17*scale,.14*scale,.32*scale,[.25,.72,.88],yaw);block(x,y-.17*scale,z,.09*scale,.20*scale,.10*scale,[.24,.35,.57],yaw);ball(x,y+.03*scale,z-.36*scale,.17*scale,.17*scale,.21*scale,[1,.74,.34],.25);}else{block(x,y+.28*scale,z-.04,.075*scale,.38*scale,.06*scale,[.84,.96,.98],yaw);block(x,y-.1*scale,z-.04,.115*scale,.14*scale,.1*scale,[.26,.33,.51],yaw);ball(x,y+.6*scale,z-.04,.06*scale,.12*scale,.07*scale,[1,.9,.79]);}}
function pickupsDraw(t){if(phase!=='playing')return;for(const w of pickups){if(!w.available)continue;let y=.52+Math.sin(t*2+w.x)*.12;ball(w.x,.03,w.z,.5,.035,.5,[.45,.82,.74],.1);ball(w.x,y,w.z,.29,.29,.29,w.type==='blaster'?[.23,.75,1]:[1,.75,.77],.22);weaponModel([w.x,y,w.z],w.type,1,Math.sin(t*.9+w.z)*.5);}
}
function attackFx(m){let p=all.find(x=>x.id===m.id),o=[m.x,m.y,m.z],d=m.dir||[0,0,-1];if(m.kind==='blaster'){const len=14;beams.push({a:o,b:o.map((v,i)=>v+d[i]*len),life:.16,max:.16,color:[.45,1,.94,1]});emitSplat(o[0]+d[0]*1.1,o[1]+d[1]*1.1,o[2]+d[2]*1.1,5,[.68,1,.95]);sound(0);}else if(m.kind==='roar'){fx.push({type:'ring',x:o[0],y:o[1],z:o[2],r:.5,life:.8,max:.8,color:[.88,.49,1]});sound(3);}else{fx.push({type:'ring',x:o[0]+d[0]*.7,y:o[1],z:o[2]+d[2]*.7,r:.16,life:.3,max:.3,color:m.kind==='chomp'?[1,.4,.61]:[1,.94,.49]});sound(1);}}
function emitSplat(x,y,z,n=10,color=[1,.34,.56]){for(let i=0;i<n;i++){const a=rand(0,TAU),u=rand(-1,1),speed=rand(.5,4),vv=Math.sqrt(1-u*u);fx.push({type:'bubble',x,y,z,vx:Math.sin(a)*vv*speed,vy:u*speed+1.4,vz:Math.cos(a)*vv*speed,life:rand(.55,1.2),max:1.2,r:rand(.035,.11),color});}}
function popFrog(m){emitSplat(m.x,m.y+1,m.z,37,[1,.29,.45]);emitSplat(m.x,m.y+1,m.z,16,[.52,1,.71]);const c=PALETTE[m.color]||PALETTE.mint;for(let i=0;i<10;i++){const a=rand(0,TAU),speed=rand(1.5,4.3),top=i<2?1.2:i<5?.8:.4;rags.push({x:m.x+rand(-.2,.2),y:m.y+top,z:m.z+rand(-.2,.2),vx:Math.sin(a)*speed,vy:rand(2.6,5.6),vz:Math.cos(a)*speed,spin:rand(-5,5),ang:0,life:4.0,r:i===0?.40:i===1?.27:i<6?.16:.11,color:i<7?c:[1,.28,.46]});}}
function updateParticles(dt){for(const p of fx){p.life-=dt;if(p.type==='bubble'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=7*dt;if(p.y<p.r){p.y=p.r;p.vy=Math.abs(p.vy)*.43;p.vx*=.78;p.vz*=.78;}}else if(p.type==='ring')p.r+=dt*6;}fx=fx.filter(p=>p.life>0).slice(-220);for(const p of rags){p.life-=dt;p.ang+=p.spin*dt;p.vy-=8.6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<p.r){p.y=p.r;p.vy=Math.abs(p.vy)*.55;p.vx*=.75;p.vz*=.75;}}rags=rags.filter(p=>p.life>0);beams=beams.filter(p=>(p.life-=dt)>0);}
function drawParticles(){for(const p of rags)ball(p.x,p.y,p.z,p.r,p.r*.7,p.r,p.color);setAlpha(true);for(const p of fx){if(p.type==='bubble')ball(p.x,p.y,p.z,p.r,p.r,p.r,p.color,.15,clamp(p.life/p.max,0,1));else{let pts=[];for(let j=0;j<32;j++){let a=j/32*TAU,b=(j+1)/32*TAU;pts.push(p.x+Math.sin(a)*p.r,p.y,p.z+Math.cos(a)*p.r,p.x+Math.sin(b)*p.r,p.y,p.z+Math.cos(b)*p.r);}lines(pts,[...p.color,p.life/p.max]);}}for(const b of beams)lines([...b.a,...b.b],[...b.color.slice(0,3),b.life/b.max]);setAlpha(false);}
function localPaw(pos,color=PALETTE.mint){paw(pos,.8,color);}
function drawScene(t,head=null){gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);terrain(mapIndex);if(phase!=='playing')lobbyProps(t);pickupsDraw(t);
 if(all.length){for(const p of all){if(session&&p.id===clientId)continue;if(inDesktop&&p.id===clientId&&phase==='playing')continue;frog(p,t);}}
 else{const demo=[{id:'1',x:-2.4,y:0,z:-2,color:'mint',weapon:'blaster',monster:false,alive:true,yaw:.23},{id:'2',x:1.5,y:0,z:-4,color:'pink',weapon:'knife',monster:false,alive:true,yaw:-.5},{id:'3',x:5,y:0,z:-6,color:'lilac',monster:true,weapon:'none',alive:true,yaw:-.6}];for(const p of demo)frog(p,t);}
 if(session){const col=me?.monster?[.49,.18,.57]:PALETTE[me?.color]||PALETTE.mint;for(const side of ['left','right']){const q=vrInput[side];if(!q)continue;localPaw(q.hand,col);if(side==='right'&&!me?.monster&&me?.weapon!=='none')weaponModel(q.hand,me.weapon,.62,lookYaw);const e=q.ray;lines([...e.o,...e.o.map((v,i)=>v+e.d[i]*3)],[.58,.95,.90,.27]);}}
 drawParticles();if(session&&head){if(phase==='playing'){updateBillboard(t);drawBillboard(head);}else{drawVRMenu(t,head);drawVRLaser();}} }
// Head-up display for Quest: a small, head-following information panel.
const board=document.createElement('canvas');board.width=1024;board.height=256;const bc=board.getContext('2d');const boardTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const quadV=gl.createBuffer(),quadUV=gl.createBuffer(),quadI=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,1,1,1,1,0,0,0]),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW);
function updateBillboard(t){if(t-lastBoard<.2)return;lastBoard=t;bc.clearRect(0,0,1024,256);bc.fillStyle='#142b39ed';bc.beginPath();bc.roundRect(8,8,1008,240,34);bc.fill();bc.lineWidth=7;bc.strokeStyle='#c8ffa9';bc.stroke();bc.font='bold 40px sans-serif';bc.fillStyle='#d2ffab';bc.fillText('FROG FRIGHT VR  ·  '+room,36,60);bc.font='bold 37px sans-serif';bc.fillStyle='white';bc.fillText(me?.monster?'MONSTER!':'SURVIVOR',36,130);bc.font='31px sans-serif';bc.fillText((me?.weapon||'NONE').toUpperCase()+'  ·  HP '+(me?.hp??100),36,192);bc.font='bold 75px sans-serif';bc.textAlign='right';bc.fillStyle=remaining<15?'#ff9ba9':'#faffb7';bc.fillText(String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'),961,157);bc.textAlign='left';gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,board);}
function drawBillboard(head){if(!me)return;const f=head.forward||[0,0,-1],right=[-f[2],0,f[0]],x=head.x+f[0]*1.5-right[0]*.35,y=head.y+.7,z=head.z+f[2]*1.5-right[2]*.35,yaw=Math.atan2(-f[0],f[2]);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);gl.uniformMatrix4fv(tp.m,false,mat(x,y,z,1.32,.34,1,yaw));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,boardTexture);gl.uniform1i(tp.tex,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);}
// ——— CONTROLS & GAME LOOP ———
function myForward(){return [Math.sin(lookYaw)*Math.cos(lookPitch),Math.sin(lookPitch),-Math.cos(lookYaw)*Math.cos(lookPitch)];}
function attack(kind=null,direction=null){if(phase!=='playing'||!me?.alive)return;let k=kind||((me.monster)?'punch':me.weapon);if(k==='none')return;send({type:'attack',kind:k,dir:direction||myForward()});}
function jump(){if(phase!=='playing'||!me?.alive)return;if(grounded||vrPos.y<.18){vel.y=5.7;vrPos.y+=.025;grounded=false;sound(0);}}
function desktopKeys(dt){if(phase!=='playing'||!me||session)return;const fw=[Math.sin(lookYaw),-Math.cos(lookYaw)],side=[Math.cos(lookYaw),Math.sin(lookYaw)];let ox=(keys.KeyD?1:0)-(keys.KeyA?1:0),oz=(keys.KeyW?1:0)-(keys.KeyS?1:0);let l=Math.hypot(ox,oz)||1,speed=keys.ShiftLeft?7:4.8;
 vrPos.x+=(side[0]*ox+fw[0]*oz)/l*speed*dt;vrPos.z+=(side[1]*ox+fw[1]*oz)/l*speed*dt;}
function physics(dt){if(phase!=='playing'||!me)return;
 if(!session)desktopKeys(dt);
 if(vel.y>0||vrPos.y>0){vel.y-=11.8*dt;vrPos.y+=vel.y*dt;grounded=false;}else{vel.y=0;grounded=true;}
 if(vrPos.y<0){vrPos.y=0;vel.y=0;grounded=true;}
 // Retain a little side-to-side momentum after pushing off with VR hands.
 if(session){vrPos.x+=vel.x*dt;vrPos.z+=vel.z*dt;vel.x*=Math.exp(-9*dt);vel.z*=Math.exp(-9*dt);}
 if(vrPos.y>5){vrPos.y=5;vel.y=Math.min(vel.y,0);}
 const rad=Math.hypot(vrPos.x,vrPos.z);if(rad>12){vrPos.x*=12/rad;vrPos.z*=12/rad;vel.x=vel.z=0;}
}
function handContacts(q){if(q[1]<.36)return true;const r=Math.hypot(q[0],q[2]);if(r>11.65 && q[1]<4)return true;for(const o of obstacles(mapIndex))if(q[1]<o.h+.25 && Math.abs(q[0]-o.x)<o.r+.4 && Math.abs(q[2]-o.z)<o.r+.4)return true;return false;}
function updateVRInputs(frame,dt,viewerPose){let fresh={left:null,right:null};
 for(const src of session.inputSources){const side=src.handedness;if(side!=='left'&&side!=='right')continue;
 const gp=src.gamepad;
 const pose=frame.getPose(src.gripSpace||src.targetRaySpace,refSpace);const rp=frame.getPose(src.targetRaySpace,refSpace);
 if(!pose||!rp)continue;
 const matrix=pose.transform.matrix, raym=rp.transform.matrix;
 const raw=[matrix[12],matrix[13]+referenceShift,matrix[14]];
 const hand=[raw[0]+vrPos.x,raw[1]+vrPos.y,raw[2]+vrPos.z];
 const d=norm([-raym[8],-raym[9],-raym[10]]);
 fresh[side]={hand,raw,ray:{o:[raym[12]+vrPos.x,raym[13]+referenceShift+vrPos.y,raym[14]+vrPos.z],d},src};
 if(phase==='playing'&&me?.alive){
  const prev=prevHands[side];if(prev&&dt>0&&dt<.08){const prevWorld=[prev[0]+vrPos.x,prev[1]+vrPos.y,prev[2]+vrPos.z];const touch=handContacts(hand)||handContacts(prevWorld);if(touch){
   let del=raw.map((v,i)=>clamp(v-prev[i],-.20,.20));const push=1.75;
   vrPos.x-=del[0]*push;vrPos.z-=del[2]*push;
   if(del[1]<0){vrPos.y-=del[1]*push;vel.y=Math.max(vel.y,Math.min(3.5,-del[1]/dt*.24));}
   vel.x=clamp(vel.x-del[0]/dt*.25,-5,5);vel.z=clamp(vel.z-del[2]/dt*.25,-5,5);
  }}
  if(gp){const edge=(n)=>{const key=side+'_'+n,pressed=!!gp.buttons[n]?.pressed,last=lastButtons[key]||false;lastButtons[key]=pressed;return pressed&&!last;};
    if(side==='right'&&edge(4))jump(); // Oculus / Quest Touch A button: WebXR button index 4.
    if(edge(1)&&me.monster)attack('chomp',d); // Grip: monster chomp.
    if(side==='right'&&edge(5)&&me.monster)attack('roar',d); // B: roar.
  }
 }
 prevHands[side]=raw;
 }
 vrInput=fresh;
 if(viewerPose){const m=viewerPose.transform.matrix;lookYaw=Math.atan2(-m[8],m[10]);}
}
function onXRSelect(event){if(!session)return;const rp=event.frame.getPose(event.inputSource.targetRaySpace,refSpace);if(!rp)return;const m=rp.transform.matrix;if(phase!=='playing'){clickVRMenu([m[12]+vrPos.x,m[13]+referenceShift+vrPos.y,m[14]+vrPos.z],norm([-m[8],-m[9],-m[10]]));return;}attack(null,norm([-m[8],-m[9],-m[10]]));try{event.inputSource.gamepad?.hapticActuators?.[0]?.pulse(.4,70);}catch{}}
function netUpdate(now,viewPose=null){if(!room||!me||now-lastNet<.085)return;lastNet=now;
 let x=vrPos.x,z=vrPos.z,y=vrPos.y,l=null,r=null;
 if(session&&viewPose){const p=viewPose.transform.position;x+=p.x;z+=p.z;l=vrInput.left?.hand||null;r=vrInput.right?.hand||null;}
 send({type:'move',x,y,z,yaw:lookYaw,l,r});}
function resize(){if(session)return;const dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(window.innerWidth*dpr),h=Math.round(window.innerHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
function drawDesktop(time){if(session)return;const now=time/1000,dt=lastTick?clamp(now-lastTick,0,.06):0;lastTick=now;physics(dt);updateParticles(dt);netUpdate(now);if(now-lastUI>.13){lastUI=now;if(phase==='playing'||phase==='intermission')updateHUD();}
 resize();gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);const sk=MAPS[mapIndex].sky;gl.clearColor(...sk,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 P=perspective(Math.PI/2.65,canvas.width/canvas.height,.05,100);
 if(phase==='playing'&&me){const eye=[vrPos.x,vrPos.y+1.55,vrPos.z],f=myForward();V=lookAt(eye,eye.map((v,i)=>v+f[i]));inDesktop=true;}
 else{let sway=Math.sin(now*.19)*.22;V=lookAt([sway,2.5,8.2],[0,1.25,-1.6]);inDesktop=false;}
 drawScene(now);requestAnimationFrame(drawDesktop);}
function frameVR(time,frame){const s=frame.session;s.requestAnimationFrame(frameVR);let now=time/1000,dt=lastTick?clamp(now-lastTick,0,.06):0;lastTick=now;const pose=frame.getViewerPose(refSpace);if(!pose)return;
 updateVRInputs(frame,dt,pose);physics(dt);netUpdate(now,pose);updateParticles(dt);
 const mm=pose.transform.matrix,head={x:vrPos.x+mm[12],y:vrPos.y+referenceShift+mm[13],z:vrPos.z+mm[14],forward:norm([-mm[8],-mm[9],-mm[10]])};
 const layer=s.renderState.baseLayer;gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.enable(gl.SCISSOR_TEST);
 for(const view of pose.views){const vp=layer.getViewport(view),sk=MAPS[mapIndex].sky;gl.viewport(vp.x,vp.y,vp.width,vp.height);gl.scissor(vp.x,vp.y,vp.width,vp.height);gl.clearColor(...sk,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);P=view.projectionMatrix;V=mul(view.transform.inverse.matrix,matTranslation(-vrPos.x,-vrPos.y-referenceShift,-vrPos.z));drawScene(now,head);}
 gl.disable(gl.SCISSOR_TEST);
}
async function enterVR(){if(!navigator.xr){toast('VR requires Quest Browser + HTTPS. Desktop preview works here.',4500);return;}
 try{if(gl.makeXRCompatible)await gl.makeXRCompatible();const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});session=s;s.updateRenderState({baseLayer:new XRWebGLLayer(s,gl,{alpha:false,antialias:true,depth:true})});try{refSpace=await s.requestReferenceSpace('local-floor');referenceShift=0;}catch{refSpace=await s.requestReferenceSpace('local');referenceShift=1.6;}
  s.addEventListener('selectstart',onXRSelect);s.addEventListener('end',()=>{session=null;vrInput={left:null,right:null};prevHands={};lastTick=0;document.body.classList.remove('in-xr');ui.cross.classList.toggle('visible',phase==='playing');requestAnimationFrame(drawDesktop);});document.body.classList.add('in-xr');ui.cross.classList.remove('visible');lastTick=0;lastBoard=0;s.requestAnimationFrame(frameVR);
 }catch(e){toast('Could not enter VR: '+e.message,6000);}}
canvas.onpointerdown=e=>{if(session||phase!=='playing')return;audio?.resume?.();if(document.pointerLockElement!==canvas){canvas.requestPointerLock?.();return;}if(e.button===0)attack();};
window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!session){lookYaw-=e.movementX*.0026;lookPitch=clamp(lookPitch-e.movementY*.0025,-1.35,1.35);}});
window.addEventListener('keydown',e=>{if(e.target?.tagName==='INPUT')return;keys[e.code]=true;if(e.code==='Space'){e.preventDefault();if(!e.repeat)jump();}if(e.code==='KeyE'&&!e.repeat)attack('chomp');if(e.code==='KeyR'&&!e.repeat)attack('roar');if(e.code==='KeyF'&&!e.repeat)attack();});window.addEventListener('keyup',e=>keys[e.code]=false);
window.addEventListener('resize',resize);window.addEventListener('blur',()=>keys={});
if(navigator.xr){navigator.xr.isSessionSupported('immersive-vr').then(ok=>{if(!ok){$('#enterVR').disabled=true;$('#playVR').disabled=true;}}).catch(()=>{});}else{$('#enterVR').disabled=true;$('#playVR').disabled=true;}
resize();requestAnimationFrame(drawDesktop);
// Meta Quest immersive PWA: launching the installed app icon counts as user activation.
// Keep the on-page ENTER VR button for regular browser use.
if (window.getDigitalGoodsService !== undefined && navigator.xr?.requestSession) {
  enterVR();
}
