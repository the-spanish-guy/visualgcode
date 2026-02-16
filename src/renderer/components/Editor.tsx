import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef } from "react";
import styles from "../styles/Editor.module.css";
import { snippets } from "./editor";

export interface TabKey {
  id: string;
  initialContent: string;
}

interface Props {
  tabKey: TabKey;
  errors: string[];
  breakpoints: Set<number>;
  currentLine: number | null;
  onChange: (val: string) => void;
  onBreakpointsChange: (lines: number[]) => void;
  onCursorChange: (pos: { line: number; col: number }) => void;
}

export default function Editor({
  tabKey,
  errors,
  currentLine,
  breakpoints,
  onChange,
  onCursorChange,
  onBreakpointsChange,
}: Props) {
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

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    registerVisuAlgLanguage(monaco);

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

    const markers: Monaco.editor.IMarkerData[] = errors.map((err) => {
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

    monaco.editor.setModelMarkers(model, "visualg", markers);
  }, [errors]);

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
          fontSize: 14,
          lineHeight: 22,
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
      "procedimento",
      "fimprocedimento",
      "funcao",
      "fimfuncao",
      "retorne",
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

      const suggestions: Monaco.languages.CompletionItem[] = snippets(monaco, range);

      return { suggestions };
    },
  });

  /**
   * Tema customizado
   * TODO: Separar isso num arquivo de tema(s) posteriormente
   */
  monaco.editor.defineTheme("visualg-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "ff6b2b", fontStyle: "bold" },
      { token: "keyword.operator", foreground: "5ba4f5" },
      { token: "type", foreground: "3ddc97" },
      { token: "support.function", foreground: "ffd166" },
      { token: "constant", foreground: "c792ea" },
      { token: "string", foreground: "a8d8a8" },
      { token: "number", foreground: "79d4f1" },
      { token: "number.float", foreground: "79d4f1" },
      { token: "comment", foreground: "3f5068", fontStyle: "italic" },
      { token: "operator", foreground: "7a90aa" },
      { token: "identifier", foreground: "e2eaf5" },
      { token: "delimiter", foreground: "5b6d82" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#e2eaf5",
      "editor.lineHighlightBackground": "#161c2a",
      "editor.selectionBackground": "#253042",
      "editorLineNumber.foreground": "#2e3d54",
      "editorLineNumber.activeForeground": "#7a90aa",
      "editorGutter.background": "#0d1117",
      "editorCursor.foreground": "#ff6b2b",
      "editor.findMatchBackground": "#ff6b2b44",
    },
  });

  monaco.editor.setTheme("visualg-dark");
}
