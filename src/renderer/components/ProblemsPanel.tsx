import type { StaticWarning } from "../../interpreter/StaticAnalyzer";
import styles from "../styles/ProblemsPanel.module.css";

interface Props {
  errors: string[];
  warnings: StaticWarning[];
  onProblemClick: (line: number) => void;
}

export default function ProblemsPanel({ errors, warnings, onProblemClick }: Props) {
  const total = errors.length + warnings.length;

  if (total === 0) {
    return (
      <div className={styles.empty}>
        <i className="nf nf-cod-check" />
        <span>Nenhum problema encontrado</span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {errors.map((err, i) => {
        const match = err.match(/\[Linha (\d+)/);
        const line = match ? parseInt(match[1]) : null;

        return (
          <div
            key={`err-${i}`}
            className={`${styles.item} ${styles.itemError} ${line ? styles.clickable : ""}`}
            onClick={() => line && onProblemClick(line)}
            title={line ? `Ir para linha ${line}` : undefined}
          >
            <i className={`nf nf-cod-error ${styles.icon} ${styles.iconError}`} />
            <span className={styles.message}>{err}</span>
            {line && <span className={styles.line}>Ln {line}</span>}
          </div>
        );
      })}

      {warnings.map((w, i) => (
        <div
          key={`warn-${i}`}
          className={`${styles.item} ${styles.itemWarning} ${styles.clickable}`}
          onClick={() => onProblemClick(w.line)}
          title={`Ir para linha ${w.line}`}
        >
          <i className={`nf nf-cod-warning ${styles.icon} ${styles.iconWarning}`} />
          <span className={styles.message}>{w.message}</span>
          <span className={styles.line}>Ln {w.line}</span>
        </div>
      ))}
    </div>
  );
}
