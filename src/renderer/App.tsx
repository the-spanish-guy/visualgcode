import { useCallback, useEffect, useRef, useState } from "react";
import { CancelSignal, type VarSnapshot } from "../interpreter/Evaluator";
import Editor, { type CompletionVar } from "./components/Editor";
import Explorer, { type FileNode } from "./components/Explorer";
import StatusBar from "./components/StatusBar";
import TabBar from "./components/TabBar";
import Terminal from "./components/Terminal";
import Toolbar from "./components/Toolbar";
import VariablesPanel from "./components/VariablesPanel";
import { DebugController, type DebugMode } from "./DebugController";
import { parseVars } from "./parseVars";
import { runCode } from "./runner";
import styles from "./styles/App.module.css";
import { useTabs } from "./useTabs";

export default function App() {
  const {
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
  } = useTabs();

  const [output, setOutput] = useState<{ lines: string[]; lineOpen: boolean }>({
    lines: [],
    lineOpen: false,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [waitingInput, setWaitingInput] = useState(false);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });
  const [errors, setErrors] = useState<string[]>([]);

  // Debug state
  const [debugMode, setDebugMode] = useState<DebugMode>("idle");
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const [variables, setVariables] = useState<VarSnapshot[]>([]);
  const [traceSnapshots, setTraceSnapshots] = useState<VarSnapshot[][]>([]);

  // Explorador de arquivos
  const [workspace, setWorkspace] = useState<{
    folderName: string;
    folderPath: string;
    tree: FileNode[];
  } | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);

  const inputResolve = useRef<((val: string) => void) | null>(null);
  const cancelSignal = useRef<CancelSignal>(new CancelSignal());
  const debugCtrl = useRef<DebugController | null>(null);

  const handleSave = useCallback(async () => {
    if (!activeTab.filePath) return handleSaveAs();
    const result = await window.electronAPI.saveFile(activeTab.filePath, activeTab.code);
    if (result.success) markSaved(activeId, activeTab.fileName, activeTab.filePath);
  }, [activeTab, activeId, markSaved]);

  const handleSaveAs = useCallback(async () => {
    const result = await window.electronAPI.saveFileAs(activeTab.code);
    if (!result.success || result.canceled) return;
    const fileName = result.filePath!.split(/[\\/]/).pop()!;
    markSaved(activeId, fileName, result.filePath!);
  }, [activeTab.code, activeId, markSaved]);

  const handleOpen = useCallback(async () => {
    const result = await window.electronAPI.openFileDialog();
    if (!result.success || result.canceled) return;
    openFileInTab(result.fileName!, result.filePath!, result.content!);
  }, [openFileInTab]);

  const handleOpenFolder = useCallback(async () => {
    const result = await window.electronAPI.openFolderDialog();
    if (!result.success || result.canceled) return;
    setWorkspace({
      folderName: result.folderName!,
      folderPath: result.folderPath!,
      tree: result.tree!,
    });
    setExplorerOpen(true);
  }, []);

  const handleToggleExplorer = useCallback(async () => {
    if (!workspace) {
      // Sem pasta — abre diálogo para escolher
      const result = await window.electronAPI.openFolderDialog();
      if (!result.success || result.canceled) return;
      setWorkspace({
        folderName: result.folderName!,
        folderPath: result.folderPath!,
        tree: result.tree!,
      });
      setExplorerOpen(true);
    } else {
      setExplorerOpen((o) => !o);
    }
  }, [workspace]);

  const handleExplorerFileOpen = useCallback(
    async (filePath: string) => {
      const result = await window.electronAPI.readFile(filePath);
      if (!result.success) return;
      openFileInTab(result.fileName!, result.filePath!, result.content!);
    },
    [openFileInTab],
  );

  const appendOutput = useCallback((text: string) => {
    setOutput((prev) => {
      const lines = [...prev.lines];
      const parts = text.split("\n");
      const endsWithNewline = text.endsWith("\n");

      parts.forEach((part, i) => {
        if (i === 0 && prev.lineOpen && lines.length > 0) {
          lines[lines.length - 1] += part;
        } else {
          lines.push(part);
        }
      });

      /**
       * escreval("Olá\n") -> ["Olá", ""]
       * Remove o "" vazio final gerado pelo split em textos que terminam com \n
       */
      if (endsWithNewline && lines[lines.length - 1] === "") lines.pop();

      return { lines, lineOpen: !endsWithNewline };
    });
  }, []);

  const makeInputCallback = useCallback(
    () =>
      new Promise<string>((resolve) => {
        setWaitingInput(true);
        inputResolve.current = resolve;
      }),
    [],
  );

  const handleRun = useCallback(async () => {
    cancelSignal.current = new CancelSignal();
    setIsRunning(true);
    setOutput({ lines: [], lineOpen: false });
    setErrors([]);
    setCurrentLine(null);
    setDebugMode("running");

    const result = await runCode(
      activeTab.code,
      { onOutput: appendOutput, onInput: makeInputCallback },
      cancelSignal.current,
    );

    if (result.errors.length > 0) setErrors(result.errors);
    setIsRunning(false);
    setDebugMode("idle");
  }, [activeTab.code, appendOutput, makeInputCallback]);

  const handleDebug = useCallback(async () => {
    cancelSignal.current = new CancelSignal();

    const ctrl = new DebugController((state) => {
      if (state.mode !== undefined) setDebugMode(state.mode);
      if (state.currentLine !== undefined) setCurrentLine(state.currentLine);
      if (state.variables !== undefined) {
        setVariables(state.variables);
        setTraceSnapshots((prev) => [...prev, state.variables!]);
      }
    }, activeTab.breakpoints);

    debugCtrl.current = ctrl;
    setIsRunning(true);
    setOutput({ lines: [], lineOpen: false });
    setErrors([]);
    setDebugMode("debugging");
    setVariables([]);
    setTraceSnapshots([]);

    const result = await runCode(
      activeTab.code,
      { onOutput: appendOutput, onInput: makeInputCallback },
      cancelSignal.current,
      ctrl.onStep,
    );

    if (result.errors.length > 0) setErrors(result.errors);
    setIsRunning(false);
    setDebugMode("idle");
    setCurrentLine(null);
    debugCtrl.current = null;
  }, [activeTab.code, activeTab.breakpoints, appendOutput, makeInputCallback]);

  const handleStep = useCallback(() => debugCtrl.current?.step(), []);
  const handleContinue = useCallback(() => debugCtrl.current?.continue(), []);

  const handleStop = useCallback(() => {
    cancelSignal.current.cancel();
    debugCtrl.current?.stop();
    debugCtrl.current = null;
    if (inputResolve.current) {
      inputResolve.current("");
      inputResolve.current = null;
    }
    setIsRunning(false);
    setWaitingInput(false);
    setDebugMode("idle");
    setCurrentLine(null);
    setOutput((prev) => ({ ...prev, lines: [...prev.lines, "", "⬛ Execução interrompida."] }));
  }, []);

  const handleTerminalInput = useCallback((value: string) => {
    if (inputResolve.current) {
      setOutput((prev) => {
        const lines = [...prev.lines];
        if (prev.lineOpen && lines.length > 0) {
          lines[lines.length - 1] += value;
        } else {
          lines.push(value);
        }
        return { lines, lineOpen: false };
      });
      inputResolve.current(value);
      inputResolve.current = null;
      setWaitingInput(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setOutput({ lines: [], lineOpen: false });
    setErrors([]);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // F5 — Executar (idle) ou Continuar (pausado)
      if (e.key === "F5" && !e.shiftKey) {
        e.preventDefault();
        if (debugMode === "paused") {
          handleContinue();
          return;
        }
        if (debugMode === "idle") {
          handleRun();
          return;
        }
        return;
      }

      // F9 — Toggle breakpoint na linha atual do cursor
      if (e.key === "F9") {
        e.preventDefault();
        const line = cursorInfo.line;
        const updated = new Set(activeTab.breakpoints);
        if (updated.has(line)) updated.delete(line);
        else updated.add(line);
        updateBreakpoints(activeId, Array.from(updated));
        return;
      }

      // F10 — Próximo passo (apenas quando pausado)
      if (e.key === "F10") {
        e.preventDefault();
        if (debugMode === "paused") handleStep();
        return;
      }

      // Esc - Para parar a execução ou debugging
      if (e.key === "Escape") {
        e.preventDefault();
        if (isRunning) handleStop();
        return;
      }

      if (!ctrl) return;
      if (e.key === "s" && e.shiftKey) {
        e.preventDefault();
        handleSaveAs();
        return;
      }
      if (e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.key === "o") {
        e.preventDefault();
        handleOpen();
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        newTab();
        return;
      }
      if (e.key === "t") {
        e.preventDefault();
        newTab();
        return;
      }
      if (e.key === "w") {
        e.preventDefault();
        closeTab(activeId);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeId,
    debugMode,
    isRunning,
    cursorInfo.line,
    activeTab.breakpoints,
    newTab,
    closeTab,
    handleRun,
    handleSave,
    handleStep,
    handleStop,
    handleOpen,
    handleSaveAs,
    handleContinue,
    updateBreakpoints,
  ]);

  const completionVars: CompletionVar[] = parseVars(activeTab.code);
  const isDebugging = debugMode === "debugging" || debugMode === "paused";

  return (
    <div className={styles.root}>
      <Toolbar
        isRunning={isRunning}
        debugMode={debugMode}
        isDirty={activeTab.isDirty}
        fileName={activeTab.fileName}
        onNew={newTab}
        onRun={handleRun}
        onOpen={handleOpen}
        onSave={handleSave}
        onStep={handleStep}
        onStop={handleStop}
        onDebug={handleDebug}
        onSaveAs={handleSaveAs}
        onContinue={handleContinue}
        onOpenFolder={handleOpenFolder}
      />

      <TabBar
        tabs={tabs}
        activeId={activeId}
        workspaceName={workspace?.folderName ?? null}
        explorerOpen={explorerOpen}
        onNew={newTab}
        onClose={closeTab}
        onSwitch={switchTab}
        onToggleExplorer={handleToggleExplorer}
      />

      <div className={styles.workarea}>
        <div className={styles.mainRow}>
          <div className={styles.sidebar} style={{ width: workspace && explorerOpen ? 220 : 0 }}>
            {workspace && (
              <Explorer
                tree={workspace.tree}
                folderName={workspace.folderName}
                activeFilePath={activeTab.filePath}
                onFileOpen={handleExplorerFileOpen}
              />
            )}
          </div>

          <div className={styles.editorPane}>
            <Editor
              completionVars={completionVars}
              errors={errors}
              currentLine={currentLine}
              breakpoints={activeTab.breakpoints}
              tabKey={{ id: activeId, initialContent: activeTab.code }}
              onCursorChange={setCursorInfo}
              onChange={(val) => updateCode(activeId, val)}
              onBreakpointsChange={(lines) => updateBreakpoints(activeId, lines)}
            />
          </div>

          <VariablesPanel variables={variables} isVisible={isDebugging} />
        </div>

        <div className={styles.bottomPane}>
          <Terminal
            errors={errors}
            lines={output.lines}
            isRunning={isRunning}
            waitingInput={waitingInput}
            traceSnapshots={traceSnapshots}
            onClear={handleClear}
            onInput={handleTerminalInput}
            onClearTrace={() => setTraceSnapshots([])}
          />
        </div>
      </div>

      <StatusBar
        col={cursorInfo.col}
        isRunning={isRunning}
        debugMode={debugMode}
        errors={errors.length}
        line={cursorInfo.line}
      />
    </div>
  );
}
