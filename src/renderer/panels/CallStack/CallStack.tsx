import styles from "./CallStack.module.css";

interface Props {
  callStack: string[];
  isVisible: boolean;
}

export default function CallStack({ callStack, isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Pilha de Chamadas</span>
      </div>

      <div className={styles.list}>
        {callStack.length === 0 ? (
          // Escopo global — nenhuma função/procedimento ativo
          <div className={styles.frame}>
            <span className={styles.arrow}>▶</span>
            <span className={styles.name}>(programa principal)</span>
          </div>
        ) : (
          <>
            {/* Exibe do mais interno ao mais externo */}
            {[...callStack].reverse().map((name, i) => (
              <div
                key={`${name}-${i}`}
                className={`${styles.frame} ${i === 0 ? styles.active : ""}`}
              >
                <span className={styles.arrow}>{i === 0 ? "▶" : "·"}</span>
                <span className={styles.name}>{name}()</span>
              </div>
            ))}

            {/* Programa principal sempre aparece no fundo da pilha */}
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
