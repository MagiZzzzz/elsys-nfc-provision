(()=>{
  'use strict';
  if(window.__MC22_PERF__) return;

  if(window.__MC22_NATIVE_SET_INTERVAL__) window.setInterval=window.__MC22_NATIVE_SET_INTERVAL__;

  const perf=window.__MC22_PERF__={
    version:'v22-perf1',
    installs:0,
    filterMs:0,
    stationMs:0,
    statsMs:0,
    stationRendered:0,
    lastMode:'metro'
  };

  let indexedFeed=null,index=null,stationRaf=0;

  const esc=v=>{
    try{return typeof htmlEsc==='function'?htmlEsc(String(v??'')):String(v??'')}
    catch{return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
  };
  const mode=()=>{
    const c=[...document.body.classList].find(x=>x.startsWith('mc22-map-mode-'));
    return c?c.replace('mc22-map-mode-',''):(liveFeed?.mode||'metro');
  };
  const meta=m=>({rer:'RER',transilien:'Transilien',tram:'Tram',bus:'Bus',metro:'Métro'})[m]||m;

  function buildIndex(){
    if(indexedFeed===liveFeed&&index)return index;
    const byLine=new Map(),byStation=new Map(),lineMap=new Map(),countByLine=new Map();
    for(const l of liveFeed?.lines||[])lineMap.set(String(l.id),l);
    for(const v of liveFeed?.vehicles||[]){
      const lid=String(v.line_id??'');
      if(!byLine.has(lid))byLine.set(lid,[]);
      byLine.get(lid).push(v);
      countByLine.set(lid,(countByLine.get(lid)||0)+1);
      const ids=[v.from_station_id,v.to_station_id].filter(x=>x!==null&&x!==undefined).map(String);
      for(const sid of new Set(ids)){
        if(!byStation.has(sid))byStation.set(sid,[]);
        byStation.get(sid).push(v);
      }
    }
    indexedFeed=liveFeed;
    index={byLine,byStation,lineMap,countByLine};
    return index;
  }

  function selectedVehicles(){
    const idx=buildIndex(),all=liveFeed?.vehicles||[],lines=liveFeed?.lines||[];
    if(liveSelectedLines.size>=lines.length)return all;
    const out=[];
    for(const id of liveSelectedLines){const a=idx.byLine.get(String(id));if(a)out.push(...a)}
    return out;
  }

  function perfRenderFilters(){
    const t0=performance.now(),g=document.getElementById('liveLineFilters');if(!g||!liveFeed)return;
    const m=mode(),idx=buildIndex(),q=(document.querySelector('.mc22-line-search')?.value||'').trim().toLowerCase();
    const lines=(liveFeed.lines||[]).filter(l=>!q||`${l.code||''} ${l.name||''} ${l.network||''}`.toLowerCase().includes(q));
    const max=m==='bus'?180:500,frag=document.createDocumentFragment();
    g.textContent='';
    for(const line of lines.slice(0,max)){
      const id=String(line.id),n=idx.countByLine.get(id)||0,b=document.createElement('button');
      b.className='live-line-btn'+(liveSelectedLines.has(id)?'':' off');b.dataset.lineId=id;
      b.innerHTML=`<span>${esc(line.code||line.id)}</span><small>${n}</small>`;b.style.background=line.color||'#60758a';b.style.color=line.text_color||'#fff';
      b.title=`${meta(m)} ${line.code||line.id} · ${line.network||'IDFM'} · ${n} véhicule${n>1?'s':''}`;
      b.onclick=()=>{
        try{if(typeof journeyActive!=='undefined'&&journeyActive&&typeof clearJourney==='function')clearJourney()}catch{}
        if(liveSelectedLines.size===1&&liveSelectedLines.has(id)){liveSelectedLines.clear();for(const x of liveFeed.lines||[])liveSelectedLines.add(String(x.id))}
        else{liveSelectedLines.clear();liveSelectedLines.add(id)}
        renderLiveFilters();renderLiveNetwork(false);renderLineStops();renderLineStats();
      };
      frag.appendChild(b);
    }
    g.appendChild(frag);
    const all=document.getElementById('liveAllLines');if(all){all.classList.toggle('active',liveSelectedLines.size===(liveFeed.lines||[]).length);all.textContent=m==='bus'?`Tous actifs (${liveFeed.lines?.length||0})`:'Toutes'}
    perf.filterMs=performance.now()-t0;perf.lastMode=m;
  }

  function badges(ids,idx){
    return(ids||[]).map(id=>idx.lineMap.get(String(id))).filter(Boolean).slice(0,8).map(l=>`<span class="mc22-line-badge" style="background:${l.color||'#60758a'};color:${l.text_color||'#fff'}">${esc(l.code||l.id)}</span>`).join('');
  }

  function renderStationsNow(targetMode){
    stationRaf=0;if(mode()!==targetMode||!liveStationLayer||!liveFeed||!liveLeaflet)return;
    const t0=performance.now();
    liveStationLayer.clearLayers();
    try{if(typeof journeyActive!=='undefined'&&journeyActive)return}catch{}
    const idx=buildIndex(),z=liveLeaflet.getZoom(),single=liveSelectedLines.size===1;
    const bounds=!single&&typeof liveLeaflet.getBounds==='function'?liveLeaflet.getBounds().pad(.22):null;
    const frag=[];
    for(const s of liveFeed.stations||[]){
      if(!s.line_ids?.some(x=>liveSelectedLines.has(String(x))))continue;
      if(bounds&&Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&!bounds.contains([s.lat,s.lon])&&!s.is_major)continue;
      const showDot=single||s.is_major||z>=(targetMode==='bus'?13.2:11.4);if(!showDot)continue;
      const showLabel=single?z>=10.7:z>=Number(s.label_min_zoom||13);
      const opts={radius:s.is_major?4.7:(targetMode==='bus'?2.7:3.3),color:'#14273d',weight:s.is_major?1.8:1.1,fillColor:'#fff',fillOpacity:1,opacity:.94,bubblingMouseEvents:false};
      try{if(typeof liveStationRenderer!=='undefined'&&liveStationRenderer)opts.renderer=liveStationRenderer}catch{}
      const marker=L.circleMarker([s.lat,s.lon],opts),related=(idx.byStation.get(String(s.id))||[]).slice(0,6);
      const rows=related.length?related.map(v=>{const l=idx.lineMap.get(String(v.line_id));return`<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span class="mc22-line-badge" style="background:${l?.color||'#60758a'};color:${l?.text_color||'#fff'}">${esc(l?.code||v.line_code||'?')}</span><span>${esc(v.status==='at_station'?'À quai':v.status==='approaching'?'À l’approche':v.service_state==='upcoming'?'Départ prévu':'En route')} · ${esc(v.destination_name||'destination')}</span></div>`}).join(''):'<div style="margin-top:7px;color:#70869a">Aucun véhicule suivi à cet arrêt pour le moment.</div>';
      marker.bindPopup(`<div class="station-board-popup-title"><b>${esc(s.name)}</b></div><div style="display:flex;gap:5px;flex-wrap:wrap;margin:7px 0">${badges(s.line_ids,idx)}</div><div style="font-size:11px">${rows}</div>`,{maxWidth:430});
      if(showLabel)marker.bindTooltip(s.name,{permanent:true,direction:'right',offset:[6,0],className:'metro-station-label'});
      frag.push(marker);
    }
    for(const marker of frag)marker.addTo(liveStationLayer);
    perf.stationRendered=frag.length;perf.stationMs=performance.now()-t0;perf.lastMode=targetMode;
  }

  function perfRenderStations(){
    const target=mode();
    if(stationRaf)cancelAnimationFrame(stationRaf);
    stationRaf=requestAnimationFrame(()=>renderStationsNow(target));
  }

  function perfRenderStats(){
    const t0=performance.now(),box=document.getElementById('liveLineStats');if(!box||!liveFeed)return;
    const m=mode(),idx=buildIndex(),vs=selectedVehicles(),counts={route:0,approach:0,quai:0,up:0};
    let newest=0;
    for(const v of vs){
      if(v.service_state==='upcoming'||v.status==='queued')counts.up++;else if(v.status==='at_station')counts.quai++;else if(v.status==='approaching')counts.approach++;else counts.route++;
      const ts=Date.parse(v.source_response_timestamp||'');if(Number.isFinite(ts)&&ts>newest)newest=ts;
    }
    const age=newest?Math.max(0,Math.round((Date.now()-newest)/1000)):null;
    let lead='Véhicules connus',accent='#60758a';if(liveSelectedLines.size===1){const l=idx.lineMap.get(String([...liveSelectedLines][0]));lead=`${meta(m)} ${l?.code||l?.id||''}`;accent=l?.color||accent}
    box.innerHTML=`<div class="live-stat-card" style="border-top:3px solid ${accent}"><b>${vs.length}</b><small>${esc(lead)}</small></div><div class="live-stat-card"><b>${counts.route}</b><small>en route</small></div><div class="live-stat-card"><b>${counts.approach}</b><small>à l’approche</small></div><div class="live-stat-card"><b>${counts.quai}</b><small>à l’arrêt</small></div><div class="live-stat-card"><b>${counts.up}</b><small>départs prévus</small></div><div class="live-stat-card"><b>${age==null?'—':age+' s'}</b><small>âge source PRIM</small></div>`;
    document.querySelectorAll('.live-line-btn[data-line-id]').forEach(b=>{const n=idx.countByLine.get(String(b.dataset.lineId))||0;b.title=(b.title||'').replace(/ · \d+ véhicule.*$/,'')+` · ${n} véhicule${n>1?'s':''}`});
    perf.statsMs=performance.now()-t0;perf.lastMode=m;
  }

  function install(){
    if(perf.installs)return;
    if(!window.__MC22_THEME__||!window.__MC22_ORIGINALS__||typeof renderLiveFilters!=='function'||typeof renderLiveStations!=='function'||typeof renderLineStats!=='function')return;
    perf.installs=1;
    const ORIG=window.__MC22_ORIGINALS__;
    window.renderLiveFilters=function(){return mode()==='metro'?ORIG.filters():perfRenderFilters()};
    window.renderLiveStations=function(){if(mode()==='metro'){if(stationRaf){cancelAnimationFrame(stationRaf);stationRaf=0}return ORIG.stations()}return perfRenderStations()};
    window.renderLineStats=function(){return mode()==='metro'?ORIG.stats():perfRenderStats()};
    window.addEventListener('visibilitychange',()=>{if(document.hidden&&stationRaf){cancelAnimationFrame(stationRaf);stationRaf=0}},{passive:true});
    console.info('MetroChain v22 performance guard installed');
  }

  let tries=0;const t=setInterval(()=>{install();if(perf.installs||++tries>240)clearInterval(t)},50);
})();
