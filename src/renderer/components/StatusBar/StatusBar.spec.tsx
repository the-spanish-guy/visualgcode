import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useDebugStore } from "../../store/debugStore";
import { useEditorStore } from "../../store/editorStore";
import { useExecutionStore } from "../../store/executionStore";
import StatusBar from "./StatusBar";

beforeEach(() => {
  useEditorStore.setState({ cursorInfo: { line: 1, col: 1 } });
  useExecutionStore.setState({ isRunning: false, errors: [], warnings: [] });
  useDebugStore.setState({ debugMode: "idle" });
});

describe("StatusBar", () => {
  test('exibe "Pronto" quando ocioso', () => {
    render(<StatusBar />);
    expect(screen.getByText("Pronto")).toBeInTheDocument();
  });

  test('exibe "Executando..." quando em execução', () => {
    useExecutionStore.setState({ isRunning: true });
    render(<StatusBar />);
    expect(screen.getByText("Executando...")).toBeInTheDocument();
  });

  test('exibe "⬡ Depurando..." no modo de depuração', () => {
    useDebugStore.setState({ debugMode: "debugging" });
    render(<StatusBar />);
    expect(screen.getByText("⬡ Depurando...")).toBeInTheDocument();
  });

  test('exibe "⏸ Pausado" no modo pausado', () => {
    useDebugStore.setState({ debugMode: "paused" });
    render(<StatusBar />);
    expect(screen.getByText("⏸ Pausado")).toBeInTheDocument();
  });

  test("exibe Ln e Col corretamente", () => {
    useEditorStore.setState({ cursorInfo: { line: 10, col: 5 } });
    render(<StatusBar />);
    expect(screen.getByText("Ln 10, Col 5")).toBeInTheDocument();
  });

  test("exibe badge de erro no singular", () => {
    useExecutionStore.setState({ errors: ["Erro 1"] });
    render(<StatusBar />);
    expect(screen.getByText(/1 erro$/)).toBeInTheDocument();
  });

  test("exibe badge de erros no plural", () => {
    useExecutionStore.setState({ errors: ["Erro 1", "Erro 2", "Erro 3"] });
    render(<StatusBar />);
    expect(screen.getByText(/3 erros/)).toBeInTheDocument();
  });

  test("oculta badge de erros quando errors=0", () => {
    render(<StatusBar />);
    expect(screen.queryByText(/erro/)).toBeNull();
  });

  test("exibe badge de warning no singular", () => {
    useExecutionStore.setState({ warnings: [{ kind: "unused", variable: "x", line: 1, message: "w" }] });
    render(<StatusBar />);
    expect(screen.getByText(/1 warning$/)).toBeInTheDocument();
  });

  test("exibe badge de warnings no plural", () => {
    useExecutionStore.setState({ warnings: [{ kind: "unused", variable: "x", line: 1, message: "w1" }, { kind: "unused", variable: "y", line: 2, message: "w2" }] });
    render(<StatusBar />);
    expect(screen.getByText(/2 warnings/)).toBeInTheDocument();
  });

  test("oculta badge de warnings quando warnings=0", () => {
    render(<StatusBar />);
    expect(screen.queryByText(/warning/)).toBeNull();
  });

  test("exibe o label da linguagem", () => {
    render(<StatusBar />);
    expect(screen.getByText("VisuAlg")).toBeInTheDocument();
  });
});
