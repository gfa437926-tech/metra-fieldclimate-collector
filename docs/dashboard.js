(() => {
  const $ = id => document.getElementById(id);
  const state = {stations:[], selected:"", readings:[], requestId:0};
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = v => v ? new Date(v).toLocaleString("ar",{dateStyle:"medium",timeStyle:"short"}) : "—";
  const num = v => typeof v === "number" ? v.toLocaleString("ar",{maximumFractionDigits:3}) : esc(v);
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
    $("stations").innerHTML=list.length?list.map(s=>'<button class="station '+(s.station_id===state.selected?'active':'')+'" data-id="'+esc(encodeURIComponent(s.station_id))+'"><b>'+esc(s.station_name||s.station_id)+'</b><small>'+esc(s.station_id)+' · '+fmt(s.last_synced_at)+'</small></button>').join(""):'<div class="empty">لا توجد نتائج</div>';
    document.querySelectorAll(".station").forEach(b=>b.onclick=()=>{state.selected=decodeURIComponent(b.dataset.id);renderStations();loadReadings();});
  }
  function metricCard(metric){
    const values=metric.values && typeof metric.values==="object" ? metric.values : {};
    const entries=Object.entries(values).filter(([,v])=>v!==null && v!==undefined && typeof v!=="object");
    const mainKey=["avg","last","sum","result","time","value","min","max"].find(k=>values[k]!==null && values[k]!==undefined);
    const main=mainKey ? values[mainKey] : "—";
    const label={avg:"المتوسط",last:"آخر قراءة",sum:"الإجمالي",result:"النتيجة",time:"المدة",value:"القيمة",min:"الأدنى",max:"الأعلى"};
    const details=entries.filter(([k])=>k!==mainKey).map(([k,v])=>'<span class="metric-detail"><small>'+esc(label[k]||k)+'</small><b>'+num(v)+'</b></span>').join("");
    const unit=metric.unit && metric.unit!==false ? " "+esc(metric.unit) : "";
    return '<div class="sensor"><div class="sensor-name">'+esc(metric.name||"حساس غير مسمى")+'</div><div class="sensor-value">'+num(main)+'<small>'+unit+'</small></div><div class="sensor-meta">القناة: '+esc(metric.channel ?? "—")+' · الرمز: '+esc(metric.code ?? "—")+'</div>'+(details?'<div class="metric-details">'+details+'</div>':"")+'</div>';
  }
  function renderReadings(){
    $("readings").innerHTML=state.readings.length?state.readings.map(r=>{
      const raw=r.measurements && r.measurements.values && typeof r.measurements.values==="object" ? r.measurements.values : {};
      const cards=Object.entries(raw).map(([key,m])=>metricCard({...m,code:m.code ?? key})).join("");
      return '<article class="reading"><div class="reading-head"><b>'+fmt(r.recorded_at)+'</b><span class="muted">'+(r.group_name==="hourly"?"بيانات ساعية":"بيانات يومية")+'</span></div><div class="sensor-grid">'+(cards||'<div class="empty">لا توجد تفاصيل حساسات في هذا السجل.</div>')+'</div></article>';
    }).join(""):'<div class="empty">لا توجد قياسات لهذه المحطة ضمن هذا الاختيار.</div>';
    $("readingCount").textContent=state.readings.length.toLocaleString("ar");
  }
  async function loadReadings(){
    const request=++state.requestId;
    if(!state.selected){state.readings=[];renderReadings();return;}
    $("readings").innerHTML='<div class="empty">جارٍ تحميل القياسات…</div>';
    try{
      const p={select:"station_id,station_name,recorded_at,group_name,measurements",station_id:"eq."+state.selected,order:"recorded_at.desc",limit:"30"};
      if($("group").value)p.group_name="eq."+ $("group").value;
      const rows=await query("fieldclimate_public_readings",p);
      if(request!==state.requestId)return;
      state.readings=rows;renderReadings();
    }catch(e){
      if(request!==state.requestId)return;
      $("readings").innerHTML='<div class="empty">'+esc(e.message)+'</div>';
      status("تعذر تحميل قياسات المحطة: "+e.message,"err");
    }
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