import type { CompletionVar } from "./components/Editor";

export function parseVars(code: string): CompletionVar[] {
  const vars: CompletionVar[] = [];

  const varBlock = code.match(/\bvar\b([\s\S]*?)\binicio\b/i);
  if (!varBlock) return vars;

  const lines = varBlock[1].split("\n");

  for (const line of lines) {
    // Vetor: nome: vetor[1..N] de tipo
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

    const type = match[2].toLowerCase().trim();
    const names = match[1]
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    for (const name of names) {
      if (name) vars.push({ name, type });
    }
  }

  return vars;
}
