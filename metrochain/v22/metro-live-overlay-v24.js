(()=>{
'use strict';
if(window.__MC22_NETWORK_OVERLAY__)return;
window.__MC22_NETWORK_OVERLAY__='v24-minute-state-engine';

const BASE='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/';
const METRO_COLORS={'1':'#ffcd00','2':'#003ca6','3':'#837902','3bis':'#6ec4e8','4':'#be418d','5':'#ff7e2e','6':'#6eca97','7':'#fa9aba','7bis':'#6eca97','8':'#e19bdf','9':'#b6bd00','10':'#c9910d','11':'#704b1c','12':'#007852','13':'#6ec4e8','14':'#62259d'};
const REFRESH_MS=10000,FRAME_MS=32,MIN_VISUAL_DWELL_MS=7000,DEFAULT_DWELL_MS=16000,ARRIVE_CAPTURE_M=8;
const MAJOR_RE=/gare|châtelet|saint-lazare|montparnasse|république|nation|bastille|opéra|étoile|défense|bercy|invalides|concorde|madeleine|trocadéro|place d'italie|denfert|barbès|stalingrad|jussieu|bibliothèque|mairie de saint-ouen/i;

let layer=null,labelLayer=null,busy=false,timer=null,lastMode=null,raf=0,lastFrame=0;
let metroGeometryPromise=null,metroGeometryAt=0,metroStations=new Map(),metroLines=new Map();
const modeLines=new Map(),markers=new Map(),graphs=new Map(),segmentCache=new Map(),nearestNodeCache=new Map();

function mode(){return document.querySelector('.mc22-mode-btn.active')?.dataset?.mode||'metro'}
function map(){try{return eval('liveLeaflet')}catch{return null}}
function selected(){try{return new Set([...eval('liveSelectedLines')].map(String))}catch{return new Set()}}
function normLine(v){let s=String(v??'').trim().toLowerCase().replace(/\s+/g,'').replace(/^m/,'');if(s==='3b')s='3bis';if(s==='7b')s='7bis';return s}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ts(v){const x=Date.parse(String(v??''));return Number.isFinite(x)?x:null}
function clamp(x,a=0,b=1){return Math.max(a,Math.min(b,x))}
function ensureLayers(){const m=map();if(!m||typeof L==='undefined')return false;if(!layer)layer=L.layerGroup().addTo(m);if(!labelLayer)labelLayer=L.layerGroup().addTo(m);return true}
function killLegacyCanvas(){const root=document.getElementById('liveMetroMap');if(!root)return;root.querySelectorAll('canvas.metro-train-canvas').forEach(c=>{c.style.setProperty('display','none','important');c.style.setProperty('visibility','hidden','important');c.style.setProperty('opacity','0','important');c.style.pointerEvents='none'})}

function installStyle(){
  if(document.getElementById('mc24-minute-motion-style'))return;
  document.querySelectorAll('[id^="mc22-network-overlay-style"],#mc23-smooth-style,#mc23-unified-motion-style,#mc24-minute-motion-style').forEach(x=>x.remove());
  const s=document.createElement('style');s.id='mc24-minute-motion-style';s.textContent=`
#liveMetroMap canvas.metro-train-canvas{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#liveMetroMap .train-marker,#liveMetroMap .metro-train,#liveMetroMap .vehicle-marker,#liveMetroMap .live-train,#liveMetroMap .train-dot,#liveMetroMap .mc23-vehicle-host{display:none!important}
#liveMetroMap .mc22-vehicle-host{background:transparent!important;border:0!important;width:36px!important;height:22px!important;margin-left:-18px!important;margin-top:-11px!important;overflow:visible!important}
#liveMetroMap .mc22-train{position:relative;width:29px;height:13px;box-sizing:border-box;border-radius:4px;background:#111b26;border:1.7px solid var(--line);box-shadow:0 1px 4px rgba(0,0,0,.32);transform:rotate(var(--angle,0deg));transform-origin:50% 50%;will-change:transform;display:flex;align-items:center;justify-content:center;gap:2px;pointer-events:auto;transition:background .22s ease,border-color .22s ease,box-shadow .22s ease,opacity .22s ease}
#liveMetroMap .mc22-train .win{width:5px;height:3.5px;border-radius:1px;background:#dceaf5;opacity:.94}
#liveMetroMap .mc22-train.departing{background:#2f6fb3!important;border-color:#dcebff!important;box-shadow:0 0 0 2px rgba(47,111,179,.22),0 1px 4px rgba(0,0,0,.32)!important}
#liveMetroMap .mc22-train.approaching{background:#f2a93b!important;border-color:#fff!important;box-shadow:0 0 0 2px rgba(242,169,59,.24),0 1px 4px rgba(0,0,0,.32)!important}
#liveMetroMap .mc22-train.stopped,#liveMetroMap .mc22-train.at-station{background:#49d5a6!important;border-color:#fff!important;box-shadow:0 0 0 3px rgba(73,213,166,.28),0 1px 4px rgba(0,0,0,.32)!important}
#liveMetroMap .mc22-train.stopped .win,#liveMetroMap .mc22-train.at-station .win{background:#17322b!important}
#liveMetroMap .mc22-train.projected{opacity:.78}
#liveMetroMap .mc22-station-label-host{background:transparent!important;border:0!important;pointer-events:none!important}
#liveMetroMap .mc22-station-label{display:inline-block;white-space:nowrap;color:#263b50;font:700 9px/1.1 system-ui;letter-spacing:-.01em;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff,0 0 4px #fff;transform:translate(5px,-4px);opacity:.92}
#liveMetroMap .mc22-station-label.focus{font-size:10px;font-weight:800;color:#10283f;opacity:1}`;
  document.head.appendChild(s);killLegacyCanvas();
}

function endpoint(m){return m==='metro'?BASE+'metro-vehicles-feed':BASE+'network-live-feed?mode='+encodeURIComponent(m)}
function modeLabel(m){return ({metro:'Métro',rer:'RER',transilien:'Transilien',tram:'Tram',bus:'Bus'})[m]||m}
function codeOf(v){return String(v.line_code??v.line_id??'?').replace(/IDFM:/i,'').replace(/BIS/i,'b')}
function normColor(c){c=String(c||'').trim();if(!c)return'#60758a';return c.startsWith('#')?c:'#'+c}
function lineMap(data,m){const out=new Map();for(const l of data?.lines||[]){out.set(String(l.id),l);out.set(normLine(l.id),l);if(l.code)out.set(normLine(l.code),l);if(l.route_id)out.set(String(l.route_id),l)}if(m==='metro'){for(const [id,l] of metroLines)out.set(id,l);for(const [id,c] of Object.entries(METRO_COLORS))if(!out.has(id))out.set(id,{id,code:id,color:c,text_color:'#fff'})}return out}
function lineFor(lm,v){return lm.get(String(v.line_id))||lm.get(normLine(v.line_id))||lm.get(normLine(v.line_code))||lm.get(String(v.route_id??''))||null}
function markerHtml(v,l,angle=0){const color=normColor(l?.color||METRO_COLORS[normLine(v.line_id)]||'#60758a'),live=!v.simulation&&!v.stale_projection&&v.projection_kind!=='stale_simulated';return `<div class="mc22-train ${live?'live':'projected'}" style="--line:${color};--angle:${Number(angle).toFixed(1)}deg"><i class="win"></i><i class="win"></i><i class="win"></i></div>`}
function title(v,m,state){const suffix=state?` · ${state==='stopped'?'à quai':state==='approaching'?'en approche':state==='departing'?'départ':'en ligne'}`:'';return `${modeLabel(m)} ${esc(codeOf(v))}${v.destination_name?' · vers '+esc(v.destination_name):''}${suffix}`}
function meters(a,b){const dy=(b.lat-a.lat)*111320,dx=(b.lon-a.lon)*111320*Math.cos(((a.lat+b.lat)/2)*Math.PI/180);return Math.hypot(dx,dy)}
function bearingAngle(aLat,aLon,bLat,bLon,old=0){const dlat=bLat-aLat,dlon=(bLon-aLon)*Math.cos(((aLat+bLat)/2)*Math.PI/180);if(Math.hypot(dlat,dlon)<1e-10)return old;return Math.atan2(-dlat,dlon)*180/Math.PI}
function geometryParts(shape){const g=shape?.type==='Feature'?shape.geometry:shape;if(!g?.coordinates)return[];if(g.type==='LineString')return[g.coordinates];if(g.type==='MultiLineString')return g.coordinates;return[]}
function addEdge(adj,a,b,w){if(a===b||!Number.isFinite(w)||w<=0||w>5000)return;const aa=adj[a]||(adj[a]=[]),bb=adj[b]||(adj[b]=[]);if(!aa.some(e=>e[0]===b))aa.push([b,w]);if(!bb.some(e=>e[0]===a))bb.push([a,w])}
function geometryKey(m,lineId){return `${m}|${normLine(lineId)}`}
function linesForMode(m){return m==='metro'?metroLines:(modeLines.get(m)||new Map())}

function buildGraph(m,lineId){
  const key=geometryKey(m,lineId);if(graphs.has(key))return graphs.get(key);
  const lm=linesForMode(m),l=lm.get(normLine(lineId))||lm.get(String(lineId));if(!l){graphs.set(key,null);return null}
  const nodes=[],adj=[],nodeByKey=new Map(),endpoints=new Set();
  const nodeFor=coord=>{const lon=Number(coord?.[0]),lat=Number(coord?.[1]);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;const k=`${Math.round(lat*1e5)}:${Math.round(lon*1e5)}`;let n=nodeByKey.get(k);if(n==null){n=nodes.length;nodeByKey.set(k,n);nodes.push({lat,lon});adj.push([])}return n};
  const shapes=(l.shape_variants||[]).map(v=>v?.shape).filter(Boolean);if(l.shape)shapes.push(l.shape);
  for(const shape of shapes)for(const part of geometryParts(shape)){let first=null,prev=null,last=null;for(const coord of part){const n=nodeFor(coord);if(n==null)continue;if(first==null)first=n;if(prev!=null&&prev!==n)addEdge(adj,prev,n,meters(nodes[prev],nodes[n]));prev=n;last=n}if(first!=null)endpoints.add(first);if(last!=null)endpoints.add(last)}
  const ep=[...endpoints],cell=.00035,buckets=new Map(),cellKey=p=>`${Math.floor(p.lat/cell)}:${Math.floor(p.lon/cell)}`;
  for(const n of ep){const k=cellKey(nodes[n]),a=buckets.get(k)||[];a.push(n);buckets.set(k,a)}
  for(const n of ep){const p=nodes[n],cy=Math.floor(p.lat/cell),cx=Math.floor(p.lon/cell);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const z of buckets.get(`${cy+dy}:${cx+dx}`)||[]){if(z<=n)continue;const w=meters(p,nodes[z]);if(w<=32)addEdge(adj,n,z,w)}}
  const segments=[];for(let a=0;a<adj.length;a++)for(const e of adj[a])if(e[0]>a)segments.push([a,e[0]]);
  const g=nodes.length>1?{key,nodes,adj,segments}:null;graphs.set(key,g);return g;
}
function heapPush(h,item){let i=h.length;h.push(item);while(i){const p=(i-1)>>1;if(h[p][0]<=item[0])break;h[i]=h[p];i=p}h[i]=item}
function heapPop(h){if(!h.length)return null;const root=h[0],last=h.pop();if(h.length&&last){let i=0;while(true){let a=i*2+1,b=a+1;if(a>=h.length)break;let c=b<h.length&&h[b][0]<h[a][0]?b:a;if(h[c][0]>=last[0])break;h[i]=h[c];i=c}h[i]=last}return root}
function shortestNodePath(g,start,goal){if(start===goal)return[start];const n=g.nodes.length,dist=new Float64Array(n),prev=new Int32Array(n),seen=new Uint8Array(n);dist.fill(Infinity);prev.fill(-1);dist[start]=0;const h=[];heapPush(h,[meters(g.nodes[start],g.nodes[goal]),0,start]);let guard=0;while(h.length&&guard++<n*12){const x=heapPop(h);if(!x)break;const d=x[1],u=x[2];if(seen[u])continue;seen[u]=1;if(u===goal)break;for(const edge of g.adj[u]){const v=edge[0],nd=d+edge[1];if(nd<dist[v]){dist[v]=nd;prev[v]=u;heapPush(h,[nd+meters(g.nodes[v],g.nodes[goal]),nd,v])}}}if(prev[goal]===-1)return null;const out=[];for(let u=goal;u!==-1;u=prev[u]){out.push(u);if(u===start)break}out.reverse();return out[0]===start?out:null}
function makeTrackPath(nodes){if(!nodes||nodes.length<2)return null;const cum=[0];let total=0;for(let i=1;i<nodes.length;i++){total+=meters(nodes[i-1],nodes[i]);cum.push(total)}return total>0?{pts:nodes,cum,total}:null}
function stationMap(data){const out=new Map();for(const s of data?.stations||[]){const lat=Number(s.lat??s.latitude),lon=Number(s.lon??s.longitude);if(Number.isFinite(lat)&&Number.isFinite(lon))out.set(String(s.id),{lat,lon,name:String(s.name??s.id)})}return out}
function nearestNode(e,stationId,coord){const key=`${geometryKey(e.mode,e.lineId)}|${stationId}`;if(nearestNodeCache.has(key))return nearestNodeCache.get(key);const g=buildGraph(e.mode,e.lineId);if(!g||!coord)return null;let bi=-1,bd=Infinity;for(let i=0;i<g.nodes.length;i++){const d=meters(coord,g.nodes[i]);if(d<bd){bd=d;bi=i}}const out=bi>=0?{node:bi,gap:bd}:null;nearestNodeCache.set(key,out);return out}
function segmentPath(e,fromId,toId){const key=`${geometryKey(e.mode,e.lineId)}|${fromId}|${toId}`;if(segmentCache.has(key))return segmentCache.get(key);const rev=`${geometryKey(e.mode,e.lineId)}|${toId}|${fromId}`;if(segmentCache.has(rev)){const r=segmentCache.get(rev);if(r){const rr=makeTrackPath([...r.pts].reverse());segmentCache.set(key,rr);return rr}}const a=e.stationMap?.get(String(fromId)),b=e.stationMap?.get(String(toId)),g=buildGraph(e.mode,e.lineId);if(!a||!b||!g){segmentCache.set(key,null);return null}const na=nearestNode(e,fromId,a),nb=nearestNode(e,toId,b);if(!na||!nb||na.gap>300||nb.gap>300){segmentCache.set(key,null);return null}const ids=shortestNodePath(g,na.node,nb.node);if(!ids||ids.length<2){segmentCache.set(key,null);return null}const path=makeTrackPath(ids.map(i=>g.nodes[i]));segmentCache.set(key,path);return path}
function pointOnPath(path,p,oldAngle=0){if(!path||!path.pts?.length)return null;p=clamp(p);const d=path.total*p,c=path.cum,pts=path.pts;let lo=0,hi=c.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(c[mid]<=d)lo=mid;else hi=mid}const i=Math.min(lo,pts.length-2),a=pts[i],b=pts[i+1],span=Math.max(.001,c[i+1]-c[i]),q=clamp((d-c[i])/span);return[a.lat+(b.lat-a.lat)*q,a.lon+(b.lon-a.lon)*q,bearingAngle(a.lat,a.lon,b.lat,b.lon,oldAngle)]}
function projectOnSegment(lat,lon,a,b){const k=Math.cos(lat*Math.PI/180),ax=(a.lon-lon)*k,ay=a.lat-lat,bx=(b.lon-lon)*k,by=b.lat-lat,dx=bx-ax,dy=by-ay,d2=dx*dx+dy*dy;let t=d2>1e-16?-(ax*dx+ay*dy)/d2:0;t=clamp(t);const plat=a.lat+(b.lat-a.lat)*t,plon=a.lon+(b.lon-a.lon)*t,ex=(plon-lon)*k,ey=plat-lat;return{lat:plat,lon:plon,d2:ex*ex+ey*ey}}
function snapToLine(e,lat,lon,oldAngle=0){const g=buildGraph(e.mode,e.lineId);if(!g?.segments?.length||!Number.isFinite(lat)||!Number.isFinite(lon))return null;let best=null,ba=null,bb=null;for(const [ia,ib] of g.segments){const a=g.nodes[ia],b=g.nodes[ib],p=projectOnSegment(lat,lon,a,b);if(!best||p.d2<best.d2){best=p;ba=a;bb=b}}if(!best)return null;return[best.lat,best.lon,bearingAngle(ba.lat,ba.lon,bb.lat,bb.lon,oldAngle),Math.sqrt(best.d2)*111320]}
function straightPoint(a,b,p,oldAngle=0){if(!a||!b)return null;return[a.lat+(b.lat-a.lat)*p,a.lon+(b.lon-a.lon)*p,bearingAngle(a.lat,a.lon,b.lat,b.lon,oldAngle)]}
function routePoint(e,fromId,toId,p){const path=segmentPath(e,String(fromId),String(toId));const onPath=pointOnPath(path,p,e.angle);if(onPath)return onPath;return straightPoint(e.stationMap?.get(String(fromId)),e.stationMap?.get(String(toId)),p,e.angle)}
function stationPoint(e,stationId){const s=e.stationMap?.get(String(stationId));if(!s)return null;const snap=snapToLine(e,s.lat,s.lon,e.angle);return snap||[s.lat,s.lon,e.angle]}

function travelProfile(now,dep,arr){
  const total=Math.max(.001,(arr-dep)/1000),t=clamp((now-dep)/1000,0,total),r=Math.min(total*.45,Math.max(5,Math.min(12,total*.18))),area=Math.max(.001,total-r);
  let p;if(t<=r)p=(t*t/(2*r))/area;else if(t>=total-r){const u=total-t;p=1-(u*u/(2*r))/area}else p=(t-r/2)/area;
  const state=t<r?'departing':total-t<r?'approaching':'moving';
  return{p:clamp(p),state,ramp_ms:r*1000};
}
function timelineDesired(e,now){
  if(e.vehicle?.timeline_disabled_for_projection)return null;
  const tl=Array.isArray(e.timeline)?e.timeline:[];if(!tl.length)return null;
  for(let i=0;i<tl.length;i++){
    const a=tl[i],arr=ts(a.arrival_at),dep=ts(a.departure_at??a.arrival_at);
    if(arr!=null&&dep!=null&&now>=arr&&now<=dep){const p=stationPoint(e,a.station_id);if(p)return{p,state:'stopped',stationId:String(a.station_id),holdUntil:dep,source:'timeline'}}
    if(i<tl.length-1){
      const b=tl[i+1],nextArr=ts(b.arrival_at);if(dep==null||nextArr==null||nextArr<=dep)continue;
      if(now>dep&&now<nextArr){const prof=travelProfile(now,dep,nextArr),p=routePoint(e,a.station_id,b.station_id,prof.p);if(p)return{p,state:prof.state,fromId:String(a.station_id),toId:String(b.station_id),arrivalAt:nextArr,departureAt:dep,source:'timeline'}}
    }
  }
  return null;
}
function snapshotTime(v){return ts(v?.projection_generated_at)??ts(v?.observed_at)??ts(v?.updated_at)??ts(v?.source_response_timestamp)??Date.now()}
function fallbackDesired(e,now){
  const v=e.vehicle||{},from=String(v.from_station_id??''),to=String(v.to_station_id??''),p0=Number(v.progress),snapAt=e.snapshotAt||snapshotTime(v);
  const dwell=ts(v.dwell_until);
  if(v.status==='at_station'||v.status==='stopped'){
    const sid=from||to,p=stationPoint(e,sid);if(p)return{p,state:'stopped',stationId:sid,holdUntil:dwell??Math.max(now,snapAt)+DEFAULT_DWELL_MS,source:'status'}
  }
  if(from&&to&&Number.isFinite(p0)){
    const rem=Math.max(0,Number(v.estimated_remaining_seconds));
    let p=p0,arrivalAt=null;
    if(Number.isFinite(rem)&&rem>0){arrivalAt=snapAt+rem*1000;const q=clamp((now-snapAt)/(rem*1000));p=clamp(p0+(1-p0)*q)}
    const point=routePoint(e,from,to,p);
    if(point){
      if(arrivalAt!=null&&now>=arrivalAt){const sp=stationPoint(e,to);if(sp)return{p:sp,state:'stopped',stationId:to,holdUntil:arrivalAt+DEFAULT_DWELL_MS,source:'extrapolated-arrival'}}
      let state=v.status==='approaching'?'approaching':v.status==='departing'?'departing':'moving';
      if(state==='moving'&&arrivalAt!=null){const left=arrivalAt-now,total=Math.max(1000,arrivalAt-snapAt);if(left<Math.min(18000,total*.22))state='approaching';else if(now-snapAt<Math.min(10000,total*.16)&&p0<.15)state='departing'}
      return{p:point,state,fromId:from,toId:to,arrivalAt,source:'snapshot'}
    }
  }
  const lat=Number(v.latitude),lon=Number(v.longitude),snap=snapToLine(e,lat,lon,e.angle);
  if(Number.isFinite(lat)&&Number.isFinite(lon))return{p:snap||[lat,lon,e.angle],state:v.status==='approaching'?'approaching':v.status==='departing'?'departing':'moving',source:'position'};
  return null;
}
function desired(e,now){
  if(e.visualHoldUntil>now&&e.visualHoldStation){const p=stationPoint(e,e.visualHoldStation);if(p)return{p,state:'stopped',stationId:e.visualHoldStation,holdUntil:e.visualHoldUntil,source:'visual-hold'}}
  return timelineDesired(e,now)||fallbackDesired(e,now);
}

function setAngle(e,a){if(!Number.isFinite(a)||Math.abs(a-e.angle)<.3)return;e.angle=a;const el=e.mk.getElement()?.querySelector('.mc22-train');if(el)el.style.setProperty('--angle',`${a.toFixed(1)}deg`)}
function setVisual(e,state){
  if(e.visualState===state)return;e.visualState=state;const el=e.mk.getElement()?.querySelector('.mc22-train');if(!el)return;
  el.classList.toggle('stopped',state==='stopped');el.classList.toggle('at-station',state==='stopped');el.classList.toggle('approaching',state==='approaching');el.classList.toggle('departing',state==='departing');
  if(e.mk.getTooltip())e.mk.setTooltipContent(title(e.vehicle,e.mode,state));
}
function snapshotKey(v){return [v.source_response_timestamp,v.observed_at,v.updated_at,v.status,v.from_station_id,v.to_station_id,Number(v.progress).toFixed?.(5),v.dwell_until,v.estimated_remaining_seconds].join('|')}
function upsert(v,l,m,sm){
  const id=m+':'+String(v.vehicle_id),lineId=normLine(v.line_id??v.line_code);let e=markers.get(id),key=snapshotKey(v);
  if(!e){
    let lat=Number(v.latitude),lon=Number(v.longitude),ang=0;const shell={mode:m,lineId,stationMap:sm,angle:0};const snap=snapToLine(shell,lat,lon,0);if(snap&&snap[3]<=500){lat=snap[0];lon=snap[1];ang=snap[2]}
    const icon=L.divIcon({className:'mc22-vehicle-host',html:markerHtml(v,l,ang),iconSize:[36,22],iconAnchor:[18,11]});const mk=L.marker([lat,lon],{icon,keyboard:false,zIndexOffset:1500,interactive:true}).addTo(layer);mk.bindTooltip(title(v,m),{direction:'top',offset:[0,-9]});
    e={mk,mode:m,lineId,currentLat:lat,currentLon:lon,angle:ang,vehicle:v,line:l,timeline:v.movement_timeline||[],stationMap:sm,visualState:null,visualHoldUntil:0,visualHoldStation:null,snapshotAt:snapshotTime(v),snapshotKey:key,seen:true};markers.set(id,e);
  }else{
    e.mode=m;e.lineId=lineId;e.line=l;e.stationMap=sm;e.seen=true;
    if(e.snapshotKey!==key){e.vehicle=v;e.timeline=v.movement_timeline||[];e.snapshotAt=snapshotTime(v);e.snapshotKey=key}
    else e.vehicle={...e.vehicle,...v};
    if(e.mk.getTooltip())e.mk.setTooltipContent(title(e.vehicle,m,e.visualState));
  }
}
function currentSelectionInfo(){const s=selected(),n=new Set([...s].map(normLine));return{raw:s,norm:n,all:!s.size||s.size>=16}}
function allowedEntry(e,info){if(info.all)return true;return info.raw.has(e.lineId)||info.norm.has(e.lineId)||info.raw.has(String(e.vehicle?.line_id??''))||info.raw.has(String(e.vehicle?.line_code??''))}
function pruneToSelection(){const info=currentSelectionInfo();for(const [id,e] of markers){if(e.mode==='metro'&&!allowedEntry(e,info)){layer.removeLayer(e.mk);markers.delete(id)}}updateStationLabels()}
function sweep(){for(const [id,e] of markers){if(e.seen){e.seen=false;continue}layer.removeLayer(e.mk);markers.delete(id)}}

function moveMarker(e,target,state,dt,now,meta){
  const cur={lat:e.currentLat,lon:e.currentLon},tar={lat:target[0],lon:target[1]},dist=meters(cur,tar);
  if(state==='stopped'&&meta?.stationId){
    if(dist<=ARRIVE_CAPTURE_M||e.visualState==='stopped'){
      e.currentLat=target[0];e.currentLon=target[1];e.mk.setLatLng([target[0],target[1]]);setAngle(e,target[2]);
      if(e.visualHoldStation!==meta.stationId||e.visualState!=='stopped'){e.visualHoldStation=meta.stationId;e.visualHoldUntil=Math.max(meta.holdUntil||0,now+MIN_VISUAL_DWELL_MS)}
      else e.visualHoldUntil=Math.max(e.visualHoldUntil,meta.holdUntil||0);
      setVisual(e,'stopped');return;
    }
    state='approaching';
  }
  if(dist>.08){
    const tau=state==='approaching'?.55:state==='departing'?.75:.9,alpha=1-Math.exp(-dt/tau),maxMps=state==='approaching'?28:state==='departing'?34:42,maxStep=maxMps*dt;
    const step=Math.min(dist,Math.max(dist*alpha,maxStep*.18),maxStep),q=Math.min(1,step/dist);
    let lat=e.currentLat+(target[0]-e.currentLat)*q,lon=e.currentLon+(target[1]-e.currentLon)*q,ang=target[2];
    const snap=snapToLine(e,lat,lon,e.angle);if(snap&&snap[3]<=180){lat=snap[0];lon=snap[1];ang=snap[2]}
    e.currentLat=lat;e.currentLon=lon;e.mk.setLatLng([lat,lon]);setAngle(e,ang);
  }else setAngle(e,target[2]);
  if(state!=='stopped'&&e.visualHoldUntil<=now){e.visualHoldStation=null;e.visualHoldUntil=0}
  setVisual(e,state);
}
function animate(t){
  if(t-lastFrame<FRAME_MS){raf=requestAnimationFrame(animate);return}
  const dt=Math.min(.12,Math.max(.016,(t-lastFrame)/1000||.032));lastFrame=t;const now=Date.now();
  for(const e of markers.values()){const d=desired(e,now);if(!d?.p||!Number.isFinite(d.p[0])||!Number.isFinite(d.p[1]))continue;moveMarker(e,d.p,d.state,dt,now,d)}
  raf=requestAnimationFrame(animate);
}

function uniqueStations(){const byName=new Map();for(const s of metroStations.values()){const key=s.name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();const x=byName.get(key);if(!x)byName.set(key,{name:s.name,lat:s.lat,lon:s.lon,count:1});else{x.lat=(x.lat*x.count+s.lat)/(x.count+1);x.lon=(x.lon*x.count+s.lon)/(x.count+1);x.count++}}return[...byName.values()]}
function stationOnLine(s,lineId){const e={mode:'metro',lineId,stationMap:metroStations,angle:0};const snap=snapToLine(e,s.lat,s.lon,0);return snap&&snap[3]<=105}
function updateStationLabels(){if(!labelLayer||mode()!=='metro'){labelLayer?.clearLayers();return}const m=map();if(!m)return;labelLayer.clearLayers();const z=m.getZoom(),bounds=m.getBounds(),info=currentSelectionInfo(),one=!info.all&&info.norm.size===1?[...info.norm][0]:null;if(!one&&z<11.8)return;let rows=uniqueStations().filter(s=>bounds.pad(.12).contains([s.lat,s.lon]));if(one)rows=rows.filter(s=>stationOnLine(s,one));else if(z<12.7)rows=rows.filter(s=>MAJOR_RE.test(s.name));const max=one?70:(z>=13.3?80:z>=12.7?55:28);rows=rows.slice(0,max);for(const s of rows){const focus=one?' focus':'';const icon=L.divIcon({className:'mc22-station-label-host',html:`<span class="mc22-station-label${focus}">${esc(s.name)}</span>`,iconSize:[1,1],iconAnchor:[0,0]});L.marker([s.lat,s.lon],{icon,interactive:false,keyboard:false,zIndexOffset:350}).addTo(labelLayer)}}

async function loadMetroGeometry(force=false){
  if(!force&&metroLines.size&&Date.now()-metroGeometryAt<6*60*60_000)return true;if(metroGeometryPromise)return metroGeometryPromise;
  metroGeometryPromise=(async()=>{const r=await fetch(BASE+'metro-geometry-feed',{cache:'default'}),d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.error||`geometry ${r.status}`);metroLines=lineMap(d,'metro');metroStations=stationMap(d);modeLines.set('metro',metroLines);metroGeometryAt=Date.now();for(const k of [...graphs.keys()])if(k.startsWith('metro|'))graphs.delete(k);for(const k of [...segmentCache.keys()])if(k.startsWith('metro|'))segmentCache.delete(k);for(const k of [...nearestNodeCache.keys()])if(k.startsWith('metro|'))nearestNodeCache.delete(k);updateStationLabels();return true})().catch(e=>{console.debug('MetroChain geometry',e);return false}).finally(()=>metroGeometryPromise=null);return metroGeometryPromise;
}
function rememberNetworkGeometry(m,d){if(m==='metro')return;const lm=lineMap(d,m);if(!lm.size)return;const old=modeLines.get(m),oldCount=old?.size||0;modeLines.set(m,lm);if(!old||oldCount!==lm.size){for(const k of [...graphs.keys()])if(k.startsWith(m+'|'))graphs.delete(k);for(const k of [...segmentCache.keys()])if(k.startsWith(m+'|'))segmentCache.delete(k);for(const k of [...nearestNodeCache.keys()])if(k.startsWith(m+'|'))nearestNodeCache.delete(k)}}

async function refresh(){
  if(busy||document.hidden)return;killLegacyCanvas();if(!ensureLayers())return;const m=mode();
  if(lastMode!==m){for(const e of markers.values())layer.removeLayer(e.mk);markers.clear();labelLayer.clearLayers();lastMode=m}
  busy=true;
  try{
    if(m==='metro')await loadMetroGeometry();const r=await fetch(endpoint(m),{cache:'no-store'}),d=await r.json();if(!r.ok||!d?.ok)return;rememberNetworkGeometry(m,d);
    const lm=m==='metro'?lineMap(d,m):(modeLines.get(m)||lineMap(d,m)),sm=m==='metro'?metroStations:stationMap(d),info=currentSelectionInfo();
    const rows=(d.vehicles||[]).filter(v=>Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))).filter(v=>v.service_state!=='upcoming'&&v.status!=='queued').filter(v=>{if(m!=='metro'||info.all)return true;const lid=normLine(v.line_id??v.line_code);return info.norm.has(lid)||info.raw.has(String(v.line_id??''))});
    for(const e of markers.values())e.seen=false;for(const v of rows)upsert(v,lineFor(lm,v),m,sm);sweep();updateStationLabels();
    const el=document.getElementById('liveUpdatedAt');if(el){const age=Number(d.source_age_seconds??d.stale_age_seconds),ageTxt=Number.isFinite(age)?` · source ${age<90?Math.round(age)+' s':Math.round(age/60)+' min'}`:'';el.textContent=`${rows.length} ${modeLabel(m)} · moteur minute : départ → ligne → approche → arrêt → départ${ageTxt} · ${d.degraded?'projection':'PRIM / IDFM'}`}
  }catch(e){console.debug('MetroChain v24 minute engine',e)}finally{busy=false}
}
function scheduleFilterSync(){setTimeout(pruneToSelection,0);setTimeout(pruneToSelection,60);setTimeout(refresh,90)}
function start(tries=0){if(tries>220)return;installStyle();if(!ensureLayers()){setTimeout(()=>start(tries+1),75);return}loadMetroGeometry().finally(refresh);timer=setInterval(refresh,REFRESH_MS);if(!raf)raf=requestAnimationFrame(animate);document.addEventListener('click',e=>{if(e.target?.closest?.('#liveMap,.live-map,.mc22-mode-btn'))scheduleFilterSync()},true);document.addEventListener('change',scheduleFilterSync,true);const m=map();m.on('zoomend moveend',updateStationLabels);const root=document.getElementById('liveMetroMap');if(root)new MutationObserver(killLegacyCanvas).observe(root,{childList:true,subtree:true})}
start();
})();