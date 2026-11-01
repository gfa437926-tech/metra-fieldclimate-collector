(() => {
  const $ = id => document.getElementById(id);
  const state = {stations:[], selected:"", readings:[], requestId:0, map:null, markers:null};
  const stationArabic = {
    "AFRIN  / VS":"عفرين","AL-RAI  / VS":"الراعي","Azaz":"اعزاز","Harem":"حارم",
    "IDLEB":"إدلب","Jabal al-Zawiya  / VS":"جبل الزاوية","JARABLUS / VS":"جرابلس",
    "KafrYhmol":"كفر يحمول","Khirbet AL-JOZ / VS":"خربة الجوز","Mabatli":"معبطلي",
    "Sahl Alroj":"سهل الروج"
  };
  const sensorArabic = {
    "Precipitation":"الهطول المطري","Battery":"بطارية المحطة","Soil temperature":"حرارة التربة",
    "Dew Point":"نقطة الندى","VPD":"عجز ضغط البخار","DeltaT":"فرق درجة الحرارة",
    "Solar Panel":"اللوح الشمسي","Sunshine duration":"مدة سطوع الشمس","HC Air temperature":"حرارة الهواء",
    "HC Relative humidity":"الرطوبة النسبية","HC Serial Number":"الرقم التسلسلي للحساس",
    "Solar radiation":"الإشعاع الشمسي","U-sonic wind speed":"سرعة الرياح فوق الصوتية",
    "U-sonic wind dir":"اتجاه الرياح","Wind gust":"هبات الرياح","Soil temperature 2":"حرارة التربة ٢",
    "Air pressure":"الضغط الجوي","5TE Battery voltage 2":"جهد بطارية حساس 5TE",
    "Sunset":"غروب الشمس","Sunrise":"شروق الشمس","Wind orientation":"اتجاه الرياح"
  };
  const metricLabels = {avg:"المتوسط",last:"آخر قراءة",sum:"الإجمالي",result:"النتيجة",time:"المدة",value:"القيمة",min:"الأدنى",max:"الأعلى"};
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const stationLabel = s => stationArabic[s.station_name] || s.station_name || s.station_id;
  const sensorLabel = s => sensorArabic[s] || s || "حساس غير مسمى";
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
    const list=state.stations.filter(s=>stationLabel(s).toLowerCase().includes(q)||(s.station_name||"").toLowerCase().includes(q)||(s.station_id||"").toLowerCase().includes(q));
    $("stations").innerHTML=list.length?list.map(s=>'<button class="station '+(s.station_id===state.selected?'active':'')+'" data-id="'+esc(encodeURIComponent(s.station_id))+'"><b>'+esc(stationLabel(s))+'</b><small>'+esc(s.station_id)+' · '+fmt(s.last_synced_at)+'</small></button>').join(""):'<div class="empty">لا توجد نتائج</div>';
    document.querySelectorAll(".station").forEach(b=>b.onclick=()=>selectStation(decodeURIComponent(b.dataset.id),true));
  }
  function selectStation(id,zoom){
    state.selected=id;renderStations();loadReadings();
    if(zoom && state.markers){const marker=state.markers.get(id);if(marker){state.map.setView(marker.getLatLng(),11);marker.openPopup();}}
  }
  function initMap(){
    if(!window.L || state.map)return;
    state.map=L.map("map",{scrollWheelZoom:false}).setView([35.5,37.5],7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(state.map);
    state.markers=L.layerGroup().addTo(state.map);
  }
  function renderMap(){
    if(!window.L)return;
    initMap();state.markers.clearLayers();const bounds=[];
    state.stations.forEach(s=>{
      const lat=Number(s.latitude),lon=Number(s.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
      const label=stationLabel(s),marker=L.marker([lat,lon],{title:label,alt:label}).bindPopup('<div class="map-popup"><b>'+esc(label)+'</b><br><small>'+esc(s.station_id)+'</small><br><small>الارتفاع: '+(s.altitude_m==null?'—':num(Number(s.altitude_m))+' م')+'</small><br><button type="button" class="map-select" data-station="'+esc(s.station_id)+'">عرض قياسات المحطة</button></div>');
      marker.on("popupopen",e=>{const btn=e.popup.getElement().querySelector(".map-select");if(btn)btn.onclick=()=>selectStation(s.station_id,false);});
      marker.addTo(state.markers);state.markers.set(s.station_id,marker);bounds.push([lat,lon]);
    });
    if(bounds.length)state.map.fitBounds(bounds,{padding:[24,24],maxZoom:9});
    $("mapCount").textContent=bounds.length.toLocaleString("ar")+" محطة على الخريطة";
    setTimeout(()=>state.map.invalidateSize(),100);
  }
  function metricCard(metric){
    const values=metric.values&&typeof metric.values==="object"?metric.values:{};
    const entries=Object.entries(values).filter(([,v])=>v!==null&&v!==undefined&&typeof v!=="object");
    const mainKey=["avg","last","sum","result","time","value","min","max"].find(k=>values[k]!==null&&values[k]!==undefined);
    const main=mainKey?values[mainKey]:"—";
    const details=entries.filter(([k])=>k!==mainKey).map(([k,v])=>'<span class="metric-detail"><small>'+esc(metricLabels[k]||k)+'</small><b>'+num(v)+'</b></span>').join("");
    const unit=metric.unit&&metric.unit!==false?" "+esc(metric.unit):"";
    return '<div class="sensor"><div class="sensor-name">'+esc(sensorLabel(metric.name))+'</div><div class="lcd"><span class="sensor-value">'+num(main)+'</span><small>'+unit+'</small></div><div class="sensor-meta">القناة: '+esc(metric.channel??"—")+' · الرمز: '+esc(metric.code??"—")+'</div>'+(details?'<div class="metric-details">'+details+'</div>':"")+'</div>';
  }
  function renderReadings(){
    $("readings").innerHTML=state.readings.length?state.readings.map(r=>{
      const raw=r.measurements&&r.measurements.values&&typeof r.measurements.values==="object"?r.measurements.values:{};
      const cards=Object.entries(raw).map(([key,m])=>metricCard({...m,code:m.code??key})).join("");
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
    }catch(e){if(request!==state.requestId)return;$("readings").innerHTML='<div class="empty">'+esc(e.message)+'</div>';status("تعذر تحميل القياسات: "+e.message,"err");}
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
      renderStations();renderMap();await loadReadings();status("متصل · تم تحميل البيانات","ok");
    }catch(e){status(e.message,"err");$("readings").innerHTML='<div class="empty">'+esc(e.message)+'</div>';}
    finally{$("refresh").disabled=false;}
  }
  $("refresh").onclick=load;$("search").oninput=renderStations;$("group").onchange=loadReadings;load();
})();