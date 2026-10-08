import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { supabase } from "./supabase";
import { extractCanvasSnippets, formatCanvasSnippets, describeCanvasStructure } from "./canvas-context";

// A LangChain tool bound to the chat model so it can look up what's actually
// on a project's tldraw canvas — sticky notes, text, frame titles, labeled
// shapes, bookmark URLs, uploaded file names — instead of only ever seeing
// the chat transcript. The model decides when to call this (e.g. "what have
// I done on my canvas?", or any question that needs project context).
export function createCanvasSearchTool(projectId: string) {
  return tool(
    async ({ query }: { query?: string }) => {
      const { data, error } = await supabase
        .from("canvas_documents")
        .select("snapshot")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;

      const snapshot = data?.snapshot ?? null;
      const trimmed = query?.trim().toLowerCase();

      // No query: return the structural view (frames/grouping + arrow
      // connections), not just a flat list — this is what lets the model
      // explain how pieces relate, not just that they exist.
      if (!trimmed) {
        const structure = describeCanvasStructure(snapshot);
        return structure || "The canvas for this project is currently empty — nothing has been placed on it yet.";
      }

      const snippets = extractCanvasSnippets(snapshot);
      if (snippets.length === 0) {
        return "The canvas for this project is currently empty — nothing has been placed on it yet.";
      }

      const matches = snippets.filter((s) => s.text.toLowerCase().includes(trimmed));
      if (matches.length === 0) {
        return [
          `No canvas content matched "${query}". Here's the full canvas structure instead:`,
          describeCanvasStructure(snapshot),
        ].join("\n");
      }

      return formatCanvasSnippets(matches);
    },
    {
      name: "search_canvas",
      description:
        "Look up this project's tldraw canvas. Call with an empty query to get the full structure: which items are grouped inside which frames, and which arrows connect which items to which. Call with a keyword/phrase to search for specific content (sticky notes, text, frame titles, bookmark links, uploaded file names). Use this whenever the user asks what's on their canvas, how their ideas relate/connect, or anything that needs the canvas as context.",
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe(
            "A keyword or phrase to search for. Leave empty to get the full canvas structure (frames, grouping, arrow connections).",
          ),
      }),
    },
  );
}
