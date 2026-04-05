import { KEYWORDS, type Token } from "./Token";
import { TokenType } from "./TokenType";

export class LexerError extends Error {
  constructor(
    message: string,
    public line: number,
    public col: number,
  ) {
    super(`[Linha ${line}, Col ${col}] Erro léxico: ${message}`);
    this.name = LexerError.name;
  }
}

export class Lexer {
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;
  private tokens: Token[] = [];

  constructor(private source: string) {}

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;
      this.readNextToken();
    }

    this.tokens.push(this.makeToken(TokenType.EOF, ""));
    return this.tokens;
  }

  // ─── Leitura de tokens ─────────────────────────────────────────────────────

  private readNextToken(): void {
    const char = this.current();

    if (this.isDigit(char)) {
      this.readNumber();
      return;
    }

    if (char === '"') {
      this.readString();
      return;
    }

    if (this.isAlpha(char)) {
      this.readIdentifierOrKeyword();
      return;
    }

    // Operadores de 1 ou 2 caracteres
    switch (char) {
      case "+":
        this.advance();
        this.pushToken(TokenType.PLUS, "+");
        return;
      case "-":
        this.advance();
        this.pushToken(TokenType.MINUS, "-");
        return;
      case "*":
        this.advance();
        this.pushToken(TokenType.MULTIPLY, "*");
        return;
      case "/":
        this.advance();
        this.pushToken(TokenType.DIVIDE, "/");
        return;
      case "(":
        this.advance();
        this.pushToken(TokenType.LPAREN, "(");
        return;
      case ")":
        this.advance();
        this.pushToken(TokenType.RPAREN, ")");
        return;
      case ":":
        this.advance();
        this.pushToken(TokenType.COLON, ":");
        return;
      case ",":
        this.advance();
        this.pushToken(TokenType.COMMA, ",");
        return;
      case "[":
        this.advance();
        this.pushToken(TokenType.LBRACKET, "[");
        return;
      case "]":
        this.advance();
        this.pushToken(TokenType.RBRACKET, "]");
        return;
      case ".":
        this.readDotDot();
        return;
      case "=":
        this.advance();
        this.pushToken(TokenType.EQUAL, "=");
        return;
      case "<":
        this.readLessThan();
        return;
      case ">":
        this.readGreaterThan();
        return;
      case "^":
        this.advance();
        this.pushToken(TokenType.POWER, "^");
        return;
      case "%":
        this.advance();
        this.pushToken(TokenType.PERCENT, "%");
        return;
      case "\\":
        this.readBackslash();
        return;

      default:
        throw new LexerError(`Caractere inesperado '${char}'`, this.line, this.col);
    }
  }

  private readNumber(): void {
    const startCol = this.col;
    let num = "";

    while (!this.isAtEnd() && this.isDigit(this.current())) {
      num += this.advance();
    }

    // Ponto decimal: 3.14
    if (!this.isAtEnd() && this.current() === "." && this.isDigit(this.peek(1))) {
      num += this.advance(); // consome o "."
      while (!this.isAtEnd() && this.isDigit(this.current())) {
        num += this.advance();
      }
    }

    this.tokens.push({
      type: TokenType.NUMBER,
      value: num,
      line: this.line,
      col: startCol,
    });
  }

  private readString(): void {
    const startCol = this.col;
    this.advance(); // consome a aspa de abertura "
    let str = "";

    while (!this.isAtEnd() && this.current() !== '"') {
      if (this.current() === "\n") {
        throw new LexerError("String não fechada", this.line, this.col);
      }
      str += this.advance();
    }

    if (this.isAtEnd()) {
      throw new LexerError("String não fechada", this.line, startCol);
    }

    this.advance(); // consome a aspa de fechamento "

    this.tokens.push({
      type: TokenType.STRING,
      value: str,
      line: this.line,
      col: startCol,
    });
  }

  private readIdentifierOrKeyword(): void {
    const startCol = this.col;
    let word = "";

    while (!this.isAtEnd() && this.isAlphaNumeric(this.current())) {
      word += this.advance();
    }

    // VisuAlg é case-insensitive: "SE", "Se", "se" são iguais
    const lower = word.toLowerCase();
    const keywordType = KEYWORDS[lower];

    this.tokens.push({
      type: keywordType ?? TokenType.IDENTIFIER,
      value: keywordType ? lower : word, // keywords: lowercase; identificadores: case original
      line: this.line,
      col: startCol,
    });
  }

  private readLessThan(): void {
    const startCol = this.col;
    this.advance(); // consome "<"

    if (!this.isAtEnd() && this.current() === "-") {
      this.advance(); // consome "-"
      this.tokens.push({
        value: "<-",
        col: startCol,
        line: this.line,
        type: TokenType.ASSIGN,
      });
      return;
    }
    if (!this.isAtEnd() && this.current() === "=") {
      this.advance();
      this.tokens.push({
        value: "<=",
        col: startCol,
        line: this.line,
        type: TokenType.LESS_EQUAL,
      });
      return;
    }
    if (!this.isAtEnd() && this.current() === ">") {
      this.advance();
      this.tokens.push({
        value: "<>",
        col: startCol,
        line: this.line,
        type: TokenType.NOT_EQUAL,
      });
      return;
    }

    this.tokens.push({ type: TokenType.LESS, value: "<", line: this.line, col: startCol });
  }

  private readGreaterThan(): void {
    const startCol = this.col;
    this.advance(); // consome ">"

    if (!this.isAtEnd() && this.current() === "=") {
      this.advance();
      this.tokens.push({
        value: ">=",
        col: startCol,
        line: this.line,
        type: TokenType.GREATER_EQUAL,
      });
      return;
    }

    this.tokens.push({ type: TokenType.GREATER, value: ">", line: this.line, col: startCol });
  }

  private readBackslash(): void {
    const startCol = this.col;
    this.advance(); // consome primeiro '\'
    if (!this.isAtEnd() && this.current() === "\\") {
      this.advance(); // consome segundo '\'
      this.tokens.push({
        type: TokenType.INT_DIVIDE,
        value: "\\\\",
        line: this.line,
        col: startCol,
      });
      return;
    }
    throw new LexerError("Caractere inesperado '\\'", this.line, startCol);
  }

  private readDotDot(): void {
    const startCol = this.col;
    this.advance(); // consome "."

    if (!this.isAtEnd() && this.current() === ".") {
      this.advance(); // consome o segundo "."
      this.tokens.push({ type: TokenType.DOTDOT, value: "..", line: this.line, col: startCol });
      return;
    }

    throw new LexerError(`Era esperado '.' após '.'`, this.line, this.col);
  }

  // ─── Utilitários ───────────────────────────────────────────────────────────

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const char = this.current();

      // Espaço, tab, carriage return
      if (char === " " || char === "\t" || char === "\r") {
        this.advance();
        continue;
      }

      // Nova linha
      if (char === "\n") {
        this.line++;
        this.col = 1;
        this.pos++;
        continue;
      }

      // Comentário de linha: // até o fim da linha
      if (char === "/" && this.peek(1) === "/") {
        while (!this.isAtEnd() && this.current() !== "\n") {
          this.advance();
        }
        continue;
      }

      // Comentário de bloco: { até }
      if (char === "{") {
        this.advance();
        while (!this.isAtEnd() && this.current() !== "}") {
          if (this.current() === "\n") {
            this.line++;
            this.col = 1;
            this.pos++;
          } else {
            this.advance();
          }
        }
        if (!this.isAtEnd()) this.advance(); // consome o "}"
        continue;
      }

      break;
    }
  }

  private makeToken(type: TokenType, value: string): Token {
    return { type, value, line: this.line, col: this.col };
  }

  private pushToken(type: TokenType, value: string): void {
    this.tokens.push({ type, value, line: this.line, col: this.col });
  }

  private advance(): string {
    const char = this.source[this.pos];
    this.pos++;
    this.col++;
    return char;
  }

  private current(): string {
    return this.source[this.pos];
  }

  private peek(offset: number): string {
    return this.source[this.pos + offset] ?? "";
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(c: string): boolean {
    return c >= "0" && c <= "9";
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}
