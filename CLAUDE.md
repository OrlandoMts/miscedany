# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Aplicación web para registrar las ventas diarias y controlar el inventario de un negocio, con protección por roles (administrador y vendedor).

Todavía no hay código ni arquitectura: se construye historia por historia desde `backlog.md`. Cuando existan comandos (instalar, levantar, tests) o decisiones de arquitectura, agrégalos aquí.

## Stack

- React + TypeScript (Vite)
- Supabase: base de datos (PostgreSQL) y autenticación

## Decisiones costosas

- Dos roles: administrador y vendedor.
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
- `plan.md` tiene la historia en curso (el bloque aprobado por `/story`, que es la entrada de `/pair`). Es temporal: se reemplaza al pasar a la siguiente historia; no es documentación del proyecto.
- Los detalles pendientes (qué pasa sin stock suficiente, devoluciones de turnos cerrados, cómo se reflejan en el cierre y en el dashboard) se deciden en `/story`, no por adelantado.
