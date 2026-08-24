(()=>{
'use strict';
if(window.__MC22_LEGACY_TRAIN_KILL__)return;
window.__MC22_LEGACY_TRAIN_KILL__='v22.13';
function apply(tries=0){
  if(tries>200)return;
  try{
    if(typeof drawTrain==='function'){
      window.__MC22_OLD_DRAW_TRAIN__=window.__MC22_OLD_DRAW_TRAIN__||drawTrain;
      drawTrain=function(){return;};
    }
    const root=document.getElementById('liveMetroMap');
    if(root){
      root.querySelectorAll('.train-marker,.metro-train,.vehicle-marker,.live-train,.train-dot').forEach(x=>x.remove());
    }
  }catch{}
  setTimeout(()=>apply(tries+1),250);
}
apply();
})();