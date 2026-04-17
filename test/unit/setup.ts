import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Radix UI relies on ResizeObserver in some components (Accordion, etc).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ResizeObserverMock;

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IntersectionObserver =
  (globalThis as any).IntersectionObserver ?? IntersectionObserverMock;

/** Por defecto escritorio para `(min-width: 768px)`; otras consultas devuelven `matches: false`. */
function matchMediaMock(query: string) {
  return {
    matches: /\(\s*min-width:\s*768px\s*\)/.test(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(matchMediaMock),
});

// Silence Next.js runtime warnings in unit tests when relevant.
// Tests should assert on rendered output instead of console noise.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === "string" && first.includes("Warning:")) return;
  originalError(...args);
};

