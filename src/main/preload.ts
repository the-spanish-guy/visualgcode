import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Salva em caminho já conhecido (Ctrl+S)
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("save-file", { filePath, content }),

  // Abre diálogo "Salvar como..." (Ctrl+Shift+S)
  saveFileAs: (content: string) => ipcRenderer.invoke("save-file-as", content),

  // Abre diálogo "Abrir arquivo..." (Ctrl+O)
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
});
