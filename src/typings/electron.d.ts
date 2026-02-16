export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

declare global {
  interface Window {
    electronAPI: {
      saveFile: (
        filePath: string,
        content: string,
      ) => Promise<{ success: boolean; filePath?: string; error?: string }>;

      saveFileAs: (
        content: string,
      ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;

      openFileDialog: () => Promise<{
        success: boolean;
        filePath?: string;
        fileName?: string;
        content?: string;
        canceled?: boolean;
        error?: string;
      }>;

      openFolderDialog: () => Promise<{
        success: boolean;
        folderPath?: string;
        folderName?: string;
        tree?: FileNode[];
        canceled?: boolean;
        error?: string;
      }>;

      readFile: (filePath: string) => Promise<{
        success: boolean;
        filePath?: string;
        fileName?: string;
        content?: string;
        error?: string;
      }>;
    };
  }
}
