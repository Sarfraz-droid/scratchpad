import { ChatOpenAI } from "@langchain/openai";
import { env } from "./env";

// LangChain's OpenAI-compatible chat model pointed at OpenRouter.
// OpenRouter exposes an OpenAI-compatible /chat/completions endpoint, so we
// just override baseURL + apiKey rather than writing a custom provider.
export function createChatModel(modelOverride?: string) {
  return new ChatOpenAI({
    apiKey: env.openRouterApiKey,
    model: modelOverride ?? env.openRouterModel,
    configuration: {
      baseURL: env.openRouterBaseUrl,
      defaultHeaders: {
        "HTTP-Referer": "https://scratchpad.local",
        "X-Title": "Scratchpad",
      },
    },
  });
}
