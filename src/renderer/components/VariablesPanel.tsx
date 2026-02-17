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

interface VarInfo extends VarSnapshot {
  initialValue: string | number | boolean;
}

export default function VariablesPanel({ variables, isVisible }: Props) {
  // Guarda snapshot anterior para detectar mudanças
  const testeVarInfo = useRef<Map<string, VarInfo>>(new Map());

  if (!isVisible) return null;

  const DEFAULTS: Record<string, string | number | boolean> = {
    inteiro: 0,
    real: 0,
    caractere: "",
    logico: "falso",
  };
  variables.forEach((v) => {
    const values: VarInfo = {
      ...v,
      initialValue: String(DEFAULTS[v.type]).toLowerCase(),
    };
    testeVarInfo.current.set(v.name, values);
  });

  const handleClassName = (v: VarSnapshot, c: "linha" | "valor") => {
    const base = styles.value;
    const baseRow = styles.row;
    const current = testeVarInfo.current.get(v.name);

    if (c === "linha") {
      if (v.value.toLowerCase() !== current?.initialValue) return `${baseRow} ${styles.rowChanged}`;
      return baseRow;
    }

    if (v.value.toLowerCase() !== current?.initialValue)
      return `${styles.value} ${styles.valueChanged}`;

    return `${base}`;
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
              {variables.map((v) => (
                <tr key={v.name} className={handleClassName(v, "linha")}>
                  <td className={styles.name}>{v.name}</td>
                  <td className={styles.type} style={{ color: TYPE_COLORS[v.type] ?? "#7a90aa" }}>
                    {v.type}
                  </td>
                  <td className={handleClassName(v, "valor")}>{String(v.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
