import { describe, expect, test } from "vitest";
import { CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

function makeRunner(inputs: string[]) {
  return async (code: string) => {
    const output: string[] = [];
    const errors: string[] = [];
    const cancel = new CancelSignal();
    let inputIdx = 0;

    const tokens = new Lexer(code).tokenize();
    const ast = new Parser(tokens).parse();
    const evaluator = new Evaluator(
      (text) => output.push(text),
      () => Promise.resolve(inputs[inputIdx++] ?? "0"),
      cancel,
    );

    try {
      await evaluator.run(ast);
    } catch (e) {
      errors.push((e as Error).message);
    }

    return { output, errors };
  };
}

describe("leia múltiplo", () => {
  test("leia(a, b) — dois inteiros", async () => {
    const run = makeRunner(["10", "20"]);
    const { output, errors } = await run(`
algoritmo "teste"
var a, b: inteiro
inicio
leia(a, b)
escreval(a + b)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/30/);
  });

  test("leia(a, b, c) — três variáveis", async () => {
    const run = makeRunner(["1", "2", "3"]);
    const { output, errors } = await run(`
algoritmo "teste"
var a, b, c: inteiro
inicio
leia(a, b, c)
escreval(a)
escreval(b)
escreval(c)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/1/);
    expect(output.join(" ")).toMatch(/2/);
    expect(output.join(" ")).toMatch(/3/);
  });

  test("leia(a) simples continua funcionando", async () => {
    const run = makeRunner(["42"]);
    const { output, errors } = await run(`
algoritmo "teste"
var a: inteiro
inicio
leia(a)
escreval(a)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/42/);
  });

  test("leia(a, b) — tipos mistos inteiro e real", async () => {
    const run = makeRunner(["7", "3.14"]);
    const { output, errors } = await run(`
algoritmo "teste"
var a: inteiro
    b: real
inicio
leia(a, b)
escreval(a)
escreval(b)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/7/);
    expect(output.join(" ")).toMatch(/3.14/);
  });

  test("leia(a, b) — caractere e logico", async () => {
    const run = makeRunner(["ola", "verdadeiro"]);
    const { output, errors } = await run(`
algoritmo "teste"
var a: caractere
    b: logico
inicio
leia(a, b)
escreval(a)
escreval(b)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/ola/i);
    expect(output.join(" ")).toMatch(/verdadeiro/i);
  });

  test("leia múltiplo dentro de laço", async () => {
    const run = makeRunner(["1", "2", "3", "4", "5", "6"]);
    const { output, errors } = await run(`
algoritmo "teste"
var i, a, b: inteiro
inicio
para i de 1 ate 3 faca
  leia(a, b)
  escreval(a + b)
fimpara
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/3/); // 1+2
    expect(output.join(" ")).toMatch(/7/); // 3+4
    expect(output.join(" ")).toMatch(/11/); // 5+6
  });

  test("leia com vetor dentro do mesmo leia não confunde índices", async () => {
    const run = makeRunner(["99"]);
    const { output, errors } = await run(`
algoritmo "teste"
var v: vetor[1..3] de inteiro
inicio
leia(v[2])
escreval(v[2])
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/99/);
  });
});
