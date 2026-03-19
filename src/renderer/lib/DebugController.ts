import type { StepCallback, VarSnapshot } from "../../interpreter/Evaluator";

export type DebugMode = "idle" | "running" | "debugging" | "paused" | "timer";

export interface DebugState {
  mode: DebugMode;
  callStack: string[];
  currentLine: number | null;
  variables: VarSnapshot[];
  breakpoints: Set<number>;
  timerPaused: boolean; // ← novo: true quando timer está parado em breakpoint
}

export class DebugController {
  private stepResolve: (() => void) | null = null;
  private continueMode = false; // true = roda até próximo breakpoint
  private timerPaused = false; // ← novo flag interno

  constructor(
    private onStateChange: (state: Partial<DebugState>) => void,
    private breakpoints: Set<number> = new Set(),
    private timerDelay: number = 0,
  ) {}

  readonly onStep: StepCallback = async (line, vars, callStack) => {
    if (this.timerDelay > 0 && !this.breakpoints.has(line)) {
      this.timerPaused = false;
      this.onStateChange({
        currentLine: line,
        variables: vars,
        callStack,
        timerPaused: false,
      });
      await new Promise<void>((resolve) => setTimeout(resolve, this.timerDelay));
      return;
    }

    // ── Breakpoint no timer ou modo debug normal: pausa e aguarda usuário ─────
    this.timerPaused = this.timerDelay > 0; // true só se veio do timer
    this.continueMode = false;
    this.onStateChange({
      // Mantém "timer" se veio do timer, "paused" se veio do debug normal
      mode: this.timerDelay > 0 ? "timer" : "paused",
      currentLine: line,
      variables: vars,
      callStack,
      timerPaused: this.timerPaused,
    });

    await new Promise<void>((resolve) => {
      this.stepResolve = resolve;
    });

    // Ao retomar, limpa o flag
    this.timerPaused = false;
    this.onStateChange({ timerPaused: false });
  };

  // ─── Ações do usuário ─────────────────────────────────────────────────────

  // Avança um passo
  step(): void {
    this.continueMode = false;
    this.onStateChange({ mode: this.timerDelay > 0 ? "timer" : "debugging" });
    this.stepResolve?.();
    this.stepResolve = null;
  }

  // Continua até próximo breakpoint
  continue(): void {
    this.continueMode = true;
    this.onStateChange({ mode: this.timerDelay > 0 ? "timer" : "debugging" });
    this.stepResolve?.();
    this.stepResolve = null;
  }

  // Para o debug — resolve a Promise pendente para não vazar
  stop(): void {
    this.stepResolve?.();
    this.stepResolve = null;
  }

  updateBreakpoints(lines: number[]): void {
    this.breakpoints = new Set(lines);
  }
}
