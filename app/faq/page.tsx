import type { Metadata } from "next";

import { BreadcrumbHomePrefix } from "@/components/breadcrumb-home-prefix";
import { HomeFaq } from "@/components/home-faq";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { buildFaqPageJsonLd, faqItemsFullPage } from "@/lib/content/faq-negocios";

export const metadata: Metadata = {
    title: "Preguntas frecuentes - PagoListo (POS y stock para comercios)",
    description:
        "Respuestas sobre inventario, ventas, compras, códigos de barras, seguridad y uso de PagoListo: la app web para kioscos y almacenes en Argentina.",
    alternates: { canonical: "/faq" },
};

const faqPageJsonLd = buildFaqPageJsonLd(faqItemsFullPage);

const faqPageSubtitle = (
    <p className='app-section-subtitle mx-0 mt-3 max-w-3xl text-left'>
        Guía extendida sobre PagoListo: gestión de productos, stock, cobros, compras a proveedores, comprobantes y buenas prácticas para
        comercios chicos. Si no encontrás lo que buscás, consultá también la sección de preguntas en la página de inicio.
    </p>
);

export default function FaqPage() {
    return (
        <main className='flex min-h-screen flex-col items-center'>
            <div className='flex w-full flex-1 flex-col items-center gap-12 md:gap-16'>
                <SiteNav />

                <div className='flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 pb-16'>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbHomePrefix />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Preguntas frecuentes</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <HomeFaq
                        items={faqItemsFullPage}
                        accordionValuePrefix='faq-page'
                        title='Preguntas frecuentes sobre PagoListo'
                        titleId='faq-page-heading'
                        TitleTag='h1'
                        subtitle={faqPageSubtitle}
                    />
                </div>

                <script
                    type='application/ld+json'
                    // eslint-disable-next-line react/no-danger -- JSON-LD para SEO (FAQPage)
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
                />

                <SiteFooter />
            </div>
        </main>
    );
}
