import { create } from "zustand";
import type { Project } from "@scratchpad/shared";

interface ProjectState {
  projects: Project[];
  // False until the initial GET /api/projects (or seed) request has resolved
  // at least once. Callers must not treat `projects` as authoritative — and
  // must not build links/API calls off placeholder ids — until this is true.
  projectsLoaded: boolean;
  activeProjectId: string | null;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  setProjectsLoaded: (loaded: boolean) => void;
  setActiveProject: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  projectsLoaded: false,
  activeProjectId: null,
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
  setProjectsLoaded: (loaded) => set({ projectsLoaded: loaded }),
  setActiveProject: (id) => set({ activeProjectId: id }),
}));
