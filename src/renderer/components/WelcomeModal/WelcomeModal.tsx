import { useState } from "react";
import styles from "./WelcomeModal.module.css";

const WELCOME_KEY = "visualg:welcomed";
const REPO_URL = "https://github.com/the-spanish-guy/visualgcode";

export default function WelcomeModal() {
  const [open, setOpen] = useState(() => !localStorage.getItem(WELCOME_KEY));

  if (!open) return null;

  function handleClose() {
    localStorage.setItem(WELCOME_KEY, "1");
    setOpen(false);
  }

  function handleStar() {
    window.electronAPI.openExternal(REPO_URL);
  }

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.logo}>⚡</div>
        <h1 className={styles.title}>VisuAlgCode</h1>
        <span className={styles.version}>v1.0.4</span>

        <p className={styles.description}>
          Bem-vindo ao <strong>VisuAlgCode</strong> — uma IDE desktop para escrever,
          executar e depurar algoritmos em <strong>VisuAlg</strong> com syntax
          highlighting, breakpoints e muito mais.
        </p>

        <div className={styles.divider} />

        <div className={styles.starBox}>
          <span className={styles.starLabel}>
            Curtiu o projeto? Deixe uma estrela no GitHub!
          </span>
          <button type="button" className={styles.btnStar} onClick={handleStar}>
            ★ Dar uma estrela no GitHub
          </button>
        </div>

        <button type="button" className={styles.btnStart} onClick={handleClose}>
          Começar a programar
        </button>
      </div>
    </div>
  );
}
