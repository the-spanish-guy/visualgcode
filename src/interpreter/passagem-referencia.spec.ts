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

describe("Passagem por referência (var)", () => {
  test("parâmetro var modifica a variável do chamador", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro

procedimento dobrar(var x: inteiro)
inicio
  x <- x * 2
fimprocedimento

inicio
n <- 5
dobrar(n)
escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/10/);
  });

  test("parâmetro por valor NÃO modifica a variável do chamador", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro

procedimento dobrar(x: inteiro)
inicio
  x <- x * 2
fimprocedimento

inicio
n <- 5
dobrar(n)
escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/^5\n?$/);
  });

  test("swap: troca dois valores via referência", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var a, b: inteiro

procedimento trocar(var x: inteiro, var y: inteiro)
var temp: inteiro
inicio
  temp <- x
  x <- y
  y <- temp
fimprocedimento

inicio
a <- 10
b <- 20
trocar(a, b)
escreval(a)
escreval(b)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0].trim()).toBe("20");
    expect(output[1].trim()).toBe("10");
  });

  test("mistura de parâmetros: ref e valor na mesma chamada", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var resultado: inteiro

procedimento calcular(var r: inteiro, n: inteiro)
inicio
  r <- n * n
fimprocedimento

inicio
resultado <- 0
calcular(resultado, 7)
escreval(resultado)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/49/);
  });

  test("modificações são imediatas (não copy-out)", async () => {
    // Se fosse copy-out, o segundo leia do x não refletiria a mudança
    const { output, errors } = await runCode(`
algoritmo "teste"
var x, y: inteiro

procedimento incrementar(var a: inteiro, var b: inteiro)
inicio
  a <- a + 1
  b <- a + 1
fimprocedimento

inicio
x <- 0
y <- 0
incrementar(x, y)
escreval(x)
escreval(y)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0].trim()).toBe("1");
    expect(output[1].trim()).toBe("2");
  });

  test("parâmetro var em função (não só procedimento)", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro

funcao triplicar(var x: inteiro): inteiro
inicio
  x <- x * 3
  retorne x
fimfuncao

inicio
n <- 4
escreval(triplicar(n))
escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output[0].trim()).toBe("12");
    expect(output[1].trim()).toBe("12"); // n também foi modificado
  });

  test("argumento não-variável para parâmetro ref lança erro", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
procedimento dobrar(var x: inteiro)
inicio
  x <- x * 2
fimprocedimento

inicio
dobrar(5)
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/referência|variável/i);
  });

  test("chamadas recursivas com ref funcionam corretamente", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var total: inteiro

procedimento acumular(var soma: inteiro, n: inteiro)
inicio
  se n > 0 entao
    soma <- soma + n
    acumular(soma, n - 1)
  fimse
fimprocedimento

inicio
total <- 0
acumular(total, 5)
escreval(total)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    // 5+4+3+2+1 = 15
    expect(output.join("")).toMatch(/15/);
  });
});
