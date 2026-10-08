import { Elysia, t } from "elysia";
import { supabase } from "../lib/supabase";

// Stub CRUD for the Notes tab (short text cards like "Vision & Mission").
export const noteRoutes = new Elysia({ prefix: "/api/notes" })
  .get(
    "/:projectId",
    async ({ params }) => {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", params.projectId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    {
      detail: { tags: ["notes"], summary: "List notes for a project" },
    },
  )
  .post(
    "/:projectId",
    async ({ params, body }) => {
      const { data, error } = await supabase
        .from("project_notes")
        .insert({ project_id: params.projectId, title: body.title, body: body.body })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    {
      body: t.Object({ title: t.String(), body: t.String() }),
      detail: { tags: ["notes"], summary: "Create a note" },
    },
  );
