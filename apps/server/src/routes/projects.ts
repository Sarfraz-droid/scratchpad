import { Elysia, t } from "elysia";
import { supabase } from "../lib/supabase";

// Stub CRUD for projects — the sidebar list of workspaces (e.g. "Startup Ideas").
export const projectRoutes = new Elysia({ prefix: "/api/projects" })
  .get(
    "/",
    async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    {
      detail: { tags: ["projects"], summary: "List all projects" },
    },
  )
  .post(
    "/",
    async ({ body }) => {
      const { data, error } = await supabase.from("projects").insert(body).select().single();
      if (error) throw error;
      return data;
    },
    {
      body: t.Object({
        name: t.String(),
        emoji: t.String(),
        description: t.Optional(t.String()),
      }),
      detail: { tags: ["projects"], summary: "Create a project" },
    },
  )
  .get(
    "/:id",
    async ({ params }) => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .single();
      if (error) throw error;
      return data;
    },
    {
      detail: { tags: ["projects"], summary: "Get a project by id" },
    },
  );
