
// ═══════════ MÓDULO ACTUALIZACIÓN POLINÓMICA ═══════════════════════════════
var PolUpdate = (function(){
  var state = { contractId: null, baseData: null, conditions: null, currentPrices: [], updatedPrices: [], aveAmount: 0, newMonthlyEstimate: 0 };
  
  function getConditions(cid){ 
    var key='pol_cond_'+cid; 
    var stored=localStorage.getItem(key); 
    if(!stored){
      // MIGRAR desde gatillos si existen
      var contract=window.DB.find(function(c){return c.id==cid;});
      if(contract&&contract.gatillos){
        return migrateFromGatillos(contract);
      }
      return null;
    }
    try{return JSON.parse(stored);}catch(e){return null;} 
  }
  
  function migrateFromGatillos(contract){
    var g=contract.gatillos;
    if(!g)return null;
    var cond={
      enabled:true,
      moThreshold:0,
      allComponentsThreshold:0,
      monthsElapsed:0,
      baseDate:contract.fechaIni||contract.btar,
      lastUpdateDate:null,
      resetBase:false
    };
    // Gatillo A: CCT (ignorar por ahora)
    // Gatillo B: Variación acumulada
    if(g.B&&g.B.enabled){
      cond.allComponentsThreshold=parseFloat(g.B.threshold)||0;
    }
    // Gatillo C: Meses transcurridos
    if(g.C&&g.C.enabled){
      cond.monthsElapsed=parseInt(g.C.months)||0;
    }
    return cond;
  }
  
  function saveConditions(cid,data){ 
    localStorage.setItem('pol_cond_'+cid,JSON.stringify(data)); 
    // También guardar en contract.gatillos para compatibilidad
    var contract=window.DB.find(function(c){return c.id==cid;});
    if(contract){
      if(!contract.gatillos)contract.gatillos={};
      contract.gatillos.B={
        enabled:data.allComponentsThreshold>0,
        threshold:data.allComponentsThreshold
      };
      contract.gatillos.C={
        enabled:data.monthsElapsed>0,
        months:data.monthsElapsed
      };
      save();
    }
  }
  
  function checkConditions(contract,conditions){
    if(!conditions||!conditions.enabled)return{met:false,reasons:[]};
    var reasons=[]; var met=false;
    if(conditions.moThreshold&&conditions.moThreshold>0){
      var moSnap=getLatestIndicator('mo');
      if(moSnap&&moSnap.value){
        var baseSnap=getIndicatorAtDate('mo',conditions.baseDate||contract.fechaIni);
        if(baseSnap&&baseSnap.value){
          var inc=((moSnap.value-baseSnap.value)/baseSnap.value)*100;
          if(inc>=conditions.moThreshold){ met=true; reasons.push('MO +'+inc.toFixed(2)+'%'); }
        }
      }
    }
    if(conditions.allComponentsThreshold&&conditions.allComponentsThreshold>0){
      var allMet=true; var poly=contract.poly;
      if(poly&&poly.length){
        poly.forEach(function(c){
          if(!c.idx)return;
          var snap=getLatestIndicator(c.idx); var base=getIndicatorAtDate(c.idx,conditions.baseDate||contract.fechaIni);
          if(!snap||!base||!snap.value||!base.value){ allMet=false; return; }
          var inc=((snap.value-base.value)/base.value)*100;
          if(inc<conditions.allComponentsThreshold)allMet=false;
        });
        if(allMet){ met=true; reasons.push('Todos >'+conditions.allComponentsThreshold+'%'); }
      }
    }
    if(conditions.monthsElapsed&&conditions.monthsElapsed>0){
      var lastUpdate=conditions.lastUpdateDate||contract.fechaIni;
      var monthsDiff=monthsBetween(lastUpdate,ymToday());
      if(monthsDiff>=conditions.monthsElapsed){ met=true; reasons.push(monthsDiff+' meses'); }
    }
    return{met:met,reasons:reasons};
  }
  
  function getLatestIndicator(code){
    var snaps=JSON.parse(localStorage.getItem('indicator_snapshots')||'[]');
    var filtered=snaps.filter(function(s){return s.indicator_code===code;});
    if(!filtered.length)return null;
    filtered.sort(function(a,b){return new Date(b.snapshot_date)-new Date(a.snapshot_date);});
    return filtered[0];
  }
  
  function getIndicatorAtDate(code,date){
    var snaps=JSON.parse(localStorage.getItem('indicator_snapshots')||'[]');
    var filtered=snaps.filter(function(s){return s.indicator_code===code&&s.snapshot_date<=date;});
    if(!filtered.length)return null;
    filtered.sort(function(a,b){return new Date(b.snapshot_date)-new Date(a.snapshot_date);});
    return filtered[0];
  }
  
  function monthsBetween(d1,d2){
    var start=new Date(d1+'T00:00:00'); var end=new Date(d2+'T00:00:00');
    return(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
  }
  
  function calculateUpdate(contract){
    state.contractId=contract.id; state.baseData=contract; state.conditions=getConditions(contract.id);
    if(!contract.poly||!contract.poly.length)return null;
    var poly=contract.poly.filter(function(p){return p.idx;});
    var baseDate=state.conditions?(state.conditions.baseDate||contract.fechaIni):contract.fechaIni;
    var tars=getTar()||[]; var currentList=tars.filter(function(t){return t.period===contract.btar||(!t.period&&tars.indexOf(t)===0);});
    state.currentPrices=currentList.length&&currentList[0].rows?currentList[0].rows.map(function(r){return{description:r[1]||'',unit:r[2]||'',quantity:parseFloat(r[3])||1,unit_price:parseFloat(r[3])||0};}):[{description:'Item base',unit:'UN',quantity:1,unit_price:contract.monto||0}];
    // Ko: leer directo de IDX_STORE (idxRows) — evita datos stale de indicator_snapshots
    var Ko=1;
    var baseYm=ymOf(baseDate), evalYm=ymOf(ymToday());
    poly.forEach(function(c){
      var rows=safeIdxRows(c.idx); if(!rows.length) return;
      // Modo pct compuesto (IPC, IPIM, etc.)
      var monthRows=rows.filter(function(r){ return r.ym&&compareYm(r.ym,baseYm)>0&&compareYm(r.ym,evalYm)<=0&&r.pct!=null&&isFinite(Number(r.pct)); });
      if(monthRows.length){ var acc=1; monthRows.forEach(function(r){ acc*=1+(Number(r.pct)/100); }); Ko*=Math.pow(acc,Number(c.inc)||0); return; }
      // Fallback ratio de valores absolutos (USD, gasoil)
      var bRow=rows.filter(function(r){ return r.ym&&compareYm(r.ym,baseYm)<=0&&r.value!=null&&Number(r.value)>0; }).sort(function(a,b){ return b.ym.localeCompare(a.ym); })[0];
      var eRow=rows.filter(function(r){ return r.ym&&compareYm(r.ym,evalYm)<=0&&r.value!=null&&Number(r.value)>0; }).sort(function(a,b){ return b.ym.localeCompare(a.ym); })[0];
      if(bRow&&eRow&&Number(bRow.value)>0){ Ko*=Math.pow(Number(eRow.value)/Number(bRow.value),Number(c.inc)||0); }
    });
    state.updatedPrices=state.currentPrices.map(function(item){
      var newPrice=item.unit_price*Ko;
      return{description:item.description,unit:item.unit,quantity:item.quantity,unit_price:newPrice,old_price:item.unit_price,variation:Ko>0?((Ko-1)*100):0};
    });
    // contractMonths: usar monthDiffInclusive para evitar conflicto con la segunda definición de getContractMonths (devuelve array)
    var contractMonths=monthDiffInclusive(contract.fechaIni,contract.fechaFin)||parseInt(contract.plazo_meses||contract.plazo||0)||1;
    var oldMonthly=(contract.monto||0)/contractMonths;
    var newMonthly=state.updatedPrices.reduce(function(sum,p){return sum+(p.unit_price*p.quantity);},0);
    var monthsRemaining=monthsRemainingInclusive(ymToday(),contract.fechaFin);
    state.aveAmount=(newMonthly-oldMonthly)*monthsRemaining; state.newMonthlyEstimate=newMonthly; state.Ko=Ko; state.baseDate=baseDate;
    return{updatedPrices:state.updatedPrices,aveAmount:state.aveAmount,newMonthlyEstimate:newMonthly,oldMonthlyEstimate:oldMonthly,monthsRemaining:monthsRemaining,Ko:Ko};
  }
  
  async function applyUpdate(){
    console.log('[applyUpdate] inicio', {contractId:state.contractId, hasBase:!!state.baseData, Ko:state.Ko});
    if(!state.contractId||!state.baseData){
      toast('No hay actualización calculada. Usá "Calcular actualización polinómica" primero.','er');
      return;
    }
    var contract=state.baseData; var updateDate=ymToday();
    var enms=(contract.enmiendas||[]).slice();
    var koDecimal=(state.Ko||1)-1;
    var basePer=state.baseDate||(state.conditions?(state.conditions.baseDate||contract.fechaIni):contract.fechaIni);
    var newEnm={num:(enms.length+1),tipo:'ACTUALIZACION_TARIFAS',fecha:updateDate,motivo:'Actualización automática por fórmula polinómica',pctPoli:koDecimal,basePeriodo:basePer,nuevoPeriodo:updateDate,ko:state.Ko||1};
    enms.push(newEnm); contract.enmiendas=enms;
    console.log('[applyUpdate] enmienda agregada N°', newEnm.num, '· total enmiendas:', enms.length);
    var tars=getTar()||[]; var baseTar=tars.find(function(t){return t.period===(state.conditions?(state.conditions.baseDate||contract.btar):contract.btar);});
    if(baseTar){
      var newTar={name:baseTar.name+' ACT',cols:baseTar.cols||['Item','Descripción','Unidad','Precio'],rows:state.updatedPrices.map(function(p){return['',p.description,p.unit,p.unit_price];}),period:updateDate,source:'POLINOMICA',importedAt:new Date().toISOString(),editable:true};
      tars.push(newTar); contract.tarifarios=tars;
    }
    var aves=(contract.aves||[]).slice();
    var newAve={id:Date.now()+'',tipo:'POLINOMICA',enmRef:newEnm.num,fecha:updateDate,periodo:updateDate,monto:state.aveAmount,concepto:'AVE por actualización polinómica',autoGenerated:true};
    aves.push(newAve); contract.aves=aves;
    contract.monto=(contract.monto||0)+state.aveAmount;
    contract.updatedAt=new Date().toISOString();
    var idx=window.DB.findIndex(function(c){return c.id===contract.id;}); if(idx!==-1)window.DB[idx]=contract;
    // Fallback localStorage SIEMPRE para no perder datos si Supabase falla
    try{ localStorage.setItem('cta_v7', JSON.stringify(window.DB)); }catch(_e){}
    try{
      await save();
      console.log('[applyUpdate] ✓ guardado en Supabase');
    }catch(err){
      console.error('[applyUpdate] save() falló:', err);
      toast('⚠ Enmienda guardada localmente. Error al sincronizar con Supabase.','er');
    }
    if(state.conditions){
      state.conditions.lastUpdateDate=updateDate;
      if(state.conditions.resetBase)state.conditions.baseDate=updateDate;
      saveConditions(contract.id,state.conditions);
    }
    toast('✓ Enmienda N°'+newEnm.num+' registrada · AVE '+fN(state.aveAmount),'ok');
    verDet(contract.id);
    if (typeof window.initFuzzySearch === 'function') {
      window.initFuzzySearch();
    }
  }
  
  return{getConditions:getConditions,saveConditions:saveConditions,checkConditions:checkConditions,calculateUpdate:calculateUpdate,applyUpdate:applyUpdate};
})();

function renderUpdateSection(contract){
  var section=document.createElement('div'); section.className='card'; section.style.marginBottom='20px';
  var header=document.createElement('div'); header.className='fsec';
  header.innerHTML='<div class="fsh"><div class="fi a">⚡</div><h2>Actualización Polinómica</h2></div>';
  section.appendChild(header);
  var body=document.createElement('div'); body.className='fsec';
  
  if(!contract.poly||!contract.poly.filter(function(p){return p.idx;}).length){
    body.innerHTML='<p style="color:var(--g500);font-size:13px">Este contrato no tiene fórmula polinómica configurada</p>';
    section.appendChild(body); return section;
  }
  
  var poly=contract.poly.filter(function(p){return p.idx;});
  var formulaDiv=document.createElement('div'); 
  formulaDiv.style.marginBottom='16px';
  formulaDiv.style.padding='12px 14px';
  formulaDiv.style.background='var(--p50)';
  formulaDiv.style.borderRadius='8px';
  formulaDiv.style.border='1px solid var(--p200)';
  formulaDiv.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--p800);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">✓ Fórmula polinómica configurada</div>'+
    '<code style="background:var(--w);padding:8px 12px;border-radius:6px;font-size:12px;font-family:monospace;display:block;border:1px solid var(--p200);color:var(--p900)">'+
    'Ko = '+poly.map(function(c){return c.idx+' × '+(c.inc*100).toFixed(1)+'%';}).join(' + ')+'</code>';
  body.appendChild(formulaDiv);
  
  var hasGatillos=((contract.gatillos&&((contract.gatillos.B&&contract.gatillos.B.enabled)||(contract.gatillos.C&&contract.gatillos.C.enabled)))||contract.trigB||contract.trigC);
  var conditions=PolUpdate.getConditions(contract.id);
  
  // FORZAR ACTIVACIÓN si tiene gatillos
  if(hasGatillos){
    if(!conditions){
      conditions={
        enabled:true,
        moThreshold:0,
        allComponentsThreshold:(contract.trigB?(Number(contract.trigBpct)||0):((contract.gatillos&&contract.gatillos.B)?(Number(contract.gatillos.B.threshold)||0):0)),
        monthsElapsed:(contract.trigC?(parseInt(contract.trigCmes,10)||0):((contract.gatillos&&contract.gatillos.C)?(parseInt(contract.gatillos.C.months,10)||0):0)),
        baseDate:(contract.btar?contract.btar+'-01':contract.fechaIni),
        lastUpdateDate:null,
        resetBase:false
      };
      PolUpdate.saveConditions(contract.id,conditions);
    }
    if(conditions&&!conditions.enabled){
      conditions.enabled=true;
      PolUpdate.saveConditions(contract.id,conditions);
    }
    conditions=PolUpdate.getConditions(contract.id);
  }
  
  if(!conditions||!conditions.enabled){
    var warnDiv=document.createElement('div');
    warnDiv.style.padding='12px 16px';
    warnDiv.style.background='var(--a100)';
    warnDiv.style.border='2px solid var(--a500)';
    warnDiv.style.borderRadius='8px';
    warnDiv.innerHTML='<div style="display:flex;align-items:center;gap:8px">'+
      '<span style="font-size:20px">⚠️</span>'+
      '<div style="font-size:13px;font-weight:700;color:#92400e">Sin condiciones configuradas</div>'+
      '</div>';
    body.appendChild(warnDiv);
    section.appendChild(body); 
    return section;
  }
  
  // Mostrar condiciones ACTIVAS
  var condDiv=document.createElement('div');
  condDiv.style.marginBottom='16px';
  condDiv.style.padding='12px 16px';
  condDiv.style.background='var(--g100d)';
  condDiv.style.borderRadius='8px';
  condDiv.style.border='2px solid var(--g600)';
  var condHtml='<div style="font-size:11px;font-weight:700;color:var(--g600);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">✓ Condiciones de actualización activas</div>';
  condHtml+='<ul style="margin:0 0 0 20px;font-size:13px;color:var(--g600);line-height:2;font-weight:600">';
  if(conditions.allComponentsThreshold>0){
    condHtml+='<li>Variación acumulada ≥ '+conditions.allComponentsThreshold+'%</li>';
  }
  if(conditions.monthsElapsed>0){
    condHtml+='<li>'+conditions.monthsElapsed+' meses desde última actualización</li>';
  }
  condHtml+='</ul>';
  condDiv.innerHTML=condHtml;
  body.appendChild(condDiv);
  
  // PANEL AUDITORÍA
  var auditDiv=document.createElement('div');
  auditDiv.style.marginBottom='16px';
  auditDiv.style.padding='14px 16px';
  auditDiv.style.background='var(--g50)';
  auditDiv.style.borderRadius='8px';
  auditDiv.style.border='1px solid var(--g300)';
  
  var mesEval=localStorage.getItem('pol_eval_month_'+contract.id)||ymToday();
  var lastTarPeriod=getLastTariffPeriod(contract);
  var baseEval=lastTarPeriod||ymOf((PolUpdate.getConditions(contract.id)||{}).baseDate)||ymOf(contract.btar)||ymOf(contract.fechaIni)||mesEval;
  var auditHtml='<div style="font-size:11px;font-weight:700;color:var(--g700);text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">📊 Auditoría - Cumplimiento de condiciones</div>';
  auditHtml+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">'+
    '<label style="font-size:12px;font-weight:600;color:var(--g700);white-space:nowrap">Base comparación:</label>'+
    '<input type="month" id="polBaseMonth" value="'+baseEval+'" style="width:150px;font-size:12px;padding:6px 8px">'+
    '<label style="font-size:12px;font-weight:600;color:var(--g700);white-space:nowrap">Mes evaluación:</label>'+
    '<input type="month" id="polEvalMonth" value="'+mesEval+'" style="width:150px;font-size:12px;padding:6px 8px">'+
    '<button class="btn btn-p btn-sm" onclick="evaluateConditions(\''+contract.id+'\')">🔍 Evaluar</button>'+
    '<button class="btn btn-s btn-sm" onclick="detectFirstCompliance(\''+contract.id+'\')">🧭 Primer mes que cumple</button>'+
    '</div>';
  var evalResult=getEvaluationResult(contract.id,mesEval);
  if(evalResult){
    auditHtml+='<div style="background:var(--w);padding:14px;border-radius:6px;border:1px solid var(--g200)">';
    auditHtml+='<div style="font-size:12px;color:var(--g600c);margin-bottom:12px"><strong>Base:</strong> '+formatYmLabel(evalResult.baseMonth||baseEval)+' · <strong>Evaluación:</strong> '+formatYmLabel(evalResult.mesEval||mesEval)+'</div>';
    evalResult.details.forEach(function(d){
      var pct=(d.cumplimiento*100).toFixed(1);
      var color=d.cumplido?'var(--g600)':'var(--r500)';
      var icon=d.cumplido?'✓':'○';
      auditHtml+='<div style="padding:10px 0;border-bottom:1px solid var(--g100)">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:10px">'+
          '<span style="font-size:13px;font-weight:600;color:var(--g800)">'+icon+' '+d.condicion+'</span>'+
          '<span style="font-size:14px;font-weight:700;color:'+color+'">'+pct+'%</span>'+
        '</div>'+
        '<div style="width:100%;height:12px;background:var(--g200);border-radius:6px;overflow:hidden">'+
          '<div style="width:'+pct+'%;height:100%;background:'+color+';transition:width 0.3s"></div>'+
        '</div>'+
        (d.detalle?'<div style="font-size:11px;color:var(--g600c);margin-top:6px;font-family:monospace;line-height:1.5">'+d.detalle+'</div>':'')+
        (d.firstMet?'<div style="font-size:11px;color:var(--g600);margin-top:6px;font-weight:700">Se cumple por primera vez en: '+formatYmLabel(d.firstMet)+'</div>':'')+
      '</div>';
    });
    if(evalResult.firstComplianceMonth){
      auditHtml+='<div style="margin-top:12px;padding:10px 12px;border-radius:6px;background:var(--p50);border:1px solid var(--p200);font-size:12px;color:var(--p800)"><strong>Primer mes con cumplimiento:</strong> '+formatYmLabel(evalResult.firstComplianceMonth)+'</div>';
    }
    auditHtml+='<div style="margin-top:14px;padding:14px;border-radius:8px;background:'+(evalResult.cumpleGeneral?'var(--g100d)':'var(--g100)')+';border:2px solid '+(evalResult.cumpleGeneral?'var(--g600)':'var(--g300)')+'">'+
      '<div style="font-size:14px;font-weight:700;color:'+(evalResult.cumpleGeneral?'var(--g600)':'var(--g700)')+'">'+
      (evalResult.cumpleGeneral?'✓ CONDICIONES CUMPLIDAS - Actualización habilitada':'○ Condiciones no cumplidas - Continuar monitoreando')+
      '</div></div>';
    auditHtml+='</div>';
  }
  
  auditDiv.innerHTML=auditHtml;
  body.appendChild(auditDiv);
  
  if(evalResult&&evalResult.cumpleGeneral){
    var actionDiv=document.createElement('div');
    actionDiv.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    actionDiv.innerHTML='<button class="btn btn-a" onclick="previewUpdate(\''+contract.id+'\')">🔄 Calcular actualización polinómica</button>' + ((evalResult.eligibleMonths&&evalResult.eligibleMonths.length)?'<button class="btn btn-s" onclick="openEligibleMonthsModal(\''+contract.id+'\')">📆 Elegir meses de ajuste</button><button class="btn btn-s" onclick="generateSelectedPriceLists(\''+contract.id+'\')">🧾 Generar lista(s) de precios</button>':'');
    body.appendChild(actionDiv);
    var summaryDiv=document.createElement('div');
    summaryDiv.id='selectedAdjustmentSummary_'+contract.id;
    summaryDiv.style.cssText='display:none;margin-top:10px;padding:10px 12px;border-radius:8px;background:var(--b50);border:1px solid var(--b200)';
    body.appendChild(summaryDiv);
    renderSelectedPeriodsSummary(contract.id);
  }
  
  section.appendChild(body); 
  return section;
}

function evaluateConditions(cid){
  var mesEval=document.getElementById('polEvalMonth').value;
  var baseMonth=document.getElementById('polBaseMonth')?document.getElementById('polBaseMonth').value:'';
  if(!mesEval){toast('Seleccione un mes de evaluación','er');return;}
  if(!baseMonth){toast('Seleccione un mes base','er');return;}
  if(compareYm(mesEval,baseMonth)<=0){toast('El mes de evaluación debe ser posterior a la base','er');return;}
  localStorage.setItem('pol_eval_month_'+cid,mesEval);
  var contract=window.DB.find(function(c){return c.id==cid;});
  if(!contract){toast('Contrato no encontrado','er');return;}
  var conditions=PolUpdate.getConditions(cid);
  if(!conditions){toast('Sin condiciones configuradas','er');return;}
  conditions.baseDate=normalizeToMonthStart(baseMonth)||conditions.baseDate;
  PolUpdate.saveConditions(cid,conditions);
  var details=[];
  var cumpleGeneral=false;
  var firstComplianceMonth='';
  if(conditions.allComponentsThreshold>0){
    var poly=(contract.poly||[]).filter(function(p){return p.idx;});
    if(!poly.length){toast('Sin índices configurados','er');return;}
    var detalleIndices=[];
    var cumpleTodas=true;
    var promCumplimiento=0;
    var countPoly=0;
    poly.forEach(function(p){
      var calc=computeAccumulatedVariationPct(p.idx, baseMonth, mesEval);
      if(calc && isFinite(calc.pct)){
        var variacion=calc.pct;
        var cumple=variacion>=conditions.allComponentsThreshold;
        if(!cumple)cumpleTodas=false;
        promCumplimiento+=Math.min(Math.max(variacion/conditions.allComponentsThreshold,0),1);
        countPoly++;
        detalleIndices.push(p.idx+': '+(variacion>=0?'+':'')+variacion.toFixed(2)+'% '+(cumple?'✓':'○'));
      }else{
        detalleIndices.push(p.idx+': Sin datos');
        cumpleTodas=false;
      }
    });
    if(countPoly>0){
      // firstComplianceMonth: primer mes (desde baseMonth+1 hasta mesEval) donde la variación
      // polinómica combinada (Ko-1) supera el umbral. Coincide con el cálculo del modal.
      try{
        var scanFromYm=nextYm(ymOf(baseMonth));
        var scanToYm=ymOf(mesEval);
        var scanCur=scanFromYm;
        while(scanCur && compareYm(scanCur, scanToYm)<=0){
          var cumPct=computePoliDeltaPct(contract, ymOf(baseMonth), scanCur);
          if(cumPct!=null && isFinite(cumPct) && cumPct>=conditions.allComponentsThreshold){
            firstComplianceMonth=scanCur;
            break;
          }
          scanCur=nextYm(scanCur);
        }
      }catch(_e){ console.warn('firstComplianceMonth scan',_e); }
      details.push({
        condicion:'Variación acumulada ≥ '+conditions.allComponentsThreshold+'%',
        cumplimiento:promCumplimiento/countPoly,
        cumplido:cumpleTodas,
        detalle:'Base '+formatYmLabel(baseMonth)+' → Eval '+formatYmLabel(mesEval)+' | '+detalleIndices.join(' | '),
        firstMet:firstComplianceMonth||''
      });
      if(cumpleTodas)cumpleGeneral=true;
    } else {
      toast('No hay datos de indicadores para evaluar','er');
      return;
    }
  }
  if(conditions.monthsElapsed>0){
    var lastUpdate=ymOf(conditions.lastUpdateDate)||ymOf(contract.fechaIni);
    var mesesTranscurridos=monthsBetween(normalizeToMonthStart(lastUpdate), normalizeToMonthStart(mesEval));
    var cumpleMeses=mesesTranscurridos>=conditions.monthsElapsed;
    var firstMesCond=lastUpdate; for(var i=1;i<=conditions.monthsElapsed;i++) firstMesCond=nextYm(firstMesCond);
    details.push({
      condicion:'Meses transcurridos ≥ '+conditions.monthsElapsed,
      cumplimiento:Math.min(mesesTranscurridos/conditions.monthsElapsed,1),
      cumplido:cumpleMeses,
      detalle:'Base '+formatYmLabel(lastUpdate)+' → Eval '+formatYmLabel(mesEval)+' | Transcurridos: '+mesesTranscurridos+' meses',
      firstMet:firstMesCond
    });
    if(cumpleMeses)cumpleGeneral=true;
    if(!firstComplianceMonth && cumpleMeses){ firstComplianceMonth=firstMesCond; }
  }
  if(!details.length){toast('No hay condiciones para evaluar','er');return;}
  var eligibleMonths=getEligibleAdjustmentMonths(cid,baseMonth,mesEval);
  var result={mesEval:mesEval,baseMonth:baseMonth,fecha:new Date().toISOString(),details:details,cumpleGeneral:cumpleGeneral,firstComplianceMonth:firstComplianceMonth||'',eligibleMonths:eligibleMonths};
  localStorage.setItem('pol_eval_result_'+cid,JSON.stringify(result));
  toast(cumpleGeneral?'✓ Condiciones cumplidas':'○ No cumple aún',cumpleGeneral?'ok':'er');
  if(typeof window.detId!=='undefined') window.detId=cid;
  if(typeof renderDet==='function'){ renderDet(); }
  else if(typeof go==='function'){ go('detail'); }
}
function detectFirstCompliance(cid){
  var baseMonth=document.getElementById('polBaseMonth')?document.getElementById('polBaseMonth').value:'';
  var mesEval=document.getElementById('polEvalMonth')?document.getElementById('polEvalMonth').value:ymToday();
  if(!baseMonth){toast('Seleccione un mes base','er');return;}
  if(compareYm(mesEval,baseMonth)<=0){toast('El mes evaluación debe ser posterior a la base','er');return;}
  evaluateConditions(cid);
  var result=getEvaluationResult(cid,mesEval);
  if(result && result.firstComplianceMonth){ toast('Cumple por primera vez en '+formatYmLabel(result.firstComplianceMonth),'ok'); }
  else{ toast('Aún no se identifica un mes con cumplimiento','er'); }
}
function getIndicatorAtDate(code,date){
  var snaps=JSON.parse(localStorage.getItem('indicator_snapshots')||'[]');
  var filtered=snaps.filter(function(s){return s.indicator_code===code&&s.snapshot_date<=date;});
  if(!filtered.length)return null;
  filtered.sort(function(a,b){return new Date(b.snapshot_date)-new Date(a.snapshot_date);});
  return filtered[0];
}

function getEvaluationResult(cid,mesEval){
  var stored=localStorage.getItem('pol_eval_result_'+cid);
  if(!stored)return null;
  try{
    var result=JSON.parse(stored);
    return result;
  }catch(e){
    return null;
  }
}

function getEligibleAdjustmentMonths(cid, baseMonth, evalMonth){
  var contract=window.DB.find(function(c){return c.id==cid;});
  if(!contract)return [];
  var conditions=PolUpdate.getConditions(cid);
  if(!conditions)return [];
  var fromYm=ymOf(baseMonth), toYm=ymOf(evalMonth);
  if(!fromYm||!toYm||compareYm(toYm,fromYm)<=0)return [];
  var monthsMap={};
  if(conditions.allComponentsThreshold>0){
    var cur=nextYm(fromYm);
    while(cur && compareYm(cur,toYm)<0){
      var cumPct=computePoliDeltaPct(contract, fromYm, cur);
      if(cumPct!=null && isFinite(cumPct) && cumPct>=conditions.allComponentsThreshold) monthsMap[cur]={ym:cur,pct:cumPct,reason:'threshold'};
      cur=nextYm(cur);
    }
  }
  if(conditions.monthsElapsed>0){
    var lastUpdate=ymOf(conditions.lastUpdateDate)||ymOf(contract.fechaIni);
    var firstM=lastUpdate; for(var i=1;i<=conditions.monthsElapsed;i++) firstM=nextYm(firstM);
    var cur2=firstM;
    while(cur2 && compareYm(cur2,toYm)<0){
      if(!monthsMap[cur2]) monthsMap[cur2]={ym:cur2,pct:null,reason:'months'};
      cur2=nextYm(cur2);
    }
  }
  return Object.values(monthsMap).sort(function(a,b){return String(a.ym).localeCompare(String(b.ym));});
}
function computePoliDeltaPct(contract, refYm, targetYm){
  if(!contract || !refYm || !targetYm || compareYm(targetYm,refYm)<=0) return null;
  var poly=(contract.poly||[]).filter(function(p){return p && p.idx;});
  if(!poly.length) return null;
  var ko=1, count=0;
  poly.forEach(function(c){
    // 1. Intentar con datos frescos de IDX_STORE (sin side-effects en IDX_STORE)
    var rows=safeIdxRows(c.idx);
    if(rows.length){
      // Modo pct compuesto
      var monthRows=rows.filter(function(r){ return r.ym&&compareYm(r.ym,refYm)>0&&compareYm(r.ym,targetYm)<=0&&r.pct!=null&&isFinite(Number(r.pct)); });
      if(monthRows.length){
        var acc=1; monthRows.forEach(function(r){ acc*=1+(Number(r.pct)/100); });
        ko*=Math.pow(acc, Number(c.inc)||0);
        count++; return;
      }
      // Fallback ratio valores absolutos (USD, gasoil)
      var bRow=rows.filter(function(r){ return r.ym&&compareYm(r.ym,refYm)<=0&&r.value!=null&&Number(r.value)>0; }).sort(function(a,b){ return b.ym.localeCompare(a.ym); })[0];
      var eRow=rows.filter(function(r){ return r.ym&&compareYm(r.ym,targetYm)<=0&&r.value!=null&&Number(r.value)>0; }).sort(function(a,b){ return b.ym.localeCompare(a.ym); })[0];
      if(bRow&&eRow&&Number(bRow.value)>0){
        ko*=Math.pow(Number(eRow.value)/Number(bRow.value), Number(c.inc)||0);
        count++; return;
      }
    }
    // 2. Fallback: indicator_snapshots localStorage (índices MO como PP, UOCRA)
    var calc=computeAccumulatedVariationPct(c.idx, refYm, targetYm);
    if(calc && isFinite(calc.pct)){
      ko*=Math.pow(1+(Number(calc.pct)/100), Number(c.inc)||0);
      count++;
    }
  });
  if(count!==poly.length) return null;
  return (ko-1)*100;
}
function getSelectedAdjustmentMonths(cid){
  try{return JSON.parse(localStorage.getItem('pol_selected_periods_'+cid)||'[]')||[];}catch(e){return [];}
}
function setSelectedAdjustmentMonths(cid, arr){
  localStorage.setItem('pol_selected_periods_'+cid, JSON.stringify(arr||[]));
}
function getReferenceMonthForTarget(cid, targetYm, baseYm){
  var selected=getSelectedAdjustmentMonths(cid).slice().sort();
  var ref=baseYm;
  selected.forEach(function(ym){ if(compareYm(ym,targetYm)<0) ref=ym; });
  return ref;
}
function getSelectedPeriodsSummaryRows(cid){
  var res=getEvaluationResult(cid,'')||getEvaluationResult(cid,null); if(!res) return [];
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract) return [];
  var baseYm=res.baseMonth;
  var selected=getSelectedAdjustmentMonths(cid).slice().sort();
  return selected.map(function(ym){
    var ref=baseYm;
    selected.forEach(function(other){ if(compareYm(other,ym)<0) ref=other; });
    return {ym:ym, refYm:ref, pct:computePoliDeltaPct(contract, ref, ym)};
  });
}
function renderSelectedPeriodsSummary(cid){
  var host=document.getElementById('selectedAdjustmentSummary_'+cid);
  if(!host) return;
  var rows=getSelectedPeriodsSummaryRows(cid);
  if(!rows.length){ host.innerHTML=''; host.style.display='none'; return; }
  host.style.display='block';
  host.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--b700);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Selección de períodos</div>'+
    rows.map(function(r){
      return '<div style="font-size:12px;color:var(--g700);margin:4px 0">• <strong>'+formatYmLabel(r.ym)+'</strong> · '+(r.pct!=null?(r.pct>=0?'+':'')+r.pct.toFixed(2)+'%':'s/d')+' sobre '+formatYmLabel(r.refYm)+'</div>';
    }).join('');
}
function generateSelectedPriceLists(cid){
  var contract=window.DB.find(function(c){return c.id==cid;});
  if(!contract){ toast('Contrato no encontrado','er'); return; }
  var rows=getSelectedPeriodsSummaryRows(cid);
  if(!rows.length){ toast('Seleccioná al menos un período','er'); return; }

  // Para OBRA: capturar scope (POs seleccionadas + remanente) antes de generar
  var obraScope=null;
  if(contract.tipo==='OBRA'){
    obraScope=getCertSelectionScope(cid);
    if(!obraScope || obraScope.totalBase<=0){
      toast('Tildá POs en el panel Certificaciones / POs (o el remanente) antes de generar','er');
      return;
    }
  }

  // NO borrar AVEs AUTO previos - permitir múltiples ajustes por período
  if(!contract.aves) contract.aves = [];
  
  // Usar montoBase guardado, o calcularlo si no existe (contratos viejos)
  var totalAves = (contract.aves||[]).reduce(function(s,a){return s+(a.monto||0);},0);
  var montoBase = contract.montoBase || ((contract.monto || 0) - totalAves);
  
  console.log('[generateSelectedPriceLists] Monto base:', montoBase.toFixed(2));
  console.log('[generateSelectedPriceLists] Total AVEs actuales:', totalAves.toFixed(2));
  
  var all=(contract.tarifarios||[]).slice();
  var created=0;
  rows.forEach(function(sel){
    var refYm=sel.refYm;
    var targetYm=sel.ym;
    var baseTables=all.filter(function(t){ return String(t.period||'')===String(refYm); });
    baseTables.forEach(function(refTar){
      if(!refTar || !refTar.rows || !refTar.rows.length) return;
      var deltaPct=computePoliDeltaPct(contract, refYm, targetYm);
      if(deltaPct==null) return;
      var factor=1+(deltaPct/100);
      var cols=(refTar.cols||[]).slice();
      var priceIdx=cols.findIndex(function(c){ return /valor\s*unitario|precio/i.test(String(c||'')); });
      if(priceIdx<0) priceIdx=cols.length-1;
      var newRows=(refTar.rows||[]).map(function(r){
        var rr=(r||[]).slice();
        var oldVal=Number(rr[priceIdx]||0);
        rr[priceIdx]=isFinite(oldVal)?(oldVal*factor):rr[priceIdx];
        return rr;
      });
      var newName=(refTar.name||'Tarifario')+' · Ajuste '+targetYm;
      var existing=all.find(function(t){ return String(t.period||'')===String(targetYm) && String(t.name||'')===String(newName) && String(t.source||'')==='POLI_SELECT'; });
      if(existing){
        existing.rows=newRows; existing.basePeriod=refYm; existing.pctApplied=deltaPct; existing.updatedAt=new Date().toISOString();
      } else {
        all.push({
          name:newName,
          cols:cols,
          rows:newRows,
          period:targetYm,
          basePeriod:refYm,
          pctApplied:deltaPct,
          source:'POLI_SELECT',
          importedAt:new Date().toISOString(),
          editable:true
        });
        created++;
      }
    });
  });
  contract.tarifarios=all;
  contract.updatedAt=new Date().toISOString();
  
  // Actualizar base tarifario a la última lista generada
  var maxPeriod=null;
  var totalPctApplied=0;
  if(rows.length){
    maxPeriod=rows.map(function(r){return r.ym;}).sort().reverse()[0];
    
    // Calcular % polinómico acumulado total desde base original hasta nueva base
    var originalBase=contract.btar||contract.fechaIni.substring(0,7);
    rows.forEach(function(r){
      var pct=r.pct||0;
      totalPctApplied+=pct;
    });
    
    console.log('[generateSelectedPriceLists] % acumulado aplicado:', totalPctApplied.toFixed(4)+'%');
    
    if(maxPeriod){
      contract.btar=maxPeriod;
      console.log('[generateSelectedPriceLists] Nueva base tarifaria:', maxPeriod);
    }
    
    // Actualizar monto del contrato aplicando el ajuste acumulado
    if(totalPctApplied!==0){
      // Usar montoBase calculado arriba (monto sin AVEs)
      
      // Calcular meses transcurridos y restantes
      var plazo=contract.plazo_meses||contract.plazo||36;
      var fechaInicio=contract.fechaInicio||contract.fechaIni||'';
      var baseMo=dateToMo(fechaInicio)||'';
      var ajusteMo=maxPeriod||baseMo;
      var mesesTranscurridos=Math.max(0,monthDiff(parseYM(baseMo),parseYM(ajusteMo)));
      var mesesRestantes=Math.max(0,plazo-mesesTranscurridos);
      
      // Calcular AVE solo sobre monto restante de la base
      var mensualBase=montoBase/plazo;
      var consumido=mensualBase*mesesTranscurridos;
      var montoRestante=montoBase-consumido;
      // Para OBRA: usar el scope capturado (POs seleccionadas + remanente) en vez del montoRestante teórico
      var baseAjuste=montoRestante;
      if(obraScope && obraScope.totalBase>0){ baseAjuste=obraScope.totalBase; }
      var incrementoMonto=Math.round(baseAjuste*(totalPctApplied/100)*100)/100;
      
      // NO modificar contract.monto - solo agregar AVE al array
      contract.montoMensualEst=Math.round(mensualBase*(1+totalPctApplied/100)*100)/100;
      
      console.log('[generateSelectedPriceLists] Base sin AVEs:', montoBase.toFixed(2));
      console.log('[generateSelectedPriceLists] AVE calculado:', incrementoMonto.toFixed(2));
      console.log('[generateSelectedPriceLists] Meses transcurridos:', mesesTranscurridos, '/ Restantes:', mesesRestantes, '/ Consumido:', consumido.toFixed(2));
      
      // Generar AVE por aplicación polinómica
      if(!contract.aves) contract.aves=[];
      var aveId=Date.now().toString(36)+Math.random().toString(36).substr(2,4);
      var scopeForAve = obraScope ? {
        pos: obraScope.pos.map(function(r){return r.po;}),
        includeRemanente: obraScope.includeRemanente,
        totalBase: obraScope.totalBase
      } : null;
      contract.aves.push({
        id:aveId,
        tipo:'POLINOMICA',
        subtipo:'AUTO_ADJUST',
        concepto:'Ajuste polinómico acumulado '+totalPctApplied.toFixed(2)+'% aplicado en generación de listas hasta '+formatYmLabel(maxPeriod)+(obraScope?(' · scope: '+obraScope.pos.length+' PO'+(obraScope.pos.length!==1?'s':'')+(obraScope.includeRemanente?' + remanente':'')):''),
        monto:Math.round(incrementoMonto*100)/100,
        pct:totalPctApplied,
        mesesTranscurridos:mesesTranscurridos,
        mesesRestantes:mesesRestantes,
        montoRestante:montoRestante,
        baseContract:montoBase,
        baseAjuste:baseAjuste,
        scope:scopeForAve,
        periodo:maxPeriod,
        autoGenerated:true,
        fecha:new Date().toISOString()
      });

      // Marcar POs como ajustadas (OBRA)
      if(obraScope && obraScope.pos.length){
        if(!contract.posAjustadas) contract.posAjustadas=[];
        if(!contract.posAjustadasMeta) contract.posAjustadasMeta={};
        obraScope.pos.forEach(function(r){
          if(contract.posAjustadas.indexOf(r.po)<0) contract.posAjustadas.push(r.po);
          contract.posAjustadasMeta[r.po]={ym:maxPeriod, enm:(contract.enmiendas||[]).length+1, pct:totalPctApplied, nov:r.nov};
        });
      }

      console.log('[generateSelectedPriceLists] AVE generado:', incrementoMonto.toFixed(2), contract.mon||'USD');

      // Registrar enmienda asociada al ajuste polinómico
      if(!contract.enmiendas) contract.enmiendas=[];
      var basePerEnm=contract.btar_prev||rows[0]?.refYm||contract.fechaIni||'';
      // recuperar btar previa antes de la sobreescritura: rows[0].refYm es la base de comparación
      var prevBase=rows.length?rows[0].refYm:basePerEnm;
      var enmNum=(contract.enmiendas.length)+1;
      var newEnm={
        num:enmNum,
        tipo:'ACTUALIZACION_TARIFAS',
        fecha:new Date().toISOString(),
        motivo:'Actualización por fórmula polinómica · '+totalPctApplied.toFixed(2)+'%'+(obraScope?(' · scope OBRA: '+obraScope.pos.length+' PO'+(obraScope.pos.length!==1?'s':'')+(obraScope.includeRemanente?' + remanente':'')):''),
        descripcion:'Ajuste acumulado '+totalPctApplied.toFixed(2)+'% sobre base '+formatYmLabel(prevBase)+' → '+formatYmLabel(maxPeriod)+(obraScope?(' · base ajuste: '+(contract.mon||'ARS')+' '+fN(baseAjuste)):''),
        pctPoli:totalPctApplied/100,
        basePeriodo:prevBase,
        nuevoPeriodo:maxPeriod,
        ko:1+(totalPctApplied/100),
        aveRef:aveId,
        monto:Math.round(incrementoMonto*100)/100,
        scope:scopeForAve,
        autoGenerated:true
      };
      contract.enmiendas.push(newEnm);
      console.log('[generateSelectedPriceLists] ✓ Enmienda N°'+enmNum+' registrada · Ko='+newEnm.ko.toFixed(4));
    }
  }
  
  // Limpiar evaluación polinómica y scope OBRA para forzar recálculo desde nueva base
  localStorage.removeItem('pol_eval_result_'+cid);
  localStorage.removeItem('pol_selected_months_'+cid);
  if(typeof clearStoredScopeSelection==='function') clearStoredScopeSelection(cid);
  console.log('[generateSelectedPriceLists] Evaluación limpiada. Recalcular desde', contract.btar);
  
  // Actualizar contrato en window.DB array
  var idx = window.DB.findIndex(function(c){return c.id === cid;});
  if(idx !== -1) window.DB[idx] = contract;

  // Persistir SIEMPRE en localStorage como fallback
  try{ localStorage.setItem('cta_v7', JSON.stringify(window.DB)); }catch(_e){}
  save();
  if(typeof window.detId!=='undefined') window.detId=cid;
  if(typeof renderDet==='function') renderDet();
  setTimeout(function(){ renderSelectedPeriodsSummary(cid); }, 50);
  var enmCount=(contract.enmiendas||[]).length;
  var lastEnm=enmCount?contract.enmiendas[enmCount-1]:null;
  var msg=(created||rows.length)+' lista(s) generada(s)' + (lastEnm&&lastEnm.autoGenerated?' · ✓ Enmienda N°'+lastEnm.num+' registrada':'');
  toast(msg,'ok');
}
function toggleAdjustmentMonthSelection(cid, ym, checked){
  var arr=getSelectedAdjustmentMonths(cid).slice();
  var pos=arr.indexOf(ym);
  if(checked){ if(pos===-1) arr.push(ym); }
  else if(pos>=0){ arr.splice(pos,1); }
  arr.sort();
  setSelectedAdjustmentMonths(cid, arr);
  renderEligibleMonthsModal(cid);
}
function clearAdjustmentMonthSelection(cid){
  setSelectedAdjustmentMonths(cid, []);
  renderEligibleMonthsModal(cid);
  renderSelectedPeriodsSummary(cid);
}
function closeEligibleMonthsModal(){
  var m=document.getElementById('eligibleMonthsModal');
  if(m) m.remove();
}
function finishEligibleMonthsSelection(cid){
  closeEligibleMonthsModal();
  renderSelectedPeriodsSummary(cid);
  var rows=getSelectedPeriodsSummaryRows(cid);
  if(rows.length){ toast('Períodos elegidos: '+rows.map(function(r){return formatYmLabel(r.ym);}).join(', '),'ok'); }
  else { toast('No hay períodos seleccionados','ok'); }
}
function renderEligibleMonthsModal(cid){
  var old=document.getElementById('eligibleMonthsModal');
  if(old) old.remove();
  var res=getEvaluationResult(cid,'') || getEvaluationResult(cid,null);
  if(!res) return;
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract) return;
  var months=(res.eligibleMonths||[]).slice();
  var selected=getSelectedAdjustmentMonths(cid).slice().sort();
  var chips='';
  months.forEach(function(m){
    var ym=m.ym||m;
    var checked=selected.indexOf(ym)>=0;
    var refYm=getReferenceMonthForTarget(cid, ym, res.baseMonth);
    var deltaPct=computePoliDeltaPct(contract, refYm, ym);
    chips += '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid '+(checked?'var(--g600)':'var(--g300)')+';border-radius:10px;background:'+(checked?'var(--g100d)':'var(--w)')+'">'+
      '<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleAdjustmentMonthSelection(\''+cid+'\',\''+ym+'\',this.checked)">'+
      '<span style="font-size:13px;font-weight:600;color:var(--g800)">'+formatYmLabel(ym)+'</span>'+
      (deltaPct!=null?'<span style="margin-left:auto;font-size:12px;color:var(--g600c)">'+(deltaPct>=0?'+':'')+Number(deltaPct).toFixed(2)+'%</span>':'<span style="margin-left:auto;font-size:12px;color:var(--g500)">s/d</span>')+
      '<span style="margin-left:6px;font-size:11px;color:var(--g500)">sobre '+formatYmLabel(refYm)+'</span>'+
    '</label>';
  });
  var selectedRows=getSelectedPeriodsSummaryRows(cid);
  var selectedText=selectedRows.length?selectedRows.map(function(r){return formatYmLabel(r.ym)+' ('+(r.pct!=null?(r.pct>=0?'+':'')+r.pct.toFixed(2)+'%':'s/d')+' sobre '+formatYmLabel(r.refYm)+')';}).join(' · '):'ninguno';

  // Scope para OBRA: POs seleccionadas + remanente. Para SERVICIO: monto remanente del contrato.
  var scopeBlock='';
  var poSelectorBlock='';
  var moneda=contract.mon||'ARS';
  if(contract.tipo==='OBRA'){
    var sc=getCertSelectionScope(cid);
    // Selector de POs dentro del modal (sincroniza con panel principal vía .cert-check)
    var poData=ME2N[contract.num];
    var pos=(poData&&Array.isArray(poData)&&Array.isArray(poData[2]))?poData[2]:[];
    var aves=contract.aves||[];
    var avePoly=aves.filter(function(a){return a.tipo==='POLINOMICA';}).reduce(function(s,a){return s+(a.monto||0);},0);
    var aveOwner=aves.filter(function(a){return a.tipo==='OWNER';}).reduce(function(s,a){return s+(a.monto||0);},0);
    var montoBase=contract.montoBase||((contract.monto||0)-avePoly-aveOwner);
    var totalCerts=pos.reduce(function(s,p){return s+(p[3]||0);},0);
    var remanente=Math.max(0,montoBase-totalCerts);
    var selectedPosSet={}; (sc?sc.pos:[]).forEach(function(r){selectedPosSet[r.po]=true;});
    var allChecked=pos.length>0 && pos.every(function(p){return selectedPosSet[p[0]||''];});
    var rowsHtml=pos.length?pos.map(function(p){
      var poNum=p[0]||'—';
      var plant=p[2]||'—';
      var nov=p[3]||0;
      var ajustado=contract.posAjustadas&&contract.posAjustadas.indexOf(poNum)>=0;
      var meta=ajustado&&contract.posAjustadasMeta?contract.posAjustadasMeta[poNum]:null;
      var checkedAttr=selectedPosSet[poNum]?'checked':'';
      var ajLbl=ajustado?'<span class="bdg" style="background:#16a34a;color:#fff;font-size:9px;margin-left:6px" title="'+(meta?'Ajustada en '+esc(meta.ym||'')+' · Enm.'+esc(String(meta.enm||'')):'Ya ajustada')+'">✓ '+(meta?esc(meta.ym||''):'')+'</span>':'';
      return '<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--g200);border-radius:6px;background:#fff;font-size:12px">'+
        '<input type="checkbox" '+checkedAttr+' onchange="togglePoFromModal(\''+cid+'\',\''+esc(poNum)+'\',this.checked)">'+
        '<span class="mono" style="font-weight:600;min-width:110px">'+esc(poNum)+'</span>'+
        '<span style="color:var(--g500);min-width:80px;font-size:11px">'+esc(plant)+'</span>'+
        '<span class="mono" style="margin-left:auto;font-weight:700">'+moneda+' '+fN(nov)+'</span>'+
        ajLbl+
      '</label>';
    }).join(''):'<div style="padding:14px;text-align:center;color:var(--g500);font-style:italic;font-size:12px">Sin POs asociadas a este contrato</div>';
    var remCheckedAttr=(sc&&sc.includeRemanente)?'checked':'';
    var allCheckedAttr=allChecked?'checked':'';
    poSelectorBlock='<div style="margin-top:14px;padding:14px;border-radius:8px;border:1px solid var(--g300);background:var(--g50)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
        '<div style="font-weight:700;font-size:13px;color:var(--g800)">📋 Scope OBRA — Tildá las POs a ajustar</div>'+
        '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--g600c);cursor:pointer">'+
          '<input type="checkbox" '+allCheckedAttr+' onchange="toggleAllPosFromModal(\''+cid+'\',this.checked)"> Todas'+
        '</label>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:6px;max-height:220px;overflow:auto;padding:2px">'+rowsHtml+'</div>'+
      '<label style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px;color:var(--g700);padding:8px 10px;background:#fff;border:1px solid var(--g200);border-radius:6px">'+
        '<input type="checkbox" '+remCheckedAttr+' onchange="toggleRemanenteFromModal(\''+cid+'\',this.checked)">'+
        '<span>Incluir remanente sin certificar (<strong>'+moneda+' '+fN(remanente)+'</strong>)</span>'+
      '</label>'+
    '</div>';
    if(sc){
      var maxPct=null;
      selectedRows.forEach(function(r){ if(r.pct!=null){ if(maxPct==null||r.pct>maxPct) maxPct=r.pct; } });
      var pctApplied=maxPct!=null?maxPct:0;
      var increment=sc.totalBase*(pctApplied/100);
      var posTxt=sc.pos.length?(sc.pos.length+' PO'+(sc.pos.length!==1?'s':'')):'ninguna PO';
      var remanenteTxt=sc.includeRemanente?(' + remanente '+moneda+' '+fN(sc.remanente)):'';
      var warn=sc.totalBase<=0?'<div style="margin-top:8px;padding:8px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#991b1b;font-size:12px">⚠️ Tildá POs arriba o el remanente para definir el scope antes de generar las listas.</div>':'';
      scopeBlock='<div style="margin-top:14px;padding:12px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;font-size:12px;color:#78350f">'+
        '<div style="font-weight:700;margin-bottom:6px">🔧 Scope del ajuste (OBRA)</div>'+
        '<div style="line-height:1.7"><strong>Selección:</strong> '+posTxt+remanenteTxt+'</div>'+
        '<div style="line-height:1.7"><strong>Monto base:</strong> <span style="font-family:JetBrains Mono,monospace;font-weight:700">'+moneda+' '+fN(sc.totalBase)+'</span> '+(pctApplied?'· <strong>Ajuste:</strong> '+pctApplied.toFixed(2)+'% = <span style="font-family:JetBrains Mono,monospace;font-weight:700;color:#15803d">+'+moneda+' '+fN(increment)+'</span>':'')+'</div>'+
        warn+
      '</div>';
    }
  } else {
    // SERVICIO: scope = monto remanente del contrato (consumido vs tot)
    try{
      var consumed2=(typeof getConsumed==='function')?getConsumed(contract.num):null;
      var aves2=contract.aves||[];
      var avePoly2=aves2.filter(function(a){return a.tipo==='POLINOMICA';}).reduce(function(s,a){return s+(a.monto||0);},0);
      var aveOwner2=aves2.filter(function(a){return a.tipo==='OWNER';}).reduce(function(s,a){return s+(a.monto||0);},0);
      var montoBase2=contract.montoBase||((contract.monto||0)-avePoly2-aveOwner2);
      var tot2=montoBase2+avePoly2+aveOwner2;
      var rem2=consumed2!=null?Math.max(0,tot2-consumed2):tot2;
      var maxPct2=null; selectedRows.forEach(function(r){ if(r.pct!=null){ if(maxPct2==null||r.pct>maxPct2) maxPct2=r.pct; } });
      var pctApplied2=maxPct2!=null?maxPct2:0;
      var increment2=rem2*(pctApplied2/100);
      scopeBlock='<div style="margin-top:14px;padding:12px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;font-size:12px;color:#78350f">'+
        '<div style="font-weight:700;margin-bottom:6px">🔧 Scope del ajuste (SERVICIO)</div>'+
        '<div style="line-height:1.7"><strong>Monto base:</strong> remanente del contrato (TV total − consumido) = <span style="font-family:JetBrains Mono,monospace;font-weight:700">'+moneda+' '+fN(rem2)+'</span></div>'+
        (pctApplied2?'<div style="line-height:1.7"><strong>Ajuste a aplicar:</strong> '+pctApplied2.toFixed(2)+'% = <span style="font-family:JetBrains Mono,monospace;font-weight:700;color:#15803d">+'+moneda+' '+fN(increment2)+'</span></div>':'')+
      '</div>';
    }catch(_e){}
  }

  var modal=document.createElement('div');
  modal.id='eligibleMonthsModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9500;display:flex;align-items:center;justify-content:center;padding:18px';
  modal.innerHTML='<div style="background:#fff;border-radius:14px;max-width:960px;width:96%;box-shadow:var(--shm);padding:22px 22px 18px 22px;max-height:90vh;overflow:auto">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">'+
      '<div><div style="font-size:16px;font-weight:800;color:var(--g900)">📆 Períodos con ajuste aplicable</div><div style="font-size:12px;color:var(--g600c);margin-top:4px">Si seleccionás un período, los porcentajes de los períodos posteriores se recalculan sobre ese período y no sobre la base original.</div></div>'+
      '<button class="btn btn-s btn-sm" onclick="closeEligibleMonthsModal()">✖ Cerrar</button>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;max-height:360px;overflow:auto;padding:4px 2px">'+chips+'</div>'+
    '<div style="margin-top:14px;padding:12px;border-radius:8px;background:var(--b50);border:1px solid var(--b200);font-size:12px;color:var(--g700)"><strong>Seleccionados:</strong> '+selectedText+'</div>'+
    poSelectorBlock+
    scopeBlock+
    '<div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px">'+
      '<button class="btn btn-s btn-sm" onclick="clearAdjustmentMonthSelection(\''+cid+'\')">🧹 Limpiar</button>'+
      '<button class="btn btn-p btn-sm" onclick="finishEligibleMonthsSelection(\''+cid+'\')">Listo</button>'+
    '</div>'+
  '</div>';
  document.body.appendChild(modal);
}

// Toggle handlers del scope OBRA dentro del modal — actualizan localStorage y re-renderean
function togglePoFromModal(cid, poNum, checked){
  var sel=getStoredScopeSelection(cid);
  var pos=(sel.pos||[]).slice();
  var i=pos.indexOf(poNum);
  if(checked){ if(i<0) pos.push(poNum); }
  else if(i>=0){ pos.splice(i,1); }
  setStoredScopeSelection(cid, {pos:pos, includeRemanente:!!sel.includeRemanente});
  renderEligibleMonthsModal(cid);
}
function toggleAllPosFromModal(cid, checked){
  var c=window.DB.find(function(x){return x.id===cid;}); if(!c) return;
  var poData=ME2N[c.num];
  var pos=(poData&&Array.isArray(poData)&&Array.isArray(poData[2]))?poData[2]:[];
  var sel=getStoredScopeSelection(cid);
  var allPos=checked?pos.map(function(p){return p[0]||'';}).filter(Boolean):[];
  setStoredScopeSelection(cid, {pos:allPos, includeRemanente:!!sel.includeRemanente});
  renderEligibleMonthsModal(cid);
}
function toggleRemanenteFromModal(cid, checked){
  var sel=getStoredScopeSelection(cid);
  setStoredScopeSelection(cid, {pos:(sel.pos||[]).slice(), includeRemanente:!!checked});
  renderEligibleMonthsModal(cid);
}
function openEligibleMonthsModal(cid){
  renderEligibleMonthsModal(cid);
}

function monthsBetween(d1,d2){
  var start=new Date(d1+'T00:00:00');
  var end=new Date(d2+'T00:00:00');
  return(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
}

function openConditionsModal(cid){
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract)return;
  var conditions=PolUpdate.getConditions(cid)||{enabled:false,moThreshold:0,allComponentsThreshold:0,monthsElapsed:0,baseDate:contract.fechaIni,lastUpdateDate:null,resetBase:false};
  var modal=document.createElement('div'); modal.id='conditionsModal';
  modal.style.cssText='display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;align-items:center;justify-content:center';
  modal.innerHTML='<div style="background:#fff;border-radius:12px;padding:28px;max-width:560px;width:92%;box-shadow:var(--shm)">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:20px">Configurar Condiciones de Actualización</h3>'+
    '<div class="fg fg2" style="margin-bottom:20px">'+
      '<div class="fgrp c2"><label><input type="checkbox" id="condEnabled" '+(conditions.enabled?'checked':'')+' style="width:auto;margin-right:6px"> Habilitar actualización automática</label></div>'+
      '<div class="fgrp"><label>MO mínimo (%)</label><input type="number" id="condMo" value="'+(conditions.moThreshold||0)+'" step="0.1"></div>'+
      '<div class="fgrp"><label>Todos componentes (%)</label><input type="number" id="condAll" value="'+(conditions.allComponentsThreshold||0)+'" step="0.1"></div>'+
      '<div class="fgrp"><label>Meses transcurridos</label><input type="number" id="condMonths" value="'+(conditions.monthsElapsed||0)+'"></div>'+
      '<div class="fgrp"><label>Fecha base</label><input type="date" id="condBase" value="'+(conditions.baseDate||contract.fechaIni)+'"></div>'+
      '<div class="fgrp c2"><label><input type="checkbox" id="condReset" '+(conditions.resetBase?'checked':'')+' style="width:auto;margin-right:6px"> Resetear base tras actualización</label></div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end">'+
      '<button class="btn btn-s" onclick="closeConditionsModal()">Cancelar</button>'+
      '<button class="btn btn-p" onclick="saveConditionsModal('+cid+')">Guardar</button>'+
    '</div></div>';
  document.body.appendChild(modal);
}

function closeConditionsModal(){ var m=document.getElementById('conditionsModal'); if(m)m.remove(); }

function saveConditionsModal(cid){
  var data={
    enabled:document.getElementById('condEnabled').checked,
    moThreshold:parseFloat(document.getElementById('condMo').value)||0,
    allComponentsThreshold:parseFloat(document.getElementById('condAll').value)||0,
    monthsElapsed:parseInt(document.getElementById('condMonths').value)||0,
    baseDate:document.getElementById('condBase').value,
    resetBase:document.getElementById('condReset').checked,
    lastUpdateDate:(PolUpdate.getConditions(cid)||{}).lastUpdateDate||null
  };
  PolUpdate.saveConditions(cid,data); closeConditionsModal(); verDet(cid); toast('Condiciones guardadas','ok');
}

function previewUpdate(cid){
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract)return;
  var calc=PolUpdate.calculateUpdate(contract); if(!calc)return;
  var modal=document.createElement('div'); modal.id='updatePreviewModal';
  modal.style.cssText='display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;align-items:center;justify-content:center';
  var pricesTable='<table style="width:100%;font-size:11px;margin:12px 0"><thead><tr style="background:var(--g100)"><th style="padding:6px;text-align:left">Item</th><th style="padding:6px;text-align:right">Anterior</th><th style="padding:6px;text-align:right">Nuevo</th><th style="padding:6px;text-align:right">Var%</th></tr></thead><tbody>';
  calc.updatedPrices.forEach(function(p){
    pricesTable+='<tr><td style="padding:6px">'+esc(p.description)+'</td>'+
      '<td style="padding:6px;text-align:right">'+fN(p.old_price)+'</td>'+
      '<td style="padding:6px;text-align:right;font-weight:700">'+fN(p.unit_price)+'</td>'+
      '<td style="padding:6px;text-align:right;color:'+(p.variation>=0?'var(--g600)':'var(--r500)')+'">'+p.variation.toFixed(2)+'%</td></tr>';
  });
  pricesTable+='</tbody></table>';
  modal.innerHTML='<div style="background:#fff;border-radius:12px;padding:28px;max-width:700px;width:92%;max-height:85vh;overflow-y:auto;box-shadow:var(--shm)">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:16px">Vista Previa: Actualización Polinómica</h3>'+
    '<div style="background:var(--p50);padding:14px;border-radius:8px;margin-bottom:16px;font-size:13px">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div><strong>Ko aplicado:</strong> '+calc.Ko.toFixed(4)+'</div>'+
        '<div><strong>Meses restantes:</strong> '+calc.monthsRemaining+'</div>'+
        '<div><strong>Mensual anterior:</strong> '+fN(calc.oldMonthlyEstimate)+'</div>'+
        '<div><strong>Mensual nuevo:</strong> '+fN(calc.newMonthlyEstimate)+'</div>'+
      '</div></div>'+
    '<div style="background:var(--a100);padding:14px;border-radius:8px;margin-bottom:16px;text-align:center">'+
      '<div style="font-size:12px;color:#92400e;font-weight:600;margin-bottom:4px">AVE GENERADO</div>'+
      '<div style="font-size:24px;font-weight:800;color:#92400e">'+fN(calc.aveAmount)+'</div></div>'+
    '<details style="margin-bottom:16px"><summary style="cursor:pointer;font-weight:600;font-size:12px;margin-bottom:8px">Ver detalle de precios</summary>'+pricesTable+'</details>'+
    '<div style="background:var(--p50);padding:10px 12px;border-radius:6px;margin-bottom:14px;font-size:11.5px;color:var(--p800);border:1px solid var(--p200)">ℹ️ Al aplicar la actualización se registrará automáticamente una nueva enmienda en el listado y se abrirá el documento para imprimir/PDF.</div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end">'+
      '<button class="btn btn-s" onclick="closeUpdatePreview()">Cancelar</button>'+
      '<button class="btn btn-a" onclick="confirmApplyUpdate(\''+cid+'\')">✓ Aplicar actualización y generar enmienda</button>'+
    '</div></div>';
  document.body.appendChild(modal);
}

function closeUpdatePreview(){ var m=document.getElementById('updatePreviewModal'); if(m)m.remove(); }
async function confirmApplyUpdate(cid){
  if(!confirm('¿Confirmar actualización? Se generará enmienda, lista de precios y AVE'))return;
  closeUpdatePreview();
  try{ await PolUpdate.applyUpdate(); }catch(e){ console.error('confirmApplyUpdate', e); toast('Error al aplicar: '+(e.message||e),'er'); return; }
  if(cid) setTimeout(function(){ openAmendmentDoc(cid); },500);
}

function openAmendmentDoc(cid, enmNum){
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract){toast('Contrato no encontrado','er');return;}
  if(!(contract.enmiendas||[]).length){ toast('No hay enmiendas registradas. Aplicá una actualización primero o creá una con "+ Nueva Enmienda".','er'); return; }
  var w=window.open('','_blank'); if(!w){toast('Bloqueador de pop-ups activo','er');return;}
  w.document.open(); w.document.write(renderAmendmentHtml(contract, enmNum, {forPrint:true})); w.document.close();
}

// Descargar enmienda como .doc (HTML compatible con Word) — editable en Word/Google Docs
function downloadAmendmentDoc(cid, enmNum){
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract){toast('Contrato no encontrado','er');return;}
  if(!(contract.enmiendas||[]).length){ toast('No hay enmiendas registradas','er'); return; }
  var bodyHtml=renderAmendmentHtml(contract, enmNum, {forPrint:false, forWord:true});
  // Word reconoce HTML con headers MS Office
  var wordHtml='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'+
    '<head><meta charset="utf-8"><title>Enmienda</title>'+
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->'+
    '<style>@page{size:A4;margin:2cm 1.8cm}body{font-family:"Times New Roman",serif;font-size:11pt;line-height:1.5}'+
    'p{margin:0 0 8pt 0;text-align:justify}table{border-collapse:collapse;width:100%;margin:8pt 0 12pt}'+
    'th{background:#1b3f6e;color:#fff;padding:5pt 7pt;font-size:9.5pt;text-align:left;border:1px solid #1b3f6e}'+
    'td{padding:4pt 7pt;font-size:9.5pt;border:1px solid #d0d4d9}.tot td{background:#eef2f7;font-weight:700}'+
    '.section-title{font-weight:700;text-decoration:underline;margin:14pt 0 8pt}'+
    '.center{text-align:center}.right{text-align:right}.num{text-align:right}'+
    '.period-title{font-weight:700;color:#1b3f6e;margin:14pt 0 6pt;text-transform:uppercase}'+
    '.pageBreak{page-break-before:always;mso-special-character:line-break}'+
    '</style></head><body>'+bodyHtml+'</body></html>';
  var blob=new Blob(['﻿', wordHtml], {type:'application/msword'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url;
  var fname='Enmienda_'+(enmNum||'última')+'_'+(contract.num||'contrato').replace(/[^A-Za-z0-9_-]/g,'_')+'.doc';
  a.download=fname; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  toast('Documento .doc descargado: '+fname,'ok');
}

function renderAmendmentHtml(contract, targetEnmNum, opts){
  opts=opts||{};
  var forWord=!!opts.forWord;
  var enms=contract.enmiendas||[];
  var lastEnm=(targetEnmNum!=null?enms.find(function(e){return e.num===targetEnmNum;}):null)||enms[enms.length-1]||{};
  var enmNum=lastEnm.num||enms.length||1;
  var cid=contract.id;
  var res=getEvaluationResult(cid,'')||getEvaluationResult(cid,null)||{};
  var basePeriod=lastEnm.basePeriodo||(res.baseMonth)||contract.btar||contract.fechaIni||'';
  var newPeriod=lastEnm.nuevoPeriodo||'';
  var Ko=lastEnm.ko||1;
  var pctKo=((Ko-1)*100);

  // Períodos seleccionados para tablas (o solo el último si no hay selección)
  var selPeriods=getSelectedAdjustmentMonths(cid).sort();
  if(!selPeriods.length && newPeriod) selPeriods=[newPeriod];

  // Tarifarios del contrato
  var tars=contract.tarifarios||[];
  var baseTar=tars.find(function(t){return t.period===contract.btar;})||tars[0]||null;

  var today=new Date();
  var meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var dateStr='Neuquén, '+today.getDate()+' de '+meses[today.getMonth()]+' de '+today.getFullYear();
  var fmtM=function(ym){ if(!ym) return ''; var p=String(ym).substring(0,7).split('-'); if(p.length<2) return ym; return meses[parseInt(p[1],10)-1]+' de '+p[0]; };
  var fmtMShort=function(ym){ if(!ym) return ''; var p=String(ym).substring(0,7).split('-'); if(p.length<2) return ym; return meses[parseInt(p[1],10)-1].substring(0,3)+'-'+p[0].substring(2); };

  // Generar bloques de tablas por período
  var periodBlocks='';
  selPeriods.forEach(function(periodYm){
    var dPct=computePoliDeltaPct(contract,basePeriod,periodYm);
    var koP=dPct!=null?(1+dPct/100):Ko;
    var pctP=((koP-1)*100).toFixed(2);
    var label=fmtM(periodYm);
    var shortLbl=fmtMShort(periodYm);

    // Tablas de precios para este período — TODAS las que tengan period === periodYm
    var tableHtml='';
    var periodTables=tars.filter(function(t){ return String(t.period||'')===String(periodYm); });
    function _renderOneTab(tab, koUse, lblShort){
      var cols=(tab.cols||[]).slice();
      var rowsArr=tab.rows||[];
      if(!rowsArr.length) return '';
      var priceColIdx=cols.findIndex(function(c){ return /precio|valor\s*unitario|tarifa|importe|mensual/i.test(String(c||'')); });
      if(priceColIdx<0) priceColIdx=cols.length-1;
      var alreadyAdjusted=(tab.source==='POLI_SELECT'||tab.source==='POLINOMICA');
      var thead='<tr>';
      cols.forEach(function(col,i){
        var isPrice=(i===priceColIdx);
        thead+='<th style="background:#1b3f6e;color:#fff;padding:5pt 7pt;font-size:9.5pt;font-weight:700;text-align:'+(isPrice?'right':'left')+';border:1px solid #1b3f6e">'+esc(String(col||''))+(isPrice&&lblShort?' '+lblShort:'')+'</th>';
      });
      thead+='</tr>';
      var tbody='';
      var total=0;
      rowsArr.forEach(function(row){
        tbody+='<tr>';
        cols.forEach(function(col,i){
          var cell=(row||[])[i];
          var val=cell;
          if(i===priceColIdx){
            var num=parseFloat(cell)||0;
            var newVal=alreadyAdjusted?num:(num*(koUse||1));
            total+=newVal;
            val='$ '+newVal.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
          } else {
            val=esc(String(cell==null?'':cell));
          }
          tbody+='<td style="padding:4pt 7pt;font-size:9.5pt;border:1px solid #d0d4d9;text-align:'+(i===priceColIdx?'right':'left')+'">'+val+'</td>';
        });
        tbody+='</tr>';
      });
      var totalRow='<tr><td colspan="'+(cols.length-1)+'" style="padding:5pt 7pt;font-size:9.5pt;font-weight:700;text-align:right;background:#eef2f7;border:1px solid #d0d4d9">TOTAL</td><td style="padding:5pt 7pt;font-size:9.5pt;font-weight:700;text-align:right;background:#eef2f7;border:1px solid #d0d4d9">$ '+total.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td></tr>';
      return '<table style="width:100%;border-collapse:collapse;margin:8pt 0 14pt"><thead>'+thead+'</thead><tbody>'+tbody+totalRow+'</tbody></table>';
    }
    if(periodTables.length){
      periodTables.forEach(function(tab){
        tableHtml+='<div style="margin-bottom:8pt"><div style="font-size:10pt;font-weight:600;color:#334155;margin-bottom:4pt">'+esc(tab.name||'Tabla')+'</div>'+_renderOneTab(tab, koP, shortLbl)+'</div>';
      });
    } else if(baseTar&&baseTar.rows&&baseTar.rows.length){
      tableHtml=_renderOneTab(baseTar, koP, shortLbl);
    } else {
      // Sin tarifario: tabla simple con Ko
      tableHtml='<table style="width:100%;border-collapse:collapse;margin-bottom:12px"><thead><tr style="background:#1b3f6e;color:#fff"><th style="padding:5px 8px;font-size:10px">Concepto</th><th style="padding:5px 8px;font-size:10px;text-align:right">Ko</th><th style="padding:5px 8px;font-size:10px;text-align:right">Var.</th></tr></thead><tbody><tr><td style="padding:5px 8px;font-size:11px">Actualización polinómica ('+label+')</td><td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:700">'+koP.toFixed(4)+'</td><td style="padding:5px 8px;font-size:11px;text-align:right;color:'+( pctP>=0?'#16a34a':'#dc2626')+'">'+(pctP>=0?'+':'')+pctP+'%</td></tr></tbody></table>';
    }

    periodBlocks+='<div style="margin-bottom:18px"><div style="font-size:11px;font-weight:700;color:#1b3f6e;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">'+label.toUpperCase()+' — Ko: '+koP.toFixed(4)+' (+'+pctP+'%)</div>'+tableHtml+'</div>';
  });

  // Objeto: texto de períodos
  var periodosTexto=selPeriods.map(function(p,i){ return '<strong>'+fmtM(p)+'</strong>'+(i<selPeriods.length-1?' y ':''); }).join('');

  var polyFormula=contract.poly&&contract.poly.length?'Ko = '+contract.poly.map(function(p){return p.idx+' × '+(p.inc*100).toFixed(1)+'%';}).join(' + '):'Fórmula polinómica contractual';

  // Construir cuerpo (común a HTML print y Word .doc)
  var bodyHtml=
    // PÁGINA 1 — CARÁTULA / CARTA
    '<div class="page">'+
      '<p style="text-align:right">'+dateStr+'</p>'+
      '<br><p>Señores<br><strong>TOTAL AUSTRAL S.A</strong><br>Moreno 877, Piso 15,<br>Buenos Aires (C1091AAQ)<br>República Argentina</p>'+
      '<br><div class="ref-line"><strong>At:</strong>&nbsp;<span>'+esc(contract.resp||'Responsable del Contrato')+'</span></div>'+
      '<div class="ref-line"><strong>Ref.:</strong>&nbsp;<span>Propuesta de Enmienda N°'+enmNum+' a la OFERTA N.°&nbsp;'+esc(contract.num)+' '+esc(contract.det||contract.cont||'')+'.</span></div>'+
      '<br><p>De mi mayor consideración:</p>'+
      '<p>Me dirijo a TOTAL AUSTRAL S.A. (la &ldquo;COMPAÑÍA&rdquo;) en mi carácter de apoderado de <strong>'+esc(contract.cont||'EL CONTRATISTA')+'</strong> a los fines de efectuar la siguiente propuesta de Enmienda N°'+enmNum+' al '+esc(contract.det||'servicio contratado')+' (la &ldquo;PROPUESTA&rdquo;).</p>'+
      '<div class="center" style="margin-top:42pt;text-align:center">'+
        '<p style="font-weight:700;font-size:13pt;text-align:center">PROPUESTA DE ENMIENDA N°'+enmNum+'</p>'+
        '<p style="text-align:center">a la OFERTA N.° '+esc(contract.num)+'</p>'+
        '<p style="font-weight:700;text-transform:uppercase;margin-top:10pt;text-align:center">'+esc((contract.det||contract.cont||'').toUpperCase())+'</p>'+
        '<p style="margin-top:14pt;text-align:center">entre</p>'+
        '<p style="font-weight:700;margin-top:10pt;text-align:center">TOTAL AUSTRAL S.A.</p>'+
        '<p style="margin-top:6pt;text-align:center">y</p>'+
        '<p style="font-weight:700;margin-top:10pt;text-align:center">'+esc(contract.cont||'EL CONTRATISTA')+'</p>'+
      '</div>'+
    '</div>'+
    (forWord?'<br clear=all style="page-break-before:always">':'')+
    // PÁGINA 2+ — CUERPO
    '<div class="page">'+
      '<p class="section-title">1. OBJETO</p>'+
      '<p>Por la presente Enmienda a las Condiciones Particulares y en uso del Artículo 2 &ldquo;Definiciones&rdquo; de las Condiciones Generales de la OFERTA N.°&nbsp;'+esc(contract.num)+' las Partes acuerdan lo que a continuación se detalla:</p>'+
      '<p style="margin-left:20pt">1.1&nbsp;&nbsp;Establecer las tarifas para el mes de '+periodosTexto+' en adelante.</p>'+
      '<p style="margin-left:20pt;font-size:9.5pt;color:#555;margin-top:6pt">Fórmula aplicada: <em>'+esc(polyFormula)+'</em></p>'+
      '<p class="section-title">2. PRECIO</p>'+
      '<p>Se establecen las nuevas tarifas para aplicar a partir del <strong>01 de '+fmtM(selPeriods[0]||newPeriod)+'</strong>:</p>'+
      periodBlocks+
      '<p class="section-title">3. GENERAL</p>'+
      '<p>Las restantes condiciones de la OFERTA permanecen vigentes e inalterables.</p>'+
      '<p>La presente PROPUESTA será considerada <u>aceptada</u> por la COMPAÑÍA <u>con la continuidad</u> en la demanda del servicio y/o <u>con el ingreso</u> de equipos y/o personal del OFERENTE a <u>las instalaciones</u> de la COMPAÑÍA.</p>'+
      '<p style="margin-top:14pt">Atentamente,</p>'+
      '<div class="firma" style="margin-top:30pt">'+
        '<p style="font-weight:700">POR '+esc((contract.cont||'EL CONTRATISTA').toUpperCase())+'</p>'+
        '<p>Firma:&nbsp;&nbsp;&nbsp;&nbsp;___________________________</p>'+
        '<p>Nombre:&nbsp;___________________________</p>'+
        '<p>Cargo:&nbsp;&nbsp;&nbsp;&nbsp;___________________________</p>'+
      '</div>'+
    '</div>';

  if(forWord){
    // Sólo el body — el caller envuelve con headers MS Office
    return bodyHtml;
  }

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Enmienda N°'+enmNum+' — '+contract.num+'</title>'+
  '<style>*{box-sizing:border-box;margin:0;padding:0}'+
  'body{font-family:"Times New Roman",serif;font-size:11pt;color:#000;background:#fff;line-height:1.5}'+
  '.page{width:210mm;min-height:297mm;margin:0 auto;padding:25mm 22mm;page-break-after:always}'+
  '.page:last-child{page-break-after:auto}'+
  'h2{font-size:12pt;font-weight:700;margin-bottom:8pt}'+
  'p{margin-bottom:8pt;text-align:justify}'+
  '.center{text-align:center;margin:18pt 0}.center p{text-align:center;margin-bottom:6pt}'+
  '.section-title{font-size:11pt;font-weight:700;text-decoration:underline;margin:14pt 0 8pt}'+
  '.ref-line{margin-bottom:6pt}.ref-line>strong{display:inline-block;min-width:32pt}'+
  'table{width:100%;border-collapse:collapse;margin:10pt 0 14pt;page-break-inside:avoid}'+
  'th{padding:5pt 7pt;font-size:9.5pt;font-weight:700;background:#1b3f6e;color:#fff;text-align:left}'+
  'th.num,td.num{text-align:right}'+
  'td{padding:4pt 7pt;font-size:9.5pt;border-bottom:1px solid #d0d4d9}'+
  'tr.tot td{background:#eef2f7;font-weight:700}'+
  '.period-block{margin-bottom:14pt}'+
  '.period-title{font-size:10.5pt;font-weight:700;color:#1b3f6e;margin-bottom:6pt;text-transform:uppercase;letter-spacing:.4px}'+
  '.firma p{margin-bottom:14pt}'+
  '.toolbar{position:fixed;top:8px;right:8px;background:#fff;border:1px solid #d0d4d9;border-radius:6px;padding:6px 8px;display:flex;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,.08);font-family:Arial,sans-serif;font-size:11pt;z-index:9999}'+
  '.toolbar button{cursor:pointer;border:1px solid #d0d4d9;background:#f0f4f8;padding:6px 10px;border-radius:4px;font-size:11pt}'+
  '.toolbar button:hover{background:#e2e8f0}'+
  '@media print{body{margin:0}.page{margin:0;padding:20mm 18mm}.toolbar{display:none}}'+
  '</style></head><body>'+
  '<div class="toolbar"><button onclick="window.print()">🖨️ Imprimir / PDF</button><button onclick="window.opener&&window.opener.downloadAmendmentDoc(\''+cid+'\','+(targetEnmNum!=null?targetEnmNum:'null')+');">📝 Descargar .doc</button></div>'+
  bodyHtml+
  '</body></html>';
}

window.toggleAlertSection = function(section) {
  const content = document.getElementById('section' + section.charAt(0).toUpperCase() + section.slice(1));
  const toggle = document.getElementById('toggle' + section.charAt(0).toUpperCase() + section.slice(1));
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggle.textContent = '▼';
  } else {
    content.style.display = 'none';
    toggle.textContent = '▶';
  }
};

function viewAlertContract(id) {
  window.detId = id;
  go('detail');
}

// ═══════════════ DASHBOARD ═══════════════

function getTCFromStore() {
  // Obtener TC directamente de IDX_STORE (bypass getIndicatorSnapshots)
  if (!IDX_STORE || typeof IDX_STORE !== 'object') {
    console.warn('[getTCFromStore] IDX_STORE no disponible');
    return null;
  }
  
  const codigosPosibles = ['usd_div'];
  
  for (let codigo of codigosPosibles) {
    if (IDX_STORE[codigo] && Array.isArray(IDX_STORE[codigo].rows) && IDX_STORE[codigo].rows.length > 0) {
      const rows = IDX_STORE[codigo].rows;
      const ultimaRow = rows[rows.length - 1];
      if (ultimaRow && ultimaRow.value) {
        console.log('[getTCFromStore] TC encontrado:', codigo, '=', ultimaRow.value);
        return Number(ultimaRow.value);
      }
    }
  }
  
  console.warn('[getTCFromStore] No se encontró TC en IDX_STORE');
  return null;
}

let chartDominio = null;
let chartProveedores = null;

// Calcula métricas ejecutivas y renderiza el bloque "Acciones pendientes" del dashboard.
