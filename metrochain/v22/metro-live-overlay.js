(()=>{
'use strict';
if(window.__MC22_NETWORK_OVERLAY__)return;
window.__MC22_NETWORK_OVERLAY__='v22.18-track-locked';
const BASE='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/';
const METRO_COLORS={'1':'#ffcd00','2':'#003ca6','3':'#837902','3BIS':'#6ec4e8','4':'#be418d','5':'#ff7e2e','6':'#6eca97','7':'#fa9aba','7BIS':'#6eca97','8':'#e19bdf','9':'#b6bd00','10':'#c9910d','11':'#704b1c','12':'#007852','13':'#6ec4e8','14':'#62259d'};
const REFRESH_MS=3000,MOVE_MS=3300,FRAME_MS=30;
let layer=null,busy=false,timer=null,lastMode=null,raf=0,lastFrame=0,currentStations=new Map();
let metroGeometryPromise=null,metroGeometryAt=0,metroStations=new Map(),metroLines=new Map();
const markers=new Map(),metroGraphs=new Map(),metroSegmentCache=new Map(),nearestNodeCache=new Map();

function mode(){return document.querySelector('.mc22-mode-btn.active')?.dataset?.mode||'metro'}
function map(){try{return eval('liveLeaflet')}catch{return null}}
function selected(){try{return new Set([...eval('liveSelectedLines')].map(String))}catch{return new Set()}}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function normLine(v){let s=String(v??'').trim().toLowerCase().replace(/\s+/g,'').replace(/^m/,'');if(s==='3b')s='3bis';if(s==='7b')s='7bis';return s}
function ensureLayer(){const m=map();if(!m||typeof L==='undefined')return null;if(!layer)layer=L.layerGroup().addTo(m);return layer}
function clearMarkers(){if(layer)layer.clearLayers();markers.clear();currentStations=new Map()}
function killLegacyCanvas(){const root=document.getElementById('liveMetroMap');if(!root)return;root.querySelectorAll('canvas.metro-train-canvas').forEach(c=>{c.style.setProperty('display','none','important');c.style.setProperty('visibility','hidden','important');c.style.setProperty('opacity','0','important');c.style.pointerEvents='none';c.setAttribute('aria-hidden','true')})}
function installStyle(){
  if(document.getElementById('mc22-network-overlay-style-v2218'))return;
  document.querySelectorAll('#mc22-network-overlay-style,#mc22-network-overlay-style-v2216,#mc22-network-overlay-style-v2217').forEach(x=>x.remove());
  const s=document.createElement('style');s.id='mc22-network-overlay-style-v2218';s.textContent=`
#liveMetroMap canvas.metro-train-canvas{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#liveMetroMap .train-marker,#liveMetroMap .metro-train,#liveMetroMap .vehicle-marker,#liveMetroMap .live-train,#liveMetroMap .train-dot{display:none!important}
#liveMetroMap .mc22-vehicle-host{background:transparent!important;border:0!important;width:44px!important;height:26px!important;margin-left:-22px!important;margin-top:-13px!important;overflow:visible!important}
#liveMetroMap .mc22-train{position:relative;width:38px;height:18px;box-sizing:border-box;border-radius:5px;background:#101923;border:2px solid var(--line);box-shadow:0 2px 7px rgba(0,0,0,.44),0 0 0 1px rgba(255,255,255,.20) inset;transform:rotate(var(--angle,0deg));transform-origin:50% 50%;will-change:transform;display:flex;align-items:center;justify-content:center;gap:2px;pointer-events:auto}
#liveMetroMap .mc22-train:before{content:'';position:absolute;right:1px;top:4px;width:2px;height:6px;border-radius:2px;background:#fff6b7;box-shadow:0 0 4px #fff8}
#liveMetroMap .mc22-train:after{content:'';position:absolute;left:3px;right:3px;bottom:1px;height:3px;border-radius:2px;background:var(--line)}
#liveMetroMap .mc22-train .win{width:7px;height:6px;border-radius:1.5px;background:#dbe9f5;box-shadow:0 0 3px rgba(219,233,245,.35)}
#liveMetroMap .mc22-train .code{position:absolute;left:-8px;top:2px;min-width:12px;height:12px;padding:0 2px;border-radius:3px;background:var(--line);color:var(--text,#fff)!important;border:1px solid rgba(255,255,255,.75);font:900 7px/12px system-ui;text-align:center;letter-spacing:-.04em;transform:rotate(calc(-1 * var(--angle,0deg)));transform-origin:50% 50%}
#liveMetroMap .mc22-train.projected{opacity:.76;border-style:dashed}
#liveMetroMap .mc22-train.live{box-shadow:0 0 0 2px rgba(73,213,166,.18),0 2px 7px rgba(0,0,0,.44),0 0 0 1px rgba(255,255,255,.20) inset}
#liveMetroMap .mc22-train.at-station{filter:brightness(1.13)}
`;document.head.appendChild(s);killLegacyCanvas()
}

function endpoint(m){return m==='metro'?BASE+'metro-vehicles-feed':BASE+'network-live-feed?mode='+encodeURIComponent(m)}
function modeLabel(m){return ({metro:'Métro',rer:'RER',transilien:'Transilien',tram:'Tram',bus:'Bus'})[m]||m}
function codeOf(v){return String(v.line_code??v.line_id??'?').replace(/IDFM:/i,'').replace(/BIS/i,'b')}
function normColor(c){c=String(c||'').trim();if(!c)return'#60758a';return c.startsWith('#')?c:'#'+c}
function textColor(l){return normColor(l?.text_color||'#ffffff')}
function lineMap(data,m){
  const out=new Map();
  for(const l of data?.lines||[]){out.set(String(l.id),l);out.set(normLine(l.id),l);if(l.code)out.set(normLine(l.code),l);if(l.route_id)out.set(String(l.route_id),l)}
  if(m==='metro'){
    for(const [id,l] of metroLines)out.set(id,l);
    for(const [k,c] of Object.entries(METRO_COLORS)){const id=normLine(k);if(!out.has(id))out.set(id,{id,code:id,color:c,text_color:'#fff'})}
  }
  return out
}
function lineFor(lm,v){return lm.get(String(v.line_id))||lm.get(normLine(v.line_id))||lm.get(normLine(v.line_code))||lm.get(String(v.route_id??''))||null}
function bearingAngle(aLat,aLon,bLat,bLon,old=0){const dlat=bLat-aLat,dlon=(bLon-aLon)*Math.cos(((aLat+bLat)/2)*Math.PI/180);if(Math.hypot(dlat,dlon)<1e-10)return old;return Math.atan2(-dlat,dlon)*180/Math.PI}
function markerHtml(v,l,angle=0){const color=normColor(l?.color||METRO_COLORS[String(v.line_id).toUpperCase()]||'#60758a'),txt=textColor(l),live=!v.simulation&&!v.stale_projection&&v.projection_kind!=='stale_simulated',station=v.status==='at_station';return `<div class="mc22-train ${live?'live':'projected'} ${station?'at-station':''}" style="--line:${color};--text:${txt};--angle:${Number(angle).toFixed(1)}deg"><i class="win"></i><i class="win"></i><i class="win"></i><span class="code">${esc(codeOf(v))}</span></div>`}
function title(v,m){const status=v.status==='at_station'?'À quai':v.status==='approaching'?'À l’approche':v.status==='holding'?'Retenu':'En route';return `${modeLabel(m)} ${esc(codeOf(v))} · ${esc(status)}${v.destination_name?' · vers '+esc(v.destination_name):''}`}

function meters(a,b){const dy=(b.lat-a.lat)*111320,dx=(b.lon-a.lon)*111320*Math.cos(((a.lat+b.lat)/2)*Math.PI/180);return Math.hypot(dx,dy)}
function geometryParts(shape){
  const g=shape?.type==='Feature'?shape.geometry:shape;
  if(!g?.coordinates)return[];
  if(g.type==='LineString')return[g.coordinates];
  if(g.type==='MultiLineString')return g.coordinates;
  return[]
}
function addEdge(adj,a,b,w){
  if(a===b||!Number.isFinite(w)||w<=0||w>5000)return;
  const aa=adj[a]||(adj[a]=[]),bb=adj[b]||(adj[b]=[]);
  if(!aa.some(e=>e[0]===b))aa.push([b,w]);
  if(!bb.some(e=>e[0]===a))bb.push([a,w])
}
function buildGraph(lineId){
  const id=normLine(lineId);if(metroGraphs.has(id))return metroGraphs.get(id);
  const l=metroLines.get(id);if(!l)return null;
  const nodes=[],adj=[],nodeByKey=new Map(),endpoints=new Set();
  const nodeFor=(coord)=>{
    const lon=Number(coord?.[0]),lat=Number(coord?.[1]);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    const key=`${Math.round(lat*1e5)}:${Math.round(lon*1e5)}`;
    let n=nodeByKey.get(key);
    if(n==null){n=nodes.length;nodeByKey.set(key,n);nodes.push({lat,lon});adj.push([])}
    return n
  };
  const shapes=(l.shape_variants||[]).map(v=>v?.shape).filter(Boolean);
  if(!shapes.length&&l.shape)shapes.push(l.shape);
  for(const shape of shapes){
    for(const part of geometryParts(shape)){
      let first=null,prev=null,last=null;
      for(const coord of part){
        const n=nodeFor(coord);if(n==null)continue;
        if(first==null)first=n;
        if(prev!=null&&prev!==n)addEdge(adj,prev,n,meters(nodes[prev],nodes[n]));
        prev=n;last=n
      }
      if(first!=null)endpoints.add(first);if(last!=null)endpoints.add(last)
    }
  }
  const ep=[...endpoints],cell=.00035,buckets=new Map();
  const cellKey=(p)=>`${Math.floor(p.lat/cell)}:${Math.floor(p.lon/cell)}`;
  for(const n of ep){const k=cellKey(nodes[n]),a=buckets.get(k)||[];a.push(n);buckets.set(k,a)}
  for(const n of ep){
    const p=nodes[n],cy=Math.floor(p.lat/cell),cx=Math.floor(p.lon/cell);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      for(const m of buckets.get(`${cy+dy}:${cx+dx}`)||[]){if(m<=n)continue;const w=meters(p,nodes[m]);if(w<=28)addEdge(adj,n,m,w)}
    }
  }
  const g={id,nodes,adj};
  metroGraphs.set(id,g);
  return g
}
function heapPush(h,item){let i=h.length;h.push(item);while(i){const p=(i-1)>>1;if(h[p][0]<=item[0])break;h[i]=h[p];i=p}h[i]=item}
function heapPop(h){if(!h.length)return null;const root=h[0],last=h.pop();if(h.length&&last){let i=0;while(true){let a=i*2+1,b=a+1;if(a>=h.length)break;let c=b<h.length&&h[b][0]<h[a][0]?b:a;if(h[c][0]>=last[0])break;h[i]=h[c];i=c}h[i]=last}return root}
function nearestNode(lineId,stationId,coord){
  const id=normLine(lineId),key=`${id}|${stationId}`;if(nearestNodeCache.has(key))return nearestNodeCache.get(key);
  const g=buildGraph(id);if(!g||!coord)return null;
  let bi=-1,bd=Infinity;
  for(let i=0;i<g.nodes.length;i++){const d=meters(coord,g.nodes[i]);if(d<bd){bd=d;bi=i}}
  const out=bi>=0?{node:bi,gap:bd}:null;nearestNodeCache.set(key,out);return out
}
function shortestNodePath(g,start,goal){
  if(start===goal)return[start];
  const n=g.nodes.length,dist=new Float64Array(n),prev=new Int32Array(n),seen=new Uint8Array(n);
  dist.fill(Infinity);prev.fill(-1);dist[start]=0;
  const h=[];heapPush(h,[meters(g.nodes[start],g.nodes[goal]),0,start]);
  let guard=0;
  while(h.length&&guard++<n*12){
    const x=heapPop(h);if(!x)break;const d=x[1],u=x[2];if(seen[u])continue;seen[u]=1;if(u===goal)break;
    for(const e of g.adj[u]){const v=e[0],nd=d+e[1];if(nd<dist[v]){dist[v]=nd;prev[v]=u;heapPush(h,[nd+meters(g.nodes[v],g.nodes[goal]),nd,v])}}
  }
  if(prev[goal]===-1)return null;
  const out=[];for(let u=goal;u!==-1;u=prev[u]){out.push(u);if(u===start)break}out.reverse();return out[0]===start?out:null
}
function makeTrackPath(nodes){
  if(!nodes||nodes.length<2)return null;
  const cum=[0];let total=0;
  for(let i=1;i<nodes.length;i++){total+=meters(nodes[i-1],nodes[i]);cum.push(total)}
  return total>0?{pts:nodes,cum,total}:null
}
function segmentPath(lineId,fromId,toId){
  const lid=normLine(lineId),key=`${lid}|${fromId}|${toId}`;if(metroSegmentCache.has(key))return metroSegmentCache.get(key);
  const revKey=`${lid}|${toId}|${fromId}`;
  if(metroSegmentCache.has(revKey)){
    const r=metroSegmentCache.get(revKey);
    if(r){const rr=makeTrackPath([...r.pts].reverse());metroSegmentCache.set(key,rr);return rr}
  }
  const a=metroStations.get(String(fromId)),b=metroStations.get(String(toId)),g=buildGraph(lid);
  if(!a||!b||!g){metroSegmentCache.set(key,null);return null}
  const na=nearestNode(lid,fromId,a),nb=nearestNode(lid,toId,b);
  if(!na||!nb||na.gap>260||nb.gap>260){metroSegmentCache.set(key,null);return null}
  const ids=shortestNodePath(g,na.node,nb.node);
  if(!ids||ids.length<2){metroSegmentCache.set(key,null);return null}
  const path=makeTrackPath(ids.map(i=>g.nodes[i]));
  metroSegmentCache.set(key,path);return path
}
function pointOnPath(path,p,oldAngle=0){
  if(!path||!path.pts?.length)return null;
  p=Math.max(0,Math.min(1,p));const d=path.total*p,c=path.cum,pts=path.pts;
  let lo=0,hi=c.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(c[mid]<=d)lo=mid;else hi=mid}
  const i=Math.min(lo,pts.length-2),a=pts[i],b=pts[i+1],span=Math.max(.001,c[i+1]-c[i]),q=Math.max(0,Math.min(1,(d-c[i])/span));
  return[a.lat+(b.lat-a.lat)*q,a.lon+(b.lon-a.lon)*q,bearingAngle(a.lat,a.lon,b.lat,b.lon,oldAngle)]
}
function metroSchedulePos(e,now){
  const tl=e.timeline;if(!Array.isArray(tl)||tl.length<2||!metroStations.size)return null;
  for(let i=0;i<tl.length;i++){
    const a=tl[i],arr=Date.parse(String(a.arrival_at??'')),dep=Date.parse(String(a.departure_at??a.arrival_at??''));
    if(!Number.isFinite(arr)||!Number.isFinite(dep))continue;
    if(now>=arr-2500&&now<=dep){
      const n=tl[i+1];if(n){const path=segmentPath(e.lineId,String(a.station_id),String(n.station_id)),p=pointOnPath(path,0,e.angle);if(p)return p}
      const s=metroStations.get(String(a.station_id));if(s)return[s.lat,s.lon,e.angle]
    }
    if(i<tl.length-1){
      const b=tl[i+1],nextArr=Date.parse(String(b.arrival_at??''));if(!Number.isFinite(nextArr)||nextArr<=dep)continue;
      if(now>dep&&now<nextArr){
        const p=Math.max(0,Math.min(1,(now-dep)/(nextArr-dep))),path=segmentPath(e.lineId,String(a.station_id),String(b.station_id)),x=pointOnPath(path,p,e.angle);
        if(x)return x;
        const ca=metroStations.get(String(a.station_id)),cb=metroStations.get(String(b.station_id));if(ca&&cb)return[ca.lat+(cb.lat-ca.lat)*p,ca.lon+(cb.lon-ca.lon)*p,bearingAngle(ca.lat,ca.lon,cb.lat,cb.lon,e.angle)]
      }
    }
  }
  return null
}
function sampleTarget(e,t){
  if(!e.duration||t>=e.start+e.duration)return[e.targetLat,e.targetLon,e.angle];
  const p=Math.max(0,Math.min(1,(t-e.start)/e.duration)),q=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
  return[e.fromLat+(e.targetLat-e.fromLat)*q,e.fromLon+(e.targetLon-e.fromLon)*q,bearingAngle(e.fromLat,e.fromLon,e.targetLat,e.targetLon,e.angle)]
}
function stationMap(data){const out=new Map();for(const s of data?.stations||[]){const lat=Number(s.lat??s.latitude),lon=Number(s.lon??s.longitude);if(Number.isFinite(lat)&&Number.isFinite(lon))out.set(String(s.id),{lat,lon})}return out}
function schedulePos(e,now){
  const tl=e.timeline,sm=e.stationMap;if(!Array.isArray(tl)||tl.length<2||!sm?.size)return null;
  for(let i=0;i<tl.length;i++){
    const a=tl[i],ca=sm.get(String(a.station_id));if(!ca)continue;const arr=Date.parse(String(a.arrival_at??'')),dep=Date.parse(String(a.departure_at??a.arrival_at??''));
    if(Number.isFinite(arr)&&Number.isFinite(dep)&&now>=arr-2500&&now<=dep){const n=tl[i+1],cn=n?sm.get(String(n.station_id)):null,ang=cn?bearingAngle(ca.lat,ca.lon,cn.lat,cn.lon,e.angle):e.angle;return[ca.lat,ca.lon,ang]}
    if(i<tl.length-1){const b=tl[i+1],cb=sm.get(String(b.station_id)),nextArr=Date.parse(String(b.arrival_at??''));if(!cb||!Number.isFinite(dep)||!Number.isFinite(nextArr)||nextArr<=dep)continue;if(now>dep&&now<nextArr){const p=Math.max(0,Math.min(1,(now-dep)/(nextArr-dep)));return[ca.lat+(cb.lat-ca.lat)*p,ca.lon+(cb.lon-ca.lon)*p,bearingAngle(ca.lat,ca.lon,cb.lat,cb.lon,e.angle)]}}
  }
  return null
}
function setTrainAngle(e,angle){if(!Number.isFinite(angle)||Math.abs(angle-e.angle)<.35)return;e.angle=angle;const el=e.mk.getElement()?.querySelector?.('.mc22-train');if(el)el.style.setProperty('--angle',`${angle.toFixed(1)}deg`)}
function upsert(v,l,m,sm){
  const id=m+':'+String(v.vehicle_id),lat=Number(v.latitude),lon=Number(v.longitude),now=performance.now(),lineId=normLine(v.line_id??v.line_code);
  let e=markers.get(id);
  if(!e){
    const angle=0,icon=L.divIcon({className:'mc22-vehicle-host',html:markerHtml(v,l,angle),iconSize:[44,26],iconAnchor:[22,13]});
    const mk=L.marker([lat,lon],{icon,keyboard:false,zIndexOffset:1500,interactive:true});mk.bindTooltip(title(v,m),{direction:'top',offset:[0,-13]});mk.addTo(layer);
    e={mk,mode:m,lineId,fromLat:lat,fromLon:lon,targetLat:lat,targetLon:lon,currentLat:lat,currentLon:lon,start:now,duration:0,angle,vehicle:v,line:l,timeline:v.movement_timeline||[],stationMap:sm,seen:true};markers.set(id,e)
  }else{
    const cur=sampleTarget(e,now),angle=bearingAngle(cur[0],cur[1],lat,lon,e.angle);e.currentLat=cur[0];e.currentLon=cur[1];e.fromLat=cur[0];e.fromLon=cur[1];e.targetLat=lat;e.targetLon=lon;e.start=now;e.duration=(Math.abs(lat-cur[0])+Math.abs(lon-cur[1])<1e-9)?0:MOVE_MS;e.angle=angle;e.mode=m;e.lineId=lineId;e.vehicle=v;e.line=l;e.timeline=v.movement_timeline||[];e.stationMap=sm;e.mk.setIcon(L.divIcon({className:'mc22-vehicle-host',html:markerHtml(v,l,angle),iconSize:[44,26],iconAnchor:[22,13]}));if(e.mk.getTooltip())e.mk.setTooltipContent(title(v,m));e.seen=true
  }
}
function animate(t){
  if(t-lastFrame<FRAME_MS){raf=requestAnimationFrame(animate);return}lastFrame=t;
  const epoch=Date.now();
  for(const e of markers.values()){
    const sched=e.mode==='metro'?metroSchedulePos(e,epoch):schedulePos(e,epoch),p=sched||sampleTarget(e,t);
    e.currentLat=p[0];e.currentLon=p[1];e.mk.setLatLng([p[0],p[1]]);setTrainAngle(e,p[2])
  }
  raf=requestAnimationFrame(animate)
}
function sweep(){for(const [id,e] of markers){if(e.seen){e.seen=false;continue}layer.removeLayer(e.mk);markers.delete(id)}}

async function loadMetroGeometry(force=false){
  if(!force&&metroLines.size&&Date.now()-metroGeometryAt<6*60*60_000)return true;
  if(metroGeometryPromise)return metroGeometryPromise;
  metroGeometryPromise=(async()=>{
    const r=await fetch(BASE+'metro-geometry-feed',{cache:'default'}),d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.error||`geometry ${r.status}`);
    metroLines=new Map((d.lines||[]).map(l=>[normLine(l.id),l]));metroStations=stationMap(d);metroGeometryAt=Date.now();metroGraphs.clear();metroSegmentCache.clear();nearestNodeCache.clear();return true
  })().catch(e=>{console.debug('MetroChain metro geometry',e);return false}).finally(()=>{metroGeometryPromise=null});
  return metroGeometryPromise
}

async function refresh(){
  if(busy||document.hidden)return;killLegacyCanvas();const m=mode(),mp=map(),ly=ensureLayer();if(!mp||!ly)return;
  if(lastMode!==m){clearMarkers();lastMode=m}
  busy=true;
  try{
    if(m==='metro')await loadMetroGeometry();
    const r=await fetch(endpoint(m),{cache:'no-store'}),d=await r.json();if(!r.ok||!d?.ok)return;
    const lm=lineMap(d,m),sm=m==='metro'?metroStations:stationMap(d);if(sm.size)currentStations=sm;
    const sel=selected(),selNorm=new Set([...sel].map(normLine)),all=!sel.size||(d.lines&&sel.size>=d.lines.length)||(m==='metro'&&sel.size>=16);
    const rows=(d.vehicles||[]).filter(v=>{if(all)return true;const l=lineFor(lm,v),ids=[String(v.line_id??''),String(v.line_code??''),String(v.route_id??'')];if(l)ids.push(String(l.id??''),String(l.route_id??''));return ids.some(x=>x&&(sel.has(x)||selNorm.has(normLine(x))))}).filter(v=>Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))).filter(v=>v.service_state!=='upcoming'&&v.status!=='queued');
    for(const v of rows)upsert(v,lineFor(lm,v),m,currentStations);sweep();
    const el=document.getElementById('liveUpdatedAt');if(el)el.textContent=`${rows.length} ${modeLabel(m)} en circulation · ${m==='metro'?'verrouillés sur le tracé officiel IDFM':'animation continue'} · ${d.degraded?'projection de secours':'PRIM / IDFM'}`
  }catch(e){console.debug('MetroChain track-locked overlay',e)}
  finally{busy=false}
}
function start(tries=0){
  if(tries>220)return;installStyle();if(!map()||typeof L==='undefined'){setTimeout(()=>start(tries+1),75);return}
  ensureLayer();loadMetroGeometry().finally(refresh);timer=setInterval(refresh,REFRESH_MS);if(!raf)raf=requestAnimationFrame(animate);
  document.addEventListener('click',e=>{if(e.target?.closest?.('.mc22-mode-btn'))setTimeout(refresh,80)});
  const root=document.getElementById('liveMetroMap');if(root)new MutationObserver(killLegacyCanvas).observe(root,{childList:true,subtree:true})
}
start();
})();