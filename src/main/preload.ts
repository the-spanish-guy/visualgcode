import { contextBridge, ipcRenderer } from "electron";
import { IpcChannels } from "./ipc-channels";

contextBridge.exposeInMainWorld("electronAPI", {
  // Salva em caminho já conhecido (Ctrl+S)
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke(IpcChannels.SAVE_FILE, { filePath, content }),

  // Abre diálogo "Salvar como..." (Ctrl+Shift+S)
  saveFileAs: (content: string) => ipcRenderer.invoke(IpcChannels.SAVE_FILE_AS, content),

  // Abre diálogo "Abrir arquivo..." (Ctrl+O)
  openFileDialog: () => ipcRenderer.invoke(IpcChannels.OPEN_FILE_DIALOG),

  // Abre diálogo para escolher pasta de trabalho
  openFolderDialog: () => ipcRenderer.invoke(IpcChannels.OPEN_FOLDER_DIALOG),

  // Relê a árvore de um diretório já aberto
  readFolderTree: (folderPath: string) => ipcRenderer.invoke(IpcChannels.READ_FOLDER_TREE, folderPath),

  // Lê arquivo ao clicar no explorador
  readFile: (filePath: string) => ipcRenderer.invoke(IpcChannels.READ_FILE, filePath),
});
