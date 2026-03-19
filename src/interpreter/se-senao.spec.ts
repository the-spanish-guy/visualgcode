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

describe("SE-ENTÃO-SENÃO", () => {
  test("se simples com condição verdadeira executa bloco", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  se verdadeiro entao
    escreval("executou")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/executou/);
  });

  test("se simples com condição falsa não executa bloco", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  se falso entao
    escreval("nao deveria")
  fimse
  escreval("ok")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).not.toMatch(/nao deveria/);
    expect(output.join("")).toMatch(/ok/);
  });

  test("se...senao executa branch correto quando condição verdadeira", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  se 5 > 3 entao
    escreval("maior")
  senao
    escreval("menor")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/maior/);
    expect(output.join("")).not.toMatch(/menor/);
  });

  test("se...senao executa branch senao quando condição falsa", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  se 1 > 3 entao
    escreval("maior")
  senao
    escreval("menor")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/menor/);
    expect(output.join("")).not.toMatch(/maior/);
  });

  test("se aninhado — caminho interno correto", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro
inicio
  n <- 7
  se n > 0 entao
    se n > 5 entao
      escreval("grande")
    senao
      escreval("pequeno")
    fimse
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/grande/);
  });

  test("condição com operador < e >", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var a, b: inteiro
inicio
  a <- 3
  b <- 7
  se a < b entao
    escreval("sim")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/sim/);
  });

  test("condição com operador <> (diferente)", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  se 3 <> 4 entao
    escreval("diferentes")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/diferentes/);
  });

  test("condição com operador = (igual)", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  se 5 = 5 entao
    escreval("iguais")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/iguais/);
  });

  test("condição com operador lógico 'e'", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var x: inteiro
inicio
  x <- 5
  se x > 0 e x < 10 entao
    escreval("entre")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/entre/);
  });

  test("condição com operador lógico 'ou'", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var x: inteiro
inicio
  x <- 15
  se x < 0 ou x > 10 entao
    escreval("fora")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/fora/);
  });

  test("condição com operador lógico 'nao'", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  se nao falso entao
    escreval("correto")
  fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/correto/);
  });
});
