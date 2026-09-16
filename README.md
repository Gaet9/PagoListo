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
        - **Cobrar**: cobro en mostrador (efectivo, transferencia, **Mercado Pago** vía **QR** generado con la API de **Checkout Pro** / **Preferences** del vendedor conectado).
        - **Configuración**: estado de conexión **Mercado Pago** por tienda, cuenta vinculada (email / ID) y enlace OAuth para conectar o cambiar cuenta.
- **Perfil** (`/perfil`): datos personales y listado de negocios con **estado Mercado Pago** por tienda y enlace a la configuración de esa tienda.
- **Código de barras (móvil)**: junto a «Añadir producto», en pantallas estrechas aparece un botón de cámara que abre el escáner y rellena el campo **Código barras** (requiere HTTPS o `localhost` y permiso de cámara).

## Stack técnico

- [Next.js](https://nextjs.org) (App Router), React, TypeScript
- [Supabase](https://supabase.com): Auth + base de datos
- [Tailwind CSS](https://tailwindcss.com) y componentes [shadcn/ui](https://ui.shadcn.com)
- Escáner: [`@zxing/browser`](https://www.npmjs.com/package/@zxing/browser)
- Pagos (POS): **Mercado Pago** — **Checkout Pro** vía API de **Preferences** (OAuth por negocio + QR en tienda; webhooks; flujo SaaS opcional con token global)

Consultas y tipos de dominio están en `lib/queries/` y `lib/types/` (negocios, productos, ventas, movimientos, estado OAuth MP, etc.).

## Ejecutar en local

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard) y configura el esquema/tablas y RLS según tu despliegue (las migraciones en `supabase/migrations/` definen el modelo esperado).

2. Copia variables de entorno:

    ```bash
    cp .env.example .env.local
    ```

    Rellena al menos:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave publicable o anon del proyecto)
    - `NEXT_PUBLIC_SITE_URL` (por ejemplo `http://localhost:3000` en local y la URL pública en producción; con **ngrok** para pruebas de MP, usa la URL del túnel de forma coherente con el **Redirect URI** de la app MP)

    El resto (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`) solo si usas migraciones u otras herramientas que lo requieran.

3. Instala dependencias y arranca:

    ```bash
    npm install
    npm run dev
    ```

    Abre [http://localhost:3000](http://localhost:3000).

## Mercado Pago: Checkout Pro + OAuth por negocio

La integración de cobro en tienda usa la **API de Preferences** de Mercado Pago (Checkout Pro): se crea una **preferencia** con ítems del carrito y se muestra al cliente un **QR** con el `init_point` (o `sandbox_init_point`) para pagar desde la app de Mercado Pago. No se usa el brick de Wallet embebido en la página.

### Flujo resumido

1. **OAuth por negocio**: cada tienda puede vincular su cuenta MP (`/api/mercadopago/oauth/start` → MP → `/api/mercadopago/oauth/callback`). Los tokens se guardan en Supabase (`negocio_mercadopago_oauth`).
2. **Preferencia**: `POST /api/mercadopago/preference` usa el **access_token del vendedor** del negocio, crea la preferencia y un registro de intento (`mp_cobro_intentos`) con `external_reference` / metadata para el webhook.
3. **Webhook**: `GET` y `POST /api/mercadopago/webhook` (IPN legacy + Webhooks v2). Se valida firma cuando aplica (`data.id` en query), se consulta el pago en la API MP y, si está **aprobado**, se activa abono SaaS o se crea la venta de tienda de forma idempotente.
4. **UI**: pestaña **Cobrar** (QR), **Configuración** (conexión y cuenta), **Perfil** (resumen por negocio).
5. **Errores de vinculación**: tras OAuth, la app vuelve con `mp_oauth=ok` o `mp_oauth=error` (mensajes en español). Ver [`docs/mercadopago-oauth-errores.md`](docs/mercadopago-oauth-errores.md). Checklist ops: [`docs/mercadopago-oauth-ops.md`](docs/mercadopago-oauth-ops.md).

### Configuración en Mercado Pago Developers

- Crea una **aplicación** y obtén **Client ID** y **Client Secret** (OAuth).
- **Redirect URI** debe coincidir con tu app (local, producción o ngrok), por ejemplo:
  - `https://<tu-dominio>/api/mercadopago/oauth/callback`
- En `.env.local` (ver `.env.example`):
  - `MERCADOPAGO_OAUTH_CLIENT_ID`, `MERCADOPAGO_OAUTH_CLIENT_SECRET`
  - Opcional: `MERCADOPAGO_OAUTH_REDIRECT_URI` si no querés derivarlo de `NEXT_PUBLIC_SITE_URL`
  - Webhook: `MERCADOPAGO_WEBHOOK_SECRET` (clave del panel MP → Webhooks). Por defecto el código exige `x-signature` salvo `MERCADOPAGO_WEBHOOK_ALLOW_UNSIGNED=true` o deuda `MERCADOPAGO_WEBHOOK_ENFORCE_SIGNATURE=false`.
  - `NEXT_PUBLIC_SITE_URL` debe ser la URL **canónica** (p. ej. `https://www.…`) usada en `notification_url`; apex con redirect suele impedir que MP entregue el webhook.
- **Desarrollo** (`next dev`): por defecto, tras OAuth el navegador vuelve a `http://localhost:3000` para alinear cookies de Supabase aunque `NEXT_PUBLIC_SITE_URL` sea ngrok; configurable con `MERCADOPAGO_OAUTH_BROWSER_RETURN_ORIGIN`.

### Checkout Pro “SaaS” (token global, opcional)

Para flujos que usan un **access token de aplicación** (no por negocio), existe `POST /api/mercadopago/saas/preference` y variables `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS` / `MERCADOPAGO_ACCESS_TOKEN_SAAS` (p. ej. suscripción u otros productos). El cobro en **Mi tienda** prioriza OAuth por negocio.

### Rutas y código útil

| Ruta / módulo | Rol |
| ------------- | --- |
| `app/api/mercadopago/oauth/*` | Inicio OAuth, callback, estado, **desvincular** (`disconnect`), perfil de cuenta vía `/users/me` en el status). |
| `app/api/mercadopago/preference/route.ts` | Crea preferencia Checkout Pro con token del negocio. |
| `app/api/mercadopago/webhook/route.ts` | Notificaciones MP; creación de venta aprobada. |
| `app/api/mercadopago/cobro-intento/status/route.ts` | Estado del intento (fallback si no usás Realtime). |
| `lib/mercadopago/oauth.ts`, `oauth-post-consent-origin.ts` | URLs OAuth, PKCE, refresh, origen post-consent. |
| `lib/mercadopago/client.ts` | Cliente SDK MP con token del vendedor. |
| `components/tienda/mercadopago-qr.tsx` | QR del `init_point`. |
| `components/tienda/cobrar-tab.tsx`, `configuracion-tab.tsx` | Cobro y configuración MP. |
| `components/perfil/negocio-mercadopago-status.tsx` | Estado MP en perfil por negocio. |
| `supabase/migrations/*mp*` | Tablas OAuth, intentos de cobro, RPC venta aprobada, Realtime opcional. |

### Imagen marketing (hero)

- `npm run optimize:hero` — genera `public/hero-negocio.webp` desde un PNG de entrada (ver `scripts/optimize-hero.mjs`).

## Scripts útiles

- `npm run dev` - desarrollo
- `npm run build` - compilación de producción
- `npm run start` - servidor tras `build`
- `npm test` - unit tests (deben pasar antes de validar cambios de UI)
- `npm run test:e2e` - e2e (cuando aplique)
- `npm run optimize:hero` - WebP del hero desde `public/hero-negocio.png` o ruta pasada como argumento

## Tests (obligatorio)

Antes de dar por **validado** un componente (nuevo, modificado o eliminado), los tests deben estar **100% OK**:

- Unit: `npm test`
- E2E (si aplica): `npm run test:e2e`

## Estructura relevante

| Ruta / carpeta             | Rol                                                     |
| -------------------------- | ------------------------------------------------------- |
| `app/(protected)/`         | Layout y páginas que exigen sesión (sin prefijo de URL) |
| `app/(protected)/tiendas/` | Dashboard «Mi tienda»                                   |
| `app/api/mercadopago/`     | OAuth, Preferences (Checkout Pro), webhook MP           |
| `components/tienda/`       | Formularios, pestañas, escáner, cobro MP / QR          |
| `lib/supabase/`            | Cliente browser/server y middleware                     |
| `lib/queries/`             | Llamadas a Supabase por dominio                         |
| `lib/mercadopago/`         | OAuth, URLs checkout, cliente MP                        |

Este proyecto partió del ejemplo oficial _Next.js with Supabase_; el README describe la app **PagoListo** tal como está evolucionada en este repositorio.
