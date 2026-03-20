import { create } from "zustand";
import type { FileNode } from "../panels/Explorer/Explorer";
import { getActiveTab, useTabsStore } from "./tabsStore";

interface Workspace {
  folderName: string;
  folderPath: string;
  tree: FileNode[];
}

interface WorkspaceStore {
  workspace: Workspace | null;
  explorerOpen: boolean;

  setWorkspace: (w: Workspace | null) => void;
  setExplorerOpen: (v: boolean) => void;
  toggleExplorer: () => void;

  refreshWorkspaceTree: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleSaveAs: () => Promise<void>;
  handleOpen: () => Promise<void>;
  handleOpenFolder: () => Promise<void>;
  handleToggleExplorer: () => Promise<void>;
  handleExplorerFileOpen: (filePath: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  workspace: null,
  explorerOpen: false,

  setWorkspace: (w) => set({ workspace: w }),
  setExplorerOpen: (v) => set({ explorerOpen: v }),
  toggleExplorer: () => set((s) => ({ explorerOpen: !s.explorerOpen })),

  refreshWorkspaceTree: async () => {
    const { workspace } = get();
    if (!workspace) return;
    const result = await window.electronAPI.readFolderTree(workspace.folderPath);
    if (result.success && result.tree) {
      set((s) => (s.workspace ? { workspace: { ...s.workspace, tree: result.tree! } } : {}));
    }
  },

  handleSave: async () => {
    const { activeId, activeTab } = getActiveTab();
    if (!activeTab.filePath) return get().handleSaveAs();

    const result = await window.electronAPI.saveFile(activeTab.filePath, activeTab.code);
    if (result.success) {
      useTabsStore.getState().markSaved(activeId, activeTab.fileName, activeTab.filePath!);
      get().refreshWorkspaceTree();
    }
  },

  handleSaveAs: async () => {
    const { activeId, activeTab } = getActiveTab();
    const result = await window.electronAPI.saveFileAs(activeTab.code);
    if (!result.success || result.canceled) return;

    const fileName = result.filePath!.split(/[\\/]/).pop()!;
    useTabsStore.getState().markSaved(activeId, fileName, result.filePath!);
    get().refreshWorkspaceTree();
  },

  handleOpen: async () => {
    const result = await window.electronAPI.openFileDialog();
    if (!result.success || result.canceled) return;
    useTabsStore.getState().openFileInTab(result.fileName!, result.filePath!, result.content!);
  },

  handleOpenFolder: async () => {
    const result = await window.electronAPI.openFolderDialog();
    if (!result.success || result.canceled) return;
    set({
      workspace: {
        folderName: result.folderName!,
        folderPath: result.folderPath!,
        tree: result.tree!,
      },
      explorerOpen: true,
    });
  },

  handleToggleExplorer: async () => {
    const { workspace } = get();
    if (!workspace) {
      await get().handleOpenFolder();
    } else {
      set((s) => ({ explorerOpen: !s.explorerOpen }));
    }
  },

  handleExplorerFileOpen: async (filePath) => {
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) return;
    useTabsStore.getState().openFileInTab(result.fileName!, result.filePath!, result.content!);
  },
}));
