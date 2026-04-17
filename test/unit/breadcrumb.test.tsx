import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

describe("Breadcrumb", () => {
  it("renders nav with aria-label and current page", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Perfil</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(screen.getByLabelText("breadcrumb")).toBeInTheDocument();
    expect(screen.getByText("Perfil")).toHaveAttribute("aria-current", "page");
  });
});

