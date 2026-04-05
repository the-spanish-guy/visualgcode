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

describe("Para — loop básico", () => {
  test("para com step positivo padrão conta de 1 a 5", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var i: inteiro
inicio
  para i de 1 ate 5 faca
    escreval(i)
  fimpara
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const nums = output.map((l) => l.trim());
    expect(nums).toEqual(["1", "2", "3", "4", "5"]);
  });

  test("para com passo negativo conta regressivamente de 5 a 1", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var i: inteiro
inicio
  para i de 5 ate 1 passo -1 faca
    escreval(i)
  fimpara
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const nums = output.map((l) => l.trim());
    expect(nums).toEqual(["5", "4", "3", "2", "1"]);
  });

  test("para de 5 ate 1 sem passo negativo resulta em zero iterações", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var i: inteiro
inicio
  para i de 5 ate 1 faca
    escreval(i)
  fimpara
  escreval("fim")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    // Nenhum número deve aparecer antes de "fim"
    expect(output.length).toBe(1);
    expect(output[0].trim()).toBe("fim");
  });

  test("para com passo 2 percorre apenas valores pares", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var i: inteiro
inicio
  para i de 0 ate 8 passo 2 faca
    escreval(i)
  fimpara
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const nums = output.map((l) => parseInt(l.trim(), 10));
    expect(nums).toEqual([0, 2, 4, 6, 8]);
  });
});

describe("Enquanto", () => {
  test("enquanto com condição falsa na entrada não executa nenhuma iteração", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  enquanto falso faca
    escreval("nao executa")
  fimenquanto
  escreval("ok")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).not.toMatch(/nao executa/);
    expect(output.join("")).toMatch(/ok/);
  });

  test("enquanto conta de 1 a 3", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro
inicio
  n <- 1
  enquanto n <= 3 faca
    escreval(n)
    n <- n + 1
  fimenquanto
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const nums = output.map((l) => l.trim());
    expect(nums).toEqual(["1", "2", "3"]);
  });
});

describe("Repita...Fimrepita", () => {
  test("repita...fimrepita executa e sai por interrompa", async () => {
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

  test("repita...fimrepita executa o body pelo menos uma vez", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  repita
    escreval("executou")
    interrompa
  fimrepita
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.length).toBe(1);
    expect(output[0].trim()).toBe("executou");
  });
});

describe("Repita...Ate", () => {
  test("repita...ate executa pelo menos uma vez mesmo com condição verdadeira imediata", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
  repita
    escreval("executou")
  ate verdadeiro
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.length).toBe(1);
    expect(output[0].trim()).toBe("executou");
  });

  test("repita...ate executa N vezes até condição ser satisfeita", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro
inicio
  n <- 0
  repita
    n <- n + 1
    escreval(n)
  ate n >= 3
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const nums = output.map((l) => l.trim());
    expect(nums).toEqual(["1", "2", "3"]);
  });
});
