import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

describe("Accordion", () => {
  it("toggles content", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Sección</AccordionTrigger>
          <AccordionContent>Contenido</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: "Sección" }));
    expect(await screen.findByText("Contenido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sección" })).toHaveAttribute(
      "data-state",
      "open",
    );
  });
});

