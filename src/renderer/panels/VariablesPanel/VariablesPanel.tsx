import { useRef } from "react";
import type { VarSnapshot } from "../../../interpreter/Evaluator";
import { useDebugStore } from "../../store/debugStore";
import styles from "./VariablesPanel.module.css";

const TYPE_COLORS: Record<string, string> = {
  inteiro: "#79b8ff",
  real: "#b392f0",
  caractere: "#9ecbff",
  logico: "#85e89d",
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

function isVectorType(type: string): boolean {
  return type.startsWith("vetor[");
}

function is2DType(type: string): boolean {
  return /vetor\[.*,.*\]/.test(type);
}

function formatVectorValue(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      const arr = parsed as { data: unknown[]; is2D: boolean; rowSize: number; colSize: number };

      if (arr.is2D) {
        const rows: string[] = [];
        for (let r = 0; r < arr.rowSize; r++) {
          const row = arr.data.slice(r * arr.colSize, (r + 1) * arr.colSize);
          rows.push(`[${row.map((v) => JSON.stringify(v)).join(", ")}]`);
        }
        return `[${rows.join(", ")}]`;
      }

      return `[${arr.data.map((v) => JSON.stringify(v)).join(", ")}]`;
    }
  } catch {
    // fallback
  }
  return value;
}

function vectorColor(type: string): string {
  return is2DType(type) ? "#ffb86c" : "#ff9f68";
}

export default function VariablesPanel() {
  const variables = useDebugStore((s) => s.variables);
  const debugMode = useDebugStore((s) => s.debugMode);
  const isVisible = debugMode === "debugging" || debugMode === "paused" || debugMode === "timer";

  const varInfo = useRef<Map<string, VarInfo>>(new Map());

  if (!isVisible) return null;

  variables.forEach((v) => {
    const isVec = isVectorType(v.type);
    const defaultVal = isVec ? "[]" : (TYPE_DEFAULTS[v.type] ?? "0");
    varInfo.current.set(v.name, { ...v, defaultValue: defaultVal });
  });

  const isChanged = (v: VarSnapshot): boolean => {
    const info = varInfo.current.get(v.name);
    const displayValue = isVectorType(v.type) ? formatVectorValue(v.value) : String(v.value);
    const defaultValue = isVectorType(v.type) ? "[]" : (info?.defaultValue ?? "0");
    return displayValue.toLowerCase() !== defaultValue.toLowerCase();
  };

  const scalars = variables.filter((v) => !isVectorType(v.type));
  const vectors = variables.filter((v) => isVectorType(v.type) && !is2DType(v.type));
  const matrices = variables.filter((v) => is2DType(v.type));

  const renderRow = (v: VarSnapshot) => {
    const changed = isChanged(v);
    const isVec = isVectorType(v.type);
    const displayValue = isVec ? formatVectorValue(v.value) : String(v.value);
    const color = isVec ? vectorColor(v.type) : (TYPE_COLORS[v.type] ?? "#7a90aa");

    return (
      <tr key={v.name} className={`${styles.row} ${changed ? styles.rowChanged : ""}`}>
        <td className={styles.name}>{v.name}</td>
        <td className={styles.type} style={{ color }}>
          {v.type}
        </td>
        <td className={`${styles.value} ${changed ? styles.valueChanged : ""}`}>{displayValue}</td>
      </tr>
    );
  };

  const renderGroup = (label: string, items: VarSnapshot[]) => {
    if (items.length === 0) return null;
    return (
      <>
        <tr className={styles.groupHeader}>
          <td colSpan={3}>{label}</td>
        </tr>
        {items.map(renderRow)}
      </>
    );
  };

  return (
    <div className={styles.panel}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Nome</th>
            <th className={styles.th}>Tipo</th>
            <th className={styles.th}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {renderGroup("Escalares", scalars)}
          {renderGroup("Vetores", vectors)}
          {renderGroup("Matrizes", matrices)}
        </tbody>
      </table>
    </div>
  );
}
