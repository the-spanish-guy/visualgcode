import { useRef } from "react";
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

const TYPE_DEFAULTS: Record<string, string> = {
  inteiro: "0",
  real: "0",
  caractere: "",
  logico: "falso",
};

interface VarInfo extends VarSnapshot {
  defaultValue: string;
}

export default function VariablesPanel({ variables, isVisible }: Props) {
  const varInfo = useRef<Map<string, VarInfo>>(new Map());

  if (!isVisible) return null;

  // Registra o valor default de cada variável
  variables.forEach((v) => {
    varInfo.current.set(v.name, {
      ...v,
      defaultValue: TYPE_DEFAULTS[v.type] ?? "0",
    });
  });

  const isChanged = (v: VarSnapshot): boolean => {
    const info = varInfo.current.get(v.name);
    return String(v.value).toLowerCase() !== info?.defaultValue;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Variáveis</span>
        <span className={styles.count}>{variables.length}</span>
      </div>

      <div className={styles.list}>
        {variables.length === 0 && <span className={styles.empty}>Nenhuma variável ainda</span>}

        {variables.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHead}>
                <th className={styles.colNome}>NOME</th>
                <th className={styles.colTipo}>TIPO</th>
                <th className={styles.colValor}>VALOR</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v) => {
                const changed = isChanged(v);
                return (
                  <tr key={v.name} className={`${styles.row} ${changed ? styles.rowChanged : ""}`}>
                    <td className={styles.name}>{v.name}</td>
                    <td className={styles.type} style={{ color: TYPE_COLORS[v.type] ?? "#7a90aa" }}>
                      {v.type}
                    </td>
                    <td className={`${styles.value} ${changed ? styles.valueChanged : ""}`}>
                      {String(v.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
