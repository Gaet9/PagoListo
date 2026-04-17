import "@testing-library/jest-dom/vitest";

// Radix UI relies on ResizeObserver in some components (Accordion, etc).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ResizeObserverMock;

// Silence Next.js runtime warnings in unit tests when relevant.
// Tests should assert on rendered output instead of console noise.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === "string" && first.includes("Warning:")) return;
  originalError(...args);
};

