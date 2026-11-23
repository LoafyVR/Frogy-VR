'use strict';
/* Original procedural horror soundtrack and positional sound effects. No third-party sound files. */
const FrogyAudio=(()=>{
 let ctx=null,master=null,fxBus=null,ambienceBus=null,noise=null,enabled=true,map=0,fear=0,heartbeatAt=0,ambientTimer=null;
 let lastSounds=new Map();
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function ensure(){
  if(!enabled)return false;
  if(!ctx){
   const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return false;
   ctx=new AudioContext();master=ctx.createGain();master.gain.value=.48;master.connect(ctx.destination);
   fxBus=ctx.createGain();fxBus.gain.value=.55;fxBus.connect(master);
   ambienceBus=ctx.createGain();ambienceBus.gain.value=.26;ambienceBus.connect(master);
   noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
   const a=noise.getChannelData(0);let x=2134343;for(let i=0;i<a.length;i++){x=(Math.imul(x,1664525)+1013904223)|0;a[i]=(x>>>0)/2147483647-1;}
   ambientTimer=setInterval(scheduleAmbience,3300);scheduleAmbience();
  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});return true;
 }
 function envelope(node,t,level,attack=.006,decay=.2){node.gain.setValueAtTime(.0001,t);node.gain.exponentialRampToValueAtTime(Math.max(level,.0001),t+attack);node.gain.exponentialRampToValueAtTime(.0001,t+attack+decay);}
 function route(bus,opt){if(!opt?.position||!opt?.listener||!ctx)return bus;
  const dx=opt.position.x-opt.listener.x,dz=opt.position.z-opt.listener.z,dy=(opt.position.y||0)-(opt.listener.y||0),d=Math.hypot(dx,dy,dz),gain=ctx.createGain();gain.gain.value=clamp((1-d/38)**1.6,.025,1);gain.connect(bus);return gain;
 }
 function tone(f0,f1,dur,gain=.16,type='sine',opt={},delay=0){if(!ensure())return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain(),out=route(opt.bus||fxBus,opt);o.type=type;o.frequency.setValueAtTime(Math.max(f0,4),t);o.frequency.exponentialRampToValueAtTime(Math.max(f1,4),t+dur);envelope(g,t,gain,.007,dur);o.connect(g).connect(out);o.start(t);o.stop(t+dur+.04);}
 function hiss(duration=.25,amp=.2,filter=650,opt={},delay=0){if(!ensure())return;const t=ctx.currentTime+delay,src=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noise;bp.type='lowpass';bp.frequency.value=filter;envelope(g,t,amp,.018,duration);src.connect(bp).connect(g).connect(route(opt.bus||fxBus,opt));src.start(t,Math.random());src.stop(t+duration+.07);}
 function play(kind,opt={}){
  if(!ensure())return;
  const t=performance.now(),last=lastSounds.get(kind)||0;if(t-last<(kind==='step'?180:kind==='ui'?40:65))return;lastSounds.set(kind,t);
  if(kind==='ui'){tone(720,480,.047,.05,'triangle',opt);tone(940,780,.04,.035,'sine',opt,.03);}
  else if(kind==='select'){tone(420,650,.12,.075,'triangle',opt);tone(830,1120,.07,.035,'sine',opt,.08);}
  else if(kind==='error'){tone(170,93,.25,.14,'sawtooth',opt);hiss(.12,.04,360,opt);}
  else if(kind==='coin'){[540,720,930].forEach((f,i)=>tone(f,f*1.03,.16,.12,'triangle',opt,i*.10));}
  else if(kind==='grab'){tone(380,690,.16,.10,'triangle',opt);hiss(.12,.06,1600,opt);}
  else if(kind==='drop'){tone(230,70,.19,.13,'triangle',opt);hiss(.12,.10,350,opt);}
  else if(kind==='jump'){tone(310,600,.13,.07,'sine',opt);}
  else if(kind==='step'){hiss(.085,.065,470,opt);tone(87,55,.10,.07,'triangle',opt);}
  else if(kind==='blade'){hiss(.21,.23,3000,opt);tone(490,790,.17,.09,'sawtooth',opt);}
  else if(kind==='shot'){tone(760,95,.21,.24,'sawtooth',opt);hiss(.31,.20,2200,opt);tone(160,55,.32,.15,'triangle',opt);}
  else if(kind==='hit'){tone(130,49,.25,.17,'sawtooth',opt);hiss(.19,.16,430,opt);}
  else if(kind==='squelch'){tone(110,37,.52,.22,'sawtooth',opt);tone(340,65,.33,.07,'triangle',opt,.07);hiss(.58,.27,840,opt,.05);}
  else if(kind==='rip'){hiss(.84,.33,950,opt);tone(180,35,.71,.26,'sawtooth',opt);tone(420,120,.33,.08,'square',opt,.24);}
  else if(kind==='chomp'){tone(130,42,.26,.25,'square',opt);hiss(.35,.21,520,opt,.06);}
  else if(kind==='roar'){tone(96,37,.92,.28,'sawtooth',opt);tone(47,31,1.2,.18,'square',opt);hiss(.75,.10,1300,opt);}
  else if(kind==='death'){tone(230,26,1.2,.23,'sawtooth',opt);hiss(1.05,.26,880,opt);}
  else if(kind==='round'){[120,103,86].forEach((f,i)=>tone(f,f*.62,.72,.13,'sawtooth',opt,i*.37));}
  else if(kind==='heartbeat'){tone(66,40,.14,.15,'sine',opt);tone(60,32,.2,.11,'sine',opt,.22);}
  else if(kind==='wind'){hiss(1.6,.07,map===0?480:map===1?600:380,{bus:ambienceBus},.01);}
  else if(kind==='creak'){tone(310,65,.94,.055,'sawtooth',{bus:ambienceBus});hiss(.68,.036,300,{bus:ambienceBus});}
  else if(kind==='metal'){tone(512,120,1.15,.055,'sine',{bus:ambienceBus});tone(731,101,.75,.033,'triangle',{bus:ambienceBus});}
  else if(kind==='frogcall'){tone(340,170,.38,.075,'triangle',{bus:ambienceBus});tone(205,130,.32,.055,'sine',{bus:ambienceBus},.26);}
 }
 function scheduleAmbience(){if(!ctx||!enabled||ctx.state==='suspended'||document.hidden)return;
  const opt={bus:ambienceBus};tone(map===0?49:map===1?41:47,42,3.2,.075,'sawtooth',opt);tone(map===0?72:map===1?61:69,57,3.2,.050,'triangle',opt,.17);
  hiss(3.15,map===0?.057:.04,map===2?330:520,opt);
  if(Math.random()<.68)play(map===2?'metal':map===0?'frogcall':'creak');
  if(fear>.38&&performance.now()-heartbeatAt>1400){heartbeatAt=performance.now();play('heartbeat');}
 }
 function setMap(i){map=i|0;}
 function setFear(x){fear=clamp(x||0,0,1);}
 function toggle(){enabled=!enabled;if(!enabled){master?.gain.setTargetAtTime(0,ctx.currentTime,.04);}else{ensure();master?.gain.setTargetAtTime(.48,ctx.currentTime,.04);}return enabled;}
 return {unlock:ensure,play,setMap,setFear,toggle,get enabled(){return enabled},get active(){return !!ctx}};
})();
window.FrogyAudio=FrogyAudio;
