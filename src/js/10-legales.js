// ===== MODULO LEGALES: edición versionada del texto de cada cláusula del =====
// ===== modelo de Condiciones Particulares, usado luego para armar el Word =====
(function(){
  var CLAUSE_ORDER=['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13'];
  var CLAUSE_TITLES={
    c1:'1. Descripción', c2:'2. Horario de Trabajos', c3:'3. Duración', c4:'4. Precio',
    c5:'5. Facturación y Pago', c6:'6. Obligaciones de la Compañía', c7:'7. Obligaciones del Oferente',
    c8:'8. Cesión Contractual / Cambio de Control', c9:'9. Política de Higiene, Seguridad y Preservación del Medio Ambiente',
    c10:'10. Salud, Seguridad, Responsabilidad Social, Seguridad Física y Medio Ambiente',
    c11:'11. Principios Fundamentales de Contratación', c12:'12. Requerimientos de Ciberseguridad',
    c13:'13. Valor Económico'
  };
  var BLOCK_TYPE_LABEL={title:'Título',subtitle:'Subtítulo',p:'Párrafo',item:'Ítem de lista'};
  var BLOCK_TYPE_COLOR={title:'#1d4ed8',subtitle:'#7c3aed',p:'#6b7280',item:'#0f766e'};
  var SHOWIF_LABEL={
    'alcance:asr':'Solo si Alcance incluye Aguada San Roque',
    'alcance:api':'Solo si Alcance incluye Aguada Pichana',
    'alcance:tdf':'Solo si Alcance incluye Tierra del Fuego',
    'alcance:nqn':'Solo si Alcance incluye Neuquén',
    'alcance:ba_nqn':'Solo si Alcance incluye Neuquén o Buenos Aires',
    'fondoGarantia:true':'Solo si el contrato lleva Fondo de Garantía',
    'fondoGarantia:false':'Solo si el contrato NO lleva Fondo de Garantía'
  };
  function showIfLabel(showIf){
    if(!showIf)return null;
    var k=Object.keys(showIf)[0];
    return SHOWIF_LABEL[k+':'+showIf[k]] || (k+'='+showIf[k]);
  }

  // Seed inicial — se usa solo la primera vez que se abre el módulo y la tabla
  // clause_templates está vacía. Texto extraído del modelo de Condiciones
  // Particulares subido por el usuario.
  var CLAUSE_SEED={
    c1:{blocks:[{type:'p',text:'[Texto libre — se completa manualmente en cada contrato, no tiene contenido fijo de Legales]'}]},
    c2:{blocks:[{type:'p',text:'Las actividades objeto del presente contrato deberán realizarse dentro del horario establecido por LA COMPAÑÍA, el cual será {{HORARIO}}.'},{type:'p',text:'Todas las actividades deberán ser previamente acordadas con el representante de LA COMPAÑÍA. Cualquier trabajo fuera de este horario requerirá autorización expresa, previamente acordada por el representante de LA COMPAÑÍA.'}]},
    c3:{blocks:[{type:'title',text:'3.1 Fecha de Inicio y fin del contrato'},{type:'p',text:'Fecha de inicio: {{FECHA_INICIO}}'},{type:'p',text:'Fecha de finalización: {{FECHA_FIN}}'},{type:'title',text:'3.2 Período operacional'},{type:'p',text:'El período operacional que transcurre entre la fecha de inicio y la fecha de terminación será de {{PLAZO}}.'},{type:'title',text:'3.3 Opción a prórroga'},{type:'p',text:'La COMPAÑIA podrá prorrogar el período operacional por un plazo similar o inferior, notificando su decisión al OFERENTE por escrito y con un aviso de 30 días previos a la fecha de terminación del período operacional en curso, entendiendo que, durante tal extensión la COMPAÑIA tendrá derecho si el OFERENTE utilizara los mismos equipos / herramientas, etc., a solicitar la reducción del precio / tarifas en base a las amortizaciones de los mismos u otros conceptos, ya absorbidos durante el presente OFERTA.'}]},
    c4:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c5:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c6:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c7:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c8:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c9:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c10:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c11:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c12:{blocks:[{type:'p',text:'[Pendiente de carga por Legales — ver modelo original]'}]},
    c13:{blocks:[{type:'p',text:'La presente PROPUESTA será considerada aceptada por la COMPAÑIA al informar por escrito al OFERENTE el nombre del responsable del servicio en la COMPAÑÍA.'},{type:'p',text:'Atentamente,'}]}
  };

  var TABLE='clause_templates';
  var LS_KEY='clause_templates_v1';
  var state={data:null,loaded:false,sbId:null,currentKey:null,dirty:false};
  var refs={root:null,nav:null,list:null,editor:null,verInfo:null};

  function q(id){return document.getElementById(id);}
  function clear(el){while(el&&el.firstChild)el.removeChild(el.firstChild);}
  function make(tag,cls,txt){var el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=txt;return el;}
  function nowUser(){try{return (typeof _APP_USER!=='undefined'&&_APP_USER)||(typeof _APP_ROLE!=='undefined'&&_APP_ROLE)||'—';}catch(e){return '—';}}

  function emptyData(){
    var clauses={};
    CLAUSE_ORDER.forEach(function(k){
      var seed=CLAUSE_SEED[k]||{blocks:[]};
      clauses[k]={title:CLAUSE_TITLES[k],blocks:JSON.parse(JSON.stringify(seed.blocks))};
    });
    return {version:1,updatedAt:new Date().toISOString(),updatedBy:nowUser(),clauses:clauses,history:[]};
  }

  async function reload(){
    state.loaded=false;
    try{
      if(typeof SB_OK!=='undefined'&&SB_OK&&typeof sbFetch==='function'){
        var rows=await sbFetch(TABLE,'GET',null,'?select=id,datos&order=id.desc&limit=1');
        if(rows&&rows.length){
          state.sbId=rows[0].id;
          state.data=JSON.parse(rows[0].datos);
          state.loaded=true;
          return;
        }
        // No hay fila todavía: sembrar con el contenido inicial.
        var seedData=emptyData();
        var res=await sbFetch(TABLE,'POST',{datos:JSON.stringify(seedData)});
        if(res&&res[0])state.sbId=res[0].id;
        state.data=seedData;
        state.loaded=true;
        return;
      }
    }catch(err){
      console.warn('[legales] no se pudo usar Supabase, usando localStorage:',err.message);
    }
    try{
      var raw=localStorage.getItem(LS_KEY);
      state.data=raw?JSON.parse(raw):emptyData();
    }catch(e){
      state.data=emptyData();
    }
    state.loaded=true;
  }

  async function persist(){
    if(typeof localStorage!=='undefined')localStorage.setItem(LS_KEY,JSON.stringify(state.data));
    if(typeof SB_OK!=='undefined'&&SB_OK&&typeof sbFetch==='function'){
      try{
        var payload={datos:JSON.stringify(state.data)};
        if(state.sbId){await sbFetch(TABLE,'PATCH',payload,'?id=eq.'+state.sbId);}
        else{var res=await sbFetch(TABLE,'POST',payload);if(res&&res[0])state.sbId=res[0].id;}
      }catch(err){
        console.warn('[legales] no se pudo guardar en Supabase, quedó solo en localStorage:',err.message);
        if(typeof toast==='function')toast('No se pudo sincronizar con Supabase — se guardó localmente. Avisá a Sistemas para crear la tabla clause_templates.','er');
      }
    }
  }

  function ensureNav(){
    var nav=document.querySelector('.sb-nav');if(!nav)return;
    if(q('navLegalesModule')){refs.nav=q('navLegalesModule');return;}
    var a=make('a','nv');a.id='navLegalesModule';a.href='#';a.setAttribute('data-mod','legales');
    a.appendChild(make('span','ni','⚖️'));a.appendChild(make('span','','Legales'));
    a.addEventListener('click',function(ev){ev.preventDefault();showPage();});
    var usersLink=q('navUsersModule');
    if(usersLink&&usersLink.parentNode===nav){usersLink.insertAdjacentElement('afterend',a);}
    else{var sec=make('div','sb-sec','Administracion');nav.appendChild(sec);nav.appendChild(a);}
    refs.nav=a;
  }

  function ensureView(){
    var ct=document.querySelector('.ct');if(!ct)return;
    if(q('vLegalesModule')){refs.root=q('vLegalesModule');refs.list=q('legalesList');refs.editor=q('legalesEditor');refs.verInfo=q('legalesVerInfo');return;}
    var wrap=make('div','vw');wrap.id='vLegalesModule';
    var card=make('div','card');
    var hdr=make('div','thdr');hdr.appendChild(make('h2','','Legales — Clausulado del Modelo'));
    var info=make('div','info-box blue');info.style.margin='0 0 14px';
    info.innerHTML='Acá se edita el texto real de cada cláusula del modelo de Condiciones Particulares. Los contratos solo completan datos (fechas, montos, alcance); el texto legal se define acá y queda versionado.';
    card.appendChild(hdr);card.appendChild(info);
    var grid=make('div','');grid.style.display='grid';grid.style.gridTemplateColumns='260px 1fr';grid.style.gap='20px';grid.style.alignItems='start';
    var list=make('div','');list.id='legalesList';list.style.display='flex';list.style.flexDirection='column';list.style.gap='4px';
    var editorWrap=make('div','');
    var verInfo=make('div','');verInfo.id='legalesVerInfo';verInfo.style.fontSize='11px';verInfo.style.color='var(--g500)';verInfo.style.marginBottom='10px';
    var editor=make('div','');editor.id='legalesEditor';
    editorWrap.appendChild(verInfo);editorWrap.appendChild(editor);
    grid.appendChild(list);grid.appendChild(editorWrap);
    card.appendChild(grid);
    wrap.appendChild(card);ct.appendChild(wrap);
    refs.root=wrap;refs.list=list;refs.editor=editor;refs.verInfo=verInfo;
  }

  function setHeader(){
    var t=q('pgT'),a=q('pgA');if(!t||!a)return;
    clear(t);t.appendChild(document.createTextNode('⚖️ Legales '));var bc=make('span','bc','Clausulado');t.appendChild(bc);
    clear(a);var rec=make('button','btn btn-s btn-sm','Recargar');rec.type='button';rec.addEventListener('click',async function(){await reload();renderList();renderEditor();});a.appendChild(rec);
  }

  function hideAllViews(){
    ['vList','vForm','vDet','vMe2n','vMe2nDet','vIdx','vLicit','vProv','vTimeline','vAlertas','vDashboard','vForecast','vUsersModule','vLegalesModule'].forEach(function(id){var el=q(id);if(el)el.classList.remove('on');});
    document.querySelectorAll('.sb-nav .nv').forEach(function(n){n.classList.remove('act');});
  }

  async function showPage(){
    if(typeof canAccess==='function'&&!canAccess('legales')){if(typeof toast==='function')toast('Tu rol no tiene permiso para entrar a este módulo','er');return;}
    ensureNav();ensureView();setHeader();hideAllViews();
    refs.root.classList.add('on');if(refs.nav)refs.nav.classList.add('act');
    if(!state.loaded){if(typeof showLoader==='function')showLoader('Cargando clausulado...');await reload();if(typeof hideLoader==='function')hideLoader();}
    renderList();
    if(!state.currentKey)state.currentKey='c1';
    renderEditor();
  }

  function renderList(){
    if(!refs.list)return;
    clear(refs.list);
    CLAUSE_ORDER.forEach(function(k){
      var btn=make('button','','');
      btn.type='button';
      btn.textContent=CLAUSE_TITLES[k];
      btn.style.textAlign='left';btn.style.padding='9px 12px';btn.style.borderRadius='8px';btn.style.border='1px solid transparent';
      btn.style.background=(state.currentKey===k)?'var(--p50)':'transparent';
      btn.style.color=(state.currentKey===k)?'var(--p700)':'var(--g700)';
      btn.style.fontWeight=(state.currentKey===k)?'700':'500';
      btn.style.fontSize='12.5px';btn.style.cursor='pointer';
      btn.addEventListener('click',function(){state.currentKey=k;renderList();renderEditor();});
      refs.list.appendChild(btn);
    });
  }

  function renderEditor(){
    if(!refs.editor)return;
    clear(refs.editor);
    var key=state.currentKey;
    var clause=state.data.clauses[key];
    if(!clause){refs.editor.appendChild(make('div','empty','Cláusula no encontrada.'));return;}
    refs.verInfo.textContent='Versión '+state.data.version+' · Última edición: '+(state.data.updatedAt?new Date(state.data.updatedAt).toLocaleString('es-AR'):'—')+' por '+(state.data.updatedBy||'—');
    var title=make('div','');title.style.fontWeight='800';title.style.fontSize='15px';title.style.marginBottom='12px';title.textContent=CLAUSE_TITLES[key];
    refs.editor.appendChild(title);
    (clause.blocks||[]).forEach(function(b,i){
      var row=make('div','');row.style.border='1px solid var(--g200)';row.style.borderRadius='8px';row.style.padding='10px 12px';row.style.marginBottom='8px';row.style.background='var(--g50)';
      var top=make('div','');top.style.display='flex';top.style.alignItems='center';top.style.gap='8px';top.style.marginBottom='6px';
      var typeSel=make('select','');['title','subtitle','p','item'].forEach(function(t){var o=make('option','',BLOCK_TYPE_LABEL[t]);o.value=t;if(b.type===t)o.selected=true;typeSel.appendChild(o);});
      typeSel.style.fontSize='11px';typeSel.style.padding='3px 6px';typeSel.style.color=BLOCK_TYPE_COLOR[b.type]||'#333';typeSel.style.fontWeight='700';
      typeSel.addEventListener('change',function(){b.type=typeSel.value;state.dirty=true;});
      top.appendChild(typeSel);
      var showIfLbl=showIfLabel(b.showIf);
      if(showIfLbl){var chip=make('span','','🔀 '+showIfLbl);chip.style.fontSize='10.5px';chip.style.color='var(--p700)';chip.style.background='var(--p50)';chip.style.padding='2px 8px';chip.style.borderRadius='999px';top.appendChild(chip);}
      var delBtn=make('button','btn btn-s btn-sm','✕');delBtn.type='button';delBtn.style.marginLeft='auto';delBtn.style.padding='2px 8px';
      delBtn.addEventListener('click',function(){clause.blocks.splice(i,1);state.dirty=true;renderEditor();});
      top.appendChild(delBtn);
      row.appendChild(top);
      var ta=make('textarea','');ta.value=b.text||'';ta.style.width='100%';ta.style.minHeight=(b.type==='title'||b.type==='subtitle')?'36px':'70px';ta.style.fontSize='12.5px';ta.style.fontFamily='inherit';ta.style.border='1px solid var(--g200)';ta.style.borderRadius='6px';ta.style.padding='6px 8px';
      ta.addEventListener('input',function(){b.text=ta.value;state.dirty=true;});
      row.appendChild(ta);
      refs.editor.appendChild(row);
    });
    var addBtn=make('button','btn btn-s btn-sm','➕ Agregar bloque');addBtn.type='button';addBtn.style.marginBottom='16px';
    addBtn.addEventListener('click',function(){clause.blocks.push({type:'p',text:''});state.dirty=true;renderEditor();});
    refs.editor.appendChild(addBtn);
    var saveBtn=make('button','btn btn-p','💾 Guardar cambios de esta cláusula');saveBtn.type='button';
    saveBtn.addEventListener('click',function(){saveClause(key);});
    refs.editor.appendChild(document.createElement('br'));
    refs.editor.appendChild(saveBtn);
  }

  async function saveClause(key){
    if(typeof showLoader==='function')showLoader('Guardando cláusula...');
    try{
      var snapshot={version:state.data.version,updatedAt:state.data.updatedAt,updatedBy:state.data.updatedBy,clauses:JSON.parse(JSON.stringify(state.data.clauses))};
      state.data.history=state.data.history||[];
      state.data.history.unshift(snapshot);
      if(state.data.history.length>30)state.data.history.length=30;
      state.data.version=(state.data.version||1)+1;
      state.data.updatedAt=new Date().toISOString();
      state.data.updatedBy=nowUser();
      await persist();
      state.dirty=false;
      renderEditor();
      if(typeof toast==='function')toast('Cláusula "'+CLAUSE_TITLES[key]+'" guardada — versión '+state.data.version,'ok');
    }catch(err){
      console.error('[legales] saveClause',err);
      if(typeof toast==='function')toast('No se pudo guardar: '+err.message,'er');
    }finally{
      if(typeof hideLoader==='function')hideLoader();
    }
  }

  var _rawGo=null;
  function installGoHook(){
    if(typeof go!=='function')return;
    _rawGo=go;
    go=function(v){if(v==='legales'){showPage();return;}return _rawGo.apply(this,arguments);};
  }

  function boot(){ensureNav();ensureView();installGoHook();}
  document.addEventListener('DOMContentLoaded',function(){try{LegalesAdmin.boot();}catch(err){console.error('LegalesAdmin boot',err);}});

  window.LegalesAdmin={boot:boot,show:showPage,reload:reload};
})();
