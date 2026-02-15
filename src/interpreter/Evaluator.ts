import type {
  ASTNode,
  AssignNode,
  BinaryOpNode,
  BooleanLiteralNode,
  CallNode,
  ForNode,
  FunctionNode,
  IdentifierNode,
  IfNode,
  NumberLiteralNode,
  ProcedureNode,
  ProgramNode,
  ReadNode,
  RepeatNode,
  ReturnNode,
  StringLiteralNode,
  UnaryOpNode,
  VarDeclarationNode,
  WhileNode,
  WriteNode,
} from "./AST";

// ─── Tipos de runtime ─────────────────────────────────────────────────────────

type VizValue = number | string | boolean;

interface Variable {
  type: string;
  value: VizValue;
}

class ReturnSignal {
  constructor(public value: VizValue) {}
}

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

  declare(name: string, type: string, value: VizValue): void {
    this.store.set(name, { type, value });
  }

  get(name: string, line: number): Variable {
    if (this.store.has(name)) return this.store.get(name)!;
    if (this.parent) return this.parent.get(name, line);
    throw new RuntimeError(`Variável '${name}' não declarada`, line);
  }

  set(name: string, value: VizValue, line: number): void {
    if (this.store.has(name)) {
      this.store.get(name)!.value = value;
      return;
    }
    if (this.parent) {
      this.parent.set(name, value, line);
      return;
    }
    throw new RuntimeError(`Variável '${name}' não declarada`, line);
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

export type StepCallback = (line: number, vars: VarSnapshot[]) => Promise<void>;

// ─── Evaluator async ──────────────────────────────────────────────────────────

export class Evaluator {
  private globals: Environment = new Environment();
  private procedures: Map<string, ProcedureNode> = new Map();
  private functions: Map<string, FunctionNode> = new Map();
  private cancel: CancelSignal;
  private breakpoints: Set<number> = new Set();

  constructor(
    private onOutput: (text: string) => void,
    private onInput: () => Promise<string>,
    cancelSignal?: CancelSignal,
    private onStep?: StepCallback,
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
      result.push({
        name,
        type: variable.type,
        value: this.stringify(variable.value),
      });
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
      } else {
        this.declareVars(decl as VarDeclarationNode, this.globals);
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

  private defaultFor(type: string): VizValue {
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

  private async execStatements(nodes: ASTNode[], env: Environment): Promise<void | ReturnSignal> {
    for (const node of nodes) {
      if (this.cancel.cancelled) return;
      const result = await this.execStatement(node, env);
      if (result instanceof ReturnSignal) return result;
    }
  }

  private async execStatement(node: ASTNode, env: Environment): Promise<void | ReturnSignal> {
    if (this.cancel.cancelled) return;

    // Pausa no debug se: modo step-by-step OU linha tem breakpoint
    const line = (node as any).line as number | undefined;
    if (line && this.onStep) {
      const isBreakpoint = this.breakpoints.has(line);
      // Sempre pausa em step-by-step; só pausa em breakpoints se não estiver em step mode
      await this.onStep(line, this.snapshot(env));
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
      default:
        throw new RuntimeError(`Nó desconhecido: ${(node as any).kind}`, 0);
    }
  }

  private async execAssign(node: AssignNode, env: Environment): Promise<void> {
    const value = await this.evalExpr(node.value, env);
    const variable = env.get(node.name, node.line);
    env.set(node.name, this.coerce(value, variable.type, node.line), node.line);
  }

  private async execWrite(node: WriteNode, env: Environment): Promise<void> {
    const parts = await Promise.all(node.args.map((arg) => this.evalExpr(arg, env)));
    const text = parts.map((v) => this.stringify(v)).join("") + (node.newline ? "\n" : "");
    this.onOutput(text);
  }

  private async execRead(node: ReadNode, env: Environment): Promise<void> {
    const variable = env.get(node.name, node.line);

    // A execução fica PAUSADA aqui até o usuário digitar no terminal.
    // A Promise só resolve quando o componente Terminal chama onInput().
    const raw = await this.onInput();

    if (this.cancel.cancelled) return;

    env.set(node.name, this.parseInput(raw, variable.type, node.line), node.line);
  }

  private async execIf(node: IfNode, env: Environment): Promise<void | ReturnSignal> {
    const condition = await this.evalExpr(node.condition, env);
    if (typeof condition !== "boolean") {
      throw new RuntimeError("Condição do 'se' deve ser lógica", node.line);
    }
    return this.execStatements(condition ? node.then : node.else, env);
  }

  private async execFor(node: ForNode, env: Environment): Promise<void | ReturnSignal> {
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

      env.set(node.variable, current + step, node.line);
    }
  }

  private async execWhile(node: WhileNode, env: Environment): Promise<void | ReturnSignal> {
    while (!this.cancel.cancelled) {
      const condition = await this.evalExpr(node.condition, env);
      if (!condition) break;
      const result = await this.execStatements(node.body, env);
      if (result instanceof ReturnSignal) return result;
    }
  }

  private async execRepeat(node: RepeatNode, env: Environment): Promise<void | ReturnSignal> {
    while (!this.cancel.cancelled) {
      const result = await this.execStatements(node.body, env);
      if (result instanceof ReturnSignal) return result;
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
    await this.execStatements(proc.body, localEnv);
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

    const result = await this.execStatements(func.body, localEnv);
    if (result instanceof ReturnSignal) return result.value;

    throw new RuntimeError(`Função '${node.name}' não retornou valor`, node.line);
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
    const flat: { name: string; type: string }[] = [];
    for (const p of params) {
      if (p.kind !== "VarDeclaration") continue;
      for (const name of p.names) flat.push({ name, type: p.type });
    }

    if (flat.length !== args.length) {
      throw new RuntimeError(`Esperado ${flat.length} argumento(s), recebido ${args.length}`, line);
    }

    for (let i = 0; i < flat.length; i++) {
      const value = await this.evalExpr(args[i], callerEnv);
      localEnv.declare(flat[i].name, flat[i].type, value);
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
