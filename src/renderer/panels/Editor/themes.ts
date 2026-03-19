import type * as Monaco from "monaco-editor";

export function registerVisuAlgThemes(monaco: typeof Monaco): void {
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
      "editorHoverWidget.background": "#0d1117",
      "editorHoverWidget.border": "#f14c4c",
    },
  });

  monaco.editor.defineTheme("visualg-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "c04000", fontStyle: "bold" },
      { token: "keyword.operator", foreground: "1a6abf" },
      { token: "type", foreground: "0a7a50" },
      { token: "support.function", foreground: "8a6000" },
      { token: "constant", foreground: "7a00aa" },
      { token: "string", foreground: "1a7040" },
      { token: "number", foreground: "1a5abf" },
      { token: "number.float", foreground: "1a5abf" },
      { token: "comment", foreground: "8899aa", fontStyle: "italic" },
      { token: "operator", foreground: "556677" },
      { token: "identifier", foreground: "1a2232" },
      { token: "delimiter", foreground: "445566" },
    ],
    colors: {
      "editor.background": "#f0f4f8",
      "editor.foreground": "#1a2232",
      "editor.lineHighlightBackground": "#e4e9f0",
      "editor.selectionBackground": "#c8d8f0",
      "editorLineNumber.foreground": "#a8b4c8",
      "editorLineNumber.activeForeground": "#3a4f6a",
      "editorGutter.background": "#f0f4f8",
      "editorCursor.foreground": "#e85a1a",
      "editor.findMatchBackground": "#e85a1a44",
      "editorHoverWidget.background": "#e4e9f0",
      "editorHoverWidget.border": "#d93050",
    },
  });
}
