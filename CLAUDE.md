# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Aplicación web para registrar las ventas diarias y controlar el inventario de un negocio, con protección por roles (administrador y vendedor).

Se construye historia por historia desde `backlog.md`. Cuando haya nuevos comandos o decisiones de arquitectura, agrégalos aquí.

## Stack

- React + TypeScript (Vite)
- Supabase: base de datos (PostgreSQL) y autenticación

## Comandos

- `npm run dev`: levanta la app (necesita `.env.local`, ver `.env.example`).
- `npm test`: tests con Vitest + Testing Library (`vitest run`).
- `npx tsc -b`: comprueba los tipos.

## Convenciones

- Los tests están en `src/test/`, un archivo por componente (`App.test.tsx`: sesión e inicio de sesión; `Inventory.test.tsx`: lista, formulario y edición de producto). Mockean `../supabaseClient`; no usan la red. El mock de `from()` expone `select` (con `.order()`), `insert` y `update` (con `.eq()` y `.select()`); `select` y `eq` son la fuente de datos de cada test, y los tests del formulario de producto usan los helpers `rellenarProducto` y `listaDeProductos` (en `src/test/Inventory.test.tsx`).
- En `App.test.tsx` el mock de `from()` también cubre `profiles` con `select().eq().maybeSingle()`: `perfil` es la fuente del perfil de cada test y `perfilEq` registra por qué usuario se pregunta. Los tests de `Inventory` pasan el rol como prop (`role="admin"`, `"seller"` o `null`).
- En la base de datos y el código, los identificadores van en inglés (`products`: `name`, `price`, `stock`). Los textos de la interfaz, en español.
- Las migraciones están en `supabase/migrations/` y se ejecutan a mano en el SQL Editor de Supabase. Toda tabla lleva RLS activado.

## Decisiones costosas

- Dos roles: administrador y vendedor.
- El rol se lee de `profiles.role` en `App` (solo `'admin'` o `'seller'`; cualquier otro valor, o un fallo al leerlo, es `null`) y se pasa a `Inventory` como prop. La interfaz solo oculta controles: la protección real está en RLS y en la función `create-seller`. Sin rol no se muestra ningún control de administrador.
- Un solo negocio con un único inventario (sin multi-tienda).
- Siempre en línea (sin modo offline).
- Un solo idioma (español) y una sola moneda.

## Reglas de negocio acordadas

- **Administrador:** crea y edita productos, ajusta stock, crea cuentas de vendedor, ve todas las ventas, cierres y devoluciones.
- **Vendedor:** registra ventas, consulta stock, ve solo sus propias ventas del día y hace el cierre de su turno. No accede a funciones de administrador.
- Una venta tiene uno o varios productos con su cantidad. El precio sale del producto. No guarda cliente ni método de pago. Registrar una venta descuenta el stock.
- Las ventas **no se editan ni se anulan**. La única corrección es una devolución.
- Devolución: el vendedor la solicita con motivo obligatorio. El stock solo vuelve cuando el administrador la **aprueba**. La venta original se conserva.
- Cierre de turno: el vendedor ve el resumen (cantidad de ventas y total) y lo confirma. Después, las ventas de ese turno no se pueden modificar.

## Flujo de trabajo

- `backlog.md` tiene el contexto y las historias. Se refinan una a una con `/story` y se implementan con `/pair` (skills en `.claude/skills/`).
- Cada historia tiene un solo archivo de plan: `storybook/history-N.md` (el bloque aprobado por `/story`, que es la entrada de `/pair`). Al terminar la historia se le agrega un resumen al final. Reemplaza al antiguo `plan.md`.
- Los detalles pendientes (qué pasa sin stock suficiente, devoluciones de turnos cerrados, cómo se reflejan en el cierre y en el dashboard) se deciden en `/story`, no por adelantado.

## Git

- No puedes crear commit ni hacer push/pull al repositorio remoto
- La rama **master** solo será para hacer despliegues y la rama **develop** para desarrollo y pruebas
