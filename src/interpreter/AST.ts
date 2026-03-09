// ─── Tipos base ───────────────────────────────────────────────────────────────

export type PrimitiveType = "inteiro" | "real" | "caractere" | "logico";

export interface ArrayType {
  kind: "array";
  elementType: PrimitiveType;
  // 1D
  start: number;
  size: number;
  // 2D (ausente = vetor 1D)
  rowStart?: number;
  rowSize?: number;
  colStart?: number;
  colSize?: number;
}

export type VizType = PrimitiveType | ArrayType;

export type ASTNode =
  | ProgramNode
  | VarDeclarationNode
  | AssignNode
  | BinaryOpNode
  | UnaryOpNode
  | IdentifierNode
  | ArrayAccessNode
  | MatrixAccessNode
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
  names: string[];
  type: VizType;
  line: number;
}

// ─── Comandos ──────────────────────────────────────────────────────────────────

export interface AssignNode {
  kind: "Assign";
  name: string;
  index?: ASTNode; // 1D: v[i] <- x  |  2D: m[i, j] <- x (index = linha)
  col?: ASTNode; // 2D apenas: coluna
  value: ASTNode;
  line: number;
}

export interface WriteNode {
  kind: "Write";
  args: ASTNode[];
  newline: boolean;
  line: number;
}

export interface ReadNode {
  kind: "Read";
  name: string;
  index?: ASTNode; // 1D: leia(v[i])  |  2D: leia(m[i, j]) (index = linha)
  col?: ASTNode; // 2D apenas: coluna
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
  step: ASTNode | null;
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
  condition: ASTNode;
  line: number;
}

// ─── Subprogramas ──────────────────────────────────────────────────────────────

export interface ProcedureNode {
  kind: "Procedure";
  name: string;
  params: VarDeclarationNode[];
  locals: VarDeclarationNode[];
  body: ASTNode[];
  line: number;
}

export interface FunctionNode {
  kind: "Function";
  name: string;
  params: VarDeclarationNode[];
  locals: VarDeclarationNode[];
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
  op: string;
  left: ASTNode;
  right: ASTNode;
  line: number;
}

export interface UnaryOpNode {
  kind: "UnaryOp";
  op: string;
  operand: ASTNode;
  line: number;
}

export interface IdentifierNode {
  kind: "Identifier";
  name: string;
  line: number;
}

export interface ArrayAccessNode {
  kind: "ArrayAccess";
  name: string;
  index: ASTNode;
  line: number;
}

export interface MatrixAccessNode {
  kind: "MatrixAccess";
  name: string;
  row: ASTNode;
  col: ASTNode;
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
