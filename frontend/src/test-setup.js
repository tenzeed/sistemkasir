import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver, but recharts' <ResponsiveContainer>
// needs one to measure its container — polyfill a no-op version for tests.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || ResizeObserverMock;

