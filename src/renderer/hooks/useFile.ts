import { useCallback, useEffect, useState } from "react";

export interface FileState {
  fileName: string; // "meu_algoritmo.alg"
  isDirty: boolean; // true se há mudanças não salvas
  filePath: string | null; // caminho absoluto ou null se não salvo ainda
}

interface UseFileReturn {
  fileState: FileState;
  markDirty: () => void;
  handleNew: () => Promise<boolean>;
  handleSave: (code: string) => Promise<boolean>;
  handleSaveAs: (code: string) => Promise<boolean>;
  handleOpen: () => Promise<{ code: string } | null>;
}

const DEFAULT_STATE: FileState = {
  filePath: null,
  isDirty: false,
  fileName: "sem_titulo.alg",
};

/**
 * os metodos existentes aqui sao expostos no preload.ts
 * e, posteriormente, implementedos no main.ts
 */
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

export function useFile(): UseFileReturn {
  const [fileState, setFileState] = useState<FileState>(DEFAULT_STATE);

  // Atualiza o título da janela com o nome do arquivo e indicador de dirty
  useEffect(() => {
    const dirty = fileState.isDirty ? "● " : "";
    document.title = `${dirty}${fileState.fileName} — VisuAlg IDE`;
  }, [fileState.fileName, fileState.isDirty]);

  const markDirty = useCallback(() => {
    setFileState((prev) => (prev.isDirty ? prev : { ...prev, isDirty: true }));
  }, []);

  const handleNew = useCallback(async (): Promise<boolean> => {
    if (fileState.isDirty) {
      const confirmed = window.confirm(
        "Há alterações não salvas. Deseja descartar e criar um novo arquivo?",
      );
      if (!confirmed) return false;
    }

    setFileState(DEFAULT_STATE);
    return true;
  }, [fileState.isDirty]);

  const handleOpen = useCallback(async (): Promise<{ code: string } | null> => {
    if (fileState.isDirty) {
      const confirmed = window.confirm(
        "Há alterações não salvas. Deseja descartar e abrir outro arquivo?",
      );
      if (!confirmed) return null;
    }

    const result = await window.electronAPI.openFileDialog();

    if (!result.success || result.canceled) return null;

    setFileState({
      fileName: result.fileName!,
      filePath: result.filePath!,
      isDirty: false,
    });

    return { code: result.content! };
  }, [fileState.isDirty]);

  const handleSave = useCallback(
    async (code: string): Promise<boolean> => {
      // Se for novo arquivo, é chamado o "Salvar como..."
      if (!fileState.filePath) {
        return handleSaveAs(code);
      }

      const result = await window.electronAPI.saveFile(fileState.filePath, code);

      if (result.success) {
        setFileState((prev) => ({ ...prev, isDirty: false }));
        return true;
      }

      return false;
    },
    [fileState.filePath],
  );

  const handleSaveAs = useCallback(async (code: string): Promise<boolean> => {
    const result = await window.electronAPI.saveFileAs(code);

    if (!result.success || result.canceled) return false;

    const fileName = result.filePath!.split(/[\\/]/).pop()!;

    setFileState({
      fileName,
      filePath: result.filePath!,
      isDirty: false,
    });

    return true;
  }, []);

  return {
    fileState,
    markDirty,
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
  };
}
