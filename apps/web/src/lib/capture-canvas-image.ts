import { Box } from "tldraw";
import { useCanvasStore } from "@/store/useCanvasStore";
import { blobToDataUrl } from "@/lib/blob-to-data-url";

// Vision models don't need retina-resolution input, and every extra pixel is
// tokens/bandwidth on every single chat message. JPEG at this quality is a
// large win over PNG for photo-heavy canvases; capping the longest side and
// using pixelRatio 1 (vs tldraw's bitmap default of 2x) avoids multi-MB
// payloads on big or image-heavy canvases.
const MAX_EXPORT_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

// Renders the current state of a project's canvas to a compressed JPEG data
// URL, so the chat model can see the whole board at a glance (layout,
// freehand drawing, colors) rather than only the text/structure
// `search_canvas` can extract. Best-effort: returns undefined if there's no
// live editor for this project or nothing on the canvas yet, rather than
// blocking the message send.
export async function captureCanvasImage(projectId: string): Promise<string | undefined> {
  const editor = useCanvasStore.getState().editorByProject[projectId];
  if (!editor) return undefined;

  const shapeIds = [...editor.getCurrentPageShapeIds()];
  if (shapeIds.length === 0) return undefined;

  const bounds = shapeIds
    .map((id) => editor.getShapePageBounds(id))
    .filter((box): box is Box => Boolean(box))
    .reduce<Box | null>((acc, box) => (acc ? Box.Expand(acc, box) : box), null);
  if (!bounds) return undefined;

  const longestSide = Math.max(bounds.w, bounds.h);
  const scale = longestSide > MAX_EXPORT_DIMENSION ? MAX_EXPORT_DIMENSION / longestSide : 1;

  try {
    const { blob } = await editor.toImage(shapeIds, {
      format: "jpeg",
      quality: JPEG_QUALITY,
      background: true,
      padding: 32,
      scale,
      pixelRatio: 1,
    });
    return await blobToDataUrl(blob);
  } catch (error) {
    console.error("Failed to export canvas image", error);
    return undefined;
  }
}
