'use strict';
// Authoritative promo redemptions. Only DJHQW is repeatable, and it is owner-only.
// Owner codes require an allowlisted
// persistent Frogy public ID. Never use client-supplied roles or secrets for auth.
const PUBLIC=Object.freeze({FROG:{crickets:500,dabloons:500},FREE:{crickets:100,dabloons:100}});
const DEVELOPER=Object.freeze({EMPSH:{owner:true},DJHQW:{crickets:10000,dabloons:10000},IHVDL:{mod:true}});
function ownerAllowed(profile, env=process.env){
 const ids=String(env.FROGY_DEV_PUBLIC_IDS||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
 return !!profile?.publicId&&ids.includes(String(profile.publicId).toUpperCase());
}
function modAllowed(profile, env=process.env){
 const ids=String(env.FROGY_MOD_PUBLIC_IDS||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
 return !!profile?.publicId&&ids.includes(String(profile.publicId).toUpperCase());
}
function canModerate(profile,env=process.env){return !!(profile?.ownerTag&&ownerAllowed(profile,env)||profile?.modTag&&modAllowed(profile,env));}
function redeem(profile,raw,env=process.env){
 if(!profile)return {ok:false,message:'Profile not ready.'};
 const code=String(raw||'').trim().toUpperCase();
 if(!/^[A-Z0-9]{3,12}$/.test(code))return {ok:false,message:'Invalid code format.'};
 const reward=PUBLIC[code]||DEVELOPER[code];
 if(!reward)return {ok:false,message:'Code not found.'};
 if(DEVELOPER[code]&&!(code==='IHVDL'?modAllowed(profile,env):ownerAllowed(profile,env)))return {ok:false,message:'This code is restricted to the developer account.'};
 if(!Array.isArray(profile.redeemedCodes))profile.redeemedCodes=[];
 if(code!=='DJHQW'&&profile.redeemedCodes.includes(code))return {ok:false,message:'You already redeemed this code.'};
 // Never trust amounts from the socket. Awards come exclusively from the catalog.
 // A repeatable developer reward must not overflow safe integer currency balances.
 if((Number(profile.crickets)||0)>Number.MAX_SAFE_INTEGER-(reward.crickets||0)||
    (Number(profile.dabloons)||0)>Number.MAX_SAFE_INTEGER-(reward.dabloons||0))return {ok:false,message:'Currency limit reached.'};
 profile.crickets=(Number(profile.crickets)||0)+(reward.crickets||0);
 profile.dabloons=(Number(profile.dabloons)||0)+(reward.dabloons||0);
 profile.coins=profile.crickets;
 if(reward.owner)profile.ownerTag=true;
 if(reward.mod)profile.modTag=true;
 if(code!=='DJHQW')profile.redeemedCodes.push(code);
 return {ok:true,message:reward.owner?'OWNER title unlocked!':reward.mod?'MOD title unlocked! Moderation tools enabled.':`Redeemed ${code}: +${reward.crickets} Crickets and +${reward.dabloons} Dabloons.`,code};
}
module.exports={PUBLIC,DEVELOPER,redeem,ownerAllowed,modAllowed,canModerate};
