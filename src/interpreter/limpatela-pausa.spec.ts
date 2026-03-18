import { describe, expect, test, vi } from "vitest";
import { CancelSignal, Evaluator } from "./Evaluator";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

function makeRunner(inputs: string[] = [], onClearScreen?: () => void) {
  return async (code: string) => {
    const output: string[] = [];
    const errors: string[] = [];
    const cancel = new CancelSignal();
    let inputIdx = 0;

    const tokens = new Lexer(code).tokenize();
    const ast = new Parser(tokens).parse();
    const evaluator = new Evaluator(
      (text) => output.push(text),
      () => Promise.resolve(inputs[inputIdx++] ?? ""),
      cancel,
      undefined,
      onClearScreen,
    );

    try {
      await evaluator.run(ast);
    } catch (e) {
      errors.push((e as Error).message);
    }

    return { output, errors };
  };
}

describe("#36 — limpatela", () => {
  test("limpatela chama onClearScreen", async () => {
    const onClearScreen = vi.fn();
    const run = makeRunner([], onClearScreen);

    const { errors } = await run(`
algoritmo "teste"
inicio
escreval("antes")
limpatela
escreval("depois")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(onClearScreen).toHaveBeenCalledTimes(1);
  });

  test("limpatela múltiplas vezes chama onClearScreen múltiplas vezes", async () => {
    const onClearScreen = vi.fn();
    const run = makeRunner([], onClearScreen);

    const { errors } = await run(`
algoritmo "teste"
inicio
limpatela
limpatela
limpatela
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(onClearScreen).toHaveBeenCalledTimes(3);
  });

  test("limpatela sem callback não lança erro", async () => {
    const run = makeRunner(); // sem onClearScreen

    const { errors } = await run(`
algoritmo "teste"
inicio
limpatela
escreval("ok")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
  });

  test("limpatela dentro de laço", async () => {
    const onClearScreen = vi.fn();
    const run = makeRunner([], onClearScreen);

    const { errors } = await run(`
algoritmo "teste"
var i: inteiro
inicio
para i de 1 ate 3 faca
  limpatela
fimpara
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(onClearScreen).toHaveBeenCalledTimes(3);
  });

  test("output após limpatela ainda é produzido normalmente", async () => {
    const onClearScreen = vi.fn();
    const run = makeRunner([], onClearScreen);

    const { output, errors } = await run(`
algoritmo "teste"
inicio
escreval("antes")
limpatela
escreval("depois")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/antes/);
    expect(output.join("")).toMatch(/depois/);
  });
});

describe("#37 — pausa", () => {
  test("pausa imprime mensagem e aguarda input", async () => {
    const run = makeRunner([""]);

    const { output, errors } = await run(`
algoritmo "teste"
inicio
escreval("antes")
pausa
escreval("depois")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/antes/);
    expect(output.join("")).toMatch(/Pressione ENTER/i);
    expect(output.join("")).toMatch(/depois/);
  });

  test("pausa consome exatamente um input", async () => {
    let inputCount = 0;
    const output: string[] = [];
    const cancel = new CancelSignal();

    const tokens = new Lexer(`
algoritmo "teste"
var x: inteiro
inicio
pausa
leia(x)
escreval(x)
fimalgoritmo
`).tokenize();
    const ast = new Parser(tokens).parse();
    const evaluator = new Evaluator(
      (text) => output.push(text),
      () => {
        inputCount++;
        return Promise.resolve(inputCount === 1 ? "" : "42");
      },
      cancel,
    );

    await evaluator.run(ast);

    expect(inputCount).toBe(2); // 1 para pausa, 1 para leia
    expect(output.join("")).toMatch(/42/);
  });

  test("pausa múltiplas vezes", async () => {
    const run = makeRunner(["", "", ""]);

    const { output, errors } = await run(`
algoritmo "teste"
inicio
pausa
pausa
pausa
escreval("fim")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/fim/);
  });

  test("pausa dentro de laço", async () => {
    const run = makeRunner(["", "", ""]);

    const { output, errors } = await run(`
algoritmo "teste"
var i: inteiro
inicio
para i de 1 ate 3 faca
  pausa
  escreval(i)
fimpara
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join(" ")).toMatch(/1/);
    expect(output.join(" ")).toMatch(/2/);
    expect(output.join(" ")).toMatch(/3/);
  });
});
