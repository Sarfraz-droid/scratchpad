import { create } from "zustand";
import type { Editor } from "tldraw";

interface CanvasState {
  // Raw tldraw snapshot per project id. Kept as `unknown` so this store doesn't
  // depend on tldraw's internal types.
  snapshotByProject: Record<string, unknown>;
  setSnapshot: (projectId: string, snapshot: unknown) => void;
  // The live Editor instance for whichever project's canvas is currently
  // mounted, so other components (e.g. ChatPanel) can export a screenshot of
  // it without CanvasView and ChatPanel needing a parent-child relationship.
  editorByProject: Record<string, Editor | null>;
  setEditor: (projectId: string, editor: Editor | null) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  snapshotByProject: {},
  setSnapshot: (projectId, snapshot) =>
    set((state) => ({ snapshotByProject: { ...state.snapshotByProject, [projectId]: snapshot } })),
  editorByProject: {},
  setEditor: (projectId, editor) =>
    set((state) => ({ editorByProject: { ...state.editorByProject, [projectId]: editor } })),
}));
