import { HomeGuestCTAs } from "@/components/home-guest-ctas";
import { HomeHowItWorks } from "@/components/home-how-it-works";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { hasEnvVars } from "@/lib/utils";
import Image from "next/image";
import { Suspense } from "react";

export default function Home() {
    return (
        <main className='min-h-screen flex flex-col items-center'>
            <div className='flex-1 w-full flex flex-col gap-12 md:gap-16 items-center'>
                <SiteNav />

                <div className='flex-1 flex flex-col gap-10 md:gap-14 w-full max-w-5xl px-5 pb-16'>
                    <section className='flex flex-col items-center text-center gap-6 md:gap-8'>
                        <h1 className="app-hero-title">
                            Ayuda a tu comercio a controlar stock, precios y ventas
                        </h1>
                        <p className="app-lead">
                            Una herramienta sencilla para kioscos, almacenes y negocios pequeños: inventario claro, precios al día y ventas
                            bajo control, sin hojas de cálculo interminables.
                        </p>
                        {hasEnvVars ?
                            <Suspense fallback={null}>
                                <HomeGuestCTAs />
                            </Suspense>
                        :   null}
                    </section>

                    <section className='w-full flex justify-center'>
                        <div className="relative w-full max-w-4xl aspect-hero rounded-2xl overflow-hidden border border-border shadow-lg bg-muted">
                            <Image
                                src='/hero-negocio.png'
                                alt='Ilustración de un comercio pequeño gestionando inventario y ventas con una tablet'
                                fill
                                className='object-cover'
                                priority
                                sizes='(max-width: 896px) 100vw, 896px'
                            />
                        </div>
                    </section>

                    <HomeHowItWorks />
                </div>

                <SiteFooter />
            </div>
        </main>
    );
}
