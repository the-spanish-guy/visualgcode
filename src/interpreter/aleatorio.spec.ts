import { describe, expect, test } from "vitest";
import { analyzeAST } from "./StaticAnalyzer";
import { CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

async function runCode(code: string): Promise<{ output: string[]; errors: string[] }> {
  const output: string[] = [];
  const errors: string[] = [];
  const tokens = new Lexer(code).tokenize();
  const ast = new Parser(tokens).parse();
  analyzeAST(ast);
  const cancel = new CancelSignal();
  const evaluator = new Evaluator(
    (text) => output.push(text),
    () => Promise.reject(new Error("onInput não deveria ser chamado com aleatorio ativo")),
    cancel,
  );
  try {
    await evaluator.run(ast);
  } catch (e) {
    errors.push((e as Error).message);
  }
  return { output, errors };
}

describe("Comando aleatorio", () => {
  test("aleatorio on gera inteiro na faixa padrão 0–100 sem chamar onInput", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro
inicio
  aleatorio on
  leia(n)
  escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output).toHaveLength(2); // valor gerado + escreval
    const generated = parseInt(output[0].trim(), 10);
    expect(generated).toBeGreaterThanOrEqual(0);
    expect(generated).toBeLessThanOrEqual(100);
  });

  test("aleatorio N limita faixa de 0 a N", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro
inicio
  aleatorio 10
  leia(n)
  escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const generated = parseInt(output[0].trim(), 10);
    expect(generated).toBeGreaterThanOrEqual(0);
    expect(generated).toBeLessThanOrEqual(10);
  });

  test("aleatorio N, M define faixa N–M", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro
inicio
  aleatorio 50, 60
  leia(n)
  escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const generated = parseInt(output[0].trim(), 10);
    expect(generated).toBeGreaterThanOrEqual(50);
    expect(generated).toBeLessThanOrEqual(60);
  });

  test("aleatorio troca min e max quando M < N", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro
inicio
  aleatorio 60, 50
  leia(n)
  escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const generated = parseInt(output[0].trim(), 10);
    expect(generated).toBeGreaterThanOrEqual(50);
    expect(generated).toBeLessThanOrEqual(60);
  });

  test("aleatorio off desativa e volta a chamar onInput", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const tokens = new Lexer(`
algoritmo "teste"
var n: inteiro
inicio
  aleatorio on
  aleatorio off
  leia(n)
  escreval(n)
fimalgoritmo
`).tokenize();
    const ast = new Parser(tokens).parse();
    const cancel = new CancelSignal();
    let inputCalled = false;
    const evaluator = new Evaluator(
      (text) => output.push(text),
      () => { inputCalled = true; return Promise.resolve("42"); },
      cancel,
    );
    try {
      await evaluator.run(ast);
    } catch (e) {
      errors.push((e as Error).message);
    }
    expect(errors).toHaveLength(0);
    expect(inputCalled).toBe(true);
    expect(output.join("").trim()).toMatch(/42/);
  });

  test("aleatorio gera string de 5 letras maiúsculas para caractere", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var s: caractere
inicio
  aleatorio on
  leia(s)
  escreval(s)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const generated = output[0].trim();
    expect(generated).toMatch(/^[A-Z]{5}$/);
  });

  test("aleatorio não afeta leia de variável logica", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const tokens = new Lexer(`
algoritmo "teste"
var b: logico
inicio
  aleatorio on
  leia(b)
  escreval(b)
fimalgoritmo
`).tokenize();
    const ast = new Parser(tokens).parse();
    const cancel = new CancelSignal();
    let inputCalled = false;
    const evaluator = new Evaluator(
      (text) => output.push(text),
      () => { inputCalled = true; return Promise.resolve("verdadeiro"); },
      cancel,
    );
    try {
      await evaluator.run(ast);
    } catch (e) {
      errors.push((e as Error).message);
    }
    expect(errors).toHaveLength(0);
    expect(inputCalled).toBe(true);
  });
});
