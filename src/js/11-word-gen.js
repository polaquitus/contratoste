// ===== GENERADOR DE WORD: arma el .docx de Condiciones Particulares a partir =====
// ===== del clausulado cargado en Legales + los datos del contrato =====
(function(){
  function evalShowIf(showIf,ctx){
    if(!showIf)return true;
    var k=Object.keys(showIf)[0];
    var want=showIf[k];
    if(k==='alcance'){
      if(want==='ba_nqn')return !!(ctx.alcance.nqn||ctx.alcance.ba);
      return !!ctx.alcance[want];
    }
    if(k==='fondoGarantia')return ctx.fondoGarantia===want;
    if(k==='hasPoly')return !!ctx.hasPoly===want;
    if(k==='trigA')return !!ctx.trigA===want;
    if(k==='trigB')return !!ctx.trigB===want;
    return true;
  }

  function substitute(text,vars){
    return String(text||'').replace(/\{\{(\w+)\}\}/g,function(_,k){
      var v=vars[k];
      return (v!=null&&v!=='')?v:'____________';
    });
  }

  function fmtDateAr(iso){
    if(!iso)return '';
    var p=String(iso).slice(0,10).split('-');
    return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):String(iso);
  }

  function buildContext(c){
    return {
      alcance:{asr:!!c.alcanceAsr,api:!!c.alcanceApi,tdf:!!c.alcanceTdf,nqn:!!c.alcanceNqn,ba:!!c.alcanceBa},
      fondoGarantia:!!c.claus5FondoGarantia,
      hasPoly:!!c.hasPoly,
      trigA:!!c.trigA,
      trigB:!!c.trigB,
      ciberTipo:c.claus12Tipo||''
    };
  }

  function buildVars(c){
    var dd=c.claus2DiaDesde||'Lunes',dh=c.claus2DiaHasta||'Viernes',hd=c.claus2HoraDesde||'08:00',hh=c.claus2HoraHasta||'19:00';
    return {
      HORARIO:'de '+dd.toLowerCase()+' a '+dh.toLowerCase()+' de '+hd+' a '+hh+' hs.',
      FECHA_INICIO:fmtDateAr(c.fechaIni),
      FECHA_FIN:fmtDateAr(c.fechaFin),
      PLAZO:c.plazo?(c.plazo+' meses'):''
    };
  }

  // Arial 10pt para texto común (size en half-points: 20 = 10pt), 11pt para títulos de cláusula.
  function blockToParagraph(b,vars){
    var D=window.docx;
    var text=substitute(b.text,vars);
    if(b.type==='title'){
      return new D.Paragraph({spacing:{before:220,after:100},children:[new D.TextRun({text:text,bold:true,font:'Arial',size:21})]});
    }
    if(b.type==='subtitle'){
      return new D.Paragraph({spacing:{before:140,after:80},children:[new D.TextRun({text:text,bold:true,underline:{},font:'Arial',size:20})]});
    }
    if(b.type==='item'){
      return new D.Paragraph({spacing:{after:100},indent:{left:400},alignment:D.AlignmentType.JUSTIFIED,children:[new D.TextRun({text:text,font:'Arial',size:20})]});
    }
    return new D.Paragraph({spacing:{after:140},alignment:D.AlignmentType.JUSTIFIED,children:[new D.TextRun({text:text,font:'Arial',size:20})]});
  }

  async function generarWordCondiciones(){
    if(typeof window.docx==='undefined'){if(typeof toast==='function')toast('No se pudo cargar la librería de generación de Word','er');return;}
    var c=window.DB.find(function(x){return x.id===window.detId;});
    if(!c){if(typeof toast==='function')toast('No se encontró el contrato','er');return;}
    if(typeof showLoader==='function')showLoader('Armando el Word de Condiciones Particulares...');
    try{
      if(typeof LegalesAdmin==='undefined'||typeof LegalesAdmin.getData!=='function')throw new Error('Módulo Legales no disponible');
      var data=await LegalesAdmin.getData();
      var CLAUSE_ORDER=LegalesAdmin.CLAUSE_ORDER;
      var CLAUSE_TITLES=LegalesAdmin.CLAUSE_TITLES;
      var ctx=buildContext(c);
      var vars=buildVars(c);
      var D=window.docx;
      var children=[];

      children.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{after:120},children:[new D.TextRun({text:'CONDICIONES PARTICULARES',bold:true,font:'Arial',size:28})]}));
      children.push(new D.Paragraph({spacing:{after:80},children:[new D.TextRun({text:'Contract N.º '+(c.num||'____________'),bold:true,font:'Arial',size:20}),new D.TextRun({text:'   ·   Contratista: '+(c.cont||'____________'),font:'Arial',size:20})]}));
      children.push(new D.Paragraph({spacing:{after:280},children:[new D.TextRun({text:'Servicio de '+(c.det||'____________'),font:'Arial',size:20,italics:true})]}));

      var skipped=[];
      CLAUSE_ORDER.forEach(function(key,idx){
        var num=idx+1;
        var incField='claus'+num+'Inc';
        var included=c[incField]!=null?!!c[incField]:true;
        if(!included){skipped.push(num);return;}
        var clause=data.clauses[key];
        var titleFull=(CLAUSE_TITLES&&CLAUSE_TITLES[key])||(num+'. Cláusula '+num);
        children.push(new D.Paragraph({spacing:{before:320,after:160},children:[new D.TextRun({text:titleFull.toUpperCase(),bold:true,font:'Arial',size:22})]}));
        if(key==='c1'){
          // Descripción: texto libre, se completa manualmente — se deja en blanco a propósito.
          children.push(new D.Paragraph({spacing:{after:400},children:[new D.TextRun({text:'',font:'Arial',size:20})]}));
          return;
        }
        if(!clause||!Array.isArray(clause.blocks)){
          children.push(new D.Paragraph({spacing:{after:200},children:[new D.TextRun({text:'[Sin contenido cargado en Legales para esta cláusula]',italics:true,font:'Arial',size:20})]}));
          return;
        }
        clause.blocks.forEach(function(b){
          if(!evalShowIf(b.showIf,ctx))return;
          children.push(blockToParagraph(b,vars));
        });
      });

      children.push(new D.Paragraph({spacing:{before:400,after:100},children:[new D.TextRun({text:'Por el OFERENTE',font:'Arial',size:20})]}));
      children.push(new D.Paragraph({spacing:{after:60},children:[new D.TextRun({text:'____________________________',font:'Arial',size:20})]}));
      children.push(new D.Paragraph({children:[new D.TextRun({text:'Aclaración y cargo',font:'Arial',size:18,italics:true})]}));

      var doc=new D.Document({sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},children:children}]});
      var blob=await D.Packer.toBlob(doc);
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;a.download='Condiciones Particulares - '+(c.num||'contrato')+'.docx';
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(url);},4000);
      var note='Word generado ✓ — Cláusula 1 (Descripción) y Anexos quedan para completar manualmente.';
      if(skipped.length)note+=' Cláusulas excluidas: '+skipped.join(', ')+'.';
      if(typeof toast==='function')toast(note,'ok');
    }catch(err){
      console.error('[word-gen] generarWordCondiciones',err);
      if(typeof toast==='function')toast('No se pudo generar el Word: '+err.message,'er');
    }finally{
      if(typeof hideLoader==='function')hideLoader();
    }
  }

  window.generarWordCondiciones=generarWordCondiciones;
})();
