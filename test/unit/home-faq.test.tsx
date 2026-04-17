import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomeFaq } from "@/components/home-faq";

const sampleItems = [
    { id: "a", question: "¿Pregunta de prueba?", answer: "Respuesta de prueba." },
] as const;

describe("HomeFaq", () => {
    it("muestra el título y abre una respuesta", async () => {
        const user = userEvent.setup();
        render(
            <HomeFaq
                items={sampleItems}
                accordionValuePrefix='test'
                title='FAQ test'
                titleId='faq-test-id'
                TitleTag='h2'
                subtitle={<p>Intro de prueba</p>}
            />,
        );

        expect(screen.getByRole("heading", { name: "FAQ test", level: 2 })).toHaveAttribute("id", "faq-test-id");
        expect(screen.getByText("Intro de prueba")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "¿Pregunta de prueba?" }));
        expect(await screen.findByText("Respuesta de prueba.")).toBeInTheDocument();
    });
});
