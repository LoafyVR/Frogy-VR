'use strict';
// Server-authoritative economy. Eastern Time (America/New_York) handles both EST and EDT.
const crypto=require('node:crypto');
const easternFormat=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
function easternDay(ms=Date.now()){const p=Object.fromEntries(easternFormat.formatToParts(new Date(ms)).filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}`;}
function nextEasternMidnight(ms=Date.now()){
 const today=easternDay(ms);let lo=ms,hi=ms+30*3600000;
 // Binary search for the next date change in New York; reliable on 23/25h DST days.
 if(easternDay(hi)===today)throw new Error('Eastern midnight could not be located');
 while(hi-lo>1000){const mid=Math.floor((hi+lo)/2);if(easternDay(mid)===today)lo=mid;else hi=mid;}
 return hi;
}
const DAILY_CRICKETS=100;
const TOOLS=Object.freeze([
 {id:'speed',name:'Swift Legs',emoji:'💨',price:50,role:'survivor',description:'2× arm-running speed for one round'},
 {id:'rocket',name:'Rocket Hop',emoji:'🚀',price:200,role:'survivor',description:'One powerful upward rocket launch'},
 {id:'doubleJump',name:'Double Hop',emoji:'🐸',price:100,role:'survivor',description:'Jump again once while airborne, until the round ends'},
 {id:'shapeshift',name:'Frog Disguise',emoji:'🎭',price:100,role:'monster',description:'Appear like an ordinary frog until your next attack'},
 {id:'jumpscare',name:'Bog Fright',emoji:'👹',price:120,role:'monster',description:'One spooky nearby-player scare per match'}
]);
const TOOL_IDS=new Map(TOOLS.map(x=>[x.id,x]));
const QUEST_POOL=Object.freeze([
 {id:'play-monster',name:'The Big Bad Frog',description:'Finish 1 round as the Mega Frog',target:1,reward:100,event:'monsterRound'},
 {id:'play-survivor',name:'Small But Brave',description:'Finish 1 round as a survivor',target:1,reward:100,event:'survivorRound'},
 {id:'play-two',name:'Pond Regular',description:'Finish 2 rounds',target:2,reward:110,event:'roundFinished'},
 {id:'grab-weapon',name:'Gear Up',description:'Pick up 1 weapon during a match',target:1,reward:100,event:'grabWeapon'},
 {id:'hit-monster',name:'Stand Your Ground',description:'Damage the Mega Frog once',target:1,reward:110,event:'hitMonster'},
 {id:'win-round',name:'Victory Ribbit',description:'Win 1 match',target:1,reward:120,event:'winRound'}
]);
function todayQuests(token,day){const seed=crypto.createHash('sha256').update(token+'|'+day).digest();const bag=[...QUEST_POOL];const list=[];let i=0;while(list.length<3){const k=seed[i++]%bag.length;list.push({...bag.splice(k,1)[0]});}return list;}
function normalizeProfile(p,token,now=Date.now()){
 if(!Number.isFinite(p.crickets))p.crickets=Number.isFinite(p.coins)?p.coins:90;
 if(!Number.isFinite(p.dabloons))p.dabloons=0;
 if(!p.lastCricketDay)p.lastCricketDay=Number.isFinite(p.lastRewardAt)?easternDay(p.lastRewardAt):p.lastLoginDay||'';
 if(!p.quests||!Array.isArray(p.quests.entries))p.quests={day:'',entries:[]};
 if(!p.tools||typeof p.tools!=='object'||Array.isArray(p.tools))p.tools={};
 for(const x of TOOLS){if(!Number.isSafeInteger(p.tools[x.id])||p.tools[x.id]<0)p.tools[x.id]=0;}
 if(!Array.isArray(p.friends))p.friends=[];
 if(!Array.isArray(p.friendRequests))p.friendRequests=[];
 if(!p.publicId)p.publicId='F'+crypto.randomBytes(5).toString('hex').toUpperCase();
 if(!p.name)p.name='Lil Frog';
 if(!Array.isArray(p.inventory))p.inventory=[];
 if(!p.stats)p.stats={wins:0,kills:0,rounds:0};
 if(!p.equipped)p.equipped={hat:'none',face:'none',back:'none'};
 if(!p.color)p.color='mint';
 if(!Array.isArray(p.redeemedCodes))p.redeemedCodes=[];
 p.ownerTag=p.ownerTag===true;
 p.modTag=p.modTag===true;
 return p;
}
function refreshDaily(p,token,now=Date.now()){
 const day=easternDay(now);let earned=0;
 if(p.lastCricketDay!==day){earned=DAILY_CRICKETS;p.crickets+=earned;p.lastCricketDay=day;}
 if(p.quests.day!==day){p.quests={day,entries:todayQuests(token,day).map(q=>({...q,progress:0,claimed:false}))};}
 return earned;
}
function awardQuestEvent(p,event,amount=1){let earned=0;const completed=[];
 for(const q of p.quests?.entries||[]){if(q.event!==event||q.claimed)continue;
  q.progress=Math.min(q.target,q.progress+amount);
  if(q.progress>=q.target){q.claimed=true;p.dabloons+=q.reward;earned+=q.reward;completed.push(q.id);}
 }
 return {earned,completed};
}
module.exports={easternDay,nextEasternMidnight,normalizeProfile,refreshDaily,awardQuestEvent,DAILY_CRICKETS,TOOLS,TOOL_IDS,QUEST_POOL,todayQuests};
