(() => {
  const $ = id => document.getElementById(id);
  const state = {stations:[], selected:"", readings:[], requestId:0, map:null, markers:null};
  const stationArabic = {
    "AFRIN  / VS":"عفرين","AL-RAI  / VS":"الراعي","Azaz":"اعزاز","Harem":"حارم",
    "IDLEB":"إدلب","Jabal al-Zawiya  / VS":"جبل الزاوية","JARABLUS / VS":"جرابلس",
    "KafrYhmol":"كفر يحمول","Khirbet AL-JOZ / VS":"خربة الجوز","Mabatli":"معبطلي",
    "Sahl Alroj":"سهل الروج"
  };
  const sensorInfo = {
    "Air temperature":{name:"درجة حرارة الهواء",category:"الطقس"},
    "HC Air temperature":{name:"درجة حرارة الهواء – حساس HC",category:"الطقس"},
    "Relative humidity":{name:"الرطوبة النسبية",category:"الطقس"},
    "HC Relative humidity":{name:"الرطوبة النسبية – حساس HC",category:"الطقس"},
    "Dew Point":{name:"درجة حرارة نقطة الندى",category:"الطقس"},
    "Air pressure":{name:"الضغط الجوي",category:"الطقس"},
    "VPD":{name:"عجز ضغط بخار الماء",category:"الطقس"},
    "DeltaT":{name:"فرق درجة الحرارة (دلتا T)",category:"الطقس"},
    "Precipitation":{name:"كمية الهطول المطري",category:"الأمطار"},
    "Wind speed":{name:"سرعة الرياح",category:"الرياح"},
    "U-sonic wind speed":{name:"سرعة الرياح بالموجات فوق الصوتية",category:"الرياح"},
    "Wind direction":{name:"اتجاه الرياح",category:"الرياح"},
    "U-sonic wind dir":{name:"اتجاه الرياح بالموجات فوق الصوتية",category:"الرياح"},
    "Wind orientation":{name:"اتجاه الرياح",category:"الرياح"},
    "Wind gust":{name:"سرعة هبّات الرياح",category:"الرياح"},
    "Solar radiation":{name:"شدة الإشعاع الشمسي",category:"الإشعاع الشمسي"},
    "Active Radiation":{name:"الإشعاع الضوئي الفعّال",category:"الإشعاع الشمسي"},
    "Sunshine duration":{name:"مدة سطوع الشمس",category:"الإشعاع الشمسي"},
    "Solar Panel":{name:"جهد اللوح الشمسي",category:"الطاقة"},
    "Battery":{name:"جهد بطارية المحطة",category:"الطاقة"},
    "5TE Battery voltage 2":{name:"جهد بطارية حساس 5TE",category:"الطاقة"},
    "Soil temperature":{name:"درجة حرارة التربة",category:"التربة"},
    "Soil temperature 2":{name:"درجة حرارة التربة – العمق ٢",category:"التربة"},
    "Soil temperature 6":{name:"درجة حرارة التربة – العمق ٦",category:"التربة"},
    "Soil temperature 9":{name:"درجة حرارة التربة – العمق ٩",category:"التربة"},
    "PI-Profile Soil Temperature 4":{name:"درجة حرارة التربة – مجس PI، العمق ٤",category:"التربة"},
    "PI-Profile Soil Temperature 6":{name:"درجة حرارة التربة – مجس PI، العمق ٦",category:"التربة"},
    "EAG Soil moisture 6":{name:"رطوبة التربة – مجس EAG، العمق ٦",category:"التربة"},
    "EAG Soil moisture 9":{name:"رطوبة التربة – مجس EAG، العمق ٩",category:"التربة"},
    "PI-Profile Soil Moisture 6":{name:"رطوبة التربة – مجس PI، العمق ٦",category:"التربة"},
    "Volumetric Ionic Content 6":{name:"المحتوى الأيوني الحجمي – العمق ٦",category:"التربة"},
    "Volumetric Ionic Content 9":{name:"المحتوى الأيوني الحجمي – العمق ٩",category:"التربة"},
    "Leaf Wetness":{name:"مدة ابتلال الأوراق",category:"حالة النبات"},
    "Evapotranspiration":{name:"التبخر والنتح",category:"المياه"},
    "ET0":{name:"التبخر والنتح المرجعي (ET₀)",category:"المياه"},
    "Pressure Switch":{name:"مدة تفعيل مفتاح الضغط",category:"حالة الجهاز"},
    "HC Serial Number":{name:"الرقم التسلسلي لحساس HC",category:"تعريف الجهاز"},
    "Serial Number":{name:"الرقم التسلسلي للحساس",category:"تعريف الجهاز"},
    "Serial Number 2":{name:"الرقم التسلسلي للحساس ٢",category:"تعريف الجهاز"},
    "Midnight":{name:"توقيت منتصف الليل",category:"بيانات زمنية"},
    "Sunrise":{name:"وقت شروق الشمس",category:"بيانات زمنية"},
    "Sunset":{name:"وقت غروب الشمس",category:"بيانات زمنية"}
  };
  const metricLabels = {avg:"المتوسط",last:"آخر قراءة",sum:"الإجمالي",result:"النتيجة",time:"المدة",value:"القيمة",min:"الأدنى",max:"الأعلى"};
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const stationLabel = s => stationArabic[(s.station_name || "").trim()] || (s.station_name || s.station_id);
  const sensorLabel = s => sensorInfo[s]?.name || s || "حساس غير مسمى";
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
    const category=sensorInfo[metric.name]?.category || "قياس إضافي";
    return '<div class="sensor"><div class="sensor-name">'+esc(sensorLabel(metric.name))+'</div><div class="sensor-category">'+esc(category)+'</div><div class="lcd"><span class="sensor-value">'+num(main)+'</span><small>'+unit+'</small></div><div class="sensor-meta">القناة: '+esc(metric.channel??"—")+' · الرمز: '+esc(metric.code??"—")+'</div>'+(details?'<div class="metric-details">'+details+'</div>':"")+'</div>';
  }
  const summaryMetrics = [
    {keys:["Air temperature","HC Air temperature"],label:"درجة حرارة الهواء",icon:"🌡️"},
    {keys:["Relative humidity","HC Relative humidity"],label:"الرطوبة النسبية",icon:"💧"},
    {keys:["Precipitation"],label:"الهطول المطري",icon:"🌧️"},
    {keys:["Wind speed","U-sonic wind speed"],label:"سرعة الرياح",icon:"🌬️"},
    {keys:["Wind direction","U-sonic wind dir","Wind orientation"],label:"اتجاه الرياح",icon:"🧭"},
    {keys:["Solar radiation"],label:"الإشعاع الشمسي",icon:"☀️"},
    {keys:["Soil temperature","Soil temperature 2","Soil temperature 6","Soil temperature 9"],label:"حرارة التربة",icon:"🌱"},
    {keys:["EAG Soil moisture 6","EAG Soil moisture 9","PI-Profile Soil Moisture 6"],label:"رطوبة التربة",icon:"🌿"}
  ];
  function renderSummary(){
    const root=$("stationSummary");if(!root)return;
    const found={};
    for(const reading of state.readings){
      const metrics=reading.measurements?.values;
      if(!metrics||typeof metrics!=="object")continue;
      for(const spec of summaryMetrics){
        if(found[spec.label])continue;
        for(const key of spec.keys){
          const metric=metrics[key];if(!metric)continue;
          const vals=metric.values&&typeof metric.values==="object"?metric.values:{};
          const mainKey=["last","avg","sum","result","value","min","max"].find(k=>vals[k]!==null&&vals[k]!==undefined);
          const value=mainKey?vals[mainKey]:null;
          if(value===null||value===undefined||typeof value==="object")continue;
          found[spec.label]={...spec,value,unit:metric.unit||"",at:reading.recorded_at};
          break;
        }
      }
      if(Object.keys(found).length===summaryMetrics.length)break;
    }
    const cards=summaryMetrics.filter(x=>found[x.label]).map(x=>{
      const m=found[x.label];
      return '<div class="summary-card"><div class="summary-label"><span>'+m.icon+'</span>'+esc(m.label)+'</div><div class="summary-value">'+num(m.value)+' <small>'+esc(m.unit)+'</small></div><div class="summary-time">آخر قياس: '+fmt(m.at)+'</div></div>';
    }).join("");
    root.innerHTML=cards?'<div class="summary-grid">'+cards+'</div>':'<div class="summary-empty">لا تتوفر مؤشرات ملخصة لهذه المحطة في السجلات المحمّلة.</div>';
  }
  function renderReadings(){
    renderSummary();
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