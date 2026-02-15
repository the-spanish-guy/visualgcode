export enum TokenType {
  // Literais
  NUMBER        = "NUMBER",        // 10, 3.14
  STRING        = "STRING",        // "hello"
  BOOLEAN       = "BOOLEAN",       // verdadeiro, falso

  // Identificadores
  IDENTIFIER    = "IDENTIFIER",    // nomeDaVariavel

  // Operadores aritméticos
  PLUS          = "PLUS",          // +
  MINUS         = "MINUS",         // -
  MULTIPLY      = "MULTIPLY",      // *
  DIVIDE        = "DIVIDE",        // /
  DIV           = "DIV",           // div (divisão inteira)
  MOD           = "MOD",           // mod (resto)

  // Operadores relacionais
  EQUAL         = "EQUAL",         // =
  NOT_EQUAL     = "NOT_EQUAL",     // <>
  LESS          = "LESS",          // <
  LESS_EQUAL    = "LESS_EQUAL",    // <=
  GREATER       = "GREATER",       // >
  GREATER_EQUAL = "GREATER_EQUAL", // >=

  // Operadores lógicos
  AND           = "AND",           // e
  OR            = "OR",            // ou
  NOT           = "NOT",           // nao

  // Atribuição
  ASSIGN        = "ASSIGN",        // <-

  // Pontuação
  LPAREN        = "LPAREN",        // (
  RPAREN        = "RPAREN",        // )
  COLON         = "COLON",         // :
  COMMA         = "COMMA",         // ,

  // Palavras-chave estruturais
  ALGORITMO     = "ALGORITMO",
  FIMALGORITMO  = "FIMALGORITMO",
  VAR           = "VAR",
  INICIO        = "INICIO",

  // Tipos de dados
  TYPE_INTEIRO  = "TYPE_INTEIRO",
  TYPE_REAL     = "TYPE_REAL",
  TYPE_CARACTERE= "TYPE_CARACTERE",
  TYPE_LOGICO   = "TYPE_LOGICO",

  // I/O
  ESCREVA       = "ESCREVA",
  ESCREVAL      = "ESCREVAL",
  LEIA          = "LEIA",

  // Condicional
  SE            = "SE",
  ENTAO         = "ENTAO",
  SENAO         = "SENAO",
  FIMSE         = "FIMSE",

  // Laços
  PARA          = "PARA",
  DE            = "DE",
  ATE           = "ATE",
  FACA          = "FACA",
  FIMPARA       = "FIMPARA",
  ENQUANTO      = "ENQUANTO",
  FIMENQUANTO   = "FIMENQUANTO",
  REPITA        = "REPITA",
  ATE_REPITA    = "ATE_REPITA",    // "ate" usado no repita..ate

  // Subprogramas
  PROCEDIMENTO  = "PROCEDIMENTO",
  FIMPROCEDIMENTO = "FIMPROCEDIMENTO",
  FUNCAO        = "FUNCAO",
  FIMFUNCAO     = "FIMFUNCAO",
  RETORNE       = "RETORNE",

  // Controle
  EOF           = "EOF",
}