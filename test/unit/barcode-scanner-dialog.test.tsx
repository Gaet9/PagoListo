import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { BarcodeScannerDialog } from "@/components/tienda/barcode-scanner-dialog";

// Mock ZXing reader to trigger callback once.
vi.mock("@zxing/browser", () => {
  class BrowserMultiFormatReader {
    async decodeFromConstraints(_c: unknown, _v: unknown, cb: unknown) {
      const result = { getText: () => "123" };
      (cb as (result: unknown, err: unknown, controls: { stop: () => void }) => void)(
        result,
        null,
        { stop: () => {} },
      );
      return { stop: () => {} };
    }
    async decodeFromVideoDevice(_d: unknown, _v: unknown, cb: unknown) {
      const result = { getText: () => "123" };
      (cb as (result: unknown, err: unknown, controls: { stop: () => void }) => void)(
        result,
        null,
        { stop: () => {} },
      );
      return { stop: () => {} };
    }
  }
  return { BrowserMultiFormatReader };
});

describe("BarcodeScannerDialog", () => {
  it("does not close automatically when closeOnDetected=false", async () => {
    const onClose = vi.fn();
    const onDetected = vi.fn();

    render(
      <BarcodeScannerDialog
        open
        onClose={onClose}
        onDetected={onDetected}
        closeOnDetected={false}
      />,
    );

    // Detection happens inside effect; allow microtasks to flush.
    await Promise.resolve();

    expect(onDetected).toHaveBeenCalledWith("123");
    expect(onClose).not.toHaveBeenCalled();
  });
});

