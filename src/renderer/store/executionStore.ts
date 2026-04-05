import { create } from "zustand";
import { CancelSignal } from "../../interpreter/Evaluator";
import type { StaticWarning } from "../../interpreter/StaticAnalyzer";
import { DebugController } from "../lib/DebugController";
import { runCode } from "../lib/runner";
import { useDebugStore } from "./debugStore";
import { getActiveTab, useTabsStore } from "./tabsStore";

/**
 * Refs de execução
 */
let cancelSignalRef = new CancelSignal();
let inputResolveRef: ((v: string) => void) | null = null;
let debugCtrlRef: DebugController | null = null;

/**
 * Definindo stores
 */
interface ExecutionStore {
  isRunning: boolean;
  waitingInput: boolean;
  output: { lines: string[]; lineOpen: boolean };
  errors: string[];
  warnings: StaticWarning[];

  // State setters
  setIsRunning: (v: boolean) => void;
  setWaitingInput: (v: boolean) => void;
  appendOutput: (text: string) => void;
  clearOutput: () => void;
  setErrors: (e: string[]) => void;
  setWarnings: (w: StaticWarning[]) => void;
  clearErrors: () => void;

  // Handlers
  handleRun: () => Promise<void>;
  handleDebug: () => Promise<void>;
  handleTimer: () => Promise<void>;
  handleStep: () => void;
  handleContinue: () => void;
  handleStop: () => void;
  handleTerminalInput: (value: string) => void;
  handleClear: () => void;
}

function makeInputCallback(): Promise<string> {
  return new Promise<string>((resolve) => {
    useExecutionStore.getState().setWaitingInput(true);
    inputResolveRef = resolve;
  });
}

export const useExecutionStore = create<ExecutionStore>()((set, get) => ({
  isRunning: false,
  waitingInput: false,
  output: { lines: [], lineOpen: false },
  errors: [],
  warnings: [],

  setIsRunning: (v) => set({ isRunning: v }),
  setWaitingInput: (v) => set({ waitingInput: v }),

  appendOutput: (text) =>
    set((s) => {
      const lines = [...s.output.lines];
      const parts = text.split("\n");
      const endsWithNewline = text.endsWith("\n");

      parts.forEach((part, i) => {
        if (i === 0 && s.output.lineOpen && lines.length > 0) {
          lines[lines.length - 1] += part;
        } else {
          lines.push(part);
        }
      });

      if (endsWithNewline && lines[lines.length - 1] === "") lines.pop();

      return { output: { lines, lineOpen: !endsWithNewline } };
    }),

  clearOutput: () => set({ output: { lines: [], lineOpen: false } }),
  setErrors: (e) => set({ errors: e }),
  setWarnings: (w) => set({ warnings: w }),
  clearErrors: () => set({ errors: [] }),

  handleRun: async () => {
    cancelSignalRef = new CancelSignal();
    const { activeTab } = getActiveTab();
    const debug = useDebugStore.getState();

    set({ isRunning: true, output: { lines: [], lineOpen: false }, errors: [] });
    debug.setDebugMode("running");
    debug.setCurrentLine(null);

    const makeDebugBreakCtrl = () => {
      if (!debugCtrlRef) {
        const { activeTab: tab } = getActiveTab();
        const ctrl = new DebugController((state) => {
          const d = useDebugStore.getState();
          if (state.mode !== undefined) d.setDebugMode(state.mode);
          if (state.currentLine !== undefined) d.setCurrentLine(state.currentLine);
          if (state.callStack !== undefined) d.setCallStack(state.callStack);
          if (state.variables !== undefined) {
            d.setVariables(state.variables);
            d.addTraceSnapshot(state.variables);
          }
        }, tab.breakpoints);
        debugCtrlRef = ctrl;
      }
      return debugCtrlRef;
    };

    const result = await runCode(
      activeTab.code,
      {
        onOutput: (t) => get().appendOutput(t),
        onInput: makeInputCallback,
        onClearScreen: () => get().clearOutput(),
        onDebugBreak: async (line, vars, callStack) => {
          await makeDebugBreakCtrl().forceBreak(line, vars, callStack);
        },
      },
      cancelSignalRef,
    );

    if (result.errors.length > 0) set({ errors: result.errors });
    if (result.warnings.length > 0) set({ warnings: result.warnings });
    set({ isRunning: false });
    debug.setDebugMode("idle");
    debugCtrlRef = null;
  },

  handleDebug: async () => {
    cancelSignalRef = new CancelSignal();
    const { activeTab } = getActiveTab();
    const debug = useDebugStore.getState();

    const ctrl = new DebugController((state) => {
      const d = useDebugStore.getState();
      if (state.mode !== undefined) d.setDebugMode(state.mode);
      if (state.currentLine !== undefined) d.setCurrentLine(state.currentLine);
      if (state.callStack !== undefined) d.setCallStack(state.callStack);
      if (state.variables !== undefined) {
        d.setVariables(state.variables);
        d.addTraceSnapshot(state.variables);
      }
    }, activeTab.breakpoints);

    debugCtrlRef = ctrl;

    set({ isRunning: true, output: { lines: [], lineOpen: false }, errors: [] });
    debug.setDebugMode("debugging");
    debug.setVariables([]);
    debug.clearTraceSnapshots();
    debug.setCallStack([]);

    const result = await runCode(
      activeTab.code,
      {
        onOutput: (t) => get().appendOutput(t),
        onInput: makeInputCallback,
        onClearScreen: () => get().clearOutput(),
        onDebugBreak: (line, vars, callStack) => ctrl.forceBreak(line, vars, callStack),
      },
      cancelSignalRef,
      ctrl.onStep,
    );

    if (result.errors.length > 0) set({ errors: result.errors });
    set({ isRunning: false });
    debug.resetDebugState();
    debugCtrlRef = null;
  },

  handleTimer: async () => {
    cancelSignalRef = new CancelSignal();
    const { activeTab } = getActiveTab();
    const debug = useDebugStore.getState();

    const ctrl = new DebugController(
      (state) => {
        const d = useDebugStore.getState();
        if (state.mode !== undefined) d.setDebugMode(state.mode);
        if (state.currentLine !== undefined) d.setCurrentLine(state.currentLine);
        if (state.callStack !== undefined) d.setCallStack(state.callStack);
        if (state.timerPaused !== undefined) d.setTimerPaused(state.timerPaused);
        if (state.variables !== undefined) {
          d.setVariables(state.variables);
          d.addTraceSnapshot(state.variables);
        }
      },
      activeTab.breakpoints,
      debug.timerDelay,
    );

    debugCtrlRef = ctrl;

    set({ isRunning: true, output: { lines: [], lineOpen: false }, errors: [] });
    debug.setDebugMode("timer");
    debug.setVariables([]);
    debug.clearTraceSnapshots();
    debug.setCallStack([]);
    debug.setTimerPaused(false);

    const result = await runCode(
      activeTab.code,
      {
        onOutput: (t) => get().appendOutput(t),
        onInput: makeInputCallback,
        onClearScreen: () => get().clearOutput(),
        onDebugBreak: (line, vars, callStack) => ctrl.forceBreak(line, vars, callStack),
      },
      cancelSignalRef,
      ctrl.onStep,
    );

    if (result.errors.length > 0) set({ errors: result.errors });
    set({ isRunning: false });
    debug.resetDebugState();
    debugCtrlRef = null;
  },

  handleStep: () => debugCtrlRef?.step(),
  handleContinue: () => debugCtrlRef?.continue(),

  handleStop: () => {
    cancelSignalRef.cancel();
    debugCtrlRef?.stop();
    debugCtrlRef = null;

    if (inputResolveRef) {
      inputResolveRef("");
      inputResolveRef = null;
    }

    set((s) => ({
      isRunning: false,
      waitingInput: false,
      output: {
        ...s.output,
        lines: [...s.output.lines, "", "⬛ Execução interrompida."],
      },
    }));

    useDebugStore.getState().resetDebugState();
  },

  handleTerminalInput: (value) => {
    if (!inputResolveRef) return;

    set((s) => {
      const lines = [...s.output.lines];
      if (s.output.lineOpen && lines.length > 0) {
        lines[lines.length - 1] += value;
      } else {
        lines.push(value);
      }
      return { output: { lines, lineOpen: false }, waitingInput: false };
    });

    inputResolveRef(value);
    inputResolveRef = null;
  },

  handleClear: () => set({ output: { lines: [], lineOpen: false }, errors: [] }),
}));

// Exporta breakpoints da aba ativa para uso externo
export function getActiveBreakpoints(): Set<number> {
  const { activeTab } = getActiveTab();
  return activeTab.breakpoints;
}

// Faz getState disponível para uso fora de componentes
export { useTabsStore };
