import { describe, expect, test } from "vitest";
import { analyzeAST } from "./StaticAnalyzer";
import { type DebugBreakCallback, CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

async function runCode(
  code: string,
  onDebugBreak?: DebugBreakCallback,
): Promise<{ output: string[]; errors: string[]; debugBreaks: number[] }> {
  const output: string[] = [];
  const errors: string[] = [];
  const debugBreaks: number[] = [];
  const tokens = new Lexer(code).tokenize();
  const ast = new Parser(tokens).parse();
  analyzeAST(ast);
  const cancel = new CancelSignal();
  const evaluator = new Evaluator(
    (text) => output.push(text),
    () => Promise.resolve(""),
    cancel,
    undefined,
    undefined,
    onDebugBreak ??
      (async (line) => {
        debugBreaks.push(line);
      }),
  );
  try {
    await evaluator.run(ast);
  } catch (e) {
    errors.push((e as Error).message);
  }
  return { output, errors, debugBreaks };
}

describe("Comando debug <expr>", () => {
  test("dispara onDebugBreak quando condição é verdadeira", async () => {
    const breaks: number[] = [];
    const { errors } = await runCode(
      `
algoritmo "teste"
var x: inteiro
inicio
  x <- 5
  debug x > 3
  escreval(x)
fimalgoritmo
`,
      async (line) => {
        breaks.push(line);
      },
    );
    expect(errors).toHaveLength(0);
    expect(breaks).toHaveLength(1);
  });

  test("não dispara onDebugBreak quando condição é falsa", async () => {
    const breaks: number[] = [];
    const { errors } = await runCode(
      `
algoritmo "teste"
var x: inteiro
inicio
  x <- 1
  debug x > 10
  escreval(x)
fimalgoritmo
`,
      async (line) => {
        breaks.push(line);
      },
    );
    expect(errors).toHaveLength(0);
    expect(breaks).toHaveLength(0);
  });

  test("dispara múltiplas vezes se condição for verdadeira em cada passagem", async () => {
    const breaks: number[] = [];
    const { errors } = await runCode(
      `
algoritmo "teste"
var i: inteiro
inicio
  para i de 1 ate 3 faca
    debug i >= 1
  fimpara
fimalgoritmo
`,
      async (line) => {
        breaks.push(line);
      },
    );
    expect(errors).toHaveLength(0);
    expect(breaks).toHaveLength(3);
  });

  test("não dispara quando onDebugBreak não é fornecido", async () => {
    const { errors, output } = await runCode(
      `
algoritmo "teste"
var x: inteiro
inicio
  x <- 42
  debug x = 42
  escreval(x)
fimalgoritmo
`,
      undefined,
    );
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toBe("42");
  });
});
