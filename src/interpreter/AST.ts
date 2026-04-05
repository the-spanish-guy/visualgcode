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
  | ConstDeclarationNode
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
  | SwitchNode
  | BreakNode
  | MultiReadNode
  | ClearScreenNode
  | PauseNode
  | ProcedureNode
  | FunctionNode
  | ReturnNode
  | CallNode
  | AleatorioNode
  | DebugBreakNode;

// ─── Estrutura do programa ─────────────────────────────────────────────────────

export type Declaration = VarDeclarationNode | ConstDeclarationNode | ProcedureNode | FunctionNode;

export interface ProgramNode {
  kind: "Program";
  name: string;
  declarations: Declaration[];
  body: ASTNode[];
}

export interface VarDeclarationNode {
  kind: "VarDeclaration";
  names: string[];
  type: VizType;
  byRef?: boolean;
  line: number;
}

export interface ConstDeclarationNode {
  kind: "ConstDeclaration";
  name: string;
  value: number | string | boolean;
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

export type WriteArg = {
  expr: ASTNode;
  width?: number;
  decimals?: number;
};

export interface WriteNode {
  kind: "Write";
  args: WriteArg[];
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
  condition?: ASTNode; // undefined = repita...fimrepita (sai apenas por interrompa)
  line: number;
}

export interface CaseClause {
  values: ASTNode[]; // lista de valores: "caso 1, 2, 3"
  body: ASTNode[];
}

export interface SwitchNode {
  kind: "Switch";
  expression: ASTNode;
  cases: CaseClause[];
  otherwise: ASTNode[]; // bloco outrocaso (pode ser [])
  line: number;
}

export interface BreakNode {
  kind: "Break";
  line: number;
}

export interface MultiReadNode {
  kind: "MultiRead";
  reads: ReadNode[]; // cada item é um ReadNode individual (escalar ou vetor)
  line: number;
}

export interface ClearScreenNode {
  kind: "ClearScreen";
  line: number;
}

export interface PauseNode {
  kind: "Pause";
  line: number;
}

export interface AleatorioNode {
  kind: "Aleatorio";
  active: boolean;
  min: number;
  max: number;
  line: number;
}

export interface DebugBreakNode {
  kind: "DebugBreak";
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
