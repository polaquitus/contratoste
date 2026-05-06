function renderDashExecutive(){
  const host=document.getElementById('execSection');
  const queueHost=document.getElementById('execQueueSection');
  if(!host) return;
  try{
    const today=new Date(); today.setHours(0,0,0,0);
    const todayYm=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
    const todayYmd=today.toISOString().substring(0,10);
    const TC=(typeof getTCFromStore==='function'?getTCFromStore():null) || (Number(document.getElementById('tcInput')?.value)||1050);
    const fmtUsd=v=>'USD '+Math.round(v||0).toLocaleString('en-US');
    const toUsd=(v,mon)=>String(mon||'').toUpperCase().indexOf('USD')>=0?v:(TC>0?(v/TC):0);

    const active=(window.DB||[]).filter(c=>c.fechaFin && new Date(c.fechaFin+'T00:00:00')>=today);

    const redContracts=[]; const aicPending=[]; const ccPending=[]; const redetReady=[];
    let totalUsd=0;

    active.forEach(c=>{
      const aves=c.aves||[];
      const avePoly=aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
      const aveOwner=aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
      const montoBase=c.montoBase||((c.monto||0)-avePoly-aveOwner);
      const tot=montoBase+avePoly+aveOwner;
      totalUsd+=toUsd(tot, c.mon);

      // Burn rate rojo
      try{
        const consumed=(typeof getConsumed==='function')?getConsumed(c.num):null;
        if(consumed!=null && c.fechaIni && c.fechaFin){
          const totalMonths=monthDiffInclusive(c.fechaIni,c.fechaFin)||0;
          let elapsed=monthDiffInclusive(c.fechaIni,todayYmd);
          elapsed=Math.max(0,Math.min(elapsed,totalMonths));
          if(elapsed>=1){
            const remMonths=Math.max(totalMonths-elapsed,0);
            const remAmount=Math.max(tot-consumed,0);
            const runRate=consumed/elapsed;
            if(isFinite(runRate)&&runRate>0){
              const monthsToExhaust=remAmount/runRate;
              const margin=monthsToExhaust-remMonths;
              if(remAmount<=0||margin<0){
                redContracts.push({c, margin, exhaustIn:monthsToExhaust});
              }
            }
          }
        }
      }catch(_e){}

      // Validaciones AIC/CC pendientes (sumando AVEs no validados)
      const polyPendUsd=aves.filter(a=>a.tipo==='POLINOMICA'&&!a.aicValidated).reduce((s,a)=>s+toUsd(a.monto||0, c.mon),0);
      const ownerPendUsd=aves.filter(a=>a.tipo==='OWNER'&&!a.ccValidated).reduce((s,a)=>s+toUsd(a.monto||0, c.mon),0);
      if(polyPendUsd>250000) aicPending.push({c, montoUsd:polyPendUsd});
      if(ownerPendUsd>250000) ccPending.push({c, montoUsd:ownerPendUsd});

      // Redeterminaciones listas para aplicar este mes
      try{
        if(Array.isArray(c.poly) && c.poly.length && typeof PolUpdate!=='undefined' && typeof computePoliDeltaPct==='function'){
          const cond=PolUpdate.getConditions(c.id);
          if(cond && cond.enabled && cond.allComponentsThreshold>0){
            const baseYm=c.btar||(c.fechaIni||'').substring(0,7);
            if(baseYm && baseYm<todayYm){
              const pct=computePoliDeltaPct(c, baseYm, todayYm);
              if(pct!=null && pct>=cond.allComponentsThreshold){
                // Verificar que no haya enmienda este mismo mes
                const enmsThisMonth=(c.enmiendas||[]).filter(e=>e.tipo==='ACTUALIZACION_TARIFAS' && !e.superseded && (e.nuevoPeriodo||'')>=todayYm);
                if(!enmsThisMonth.length){
                  redetReady.push({c, pct, baseYm});
                }
              }
            }
          }
        }
      }catch(_e){}
    });

    redContracts.sort((a,b)=>a.margin-b.margin);
    aicPending.sort((a,b)=>b.montoUsd-a.montoUsd);
    ccPending.sort((a,b)=>b.montoUsd-a.montoUsd);
    redetReady.sort((a,b)=>b.pct-a.pct);

    const card=(emoji,label,value,sub,color,bg,onclickJs)=>'<div onclick="'+(onclickJs||'')+'" style="cursor:'+(onclickJs?'pointer':'default')+';background:#fff;border:1px solid var(--g200);border-left:4px solid '+color+';border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:4px">'
      +'<div style="display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:var(--g600c);text-transform:uppercase;letter-spacing:.04em"><span style="font-size:16px">'+emoji+'</span>'+label+'</div>'
      +'<div style="font-size:24px;font-weight:800;color:'+color+';font-family:JetBrains Mono,monospace;line-height:1">'+value+'</div>'
      +'<div style="font-size:11px;color:var(--g500)">'+(sub||'')+'</div>'
      +'</div>';

    const kpis='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">'
      +card('🔴','Burn rate rojo', redContracts.length, redContracts.length?'agotan antes del fin':'todos en verde/amarillo','#dc2626','',redContracts.length?'document.getElementById(\'execList\').scrollIntoView({behavior:\'smooth\'})':'')
      +card('💰','Exposición total', fmtUsd(totalUsd), active.length+' contratos activos · TC '+Math.round(TC),'#0ea5e9','')
      +card('🟠','AIC pendiente', aicPending.length, aicPending.length?'>USD 250k polinómico s/validar':'sin pendientes','#d97706','',aicPending.length?'document.getElementById(\'execList\').scrollIntoView({behavior:\'smooth\'})':'')
      +card('🟣','CC pendiente', ccPending.length, ccPending.length?'>USD 250k owner s/validar':'sin pendientes','#9333ea','',ccPending.length?'document.getElementById(\'execList\').scrollIntoView({behavior:\'smooth\'})':'')
      +card('🔄','Redeterminar', redetReady.length, redetReady.length?'condiciones cumplidas':'sin pendientes','#16a34a','',redetReady.length?'document.getElementById(\'execList\').scrollIntoView({behavior:\'smooth\'})':'')
      +'</div>';

    // Action queue: una sola lista con todos los items que requieren acción
    const items=[];
    redContracts.forEach(r=>items.push({
      tipo:'🔴 Burn red', color:'#dc2626', c:r.c,
      detalle:'Agota en ~'+r.exhaustIn.toFixed(1)+'m · '+Math.abs(r.margin).toFixed(1)+'m antes del fin',
      action:'Ver detalle'
    }));
    redetReady.forEach(r=>items.push({
      tipo:'🔄 Redeterminar', color:'#16a34a', c:r.c,
      detalle:'+'+r.pct.toFixed(2)+'% acumulado desde '+r.baseYm,
      action:'Ir a redeterminar'
    }));
    aicPending.forEach(r=>items.push({
      tipo:'🟠 AIC', color:'#d97706', c:r.c,
      detalle:fmtUsd(r.montoUsd)+' polinómico sin validar',
      action:'Validar AIC'
    }));
    ccPending.forEach(r=>items.push({
      tipo:'🟣 CC', color:'#9333ea', c:r.c,
      detalle:fmtUsd(r.montoUsd)+' owner sin validar',
      action:'Validar CC'
    }));

    let queueHtml='';
    if(items.length){
      queueHtml='<div id="execList" style="background:#fff;border:1px solid var(--g200);border-radius:8px;overflow:hidden">'
        +'<div style="padding:10px 14px;border-bottom:1px solid var(--g200);font-size:12px;font-weight:700;color:var(--g700);background:var(--g50)">📋 Cola de acciones — '+items.length+' item(s) requieren atención</div>'
        +'<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#fafafa;color:var(--g600c);text-align:left">'
          +'<th style="padding:8px 12px;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.04em">Tipo</th>'
          +'<th style="padding:8px 12px;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.04em">Contrato</th>'
          +'<th style="padding:8px 12px;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.04em">Detalle</th>'
          +'<th style="padding:8px 12px;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.04em;text-align:right">Acción</th>'
        +'</tr></thead><tbody>';
      items.forEach(it=>{
        const c=it.c;
        queueHtml+='<tr style="border-top:1px solid var(--g100)">'
          +'<td style="padding:8px 12px;color:'+it.color+';font-weight:600;white-space:nowrap">'+it.tipo+'</td>'
          +'<td style="padding:8px 12px"><span class="mono" style="font-weight:600">'+esc(c.num||'')+'</span> <span style="color:var(--g500)">— '+esc((c.cont||'').substring(0,40))+'</span></td>'
          +'<td style="padding:8px 12px;color:var(--g600c)">'+esc(it.detalle)+'</td>'
          +'<td style="padding:8px 12px;text-align:right"><button class="btn btn-p btn-sm" style="font-size:11px" onclick="window.detId=\''+c.id+'\';go(\'detail\')">'+it.action+' →</button></td>'
        +'</tr>';
      });
      queueHtml+='</tbody></table></div>';
    } else {
      queueHtml='<div id="execList" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;text-align:center;color:#15803d;font-size:13px;font-weight:600">✅ Sin acciones ejecutivas pendientes</div>';
    }

    host.innerHTML=kpis;
    if(queueHost) queueHost.innerHTML=queueHtml;
  }catch(e){
    console.warn('renderDashExecutive',e);
    host.innerHTML='<div style="padding:12px;color:var(--g500);font-size:12px;font-style:italic">No se pudo calcular acciones ejecutivas: '+esc(e.message)+'</div>';
    if(queueHost) queueHost.innerHTML='';
  }
}

function renderDashboard() {
  renderDashExecutive();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  // Obtener TC: primero del input manual, luego de índices, fallback 1050
  let tcUSD = 1050;
  
  const tcInput = document.getElementById('tcInput');
  const currentInputValue = tcInput ? Number(tcInput.value) : 0;
  
  // Si el input está en valor default (1050) o vacío, intentar obtener de BD
  if (!currentInputValue || currentInputValue === 1050) {
    const tcFromStore = getTCFromStore();
    
    if (tcFromStore) {
      tcUSD = tcFromStore;
      if (tcInput) tcInput.value = tcUSD;
      console.log('[Dashboard] TC obtenido de IDX_STORE y aplicado:', tcUSD);
    } else {
      console.warn('[Dashboard] No se encontró TC en IDX_STORE, usando fallback:', tcUSD);
    }
  } else {
    // Usuario modificó el input manualmente
    tcUSD = currentInputValue;
    console.log('[Dashboard] TC manual del usuario:', tcUSD);
  }
  
  console.log('[Dashboard] TC USD utilizado:', tcUSD);
  
  // 1. KPIs
  const activos = window.DB.filter(function(c) {
    if (!c.fechaFin) return false;
    return new Date(c.fechaFin + 'T00:00:00') >= hoy;
  });
  
  let montoTotalARS = 0;
  let montoTotalUSD = 0;
  
  activos.forEach(function(c) {
    const total = getTotal(c);
    if (c.mon === 'USD') {
      montoTotalUSD += total;
    } else {
      montoTotalARS += total;
    }
  });
  
  const proxVencer = window.DB.filter(function(c) {
    if (!c.fechaFin) return false;
    const fin = new Date(c.fechaFin + 'T00:00:00');
    const dias = Math.floor((fin - hoy) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 30;
  }).length;
  
  const alertasCriticas = calcularAlertas().criticas.length;
  
  const fM=n=>Math.round(n).toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:0});

  const activosUSD = activos.filter(c=>c.mon==='USD').length;
  const activosARS = activos.filter(c=>c.mon!=='USD').length;
  document.getElementById('kpiActivos').textContent = activos.length;
  document.getElementById('kpiActivosLbl').textContent = 'Contratos Activos · '+activosUSD+' USD · '+activosARS+' ARS';

  const grandTotal = montoTotalARS + (montoTotalUSD * tcUSD);

  document.getElementById('kpiMonto').innerHTML =
    '<div style="font-size:16px;font-weight:700;margin-bottom:6px;">ARS $' + fM(grandTotal) + '</div>' +
    '<div style="font-size:13px;color:var(--g600c);display:flex;flex-direction:column;gap:2px;">' +
    '<span>ARS $' + fM(montoTotalARS) + '</span>' +
    '<span>USD $' + fM(montoTotalUSD) + ' (× ' + Math.round(tcUSD).toLocaleString('es-AR') + ')</span>' +
    '</div>';

  document.getElementById('kpiProxVencer').textContent = proxVencer;
  document.getElementById('kpiAlertas').textContent = alertasCriticas;

  // 2. Gráfico Distribución por Dominio
  const porDominio = {};
  window.DB.forEach(function(c) {
    const dom = c.gob || 'Sin dominio';
    if (!porDominio[dom]) {
      porDominio[dom] = { count: 0, ars: 0, usd: 0 };
    }
    porDominio[dom].count++;
    
    const total = getTotal(c);
    if (c.mon === 'USD') {
      porDominio[dom].usd += total;
    } else {
      porDominio[dom].ars += total;
    }
  });
  
  const dominioLabels = Object.keys(porDominio);
  const dominioData = dominioLabels.map(function(d) { return porDominio[d].count; });
  const dominioColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];
  
  if (chartDominio) chartDominio.destroy();
  
  const ctxDominio = document.getElementById('chartDominio');
  chartDominio = new Chart(ctxDominio, {
    type: 'doughnut',
    data: {
      labels: dominioLabels,
      datasets: [{
        data: dominioData,
        backgroundColor: dominioColors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 10 },
            padding: 8,
            generateLabels: function(chart) {
              const data = chart.data;
              return data.labels.map(function(label, i) {
                const dom = porDominio[label];
                return {
                  text: label + ' (' + dom.count + ')',
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const dom = porDominio[context.label];
              return [
                context.label + ': ' + dom.count + ' contratos',
                'ARS: $' + fN(dom.ars),
                'USD: $' + fN(dom.usd)
              ];
            }
          }
        }
      }
    }
  });
  
  // 3. Top 10 Proveedores por Monto (USD convertido a ARS)
  const porProveedor = {};
  window.DB.forEach(function(c) {
    const prov = c.cont || 'Sin proveedor';
    const total = getTotal(c);
    
    // Convertir USD a ARS para comparación
    const montoARS = c.mon === 'USD' ? total * tcUSD : total;
    
    porProveedor[prov] = (porProveedor[prov] || 0) + montoARS;
  });
  
  const top10 = Object.entries(porProveedor)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 10);
  
  const provLabels = top10.map(function(p) { return p[0]; });
  const provData = top10.map(function(p) { return p[1]; });
  
  if (chartProveedores) chartProveedores.destroy();
  
  const ctxProv = document.getElementById('chartProveedores');
  chartProveedores = new Chart(ctxProv, {
    type: 'bar',
    data: {
      labels: provLabels,
      datasets: [{
        label: 'Monto Total (ARS)',
        data: provData,
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'ARS $' + Math.round(context.parsed.x).toLocaleString('es-AR');
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            callback: function(value) {
              if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
              if (value >= 1e6) return '$' + Math.round(value / 1e6) + 'M';
              return '$' + Math.round(value / 1e3) + 'K';
            }
          }
        }
      }
    }
  });
  
  // 4. Próximos Vencimientos (90 días)
  const proximos = window.DB.filter(function(c) {
    if (!c.fechaFin) return false;
    const fin = new Date(c.fechaFin + 'T00:00:00');
    const dias = Math.floor((fin - hoy) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 90;
  })
  .sort(function(a, b) {
    return new Date(a.fechaFin) - new Date(b.fechaFin);
  })
  .slice(0, 10);

  const proximosHtml = proximos.length > 0
    ? proximos.map(function(c) {
        const fin = new Date(c.fechaFin + 'T00:00:00');
        const dias = Math.floor((fin - hoy) / (1000 * 60 * 60 * 24));
        const color = dias === 0 ? '#dc2626' : dias <= 30 ? '#ef4444' : (dias <= 60 ? '#f59e0b' : '#10b981');
        
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--g100);">' +
          '<div style="flex:1;">' +
          '<div style="font-weight:600;font-size:13px;color:var(--g900);">' + c.num + ' - ' + (c.cont || 'Sin proveedor') + '</div>' +
          '<div style="font-size:11px;color:var(--g600c);">' + (c.det || 'Sin objeto') + '</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
          '<div style="font-weight:700;font-size:14px;color:' + color + ';">' + (dias === 0 ? '🔴 Vence HOY' : dias + ' días') + '</div>' +
          '<div style="font-size:11px;color:var(--g500);">' + c.fechaFin + '</div>' +
          '</div>' +
          '<button class="btn btn-sm btn-p" style="margin-left:12px;" onclick="viewAlertContract(\'' + c.id + '\')">Ver</button>' +
          '</div>';
      }).join('')
    : '<div style="padding:40px;text-align:center;color:var(--g500);">✅ Sin vencimientos próximos</div>';
  
  document.getElementById('proximosVencimientos').innerHTML = proximosHtml;

  renderDashMap(tcUSD);

  console.log('[Dashboard] Rendered - TC:', tcUSD, 'ARS:', fN(montoTotalARS), 'USD:', fN(montoTotalUSD));
}

// ── Proyección Predictiva de Costos ──────────────────────────────────────────

let _forecastChart = null;
let _fcRates = {};          // { idxId: monthlyRate }
let _fcActivos = [];        // cached active contracts for breakdown re-render
let _fcTotalBase = 0;
let _fcIndexScenarios = [];
let _fcPoliPoints = [];

const FC_COLORS = ['#ef4444','#f59e0b','#10b981','#8b5cf6','#06b6d4','#ec4899','#f97316','#84cc16'];

function fcAvgMonthlyRate(idxId, lookbackMonths) {
  const rows = (IDX_STORE[idxId]?.rows || [])
    .filter(r => r.ym).sort((a, b) => a.ym.localeCompare(b.ym));
  if (rows.length < 2) return null;
  const latest = rows[rows.length - 1];
  const [ly, lm] = latest.ym.split('-').map(Number);
  const cutDate = new Date(ly, lm - 1 - lookbackMonths, 1);
  const cutYm = cutDate.getFullYear() + '-' + String(cutDate.getMonth() + 1).padStart(2, '0');
  const hasValues = rows.some(r => r.value != null && r.value !== 0);
  if (hasValues) {
    const base = rows.filter(r => r.ym <= cutYm && r.value != null && r.value !== 0).pop();
    if (!base || !latest.value) return null;
    const n = rows.filter(r => r.ym > base.ym && r.ym <= latest.ym).length || lookbackMonths;
    return Math.pow(latest.value / base.value, 1 / n) - 1;
  } else {
    const segment = rows.filter(r => r.ym > cutYm && r.ym <= latest.ym && r.pct != null);
    if (!segment.length) return null;
    let compound = 1;
    segment.forEach(r => compound *= (1 + r.pct / 100));
    return Math.pow(compound, 1 / segment.length) - 1;
  }
}

function fcProjectContract(contract, rates, months, fallbackRate) {
  const base = contract.mon === 'USD'
    ? getTotal(contract) * (parseFloat(document.getElementById('fcTC')?.value) || 1050)
    : getTotal(contract);
  const poly = (contract.poly || []).filter(p => p.idx && rates[p.idx] != null);
  if (poly.length > 0) {
    const sumW = poly.reduce((s, p) => s + (parseFloat(p.inc) || 0), 0);
    const polyKo = poly.reduce((s, p) => s + (parseFloat(p.inc) || 0) * Math.pow(1 + rates[p.idx], months), 0);
    const residualKo = Math.max(0, 1 - sumW) * Math.pow(1 + fallbackRate, months);
    return base * (polyKo + residualKo);
  }
  return base * Math.pow(1 + fallbackRate, months);
}

function renderForecast() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const lookback = parseInt(document.getElementById('fcLookback')?.value || '12');
  const horizon  = parseInt(document.getElementById('fcHorizon')?.value || '12');
  const tc = parseFloat(document.getElementById('fcTC')?.value || '1050') || 1050;
  const msgEl = document.getElementById('fcChartMsg');
  const canvas = document.getElementById('forecastChart');

  // Sync TC to dashboard input if present
  const dashTC = document.getElementById('tcInput');
  if (dashTC && Math.abs(Number(dashTC.value) - tc) > 1) document.getElementById('fcTC').value = dashTC.value;

  _fcActivos = window.DB.filter(c => {
    if (!c.fechaFin) return false;
    return new Date(c.fechaFin + 'T00:00:00') >= hoy;
  });

  if (!_fcActivos.length) {
    if (canvas) canvas.style.display = 'none';
    if (msgEl) { msgEl.textContent = 'No hay contratos activos para proyectar.'; msgEl.style.display = ''; }
    return;
  }

  _fcTotalBase = 0;
  _fcActivos.forEach(c => {
    const t = getTotal(c);
    _fcTotalBase += c.mon === 'USD' ? t * tc : t;
  });

  // Compute index rates
  _fcRates = {};
  IDX_CATALOG.forEach(d => {
    const r = fcAvgMonthlyRate(d.id, lookback);
    if (r !== null && isFinite(r)) _fcRates[d.id] = r;
  });

  const fallbackRate = _fcRates['ipc_nac'] ?? _fcRates['ipim_gral'] ?? 0.05;

  // Render rates badge bar
  const bar = document.getElementById('fcRatesBar');
  if (bar) {
    bar.innerHTML = '<span style="color:var(--g500);font-weight:600;font-size:12px">Tasas calculadas:</span> ' +
      IDX_CATALOG.filter(d => _fcRates[d.id] != null).map(d => {
        const r = _fcRates[d.id];
        const annualPct = (Math.pow(1 + r, 12) - 1) * 100;
        const col = annualPct > 50 ? '#ef4444' : annualPct > 20 ? '#f59e0b' : '#10b981';
        return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--g50);border:1px solid var(--g200);border-radius:99px;font-size:11px">
          <strong style="color:var(--g800)">${d.name}</strong>
          <span style="color:${col};font-weight:700">${(r*100).toFixed(2)}%/mes</span>
          <span style="color:var(--g400)">(${annualPct >= 0 ? '+' : ''}${annualPct.toFixed(0)}%/año)</span>
        </span>`;
      }).join('') +
      (Object.keys(_fcRates).length === 0 ? '<span style="color:var(--g400);font-style:italic">Sin datos de índices cargados</span>' : '');
  }

  // Build monthly time labels
  const now = new Date();
  const labels = Array.from({length: horizon + 1}, (_, m) => {
    if (m === 0) return 'Hoy';
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    return String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  });

  // Build scenario datasets
  const baseline = Array(horizon + 1).fill(_fcTotalBase);

  // Per-index scenarios (apply that index uniformly to all active contracts)
  _fcIndexScenarios = IDX_CATALOG.filter(d => _fcRates[d.id] != null).map(d => ({
    id: d.id, name: d.name, rate: _fcRates[d.id],
    points: Array.from({length: horizon + 1}, (_, m) => _fcTotalBase * Math.pow(1 + _fcRates[d.id], m))
  }));

  // Polynomial-weighted scenario (actual formula per contract)
  _fcPoliPoints = Array.from({length: horizon + 1}, (_, m) => {
    if (m === 0) return _fcTotalBase;
    return _fcActivos.reduce((sum, c) => sum + fcProjectContract(c, _fcRates, m, fallbackRate), 0);
  });

  // KPI band: min and max at horizon
  const allAtHorizon = [baseline[horizon], _fcPoliPoints[horizon], ..._fcIndexScenarios.map(s => s.points[horizon])];
  const minH = Math.min(...allAtHorizon);
  const maxH = Math.max(...allAtHorizon);
  const kpiEl = document.getElementById('fcKpiBand');
  const fB = v => (v / 1e9).toFixed(1) + 'B';
  if (kpiEl) kpiEl.innerHTML = `
    <div style="text-align:right">
      <div style="font-size:11px;color:var(--g500)">Rango a +${horizon}m (ARS)</div>
      <div style="font-size:13px;font-weight:700;color:#ef4444">${fB(minH)} – ${fB(maxH)}</div>
    </div>`;

  // Chart datasets
  const sceneColors = FC_COLORS.slice(0, _fcIndexScenarios.length);
  const toBil = arr => arr.map(v => v / 1e9);

  const datasets = [
    {
      label: 'Sin ajuste (base)',
      data: toBil(baseline),
      borderColor: '#9ca3af',
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 2,
      fill: false,
      tension: 0,
      order: 10
    },
    {
      label: 'Fórmula Polinómica Real',
      data: toBil(_fcPoliPoints),
      borderColor: '#0071d9',
      backgroundColor: 'rgba(0,113,217,.07)',
      fill: true,
      borderWidth: 3,
      pointRadius: 3,
      pointBackgroundColor: '#0071d9',
      tension: 0.25,
      order: 1
    },
    ..._fcIndexScenarios.slice(0, 8).map((s, i) => ({
      label: s.name,
      data: toBil(s.points),
      borderColor: sceneColors[i],
      borderDash: [4, 3],
      borderWidth: 2,
      pointRadius: 2,
      fill: false,
      tension: 0.25,
      order: 2 + i
    }))
  ];

  if (_forecastChart) { _forecastChart.destroy(); _forecastChart = null; }
  if (msgEl) msgEl.style.display = 'none';
  if (canvas) {
    canvas.style.display = '';
    _forecastChart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 14, padding: 10 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y;
                const base = _fcTotalBase / 1e9;
                const pct = ((v - base) / base * 100);
                const sign = pct >= 0 ? '+' : '';
                return `${ctx.dataset.label}: $${v.toFixed(2)}B ARS (${sign}${pct.toFixed(1)}%)`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 45 }, grid: { color: 'rgba(0,0,0,.05)' } },
          y: {
            title: { display: true, text: 'Monto Total ARS (miles de millones)', font: { size: 11 } },
            ticks: { font: { size: 11 }, callback: v => '$' + v.toFixed(1) + 'B' },
            grid: { color: 'rgba(0,0,0,.05)' }
          }
        }
      }
    });
  }

  renderForecastTable(horizon);
  renderForecastBreakdown();
}

function renderForecastTable(horizon) {
  const tbl = document.getElementById('forecastTable');
  if (!tbl) return;
  const checkpoints = [3, 6, 12, 18].filter(m => m <= horizon);
  const fM = (v, base) => {
    const pct = (v - base) / base * 100;
    const col = pct > 30 ? '#dc2626' : pct > 10 ? '#d97706' : '#16a34a';
    return `<div style="font-weight:600">$${Math.round(v / 1e6).toLocaleString('es-AR')}M</div>
      <div style="font-size:11px;color:${col}">${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%</div>`;
  };
  const scenarios = [
    { name: 'Sin ajuste', color: '#9ca3af', rate: null, points: Array(19).fill(_fcTotalBase) },
    { name: 'Fórmula Polinómica Real', color: '#0071d9', rate: null, points: _fcPoliPoints },
    ..._fcIndexScenarios.slice(0, 8).map((s, i) => ({ ...s, color: FC_COLORS[i] }))
  ];
  tbl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--g100)">
      <th style="text-align:left;padding:8px 12px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Escenario</th>
      <th style="text-align:right;padding:8px 12px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Tasa anual equiv.</th>
      ${checkpoints.map(m => `<th style="text-align:right;padding:8px 12px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">+${m}m</th>`).join('')}
    </tr></thead><tbody>
    ${scenarios.map((s, i) => {
      const annual = s.rate != null ? ((Math.pow(1 + s.rate, 12) - 1) * 100) : null;
      return `<tr style="${i % 2 ? 'background:var(--g50)' : ''}">
        <td style="padding:8px 12px;border-bottom:1px solid var(--g100)">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};margin-right:6px;vertical-align:middle"></span>
          <strong>${s.name}</strong>
        </td>
        <td style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--g100);color:var(--g600)">
          ${annual != null ? `<span style="font-weight:700;color:${annual > 50 ? '#dc2626' : annual > 20 ? '#d97706' : '#16a34a'}">${annual >= 0 ? '+' : ''}${annual.toFixed(0)}%</span>` : '—'}
        </td>
        ${checkpoints.map(m => `<td style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--g100)">${s.points[m] != null ? fM(s.points[m], _fcTotalBase) : '—'}</td>`).join('')}
      </tr>`;
    }).join('')}</tbody></table>`;
}

function renderForecastBreakdown() {
  const div = document.getElementById('forecastBreakdown');
  if (!div || !_fcActivos.length) return;
  const tc = parseFloat(document.getElementById('fcTC')?.value || '1050') || 1050;
  const targetM = parseInt(document.getElementById('fcBreakdownHorizon')?.value || '6');
  const fallbackRate = _fcRates['ipc_nac'] ?? _fcRates['ipim_gral'] ?? 0.05;

  const items = _fcActivos.map(c => {
    const base = c.mon === 'USD' ? getTotal(c) * tc : getTotal(c);
    const projected = fcProjectContract(c, _fcRates, targetM, fallbackRate);
    const delta = projected - base;
    const deltaPct = base > 0 ? (delta / base * 100) : 0;
    const poly = (c.poly || []).filter(p => p.idx);
    return { c, base, projected, delta, deltaPct, hasPoly: poly.length > 0 };
  }).sort((a, b) => b.delta - a.delta);

  const fM = v => Math.round(v).toLocaleString('es-AR');
  div.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--g100)">
      <th style="text-align:left;padding:7px 12px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Contrato</th>
      <th style="text-align:left;padding:7px 12px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Proveedor</th>
      <th style="text-align:center;padding:7px 8px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Fórmula</th>
      <th style="text-align:right;padding:7px 12px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Base ARS</th>
      <th style="text-align:right;padding:7px 12px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Proyectado +${targetM}m</th>
      <th style="text-align:right;padding:7px 12px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Incremento</th>
    </tr></thead><tbody>
    ${items.slice(0, 25).map((item, i) => {
      const col = item.deltaPct > 30 ? '#dc2626' : item.deltaPct > 15 ? '#d97706' : '#16a34a';
      return `<tr style="${i % 2 ? 'background:var(--g50)' : ''}" onclick="viewAlertContract('${item.c.id}')" style="cursor:pointer">
        <td style="padding:6px 12px;border-bottom:1px solid var(--g100);font-weight:600;cursor:pointer" onclick="viewAlertContract('${item.c.id}')">${item.c.num || '—'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid var(--g100);cursor:pointer" onclick="viewAlertContract('${item.c.id}')">${item.c.cont || '—'}</td>
        <td style="text-align:center;padding:6px 8px;border-bottom:1px solid var(--g100)">
          <span style="font-size:10px;padding:2px 6px;border-radius:99px;background:${item.hasPoly ? 'var(--a100)' : 'var(--g100)'};color:${item.hasPoly ? '#92400e' : 'var(--g500)'}">
            ${item.hasPoly ? 'POLI' : 'IPC'}
          </span>
        </td>
        <td style="text-align:right;padding:6px 12px;border-bottom:1px solid var(--g100)">$${fM(item.base)}</td>
        <td style="text-align:right;padding:6px 12px;border-bottom:1px solid var(--g100);font-weight:600">$${fM(item.projected)}</td>
        <td style="text-align:right;padding:6px 12px;border-bottom:1px solid var(--g100);font-weight:700;color:${col}">
          +$${fM(item.delta)}<br><span style="font-size:11px">(+${item.deltaPct.toFixed(1)}%)</span>
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

// ── Mapa Geoespacial Dashboard ────────────────────────────────────────────────

let _dashMap = null;
let _dashMapMarkers = [];

const GEO_ASSETS = [
  { id: 'NQN',         name: 'Neuquén',          lat: -38.95, lng: -68.06, color: '#0071d9' },
  { id: 'TDF',         name: 'Tierra del Fuego',  lat: -54.80, lng: -68.30, color: '#10b981' },
  { id: 'NQN + TDF',   name: 'NQN + TDF',         lat: -46.00, lng: -68.00, color: '#8b5cf6' }
];

function renderDashMap(tcUSD) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const tc = tcUSD || 1050;

  // Aggregate by asset
  const byAsset = {};
  GEO_ASSETS.forEach(a => { byAsset[a.id] = { count: 0, ars: 0, usd: 0, activos: 0, porVencer: 0, alertas: 0 }; });

  window.DB.forEach(function(c) {
    const key = (c.asset || '').trim();
    if (!byAsset[key]) return;
    const total = getTotal(c);
    byAsset[key].count++;
    if (c.mon === 'USD') byAsset[key].usd += total;
    else byAsset[key].ars += total;
    const fin = c.fechaFin ? new Date(c.fechaFin + 'T00:00:00') : null;
    if (fin && fin >= hoy) {
      byAsset[key].activos++;
      const dias = Math.floor((fin - hoy) / 86400000);
      if (dias <= 30) byAsset[key].alertas++;
      else if (dias <= 90) byAsset[key].porVencer++;
    }
  });

  // Init map once
  if (!_dashMap) {
    _dashMap = L.map('dashMap', { zoomControl: true, scrollWheelZoom: false }).setView([-38, -65], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(_dashMap);
  } else {
    _dashMapMarkers.forEach(m => m.remove());
    _dashMapMarkers = [];
  }

  const allTotals = GEO_ASSETS.map(a => byAsset[a.id].ars + byAsset[a.id].usd * tc);
  const maxTotal = Math.max(...allTotals, 1);

  GEO_ASSETS.forEach(function(a) {
    const d = byAsset[a.id];
    const total = d.ars + d.usd * tc;
    if (d.count === 0) return;

    const baseR = 22;
    const radius = baseR + (total / maxTotal) * 38;
    const pulse = d.alertas > 0;

    const iconHtml = `<div style="
        width:${radius*2}px;height:${radius*2}px;
        border-radius:50%;
        background:${a.color};
        border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,.3)${pulse?',0 0 0 4px rgba(239,68,68,.5)':''};
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        cursor:pointer;color:#fff;font-weight:700;text-align:center;line-height:1.2;
        ${pulse?'animation:dashPulse 1.5s ease-in-out infinite;':''}
      ">
        <span style="font-size:${radius < 35 ? 10 : 12}px">${a.id}</span>
        <span style="font-size:${radius < 35 ? 9 : 11}px">${d.activos}</span>
      </div>`;

    const icon = L.divIcon({ html: iconHtml, className: '', iconAnchor: [radius, radius] });
    const marker = L.marker([a.lat, a.lng], { icon }).addTo(_dashMap);

    const fM = n => Math.round(n).toLocaleString('es-AR');
    marker.bindPopup(`
      <div style="font-family:system-ui;min-width:180px">
        <div style="font-weight:700;font-size:14px;color:${a.color};margin-bottom:8px">${a.name}</div>
        <div style="font-size:12px;display:grid;grid-template-columns:auto 1fr;gap:3px 10px;color:#333">
          <span style="color:#666">Contratos</span><span style="font-weight:600">${d.count}</span>
          <span style="color:#666">Activos</span><span style="font-weight:600">${d.activos}</span>
          <span style="color:#666">Total ARS</span><span style="font-weight:600">$${fM(d.ars)}</span>
          <span style="color:#666">Total USD</span><span style="font-weight:600">US$${fM(d.usd)}</span>
          ${d.alertas > 0 ? `<span style="color:#ef4444">⚠ Alertas</span><span style="font-weight:600;color:#ef4444">${d.alertas}</span>` : ''}
          ${d.porVencer > 0 ? `<span style="color:#f59e0b">⏰ Próx. vencer</span><span style="font-weight:600;color:#f59e0b">${d.porVencer}</span>` : ''}
        </div>
        <button onclick="dashMapFilter('${a.id}')" style="margin-top:10px;width:100%;padding:5px;background:${a.color};color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600">Ver contratos →</button>
      </div>
    `, { maxWidth: 240 });

    _dashMapMarkers.push(marker);
  });

  // Legend — horizontal cards below map
  const leg = document.getElementById('dashMapLegend');
  if (leg) {
    const fM = n => Math.round(n).toLocaleString('es-AR');
    leg.innerHTML = GEO_ASSETS.map(function(a) {
      const d = byAsset[a.id];
      const total = d.ars + d.usd * tc;
      return `<div style="flex:1;min-width:160px;background:var(--g50);border:1px solid var(--g200);border-top:3px solid ${a.color};border-radius:var(--rad);padding:12px 14px;cursor:pointer" onclick="dashMapFilter('${a.id}')">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <div style="width:10px;height:10px;border-radius:50%;background:${a.color};flex-shrink:0"></div>
          <span style="font-weight:700;font-size:13px;color:var(--g900)">${a.name}</span>
        </div>
        <div style="font-size:12px;color:var(--g700)">${d.activos} activos · ${d.count} total</div>
        <div style="font-size:12px;color:var(--g700)">$${fM(total/1e6)}M ARS eq.</div>
        ${d.alertas > 0 ? `<div style="font-size:12px;color:#ef4444;font-weight:600;margin-top:3px">⚠ ${d.alertas} alertas críticas</div>` : ''}
        ${d.porVencer > 0 ? `<div style="font-size:12px;color:#f59e0b;margin-top:2px">⏰ ${d.porVencer} próx. a vencer</div>` : ''}
      </div>`;
    }).join('') +
    '<div style="align-self:center;font-size:11px;color:var(--g400);padding:0 4px">El tamaño del nodo refleja el volumen de inversión relativo. Clic para filtrar.</div>';
  }

  // Inject pulse animation once
  if (!document.getElementById('dashMapStyle')) {
    const s = document.createElement('style');
    s.id = 'dashMapStyle';
    s.textContent = '@keyframes dashPulse{0%,100%{box-shadow:0 2px 8px rgba(0,0,0,.3),0 0 0 4px rgba(239,68,68,.4)}50%{box-shadow:0 2px 8px rgba(0,0,0,.3),0 0 0 10px rgba(239,68,68,.0)}}';
    document.head.appendChild(s);
  }
}

function dashMapFilter(assetId) {
  // Navigate to list view and apply asset filter
  go('list');
  const sel = document.getElementById('fAsset');
  if (sel) { sel.value = assetId; renderList(); }
}

// ── Histórico de Índices — chart section ─────────────────────────────────────

let _idxChart = null;

function initIdxChartSection() {
  const sel = document.getElementById('idxChartNombre');
  if (!sel) return;
  sel.innerHTML = IDX_CATALOG.map(d =>
    `<option value="${d.id}">${d.name}</option>`
  ).join('');

  const now = new Date();
  const hasta = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const desdeDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const desde = desdeDate.getFullYear() + '-' + String(desdeDate.getMonth() + 1).padStart(2, '0');

  const desdeEl = document.getElementById('idxChartDesde');
  const hastaEl = document.getElementById('idxChartHasta');
  if (desdeEl && !desdeEl.value) desdeEl.value = desde;
  if (hastaEl && !hastaEl.value) hastaEl.value = hasta;

  loadIndicesChart();
}

function loadIndicesChart() {
  const idxId   = document.getElementById('idxChartNombre')?.value || 'ipc_nac';
  const desde   = document.getElementById('idxChartDesde')?.value || '';
  const hasta   = document.getElementById('idxChartHasta')?.value || '';
  const canvas  = document.getElementById('idxChart');
  const msgEl   = document.getElementById('idxChartMsg');
  const exportBtn = document.getElementById('btnIdxExportPng');
  if (!canvas) return;

  const def = IDX_CATALOG.find(d => d.id === idxId);
  const rows = idxRows(idxId)
    .filter(r => r.ym && (!desde || r.ym >= desde) && (!hasta || r.ym <= hasta))
    .sort((a, b) => a.ym.localeCompare(b.ym));

  if (_idxChart) { _idxChart.destroy(); _idxChart = null; }

  if (!rows.length) {
    canvas.style.display = 'none';
    if (exportBtn) exportBtn.style.display = 'none';
    msgEl.textContent = 'Sin datos para el período seleccionado.';
    msgEl.style.display = '';
    return;
  }

  msgEl.style.display = 'none';
  canvas.style.display = '';
  if (exportBtn) exportBtn.style.display = '';

  const hasValues = rows.some(r => r.value != null && r.value !== 0);
  // For value-based indices, estimate value from pct when row has no value
  const dataPoints = rows.map((r, i) => {
    if (!hasValues) return r.pct ?? null;
    if (r.value != null) return r.value;
    // pct-only row in a value-based index: estimate from previous value + stored pct
    if (r.pct != null) {
      const prev = rows.slice(0, i).reverse().find(p => p.value != null && p.value !== 0);
      if (prev) return prev.value * (1 + r.pct / 100);
    }
    return null;
  });
  const labels = rows.map(r => {
    const [y, m] = (r.ym || '').split('-');
    return String(m).padStart(2, '0') + '/' + y;
  });

  // Compute % variation per period for the secondary axis
  // Stored r.pct is always reliable (computed from API at fetch time).
  // Only fall back to value computation when pct is null.
  const varPct = rows.map((r, i) => {
    if (i === 0) return null;
    if (r.pct != null) return r.pct;
    // pct missing: estimate from consecutive values
    if (hasValues && r.value != null) {
      const prev = rows.slice(0, i).reverse().find(p => p.value != null && p.value !== 0);
      if (prev) return ((r.value / prev.value) - 1) * 100;
    }
    return null;
  });

  _idxChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: def?.name || idxId,
          data: dataPoints,
          borderColor: '#0071d9',
          backgroundColor: 'rgba(0,113,217,.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#0071d9',
          pointHoverRadius: 5,
          yAxisID: 'y',
          order: 1
        },
        {
          type: 'bar',
          label: 'Variación %',
          data: varPct,
          backgroundColor: varPct.map(v => v == null ? 'transparent' : v >= 0 ? 'rgba(34,197,94,.45)' : 'rgba(239,68,68,.45)'),
          borderColor: varPct.map(v => v == null ? 'transparent' : v >= 0 ? 'rgba(34,197,94,.8)' : 'rgba(239,68,68,.8)'),
          borderWidth: 1,
          yAxisID: 'y2',
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.parsed.y;
              if (val == null) return 'Sin dato';
              if (ctx.dataset.yAxisID === 'y2') return 'Var: ' + (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
              return hasValues
                ? Math.round(val).toLocaleString('es-AR')
                : val.toFixed(2) + '%';
            },
            title: ctx => ctx[0]?.label || ''
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 11 }, maxRotation: 45 },
          grid: { color: 'rgba(0,0,0,.06)' }
        },
        y: {
          title: { display: true, text: def?.name || idxId, font: { size: 11 } },
          ticks: {
            font: { size: 11 },
            callback: v => hasValues
              ? Math.round(v).toLocaleString('es-AR')
              : v.toFixed(1) + '%'
          },
          grid: { color: 'rgba(0,0,0,.06)' }
        },
        y2: {
          position: 'right',
          title: { display: true, text: '% Variación', font: { size: 11 } },
          ticks: { font: { size: 11 }, callback: v => v.toFixed(1) + '%' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });

  renderIdxComparisonTable();
}

function idxVarOverMonths(idxId, nMonths) {
  const rows = (IDX_STORE[idxId]?.rows || []).filter(r => r.ym).sort((a, b) => a.ym.localeCompare(b.ym));
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const [ly, lm] = latest.ym.split('-').map(Number);
  const targetDate = new Date(ly, lm - 1 - nMonths, 1);
  const targetYm = String(targetDate.getFullYear()) + '-' + String(targetDate.getMonth() + 1).padStart(2, '0');
  const baseRow = rows.filter(r => r.ym <= targetYm).pop();
  if (!baseRow) return null;
  const hasValues = rows.some(r => r.value != null && r.value !== 0);
  if (hasValues) {
    if (latest.value == null || baseRow.value == null || baseRow.value === 0) return null;
    return ((latest.value / baseRow.value) - 1) * 100;
  } else {
    // compound multiplication of pct for rows strictly after baseRow up to latest
    const segment = rows.filter(r => r.ym > baseRow.ym && r.ym <= latest.ym);
    if (!segment.length) return null;
    let compound = 1;
    for (const r of segment) {
      if (r.pct == null) return null;
      compound *= (1 + r.pct / 100);
    }
    return (compound - 1) * 100;
  }
}

function renderIdxComparisonTable() {
  const container = document.getElementById('idxCompTable');
  if (!container) return;
  const periods = [
    { label: '1 mes',   n: 1  },
    { label: '3 meses', n: 3  },
    { label: '6 meses', n: 6  },
    { label: '12 meses',n: 12 },
    { label: '18 meses',n: 18 }
  ];
  const activeIds = IDX_CATALOG.filter(d => (IDX_STORE[d.id]?.rows||[]).length > 0).map(d => d.id);
  if (!activeIds.length) { container.style.display = 'none'; return; }
  container.style.display = '';
  const fmtPct = v => v == null ? '<span style="color:var(--g400)">—</span>'
    : `<span style="color:${v >= 0 ? '#16a34a' : '#dc2626'};font-weight:600">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</span>`;
  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--g100)">
      <th style="text-align:left;padding:7px 10px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Índice</th>
      ${periods.map(p => `<th style="text-align:right;padding:7px 10px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">${p.label}</th>`).join('')}
    </tr></thead><tbody>`;
  activeIds.forEach((id, i) => {
    const def = IDX_CATALOG.find(d => d.id === id);
    const bg = i % 2 === 0 ? '' : 'background:var(--g50)';
    html += `<tr style="${bg}">
      <td style="padding:6px 10px;color:var(--g800);font-weight:600;white-space:nowrap;border-bottom:1px solid var(--g100)">${def?.name || id}</td>
      ${periods.map(p => `<td style="text-align:right;padding:6px 10px;border-bottom:1px solid var(--g100)">${fmtPct(idxVarOverMonths(id, p.n))}</td>`).join('')}
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function exportIdxChartPng() {
  if (!_idxChart) return;
  const sel = document.getElementById('idxChartNombre');
  const nom = sel?.options[sel.selectedIndex]?.text || 'indice';
  const a = document.createElement('a');
  a.href = _idxChart.toBase64Image();
  a.download = 'historico_' + nom.replace(/\s+/g, '_').toLowerCase() + '.png';
  a.click();
}

