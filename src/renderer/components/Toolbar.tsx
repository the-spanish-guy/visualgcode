import styles from "../styles/toolbar.module.css";

export default function Toolbar() {

  return (
    <div className={styles.toolbar}>
      <div className={styles.brand}>
        <span className={styles.logo}>▸</span>
        <span className={styles.name}>VisuAlg</span>
        <span className={styles.badge}>IDE</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnRun}>
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