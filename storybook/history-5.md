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
