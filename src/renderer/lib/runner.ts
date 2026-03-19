import { type CancelSignal, Evaluator, type StepCallback } from "../../interpreter/Evaluator";
import { Lexer } from "../../interpreter/Lexer";
import { Parser } from "../../interpreter/Parser";
import { analyzeAST, type StaticWarning } from "../../interpreter/StaticAnalyzer";

export interface RunResult {
  errors: string[];
  warnings: StaticWarning[];
}

export interface RunCallbacks {
  onOutput: (text: string) => void;
  onInput: () => Promise<string>;
  onClearScreen?: () => void;
}

export async function runCode(
  code: string,
  callbacks: RunCallbacks,
  cancelSignal?: CancelSignal,
  onStep?: StepCallback,
): Promise<RunResult> {
  const errors: string[] = [];
  const warnings: StaticWarning[] = [];

  try {
    const tokens = new Lexer(code).tokenize();
    const ast = new Parser(tokens).parse();
    warnings.push(...analyzeAST(ast));
    const evaluator = new Evaluator(
      callbacks.onOutput,
      callbacks.onInput,
      cancelSignal,
      onStep,
      callbacks.onClearScreen,
    );

    await evaluator.run(ast);
  } catch (err) {
    if (!(err instanceof Error && err.message === "cancelled")) {
      errors.push((err as Error).message);
    }
  }

  return { errors, warnings };
}
