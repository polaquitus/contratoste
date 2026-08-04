// Edge Function: auth-login
// ─────────────────────────────────────────────────────────────────────────
// Valida usuario/contraseña del lado del servidor usando la service_role
// key (nunca expuesta al navegador), así el frontend deja de necesitar
// leer `password_hash` con la anon key pública.
//
// Reemplaza el SELECT directo que hacía loginApp() en
// src/js/02-supabase-auth.js contra la tabla `app_users`. Mismo esquema de
// hash (SHA-256 hex, sin sal) que ya usa la tabla hoy — esto es la
// mitigación rápida (cerrar el acceso público a password_hash), no todavía
// la migración a supabase.auth real ni a un hashing más fuerte (bcrypt/
// argon2 con sal por usuario), que quedan como mejora aparte.
//
// Deploy: supabase functions deploy auth-login
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están disponibles como env
// vars automáticas en toda Edge Function del proyecto, no hace falta
// configurar secrets a mano.)
//
// Después de deployar y probar esta función, hay que restringir el RLS de
// `app_users` para que el rol `anon` ya no pueda leer `password_hash` por
// REST directo — ver PASOS_MIGRACION.md en esta misma carpeta.

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '').trim();
  if (!username || !password) return json({ error: 'Ingresá usuario y contraseña' }, 400);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('auth-login: faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno de la función');
    return json({ error: 'Error de configuración del servidor' }, 500);
  }

  // service_role bypassa RLS — esta es la única pieza del sistema que debe
  // poder leer password_hash, y corre server-side, nunca en el navegador.
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/app_users?select=id,username,password_hash,role,active&username=eq.${encodeURIComponent(username)}&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );
  if (!resp.ok) {
    console.error('auth-login: fallo consultando app_users', resp.status, await resp.text());
    return json({ error: 'Error al validar credenciales' }, 500);
  }
  const rows = await resp.json();
  const row = rows?.[0];

  // Mismo mensaje genérico tanto si el usuario no existe como si la
  // contraseña es incorrecta — no dar pistas de qué usuarios existen.
  const invalid = () => json({ error: 'Usuario o contraseña inválidos' }, 401);

  if (!row) return invalid();
  if (row.active === false || String(row.active) === 'false') return json({ error: 'Usuario inactivo' }, 403);

  const hash = await sha256Hex(password);
  if (hash.toLowerCase() !== String(row.password_hash || '').toLowerCase()) return invalid();

  return json({ id: row.id ?? row.username, username: row.username, role: row.role || 'SIN_ROL' });
});
