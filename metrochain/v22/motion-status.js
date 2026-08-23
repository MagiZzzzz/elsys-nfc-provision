(()=>{
  'use strict';
  if(window.__MC223_MOTION_STATUS__) return;
  window.__MC223_MOTION_STATUS__='v22.7-motion-truth';

  const LABELS={metro:'Métro',rer:'RER',transilien:'Transilien',tram:'Tram',bus:'Bus'};
  const getFeed=()=>{try{return eval('liveFeed')}catch{return null}};
  const activeMode=()=>document.querySelector('.mc22-mode-btn.active')?.dataset?.mode||getFeed()?.mode||'metro';

  function ensureBadge(){
    let el=document.getElementById('mc223DataMode');
    if(el) return el;
    el=document.createElement('div');
    el.id='mc223DataMode';
    el.setAttribute('role','status');
    el.style.cssText='display:flex;align-items:center;gap:8px;min-height:32px;padding:6px 10px;border-radius:11px;border:1px solid rgba(255,255,255,.11);background:rgba(10,19,29,.86);font:750 11px/1.2 system-ui;color:#dce8f4;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.18)';
    const tabs=document.querySelector('.mc22-mode-tabs');
    if(tabs?.parentElement){tabs.insertAdjacentElement('afterend',el)}
    else document.querySelector('#liveMap .live-map-toolbar,#liveMap .map-toolbar,#liveMap')?.prepend(el);
    return el;
  }

  function setModeStatusText(text){
    const s=document.querySelector('.mc22-mode-status');
    if(!s||s.classList.contains('loading')) return;
    let span=s.querySelector('span');
    if(!span){
      s.replaceChildren();
      s.appendChild(document.createElement('i'));
      span=document.createElement('span');
      s.appendChild(span);
    }
    span.textContent=text;
  }

  function ageLabel(seconds){
    const s=Math.max(0,Math.round(Number(seconds)||0));
    if(s<60)return s+' s';
    if(s<3600)return Math.floor(s/60)+' min';
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
    return h+' h'+(m?' '+m+' min':'');
  }

  function sourceAge(feed){
    const fromVehicles=(feed?.vehicles||[]).map(v=>Number(v?.source_age_seconds)).filter(Number.isFinite);
    if(fromVehicles.length)return Math.max(...fromVehicles);
    const ts=Date.parse(feed?.source_response_timestamp||'');
    return Number.isFinite(ts)?Math.max(0,(Date.now()-ts)/1000):null;
  }

  function render(){
    const feed=getFeed(),mode=activeMode(),el=ensureBadge();
    if(!el||!feed)return;
    const projectedVehicles=(feed?.vehicles||[]).some(v=>v?.simulation||v?.stale_projection||v?.projection_kind==='stale_simulated');
    const simulated=!!(feed.simulation||feed.stale||feed.degraded||feed.source_mode==='cached-simulated'||feed.source_mode==='static-simulated-fallback'||projectedVehicles);
    const vehicles=Number(feed?.counts?.vehicles??feed?.vehicles?.length??0);
    const lines=Number(feed?.counts?.lines??feed?.lines?.length??0);
    const age=sourceAge(feed),ageText=age==null?'âge inconnu':ageLabel(age);
    if(simulated){
      el.style.borderColor='rgba(255,190,72,.42)';
      el.style.background='rgba(63,42,10,.88)';
      el.style.color='#ffd98a';
      el.innerHTML='<span style="width:7px;height:7px;border-radius:50%;background:#ffbd49;box-shadow:0 0 0 4px rgba(255,189,73,.12)"></span><strong>PROJECTION DE SECOURS</strong><span style="opacity:.8">'+LABELS[mode]+' · PRIM '+ageText+'</span>';
      el.title=(feed.simulation_note||'Le flux PRIM frais est indisponible. MetroChain projette les véhicules sur les vrais tracés et arrêts à partir du dernier snapshot valide.')+' Dernier snapshot : '+ageText+'.';
      setModeStatusText((lines?lines+' lignes · ':'')+vehicles+' véhicules · projection de secours · PRIM '+ageText);
    }else{
      el.style.borderColor='rgba(73,213,166,.28)';
      el.style.background='rgba(8,41,33,.82)';
      el.style.color='#8af0cf';
      el.innerHTML='<span style="width:7px;height:7px;border-radius:50%;background:#49d5a6;box-shadow:0 0 0 4px rgba(73,213,166,.12)"></span><strong>DONNÉES PRIM</strong><span style="opacity:.8">'+LABELS[mode]+' · '+vehicles+' véhicules</span>';
      el.title='Données PRIM / IDFM disponibles.';
    }
  }
  render();
  setInterval(render,650);
})();
