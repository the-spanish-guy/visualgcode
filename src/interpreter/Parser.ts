import type {
  AleatorioNode,
  ArrayType,
  AssignNode,
  ASTNode,
  BreakNode,
  CallNode,
  CaseClause,
  ClearScreenNode,
  ConstDeclarationNode,
  ForNode,
  FunctionNode,
  IfNode,
  MatrixAccessNode,
  PauseNode,
  PrimitiveType,
  ProcedureNode,
  ProgramNode,
  ReadNode,
  RepeatNode,
  ReturnNode,
  SwitchNode,
  VarDeclarationNode,
  VizType,
  WhileNode,
  WriteArg,
  WriteNode,
} from "./AST";
import type { Token } from "./Token";
import { TokenType } from "./TokenType";

export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public col: number,
  ) {
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

    // Aceita blocos var, constante, procedimento e funcao em qualquer ordem
    const declarations: any[] = [];
    while (!this.check(TokenType.INICIO) && !this.check(TokenType.EOF)) {
      if (this.check(TokenType.VAR)) {
        declarations.push(...this.parseVarBlock());
      } else if (this.check(TokenType.CONST)) {
        declarations.push(...this.parseConstBlock());
      } else if (this.check(TokenType.PROCEDIMENTO)) {
        declarations.push(this.parseProcedure());
      } else if (this.check(TokenType.FUNCAO)) {
        declarations.push(this.parseFunction());
      } else {
        const tok = this.current();
        throw new ParseError(
          `Esperado 'var', 'constante', 'procedimento', 'funcao' ou 'inicio'`,
          tok.line,
          tok.col,
        );
      }
    }

    this.expect(TokenType.INICIO, "Esperado 'inicio'");
    const body = this.parseStatements([TokenType.FIMALGORITMO]);
    this.expect(TokenType.FIMALGORITMO, "Esperado 'fimalgoritmo'");

    return { kind: "Program", name, declarations, body };
  }

  // ─── Declarações de variáveis ─────────────────────────────────────────────────

  private parseVarBlock(): VarDeclarationNode[] {
    const declarations: VarDeclarationNode[] = [];

    if (!this.check(TokenType.VAR)) return declarations;
    this.advance();

    // Lê declarações até encontrar inicio, constante, procedimento, funcao
    while (
      !this.check(TokenType.INICIO) &&
      !this.check(TokenType.CONST) &&
      !this.check(TokenType.PROCEDIMENTO) &&
      !this.check(TokenType.FUNCAO) &&
      !this.check(TokenType.EOF)
    ) {
      declarations.push(this.parseVarDeclaration());
    }

    return declarations;
  }

  private parseConstBlock(): ConstDeclarationNode[] {
    this.advance(); // consome "constante"
    const nodes: ConstDeclarationNode[] = [];

    while (
      !this.check(TokenType.VAR) &&
      !this.check(TokenType.CONST) &&
      !this.check(TokenType.INICIO) &&
      !this.check(TokenType.PROCEDIMENTO) &&
      !this.check(TokenType.FUNCAO) &&
      !this.check(TokenType.EOF)
    ) {
      const nameTok = this.expect(TokenType.IDENTIFIER, "Esperado nome da constante");
      this.expect(TokenType.EQUAL, "Esperado '=' após nome da constante");
      const value = this.parseConstValue();
      nodes.push({ kind: "ConstDeclaration", name: nameTok.value, value, line: nameTok.line });
    }

    return nodes;
  }

  private parseConstValue(): number | string | boolean {
    if (this.check(TokenType.MINUS)) {
      this.advance();
      const num = this.expect(TokenType.NUMBER, "Esperado número após '-'");
      return -Number(num.value);
    }
    if (this.check(TokenType.NUMBER)) {
      return Number(this.advance().value);
    }
    if (this.check(TokenType.STRING)) {
      return this.advance().value;
    }
    if (this.check(TokenType.BOOLEAN)) {
      return this.advance().value === "verdadeiro";
    }
    const tok = this.current();
    throw new ParseError(
      `Valor inválido para constante: '${tok.value}'. Esperado número, string ou booleano`,
      tok.line,
      tok.col,
    );
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

    if (token.type === TokenType.VETOR) {
      return this.parseArrayType();
    }

    const typeMap: Partial<Record<TokenType, PrimitiveType>> = {
      [TokenType.TYPE_INTEIRO]: "inteiro",
      [TokenType.TYPE_REAL]: "real",
      [TokenType.TYPE_CARACTERE]: "caractere",
      [TokenType.TYPE_LOGICO]: "logico",
    };

    const type = typeMap[token.type];
    if (!type) {
      throw new ParseError(
        `Tipo inválido '${token.value}'. Esperado: inteiro, real, caractere, logico ou vetor`,
        token.line,
        token.col,
      );
    }

    this.advance();
    return type;
  }

  // ─── Parsing de tipos vetor ───────────────────────────────────────────────────
  // Suporta 1D: vetor[1..10] de inteiro
  // Suporta 2D: vetor[1..3, 1..4] de inteiro

  private parseArrayType(): ArrayType {
    this.expect(TokenType.VETOR, "Esperado 'vetor'");
    this.expect(TokenType.LBRACKET, "Esperado '[' após 'vetor'");

    const start = Number(
      this.expect(TokenType.NUMBER, "Esperado número inicial do intervalo").value,
    );
    this.expect(TokenType.DOTDOT, "Esperado '..' no intervalo");
    const end = Number(this.expect(TokenType.NUMBER, "Esperado número final do intervalo").value);

    // Verifica se é 2D: há uma vírgula após o primeiro intervalo
    if (this.check(TokenType.COMMA)) {
      this.advance(); // consome ','
      const colStart = Number(
        this.expect(TokenType.NUMBER, "Esperado número inicial do intervalo de colunas").value,
      );
      this.expect(TokenType.DOTDOT, "Esperado '..' no intervalo de colunas");
      const colEnd = Number(
        this.expect(TokenType.NUMBER, "Esperado número final do intervalo de colunas").value,
      );
      this.expect(TokenType.RBRACKET, "Esperado ']' após intervalo");
      this.expect(TokenType.DE, "Esperado 'de' após ']'");
      const elementType = this.parseType() as PrimitiveType;

      const rowSize = end - start + 1;
      const colSize = colEnd - colStart + 1;

      return {
        kind: "array",
        elementType,
        // Campos 1D usados como dimensão de linha para retrocompatibilidade
        start,
        size: rowSize,
        // Campos 2D
        rowStart: start,
        rowSize,
        colStart,
        colSize,
      };
    }

    // 1D
    this.expect(TokenType.RBRACKET, "Esperado ']' após intervalo");
    this.expect(TokenType.DE, "Esperado 'de' após ']'");
    const elementType = this.parseType() as PrimitiveType;
    const size = end - start + 1;

    return { kind: "array", elementType, start, size };
  }

  // ─── Subprogramas ─────────────────────────────────────────────────────────────

  private parseProceduresAndFunctions(): (ProcedureNode | FunctionNode)[] {
    const subs: (ProcedureNode | FunctionNode)[] = [];

    while (this.check(TokenType.PROCEDIMENTO) || this.check(TokenType.FUNCAO)) {
      if (this.check(TokenType.PROCEDIMENTO)) subs.push(this.parseProcedure());
      else subs.push(this.parseFunction());
    }

    return subs;
  }

  private parseProcedure(): ProcedureNode {
    const line = this.current().line;
    this.advance();
    const name = this.expect(TokenType.IDENTIFIER, "Esperado nome do procedimento").value;
    const params = this.parseParams();
    const locals = this.parseVarBlock();
    this.expect(TokenType.INICIO, "Esperado 'inicio'");
    const body = this.parseStatements([TokenType.FIMPROCEDIMENTO]);
    this.expect(TokenType.FIMPROCEDIMENTO, "Esperado 'fimprocedimento'");
    return { kind: "Procedure", name, params, locals, body, line };
  }

  private parseFunction(): FunctionNode {
    const line = this.current().line;
    this.advance();
    const name = this.expect(TokenType.IDENTIFIER, "Esperado nome da função").value;
    const params = this.parseParams();
    this.expect(TokenType.COLON, "Esperado ':' para tipo de retorno");
    const returnType = this.parseType();
    const locals = this.parseVarBlock();
    this.expect(TokenType.INICIO, "Esperado 'inicio'");
    const body = this.parseStatements([TokenType.FIMFUNCAO]);
    this.expect(TokenType.FIMFUNCAO, "Esperado 'fimfuncao'");
    return { kind: "Function", name, params, locals, returnType, body, line };
  }

  private parseParams(): VarDeclarationNode[] {
    const params: VarDeclarationNode[] = [];

    if (!this.check(TokenType.LPAREN)) return params;
    this.advance();

    if (!this.check(TokenType.RPAREN)) {
      params.push(this.parseParamDeclaration());
      while (this.check(TokenType.COMMA)) {
        this.advance();
        params.push(this.parseParamDeclaration());
      }
    }

    this.expect(TokenType.RPAREN, "Esperado ')' após parâmetros");
    return params;
  }

  private parseParamDeclaration(): VarDeclarationNode {
    // Detecta "var" opcional antes do nome — indica passagem por referência
    const byRef = this.check(TokenType.VAR);
    if (byRef) this.advance(); // consome "var"

    const decl = this.parseVarDeclaration();
    return byRef ? { ...decl, byRef: true } : decl;
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
      case TokenType.IDENTIFIER:
        return this.parseAssignOrCall();
      case TokenType.ESCREVA:
        return this.parseWrite(false);
      case TokenType.ESCREVAL:
        return this.parseWrite(true);
      case TokenType.LEIA:
        return this.parseRead();
      case TokenType.SE:
        return this.parseIf();
      case TokenType.PARA:
        return this.parseFor();
      case TokenType.ENQUANTO:
        return this.parseWhile();
      case TokenType.REPITA:
        return this.parseRepeat();
      case TokenType.RETORNE:
        return this.parseReturn();
      case TokenType.ESCOLHA:
        return this.parseSwitch();
      case TokenType.INTERROMPA:
        return this.parseBreak();
      case TokenType.LIMPATELA:
        return this.parseClearScreen();
      case TokenType.PAUSA:
        return this.parsePause();
      case TokenType.ALEATORIO:
        return this.parseAleatorio();
      default:
        throw new ParseError(`Comando inesperado '${token.value}'`, token.line, token.col);
    }
  }

  private parseAssignOrCall(): AssignNode | CallNode {
    const token = this.current();
    const name = this.advance().value;

    // Acesso com índice: pode ser 1D (v[i]) ou 2D (m[i, j])
    if (this.check(TokenType.LBRACKET)) {
      this.advance(); // consome '['
      const index = this.parseExpression();

      if (this.check(TokenType.COMMA)) {
        // 2D: m[i, j] <- valor
        this.advance(); // consome ','
        const col = this.parseExpression();
        this.expect(TokenType.RBRACKET, "Esperado ']' após índices");
        this.expect(TokenType.ASSIGN, "Esperado '<-' após índices");
        const value = this.parseExpression();
        return { kind: "Assign", name, index, col, value, line: token.line };
      }

      // 1D: v[i] <- valor
      this.expect(TokenType.RBRACKET, "Esperado ']' após índice");
      this.expect(TokenType.ASSIGN, "Esperado '<-' após índice");
      const value = this.parseExpression();
      return { kind: "Assign", name, index, value, line: token.line };
    }

    // Chamada de procedimento: nome(args)
    if (this.check(TokenType.LPAREN)) {
      return this.parseCallArgs(name, token.line);
    }

    // Atribuição simples: nome <- expr
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

    const args: WriteArg[] = [];
    if (!this.check(TokenType.RPAREN)) {
      args.push(this.parseWriteArg());
      while (this.check(TokenType.COMMA)) {
        this.advance();
        args.push(this.parseWriteArg());
      }
    }

    this.expect(TokenType.RPAREN, "Esperado ')' após argumentos");
    return { kind: "Write", args, newline, line };
  }

  private parseWriteArg(): WriteArg {
    const expr = this.parseExpression();
    if (!this.check(TokenType.COLON)) return { expr };

    this.advance(); // consome ':'
    const width = Number(this.expect(TokenType.NUMBER, "Esperado número após ':'").value);

    if (!this.check(TokenType.COLON)) return { expr, width };

    this.advance(); // consome ':'
    const decimals = Number(this.expect(TokenType.NUMBER, "Esperado número após ':'").value);
    return { expr, width, decimals };
  }

  private parseRead(): ASTNode {
    const line = this.current().line;
    this.advance(); // consome "leia"
    this.expect(TokenType.LPAREN, "Esperado '(' após leia");

    const reads: ReadNode[] = [];

    do {
      if (this.check(TokenType.COMMA)) this.advance(); // consome ',' entre itens

      const name = this.expect(TokenType.IDENTIFIER, "Esperado nome de variável").value;
      let index: ASTNode | undefined;
      let col: ASTNode | undefined;

      if (this.check(TokenType.LBRACKET)) {
        this.advance(); // consome '['
        index = this.parseExpression();

        if (this.check(TokenType.COMMA)) {
          // Pode ser índice 2D OU próxima variável do leia — precisamos distinguir.
          // Se após a vírgula vier uma expressão seguida de ']', é 2D.
          // Usamos lookahead: salvamos pos, tentamos parsear como 2D.
          // Na prática o VisuAlg original não mistura leia(m[i,j], x),
          // então tratamos vírgula dentro de '[' sempre como 2D.
          this.advance(); // consome ','
          col = this.parseExpression();
        }

        this.expect(TokenType.RBRACKET, "Esperado ']' após índice(s)");
      }

      reads.push({ kind: "Read", name, index, col, line });
    } while (this.check(TokenType.COMMA));

    this.expect(TokenType.RPAREN, "Esperado ')'");

    // Caso simples: leia(a) → ReadNode único
    if (reads.length === 1) return reads[0];

    // Múltiplos: leia(a, b, c) → MultiReadNode
    return { kind: "MultiRead", reads, line };
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
    const body = this.parseStatements([TokenType.ATE, TokenType.FIMREPITA]);

    if (this.check(TokenType.FIMREPITA)) {
      this.advance(); // consome "fimrepita"
      return { kind: "Repeat", body, line };
    }

    this.expect(TokenType.ATE, "Esperado 'ate' ou 'fimrepita' após corpo do repita");
    const condition = this.parseExpression();
    return { kind: "Repeat", body, condition, line };
  }

  private parseReturn(): ReturnNode {
    const line = this.current().line;
    this.advance(); // consome "retorne"
    const value = this.parseExpression();
    return { kind: "Return", value, line };
  }

  private parseSwitch(): SwitchNode {
    const line = this.current().line;
    this.advance(); // consome "escolha"

    const expression = this.parseExpression();

    const cases: CaseClause[] = [];
    let otherwise: ASTNode[] = [];

    // Consome cláusulas "caso" até encontrar "outrocaso" ou "fimescolha"
    while (
      !this.check(TokenType.FIMESCOLHA) &&
      !this.check(TokenType.OUTROCASO) &&
      !this.check(TokenType.EOF)
    ) {
      this.expect(TokenType.CASO, "Esperado 'caso' dentro de 'escolha'");

      // Uma cláusula pode ter múltiplos valores: caso 1, 2, 3
      const values: ASTNode[] = [];
      values.push(this.parseExpression());
      while (this.check(TokenType.COMMA)) {
        this.advance();
        values.push(this.parseExpression());
      }

      const body = this.parseStatements([
        TokenType.CASO,
        TokenType.OUTROCASO,
        TokenType.FIMESCOLHA,
      ]);

      cases.push({ values, body });
    }

    // Bloco opcional "outrocaso"
    if (this.check(TokenType.OUTROCASO)) {
      this.advance(); // consome "outrocaso"
      otherwise = this.parseStatements([TokenType.FIMESCOLHA]);
    }

    this.expect(TokenType.FIMESCOLHA, "Esperado 'fimescolha'");

    return { kind: "Switch", expression, cases, otherwise, line };
  }

  private parseBreak(): BreakNode {
    const line = this.current().line;
    this.advance(); // consome "interrompa"
    return { kind: "Break", line };
  }

  private parseClearScreen(): ClearScreenNode {
    const line = this.current().line;
    this.advance(); // consome "limpatela"
    return { kind: "ClearScreen", line };
  }

  private parsePause(): PauseNode {
    const line = this.current().line;
    this.advance(); // consome "pausa"
    return { kind: "Pause", line };
  }

  private parseAleatorio(): AleatorioNode {
    const line = this.current().line;
    this.advance(); // consome "aleatorio"

    const DEFAULT_MIN = 0;
    const DEFAULT_MAX = 100;

    if (this.check(TokenType.IDENTIFIER)) {
      const keyword = this.current().value.toLowerCase();
      if (keyword === "off") {
        this.advance();
        return { kind: "Aleatorio", active: false, min: DEFAULT_MIN, max: DEFAULT_MAX, line };
      }
      if (keyword === "on") {
        this.advance();
        return { kind: "Aleatorio", active: true, min: DEFAULT_MIN, max: DEFAULT_MAX, line };
      }
    }

    if (this.check(TokenType.NUMBER)) {
      const first = Number(this.advance().value);
      if (this.check(TokenType.COMMA)) {
        this.advance();
        const second = Number(this.expect(TokenType.NUMBER, "Esperado número após ','").value);
        const min = Math.min(first, second);
        const max = Math.max(first, second);
        return { kind: "Aleatorio", active: true, min, max, line };
      }
      return { kind: "Aleatorio", active: true, min: DEFAULT_MIN, max: first, line };
    }

    return { kind: "Aleatorio", active: true, min: DEFAULT_MIN, max: DEFAULT_MAX, line };
  }

  // ─── Expressões ───────────────────────────────────────────────────────────────

  // Nível 1 — menor precedência: ou
  private parseExpression(): ASTNode {
    return this.parseOr();
  }

  // Nível 2: e
  private parseOr(): ASTNode {
    let left = this.parseXou();

    while (this.check(TokenType.OR)) {
      const line = this.current().line;
      this.advance();
      const right = this.parseXou();
      left = { kind: "BinaryOp", op: "ou", left, right, line };
    }

    return left;
  }

  // Nível 2.5: xou (XOR lógico) — entre ou e e
  private parseXou(): ASTNode {
    let left = this.parseAnd();

    while (this.check(TokenType.XOU)) {
      const line = this.current().line;
      this.advance();
      const right = this.parseAnd();
      left = { kind: "BinaryOp", op: "xou", left, right, line };
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
      this.check(TokenType.LESS) ||
      this.check(TokenType.GREATER) ||
      this.check(TokenType.LESS_EQUAL) ||
      this.check(TokenType.GREATER_EQUAL)
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

  // Nível 7: * / div mod %% \\\\
  private parseMulDiv(): ASTNode {
    let left = this.parsePower();

    while (
      this.check(TokenType.MULTIPLY) ||
      this.check(TokenType.DIVIDE) ||
      this.check(TokenType.DIV) ||
      this.check(TokenType.MOD) ||
      this.check(TokenType.INT_DIVIDE) ||
      this.check(TokenType.PERCENT)
    ) {
      const line = this.current().line;
      const op = this.advance().value;
      const right = this.parsePower();
      left = { kind: "BinaryOp", op, left, right, line };
    }

    return left;
  }

  // Nível 7.5: ^ (potência) — acima de * /, associatividade direita
  private parsePower(): ASTNode {
    const base = this.parseUnary();

    if (this.check(TokenType.POWER)) {
      const line = this.current().line;
      this.advance();
      const exp = this.parsePower(); // recursão direita
      return { kind: "BinaryOp", op: "^", left: base, right: exp, line };
    }

    return base;
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

    // Identificador, chamada de função, acesso a vetor 1D ou matriz 2D
    if (this.check(TokenType.IDENTIFIER)) {
      const name = token.value;
      const line = token.line;
      this.advance();

      if (this.check(TokenType.LBRACKET)) {
        this.advance(); // consome '['
        const row = this.parseExpression();

        if (this.check(TokenType.COMMA)) {
          // 2D: m[i, j]
          this.advance(); // consome ','
          const col = this.parseExpression();
          this.expect(TokenType.RBRACKET, "Esperado ']' após índices");
          return { kind: "MatrixAccess", name, row, col, line } as MatrixAccessNode;
        }

        // 1D: v[i]
        this.expect(TokenType.RBRACKET, "Esperado ']' após índice");
        return { kind: "ArrayAccess", name, index: row, line };
      }

      // Chamada de função
      if (this.check(TokenType.LPAREN)) {
        return this.parseCallArgs(name, line);
      }

      return { kind: "Identifier", name, line };
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
      token.line,
      token.col,
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
