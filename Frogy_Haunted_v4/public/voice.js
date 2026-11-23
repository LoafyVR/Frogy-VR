'use strict';
/* Optional peer-to-peer microphone chat. Audio is processed on receiving devices, never stored. */
const FrogVoice=(()=>{
 let enabled=false,local=null,audioCtx=null,analyser=null,micSource=null,ready=false,send=()=>{},getId=()=>'',players=[];
 const pcs=new Map(),nodes=new Map(),pending=new Map();
 const emit=(o)=>send(o);
 function configure(opts){send=opts.send;getId=opts.getId;}
 function closePeer(id){const p=pcs.get(id);try{p?.close();}catch{}pcs.delete(id);const n=nodes.get(id);if(n)try{n.source.disconnect();n.filter.disconnect();n.fx.disconnect();n.gain.disconnect();}catch{}nodes.delete(id);pending.delete(id);}
 function dropPeers(){for(const id of [...pcs.keys()])closePeer(id);}
 function onJoined(){dropPeers();}
 async function enable(){if(enabled)return true;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){throw Error('Microphone chat needs HTTPS (or localhost) and WebRTC.');}
  audioCtx??=new (window.AudioContext||window.webkitAudioContext)();await audioCtx.resume();
  if(!ready){await audioCtx.audioWorklet.addModule('voice-worklet.js');ready=true;}
  local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  micSource=audioCtx.createMediaStreamSource(local);analyser=audioCtx.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.55;micSource.connect(analyser);enabled=true;emit({type:'voice-ready',enabled:true});return true;
 }
 function disable(){if(enabled)emit({type:'voice-ready',enabled:false});enabled=false;local?.getTracks().forEach(t=>t.stop());local=null;try{micSource?.disconnect();analyser?.disconnect();}catch{}micSource=null;analyser=null;dropPeers();}
 function createPeer(id){if(!enabled||!id||id===getId())return null;if(pcs.has(id))return pcs.get(id);
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});pcs.set(id,pc);
  for(const track of local.getAudioTracks())pc.addTrack(track,local);
  pc.onicecandidate=e=>{if(e.candidate)emit({type:'rtc',to:id,data:{kind:'candidate',candidate:e.candidate.toJSON()}});};
  pc.ontrack=e=>{const stream=new MediaStream([e.track]);if(nodes.has(id))try{nodes.get(id).source.disconnect();nodes.get(id).filter.disconnect();nodes.get(id).fx.disconnect();nodes.get(id).gain.disconnect();}catch{}
   const source=audioCtx.createMediaStreamSource(stream),fx=new AudioWorkletNode(audioCtx,'frog-pitch',{processorOptions:{ratio:1.3}}),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();filter.type='lowpass';filter.frequency.value=9000;gain.gain.value=.95;source.connect(fx).connect(filter).connect(gain).connect(audioCtx.destination);nodes.set(id,{source,fx,filter,gain});updateRoles(players);e.track.onended=()=>closePeer(id);
  };
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'||pc.connectionState==='closed')closePeer(id);};return pc;
 }
 async function offer(id){const pc=createPeer(id);if(!pc||pc.signalingState!=='stable')return;try{await pc.setLocalDescription(await pc.createOffer());emit({type:'rtc',to:id,data:{kind:'offer',sdp:pc.localDescription}});}catch(e){console.warn('Voice offer:',e.message);}}
 function peerReady(id,on){if(!on){closePeer(id);return;}if(!enabled)return;if(Number(getId())<Number(id))offer(id);else createPeer(id);}
 function peersReady(ids){if(!enabled)return;for(const id of ids)peerReady(id,true);}
 async function signal(id,msg){if(!enabled)return;try{const pc=createPeer(id);if(!pc)return;
  if(msg.kind==='offer'){if(pc.signalingState!=='stable'){await pc.setLocalDescription({type:'rollback'});}await pc.setRemoteDescription(msg.sdp);await pc.setLocalDescription(await pc.createAnswer());emit({type:'rtc',to:id,data:{kind:'answer',sdp:pc.localDescription}});await flushCandidates(id);
  }else if(msg.kind==='answer'){if(pc.signalingState==='have-local-offer')await pc.setRemoteDescription(msg.sdp);await flushCandidates(id);
  }else if(msg.kind==='candidate'){if(pc.remoteDescription)await pc.addIceCandidate(msg.candidate);else{const q=pending.get(id)||[];q.push(msg.candidate);pending.set(id,q);}}
  }catch(e){console.warn('Voice signaling:',e.message);}}
 async function flushCandidates(id){const pc=pcs.get(id),q=pending.get(id)||[];pending.delete(id);for(const c of q)try{await pc.addIceCandidate(c);}catch{}}
 function updateRoles(list){players=list||[];for(const [id,n] of nodes){const p=players.find(x=>x.id===id),monster=p?.monster;const ratio=monster?.74:1.33;n.fx.port.postMessage({ratio});n.filter.frequency.setTargetAtTime(monster?1850:8500,audioCtx.currentTime,.075);}}
 function peerLeft(id){closePeer(id);}
 const amplitudes=new Uint8Array(256);function level(){if(!enabled||!analyser)return 0;analyser.getByteTimeDomainData(amplitudes);let sum=0;for(let i=0;i<amplitudes.length;i++){const v=(amplitudes[i]-128)/128;sum+=v*v;}return Math.min(1,Math.max(0,(Math.sqrt(sum/amplitudes.length)-.017)*9));}
 return {level,configure,enable,disable,peerReady,peersReady,signal,updateRoles,peerLeft,onJoined,get enabled(){return enabled}};
})();
window.FrogVoice=FrogVoice;
