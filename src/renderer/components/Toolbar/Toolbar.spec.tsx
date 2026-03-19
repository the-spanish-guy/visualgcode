import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import Toolbar from "./Toolbar";

const noop = vi.fn();
const defaults = {
  fileName: "test.alg",
  isDirty: false,
  isRunning: false,
  timerDelay: 500,
  debugMode: "idle" as const,
  timerPaused: false,
  theme: "dark" as const,
  onNew: noop,
  onRun: noop,
  onOpen: noop,
  onSave: noop,
  onStep: noop,
  onStop: noop,
  onDebug: noop,
  onTimer: noop,
  onSaveAs: noop,
  onContinue: noop,
  onOpenFolder: noop,
  onThemeToggle: noop,
  onTimerDelayChange: noop,
};

describe("Toolbar", () => {
  describe("modo ocioso", () => {
    test("exibe botões Executar, Debug e Timer", () => {
      render(<Toolbar {...defaults} />);
      expect(screen.getByText("Executar")).toBeInTheDocument();
      expect(screen.getByText("Debug")).toBeInTheDocument();
      expect(screen.getByText("Timer")).toBeInTheDocument();
    });

    test("não exibe botões Parar nem Passo", () => {
      render(<Toolbar {...defaults} />);
      expect(screen.queryByText("Parar")).toBeNull();
      expect(screen.queryByText("Passo")).toBeNull();
    });
  });

  describe("modo em execução", () => {
    test("exibe apenas o botão Parar", () => {
      render(<Toolbar {...defaults} isRunning={true} />);
      expect(screen.getByText("Parar")).toBeInTheDocument();
      expect(screen.queryByText("Executar")).toBeNull();
    });
  });

  describe("modo de depuração", () => {
    test("exibe botões Passo, Continuar e Parar", () => {
      render(<Toolbar {...defaults} isRunning={true} debugMode="debugging" />);
      expect(screen.getByText("Passo")).toBeInTheDocument();
      expect(screen.getByText("Continuar")).toBeInTheDocument();
      expect(screen.getByText("Parar")).toBeInTheDocument();
    });

    test("botão Passo fica desabilitado quando depurando (não pausado)", () => {
      render(<Toolbar {...defaults} isRunning={true} debugMode="debugging" />);
      expect(screen.getByText("Passo").closest("button")).toBeDisabled();
    });

    test("botão Passo fica habilitado quando pausado", () => {
      render(<Toolbar {...defaults} isRunning={true} debugMode="paused" />);
      expect(screen.getByText("Passo").closest("button")).not.toBeDisabled();
    });
  });

  describe("modo timer", () => {
    test("exibe Parar e oculta Executar", () => {
      render(<Toolbar {...defaults} isRunning={true} debugMode="timer" />);
      expect(screen.getByText("Parar")).toBeInTheDocument();
      expect(screen.queryByText("Executar")).toBeNull();
    });

    test("exibe Passo e Continuar quando timerPaused=true", () => {
      render(<Toolbar {...defaults} isRunning={true} debugMode="timer" timerPaused={true} />);
      expect(screen.getByText("Passo")).toBeInTheDocument();
      expect(screen.getByText("Continuar")).toBeInTheDocument();
    });

    test("oculta Passo e Continuar quando timerPaused=false", () => {
      render(<Toolbar {...defaults} isRunning={true} debugMode="timer" timerPaused={false} />);
      expect(screen.queryByText("Passo")).toBeNull();
      expect(screen.queryByText("Continuar")).toBeNull();
    });
  });

  describe("slider do timer", () => {
    test("exibe slider no modo ocioso com o valor correto", () => {
      render(<Toolbar {...defaults} timerDelay={800} />);
      const slider = screen.getByRole("slider");
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue("800");
    });

    test("slider tem min=100 e max=2000", () => {
      render(<Toolbar {...defaults} />);
      const slider = screen.getByRole("slider");
      expect(slider).toHaveAttribute("min", "100");
      expect(slider).toHaveAttribute("max", "2000");
    });

    test("chama onTimerDelayChange ao alterar o slider", () => {
      const onChange = vi.fn();
      render(<Toolbar {...defaults} onTimerDelayChange={onChange} timerDelay={500} />);
      fireEvent.change(screen.getByRole("slider"), { target: { value: "600" } });
      expect(onChange).toHaveBeenCalledWith(600);
    });
  });

  describe("botão salvar", () => {
    test("não tem classe dirty quando isDirty=false", () => {
      render(<Toolbar {...defaults} isDirty={false} />);
      expect(screen.getByTitle("Salvar (Ctrl+S)").className).not.toMatch(/dirty/i);
    });

    test("tem classe dirty quando isDirty=true", () => {
      render(<Toolbar {...defaults} isDirty={true} />);
      expect(screen.getByTitle("Salvar (Ctrl+S)").className).toMatch(/dirty/i);
    });
  });

  describe("callbacks", () => {
    test("chama onNew ao clicar em Novo", async () => {
      const onNew = vi.fn();
      render(<Toolbar {...defaults} onNew={onNew} />);
      await userEvent.click(screen.getByTitle("Novo (Ctrl+N)"));
      expect(onNew).toHaveBeenCalled();
    });

    test("chama onRun ao clicar em Executar", async () => {
      const onRun = vi.fn();
      render(<Toolbar {...defaults} onRun={onRun} />);
      await userEvent.click(screen.getByTitle("Executar (F5)"));
      expect(onRun).toHaveBeenCalled();
    });

    test("chama onStop ao clicar em Parar", async () => {
      const onStop = vi.fn();
      render(<Toolbar {...defaults} isRunning={true} onStop={onStop} />);
      await userEvent.click(screen.getByText("Parar"));
      expect(onStop).toHaveBeenCalled();
    });
  });
});
