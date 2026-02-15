import type { DebugMode } from "../App";
import styles from "../styles/toolbar.module.css";

interface Props {
  isRunning: boolean;
  debugMode: DebugMode;
  onRun: () => void;
  onStop: () => void;
}

export default function Toolbar({ isRunning, debugMode, onRun, onStop }: Props) {
  const isDebugging = debugMode === "debugging" || debugMode === "paused";
  const idle = !isRunning && !isDebugging;

  return (
    <div className={styles.toolbar}>
      <div className={styles.brand}>
        <span className={styles.logo}>▸</span>
        <span className={styles.name}>VisuAlg</span>
        <span className={styles.badge}>IDE</span>
      </div>

      <div className={styles.actions}>
        {idle && (
          <>
            <button className={styles.btnRun} onClick={onRun}>
              <span className={styles.btnIcon}>▶</span>
              Executar
            </button>
            <button className={styles.btnDebug}>
              <span className={styles.btnIcon}>⬡</span>
              Debug
            </button>
          </>
        )}

        {isRunning && !isDebugging && (
          <button className={styles.btnStop} onClick={onStop}>
            <span className={styles.btnIcon}>■</span>
            Parar
          </button>
        )}
      </div>
    </div>
  );
}
