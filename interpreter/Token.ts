import { TokenType } from "./TokenType";

export interface Token {
  type: TokenType;
  value: string;
  line: number;   // para mensagens de erro precisas
  col: number;
}

// Todas as palavras-chave do VisuAlg (case-insensitive)
export const KEYWORDS: Record<string, TokenType> = {
  // Estrutura
  "algoritmo":        TokenType.ALGORITMO,
  "fimalgoritmo":     TokenType.FIMALGORITMO,
  "var":              TokenType.VAR,
  "inicio":           TokenType.INICIO,

  // Tipos
  "inteiro":          TokenType.TYPE_INTEIRO,
  "real":             TokenType.TYPE_REAL,
  "caractere":        TokenType.TYPE_CARACTERE,
  "logico":           TokenType.TYPE_LOGICO,

  // I/O
  "escreva":          TokenType.ESCREVA,
  "escreval":         TokenType.ESCREVAL,
  "leia":             TokenType.LEIA,

  // Condicional
  "se":               TokenType.SE,
  "entao":            TokenType.ENTAO,
  "senao":            TokenType.SENAO,
  "fimse":            TokenType.FIMSE,

  // Laços
  "para":             TokenType.PARA,
  "de":               TokenType.DE,
  "ate":              TokenType.ATE,
  "faca":             TokenType.FACA,
  "fimpara":          TokenType.FIMPARA,
  "enquanto":         TokenType.ENQUANTO,
  "fimenquanto":      TokenType.FIMENQUANTO,
  "repita":           TokenType.REPITA,

  // Operadores lógicos escritos
  "e":                TokenType.AND,
  "ou":               TokenType.OR,
  "nao":              TokenType.NOT,

  // Operadores aritméticos escritos
  "div":              TokenType.DIV,
  "mod":              TokenType.MOD,

  // Booleanos
  "verdadeiro":       TokenType.BOOLEAN,
  "falso":            TokenType.BOOLEAN,

  // Subprogramas
  "procedimento":     TokenType.PROCEDIMENTO,
  "fimprocedimento":  TokenType.FIMPROCEDIMENTO,
  "funcao":           TokenType.FUNCAO,
  "fimfuncao":        TokenType.FIMFUNCAO,
  "retorne":          TokenType.RETORNE,
};