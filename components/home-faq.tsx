"use client";

import { createElement, type ReactNode } from "react";
import Link from "next/link";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageShell } from "@/components/ui/page-shell";
import type { FaqEntry } from "@/lib/content/faq-negocios";

type Props = {
    items: readonly FaqEntry[];
    /** Prefijo estable para `value` de cada ítem del acordeón (evita colisiones si hay dos bloques en la misma página). */
    accordionValuePrefix?: string;
    title?: string;
    titleId?: string;
    TitleTag?: "h1" | "h2";
    /** Si no se pasa, en la home se muestra el texto por defecto con enlace a `/faq`. */
    subtitle?: ReactNode | null;
};

const defaultHomeSubtitle = (
    <p className='app-section-subtitle mx-0 mt-2 text-left'>
        Respuestas rápidas sobre cómo funciona Negocios para tu comercio. Para ver el listado completo visitá la{" "}
        <Link href='/faq' className='font-medium text-foreground underline-offset-4 hover:underline'>
            página de preguntas frecuentes
        </Link>
        .
    </p>
);

export function HomeFaq({
    items,
    accordionValuePrefix = "faq",
    title = "Preguntas frecuentes",
    titleId = "home-faq-heading",
    TitleTag = "h2",
    subtitle = defaultHomeSubtitle,
}: Props) {
    return (
        <section className='w-full' aria-labelledby={titleId}>
            <PageShell as='section' surface='default' padding='md' rounded='lg' maxWidth='content' className='w-full'>
                {createElement(TitleTag, { id: titleId }, title)}
                {subtitle}
                <Accordion type='single' collapsible className='mt-6 w-full rounded-lg border bg-card'>
                    {items.map((item) => (
                        <AccordionItem
                            key={item.id}
                            value={`${accordionValuePrefix}-${item.id}`}
                            className='border-b border-border px-4 last:border-b-0'>
                            <AccordionTrigger className='py-4 text-left text-sm font-medium hover:no-underline [&>svg]:shrink-0'>
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className='pb-4 text-sm leading-relaxed text-muted-foreground'>{item.answer}</p>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </PageShell>
        </section>
    );
}
