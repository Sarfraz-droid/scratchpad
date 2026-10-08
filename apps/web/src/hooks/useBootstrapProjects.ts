import { useEffect } from "react";
import type { Project } from "@scratchpad/shared";
import { api } from "@/lib/api";
import { starterProjects } from "@/components/layout/Sidebar";
import { useProjectStore } from "@/store/useProjectStore";

// Module-level guard (not component state) so React 18 StrictMode's dev-only
// double-invoke of effects can't seed the starter projects twice.
let bootstrapped = false;

// Loads real projects from the API on app boot. If the database is empty
// (first run), seeds the two starter projects shown in the reference design so
// the sidebar has real UUID-backed rows to link chat/canvas data against.
export function useBootstrapProjects() {
  const setProjects = useProjectStore((s) => s.setProjects);
  const setProjectsLoaded = useProjectStore((s) => s.setProjectsLoaded);

  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;

    api
      .get<Project[]>("/api/projects")
      .then(async (projects) => {
        if (projects.length > 0) {
          setProjects(projects);
          return;
        }
        const emojis = ["\u{1F4A1}", "\u{1F50E}"];
        const seeded = await Promise.all(
          starterProjects.map((project, index) =>
            api.post<Project>("/api/projects", {
              name: project.name,
              emoji: emojis[index] ?? "\u{1F9E0}",
            }),
          ),
        );
        setProjects(seeded);
      })
      .catch((error) => {
        console.error("Failed to load projects from the API", error);
      })
      .finally(() => {
        setProjectsLoaded(true);
      });
  }, [setProjects, setProjectsLoaded]);
}
