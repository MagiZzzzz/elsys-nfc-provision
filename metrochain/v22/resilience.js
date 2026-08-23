(()=>{
'use strict';
if(window.__MC223_RESILIENCE__)return;window.__MC223_RESILIENCE__='v22.3-resilient-live';
const ORIGIN='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/network-live-feed';
const CACHE='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/network-live-feed-cache';
const nativeFetch=window.fetch.bind(window);
function rewrite(input){
 try{
  const url=typeof input==='string'?input:(input instanceof Request?input.url:String(input));
  if(!url.startsWith(ORIGIN))return null;
  return CACHE+url.slice(ORIGIN.length);
 }catch{return null}
}
window.fetch=function(input,init){
 const url=rewrite(input);if(!url)return nativeFetch(input,init);
 if(input instanceof Request){const req=new Request(url,input);return nativeFetch(req,init)}
 return nativeFetch(url,init);
};
function fmtAge(sec){
 sec=Number(sec);if(!Number.isFinite(sec)||sec<0)return'';
 if(sec<90)return`${Math.round(sec)} s`;
 if(sec<3600)return`${Math.max(1,Math.round(sec/60))} min`;
 return`${Math.floor(sec/3600)} h ${Math.round((sec%3600)/60)} min`;
}
function currentFeed(){try{return window.eval('liveFeed')}catch{return null}}
function currentMode(){try{return window.eval("typeof mc22Mode!=='undefined'?mc22Mode:'metro'")}catch{return'data'}}
function refreshNow(){
 if(!navigator.onLine)return;
 try{const r=window.eval('refreshVehicles(true)');if(r&&typeof r.catch==='function')r.catch(()=>{})}catch{}
}
function paintFreshness(){
 const feed=currentFeed(),status=document.querySelector('.mc22-mode-status'),source=document.getElementById('liveSourceStatus'),updated=document.getElementById('liveUpdatedAt');
 if(!feed||!status)return;
 const stale=Boolean(feed.stale||feed.source_mode==='stale'||feed.source_mode==='cached-stale');
 status.classList.toggle('mc223-stale',stale);
 if(!stale)return;
 const age=feed.source_age_seconds??feed.data_age_seconds??feed.vehicles?.[0]?.source_age_seconds;
 const ageTxt=fmtAge(age),mode=currentMode(),count=feed.vehicles?.length??0,lines=feed.lines?.length??feed.counts?.lines??0;
 const span=status.querySelector('span');
 if(span&&!status.classList.contains('loading'))span.textContent=`${mode==='metro'?'Métro':mode==='rer'?'RER':mode==='transilien'?'Transilien':mode==='tram'?'Tram':'Bus'} · ${count} véhicules · données retardées${ageTxt?' '+ageTxt:''}`;
 if(source){source.classList.remove('live');source.classList.add('mc223-source-stale');const s=source.querySelector('span');if(s)s.textContent=`Dernier snapshot PRIM · ${count} véhicules`}
 if(updated)updated.textContent=`Données retardées${ageTxt?' de '+ageTxt:''} · interpolation conservée`;
}
window.addEventListener('online',()=>setTimeout(refreshNow,1200));
window.addEventListener('focus',()=>{paintFreshness();if(navigator.onLine)setTimeout(refreshNow,700)});
setInterval(()=>{
 paintFreshness();
 const status=document.querySelector('.mc22-mode-status');
 if(navigator.onLine&&status?.classList.contains('error'))refreshNow();
},15000);
setTimeout(paintFreshness,1800);
})();
