(()=>{
'use strict';
if(window.__MC22_NETWORK_OVERLAY__)return;
window.__MC22_NETWORK_OVERLAY__='v22.13-all-modes';
const BASE='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/';
const METRO_COLORS={'1':'#ffcd00','2':'#003ca6','3':'#837902','3BIS':'#6ec4e8','4':'#be418d','5':'#ff7e2e','6':'#6eca97','7':'#fa9aba','7BIS':'#6eca97','8':'#e19bdf','9':'#b6bd00','10':'#c9910d','11':'#704b1c','12':'#007852','13':'#6ec4e8','14':'#62259d'};
let layer=null,busy=false,timer=null,lastMode=null;
const markers=new Map();
function mode(){return document.querySelector('.mc22-mode-btn.active')?.dataset?.mode||'metro'}
function map(){try{return eval('liveLeaflet')}catch{return null}}
function selected(){try{return new Set([...eval('liveSelectedLines')].map(String))}catch{return new Set()}}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ensureLayer(){const m=map();if(!m||typeof L==='undefined')return null;if(!layer)layer=L.layerGroup().addTo(m);return layer}
function clearMarkers(){if(layer)layer.clearLayers();markers.clear()}
function installStyle(){if(document.getElementById('mc22-network-overlay-style'))return;const s=document.createElement('style');s.id='mc22-network-overlay-style';s.textContent=`
#liveMetroMap .leaflet-marker-icon:not(.mc22-vehicle-host){display:none!important;opacity:0!important;pointer-events:none!important}
#liveMetroMap .leaflet-marker-shadow{display:none!important}
#liveMetroMap .mc22-vehicle-host{background:transparent!important;border:0!important}
#liveMetroMap .mc22-vehicle{width:22px;height:22px;border-radius:999px;display:grid;place-items:center;background:#0d1b2a;border:3px solid var(--line);box-shadow:0 2px 8px rgba(0,0,0,.32);color:#fff;font:900 8px/1 system-ui;letter-spacing:-.03em;transition:transform 3.8s linear,opacity .2s ease}
#liveMetroMap .mc22-vehicle span{display:block;min-width:12px;text-align:center;color:#fff!important}
#liveMetroMap .mc22-vehicle.projected{opacity:.68;border-style:dashed}
#liveMetroMap .mc22-vehicle.live{box-shadow:0 0 0 3px rgba(73,213,166,.18),0 2px 8px rgba(0,0,0,.32)}
`;document.head.appendChild(s)}
function endpoint(m){return m==='metro'?BASE+'metro-vehicles-feed':BASE+'network-live-feed-v2?mode='+encodeURIComponent(m)}
function modeLabel(m){return ({metro:'Métro',rer:'RER',transilien:'Transilien',tram:'Tram',bus:'Bus'})[m]||m}
function codeOf(v){return String(v.line_code??v.line_id??'?').replace(/BIS/i,'b')}
function lineMap(data,m){const out=new Map();for(const l of data?.lines||[])out.set(String(l.id),l);if(m==='metro')for(const [k,c] of Object.entries(METRO_COLORS))out.set(k,{id:k,code:k,color:c,text_color:'#fff'});return out}
function markerHtml(v,l){const color=l?.color||METRO_COLORS[String(v.line_id).toUpperCase()]||'#60758a',live=!v.simulation&&!v.stale_projection&&v.projection_kind!=='stale_simulated';return `<div class="mc22-vehicle ${live?'live':'projected'}" style="--line:${color}"><span>${esc(codeOf(v))}</span></div>`}
function title(v,m){const status=v.status==='at_station'?'À quai':v.status==='approaching'?'À l’approche':'En route';return `${modeLabel(m)} ${esc(codeOf(v))} · ${esc(status)}${v.destination_name?' · vers '+esc(v.destination_name):''}`}
function upsert(v,l,m){const id=m+':'+String(v.vehicle_id),lat=Number(v.latitude),lon=Number(v.longitude);let e=markers.get(id);const icon=()=>L.divIcon({className:'mc22-vehicle-host',html:markerHtml(v,l),iconSize:[24,24],iconAnchor:[12,12]});if(!e){const mk=L.marker([lat,lon],{icon:icon(),keyboard:false,zIndexOffset:1200});mk.bindTooltip(title(v,m),{direction:'top',offset:[0,-10]});mk.addTo(layer);e={mk};markers.set(id,e)}else{e.mk.setLatLng([lat,lon]);e.mk.setIcon(icon());if(e.mk.getTooltip())e.mk.setTooltipContent(title(v,m))}e.seen=true}
function sweep(){for(const [id,e] of markers){if(e.seen){e.seen=false;continue}layer.removeLayer(e.mk);markers.delete(id)}}
async function refresh(){if(busy||document.hidden)return;const m=mode(),mp=map(),ly=ensureLayer();if(!mp||!ly)return;if(lastMode!==m){clearMarkers();lastMode=m}busy=true;try{const r=await fetch(endpoint(m),{cache:'no-store'}),d=await r.json();if(!r.ok||!d?.ok)return;const lm=lineMap(d,m),sel=selected(),all=!sel.size||(d.lines&&sel.size>=d.lines.length)||(m==='metro'&&sel.size>=16);const rows=(d.vehicles||[]).filter(v=>all||sel.has(String(v.line_id))).filter(v=>Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))).filter(v=>v.service_state!=='upcoming'&&v.status!=='queued');for(const v of rows)upsert(v,lm.get(String(v.line_id)),m);sweep();const el=document.getElementById('liveUpdatedAt');if(el)el.textContent=`${rows.length} véhicules ${modeLabel(m)} affichés · ${d.degraded?'projection de secours':'PRIM / IDFM'}`}catch(e){console.debug('MetroChain network overlay',e)}finally{busy=false}}
function start(tries=0){if(tries>220)return;installStyle();if(!map()||typeof L==='undefined'){setTimeout(()=>start(tries+1),75);return}ensureLayer();refresh();timer=setInterval(refresh,4000);document.addEventListener('click',e=>{if(e.target?.closest?.('.mc22-mode-btn'))setTimeout(refresh,120)})}
start();
})();