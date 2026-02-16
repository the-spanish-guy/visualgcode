import type { DebugMode } from "../DebugController";
import styles from "../styles/Toolbar.module.css";

interface Props {
  fileName: string;
  isDirty: boolean;
  isRunning: boolean;
  debugMode: DebugMode;
  onNew: () => void;
  onRun: () => void;
  onOpen: () => void;
  onSave: () => void;
  onStep: () => void;
  onStop: () => void;
  onDebug: () => void;
  onSaveAs: () => void;
  onContinue: () => void;
}

export default function Toolbar({
  isDirty,
  fileName,
  isRunning,
  debugMode,
  onNew,
  onRun,
  onOpen,
  onStop,
  onStep,
  onSave,
  onSaveAs,
  onDebug,
  onContinue,
}: Props) {
  const isDebugging = debugMode === "debugging" || debugMode === "paused";
  const isPaused = debugMode === "paused";
  const idle = !isRunning && !isDebugging;

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.logo}>▸</span>
          <span className={styles.name}>VisuAlg</span>
          <span className={styles.badge}>IDE</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.fileActions}>
          <button className={styles.iconBtn} onClick={onNew} title="Novo (Ctrl+N)">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="12" x2="12" y2="18" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
          <button className={styles.iconBtn} onClick={onOpen} title="Abrir (Ctrl+O)">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            className={`${styles.iconBtn} ${isDirty ? styles.iconBtnDirty : ""}`}
            onClick={onSave}
            title="Salvar (Ctrl+S)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
          <button className={styles.iconBtn} onClick={onSaveAs} title="Salvar como (Ctrl+Shift+S)">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="17" y1="11" x2="23" y2="11" />
            </svg>
          </button>
        </div>

        <div className={styles.divider} />

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
                title="Continuar (F5)"
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
    </div>
  );
}
