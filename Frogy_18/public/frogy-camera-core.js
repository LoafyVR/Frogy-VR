/* Frogy Camera Prototype - independent, dependency-free capture/recording core.
 * No game imports, no physics, networking, or server writes.
 * MIT license, optional browser MediaRecorder + 2D canvas support.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FrogyCameraCore=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const MODES=Object.freeze(['pov','follow','selfie','tripod','handheld']);
  const PRESETS=Object.freeze({eco:Object.freeze({width:320,height:180,fps:8,bitrate:550000}),normal:Object.freeze({width:640,height:360,fps:12,bitrate:1800000})});
  const MAX_SECONDS=90;
  const finite=(v,d=0)=>Number.isFinite(v)?v:d;
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const mul=(a,m)=>a.map(v=>v*m);
  const norm=a=>{const n=Math.hypot(...a);return n>.000001?a.map(v=>v/n):[0,0,-1];};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
  function lookAt(eye,at,worldUp=[0,1,0]){
    const forward=norm(at.map((v,i)=>v-eye[i]));
    const z=mul(forward,-1);
    const seed=Math.abs(dot(z,worldUp))>.98?[0,0,1]:worldUp;
    const x=norm(cross(seed,z)),y=cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  }
  function cameraFor(mode,head,hand,tripod){
    if(!MODES.includes(mode))throw Error('Unknown camera mode');
    if(!head||!Number.isFinite(head.x)||!Number.isFinite(head.y)||!Number.isFinite(head.z))throw Error('Invalid head pose');
    const p=[head.x,head.y,head.z],full=norm(head.forward||[0,0,-1]);
    const flat=norm([full[0],0,full[2]]),right=norm(cross(flat,[0,1,0]));
    if(mode==='pov')return {mode,eye:p,target:add(p,full),xrHead:true};
    if(mode==='follow'){
      const eye=add(add(p,mul(flat,-3.1)),[0,1.0,0]);
      return {mode,eye,target:add(p,[0,-.48,0])};
    }
    if(mode==='selfie'){
      const eye=add(add(p,mul(flat,2.7)),[0,.15,0]);
      return {mode,eye,target:add(p,[0,-.40,0])};
    }
    if(mode==='tripod'){
      const a=tripod&&tripod.eye&&tripod.target?tripod:cameraFor('selfie',head);
      return {mode,eye:[...a.eye],target:[...a.target]};
    }
    const ray=hand?.ray;
    if(ray&&Array.isArray(ray.o)&&Array.isArray(ray.d)&&ray.o.length===3&&ray.d.length===3&&[...ray.o,...ray.d].every(Number.isFinite))
      return {mode,eye:[...ray.o],target:add(ray.o,norm(ray.d))};
    return {mode,eye:add(p,mul(right,-.35)),target:add(p,full),fallback:true};
  }
  // Prefer a container that can mux Opus microphone audio into the video.
  function chooseMime(MediaRecorderClass,withAudio=false){
    if(!MediaRecorderClass)return null;
    const candidates=withAudio
      ? ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm','video/mp4']
      : ['video/webm;codecs=vp8','video/webm','video/mp4'];
    for(const mime of candidates){
      try{if(!MediaRecorderClass.isTypeSupported||MediaRecorderClass.isTypeSupported(mime))return mime;}catch{}
    }
    return null;
  }
  /* Asynchronous because requesting the microphone is a browser permission prompt.
   * When provided with Frogy's active voice stream, BORROW the track: the camera
   * must never stop or mute WebRTC voice chat. Standalone use gets its own stream.
   */
  function createRecorder({canvas,Recorder,URLApi,now,onStatus,onSaved,maxSeconds=MAX_SECONDS,
      mediaDevices,StreamClass,getMicStream}={}){
    if(!canvas)throw Error('Recording requires a canvas');
    const MC=Recorder||(typeof MediaRecorder!=='undefined'?MediaRecorder:null);
    const Url=URLApi||(typeof URL!=='undefined'?URL:null);
    const Devices=mediaDevices||(typeof navigator!=='undefined'?navigator.mediaDevices:null);
    const MS=StreamClass||(typeof MediaStream!=='undefined'?MediaStream:null);
    const clock=now||(()=>Date.now());
    const tell=msg=>{if(typeof onStatus==='function')onStatus(msg);};
    let recorder=null,chunks=[],startAt=0,canvasStream=null,micStream=null,combined=null;
    let micOwned=false,blob=null,url=null,lastError='',mime='',state='idle',hasMic=false,cancelled=false;
    const releaseStreams=()=>{
      for(const track of canvasStream?.getTracks?.()||[])try{track.stop();}catch{}
      if(micOwned)for(const track of micStream?.getTracks?.()||[])try{track.stop();}catch{}
      canvasStream=null;micStream=null;combined=null;micOwned=false;
    };
    const disposeLink=()=>{if(url&&Url?.revokeObjectURL)Url.revokeObjectURL(url);url=null;};
    async function start(preset=PRESETS.eco,{microphone=false}={}){
      if(state!=='idle')throw Error('Already recording or requesting microphone access');
      if(!MC||!canvas.captureStream)throw Error('Browser cannot record canvas video (MediaRecorder or captureStream unavailable)');
      if(microphone&&!MS)throw Error('Browser cannot combine microphone audio with camera video');
      mime=chooseMime(MC,microphone);
      if(!mime)throw Error(microphone?'No supported video + microphone encoder found':'No supported video encoder found');
      // Keep the previous downloadable clip if microphone permission is denied.
      chunks=[];lastError='';hasMic=false;cancelled=false;state='starting';
      try{
        if(microphone){
          // A game voice track is reused only when the user has explicitly selected MIC ON.
          const shared=typeof getMicStream==='function'?getMicStream():null;
          if(shared?.getAudioTracks?.().some(t=>t.readyState!=='ended'&&t.enabled!==false)){
            micStream=shared;micOwned=false;
          }else{
            if(!Devices?.getUserMedia)throw Error('Microphone capture is unavailable; check HTTPS and browser permissions');
            tell('Requesting microphone permission…');
            micStream=await Devices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
            micOwned=true;
          }
          const live=micStream?.getAudioTracks?.().find(t=>t.readyState!=='ended'&&t.enabled!==false);
          if(!live)throw Error('Microphone did not provide an enabled, live audio track');
          hasMic=true;
        }
        if(cancelled)throw Error('Recording cancelled');
        canvasStream=canvas.captureStream(preset.fps);
        const videoTrack=canvasStream.getVideoTracks?.()[0];
        if(!videoTrack)throw Error('Canvas did not provide a video track');
        combined=microphone?new MS([videoTrack,micStream.getAudioTracks()[0]]):canvasStream;
        const activeRecorder=new MC(combined,{mimeType:mime,videoBitsPerSecond:preset.bitrate});
        recorder=activeRecorder;
        activeRecorder.ondataavailable=e=>{if(e.data&&e.data.size>0)chunks.push(e.data);};
        activeRecorder.onerror=e=>{lastError=e?.error?.message||'Recorder error';tell('Recording failed: '+lastError);};
        activeRecorder.onstop=()=>{
          state='idle';releaseStreams();
          if(lastError){chunks=[];tell('Recording failed: '+lastError);return;}
          const declared=activeRecorder.mimeType||mime;
          blob=new Blob(chunks,{type:declared});chunks=[];
          if(blob.size>0&&Url?.createObjectURL){
            url=Url.createObjectURL(blob);
            tell((hasMic?'Microphone + video':'Video-only')+' clip ready: '+Math.ceil(blob.size/1024)+' KB. Select SAVE VIDEO.');
            if(onSaved)onSaved({blob,url,mime:declared,hasMic});
          }else tell('Recording stopped, but the browser returned no video data.');
        };
        activeRecorder.start(1000);
        disposeLink();blob=null;
        startAt=clock();state='recording';
        tell(hasMic?'Recording with microphone ON. Stop to finalize the clip.':'Recording video only (MIC OFF).');
        return true;
      }catch(e){
        state='idle';releaseStreams();recorder=null;hasMic=false;
        const reason=e?.name==='NotAllowedError'?'Microphone permission denied':e?.name==='NotFoundError'?'No microphone found':e?.name==='NotReadableError'?'Microphone is busy or unavailable':e?.message||String(e);
        lastError=reason;tell('Recording not started: '+reason);
        throw Error(reason);
      }
    }
    function stop(){if(state==='starting'){cancelled=true;tell('Cancelling microphone request…');return true;}if(state!=='recording')return false;state='stopping';try{recorder.requestData?.();}catch{}try{recorder.stop();}catch(e){lastError=e.message;releaseStreams();state='idle';throw e;}tell('Finalizing clip…');return true;}
    function tick(){
      if(state!=='recording')return;
      if(hasMic&&!micStream?.getAudioTracks?.().some(t=>t.readyState!=='ended'&&t.enabled!==false)){
        tell('Microphone disconnected; finalizing the clip.');stop();return;
      }
      if((clock()-startAt)>=maxSeconds*1000){stop();tell('90-second safety limit reached; finalizing clip.');}
    }
    function download(filename){if(!url)return false;const a=document.createElement('a');a.href=url;a.download=filename||('Frogy-Camera-'+new Date(clock()).toISOString().replace(/[:.]/g,'-')+(mime.includes('mp4')?'.mp4':'.webm'));a.rel='noopener';document.body.appendChild(a);a.click();a.remove();return true;}
    function dispose(){cancelled=true;if(state==='recording')stop();if(state==='idle'){releaseStreams();disposeLink();}}
    return {start,stop,tick,download,dispose,get state(){return state},get elapsed(){return state==='idle'?0:Math.max(0,(clock()-startAt)/1000)},get blob(){return blob},get url(){return url},get mime(){return mime},get error(){return lastError},get hasMic(){return hasMic}};
  }
  return {MODES,PRESETS,MAX_SECONDS,cameraFor,lookAt,chooseMime,createRecorder};
});
