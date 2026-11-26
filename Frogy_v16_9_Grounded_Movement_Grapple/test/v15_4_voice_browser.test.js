'use strict';
// Simulate WebAudio pitch processor failure: microphone and normal WebRTC chat MUST continue.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class Node{connect(n){this.next=n;return n;}disconnect(){}}
class Gain extends Node{constructor(){super();this.gain={value:1,setTargetAtTime:(v)=>{this.gain.value=v;}};}}
class Analyser extends Node{constructor(){super();this.fftSize=0;this.smoothingTimeConstant=0;}getByteTimeDomainData(a){for(let i=0;i<a.length;i++)a[i]=i%2?147:109;}}
class Context{
 constructor(){this.currentTime=0;this.destination=new Node();this.audioWorklet={addModule:async()=>{throw Error('Worklet blocked by Quest');}};}
 async resume(){}
 createMediaStreamSource(){return new Node();}
 createAnalyser(){return new Analyser();}
 createGain(){return new Gain();}
 createBiquadFilter(){const n=new Node();n.frequency={value:8500,setTargetAtTime(){}};return n;}
}
const sent=[],tracks=[{kind:'audio',stop(){this.stopped=true;}}];
class PC{
 constructor(){this.signalingState='stable';this.connectionState='new';PC.latest=this;}
 addTrack(){}
 async createOffer(){return {type:'offer',sdp:'local'};}
 async setLocalDescription(o){this.localDescription=o;}
 async setRemoteDescription(o){this.remoteDescription=o;}
 async addIceCandidate(){}
 close(){this.connectionState='closed';}
}
const fakeStream={getTracks:()=>tracks,getAudioTracks:()=>tracks};
const sandbox={window:{isSecureContext:true,AudioContext:Context,RTCPeerConnection:PC},navigator:{mediaDevices:{getUserMedia:async()=>fakeStream}},
 AudioWorkletNode:class {},RTCPeerConnection:PC,MediaStream:class {constructor(tracks){this.tracks=tracks;}},
 Uint8Array,console,Map,Set,Math,Promise,document:{createElement(){throw Error('WebAudio should handle playback');}}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/voice.js'),'utf8'),sandbox);
const voice=sandbox.window.FrogVoice;
(async()=>{
 voice.configure({send:m=>sent.push(m),getId:()=> '1'});
 voice.configureIce([{urls:'stun:stun.l.google.com:19302'}]);
 assert.equal(await voice.enable(),true,'microphone works when pitch effect fails');
 assert.equal(voice.enabled,true);assert.equal(voice.effectReady,false);
 assert(sent.some(m=>m.type==='voice-ready'&&m.enabled),'voice-ready handshake emitted');
 assert(voice.level()>.12,'microphone volume drives avatar mouth animation');
 voice.peerReady('2',true);await new Promise(r=>setImmediate(r));
 assert(sent.some(m=>m.type==='rtc'&&m.data.kind==='offer'),'offer is sent to another headset');
 PC.latest.ontrack({track:{kind:'audio',onended:null}});
 assert.equal(voice.connected,1,'received track routed to actual speaker graph');
 voice.setMuted('2',true);assert.equal(voice.isMuted('2'),true);
 voice.disable();assert.equal(voice.enabled,false);assert.equal(tracks[0].stopped,true);
 console.log('PASS v15.4 voice: microphone fallback survives missing pitch worklet, mouth meters audio, relay offers, remote speaker graph and mute');
})().catch(e=>{console.error(e);process.exitCode=1;});
