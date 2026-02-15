import MonacoEditor, { OnChange, OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useRef } from "react";
import styles from "../styles/editor.module.css";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onCursorChange: (pos: { line: number; col: number }) => void;
}

export default function Editor({
  value, onChange, onCursorChange
}: Props) {
  const editorRef    = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef    = useRef<typeof Monaco | null>(null);
  const decorations  = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const bpDecorations = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    decorations.current   = editor.createDecorationsCollection([]);
    bpDecorations.current = editor.createDecorationsCollection([]);

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange({ line: e.position.lineNumber, col: e.position.column });
    });


    editor.focus();
  };

  const handleChange: OnChange = (val) => onChange(val ?? "");

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
        value={value}
        onChange={handleChange}
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
