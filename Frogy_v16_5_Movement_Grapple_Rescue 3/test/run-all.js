'use strict';
// Run each regression in a fresh process; a stuck test times out instead of
// holding the entire npm test command indefinitely. Fixed-port integration
// tests are never started concurrently.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const files=fs.readdirSync(__dirname).filter(n=>n.endsWith('.test.js')).sort();
let passed=0,failed=0;
for(const file of files){
 const result=cp.spawnSync(process.execPath,[path.join(__dirname,file)],{
  cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:35000,maxBuffer:2*1024*1024,
  env:{...process.env}
 });
 if(result.status===0){passed++;console.log('PASS '+file);}
 else{
  failed++;console.error('FAIL '+file+': '+(result.error?.message||'exit '+result.status));
  console.error((result.stderr||result.stdout||'').slice(-1800));
 }
}
console.log(`Frogy regression results: ${passed} passed, ${failed} failed / ${files.length} files.`);
if(failed)process.exitCode=1;
