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

describe("Subprogramas — Procedimentos", () => {
  test("procedimento simples sem parâmetros", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"

procedimento saudar
inicio
  escreval("ola")
fimprocedimento

inicio
  saudar()
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/ola/);
  });

  test("procedimento com parâmetro por valor não altera variável do chamador", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var x: inteiro

procedimento duplicar(n: inteiro)
inicio
  n <- n * 2
fimprocedimento

inicio
  x <- 5
  duplicar(x)
  escreval(x)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toMatch(/^5/);
  });

  test("procedimento com parâmetro imprime valor modificado localmente", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"

procedimento imprimir(n: inteiro)
inicio
  escreval(n * 2)
fimprocedimento

inicio
  imprimir(7)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/14/);
  });

  test("variáveis locais do procedimento não vazam para o escopo externo", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var resultado: inteiro

procedimento calcular
var local: inteiro
inicio
  local <- 99
  resultado <- local
fimprocedimento

inicio
  resultado <- 0
  calcular()
  escreval(resultado)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/99/);
  });
});

describe("Subprogramas — Funções", () => {
  test("função que retorna inteiro", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"

funcao soma(a: inteiro, b: inteiro): inteiro
inicio
  retorne a + b
fimfuncao

inicio
  escreval(soma(3, 4))
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/7/);
  });

  test("função que retorna real", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"

funcao media(a: real, b: real): real
inicio
  retorne (a + b) / 2
fimfuncao

inicio
  escreval(media(3.0, 7.0))
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(parseFloat(output.join(""))).toBeCloseTo(5.0, 5);
  });

  test("função que retorna caractere", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"

funcao saudar(nome: caractere): caractere
inicio
  retorne "ola " + nome
fimfuncao

inicio
  escreval(saudar("mundo"))
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/ola mundo/);
  });

  test("função que retorna logico", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"

funcao ehPositivo(n: inteiro): logico
inicio
  retorne n > 0
fimfuncao

inicio
  escreval(ehPositivo(5))
  escreval(ehPositivo(-3))
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const joined = output.join("").toLowerCase();
    expect(joined).toMatch(/verdadeiro/);
    expect(joined).toMatch(/falso/);
  });

  test("função chamando outra função", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"

funcao quadrado(n: inteiro): inteiro
inicio
  retorne n * n
fimfuncao

funcao quartaPotencia(n: inteiro): inteiro
inicio
  retorne quadrado(quadrado(n))
fimfuncao

inicio
  escreval(quartaPotencia(3))
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/81/);
  });

  test("recursão simples — fatorial(5) = 120", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"

funcao fatorial(n: inteiro): inteiro
inicio
  se n <= 1 entao
    retorne 1
  fimse
  retorne n * fatorial(n - 1)
fimfuncao

inicio
  escreval(fatorial(5))
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/120/);
  });
});
