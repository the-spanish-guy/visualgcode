import { describe, expect, it, test } from "vitest";
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

async function evalExpr(expr: string) {
  return runCode(`
algoritmo "teste"
inicio
  escreval(${expr})
fimalgoritmo
`);
}

describe("Funções nativas — Matemáticas", () => {
  // Funções de um argumento com resultado numérico — mesmo padrão de asserção
  it.each([
    ["abs(-5)", 5],
    ["abs(3)", 3],
    ["sqrt(9)", 3],
    ["quad(3)", 9],
    ["log(1)", 0],
    ["log(100)", 2],
    ["logn(1)", 0],
    ["sen(0)", 0],
    ["cos(0)", 1],
    ["tan(0)", 0],
  ])("escreval(%s) ≈ %s", async (expr, expected) => {
    const { output, errors } = await evalExpr(expr);
    expect(errors).toHaveLength(0);
    expect(parseFloat(output.join(""))).toBeCloseTo(expected as number, 5);
  });

  // int() usa parseInt — asserção diferente das demais
  it.each([
    ["int(3.7)", 3],
    ["int(-3.7)", -3],
  ])("escreval(%s) trunca para %i", async (expr, expected) => {
    const { output, errors } = await evalExpr(expr);
    expect(errors).toHaveLength(0);
    expect(parseInt(output.join("").trim(), 10)).toBe(expected as number);
  });

  test("exp(2, 8) = 256", async () => {
    const { output, errors } = await evalExpr("exp(2, 8)");
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toMatch(/^256/);
  });

  test("pi() ≈ 3.14159", async () => {
    const { output, errors } = await evalExpr("pi()");
    expect(errors).toHaveLength(0);
    expect(parseFloat(output.join(""))).toBeCloseTo(3.14159, 4);
  });

  test("rand() retorna valor em [0, 1)", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var r: real
inicio
  r <- rand()
  escreval(r)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const val = parseFloat(output.join(""));
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  test("randi(10) retorna inteiro em [0, 10)", async () => {
    const { output, errors } = await runCode(`
algoritmo "teste"
var n: inteiro
inicio
  n <- randi(10)
  escreval(n)
fimalgoritmo
`);
    expect(errors).toHaveLength(0);
    const val = parseInt(output.join("").trim(), 10);
    expect(Number.isInteger(val)).toBe(true);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(10);
  });

  // Edge cases: resultados especiais de ponto flutuante
  test("sqrt(-1) retorna NaN (sem erro de runtime)", async () => {
    const { output, errors } = await evalExpr("sqrt(-1)");
    expect(errors).toHaveLength(0);
    expect(output.join("").toLowerCase()).toMatch(/nan/);
  });

  test("log(0) retorna -Infinity (sem erro de runtime)", async () => {
    const { output, errors } = await evalExpr("log(0)");
    expect(errors).toHaveLength(0);
    expect(parseFloat(output.join(""))).toBe(-Infinity);
  });
});

describe("Funções nativas — Strings", () => {
  test('compr("abc") = 3', async () => {
    const { output, errors } = await evalExpr('compr("abc")');
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toMatch(/^3/);
  });

  test('copia("abcde", 2, 3) = "bcd"', async () => {
    const { output, errors } = await evalExpr('copia("abcde", 2, 3)');
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toBe("bcd");
  });

  // maiusc/minusc — mesma asserção toBe(string)
  it.each([
    ['maiusc("abc")', "ABC"],
    ['minusc("ABC")', "abc"],
  ])("escreval(%s) = %s", async (expr, expected) => {
    const { output, errors } = await evalExpr(expr);
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toBe(expected as string);
  });

  // pos() — encontrado e não-encontrado
  it.each([
    ['"bc"', '"abcd"', 2],
    ['"xyz"', '"abcd"', 0],
  ])("pos(%s, %s) = %i", async (sub, s, expected) => {
    const { output, errors } = await evalExpr(`pos(${sub}, ${s})`);
    expect(errors).toHaveLength(0);
    expect(parseInt(output.join("").trim(), 10)).toBe(expected as number);
  });
});

describe("Funções nativas — Conversão de tipos", () => {
  test('caracpnum("42") = 42', async () => {
    const { output, errors } = await evalExpr('caracpnum("42")');
    expect(errors).toHaveLength(0);
    expect(parseFloat(output.join("").trim())).toBe(42);
  });

  test('numcarac(42) = "42"', async () => {
    const { output, errors } = await evalExpr("numcarac(42)");
    expect(errors).toHaveLength(0);
    expect(output.join("").trim()).toBe("42");
  });
});
