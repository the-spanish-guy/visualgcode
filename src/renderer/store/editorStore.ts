import { create } from "zustand";
import { applyTheme, getAllThemes } from "../themes/index";

export interface EditorHandle {
  goToLine: (line: number) => void;
}

const THEME_KEY = "visualg:theme";
const FONT_SIZE_KEY = "visualg:fontSize";
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 28;
const FONT_SIZE_DEFAULT = 14;

function getInitialTheme(): string {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved && getAllThemes().some((t) => t.id === saved)) return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "abyss-dawn" : "abyss-void";
}

function getInitialFontSize(): number {
  const saved = localStorage.getItem(FONT_SIZE_KEY);
  const parsed = saved ? parseInt(saved) : NaN;
  return isNaN(parsed)
    ? FONT_SIZE_DEFAULT
    : Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed));
}

interface EditorStore {
  theme: string;
  fontSize: number;
  cursorInfo: { line: number; col: number };
  editorHandle: EditorHandle | null;
  setTheme: (id: string) => void;
  setFontSize: (n: number) => void;
  adjustFontSize: (delta: number) => void;
  resetFontSize: () => void;
  setCursorInfo: (pos: { line: number; col: number }) => void;
  setEditorHandle: (h: EditorHandle | null) => void;
  goToLine: (line: number) => void;
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useEditorStore = create<EditorStore>()((set, get) => ({
  theme: initialTheme,
  fontSize: getInitialFontSize(),
  cursorInfo: { line: 1, col: 1 },
  editorHandle: null,

  setTheme: (id) => {
    localStorage.setItem(THEME_KEY, id);
    applyTheme(id);
    set({ theme: id });
  },

  setFontSize: (n) => {
    const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, n));
    localStorage.setItem(FONT_SIZE_KEY, String(clamped));
    set({ fontSize: clamped });
  },

  adjustFontSize: (delta) => get().setFontSize(get().fontSize + delta),

  resetFontSize: () => get().setFontSize(FONT_SIZE_DEFAULT),

  setCursorInfo: (pos) => set({ cursorInfo: pos }),

  setEditorHandle: (h) => set({ editorHandle: h }),

  goToLine: (line) => get().editorHandle?.goToLine(line),
}));
