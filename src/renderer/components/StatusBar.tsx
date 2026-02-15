import type { DebugMode } from "../DebugController";
import styles from "../styles/statusbar.module.css";

interface Props {
  line: number;
  col: number;
  isRunning: boolean;
  errors: number;
  debugMode: DebugMode;
}

export default function StatusBar({ line, col, isRunning, errors, debugMode }: Props) {
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
            ✕ {errors} erro{errors > 1 ? "s" : ""}
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
