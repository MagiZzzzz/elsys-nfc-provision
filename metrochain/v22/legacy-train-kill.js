(()=>{
'use strict';
if(window.__MC22_LEGACY_TRAIN_KILL__)return;
window.__MC22_LEGACY_TRAIN_KILL__='v22.14-observer';
function disableOldRenderer(){try{if(typeof drawTrain==='function'){window.__MC22_OLD_DRAW_TRAIN__=window.__MC22_OLD_DRAW_TRAIN__||drawTrain;drawTrain=function(){}}}catch{}}
function clean(root){if(!root)return;root.querySelectorAll('.train-marker,.metro-train,.vehicle-marker,.live-train,.train-dot').forEach(x=>x.remove())}
function start(tries=0){disableOldRenderer();const root=document.getElementById('liveMetroMap');if(!root){if(tries<160)setTimeout(()=>start(tries+1),75);return}clean(root);const mo=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes){if(!(n instanceof Element))continue;if(n.matches?.('.train-marker,.metro-train,.vehicle-marker,.live-train,.train-dot'))n.remove();else clean(n)}});mo.observe(root,{childList:true,subtree:true})}
start();
})();