import { describe, expect, test } from "vitest";
import { CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

async function runCode(
  code: string,
  inputs: string[] = [],
): Promise<{ output: string[]; errors: string[] }> {
  const output: string[] = [];
  const errors: string[] = [];
  const cancel = new CancelSignal();
  const inputQueue = [...inputs];
  const tokens = new Lexer(code).tokenize();
  const ast = new Parser(tokens).parse();
  const evaluator = new Evaluator(
    (text) => output.push(text),
    () => Promise.resolve(inputQueue.shift() ?? "0"),
    cancel,
  );
  try {
    await evaluator.run(ast);
  } catch (e) {
    errors.push((e as Error).message);
  }
  return { output, errors };
}

describe("Constantes", () => {
  test("constante inteira lida corretamente", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
constante
  MAX = 100
inicio
  escreval(MAX)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/100/);
  });

  test("constante real lida corretamente", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
constante
  PI = 3.14159
inicio
  escreval(PI)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/3\.14159/);
  });

  test("constante string lida corretamente", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
constante
  MSG = "ola mundo"
inicio
  escreval(MSG)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/ola mundo/);
  });

  test("constante booleana lida corretamente", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
constante
  ATIVO = verdadeiro
inicio
  escreval(ATIVO)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toUpperCase()).toMatch(/VERDADEIRO/);
  });

  test("constante com valor negativo", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
constante
  NEG = -5
inicio
  escreval(NEG)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/-5/);
  });

  test("constante usada em expressão aritmética", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
constante
  BASE = 10
inicio
  escreval(BASE * 2 + 1)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/21/);
  });

  test("atribuição a constante lança RuntimeError", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
constante
  MAX = 100
inicio
  MAX <- 200
fimalgoritmo
`);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/constante/i);
  });

  test("bloco constante e var interleaved", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var
  n: inteiro
constante
  LIMITE = 5
inicio
  n <- LIMITE * 2
  escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/10/);
  });

  test("múltiplas constantes no mesmo bloco", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
constante
  A = 1
  B = 2
  C = 3
inicio
  escreval(A + B + C)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/6/);
  });
});
