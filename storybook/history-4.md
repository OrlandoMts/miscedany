# Historia: #4 (propuesta, pendiente de aprobación)

## Historia

Como administrador, quiero crear cuentas de vendedor, para que mi equipo pueda usar el sistema.

## Criterios de aceptación

- [ ] Dado que soy administrador y estoy en la pantalla de vendedores, cuando ingreso nombre, un correo válido y una contraseña de al menos 6 caracteres y guardo, entonces veo una confirmación y esa persona puede iniciar sesión con ese correo y contraseña.
- [ ] Dado que estoy creando una cuenta de vendedor, cuando dejo el nombre vacío, pongo un correo inválido o ya registrado, una contraseña de menos de 6 caracteres, o el guardado falla, entonces veo un mensaje de error y la cuenta no se crea.
- [ ] Dado que no soy administrador (por ejemplo, una cuenta de vendedor), cuando intento crear una cuenta de vendedor, entonces se rechaza y no se crea nada.

## Plan

- Distinguir el rol en la base de datos (administrador o vendedor), con nombre por usuario. La cuenta que ya existe queda como administrador y toda cuenta nueva creada desde la app es vendedor.
- Pantalla de vendedores con formulario (nombre, correo, contraseña), validaciones y mensajes de error en español; la contraseña la define el administrador.
- La creación de la cuenta ocurre en el servidor, con una función que comprueba que quien llama es administrador y crea el usuario con la clave de servicio, que nunca llega al navegador.
- Cerrar la brecha anotada en la #2: solo un administrador puede insertar productos (la política de `insert` de `products` pasa a exigir el rol).
- Verificar a mano contra Supabase real: crear un vendedor, iniciar sesión con él, y comprobar que no puede crear cuentas ni productos.

## Fuera de alcance

- Listar, editar, desactivar o borrar cuentas de vendedor.
- Restablecer contraseñas o enviar invitaciones por correo.
- Ocultar pantallas o funciones de administrador a los vendedores en la interfaz (historia #6).
- Que el vendedor consulte el stock (historia #5).
- Cerrar sesión.
- Desactivar los sign-ups públicos en Supabase (pendiente aparte, antes de uso real).

## Sugerencias (tú decides)

- `App` ya decide por sí sola qué mostrar según la sesión, y esta historia agrega una segunda pantalla (inventario y vendedores). Conviene una navegación mínima entre ambas, sin librería de rutas, hasta que la #6 lo exija.
- Los tests nuevos necesitarán sesión de administrador, igual que los de `Inventory`; reutilizar el mismo patrón de mocks en un archivo de tests propio para la pantalla de vendedores.
- El mínimo de 6 caracteres es el de Supabase por defecto; si quieres uno más estricto, se decide ahora.
