import { useDebugStore } from "../../store/debugStore";
import styles from "./CallStack.module.css";

export default function CallStack() {
  const callStack = useDebugStore((s) => s.callStack);
  const debugMode = useDebugStore((s) => s.debugMode);
  const isVisible = debugMode === "debugging" || debugMode === "paused" || debugMode === "timer";

  if (!isVisible) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Pilha de Chamadas</span>
      </div>

      <div className={styles.list}>
        {callStack.length === 0 ? (
          <div className={styles.frame}>
            <span className={styles.arrow}>▶</span>
            <span className={styles.name}>(programa principal)</span>
          </div>
        ) : (
          <>
            {[...callStack].reverse().map((name, i) => (
              <div
                key={`${name}-${i}`}
                className={`${styles.frame} ${i === 0 ? styles.active : ""}`}
              >
                <span className={styles.arrow}>{i === 0 ? "▶" : "·"}</span>
                <span className={styles.name}>{name}()</span>
              </div>
            ))}

            <div className={styles.frame}>
              <span className={styles.arrow}>·</span>
              <span className={`${styles.name} ${styles.muted}`}>(programa principal)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
