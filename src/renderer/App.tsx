import { useCallback, useEffect, useRef, useState } from "react";
import { CancelSignal, type VarSnapshot } from "../interpreter/Evaluator";
import Editor from "./components/Editor";
import StatusBar from "./components/StatusBar";
import Terminal from "./components/Terminal";
import Toolbar from "./components/Toolbar";
import VariablesPanel from "./components/VariablesPanel";
import { DebugController, type DebugMode } from "./DebugController";
import { runCode } from "./runner";
import styles from "./styles/App.module.css";
import { useFile } from "./useFile";

const STARTER_CODE = `algoritmo "Meu Programa"

var
   nome: caractere
   idade: inteiro

inicio
   escreval("=== Bem-vindo ao VisuAlg IDE ===")
   escreval("")
   escreva("Digite seu nome: ")
   leia(nome)
   escreva("Digite sua idade: ")
   leia(idade)
   escreval("")
   escreval("Olá, ", nome, "!")

   se idade >= 18 entao
      escreval("Você é maior de idade.")
   senao
      escreval("Você é menor de idade.")
   fimse

fimalgoritmo
`;

export default function App() {
  const [code, setCode] = useState(STARTER_CODE);
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
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());

  const inputResolve = useRef<((val: string) => void) | null>(null);
  const cancelSignal = useRef<CancelSignal>(new CancelSignal());
  const debugCtrl = useRef<DebugController | null>(null);

  const { fileState, markDirty, handleNew, handleOpen, handleSave, handleSaveAs } = useFile();

  const handleCodeChange = useCallback(
    (val: string) => {
      setCode(val);
      markDirty();
    },
    [markDirty],
  );

  const handleOpenFile = useCallback(async () => {
    const result = await handleOpen();
    if (result) setCode(result.code);
  }, [handleOpen]);

  const handleNewFile = useCallback(async () => {
    const ok = await handleNew();
    if (ok) setCode(STARTER_CODE);
  }, [handleNew]);

  /**
   * Definindo alguns atalhos de teclado
   * TODO: talvez seja interessante extrair isso pra um hook separado, tipo useShortcuts() ou algo assim
   */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      if (e.key === "s" && e.shiftKey) {
        e.preventDefault();
        handleSaveAs(code);
        return;
      }
      if (e.key === "s") {
        e.preventDefault();
        handleSave(code);
        return;
      }
      if (e.key === "o") {
        e.preventDefault();
        handleOpenFile();
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        handleNewFile();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code, handleSave, handleSaveAs, handleOpenFile, handleNewFile]);

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
      if (endsWithNewline && lines[lines.length - 1] === "") {
        lines.pop();
      }

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
      code,
      { onOutput: appendOutput, onInput: makeInputCallback },
      cancelSignal.current,
    );

    if (result.errors.length > 0) setErrors(result.errors);
    setIsRunning(false);
    setDebugMode("idle");
  }, [code]);

  const handleDebug = useCallback(async () => {
    cancelSignal.current = new CancelSignal();

    const ctrl = new DebugController((state) => {
      if (state.mode !== undefined) setDebugMode(state.mode);
      if (state.currentLine !== undefined) setCurrentLine(state.currentLine);
      if (state.variables !== undefined) setVariables(state.variables);
    }, breakpoints);

    debugCtrl.current = ctrl;
    setIsRunning(true);
    setOutput({ lines: [], lineOpen: false });
    setErrors([]);
    setDebugMode("debugging");
    setVariables([]);

    const result = await runCode(
      code,
      { onOutput: appendOutput, onInput: makeInputCallback },
      cancelSignal.current,
      ctrl.onStep,
    );

    if (result.errors.length > 0) setErrors(result.errors);
    setIsRunning(false);
    setDebugMode("idle");
    setCurrentLine(null);
    debugCtrl.current = null;
  }, [code, breakpoints]);

  const handleStep = useCallback(() => {
    debugCtrl.current?.step();
  }, []);

  const handleContinue = useCallback(() => {
    debugCtrl.current?.continue();
  }, []);

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

  const handleBreakpointsChange = useCallback((lines: number[]) => {
    setBreakpoints(new Set(lines));
    debugCtrl.current?.updateBreakpoints(lines);
  }, []);

  const isDebugging = debugMode === "debugging" || debugMode === "paused";

  return (
    <div className={styles.root}>
      <Toolbar
        isRunning={isRunning}
        debugMode={debugMode}
        isDirty={fileState.isDirty}
        fileName={fileState.fileName}
        onRun={handleRun}
        onStep={handleStep}
        onStop={handleStop}
        onDebug={handleDebug}
        onNew={handleNewFile}
        onOpen={handleOpenFile}
        onContinue={handleContinue}
        onSave={() => handleSave(code)}
        onSaveAs={() => handleSaveAs(code)}
      />

      <div className={styles.workarea}>
        <div className={styles.mainRow}>
          <div className={styles.editorPane}>
            <Editor
              value={code}
              errors={errors}
              currentLine={currentLine}
              breakpoints={breakpoints}
              onChange={handleCodeChange}
              onCursorChange={setCursorInfo}
              onBreakpointsChange={handleBreakpointsChange}
            />
          </div>

          <VariablesPanel variables={variables} isVisible={isDebugging} />
        </div>

        <div className={styles.bottomPane}>
          <Terminal
            lines={output.lines}
            errors={errors}
            isRunning={isRunning}
            waitingInput={waitingInput}
            onClear={handleClear}
            onInput={handleTerminalInput}
          />
        </div>
      </div>

      <StatusBar
        line={cursorInfo.line}
        col={cursorInfo.col}
        isRunning={isRunning}
        errors={errors.length}
        debugMode={debugMode}
      />
    </div>
  );
}
