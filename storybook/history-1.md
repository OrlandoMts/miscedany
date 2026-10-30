# Historia en curso: #1

## Historia

Como administrador, quiero iniciar sesión con mi correo y contraseña, para acceder a mi inventario de forma protegida.

## Criterios de aceptación

- [ ] Dado que no he iniciado sesión, cuando abro la app, entonces veo la pantalla de inicio de sesión y no puedo ver el inventario.
- [ ] Dado que tengo una cuenta de administrador, cuando inicio sesión con mi correo y contraseña correctos, entonces veo el inventario con la lista de productos (vacía si aún no hay ninguno).
- [ ] Dado que estoy en la pantalla de inicio de sesión, cuando ingreso un correo o una contraseña incorrectos, entonces veo un mensaje de error y sigo sin acceso al inventario.

## Plan

- Crear el proyecto React + TypeScript con Vite, conectado a un proyecto de Supabase y con un entorno de tests listo.
- Crear la tabla de productos (nombre, precio, stock) en Supabase, legible solo por usuarios autenticados.
- Pantalla de inicio de sesión con correo y contraseña usando la autenticación de Supabase, con mensaje de error si las credenciales son incorrectas.
- Pantalla de inventario protegida que muestra la lista de productos, con un estado vacío.

## Fuera de alcance

- Registrar productos (historia #2), incluidas sus validaciones.
- Distinguir roles: por ahora, todo usuario autenticado se trata como administrador.
- Crear cuentas desde la app: la cuenta del administrador se crea a mano en el panel de Supabase.
- Cerrar sesión, recuperar contraseña.

## Sugerencias (tú decides)

- Ninguna por ahora: no hay código en el que apoyar una sugerencia.
