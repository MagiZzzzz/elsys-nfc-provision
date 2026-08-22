(()=>{
  'use strict';
  if(window.__MC19_THEME__) return;
  window.__MC19_THEME__='v19-rich-media';
  const d=document,body=d.body;body.classList.add('mc19-ready');
  const IMG={
    hero:'https://images.unsplash.com/photo-1775742386675-abef58a31750?auto=format&fit=crop&q=82&w=1800',
    arts:'https://images.unsplash.com/photo-1562340683-0a80af5b0198?auto=format&fit=crop&q=82&w=1800',
    arch:'https://images.unsplash.com/photo-1775327658515-5bbf62330ccd?auto=format&fit=crop&q=82&w=1800'
  };
  const visibleMain=()=>[...d.querySelectorAll('main')].find(m=>!m.classList.contains('hidden')&&getComputedStyle(m).display!=='none');
  function liveRails(){
    const live=d.getElementById('liveMap'); if(!live||live.querySelector('.mc19-left-rail')) return;
    const left=d.createElement('aside');left.className='mc19-left-rail mc19-stagger';left.innerHTML=`
      <article class="mc19-card mc19-hero" style="--mc19-i:0"><div class="img" style="background-image:url('${IMG.hero}')"></div><div class="mc19-hero-copy"><span class="mc19-label">PARIS · EN DIRECT</span><h3>Explorez.<br>Découvrez.<br><em>Vivez le métro.</em></h3><p>Le réseau devient un terrain de jeu : suivez, apprenez et collectionnez vos stations.</p><span class="mc19-cta">Commencer l’exploration →</span></div></article>
      <section class="mc19-card mc19-panel" style="--mc19-i:1"><div class="mc19-panel-head"><b>Prochains passages</b><span>Temps réel</span></div><div class="mc19-arrivals"><div class="mc19-arrival"><i class="mc19-line" style="background:#8b54c7">14</i><span>Saint-Lazare</span><strong class="mc19-time">2 min</strong></div><div class="mc19-arrival"><i class="mc19-line" style="background:#76a32c">6</i><span>Nation</span><strong class="mc19-time">3 min</strong></div><div class="mc19-arrival"><i class="mc19-line" style="background:#e7b524;color:#111">1</i><span>La Défense</span><strong class="mc19-time">4 min</strong></div><div class="mc19-arrival"><i class="mc19-line" style="background:#b84a88">4</i><span>Porte de Clignancourt</span><strong class="mc19-time">6 min</strong></div></div></section>`;
    const right=d.createElement('aside');right.className='mc19-right-rail mc19-stagger';right.innerHTML=`
      <article class="mc19-card mc19-video" style="--mc19-i:0"><div class="img" style="background-image:url('${IMG.arts}')"></div><div class="mc19-play" aria-label="Lire la vidéo"></div><div class="mc19-video-copy"><span class="mc19-label">À LA UNE · 04:32</span><h3>Plongée dans la ligne 14</h3><p>Le métro nouvelle génération, en immersion.</p></div></article>
      <section class="mc19-card mc19-panel" style="--mc19-i:1"><div class="mc19-panel-head"><b>Galerie</b><span>Voir tout</span></div><div class="mc19-gallery"><div class="mc19-thumb" data-name="Arts et Métiers" style="background-image:url('${IMG.arts}')"></div><div class="mc19-thumb" data-name="Bastille" style="background-image:url('${IMG.arch}')"></div><div class="mc19-thumb" data-name="Métro parisien" style="background-image:url('${IMG.hero}')"></div><div class="mc19-thumb" data-name="Architecture" style="background-image:url('${IMG.arts}')"></div></div></section>
      <section class="mc19-card mc19-panel" style="--mc19-i:2"><div class="mc19-panel-head"><b>Alertes du réseau</b><span>Voir toutes</span></div><div class="mc19-alert"><i style="background:#45b977">✓</i><div><b style="color:#67d899">Réseau normal</b><small>Trafic fluide sur l’ensemble des lignes.</small></div><time>07:45</time></div><div class="mc19-alert"><i style="background:#e7b524;color:#111">1</i><div><b>Ligne 1</b><small>Intervention en cours à Concorde.</small></div><time>07:38</time></div><div class="mc19-alert"><i style="background:#8b54c7">14</i><div><b>Ligne 14</b><small>Trafic dense entre Saint-Lazare et Olympiades.</small></div><time>07:30</time></div></section>`;
    const shell=live.querySelector('.live-map-shell'); if(!shell)return;
    live.insertBefore(left,shell); live.appendChild(right);
    [...left.children,...right.children].forEach((el,i)=>el.style.setProperty('--mc19-i',i));
    setTimeout(()=>window.dispatchEvent(new Event('resize')),220);
  }
  const pageMeta={
    home:['EXPLOREZ PARIS','Le métro devient votre terrain de jeu','Défis, lignes, stations et classements : tout MetroChain au même endroit.',IMG.hero],
    crosswordsScreen:['MOTS CROISÉS','Le réseau, lettre par lettre','Débloquez des grilles inspirées des lignes, des stations et de l’architecture parisienne.',IMG.arts],
    progressScreen:['VOTRE PARCOURS','Chaque station compte','Visualisez vos lignes maîtrisées, vos badges et votre progression dans le réseau.',IMG.arch],
    communityScreen:['COMMUNAUTÉ','Le métro se vit à plusieurs','Partagez vos performances, vos découvertes et vos défis avec les autres explorateurs.',IMG.hero],
    leaderboardScreen:['CLASSEMENTS','Prenez la tête du réseau','Comparez vos scores et devenez la référence MetroChain.',IMG.arts],
    game:['SESSION EN COURS','Votre prochain arrêt commence ici','Concentrez-vous sur la ligne, gardez vos vies et grimpez au classement.',IMG.arch],
    special:['MODE SPÉCIAL','Changez les règles du trajet','Une autre façon d’explorer le réseau et de tester votre mémoire.',IMG.hero]
  };
  function decorate(main){
    if(!main||main.id==='liveMap'||main.querySelector('.mc19-media-banner')) return;
    const meta=pageMeta[main.id]; if(!meta)return;
    const banner=d.createElement('section');banner.className='mc19-media-banner mc19-reveal';banner.innerHTML=`<div class="mc19-media-img" style="background-image:url('${meta[3]}')"></div><div class="mc19-media-copy"><span class="mc19-kicker">${meta[0]}</span><h2>${meta[1]}</h2><p>${meta[2]}</p><div class="mc19-media-meta"><span class="mc19-chip">● En direct</span><span class="mc19-chip">MetroChain Paris</span></div></div>`;
    main.insertBefore(banner,main.firstElementChild);
  }
  function replay(){const m=visibleMain();if(!m)return;decorate(m);m.classList.remove('mc19-reveal');void m.offsetWidth;m.classList.add('mc19-reveal');}
  liveRails();d.querySelectorAll('main').forEach(decorate);replay();
  d.addEventListener('click',()=>setTimeout(()=>{liveRails();replay()},45),true);
})();