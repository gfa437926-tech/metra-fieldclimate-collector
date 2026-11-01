(() => {
  const $ = id => document.getElementById(id);
  const state = {stations:[], selected:"", readings:[], history:[], latestByStation:new Map(), requestId:0, networkHistory:[], map:null, markers:null, markerLayer:null};
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
    const q=($("search").value||"").trim().toLocaleLowerCase("ar");
    const automated=state.stations
      .filter(s=>[stationLabel(s),s.station_name,s.station_id].some(v=>String(v||"").toLocaleLowerCase("ar").includes(q)))
      .map(s=>{
        const latest=state.latestByStation.get(s.station_id);
        const t=metricNumber(latest,["HC Air temperature","Air temperature"],["avg","last","result","value"]);
        return '<button class="station '+(s.station_id===state.selected?'active':'')+'" data-kind="automated" data-id="'+esc(encodeURIComponent(s.station_id))+'"><b>'+esc(stationLabel(s))+'</b><small><span class="station-result-meta automated">محطة آلية · FieldClimate</span> '+esc(s.station_id)+' · آخر سجل: '+fmt(latest?.recorded_at)+(t===null?'':' · '+num(t)+'°م')+'</small></button>';
      });
    const classic=classicWeatherRows
      .filter(r=>[cwName(r),r.station_name].some(v=>String(v||"").toLocaleLowerCase("ar").includes(q)))
      .map(r=>'<button class="station '+(r.station_name===classicSelected?'active':'')+'" data-kind="classic" data-id="'+esc(encodeURIComponent(r.station_name))+'"><b>'+esc(cwName(r))+'</b><small><span class="station-result-meta classic">محطة كلاسيكية</span> آخر تقرير: '+esc(r.submission_date||"—")+' · '+esc(r.utc_time||"—")+' UTC</small></button>');
    const results=automated.concat(classic);
    $("stations").innerHTML=results.length?results.join(""):'<div class="empty">لا توجد محطات مطابقة في المصادر الكلاسيكية أو الآلية.</div>';
    document.querySelectorAll(".station[data-kind]").forEach(b=>b.onclick=()=>{
      const id=decodeURIComponent(b.dataset.id);
      if(b.dataset.kind==="automated") selectStation(id,true);
      else {
        classicSelected=id;state.selected="";
        $("automatedStationDetails").hidden=true;$("classicUnifiedDetails").hidden=false;
        $("detailStationTitle").textContent=cwName(classicWeatherRows.find(x=>x.station_name===id)||{station_name:id});
        $("detailStationSource").textContent="محطة كلاسيكية · أحدث تقرير متاح";
        renderStations();renderClassicGauges();
        const r=classicWeatherRows.find(x=>x.station_name===id),lat=cwVal(r?.latitude),lon=cwVal(r?.longitude);
        if(lat!==null&&lon!==null&&state.map)state.map.setView([lat,lon],10);
        $("historySection")?.scrollIntoView({behavior:"smooth",block:"start"});
      }
    });
  }
  function selectStation(id,zoom){
    state.selected=id;renderStations();
    $("automatedStationDetails").hidden=false;$("classicUnifiedDetails").hidden=true;
    $("detailStationTitle").textContent=stationLabel(state.stations.find(s=>s.station_id===id)||{station_id:id});
    $("detailStationSource").textContent="محطة آلية · FieldClimate";
    loadReadings();
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
  function airportIcon(){return L.divIcon({className:"airport-marker-wrap",html:'<span class="airport-marker" title="مطار" aria-label="مطار">✈</span>',iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-10]});}
  function renderMap(){
    if(!window.L)return;
    initMap();state.markerLayer.clearLayers();state.markers.clear();const bounds=[];
    state.stations.forEach(s=>{
      const lat=Number(s.latitude),lon=Number(s.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
      const label=stationLabel(s),row=state.latestByStation.get(s.station_id);
      const popup='<div class="map-popup"><b>'+esc(label)+'</b><small>محطة آلية · FieldClimate</small><br><small>'+esc(s.station_id)+'</small><br><small>الارتفاع: '+(s.altitude_m==null?'—':num(Number(s.altitude_m))+' م')+'</small><div class="popup-latest">'+latestBrief(row)+'</div><button type="button" class="map-select" data-station="'+esc(s.station_id)+'">فتح لوحة المحطة</button></div>';
      const isAirport=/مطار|airport|aerodrome/i.test(label+" "+(s.station_name||""));
      const marker=L.marker([lat,lon],{title:label,alt:label,icon:isAirport?airportIcon():stationIcon("automated")}).bindPopup(popup);
      marker.on("popupopen",e=>{const btn=e.popup.getElement().querySelector(".map-select");if(btn)btn.onclick=()=>selectStation(s.station_id,false);});
      marker.addTo(state.markerLayer);state.markers.set(s.station_id,marker);bounds.push([lat,lon]);
    });
    classicWeatherRows.forEach(r=>{
      const lat=cwVal(r.latitude),lon=cwVal(r.longitude);if(lat===null||lon===null)return;
      const label=cwName(r);
      const popup='<div class="map-popup"><b>'+esc(label)+'</b><small>محطة كلاسيكية</small><span>الحرارة: '+(cwVal(r.dry_temp)===null?"—":cwFmt(cwVal(r.dry_temp))+" °م")+'</span><span>الرطوبة: '+(cwVal(r.relative_humidity)===null?"—":cwFmt(cwVal(r.relative_humidity),0)+"%")+'</span><span>الرياح: '+(cwVal(r.wind_speed)===null?"—":cwFmt(cwVal(r.wind_speed),0)+" م/ث")+'</span><span class="muted">'+esc(r.submission_date||"—")+" · "+esc(r.utc_time||"—")+" UTC"+'</span><button type="button" class="map-select classic-map-select" data-classic-station="'+esc(encodeURIComponent(r.station_name))+'">فتح لوحة المحطة</button></div>';
      const isAirport=/مطار|airport|aerodrome/i.test(label);
      const marker=L.marker([lat,lon],{title:label,icon:isAirport?airportIcon():stationIcon("classic")}).bindPopup(popup);
      marker.on("popupopen",e=>{const btn=e.popup.getElement().querySelector(".classic-map-select");if(btn)btn.onclick=()=>{const id=decodeURIComponent(btn.dataset.classicStation);classicSelected=id;state.selected="";$("automatedStationDetails").hidden=true;$("classicUnifiedDetails").hidden=false;$("detailStationTitle").textContent=label;$("detailStationSource").textContent="محطة كلاسيكية · أحدث تقرير متاح";renderStations();renderClassicGauges();$("historySection")?.scrollIntoView({behavior:"smooth",block:"start"});};});
      marker.addTo(state.markerLayer);bounds.push([lat,lon]);
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
    const all=row?.measurements?.values||{};
    const metrics=Object.entries(all).map(([key,m])=>({key,...(m||{})})).filter(m=>m.name||m.code||m.key);
    if(!metrics.length){root.innerHTML='<div class="chart-empty">لا توجد أجهزة أو قياسات مسجلة في أحدث سجل لهذه المحطة.</div>';return;}
    const iconFor=name=>{const n=String(name||"").toLowerCase();return /temperature|dew point/.test(n)?"🌡️":/humidity|moisture|wetness/.test(n)?"💧":/wind|gust/.test(n)?"🌬️":/rain|precipitation/.test(n)?"🌧️":/solar|radiation|sunshine|light/.test(n)?"☀️":/pressure|vpd/.test(n)?"🧭":/soil/.test(n)?"🌱":/battery|voltage|panel/.test(n)?"🔋":/sunrise|sunset/.test(n)?"🌅":"📟";};
    const categoryFor=name=>{const n=String(name||"").toLowerCase();return /temperature|dew point|humidity|wind|rain|precipitation|radiation|pressure|cloud|solar/.test(n)?"الأرصاد الجوية":/soil|moisture|leaf|evapotranspiration|et0/.test(n)?"التربة والمياه":/battery|voltage|serial|switch/.test(n)?"حالة الجهاز":/sunrise|sunset|midnight/.test(n)?"بيانات زمنية":"قياسات إضافية";};
    const readValue=m=>{const v=m.values&&typeof m.values==="object"?m.values:{};const k=["last","avg","sum","result","value","time","min","max"].find(x=>v[x]!==null&&v[x]!==undefined);return {key:k||"",value:k?v[k]:null,values:v};};
    const formatValue=(v,m)=>{if(v===null||v===undefined)return "—";const n=String(m.name||"").toLowerCase();if(/sunrise|sunset|midnight/.test(n)&&Number.isFinite(Number(v))){const d=new Date(Number(v)*1000);return d.toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"});}return num(v);};
    const gaugeFor=(m,value)=>{const n=String(m.name||"").toLowerCase(),v=Number(value);if(!Number.isFinite(v)||/sunrise|sunset|midnight|serial/.test(n))return '<div class="digital-gauge gauge-idle"><span>'+iconFor(m.name)+'</span></div>';if(/wind direction|wind dir|wind orientation/.test(n))return '<div class="digital-compass"><span>N</span><i style="--direction:'+v+'deg">▲</i><small>'+Math.round((v%360+360)%360)+'°</small></div>';let max=/humidity|moisture|wetness|cloud/.test(n)?100:/wind/.test(n)?30:/precipitation|rain|evapotranspiration|et0/.test(n)?25:/solar|radiation/.test(n)?1200:/temperature|dew point/.test(n)?50:/vpd/.test(n)?5:/battery|voltage/.test(n)?16:Math.max(Math.abs(v)*1.5,1);const pct=Math.max(0,Math.min(100,Math.abs(v)/max*100));return '<div class="digital-gauge" style="--gauge-pct:'+pct+'%"><div class="gauge-core"><b>'+formatValue(value,m)+'</b><small>'+esc(m.unit&&m.unit!==false?m.unit:"")+'</small></div></div>';};
    root.innerHTML='<div class="device-grid">'+metrics.map(m=>{
      const r=readValue(m),unit=m.unit&&m.unit!==false?m.unit:"",details=Object.entries(r.values).filter(([k,v])=>k!==r.key&&v!==null&&v!==undefined&&typeof v!=="object").map(([k,v])=>'<span class="metric-detail"><small>'+esc(metricLabels[k]||k)+'</small><b>'+formatValue(v,m)+'</b></span>').join("");
      const name=sensorLabel(m.name||m.key),channel=m.channel??"—",code=m.code??m.key??"—";
      return '<details class="device device--dynamic"><summary class="device-summary"><div class="device-head"><span>'+iconFor(m.name||m.key)+'</span>'+esc(name)+'</div><div class="device-category">'+esc(categoryFor(m.name||m.key))+'</div>'+gaugeFor(m,r.value)+'<div class="device-reading">'+formatValue(r.value,m)+' <small>'+esc(unit)+'</small></div><div class="device-condition">'+(r.key?esc(metricLabels[r.key]||r.key):"بيانات الجهاز")+' · اضغط للتفاصيل</div><div class="device-meta">القناة '+esc(channel)+' · الرمز '+esc(code)+'</div></summary><div class="device-expanded">'+(details||'<span class="metric-detail">لا توجد تفاصيل إضافية</span>')+'</div></details>';
    }).join("")+'</div><div class="device-total">أجهزة القياس الرقمية: '+metrics.length.toLocaleString("ar")+' · اضغط على أي جهاز لعرض تفاصيل قراءاته</div>';
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
  function stationSparkline(rows,names,label){
    const pts=rows.map(r=>({t:r.recorded_at,v:metricNumber(r,names,["avg","last","result","value"])})).filter(p=>p.v!==null);
    if(pts.length<2)return '<div class="station-device-empty">لا تتوفر نقاط تاريخية كافية للرسم</div>';
    const w=320,h=82,p=8,lo=Math.min(...pts.map(x=>x.v)),hi=Math.max(...pts.map(x=>x.v)),span=hi-lo||1;
    const xy=pts.map((x,i)=>[p+i*(w-2*p)/(pts.length-1),h-p-(x.v-lo)/span*(h-2*p)]);
    return '<svg class="station-device-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(label)+'"><path d="M'+p+' '+(h-p)+'H'+(w-p)+'" stroke="#294957" fill="none"/><polyline points="'+xy.map(x=>x.join(",")).join(" ")+'" fill="none" stroke="#56d8bb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function renderAllStationDevices(){
    const root=$("allStationDevices");if(!root)return;
    const auto=state.stations.map(s=>({kind:"automated",id:s.station_id,name:stationLabel(s),row:state.latestByStation.get(s.station_id),history:state.networkHistory.filter(r=>r.station_id===s.station_id)}));
    const classic=classicWeatherRows.map(r=>({kind:"classic",id:r.station_name,name:cwName(r),row:r,history:[]}));
    const cards=auto.concat(classic);
    if(!cards.length){root.innerHTML='<div class="station-device-empty">لا توجد محطات متاحة حالياً.</div>';return;}
    root.innerHTML=cards.map(x=>{
      const isClassic=x.kind==="classic",r=x.row;
      const vals=isClassic?[
        ["الحرارة",cwVal(r?.dry_temp),"°م"],["الرطوبة",cwVal(r?.relative_humidity),"%"],["الرياح",cwVal(r?.wind_speed),"م/ث"]
      ]:[
        ["الحرارة",metricNumber(r,["HC Air temperature","Air temperature"]), "°م"],
        ["الرطوبة",metricNumber(r,["HC Relative humidity","Relative humidity"]), "%"],
        ["الرياح",metricNumber(r,["U-sonic wind speed","Wind speed"]),"م/ث"]
      ];
      const metrics=vals.map(v=>'<div class="station-device-metric"><small>'+v[0]+'</small><b>'+(v[1]===null?"—":num(v[1]))+' '+v[2]+'</b></div>').join("");
      const chart=isClassic?'<div class="station-device-empty">المحطة الكلاسيكية تعرض أحدث تقرير فقط؛ لا يتوفر سجل زمني في مصدرها الحالي.</div>':'<div class="station-trends"><div><small>الحرارة</small>'+stationSparkline(x.history,["HC Air temperature","Air temperature"],"اتجاه درجة الحرارة")+'</div><div><small>الرطوبة</small>'+stationSparkline(x.history,["HC Relative humidity","Relative humidity"],"اتجاه الرطوبة")+'</div><div><small>الرياح</small>'+stationSparkline(x.history,["U-sonic wind speed","Wind speed"],"اتجاه سرعة الرياح")+'</div></div>';
      const stamp=isClassic?(r?.submission_date||"—")+" · "+(r?.utc_time||"—")+" UTC":fmt(r?.recorded_at);
      const selected=isClassic?classicSelected===x.id:state.selected===x.id;
      return '<article class="station-device-card" data-selected="'+selected+'"><div class="station-device-top"><b>'+esc(x.name)+'</b><small>'+(isClassic?"محطة كلاسيكية":"FieldClimate")+'</small></div><div class="station-device-metrics">'+metrics+'</div>'+chart+'<div class="station-device-actions"><small>'+esc(stamp)+'</small><button type="button" data-device-kind="'+x.kind+'" data-device-id="'+esc(encodeURIComponent(x.id))+'">فتح الجهاز</button></div></article>';
    }).join("");
    root.querySelectorAll("button[data-device-kind]").forEach(b=>b.onclick=()=>{
      const id=decodeURIComponent(b.dataset.deviceId);
      if(b.dataset.deviceKind==="classic"){
        classicSelected=id;state.selected="";$("automatedStationDetails").hidden=true;$("classicUnifiedDetails").hidden=false;
        $("detailStationTitle").textContent=cwName(classicWeatherRows.find(x=>x.station_name===id)||{station_name:id});
        $("detailStationSource").textContent="محطة كلاسيكية · أحدث تقرير متاح";renderStations();renderClassicGauges();
      }else selectStation(id,true);
      $("historySection")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
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
      renderReadings();renderAllStationDevices();
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
      renderStations();renderMap();renderTemperatureComparison();
      const since=new Date(Date.now()-24*60*60*1000).toISOString();
      try{state.networkHistory=await query("fieldclimate_public_readings",{select:"station_id,recorded_at,group_name,measurements",recorded_at:"gte."+since,order:"recorded_at.asc",limit:"10000"});}catch(_){state.networkHistory=[];}
      await loadReadings();await loadClassicWeather();renderAllStationDevices();status("متصل · بيانات FieldClimate والتقارير الكلاسيكية جاهزة","ok");
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
  const classicFieldInfo={
    dry_temp:["درجة الحرارة الجافة","🌡️","°م",50],wet_temp:["درجة الحرارة الرطبة","🌡️","°م",45],min_temperature:["الصغرى اليومية","❄️","°م",45],max_temperature:["العظمى اليومية","🔥","°م",55],
    dew_point:["درجة نقطة الندى","🌫️","°م",40],relative_humidity:["الرطوبة النسبية","💧","%",100],station_pressure:["الضغط الجوي للمحطة","🧭","hPa",1100],sea_level_pressure:["الضغط عند سطح البحر","🧭","hPa",1100],vapor_pressure:["ضغط البخار","💧","hPa",60],vapor_pressure_diff:["عجز ضغط البخار","💧","hPa",10],
    wind_speed:["سرعة الرياح","🌬️","م/ث",40],avg_wind_speed:["متوسط سرعة الرياح","🌬️","م/ث",40],wind_direction:["اتجاه الرياح","🧭","°",360],avg_wind_direction:["متوسط اتجاه الرياح","🧭","°",360],
    visibility:["مدى الرؤية","👁️","كم",50],total_cloud_cover:["الغطاء السحابي","☁️","أثمان",8],cloud1_amount:["كمية السحب – الطبقة 1","☁️","أثمان",8],cloud2_amount:["كمية السحب – الطبقة 2","☁️","أثمان",8],cloud3_amount:["كمية السحب – الطبقة 3","☁️","أثمان",8],cloud4_amount:["كمية السحب – الطبقة 4","☁️","أثمان",8],
    cloud1_height:["ارتفاع السحب – الطبقة 1","☁️","م",12000],cloud2_height:["ارتفاع السحب – الطبقة 2","☁️","م",12000],cloud3_height:["ارتفاع السحب – الطبقة 3","☁️","م",12000],
    precipitation_amount:["كمية الهطول","🌧️","مم",100],cover12:["تغطية السحب 1–2","☁️","",100],cover123:["تغطية السحب 1–2–3","☁️","",100],
    pressure_slope:["ميل الضغط","📈","",10],pressure_shape:["شكل تغير الضغط","📈","",10]
  };
  function renderClassicGauges(){
    const r=classicWeatherRows.find(x=>x.station_name===classicSelected),root=$("classicWeatherGauges");
    if(!r){root.innerHTML='<div class="empty">لا توجد قراءة حديثة للمحطة المختارة.</div>';return;}
    $("classicWeatherStamp").textContent="آخر تحديث: "+(r.submission_date||"—")+" · "+(r.utc_time||"—")+" UTC";
    const ignored=new Set(["id","station_name","submission_date","submission_time","local_time","utc_time","report_type","status","station_latitude","station_longitude","latitude","longitude","station_altitude","created_at","updated_at","user_id","user_email","user_name","user_role","report_id","observer_notes"]);
    const fields=Object.entries(r).filter(([k,v])=>!ignored.has(k)&&v!==null&&v!==undefined&&String(v).trim()!==""&&String(v).trim()!=="—");
    const iconFor=(key)=>classicFieldInfo[key]?.[1]||(/weather|sky|cloud/.test(key)?"☁️":/pressure/.test(key)?"🧭":/wind/.test(key)?"🌬️":/temp/.test(key)?"🌡️":"📟");
    const cards=fields.map(([key,raw])=>{
      const info=classicFieldInfo[key]||[key.replaceAll("_"," "),iconFor(key),"",100],label=info[0],unit=info[2],max=info[3]||100;
      const value=cwVal(raw),isDirection=/direction/.test(key),isNumeric=value!==null;
      let face;
      if(isDirection&&isNumeric){face='<div class="digital-compass"><span>N</span><i style="--direction:'+value+'deg">▲</i><small>'+cwFmt((value%360+360)%360,0)+'°</small></div>';}
      else if(isNumeric){const pct=Math.max(0,Math.min(100,Math.abs(value)/max*100));face='<div class="digital-gauge" style="--gauge-pct:'+pct+'%"><div class="gauge-core"><b>'+cwFmt(value,3)+'</b><small>'+esc(unit)+'</small></div></div>';}
      else {face='<div class="classic-text-face"><span>'+iconFor(key)+'</span><b>'+esc(raw)+'</b></div>';}
      const description=isNumeric?(Math.round(Math.max(0,Math.min(100,Math.abs(value)/max*100)))+'% من نطاق المؤشر'):"قراءة وصفية من التقرير";
      return '<details class="device device--dynamic classic-device"><summary class="device-summary"><div class="device-head"><span>'+iconFor(key)+'</span>'+esc(label)+'</div><div class="device-category">محطة كلاسيكية · '+esc(key)+'</div>'+face+'<div class="device-reading">'+(isNumeric?cwFmt(value,3):esc(raw))+' <small>'+esc(unit)+'</small></div><div class="device-condition">'+description+' · اضغط للتفاصيل</div></summary><div class="device-expanded"><span class="metric-detail"><small>اسم الحقل</small><b>'+esc(key)+'</b></span><span class="metric-detail"><small>القيمة الأصلية</small><b>'+esc(raw)+'</b></span></div></details>';
    }).join("");
    root.innerHTML=cards?'<div class="device-grid">'+cards+'</div><div class="device-total">عدد القياسات والحقول المتاحة في أحدث تقرير: '+fields.length.toLocaleString("ar")+' · تشمل القيم الرقمية والوصفية</div>':'<div class="empty">لا توجد قياسات متاحة في التقرير الأخير.</div>';
  }
  function renderClassicLatestCharts(){
    const defs=[["dry_temp","الحرارة الجافة","°م"],["wet_temp","الحرارة الرطبة","°م"],["relative_humidity","الرطوبة النسبية","%"],["dew_point","نقطة الندى","°م"],["wind_speed","سرعة الرياح","م/ث"],["total_cloud_cover","الغطاء السحابي","أثمان"]];
    $("classicLatestCharts").innerHTML=defs.map(([key,title,unit])=>{const vals=classicWeatherRows.map(r=>({name:cwName(r),v:cwVal(r[key])})).filter(x=>x.v!==null);const max=Math.max(1,...vals.map(x=>Math.abs(x.v)));return '<div class="latest-chart"><h4>'+title+' · '+unit+'</h4><div class="latest-bars">'+(vals.length?vals.sort((a,b)=>b.v-a.v).map(x=>'<div class="latest-bar-row"><span class="station-label" title="'+esc(x.name)+'">'+esc(x.name)+'</span><span class="bar-bg"><i style="width:'+Math.max(2,Math.abs(x.v)/max*100)+'%"></i></span><b>'+cwFmt(x.v)+'</b></div>').join(""):'<div class="muted">لا توجد قيم متاحة</div>')+'</div></div>';}).join("");
  }
  async function loadClassicWeather(){
    const rows=await query("classic_public_hourly_latest_all",{select:"*",order:"station_name.asc",limit:"200"});
    classicWeatherRows=rows;
    if(!rows.some(r=>r.station_name===classicSelected))classicSelected=rows[0]?.station_name||"";
    renderClassicGauges();renderClassicLatestCharts();renderStations();renderMap();renderAllStationDevices();
  }

  $("refresh").onclick=load;$("search").oninput=renderStations;load();
})();