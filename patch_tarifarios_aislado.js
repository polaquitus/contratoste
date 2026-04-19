// PATCH AISLADO TARIFARIOS v1: persistencia local + generación multi-tabla
(function(){
  'use strict';
  var TAR_LS_PREFIX='tarifarios_local_';
  function k(cid){ return TAR_LS_PREFIX + String(cid); }
  function clone(x){ return JSON.parse(JSON.stringify(x||[])); }
  function normPeriod(p){ return String(p||'').slice(0,7); }
  function getContract(cid){ return (window.DB||[]).find(function(c){ return String(c.id)===String(cid); }) || null; }
  function persistLocal(cid, tars){ try{ localStorage.setItem(k(cid), JSON.stringify(tars||[])); }catch(e){ console.warn('persistLocal tarifarios', e); } }
  function readLocal(cid){ try{ return JSON.parse(localStorage.getItem(k(cid))||'[]') || []; }catch(e){ return []; } }
  function mergeTarifarios(base, extra){
    var out = (base||[]).slice();
    (extra||[]).forEach(function(tbl){
      var idx = out.findIndex(function(x){
        return String(x.name||'')===String(tbl.name||'') &&
               String(normPeriod(x.period||''))===String(normPeriod(tbl.period||'')) &&
               String(x.source||'')===String(tbl.source||'');
      });
      if(idx>=0) out[idx] = Object.assign({}, out[idx], tbl, {updatedAt:new Date().toISOString()});
      else out.push(tbl);
    });
    return out;
  }
  function ensureTarifariosInContract(cid){
    var c = getContract(cid); if(!c) return [];
    var dbTars = Array.isArray(c.tarifarios) ? c.tarifarios : [];
    var lsTars = readLocal(cid);
    if(lsTars.length){
      c.tarifarios = mergeTarifarios(dbTars, lsTars);
      c.updatedAt = new Date().toISOString();
      if(typeof save==='function') save();
    } else if(!Array.isArray(c.tarifarios)) {
      c.tarifarios = [];
    }
    return c.tarifarios || [];
  }

  if(typeof window.getTar==='function' && !window.__tarPatchGetSet){
    window.getTar = function(){
      var c = getContract(window.detId); if(!c) return [];
      return ensureTarifariosInContract(window.detId);
    };
    window.setTar = async function(t){
      var c = getContract(window.detId); if(!c) return;
      c.tarifarios = clone(t||[]);
      c.updatedAt = new Date().toISOString();
      persistLocal(c.id, c.tarifarios);
      if(typeof save==='function') save();
    };
    window.__tarPatchGetSet = true;
  }

  if(typeof window.importPriceListsFromFiles==='function' && !window.__tarPatchImport){
    var _origImport = window.importPriceListsFromFiles;
    window.importPriceListsFromFiles = async function(files){
      var cid = window.detId;
      var before = clone(ensureTarifariosInContract(cid));
      var res = await _origImport.apply(this, arguments);
      var after = clone(ensureTarifariosInContract(cid));
      var merged = mergeTarifarios(before, after);
      var c = getContract(cid);
      if(c){
        c.tarifarios = merged;
        c.updatedAt = new Date().toISOString();
        persistLocal(cid, merged);
        if(typeof save==='function') save();
      }
      if(typeof renderTarifario==='function') renderTarifario();
      return res;
    };
    window.__tarPatchImport = true;
  }

  function getSelectedRows(cid){ return (typeof getSelectedPeriodsSummaryRows==='function') ? (getSelectedPeriodsSummaryRows(cid) || []) : []; }
  function priceColIndex(cols){ cols=cols||[]; var idx=cols.findIndex(function(c){ return /valor\s*unitario|precio/i.test(String(c||'')); }); return idx>=0 ? idx : Math.max(0, cols.length-1); }
  window.generateSelectedPriceLists = function(cid){
    var contract = getContract(cid);
    if(!contract){ if(typeof toast==='function') toast('Contrato no encontrado','er'); return; }
    ensureTarifariosInContract(cid);
    var rows = getSelectedRows(cid);
    if(!rows.length){ if(typeof toast==='function') toast('Seleccioná al menos un período','er'); return; }
    var all = clone(contract.tarifarios || []);
    var created = 0;
    rows.forEach(function(sel){
      var refYm = String(sel.refYm||'');
      var targetYm = String(sel.ym||'');
      var baseTables = all.filter(function(t){ return normPeriod(t.period||'')===normPeriod(refYm); });
      baseTables.forEach(function(baseTar){
        if(!baseTar || !Array.isArray(baseTar.rows) || !baseTar.rows.length) return;
        var deltaPct = (typeof computePoliDeltaPct==='function') ? computePoliDeltaPct(contract, refYm, targetYm) : null;
        if(deltaPct==null || !isFinite(Number(deltaPct))) return;
        var factor = 1 + (Number(deltaPct)/100);
        var cols = (baseTar.cols||[]).slice();
        var pidx = priceColIndex(cols);
        var newRows = (baseTar.rows||[]).map(function(r){
          var rr = (r||[]).slice();
          var ov = Number(rr[pidx]);
          rr[pidx] = isFinite(ov) ? (ov * factor) : rr[pidx];
          return rr;
        });
        var newName = String(baseTar.name||'Tarifario') + ' · Ajuste ' + targetYm;
        var exists = all.find(function(t){ return normPeriod(t.period||'')===normPeriod(targetYm) && String(t.name||'')===newName && String(t.source||'')==='POLI_SELECT'; });
        if(exists){
          exists.rows = newRows;
          exists.basePeriod = refYm;
          exists.pctApplied = Number(deltaPct);
          exists.updatedAt = new Date().toISOString();
        } else {
          all.push({name:newName,cols:cols,rows:newRows,period:targetYm,basePeriod:refYm,pctApplied:Number(deltaPct),source:'POLI_SELECT',importedAt:new Date().toISOString(),editable:true});
          created++;
        }
      });
    });
    contract.tarifarios = all;
    contract.updatedAt = new Date().toISOString();
    persistLocal(cid, all);
    if(typeof save==='function') save();
    if(typeof renderTarifario==='function') renderTarifario();
    if(typeof renderSelectedPeriodsSummary==='function') setTimeout(function(){ renderSelectedPeriodsSummary(cid); }, 50);
    if(typeof toast==='function') toast((created||rows.length)+' lista(s) de precios generada(s)','ok');
  };

  if(typeof window.renderTarifario==='function' && !window.__tarPatchRender){
    var _origRenderTar = window.renderTarifario;
    window.renderTarifario = function(){
      if(window.detId!=null) ensureTarifariosInContract(window.detId);
      return _origRenderTar.apply(this, arguments);
    };
    window.__tarPatchRender = true;
  }
})();
