import { describe, expect, test } from "vitest";
import { explainError } from "./explainError";

describe("explainError", () => {
  test("retorna null para mensagens desconhecidas", () => {
    expect(explainError("alguma mensagem desconhecida")).toBeNull();
    expect(explainError("")).toBeNull();
  });

  // Erros léxicos
  test("detecta string não fechada", () => {
    const result = explainError("String não fechada na linha 3");
    expect(result).toContain('aspas "');
  });

  test("detecta caractere inesperado e inclui o símbolo na mensagem", () => {
    const result = explainError("Caractere inesperado '@'");
    expect(result).toContain("@");
  });

  // Erros de execução
  test("detecta variável não declarada e menciona a seção var", () => {
    const result = explainError("Variável 'contador' não declarada");
    expect(result).toContain("contador");
    expect(result).toContain("var");
  });

  test("detecta divisão inteira por zero e menciona div", () => {
    const result = explainError("Divisão inteira por zero");
    expect(result).toContain("div");
  });

  test("detecta módulo por zero e menciona mod", () => {
    const result = explainError("Módulo por zero");
    expect(result).toContain("mod");
  });

  test("detecta divisão por zero genérica", () => {
    const result = explainError("Divisão por zero");
    expect(result).not.toBeNull();
    expect(result).toContain("zero");
  });

  test("divisão inteira por zero tem prioridade sobre divisão por zero genérica", () => {
    const intResult = explainError("Divisão inteira por zero");
    const genericResult = explainError("Divisão por zero");
    expect(intResult).not.toEqual(genericResult);
    expect(intResult).toContain("div");
  });

  test("detecta valor inválido para inteiro", () => {
    const result = explainError("Valor inválido para inteiro: 'abc'");
    expect(result).toContain("abc");
    expect(result).toContain("inteiro");
  });

  test("detecta valor inválido para real e menciona separador decimal", () => {
    const result = explainError("Valor inválido para real: '1x2'");
    expect(result).toContain("1x2");
    expect(result).toContain("decimal");
  });

  test("detecta quantidade errada de argumentos", () => {
    const result = explainError("Esperado 2 argumento(s), recebido 3");
    expect(result).toContain("2");
    expect(result).toContain("3");
  });

  test("detecta função não encontrada", () => {
    const result = explainError("Função 'raiz' não encontrada");
    expect(result).toContain("raiz");
  });

  test("detecta procedimento não encontrado", () => {
    const result = explainError("Procedimento 'imprimir' não encontrado");
    expect(result).toContain("imprimir");
  });

  test("detecta função sem retorno e menciona retorne", () => {
    const result = explainError("Função 'calcular' não retornou valor");
    expect(result).toContain("calcular");
    expect(result).toContain("retorne");
  });

  test("detecta condição não-lógica no se", () => {
    const result = explainError("Condição do 'se' deve ser lógica");
    expect(result).toContain("verdadeiro");
  });

  // Erros de sintaxe
  test("detecta token esperado e o inclui na mensagem", () => {
    const result = explainError("Esperado 'fimse'");
    expect(result).toContain("fimse");
  });

  test("detecta fimalgoritmo ausente", () => {
    const result = explainError("Esperado fimalgoritmo no final");
    expect(result).toContain("fimalgoritmo");
  });
});
