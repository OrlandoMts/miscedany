## Story

Como administrador, quiero editar el precio y ajustar el stock de un producto, para mantener el inventario al día.

## Criterios de aceptación

- [ ] Dado un producto en la lista, cuando el administrador cambia su precio y/o stock y guarda, entonces la lista muestra los valores nuevos y el cambio se conserva al recargar.
- [ ] Dado que edita un producto, cuando el precio no es mayor que 0 o el stock no es un entero mayor o igual a 0, entonces ve el mismo mensaje de error que al crear y no se guarda nada.
- [ ] Dado que un vendedor intenta modificar un producto, cuando envía el cambio, entonces la base de datos lo rechaza y el producto no cambia.

## Plan

- Base de datos: permitir `update` en productos solo al administrador, con el mismo patrón de roles que el `insert`. La restricción de precio > 0 ya existe.
- Cada fila de la lista tiene un modo de edición con precio y stock, y las acciones guardar y cancelar.
- Las validaciones son las mismas reglas acordadas en la #2. Un error al guardar muestra un mensaje y deja la fila en edición.
- Al guardar bien, se recarga la lista.

## Decisiones

- El stock se ajusta escribiendo el valor nuevo (no sumando ni restando).
- El nombre no se edita.
- La edición se hace en la fila de la lista, no reutilizando el formulario de creación.

### Añadido durante la historia (del `/code-review`)

- **Orden de la lista:** `loadProducts` pide los productos con `.order('id')` (antes, orden natural). Sin orden, un producto editado saltaba al final de la lista, porque Postgres devuelve las filas en orden físico y el `update` las mueve. No estaba en el plan; el orden por `id` es el de creación.
- **Solo campos cambiados:** el `update` envía solo `price` y/o `stock` si cambiaron, para no pisar un stock modificado por otra operación. Sin cambios, "Guardar" sale de edición sin llamar a `update`.
- **Update bloqueado por RLS:** RLS no devuelve error, afecta 0 filas. El `update` pide `.select('id')` y trata una respuesta vacía como fallo.
- **Guardado en curso:** `isSaving` deshabilita "Guardar" y todos los "Editar". La fila sigue en edición hasta que llega la lista recargada, y un fallo al recargar no se muestra como fallo al guardar.
- **Errores de edición:** estado propio (`editError`), visible dentro de la fila; se limpia al cancelar o al abrir otra fila.

## Fuera de alcance

- Editar el nombre del producto.
- Borrar productos.
- Historial de ajustes de stock o motivo del ajuste.
- Ocultar la edición a los vendedores en la interfaz (es la #6); aquí solo se protege en la base de datos.

## Sugerencias (tú decides)

- Las validaciones de precio y stock ya están en `handleSubmit`. Con la edición se repetirían, así que conviene extraerlas a una función compartida.
- El criterio 3 se verifica a mano en Supabase, porque los tests mockean el cliente y no ejercen RLS.
