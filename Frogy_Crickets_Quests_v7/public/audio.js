'use strict';
/* Bundled original music and Foley-styled audio. No third-party CDN or licensing dependency. */
const FrogyAudio=(()=>{
 const settings=FrogySettings.state;
 const aliases={ui:'ui_click',select:'ui_confirm',error:'ui_error',squelch:'squelch',frogcall:'wind',metal:'step',creak:'wind'};
 const samples=['ui_click','ui_confirm','ui_error','coin','jump','grab','drop','step','push','blade','shot','hit','rip','squelch','chomp','roar','death','heartbeat','round','wind'];
 let ctx=null,master=null,sfxBus=null,unlocked=false,mode='lobby',map=0,fear=0;
 const buffers=new Map(),fetches=new Map(),last=new Map();
 const tracks={lobby:null,playing:null};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function updateVolume(){if(master&&ctx)master.gain.setTargetAtTime(settings.volume/100*.76,ctx.currentTime,.04);
  if(tracks.lobby)tracks.lobby.volume=(settings.music&&mode!=='playing'?0.53:0)*(settings.volume/100);
  if(tracks.playing)tracks.playing.volume=(settings.music&&mode==='playing'?0.55:0)*(settings.volume/100);
 }
 function ensure(){if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;ctx=new C();master=ctx.createGain();master.connect(ctx.destination);sfxBus=ctx.createGain();sfxBus.connect(master);
  tracks.lobby=new Audio('/sounds/lobby_jazz.ogg');tracks.playing=new Audio('/sounds/horror_ambience.ogg');for(const t of Object.values(tracks)){t.loop=true;t.preload='auto';t.playsInline=true;}
  samples.forEach(k=>loadSample(k));
 }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  unlocked=true;updateVolume();resumeMusic();return true;
 }
 function loadSample(name){if(fetches.has(name))return fetches.get(name);
  const p=fetch('/sounds/'+name+'.ogg').then(r=>{if(!r.ok)throw Error(name+' '+r.status);return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).then(b=>buffers.set(name,b)).catch(e=>console.warn('Audio asset '+name+' unavailable:',e.message));fetches.set(name,p);return p;}
 function resumeMusic(){if(!unlocked)return;for(const [k,t] of Object.entries(tracks)){if(!t)continue;
  const shouldPlay=settings.music&&(k===mode);if(shouldPlay){if(t.paused)t.play().catch(()=>{});}else if(!t.paused)t.pause();}
  updateVolume();}
 function play(which='ui',options={}){if(!settings.sfx)return;if(!ensure())return;const name=aliases[which]||which,buffer=buffers.get(name);if(!buffer)return;
  const now=performance.now(),cool=which==='step'||which==='push'?170:which==='ui'?40:55;
  if(now-(last.get(name)||0)<cool)return;last.set(name,now);
  const source=ctx.createBufferSource();source.buffer=buffer;
  source.playbackRate.value=(name==='ui_click'?1:1+(Math.random()-.5)*.07);
  const gain=ctx.createGain();let distance=0;
  if(options.position&&options.listener){const p=options.position,l=options.listener;distance=Math.hypot((p.x||0)-(l.x||0),(p.z||0)-(l.z||0),(p.y||0)-(l.y||0));}
  gain.gain.value=clamp((1-distance/60)**1.35,.035,1)*(.80+(Math.random()-.5)*.13);
  source.connect(gain).connect(sfxBus);source.start(0);
 }
 function setMode(m){mode=m==='playing'?'playing':'lobby';resumeMusic();}
 function setMap(i){map=i|0;}
 function setFear(x){fear=clamp(x||0,0,1); if(tracks.playing&&mode==='playing')tracks.playing.playbackRate=1+fear*.065;}
 function toggle(){FrogySettings.set('sfx',!settings.sfx);return settings.sfx;}
 FrogySettings.subscribe((key)=>{if(['music','sfx','volume'].includes(key)){updateVolume();resumeMusic();}});
 return {unlock:ensure,play,setMode,setMap,setFear,toggle,get enabled(){return settings.sfx},get active(){return unlocked}};
})();
window.FrogyAudio=FrogyAudio;
