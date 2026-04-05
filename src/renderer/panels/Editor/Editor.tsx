import MonacoEditor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef } from "react";
import { useDebugStore } from "../../store/debugStore";
import { useEditorStore } from "../../store/editorStore";
import { useExecutionStore } from "../../store/executionStore";
import { useTabsStore } from "../../store/tabsStore";
import { getAllThemes, setMonacoInstance } from "../../themes/index";
import styles from "./Editor.module.css";
import type { CompletionFunction, CompletionVar } from "./extractFromAST";
import { extractFromAST } from "./extractFromAST";
import { snippets } from "./snippets";

// Refs globais — lidas pelo completion/signature provider que é registrado uma única vez
const completionVarsRef = { current: [] as CompletionVar[] };
const completionFunctionsRef = { current: [] as CompletionFunction[] };

export default function Editor() {
  const theme = useEditorStore((s) => s.theme);
  const fontSize = useEditorStore((s) => s.fontSize);
  const errors = useExecutionStore((s) => s.errors);
  const warnings = useExecutionStore((s) => s.warnings);
  const currentLine = useDebugStore((s) => s.currentLine);
  const { tabs, activeId } = useTabsStore();

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const tabId = activeTab.id;
  const { vars: completionVars, functions: completionFunctions } = extractFromAST(activeTab.code);

  // Atualiza refs globais a cada render — providers sempre lêem valor atual
  completionVarsRef.current = completionVars;
  completionFunctionsRef.current = completionFunctions;

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorations = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const bpDecorations = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const models = useRef<Map<string, Monaco.editor.ITextModel>>(new Map());

  const activeIdRef = useRef(tabId);
  activeIdRef.current = tabId;

  const breakpointsRef = useRef(activeTab.breakpoints);
  breakpointsRef.current = activeTab.breakpoints;

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

    const initialContent = activeTab.code;
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
    monaco.editor.setTheme(theme);
  }, [theme]);

  const handleBeforeMount: BeforeMount = (monaco) => {
    setMonacoInstance(monaco);
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    registerVisuAlgLanguage(monaco);

    const initialContent = activeTab.code;
    const uri = monaco.Uri.parse(`inmemory:///${tabId}.alg`);
    const existing = monaco.editor.getModel(uri);

    suppressChange.current = true;
    const model = existing ?? monaco.editor.createModel(initialContent, "visualg", uri);
    models.current.set(tabId, model);
    editor.setModel(model);
    suppressChange.current = false;

    decorations.current = editor.createDecorationsCollection([]);
    bpDecorations.current = editor.createDecorationsCollection([]);

    // Registra handle imperativo no store
    useEditorStore.getState().setEditorHandle({
      goToLine(line: number) {
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      },
    });

    editor.onDidChangeCursorPosition((e) => {
      useEditorStore
        .getState()
        .setCursorInfo({ line: e.position.lineNumber, col: e.position.column });
    });

    editor.onDidChangeModelContent(() => {
      if (!suppressChange.current) {
        useTabsStore.getState().updateCode(activeIdRef.current, editor.getValue());
      }
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

        useTabsStore.getState().updateBreakpoints(activeIdRef.current, Array.from(updated));
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

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();

    decorations.current.set([
      {
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: "debug-current-line",
          glyphMarginClassName: "debug-arrow",
          overviewRuler: { position: monaco.editor.OverviewRulerLane.Left, color: accent },
        },
      },
    ]);

    editor.revealLineInCenterIfOutsideViewport(currentLine);
  }, [currentLine, theme]);

  // Atualizando a decoracao dos breakpoints
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !bpDecorations.current) return;

    const red = getComputedStyle(document.documentElement).getPropertyValue("--red").trim();

    bpDecorations.current.set(
      Array.from(activeTab.breakpoints).map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: "debug-breakpoint",
          overviewRuler: { position: monaco.editor.OverviewRulerLane.Left, color: red },
        },
      })),
    );
  }, [activeTab.breakpoints, theme]);

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
        .debug-current-line { background: color-mix(in srgb, var(--accent) 12%, transparent) !important; }
        .debug-arrow::before { content: "▶"; color: var(--accent); font-size: 11px; margin-left: 2px; }
        .debug-breakpoint::before { content: "●"; color: var(--red); font-size: 13px; margin-left: 1px; }
      `}</style>
      <MonacoEditor
        height="100%"
        language="visualg"
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        theme={theme}
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
}

/**
 * Registro da linguagem no monaco editor
 * - Tokenizer para syntax highlighting
 * - Provedor de snippets para autocomplete
 * - Tema customizado
 * @param monaco
 * @returns
 */
function registerVisuAlgLanguage(monaco: typeof Monaco): void {
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
      "fimrepita",
      "aleatorio",
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
      "raizq",
      "quad",
      "exp",
      "log",
      "logn",
      "sen",
      "cos",
      "tan",
      "cotan",
      "arcsen",
      "arccos",
      "arctan",
      "grauprad",
      "radpgrau",
      "pi",
      "rand",
      "randi",
      "compr",
      "copia",
      "maiusc",
      "minusc",
      "pos",
      "asc",
      "carac",
      "caracpnum",
      "numpcarac",
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
    "retorne",
    "interrompa",
    "limpatela",
    "pausa",
    "aleatorio",
    "fimrepita",
    "var",
    "constante",
    "inicio",
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
        "inteiro",
        "real",
        "caractere",
        "logico",
      ].map((t) => ({
        label: t,
        kind: monaco.languages.CompletionItemKind.TypeParameter,
        insertText: t,
        detail: "tipo",
        range,
      }));

      // Operadores-palavra
      const operatorSuggestions: Monaco.languages.CompletionItem[] = [
        "e",
        "ou",
        "nao",
        "div",
        "mod",
      ].map((op) => ({
        label: op,
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: op,
        detail: "operador",
        range,
      }));

      // Constantes literais
      const constantSuggestions: Monaco.languages.CompletionItem[] = ["verdadeiro", "falso"].map(
        (c) => ({
          label: c,
          kind: monaco.languages.CompletionItemKind.Constant,
          insertText: c,
          detail: "constante",
          range,
        }),
      );

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
    raizq: { params: ["x: real"], returnType: "real" },
    quad: { params: ["x: real"], returnType: "real" },
    exp: { params: ["base: real", "exp: real"], returnType: "real" },
    log: { params: ["x: real"], returnType: "real" },
    logn: { params: ["x: real"], returnType: "real" },
    sen: { params: ["x: real"], returnType: "real" },
    cos: { params: ["x: real"], returnType: "real" },
    tan: { params: ["x: real"], returnType: "real" },
    cotan: { params: ["x: real"], returnType: "real" },
    arcsen: { params: ["x: real"], returnType: "real" },
    arccos: { params: ["x: real"], returnType: "real" },
    arctan: { params: ["x: real"], returnType: "real" },
    grauprad: { params: ["graus: real"], returnType: "real" },
    radpgrau: { params: ["rad: real"], returnType: "real" },
    pi: { params: [], returnType: "real" },
    rand: { params: [], returnType: "real" },
    randi: { params: ["max: inteiro"], returnType: "inteiro" },
    compr: { params: ["s: caractere"], returnType: "inteiro" },
    copia: { params: ["s: caractere", "pos: inteiro", "len: inteiro"], returnType: "caractere" },
    maiusc: { params: ["s: caractere"], returnType: "caractere" },
    minusc: { params: ["s: caractere"], returnType: "caractere" },
    pos: { params: ["sub: caractere", "s: caractere"], returnType: "inteiro" },
    asc: { params: ["s: caractere"], returnType: "inteiro" },
    carac: { params: ["codigo: inteiro"], returnType: "caractere" },
    caracpnum: { params: ["s: caractere"], returnType: "real" },
    numpcarac: { params: ["x: real"], returnType: "caractere" },
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

  for (const def of getAllThemes()) {
    monaco.editor.defineTheme(def.id, def.monaco as Monaco.editor.IStandaloneThemeData);
  }
}

function formatFnSignature(fn: CompletionFunction): string {
  const params = fn.params.map((p) => `${p.isRef ? "var " : ""}${p.name}: ${p.type}`).join(", ");
  const ret = fn.kind === "funcao" ? `: ${fn.returnType}` : "";
  return `${fn.name}(${params})${ret}`;
}
