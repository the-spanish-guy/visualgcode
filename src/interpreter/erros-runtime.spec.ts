import { describe, expect, test } from "vitest";
import { CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

async function runCode(code: string): Promise<{ output: string[]; errors: string[] }> {
  const output: string[] = [];
  const errors: string[] = [];
  const cancel = new CancelSignal();
  const tokens = new Lexer(code).tokenize();
  const ast = new Parser(tokens).parse();
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
  return { output, errors };
}

describe("Erros de runtime", () => {
  test("variável não declarada lança erro", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
  escreval(xNaoExiste)
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/não declarad/i);
  });

  test("divisão por zero com / lança erro", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
  escreval(10 / 0)
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/zero/i);
  });

  test("divisão inteira por zero com div lança erro", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
  escreval(10 div 0)
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/zero/i);
  });

  test("módulo por zero com mod lança erro", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
  escreval(10 mod 0)
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/zero/i);
  });

  test("condição não-lógica em 'se' lança erro", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
  se 5 entao
    escreval("ok")
  fimse
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/lógica|logica/i);
  });

  test("chamada a procedimento não declarado lança erro", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
  naoExiste()
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/não encontrado|nao encontrado/i);
  });

  test("chamada a função não declarada lança erro", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
  escreval(funcaoInexistente(1))
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/não encontrada|nao encontrada/i);
  });
});
