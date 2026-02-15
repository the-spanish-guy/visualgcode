import { KEYWORDS, Token } from "./Token";
import { TokenType } from "./TokenType";

export class LexerError extends Error {
  constructor(message: string, public line: number, public col: number) {
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

    if (this.isDigit(char))           return this.readNumber();
    if (char === '"')                  return this.readString();
    if (this.isAlpha(char))           return this.readIdentifierOrKeyword();

    // Operadores de 1 ou 2 caracteres
    switch (char) {
      case '+': this.advance(); return this.pushToken(TokenType.PLUS, "+");
      case '-': this.advance(); return this.pushToken(TokenType.MINUS, "-");
      case '*': this.advance(); return this.pushToken(TokenType.MULTIPLY, "*");
      case '/': this.advance(); return this.pushToken(TokenType.DIVIDE, "/");
      case '(': this.advance(); return this.pushToken(TokenType.LPAREN, "(");
      case ')': this.advance(); return this.pushToken(TokenType.RPAREN, ")");
      case ':': this.advance(); return this.pushToken(TokenType.COLON, ":");
      case ',': this.advance(); return this.pushToken(TokenType.COMMA, ",");
      case '=': this.advance(); return this.pushToken(TokenType.EQUAL, "=");

      case '<': return this.readLessThan();
      case '>': return this.readGreaterThan();

      default:
        throw new LexerError(`Caractere inesperado '${char}'`, this.line, this.col);
    }
  }

  private readNumber(): void {
    const startCol = this.col;
    let num = "";
    let isFloat = false;

    while (!this.isAtEnd() && this.isDigit(this.current())) {
      num += this.advance();
    }

    // Ponto decimal: 3.14
    if (!this.isAtEnd() && this.current() === "." && this.isDigit(this.peek(1))) {
      isFloat = true;
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
        console.log('awui?')
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
      value: lower, // normaliza para lowercase
      line: this.line,
      col: startCol,
    });
  }

  private readLessThan(): void {
    const startCol = this.col;
    this.advance(); // consome "<"

    if (!this.isAtEnd() && this.current() === "-") {
      this.advance(); // consome "-"
      this.tokens.push({ type: TokenType.ASSIGN, value: "<-", line: this.line, col: startCol });
      return;
    }
    if (!this.isAtEnd() && this.current() === "=") {
      this.advance();
      this.tokens.push({ type: TokenType.LESS_EQUAL, value: "<=", line: this.line, col: startCol });
      return;
    }
    if (!this.isAtEnd() && this.current() === ">") {
      this.advance();
      this.tokens.push({ type: TokenType.NOT_EQUAL, value: "<>", line: this.line, col: startCol });
      return;
    }

    this.tokens.push({ type: TokenType.LESS, value: "<", line: this.line, col: startCol });
  }

  private readGreaterThan(): void {
    const startCol = this.col;
    this.advance(); // consome ">"

    if (!this.isAtEnd() && this.current() === "=") {
      this.advance();
      this.tokens.push({ type: TokenType.GREATER_EQUAL, value: ">=", line: this.line, col: startCol });
      return;
    }

    this.tokens.push({ type: TokenType.GREATER, value: ">", line: this.line, col: startCol });
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
    return (c >= "a" && c <= "z") ||
           (c >= "A" && c <= "Z") ||
           c === "_";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}