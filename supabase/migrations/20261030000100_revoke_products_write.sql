-- La escritura sobre products no debe depender solo de la ausencia de políticas RLS.
-- authenticated queda con select únicamente; los permisos de escritura se conceden
-- en la historia #2 (registrar productos).

revoke insert, update, delete, truncate on public.products from authenticated;
