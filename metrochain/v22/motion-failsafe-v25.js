(()=>{
'use strict';
if(window.__MC25_MOTION_FAILSAFE__)return;
window.__MC25_MOTION_FAILSAFE__={fallback:false};
const canvases=()=>document.querySelectorAll('#liveMetroMap canvas.metro-train-canvas');
function showOriginal(){for(const c of canvases()){c.style.setProperty('display','block','important');c.style.setProperty('visibility','visible','important');c.style.setProperty('opacity','1','important');c.style.setProperty('pointer-events','none','important')}window.__MC25_MOTION_FAILSAFE__.fallback=true}
function hideOriginal(){for(const c of canvases()){c.style.setProperty('visibility','visible','important');c.style.setProperty('opacity','0','important');c.style.setProperty('pointer-events','none','important')}window.__MC25_MOTION_FAILSAFE__.fallback=false}
setTimeout(()=>{const s=window.__MC25_MOTION_BRIDGE__;if(!s||Number(s.captures||0)<1||Number(s.markers||0)<1)showOriginal()},5000);
setInterval(()=>{const s=window.__MC25_MOTION_BRIDGE__;if(window.__MC25_MOTION_FAILSAFE__.fallback&&s&&Number(s.captures||0)>0&&Number(s.markers||0)>0)hideOriginal()},1200);
})();