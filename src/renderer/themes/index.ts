import type * as Monaco from "monaco-editor";
import { lightTheme } from "./abyss-dawn";
import { darkTheme } from "./abyss-void";
import { catppuccinFrappeTheme } from "./catppuccin-frappe";
import { catppuccinLatteTheme } from "./catppuccin-latte";
import { catppuccinMacchiatoTheme } from "./catppuccin-macchiato";
import { catppuccinMochaTheme } from "./catppuccin-mocha";
import { draculaTheme } from "./dracula";
import { gruvboxDarkTheme } from "./gruvbox-dark";
import { gruvboxLightTheme } from "./gruvbox-light";
import { nordTheme } from "./nord";
import { tokyoNightTheme } from "./tokyo-night";

export interface MonacoThemeData {
  base: "vs" | "vs-dark" | "hc-black" | "hc-light";
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

export interface ThemeDefinition {
  id: string;
  label: string;
  base: "dark" | "light";
  swatch: string;
  css: Record<string, string>;
  monaco: MonacoThemeData;
}

const themeRegistry = new Map<string, ThemeDefinition>();
let _monacoRef: typeof Monaco | null = null;

function register(def: ThemeDefinition): void {
  themeRegistry.set(def.id, def);
}

export function setMonacoInstance(m: typeof Monaco): void {
  _monacoRef = m;
  for (const def of themeRegistry.values()) {
    m.editor.defineTheme(def.id, def.monaco as Monaco.editor.IStandaloneThemeData);
  }
}

export function getTheme(id: string): ThemeDefinition {
  return themeRegistry.get(id) ?? (themeRegistry.get("abyss-void") as ThemeDefinition);
}

export function getAllThemes(): ThemeDefinition[] {
  return Array.from(themeRegistry.values());
}

export function applyTheme(id: string): void {
  const def = getTheme(id);
  for (const [key, value] of Object.entries(def.css)) {
    document.documentElement.style.setProperty(key, value);
  }
  if (_monacoRef) {
    _monacoRef.editor.defineTheme(id, def.monaco as Monaco.editor.IStandaloneThemeData);
    _monacoRef.editor.setTheme(id);
  }
}

[
  darkTheme,
  lightTheme,
  draculaTheme,
  nordTheme,
  tokyoNightTheme,
  catppuccinMochaTheme,
  catppuccinMacchiatoTheme,
  catppuccinFrappeTheme,
  catppuccinLatteTheme,
  gruvboxDarkTheme,
  gruvboxLightTheme,
].forEach(register);
