import { useTabsStore } from "../../store/tabsStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import styles from "./TabBar.module.css";

export default function TabBar() {
  const { tabs, activeId, newTab, closeTab, switchTab } = useTabsStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const explorerOpen = useWorkspaceStore((s) => s.explorerOpen);
  const handleToggleExplorer = useWorkspaceStore((s) => s.handleToggleExplorer);

  return (
    <div className={styles.bar}>
      <button
        className={`${styles.explorerToggle} ${explorerOpen ? styles.explorerOpen : ""}`}
        onClick={handleToggleExplorer}
        title={
          workspace
            ? explorerOpen
              ? "Fechar explorador"
              : "Abrir explorador"
            : "Abrir pasta de trabalho"
        }
      >
        <span className={styles.explorerIcon}>⌂</span>
        {workspace && <span className={styles.explorerName}>{workspace.folderName}</span>}
      </button>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeId ? styles.active : ""}`}
            onClick={() => switchTab(tab.id)}
          >
            {tab.isDirty && <span className={styles.dirty} title="Alterações não salvas" />}
            <span className={styles.name}>{tab.fileName}</span>
            <button
              className={styles.close}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              title="Fechar aba"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button className={styles.newTab} onClick={newTab} title="Nova aba (Ctrl+T)">
        +
      </button>
    </div>
  );
}
