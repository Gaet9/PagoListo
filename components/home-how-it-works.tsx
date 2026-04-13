import { ArrowDown, ArrowRight } from "lucide-react";

const steps = [
    { number: 1, title: "Crea tu cuenta" },
    { number: 2, title: "Crea tu negocio" },
    { number: 3, title: "Añade tus productos" },
    { number: 4, title: "Ganas tiempo y dinero" },
] as const;

export function HomeHowItWorks() {
    return (
        <section className='w-full max-w-5xl mx-auto flex flex-col gap-8 md:gap-10' aria-labelledby='how-it-works-heading'>
            <div className='text-center'>
                <h2 id="how-it-works-heading">Cómo funciona</h2>
                <p className="mt-2 app-section-subtitle">
                    Tres pasos para empezar a llevar tu inventario y ventas con claridad.
                </p>
            </div>

            <ol className='flex flex-col md:flex-row md:items-stretch md:justify-center gap-4 md:gap-2 list-none p-0 m-0'>
                {steps.map((step, index) => (
                    <li
                        key={step.number}
                        className='flex w-full flex-col md:w-auto md:flex-row md:items-center md:flex-1 gap-4 md:gap-2 min-w-0'>
                        <div className='flex flex-1 flex-col items-center text-center gap-3 rounded-xl border bg-card p-6 shadow-sm'>
                            <span
                                className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold'
                                aria-hidden>
                                {step.number}
                            </span>
                            <span className='font-medium text-base leading-snug'>{step.title}</span>
                        </div>
                        {index < steps.length - 1 ?
                            <div
                                className='flex shrink-0 items-center justify-center py-1 md:py-0 md:px-1 text-muted-foreground md:self-center'
                                aria-hidden>
                                <ArrowDown className='h-6 w-6 md:hidden' strokeWidth={2} />
                                <ArrowRight className='hidden md:block h-6 w-6' strokeWidth={2} />
                            </div>
                        :   null}
                    </li>
                ))}
            </ol>
        </section>
    );
}
