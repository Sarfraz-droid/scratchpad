import { useCallback, useRef } from "react";
import {
  DefaultStylePanel,
  Tldraw,
  getSnapshot,
  loadSnapshot,
  type Editor,
  type TLStoreSnapshot,
  type TLUiStylePanelProps,
} from "tldraw";
import { SlidersHorizontal } from "lucide-react";
import "tldraw/tldraw.css";
import { api } from "@/lib/api";
import { useCanvasStore } from "@/store/useCanvasStore";

function CanvasStyles(props: TLUiStylePanelProps) {
  return (
    <details className="pointer-events-auto rounded-md bg-popover text-popover-foreground shadow-md">
      <summary
        aria-label="Drawing styles"
        className="flex cursor-pointer list-none items-center justify-center gap-2 p-3 text-xs [&::-webkit-details-marker]:hidden"
      >
        <SlidersHorizontal className="size-4" />
        <span>Style</span>
      </summary>
      <DefaultStylePanel {...props} />
    </details>
  );
}
const components = { StylePanel: CanvasStyles };

const SAVE_DEBOUNCE_MS = 800;

export function CanvasView({ projectId }: { projectId: string }) {
  const setSnapshot = useCanvasStore((s) => s.setSnapshot);
  const setEditor = useCanvasStore((s) => s.setEditor);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const persist = useCallback(
    (editor: Editor) => {
      const snapshot = getSnapshot(editor.store);
      setSnapshot(projectId, snapshot);
      api.put(`/api/canvas/${projectId}`, { snapshot }).catch((error) => {
        console.error("Failed to save canvas snapshot", error);
      });
    },
    [projectId, setSnapshot],
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      editor.updateInstanceState({ isGridMode: true });
      setEditor(projectId, editor);

      let unlisten: (() => void) | undefined;

      // Load whatever was last saved for this project before wiring up autosave,
      // so the initial load doesn't immediately trigger a save of an empty board.
      api
        .get<{ snapshot: TLStoreSnapshot | null } | null>(`/api/canvas/${projectId}`)
        .then((doc) => {
          if (doc?.snapshot) {
            loadSnapshot(editor.store, doc.snapshot);
          }
        })
        .catch((error) => {
          console.error("Failed to load canvas snapshot", error);
        })
        .finally(() => {
          unlisten = editor.store.listen(
            () => {
              clearTimeout(saveTimer.current);
              saveTimer.current = setTimeout(() => persist(editor), SAVE_DEBOUNCE_MS);
            },
            { scope: "document", source: "user" },
          );
        });

      return () => {
        clearTimeout(saveTimer.current);
        unlisten?.();
        setEditor(projectId, null);
      };
    },
    [projectId, persist, setEditor],
  );

  return (
    <div className="h-full w-full">
      <Tldraw components={components} onMount={handleMount} />
    </div>
  );
}
