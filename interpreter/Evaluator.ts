import {
  AssignNode,
  ASTNode,
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

type VizValue = number | string | boolean;

interface Variable {
  type: string;
  value: VizValue;
}

class ReturnSignal {
  constructor(public value: VizValue) {}
}

export class RuntimeError extends Error {
  constructor(message: string, public line: number) {
    super(`[Linha ${line}] Erro de execução: ${message}`);
    this.name = RuntimeError.name;
  }
}

// ─── Environment (escopo de variáveis) ───────────────────────────────────────

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

// ─── Evaluator principal ──────────────────────────────────────────────────────

export class Evaluator {
  private globals: Environment = new Environment();
  private procedures: Map<string, ProcedureNode> = new Map();
  private functions: Map<string, FunctionNode>   = new Map();
  private output: string[] = [];

  /**
   * Callback chamado quando o programa precisa de input do usuário
   * NOTE: Por hora o readline é síncrono, se for integrar com IDE deverá alterado
   */
  constructor(
    private onOutput: (text: string) => void = (t) => process.stdout.write(t),
    private onInput:  (prompt: string) => string = () => ""
  ) {}

  run(program: ProgramNode): void {
    // 1. Registra subprogramas
    for (const decl of program.declarations) {
      if (decl.kind === "Procedure" as unknown) {
        this.procedures.set((decl as unknown as ProcedureNode).name, decl as unknown as ProcedureNode);
      } else if (decl.kind === "Function" as unknown) {
        this.functions.set((decl as unknown as FunctionNode).name, decl as unknown as FunctionNode);
      } else {
        // 2. Declara variáveis globais com valor padrão
        this.declareVars(decl as VarDeclarationNode, this.globals);
      }
    }

    // 3. Executa o corpo principal
    this.execStatements(program.body, this.globals);
  }

  private declareVars(decl: VarDeclarationNode, env: Environment): void {
    const defaultValue = this.defaultFor(decl.type);
    for (const name of decl.names) {
      env.declare(name, decl.type, defaultValue);
    }
  }

  private defaultFor(type: string): VizValue {
    switch (type) {
      case "inteiro":   return 0;
      case "real":      return 0.0;
      case "caractere": return "";
      case "logico":    return false;
      default:          return 0;
    }
  }

  private execStatements(nodes: ASTNode[], env: Environment): void | ReturnSignal {
    for (const node of nodes) {
      const result = this.execStatement(node, env);
      if (result instanceof ReturnSignal) return result;
    }
  }

  private execStatement(node: ASTNode, env: Environment): void | ReturnSignal {
    switch (node.kind) {
      case "Assign":    return this.execAssign(node, env);
      case "Write":     return this.execWrite(node, env);
      case "Read":      return this.execRead(node, env);
      case "If":        return this.execIf(node, env);
      case "For":       return this.execFor(node, env);
      case "While":     return this.execWhile(node, env);
      case "Repeat":    return this.execRepeat(node, env);
      case "Return":    return this.execReturn(node, env);
      case "Call":      return this.execCall(node, env);
      default:
        throw new RuntimeError(`Nó desconhecido: ${(node as any).kind}`, 0);
    }
  }

  private execAssign(node: AssignNode, env: Environment): void {
    const value = this.evalExpr(node.value, env);
    const variable = env.get(node.name, node.line);
    env.set(node.name, this.coerce(value, variable.type, node.line), node.line);
  }

  private execWrite(node: WriteNode, env: Environment): void {
    const parts = node.args.map(arg => this.stringify(this.evalExpr(arg, env)));
    const text = parts.join("") + (node.newline ? "\n" : "");
    this.onOutput(text);
  }

  private execRead(node: ReadNode, env: Environment): void {
    const variable = env.get(node.name, node.line);
    const raw = this.onInput("");
    env.set(node.name, this.parseInput(raw, variable.type, node.line), node.line);
  }

  private execIf(node: IfNode, env: Environment): void | ReturnSignal {
    const condition = this.evalExpr(node.condition, env);
    if (!this.isBool(condition, node.line)) {
      throw new RuntimeError("Condição do 'se' deve ser lógica", node.line);
    }
    const branch = condition ? node.then : node.else;
    return this.execStatements(branch, env);
  }

  private execFor(node: ForNode, env: Environment): void | ReturnSignal {
    const from = this.evalExpr(node.from, env) as number;
    const to   = this.evalExpr(node.to, env) as number;
    const step = node.step ? this.evalExpr(node.step, env) as number : 1;

    env.set(node.variable, from, node.line);

    while (true) {
      const current = env.get(node.variable, node.line).value as number;
      if (step > 0 && current > to) break;
      if (step < 0 && current < to) break;

      const result = this.execStatements(node.body, env);
      if (result instanceof ReturnSignal) return result;

      env.set(node.variable, current + step, node.line);
    }
  }

  private execWhile(node: WhileNode, env: Environment): void | ReturnSignal {
    while (true) {
      const condition = this.evalExpr(node.condition, env);
      if (!condition) break;

      const result = this.execStatements(node.body, env);
      if (result instanceof ReturnSignal) return result;
    }
  }

  private execRepeat(node: RepeatNode, env: Environment): void | ReturnSignal {
    while (true) {
      const result = this.execStatements(node.body, env);
      if (result instanceof ReturnSignal) return result;

      const condition = this.evalExpr(node.condition, env);
      if (condition) break; // repita...ate: para quando condição for verdadeira
    }
  }

  private execReturn(node: ReturnNode, env: Environment): ReturnSignal {
    const value = this.evalExpr(node.value, env);
    return new ReturnSignal(value);
  }

  private execCall(node: CallNode, env: Environment): void {
    const proc = this.procedures.get(node.name);
    if (!proc) throw new RuntimeError(`Procedimento '${node.name}' não encontrado`, node.line);

    const localEnv = new Environment(this.globals);
    this.bindParams(proc.params, node.args, localEnv, env, node.line);
    this.execStatements(proc.body, localEnv);
  }

  // ─── Avaliação de expressões ──────────────────────────────────────────────────

  private evalExpr(node: ASTNode, env: Environment): VizValue {
    switch (node.kind) {
      case "NumberLiteral":  return (node as NumberLiteralNode).value;
      case "StringLiteral":  return (node as StringLiteralNode).value;
      case "BooleanLiteral": return (node as BooleanLiteralNode).value;
      case "Identifier":     return env.get((node as IdentifierNode).name, (node as IdentifierNode).line).value;
      case "BinaryOp":       return this.evalBinaryOp(node as BinaryOpNode, env);
      case "UnaryOp":        return this.evalUnaryOp(node as UnaryOpNode, env);
      case "Call":           return this.evalFunctionCall(node as CallNode, env);
      default:
        throw new RuntimeError(`Expressão inválida: ${(node as any).kind}`, 0);
    }
  }

  private evalBinaryOp(node: BinaryOpNode, env: Environment): VizValue {
    const left  = this.evalExpr(node.left, env);
    const right = this.evalExpr(node.right, env);
    const line  = node.line;

    switch (node.op) {
      // Aritméticos
      case "+":
        // Se um dos lados for string, concatena
        if (typeof left === "string" || typeof right === "string") {
          return this.stringify(left) + this.stringify(right);
        }
        return (left as number) + (right as number);
      case "-":   return (left as number) - (right as number);
      case "*":   return (left as number) * (right as number);
      case "/":
        if (right === 0) throw new RuntimeError("Divisão por zero", line);
        return (left as number) / (right as number);
      case "div":
        if (right === 0) throw new RuntimeError("Divisão inteira por zero", line);
        return Math.trunc((left as number) / (right as number));
      case "mod":
        if (right === 0) throw new RuntimeError("Módulo por zero", line);
        return (left as number) % (right as number);

      // Relacionais
      case "=":  return left === right;
      case "<>": return left !== right;
      case "<":  return (left as number) < (right as number);
      case ">":  return (left as number) > (right as number);
      case "<=": return (left as number) <= (right as number);
      case ">=": return (left as number) >= (right as number);

      // Lógicos
      case "e":  return Boolean(left) && Boolean(right);
      case "ou": return Boolean(left) || Boolean(right);

      default:
        throw new RuntimeError(`Operador desconhecido '${node.op}'`, line);
    }
  }

  private evalUnaryOp(node: UnaryOpNode, env: Environment): VizValue {
    const operand = this.evalExpr(node.operand, env);
    switch (node.op) {
      case "-":   return -(operand as number);
      case "nao": return !operand;
      default:
        throw new RuntimeError(`Operador unário desconhecido '${node.op}'`, node.line);
    }
  }

  private evalFunctionCall(node: CallNode, env: Environment): VizValue {
    // Funções nativas do VisuAlg
    const native = this.callNative(node, env);
    if (native !== undefined) return native;

    // Funções definidas pelo usuário
    const func = this.functions.get(node.name);
    if (!func) throw new RuntimeError(`Função '${node.name}' não encontrada`, node.line);

    const localEnv = new Environment(this.globals);
    this.bindParams(func.params, node.args, localEnv, env, node.line);

    const result = this.execStatements(func.body, localEnv);
    if (result instanceof ReturnSignal) return result.value;

    throw new RuntimeError(`Função '${node.name}' não retornou valor`, node.line);
  }

  // ─── Funções nativas ──────────────────────────────────────────────────────────

  private callNative(node: CallNode, env: Environment): VizValue | undefined {
    const args = node.args.map(a => this.evalExpr(a, env));

    switch (node.name) {
      case "abs":      return Math.abs(args[0] as number);
      case "int":      return Math.trunc(args[0] as number);
      case "sqrt":     return Math.sqrt(args[0] as number);
      case "quad":     return Math.pow(args[0] as number, 2);
      case "exp":      return Math.pow(args[0] as number, args[1] as number);
      case "log":      return Math.log(args[0] as number);
      case "logn":     return Math.log10(args[0] as number);
      case "sen":      return Math.sin(args[0] as number);
      case "cos":      return Math.cos(args[0] as number);
      case "tan":      return Math.tan(args[0] as number);
      case "pi":       return Math.PI;
      case "rand":     return Math.random();
      case "randi":    return Math.floor(Math.random() * (args[0] as number));
      case "compr":    return (args[0] as string).length;
      case "copia":    return (args[0] as string).slice((args[1] as number) - 1, (args[1] as number) - 1 + (args[2] as number));
      case "maiusc":   return (args[0] as string).toUpperCase();
      case "minusc":   return (args[0] as string).toLowerCase();
      case "pos":      return (args[1] as string).indexOf(args[0] as string) + 1;
      case "real":     return parseFloat(String(args[0]));
      case "inteiro":  return parseInt(String(args[0]), 10);
      case "caracpnum": return parseFloat(args[0] as string);
      case "numcarac":  return String(args[0]);
      default:         return undefined;
    }
  }

  // ─── Utilitários ─────────────────────────────────────────────────────────────

  private bindParams(
    params: VarDeclarationNode[],
    args: ASTNode[],
    localEnv: Environment,
    callerEnv: Environment,
    line: number
  ): void {
    // Achata params (cada VarDeclarationNode pode ter múltiplos nomes)
    const flatParams: { name: string; type: string }[] = [];
    for (const p of params) {
      if (p.kind !== "VarDeclaration") continue;
      for (const name of p.names) {
        flatParams.push({ name, type: p.type });
      }
    }

    if (flatParams.length !== args.length) {
      throw new RuntimeError(
        `Esperado ${flatParams.length} argumento(s), recebido ${args.length}`,
        line
      );
    }

    for (let i = 0; i < flatParams.length; i++) {
      const value = this.evalExpr(args[i], callerEnv);
      localEnv.declare(flatParams[i].name, flatParams[i].type, value);
    }
  }

  private coerce(value: VizValue, type: string, line: number): VizValue {
    switch (type) {
      case "inteiro":   return Math.trunc(value as number);
      case "real":      return Number(value);
      case "caractere": return String(value);
      case "logico":    return Boolean(value);
      default:          return value;
    }
  }

  private stringify(value: VizValue): string {
    if (typeof value === "boolean") return value ? "VERDADEIRO" : "FALSO";
    return String(value);
  }

  private parseInput(raw: string, type: string, line: number): VizValue {
    switch (type) {
      case "inteiro":   {
        const n = parseInt(raw.trim(), 10);
        if (isNaN(n)) throw new RuntimeError(`Valor inválido para inteiro: '${raw}'`, line);
        return n;
      }
      case "real":      {
        const n = parseFloat(raw.trim().replace(",", "."));
        if (isNaN(n)) throw new RuntimeError(`Valor inválido para real: '${raw}'`, line);
        return n;
      }
      case "logico":    return raw.trim().toLowerCase() === "verdadeiro";
      case "caractere": return raw;
      default:          return raw;
    }
  }

  private isBool(value: VizValue, line: number): boolean {
    return typeof value === "boolean";
  }
}