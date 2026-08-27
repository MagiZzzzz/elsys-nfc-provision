(()=>{
'use strict';
if(window.__MC26_MOTION_BRIDGE__)return;
window.__MC26_MOTION_BRIDGE__={version:'v26-filter-safe-motion',captures:0,markers:0,lastFrameAt:0,selected:[],mode:'metro'};

const CAPTURE_TTL=2200,MARKER_TTL=3600;
let layer=null,installed=false,lastFlush=0,seq=0;
const captures=new Map(),markers=new Map(),objIds=new WeakMap();

function map(){try{return eval('liveLeaflet')}catch{return null}}
function feed(){try{return eval('liveFeed')}catch{return null}}
function root(){return document.getElementById('liveMetroMap')}
function activeMode(){return document.querySelector('.mc22-mode-btn.active')?.dataset?.mode||feed()?.mode||'metro'}
function selected(){try{return new Set([...eval('liveSelectedLines')].map(String))}catch{return new Set()}}
function norm(v){return String(v??'').trim().toUpperCase().replace(/^RER\s*/,'').replace(/^METRO\s*/,'').replace(/^M(?=\d)/,'').replace(/\s+/g,'').replace(/^3B$/,'3BIS').replace(/^7B$/,'7BIS')}
function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[s]))}
function scalar(v){
 if(v===undefined||v===null)return null;
 if(typeof v==='string'||typeof v==='number'){const s=String(v).trim();return s||null}
 if(Array.isArray(v)){for(const x of v){const s=scalar(x);if(s)return s}return null}
 if(typeof v==='object'){
  for(const k of ['value','line_id','lineId','line_code','lineCode','code','short_name','shortName','id']){const x=v[k];if(typeof x==='string'||typeof x==='number'){const s=String(x).trim();if(s)return s}}
 }
 return null;
}
function pick(o,names){if(!o||typeof o!=='object')return null;for(const k of names){const s=scalar(o[k]);if(s)return s}return null}
function idOf(t){
 let id=pick(t,['vehicle_id','vehicleId','VehicleId','trip_id','tripId','journey_id','journeyId','DatedVehicleJourneyRef']);
 if(!id)id=pick(t?.v,['vehicle_id','vehicleId','VehicleId','trip_id','tripId','journey_id','journeyId','DatedVehicleJourneyRef','id']);
 if(id)return id;
 if(t&&typeof t==='object'){id=objIds.get(t);if(!id){id='mc26obj:'+ ++seq;objIds.set(t,id)}return id}
 return 'mc26:'+ ++seq;
}
function lineOf(t){
 const scopes=[
  [t,['line_id','lineId','line_code','lineCode','PublishedLineName']],
  [t?.v,['line_id','lineId','line_code','lineCode','PublishedLineName']],
  [t?.vehicle,['line_id','lineId','line_code','lineCode','PublishedLineName']],
  [t?.line,['line_id','lineId','line_code','lineCode','code','short_name','shortName','id','PublishedLineName']]
 ];
 for(const [o,keys] of scopes){const s=pick(o,keys);if(s)return s}
 const lineScalar=scalar(t?.line);if(lineScalar&&lineScalar!=='[object Object]')return lineScalar;
 return '?';
}
function destOf(t){return pick(t,['destination_name','destinationName','destination','DestinationName'])||pick(t?.v,['destination_name','destinationName','destination','DestinationName'])||''}
function stateOf(status,t){const s=String(status??pick(t,['status','state','service_state'])??pick(t?.v,['status','state','service_state'])??'').toLowerCase();if(/station|quai|stop|arr[êe]t/.test(s))return'stopped';if(/approch/.test(s))return'approaching';if(/depart|départ/.test(s))return'departing';return'moving'}
function angleDeg(a){a=Number(a);if(!Number.isFinite(a))return 0;return Math.abs(a)<=7.1?a*180/Math.PI:a}
function fallbackActive(){return Boolean(window.__MC26_MOTION_FAILSAFE__?.fallback)}
function ensureCanvasState(){const r=root();if(!r)return;const opacity=fallbackActive()?'1':'0';for(const c of r.querySelectorAll('canvas.metro-train-canvas')){c.style.setProperty('display','block','important');c.style.setProperty('opacity',opacity,'important');c.style.setProperty('visibility','visible','important');c.style.setProperty('pointer-events','none','important')}}
function canvasPoint(ctx,x,y){const m=map(),r=root(),c=ctx?.canvas;if(!m||!r||!c||!r.contains(c))return null;const cr=c.getBoundingClientRect(),rr=r.getBoundingClientRect();if(cr.width<10||cr.height<10)return null;let sx=1,sy=1;if(Number(x)>cr.width*1.2||Number(y)>cr.height*1.2){sx=cr.width/Math.max(1,c.width);sy=cr.height/Math.max(1,c.height)}const px=(cr.left-rr.left)+Number(x)*sx,py=(cr.top-rr.top)+Number(y)*sy;if(!Number.isFinite(px)||!Number.isFinite(py)||px<-100||py<-100||px>rr.width+100||py>rr.height+100)return null;const ll=m.containerPointToLatLng([px,py]);return ll&&Number.isFinite(ll.lat)&&Number.isFinite(ll.lng)?[ll.lat,ll.lng]:null}
function capture(ctx,t,x,y,angle,status){const p=canvasPoint(ctx,x,y);if(!p)return;const id=idOf(t),line=lineOf(t),state=stateOf(status,t);captures.set(id,{id,line:String(line),dest:destOf(t),lat:p[0],lon:p[1],angle:angleDeg(angle),state,at:performance.now()});window.__MC26_MOTION_BRIDGE__.captures=captures.size}
function hook(){if(typeof window.drawTrain!=='function')return false;const cur=window.drawTrain;if(cur.__mc26MotionBridge)return true;const original=cur.__mc25Original||cur;const wrapped=function(ctx,t,x,y,angle,status,...rest){capture(ctx,t,x,y,angle,status);return original.call(this,ctx,t,x,y,angle,status,...rest)};Object.assign(wrapped,cur);wrapped.__mc26MotionBridge=true;wrapped.__mc26Original=original;window.drawTrain=wrapped;installed=true;return true}
function ensureLayer(){const m=map();if(!m||typeof L==='undefined')return false;if(!layer)layer=L.layerGroup().addTo(m);return true}
function lineMeta(code){const f=feed(),n=norm(code);for(const l of f?.lines||[]){if(norm(l.code??l.id)===n||norm(l.id)===n)return l}return null}
function iconHtml(c){const l=lineMeta(c.line),color=l?.color||({'1':'#ffcd00','2':'#003ca6','3':'#837902','3BIS':'#6ec4e8','4':'#be418d','5':'#ff7e2e','6':'#6eca97','7':'#fa9aba','7BIS':'#6eca97','8':'#e19bdf','9':'#b6bd00','10':'#c9910d','11':'#704b1c','12':'#007852','13':'#6ec4e8','14':'#62259d'})[norm(c.line)]||'#60758a';return `<div class="mc26-train ${c.state}" style="--mc26-line:${color};--mc26-angle:${Number(c.angle||0).toFixed(1)}deg"><i></i><i></i><i></i></div>`}
function title(c){const m=activeMode(),label=m==='metro'?'Métro':m==='rer'?'RER':m==='transilien'?'Transilien':m==='tram'?'Tram':'Bus',st=c.state==='stopped'?'à quai':c.state==='approaching'?'en approche':c.state==='departing'?'départ':'en route';return `${label} ${esc(c.line)}${c.dest?' · '+esc(c.dest):''} · ${st}`}
function selectionInfo(){
 const s=selected(),sn=new Set([...s].map(norm)),allIds=(feed()?.lines||[]).map(l=>norm(l.id??l.code)).filter(Boolean);
 const all=!s.size||(allIds.length>0&&allIds.every(id=>sn.has(id)));
 window.__MC26_MOTION_BRIDGE__.selected=[...s];window.__MC26_MOTION_BRIDGE__.mode=activeMode();
 return{s,sn,all};
}
function allowed(c,info){if(info.all)return true;const n=norm(c.line);if(!n||n==='?')return false;return info.sn.has(n)}
function setClass(mk,c){const el=mk.getElement()?.querySelector('.mc26-train');if(!el)return;el.style.setProperty('--mc26-angle',`${Number(c.angle||0).toFixed(1)}deg`);for(const x of['stopped','approaching','departing','moving'])el.classList.toggle(x,x===c.state)}
function flush(now){
 if(now-lastFlush<66){requestAnimationFrame(flush);return}lastFlush=now;window.__MC26_MOTION_BRIDGE__.lastFrameAt=Date.now();if(!ensureLayer()){requestAnimationFrame(flush);return}
 const info=selectionInfo(),seen=new Set();
 for(const [id,c] of captures){if(now-c.at>CAPTURE_TTL||!allowed(c,info))continue;seen.add(id);let e=markers.get(id);if(!e){const icon=L.divIcon({className:'mc26-vehicle-host',html:iconHtml(c),iconSize:[34,22],iconAnchor:[17,11]});const mk=L.marker([c.lat,c.lon],{icon,keyboard:false,interactive:true,zIndexOffset:1700}).addTo(layer);mk.bindTooltip(title(c),{direction:'top',offset:[0,-8]});e={mk,last:now,line:norm(c.line)};markers.set(id,e)}else{e.mk.setLatLng([c.lat,c.lon]);e.last=now;e.line=norm(c.line);setClass(e.mk,c);if(e.mk.getTooltip())e.mk.setTooltipContent(title(c))}}
 for(const [id,e] of markers){if(!seen.has(id)&&(now-e.last>MARKER_TTL||(!info.all&&!info.sn.has(e.line)))){layer.removeLayer(e.mk);markers.delete(id)}}
 window.__MC26_MOTION_BRIDGE__.markers=markers.size;ensureCanvasState();requestAnimationFrame(flush)
}
function installStyle(){if(document.getElementById('mc26-motion-style'))return;document.getElementById('mc25-motion-style')?.remove();const s=document.createElement('style');s.id='mc26-motion-style';s.textContent=`#liveMetroMap canvas.metro-train-canvas{visibility:visible!important;pointer-events:none!important}#liveMetroMap .mc25-vehicle-host{display:none!important}#liveMetroMap .mc26-vehicle-host{background:transparent!important;border:0!important;width:34px!important;height:22px!important;overflow:visible!important}#liveMetroMap .mc26-train{width:29px;height:13px;box-sizing:border-box;border-radius:4px;background:#101b26;border:1.7px solid var(--mc26-line);box-shadow:0 1px 4px rgba(0,0,0,.34);transform:rotate(var(--mc26-angle));transform-origin:50% 50%;display:flex;align-items:center;justify-content:center;gap:2px;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}#liveMetroMap .mc26-train i{display:block;width:5px;height:3.5px;border-radius:1px;background:#dceaf5}.mc26-train.stopped{background:#49d5a6!important;border-color:#fff!important;box-shadow:0 0 0 3px rgba(73,213,166,.27),0 1px 4px rgba(0,0,0,.34)!important}.mc26-train.stopped i{background:#17322b!important}.mc26-train.approaching{background:#f2a93b!important;border-color:#fff!important}.mc26-train.departing{background:#2f6fb3!important;border-color:#dcebff!important}`;document.head.appendChild(s)}
function init(tries=0){installStyle();ensureCanvasState();hook();if(tries<180&&(!installed||!map()))setTimeout(()=>init(tries+1),80)}
init();setInterval(()=>{ensureCanvasState();hook()},500);requestAnimationFrame(flush);
})();