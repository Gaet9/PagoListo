import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { BreadcrumbHomePrefix } from "@/components/breadcrumb-home-prefix";
import { Breadcrumb, BreadcrumbList } from "@/components/ui/breadcrumb";

describe("BreadcrumbHomePrefix", () => {
    it("enlaza a inicio", () => {
        render(
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbHomePrefix />
                </BreadcrumbList>
            </Breadcrumb>,
        );
        const link = screen.getByRole("link", { name: "Inicio" });
        expect(link).toHaveAttribute("href", "/");
    });
});
