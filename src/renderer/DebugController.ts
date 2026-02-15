import type { StepCallback, VarSnapshot } from "../interpreter/Evaluator";

export type DebugMode = "idle" | "running" | "debugging" | "paused";

export interface DebugState {
  mode: DebugMode;
  currentLine: number | null;
  variables: VarSnapshot[];
  breakpoints: Set<number>;
}

export class DebugController {
  private stepResolve: (() => void) | null = null;
  private continueMode = false; // true = roda até próximo breakpoint

  constructor(
    private onStateChange: (state: Partial<DebugState>) => void,
    private breakpoints: Set<number> = new Set(),
  ) {}

  readonly onStep: StepCallback = async (line, vars) => {
    if (this.continueMode && !this.breakpoints.has(line)) {
      this.onStateChange({ currentLine: line, variables: vars });
      return;
    }

    this.continueMode = false;
    this.onStateChange({
      mode: "paused",
      currentLine: line,
      variables: vars,
    });

    await new Promise<void>((resolve) => {
      this.stepResolve = resolve;
    });
  };

  // ─── Ações do usuário ─────────────────────────────────────────────────────

  // Avança um passo
  step(): void {
    this.continueMode = false;
    this.onStateChange({ mode: "debugging" });
    this.stepResolve?.();
    this.stepResolve = null;
  }

  // Continua até próximo breakpoint
  continue(): void {
    this.continueMode = true;
    this.onStateChange({ mode: "debugging" });
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
