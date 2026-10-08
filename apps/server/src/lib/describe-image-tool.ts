import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { supabase } from "./supabase";
import { extractCanvasImages } from "./canvas-context";
import { describeImage } from "./vision";

// A LangChain tool that lets the chat model actually *look at* an image
// placed on the canvas, on demand — separate from search_canvas, which only
// ever sees text/labels. Runs a real vision-model call, so it's only invoked
// when the model decides it's needed (e.g. "what's in that screenshot?").
export function createDescribeImageTool(projectId: string) {
  return tool(
    async ({ imageName, question }: { imageName?: string; question?: string }) => {
      const { data, error } = await supabase
        .from("canvas_documents")
        .select("snapshot")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;

      const images = extractCanvasImages(data?.snapshot ?? null);
      if (images.length === 0) {
        return "There are no images on this project's canvas.";
      }

      let target = images[0];
      if (imageName?.trim()) {
        const needle = imageName.trim().toLowerCase();
        const found = images.find((img) => img.name.toLowerCase().includes(needle));
        if (!found) {
          return `No image on the canvas matched "${imageName}". Images on the canvas: ${images
            .map((i) => i.name)
            .join(", ")}.`;
        }
        target = found;
      } else if (images.length > 1) {
        return `There are multiple images on the canvas: ${images
          .map((i) => i.name)
          .join(", ")}. Call this tool again with one of these as \`imageName\`.`;
      }

      if (!target.src) {
        return `The image "${target.name}" doesn't have viewable image data.`;
      }

      const description = await describeImage(target.src, question);
      return `Image "${target.name}": ${description}`;
    },
    {
      name: "describe_canvas_image",
      description:
        "Look at a specific image placed on this project's canvas and describe it or answer a question about it, using a vision model. Provide `imageName` (a substring of its filename) to pick which image when there's more than one on the canvas. Provide an optional `question` to ask something specific about the image; leave it empty for a general description. Only call this when the user's question actually needs to see inside an image — search_canvas already lists image filenames without this.",
      schema: z.object({
        imageName: z
          .string()
          .optional()
          .describe("Part of the image's filename, to pick which image when there's more than one."),
        question: z
          .string()
          .optional()
          .describe("A specific question to ask about the image. Leave empty for a general description."),
      }),
    },
  );
}
