import { useEffect } from "react";
import { createTab, useTabsStore } from "../store/tabsStore";

export type { Tab } from "../store/tabsStore";

export function useTabs() {
  const {
    tabs,
    activeId,
    newTab,
    closeTab,
    switchTab,
    updateCode,
    updateBreakpoints,
    openFileInTab,
    markSaved,
  } = useTabsStore();

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  useEffect(() => {
    const dirty = activeTab.isDirty ? "● " : "";
    document.title = `${dirty}${activeTab.fileName} — VisuAlg IDE`;
  }, [activeTab.fileName, activeTab.isDirty]);

  return {
    tabs,
    activeId,
    activeTab,
    newTab,
    closeTab,
    switchTab,
    updateCode,
    updateBreakpoints,
    openFileInTab,
    markSaved,
  };
}

export { createTab };
