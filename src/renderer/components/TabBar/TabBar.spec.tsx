import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { Tab } from "../../hooks/useTabs";
import TabBar from "./TabBar";

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: "tab-1",
    fileName: "sem_titulo.alg",
    filePath: null,
    code: "",
    isDirty: false,
    breakpoints: new Set(),
    ...overrides,
  };
}

const defaults = {
  tabs: [makeTab()],
  activeId: "tab-1",
  workspaceName: null,
  explorerOpen: false,
  onNew: vi.fn(),
  onClose: vi.fn(),
  onSwitch: vi.fn(),
  onToggleExplorer: vi.fn(),
};

describe("TabBar", () => {
  test("renderiza o nome dos arquivos nas abas", () => {
    render(<TabBar {...defaults} />);
    expect(screen.getByText("sem_titulo.alg")).toBeInTheDocument();
  });

  test("renderiza múltiplas abas", () => {
    const tabs = [
      makeTab({ id: "tab-1", fileName: "a.alg" }),
      makeTab({ id: "tab-2", fileName: "b.alg" }),
    ];
    render(<TabBar {...defaults} tabs={tabs} activeId="tab-1" />);
    expect(screen.getByText("a.alg")).toBeInTheDocument();
    expect(screen.getByText("b.alg")).toBeInTheDocument();
  });

  test("exibe indicador de dirty quando isDirty=true", () => {
    const tabs = [makeTab({ isDirty: true })];
    render(<TabBar {...defaults} tabs={tabs} />);
    expect(screen.getByTitle("Alterações não salvas")).toBeInTheDocument();
  });

  test("não exibe indicador de dirty quando isDirty=false", () => {
    render(<TabBar {...defaults} />);
    expect(screen.queryByTitle("Alterações não salvas")).toBeNull();
  });

  test("aba ativa recebe classe active", () => {
    const tabs = [
      makeTab({ id: "tab-1", fileName: "a.alg" }),
      makeTab({ id: "tab-2", fileName: "b.alg" }),
    ];
    render(<TabBar {...defaults} tabs={tabs} activeId="tab-1" />);
    const tabA = screen.getByText("a.alg").closest("div");
    const tabB = screen.getByText("b.alg").closest("div");
    expect(tabA?.className).toMatch(/active/i);
    expect(tabB?.className).not.toMatch(/active/i);
  });

  test("chama onSwitch ao clicar no nome da aba", async () => {
    const onSwitch = vi.fn();
    const tabs = [makeTab({ id: "tab-1", fileName: "test.alg" })];
    render(<TabBar {...defaults} tabs={tabs} onSwitch={onSwitch} />);
    await userEvent.click(screen.getByText("test.alg"));
    expect(onSwitch).toHaveBeenCalledWith("tab-1");
  });

  test("botão fechar chama onClose mas não onSwitch", async () => {
    const onClose = vi.fn();
    const onSwitch = vi.fn();
    render(<TabBar {...defaults} onClose={onClose} onSwitch={onSwitch} />);
    await userEvent.click(screen.getByTitle("Fechar aba"));
    expect(onClose).toHaveBeenCalledWith("tab-1");
    expect(onSwitch).not.toHaveBeenCalled();
  });

  test("exibe o nome do workspace quando fornecido", () => {
    render(<TabBar {...defaults} workspaceName="meu-projeto" />);
    expect(screen.getByText("meu-projeto")).toBeInTheDocument();
  });

  test("não exibe nome do workspace quando null", () => {
    render(<TabBar {...defaults} workspaceName={null} />);
    expect(screen.queryByText("meu-projeto")).toBeNull();
  });

  test("botão explorador tem classe open quando explorerOpen=true", () => {
    render(<TabBar {...defaults} workspaceName="proj" explorerOpen={true} />);
    expect(screen.getByTitle("Fechar explorador").className).toMatch(/explorerOpen|open/i);
  });

  test("botão explorador exibe título correto quando fechado", () => {
    render(<TabBar {...defaults} workspaceName="proj" explorerOpen={false} />);
    expect(screen.getByTitle("Abrir explorador")).toBeInTheDocument();
  });

  test("chama onToggleExplorer ao clicar no botão explorador", async () => {
    const onToggle = vi.fn();
    render(<TabBar {...defaults} onToggleExplorer={onToggle} />);
    await userEvent.click(screen.getByTitle("Abrir pasta de trabalho"));
    expect(onToggle).toHaveBeenCalled();
  });
});
