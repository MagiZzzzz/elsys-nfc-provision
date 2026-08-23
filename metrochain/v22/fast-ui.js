(()=>{
'use strict';
if(window.__MC225_FAST_UI__)return;
window.__MC225_FAST_UI__='v22.5-freeze-guard';
window.__MC224_FAST_UI__='v22.5-freeze-guard';
const FEED_PATH='/functions/v1/network-live-feed';
const MODES=['rer','transilien','tram','bus'];
const PREFETCHABLE=new Set(['rer','transilien','tram']);
const realFetch=window.fetch.bind(window),mem=new Map(),pending=new Map();
const CACHE_MS=45000,MAX_MEMORY_BODY=1400000;
const perf=window.__MC225_FAST_UI_STATE__={startupWarmRequests:0,intentWarmRequests:0,memoryHits:0,pendingHits:0,lastWarmMode:null};
function feedMode(input){try{const raw=typeof input==='string'?input:input?.url;if(!raw)return null;const u=new URL(raw,location.href);if(u.pathname!==FEED_PATH)return null;const m=(u.searchParams.get('mode')||'').toLowerCase();return MODES.includes(m)?m:null}catch{return null}}
function responseFrom(hit){return new Response(hit.body,{status:hit.status||200,headers:{'content-type':'application/json; charset=utf-8','x-metrochain-cache':'memory'}})}
function save(mode,body,status=200){if(!body||body.length>MAX_MEMORY_BODY)return;mem.set(mode,{body,status,ts:Date.now()})}
async function fetchAndCache(mode){if(!PREFETCHABLE.has(mode)||document.hidden)return null;if(pending.has(mode))return pending.get(mode);const p=(async()=>{try{perf.intentWarmRequests++;perf.lastWarmMode=mode;const r=await realFetch(`https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/network-live-feed?mode=${encodeURIComponent(mode)}`,{cache:'no-store'});if(!r.ok)return r;const body=await r.clone().text();save(mode,body,r.status);return r}finally{pending.delete(mode)}})();pending.set(mode,p);return p}
window.fetch=async function(input,init){const mode=feedMode(input);if(!mode)return realFetch(input,init);const hit=mem.get(mode);if(hit&&Date.now()-hit.ts<CACHE_MS){perf.memoryHits++;return responseFrom(hit)}if(pending.has(mode)){perf.pendingHits++;await Promise.race([pending.get(mode).catch(()=>{}),new Promise(r=>setTimeout(r,1200))]);const warm=mem.get(mode);if(warm&&Date.now()-warm.ts<CACHE_MS){perf.memoryHits++;return responseFrom(warm)}}return realFetch(input,init)};

// v22.4 prefetched all four networks ~120 ms after page load and synchronously
// mirrored large payloads into sessionStorage. v22.5 intentionally does neither.
// We only prefetch small rail modes when the user's pointer/focus shows intent.
function installIntentWarm(tries=0){
  if(tries>180)return;
  const buttons=[...document.querySelectorAll('.mc22-mode-btn[data-mode]')];
  if(buttons.length<5){setTimeout(()=>installIntentWarm(tries+1),50);return}
  const warmButton=b=>{const m=b.dataset.mode;if(PREFETCHABLE.has(m)&&!mem.has(m)&&!pending.has(m))fetchAndCache(m).catch(()=>{})};
  for(const b of buttons){
    if(b.dataset.mc225Warm==='1')continue;b.dataset.mc225Warm='1';
    let timer=0;
    b.addEventListener('pointerenter',()=>{clearTimeout(timer);timer=setTimeout(()=>warmButton(b),180)},{passive:true});
    b.addEventListener('pointerleave',()=>clearTimeout(timer),{passive:true});
    b.addEventListener('focus',()=>warmButton(b),{passive:true});
  }
}
installIntentWarm();

function installFrameBatching(tries=0){if(tries>160)return;const names=['renderLiveFilters','renderLiveNetwork','renderLineStops','renderLineStats'];let ready=true;for(const n of names)if(typeof window[n]!=='function')ready=false;if(!window.__MC22_THEME__||!ready){setTimeout(()=>installFrameBatching(tries+1),50);return}for(const name of names){const orig=window[name];if(orig.__mc225batched||orig.__mc224batched)continue;let raf=0,lastArgs=null,lastThis=null;const wrapped=function(...args){lastArgs=args;lastThis=this;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const a=lastArgs,t=lastThis;lastArgs=null;lastThis=null;orig.apply(t,a||[])})};wrapped.__mc225batched=true;wrapped.__mc224batched=true;wrapped.__mc225original=orig;window[name]=wrapped}}
installFrameBatching();
})();
