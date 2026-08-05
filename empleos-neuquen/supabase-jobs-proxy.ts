// Edge Function: jobs-proxy
// Deploy en el proyecto de Supabase NUEVO (el que creaste para esto, separado de contratoste).
// Pasos de despliegue y variables necesarias: ver README.md en esta misma carpeta.
//
// Qué hace:
// 1. Recibe { profile: string } desde el HTML.
// 2. Le pide a Gemini (con la tool de búsqueda de Google activada) que busque avisos de
//    empleo reales y actuales que matcheen el perfil, y que devuelva un JSON con la lista.
// 3. Guarda/actualiza esos avisos en la tabla `job_listings` (dedupe por URL) y marca
//    como "nuevo" lo que no existía en una búsqueda anterior.
// 4. Devuelve { items: [...], generated_at } al HTML.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
// Supabase inyecta esta variable automáticamente en toda Edge Function.
// Según la generación de API keys del proyecto puede llamarse SUPABASE_SERVICE_ROLE_KEY
// (esquema clásico) o SUPABASE_SECRET_KEY (esquema nuevo "publishable/secret") — probamos ambas.
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

function buildPrompt(profile: string, todayIso: string): string {
  return `Actuás como un buscador de empleo especializado en Argentina, cuenca neuquina / Vaca Muerta.
Hoy es ${todayIso}.

Usá la herramienta de búsqueda de Google para encontrar avisos de empleo REALES, PUBLICADOS EN LOS ÚLTIMOS 30 DÍAS,
en plataformas como LinkedIn, Bumeran, Computrabajo, ZonaJobs, Indeed Argentina, Konzerta, Multitrabajo,
y portales de empleo de operadoras petroleras (YPF, TotalEnergies, Vista Energy, Tecpetrol, Pan American Energy,
Pluspetrol, Shell, Capex, Wintershall Dea) y empresas de servicios petroleros de la zona.

Perfil de la persona que busca trabajo:
${profile}

Buscá específicamente avisos que matcheen ese perfil: puestos de campo, analista, auxiliar o junior en
Seguridad e Higiene / SSO / HSE / Medio Ambiente / Hidrocarburos / Petróleo y Gas, ubicados en o cerca de
Neuquén Capital (incluye localidades de la cuenca: Añelo, Plaza Huincul, Cutral Có, Rincón de los Sauces,
Centenario, Plottier, Vaca Muerta en general).

Reglas importantes:
- Solo incluí avisos que hayas encontrado realmente en la búsqueda, con URL real y verificable. NO inventes avisos ni links.
- Si un aviso no tiene fecha visible, poné "" en fecha_publicacion (no inventes una fecha).
- Máximo 25 avisos, priorizando los más relevantes y recientes.
- Si no encontrás avisos relevantes, devolvé un array vacío.

Cuando termines de buscar, tu ÚLTIMA respuesta debe ser ÚNICAMENTE un bloque de código \`\`\`json con un array de objetos,
sin ningún texto antes ni después, con este formato exacto por cada aviso:

\`\`\`json
[
  {
    "titulo": "string",
    "empresa": "string",
    "ubicacion": "string",
    "plataforma": "string (ej: LinkedIn, Bumeran, Computrabajo, sitio de la empresa, etc.)",
    "url": "string (link directo al aviso)",
    "fecha_publicacion": "string, tal como la encontraste (o vacío)",
    "requisitos": "string, resumen de los requisitos principales del puesto",
    "resumen": "string, 1-2 líneas describiendo el puesto"
  }
]
\`\`\``;
}

function extractJsonArray(text: string): any[] | null {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function callGeminiWithSearch(prompt: string): Promise<string> {
  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.25 },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini (search) HTTP ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('\n') || '';
  if (!text) throw new Error('Gemini no devolvió texto en la respuesta.');
  return text;
}

// Segunda pasada: si el texto grounded no vino en JSON limpio, le pedimos a Gemini
// (sin tools, con salida estructurada) que lo reformatee.
async function coerceToJson(rawText: string): Promise<any[]> {
  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Convertí el siguiente texto en un array JSON válido de avisos de empleo, con los campos
titulo, empresa, ubicacion, plataforma, url, fecha_publicacion, requisitos, resumen (todos string).
Si un dato no está disponible, usá "". No agregues avisos que no estén en el texto.

TEXTO:
"""${rawText}"""`,
        }],
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              titulo: { type: 'STRING' },
              empresa: { type: 'STRING' },
              ubicacion: { type: 'STRING' },
              plataforma: { type: 'STRING' },
              url: { type: 'STRING' },
              fecha_publicacion: { type: 'STRING' },
              requisitos: { type: 'STRING' },
              resumen: { type: 'STRING' },
            },
            required: ['titulo', 'url'],
          },
        },
      },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini (coerce) HTTP ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '[]';
  return JSON.parse(text);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS });
  }
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Falta configurar el secret GEMINI_API_KEY en este proyecto de Supabase.' }), { status: 500, headers: JSON_HEADERS });
  }

  try {
    const { profile } = await req.json();
    if (!profile || typeof profile !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta "profile" en el body.' }), { status: 400, headers: JSON_HEADERS });
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const rawText = await callGeminiWithSearch(buildPrompt(profile, todayIso));

    let items = extractJsonArray(rawText);
    if (!items) items = await coerceToJson(rawText);

    // Normalizamos y descartamos items sin URL (no verificables).
    items = items
      .filter((it: any) => it && it.url)
      .map((it: any) => ({
        titulo: it.titulo || '',
        empresa: it.empresa || '',
        ubicacion: it.ubicacion || '',
        plataforma: it.plataforma || '',
        url: String(it.url).trim(),
        fecha_publicacion: it.fecha_publicacion || '',
        requisitos: it.requisitos || '',
        resumen: it.resumen || '',
      }));

    // Dedupe por URL dentro de la misma respuesta.
    const seenUrls = new Set<string>();
    items = items.filter((it) => {
      if (seenUrls.has(it.url)) return false;
      seenUrls.add(it.url);
      return true;
    });

    let isNewMap = new Map<string, boolean>();

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && items.length) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const urls = items.map((it) => it.url);

      const { data: existing } = await supabase
        .from('job_listings')
        .select('url')
        .in('url', urls);

      const existingUrls = new Set((existing || []).map((r: any) => r.url));
      items.forEach((it) => isNewMap.set(it.url, !existingUrls.has(it.url)));

      const nowIso = new Date().toISOString();
      const upsertRows = items.map((it) => ({
        url: it.url,
        titulo: it.titulo,
        empresa: it.empresa,
        ubicacion: it.ubicacion,
        plataforma: it.plataforma,
        fecha_publicacion: it.fecha_publicacion,
        requisitos: it.requisitos,
        resumen: it.resumen,
        last_seen_at: nowIso,
      }));

      await supabase.from('job_listings').upsert(upsertRows, { onConflict: 'url' });
    } else {
      // Sin tabla configurada: no podemos saber qué es "nuevo", tratamos todo como nuevo.
      items.forEach((it) => isNewMap.set(it.url, true));
    }

    const responseItems = items.map((it) => ({ ...it, is_new: isNewMap.get(it.url) ?? false }));

    return new Response(JSON.stringify({
      items: responseItems,
      generated_at: new Date().toISOString(),
    }), { status: 200, headers: JSON_HEADERS });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: JSON_HEADERS });
  }
});
