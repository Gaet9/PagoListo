import Link from "next/link";

import { BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

/** Primer eslabón del breadcrumb: enlace a la página de inicio (`/`). */
export function BreadcrumbHomePrefix() {
    return (
        <>
            <BreadcrumbItem>
                <BreadcrumbLink asChild>
                    <Link href='/'>Inicio</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
        </>
    );
}
