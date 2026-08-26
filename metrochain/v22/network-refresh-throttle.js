(()=>{
'use strict';
if(window.__MC_NETWORK_REFRESH_THROTTLE__)return;
const nativeSetInterval=window.setInterval.bind(window);
window.setInterval=function(fn,ms,...args){
  const name=typeof fn==='function'?(fn.name||''):'';
  if(Number(ms)===10000&&name==='refresh')ms=60000;
  return nativeSetInterval(fn,ms,...args);
};
window.__MC_NETWORK_REFRESH_THROTTLE__={version:'v1',live_refresh_ms:60000};
})();
