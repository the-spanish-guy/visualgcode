import { create } from "zustand";
import type { VarSnapshot } from "../../interpreter/Evaluator";
import type { DebugMode } from "../lib/DebugController";

const TIMER_DELAY_KEY = "visualg:timerDelay";
const TIMER_DELAY_MIN = 100;
const TIMER_DELAY_MAX = 2000;
const TIMER_DELAY_DEFAULT = 500;

function getInitialTimerDelay(): number {
  const saved = localStorage.getItem(TIMER_DELAY_KEY);
  const parsed = saved ? parseInt(saved) : NaN;
  return isNaN(parsed)
    ? TIMER_DELAY_DEFAULT
    : Math.min(TIMER_DELAY_MAX, Math.max(TIMER_DELAY_MIN, parsed));
}

interface DebugStore {
  debugMode: DebugMode;
  currentLine: number | null;
  callStack: string[];
  variables: VarSnapshot[];
  traceSnapshots: VarSnapshot[][];
  timerDelay: number;
  timerPaused: boolean;
  setDebugMode: (m: DebugMode) => void;
  setCurrentLine: (n: number | null) => void;
  setCallStack: (s: string[]) => void;
  setVariables: (v: VarSnapshot[]) => void;
  addTraceSnapshot: (v: VarSnapshot[]) => void;
  clearTraceSnapshots: () => void;
  setTimerDelay: (n: number) => void;
  setTimerPaused: (v: boolean) => void;
  resetDebugState: () => void;
}

export const useDebugStore = create<DebugStore>()((set) => ({
  debugMode: "idle",
  currentLine: null,
  callStack: [],
  variables: [],
  traceSnapshots: [],
  timerDelay: getInitialTimerDelay(),
  timerPaused: false,

  setDebugMode: (m) => set({ debugMode: m }),
  setCurrentLine: (n) => set({ currentLine: n }),
  setCallStack: (s) => set({ callStack: s }),
  setVariables: (v) => set({ variables: v }),
  addTraceSnapshot: (v) => set((s) => ({ traceSnapshots: [...s.traceSnapshots, v] })),
  clearTraceSnapshots: () => set({ traceSnapshots: [] }),
  setTimerDelay: (n) => {
    const clamped = Math.min(TIMER_DELAY_MAX, Math.max(TIMER_DELAY_MIN, n));
    localStorage.setItem(TIMER_DELAY_KEY, String(clamped));
    set({ timerDelay: clamped });
  },
  setTimerPaused: (v) => set({ timerPaused: v }),
  resetDebugState: () =>
    set({
      debugMode: "idle",
      currentLine: null,
      callStack: [],
      variables: [],
      timerPaused: false,
    }),
}));
