(()=>{
'use strict';
if(window.__MC26_MOTION_FAILSAFE__)return;
window.__MC26_MOTION_FAILSAFE__={version:'v26-continuous-failsafe',fallback:false,lastHealthyAt:0};
const canvases=()=>document.querySelectorAll('#liveMetroMap canvas.metro-train-canvas');
function setCanvas(show){for(const c of canvases()){c.style.setProperty('display','block','important');c.style.setProperty('visibility','visible','important');c.style.setProperty('opacity',show?'1':'0','important');c.style.setProperty('pointer-events','none','important')}}
function showOriginal(){setCanvas(true);window.__MC26_MOTION_FAILSAFE__.fallback=true}
function hideOriginal(){setCanvas(false);window.__MC26_MOTION_FAILSAFE__.fallback=false}
function selectedLineHasVehicles(){
 try{const f=eval('liveFeed'),s=new Set([...eval('liveSelectedLines')].map(String));if(!f||!s.size)return true;const ids=(f.lines||[]).map(l=>String(l.id)),all=ids.length&&ids.every(id=>s.has(id));if(all)return true;return(f.vehicles||[]).some(v=>s.has(String(v.line_id??v.line_code))&&v.service_state!=='upcoming'&&v.status!=='queued')}catch{return true}
}
function check(){
 const s=window.__MC26_MOTION_BRIDGE__,now=Date.now(),fresh=s&&now-Number(s.lastFrameAt||0)<2500,hasData=Number(s?.captures||0)>0,hasMarkers=Number(s?.markers||0)>0,expected=selectedLineHasVehicles();
 const healthy=fresh&&hasData&&(!expected||hasMarkers);
 if(healthy){window.__MC26_MOTION_FAILSAFE__.lastHealthyAt=now;hideOriginal()}else showOriginal();
}
setTimeout(check,1200);setInterval(check,850);
})();