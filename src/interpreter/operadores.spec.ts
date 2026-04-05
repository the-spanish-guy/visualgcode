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

describe("#31 — Operador ^ (potência)", () => {
  test("2 ^ 10 = 1024", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(2 ^ 10)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/1024/);
  });

  test("3 ^ 3 = 27", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(3 ^ 3)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/27/);
  });

  test("associatividade direita: 2 ^ 3 ^ 2 = 512", async () => {
    // 2 ^ (3 ^ 2) = 2 ^ 9 = 512, não (2^3)^2 = 64
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(2 ^ 3 ^ 2)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/512/);
  });

  test("precedência: 2 ^ 3 * 2 = 16 (^ antes de *)", async () => {
    // (2^3) * 2 = 8 * 2 = 16
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(2 ^ 3 * 2)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/16/);
  });

  test("x ^ 0 = 1", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(99 ^ 0)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/1/);
  });
});

describe("#32 — Operador xou (XOR lógico)", () => {
  test("verdadeiro xou falso = verdadeiro", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(verdadeiro xou falso)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/);
  });

  test("falso xou verdadeiro = verdadeiro", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(falso xou verdadeiro)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/);
  });

  test("verdadeiro xou verdadeiro = falso", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(verdadeiro xou verdadeiro)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/falso/);
  });

  test("falso xou falso = falso", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(falso xou falso)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/falso/);
  });
});

describe("#33 — Operador \\\\ (divisão inteira)", () => {
  test("7 \\\\ 2 = 3", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(7 \\\\ 2)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/^3\n?$/);
  });

  test("10 \\\\ 3 = 3", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(10 \\\\ 3)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/^3\n?$/);
  });

  test("resultado igual ao div", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var a, b, c: inteiro
inicio
a <- 17
b <- 5
c <- a \\\\ b
escreval(c)
escreval(a div b)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const nums = output.map((o) => o.trim());
    expect(nums[0]).toBe(nums[1]);
  });

  test("\\\\ 0 lança erro de runtime", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
escreval(5 \\\\ 0)
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/zero/i);
  });
});

describe("#34 — Operador % (alias de mod)", () => {
  test("7 % 3 = 1", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(7 % 3)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/^1\n?$/);
  });

  test("10 % 5 = 0", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval(10 % 5)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/^0\n?$/);
  });

  test("resultado igual ao mod", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var a, b, c: inteiro
inicio
a <- 17
b <- 5
c <- a % b
escreval(c)
escreval(a mod b)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const nums = output.map((o) => o.trim());
    expect(nums[0]).toBe(nums[1]);
  });

  test("% 0 lança erro de runtime", async () => {
    const { errors } = await runCode(`
algoritmo "teste"
inicio
escreval(5 % 0)
fimalgoritmo
`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/zero/i);
  });
});

describe("Comparação de strings (case-insensitive)", () => {
  test('"ABC" = "abc" resulta em VERDADEIRO', async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval("ABC" = "abc")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/);
  });

  test('"ABC" <> "abc" resulta em FALSO', async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval("ABC" <> "abc")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/falso/);
  });

  test('"ana" < "bia" resulta em VERDADEIRO', async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval("ana" < "bia")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/);
  });

  test('"Bia" > "ana" resulta em VERDADEIRO (case-insensitive)', async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval("Bia" > "ana")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/);
  });

  test('"abc" <= "abc" resulta em VERDADEIRO', async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval("abc" <= "abc")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/);
  });

  test('"zzz" >= "aaa" resulta em VERDADEIRO', async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
inicio
escreval("zzz" >= "aaa")
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/verdadeiro/);
  });

  test("comparação em se..entao usa case-insensitive", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var s: caractere
inicio
s <- "Brasil"
se s = "brasil" entao
  escreval("igual")
fimse
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    expect(output.join("")).toMatch(/igual/);
  });
});
