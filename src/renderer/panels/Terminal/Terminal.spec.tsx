import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import Terminal from "./Terminal";

const defaults = {
  lines: [],
  errors: [],
  warnings: [],
  isRunning: false,
  waitingInput: false,
  traceSnapshots: [],
  onClear: vi.fn(),
  onClearTrace: vi.fn(),
  onInput: vi.fn(),
  onProblemClick: vi.fn(),
};

describe("Terminal", () => {
  test("aba ativa padrão é Saída", () => {
    render(<Terminal {...defaults} />);
    expect(screen.getByText("Saída").className).toMatch(/active/i);
  });

  test("troca para a aba Rastreamento ao clicar", async () => {
    render(<Terminal {...defaults} />);
    await userEvent.click(screen.getByText("Rastreamento"));
    expect(screen.getByText("Rastreamento").className).toMatch(/active/i);
  });

  test("troca para a aba Problemas ao clicar", async () => {
    render(<Terminal {...defaults} />);
    await userEvent.click(screen.getByText("Problemas"));
    expect(screen.getByText("Problemas").className).toMatch(/active/i);
  });

  test("exibe badge com contagem de snapshots de rastreamento", () => {
    const snapshots = [[{ name: "x", value: 1 }], [{ name: "x", value: 2 }]];
    render(<Terminal {...defaults} traceSnapshots={snapshots} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("exibe badge com contagem de problemas", () => {
    render(<Terminal {...defaults} errors={["[Linha 1] erro"]} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("muda automaticamente para Rastreamento quando chega o primeiro snapshot", () => {
    const { rerender } = render(<Terminal {...defaults} traceSnapshots={[]} />);
    rerender(<Terminal {...defaults} traceSnapshots={[[{ name: "x", value: 1 }]]} />);
    expect(screen.getByText("Rastreamento").className).toMatch(/active/i);
  });

  test("muda automaticamente para Problemas quando erros chegam e não está rodando", () => {
    const { rerender } = render(<Terminal {...defaults} errors={[]} isRunning={false} />);
    rerender(<Terminal {...defaults} errors={["[Linha 3] erro"]} isRunning={false} />);
    expect(screen.getByText("Problemas").className).toMatch(/active/i);
  });

  test("não muda para Problemas automaticamente quando está em execução", () => {
    const { rerender } = render(<Terminal {...defaults} errors={[]} isRunning={true} />);
    rerender(<Terminal {...defaults} errors={["[Linha 3] erro"]} isRunning={true} />);
    expect(screen.getByText("Saída").className).toMatch(/active/i);
  });

  test("exibe campo de entrada quando waitingInput=true", () => {
    render(<Terminal {...defaults} waitingInput={true} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("oculta campo de entrada quando waitingInput=false", () => {
    render(<Terminal {...defaults} waitingInput={false} />);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  test("chama onInput e limpa o campo ao pressionar Enter", async () => {
    const onInput = vi.fn();
    render(<Terminal {...defaults} waitingInput={true} onInput={onInput} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "hello{Enter}");
    expect(onInput).toHaveBeenCalledWith("hello");
    expect(input).toHaveValue("");
  });

  test("renderiza linhas de saída", () => {
    render(<Terminal {...defaults} lines={["linha 1", "linha 2"]} />);
    expect(screen.getByText("linha 1")).toBeInTheDocument();
    expect(screen.getByText("linha 2")).toBeInTheDocument();
  });

  test("renderiza linhas de erro na aba Saída", () => {
    render(<Terminal {...defaults} errors={["[Linha 5] Variável 'x' não declarada"]} />);
    expect(screen.getByText("[Linha 5] Variável 'x' não declarada")).toBeInTheDocument();
  });

  test("exibe dica do explainError para erros conhecidos na aba Saída", () => {
    // isRunning: true evita a troca automática para a aba Problemas
    render(<Terminal {...defaults} errors={["Divisão por zero na linha 3"]} isRunning={true} />);
    expect(screen.getByText(/→/)).toBeInTheDocument();
  });

  test("não exibe dica para erros desconhecidos", () => {
    render(<Terminal {...defaults} errors={["algum erro desconhecido xyz"]} isRunning={true} />);
    expect(screen.queryByText(/→/)).toBeNull();
  });

  test("exibe placeholder quando não há saída e não está rodando", () => {
    render(<Terminal {...defaults} lines={[]} isRunning={false} />);
    expect(screen.getByText(/Pressione/)).toBeInTheDocument();
  });

  test("oculta placeholder quando está em execução", () => {
    render(<Terminal {...defaults} lines={[]} isRunning={true} />);
    expect(screen.queryByText(/Pressione/)).toBeNull();
  });
});
