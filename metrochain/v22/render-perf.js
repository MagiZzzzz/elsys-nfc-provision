(()=>{
'use strict';
if(window.__MC226_RENDER_PERF__)return;
window.__MC226_RENDER_PERF__={version:'v22.6',stationMs:0,stationRendered:0,statsMs:0};
let installed=false,indexedFeed=null,index=null,stationRaf=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const mode=()=>{const c=[...document.body.classList].find(x=>x.startsWith('mc22-map-mode-'));return c?c.replace('mc22-map-mode-',''):(typeof liveFeed!=='undefined'&&liveFeed?.mode)||'metro'};
function buildIndex(){
  if(indexedFeed===liveFeed&&index)return index;
  const byStation=new Map(),lineMap=new Map();
  for(const l of liveFeed?.lines||[])lineMap.set(String(l.id),l);
  for(const v of liveFeed?.vehicles||[]){
    for(const sid of new Set([v.from_station_id,v.to_station_id].filter(x=>x!==null&&x!==undefined).map(String))){
      if(!byStation.has(sid))byStation.set(sid,[]);
      byStation.get(sid).push(v);
    }
  }
  indexedFeed=liveFeed;index={byStation,lineMap};return index;
}
function badges(ids,idx){return(ids||[]).map(id=>idx.lineMap.get(String(id))).filter(Boolean).slice(0,8).map(l=>`<span class="mc22-line-badge" style="background:${l.color||'#60758a'};color:${l.text_color||'#fff'}">${esc(l.code||l.id)}</span>`).join('')}
function renderStationsNow(targetMode){
  stationRaf=0;
  if(targetMode==='metro'||mode()!==targetMode||!liveStationLayer||!liveFeed||!liveLeaflet)return;
  const t0=performance.now();liveStationLayer.clearLayers();
  try{if(typeof journeyActive!=='undefined'&&journeyActive)return}catch{}
  const idx=buildIndex(),z=liveLeaflet.getZoom(),single=liveSelectedLines.size===1;
  const bounds=!single&&typeof liveLeaflet.getBounds==='function'?liveLeaflet.getBounds().pad(.18):null;
  let rendered=0;
  for(const s of liveFeed.stations||[]){
    if(!s.line_ids?.some(x=>liveSelectedLines.has(String(x))))continue;
    if(bounds&&Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&!bounds.contains([s.lat,s.lon])&&!s.is_major)continue;
    const showDot=single||s.is_major||z>=(targetMode==='bus'?13.35:11.45);if(!showDot)continue;
    const majorLabelZoom=targetMode==='bus'?12.3:10.2;
    const showLabel=single?z>=10.6:(s.is_major?z>=majorLabelZoom:z>=Number(s.label_min_zoom||13));
    const opts={radius:s.is_major?4.5:(targetMode==='bus'?2.5:3.1),color:'#14273d',weight:s.is_major?1.7:1.05,fillColor:'#fff',fillOpacity:1,opacity:.94,bubblingMouseEvents:false};
    try{if(typeof liveStationRenderer!=='undefined'&&liveStationRenderer)opts.renderer=liveStationRenderer}catch{}
    const marker=L.circleMarker([s.lat,s.lon],opts),related=(idx.byStation.get(String(s.id))||[]).slice(0,5);
    const rows=related.length?related.map(v=>{const l=idx.lineMap.get(String(v.line_id));const st=v.status==='at_station'?'À quai':v.status==='approaching'?'À l’approche':v.service_state==='upcoming'?'Départ prévu':'En route';return`<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span class="mc22-line-badge" style="background:${l?.color||'#60758a'};color:${l?.text_color||'#fff'}">${esc(l?.code||v.line_code||'?')}</span><span>${esc(st)} · ${esc(v.destination_name||'destination')}</span></div>`}).join(''):'<div style="margin-top:7px;color:#70869a">Aucun véhicule suivi à cet arrêt pour le moment.</div>';
    marker.bindPopup(`<div class="station-board-popup-title"><b>${esc(s.name)}</b></div><div style="display:flex;gap:5px;flex-wrap:wrap;margin:7px 0">${badges(s.line_ids,idx)}</div><div style="font-size:11px">${rows}</div>`,{maxWidth:430});
    if(showLabel)marker.bindTooltip(s.name,{permanent:true,direction:'right',offset:[6,0],className:'metro-station-label'});
    marker.addTo(liveStationLayer);rendered++;
  }
  window.__MC226_RENDER_PERF__.stationRendered=rendered;window.__MC226_RENDER_PERF__.stationMs=performance.now()-t0;
}
function optimizedStations(){
  const m=mode();if(m==='metro')return window.__MC226_ORIGINAL_STATIONS__();
  if(stationRaf)cancelAnimationFrame(stationRaf);
  stationRaf=requestAnimationFrame(()=>renderStationsNow(m));
}
function optimizedStats(){
  const m=mode();if(m==='metro')return window.__MC226_ORIGINAL_STATS__();
  const t0=performance.now(),box=document.getElementById('liveLineStats');if(!box||!liveFeed)return;
  const selected=liveSelectedLines,counts={route:0,approach:0,quai:0,up:0};let total=0,newest=0,lead='Véhicules connus',accent='#60758a';
  const idx=buildIndex();
  for(const v of liveFeed.vehicles||[]){if(!selected.has(String(v.line_id)))continue;total++;if(v.service_state==='upcoming'||v.status==='queued')counts.up++;else if(v.status==='at_station')counts.quai++;else if(v.status==='approaching')counts.approach++;else counts.route++;const ts=Date.parse(v.source_response_timestamp||'');if(Number.isFinite(ts)&&ts>newest)newest=ts}
  if(selected.size===1){const l=idx.lineMap.get(String([...selected][0]));lead=`${m==='rer'?'RER':m==='transilien'?'Transilien':m==='tram'?'Tram':'Bus'} ${l?.code||l?.id||''}`;accent=l?.color||accent}
  const age=newest?Math.max(0,Math.round((Date.now()-newest)/1000)):null;
  box.innerHTML=`<div class="live-stat-card" style="border-top:3px solid ${accent}"><b>${total}</b><small>${esc(lead)}</small></div><div class="live-stat-card"><b>${counts.route}</b><small>en route</small></div><div class="live-stat-card"><b>${counts.approach}</b><small>à l’approche</small></div><div class="live-stat-card"><b>${counts.quai}</b><small>à l’arrêt</small></div><div class="live-stat-card"><b>${counts.up}</b><small>départs prévus</small></div><div class="live-stat-card"><b>${age==null?'—':age+' s'}</b><small>âge source PRIM</small></div>`;
  window.__MC226_RENDER_PERF__.statsMs=performance.now()-t0;
}
function install(){
  if(installed||!window.__MC22_THEME__||typeof renderLiveStations!=='function'||typeof renderLineStats!=='function')return false;
  installed=true;window.__MC226_ORIGINAL_STATIONS__=renderLiveStations;window.__MC226_ORIGINAL_STATS__=renderLineStats;
  window.renderLiveStations=optimizedStations;window.renderLineStats=optimizedStats;
  let zoomTimer=0;try{liveLeaflet?.on('zoomend moveend',()=>{clearTimeout(zoomTimer);zoomTimer=setTimeout(()=>{if(mode()!=='metro')optimizedStations()},70)})}catch{}
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&stationRaf){cancelAnimationFrame(stationRaf);stationRaf=0}},{passive:true});
  console.info('MetroChain v22.6 render perf installed');return true;
}
let tries=0;const t=setInterval(()=>{if(install()||++tries>220)clearInterval(t)},50);
})();
