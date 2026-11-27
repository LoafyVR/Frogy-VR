'use strict';
/* Bundled original music and Foley-styled audio. No third-party CDN or licensing dependency. */
const FrogyAudio=(()=>{
 const settings=FrogySettings.state;
 const aliases={ui:'ui_click',select:'ui_confirm',error:'ui_error',squelch:'squelch',frogcall:'wind',metal:'step',creak:'wind'};
 const samples=['ui_click','ui_confirm','ui_error','code_success','cling_attach','cling_release','coin','jump','grab','drop','step','push','blade','shot','hit','rip','squelch','chomp','roar','death','heartbeat','round','wind'];
 let ctx=null,master=null,sfxBus=null,unlocked=false,mode='lobby',map=0,fear=0;
 const buffers=new Map(),fetches=new Map(),last=new Map();
 const tracks={lobby:null,playing:null},playlist=['lobby_jazz','lobby_waltz','lobby_musicbox'];
 let timer=null,trackIndex=0,cycleId=0,inBreak=false;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function updateVolume(){
  if(master&&ctx)master.gain.setTargetAtTime(settings.volume/100*.78,ctx.currentTime,.04);
  for(const t of Object.values(tracks))if(t)t.volume=(settings.music?settings.musicVolume/100:0)*(t===tracks.lobby?.36:.41);
 }
 function ensure(){
  if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
   ctx=new C();master=ctx.createGain();master.connect(ctx.destination);sfxBus=ctx.createGain();sfxBus.gain.value=.64; sfxBus.connect(master);
   tracks.lobby=new Audio('/sounds/lobby_jazz.ogg');tracks.playing=new Audio('/sounds/horror_ambience.ogg');
   for(const t of Object.values(tracks)){t.loop=false;t.preload='auto';t.playsInline=true;}
   samples.forEach(k=>loadSample(k));
  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  unlocked=true;updateVolume();resumeMusic();return true;
 }
 function loadSample(name){if(fetches.has(name))return fetches.get(name);
  const p=fetch('/sounds/'+name+'.ogg').then(r=>{if(!r.ok)throw Error(name+' '+r.status);return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).then(b=>buffers.set(name,b)).catch(e=>console.warn('Audio asset '+name+' unavailable:',e.message));fetches.set(name,p);return p;}
 function schedule(nextMs){clearTimeout(timer);const thisId=++cycleId;timer=setTimeout(()=>{if(thisId!==cycleId||!settings.music||!unlocked)return;
    const current=tracks[mode];if(!current)return;
    if(settings.musicCycle){inBreak=true;current.pause();current.currentTime=0;const silent=(mode==='lobby'?14000:18000);
     clearTimeout(timer);timer=setTimeout(()=>{if(thisId!==cycleId)return;inBreak=false;trackIndex++;if(mode==='lobby')tracks.lobby.src='/sounds/'+playlist[trackIndex%playlist.length]+'.ogg';resumeMusic(true);},silent);
    }else{current.currentTime=0;current.play().catch(()=>{});schedule(32000);}
  },nextMs);}
 function resumeMusic(forceNext=false){
  if(!unlocked)return;
  for(const [k,t] of Object.entries(tracks)){if(k!==mode&&t&&!t.paused){t.pause();t.currentTime=0;}}
  updateVolume();const current=tracks[mode];if(!current||!settings.music){clearTimeout(timer);++cycleId;if(current)current.pause();return;}
  if(!forceNext&&(inBreak||!current.paused))return;
  if(mode==='lobby')current.src='/sounds/'+playlist[trackIndex%playlist.length]+'.ogg';
  current.play().catch(()=>{});schedule(mode==='lobby'?25000:34000);
 }
 function play(which='ui',options={}){if(!settings.sfx)return;if(!ensure())return;const name=aliases[which]||which,buffer=buffers.get(name);if(!buffer)return;
  const now=performance.now(),cool=which==='step'||which==='push'?170:which==='ui'?40:55;
  if(now-(last.get(name)||0)<cool)return;last.set(name,now);
  const source=ctx.createBufferSource();source.buffer=buffer;
  source.playbackRate.value=(name==='heartbeat'?.88:name==='ui_click'?1:1+(Math.random()-.5)*.07);
  const gain=ctx.createGain();let distance=0;
  if(options.position&&options.listener){const p=options.position,l=options.listener;distance=Math.hypot((p.x||0)-(l.x||0),(p.z||0)-(l.z||0),(p.y||0)-(l.y||0));}
  gain.gain.value=clamp((1-distance/60)**1.35,.035,1)*(.80+(Math.random()-.5)*.13)*clamp(Number(options.volume??1),0,1);
  source.connect(gain).connect(sfxBus);source.start(0);
 }
 function setMode(m){const next=m==='playing'?'playing':'lobby';if(next===mode)return;inBreak=false;clearTimeout(timer);++cycleId;for(const t of Object.values(tracks))if(t){t.pause();t.currentTime=0;}mode=next;resumeMusic(true);}
 function setMap(i){map=i|0;}
 function setFear(x){fear=clamp(x||0,0,1); if(tracks.playing&&mode==='playing')tracks.playing.playbackRate=1+fear*.065;}
 function toggle(){FrogySettings.set('sfx',!settings.sfx);return settings.sfx;}
 FrogySettings.subscribe((key)=>{if(['music','sfx','volume','musicVolume','musicCycle'].includes(key)){updateVolume();resumeMusic();}});
 return {unlock:ensure,play,setMode,setMap,setFear,toggle,get enabled(){return settings.sfx},get active(){return unlocked}};
})();
window.FrogyAudio=FrogyAudio;
