(() => {
  const $ = id => document.getElementById(id);
  const state = {stations:[], selected:"", readings:[], history:[], latestByStation:new Map(), requestId:0, map:null, markers:null, markerLayer:null};
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
    $("stations").innerHTML=list.length?list.map(s=>{
      const latest=state.latestByStation.get(s.station_id);
      const t=metricNumber(latest,["HC Air temperature","Air temperature"],["avg","last","result","value"]);
      return '<button class="station '+(s.station_id===state.selected?'active':'')+'" data-id="'+esc(encodeURIComponent(s.station_id))+'"><b>'+esc(stationLabel(s))+'</b><small>'+esc(s.station_id)+' · آخر سجل: '+fmt(latest?.recorded_at)+(t===null?'':' · '+num(t)+'°C')+'</small></button>';
    }).join(""):'<div class="empty">لا توجد نتائج</div>';
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
    state.markerLayer=L.layerGroup().addTo(state.map);state.markers=new Map();
  }
  function metricByName(row,names){
    const all=row?.measurements?.values||{};
    return Object.values(all).find(m=>names.includes(m?.name))||null;
  }
  function metricNumber(row,names,priority=["last","avg","sum","result","value","min","max"]){
    const m=metricByName(row,names);if(!m)return null;
    for(const k of priority){const v=m.values?.[k];if(v!==null&&v!==undefined&&Number.isFinite(Number(v)))return Number(v);}
    return null;
  }
  function latestBrief(row){
    if(!row)return "لا توجد قراءة مسجلة";
    const t=metricNumber(row,["HC Air temperature","Air temperature"],["last","avg","result","value"]);
    const rh=metricNumber(row,["HC Relative humidity","Relative humidity"],["last","avg","result","value"]);
    const wind=metricNumber(row,["U-sonic wind speed","Wind speed"],["last","avg","result","value"]);
    return '<div class="popup-metrics">'+(t===null?"":'<span>🌡️ '+num(t)+' °C</span>')+(rh===null?"":'<span>💧 '+num(rh)+'%</span>')+(wind===null?"":'<span>🌬️ '+num(wind)+' م/ث</span>')+'</div><small>آخر سجل: '+fmt(row.recorded_at)+'</small>';
  }
  function renderMap(){
    if(!window.L)return;
    initMap();state.markerLayer.clearLayers();state.markers.clear();const bounds=[];
    state.stations.forEach(s=>{
      const lat=Number(s.latitude),lon=Number(s.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
      const label=stationLabel(s),row=state.latestByStation.get(s.station_id);
      const popup='<div class="map-popup"><b>'+esc(label)+'</b><small>محطة آلية · FieldClimate</small><br><small>'+esc(s.station_id)+'</small><br><small>الارتفاع: '+(s.altitude_m==null?'—':num(Number(s.altitude_m))+' م')+'</small><div class="popup-latest">'+latestBrief(row)+'</div><button type="button" class="map-select" data-station="'+esc(s.station_id)+'">فتح لوحة المحطة</button></div>';
      const marker=L.marker([lat,lon],{title:label,alt:label,icon:stationIcon("automated")}).bindPopup(popup);
      marker.on("popupopen",e=>{const btn=e.popup.getElement().querySelector(".map-select");if(btn)btn.onclick=()=>selectStation(s.station_id,false);});
      marker.addTo(state.markerLayer);state.markers.set(s.station_id,marker);bounds.push([lat,lon]);
    });
    classicWeatherRows.forEach(r=>{
      const lat=cwVal(r.latitude),lon=cwVal(r.longitude);if(lat===null||lon===null)return;
      const label=cwName(r);
      const popup='<div class="map-popup"><b>'+esc(label)+'</b><small>محطة كلاسيكية</small><span>الحرارة: '+(cwVal(r.dry_temp)===null?"—":cwFmt(cwVal(r.dry_temp))+" °م")+'</span><span>الرطوبة: '+(cwVal(r.relative_humidity)===null?"—":cwFmt(cwVal(r.relative_humidity),0)+"%")+'</span><span>الرياح: '+(cwVal(r.wind_speed)===null?"—":cwFmt(cwVal(r.wind_speed),0)+" م/ث")+'</span><span class="muted">'+esc(r.submission_date||"—")+" · "+esc(r.utc_time||"—")+" UTC"+'</span></div>';
      L.marker([lat,lon],{title:label,icon:stationIcon("classic")}).bindPopup(popup).addTo(state.markerLayer);bounds.push([lat,lon]);
    });
    if(bounds.length)state.map.fitBounds(bounds,{padding:[24,24],maxZoom:9});
    $("mapCount").textContent=bounds.length.toLocaleString("ar")+" موقعاً · "+state.stations.length.toLocaleString("ar")+" آلية · "+classicWeatherRows.filter(r=>cwVal(r.latitude)!==null&&cwVal(r.longitude)!==null).length.toLocaleString("ar")+" كلاسيكية";
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
    const n=String(metric.name||"").toLowerCase();const kind=/temperature|dew point/.test(n)?"temperature":/humidity|moisture/.test(n)?"humidity":/wind/.test(n)?"wind":/precipitation|rain/.test(n)?"rain":/solar|radiation|sunshine/.test(n)?"solar":/soil/.test(n)?"soil":"standard";return '<div class="sensor sensor--'+kind+'"><div class="sensor-name">'+esc(sensorLabel(metric.name))+'</div><div class="sensor-category">'+esc(category)+'</div><div class="lcd"><span class="sensor-value">'+num(main)+'</span><small>'+unit+'</small></div><div class="sensor-meta">القناة: '+esc(metric.channel??"—")+' · الرمز: '+esc(metric.code??"—")+'</div>'+(details?'<div class="metric-details">'+details+'</div>':"")+'</div>';
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
    const row=state.readings[0],root=$("stationSummary");if(!root)return;
    if(!row){root.innerHTML='<div class="summary-empty">لا يوجد سجل لهذه المحطة.</div>';return;}
    const specs=[
      {keys:["HC Air temperature","Air temperature"],label:"حرارة الهواء",unit:"°C",icon:"🌡️"},
      {keys:["HC Relative humidity","Relative humidity"],label:"الرطوبة",unit:"%",icon:"💧"},
      {keys:["Precipitation"],label:"الهطول",unit:"mm",icon:"🌧️"},
      {keys:["U-sonic wind speed","Wind speed"],label:"سرعة الرياح",unit:"m/s",icon:"🌬️"},
      {keys:["U-sonic wind dir","Wind direction","Wind orientation"],label:"اتجاه الرياح",unit:"°",icon:"🧭"},
      {keys:["Solar radiation"],label:"الإشعاع الشمسي",unit:"W/m²",icon:"☀️"},
      {keys:["Soil temperature","Soil temperature 2","Soil temperature 6","Soil temperature 9"],label:"حرارة التربة",unit:"°C",icon:"🌱"},
      {keys:["EAG Soil moisture 6","EAG Soil moisture 9","PI-Profile Soil Moisture 6"],label:"رطوبة التربة",unit:"",icon:"🌿"}
    ];
    root.innerHTML='<div class="latest-stamp">أحدث سجل للمحطة · '+fmt(row.recorded_at)+' · '+(row.group_name==="hourly"?"ساعي":"يومي")+'</div><div class="instrument-grid">'+specs.map(x=>{
      const m=metricByName(row,x.keys),v=metricNumber(row,x.keys);
      return '<div class="instrument"><div class="instrument-title"><span>'+x.icon+'</span>'+x.label+'</div><div class="instrument-value">'+(v===null?"—":num(v))+' <small>'+esc(m?.unit||x.unit)+'</small></div></div>';
    }).join("")+'</div>';
    renderGaugeBoard(row);
  }
  function renderGaugeBoard(row){
    const root=$("gaugeBoard");if(!root)return;
    const dir=metricNumber(row,["U-sonic wind dir","Wind direction","Wind orientation"]);
    const speed=metricNumber(row,["U-sonic wind speed","Wind speed"]);
    const temp=metricNumber(row,["HC Air temperature","Air temperature"]);
    const hum=metricNumber(row,["HC Relative humidity","Relative humidity"]);
    const rain=metricNumber(row,["Precipitation"],["sum","last","avg"]);
    const solar=metricNumber(row,["Solar radiation"],["avg","last"]);
    const cloud=metricNumber(row,["Cloud cover","Total cloud cover"]);
    const compass=dir===null?'<div class="gauge-empty">لا توجد قراءة اتجاه</div>':'<div class="compass"><span class="north">ش</span><span class="east">ق</span><span class="south">ج</span><span class="west">غ</span><i style="transform:rotate('+dir+'deg)"></i><b>🧭</b></div><strong>'+num(dir)+'°</strong>';
    const dial=(value,unit,max)=>'<div class="dial" style="--pct:'+Math.max(0,Math.min(100,(value??0)/max*100))+'%"><div class="dial-inner"><b>'+(value===null?"—":num(value))+'</b><small>'+unit+'</small></div></div>';
    const bars='<div class="device-bars">'+[28,52,38,76,44,62,32,85,48].map((v,i)=>'<i style="height:'+v+'%"></i>').join("")+'</div>';
    const spark='<svg class="device-spark" viewBox="0 0 180 34" aria-hidden="true"><path d="M0 27 C20 24 25 7 45 13 S70 31 91 18 S124 4 140 16 S164 26 180 8" fill="none" stroke="#e7ad36" stroke-width="3" stroke-linecap="round"/><path d="M0 34 L0 27 C20 24 25 7 45 13 S70 31 91 18 S124 4 140 16 S164 26 180 8 L180 34Z" fill="#f9df9a" opacity=".5"/></svg>';
    root.innerHTML='<div class="device-grid">'+
      '<div class="device device--temperature"><div class="device-head">🌡️ درجة حرارة الهواء</div><div class="device-reading">'+(temp===null?"—":num(temp))+' <small>°م</small></div><div class="device-condition">'+(temp===null?"لا توجد قراءة":temp>=35?"حار":temp>=25?"دافئ":temp>=15?"معتدل":"بارد")+'</div></div>'+
      '<div class="device device--humidity"><div class="device-head">💧 الرطوبة النسبية</div>'+dial(hum,"%",100)+'</div>'+
      '<div class="device device--wind"><div class="device-head">🧭 اتجاه الرياح</div>'+compass+'<div class="device-condition">سرعة '+(speed===null?"—":num(speed)+" م/ث")+'</div></div>'+
      '<div class="device device--cloud"><div class="device-head">☁️ حالة الغطاء السحابي</div><div class="device-reading">'+(cloud===null?"—":num(cloud))+' <small>أثمان</small></div><div class="device-condition">'+(cloud===null?"لا توجد قراءة":cloud<=2?"سماء صافية":cloud<=5?"غيوم متفرقة":"غائم")+'</div></div>'+
      '<div class="device device--solar"><div class="device-head">☀️ الإشعاع الشمسي</div><div class="device-reading">'+(solar===null?"—":num(solar))+' <small>W/m²</small></div>'+spark+'</div>'+
      '<div class="device device--rain"><div class="device-head">🌧️ الهطول المطري</div><div class="device-reading">'+(rain===null?"—":num(rain))+' <small>mm</small></div>'+bars+'</div>'+
    '</div>';
  }
  function chartSvg(points,label,unit){
    const vals=points.filter(p=>p.v!==null);if(vals.length<2)return '<div class="chart-empty">لا توجد نقاط كافية خلال آخر 24 ساعة</div>';
    const w=640,h=190,pad=28,min=Math.min(...vals.map(p=>p.v)),max=Math.max(...vals.map(p=>p.v)),span=max-min||1;
    const xy=vals.map((p,i)=>[pad+i*(w-2*pad)/(vals.length-1),h-pad-(p.v-min)/span*(h-2*pad)]);
    const poly=xy.map(p=>p.join(",")).join(" ");
    return '<svg class="chart-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(label)+' خلال آخر 24 ساعة"><path class="chart-guides" stroke="#31566b" stroke-width="1" stroke-dasharray="4 4" fill="none" d="M'+pad+' '+pad+'H'+(w-pad)+' M'+pad+' '+(h/2)+'H'+(w-pad)+' M'+pad+' '+(h-pad)+'H'+(w-pad)+'"/><polyline points="'+poly+'" fill="none" stroke="#62e8bd" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+xy.filter((p,i)=>i===0||i===xy.length-1).map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#a5f5db"/>').join("")+'<text x="'+pad+'" y="17" fill="#a9bdca" font-size="12">'+num(max)+' '+esc(unit)+'</text><text x="'+pad+'" y="'+(h-5)+'" fill="#a9bdca" font-size="12">'+num(min)+' '+esc(unit)+'</text></svg>';
  }
  function renderHistory(){
    const root=$("historyCharts");if(!root)return;
    const defs=[
      {label:"درجة حرارة الهواء",names:["HC Air temperature","Air temperature"],unit:"°C"},
      {label:"الرطوبة النسبية",names:["HC Relative humidity","Relative humidity"],unit:"%"},
      {label:"سرعة الرياح",names:["U-sonic wind speed","Wind speed"],unit:"m/s"},
      {label:"الهطول المطري",names:["Precipitation"],unit:"mm"},
      {label:"الإشعاع الشمسي",names:["Solar radiation"],unit:"W/m²"}
    ];
    root.innerHTML=defs.map(d=>{
      const pts=state.history.map(r=>({t:r.recorded_at,v:metricNumber(r,d.names,["avg","last","sum","result","value"])})).filter(p=>p.v!==null);
      return '<article class="chart-card"><b>'+d.label+'</b><small>'+pts.length+' قراءة خلال آخر 24 ساعة</small>'+chartSvg(pts,d.label,d.unit)+'</article>';
    }).join("");
  }
  function renderTemperatureComparison(){
    const root=$("temperatureComparison");if(!root)return;
    const rows=state.stations.map(s=>({name:stationLabel(s),row:state.latestByStation.get(s.station_id)})).map(x=>({...x,v:metricNumber(x.row,["HC Air temperature","Air temperature"],["avg","last","result","value"])})).filter(x=>x.v!==null).sort((a,b)=>b.v-a.v);
    if(!rows.length){root.innerHTML='<div class="chart-empty">لا توجد درجات حرارة متاحة للمقارنة.</div>';return;}
    const max=Math.max(...rows.map(x=>x.v)),min=Math.min(...rows.map(x=>x.v));
    root.innerHTML='<div class="comparison-note">مقارنة أحدث درجة حرارة متاحة لكل محطة · '+rows.length+' محطة · '+num(min)+' إلى '+num(max)+' °C</div>'+rows.map(x=>'<div class="bar-row"><span>'+esc(x.name)+'</span><div class="bar-track"><i style="width:'+Math.max(2,(x.v-min)/(max-min||1)*100)+'%"></i></div><b>'+num(x.v)+'°</b></div>').join("");
  }
  function renderWeatherHero(){
    const row=state.readings[0],station=state.stations.find(s=>s.station_id===state.selected);
    const put=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
    put("weatherStation",station?stationLabel(station):"اختر محطة رصد");put("weatherStationId",station?station.station_id:"METRA · FIELD STATION");
    if(!row){put("weatherTemp","—°");put("weatherCondition","لا توجد قراءة متاحة حالياً");put("weatherHumidity","—");put("weatherWind","—");put("weatherRain","—");put("weatherSolar","—");put("weatherUpdated","آخر تحديث: —");return;}
    const t=metricNumber(row,["HC Air temperature","Air temperature"]),rh=metricNumber(row,["HC Relative humidity","Relative humidity"]),wind=metricNumber(row,["U-sonic wind speed","Wind speed"]),rain=metricNumber(row,["Precipitation"],["sum","last","avg"]),solar=metricNumber(row,["Solar radiation"],["avg","last"]);
    put("weatherTemp",t===null?"—°":num(t)+"°");put("weatherCondition",t===null?"قراءات الطقس للمحطة المختارة":t>=35?"أجواء حارة":t>=25?"أجواء دافئة":t>=15?"أجواء معتدلة":t>=5?"أجواء باردة":"أجواء شديدة البرودة");put("weatherIcon",t===null?"🌤️":t>=32?"☀️":t<=5?"🌧️":"🌤️");put("weatherHumidity",rh===null?"—":num(rh)+"%");put("weatherWind",wind===null?"—":num(wind)+" م/ث");put("weatherRain",rain===null?"—":num(rain)+" مم");put("weatherSolar",solar===null?"—":num(solar)+" W/m²");put("weatherUpdated","آخر قراءة: "+fmt(row.recorded_at));
  }
  function renderReadings(){
    renderWeatherHero();renderSummary();renderHistory();
    const row=state.readings[0];
    $("readings").innerHTML=row?'<article class="reading"><div class="reading-head"><b>'+fmt(row.recorded_at)+'</b><span class="muted">'+(row.group_name==="hourly"?"أحدث سجل ساعي":"أحدث سجل يومي")+'</span></div><div class="sensor-grid">'+Object.entries(row.measurements?.values||{}).map(([key,m])=>metricCard({...m,code:m.code??key})).join("")+'</div></article>':'<div class="empty">لا توجد قياسات مسجلة لهذه المحطة.</div>';
    $("readingCount").textContent=(row?1:0).toLocaleString("ar");
  }
  async function loadReadings(){
    const request=++state.requestId;
    if(!state.selected){state.readings=[];state.history=[];renderReadings();return;}
    $("readings").innerHTML='<div class="empty">جارٍ تحميل أحدث سجل…</div>';
    try{
      const latest=await query("fieldclimate_public_latest_readings",{select:"station_id,station_name,recorded_at,group_name,measurements,fetched_at",station_id:"eq."+state.selected,limit:"1"});
      if(request!==state.requestId)return;
      state.readings=latest;
      const since=new Date(Date.now()-24*60*60*1000).toISOString();
      state.history=await query("fieldclimate_public_readings",{select:"station_id,station_name,recorded_at,group_name,measurements",station_id:"eq."+state.selected,recorded_at:"gte."+since,order:"recorded_at.asc",limit:"1500"});
      if(request!==state.requestId)return;
      renderReadings();
    }catch(e){
      if(request!==state.requestId)return;
      $("readings").innerHTML='<div class="empty">'+esc(e.message)+'</div>';
      status("تعذر تحميل القياسات: "+e.message,"err");
    }
  }
  async function load(){
    $("refresh").disabled=true;status("جارٍ تحميل آخر سجل لكل محطة والبيانات الزمنية…");
    try{
      const [stations,latest]=await Promise.all([
        query("fieldclimate_public_stations",{select:"station_id,station_name,latitude,longitude,altitude_m,last_synced_at",order:"station_name.asc",limit:"500"}),
        query("fieldclimate_public_latest_readings",{select:"station_id,station_name,recorded_at,group_name,measurements,fetched_at",order:"recorded_at.desc",limit:"500"})
      ]);
      state.stations=stations;state.latestByStation=new Map(latest.map(r=>[r.station_id,r]));
      $("stationCount").textContent=stations.length.toLocaleString("ar");
      const fresh=latest.filter(r=>Date.now()-new Date(r.recorded_at).getTime()<=24*60*60*1000);
      $("activeCount").textContent=fresh.length.toLocaleString("ar");
      $("lastSync").textContent=fmt(stations.map(x=>x.last_synced_at).filter(Boolean).sort().at(-1));
      if(!stations.some(x=>x.station_id===state.selected))state.selected=stations[0]?.station_id||"";
      renderStations();renderMap();renderTemperatureComparison();await loadReadings();await loadClassicWeather();status("متصل · بيانات FieldClimate والتقارير الكلاسيكية جاهزة","ok");
    }catch(e){status(e.message,"err");$("readings").innerHTML='<div class="empty">'+esc(e.message)+'</div>';}
    finally{$("refresh").disabled=false;}
  }

  let classicWeatherRows=[];
  let classicSelected="";
  const stationIcon=(kind)=>L.divIcon({className:"",html:kind==="classic"?'<div class="station-pin classic"><span>▦</span></div>':'<div class="station-pin automated">⌁</div>',iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-13]});
  const cwVal=v=>{if(v===null||v===undefined||String(v).trim()===""||String(v).trim()==="—")return null;const n=Number(String(v).replace(/^\+/,"").trim());return Number.isFinite(n)?n:null;};
  const cwFmt=(v,d=1)=>v===null?"—":Number(v).toLocaleString("en-US",{maximumFractionDigits:d});
  const cwName=r=>r.station_name||"محطة غير مسماة";
  const cwMetrics=[
    {key:"dry_temp",label:"الحرارة الجافة",icon:"🌡️",unit:"°م",max:50},
    {key:"wet_temp",label:"الحرارة الرطبة",icon:"💧",unit:"°م",max:40},
    {key:"relative_humidity",label:"الرطوبة النسبية",icon:"💦",unit:"%",max:100},
    {key:"dew_point",label:"نقطة الندى",icon:"🌫️",unit:"°م",max:35},
    {key:"wind_speed",label:"سرعة الرياح",icon:"🌬️",unit:"م/ث",max:30},
    {key:"wind_direction",label:"اتجاه الرياح",icon:"🧭",unit:"درجة",max:360},
    {key:"total_cloud_cover",label:"الغطاء السحابي",icon:"☁️",unit:"أثمان",max:8},
    {key:"precipitation_amount",label:"الهطول",icon:"🌧️",unit:"مم",max:100}
  ];
  function renderClassicGauges(){
    const r=classicWeatherRows.find(x=>x.station_name===classicSelected);
    if(!r){$("classicWeatherGauges").innerHTML='<div class="empty">لا توجد قراءة حديثة للمحطة المختارة.</div>';return;}
    $("classicWeatherStamp").textContent="آخر تحديث: "+(r.submission_date||"—")+" · "+(r.utc_time||"—")+" UTC";
    $("classicWeatherGauges").innerHTML=cwMetrics.map(m=>{const v=cwVal(r[m.key]),pct=v===null?0:Math.max(0,Math.min(100,Math.abs(v)/m.max*100));return '<div class="classic-gauge classic-gauge--'+m.key+'"><span class="g-icon">'+m.icon+'</span><span class="g-label">'+m.label+'</span><strong class="g-value">'+cwFmt(v)+'</strong><span class="g-unit">'+m.unit+'</span><div class="g-track"><i style="width:'+pct+'%"></i></div></div>';}).join("");
    const sel=$("classicStationSelect");if(sel.value!==classicSelected)sel.value=classicSelected;
  }
  function renderClassicLatestCharts(){
    const defs=[["dry_temp","الحرارة الجافة","°م"],["wet_temp","الحرارة الرطبة","°م"],["relative_humidity","الرطوبة النسبية","%"],["dew_point","نقطة الندى","°م"],["wind_speed","سرعة الرياح","م/ث"],["total_cloud_cover","الغطاء السحابي","أثمان"]];
    $("classicLatestCharts").innerHTML=defs.map(([key,title,unit])=>{const vals=classicWeatherRows.map(r=>({name:cwName(r),v:cwVal(r[key])})).filter(x=>x.v!==null);const max=Math.max(1,...vals.map(x=>Math.abs(x.v)));return '<div class="latest-chart"><h4>'+title+' · '+unit+'</h4><div class="latest-bars">'+(vals.length?vals.sort((a,b)=>b.v-a.v).map(x=>'<div class="latest-bar-row"><span class="station-label" title="'+esc(x.name)+'">'+esc(x.name)+'</span><span class="bar-bg"><i style="width:'+Math.max(2,Math.abs(x.v)/max*100)+'%"></i></span><b>'+cwFmt(x.v)+'</b></div>').join(""):'<div class="muted">لا توجد قيم متاحة</div>')+'</div></div>';}).join("");
  }
  async function loadClassicWeather(){
    const rows=await query("classic_public_hourly_latest",{select:"station_name,submission_date,utc_time,dry_temp,wet_temp,relative_humidity,dew_point,wind_speed,wind_direction,total_cloud_cover,precipitation_amount,latitude,longitude,created_at",order:"station_name.asc",limit:"200"});
    classicWeatherRows=rows;const sel=$("classicStationSelect");sel.innerHTML=rows.map(r=>'<option value="'+esc(r.station_name)+'">'+esc(cwName(r))+'</option>').join("");
    if(!rows.some(r=>r.station_name===classicSelected))classicSelected=rows[0]?.station_name||"";
    sel.value=classicSelected;renderClassicGauges();renderClassicLatestCharts();renderMap();
    $("classicStationSelect").onchange=e=>{classicSelected=e.target.value;renderClassicGauges();const r=classicWeatherRows.find(x=>x.station_name===classicSelected),lat=cwVal(r?.latitude),lon=cwVal(r?.longitude);if(lat!==null&&lon!==null&&state.map)state.map.setView([lat,lon],10);};
  }

  $("refresh").onclick=load;$("search").oninput=renderStations;load();
})();