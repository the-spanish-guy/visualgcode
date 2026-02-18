import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";

const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },

    ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
  });
  win.setMenuBarVisibility(false);

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/**
 * IPC: Inter-Process Communication
 * Comunicação entre processo principal (main) e processo de renderização (renderer)
 * Usamos ipcMain.handle no main para expor handlers assíncronos que podem ser chamados do renderer via ipcRenderer.invoke
 * https://www.electronjs.org/docs/latest/api/ipc-main#ipchandlechannel-listener
 * https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcinvokechannel-args
 */

// Salva em um caminho já conhecido (Ctrl+S)
ipcMain.handle(
  "save-file",
  async (_event, { filePath, content }: { filePath: string; content: string }) => {
    try {
      fs.writeFileSync(filePath, content, "utf-8");
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
);

// Abre diálogo "Salvar como..." e salva (Ctrl+Shift+S)
ipcMain.handle("save-file-as", async (_event, content: string) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return { success: false, error: "Nenhuma janela ativa" };

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Salvar algoritmo",
    defaultPath: "meu_algoritmo.alg",
    filters: [
      { name: "Algoritmo VisuAlg", extensions: ["alg"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// Abre diálogo "Abrir arquivo..." (Ctrl+O)
ipcMain.handle("open-file-dialog", async (_event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return { success: false, error: "Nenhuma janela ativa" };

  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Abrir algoritmo",
    filters: [
      { name: "Algoritmo VisuAlg", extensions: ["alg"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });

  if (canceled || filePaths.length === 0) return { success: false, canceled: true };

  try {
    const filePath = filePaths[0];
    const content = fs.readFileSync(filePath, "utf-8");
    const fileName = path.basename(filePath);
    return { success: true, filePath, fileName, content };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// explorador de arquivos
interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

function readDirRecursive(dirPath: string, depth = 0): FileNode[] {
  if (depth > 5) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: fullPath,
          isDir: true,
          children: readDirRecursive(fullPath, depth + 1),
        };
      }
      return { name: entry.name, path: fullPath, isDir: false };
    });
}

// Abre diálogo para escolher pasta de trabalho
ipcMain.handle("open-folder-dialog", async (_event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return { success: false, error: "Nenhuma janela ativa" };

  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Abrir pasta de trabalho",
    properties: ["openDirectory"],
  });

  if (canceled || filePaths.length === 0) return { success: false, canceled: true };

  const folderPath = filePaths[0];
  const folderName = path.basename(folderPath);
  const tree = readDirRecursive(folderPath);

  return { success: true, folderPath, folderName, tree };
});

// Lê arquivo ao clicar no explorador
ipcMain.handle("read-file", async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const fileName = path.basename(filePath);
    return { success: true, filePath, fileName, content };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});
