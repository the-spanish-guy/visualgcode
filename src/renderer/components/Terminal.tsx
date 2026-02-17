import { useEffect, useRef, useState } from "react";
import type { VarSnapshot } from "../../interpreter/Evaluator";
import styles from "../styles/Terminal.module.css";
import TraceTable from "./TraceTable";

interface Props {
  lines: string[];
  errors: string[];
  isRunning: boolean;
  waitingInput: boolean;
  traceSnapshots: VarSnapshot[][];
  onClear: () => void;
  onClearTrace: () => void;
  onInput: (val: string) => void;
}

export default function Terminal({
  errors,
  lines,
  isRunning,
  waitingInput,
  traceSnapshots,
  onInput,
  onClear,
  onClearTrace,
}: Props) {
  const [activeTab, setActiveTab] = useState<"saida" | "rastreamento">("saida");
  const [inputVal, setInputVal] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll pra baixo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // Foca input quando aguardando
  useEffect(() => {
    if (waitingInput) inputRef.current?.focus();
  }, [waitingInput]);

  useEffect(() => {
    if (traceSnapshots.length === 1) setActiveTab("rastreamento");
  }, [traceSnapshots.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && waitingInput) {
      onInput(inputVal);
      setInputVal("");
    }
  };

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
        </div>

        <div className={styles.headerRight}>
          {isRunning && (
            <span className={styles.running}>
              <span className={styles.pulse} />
              executando
            </span>
          )}
          {activeTab === "saida" && (
            <button className={styles.clearBtn} onClick={onClear} title="Limpar saída">
              ✕
            </button>
          )}
        </div>
      </div>

      {activeTab === "saida" ? (
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

          {errors.map((err, i) => (
            <div key={`err-${i}`} className={styles.errorLine}>
              {err}
            </div>
          ))}

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
      ) : (
        <TraceTable snapshots={traceSnapshots} onClear={onClearTrace} />
      )}
    </div>
  );
}
