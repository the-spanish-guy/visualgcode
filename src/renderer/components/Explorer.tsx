import { useCallback, useState } from "react";
import styles from "../styles/Explorer.module.css";

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

interface Props {
  folderName: string;
  tree: FileNode[];
  activeFilePath: string | null;
  onFileOpen: (filePath: string) => void;
}

function TreeNode({
  node,
  depth,
  activeFilePath,
  onFileOpen,
}: {
  node: FileNode;
  depth: number;
  activeFilePath: string | null;
  onFileOpen: (filePath: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isAlg = !node.isDir && node.name.endsWith(".alg");
  const isActive = node.path === activeFilePath;

  const handleClick = useCallback(() => {
    if (node.isDir) {
      setExpanded((prev) => !prev);
      return;
    }
    if (isAlg) onFileOpen(node.path);
  }, [node, isAlg, onFileOpen]);

  return (
    <div>
      <div
        className={`
          ${styles.node}
          ${node.isDir ? styles.dir : styles.file}
          ${isAlg ? styles.alg : ""}
          ${isActive ? styles.active : ""}
          ${!isAlg && !node.isDir ? styles.disabled : ""}
        `}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        title={node.path}
      >
        <span className={styles.icon}>
          {node.isDir ? (expanded ? "▾" : "▸") : isAlg ? "◈" : "·"}
        </span>
        <span className={styles.label}>{node.name}</span>
      </div>

      {node.isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              onFileOpen={onFileOpen}
            />
          ))}
          {node.children.length === 0 && (
            <div className={styles.empty} style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}>
              vazio
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Explorer({ folderName, tree, activeFilePath, onFileOpen }: Props) {
  return (
    <div className={styles.explorer}>
      <div className={styles.tree}>
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFilePath={activeFilePath}
            onFileOpen={onFileOpen}
          />
        ))}
        {tree.length === 0 && (
          <div className={styles.empty} style={{ paddingLeft: "12px" }}>
            Pasta vazia
          </div>
        )}
      </div>
    </div>
  );
}
