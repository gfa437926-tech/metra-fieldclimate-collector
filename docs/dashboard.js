(() => {
  const $ = id => document.getElementById(id);
  const state = {stations:[], selected:"", readings:[]};
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = v => v ? new Date(v).toLocaleString("ar",{dateStyle:"medium",timeStyle:"short"}) : "—";
  const status = (s,cls="") => {$("status").textContent=s;$("dot").className="dot "+cls;};
  async function query(view,params) {
    const url=new URL(window.METRA_SUPABASE_URL+"/rest/v1/"+view);
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
    const key=window.METRA_SUPABASE_KEY;
    const r=await fetch(url,{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!r.ok)throw new Error("Supabase HTTP "+r.status);
    return r.json();
  }
  function renderStations(){
    const q=$("search").value.trim().toLowerCase();
    const list=state.stations.filter(s=>(s.station_name||"").toLowerCase().includes(q)||(s.station_id||"").toLowerCase().includes(q));
    $("stations").innerHTML=list.length?list.map(s=>'<button class="station '+(s.station_id===state.selected?'active':'')+'" data-id="'+encodeURIComponent(s.station_id)+'"><b>'+esc(s.station_name||s.station_id)+'</b><small>'+esc(s.station_id)+' · '+fmt(s.last_synced_at)+'</small></button>').join(""):'<div class="empty">لا توجد نتائج</div>';
    document.querySelectorAll(".station").forEach(b=>b.onclick=()=>{state.selected=decodeURIComponent(b.dataset.id);renderStations();loadReadings();});
  }
  function renderReadings(){
    $("readings").innerHTML=state.readings.length?state.readings.map(r=>'<article class="reading"><div class="muted">'+fmt(r.recorded_at)+' · '+(r.group_name==="hourly"?"ساعي":"يومي")+'</div><pre>'+esc(JSON.stringify(r.measurements,null,2))+'</pre></article>').join(""):'<div class="empty">لا توجد قياسات لهذه المحطة ضمن هذا الاختيار.</div>';
    $("readingCount").textContent=state.readings.length.toLocaleString("ar");
  }
  async function loadReadings(){
    if(!state.selected){$("readings").innerHTML='<div class="empty">اختر محطة لعرض القياسات.</div>';return;}
    const p={select:"station_id,station_name,recorded_at,group_name,measurements",station_id:"eq."+state.selected,order:"recorded_at.desc",limit:"80"};
    if($("group").value)p.group_name="eq."+ $("group").value;
    state.readings=await query("fieldclimate_public_readings",p);renderReadings();
  }
  async function load(){
    $("refresh").disabled=true;status("جارٍ الاتصال بقاعدة البيانات…");
    try{
      state.stations=await query("fieldclimate_public_stations",{select:"station_id,station_name,latitude,longitude,altitude_m,last_synced_at",order:"station_name.asc",limit:"500"});
      $("stationCount").textContent=state.stations.length.toLocaleString("ar");
      const recent=await query("fieldclimate_public_readings",{select:"station_id",order:"recorded_at.desc",limit:"1000"});
      $("activeCount").textContent=new Set(recent.map(x=>x.station_id)).size.toLocaleString("ar");
      $("lastSync").textContent=fmt(state.stations.map(x=>x.last_synced_at).filter(Boolean).sort().at(-1));
      if(!state.stations.some(x=>x.station_id===state.selected))state.selected=state.stations[0]?.station_id||"";
      renderStations();await loadReadings();status("متصل · تم تحميل البيانات","ok");
    }catch(e){status(e.message,"err");$("readings").innerHTML='<div class="empty">'+esc(e.message)+'</div>';}
    finally{$("refresh").disabled=false;}
  }
  $("refresh").onclick=load;$("search").oninput=renderStations;$("group").onchange=loadReadings;load();
})();