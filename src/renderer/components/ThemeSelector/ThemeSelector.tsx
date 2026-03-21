import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import { getAllThemes, getTheme } from "../../themes/index";
import styles from "./ThemeSelector.module.css";

const themes = getAllThemes();

export default function ThemeSelector() {
  const theme = useEditorStore((s) => s.theme);
  const setTheme = useEditorStore((s) => s.setTheme);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTheme = getTheme(theme);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <button className={styles.btn} onClick={() => setIsOpen((o) => !o)} title="Selecionar tema">
        <span className={styles.swatch} style={{ background: activeTheme.swatch }} />
        <span className={styles.label}>{activeTheme.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.popover}>
          {themes.map((t) => (
            <button
              key={t.id}
              className={`${styles.item} ${t.id === theme ? styles.itemActive : ""}`}
              onClick={() => {
                setTheme(t.id);
                setIsOpen(false);
              }}
            >
              <span className={styles.swatch} style={{ background: t.swatch }} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
