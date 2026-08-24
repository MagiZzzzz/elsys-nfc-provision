(()=>{
'use strict';
if(window.__MC22_QUOTA_PANEL__)return;
window.__MC22_QUOTA_PANEL__='v22.11';
const URL='https://mwqesmycduqkglpgldrr.supabase.co/functions/v1/prim-usage-status';
let timer=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(){
  let host=document.querySelector('#liveMap .live-map-actions');
  if(!host)host=document.querySelector('#liveMap .live-map-head');
  if(!host)return false;
  if(document.getElementById('mc22QuotaBox'))return true;
  const box=document.createElement('div');box.id='mc22QuotaBox';box.style.cssText='margin-top:8px;min-width:320px;max-width:520px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.055);padding:9px 10px;color:#dce8f4;font:700 10px/1.35 system-ui';
  box.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>Quotas PRIM</b><span id="mc22QuotaStamp" style="opacity:.65">chargement…</span></div><div id="mc22QuotaRows" style="display:grid;gap:6px;margin-top:8px"></div><div id="mc22QuotaNote" style="margin-top:7px;opacity:.62;font-size:9px"></div>';
  host.appendChild(box);return true;
}
function row(q){const pct=Math.min(100,Math.max(0,Number(q.percent)||0));const warn=pct>=85?'#ef6262':pct>=60?'#f0a94b':'#49d5a6';return `<div><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(q.label)}</span><b>${q.used} / ${q.limit}</b></div><div style="height:5px;margin-top:3px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden"><i style="display:block;width:${pct}%;height:100%;background:${warn}"></i></div></div>`}
async function refresh(){
  if(!mount())return;
  try{const r=await fetch(URL,{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'quota');
    const wanted=['next_passages_global','next_passages_unit','next_passages_line','journey_calculator','traffic_messages'];
    const qs=(d.quotas||[]).filter(x=>wanted.includes(x.bucket));
    document.getElementById('mc22QuotaRows').innerHTML=qs.map(row).join('');
    document.getElementById('mc22QuotaStamp').textContent=new Date(d.generated_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    document.getElementById('mc22QuotaNote').textContent='Global : en-têtes PRIM quand disponibles. Autres : relevé officiel 11:52 + appels MetroChain suivis.';
  }catch(e){document.getElementById('mc22QuotaStamp').textContent='indisponible'}
}
function start(){if(!mount()){setTimeout(start,100);return}refresh();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)refresh()},15000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
