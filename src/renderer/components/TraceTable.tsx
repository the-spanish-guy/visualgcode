import type { VarSnapshot } from "../../interpreter/Evaluator";
import styles from "../styles/TraceTable.module.css";

interface Props {
  snapshots: VarSnapshot[][];
  onClear: () => void;
}

export default function TraceTable({ snapshots, onClear }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className={styles.empty}>
        <span>Inicie o debug para registrar o rastreamento</span>
      </div>
    );
  }

  // Coleta todas as variáveis únicas em ordem de aparição
  const vars: string[] = [];
  for (const snap of snapshots) {
    for (const v of snap) {
      if (!vars.includes(v.name)) vars.push(v.name);
    }
  }

  const handleCopyCSV = () => {
    const header = ["passo", ...vars].join(",");
    const rows = snapshots.map((snap, i) => {
      const byName = Object.fromEntries(snap.map((v) => [v.name, v.value]));
      return [i + 1, ...vars.map((v) => byName[v] ?? "")].join(",");
    });
    navigator.clipboard.writeText([header, ...rows].join("\n"));
  };

  return (
    <div className={styles.wrapper}>
      {/* Toolbar da tabela */}
      <div className={styles.toolbar}>
        <span className={styles.info}>
          {snapshots.length} passo{snapshots.length !== 1 ? "s" : ""}
        </span>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={handleCopyCSV} title="Copiar como CSV">
            ↓ CSV
          </button>
          <button className={styles.btn} onClick={onClear} title="Limpar rastreamento">
            ✕
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.head}>
              <th className={styles.thPasso}>PASSO</th>
              {vars.map((v) => (
                <th key={v} className={styles.th}>
                  {v.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snap, idx) => {
              const isLast = idx === snapshots.length - 1;
              const prevSnap = idx > 0 ? snapshots[idx - 1] : null;
              const byName = Object.fromEntries(snap.map((v) => [v.name, v.value]));
              const prevByName = prevSnap
                ? Object.fromEntries(prevSnap.map((v) => [v.name, v.value]))
                : null;

              return (
                <tr key={idx} className={`${styles.row} ${isLast ? styles.rowLast : ""}`}>
                  <td className={`${styles.tdPasso} ${isLast ? styles.tdPassoLast : ""}`}>
                    {idx + 1}
                  </td>
                  {vars.map((v) => {
                    const val = byName[v] ?? "—";
                    const prevVal = prevByName?.[v];
                    const changed = isLast && prevVal !== undefined && prevVal !== val;
                    return (
                      <td key={v} className={`${styles.td} ${changed ? styles.tdChanged : ""}`}>
                        {String(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
