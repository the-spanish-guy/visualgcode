import type { VarSnapshot } from "../../interpreter/Evaluator";
import styles from "../styles/VariablesPanel.module.css";

interface Props {
  variables: VarSnapshot[];
  isVisible: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  inteiro: "#79d4f1",
  real: "#3ddc97",
  caractere: "#a8d8a8",
  logico: "#c792ea",
};

export default function VariablesPanel({ variables, isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Variáveis</span>
        <span className={styles.count}>{variables.length}</span>
      </div>

      <div className={styles.list}>
        {variables.length === 0 && <span className={styles.empty}>Nenhuma variável ainda</span>}

        {variables.map((v) => (
          <div key={v.name} className={styles.row}>
            <div className={styles.left}>
              <span className={styles.type} style={{ color: TYPE_COLORS[v.type] ?? "#7a90aa" }}>
                {v.type}
              </span>
              <span className={styles.name}>{v.name}</span>
            </div>
            <span className={styles.value}>{v.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
