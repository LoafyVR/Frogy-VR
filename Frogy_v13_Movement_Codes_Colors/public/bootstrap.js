(function(){
 'use strict';
 // Only load the 3D client if this browser can actually host an immersive VR session.
 // Desktop/mobile browsers get a static launcher; no assets/gameplay/events are loaded.
 const status=document.getElementById('vrOnlyStatus');
 const button=document.getElementById('vrOnlyEnter');
 let engineError=null;
 window.addEventListener('error',e=>{if(!engineError && e.error)engineError=e.error;});
 function say(message){if(status)status.textContent=message;}
 function load(scriptName){return new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src='/'+scriptName+'?v=13.0';el.async=false;
  el.onload=resolve;el.onerror=()=>reject(new Error('Failed to load '+scriptName));
  document.body.appendChild(el);
 });}
 async function main(){
  button.disabled=true;
  if(!navigator.xr?.isSessionSupported){
   say('Frogy requires immersive VR in Meta Quest Browser. Desktop and mobile gameplay are disabled.');return;
  }
  let supported=false;
  try{supported=await navigator.xr.isSessionSupported('immersive-vr');}
  catch(e){say('Could not check immersive VR support: '+e.message);return;}
  if(!supported){say('Immersive VR is unavailable. Open this link in Meta Quest Browser on your headset.');return;}
  say('Quest headset detected. Loading Frogy VR…');
  try{
   for(const filename of ['world.js','voice.js','settings.js','audio.js','movement.js','cling.js','controls.js','hub.js','collision.js','grapple.js','voteboard.js','game.js','features.js','detail.js','landmarks.js'])
    await load(filename);
   if(engineError)throw engineError;
   if(typeof connect!=='function')throw new Error('Game engine could not start');
   connect();
   say('Ready to enter VR. Press ENTER FROGY VR, then choose a public or private room inside the headset.');
   button.disabled=false;
  }catch(e){say('VR game failed to load: '+e.message);button.disabled=true;}
 }
 main();
})();
