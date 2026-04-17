import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

vi.mock("recharts", () => {
  const ResponsiveContainer = ({ children }: { children?: React.ReactNode }) => (
    <div data-mock="responsive">{children}</div>
  );
  return {
    ResponsiveContainer,
    Tooltip: () => null,
    Legend: () => null,
  };
});

describe("ChartContainer", () => {
  it("renders children and sets css vars", () => {
    const config: ChartConfig = {
      total: { label: "Total", color: "var(--chart-1)" },
    };

    render(
      <ChartContainer config={config} className="h-10">
        <div>chart</div>
      </ChartContainer>,
    );

    expect(screen.getByText("chart")).toBeInTheDocument();
  });
});

