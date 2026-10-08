import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@scratchpad/shared";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/useProjectStore";

const EMOJIS = ["\u{1F9E0}", "\u{1F4A1}", "\u{1F680}", "\u{1F50E}", "\u{1F4DD}", "\u{1F3A8}"];

// Creates a project via POST /api/projects, adds it to the store, and
// navigates to it. Shared by the sidebar and the home page's "new project" UI.
export function useCreateProject() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addProject = useProjectStore((s) => s.addProject);
  const navigate = useNavigate();

  const createProject = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const project = await api.post<Project>("/api/projects", { name: trimmed, emoji });
      addProject(project);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error("Failed to create project", err);
      setError("Couldn't create that project. Is the server running?");
    } finally {
      setCreating(false);
    }
  };

  return { creating, error, createProject };
}
