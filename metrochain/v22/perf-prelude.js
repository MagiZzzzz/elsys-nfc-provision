(()=>{
  'use strict';
  if(window.__MC22_PERF_PRELUDE__) return;
  window.__MC22_PERF_PRELUDE__=true;
  const nativeSetInterval=window.setInterval.bind(window);
  window.__MC22_NATIVE_SET_INTERVAL__=nativeSetInterval;

  window.setInterval=function(fn,delay,...args){
    const ms=Number(delay)||0;
    const src=typeof fn==='function'?Function.prototype.toString.call(fn):'';

    // v21 used to rescan a large part of the DOM every 900 ms. Keep the
    // metro incident fallback, but only every 5 s and never in other modes.
    if(ms===900&&/refreshIncidents/.test(src)){
      return nativeSetInterval(()=>{
        try{
          const mode=[...document.body.classList].find(c=>c.startsWith('mc22-map-mode-'))?.replace('mc22-map-mode-','')||'metro';
          if(mode==='metro') fn(...args);
        }catch(e){ console.warn('MetroChain incident refresh guard',e); }
      },5000);
    }

    // Page-change detection does not need ~4.5 checks/s.
    if(ms===220&&/visibleMain|transitionUntil/.test(src)){
      return nativeSetInterval(fn,500,...args);
    }

    // Structural decoration is idempotent; once every 10 s is sufficient.
    if(ms===3000&&/enhanceJourney|makeIncidentPanel/.test(src)){
      return nativeSetInterval(fn,10000,...args);
    }

    return nativeSetInterval(fn,delay,...args);
  };
})();
