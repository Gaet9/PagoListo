import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteFooter } from "@/components/site-footer";

describe("SiteFooter", () => {
    it("incluye enlace a preguntas frecuentes", () => {
        render(<SiteFooter />);
        const link = screen.getByRole("link", { name: "Preguntas frecuentes" });
        expect(link).toHaveAttribute("href", "/faq");
    });
});
