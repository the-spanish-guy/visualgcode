import type { DebugMode } from "../DebugController";
import styles from "../styles/StatusBar.module.css";

interface Props {
  line: number;
  col: number;
  isRunning: boolean;
  errors: number;
  warnings: number;
  debugMode: DebugMode;
}

export default function StatusBar({ line, col, isRunning, errors, debugMode, warnings }: Props) {
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
