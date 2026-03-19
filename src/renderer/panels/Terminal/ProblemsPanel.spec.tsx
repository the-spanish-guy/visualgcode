import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import ProblemsPanel from "./ProblemsPanel";

const noOp = vi.fn();

describe("ProblemsPanel", () => {
  test("exibe estado vazio quando não há problemas", () => {
    render(<ProblemsPanel errors={[]} warnings={[]} onProblemClick={noOp} />);
    expect(screen.getByText("Nenhum problema encontrado")).toBeInTheDocument();
  });

  test("renderiza mensagens de erro", () => {
    render(
      <ProblemsPanel
        errors={["[Linha 5] Variável 'x' não declarada"]}
        warnings={[]}
        onProblemClick={noOp}
      />,
    );
    expect(screen.getByText("[Linha 5] Variável 'x' não declarada")).toBeInTheDocument();
  });

  test("chama onProblemClick com o número da linha ao clicar em erro com linha", async () => {
    const onClick = vi.fn();
    render(
      <ProblemsPanel
        errors={["[Linha 10] Erro qualquer"]}
        warnings={[]}
        onProblemClick={onClick}
      />,
    );
    await userEvent.click(screen.getByText("[Linha 10] Erro qualquer"));
    expect(onClick).toHaveBeenCalledWith(10);
  });

  test("não chama onProblemClick quando o erro não tem número de linha", async () => {
    const onClick = vi.fn();
    render(<ProblemsPanel errors={["Erro sem linha"]} warnings={[]} onProblemClick={onClick} />);
    await userEvent.click(screen.getByText("Erro sem linha"));
    expect(onClick).not.toHaveBeenCalled();
  });

  test("renderiza warnings e eles são clicáveis", async () => {
    const onClick = vi.fn();
    render(
      <ProblemsPanel
        errors={[]}
        warnings={[{ kind: "unused", variable: "y", line: 7, message: "Variável 'y' não usada" }]}
        onProblemClick={onClick}
      />,
    );
    expect(screen.getByText("Variável 'y' não usada")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Variável 'y' não usada"));
    expect(onClick).toHaveBeenCalledWith(7);
  });

  test("exibe label de linha para erros com número de linha", () => {
    render(<ProblemsPanel errors={["[Linha 3] algum erro"]} warnings={[]} onProblemClick={noOp} />);
    expect(screen.getByText("Ln 3")).toBeInTheDocument();
  });

  test("não exibe label de linha para erros sem número de linha", () => {
    render(<ProblemsPanel errors={["Erro sem número"]} warnings={[]} onProblemClick={noOp} />);
    expect(screen.queryByText(/^Ln /)).toBeNull();
  });
});
