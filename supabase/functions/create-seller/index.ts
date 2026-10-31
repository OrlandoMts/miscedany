// Historia #4: crea una cuenta de vendedor. Solo puede llamarla un administrador.
//
// Despliegue (a mano, como las migraciones): Supabase > Edge Functions > Deploy a new function
// > Via Editor, nombre `create-seller`, y pega este archivo. Déjala con "Verify JWT" activado.
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY ya las inyecta Supabase.
//
// Contrato con la app (src/Sellers.tsx):
//   entrada:  { name, email, password }
//   200       { id }
//   409       { error: 'email_exists' }   el correo ya está registrado
//   400/401/403/500  { error: '<código>' } cualquier otro fallo (la app muestra un mensaje genérico)
//
// Requiere la migración 20261030000300_roles_and_profiles.sql (tabla public.profiles).

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return respond(405, { error: 'method_not_allowed' })

  const url = Deno.env.get('SUPABASE_URL')!
  const authorization = req.headers.get('Authorization') ?? ''

  // 1. Quién llama: se valida el token con Supabase Auth, no se confía en el cuerpo.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData, error: userError } = await caller.auth.getUser()
  if (userError || !userData.user) return respond(401, { error: 'unauthorized' })

  // 2. Solo un administrador. A partir de aquí se usa la clave de servicio (salta RLS).
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profileError) return respond(500, { error: 'server_error' })
  if (profile?.role !== 'admin') return respond(403, { error: 'forbidden' })

  // 3. Datos: se validan de nuevo en el servidor (la validación de la app no es una barrera).
  let body: { name?: unknown; email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return respond(400, { error: 'invalid_body' })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  // Mismos límites que el formulario (src/Sellers.tsx); 72 es el tope de bcrypt.
  if (
    !name ||
    name.length > 100 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 72
  ) {
    return respond(400, { error: 'invalid_data' })
  }

  // 4. Crear el usuario (ya confirmado: el administrador entrega la contraseña).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })
  if (createError || !created.user) {
    if (createError?.code === 'email_exists') return respond(409, { error: 'email_exists' })
    return respond(500, { error: 'create_user_failed' })
  }

  // 5. Su perfil como vendedor. Si falla, se borra el usuario para no dejar una cuenta sin rol.
  const { error: insertError } = await admin
    .from('profiles')
    .insert({ id: created.user.id, name, role: 'seller' })
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return respond(500, { error: 'create_profile_failed' })
  }

  return respond(200, { id: created.user.id })
})
