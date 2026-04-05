import { describe, expect, test } from "vitest";
import { CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

function makeRunner(inputs: string[] = []) {
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

describe("Escreva vs Escreval", () => {
  test("escreval adiciona quebra de linha ao final", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
inicio
  escreval("linha1")
  escreval("linha2")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0]).toBe("linha1\n");
    expect(output[1]).toBe("linha2\n");
  });

  test("escreva não adiciona quebra de linha", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
inicio
  escreva("sem newline")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0]).toBe("sem newline");
    expect(output[0]).not.toMatch(/\n/);
  });

  test("escreva com múltiplos argumentos os concatena sem separador", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
inicio
  escreva("a", "b", "c")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0]).toBe("abc");
  });

  test("escreval com múltiplos argumentos concatena e adiciona newline ao final", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
inicio
  escreval("x", " ", "y")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0]).toBe("x y\n");
  });

  test("concatenação de strings com o operador +", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
var s: caractere
inicio
  s <- "abc" + "def"
  escreval(s)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toBe("abcdef");
  });
});

describe("Formatação de saída (:width e :width:decimals)", () => {
  test("escreva(x:5) alinha inteiro à direita em 5 espaços", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
var x: inteiro
inicio
  x <- 9
  escreva(x:5)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0]).toBe("    9");
  });

  test("escreva(y:6:2) formata real com 2 casas decimais em 6 espaços", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
var y: real
inicio
  y <- 2.5
  escreva(y:6:2)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0]).toBe("  2.50");
  });

  test("escreva(x:2) não trunca valor maior que a largura", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
var x: inteiro
inicio
  x <- 12345
  escreva(x:2)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0]).toBe("12345");
  });

  test("escreval com formatação mista de argumentos", async () => {
    const run = makeRunner();
    const { output, errors } = await run(`
algoritmo "teste"
var x: real
    y: inteiro
inicio
  x <- 2.5
  y <- 9
  escreval("x", x:4:1, y+3:4)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0]).toBe("x 2.5  12\n");
  });
});

describe("Leia", () => {
  test("leia lê valor para variável simples", async () => {
    const run = makeRunner(["42"]);
    const { output, errors } = await run(`
algoritmo "teste"
var n: inteiro
inicio
  leia(n)
  escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toMatch(/42/);
  });

  test("leia para elemento de vetor", async () => {
    const run = makeRunner(["7"]);
    const { output, errors } = await run(`
algoritmo "teste"
var v: vetor[1..3] de inteiro
inicio
  leia(v[1])
  escreval(v[1])
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toMatch(/7/);
  });
});
