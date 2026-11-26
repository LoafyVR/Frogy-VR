'use strict';
/* Frogy voice: opt-in microphone, WebRTC peers, optional (never mandatory) frog pitch.
   A failed AudioWorklet must NOT prevent microphone access or ordinary speech.
   Audio stays peer-to-peer; only signaling travels through the Frogy server. */
const FrogVoice=(()=>{
 let enabled=false,local=null,audioCtx=null,analyser=null,micSource=null,meterSink=null,workletReady=false;
 let send=()=>{},getId=()=>'',getListener=()=>null,players=[],iceServers=[{urls:'stun:stun.l.google.com:19302'}];
 let status='VOICE OFF',allMuted=false,smoothed=0;
 const pcs=new Map(),nodes=new Map(),pending=new Map(),mutedPeers=new Set();
 const emit=o=>send(o);
 function configure(opts){send=opts.send;getId=opts.getId;getListener=opts.getListener||(()=>null);}
 function configureIce(servers){if(Array.isArray(servers)&&servers.length&&servers.length<=6)iceServers=servers.filter(s=>s&&typeof s.urls==='string'||s&&Array.isArray(s.urls));}
 function setStatus(s){status=s;}
 function disposeNode(n){if(!n)return;for(const part of [n.source,n.fx,n.filter,n.gain])try{part?.disconnect();}catch{}if(n.element){n.element.pause();n.element.srcObject=null;n.element.remove();}}
 function closePeer(id){id=String(id);const p=pcs.get(id);try{p?.close();}catch{}pcs.delete(id);disposeNode(nodes.get(id));nodes.delete(id);pending.delete(id);}
 function dropPeers(){for(const id of [...pcs.keys()])closePeer(id);}
 function onJoined(){dropPeers();if(enabled)setStatus('MIC ON · CONNECTING TO OTHER FROGS');}
 async function enable(){if(enabled)return true;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw Error('Quest Browser needs HTTPS, microphone permission and WebRTC.');
  // Request microphone FIRST. A missing pitch-worklet or WebAudio implementation
  // should never disable the fundamental voice chat experience.
  local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  try{
   const Ctx=window.AudioContext||window.webkitAudioContext;
   if(Ctx){audioCtx??=new Ctx();await audioCtx.resume();
    micSource=audioCtx.createMediaStreamSource(local);analyser=audioCtx.createAnalyser();
    analyser.fftSize=512;analyser.smoothingTimeConstant=.65;micSource.connect(analyser);
    // Keep the analyser in the active WebAudio render graph without feeding the mic back to speakers.
    meterSink=audioCtx.createGain();meterSink.gain.value=0;analyser.connect(meterSink);meterSink.connect(audioCtx.destination);
    if(audioCtx.audioWorklet&&typeof AudioWorkletNode!=='undefined'&&!workletReady){
     try{await audioCtx.audioWorklet.addModule('/voice-worklet.js?v=16.5');workletReady=true;}
     catch(e){console.warn('Frog pitch not supported; using clear voice:',e.message);}
    }
   }
  }catch(e){console.warn('Voice metering unavailable, audio chat will still work:',e.message);analyser=null;}
  enabled=true;setStatus('MIC ON · WAITING FOR FROGS');emit({type:'voice-ready',enabled:true});return true;
 }
 function disable(){if(enabled)emit({type:'voice-ready',enabled:false});enabled=false;local?.getTracks().forEach(t=>t.stop());local=null;try{micSource?.disconnect();analyser?.disconnect();meterSink?.disconnect();}catch{}micSource=null;analyser=null;meterSink=null;smoothed=0;dropPeers();setStatus('VOICE OFF');}
 function remoteTrack(id,track){disposeNode(nodes.get(id));const stream=new MediaStream([track]);let n=null;
  try{
   if(audioCtx){audioCtx.resume().catch(()=>{});const source=audioCtx.createMediaStreamSource(stream),gain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=8500;
    let fx=null;if(workletReady){try{fx=new AudioWorkletNode(audioCtx,'frog-pitch',{processorOptions:{ratio:1.3}});}catch(e){console.warn('Frog effect bypassed:',e.message);}}
    if(fx)source.connect(fx).connect(filter).connect(gain).connect(audioCtx.destination);
    else source.connect(filter).connect(gain).connect(audioCtx.destination);
    n={source,fx,filter,gain};
   }
  }catch(e){console.warn('WebAudio playback fallback:',e.message);}
  if(!n){
   const element=document.createElement('audio');element.autoplay=true;element.playsInline=true;element.srcObject=stream;
   element.style.display='none';document.body.appendChild(element);
   element.play().catch(e=>{console.warn('Voice playback needs headset interaction:',e.message);setStatus('MIC ON · TAP VOICE TO UNLOCK SOUND');});
   n={element};
  }
  nodes.set(String(id),n);applyMute(id);updateRoles(players);setStatus('VOICE CONNECTED · '+nodes.size+' FRIEND'+(nodes.size===1?'':'S'));
  track.onended=()=>{if(nodes.get(String(id))===n){disposeNode(n);nodes.delete(String(id));setStatus('MIC ON · FRIEND DISCONNECTED');}};
 }
 function createPeer(id){id=String(id);if(!enabled||!id||id===String(getId()))return null;if(pcs.has(id))return pcs.get(id);
  const pc=new RTCPeerConnection({iceServers,iceCandidatePoolSize:2});pcs.set(id,pc);
  for(const track of local.getAudioTracks())pc.addTrack(track,local);
  pc.onicecandidate=e=>{if(e.candidate)emit({type:'rtc',to:id,data:{kind:'candidate',candidate:e.candidate.toJSON()}});};
  pc.ontrack=e=>remoteTrack(id,e.track);
  pc.onconnectionstatechange=()=>{
   if(pc.connectionState==='connected')setStatus('VOICE CONNECTED');
   if(pc.connectionState==='failed'){setStatus('VOICE CANNOT CONNECT · TURN MAY BE REQUIRED');closePeer(id);}
   if(pc.connectionState==='closed')closePeer(id);
  };
  return pc;
 }
 async function offer(id){const pc=createPeer(id);if(!pc||pc.signalingState!=='stable')return;try{await pc.setLocalDescription(await pc.createOffer());emit({type:'rtc',to:id,data:{kind:'offer',sdp:pc.localDescription}});}catch(e){setStatus('VOICE OFFER FAILED');console.warn('Voice offer:',e.message);}}
 function peerReady(id,on){id=String(id);if(!on){closePeer(id);return;}if(!enabled)return;
  // Stable ordering prevents both peers simultaneously sending offers.
  if(Number(getId())<Number(id))offer(id);else createPeer(id);
 }
 function peersReady(ids){if(!enabled)return;for(const id of ids||[])peerReady(id,true);}
 async function signal(id,msg){if(!enabled)return;id=String(id);try{const pc=createPeer(id);if(!pc)return;
  if(msg.kind==='offer'){
   if(pc.signalingState!=='stable')await pc.setLocalDescription({type:'rollback'});
   await pc.setRemoteDescription(msg.sdp);await pc.setLocalDescription(await pc.createAnswer());emit({type:'rtc',to:id,data:{kind:'answer',sdp:pc.localDescription}});await flushCandidates(id);
  }else if(msg.kind==='answer'){if(pc.signalingState==='have-local-offer')await pc.setRemoteDescription(msg.sdp);await flushCandidates(id);
  }else if(msg.kind==='candidate'){
   if(pc.remoteDescription)await pc.addIceCandidate(msg.candidate);else{const q=pending.get(id)||[];if(q.length<80)q.push(msg.candidate);pending.set(id,q);}
  }
 }catch(e){setStatus('VOICE SIGNAL ERROR · '+e.message.slice(0,55));console.warn('Voice signaling:',e.message);}}
 async function flushCandidates(id){const pc=pcs.get(String(id)),q=pending.get(String(id))||[];pending.delete(String(id));for(const c of q)try{await pc?.addIceCandidate(c);}catch{}}
 function updateRoles(list){players=list||[];for(const [id,n] of nodes){
  const p=players.find(x=>String(x.id)===String(id)),monster=p?.monster;
  if(n.fx)n.fx.port.postMessage({ratio:monster?.74:1.33});
  if(n.filter&&audioCtx)n.filter.frequency.setTargetAtTime(monster?2000:8500,audioCtx.currentTime,.075);
  const listener=getListener();
  // Nearby conversations feel natural, distant ones fade. If either location
  // has not arrived yet, keep voice audible instead of silently losing audio.
  const distance=listener&&p?Math.hypot((p.x||0)-(listener.x||0),(p.z||0)-(listener.z||0)):0;
  n.distanceVolume=distance<=7?1:Math.max(0,1-(distance-7)/21);
  applyMute(id);
 }}
 function peerLeft(id){closePeer(id);mutedPeers.delete(String(id));}
 function applyMute(id){const n=nodes.get(String(id)),vol=allMuted||mutedPeers.has(String(id))?0:.95*(n?.distanceVolume??1);if(n?.gain&&audioCtx)n.gain.gain.setTargetAtTime(vol,audioCtx.currentTime,.055);if(n?.element)n.element.volume=vol;}
 function setMuted(id,on){if(on)mutedPeers.add(String(id));else mutedPeers.delete(String(id));applyMute(id);}
 function isMuted(id){return mutedPeers.has(String(id));}
 function setAllMuted(on){allMuted=!!on;for(const id of nodes.keys())applyMute(id);}
 const amplitudes=new Uint8Array(512);function level(){if(!enabled||!analyser)return 0;
  analyser.getByteTimeDomainData(amplitudes);let sum=0;for(let i=0;i<amplitudes.length;i++){const v=(amplitudes[i]-128)/128;sum+=v*v;}
  const rms=Math.sqrt(sum/amplitudes.length),speaking=Math.min(1,Math.max(0,(rms-.009)*17));
  smoothed=smoothed*.65+speaking*.35;return smoothed<.035?0:smoothed;
 }
 return {level,configure,configureIce,enable,disable,peerReady,peersReady,signal,updateRoles,peerLeft,onJoined,setMuted,isMuted,setAllMuted,get status(){return status},get connected(){return nodes.size},get enabled(){return enabled},get effectReady(){return workletReady}};
})();
if(typeof window!=='undefined')window.FrogVoice=FrogVoice;
