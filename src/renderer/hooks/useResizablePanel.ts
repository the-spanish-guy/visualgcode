import { useCallback, useRef } from "react";

interface Options {
  cssVar: string;
  min: number;
  max: () => number;
}

export function useResizablePanel({ cssVar, min, max }: Options) {
  const dragState = useRef<{ startY: number; startH: number } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const currentH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(cssVar),
        10,
      );
      dragState.current = { startY: e.clientY, startH: currentH };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragState.current) return;
        const delta = dragState.current.startY - ev.clientY;
        const newH = Math.min(max(), Math.max(min, dragState.current.startH + delta));
        document.documentElement.style.setProperty(cssVar, `${newH}px`);
      };

      const onMouseUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [cssVar, min, max],
  );

  return { onMouseDown };
}
