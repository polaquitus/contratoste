function renderList(){
  const box=document.getElementById('tBody'),srch=(gv('fSrch')||'').toLowerCase(),fE=document.getElementById('fEst').value,hoy=new Date();hoy.setHours(0,0,0,0);
  const fComp=document.getElementById('fComp')?.value||'';
  const fAsset=document.getElementById('fAsset')?.value||'';
  const fDom=document.getElementById('fDom')?.value||'';
  const fResp=document.getElementById('fResp')?.value||'';
  const fOwn=document.getElementById('fOwn')?.value||'';
  let arr=window.DB.filter(c=>{
    const fin=new Date(c.fechaFin+'T00:00:00');const est=fin>=hoy?'ACTIVO':'VENCIDO';
    if(fE&&est!==fE)return false;
    if(srch&&!c.num.toLowerCase().includes(srch)&&!c.cont.toLowerCase().includes(srch))return false;
    const comp=getContComp(c);if(fComp&&comp!==fComp)return false;
    if(fAsset&&c.asset!==fAsset)return false;
    if(fDom&&c.gob!==fDom)return false;
    if(fResp&&c.resp!==fResp)return false;
    if(fOwn&&c.own!==fOwn)return false;
    return true;
  });
  document.getElementById('lcnt').textContent=arr.length+'/'+window.DB.length;
  if(!arr.length){box.innerHTML=window.DB.length?'<div class="empty"><div class="ei">🔍</div><p>Sin resultados.</p></div>':'<div class="empty"><div class="ei">📄</div><p>No hay contratos. Hacé clic en <strong>Nuevo Contrato</strong>.</p></div>';return;}
  let h='<div style="overflow-x:auto"><table><thead><tr><th>N° Ctto</th><th>Proveedor</th><th>Monto Total</th><th>Consumido (POs)</th><th>Remanente</th><th>% Disponible</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Completitud</th><th style="width:50px"></th></tr></thead><tbody>';
  for(const c of arr){
    const fin=new Date(c.fechaFin+'T00:00:00'),isA=fin>=hoy,tot=getTotal(c);
    const consumed=getConsumed(c.num);
    const hasConsumed=consumed!==null;
    const remanente=hasConsumed?tot-consumed:null;
    const pct=hasConsumed&&tot>0?Math.max(0,Math.min(100,(remanente/tot)*100)):null;
    const bc=pct===null?'green':pct>50?'green':pct>20?'yellow':'red';
    const pctDisplay=pct===null?'—':pct.toFixed(1)+'%';
    const pbarW=pct===null?'100':pct.toFixed(1);
    h+=`<tr class="clickable"><td class="mono" style="font-size:12px;font-weight:600" onclick="verDet('${c.id}')">${c.num}</td><td style="font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="verDet('${c.id}')">${c.cont}</td><td class="mono" style="font-size:12px" onclick="verDet('${c.id}')">${c.mon} ${fN(tot)}</td><td class="mono" style="font-size:12px;color:${hasConsumed?'var(--r500)':'var(--g500)'}" onclick="verDet('${c.id}')">${hasConsumed?c.mon+' '+fN(consumed):'—'}</td><td class="mono" style="font-size:12px;font-weight:600;color:${hasConsumed?(remanente<0?'var(--r500)':'var(--p700)'):'var(--g500)'}" onclick="verDet('${c.id}')">${hasConsumed?c.mon+' '+fN(remanente):'—'}</td><td style="min-width:100px" onclick="verDet('${c.id}')"><div style="display:flex;align-items:center;gap:8px"><div class="pbar" style="flex:1"><div class="fill ${bc}" style="width:${pbarW}%"></div></div><span style="font-size:11px;font-weight:600">${pctDisplay}</span></div></td><td onclick="verDet('${c.id}')">${fD(c.fechaIni)}</td><td onclick="verDet('${c.id}')">${fD(c.fechaFin)}</td><td onclick="verDet('${c.id}')"><span class="bdg ${isA?'act':'exp'}">● ${isA?'ACTIVO':'VENCIDO'}</span></td><td onclick="verDet('${c.id}')">${(()=>{const comp=getContComp(c);return '<span class="comp-badge '+(comp==='COMPLETO'?'full':comp==='PARCIAL'?'partial':'empty')+'">'+( comp==='COMPLETO'?'✅ Completo':comp==='PARCIAL'?'⚠️ Parcial':'❌ Pendiente')+'</span>';})()}</td><td style="text-align:center"><button class="btn btn-d btn-sm" onclick="event.stopPropagation();delCont('${c.id}')" title="Eliminar contrato">🗑️</button></td></tr>`;
  }
  h+='</tbody></table></div>';box.innerHTML=h;
}

function verDet(id){window.detId=id;go('detail');}

function purgeDB(){
  if(!window.DB.length){toast('Base vacía','er');return;}
  if(!confirm('⚠️ ¿Eliminar TODOS los contratos ('+window.DB.length+')? Esta acción no se puede deshacer.'))return;
  if(!confirm('Confirmá por segunda vez: se borrarán '+window.DB.length+' contratos permanentemente.'))return;
  window.DB=[];save();renderList();updNav();toast('Base de datos vaciada','ok');
}

// DETAIL


function renderTarSection(c){
  const tars=(c.tarifarios||[]);
  if(!tars.length){
    return `<div class="empty"><div class="ei">📋</div><p>Sin listas de precios registradas</p></div>`;
  }
  let tabs='';
  tars.forEach((t,idx)=>{
    const label = `${esc(t.name||('Tabla '+(idx+1)))}${t.enmNum?` · Enm.${t.enmNum}`:''}${t.period?` · ${formatMonth(t.period)}`:''}`;
    tabs += `<div class="tar-tab ${idx===0?'act':''}" data-i="${idx}" onclick="showTarTab(${idx})">${label}</div>`;
  });
  let panes='';
  tars.forEach((t,idx)=>{
    const cols=t.cols||[]; const rows=t.rows||[];
    const th = cols.map(c=>`<th>${esc(c)}</th>`).join('');
    const body = rows.length ? rows.map(r=>`<tr>${cols.map((_,ci)=>`<td>${esc(r[ci]??'')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(cols.length,1)}" style="text-align:center;color:var(--g500);padding:12px">Tabla vacía</td></tr>`;
    panes += `<div class="tar-pane" id="tarPane_${idx}" style="display:${idx===0?'block':'none'}"><div class="tar-wrap"><div class="tar-actions"><span class="tar-period-tag">${esc(t.name||'Tabla')}</span>${t.enmNum?`<span class="tar-period-tag neutral">Enm.${t.enmNum}</span>`:''}${t.period?`<span class="tar-period-tag neutral">${formatMonth(t.period)}</span>`:''}${t.sourceTableName?`<span class="tar-period-tag neutral">Base: ${esc(t.sourceTableName)}</span>`:''}</div><div class="tar-preview"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div></div></div>`;
  });
  return `<div class="tar-tabs">${tabs}</div>${panes}
    <div style="margin-top:12px">
      <button class="btn btn-d btn-sm" onclick="resetSection('tarifarios')">🗑 Reset Tarifarios</button>
    </div>`;
}
function showTarTab(i){ document.querySelectorAll('.tar-tab').forEach((e,idx)=>e.classList.toggle('act', idx===i)); document.querySelectorAll('.tar-pane').forEach((e,idx)=>e.style.display = idx===i?'block':'none'); }

function renderDossierHtml(c){
  var enms=c.enmiendas||[],tars=c.tarifarios||[],aves=c.aves||[];
  var licit=(typeof LICIT_DB!=='undefined'?LICIT_DB:[]).find(function(l){return l.contrato===c.num;})||null;
  var _e=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  var _m=function(n){if(!n&&n!==0)return '\u2014';return new Intl.NumberFormat('es-AR',{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(n));};
  var _d=function(s){if(!s)return '\u2014';var p=s.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:s;};
  var chk=function(v){return v!==false?'<div class="chkb on">&#10003;</div>':'<div class="chkb">&#10003;</div>';};
  var avePoly=aves.filter(function(a){return a.tipo==='POLINOMICA';}).reduce(function(s,a){return s+(a.monto||0);},0);
  var aveOwner=aves.filter(function(a){return a.tipo==='OWNER';}).reduce(function(s,a){return s+(a.monto||0);},0);
  var totalConAVE=(c.monto||0)+avePoly+aveOwner;
  var tcc=c.tc||1;
  var tipoLabel=(c.tcontr||c.tipo||'').toUpperCase().indexOf('ENMIEND')>=0?'Amendment':'New Contract';
  var nPartic=licit?(licit.oferentes||[]).length:'\u2014';
  var nOfrs=licit?(licit.oferentes||[]).filter(function(o){return o.cotizo!==false;}).length:'\u2014';
  var docAriba=c.ariba||(licit&&licit.docAriba)||'\u2014';
  var ofrs=licit&&licit.oferentes&&licit.oferentes.length?licit.oferentes:[];
  function row(lbl,val){return '<div class="fr"><div class="fl">'+lbl+'</div><div class="fv">'+val+'</div></div>';}
  var enmRows=enms.length?enms.map(function(e,i){var t=e.tipo||'otro';var tc2=t==='ACTUALIZACION_TARIFAS'?'tar':t==='EXTENSION'?'ext':t==='SCOPE'?'scope':t==='CLAUSULAS'?'claus':'otro';return '<tr><td>'+(i+1)+'</td><td>'+_e(e.num)+'</td><td>'+_d(e.fecha)+'</td><td><span class="tag '+tc2+'">'+_e(t)+'</span></td><td>'+_e(e.descripcion||'\u2014')+'</td><td class="mono">'+((e.monto||0)>0?_m(e.monto)+' '+_e(c.mon||'ARS'):'\u2014')+'</td></tr>';}).join(''):'<tr><td colspan="6" class="empty-cell">Sin enmiendas registradas</td></tr>';
  var tarRows=tars.length?tars.map(function(t){return '<tr><td>'+_e(t.name||'\u2014')+'</td><td>'+_e(t.period||'\u2014')+'</td><td>'+((t.rows||[]).length)+' \u00edtems</td><td>'+_e(t.sourceTableName||'\u2014')+'</td></tr>';}).join(''):'<tr><td colspan="4" class="empty-cell">Sin tarifarios registrados</td></tr>';
  var aveRows=aves.length?aves.slice().sort(function(a,b){return new Date(a.fecha)-new Date(b.fecha);}).map(function(a){return '<tr><td><span class="tag '+(a.tipo==='POLINOMICA'?'poly':'owner')+'">'+(a.tipo==='POLINOMICA'?'&#x1F504; Polin\u00f3mica':'&#x1F535; Owner')+'</span>'+(a.autoGenerated?'<span class="tag auto" style="margin-left:4px">AUTO</span>':'')+'</td><td>'+_d(a.fecha)+'</td><td>'+_e(a.periodo||'\u2014')+'</td><td class="mono">+ '+_m(a.monto||0)+' '+_e(c.mon||'ARS')+'</td><td>'+_e(a.concepto||'\u2014')+'</td></tr>';}).join(''):'<tr><td colspan="5" class="empty-cell">Sin AVEs registrados</td></tr>';
  var ofrsHtml=ofrs.length?ofrs.map(function(o,i){var cotizo=o.cotizo!==false;return '<div class="ofr-row"><span class="ofr-num">'+(i+1)+'</span><span class="ofr-name">'+_e(o.nombre||o.name||String(o))+'</span>'+(cotizo?'<span class="otag si">Cotiz\u00f3</span>':'<span class="otag no">No cotiz\u00f3</span>')+'</div>';}).join(''):(c.oferentes?'<div style="font-size:10px;color:#374151;padding:4px 0">'+_e(c.oferentes)+'</div>':'<div class="empty-cell" style="padding:8px 0">Sin oferentes registrados</div>');
  var newEndDate=enms.length&&enms[enms.length-1].fechaFinNueva?_d(enms[enms.length-1].fechaFinNueva):'\u2014';
  var CSS='*{box-sizing:border-box;margin:0;padding:0}body{font-family:\'Inter\',\'Segoe UI\',Arial,sans-serif;font-size:10px;color:#1a2433;background:#dde1e7;padding:20px}.page{background:#fff;max-width:1120px;margin:0 auto 24px;box-shadow:0 6px 24px rgba(0,0,0,.18)}.hdr{background:#003875;color:#fff;display:flex;align-items:stretch;min-height:62px}.hdr-badge{background:#FF6900;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);padding:10px 8px;font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;display:flex;align-items:center;justify-content:center;min-width:32px;flex-shrink:0}.hdr-body{padding:10px 16px;flex:1}.hdr-svc{font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:rgba(255,255,255,.55);margin-bottom:2px}.hdr-title{font-size:15px;font-weight:800;line-height:1.2;margin-bottom:3px}.hdr-contr{font-size:11px;color:#66b3ff;font-weight:600}.hdr-right{padding:10px 14px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:3px;flex-shrink:0}.te-lg{font-size:14px;font-weight:900;letter-spacing:-.3px;color:#fff}.te-lg em{color:#FF6900;font-style:normal}.mg{display:grid;grid-template-columns:1fr 185px 205px;border:1px solid #c5cad4;border-top:none}.fr{display:grid;grid-template-columns:115px 1fr;border-bottom:1px solid #e4e8ee;min-height:21px}.fr:last-child{border-bottom:none}.fl{background:#f5f7fa;padding:3px 7px;font-size:8px;font-weight:700;color:#4b5563;border-right:1px solid #e4e8ee;display:flex;align-items:center;text-transform:uppercase;letter-spacing:.2px}.fv{padding:3px 7px;font-size:10px;display:flex;align-items:center;gap:4px}.amt{padding:6px 8px;background:#f0f4f8;border-top:1px solid #e4e8ee}.amt-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid #e8ecf0}.amt-row:last-child{border-bottom:none}.albl{font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:.2px}.aval{font-weight:700;font-family:monospace;font-size:10px;color:#003875}.ausd{font-size:8px;color:#9ca3af;font-family:monospace}.ecol{border-right:1px solid #c5cad4;display:flex;flex-direction:column}.csec{border-bottom:1px solid #e4e8ee}.ctit{background:#003875;color:#fff;padding:4px 8px;font-size:8px;font-weight:700;letter-spacing:.4px;text-transform:uppercase}.eval-row{display:flex;align-items:center;gap:7px;padding:3px 8px;border-bottom:1px solid #f0f0f0;font-size:9.5px}.eval-row:last-child{border-bottom:none}.chkb{width:14px;height:14px;border:1.5px solid #9ca3af;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;color:transparent}.chkb.on{background:#003875;border-color:#003875;color:#fff}.dd-box{padding:5px 8px}.dd-grid{display:grid;grid-template-columns:1fr 52px;gap:2px}.dd-lh{font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280}.dd-v{font-size:10px;font-weight:600;color:#003875}.dd-d{font-size:10px;font-weight:700;color:#FF6900;text-align:right}.aveg{display:grid;grid-template-columns:40px 1fr 1fr}.aveh{background:#003875;color:#fff;padding:3px 5px;font-size:7.5px;font-weight:700;text-transform:uppercase;border-right:1px solid rgba(255,255,255,.15)}.aveh:last-child{border-right:none}.avec{padding:2px 5px;border-bottom:1px solid #f0f0f0;border-right:1px solid #ececec;font-family:monospace;font-size:9px;display:flex;align-items:center}.avec.l{font-family:inherit;font-weight:600;color:#374151;background:#fafafa;font-size:8.5px}.avec.tot{background:#f0f4f8;font-weight:800;border-top:1.5px solid #c5cad4}.xr{padding:3px 8px;font-size:8px;color:#6b7280;border-top:1px solid #e4e8ee}.dcol{display:flex;flex-direction:column}.dhdr{background:#003875;color:#fff;padding:4px 8px;font-size:8.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}.dbody{padding:8px;flex:1;display:flex;flex-direction:column;gap:6px}.dp{display:flex;gap:7px;align-items:flex-start;padding:5px;background:#f5f7fa;border-radius:6px;border:1px solid #e4e8ee}.dav{width:38px;height:38px;border-radius:7px;background:linear-gradient(135deg,#003875,#004a94);display:flex;align-items:center;justify-content:center;font-size:18px;color:rgba(255,255,255,.65);flex-shrink:0}.drl{font-size:7.5px;text-transform:uppercase;font-weight:700;color:#6b7280;letter-spacing:.3px;margin-bottom:1px}.dnm{font-size:11px;font-weight:800;color:#003875;line-height:1.2}.te-inline{font-size:12px;font-weight:900;letter-spacing:-.3px;color:#003875;margin:4px 0;text-align:right}.te-inline em{color:#FF6900;font-style:normal}.bg{display:grid;grid-template-columns:1fr 1fr 210px;border-top:2px solid #003875}.bsec{border-right:1px solid #c5cad4}.bsec:last-child{border-right:none}.btit{background:#003875;color:#fff;padding:5px 10px;font-size:8.5px;font-weight:700;letter-spacing:.3px;text-transform:uppercase}.sgl{padding:8px 12px;display:flex;flex-direction:column;gap:6px}.sr{display:flex;flex-direction:column;gap:2px;padding-bottom:5px;border-bottom:1px dashed #e4e8ee}.sr:last-child{border-bottom:none}.srl{font-size:7.5px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.3px}.srs{height:16px;border-bottom:1px solid #374151;margin-top:1px}.ofrs{border-top:1px solid #e4e8ee;display:grid;grid-template-columns:1fr 1fr}.ofb{padding:10px 14px;border-right:1px solid #e4e8ee}.ofb:last-child{border-right:none}.oftit{font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.3px;margin-bottom:5px}.ofr-row{display:flex;align-items:center;gap:6px;padding:2px 0;font-size:10px}.ofr-num{width:15px;height:15px;background:#003875;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7.5px;font-weight:800;flex-shrink:0}.ofr-name{flex:1;font-weight:500}.otag{font-size:8px;font-weight:700;padding:1px 6px;border-radius:99px}.otag.si{background:#dcfce7;color:#166534}.otag.no{background:#fef2f2;color:#991b1b}.com-bar{padding:8px 14px;font-size:10px;color:#374151;line-height:1.5;border-top:1px solid #e4e8ee}.cbl{font-weight:700;color:#003875;margin-right:4px}.sumbar{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:2px solid #003875}.sc{padding:10px 14px;border-right:1px solid #e4e8ee}.sc:last-child{border-right:none}.slbl{font-size:7.5px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.3px;margin-bottom:3px}.sval{font-size:13px;font-weight:800;color:#003875;font-family:monospace;word-break:break-all}.sval.g{color:#059669}.sval.o{color:#d97706}.ssub{font-size:8.5px;color:#9ca3af;margin-top:1px}.sh{background:#003875;color:#fff;padding:8px 16px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px;border-top:1px solid rgba(255,255,255,.1)}.sh .ico{font-size:14px}.sh .ct{font-size:10px;font-weight:400;opacity:.65;margin-left:4px}table{width:100%;border-collapse:collapse}th{background:#f0f4f8;padding:5px 10px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#374151;text-align:left;border-bottom:2px solid #c5cad4;border-right:1px solid #e4e8ee}th:last-child{border-right:none}td{padding:5px 10px;font-size:10px;border-bottom:1px solid #f0f0f0;border-right:1px solid #f0f0f0;vertical-align:top;color:#1a2433}td:last-child{border-right:none}tr:nth-child(even) td{background:#fafbfc}.empty-cell{padding:14px;text-align:center;color:#9ca3af;font-style:italic;font-size:10px}.tag{display:inline-flex;align-items:center;padding:2px 7px;border-radius:99px;font-size:8px;font-weight:700}.tag.tar{background:#d1fae5;color:#065f46}.tag.ext{background:#dbeafe;color:#1e40af}.tag.scope{background:#fef3c7;color:#92400e}.tag.claus{background:#ede9fe;color:#5b21b6}.tag.otro{background:#f1f5f9;color:#475569}.tag.poly{background:#fef3c7;color:#92400e}.tag.owner{background:#dbeafe;color:#1e40af}.tag.auto{background:#e0f2fe;color:#0369a1;margin-left:4px}.mono{font-family:monospace;font-size:9.5px}.div-sep{height:2px;background:#f0f4f8}.pbtn{position:fixed;bottom:20px;right:20px;background:#FF6900;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(255,105,0,.35);display:flex;align-items:center;gap:6px;z-index:999}.pbtn:hover{background:#cc5400}@media print{body{background:#fff;padding:0}.pbtn{display:none!important}.page{box-shadow:none;max-width:none;margin-bottom:0;page-break-after:always}.page:last-child{page-break-after:auto}@page{margin:1cm}}';

  var aveCells='<div class="avec l">AVE 1</div><div class="avec">0 ARS</div><div class="avec">0 ARS</div><div class="avec l">AVE 2</div><div class="avec">0 ARS</div><div class="avec">0 ARS</div><div class="avec l">AVE 3</div><div class="avec">0 ARS</div><div class="avec">0 ARS</div><div class="avec l">AVE 4</div><div class="avec">0 ARS</div><div class="avec">0 ARS</div><div class="avec l">AVE 5</div><div class="avec">0 ARS</div><div class="avec">0 ARS</div><div class="avec l">AVE 6</div><div class="avec">0 ARS</div><div class="avec">0 ARS</div>';

  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>DUET \u2014 '+_e(c.num)+' \u2014 '+_e(c.cont)+'</title>'
+'<style>'+CSS+'</style></head><body>'
+'<button class="pbtn" onclick="window.print()">&#x1F5A8; Imprimir / PDF</button>'
+'<div class="page">'
+'<div class="hdr"><div class="hdr-badge">'+tipoLabel+'</div>'
+'<div class="hdr-body"><div class="hdr-svc">Servicio</div>'
+'<div class="hdr-title">'+_e(c.det||'Sin descripci\u00f3n')+'</div>'
+'<div class="hdr-contr">Contractor: '+_e(c.cont||'\u2014')+'</div></div>'
+'<div class="hdr-right"><div class="te-lg">Total<em>Energies</em></div>'
+'<div style="font-size:8px;color:rgba(255,255,255,.45)">DUET \u00b7 '+_e(c.num||'\u2014')+'</div></div></div>'
+'<div class="mg">'
+'<div>'
+row('PR # (if applies)',_e(c.fax||'\u2014'))
+row('Metier',_e(c.tcontr||'\u2014'))
+row('UTE',_e(c.asset||c.own||'APE + SR'))
+row('Contract #','<strong>'+_e(c.num||'\u2014')+'</strong>')
+row('Validity start',_d(c.fechaIni))
+row('Validity end',_d(c.fechaFin))
+row('New end date',newEndDate)
+row('Amendment',enms.length?enms.length+' enmienda(s)':'\u2014')
+row('Derogations',c.dg?'YES':'NO')
+row('E-sourcing #',_e(docAriba))
+row('Participants',String(nPartic))
+row('Offers received',String(nOfrs))
+row('Simultaneous opening','YES')
+row('Best price','YES')
+'<div class="amt">'
+'<div class="amt-row"><span class="albl">Header value</span><span class="aval">'+_m(c.monto)+' '+_e(c.mon||'ARS')+'</span><span class="ausd">'+_m(Math.round(c.monto/tcc))+' USD eq</span></div>'
+'<div class="amt-row"><span class="albl">Remaining value</span><span class="aval">\u2014 '+_e(c.mon||'ARS')+'</span><span class="ausd">0 USD eq</span></div>'
+'<div class="amt-row" style="border-top:1px solid #d4d8df;margin-top:3px;padding-top:3px"><span class="albl">AVE (if applies)</span><span class="aval">'+(avePoly+aveOwner>0?_m(avePoly+aveOwner)+' '+_e(c.mon||'ARS'):'\u2014')+'</span><span class="ausd">'+(avePoly+aveOwner>0?_m(Math.round((avePoly+aveOwner)/tcc))+' USD eq':'\u2014')+'</span></div>'
+'<div class="amt-row"><span class="albl">New header value</span><span class="aval" style="color:#059669">'+_m(totalConAVE)+' '+_e(c.mon||'ARS')+'</span><span class="ausd">'+_m(Math.round(totalConAVE/tcc))+' USD eq</span></div>'
+'<div class="amt-row"><span class="albl">New remaining value</span><span class="aval">\u2014 '+_e(c.mon||'ARS')+'</span><span class="ausd">0 USD eq</span></div>'
+'</div>'
+row('Justification','<span style="font-style:italic;color:#9ca3af;font-size:9px">'+(c.com?_e(c.com):'\u2014')+'</span>')
+'</div>'
+'<div class="ecol">'
+'<div class="csec"><div class="ctit">Evaluation</div>'
+'<div class="eval-row">'+chk(c.dd)+'<span>DD / Pre-risk</span></div>'
+'<div class="eval-row">'+chk(c.pr)+'<span>E-valuarte</span></div>'
+'<div class="eval-row">'+chk(c.sq)+'<span>Sequana</span></div>'
+'<div class="eval-row">'+chk(false)+'<span>Sustainability</span></div>'
+'</div>'
+'<div class="csec dd-box"><div class="dd-grid">'
+'<div class="dd-lh">Due Dates</div><div class="dd-lh" style="text-align:right">Days to DD</div>'
+'<div class="dd-v">'+_d(c.fev)+'</div><div class="dd-d">\u2014</div>'
+'</div></div>'
+'<div class="csec"><div class="ctit">AVE &nbsp;CC &nbsp;Poly</div>'
+'<div class="aveg"><div class="aveh">Item</div><div class="aveh">CC</div><div class="aveh">Poly</div>'
+aveCells
+'<div class="avec l tot">Total</div><div class="avec tot">0 ARS</div><div class="avec tot">0 ARS</div>'
+'</div></div>'
+'<div class="xr">Exchange rate '+_m(tcc)+' | 0 USD eq | 0 USD eq</div>'
+'</div>'
+'<div class="dcol"><div class="dhdr">DUET</div>'
+'<div class="dbody">'
+'<div style="font-size:7.5px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.3px">Contract Manager</div>'
+'<div class="dp"><div class="dav">&#x1F464;</div><div><div class="drl">Contract Manager</div><div class="dnm">'+_e(c.resp||'\u2014')+'</div></div></div>'
+'<div class="te-inline">Total<em>Energies</em></div>'
+'<div class="dp"><div><div class="drl">Administrator</div><div class="dnm">'+_e(c.rtec||'\u2014')+'</div></div></div>'
+'<div class="dp" style="margin-top:auto;border-color:#14303a;background:#f0f4f8"><div><div class="drl">Contractor</div><div class="dnm" style="font-size:12px">'+_e(c.cont||'\u2014')+'</div>'+(c.vend?'<div style="font-size:9px;color:#6b7280;font-family:monospace">'+_e(c.vend)+'</div>':'')+'</div></div>'
+'</div></div>'
+'</div>'
+'<div class="bg">'
+'<div class="bsec"><div class="btit">Contracting Strategy</div><div>'
+row('Strategy',_e(c.cprov||'RFQ'))+row('CC',_e(c.cc||'\u2014'))+row('CC MoM',_e(c.cof||'\u2014'))+row('CatMan','\u2014')+row('JOA obligations','\u2014')+row('Responses received',String(nOfrs))
+'</div></div>'
+'<div class="bsec"><div class="btit">Recommendation to Award</div><div style="padding:8px 12px">'
+'<div style="font-size:11px;font-weight:800;color:#14303a;margin-bottom:3px">'+_e(c.cont||'\u2014')+'</div>'
+(c.vend?'<div style="font-size:9px;color:#6b7280;font-family:monospace">'+_e(c.vend)+'</div>':'')
+row('CC','\u2014')+row('JOA obligations','\u2014')
+'</div></div>'
+'<div class="bsec"><div class="btit">Signatures</div><div class="sgl">'
+'<div class="sr"><div class="srl">Lead Buyer</div><div class="srs"></div></div>'
+'<div class="sr"><div class="srl">Head of Domain</div><div class="srs"></div></div>'
+'<div class="sr"><div class="srl">C&amp;P Manager</div><div class="srs"></div></div>'
+'<div class="sr"><div class="srl">C&amp;P Manager</div><div class="srs"></div></div>'
+'</div></div>'
+'</div>'
+(c.com?'<div class="com-bar"><span class="cbl">Comments:</span>'+_e(c.com)+'</div>':'')
+'<div class="ofrs">'
+'<div class="ofb"><div class="oftit">Oferentes invitados</div>'+ofrsHtml+'</div>'
+'<div class="ofb"><div class="oftit">Aprobados t\u00e9cnicamente</div>'
+'<div style="font-size:10px;color:#374151;padding:4px 0">'+(c.oferentes?_e(c.oferentes):'\u2014')+'</div></div>'
+'</div>'
+'</div>'
+'<div class="page">'
+'<div class="sumbar">'
+'<div class="sc"><div class="slbl">Contrato N\u00b0</div><div class="sval" style="font-size:11px">'+_e(c.num||'\u2014')+'</div><div class="ssub">'+_e(c.cont||'\u2014')+'</div></div>'
+'<div class="sc"><div class="slbl">Valor Header</div><div class="sval">'+_m(c.monto)+'</div><div class="ssub">'+_e(c.mon||'ARS')+' \u00b7 TC '+_m(tcc)+'</div></div>'
+'<div class="sc"><div class="slbl">Valor Total c/AVEs</div><div class="sval g">'+_m(totalConAVE)+'</div><div class="ssub">'+_e(c.mon||'ARS')+'</div></div>'
+'<div class="sc"><div class="slbl">Vigencia</div><div class="sval o" style="font-size:11px">'+_d(c.fechaIni)+' \u2192 '+_d(c.fechaFin)+'</div><div class="ssub">'+(c.plazo_meses||c.plazo?(c.plazo_meses||c.plazo)+' meses':'\u2014')+'</div></div>'
+'</div>'
+'<div class="sh"><span class="ico">&#x1F4CB;</span>Enmiendas<span class="ct">'+enms.length+' registradas</span></div>'
+'<table><thead><tr><th>#</th><th>N\u00b0 Enm.</th><th>Fecha</th><th>Tipo</th><th>Descripci\u00f3n</th><th>Monto</th></tr></thead><tbody>'+enmRows+'</tbody></table>'
+'<div class="div-sep"></div>'
+'<div class="sh"><span class="ico">&#x1F4B2;</span>Listas de Precios / Tarifarios<span class="ct">'+tars.length+' tablas</span></div>'
+'<table><thead><tr><th>Nombre</th><th>Per\u00edodo</th><th>\u00cdtems</th><th>Origen</th></tr></thead><tbody>'+tarRows+'</tbody></table>'
+'<div class="div-sep"></div>'
+'<div class="sh"><span class="ico">&#x1F4CA;</span>Historial de AVEs<span class="ct">'+aves.length+' registrados \u00b7 Total: '+_m(avePoly+aveOwner)+' '+_e(c.mon||'ARS')+'</span></div>'
+'<table><thead><tr><th>Tipo</th><th>Fecha</th><th>Per\u00edodo</th><th>Monto</th><th>Concepto</th></tr></thead><tbody>'+aveRows+'</tbody></table>'
+'</div>'
+'</body></html>';
}
function openDossier(){ const c=window.DB.find(x=>x.id===window.detId); if(!c){toast('No se encontró el contrato','er');return;} const w=window.open('','_blank'); if(!w){toast('Bloqueador de pop-ups activo','er');return;} w.document.open(); w.document.write(renderDossierHtml(c)); w.document.close(); }

async function exportDossierXls(){
  const c=window.DB.find(x=>x.id===window.detId);
  if(!c){toast('No se encontró el contrato','er');return;}
  if(typeof XLSX==='undefined'){toast('Librería XLSX no disponible','er');return;}

  const enms=c.enmiendas||[], aves=c.aves||[], tars=c.tarifarios||[];
  const licit=(typeof LICIT_DB!=='undefined'?LICIT_DB:[]).find(l=>l.contrato===c.num)||null;
  const _d=s=>{if(!s)return '';const p=s.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:s;};
  const avePoly=aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
  const aveOwner=aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const totalConAVE=(c.monto||0)+avePoly+aveOwner;
  const tcc=c.tc||1;
  const nPartic=licit?(licit.oferentes||[]).length:0;
  const nOfrs=licit?(licit.oferentes||[]).filter(o=>o.cotizo!==false).length:0;
  const docAriba=c.ariba||(licit&&licit.docAriba)||'';
  const tipoLabel=(c.tcontr||c.tipo||'').toUpperCase().indexOf('ENMIEND')>=0?'Amendment':'New Contract';
  const ofrs=licit&&licit.oferentes&&licit.oferentes.length?licit.oferentes:[];

  // Fetch template to preserve formatting
  let wb;
  try {
    const base=location.pathname.replace(/\/[^/]*$/,'/')||'/';
    const resp=await fetch(base+'Dossier%20TRANSPORTES%20CREXELL.xlsx');
    if(!resp.ok) throw new Error('template '+resp.status);
    const buf=await resp.arrayBuffer();
    wb=XLSX.read(new Uint8Array(buf),{type:'array',cellStyles:true});
  } catch(e) {
    toast('No se pudo cargar plantilla: '+e.message,'er');
    return;
  }

  // Helper: set cell value keeping style intact
  const ws=wb.Sheets[wb.SheetNames[0]];
  function setCell(addr, val, type){
    const t=type||(typeof val==='number'?'n':'s');
    if(ws[addr]){ ws[addr].v=val; ws[addr].w=String(val); ws[addr].t=t; delete ws[addr].r; delete ws[addr].h; }
    else { ws[addr]={t,v:val,w:String(val)}; }
  }

  // ── Sheet1: DUET — fill template cells ───────────────────────────────────
  setCell('B3', tipoLabel);
  setCell('C4', c.det||'');
  setCell('I3', c.cont||'');
  setCell('P4', c.resp||'');
  setCell('P6', c.rtec||'');
  setCell('E6', c.tcontr||'');
  setCell('C7', c.asset||c.own||'APE + SR');
  setCell('E7', c.num||'');
  setCell('C8', _d(c.fechaIni));
  setCell('E8', _d(c.fechaFin));
  setCell('C12', docAriba);
  setCell('C13', nPartic, 'n');
  // D13: participant names
  const ofNames=ofrs.map(o=>o.nombre||o.name||String(o)).join(' / ');
  setCell('D13', ofNames||'');
  setCell('C14', nOfrs, 'n');
  // Monto header
  setCell('I11', c.monto||0, 'n');
  setCell('K11', Math.round((c.monto||0)/tcc), 'n');
  // AVE
  setCell('I13', avePoly+aveOwner, 'n');
  setCell('K13', Math.round((avePoly+aveOwner)/tcc), 'n');
  // New header value
  setCell('I14', totalConAVE, 'n');
  setCell('K14', Math.round(totalConAVE/tcc), 'n');
  setCell('I15', totalConAVE, 'n');
  setCell('K15', Math.round(totalConAVE/tcc), 'n');
  // Exchange rate
  setCell('L16', tcc, 'n');
  // AVE rows (N9:T14, up to 6 AVEs)
  const aveRows=['9','10','11','12','13','14'];
  aves.slice(0,6).forEach((a,i)=>{
    const row=aveRows[i];
    const isPoly=a.tipo==='POLINOMICA';
    setCell('O'+row, isPoly?(a.monto||0):0, 'n');
    setCell('S'+row, isPoly?0:(a.monto||0), 'n');
  });
  // AVE totals row 15
  setCell('O15', avePoly, 'n');
  setCell('S15', aveOwner, 'n');
  setCell('O16', Math.round(avePoly/tcc), 'n');
  setCell('S16', Math.round(aveOwner/tcc), 'n');
  // Contracting strategy
  setCell('C19', c.cprov||'RFQ');
  // Comments
  if(c.com) setCell('C26', c.com);
  // Oferentes (rows 29+)
  ofrs.forEach((o,i)=>{
    setCell('M'+(29+i), i+1, 'n');
    setCell('N'+(29+i), o.nombre||o.name||String(o));
  });

  // ── Enmiendas sheet (Hoja1) — replace content ────────────────────────────
  const wsEnm=XLSX.utils.aoa_to_sheet([
    ['#','N° Enmienda','Fecha','Tipo','Descripción','Monto',c.mon||'ARS'],
    ...enms.map((e,i)=>[i+1,e.num||'',_d(e.fecha),e.tipo||'',e.descripcion||'',e.monto||0,c.mon||'ARS'])
  ]);
  wsEnm['!cols']=[{wch:4},{wch:20},{wch:12},{wch:22},{wch:45},{wch:16},{wch:8}];
  // Replace Hoja1 content
  const hoja1idx=wb.SheetNames.indexOf('Hoja1');
  if(hoja1idx>=0){ wb.Sheets['Hoja1']=wsEnm; }
  else { XLSX.utils.book_append_sheet(wb,wsEnm,'Enmiendas'); }

  // ── Sheet2: AVEs ─────────────────────────────────────────────────────────
  const totAve=aves.reduce((s,a)=>s+(a.monto||0),0);
  const wsAve=XLSX.utils.aoa_to_sheet([
    ['Tipo','Fecha','Período','Monto',c.mon||'ARS','Concepto','Auto'],
    ...aves.slice().sort((a,b)=>new Date(a.fecha)-new Date(b.fecha))
      .map(a=>[a.tipo||'',_d(a.fecha),a.periodo||'',a.monto||0,c.mon||'ARS',a.concepto||'',a.autoGenerated?'SI':'NO']),
    ['TOTAL','','',totAve,c.mon||'ARS','','']
  ]);
  wsAve['!cols']=[{wch:14},{wch:12},{wch:12},{wch:16},{wch:8},{wch:35},{wch:6}];
  const sheet2idx=wb.SheetNames.indexOf('Sheet2');
  if(sheet2idx>=0){ wb.Sheets['Sheet2']=wsAve; wb.SheetNames[sheet2idx]='AVEs'; }
  else { XLSX.utils.book_append_sheet(wb,wsAve,'AVEs'); }

  const fname='DUET_'+(c.num||'contrato').replace(/[/\\?%*:|"<>]/g,'_')+'.xlsx';
  XLSX.writeFile(wb,fname);
  toast('📊 XLS exportado: '+fname,'ok');
}

function renderDet(){
  try {
    const c=window.DB.find(x=>x.id===window.detId);if(!c){go('list');return;}
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const fin=new Date((c.fechaFin||'1970-01-01')+'T00:00:00'),isA=fin>=hoy;
    const aves=c.aves||[],enms=c.enmiendas||[];
    const avePoly=aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
    const aveOwner=aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
    
    // Usar montoBase guardado, o calcularlo si no existe (contratos viejos)
    const montoBase = c.montoBase || ((c.monto||0) - avePoly - aveOwner);
    const tot = montoBase + avePoly + aveOwner;
    
    const consumed=getConsumed(c.num),hasC=consumed!==null,rem=hasC?tot-consumed:null;

    // ── Burn rate / proyección financiera ──────────────────────────────────────
    const burn=(function(){
      try{
        if(!hasC || !c.fechaIni || !c.fechaFin) return null;
        const today=new Date(); today.setHours(0,0,0,0);
        const ini=new Date(c.fechaIni+'T00:00:00');
        const finC=new Date(c.fechaFin+'T00:00:00');
        const totalMonths=monthDiffInclusive(c.fechaIni,c.fechaFin)||0;
        const todayYmd=today.toISOString().substring(0,10);
        let elapsedMonths=monthDiffInclusive(c.fechaIni, todayYmd);
        if(today<ini) elapsedMonths=0;
        if(today>finC) elapsedMonths=totalMonths;
        elapsedMonths=Math.max(0,Math.min(elapsedMonths,totalMonths));
        if(elapsedMonths<1) return null;
        const remMonthsContract=Math.max(totalMonths-elapsedMonths,0);
        const remAmount=Math.max(tot-consumed,0);
        const histRunRate=consumed/elapsedMonths;
        if(!isFinite(histRunRate)||histRunRate<=0) return null;

        // Factor de precio mes a mes (acumulado desde inicio): refleja redeterminaciones aplicadas
        const enmsApplied=(c.enmiendas||[]).filter(e=>e.tipo==='ACTUALIZACION_TARIFAS'&&!e.superseded&&e.pctPoli)
          .map(e=>({ym:e.nuevoPeriodo||'', pct:Number(e.pctPoli)||0}))
          .filter(e=>e.ym).sort((a,b)=>a.ym.localeCompare(b.ym));
        const startYm=(c.fechaIni||'').substring(0,7);
        const todayYm=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
        let factor=1, sumFactor=0, monthsCounted=0, ei=0, cur=startYm;
        while(cur && cur<=todayYm){
          while(ei<enmsApplied.length && enmsApplied[ei].ym<=cur){ factor*=(1+enmsApplied[ei].pct); ei++; }
          sumFactor+=factor; monthsCounted++;
          cur=nextYm(cur); if(!cur) break;
        }
        const avgFactor=monthsCounted>0?sumFactor/monthsCounted:1;
        const todayFactor=factor;
        const scaleToToday=avgFactor>0?(todayFactor/avgFactor):1;
        const runRate=histRunRate*scaleToToday;
        const monthsToExhaust=remAmount/runRate;
        const exhaustDate=new Date(today); exhaustDate.setDate(15);
        exhaustDate.setMonth(exhaustDate.getMonth()+Math.round(monthsToExhaust));
        const margin=monthsToExhaust-remMonthsContract;

        // % polinómico pendiente desde último base hasta hoy
        let pendingPolyPct=null;
        try{
          if(Array.isArray(c.poly) && c.poly.length && typeof computeAccumulatedVariationPct==='function'){
            const baseYm = c.btar || (c.fechaIni||'').substring(0,7);
            const evalYm = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
            if(baseYm && evalYm > baseYm){
              let ko=0, hasAny=false;
              c.poly.forEach(function(comp){
                const inc=comp.inc||0, idx=comp.idx||'';
                if(!idx||!inc){ ko+=inc; return; }
                const v=computeAccumulatedVariationPct(idx,baseYm,evalYm);
                if(v && isFinite(v.pct)){ ko+=inc*(1+v.pct/100); hasAny=true; }
                else ko+=inc;
              });
              if(hasAny) pendingPolyPct=(ko-1)*100;
            }
          }
        }catch(e){ console.warn('pendingPoly',e); }

        // Run rate proyectado con redeterminación pendiente aplicada al consumo futuro
        const runRateProj = (pendingPolyPct!=null) ? runRate*(1+pendingPolyPct/100) : runRate;
        const monthsToExhaustProj = runRateProj>0 ? remAmount/runRateProj : monthsToExhaust;
        const exhaustDateProj = new Date(today); exhaustDateProj.setDate(15);
        exhaustDateProj.setMonth(exhaustDateProj.getMonth()+Math.round(monthsToExhaustProj));
        const marginProj = monthsToExhaustProj-remMonthsContract;

        // Semáforo basado en escenario más conservador (con redeterminación si la hay)
        const decisiveMargin = (pendingPolyPct!=null && pendingPolyPct>0.5) ? marginProj : margin;
        let status='green', emoji='🟢', label='Alcanza con margen';
        if(remAmount<=0){ status='red'; emoji='🔴'; label='Monto agotado'; }
        else if(decisiveMargin<0){ status='red'; emoji='🔴'; label='No alcanza al fin'; }
        else if(decisiveMargin<3){ status='yellow'; emoji='🟡'; label='Ajustado'; }

        return { runRate, histRunRate, scaleToToday, todayFactor, avgFactor, appliedCount:enmsApplied.length,
                 monthsToExhaust, exhaustDate, remMonthsContract, remAmount, elapsedMonths, totalMonths, margin, status, emoji, label, consumed, tot,
                 pendingPolyPct, runRateProj, monthsToExhaustProj, exhaustDateProj, marginProj };
      }catch(e){ console.warn('burn calc',e); return null; }
    })();
    if(burn){ window._burnCache=window._burnCache||{}; window._burnCache[c.id]=burn; }

    let enmOpts='<option value="">— Sin enmienda —</option>';
    enms.forEach(e=>enmOpts+=`<option value="${e.num}">Enm.N°${e.num} (${e.tipo||'?'})</option>`);
    
    let aveRows='',cumTV=montoBase;
    const sAves=[...aves].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
    // TC para conversión a USD (default 1000 si no hay)
    const TC_USD=(typeof getTCFromStore==='function'?getTCFromStore():null)||1000;
    const isUsdContract=(String(c.mon||'').toUpperCase().indexOf('USD')>=0);
    const toUsd=function(v){ if(!isFinite(v)) return 0; return isUsdContract?v:(TC_USD>0?(v/TC_USD):0); };
    const fmtUsd=function(v){ return 'USD '+ (Math.round(v*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); };
    if(!sAves.length)aveRows='<tr><td colspan="9" style="text-align:center;color:var(--g500);font-style:italic;padding:12px">Sin AVEs registrados</td></tr>';
    sAves.forEach(a=>{
      const prev=cumTV,newTV=cumTV+(a.monto||0);cumTV=newTV;
      const isPoly=a.tipo==='POLINOMICA';
      const subtipoLabel=isPoly?'🔄 Polinómica':(a.subtipo==='EXTENSION PLAZO'?'📅 Ext.Plazo':a.subtipo==='ACTUALIZACION TARIFAS'?'💰 Act.Tar':a.subtipo==='SCOPE MAYOR'?'🔧 +Scope':a.subtipo==='SCOPE MENOR'?'📉 -Scope':a.subtipo==='CLAUSULAS'?'📋 Cláusulas':a.subtipo||'💬 Owner');
      const aveUsd=toUsd(a.monto||0);
      const valBadge = (isPoly && a.aicValidated) ? '<span class="bdg" style="background:#16a34a;color:#fff;font-size:8.5px;margin-left:3px" title="AIC validado '+fD((a.aicValidationDate||'').substring(0,10))+'">✓ AIC</span>' : (!isPoly && a.ccValidated) ? '<span class="bdg" style="background:#16a34a;color:#fff;font-size:8.5px;margin-left:3px" title="CC validado '+fD((a.ccValidationDate||'').substring(0,10))+'">✓ CC</span>' : '';
      const rowOpacity = ((isPoly && a.aicValidated) || (!isPoly && a.ccValidated)) ? 'opacity:.62' : '';
      aveRows+=`<tr style="${rowOpacity}">
        <td><span class="bdg ${isPoly?'poly':'owner'}">${isPoly?'POLI':'OWNER'}</span>${a.autoGenerated?'<span class="bdg auto-b" style="margin-left:3px">AUTO</span>':''}${valBadge}</td>
        <td class="mono" style="font-size:11px">${a.enmRef?'Enm.'+a.enmRef:'—'}</td>
        <td>${a.periodo||'—'}</td>
        <td class="mono">${fN(prev)}</td>
        <td class="mono" style="font-weight:700;color:${isPoly?'#92400e':'var(--b500)'}">+${fN(a.monto||0)}</td>
        <td class="mono" style="font-size:11px;color:var(--g600c)" title="Equivalente USD a TC ${fN(TC_USD)}">${fmtUsd(aveUsd)}</td>
        <td class="mono" style="font-weight:700">${fN(newTV)}</td>
        <td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.concepto||subtipoLabel)}</td>
        <td><button class="btn btn-d btn-sm" onclick="delAveById('${a.id}')">🗑️</button></td>
      </tr>`;
    });
    let enmRows='';
    if(!enms.length)enmRows='<tr><td colspan="6" style="text-align:center;color:var(--g500);font-style:italic;padding:12px">Sin enmiendas registradas</td></tr>';
    enms.forEach((e, idx)=>{
      const tc=e.tipo==='ACTUALIZACION_TARIFAS'?'tar':e.tipo==='EXTENSION'?'ext':e.tipo==='SCOPE'?'sc':e.tipo==='CLAUSULAS'?'cl':'ot';
      const tl=e.tipo==='ACTUALIZACION_TARIFAS'?'📐 Act.Tarifas':e.tipo==='EXTENSION'?'📅 Extensión':e.tipo==='SCOPE'?'🔧 Scope':e.tipo==='CLAUSULAS'?'📋 Cláusulas':'💬 Otro';
      const extra=e.tipo==='EXTENSION'&&e.fechaFinNueva?'→ '+fD(e.fechaFinNueva):e.tipo==='ACTUALIZACION_TARIFAS'&&e.pctPoli?' +'+((e.pctPoli||0)*100).toFixed(2)+'% · '+formatMonth(e.basePeriodo||'')+'→'+formatMonth(e.nuevoPeriodo||''):'';
      const corrBdg=e.correccionDeEnm?`<span class="bdg corr">CORR.ENM.${e.correccionDeEnm}</span> `:'';
      const supBdg=e.superseded?`<span class="bdg exp" style="font-size:8.5px">SUPERSEDED</span> `:'';
      enmRows+=`<tr ${e.superseded?'style="opacity:.5"':''}><td style="font-weight:700;font-size:12px">N°${e.num}</td><td>${corrBdg}${supBdg}<span class="ep ${tc}">${tl}</span></td><td style="font-size:11px">${extra}</td><td style="font-size:11px;color:var(--g500)">${fD((e.fecha||'').substring(0,10))}</td><td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.motivo||e.descripcion||'')}</td><td style="white-space:nowrap"><button class="btn btn-a btn-sm" style="padding:3px 8px;font-size:10px;margin-right:3px" onclick="openAmendmentDoc('${c.id}',${e.num})" title="Vista previa / Imprimir / PDF">📄</button><button class="btn btn-p btn-sm" style="padding:3px 8px;font-size:10px;margin-right:3px" onclick="downloadAmendmentDoc('${c.id}',${e.num})" title="Descargar Word .doc editable">📝</button><button class="btn btn-d btn-sm" style="padding:3px 8px;font-size:10px" onclick="delEnm(${e.num})">🗑</button></td></tr>`;
    });
    document.getElementById('detCard').innerHTML=`<div class="card">
      <div class="det-h">
        <div><h2>${c.num} — ${c.cont}</h2><div class="ds">${c.det||''} · ${c.tipo||''} · ${c.tcontr||''}</div></div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="bdg ${isA?'act':'exp'}" style="font-size:12px;padding:5px 14px">● ${isA?'ACTIVO':'VENCIDO'}</span>
          <button class="btn btn-sm btn-a" onclick="window.copyContractAsTemplate()" title="Duplicar como template">📋 Duplicar</button>
          <button class="btn btn-s btn-sm" onclick="editCont('${c.id}')">✏️ Editar</button>
          <button class="btn btn-d btn-sm" onclick="delCont('${c.id}')" title="Eliminar contrato">🗑️ Eliminar</button>
        </div>
      </div>
      <div class="dossier">
        <div class="dossier-grid top">
          <div>
            <div class="dr"><span>Monto inicial</span><span class="dv">${c.mon||''} ${fN(montoBase)}</span></div>
            ${c.tipo==='OBRA' && c.anticipo?`<div class="dr" style="background:rgba(255,210,0,.12);border:1px solid rgba(255,210,0,.22);padding:8px 12px;border-radius:4px"><span style="font-weight:600">💼 Anticipo Financiero (${c.anticipoPct||0}%)</span><span class="dv" style="color:#fde68a">${c.mon||''} ${fN(c.anticipo||0)}</span></div>
            <div class="dr" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);padding:8px 12px;border-radius:4px"><span style="opacity:.8">🔧 Monto neto (sin anticipo)</span><span class="dv" style="opacity:.9">${c.mon||''} ${fN(montoBase-(c.anticipo||0))}</span></div>`:''}
            <div class="dr"><span>Polinómica</span><span class="dv">${c.mon||''} ${fN(avePoly)}</span></div>
            <div class="dr"><span>Owner</span><span class="dv">${c.mon||''} ${fN(aveOwner)}</span></div>
            <div class="dr sep"><span>Valor total vigente</span><span class="dv">${c.mon||''} ${fN(tot)}</span></div>
            ${c.tipo!=='OBRA'?`<div class="dr" style="background:rgba(255,255,255,.08);padding:10px 12px;border-radius:6px;margin-top:10px;border:1px solid rgba(255,255,255,.14)"><span style="font-weight:600">💰 Monto mensual estimado</span><span class="dv" style="font-size:14px">${c.mon||''} ${fN(tot/(monthDiffInclusive(c.fechaIni,c.fechaFin)||1))}</span></div>`:''}
          </div>
          <div>
            <div class="dr"><span>Inicio</span><span class="dv">${fD(c.fechaIni||'')}</span></div>
            <div class="dr"><span>Fin</span><span class="dv">${fD(c.fechaFin||'')}</span></div>
            <div class="dr"><span>Plazo</span><span class="dv">${monthDiffInclusive(c.fechaIni,c.fechaFin)?monthDiffInclusive(c.fechaIni,c.fechaFin)+' meses':'—'}</span></div>
            <div class="dr"><span>Responsable</span><span class="dv">${esc(c.resp||'—')}</span></div>
            <div class="dr"><span>Owner</span><span class="dv">${esc(c.own||'—')}</span></div>
            ${(c.dd||c.pr||c.sq)?`<div class="dr sep" style="margin-top:6px"><span style="font-weight:700;opacity:.7;font-size:10px;letter-spacing:.1em;text-transform:uppercase">Compliance</span><span></span></div>`:''}
            ${c.dd&&c.dd!==true?`<div class="dr"><span>Due Diligence</span><span class="dv" style="color:${new Date(c.dd+'T00:00:00')<new Date()?'#fca5a5':'#86efac'}">${fD(c.dd)}${new Date(c.dd+'T00:00:00')<new Date()?' ⚠️':' ✓'}</span></div>`:''}
            ${c.pr&&c.pr!==true?`<div class="dr"><span>Pre-Risk</span><span class="dv" style="color:${new Date(c.pr+'T00:00:00')<new Date()?'#fca5a5':'#86efac'}">${fD(c.pr)}${new Date(c.pr+'T00:00:00')<new Date()?' ⚠️':' ✓'}</span></div>`:''}
            ${c.sq&&c.sq!==true?`<div class="dr"><span>Sequana</span><span class="dv" style="color:${new Date(c.sq+'T00:00:00')<new Date()?'#fca5a5':'#86efac'}">${fD(c.sq)}${new Date(c.sq+'T00:00:00')<new Date()?' ⚠️':' ✓'}</span></div>`:''}
            ${c.dg?`<div class="dr"><span>Derogación</span><span class="dv">Sí</span></div>`:''}
          </div>
          ${(()=>{
            if(c.tipo!=='OBRA'||!c.fechaIni||!c.fechaFin) return '';
            const ini=new Date(c.fechaIni+'T00:00:00'), fin=new Date(c.fechaFin+'T00:00:00'), hoy=new Date();
            hoy.setHours(0,0,0,0);
            const total=fin-ini, elapsed=Math.min(Math.max(hoy-ini,0),total);
            const timePct=total>0?Math.round(elapsed/total*100):0;
            const finPct=hasC&&tot>0?Math.min(Math.round(consumed/tot*100),100):null;
            const vencido=hoy>fin, activo=hoy>=ini&&hoy<=fin;
            const estado=vencido?'VENCIDO':activo?'EN CURSO':'NO INICIADO';
            const estadoColor=vencido?'#fca5a5':activo?'#86efac':'#fde68a';
            const barColor=timePct>90?'#fca5a5':timePct>60?'#fde68a':'#86efac';
            const finBarColor=finPct!==null?(finPct>90?'#fca5a5':finPct>60?'#fde68a':'#86efac'):'#86efac';
            let hw='<div style="grid-column:1/-1;margin-top:14px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:14px 18px">';
            hw+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;opacity:.55;font-weight:700">Avance de Obra</span><span style="font-size:11px;font-weight:700;color:'+estadoColor+';letter-spacing:.06em">'+estado+'</span></div>';
            hw+='<div style="display:grid;grid-template-columns:1fr'+(finPct!==null?' 1fr':'')+';gap:16px">';
            hw+='<div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px"><span style="opacity:.7">Plazo transcurrido</span><span style="font-weight:700;color:'+barColor+'">'+timePct+'%</span></div>';
            hw+='<div style="height:6px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden"><div style="height:100%;width:'+timePct+'%;background:'+barColor+';border-radius:99px;transition:width .4s"></div></div>';
            hw+='<div style="display:flex;justify-content:space-between;font-size:10px;opacity:.5;margin-top:4px"><span>'+fD(c.fechaIni)+'</span><span>'+fD(c.fechaFin)+'</span></div></div>';
            if(finPct!==null){hw+='<div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px"><span style="opacity:.7">Avance financiero</span><span style="font-weight:700;color:'+finBarColor+'">'+finPct+'%</span></div><div style="height:6px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden"><div style="height:100%;width:'+finPct+'%;background:'+finBarColor+';border-radius:99px;transition:width .4s"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;opacity:.5;margin-top:4px"><span>Consumido: '+(c.mon||'')+' '+fN(consumed)+'</span><span>Total: '+(c.mon||'')+' '+fN(tot)+'</span></div></div>';}
            hw+='</div></div>';
            return hw;
          })()}
        </div>
        <div class="dossier-bottom">
          <div class="dossier-metrics">
            <div class="dr consumed"><span>Consumido</span><span class="dv">${hasC?(c.mon||'')+' '+fN(consumed):'—'}</span></div>
            <div class="dr ${hasC && rem>=0?'rem-ok':'rem-bad'}"><span>Remanente</span><span class="dv">${hasC?(c.mon||'')+' '+fN(rem):'—'}</span></div>
          </div>
        </div>
      </div>
      ${burn?(()=>{
        const col=burn.status==='green'?'#16a34a':burn.status==='yellow'?'#d97706':'#dc2626';
        const bg=burn.status==='green'?'#f0fdf4':burn.status==='yellow'?'#fffbeb':'#fef2f2';
        const useProj=(burn.pendingPolyPct!=null && burn.pendingPolyPct>0.5);
        const showRate=useProj?burn.runRateProj:burn.runRate;
        const showExhaust=useProj?burn.exhaustDateProj:burn.exhaustDate;
        const showMargin=useProj?burn.marginProj:burn.margin;
        const exhaustStr=showExhaust.toLocaleDateString('es-AR',{month:'short',year:'numeric'});
        const finCStr=c.fechaFin?new Date(c.fechaFin+'T00:00:00').toLocaleDateString('es-AR',{month:'short',year:'numeric'}):'';
        const marginTxt=showMargin>=0?(' (+'+showMargin.toFixed(1)+'m margen)'):(' ('+Math.abs(showMargin).toFixed(1)+'m antes)');
        const pendBadge=useProj?'<span style="display:inline-block;padding:2px 7px;background:#fed7aa;color:#9a3412;border:1px solid #fb923c;border-radius:99px;font-size:10px;font-weight:700;margin-left:6px" title="Variación polinómica acumulada desde la última base tarifaria, aún no aplicada">+'+burn.pendingPolyPct.toFixed(1)+'% pendiente</span>':'';
        const scenarioLbl=useProj?'<span style="font-size:10px;color:#64748b;margin-left:4px">(c/redeterminación)</span>':'';
        return '<div style="display:flex;gap:14px;align-items:center;margin-top:14px;padding:12px 16px;background:'+bg+';border:1px solid '+col+'55;border-left:4px solid '+col+';border-radius:8px;color:#0f172a">'
          +'<span style="font-size:22px;line-height:1">'+burn.emoji+'</span>'
          +'<div style="flex:1;min-width:0">'
            +'<div style="font-weight:700;font-size:13px;color:'+col+';letter-spacing:.02em">'+burn.label+' · Burn rate'+pendBadge+'</div>'
            +'<div style="font-size:11.5px;color:#1e293b;margin-top:3px;font-family:JetBrains Mono,monospace">'
              +'Run rate: <strong style="color:#0f172a">'+(c.mon||'ARS')+' '+fN(Math.round(showRate))+'/mes</strong>'+scenarioLbl
              +' · Agota: <strong style="color:#0f172a">'+exhaustStr+'</strong>'+marginTxt
              +(finCStr?' · Fin contrato: <span style="color:#475569">'+finCStr+'</span>':'')
            +'</div>'
          +'</div>'
          +'<button class="btn btn-s btn-sm" onclick="openBurnRate(\''+c.id+'\')" title="Ver gráfico burn rate y proyección">📊 Ver detalle</button>'
        +'</div>';
      })():''}
      ${c.tipo==='OBRA'?(()=>{
        const poData=ME2N[c.num];
        const pos=poData&&Array.isArray(poData)&&Array.isArray(poData[2])?poData[2]:[];
        const totalCerts=pos.reduce((s,p)=>s+(p[3]||0),0);
        const avancePct=montoBase>0?round2((totalCerts/montoBase)*100):0;
        const remanente=Math.max(0,montoBase-totalCerts);
        return `
        <div class="sec" style="margin-top:18px">
          <div class="sh"><span class="ico">📋</span>Certificaciones / POs<span class="ct">${pos.length} registradas · Avance ${avancePct}% · Remanente ${c.mon||'ARS'} ${fN(remanente)}</span></div>
          <div style="font-size:11px;color:var(--g600c);margin:6px 0 10px;padding:8px 10px;background:var(--p50);border:1px solid var(--p200);border-radius:6px">
            ℹ️ Vista informativa de las POs del contrato. Para incluirlas en un ajuste polinómico, usá el modal <strong>📆 Elegir meses de ajuste</strong> — ahí podés tildar POs y remanente para definir el scope.
          </div>
          <table>
            <thead>
              <tr>
                <th>N° PO</th><th>Plant</th><th>Net Order Value</th><th>Pend. Fact.</th><th>Avance %</th><th>Ajustado</th>
              </tr>
            </thead>
            <tbody>
              ${pos.length===0?'<tr><td colspan="6" style="text-align:center;color:var(--g500);font-style:italic;padding:12px">Sin POs asociadas a este contrato</td></tr>':
                pos.map((p)=>{
                  const poNum=p[0]||'—';
                  const plant=p[2]||'—';
                  const nov=p[3]||0;
                  const still=p[4]||0;
                  const avPct=montoBase>0?round2((nov/montoBase)*100):0;
                  const ajustado=c.posAjustadas&&c.posAjustadas.includes(poNum);
                  const lastAdj=ajustado&&c.posAjustadasMeta?c.posAjustadasMeta[poNum]:null;
                  const ajLbl=ajustado?(lastAdj?'<span class="bdg" style="background:#16a34a;color:#fff;font-size:9px" title="Ajustada en '+esc(lastAdj.ym||'')+' · Enm.'+esc(String(lastAdj.enm||''))+(lastAdj.pct?(' · +'+Number(lastAdj.pct).toFixed(2)+'%'):'')+'">✓ '+(lastAdj.ym||'')+'</span> <button class="btn btn-d btn-sm" style="padding:1px 5px;font-size:10px;margin-left:4px" onclick="unadjustPo(\''+c.id+'\',\''+esc(poNum)+'\')" title="Quitar marca de ajustada (no revierte el AVE registrado)">↶</button>':'<span class="bdg" style="background:var(--g200);color:var(--g800);font-size:10px">✓</span> <button class="btn btn-d btn-sm" style="padding:1px 5px;font-size:10px;margin-left:4px" onclick="unadjustPo(\''+c.id+'\',\''+esc(poNum)+'\')" title="Quitar marca de ajustada (no revierte el AVE registrado)">↶</button>'):'—';
                  return `<tr>
                    <td class="mono" style="font-weight:600">${esc(poNum)}</td>
                    <td>${esc(plant)}</td>
                    <td class="mono">${c.mon||'ARS'} ${fN(nov)}</td>
                    <td class="mono" style="color:${still>0?'var(--o700)':'var(--g500)'}">${fN(still)}</td>
                    <td>${avPct}%</td>
                    <td>${ajLbl}</td>
                  </tr>`;
                }).join('')
              }
            </tbody>
          </table>
        </div>`;
      })():''}
      <div class="section-box">
        <h3>📑 Enmiendas <span class="tcnt">${enms.length} registradas</span></h3>
        <table class="enm-tbl"><thead><tr><th>#</th><th>Tipo / Concepto</th><th>Detalle</th><th>Fecha</th><th>Descripción</th><th></th></tr></thead><tbody>${enmRows}</tbody></table>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-p btn-sm" onclick="openEnmPanel()">📑 + Nueva Enmienda</button>
          ${enms.length?`<button class="btn btn-a btn-sm" onclick="openAmendmentDoc('${c.id}')" title="Generar documento de la última enmienda registrada (N°${enms[enms.length-1].num})">📄 Generar Enmienda (última)</button>`:''}
          <button class="btn btn-s btn-sm" onclick="openEnmImportPicker()">🤖 Importar PDF/DOC con IA</button>
          <button class="btn btn-d btn-sm" onclick="resetSection('enmiendas')">🗑 Reset</button>
          <input type="file" id="enmPdfIn" accept=".pdf,.docx,.doc" multiple style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" onchange="importEnmPdfs(this.files)">
        </div>
        <div class="enm-panel" id="enmPanel">
          <div class="cond-tag">📑 Nueva Enmienda — N°${enms.length+1}</div>
          <div class="fg2" style="gap:14px 18px">
            <div class="fgrp">
              <label>Concepto <span class="req">*</span></label>
              <select id="ne_tipo" onchange="onEnmTipoChange()">
                <option value="">— Seleccioná el concepto —</option>
                <option value="EXTENSION">📅 Extensión de fecha (inicio/fin)</option>
                <option value="ACTUALIZACION_TARIFAS">💰 Actualización de tarifas</option>
                <option value="CLAUSULAS">📋 Actualización de cláusulas</option>
                <option value="SCOPE">🔧 Actualización de alcance (scope)</option>
                <option value="OTRO">💬 Otro</option>
              </select>
            </div>
            <div class="fgrp">
              <label>N° Enmienda</label>
              <input type="number" id="ne_num" value="${enms.length+1}" min="1" disabled style="background:var(--g100)">
            </div>
          </div>

          <div id="enm_ext" style="display:none" class="enm-sub">
            <h4>📅 Extensión de Fecha</h4>
            <div class="info-box blue" style="margin-bottom:10px;font-size:11px">
              Fecha fin actual: <strong>${fD(c.fechaFin||'')}</strong>${c._fechaFinOriginal&&c._fechaFinOriginal!==c.fechaFin?' · Original: <strong>'+fD(c._fechaFinOriginal)+'</strong>':''}. La nueva fecha se vinculará automáticamente al contrato.
            </div>
            <div class="fg2">
              <div class="fgrp">
                <label>Tipo de extensión</label>
                <select id="ne_ext_tipo">
                  <option value="FIN">Extensión de fecha fin</option>
                  <option value="INICIO">Modificación de fecha inicio</option>
                  <option value="AMBAS">Ambas fechas</option>
                </select>
              </div>
              <div class="fgrp">
                <label>Nueva Fecha Fin <span class="req">*</span></label>
                <input type="date" id="ne_ffin" min="${c.fechaFin||''}">
              </div>
            </div>
          </div>

          <div id="enm_poly" style="display:none" class="enm-sub">
            <h4>💰 Actualización de Tarifas</h4>
            <div class="fg2" style="margin-bottom:12px">
              <div class="fgrp">
                <label>Subtipo</label>
                <select id="ne_tar_subtipo">
                  <option value="POLINOMICA">Fórmula Polinómica</option>
                  <option value="EXTRAORDINARIO">Ajuste Extraordinario</option>
                  <option value="DESCALCE">Descalce</option>
                </select>
              </div>
              <div class="fgrp">
                <label>¿Corrige enmienda anterior?</label>
                <div class="tw"><label class="tg"><input type="checkbox" id="ne_isCorr" onchange="onCorrToggle()"><span class="sl"></span></label><span class="tl" id="ne_isCorr_l">No</span></div>
              </div>
            </div>
            <div id="ne_corrGrp" style="display:none;margin-bottom:12px">
              <div class="fgrp">
                <label>Corrige Enmienda N°</label>
                <select id="ne_corrEnm" onchange="prefillCorrEnm()">
                  <option value="">—</option>
                  ${enms.filter(e=>e.tipo==='ACTUALIZACION_TARIFAS').map(e=>'<option value="'+e.num+'">N°'+e.num+' — '+(e.nuevoPeriodo||'')+'</option>').join('')}
                </select>
              </div>
            </div>
            <div class="fg2">
              <div class="fgrp"><label>Período base (tarifario origen)</label><input type="month" id="ne_basePer" value="${c.btar||''}" onchange="buildPolyForm()"></div>
              <div class="fgrp"><label>Nuevo período <span class="req">*</span></label><input type="month" id="ne_newPer" onchange="calcAveSug()"></div>
            </div>
            <div style="font-size:11px;font-weight:700;color:var(--p700);margin:10px 0 6px">📐 Términos de la fórmula polinómica:</div>
            <div id="ne_polyTerms"></div>
            <div style="display:flex;align-items:center;gap:12px;margin-top:10px;padding:10px 14px;background:var(--p100);border-radius:6px">
              <span style="font-size:12px;font-weight:600;color:var(--p800)">% Polinómico total:</span>
              <span id="ne_pctRes" style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;color:var(--p700)">0%</span>
              <button class="btn btn-s btn-sm" onclick="previewPolyTar()">👁 Preview tarifario</button>
            </div>
            <div id="ne_tarPrev"></div>
            <div class="ave-sug" id="ne_aveSug" style="display:none">
              <h4>🟢 AVE Polinómica — se generará automáticamente al guardar</h4>
              <div style="margin-bottom:6px;font-size:11px;color:var(--g700)" id="ne_aveFormula"></div>
              <div style="font-size:11px;font-weight:600;color:var(--g700)">Monto calculado: <span class="sv" id="ne_aveMonto">—</span></div>
              <div id="ne_obraGrp" style="display:none;margin:8px 0">
                <label style="font-size:11px;font-weight:600">% avance pendiente (OBRA):</label>
                <input type="number" id="ne_obraAdv" step="1" min="0" max="100" placeholder="%" oninput="calcAveSug()" style="width:120px;margin-top:4px">
              </div>
              <div style="margin-top:8px">
                <label style="font-size:11px;font-weight:600;color:var(--g700)">Monto AVE manual (opcional):</label>
                <input type="number" id="ne_aveManual" step="0.01" placeholder="Deja vacío para usar el calculado" oninput="onAveManualChange()" style="margin-top:4px;width:220px">
                <div id="ne_aveManualNote" style="font-size:11px;color:var(--g600c);margin-top:3px;display:none"></div>
              </div>
            </div>
          </div>

          <div id="enm_mot_grp" style="display:none" class="enm-sub">
            <h4 id="enm_mot_lbl">Descripción *</h4>
            <div id="enm_scope_sub" style="display:none;margin-bottom:10px">
              <div class="fgrp">
                <label>Tipo de cambio de alcance</label>
                <select id="ne_scope_tipo">
                  <option value="MAYOR">Mayor scope (incremento de alcance)</option>
                  <option value="MENOR">Menor scope (reducción de alcance)</option>
                </select>
              </div>
            </div>
            <textarea id="ne_mot" placeholder="Descripción detallada de la enmienda..." style="min-height:80px;width:100%"></textarea>
          </div>

          <div style="display:flex;gap:8px;margin-top:18px">
            <button class="btn btn-p" onclick="guardarEnm()">💾 Guardar Enmienda</button>
            <button class="btn btn-s" onclick="closeEnmPanel()">Cancelar</button>
          </div>
        </div>
      </div>
      ${(function(){return renderUpdateSection(c).outerHTML;})()}
      <div class="section-box">
        <h3>💲 Listas de Precios / Tarifarios <span class="tcnt">${(c.tarifarios||[]).length} tablas</span></h3>
        ${renderTarSection(c)}
      </div>
      <div class="section-box">
        <h3>🧾 AVEs <span class="tcnt">${aves.length} registrados</span></h3>
        ${(function(){
          var polyAves=aves.filter(function(a){return a.tipo==='POLINOMICA';});
          var ownerAves=aves.filter(function(a){return a.tipo==='OWNER';});
          // Vigentes (no validados todavía) — son los que cuentan para el límite
          var polyPending=polyAves.filter(function(a){return !a.aicValidated;});
          var ownerPending=ownerAves.filter(function(a){return !a.ccValidated;});
          var polyValidated=polyAves.filter(function(a){return a.aicValidated;});
          var ownerValidated=ownerAves.filter(function(a){return a.ccValidated;});
          // Sumas (totales históricos)
          var ownerSum=ownerAves.reduce(function(s,a){return s+(a.monto||0);},0);
          var polySum=polyAves.reduce(function(s,a){return s+(a.monto||0);},0);
          var ownerSumUsd=toUsd(ownerSum);
          var polySumUsd=toUsd(polySum);
          var totalSumUsd=ownerSumUsd+polySumUsd;
          // Sumas vigentes (post-última validación)
          var polyPendingArs=polyPending.reduce(function(s,a){return s+(a.monto||0);},0);
          var ownerPendingArs=ownerPending.reduce(function(s,a){return s+(a.monto||0);},0);
          var polyPendingUsd=toUsd(polyPendingArs);
          var ownerPendingUsd=toUsd(ownerPendingArs);
          // Sumas validadas (histórico cerrado)
          var polyValidatedUsd=toUsd(polyValidated.reduce(function(s,a){return s+(a.monto||0);},0));
          var ownerValidatedUsd=toUsd(ownerValidated.reduce(function(s,a){return s+(a.monto||0);},0));
          // Límites en USD — el chequeo se hace contra LO VIGENTE
          var LIMIT_AIC=250000;
          var LIMIT_CC=250000;
          var WARN_THRESHOLD=0.8;
          var aveLimit=c._aveOwnerLimit||250000;
          var warnOwner=ownerPendingArs>aveLimit;
          var requireAIC=polyPendingUsd>=LIMIT_AIC;
          var nearAIC=polyPendingUsd>=LIMIT_AIC*WARN_THRESHOLD && polyPendingUsd<LIMIT_AIC;
          var ownerNearCC=ownerPendingUsd>=LIMIT_CC*WARN_THRESHOLD && ownerPendingUsd<LIMIT_CC;
          var ownerExceedCC=ownerPendingUsd>=LIMIT_CC;
          // Última validación (info)
          var lastAic=(c.aicValidations||[]).slice(-1)[0]||null;
          var lastCc=(c.ccValidations||[]).slice(-1)[0]||null;
          var html='<div class="ave-limit-row"><label>⚠️ Límite advertencia AVE Owner:</label>'
            +'<input type="number" value="'+aveLimit+'" step="10000" min="0" placeholder="250000" onchange="setAveLimit(\''+c.id+'\',this.value)" style="width:140px">'
            +'<span style="font-size:11px;color:var(--g600c)">'+(c.mon||'ARS')+'</span>'
            +'<span style="margin-left:auto;font-size:11px;color:var(--g600c)">TC USD: '+fN(TC_USD)+(isUsdContract?' (contrato en USD)':'')+'</span></div>';
          // Banner AIC: requiere validación
          if(requireAIC){
            html+='<div class="ave-warn-banner" style="background:rgba(220,38,38,.08);border-color:#dc2626;color:#dc2626;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
              +'<div style="flex:1;min-width:280px">🔴 <strong>Polinómica vigente '+fmtUsd(polyPendingUsd)+'</strong> supera USD '+fN(LIMIT_AIC)+' — <strong>requiere validación de AIC</strong>. ('+polyPending.length+' AVE'+(polyPending.length!==1?'s':'')+' pendiente'+(polyPending.length!==1?'s':'')+')</div>'
              +'<button class="btn btn-a btn-sm" style="background:#16a34a;color:#fff;border-color:#16a34a;font-weight:700" onclick="markValidationAic(\''+c.id+'\')">✅ Marcar validación AIC y resetear contador</button>'
              +'</div>';
          } else if(nearAIC){
            html+='<div class="ave-warn-banner" style="background:rgba(234,179,8,.10);border-color:#eab308;color:#92400e">🟡 <strong>Polinómica vigente '+fmtUsd(polyPendingUsd)+'</strong> se aproxima al límite USD '+fN(LIMIT_AIC)+' ('+(polyPendingUsd/LIMIT_AIC*100).toFixed(0)+'%) — <strong>preparar validación de AIC</strong>.</div>';
          }
          // Banner Owner / CC
          if(warnOwner) html+='<div class="ave-warn-banner">⛔ AVE Owner vigente ('+(c.mon||'ARS')+' '+fN(ownerPendingArs)+') supera el límite de '+(c.mon||'ARS')+' '+fN(aveLimit)+'.</div>';
          if(ownerExceedCC){
            html+='<div class="ave-warn-banner" style="background:rgba(220,38,38,.08);border-color:#dc2626;color:#dc2626;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
              +'<div style="flex:1;min-width:280px">🔴 <strong>Owner vigente '+fmtUsd(ownerPendingUsd)+'</strong> supera USD '+fN(LIMIT_CC)+' — <strong>requiere validación de CC</strong>. ('+ownerPending.length+' AVE'+(ownerPending.length!==1?'s':'')+' pendiente'+(ownerPending.length!==1?'s':'')+')</div>'
              +'<button class="btn btn-a btn-sm" style="background:#16a34a;color:#fff;border-color:#16a34a;font-weight:700" onclick="markValidationCc(\''+c.id+'\')">✅ Marcar validación CC y resetear contador</button>'
              +'</div>';
          } else if(ownerNearCC){
            html+='<div class="ave-warn-banner" style="background:rgba(234,179,8,.10);border-color:#eab308;color:#92400e">🟡 <strong>Owner vigente '+fmtUsd(ownerPendingUsd)+'</strong> se aproxima al límite USD '+fN(LIMIT_CC)+' ('+(ownerPendingUsd/LIMIT_CC*100).toFixed(0)+'%) — <strong>preparar validación de CC</strong>.</div>';
          }
          // Info última validación
          if(lastAic) html+='<div style="font-size:11px;color:#16a34a;margin-bottom:6px">✓ Última validación AIC: '+fD((lastAic.date||'').substring(0,10))+' · '+fmtUsd(lastAic.totalUsd||0)+' · '+(lastAic.aveIds||[]).length+' AVE(s) <button class="btn btn-d btn-sm" style="font-size:9px;padding:1px 6px;margin-left:6px" onclick="undoValidationAic(\''+c.id+'\',\''+lastAic.id+'\')" title="Deshacer última validación AIC">↺ Deshacer</button></div>';
          if(lastCc) html+='<div style="font-size:11px;color:#16a34a;margin-bottom:6px">✓ Última validación CC: '+fD((lastCc.date||'').substring(0,10))+' · '+fmtUsd(lastCc.totalUsd||0)+' · '+(lastCc.aveIds||[]).length+' AVE(s) <button class="btn btn-d btn-sm" style="font-size:9px;padding:1px 6px;margin-left:6px" onclick="undoValidationCc(\''+c.id+'\',\''+lastCc.id+'\')" title="Deshacer última validación CC">↺ Deshacer</button></div>';
          var polyCellCls=requireAIC?' warn':(nearAIC?' near':'');
          var ownerCellCls=(ownerExceedCC||warnOwner)?' warn':(ownerNearCC?' near':'');
          // Helper para línea USD vigente | validado en cada celda
          function usdSubLine(pendUsd, valUsd, color, badge){
            return '<div style="font-family:JetBrains Mono,monospace;font-size:10.5px;color:'+color+';margin-top:2px;font-weight:700">Vigente: '+fmtUsd(pendUsd)+(badge?' · '+badge:'')+'</div>'
              +(valUsd>0?'<div style="font-family:JetBrains Mono,monospace;font-size:9.5px;color:#16a34a;margin-top:1px">✓ Validado: '+fmtUsd(valUsd)+'</div>':'');
          }
          html+='<div class="ave-totals">'
            +'<div class="ave-tot-cell'+polyCellCls+'"><div class="atl">Σ AVE Polinómica</div><div class="atv">'+(c.mon||'ARS')+' '+fN(polySum)+'</div>'+usdSubLine(polyPendingUsd, polyValidatedUsd, requireAIC?'#dc2626':nearAIC?'#92400e':'var(--p600)', requireAIC?'AIC':nearAIC?'⚠ AIC':'')+'</div>'
            +'<div class="ave-tot-cell'+ownerCellCls+'"><div class="atl">Σ AVE Owner</div><div class="atv">'+(c.mon||'ARS')+' '+fN(ownerSum)+'</div>'+usdSubLine(ownerPendingUsd, ownerValidatedUsd, ownerExceedCC?'#dc2626':ownerNearCC?'#92400e':'var(--p600)', ownerExceedCC?'CC':ownerNearCC?'⚠ CC':'')+'</div>'
            +'<div class="ave-tot-cell"><div class="atl">Σ Total AVEs</div><div class="atv">'+(c.mon||'ARS')+' '+fN(polySum+ownerSum)+'</div><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:var(--p600);margin-top:2px;font-weight:700">'+fmtUsd(totalSumUsd)+'</div></div>'
            +'</div>';
          return html;
        })()}
        <table><thead><tr><th>Tipo</th><th>Enm. Ref.</th><th>Período</th><th>Valor previo</th><th>Ajuste</th><th>Equiv. USD</th><th>Nuevo valor</th><th>Concepto</th><th></th></tr></thead><tbody>${aveRows}</tbody></table>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-p btn-sm" onclick="openAveOwnerPanel()">🔵 + AVE Owner Manual</button>
          <button class="btn btn-d btn-sm" onclick="deleteLastAutoAve()">🗑 Borrar último AVE AUTO</button>
        </div>
        <div class="ave-owner-panel" id="aveOwnerPanel">
          <h4>🔵 Registrar AVE Owner</h4>
          <div class="fg2" style="gap:14px 18px">
            <div class="fgrp">
              <label>Concepto / Subtipo <span class="req">*</span></label>
              <select id="avo_sub" onchange="onAvoSubChange()">
                <option value="">— Seleccioná —</option>
                <option value="EXTENSION PLAZO">📅 Extensión de Plazo</option>
                <option value="ACTUALIZACION TARIFAS">💰 Actualización de Tarifas</option>
                <option value="SCOPE MAYOR">🔧 Incremento de Scope</option>
                <option value="SCOPE MENOR">📉 Reducción de Scope</option>
                <option value="CLAUSULAS">📋 Modificación de Cláusulas</option>
                <option value="OTRO">💬 Otro</option>
              </select>
            </div>
            <div class="fgrp">
              <label>Referencia Enmienda</label>
              <select id="avo_enm">
                <option value="">— Sin referencia —</option>
                ${enms.map(function(e){var tl=e.tipo==='ACTUALIZACION_TARIFAS'?'Act.Tarifas':e.tipo==='EXTENSION'?'Extensión':e.tipo==='SCOPE'?'Scope':e.tipo==='CLAUSULAS'?'Cláusulas':'Otro';return '<option value="'+e.num+'">Enm. N°'+e.num+' — '+tl+'</option>';}).join('')}
              </select>
            </div>
            <div class="fgrp">
              <label>Monto AVE <span class="req">*</span></label>
              <input type="number" id="avo_monto" step="0.01" min="0" placeholder="Monto en pesos">
            </div>
            <div class="fgrp">
              <label>Período (YYYY-MM)</label>
              <input type="month" id="avo_per">
            </div>
            <div class="fgrp" id="avo_ffin_grp" style="display:none">
              <label>Nueva Fecha Fin <span class="req">*</span></label>
              <input type="date" id="avo_ffin">
            </div>
            <div class="fgrp" id="avo_otro_grp" style="display:none">
              <label>Descripción</label>
              <input type="text" id="avo_otro" placeholder="Describí el concepto...">
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-p" onclick="saveAveOwner()">💾 Guardar AVE Owner</button>
            <button class="btn btn-s" onclick="closeAveOwnerPanel()">Cancelar</button>
          </div>
        </div>
      </div>
      
      ${(()=>{
        // Gráfico de evolución del contrato: TV acumulado en el tiempo (montoBase + AVEs)
        try{
          const allEvents=[];
          if(c.fechaIni) allEvents.push({fecha:c.fechaIni, label:'Inicio contrato', delta:montoBase, type:'base'});
          (c.aves||[]).slice().sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))).forEach(a=>{
            if(!a.fecha) return;
            allEvents.push({fecha:a.fecha.substring(0,10), label:(a.tipo==='POLINOMICA'?'AVE Polinómica':'AVE Owner')+(a.concepto?' · '+a.concepto:''), delta:a.monto||0, type:a.tipo==='POLINOMICA'?'poly':'owner'});
          });
          if(allEvents.length<2) return '';
          let cum=0;
          const pts=allEvents.map(e=>{cum+=e.delta; return {fecha:e.fecha, label:e.label, val:cum, delta:e.delta, type:e.type};});
          // Punto final = hoy o fechaFin si vencido
          const hoy2=new Date(); hoy2.setHours(0,0,0,0);
          const finD=c.fechaFin?new Date(c.fechaFin+'T00:00:00'):null;
          const lastPt=pts[pts.length-1];
          const endDateStr=(finD && finD<hoy2)?c.fechaFin:hoy2.toISOString().substring(0,10);
          if(endDateStr>lastPt.fecha) pts.push({fecha:endDateStr, label:(finD&&finD<hoy2)?'Fin de contrato':'Hoy', val:lastPt.val, delta:0, type:'now'});
          const W=720, H=240, padL=68, padR=16, padT=18, padB=44;
          const xs=pts.map(p=>new Date(p.fecha+'T00:00:00').getTime());
          const ys=pts.map(p=>p.val);
          const xMin=Math.min(...xs), xMax=Math.max(...xs);
          const yMin=0, yMax=Math.max(...ys)*1.08||1;
          const xToPx=t=>padL+(W-padL-padR)*((t-xMin)/Math.max(1,xMax-xMin));
          const yToPx=v=>padT+(H-padT-padB)*(1-(v-yMin)/Math.max(1,yMax-yMin));
          let path=''; pts.forEach((p,i)=>{const x=xToPx(new Date(p.fecha+'T00:00:00').getTime()),y=yToPx(p.val);path+=(i===0?'M':'L')+x.toFixed(1)+','+y.toFixed(1)+' ';});
          const areaPath=path+'L'+xToPx(xMax).toFixed(1)+','+yToPx(0).toFixed(1)+' L'+xToPx(xMin).toFixed(1)+','+yToPx(0).toFixed(1)+' Z';
          // Y ticks
          const ticks=[]; for(let i=0;i<=4;i++){ const v=yMin+(yMax-yMin)*i/4; ticks.push({v, y:yToPx(v)}); }
          const fmtNum=v=>{ if(v>=1e9)return (v/1e9).toFixed(2)+'B'; if(v>=1e6)return (v/1e6).toFixed(2)+'M'; if(v>=1e3)return (v/1e3).toFixed(1)+'k'; return Math.round(v).toString(); };
          const yGrid=ticks.map(t=>'<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+t.y.toFixed(1)+'" y2="'+t.y.toFixed(1)+'" stroke="rgba(255,255,255,.08)"/><text x="'+(padL-8)+'" y="'+(t.y+3).toFixed(1)+'" fill="rgba(255,255,255,.55)" font-size="10" text-anchor="end" font-family="JetBrains Mono,monospace">'+fmtNum(t.v)+'</text>').join('');
          // X ticks: 5 evenly spaced
          const xTicks=[]; for(let i=0;i<=4;i++){ const t=xMin+(xMax-xMin)*i/4; xTicks.push(t); }
          const xGrid=xTicks.map(t=>{const x=xToPx(t); const d=new Date(t); const lbl=String(d.getFullYear()).slice(2)+'·'+String(d.getMonth()+1).padStart(2,'0'); return '<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+padT+'" y2="'+(H-padB)+'" stroke="rgba(255,255,255,.04)"/><text x="'+x.toFixed(1)+'" y="'+(H-padB+16)+'" fill="rgba(255,255,255,.55)" font-size="10" text-anchor="middle" font-family="JetBrains Mono,monospace">'+lbl+'</text>';}).join('');
          const dots=pts.map(p=>{const x=xToPx(new Date(p.fecha+'T00:00:00').getTime()),y=yToPx(p.val); const col=p.type==='base'?'#86efac':p.type==='poly'?'#fde68a':p.type==='owner'?'#a5b4fc':'#fff'; const tip=p.label+' · '+(c.mon||'ARS')+' '+fN(p.val)+(p.delta?' (+'+fN(p.delta)+')':''); return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="'+col+'" stroke="rgba(0,0,0,.4)" stroke-width="1"><title>'+esc(tip)+'</title></circle>';}).join('');
          const svg='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:280px;display:block">'
            +'<defs><linearGradient id="evolGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#86efac" stop-opacity=".35"/><stop offset="100%" stop-color="#86efac" stop-opacity="0"/></linearGradient></defs>'
            +xGrid+yGrid
            +'<path d="'+areaPath+'" fill="url(#evolGrad)"/>'
            +'<path d="'+path+'" fill="none" stroke="#86efac" stroke-width="2"/>'
            +dots
            +'</svg>';
          const legend='<div style="display:flex;gap:14px;font-size:11px;flex-wrap:wrap;color:rgba(255,255,255,.65);margin-top:8px">'
            +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#86efac;margin-right:5px;vertical-align:middle"></span>Base / Hoy</span>'
            +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#fde68a;margin-right:5px;vertical-align:middle"></span>AVE Polinómica</span>'
            +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#a5b4fc;margin-right:5px;vertical-align:middle"></span>AVE Owner</span>'
            +'<span style="margin-left:auto;font-family:JetBrains Mono,monospace">TV final: '+(c.mon||'ARS')+' '+fN(lastPt.val)+'</span>'
            +'</div>';
          return '<div class="section-box" style="background:rgba(0,0,0,.15);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:16px 18px;margin-top:16px">'
            +'<h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.4px">📈 Evolución del contrato <span style="font-weight:400;opacity:.6;font-size:11px;text-transform:none">TV acumulado · '+pts.length+' puntos</span></h3>'
            +svg+legend+'</div>';
        }catch(e){console.warn('chart evolución', e); return '';}
      })()}

      ${(()=>{
        // Historial de redeterminaciones: AVEs polinómicos + enmiendas tarifarias
        const polyAves=(c.aves||[]).filter(a=>a.tipo==='POLINOMICA').map(a=>({
          fecha:a.fecha||'',
          periodo:a.periodo||'',
          basePeriodo:a.basePeriodo||'',
          nuevoPeriodo:a.nuevoPeriodo||a.periodo||'',
          pct:a.pctPoli!=null?a.pctPoli*100:null,
          monto:a.monto||0,
          origen:'AVE',
          ref:a.enmRef?'Enm.'+a.enmRef:'AUTO',
          concepto:a.concepto||''
        }));
        const tarEnms=(c.enmiendas||[]).filter(e=>e.tipo==='ACTUALIZACION_TARIFAS'&&e.pctPoli!=null&&!e.superseded).map(e=>({
          fecha:e.fecha||'',
          periodo:e.nuevoPeriodo||'',
          basePeriodo:e.basePeriodo||'',
          nuevoPeriodo:e.nuevoPeriodo||'',
          pct:e.pctPoli!=null?e.pctPoli*100:null,
          monto:e.monto||0,
          origen:'ENM',
          ref:'N°'+e.num,
          concepto:e.motivo||e.descripcion||''
        }));
        const all=[...polyAves,...tarEnms].sort((a,b)=>a.fecha.localeCompare(b.fecha));
        if(!all.length) return '';
        let cumMonto=c.montoBase||c.monto||0;
        const rows=all.map(r=>{
          cumMonto+=r.monto;
          const pctStr=r.pct!=null?(r.pct>0?'+':'')+r.pct.toFixed(2)+'%':'—';
          const pil=r.origen==='AVE'?'<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:rgba(99,102,241,.25);color:#a5b4fc">AUTO</span>':'<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:rgba(234,179,8,.2);color:#fde68a">ENM</span>';
          return '<tr>'+
            '<td style="color:rgba(255,255,255,.5);font-size:11px">'+fD((r.fecha||'').substring(0,10))+'</td>'+
            '<td>'+pil+' <span style="font-size:11px;font-weight:600">'+esc(r.ref)+'</span></td>'+
            '<td style="font-size:11px">'+(r.basePeriodo?formatMonth(r.basePeriodo)+'→'+formatMonth(r.nuevoPeriodo):formatMonth(r.periodo)||'—')+'</td>'+
            '<td style="font-weight:700;color:'+(r.pct!=null&&r.pct>0?'#86efac':'#fca5a5')+'">'+pctStr+'</td>'+
            '<td class="mono" style="font-size:11px;text-align:right">'+c.mon+' '+fN(r.monto)+'</td>'+
            '<td class="mono" style="font-size:11px;text-align:right;opacity:.7">'+c.mon+' '+fN(cumMonto)+'</td>'+
          '</tr>';
        }).join('');
        return '<div class="section-box" style="background:rgba(0,0,0,.15);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:16px 18px;margin-top:16px">'+
          '<h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.4px">📈 Historial de Redeterminaciones <span style="font-weight:400;opacity:.6;font-size:11px;text-transform:none">'+all.length+' ajustes registrados</span></h3>'+
          '<table class="redet-tbl"><thead><tr><th>Fecha</th><th>Origen</th><th>Período</th><th>% Ko</th><th style="text-align:right">Ajuste</th><th style="text-align:right">TV Acum.</th></tr></thead><tbody>'+rows+'</tbody></table>'+
        '</div>';
      })()}

    </div>`;
  } catch(err) {
    console.error('renderDet error', err);
    document.getElementById('detCard').innerHTML = `<div class="card" style="padding:24px"><div style="background:#fde8ea;border:1px solid #dc3545;color:#dc3545;border-radius:8px;padding:16px;font-size:13px"><strong>⚠ Error al renderizar el detalle</strong><br>${esc(err.message||String(err))}</div></div>`;
  }
}

// ===== TARIFARIO SYSTEM =====
function getTar(){const c=window.DB.find(x=>x.id===window.detId);return c?.tarifarios||[];}
async function setTar(t){const c=window.DB.find(x=>x.id===window.detId);if(c){c.tarifarios=t;c.updatedAt=new Date().toISOString();save();}}

async function saveTarifarios(){
  const c=window.DB.find(x=>x.id===window.detId);
  if(!c){toast('No hay contrato seleccionado','er');return;}
  try{
    showLoader('Guardando tarifarios...');
    c.updatedAt=new Date().toISOString();
    if(!SB_OK){localStorage.setItem('cta_v7',JSON.stringify(window.DB));hideLoader();toast('Guardado en localStorage','ok');return;}
    await sbUpsertItem('contratos',c);
    hideLoader();
    toast(`${(c.tarifarios||[]).length} tarifario(s) guardado(s) en Supabase ✓`,'ok');
  }catch(err){
    hideLoader();
    console.error('[saveTarifarios]',err);
    toast('Error al guardar: '+err.message,'er');
  }
}


function addTarTable(){
  const c=window.DB.find(x=>x.id===window.detId);if(!c)return;
  const name=prompt('Nombre de la tabla:','Tabla '+(getTar().length+1));if(!name)return;
  if(!c.tarifarios)c.tarifarios=[];
  c.tarifarios.push({name,cols:['N° Item','Descripción','Categoría','Unidad','Valor Unitario'],rows:[['','','','','']]});
  _tarTab=c.tarifarios.length-1;
  setTar(c.tarifarios);renderTarifario();toast('Tabla creada','ok');
}

function delTarTable(i){
  if(!confirm('¿Eliminar esta tabla del tarifario?'))return;
  const tars=getTar();tars.splice(i,1);if(_tarTab>=tars.length)_tarTab=Math.max(0,tars.length-1);
  setTar(tars);renderTarifario();toast('Tabla eliminada','ok');
}

function renameTarTable(i){
  const tars=getTar();const name=prompt('Nuevo nombre:',tars[i].name);if(!name)return;
  tars[i].name=name;setTar(tars);renderTarifario();
}

function changeTarPeriod(i){
  const tars=getTar(); const t=tars[i]; if(!t)return;
  const cur=t.period||'';
  const inp=prompt('Mes de aplicación de esta lista (formato YYYY-MM, ej: 2025-09):', cur);
  if(inp===null) return;
  const v=String(inp).trim();
  if(v && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)){ toast('Formato inválido. Usá YYYY-MM (ej 2025-09)','er'); return; }
  tars[i].period = v||null;
  tars[i].updatedAt=new Date().toISOString();
  _tarPeriod = v||null;
  setTar(tars); renderTarifario();
  toast('Período actualizado','ok');
}

function addTarRow(ti){
  const tars=getTar();tars[ti].rows.push(tars[ti].cols.map(()=>''));
  setTar(tars);renderTarifario();
}

function delTarRow(ti,ri){
  const tars=getTar();tars[ti].rows.splice(ri,1);
  setTar(tars);renderTarifario();
}

function addTarCol(ti){
  const name=prompt('Nombre de la columna:');if(!name)return;
  const tars=getTar();tars[ti].cols.push(name);tars[ti].rows.forEach(r=>r.push(''));
  setTar(tars);renderTarifario();
}

function delTarCol(ti,ci){
  const tars=getTar();if(tars[ti].cols.length<=1){toast('Mínimo 1 columna','er');return;}
  if(!confirm('¿Eliminar columna "'+tars[ti].cols[ci]+'"?'))return;
  tars[ti].cols.splice(ci,1);tars[ti].rows.forEach(r=>r.splice(ci,1));
  setTar(tars);renderTarifario();
}

function editTarCell(ti,ri,ci,val){
  const tars=getTar();tars[ti].rows[ri][ci]=val;setTar(tars);
}

function importTarExcel(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=new Uint8Array(e.target.result);
      const wb=XLSX.read(data,{type:'array'});
      const c=window.DB.find(x=>x.id===window.detId);if(!c)return;
      if(!c.tarifarios)c.tarifarios=[];
      wb.SheetNames.forEach(sn=>{
        const ws=wb.Sheets[sn];
        const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        if(json.length<1)return;
        // First row = headers
        const cols=json[0].map(h=>String(h||'').trim()||'Col');
        const rows=json.slice(1).filter(r=>r.some(v=>v!=='')).map(r=>{
          // Ensure each row has same number of cols
          const row=[];for(let i=0;i<cols.length;i++)row.push(r[i]!=null?r[i]:'');return row;
        });
        c.tarifarios.push({name:sn,cols,rows});
      });
      _tarTab=Math.max(0,c.tarifarios.length-1);
      setTar(c.tarifarios);renderTarifario();
      toast('Excel importado — '+wb.SheetNames.length+' hoja(s)','ok');
    }catch(err){toast('Error leyendo Excel','er');console.error(err);}
  };
  reader.readAsArrayBuffer(file);
  input.value='';
}

// ===== LISTAS DE PRECIOS CON IA (WORD/EXCEL) =====
function openPriceListImportPicker(){
  const inp=document.getElementById('tarAiIn');
  if(!inp){toast('No se encontró el selector de listas','er');return;}
  try{inp.click();}catch(e){console.error('openPriceListImportPicker',e);toast('No se pudo abrir el selector','er');}
}
function normalizeImportedPriceValue(v){
  if(v==null||v==='') return '';
  if(typeof v==='number') return v;
  let s=String(v).trim();
  if(!s) return '';
  s=s.replace(/\s+/g,'').replace(/[^\d,.-]/g,'');
  if(!s) return '';
  const hasComma=s.includes(',');
  const hasDot=s.includes('.');
  if(hasComma && hasDot){
    if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
  } else if(hasComma){
    s=s.replace(/\./g,'').replace(',','.');
  }
  const n=parseFloat(s);
  return Number.isFinite(n)?n:(String(v).trim());
}
function detectPeriodFromText(txt){
  const s=String(txt||'');
  let m=s.match(/\b(20\d{2})[-_/](0[1-9]|1[0-2])\b/); if(m) return `${m[1]}-${m[2]}`;
  m=s.match(/\b(0[1-9]|1[0-2])[-_/](20\d{2})\b/); if(m) return `${m[2]}-${m[1]}`;
  const map={ene:'01',enero:'01',feb:'02',febrero:'02',mar:'03',marzo:'03',abr:'04',abril:'04',may:'05',mayo:'05',jun:'06',junio:'06',jul:'07',julio:'07',ago:'08',agosto:'08',sep:'09',sept:'09',septiembre:'09',oct:'10',octubre:'10',nov:'11',noviembre:'11',dic:'12',diciembre:'12'};
  const low=s.toLowerCase();
  for(const [k,v] of Object.entries(map)){
    const r1=new RegExp(`\\b${k}\\s*(?:de\\s*)?(20\\d{2})\\b`,'i');
    const r2=new RegExp(`\\b(20\\d{2})\\s*(?:-|/)??\\s*${k}\\b`,'i');
    let mm=low.match(r1); if(mm) return `${mm[1]}-${v}`;
    mm=low.match(r2); if(mm) return `${mm[1]}-${v}`;
  }
  return null;
}
function getMimeTypeFromPriceFile(file){
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(ext==='docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if(ext==='doc') return 'application/msword';
  return file.type||'application/octet-stream';
}
async function analyzePriceListsWithGemini(filePayload, cc, fileName=''){
  const prompt=`Sos un asistente experto en contratos de petróleo y gas argentinos. Extraé únicamente las LISTAS DE PRECIOS o tarifarios base presentes en el documento.\n\nContexto del contrato:\n- Número: ${cc.num}\n- Contratista: ${cc.cont}\n- Archivo: ${fileName}\n\nDevolvé SOLO JSON válido con este esquema exacto:\n{\n  "listasDePrecios": [\n    {\n      "periodo": "YYYY-MM" o null,\n      "nombre": "nombre corto de la lista" o null,\n      "items": [\n        {"item": "código o número", "descripcion": "descripción del ítem", "unidad": "unidad", "precio": número o texto numérico}\n      ]\n    }\n  ]\n}\n\nReglas:\n- Si hay varias tablas, extraelas todas.\n- Si el período no está explícito, devolvé null.\n- No inventes filas ni precios.\n- No devuelvas explicaciones ni markdown.`;
  let response = await callGeminiForEnm([{text: prompt}, {inline_data: {mime_type: filePayload.mimeType, data: filePayload.data}}]);
  if((!response || !response.ok) && filePayload.fallbackText){
    response = await callGeminiForEnm([{text: prompt}, {text: `Contenido del documento:\n\n${filePayload.fallbackText.slice(0,120000)}`}]);
  }
  if (!response || !response.ok) {
    const errText = response ? await response.text().catch(()=>'') : '';
    if (response && response.status === 429) throw new Error('Límite de requests alcanzado. Esperá 1 minuto.');
    if (response && response.status === 400) throw new Error('Archivo inválido o demasiado grande para analizar.');
    throw new Error(`IA no disponible ${response ? response.status : 'N/A'}: ${errText.slice(0,180)}`);
  }
  const data=await response.json();
  const parts=data?.candidates?.[0]?.content?.parts||[];
  const txt=parts.map(p=>p.text||'').join('\n').trim();
  return extractJsonFromGeminiText(txt);
}
function slugSource(fileName, fallback){const s=String(fileName||'').replace(/\.[^.]+$/,'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');return s||fallback||'EXCEL';}
function normalizeAiPriceLists(result, fileName, cc){
  const lists=Array.isArray(result?.listasDePrecios)?result.listasDePrecios:[];
  const fallbackPeriod=cc?.btar||cc?.fechaIni?.substring(0,7)||null;
  const clean=[];
  lists.forEach((lst,idx)=>{
    const period=detectPeriodFromText(lst?.periodo||lst?.nombre||fileName)||fallbackPeriod;
    const rows=(Array.isArray(lst?.items)?lst.items:[]).map(it=>[
      String(it?.item??'').trim(),
      String(it?.descripcion??'').trim(),
      String(it?.unidad??'').trim(),
      normalizeImportedPriceValue(it?.precio)
    ]).filter(r=>r.some(v=>String(v??'').trim()!==''));
    if(!rows.length) return;
    clean.push({
      name:String(lst?.nombre||(`Lista IA ${idx+1}`)).trim()||(`Lista IA ${idx+1}`),
      cols:['Item','Descripción','Unidad','Precio'],
      rows,
      period,
      source:slugSource(fileName,'WORD_IA'),
      sourceFileName:fileName,
      importedAt:new Date().toISOString(),
      editable:true
    });
  });
  return clean;
}
function standardizeExcelPriceList(sheetName, json, cc, fileName){
  if(!Array.isArray(json)||json.length<1) return null;
  const headers=(json[0]||[]).map(v=>String(v||'').trim());
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const h=headers.map(norm);
  const idxBySyn=(syns)=>h.findIndex(x=>syns.some(s=>x.includes(s)));
  let itemIdx=idxBySyn(['item','codigo','cod','n item','n° item','numero item','posicion']);
  let descIdx=idxBySyn(['descripcion','detalle','concepto','texto breve','short text','servicio']);
  let unitIdx=idxBySyn(['unidad','uom','um','unit']);
  let priceIdx=idxBySyn(['precio','valor unitario','precio unitario','tarifa','rate','importe','valor']);
  if(descIdx<0) descIdx=1>=headers.length?0:1;
  if(itemIdx<0) itemIdx=0;
  if(unitIdx<0) unitIdx=Math.min(2, headers.length-1);
  if(priceIdx<0) priceIdx=Math.min(3, headers.length-1);
  const rows=json.slice(1).filter(r=>Array.isArray(r)&&r.some(v=>String(v||'').trim()!=='' )).map(r=>[
    String(r[itemIdx]??'').trim(),
    String(r[descIdx]??'').trim(),
    String(r[unitIdx]??'').trim(),
    normalizeImportedPriceValue(r[priceIdx]??'')
  ]).filter(r=>r.some(v=>String(v??'').trim()!==''));
  if(!rows.length) return null;
  const blobText=[sheetName, ...json.slice(0,8).flat()].join(' ');
  return {
    name:String(sheetName||'Lista Excel').trim(),
    cols:['Item','Descripción','Unidad','Precio'],
    rows,
    period:detectPeriodFromText(blobText)||(cc?.btar||cc?.fechaIni?.substring(0,7)||null),
    source:slugSource(fileName,'EXCEL'),
    sourceFileName:fileName,
    importedAt:new Date().toISOString(),
    editable:true
  };
}
async function parsePriceListExcelFile(file, cc){
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(new Uint8Array(buf),{type:'array'});
  const out=[];
  wb.SheetNames.forEach(sn=>{
    const ws=wb.Sheets[sn];
    const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    const table=standardizeExcelPriceList(sn,json,cc,file.name);
    if(table) out.push(table);
  });
  return out;
}
async function importPriceListsFromFiles(files){
  if(!files||!files.length) return;
  const cc=window.DB.find(x=>x.id===window.detId); if(!cc){toast('No hay contrato seleccionado','er');return;}
  const imported=[]; const errors=[];
  try{ if(typeof showLoader==='function') showLoader('Analizando listas de precios...'); }catch(e){}
  for(const file of Array.from(files)){
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    try{
      if(['xls','xlsx'].includes(ext)){
        const parsed=await parsePriceListExcelFile(file, cc);
        if(!parsed.length) throw new Error('No se detectaron tablas útiles en el Excel');
        imported.push(...parsed);
        continue;
      }
      if(!['doc','docx'].includes(ext)) throw new Error('Formato no soportado. Usá Word o Excel.');
      if(file.size>20*1024*1024) throw new Error('Archivo muy grande (máx 20MB).');
      const payload=await buildGeminiFilePayload(file);
      payload.mimeType = payload.mimeType || getMimeTypeFromPriceFile(file);
      const result=await analyzePriceListsWithGemini(payload, cc, file.name);
      const parsed=normalizeAiPriceLists(result, file.name, cc);
      if(!parsed.length) throw new Error('La IA no encontró listas de precios en el documento');
      imported.push(...parsed);
    }catch(err){
      console.error('importPriceListsFromFiles', file.name, err);
      errors.push(`${file.name}: ${err.message||'Error inesperado'}`);
    }
  }
  try{ if(typeof hideLoader==='function') hideLoader(); }catch(e){}
  if(!imported.length){
    toast(errors.length?errors[0]:'No se importaron listas','er');
    return;
  }
  const current=(cc.tarifarios||[]).slice();
  imported.forEach(tbl=>{
    const found=current.findIndex(x=>String(x.period||'')===String(tbl.period||'')&&String(x.name||'')===String(tbl.name||'')&&String(x.source||'')===String(tbl.source||''));
    if(found>=0) current[found]=Object.assign({},current[found],tbl,{updatedAt:new Date().toISOString()});
    else current.push(tbl);
  });
  cc.tarifarios=current;
  cc.updatedAt=new Date().toISOString();
  console.log('[importPriceListsFromFiles] Importadas', imported.length, 'listas. Total tarifarios:', cc.tarifarios.length);
  if(!SB_OK){localStorage.setItem('cta_v7',JSON.stringify(window.DB));}
  else{await sbUpsertItem('contratos',cc);console.log('[importPriceListsFromFiles] ✓ Guardado en Supabase');}
  renderTarifario();
  const msg=`${imported.length} ${imported.length===1?'lista importada':'listas importadas'}${errors.length?` · ${errors.length} archivo(s) con error`:''}`;
  toast(msg+' y guardadas','ok');
  if(errors.length) console.warn('Errores de importación de listas:', errors);
}


function togglePanel(id){document.getElementById(id).classList.toggle('vis');}

function openEnmPanel(){
  const panel = document.getElementById('enmPanel');
  if(!panel){ toast('No se encontró el panel de enmiendas', 'er'); return; }
  panel.classList.add('vis');
  const c = window.DB.find(x=>x.id===window.detId);
  const nextNum = ((c?.enmiendas)||[]).length + 1;
  const numEl = document.getElementById('ne_num');
  if(numEl) numEl.value = nextNum;
  const tipoEl = document.getElementById('ne_tipo');
  if(tipoEl && !tipoEl.value) tipoEl.value = '';
  // Reset sub-selects
  const tarSub=document.getElementById('ne_tar_subtipo');if(tarSub)tarSub.value='POLINOMICA';
  const scopeSub=document.getElementById('ne_scope_tipo');if(scopeSub)scopeSub.value='MAYOR';
  const extSub=document.getElementById('ne_ext_tipo');if(extSub)extSub.value='FIN';
  if(typeof onEnmTipoChange==='function') onEnmTipoChange();
  panel.scrollIntoView({behavior:'smooth', block:'start'});
}

window.closeEnmModal = function closeEnmModal() {
  const modal = document.getElementById('enmPdfModal');
  if (modal) modal.style.display = 'none';
  _importedEnms = [];
  const inp = document.getElementById('enmPdfIn');
  if (inp) inp.value = '';
}

function closeEnmPanel(){
  const panel = document.getElementById('enmPanel');
  if(panel) panel.classList.remove('vis');
  const ids = ['ne_tipo','ne_ffin','ne_mot','ne_newPer','ne_aveManual','ne_ext_tipo','ne_tar_subtipo','ne_scope_tipo','ne_basePer'];
  ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const aveSug=document.getElementById('ne_aveSug');if(aveSug)aveSug.style.display='none';
  const tarPrev=document.getElementById('ne_tarPrev');if(tarPrev)tarPrev.innerHTML='';
  if(typeof onEnmTipoChange==='function') onEnmTipoChange();
}

function openEnmImportPicker(){
  const inp = document.getElementById('enmPdfIn');
  if(!inp){ toast('No se encontró el selector de archivos', 'er'); return; }
  try{ inp.click(); }catch(e){ console.error('openEnmImportPicker', e); toast('No se pudo abrir el selector de archivos', 'er'); }
}


// onAveTipoChange / onAveSubChange — removidas, reemplazadas por onAvoSubChange
function onAveTipoChange(){}
function onAveSubChange(){}

// POLY AVE CALC
function calcPolyAve(){
  const c=window.DB.find(x=>x.id===window.detId);if(!c)return;
  const pct=parseFloat(document.getElementById('av_pct').value)||0;
  const desde=document.getElementById('av_desde').value;
  if(!pct||!desde){document.getElementById('av_calc').value='';return;}
  const dDesde=new Date(desde+'-01');
  const dIni=new Date(c.fechaIni+'T00:00:00');
  const dFin=new Date(c.fechaFin+'T00:00:00');
  const totalMeses=Math.max(c.plazo_meses||c.plazo||monthDiffInclusive(c.fechaIni,c.fechaFin),1);
  const mesesTranscurridos=Math.max((dDesde.getFullYear()-dIni.getFullYear())*12+(dDesde.getMonth()-dIni.getMonth()),0);
  const mesesRestantes=Math.max(totalMeses-mesesTranscurridos,0);
  // Monto aplicable = monto_inicial * mesesRestantes/totalMeses * (pct/100)
  const montoAjuste=c.monto*(mesesRestantes/totalMeses)*(pct/100);
  document.getElementById('av_calc').value=montoAjuste.toFixed(2);
}

function usarCalcPoly(){
  const v=document.getElementById('av_calc').value;
  if(v) document.getElementById('av_monto').value=v;
}


function delAve(aid){
  if(!confirm('¿Eliminar este AVE?'))return;
  const c=window.DB.find(x=>x.id===window.detId);if(!c)return;
  c.aves=(c.aves||[]).filter(a=>a.id!==aid);
  c.updatedAt=new Date().toISOString();
  save();renderDet();renderList();toast('AVE eliminado','ok');
}

function editCont(id){const c=window.DB.find(x=>x.id===id);if(!c)return;document.getElementById('formErrBanner')?.remove();editId=id;
  populateProvSelect();
  setTimeout(function(){
    document.getElementById('f_cont').value=c.cont||'';
  },10);
  document.getElementById('f_num').value=c.num;
  document.getElementById('f_tipo').value=c.tipo||'';
  document.getElementById('f_mon').value=c.mon||'';
  document.getElementById('f_monto').value=c.monto||'';
  
  // Anticipo (OBRA)
  document.getElementById('f_anticipoPct').value=c.anticipoPct||'';
  document.getElementById('f_anticipoMonto').value=c.anticipo||'';
  onTipoContratoChange();  // Mostrar/ocultar campos según tipo
  
  document.getElementById('f_ini').value=c.fechaIni;
  document.getElementById('f_fin').value=c.fechaFin;document.getElementById('f_resp').value=c.resp||'';
  document.getElementById('f_btar').value=c.btar||'';document.getElementById('f_det').value=c.det||'';
  calcPlazo();setPoly(c.poly);
  document.getElementById('f_tcontr').value=c.tcontr||'';onContrCh();
  document.getElementById('f_cc').value=c.cc||'';document.getElementById('f_cof').value=c.cof||'';
  document.getElementById('f_of').value=c.oferentes||'';document.getElementById('f_ariba').value=c.ariba||'';
  document.getElementById('f_fev').value=c.fev||'';
  document.getElementById('f_dd').value = (c.dd && c.dd !== true && c.dd !== false) ? c.dd : '';
  document.getElementById('f_pr').value = (c.pr && c.pr !== true && c.pr !== false) ? c.pr : '';
  document.getElementById('f_sq').value = (c.sq && c.sq !== true && c.sq !== false) ? c.sq : '';
  document.getElementById('f_dg').checked=!!c.dg;document.getElementById('l_dg').textContent=c.dg?'Sí':'No';
  document.getElementById('f_rtec').value=c.rtec||'';document.getElementById('f_tc').value=c.tc||'';
  document.getElementById('f_own').value=c.own||'';document.getElementById('f_asset').value=c.asset||'';document.getElementById('f_cprov').value=c.cprov||'';
  document.getElementById('f_vend').value=c.vend||'';document.getElementById('f_fax').value=c.fax||'';
  document.getElementById('f_com').value=c.com||'';
  // Redet - handle legacy: if poly has data, assume hasPoly=true
  const hasPolyData=c.hasPoly||(c.poly&&c.poly.some(p=>p.idx));
  document.getElementById('f_hasPoly').checked=!!hasPolyData;document.getElementById('l_hasPoly').textContent=hasPolyData?'Sí':'No';document.getElementById('polyWrap').style.display=hasPolyData?'':'none';
  document.getElementById('f_trigA').checked=!!c.trigA;document.getElementById('l_trigA').textContent=c.trigA?'Sí':'No';
  document.getElementById('f_trigB').checked=!!c.trigB;document.getElementById('l_trigB').textContent=c.trigB?'Sí':'No';document.getElementById('trigB_pct').style.display=c.trigB?'flex':'none';document.getElementById('f_trigBpct').value=c.trigBpct||'';
  document.getElementById('f_trigC').checked=!!c.trigC;document.getElementById('l_trigC').textContent=c.trigC?'Sí':'No';document.getElementById('trigC_mes').style.display=c.trigC?'flex':'none';document.getElementById('f_trigCmes').value=c.trigCmes||'';
  files=(c.adj||[]).map(a=>({...a}));renderFL();go('form');
}

async function delCont(id){if(!confirm('¿Eliminar contrato?'))return;const c=window.DB.find(x=>x.id===id);if(c&&SB_OK)await sbDeleteItem('contratos',c.__sbId);window.DB=window.DB.filter(x=>x.id!==id);if(!SB_OK)localStorage.setItem('cta_v7',JSON.stringify(window.DB));renderList();updNav();toast('Eliminado','ok');if(window.detId===id)go('list');if(typeof window.initFuzzySearch==='function')window.initFuzzySearch();}

// ===================== ME2N SYSTEM =====================
// ME2N data structure: { "4600005730": ["VENDOR NAME", "EUR", [[po,YYYY-MM,plant,nov,still,nItems,shortText],...]], ... }

const PLANT_MAP={
  'AR50':'APE - AR50','ARJ0':'LESC - ARJ0','AR20':'TDF - AR20','AR30':'PQ - AR30',
  'AR40':'RIO CHICO - AR40','ARM0':'PLYII - ARM0','ARN0':'MLO-123 - ARN0',
  'ARO0':'CAN-111 - ARO0','ARP0':'CAN-113 - ARP0','AR10':'BSAS - AR10',
  'AR60':'ASR - AR60','ARK0':'RCZA - ARK0'
};
function plantLabel(p){return PLANT_MAP[p]||p||'—';}

// Get total consumed (sum of Net Order Value) for a contract number from ME2N
function getConsumed(contractNum){
  const d=ME2N[contractNum];
  if(!d)return null; // null = no data (not 0)
  return d[2].reduce((s,p)=>s+p[3],0);
}

function importMe2n(input){
  const file=input.files[0];if(!file)return;
  toast('Procesando Excel...','ok');
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=new Uint8Array(e.target.result);
      const wb=XLSX.read(data,{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
      if(json.length<2){toast('Excel vacío','er');return;}
      // Process rows (skip header)
      const poAgg={};
      for(let i=1;i<json.length;i++){
        const r=json[i];
        const oa=String(r[0]||'').trim();
        const po=String(r[1]||'').trim();
        if(!po)continue;
        const dt=r[4];
        let ym='';
        if(dt instanceof Date){ym=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');}
        else if(typeof dt==='string'&&dt.length>=7){ym=dt.substring(0,7);}
        const vendor=String(r[5]||'').trim().substring(0,40);
        const shortText=String(r[7]||'').trim().substring(0,80);
        const plant=String(r[9]||'').trim();
        const curr=String(r[13]||'').trim();
        const still=parseFloat(r[14])||0;
        const nov=parseFloat(r[17])||0;
        if(!poAgg[po])poAgg[po]={oa:'',dt:'',pl:'',cu:'',n:0,s:0,ni:0,v:'',st:''};
        const d=poAgg[po];
        if(oa)d.oa=oa;
        if(ym&&!d.dt)d.dt=ym;
        if(plant)d.pl=plant;
        if(curr)d.cu=curr;
        if(vendor)d.v=vendor;
        if(shortText&&!d.st)d.st=shortText;
        d.n+=nov;d.s+=still;d.ni++;
      }
      // Build contract-level
      const result={};
      for(const[poNum,pd]of Object.entries(poAgg)){
        const oa=pd.oa||'SIN_CTTO';
        if(!result[oa])result[oa]=['','',[]];
        if(pd.v)result[oa][0]=pd.v;
        if(pd.cu)result[oa][1]=pd.cu;
        result[oa][2].push([poNum,pd.dt,pd.pl,Math.round(pd.n*100)/100,Math.round(pd.s*100)/100,pd.ni,pd.st||'']);
      }
      ME2N=result;
      saveMe2n();updNav();renderMe2n();buildPlantFilter();
      const nC=Object.keys(result).length,nP=Object.keys(poAgg).length;
      toast(nP+' POs en '+nC+' contratos cargados','ok');
    }catch(err){toast('Error leyendo Excel','er');console.error(err);}
  };
  reader.readAsArrayBuffer(file);
  input.value='';
}

function purgeMe2n(){
  const n=Object.keys(ME2N).length;
  if(!n){toast('Base ME2N vacía','er');return;}
  if(!confirm('⚠️ ¿Eliminar toda la data ME2N ('+n+' contratos)?'))return;
  ME2N={};saveMe2n();updNav();renderMe2n();toast('ME2N vaciado','ok');
}

function buildPlantFilter(){
  const sel=document.getElementById('poPlant');if(!sel)return;
  const plants=new Set();
  for(const[oa,d]of Object.entries(ME2N)){d[2].forEach(p=>{if(p[2])plants.add(p[2]);});}
  const cur=sel.value;
  let h='<option value="">Todas las Plants</option>';
  [...plants].sort().forEach(p=>h+=`<option value="${p}">${plantLabel(p)}</option>`);
  sel.innerHTML=h;sel.value=cur;
}

function renderMe2n(){
  const box=document.getElementById('poBody');if(!box)return;
  const srch=(document.getElementById('poSrch')?.value||'').toLowerCase().trim();
  const fPlant=document.getElementById('poPlant')?.value||'';
  let rows=[];
  for(const[oa,d]of Object.entries(ME2N)){
    if(!oa||oa==='SIN_CTTO')continue;
    if(!d||!Array.isArray(d)||!Array.isArray(d[2]))continue; // Validar estructura
    const curr=d[1];
    for(const p of d[2])rows.push({oa,poNum:p[0],plant:p[2]||'',nov:p[3],still:p[4],curr});
  }
  if(srch) rows=rows.filter(r=>r.oa.includes(srch)||r.poNum.toLowerCase().includes(srch));
  if(fPlant) rows=rows.filter(r=>r.plant===fPlant);
  rows.sort((a,b)=>b.nov-a.nov);
  const totalAll=Object.values(ME2N).reduce((s,d)=>{
    if(!d||!Array.isArray(d)||!Array.isArray(d[2]))return s;
    return s+d[2].length;
  },0);
  document.getElementById('poLcnt').textContent=rows.length+'/'+totalAll;
  if(!rows.length){box.innerHTML=totalAll?'<div class="empty"><div class="ei">🔍</div><p>Sin resultados.</p></div>':'<div class="empty"><div class="ei">🛒</div><p>Sin datos ME2N. Subí un archivo Excel con la bajada de SAP.</p></div>';return;}
  let h='<div style="overflow-x:auto"><table><thead><tr><th>N° PO</th><th>N° Contrato</th><th>Net Order Value</th><th>Pend. Facturación</th><th>Mon.</th><th>Lugar</th></tr></thead><tbody>';
  for(const r of rows){const hasPend=r.still>0;const lugar=plantLabel(r.plant);h+=`<tr><td class="mono" style="font-size:11.5px;font-weight:700;color:var(--p700)">${esc(r.poNum)}</td><td class="mono" style="font-size:11.5px;font-weight:600;cursor:pointer;color:var(--p600);text-decoration:underline" onclick="verMe2nDet('${esc(r.oa)}')" title="Ver detalle contrato">${esc(r.oa)}</td><td class="mono" style="font-size:12px;font-weight:600">${fN(r.nov)}</td><td class="mono" style="font-size:12px">${hasPend?'<span class="bdg noinv">'+fN(r.still)+'</span>':'<span style="color:var(--g500)">—</span>'}</td><td style="font-size:12px;font-weight:600">${esc(r.curr)}</td><td style="font-size:11.5px;white-space:nowrap">${esc(lugar)}</td></tr>`;}
  h+='</tbody></table></div>';box.innerHTML=h;
}

function verMe2nDet(oa){poDetOA=oa;go('me2ndet');}

function renderMe2nDet(){
  const card=document.getElementById('poDetCard');if(!card)return;const d=ME2N[poDetOA];if(!d){go('me2n');return;}
  const vendor=d[0],curr=d[1],pos=d[2];const totalNOV=pos.reduce((s,p)=>s+p[3],0);const totalStill=pos.reduce((s,p)=>s+p[4],0);const totalPO=pos.length;const totalItems=pos.reduce((s,p)=>s+p[5],0);
  const byMonth={};pos.forEach(p=>{const m=p[1]||'Sin fecha';if(!byMonth[m])byMonth[m]={pos:[],total:0,still:0};byMonth[m].pos.push(p);byMonth[m].total+=p[3];byMonth[m].still+=p[4];});
  const months=Object.keys(byMonth).sort().reverse();const plants=[...new Set(pos.map(p=>p[2]).filter(Boolean))].sort();
  let monthsHTML='';months.forEach((m,mi)=>{const md=byMonth[m];const pct=totalNOV>0?(md.total/totalNOV*100):0;const label=m==='Sin fecha'?'Sin fecha':formatMonth(m);monthsHTML+=`<div class="po-month" onclick="togglePoMonth(${mi})"><div class="pm-h"><span class="pm-t">${label}</span><span class="pm-cnt">${md.pos.length} POs</span><span class="pm-v">${curr} ${fN(md.total)}</span></div><div class="pm-bar"><div class="pbar"><div class="fill green" style="width:${pct}%"></div></div></div></div><div class="po-lines" id="poM_${mi}"><div style="padding:6px 10px;display:grid;grid-template-columns:140px 1fr 140px 130px;gap:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--g500);border-bottom:1px solid var(--g200)"><span>N° PO</span><span>Lugar</span><span style="text-align:right">Net Order Value</span><span style="text-align:right">Pend. Facturación</span></div>`;md.pos.sort((a,b)=>b[3]-a[3]).forEach(p=>{monthsHTML+=`<div class="po-line" style="grid-template-columns:140px 1fr 140px 130px"><span class="po-num">${p[0]}</span><span style="font-size:11px">${plantLabel(p[2])}</span><span class="mono" style="text-align:right;font-size:11px">${fN(p[3])}</span><span class="mono" style="text-align:right;font-size:11px">${p[4]>0?fN(p[4]):'—'}</span></div>`;});monthsHTML+='</div>';});
  card.innerHTML=`<div class="card"><div class="det-h"><div><h2>${esc(poDetOA)}</h2><div class="ds">${esc(vendor)} · ${curr}</div></div><div><span class="bdg blue" style="font-size:12px;padding:5px 14px">${plants.map(p=>plantLabel(p)).join(', ')}</span></div></div><div class="po-summ"><div class="po-sc"><div class="po-sl">Net Order Value Total</div><div class="po-sv">${curr} ${fN(totalNOV)}</div></div><div class="po-sc"><div class="po-sl">Pend. Facturación</div><div class="po-sv ${totalStill>0?'':'sm'}" style="${totalStill>0?'color:#92400e':''}">${totalStill>0?curr+' '+fN(totalStill):'—'}</div></div><div class="po-sc"><div class="po-sl">Purchase Orders</div><div class="po-sv">${totalPO}</div></div><div class="po-sc"><div class="po-sl">Líneas Totales</div><div class="po-sv">${totalItems}</div></div></div><div style="padding:16px 20px;border-bottom:1px solid var(--g200)"><span style="font-size:13px;font-weight:600;color:var(--p800)">Consumo Mensual</span><span style="font-size:11px;color:var(--g500);margin-left:8px">(clic para expandir)</span></div>${monthsHTML}</div>`;
}

function togglePoMonth(i){document.getElementById('poM_'+i)?.classList.toggle('open');}

function formatMonth(ym){
  const[y,m]=ym.split('-');
  const names=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return names[parseInt(m)-1]+' '+y;
}

// ═══════════ PO DASHBOARD ═══════════════════════════════
let _poAvgM=6;
function renderPoSection(cc){
  const d=ME2N[cc.num];
  if(!d||!d[2].length) return '<div class="section-box"><h3>🛒 Purchase Orders (SAP)</h3><div style="font-size:12.5px;color:var(--g500)">Sin POs en ME2N. Importá el Excel desde Purchase Orders.</div></div>';
  const cPos=d[2],curr=d[1]||cc.mon;const totNOV=cPos.reduce((s,p)=>s+p[3],0);const totTV=cc.monto+(cc.aves||[]).filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0)+(cc.aves||[]).filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);const rem=totTV-totNOV;const remMonths=monthsRemainingInclusive(ymToday(),cc.fechaFin);
  const byM={};cPos.forEach(p=>{const m=p[1]||'Sin fecha';if(!byM[m])byM[m]={pos:[],nov:0,still:0};byM[m].pos.push(p);byM[m].nov+=p[3];byM[m].still+=p[4];});
  const months=Object.keys(byM).filter(m=>m!=='Sin fecha').sort();const allM=[...months];if(byM['Sin fecha'])allM.push('Sin fecha');const recentMonths=months.slice(-Math.max(_poAvgM,1));const avg=recentMonths.length?recentMonths.reduce((s,m)=>s+byM[m].nov,0)/recentMonths.length:0;const maxN=Math.max(...allM.map(m=>byM[m]?.nov||0),1);
  let bars='';allM.forEach((m,mi)=>{const md=byM[m];const pct=maxN>0?(md.nov/maxN*100):0;const lbl=m==='Sin fecha'?'Sin fecha':formatMonth(m);const isZero=md.nov<=0.0001;bars+=`<div class="po-col" onclick="togglePOM(${mi})" title="${lbl}"><div class="po-col-top">${fN(md.nov)}</div><div class="po-col-chart"><div class="po-col-track"><div class="po-col-fill ${isZero?'zero':''}" style="height:${Math.max(pct,0)}%"></div></div></div><div class="po-col-lbl">${lbl}</div><div class="po-col-cnt">${md.pos.length} PO</div></div>`;});
  let details='';allM.forEach((m,mi)=>{const md=byM[m];const lbl=m==='Sin fecha'?'Sin fecha':formatMonth(m);details+=`<div class="po-mdet" id="pom_${mi}"><div class="po-mdet-title">${lbl} · ${md.pos.length} PO${md.pos.length!==1?'s':''} · ${curr} ${fN(md.nov)}</div><table class="enm-tbl" style="font-size:10.5px"><thead><tr><th>N° PO</th><th>Lugar</th><th style="text-align:right">Net Order Value</th><th style="text-align:right">Pend. Facturación</th></tr></thead><tbody>${md.pos.sort((a,b)=>b[3]-a[3]).map(p=>`<tr><td class="mono" style="font-weight:700;color:var(--p700)">${esc(p[0])}</td><td style="font-size:10px">${esc(plantLabel(p[2]))}</td><td class="mono" style="text-align:right">${fN(p[3])}</td><td class="mono" style="text-align:right">${p[4]>0?fN(p[4]):'—'}</td></tr>`).join('')}</tbody></table></div>`;});
  const byPl={};cPos.forEach(p=>{const pl=plantLabel(p[2])||'—';if(!byPl[pl])byPl[pl]=0;byPl[pl]+=p[3];});const plants=Object.entries(byPl).sort((a,b)=>b[1]-a[1]).map(([pl,v])=>`<div class="pl-row"><span class="pl-lbl" title="${esc(pl)}">${esc(pl)}</span><div class="pl-bar"><div class="pl-fill" style="width:${totNOV>0?(v/totNOV*100).toFixed(1):0}%"></div></div><span class="pl-pct">${totNOV>0?(v/totNOV*100).toFixed(1):'0.0'}%</span></div>`).join('');
  return `<div class="section-box"><h3>🛒 Purchase Orders — Dashboard SAP <span class="avg-ctl">Prom. últ. <input type="number" value="${_poAvgM}" min="1" max="24" onchange="_poAvgM=parseInt(this.value)||6;renderDet()" style="width:38px"> meses</span></h3><div class="po-kpi-bar"><div class="kc"><div class="kl">Total POs</div><div class="kv" style="color:var(--p700)">${cPos.length}</div></div><div class="kc"><div class="kl">Consumido SAP</div><div class="kv" style="color:var(--r500)">${curr} ${fN(totNOV)}</div></div><div class="kc"><div class="kl">Meses restantes</div><div class="kv" style="color:var(--p600)">${remMonths}</div></div><div class="kc"><div class="kl">Prom. mensual (últ.${_poAvgM}m)</div><div class="kv" style="color:var(--p600)">${curr} ${fN(avg)}</div></div></div><div class="po-dashboard-grid"><div class="po-bars"><div style="font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Consumo mensual ▸ horizontal · clic para ver POs</div><div class="po-timeline-scroll"><div class="po-timeline">${bars}</div></div>${details}</div><div class="po-plants"><div style="font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Por Lugar</div>${plants}${avg>0?`<div style="margin-top:12px;padding:8px;background:var(--p50);border-radius:6px;font-size:11px;color:var(--p700)"><strong>Proyección:</strong> ~${Math.round(rem/avg)} meses al ritmo actual</div>`:''}</div></div></div>`;
}
function togglePOM(i){document.getElementById('pom_'+i)?.classList.toggle('open');}

// ═══════════ CONTRACT HELPERS ════════════════════════════
function getContractMonths(cc){
  const m=[];if(!cc.fechaIni||!cc.fechaFin)return m;
  const d=new Date(cc.fechaIni+'T00:00:00'),end=new Date(cc.fechaFin+'T00:00:00');
  while(d<=end){m.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));d.setMonth(d.getMonth()+1);}
  return m;
}
function isNumericCol(tar,ci){
  const col=(tar.cols[ci]||'').toLowerCase();
  if(/valor|precio|unitario|monto|tarifa|importe|cost|rate/.test(col))return true;
  let n=0,t=0;tar.rows.forEach(r=>{const v=r[ci];if(v!==''&&v!=null){t++;if(!isNaN(parseFloat(v))&&String(v).trim()!=='')n++;}});
  return t>2&&n/t>0.7;
}
function getApplicableTariff(cc,period){
  const all=getApplicableTariffs(cc,period);return all.length?all[0]:null;
}
function getApplicableTariffs(cc,period){
  if(!cc.tarifarios||!cc.tarifarios.length)return[];
  const periods=[...new Set(cc.tarifarios.filter(t=>t.period&&t.period<=period).map(t=>t.period))].sort();
  if(periods.length){const best=periods[periods.length-1];return cc.tarifarios.filter(t=>t.period===best);}
  const base=cc.tarifarios.filter(t=>!t.period);
  return base.length?base:(cc.tarifarios.length?cc.tarifarios:[]);
}

// ═══════════ AMENDMENT LOGIC ════════════════════════════
function onEnmTipoChange(){
  const t=gv('ne_tipo');
  document.getElementById('enm_ext').style.display=t==='EXTENSION'?'':'none';
  document.getElementById('enm_mot_grp').style.display=['SCOPE','CLAUSULAS','OTRO'].includes(t)?'':'none';
  document.getElementById('enm_poly').style.display=t==='ACTUALIZACION_TARIFAS'?'':'none';
  const scopeSub=document.getElementById('enm_scope_sub');
  if(scopeSub) scopeSub.style.display=t==='SCOPE'?'':'none';
  if(['SCOPE','CLAUSULAS','OTRO'].includes(t)){
    const lbl={'SCOPE':'🔧 Descripción del cambio de alcance *','CLAUSULAS':'📋 Descripción de las cláusulas modificadas *','OTRO':'💬 Descripción *'};
    const lblEl=document.getElementById('enm_mot_lbl');
    if(lblEl) lblEl.textContent=(lbl[t]||'Descripción *');
  }
  if(t==='ACTUALIZACION_TARIFAS')buildPolyForm();
}
function onCorrToggle(){
  const on=document.getElementById('ne_isCorr').checked;
  document.getElementById('ne_isCorr_l').textContent=on?'Sí':'No';
  document.getElementById('ne_corrGrp').style.display=on?'':'none';
}
function prefillCorrEnm(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const num=parseInt(document.getElementById('ne_corrEnm')?.value);
  const enm=cc.enmiendas?.find(e=>e.num===num);
  if(enm){
    const bp=document.getElementById('ne_basePer');const np=document.getElementById('ne_newPer');
    if(bp&&enm.basePeriodo)bp.value=enm.basePeriodo;
    if(np&&enm.nuevoPeriodo)np.value=enm.nuevoPeriodo;
    buildPolyForm(enm);
  }
}
function buildPolyForm(prefill){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const poly=(cc.poly||[]).filter(p=>p.idx);
  const box=document.getElementById('ne_polyTerms');if(!box)return;
  const basePer=gv('ne_basePer')||cc.btar||'';
  const baseTar=getApplicableTariff(cc,basePer);
  if(!poly.length){box.innerHTML='<div class="info-box amber">Sin fórmula polinómica. Editá el contrato para cargar los índices.</div>';return;}
  let h='<div style="display:grid;grid-template-columns:22px 1.2fr 65px 75px 100px 100px;gap:5px;padding:3px 8px;font-size:9px;font-weight:700;text-transform:uppercase;color:var(--g500);margin-bottom:3px"><span></span><span>Índice</span><span style="text-align:center">Incid.</span><span style="text-align:center">Inc×%</span><span>% Acumulado</span><span>Nueva Base</span></div>';
  poly.forEach((t,i)=>{
    const pa=prefill?.polyTerms?.[i]?.pctAcum||'';
    const pb=prefill?.polyTerms?.[i]?.nuevaBase||t.base||'';
    h+=`<div class="pup-row">
      <div style="width:20px;height:20px;border-radius:50%;background:var(--p200);color:var(--p800);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">${i+1}</div>
      <input type="text" value="${esc(t.idx)}" disabled style="font-size:11px;border-color:var(--g200)">
      <input type="text" value="${t.inc}" disabled style="font-size:11px;text-align:center;border-color:var(--g200)">
      <input type="text" id="ne_ip_${i}" value="0%" disabled style="font-size:11px;text-align:center;font-weight:700;color:var(--g600);border-color:var(--g200)">
      <input type="number" id="ne_acum_${i}" step="0.01" placeholder="%" value="${pa}" oninput="calcPoly()">
      <input type="month" id="ne_nb_${i}" value="${esc(pb)}">
    </div>`;
  });
  const baseTars=getApplicableTariffs(cc,basePer);
  if(baseTars.length){const names=baseTars.map(t=>'"'+t.name+'"').join(', ');h+=`<div class="info-box blue" style="margin-top:6px;font-size:11px">Se actualizarán <strong>${baseTars.length} tabla${baseTars.length>1?'s':''}</strong>: ${esc(names)}. Nueva tarifa = tarifa_base × (1 + % polinómico).</div>`;}
  else h+=`<div class="info-box amber" style="margin-top:6px;font-size:11px">Sin tarifario para el período base seleccionado.</div>`;
  box.innerHTML=h;
}
function calcPoly(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return 0;
  const poly=(cc.poly||[]).filter(p=>p.idx);
  let pct=0;
  poly.forEach((t,i)=>{
    const a=parseFloat(document.getElementById('ne_acum_'+i)?.value)||0;
    const contrib=t.inc*(a/100);pct+=contrib;
    const el=document.getElementById('ne_ip_'+i);
    if(el)el.value=(contrib*100).toFixed(3)+'%';
  });
  const el=document.getElementById('ne_pctRes');
  if(el){el.textContent=(pct*100).toFixed(4)+'%';el.style.color=pct>0?'var(--g600)':'var(--r500)';}
  return pct;
}
function previewPolyTar(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const pct=calcPoly();
  if(Math.abs(pct)<0.000001){toast('Ingresá los % acumulados de cada índice','er');return;}
  const basePer=gv('ne_basePer');
  const tars=getApplicableTariffs(cc,basePer);
  const box=document.getElementById('ne_tarPrev');if(!box)return;
  if(!tars.length){box.innerHTML='<div class="info-box amber" style="margin-top:8px">Sin tarifario para ese período base.</div>';return;}
  const adj=1+pct;
  let h=`<div class="info-box blue" style="margin-top:8px;font-size:11px">Factor <strong>×${adj.toFixed(6)}</strong> (+${(pct*100).toFixed(4)}%) — actualizando <strong>${tars.length} tabla${tars.length>1?'s':''}</strong></div>`;
  tars.forEach(tar=>{
    h+=`<div style="font-size:11px;font-weight:700;color:var(--p800);margin:10px 0 4px;padding:4px 8px;background:var(--p50);border-radius:4px;border-left:3px solid var(--p400)">📋 ${esc(tar.name)}</div>`;
    h+='<div class="tar-preview"><table><thead><tr>';
    tar.cols.forEach((col,ci)=>h+=`<th>${esc(col)}${isNumericCol(tar,ci)?'<span style="opacity:.5"> (base→nuevo)</span>':''}</th>`);
    h+='</tr></thead><tbody>';
    tar.rows.forEach(row=>{h+='<tr>';tar.cols.forEach((col,ci)=>{const v=row[ci];if(isNumericCol(tar,ci)&&v!==''&&v!=null){const nv=parseFloat(v)||0,nw=nv*adj;h+=`<td><span style="color:var(--g500);text-decoration:line-through;font-size:10px">${fN(nv)}</span> <span class="new-v">→ ${fN(nw)}</span></td>`;}else h+=`<td>${esc(String(v??''))}</td>`;});h+='</tr>';});
    h+='</tbody></table></div>';
  });
  box.innerHTML=h;
  const manEl=document.getElementById('ne_aveManual');if(manEl)manEl.value='';
  const noteEl=document.getElementById('ne_aveManualNote');if(noteEl)noteEl.style.display='none';
  document.getElementById('ne_aveSug').style.display='';
  calcAveSug();
}
let _polyLast=0;
function onAveManualChange(){
  const el=document.getElementById('ne_aveManual');
  const noteEl=document.getElementById('ne_aveManualNote');
  const montoEl=document.getElementById('ne_aveMonto');
  if(!el||!noteEl)return;
  const manualVal=el.value.trim();
  if(manualVal===''){noteEl.style.display='none';calcAveSug();}
  else{
    const mv=parseFloat(manualVal)||0;
    const autoMonto=parseFloat(montoEl?.dataset?.monto)||0;
    const diff=mv-autoMonto;
    noteEl.style.display='block';
    noteEl.innerHTML=`Usarás <strong>${fN(mv)}</strong> en lugar del calculado <strong>${fN(autoMonto)}</strong> <span style="color:${diff>=0?'var(--g600)':'var(--r500)'}">(${diff>=0?'+':''}${fN(diff)})</span>`;
  }
}
function calcAveSug(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const pct=calcPoly();_polyLast=pct;
  const tot=cc.monto+(cc.aves||[]).filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0)+(cc.aves||[]).filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const tipo=(document.querySelector('input[name="ne_ctipo"]:checked')?.value)||cc.tipo;
  const isObra=tipo==='OBRA';
  document.getElementById('ne_obraGrp').style.display=isObra?'':'none';
  const newPer=gv('ne_newPer')||'';
  const iniDate=new Date(cc.fechaIni+'T00:00:00');
  const totalMeses=Math.max(cc.plazo||1,1);
  let aveMonto=0,formula='';
  if(isObra){
    const pp=parseFloat(document.getElementById('ne_obraAdv')?.value)||0;
    aveMonto=pp>0?tot*(pp/100)*pct:0;
    formula=pp>0?`${cc.mon} ${fN(tot)} × ${pp}% av.pend. × ${(pct*100).toFixed(4)}% = <strong>${cc.mon} ${fN(aveMonto)}</strong>`:'Ingresá el % de avance pendiente.';
  } else {
    let mD=0;
    if(newPer){const np=new Date(newPer+'-01');mD=Math.max((np.getFullYear()-iniDate.getFullYear())*12+(np.getMonth()-iniDate.getMonth()),0);}
    const mR=Math.max(totalMeses-mD,0);
    const mM=tot/totalMeses;
    aveMonto=mM*mR*pct;
    formula=`(${cc.mon} ${fN(tot)} ÷ ${totalMeses} m.) × ${mR} m.rest. × ${(pct*100).toFixed(4)}% = <strong>${cc.mon} ${fN(aveMonto)}</strong>`;
  }
  document.getElementById('ne_aveFormula').innerHTML=formula;
  const el=document.getElementById('ne_aveMonto');
  if(el){el.textContent=aveMonto>0?cc.mon+' '+fN(aveMonto):'—';el.dataset.monto=aveMonto;}
}
function recalcTarChain(cc,fromPeriod){
  const pEnms=(cc.enmiendas||[]).filter(e=>e.tipo==='ACTUALIZACION_TARIFAS'&&e.nuevoPeriodo&&e.nuevoPeriodo>=fromPeriod&&!e.superseded).sort((a,b)=>a.nuevoPeriodo.localeCompare(b.nuevoPeriodo));
  pEnms.forEach(enm=>{
    const bTars=getApplicableTariffs(cc,enm.basePeriodo||'');if(!bTars.length)return;
    const adj=1+(enm.pctPoli||0);
    const existingForEnm=cc.tarifarios.filter(t=>t.enmNum===enm.num);
    bTars.forEach((bTar,ti)=>{
      const newRows=bTar.rows.map(row=>bTar.cols.map((col,ci)=>{const v=row[ci];return(isNumericCol(bTar,ci)&&v!==''&&v!=null)?Math.round((parseFloat(v)||0)*adj*100)/100:v;}));
      const baseName=bTar.name.replace(/\s*\(Enm\.\d+\)$/, '').trim();
      const match=existingForEnm.find(t=>t.sourceTableName===bTar.name)||existingForEnm[ti];
      if(match){match.rows=newRows;match.name=baseName+' (Enm.'+enm.num+')';}
    });
  });
}
async function guardarEnm(){
  const cc=window.DB.find(x=>x.id===window.detId); if(!cc) return;
  const tipo=gv('ne_tipo'); if(!tipo){ toast('Seleccioná el tipo', 'er'); return; }
  if(!cc.enmiendas) cc.enmiendas=[];
  if(!cc.tarifarios) cc.tarifarios=[];
  if(!cc.aves) cc.aves=[];

  const num = cc.enmiendas.length + 1;
  const enm = { num, tipo, fecha: new Date().toISOString().split('T')[0] };

  if(tipo==='EXTENSION'){
    const ff = document.getElementById('ne_ffin')?.value || '';
    if(!ff){ toast('Ingresá nueva fecha fin', 'er'); return; }
    if(new Date(ff+'T00:00:00') <= new Date((cc.fechaFin||cc.fechaIni)+'T00:00:00')){
      toast('La fecha debe ser posterior a la actual ('+fD(cc.fechaFin)+')', 'er');
      return;
    }
    if(!cc._fechaFinOriginal) cc._fechaFinOriginal = cc.fechaFin;
    enm.fechaFinNueva = ff;
    enm.extTipo = document.getElementById('ne_ext_tipo')?.value || 'FIN';
    cc.fechaFin = ff;
    cc.plazo = Math.max(((new Date(ff).getFullYear()-new Date(cc.fechaIni).getFullYear())*12+(new Date(ff).getMonth()-new Date(cc.fechaIni).getMonth())),0);
  } else if(tipo==='ACTUALIZACION_TARIFAS'){
    const pct = typeof calcPoly==='function' ? calcPoly() : 0;
    if(Math.abs(pct) < 0.000001){ toast('Ingresá los % acumulados', 'er'); return; }
    const basePer = gv('ne_basePer');
    const newPer = gv('ne_newPer');
    if(!newPer){ toast('Ingresá el nuevo período', 'er'); return; }
    enm.basePeriodo = basePer;
    enm.nuevoPeriodo = newPer;
    enm.pctPoli = pct;
    enm.tarSubtipo = document.getElementById('ne_tar_subtipo')?.value || 'POLINOMICA';
    const isCorr = document.getElementById('ne_isCorr')?.checked;
    const corrNum = isCorr ? (parseInt(document.getElementById('ne_corrEnm')?.value)||null) : null;
    enm.correccionDeEnm = corrNum || null;
    if(corrNum){
      const oe = cc.enmiendas.find(e=>e.num===corrNum);
      if(oe){ oe.superseded=true; oe.supersededBy=num; }
      cc.tarifarios = (cc.tarifarios||[]).filter(t=>t.enmNum!==corrNum);
    }
    const poly = (cc.poly||[]).filter(p=>p.idx);
    enm.polyTerms = poly.map((t,i)=>({
      idx:t.idx, inc:t.inc, baseOrig:t.base||'',
      pctAcum:parseFloat(document.getElementById('ne_acum_'+i)?.value)||0,
      nuevaBase:document.getElementById('ne_nb_'+i)?.value||''
    }));

    const bTars = typeof getApplicableTariffs==='function' ? (getApplicableTariffs(cc, basePer)||[]) : [];
    if(bTars.length){
      const adj = 1 + pct;
      bTars.forEach((bTar)=>{
        const newRows=(bTar.rows||[]).map(row=>(bTar.cols||[]).map((col,ci)=>{
          const v=row[ci];
          return (typeof isNumericCol==='function' && isNumericCol(bTar,ci) && v!=='' && v!=null) ? Math.round((parseFloat(v)||0)*adj*100)/100 : v;
        }));
        const baseName=String(bTar.name||'Tarifario').replace(/\s*\(Enm\.\d+\)$/,'').trim();
        cc.tarifarios.push({name:baseName+' (Enm.'+num+')', cols:[...(bTar.cols||[])], rows:newRows, period:newPer, enmNum:num, sourceTableName:bTar.name||''});
      });
      if(typeof recalcTarChain==='function') recalcTarChain(cc,newPer);
      
      // Actualizar base tarifaria
      cc.btar=newPer;
      
      // Actualizar monto del contrato aplicando ajuste polinómico
      const montoAnterior=cc.monto||0;
      if(!cc._montoOriginal) cc._montoOriginal=montoAnterior;
      const montoOriginal=cc._montoOriginal;
      const nuevoMonto=Math.round(montoOriginal*adj*100)/100;
      const incrementoMonto=nuevoMonto-montoAnterior;
      cc.monto=nuevoMonto;
      
      console.log('[guardarEnm] Monto actualizado:', montoAnterior.toFixed(2), '→', nuevoMonto.toFixed(2), '(+', (pct*100).toFixed(2)+'%)');
      
      // El AVE ya se genera más abajo con la lógica existente, pero actualizamos su monto
      // para reflejar el incremento real del contrato
      
      localStorage.removeItem('pol_eval_result_'+cc.id);
      localStorage.removeItem('pol_selected_months_'+cc.id);
      console.log('[guardarEnm] Nueva base tarifaria:', newPer);
    } else {
      cc.tarifarios.push({ name:'Lista de Precios (Enm.'+num+')', cols:['ITEM','DESCRIPCION','UNIDAD','PRECIO'], rows:[], period:newPer, enmNum:num, sourceTableName:'PENDIENTE_BASE', placeholder:true });
    }

    const aveManualEl=document.getElementById('ne_aveManual');
    const aveManualVal=aveManualEl && String(aveManualEl.value).trim()!=='' ? (parseFloat(aveManualEl.value)||0) : null;
    const aveAutoMonto=parseFloat(document.getElementById('ne_aveMonto')?.dataset?.monto)||0;
    const aveMonto=aveManualVal!==null ? aveManualVal : aveAutoMonto;
    if(aveMonto>0){
      const isManual=aveManualVal!==null;
      cc.aves.push({id:Date.now().toString(36)+Math.random().toString(36).substr(2,4), tipo:'POLINOMICA', subtipo:isManual?'MANUAL':'AUTO', concepto:'Polinómica '+(isManual?'manual':'auto')+' — Enm.'+num+' (+'+((pct)*100).toFixed(2)+'%)', monto:Math.round(aveMonto*100)/100, enmRef:num, periodo:newPer, autoGenerated:!isManual, fecha:new Date().toISOString()});
    }
  } else {
    const mot=document.getElementById('ne_mot')?.value.trim()||'';
    if(!mot){ toast('Ingresá la descripción', 'er'); return; }
    enm.motivo=mot;
    enm.descripcion=mot;
    if(tipo==='SCOPE') enm.scopeTipo=document.getElementById('ne_scope_tipo')?.value||'MAYOR';
  }

  cc.enmiendas.push(enm);
  cc.updatedAt=new Date().toISOString();
  if(!SB_OK) localStorage.setItem('cta_v7', JSON.stringify(window.DB));
  else await sbUpsertItem('contratos', cc);

  closeEnmPanel();
  renderDet();
  renderList();
  updNav();
  toast('Enmienda N°'+num+' guardada correctamente', 'ok');
  
  // Actualizar fuzzy search cache
  if (typeof window.initFuzzySearch === 'function') {
    window.initFuzzySearch();
  }
}

// ═══════════ AVE OWNER — Panel separado ══════════════════════
function openAveOwnerPanel(){
  const p=document.getElementById('aveOwnerPanel');
  if(p){p.classList.add('vis');p.scrollIntoView({behavior:'smooth',block:'nearest'});}
}
function closeAveOwnerPanel(){
  const p=document.getElementById('aveOwnerPanel');
  if(p){p.classList.remove('vis');}
  ['avo_sub','avo_enm','avo_monto','avo_per','avo_ffin','avo_otro'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  const fg=document.getElementById('avo_ffin_grp');if(fg)fg.style.display='none';
  const og=document.getElementById('avo_otro_grp');if(og)og.style.display='none';
}
function onAvoSubChange(){
  const v=document.getElementById('avo_sub')?.value||'';
  const fg=document.getElementById('avo_ffin_grp');if(fg)fg.style.display=v==='EXTENSION PLAZO'?'':'none';
  const og=document.getElementById('avo_otro_grp');if(og)og.style.display=v==='OTRO'?'':'none';
}
async function saveAveOwner(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const aveMonto=parseFloat(document.getElementById('avo_monto')?.value)||0;
  if(!aveMonto){toast('Ingresá el monto del AVE','er');return;}
  const sub=document.getElementById('avo_sub')?.value||'';
  if(!sub){toast('Seleccioná el concepto','er');return;}
  
  const plazo = cc.plazo_meses || cc.plazo || 36;
  const totalActual = cc.tot || cc.monto || 0;
  const nuevoTotal = totalActual + aveMonto;
  const nuevoMensual = round2(nuevoTotal / plazo);
  
  let ffin=null;
  if(sub==='EXTENSION PLAZO'){
    ffin=document.getElementById('avo_ffin')?.value||'';
    if(!ffin){toast('Ingresá nueva fecha fin','er');return;}
    cc.fechaFin=ffin;
    cc.plazo=Math.max(((new Date(ffin).getFullYear()-new Date(cc.fechaIni).getFullYear())*12+(new Date(ffin).getMonth()-new Date(cc.fechaIni).getMonth())),0);
  }
  
  if(!cc.aves)cc.aves=[];
  const enmRefRaw=document.getElementById('avo_enm')?.value||'';
  cc.aves.push({
    id:Date.now().toString(36)+Math.random().toString(36).substr(2,4),
    tipo:'OWNER',
    subtipo:sub,
    concepto:sub==='OTRO'?(document.getElementById('avo_otro')?.value.trim()||null):null,
    monto:aveMonto,
    enmRef:enmRefRaw?parseInt(enmRefRaw):null,
    periodo:document.getElementById('avo_per')?.value||null,
    fechaFinNueva:ffin,
    fecha:new Date().toISOString()
  });
  
  cc.tot = nuevoTotal;
  cc.montoMensualEst = nuevoMensual;
  
  const ownerSum=cc.aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const limit=cc._aveOwnerLimit||250000;
  cc.updatedAt=new Date().toISOString();
  if(!SB_OK)localStorage.setItem('cta_v7',JSON.stringify(window.DB));
  else await sbUpsertItem('contratos',cc);
  closeAveOwnerPanel();
  renderDet();renderList();updNav();
  if(ownerSum>limit) toast(`⛔ AVE Owner acumulado (${fN(ownerSum)}) supera límite ${fN(limit)}`,'er');
  else toast('AVE Owner registrado — '+cc.mon+' '+fN(aveMonto),'ok');
}
async function setAveLimit(id,val){
  const cc=window.DB.find(x=>x.id===id);if(!cc)return;
  cc._aveOwnerLimit=parseFloat(val)||250000;
  cc.updatedAt=new Date().toISOString();
  if(!SB_OK)localStorage.setItem('cta_v7',JSON.stringify(window.DB));
  else await sbUpsertItem('contratos',cc);
  renderDet();
}

// Helpers TC global para validaciones (toUsd / fmtUsd están scoped en renderDet)
function _ave_toUsd(cc, ar){
  if(!isFinite(ar)) return 0;
  const isUsd=String(cc.mon||'').toUpperCase().indexOf('USD')>=0;
  if(isUsd) return ar;
  const tc=(typeof getTCFromStore==='function'?getTCFromStore():null)||1000;
  return tc>0?(ar/tc):0;
}
function _ave_fmtUsd(v){ return 'USD '+(Math.round((v||0)*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }

async function markValidationAic(cid){
  const cc=window.DB.find(x=>x.id===cid); if(!cc) return;
  const aves=cc.aves||[];
  const pending=aves.filter(a=>a.tipo==='POLINOMICA' && !a.aicValidated);
  if(!pending.length){ toast('No hay AVEs polinómicas vigentes para validar','er'); return; }
  const totalAr=pending.reduce((s,a)=>s+(a.monto||0),0);
  const totalUsd=_ave_toUsd(cc,totalAr);
  if(!confirm('¿Marcar validación AIC para '+pending.length+' AVE polinómica(s), total '+_ave_fmtUsd(totalUsd)+'?\n\nA partir de ahora el contador empieza en 0 para nuevas AVEs polinómicas.')) return;
  const validationId='AIC_'+Date.now().toString(36);
  const now=new Date().toISOString();
  pending.forEach(a=>{ a.aicValidated=true; a.aicValidationId=validationId; a.aicValidationDate=now; });
  cc.aicValidations=cc.aicValidations||[];
  cc.aicValidations.push({id:validationId, date:now, totalAr:totalAr, totalUsd:totalUsd, aveIds:pending.map(a=>a.id), tc:(typeof getTCFromStore==='function'?getTCFromStore():null)||1000});
  cc.updatedAt=now;
  try{ localStorage.setItem('cta_v7',JSON.stringify(window.DB)); }catch(_e){}
  if(SB_OK){ try{ await sbUpsertItem('contratos',cc); }catch(e){ console.error('markValidationAic save',e); toast('⚠ Validación marcada localmente — error al sincronizar','er'); } }
  toast('✅ Validación AIC registrada · '+pending.length+' AVE(s) · '+_ave_fmtUsd(totalUsd),'ok');
  renderDet();
}

async function markValidationCc(cid){
  const cc=window.DB.find(x=>x.id===cid); if(!cc) return;
  const aves=cc.aves||[];
  const pending=aves.filter(a=>a.tipo==='OWNER' && !a.ccValidated);
  if(!pending.length){ toast('No hay AVEs owner vigentes para validar','er'); return; }
  const totalAr=pending.reduce((s,a)=>s+(a.monto||0),0);
  const totalUsd=_ave_toUsd(cc,totalAr);
  if(!confirm('¿Marcar validación CC para '+pending.length+' AVE owner(s), total '+_ave_fmtUsd(totalUsd)+'?\n\nA partir de ahora el contador empieza en 0 para nuevas AVEs owner.')) return;
  const validationId='CC_'+Date.now().toString(36);
  const now=new Date().toISOString();
  pending.forEach(a=>{ a.ccValidated=true; a.ccValidationId=validationId; a.ccValidationDate=now; });
  cc.ccValidations=cc.ccValidations||[];
  cc.ccValidations.push({id:validationId, date:now, totalAr:totalAr, totalUsd:totalUsd, aveIds:pending.map(a=>a.id), tc:(typeof getTCFromStore==='function'?getTCFromStore():null)||1000});
  cc.updatedAt=now;
  try{ localStorage.setItem('cta_v7',JSON.stringify(window.DB)); }catch(_e){}
  if(SB_OK){ try{ await sbUpsertItem('contratos',cc); }catch(e){ console.error('markValidationCc save',e); toast('⚠ Validación marcada localmente — error al sincronizar','er'); } }
  toast('✅ Validación CC registrada · '+pending.length+' AVE(s) · '+_ave_fmtUsd(totalUsd),'ok');
  renderDet();
}

async function undoValidationAic(cid, validationId){
  const cc=window.DB.find(x=>x.id===cid); if(!cc) return;
  if(!confirm('¿Deshacer validación AIC '+validationId+'? Las AVEs volverán a contar en el límite vigente.')) return;
  (cc.aves||[]).forEach(a=>{ if(a.aicValidationId===validationId){ a.aicValidated=false; delete a.aicValidationId; delete a.aicValidationDate; } });
  cc.aicValidations=(cc.aicValidations||[]).filter(v=>v.id!==validationId);
  cc.updatedAt=new Date().toISOString();
  try{ localStorage.setItem('cta_v7',JSON.stringify(window.DB)); }catch(_e){}
  if(SB_OK){ try{ await sbUpsertItem('contratos',cc); }catch(_e){} }
  toast('Validación AIC deshecha','ok');
  renderDet();
}

async function undoValidationCc(cid, validationId){
  const cc=window.DB.find(x=>x.id===cid); if(!cc) return;
  if(!confirm('¿Deshacer validación CC '+validationId+'? Las AVEs volverán a contar en el límite vigente.')) return;
  (cc.aves||[]).forEach(a=>{ if(a.ccValidationId===validationId){ a.ccValidated=false; delete a.ccValidationId; delete a.ccValidationDate; } });
  cc.ccValidations=(cc.ccValidations||[]).filter(v=>v.id!==validationId);
  cc.updatedAt=new Date().toISOString();
  try{ localStorage.setItem('cta_v7',JSON.stringify(window.DB)); }catch(_e){}
  if(SB_OK){ try{ await sbUpsertItem('contratos',cc); }catch(_e){} }
  toast('Validación CC deshecha','ok');
  renderDet();
}

// ═══════════ CERTIFICACIONES (OBRA) ══════════════════
// Stub legacy (panel ya no tiene checkboxes; modal maneja todo)
function toggleAllCerts(){}
// Selección de scope OBRA persistida por contrato. Estructura: {pos:[poNum,...], includeRemanente:bool}
function getStoredScopeSelection(cid){
  try{ var raw=localStorage.getItem('obra_scope_sel_'+cid); return raw?JSON.parse(raw):{pos:[],includeRemanente:false}; }
  catch(_e){ return {pos:[],includeRemanente:false}; }
}
function setStoredScopeSelection(cid, sel){
  try{ localStorage.setItem('obra_scope_sel_'+cid, JSON.stringify(sel||{pos:[],includeRemanente:false})); }catch(_e){}
}
function clearStoredScopeSelection(cid){
  try{ localStorage.removeItem('obra_scope_sel_'+cid); }catch(_e){}
}
// Calcula el scope efectivo para OBRA: POs seleccionadas (con su NOV) + remanente.
function getCertSelectionScope(cid){
  const c=window.DB.find(x=>x.id===cid);
  if(!c||c.tipo!=='OBRA') return null;
  const poData=ME2N[c.num];
  const pos=(poData&&Array.isArray(poData)&&Array.isArray(poData[2]))?poData[2]:[];
  const totalCerts=pos.reduce((s,p)=>s+(p[3]||0),0);
  const aves=c.aves||[];
  const avePoly=aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
  const aveOwner=aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const montoBase=c.montoBase||((c.monto||0)-avePoly-aveOwner);
  const remanente=Math.max(0,montoBase-totalCerts);
  const sel=getStoredScopeSelection(cid);
  const selSet={}; (sel.pos||[]).forEach(po=>{selSet[po]=true;});
  const selected=pos.filter(p=>selSet[p[0]||'']).map(p=>({po:p[0]||'', nov:p[3]||0}));
  const includeRemanente=!!sel.includeRemanente;
  const totalSelected=selected.reduce((s,r)=>s+(r.nov||0),0);
  const totalBase=totalSelected+(includeRemanente?remanente:0);
  return {pos:selected, includeRemanente, remanente, totalSelected, totalBase, montoBase, totalCerts};
}
// Quita la marca de "ajustada" de una PO. NO revierte el AVE/enmienda registrados (auditoría).
function unadjustPo(cid, poNum){
  const c=window.DB.find(x=>x.id===cid); if(!c){toast('Contrato no encontrado','er');return;}
  const meta=c.posAjustadasMeta&&c.posAjustadasMeta[poNum];
  const lbl=meta?(' (ajustada en '+(meta.ym||'?')+' · Enm.'+(meta.enm||'?')+')'):'';
  if(!confirm('¿Destildar la PO '+poNum+lbl+' como ajustada?\n\nEsto solo quita la marca para permitir re-incluirla en futuros ajustes. NO revierte el AVE ni la enmienda ya registrados (quedan en el historial).'))return;
  if(c.posAjustadas){
    const i=c.posAjustadas.indexOf(poNum);
    if(i>=0) c.posAjustadas.splice(i,1);
  }
  if(c.posAjustadasMeta && c.posAjustadasMeta[poNum]) delete c.posAjustadasMeta[poNum];
  try{ if(typeof sbUpsertItem==='function') sbUpsertItem(c); }catch(_e){}
  try{ localStorage.setItem('cta_v7', JSON.stringify(window.DB)); }catch(_e){}
  if(typeof save==='function') save();
  if(typeof renderDet==='function') renderDet();
  toast('PO '+poNum+' destildada','ok');
}
// Stub legacy: el panel ya no muestra summary; el modal lo recalcula en cada render.
function updateCertSelectionSummary(){}

// ═══════════ RENDERLIST WITH REMANENTE ══════════════════
// ═══════════ TARIFARIO ENHANCED ══════════════════════════
let _tarTab=0,_tarPeriod=null,_tarSort={ci:null,dir:1};
function getTarPeriodValue(cc,t){return t?.period||cc?.btar||cc?.fechaIni?.substring(0,7)||'';}
function getLastTariffPeriod(cc){
  if(!cc||!cc.tarifarios||!cc.tarifarios.length)return null;
  const periods=cc.tarifarios.map(t=>getTarPeriodValue(cc,t)).filter(Boolean).sort();
  return periods.length?periods[periods.length-1]:null;
}
function getTarEnmLabel(cc,enmNum){if(!enmNum)return 'Base contractual';const enm=(cc.enmiendas||[]).find(e=>e.num===enmNum);if(!enm)return 'Enm.N°'+enmNum;const tipo=enm.tipo==='ACTUALIZACION_TARIFAS'?'Actualización de Tarifas':enm.tipo==='EXTENSION'?'Extensión':enm.tipo==='SCOPE'?'Scope':enm.tipo==='CLAUSULAS'?'Cláusulas':'Otro';return 'Enm.N°'+enmNum+' · '+tipo;}
function setTarPeriod(period){_tarPeriod=period;_tarTab=0;renderTarifario();}
function renderTarifario(){
  const box=document.getElementById('tarContainer');if(!box)return;
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const raw=getTar();
  const importCtl = '<input type="file" id="tarAiIn" accept=".doc,.docx,.xls,.xlsx" style="display:none" onchange="importPriceListsFromFiles(this.files);this.value=\'\'">';
  const topActions = `<div class="tar-actions" style="margin-bottom:10px;border:1px solid var(--g200);border-radius:8px;background:var(--g50)"><button class="btn btn-p btn-sm" onclick="openPriceListImportPicker()">🤖 Importar listas (Word/Excel)</button><button class="btn btn-s btn-sm" onclick="addTarTable()">➕ Nueva tabla</button><button class="btn btn-g btn-sm" onclick="saveTarifarios()">💾 Guardar ahora</button>${raw.length?'<span style="margin-left:auto;font-size:11px;color:var(--g500)">Editá precios inline, agregá/borrá filas o eliminá la tabla seleccionada.</span>':''}</div>`;
  if(!raw.length){box.innerHTML=importCtl+topActions+'<div class="empty" style="padding:28px"><div class="ei">💲</div><p>Sin listas de precios. Importá desde Word/Excel con IA o creá una tabla manual.</p></div>';return;}
  const all=raw.map((t,i)=>({...t,_idx:i,_period:getTarPeriodValue(cc,t)}));
  let periods=[...new Set(all.map(t=>t._period).filter(Boolean))].sort();
  if(!periods.length){const fallback=cc.btar||cc.fechaIni?.substring(0,7)||'';if(fallback)periods=[fallback];}
  if(!_tarPeriod||!periods.includes(_tarPeriod))_tarPeriod=periods[periods.length-1]||periods[0]||null;
  const visible=all.filter(t=>t._period===_tarPeriod);
  if(!visible.length){box.innerHTML=importCtl+topActions+'<div class="empty" style="padding:28px"><div class="ei">💲</div><p>Sin tablas para el período seleccionado.</p></div>';return;}
  const di=Math.min(_tarTab||0,visible.length-1);const t=visible[di];_tarTab=di;
  const enmNums=[...new Set(visible.map(x=>x.enmNum).filter(Boolean))];
  const enmLabel=enmNums.length===1?getTarEnmLabel(cc,enmNums[0]):enmNums.length>1?'Múltiples enmiendas':'Base contractual';
  const periodLabel=_tarPeriod?formatMonth(_tarPeriod):'Sin período';
  const srcLabel=t?.source==='WORD_IA'?'IA Word':t?.source==='EXCEL'?'Excel':t?.source||'Manual';
  let h=importCtl+topActions;
  h+='<div class="tar-period-nav">';
  periods.forEach(p=>{h+=`<button class="tar-period-chip ${p===_tarPeriod?'act':''}" onclick="setTarPeriod('${p}')">${formatMonth(p)}</button>`;});
  h+='</div>';
  h+=`<div class="tar-period-meta"><span class="tar-period-tag" onclick="changeTarPeriod(${t?t._idx:0})" style="cursor:pointer" title="Click para cambiar el mes de aplicación de la tabla seleccionada">Período: ${periodLabel} ✏️</span><span class="tar-period-tag">Origen: ${enmLabel}</span><span class="tar-period-tag neutral">Fuente: ${esc(srcLabel)}</span><span class="tar-period-tag neutral">${visible.length} ${visible.length===1?'tabla':'tablas'}</span></div>`;
  h+='<div class="tar-tabs">';
  visible.forEach((tab,vi)=>{h+=`<div class="tar-tab ${vi===di?'act':''}" onclick="switchTarTab(${vi})"><span>${esc(tab.name)}</span><span class="tar-x" onclick="event.stopPropagation();delTarTable(${tab._idx})">✕</span></div>`;});
  h+='<button class="tar-add" onclick="addTarTable()" title="Nueva tabla">+</button></div>';
  if(t&&t.cols&&t.rows){
    let rows=[...t.rows];
    if(_tarSort.ci!==null){const ci=_tarSort.ci,dir=_tarSort.dir;rows.sort((a,b)=>{const av=a[ci]??'',bv=b[ci]??'';const an=parseFloat(av),bn=parseFloat(bv);if(!isNaN(an)&&!isNaN(bn))return(an-bn)*dir;return String(av).localeCompare(String(bv))*dir;});}
    h+='<div class="tar-wrap"><div style="overflow-x:auto;position:relative"><table class="tar-tbl"><thead><tr>';
    t.cols.forEach((col,ci)=>{const on=_tarSort.ci===ci,ico=on?(_tarSort.dir===1?'↑':'↓'):'↕',isN=isNumericCol(t,ci);h+=`<th onclick="sortTar(${ci})"><span>${esc(col)}</span><span class="tsi ${on?'on':''}">${ico}</span>${isN?'<span style="font-size:8px;opacity:.25;margin-left:2px">#</span>':''}<button class="col-del" onclick="event.stopPropagation();delTarCol(${t._idx},${ci})">✕</button></th>`;});
    h+='<th style="width:36px;background:var(--g200)"></th></tr></thead><tbody>';
    rows.forEach((row,ri)=>{const origRi=t.rows.indexOf(row);h+='<tr>';t.cols.forEach((col,ci)=>{const isN=isNumericCol(t,ci),raw=row[ci];const dv=isN&&raw!==''&&raw!=null?fN(raw):String(raw??'');h+=`<td><input type="text" class="${isN?'num':''}" value="${esc(dv)}" onchange="editTarCell(${t._idx},${origRi>=0?origRi:ri},${ci},this.value)"></td>`;});h+=`<td style="border:none;position:relative"><button class="btn btn-d btn-sm" style="position:absolute;left:4px;top:50%;transform:translateY(-50%);padding:3px 6px;font-size:10px" onclick="delTarRow(${t._idx},${origRi>=0?origRi:ri})">✕</button></td></tr>`;});
    h+='</tbody></table></div>';
    h+=`<div class="tar-actions"><button class="btn btn-p btn-sm" onclick="openPriceListImportPicker()">🤖 Importar listas</button><button class="btn btn-s btn-sm" onclick="addTarRow(${t._idx})">＋ Fila</button><button class="btn btn-s btn-sm" onclick="addTarCol(${t._idx})">＋ Columna</button><button class="btn btn-s btn-sm" onclick="renameTarTable(${t._idx})">✏️ Renombrar</button><button class="btn btn-a btn-sm" onclick="changeTarPeriod(${t._idx})" title="Cambiar mes de aplicación de esta lista">📅 Cambiar período</button><button class="btn btn-d btn-sm" onclick="delTarTable(${t._idx})">🗑️ Eliminar tabla seleccionada</button><button class="btn btn-s btn-sm" onclick="_tarSort={ci:null,dir:1};renderTarifario()">↺ Sin orden</button><span style="margin-left:auto;font-size:11px;color:var(--g500)">${rows.length} ítems · ${esc(t.sourceFileName||'origen manual')}</span></div></div>`;
  }
  box.innerHTML=h;
}
function switchTarTab(i){_tarTab=i;renderTarifario();}
function sortTar(ci){if(_tarSort.ci===ci)_tarSort.dir*=-1;else{_tarSort.ci=ci;_tarSort.dir=1;}renderTarifario();}

// ═══════════════════════════════════════════════════════════════════════
//  MASTER DE ÍNDICES — Motor completo (v3, 100% manual + archivos)
// ═══════════════════════════════════════════════════════════════════════

// ── Definición estática de índices del sistema ─────────────────────────
