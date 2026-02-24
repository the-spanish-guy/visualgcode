import type { ASTNode, FunctionNode, ProcedureNode, ProgramNode, VarDeclarationNode } from "./AST";

export type WarningKind = "unused";

export interface StaticWarning {
  kind: WarningKind;
  variable: string;
  line: number;
  message: string;
}

export class StaticAnalyzer {
  private warnings: StaticWarning[] = [];

  analyze(program: ProgramNode): StaticWarning[] {
    this.warnings = [];

    // Escopo global
    this.analyzeScope(program.declarations, program.body);

    // Subprogramas (o parser os coloca em declarations com kind Procedure/Function)
    for (const decl of program.declarations) {
      if (decl.kind === "Procedure" || decl.kind === "Function") {
        this.analyzeSubprogram(decl as unknown as ProcedureNode | FunctionNode);
      }
    }

    return this.warnings;
  }

  private analyzeSubprogram(node: ProcedureNode | FunctionNode): void {
    this.analyzeScope([...node.params, ...node.locals], node.body);
  }

  private analyzeScope(declarations: VarDeclarationNode[], body: ASTNode[]): void {
    const used = new Map<string, { line: number; seen: boolean }>();

    for (const decl of declarations) {
      if (decl.kind !== "VarDeclaration") continue;
      for (const name of decl.names) {
        used.set(name.toLowerCase(), { line: decl.line, seen: false });
      }
    }

    for (const stmt of body) {
      this.walkStatement(stmt, used);
    }

    // Emite warnings para variáveis não usadas
    for (const [name, info] of used) {
      if (!info.seen) {
        this.warnings.push({
          kind: "unused",
          variable: name,
          line: info.line,
          message: `A variável '${name}' foi declarada mas nunca é utilizada.`,
        });
      }
    }
  }

  private walkStatement(node: ASTNode, used: Map<string, { line: number; seen: boolean }>): void {
    switch (node.kind) {
      case "Assign":
        this.markUsed(node.name, used);
        this.walkExpr(node.value, used);
        break;

      case "Read":
        this.markUsed(node.name, used);
        break;

      case "Write":
        for (const arg of node.args) this.walkExpr(arg, used);
        break;

      case "If":
        this.walkExpr(node.condition, used);
        for (const s of node.then) this.walkStatement(s, used);
        for (const s of node.else) this.walkStatement(s, used);
        break;

      case "For":
        this.markUsed(node.variable, used);
        this.walkExpr(node.from, used);
        this.walkExpr(node.to, used);
        if (node.step) this.walkExpr(node.step, used);
        for (const s of node.body) this.walkStatement(s, used);
        break;

      case "While":
        this.walkExpr(node.condition, used);
        for (const s of node.body) this.walkStatement(s, used);
        break;

      case "Repeat":
        for (const s of node.body) this.walkStatement(s, used);
        this.walkExpr(node.condition, used);
        break;

      case "Return":
        this.walkExpr(node.value, used);
        break;

      case "Call":
        for (const arg of node.args) this.walkExpr(arg, used);
        break;

      case "Procedure":
      case "Function":
        break;

      default:
        break;
    }
  }

  private walkExpr(node: ASTNode, used: Map<string, { line: number; seen: boolean }>): void {
    switch (node.kind) {
      case "Identifier":
        this.markUsed(node.name, used);
        break;

      case "BinaryOp":
        this.walkExpr(node.left, used);
        this.walkExpr(node.right, used);
        break;

      case "UnaryOp":
        this.walkExpr(node.operand, used);
        break;

      case "Call":
        for (const arg of node.args) this.walkExpr(arg, used);
        break;

      case "NumberLiteral":
      case "StringLiteral":
      case "BooleanLiteral":
        break;

      default:
        break;
    }
  }

  private markUsed(name: string, used: Map<string, { line: number; seen: boolean }>): void {
    const entry = used.get(name.toLowerCase());
    if (entry) entry.seen = true;
  }
}

export function analyzeAST(program: ProgramNode): StaticWarning[] {
  return new StaticAnalyzer().analyze(program);
}
