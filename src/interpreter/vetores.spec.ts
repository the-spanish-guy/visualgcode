import { describe, expect, test } from "vitest";
import { type CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

class CancelSignalMock implements CancelSignal {
  cancelled = false;
  cancel() {
    this.cancelled = true;
  }
}

async function runCode(code: string): Promise<{ output: string[]; errors: string[] }> {
  const output: string[] = [];
  const errors: string[] = [];
  const cancel = new CancelSignalMock();

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

describe("Vetores 1D", () => {
  test("declaração: var v: vetor[1..5] de inteiro", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..5] de inteiro
inicio
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors).toHaveLength(0);
  });

  test("declaração com base diferente de 1: var v: vetor[3..8] de inteiro", async () => {
    const code = `
algoritmo "teste"
var v: vetor[3..8] de inteiro
inicio
v[3] <- 10
v[8] <- 20
escreva(v[3])
escreva(v[8])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/10/);
    expect(output.join("")).toMatch(/20/);
  });

  test("índice fora dos limites com base diferente de 1", async () => {
    const code = `
algoritmo "teste"
var v: vetor[3..8] de inteiro
inicio
v[2] <- 10
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/índice|limite|2/i);
  });

  test("atribuição e leitura de elemento: v[1] <- 10", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..5] de inteiro
inicio
v[1] <- 10
escreva(v[1])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output).toContain("10");
  });

  test("atribuição com variável como índice", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..5] de inteiro
    i: inteiro
inicio
i <- 2
v[i] <- 99
escreva(v[2])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output).toContain("99");
  });

  test("índice fora dos limites inferior", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..5] de inteiro
inicio
v[0] <- 10
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/índice|limite|0/i);
  });

  test("índice fora dos limites superior", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..5] de inteiro
inicio
v[6] <- 10
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/índice|limite|6/i);
  });

  test("vetor de real", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..3] de real
inicio
v[1] <- 3.14
escreva(v[1])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output).toContain("3.14");
  });

  test("vetor de caractere", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..2] de caractere
inicio
v[1] <- "ola"
escreva(v[1])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output).toContain("ola");
  });

  test("vetor de logico", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..2] de logico
inicio
v[1] <- verdadeiro
escreva(v[1])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/i);
  });

  test("múltiplos vetores", async () => {
    const code = `
algoritmo "teste"
var v1: vetor[1..3] de inteiro
    v2: vetor[1..2] de inteiro
inicio
v1[1] <- 10
v2[1] <- 20
escreva(v1[1])
escreva(v2[1])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/10/);
    expect(output.join("")).toMatch(/20/);
  });

  test("laço para iterando sobre índice", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..3] de inteiro
    i: inteiro
inicio
para i de 1 ate 3 faca
  v[i] <- i * 10
fimpara
escreva(v[1])
escreva(v[2])
escreva(v[3])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/10/);
    expect(output.join("")).toMatch(/20/);
    expect(output.join("")).toMatch(/30/);
  });
});
