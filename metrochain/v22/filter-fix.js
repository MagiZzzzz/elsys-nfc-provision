(()=>{
'use strict';
if(window.__MC221_BOOTING__)return;window.__MC221_BOOTING__=true;
function boot(n=0){
 try{
  if(typeof mc22Mode==='undefined'||typeof renderNetworkFilters!=='function'||typeof switchMode!=='function'||typeof loadNetworkIncidents!=='function'||typeof renderNetworkIncidents!=='function'||!document.querySelector('.mc22-network-toolbar')){
   if(n<220)setTimeout(()=>boot(n+1),100);return;
  }
  install();
 }catch(e){if(n<220)setTimeout(()=>boot(n+1),100);else console.error('MetroChain v22.1 boot',e)}
}
function install(){
 if(window.__MC221_FILTER_FIX__)return;window.__MC221_FILTER_FIX__='v22.1-filter-stability';
 const baseSwitch=switchMode;
 let pendingMode=null,incidentSeq=0;
 const incidentCache=new Map();

 function countVehicles(){
  const m=new Map();for(const v of liveFeed?.vehicles||[]){const id=String(v.line_id);m.set(id,(m.get(id)||0)+1)}return m;
 }
 function lineSort(a,b,counts){
  const av=counts.get(String(a.id))||0,bv=counts.get(String(b.id))||0;if(av!==bv)return bv-av;
  return String(a.code||a.id).localeCompare(String(b.code||b.id),'fr',{numeric:true});
 }
 function fitSelection(){
  setTimeout(()=>{try{if(typeof fitLiveNetwork==='function')fitLiveNetwork()}catch{}},70);
 }
 function chooseLine(id){
  try{if(typeof journeyActive!=='undefined'&&journeyActive&&typeof clearJourney==='function')clearJourney()}catch{}
  const all=(liveFeed?.lines||[]).map(x=>String(x.id));
  if(liveSelectedLines.size===1&&liveSelectedLines.has(id)){liveSelectedLines.clear();for(const x of all)liveSelectedLines.add(x)}
  else{liveSelectedLines.clear();liveSelectedLines.add(id)}
  renderLiveFilters();renderLiveNetwork(false);renderLineStops();renderLineStats();fitSelection();
 }

 renderNetworkFilters=function(){
  const g=document.getElementById('liveLineFilters');if(!g||!liveFeed)return;
  g.classList.add('mc221-picker');
  const allLines=liveFeed.lines||[],counts=countVehicles(),search=document.querySelector('.mc22-line-search');
  const q=(search?.value||'').trim().toLowerCase();
  const matches=allLines.filter(l=>!q||`${l.code||''} ${l.name||''} ${l.long_name||''} ${l.network||''} ${l.operator||''}`.toLowerCase().includes(q));
  const allSelected=liveSelectedLines.size===allLines.length,oneSelected=liveSelectedLines.size===1;
  const selectedId=oneSelected?[...liveSelectedLines][0]:null,selectedLine=selectedId?allLines.find(l=>String(l.id)===selectedId):null;
  let shown=[...matches];
  if(mc22Mode==='bus'){
   shown.sort((a,b)=>lineSort(a,b,counts));
   const cap=q?60:30;shown=shown.slice(0,cap);
   if(!q&&selectedLine&&!shown.some(l=>String(l.id)===selectedId)){shown.unshift(selectedLine);shown=shown.slice(0,cap)}
  }
  g.innerHTML='';
  const head=document.createElement('div');head.className='mc221-picker-head';
  const title=allSelected?`Tout le réseau ${MODE_META[mc22Mode]?.label||''}`:selectedLine?`${MODE_META[mc22Mode]?.label||''} ${selectedLine.code||selectedLine.id}`:`${liveSelectedLines.size} lignes sélectionnées`;
  const sub=selectedLine?`${selectedLine.network||selectedLine.operator||'Île-de-France Mobilités'} · ${counts.get(selectedId)||0} véhicule${(counts.get(selectedId)||0)>1?'s':''} suivi${(counts.get(selectedId)||0)>1?'s':''}`:`${allLines.length} ligne${allLines.length>1?'s':''} disponible${allLines.length>1?'s':''} · clique sur une ligne pour l’isoler`;
  head.innerHTML=`<div><b>${esc(title)}</b><small>${esc(sub)}</small></div><span class="mc221-result-count">${q?`${matches.length} résultat${matches.length>1?'s':''}`:`${shown.length}${mc22Mode==='bus'&&allLines.length>shown.length?' affichées':''}`}</span>`;
  g.appendChild(head);
  if(!shown.length){const empty=document.createElement('div');empty.className='mc221-empty';empty.textContent=`Aucune ligne trouvée pour « ${q} ».`;g.appendChild(empty)}
  else{
   const grid=document.createElement('div');grid.className='mc221-line-grid';
   for(const line of shown){
    const id=String(line.id),n=counts.get(id)||0,b=document.createElement('button');b.type='button';b.className='mc221-line-choice'+(!allSelected&&liveSelectedLines.has(id)?' active':'');b.dataset.lineId=id;
    b.title=`${MODE_META[mc22Mode]?.label||''} ${line.code||line.id} · ${line.network||line.operator||'IDFM'} · ${n} véhicule${n>1?'s':''}`;
    const color=line.color||'#60758a',text=line.text_color||'#fff';
    b.innerHTML=`<span class="mc221-line-code" style="background:${color};color:${text}">${esc(line.code||line.id)}</span><span class="mc221-line-meta"><b>${esc(line.network||line.operator||MODE_META[mc22Mode]?.label||'IDFM')}</b><small>${n} véhicule${n>1?'s':''}</small></span>`;
    b.addEventListener('click',()=>chooseLine(id));grid.appendChild(b);
   }
   g.appendChild(grid);
  }
  const foot=document.createElement('div');foot.className='mc221-picker-foot';
  if(mc22Mode==='bus'&&!q&&allLines.length>shown.length)foot.innerHTML=`<strong>${shown.length} lignes les plus actives</strong><span>Utilise la recherche pour accéder aux ${allLines.length} lignes Bus.</span>`;
  else if(q)foot.innerHTML=`<strong>Recherche active</strong><span>${matches.length} ligne${matches.length>1?'s':''} correspondante${matches.length>1?'s':''}.</span>`;
  else foot.innerHTML=`<strong>${allSelected?'Réseau complet':'Filtre actif'}</strong><span>${allSelected?'Toutes les lignes sont visibles sur la carte.':'Clique à nouveau sur la ligne sélectionnée pour revenir à tout le réseau.'}</span>`;
  g.appendChild(foot);
  const all=document.getElementById('liveAllLines');if(all){all.classList.toggle('active',allSelected);all.textContent=allSelected?`Tout le réseau (${allLines.length})`:`Afficher tout (${allLines.length})`}
 };

 function incidentLoading(mode){
  const panel=document.querySelector('.mc21-incidents');if(!panel)return;
  const cached=incidentCache.get(mode);if(cached){renderNetworkIncidents(cached,mode);return}
  const label=MODE_META[mode]?.label||mode;
  panel.innerHTML=`<div class="mc21-incident-head"><h3>Incidents · ${esc(label)}</h3><span class="mc21-live-badge">IDFM LIVE</span></div><div class="mc221-incident-loading"><div><i></i>Chargement du trafic ${esc(label)}…<br><small>Le réseau précédent n’est plus affiché.</small></div></div>`;
 }
 loadNetworkIncidents=async function(mode){
  const seq=++incidentSeq;incidentLoading(mode);
  try{
   const d=await fetchJson(`${TRAFFIC}?mode=${encodeURIComponent(mode)}`,mode==='bus'?50000:35000);incidentCache.set(mode,d);
   if(seq===incidentSeq&&mode===mc22Mode)renderNetworkIncidents(d,mode);return d;
  }catch(e){
   console.warn('v22.1 traffic',mode,e);
   if(seq===incidentSeq&&mode===mc22Mode){const panel=document.querySelector('.mc21-incidents'),label=MODE_META[mode]?.label||mode;if(panel)panel.innerHTML=`<div class="mc21-incident-head"><h3>Incidents · ${esc(label)}</h3><span class="mc21-live-badge">IDFM</span></div><div class="mc221-incident-loading"><div>Bulletin trafic momentanément indisponible.<br><small>La carte ${esc(label)} continue de fonctionner.</small></div></div>`}
   return null;
  }
 };

 function markPending(mode,on=true){document.querySelectorAll('.mc22-mode-btn').forEach(b=>b.classList.toggle('mc221-pending',on&&b.dataset.mode===mode))}
 switchMode=async function(mode){
  if(!MODE_META[mode])return;
  if(mode===mc22Mode&&lastDataAt&&mode!=='metro'){loadNetworkIncidents(mode);return}
  if(loading){pendingMode=mode;markPending(mode,true);setModeStatus(`${MODE_META[mode].label} sera affiché juste après le chargement en cours`,'loading');return}
  pendingMode=null;document.querySelectorAll('.mc22-mode-btn').forEach(b=>b.classList.remove('mc221-pending'));incidentLoading(mode);
  await baseSwitch(mode);
  if(pendingMode&&pendingMode!==mc22Mode){const next=pendingMode;pendingMode=null;document.querySelectorAll('.mc22-mode-btn').forEach(b=>b.classList.remove('mc221-pending'));setTimeout(()=>switchMode(next),0)}
 };

 /* Re-render the current picker with the new, stable layout. */
 if(mc22Mode!=='metro')renderLiveFilters();
}
boot();
})();
