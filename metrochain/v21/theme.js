(()=>{
  'use strict';
  if(window.__MC21_THEME__) return;
  window.__MC21_THEME__='v21-immersive-ui';
  const d=document,body=d.body; body.classList.add('mc21-ready');
  const MEDIA={
    station:'https://www.ratp.fr/sites/default/files/styles/article_editorial_xl/public/2024-08/93274D011.JPEG',
    train:'https://www.ratp.fr/sites/default/files/styles/swiper_article__xl/public/article/sliders/Capture%20d%E2%80%99%C3%A9cran%202025-09-03%20171708_1.jpg?h=4a7d1ed4'
  };
  const TRAFFIC_URL='https://www.ratp.fr/infos-trafic';
  const visibleMain=()=>[...d.querySelectorAll('main')].find(m=>!m.classList.contains('hidden')&&getComputedStyle(m).display!=='none');

  function addAmbient(){
    if(d.querySelector('.mc21-ambient'))return;
    const a=d.createElement('div');a.className='mc21-ambient';a.innerHTML=`<div class="mc21-ambient-photo" style="background-image:url('${MEDIA.station}')"></div><div class="mc21-ambient-lights"></div>`;
    body.insertBefore(a,body.firstChild);
  }

  function addTransition(){
    if(d.getElementById('mc21Transition'))return;
    const t=d.createElement('div');t.id='mc21Transition';t.innerHTML=`<div class="mc21-transition-bg" style="background-image:url('${MEDIA.station}')"></div><div class="mc21-transition-train" style="background-image:url('${MEDIA.train}')"></div><div class="mc21-transition-label">Correspondance MetroChain<b>Prochain arrêt</b></div>`;
    body.appendChild(t);
  }
  let transitionUntil=0;
  function playTransition(label){
    const t=d.getElementById('mc21Transition');if(!t)return;
    transitionUntil=Date.now()+1050;
    const b=t.querySelector('.mc21-transition-label b');if(b)b.textContent=(label||'Prochain arrêt').trim();
    t.classList.remove('play');void t.offsetWidth;t.classList.add('play');
    setTimeout(()=>t.classList.remove('play'),980);
  }

  function enhanceJourney(){
    const box=d.querySelector('#liveMap .journey-box');if(!box||box.classList.contains('mc21-journey'))return;
    box.classList.add('mc21-journey');
    const head=d.createElement('div');head.className='mc21-route-head';head.innerHTML=`<div class="mc21-route-title"><span class="mc21-route-icon">↗</span><div><h3>Planifier un itinéraire</h3><p>Départ, arrivée, correspondances et résultat dans un seul bloc.</p></div></div><span class="mc21-route-source">● IDFM · NAVITIA</span>`;
    box.insertBefore(head,box.firstChild);
    const fields=[...box.querySelectorAll('.place-field')];
    fields.forEach((f,i)=>f.classList.add(i===0?'mc21-field-from':'mc21-field-to'));
    const guide=d.createElement('div');guide.className='mc21-route-guide';guide.innerHTML='<i></i><span>Saisis une station, une gare ou une adresse. Le résultat s’affiche ici avec les lignes, correspondances et temps de trajet.</span>';
    box.appendChild(guide);
  }

  function cleanText(s){return String(s||'').replace(/\s+/g,' ').trim()}
  function severity(text=''){
    const s=text.toLowerCase();
    if(/chargement|lecture du trafic|synchronisation/.test(s))return 'loading';
    if(/interromp|suspend|fermé|fermée|incident grave|trafic interrompu/.test(s))return 'red';
    if(/perturb|travaux|ralenti|retard|dense|indispon|dégrad/.test(s))return 'orange';
    return 'green';
  }
  function severityColor(s){return s==='red'?'#ef6262':s==='orange'?'#f0a94b':s==='loading'?'#71b7ec':'#47d4a5'}
  function trafficSummary(){
    const strip=d.querySelector('#liveMap .traffic-strip');if(!strip)return'';
    const candidates=[strip,...strip.querySelectorAll('*')].map(n=>cleanText(n.innerText||n.textContent)).filter(Boolean);
    const meaningful=candidates.find(t=>t.length<=190&&!/^(incidents?|chargement du trafic|actualiser|↻)$/i.test(t)&&/(trafic normal|aucune perturbation|trafic perturb|travaux|interromp|ralenti|retard|incident|suspend|fermet)/i.test(t));
    const raw=meaningful||cleanText(strip.innerText||strip.textContent);
    return /chargement du trafic|incidents\s*[▾▼]|actualiser|↻/i.test(raw)&&!/(trafic normal|aucune perturbation|perturb|travaux|interromp|ralenti|retard|suspend|fermet)/i.test(raw)?'Chargement du trafic en cours…':raw;
  }
  function collectIncidentTexts(){
    const live=d.getElementById('liveMap');if(!live)return[];
    const nodes=new Set([
      ...live.querySelectorAll('[class*="incident"],[class*="disruption"],[class*="alert"],[class*="traffic"]'),
      ...d.querySelectorAll('[class*="incident"],[class*="disruption"],[class*="alert"]')
    ]);
    let out=[];
    for(const n of nodes){
      if(!n||n.closest('#liveMetroMap,.mc20-left-rail,.mc20-right-rail,.mc21-incidents'))continue;
      const t=cleanText(n.innerText||n.textContent);
      if(t.length<8||t.length>220)continue;
      if(/chargement du trafic|incidents?\s*[▾▼]?|actualiser|mise à jour|bulletin ratp|↻/i.test(t)&&!/(perturb|travaux|interromp|suspend|fermet|ralenti|retard|dense|indispon|dégrad)/i.test(t))continue;
      if(!/(perturb|incident|travaux|interromp|suspend|fermet|ralenti|retard|dense|indispon|dégrad)/i.test(t))continue;
      if(/^(incidents?|trafic normal|aucune perturbation)/i.test(t))continue;
      out.push(t);
    }
    out=[...new Set(out)].sort((a,b)=>a.length-b.length);
    const filtered=[];
    for(const t of out){if(filtered.some(x=>x.includes(t)||t.includes(x)))continue;filtered.push(t)}
    return filtered.slice(0,5);
  }
  function makeIncidentPanel(){
    const rail=d.querySelector('#liveMap .mc20-right-rail');if(!rail||rail.querySelector('.mc21-incidents'))return;
    const p=d.createElement('section');p.className='mc20-card mc20-panel mc21-incidents';p.innerHTML=`<div class="mc21-incident-head"><h3>Incidents réseau</h3><span class="mc21-live-badge">LIVE</span></div><div class="mc21-global-status"><span class="mc21-status-dot">…</span><div><b>Lecture du trafic…</b><span>Synchronisation avec l’état affiché par MetroChain.</span></div></div><div class="mc21-incident-list"></div><div class="mc21-incident-foot"><span class="mc21-update-time">Mise à jour —</span><a href="${TRAFFIC_URL}" target="_blank" rel="noopener">Bulletin RATP ↗</a></div>`;
    rail.insertBefore(p,rail.firstChild);
    refreshIncidents();
  }
  function refreshIncidents(){
    const panel=d.querySelector('.mc21-incidents');if(!panel)return;
    const raw=trafficSummary();
    const sev=severity(raw);
    const global=panel.querySelector('.mc21-global-status');
    const dot=global?.querySelector('.mc21-status-dot'),title=global?.querySelector('b'),desc=global?.querySelector('span');
    if(dot){dot.style.background=severityColor(sev);dot.textContent=sev==='green'?'✓':sev==='orange'?'!':sev==='red'?'×':'…'}
    if(title)title.textContent=sev==='green'?'Trafic global normal':sev==='orange'?'Perturbations en cours':sev==='red'?'Incident majeur en cours':'État trafic en cours de chargement';
    if(desc)desc.textContent=raw||'Aucun résumé trafic disponible dans l’application pour le moment.';
    const list=panel.querySelector('.mc21-incident-list');if(list){
      const items=collectIncidentTexts();
      if(!items.length){list.innerHTML=sev==='loading'?'<div class="mc21-empty">Les détails des incidents apparaîtront ici dès que le flux trafic de MetroChain sera chargé.</div>':'<div class="mc21-empty">Aucun incident détaillé supplémentaire n’est actuellement exposé par l’application. Le statut global ci-dessus reste synchronisé avec MetroChain.</div>'}
      else list.innerHTML=items.map(t=>{const s=severity(t);const line=(t.match(/(?:ligne|rer|tram(?:way)?)\s*[A-Z]?\s*(?:1[0-4]|[1-9]|[A-E]|T?\d+)/i)||[])[0]||'Information réseau';return `<div class="mc21-incident-item"><i class="mc21-incident-bar" style="background:${severityColor(s)}"></i><div><b>${line}</b><span>${t}</span></div></div>`}).join('');
    }
    const time=panel.querySelector('.mc21-update-time');if(time)time.textContent='Mise à jour '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function pageLabel(main){
    const id=main?.id||'';return ({liveMap:'Carte live',home:'Jeux',crosswordsScreen:'Mots croisés',progressScreen:'Progression',communityScreen:'Communauté',leaderboardScreen:'Classements',game:'Jeu',special:'Mode spécial'})[id]||'MetroChain';
  }
  function wireTransitions(){
    d.addEventListener('click',e=>{
      const b=e.target.closest?.('.nav-btn');if(!b||b.classList.contains('active'))return;
      playTransition(cleanText(b.textContent)||'Prochain arrêt');
    },true);
    let last=visibleMain()?.id||'';
    setInterval(()=>{
      const m=visibleMain(),id=m?.id||'';
      if(id&&id!==last){if(Date.now()>transitionUntil)playTransition(pageLabel(m));last=id}
    },220);
  }

  addAmbient();addTransition();enhanceJourney();makeIncidentPanel();wireTransitions();
  setInterval(()=>{enhanceJourney();makeIncidentPanel();refreshIncidents()},3000);
})();