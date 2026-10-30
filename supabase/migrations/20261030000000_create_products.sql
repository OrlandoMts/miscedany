-- Historia #1: tabla de productos del inventario, legible solo por usuarios autenticados.

create table public.products (
  id bigint generated always as identity primary key,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Por ahora todo usuario autenticado se trata como administrador (solo lectura).
-- Sin políticas de insert/update/delete: la escritura llega con la historia #2.
create policy products_select_authenticated on public.products
  for select
  to authenticated
  using (true);

revoke all on public.products from anon;
