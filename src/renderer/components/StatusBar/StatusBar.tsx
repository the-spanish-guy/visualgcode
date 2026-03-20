import { useDebugStore } from "../../store/debugStore";
import { useEditorStore } from "../../store/editorStore";
import { useExecutionStore } from "../../store/executionStore";
import styles from "./StatusBar.module.css";

export default function StatusBar() {
  const { line, col } = useEditorStore((s) => s.cursorInfo);
  const isRunning = useExecutionStore((s) => s.isRunning);
  const errors = useExecutionStore((s) => s.errors.length);
  const warnings = useExecutionStore((s) => s.warnings.length);
  const debugMode = useDebugStore((s) => s.debugMode);

  const label =
    debugMode === "paused"
      ? "⏸ Pausado"
      : debugMode === "debugging"
        ? "⬡ Depurando..."
        : isRunning
          ? "Executando..."
          : "Pronto";

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={`${styles.indicator} ${isRunning ? styles.running : ""}`} />
        <span className={styles.text}>{label}</span>
      </div>

      <div className={styles.right}>
        {errors > 0 && (
          <span className={styles.errors}>
            <i className="nf nf-cod-error"></i> {errors} erro{errors > 1 ? "s" : ""}
          </span>
        )}

        {warnings > 0 && (
          <span className={styles.warnings}>
            <i className="nf nf-cod-warning"></i> {warnings} warning{warnings > 1 ? "s" : ""}
          </span>
        )}
        <span className={styles.cursor}>
          Ln {line}, Col {col}
        </span>
        <span className={styles.lang}>VisuAlg</span>
      </div>
    </div>
  );
}
