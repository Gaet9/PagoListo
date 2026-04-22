/** Entrada de FAQ (texto en español, Argentina) para la app PagoListo / POS. */

export type FaqEntry = {
    id: string;
    question: string;
    answer: string;
};

/** Preguntas que se muestran en la página de inicio (SEO + ayuda al visitante). */
export const faqItemsHome: readonly FaqEntry[] = [
    {
        id: "que-es-negocios",
        question: "¿Qué es PagoListo?",
        answer:
            "PagoListo es una aplicación web pensada como POS y gestión liviana para comercios chicos: podés cargar productos, precios, stock, registrar ventas y compras, y ver movimientos de inventario en un solo lugar.",
    },
    {
        id: "para-quien-es",
        question: "¿Para qué tipo de comercios sirve?",
        answer:
            "Está orientada a kioscos, almacenes, dietéticas y negocios de barrio en Argentina que necesitan orden sin complicarse con planillas o sistemas muy pesados.",
    },
    {
        id: "instalacion",
        question: "¿Tengo que instalar algo en la computadora o el celular?",
        answer:
            "No. Funciona en el navegador: entrás con tu usuario, elegís tu tienda y trabajás desde la web. En el celular podés usar la cámara para leer códigos de barras cuando la función esté disponible en tu dispositivo.",
    },
    {
        id: "inventario",
        question: "¿Cómo se actualiza el inventario?",
        answer:
            "El stock puede reflejarse con altas y ajustes que hagas desde la pestaña de productos y con las operaciones que registres al cargar compras (entradas) o ventas (salidas), según cómo esté configurada tu cuenta y las reglas de tu base de datos.",
    },
    {
        id: "varios-negocios",
        question: "¿Puedo administrar más de un negocio?",
        answer:
            "Sí. Podés tener varios negocios asociados a tu usuario y elegir cuál está activo al abrir la tienda, para separar inventarios y operaciones.",
    },
    {
        id: "compras-proveedor",
        question: "¿Qué datos de proveedor pido al registrar una compra?",
        answer:
            "Se pide el nombre del proveedor y al menos un dato de referencia: número de factura o remito, o bien el CUIT/CUIL. Así queda un rastro claro de la compra para tu gestión diaria.",
    },
    {
        id: "comprobantes",
        question: "¿Puedo adjuntar el comprobante de una compra?",
        answer:
            "Sí, podés subir un archivo (por ejemplo factura en PDF o foto) cuando la función esté habilitada en tu proyecto. El archivo queda asociado a la compra y podés descargarlo después con un enlace seguro mientras tengas sesión iniciada.",
    },
    {
        id: "cobrar-venta",
        question: "¿Cómo registro una venta desde la pestaña Cobrar?",
        answer:
            "Buscás el producto por nombre o código de barras, lo agregás al carrito, elegís el medio de pago disponible (por ejemplo efectivo) y validás el cobro. La venta queda registrada para tu historial.",
    },
    {
        id: "movimientos-stock",
        question: "¿Qué son los movimientos de stock?",
        answer:
            "Son el historial de entradas y salidas vinculadas a tus productos. Sirven para entender qué pasó con el inventario y para revisar referencias de ventas o compras cuando corresponda.",
    },
    {
        id: "seguridad-datos",
        question: "¿Mis datos están protegidos?",
        answer:
            "La aplicación usa autenticación y almacenamiento en servicios pensados para producción (por ejemplo Supabase), con acceso por usuario y reglas de seguridad a nivel de datos. Igual conviene usar una contraseña fuerte y no compartir tu sesión.",
    },
    {
        id: "limite-productos",
        question: "¿Hay un límite fijo de productos?",
        answer:
            "El límite práctico depende del plan de tu proveedor de base de datos y del uso real del negocio. Para un comercio chico el foco está en mantener el catálogo ordenado y con buenos nombres y códigos.",
    },
    {
        id: "codigos-barras",
        question: "¿Puedo usar códigos de barras en los productos?",
        answer:
            "Sí. Podés guardar el código de barras en cada producto y usarlo al buscar o al cobrar para agilizar el mostrador.",
    },
    {
        id: "celular",
        question: "¿Sirve para trabajar desde el celular?",
        answer:
            "Sí, el diseño está pensado para pantallas chicas y medianas: podés consultar y operar desde el teléfono cuando tengas buena conexión.",
    },
    {
        id: "afip",
        question: "¿PagoListo reemplaza a un sistema fiscal o a AFIP?",
        answer:
            "No. Es una capa operativa para el día a día del comercio. Los aspectos impositivos, facturación electrónica oficial y obligaciones ante AFIP siguen siendo responsabilidad del titular y de sus asesores.",
    },
    {
        id: "como-empezar",
        question: "¿Cómo empiezo a usar la app?",
        answer:
            "Creá tu cuenta, iniciá sesión, cargá o elegí tu negocio y recorré las pestañas Productos, Cobrar, Compras, Ventas y Movimientos para familiarizarte con el flujo de tu negocio.",
    },
] as const;

/** Preguntas extra solo en la página /faq (más volumen para SEO y consultas específicas). */
export const faqItemsExtended: readonly FaqEntry[] = [
    {
        id: "sin-internet",
        question: "¿Qué pasa si se corta el internet en el local?",
        answer:
            "Al ser una aplicación web necesitás conexión para guardar cambios en el servidor. Si se corta la red, los datos nuevos no se sincronizan hasta que vuelva el servicio; conviene retomar y verificar cargas pendientes.",
    },
    {
        id: "usuarios-rls",
        question: "¿Otra persona puede ver los datos de mi negocio?",
        answer:
            "Solo quien tenga acceso a tu cuenta o usuarios que vos invites según las reglas del proyecto. La base suele usar políticas por usuario y negocio para acotar lo que se ve en cada sesión.",
    },
    {
        id: "mercado-pago",
        question: "¿Tiene integración con Mercado Pago?",
        answer:
            "El producto puede incluir flujos para conectar Mercado Pago por negocio cuando esté configurado en tu instalación. Revisá en tu panel o perfil si la opción está disponible para tu cuenta.",
    },
    {
        id: "precios-compra-venta",
        question: "¿Cuál es la diferencia entre precio de compra y precio de venta?",
        answer:
            "El precio de compra es lo que te costó el producto al proveedor; el precio de venta es lo que cobrás al cliente. Mantener ambos ayuda a márgenes y reportes más claros.",
    },
    {
        id: "producto-inactivo",
        question: "¿Puedo desactivar un producto sin borrarlo?",
        answer:
            "Según la versión de tu pantalla de productos, podés marcar artículos como inactivos para que no aparezcan en búsquedas de cobro u operaciones, sin perder el historial.",
    },
    {
        id: "respaldo",
        question: "¿Quién hace el respaldo de la información?",
        answer:
            "Los datos viven en la nube del proveedor que uses (por ejemplo Supabase), que incluye prácticas de respaldo de infraestructura. Para auditorías críticas, tu contador o vos pueden exportar o registrar información adicional fuera de la app.",
    },
    {
        id: "cuenta-contrasena",
        question: "¿Cómo recupero mi contraseña?",
        answer:
            "Usá el enlace de “Olvidé mi contraseña” en el inicio de sesión: te envían un correo para restablecerla si el servicio de correo está bien configurado en el proyecto.",
    },
    {
        id: "navegadores",
        question: "¿Qué navegador conviene usar?",
        answer:
            "Las versiones recientes de Chrome, Edge o Firefox suelen dar buen resultado. Mantené el navegador actualizado para mejor seguridad y compatibilidad.",
    },
    {
        id: "costo",
        question: "¿Cuánto cuesta usar PagoListo?",
        answer:
            "El costo depende de cómo esté desplegada la solución (planes del proveedor de base de datos, dominio, etc.). Para una instalación de desarrollo o demo, muchas veces se parte de un plan gratuito acotado.",
    },
    {
        id: "soporte",
        question: "¿Dónde consulto si tengo un problema técnico?",
        answer:
            "Revisá la documentación del proyecto, las preguntas frecuentes en esta página y, si aplica, el canal de soporte que definió quien te dio acceso a la aplicación.",
    },
] as const;

/** Todas las preguntas para la página dedicada /faq (home + extensiones, sin duplicar ids). */
export const faqItemsFullPage: readonly FaqEntry[] = [...faqItemsHome, ...faqItemsExtended];

export type FaqJsonLdMainEntity = {
    "@type": "Question";
    name: string;
    acceptedAnswer: {
        "@type": "Answer";
        text: string;
    };
};

/** JSON-LD FAQPage para insertar en `<script type="application/ld+json">`. */
export function buildFaqPageJsonLd(items: readonly FaqEntry[]): Record<string, unknown> {
    const mainEntity: FaqJsonLdMainEntity[] = items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
        },
    }));

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity,
    };
}
