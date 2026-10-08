import { z } from "zod";
import { tool } from "@langchain/core/tools";

// Sticky-note colors tldraw's default shapes accept — kept in sync with
// @tldraw/tlschema's DefaultColorStyle enum.
export const NOTE_COLORS = [
  "black",
  "blue",
  "green",
  "grey",
  "light-blue",
  "light-green",
  "light-red",
  "light-violet",
  "orange",
  "red",
  "violet",
  "white",
  "yellow",
] as const;

export const canvasElementSchema = z.object({
  kind: z.enum(["note", "text", "frame"]).describe(
    "note = sticky note (short thought), text = a plain text label/heading, frame = a labeled box that groups other items.",
  ),
  text: z.string().min(1).max(500).describe("The text/label for this element."),
  color: z.enum(NOTE_COLORS).optional().describe("Color — only applies to notes. Defaults to yellow."),
});

export type CanvasElementInput = z.infer<typeof canvasElementSchema>;

// This tool can't touch the database — canvas elements only exist meaningfully
// inside the live tldraw editor (positions, IDs, defaults are all computed by
// tldraw itself), and that editor only exists in the user's browser. So this
// tool just validates the model's request and confirms it; the route handler
// (apps/server/src/routes/chat.ts) reads the same validated args straight off
// the tool call and returns them to the frontend as `canvasActions`, which
// apps/web applies to the live editor — see applyCanvasActions.
export const createCanvasElementsTool = tool(
  async ({ elements }: { elements: CanvasElementInput[] }) => {
    const summary = elements.map((e) => `${e.kind}${e.color ? ` (${e.color})` : ""}: "${e.text}"`).join("; ");
    return `Added to the canvas: ${summary}`;
  },
  {
    name: "create_canvas_elements",
    description:
      "Add new elements to the user's canvas: sticky notes, text labels, or frames. Use this whenever the " +
      "user asks you to add, jot down, sketch out, brainstorm onto, or organize something on their canvas — " +
      "actually create it here rather than only describing it in the chat reply. Positions are chosen " +
      "automatically near the visible part of the canvas.",
    schema: z.object({
      elements: z.array(canvasElementSchema).min(1).max(8).describe("The elements to create, in order."),
    }),
  },
);
