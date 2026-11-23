'use strict';
/* Device-local preferences; cosmetic inventories and coins remain server authoritative. */
const FrogySettings=(()=>{
 const defaults={music:true,sfx:true,volume:70,voiceMuted:false,joystickTurning:false,turnMode:'snap',snapAngle:45,turnSpeed:100,comfortVignette:false,graphics:'balanced',effects:true};
 let stored={};try{stored=JSON.parse(localStorage.getItem('frogy-settings-v5')||'{}')||{};}catch{}
 const state={...defaults,...stored},listeners=new Set();
 function set(name,val){if(!(name in defaults))return;if(['music','sfx','voiceMuted','joystickTurning','comfortVignette','effects'].includes(name))val=!!val;
 if(name==='volume')val=Math.max(0,Math.min(100,Number(val)||0));
 if(name==='snapAngle')val=[30,45,60,90].includes(Number(val))?Number(val):45;
 if(name==='turnSpeed')val=Math.max(45,Math.min(180,Number(val)||100));
 if(name==='turnMode'&&!['snap','smooth'].includes(val))return;
 if(name==='graphics'&&!['low','balanced','high'].includes(val))return;
 state[name]=val;try{localStorage.setItem('frogy-settings-v5',JSON.stringify(state));}catch{}
 for(const fn of listeners)try{fn(name,val,state);}catch(e){console.warn('Settings listener error',e);}}
 function subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
 return {state,set,subscribe,defaults};
})();
window.FrogySettings=FrogySettings;
