import { loader } from "@monaco-editor/react";
// @ts-expect-error — Vite resolve este subpath corretamente em runtime; o TS não encontra os tipos neste caminho ESM
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

window.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

loader.config({ monaco });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
