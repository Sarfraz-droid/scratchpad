import { Elysia, t } from "elysia";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { supabase } from "../lib/supabase";
import { createChatModel } from "../lib/langchain";
import { createCanvasSearchTool } from "../lib/canvas-search-tool";
import { createDescribeImageTool } from "../lib/describe-image-tool";
import { createCanvasElementsTool, type CanvasElementInput } from "../lib/create-canvas-elements-tool";

const SYSTEM_PROMPT =
  "You are Idea Copilot, a brainstorming partner embedded in a project workspace. " +
  "The project has a canvas (sticky notes, text, drawings, images, PDFs) that the user works on. " +
  "You have a `search_canvas` tool to look up what's actually on that canvas — use it whenever the " +
  "user asks what they've done, what's on their canvas, or anything that needs that context, rather " +
  "than guessing or saying you don't have access. Call it with an empty query to see the full " +
  "structure — which items are grouped inside which frames, and which arrows connect which items to " +
  "which — so you can explain how the user's ideas relate to each other, not just list them in " +
  "isolation. Call it with a keyword when they ask about something specific. You also have a " +
  "`describe_canvas_image` tool that actually looks at an image on the canvas with a vision model — " +
  "use it when the user asks about the content of a specific image, not just its filename. Most " +
  "user messages also include a screenshot of the whole canvas as it currently looks — use that for " +
  "overall layout, freehand drawing, and visual arrangement, then use the tools above to zoom into " +
  "specific text or a specific image when you need more detail than the screenshot shows. You also " +
  "have a `create_canvas_elements` tool to actually add sticky notes, text labels, or frames to the " +
  "canvas. Use it whenever the user asks you to add, jot down, sketch out, brainstorm onto, or " +
  "organize something onto their canvas — don't just describe what you'd add, actually call the tool " +
  "and create it.";

const MAX_TOOL_ROUNDS = 3;

// Chat endpoints for the side "Idea Copilot" chat agent shown in the reference UI.
// Persists the user message, runs a small tool-calling loop (search_canvas,
// describe_canvas_image, create_canvas_elements) so the model can ground its
// reply in the project's canvas and propose new elements for it, then
// persists the reply and returns any proposed canvas elements alongside it
// for the frontend to apply to the live editor.
export const chatRoutes = new Elysia({ prefix: "/api/chat" })
  .get(
    "/:projectId/thread",
    async ({ params }) => {
      const { data: existing, error: selectError } = await supabase
        .from("chats")
        .select("*")
        .eq("project_id", params.projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (selectError) throw selectError;
      if (existing) return existing;

      // First time this project's chat is opened — create its one default thread.
      const { data: created, error: insertError } = await supabase
        .from("chats")
        .insert({ project_id: params.projectId, title: "Project chat" })
        .select()
        .single();
      if (insertError) throw insertError;
      return created;
    },
    {
      detail: { tags: ["chat"], summary: "Get (or create) a project's default chat thread" },
    },
  )
  .get(
    "/:projectId/messages",
    async ({ params, query }) => {
      let chatId = query.chatId;
      if (!chatId) {
        const { data: thread, error } = await supabase.from("chats").select("id")
          .eq("project_id", params.projectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        if (!thread) return [];
        chatId = thread.id;
      }
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("project_id", params.projectId)
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    {
      query: t.Object({ chatId: t.Optional(t.String()) }),
      detail: { tags: ["chat"], summary: "List messages for a project's chat" },
    },
  )
  .post("/:projectId/thread", async ({ params }) => {
    const { data, error } = await supabase.from("chats")
      .insert({ project_id: params.projectId, title: "Talk it through" }).select().single();
    if (error) throw error;
    return data;
  }, { detail: { tags: ["chat"], summary: "Start a fresh chat without deleting previous messages" } })
  .post(
    "/:projectId/messages",
    async ({ params, body }) => {
      const { data: userMessage, error: insertError } = await supabase
        .from("chat_messages")
        .insert({
          project_id: params.projectId,
          chat_id: body.chatId,
          role: "user",
          content: body.content,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const canvasSearchTool = createCanvasSearchTool(params.projectId);
      const describeImageTool = createDescribeImageTool(params.projectId);
      const model = createChatModel().bindTools([canvasSearchTool, describeImageTool, createCanvasElementsTool]);

      let replyContent: string;
      const canvasActions: CanvasElementInput[] = [];
      try {
        const humanContent = body.canvasImage
          ? [
              { type: "text" as const, text: body.content },
              { type: "image_url" as const, image_url: { url: body.canvasImage } },
            ]
          : body.content;
        const messages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage({ content: humanContent })];

        let response = await model.invoke(messages);
        let rounds = 0;
        while (response.tool_calls?.length && rounds < MAX_TOOL_ROUNDS) {
          messages.push(new AIMessage({ content: response.content, tool_calls: response.tool_calls }));
          for (const call of response.tool_calls) {
            let result: string;
            if (call.name === canvasSearchTool.name) {
              result = await canvasSearchTool.invoke(call.args as { query?: string });
            } else if (call.name === describeImageTool.name) {
              result = await describeImageTool.invoke(call.args as { imageName?: string; question?: string });
            } else if (call.name === createCanvasElementsTool.name) {
              const args = call.args as { elements: CanvasElementInput[] };
              canvasActions.push(...args.elements);
              result = await createCanvasElementsTool.invoke(args);
            } else {
              result = `Unknown tool: ${call.name}`;
            }
            messages.push(new ToolMessage({ content: result, tool_call_id: call.id ?? call.name }));
          }
          response = await model.invoke(messages);
          rounds += 1;
        }
        replyContent = String(response.content);
      } catch (error) {
        console.error("LLM call failed", error);
        replyContent =
          "I couldn't reach the model just now (check the server's OPENROUTER_API_KEY). Your message was saved — try again in a moment.";
      }

      const { data: assistantMessage, error: replyError } = await supabase
        .from("chat_messages")
        .insert({
          project_id: params.projectId,
          chat_id: body.chatId,
          role: "assistant",
          content: replyContent,
        })
        .select()
        .single();
      if (replyError) throw replyError;

      return { userMessage, assistantMessage, canvasActions };
    },
    {
      body: t.Object({
        chatId: t.String(),
        content: t.String(),
        // A PNG data URI screenshot of the whole canvas as it currently looks,
        // captured client-side (tldraw's `editor.toImage`). Optional — omitted
        // when the canvas is empty or no editor is mounted for this project.
        canvasImage: t.Optional(t.String()),
      }),
      detail: { tags: ["chat"], summary: "Send a message and get an AI reply" },
    },
  );
