# Mitigación rápida de auth — pasos en Supabase

Hoy `loginApp()` lee `password_hash` de `app_users` directo con la `anon key`
pública (la que está en `src/js/01-config.js`). Cualquiera con esa key —
visible en el código que sirve GitHub Pages — puede pedir esa columna por
REST sin loguearse. Esta Edge Function mueve la verificación de contraseña
al servidor, así el frontend deja de necesitar leer `password_hash`.

**No cambia contraseñas de nadie.** Mismo hash SHA-256 que ya usa la tabla.

## Orden exacto (importante no saltear pasos)

### 1. Deployar la función
En el dashboard de Supabase → **Edge Functions** → **Deploy a new function**
→ nombre `auth-login` → pegar el contenido de `index.ts` de esta carpeta.

(O por CLI si la tenés instalada: `supabase functions deploy auth-login`
parado en la raíz del repo.)

No hace falta configurar ningún secret a mano — `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente para toda
Edge Function del proyecto.

### 2. Probarla ANTES de tocar nada más
Con un usuario real que ya exista en `app_users`:

```bash
curl -X POST 'https://upxsqroxbvzwudcaklvn.supabase.co/functions/v1/auth-login' \
  -H 'Content-Type: application/json' \
  -H 'apikey: TU_ANON_KEY' \
  -d '{"username":"tu_usuario","password":"tu_contraseña"}'
```

Tiene que devolver `{"id":...,"username":"...","role":"..."}`. Probá también
con una contraseña incorrecta — tiene que devolver 401 sin datos del hash.

### 3. Avisame
Cuando confirmes que el paso 2 funcionó, te aviso a mí y yo cambio
`loginApp()` en `src/js/02-supabase-auth.js` para que llame a esta función
en vez de leer `password_hash` directo, y lo mergeo. **No lo hago antes**
porque si el frontend cambia antes de que la función esté deployada, nadie
puede loguearse — incluida vos.

### 4. Recién ahí, cerrar el RLS de `app_users`
Una vez que el frontend ya esté usando `auth-login` (paso 3 confirmado y
en producción), en el **SQL Editor** de Supabase:

```sql
-- Saca al rol anon el permiso de leer password_hash directo.
-- Ajustá el nombre de policy si ya tenés una distinta para SELECT en app_users.
drop policy if exists "Enable read access for all users" on app_users;

create policy "app_users_select_no_hash" on app_users
  for select
  to anon
  using (true);
-- Postgres no tiene "column-level RLS" nativo en una sola policy simple;
-- la forma robusta es una vista sin password_hash que sí sea pública, y
-- dejar la tabla base solo accesible por service_role:

revoke select on app_users from anon;

create or replace view app_users_public as
  select id, username, role, active from app_users;

grant select on app_users_public to anon;
```

Si el resto de la app (admin de usuarios, etc.) necesita leer otras
columnas de `app_users` con la sesión ya iniciada, avisame qué pantallas
son y ajusto esas consultas para que usen `app_users_public` en vez de
`app_users` directo — así no rompemos el módulo de Usuarios de rebote.

## Qué NO hace esto (para más adelante, aparte)

- No migra a `supabase.auth` real — sigue siendo un sistema de usuarios
  propio, solo que la verificación ya no es 100% client-side.
- No cambia el algoritmo de hashing (SHA-256 sin sal → algo como
  bcrypt/argon2 con sal por usuario). Es la mejora natural del próximo
  paso, pero requiere reescribir `password_hash` de cada usuario existente.
