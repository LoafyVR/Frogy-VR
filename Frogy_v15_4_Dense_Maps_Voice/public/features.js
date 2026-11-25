'use strict';
/* Frogy additions: coin shop, color-changing dressing hut, map voting and in-VR Ribbitron computer. */
FrogVoice.configure({send,getId:()=>clientId});
const COLOR_HEX={mint:'#89ed9c',pink:'#ff9ec3',lilac:'#bc9cff',blue:'#83d9fb',peach:'#ffc28c',lime:'#d7f17e'};
const itemById=id=>catalog.find(c=>c.id===id);
function setTab(t){if(!['pond','shop','tools','closet','terminal','inventory','quests','people','friends','settings'].includes(t))return;activeTab=t;for(const button of document.querySelectorAll('[data-tab]'))button.classList.toggle('selected',button.dataset.tab===t);for(const pane of ['Pond','Shop','Tools','Closet','Terminal','Inventory','Quests','People','Friends','Settings'])$('#tab'+pane).classList.toggle('hidden',pane.toLowerCase()!==t);}
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>setTab(button.dataset.tab);
function renderShop(){const el=$('#shopGrid');if(!el)return;el.replaceChildren();for(const item of catalog){
 const owned=profile.inventory?.includes(item.id),equipped=profile.equipped?.[item.slot]===item.id,pending=shopPending===item.id;
 const button=document.createElement('button');button.type='button';button.className='shopItem'+(owned?' owned':'');button.disabled=pending;
 button.innerHTML='<span class="emoji">'+item.emoji+'</span><b>'+escapeHtml(item.name)+'</b><small>'+(pending?'⏳ BUYING...':equipped?'✓ WEARING':owned?'OWNED • WEAR':('🦗 '+item.price+' • BUY'))+'</small>';
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
function syncVoiceButtons(){
 const active=FrogVoice.enabled,peers=FrogVoice.connected;
 $('#voiceToggle').textContent=active?'🎙️ '+(peers?'CONNECTED · ':'MIC ON · ')+'CLICK TO MUTE':'🎙️ ENABLE VOICE CHAT (OPTIONAL)';
 $('#voiceToggle').classList.toggle('on',active);
 $('#micHud').textContent=active?'🎙️ '+(peers?'CONNECTED':'MIC ON'):'🎙️ VOICE OFF';
 const detail=$('#voiceChatStatus');if(detail)detail.textContent=active?FrogVoice.status+' · Voice chat requires BOTH players to enable their mics.':'Both players must enable voice and grant microphone permission on their headsets.';
}
setInterval(syncVoiceButtons,1800);
$('#voiceToggle').onclick=toggleVoice;$('#micHud').onclick=toggleVoice;

// Settings are device-local. Browser/microphone permissions remain opt-in.
const settingsDefs=[
 {key:'music',label:'🎵 Music',hint:'Gentle lobby jazz or haunting match ambience',type:'toggle'},
 {key:'sfx',label:'🔊 Sound effects',hint:'Buttons, grabs, weapons, frog hits and monster',type:'toggle'},
 {key:'volume',label:'🎚️ Master volume',hint:'Controls music and sound effects',type:'range',min:0,max:100,step:5},
 {key:'voiceMuted',label:'🔇 Mute all players',hint:'Locally silence multiplayer voices (your mic stays opt-in)',type:'toggle'},
 {key:'joystickTurning',label:'🕹️ Right-stick turning',hint:'Optional turn only — arm pushes still control movement',type:'toggle'},
 {key:'turnMode',label:'🔄 Turning mode',hint:'Snap is usually more comfortable in VR',type:'select',choices:[['snap','Snap turns'],['smooth','Smooth turn']]},
 {key:'snapAngle',label:'↪ Snap angle',hint:'Amount rotated per joystick flick',type:'select',choices:[[30,'30°'],[45,'45°'],[60,'60°'],[90,'90°']]},
 {key:'comfortVignette',label:'👁️ Motion comfort vignette',hint:'Darkens the edges while pushing or jumping',type:'toggle'},
 {key:'effects',label:'💧 Combat particles',hint:'Disable heavy visual splats for performance',type:'toggle'},
 {key:'graphics',label:'🌲 Environment detail',hint:'Low reduces extra particles and vegetation',type:'select',choices:[['low','Low / Quest 2'],['balanced','Balanced'],['high','High']]}
];
function settingValue(label,ctrl){const line=document.createElement('div');line.className='settingLine';
 const caption=document.createElement('label');caption.textContent=label.label;const hint=document.createElement('small');hint.textContent=label.hint;caption.append(hint);line.append(caption);
 const value=FrogySettings.state[label.key];
 if(label.type==='toggle'){const input=document.createElement('input');input.type='checkbox';input.checked=!!value;input.ariaLabel=label.label;input.onchange=()=>FrogySettings.set(label.key,input.checked);line.append(input);}
 else if(label.type==='select'){const select=document.createElement('select');select.ariaLabel=label.label;for(const [val,name] of label.choices){const option=document.createElement('option');option.value=String(val);option.textContent=name;select.append(option);}select.value=String(value);select.onchange=()=>FrogySettings.set(label.key,label.key==='snapAngle'?Number(select.value):select.value);line.append(select);}
 else{const wrap=document.createElement('div');wrap.style.display='flex';wrap.style.alignItems='center';wrap.style.gap='8px';const input=document.createElement('input');input.type='range';input.min=label.min;input.max=label.max;input.step=label.step;input.value=value;const output=document.createElement('output');output.textContent=value+'%';input.oninput=()=>{output.textContent=input.value+'%';FrogySettings.set(label.key,Number(input.value));};wrap.append(input,output);line.append(wrap);}
 return line;
}
function makeMuteRoster(){const line=document.createElement('div');line.className='settingLine';line.style.display='block';const h=document.createElement('label');h.textContent='🎙️ Individual player mute';const desc=document.createElement('small');desc.textContent='Mute noisy frogs only for yourself';h.append(desc);line.append(h);
 const roster=document.createElement('div');roster.className='settingsPeople';for(const p of all){if(p.id===clientId)continue;const btn=document.createElement('button');btn.type='button';const muted=FrogVoice.isMuted(p.id);btn.className=muted?'isMuted':'';btn.textContent=(muted?'🔇 Unmute ':'🔊 Mute ')+p.name;
 btn.onclick=()=>{FrogVoice.setMuted(p.id,!FrogVoice.isMuted(p.id));renderSettings();};roster.append(btn);}
 if(!roster.children.length){const text=document.createElement('small');text.textContent='Other players will appear here when they join.';roster.append(text);}line.append(roster);return line;
}
function renderSettings(){for(const target of ['#settingsControls','#desktopSettingsControls']){const host=$(target);if(!host)continue;host.replaceChildren();for(const def of settingsDefs)host.append(settingValue(def));host.append(makeMuteRoster());}}
FrogySettings.subscribe((name,val)=>{if(name==='voiceMuted')FrogVoice.setAllMuted(val);if(name==='music'||name==='sfx'){$('#soundToggle').textContent=FrogySettings.state.sfx?'🔊 SOUND ON':'🔇 SOUND OFF';}if(name==='music'||name==='sfx'||name==='graphics'||name==='joystickTurning'||name==='turnMode'||name==='voiceMuted'||name==='effects')renderSettings();vrLast=-1;});

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
// Distinct, purpose-built environment: separate from every horror match map.
// Haunted pump-house lobby: central circulation lane stays free, and props
// are positioned *inside* the hall rather than intersecting the walls.
function lobbyEnvironment(t){
 // NIGHTFALL MARSH COMMONS: an outdoor, fog-bound village plaza on wet timber.
 // Entire central area remains traversable. The voting board at (0,2.03,-5.3)
 // is intentionally untouched and has a clear, lit approach from +Z.
 const mud=[.055,.078,.067],water=[.018,.069,.073],wetWood=[.16,.128,.104],
  oldWood=[.21,.165,.113],moss=[.074,.16,.112],leaf=[.085,.19,.135],
  sickGreen=[.26,.48,.29],bone=[.37,.38,.31],stone=[.18,.22,.20];
 // Banks of the old pond and a continuous hard floor beneath the wooden paths.
 block(0,-.35,0,21.4,.36,21.4,mud);
 block(0,-.52,0,24.2,.13,24.2,[.017,.046,.050]);
 for(const [x,z,w,d] of [[-16,0,5,16],[16,0,5,16],[0,18,18,4],[0,-17.5,18,3.5]]){
  block(x,-.065,z,w,.024,d,water);
  for(let i=0;i<8;i++){const xx=x+Math.sin(i*1.9)*Math.min(w-1,3),zz=z+Math.cos(i*1.42)*Math.min(d-1,3);
   ball(xx,-.028,zz,.32+(i%3)*.18,.008,.12,[.055,.15,.14],.12);}
 }
 // Narrow warped planks, tactile-friendly and continuous through the lobby.
 for(let j=-15;j<=16;j++){
  const z=j*1.02;
  if(Math.abs(z+5.3)<.7)continue;
  const width=Math.abs(z)<8?5.1:3.8;
  for(let k=-Math.floor(width);k<=Math.floor(width);k++){
   const x=k*.94+.14*Math.sin(j*.8);
   if(Math.abs(x)<2.8&&z>-5.0&&z<-1.0)continue; // voting carpet remains visible
   block(x,.034,z,.445,.033,.455,(j+k)%5===0?oldWood:wetWood);
  }
 }
 // Dedicated walkways to the computer, shop and changing nook.
 for(const [ax,az,bx,bz] of [[-2,3,-11,-8],[1,3,0,-12],[2,3,11,-8]]){
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),steps=Math.floor(len/.72);
  for(let i=0;i<=steps;i++){
   const q=i/steps,x=ax+dx*q,z=az+dz*q;
   if(Math.abs(z+5.3)<.7&&Math.abs(x)<3)continue;
   block(x,.055,z,.60,.045,.42,i%5===0?oldWood:wetWood);
  }
 }
 // A damp antique rug and weathered viewing benches in front of the ORIGINAL voting board.
 block(0,.065,-2.9,3.18,.018,1.60,[.18,.13,.12]);
 for(let i=0;i<13;i++){const x=-2.86+i*.47;block(x,.084,-2.92,.024,.008,1.45,i%3===0?[.46,.26,.18]:[.30,.20,.19]);}
 for(const side of [-1,1]){
  const x=side*4.25,z=-1.7;
  block(x,.56,z,1.18,.11,.37,oldWood);
  block(x,1.03,z-.36,1.17,.50,.11,wetWood);
  for(const dx of [-.89,.89])for(const dz of [-.24,.24])rod([x+dx,.1,z+dz],[x+dx,.50,z+dz],.06,stone);
 }
 // Crescent of skeletal cypress trees around the village — distinctive from the match maps.
 for(let i=0;i<19;i++){
  const a=(i/19)*TAU,r=19.5+(i%3)*.9,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(Math.abs(x)<5&&z>-21&&z<-15)continue;
  const h=5.4+(i%6)*.46,rr=.24+(i%4)*.045;
  rod([x,0,z],[x+.2*Math.sin(i*2),h,z+.24*Math.cos(i*1.7)],rr,[.12,.125,.10]);
  for(let b=0;b<3;b++){
   const y=2.4+b*.93,angle=a+b*2.3,x2=x+Math.sin(angle)*(2.2-b*.28),z2=z+Math.cos(angle)*(2.2-b*.28);
   rod([x,y,z],[x2,y+1.35,z2],.085,[.13,.135,.11]);
   rod([x2,y+1.35,z2],[x2+.20,y+.13,z2+.16],.032,[.12,.23,.15]);
  }
  // Bulging damp roots root the trunks visibly into the muddy banks.
  for(let b=0;b<3;b++){const a2=a+b*2.08;rod([x,.7,z],[x+Math.sin(a2)*1.0,.04,z+Math.cos(a2)*1.0],.11,[.09,.14,.10]);}
  ball(x,h*.76,z,1.0,.40,.84,[.065,.135,.095],.10);
 }
 // Reachable trees are generated from the SAME positions and radii as their
 // body and hand colliders (public/collision.js). They're meant for climbing.
 for(const q of FrogyCollision.hubTrees.slice(0,8)){
  if(Math.hypot(q.x-vrPos.x,q.z-vrPos.z)>32)continue;
  rod([q.x,.02,q.z],[q.x+.14,q.h,q.z-.12],q.r,[.15,.185,.13]);
  for(let k=0;k<3;k++){
   const ang=k*2.09+q.x*.13,yy=q.h*(.55+k*.115);
   rod([q.x,yy,q.z],[q.x+Math.cos(ang)*1.9,yy+.95,q.z+Math.sin(ang)*1.9],.10,[.12,.19,.14]);
  }
  for(let k=0;k<4;k++){
   const ang=k*1.57;rod([q.x,.75,q.z],[q.x+Math.cos(ang)*1.1,.035,q.z+Math.sin(ang)*1.1],.13,[.14,.16,.11]);
  }
  ball(q.x,q.h*.84,q.z,1.05,.39,.88,[.068,.14,.09],.06);
 }
 // Marsh reeds, moss tufts, cattails and irregular stone clusters.
 for(let i=0;i<125;i++){
  const a=i*2.39996,r=13.8+(i%17)*.52,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(Math.hypot(x-vrPos.x,z-vrPos.z)>30||Math.abs(x)<5&&z>-8&&z<10)continue;
  const height=.48+(i%7)*.13;
  rod([x,0,z],[x+.12*Math.sin(i),height,z],.019,i%3?moss:leaf);
  if(i%5===0){ball(x,height+.08,z,.075,.20,.065,[.24,.17,.10]);ball(x+.31,.08,z-.23,.36,.10,.28,stone);}
 }
 // Ghostly fireflies and sickly green lantern pools — sparse, never a disco lobby.
 for(let i=0;i<24;i++){
  const a=i*2.39996,r=5+(i%7)*2.3,x=Math.cos(a)*r,z=Math.sin(a)*r,y=1.4+(i%5)*.54+.08*Math.sin(t+i);
  if(Math.hypot(x-vrPos.x,z-vrPos.z)>27)continue;
  ball(x,y,z,.035,.035,.035,[.55,.78,.34],.34);
 }
 for(const [x,z] of [[-6,-6],[6,-6],[-8,8],[8,8],[0,13]]){
  rod([x,.1,z],[x,3.2,z],.11,wetWood);block(x,3.27,z,.36,.15,.36,stone);
  ball(x,3.08,z,.18,.30,.20,[.47,.68,.29],.35);
  ball(x,.02,z,1.02,.012,1.02,[.11,.19,.10],.12);
 }
 // Half-drowned ruins at the perimeter give the swamp a mysterious history.
 for(const [x,z] of [[-16,-15],[16,-15],[-16,15],[16,15]]){
  for(let i=0;i<3;i++)block(x+(i-1)*1.12,.6+i*.25,z,.48,.64+i*.21,.50,stone);
  block(x,.14,z+1.1,2.8,.12,.32,[.19,.17,.14]);
  ball(x+.75,.03,z-.8,1.28,.08,.78,moss);
 }
}
function lobbyProps(t){
 const wood=[.23,.18,.14],iron=[.23,.27,.27],green=[.32,.62,.51],screen=[.45,.80,.69];
 // COMPUTER ALCOVE: -11,-8. Deep physical desk and recessed glowing screen.
 block(-11,.62,-8,1.58,.58,.86,wood);
 block(-11,1.52,-8.28,1.05,.77,.19,iron);
 block(-11,1.55,-8.02,.85,.58,.035,[.08,.21,.19]);
 ball(-11,1.55,-7.981,.62,.41,.02,screen,.18);
 block(-11,.98,-6.92,.84,.046,.30,[.45,.46,.39]);
 for(let i=0;i<8;i++)block(-11.65+i*.19,1.02,-6.84,.055,.007,.10,[.1,.16,.16]);
 for(const x of [-12.44,-9.56])rod([x,.1,-8.4],[x,2.65,-8.4],.12,[.19,.29,.25]);
 block(-11,2.69,-8.4,1.6,.12,.4,[.19,.22,.21]);
 // CREEPY BOUTIQUE: 0,-12. Shelving, hanging accessories and moss-clothed canopy.
 block(0,.65,-12,2.9,.65,1.0,wood);
 for(const x of [-2.65,2.65]){rod([x,.1,-12.8],[x,3.6,-12.8],.15,iron);ball(x,3.6,-12.8,.25,.14,.23,[.32,.44,.35]);}
 block(0,3.7,-12.8,2.9,.20,1.3,[.17,.24,.20]);
 block(0,3.98,-12.8,2.3,.16,1.1,[.13,.21,.17]);
 for(let j=0;j<6;j++){const x=-2.18+j*.86;rod([x,3.65,-12.1],[x,2.68-(j%3)*.19,-12.05],.045,[.17,.25,.20]);
  ball(x,2.45-(j%3)*.19,-12.06,.21,.19,.21,j%2?[.55,.33,.25]:[.20,.40,.31]);}
 for(let i=0;i<5;i++){const x=-2.05+i*.98;ball(x,.93,-11.18,.23,.20,.22,i%2?[.38,.53,.30]:[.51,.29,.24]);}
 // DRESSING NOOK: +11,-8. Mirror fully in front of the back rail; no wall intersections.
 for(const x of [9.65,12.35])rod([x,.1,-8.85],[x,3.25,-8.85],.13,wood);
 block(11,3.3,-8.85,1.6,.20,.42,wood);
 block(11,1.67,-8.61,1.30,1.39,.13,[.20,.28,.29]);
 block(11,1.67,-8.43,1.16,1.22,.026,[.35,.50,.54]);
 block(11,1.35,-8.38,.8,.80,.018,[.46,.66,.68]);
 for(let i=0;i<6;i++){const a=i/6*TAU;ball(11+Math.cos(a)*1.11,2.55+Math.sin(a)*.18,-8.35,.10,.10,.11,Object.values(PALETTE)[i],.2);}
 // Side tables, faded signage, crates and hanging vines without blocking paths.
 for(const [x,z] of [[-17,-4],[17,-3],[-15,-17],[16,-17]]){
  block(x,.40,z,.68,.39,.66,wood);block(x,.80,z,.78,.08,.75,[.22,.26,.23]);
 }
 for(let i=0;i<18;i++){const x=-18+i*2.0;rod([x,6.2,-19],[x+.13,5.45-(i%4)*.30,-19.1],.046,[.09,.25,.17]);}
}
// Player menus: tools, quests, mutual friends, moderation and persistent inventory.
let social={friends:[],incoming:[],outgoing:[],publicId:''};
let vrPeoplePage=0,vrFriendsPage=0,vrReportTarget='',vrReportReason='';
const TOOL_ROLES={survivor:'SURVIVOR',monster:'MONSTER'};
function walletText(){return '🦗 '+(profile.crickets??profile.coins??0)+' Crickets  ·  🏴‍☠️ '+(profile.dabloons||0)+' Dabloons';}
function renderTools(){const el=$('#toolsGrid');if(!el)return;el.replaceChildren();for(const item of profile.toolCatalog||[]){const button=document.createElement('button');button.className='shopItem';
 const top=document.createElement('span');top.className='emoji';top.textContent=item.emoji;const name=document.createElement('b');name.textContent=item.name;
 const meta=document.createElement('small');meta.textContent=item.price+' Dabloons · '+item.role+' · owned '+(profile.tools?.[item.id]||0);
 const detail=document.createElement('small');detail.textContent=item.description;button.append(top,name,meta,detail);
 button.onclick=()=>send({type:'buyTool',item:item.id});el.append(button);}}
function renderInventory(){const el=$('#inventoryContents');if(!el)return;el.replaceChildren();const h=document.createElement('h3');h.textContent='🎒 Your tools (saved until used)';el.append(h);
 for(const item of profile.toolCatalog||[]){const count=profile.tools?.[item.id]||0;const line=document.createElement('div');line.className='equipSlot';const title=document.createElement('span');title.textContent=item.emoji+' '+item.name+' ×'+count+' ('+item.role+')';const use=document.createElement('button');use.className='minor';use.textContent='USE IN ROUND';use.disabled=!count||phase!=='playing'||!me?.alive||!!me?.spectating||(me?.monster?'monster':'survivor')!==item.role||!!me?.activeTools?.[item.id];use.onclick=()=>send({type:'activateTool',item:item.id});line.append(title,use);el.append(line);}
 const note=document.createElement('p');note.className='fine';note.textContent='You keep unused tools between days. Using a tool consumes one, and its effect expires after the current round.';el.append(note);}
function renderQuests(){const el=$('#questsContents');if(!el)return;el.replaceChildren();const h=document.createElement('h3');h.textContent='📜 Daily quests · '+(profile.dailyDay||'');el.append(h);
 for(const q of profile.quests||[]){const div=document.createElement('div');div.className='equipSlot';const label=document.createElement('span');label.textContent=(q.claimed?'✅ ':'📜 ')+q.name+' — '+q.description;const count=document.createElement('strong');count.textContent=q.progress+'/'+q.target+' · '+(q.claimed?'CLAIMED':'🏴‍☠️ '+q.reward);div.append(label,count);el.append(div);} }
function renderPeople(){const el=$('#peopleContents');if(!el)return;el.replaceChildren();const h=document.createElement('h3');h.textContent='👥 In this lobby';el.append(h);
 for(const p of all){if(p.id===clientId)continue;const line=document.createElement('div');line.className='peopleLine';const title=document.createElement('b');title.textContent=p.name;line.append(title);
 const mute=document.createElement('button');mute.className='minor';mute.textContent=FrogVoice.isMuted(p.id)?'Unmute':'Mute';mute.onclick=()=>{FrogVoice.setMuted(p.id,!FrogVoice.isMuted(p.id));renderPeople();};line.append(mute);
 const fr=document.createElement('button');fr.className='minor';fr.textContent='Friend';fr.onclick=()=>send({type:'friendRequest',publicId:p.publicId});line.append(fr);
 const report=document.createElement('select');report.ariaLabel='Report player';for(const x of ['Report…','Harassment','Cheating','Offensive name','Other']){const o=document.createElement('option');o.value=x==='Report…'?'':x;o.textContent=x;report.append(o);}report.onchange=()=>{if(report.value)send({type:'reportPlayer',playerId:p.id,reason:report.value});report.value='';};line.append(report);el.append(line);}
 if(all.length<=1){const a=document.createElement('p');a.textContent='No other frogs here yet.';el.append(a);} }
function renderFriends(){const el=$('#friendsContents');if(!el)return;el.replaceChildren();const h=document.createElement('h3');h.textContent='💚 Friends · mutual requests required';el.append(h);
 const identity=document.createElement('p');identity.className='fine';identity.textContent='Your Frog ID: '+(social.publicId||profile.publicId||'...');el.append(identity);
 for(const friend of social.friends||[]){const line=document.createElement('div');line.className='equipSlot';const title=document.createElement('span');title.textContent=friend.name+' — '+(friend.online?'🟢 ONLINE':'⚫ OFFLINE');const btn=document.createElement('button');btn.className='minor';btn.textContent=friend.online?'JOIN FRIEND':'OFFLINE';btn.disabled=!friend.online;btn.onclick=()=>send({type:'friendJoin',publicId:friend.id});line.append(title,btn);el.append(line);}
 for(const req of social.incoming||[]){const line=document.createElement('div');line.className='equipSlot';const text=document.createElement('span');text.textContent='Request from '+req.name;const btn=document.createElement('button');btn.className='minor';btn.textContent='FRIEND BACK';btn.onclick=()=>send({type:'friendRequest',publicId:req.id});line.append(text,btn);el.append(line);}
 const note=document.createElement('p');note.className='fine';note.textContent='Both frogs must send a friend request. Friend status is tied to the saved browser profile; do not clear browser storage.';el.append(note);}
function renderSocialMenus(){renderTools();renderInventory();renderQuests();renderPeople();renderFriends();}
// ——— In-headset 3D floating terminal, with trigger-operated controls and a code keyboard ———
const vCanvas=document.createElement('canvas');vCanvas.width=1024;vCanvas.height=768;const vc=vCanvas.getContext('2d');
const vTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,vTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
let roomMessage='',roomMessageUntil=0;let colorMessage='',colorMessageUntil=0,vrRgbDraft='',vrRgbEditing=false,vrRecoveryDraft='';let vrPage='pond',vrCode='',vrPromo='',vrNameDraft='',vrNameEditing=false,vrLast=-100,vrZones=[],vrPanel=null,vrTutorialStep=0,vrShopPage=0;
const frogyVrBrand=new Image();frogyVrBrand.onload=()=>{vrLast=-100;};frogyVrBrand.onerror=()=>{vrLast=-100;};frogyVrBrand.src='/branding/frogy-logo.png';
function vrRect(x,y,w,h,fill,stroke=null,r=16){vc.beginPath();vc.roundRect(x,y,w,h,r);vc.fillStyle=fill;vc.fill();if(stroke){vc.strokeStyle=stroke;vc.lineWidth=2;vc.stroke();}}
function vrText(s,x,y,size=30,color='#edffee',align='left',weight=700){vc.fillStyle=color;vc.font=weight+' '+size+'px system-ui, sans-serif';vc.textAlign=align;vc.fillText(String(s),x,y,Math.max(28,align==='center'?Math.min(x,1024-x)*2-36:align==='right'?x-34:1024-x-40));vc.textAlign='left';}
function vrBtn(label,x,y,w,h,fn,selected=false){vrRect(x,y,w,h,selected?'#bafa9a':'#204958',selected?'#d7ffcf':'#80b09d',13);vc.save();vc.beginPath();vc.rect(x+6,y+4,w-12,h-8);vc.clip();vrText(label,x+w/2,y+h/2+9,Math.min(26,Math.max(15,(w-25)/Math.max(6,label.length)*1.55)),selected?'#193d35':'#eaffef','center',750);vc.restore();vrZones.push({x,y,w,h,fn});}
function redrawVRPanel(t){if(t-vrLast<.12)return;vrLast=t;vrZones=[];vc.fillStyle='#0a1a2b';vc.fillRect(0,0,1024,768);vrRect(12,12,1000,744,'#193846','#bdffa4',30);if(frogyVrBrand.complete&&frogyVrBrand.naturalWidth){vc.drawImage(frogyVrBrand,44,17,171,91);}else{vrText('FROGY',46,65,41,'#c5ffa3');}vrText('RIBBITRON 3000 · v15.4',242,65,28,'#c5ffa3');vrText('🦗'+(profile.crickets??profile.coins)+'  🏴'+(profile.dabloons||0), 975,63,27,'#ffe596','right');
 if(vrMenuOpen&&phase==='playing')vrBtn('✕ CLOSE',790,17,196,68,()=>{vrMenuOpen=false;vrPanel=null;vrLast=-1;});
const tabs=phase==='playing'?[
  ['pond','WAITING'],['name','NAME'],['inventory','INVENTORY'],['quests','QUESTS'],['people','PLAYERS'],['friends','FRIENDS'],['codes','CODES'],['settings','SETTINGS'],['account','ACCOUNT'],['tutorial','HELP']
 ]:[
  ['pond','POND'],['name','NAME'],['shop','COSMETICS'],['tools','TOOLS'],['closet','DRESS UP'],['terminal','ROOM PC'],
  ['inventory','INVENTORY'],['quests','QUESTS'],['people','PLAYERS'],['friends','FRIENDS'],['codes','CODES'],['settings','SETTINGS'],['account','ACCOUNT'],['tutorial','HELP']
 ];
 // Seven tabs per row keeps Profile/Name on TWO rows: prevents overlap with menu content.
 for(const [i,[tab,label]] of tabs.entries()){
  const row=Math.floor(i/7),col=i%7;
  vrBtn(label,31+col*139,101+row*63,130,55,()=>{vrPage=tab;if(tab==='name'){vrNameDraft=profile.name||chosenName;vrNameEditing=false;}if(tab==='closet'){vrRgbDraft=rgbFromProfile().join('');vrRgbEditing=false;}vrLast=-1;},vrPage===tab);
 }
 if(vrPage==='tutorial'){
  const cards=[
   ['1 / 4  MOVE WITH YOUR HANDS','Gently press a paw down or against a wall.','Sweep your real hand BACK to move FORWARD.','Lower both hands for physical contact. Lift to reset.'],
   ['2 / 4  JUMP AND INTERACT','Tap RIGHT A to jump while moving.','Hold GRIP to grab weapons or fallen pieces.','Tap RIGHT B to grapple a wall, tree, platform or ground up to 38m away.'],
   ['3 / 4  WALL STICKING','Hold a TRIGGER while touching a solid wall to cling.','One paw sticks for 4.5 sec; both for 7.6 sec.','Release to fall; B shoots a short-lived tongue tether.'],
   ['4 / 4  YOUR MENU AND LOBBY','Tap LEFT X once to open the menu; again to close.','Use your TRIGGER to click buttons.','Enable VOICE in POND to talk; allow mic access.']
  ];
  const c=cards[vrTutorialStep];
  vrText('QUICK FROGY TUTORIAL',52,268,39,'#d5ffae');
  vrText(c[0],54,351,32,'#ffe8a5');
  vrRect(48,381,925,216,'#0b2a32','#5c9d85',20);
  vrText(c[1],74,440,27,'#f1fbee');vrText(c[2],74,503,27,'#f1fbee');vrText(c[3],74,565,27,'#f1fbee');
  vrBtn('BACK',52,633,266,91,()=>{vrTutorialStep=(vrTutorialStep+3)%4;vrLast=-1;});
  vrBtn(vrTutorialStep===3?'DONE - GO TO LOBBY':'NEXT',338,633,632,91,()=>{if(vrTutorialStep===3){vrPage='pond';vrTutorialStep=0;try{localStorage.setItem('frogy-help-v8','1');}catch{}}else vrTutorialStep++;vrLast=-1;});
 }else if(vrPage==='pond'&&phase==='playing'){

  vrText(me?.spectating?'YOU ARE WAITING FOR THE NEXT ROUND':'LEAVE THE ACTIVE ROUND?',52,276,39,'#ffefbb');
  vrText(me?.spectating?'You can watch or adjust your Settings.':'You cannot rejoin this match after leaving.',52,350,27,'#e7f1ea');
  if(me?.spectating)vrText('Returning to the arena at the start of the next round.',52,400,26,'#bdffa4');
  else vrBtn('RETURN TO WAITING LOBBY',75,402,872,100,()=>{send({type:'sitOut'});vrLast=-1;},false);
  vrBtn('OPEN SETTINGS',74,562,874,88,()=>{vrPage='settings';vrLast=-1;});
  vrText('Shop, colors and outfits unlock between matches.',55,714,24,'#9cbfb8');
 }else if(vrPage==='pond'&&!room){
  vrText('WELCOME TO THE LILY PAD!',50,280,44,'#d9ffa6');
  vrText('Join public matchmaking or friends by code.',50,354,31,'#ebf8eb');
  vrBtn('PLAY PUBLIC / AUTO MATCH',62,397,900,81,()=>{send({type:'public',name:chosenName,color:profile.color});vrLast=-1;});
  vrBtn('CREATE PRIVATE LOBBY',62,497,900,81,()=>{send({type:'create',name:chosenName,color:profile.color});vrLast=-1;});
  vrBtn('JOIN FRIEND BY ROOM CODE',62,597,900,81,()=>{vrPage='terminal';vrLast=-1;});
  vrText(trackingWarning||'PUSH YOUR HANDS TO MOVE · A TO JUMP · LEFT X MENU',50,700,22,trackingWarning?'#ffcf93':'#a8cdc1');
 }else if(vrPage==='pond'){
  vrText((selectedVisibility==='public'?'PUBLIC MATCH · ':'PRIVATE ROOM · ')+(room||'-----'),50,275,43,'#d9ffa6');vrText('Frogs '+all.length+'/8  ·  '+(phase==='countdown'?'NEXT ROUND IN '+remaining+'s':phase==='intermission'?'NEXT ROUND IN ~'+(remaining+16)+'s':'WAITING FOR FROGS'),51,327,29,'#ebf8eb');
  if(selectedVisibility==='private'&&all.length===1)vrText('ALONE? Open CODES and redeem NPC for solo practice.',53,370,21,'#eeffb7');
  vrText('VOTE FOR NEXT MAP',50,393,31,'#fff0b1');
  for(let i=0;i<3;i++){const names=['🌲 ROTWOOD SWAMP','🪦 GRAVEBELL','☣ HOLLOW CREEK'];vrBtn(names[i]+' ('+((typeof vrMapVotes!=='undefined'?vrMapVotes[i]:0)||0)+')',50+i*308,425,296,81,()=>{myVote=i;send({type:'vote',index:i});vrLast=-1;},myVote===i);}
  vrBtn(FrogVoice.enabled?(FrogVoice.connected?'🎙️ VOICE CONNECTED · MUTE':'🎙️ MIC ON · WAITING FOR FRIEND'):'🎙️ TALK TO FRIENDS · ENABLE MIC',50,532,924,69,()=>{toggleVoice();vrLast=-1;},FrogVoice.enabled);
  if(selectedVisibility==='public')vrBtn('SERVER HOP',50,628,445,66,()=>{send({type:'publicHop',name:profile.name||chosenName,color:profile.color});vrLast=-1;});
  else if(all.length===1)vrBtn('SOLO TEST · NPC',50,628,445,66,()=>{send({type:'redeemCode',code:'NPC'});vrLast=-1;});
  else vrBtn('PRIVATE ROOM',50,628,445,66,()=>toast('Share your room code with friends.'));
  vrBtn('CREATE PRIVATE ROOM',51,704,434,46,()=>{send({type:'create',name:chosenName,color:profile.color});vrLast=-1;});vrBtn('JOIN CODE',498,704,470,46,()=>{vrPage='terminal';vrLast=-1;});
 }else if(vrPage==='name'){
  vrText('🐸 CHANGE YOUR FROG NAME',49,262,35,'#d7ffa7');
  vrText('Saved to your profile · seen above your frog in multiplayer.',51,306,22,'#d5eade');
  vrRect(52,323,920,68,'#071e2b','#86cdb1',12);vrText(vrNameDraft||'TYPE A NAME',512,370,37,'#fff4bd','center');
  const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM','1234567890'];
  rows.forEach((letters,row)=>{const keyW=80,gap=8,x0=(1024-(letters.length*keyW+(letters.length-1)*gap))/2;for(let i=0;i<letters.length;i++){const ch=letters[i];vrBtn(ch,x0+i*(keyW+gap),408+row*62,keyW,54,()=>{if(!vrNameEditing){vrNameDraft='';vrNameEditing=true;}if(vrNameDraft.length<18)vrNameDraft+=ch;vrLast=-1;});}});
  vrBtn('SPACE',50,661,189,68,()=>{if(vrNameDraft.length<18)vrNameDraft+=' ';vrLast=-1;});
  vrBtn('⌫',247,661,144,68,()=>{vrNameDraft=vrNameDraft.slice(0,-1);vrNameEditing=true;vrLast=-1;});
  vrBtn('CLEAR',400,661,174,68,()=>{vrNameDraft='';vrNameEditing=true;vrLast=-1;});
  vrBtn('SAVE NAME',582,661,389,68,()=>{send({type:'rename',name:vrNameDraft});vrLast=-1;},vrNameDraft.trim().length>=2);
 }else if(vrPage==='shop'){
  vrText('RIBBIT\'S BOUTIQUE · CRICKETS ONLY',48,269,28,'#ffefa3');
  catalog.slice(vrShopPage*8,vrShopPage*8+8).forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=48+col*478,y=298+row*88;const owned=profile.inventory?.includes(item.id),equipped=profile.equipped?.[item.slot]===item.id;vrBtn(item.emoji+' '+item.name+' · '+(equipped?'ON':owned?'WEAR':item.price+'🦗'),x,y,462,67,()=>{if(!owned){shopPending=item.id;send({type:'buy',item:item.id});}else send({type:'equip',slot:item.slot,item:equipped?'none':item.id});vrLast=-1;},equipped);});
  vrBtn('NEXT SHOP PAGE '+(vrShopPage+1)+'/'+Math.max(1,Math.ceil(catalog.length/8)),320,678,380,66,()=>{vrShopPage=(vrShopPage+1)%Math.max(1,Math.ceil(catalog.length/8));vrLast=-1;});
 }else if(vrPage==='closet'){
  vrText('CUSTOM FROG COLOR · TYPE RED / GREEN / BLUE',48,258,29,'#ffe0fb');
  vrText('Each digit must be from 0 to 9. Example: 596',48,296,22,'#d9eee1');
  const digits=vrRgbDraft.padEnd(3,'_');
  vrRect(45,307,730,62,'#0a2431','#88bfa9',12);
  vrText('R   G   B',83,333,21,'#b5d2df');
  vrText(digits.split('').join('   '),409,356,44,'#fff2a2','center');
  if(/^\d{3}$/.test(vrRgbDraft)){
   const [r,g,b]=[...vrRgbDraft].map(Number);const rgb=[r,g,b].map(n=>Math.round(n*255/9));
   vrRect(798,307,169,62,'rgb('+rgb.join(',')+')','#e1ffba',12);
  }
  const keys='1234567890';
  for(let i=0;i<10;i++){
   const col=i%5,row=Math.floor(i/5),x=49+col*189,y=387+row*70;
   vrBtn(keys[i],x,y,175,62,()=>{
    if(!vrRgbEditing){vrRgbDraft='';vrRgbEditing=true;}
    if(vrRgbDraft.length<3)vrRgbDraft+=keys[i];
    colorMessage='';vrLast=-1;
   });
  }
  vrBtn('⌫ BACK',49,539,243,71,()=>{vrRgbEditing=true;vrRgbDraft=vrRgbDraft.slice(0,-1);vrLast=-1;});
  vrBtn('CLEAR',305,539,243,71,()=>{vrRgbEditing=true;vrRgbDraft='';vrLast=-1;});
  vrBtn('APPLY '+vrRgbDraft.padEnd(3,'_'),562,539,409,71,()=>{
   if(!/^\d{3}$/.test(vrRgbDraft)){toast('Enter exactly 3 digits, red green blue.');return;}
   if(ws?.readyState!==WebSocket.OPEN){toast('Reconnect before saving your color.');return;}
   colorMessage='Saving RGB '+vrRgbDraft+'...';colorMessageUntil=performance.now()+6500;
   send({type:'color',color:'rgb-'+vrRgbDraft});vrLast=-1;
  },/^\d{3}$/.test(vrRgbDraft));
  if(colorMessage&&performance.now()<colorMessageUntil)vrText(colorMessage.slice(0,80),54,644,22,'#d7ffb0');
  for(const [i,slot] of ['hat','face','back'].entries()){
   const id=profile.equipped?.[slot]||'none',name=itemById(id)?.name||'NONE';
   vrBtn(slot.toUpperCase()+' · '+name,50+i*317,659,304,78,()=>{cycleSlot(slot);vrLast=-1;});
  }
 }else if(vrPage==='tools'){
  vrText('🛠️ ONE-ROUND TOOLS · BUY WITH DABLOONS',48,249,29,'#e4ffa4');
  (profile.toolCatalog||[]).forEach((item,i)=>{
   const y=267+i*83,owned=profile.tools?.[item.id]||0;
   vrText(item.name+' · '+item.role.toUpperCase()+' · OWN '+owned,61,y+23,23,'#efffee');
   vrBtn('BUY '+item.price+' 🏴',675,y,298,61,()=>{send({type:'buyTool',item:item.id});vrLast=-1;});
  });
  vrText('Tools stay in your inventory until you activate them.',50,726,23,'#a8cdb9');
 }else if(vrPage==='inventory'){
  vrText('🎒 INVENTORY · UNUSED TOOLS LAST ACROSS DAYS',48,251,27,'#ebffaf');
  for(const [i,item] of (profile.toolCatalog||[]).entries()){
   const y=270+i*81,count=profile.tools?.[item.id]||0;
   vrText(item.name+'  ×'+count,60,y+35,26,'#e9f7e8');
   const usable=phase==='playing'&&!!me?.alive&&!me?.spectating&&(me?.monster?'monster':'survivor')===item.role&&count>0&&!me?.activeTools?.[item.id];
   vrBtn(usable?'ACTIVATE':'NOT READY',678,y,295,66,()=>{if(usable)send({type:'activateTool',item:item.id});else toast('You can only activate an owned tool during a round as the correct role.');vrLast=-1;},usable);
  }
  vrText('Each tool is consumed when activated, and ends after the round.',50,731,22,'#b4d4b0');
 }else if(vrPage==='quests'){
  vrText('📜 THREE DAILY QUESTS · RESET AT MIDNIGHT EASTERN',48,254,28,'#ebffaf');
  (profile.quests||[]).forEach((q,i)=>{
   const y=290+i*130;
   vrRect(48,y,927,114,'#0b3038','#53857c',12);
   vrText((q.claimed?'✓ ':'')+q.name,66,y+37,30,'#d3ffb1');
   vrText(q.description,66,y+75,23,'#d9ece4');
   vrText(q.progress+'/'+q.target+'   '+(q.claimed?'CLAIMED':'+'+q.reward+' DABLOONS'),945,y+93,24,'#fff2aa','right');
  });
  vrText('Complete challenges during real multiplayer rounds.',50,732,23,'#a8cdb9');
 }else if(vrPage==='people'){
  vrText('👥 PLAYERS IN LOBBY · MUTE · FRIEND · REPORT',48,248,27,'#ebffaf');
  if(vrReportTarget){
   const target=all.find(p=>p.id===vrReportTarget);
   vrText('REPORT '+(target?.name||'PLAYER')+' FOR:',50,313,28,'#ffd6be');
   ['Harassment','Cheating','Offensive name','Other'].forEach((reason,i)=>{
    vrBtn(reason,55+(i%2)*460,346+Math.floor(i/2)*96,445,78,()=>{send({type:'reportPlayer',playerId:vrReportTarget,reason});vrReportTarget='';vrLast=-1;});
   });
   vrBtn('CANCEL REPORT',73,562,864,76,()=>{vrReportTarget='';vrLast=-1;});
  }else{
   const peers=all.filter(x=>x.id!==clientId),pages=Math.max(1,Math.ceil(peers.length/5));vrPeoplePage%=pages;
   peers.slice(vrPeoplePage*5,vrPeoplePage*5+5).forEach((p,i)=>{
    const y=262+i*77;
    vrText(p.name.slice(0,14),55,y+37,25,'#e6ffe8');
    vrBtn(FrogVoice.isMuted(p.id)?'UNMUTE':'MUTE',300,y,150,63,()=>{FrogVoice.setMuted(p.id,!FrogVoice.isMuted(p.id));vrLast=-1;},FrogVoice.isMuted(p.id));
    vrBtn('FRIEND',458,y,148,63,()=>{send({type:'friendRequest',publicId:p.publicId});vrLast=-1;});
    vrBtn('REPORT',614,y,profile.canModerate?151:352,63,()=>{vrReportTarget=p.id;vrLast=-1;});
    if(profile.canModerate)vrBtn('KICK',773,y,195,63,()=>{send({type:'kickPlayer',playerId:p.id});vrLast=-1;});
   });
   vrBtn('NEXT PAGE '+(vrPeoplePage+1)+'/'+pages,275,676,472,69,()=>{vrPeoplePage=(vrPeoplePage+1)%pages;vrLast=-1;});
  }
 }else if(vrPage==='friends'){
  vrText('💚 FRIENDS · BOTH PLAYERS MUST REQUEST',48,250,28,'#b5ffa5');
  vrText('YOUR FRIEND ID: '+(social.publicId||profile.publicId||'LOADING'),50,304,24,'#cee9dc');
  const peers=[...(social.incoming||[]).map(x=>({...x,request:true})),...(social.friends||[])];
  const pages=Math.max(1,Math.ceil(peers.length/4));vrFriendsPage%=pages;
  peers.slice(vrFriendsPage*4,vrFriendsPage*4+4).forEach((f,i)=>{
   const y=329+i*89;
   vrText((f.request?'REQUEST: ':'')+(f.name||'Frog').slice(0,16),55,y+34,26,'#e5ffe7');
   vrText(f.request?'REPLY TO BECOME FRIENDS':(f.online?'ONLINE':'OFFLINE'),440,y+39,20,f.online?'#b9ffba':'#b8b9bf');
   vrBtn(f.request?'FRIEND BACK':f.online?'JOIN FRIEND':'OFFLINE',665,y,300,66,()=>{if(f.request)send({type:'friendRequest',publicId:f.id});else if(f.online)send({type:'friendJoin',publicId:f.id});vrLast=-1;},f.online||f.request);
  });
  vrBtn('NEXT PAGE '+(vrFriendsPage+1)+'/'+pages,274,690,474,62,()=>{vrFriendsPage=(vrFriendsPage+1)%pages;vrLast=-1;});
 }else if(vrPage==='settings'){
  vrText('SETTINGS · COMFORT + AUDIO',46,263,29,'#ddffcd');
  const st=FrogySettings.state;
  const toggles=[['MUSIC','music'],['SFX','sfx'],['MUTE ALL VOICES','voiceMuted'],['JOYSTICK TURN','joystickTurning'],['COMFORT','comfortVignette'],['COMBAT FX','effects']];
  toggles.forEach(([name,key],i)=>{const col=i%2,row=Math.floor(i/2);vrBtn(name+' '+(st[key]?'ON ✓':'OFF ✕'),43+col*476,281+row*72,456,63,()=>{FrogySettings.set(key,!FrogySettings.state[key]);vrLast=-1;},st[key]);});
  const speeds=[.9,1.1,1.3,1.5,1.7];
  vrBtn('PUSH '+Math.round(st.armPower*100)+'%',43,506,224,63,()=>{const i=speeds.findIndex(n=>Math.abs(n-st.armPower)<.01);FrogySettings.set('armPower',speeds[(i+1)%speeds.length]);vrLast=-1;});
  const reaches=[.90,1.05,1.20,1.30,1.38];
  vrBtn('REACH '+Math.round(st.reachScale*100)+'%',275,506,224,63,()=>{const i=reaches.findIndex(n=>Math.abs(n-st.reachScale)<.01);FrogySettings.set('reachScale',reaches[(i+1)%reaches.length]);pawContacts={};vrLast=-1;});
  vrBtn('TURN: '+st.turnMode.toUpperCase(),506,506,224,63,()=>{FrogySettings.set('turnMode',st.turnMode==='snap'?'smooth':'snap');vrLast=-1;});
  vrBtn('VOLUME '+st.volume+'%',738,506,238,63,()=>{FrogySettings.set('volume',(st.volume+20)%120);vrLast=-1;});
  vrBtn('MUSIC LEVEL '+st.musicVolume+'%',43,579,455,63,()=>{FrogySettings.set('musicVolume',(st.musicVolume+10)%61);vrLast=-1;});
  vrBtn('ROTATE MUSIC '+(st.musicCycle?'ON':'OFF'),506,579,470,63,()=>{FrogySettings.set('musicCycle',!st.musicCycle);vrLast=-1;},st.musicCycle);
  vrRect(43,661,933,79,'#0c3036','#4a766f',11);
  vrText('Mute one player at a time in the PLAYERS tab.',60,697,24,'#e5ffe1');
  vrText(trackingWarning||'Music plays quietly and pauses between tracks.',60,725,20,trackingWarning?'#ffcf93':'#a8cdc1');
 }else if(vrPage==='account'){
  vrText('ACCOUNT · KEEP YOUR FROG FOREVER',48,250,29,'#d6ffba');
  vrText('Player ID: '+(profile.publicId||'loading'),49,287,23,'#d7e9e1');
  vrText(profile.saveMode==='postgres'?'DATABASE SAVING ✓':'WARNING: TEMPORARY STORAGE',968,287,20,profile.saveMode==='postgres'?'#baffb2':'#ffc48b','right');
  vrText(accountRecoveryCode?'SAVE THIS CODE PRIVATELY:':'Your code is hidden until you generate a new backup.',49,320,22,'#ffef9e');
  if(accountRecoveryCode)vrText(accountRecoveryCode,512,356,35,'#ffffff','center');
  vrBtn('GENERATE A NEW BACKUP CODE',49,365,923,53,()=>{send({type:'createRecoveryCode'});vrLast=-1;});
  vrText('RESTORE: Enter the 16 characters AFTER FROG-',50,445,21,'#d4efe4');
  vrRect(48,459,927,53,'#071e2b','#78ae8d',12);
  vrText(vrRecoveryDraft.padEnd(16,'_'),512,495,31,'#ffed99','center');
  const rows=['1234567890','QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  rows.forEach((letters,row)=>{const kw=82,gap=8,x0=(1024-(letters.length*kw+(letters.length-1)*gap))/2;for(let i=0;i<letters.length;i++)vrBtn(letters[i],x0+i*(kw+gap),520+row*47,kw,42,()=>{if(vrRecoveryDraft.length<16)vrRecoveryDraft+=letters[i];vrLast=-1;});});
  vrBtn('⌫',49,713,156,40,()=>{vrRecoveryDraft=vrRecoveryDraft.slice(0,-1);vrLast=-1;});
  vrBtn('CLEAR',214,713,155,40,()=>{vrRecoveryDraft='';vrLast=-1;});
  vrBtn('RESTORE ACCOUNT',386,713,588,40,()=>{if(vrRecoveryDraft.length===16)send({type:'recoverProfile',code:'FROG'+vrRecoveryDraft});vrLast=-1;},vrRecoveryDraft.length===16);
 }else if(vrPage==='codes'){
  vrText('FROGY · REDEEM A PROMO CODE',50,251,31,'#daffb3');
  vrText('Enter your code below. Valid rewards appear when redeemed.',53,291,23,'#d7e9e1');
  vrRect(50,308,924,69,'#071e2b','#78ae8d',12);
  vrText(vrPromo.padEnd(5,'_'),512,355,47,'#fff1aa','center');
  const keyboard=['1234567890','QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  keyboard.forEach((letters,row)=>{const w=84,gap=7,x0=(1024-(letters.length*w+(letters.length-1)*gap))/2;for(let i=0;i<letters.length;i++){const ch=letters[i];vrBtn(ch,x0+i*(w+gap),385+row*65,w,57,()=>{if(vrPromo.length<8)vrPromo+=ch;vrLast=-1;});}});
  vrBtn('⌫ BACK',52,666,251,69,()=>{vrPromo=vrPromo.slice(0,-1);vrLast=-1;});
  vrBtn('CLEAR',319,666,240,69,()=>{vrPromo='';vrLast=-1;});
  vrBtn('REDEEM',578,666,395,69,()=>{if(vrPromo.length>=3){send({type:'redeemCode',code:vrPromo});}else toast('Enter a code.');vrLast=-1;},vrPromo.length>=3);
  vrText('NPC: spawn an idle frog in your solo PRIVATE room.',52,649,20,'#b4caba');
 }else if(vrPage==='terminal'){
  vrText('ROOM: '+(room||'NOT JOINED')+'  ·  ENTER A FRIEND CODE',50,253,28,'#bcffbc');vrRect(50,290,925,60,'#081825','#71baaf',12);vrText(vrCode.padEnd(5,'_'),512,332,47,'#f8e7a5','center');
  const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM','1234567890'];for(let row=0;row<rows.length;row++){const letters=rows[row],keyW=86,gap=7,start=(1024-(letters.length*keyW+(letters.length-1)*gap))/2;for(let i=0;i<letters.length;i++){const ch=letters[i],x=start+i*(keyW+gap),y=354+row*68;vrBtn(ch,x,y,keyW,59,()=>{if(vrCode.length<5)vrCode+=ch;vrLast=-1;});}}
  if(roomMessage&&performance.now()<roomMessageUntil)vrText(roomMessage.slice(0,72),512,748,20,'#e2f8b5','center');vrBtn('⌫',51,644,174,75,()=>{vrCode=vrCode.slice(0,-1);vrLast=-1;});vrBtn('CLEAR',237,644,174,75,()=>{vrCode='';vrLast=-1;});vrBtn('CREATE',423,644,202,75,()=>{send({type:'create',name:chosenName,color:profile.color});roomMessage='Creating private room...';roomMessageUntil=performance.now()+7000;vrLast=-1;});vrBtn('JOIN '+vrCode,638,644,337,75,()=>{if(vrCode.length===5){send({type:'join',code:vrCode,name:chosenName,color:profile.color});roomMessage='Joining '+vrCode+'...';roomMessageUntil=performance.now()+7000;vrLast=-1;}else toast('Enter 5 letters first!');},vrCode.length===5);
 }
 if(promoAnimation&&performance.now()<promoAnimation.until){
  const age=(performance.now()-promoAnimation.started)/1000,fade=clamp((promoAnimation.until-performance.now())/600,0,1);
  vc.save();vc.globalAlpha=fade;vrRect(116,345,792,128,promoAnimation.ok?'#194d32':'#48232b',promoAnimation.ok?'#dcff81':'#ffb3af',25);
  vrText(promoAnimation.ok?'CODE REDEEMED!':'CODE NOT REDEEMED',512,397,37,promoAnimation.ok?'#c5ff92':'#ffced0','center');
  vrText(String(promoAnimation.message||'').slice(0,58),512,442,24,'#ffffff','center');
  if(promoAnimation.ok){for(let i=0;i<28;i++){const a=i*2.3999,x=512+Math.cos(a)*(158+age*185),y=396+Math.sin(a*1.7)*(52+age*55);vc.fillStyle=i%3===0?'#e8ff62':i%3===1?'#9dffd4':'#ffe7a5';vc.fillRect(x,y,8+((i*3)%6),8+((i*5)%7));}}
  vc.restore();
 }
 gl.bindTexture(gl.TEXTURE_2D,vTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,vCanvas);
}
let vrMapVotes=[0,0,0];
function drawVRMenu(t,head){redrawVRPanel(t);
 if(!vrPanel){const f=Math.hypot(head.forward[0],head.forward[2])>.2?norm([head.forward[0],0,head.forward[2]]):[0,0,-1],yaw=Math.atan2(-f[0],-f[2]),center=[head.x+f[0]*1.55,head.y+.03,head.z+f[2]*1.55];vrPanel={center,normal:[Math.sin(yaw),0,Math.cos(yaw)],right:[Math.cos(yaw),0,-Math.sin(yaw)],w:1.87,h:1.40,yaw};}
 const {center,yaw}=vrPanel;
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);gl.uniformMatrix4fv(tp.m,false,mat(center[0],center[1],center[2],vrPanel.w,vrPanel.h,1,yaw));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,vTexture);gl.uniform1i(tp.tex,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);
}
function menuHit(origin,d){if(!vrPanel)return null;const {center,normal,right,w,h}=vrPanel,den=dot(d,normal);if(Math.abs(den)<.0001)return null;const q=center.map((v,i)=>v-origin[i]),t=dot(q,normal)/den;if(t<.03||t>5)return null;const hit=origin.map((v,i)=>v+d[i]*t),delta=hit.map((v,i)=>v-center[i]),x=(.5+dot(delta,right)/w)*1024,y=(.5-delta[1]/h)*768;if(x<0||x>1024||y<0||y>768)return null;return {x,y,point:hit};}
function clickVRMenu(o,d){const hit=menuHit(o,d);if(!hit)return;const z=vrZones.find(z=>hit.x>=z.x&&hit.x<=z.x+z.w&&hit.y>=z.y&&hit.y<=z.y+z.h);if(z){z.fn();sound(0);}}
function drawVRLaser(){const ray=vrInput.right?.ray||vrInput.left?.ray;if(!ray)return;const hit=menuHit(ray.o,ray.d),end=hit?.point||ray.o.map((n,i)=>n+ray.d[i]*3);lines([...ray.o,...end],[.68,1,.77,.92]);if(hit){ball(...hit.point,.015,.015,.015,[1,.87,.5],.3);}}
// Stand-alone, large target map-vote board, outside the floating X menu.
const voteCanvas=document.createElement('canvas');voteCanvas.width=768;voteCanvas.height=500;
const voteCtx=voteCanvas.getContext('2d'),voteTex=gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D,voteTex);
for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
let voteBoardLast=-1;
function drawWorldVoteBoard(t){
 if(!session||!room||!isHub())return;
 const q=FrogyVote.board;
 // Board posts, carved trim and a small torch make it visibly a world object.
 for(const side of [-1,1]){
  block(q.x+side*1.96,1.40,q.z+.1,.09,1.36,.11,[.23,.18,.13]);
  ball(q.x+side*1.95,2.70,q.z+.16,.10,.18,.10,[.83,.58,.24],.21);
 }
 if(t-voteBoardLast>.35||voteBoardLast<0){voteBoardLast=t;
  voteCtx.fillStyle='#0b2424';voteCtx.fillRect(0,0,768,500);
  voteCtx.strokeStyle='#c4ae68';voteCtx.lineWidth=12;voteCtx.strokeRect(8,8,752,484);
  voteCtx.fillStyle='#d9f6b0';voteCtx.textAlign='center';voteCtx.font='bold 48px system-ui';voteCtx.fillText('VOTE FOR THE NEXT MAP',384,78,730);
  const labels=['ROTWOOD SWAMP','GRAVEBELL CEMETERY','HOLLOW CREEK FACILITY'];
  labels.forEach((label,i)=>{const y=139+i*111;
   voteCtx.fillStyle=myVote===i?'#3c7155':'#244346';voteCtx.fillRect(76,y,616,93);
   voteCtx.strokeStyle=myVote===i?'#cdf99d':'#77988b';voteCtx.lineWidth=4;voteCtx.strokeRect(76,y,616,93);
   voteCtx.fillStyle='#f0f8de';voteCtx.font='bold 32px system-ui';voteCtx.fillText(label,320,y+52,460);
   voteCtx.fillStyle='#fff0ae';voteCtx.font='bold 34px system-ui';voteCtx.fillText(String(vrMapVotes[i]||0),653,y+52,55);
  });
  gl.bindTexture(gl.TEXTURE_2D,voteTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,voteCanvas);
 }
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 gl.useProgram(tp.p);gl.uniformMatrix4fv(tp.pM,false,P);gl.uniformMatrix4fv(tp.v,false,V);
 gl.uniformMatrix4fv(tp.m,false,mat(q.x,q.y,q.z,q.width,q.height,1,0));
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,voteTex);gl.uniform1i(tp.tex,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,quadV);gl.enableVertexAttribArray(tp.a);gl.vertexAttribPointer(tp.a,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,quadUV);gl.enableVertexAttribArray(tp.uv);gl.vertexAttribPointer(tp.uv,2,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quadI);gl.disable(gl.CULL_FACE);
 gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);
}
function clickWorldVote(o,d){if(!isHub()||!room)return false;
 const hit=FrogyVote.hit(o,d);if(!hit)return false;
 const choice=FrogyVote.selection(hit.u,hit.v);
 if(choice<0)return false;
 myVote=choice;send({type:'vote',index:choice});voteBoardLast=-1;FrogyAudio.play('select');toast('VOTED: '+['ROTWOOD','GRAVEBELL','HOLLOW CREEK'][choice]);return true;
}
// Refresh map vote totals at the same update cadence as the game's state packets.
const _updateState=updateState;
updateState=function(s){vrMapVotes=s.votes||[0,0,0];_updateState(s);if(activeTab==='settings'||!$('#desktopSettings').classList.contains('hidden'))renderSettings();vrLast=-1;};
// Welcome window room code can also be typed as a normal keyboard shortcut.
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&activeTab!=='pond'&&phase!=='playing')setTab('pond');});
setTab('pond');renderShop();renderCloset();renderSettings();renderSocialMenus();syncVoiceButtons();FrogVoice.setAllMuted(FrogySettings.state.voiceMuted);
