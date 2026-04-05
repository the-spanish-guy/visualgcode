import { useCallback, useEffect, useRef, useState } from "react";
import { explainError } from "../../lib/explainError";
import { useDebugStore } from "../../store/debugStore";
import { useEditorStore } from "../../store/editorStore";
import { useExecutionStore } from "../../store/executionStore";
import ProblemsPanel from "./ProblemsPanel";
import styles from "./Terminal.module.css";
import TraceTable from "./TraceTable";

const TABS = ["saida", "rastreamento", "problemas"] as const;
type TerminalTab = (typeof TABS)[number];

export default function Terminal() {
  const lines = useExecutionStore((s) => s.output.lines);
  const errors = useExecutionStore((s) => s.errors);
  const warnings = useExecutionStore((s) => s.warnings);
  const isRunning = useExecutionStore((s) => s.isRunning);
  const waitingInput = useExecutionStore((s) => s.waitingInput);
  const handleTerminalInput = useExecutionStore((s) => s.handleTerminalInput);
  const handleClear = useExecutionStore((s) => s.handleClear);
  const traceSnapshots = useDebugStore((s) => s.traceSnapshots);
  const clearTraceSnapshots = useDebugStore((s) => s.clearTraceSnapshots);
  const goToLine = useEditorStore((s) => s.goToLine);

  const [activeTab, setActiveTab] = useState<TerminalTab>("saida");
  const [inputVal, setInputVal] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const problemCount = errors.length + warnings.length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    if (waitingInput) inputRef.current?.focus();
  }, [waitingInput]);

  useEffect(() => {
    if (traceSnapshots.length === 1) setActiveTab("rastreamento");
  }, [traceSnapshots.length]);

  useEffect(() => {
    if (isRunning) setActiveTab("saida");
  }, [isRunning]);

  useEffect(() => {
    if (errors.length > 0 && !isRunning) setActiveTab("problemas");
  }, [errors.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && waitingInput) {
        handleTerminalInput(inputVal);
        setInputVal("");
      }
    },
    [waitingInput, inputVal, handleTerminalInput],
  );

  return (
    <div className={styles.terminal}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "saida" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("saida")}
          >
            Saída
          </button>

          <button
            className={`${styles.tab} ${activeTab === "rastreamento" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("rastreamento")}
          >
            Rastreamento
            {traceSnapshots.length > 0 && (
              <span className={styles.badge}>{traceSnapshots.length}</span>
            )}
          </button>

          <button
            className={`${styles.tab} ${activeTab === "problemas" ? styles.tabActive : ""} ${problemCount > 0 ? styles.tabProblems : ""}`}
            onClick={() => setActiveTab("problemas")}
          >
            Problemas
            {problemCount > 0 && (
              <span
                className={`${styles.badge} ${errors.length > 0 ? styles.badgeError : styles.badgeWarning}`}
              >
                {problemCount}
              </span>
            )}
          </button>
        </div>

        <div className={styles.headerRight}>
          {isRunning && (
            <span className={styles.running}>
              <span className={styles.pulse} />
              executando
            </span>
          )}
          {activeTab === "saida" && (
            <button className={styles.clearBtn} onClick={handleClear} title="Limpar saída">
              ✕
            </button>
          )}
        </div>
      </div>

      {activeTab === "saida" && (
        <div className={styles.output}>
          {lines.length === 0 && !isRunning && (
            <span className={styles.placeholder}>
              Pressione ▶ Executar para rodar o programa...
            </span>
          )}

          {lines.map((line, i) => (
            <div key={i} className={styles.line}>
              {line}
            </div>
          ))}

          {errors.map((err, i) => {
            const explanation = explainError(err);
            return (
              <div key={`err-${i}`}>
                <div className={styles.errorLine}>{err}</div>
                {explanation && <div className={styles.errorHint}>→ {explanation}</div>}
              </div>
            );
          })}

          {waitingInput && (
            <div className={styles.inputLine}>
              <span className={styles.prompt}>›</span>
              <input
                ref={inputRef}
                className={styles.input}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                spellCheck={false}
              />
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {activeTab === "rastreamento" && (
        <TraceTable snapshots={traceSnapshots} onClear={clearTraceSnapshots} />
      )}

      {activeTab === "problemas" && (
        <ProblemsPanel errors={errors} warnings={warnings} onProblemClick={goToLine} />
      )}
    </div>
  );
}
