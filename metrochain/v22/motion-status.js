(()=>{
  'use strict';
  if(window.__MC223_MOTION_STATUS__) return;
  window.__MC223_MOTION_STATUS__='v22.3-motion-fallback';

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

  function render(){
    const feed=getFeed(),mode=activeMode(),el=ensureBadge();
    if(!el||!feed)return;
    const simulated=!!(feed.simulation||feed.stale||feed.degraded||feed.source_mode==='cached-simulated'||feed.source_mode==='static-simulated-fallback');
    const vehicles=Number(feed?.counts?.vehicles??feed?.vehicles?.length??0);
    const lines=Number(feed?.counts?.lines??feed?.lines?.length??0);
    if(simulated){
      el.style.borderColor='rgba(255,190,72,.42)';
      el.style.background='rgba(63,42,10,.88)';
      el.style.color='#ffd98a';
      el.innerHTML='<span style="width:7px;height:7px;border-radius:50%;background:#ffbd49;box-shadow:0 0 0 4px rgba(255,189,73,.12)"></span><strong>SIMULATION DE SECOURS</strong><span style="opacity:.8">'+LABELS[mode]+' · '+vehicles+' véhicules</span>';
      el.title=feed.simulation_note||'PRIM est momentanément indisponible. Les véhicules sont animés sur les vrais tracés/arrêts à partir du dernier snapshot valide.';
      const s=document.querySelector('.mc22-mode-status');
      if(s&&!s.classList.contains('loading')) s.textContent=(lines?lines+' lignes · ':'')+vehicles+' véhicules · simulation de secours';
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
