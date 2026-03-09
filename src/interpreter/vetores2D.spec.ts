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

describe("Vetores 2D (Matrizes)", () => {
  test("declaração: var m: vetor[1..3, 1..4] de inteiro", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..3, 1..4] de inteiro
inicio
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors).toHaveLength(0);
  });

  test("atribuição e leitura: m[1, 1] <- 42", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..3, 1..3] de inteiro
inicio
m[1, 1] <- 42
escreva(m[1, 1])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output).toContain("42");
  });

  test("atribuição e leitura em diferentes células", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..2, 1..2] de inteiro
inicio
m[1, 1] <- 10
m[1, 2] <- 20
m[2, 1] <- 30
m[2, 2] <- 40
escreva(m[1, 1])
escreva(m[1, 2])
escreva(m[2, 1])
escreva(m[2, 2])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/10/);
    expect(output.join(" ")).toMatch(/20/);
    expect(output.join(" ")).toMatch(/30/);
    expect(output.join(" ")).toMatch(/40/);
  });

  test("índice variável em ambas as dimensões", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..3, 1..3] de inteiro
    i, j: inteiro
inicio
i <- 2
j <- 3
m[i, j] <- 99
escreva(m[2, 3])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output).toContain("99");
  });

  test("laço aninhado preenchendo matriz", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..3, 1..3] de inteiro
    i, j: inteiro
inicio
para i de 1 ate 3 faca
  para j de 1 ate 3 faca
    m[i, j] <- i * 10 + j
  fimpara
fimpara
escreva(m[1, 1])
escreva(m[2, 3])
escreva(m[3, 3])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/11/);
    expect(output.join(" ")).toMatch(/23/);
    expect(output.join(" ")).toMatch(/33/);
  });

  test("base diferente de 1 em ambas as dimensões", async () => {
    const code = `
algoritmo "teste"
var m: vetor[2..4, 3..5] de inteiro
inicio
m[2, 3] <- 100
m[4, 5] <- 200
escreva(m[2, 3])
escreva(m[4, 5])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/100/);
    expect(output.join(" ")).toMatch(/200/);
  });

  test("bounds: linha fora do limite inferior", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..3, 1..3] de inteiro
inicio
m[0, 1] <- 10
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/linha|limite|0/i);
  });

  test("bounds: linha fora do limite superior", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..3, 1..3] de inteiro
inicio
m[4, 1] <- 10
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/linha|limite|4/i);
  });

  test("bounds: coluna fora do limite inferior", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..3, 1..3] de inteiro
inicio
m[1, 0] <- 10
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/coluna|limite|0/i);
  });

  test("bounds: coluna fora do limite superior", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..3, 1..3] de inteiro
inicio
m[1, 4] <- 10
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/coluna|limite|4/i);
  });

  test("bounds: base diferente de 1 — índice abaixo do start", async () => {
    const code = `
algoritmo "teste"
var m: vetor[2..4, 3..5] de inteiro
inicio
m[1, 3] <- 10
fimalgoritmo
`;
    const { errors } = await runCode(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/linha|limite|1/i);
  });

  test("matriz de real", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..2, 1..2] de real
inicio
m[1, 1] <- 3.14
escreva(m[1, 1])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output).toContain("3.14");
  });

  test("matriz de caractere", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..2, 1..2] de caractere
inicio
m[1, 1] <- "oi"
escreva(m[1, 1])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output).toContain("oi");
  });

  test("matriz de logico", async () => {
    const code = `
algoritmo "teste"
var m: vetor[1..2, 1..2] de logico
inicio
m[1, 2] <- verdadeiro
escreva(m[1, 2])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/i);
  });

  test("vetor 1D não confunde com matriz 2D", async () => {
    const code = `
algoritmo "teste"
var v: vetor[1..5] de inteiro
    m: vetor[1..3, 1..3] de inteiro
inicio
v[3] <- 55
m[2, 2] <- 77
escreva(v[3])
escreva(m[2, 2])
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/55/);
    expect(output.join(" ")).toMatch(/77/);
  });
});
