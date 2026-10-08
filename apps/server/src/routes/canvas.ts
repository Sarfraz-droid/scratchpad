import { Elysia, t } from "elysia";
import { supabase } from "../lib/supabase";

// Persists the tldraw store snapshot for a project's canvas tab.
export const canvasRoutes = new Elysia({ prefix: "/api/canvas" })
  .get(
    "/:projectId",
    async ({ params }) => {
      const { data, error } = await supabase
        .from("canvas_documents")
        .select("*")
        .eq("project_id", params.projectId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { projectId: params.projectId, snapshot: null };
    },
    {
      detail: { tags: ["canvas"], summary: "Get the tldraw snapshot for a project" },
    },
  )
  .put(
    "/:projectId",
    async ({ params, body }) => {
      const { data, error } = await supabase
        .from("canvas_documents")
        .upsert(
          { project_id: params.projectId, snapshot: body.snapshot },
          { onConflict: "project_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    {
      body: t.Object({ snapshot: t.Unknown() }),
      detail: { tags: ["canvas"], summary: "Save the tldraw snapshot for a project" },
    },
  );
