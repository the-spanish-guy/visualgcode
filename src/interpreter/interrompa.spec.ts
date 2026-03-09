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

describe("interrompa", () => {
  test("interrompa em para", async () => {
    const code = `
algoritmo "teste"
var i: inteiro
inicio
para i de 1 ate 10 faca
  se i = 4 entao
    interrompa
  fimse
  escreval(i)
fimpara
escreval("fim")
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    // Deve imprimir 1, 2, 3 e parar
    expect(output.join(" ")).toMatch(/1/);
    expect(output.join(" ")).toMatch(/2/);
    expect(output.join(" ")).toMatch(/3/);
    expect(output.join(" ")).not.toMatch(/4/);
    expect(output.join(" ")).toMatch(/fim/);
  });

  test("interrompa em enquanto", async () => {
    const code = `
algoritmo "teste"
var i: inteiro
inicio
i <- 0
enquanto i < 10 faca
  i <- i + 1
  se i = 5 entao
    interrompa
  fimse
fimenquanto
escreval(i)
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/5/);
  });

  test("interrompa em repita", async () => {
    const code = `
algoritmo "teste"
var i: inteiro
inicio
i <- 0
repita
  i <- i + 1
  se i = 3 entao
    interrompa
  fimse
ate i = 10
escreval(i)
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/3/);
  });

  test("interrompa em loop interno não afeta loop externo", async () => {
    const code = `
algoritmo "teste"
var i, j: inteiro
inicio
para i de 1 ate 3 faca
  para j de 1 ate 5 faca
    se j = 3 entao
      interrompa
    fimse
  fimpara
  escreval(i)
fimpara
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    // Loop externo deve completar as 3 iterações
    expect(output.filter((o) => o.includes("1")).length).toBeGreaterThan(0);
    expect(output.filter((o) => o.includes("2")).length).toBeGreaterThan(0);
    expect(output.filter((o) => o.includes("3")).length).toBeGreaterThan(0);
  });

  test("interrompa em escolha não propaga para loop externo", async () => {
    const code = `
algoritmo "teste"
var i: inteiro
inicio
para i de 1 ate 3 faca
  escolha (i)
    caso 2
      interrompa
    outrocaso
      escreval(i)
  fimescolha
fimpara
escreval("fim")
fimalgoritmo
`;
    const { output, errors } = await runCode(code);
    expect(errors).toHaveLength(0);
    // i=1 e i=3 devem ser impressos; i=2 cai no interrompa do escolha
    // mas o loop externo continua
    expect(output.join(" ")).toMatch(/1/);
    expect(output.join(" ")).toMatch(/3/);
    expect(output.join(" ")).toMatch(/fim/);
  });
});
