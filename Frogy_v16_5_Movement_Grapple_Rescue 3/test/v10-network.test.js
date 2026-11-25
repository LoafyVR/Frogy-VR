'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'frogy-v10-integration-'));
process.env.FROGY_DATA_DIR=temp;
const {server}=require('../server.js');
function client(url){const ws=new WebSocket(url),q=[],subs=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);q.push(m);for(const f of [...subs])f();});
 const opened=new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 function wait(type,pred=()=>true,timeout=3000){return new Promise((resolve,reject)=>{let timer;
  const check=()=>{const i=q.findIndex(m=>m.type===type&&pred(m));if(i<0)return;clearTimeout(timer);subs.splice(subs.indexOf(check),1);resolve(q.splice(i,1)[0]);};
  subs.push(check);timer=setTimeout(()=>{subs.splice(subs.indexOf(check),1);reject(Error('Timeout waiting for '+type));},timeout);check();
 });}
 return {ws,opened,send:m=>ws.send(JSON.stringify(m)),wait};}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='ws://127.0.0.1:'+server.address().port+'/ws',mod=client(url),visitor=client(url);
 try{
  await Promise.all([mod.opened,visitor.opened]);mod.send({type:'hello'});visitor.send({type:'hello'});
  const mp=await mod.wait('profile'),vp=await visitor.wait('profile');
  mod.send({type:'public',name:'ModeratorFrog'});const mJoin=await mod.wait('joined');
  visitor.send({type:'public',name:'OtherFrog'});const vJoin=await visitor.wait('joined');
  assert.equal(mJoin.code,vJoin.code);
  visitor.send({type:'kickPlayer',playerId:mJoin.id});assert.equal((await visitor.wait('moderationResult')).ok,false);
  process.env.FROGY_MOD_PUBLIC_IDS=mp.publicId;
  mod.send({type:'redeemCode',code:'IHVDL'});
  assert.equal((await mod.wait('codeResult')).ok,true);
  const raised=await mod.wait('profile',m=>m.modTag);assert.equal(raised.canModerate,true);
  mod.send({type:'redeemCode',code:'IHVDL'});assert.equal((await mod.wait('codeResult',m=>!m.ok)).ok,false);
  mod.send({type:'kickPlayer',playerId:vJoin.id});
  assert.equal((await mod.wait('moderationResult',m=>m.ok)).ok,true);
  assert.equal((await visitor.wait('kicked')).type,'kicked');
  visitor.send({type:'join',code:mJoin.code,name:'OtherFrog'});
  assert.match((await visitor.wait('error')).message,/removed/i);
  console.log('PASS v10 network: two public players, unauthorized kick rejected, one-use MOD unlock, authorized kick, rejoin blocked');
 }finally{mod.ws.close();visitor.ws.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close(()=>{});fs.rmSync(temp,{recursive:true,force:true});process.exitCode=1;});
