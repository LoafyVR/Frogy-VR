'use strict';
/* Frogy additions: coin shop, color-changing dressing hut, map voting and in-VR Ribbitron computer. */
FrogVoice.configure({send,getId:()=>clientId});
const COLOR_HEX={mint:'#89ed9c',pink:'#ff9ec3',lilac:'#bc9cff',blue:'#83d9fb',peach:'#ffc28c',lime:'#d7f17e'};
const itemById=id=>catalog.find(c=>c.id===id);
function setTab(t){if(!['pond','shop','closet','terminal','settings'].includes(t))return;activeTab=t;for(const button of document.querySelectorAll('[data-tab]'))button.classList.toggle('selected',button.dataset.tab===t);for(const pane of ['Pond','Shop','Closet','Terminal','Settings'])$('#tab'+pane).classList.toggle('hidden',pane.toLowerCase()!==t);}
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
 const stone=[.13,.15,.16],aged=[.19,.23,.22],metal=[.26,.28,.29],wood=[.24,.17,.13],moss=[.09,.20,.16],fire=[.82,.55,.28];
 // Broad raised foundation and a moss-edged tiled floor (42m walkable span).
 block(0,-.29,0,21.6,.29,21.6,[.095,.115,.112]);
 block(0,-.55,0,22.1,.25,22.1,[.045,.060,.065]);
 for(let i=-19;i<=19;i+=2.8){block(i,.009,0,.028,.012,20.6,[.16,.18,.18]);block(0,.009,i,20.6,.012,.028,[.14,.16,.15]);}
 // Water damaged tiles, cracks, and irregular moss margins, mostly on the edges.
 for(let i=0;i<105;i++){const a=i*2.399,r=10.0+(i%13)*.82,x=Math.sin(a)*r,z=Math.cos(a)*r;
  if(Math.hypot(x-vrPos.x,z-vrPos.z)>30||Math.abs(x)<5&&z>0)continue;
  ball(x,.015,z,.17+(i%5)*.075,.018,.10+(i%3)*.07,i%3?moss:[.13,.18,.17]);}
 // Four clearly visible walls. Doorways are NEGATIVE space, never filled by props.
 for(const z of [-21,21]){
  for(let x=-20;x<=20;x+=5){if(z===21&&Math.abs(x)<4)continue;
   block(x,3.0,z,2.35,2.95,.38,stone);
   if(Math.abs(x)%10<1)block(x,3.0,z,.32,3.15,.55,aged);
  }
  block(0,6.1,z,20.6,.40,.6,metal);
 }
 for(const x of [-21,21]){
  for(let z=-18;z<=18;z+=6){block(x,3.0,z,.36,2.95,2.75,stone);block(x,2.9,z,.57,3.0,.24,aged);}
  block(x,6.05,0,.7,.38,21,metal);
 }
 // Broken iron roof ribs leave atmospheric open skylights. No overhead collisions.
 for(let x=-18;x<=18;x+=6){block(x,6.48,0,.23,.15,20.7,metal);for(const z of [-20,-9,9,20])rod([x,6.4,z],[x+1.3,7.6,z],.10,[.26,.29,.27]);}
 for(const z of [-16,0,16]){block(0,6.48,z,20.9,.12,.20,wood);}
 // Turquoise bioluminescent stains contrasted with warm abandoned industrial lamps.
 for(const [x,z,r] of [[-15,10,2.5],[15,12,2.2],[0,-19,3.1],[-17,-16,2.1],[18,-15,1.8]]){
  ball(x,.02,z,r,.022,r*.68,[.035,.115,.115]);ball(x,.03,z,r*.55,.012,r*.45,[.09,.19,.18],.08);
 }
 for(const [x,z] of [[-17,14],[17,14],[-17,-15],[17,-15]]){
  rod([x,0,z],[x,4.75,z],.17,[.20,.23,.23]);
  block(x,4.85,z,.45,.16,.37,metal);ball(x,4.68,z,.25,.32,.25,fire,.30);
  // Fog-like glow without heavyweight translucent particle stacks.
  ball(x,4.28,z,.52,.015,.52,[.30,.29,.20],.10);
 }
 // Rusted pumping pipes climb the perimeter, away from the playable middle.
 for(const [x,z] of [[-19,-16],[19,-16],[-19,3],[19,3]]){
  rod([x,.15,z],[x,4.5,z],.22,[.28,.30,.28]);
  rod([x,4.5,z],[x*.85,4.8,z],.18,[.32,.35,.33]);
  for(let i=0;i<4;i++)ball(x,1+i*.82,z,.30,.07,.30,[.18,.23,.23]);
 }
 // Visible approach planks and a pair of crooked signs.
 for(let i=0;i<7;i++)block(-3+i,.11,15,.42,.065,1.45,i%2?wood:[.30,.23,.17]);
 for(const side of [-1,1]){rod([side*5.4,.08,14.5],[side*5.4,2.55,14.5],.12,wood);
  block(side*5.4,2.6,14.5,1.0,.28,.16,[.20,.27,.24]);}
 // Decorative lanterns, moss planters and water-damaged benches; walkable path stays open.
 for(const [x,z] of [[-7,11],[7,11],[-7,-1],[7,-1]]){
  block(x,.29,z,1.2,.13,.28,[.20,.17,.14]);for(const dx of [-.88,.88])rod([x+dx,.08,z],[x+dx,.64,z],.075,[.16,.19,.17]);
  ball(x,.03,z+.85,.9,.055,.36,[.045,.16,.12]);for(let k=0;k<6;k++)ball(x+(k-2.5)*.26,.17,z+.85,.09,.27,.09,[.09,.26,.17]);
 }
 // Empty raised platform for other frogs to gather; not blocking stations or doors.
 block(0,.11,1.0,3.5,.11,2.0,[.16,.20,.19]);
 for(let i=0;i<9;i++){const x=-3.0+i*.75;block(x,.25,-2.3,.22,.18,.16,[.15,.21,.20]);}
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
// ——— In-headset 3D floating terminal, with trigger-operated controls and a code keyboard ———
const vCanvas=document.createElement('canvas');vCanvas.width=1024;vCanvas.height=768;const vc=vCanvas.getContext('2d');
const vTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,vTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
let vrPage='pond',vrCode='',vrLast=-100,vrZones=[],vrPanel=null;
const frogyVrBrand=new Image();frogyVrBrand.onload=()=>{vrLast=-100;};frogyVrBrand.onerror=()=>{vrLast=-100;};frogyVrBrand.src='/branding/frogy-logo.png';
function vrRect(x,y,w,h,fill,stroke=null,r=16){vc.beginPath();vc.roundRect(x,y,w,h,r);vc.fillStyle=fill;vc.fill();if(stroke){vc.strokeStyle=stroke;vc.lineWidth=2;vc.stroke();}}
function vrText(s,x,y,size=30,color='#edffee',align='left',weight=700){vc.fillStyle=color;vc.font=weight+' '+size+'px system-ui, sans-serif';vc.textAlign=align;vc.fillText(String(s),x,y);vc.textAlign='left';}
function vrBtn(label,x,y,w,h,fn,selected=false){vrRect(x,y,w,h,selected?'#bafa9a':'#204958',selected?'#d7ffcf':'#80b09d',13);vrText(label,x+w/2,y+h/2+10,Math.min(27,Math.max(16,(w-20)/Math.max(6,label.length)*1.6)),selected?'#193d35':'#eaffef','center',800);vrZones.push({x,y,w,h,fn});}
function redrawVRPanel(t){if(t-vrLast<.12)return;vrLast=t;vrZones=[];vc.fillStyle='#0a1a2b';vc.fillRect(0,0,1024,768);vrRect(12,12,1000,744,'#193846','#bdffa4',30);if(frogyVrBrand.complete&&frogyVrBrand.naturalWidth){vc.drawImage(frogyVrBrand,44,17,171,91);}else{vrText('FROGY',46,65,41,'#c5ffa3');}vrText('RIBBITRON 3000 · v6.4',242,65,28,'#c5ffa3');vrText('🪙 '+profile.coins, vrMenuOpen&&phase==='playing'?740:975,63,30,'#ffe596','right');
 if(vrMenuOpen&&phase==='playing')vrBtn('✕ CLOSE',790,17,196,68,()=>{vrMenuOpen=false;vrLast=-1;});
 if(phase==='playing'){
  if(vrPage!=='pond'&&vrPage!=='settings')vrPage='settings';
  vrBtn('WAITING LOBBY',50,105,442,66,()=>{vrPage='pond';vrLast=-1;},vrPage==='pond');
  vrBtn('SETTINGS',522,105,452,66,()=>{vrPage='settings';vrLast=-1;},vrPage==='settings');
 }else for(const [i,tab] of ['pond','shop','closet','terminal','settings'].entries())vrBtn(['POND','SHOP','DRESS UP','ROOM PC','SETTINGS'][i],43+i*194,100,180,62,()=>{vrPage=tab;vrLast=-1;},vrPage===tab);
 if(vrPage==='pond'&&phase==='playing'){
  vrText(me?.spectating?'YOU ARE WAITING FOR THE NEXT ROUND':'LEAVE THE ACTIVE ROUND?',52,240,39,'#ffefbb');
  vrText(me?.spectating?'You can watch or adjust your Settings.':'You cannot rejoin this match after leaving.',52,322,27,'#e7f1ea');
  if(me?.spectating)vrText('Returning to the arena at the start of the next round.',52,400,26,'#bdffa4');
  else vrBtn('RETURN TO WAITING LOBBY',75,402,872,100,()=>{send({type:'sitOut'});vrLast=-1;},false);
  vrBtn('OPEN SETTINGS',74,562,874,88,()=>{vrPage='settings';vrLast=-1;});
  vrText('Shop, colors, and outfits are unavailable during a round.',55,714,24,'#9cbfb8');
 }else if(vrPage==='pond'&&!room){
  vrText('WELCOME TO THE LILY PAD!',50,239,44,'#d9ffa6');
  vrText('Join public matchmaking or friends by code.',50,313,31,'#ebf8eb');
  vrBtn('PLAY PUBLIC / AUTO MATCH',62,354,900,88,()=>{send({type:'public',name:chosenName,color:profile.color});vrLast=-1;});
  vrBtn('CREATE PRIVATE LOBBY',62,453,900,88,()=>{send({type:'create',name:chosenName,color:profile.color});vrLast=-1;});
  vrBtn('JOIN FRIEND BY ROOM CODE',62,551,900,88,()=>{vrPage='terminal';vrLast=-1;});
  vrText(trackingWarning||'PUSH YOUR HANDS TO MOVE · A TO JUMP · LEFT X MENU',50,700,22,trackingWarning?'#ffcf93':'#a8cdc1');
 }else if(vrPage==='pond'){
  vrText((selectedVisibility==='public'?'PUBLIC MATCH · ':'PRIVATE ROOM · ')+(room||'-----'),50,233,43,'#d9ffa6');vrText('Frogs '+all.length+'/8  ·  '+(phase==='countdown'?'NEXT ROUND IN '+remaining+'s':phase==='intermission'?'NEXT ROUND IN ~'+(remaining+16)+'s':'WAITING FOR FROGS'),51,290,29,'#ebf8eb');
  vrText('VOTE FOR NEXT MAP',50,360,31,'#fff0b1');
  for(let i=0;i<3;i++){const names=['🌲 ROTWOOD SWAMP','🪦 GRAVEBELL','☣ HOLLOW CREEK'];vrBtn(names[i]+' ('+((typeof vrMapVotes!=='undefined'?vrMapVotes[i]:0)||0)+')',50+i*308,391,296,92,()=>{myVote=i;send({type:'vote',index:i});vrLast=-1;},myVote===i);}
  vrBtn(FrogVoice.enabled?'🎙️ VOICE ON · MUTE':'🎙️ ENABLE VOICE (OPT-IN)',50,521,924,75,()=>{toggleVoice();vrLast=-1;},FrogVoice.enabled);
  if(selectedVisibility==='public')vrBtn('SERVER HOP · DIFFERENT PUBLIC ROOM',50,608,924,68,()=>{send({type:'publicHop',name:profile.name||chosenName,color:profile.color});vrLast=-1;},false);
  vrText('TAP LEFT X · MENU STAYS OPEN · A JUMP · ARM PUSH TO MOVE',51,720,23,'#a8cdc1');
 }else if(vrPage==='shop'){
  vrText('RIBBIT\'S BOUTIQUE · BUY WITH DAILY COINS',48,214,28,'#ffefa3');
  catalog.forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=48+col*478,y=238+row*74;const owned=profile.inventory?.includes(item.id),equipped=profile.equipped?.[item.slot]===item.id;vrBtn(item.emoji+' '+item.name+' · '+(equipped?'ON':owned?'WEAR':item.price+'🪙'),x,y,462,67,()=>{if(!owned){shopPending=item.id;send({type:'buy',item:item.id});}else send({type:'equip',slot:item.slot,item:equipped?'none':item.id});vrLast=-1;},equipped);});
 }else if(vrPage==='closet'){
  vrText('CUSTOM FROG COLOR · 0–9 RED / GREEN / BLUE',48,205,30,'#ffe0fb');
  for(const [i,name] of ['RED','GREEN','BLUE'].entries()){const y=243+i*94;vrText(name,60,y+42,27,'#eafbea');vrBtn('−',245,y,110,67,()=>{rgbDigits[i]=Math.max(0,rgbDigits[i]-1);vrLast=-1;});vrText(String(rgbDigits[i]),505,y+47,51,['#fa8791','#9ffba7','#84b6fa'][i],'center');vrBtn('+',660,y,120,67,()=>{rgbDigits[i]=Math.min(9,rgbDigits[i]+1);vrLast=-1;});}
  vrBtn('APPLY RGB '+rgbDigits.join(''),52,533,920,65,()=>{send({type:'color',color:'rgb-'+rgbDigits.join('')});vrLast=-1;});
  for(const [i,slot] of ['hat','face','back'].entries()){const id=profile.equipped?.[slot]||'none',name=itemById(id)?.name||'NONE';vrBtn(slot.toUpperCase()+' · '+name,50+i*317,628,304,90,()=>{cycleSlot(slot);vrLast=-1;});}
 }else if(vrPage==='settings'){
  vrText('⚙️ SETTINGS · PERSONALIZE YOUR VR EXPERIENCE',46,214,30,'#ddffcd');
  const st=FrogySettings.state;
  const toggles=[['MUSIC','music'],['SFX','sfx'],['MUTE ALL VOICES','voiceMuted'],['JOYSTICK TURN','joystickTurning'],['COMFORT','comfortVignette'],['COMBAT FX','effects']];
  toggles.forEach(([name,key],i)=>{const col=i%2,row=Math.floor(i/2);vrBtn(name+' '+(st[key]?'ON ✓':'OFF ✕'),43+col*476,242+row*91,456,73,()=>{FrogySettings.set(key,!FrogySettings.state[key]);vrLast=-1;},st[key]);});
  const speeds=[1.0,1.2,1.4,1.6,1.8];
  vrBtn('PUSH '+Math.round(st.armPower*100)+'%',43,535,224,71,()=>{const i=speeds.findIndex(n=>Math.abs(n-st.armPower)<.01);FrogySettings.set('armPower',speeds[(i+1)%speeds.length]);vrLast=-1;});
  const reaches=[.90,1.05,1.20,1.30,1.38];
  vrBtn('REACH '+Math.round(st.reachScale*100)+'%',275,535,224,71,()=>{const i=reaches.findIndex(n=>Math.abs(n-st.reachScale)<.01);FrogySettings.set('reachScale',reaches[(i+1)%reaches.length]);pawContacts={};vrLast=-1;});
  vrBtn('TURN: '+st.turnMode.toUpperCase(),506,535,224,71,()=>{FrogySettings.set('turnMode',st.turnMode==='snap'?'smooth':'snap');vrLast=-1;});
  vrBtn('VOLUME '+st.volume+'%',738,535,238,71,()=>{FrogySettings.set('volume',(st.volume+20)%120);vrLast=-1;});
  const other=all.filter(p=>p.id!==clientId);vrText('MUTE PLAYERS',50,651,24,'#e4f0df');
  other.slice(0,3).forEach((p,i)=>vrBtn((FrogVoice.isMuted(p.id)?'UNMUTE ':'MUTE ')+p.name.slice(0,9),265+i*236,621,226,62,()=>{FrogVoice.setMuted(p.id,!FrogVoice.isMuted(p.id));vrLast=-1;},FrogVoice.isMuted(p.id)));
  vrText(trackingWarning||'Music and comfort settings are saved on this headset',50,705,21,trackingWarning?'#ffcf93':'#a8cdc1');
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
updateState=function(s){vrMapVotes=s.votes||[0,0,0];_updateState(s);if(activeTab==='settings'||!$('#desktopSettings').classList.contains('hidden'))renderSettings();vrLast=-1;};
// Welcome window room code can also be typed as a normal keyboard shortcut.
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&activeTab!=='pond'&&phase!=='playing')setTab('pond');});
setTab('pond');renderShop();renderCloset();renderSettings();syncVoiceButtons();FrogVoice.setAllMuted(FrogySettings.state.voiceMuted);
