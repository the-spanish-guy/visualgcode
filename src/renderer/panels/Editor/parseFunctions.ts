export interface CompletionFunction {
  name: string;
  kind: "funcao" | "procedimento";
  params: { name: string; type: string; isRef: boolean }[];
  returnType?: string;
}

export function parseFunctions(code: string): CompletionFunction[] {
  const functions: CompletionFunction[] = [];
  const lines = code.split("\n");

  for (const line of lines) {
    // funcao nome(params): tipoRetorno
    const funcMatch = line.match(
      /^\s*funcao\s+([a-zA-Z_]\w*)\s*(?:\(([^)]*)\))?\s*:\s*([a-zA-Z]+)\s*$/i,
    );
    if (funcMatch) {
      const name = funcMatch[1];
      const paramsStr = funcMatch[2] ?? "";
      const returnType = funcMatch[3].toLowerCase();
      const params = parseParams(paramsStr);
      functions.push({ name, kind: "funcao", params, returnType });
      continue;
    }

    // procedimento nome(params)
    const procMatch = line.match(
      /^\s*procedimento\s+([a-zA-Z_]\w*)\s*(?:\(([^)]*)\))?\s*$/i,
    );
    if (procMatch) {
      const name = procMatch[1];
      const paramsStr = procMatch[2] ?? "";
      const params = parseParams(paramsStr);
      functions.push({ name, kind: "procedimento", params });
      continue;
    }
  }

  return functions;
}

function parseParams(
  paramsStr: string,
): { name: string; type: string; isRef: boolean }[] {
  if (!paramsStr.trim()) return [];

  const result: { name: string; type: string; isRef: boolean }[] = [];
  const parts = paramsStr.split(/[,;]/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const isRef = /^var\s+/i.test(trimmed);
    const withoutVar = trimmed.replace(/^var\s+/i, "").trim();

    const colonIdx = withoutVar.indexOf(":");
    if (colonIdx === -1) continue;

    const name = withoutVar.slice(0, colonIdx).trim();
    const type = withoutVar.slice(colonIdx + 1).trim().toLowerCase();

    if (name) result.push({ name, type, isRef });
  }

  return result;
}
