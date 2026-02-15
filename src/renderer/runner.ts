import { type CancelSignal, Evaluator, type StepCallback } from "../interpreter/Evaluator";
import { Lexer } from "../interpreter/Lexer";
import { Parser } from "../interpreter/Parser";

export interface RunResult {
  errors: string[];
}

export interface RunCallbacks {
  onOutput: (text: string) => void;
  onInput: () => Promise<string>;
}

export async function runCode(
  code: string,
  callbacks: RunCallbacks,
  cancelSignal?: CancelSignal,
  onStep?: StepCallback,
): Promise<RunResult> {
  const errors: string[] = [];

  try {
    const tokens = new Lexer(code).tokenize();
    const ast = new Parser(tokens).parse();
    const evaluator = new Evaluator(callbacks.onOutput, callbacks.onInput, cancelSignal, onStep);

    await evaluator.run(ast);
  } catch (err) {
    if (!(err instanceof Error && err.message === "cancelled")) {
      errors.push((err as Error).message);
    }
  }

  return { errors };
}
