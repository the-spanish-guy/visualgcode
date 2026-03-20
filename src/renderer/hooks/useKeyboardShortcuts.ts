import { useEffect } from "react";
import { useDebugStore } from "../store/debugStore";
import { useEditorStore } from "../store/editorStore";
import { useExecutionStore } from "../store/executionStore";
import { useTabsStore } from "../store/tabsStore";
import { useWorkspaceStore } from "../store/workspaceStore";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const exec = useExecutionStore.getState();
      const debug = useDebugStore.getState();
      const editor = useEditorStore.getState();
      const tabs = useTabsStore.getState();
      const workspace = useWorkspaceStore.getState();

      const isRunning = exec.isRunning;
      const debugMode = debug.debugMode;

      // F5 — Executar (idle) ou Continuar (pausado)
      if (e.key === "F5" && !e.shiftKey) {
        e.preventDefault();
        if (debugMode === "paused" || debugMode === "timer") {
          exec.handleContinue();
          return;
        }
        if (debugMode === "idle") {
          exec.handleRun();
          return;
        }
        return;
      }

      // Shift+F5 — iniciar/parar timer
      if (e.key === "F5" && e.shiftKey) {
        e.preventDefault();
        if (debugMode === "idle") {
          exec.handleTimer();
          return;
        }
        if (isRunning) {
          exec.handleStop();
          return;
        }
        return;
      }

      // F9 — Toggle breakpoint na linha atual
      if (e.key === "F9") {
        e.preventDefault();
        const { activeId, updateBreakpoints } = tabs;
        const activeTabs = tabs.tabs;
        const active = activeTabs.find((t) => t.id === activeId) ?? activeTabs[0];
        const line = useEditorStore.getState().cursorInfo.line;
        const updated = new Set(active.breakpoints);
        if (updated.has(line)) updated.delete(line);
        else updated.add(line);
        updateBreakpoints(activeId, Array.from(updated));
        return;
      }

      // F10 — Próximo passo
      if (e.key === "F10") {
        e.preventDefault();
        if (debugMode === "paused" || debugMode === "timer") exec.handleStep();
        return;
      }

      // Esc — Parar
      if (e.key === "Escape") {
        e.preventDefault();
        if (isRunning) exec.handleStop();
        return;
      }

      if (!ctrl) return;

      if (e.key === "s" && e.shiftKey) {
        e.preventDefault();
        workspace.handleSaveAs();
        return;
      }
      if (e.key === "s") {
        e.preventDefault();
        workspace.handleSave();
        return;
      }
      if (e.key === "o") {
        e.preventDefault();
        workspace.handleOpen();
        return;
      }
      if (e.key === "n" || e.key === "t") {
        e.preventDefault();
        tabs.newTab();
        return;
      }
      if (e.key === "w") {
        e.preventDefault();
        tabs.closeTab(tabs.activeId);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        editor.adjustFontSize(1);
        return;
      }
      if (e.key === "-") {
        e.preventDefault();
        editor.adjustFontSize(-1);
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        editor.resetFontSize();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
