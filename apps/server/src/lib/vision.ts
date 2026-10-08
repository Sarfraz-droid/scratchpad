import { HumanMessage } from "@langchain/core/messages";
import { createChatModel } from "./langchain";

// Sends an image (data: URI or http(s) URL) to a vision-capable chat model
// and returns a text description/answer. OPENROUTER_MODEL must point at a
// vision-capable model (the default, anthropic/claude-3.5-sonnet, is).
export async function describeImage(imageSrc: string, question?: string): Promise<string> {
  const model = createChatModel();
  const response = await model.invoke([
    new HumanMessage({
      content: [
        {
          type: "text",
          text: question?.trim() || "Describe this image in detail, including any visible text, diagrams, or ideas it conveys.",
        },
        { type: "image_url", image_url: { url: imageSrc } },
      ],
    }),
  ]);
  return String(response.content);
}
