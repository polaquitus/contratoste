# Contratos TA — TotalEnergies Argentina

## Stack
- **Frontend:** `index.html` monolítico (~8000+ líneas, HTML/CSS/JS)
- **Backend:** Supabase (`https://upxsqroxbvzwudcaklvn.supabase.co`)
- **Deploy:** GitHub Pages (`https://polaquitos.github.io/contratosite/`)
- **AI:** Gemini vía Supabase Edge Function `gemini-proxy`
- **Workflow:** 100% browser, sin herramientas locales

## Reglas críticas al modificar código

1. **NO romper funcionalidad existente** — solo cambios quirúrgicos y precisos
2. **`plazo` siempre en meses** — fórmula: `total / plazo_meses` (nunca dividir por días)
3. **Supabase es única fuente de verdad** para índices — no usar localStorage como fallback
4. **Prioridad de datos:** IDX_STORE (live) > IDX_OFFICIAL_SEED (hardcoded)
5. **No entrada manual de índices** — toda carga debe ser automatizada
6. **Modularización es riesgosa** — no refactorizar a múltiples archivos sin aprobación explícita

## Arquitectura del sistema

### Tablas Supabase
- `indices` — índices económicos (ID activo: 3)
- `app_users` — usuarios de la aplicación

### Edge Functions
- `gemini-proxy` — proxy para Gemini AI
- `energia-proxy` — proxy para datos.energia.gob.ar (CORS bypass)
- `super-responder` — uso general

### Estructura IDX_STORE
```javascript
{
  "ipc_nac": {
    "rows": [
      { "ym": "2024-01", "pct": 20.6, "value": 9200.34, "source": "INDEC", "confirmed": false }
    ]
  },
  "usd_div": {
    "rows": [
      { "ym": "2024-01", "value": 828.25, "pct": null, "source": "BNA" }
    ]
  }
}
```

## Catálogo de índices (IDX_CATALOG)
```javascript
[
  {id:'ipc_nac',   name:'IPC Nacional',           src:'INDEC',      seriesId:'148.3_INIVELNAL_DICI_M_26'},
  {id:'ipc_gba',   name:'IPC GBA',                src:'INDEC',      seriesId:'148.3_INIVELGBA_DICI_M_21'},
  {id:'ipc_pat',   name:'IPC Patagonia',           src:'INDEC',      seriesId:'148.3_INIVELNIA_DICI_M_27'},
  {id:'ipc_nqn',   name:'IPC NQN',                src:'DPEyC NQN',  seriesId:null},
  {id:'ipc_nqnab', name:'IPC NQN Alim y Beb',     src:'DPEyC NQN',  seriesId:null},
  {id:'ipim_gral', name:'IPIM General',            src:'INDEC',      seriesId:'448.1_NIVEL_GENERAL_0_0_13_46'},
  {id:'ipim_r29',  name:'IPIM R29 Refinados',      src:'INDEC',      seriesId:'PENDIENTE - error 400'},
  {id:'fadeaac',   name:'FADEAAC Equipo Vial',     src:'FADEAAC',    seriesId:null},
  {id:'go_g3',     name:'Gas Oil G3 YPF NQN',      src:'S.Energía',  seriesId:null},
  {id:'go_g2',     name:'Gas Oil G2 YPF NQN',      src:'S.Energía',  seriesId:null},
  {id:'usd_div',   name:'USD DIVISA BNA',          src:'BCRA',       seriesId:null},
  {id:'usd_bill',  name:'USD BILLETE BNA',         src:'BCRA',       seriesId:null}
]
```

## APIs de datos
```
INDEC series:    https://apis.datos.gob.ar/series/api/series?ids={id}&format=json&start_date={ym}
ArgentinaDatos:  https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial
Energía CKAN:    https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id={id}&limit=32000
  → Histórico resource_id: f8dda0d5-2a9f-4d34-b79b-4e63de3995df
  → Vigentes resource_id:  80ac25de-a44a-4445-9215-090cf55cfda5
  → IMPORTANTE: usar energia-proxy (certificado SSL vencido en datos.energia.gob.ar)
```

## Estado actual de índices en Supabase (registro ID: 3)
```
✅ ipc_nac:   28 períodos (Dic 2023 → Mar 2026)
✅ ipc_gba:   28 períodos
✅ ipc_pat:   28 períodos
✅ ipc_nqn:   parcial vía AI
✅ ipim_gral: 28 períodos
❌ ipim_r29:  sin datos (API INDEC error 400)
✅ fadeaac:   5 períodos vía AI
✅ usd_div:   29 períodos (Dic 2023 → Abr 2026)
✅ usd_bill:  29 períodos
⚠️ go_g2:    7 períodos (incompleto)
⚠️ go_g3:    7 períodos (incompleto)
```

## Módulos de index.html
- `vContratos` — listado y detalle de contratos
- `vIndices` — gestión de índices económicos (`renderIdxCards()`)
- `vUsers` — administración de usuarios (CRUD parcial)
- `vLicitaciones` — licitaciones
- `vProveedores` — proveedores
- Sistema de roles: `ROLE_DEFAULTS` / `canAccess` / `applyPermissions` / `applyRolePermissions`
- Fórmulas polinómicas: `Ko` (coeficiente de ajuste), `autoScanFirstMatch()`, gatillos de redeterminación
- Migración condiciones: `migrateFromGatillos()` (dos fuentes: `contract.gatillos` y `localStorage`)

## Archivos auxiliares en el repo
- `carga_historica.html` — carga masiva INDEC histórico
- `carga_gasoil.html` — carga Gas Oil vía energia-proxy + Gemini fallback
- `usd_argentinadatos.html` — carga USD desde BNA API
- `indices.html` — herramienta original (bugs de scope conocidos)

## Pendientes prioritarios
1. **Gas Oil completo** — `carga_gasoil.html` necesita cargar 28+ períodos (actualmente 7)
2. **IPIM R29** — encontrar seriesId correcto en API INDEC
3. **Módulo actualización mensual** en `index.html` — botón que ejecute todas las fuentes automáticamente
4. **User admin CRUD** — completar módulo `vUsers` contra tabla `app_users`

## Convenciones de versión
El header de `index.html` muestra la versión actual (ej: v0.221). Incrementar al hacer cambios.
