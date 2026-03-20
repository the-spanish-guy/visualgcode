import { create } from "zustand";

export interface Tab {
  id: string;
  fileName: string;
  filePath: string | null;
  code: string;
  isDirty: boolean;
  breakpoints: Set<number>;
}

interface TabsStore {
  tabs: Tab[];
  activeId: string;
  newTab: () => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateCode: (id: string, code: string) => void;
  updateBreakpoints: (id: string, lines: number[]) => void;
  openFileInTab: (fileName: string, filePath: string, code: string) => void;
  markSaved: (id: string, fileName: string, filePath: string) => void;
}

let counter = 1;
const newId = () => `tab-${Date.now()}-${counter++}`;

const STARTER_CODE = `algoritmo "Par ou Impar"

var
    num: inteiro

inicio
    escreva("Digite um número: ")
    leia(num)

    se (num mod 2 = 0) entao
        escreval("O número é PAR")
    senao
        escreval("O número é ÍMPAR")
    fimse

fimalgoritmo
`;

export function createTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: newId(),
    fileName: "sem_titulo.alg",
    filePath: null,
    code: STARTER_CODE,
    isDirty: false,
    breakpoints: new Set(),
    ...overrides,
  };
}

const initialTab = createTab();

export const useTabsStore = create<TabsStore>()((set, get) => ({
  tabs: [initialTab],
  activeId: initialTab.id,

  newTab: () => {
    const tab = createTab();
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
  },

  closeTab: (id) => {
    const { tabs, activeId } = get();
    const tab = tabs.find((t) => t.id === id);

    if (tab?.isDirty) {
      const confirmed = window.confirm(
        `"${tab.fileName}" tem alterações não salvas. Deseja fechar mesmo assim?`,
      );
      if (!confirmed) return;
    }

    const next = tabs.filter((t) => t.id !== id);

    if (next.length === 0) {
      const fresh = createTab();
      set({ tabs: [fresh], activeId: fresh.id });
      return;
    }

    let newActiveId = activeId;
    if (activeId === id) {
      const idx = tabs.findIndex((t) => t.id === id);
      newActiveId = (tabs[idx - 1] ?? tabs[idx + 1]).id;
    }

    set({ tabs: next, activeId: newActiveId });
  },

  switchTab: (id) => set({ activeId: id }),

  updateCode: (id, code) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id || t.code === code) return t;
        return { ...t, code, isDirty: true };
      }),
    })),

  updateBreakpoints: (id, lines) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, breakpoints: new Set(lines) } : t)),
    })),

  openFileInTab: (fileName, filePath, code) => {
    const { tabs, activeId } = get();

    const existing = tabs.find((t) => t.filePath === filePath);
    if (existing) {
      set({ activeId: existing.id });
      return;
    }

    const activeIndex = tabs.findIndex((t) => t.id === activeId);
    const active = tabs[activeIndex];
    const isClean =
      active && active.fileName === "sem_titulo.alg" && !active.isDirty && active.filePath === null;

    if (isClean) {
      const updated = [...tabs];
      const freshId = newId();
      updated[activeIndex] = {
        ...active,
        id: freshId,
        fileName,
        filePath,
        code,
        isDirty: false,
        breakpoints: new Set(),
      };
      set({ tabs: updated, activeId: freshId });
      return;
    }

    const tab = createTab({ fileName, filePath, code, isDirty: false });
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
  },

  markSaved: (id, fileName, filePath) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, fileName, filePath, isDirty: false } : t)),
    })),
}));

export function getActiveTab() {
  const { tabs, activeId } = useTabsStore.getState();
  return {
    activeId,
    activeTab: tabs.find((t) => t.id === activeId) ?? tabs[0],
  };
}
