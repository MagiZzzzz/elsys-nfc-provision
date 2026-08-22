(()=>{
  'use strict';
  if(window.__MC18_THEME__) return;
  window.__MC18_THEME__='v18-design-system';
  const d=document;
  const body=d.body;
  body.classList.add('mc18-ready');

  // Decorative background belongs to the app shell only; it never overlays the live map.
  const bg=d.createElement('div');
  bg.className='mc18-bg';
  bg.innerHTML='<i class="mc18-orb a"></i><i class="mc18-orb b"></i><i class="mc18-orb c"></i>';
  body.prepend(bg);

  const visibleMain=()=>[...d.querySelectorAll('main')].find(m=>!m.classList.contains('hidden')&&getComputedStyle(m).display!=='none');
  let lastMain='';

  function indexElements(main){
    [...main.children].forEach((el,i)=>{
      if(!el.id||el.id!=='liveMetroMap'){
        el.style.setProperty('--mc-i',Math.min(i,12));
        el.classList.add('mc18-animate');
      }
    });
  }

  function animateMain(force=false){
    const main=visibleMain();
    if(!main) return;
    if(!force&&main.id===lastMain) return;
    lastMain=main.id;
    indexElements(main);
    main.classList.remove('mc18-page-in');
    void main.offsetWidth;
    main.classList.add('mc18-page-in');
    body.dataset.mc18Page=main.id||'main';
  }

  // No MutationObserver: page transitions are replayed only after actual user navigation.
  d.addEventListener('click',()=>setTimeout(()=>animateMain(false),28),true);
  d.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key==='Escape') setTimeout(()=>animateMain(false),30);
  },true);

  // Premium pointer depth only for non-map content cards.
  const tiltSelector='main:not(#liveMap) .card,main:not(#liveMap) [class*="-card"],main:not(#liveMap) .panel';
  const tilts=[...d.querySelectorAll(tiltSelector)].slice(0,80);
  tilts.forEach(el=>{
    if(el.closest('#liveMetroMap')) return;
    el.classList.add('mc18-tilt');
    el.addEventListener('pointermove',ev=>{
      if(ev.pointerType==='touch') return;
      const r=el.getBoundingClientRect();
      const x=(ev.clientX-r.left)/Math.max(r.width,1)-.5;
      const y=(ev.clientY-r.top)/Math.max(r.height,1)-.5;
      el.style.setProperty('--ry',(x*3.2).toFixed(2)+'deg');
      el.style.setProperty('--rx',(-y*2.7).toFixed(2)+'deg');
    },{passive:true});
    el.addEventListener('pointerleave',()=>{
      el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');
    },{passive:true});
  });

  // Mouse-driven background depth, event based (no perpetual animation loop).
  let raf=0,mx=0,my=0;
  d.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch') return;
    mx=e.clientX/Math.max(innerWidth,1)-.5;
    my=e.clientY/Math.max(innerHeight,1)-.5;
    if(raf) return;
    raf=requestAnimationFrame(()=>{
      raf=0;
      const orbs=bg.querySelectorAll('.mc18-orb');
      orbs[0]?.style.setProperty('--tx',(mx*24)+'px');orbs[0]?.style.setProperty('--ty',(my*18)+'px');
      orbs[1]?.style.setProperty('--tx',(-mx*30)+'px');orbs[1]?.style.setProperty('--ty',(my*20)+'px');
      orbs[2]?.style.setProperty('--tx',(mx*16)+'px');orbs[2]?.style.setProperty('--ty',(-my*14)+'px');
    });
  },{passive:true});

  // Stagger menus/buttons once at startup.
  d.querySelectorAll('.main-nav .nav-btn').forEach((b,i)=>{
    b.style.opacity='0';
    b.style.transform='translateY(-8px)';
    setTimeout(()=>{
      b.style.transition='opacity .5s cubic-bezier(.16,1,.3,1),transform .5s cubic-bezier(.16,1,.3,1),color .2s ease,background .2s ease,border-color .2s ease';
      b.style.opacity='1';b.style.transform='none';
    },80+i*45);
  });

  animateMain(true);
})();
