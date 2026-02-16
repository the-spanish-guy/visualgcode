import { useCallback, useEffect, useRef, useState } from "react";

export interface Tab {
  id: string;
  fileName: string;
  filePath: string | null;
  code: string;
  isDirty: boolean;
  breakpoints: Set<number>;
}

interface UseTabsReturn {
  tabs: Tab[];
  activeId: string;
  activeTab: Tab;
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

function createTab(overrides: Partial<Tab> = {}): Tab {
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

export function useTabs(): UseTabsReturn {
  const [tabs, setTabs] = useState<Tab[]>([createTab()]);
  const [activeId, setActiveId] = useState<string>(tabs[0].id);
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // Atualiza título da janela
  useEffect(() => {
    const dirty = activeTab.isDirty ? "● " : "";
    document.title = `${dirty}${activeTab.fileName} — VisuAlg IDE`;
  }, [activeTab.fileName, activeTab.isDirty]);

  const newTab = useCallback(() => {
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === id);

      if (tab?.isDirty) {
        const confirmed = window.confirm(
          `"${tab.fileName}" tem alterações não salvas. Deseja fechar mesmo assim?`,
        );
        if (!confirmed) return prev;
      }

      const next = prev.filter((t) => t.id !== id);

      // Sempre mantém pelo menos uma aba
      if (next.length === 0) {
        const fresh = createTab();
        setActiveId(fresh.id);
        return [fresh];
      }

      // Se fechou a aba ativa, ativa a anterior ou a próxima
      setActiveId((current) => {
        if (current !== id) return current;
        const idx = prev.findIndex((t) => t.id === id);
        return (prev[idx - 1] ?? prev[idx + 1]).id;
      });

      return next;
    });
  }, []);

  const switchTab = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const updateCode = useCallback((id: string, code: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        // Não marca dirty se o conteúdo não mudou (evita falso dirty na troca de modelo)
        if (t.code === code) return t;
        return { ...t, code, isDirty: true };
      }),
    );
  }, []);

  const updateBreakpoints = useCallback((id: string, lines: number[]) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, breakpoints: new Set(lines) } : t)));
  }, []);

  // Abrir arquivo em aba
  // Regras:
  // 1. Se o arquivo já está aberto em alguma aba → apenas ativa ela
  // 2. Se a aba ativa é sem_titulo e está limpa → substitui ela pelo arquivo
  // 3. Caso contrário → abre numa nova aba

  const openFileInTab = useCallback((fileName: string, filePath: string, code: string) => {
    setTabs((prev) => {
      // Regra 1: arquivo já aberto
      const existing = prev.find((t) => t.filePath === filePath);
      if (existing) {
        setActiveId(existing.id);
        return prev;
      }

      // Identifica a aba ativa
      const activeIndex = prev.findIndex((t) => t.id === activeIdRef.current);
      const active = prev[activeIndex];
      const isClean =
        active &&
        active.fileName === "sem_titulo.alg" &&
        !active.isDirty &&
        active.filePath === null;

      // 2: substitui aba limpa — gera novo id para forçar recriação do modelo
      if (isClean) {
        const updated = [...prev];
        updated[activeIndex] = {
          ...active,
          id: newId(), // novo id → useEffect do Editor recria o modelo com conteúdo correto
          fileName,
          filePath,
          code,
          isDirty: false,
          breakpoints: new Set(),
        };
        setActiveId(updated[activeIndex].id);
        return updated;
      }

      // 3: nova aba
      const tab = createTab({ fileName, filePath, code, isDirty: false });
      setActiveId(tab.id);
      return [...prev, tab];
    });
  }, []);

  const markSaved = useCallback((id: string, fileName: string, filePath: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, fileName, filePath, isDirty: false } : t)),
    );
  }, []);

  return {
    tabs,
    activeId,
    activeTab,
    newTab,
    closeTab,
    switchTab,
    markSaved,
    updateCode,
    openFileInTab,
    updateBreakpoints,
  };
}
