import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import StatusBar from "./StatusBar";

const defaults = {
  line: 1,
  col: 1,
  isRunning: false,
  errors: 0,
  warnings: 0,
  debugMode: "idle" as const,
};

describe("StatusBar", () => {
  test('exibe "Pronto" quando ocioso', () => {
    render(<StatusBar {...defaults} />);
    expect(screen.getByText("Pronto")).toBeInTheDocument();
  });

  test('exibe "Executando..." quando em execução', () => {
    render(<StatusBar {...defaults} isRunning={true} />);
    expect(screen.getByText("Executando...")).toBeInTheDocument();
  });

  test('exibe "⬡ Depurando..." no modo de depuração', () => {
    render(<StatusBar {...defaults} debugMode="debugging" />);
    expect(screen.getByText("⬡ Depurando...")).toBeInTheDocument();
  });

  test('exibe "⏸ Pausado" no modo pausado', () => {
    render(<StatusBar {...defaults} debugMode="paused" />);
    expect(screen.getByText("⏸ Pausado")).toBeInTheDocument();
  });

  test("exibe Ln e Col corretamente", () => {
    render(<StatusBar {...defaults} line={10} col={5} />);
    expect(screen.getByText("Ln 10, Col 5")).toBeInTheDocument();
  });

  test("exibe badge de erro no singular", () => {
    render(<StatusBar {...defaults} errors={1} />);
    expect(screen.getByText(/1 erro$/)).toBeInTheDocument();
  });

  test("exibe badge de erros no plural", () => {
    render(<StatusBar {...defaults} errors={3} />);
    expect(screen.getByText(/3 erros/)).toBeInTheDocument();
  });

  test("oculta badge de erros quando errors=0", () => {
    render(<StatusBar {...defaults} errors={0} />);
    expect(screen.queryByText(/erro/)).toBeNull();
  });

  test("exibe badge de warning no singular", () => {
    render(<StatusBar {...defaults} warnings={1} />);
    expect(screen.getByText(/1 warning$/)).toBeInTheDocument();
  });

  test("exibe badge de warnings no plural", () => {
    render(<StatusBar {...defaults} warnings={2} />);
    expect(screen.getByText(/2 warnings/)).toBeInTheDocument();
  });

  test("oculta badge de warnings quando warnings=0", () => {
    render(<StatusBar {...defaults} warnings={0} />);
    expect(screen.queryByText(/warning/)).toBeNull();
  });

  test("exibe o label da linguagem", () => {
    render(<StatusBar {...defaults} />);
    expect(screen.getByText("VisuAlg")).toBeInTheDocument();
  });
});
