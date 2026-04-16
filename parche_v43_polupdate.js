/* parche_v43_polupdate.js
   Parche runtime para index (1).html
   - Plazo en meses exactos
   - Sincronización gatillos -> condiciones PolUpdate
   - Evaluación automática desde última actualización / base inicial
   - Detección de primer mes que cumple
   - Modo manual / intermedio / negociado
*/
(function(){
  'use strict';

  const VERSION = 'v43';

  function ymOf(v){
    if(!v) return '';
    if(/^\d{4}-\d{2}$/.test(v)) return v;
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0,7);
    return '';
  }
  function monthStart(v){
    const ym = ymOf(v);
    return ym ? ym + '-01' : '';
  }
  function nextYm(ym){
    if(!ym) return '';
    const [y,m] = ym.split('-').map(Number);
    const d = new Date(y, m-1, 1);
    d.setMonth(d.getMonth()+1);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }
  function compareYm(a,b){ return String(a||'').localeCompare(String(b||'')); }
  function monthDiffInclusive(a,b){
    if(!a || !b) return 0;
    const d1 = new Date(monthStart(a)+'T00:00:00');
    const d2 = new Date(monthStart(b)+'T00:00:00');
    return Math.max((d2.getFullYear()-d1.getFullYear())*12 + (d2.getMonth()-d1.getMonth()) + 1, 0);
  }
  function monthsBetween(a,b){
    if(!a || !b) return 0;
    const d1 = new Date(monthStart(a)+'T00:00:00');
    const d2 = new Date(monthStart(b)+'T00:00:00');
    return Math.max((d2.getFullYear()-d1.getFullYear())*12 + (d2.getMonth()-d1.getMonth()), 0);
  }
  function formatYm(ym){
    if(!ym) return '—';
    try{
      const [y,m] = ym.split('-');
      return new Date(+y,+m-1,1).toLocaleDateString('es-AR',{month:'short',year:'numeric'});
    }catch(e){ return ym; }
  }
  function getContractMonths(c){
    if(!c) return 0;
    if(Number(c.plazo_meses) > 0) return Number(c.plazo_meses);
    if(c.fechaIni && c.fechaFin) return monthDiffInclusive(c.fechaIni, c.fechaFin);
    if(Number(c.plazo) > 0 && Number(c.plazo) < 240) return Number(c.plazo);
    if(Number(c.plazo) >= 240) return Math.max(Math.round(Number(c.plazo)/30.4),1);
    return 0;
  }

  function getSnapshots(code){
    const snaps = JSON.parse(localStorage.getItem('indicator_snapshots') || '[]');
    return snaps.filter(s => s && s.indicator_code === code)
      .sort((a,b)=> String(a.snapshot_date).localeCompare(String(b.snapshot_date)));
  }

  function accumulatedPct(code, baseYm, evalYm){
    if(!code || !baseYm || !evalYm || compareYm(evalYm, baseYm) <= 0) return null;
    const snaps = getSnapshots(code);
    if(!snaps.length) return null;

    const monthly = snaps.filter(s => {
      const ym = ymOf(s.snapshot_date);
      return ym && compareYm(ym, baseYm) > 0 && compareYm(ym, evalYm) <= 0;
    });

    if(monthly.length){
      let usePct = true;
      monthly.forEach(s => {
        const v = Number(s.pct != null ? s.pct : s.value);
        if(!isFinite(v) || Math.abs(v) > 200) usePct = false;
      });
      if(usePct){
        let acc = 1;
        monthly.forEach(s => {
          const v = Number(s.pct != null ? s.pct : s.value) || 0;
          acc *= (1 + v/100);
        });
        return { pct:(acc-1)*100, mode:'compound', rows:monthly };
      }
    }

    const baseSnap = snaps.filter(s => {
      const ym = ymOf(s.snapshot_date);
      return ym && compareYm(ym, baseYm) <= 0;
    }).sort((a,b)=> String(b.snapshot_date).localeCompare(String(a.snapshot_date)))[0];

    const evalSnap = snaps.filter(s => {
      const ym = ymOf(s.snapshot_date);
      return ym && compareYm(ym, evalYm) <= 0;
    }).sort((a,b)=> String(b.snapshot_date).localeCompare(String(a.snapshot_date)))[0];

    if(baseSnap && evalSnap){
      const b = Number(baseSnap.series_value != null ? baseSnap.series_value : baseSnap.value);
      const e = Number(evalSnap.series_value != null ? evalSnap.series_value : evalSnap.value);
      if(isFinite(b) && isFinite(e) && b > 0 && e > 0){
        return { pct:((e/b)-1)*100, mode:'ratio', rows:[baseSnap, evalSnap] };
      }
    }
    return null;
  }

  function firstMonthMeeting(code, baseYm, evalYm, threshold){
    let cur = nextYm(baseYm);
    while(cur && compareYm(cur, evalYm) <= 0){
      const r = accumulatedPct(code, baseYm, cur);
      if(r && isFinite(r.pct) && r.pct >= threshold) return { ym:cur, pct:r.pct };
      cur = nextYm(cur);
    }
    return null;
  }

  function getCurrentContract(cid){
    const db = window.DB || [];
    return db.find(c => String(c.id) === String(cid));
  }

  function getLastEffectiveUpdateYm(contract){
    if(!contract) return '';
    const pool = [];
    (contract.enmiendas || []).forEach(e => {
      if(e && !e.superseded){
        const ym = ymOf(e.nuevoPeriodo || e.newPeriod || e.periodo || e.fecha || e.fechaEfectiva);
        if(ym) pool.push(ym);
      }
    });
    (contract.aves || []).forEach(a => {
      const ym = ymOf(a.periodo || a.period || a.fecha || a.fechaAplicacion);
      if(ym) pool.push(ym);
    });
    if(!pool.length) return '';
    pool.sort();
    return pool[pool.length-1];
  }

  function getPrimaryBaseYm(contract){
    const p = (contract && Array.isArray(contract.poly) ? contract.poly : []).find(x => x && x.idx && Number(x.inc||0) > 0);
    return ymOf(p && (p.base || p.b || p.periodoBase)) || ymOf(contract && (contract.btar || contract.fechaIni));
  }

  function ensureConditionsSync(contract){
    if(!contract || !window.PolUpdate || typeof window.PolUpdate.saveConditions !== 'function') return null;
    const g = contract.gatillos || {};
    const baseInitialYm = getPrimaryBaseYm(contract);
    const lastEffYm = getLastEffectiveUpdateYm(contract);
    let cond = (typeof window.PolUpdate.getConditions === 'function' ? window.PolUpdate.getConditions(contract.id) : null) || {};
    const trigB = (g.B && g.B.enabled) || contract.trigB;
    const trigC = (g.C && g.C.enabled) || contract.trigC;
    const threshold = Number((g.B && g.B.threshold) || contract.trigBpct || 0);
    const monthsElapsed = Number((g.C && g.C.months) || contract.trigCmes || 0);
    cond.enabled = !!(trigB || trigC || cond.enabled);
    cond.allComponentsThreshold = trigB ? threshold : (cond.allComponentsThreshold || 0);
    cond.monthsElapsed = trigC ? monthsElapsed : (cond.monthsElapsed || 0);
    cond.baseDate = monthStart(lastEffYm || baseInitialYm || contract.fechaIni);
    cond.lastUpdateDate = monthStart(lastEffYm || '');
    cond.resetBase = !!cond.resetBase;
    window.PolUpdate.saveConditions(contract.id, cond);
    return cond;
  }

  function getAnalysisState(cid){
    try{return JSON.parse(localStorage.getItem('pol_analysis_mode_'+cid) || 'null') || { mode:'auto' };}
    catch(e){ return { mode:'auto' }; }
  }
  function setAnalysisState(cid, obj){
    localStorage.setItem('pol_analysis_mode_'+cid, JSON.stringify(obj));
  }

  function computeEvaluation(cid, evalYm){
    const contract = getCurrentContract(cid);
    if(!contract) return null;
    const cond = ensureConditionsSync(contract);
    if(!cond || !cond.enabled) return { contract, cond:null, details:[], overall:false, baseYm:'', evalYm, firstComplianceYm:'' };

    const state = getAnalysisState(cid);
    const baseYm = ymOf(state.baseYm) || ymOf(cond.lastUpdateDate) || ymOf(cond.baseDate) || getPrimaryBaseYm(contract) || ymOf(contract.fechaIni);
    const targetYm = ymOf(evalYm) || ymOf(new Date().toISOString().slice(0,7));
    const details = [];
    let overall = false;
    let firstComplianceYm = '';

    const activePoly = (contract.poly || []).filter(p => p && p.idx && Number(p.inc || 0) > 0);

    if(Number(cond.allComponentsThreshold) > 0 && activePoly.length){
      let cumpleTodas = true;
      let progress = 0;
      const allFirst = [];
      const idxBits = [];
      activePoly.forEach(p => {
        const calc = accumulatedPct(p.idx, baseYm, targetYm);
        if(calc && isFinite(calc.pct)){
          const pct = calc.pct;
          const cumple = pct >= Number(cond.allComponentsThreshold);
          if(!cumple) cumpleTodas = false;
          progress += Math.min(Math.max(pct / Number(cond.allComponentsThreshold), 0), 1);
          idxBits.push(`${p.idx}: ${(pct>=0?'+':'') + pct.toFixed(2)}% ${cumple?'✓':'○'}`);
          const first = firstMonthMeeting(p.idx, baseYm, targetYm, Number(cond.allComponentsThreshold));
          if(first) allFirst.push(first.ym);
        } else {
          cumpleTodas = false;
          idxBits.push(`${p.idx}: Sin datos`);
        }
      });
      if(allFirst.length === activePoly.length){
        allFirst.sort();
        firstComplianceYm = allFirst[allFirst.length-1];
      }
      details.push({
        type:'B',
        label:`Variación acumulada ≥ ${Number(cond.allComponentsThreshold).toFixed(2)}%`,
        met:cumpleTodas,
        progress: activePoly.length ? progress / activePoly.length : 0,
        detail:`Base ${formatYm(baseYm)} → Eval ${formatYm(targetYm)} | ` + idxBits.join(' | '),
        firstMetYm:firstComplianceYm || ''
      });
      if(cumpleTodas) overall = true;
    }

    if(Number(cond.monthsElapsed) > 0){
      const months = monthsBetween(cond.lastUpdateDate || cond.baseDate || monthStart(contract.fechaIni), monthStart(targetYm));
      let firstM = ymOf(cond.lastUpdateDate || cond.baseDate || contract.fechaIni);
      for(let i=1;i<=Number(cond.monthsElapsed);i++) firstM = nextYm(firstM);
      const met = months >= Number(cond.monthsElapsed);
      details.push({
        type:'C',
        label:`Meses transcurridos ≥ ${Number(cond.monthsElapsed)}`,
        met,
        progress: Math.min(months / Number(cond.monthsElapsed), 1),
        detail:`Base ${formatYm(ymOf(cond.lastUpdateDate || cond.baseDate || contract.fechaIni))} → Eval ${formatYm(targetYm)} | Transcurridos: ${months} meses`,
        firstMetYm:firstM
      });
      if(met) overall = true;
      if(!firstComplianceYm && met) firstComplianceYm = firstM;
    }

    if(state.mode === 'manual'){
      overall = !!state.forceEnable;
    }

    return {
      contract,
      cond,
      details,
      overall,
      baseYm,
      evalYm: targetYm,
      firstComplianceYm,
      analysis: state
    };
  }

  function saveEvaluationResult(cid, result){
    localStorage.setItem('pol_eval_result_'+cid, JSON.stringify({
      mesEval: result.evalYm,
      baseMonth: result.baseYm,
      fecha: new Date().toISOString(),
      details: result.details.map(d => ({
        condicion: d.label,
        cumplimiento: d.progress,
        cumplido: d.met,
        detalle: d.detail,
        firstMet: d.firstMetYm || ''
      })),
      cumpleGeneral: result.overall,
      firstComplianceMonth: result.firstComplianceYm || '',
      analysis: result.analysis || { mode:'auto' }
    }));
  }

  function patchEvaluateFunctions(){
    window.evaluateConditions = function(cid){
      const evalEl = document.getElementById('polEvalMonth');
      const evalYm = evalEl ? evalEl.value : ymOf(new Date().toISOString().slice(0,7));
      const result = computeEvaluation(cid, evalYm);
      if(!result){ window.toast && window.toast('Contrato no encontrado','er'); return; }
      saveEvaluationResult(cid, result);
      if(window.loadContract) window.loadContract(cid);
      window.toast && window.toast(result.overall ? '✓ Condiciones cumplidas' : '○ No cumple aún', result.overall ? 'ok' : 'er');
    };

    window.detectFirstCompliance = function(cid){
      const evalEl = document.getElementById('polEvalMonth');
      const evalYm = evalEl ? evalEl.value : ymOf(new Date().toISOString().slice(0,7));
      const result = computeEvaluation(cid, evalYm);
      if(!result){ window.toast && window.toast('Contrato no encontrado','er'); return; }
      saveEvaluationResult(cid, result);
      if(window.loadContract) window.loadContract(cid);
      window.toast && window.toast(result.firstComplianceYm ? ('Cumple por primera vez en ' + formatYm(result.firstComplianceYm)) : 'Aún no se identifica un mes con cumplimiento', result.firstComplianceYm ? 'ok' : 'er');
    };
  }

  function patchConditionsModal(){
    if(typeof window.openConditionsModal !== 'function') return;
    const orig = window.openConditionsModal;
    window.openConditionsModal = function(cid){
      orig(cid);
      const modal = document.getElementById('conditionsModal');
      if(!modal) return;
      const box = modal.querySelector('div[style]');
      if(!box || document.getElementById('manualAnalysisMode')) return;
      const state = getAnalysisState(cid);
      const extra = document.createElement('div');
      extra.style.cssText = 'margin-top:18px;padding-top:16px;border-top:1px solid var(--g200)';
      extra.innerHTML = `
        <h4 style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--p900)">Resolución de análisis</h4>
        <div class="fg fg2" style="margin-bottom:10px">
          <div class="fgrp c2">
            <label>Modo de análisis</label>
            <select id="manualAnalysisMode">
              <option value="auto" ${state.mode==='auto'?'selected':''}>Automático</option>
              <option value="manual" ${state.mode==='manual'?'selected':''}>Manual / Intermedio / Negociado</option>
            </select>
          </div>
          <div class="fgrp"><label>Base manual</label><input type="month" id="manualBaseYm" value="${state.baseYm||''}"></div>
          <div class="fgrp"><label>Mes negociación</label><input type="month" id="manualAppliedYm" value="${state.appliedYm||''}"></div>
          <div class="fgrp"><label>% / coef. negociado</label><input type="number" step="0.01" id="manualAppliedPct" value="${state.appliedPct!=null?state.appliedPct:''}"></div>
          <div class="fgrp c2"><label>Motivo / acuerdo</label><textarea id="manualReason" style="min-height:70px">${state.reason||''}</textarea></div>
          <div class="fgrp c2"><label><input type="checkbox" id="manualForceEnable" style="width:auto;margin-right:6px" ${state.forceEnable?'checked':''}> Forzar “corresponde ajuste”</label></div>
        </div>`;
      box.insertBefore(extra, box.lastElementChild);
      const saveBtn = box.querySelector('button.btn.btn-p');
      if(saveBtn && !saveBtn.dataset.v43patched){
        saveBtn.dataset.v43patched = '1';
        const oldClick = saveBtn.getAttribute('onclick');
        saveBtn.onclick = function(){
          setAnalysisState(cid, {
            mode: document.getElementById('manualAnalysisMode').value,
            baseYm: document.getElementById('manualBaseYm').value,
            appliedYm: document.getElementById('manualAppliedYm').value,
            appliedPct: document.getElementById('manualAppliedPct').value === '' ? null : Number(document.getElementById('manualAppliedPct').value),
            reason: document.getElementById('manualReason').value,
            forceEnable: !!document.getElementById('manualForceEnable').checked
          });
          if(oldClick){ try{ eval(oldClick); }catch(e){ console.error(e); } }
        };
      }
    };
  }

  function patchLoadContract(){
    if(typeof window.loadContract !== 'function') return;
    const orig = window.loadContract;
    window.loadContract = function(cid){
      const contract = getCurrentContract(cid);
      if(contract){
        contract.plazo_meses = getContractMonths(contract);
        ensureConditionsSync(contract);
      }
      const r = orig.apply(this, arguments);
      setTimeout(function(){
        try{ postRenderFixes(cid); }catch(e){ console.error('v43 postRenderFixes', e); }
      }, 30);
      return r;
    };
  }

  function patchGuardar(){
    if(typeof window.guardar !== 'function') return;
    const orig = window.guardar;
    window.guardar = function(){
      const res = orig.apply(this, arguments);
      setTimeout(function(){
        const db = window.DB || [];
        const c = db[db.length-1];
        if(c){
          c.plazo_meses = getContractMonths(c);
          ensureConditionsSync(c);
        }
      }, 30);
      return res;
    };
  }

  function patchHeader(){
    const tag = document.getElementById('buildTag');
    if(tag) tag.textContent = VERSION;
  }

  function postRenderFixes(cid){
    const contract = getCurrentContract(cid);
    if(!contract) return;
    contract.plazo_meses = getContractMonths(contract);

    // Plazo y monto mensual
    const detailCard = document.getElementById('detCard') || document;
    const spans = Array.from(detailCard.querySelectorAll('.dr, .dc, div, span'));
    spans.forEach(node => {
      if(node && node.textContent && node.textContent.trim() === 'Plazo'){
        const dv = node.parentElement && node.parentElement.querySelector('.dv');
        if(dv) dv.textContent = contract.plazo_meses + ' meses';
      }
      if(node && node.textContent && node.textContent.includes('Monto mensual estimado')){
        const container = node.closest('.dr') || node.parentElement;
        const valueEl = container && container.querySelector('.dv');
        if(valueEl){
          const monto = Number(contract.monto || 0);
          const pm = contract.plazo_meses ? (monto / contract.plazo_meses) : 0;
          valueEl.textContent = (contract.mon||'') + ' ' + (isFinite(pm) ? pm.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '0,00');
        }
      }
    });

    // Si el banner dice sin condiciones pero el gatillo existe, reemplazarlo por uno correcto
    const warning = Array.from(detailCard.querySelectorAll('div,span')).find(n => n.textContent && n.textContent.includes('Sin condiciones configuradas'));
    const cond = ensureConditionsSync(contract);
    if(warning && cond && cond.enabled){
      const box = warning.closest('div');
      if(box){
        box.style.background = 'var(--g100d)';
        box.style.borderColor = 'var(--g600)';
        box.style.color = 'var(--g600)';
        box.textContent = '✓ Condiciones de actualización activas';
      }
    }

    injectAuditSummary(contract);
  }

  function injectAuditSummary(contract){
    const root = document.getElementById('detCard') || document;
    // buscar bloque de actualización polinómica
    const secTitle = Array.from(root.querySelectorAll('h3,h2,div')).find(n => n.textContent && n.textContent.includes('Actualización Polinómica'));
    if(!secTitle) return;
    const container = secTitle.closest('.section-box') || secTitle.parentElement;
    if(!container) return;
    let host = container.querySelector('#v43AuditHost');
    if(!host){
      host = document.createElement('div');
      host.id = 'v43AuditHost';
      host.style.cssText = 'margin-top:14px;padding:14px;border-radius:8px;background:var(--g50);border:1px solid var(--g300)';
      container.appendChild(host);
    }
    const state = getAnalysisState(contract.id);
    const cond = ensureConditionsSync(contract);
    const baseYm = ymOf(state.baseYm) || ymOf(cond && (cond.lastUpdateDate || cond.baseDate)) || getPrimaryBaseYm(contract) || ymOf(contract.fechaIni);
    const evalYm = ymOf(localStorage.getItem('pol_eval_month_'+contract.id)) || ymOf(new Date().toISOString().slice(0,7));
    const result = computeEvaluation(contract.id, evalYm);
    const detailsHtml = (result && result.details.length)
      ? result.details.map(d => `
          <div style="padding:10px 0;border-bottom:1px solid var(--g100)">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:6px">
              <div style="font-weight:700;color:var(--g800)">${d.met?'✓':'○'} ${d.label}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-weight:800;color:${d.met?'var(--g600)':'var(--r500)'}">${(d.progress*100).toFixed(1)}%</div>
            </div>
            <div style="width:100%;height:10px;background:var(--g200);border-radius:999px;overflow:hidden"><div style="width:${Math.max(0,Math.min(100,d.progress*100))}%;height:100%;background:${d.met?'var(--g600)':'var(--r500)'}"></div></div>
            <div style="font-size:11px;color:var(--g600c);margin-top:6px;font-family:'JetBrains Mono',monospace;line-height:1.5">${d.detail}</div>
            ${d.firstMetYm?`<div style="font-size:11px;color:var(--g600);margin-top:6px;font-weight:700">Se cumplió por primera vez en: ${formatYm(d.firstMetYm)}</div>`:''}
          </div>`).join('')
      : '<div style="font-size:12px;color:var(--g600c)">Sin evaluación guardada todavía. Presioná “Evaluar”.</div>';

    host.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--g700);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📊 Evaluación automática / negociada</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        <label style="font-size:12px;font-weight:600;color:var(--g700)">Base</label>
        <input type="month" id="polEvalBaseManual" value="${baseYm}" style="width:145px;padding:6px 8px;border:1px solid var(--g300);border-radius:6px">
        <label style="font-size:12px;font-weight:600;color:var(--g700)">Evaluación</label>
        <input type="month" id="polEvalMonth" value="${evalYm}" style="width:145px;padding:6px 8px;border:1px solid var(--g300);border-radius:6px">
        <button class="btn btn-p btn-sm" type="button" onclick="evaluateConditions('${contract.id}')">🔍 Evaluar</button>
        <button class="btn btn-s btn-sm" type="button" onclick="detectFirstCompliance('${contract.id}')">🧭 Primer mes que cumple</button>
        <button class="btn btn-s btn-sm" type="button" onclick="openConditionsModal('${contract.id}')">⚙️ Configurar / Manual</button>
      </div>
      <div style="font-size:12px;color:var(--g600c);margin-bottom:10px">
        <strong>Última actualización considerada:</strong> ${formatYm(ymOf(cond && (cond.lastUpdateDate||'')) || '')} &nbsp;·&nbsp;
        <strong>Base efectiva:</strong> ${formatYm(result ? result.baseYm : baseYm)} &nbsp;·&nbsp;
        <strong>Modo:</strong> ${state.mode === 'manual' ? 'Manual / Negociado' : 'Automático'}
      </div>
      ${detailsHtml}
      <div style="margin-top:12px;padding:12px;border-radius:8px;background:${result && result.overall ? 'var(--g100d)' : 'var(--a100)'};border:1px solid ${result && result.overall ? 'var(--g600)' : 'var(--a500)'};color:${result && result.overall ? 'var(--g600)' : '#92400e'};font-weight:700">
        ${result && result.overall ? '✓ Corresponde ajuste' : '○ Aún no corresponde ajuste'}
        ${result && result.firstComplianceYm ? ' · Gatillo cumplido desde ' + formatYm(result.firstComplianceYm) : ''}
      </div>
      ${state.mode==='manual' ? `<div style="margin-top:10px;padding:10px;border-radius:6px;background:var(--b100);border:1px solid var(--b500);font-size:12px;color:var(--b500)"><strong>Manual / negociado:</strong> ${state.appliedYm?('Aplicado en '+formatYm(state.appliedYm)+'. '):''}${state.appliedPct!=null?('Variación/coeficiente acordado: '+state.appliedPct+'. '):''}${state.reason||''}</div>`:''}
    `;

    const baseInput = host.querySelector('#polEvalBaseManual');
    if(baseInput){
      baseInput.addEventListener('change', function(){
        const st = getAnalysisState(contract.id);
        st.baseYm = baseInput.value;
        setAnalysisState(contract.id, st);
      });
    }
  }

  function init(){
    patchHeader();
    patchEvaluateFunctions();
    patchConditionsModal();
    patchLoadContract();
    patchGuardar();
    // también recalcular plazo al editar fechas en formulario
    ['f_ini','f_fin'].forEach(id => {
      const el = document.getElementById(id);
      if(el){
        el.addEventListener('change', function(){
          const a = document.getElementById('f_ini') && document.getElementById('f_ini').value;
          const b = document.getElementById('f_fin') && document.getElementById('f_fin').value;
          const plazo = document.getElementById('f_plazo');
          if(plazo && a && b) plazo.value = monthDiffInclusive(a,b);
        });
      }
    });
    console.log('[v43] parche polupdate cargado');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
