import { Elysia } from "elysia";
import { supabase } from "../lib/supabase";

// Stub for the Files tab. Actual upload wiring (Supabase Storage bucket) is a TODO;
// this currently only lists file metadata rows.
export const fileRoutes = new Elysia({ prefix: "/api/files" }).get(
  "/:projectId",
  async ({ params }) => {
    const { data, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", params.projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  {
    detail: { tags: ["files"], summary: "List files attached to a project" },
  },
);
