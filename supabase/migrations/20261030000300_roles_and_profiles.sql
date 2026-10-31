-- Historia #4: roles (administrador y vendedor) y nombre por usuario.
--  1. Tabla profiles: un perfil por usuario de auth, con nombre y rol.
--  2. Las cuentas que ya existen quedan como administrador.
--  3. Solo un administrador puede insertar en products (antes, cualquier autenticado).
--
-- Los perfiles de vendedor los crea la Edge Function create-seller con la clave de servicio
-- (que se salta RLS). Desde la app nadie puede insertar, actualizar ni borrar perfiles.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  role text not null check (role in ('admin', 'seller')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario lee solo su propio perfil (la app lo usará para conocer su rol).
create policy profiles_select_own on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Supabase concede permisos por defecto sobre las tablas nuevas: se dejan solo los necesarios.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- Las cuentas existentes se tratan como administrador (hasta hoy todo autenticado lo era).
insert into public.profiles (id, name, role)
select id, coalesce(nullif(btrim(raw_user_meta_data ->> 'name'), ''), email, 'Administrador'), 'admin'
from auth.users;

-- Solo un administrador inserta productos. La subconsulta corre con los permisos del
-- usuario y profiles_select_own le deja ver su propia fila, así que no hace falta
-- una función security definer. El select de products sigue abierto a todo autenticado
-- (los vendedores consultan el stock en la historia #5).
drop policy products_insert_authenticated on public.products;

create policy products_insert_admin on public.products
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

-- Verificación manual (ejecutar después, reemplazando el UUID por el de un usuario):
--   select id, name, role from public.profiles;                      -- tu cuenta aparece como admin
--   select policyname, cmd from pg_policies where tablename = 'products';
--     -- products_select_authenticated (SELECT) y products_insert_admin (INSERT)
--   Con el JWT de un vendedor, insertar en products debe fallar por RLS.
