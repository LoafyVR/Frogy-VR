/* Frogy Camera Lab / v16.7 beta adapter. Load after features.js and camera core.
 * Only works in a test copy with THREE minimal Frogy integration hooks documented.
 * NO physics, weapon, movement, network or account modifications.
 */
(function(root){
'use strict';
const Core=root.FrogyCameraCore;
if(!Core){console.error('Frogy Camera Lab needs frogy-camera-core.js');return;}
const {MODES,PRESETS,createRecorder,cameraFor,lookAt}=Core;
let micEnabled=false,mode='pov',quality='eco',target=null,lastCapture=-1,frameError='',status='Camera ready',tripod=null,photoUrl=null,photoPending=false,recorder=null,recordingSession=null,recordingTicks=0;
let canvas=document.createElement('canvas');canvas.id='frogy-camera-capture-canvas';canvas.width=PRESETS.eco.width;canvas.height=PRESETS.eco.height;
canvas.style.cssText='position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none';document.body.appendChild(canvas);
const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:false});
let image=null,flipped=null,source=null;
const profile=document.createElement('details');profile.open=true;profile.style.cssText='max-width:520px;margin:12px auto;padding:12px;border:1px solid #699b80;border-radius:14px;color:#d9fff0;background:#16352e';
profile.innerHTML='<summary style="cursor:pointer;font-weight:bold">🎥 CAMERA LAB · BETA (QUEST TESTING)</summary><p id="cameraLabStatus" style="font-size:14px">Camera beta ready. In Quest, open X → SETTINGS → CAMERA LAB.</p><p style="font-size:12px">MIC OFF by default. Turn MIC ON to include your own voice. Recording stays on the headset; no clips go to Frogy servers.</p>';
const saveVideo=document.createElement('a');saveVideo.textContent='DOWNLOAD LAST VIDEO';saveVideo.hidden=true;saveVideo.style.cssText='display:none;color:#b7ffad;margin-right:12px';saveVideo.download='Frogy-Camera.webm';
const savePhoto=document.createElement('a');savePhoto.textContent='DOWNLOAD LAST PHOTO';savePhoto.hidden=true;savePhoto.style.cssText='display:none;color:#b7ffad';savePhoto.download='Frogy-Camera.png';
profile.append(saveVideo,savePhoto);document.getElementById('vrOnlyGate')?.appendChild(profile);
function report(msg){status=msg;const el=document.getElementById('cameraLabStatus');if(el)el.textContent=status;console.info('[Frogy Camera Lab]',msg);try{vrLast=-1;}catch{}}
function settings(){return PRESETS[quality];}
function releaseTarget(){if(!target)return;try{gl.deleteFramebuffer(target.fbo);gl.deleteTexture(target.color);gl.deleteRenderbuffer(target.depth);}catch{}target=null;}
function ensureTarget(){const {width,height}=settings();if(target&&target.width===width&&target.height===height)return;
 releaseTarget();
 const prev=gl.getParameter(gl.FRAMEBUFFER_BINDING),prevTexture=gl.getParameter(gl.TEXTURE_BINDING_2D),prevRenderbuffer=gl.getParameter(gl.RENDERBUFFER_BINDING);
 let color,depth,fbo;
 try{
 color=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,color);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);
 fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Camera framebuffer incomplete');
 target={width,height,color,depth,fbo};canvas.width=width;canvas.height=height;image=ctx.createImageData(width,height);source=new Uint8Array(width*height*4);flipped=image.data;
 }catch(e){for(const [kind,item] of [['framebuffer',fbo],['texture',color],['renderbuffer',depth]])if(item){if(kind==='framebuffer')gl.deleteFramebuffer(item);if(kind==='texture')gl.deleteTexture(item);if(kind==='renderbuffer')gl.deleteRenderbuffer(item);}throw e;
 }finally{gl.bindFramebuffer(gl.FRAMEBUFFER,prev);gl.bindTexture(gl.TEXTURE_2D,prevTexture);gl.bindRenderbuffer(gl.RENDERBUFFER,prevRenderbuffer);}
}
function ensureRecorder(){if(!recorder)recorder=createRecorder({canvas,getMicStream:()=>root.FrogVoice?.microphoneStream||null,onStatus:report,onSaved:({url,mime})=>{saveVideo.href=url;saveVideo.download='Frogy-'+mode+'-'+Date.now()+(mime.includes('mp4')?'.mp4':'.webm');saveVideo.hidden=false;saveVideo.style.display='inline-block';}});return recorder;}
function setMode(next,head){if(!MODES.includes(next))return false;mode=next;if(next==='tripod')tripod=head?cameraFor('selfie',head):null;report('Mode: '+mode.toUpperCase()+(next==='handheld'?' (left-controller aim)':''));return true;}
function setQuality(next){if(!PRESETS[next]||(recorder&&recorder.state!=='idle'))return false;quality=next;releaseTarget();report('Quality: '+quality.toUpperCase()+'. Lower quality runs better on Quest 2.');return true;}
async function start(){
 try{
  if(typeof session==='undefined'||!session)throw Error('Enter Frogy VR before recording');
  ensureTarget();recordingTicks=0;
  // The browser gets microphone permission here, from the explicit Start button press.
  await ensureRecorder().start(settings(),{microphone:micEnabled});
  saveVideo.hidden=true;saveVideo.style.display='none';saveVideo.removeAttribute('href');
  recordingSession=session;report(micEnabled?'MIC ON · Recording your voice and video':'MIC OFF · Recording video only');return true;
 }catch(e){report('Cannot record: '+e.message+'. Turn MIC OFF to record silently.');return false;}
}
function setMic(on){if(recorder&&recorder.state!=='idle'){report('Stop recording before changing the microphone setting.');return false;}micEnabled=!!on;report('Microphone '+(micEnabled?'ON (permission requested when recording starts)':'OFF (video only)'));return true;}
function stop(){try{const ok=ensureRecorder().stop();if(ok)recordingSession=null;return ok;}catch(e){report('Recorder stop failed: '+e.message);return false;}}
function download(){if(!recorder?.url){report('No finished video yet. Stop and finalize recording first.');return false;}const ok=recorder.download(saveVideo.download);if(!ok)report('Download blocked. Exit VR and click DOWNLOAD LAST VIDEO on the Frogy launcher.');return ok;}
function photo(){photoPending=true;report('Photo requested; preparing the next camera frame.');}
function savePhotoNow(){if(!photoUrl){report('No photo ready. Press TAKE PHOTO first.');return false;}const a=document.createElement('a');a.href=photoUrl;a.download='Frogy-Camera-'+Date.now()+'.png';document.body.append(a);a.click();a.remove();return true;}
function drawFrame(t,pose,head){
 const camera=cameraFor(mode,head,typeof vrInput==='undefined'?null:vrInput.left,tripod);
 const oldP=P,oldV=V;
 const savedFramebuffer=gl.getParameter(gl.FRAMEBUFFER_BINDING);
 const savedViewport=gl.getParameter(gl.VIEWPORT);
 const savedScissor=gl.getParameter(gl.SCISSOR_BOX);
 const scissorWasEnabled=gl.isEnabled(gl.SCISSOR_TEST);
 const savedDepthMask=gl.getParameter(gl.DEPTH_WRITEMASK);
 const captureFlag={active:true,thirdPerson:mode!=='pov'};
 try{
  gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.viewport(0,0,target.width,target.height);gl.disable(gl.SCISSOR_TEST);gl.depthMask(true);
  gl.clearColor(...(isHub()?[.018,.026,.033]:MAPS[mapIndex].sky),1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  P=perspective(72*Math.PI/180,target.width/target.height,.045,160);
  if(mode==='pov'&&pose?.transform?.inverse?.matrix){
    V=mul(pose.transform.inverse.matrix,mul(mat(0,0,0,1,1,1,-turnYaw),matTranslation(-vrPos.x,-vrPos.y-referenceShift,-vrPos.z)));
  }else V=lookAt(camera.eye,camera.target);
  root.FrogyCameraCapture=captureFlag;
  // The normal game renderer is reused, not duplicated or recreated.
  drawScene(t,mode==='pov'?head:null);
  if(mode!=='pov'&&me&&me.alive!==false){
    // Remote avatars are rendered by drawScene; this adds the player's own tracked frog exactly once.
    const own={...me,id:clientId||'player',x:head.x,y:vrPos.y,z:head.z,yaw:lookYaw,
      bodyYaw:bodyTrack.yaw,bodyPitch:bodyTrack.pitch,bodyLean:bodyTrack.lean,bodyLift:(bodyTrack.height-1.65)*.2,
      l:vrInput.left?.hand||null,rr:vrInput.right?.hand||null,
      lBasis:vrInput.left?.basis||null,rBasis:vrInput.right?.basis||null,
      lCurl:vrInput.left?.pose||[0,0,0],rCurl:vrInput.right?.pose||[0,0,0],
      lYaw:vrInput.left?.yaw||lookYaw,rYaw:vrInput.right?.yaw||lookYaw};
    frog(own,t);
  }
  gl.flush();gl.readPixels(0,0,target.width,target.height,gl.RGBA,gl.UNSIGNED_BYTE,source);
  const rowBytes=target.width*4;
  for(let y=0;y<target.height;y++)flipped.set(source.subarray((target.height-1-y)*rowBytes,(target.height-y)*rowBytes),y*rowBytes);
  ctx.putImageData(image,0,0);
  recordingTicks++;
  if(photoPending){photoPending=false;canvas.toBlob(blob=>{if(!blob){report('Quest Browser could not encode the photo.');return;}if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(blob);savePhoto.href=photoUrl;savePhoto.hidden=false;savePhoto.style.display='inline-block';report('Photo ready. Choose SAVE PHOTO.');},'image/png');}
 }finally{
  root.FrogyCameraCapture=null;P=oldP;V=oldV;gl.bindFramebuffer(gl.FRAMEBUFFER,savedFramebuffer);
  gl.viewport(...savedViewport);gl.scissor(...savedScissor);if(scissorWasEnabled)gl.enable(gl.SCISSOR_TEST);else gl.disable(gl.SCISSOR_TEST);gl.depthMask(savedDepthMask);
 }
}
function captureFrame({time,pose,head}){
 try{
  const r=ensureRecorder();r.tick();
  if(recordingSession&&recordingSession!==session&&r.state==='recording'){stop();recordingSession=null;return;}
  const preview=typeof vrPage!=='undefined'&&vrMenuOpen&&vrPage==='camera';
  if(!preview&&r.state!=='recording'&&!photoPending)return;
  const s=settings();if(time-lastCapture<1/s.fps)return;lastCapture=time;
  if(!head||!pose||!session)return;
  ensureTarget();if(mode==='tripod'&&!tripod)tripod=cameraFor('selfie',head);
  drawFrame(time,pose,head);
 }catch(e){if(frameError!==e.message){frameError=e.message;report('Camera frame failed: '+e.message);}if(recorder?.state==='recording')stop();}
}
// Wrap the existing world-space VR menu. No extra collision boxes, no controller remapping.
if(typeof redrawVRPanel==='function'){
 const original=redrawVRPanel;
 redrawVRPanel=function(t){
  original(t);
  if(vrLast!==t||!vrMenuOpen)return;
  if(vrPage==='settings'){
    vrBtn('🎥 CAMERA LAB (TEST)',60,669,890,62,()=>{vrPage='camera';vrLast=-1;});
  }else if(vrPage==='camera'){
    vrZones=vrZones.filter(z=>z.y<230); // keep original tab buttons; clear old page click zones
    vrRect(31,235,965,512,'#0b2836','#99eebb',20);
    vrText('CAMERA LAB · ISOLATED TEST',56,279,30,'#d2ffb8');
    vrText(status.slice(0,65),56,311,17,'#e1fcf3');
    const mm=[['POV','pov'],['FOLLOW','follow'],['SELFIE','selfie'],['TRIPOD','tripod'],['HANDHELD','handheld']];
    mm.forEach(([label,id],i)=>{const col=i%3,row=Math.floor(i/3);vrBtn(label,47+col*178,330+row*64,168,55,()=>setMode(id),mode===id);});
    const rec=recorder?.state||'idle';
    vrBtn(rec==='recording'?'■ STOP RECORDING':rec==='starting'?'CANCEL MIC REQUEST':rec==='stopping'?'FINALIZING VIDEO…':'● START RECORDING',47,484,504,58,()=>{if(rec==='recording'||rec==='starting')stop();else if(rec==='idle')start();vrLast=-1;},rec!=='idle');
    vrBtn('QUALITY: '+quality.toUpperCase(),563,484,405,58,()=>{setQuality(quality==='eco'?'normal':'eco');vrLast=-1;});
    vrBtn('MIC: '+(micEnabled?'ON · YOUR VOICE':'OFF · SILENT'),47,553,504,58,()=>setMic(!micEnabled),micEnabled);
    vrBtn('TAKE PHOTO',563,553,405,58,()=>photo());
    vrBtn('SAVE VIDEO',47,618,310,58,()=>download());
    vrBtn('SAVE PHOTO',369,618,293,58,()=>savePhotoNow());
    vrBtn('◀ SETTINGS',675,618,293,58,()=>{vrPage='settings';vrLast=-1;});
    if(rec==='recording')vrText('REC '+Math.ceil(recorder.elapsed)+'s / 90s · AUDIO '+(recorder.hasMic?'TRACK CONNECTED':'OFF'),948,721,18,'#ff9898','right');
    else if(rec==='starting')vrText('ALLOW MICROPHONE IN QUEST BROWSER OR CANCEL',948,721,18,'#ffd3a8','right');
    else vrText('MIC OFF by default · record your own voice if ON',948,721,18,'#afcfc6','right');
    // Live thumbnail inside camera page: preview is low-cost and never shown to other players.
    if(recordingTicks>0)try{vc.drawImage(canvas,672,328,275,144);}catch{}
  }else return;
  // The original menu uploaded its texture already; refresh our small overlay.
  gl.bindTexture(gl.TEXTURE_2D,vTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,vCanvas);
 };
}
root.FrogyCameraAdapter={captureFrame,setMode,setQuality,setMic,start,stop,download,photo,savePhoto:savePhotoNow,get status(){return status;},get mode(){return mode;},get quality(){return quality;},get microphone(){return micEnabled},get recording(){return recorder?.state==='recording'},get frames(){return recordingTicks}};
report('Quest: X → SETTINGS → CAMERA LAB. MIC OFF by default; optional local voice recording.');
})(typeof window!=='undefined'?window:globalThis);
