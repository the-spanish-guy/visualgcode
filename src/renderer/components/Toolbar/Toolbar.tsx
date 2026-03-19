import type { DebugMode } from "../../lib/DebugController";
import styles from "./Toolbar.module.css";

interface Props {
  fileName: string;
  isDirty: boolean;
  isRunning: boolean;
  timerDelay: number;
  debugMode: DebugMode;
  timerPaused: boolean;
  theme: "dark" | "light";
  onNew: () => void;
  onRun: () => void;
  onOpen: () => void;
  onSave: () => void;
  onStep: () => void;
  onStop: () => void;
  onDebug: () => void;
  onTimer: () => void;
  onSaveAs: () => void;
  onContinue: () => void;
  onOpenFolder: () => void;
  onThemeToggle: () => void;
  onTimerDelayChange: (delay: number) => void;
}

export default function Toolbar({
  theme,
  isDirty,
  fileName,
  isRunning,
  debugMode,
  timerDelay,
  timerPaused,
  onNew,
  onRun,
  onOpen,
  onStop,
  onStep,
  onSave,
  onSaveAs,
  onDebug,
  onTimer,
  onContinue,
  onOpenFolder,
  onThemeToggle,
  onTimerDelayChange,
}: Props) {
  const isDebugging = debugMode === "debugging" || debugMode === "paused";
  const isTimer = debugMode === "timer";
  const isPaused = debugMode === "paused";
  const idle = !isRunning && !isDebugging && !isTimer;

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

          <button className={styles.iconBtn} onClick={onOpen} title="Abrir arquivo (Ctrl+O)">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
          </button>

          <button className={styles.iconBtn} onClick={onOpenFolder} title="Abrir pasta de trabalho">
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
          <button
            className={styles.iconBtn}
            onClick={onThemeToggle}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? (
              // Sol — clica para ir ao tema claro
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              // Lua — clica para ir ao tema escuro
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.actions}>
          {idle && (
            <>
              <button className={styles.btnRun} onClick={onRun} title="Executar (F5)">
                <span className={styles.btnIcon}>▶</span>
                Executar
              </button>
              <button className={styles.btnDebug} onClick={onDebug} title="Debug (F8)">
                <span className={styles.btnIcon}>⬡</span>
                Debug
              </button>
              <button
                className={styles.btnTimer}
                onClick={onTimer}
                title="Executar com timer (Shift+F5)"
              >
                <span className={styles.btnIcon}>⏱</span>
                Timer
              </button>
            </>
          )}

          {isRunning && !isDebugging && !isTimer && (
            <button className={styles.btnStop} onClick={onStop} title="Parar (Esc)">
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
              <button className={styles.btnStop} onClick={onStop} title="Parar (Esc)">
                <span className={styles.btnIcon}>■</span>
                Parar
              </button>
            </>
          )}

          {isTimer && (
            <>
              {timerPaused && ( // ← usa timerPaused em vez de isPaused
                <>
                  <button className={styles.btnStep} onClick={onStep} title="Próximo passo (F10)">
                    <span className={styles.btnIcon}>↷</span>
                    Passo
                  </button>
                  <button
                    className={styles.btnContinue}
                    onClick={onContinue}
                    title="Continuar timer (F5)"
                  >
                    <span className={styles.btnIcon}>▶▶</span>
                    Continuar
                  </button>
                </>
              )}
              <button className={styles.btnStop} onClick={onStop} title="Parar (Esc)">
                <span className={styles.btnIcon}>■</span>
                Parar
              </button>
            </>
          )}
        </div>

        {(idle || isTimer) && (
          <>
            <div className={styles.divider} />
            <div className={styles.timerControl}>
              <span className={styles.timerIcon}>⏱</span>
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={timerDelay}
                disabled={isTimer}
                onChange={(e) => onTimerDelayChange(Number(e.target.value))}
                className={styles.timerSlider}
                title={`Delay do timer: ${timerDelay}ms`}
              />
              <span className={styles.timerLabel}>{timerDelay}ms</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
