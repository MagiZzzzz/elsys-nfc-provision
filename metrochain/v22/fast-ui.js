(()=>{
'use strict';
if(window.__MC225_FAST_UI__)return;
window.__MC225_FAST_UI__='v22.5-freeze-guard';
window.__MC224_FAST_UI__='v22.5-freeze-guard';
window.__MC225_FAST_UI_STATE__={startupWarmRequests:0,intentWarmRequests:0,memoryHits:0,pendingHits:0};

// Stability first: v22.5 performs no speculative multimodal request at all.
// A feed is requested only after the user actually selects its network mode.
// This avoids multi-megabyte background JSON parsing, synchronous storage work,
// duplicate requests and races between prefetching and mode transitions.

function installFrameBatching(tries=0){
  if(tries>160)return;
  const names=['renderLiveFilters','renderLiveNetwork','renderLineStops','renderLineStats'];
  let ready=true;
  for(const n of names)if(typeof window[n]!=='function')ready=false;
  if(!window.__MC22_THEME__||!ready){setTimeout(()=>installFrameBatching(tries+1),50);return}
  for(const name of names){
    const orig=window[name];
    if(orig.__mc225batched||orig.__mc224batched)continue;
    let raf=0,lastArgs=null,lastThis=null;
    const wrapped=function(...args){
      lastArgs=args;lastThis=this;
      if(raf)return;
      raf=requestAnimationFrame(()=>{
        raf=0;
        const a=lastArgs,t=lastThis;
        lastArgs=null;lastThis=null;
        orig.apply(t,a||[]);
      });
    };
    wrapped.__mc225batched=true;
    wrapped.__mc224batched=true;
    wrapped.__mc225original=orig;
    window[name]=wrapped;
  }
}
installFrameBatching();
})();
