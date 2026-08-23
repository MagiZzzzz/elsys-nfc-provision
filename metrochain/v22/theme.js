(()=>{
'use strict';
if(window.__MC22_BOOTING__)return;window.__MC22_BOOTING__=true;
const FEED='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/network-live-feed';
const TRAFFIC='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/idfm-traffic';
const MODE_META={
 metro:{label:'Métro',icon:'M'},rer:{label:'RER',icon:'R'},transilien:{label:'Transilien',icon:'T'},tram:{label:'Tram',icon:'T'},bus:{label:'Bus',icon:'B'}
};
let mc22Mode='metro',loading=false,lastDataAt=0,mc221PendingMode=null,mc221IncidentSeq=0;
const mc221IncidentCache=new Map();

function boot(tries=0){
 if(tries>220)return console.error('MetroChain v22: runtime unavailable');
 try{
  if(typeof liveFeed==='undefined'||typeof liveLeaflet==='undefined'||typeof renderLiveNetwork!=='function'||typeof rebuildMotionRecords!=='function'||!document.querySelector('#liveMap .live-toolbar')||!document.querySelector('.mc21-incidents')){setTimeout(()=>boot(tries+1),100);return}
  init();
 }catch(e){setTimeout(()=>boot(tries+1),100)}
}
function init(){
 if(window.__MC22_THEME__)return;
 window.__MC22_THEME__='v22-full-network';
 window.__MC221_FILTER_FIX__='v22.1-filter-stability';
 const ORIG={
  filters:renderLiveFilters,lines:renderLiveLines,stations:renderLiveStations,stats:renderLineStats,draw:drawTrain,
  refresh:refreshVehicles,loadMetro:loadLiveMetroData
 };
 window.__MC22_ORIGINALS__=ORIG;
 installControls();
 installOverrides(ORIG);
 updatePageCopy();
 renderModeTabs();
 loadNetworkIncidents('metro');
 document.body.classList.add('mc22-map-mode-metro');
}
function esc(v){try{return htmlEsc(String(v??''))}catch{return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[s]))}}
function modeLabel(){return MODE_META[mc22Mode]?.label||mc22Mode}
function installControls(){
 const live=document.getElementById('liveMap'),toolbar=live?.querySelector('.live-toolbar');if(!live||!toolbar||live.querySelector('.mc22-network-toolbar'))return;
 const box=document.createElement('div');box.className='mc22-network-toolbar';box.innerHTML=`<div class="mc22-mode-tabs">${Object.entries(MODE_META).map(([id,m])=>`<button class="mc22-mode-btn${id==='metro'?' active':''}" data-mode="${id}"><span class="mc22-mode-icon">${m.icon}</span><span>${m.label}</span><small data-count="${id}">—</small></button>`).join('')}</div><div class="mc22-line-tools"><input class="mc22-line-search" type="search" autocomplete="off" placeholder="Rechercher une ligne…" aria-label="Rechercher une ligne"></div><div class="mc22-mode-status"><i></i><span>Réseau métro actif</span></div>`;
 toolbar.parentNode.insertBefore(box,toolbar);
 const flash=document.createElement('div');flash.className='mc22-mode-flash';flash.innerHTML='<i></i><span>Réseau</span>';document.body.appendChild(flash);
 box.querySelectorAll('.mc22-mode-btn').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.mode)));
 box.querySelector('.mc22-line-search').addEventListener('input',()=>{if(mc22Mode!=='metro')renderLiveFilters()});
 const all=document.getElementById('liveAllLines');if(all)all.addEventListener('click',e=>{if(mc22Mode==='metro')return;e.preventDefault();e.stopImmediatePropagation();liveSelectedLines.clear();for(const l of liveFeed?.lines||[])liveSelectedLines.add(String(l.id));renderLiveFilters();renderLiveNetwork(false);renderLineStops();renderLineStats();setTimeout(()=>{try{if(typeof fitLiveNetwork==='function')fitLiveNetwork()}catch{}},70)},true);
}
function installOverrides(ORIG){
 renderLiveFilters=function(){return mc22Mode==='metro'?ORIG.filters():renderNetworkFilters()};
 renderLiveLines=function(){return mc22Mode==='metro'?ORIG.lines():renderNetworkLines()};
 renderLiveStations=function(){return mc22Mode==='metro'?ORIG.stations():renderNetworkStations()};
 renderLineStats=function(){return mc22Mode==='metro'?ORIG.stats():renderNetworkStats()};
 drawTrain=function(ctx,t,x,y,angle,status){return mc22Mode==='metro'?ORIG.draw(ctx,t,x,y,angle,status):drawNetworkTrain(ctx,t,x,y,angle,status)};
 refreshVehicles=async function(showMessage=false){if(mc22Mode==='metro')return ORIG.refresh(showMessage);if(!showMessage&&Date.now()-lastDataAt<15000)return;return refreshNetworkMode(false,showMessage)};
}
function updatePageCopy(){
 const live=document.getElementById('liveMap');const h=live?.querySelector('.live-map-head h2'),p=live?.querySelector('.live-map-head p');if(h)h.textContent='Carte live du réseau francilien';if(p)p.textContent='Métro, RER, Transilien, tram et bus : tracés IDFM, arrêts réels et véhicules PRIM animés sur le réseau. Sélectionne un mode puis une ligne.';
}
function renderModeTabs(){
 document.querySelectorAll('.mc22-mode-btn').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mc22Mode);if(b.dataset.mode!==mc221PendingMode)b.classList.remove('mc221-pending')});
 const search=document.querySelector('.mc22-line-search');if(search){search.value='';search.placeholder=mc22Mode==='bus'?'Rechercher un bus, un réseau ou un opérateur…':'Rechercher une ligne…';search.style.visibility=mc22Mode==='metro'?'hidden':'visible'}
}
function setModeStatus(text,state='ok'){
 const el=document.querySelector('.mc22-mode-status');if(!el)return;el.classList.toggle('loading',state==='loading');el.classList.toggle('error',state==='error');el.querySelector('span').textContent=text;
}
function modeFlash(){const f=document.querySelector('.mc22-mode-flash');if(!f)return;f.querySelector('span').textContent=`${modeLabel()} · réseau en direct`;f.classList.remove('play');void f.offsetWidth;f.classList.add('play');const old=document.getElementById('mc21Transition');if(old){const label=old.querySelector('.mc21-transition-label b');if(label)label.textContent=modeLabel();old.classList.remove('play');void old.offsetWidth;old.classList.add('play');setTimeout(()=>old.classList.remove('play'),980)}}
function flushPendingMode(){
 if(!loading&&mc221PendingMode&&mc221PendingMode!==mc22Mode){const next=mc221PendingMode;mc221PendingMode=null;document.querySelectorAll('.mc22-mode-btn').forEach(b=>b.classList.remove('mc221-pending'));setTimeout(()=>switchMode(next),0)}
}
async function switchMode(mode){
 if(!MODE_META[mode])return;
 if(mode===mc22Mode&&lastDataAt&&mode!=='metro'){loadNetworkIncidents(mode);return}
 if(loading){mc221PendingMode=mode;document.querySelectorAll('.mc22-mode-btn').forEach(b=>b.classList.toggle('mc221-pending',b.dataset.mode===mode));setModeStatus(`${MODE_META[mode].label} sera affiché juste après le chargement en cours`,'loading');return}
 mc221PendingMode=null;document.querySelectorAll('.mc22-mode-btn').forEach(b=>b.classList.remove('mc221-pending'));
 mc22Mode=mode;renderModeTabs();modeFlash();incidentLoading(mode);
 document.body.className=document.body.className.replace(/\bmc22-map-mode-\S+/g,'').trim();document.body.classList.add(`mc22-map-mode-${mode}`);
 const live=document.getElementById('liveMap');live?.classList.toggle('mc22-network-mode',mode!=='metro');
 try{if(typeof journeyActive!=='undefined'&&journeyActive&&typeof clearJourney==='function')clearJourney()}catch{}
 if(mode==='metro'){
  loading=true;setModeStatus('Retour au métro · chargement…','loading');
  try{await window.__MC22_ORIGINALS__.loadMetro(true);await window.__MC22_ORIGINALS__.refresh(false);if(mc22Mode!=='metro')return;window.__MC22_ORIGINALS__.filters();renderLiveNetwork(true);renderLineStops();window.__MC22_ORIGINALS__.stats();updateCounts();setModeStatus(`${liveFeed?.counts?.lines??16} lignes · ${liveFeed?.vehicles?.length??0} rames PRIM`);loadNetworkIncidents('metro')}catch(e){console.error(e);if(mc22Mode==='metro')setModeStatus('Métro indisponible','error')}finally{loading=false;flushPendingMode()}
  return;
 }
 await refreshNetworkMode(true,false);
}
async function fetchJson(url,timeout=55000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',signal:c.signal}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||`HTTP ${r.status}`);return d}finally{clearTimeout(t)}}
async function refreshNetworkMode(fit=false,showMessage=false){
 if(loading&&!fit)return;loading=true;const mode=mc22Mode;setModeStatus(`${MODE_META[mode].label} · synchronisation PRIM…`,'loading');
 try{
  const previous=new Set([...liveSelectedLines]),oldLines=liveFeed?.lines?.length||0,wasAll=previous.size===oldLines;
  const data=await fetchJson(`${FEED}?mode=${encodeURIComponent(mode)}`,mode==='bus'?65000:50000);
  if(mode!==mc22Mode)return;
  liveFeed=data;lastDataAt=Date.now();
  const ids=(data.lines||[]).map(x=>String(x.id));liveSelectedLines.clear();
  if(fit||wasAll||!previous.size){for(const id of ids)liveSelectedLines.add(id)}else{for(const id of ids)if(previous.has(id))liveSelectedLines.add(id);if(!liveSelectedLines.size)for(const id of ids)liveSelectedLines.add(id)}
  rebuildLiveStationIndex();renderLiveFilters();renderLiveNetwork(fit);renderLineStops();renderLineStats();updateCounts();
  const active=data.counts?.active??(data.vehicles||[]).filter(v=>v.service_state!=='upcoming').length,up=data.counts?.upcoming??0;
  setModeStatus(`${data.lines?.length||0} lignes · ${active} actifs · ${up} prévus`);
  const status=document.getElementById('liveSourceStatus');if(status){status.classList.toggle('live',(data.vehicles||[]).length>0);const s=status.querySelector('span');if(s)s.textContent=`PRIM · ${data.vehicles?.length||0} véhicules ${MODE_META[mode].label}`}
  const upd=document.getElementById('liveUpdatedAt');if(upd)upd.textContent=`PRIM ${data.vehicles?.[0]?.source_age_seconds??0}s · simulation entre arrêts IDFM`;
  loadNetworkIncidents(mode);
  if(showMessage&&typeof liveMessage==='function')liveMessage(`${data.vehicles?.length||0} véhicules ${MODE_META[mode].label} suivis`);
 }catch(e){console.error('v22 network',e);if(mode===mc22Mode){setModeStatus(`${MODE_META[mode].label} indisponible`,'error');if(showMessage&&typeof liveMessage==='function')liveMessage(`${MODE_META[mode].label} : flux indisponible`)}}finally{loading=false;flushPendingMode()}
}
function updateCounts(){
 const count=document.querySelector(`[data-count="${mc22Mode}"]`);if(count)count.textContent=liveFeed?.lines?.length??'—';
 const liveCounts=document.getElementById('liveCounts');if(liveCounts)liveCounts.textContent=`${liveFeed?.counts?.lines??liveFeed?.lines?.length??0} lignes · ${liveFeed?.counts?.stations??liveFeed?.stations?.length??0} arrêts · ${liveFeed?.vehicles?.length??0} véhicules`;
}
function countVehiclesByLine(){const m=new Map();for(const v of liveFeed?.vehicles||[]){const id=String(v.line_id);m.set(id,(m.get(id)||0)+1)}return m}
function fitNetworkSelection(){setTimeout(()=>{try{if(typeof fitLiveNetwork==='function')fitLiveNetwork()}catch{}},70)}
function chooseNetworkLine(id){
 try{if(typeof journeyActive!=='undefined'&&journeyActive&&typeof clearJourney==='function')clearJourney()}catch{}
 const all=(liveFeed?.lines||[]).map(x=>String(x.id));
 if(liveSelectedLines.size===1&&liveSelectedLines.has(id)){liveSelectedLines.clear();for(const x of all)liveSelectedLines.add(x)}else{liveSelectedLines.clear();liveSelectedLines.add(id)}
 renderLiveFilters();renderLiveNetwork(false);renderLineStops();renderLineStats();fitNetworkSelection();
}
function renderNetworkFilters(){
 const g=document.getElementById('liveLineFilters');if(!g||!liveFeed)return;g.classList.add('mc221-picker');
 const allLines=liveFeed.lines||[],counts=countVehiclesByLine(),search=document.querySelector('.mc22-line-search'),q=(search?.value||'').trim().toLowerCase();
 const matches=allLines.filter(l=>!q||`${l.code||''} ${l.name||''} ${l.long_name||''} ${l.network||''} ${l.operator||''}`.toLowerCase().includes(q));
 const allSelected=liveSelectedLines.size===allLines.length,oneSelected=liveSelectedLines.size===1,selectedId=oneSelected?[...liveSelectedLines][0]:null,selectedLine=selectedId?allLines.find(l=>String(l.id)===selectedId):null;
 let shown=[...matches];
 if(mc22Mode==='bus'){
  shown.sort((a,b)=>{const av=counts.get(String(a.id))||0,bv=counts.get(String(b.id))||0;if(av!==bv)return bv-av;return String(a.code||a.id).localeCompare(String(b.code||b.id),'fr',{numeric:true})});
  const cap=q?60:30;shown=shown.slice(0,cap);if(!q&&selectedLine&&!shown.some(l=>String(l.id)===selectedId)){shown.unshift(selectedLine);shown=shown.slice(0,cap)}
 }
 g.innerHTML='';
 const head=document.createElement('div');head.className='mc221-picker-head';
 const title=allSelected?`Tout le réseau ${MODE_META[mc22Mode]?.label||''}`:selectedLine?`${MODE_META[mc22Mode]?.label||''} ${selectedLine.code||selectedLine.id}`:`${liveSelectedLines.size} lignes sélectionnées`;
 const selectedCount=selectedId?(counts.get(selectedId)||0):0;
 const sub=selectedLine?`${selectedLine.network||selectedLine.operator||'Île-de-France Mobilités'} · ${selectedCount} véhicule${selectedCount>1?'s':''} suivi${selectedCount>1?'s':''}`:`${allLines.length} ligne${allLines.length>1?'s':''} disponible${allLines.length>1?'s':''} · clique sur une ligne pour l’isoler`;
 head.innerHTML=`<div><b>${esc(title)}</b><small>${esc(sub)}</small></div><span class="mc221-result-count">${q?`${matches.length} résultat${matches.length>1?'s':''}`:`${shown.length}${mc22Mode==='bus'&&allLines.length>shown.length?' affichées':''}`}</span>`;g.appendChild(head);
 if(!shown.length){const empty=document.createElement('div');empty.className='mc221-empty';empty.textContent=`Aucune ligne trouvée pour « ${q} ».`;g.appendChild(empty)}else{
  const grid=document.createElement('div');grid.className='mc221-line-grid';
  for(const line of shown){const id=String(line.id),n=counts.get(id)||0,b=document.createElement('button');b.type='button';b.className='mc221-line-choice'+(!allSelected&&liveSelectedLines.has(id)?' active':'');b.dataset.lineId=id;b.title=`${MODE_META[mc22Mode]?.label||''} ${line.code||line.id} · ${line.network||line.operator||'IDFM'} · ${n} véhicule${n>1?'s':''}`;const color=line.color||'#60758a',text=line.text_color||'#fff';b.innerHTML=`<span class="mc221-line-code" style="background:${color};color:${text}">${esc(line.code||line.id)}</span><span class="mc221-line-meta"><b>${esc(line.network||line.operator||MODE_META[mc22Mode]?.label||'IDFM')}</b><small>${n} véhicule${n>1?'s':''}</small></span>`;b.addEventListener('click',()=>chooseNetworkLine(id));grid.appendChild(b)}
  g.appendChild(grid)
 }
 const foot=document.createElement('div');foot.className='mc221-picker-foot';
 if(mc22Mode==='bus'&&!q&&allLines.length>shown.length)foot.innerHTML=`<strong>${shown.length} lignes les plus actives</strong><span>Utilise la recherche pour accéder aux ${allLines.length} lignes Bus.</span>`;
 else if(q)foot.innerHTML=`<strong>Recherche active</strong><span>${matches.length} ligne${matches.length>1?'s':''} correspondante${matches.length>1?'s':''}.</span>`;
 else foot.innerHTML=`<strong>${allSelected?'Réseau complet':'Filtre actif'}</strong><span>${allSelected?'Toutes les lignes sont visibles sur la carte.':'Clique à nouveau sur la ligne sélectionnée pour revenir à tout le réseau.'}</span>`;
 g.appendChild(foot);
 const all=document.getElementById('liveAllLines');if(all){all.classList.toggle('active',allSelected);all.textContent=allSelected?`Tout le réseau (${allLines.length})`:`Afficher tout (${allLines.length})`}
}
function renderNetworkLines(){
 if(!liveLineLayer||!liveFeed)return;liveLineLayer.clearLayers();try{liveLineLayers.clear()}catch{};try{if(journeyActive)return}catch{}
 const weight=mc22Mode==='rer'?5.4:mc22Mode==='transilien'?4.6:mc22Mode==='tram'?5:3.2;
 for(const line of liveFeed.lines||[]){const id=String(line.id);if(!line.shape||!liveSelectedLines.has(id))continue;const layer=L.geoJSON(line.shape,{style:{color:line.color||'#60758a',weight,opacity:mc22Mode==='bus'?.72:.9,lineCap:'round',lineJoin:'round'},interactive:true});layer.bindTooltip(`${MODE_META[mc22Mode].label} ${esc(line.code||line.id)}${line.network?' · '+esc(line.network):''}`,{sticky:true});layer.addTo(liveLineLayer);try{liveLineLayers.set(id,layer)}catch{}}
}
function lineBadges(ids){return(ids||[]).map(id=>lineById(id)).filter(Boolean).slice(0,8).map(l=>`<span class="mc22-line-badge" style="background:${l.color||'#60758a'};color:${l.text_color||'#fff'}">${esc(l.code||l.id)}</span>`).join('')}
function renderNetworkStations(){
 if(!liveStationLayer||!liveFeed||!liveLeaflet)return;liveStationLayer.clearLayers();try{if(journeyActive)return}catch{};const z=liveLeaflet.getZoom(),single=liveSelectedLines.size===1;
 for(const s of liveFeed.stations||[]){if(!s.line_ids?.some(x=>liveSelectedLines.has(String(x))))continue;const showDot=single||s.is_major||z>=(mc22Mode==='bus'?13.2:11.4);if(!showDot)continue;const showLabel=single?z>=10.7:z>=Number(s.label_min_zoom||13),marker=L.circleMarker([s.lat,s.lon],{renderer:liveStationRenderer,radius:s.is_major?4.7:(mc22Mode==='bus'?2.7:3.3),color:'#14273d',weight:s.is_major?1.8:1.1,fillColor:'#fff',fillOpacity:1,opacity:.94,bubblingMouseEvents:false});
  const related=(liveFeed.vehicles||[]).filter(v=>String(v.from_station_id)===String(s.id)||String(v.to_station_id)===String(s.id)).slice(0,6),rows=related.length?related.map(v=>{const l=lineById(v.line_id);return`<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span class="mc22-line-badge" style="background:${l?.color||'#60758a'};color:${l?.text_color||'#fff'}">${esc(l?.code||v.line_code||'?')}</span><span>${esc(v.status==='at_station'?'À quai':v.status==='approaching'?'À l’approche':v.service_state==='upcoming'?'Départ prévu':'En route')} · ${esc(v.destination_name||'destination')}</span></div>`}).join(''):'<div style="margin-top:7px;color:#70869a">Aucun véhicule suivi à cet arrêt pour le moment.</div>';
  marker.bindPopup(`<div class="station-board-popup-title"><b>${esc(s.name)}</b></div><div style="display:flex;gap:5px;flex-wrap:wrap;margin:7px 0">${lineBadges(s.line_ids)}</div><div style="font-size:11px">${rows}</div>`,{maxWidth:430});if(showLabel)marker.bindTooltip(s.name,{permanent:true,direction:'right',offset:[6,0],className:'metro-station-label'});marker.addTo(liveStationLayer)
 }
}
function renderNetworkStats(){
 const box=document.getElementById('liveLineStats');if(!box||!liveFeed)return;const selected=liveSelectedLines,vs=(liveFeed.vehicles||[]).filter(v=>selected.has(String(v.line_id))),counts={route:0,approach:0,quai:0,up:0};for(const v of vs){if(v.service_state==='upcoming'||v.status==='queued')counts.up++;else if(v.status==='at_station')counts.quai++;else if(v.status==='approaching')counts.approach++;else counts.route++}const src=vs.map(v=>Date.parse(v.source_response_timestamp||'')).filter(Number.isFinite),age=src.length?Math.max(0,Math.round((Date.now()-Math.max(...src))/1000)):null;let lead='Véhicules connus',accent='#60758a';if(selected.size===1){const l=lineById([...selected][0]);lead=`${MODE_META[mc22Mode].label} ${l?.code||l?.id||''}`;accent=l?.color||accent}box.innerHTML=`<div class="live-stat-card" style="border-top:3px solid ${accent}"><b>${vs.length}</b><small>${esc(lead)}</small></div><div class="live-stat-card"><b>${counts.route}</b><small>en route</small></div><div class="live-stat-card"><b>${counts.approach}</b><small>à l’approche</small></div><div class="live-stat-card"><b>${counts.quai}</b><small>à l’arrêt</small></div><div class="live-stat-card"><b>${counts.up}</b><small>départs prévus</small></div><div class="live-stat-card"><b>${age==null?'—':age+' s'}</b><small>âge source PRIM</small></div>`;
}
function drawNetworkTrain(ctx,t,x,y,angle,status){
 const code=String(t.line?.code||t.v?.line_code||t.line?.id||'?'),single=liveSelectedLines.size===1,w=Math.min(48,(single?31:27)+Math.max(0,code.length-1)*5),h=single?15:12,fill=t.line?.color||'#60758a',txt=t.line?.text_color||'#fff',up=t.v?.service_state==='upcoming'||status==='Départ prévu',conf=Number(t.v?.confidence??60);ctx.save();ctx.globalAlpha=up?.62:conf<45?.75:1;ctx.translate(x,y);if(Number.isFinite(angle))ctx.rotate(angle);ctx.shadowColor='rgba(5,15,25,.28)';ctx.shadowBlur=5;ctx.shadowOffsetY=1;ctx.beginPath();ctx.roundRect?ctx.roundRect(-w/2,-h/2,w,h,4):ctx.rect(-w/2,-h/2,w,h);ctx.fillStyle='rgba(255,255,255,.97)';ctx.fill();ctx.shadowColor='transparent';ctx.beginPath();ctx.roundRect?ctx.roundRect(-w/2+2,-h/2+2,w-4,h-4,2.7):ctx.rect(-w/2+2,-h/2+2,w-4,h-4);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=1.1;ctx.strokeStyle='#102238';ctx.stroke();if(status==='À quai'||status==='À l’approche'){ctx.beginPath();ctx.roundRect?ctx.roundRect(-w/2-2,-h/2-2,w+4,h+4,5):ctx.rect(-w/2-2,-h/2-2,w+4,h+4);ctx.lineWidth=2;ctx.strokeStyle=status==='À quai'?'#18b183':'#f5a623';ctx.stroke()}ctx.fillStyle=txt;ctx.font=`900 ${code.length>3?6.2:7.3}px Inter,system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(code,-2,.2);ctx.beginPath();ctx.moveTo(w/2-3,0);ctx.lineTo(w/2-7,-3);ctx.lineTo(w/2-7,3);ctx.closePath();ctx.fill();ctx.restore();return Math.max(w,h)/2
}
function incidentText(d){const ms=d?.messages||[];return ms.find(m=>/titre|notification/i.test(m.channel||''))?.text||ms[0]?.text||d?.cause||'Information trafic'}
function severityColor(d){const e=String(d?.severity?.effect||'').toUpperCase();if(/NO_SERVICE|REDUCED_SERVICE/.test(e))return'#ef6262';if(/DELAY|DETOUR|MODIFIED|SIGNIFICANT/.test(e))return'#f0a94b';return d?.severity?.color||'#f0a94b'}
function incidentLoading(mode){
 const panel=document.querySelector('.mc21-incidents');if(!panel)return;const cached=mc221IncidentCache.get(mode);if(cached){renderNetworkIncidents(cached,mode);return}const label=MODE_META[mode]?.label||mode;
 panel.innerHTML=`<div class="mc21-incident-head"><h3>Incidents · ${esc(label)}</h3><span class="mc21-live-badge">IDFM LIVE</span></div><div class="mc221-incident-loading"><div><i></i>Chargement du trafic ${esc(label)}…<br><small>Le réseau précédent n’est plus affiché.</small></div></div>`;
}
async function loadNetworkIncidents(mode){
 const seq=++mc221IncidentSeq;incidentLoading(mode);
 try{const d=await fetchJson(`${TRAFFIC}?mode=${encodeURIComponent(mode)}`,mode==='bus'?50000:35000);mc221IncidentCache.set(mode,d);if(seq===mc221IncidentSeq&&mode===mc22Mode){try{trafficData=d;trafficMode=mode}catch{}renderNetworkIncidents(d,mode)}return d}catch(e){console.warn('v22 traffic',mode,e);if(seq===mc221IncidentSeq&&mode===mc22Mode){const panel=document.querySelector('.mc21-incidents'),label=MODE_META[mode]?.label||mode;if(panel)panel.innerHTML=`<div class="mc21-incident-head"><h3>Incidents · ${esc(label)}</h3><span class="mc21-live-badge">IDFM</span></div><div class="mc221-incident-loading"><div>Bulletin trafic momentanément indisponible.<br><small>La carte ${esc(label)} continue de fonctionner.</small></div></div>`}return null}
}
function renderNetworkIncidents(data,mode){
 const panel=document.querySelector('.mc21-incidents');if(!panel)return;const entries=[];for(const r of data?.reports||[])for(const d of r.disruptions||[])if(d.time_state!=='inactive')entries.push({line:r.line,d});entries.sort((a,b)=>{const aa=a.d.time_state==='active'?0:1,bb=b.d.time_state==='active'?0:1;return aa-bb+(Number(a.d.severity?.priority||50)-Number(b.d.severity?.priority||50))});const active=entries.filter(x=>x.d.time_state==='active').length,label=MODE_META[mode]?.label||mode;
 panel.innerHTML=`<div class="mc21-incident-head"><h3>Incidents · ${esc(label)}</h3><span class="mc21-live-badge">IDFM LIVE</span></div><div class="mc22-incident-summary"><div><strong>${entries.length?`${active} incident${active>1?'s':''} actif${active>1?'s':''}`:'Trafic normal'}</strong><span>${entries.length?`${entries.length-active} perturbation${entries.length-active>1?'s':''} à venir`:'Aucune perturbation remontée pour ce mode.'}</span></div><span class="mc22-incident-count">${entries.length}</span></div><div class="mc22-incident-cards">${entries.length?entries.slice(0,9).map(({line,d})=>`<article class="mc22-incident-card"><span class="mc22-line-badge" style="background:${line?.color||'#60758a'};color:${line?.text_color||'#fff'}">${esc(line?.code||line?.name||'?')}</span><div class="mc22-incident-copy"><b><i class="mc22-severity-dot" style="background:${severityColor(d)}"></i>${d.time_state==='active'?'En cours':'À venir'}</b><p>${esc(incidentText(d))}</p><em>${esc(line?.network||'Île-de-France Mobilités')}</em></div></article>`).join(''):`<div class="mc22-incident-empty">✓ Aucun incident de service remonté actuellement sur les lignes ${esc(label)}.</div>`}</div><div class="mc21-incident-foot"><span>Mise à jour ${new Date(data?.generated_at||Date.now()).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span><a href="https://www.ratp.fr/infos-trafic" target="_blank" rel="noopener">Bulletin trafic ↗</a></div>`;
}
boot();
})();