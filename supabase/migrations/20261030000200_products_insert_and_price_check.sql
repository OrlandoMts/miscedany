-- Historia #2: registrar productos.
--  1. authenticated puede insertar en products (sigue sin poder update/delete/truncate).
--  2. El precio debe ser mayor que 0 (la restricción original permitía 0).

grant insert on public.products to authenticated;

create policy products_insert_authenticated on public.products
  for insert
  to authenticated
  with check (true);

-- Si ya hay productos con precio 0, esta sentencia falla: corrígelos o bórralos antes.
alter table public.products drop constraint products_price_check;
alter table public.products add constraint products_price_check check (price > 0);
