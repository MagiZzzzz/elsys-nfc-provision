(()=>{
  'use strict';
  if(window.__MC20_THEME__) return;
  window.__MC20_THEME__='v20-real-content';
  const d=document,body=d.body; body.classList.add('mc20-ready');

  const MEDIA={
    saintDenis:'https://www.grandparisexpress.fr/sites/default/files/styles/banner_xl/public/2024-09/Gare%20Saint-Denis%20-%20Pleyel%20apr%C3%A8s%20l%27ouverture%20de%20la%20ligne%2014%20aux%20usagers%20le%2024_06_2024.jpg?itok=eSv5LW5o',
    lhay:'https://upload.wikimedia.org/wikipedia/commons/b/be/Station_Ha%C3%BF_Roses_M%C3%A9tro_Paris_Ligne_14_-_L%27Ha%C3%BF-les-Roses_%28FR94%29_-_2024-06-26_-_7.jpg',
    chevilly:'https://www.grandparisexpress.fr/sites/default/files/styles/banner_m/public/2024-07/Gare%20Chevilly-Larue%20la%20gare%20avant%20ouverture%20au%20public-Anne-Claude%20Barbier.jpg?itok=XHBOAR2v',
    villejuif:'https://www.ville-rail-transports.com/wp-content/uploads/2024/12/IMG20241219101320-scaled.jpg',
    orly:'https://www.societedesgrandsprojets.fr/sites/default/files/styles/banner_l/public/2025-10/245726-n9cxxkqn9d-whr.jpg?itok=-6KKn10b',
    youtube:'https://www.youtube-nocookie.com/embed/LW9-KkbaEuQ?rel=0&modestbranding=1'
  };
  const LINKS={
    ratpGroup:'https://ratpgroup.com/en/the-ratp-group/entities/ratp/',
    line14:'https://www.ratp.fr/decouvrir/patrimoine/histoire-metro-ligne-14',
    extension:'https://www.ratp.fr/prolongement-metro-ligne-14',
    gpe:'https://www.grandparisexpress.fr/ligne-14',
    video:'https://www.youtube.com/watch?v=LW9-KkbaEuQ',
    panam:'https://ratpgroup.com/fr/ile-de-france-mobilites-et-la-ratp-ameliorent-linformation-voyageurs-dans-les-stations-de-metro-avec-de-nouveaux-panneaux-daffichage-100-accessibles/'
  };
  const visibleMain=()=>[...d.querySelectorAll('main')].find(m=>!m.classList.contains('hidden')&&getComputedStyle(m).display!=='none');

  function liveRails(){
    const live=d.getElementById('liveMap'); if(!live||live.querySelector('.mc20-left-rail')) return;
    const shell=live.querySelector('.live-map-shell'); if(!shell) return;

    const left=d.createElement('aside'); left.className='mc20-left-rail mc20-stagger'; left.innerHTML=`
      <article class="mc20-card mc20-photo" style="--mc20-i:0">
        <div class="img" style="background-image:url('${MEDIA.saintDenis}')"></div>
        <div class="mc20-photo-copy"><span class="mc20-eyebrow">SAINT-DENIS–PLEYEL · LIGNE 14</span><h3>Le réseau réel,<br>au centre.</h3><p>La carte garde son moteur live actuel. Autour, MetroChain affiche désormais du contenu réel et sourcé.</p><a class="mc20-source" href="${LINKS.gpe}" target="_blank" rel="noopener">Photo / projet Grand Paris Express ↗</a></div>
      </article>
      <section class="mc20-card mc20-panel" style="--mc20-i:1">
        <div class="mc20-panel-head"><b>Le métro en chiffres</b><a href="${LINKS.ratpGroup}" target="_blank" rel="noopener">Source RATP Group ↗</a></div>
        <div class="mc20-stats">
          <div class="mc20-stat"><strong>16</strong><span>lignes de métro</span><em>Réseau parisien</em></div>
          <div class="mc20-stat"><strong>302</strong><span>stations desservies</span><em>RATP Group</em></div>
          <div class="mc20-stat"><strong>206 km</strong><span>de réseau métro</span><em>RATP Group</em></div>
          <div class="mc20-stat"><strong>+450 km</strong><span>de voies exploitées</span><em>RATP Group</em></div>
        </div>
        <div class="mc20-note">Données de référence officielles. Le temps réel reste dans la carte centrale.</div>
      </section>`;

    const right=d.createElement('aside'); right.className='mc20-right-rail mc20-stagger'; right.innerHTML=`
      <article class="mc20-card mc20-video" style="--mc20-i:0">
        <div class="mc20-video-frame"><iframe loading="lazy" src="${MEDIA.youtube}" title="RATP — Prolongement Ligne 14 : Marche à Blanc entre Olympiades et Aéroport d'Orly" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
        <div class="mc20-video-copy"><h3>Voyage réel sur la ligne 14</h3><p>Vidéo officielle RATP Group : marche à blanc entre Olympiades et Aéroport d’Orly, juste avant l’ouverture du prolongement 2024.</p><a class="mc20-source" href="${LINKS.video}" target="_blank" rel="noopener">Ouvrir sur YouTube ↗</a></div>
      </article>
      <section class="mc20-card mc20-panel" style="--mc20-i:1">
        <div class="mc20-panel-head"><b>Ligne 14 · chiffres clés</b><a href="${LINKS.line14}" target="_blank" rel="noopener">RATP ↗</a></div>
        <div class="mc20-facts">
          <div class="mc20-fact"><strong>30 km</strong><span><b>Longueur</b><br>Plus longue ligne du métro francilien après les prolongements 2024.</span></div>
          <div class="mc20-fact"><strong>21</strong><span><b>Stations</b><br>De Saint-Denis Pleyel à Aéroport d’Orly.</span></div>
          <div class="mc20-fact"><strong>40 min</strong><span><b>Bout en bout</b><br>Temps annoncé entre les deux terminus après prolongement.</span></div>
          <div class="mc20-fact"><strong>≈820k</strong><span><b>Voyageurs / jour</b><br>Fréquentation en semaine indiquée par la RATP en 2026.</span></div>
          <div class="mc20-fact"><strong>1998</strong><span><b>Mise en service</b><br>Première ligne parisienne entièrement automatisée dès l’ouverture.</span></div>
        </div>
      </section>
      <section class="mc20-card mc20-panel" style="--mc20-i:2">
        <div class="mc20-panel-head"><b>Galerie réelle</b><small>GPE · SGP · Wikimedia</small></div>
        <div class="mc20-gallery">
          <a class="mc20-thumb" data-name="Saint-Denis–Pleyel" href="${LINKS.gpe}" target="_blank" rel="noopener" style="background-image:url('${MEDIA.saintDenis}')"></a>
          <a class="mc20-thumb" data-name="L’Haÿ-les-Roses" href="${LINKS.line14}" target="_blank" rel="noopener" style="background-image:url('${MEDIA.lhay}')"></a>
          <a class="mc20-thumb" data-name="Chevilly-Larue" href="${LINKS.gpe}" target="_blank" rel="noopener" style="background-image:url('${MEDIA.chevilly}')"></a>
          <a class="mc20-thumb" data-name="Aéroport d’Orly" href="${LINKS.extension}" target="_blank" rel="noopener" style="background-image:url('${MEDIA.orly}')"></a>
        </div>
      </section>`;

    live.insertBefore(left,shell); live.appendChild(right);
    [...left.children,...right.children].forEach((el,i)=>el.style.setProperty('--mc20-i',i));
    setTimeout(()=>window.dispatchEvent(new Event('resize')),250);
  }

  const pageMeta={
    home:['JEUX & EXPLORATION','Explorez 302 stations autrement','Défis, modes de jeu et découverte du réseau : une interface plus visuelle sans inventer de faux chiffres.',MEDIA.saintDenis],
    crosswordsScreen:['MOTS CROISÉS','Le réseau, lettre par lettre','Les grilles s’inspirent des stations, des lignes et de l’architecture du métro parisien.',MEDIA.lhay],
    progressScreen:['PROGRESSION','Mesurez votre parcours sur un vrai réseau','Comparez votre progression à l’échelle du réseau de référence RATP : 16 lignes, 302 stations et 206 km.',MEDIA.chevilly],
    communityScreen:['COMMUNAUTÉ','Partagez vos découvertes métro','La partie sociale reste centrée sur vos scores et vos défis, avec des repères réels sur le réseau.',MEDIA.orly],
    leaderboardScreen:['CLASSEMENTS','Votre score, face au réseau','Une lecture plus claire des performances, avec moins de décor et plus de hiérarchie.',MEDIA.villejuif],
    game:['SESSION EN COURS','Concentrez-vous sur la ligne','L’interface de jeu garde ses règles mais gagne en lisibilité et en contraste.',MEDIA.lhay],
    special:['MODE SPÉCIAL','Une autre façon d’explorer Paris','Des variantes de jeu au-dessus d’un réseau réel de 16 lignes et 302 stations.',MEDIA.chevilly]
  };
  const factbar=`<div class="mc20-factbar mc20-stagger"><div class="mc20-factpill" style="--mc20-i:0"><strong>16</strong><span>lignes de métro · RATP Group</span></div><div class="mc20-factpill" style="--mc20-i:1"><strong>302</strong><span>stations desservies</span></div><div class="mc20-factpill" style="--mc20-i:2"><strong>206 km</strong><span>de réseau métro</span></div><div class="mc20-factpill" style="--mc20-i:3"><strong>242</strong><span>stations modernisées PANAM annoncées en 2024</span></div></div>`;

  function decorate(main){
    if(!main||main.id==='liveMap'||main.querySelector('.mc20-banner')) return;
    const meta=pageMeta[main.id]; if(!meta) return;
    const banner=d.createElement('section'); banner.className='mc20-banner mc20-reveal'; banner.innerHTML=`<div class="mc20-banner-img" style="background-image:url('${meta[3]}')"></div><div class="mc20-banner-copy"><span class="mc20-banner-kicker">${meta[0]}</span><h2>${meta[1]}</h2><p>${meta[2]}</p><a class="mc20-source" href="${LINKS.ratpGroup}" target="_blank" rel="noopener">Données réseau : RATP Group ↗</a></div>`;
    main.insertBefore(banner,main.firstElementChild);
    banner.insertAdjacentHTML('afterend',factbar);
  }

  function replay(){const m=visibleMain();if(!m)return;decorate(m);m.classList.remove('mc20-reveal');void m.offsetWidth;m.classList.add('mc20-reveal')}
  liveRails(); d.querySelectorAll('main').forEach(decorate); replay();
  d.addEventListener('click',()=>setTimeout(()=>{liveRails();replay()},50),true);
})();