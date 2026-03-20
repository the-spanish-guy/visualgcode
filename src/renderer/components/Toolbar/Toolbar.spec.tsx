import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useDebugStore } from "../../store/debugStore";
import { useEditorStore } from "../../store/editorStore";
import { useExecutionStore } from "../../store/executionStore";
import { createTab, useTabsStore } from "../../store/tabsStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import Toolbar from "./Toolbar";

beforeEach(() => {
  const tab = createTab({ id: "tab-1" });
  useTabsStore.setState({ tabs: [tab], activeId: "tab-1" });
  useEditorStore.setState({ theme: "dark" });
  useExecutionStore.setState({ isRunning: false });
  useDebugStore.setState({ debugMode: "idle", timerDelay: 500, timerPaused: false });
  useWorkspaceStore.setState({ workspace: null, explorerOpen: false });
});

describe("Toolbar", () => {
  describe("modo ocioso", () => {
    test("exibe botões Executar, Debug e Timer", () => {
      render(<Toolbar />);
      expect(screen.getByText("Executar")).toBeInTheDocument();
      expect(screen.getByText("Debug")).toBeInTheDocument();
      expect(screen.getByText("Timer")).toBeInTheDocument();
    });

    test("não exibe botões Parar nem Passo", () => {
      render(<Toolbar />);
      expect(screen.queryByText("Parar")).toBeNull();
      expect(screen.queryByText("Passo")).toBeNull();
    });
  });

  describe("modo em execução", () => {
    test("exibe apenas o botão Parar", () => {
      useExecutionStore.setState({ isRunning: true });
      render(<Toolbar />);
      expect(screen.getByText("Parar")).toBeInTheDocument();
      expect(screen.queryByText("Executar")).toBeNull();
    });
  });

  describe("modo de depuração", () => {
    test("exibe botões Passo, Continuar e Parar", () => {
      useExecutionStore.setState({ isRunning: true });
      useDebugStore.setState({ debugMode: "debugging" });
      render(<Toolbar />);
      expect(screen.getByText("Passo")).toBeInTheDocument();
      expect(screen.getByText("Continuar")).toBeInTheDocument();
      expect(screen.getByText("Parar")).toBeInTheDocument();
    });

    test("botão Passo fica desabilitado quando depurando (não pausado)", () => {
      useExecutionStore.setState({ isRunning: true });
      useDebugStore.setState({ debugMode: "debugging" });
      render(<Toolbar />);
      expect(screen.getByText("Passo").closest("button")).toBeDisabled();
    });

    test("botão Passo fica habilitado quando pausado", () => {
      useExecutionStore.setState({ isRunning: true });
      useDebugStore.setState({ debugMode: "paused" });
      render(<Toolbar />);
      expect(screen.getByText("Passo").closest("button")).not.toBeDisabled();
    });
  });

  describe("modo timer", () => {
    test("exibe Parar e oculta Executar", () => {
      useExecutionStore.setState({ isRunning: true });
      useDebugStore.setState({ debugMode: "timer" });
      render(<Toolbar />);
      expect(screen.getByText("Parar")).toBeInTheDocument();
      expect(screen.queryByText("Executar")).toBeNull();
    });

    test("exibe Passo e Continuar quando timerPaused=true", () => {
      useExecutionStore.setState({ isRunning: true });
      useDebugStore.setState({ debugMode: "timer", timerPaused: true });
      render(<Toolbar />);
      expect(screen.getByText("Passo")).toBeInTheDocument();
      expect(screen.getByText("Continuar")).toBeInTheDocument();
    });

    test("oculta Passo e Continuar quando timerPaused=false", () => {
      useExecutionStore.setState({ isRunning: true });
      useDebugStore.setState({ debugMode: "timer", timerPaused: false });
      render(<Toolbar />);
      expect(screen.queryByText("Passo")).toBeNull();
      expect(screen.queryByText("Continuar")).toBeNull();
    });
  });

  describe("slider do timer", () => {
    test("exibe slider no modo ocioso com o valor correto", () => {
      useDebugStore.setState({ timerDelay: 800 });
      render(<Toolbar />);
      const slider = screen.getByRole("slider");
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue("800");
    });

    test("slider tem min=100 e max=2000", () => {
      render(<Toolbar />);
      const slider = screen.getByRole("slider");
      expect(slider).toHaveAttribute("min", "100");
      expect(slider).toHaveAttribute("max", "2000");
    });

    test("chama setTimerDelay ao alterar o slider", () => {
      const setTimerDelay = vi.fn();
      useDebugStore.setState({ setTimerDelay });
      render(<Toolbar />);
      fireEvent.change(screen.getByRole("slider"), { target: { value: "600" } });
      expect(setTimerDelay).toHaveBeenCalledWith(600);
    });
  });

  describe("botão salvar", () => {
    test("não tem classe dirty quando isDirty=false", () => {
      render(<Toolbar />);
      expect(screen.getByTitle("Salvar (Ctrl+S)").className).not.toMatch(/dirty/i);
    });

    test("tem classe dirty quando isDirty=true", () => {
      useTabsStore.setState({
        tabs: [createTab({ id: "tab-1", isDirty: true })],
        activeId: "tab-1",
      });
      render(<Toolbar />);
      expect(screen.getByTitle("Salvar (Ctrl+S)").className).toMatch(/dirty/i);
    });
  });

  describe("callbacks", () => {
    test("chama newTab ao clicar em Novo", async () => {
      const newTab = vi.fn();
      useTabsStore.setState({ newTab });
      render(<Toolbar />);
      await userEvent.click(screen.getByTitle("Novo (Ctrl+N)"));
      expect(newTab).toHaveBeenCalled();
    });

    test("chama handleRun ao clicar em Executar", async () => {
      const handleRun = vi.fn();
      useExecutionStore.setState({ handleRun });
      render(<Toolbar />);
      await userEvent.click(screen.getByTitle("Executar (F5)"));
      expect(handleRun).toHaveBeenCalled();
    });

    test("chama handleStop ao clicar em Parar", async () => {
      const handleStop = vi.fn();
      useExecutionStore.setState({ isRunning: true, handleStop });
      render(<Toolbar />);
      await userEvent.click(screen.getByText("Parar"));
      expect(handleStop).toHaveBeenCalled();
    });
  });
});
