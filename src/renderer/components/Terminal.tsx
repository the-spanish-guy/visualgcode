import { useEffect, useRef, useState } from "react";
import styles from "../styles/Terminal.module.css";

interface Props {
  lines: string[];
  isRunning: boolean;
  waitingInput: boolean;
  onInput: (val: string) => void;
  onClear: () => void;
  errors: string[];
}

export default function Terminal({
  lines,
  isRunning,
  waitingInput,
  onInput,
  onClear,
  errors,
}: Props) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && waitingInput) {
      onInput(inputVal);
      setInputVal("");
    }
  };

  return (
    <div className={styles.terminal}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} style={{ background: "#ff4d6a" }} />
          <span className={styles.dot} style={{ background: "#ffd166" }} />
          <span className={styles.dot} style={{ background: "#3ddc97" }} />
          <span className={styles.title}>Saída</span>
        </div>
        <div className={styles.headerRight}>
          {isRunning && (
            <span className={styles.running}>
              <span className={styles.pulse} />
              executando
            </span>
          )}
          <button className={styles.clearBtn} onClick={onClear} title="Limpar saída">
            ✕
          </button>
        </div>
      </div>

      {/* Output */}
      <div className={styles.output}>
        {lines.length === 0 && !isRunning && (
          <span className={styles.placeholder}>Pressione ▶ Executar para rodar o programa...</span>
        )}

        {lines.map((line, i) => (
          <div key={i} className={styles.line}>
            {line}
          </div>
        ))}

        {/* Erros */}
        {errors.map((err, i) => (
          <div key={`err-${i}`} className={styles.errorLine}>
            {err}
          </div>
        ))}

        {/* Input inline */}
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
    </div>
  );
}
