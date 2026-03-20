import { create } from "zustand";

export interface EditorHandle {
  goToLine: (line: number) => void;
}

const THEME_KEY = "visualg:theme";
const FONT_SIZE_KEY = "visualg:fontSize";
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 28;
const FONT_SIZE_DEFAULT = 14;

function getInitialTheme(): "dark" | "light" {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getInitialFontSize(): number {
  const saved = localStorage.getItem(FONT_SIZE_KEY);
  const parsed = saved ? parseInt(saved) : NaN;
  return isNaN(parsed)
    ? FONT_SIZE_DEFAULT
    : Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed));
}

interface EditorStore {
  theme: "dark" | "light";
  fontSize: number;
  cursorInfo: { line: number; col: number };
  editorHandle: EditorHandle | null;
  setTheme: (t: "dark" | "light") => void;
  toggleTheme: () => void;
  setFontSize: (n: number) => void;
  adjustFontSize: (delta: number) => void;
  resetFontSize: () => void;
  setCursorInfo: (pos: { line: number; col: number }) => void;
  setEditorHandle: (h: EditorHandle | null) => void;
  goToLine: (line: number) => void;
}

const initialTheme = getInitialTheme();
document.documentElement.setAttribute("data-theme", initialTheme);

export const useEditorStore = create<EditorStore>()((set, get) => ({
  theme: initialTheme,
  fontSize: getInitialFontSize(),
  cursorInfo: { line: 1, col: 1 },
  editorHandle: null,

  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
    set({ theme: t });
  },

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
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
