import { useDebugStore } from "../../store/debugStore";
import { useExecutionStore } from "../../store/executionStore";
import { useTabsStore } from "../../store/tabsStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import ThemeSelector from "../ThemeSelector/ThemeSelector";
import styles from "./Toolbar.module.css";

export default function Toolbar() {
  const isRunning = useExecutionStore((s) => s.isRunning);
  const handleRun = useExecutionStore((s) => s.handleRun);
  const handleStop = useExecutionStore((s) => s.handleStop);
  const handleDebug = useExecutionStore((s) => s.handleDebug);
  const handleTimer = useExecutionStore((s) => s.handleTimer);
  const handleStep = useExecutionStore((s) => s.handleStep);
  const handleContinue = useExecutionStore((s) => s.handleContinue);
  const debugMode = useDebugStore((s) => s.debugMode);
  const timerDelay = useDebugStore((s) => s.timerDelay);
  const timerPaused = useDebugStore((s) => s.timerPaused);
  const setTimerDelay = useDebugStore((s) => s.setTimerDelay);
  const { tabs, activeId } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const { newTab, handleSave, handleSaveAs, handleOpen, handleOpenFolder } = {
    newTab: useTabsStore((s) => s.newTab),
    handleSave: useWorkspaceStore((s) => s.handleSave),
    handleSaveAs: useWorkspaceStore((s) => s.handleSaveAs),
    handleOpen: useWorkspaceStore((s) => s.handleOpen),
    handleOpenFolder: useWorkspaceStore((s) => s.handleOpenFolder),
  };

  const isDebugging = debugMode === "debugging" || debugMode === "paused";
  const isTimer = debugMode === "timer";
  const isPaused = debugMode === "paused";
  const idle = !isRunning && !isDebugging && !isTimer;

  const isMac = navigator.userAgent.includes("Macintosh");

  function handleStarRepo() {
    window.electronAPI.openExternal("https://github.com/the-spanish-guy/visualgcode");
  }

  return (
    <div className={`${styles.toolbar} ${isMac ? styles.toolbarMac : ""}`}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.logo}>▸</span>
          <span className={styles.name}>VisuAlg</span>
          <span className={styles.badge}>IDE</span>
          <button
            type="button"
            className={styles.starBtn}
            onClick={handleStarRepo}
            title="Gostou? Deixe uma ⭐ no GitHub!"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.fileActions}>
          <button className={styles.iconBtn} onClick={newTab} title="Novo (Ctrl+N)">
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

          <button className={styles.iconBtn} onClick={handleOpen} title="Abrir arquivo (Ctrl+O)">
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

          <button
            className={styles.iconBtn}
            onClick={handleOpenFolder}
            title="Abrir pasta de trabalho"
          >
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
            className={`${styles.iconBtn} ${activeTab.isDirty ? styles.iconBtnDirty : ""}`}
            onClick={handleSave}
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

          <button
            className={styles.iconBtn}
            onClick={handleSaveAs}
            title="Salvar como (Ctrl+Shift+S)"
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
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="17" y1="11" x2="23" y2="11" />
            </svg>
          </button>

          <ThemeSelector />
        </div>

        <div className={styles.divider} />

        <div className={styles.actions}>
          {idle && (
            <>
              <button className={styles.btnRun} onClick={handleRun} title="Executar (F5)">
                <span className={styles.btnIcon}>▶</span>
                Executar
              </button>
              <button className={styles.btnDebug} onClick={handleDebug} title="Debug (F8)">
                <span className={styles.btnIcon}>⬡</span>
                Debug
              </button>
              <button
                className={styles.btnTimer}
                onClick={handleTimer}
                title="Executar com timer (Shift+F5)"
              >
                <span className={styles.btnIcon}>⏱</span>
                Timer
              </button>
            </>
          )}

          {isRunning && !isDebugging && !isTimer && (
            <button className={styles.btnStop} onClick={handleStop} title="Parar (Esc)">
              <span className={styles.btnIcon}>■</span>
              Parar
            </button>
          )}

          {isDebugging && (
            <>
              <button
                className={styles.btnStep}
                onClick={handleStep}
                disabled={!isPaused}
                title="Próximo passo (F10)"
              >
                <span className={styles.btnIcon}>↷</span>
                Passo
              </button>
              <button
                className={styles.btnContinue}
                onClick={handleContinue}
                disabled={!isPaused}
                title="Continuar (F5)"
              >
                <span className={styles.btnIcon}>▶▶</span>
                Continuar
              </button>
              <button className={styles.btnStop} onClick={handleStop} title="Parar (Esc)">
                <span className={styles.btnIcon}>■</span>
                Parar
              </button>
            </>
          )}

          {isTimer && (
            <>
              {timerPaused && (
                <>
                  <button
                    className={styles.btnStep}
                    onClick={handleStep}
                    title="Próximo passo (F10)"
                  >
                    <span className={styles.btnIcon}>↷</span>
                    Passo
                  </button>
                  <button
                    className={styles.btnContinue}
                    onClick={handleContinue}
                    title="Continuar timer (F5)"
                  >
                    <span className={styles.btnIcon}>▶▶</span>
                    Continuar
                  </button>
                </>
              )}
              <button className={styles.btnStop} onClick={handleStop} title="Parar (Esc)">
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
                onChange={(e) => setTimerDelay(Number(e.target.value))}
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
