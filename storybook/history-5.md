# Historia: #5a (aprobada)

Nota: la #5 original se dividió. La #5a (esta) cubre el inicio de sesión del vendedor y la consulta de stock. El menú por rol con React Router, layout y rutas protegidas pasa a la #5b:

> **5b.** Como usuario, quiero un menú que me muestre solo las secciones de mi rol, para no ver opciones que no puedo usar. Incluye React Router, un layout con menú y rutas protegidas. Requires: #5a

## Historia

Como vendedor, quiero iniciar sesión y consultar el stock disponible, para saber qué puedo vender.

## Criterios de aceptación

- [ ] Dada una cuenta de vendedor creada por el administrador, cuando inicio sesión con mi correo y contraseña, entonces entro a la app y veo la lista de productos con nombre, precio y stock.
- [ ] Dado que soy vendedor y estoy viendo el stock, cuando reviso la pantalla, entonces no veo el formulario para crear productos, ni el botón de editar, ni la sección de vendedores.
- [ ] Dado que soy administrador, cuando inicio sesión, entonces todo sigue igual que hoy: inventario con alta y edición, y la pantalla de vendedores.

## Plan

- Al iniciar sesión, la app lee el rol del usuario desde su perfil (que ya existe en la base de datos) y lo usa para decidir qué mostrar.
- Inventario recibe el rol: el vendedor ve solo la lista (consulta), y el administrador ve además el formulario y la edición.
- La navegación muestra "Vendedores" solo al administrador. El vendedor ve únicamente el stock.
- Las políticas de la base de datos ya permiten leer productos a cualquier autenticado y bloquean el alta y la edición a quien no es administrador, así que no hace falta migración nueva.
- Verificar a mano contra Supabase real: entrar con un vendedor, ver el stock y comprobar que no hay controles de administrador.

## Fuera de alcance

- Router, layout con menú y rutas protegidas (historia 5b).
- Bloquear el acceso por URL o proteger rutas: aquí solo se ocultan controles según el rol (la protección real sigue siendo la base de datos; el resto, en la #6).
- Cerrar sesión.
- Buscar o filtrar productos.
- Avisos de stock bajo.
- Registrar ventas (#7).

## Sugerencias (tú decides)

- `Inventory` mezcla la lista, el alta y la edición en un solo componente. Con el rol como prop alcanza para esta historia. Extraer una lista de solo lectura sería prematuro hasta que haya un segundo lugar que la use, por ejemplo la pantalla de ventas de la #7.
- Si el perfil no se puede leer o no existe, la app trata al usuario como sin rol y no muestra nada de administrador (el valor por defecto más seguro).

## Resumen (historia terminada)

**Qué se hizo**
- `App` guarda el id del usuario de la sesión y lee su rol de `profiles.role`. Solo acepta `'admin'` o `'seller'`; cualquier otro valor, o un fallo al leerlo, es `null`. El tipo `Role` está en `Inventory.tsx`.
- `Inventory` recibe el rol como prop. Solo el administrador ve el formulario de alta, el botón Editar y la columna de acciones. El vendedor, o quien no tiene rol, ve únicamente la lista con nombre, precio y stock.
- El botón "Vendedores" y la pantalla `Sellers` solo se muestran al administrador. Al cambiar de usuario se vuelve a Inventario.
- La respuesta tardía del perfil de un usuario anterior se descarta, y un fallo de la consulta (error o excepción) no deja errores sin manejar.
- Sin migraciones nuevas: las políticas de la historia #4 ya protegían el alta y la edición de productos.

**Tests:** 85 en total (`npm test`) y `npx tsc -b` limpio. Los 5 de la historia están en `App.test.tsx` (1 a 3, vendedor y administrador; 4 y 5, perfil que falla o que aún carga) y la revisión añadió 3 en `App.test.tsx` y 2 en `Inventory.test.tsx`.
- Los tests 3, 4 y 5 de la lista pasaron de entrada porque el código ya los cumplía; se comprobó con mutaciones que detectan la regresión.
- Se arregló un test existente que dependía del orden de las promesas (esperar el botón "Vendedores" con `findByRole`).

**Verificación manual:** hecha contra Supabase real (administrador y vendedor).

**Revisión (`/code-review`):** se corrigieron los hallazgos 1 a 7: pantalla de vendedores visible tras cambiar de usuario, respuesta tardía del perfil, excepción sin manejar, columna de acciones vacía, tipo del rol, tests de `Inventory` por rol y `CLAUDE.md`.

**Decisiones**
- Si falla la lectura del perfil no se muestra ningún mensaje: el usuario queda sin controles de administrador.
- No hay estado de "cargando rol": mientras llega, la vista es la del vendedor, sin controles (solo estético).
- La interfaz solo oculta controles; la protección real está en RLS y en la función `create-seller`, que exige ser administrador.

**Pendiente (fuera de esta historia)**
- 5b: menú por rol con React Router, layout y rutas protegidas.
- 5c: botón de cerrar sesión.
