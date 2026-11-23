'use strict';
/* Frogy additions: coin shop, color-changing dressing hut, map voting and in-VR Ribbitron computer. */
FrogVoice.configure({send,getId:()=>clientId});
const COLOR_HEX={mint:'#89ed9c',pink:'#ff9ec3',lilac:'#bc9cff',blue:'#83d9fb',peach:'#ffc28c',lime:'#d7f17e'};
const itemById=id=>catalog.find(c=>c.id===id);
function setTab(t){if(!['pond','shop','closet','terminal'].includes(t))return;activeTab=t;for(const button of document.querySelectorAll('[data-tab]'))button.classList.toggle('selected',button.dataset.tab===t);for(const pane of ['Pond','Shop','Closet','Terminal'])$('#tab'+pane).classList.toggle('hidden',pane.toLowerCase()!==t);}
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>setTab(button.dataset.tab);
function renderShop(){const el=$('#shopGrid');if(!el)return;el.replaceChildren();for(const item of catalog){
 const owned=profile.inventory?.includes(item.id),equipped=profile.equipped?.[item.slot]===item.id,pending=shopPending===item.id;
 const button=document.createElement('button');button.type='button';button.className='shopItem'+(owned?' owned':'');button.disabled=pending;
 button.innerHTML='<span class="emoji">'+item.emoji+'</span><b>'+escapeHtml(item.name)+'</b><small>'+(pending?'⏳ BUYING...':equipped?'✓ WEARING':owned?'OWNED • WEAR':('🪙 '+item.price+' • BUY'))+'</small>';
 button.addEventListener('click',()=>{if(!ws||ws.readyState!==WebSocket.OPEN){toast('Server disconnected. Reload the game.');return;}
  if(!owned){shopPending=item.id;$('#shopStatus').textContent='Buying '+item.name+'...';renderShop();send({type:'buy',item:item.id});}else{send({type:'equip',slot:item.slot,item:equipped?'none':item.id});toast(equipped?'Taking off '+item.name:'Putting on '+item.name);}});
 el.append(button);}}
function cycleSlot(slot){const ids=['none',...catalog.filter(i=>i.slot===slot&&profile.inventory.includes(i.id)).map(i=>i.id)];const i=ids.indexOf(profile.equipped?.[slot]||'none');send({type:'equip',slot,item:ids[(i+1)%ids.length]});}
let rgbDigits=[5,9,6];
function rgbFromProfile(){if(/^rgb-[0-9]{3}$/.test(profile.color||''))return [...profile.color.slice(4)].map(Number);return frogColor(profile.color).map(v=>Math.round(v*9));}
function renderRGB(){const el=$('#rgbControl');if(!el)return;el.replaceChildren();
 const head=document.createElement('div');head.className='label-row';head.innerHTML='<span>CUSTOM COLOR · RED / GREEN / BLUE · 0 TO 9</span><span>1,000 POSSIBLE COLORS</span>';el.append(head);
 const rows=document.createElement('div');rows.className='rgbRows';
 for(const [i,name] of ['RED','GREEN','BLUE'].entries()){
  const row=document.createElement('label');row.className='rgbRow';const label=document.createElement('strong');label.textContent=name;
  const input=document.createElement('input');input.type='range';input.min='0';input.max='9';input.step='1';input.value=String(rgbDigits[i]);input.className='rgbSlider';input.setAttribute('aria-label',name+' digit 0 to 9');
  const value=document.createElement('output');value.textContent=String(rgbDigits[i]);input.oninput=()=>{rgbDigits[i]=Number(input.value);value.textContent=input.value;preview.style.background=cssFrogColor('rgb-'+rgbDigits.join(''));preview.title='RGB '+rgbDigits.join('');};
  row.append(label,input,value);rows.append(row);
 }
 const bottom=document.createElement('div');bottom.className='rgbApply';const preview=document.createElement('span');preview.className='rgbPreview';preview.style.background=cssFrogColor('rgb-'+rgbDigits.join(''));preview.title='RGB '+rgbDigits.join('');
 const apply=document.createElement('button');apply.className='minor';apply.type='button';apply.textContent='APPLY R'+rgbDigits[0]+' G'+rgbDigits[1]+' B'+rgbDigits[2];
 for(const range of rows.querySelectorAll('input'))range.addEventListener('input',()=>apply.textContent='APPLY R'+rgbDigits[0]+' G'+rgbDigits[1]+' B'+rgbDigits[2]);
 apply.onclick=()=>{chosenColor='rgb-'+rgbDigits.join('');send({type:'color',color:chosenColor});toast('Frog color: R'+rgbDigits[0]+' G'+rgbDigits[1]+' B'+rgbDigits[2]);};
 bottom.append(preview,apply);el.append(rows,bottom);
}
function renderCloset(){const el=$('#closetColors');if(!el)return;el.replaceChildren();for(const [color,hex] of Object.entries(COLOR_HEX)){
 const button=document.createElement('button');button.type='button';button.className='swatch'+(profile.color===color?' active':'');button.style.setProperty('--s',hex);button.title='Wear '+color;button.ariaLabel='Wear '+color;
 button.onclick=()=>{chosenColor=color;send({type:'color',color});};el.append(button);}
 rgbDigits=rgbFromProfile();renderRGB();
 const slots=$('#outfits');slots.replaceChildren();for(const slot of ['hat','face','back']){const id=profile.equipped?.[slot]||'none',item=itemById(id),count=catalog.filter(x=>x.slot===slot&&profile.inventory.includes(x.id)).length;
 const button=document.createElement('button');button.className='equipSlot';button.innerHTML='<span>'+(slot==='hat'?'🎩 HAT':slot==='face'?'🥸 FACE':'🎒 BACK')+'</span><span>'+(item?item.emoji+' '+escapeHtml(item.name):'NONE')+' ↻</span>';
 button.title='Cycle through your '+count+' owned '+slot+' cosmetics';button.onclick=()=>cycleSlot(slot);slots.append(button);}}
$('#joinFromLobby').onclick=()=>{const code=$('#lobbyCodeInput').value.trim().toUpperCase();if(code.length!==5){toast('Type a five-character room code.');return;}send({type:'join',code,name:chosenName,color:profile.color});};
$('#lobbyCodeInput').onkeydown=e=>{if(e.key==='Enter')$('#joinFromLobby').click();};
$('#newRoom').onclick=()=>send({type:'create',name:chosenName,color:profile.color});
async function toggleVoice(){if(FrogVoice.enabled){FrogVoice.disable();syncVoiceButtons();toast('Voice chat muted.');return;}
 try{await FrogVoice.enable();syncVoiceButtons();toast('Voice is ON! Squeaky frogs, deep monster. 🎙️',3200);}catch(e){FrogVoice.disable();syncVoiceButtons();toast('Microphone unavailable: '+e.message,5500);}}
function syncVoiceButtons(){const active=FrogVoice.enabled;$('#voiceToggle').textContent=active?'🎙️ VOICE ON · CLICK TO MUTE':'🎙️ ENABLE VOICE CHAT (OPTIONAL)';$('#voiceToggle').classList.toggle('on',active);$('#micHud').textContent=active?'🎙️ VOICE ON':'🎙️ VOICE OFF';}
$('#voiceToggle').onclick=toggleVoice;$('#micHud').onclick=toggleVoice;
// Cosmetics appear on the 3D avatars during matches, on the lobby pedestal, and in other players' views.
function cosmeticModel(p,sc){const eq=p.equipped||{},hat=eq.hat,face=eq.face,back=eq.back;
 if(back==='wings'){for(const side of [-1,1]){dotBall(p,side*.65,1.0,.42,.31,.42,.10,[.92,.75,1],sc,.08);dotBall(p,side*.78,.65,.46,.26,.31,.09,[.74,1,.97],sc,.1);}}
 if(back==='cape'){dotBall(p,0,.65,.48,.52,.62,.055,[.89,.28,.52],sc);dotBall(p,0,1.2,.45,.54,.11,.10,[1,.83,.43],sc);}
 if(back==='backpack'){dotBall(p,0,.78,.44,.36,.43,.18,[.77,.43,.82],sc);dotBall(p,0,.80,.67,.24,.25,.05,[1,.82,.49],sc);}
 if(hat==='mushroom'){dotBall(p,0,2.01,-.07,.18,.23,.16,[1,.89,.68],sc);dotBall(p,0,2.19,-.08,.62,.25,.54,[.95,.32,.53],sc);for(const x of [-.27,.05,.32])dotBall(p,x,2.29,-.43,.095,.043,.08,[1,.97,.86],sc);}
 if(hat==='crown'){dotBall(p,0,2.02,-.05,.49,.12,.44,[1,.74,.23],sc,.1);for(const x of [-.38,0,.38]){dotBall(p,x,2.23,-.07,.11,x===0?.27:.2,.11,[1,.85,.32],sc,.1);dotBall(p,x,2.44-(x? .07:0),-.07,.06,.06,.06,[.75,.26,.96],sc,.25);}}
 if(hat==='party'){dotBall(p,0,2.16,-.08,.37,.15,.35,[.7,.44,.99],sc);for(let i=0;i<4;i++)dotBall(p,.13*Math.sin(i*2.2),2.3+i*.15,-.1,.22-i*.045,.095,.22-i*.04,i%2?[.99,.65,.78]:[.79,.95,.49],sc);dotBall(p,0,2.89,-.08,.11,.11,.11,[1,.89,.25],sc);}
 if(hat==='wizard'){dotBall(p,0,2.05,-.08,.69,.085,.61,[.34,.25,.62],sc);dotBall(p,0,2.30,-.08,.38,.36,.38,[.47,.32,.78],sc);dotBall(p,.06,2.59,-.08,.24,.31,.25,[.45,.31,.75],sc);dotBall(p,.22,2.87,-.06,.13,.16,.12,[.43,.28,.73],sc);}
 if(hat==='bow'){dotBall(p,-.06,2.12,-.22,.11,.12,.12,[1,.8,.46],sc);dotBall(p,-.35,2.15,-.22,.32,.22,.16,[1,.42,.62],sc);dotBall(p,.27,2.15,-.22,.32,.22,.16,[1,.42,.62],sc);}
 if(face==='glasses'||face==='starshades'){for(const side of [-1,1]){const c=face==='glasses'?[.24,.23,.31]:[.96,.68,.3],lens=face==='glasses'?[.82,.97,.97]:[.2,.16,.43];dotBall(p,side*.30,1.72,-.69,.20,.16,.055,c,sc);dotBall(p,side*.30,1.72,-.742,.14,.105,.022,lens,sc,face==='starshades'?.15:0);}dotBall(p,0,1.73,-.67,.12,.035,.04,[.24,.23,.31],sc);}
 if(face==='mustache'){dotBall(p,-.12,1.28,-.62,.17,.055,.07,[.23,.16,.20],sc);dotBall(p,.12,1.28,-.62,.17,.055,.07,[.23,.16,.20],sc);}
}
// A cute, physical lobby space: an old green computer, a mirror / changing hut, and a store stall.
function lobbyProps(t){
 // Ribbitron computer
 block(-4.1,.45,-3.6,1.3,.5,.75,[.39,.26,.24]);block(-4.1,1.2,-3.8,.9,.66,.19,[.22,.39,.29]);block(-4.1,1.23,-3.56,.75,.49,.04,[.56,.93,.74]);block(-4.1,.94,-3.38,.27,.035,.2,[.77,.81,.7]);ball(-4.1,1.25,-3.49,.16,.16,.04,[.92,1,.75],.3);
 // Mushroom canopy over the shop counter
 block(0,.44,-7.3,1.9,.48,.75,[.54,.32,.42]);for(const x of [-1.45,1.45])rod([x,.45,-7.45],[x,2.5,-7.45],.12,[.89,.8,.68]);ball(0,2.66,-7.4,2,.43,1.15,[.96,.38,.59]);for(const x of [-1,.2,1.1])ball(x,2.96,-7.15,.16,.05,.15,[1,.94,.82]);
 // Wardrobe/mirror hut, with rosy drapes and cute colored light orbs
 block(4.1,1.05,-3.55,1.35,1.2,.28,[.81,.59,.78]);block(4.1,1.12,-3.24,.96,.98,.05,[.63,.87,.91]);for(const x of [3.0,5.2])rod([x,.06,-3.65],[x,2.55,-3.65],.16,[.98,.75,.58]);ball(4.1,2.57,-3.65,1.37,.23,.55,[.98,.44,.69]);
 for(let i=0;i<6;i++){let a=i/6*TAU;ball(4.1+Math.cos(a)*1.2,2.2+Math.sin(a)*.13,-3.22,.10,.10,.10,Object.values(PALETTE)[i],.24);}
}
// ——— In-headset 3D floating terminal, with trigger-operated controls and a code keyboard ———
const vCanvas=document.createElement('canvas');vCanvas.width=1024;vCanvas.height=768;const vc=vCanvas.getContext('2d');
const vTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,vTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
let vrPage='pond',vrCode='',vrLast=-100,vrZones=[],vrPanel=null;
const frogyVrBrand=new Image();frogyVrBrand.onload=()=>{vrLast=-100;};frogyVrBrand.onerror=()=>{vrLast=-100;};frogyVrBrand.src='/branding/frogy-logo.png';
function vrRect(x,y,w,h,fill,stroke=null,r=16){vc.beginPath();vc.roundRect(x,y,w,h,r);vc.fillStyle=fill;vc.fill();if(stroke){vc.strokeStyle=stroke;vc.lineWidth=2;vc.stroke();}}
function vrText(s,x,y,size=30,color='#edffee',align='left',weight=700){vc.fillStyle=color;vc.font=weight+' '+size+'px system-ui, sans-serif';vc.textAlign=align;vc.fillText(String(s),x,y);vc.textAlign='left';}
function vrBtn(label,x,y,w,h,fn,selected=false){vrRect(x,y,w,h,selected?'#bafa9a':'#204958',selected?'#d7ffcf':'#80b09d',13);vrText(label,x+w/2,y+h/2+10,Math.min(27,Math.max(16,(w-20)/Math.max(6,label.length)*1.6)),selected?'#193d35':'#eaffef','center',800);vrZones.push({x,y,w,h,fn});}
function redrawVRPanel(t){if(t-vrLast<.12)return;vrLast=t;vrZones=[];vc.fillStyle='#0a1a2b';vc.fillRect(0,0,1024,768);vrRect(12,12,1000,744,'#193846','#bdffa4',30);if(frogyVrBrand.complete&&frogyVrBrand.naturalWidth){vc.drawImage(frogyVrBrand,44,17,171,91);}else{vrText('FROGY',46,65,41,'#c5ffa3');}vrText('RIBBITRON 3000',242,65,31,'#c5ffa3');vrText('🪙 '+profile.coins,975,63,30,'#ffe596','right');
 for(const [i,tab] of ['pond','shop','closet','terminal'].entries())vrBtn(['POND','SHOP','DRESS UP','ROOM PC'][i],43+i*239,100,220,62,()=>{vrPage=tab;vrLast=-1;},vrPage===tab);
 if(vrPage==='pond'&&!room){
  vrText('WELCOME TO THE LILY PAD!',50,239,44,'#d9ffa6');
  vrText('Join public matchmaking or friends by code.',50,313,31,'#ebf8eb');
  vrBtn('PLAY PUBLIC / AUTO MATCH',62,354,900,88,()=>{send({type:'public',name:chosenName,color:profile.color});vrLast=-1;});
  vrBtn('CREATE PRIVATE LOBBY',62,453,900,88,()=>{send({type:'create',name:chosenName,color:profile.color});vrLast=-1;});
  vrBtn('JOIN FRIEND BY ROOM CODE',62,551,900,88,()=>{vrPage='terminal';vrLast=-1;});
  vrText('Use controller trigger to click the menu',50,700,25,'#a8cdc1');
 }else if(vrPage==='pond'){
  vrText((selectedVisibility==='public'?'PUBLIC MATCH · ':'PRIVATE ROOM · ')+(room||'-----'),50,233,43,'#d9ffa6');vrText('Frogs '+all.length+'/8  ·  '+(phase==='countdown'?'NEXT ROUND IN '+remaining+'s':phase==='intermission'?'NEXT ROUND IN ~'+(remaining+16)+'s':'WAITING FOR FROGS'),51,290,29,'#ebf8eb');
  vrText('VOTE FOR NEXT MAP',50,360,31,'#fff0b1');
  for(let i=0;i<3;i++){const names=['🌲 ROTWOOD SWAMP','🪦 GRAVEBELL','☣ HOLLOW CREEK'];vrBtn(names[i]+' ('+((typeof vrMapVotes!=='undefined'?vrMapVotes[i]:0)||0)+')',50+i*308,391,296,92,()=>{myVote=i;send({type:'vote',index:i});vrLast=-1;},myVote===i);}
  vrBtn(FrogVoice.enabled?'🎙️ VOICE ON · MUTE':'🎙️ ENABLE VOICE (OPT-IN)',50,527,925,92,()=>{toggleVoice();vrLast=-1;},FrogVoice.enabled);
  vrText('Use trigger to press buttons · B on monster = roar · A = jump',51,698,23,'#a8cdc1');
 }else if(vrPage==='shop'){
  vrText('RIBBIT\'S BOUTIQUE · BUY WITH DAILY COINS',48,214,28,'#ffefa3');
  catalog.forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=48+col*478,y=238+row*74;const owned=profile.inventory?.includes(item.id),equipped=profile.equipped?.[item.slot]===item.id;vrBtn(item.emoji+' '+item.name+' · '+(equipped?'ON':owned?'WEAR':item.price+'🪙'),x,y,462,67,()=>{if(!owned){shopPending=item.id;send({type:'buy',item:item.id});}else send({type:'equip',slot:item.slot,item:equipped?'none':item.id});vrLast=-1;},equipped);});
 }else if(vrPage==='closet'){
  vrText('CUSTOM FROG COLOR · 0–9 RED / GREEN / BLUE',48,205,30,'#ffe0fb');
  for(const [i,name] of ['RED','GREEN','BLUE'].entries()){const y=243+i*94;vrText(name,60,y+42,27,'#eafbea');vrBtn('−',245,y,110,67,()=>{rgbDigits[i]=Math.max(0,rgbDigits[i]-1);vrLast=-1;});vrText(String(rgbDigits[i]),505,y+47,51,['#fa8791','#9ffba7','#84b6fa'][i],'center');vrBtn('+',660,y,120,67,()=>{rgbDigits[i]=Math.min(9,rgbDigits[i]+1);vrLast=-1;});}
  vrBtn('APPLY RGB '+rgbDigits.join(''),52,533,920,65,()=>{send({type:'color',color:'rgb-'+rgbDigits.join('')});vrLast=-1;});
  for(const [i,slot] of ['hat','face','back'].entries()){const id=profile.equipped?.[slot]||'none',name=itemById(id)?.name||'NONE';vrBtn(slot.toUpperCase()+' · '+name,50+i*317,628,304,90,()=>{cycleSlot(slot);vrLast=-1;});}
 }else if(vrPage==='terminal'){
  vrText('💻 TYPE THE 5-CHARACTER ROOM CODE',50,207,31,'#bcffbc');vrRect(50,226,925,60,'#081825','#71baaf',12);vrText(vrCode.padEnd(5,'_'),512,270,47,'#f8e7a5','center');
  const letters='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let i=0;i<letters.length;i++){const x=55+i%8*117,y=305+Math.floor(i/8)*71;vrBtn(letters[i],x,y,105,61,()=>{if(vrCode.length<5)vrCode+=letters[i];vrLast=-1;});}
  vrBtn('⌫ BACK',54,608,260,75,()=>{vrCode=vrCode.slice(0,-1);vrLast=-1;});vrBtn('CLEAR',329,608,247,75,()=>{vrCode='';vrLast=-1;});vrBtn('JOIN '+vrCode,593,608,378,75,()=>{if(vrCode.length===5){send({type:'join',code:vrCode,name:chosenName,color:profile.color});vrLast=-1;}else toast('Enter 5 letters first!');},vrCode.length===5);
 }
 gl.bindTexture(gl.TEXTURE_2D,vTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,vCanvas);
}
let vrMapVotes=[0,0,0];
function drawVRMenu(t,head){redrawVRPanel(t);
 const f=norm([head.forward[0],0,head.forward[2]]),yaw=Math.atan2(-f[0],-f[2]),center=[head.x+f[0]*1.8,head.y+.03,head.z+f[2]*1.8];vrPanel={center,normal:[Math.sin(yaw),0,Math.cos(yaw)],right:[Math.cos(yaw),0,-Math.sin(yaw)],w:1.87,h:1.40,yaw};
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);gl.uniformMatrix4fv(tp.m,false,mat(center[0],center[1],center[2],vrPanel.w,vrPanel.h,1,yaw));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,vTexture);gl.uniform1i(tp.tex,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);
}
function menuHit(origin,d){if(!vrPanel)return null;const {center,normal,right,w,h}=vrPanel,den=dot(d,normal);if(Math.abs(den)<.0001)return null;const q=center.map((v,i)=>v-origin[i]),t=dot(q,normal)/den;if(t<.03||t>5)return null;const hit=origin.map((v,i)=>v+d[i]*t),delta=hit.map((v,i)=>v-center[i]),x=(.5+dot(delta,right)/w)*1024,y=(.5-delta[1]/h)*768;if(x<0||x>1024||y<0||y>768)return null;return {x,y,point:hit};}
function clickVRMenu(o,d){const hit=menuHit(o,d);if(!hit)return;const z=vrZones.find(z=>hit.x>=z.x&&hit.x<=z.x+z.w&&hit.y>=z.y&&hit.y<=z.y+z.h);if(z){z.fn();sound(0);}}
function drawVRLaser(){const ray=vrInput.right?.ray||vrInput.left?.ray;if(!ray)return;const hit=menuHit(ray.o,ray.d),end=hit?.point||ray.o.map((n,i)=>n+ray.d[i]*3);lines([...ray.o,...end],[.68,1,.77,.92]);if(hit){ball(...hit.point,.015,.015,.015,[1,.87,.5],.3);}}
// Refresh map vote totals at the same update cadence as the game's state packets.
const _updateState=updateState;
updateState=function(s){vrMapVotes=s.votes||[0,0,0];_updateState(s);vrLast=-1;};
// Welcome window room code can also be typed as a normal keyboard shortcut.
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&activeTab!=='pond'&&phase!=='playing')setTab('pond');});
setTab('pond');renderShop();renderCloset();syncVoiceButtons();
