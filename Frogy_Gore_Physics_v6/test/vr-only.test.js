// Static policy regressions for VR-only browser client and controller menu.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../public');
const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const boot=fs.readFileSync(path.join(dir,'bootstrap.js'),'utf8');
assert.match(game,/if\(!session && obj\.type!=='hello'\)return;/);
assert.match(game,/function drawDesktop\(time\)[\s\S]*?Do not render a playable desktop view/);
assert.match(game,/const toggleMenu=side==='left'&&\(edge\(4\)\|\|\(gp\.buttons\.length>7&&edge\(7\)\)\)/);
assert.match(game,/if\(!session\|\|phase!=='playing'\|\|!me\|\|me\.spectating\)return;/);
assert.match(html,/id="vrOnlyGate"/);
assert.match(html,/id="vrOnlyEnter"/);
assert.match(css,/body\.vr-only-landing \.shell/);
assert.match(boot,/navigator\.xr\?\.isSessionSupported/);
assert.match(boot,/if\(!supported\)/);
assert.match(boot,/await load\(filename\)/);
console.log('VR-only web gate/menu/inputs: passed');
