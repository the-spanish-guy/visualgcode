import styles from "./App.module.css";
import StatusBar from "./components/StatusBar/StatusBar";
import TabBar from "./components/TabBar/TabBar";
import Toolbar from "./components/Toolbar/Toolbar";
import WelcomeModal from "./components/WelcomeModal/WelcomeModal";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useResizablePanel } from "./hooks/useResizablePanel";
import { useTabs } from "./hooks/useTabs";
import CallStack from "./panels/CallStack/CallStack";
import Editor from "./panels/Editor/Editor";
import Explorer from "./panels/Explorer/Explorer";
import Terminal from "./panels/Terminal/Terminal";
import VariablesPanel from "./panels/VariablesPanel/VariablesPanel";
import { useWorkspaceStore } from "./store/workspaceStore";

export default function App() {
  useTabs();
  useKeyboardShortcuts();

  const workspace = useWorkspaceStore((s) => s.workspace);
  const explorerOpen = useWorkspaceStore((s) => s.explorerOpen);

  const { onMouseDown: onResizerMouseDown } = useResizablePanel({
    cssVar: "--panel-h",
    min: 140,
    max: () => Math.floor(window.innerHeight * 0.5),
  });

  return (
    <div className={styles.root}>
      <Toolbar />
      <TabBar />
      <div className={styles.workarea}>
        <div className={styles.mainRow}>
          <div className={styles.sidebar} style={{ width: workspace && explorerOpen ? 220 : 0 }}>
            <Explorer />
          </div>
          <div className={styles.editorPane}>
            <Editor />
          </div>
          <VariablesPanel />
          <CallStack />
        </div>
        <div className={styles.resizer} onMouseDown={onResizerMouseDown} />
        <div className={styles.bottomPane}>
          <Terminal />
        </div>
      </div>
      <StatusBar />
      <WelcomeModal />
    </div>
  );
}
