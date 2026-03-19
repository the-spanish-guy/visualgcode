import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useTabs } from "./useTabs";

describe("useTabs", () => {
  describe("estado inicial", () => {
    test("inicia com 1 aba", () => {
      const { result } = renderHook(() => useTabs());
      expect(result.current.tabs).toHaveLength(1);
    });

    test("aba inicial tem nome sem_titulo.alg", () => {
      const { result } = renderHook(() => useTabs());
      expect(result.current.activeTab.fileName).toBe("sem_titulo.alg");
    });

    test("aba inicial não está dirty", () => {
      const { result } = renderHook(() => useTabs());
      expect(result.current.activeTab.isDirty).toBe(false);
    });

    test("aba inicial tem filePath nulo", () => {
      const { result } = renderHook(() => useTabs());
      expect(result.current.activeTab.filePath).toBeNull();
    });
  });

  describe("newTab", () => {
    test("adiciona uma nova aba", () => {
      const { result } = renderHook(() => useTabs());
      act(() => result.current.newTab());
      expect(result.current.tabs).toHaveLength(2);
    });

    test("muda activeId para a nova aba", () => {
      const { result } = renderHook(() => useTabs());
      act(() => result.current.newTab());
      expect(result.current.activeId).toBe(result.current.tabs[1].id);
    });
  });

  describe("switchTab", () => {
    test("muda o activeId", () => {
      const { result } = renderHook(() => useTabs());
      act(() => result.current.newTab());
      const firstId = result.current.tabs[0].id;
      act(() => result.current.switchTab(firstId));
      expect(result.current.activeId).toBe(firstId);
    });

    test("não altera o array de abas", () => {
      const { result } = renderHook(() => useTabs());
      act(() => result.current.newTab());
      const before = result.current.tabs;
      act(() => result.current.switchTab(result.current.tabs[0].id));
      expect(result.current.tabs).toEqual(before);
    });
  });

  describe("updateCode", () => {
    test("marca a aba como dirty quando o código muda", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.updateCode(id, "novo codigo"));
      expect(result.current.activeTab.isDirty).toBe(true);
    });

    test("não marca dirty quando o código é o mesmo", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      const originalCode = result.current.activeTab.code;
      act(() => result.current.updateCode(id, originalCode));
      expect(result.current.activeTab.isDirty).toBe(false);
    });
  });

  describe("closeTab", () => {
    test("pede confirmação quando a aba está dirty", () => {
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.updateCode(id, "mudança"));
      act(() => result.current.closeTab(id));
      expect(confirm).toHaveBeenCalled();
      confirm.mockRestore();
    });

    test("mantém a aba se a confirmação for negada", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.updateCode(id, "mudança"));
      act(() => result.current.closeTab(id));
      expect(result.current.tabs.some((t) => t.id === id)).toBe(true);
      vi.restoreAllMocks();
    });

    test("fecha a aba se a confirmação for aceita", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const { result } = renderHook(() => useTabs());
      act(() => result.current.newTab());
      const dirtyId = result.current.activeId;
      act(() => result.current.updateCode(dirtyId, "mudança"));
      act(() => result.current.closeTab(dirtyId));
      expect(result.current.tabs.some((t) => t.id === dirtyId)).toBe(false);
      vi.restoreAllMocks();
    });

    test("nunca deixa zero abas abertas", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.closeTab(id));
      expect(result.current.tabs).toHaveLength(1);
    });

    test("ativa aba adjacente ao fechar a aba ativa", () => {
      const { result } = renderHook(() => useTabs());
      act(() => result.current.newTab());
      const secondId = result.current.activeId;
      act(() => result.current.newTab());
      const thirdId = result.current.activeId;
      act(() => result.current.closeTab(thirdId));
      expect(result.current.activeId).toBe(secondId);
    });
  });

  describe("openFileInTab", () => {
    test("ativa aba existente se o arquivo já estiver aberto", () => {
      const { result } = renderHook(() => useTabs());
      act(() => result.current.newTab());
      const secondId = result.current.activeId;
      act(() => result.current.openFileInTab("test.alg", "/path/test.alg", "code"));
      const fileTabId = result.current.activeId;
      act(() => result.current.switchTab(secondId));
      act(() => result.current.openFileInTab("test.alg", "/path/test.alg", "code"));
      expect(result.current.activeId).toBe(fileTabId);
      expect(result.current.tabs).toHaveLength(2);
    });

    test("substitui aba limpa sem título em vez de criar uma nova", () => {
      const { result } = renderHook(() => useTabs());
      expect(result.current.tabs).toHaveLength(1);
      act(() => result.current.openFileInTab("novo.alg", "/path/novo.alg", "conteudo"));
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.activeTab.fileName).toBe("novo.alg");
    });

    test("abre em nova aba quando a aba ativa tem conteúdo modificado", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.updateCode(id, "codigo modificado"));
      act(() => result.current.openFileInTab("outro.alg", "/path/outro.alg", "conteudo"));
      expect(result.current.tabs).toHaveLength(2);
    });
  });

  describe("markSaved", () => {
    test("limpa o flag dirty", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.updateCode(id, "mudança"));
      expect(result.current.activeTab.isDirty).toBe(true);
      act(() => result.current.markSaved(id, "saved.alg", "/path/saved.alg"));
      expect(result.current.activeTab.isDirty).toBe(false);
    });

    test("atualiza fileName e filePath", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.markSaved(id, "salvo.alg", "/dir/salvo.alg"));
      expect(result.current.activeTab.fileName).toBe("salvo.alg");
      expect(result.current.activeTab.filePath).toBe("/dir/salvo.alg");
    });
  });

  describe("updateBreakpoints", () => {
    test("atualiza o Set de breakpoints da aba", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.updateBreakpoints(id, [5, 10, 15]));
      expect(result.current.activeTab.breakpoints).toEqual(new Set([5, 10, 15]));
    });

    test("não afeta outras abas", () => {
      const { result } = renderHook(() => useTabs());
      act(() => result.current.newTab());
      const secondId = result.current.activeId;
      act(() => result.current.updateBreakpoints(secondId, [3]));
      act(() => result.current.switchTab(result.current.tabs[0].id));
      expect(result.current.activeTab.breakpoints.size).toBe(0);
    });
  });

  describe("document.title", () => {
    afterEach(() => {
      document.title = "";
    });

    test("define o título com o nome do arquivo", () => {
      renderHook(() => useTabs());
      expect(document.title).toContain("sem_titulo.alg");
      expect(document.title).toContain("VisuAlg IDE");
    });

    test("adiciona prefixo ● quando dirty", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.updateCode(id, "mudança"));
      expect(document.title).toMatch(/^● /);
    });

    test("remove o prefixo ● ao salvar", () => {
      const { result } = renderHook(() => useTabs());
      const id = result.current.activeId;
      act(() => result.current.updateCode(id, "mudança"));
      expect(document.title).toMatch(/^● /);
      act(() => result.current.markSaved(id, "saved.alg", "/p/saved.alg"));
      expect(document.title).not.toMatch(/^● /);
    });
  });
});
