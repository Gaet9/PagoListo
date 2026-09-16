import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SubscriptionLoadErrorBanner } from "@/components/auth/subscription-load-error-banner";

describe("SubscriptionLoadErrorBanner", () => {
  it("shows the error message", () => {
    render(<SubscriptionLoadErrorBanner message="column canceled_at does not exist" />);
    expect(screen.getByText(/No se pudo verificar tu suscripción/)).toBeInTheDocument();
    expect(screen.getByText("column canceled_at does not exist")).toBeInTheDocument();
  });
});
