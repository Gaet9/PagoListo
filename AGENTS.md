# AGENTS.md - PagoListo (POS para comercios pequeños)

Documento de contexto para asistentes de código y desarrolladores. **Idioma de la aplicación (UI y copys): español**, orientado a **Argentina** (comercios chicos, kioscos, almacenes).

## Qué es la aplicación

**PagoListo** es una aplicación web tipo **POS / gestión de comercio** que ayuda a negocios pequeños a:

- Gestionar **stock** e **inventario** (productos, movimientos).
- Mantener **precios** (compra y venta) y datos de producto (nombre, SKU, código de barras).
- Asociar datos a **usuarios** autenticados y a uno o más **negocios** (multi-tenant lógico vía Supabase y RLS).
- Consultar **ventas** (listado; el alcance exacto evoluciona según el producto).

No sustituye un fiscalizador AFIP ni un ERP completo; es una capa operativa clara para el día a día del mostrador y el depósito.

## Stack

- **Next.js** (App Router), **React**, **TypeScript**.
- **Supabase**: Auth (sesión con cookies, `supabase-ssr`), Postgres, políticas **RLS**.
- **Tailwind CSS** + **shadcn/ui** (componentes en `components/ui/`).
- Escaneo de códigos de barras en móvil: `@zxing/browser`.
- **Mercado Pago**: integración **Checkout Pro** vía API de **Preferences** (SDK `mercadopago`), más **OAuth** por negocio para cobrar con la cuenta del vendedor; **webhooks** para confirmar pagos y crear ventas.

## Mercado Pago (Checkout Pro + OAuth)

### Qué está implementado

- **OAuth por negocio** (`negocio_mercadopago_oauth`): PKCE, estado en `mp_oauth_states`, callback persiste tokens; el navegador vuelve a la tienda (origen post-consent: `lib/mercadopago/oauth-post-consent-origin.ts` — en `development` por defecto `http://localhost:3000` si hace falta alinear sesión Supabase con túnel ngrok en `NEXT_PUBLIC_SITE_URL`).
- **Preferences / Checkout Pro** (`POST app/api/mercadopago/preference/route.ts`): crea preferencia con `access_token` del negocio, `notification_url` hacia `/api/mercadopago/webhook`, `mp_cobro_intentos` con `external_reference` / metadata para correlación.
- **Webhook** (`app/api/mercadopago/webhook/route.ts`): obtiene el pago vía API MP; reclamo idempotente del intento; RPC para crear venta **solo** si el pago está aprobado. Firma `x-signature` opcional (`MERCADOPAGO_WEBHOOK_ENFORCE_SIGNATURE`).
- **UI**: `mercadopago-qr.tsx` (QR del `init_point`), `cobrar-tab.tsx`, `configuracion-tab.tsx`, `negocio-mercadopago-status.tsx` en perfil.
- **SaaS** (opcional): `app/api/mercadopago/saas/preference/route.ts` + `lib/mercadopago/checkout-pro-preference.ts` con token global (`MERCADOPAGO_ACCESS_TOKEN_SAAS`); distinto del cobro por negocio en tienda.

### Archivos clave

| Área               | Ruta                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| OAuth              | `app/api/mercadopago/oauth/start`, `callback`, `status`                                         |
| Preferencia tienda | `app/api/mercadopago/preference/route.ts`                                                       |
| Preferencia SaaS   | `app/api/mercadopago/saas/preference/route.ts`                                                  |
| Webhook            | `app/api/mercadopago/webhook/route.ts`                                                          |
| Helpers            | `lib/mercadopago/oauth.ts`, `oauth-post-consent-origin.ts`, `client.ts`, `checkout-pro-urls.ts` |
| Migraciones        | `supabase/migrations/*mercadopago*`, `*mp_*`, OAuth e intentos de cobro                         |

### Variables de entorno

Ver `.env.example`: `MERCADOPAGO_OAUTH_*`, `NEXT_PUBLIC_SITE_URL`, `MERCADOPAGO_OAUTH_BROWSER_RETURN_ORIGIN` (dev), `MERCADOPAGO_WEBHOOK_SECRET`, tokens SaaS si aplica.

### Convenciones al tocar MP

- No exponer **access_token** / **refresh_token** al cliente: solo rutas server y admin Supabase donde corresponda.
- Nuevos flujos de cobro: mantener **idempotencia** (pagos duplicados / reintentos de webhook).
- Cambios en componentes de `components/tienda/` o `components/perfil/` relacionados con MP: actualizar o añadir tests en `test/unit/`.

## Estructura de carpetas (resumen)

| Ubicación                  | Responsabilidad                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`                     | Rutas, layouts, páginas. Server Components cuando aplica.                                                                               |
| `app/globals.css`          | Variables CSS del tema, capa `base` para `body` y **jerarquía `h1`–`h6`**, clases de componente (`.app-hero-title`, `.app-lead`, etc.). |
| `app/(protected)/`         | Zona autenticada; layout con navegación (sin prefijo de URL).                                                                           |
| `app/(protected)/tiendas/` | **Mi tienda**: dashboard con pestañas (Productos, Ventas, Movimientos, Cobrar, Compras, Configuración, etc.).                           |
| `app/api/mercadopago/`     | OAuth MP, Preferences (Checkout Pro), webhook, intentos de cobro.                                                                       |
| `app/auth/`                | Login, registro, recuperación de contraseña, callbacks.                                                                                 |
| `components/`              | UI reutilizable, formularios, navegación (`site-nav`, `nav-shop-link`).                                                                 |
| `components/tienda/`       | Tabs de tienda, formularios, escáner, cobro MP (QR), configuración MP.                                                                  |
| `components/ui/`           | Primitivos shadcn + **`PageShell`** (contenedor/sección con variantes de superficie y espaciado).                                       |
| `lib/supabase/`            | Cliente browser/server, middleware.                                                                                                     |
| `lib/queries/`             | Acceso a datos por dominio (negocios, productos, ventas, …).                                                                            |
| `lib/mercadopago/`         | OAuth, URLs Checkout Pro, cliente MP, origen post-consent, preferencias SaaS.                                                           |
| `lib/types/`               | Tipos compartidos del dominio (`negocio`, estado OAuth MP, etc.).                                                                       |

### Separación de responsabilidades

1. **UI**: `components/` - presentación, accesibilidad, composición.
2. **Lógica compartida / helpers**: `lib/` (sin mezclar JSX pesado con queries si se puede evitar).
3. **Datos**: llamadas a Supabase en `lib/queries/` (y rutas/handlers si se agregan APIs propias).

## Estilos: reglas obligatorias

### `app/globals.css`

- **Títulos**: usar etiquetas semánticas **`h1`–`h6`**; los estilos base ya definen tamaño, peso y color. No duplicar en cada pantalla clases de tipografía para headings salvo casos especiales documentados (p. ej. `.app-hero-title` en la home).
- **Clases de componente** definidas ahí (p. ej. `.app-lead`, `.tutorial-code`): reutilizarlas en lugar de copiar largas cadenas de utilidades.
- **No** añadir estilos en línea (`style={{}}`) para colores o tipografía; **no** hardcodear hex/rgb sueltos en JSX.

### `tailwind.config.ts`

- **Colores y fuentes** del producto se definen y consumen vía este archivo y las variables en `globals.css` (`background`, `primary`, `muted`, `scanner.video`, `fontFamily.sans`, tamaños `heading-*`, `hero-*`, etc.).
- Para fondos y textos nuevos, usar **tokens existentes** (`bg-card`, `text-muted-foreground`, …). Si hace falta un token nuevo, **añadirlo primero** en `tailwind.config.ts` y, si corresponde, la variable en `:root` / `.dark` en `globals.css`.
- Evitar valores arbitrarios tipo `bg-[#...]` o `text-[10px]` salvo excepción justificada.

## Componente de layout: `PageShell`

Ubicación: `components/ui/page-shell.tsx`.

Contenedor (`div` o `section`) con **variantes** (CVA) para superficie (`default`, `muted`, `card`, `accent`), padding, bordes redondeados y ancho máximo. Úsalo para bloques de página nuevos en lugar de repetir `className` largos con fondos y bordes.

Ejemplo:

```tsx
import { PageShell } from "@/components/ui/page-shell";

<PageShell as='section' surface='card' padding='md' rounded='lg' maxWidth='content'>
    <h2>Sección</h2>
    <p className='text-muted-foreground'>Contenido.</p>
</PageShell>;
```

## Convenciones de código

- **TypeScript estricto**: evitar `any`; tipar props y respuestas cuando sea posible.
- **Componentes modulares**: extraer secciones repetidas; preferir composición.
- **Idioma**: textos de interfaz en **español**.
- **Tests obligatorios**: cualquier **creación, modificación o eliminación** de componentes en `components/` o `components/ui/` debe ir acompañada de la **creación/actualización** de sus tests correspondientes (unit en `test/unit/` y, cuando aplique, e2e en `test/e2e/`).
- **README**: `README.md` en la raíz del app resume setup y rutas; este archivo amplía contexto para agentes.

## Si falta información

Si algo no está descrito aquí, **inferir** de la arquitectura existente (mismos patrones que en `lib/queries/` y `components/tienda/`) y mantener coherencia con RLS y multi-negocio.

## Cursor / agente

Las reglas del editor viven en **`.cursor/rules/`** en la raíz de la app (misma carpeta que `package.json` y este `AGENTS.md`). Abre **`with-supabase-app`** como carpeta del proyecto en Cursor para que esas reglas apliquen.
