import { Lexer } from '../../../interpreter/Lexer';
import { Parser } from '../../../interpreter/Parser';
import type {
  VizType,
  VarDeclarationNode,
  ConstDeclarationNode,
  ProcedureNode,
  FunctionNode,
} from '../../../interpreter/AST';

export interface CompletionVar {
  name: string;
  type: string;
}

export interface CompletionParam {
  name: string;
  type: string;
  isRef: boolean;
}

export interface CompletionFunction {
  name: string;
  kind: 'funcao' | 'procedimento';
  params: CompletionParam[];
  returnType?: string;
}

function vizTypeToString(t: VizType): string {
  if (typeof t === 'string') return t;
  if (t.rowStart !== undefined) {
    return `vetor[${t.rowStart}..${t.rowStart + t.rowSize! - 1},${t.colStart}..${t.colStart! + t.colSize! - 1}] de ${t.elementType}`;
  }
  return `vetor[${t.start}..${t.start + t.size - 1}] de ${t.elementType}`;
}

function normalizeForParsing(code: string): string {
  // Garante cabeçalho algoritmo
  let s = /^\s*algoritmo\s/i.test(code) ? code : 'algoritmo ""\n' + code;
  // Trunca no 'inicio' para não tentar parsear o corpo (pode estar incompleto)
  const m = s.match(/\binicio\b/i);
  if (m?.index !== undefined) s = s.slice(0, m.index);
  return s + '\ninicio\nfimalgoritmo';
}

export function extractFromAST(code: string): { vars: CompletionVar[]; functions: CompletionFunction[] } {
  try {
    const tokens = new Lexer(normalizeForParsing(code)).tokenize();
    const ast = new Parser(tokens).parse();

    const vars: CompletionVar[] = [];
    const functions: CompletionFunction[] = [];

    for (const decl of ast.declarations as any[]) {
      if (decl.kind === 'VarDeclaration') {
        const d = decl as VarDeclarationNode;
        for (const name of d.names) vars.push({ name, type: vizTypeToString(d.type) });
      } else if (decl.kind === 'ConstDeclaration') {
        const d = decl as ConstDeclarationNode;
        const type =
          typeof d.value === 'boolean' ? 'logico'
          : typeof d.value === 'string' ? 'caractere'
          : Number.isInteger(d.value) ? 'inteiro' : 'real';
        vars.push({ name: d.name, type });
      } else if (decl.kind === 'Procedure') {
        const d = decl as ProcedureNode;
        functions.push({
          name: d.name,
          kind: 'procedimento',
          params: d.params.flatMap(p =>
            p.names.map(name => ({ name, type: vizTypeToString(p.type), isRef: p.byRef ?? false }))
          ),
        });
      } else if (decl.kind === 'Function') {
        const d = decl as FunctionNode;
        functions.push({
          name: d.name,
          kind: 'funcao',
          params: d.params.flatMap(p =>
            p.names.map(name => ({ name, type: vizTypeToString(p.type), isRef: p.byRef ?? false }))
          ),
          returnType: vizTypeToString(d.returnType),
        });
      }
    }

    return { vars, functions };
  } catch {
    return { vars: [], functions: [] };
  }
}
