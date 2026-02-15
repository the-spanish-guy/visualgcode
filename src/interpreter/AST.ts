// ─── Tipos base ───────────────────────────────────────────────────────────────

export type VizType = "inteiro" | "real" | "caractere" | "logico";

export type ASTNode =
  | ProgramNode
  | VarDeclarationNode
  | AssignNode
  | BinaryOpNode
  | UnaryOpNode
  | IdentifierNode
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | WriteNode
  | ReadNode
  | IfNode
  | ForNode
  | WhileNode
  | RepeatNode
  | ProcedureNode
  | FunctionNode
  | ReturnNode
  | CallNode;

// ─── Estrutura do programa ─────────────────────────────────────────────────────

export interface ProgramNode {
  kind: "Program";
  name: string;
  declarations: VarDeclarationNode[];
  body: ASTNode[];
}

export interface VarDeclarationNode {
  kind: "VarDeclaration";
  names: string[]; // várias vars podem ser declaradas juntas: a, b, c: inteiro
  type: VizType;
  line: number;
}

// ─── Comandos ──────────────────────────────────────────────────────────────────

export interface AssignNode {
  kind: "Assign";
  name: string;
  value: ASTNode;
  line: number;
}

export interface WriteNode {
  kind: "Write";
  args: ASTNode[];
  newline: boolean; // escreval = true, escreva = false
  line: number;
}

export interface ReadNode {
  kind: "Read";
  name: string;
  line: number;
}

export interface IfNode {
  kind: "If";
  condition: ASTNode;
  then: ASTNode[];
  else: ASTNode[];
  line: number;
}

export interface ForNode {
  kind: "For";
  variable: string;
  from: ASTNode;
  to: ASTNode;
  step: ASTNode | null; // passo (opcional)
  body: ASTNode[];
  line: number;
}

export interface WhileNode {
  kind: "While";
  condition: ASTNode;
  body: ASTNode[];
  line: number;
}

export interface RepeatNode {
  kind: "Repeat";
  body: ASTNode[];
  condition: ASTNode; // repita...ate <condition>
  line: number;
}

// ─── Subprogramas ──────────────────────────────────────────────────────────────

export interface ProcedureNode {
  kind: "Procedure";
  name: string;
  params: VarDeclarationNode[];
  body: ASTNode[];
  line: number;
}

export interface FunctionNode {
  kind: "Function";
  name: string;
  params: VarDeclarationNode[];
  returnType: VizType;
  body: ASTNode[];
  line: number;
}

export interface ReturnNode {
  kind: "Return";
  value: ASTNode;
  line: number;
}

export interface CallNode {
  kind: "Call";
  name: string;
  args: ASTNode[];
  line: number;
}

// ─── Expressões ────────────────────────────────────────────────────────────────

export interface BinaryOpNode {
  kind: "BinaryOp";
  op: string; // "+", "-", "*", "/", "div", "mod", "=", "<>", "<", ">", "<=", ">=", "e", "ou"
  left: ASTNode;
  right: ASTNode;
  line: number;
}

export interface UnaryOpNode {
  kind: "UnaryOp";
  op: string; // "nao", "-"
  operand: ASTNode;
  line: number;
}

export interface IdentifierNode {
  kind: "Identifier";
  name: string;
  line: number;
}

export interface NumberLiteralNode {
  kind: "NumberLiteral";
  value: number;
  line: number;
}

export interface StringLiteralNode {
  kind: "StringLiteral";
  value: string;
  line: number;
}

export interface BooleanLiteralNode {
  kind: "BooleanLiteral";
  value: boolean;
  line: number;
}
