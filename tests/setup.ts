import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = setTimeout(() => callback(Date.now()), 0) as unknown as number;
    return id;
  });

  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    clearTimeout(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
