import type { CompletionVar } from "./components/Editor";

// Extrai variáveis declaradas na seção var do código VisuAlg
// Ex: "   num, soma: inteiro" → [{name:"num", type:"inteiro"}, {name:"soma", type:"inteiro"}]
export function parseVars(code: string): CompletionVar[] {
  const vars: CompletionVar[] = [];

  // Isola o bloco entre "var" e "inicio" (case-insensitive)
  const varBlock = code.match(/\bvar\b([\s\S]*?)\binicio\b/i);
  if (!varBlock) return vars;

  const lines = varBlock[1].split("\n");

  for (const line of lines) {
    // Formato: nome1, nome2, nome3 : tipo
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
