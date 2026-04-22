# PagoListo - Mi tienda

Aplicación web en español para gestionar un negocio pequeño: productos, consulta de ventas y movimientos de stock. Los datos viven en **Supabase** (Postgres + autenticación con sesión en cookies vía `supabase-ssr` y políticas **RLS**).

## Qué hace la app

- **Autenticación**: inicio de sesión protegido; las rutas dentro de `app/(protected)/` requieren usuario (sin prefijo `/protected`).
- **Mi tienda** (`/tiendas`): panel principal tras entrar.
    - Si no tienes negocio, puedes crear el primero con nombre y localización.
    - Con uno o varios negocios, eliges el **negocio activo** y trabajas en pestañas:
        - **Productos**: alta, edición y baja de productos (nombre, descripción, SKU, código de barras, precios, stock, activo).
        - **Ventas**: listado de ventas del negocio (solo lectura).
        - **Movimientos de stock**: historial de movimientos (solo lectura).
- **Código de barras (móvil)**: junto a «Añadir producto», en pantallas estrechas aparece un botón de cámara que abre el escáner y rellena el campo **Código barras** (requiere HTTPS o `localhost` y permiso de cámara).

## Stack técnico

- [Next.js](https://nextjs.org) (App Router), React, TypeScript
- [Supabase](https://supabase.com): Auth + base de datos
- [Tailwind CSS](https://tailwindcss.com) y componentes [shadcn/ui](https://ui.shadcn.com)
- Escáner: [`@zxing/browser`](https://www.npmjs.com/package/@zxing/browser)
- Pagos (POS): **Mercado Pago** (conexión OAuth por negocio + cobro por QR)

Consultas y tipos de dominio están en `lib/queries/` y `lib/types/negocio.ts` (negocios, productos, ventas, movimientos).

## Ejecutar en local

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard) y configura el esquema/tablas y RLS según tu despliegue (las consultas del repo asumen tablas coherentes con esos tipos).

2. Copia variables de entorno:

    ```bash
    cp .env.example .env.local
    ```

    Rellena al menos:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave publicable o anon del proyecto)
    - `NEXT_PUBLIC_SITE_URL` (por ejemplo `http://localhost:3000` en local y `https://pagolisto.com.ar` en producción)

    El resto (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`) solo si usas migraciones u otras herramientas que lo requieran.

## Mercado Pago (OAuth + cobro por QR)

PagoListo permite que cada **tienda/negocio** conecte su propia cuenta de Mercado Pago vía **OAuth**. Luego, en la pestaña **Cobrar**, se genera un **QR** para que el cliente pague desde la app de Mercado Pago (sin usar un checkout web embebido).

### Configuración (panel de Mercado Pago Developers)

- Crea una **aplicación** en Mercado Pago Developers.
- Configura el **Redirect URI** a:
  - `http://localhost:3000/api/mercadopago/oauth/callback` (en local)
  - y el equivalente en producción.
- Copia `client_id` y `client_secret` a tu `.env.local`:
  - `MERCADOPAGO_OAUTH_CLIENT_ID`
  - `MERCADOPAGO_OAUTH_CLIENT_SECRET`
- (Opcional) si no quieres derivarlo desde `NEXT_PUBLIC_SITE_URL`, define:
  - `MERCADOPAGO_OAUTH_REDIRECT_URI`

3. Instala dependencias y arranca:

    ```bash
    npm install
    npm run dev
    ```

    Abre [http://localhost:3000](http://localhost:3000).

## Scripts útiles

- `npm run dev` - desarrollo
- `npm run build` - compilación de producción
- `npm run start` - servidor tras `build`
- `npm test` - unit tests (deben pasar antes de validar cambios de UI)
- `npm run test:e2e` - e2e (cuando aplique)

## Tests (obligatorio)

Antes de dar por **validado** un componente (nuevo, modificado o eliminado), los tests deben estar **100% OK**:

- Unit: `npm test`
- E2E (si aplica): `npm run test:e2e`

## Estructura relevante

| Ruta / carpeta             | Rol                                                     |
| -------------------------- | ------------------------------------------------------- |
| `app/(protected)/`         | Layout y páginas que exigen sesión (sin prefijo de URL) |
| `app/(protected)/tiendas/` | Dashboard «Mi tienda»                                   |
| `components/tienda/`       | Formularios, pestañas, escáner de códigos               |
| `lib/supabase/`            | Cliente browser/server y middleware                     |
| `lib/queries/`             | Llamadas a Supabase por dominio                         |

Este proyecto partió del ejemplo oficial _Next.js with Supabase_; el README describe la app **PagoListo** tal como está evolucionada en este repositorio.
