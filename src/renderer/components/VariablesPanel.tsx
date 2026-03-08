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

function isVetorialType(type: string): boolean {
  return type.startsWith("vetor[");
}

function formatVetorValue(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      const arr = parsed.data as unknown[];
      return `[${arr.map((v) => JSON.stringify(v)).join(", ")}]`;
    }
  } catch {
    // Se não conseguir fazer parse, retorna o valor original
  }
  return value;
}

export default function VariablesPanel({ variables, isVisible }: Props) {
  const varInfo = useRef<Map<string, VarInfo>>(new Map());

  if (!isVisible) return null;

  variables.forEach((v) => {
    const isVet = isVetorialType(v.type);
    const defaultVal = isVet ? "[]" : (TYPE_DEFAULTS[v.type] ?? "0");
    varInfo.current.set(v.name, {
      ...v,
      defaultValue: defaultVal,
    });
  });

  const isChanged = (v: VarSnapshot): boolean => {
    const info = varInfo.current.get(v.name);
    const displayValue = isVetorialType(v.type) ? formatVetorValue(v.value) : String(v.value);
    const defaultValue = isVetorialType(v.type) ? "[]" : (info?.defaultValue ?? "0");
    return displayValue.toLowerCase() !== defaultValue.toLowerCase();
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
                const isVet = isVetorialType(v.type);
                const displayValue = isVet ? formatVetorValue(v.value) : String(v.value);
                return (
                  <tr key={v.name} className={`${styles.row} ${changed ? styles.rowChanged : ""}`}>
                    <td className={styles.name}>{v.name}</td>
                    <td
                      className={styles.type}
                      style={{ color: isVet ? "#ff9f68" : (TYPE_COLORS[v.type] ?? "#7a90aa") }}
                    >
                      {v.type}
                    </td>
                    <td className={`${styles.value} ${changed ? styles.valueChanged : ""}`}>
                      {displayValue}
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
