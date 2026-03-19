import { vi } from "vitest";

// Só executar setup de DOM quando rodando em ambiente jsdom
if (typeof window !== "undefined") {
  // biome-ignore lint/suspicious/noExplicitAny: setup de teste
  (await import("@testing-library/jest-dom/vitest")) as any;

  // jsdom não implementa scrollIntoView — Terminal usa via bottomRef
  Element.prototype.scrollIntoView = vi.fn();

  // jsdom não implementa navigator.clipboard
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
  });

  // Stub global do electronAPI (baseado em src/typings/electron.d.ts)
  Object.defineProperty(window, "electronAPI", {
    writable: true,
    value: {
      saveFile: vi.fn().mockResolvedValue({ success: true }),
      saveFileAs: vi.fn().mockResolvedValue({ success: true, canceled: false }),
      openFileDialog: vi.fn().mockResolvedValue({ success: true, canceled: true }),
      openFolderDialog: vi.fn().mockResolvedValue({ success: true, canceled: true }),
      readFolderTree: vi.fn().mockResolvedValue({ success: true, tree: [] }),
      readFile: vi.fn().mockResolvedValue({ success: true, content: "", fileName: "test.alg" }),
    },
  });
}
