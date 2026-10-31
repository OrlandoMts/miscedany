-- Historia #3: el administrador puede editar el precio y el stock de un producto.
--  1. authenticated recibe update solo sobre price y stock (el nombre no se edita).
--  2. La política limita el update a los administradores, con el mismo patrón que el insert.
-- Sigue sin poder hacer delete ni truncate.

grant update (price, stock) on public.products to authenticated;

create policy products_update_admin on public.products
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

-- Verificación manual (después de ejecutar):
--   select policyname, cmd from pg_policies where tablename = 'products';
--     -- debe aparecer products_update_admin (UPDATE)
--   Con el JWT de un administrador, cambiar price y stock funciona y se conserva al recargar.
--   Con el JWT de un vendedor, el update no cambia ninguna fila (RLS) y el producto queda igual.
--   Intentar actualizar name con cualquier usuario debe fallar por falta de privilegio.
