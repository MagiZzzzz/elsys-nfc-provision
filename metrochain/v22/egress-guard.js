(()=>{
'use strict';
if(window.__MC_EGRESS_GUARD__)return;
const originalFetch=window.fetch.bind(window);
const cache=new Map(),pending=new Map();
const stats={network:0,cache:0,joined:0};
const rules=[
  [/\/metro-vehicles-feed(?:\?|$)/,60000],
  [/\/network-live-feed(?:\?|$)/,60000],
  [/\/idfm-traffic(?:\?|$)/,60000],
  [/\/metro-station-board(?:\?|$)/,60000],
  [/\/metro-map-feed(?:\?|$)/,6*60*60*1000],
  [/\/metro-geometry-feed(?:\?|$)/,6*60*60*1000],
  [/\/prim-usage-status(?:\?|$)/,5*60*1000]
];
function ttlFor(url){
  if(!/mwqesmycduqkglpgldrr\.supabase\.co\/functions\/v1\//.test(url))return 0;
  for(const [re,ttl] of rules)if(re.test(url))return ttl;
  return 0;
}
function keyFor(input,init){
  const method=String(init?.method||((typeof Request!=='undefined'&&input instanceof Request)?input.method:'GET')||'GET').toUpperCase();
  if(method!=='GET')return null;
  const url=typeof input==='string'?input:(input?.url||String(input));
  const ttl=ttlFor(url);if(!ttl)return null;
  return {key:url,ttl};
}
function responseFrom(x){return new Response(x.body,{status:x.status,statusText:x.statusText,headers:x.headers})}
window.fetch=async function(input,init){
  const r=keyFor(input,init);if(!r)return originalFetch(input,init);
  const now=Date.now(),hit=cache.get(r.key);
  if(hit&&now-hit.at<r.ttl){stats.cache++;return responseFrom(hit)}
  if(pending.has(r.key)){stats.joined++;const x=await pending.get(r.key);return responseFrom(x)}
  const p=(async()=>{
    const resp=await originalFetch(input,init),body=await resp.text();
    const x={at:Date.now(),status:resp.status,statusText:resp.statusText,headers:[...resp.headers.entries()],body};
    if(resp.ok)cache.set(r.key,x);stats.network++;return x;
  })();
  pending.set(r.key,p);
  try{return responseFrom(await p)}finally{pending.delete(r.key)}
};
window.__MC_EGRESS_GUARD__={version:'v1',cache,stats,clear:()=>cache.clear()};
})();
