(()=>{
'use strict';
if(window.__MC224_FAST_UI__)return;window.__MC224_FAST_UI__='v22.4-instant-switch';
const FEED_PATH='/functions/v1/network-live-feed';
const MODES=['rer','transilien','tram','bus'];
const realFetch=window.fetch.bind(window),mem=new Map(),pending=new Map();
const storageKey=m=>`mc224-feed-${m}`;
function feedMode(input){try{const raw=typeof input==='string'?input:input?.url;if(!raw)return null;const u=new URL(raw,location.href);if(u.pathname!==FEED_PATH)return null;const m=(u.searchParams.get('mode')||'').toLowerCase();return MODES.includes(m)?m:null}catch{return null}}
function responseFrom(hit){return new Response(hit.body,{status:hit.status||200,headers:{'content-type':'application/json; charset=utf-8','x-metrochain-cache':'memory'}})}
function save(mode,body,status=200){const hit={body,status,ts:Date.now()};mem.set(mode,hit);try{sessionStorage.setItem(storageKey(mode),JSON.stringify(hit))}catch{}}
function restore(){for(const mode of MODES){try{const hit=JSON.parse(sessionStorage.getItem(storageKey(mode))||'null');if(hit?.body&&Date.now()-hit.ts<120000)mem.set(mode,hit)}catch{}}}
async function fetchAndCache(mode){if(pending.has(mode))return pending.get(mode);const p=(async()=>{try{const r=await realFetch(`https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/network-live-feed?mode=${encodeURIComponent(mode)}`,{cache:'no-store'}),body=await r.clone().text();if(r.ok&&body)save(mode,body,r.status);return r}finally{pending.delete(mode)}})();pending.set(mode,p);return p}
window.fetch=async function(input,init){const mode=feedMode(input);if(!mode)return realFetch(input,init);const hit=mem.get(mode);if(hit&&Date.now()-hit.ts<30000){setTimeout(()=>fetchAndCache(mode).catch(()=>{}),0);return responseFrom(hit)}if(pending.has(mode)){await Promise.race([pending.get(mode).catch(()=>{}),new Promise(r=>setTimeout(r,1800))]);const warm=mem.get(mode);if(warm)return responseFrom(warm)}const r=await realFetch(input,init);try{const body=await r.clone().text();if(r.ok&&body)save(mode,body,r.status)}catch{}return r};
restore();
const warm=()=>MODES.forEach((m,i)=>setTimeout(()=>fetchAndCache(m).catch(()=>{}),i*80));
if(document.readyState==='complete')setTimeout(warm,120);else addEventListener('load',()=>setTimeout(warm,120),{once:true});
function installFrameBatching(tries=0){if(tries>160)return;const names=['renderLiveFilters','renderLiveNetwork','renderLineStops','renderLineStats'];let ready=true;for(const n of names)if(typeof window[n]!=='function')ready=false;if(!window.__MC22_THEME__||!ready){setTimeout(()=>installFrameBatching(tries+1),50);return}for(const name of names){const orig=window[name];if(orig.__mc224batched)continue;let raf=0,lastArgs=null,lastThis=null;const wrapped=function(...args){lastArgs=args;lastThis=this;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const a=lastArgs,t=lastThis;lastArgs=null;lastThis=null;orig.apply(t,a||[])})};wrapped.__mc224batched=true;wrapped.__mc224original=orig;window[name]=wrapped}}
installFrameBatching();
})();