const IDX_CATALOG = [
  // ── IPC ──────────────────────────────────────────────────────────
  {id:'ipc_nac',   name:'IPC Nacional (Nivel General)',   cat:'ipc', catLabel:'IPC', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'indec', seriesId:'148.3_INIVELNAL_DICI_M_26', pubDay:14, pubDelay:1},
  {id:'ipc_gba',   name:'IPC GBA (Nivel General)',        cat:'ipc', catLabel:'IPC', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'indec', seriesId:'148.3_INIVELGBA_DICI_M_21', pubDay:14, pubDelay:1},
  {id:'ipc_pat',   name:'IPC Patagonia (Nivel General)',  cat:'ipc', catLabel:'IPC', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'indec', seriesId:'148.3_INIVELNIA_DICI_M_27', pubDay:14, pubDelay:1},
  {id:'ipc_nqn',   name:'IPC NQN (Nivel General)',        cat:'ipc', catLabel:'IPC', src:'DPEyC NQN', srcLink:'https://www.estadisticaneuquen.gob.ar/series/', fetchMode:'manual', pubDay:12, pubDelay:1},
  {id:'ipc_nqnab', name:'IPC NQN (Alim. y Bebidas)',      cat:'ipc', catLabel:'IPC', src:'DPEyC NQN', srcLink:'https://www.estadisticaneuquen.gob.ar/series/', fetchMode:'manual', pubDay:12, pubDelay:1},
  // ── IPIM ─────────────────────────────────────────────────────────
  {id:'ipim_gral', name:'IPIM (Nivel General)',            cat:'ipim',catLabel:'IPIM', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'indec', seriesId:'448.1_NIVEL_GENERAL_0_0_13_46', pubDay:20, pubDelay:1},
  {id:'ipim_r29',  name:'IPIM R29 (Refinados Petróleo)',  cat:'ipim',catLabel:'IPIM', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'manual', pubDay:20, pubDelay:1},
  {id:'fadeaac',   name:'FADEAAC (Equipo Vial)',           cat:'ipim',catLabel:'IPIM', src:'FADEAAC',srcLink:'https://www.fadeaac.org.ar/indice', fetchMode:'manual', pubDay:5, pubDelay:2},
  // ── Combustible ─────────────────────────────────────────────────
{id:'go_g3',     name:'Gas Oil Grado 3 YPF NQN',        cat:'fuel',catLabel:'Combustible', src:'YPF', srcLink:'https://www.ypf.com', fetchMode:'fuel', pubDay:15, pubDelay:1},
  // ── USD / Tipo de Cambio ─────────────────────────────────────────
  {id:'usd_div',   name:'USD DIVISA (TC Vendedor)',        cat:'usd', catLabel:'USD', src:'BCRA/BNA', srcLink:'https://www.bcra.gob.ar/PublicacionesEstadisticas/Tipos_de_cambio_v2.asp', fetchMode:'usd'},
  // ── Mano de Obra — CCT ──────────────────────────────────────────
  {id:'mo_pp',     name:'Petroleros Privados (SINPEP)',    cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°396/04', src:'RRLL', srcLink:''},
  {id:'mo_pj',     name:'Petroleros Jerárquicos (ASIMRA)', cat:'mo', catLabel:'Mano de Obra', cct:'CCT N°644/12', src:'RRLL', srcLink:''},
  {id:'mo_uocra',  name:'UOCRA (Construcción General)',    cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°76/75',  src:'RRLL', srcLink:''},
  {id:'mo_uocrayac',name:'UOCRA Yacimiento',               cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°1024/16',src:'RRLL', srcLink:''},
  {id:'mo_com',    name:'Comercio (FAECYS)',               cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°130/75', src:'RRLL', srcLink:''},
  {id:'mo_cam',    name:'Camioneros (FCTA)',               cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°40/89',  src:'RRLL', srcLink:''},
  {id:'mo_uom10',  name:'UOM Rama N°10',                   cat:'mo',  catLabel:'Mano de Obra', cct:'UOM R°10',     src:'RRLL', srcLink:''},
  {id:'mo_uom17',  name:'UOM Rama N°17',                   cat:'mo',  catLabel:'Mano de Obra', cct:'UOM R°17',     src:'RRLL', srcLink:''},
];

// ── Paleta por categoría ───────────────────────────────────────────────
const CAT_CSS = {mo:'mo-c',ipc:'ipc-c',ipim:'ipim-c',fuel:'fuel-c',usd:'usd-c'};
const CAT_PILL = {mo:'mo',ipc:'ipc',ipim:'ipim',fuel:'fuel',usd:'usd'};

// ── Storage ────────────────────────────────────────────────────────────
// IDX_STORE = { [idxId]: { rows:[{ym,pct,confirmed,note,files:[{name,data}]}] } }
let IDX_STORE = {};
const IDX_OFFICIAL_SEED = {
  ipc_nac:[
    {ym:'2026-02',pct:2.9,value:null,publishedAt:'2026-03-12',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',note:'IPC Nacional (nivel general) oficial INDEC'},
    {ym:'2026-03',pct:3.4,value:null,publishedAt:'2026-04-14',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/uploads/informesdeprensa/ipc_04_26853171E136.pdf',note:'IPC Nacional (nivel general) oficial INDEC — publicado 14/04/2026'}
  ],
  ipc_gba:[
    {ym:'2026-02',pct:2.6,value:null,publishedAt:'2026-03-12',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',note:'IPC GBA (nivel general) oficial INDEC'},
    {ym:'2026-03',pct:3.4,value:null,publishedAt:'2026-04-14',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/uploads/informesdeprensa/ipc_04_26853171E136.pdf',note:'IPC GBA (nivel general) oficial INDEC — publicado 14/04/2026'}
  ],
  ipc_pat:[
    {ym:'2026-02',pct:3.0,value:null,publishedAt:'2026-03-12',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',note:'IPC Patagonia (nivel general) oficial INDEC'},
    {ym:'2026-03',pct:2.5,value:null,publishedAt:'2026-04-14',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/uploads/informesdeprensa/ipc_04_26853171E136.pdf',note:'IPC Patagonia (nivel general) oficial INDEC — publicado 14/04/2026'}
  ],
  ipc_nqn:[
    {ym:'2026-02',pct:2.5,value:null,publishedAt:'2026-03-12',source:'DPEyC Neuquén',sourceUrl:'https://www.estadisticaneuquen.gob.ar/',note:'IPC Neuquén (nivel general) oficial DPEyC'},
    {ym:'2026-03',pct:3.5,value:null,publishedAt:'2026-04-14',source:'DPEyC Neuquén',sourceUrl:'https://www.estadisticaneuquen.gob.ar/static/archivos/Publicaciones/IPC/inf_IPCmarzo2026.pdf',note:'IPC Neuquén (nivel general) oficial DPEyC — publicado 14/04/2026'}
  ],
  ipim_gral:[
    {ym:'2026-02',pct:1.0,value:14296.33,publishedAt:'2026-03-17',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-32',note:'IPIM nivel general oficial INDEC'},
    {ym:'2026-03',pct:3.4,value:null,publishedAt:'2026-04-16',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/uploads/informesdeprensa/ipm_04_265933E66B1D.pdf',note:'IPIM nivel general oficial INDEC — publicado 16/04/2026'}
  ],
  ipc_nqnab:[
    {ym:'2026-02',pct:3.1,value:null,publishedAt:'2026-03-12',source:'DPEyC Neuquén',sourceUrl:'https://www.estadisticaneuquen.gob.ar/series/',note:'IPC NQN Alimentos y Bebidas — DPEyC Neuquén'},
    {ym:'2026-03',pct:3.0,value:null,publishedAt:'2026-04-14',source:'DPEyC Neuquén',sourceUrl:'https://www.estadisticaneuquen.gob.ar/static/archivos/Publicaciones/IPC/inf_IPCmarzo2026.pdf',note:'IPC NQN Alimentos y Bebidas — DPEyC Neuquén — publicado 14/04/2026'}
  ],
  fadeaac:[
    {ym:'2026-02',pct:2.28,value:null,publishedAt:'2026-03-04',source:'FADEEAC',sourceUrl:'https://www.fadeeac.org.ar/',note:'Índice de costos FADEEAC oficial'},
    {ym:'2026-03',pct:10.15,value:null,publishedAt:'2026-04-01',source:'FADEEAC',sourceUrl:'https://www.fadeeac.org.ar/',note:'Índice de costos FADEEAC oficial'}
  ]
};
function ymCompare(a,b){return String(a||'').localeCompare(String(b||''));}
function idxResolveOfficial(def,targetYm){const rows=(IDX_OFFICIAL_SEED[def.id]||[]).slice().sort((a,b)=>ymCompare(a.ym,b.ym));if(!rows.length)return null;let chosen=null;for(const row of rows){if(ymCompare(row.ym,targetYm)<=0)chosen=row;}if(!chosen)chosen=rows[rows.length-1];return {ym:chosen.ym,pct:chosen.pct!=null?Number(chosen.pct):null,value:chosen.value!=null?Number(chosen.value):null,publishedAt:chosen.publishedAt||null,sourceUrl:chosen.sourceUrl||null,status:chosen.ym===targetYm?'updated':'waiting_release',note:(chosen.note||def.name)+(chosen.ym===targetYm?'':' · último oficial disponible'),source:chosen.source||def.src};}
function idxMergeOfficialSeeds(){
  Object.entries(IDX_OFFICIAL_SEED).forEach(([id,rows])=>{
    // SKIP USD indices - siempre usar datos de Supabase
    if(id === 'usd_div') return;

    (rows||[]).forEach(row=>{
      // Skip rows explicitly deleted by user
      if((IDX_STORE.__deleted?.[id]||[]).includes(row.ym))return;
      const existing=((IDX_STORE[id]||{}).rows||[]).find(r=>r.ym===row.ym);
      if(!existing){
        // Row no existe: agregar desde seed
        idxUpsert(id,{...row,confirmed:false,status:'updated'});
      } else {
        const needsUpdate=(existing.pct==null&&row.pct!=null)||(existing.value==null&&row.value!=null)||String(existing.publishedAt||'')<String(row.publishedAt||'');
        if(needsUpdate){
          // Seed gana para metadata; datos del usuario (pct/value/note) tienen prioridad
          idxUpsert(id,{
            ...row,
            ...existing,
            publishedAt: row.publishedAt||existing.publishedAt,
            sourceUrl: row.sourceUrl||existing.sourceUrl,
            confirmed: existing.confirmed??false,
            status:'updated'
          });
        }
      }
    });
  });
}
function loadIdx(){
  // No-op: IDX_STORE is loaded by initApp() from Supabase.
  // Called only as fallback from within initApp catch block (already handled there).
  idxMergeOfficialSeeds();
}
let _saveIdxBusy=false, _saveIdxPending=false;
async function saveIdx(){
  // Mirror to localStorage immediately (always safe)
  localStorage.setItem('idx_v2', JSON.stringify(IDX_STORE));
  if(!SB_OK) return;
  // Serialize Supabase writes: if a save is in flight, mark pending and return.
  // The in-flight save will do another pass with the latest IDX_STORE data.
  if(_saveIdxBusy){ _saveIdxPending=true; return; }
  _saveIdxBusy=true;
  try{
    await sbUpsertSingle('indices', IDX_STORE);
    // If another save was requested while we were writing, do one more pass
    while(_saveIdxPending){
      _saveIdxPending=false;
      localStorage.setItem('idx_v2', JSON.stringify(IDX_STORE));
      await sbUpsertSingle('indices', IDX_STORE);
    }
  } catch(e){ console.warn('saveIdx SB error', e); }
  finally{ _saveIdxBusy=false; }
}
async function resetIdxAll(){
  if(!confirm('Se van a borrar todos los indicadores cargados manualmente y se reconstruirá la base oficial inicial. ¿Continuar?'))return;
  try{localStorage.removeItem('idx_v2');}catch(_e){}
  IDX_STORE={};
  idxMergeOfficialSeeds();
  await saveIdx();
  _idxSel=null; renderIdxView(); toast('Indicadores reiniciados','ok');
}
async function consolidateIdxRows(){
  if(!SB_OK){toast('Sin conexión a Supabase','er');return;}
  if(!confirm('Se van a fusionar TODAS las filas duplicadas de la tabla indices en una sola, recuperando todos los períodos cargados. ¿Continuar?'))return;
  toast('Consolidando filas…','ok');
  try{
    // 1. Fetch ALL rows from indices table
    const allRows=await sbFetch('indices','GET',null,'?select=id,datos&order=id.asc&limit=500');
    if(!allRows.length){toast('Tabla vacía','er');return;}
    toast(`Procesando ${allRows.length} filas…`,'ok');

    // 2. Merge all rows: union of all periods per index, newest value wins for same ym
    const merged={};
    for(const row of allRows){
      let obj; try{obj=JSON.parse(row.datos);}catch(e){continue;}
      for(const [key,val] of Object.entries(obj)){
        if(key==='__sbId'||key==='__deleted')continue;
        if(!val||!Array.isArray(val.rows))continue;
        if(!merged[key])merged[key]={rows:[]};
        for(const r of val.rows){
          if(!r||!r.ym)continue;
          const existing=merged[key].rows.find(x=>x.ym===r.ym);
          if(!existing)merged[key].rows.push({...r});
          else Object.assign(existing,r); // later rows win (more complete data)
        }
      }
    }
    // Keep __deleted from latest row
    const latest=allRows[allRows.length-1];
    try{const o=JSON.parse(latest.datos);if(o.__deleted)merged.__deleted=o.__deleted;}catch(_e){}

    // Sort rows per index
    for(const key of Object.keys(merged)){
      if(key==='__deleted')continue;
      if(merged[key].rows)merged[key].rows.sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
    }

    // 3. Delete all rows except the last one (reuse its ID)
    const keepId=allRows[allRows.length-1].id;
    const toDelete=allRows.filter(r=>r.id!==keepId);
    toast(`Borrando ${toDelete.length} filas duplicadas…`,'ok');
    for(const r of toDelete){
      await sbFetch('indices','DELETE',null,`?id=eq.${r.id}`);
    }

    // 4. Save merged data to the kept row
    merged.__sbId=keepId;
    IDX_STORE=merged;
    await sbFetch('indices','PATCH',{datos:JSON.stringify(Object.fromEntries(Object.entries(merged).filter(([k])=>k!=='__sbId')))},`?id=eq.${keepId}`);
    localStorage.setItem('idx_v2',JSON.stringify(IDX_STORE));
    idxMergeOfficialSeeds();
    renderIdxView();
    toast(`✅ Consolidado: ${allRows.length} filas → 1 fila (ID ${keepId})`, 'ok');
  }catch(e){
    console.error('consolidateIdxRows',e);
    toast('Error al consolidar: '+e.message,'er');
  }
}
// NOTE: intentional no IIFE here — initApp() loads IDX_STORE from Supabase async.

function idxRows(id){
  if(!IDX_STORE[id]) IDX_STORE[id] = {rows:[]};
  return (IDX_STORE[id]||{}).rows||[];
}
// Igual que idxRows pero NO crea entradas vacías y resuelve labels (ej 'PP' → 'mo_pp')
// Usar en cálculos polinómicos para no envenenar el seed de indicator_snapshots
function safeIdxRows(code){
  var id=code;
  if(!IDX_STORE[id]||(IDX_STORE[id].rows||[]).length===0){
    var _lblMap={'PP':'mo_pp','UOCRA':'mo_uocra','COMERCIO':'mo_com','CAMIONEROS':'mo_cam',
      'UOM RAMA N°10':'mo_uom10','UOM RAMA N°17':'mo_uom17','USD DIVISA':'usd_div',
      'FADEAAC':'fadeaac','GAS OIL G3 YPF NQN':'go_g3','GAS OIL G2 YPF NQN':'go_g2',
      'IPIM GRAL':'ipim_gral','IPC PATAGONIA':'ipc_pat','IPC NAC GRAL':'ipc_nac',
      'IPC NQN GRAL':'ipc_nqn','IPC NQN ALIM':'ipc_nqnab','IPC GBA GRAL':'ipc_gba','IPIM R29':'ipim_r29'};
    var conv=_lblMap[String(code||'').trim()];
    if(conv&&IDX_STORE[conv]&&(IDX_STORE[conv].rows||[]).length) id=conv;
  }
  return (IDX_STORE[id]&&Array.isArray(IDX_STORE[id].rows))?IDX_STORE[id].rows:[];
}
function idxLastRow(id){const r=idxRows(id);return r.length?r[r.length-1]:null;}
function idxTargetYm(){const now=new Date();return new Date(now.getFullYear(),now.getMonth()-1,1).toISOString().substring(0,7);}
function idxPrevYm(ym){const [y,m]=String(ym||'').split('-').map(Number); if(!y||!m)return ''; return new Date(y,m-2,1).toISOString().substring(0,7);}
function idxLastBefore(id, ym){const rows=idxRows(id).filter(r=>String(r.ym||'')<String(ym)).sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));return rows.length?rows[rows.length-1]:null;}
let _idxBatchMode=false; // when true, idxUpsert skips saveIdx (caller must call saveIdx manually)
async function idxUpsert(id,row){
  if(!IDX_STORE[id])IDX_STORE[id]={rows:[]};
  if(!Array.isArray(IDX_STORE[id].rows))IDX_STORE[id].rows=[];
  const rows=IDX_STORE[id].rows;
  const pos=rows.findIndex(r=>r.ym===row.ym);
  const merged={...(pos>=0?rows[pos]:{}),...row};
  if(pos>=0)rows[pos]=merged;else rows.push(merged);
  rows.sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
  if(!_idxBatchMode)await saveIdx();
  return merged;
}
function idxValueLabel(def,row){if(!row)return '—';if(def.cat==='usd')return row.value!=null?fN(row.value):'—';return pctStr(row.pct);}
function idxStatusText(id){const target=idxTargetYm();const def=IDX_CATALOG.find(d=>d.id===id);const exact=idxRows(id).find(r=>r.ym===target);if(exact)return exact.status==='fallback'?'Fallback '+formatMonth(exact.ym):'Actualizado '+formatMonth(exact.ym);if(def){const official=idxResolveOfficial(def,target);if(official&&official.ym)return 'Último oficial '+formatMonth(official.ym);}const prev=idxLastBefore(id,target);return prev?('Último disponible '+formatMonth(prev.ym)):'Sin ejecutar';}
function idxMonthToText(ym){return ym?formatMonth(ym):'—';}
// Last business day (Mon-Fri) of the given YYYY-MM month
// ── Argentine holiday calendar ────────────────────────────────────────
function _easterDate(y){
  // Anonymous Gregorian algorithm
  const a=y%19,b=Math.floor(y/100),c=y%100,d2=Math.floor(b/4),e=b%4,
    f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
    h=(19*a+b-d2-g+15)%30,i=Math.floor(c/4),k=c%4,
    l=(32+2*e+2*i-h-k)%7,m2=Math.floor((a+11*h+22*l)/451),
    mo=Math.floor((h+l-7*m2+114)/31),dy=((h+l-7*m2+114)%31)+1;
  return new Date(y,mo-1,dy);
}
function _isoDate(d){return d.toISOString().substring(0,10);}
function _addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function _trasladable(y,mmdd){
  // Argentine rule: Tue/Wed → previous Monday; Thu/Fri → following Monday
  const d=new Date(`${y}-${mmdd}`);
  const wd=d.getDay();
  if(wd===2||wd===3) d.setDate(d.getDate()-(wd-1));   // → Monday before
  else if(wd===4||wd===5) d.setDate(d.getDate()+(8-wd)); // → Monday after
  return _isoDate(d);
}
function argHolidays(y){
  const h=new Set();
  // Inamovibles (same date every year regardless of weekday)
  ['01-01','03-24','04-02','05-01','05-25','06-20','07-09','12-08','12-25']
    .forEach(md=>h.add(`${y}-${md}`));
  // Trasladables (observed on nearest Monday)
  ['08-17','10-12','11-20'].forEach(md=>h.add(_trasladable(y,md)));
  // Semana Santa y Carnaval (based on Easter)
  const easter=_easterDate(y);
  h.add(_isoDate(_addDays(easter,-48))); // Carnaval lunes
  h.add(_isoDate(_addDays(easter,-47))); // Carnaval martes
  h.add(_isoDate(_addDays(easter,-3)));  // Jueves Santo
  h.add(_isoDate(_addDays(easter,-2)));  // Viernes Santo
  return h;
}
function idxLastBizDayOfMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  const holidays=argHolidays(y);
  let d=new Date(y,m,0); // last calendar day of month
  while(d.getDay()===0||d.getDay()===6||holidays.has(_isoDate(d)))
    d.setDate(d.getDate()-1);
  return d;
}
async function fetchUsdBnaLike(targetYm){
  // Rule: rate for month X = last business day of month X.
  // If month X is not yet complete (today < last biz day of X), fall back to
  // the previous month's last business day and store under that month's ym.
  const lbd=idxLastBizDayOfMonth(targetYm);
  const today=new Date(); today.setHours(0,0,0,0);
  let effectiveYm=targetYm, cutoffDate=lbd;
  if(lbd>=today){
    // Month not closed yet — use previous month
    const [ty,tm]=targetYm.split('-').map(Number);
    let py=ty, pm=tm-1; if(pm<1){pm=12;py--;}
    effectiveYm=`${py}-${String(pm).padStart(2,'0')}`;
    cutoffDate=idxLastBizDayOfMonth(effectiveYm);
  }
  const cutoffIso=cutoffDate.toISOString().substring(0,10);
  // Try /dolares/oficial (BNA divisa vendedor)
  try {
    const r=await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial');
    if(r.ok){
      const data=await r.json();
      if(Array.isArray(data)){
        let arr=data.filter(x=>x&&x.fecha&&x.fecha<=cutoffIso&&x.fecha.startsWith(effectiveYm));
        if(!arr.length) arr=data.filter(x=>x&&x.fecha&&x.fecha<=cutoffIso);
        arr.sort((a,b)=>a.fecha.localeCompare(b.fecha));
        const last=arr[arr.length-1];
        if(last&&(last.venta||last.sell))
          return {ym:effectiveYm,value:Number(last.venta||last.sell),source:'BNA Oficial (divisa)',publishedAt:String(last.fecha).substring(0,10)};
      }
    }
  } catch(e){ console.warn('fetchUsdBnaLike oficial',e); }
  // Fallback: generic endpoint
  try {
    const r=await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares');
    if(r.ok){
      const data=await r.json();
      if(Array.isArray(data)){
        let arr=data.filter(x=>x&&x.fecha&&x.fecha<=cutoffIso&&/nacion|bna/i.test(String(x.casa||'')));
        arr.sort((a,b)=>a.fecha.localeCompare(b.fecha));
        const last=arr[arr.length-1];
        if(last&&(last.venta||last.sell))
          return {ym:effectiveYm,value:Number(last.venta||last.sell),source:'BNA (divisa)',publishedAt:String(last.fecha).substring(0,10)};
      }
    }
  } catch(e){ console.warn('fetchUsdBnaLike fallback',e); }
  throw new Error('No se pudo obtener USD DIVISA — intentá manualmente');
}
// ── Next-month helpers ────────────────────────────────────────────────
function idxNextYm(id){
  const rows=idxRows(id);
  if(!rows.length){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
  const last=rows[rows.length-1].ym;
  const d=new Date(last+'-01');d.setMonth(d.getMonth()+1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function idxIsUpToDate(id){
  const target=idxTargetYm();
  return idxRows(id).some(r=>String(r.ym||'')>=target);
}

// Returns {date:'YYYY-MM-DD', daysLeft:N} for the next expected publication, or null
function idxNextPubDate(def){
  if(!def||!def.pubDay) return null;
  const rows=idxRows(def.id);
  const lastRow=rows.length?rows[rows.length-1]:null;
  if(!lastRow) return null;
  const [ly,lm]=lastRow.ym.split('-').map(Number);
  // next reference period = last known + 1 month
  let refM=lm+1,refY=ly;
  if(refM>12){refM=1;refY++;}
  // publication date = refPeriod + pubDelay months, on pubDay
  let pubM=refM+(def.pubDelay||1),pubY=refY;
  while(pubM>12){pubM-=12;pubY++;}
  const dateStr=`${pubY}-${String(pubM).padStart(2,'0')}-${String(def.pubDay).padStart(2,'0')}`;
  const today=new Date(); today.setHours(0,0,0,0);
  const pubDate=new Date(dateStr+'T00:00:00');
  const daysLeft=Math.round((pubDate-today)/(1000*60*60*24));
  return {date:dateStr, daysLeft, label:formatMonth(`${refY}-${String(refM).padStart(2,'0')}`)};
}

function idxPubBadge(def){
  const p=idxNextPubDate(def);
  if(!p) return '';
  let color,icon,text;
  if(p.daysLeft<=-8){color='#c0392b';icon='⚠️';text='Retrasada '+Math.abs(p.daysLeft)+'d';}
  else if(p.daysLeft<0){color='#e67e22';icon='🟠';text='Pendiente '+Math.abs(p.daysLeft)+'d';}
  else if(p.daysLeft===0){color='#c0392b';icon='🔴';text='Publica HOY';}
  else if(p.daysLeft<=3){color='#c0392b';icon='🔴';text='en '+p.daysLeft+'d';}
  else if(p.daysLeft<=10){color='#e67e22';icon='🟡';text='en '+p.daysLeft+'d';}
  else if(p.daysLeft<=20){color='#27ae60';icon='🟢';text='en '+p.daysLeft+'d';}
  else{color='var(--g500)';icon='📅';text='en '+p.daysLeft+'d';}
  const tooltip=`Próx. pub. ${p.label}: ${p.date} (${p.daysLeft>=0?'en '+p.daysLeft+' días':Math.abs(p.daysLeft)+' días de retraso'})`;
  return `<span title="${tooltip}" style="font-size:10px;color:${color};white-space:nowrap;cursor:default;font-weight:600">${icon} ${text} <span style="font-weight:400;color:var(--g500)">(${p.label})</span></span>`;
}

// ── INDEC API fetch ───────────────────────────────────────────────────
async function idxFetchIndec(id, ym){
  const def=IDX_CATALOG.find(d=>d.id===id);
  if(!def||!def.seriesId) throw new Error('Sin seriesId para '+id);
  // Request from prevYm to get both months and compute pct
  const prevYm=idxPrevYm(ym);
  const url=`https://apis.datos.gob.ar/series/api/series?ids=${def.seriesId}&format=json&start_date=${prevYm}&limit=5`;
  const r=await fetch(url);
  if(!r.ok) throw new Error('INDEC API '+r.status);
  const j=await r.json();
  const data=j.data||[];
  const ymEntry=data.find(([d])=>d&&d.startsWith(ym));
  if(!ymEntry||ymEntry[1]==null) throw new Error('Sin dato INDEC para '+ym);
  const val=Number(ymEntry[1]);
  const prevEntry=data.find(([d])=>d&&d.startsWith(prevYm));
  let pct=null;
  if(prevEntry&&prevEntry[1]){
    pct=Number(((val/Number(prevEntry[1])-1)*100).toFixed(2));
  } else {
    const prevRow=idxRows(id).find(r=>r.ym===prevYm);
    if(prevRow&&prevRow.value) pct=Number(((val/prevRow.value-1)*100).toFixed(2));
  }
  return {ym,value:val,pct,source:'INDEC API',confirmed:false};
}

// ── Gas Oil fetch vía energia-proxy ──────────────────────────────────
async function idxFetchFuel(id, ym){
  const ckanUrl='https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=f8dda0d5-2a9f-4d34-b79b-4e63de3995df&limit=32000';
  const r=await fetch(`${SB_URL}/functions/v1/energia-proxy`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+SB_KEY},
    body:JSON.stringify({url:ckanUrl})
  });
  if(!r.ok) throw new Error('energia-proxy '+r.status);
  const j=await r.json();
  if(!j.success) throw new Error('CKAN error: '+(j.error&&j.error.message||'desconocido'));
  const records=(j.result&&j.result.records||[]).filter(rec=>{
    const prov=(rec.provincia||rec.idprovincia||'').toString().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const emp=(rec.empresa||rec.razon_social||rec.empresabandera||'').toString().toUpperCase();
    const prod=(rec.producto||rec.idproducto||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const fecha=(rec.fecha_vigencia||rec.fechavigencia||rec.fecha||'').toString();
    const esNQN=prov.includes('NEUQU')||prov==='58';
    const esYPF=emp.includes('YPF');
    const esGasoil=prod.includes('gasoil')||prod.includes('diesel')||prod.includes('gas oil');
    const esYm=fecha.startsWith(ym);
    const isG2=false;
    const isG3=id==='go_g3'&&(prod.includes('grado 3')||prod.includes('grado_3')||prod.includes('g3')||prod.includes('premium')||prod.includes('ultra')||prod.includes('infinia'));
    return esNQN&&esYPF&&esGasoil&&esYm&&(isG2||isG3);
  });
  if(!records.length) throw new Error('Sin datos combustible para '+ym+' en CKAN histórico');
  const precio=Math.max(...records.map(rec=>parseFloat((rec.precio||rec.importe||'0').toString().replace(',','.'))));
  const prevYm=idxPrevYm(ym);
  const prevRow=idxRows(id).find(r=>r.ym===prevYm);
  const pct=prevRow&&prevRow.value?Number(((precio/prevRow.value-1)*100).toFixed(2)):null;
  return {ym,value:Number(precio.toFixed(2)),pct,source:'S.Energía',confirmed:false};
}

// ── Agregar siguiente mes (auto o manual) ─────────────────────────────
async function idxAddNextMonth(id){
  const def=IDX_CATALOG.find(d=>d.id===id);
  if(!def) return;
  const ym=idxNextYm(id);
  const mode=def.fetchMode||'manual';
  if(mode==='manual'){openEntryModal(id,null);return;}
  toast('Buscando '+formatMonth(ym)+'…','ok');
  try{
    let row;
    if(mode==='indec') row=await idxFetchIndec(id,ym);
    else if(mode==='usd') row=await fetchUsdBnaLike(ym);
    else if(mode==='fuel') row=await idxFetchFuel(id,ym);
    if(!row) throw new Error('Sin dato');
    await idxUpsert(id,{...row,ym});
    renderIdxView();
    toast(def.name+' '+formatMonth(ym)+' cargado ✓','ok');
  }catch(err){
    console.warn('idxAddNextMonth',id,err);
    toast('No se encontró dato automático — ingresá manualmente','er');
    openEntryModal(id,null);
  }
}

async function idxResolveViaAI(def, targetYm){
  if(typeof callGeminiForEnm!=='function') throw new Error('Gemini no disponible');
  const prompt = `Necesito el último valor oficial publicado para el índice argentino "${def.name}" (fuente ${def.src}) para el período objetivo ${targetYm}. Si ${targetYm} todavía no fue publicado, devolvé el último período anterior disponible publicado. No inventes datos. Responder SOLO JSON válido con este esquema: {"ym":"YYYY-MM","pct":number|null,"value":number|null,"publishedAt":"YYYY-MM-DD"|null,"sourceUrl":"url"|null,"status":"updated"|"waiting_release","note":"texto breve"}`;
  const resp = await callGeminiForEnm([{text:prompt}]);
  if(!resp || !resp.ok) throw new Error('Gemini/proxy no respondió');
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const txt = parts.map(p=>p.text||'').join('\n').trim();
  return extractJsonFromGeminiText(txt);
}
async function runIdxUpdate(id){
  const def=IDX_CATALOG.find(d=>d.id===id); if(!def) return;
  const target=idxTargetYm();
  const mode=def.fetchMode||'manual';
  try{
    if(def.cat==='mo'){ toast('Índice guiado/manual','er'); return; }

    // ── USD: fuente propia ──────────────────────────────────────────────
    if(mode==='usd'||def.cat==='usd'){
      const usd=await fetchUsdBnaLike(target);
      await idxUpsert(id,{ym:usd.ym,value:usd.value,pct:null,confirmed:false,status:'updated',source:def.src,note:usd.source,publishedAt:usd.publishedAt});
      renderIdxView(); toast(def.name+' actualizado','ok'); return;
    }

    // ── INDEC API: fetch directo ────────────────────────────────────────
    if(mode==='indec'){
      try{
        const row=await idxFetchIndec(id,target);
        await idxUpsert(id,{...row,confirmed:false,status:'updated',publishedAt:row.publishedAt||null,sourceUrl:row.sourceUrl||null,note:row.note||''});
        renderIdxView(); toast(def.name+' actualizado (INDEC API)','ok'); return;
      }catch(apiErr){
        console.warn('idxFetchIndec failed, trying seed/AI',apiErr.message);
        // Fall through to seed/AI
      }
    }

    // ── Combustible: fuel-proxy ─────────────────────────────────────────
    if(mode==='fuel'){
      try{
        const row=await idxFetchFuel(id,target);
        await idxUpsert(id,{...row,confirmed:false,status:'updated'});
        renderIdxView(); toast(def.name+' actualizado (S.Energía)','ok'); return;
      }catch(fuelErr){
        console.warn('idxFetchFuel failed, trying seed/AI',fuelErr.message);
      }
    }

    // ── Seed exacto para el target ──────────────────────────────────────
    const official=idxResolveOfficial(def,target);
    if(official && official.ym===target && (official.pct!=null||official.value!=null)){
      await idxUpsert(id,{ym:target,pct:official.pct!=null?Number(official.pct):null,value:official.value!=null?Number(official.value):null,confirmed:false,status:'updated',source:official.source||def.src,note:official.note||'',publishedAt:official.publishedAt||null,sourceUrl:official.sourceUrl||null});
      renderIdxView(); toast(def.name+' actualizado (seed)','ok'); return;
    }

    // ── Gemini AI (solo para manual/fallback) ───────────────────────────
    const rs=await idxResolveViaAI(def,target);
    if(rs && (rs.pct!=null||rs.value!=null)){
      await idxUpsert(id,{ym:rs.ym||target,pct:rs.pct!=null?Number(rs.pct):null,value:rs.value!=null?Number(rs.value):null,confirmed:false,status:'updated',source:def.src,note:rs.note||'',publishedAt:rs.publishedAt||null,sourceUrl:rs.sourceUrl||null});
      renderIdxView(); toast(def.name+' actualizado (AI)','ok'); return;
    }

    // ── Último seed disponible como fallback real ───────────────────────
    if(official && (official.pct!=null||official.value!=null)){
      await idxUpsert(id,{ym:official.ym,pct:official.pct!=null?Number(official.pct):null,value:official.value!=null?Number(official.value):null,confirmed:false,status:'waiting_release',source:official.source||def.src,note:(official.note||'')+' · último oficial disponible',publishedAt:official.publishedAt||null,sourceUrl:official.sourceUrl||null});
      renderIdxView(); toast(def.name+' usando último oficial ('+official.ym+')','ok'); return;
    }
    throw new Error('Sin dato');
  }catch(err){
    console.warn('runIdxUpdate',id,err);
    const prev=idxLastBefore(id,target);
    if(prev){ await idxUpsert(id,{...prev,status:'fallback'}); renderIdxView(); toast(def.name+' usando último publicado','ok'); return; }
    renderIdxView(); toast('No se pudo actualizar '+def.name,'er');
  }
}
async function runAllIdxUpdates(){
  const defs=IDX_CATALOG.filter(d=>d.cat!=='mo');
  const modal=document.getElementById('idxProgressModal');
  const pmBody=document.getElementById('pmBody');
  const pmTitle=document.getElementById('pmTitle');
  const pmSpinner=document.getElementById('pmSpinner');
  const pmClose=document.getElementById('pmCloseBtn');

  // Render rows
  const rowState={}; // id → {ico,status}
  pmBody.innerHTML=defs.map(d=>`<div class="pm-row" id="pm_${d.id}"><span class="pm-ico" id="pmi_${d.id}">⏳</span><span class="pm-name">${esc(d.name)}</span><span class="pm-status" id="pms_${d.id}">Esperando…</span></div>`).join('');
  pmTitle.textContent='Actualizando índices…';
  pmSpinner.textContent='🔄';
  pmClose.style.display='none';
  modal.style.display='flex';

  _idxBatchMode=true;
  let ok=0,fail=0;
  try{
    for(const def of defs){
      const icoEl=document.getElementById('pmi_'+def.id);
      const stEl=document.getElementById('pms_'+def.id);
      if(icoEl) icoEl.textContent='⏳';
      if(stEl){stEl.textContent='Actualizando…';stEl.style.color='var(--muted)';}
      try{
        await runIdxUpdate(def.id);
        if(icoEl) icoEl.textContent='✅';
        const row=idxRows(def.id).find(r=>r.ym===idxTargetYm());
        if(stEl){
          stEl.textContent=row?formatMonth(row.ym)+(row.status==='fallback'?' (fallback)':''):'sin dato';
          stEl.style.color=row?'var(--g600)':'var(--r500)';
        }
        ok++;
      }catch(e){
        if(icoEl) icoEl.textContent='❌';
        if(stEl){stEl.textContent='Error';stEl.style.color='var(--r500)';}
        fail++;
      }
    }
  }finally{
    _idxBatchMode=false;
    await saveIdx();
    pmTitle.textContent=`Listo — ${ok} actualizados${fail?', '+fail+' con error':''}`;
    pmSpinner.textContent=fail?'⚠️':'✅';
    pmClose.style.display='';
    renderIdxDash();
  }
}


// ── Helpers ────────────────────────────────────────────────────────────
function pctColor(v){return v===null||v===undefined?'zero':v>0?'pos':v<0?'neg':'zero';}
function pctStr(v,decimals=2){if(v===null||v===undefined)return'—';return(v>0?'+':'')+Number(v).toFixed(decimals)+'%';}
function acumCompound(rows){return rows.reduce((prod,r)=>prod*(1+(r.pct||0)/100),1)-1;}

// ── STATE ──────────────────────────────────────────────────────────────
let _idxSel = null;   // currently open detail
let _idxEntryId = null; // entry modal target

// ═══════════════════════════════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════════════════════════════
function renderIdxView(){
  loadIdx();
  renderIdxDash();
  if(_idxSel){
    document.getElementById('idxDetPanel').style.display='';
    document.getElementById('idxCardsGrid').style.display='none';
    renderIdxDet(_idxSel);
  } else {
    document.getElementById('idxDetPanel').style.display='none';
    document.getElementById('idxCardsGrid').style.display='';
    renderIdxCards();
  }
}

// ── Top KPI row ────────────────────────────────────────────────────────
function renderIdxDash(){
  const box=document.getElementById('idxDashTop');if(!box)return;
  const totalIdx=IDX_CATALOG.length;
  const target=idxTargetYm();
  let updated=0, pending=0, withAny=0;
  IDX_CATALOG.forEach(def=>{ const rows=idxRows(def.id); if(rows.length) withAny++; const exact=rows.find(r=>r.ym===target); if(exact) updated++; else pending++; });
  box.innerHTML=`<p style="font-size:12px;color:var(--g500);margin-bottom:14px">Objetivo: <strong>${formatMonth(target)}</strong> · si el período no fue publicado se usa el último oficial disponible anterior</p><div class="idx-dash-row" style="grid-template-columns:repeat(4,1fr)"><div class="idx-kpi-box"><div class="kl">Total índices</div><div class="kv">${totalIdx}</div><div class="ks">${withAny} con historial</div></div><div class="idx-kpi-box" style="border-color:var(--g600)"><div class="kl">✅ Actualizados ${formatMonth(target)}</div><div class="kv" style="color:var(--g600)">${updated}</div><div class="ks">con dato en el período objetivo</div></div><div class="idx-kpi-box" style="border-color:${pending>0?'var(--r500)':'var(--g600)'}"><div class="kl">⏳ Pendientes</div><div class="kv" style="color:${pending>0?'var(--r500)':'var(--g600)'}">${pending}</div><div class="ks">sin dato del objetivo</div></div><div class="idx-kpi-box"><div class="kl">📚 Historial</div><div class="kv">${withAny}</div><div class="ks">con datos previos cargados</div></div></div>`;
}
function renderIdxCards(){
  const box=document.getElementById('idxCardsGrid');if(!box)return;
  const cats=['ipc','ipim','fuel','usd','mo'];
  const catLabel={ipc:'IPC — Índice de Precios al Consumidor',ipim:'IPIM / FADEAAC — Índice de Precios Internos Mayoristas',fuel:'Combustible',usd:'USD / Tipo de Cambio',mo:'Mano de Obra — CCT'};
  let h='';
  cats.forEach(cat=>{
    const defs=IDX_CATALOG.filter(d=>d.cat===cat);
    h+=`<div style="margin-bottom:22px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--p800)">${catLabel[cat]}</h3>${cat==='mo'?'<span class="icat mo">Paritaria — RRLL</span>':''}</div><div class="idx-cards">`;
    defs.forEach(def=>{
      const rows=idxRows(def.id), target=idxTargetYm();
      // PRIORIDAD: 1) Último del store, 2) Official seed como fallback
      const lastStore=rows.length?rows[rows.length-1]:null;
      const officialSeed = idxResolveOfficial(def,target);
      const last = lastStore || officialSeed;
      
      // FORZAR valor del store si existe
      // Para USD usar 'value', para otros usar 'pct'
      const displayValue = lastStore ? (lastStore.value != null ? lastStore.value : lastStore.pct) : (officialSeed ? officialSeed.pct : null);
      const displayYm = lastStore ? lastStore.ym : (officialSeed ? officialSeed.ym : null);
      
      // DEBUG CRÍTICO

      // Sparkline: adaptar para USD (usa 'value') vs otros índices (usa 'pct')
      const spark8 = rows.slice(-8);
      let sparkH = '';
      
      if (def.cat === 'usd') {
        // Para USD: calcular variación porcentual entre períodos
        const vals = spark8.map(r => r.value || 0);
        const maxAbs = Math.max(...vals.map((v, i) => i > 0 ? Math.abs((v - vals[i-1]) / vals[i-1] * 100) : 0), 0.001);
        sparkH = spark8.map((r, i) => {
          if (i === 0) return '<div class="spark-b pos" style="height:2px" title="' + fN(r.value) + ' ' + formatMonth(r.ym) + '"></div>';
          const pct = ((r.value - vals[i-1]) / vals[i-1]) * 100;
          const h8 = Math.max(Math.round(Math.abs(pct) / maxAbs * 28), 2);
          return '<div class="spark-b ' + (pct >= 0 ? 'pos' : 'neg') + '" style="height:' + h8 + 'px" title="' + fN(r.value) + ' (' + pctStr(pct) + ') ' + formatMonth(r.ym) + '"></div>';
        }).join('');
      } else {
        // Para índices con valores absolutos (ej: IPC NQN manual): calcular pct en tiempo real
        const hasVals = spark8.some(r => r.value != null && r.value !== 0);
        if (hasVals) {
          const allRows = idxRows(def.id);
          const dispP = spark8.map((r, i) => {
            if (r.value == null) return r.pct != null ? r.pct : null;
            let prev = null;
            for (let j = i - 1; j >= 0; j--) { if (spark8[j].value != null && spark8[j].value !== 0) { prev = spark8[j]; break; } }
            if (!prev) {
              const idx = allRows.findIndex(x => x.ym === r.ym);
              for (let j = idx - 1; j >= 0; j--) { if (allRows[j].value != null && allRows[j].value !== 0) { prev = allRows[j]; break; } }
            }
            if (!prev) return r.pct != null ? r.pct : null;
            // Use value computation only for consecutive months; otherwise stored pct is more reliable
            if (prev.ym === idxPrevYm(r.ym)) return ((r.value / prev.value) - 1) * 100;
            return r.pct != null ? r.pct : ((r.value / prev.value) - 1) * 100;
          });
          const maxAbs = Math.max(...dispP.map(p => Math.abs(p || 0)), 0.001);
          sparkH = spark8.map((r, i) => {
            const pct = dispP[i] ?? 0;
            const h8 = Math.max(Math.round(Math.abs(pct) / maxAbs * 28), 2);
            return '<div class="spark-b ' + (pct >= 0 ? 'pos' : 'neg') + '" style="height:' + h8 + 'px" title="' + pctStr(pct, 1) + ' ' + formatMonth(r.ym) + '"></div>';
          }).join('');
        } else {
          const maxAbs = Math.max(...spark8.map(r => Math.abs(r.pct || 0)), 0.001);
          sparkH = spark8.map(r => {
            const pct = r.pct || 0;
            const h8 = Math.max(Math.round(Math.abs(pct) / maxAbs * 28), 2);
            return '<div class="spark-b ' + (pct >= 0 ? 'pos' : 'neg') + '" style="height:' + h8 + 'px" title="' + pctStr(pct) + ' ' + formatMonth(r.ym) + '"></div>';
          }).join('');
        }
      }
      
      // Formatear valor según tipo de índice (USD usa value, otros usan pct)
      const formattedValue = idxValueLabel(def, lastStore || officialSeed);
      
      const upToDate=idxIsUpToDate(def.id);
      const statusBadge=upToDate?'<span title="Al día" style="font-size:14px">✅</span>':'<span title="Desactualizado" style="font-size:14px">⚠️</span>';
      const nextYm=idxNextYm(def.id);
      const addBtn=cat!=='mo'?`<button class="btn btn-p btn-sm" onclick="event.stopPropagation();idxAddNextMonth('${def.id}')" title="Agregar ${formatMonth(nextYm)}">+ ${formatMonth(nextYm)}</button>`:'';
      const pubBadge=idxPubBadge(def);
      h+=`<div class="idx-c ${_idxSel===def.id?'sel':''}" onclick="openIdxDet('${def.id}')"><div class="idx-c-top ${CAT_CSS[cat]}"></div><div class="idx-c-body"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:4px"><div class="idx-c-name">${esc(def.name)}${def.cct?'<div style="font-size:9.5px;color:var(--g500);font-weight:600;margin-top:2px">'+esc(def.cct)+'</div>':''}<div style="font-size:10px;color:var(--g500);font-weight:600;margin-top:4px">Objetivo: ${formatMonth(target)} · Últ.: ${displayYm?formatMonth(displayYm):'—'}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">${statusBadge}<span class="icat ${CAT_PILL[cat]}">${esc(def.src)}</span></div></div><div class="idx-c-kpi"><span class="big ${last?.value!=null?'pos':pctColor(displayValue)}">${formattedValue}</span><span class="period">${displayYm?formatMonth(displayYm):'sin datos'}</span>${last?.status==='fallback'?'<span style="font-size:11px" title="Fallback">↩️</span>':''}</div>${spark8.length?`<div class="spark">${sparkH}</div>`:`<div style="height:28px;display:flex;align-items:center;font-size:11px;color:var(--g400)">Sin datos aún</div>`}<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:6px;flex-wrap:wrap">${addBtn}${cat!=='mo'?`<button class="btn btn-s btn-sm" onclick="event.stopPropagation();runIdxUpdate('${def.id}')">🔄</button>`:''}</div>${pubBadge?`<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--g100)">${pubBadge}</div>`:''}</div></div>`;
    });
    h+='</div></div>';
  });
  box.innerHTML=h;
}

// ── Open detail ────────────────────────────────────────────────────────
function openIdxDet(id){
  _idxSel=id;
  renderIdxView();
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeIdxDet(){
  _idxSel=null;
  renderIdxView();
}

// ── Detail panel ───────────────────────────────────────────────────────
function renderIdxDet(id){
  const def=IDX_CATALOG.find(d=>d.id===id);
  const box=document.getElementById('idxDetPanel');if(!box||!def)return;
  const rows=idxRows(id), yms=rows.map(r=>r.ym), chartRows=rows.slice(-18);
  // For value-based indices compute pct on-the-fly from consecutive values
  const hasValues=chartRows.some(r=>r.value!=null&&r.value!==0);
  const dispPcts=chartRows.map((r,i)=>{
    if(hasValues&&r.value!=null){
      // Find nearest previous row with a value
      let prev=null;
      for(let j=i-1;j>=0;j--){if(chartRows[j].value!=null&&chartRows[j].value!==0){prev=chartRows[j];break;}}
      if(!prev){
        const allRows=idxRows(id);const idx2=allRows.findIndex(x=>x.ym===r.ym);
        for(let j=idx2-1;j>=0;j--){if(allRows[j].value!=null&&allRows[j].value!==0){prev=allRows[j];break;}}
      }
      if(prev){
        // Only compute from values when prev is the consecutive month
        // (avoids accumulating multiple months when there's a pct-only gap)
        if(prev.ym===idxPrevYm(r.ym))return((r.value/prev.value)-1)*100;
        if(r.pct!=null)return r.pct; // gap: stored pct is more reliable
        return((r.value/prev.value)-1)*100; // no stored pct: best effort
      }
      return r.pct!=null?r.pct:null;
    }
    return r.pct!=null?r.pct:null;
  });
  const maxAbs=Math.max(...dispPcts.map(p=>Math.abs(p||0)),0.001);
  // need at least 2 rows to show meaningful bars (first row has no previous to compare)
  const barsContent=chartRows.length<=1
    ? `<div style="height:72px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--g400)">Se necesitan al menos 2 períodos para mostrar variaciones</div>`
    : chartRows.map((r,i)=>{ const pct=dispPcts[i]??0; const h=Math.max(Math.round(Math.abs(pct)/maxAbs*72),2); const isLast=i===chartRows.length-1; return `<div class="cbar-wrap"><div class="cbar-val ${pct>=0?'pos':'neg'}">${pctStr(pct,1)}</div><div class="cbar ${pct>=0?'pos':'neg'} ${isLast?'act':''}" style="height:${h}px"></div><div class="cbar-lbl">${formatMonth(r.ym).replace(' ','\n')}</div></div>`; }).join('');
  // selects: use real yms when ≥1, fall back to placeholder only when empty
  const selYms=yms.length?yms:['—'];
  const selOpts=selYms.map((ym,i)=>`<option value="${ym}"${i===0?'selected':''}>${ym==='—'?'—':formatMonth(ym)}</option>`).join('');
  const selOptTo=selYms.map((ym,i)=>`<option value="${ym}"${i===selYms.length-1?'selected':''}>${ym==='—'?'—':formatMonth(ym)}</option>`).join('');
  const tblRows=[...rows].reverse().map(r=>`<tr><td>${formatMonth(r.ym)}</td><td class="mono ${r.value!=null?'pos':((r.pct||0)>=0?'pos':'neg')}">${r.value!=null?fN(r.value):pctStr(r.pct)}</td><td style="text-align:center">${r.confirmed?'<span style="cursor:pointer" onclick="toggleIdxConfirm(\'${id}\',\'${r.ym}\',false)" title="Click para desconfirmar">✅</span>':'<span style="cursor:pointer;color:var(--g400)" onclick="toggleIdxConfirm(\'${id}\',\'${r.ym}\',true)" title="Click para confirmar">○</span>'}</td><td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.note||r.status||'')}">${esc(r.note||r.status||'—')}</td><td>${(r.files||[]).length?`<button class="btn btn-s btn-sm" onclick="downloadIdxFile(\'${id}\',\'${r.ym}\',0)" style="font-size:10px;padding:2px 7px">📎 ${(r.files||[]).length}</button>`:'—'}</td><td style="white-space:nowrap"><button class="btn btn-s btn-sm" style="font-size:10px;padding:2px 6px;margin-right:3px" onclick="openEntryModal(\'${id}\',\'${r.ym}\')" title="Editar">✏️</button><button class="btn btn-d btn-sm" style="font-size:10px;padding:2px 6px" onclick="deleteIdxRow(\'${id}\',\'${r.ym}\')" title="Eliminar">🗑</button></td></tr>`).join('');
  box.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px"><div><h3 style="margin:0">${esc(def.name)}</h3><div style="font-size:12px;color:var(--g500)">Fuente: ${esc(def.src)} · Estado: ${idxStatusText(id)}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${def.cat!=='mo'?`<button class="btn btn-s btn-sm" onclick="runIdxUpdate('${id}')">🔄 Actualizar</button>`:''}<button class="btn btn-s btn-sm" onclick="_idxSel=null;renderIdxView()">← Volver</button><button class="btn btn-p btn-sm" onclick="openEntryModal('${id}',null)">➕ Cargar</button><button class="btn btn-s btn-sm" onclick="confirmAllIdx('${id}')">✅ Confirmar todos</button><button class="btn btn-d btn-sm" style="font-size:11px" onclick="if(confirm('¿Borrar todos los datos de este índice?')){IDX_STORE['${id}']={rows:[]};saveIdx().then(()=>{renderIdxView();toast('Índice limpiado','ok');});}">🗑 Limpiar</button></div></div><div class="card"><div class="chart-bars">${chartRows.length?barsContent:'<div class="small">Sin datos</div>'}</div></div><div class="card" style="margin-top:12px"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><label>Acumulado desde</label><select id="idxFrom">${selOpts}</select><label>hasta</label><select id="idxTo">${selOptTo}</select><button class="btn btn-s btn-sm" onclick="calcIdxAcum('${id}')">Calcular</button><span id="idxAcumRes" class="mono"></span></div><div style="overflow:auto"><table class="tbl"><thead><tr><th>Período</th><th>Valor</th><th>Confirmado</th><th>Nota</th><th>Adjuntos</th><th>Acciones</th></tr></thead><tbody>${tblRows||'<tr><td colspan="6" style="text-align:center;color:var(--g400);font-style:italic;padding:16px">Sin datos cargados. Usá ➕ Cargar para agregar el primer período.</td></tr>'}</tbody></table></div></div>`;
}

function calcIdxAcum(id){
  const from=document.getElementById('idxFrom')?.value;
  const to=document.getElementById('idxTo')?.value;
  if(!from||!to||from==='—'||to==='—'){toast('Seleccioná períodos válidos','er');return;}
  const rows=idxRows(id).filter(r=>r.ym>=from&&r.ym<=to);
  const el=document.getElementById('idxAcumRes');
  if(!rows.length){if(el)el.textContent='Sin datos';return;}
  const acum=acumCompound(rows)*100;
  if(el){el.textContent=pctStr(acum,4)+' ('+rows.length+' per.)';el.style.color=acum>=0?'var(--g600)':'var(--r500)';}
}

// ══════════════════════════════════════════════════════════════════════
//  ENTRY MODAL — Cargar / editar período
// ══════════════════════════════════════════════════════════════════════
function openEntryModal(idxId, ym){
  _idxEntryId=idxId;
  const def=IDX_CATALOG.find(d=>d.id===idxId);
  const rows=idxRows(idxId);
  const existing=ym?rows.find(r=>r.ym===ym):null;
  // Default ym = next month after last entry
  let defaultYm=ym||'';
  if(!defaultYm&&rows.length){
    const last=rows[rows.length-1].ym;
    const d=new Date(last+'-01');d.setMonth(d.getMonth()+1);
    defaultYm=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  if(!defaultYm){const n=new Date();defaultYm=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}

  const filesHtml=(existing?.files||[]).map((f,fi)=>
    `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--g100)">
      <span style="flex:1;font-size:12px">📎 ${esc(f.name)}</span>
      <button class="btn btn-d btn-sm" style="font-size:10px;padding:2px 7px" onclick="removeEntryFile(${fi})">✕</button>
    </div>`
  ).join('');

  document.getElementById('idxModalBox').innerHTML=`
    <div class="idx-modal-hdr">
      <h3>${existing?'✏️ Editar período':'➕ Cargar período'} — ${esc(def.name)}</h3>
      <button class="btn btn-s btn-sm" onclick="closeIdxModal()">✕</button>
    </div>
    <div class="idx-modal-body">
      <div class="fg2" style="margin-bottom:16px">
        <div class="fgrp">
          <label>Período (mes) <span class="req">*</span></label>
          <input type="month" id="em_ym" value="${defaultYm}" ${existing?'disabled':''}>
        </div>
        <div class="fgrp">
          <label>% Variación mensual</label>
          <input type="number" id="em_pct" step="0.01" placeholder="Ej: 2.35" value="${existing?.pct??''}">
        </div>
      </div>
      <div class="fgrp" style="margin-bottom:14px">
        <label>Valor absoluto <span style="font-size:11px;color:var(--g400)">(precio, cotización, índice — usar en lugar de % si aplica)</span></label>
        <input type="number" id="em_value" step="0.01" placeholder="Ej: 1250.50" value="${existing?.value??''}">
      </div>
      <div class="fgrp" style="margin-bottom:14px">
        <label>Nota / Link de referencia</label>
        <input type="text" id="em_note" placeholder="Ej: https://indec.gob.ar/ipc-enero-2025 o descripción" value="${existing?.note||''}">
      </div>
      <div class="fgrp" style="margin-bottom:6px">
        <label>Archivos adjuntos (PDF, imagen, etc.)</label>
        <div class="fzone" id="em_fzone" style="padding:12px" onclick="document.getElementById('em_finput').click()">
          <div class="fzi" style="font-size:20px">📎</div>
          <div class="fzt">Adjuntá el comprobante / informe</div>
        </div>
        <input type="file" id="em_finput" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv" style="display:none" onchange="handleEntryFiles(this.files)">
        <div id="em_flist">${filesHtml}</div>
      </div>
      <div style="font-size:11px;color:var(--g500)">
        ${def.srcLink?`Fuente: <a href="${def.srcLink}" target="_blank" rel="noopener" style="color:var(--p600)">↗ ${esc(def.src)}</a>`:'Fuente: '+esc(def.src)}
      </div>
    </div>
    <div class="idx-modal-foot">
      <button class="btn btn-s btn-sm" onclick="closeIdxModal()">Cancelar</button>
      <button class="btn btn-p" onclick="saveEntryModal('${idxId}','${ym||''}')">💾 Guardar</button>
    </div>`;
  document.getElementById('idxModalBack').style.display='flex';
  // Drag & drop
  const fz=document.getElementById('em_fzone');
  fz.ondragover=e=>{e.preventDefault();fz.style.borderColor='var(--p400)';};
  fz.ondragleave=()=>fz.style.borderColor='';
  fz.ondrop=e=>{e.preventDefault();fz.style.borderColor='';handleEntryFiles(e.dataTransfer.files);};
}

let _entryFiles=[];
function handleEntryFiles(fl){
  for(const f of fl){
    if(_entryFiles.length>=5){toast('Máximo 5 archivos por período','er');break;}
    const r=new FileReader();
    r.onload=e=>{_entryFiles.push({name:f.name,size:f.size,data:e.target.result});refreshEntryFileList();};
    r.readAsDataURL(f);
  }
}
function refreshEntryFileList(){
  const box=document.getElementById('em_flist');if(!box)return;
  box.innerHTML=_entryFiles.map((f,i)=>`
    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--g100)">
      <span style="flex:1;font-size:12px">📎 ${esc(f.name)} <span style="color:var(--g400)">(${(f.size/1024).toFixed(0)}KB)</span></span>
      <button class="btn btn-d btn-sm" style="font-size:10px;padding:2px 7px" onclick="removeEntryFile(${i})">✕</button>
    </div>`).join('');
}
function removeEntryFile(i){_entryFiles.splice(i,1);refreshEntryFileList();}

async function saveEntryModal(idxId, editYm){
  const ym=editYm||document.getElementById('em_ym')?.value;
  if(!ym){toast('Seleccioná el período','er');return;}
  const pctRaw=document.getElementById('em_pct')?.value;
  const valRaw=document.getElementById('em_value')?.value;
  const pct=pctRaw!==''&&pctRaw!=null?parseFloat(pctRaw):null;
  const value=valRaw!==''&&valRaw!=null?parseFloat(valRaw):null;
  if((pct===null||isNaN(pct))&&(value===null||isNaN(value))){toast('Ingresá al menos % de variación o valor absoluto','er');return;}
  const note=document.getElementById('em_note')?.value.trim()||'';
  if(!IDX_STORE[idxId])IDX_STORE[idxId]={};
  if(!IDX_STORE[idxId].rows)IDX_STORE[idxId].rows=[];
  const existing=IDX_STORE[idxId].rows.find(r=>r.ym===ym);
  // Auto-calculate pct from previous row when only value is provided
  let finalPct = isNaN(pct) ? null : pct;
  if (finalPct === null && value != null && !isNaN(value)) {
    const prevRows = (IDX_STORE[idxId].rows||[]).filter(r=>r.ym < ym && r.value != null && !isNaN(r.value)).sort((a,b)=>a.ym.localeCompare(b.ym));
    if (prevRows.length) {
      const prev = prevRows[prevRows.length - 1];
      if (prev.value !== 0) finalPct = ((value / prev.value) - 1) * 100;
    }
  }
  // Merge files: keep existing + add new
  const existingFiles=existing?.files||[];
  const allFiles=[...existingFiles,..._entryFiles];
  const row={ym,pct:finalPct,value:isNaN(value)?null:value,note,files:allFiles,confirmed:existing?.confirmed||false};
  if(existing){Object.assign(existing,row);}
  else{IDX_STORE[idxId].rows.push(row);IDX_STORE[idxId].rows.sort((a,b)=>a.ym.localeCompare(b.ym));}
  await saveIdx();
  closeIdxModal();
  toast(formatMonth(ym)+': '+(value!=null?'$'+value.toFixed(2):pctStr(pct))+' guardado','ok');
  renderIdxView();
}

function closeIdxModal(){
  document.getElementById('idxModalBack').style.display='none';
  _entryFiles=[];
}

// ── Actions ────────────────────────────────────────────────────────────
async function toggleIdxConfirm(idxId,ym,val){
  const r=(IDX_STORE[idxId]?.rows||[]).find(r=>r.ym===ym);
  if(r){r.confirmed=val;await saveIdx();renderIdxView();}
}
async function confirmAllIdx(idxId){
  (IDX_STORE[idxId]?.rows||[]).forEach(r=>r.confirmed=true);
  await saveIdx();toast('Todos confirmados','ok');renderIdxView();
}
async function deleteIdxRow(idxId,ym){
  if(!confirm('¿Eliminar el período '+formatMonth(ym)+'?'))return;
  IDX_STORE[idxId].rows=(IDX_STORE[idxId].rows||[]).filter(r=>r.ym!==ym);
  // Tombstone to prevent seed re-injection
  if(!IDX_STORE.__deleted)IDX_STORE.__deleted={};
  if(!IDX_STORE.__deleted[idxId])IDX_STORE.__deleted[idxId]=[];
  if(!IDX_STORE.__deleted[idxId].includes(ym))IDX_STORE.__deleted[idxId].push(ym);
  await saveIdx();renderIdxView();toast('Período eliminado','ok');
}
function downloadIdxFile(idxId,ym,fi){
  const row=(IDX_STORE[idxId]?.rows||[]).find(r=>r.ym===ym);
  const f=row?.files?.[fi];if(!f)return;
  const a=document.createElement('a');a.href=f.data;a.download=f.name;a.click();
}

// ── New custom index modal (future extensibility, for now just selects catalog) ──
function showNewIdxModal(){
  openEntryModal(IDX_CATALOG[0].id, null);
  // Replace header with category selector
  const hdr=document.querySelector('#idxModalBox .idx-modal-hdr h3');
  if(hdr)hdr.textContent='➕ Cargar período de índice';
  // Insert index selector at top of body
  const body=document.querySelector('#idxModalBox .idx-modal-body');
  if(!body)return;
  const selDiv=document.createElement('div');
  selDiv.className='fgrp';selDiv.style.marginBottom='16px';
  selDiv.innerHTML=`<label>Índice <span class="req">*</span></label>
    <select id="em_idxsel" onchange="switchModalIdx(this.value)" style="font-size:13px">
      ${IDX_CATALOG.map(d=>`<option value="${d.id}">${esc(d.catLabel)} — ${esc(d.name)}</option>`).join('')}
    </select>`;
  body.insertBefore(selDiv,body.firstChild);
  // Wire up save button
  const foot=document.querySelector('#idxModalBox .idx-modal-foot button:last-child');
  if(foot)foot.onclick=()=>{const sel=document.getElementById('em_idxsel')?.value||IDX_CATALOG[0].id;saveEntryModal(sel,'');};
}
function switchModalIdx(id){
  _idxEntryId=id;
  const def=IDX_CATALOG.find(d=>d.id===id);
  const note=document.getElementById('em_note');
  if(note&&def)note.placeholder='Ref: '+def.src+(def.srcLink?' — '+def.srcLink:'');
}


// ═══════════════════════════════════════════════════════════════════════
//  LICITACIONES — Motor completo
// ═══════════════════════════════════════════════════════════════════════
// LICIT_DB: [{id, docAriba, titulo, tipo:'RFQ_ARIBA'|'RFQ_MAIL'|'DIRECTA',
//   fechaApertura, contrato, estado:'EN_PROCESO'|'ADJUDICADA'|'DESIERTA',
//   ganador, oferentes:[{nombre, aprobTec:bool, part2da:bool, doc2da}],
//   items:[{id,tipo:'item'|'subtotal'|'seccion', desc, valores:{[ofrIdx]:number}}],
//   adjuntos:[{name,data}], obs, createdAt}]
let LICIT_DB=[];
let _licitDet=null;

function loadLicit(){try{LICIT_DB=JSON.parse(localStorage.getItem('licit_v1'))||[];}catch(e){LICIT_DB=[];}}
function saveLicit(){localStorage.setItem('licit_v1',JSON.stringify(LICIT_DB));}
(function(){loadLicit();})();

// ── List view ──────────────────────────────────────────────────────────
