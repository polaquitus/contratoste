function ymOf(v){
  if(!v)return '';
  if(/^\d{4}-\d{2}$/.test(v))return v;
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v.slice(0,7);
  return '';
}
function nextYm(ym){
  if(!ym)return '';
  var p=ym.split('-').map(Number); var d=new Date(p[0],p[1]-1,1); d.setMonth(d.getMonth()+1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function compareYm(a,b){return String(a||'').localeCompare(String(b||''));}
function formatYmLabel(ym){
  if(!ym)return '—';
  try{var p=ym.split('-');return new Date(+p[0],+p[1]-1,1).toLocaleDateString('es-AR',{month:'short',year:'numeric'});}catch(e){return ym;}
}
function getContractMonths(contract){
  if(!contract)return 0;
  var m=parseInt(contract.plazo_meses||0,10);
  if(m>0)return m;
  if(contract.fechaIni&&contract.fechaFin)return monthDiffInclusive(contract.fechaIni,contract.fechaFin);
  if(contract.plazo){
    var p=parseInt(contract.plazo,10);
    if(p>0&&p<240)return p;
    if(p>240)return Math.max(Math.round(p/30.4),1);
  }
  return 0;
}
function getIndicatorSnapshots(code){
  function labelToIdxId(label){
    var map={
      'PP':'mo_pp','UOCRA':'mo_uocra','COMERCIO':'mo_com','CAMIONEROS':'mo_cam',
      'UOM RAMA N°10':'mo_uom10','UOM RAMA N°17':'mo_uom17',
      'USD DIVISA':'usd_div','FADEAAC':'fadeaac',
      'GAS OIL G3 YPF NQN':'go_g3',
      'IPIM GRAL':'ipim_gral','IPC PATAGONIA':'ipc_pat','IPC NAC GRAL':'ipc_nac',
      'IPC NQN GRAL':'ipc_nqn','IPC NQN ALIM':'ipc_nqnab','IPC GBA GRAL':'ipc_gba','IPIM R29':'ipim_r29'
    };
    return map[String(label||'').trim()] || '';
  }
  
  function seedSnapshotsFromIdxStore(inputCode){
    try{
      // Normalizar: intentar primero como código directo (ej: 'usd_div')
      var idxId = inputCode;
      
      // Si no existe en IDX_STORE, intentar convertir de label a código (ej: 'USD DIVISA' -> 'usd_div')
      if(!IDX_STORE[idxId]){
        var converted = labelToIdxId(inputCode);
        if(converted && IDX_STORE[converted]){
          idxId = converted;
        }
      }
      
      // Si aún no existe, salir
      if(!idxId || typeof IDX_STORE==='undefined' || !IDX_STORE[idxId]) return;
      
      // IMPORTANTE: Usar siempre el código interno (idxId) como indicator_code, NO el inputCode
      var normalizedCode = idxId;
      
      // NUEVA ESTRUCTURA: Leer de IDX_STORE[idxId].rows (array de objetos)
      var rows = IDX_STORE[idxId].rows;
      if(!Array.isArray(rows)) return;
      
      var snaps = JSON.parse(localStorage.getItem('indicator_snapshots')||'[]');
      var changed = false;
      
      rows.forEach(function(r){
        if(!r || !r.ym) return;
        var snapDate = r.ym + '-01';
        var exists = snaps.find(function(s){ return s.indicator_code===normalizedCode && s.snapshot_date===snapDate; });
        
        if(!exists){
          snaps.push({
            indicator_code: normalizedCode,  // SIEMPRE usar código interno
            snapshot_date: snapDate,
            pct: r.pct!=null ? Number(r.pct) : null,
            value: r.value!=null ? Number(r.value) : null,
            series_value: r.seriesValue!=null ? Number(r.seriesValue) : (r.value!=null ? Number(r.value) : null),
            source: 'IDX_STORE',
            confirmed: !!r.confirmed,
            note: r.note || ''
          });
          changed = true;
        }
      });
      
      if(changed){
        snaps.sort(function(a,b){ return String(a.snapshot_date).localeCompare(String(b.snapshot_date)); });
        localStorage.setItem('indicator_snapshots', JSON.stringify(snaps));
      }
    }catch(e){ 
      console.warn('seedSnapshotsFromIdxStore error for', inputCode, e); 
    }
  }
  
  // Normalizar el código de entrada
  var normalizedCode = code;
  if(!IDX_STORE[code]){
    var converted = labelToIdxId(code);
    if(converted && IDX_STORE[converted]){
      normalizedCode = converted;
    }
  }
  
  var snaps=JSON.parse(localStorage.getItem('indicator_snapshots')||'[]');
  var filtered = snaps.filter(function(s){return s.indicator_code===normalizedCode;}).sort(function(a,b){return String(a.snapshot_date).localeCompare(String(b.snapshot_date));});
  
  if(!filtered.length){
    seedSnapshotsFromIdxStore(code);
    snaps=JSON.parse(localStorage.getItem('indicator_snapshots')||'[]');
    filtered = snaps.filter(function(s){return s.indicator_code===normalizedCode;}).sort(function(a,b){return String(a.snapshot_date).localeCompare(String(b.snapshot_date));});
  }
  
  return filtered;
}
function computeAccumulatedVariationPct(code, baseMonth, evalMonth){
  var fromYm=ymOf(baseMonth), toYm=ymOf(evalMonth);
  if(!code||!fromYm||!toYm||compareYm(toYm,fromYm)<=0)return null;
  var snaps=getIndicatorSnapshots(code);
  if(!snaps.length)return null;
  var monthly=snaps.filter(function(s){ var ym=ymOf(s.snapshot_date); return ym && compareYm(ym,fromYm)>0 && compareYm(ym,toYm)<=0; });
  if(monthly.length){
    var usePct=true;
    monthly.forEach(function(s){ var v=Number(s.pct!=null?s.pct:s.value); if(!isFinite(v)||Math.abs(v)>200)usePct=false; });
    if(usePct){
      var acc=1;
      monthly.forEach(function(s){ var v=Number(s.pct!=null?s.pct:s.value)||0; acc*=1+(v/100); });
      return {pct:(acc-1)*100, mode:'compound', rows:monthly};
    }
  }
  var baseSnap=snaps.filter(function(s){ var ym=ymOf(s.snapshot_date); return ym && compareYm(ym,fromYm)<=0; }).sort(function(a,b){return String(b.snapshot_date).localeCompare(String(a.snapshot_date));})[0];
  var evalSnap=snaps.filter(function(s){ var ym=ymOf(s.snapshot_date); return ym && compareYm(ym,toYm)<=0; }).sort(function(a,b){return String(b.snapshot_date).localeCompare(String(a.snapshot_date));})[0];
  if(baseSnap&&evalSnap){
    var baseV=Number(baseSnap.series_value!=null?baseSnap.series_value:baseSnap.value);
    var evalV=Number(evalSnap.series_value!=null?evalSnap.series_value:evalSnap.value);
    if(isFinite(baseV)&&isFinite(evalV)&&baseV>0&&evalV>0){ return {pct:((evalV/baseV)-1)*100, mode:'ratio', rows:[baseSnap,evalSnap]}; }
  }
  return null;
}
function findFirstMonthMeetingThreshold(code, baseMonth, lastEvalMonth, threshold){
  var fromYm=ymOf(baseMonth), toYm=ymOf(lastEvalMonth);
  if(!code||!fromYm||!toYm||compareYm(toYm,fromYm)<=0)return null;
  var cursor=nextYm(fromYm);
  while(cursor && compareYm(cursor,toYm)<=0){
    var r=computeAccumulatedVariationPct(code, fromYm, cursor);
    if(r && isFinite(r.pct) && r.pct>=threshold) return {ym:cursor,pct:r.pct};
    cursor=nextYm(cursor);
  }
  return null;
}

function _navAct(mod){
  document.querySelectorAll('.sb-nav .nv').forEach(function(n){ n.classList.remove('act'); });
  var el=document.querySelector('.sb-nav .nv[data-mod="'+mod+'"]');
  if(el) el.classList.add('act');
}
function go(v){
  ['vList','vForm','vDet','vMe2n','vMe2nDet','vIdx','vLicit','vProv','vTimeline','vAlertas','vDashboard','vForecast'].forEach(id=>document.getElementById(id).classList.remove('on'));
  const t=document.getElementById('pgT'),a=document.getElementById('pgA');
  if(v==='dashboard'){
    document.getElementById('vDashboard').classList.add('on');
    _navAct('dashboard');
    t.innerHTML='📊 Dashboard Ejecutivo';
    a.innerHTML=`<button class="btn btn-s" onclick="go('list')">← Contratos</button>`;
    renderDashboard();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  else if(v==='list'){
    document.getElementById('vList').classList.add('on');
    _navAct('list');
    t.innerHTML='📋 Contratos <span class="bc" id="buildTag">v86-redesign</span>';
    a.innerHTML=`<div style="position:relative;width:100%;max-width:400px;">
      <input 
        type="text" 
        id="fuzzy-search-input" 
        placeholder="🔍 Buscar contratos... (presiona /)" 
        style="padding-left:12px;width:100%;font-size:13px;" 
        oninput="window.handleFuzzySearch(this.value)"
      >
      <div id="fuzzy-results" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--w);border-radius:var(--rad);box-shadow:var(--shm);max-height:400px;overflow-y:auto;z-index:999;border:1px solid var(--g200);"></div>
    </div>
    <button class="btn btn-a btn-sm" onclick="window.openKoCalculator()">🧮 Calculadora Ko</button>
    <button class="btn btn-p" onclick="go('form')">➕ Nuevo</button>`;
    editId=null;
    resetForm();
    setRoleBadge();
    setSBStatus(SB_OK);
    
    // Re-init fuzzy search para actualizar cache
    if (typeof window.initFuzzySearch === 'function') {
      window.initFuzzySearch();
    }
  }
  else if(v==='alertas'){
    document.getElementById('vAlertas').classList.add('on');
    _navAct('alertas');
    t.innerHTML='🔔 Alertas del Sistema';
    a.innerHTML=`<button class="btn btn-s" onclick="go('list')">← Volver a Lista</button>`;
    loadAlertConfig();
    renderAlertas();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  else if(v==='timeline'){
    document.getElementById('vTimeline').classList.add('on');
    _navAct('timeline');
    t.innerHTML='📅 Timeline de Contratos';
    a.innerHTML=`<button class="btn btn-s" onclick="go('list')">← Volver a Lista</button>`;
    renderTimeline();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  else if(v==='form'){
    document.getElementById('vForm').classList.add('on');
    _navAct('form');
    t.innerHTML=(editId?'✏️ Editar':'➕ Nuevo')+' Contrato';
    a.innerHTML=`<button class="btn btn-s" onclick="go('list')">← Volver</button>`;
    populateProvSelect();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  else if(v==='detail'){
    document.getElementById('vDet').classList.add('on');
    _navAct('list');
    t.innerHTML='📄 Detalle';
    a.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-s" onclick="go('list')">← Lista</button><button class="btn btn-a btn-sm" onclick="openKoCalculator()">🧮 Calc Ko</button><button class="btn btn-p btn-sm" onclick="openDossier()">📘 Dossier HTML</button><button class="btn btn-p btn-sm" onclick="exportDossierXls()">📊 Dossier XLS</button><button class="btn btn-s btn-sm" onclick="openPriceListImportPicker()">🤖 Importar Listas IA</button></div>`;
    renderDet();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  else if(v==='me2n'){
    document.getElementById('vMe2n').classList.add('on');
    _navAct('me2n');
    t.innerHTML='🛒 Purchase Orders (ME2N)';
    a.innerHTML='';
    renderMe2n();
    buildPlantFilter();
  }
  else if(v==='idx'){
    document.getElementById('vIdx').classList.add('on');
    _navAct('idx');
    t.innerHTML='📊 Master de Índices';
    a.innerHTML=`<div style="display:flex;gap:8px"><button class="btn btn-s btn-sm" onclick="runAllIdxUpdates()">🔄 Actualizar todos</button><button class="btn btn-p btn-sm" onclick="showNewIdxModal()">➕ Cargar período</button><button class="btn btn-s btn-sm" style="background:var(--p100);color:var(--p700)" onclick="consolidateIdxRows()">🗜️ Consolidar BD</button><button class="btn btn-d btn-sm" onclick="resetIdxAll()">🧹 Reset</button></div>`;
    renderIdxView();
    initIdxChartSection();
  }
  else if(v==='licit'){
    document.getElementById('vLicit').classList.add('on');
    _navAct('licit');
    t.innerHTML='📋 Licitaciones';
    a.innerHTML=`<button class="btn btn-p btn-sm" onclick="openLicitModal(null)">➕ Nueva Licitación</button>`;
    renderLicit();
  }
  else if(v==='prov'){
    document.getElementById('vProv').classList.add('on');
    _navAct('prov');
    t.innerHTML='🏢 Proveedores';
    a.innerHTML=`<div style="display:flex;gap:8px"><button class="btn btn-s btn-sm" onclick="importProvModal()">📤 Importar SAP</button><button class="btn btn-s btn-sm" onclick="loadProv().then(function(){renderProv();toast(PROV_DB.length+' proveedores','ok');}).catch(function(e){toast('Error: '+e.message,'er');})">🔄 Recargar</button><button class="btn btn-p btn-sm" onclick="openProvModal(null)">➕ Nuevo Proveedor</button></div>`;
    loadProv().then(function(){renderProv();}).catch(function(){renderProv();});
  }
  else if(v==='me2ndet'){
    document.getElementById('vMe2nDet').classList.add('on');
    _navAct('me2n');
    t.innerHTML='🛒 Detalle PO por Contrato';
    a.innerHTML=`<button class="btn btn-s" onclick="go('me2n')">← Volver a ME2N</button>`;
    renderMe2nDet();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  else if(v==='forecast'){
    document.getElementById('vForecast').classList.add('on');
    _navAct('forecast');
    t.innerHTML='📈 Proyección Predictiva de Costos';
    a.innerHTML=`<button class="btn btn-p btn-sm" onclick="renderForecast()">🔄 Recalcular</button>`;
    renderForecast();
  }
}

// POLY
function buildPoly(){
  let h='';for(let i=1;i<=5;i++){let o='<option value="">— Sin asignar —</option>';for(const[c,its]of Object.entries(IDX)){o+=`<optgroup label="${c}">`;its.forEach(it=>o+=`<option value="${it}">${it}</option>`);o+='</optgroup>';}
  h+=`<div class="poly-row"><div class="pn">${i}</div><div class="fgrp"><label>Índice ${i}</label><select id="p_i${i}" onchange="calcP()">${o}</select></div><div class="fgrp"><label>Incidencia</label><input type="number" id="p_n${i}" placeholder="0.00" step="0.01" min="0" max="1" oninput="calcP()"></div><div class="fgrp"><label>Base</label><input type="month" id="p_b${i}"></div></div>`;}
  document.getElementById('polyBox').innerHTML=h;
}
function calcP(){let s=0;for(let i=1;i<=5;i++)s+=parseFloat(document.getElementById('p_n'+i).value)||0;const e=document.getElementById('psVal');e.textContent=s.toFixed(2);const ok=Math.abs(s-1)<.005;e.className='ps-v mono '+(ok?'ok':'bad');document.getElementById('psNote').textContent=ok?'✓ OK':'(debe sumar 1.00)';}
function getPoly(){let a=[];for(let i=1;i<=5;i++)a.push({idx:document.getElementById('p_i'+i).value,inc:parseFloat(document.getElementById('p_n'+i).value)||0,base:document.getElementById('p_b'+i).value||''});return a;}
function setPoly(a){if(!a)return;a.forEach((p,i)=>{if(i<5){document.getElementById('p_i'+(i+1)).value=p.idx||'';document.getElementById('p_n'+(i+1)).value=p.inc||'';document.getElementById('p_b'+(i+1)).value=p.base||'';}});calcP();}

function onContrCh(){const v=gv('f_tcontr');document.getElementById('secRfq').classList.toggle('vis',v==='RFQ MAIL'||v==='RFQ ARIBA');document.getElementById('secAr').classList.toggle('vis',v==='RFQ ARIBA');}
function handleFiles(fl){for(const f of fl){if(files.length>=10)return;const r=new FileReader();r.onload=e=>{files.push({name:f.name,size:f.size,data:e.target.result});renderFL()};r.readAsDataURL(f);}}
function rmFile(i){files.splice(i,1);renderFL();}
function renderFL(){document.getElementById('fList').innerHTML=files.map((f,i)=>`<div class="fli"><span>📄</span><span class="fn">${f.name}</span><span class="fs">${(f.size/1024).toFixed(0)}KB</span><button class="fd" onclick="rmFile(${i})">✕</button></div>`).join('');}
function gv(id){return(document.getElementById(id).value||'').trim();}

// SAVE
async function guardar(){
  document.querySelectorAll('.err').forEach(e=>e.classList.remove('err'));
  // Remove any existing error banner
  document.getElementById('formErrBanner')?.remove();
  const R=[
    ['f_num','N° de Contrato'],['f_cont','Contratista'],['f_tipo','Tipo de Contrato'],
    ['f_mon','Moneda'],['f_monto','Monto Inicial'],['f_ini','Fecha Inicio'],
    ['f_fin','Fecha Fin'],['f_resp','Responsable'],['f_btar','Base Tarifas (mes/año)'],
    ['f_det','Detalle del Servicio'],['f_tcontr','Tipo de Contratación'],
    ['f_rtec','Responsable Técnico'],['f_tc','Tipo de Cambio'],['f_cprov','Contacto Proveedor']
  ];
  let er=[];
  for(const[id,l]of R){
    const e=document.getElementById(id);
    if(!e){er.push(l+' (campo no encontrado)');continue;}
    if(!e.value||!e.value.toString().trim()){e.classList.add('err');er.push(l);}
  }
  if(gv('f_tcontr')==='RFQ ARIBA'&&!gv('f_ariba')){document.getElementById('f_ariba').classList.add('err');er.push('ID Ariba');}
  if(gv('f_ini')&&gv('f_fin')&&new Date(gv('f_fin'))<new Date(gv('f_ini'))){document.getElementById('f_fin').classList.add('err');er.push('Fecha Fin anterior a Inicio');}
  if(!editId&&gv('f_num')&&window.DB.find(c=>c.num===gv('f_num'))){document.getElementById('f_num').classList.add('err');er.push('N° de contrato ya existe');}
  if(er.length){
    // Show persistent error banner at top of form
    const banner=document.createElement('div');
    banner.id='formErrBanner';
    banner.style.cssText='background:#fde8ea;border:1.5px solid #dc3545;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#dc3545;line-height:1.6';
    banner.innerHTML='<strong>⚠️ Campos requeridos incompletos:</strong><br>'
      +er.map(e=>'• '+e).join('<br>');
    const card=document.getElementById('cForm');
    if(card)card.insertBefore(banner,card.firstChild);
    banner.scrollIntoView({behavior:'smooth',block:'start'});
    toast('Completá los campos requeridos','er');
    return;
  }

  const old=editId?window.DB.find(x=>x.id===editId):null;
  const c={
    ...(old||{}),
    id:editId||Date.now().toString(36)+Math.random().toString(36).substr(2,5),
    num:gv('f_num'),cont:gv('f_cont'),tipo:gv('f_tipo'),mon:gv('f_mon'),
    monto:parseFloat(gv('f_monto'))||0,fechaIni:gv('f_ini'),fechaFin:gv('f_fin'),
    resp:gv('f_resp'),btar:gv('f_btar'),det:gv('f_det'),
    plazo:parseInt(document.getElementById('f_plazo').value)||0,
    poly:getPoly(),
    tcontr:gv('f_tcontr'),cc:gv('f_cc')||null,cof:gv('f_cof')||null,oferentes:gv('f_of')||null,
    ariba:gv('f_ariba')||null,fev:gv('f_fev')||null,
    dd:gv('f_dd')||null,pr:gv('f_pr')||null,
    sq:gv('f_sq')||null,dg:document.getElementById('f_dg').checked,
    rtec:gv('f_rtec'),tc:parseFloat(gv('f_tc'))||1,own:gv('f_own')||null,asset:gv('f_asset')||null,
    cprov:gv('f_cprov'),vend:gv('f_vend')||null,fax:gv('f_fax')||null,
    adj:files.map(f=>({name:f.name,size:f.size,data:f.data})),
    com:gv('f_com')||null,
    // Anticipo (solo para OBRA)
    anticipoPct:gv('f_tipo')==='OBRA'?(parseFloat(gv('f_anticipoPct'))||0):0,
    anticipo:gv('f_tipo')==='OBRA'?(parseFloat(gv('f_anticipoMonto'))||0):0,
    // Redeterminacion
    hasPoly:document.getElementById('f_hasPoly').checked,
    trigA:document.getElementById('f_trigA').checked,
    trigB:document.getElementById('f_trigB').checked,
    trigBpct:parseFloat(gv('f_trigBpct'))||null,
    trigC:document.getElementById('f_trigC').checked,
    trigCmes:parseInt(gv('f_trigCmes'))||null,
    // Tarifario / historiales: preservar siempre lo existente si el formulario no los edita
    tarifarios:old?.tarifarios||[],
    enmiendas:old?.enmiendas||[],
    aves:old?.aves||[],
    createdAt:old?.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  
  // Guardar monto base original si no existe (primera vez)
  if(!old || !old.montoBase){
    c.montoBase = c.monto;
    console.log('[saveCont] Guardando monto base original:', c.montoBase.toFixed(2));
  } else {
    c.montoBase = old.montoBase; // Preservar el monto base original
  }
  
  // Si el monto fue editado manualmente Y no hay AVEs, actualizar montoBase
  if(old && old.monto !== c.monto && (!c.aves || c.aves.length === 0)){
    c.montoBase = c.monto;
    console.log('[saveCont] Monto editado sin AVEs. Actualizando montoBase a:', c.monto.toFixed(2));
  }
  
  c.plazo_meses = monthDiffInclusive(c.fechaIni,c.fechaFin);
  c.gatillos = {
    A:{ enabled: !!c.trigA },
    B:{ enabled: !!c.trigB, threshold: Number(c.trigBpct)||0 },
    C:{ enabled: !!c.trigC, months: Number(c.trigCmes)||0 }
  };
  if(editId){const i=window.DB.findIndex(x=>x.id===editId);if(i!==-1)window.DB[i]=c;editId=null;toast('Actualizado','ok');}
  else{window.DB.push(c);toast('Contrato creado','ok');}
  try{
    if(c.trigB||c.trigC){
      PolUpdate.saveConditions(c.id,{
        enabled:true,
        moThreshold:0,
        allComponentsThreshold:c.trigB?(Number(c.trigBpct)||0):0,
        monthsElapsed:c.trigC?(parseInt(c.trigCmes,10)||0):0,
        baseDate:(c.btar?c.btar+'-01':c.fechaIni),
        lastUpdateDate:null,
        resetBase:false
      });
    } else {
      localStorage.removeItem('pol_cond_'+c.id);
    }
  }catch(_e){ console.error('PolUpdate saveConditions error',_e); }
  try{
    await sbUpsertItem('contratos',c);
  }catch(e){
    toast('Error al guardar: '+e.message,'er');
    console.error('guardar() save error:',e);
    return;
  }
  resetForm();renderList();updNav();go('list');
  
  // Actualizar fuzzy search cache
  if (typeof window.initFuzzySearch === 'function') {
    window.initFuzzySearch();
  }
}

function resetForm(){
  document.getElementById('formErrBanner')?.remove();
  ['f_num','f_cont','f_tipo','f_mon','f_monto','f_ini','f_fin','f_resp','f_btar','f_det','f_tcontr','f_cc','f_cof','f_of','f_ariba','f_fev','f_rtec','f_tc','f_own','f_asset','f_cprov','f_vend','f_fax','f_com','f_trigBpct','f_trigCmes','f_dd','f_pr','f_sq'].forEach(id=>{const e=document.getElementById(id);if(e&&!e.disabled)e.value='';});
  const plazoEl=document.getElementById('f_plazo');if(plazoEl)plazoEl.value='';
  document.querySelectorAll('.err').forEach(e=>e.classList.remove('err'));
  ['secRfq','secAr'].forEach(id=>document.getElementById(id).classList.remove('vis'));
  document.getElementById('f_dg').checked=false;document.getElementById('l_dg').textContent='No';
  // Redet
  document.getElementById('f_hasPoly').checked=false;document.getElementById('l_hasPoly').textContent='No';document.getElementById('polyWrap').style.display='none';
  document.getElementById('f_trigA').checked=false;document.getElementById('l_trigA').textContent='No';
  document.getElementById('f_trigB').checked=false;document.getElementById('l_trigB').textContent='No';document.getElementById('trigB_pct').style.display='none';
  document.getElementById('f_trigC').checked=false;document.getElementById('l_trigC').textContent='No';document.getElementById('trigC_mes').style.display='none';
  buildPoly();files=[];renderFL();
  populateProvSelect();
}
function populateProvSelect(){
  const sel=document.getElementById('f_cont');
  if(!sel)return;
  sel.innerHTML='<option value="">Seleccionar contratista</option>';
  const sorted=[...PROV_DB].sort((a,b)=>{
    const nameA=(a.name||a.nombre||'').toUpperCase();
    const nameB=(b.name||b.nombre||'').toUpperCase();
    return nameA.localeCompare(nameB);
  });
  sorted.forEach(p=>{
    const opt=document.createElement('option');
    opt.value=p.name||p.nombre||p.id;
    opt.textContent=p.name||p.nombre||'Sin nombre';
    sel.appendChild(opt);
  });
}
function cancelForm(){
  editId=null;
  document.getElementById('formErrBanner')?.remove();
  resetForm();
  go('list');
}

// HELPERS
function dateToMo(d){if(!d)return'';const s=String(d);if(/^\d{4}-\d{2}/.test(s))return s.substring(0,7);try{const dt=new Date(s);return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');}catch(e){return'';}}
function parseYM(ym){if(!ym)return'';const m=/^(\d{4})-(\d{2})/.exec(String(ym));return m?m[0]:'';}
function monthDiff(ym1,ym2){if(!ym1||!ym2)return 0;const[y1,m1]=ym1.split('-').map(Number);const[y2,m2]=ym2.split('-').map(Number);return(y2-y1)*12+(m2-m1);}
function round2(n){return Math.round(n*100)/100;}
function isContractComplete(cc){
  if(!cc.fromSAP)return true;
  return !!(cc.tipo&&cc.resp&&cc.btar&&cc.tcontr&&cc.rtec&&cc.cprov);
}
function getTotal(c){const base=c.montoBase||c.monto||0;return base+(c.aves||[]).reduce((s,a)=>s+(a.monto||0),0);}
function fD(d){if(!d)return'—';const dt=new Date((String(d).length<=10?d+'T00:00:00':d));return dt.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});}
function fDf(d){if(!d)return'—';const dt=new Date((String(d).length<=10?d+'T00:00:00':d));return dt.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});}
function fN(n){if(n==null||n==='')return'—';return Number(n).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function toast(m,t){const e=document.getElementById('toast');e.textContent=(t==='ok'?'✓ ':'✕ ')+m;e.className='toast '+t;setTimeout(()=>e.classList.add('show'),10);setTimeout(()=>e.classList.remove('show'),3200);}

// LIST

function clearContractFilters(){
  var ids=['fSrch','fEst','fAsset','fDom','fResp','fOwn','fComp'];
  ids.forEach(function(id){
    var el=document.getElementById(id);
    if(!el) return;
    el.value='';
  });
  renderList();
}

