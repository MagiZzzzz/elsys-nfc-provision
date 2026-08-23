(()=>{
'use strict';
if(window.__MC225_FREEZE_GUARD__)return;
const nativeSetInterval=window.setInterval.bind(window);
const state=window.__MC225_FREEZE_GUARD__={version:'v22.5',incidentPolls:0,pagePolls:0,structurePolls:0};
const currentMode=()=>{
  const c=[...document.body.classList].find(x=>x.startsWith('mc22-map-mode-'));
  return c?c.replace('mc22-map-mode-',''):'metro';
};
window.setInterval=function(fn,delay,...args){
  const ms=Number(delay)||0;
  const src=typeof fn==='function'?Function.prototype.toString.call(fn):'';
  if(ms===900&&/refreshIncidents/.test(src)){
    state.incidentPolls++;
    return nativeSetInterval(()=>{
      if(document.hidden||currentMode()!=='metro')return;
      fn(...args);
    },5000);
  }
  if(ms===220&&/visibleMain|transitionUntil/.test(src)){
    state.pagePolls++;
    return nativeSetInterval(fn,500,...args);
  }
  if(ms===3000&&/enhanceJourney|makeIncidentPanel/.test(src)){
    state.structurePolls++;
    return nativeSetInterval(fn,10000,...args);
  }
  return nativeSetInterval(fn,delay,...args);
};
})();
