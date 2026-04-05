import { describe, expect, test } from "vitest";
import { analyzeAST } from "./StaticAnalyzer";
import { CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

async function runCode(code: string): Promise<{ output: string[]; errors: string[]; warnings: string[] }> {
  const output: string[] = [];
  const errors: string[] = [];
  const tokens = new Lexer(code).tokenize();
  const ast = new Parser(tokens).parse();
  const staticWarnings = analyzeAST(ast);
  const warnings = staticWarnings.map((w) => w.message);
  const cancel = new CancelSignal();
  const evaluator = new Evaluator(
    (text) => output.push(text),
    () => Promise.resolve("0"),
    cancel,
  );
  try {
    await evaluator.run(ast);
  } catch (e) {
    errors.push((e as Error).message);
  }
  return { output, errors, warnings };
}

describe("StaticAnalyzer — variáveis não utilizadas", () => {
  test("variável declarada e nunca usada gera warning", async () => {
    const { warnings } = await runCode(`
algoritmo "teste"
var x: inteiro
inicio
fimalgoritmo
`);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/x/);
  });

  test("variável usada em escreva não gera warning", async () => {
    const { warnings } = await runCode(`
algoritmo "teste"
var x: inteiro
inicio
  x <- 1
  escreva(x)
fimalgoritmo
`);
    expect(warnings).toHaveLength(0);
  });

  test("variável usada em escreva com formatação não gera warning", async () => {
    const { warnings } = await runCode(`
algoritmo "teste"
var x: real
inicio
  x <- 2.5
  escreva(x:6:2)
fimalgoritmo
`);
    expect(warnings).toHaveLength(0);
  });

  test("variável usada em repita...ate não gera warning", async () => {
    const { warnings } = await runCode(`
algoritmo "teste"
var x: inteiro
inicio
  x <- 0
  repita
    x <- x + 1
  ate x >= 3
fimalgoritmo
`);
    expect(warnings).toHaveLength(0);
  });

  test("variável usada em repita...fimrepita não gera warning", async () => {
    const { warnings, errors } = await runCode(`
algoritmo "teste"
var x: inteiro
inicio
  x <- 0
  repita
    x <- x + 1
    se x = 3 entao
      interrompa
    fimse
  fimrepita
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  test("repita...fimrepita executa corretamente no pipeline completo", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var x: inteiro
inicio
  x <- 0
  repita
    x <- x + 1
    escreval(x)
    se x = 3 entao
      interrompa
    fimse
  fimrepita
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.map((l) => l.trim())).toEqual(["1", "2", "3"]);
  });
});
