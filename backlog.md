# Ventas e inventario

## Contexto

Aplicación web para registrar las ventas diarias y controlar el inventario de un negocio. Hay dos roles: administrador y vendedor.
Stack: React + TypeScript (Vite), Supabase (base de datos y autenticación)
Decisiones costosas: modelo de roles (administrador y vendedor). Sin multi-tienda, sin modo offline, un solo idioma y una sola moneda.

## Backlog

1. Como administrador, quiero iniciar sesión con mi correo y contraseña, para acceder a mi inventario de forma protegida.
2. Como administrador, quiero registrar productos con su nombre, precio y stock, para tener mi inventario en el sistema. Requires: #1
   - Validaciones acordadas: nombre obligatorio, precio mayor que 0, stock entero mayor o igual a 0, se permiten nombres repetidos.
3. Como administrador, quiero editar el precio y ajustar el stock de un producto, para mantener el inventario al día. Requires: #2
4. Como administrador, quiero crear cuentas de vendedor, para que mi equipo pueda usar el sistema. Requires: #1
5. Como vendedor, quiero iniciar sesión y consultar el stock disponible, para saber qué puedo vender. Requires: #4
   - Como usuario, quiero un menú que me muestre solo las secciones de mi rol". Incluiría el router (React Router), un layout con menú y rutas protegidas
6. Como administrador, quiero que los vendedores solo accedan a sus funciones (ventas, stock y cierre), para proteger el inventario y las cuentas de usuario. Requires: #4
7. Como usuario, quiero cerrar mi sesión, para que otra persona pueda entrar con su cuenta en el mismo dispositivo. Requires: #5a
8. Como vendedor, quiero registrar una venta con uno o varios productos y sus cantidades, para que se calcule el total y se descuente el stock. Requires: #5
9. Como vendedor, quiero ver mis ventas del día, para llevar el control de lo que he vendido. Requires: #7
10. Como vendedor, quiero hacer el cierre de mi turno con el resumen de ventas y el total, para rendir cuentas y que esas ventas ya no se puedan modificar. Requires: #7
11. Como administrador, quiero ver todas las ventas de todos los vendedores, para controlar el negocio. Requires: #7
12. Como administrador, quiero consultar todos los cierres de turno, para revisar las cuentas de cada vendedor. Requires: #9
13. Como vendedor, quiero solicitar la devolución de productos de una venta indicando el motivo, para atender a un cliente que devuelve algo. Requires: #7
14. Como administrador, quiero aprobar o rechazar las devoluciones pendientes, viendo quién las pidió y por qué, para que el stock solo vuelva cuando yo lo autorice. Requires: #12
15. Como administrador, quiero ver un dashboard con el total de ventas del mes, para conocer cómo va el negocio. Requires: #7
