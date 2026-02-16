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
    };
  }
}
