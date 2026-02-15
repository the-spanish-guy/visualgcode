import type { DebugMode } from "../DebugController";
import styles from "../styles/Toolbar.module.css";

interface Props {
  isRunning: boolean;
  debugMode: DebugMode;
  onRun: () => void;
  onStep: () => void;
  onStop: () => void;
  onDebug: () => void;
  onContinue: () => void;
}

export default function Toolbar({
  isRunning,
  debugMode,
  onRun,
  onStop,
  onStep,
  onDebug,
  onContinue,
}: Props) {
  const isDebugging = debugMode === "debugging" || debugMode === "paused";
  const isPaused = debugMode === "paused";
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
            <button className={styles.btnDebug} onClick={onDebug}>
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
        {isDebugging && (
          <>
            <button
              className={styles.btnStep}
              onClick={onStep}
              disabled={!isPaused}
              title="Próximo passo (F10)"
            >
              <span className={styles.btnIcon}>↷</span>
              Passo
            </button>
            <button
              className={styles.btnContinue}
              onClick={onContinue}
              disabled={!isPaused}
              title="Continuar até breakpoint (F5)"
            >
              <span className={styles.btnIcon}>▶▶</span>
              Continuar
            </button>
            <button className={styles.btnStop} onClick={onStop}>
              <span className={styles.btnIcon}>■</span>
              Parar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
