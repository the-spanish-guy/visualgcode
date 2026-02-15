import styles from "../styles/toolbar.module.css";

interface Props {
  isRunning: boolean;
  onRun: () => void;
}

export default function Toolbar({ isRunning, onRun }: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.brand}>
        <span className={styles.logo}>▸</span>
        <span className={styles.name}>VisuAlg</span>
        <span className={styles.badge}>IDE</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnRun} onClick={onRun}>
          <span className={styles.btnIcon}>▶</span>
          Executar
        </button>
        <button className={styles.btnDebug}>
          <span className={styles.btnIcon}>⬡</span>
          Debug
        </button>

        <button className={styles.btnStop}>
          <span className={styles.btnIcon}>■</span>
          Parar
        </button>
      </div>
    </div>
  );
}
