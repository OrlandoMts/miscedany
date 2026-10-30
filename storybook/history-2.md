# Historia: #2 (terminada)

## Historia

Como administrador, quiero registrar productos con su nombre, precio y stock, para tener mi inventario en el sistema.

## Criterios de aceptación

- [x] Dado que estoy en el inventario, cuando ingreso un nombre, un precio mayor que 0 y un stock entero mayor o igual a 0 y guardo, entonces el producto aparece en la lista con esos datos y sigue ahí al recargar la página.
- [x] Dado que estoy registrando un producto, cuando dejo el nombre vacío, pongo un precio menor o igual a 0, o un stock vacío, negativo o no entero, entonces veo un mensaje de error y el producto no se crea.
- [x] Dado que ya existe un producto llamado "Camisa", cuando registro otro producto con el mismo nombre, entonces se crea y ambos aparecen en la lista.
- [x] Dado que ingreso un producto válido, cuando el guardado falla (red o base de datos), entonces veo el mensaje "No se pudo guardar el producto" y el producto no aparece en la lista.

## Plan

- Formulario de nuevo producto (nombre, precio, stock) en la pantalla de inventario, con las validaciones acordadas y mensajes de error. El stock es obligatorio, sin valor por defecto.
- Guardar el producto en Supabase al enviar el formulario válido y refrescar la lista para que aparezca; si el guardado falla, mostrar un mensaje genérico.
- Permitir a los usuarios autenticados insertar en `products` y no modificar ni borrar, con una nueva migración.
- Que la base de datos también exija precio mayor que 0, ajustando la restricción actual (hoy permite 0).
- Verificar a mano contra Supabase real que un producto guardado persiste y que las reglas se aplican en la base de datos.

## Fuera de alcance

- Editar el precio o ajustar el stock de un producto existente (historia #3).
- Eliminar productos.
- Distinguir roles: sigue valiendo que todo usuario autenticado es administrador.
- Buscar, ordenar o paginar la lista.
- Mensajes distintos según la causa de un fallo de red o de base de datos al guardar.
- Foto o icono del producto (historia aparte, si se decide).

## Sugerencias (tú decides)

- Los tests de la historia #1 repiten el mismo bloque para iniciar sesión, y esta historia agregaría más tests que también necesitan sesión. Se puede extraer a una función auxiliar de tests antes de empezar, como refactor aparte y con los tests en verde.

## Resumen

**Terminada el 2026-10-30.** Los cuatro criterios cumplen: 29 tests automáticos en verde en total (los de la historia #1 incluidos), la migración ejecutada y verificada en el SQL Editor, y la verificación manual en la app contra Supabase real.

### Qué se hizo

- **Formulario de nuevo producto** en el inventario (nombre, precio, stock), con validación propia y mensajes en español.
- **Guardado en Supabase** con refresco de la lista; el formulario se limpia al guardar bien y conserva lo escrito si falla.
- **Migración** `20261030000200_products_insert_and_price_check.sql`: `insert` para `authenticated` (con política RLS) y restricción `price > 0`. `update`, `delete` y `truncate` siguen sin concederse; `anon` no accede.

### Decisiones tomadas

- El stock es obligatorio, sin valor por defecto.
- Si el guardado falla, un solo mensaje genérico: "No se pudo guardar el producto".
- El nombre se guarda sin espacios al inicio ni al final. Lo recorta la aplicación, no la base de datos.
- Los nombres repetidos se permiten, también a nivel de base de datos (sin `unique`).
- Botón deshabilitado mientras guarda; campos limpios al guardar bien.
- Los errores de validación salen de uno en uno, en este orden: nombre, precio, stock.

### Tests

- 11 tests planificados (validaciones, guardado, nombres repetidos, fallo, limpieza, botón) y 4 añadidos durante la historia: nombre sin espacios, error anterior no visible tras guardar bien y, tras el `/code-review`, excepción del `insert` y limpieza con la lista aún cargando.
- Los tests que nacían en verde (nombres repetidos, fallo y lista) se comprobaron con una mutación temporal del código.
- Helpers de tests: `rellenarProducto` y `listaDeProductos` (`src/App.test.tsx`).

### Para el backlog (del `/code-review`)

- **Roles en la política de `insert`:** hoy cualquier usuario autenticado puede crear productos. Resolverlo antes de crear la primera cuenta de vendedor (historia #4) o junto con la #6.
- **Error al cargar la lista:** una carga fallida se ve como "No hay productos todavía".
- **Del `/code-review` de la historia #1**, aún pendientes: cerrar sesión, errores de login distintos según la causa, validar las variables de entorno y `select('*')` sin orden ni límite.
- **Foto o icono del producto** como historia aparte, si se decide (usaría Supabase Storage).
- **Desactivar los sign-ups públicos** en Supabase antes de usar la app en real.
