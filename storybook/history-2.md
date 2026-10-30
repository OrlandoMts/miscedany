# Historia en curso: #2

## Historia

Como administrador, quiero registrar productos con su nombre, precio y stock, para tener mi inventario en el sistema.

## Criterios de aceptación

- [ ] Dado que estoy en el inventario, cuando ingreso un nombre, un precio mayor que 0 y un stock entero mayor o igual a 0 y guardo, entonces el producto aparece en la lista con esos datos y sigue ahí al recargar la página.
- [ ] Dado que estoy registrando un producto, cuando dejo el nombre vacío, pongo un precio menor o igual a 0, o un stock vacío, negativo o no entero, entonces veo un mensaje de error y el producto no se crea.
- [ ] Dado que ya existe un producto llamado "Camisa", cuando registro otro producto con el mismo nombre, entonces se crea y ambos aparecen en la lista.
- [ ] Dado que ingreso un producto válido, cuando el guardado falla (red o base de datos), entonces veo el mensaje "No se pudo guardar el producto" y el producto no aparece en la lista.

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
