import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createTab, useTabsStore } from "../../store/tabsStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import TabBar from "./TabBar";

function resetStores() {
  const tab = createTab({ id: "tab-1", fileName: "sem_titulo.alg" });
  useTabsStore.setState({ tabs: [tab], activeId: "tab-1" });
  useWorkspaceStore.setState({ workspace: null, explorerOpen: false });
}

beforeEach(resetStores);

describe("TabBar", () => {
  test("renderiza o nome dos arquivos nas abas", () => {
    render(<TabBar />);
    expect(screen.getByText("sem_titulo.alg")).toBeInTheDocument();
  });

  test("renderiza múltiplas abas", () => {
    useTabsStore.setState({
      tabs: [
        createTab({ id: "tab-1", fileName: "a.alg" }),
        createTab({ id: "tab-2", fileName: "b.alg" }),
      ],
      activeId: "tab-1",
    });
    render(<TabBar />);
    expect(screen.getByText("a.alg")).toBeInTheDocument();
    expect(screen.getByText("b.alg")).toBeInTheDocument();
  });

  test("exibe indicador de dirty quando isDirty=true", () => {
    useTabsStore.setState({
      tabs: [createTab({ id: "tab-1", isDirty: true })],
      activeId: "tab-1",
    });
    render(<TabBar />);
    expect(screen.getByTitle("Alterações não salvas")).toBeInTheDocument();
  });

  test("não exibe indicador de dirty quando isDirty=false", () => {
    render(<TabBar />);
    expect(screen.queryByTitle("Alterações não salvas")).toBeNull();
  });

  test("aba ativa recebe classe active", () => {
    useTabsStore.setState({
      tabs: [
        createTab({ id: "tab-1", fileName: "a.alg" }),
        createTab({ id: "tab-2", fileName: "b.alg" }),
      ],
      activeId: "tab-1",
    });
    render(<TabBar />);
    const tabA = screen.getByText("a.alg").closest("div");
    const tabB = screen.getByText("b.alg").closest("div");
    expect(tabA?.className).toMatch(/active/i);
    expect(tabB?.className).not.toMatch(/active/i);
  });

  test("chama switchTab ao clicar no nome da aba", async () => {
    const switchTab = vi.fn();
    useTabsStore.setState({ switchTab });
    render(<TabBar />);
    await userEvent.click(screen.getByText("sem_titulo.alg"));
    expect(switchTab).toHaveBeenCalledWith("tab-1");
  });

  test("botão fechar chama closeTab mas não switchTab", async () => {
    const closeTab = vi.fn();
    const switchTab = vi.fn();
    useTabsStore.setState({ closeTab, switchTab });
    render(<TabBar />);
    await userEvent.click(screen.getByTitle("Fechar aba"));
    expect(closeTab).toHaveBeenCalledWith("tab-1");
    expect(switchTab).not.toHaveBeenCalled();
  });

  test("exibe o nome do workspace quando fornecido", () => {
    useWorkspaceStore.setState({
      workspace: { folderName: "meu-projeto", folderPath: "/path", tree: [] },
    });
    render(<TabBar />);
    expect(screen.getByText("meu-projeto")).toBeInTheDocument();
  });

  test("não exibe nome do workspace quando null", () => {
    render(<TabBar />);
    expect(screen.queryByText("meu-projeto")).toBeNull();
  });

  test("botão explorador tem classe open quando explorerOpen=true", () => {
    useWorkspaceStore.setState({
      workspace: { folderName: "proj", folderPath: "/proj", tree: [] },
      explorerOpen: true,
    });
    render(<TabBar />);
    expect(screen.getByTitle("Fechar explorador").className).toMatch(/explorerOpen|open/i);
  });

  test("botão explorador exibe título correto quando fechado", () => {
    useWorkspaceStore.setState({
      workspace: { folderName: "proj", folderPath: "/proj", tree: [] },
      explorerOpen: false,
    });
    render(<TabBar />);
    expect(screen.getByTitle("Abrir explorador")).toBeInTheDocument();
  });

  test("chama handleToggleExplorer ao clicar no botão explorador", async () => {
    const handleToggleExplorer = vi.fn();
    useWorkspaceStore.setState({ handleToggleExplorer });
    render(<TabBar />);
    await userEvent.click(screen.getByTitle("Abrir pasta de trabalho"));
    expect(handleToggleExplorer).toHaveBeenCalled();
  });
});
