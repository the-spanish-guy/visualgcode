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

describe("escolha/caso", () => {
  test("caso simples — valor correspondente", async () => {
    const code = `
algoritmo "teste"
var x: inteiro
inicio
x <- 2
escolha (x)
  caso 1
    escreval("um")
  caso 2
    escreval("dois")
  caso 3
    escreval("tres")
fimescolha
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/dois/);
    expect(output.join("")).not.toMatch(/um/);
    expect(output.join("")).not.toMatch(/tres/);
  });

  test("outrocaso — nenhum caso correspondente", async () => {
    const code = `
algoritmo "teste"
var x: inteiro
inicio
x <- 99
escolha (x)
  caso 1
    escreval("um")
  caso 2
    escreval("dois")
  outrocaso
    escreval("outro")
fimescolha
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/outro/);
    expect(output.join("")).not.toMatch(/um|dois/);
  });

  test("sem outrocaso — nenhum caso correspondente executa nada", async () => {
    const code = `
algoritmo "teste"
var x: inteiro
inicio
x <- 99
escolha (x)
  caso 1
    escreval("um")
fimescolha
escreval("fim")
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/fim/);
    expect(output.join("")).not.toMatch(/um/);
  });

  test("caso com múltiplos valores: caso 1, 2, 3", async () => {
    const code = `
algoritmo "teste"
var x: inteiro
inicio
x <- 3
escolha (x)
  caso 1, 2, 3
    escreval("pequeno")
  caso 4, 5, 6
    escreval("medio")
fimescolha
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/pequeno/);
    expect(output.join("")).not.toMatch(/medio/);
  });

  test("escolha com expressão de caractere", async () => {
    const code = `
algoritmo "teste"
var op: caractere
inicio
op <- "s"
escolha (op)
  caso "s"
    escreval("sim")
  caso "n"
    escreval("nao")
  outrocaso
    escreval("invalido")
fimescolha
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/sim/);
  });

  test("escolha dentro de laço para", async () => {
    const code = `
algoritmo "teste"
var i: inteiro
inicio
para i de 1 ate 3 faca
  escolha (i)
    caso 1
      escreval("um")
    caso 2
      escreval("dois")
    caso 3
      escreval("tres")
  fimescolha
fimpara
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/um/);
    expect(output.join(" ")).toMatch(/dois/);
    expect(output.join(" ")).toMatch(/tres/);
  });

  test("escolha com expressão (não só variável)", async () => {
    const code = `
algoritmo "teste"
var x: inteiro
inicio
x <- 4
escolha (x mod 2)
  caso 0
    escreval("par")
  caso 1
    escreval("impar")
fimescolha
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/par/);
  });

  test("primeiro caso correspondente executa — não executa os outros", async () => {
    const code = `
algoritmo "teste"
var x: inteiro
inicio
x <- 1
escolha (x)
  caso 1
    escreval("primeiro")
  caso 1
    escreval("segundo")
fimescolha
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/primeiro/);
    expect(output.join("")).not.toMatch(/segundo/);
  });
});
