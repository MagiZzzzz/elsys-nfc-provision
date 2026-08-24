(()=>{
'use strict';
if(window.__MC22_METRO_OVERLAY__)return;
window.__MC22_METRO_OVERLAY__='v22.10';
const FEED='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/metro-vehicles-feed';
const COLORS={'1':'#ffcd00','2':'#003ca6','3':'#837902','3bis':'#6ec4e8','4':'#be418d','5':'#ff7e2e','6':'#6eca97','7':'#fa9aba','7bis':'#6eca97','8':'#e19bdf','9':'#b6bd00','10':'#c9910d','11':'#704b1c','12':'#007852','13':'#6ec4e8','14':'#62259d'};
let layer=null,busy=false,last=new Map(),timer=null;
function mode(){return document.querySelector('.mc22-mode-btn.active')?.dataset?.mode||'metro'}
function map(){try{return eval('liveLeaflet')}catch{return null}}
function selected(){try{return new Set([...eval('liveSelectedLines')].map(String))}catch{return new Set()}}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function bearing(a,b){if(!a||!b)return 0;const p=Math.PI/180,y=Math.sin((b.lon-a.lon)*p)*Math.cos(b.lat*p),x=Math.cos(a.lat*p)*Math.sin(b.lat*p)-Math.sin(a.lat*p)*Math.cos(b.lat*p)*Math.cos((b.lon-a.lon)*p);return (Math.atan2(y,x)*180/Math.PI+360)%360}
function ensureLayer(){const m=map();if(!m||typeof L==='undefined')return null;if(!layer)layer=L.layerGroup().addTo(m);return layer}
async function refresh(){
 if(busy||document.hidden||mode()!=='metro')return;
 const m=map(),ly=ensureLayer();if(!m||!ly)return;
 busy=true;
 try{
  const r=await fetch(FEED,{cache:'no-store'}),d=await r.json();if(!r.ok||!d?.ok)return;
  const sel=selected(),all=!sel.size||sel.size>=16,rows=(d.vehicles||[]).filter(v=>all||sel.has(String(v.line_id))).filter(v=>Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))&&v.service_state!=='upcoming'&&v.status!=='queued');
  ly.clearLayers();
  const next=new Map();
  for(const v of rows){
    const id=String(v.vehicle_id),lat=Number(v.latitude),lon=Number(v.longitude),prev=last.get(id),ang=prev?bearing(prev,{lat,lon}):0,color=COLORS[String(v.line_id)]||'#26394d';
    next.set(id,{lat,lon});
    const live=!v.simulation&&!v.stale_projection&&v.projection_kind!=='stale_simulated';
    const html=`<div class="mc22-train ${live?'live':'projected'}" style="--line:${color};transform:rotate(${ang}deg)"><span></span></div>`;
    const icon=L.divIcon({className:'mc22-train-host',html,iconSize:[24,24],iconAnchor:[12,12]});
    const mk=L.marker([lat,lon],{icon,keyboard:false,zIndexOffset:1200});
    const status=v.status==='at_station'?'À quai':v.status==='approaching'?'À l’approche':'En route';
    mk.bindTooltip(`Métro ${esc(v.line_id)} · ${esc(status)}${v.destination_name?' · vers '+esc(v.destination_name):''}`,{direction:'top',offset:[0,-10]});
    mk.addTo(ly);
  }
  last=next;
  const el=document.getElementById('liveUpdatedAt');if(el)el.textContent=`${rows.length} rames affichées · ${d.degraded?'projection de secours':'données PRIM / IDFM'}`;
 }catch(e){console.debug('MetroChain overlay',e)}finally{busy=false}
}
function installStyle(){if(document.getElementById('mc22-train-overlay-style'))return;const s=document.createElement('style');s.id='mc22-train-overlay-style';s.textContent=`
.mc22-train-host{background:transparent!important;border:0!important}
.mc22-train{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#fff;border:3px solid var(--line);box-shadow:0 3px 10px rgba(0,0,0,.35);transition:transform .25s linear}
.mc22-train span{width:0;height:0;border-left:5px solid #102033;border-top:3px solid transparent;border-bottom:3px solid transparent;transform:translateX(1px)}
.mc22-train.projected{opacity:.72;border-style:dashed}
.mc22-train.live{box-shadow:0 0 0 3px rgba(73,213,166,.20),0 3px 10px rgba(0,0,0,.35)}
`;document.head.appendChild(s)}
function start(tries=0){if(tries>200)return;installStyle();if(!map()||typeof L==='undefined'){setTimeout(()=>start(tries+1),75);return}refresh();timer=setInterval(refresh,4000);try{map().on('zoomend moveend',refresh)}catch{}}
start();
})();
