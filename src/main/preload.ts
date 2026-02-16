import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Salva em caminho já conhecido (Ctrl+S)
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("save-file", { filePath, content }),

  // Abre diálogo "Salvar como..." (Ctrl+Shift+S)
  saveFileAs: (content: string) => ipcRenderer.invoke("save-file-as", content),

  // Abre diálogo "Abrir arquivo..." (Ctrl+O)
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),

  // Abre diálogo para escolher pasta de trabalho
  openFolderDialog: () => ipcRenderer.invoke("open-folder-dialog"),

  // Lê arquivo ao clicar no explorador
  readFile: (filePath: string) => ipcRenderer.invoke("read-file", filePath),
});
