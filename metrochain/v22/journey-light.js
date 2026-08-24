(()=>{
'use strict';
if(window.__MC22_JOURNEY_LIGHT__)return;
window.__MC22_JOURNEY_LIGHT__='v22.10';

function enhance(){
  const box=document.querySelector('#liveMap .journey-box');
  if(!box||box.classList.contains('mc21-journey'))return;
  box.classList.add('mc21-journey');
  if(!box.querySelector('.mc21-route-head')){
    const head=document.createElement('div');
    head.className='mc21-route-head';
    head.innerHTML='<div class="mc21-route-title"><span class="mc21-route-icon">↗</span><div><h3>Planifier un itinéraire</h3><p>Départ, arrivée, correspondances et temps de trajet en un coup d’œil.</p></div></div><span class="mc21-route-source">● IDFM · NAVITIA</span>';
    box.insertBefore(head,box.firstChild);
  }
  if(!box.querySelector('.mc21-route-guide')){
    const guide=document.createElement('div');
    guide.className='mc21-route-guide';
    guide.innerHTML='<i></i><span>Saisis une station, une gare ou une adresse. Le résultat affichera clairement les lignes, les correspondances, les stations de descente et le temps total.</span>';
    box.appendChild(guide);
  }
}

enhance();
const root=document.getElementById('liveMap');
if(root){
  const mo=new MutationObserver(()=>enhance());
  mo.observe(root,{childList:true,subtree:true});
}
})();
