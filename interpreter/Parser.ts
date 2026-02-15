import {
  AssignNode,
  ASTNode,
  CallNode,
  ForNode,
  FunctionNode,
  IfNode,
  ProcedureNode,
  ProgramNode,
  ReadNode,
  RepeatNode,
  ReturnNode,
  VarDeclarationNode, VizType,
  WhileNode,
  WriteNode
} from "./AST";
import { Token, } from "./Token";
import { TokenType } from "./TokenType";

export class ParseError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`[Linha ${line}, Col ${col}] Erro de sintaxe: ${message}`);
    this.name = ParseError.name;
  }
}

export class Parser {
  private pos: number = 0;

  constructor(private tokens: Token[]) {}

  parse(): ProgramNode {
    this.expect(TokenType.ALGORITMO, "Esperado 'algoritmo'");
    const name = this.expect(TokenType.STRING, "Esperado nome do algoritmo entre aspas").value;

    const declarations = this.parseVarBlock();
    const procedures   = this.parseProceduresAndFunctions();
    this.expect(TokenType.INICIO, "Esperado 'inicio'");
    const body = this.parseStatements([TokenType.FIMALGORITMO]);
    this.expect(TokenType.FIMALGORITMO, "Esperado 'fimalgoritmo'");

    return { kind: "Program", name, declarations: [...declarations, ...procedures as any], body };
  }

  // ─── Declarações de variáveis ─────────────────────────────────────────────────

  private parseVarBlock(): VarDeclarationNode[] {
    const declarations: VarDeclarationNode[] = [];

    if (!this.check(TokenType.VAR)) return declarations;
    this.advance(); // consome "var"

    // Lê declarações até encontrar inicio, procedimento, funcao
    while (
      !this.check(TokenType.INICIO) &&
      !this.check(TokenType.PROCEDIMENTO) &&
      !this.check(TokenType.FUNCAO) &&
      !this.check(TokenType.EOF)
    ) {
      declarations.push(this.parseVarDeclaration());
    }

    return declarations;
  }

  private parseVarDeclaration(): VarDeclarationNode {
    const line = this.current().line;
    const names: string[] = [];

    // Pode ter múltiplos nomes: a, b, c: inteiro
    names.push(this.expect(TokenType.IDENTIFIER, "Esperado nome de variável").value);

    while (this.check(TokenType.COMMA)) {
      this.advance();
      names.push(this.expect(TokenType.IDENTIFIER, "Esperado nome de variável").value);
    }

    this.expect(TokenType.COLON, "Esperado ':' após nome(s) da variável");
    const type = this.parseType();

    return { kind: "VarDeclaration", names, type, line };
  }

  private parseType(): VizType {
    const token = this.current();
    const typeMap: Partial<Record<TokenType, VizType>> = {
      [TokenType.TYPE_INTEIRO]:   "inteiro",
      [TokenType.TYPE_REAL]:      "real",
      [TokenType.TYPE_CARACTERE]: "caractere",
      [TokenType.TYPE_LOGICO]:    "logico",
    };

    const type = typeMap[token.type];
    if (!type) {
      throw new ParseError(
        `Tipo inválido '${token.value}'. Esperado: inteiro, real, caractere ou logico`,
        token.line, token.col
      );
    }

    this.advance();
    return type;
  }

  // ─── Subprogramas ─────────────────────────────────────────────────────────────

  private parseProceduresAndFunctions(): (ProcedureNode | FunctionNode)[] {
    const subs: (ProcedureNode | FunctionNode)[] = [];

    while (this.check(TokenType.PROCEDIMENTO) || this.check(TokenType.FUNCAO)) {
      if (this.check(TokenType.PROCEDIMENTO)) subs.push(this.parseProcedure());
      else                                     subs.push(this.parseFunction());
    }

    return subs;
  }

  private parseProcedure(): ProcedureNode {
    const line = this.current().line;
    this.advance(); // consome "procedimento"
    const name = this.expect(TokenType.IDENTIFIER, "Esperado nome do procedimento").value;
    const params = this.parseParams();
    const declarations = this.parseVarBlock();
    this.expect(TokenType.INICIO, "Esperado 'inicio'");
    const body = this.parseStatements([TokenType.FIMPROCEDIMENTO]);
    this.expect(TokenType.FIMPROCEDIMENTO, "Esperado 'fimprocedimento'");
    return { kind: "Procedure", name, params: [...params, ...declarations], body, line };
  }

  private parseFunction(): FunctionNode {
    const line = this.current().line;
    this.advance(); // consome "funcao"
    const name = this.expect(TokenType.IDENTIFIER, "Esperado nome da função").value;
    const params = this.parseParams();
    this.expect(TokenType.COLON, "Esperado ':' para tipo de retorno");
    const returnType = this.parseType();
    const declarations = this.parseVarBlock();
    this.expect(TokenType.INICIO, "Esperado 'inicio'");
    const body = this.parseStatements([TokenType.FIMFUNCAO]);
    this.expect(TokenType.FIMFUNCAO, "Esperado 'fimfuncao'");
    return { kind: "Function", name, params: [...params, ...declarations], returnType, body, line };
  }

  private parseParams(): VarDeclarationNode[] {
    const params: VarDeclarationNode[] = [];

    if (!this.check(TokenType.LPAREN)) return params;
    this.advance(); // consome "("

    if (!this.check(TokenType.RPAREN)) {
      params.push(this.parseVarDeclaration());
      while (this.check(TokenType.COMMA)) {
        this.advance();
        params.push(this.parseVarDeclaration());
      }
    }

    this.expect(TokenType.RPAREN, "Esperado ')' após parâmetros");
    return params;
  }

  // ─── Statements ───────────────────────────────────────────────────────────────

  private parseStatements(stopAt: TokenType[]): ASTNode[] {
    const statements: ASTNode[] = [];

    while (!stopAt.includes(this.current().type) && !this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
    }

    return statements;
  }

  private parseStatement(): ASTNode {
    const token = this.current();

    switch (token.type) {
      case TokenType.IDENTIFIER: return this.parseAssignOrCall();
      case TokenType.ESCREVA:    return this.parseWrite(false);
      case TokenType.ESCREVAL:   return this.parseWrite(true);
      case TokenType.LEIA:       return this.parseRead();
      case TokenType.SE:         return this.parseIf();
      case TokenType.PARA:       return this.parseFor();
      case TokenType.ENQUANTO:   return this.parseWhile();
      case TokenType.REPITA:     return this.parseRepeat();
      case TokenType.RETORNE:    return this.parseReturn();

      default:
        throw new ParseError(
          `Comando inesperado '${token.value}'`,
          token.line, token.col
        );
    }
  }

  private parseAssignOrCall(): AssignNode | CallNode {
    const token = this.current();
    const name = this.advance().value; // consome o IDENTIFIER

    // Chamada de procedimento: nome(args)
    if (this.check(TokenType.LPAREN)) {
      return this.parseCallArgs(name, token.line);
    }

    // Atribuição: nome <- expr
    this.expect(TokenType.ASSIGN, `Esperado '<-' após '${name}'`);
    const value = this.parseExpression();
    return { kind: "Assign", name, value, line: token.line };
  }

  private parseCallArgs(name: string, line: number): CallNode {
    this.advance(); // consome "("
    const args: ASTNode[] = [];

    if (!this.check(TokenType.RPAREN)) {
      args.push(this.parseExpression());
      while (this.check(TokenType.COMMA)) {
        this.advance();
        args.push(this.parseExpression());
      }
    }

    this.expect(TokenType.RPAREN, "Esperado ')' após argumentos");
    return { kind: "Call", name, args, line };
  }

  private parseWrite(newline: boolean): WriteNode {
    const line = this.current().line;
    this.advance(); // consome "escreva" ou "escreval"
    this.expect(TokenType.LPAREN, "Esperado '(' após escreva/escreval");

    const args: ASTNode[] = [];
    if (!this.check(TokenType.RPAREN)) {
      args.push(this.parseExpression());
      while (this.check(TokenType.COMMA)) {
        this.advance();
        args.push(this.parseExpression());
      }
    }

    this.expect(TokenType.RPAREN, "Esperado ')' após argumentos");
    return { kind: "Write", args, newline, line };
  }

  private parseRead(): ReadNode {
    const line = this.current().line;
    this.advance(); // consome "leia"
    this.expect(TokenType.LPAREN, "Esperado '(' após leia");
    const name = this.expect(TokenType.IDENTIFIER, "Esperado nome de variável").value;
    this.expect(TokenType.RPAREN, "Esperado ')'");
    return { kind: "Read", name, line };
  }

  private parseIf(): IfNode {
    const line = this.current().line;
    this.advance(); // consome "se"
    const condition = this.parseExpression();
    this.expect(TokenType.ENTAO, "Esperado 'entao' após condição do se");

    const thenBranch = this.parseStatements([TokenType.SENAO, TokenType.FIMSE]);

    let elseBranch: ASTNode[] = [];
    if (this.check(TokenType.SENAO)) {
      this.advance();
      elseBranch = this.parseStatements([TokenType.FIMSE]);
    }

    this.expect(TokenType.FIMSE, "Esperado 'fimse'");
    return { kind: "If", condition, then: thenBranch, else: elseBranch, line };
  }

  private parseFor(): ForNode {
    const line = this.current().line;
    this.advance(); // consome "para"
    const variable = this.expect(TokenType.IDENTIFIER, "Esperado variável de controle").value;
    this.expect(TokenType.DE, "Esperado 'de' após variável do para");
    const from = this.parseExpression();
    this.expect(TokenType.ATE, "Esperado 'ate' após valor inicial");
    const to = this.parseExpression();

    // passo é opcional: "passo N"
    let step: ASTNode | null = null;
    if (this.check(TokenType.IDENTIFIER) && this.current().value === "passo") {
      this.advance();
      step = this.parseExpression();
    }

    this.expect(TokenType.FACA, "Esperado 'faca'");
    const body = this.parseStatements([TokenType.FIMPARA]);
    this.expect(TokenType.FIMPARA, "Esperado 'fimpara'");

    return { kind: "For", variable, from, to, step, body, line };
  }

  private parseWhile(): WhileNode {
    const line = this.current().line;
    this.advance(); // consome "enquanto"
    const condition = this.parseExpression();
    this.expect(TokenType.FACA, "Esperado 'faca' após condição do enquanto");
    const body = this.parseStatements([TokenType.FIMENQUANTO]);
    this.expect(TokenType.FIMENQUANTO, "Esperado 'fimenquanto'");
    return { kind: "While", condition, body, line };
  }

  private parseRepeat(): RepeatNode {
    const line = this.current().line;
    this.advance(); // consome "repita"
    const body = this.parseStatements([TokenType.ATE]);
    this.expect(TokenType.ATE, "Esperado 'ate' após corpo do repita");
    const condition = this.parseExpression();
    return { kind: "Repeat", body, condition, line };
  }

  private parseReturn(): ReturnNode {
    const line = this.current().line;
    this.advance(); // consome "retorne"
    const value = this.parseExpression();
    return { kind: "Return", value, line };
  }

  // ─── Expressões (hierarquia de precedência) ───────────────────────────────────

  // Nível 1 — menor precedência: ou
  private parseExpression(): ASTNode {
    return this.parseOr();
  }

  // Nível 2: e
  private parseOr(): ASTNode {
    let left = this.parseAnd();

    while (this.check(TokenType.OR)) {
      const line = this.current().line;
      this.advance();
      const right = this.parseAnd();
      left = { kind: "BinaryOp", op: "ou", left, right, line };
    }

    return left;
  }

  // Nível 3: e
  private parseAnd(): ASTNode {
    let left = this.parseEquality();

    while (this.check(TokenType.AND)) {
      const line = this.current().line;
      this.advance();
      const right = this.parseEquality();
      left = { kind: "BinaryOp", op: "e", left, right, line };
    }

    return left;
  }

  // Nível 4: = <>
  private parseEquality(): ASTNode {
    let left = this.parseComparison();

    while (this.check(TokenType.EQUAL) || this.check(TokenType.NOT_EQUAL)) {
      const line = this.current().line;
      const op = this.advance().value;
      const right = this.parseComparison();
      left = { kind: "BinaryOp", op, left, right, line };
    }

    return left;
  }

  // Nível 5: < > <= >=
  private parseComparison(): ASTNode {
    let left = this.parseAddSub();

    while (
      this.check(TokenType.LESS) || this.check(TokenType.GREATER) ||
      this.check(TokenType.LESS_EQUAL) || this.check(TokenType.GREATER_EQUAL)
    ) {
      const line = this.current().line;
      const op = this.advance().value;
      const right = this.parseAddSub();
      left = { kind: "BinaryOp", op, left, right, line };
    }

    return left;
  }

  // Nível 6: + -
  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const line = this.current().line;
      const op = this.advance().value;
      const right = this.parseMulDiv();
      left = { kind: "BinaryOp", op, left, right, line };
    }

    return left;
  }

  // Nível 7: * / div mod
  private parseMulDiv(): ASTNode {
    let left = this.parseUnary();

    while (
      this.check(TokenType.MULTIPLY) || this.check(TokenType.DIVIDE) ||
      this.check(TokenType.DIV) || this.check(TokenType.MOD)
    ) {
      const line = this.current().line;
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { kind: "BinaryOp", op, left, right, line };
    }

    return left;
  }

  // Nível 8: nao, - (unário)
  private parseUnary(): ASTNode {
    if (this.check(TokenType.NOT)) {
      const line = this.current().line;
      this.advance();
      return { kind: "UnaryOp", op: "nao", operand: this.parseUnary(), line };
    }

    if (this.check(TokenType.MINUS)) {
      const line = this.current().line;
      this.advance();
      return { kind: "UnaryOp", op: "-", operand: this.parseUnary(), line };
    }

    return this.parsePrimary();
  }

  // Nível 9 — maior precedência: literais, identificadores, chamadas, (expr)
  private parsePrimary(): ASTNode {
    const token = this.current();

    // Número
    if (this.check(TokenType.NUMBER)) {
      this.advance();
      return { kind: "NumberLiteral", value: Number(token.value), line: token.line };
    }

    // String
    if (this.check(TokenType.STRING)) {
      this.advance();
      return { kind: "StringLiteral", value: token.value, line: token.line };
    }

    // Booleano
    if (this.check(TokenType.BOOLEAN)) {
      this.advance();
      return { kind: "BooleanLiteral", value: token.value === "verdadeiro", line: token.line };
    }

    // Identificador ou chamada de função
    if (this.check(TokenType.IDENTIFIER)) {
      this.advance();
      if (this.check(TokenType.LPAREN)) {
        return this.parseCallArgs(token.value, token.line);
      }
      return { kind: "Identifier", name: token.value, line: token.line };
    }

    // Expressão entre parênteses
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN, "Esperado ')' para fechar expressão");
      return expr;
    }

    throw new ParseError(
      `Expressão inválida: token inesperado '${token.value}'`,
      token.line, token.col
    );
  }

  // ─── Utilitários ─────────────────────────────────────────────────────────────

  private expect(type: TokenType, message: string): Token {
    if (!this.check(type)) {
      const token = this.current();
      throw new ParseError(message, token.line, token.col);
    }
    return this.advance();
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    if (token.type !== TokenType.EOF) this.pos++;
    return token;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }
}