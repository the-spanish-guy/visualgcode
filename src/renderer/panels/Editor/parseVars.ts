import type { CompletionVar } from "./Editor";

export function parseConsts(code: string): CompletionVar[] {
  const consts: CompletionVar[] = [];
  const blockRe =
    /\bconstante\b([\s\S]*?)(?=\bvar\b|\bconstante\b|\bprocedimento\b|\bfuncao\b|\binicio\b|$)/gi;
  let match;
  while ((match = blockRe.exec(code)) !== null) {
    for (const line of match[1].split("\n")) {
      const m = line.match(/^\s*([a-zA-Z_]\w*)\s*=/);
      if (m) consts.push({ name: m[1].trim(), type: "constante" });
    }
  }
  return consts;
}

export function parseVars(code: string): CompletionVar[] {
  const vars: CompletionVar[] = [];

  const varBlock = code.match(/\bvar\b([\s\S]*?)\binicio\b/i);
  if (!varBlock) return vars;

  const lines = varBlock[1].split("\n");

  for (const line of lines) {
    // Matriz 2D: nome: vetor[r1..r2, c1..c2] de tipo
    const matrixMatch = line.match(
      /^\s*([a-zA-Z_][\w]*)\s*:\s*vetor\[(\d+)\.\.(\d+)\s*,\s*(\d+)\.\.(\d+)\]\s*de\s*([a-zA-Z]+)/i,
    );
    if (matrixMatch) {
      const name = matrixMatch[1].trim();
      const r1 = matrixMatch[2];
      const r2 = matrixMatch[3];
      const c1 = matrixMatch[4];
      const c2 = matrixMatch[5];
      const elementType = matrixMatch[6].toLowerCase();
      vars.push({ name, type: `vetor[${r1}..${r2}, ${c1}..${c2}] de ${elementType}` });
      continue;
    }

    // Vetor 1D: nome: vetor[1..N] de tipo
    const vetorMatch = line.match(
      /^\s*([a-zA-Z_][\w]*)\s*:\s*vetor\[(\d+)\.\.(\d+)\]\s*de\s*([a-zA-Z]+)/i,
    );
    if (vetorMatch) {
      const name = vetorMatch[1].trim();
      const start = vetorMatch[2];
      const end = vetorMatch[3];
      const elementType = vetorMatch[4].toLowerCase();
      vars.push({ name, type: `vetor[${start}..${end}] de ${elementType}` });
      continue;
    }

    // Tipo simples: nome1, nome2, nome3 : tipo
    const match = line.match(/^\s*([a-zA-Z_][\w,\s]*)\s*:\s*([a-zA-Z]+)/);
    if (!match) continue;

    const names = match[1]
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const type = match[2].toLowerCase();
    for (const name of names) {
      vars.push({ name, type });
    }
  }

  return vars;
}
