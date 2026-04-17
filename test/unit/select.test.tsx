import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

describe("Select", () => {
  it("renders trigger", () => {
    render(
      <Select defaultValue="30d">
        <SelectTrigger aria-label="Rango">
          <SelectValue placeholder="Elegí un rango" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30d">Últimos 30 días</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByLabelText("Rango")).toBeInTheDocument();
  });
});

