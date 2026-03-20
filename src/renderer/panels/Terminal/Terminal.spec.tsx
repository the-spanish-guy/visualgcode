import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useDebugStore } from "../../store/debugStore";
import { useExecutionStore } from "../../store/executionStore";
import Terminal from "./Terminal";

beforeEach(() => {
  useExecutionStore.setState({
    output: { lines: [], lineOpen: false },
    errors: [],
    warnings: [],
    isRunning: false,
    waitingInput: false,
  });
  useDebugStore.setState({ traceSnapshots: [] });
});

describe("Terminal", () => {
  test("aba ativa padrão é Saída", () => {
    render(<Terminal />);
    expect(screen.getByText("Saída").className).toMatch(/active/i);
  });

  test("troca para a aba Rastreamento ao clicar", async () => {
    render(<Terminal />);
    await userEvent.click(screen.getByText("Rastreamento"));
    expect(screen.getByText("Rastreamento").className).toMatch(/active/i);
  });

  test("troca para a aba Problemas ao clicar", async () => {
    render(<Terminal />);
    await userEvent.click(screen.getByText("Problemas"));
    expect(screen.getByText("Problemas").className).toMatch(/active/i);
  });

  test("exibe badge com contagem de snapshots de rastreamento", () => {
    useDebugStore.setState({
      traceSnapshots: [
        [{ name: "x", type: "inteiro", value: "1" }],
        [{ name: "x", type: "inteiro", value: "2" }],
      ],
    });
    render(<Terminal />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("exibe badge com contagem de problemas", () => {
    useExecutionStore.setState({ errors: ["[Linha 1] erro"] });
    render(<Terminal />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("muda automaticamente para Rastreamento quando chega o primeiro snapshot", () => {
    render(<Terminal />);
    act(() => {
      useDebugStore.setState({ traceSnapshots: [[{ name: "x", type: "inteiro", value: "1" }]] });
    });
    expect(screen.getByText("Rastreamento").className).toMatch(/active/i);
  });

  test("muda automaticamente para Problemas quando erros chegam e não está rodando", () => {
    render(<Terminal />);
    act(() => {
      useExecutionStore.setState({ errors: ["[Linha 3] erro"], isRunning: false });
    });
    expect(screen.getByText("Problemas").className).toMatch(/active/i);
  });

  test("não muda para Problemas automaticamente quando está em execução", () => {
    useExecutionStore.setState({ isRunning: true });
    render(<Terminal />);
    act(() => {
      useExecutionStore.setState({ errors: ["[Linha 3] erro"] });
    });
    expect(screen.getByText("Saída").className).toMatch(/active/i);
  });

  test("exibe campo de entrada quando waitingInput=true", () => {
    useExecutionStore.setState({ waitingInput: true });
    render(<Terminal />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("oculta campo de entrada quando waitingInput=false", () => {
    render(<Terminal />);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  test("chama handleTerminalInput e limpa o campo ao pressionar Enter", async () => {
    const handleTerminalInput = vi.fn();
    useExecutionStore.setState({ waitingInput: true, handleTerminalInput });
    render(<Terminal />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "hello{Enter}");
    expect(handleTerminalInput).toHaveBeenCalledWith("hello");
    expect(input).toHaveValue("");
  });

  test("renderiza linhas de saída", () => {
    useExecutionStore.setState({ output: { lines: ["linha 1", "linha 2"], lineOpen: false } });
    render(<Terminal />);
    expect(screen.getByText("linha 1")).toBeInTheDocument();
    expect(screen.getByText("linha 2")).toBeInTheDocument();
  });

  test("renderiza linhas de erro na aba Saída", () => {
    useExecutionStore.setState({ errors: ["[Linha 5] Variável 'x' não declarada"] });
    render(<Terminal />);
    expect(screen.getByText("[Linha 5] Variável 'x' não declarada")).toBeInTheDocument();
  });

  test("exibe dica do explainError para erros conhecidos na aba Saída", () => {
    // isRunning: true evita a troca automática para a aba Problemas
    useExecutionStore.setState({ errors: ["Divisão por zero na linha 3"], isRunning: true });
    render(<Terminal />);
    expect(screen.getByText(/→/)).toBeInTheDocument();
  });

  test("não exibe dica para erros desconhecidos", () => {
    useExecutionStore.setState({ errors: ["algum erro desconhecido xyz"], isRunning: true });
    render(<Terminal />);
    expect(screen.queryByText(/→/)).toBeNull();
  });

  test("exibe placeholder quando não há saída e não está rodando", () => {
    render(<Terminal />);
    expect(screen.getByText(/Pressione/)).toBeInTheDocument();
  });

  test("oculta placeholder quando está em execução", () => {
    useExecutionStore.setState({ isRunning: true });
    render(<Terminal />);
    expect(screen.queryByText(/Pressione/)).toBeNull();
  });
});
