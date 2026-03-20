import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { StaticWarning } from "../../../interpreter/StaticAnalyzer";
import styles from "./Editor.module.css";
import type { CompletionFunction } from "./extractFromAST";
import { snippets } from "./snippets";
import { registerVisuAlgThemes } from "./themes";

export interface TabKey {
  id: string;
  initialContent: string;
}

export interface CompletionVar {
  name: string;
  type: string;
}

export interface EditorHandle {
  goToLine: (line: number) => void;
}

export type { CompletionFunction };

// Refs globais — lidas pelo completion/signature provider que é registrado uma única vez
const completionVarsRef = { current: [] as CompletionVar[] };
const completionFunctionsRef = { current: [] as CompletionFunction[] };

interface Props {
  tabKey: TabKey;
  errors: string[];
  fontSize: number;
  theme: "dark" | "light";
  breakpoints: Set<number>;
  warnings: StaticWarning[];
  currentLine: number | null;
  onChange: (val: string) => void;
  completionVars: CompletionVar[];
  completionFunctions: CompletionFunction[];
  onBreakpointsChange: (lines: number[]) => void;
  onCursorChange: (pos: { line: number; col: number }) => void;
}

const Editor = forwardRef<EditorHandle, Props>(function Editor(
  {
    theme,
    tabKey,
    errors,
    warnings,
    fontSize,
    currentLine,
    breakpoints,
    completionVars,
    completionFunctions,
    onChange,
    onCursorChange,
    onBreakpointsChange,
  }: Props,
  ref,
) {
  useImperativeHandle(ref, () => ({
    goToLine(line: number) {
      const editor = editorRef.current;
      if (!editor) return;
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    },
  }));

  // Atualiza refs globais a cada render — providers sempre lêem valor atual
  completionVarsRef.current = completionVars;
  completionFunctionsRef.current = completionFunctions;
  const { id: tabId, initialContent } = tabKey;

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorations = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const bpDecorations = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const models = useRef<Map<string, Monaco.editor.ITextModel>>(new Map());

  const onChangeRef = useRef(onChange);
  const onCursorChangeRef = useRef(onCursorChange);
  const onBreakpointsChangeRef = useRef(onBreakpointsChange);
  const breakpointsRef = useRef(breakpoints);
  onChangeRef.current = onChange;
  onCursorChangeRef.current = onCursorChange;
  onBreakpointsChangeRef.current = onBreakpointsChange;

  useEffect(() => {
    breakpointsRef.current = breakpoints;
  }, [breakpoints]);

  // Suprime onChange durante operações internas do Monaco
  const suppressChange = useRef(false);

  /**
   * O monaco agora exibe o conteúdo pel model e não mais pelo value que era passado.
   * Por isso a troca de model a baixo, para garantir o conteúdo correto ao trocar de aba, sem correr o risco de closure stale.
   * Cada aba tem seu model associado pelo id da aba (tabId) e os modelos ficam armazenados num Map.
   * Na troca de aba, o model correspondente é setado no editor.
   */
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    let model = models.current.get(tabId);
    if (!model) {
      const uri = monaco.Uri.parse(`inmemory:///${tabId}.alg`);
      const stale = monaco.editor.getModel(uri);
      if (stale) stale.dispose();

      suppressChange.current = true;
      model = monaco.editor.createModel(initialContent, "visualg", uri);
      suppressChange.current = false;
      models.current.set(tabId, model);
    }

    suppressChange.current = true;
    editor.setModel(model);
    suppressChange.current = false;

    decorations.current = editor.createDecorationsCollection([]);
    bpDecorations.current = editor.createDecorationsCollection([]);
  }, [tabId]);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    monaco.editor.setTheme(theme === "light" ? "visualg-light" : "visualg-dark");
  }, [theme]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    registerVisuAlgLanguage(monaco, theme);

    const uri = monaco.Uri.parse(`inmemory:///${tabId}.alg`);
    const existing = monaco.editor.getModel(uri);

    suppressChange.current = true;
    const model = existing ?? monaco.editor.createModel(initialContent, "visualg", uri);
    models.current.set(tabId, model);
    editor.setModel(model);
    suppressChange.current = false;

    decorations.current = editor.createDecorationsCollection([]);
    bpDecorations.current = editor.createDecorationsCollection([]);

    editor.onDidChangeCursorPosition((e) => {
      onCursorChangeRef.current({ line: e.position.lineNumber, col: e.position.column });
    });

    editor.onDidChangeModelContent(() => {
      if (!suppressChange.current) onChangeRef.current(editor.getValue());
    });

    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber;
        if (!line) return;

        const updated = new Set(breakpointsRef.current);
        if (updated.has(line)) updated.delete(line);
        else updated.add(line);

        onBreakpointsChangeRef.current(Array.from(updated));
      }
    });

    editor.focus();
  };

  // Atualizando highlight da linha atual
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !decorations.current) return;

    if (currentLine === null) {
      decorations.current.clear();
      return;
    }

    decorations.current.set([
      {
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: "debug-current-line",
          glyphMarginClassName: "debug-arrow",
          overviewRulerLane: monaco.editor.OverviewRulerLane.Left,
          overviewRulerColor: "#ff6b2b",
        },
      },
    ]);

    editor.revealLineInCenterIfOutsideViewport(currentLine);
  }, [currentLine]);

  // Atualizando a decoracao dos breakpoints
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !bpDecorations.current) return;

    bpDecorations.current.set(
      Array.from(breakpoints).map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: "debug-breakpoint",
          overviewRulerLane: monaco.editor.OverviewRulerLane.Left,
          overviewRulerColor: "#ff4d6a",
        },
      })),
    );
  }, [breakpoints]);

  // Erros aparecem como markers
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const errorMarkers = errors.map((err) => {
      const match = err.match(/\[Linha (\d+)/);
      const line = match ? parseInt(match[1]) : 1;
      return {
        severity: monaco.MarkerSeverity.Error,
        message: err,
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: model.getLineMaxColumn(line),
      };
    });

    const warningMarkers = warnings.map((w) => {
      return {
        severity: monaco.MarkerSeverity.Warning,
        message: w.message,
        startColumn: 1,
        startLineNumber: w.line,
        endLineNumber: w.line,
        endColumn: 999,
        source: "Variável não usada",
      };
    });

    const markers: Monaco.editor.IMarkerData[] = [...errorMarkers, ...warningMarkers];

    monaco.editor.setModelMarkers(model, "visualg", markers);
  }, [errors, warnings]);

  // controla o tamanho da fonte
  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize });
  }, [fontSize]);

  return (
    <div className={styles.wrapper}>
      <style>{`
        .debug-current-line { background: rgba(255, 107, 43, 0.12) !important; }
        .debug-arrow::before { content: "▶"; color: #ff6b2b; font-size: 11px; margin-left: 2px; }
        .debug-breakpoint::before { content: "●"; color: #ff4d6a; font-size: 13px; margin-left: 1px; }
      `}</style>
      <MonacoEditor
        height="100%"
        language="visualg"
        onMount={handleMount}
        theme="visualg-dark"
        options={{
          fontSize,
          lineHeight: fontSize * 1.58,
          fontFamily: "'JetBrains Mono', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: "gutter",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          lineNumbers: "on",
          glyphMargin: true,
          folding: true,
          wordWrap: "off",
          tabSize: 3,
          insertSpaces: true,
          bracketPairColorization: { enabled: false },
          automaticLayout: true,
        }}
      />
    </div>
  );
});

export default Editor;

/**
 * Registro da linguagem no monaco editor
 * - Tokenizer para syntax highlighting
 * - Provedor de snippets para autocomplete
 * - Tema customizado
 * @param monaco
 * @returns
 */
function registerVisuAlgLanguage(monaco: typeof Monaco, initialTheme: "dark" | "light"): void {
  const already = monaco.languages.getLanguages().some((l) => l.id === "visualg");
  if (already) return;

  monaco.languages.register({ id: "visualg", extensions: [".alg"] });

  // Tokenizer (syntax highlighting)
  monaco.languages.setMonarchTokensProvider("visualg", {
    ignoreCase: true,
    keywords: [
      "algoritmo",
      "fimalgoritmo",
      "var",
      "inicio",
      "se",
      "entao",
      "senao",
      "fimse",
      "para",
      "de",
      "ate",
      "faca",
      "fimpara",
      "passo",
      "enquanto",
      "fimenquanto",
      "repita",
      "procedimento",
      "fimprocedimento",
      "funcao",
      "fimfuncao",
      "retorne",
      "constante",
      "e",
      "ou",
      "nao",
      "div",
      "mod",
    ],
    types: ["inteiro", "real", "caractere", "logico"],
    builtins: [
      "escreva",
      "escreval",
      "leia",
      "abs",
      "int",
      "sqrt",
      "quad",
      "exp",
      "log",
      "logn",
      "sen",
      "cos",
      "tan",
      "pi",
      "rand",
      "randi",
      "compr",
      "copia",
      "maiusc",
      "minusc",
      "pos",
      "caracpnum",
      "numcarac",
    ],
    constants: ["verdadeiro", "falso"],
    tokenizer: {
      root: [
        // Comentários
        [/\/\/.*$/, "comment"],
        [/\{/, "comment", "@comment"],
        // Strings
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string"],
        // Números
        [/\d+\.\d+/, "number.float"],
        [/\d+/, "number"],
        // Operadores
        [/<-/, "keyword.operator"],
        [/<>|<=|>=|<|>|=/, "operator"],
        [/[+\-*/]/, "operator"],
        // Identificadores e palavras-chave
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              "@keywords": "keyword",
              "@types": "type",
              "@builtins": "support.function",
              "@constants": "constant",
              "@default": "identifier",
            },
          },
        ],
        // Pontuação
        [/[(),:]/, "delimiter"],
      ],
      comment: [
        [/[^}]+/, "comment"],
        [/\}/, "comment", "@pop"],
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, "string", "@pop"],
      ],
    },
  });

  // Keywords para autocomplete
  const KEYWORDS = [
    "escreva",
    "escreval",
    "leia",
    "se",
    "entao",
    "senao",
    "fimse",
    "para",
    "de",
    "ate",
    "passo",
    "faca",
    "fimpara",
    "enquanto",
    "fimenquanto",
    "repita",
    "escolha",
    "caso",
    "outrocaso",
    "fimescolha",
    "procedimento",
    "fimprocedimento",
    "funcao",
    "fimfuncao",
    "retorne",
    "interrompa",
    "limpatela",
    "pausa",
    "var",
    "constante",
    "inicio",
    "fimalgoritmo",
    "algoritmo",
  ];

  // Autocomplete
  monaco.languages.registerCompletionItemProvider("visualg", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const localSnippets: Monaco.languages.CompletionItem[] = snippets(monaco, range);

      // Variáveis declaradas na aba atual
      const varSuggestions: Monaco.languages.CompletionItem[] = completionVarsRef.current.map(
        (v) => ({
          label: v.name,
          kind:
            v.type === "constante"
              ? monaco.languages.CompletionItemKind.Constant
              : monaco.languages.CompletionItemKind.Variable,
          insertText: v.name,
          documentation: `${v.type} ${v.name}`,
          detail: v.type,
          range,
        }),
      );

      // Funções e procedimentos declarados pelo usuário
      const fnSuggestions: Monaco.languages.CompletionItem[] = completionFunctionsRef.current.map(
        (fn) => {
          const sig = formatFnSignature(fn);
          return {
            label: fn.name,
            kind:
              fn.kind === "funcao"
                ? monaco.languages.CompletionItemKind.Function
                : monaco.languages.CompletionItemKind.Module,
            insertText: fn.name,
            detail: fn.kind === "funcao" ? `funcao → ${fn.returnType}` : "procedimento",
            documentation: sig,
            range,
          };
        },
      );

      // Keywords individuais
      const keywordSuggestions: Monaco.languages.CompletionItem[] = KEYWORDS.map((kw) => ({
        label: kw,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: kw,
        detail: "palavra-chave",
        range,
      }));

      // Tipos primitivos
      const typeSuggestions: Monaco.languages.CompletionItem[] = [
        "inteiro", "real", "caractere", "logico",
      ].map((t) => ({
        label: t,
        kind: monaco.languages.CompletionItemKind.TypeParameter,
        insertText: t,
        detail: "tipo",
        range,
      }));

      // Operadores-palavra
      const operatorSuggestions: Monaco.languages.CompletionItem[] = [
        "e", "ou", "nao", "div", "mod",
      ].map((op) => ({
        label: op,
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: op,
        detail: "operador",
        range,
      }));

      // Constantes literais
      const constantSuggestions: Monaco.languages.CompletionItem[] = [
        "verdadeiro", "falso",
      ].map((c) => ({
        label: c,
        kind: monaco.languages.CompletionItemKind.Constant,
        insertText: c,
        detail: "constante",
        range,
      }));

      // Funções built-in
      const builtinSuggestions: Monaco.languages.CompletionItem[] = Object.entries(
        BUILTIN_SIGNATURES,
      ).map(([name, sig]) => ({
        label: name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: name,
        detail: `(${sig.params.join(", ")}): ${sig.returnType}`,
        range,
      }));

      return {
        suggestions: [
          ...localSnippets,
          ...varSuggestions,
          ...fnSuggestions,
          ...keywordSuggestions,
          ...typeSuggestions,
          ...operatorSuggestions,
          ...constantSuggestions,
          ...builtinSuggestions,
        ],
      };
    },
  });

  // Assinaturas de funções nativas built-in
  const BUILTIN_SIGNATURES: Record<string, { params: string[]; returnType: string }> = {
    abs: { params: ["x: real"], returnType: "real" },
    int: { params: ["x: real"], returnType: "inteiro" },
    sqrt: { params: ["x: real"], returnType: "real" },
    quad: { params: ["x: real"], returnType: "real" },
    exp: { params: ["base: real", "exp: real"], returnType: "real" },
    log: { params: ["x: real"], returnType: "real" },
    logn: { params: ["x: real"], returnType: "real" },
    sen: { params: ["x: real"], returnType: "real" },
    cos: { params: ["x: real"], returnType: "real" },
    tan: { params: ["x: real"], returnType: "real" },
    pi: { params: [], returnType: "real" },
    rand: { params: [], returnType: "real" },
    randi: { params: ["max: inteiro"], returnType: "inteiro" },
    compr: { params: ["s: caractere"], returnType: "inteiro" },
    copia: { params: ["s: caractere", "pos: inteiro", "len: inteiro"], returnType: "caractere" },
    maiusc: { params: ["s: caractere"], returnType: "caractere" },
    minusc: { params: ["s: caractere"], returnType: "caractere" },
    pos: { params: ["sub: caractere", "s: caractere"], returnType: "inteiro" },
    caracpnum: { params: ["s: caractere"], returnType: "real" },
    numcarac: { params: ["x: real"], returnType: "caractere" },
  };

  // Signature Help
  monaco.languages.registerSignatureHelpProvider("visualg", {
    signatureHelpTriggerCharacters: ["(", ","],
    provideSignatureHelp: (model, position) => {
      const lineText = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Encontra o nome da função chamada: última palavra antes do "(" mais externo ainda aberto
      let depth = 0;
      let activeCommaIdx = -1;
      let commaCount = 0;
      for (let i = lineText.length - 1; i >= 0; i--) {
        const ch = lineText[i];
        if (ch === ")") {
          depth++;
          continue;
        }
        if (ch === "(") {
          if (depth === 0) {
            activeCommaIdx = i;
            break;
          }
          depth--;
        }
        if (ch === "," && depth === 0) commaCount++;
      }

      if (activeCommaIdx === -1) return null;

      const before = lineText.slice(0, activeCommaIdx).trimEnd();
      const fnName = before.match(/([a-zA-Z_]\w*)$/)?.[1]?.toLowerCase();
      if (!fnName) return null;

      // Procura em funções do usuário primeiro
      const userFn = completionFunctionsRef.current.find((f) => f.name.toLowerCase() === fnName);
      if (userFn) {
        const label = formatFnSignature(userFn);
        return {
          dispose: () => {},
          value: {
            signatures: [
              {
                label,
                parameters: userFn.params.map((p) => ({
                  label: `${p.isRef ? "var " : ""}${p.name}: ${p.type}`,
                })),
              },
            ],
            activeSignature: 0,
            activeParameter: Math.min(commaCount, Math.max(0, userFn.params.length - 1)),
          },
        };
      }

      // Procura nas funções nativas
      const builtin = BUILTIN_SIGNATURES[fnName];
      if (builtin) {
        const label = `${fnName}(${builtin.params.join(", ")}): ${builtin.returnType}`;
        return {
          dispose: () => {},
          value: {
            signatures: [
              {
                label,
                parameters: builtin.params.map((p) => ({ label: p })),
              },
            ],
            activeSignature: 0,
            activeParameter: Math.min(commaCount, Math.max(0, builtin.params.length - 1)),
          },
        };
      }

      return null;
    },
  });

  registerVisuAlgThemes(monaco);

  // monaco.editor.setTheme(initialTheme === "light" ? "visualg-light" : "visualg-dark");
  monaco.editor.setTheme(initialTheme === "light" ? "visualg-light" : "visualg-dark");
}

function formatFnSignature(fn: CompletionFunction): string {
  const params = fn.params.map((p) => `${p.isRef ? "var " : ""}${p.name}: ${p.type}`).join(", ");
  const ret = fn.kind === "funcao" ? `: ${fn.returnType}` : "";
  return `${fn.name}(${params})${ret}`;
}
