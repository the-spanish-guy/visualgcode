import styles from "../styles/TabBar.module.css";
import type { Tab } from "../useTabs";

interface Props {
  tabs: Tab[];
  activeId: string;
  workspaceName: string | null;
  explorerOpen: boolean;
  onNew: () => void;
  onClose: (id: string) => void;
  onSwitch: (id: string) => void;
  onToggleExplorer: () => void;
}

export default function TabBar({
  tabs,
  activeId,
  workspaceName,
  explorerOpen,
  onNew,
  onClose,
  onSwitch,
  onToggleExplorer,
}: Props) {
  return (
    <div className={styles.bar}>
      <button
        className={`${styles.explorerToggle} ${explorerOpen ? styles.explorerOpen : ""}`}
        onClick={onToggleExplorer}
        title={
          workspaceName
            ? explorerOpen
              ? "Fechar explorador"
              : "Abrir explorador"
            : "Abrir pasta de trabalho"
        }
      >
        <span className={styles.explorerIcon}>⌂</span>
        {workspaceName && <span className={styles.explorerName}>{workspaceName}</span>}
      </button>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeId ? styles.active : ""}`}
            onClick={() => onSwitch(tab.id)}
          >
            {tab.isDirty && <span className={styles.dirty} title="Alterações não salvas" />}
            <span className={styles.name}>{tab.fileName}</span>
            <button
              className={styles.close}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              title="Fechar aba"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button className={styles.newTab} onClick={onNew} title="Nova aba (Ctrl+T)">
        +
      </button>
    </div>
  );
}
