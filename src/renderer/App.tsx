import { useCallback, useRef, useState } from "react";
import { CancelSignal, type VarSnapshot } from "../interpreter/Evaluator";
import Editor from "./components/Editor";
import Terminal from "./components/Terminal";
import Toolbar from "./components/Toolbar";
import { DebugController, type DebugMode } from "./DebugController";
import { runCode } from "./runner";
import styles from "./styles/app.module.css";

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
  const [output, setOutput] = useState<string[]>([]);
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

  const appendOutput = (text: string) => {
    setOutput((prev) => {
      const lines = text.split("\n");
      const updated = [...prev];
      lines.forEach((line, i) => {
        if (i === 0 && updated.length > 0) {
          updated[updated.length - 1] += line;
        } else {
          updated.push(line);
        }
      });
      if (updated[updated.length - 1] === "") updated.pop();
      return updated;
    });
  };

  const makeInputCallback = () =>
    new Promise<string>((resolve) => {
      setWaitingInput(true);
      inputResolve.current = resolve;
    });

  const handleRun = useCallback(async () => {
    cancelSignal.current = new CancelSignal();
    setIsRunning(true);
    setOutput([]);
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
    setOutput([]);
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
    setOutput((prev) => [...prev, "", "⬛ Execução interrompida."]);
  }, []);

  const handleTerminalInput = useCallback((value: string) => {
    if (inputResolve.current) {
      setOutput((prev) => [...prev, value]);
      inputResolve.current(value);
      inputResolve.current = null;
      setWaitingInput(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setOutput([]);
    setErrors([]);
  }, []);

  const handleBreakpointsChange = useCallback((lines: number[]) => {
    setBreakpoints(new Set(lines));
    debugCtrl.current?.updateBreakpoints(lines);
  }, []);

  return (
    <div className={styles.root}>
      <Toolbar
        isRunning={isRunning}
        debugMode={debugMode}
        onRun={handleRun}
        onDebug={handleDebug}
        onStep={handleStep}
        onContinue={handleContinue}
        onStop={handleStop}
      />

      <div className={styles.workarea}>
        <div className={styles.mainRow}>
          <div className={styles.editorPane}>
            <Editor
              value={code}
              onChange={setCode}
              onCursorChange={setCursorInfo}
              onBreakpointsChange={handleBreakpointsChange}
              breakpoints={breakpoints}
              currentLine={currentLine}
            />
          </div>
        </div>

        <div className={styles.bottomPane}>
          <Terminal
            lines={output}
            isRunning={isRunning}
            waitingInput={waitingInput}
            onInput={handleTerminalInput}
            onClear={handleClear}
            errors={errors}
          />
        </div>
      </div>
    </div>
  );
}
