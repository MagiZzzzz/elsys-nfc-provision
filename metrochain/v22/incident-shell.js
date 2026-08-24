(()=>{
'use strict';
if(window.__MC22_INCIDENT_SHELL__)return;
window.__MC22_INCIDENT_SHELL__='v22.9-light';

function mount(tries=0){
  if(tries>160)return;
  const live=document.getElementById('liveMap');
  const rail=live?.querySelector('.mc20-right-rail');
  if(!live||!rail){setTimeout(()=>mount(tries+1),50);return;}
  if(rail.querySelector('.mc21-incidents'))return;

  const panel=document.createElement('section');
  panel.className='mc20-card mc20-panel mc21-incidents mc22-light-incidents';
  panel.innerHTML=`
    <div class="mc21-incident-head"><h3>Incidents réseau</h3><span class="mc21-live-badge">LIVE</span></div>
    <div class="mc21-global-status">
      <span class="mc21-status-dot">…</span>
      <div><b>Lecture du trafic…</b><span>Synchronisation IDFM en cours.</span></div>
    </div>
    <div class="mc21-incident-list"><div class="mc21-empty">Les incidents du réseau apparaîtront ici.</div></div>
    <div class="mc21-incident-foot"><span class="mc21-update-time">Mise à jour —</span></div>`;
  rail.insertBefore(panel,rail.firstChild);
}

mount();
})();
