import type {
  ArrayAccessNode,
  ArrayType,
  AssignNode,
  ASTNode,
  BinaryOpNode,
  BooleanLiteralNode,
  CallNode,
  ConstDeclarationNode,
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
  type: string;
  value: VizValue | RefSlot;
  readonly?: boolean;
}

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

  declare(name: string, type: string, value: VizValue | RefSlot, readonly?: boolean): void {
    this.store.set(name, { type, value, readonly });
  }

  get(name: string, line: number): Variable {
    if (this.store.has(name)) {
      const entry = this.store.get(name)!;
      // Se for ref, retorna o valor atual do ambiente do caller
      if (isRefSlot(entry.value)) {
        return { type: entry.type, value: entry.value.get() };
      }
      return entry as Variable;
    }
    if (this.parent) return this.parent.get(name, line);
    throw new RuntimeError(`Variável '${name}' não declarada`, line);
  }

  set(name: string, value: VizValue, line: number): void {
    if (this.store.has(name)) {
      const entry = this.store.get(name)!;
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
      this.parent.set(name, value, line);
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

// ─── Evaluator async ──────────────────────────────────────────────────────────

export class Evaluator {
  private globals: Environment = new Environment();
  private procedures: Map<string, ProcedureNode> = new Map();
  private functions: Map<string, FunctionNode> = new Map();
  private cancel: CancelSignal;
  private breakpoints: Set<number> = new Set();
  private callStack: string[] = [];

  constructor(
    private onOutput: (text: string) => void,
    private onInput: () => Promise<string>,
    cancelSignal?: CancelSignal,
    private onStep?: StepCallback,
    private onClearScreen?: () => void,
  ) {
    this.cancel = cancelSignal ?? new CancelSignal();
  }

  setBreakpoints(lines: number[]): void {
    this.breakpoints = new Set(lines);
  }

  // Snapshot das variáveis visíveis no momento
  private snapshot(env: Environment): VarSnapshot[] {
    // Acessa o store privado via cast — suficiente para o debug
    const store = (env as any).store as Map<string, { type: string; value: any }>;
    const result: VarSnapshot[] = [];
    store.forEach((variable, name) => {
      result.push({ name, type: variable.type, value: this.stringify(variable.value) });
    });
    return result;
  }

  async run(program: ProgramNode): Promise<void> {
    for (const decl of program.declarations) {
      if ((decl as any).kind === "Procedure") {
        this.procedures.set(
          (decl as unknown as ProcedureNode).name,
          decl as unknown as ProcedureNode,
        );
      } else if ((decl as any).kind === "Function") {
        this.functions.set((decl as unknown as FunctionNode).name, decl as unknown as FunctionNode);
      } else if ((decl as any).kind === "ConstDeclaration") {
        const c = decl as unknown as ConstDeclarationNode;
        const typeStr =
          typeof c.value === "number"
            ? Number.isInteger(c.value) ? "inteiro" : "real"
            : typeof c.value === "string"
              ? "caractere"
              : "logico";
        this.globals.declare(c.name, typeStr, c.value, true);
      } else {
        this.declareVars(decl as VarDeclarationNode, this.globals);
      }
    }
    await this.execStatements(program.body, this.globals);
  }

  // ─── Declaração de variáveis ──────────────────────────────────────────────

  private declareVars(decl: VarDeclarationNode, env: Environment): void {
    const defaultValue = this.defaultFor(decl.type);
    const typeStr = this.typeToString(decl.type);
    for (const name of decl.names) {
      env.declare(name, typeStr, defaultValue);
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
      if (isNaN(row) || isNaN(col)) throw new RuntimeError("Índices devem ser números", node.line);
      env.setMatrixElement(node.name, row, col, value, node.line);
      return;
    }

    if (node.index) {
      // 1D: v[i] <- valor
      const index = Number(await this.evalExpr(node.index, env));
      if (isNaN(index)) throw new RuntimeError("Índice deve ser um número", node.line);
      env.setArrayElement(node.name, index, value, node.line);
      return;
    }

    // Simples: x <- valor
    const variable = env.get(node.name, node.line);
    env.set(node.name, this.coerce(value, variable.type, node.line), node.line);
  }

  private async execWrite(node: WriteNode, env: Environment): Promise<void> {
    const parts = await Promise.all(node.args.map((arg) => this.evalExpr(arg, env)));
    const text = parts.map((v) => this.stringify(v)).join("") + (node.newline ? "\n" : "");
    this.onOutput(text);
  }

  private async execRead(node: ReadNode, env: Environment): Promise<void> {
    // A execução fica PAUSADA aqui até o usuário digitar no terminal.
    // A Promise só resolve quando o componente Terminal chama onInput().
    const raw = await this.onInput();

    if (this.cancel.cancelled) return;

    if (node.index && node.col) {
      // 2D: leia(m[i, j])
      const row = Number(await this.evalExpr(node.index, env));
      const col = Number(await this.evalExpr(node.col, env));
      if (isNaN(row) || isNaN(col)) throw new RuntimeError("Índices devem ser números", node.line);
      const arr = env.get(node.name, node.line).value as VizArray;
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
      if (isNaN(index)) throw new RuntimeError("Índice deve ser um número", node.line);
      const arr = env.get(node.name, node.line).value as VizArray;
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
    env.set(node.name, this.parseInput(raw, variable.type, node.line), node.line);
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
      const condition = await this.evalExpr(node.condition, env);
      if (condition) break;
    }
  }

  private async execReturn(node: ReturnNode, env: Environment): Promise<ReturnSignal> {
    return new ReturnSignal(await this.evalExpr(node.value, env));
  }

  private async execCallStatement(node: CallNode, env: Environment): Promise<void> {
    const proc = this.procedures.get(node.name);
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
        if (isNaN(index)) throw new RuntimeError("Índice deve ser um número", n.line);
        return env.getArrayElement(n.name, index, n.line);
      }

      case "MatrixAccess": {
        const n = node as MatrixAccessNode;
        const row = Number(await this.evalExpr(n.row, env));
        const col = Number(await this.evalExpr(n.col, env));
        if (isNaN(row) || isNaN(col)) throw new RuntimeError("Índices devem ser números", n.line);
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

  private async evalBinaryOp(node: BinaryOpNode, env: Environment): Promise<VizValue> {
    const left = await this.evalExpr(node.left, env);
    const right = await this.evalExpr(node.right, env);
    const line = node.line;

    switch (node.op) {
      case "+":
        if (typeof left === "string" || typeof right === "string")
          return this.stringify(left) + this.stringify(right);
        return (left as number) + (right as number);
      case "-":
        return (left as number) - (right as number);
      case "*":
        return (left as number) * (right as number);
      case "/":
        if (right === 0) throw new RuntimeError("Divisão por zero", line);
        return (left as number) / (right as number);
      case "div":
        if (right === 0) throw new RuntimeError("Divisão inteira por zero", line);
        return Math.trunc((left as number) / (right as number));
      case "mod":
        if (right === 0) throw new RuntimeError("Módulo por zero", line);
        return (left as number) % (right as number);
      case "=":
        return left === right;
      case "<>":
        return left !== right;
      case "<":
        return (left as number) < (right as number);
      case ">":
        return (left as number) > (right as number);
      case "<=":
        return (left as number) <= (right as number);
      case ">=":
        return (left as number) >= (right as number);
      case "e":
        return Boolean(left) && Boolean(right);
      case "ou":
        return Boolean(left) || Boolean(right);
      case "xou":
        return Boolean(left) !== Boolean(right);
      case "^":
        return (left as number) ** (right as number);
      case "\\\\":
        if (right === 0) throw new RuntimeError("Divisão inteira por zero", line);
        return Math.trunc((left as number) / (right as number));
      case "%":
        if (right === 0) throw new RuntimeError("Módulo por zero", line);
        return (left as number) % (right as number);
      default:
        throw new RuntimeError(`Operador desconhecido '${node.op}'`, line);
    }
  }

  private async evalUnaryOp(node: UnaryOpNode, env: Environment): Promise<VizValue> {
    const operand = await this.evalExpr(node.operand, env);
    switch (node.op) {
      case "-":
        return -(operand as number);
      case "nao":
        return !operand;
      default:
        throw new RuntimeError(`Operador unário desconhecido '${node.op}'`, node.line);
    }
  }

  private async evalFunctionCall(node: CallNode, env: Environment): Promise<VizValue> {
    const native = await this.callNative(node, env);
    if (native !== undefined) return native;

    const func = this.functions.get(node.name);
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

  private async callNative(node: CallNode, env: Environment): Promise<VizValue | undefined> {
    const args = await Promise.all(node.args.map((a) => this.evalExpr(a, env)));

    switch (node.name) {
      case "abs":
        return Math.abs(args[0] as number);
      case "int":
        return Math.trunc(args[0] as number);
      case "sqrt":
        return Math.sqrt(args[0] as number);
      case "quad":
        return (args[0] as number) ** 2;
      case "exp":
        return (args[0] as number) ** (args[1] as number);
      case "log":
        return Math.log(args[0] as number);
      case "logn":
        return Math.log10(args[0] as number);
      case "sen":
        return Math.sin(args[0] as number);
      case "cos":
        return Math.cos(args[0] as number);
      case "tan":
        return Math.tan(args[0] as number);
      case "pi":
        return Math.PI;
      case "rand":
        return Math.random();
      case "randi":
        return Math.floor(Math.random() * (args[0] as number));
      case "compr":
        return (args[0] as string).length;
      case "copia":
        return (args[0] as string).slice(
          (args[1] as number) - 1,
          (args[1] as number) - 1 + (args[2] as number),
        );
      case "maiusc":
        return (args[0] as string).toUpperCase();
      case "minusc":
        return (args[0] as string).toLowerCase();
      case "pos":
        return (args[1] as string).indexOf(args[0] as string) + 1;
      case "real":
        return parseFloat(String(args[0]));
      case "inteiro":
        return parseInt(String(args[0]), 10);
      case "caracpnum":
        return parseFloat(args[0] as string);
      case "numcarac":
        return String(args[0]);
      default:
        return undefined;
    }
  }

  // ─── Utilitários ─────────────────────────────────────────────────────────

  private async bindParams(
    params: VarDeclarationNode[],
    args: ASTNode[],
    localEnv: Environment,
    callerEnv: Environment,
    line: number,
  ): Promise<void> {
    const flat: { name: string; type: string; byRef: boolean }[] = [];
    for (const p of params) {
      if (p.kind !== "VarDeclaration") continue;
      const typeStr = this.typeToString(p.type);
      for (const name of p.names) flat.push({ name, type: typeStr, byRef: !!p.byRef });
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

  private coerce(value: VizValue, type: string, _line: number): VizValue {
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

  private parseInput(raw: string, type: string, line: number): VizValue {
    switch (type) {
      case "inteiro": {
        const n = parseInt(raw.trim(), 10);
        if (isNaN(n)) throw new RuntimeError(`Valor inválido para inteiro: '${raw}'`, line);
        return n;
      }
      case "real": {
        const n = parseFloat(raw.trim().replace(",", "."));
        if (isNaN(n)) throw new RuntimeError(`Valor inválido para real: '${raw}'`, line);
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
