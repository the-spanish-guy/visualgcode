import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import TraceTable from "./TraceTable";

const snap = (name: string, value: number | string) => ({
  name,
  type: "inteiro" as const,
  value: String(value),
});

describe("TraceTable", () => {
  test("exibe estado vazio quando não há snapshots", () => {
    render(<TraceTable snapshots={[]} onClear={vi.fn()} />);
    expect(screen.getByText("Inicie o debug para registrar o rastreamento")).toBeInTheDocument();
  });

  test("renderiza colunas para cada variável única", () => {
    const snapshots = [[snap("x", 1), snap("y", 2)]];
    render(<TraceTable snapshots={snapshots} onClear={vi.fn()} />);
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
  });

  test("deduplica variáveis entre snapshots", () => {
    const snapshots = [[snap("x", 1)], [snap("x", 2), snap("y", 3)]];
    render(<TraceTable snapshots={snapshots} onClear={vi.fn()} />);
    const headers = screen.getAllByRole("columnheader");
    const names = headers.map((h) => h.textContent);
    expect(names.filter((n) => n === "X")).toHaveLength(1);
    expect(names).toContain("Y");
  });

  test("numera os passos a partir de 1", () => {
    const snapshots = [[snap("x", 1)], [snap("x", 2)]];
    render(<TraceTable snapshots={snapshots} onClear={vi.fn()} />);
    const cells = screen.getAllByRole("cell");
    const stepCells = cells.filter((c) => c.textContent === "1" || c.textContent === "2");
    expect(stepCells.length).toBeGreaterThanOrEqual(2);
  });

  test("exibe travessão para variável ausente em um passo", () => {
    const snapshots = [[snap("x", 1)], [snap("x", 2), snap("y", 5)]];
    render(<TraceTable snapshots={snapshots} onClear={vi.fn()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("destaca células alteradas na última linha", () => {
    const snapshots = [[snap("x", 1)], [snap("x", 99)]];
    render(<TraceTable snapshots={snapshots} onClear={vi.fn()} />);
    expect(screen.getByText("99").className).toMatch(/changed/i);
  });

  test("não destaca células sem alteração na última linha", () => {
    const snapshots = [[snap("x", 5)], [snap("x", 5)]];
    render(<TraceTable snapshots={snapshots} onClear={vi.fn()} />);
    for (const cell of screen.getAllByText("5")) {
      expect(cell.className).not.toMatch(/changed/i);
    }
  });

  test("botão CSV escreve conteúdo correto na área de transferência", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const snapshots = [[snap("x", 1)], [snap("x", 2)]];
    render(<TraceTable snapshots={snapshots} onClear={vi.fn()} />);
    await userEvent.click(screen.getByTitle("Copiar como CSV"));
    expect(writeText).toHaveBeenCalledWith("passo,x\n1,1\n2,2");
    writeText.mockRestore();
  });

  test("exibe contagem de passos no plural", () => {
    const snapshots = [[snap("x", 1)], [snap("x", 2)]];
    render(<TraceTable snapshots={snapshots} onClear={vi.fn()} />);
    expect(screen.getByText("2 passos")).toBeInTheDocument();
  });

  test("exibe contagem de passo no singular", () => {
    render(<TraceTable snapshots={[[snap("x", 1)]]} onClear={vi.fn()} />);
    expect(screen.getByText("1 passo")).toBeInTheDocument();
  });

  test("chama onClear ao clicar no botão limpar", async () => {
    const onClear = vi.fn();
    render(<TraceTable snapshots={[[snap("x", 1)]]} onClear={onClear} />);
    await userEvent.click(screen.getByTitle("Limpar rastreamento"));
    expect(onClear).toHaveBeenCalled();
  });
});
