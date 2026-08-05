# Búsqueda de Empleo — Neuquén Capital

Herramienta standalone (no tiene nada que ver con el sistema de contratos). Un HTML que compila,
con IA + búsqueda en vivo, avisos de empleo cerca de Neuquén Capital orientados a Seguridad e Higiene
/ Hidrocarburos, y permite exportar a Excel los avisos que tildes.

Archivos:
- `index.html` — la herramienta. Se abre directo en el navegador, sin servidor ni build.
- `supabase-jobs-proxy.ts` — código de la Edge Function que hace la búsqueda con Gemini.
- Este README — pasos de configuración en tu proyecto de Supabase nuevo.

## Por qué hace falta un backend

LinkedIn, Bumeran, etc. bloquean scraping directo desde el navegador (CORS + anti-bot), así que el
compilado real de avisos tiene que hacerse server-side. Para eso se usa una Edge Function de Supabase
que le pide a **Gemini** (con su herramienta de búsqueda de Google activada) que busque avisos vigentes
y los devuelva estructurados. La función además guarda cada aviso en una tabla para poder marcar cuáles
son nuevos desde tu última búsqueda.

## Setup (una sola vez)

### 1. Crear la tabla en Supabase

En tu proyecto nuevo → **SQL Editor** → pegá y ejecutá:

```sql
create table if not exists job_listings (
  url text primary key,
  titulo text,
  empresa text,
  ubicacion text,
  plataforma text,
  fecha_publicacion text,
  requisitos text,
  resumen text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table job_listings enable row level security;
-- Sin políticas: solo la Edge Function (con la service role key) puede leer/escribir.
-- El HTML nunca consulta esta tabla directamente, siempre pasa por la función.
```

### 2. Conseguir una API key de Gemini

Andá a [Google AI Studio](https://aistudio.google.com/apikey) y generá una API key (tiene nivel gratuito).
La búsqueda con Google Search grounding puede tener costo una vez superada la cuota gratuita — revisá el
panel de facturación de tu cuenta de Google AI si vas a usarla seguido.

### 3. Desplegar la Edge Function

En el dashboard de Supabase → **Edge Functions** → **Create a new function** → nombrala `jobs-proxy`
→ pegá el contenido completo de `supabase-jobs-proxy.ts` → **Deploy**.

### 4. Configurar el secret

En **Edge Functions → Manage secrets** (o Project Settings → Edge Functions), agregá:

```
GEMINI_API_KEY = <tu api key de Gemini>
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los inyecta Supabase automáticamente en toda Edge
Function — no hace falta configurarlos a mano.

### 5. Completar el HTML

Abrí `index.html`, buscá el bloque `CONFIG` cerca del final del archivo y completá:

```js
const CONFIG = {
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',   // Project Settings → API → Project URL
  SUPABASE_ANON_KEY: 'TU_ANON_KEY_AQUI',              // Project Settings → API → anon public
  FUNCTION_NAME: 'jobs-proxy'
};
```

Guardá el archivo. Listo.

## Uso

1. Abrí `index.html` en el navegador (doble clic, no necesita servidor).
2. Ajustá el texto de "Perfil de búsqueda" si querés afinar qué busca (se guarda solo en tu navegador).
3. Tocá **🔄 Buscar novedades**. Tarda entre ~20 y 40 segundos porque busca en vivo.
4. Los avisos que no viste en una búsqueda anterior aparecen con el badge **NUEVO**.
5. Tildá los que te interesan y tocá **⬇️ Descargar Excel** para bajar un `.xlsx` con puesto, empresa,
   ubicación, plataforma, fecha, link, requisitos y resumen de cada uno.

## Notas

- Los resultados los genera un modelo de IA a partir de una búsqueda real; siempre confirmá el aviso
  original (el link) antes de postularte, por si algo quedó desactualizado.
- El `anon key` de Supabase es seguro de dejar en el HTML (es la clave pública estándar); la tabla no
  tiene políticas públicas, así que nadie puede leer/escribir en `job_listings` salvo la Edge Function.
- Si algún día el modelo `gemini-2.5-flash` deja de estar disponible, cambiá el valor de
  `GEMINI_MODEL` en `supabase-jobs-proxy.ts` y volvé a desplegar la función.
