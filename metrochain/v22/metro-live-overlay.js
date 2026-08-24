(()=>{
'use strict';
if(window.__MC22_NETWORK_OVERLAY__)return;
window.__MC22_NETWORK_OVERLAY__='v22.16-smooth-trains';
const BASE='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/';
const METRO_COLORS={'1':'#ffcd00','2':'#003ca6','3':'#837902','3BIS':'#6ec4e8','4':'#be418d','5':'#ff7e2e','6':'#6eca97','7':'#fa9aba','7BIS':'#6eca97','8':'#e19bdf','9':'#b6bd00','10':'#c9910d','11':'#704b1c','12':'#007852','13':'#6ec4e8','14':'#62259d'};
const REFRESH_MS=2600,MOVE_MS=2850;
let layer=null,busy=false,timer=null,lastMode=null,raf=0;
const markers=new Map();
function mode(){return document.querySelector('.mc22-mode-btn.active')?.dataset?.mode||'metro'}
function map(){try{return eval('liveLeaflet')}catch{return null}}
function selected(){try{return new Set([...eval('liveSelectedLines')].map(String))}catch{return new Set()}}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ensureLayer(){const m=map();if(!m||typeof L==='undefined')return null;if(!layer)layer=L.layerGroup().addTo(m);return layer}
function clearMarkers(){if(layer)layer.clearLayers();markers.clear()}
function killLegacyCanvas(){const root=document.getElementById('liveMetroMap');if(!root)return;root.querySelectorAll('canvas.metro-train-canvas').forEach(c=>{c.style.setProperty('display','none','important');c.style.setProperty('visibility','hidden','important');c.style.setProperty('opacity','0','important');c.style.pointerEvents='none';c.setAttribute('aria-hidden','true')})}
function installStyle(){if(document.getElementById('mc22-network-overlay-style-v2216'))return;document.getElementById('mc22-network-overlay-style')?.remove();const s=document.createElement('style');s.id='mc22-network-overlay-style-v2216';s.textContent=`
#liveMetroMap canvas.metro-train-canvas{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#liveMetroMap .train-marker,#liveMetroMap .metro-train,#liveMetroMap .vehicle-marker,#liveMetroMap .live-train,#liveMetroMap .train-dot{display:none!important}
#liveMetroMap .mc22-vehicle-host{background:transparent!important;border:0!important;width:42px!important;height:24px!important;margin-left:-21px!important;margin-top:-12px!important;overflow:visible!important}
#liveMetroMap .mc22-train{position:relative;width:38px;height:18px;box-sizing:border-box;border-radius:5px;background:#101923;border:2px solid var(--line);box-shadow:0 2px 7px rgba(0,0,0,.42),0 0 0 1px rgba(255,255,255,.20) inset;transform:rotate(var(--angle,0deg));transform-origin:50% 50%;will-change:transform;display:flex;align-items:center;justify-content:center;gap:2px;pointer-events:auto}
#liveMetroMap .mc22-train:after{content:'';position:absolute;left:3px;right:3px;bottom:1px;height:3px;border-radius:2px;background:var(--line)}
#liveMetroMap .mc22-train .win{width:7px;height:6px;border-radius:1.5px;background:#dbe9f5;box-shadow:0 0 3px rgba(219,233,245,.35)}
#liveMetroMap .mc22-train .code{position:absolute;left:-7px;top:2px;min-width:12px;height:12px;padding:0 2px;border-radius:3px;background:var(--line);color:var(--text,#fff)!important;border:1px solid rgba(255,255,255,.7);font:900 7px/12px system-ui;text-align:center;letter-spacing:-.04em;transform:rotate(calc(-1 * var(--angle,0deg)));transform-origin:50% 50%}
#liveMetroMap .mc22-train.projected{opacity:.72;border-style:dashed}
#liveMetroMap .mc22-train.live{box-shadow:0 0 0 2px rgba(73,213,166,.18),0 2px 7px rgba(0,0,0,.42),0 0 0 1px rgba(255,255,255,.20) inset}
#liveMetroMap .mc22-train.at-station{filter:brightness(1.12)}
`;document.head.appendChild(s);killLegacyCanvas()}
function endpoint(m){return m==='metro'?BASE+'metro-vehicles-feed':BASE+'network-live-feed-v2?mode='+encodeURIComponent(m)}
function modeLabel(m){return ({metro:'Métro',rer:'RER',transilien:'Transilien',tram:'Tram',bus:'Bus'})[m]||m}
function codeOf(v){return String(v.line_code??v.line_id??'?').replace(/IDFM:/i,'').replace(/BIS/i,'b')}
function normColor(c){c=String(c||'').trim();if(!c)return'#60758a';return c.startsWith('#')?c:'#'+c}
function textColor(l){return normColor(l?.text_color||'#ffffff')}
function lineMap(data,m){const out=new Map();for(const l of data?.lines||[]){out.set(String(l.id),l);if(l.code)out.set(String(l.code).toUpperCase(),l);if(l.route_id)out.set(String(l.route_id),l)}if(m==='metro')for(const [k,c] of Object.entries(METRO_COLORS))out.set(k,{id:k,code:k,color:c,text_color:'#fff'});return out}
function lineFor(lm,v){return lm.get(String(v.line_id))||lm.get(String(v.line_code??'').toUpperCase())||lm.get(String(v.route_id??''))||null}
function bearingAngle(aLat,aLon,bLat,bLon,old=0){const dlat=bLat-aLat,dlon=(bLon-aLon)*Math.cos(((aLat+bLat)/2)*Math.PI/180);if(Math.hypot(dlat,dlon)<1e-8)return old;return Math.atan2(-dlat,dlon)*180/Math.PI}
function markerHtml(v,l,angle=0){const color=normColor(l?.color||METRO_COLORS[String(v.line_id).toUpperCase()]||'#60758a'),txt=textColor(l),live=!v.simulation&&!v.stale_projection&&v.projection_kind!=='stale_simulated',station=v.status==='at_station';return `<div class="mc22-train ${live?'live':'projected'} ${station?'at-station':''}" style="--line:${color};--text:${txt};--angle:${Number(angle).toFixed(1)}deg"><i class="win"></i><i class="win"></i><i class="win"></i><span class="code">${esc(codeOf(v))}</span></div>`}
function title(v,m){const status=v.status==='at_station'?'À quai':v.status==='approaching'?'À l’approche':v.status==='holding'?'Retenu':'En route';return `${modeLabel(m)} ${esc(codeOf(v))} · ${esc(status)}${v.destination_name?' · vers '+esc(v.destination_name):''}`}
function sample(e,t){if(!e.duration||t>=e.start+e.duration)return[e.targetLat,e.targetLon];const p=Math.max(0,Math.min(1,(t-e.start)/e.duration));const q=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;return[e.fromLat+(e.targetLat-e.fromLat)*q,e.fromLon+(e.targetLon-e.fromLon)*q]}
function upsert(v,l,m){const id=m+':'+String(v.vehicle_id),lat=Number(v.latitude),lon=Number(v.longitude),now=performance.now();let e=markers.get(id);if(!e){const angle=0,icon=L.divIcon({className:'mc22-vehicle-host',html:markerHtml(v,l,angle),iconSize:[42,24],iconAnchor:[21,12]});const mk=L.marker([lat,lon],{icon,keyboard:false,zIndexOffset:1500,interactive:true});mk.bindTooltip(title(v,m),{direction:'top',offset:[0,-13]});mk.addTo(layer);e={mk,fromLat:lat,fromLon:lon,targetLat:lat,targetLon:lon,currentLat:lat,currentLon:lon,start:now,duration:0,angle,vehicle:v,line:l,seen:true};markers.set(id,e)}else{const cur=sample(e,now),angle=bearingAngle(cur[0],cur[1],lat,lon,e.angle);e.currentLat=cur[0];e.currentLon=cur[1];e.fromLat=cur[0];e.fromLon=cur[1];e.targetLat=lat;e.targetLon=lon;e.start=now;e.duration=(Math.abs(lat-cur[0])+Math.abs(lon-cur[1])<1e-8)?0:MOVE_MS;e.angle=angle;e.vehicle=v;e.line=l;e.mk.setIcon(L.divIcon({className:'mc22-vehicle-host',html:markerHtml(v,l,angle),iconSize:[42,24],iconAnchor:[21,12]}));if(e.mk.getTooltip())e.mk.setTooltipContent(title(v,m));e.seen=true}}
function animate(t){for(const e of markers.values()){const p=sample(e,t);e.currentLat=p[0];e.currentLon=p[1];e.mk.setLatLng(p)}raf=requestAnimationFrame(animate)}
function sweep(){for(const [id,e] of markers){if(e.seen){e.seen=false;continue}layer.removeLayer(e.mk);markers.delete(id)}}
async function refresh(){if(busy||document.hidden)return;killLegacyCanvas();const m=mode(),mp=map(),ly=ensureLayer();if(!mp||!ly)return;if(lastMode!==m){clearMarkers();lastMode=m}busy=true;try{const r=await fetch(endpoint(m),{cache:'no-store'}),d=await r.json();if(!r.ok||!d?.ok)return;const lm=lineMap(d,m),sel=selected(),all=!sel.size||(d.lines&&sel.size>=d.lines.length)||(m==='metro'&&sel.size>=16);const rows=(d.vehicles||[]).filter(v=>{if(all)return true;const l=lineFor(lm,v);return sel.has(String(v.line_id))||sel.has(String(v.line_code??''))||(l&&sel.has(String(l.id)))}).filter(v=>Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))).filter(v=>v.service_state!=='upcoming'&&v.status!=='queued');for(const v of rows)upsert(v,lineFor(lm,v),m);sweep();const el=document.getElementById('liveUpdatedAt');if(el)el.textContent=`${rows.length} ${modeLabel(m)} en circulation · mouvement lissé · ${d.degraded?'projection de secours':'PRIM / IDFM'}`}catch(e){console.debug('MetroChain smooth network overlay',e)}finally{busy=false}}
function start(tries=0){if(tries>220)return;installStyle();if(!map()||typeof L==='undefined'){setTimeout(()=>start(tries+1),75);return}ensureLayer();refresh();timer=setInterval(refresh,REFRESH_MS);if(!raf)raf=requestAnimationFrame(animate);document.addEventListener('click',e=>{if(e.target?.closest?.('.mc22-mode-btn'))setTimeout(refresh,80)});const root=document.getElementById('liveMetroMap');if(root)new MutationObserver(killLegacyCanvas).observe(root,{childList:true,subtree:true})}
start();
})();