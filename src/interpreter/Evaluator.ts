import type {
  AleatorioNode,
  ArrayAccessNode,
  ArrayType,
  AssignNode,
  ASTNode,
  BinaryOpNode,
  BooleanLiteralNode,
  CallNode,
  DebugBreakNode,
  ForNode,
  FunctionNode,
  IdentifierNode,
  IfNode,
  MatrixAccessNode,
  MultiReadNode,
  NumberLiteralNode,
  PrimitiveType,
  ProcedureNode,
  ProgramNode,
  ReadNode,
  RepeatNode,
  ReturnNode,
  StringLiteralNode,
  SwitchNode,
  UnaryOpNode,
  VarDeclarationNode,
  VizType,
  WhileNode,
  WriteArg,
  WriteNode,
} from "./AST";

// ─── Tipos de runtime ─────────────────────────────────────────────────────────

interface VizArray {
  elementType: PrimitiveType;
  // 1D
  start: number;
  size: number;
  // 2D (is2D = false → vetor 1D)
  is2D: boolean;
  rowStart: number;
  rowSize: number;
  colStart: number;
  colSize: number;
  // Armazenamento flat row-major
  // 1D: data.length === size
  // 2D: data.length === rowSize * colSize
  data: (number | string | boolean)[];
}

type VizValue = number | string | boolean | VizArray;

// Slot de referência — captura get/set do ambiente do caller(passagem por referência)
interface RefSlot {
  __isRef: true;
  get: () => VizValue;
  set: (v: VizValue) => void;
}

function isRefSlot(v: unknown): v is RefSlot {
  return typeof v === "object" && v !== null && (v as any).__isRef === true;
}

interface Variable {
  type: VizType;
  value: VizValue | RefSlot;
  readonly?: boolean;
  originalName: string;
}

type ResolvedVariable = Omit<Variable, "value"> & { value: VizValue };

class ReturnSignal {
  constructor(public value: VizValue) {}
}

class BreakSignal {}

export class RuntimeError extends Error {
  constructor(
    message: string,
    public line: number,
  ) {
    super(`[Linha ${line}] Erro de execução: ${message}`);
    this.name = "RuntimeError";
  }
}

// ─── Environment ──────────────────────────────────────────────────────────────

class Environment {
  private store: Map<string, Variable> = new Map();

  constructor(private parent: Environment | null = null) {}

  declare(name: string, type: VizType, value: VizValue | RefSlot, readonly?: boolean): void {
    this.store.set(name.toLowerCase(), { type, value, readonly, originalName: name });
  }

  getAllVariables(): Map<string, Variable> {
    return this.store;
  }

  get(name: string, line: number): ResolvedVariable {
    const key = name.toLowerCase();
    if (this.store.has(key)) {
      const entry = this.store.get(key)!;
      const value = isRefSlot(entry.value) ? entry.value.get() : entry.value;
      return { type: entry.type, value, readonly: entry.readonly, originalName: entry.originalName };
    }
    if (this.parent) return this.parent.get(key, line);
    throw new RuntimeError(`Variável '${name}' não declarada`, line);
  }

  set(name: string, value: VizValue, line: number): void {
    const key = name.toLowerCase();
    if (this.store.has(key)) {
      const entry = this.store.get(key)!;
      if (entry.readonly) {
        throw new RuntimeError(`'${name}' é uma constante e não pode ser alterada`, line);
      }
      // Se for ref, escreve diretamente no ambiente do caller
      if (isRefSlot(entry.value)) {
        entry.value.set(value);
      } else {
        entry.value = value;
      }
      return;
    }
    if (this.parent) {
      this.parent.set(key, value, line);
      return;
    }
    throw new RuntimeError(`Variável '${name}' não declarada`, line);
  }

  // ─── Acesso a vetor 1D ──────────────────────────────────────────────────────

  setArrayElement(name: string, index: number, value: VizValue, line: number): void {
    const arr = this.getArr(name, line);
    const internal = index - arr.start;
    if (internal < 0 || internal >= arr.size) {
      throw new RuntimeError(
        `Índice ${index} fora dos limites do vetor '${name}' (${arr.start}..${arr.start + arr.size - 1})`,
        line,
      );
    }
    arr.data[internal] = value as number | string | boolean;
  }

  getArrayElement(name: string, index: number, line: number): VizValue {
    const arr = this.getArr(name, line);
    const internal = index - arr.start;
    if (internal < 0 || internal >= arr.size) {
      throw new RuntimeError(
        `Índice ${index} fora dos limites do vetor '${name}' (${arr.start}..${arr.start + arr.size - 1})`,
        line,
      );
    }
    return arr.data[internal];
  }

  // ─── Acesso a matriz 2D ─────────────────────────────────────────────────────

  setMatrixElement(name: string, row: number, col: number, value: VizValue, line: number): void {
    const arr = this.getArr(name, line);
    if (!arr.is2D) throw new RuntimeError(`'${name}' não é uma matriz`, line);
    const flatIndex = this.matrixFlatIndex(arr, row, col, name, line);
    arr.data[flatIndex] = value as number | string | boolean;
  }

  getMatrixElement(name: string, row: number, col: number, line: number): VizValue {
    const arr = this.getArr(name, line);
    if (!arr.is2D) throw new RuntimeError(`'${name}' não é uma matriz`, line);
    const flatIndex = this.matrixFlatIndex(arr, row, col, name, line);
    return arr.data[flatIndex];
  }

  private matrixFlatIndex(
    arr: VizArray,
    row: number,
    col: number,
    name: string,
    line: number,
  ): number {
    const internalRow = row - arr.rowStart;
    const internalCol = col - arr.colStart;
    if (internalRow < 0 || internalRow >= arr.rowSize) {
      throw new RuntimeError(
        `Linha ${row} fora dos limites da matriz '${name}' (${arr.rowStart}..${arr.rowStart + arr.rowSize - 1})`,
        line,
      );
    }
    if (internalCol < 0 || internalCol >= arr.colSize) {
      throw new RuntimeError(
        `Coluna ${col} fora dos limites da matriz '${name}' (${arr.colStart}..${arr.colStart + arr.colSize - 1})`,
        line,
      );
    }
    return internalRow * arr.colSize + internalCol;
  }

  private getArr(name: string, line: number): VizArray {
    const variable = this.get(name, line);
    const arr = variable.value as VizArray;
    if (!arr || typeof arr !== "object" || !("data" in arr)) {
      throw new RuntimeError(`'${name}' não é um vetor ou matriz`, line);
    }
    return arr;
  }
}

// ─── Sinal de cancelamento ────────────────────────────────────────────────────
// Permite que o botão "Parar" interrompa a execução imediatamente,
// mesmo quando o programa está aguardando input do usuário.

export class CancelSignal {
  cancelled = false;
  cancel() {
    this.cancelled = true;
  }
}

// Snapshot imutável das variáveis em um dado momento
export interface VarSnapshot {
  name: string;
  type: string;
  value: string; // já stringificado para exibição
}

export type StepCallback = (
  line: number,
  vars: VarSnapshot[],
  callStack: string[],
) => Promise<void>;

export type DebugBreakCallback = (
  line: number,
  vars: VarSnapshot[],
  callStack: string[],
) => Promise<void>;

// ─── Evaluator async ──────────────────────────────────────────────────────────

export class Evaluator {
  private globals: Environment = new Environment();
  private procedures: Map<string, ProcedureNode> = new Map();
  private functions: Map<string, FunctionNode> = new Map();
  private cancel: CancelSignal;
  private callStack: string[] = [];
  private aleatorio: { min: number; max: number } | null = null;

  constructor(
    private onOutput: (text: string) => void,
    private onInput: () => Promise<string>,
    cancelSignal?: CancelSignal,
    private onStep?: StepCallback,
    private onClearScreen?: () => void,
    private onDebugBreak?: DebugBreakCallback,
  ) {
    this.cancel = cancelSignal ?? new CancelSignal();
  }

  private snapshot(env: Environment): VarSnapshot[] {
    const result: VarSnapshot[] = [];
    env.getAllVariables().forEach((variable) => {
      const value = isRefSlot(variable.value) ? variable.value.get() : variable.value;
      result.push({
        name: variable.originalName,
        type: this.typeToString(variable.type),
        value: this.stringify(value),
      });
    });
    return result;
  }

  async run(program: ProgramNode): Promise<void> {
    for (const decl of program.declarations) {
      if (decl.kind === "Procedure") {
        this.procedures.set(decl.name.toLowerCase(), decl);
      } else if (decl.kind === "Function") {
        this.functions.set(decl.name.toLowerCase(), decl);
      } else if (decl.kind === "ConstDeclaration") {
        const typeStr: PrimitiveType =
          typeof decl.value === "number"
            ? Number.isInteger(decl.value)
              ? "inteiro"
              : "real"
            : typeof decl.value === "string"
              ? "caractere"
              : "logico";
        this.globals.declare(decl.name, typeStr, decl.value, true);
      } else {
        this.declareVars(decl, this.globals);
      }
    }
    await this.execStatements(program.body, this.globals);
  }

  // ─── Declaração de variáveis ──────────────────────────────────────────────

  private declareVars(decl: VarDeclarationNode, env: Environment): void {
    const defaultValue = this.defaultFor(decl.type);
    for (const name of decl.names) {
      env.declare(name, decl.type, defaultValue);
    }
  }

  private typeToString(type: VizType): string {
    if (typeof type === "string") return type;
    const t = type as ArrayType;
    if (t.rowSize !== undefined && t.colSize !== undefined) {
      return `vetor[${t.rowStart}..${t.rowStart! + t.rowSize! - 1}, ${t.colStart}..${t.colStart! + t.colSize! - 1}] de ${t.elementType}`;
    }
    return `vetor[${t.start}..${t.start + t.size - 1}] de ${t.elementType}`;
  }

  private defaultFor(type: VizType): VizValue {
    if (typeof type === "object" && type.kind === "array") {
      const t = type as ArrayType;
      const primitiveDefault = this.defaultFor(t.elementType);

      if (t.rowSize !== undefined && t.colSize !== undefined) {
        // 2D
        return {
          elementType: t.elementType,
          start: t.start,
          size: t.size,
          is2D: true,
          rowStart: t.rowStart!,
          rowSize: t.rowSize!,
          colStart: t.colStart!,
          colSize: t.colSize!,
          data: new Array(t.rowSize * t.colSize).fill(primitiveDefault),
        } as VizArray;
      }

      // 1D
      return {
        elementType: t.elementType,
        start: t.start,
        size: t.size,
        is2D: false,
        rowStart: t.start,
        rowSize: t.size,
        colStart: 0,
        colSize: 0,
        data: new Array(t.size).fill(primitiveDefault),
      } as VizArray;
    }

    switch (type) {
      case "inteiro":
        return 0;
      case "real":
        return 0.0;
      case "caractere":
        return "";
      case "logico":
        return false;
      default:
        return 0;
    }
  }

  // ─── Execução de statements ───────────────────────────────────────────────

  private async execStatements(
    nodes: ASTNode[],
    env: Environment,
  ): Promise<void | ReturnSignal | BreakSignal> {
    for (const node of nodes) {
      if (this.cancel.cancelled) return;
      const result = await this.execStatement(node, env);
      if (result instanceof ReturnSignal) return result;
      if (result instanceof BreakSignal) return result;
    }
  }

  private async execStatement(
    node: ASTNode,
    env: Environment,
  ): Promise<void | ReturnSignal | BreakSignal> {
    if (this.cancel.cancelled) return;

    const line = (node as any).line as number | undefined;
    if (line && this.onStep) {
      await this.onStep(line, this.snapshot(env), [...this.callStack]);
      if (this.cancel.cancelled) return;
    }

    switch (node.kind) {
      case "Assign":
        return this.execAssign(node as AssignNode, env);
      case "Write":
        return this.execWrite(node as WriteNode, env);
      case "Read":
        return this.execRead(node as ReadNode, env);
      case "If":
        return this.execIf(node as IfNode, env);
      case "For":
        return this.execFor(node as ForNode, env);
      case "While":
        return this.execWhile(node as WhileNode, env);
      case "Repeat":
        return this.execRepeat(node as RepeatNode, env);
      case "Return":
        return this.execReturn(node as ReturnNode, env);
      case "Call":
        return this.execCallStatement(node as CallNode, env);
      case "Switch":
        return this.execSwitch(node as SwitchNode, env);
      case "Break":
        return new BreakSignal();
      case "MultiRead":
        return this.execMultiRead(node as MultiReadNode, env);
      case "ClearScreen":
        return this.execClearScreen();
      case "Pause":
        return this.execPause();
      case "Aleatorio":
        return this.execAleatorio(node as AleatorioNode);
      case "DebugBreak":
        return this.execDebugBreak(node as DebugBreakNode, env);
      default:
        throw new RuntimeError(`Nó desconhecido: ${(node as any).kind}`, 0);
    }
  }

  private async execAssign(node: AssignNode, env: Environment): Promise<void> {
    const value = await this.evalExpr(node.value, env);

    if (node.index && node.col) {
      // 2D: m[i, j] <- valor
      const row = Number(await this.evalExpr(node.index, env));
      const col = Number(await this.evalExpr(node.col, env));
      if (Number.isNaN(row) || Number.isNaN(col))
        throw new RuntimeError("Índices devem ser números", node.line);
      env.setMatrixElement(node.name, row, col, value, node.line);
      return;
    }

    if (node.index) {
      // 1D: v[i] <- valor
      const index = Number(await this.evalExpr(node.index, env));
      if (Number.isNaN(index)) throw new RuntimeError("Índice deve ser um número", node.line);
      env.setArrayElement(node.name, index, value, node.line);
      return;
    }

    // Simples: x <- valor
    const variable = env.get(node.name, node.line);
    env.set(node.name, this.coerce(value, variable.type, node.line), node.line);
  }

  private async execWrite(node: WriteNode, env: Environment): Promise<void> {
    const parts = await Promise.all(node.args.map((arg) => this.formatWriteArg(arg, env)));
    const text = parts.join("") + (node.newline ? "\n" : "");
    this.onOutput(text);
  }

  private async formatWriteArg(arg: WriteArg, env: Environment): Promise<string> {
    const value = await this.evalExpr(arg.expr, env);
    const raw =
      arg.decimals !== undefined ? (value as number).toFixed(arg.decimals) : this.stringify(value);
    return arg.width !== undefined ? raw.padStart(arg.width) : raw;
  }

  private async execRead(node: ReadNode, env: Environment): Promise<void> {
    if (node.index && node.col) {
      // 2D: leia(m[i, j])
      const row = Number(await this.evalExpr(node.index, env));
      const col = Number(await this.evalExpr(node.col, env));
      if (Number.isNaN(row) || Number.isNaN(col))
        throw new RuntimeError("Índices devem ser números", node.line);
      const arr = env.get(node.name, node.line).value as VizArray;
      const raw = await this.readInput(arr.elementType);
      if (this.cancel.cancelled) return;
      env.setMatrixElement(
        node.name,
        row,
        col,
        this.parseInput(raw, arr.elementType, node.line),
        node.line,
      );
      return;
    }

    if (node.index) {
      // 1D: leia(v[i])
      const index = Number(await this.evalExpr(node.index, env));
      if (Number.isNaN(index)) throw new RuntimeError("Índice deve ser um número", node.line);
      const arr = env.get(node.name, node.line).value as VizArray;
      const raw = await this.readInput(arr.elementType);
      if (this.cancel.cancelled) return;
      env.setArrayElement(
        node.name,
        index,
        this.parseInput(raw, arr.elementType, node.line),
        node.line,
      );
      return;
    }

    // Simples: leia(x)
    const variable = env.get(node.name, node.line);
    if (typeof variable.type !== "string")
      throw new RuntimeError(`Não é possível usar leia() diretamente em vetor`, node.line);
    const raw = await this.readInput(variable.type);
    if (this.cancel.cancelled) return;
    env.set(node.name, this.parseInput(raw, variable.type, node.line), node.line);
  }

  private async readInput(type: PrimitiveType): Promise<string> {
    if (this.aleatorio && type !== "logico") {
      const { min, max } = this.aleatorio;
      const generated = this.generateRandom(type, min, max);
      this.onOutput(generated + "\n");
      return generated;
    }
    return this.onInput();
  }

  private generateRandom(type: PrimitiveType, min: number, max: number): string {
    const RANDOM_STRING_LENGTH = 5;
    const CHAR_CODE_A = "A".charCodeAt(0);
    const ALPHABET_SIZE = 26;
    if (type === "caractere") {
      return Array.from({ length: RANDOM_STRING_LENGTH }, () =>
        String.fromCharCode(CHAR_CODE_A + Math.floor(Math.random() * ALPHABET_SIZE)),
      ).join("");
    }
    if (type === "real") return String(Math.random() * (max - min) + min);
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  private execAleatorio(node: AleatorioNode): void {
    this.aleatorio = node.active ? { min: node.min, max: node.max } : null;
  }

  private async execDebugBreak(node: DebugBreakNode, env: Environment): Promise<void> {
    const condition = await this.evalExpr(node.condition, env);
    if (condition !== true) return;
    if (this.onDebugBreak) {
      await this.onDebugBreak(node.line, this.snapshot(env), [...this.callStack]);
    }
  }

  private async execIf(node: IfNode, env: Environment): Promise<void | ReturnSignal | BreakSignal> {
    const condition = await this.evalExpr(node.condition, env);
    if (typeof condition !== "boolean")
      throw new RuntimeError("Condição do 'se' deve ser lógica", node.line);
    return this.execStatements(condition ? node.then : node.else, env);
  }

  private async execFor(
    node: ForNode,
    env: Environment,
  ): Promise<void | ReturnSignal | BreakSignal> {
    const from = (await this.evalExpr(node.from, env)) as number;
    const to = (await this.evalExpr(node.to, env)) as number;
    const step = node.step ? ((await this.evalExpr(node.step, env)) as number) : 1;

    env.set(node.variable, from, node.line);

    while (!this.cancel.cancelled) {
      const current = env.get(node.variable, node.line).value as number;
      if (step > 0 && current > to) break;
      if (step < 0 && current < to) break;

      const result = await this.execStatements(node.body, env);
      if (result instanceof ReturnSignal) return result;
      if (result instanceof BreakSignal) break;

      env.set(node.variable, current + step, node.line);
    }
  }

  private async execWhile(
    node: WhileNode,
    env: Environment,
  ): Promise<void | ReturnSignal | BreakSignal> {
    while (!this.cancel.cancelled) {
      const condition = await this.evalExpr(node.condition, env);
      if (!condition) break;
      const result = await this.execStatements(node.body, env);
      if (result instanceof ReturnSignal) return result;
      if (result instanceof BreakSignal) break;
    }
  }

  private async execRepeat(
    node: RepeatNode,
    env: Environment,
  ): Promise<void | ReturnSignal | BreakSignal> {
    while (!this.cancel.cancelled) {
      const result = await this.execStatements(node.body, env);
      if (result instanceof ReturnSignal) return result;
      if (result instanceof BreakSignal) break;
      if (!node.condition) continue;
      const condition = await this.evalExpr(node.condition, env);
      if (condition) break;
    }
  }

  private async execReturn(node: ReturnNode, env: Environment): Promise<ReturnSignal> {
    return new ReturnSignal(await this.evalExpr(node.value, env));
  }

  private async execCallStatement(node: CallNode, env: Environment): Promise<void> {
    const proc = this.procedures.get(node.name.toLowerCase());
    if (!proc) throw new RuntimeError(`Procedimento '${node.name}' não encontrado`, node.line);
    const localEnv = new Environment(this.globals);
    await this.bindParams(proc.params, node.args, localEnv, env, node.line);
    for (const decl of proc.locals) this.declareVars(decl, localEnv);
    this.callStack.push(node.name);
    try {
      await this.execStatements(proc.body, localEnv);
    } finally {
      this.callStack.pop();
    }
  }

  private async execSwitch(node: SwitchNode, env: Environment): Promise<void | ReturnSignal> {
    const value = await this.evalExpr(node.expression, env);

    for (const clause of node.cases) {
      for (const caseVal of clause.values) {
        const match = await this.evalExpr(caseVal, env);
        if (value === match) {
          const result = await this.execStatements(clause.body, env);
          // BreakSignal encerra o escolha sem propagar; ReturnSignal sobe
          if (result instanceof ReturnSignal) return result;
          return;
        }
      }
    }

    // Nenhum caso correspondeu — executa outrocaso se existir
    if (node.otherwise.length > 0) {
      const result = await this.execStatements(node.otherwise, env);
      if (result instanceof ReturnSignal) return result;
    }
  }

  private async execMultiRead(node: MultiReadNode, env: Environment): Promise<void> {
    for (const read of node.reads) {
      await this.execRead(read, env);
      if (this.cancel.cancelled) return;
    }
  }

  private execClearScreen(): void {
    this.onClearScreen?.();
  }

  private async execPause(): Promise<void> {
    this.onOutput("Pressione ENTER para continuar...\n");
    await this.onInput();
  }

  // ─── Avaliação de expressões ──────────────────────────────────────────────

  private async evalExpr(node: ASTNode, env: Environment): Promise<VizValue> {
    switch (node.kind) {
      case "NumberLiteral":
        return (node as NumberLiteralNode).value;
      case "StringLiteral":
        return (node as StringLiteralNode).value;
      case "BooleanLiteral":
        return (node as BooleanLiteralNode).value;
      case "Identifier":
        return env.get((node as IdentifierNode).name, (node as IdentifierNode).line).value;

      case "ArrayAccess": {
        const n = node as ArrayAccessNode;
        const index = Number(await this.evalExpr(n.index, env));
        if (Number.isNaN(index)) throw new RuntimeError("Índice deve ser um número", n.line);
        return env.getArrayElement(n.name, index, n.line);
      }

      case "MatrixAccess": {
        const n = node as MatrixAccessNode;
        const row = Number(await this.evalExpr(n.row, env));
        const col = Number(await this.evalExpr(n.col, env));
        if (Number.isNaN(row) || Number.isNaN(col))
          throw new RuntimeError("Índices devem ser números", n.line);
        return env.getMatrixElement(n.name, row, col, n.line);
      }

      case "BinaryOp":
        return this.evalBinaryOp(node as BinaryOpNode, env);
      case "UnaryOp":
        return this.evalUnaryOp(node as UnaryOpNode, env);
      case "Call":
        return this.evalFunctionCall(node as CallNode, env);
      default:
        throw new RuntimeError(`Expressão inválida: ${(node as any).kind}`, 0);
    }
  }

  private static readonly STRING_RELATIONAL_OPS: Record<string, (l: string, r: string) => boolean> = {
    "=": (l, r) => l === r,
    "<>": (l, r) => l !== r,
    "<": (l, r) => l < r,
    ">": (l, r) => l > r,
    "<=": (l, r) => l <= r,
    ">=": (l, r) => l >= r,
  };

  private static readonly BINARY_OPS: Record<
    string,
    (l: VizValue, r: VizValue, line: number) => VizValue
  > = (() => {
    const intDiv = (l: VizValue, r: VizValue, line: number): VizValue => {
      if ((r as number) === 0) throw new RuntimeError("Divisão inteira por zero", line);
      return Math.trunc((l as number) / (r as number));
    };
    const modulo = (l: VizValue, r: VizValue, line: number): VizValue => {
      if ((r as number) === 0) throw new RuntimeError("Módulo por zero", line);
      return (l as number) % (r as number);
    };
    return {
      "-": (l, r) => (l as number) - (r as number),
      "*": (l, r) => (l as number) * (r as number),
      "/": (l, r, line) => {
        if ((r as number) === 0) throw new RuntimeError("Divisão por zero", line);
        return (l as number) / (r as number);
      },
      div: intDiv,
      "\\\\": intDiv,
      mod: modulo,
      "%": modulo,
      "=": (l, r) => l === r,
      "<>": (l, r) => l !== r,
      "<": (l, r) => (l as number) < (r as number),
      ">": (l, r) => (l as number) > (r as number),
      "<=": (l, r) => (l as number) <= (r as number),
      ">=": (l, r) => (l as number) >= (r as number),
      e: (l, r) => Boolean(l) && Boolean(r),
      ou: (l, r) => Boolean(l) || Boolean(r),
      xou: (l, r) => Boolean(l) !== Boolean(r),
      "^": (l, r) => (l as number) ** (r as number),
    };
  })();

  private static readonly UNARY_OPS: Record<string, (operand: VizValue) => VizValue> = {
    "-": (operand) => -(operand as number),
    nao: (operand) => !operand,
  };

  private async evalBinaryOp(node: BinaryOpNode, env: Environment): Promise<VizValue> {
    const left = await this.evalExpr(node.left, env);
    const right = await this.evalExpr(node.right, env);
    const { op, line } = node;

    if (op === "+") {
      return typeof left === "string" || typeof right === "string"
        ? this.stringify(left) + this.stringify(right)
        : (left as number) + (right as number);
    }

    const stringOp = Evaluator.STRING_RELATIONAL_OPS[op];
    if (typeof left === "string" && typeof right === "string" && stringOp) {
      return stringOp(left.toLowerCase(), right.toLowerCase());
    }

    const handler = Evaluator.BINARY_OPS[op];
    if (!handler) throw new RuntimeError(`Operador desconhecido '${op}'`, line);
    return handler(left, right, line);
  }

  private async evalUnaryOp(node: UnaryOpNode, env: Environment): Promise<VizValue> {
    const operand = await this.evalExpr(node.operand, env);
    const handler = Evaluator.UNARY_OPS[node.op];
    if (!handler) throw new RuntimeError(`Operador unário desconhecido '${node.op}'`, node.line);
    return handler(operand);
  }

  private async evalFunctionCall(node: CallNode, env: Environment): Promise<VizValue> {
    const native = await this.callNative(node, env);
    if (native !== undefined) return native;

    const func = this.functions.get(node.name.toLowerCase());
    if (!func) throw new RuntimeError(`Função '${node.name}' não encontrada`, node.line);

    const localEnv = new Environment(this.globals);
    await this.bindParams(func.params, node.args, localEnv, env, node.line);
    for (const decl of func.locals) this.declareVars(decl, localEnv);

    this.callStack.push(node.name);
    try {
      const result = await this.execStatements(func.body, localEnv);
      if (result instanceof ReturnSignal) return result.value;
      throw new RuntimeError(`Função '${node.name}' não retornou valor`, node.line);
    } finally {
      this.callStack.pop();
    }
  }

  // ─── Funções nativas ──────────────────────────────────────────────────────

  private static readonly NATIVE_FNS: Record<string, (args: VizValue[]) => VizValue> = {
    // Numéricas e algébricas
    abs: ([x]) => Math.abs(x as number),
    int: ([x]) => Math.trunc(x as number),
    raizq: ([x]) => Math.sqrt(x as number),
    quad: ([x]) => (x as number) ** 2,
    exp: ([base, exponent]) => (base as number) ** (exponent as number),
    log: ([x]) => Math.log10(x as number),
    logn: ([x]) => Math.log(x as number),
    pi: () => Math.PI,
    rand: () => Math.random(),
    randi: ([limit]) => Math.floor(Math.random() * (limit as number)),
    // Trigonométricas
    sen: ([x]) => Math.sin(x as number),
    cos: ([x]) => Math.cos(x as number),
    tan: ([x]) => Math.tan(x as number),
    cotan: ([x]) => 1 / Math.tan(x as number),
    arcsen: ([x]) => Math.asin(x as number),
    arccos: ([x]) => Math.acos(x as number),
    arctan: ([x]) => Math.atan(x as number),
    grauprad: ([x]) => (x as number) * (Math.PI / 180),
    radpgrau: ([x]) => (x as number) * (180 / Math.PI),
    // Strings
    compr: ([s]) => (s as string).length,
    copia: ([s, start, length]) =>
      (s as string).slice((start as number) - 1, (start as number) - 1 + (length as number)),
    maiusc: ([s]) => (s as string).toUpperCase(),
    minusc: ([s]) => (s as string).toLowerCase(),
    pos: ([substring, source]) => (source as string).indexOf(substring as string) + 1,
    asc: ([s]) => (s as string).charCodeAt(0),
    carac: ([code]) => String.fromCharCode(code as number),
    // Conversão
    caracpnum: ([s]) => parseFloat(s as string),
    numpcarac: ([n]) => String(n),
  };

  private async callNative(node: CallNode, env: Environment): Promise<VizValue | undefined> {
    const nativeFn = Evaluator.NATIVE_FNS[node.name];
    if (!nativeFn) return undefined;
    const args = await Promise.all(node.args.map((a) => this.evalExpr(a, env)));
    return nativeFn(args);
  }

  // ─── Utilitários ─────────────────────────────────────────────────────────

  private async bindParams(
    params: VarDeclarationNode[],
    args: ASTNode[],
    localEnv: Environment,
    callerEnv: Environment,
    line: number,
  ): Promise<void> {
    const flat: { name: string; type: VizType; byRef: boolean }[] = [];
    for (const p of params) {
      if (p.kind !== "VarDeclaration") continue;
      for (const name of p.names) flat.push({ name, type: p.type, byRef: !!p.byRef });
    }

    if (flat.length !== args.length) {
      throw new RuntimeError(`Esperado ${flat.length} argumento(s), recebido ${args.length}`, line);
    }

    for (let i = 0; i < flat.length; i++) {
      if (flat[i].byRef) {
        // Passagem por referência: cria RefSlot apontando para a variável do caller
        const argNode = args[i];
        if (argNode.kind !== "Identifier") {
          throw new RuntimeError(
            `Parâmetro '${flat[i].name}' é por referência — o argumento deve ser uma variável simples`,
            line,
          );
        }
        const refName = (argNode as IdentifierNode).name;
        const slot: RefSlot = {
          __isRef: true,
          get: () => callerEnv.get(refName, line).value,
          set: (v) => callerEnv.set(refName, v, line),
        };
        localEnv.declare(flat[i].name, flat[i].type, slot);
      } else {
        // Passagem por valor: comportamento original
        const value = await this.evalExpr(args[i], callerEnv);
        localEnv.declare(flat[i].name, flat[i].type, value);
      }
    }
  }

  private coerce(value: VizValue, type: VizType, _line: number): VizValue {
    switch (type) {
      case "inteiro":
        return Math.trunc(value as number);
      case "real":
        return Number(value);
      case "caractere":
        return String(value);
      case "logico":
        return Boolean(value);
      default:
        return value;
    }
  }

  private stringify(value: VizValue): string {
    if (typeof value === "boolean") return value ? "VERDADEIRO" : "FALSO";
    if (typeof value === "object" && value !== null && "data" in value) {
      const arr = value as VizArray;
      if (arr.is2D) {
        const rows: string[] = [];
        for (let r = 0; r < arr.rowSize; r++) {
          const row = arr.data.slice(r * arr.colSize, (r + 1) * arr.colSize);
          rows.push(`[${row.map((v) => JSON.stringify(v)).join(", ")}]`);
        }
        return `[${rows.join(", ")}]`;
      }
      return `[${arr.data.map((v) => JSON.stringify(v)).join(", ")}]`;
    }
    return String(value);
  }

  private parseInput(raw: string, type: VizType, line: number): VizValue {
    switch (type) {
      case "inteiro": {
        const n = parseInt(raw.trim(), 10);
        if (Number.isNaN(n)) throw new RuntimeError(`Valor inválido para inteiro: '${raw}'`, line);
        return n;
      }
      case "real": {
        const n = parseFloat(raw.trim().replace(",", "."));
        if (Number.isNaN(n)) throw new RuntimeError(`Valor inválido para real: '${raw}'`, line);
        return n;
      }
      case "logico":
        return raw.trim().toLowerCase() === "verdadeiro";
      case "caractere":
        return raw;
      default:
        return raw;
    }
  }
}
